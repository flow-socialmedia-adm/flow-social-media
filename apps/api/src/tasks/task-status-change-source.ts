/**
 * Valores padronizados para TaskStatusHistory.changeSource.
 * Manter alinhado com o frontend (PATCH /tasks/:id/status e PUT que altera status).
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

const ALLOWED = new Set<string>(TASK_STATUS_CHANGE_SOURCES);

/** Valores antigos gravados antes da padronização. */
const LEGACY_TO_CANONICAL: Record<string, TaskStatusChangeSource> = {
	patch_status: 'update',
};

/** Normaliza antes de persistir (ex.: PATCH status sem origem → update). */
export function normalizeTaskStatusChangeSourceForStorage(raw: string | null | undefined): TaskStatusChangeSource {
	if (raw == null || raw === '') {
		return 'update';
	}
	const mapped = LEGACY_TO_CANONICAL[raw];
	if (mapped) return mapped;
	if (ALLOWED.has(raw)) {
		return raw as TaskStatusChangeSource;
	}
	return 'update';
}

/** Normaliza na leitura da API (histórico legível pelo cliente). */
export function normalizeTaskStatusChangeSourceForResponse(raw: string | null | undefined): string | null {
	if (raw == null || raw === '') return null;
	const mapped = LEGACY_TO_CANONICAL[raw];
	if (mapped) return mapped;
	if (ALLOWED.has(raw)) return raw;
	return 'update';
}
