import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ensureAgencySystemRoles } from '../agencies/agency-role-defaults';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { parseCompoundInviteToken, verifyOpaqueToken } from '../common/crypto/opaque-token.util';

type JwtPayload = {
	sub: string;
	agencyId: string;
	role: string;
	permissions?: string[];
};

@Injectable()
export class AuthService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly jwt: JwtService,
	) {}

	private strongPassword(pw: string) {
		const strong = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
		return strong.test(pw || '');
	}

	/** Impede refresh com conta pendente ou desativada. */
	async assertUserCanRefresh(userId: string) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { inviteStatus: true, deletedAt: true },
		});
		if (!user || user.deletedAt || user.inviteStatus !== 'active') {
			throw new UnauthorizedException({
				message: 'Sessão inválida. Faça login novamente.',
				code: 'refresh_user_inactive',
			});
		}
	}

	async validateUserByEmail(email: string, password: string) {
		const normalizedEmail = (email || '').trim().toLowerCase();
		const user = await this.prisma.user.findFirst({
			where: { email: normalizedEmail, deletedAt: null },
			orderBy: { createdAt: 'desc' },
		});
		if (!user) throw new UnauthorizedException({ message: 'Credenciais inválidas.', code: 'invalid_credentials' });
		if (user.inviteStatus === 'pending_invite') {
			throw new UnauthorizedException({
				message: 'Seu convite ainda não foi ativado. Use o link que você recebeu.',
				code: 'pending_invite',
			});
		}
		if (user.inviteStatus === 'disabled') {
			throw new UnauthorizedException({
				message: 'Seu acesso está desativado. Fale com o administrador da agência.',
				code: 'disabled',
			});
		}
		if (!user.passwordHash) {
			throw new UnauthorizedException({ message: 'Credenciais inválidas.', code: 'invalid_credentials' });
		}
		const ok = await bcrypt.compare(password, user.passwordHash);
		if (!ok) throw new UnauthorizedException({ message: 'Credenciais inválidas.', code: 'invalid_credentials' });
		return user;
	}

	signAccessToken(payload: JwtPayload) {
		return this.jwt.sign(payload, {
			secret: process.env.JWT_ACCESS_SECRET || 'dev-secret',
			expiresIn: process.env.JWT_ACCESS_EXPIRES || '900s',
		});
	}

	signRefreshToken(payload: JwtPayload) {
		return this.jwt.sign(payload, {
			secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh',
			expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
		});
	}

	verifyRefreshToken(token: string): JwtPayload {
		try {
			return this.jwt.verify<JwtPayload>(token, {
				secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh',
			});
		} catch (err: any) {
			const message = 'Session expired, please login again';
			// Tratar erros esperados do JWT para refresh token
			if (err?.name === 'TokenExpiredError') {
				throw new UnauthorizedException({
					error: 'unauthorized',
					code: 'refresh_token_expired',
					message,
				});
			}
			if (err?.name === 'JsonWebTokenError') {
				throw new UnauthorizedException({
					error: 'unauthorized',
					code: 'refresh_token_invalid',
					message,
				});
			}
			// Re-lança erros não previstos
			throw err;
		}
	}

	async login(params: { email: string; password: string }) {
		const user = await this.validateUserByEmail(params.email, params.password);
		const agency = await this.prisma.agency.findFirst({ where: { id: user.agencyId } });
		if ((agency as any)?.deletedAt) {
			throw new UnauthorizedException('Account deleted');
		}
		const payload: JwtPayload = {
			sub: user.id,
			agencyId: user.agencyId,
			role: user.role,
			permissions: (user.permissions as string[] | undefined) ?? [],
		};
		return {
			accessToken: this.signAccessToken(payload),
			refreshToken: this.signRefreshToken(payload),
			user: {
				id: user.id,
				fullName: user.fullName,
				email: user.email,
				role: user.role,
				permissions: (user.permissions as any) ?? [],
			},
			agency,
		};
	}

	async softDeleteAccount(ownerUserId: string) {
		// Obtém usuário e valida agência
		const user = await this.prisma.user.findUnique({ where: { id: ownerUserId } });
		if (!user) throw new UnauthorizedException('Invalid user');
		// Atualiza agência (soft delete + cancelar trial/assinatura)
		const now = new Date();
		await this.prisma.agency.update({
			where: { id: user.agencyId },
			data: {
				subscriptionStatus: 'canceled',
				trialEnd: now,
				deletedAt: now,
			} as any,
		});
		// Marca usuários como deletados logicamente
		await this.prisma.user.updateMany({
			where: { agencyId: user.agencyId },
			data: { deletedAt: now } as any,
		});
		return { ok: true };
	}

	async me(userId: string) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				fullName: true,
				email: true,
				avatarUrl: true,
				role: true,
				permissions: true,
				agencyRoleId: true,
				agencyId: true,
				birthDate: true,
				phone: true,
				hasSeenTasksOnboarding: true,
				simpleAccessLevel: true,
				agency: {
					select: {
						mode: true,
						operationMode: true,
						onboardingCompleted: true,
						showGuidedTour: true,
						hasSeenHomeTour: true,
					},
				},
			},
		});

		if (!user) return null;

		return {
			id: user.id,
			fullName: user.fullName,
			email: user.email,
			avatarUrl: user.avatarUrl,
			role: user.role,
			permissions: user.permissions,
			agencyRoleId: user.agencyRoleId ?? null,
			simpleAccessLevel: user.simpleAccessLevel ?? null,
			agencyId: user.agencyId,
			birthDate: user.birthDate ?? null,
			phone: user.phone ?? null,
			hasSeenTasksOnboarding: user.hasSeenTasksOnboarding,
			agencyMode: user.agency?.mode ?? 'SOLO',
			agencyOperationMode: user.agency?.operationMode ?? 'solo',
			onboarding: {
				completed: user.agency?.onboardingCompleted ?? false,
				showGuidedTour: user.agency?.showGuidedTour ?? true,
				hasSeenHomeTour: user.agency?.hasSeenHomeTour ?? false,
			},
		};
	}

	async signup(params: {
		ownerName: string;
		agencyName: string;
		phone: string;
		email: string;
		password: string;
		passwordConfirm: string;
	}) {
		// basic validations
		const strong = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
		if (!strong.test(params.password || '')) {
			throw new UnauthorizedException('Password must include at least 8 characters, one uppercase letter, one number and one special character');
		}
		if (params.password !== params.passwordConfirm) {
			throw new UnauthorizedException('Passwords do not match');
		}

		const emailLower = (params.email || '').trim().toLowerCase();
		// Somente bloqueia se já existir uma conta ATIVA com este e-mail em uma agência com cartão cadastrado.
		const existingActive = await this.prisma.user.findFirst({
			where: {
				email: emailLower,
				// considerar apenas usuários não deletados e agências ativas com cartão salvo
				// (campos deletedAt e cardOnFile podem não estar no type gerado dependendo da versão do schema)
				...( { deletedAt: null } as any ),
				agency: ( { deletedAt: null, cardOnFile: true } as any ),
			},
			select: { id: true },
		});
		if (existingActive) {
			throw new UnauthorizedException('Email already in use');
		}

		const now = new Date();
		const trialEnd = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

		// create agency with BRL and trialing status
		const agency = await this.prisma.agency.create({
			data: {
				name: params.agencyName,
				email: emailLower,
				baseCurrency: 'BRL' as any,
				planTier: 'plan_1',
				subscriptionStatus: 'trialing',
				planTierV2: 'agencia',
				trialStart: now,
				trialEnd,
				cardOnFile: false,
				maxUsers: 5,
			} as any,
		});
		await ensureAgencySystemRoles(this.prisma, agency.id);

		const passwordHash = await bcrypt.hash(params.password, 12);
		const user = await this.prisma.user.create({
			data: {
				agencyId: agency.id,
				email: emailLower,
				passwordHash,
				fullName: params.ownerName,
				role: 'owner',
				permissions: [],
				phone: params.phone,
				inviteStatus: 'active',
				activatedAt: new Date(),
			} as any,
		});

		const payload = {
			sub: user.id,
			agencyId: agency.id,
			role: 'owner',
			permissions: [] as string[],
		};
		return {
			tokens: {
				accessToken: this.signAccessToken(payload),
				refreshToken: this.signRefreshToken(payload),
			},
			agency,
			user: {
				id: user.id,
				fullName: user.fullName,
				email: user.email,
				role: user.role,
				permissions: [] as string[],
			},
		};
	}

	async loginWithGoogle(idToken: string) {
		const clientId = process.env.GOOGLE_CLIENT_ID;
		if (!clientId) {
			throw new UnauthorizedException('Google sign-in not configured');
		}
		const client = new OAuth2Client(clientId);
		const ticket = await client.verifyIdToken({ idToken, audience: clientId });
		const payload = ticket.getPayload();
		if (!payload?.email) throw new UnauthorizedException('Invalid Google token');
		const email = payload.email.toLowerCase();
		const fullName = payload.name || email.split('@')[0];

		// Try find an existing user by email across agencies
		const matches = await this.prisma.user.findMany({
			where: { email, deletedAt: null },
			select: { id: true, agencyId: true, role: true, permissions: true, inviteStatus: true },
			orderBy: { createdAt: 'desc' },
		});

		let userId: string;
		let agencyId: string;
		let role: string;
		let permissions: string[] = [];

		if (matches.length === 1) {
			const u0 = matches[0];
			if (u0.inviteStatus === 'pending_invite') {
				throw new UnauthorizedException({
					message: 'Seu convite ainda não foi ativado. Use o link que você recebeu.',
					code: 'pending_invite',
				});
			}
			if (u0.inviteStatus === 'disabled') {
				throw new UnauthorizedException({
					message: 'Seu acesso está desativado. Fale com o administrador da agência.',
					code: 'disabled',
				});
			}
			userId = u0.id;
			agencyId = u0.agencyId;
			role = u0.role;
			permissions = (u0.permissions as any) ?? [];
		} else if (matches.length === 0) {
			// Create new agency + owner user in trial
			const now = new Date();
			const trialEnd = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
			const agency = await this.prisma.agency.create({
				data: {
					name: `${fullName} - Agência`,
					email,
					baseCurrency: 'BRL' as any,
					planTier: 'plan_1',
					subscriptionStatus: 'trialing',
					planTierV2: 'agencia',
					trialStart: now,
					trialEnd,
					maxUsers: 5,
				} as any,
			});
			await ensureAgencySystemRoles(this.prisma, agency.id);
			const hash = await bcrypt.hash(Math.random().toString(36).slice(2), 10);
			const user = await this.prisma.user.create({
				data: {
					agencyId: agency.id,
					email,
					passwordHash: hash,
					fullName,
					role: 'owner',
					permissions: [],
					inviteStatus: 'active',
				} as any,
			});
			userId = user.id;
			agencyId = agency.id;
			role = 'owner';
		} else {
			// Ambiguous email across agencies
			throw new UnauthorizedException('Multiple accounts found for this email');
		}

		const payloadJwt = { sub: userId, agencyId, role, permissions };
		const agency = await this.prisma.agency.findUnique({ where: { id: agencyId } });
		return {
			accessToken: this.signAccessToken(payloadJwt),
			refreshToken: this.signRefreshToken(payloadJwt),
			agencyId,
			user: {
				id: userId,
				fullName,
				email,
				role,
				permissions,
			},
			agency,
		};
	}

	async getInvitePreview(token: string) {
		const parsed = parseCompoundInviteToken(token);
		if (!parsed) return { valid: false as const };
		const user = await this.prisma.user.findFirst({
			where: { invitePublicId: parsed.publicId },
			select: {
				inviteTokenHash: true,
				inviteExpiresAt: true,
				inviteStatus: true,
				fullName: true,
				email: true,
			},
		});
		if (!user || user.inviteStatus !== 'pending_invite') return { valid: false as const };
		if (!user.inviteExpiresAt || user.inviteExpiresAt < new Date()) return { valid: false as const };
		if (!verifyOpaqueToken(parsed.secret, user.inviteTokenHash)) return { valid: false as const };
		return { valid: true as const, fullName: user.fullName, email: user.email };
	}

	async acceptInvite(dto: { token: string; fullName?: string; password: string; passwordConfirm: string }) {
		if (!this.strongPassword(dto.password)) {
			throw new BadRequestException(
				'A senha deve ter no mínimo 8 caracteres, incluindo maiúscula, número e caractere especial.',
			);
		}
		if (dto.password !== dto.passwordConfirm) {
			throw new BadRequestException('As senhas não coincidem.');
		}
		const parsed = parseCompoundInviteToken(dto.token);
		if (!parsed) throw new BadRequestException('Convite inválido.');
		const user = await this.prisma.user.findFirst({
			where: { invitePublicId: parsed.publicId },
		});
		if (!user || user.inviteStatus !== 'pending_invite') {
			throw new BadRequestException('Convite inválido ou já utilizado.');
		}
		if (!user.inviteExpiresAt || user.inviteExpiresAt < new Date()) {
			throw new BadRequestException('Este convite expirou. Peça um novo convite ao administrador.');
		}
		if (!verifyOpaqueToken(parsed.secret, user.inviteTokenHash)) {
			throw new BadRequestException('Convite inválido.');
		}
		const passwordHash = await bcrypt.hash(dto.password, 12);
		const fullName = (dto.fullName?.trim() || user.fullName).trim();
		await this.prisma.user.update({
			where: { id: user.id },
			data: {
				passwordHash,
				fullName,
				inviteStatus: 'active',
				invitePublicId: null,
				inviteTokenHash: null,
				inviteExpiresAt: null,
				activatedAt: new Date(),
			},
		});
		return { ok: true };
	}

	async getPasswordResetPreview(token: string) {
		const parsed = parseCompoundInviteToken(token);
		if (!parsed) return { valid: false as const };
		const user = await this.prisma.user.findFirst({
			where: { passwordResetPublicId: parsed.publicId },
			select: {
				passwordResetTokenHash: true,
				passwordResetExpiresAt: true,
				inviteStatus: true,
				email: true,
			},
		});
		if (!user || user.inviteStatus !== 'active') return { valid: false as const };
		if (!user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) return { valid: false as const };
		if (!verifyOpaqueToken(parsed.secret, user.passwordResetTokenHash)) return { valid: false as const };
		return { valid: true as const, email: user.email };
	}

	async acceptPasswordReset(dto: { token: string; password: string; passwordConfirm: string }) {
		if (!this.strongPassword(dto.password)) {
			throw new BadRequestException(
				'A senha deve ter no mínimo 8 caracteres, incluindo maiúscula, número e caractere especial.',
			);
		}
		if (dto.password !== dto.passwordConfirm) {
			throw new BadRequestException('As senhas não coincidem.');
		}
		const parsed = parseCompoundInviteToken(dto.token);
		if (!parsed) throw new BadRequestException('Link inválido.');
		const user = await this.prisma.user.findFirst({
			where: { passwordResetPublicId: parsed.publicId },
		});
		if (!user || user.inviteStatus !== 'active') {
			throw new BadRequestException('Link inválido.');
		}
		if (!user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
			throw new BadRequestException('Este link expirou. Solicite nova redefinição.');
		}
		if (!verifyOpaqueToken(parsed.secret, user.passwordResetTokenHash)) {
			throw new BadRequestException('Link inválido.');
		}
		const passwordHash = await bcrypt.hash(dto.password, 12);
		await this.prisma.user.update({
			where: { id: user.id },
			data: {
				passwordHash,
				passwordResetPublicId: null,
				passwordResetTokenHash: null,
				passwordResetExpiresAt: null,
			},
		});
		return { ok: true };
	}
}

