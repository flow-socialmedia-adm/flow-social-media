import type { Client, Task, Workflow } from '../types';
import {
	formatDateToYYYYMMDD,
	getExpectedForWeek,
	getTaskDisplayDate,
	getWeekDaysMondayFirst,
} from './utils';
import { isPostForecast } from './postForecastVisual';
import { getClientPlanningProfile, type ClientPlanningProfile } from './clientContext';
import {
	isApprovedNotScheduled,
	isRealPost,
	isTaskDone,
} from './operationalInsights';
import {
	getAgendaPeriodContextKey,
	getAgendaPeriodDayKeys,
	isTaskDayInPeriod,
	type AgendaPeriodView,
} from './intelligencePeriod';

export type IntelligenceSeverity = 'info' | 'warning' | 'alert';

export type IntelligenceItem = {
	id: string;
	clientId?: string;
	clientName: string;
	messageKey: string;
	messageParams?: Record<string, string | number>;
	actionLabelKey?: string;
	severity: IntelligenceSeverity;
	/** Linha de contexto opcional (período visível, visão global, etc.). */
	contextKey?: string;
};

/** Indica se a contagem global do backend foi usada (vs. fallback local). */
function usedGlobalCount(globalValue: number | undefined): boolean {
	return typeof globalValue === 'number' && Number.isFinite(globalValue) && globalValue >= 0;
}

type PlanningClientRow = ClientPlanningProfile;

const UUID_LIKE_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Escolhe o valor global quando ele veio do backend (é número finito ≥ 0); caso contrário usa o local.
 * Centraliza a regra "global tem precedência" para que insights tenham comportamento previsível.
 */
function pickGlobalOrLocal(globalValue: number | undefined, localValue: number): number {
	if (typeof globalValue === 'number' && Number.isFinite(globalValue) && globalValue >= 0) {
		return globalValue;
	}
	return localValue;
}

/** Mapa unificado id → nome (contexto global + lista da API, ex. clientsForSelect na Agenda). */
export function buildIntelligenceClientNameMap(
	clients: Pick<Client, 'id' | 'name'>[],
	clientNamesById?: ReadonlyMap<string, string> | Iterable<readonly [string, string]>,
): Map<string, string> {
	const map = new Map<string, string>();
	for (const c of clients) {
		const name = c.name?.trim();
		if (c.id && name) map.set(c.id, name);
	}
	if (clientNamesById) {
		for (const [id, name] of clientNamesById) {
			const trimmed = name?.trim();
			if (id && trimmed) map.set(id, trimmed);
		}
	}
	return map;
}

export function buildPlanningIntelligenceItems(input: {
	clients: PlanningClientRow[];
	planningItems: Task[];
	weekDays: Date[];
	startDate: string;
	endDate: string;
	monthHasFiveWeeks?: boolean;
	monthHasSixWeeks?: boolean;
	/** Contexto exibido abaixo da origem (ex.: período do calendário editorial). */
	contextKey?: string;
}): IntelligenceItem[] {
	const {
		clients,
		planningItems,
		weekDays,
		startDate,
		endDate,
		monthHasFiveWeeks,
		monthHasSixWeeks,
		contextKey,
	} = input;
	const items: IntelligenceItem[] = [];
	const withContext = (item: IntelligenceItem): IntelligenceItem =>
		contextKey ? { ...item, contextKey } : item;

	const inRange = planningItems.filter((p) => {
		const d = p.publishDate ?? p.date ?? '';
		return d >= startDate && d <= endDate;
	});

	if (monthHasSixWeeks) {
		items.push(
			withContext({
				id: 'month-six-weeks',
				clientName: '__agency__',
				messageKey: 'intel_month_six_weeks',
				severity: 'info',
				actionLabelKey: 'intel_action_review_planning',
			}),
		);
	} else if (monthHasFiveWeeks) {
		items.push(
			withContext({
				id: 'month-five-weeks',
				clientName: '__agency__',
				messageKey: 'intel_month_five_weeks',
				severity: 'info',
				actionLabelKey: 'intel_action_review_planning',
			}),
		);
	}

	for (const client of clients) {
		if (!client.name?.trim()) continue; // defensivo: cliente sem nome resolvido não vira insight
		const clientItems = inRange.filter((p) => p.clientId === client.id);
		const planned = clientItems.length;

		if (!client.hasStructuredFrequency) {
			items.push(
				withContext({
					id: `no-frequency-${client.id}`,
					clientId: client.id,
					clientName: client.name,
					messageKey: 'intel_client_no_frequency',
					severity: 'warning',
					actionLabelKey: 'intel_action_define_frequency',
				}),
			);
			continue;
		}

		const expected = client.expectedPerWeek ?? getExpectedForWeek(client, weekDays);
		if (expected != null && expected > 0 && planned === 0) {
			items.push(
				withContext({
					id: `empty-week-${client.id}`,
					clientId: client.id,
					clientName: client.name,
					messageKey: 'intel_client_empty_week',
					severity: 'warning',
					actionLabelKey: 'intel_action_add_posts',
				}),
			);
		} else if (expected != null && planned < expected) {
			items.push(
				withContext({
					id: `below-frequency-${client.id}`,
					clientId: client.id,
					clientName: client.name,
					messageKey: 'intel_client_below_frequency',
					messageParams: { planned, expected: Math.ceil(expected) },
					severity: 'warning',
					actionLabelKey: 'intel_action_balance_week',
				}),
			);
		}

		if (clientItems.length >= 3) {
			const byDay = new Map<string, number>();
			for (const p of clientItems) {
				const d = p.publishDate ?? p.date ?? '';
				byDay.set(d, (byDay.get(d) || 0) + 1);
			}
			const maxInDay = Math.max(...byDay.values());
			const daysWithPosts = byDay.size;
			if (maxInDay >= 3) {
				items.push(
					withContext({
						id: `excess-day-${client.id}`,
						clientId: client.id,
						clientName: client.name,
						messageKey: 'intel_client_excess_same_day',
						messageParams: { count: maxInDay },
						severity: 'warning',
						actionLabelKey: 'intel_action_spread_posts',
					}),
				);
			} else if (maxInDay >= 2 && daysWithPosts <= 2 && clientItems.length >= 3) {
				items.push(
					withContext({
						id: `concentration-${client.id}`,
						clientId: client.id,
						clientName: client.name,
						messageKey: 'intel_client_concentration',
						messageParams: { count: clientItems.length, days: daysWithPosts },
						severity: 'warning',
						actionLabelKey: 'intel_action_spread_posts',
					}),
				);
			}
		}
	}

	return items.slice(0, 12);
}

export function buildAgendaIntelligenceItems(input: {
	visibleTasks: Task[];
	clients: Client[];
	/** Nomes carregados à parte (ex.: GET /clients na Agenda quando context.clients está vazio). */
	clientNamesById?: ReadonlyMap<string, string> | Iterable<readonly [string, string]>;
	workflows: Record<string, Workflow>;
	clientWorkflowId: string;
	generalWorkflowId: string;
	view: AgendaPeriodView;
	currentDate: Date;
}): IntelligenceItem[] {
	const {
		visibleTasks,
		clients,
		clientNamesById,
		workflows,
		clientWorkflowId,
		generalWorkflowId,
		view,
		currentDate,
	} = input;
	const items: IntelligenceItem[] = [];
	const clientNameById = buildIntelligenceClientNameMap(clients, clientNamesById);
	const today = formatDateToYYYYMMDD(new Date());
	const periodKeys = getAgendaPeriodDayKeys(view, currentDate);
	const periodContextKey = getAgendaPeriodContextKey(view);
	const hasPeriod = periodKeys.size > 0;

	const isOverdueActive = (t: Task) => {
		const dayKey = getTaskDisplayDate(t) || t.date;
		return (
			!!dayKey &&
			dayKey < today &&
			!isTaskDone(t, workflows, clientWorkflowId, generalWorkflowId)
		);
	};

	const byClient = new Map<string, Task[]>();
	for (const task of visibleTasks) {
		if (!task.clientId) continue;
		if (!byClient.has(task.clientId)) byClient.set(task.clientId, []);
		byClient.get(task.clientId)!.push(task);
	}

	const clientsKnown = clientNameById.size > 0;
	let orphanTaskCount = 0;
	const orphanClientIds = new Set<string>();

	for (const [clientId, clientTasks] of byClient) {
		const resolvedName = clientNameById.get(clientId);
		if (clientsKnown && !resolvedName) {
			orphanTaskCount += clientTasks.length;
			orphanClientIds.add(clientId);
			continue;
		}
		const name = resolvedName ?? clientId;
		const inPeriod =
			hasPeriod
				? clientTasks.filter((t) => isTaskDayInPeriod(t, periodKeys))
				: clientTasks;

		const approved = inPeriod.filter(isApprovedNotScheduled);
		if (approved.length > 0) {
			items.push({
				id: `agenda-approved-${clientId}`,
				clientId,
				clientName: name,
				messageKey: 'intel_agenda_client_approved_pending',
				messageParams: { count: approved.length },
				severity: 'warning',
				actionLabelKey: 'intel_action_schedule_posts',
				contextKey: periodContextKey,
			});
		}

		const overdue = inPeriod.filter(isOverdueActive);
		if (overdue.length > 0) {
			items.push({
				id: `agenda-overdue-${clientId}`,
				clientId,
				clientName: name,
				messageKey: 'intel_agenda_client_overdue',
				messageParams: { count: overdue.length },
				severity: 'alert',
				actionLabelKey: 'intel_action_open_agenda',
				contextKey: periodContextKey,
			});
		}
	}

	if (orphanTaskCount > 0) {
		const orphanInPeriod = hasPeriod
			? visibleTasks.filter(
					(t) =>
						t.clientId &&
						!clientNameById.has(t.clientId) &&
						isTaskDayInPeriod(t, periodKeys),
			  ).length
			: orphanTaskCount;
		if (orphanInPeriod > 0) {
			items.push({
				id: 'agenda-orphan-tasks',
				clientName: '__agency__',
				messageKey: 'intel_agenda_orphan_tasks',
				messageParams: { tasks: orphanInPeriod, clients: orphanClientIds.size },
				severity: 'warning',
				actionLabelKey: 'intel_action_review_orphan_tasks',
				contextKey: periodContextKey,
			});
		}
	}

	if (hasPeriod) {
		const generalByDay = new Map<string, number>();
		for (const key of periodKeys) generalByDay.set(key, 0);
		for (const task of visibleTasks) {
			if (!task.isGeneral) continue;
			const key = getTaskDisplayDate(task) || task.date;
			if (!key || !generalByDay.has(key)) continue;
			generalByDay.set(key, (generalByDay.get(key) || 0) + 1);
		}
		for (const [day, count] of generalByDay) {
			if (count >= 5) {
				items.push({
					id: `agenda-overload-${day}`,
					clientName: '__agency__',
					messageKey: 'intel_agenda_task_overload_day',
					messageParams: { count, date: day },
					severity: 'warning',
					actionLabelKey: 'intel_action_review_tasks',
					contextKey: periodContextKey,
				});
				break;
			}
		}

		let outsidePeriodOverdue = 0;
		for (const task of visibleTasks) {
			if (!isOverdueActive(task)) continue;
			if (isTaskDayInPeriod(task, periodKeys)) continue;
			outsidePeriodOverdue += 1;
		}
		if (outsidePeriodOverdue > 0) {
			items.push({
				id: 'agenda-outside-period-overdue',
				clientName: '__agency__',
				messageKey: 'intel_agenda_outside_period_overdue',
				messageParams: { count: outsidePeriodOverdue },
				severity: 'info',
				contextKey: 'intel_context_agenda_outside_period',
			});
		}
	}

	return items.slice(0, 10);
}

/**
 * Contagens agregadas vindas do backend para insights globais de Posts.
 * Quando presentes, têm precedência sobre o cálculo derivado das tasks em memória.
 */
export type PostsGlobalCounts = {
	overdueCount?: number;
	approvedPendingCount?: number;
	unassignedActiveCount?: number;
	staleProductionCount?: number;
};

/** Insights da página Posts (Kanban) — usa apenas tasks e workflows já disponíveis no cliente. */
export function buildPostsIntelligenceItems(input: {
	tasks: Task[];
	clients: Client[];
	clientNamesById?: ReadonlyMap<string, string> | Iterable<readonly [string, string]>;
	workflows: Record<string, Workflow>;
	clientWorkflowId: string;
	generalWorkflowId: string;
	isTeamMode: boolean;
	/** Limite (dias) para considerar um post "preso em produção". Default 14. */
	staleProductionDays?: number;
	/** Contagens globais (GET /tasks/summary?clientWorkflowId=...). Fallback: cálculo local. */
	globalCounts?: PostsGlobalCounts;
}): IntelligenceItem[] {
	const {
		tasks,
		clients,
		clientNamesById,
		workflows,
		clientWorkflowId,
		generalWorkflowId,
		isTeamMode,
		staleProductionDays = 14,
		globalCounts,
	} = input;
	const items: IntelligenceItem[] = [];
	const clientNameById = buildIntelligenceClientNameMap(clients, clientNamesById);
	const clientsKnown = clientNameById.size > 0;
	const today = formatDateToYYYYMMDD(new Date());
	const staleDate = (() => {
		const d = new Date();
		d.setDate(d.getDate() - staleProductionDays);
		return formatDateToYYYYMMDD(d);
	})();

	const posts = tasks.filter(isRealPost);

	const approvedLocal = posts.filter(isApprovedNotScheduled).length;
	const approvedGlobalUsed = usedGlobalCount(globalCounts?.approvedPendingCount);
	const approvedCount = pickGlobalOrLocal(globalCounts?.approvedPendingCount, approvedLocal);
	if (approvedCount > 0) {
		items.push({
			id: 'posts-approved-pending',
			clientName: '__agency__',
			messageKey: approvedGlobalUsed
				? 'intel_posts_approved_pending_global'
				: 'intel_posts_approved_pending_local',
			messageParams: { count: approvedCount },
			severity: 'warning',
			actionLabelKey: 'intel_action_schedule_posts',
			contextKey: approvedGlobalUsed
				? 'intel_context_agency_global'
				: 'intel_context_posts_loaded',
		});
	}

	const overdueLocal = posts.filter((p) => {
		const dayKey = getTaskDisplayDate(p) || p.date;
		return (
			dayKey && dayKey < today && !isTaskDone(p, workflows, clientWorkflowId, generalWorkflowId)
		);
	}).length;
	const overdueGlobalUsed = usedGlobalCount(globalCounts?.overdueCount);
	const overdueCount = pickGlobalOrLocal(globalCounts?.overdueCount, overdueLocal);
	if (overdueCount > 0) {
		items.push({
			id: 'posts-overdue',
			clientName: '__agency__',
			messageKey: overdueGlobalUsed ? 'intel_posts_overdue_global' : 'intel_posts_overdue_local',
			messageParams: { count: overdueCount },
			severity: 'alert',
			actionLabelKey: 'intel_action_review_posts',
			contextKey: overdueGlobalUsed
				? 'intel_context_agency_global'
				: 'intel_context_posts_loaded',
		});
	}

	const orphanPosts = posts.filter((p) => !p.clientId);
	if (orphanPosts.length > 0) {
		items.push({
			id: 'posts-without-client',
			clientName: '__agency__',
			messageKey: 'intel_posts_without_client',
			messageParams: { count: orphanPosts.length },
			severity: 'warning',
			actionLabelKey: 'intel_action_review_posts',
		});
	}

	if (isTeamMode) {
		const ownerlessLocal = posts.filter(
			(p) =>
				!p.ownerUserId &&
				!isTaskDone(p, workflows, clientWorkflowId, generalWorkflowId),
		).length;
		const ownerlessGlobalUsed = usedGlobalCount(globalCounts?.unassignedActiveCount);
		const ownerlessCount = pickGlobalOrLocal(
			globalCounts?.unassignedActiveCount,
			ownerlessLocal,
		);
		if (ownerlessCount > 0) {
			items.push({
				id: 'posts-without-owner',
				clientName: '__agency__',
				messageKey: ownerlessGlobalUsed
					? 'intel_posts_without_owner_global'
					: 'intel_posts_without_owner_local',
				messageParams: { count: ownerlessCount },
				severity: 'warning',
				actionLabelKey: 'intel_action_assign_owner',
				contextKey: ownerlessGlobalUsed
					? 'intel_context_agency_global'
					: 'intel_context_posts_loaded',
			});
		}
	}

	const staleLocal = posts.filter((p) => {
		if (p.statusId !== 'em_producao') return false;
		const dayKey = p.publishDate || p.date;
		return !!dayKey && dayKey < staleDate;
	}).length;
	const staleGlobalUsed = usedGlobalCount(globalCounts?.staleProductionCount);
	const staleCount = pickGlobalOrLocal(globalCounts?.staleProductionCount, staleLocal);
	if (staleCount > 0) {
		items.push({
			id: 'posts-stale-production',
			clientName: '__agency__',
			messageKey: staleGlobalUsed
				? 'intel_posts_stale_production_global'
				: 'intel_posts_stale_production_local',
			messageParams: { count: staleCount, days: staleProductionDays },
			severity: 'info',
			actionLabelKey: 'intel_action_review_posts',
			contextKey: staleGlobalUsed
				? 'intel_context_agency_global'
				: 'intel_context_posts_loaded',
		});
	}

	// Tarefas órfãs (clientes excluídos)
	if (clientsKnown) {
		const orphanByClient = new Set<string>();
		let orphanTaskCount = 0;
		for (const p of posts) {
			if (!p.clientId) continue;
			if (!clientNameById.has(p.clientId)) {
				orphanByClient.add(p.clientId);
				orphanTaskCount += 1;
			}
		}
		if (orphanTaskCount > 0) {
			items.push({
				id: 'posts-orphan',
				clientName: '__agency__',
				messageKey: 'intel_posts_orphan',
				messageParams: { tasks: orphanTaskCount, clients: orphanByClient.size },
				severity: 'warning',
				actionLabelKey: 'intel_action_review_orphan_tasks',
			});
		}
	}

	return items.slice(0, 8);
}

/**
 * Contagens agregadas vindas do backend para insights globais de Tarefas.
 * Quando presentes, têm precedência sobre o cálculo derivado das tasks em memória.
 * Quando ausentes (endpoint indisponível ou ainda não carregado), o builder cai para
 * o cálculo local — mantendo o comportamento anterior como fallback seguro.
 */
export type TasksGlobalCounts = {
	overdueCount?: number;
	unassignedActiveCount?: number;
	wipCount?: number;
};

/** Insights da página Tarefas (gerais) — atrasos, sem responsável, sobrecarga, recentes concluídas. */
export function buildTasksIntelligenceItems(input: {
	tasks: Task[];
	clients: Client[];
	clientNamesById?: ReadonlyMap<string, string> | Iterable<readonly [string, string]>;
	workflows: Record<string, Workflow>;
	generalWorkflowId: string;
	isTeamMode: boolean;
	/** Limite de tarefas "em andamento" a partir do qual mostrar alerta. Default 8. */
	wipThreshold?: number;
	/** Janela em dias para "concluídas recentes". Default 7. */
	recentDoneDays?: number;
	/** Contagens globais (vindas de GET /tasks/summary). Quando definidas, substituem o cálculo local. */
	globalCounts?: TasksGlobalCounts;
}): IntelligenceItem[] {
	const {
		tasks,
		clients,
		clientNamesById,
		workflows,
		generalWorkflowId,
		isTeamMode,
		wipThreshold = 8,
		recentDoneDays = 7,
		globalCounts,
	} = input;
	const items: IntelligenceItem[] = [];
	const clientNameById = buildIntelligenceClientNameMap(clients, clientNamesById);
	const clientsKnown = clientNameById.size > 0;
	const today = formatDateToYYYYMMDD(new Date());
	const recentDate = (() => {
		const d = new Date();
		d.setDate(d.getDate() - recentDoneDays);
		return formatDateToYYYYMMDD(d);
	})();

	const generalTasks = tasks.filter((t) => t.isGeneral);
	const workflow = workflows[generalWorkflowId];
	const doneIds = new Set(
		(workflow?.statuses || []).filter((s) => s.category === 'done').map((s) => s.id),
	);
	const inProgressIds = new Set(
		(workflow?.statuses || [])
			.filter((s) => s.category !== 'done' && s.category !== 'todo')
			.map((s) => s.id),
	);

	const overdueLocal = generalTasks.filter((t) => {
		const due = t.dueDate || t.date;
		return !!due && due < today && !doneIds.has(t.statusId);
	}).length;
	const overdueGlobalUsed = usedGlobalCount(globalCounts?.overdueCount);
	const overdueCount = pickGlobalOrLocal(globalCounts?.overdueCount, overdueLocal);
	if (overdueCount > 0) {
		items.push({
			id: 'tasks-overdue',
			clientName: '__agency__',
			messageKey: overdueGlobalUsed ? 'intel_tasks_overdue_global' : 'intel_tasks_overdue_local',
			messageParams: { count: overdueCount },
			severity: 'alert',
			actionLabelKey: 'intel_action_review_tasks',
			contextKey: overdueGlobalUsed
				? 'intel_context_agency_global'
				: 'intel_context_tasks_loaded',
		});
	}

	if (isTeamMode) {
		const ownerlessLocal = generalTasks.filter(
			(t) => !t.ownerUserId && !doneIds.has(t.statusId),
		).length;
		const ownerlessGlobalUsed = usedGlobalCount(globalCounts?.unassignedActiveCount);
		const ownerlessCount = pickGlobalOrLocal(globalCounts?.unassignedActiveCount, ownerlessLocal);
		if (ownerlessCount > 0) {
			items.push({
				id: 'tasks-without-owner',
				clientName: '__agency__',
				messageKey: ownerlessGlobalUsed
					? 'intel_tasks_without_owner_global'
					: 'intel_tasks_without_owner_local',
				messageParams: { count: ownerlessCount },
				severity: 'warning',
				actionLabelKey: 'intel_action_assign_owner',
				contextKey: ownerlessGlobalUsed
					? 'intel_context_agency_global'
					: 'intel_context_tasks_loaded',
			});
		}
	}

	const noClient = generalTasks.filter(
		(t) => !t.clientId && t.category && t.category !== 'Operacional' && !doneIds.has(t.statusId),
	);
	if (noClient.length > 0) {
		items.push({
			id: 'tasks-without-client',
			clientName: '__agency__',
			messageKey: 'intel_tasks_without_client',
			messageParams: { count: noClient.length },
			severity: 'info',
			actionLabelKey: 'intel_action_review_tasks',
		});
	}

	const wipLocal = generalTasks.filter((t) => inProgressIds.has(t.statusId)).length;
	const wipGlobalUsed = usedGlobalCount(globalCounts?.wipCount);
	const wipCount = pickGlobalOrLocal(globalCounts?.wipCount, wipLocal);
	if (wipCount > wipThreshold) {
		items.push({
			id: 'tasks-wip-overload',
			clientName: '__agency__',
			messageKey: wipGlobalUsed
				? 'intel_tasks_wip_overload_global'
				: 'intel_tasks_wip_overload_local',
			messageParams: { count: wipCount, threshold: wipThreshold },
			severity: 'warning',
			actionLabelKey: 'intel_action_review_tasks',
			contextKey: wipGlobalUsed
				? 'intel_context_agency_global'
				: 'intel_context_tasks_loaded',
		});
	}

	const recentDone = generalTasks.filter((t) => {
		if (!doneIds.has(t.statusId)) return false;
		const dayKey = t.dueDate || t.date;
		return !!dayKey && dayKey >= recentDate && dayKey <= today;
	});
	if (recentDone.length > 0) {
		items.push({
			id: 'tasks-recent-done',
			clientName: '__agency__',
			messageKey: 'intel_tasks_recent_done',
			messageParams: { count: recentDone.length, days: recentDoneDays },
			severity: 'info',
			contextKey: 'intel_context_tasks_recent_metric',
		});
	}

	if (clientsKnown) {
		const orphanByClient = new Set<string>();
		let orphanCount = 0;
		for (const t of generalTasks) {
			if (!t.clientId) continue;
			if (!clientNameById.has(t.clientId)) {
				orphanByClient.add(t.clientId);
				orphanCount += 1;
			}
		}
		if (orphanCount > 0) {
			items.push({
				id: 'tasks-orphan',
				clientName: '__agency__',
				messageKey: 'intel_tasks_orphan',
				messageParams: { tasks: orphanCount, clients: orphanByClient.size },
				severity: 'warning',
				actionLabelKey: 'intel_action_review_orphan_tasks',
			});
		}
	}

	return items.slice(0, 8);
}

export function buildDashboardIntelligenceItems(input: {
	tasks: Task[];
	clients: Client[];
	workflows: Record<string, Workflow>;
	clientWorkflowId: string;
	generalWorkflowId: string;
}): IntelligenceItem[] {
	const weekDays = getWeekDaysMondayFirst();
	const profiles = input.clients.map((c) => getClientPlanningProfile(c, weekDays));
	const planningItems = input.tasks.filter(
		(t) => !t.isGeneral && t.clientId && (t.postType || isPostForecast(t)),
	);
	const { start, end } = (() => {
		const start = formatDateToYYYYMMDD(weekDays[0]);
		const end = formatDateToYYYYMMDD(weekDays[6]);
		return { start, end };
	})();

	return buildPlanningIntelligenceItems({
		clients: profiles,
		planningItems,
		weekDays,
		startDate: start,
		endDate: end,
		contextKey: 'intel_context_agency_global',
	}).slice(0, 8);
}

export function resolveIntelligenceClientLabel(
	clientName: string,
	t: (key: string) => string,
): string {
	if (clientName === '__agency__') return t('intel_scope_agency');
	if (UUID_LIKE_RE.test(clientName)) return t('planning_client_unknown');
	return clientName;
}
