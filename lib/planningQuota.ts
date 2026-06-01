import { apiGet } from './api';
import {
	formatDateToYYYYMMDD,
	getExpectedForMonth,
	type ClientFrequencyInput,
} from './utils';

export type PlanningSlotTask = {
	postType?: string | null;
	category?: string | null;
};

/** Post real ou previsão ocupam slot na meta do período. */
export function taskOccupiesPlanningSlot(task: PlanningSlotTask): boolean {
	return !!task.postType || task.category === 'forecast';
}

export type PlanningQuotaValidation = { canCreate: boolean; message?: string };

/** Avalia meta do mês civil que contém `dateStr` (mesma regra da geração de previsões). */
export function evaluatePlanningQuota(
	client: ClientFrequencyInput,
	dateStr: string,
	items: PlanningSlotTask[],
	t: (key: string, params?: Record<string, string>) => string,
): PlanningQuotaValidation {
	if (client.postFrequencyVariable === true) return { canCreate: true };
	const period = client.postFrequencyPeriod;
	if (period !== 'week' && period !== 'month') return { canCreate: true };
	if (!client.postFrequencyQuantity || client.postFrequencyQuantity < 1) return { canCreate: true };

	const d = new Date(`${dateStr}T12:00:00`);
	const expected = getExpectedForMonth(client, d.getFullYear(), d.getMonth());
	if (expected == null) return { canCreate: true };

	const occupied = items.filter(taskOccupiesPlanningSlot).length;
	if (occupied >= expected) {
		return { canCreate: true, message: t('planning_forecast_exceed_warning') };
	}
	const gap = expected - occupied;
	if (gap <= 2 && gap > 0) {
		return { canCreate: true, message: t('planning_forecast_gap_warning') };
	}
	return { canCreate: true };
}

export async function fetchPlanningQuotaTasks(
	clientId: string,
	dateStr: string,
): Promise<PlanningSlotTask[]> {
	const d = new Date(`${dateStr}T12:00:00`);
	const year = d.getFullYear();
	const month = d.getMonth();
	const rangeStart = formatDateToYYYYMMDD(new Date(year, month, 1));
	const rangeEnd = formatDateToYYYYMMDD(new Date(year, month + 1, 0));
	const resp = await apiGet<{ items: PlanningSlotTask[] }>('/tasks', {
		startDate: rangeStart,
		endDate: rangeEnd,
		clientId,
		page: 1,
		pageSize: 500,
	});
	return resp?.items || [];
}

export type PlanningQuotaClient = ClientFrequencyInput & { id: string };

/** Validador reutilizável para modal (previsão e post real). */
export function createPlanningQuotaValidator(
	clients: PlanningQuotaClient[],
	t: (key: string, params?: Record<string, string>) => string,
) {
	return async (clientId: string, date: string): Promise<PlanningQuotaValidation> => {
		const client = clients.find((c) => c.id === clientId);
		if (!client) return { canCreate: true };
		const items = await fetchPlanningQuotaTasks(clientId, date);
		return evaluatePlanningQuota(client, date, items, t);
	};
}
