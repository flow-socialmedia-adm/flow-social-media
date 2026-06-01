/** Acrescentado às respostas de transição de etapa quando aplicável (modo TEAM + post real). */
export type OwnerSuggestionDto = {
	shouldSuggestOwnerChange: boolean;
	suggestedOwnerUserId: string | null;
	currentOwnerUserId: string | null;
	stageKey: string | null;
};
