/**
 * Valores canônicos de changeSource (histórico de status).
 * Manter alinhado com `apps/api/src/tasks/task-status-change-source.ts`.
 */
export const TASK_STATUS_CHANGE_SOURCES = [
	'create',
	'update',
	'kanban_drag',
	'quick_action',
	'post_action',
	'convert_forecast',
	'substatus_change',
	'execution_owner_auto',
] as const;

export type TaskStatusChangeSource = (typeof TASK_STATUS_CHANGE_SOURCES)[number];

/** Constantes para uso em `apiPatch` / payloads — evita strings soltas. */
export const CHANGE_SOURCE = {
	create: 'create',
	update: 'update',
	kanban_drag: 'kanban_drag',
	quick_action: 'quick_action',
	post_action: 'post_action',
	convert_forecast: 'convert_forecast',
	substatus_change: 'substatus_change',
	execution_owner_auto: 'execution_owner_auto',
} as const satisfies Record<string, TaskStatusChangeSource>;
