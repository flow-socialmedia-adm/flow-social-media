import type { Client } from '../types';
import type { BriefingV2 } from './briefingV2/types';
import { applyBriefingToClientFlat } from './briefingV2/syncLegacy';
import {
	mergePartialBriefingFrequency,
	normalizePlanningPeriod,
	normalizePlanningQuantity,
	resolvePlanningFrequency,
	type PlanningFrequency,
} from './planningFrequency';
import { parsePostFrequencyStructured } from './utils';

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
	const flatFreq = extractFlatFrequency(client);

	const canonical = rawGuideFreq ?? rawClientFreq ?? flatFreq;
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

/** Lê frequência dos campos flat/legado do cliente. */
export function extractFlatFrequency(client: Pick<Client, 'postFrequency' | 'postFrequencyQuantity' | 'postFrequencyPeriod' | 'postFrequencyVariable'>): PlanningFrequency | null {
	if (client.postFrequencyVariable) return null;
	const flatQty = normalizePlanningQuantity(client.postFrequencyQuantity);
	const flatPeriod = normalizePlanningPeriod(client.postFrequencyPeriod);
	if (flatQty != null && flatPeriod != null) {
		return { quantity: flatQty, period: flatPeriod };
	}
	const parsed = parsePostFrequencyStructured(client.postFrequency);
	if (!parsed) return null;
	const parsedPeriod = normalizePlanningPeriod(parsed.period);
	if (parsedPeriod == null) return null;
	return { quantity: parsed.quantity, period: parsedPeriod };
}

export function formatFrequencyLabel(freq: PlanningFrequency | null): string {
	if (!freq) return '—';
	return `${freq.quantity}/${freq.period}`;
}

export type ClientFrequencyInspectionRow = {
	clientId: string;
	clientName: string;
	briefingFrequency: string;
	flatFrequency: string;
	resolvedFrequency: string;
	needsCorrection: boolean;
};

/** Linha de inspeção para reconciliação briefingV2 × flat. */
export function inspectClientFrequency(
	client: Client,
	brandGuide: Record<string, unknown> = {},
): ClientFrequencyInspectionRow {
	const briefingRaw = extractRawBriefingV2Frequency(brandGuide) ?? extractRawBriefingV2Frequency({ briefingV2: client.briefingV2 });
	const flatRaw = extractFlatFrequency(client);
	const resolved = resolvePlanningFrequency(client);

	const briefingStr = formatFrequencyLabel(briefingRaw);
	const flatStr = formatFrequencyLabel(flatRaw);
	const resolvedStr = formatFrequencyLabel(resolved);

	const needsCorrection =
		hasConflictingFrequencyFields(client) ||
		(briefingRaw != null &&
			resolved != null &&
			(briefingRaw.quantity !== resolved.quantity || briefingRaw.period !== resolved.period)) ||
		(flatRaw != null &&
			briefingRaw == null &&
			resolved != null &&
			(flatRaw.quantity !== resolved.quantity || flatRaw.period !== resolved.period));

	return {
		clientId: client.id,
		clientName: client.name,
		briefingFrequency: briefingStr,
		flatFrequency: flatStr,
		resolvedFrequency: resolvedStr,
		needsCorrection,
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
