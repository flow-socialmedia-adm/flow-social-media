import type { Client, PostType } from '../types';
import { getExpectedForWeek, type ClientFrequencyInput } from './utils';

export type ClientPlanningProfile = ClientFrequencyInput & {
	id: string;
	name: string;
	hasStructuredFrequency: boolean;
	expectedPerWeek: number | null;
	pillarNames: string[];
	preferredPostDays: string[];
	planningPeriodFocus?: string;
	contentStyle?: string;
};

export function clientHasStructuredFrequency(client: ClientFrequencyInput): boolean {
	return (
		typeof client.postFrequencyQuantity === 'number' &&
		client.postFrequencyQuantity > 0 &&
		(client.postFrequencyPeriod === 'week' || client.postFrequencyPeriod === 'month')
	);
}

/** Perfil operacional do cliente (Estratégia + Planejamento já salvos no cadastro). */
export function getClientPlanningProfile(client: Client, weekDays: Date[]): ClientPlanningProfile {
	return {
		id: client.id,
		name: client.name,
		postFrequency: client.postFrequency,
		postFrequencyQuantity: client.postFrequencyQuantity,
		postFrequencyPeriod: client.postFrequencyPeriod,
		postFrequencyVariable: client.postFrequencyVariable,
		hasStructuredFrequency: clientHasStructuredFrequency(client),
		expectedPerWeek: getExpectedForWeek(client, weekDays),
		pillarNames: (client.strategyContentPillars ?? []).map((p) => p.name).filter(Boolean),
		preferredPostDays: client.preferredPostDays ?? [],
		planningPeriodFocus: client.planningPeriodFocus,
		contentStyle: client.contentStyle,
	};
}

export type PostCreationHints = {
	pillarNames: string[];
	contentStyle?: string;
	suggestedPostType?: PostType;
	hintMessageKey?: string;
};

/** Sugestões leves ao criar post (sem alterar fluxo de salvamento). */
export function getPostCreationHints(client: Client | undefined): PostCreationHints {
	if (!client) {
		return { pillarNames: [] };
	}
	const pillarNames = (client.strategyContentPillars ?? []).map((p) => p.name).filter(Boolean);
	const style = (client.contentStyle ?? '').toLowerCase();
	let suggestedPostType: PostType | undefined;
	if (/vídeo|video|reels/i.test(style)) suggestedPostType = 'reels';
	else if (/carrossel|carousel/i.test(style)) suggestedPostType = 'carousel';
	else if (/story|stories/i.test(style)) suggestedPostType = 'story';

	return {
		pillarNames,
		contentStyle: client.contentStyle,
		suggestedPostType,
		hintMessageKey: pillarNames.length > 0 ? 'client_hint_pillars' : undefined,
	};
}
