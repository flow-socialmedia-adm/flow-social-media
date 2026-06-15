import type { Client } from '../types';
import type { BriefingV2 } from './briefingV2/types';
import { parsePostFrequencyStructured } from './utils';

export type PlanningFrequency = { quantity: number; period: 'week' | 'month' };

export function stripAccents(s: string): string {
	return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function normalizePlanningQuantity(value: unknown): number | null {
	if (value == null) return null;
	const n = typeof value === 'number' ? value : typeof value === 'string' ? parseInt(value, 10) : NaN;
	return Number.isFinite(n) && n > 0 ? n : null;
}

const MONTH_PERIOD_ALIASES = new Set([
	'month',
	'monthly',
	'mes',
	'mês',
	'mensal',
	'por mes',
	'por mês',
	'per_month',
	'per month',
]);

const WEEK_PERIOD_ALIASES = new Set([
	'week',
	'weekly',
	'semana',
	'semanal',
	'por semana',
	'per_week',
	'per week',
]);

/** Normalização robusta de período — usada na página Planejamento de Conteúdo. */
export function normalizePlanningPeriod(value: unknown): 'week' | 'month' | null {
	if (value === 'week' || value === 'month') return value;
	if (typeof value !== 'string' || !value.trim()) return null;

	const s = value.trim().toLowerCase().replace(/_/g, ' ');
	const ascii = stripAccents(s);

	if (WEEK_PERIOD_ALIASES.has(s) || WEEK_PERIOD_ALIASES.has(ascii)) return 'week';
	if (MONTH_PERIOD_ALIASES.has(s) || MONTH_PERIOD_ALIASES.has(ascii)) return 'month';

	if (ascii.includes('week') || ascii.includes('semana')) return 'week';
	if (ascii.includes('month') || ascii.includes('mes')) return 'month';

	return null;
}

export function isBriefingV2FrequencyFilled(
	freq: BriefingV2['planning']['frequency'] | null | undefined,
): boolean {
	if (!freq || freq.variable) return false;
	return normalizePlanningQuantity(freq.quantity) != null && normalizePlanningPeriod(freq.period) != null;
}

/** Lê frequência diretamente de client.briefingV2 — sem migração legada. */
export function resolveFrequencyFromBriefingV2(client: Client): PlanningFrequency | null {
	if (client.postFrequencyVariable) return null;
	const freq = client.briefingV2?.planning?.frequency;
	if (!freq || freq.variable) return null;

	const quantity = normalizePlanningQuantity(freq.quantity);
	const period = normalizePlanningPeriod(freq.period);
	if (quantity != null && period != null) {
		return { quantity, period };
	}
	return null;
}

/** Mescla frequência de briefing V2 parcial sobre base migrada. */
export function mergePartialBriefingFrequency(
	partial: BriefingV2 | null | undefined,
	base: BriefingV2,
): BriefingV2 {
	const freq = partial?.planning?.frequency;
	if (!freq || freq.variable) return base;

	const quantity = normalizePlanningQuantity(freq.quantity);
	const period = normalizePlanningPeriod(freq.period);
	if (quantity == null || period == null) return base;

	return {
		...base,
		planning: {
			...base.planning,
			frequency: { quantity, period, variable: false },
		},
	};
}

/**
 * Frequência canônica do Planejamento de Conteúdo.
 * Regra: briefingV2.planning.frequency preenchida SEMPRE vence campos flat/legados.
 */
export function resolvePlanningFrequency(client: Client): PlanningFrequency | null {
	if (client.postFrequencyVariable) return null;

	const fromBriefingV2 = resolveFrequencyFromBriefingV2(client);
	if (fromBriefingV2) return fromBriefingV2;

	const parsed = parsePostFrequencyStructured(client.postFrequency);
	if (parsed) {
		const parsedPeriod = normalizePlanningPeriod(parsed.period);
		if (parsedPeriod != null) {
			return { quantity: parsed.quantity, period: parsedPeriod };
		}
	}

	const flatQty = normalizePlanningQuantity(client.postFrequencyQuantity);
	const flatPeriod = normalizePlanningPeriod(client.postFrequencyPeriod);
	if (flatQty != null && flatPeriod != null) {
		return { quantity: flatQty, period: flatPeriod };
	}

	return null;
}
