import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RequestContextService } from '../common/context/request-context.service';
import { ModuleAccessService } from '../common/permissions/module-access.service';
import { FORBIDDEN_ACTION_DENIED } from '../common/permissions/forbidden-messages';
import { EmailNotificationsService } from '../messaging/email-notifications.service';
import { generateSecretHex, hashOpaqueToken, newInvitePublicId } from '../common/crypto/opaque-token.util';
import * as bcrypt from 'bcrypt';
import type { MemberInviteStatus } from '@prisma/client';
import { normalizeUserFunctionsJson } from './user-functions.constants';
import type { SimpleAccessLevel } from '@prisma/client';
import { leanUserPrismaPack } from '../common/permissions/lean-simple-access-pack';

type CreateUserDto = {
	email: string;
	password: string;
	fullName: string;
	role: 'owner' | 'admin' | 'editor';
	permissions?: string[];
	avatarUrl?: string | null;
	jobTitle?: string | null;
	phone?: string | null;
	birthDate?: string | null;
	operationalRole?: string;
	canBeTaskOwner?: boolean;
	canBePostOwner?: boolean;
	agencyRoleId?: string | null;
	canBeClientOwner?: boolean;
	canBePlanningOwner?: boolean;
	functions?: string[];
	simpleAccessLevel?: string | null;
};

type UpdateUserDto = Partial<Omit<CreateUserDto, 'password'>> & {
	password?: string;
};

type InviteUserDto = {
	email: string;
	fullName: string;
	role: 'admin' | 'editor';
	permissions?: string[];
	operationalRole?: string;
	canBeTaskOwner?: boolean;
	canBePostOwner?: boolean;
	agencyRoleId: string;
	canBeClientOwner?: boolean;
	canBePlanningOwner?: boolean;
	functions?: string[];
};

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class UsersService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly ctx: RequestContextService,
		private readonly access: ModuleAccessService,
		private readonly email: EmailNotificationsService,
	) {}

	private frontendBaseUrl(): string {
		return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
	}

	private isProd(): boolean {
		return process.env.NODE_ENV === 'production';
	}

	private mapMemberRow(u: {
		id: string;
		email: string;
		fullName: string;
		role: string;
		permissions: unknown;
		operationalRole: string;
		canBeTaskOwner: boolean;
		canBePostOwner: boolean;
		canBeClientOwner: boolean;
		canBePlanningOwner: boolean;
		agencyRoleId: string | null;
		inviteStatus: MemberInviteStatus;
		invitedAt: Date | null;
		activatedAt: Date | null;
		avatarUrl?: string | null;
		jobTitle?: string | null;
		phone?: string | null;
		birthDate?: string | null;
		createdAt?: Date;
		deletedAt?: Date | null;
		userFunctions?: unknown;
		simpleAccessLevel?: string | null;
	}) {
		return {
			id: u.id,
			email: u.email,
			fullName: u.fullName,
			role: u.role,
			permissions: u.permissions ?? [],
			functions: normalizeUserFunctionsJson(u.userFunctions),
			simpleAccessLevel: u.simpleAccessLevel ?? null,
			operationalRole: u.operationalRole,
			canBeTaskOwner: u.canBeTaskOwner,
			canBePostOwner: u.canBePostOwner,
			canBeClientOwner: u.canBeClientOwner,
			canBePlanningOwner: u.canBePlanningOwner,
			agencyRoleId: u.agencyRoleId,
			inviteStatus: u.inviteStatus,
			invitedAt: u.invitedAt?.toISOString() ?? null,
			activatedAt: u.activatedAt?.toISOString() ?? null,
			avatarUrl: u.avatarUrl ?? null,
			jobTitle: u.jobTitle ?? null,
			phone: u.phone ?? null,
			birthDate: u.birthDate ?? null,
			createdAt: u.createdAt?.toISOString(),
			deletedAt: u.deletedAt?.toISOString() ?? null,
		};
	}

	private async assertLicenseAvailable() {
		const agencyId = this.ctx.get()?.agencyId!;
		const agency = await this.prisma.agency.findUnique({
			where: { id: agencyId },
			select: { maxUsers: true },
		});
		if (!agency) throw new BadRequestException('Agency not found');
		const occupied = await this.prisma.user.count({
			where: {
				agencyId,
				deletedAt: null,
				inviteStatus: { in: ['pending_invite', 'active'] },
			},
		});
		if (occupied >= agency.maxUsers) {
			throw new ForbiddenException('Limite de usuários do plano atingido');
		}
	}

	async list(page: number, pageSize: number) {
		await this.access.assertCanView('team');
		const agencyId = this.ctx.get()?.agencyId!;
		const skip = (page - 1) * pageSize;
		const select = {
			id: true,
			email: true,
			fullName: true,
			avatarUrl: true,
			role: true,
			permissions: true,
			jobTitle: true,
			phone: true,
			birthDate: true,
			createdAt: true,
			deletedAt: true,
			operationalRole: true,
			canBeTaskOwner: true,
			canBePostOwner: true,
			canBeClientOwner: true,
			canBePlanningOwner: true,
			agencyRoleId: true,
			inviteStatus: true,
			invitedAt: true,
			activatedAt: true,
			userFunctions: true,
			simpleAccessLevel: true,
		} as const;
		const [items, total] = await this.prisma.$transaction([
			this.prisma.user.findMany({
				where: { agencyId },
				select,
				orderBy: { createdAt: 'desc' },
				skip,
				take: pageSize,
			}),
			this.prisma.user.count({ where: { agencyId } }),
		]);
		return {
			items: items.map((u) => this.mapMemberRow(u as any)),
			total,
			page,
			pageSize,
		};
	}

	async create(data: CreateUserDto) {
		await this.access.assertCanEdit('team');
		const agencyId = this.ctx.get()?.agencyId!;
		await this.assertLicenseAvailable();
		const agency = await this.prisma.agency.findUnique({
			where: { id: agencyId },
			select: { operationMode: true },
		});
		const mode = agency?.operationMode ?? 'solo';
		const leanWithSimple = mode === 'lean' && data.simpleAccessLevel;

		if (!leanWithSimple && data.agencyRoleId) {
			const ar = await this.prisma.agencyRole.findFirst({ where: { id: data.agencyRoleId, agencyId } });
			if (!ar) throw new BadRequestException('Função inválida');
		}
		const passwordHash = await bcrypt.hash(data.password, 10);
		const leanPack = leanWithSimple ? leanUserPrismaPack(data.simpleAccessLevel as SimpleAccessLevel) : null;

		const user = await this.prisma.user.create({
			data: {
				agencyId,
				email: data.email.trim().toLowerCase(),
				passwordHash,
				fullName: data.fullName,
				...(leanPack
					? {
							role: leanPack.role,
							permissions: leanPack.permissions,
							agencyRoleId: null,
							simpleAccessLevel: leanPack.simpleAccessLevel,
							canBeTaskOwner: leanPack.canBeTaskOwner,
							canBePostOwner: leanPack.canBePostOwner,
							canBeClientOwner: leanPack.canBeClientOwner,
							canBePlanningOwner: leanPack.canBePlanningOwner,
						}
					: {
							role: data.role,
							permissions: data.permissions ?? [],
							...(data.agencyRoleId !== undefined ? { agencyRoleId: data.agencyRoleId || null } : {}),
							...(data.canBeTaskOwner !== undefined ? { canBeTaskOwner: data.canBeTaskOwner } : {}),
							...(data.canBePostOwner !== undefined ? { canBePostOwner: data.canBePostOwner } : {}),
							...(data.canBeClientOwner !== undefined ? { canBeClientOwner: data.canBeClientOwner } : {}),
							...(data.canBePlanningOwner !== undefined ? { canBePlanningOwner: data.canBePlanningOwner } : {}),
						}),
				avatarUrl: data.avatarUrl ?? null,
				jobTitle: data.jobTitle ?? null,
				phone: data.phone ?? null,
				birthDate: data.birthDate ?? null,
				inviteStatus: 'active',
				...(data.operationalRole ? { operationalRole: data.operationalRole as any } : {}),
				...(data.functions !== undefined
					? { userFunctions: normalizeUserFunctionsJson(data.functions) as object }
					: {}),
			},
			select: {
				id: true,
				email: true,
				fullName: true,
				role: true,
				permissions: true,
				userFunctions: true,
				simpleAccessLevel: true,
				operationalRole: true,
				canBeTaskOwner: true,
				canBePostOwner: true,
				canBeClientOwner: true,
				canBePlanningOwner: true,
				agencyRoleId: true,
				inviteStatus: true,
				invitedAt: true,
				activatedAt: true,
			},
		});
		return this.mapMemberRow(user as any);
	}

	async inviteMember(data: InviteUserDto) {
		await this.access.assertCanEdit('team');
		const agencyId = this.ctx.get()?.agencyId!;
		await this.assertLicenseAvailable();
		const ar = await this.prisma.agencyRole.findFirst({ where: { id: data.agencyRoleId, agencyId } });
		if (!ar) throw new BadRequestException('Função inválida');

		const emailLower = data.email.trim().toLowerCase();
		const dup = await this.prisma.user.findFirst({
			where: { agencyId, email: emailLower, deletedAt: null },
		});
		if (dup) throw new BadRequestException('Já existe um usuário com este e-mail nesta agência.');

		const invitePublicId = newInvitePublicId();
		const secret = generateSecretHex(32);
		const compound = `${invitePublicId}.${secret}`;
		const inviteTokenHash = hashOpaqueToken(secret);
		const inviteExpiresAt = new Date(Date.now() + INVITE_TTL_MS);
		const now = new Date();

		const user = await this.prisma.user.create({
			data: {
				agencyId,
				email: emailLower,
				passwordHash: null,
				fullName: data.fullName.trim(),
				role: data.role,
				permissions: data.permissions ?? [],
				inviteStatus: 'pending_invite',
				invitePublicId,
				inviteTokenHash,
				inviteExpiresAt,
				invitedAt: now,
				...(data.operationalRole ? { operationalRole: data.operationalRole as any } : {}),
				canBeTaskOwner: data.canBeTaskOwner !== false,
				canBePostOwner: data.canBePostOwner !== false,
				canBeClientOwner: data.canBeClientOwner !== false,
				canBePlanningOwner: data.canBePlanningOwner !== false,
				agencyRoleId: data.agencyRoleId,
				...(data.functions !== undefined
					? { userFunctions: normalizeUserFunctionsJson(data.functions) as object }
					: {}),
			},
			select: {
				id: true,
				email: true,
				fullName: true,
				role: true,
				permissions: true,
				userFunctions: true,
				operationalRole: true,
				canBeTaskOwner: true,
				canBePostOwner: true,
				canBeClientOwner: true,
				canBePlanningOwner: true,
				agencyRoleId: true,
				inviteStatus: true,
				invitedAt: true,
				activatedAt: true,
			},
		});

		const acceptPath = `/invite/accept?token=${encodeURIComponent(compound)}`;
		const fullUrl = `${this.frontendBaseUrl()}${acceptPath}`;
		this.email.logInviteLink(emailLower, fullUrl);

		return {
			user: this.mapMemberRow(user as any),
			...(!this.isProd() ? { devInviteUrl: fullUrl } : {}),
		};
	}

	async resendInvite(userId: string) {
		await this.access.assertCanEdit('team');
		const agencyId = this.ctx.get()?.agencyId!;
		const existing = await this.prisma.user.findFirst({
			where: { id: userId, agencyId },
		});
		if (!existing) throw new BadRequestException('Usuário não encontrado');
		if (existing.role === 'owner') throw new ForbiddenException(FORBIDDEN_ACTION_DENIED);
		if (existing.inviteStatus !== 'pending_invite') {
			throw new BadRequestException('Só é possível reenviar convite para membros pendentes.');
		}

		const invitePublicId = newInvitePublicId();
		const secret = generateSecretHex(32);
		const compound = `${invitePublicId}.${secret}`;
		const inviteTokenHash = hashOpaqueToken(secret);
		const inviteExpiresAt = new Date(Date.now() + INVITE_TTL_MS);

		const user = await this.prisma.user.update({
			where: { id: userId },
			data: {
				invitePublicId,
				inviteTokenHash,
				inviteExpiresAt,
				invitedAt: new Date(),
			},
			select: {
				id: true,
				email: true,
				fullName: true,
				role: true,
				permissions: true,
				operationalRole: true,
				canBeTaskOwner: true,
				canBePostOwner: true,
				canBeClientOwner: true,
				canBePlanningOwner: true,
				agencyRoleId: true,
				inviteStatus: true,
				invitedAt: true,
				activatedAt: true,
			},
		});

		const acceptPath = `/invite/accept?token=${encodeURIComponent(compound)}`;
		const fullUrl = `${this.frontendBaseUrl()}${acceptPath}`;
		this.email.logInviteLink(user.email, fullUrl);

		return {
			user: this.mapMemberRow(user as any),
			...(!this.isProd() ? { devInviteUrl: fullUrl } : {}),
		};
	}

	async cancelInvite(userId: string) {
		await this.access.assertCanEdit('team');
		const agencyId = this.ctx.get()?.agencyId!;
		const existing = await this.prisma.user.findFirst({
			where: { id: userId, agencyId },
		});
		if (!existing) throw new BadRequestException('Usuário não encontrado');
		if (existing.role === 'owner') throw new ForbiddenException(FORBIDDEN_ACTION_DENIED);
		if (existing.inviteStatus !== 'pending_invite') {
			throw new BadRequestException('Só é possível cancelar convites pendentes.');
		}
		await this.prisma.user.delete({ where: { id: userId } });
		return { ok: true };
	}

	async disableMember(userId: string) {
		await this.access.assertCanEdit('team');
		const agencyId = this.ctx.get()?.agencyId!;
		const existing = await this.prisma.user.findFirst({
			where: { id: userId, agencyId },
		});
		if (!existing) throw new BadRequestException('Usuário não encontrado');
		if (existing.role === 'owner') throw new ForbiddenException(FORBIDDEN_ACTION_DENIED);
		if (existing.inviteStatus === 'pending_invite') {
			throw new BadRequestException('Cancele o convite pendente em vez de desativar.');
		}
		await this.prisma.user.update({
			where: { id: userId },
			data: { inviteStatus: 'disabled' },
		});
		return { ok: true };
	}

	async reactivateMember(userId: string) {
		await this.access.assertCanEdit('team');
		const agencyId = this.ctx.get()?.agencyId!;
		const existing = await this.prisma.user.findFirst({
			where: { id: userId, agencyId },
		});
		if (!existing) throw new BadRequestException('Usuário não encontrado');
		if (existing.role === 'owner') throw new ForbiddenException(FORBIDDEN_ACTION_DENIED);
		if (!existing.passwordHash) {
			throw new BadRequestException('Usuário sem senha definida; reenvie um convite.');
		}
		await this.prisma.user.update({
			where: { id: userId },
			data: { inviteStatus: 'active' },
		});
		return { ok: true };
	}

	async requestPasswordReset(userId: string) {
		await this.access.assertCanEdit('team');
		const agencyId = this.ctx.get()?.agencyId!;
		const existing = await this.prisma.user.findFirst({
			where: { id: userId, agencyId },
		});
		if (!existing) throw new BadRequestException('Usuário não encontrado');
		if (existing.role === 'owner') throw new ForbiddenException(FORBIDDEN_ACTION_DENIED);
		if (existing.inviteStatus !== 'active' || !existing.passwordHash) {
			throw new BadRequestException('Redefinição disponível apenas para membros ativos com senha.');
		}

		const passwordResetPublicId = newInvitePublicId();
		const secret = generateSecretHex(32);
		const compound = `${passwordResetPublicId}.${secret}`;
		const passwordResetTokenHash = hashOpaqueToken(secret);
		const passwordResetExpiresAt = new Date(Date.now() + RESET_TTL_MS);

		await this.prisma.user.update({
			where: { id: userId },
			data: {
				passwordResetPublicId,
				passwordResetTokenHash,
				passwordResetExpiresAt,
			},
		});

		const resetPath = `/reset-password?token=${encodeURIComponent(compound)}`;
		const fullUrl = `${this.frontendBaseUrl()}${resetPath}`;
		this.email.logPasswordResetLink(existing.email, fullUrl);

		return {
			ok: true,
			...(!this.isProd() ? { devPasswordResetUrl: fullUrl } : {}),
		};
	}

	async update(id: string, data: UpdateUserDto) {
		await this.access.assertCanEdit('team');
		const agencyId = this.ctx.get()?.agencyId!;
		const [agency, existing] = await Promise.all([
			this.prisma.agency.findUnique({ where: { id: agencyId }, select: { operationMode: true } }),
			this.prisma.user.findFirst({ where: { id, agencyId }, select: { id: true, role: true } }),
		]);
		if (!existing) throw new BadRequestException('Usuário não encontrado');
		const mode = agency?.operationMode ?? 'solo';
		const isOwner = existing.role === 'owner';

		if (data.agencyRoleId) {
			const ar = await this.prisma.agencyRole.findFirst({ where: { id: data.agencyRoleId, agencyId } });
			if (!ar) throw new BadRequestException('Função inválida');
		}
		let passwordHash: string | undefined;
		if (data.password) passwordHash = await bcrypt.hash(data.password, 10);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const patch: Record<string, any> = {};

		if (data.email !== undefined) patch.email = data.email.trim().toLowerCase();
		if (data.fullName !== undefined) patch.fullName = data.fullName;
		if (data.avatarUrl !== undefined) patch.avatarUrl = data.avatarUrl;
		if (data.jobTitle !== undefined) patch.jobTitle = data.jobTitle;
		if (data.phone !== undefined) patch.phone = data.phone;
		if (data.birthDate !== undefined) patch.birthDate = data.birthDate;
		if (data.operationalRole !== undefined) patch.operationalRole = data.operationalRole;
		if (data.functions !== undefined) {
			patch.userFunctions = normalizeUserFunctionsJson(data.functions) as object;
		}
		if (passwordHash) patch.passwordHash = passwordHash;

		const leanApplies =
			mode === 'lean' && !isOwner && data.simpleAccessLevel !== undefined && data.simpleAccessLevel !== null;

		if (leanApplies) {
			const pack = leanUserPrismaPack(data.simpleAccessLevel as SimpleAccessLevel);
			patch.role = pack.role;
			patch.permissions = pack.permissions;
			patch.agencyRoleId = null;
			patch.simpleAccessLevel = pack.simpleAccessLevel;
			patch.canBeTaskOwner = pack.canBeTaskOwner;
			patch.canBePostOwner = pack.canBePostOwner;
			patch.canBeClientOwner = pack.canBeClientOwner;
			patch.canBePlanningOwner = pack.canBePlanningOwner;
		} else {
			if (data.role !== undefined) patch.role = data.role;
			if (data.permissions !== undefined) patch.permissions = data.permissions;
			if (data.canBeTaskOwner !== undefined) patch.canBeTaskOwner = data.canBeTaskOwner;
			if (data.canBePostOwner !== undefined) patch.canBePostOwner = data.canBePostOwner;
			if (data.canBeClientOwner !== undefined) patch.canBeClientOwner = data.canBeClientOwner;
			if (data.canBePlanningOwner !== undefined) patch.canBePlanningOwner = data.canBePlanningOwner;
			if (data.agencyRoleId !== undefined) {
				patch.agencyRoleId = data.agencyRoleId || null;
				if (mode === 'structured') {
					patch.simpleAccessLevel = null;
				}
			}
		}

		return this.prisma.user.update({
			where: { id },
			data: patch,
		});
	}

	async remove(id: string) {
		await this.access.assertCanEdit('team');
		const agencyId = this.ctx.get()?.agencyId!;
		const target = await this.prisma.user.findFirst({ where: { id, agencyId }, select: { role: true, inviteStatus: true } });
		if (!target) throw new BadRequestException('Usuário não encontrado');
		if (target.role === 'owner') {
			throw new ForbiddenException(FORBIDDEN_ACTION_DENIED);
		}
		return this.prisma.user.delete({ where: { id } });
	}

	async updateMyOnboarding(data: { hasSeenTasksOnboarding?: boolean }) {
		const ctx = this.ctx.get();
		if (!ctx?.userId) {
			throw new BadRequestException('User ID não encontrado no contexto');
		}

		const userId = ctx.userId;

		try {
			return await this.prisma.user.update({
				where: { id: userId },
				data: {
					hasSeenTasksOnboarding: data.hasSeenTasksOnboarding ?? undefined,
				},
				select: {
					id: true,
					hasSeenTasksOnboarding: true,
				},
			});
		} catch (error: any) {
			if (error.code === 'P2002' || error.message?.includes('Unknown field')) {
				throw new BadRequestException('Campo hasSeenTasksOnboarding não existe no schema. Execute a migração do banco de dados.');
			}
			throw error;
		}
	}
}
