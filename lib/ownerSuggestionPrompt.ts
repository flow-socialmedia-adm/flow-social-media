import { apiPut } from './api';
import type { TaskOwnerSuggestion } from '../types';

export type TaskTransitionResponse = { ownerSuggestion?: TaskOwnerSuggestion } & Record<string, unknown>;

/** Dependências para modal de confirmação (sem APIs nativas). */
export type OwnerTransitionPromptDeps = {
	showConfirmation: (options: {
		title: string;
		message: string;
		onConfirm?: () => void;
		onCancel?: () => void;
	}) => void;
	t: (key: string, replacements?: Record<string, string>) => string;
};

/**
 * Após PATCH/PUT de transição: se o backend sugerir outro responsável, pergunta e aplica PUT só com ownerUserId.
 * Não altera status/substatus já persistidos.
 */
export async function maybePromptOwnerChangeAfterTransition(
	taskId: string,
	responseBody: TaskTransitionResponse,
	resolveMemberName: (userId: string) => string,
	deps: OwnerTransitionPromptDeps,
): Promise<boolean> {
	const s = responseBody.ownerSuggestion;
	if (!s?.shouldSuggestOwnerChange || !s.suggestedOwnerUserId) {
		return false;
	}
	const name = resolveMemberName(s.suggestedOwnerUserId);
	const { showConfirmation, t } = deps;
	const ok = await new Promise<boolean>((resolve) => {
		showConfirmation({
			title: t('confirm'),
			message: t('owner_suggestion_change_message', { name }),
			onConfirm: () => resolve(true),
			onCancel: () => resolve(false),
		});
	});
	if (!ok) {
		return false;
	}
	await apiPut(`/tasks/${taskId}`, { ownerUserId: s.suggestedOwnerUserId });
	return true;
}
