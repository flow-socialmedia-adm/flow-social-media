import type { Task, Workflow } from '../types';
import { getTaskDisplayDate, formatDateToYYYYMMDD } from './utils';
import { isPostForecast } from './postForecastVisual';
import { getAgendaPeriodDayKeys, type AgendaPeriodView } from './intelligencePeriod';

export type AgendaSummaryView = AgendaPeriodView;

export type AgendaVisibleSummary = {
	posts: number;
	tasks: number;
	overdue: number;
	inPeriod: number;
};

function isTaskDone(
	task: Task,
	workflows: Record<string, Workflow>,
	clientWorkflowId: string,
	generalWorkflowId: string,
): boolean {
	const wfId = task.isGeneral ? generalWorkflowId : task.workflowId || clientWorkflowId;
	const wf = workflows[wfId];
	const status = wf?.statuses?.find((s) => s.id === task.statusId);
	return status?.category === 'done';
}

/** Contadores básicos sobre a lista já filtrada da Agenda (sem nova query). */
export function computeAgendaVisibleSummary(
	visibleTasks: Task[],
	opts: {
		view: AgendaSummaryView;
		currentDate: Date;
		workflows: Record<string, Workflow>;
		clientWorkflowId: string;
		generalWorkflowId: string;
	},
): AgendaVisibleSummary {
	const today = formatDateToYYYYMMDD(new Date());
	const periodKeys =
		opts.view === 'kanban' ? null : getAgendaPeriodDayKeys(opts.view, opts.currentDate);

	let posts = 0;
	let tasks = 0;
	let overdue = 0;
	let inPeriod = 0;

	for (const task of visibleTasks) {
		const dayKey = getTaskDisplayDate(task) || task.date;
		const done = isTaskDone(task, opts.workflows, opts.clientWorkflowId, opts.generalWorkflowId);

		if (task.isGeneral) {
			tasks += 1;
		} else if (!isPostForecast(task)) {
			posts += 1;
		}

		if (!done && dayKey && dayKey < today) {
			overdue += 1;
		}

		if (opts.view === 'kanban') {
			inPeriod += 1;
		} else if (dayKey && periodKeys?.has(dayKey)) {
			inPeriod += 1;
		}
	}

	return { posts, tasks, overdue, inPeriod };
}
