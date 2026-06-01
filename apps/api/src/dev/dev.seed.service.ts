import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DevSeedService implements OnModuleInit {
	constructor(private readonly prisma: PrismaService) {}

	async onModuleInit() {
		if (process.env.NODE_ENV !== 'development') return;
		if (process.env.SEED_DEV !== 'true') return;

		// Seed idempotente: cria agency e owner se não existirem para ambiente dev
		const emailAgency = 'demo@flow.test';
		const emailOwner = 'owner@flow.test';

		let agency = await this.prisma.agency.findFirst({
			where: { email: emailAgency },
		});
		if (!agency) {
			agency = await this.prisma.agency.create({
				data: {
					name: 'Flow Demo',
					email: emailAgency,
					baseCurrency: 'BRL',
					planTier: 'plan_1',
					subscriptionStatus: 'trialing',
					planTierV2: 'agencia',
					trialStart: new Date(),
					trialEnd: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
					maxUsers: 3,
				} as any,
			});
		}
		const owner = await this.prisma.user.findFirst({
			where: { email: emailOwner, agencyId: agency.id },
		});
		if (!owner) {
			const hash = await bcrypt.hash('admin123', 10);
			await this.prisma.user.create({
				data: {
					agencyId: agency.id,
					email: emailOwner,
					passwordHash: hash,
					fullName: 'Owner',
					role: 'owner',
					permissions: [],
				} as any,
			});
		}
	}
}

