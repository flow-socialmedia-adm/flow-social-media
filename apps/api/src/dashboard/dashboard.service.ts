import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { FxService } from '../fx/fx.service';
import { RequestContextService } from '../common/context/request-context.service';
import { statusIdToDashboardBucket } from './dashboard-status.util';

@Injectable()
export class DashboardService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly fx: FxService,
		private readonly ctx: RequestContextService,
	) {}

	private getAgencyId(): string {
		return this.ctx.get()?.agencyId!;
	}

	private async getAgencyBaseCurrency(): Promise<'BRL' | 'USD' | 'EUR'> {
		const agencyId = this.getAgencyId();
		const a = await this.prisma.agency.findUnique({
			where: { id: agencyId },
			select: { baseCurrency: true },
		});
		return (a?.baseCurrency as 'BRL' | 'USD' | 'EUR') ?? 'BRL';
	}

	async tasksSummaryWeek() {
		const agencyId = this.getAgencyId();
		const now = new Date();
		const day = now.getDay();
		const diffToMonday = (day + 6) % 7;
		const monday = new Date(now);
		monday.setDate(now.getDate() - diffToMonday);
		monday.setHours(0, 0, 0, 0);
		const sunday = new Date(monday);
		sunday.setDate(monday.getDate() + 6);
		sunday.setHours(23, 59, 59, 999);

		const tasks = await this.prisma.task.findMany({
			where: {
				agencyId,
				date: { gte: monday, lte: sunday },
				NOT: {
					OR: [{ category: 'forecast' }, { bornAsForecast: true }],
				},
			},
			select: { statusId: true },
		});

		let todo = 0;
		let doing = 0;
		let done = 0;
		for (const t of tasks) {
			const bucket = statusIdToDashboardBucket(t.statusId);
			if (bucket === 'doing') doing += 1;
			else if (bucket === 'done') done += 1;
			else todo += 1;
		}

		return {
			weekStart: monday.toISOString(),
			weekEnd: sunday.toISOString(),
			todo,
			doing,
			done,
		};
	}

	async nextFinancial() {
		const agencyId = this.getAgencyId();
		const base = await this.getAgencyBaseCurrency();
		const now = new Date();
		const nextIncome = await this.prisma.financialEntry.findFirst({
			where: { agencyId, type: 'income', status: 'pending', dueDate: { gte: now } },
			orderBy: { dueDate: 'asc' },
		});
		const nextExpense = await this.prisma.financialEntry.findFirst({
			where: { agencyId, type: 'expense', status: 'pending', dueDate: { gte: now } },
			orderBy: { dueDate: 'asc' },
		});
		const convert = async (e: { value: unknown; currency: string; dueDate: Date } | null) => {
			if (!e) return null;
			const value = Number(e.value);
			const converted =
				e.currency === base
					? value
					: await this.fx.convert(value, e.dueDate, e.currency as 'BRL' | 'USD' | 'EUR', base);
			return { ...e, baseCurrency: base, valueBase: converted };
		};
		return {
			baseCurrency: base,
			nextIncome: await convert(nextIncome),
			nextExpense: await convert(nextExpense),
		};
	}

	async recentClients() {
		const agencyId = this.getAgencyId();
		return this.prisma.client.findMany({
			where: { agencyId },
			orderBy: { id: 'desc' },
			take: 3,
			select: {
				id: true,
				name: true,
				color: true,
				avatarUrl: true,
			},
		});
	}
}
