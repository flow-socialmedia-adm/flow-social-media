import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../database/prisma.service';

type JwtPayload = {
	sub: string;
	agencyId: string;
	role: string;
	permissions?: string[];
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(private readonly prisma: PrismaService) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: process.env.JWT_ACCESS_SECRET || 'dev-secret',
		});
	}

	async validate(payload: JwtPayload) {
		const user = await this.prisma.user.findUnique({
			where: { id: payload.sub },
			select: {
				inviteStatus: true,
				deletedAt: true,
				agencyId: true,
				role: true,
				permissions: true,
			},
		});
		if (!user || user.deletedAt) {
			throw new UnauthorizedException();
		}
		if (user.inviteStatus !== 'active') {
			throw new UnauthorizedException();
		}
		/** Banco como fonte de verdade: o Prisma middleware escopo por `ctx.agencyId` (req.user). */
		const permissions = (user.permissions as string[] | undefined) ?? [];
		return {
			sub: payload.sub,
			agencyId: user.agencyId,
			role: user.role,
			permissions,
		};
	}
}

