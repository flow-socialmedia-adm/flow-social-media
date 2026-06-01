import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';

type ContractItem = {
	description: string;
	category?: string;
	value: number;
	currency: 'BRL' | 'USD' | 'EUR';
	recurrence: 'monthly' | 'yearly';
	dayOfMonth?: number; // default: 5
};

@Injectable()
export class JobsService {
	private readonly logger = new Logger(JobsService.name);
	constructor(private readonly prisma: PrismaService) {}

	@Cron(CronExpression.EVERY_DAY_AT_1AM)
	async generateRecurringEntries() {
		// For each client, inspect contract_json and create entries for current competence if not existing
		const clients = await this.prisma.client.findMany({
			select: { id: true, contractJson: true, agencyId: true },
		});
		const now = new Date();
		const year = now.getFullYear();
		const month = now.getMonth(); // 0-based
		for (const c of clients) {
			const items: ContractItem[] = Array.isArray(c.contractJson) ? (c.contractJson as ContractItem[]) : [];
			for (const item of items) {
				if (!item.recurrence) continue;
				const day = item.dayOfMonth ?? 5;
				const dueDate =
					item.recurrence === 'monthly'
						? new Date(year, month, day)
						: new Date(year, 0, day);
				// idempotency check
				const exists = await this.prisma.financialEntry.findFirst({
					where: {
						clientId: c.id,
						description: item.description,
						category: item.category ?? 'fee_monthly',
						type: 'income',
						dueDate: {
							gte:
								item.recurrence === 'monthly'
									? new Date(year, month, 1)
									: new Date(year, 0, 1),
							lte:
								item.recurrence === 'monthly'
									? new Date(year, month + 1, 0)
									: new Date(year, 11, 31),
						},
					},
				});
				if (exists) continue;
				await this.prisma.financialEntry.create({
					data: {
						agencyId: c.agencyId,
						clientId: c.id,
						type: 'income',
						description: item.description,
						category: item.category ?? 'fee_monthly',
						value: item.value as any,
						currency: item.currency,
						dueDate,
						paymentDate: null,
						status: dueDate < new Date() ? ('overdue' as any) : ('pending' as any),
						recurrence:
							item.recurrence === 'monthly' ? ('monthly' as any) : ('yearly' as any),
						supplier: null,
					},
				});
			}
		}
		this.logger.log('Recurring financial entries generation executed');
	}

	@Cron(CronExpression.EVERY_DAY_AT_2AM)
	async warmFxCache() {
		// noop for now; conversion é sob demanda e cacheado no primeiro uso
		this.logger.log('FX cache warmup executed');
	}
}

