import type { Client, Task, Workflow } from '../types';
import {
	formatDateToYYYYMMDD,
	getExpectedForWeek,
	getMonthDays,
	getTaskDisplayDate,
	getWeekDays,
	getWeekDaysMondayFirst,
	type ClientFrequencyInput,
} from './utils';
import { isPostForecast } from './postForecastVisual';
import { isRealPostFlowTask } from './taskActionFlow';

export type InsightSeverity = 'info' | 'warning' | 'alert';

export type OperationalInsight = {
	id: string;
	severity: InsightSeverity;
	messageKey: string;
	count?: number;
};

export function isRealPost(task: Task): boolean {
	return isRealPostFlowTask(task);
}

export function isApprovedNotScheduled(task: Task): boolean {
	return isRealPost(task) && task.statusId === 'aprovado';
}

export function isTaskDone(
	task: Task,
	workflows: Record<string, Workflow>,
	clientWorkflowId: string,
	generalWorkflowId: string,
): boolean {
	const wfId = task.isGeneral ? generalWorkflowId : task.workflowId || clientWorkflowId;
	const status = workflows[wfId]?.statuses?.find((s) => s.id === task.statusId);
	return status?.category === 'done';
}

function hasStructuredFrequency(client: ClientFrequencyInput): boolean {
	return (
		typeof client.postFrequencyQuantity === 'number' &&
		client.postFrequencyQuantity > 0 &&
		(client.postFrequencyPeriod === 'week' || client.postFrequencyPeriod === 'month')
	);
}

function isPlanningItem(task: Task): boolean {
	return !task.isGeneral && !!task.clientId && (!!task.postType || isPostForecast(task));
}

function weekRangeMonday(date = new Date()): { start: string; end: string; weekDays: Date[] } {
	const weekDays = getWeekDaysMondayFirst(date);
	const start = formatDateToYYYYMMDD(weekDays[0]);
	const end = formatDateToYYYYMMDD(weekDays[6]);
	return { start, end, weekDays };
}

export type DashboardInsightsInput = {
	tasks: Task[];
	clients: Client[];
	workflows: Record<string, Workflow>;
	clientWorkflowId: string;
	generalWorkflowId: string;
};

export function computeDashboardOperationalInsights(input: DashboardInsightsInput): OperationalInsight[] {
	const { tasks, clients, workflows, clientWorkflowId, generalWorkflowId } = input;
	const insights: OperationalInsight[] = [];
	const today = formatDateToYYYYMMDD(new Date());
	const { start, end, weekDays } = weekRangeMonday();

	const planningItems = tasks.filter(isPlanningItem);
	const approvedNotScheduled = tasks.filter(isApprovedNotScheduled);

	const clientsWithoutPlanning: string[] = [];
	for (const client of clients) {
		if (!hasStructuredFrequency(client)) {
			clientsWithoutPlanning.push(client.id);
			continue;
		}
		const expected = getExpectedForWeek(client, weekDays);
		if (expected == null || expected <= 0) continue;
		const planned = planningItems.filter(
			(p) =>
				p.clientId === client.id &&
				(p.publishDate ?? p.date) >= start &&
				(p.publishDate ?? p.date) <= end,
		).length;
		if (planned === 0) clientsWithoutPlanning.push(client.id);
	}

	if (clientsWithoutPlanning.length > 0) {
		insights.push({
			id: 'clients_without_planning',
			severity: 'warning',
			messageKey: 'insight_clients_without_planning',
			count: clientsWithoutPlanning.length,
		});
	}

	if (approvedNotScheduled.length > 0) {
		insights.push({
			id: 'approved_not_scheduled',
			severity: 'warning',
			messageKey: 'insight_approved_not_scheduled',
			count: approvedNotScheduled.length,
		});
	}

	let overdue = 0;
	for (const task of tasks) {
		const dayKey = getTaskDisplayDate(task) || task.date;
		if (
			dayKey &&
			dayKey < today &&
			!isTaskDone(task, workflows, clientWorkflowId, generalWorkflowId)
		) {
			overdue += 1;
		}
	}
	if (overdue > 0) {
		insights.push({
			id: 'overdue_tasks',
			severity: 'alert',
			messageKey: 'insight_overdue_tasks',
			count: overdue,
		});
	}

	const nextWeek = new Date();
	nextWeek.setDate(nextWeek.getDate() + 7);
	const nextWeekStr = formatDateToYYYYMMDD(nextWeek);
	let upcoming = 0;
	for (const task of tasks) {
		const dayKey = getTaskDisplayDate(task) || task.date;
		if (
			dayKey &&
			dayKey >= today &&
			dayKey <= nextWeekStr &&
			!isTaskDone(task, workflows, clientWorkflowId, generalWorkflowId)
		) {
			upcoming += 1;
		}
	}
	if (upcoming > 0) {
		insights.push({
			id: 'upcoming_deliveries',
			severity: 'info',
			messageKey: 'insight_upcoming_deliveries',
			count: upcoming,
		});
	}

	const pendencies =
		clientsWithoutPlanning.length + approvedNotScheduled.length + overdue;
	if (pendencies > 0) {
		insights.push({
			id: 'operational_pendencies',
			severity: pendencies >= 5 ? 'alert' : 'warning',
			messageKey: 'insight_operational_pendencies',
			count: pendencies,
		});
	}

	return insights;
}

export type PlanningInsightsClient = ClientFrequencyInput & { id: string };

export type PlanningInsightsInput = {
	clients: PlanningInsightsClient[];
	planningItems: Task[];
	weekDays: Date[];
	startDate: string;
	endDate: string;
};

export function computePlanningOperationalAlerts(input: PlanningInsightsInput): string[] {
	const { clients, planningItems, weekDays, startDate, endDate } = input;
	const tips: string[] = [];

	const inRange = planningItems.filter((p) => {
		const d = p.publishDate ?? p.date ?? '';
		return d >= startDate && d <= endDate;
	});

	let clientsWithGap = 0;
	let hasFrequency = false;

	for (const c of clients) {
		const expected = getExpectedForWeek(c, weekDays);
		if (expected == null || expected <= 0) continue;
		hasFrequency = true;
		const planned = inRange.filter((p) => p.clientId === c.id).length;
		if (planned < expected) clientsWithGap += 1;
	}

	if (hasFrequency && inRange.length === 0) {
		tips.push('planning_alert_empty_week');
	}

	if (clientsWithGap > 0) {
		tips.push('planning_alert_below_frequency');
	}

	const byDay = new Map<string, number>();
	for (const p of inRange) {
		const d = p.publishDate ?? p.date ?? '';
		byDay.set(d, (byDay.get(d) || 0) + 1);
	}
	const maxInDay = byDay.size > 0 ? Math.max(...byDay.values()) : 0;
	if (maxInDay >= 3) {
		tips.push('planning_alert_excess_same_day');
	}

	for (const c of clients) {
		const clientItems = inRange.filter((p) => p.clientId === c.id);
		if (clientItems.length < 3) continue;
		const clientByDay = new Map<string, number>();
		for (const p of clientItems) {
			const d = p.publishDate ?? p.date ?? '';
			clientByDay.set(d, (clientByDay.get(d) || 0) + 1);
		}
		const maxClientDay = Math.max(...clientByDay.values());
		const daysWithPosts = clientByDay.size;
		if (maxClientDay >= 2 && daysWithPosts <= 2) {
			tips.push('planning_alert_excessive_concentration');
			break;
		}
	}

	return tips.slice(0, 5);
}

export type AgendaInsightsView = 'daily' | 'weekly' | 'monthly' | 'list' | 'kanban';

export type AgendaInsightsInput = {
	visibleTasks: Task[];
	view: AgendaInsightsView;
	currentDate: Date;
	workflows: Record<string, Workflow>;
	clientWorkflowId: string;
	generalWorkflowId: string;
	taskOverloadThreshold?: number;
};

export function computeAgendaOperationalInsights(input: AgendaInsightsInput): OperationalInsight[] {
	const {
		visibleTasks,
		view,
		currentDate,
		workflows,
		clientWorkflowId,
		generalWorkflowId,
		taskOverloadThreshold = 5,
	} = input;
	const insights: OperationalInsight[] = [];
	const today = formatDateToYYYYMMDD(new Date());

	const approvedInView = visibleTasks.filter(isApprovedNotScheduled);
	if (approvedInView.length > 0) {
		insights.push({
			id: 'agenda_approved_not_scheduled',
			severity: 'warning',
			messageKey: 'insight_agenda_approved_not_scheduled',
			count: approvedInView.length,
		});
	}

	let dayKeys: string[] = [];
	if (view === 'daily') {
		dayKeys = [formatDateToYYYYMMDD(currentDate)];
	} else if (view === 'weekly' || view === 'list') {
		dayKeys = getWeekDaysMondayFirst(currentDate).map(formatDateToYYYYMMDD);
	} else if (view === 'monthly') {
		dayKeys = getMonthDays(currentDate).map((c) => formatDateToYYYYMMDD(c.date));
	}

	if (dayKeys.length > 0) {
		const tasksByDay = new Map<string, number>();
		const generalByDay = new Map<string, number>();
		for (const key of dayKeys) {
			tasksByDay.set(key, 0);
			generalByDay.set(key, 0);
		}
		for (const task of visibleTasks) {
			const key = getTaskDisplayDate(task) || task.date;
			if (!key || !tasksByDay.has(key)) continue;
			tasksByDay.set(key, (tasksByDay.get(key) || 0) + 1);
			if (task.isGeneral) {
				generalByDay.set(key, (generalByDay.get(key) || 0) + 1);
			}
		}

		const emptyDays = dayKeys.filter((k) => (tasksByDay.get(k) || 0) === 0 && k >= today).length;
		if (emptyDays > 0 && visibleTasks.length > 0) {
			insights.push({
				id: 'agenda_empty_days',
				severity: 'info',
				messageKey: 'insight_agenda_empty_days',
				count: emptyDays,
			});
		}

		let overloadDays = 0;
		for (const count of generalByDay.values()) {
			if (count >= taskOverloadThreshold) overloadDays += 1;
		}
		if (overloadDays > 0) {
			insights.push({
				id: 'agenda_task_overload',
				severity: 'warning',
				messageKey: 'insight_agenda_task_overload',
				count: overloadDays,
			});
		}
	}

	return insights;
}
