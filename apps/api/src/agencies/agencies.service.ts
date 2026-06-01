import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RequestContextService } from '../common/context/request-context.service';
import { ModuleAccessService } from '../common/permissions/module-access.service';
import { UpdateAgencyDto } from './dto/update-agency.dto';
import { CreateAgencyRoleDto } from './dto/create-agency-role.dto';
import { UpdateAgencyRoleDto } from './dto/update-agency-role.dto';
import { ensureAgencySystemRoles, SYSTEM_ROLE_KEYS } from './agency-role-defaults';
import {
	enforceAdminSystemRole,
	mergePermissionsFromExisting,
	normalizeFlags,
	normalizePermissions,
} from './agency-role-validation';
import { FORBIDDEN_ACTION_DENIED, FORBIDDEN_MODULE_VIEW } from '../common/permissions/forbidden-messages';

@Injectable()
export class AgenciesService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly ctx: RequestContextService,
		private readonly access: ModuleAccessService,
	) {}

	async getMyAgency() {
		const store = this.ctx.get();
		const tokenUserId = store?.userId;
		let agencyId = store?.agencyId;
		if (tokenUserId) {
			const row = await this.prisma.user.findUnique({
				where: { id: tokenUserId },
				select: { agencyId: true },
			});
			if (row?.agencyId) {
				agencyId = row.agencyId;
			}
		}
		if (!agencyId) throw new ForbiddenException(FORBIDDEN_MODULE_VIEW);
		await ensureAgencySystemRoles(this.prisma, agencyId);
		return this.prisma.agency.findUnique({
			where: { id: agencyId },
			include: {
				agencyRoles: {
					orderBy: { createdAt: 'asc' },
				},
				users: {
					select: {
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
					},
					orderBy: { createdAt: 'asc' },
				},
			},
		});
	}

	async listAgencyRoles() {
		await this.access.assertAnyView(['team', 'settings']);
		const agencyId = this.ctx.get()?.agencyId;
		if (!agencyId) throw new ForbiddenException(FORBIDDEN_MODULE_VIEW);
		await ensureAgencySystemRoles(this.prisma, agencyId);
		return this.prisma.agencyRole.findMany({
			where: { agencyId },
			orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
		});
	}

	async createAgencyRole(data: CreateAgencyRoleDto) {
		await this.access.assertCanEdit('settings');
		const agencyId = this.ctx.get()?.agencyId;
		if (!agencyId) throw new ForbiddenException(FORBIDDEN_MODULE_VIEW);
		const permissions = normalizePermissions(data.permissions as Record<string, unknown>);
		const flags = normalizeFlags(data.flags as Record<string, unknown>);
		return this.prisma.agencyRole.create({
			data: {
				agencyId,
				name: data.name.trim(),
				accessLevel: data.accessLevel,
				permissions: permissions as object,
				flags: flags as object,
				isSystem: false,
				systemKey: null,
			},
		});
	}

	async updateAgencyRole(id: string, data: UpdateAgencyRoleDto) {
		await this.access.assertCanEdit('settings');
		const agencyId = this.ctx.get()?.agencyId;
		if (!agencyId) throw new ForbiddenException(FORBIDDEN_MODULE_VIEW);
		const existing = await this.prisma.agencyRole.findFirst({ where: { id, agencyId } });
		if (!existing) throw new BadRequestException('Função não encontrada');
		if (existing.systemKey === SYSTEM_ROLE_KEYS.ADMIN && data.accessLevel && data.accessLevel !== 'ADMIN') {
			throw new BadRequestException('A função Administrador deve permanecer com nível administrador');
		}

		const permissions = mergePermissionsFromExisting(
			existing.permissions as Record<string, unknown>,
			data.permissions as Record<string, unknown> | undefined,
		);
		const flags = normalizeFlags({
			...(existing.flags as Record<string, unknown>),
			...(data.flags as Record<string, unknown> | undefined),
		});
		const enforced = enforceAdminSystemRole(permissions, flags, existing.systemKey);

		const accessLevel =
			existing.systemKey === SYSTEM_ROLE_KEYS.ADMIN
				? 'ADMIN'
				: data.accessLevel !== undefined
					? data.accessLevel
					: existing.accessLevel;

		return this.prisma.agencyRole.update({
			where: { id },
			data: {
				...(data.name !== undefined ? { name: data.name.trim() } : {}),
				accessLevel,
				permissions: enforced.permissions as object,
				flags: enforced.flags as object,
			},
		});
	}

	async deleteAgencyRole(id: string) {
		await this.access.assertCanEdit('settings');
		const agencyId = this.ctx.get()?.agencyId;
		if (!agencyId) throw new ForbiddenException(FORBIDDEN_MODULE_VIEW);
		const existing = await this.prisma.agencyRole.findFirst({ where: { id, agencyId } });
		if (!existing) throw new BadRequestException('Função não encontrada');
		if (existing.isSystem) {
			throw new ForbiddenException(FORBIDDEN_ACTION_DENIED);
		}
		await this.prisma.agencyRole.delete({ where: { id } });
		return { ok: true };
	}

	async updateMyAgency(data: UpdateAgencyDto) {
		const role = this.ctx.get()?.role;
		if (role !== 'owner') {
			throw new ForbiddenException(FORBIDDEN_ACTION_DENIED);
		}
		const agencyId = this.ctx.get()?.agencyId!;
		if (data.defaultClientOwnerUserId) {
			const u = await this.prisma.user.findFirst({
				where: {
					id: data.defaultClientOwnerUserId,
					agencyId,
					deletedAt: null,
					inviteStatus: 'active',
				},
				select: { id: true },
			});
			if (!u) throw new BadRequestException('Responsável padrão inválido');
		}
		return this.prisma.agency.update({
			where: { id: agencyId },
			data: {
				...data,
				addressJson: data.addressJson as any,
				...(data.clientResponsibleMode === 'per_client_planning' ? { defaultClientOwnerUserId: null } : {}),
			},
		});
	}
}
