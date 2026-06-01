import { apiGet } from './api';
import type { TaskStatusChangeSource } from './taskStatusChangeSource';

export type { TaskStatusChangeSource };

/** Metadados gravados pelo backend em eventos especiais (ex.: execution owner automático). */
export type TaskStatusHistoryDetailJson = Record<string, unknown> | null;

export type TaskStatusHistoryUserDto = {
	id: string;
	fullName: string;
	email: string;
	avatarUrl: string | null;
};

export type TaskStatusHistoryStatusDto = {
	id: string;
	nameKey: string;
};

export type TaskStatusHistoryItemDto = {
	id: string;
	taskId: string;
	statusId: string;
	/** Sub-etapa neste evento; omitido em APIs antigas; null = só macro ou legado. */
	currentActionId?: string | null;
	changedAt: string;
	userId: string | null;
	changeSource: TaskStatusChangeSource | null;
	detailJson?: TaskStatusHistoryDetailJson;
	status: TaskStatusHistoryStatusDto | null;
	user: TaskStatusHistoryUserDto | null;
};

export type TaskStatusHistoryResponseDto = {
	taskId: string;
	workflowId: string;
	items: TaskStatusHistoryItemDto[];
};

export async function fetchTaskStatusHistory(taskId: string): Promise<TaskStatusHistoryResponseDto> {
	return apiGet<TaskStatusHistoryResponseDto>(`/tasks/${encodeURIComponent(taskId)}/status-history`);
}
