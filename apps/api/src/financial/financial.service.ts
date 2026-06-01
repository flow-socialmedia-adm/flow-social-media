import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { FxService } from '../fx/fx.service';
import { RequestContextService } from '../common/context/request-context.service';
import { ModuleAccessService } from '../common/permissions/module-access.service';

type CreateEntryDto = {
	clientId?: string | null;
	type: 'income' | 'expense';
	description: string;
	category: string;
	value: string; // decimal string
	currency: 'BRL' | 'USD' | 'EUR';
	dueDate: string; // YYYY-MM-DD
	paymentDate?: string | null;
	recurrence: 'monthly' | 'yearly' | 'none';
	supplier?: string | null;
};

type UpdateEntryDto = Partial<CreateEntryDto>;

function computeStatus(dueDate: Date, paymentDate?: Date | null) {
	if (paymentDate) return 'paid' as const;
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	return dueDate < today ? ('overdue' as const) : ('pending' as const);
}

@Injectable()
export class FinancialService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly fx: FxService,
		private readonly ctx: RequestContextService,
		private readonly access: ModuleAccessService,
	) {}

	async list(
		filters: {
			type?: 'income' | 'expense';
			status?: 'pending' | 'paid' | 'overdue';
			clientId?: string;
			startDate?: string;
			endDate?: string;
		},
		page: number,
		pageSize: number,
	) {
		await this.access.assertCanView('financial');
		const where = {
			type: filters.type,
			status: filters.status as any,
			clientId: filters.clientId,
			dueDate:
				filters.startDate || filters.endDate
					? {
							gte: filters.startDate ? new Date(filters.startDate) : undefined,
							lte: filters.endDate ? new Date(filters.endDate) : undefined,
					  }
					: undefined,
		} as any;
		const skip = (page - 1) * pageSize;
		const [items, total] = await this.prisma.$transaction([
			this.prisma.financialEntry.findMany({
				where,
				orderBy: [{ dueDate: 'asc' }],
				skip,
				take: pageSize,
			}),
			this.prisma.financialEntry.count({ where }),
		]);
		return { items, total, page, pageSize };
	}

	async create(data: CreateEntryDto) {
		await this.access.assertCanEdit('financial');
		const agencyId = this.ctx.get()?.agencyId!;
		const due = new Date(data.dueDate);
		const paid = data.paymentDate ? new Date(data.paymentDate) : null;
		const status = computeStatus(due, paid || undefined);
		// Regras de negócio: se for receita sem cliente e categoria vazia, padronizar para 'other_income'
		const normalizedCategory =
			data.type === 'income' && (!data.clientId || data.clientId === null) && (!data.category || data.category.trim() === '')
				? 'other_income'
				: data.category;
		return this.prisma.financialEntry.create({
			data: {
				agencyId,
				clientId: data.clientId ?? null,
				type: data.type,
				description: data.description,
				category: normalizedCategory,
				value: data.value as any,
				currency: data.currency,
				dueDate: due,
				paymentDate: paid,
				status: status as any,
				recurrence: data.recurrence,
				supplier: data.supplier ?? null,
			},
		});
	}

	async update(id: string, data: UpdateEntryDto) {
		await this.access.assertCanEdit('financial');
		let due: Date | undefined;
		let paid: Date | null | undefined;
		if (data.dueDate) due = new Date(data.dueDate);
		if ('paymentDate' in data) paid = data.paymentDate ? new Date(data.paymentDate) : null;

		// Recompute status if due/payment provided
		let status: 'pending' | 'paid' | 'overdue' | undefined;
		if (due || 'paymentDate' in data) {
			const current = await this.prisma.financialEntry.findUnique({
				where: { id },
				select: { dueDate: true },
			});
			const baseDue = due ?? current?.dueDate!;
			status = computeStatus(baseDue, paid ?? undefined);
		}

		return this.prisma.financialEntry.update({
			where: { id },
			data: {
				clientId: data.clientId,
				type: data.type as any,
				description: data.description,
				category: data.category,
				value: (data.value as any) ?? undefined,
				currency: data.currency as any,
				dueDate: due,
				paymentDate: paid,
				status: status as any,
				recurrence: data.recurrence as any,
				supplier: data.supplier,
			},
		});
	}

	async remove(id: string) {
		await this.access.assertCanEdit('financial');
		// Usa deleteMany para alinhar ao middleware multi-tenant (id + agencyId)
		const result = await this.prisma.financialEntry.deleteMany({
			where: { id },
		});
		return { ok: true, deleted: result.count };
	}

	async markPaid(id: string) {
		await this.access.assertCanEdit('financial');
		const now = new Date();
		now.setHours(0, 0, 0, 0);
		return this.prisma.financialEntry.update({
			where: { id },
			data: { paymentDate: now, status: 'paid' as any },
		});
	}

	async unpay(id: string) {
		await this.access.assertCanEdit('financial');
		const entry = await this.prisma.financialEntry.findUnique({
			where: { id },
			select: { dueDate: true },
		});
		const status = computeStatus(entry!.dueDate, null);
		return this.prisma.financialEntry.update({
			where: { id },
			data: { paymentDate: null, status: status as any },
		});
	}

	private async getAgencyBaseCurrency(): Promise<'BRL' | 'USD' | 'EUR'> {
		const agencyId = this.ctx.get()?.agencyId;
		if (!agencyId) return 'BRL';
		const agency = await this.prisma.agency.findUnique({
			where: { id: agencyId },
			select: { baseCurrency: true },
		});
		return (agency?.baseCurrency as any) ?? 'BRL';
	}

	async kpisCurrentMonth() {
		await this.access.assertCanView('financial');
		const base = await this.getAgencyBaseCurrency();
		const now = new Date();
		const start = new Date(now.getFullYear(), now.getMonth(), 1);
		const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
		// Faturado (competência): receitas pelo dueDate do mês
		const faturadoEntries = await this.prisma.financialEntry.findMany({
			where: { type: 'income', dueDate: { gte: start, lte: end } },
		});
		let faturado = 0;
		for (const e of faturadoEntries) {
			const value = Number(e.value);
			const conv =
				e.currency === base ? value : await this.fx.convert(value, e.dueDate, e.currency as any, base);
			faturado += conv;
		}
		// Recebido e Despesas (realizado): por paymentDate do mês
		const [recebidosEntries, despesasEntries] = await Promise.all([
			this.prisma.financialEntry.findMany({
				where: { type: 'income', paymentDate: { gte: start, lte: end } },
			}),
			this.prisma.financialEntry.findMany({
				where: { type: 'expense', paymentDate: { gte: start, lte: end } },
			}),
		]);
		let recebido = 0;
		for (const e of recebidosEntries) {
			const value = Number(e.value);
			const conv =
				e.currency === base
					? value
					: await this.fx.convert(value, e.paymentDate!, e.currency as any, base);
			recebido += conv;
		}
		let despesas = 0;
		for (const e of despesasEntries) {
			const value = Number(e.value);
			const conv =
				e.currency === base
					? value
					: await this.fx.convert(value, e.paymentDate!, e.currency as any, base);
			despesas += conv;
		}
		return {
			baseCurrency: base,
			faturado,
			recebido,
			despesas,
			saldo: faturado - despesas,
		};
	}

	async cashflowLast6Months() {
		await this.access.assertCanView('financial');
		const base = await this.getAgencyBaseCurrency();
		const now = new Date();
		const results: {
			month: string;
			income: number;
			expense: number;
		}[] = [];
		for (let i = 5; i >= 0; i--) {
			const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
			const start = new Date(date.getFullYear(), date.getMonth(), 1);
			const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
			const entries = await this.prisma.financialEntry.findMany({
				where: { dueDate: { gte: start, lte: end } },
			});
			let income = 0;
			let expense = 0;
			for (const e of entries) {
				const value = Number(e.value);
				const converted =
					e.currency === base
						? value
						: await this.fx.convert(value, e.dueDate, e.currency as any, base);
				if (e.type === 'income') income += converted;
				else expense += converted;
			}
			results.push({
				month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
				income,
				expense,
			});
		}
		return { baseCurrency: base, data: results };
	}

	async pieByCategory(type: 'income' | 'expense') {
		await this.access.assertCanView('financial');
		const base = await this.getAgencyBaseCurrency();
		const now = new Date();
		const start = new Date(now.getFullYear(), now.getMonth(), 1);
		const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
		// Para pizza, adotar competência (dueDate) — mostra a distribuição do mês atual independente do pagamento
		const entries = await this.prisma.financialEntry.findMany({
			where: { type, dueDate: { gte: start, lte: end } },
		});
		const map = new Map<string, number>();
		for (const e of entries) {
			const value = Number(e.value);
			const converted =
				e.currency === base
					? value
					: await this.fx.convert(value, e.dueDate, e.currency as any, base);
			map.set(e.category, (map.get(e.category) ?? 0) + converted);
		}
		return {
			baseCurrency: base,
			data: Array.from(map.entries()).map(([category, total]) => ({
				category,
				total,
			})),
		};
	}
}

