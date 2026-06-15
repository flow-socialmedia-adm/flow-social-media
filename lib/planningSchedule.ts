import type { Client, Task } from '../types';
import type { BriefingV2 } from './briefingV2/types';
import { resolveClientBriefing } from './briefingV2/migrate';
import { clientHasStructuredFrequency } from './clientContext';
import { normalizeDateOnly } from './dateOnly';
import {
	type PlanningFrequency,
	normalizePlanningPeriod,
	normalizePlanningQuantity,
	resolveFrequencyFromBriefingV2,
	resolvePlanningFrequency,
} from './planningFrequency';
import {
	countCalendarWeeksInMonth,
	formatDateToYYYYMMDD,
} from './utils';

export type { PlanningFrequency } from './planningFrequency';
export {
	normalizePlanningPeriod,
	normalizePlanningQuantity,
	resolveFrequencyFromBriefingV2,
	resolvePlanningFrequency,
} from './planningFrequency';

/**
 * Meta mensal (Y) para tag, faltantes e previsões.
 * - Por mês: quantidade contratada (não varia com 4 ou 5 semanas).
 * - Por semana: quantidade × semanas civis do mês.
 */
export function getMonthlyPlanningGoal(client: Client, year: number, month: number): number | null {
	const resolved = resolvePlanningFrequency(client);
	if (!resolved) return null;
	if (resolved.period === 'month') return resolved.quantity;
	return resolved.quantity * countCalendarWeeksInMonth(year, month);
}

export type ScheduleAuditItem = {
	taskId: string;
	title: string;
	clientId: string;
	dateOriginal: string;
	dateNormalized: string;
	monthConsidered: string;
	postType: string;
	category: string;
	bornAsForecast: string;
	statusId: string;
	counted: boolean;
	reason: string;
};

export type ClientScheduleSummary = {
	monthStart: string;
	monthEnd: string;
	goal: number | null;
	plannedCount: number;
	remainingCount: number | null;
	countedItems: ScheduleAuditItem[];
	ignoredItems: ScheduleAuditItem[];
	/** Alias para tag — igual a plannedCount */
	planned: number;
	/** Alias para tag — igual a remainingCount */
	missing: number | null;
};

/** Post real ou previsão ocupam slot na meta do mês. Status de workflow não importa. */
export function taskOccupiesPlanningSlot(task: Pick<Task, 'postType' | 'category' | 'isGeneral' | 'clientId'>): boolean {
	if (task.isGeneral || !task.clientId) return false;
	return !!task.postType || task.category === 'forecast';
}

export function getTaskPlanningDate(task: Pick<Task, 'publishDate' | 'date'>): string {
	return normalizeDateOnly(task.publishDate ?? task.date) ?? '';
}

function buildAuditRow(task: Task, monthKey: string, counted: boolean, reason: string): ScheduleAuditItem {
	const raw = (task.publishDate ?? task.date ?? '').toString();
	const normalized = getTaskPlanningDate(task);
	return {
		taskId: task.id,
		title: task.title || '',
		clientId: task.clientId || '',
		dateOriginal: raw,
		dateNormalized: normalized,
		monthConsidered: monthKey,
		postType: task.postType ?? '',
		category: task.category ?? '',
		bornAsForecast: task.bornAsForecast === true ? 'true' : task.bornAsForecast === false ? 'false' : '',
		statusId: task.statusId ?? '',
		counted,
		reason,
	};
}

/**
 * Contagem mensal canônica para tag "Posts planejados: X/Y".
 * monthAnchor: 1º dia do mês civil visível no calendário (currentMonthAnchor).
 */
export function computeClientMonthlySchedule(
	client: Client,
	items: Task[],
	monthAnchor: Date,
): ClientScheduleSummary {
	const year = monthAnchor.getFullYear();
	const month = monthAnchor.getMonth();
	const monthStart = formatDateToYYYYMMDD(new Date(year, month, 1));
	const monthEnd = formatDateToYYYYMMDD(new Date(year, month + 1, 0));
	const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

	const countedItems: ScheduleAuditItem[] = [];
	const ignoredItems: ScheduleAuditItem[] = [];

	for (const task of items) {
		if (task.clientId !== client.id) {
			ignoredItems.push(buildAuditRow(task, monthKey, false, 'wrong_client'));
			continue;
		}
		if (task.isGeneral) {
			ignoredItems.push(buildAuditRow(task, monthKey, false, 'general_task'));
			continue;
		}
		if (!taskOccupiesPlanningSlot(task)) {
			ignoredItems.push(buildAuditRow(task, monthKey, false, 'not_planning_slot'));
			continue;
		}
		const dateNorm = getTaskPlanningDate(task);
		if (!dateNorm) {
			ignoredItems.push(buildAuditRow(task, monthKey, false, 'missing_date'));
			continue;
		}
		if (dateNorm < monthStart || dateNorm > monthEnd) {
			ignoredItems.push(buildAuditRow(task, monthKey, false, 'outside_visible_month'));
			continue;
		}
		countedItems.push(buildAuditRow(task, monthKey, true, 'counts_as_planned_slot'));
	}

	const plannedCount = countedItems.length;
	const goal = getMonthlyPlanningGoal(client, year, month);
	const remainingCount = goal != null ? Math.max(0, goal - plannedCount) : null;

	return {
		monthStart,
		monthEnd,
		goal,
		plannedCount,
		remainingCount,
		countedItems,
		ignoredItems,
		planned: plannedCount,
		missing: remainingCount,
	};
}

export type PlanningTagTracePayload = {
	stage: string;
	clientName: string;
	monthAnchor: string;
	frequencyResolved: PlanningFrequency | null;
	monthlyGoalFromSchedule: number | null;
	plannedCountFromSchedule: number;
	remainingCountFromSchedule: number | null;
	scheduleSummaryReceivedByCard?: ClientScheduleSummary | null;
	scheduleSummaryReceivedByTags?: ClientScheduleSummary | null;
	labelRendered?: string;
	briefingFrequencyRaw?: unknown;
	flatFrequency?: { qty: unknown; period: unknown; postFrequency?: string };
};

/** Trace dev da cadeia PlanningPage → tags (Janete). */
export function logPlanningTagTrace(payload: PlanningTagTracePayload): void {
	if (typeof import.meta !== 'undefined' && !import.meta.env?.DEV) return;
	if (!/janete/i.test(payload.clientName || '')) return;
	// eslint-disable-next-line no-console
	console.log('[PlanningTagTrace]', payload);
}

/** Log de auditoria (dev) — tabela completa para diagnóstico X/Y. */
export function logClientMonthlyScheduleAudit(client: Client, summary: ClientScheduleSummary): void {
	const freq = resolvePlanningFrequency(client);
	const rows = [...summary.countedItems, ...summary.ignoredItems];
	// eslint-disable-next-line no-console
	console.group(`[PlanningScheduleAudit] ${client.name} (${summary.monthStart}..${summary.monthEnd})`);
	// eslint-disable-next-line no-console
	console.log('frequency resolved:', freq);
	// eslint-disable-next-line no-console
	console.log('goal (Y):', summary.goal, '| planned (X):', summary.plannedCount, '| remaining:', summary.remainingCount);
	// eslint-disable-next-line no-console
	console.table(rows);
	// eslint-disable-next-line no-console
	console.groupEnd();
}

export function clientHasMonthObjective(client: Client): boolean {
	const briefing = resolveClientBriefing(client);
	return Boolean(resolveMonthObjective(briefing));
}

export function clientHasPreferredDays(client: Client): boolean {
	const briefing = resolveClientBriefing(client);
	return (briefing.planning.preferredPostDays ?? []).length > 0;
}

/** Pré-requisitos para habilitar "Gerar previsões". */
export function canGeneratePlanningForecasts(client: Client): boolean {
	if (client.postFrequencyVariable) return false;
	return clientHasStructuredFrequency(client) && clientHasPreferredDays(client) && clientHasMonthObjective(client);
}

/** Objetivo mensal exibido: currentCampaignObjective, ou monthFocus legado se vazio. */
export function resolveMonthObjective(briefing: BriefingV2): string {
	const objective = briefing.content.currentCampaignObjective?.trim() || '';
	if (objective) return objective;
	return briefing.content.monthFocus?.trim() || '';
}

export function getBriefingMonthFields(briefing: BriefingV2) {
	return {
		monthObjective: resolveMonthObjective(briefing),
		pillars: (briefing.content.pillarsTags ?? []).filter((p) => p.trim()),
	};
}

/** Intervalo do mês civil atual (local). */
export function getCurrentMonthRange(ref: Date = new Date()): { start: Date; end: Date; year: number; month: number } {
	const year = ref.getFullYear();
	const month = ref.getMonth();
	return {
		year,
		month,
		start: new Date(year, month, 1),
		end: new Date(year, month + 1, 0),
	};
}
