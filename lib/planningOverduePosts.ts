import type { Client, Task, Workflow } from '../types';
import { getTaskOperationalMilestones, type OperationalMilestoneKind } from './operationalMilestones';
import { isRealPost, isTaskDone } from './operationalInsights';
import { getTaskPlanningDate } from './planningSchedule';
import { POST_FLOW_STATUS_ORDER } from './taskActionFlow';
import { formatDateToYYYYMMDD } from './utils';

const STATUS_ORDER_INDEX: Record<string, number> = Object.fromEntries(
	POST_FLOW_STATUS_ORDER.map((id, i) => [id, i]),
);

const MILESTONE_REQUIRED_INDEX: Record<OperationalMilestoneKind, number> = {
	production: STATUS_ORDER_INDEX.em_producao,
	approval: STATUS_ORDER_INDEX.aguardando_aprovacao,
	scheduling: STATUS_ORDER_INDEX.agendado,
};

function statusIndex(statusId: string | undefined): number {
	if (!statusId) return -1;
	return STATUS_ORDER_INDEX[statusId] ?? -1;
}

/**
 * Post real com etapa operacional atrasada.
 * Reutiliza regra existente (data publicação &lt; hoje + não concluído)
 * e marcos operacionais (produção/aprovação/agendamento) vencidos.
 */
export function isPostOperationallyOverdue(
	task: Task,
	client: Client,
	workflows: Record<string, Workflow>,
	clientWorkflowId: string,
	generalWorkflowId: string,
	today: string = formatDateToYYYYMMDD(new Date()),
): boolean {
	if (!isRealPost(task)) return false;
	if (isTaskDone(task, workflows, clientWorkflowId, generalWorkflowId)) return false;

	const publishDate = getTaskPlanningDate(task);
	if (!publishDate) return false;

	if (publishDate < today) return true;

	const currentIdx = statusIndex(task.statusId);
	for (const milestone of getTaskOperationalMilestones(task, client)) {
		if (milestone.date >= today) continue;
		const requiredIdx = MILESTONE_REQUIRED_INDEX[milestone.kind];
		if (currentIdx < requiredIdx) return true;
	}

	return false;
}

/** Posts reais do cliente no mês visível com atraso operacional. */
export function countClientMonthlyOverduePosts(
	client: Client,
	items: Task[],
	monthAnchor: Date,
	workflows: Record<string, Workflow>,
	clientWorkflowId: string,
	generalWorkflowId: string,
): number {
	const year = monthAnchor.getFullYear();
	const month = monthAnchor.getMonth();
	const monthStart = formatDateToYYYYMMDD(new Date(year, month, 1));
	const monthEnd = formatDateToYYYYMMDD(new Date(year, month + 1, 0));
	const today = formatDateToYYYYMMDD(new Date());

	let count = 0;
	for (const task of items) {
		if (task.clientId !== client.id) continue;
		if (!isRealPost(task)) continue;
		const dateNorm = getTaskPlanningDate(task);
		if (!dateNorm || dateNorm < monthStart || dateNorm > monthEnd) continue;
		if (isPostOperationallyOverdue(task, client, workflows, clientWorkflowId, generalWorkflowId, today)) {
			count++;
		}
	}
	return count;
}
