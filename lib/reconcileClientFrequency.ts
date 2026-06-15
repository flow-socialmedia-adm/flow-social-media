import type { Client } from '../types';
import type { BriefingV2 } from './briefingV2/types';
import { applyBriefingToClientFlat } from './briefingV2/syncLegacy';
import {
	mergePartialBriefingFrequency,
	normalizePlanningPeriod,
	normalizePlanningQuantity,
	type PlanningFrequency,
} from './planningFrequency';

/** Parseia brandGuideJson quando vier como string da API. */
export function parseBrandGuideJson(raw: unknown): Record<string, unknown> {
	if (!raw) return {};
	if (typeof raw === 'string') {
		try {
			const parsed = JSON.parse(raw) as unknown;
			return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
		} catch {
			return {};
		}
	}
	return typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

/** Lê frequência crua de brandGuide.briefingV2 sem exigir briefing completo. */
export function extractRawBriefingV2Frequency(brandGuide: Record<string, unknown>): PlanningFrequency | null {
	const raw = brandGuide.briefingV2;
	if (!raw || typeof raw !== 'object') return null;
	const planning = (raw as BriefingV2).planning;
	const freq = planning?.frequency;
	if (!freq || freq.variable) return null;
	const quantity = normalizePlanningQuantity(freq.quantity);
	const period = normalizePlanningPeriod(freq.period);
	if (quantity == null || period == null) return null;
	return { quantity, period };
}

/** Briefing V2 preenchido vence campos legados — retorna patch do Client. */
export function reconcileClientFrequencyFields(
	client: Client,
	brandGuide: Record<string, unknown> = {},
): Partial<Client> {
	const rawGuideFreq = extractRawBriefingV2Frequency(brandGuide);
	const rawClientFreq = extractRawBriefingV2Frequency({
		briefingV2: client.briefingV2,
	});

	const canonical = rawGuideFreq ?? rawClientFreq;
	if (!canonical) return {};

	const baseBriefing = client.briefingV2;
	if (!baseBriefing) return applyBriefingToClientFlat(buildMinimalBriefingWithFrequency(canonical));

	const merged = mergePartialBriefingFrequency(
		{
			...baseBriefing,
			planning: {
				...baseBriefing.planning,
				frequency: { quantity: canonical.quantity, period: canonical.period, variable: false },
			},
		},
		baseBriefing,
	);
	return applyBriefingToClientFlat(merged);
}

function buildMinimalBriefingWithFrequency(freq: PlanningFrequency): BriefingV2 {
	return {
		schemaVersion: 2,
		updatedAt: new Date().toISOString(),
		strategy: { brandWho: '', mainServicesTags: [], differentiators: '', perceivedAs: '', marketReferences: [] },
		audience: { main: '', painsTags: [], desiresTags: [], objectionsTags: [], personas: [] },
		communication: { toneOfVoice: '', brandWordsTags: [], primaryCta: '', avoid: '' },
		content: { profileObjective: '', currentCampaignObjective: '', monthFocus: '', pillarsTags: [], strategyNotes: '' },
		planning: {
			frequency: { quantity: freq.quantity, period: freq.period, variable: false },
			preferredPostDays: [],
			operation: { approvalChannel: '', clientResponseTime: '' },
		},
	};
}

/** Detecta conflito entre briefingV2 e campos flat legados. */
export function hasConflictingFrequencyFields(client: Client): boolean {
	const fromBriefing = extractRawBriefingV2Frequency({ briefingV2: client.briefingV2 });
	if (!fromBriefing) return false;
	const flatQty = normalizePlanningQuantity(client.postFrequencyQuantity);
	const flatPeriod = normalizePlanningPeriod(client.postFrequencyPeriod);
	if (flatQty == null || flatPeriod == null) return false;
	return flatQty !== fromBriefing.quantity || flatPeriod !== fromBriefing.period;
}
