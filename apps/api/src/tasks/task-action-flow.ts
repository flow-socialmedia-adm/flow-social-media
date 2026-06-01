/**
 * Definição espelhada de lib/taskActionFlow.ts (apenas statusId + actionId).
 * Manter alinhado ao fluxo linear do frontend.
 */
export type ApiLinearStep = { statusId: string; actionId: string | null };

export const POST_CLIENT_LINEAR: ApiLinearStep[] = [
	{ statusId: 'pauta_criada', actionId: 'criando_pauta' },
	{ statusId: 'em_producao', actionId: 'criando_legenda' },
	{ statusId: 'em_producao', actionId: 'criando_arte' },
	{ statusId: 'em_producao', actionId: 'editando_video' },
	{ statusId: 'aguardando_aprovacao', actionId: 'enviado_aprovacao' },
	{ statusId: 'aguardando_aprovacao', actionId: 'aguardando_devolutiva' },
	{ statusId: 'aguardando_aprovacao', actionId: 'em_alteracao' },
	{ statusId: 'aprovado', actionId: null },
	{ statusId: 'agendado', actionId: 'agendando' },
	{ statusId: 'agendado', actionId: 'agendado_final' },
	{ statusId: 'publicado', actionId: 'publicado_final' },
];

/** Tarefas gerais: só macro (3 colunas); `currentActionId` fica null. */
export const GENERAL_TASK_LINEAR: ApiLinearStep[] = [
	{ statusId: 'a_fazer', actionId: null },
	{ statusId: 'em_andamento', actionId: null },
	{ statusId: 'concluido', actionId: null },
];

export function defaultActionIdForPostStatus(statusId: string): string | null {
	const s = POST_CLIENT_LINEAR.find((x) => x.statusId === statusId);
	return s ? s.actionId : null;
}

export function defaultActionIdForGeneralStatus(statusId: string): string | null {
	const s = GENERAL_TASK_LINEAR.find((x) => x.statusId === statusId);
	return s ? s.actionId : null;
}

/** Alinhado a isRealPostFlowTask / tarefa geral no frontend (sem postType e não previsão). */
export function resolveDefaultActionId(task: {
	clientId: string | null;
	postType: string | null;
	category: string | null;
}, newStatusId: string): string | null {
	const isForecast = task.category === 'forecast';
	const isRealPost = !!task.clientId && !!task.postType && !isForecast;
	if (isRealPost) return defaultActionIdForPostStatus(newStatusId);
	const isGeneralLike = !task.postType && !isForecast;
	if (isGeneralLike) return defaultActionIdForGeneralStatus(newStatusId);
	return null;
}
