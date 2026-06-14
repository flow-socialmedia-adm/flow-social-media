import type { Client, Task } from '../types';
import type { BriefingV2 } from './briefingV2/types';
import { resolveClientBriefing } from './briefingV2/migrate';
import { clientHasStructuredFrequency } from './clientContext';
import { formatDateToYYYYMMDD, getExpectedForMonth } from './utils';

export type ClientScheduleSummary = {
	planned: number;
	goal: number | null;
	missing: number | null;
};

/** Post real ou previsão ocupam slot na meta do mês. Status de workflow não importa. */
export function taskOccupiesPlanningSlot(task: Pick<Task, 'postType' | 'category' | 'isGeneral' | 'clientId'>): boolean {
	if (task.isGeneral || !task.clientId) return false;
	return !!task.postType || task.category === 'forecast';
}

export function getTaskPlanningDate(task: Pick<Task, 'publishDate' | 'date'>): string {
	return (task.publishDate ?? task.date ?? '').slice(0, 10);
}

/** Contagem mensal canônica para tag "Posts planejados: X/Y". */
export function computeClientMonthlySchedule(
	clientId: string,
	items: Task[],
	year: number,
	month: number,
	client: Client,
): ClientScheduleSummary {
	const low = formatDateToYYYYMMDD(new Date(year, month, 1));
	const hi = formatDateToYYYYMMDD(new Date(year, month + 1, 0));

	const planned = items.filter(
		(p) =>
			p.clientId === clientId &&
			taskOccupiesPlanningSlot(p) &&
			getTaskPlanningDate(p) >= low &&
			getTaskPlanningDate(p) <= hi,
	).length;

	const expectedRaw = getExpectedForMonth(client, year, month);
	const goal = expectedRaw != null ? Math.ceil(expectedRaw) : null;
	const missing = goal != null ? Math.max(0, goal - planned) : null;
	return { planned, goal, missing };
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
