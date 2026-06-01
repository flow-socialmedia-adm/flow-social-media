import type { Task } from '../types';
import { formatDateToYYYYMMDD, getMonthDays, getTaskDisplayDate, getWeekDays } from './utils';

export type AgendaPeriodView = 'daily' | 'weekly' | 'monthly' | 'list' | 'kanban';

/** Chaves de dias (YYYY-MM-DD) do período visível na Agenda. Vazio em kanban. */
export function getAgendaPeriodDayKeys(view: AgendaPeriodView, currentDate: Date): Set<string> {
	if (view === 'daily') {
		return new Set([formatDateToYYYYMMDD(currentDate)]);
	}
	if (view === 'weekly' || view === 'list') {
		return new Set(getWeekDays(currentDate).map((d) => formatDateToYYYYMMDD(d)));
	}
	if (view === 'monthly') {
		return new Set(getMonthDays(currentDate).map((cell) => formatDateToYYYYMMDD(cell.date)));
	}
	return new Set();
}

/** Rótulo de contexto i18n para a Central na Agenda conforme a visão temporal. */
export function getAgendaPeriodContextKey(view: AgendaPeriodView): string | undefined {
	switch (view) {
		case 'daily':
			return 'intel_context_agenda_period_daily';
		case 'weekly':
		case 'list':
			return 'intel_context_agenda_period_weekly';
		case 'monthly':
			return 'intel_context_agenda_period_monthly';
		default:
			return undefined;
	}
}

export function isTaskDayInPeriod(task: Task, periodKeys: Set<string>): boolean {
	if (periodKeys.size === 0) return true;
	const dayKey = getTaskDisplayDate(task) || task.date;
	return !!dayKey && periodKeys.has(dayKey);
}
