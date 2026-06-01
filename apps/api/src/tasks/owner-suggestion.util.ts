import type { ClientStageKey } from '../clients/client-owner.constants';
import type { OwnerSuggestionDto } from './owner-suggestion.dto';

/**
 * Monta payload de sugestão só quando faz sentido expor ao cliente (sem persistir troca).
 */
export function buildOwnerSuggestionPayload(
	stageKey: ClientStageKey | null,
	currentOwnerUserId: string | null | undefined,
	suggestedOwnerUserId: string | null,
): OwnerSuggestionDto | undefined {
	const current = currentOwnerUserId ?? null;
	if (!stageKey) {
		return undefined;
	}
	if (suggestedOwnerUserId == null || suggestedOwnerUserId === current) {
		return undefined;
	}
	return {
		shouldSuggestOwnerChange: true,
		suggestedOwnerUserId,
		currentOwnerUserId: current,
		stageKey,
	};
}
