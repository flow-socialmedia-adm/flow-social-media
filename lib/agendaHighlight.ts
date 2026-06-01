import type { Task, Workflow } from '../types';
import { formatDateToYYYYMMDD, getTaskDisplayDate } from './utils';
import type { IntelligenceItem } from './intelligentCentral';
import { isApprovedNotScheduled, isTaskDone } from './operationalInsights';

export type AgendaHighlightKind =
	| 'overdue_client'
	| 'approved_client'
	| 'overload_day'
	| 'orphan_tasks';

export type AgendaHighlight = {
	kind: AgendaHighlightKind;
	clientId?: string;
	dayKey?: string;
	/** Conjunto de IDs de clientes ativos — task é órfã se `clientId` NÃO estiver aqui. */
	knownClientIds?: ReadonlySet<string>;
};

export type AgendaCardHighlightState = 'focused' | 'dimmed' | 'normal';

/** Mapeia ação da Central Inteligente → modo destaque (sem alterar filtros da Agenda). */
/** Insights informativos sem destaque na grade (ex.: pendências fora do período visível). */
export function intelligenceItemAllowsAgendaHighlight(item: IntelligenceItem): boolean {
	if (item.id === 'agenda-outside-period-overdue') return false;
	return !!item.actionLabelKey;
}

export function resolveAgendaHighlightFromIntel(
	item: IntelligenceItem,
	context?: { knownClientIds?: ReadonlySet<string> },
): AgendaHighlight | null {
	if (!intelligenceItemAllowsAgendaHighlight(item)) return null;
	if (
		item.clientId &&
		(item.actionLabelKey === 'intel_action_schedule_posts' || item.messageKey.includes('approved'))
	) {
		return { kind: 'approved_client', clientId: item.clientId };
	}
	if (item.clientId && item.actionLabelKey === 'intel_action_open_agenda') {
		return { kind: 'overdue_client', clientId: item.clientId };
	}
	if (item.actionLabelKey === 'intel_action_review_tasks' && item.messageParams?.date) {
		return { kind: 'overload_day', dayKey: String(item.messageParams.date) };
	}
	if (item.actionLabelKey === 'intel_action_review_orphan_tasks') {
		return { kind: 'orphan_tasks', knownClientIds: context?.knownClientIds };
	}
	return null;
}

export function getAgendaHighlightRingClass(kind: AgendaHighlightKind): string {
	switch (kind) {
		case 'approved_client':
			return 'ring-indigo-400';
		case 'overload_day':
			return 'ring-purple-400';
		case 'orphan_tasks':
			return 'ring-rose-400';
		case 'overdue_client':
		default:
			return 'ring-amber-400';
	}
}

export function taskMatchesAgendaHighlight(
	task: Task,
	highlight: AgendaHighlight,
	workflows: Record<string, Workflow>,
	clientWorkflowId: string,
	generalWorkflowId: string,
): boolean {
	const today = formatDateToYYYYMMDD(new Date());
	const dayKey = getTaskDisplayDate(task) || task.date || '';

	switch (highlight.kind) {
		case 'approved_client':
			return !!highlight.clientId && task.clientId === highlight.clientId && isApprovedNotScheduled(task);
		case 'overdue_client':
			if (!highlight.clientId || task.clientId !== highlight.clientId) return false;
			return (
				!!dayKey &&
				dayKey < today &&
				!isTaskDone(task, workflows, clientWorkflowId, generalWorkflowId)
			);
		case 'overload_day':
			return task.isGeneral && !!highlight.dayKey && dayKey === highlight.dayKey;
		case 'orphan_tasks': {
			if (!task.clientId) return false;
			if (!highlight.knownClientIds || highlight.knownClientIds.size === 0) return false;
			return !highlight.knownClientIds.has(task.clientId);
		}
		default:
			return false;
	}
}

export function getAgendaCardHighlightState(
	task: Task,
	highlight: AgendaHighlight | null,
	workflows: Record<string, Workflow>,
	clientWorkflowId: string,
	generalWorkflowId: string,
): AgendaCardHighlightState {
	if (!highlight) return 'normal';
	return taskMatchesAgendaHighlight(task, highlight, workflows, clientWorkflowId, generalWorkflowId)
		? 'focused'
		: 'dimmed';
}

export function parseYmdToLocalDate(ymd: string): Date | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd.trim());
	if (!m) return null;
	const y = Number(m[1]);
	const mo = Number(m[2]);
	const d = Number(m[3]);
	if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
	return new Date(y, mo - 1, d);
}
