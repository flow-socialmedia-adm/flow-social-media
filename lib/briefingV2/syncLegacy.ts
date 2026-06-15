import type { Client } from '../../types';
import type { BriefingV2 } from './types';
import { tagsToLegacyText, leadDaysToLegacy, v2CtaToLegacyLabel } from './helpers';
import { buildPostFrequency } from '../utils';
import { normalizePlanningPeriod, normalizePlanningQuantity } from '../planningFrequency';

function coercePlanningQuantity(value: unknown): number | undefined {
	if (value == null) return undefined;
	const n = typeof value === 'number' ? value : typeof value === 'string' ? parseInt(value, 10) : NaN;
	return Number.isFinite(n) && n > 0 ? n : undefined;
}

function canonicalFrequencyFields(freq: BriefingV2['planning']['frequency']) {
	const quantity = freq.variable ? undefined : coercePlanningQuantity(freq.quantity);
	const period = freq.variable ? undefined : normalizePlanningPeriod(freq.period) ?? undefined;
	return { quantity, period };
}

/**
 * Espelha BriefingV2 nos campos LEG V1 (dual-write no save).
 *
 * TODO(Briefing V2 — dívida técnica): separar futuramente `content.strategyNotes` (observações
 * estratégicas do briefing) de `Client.notes` (notas internas do cliente). Hoje ambos são
 * espelhados em `strategyNotes` / `notes` por compatibilidade — ver ClientsPage.tsx.
 */
export function syncLegacyBrandGuideFields(
    briefing: BriefingV2,
    prevInternal?: BriefingV2['_internal'],
): Record<string, unknown> {
    const internal = briefing._internal ?? prevInternal ?? {};
    const competitors = briefing.strategy.marketReferences.filter((r) => r.type === 'competitor');
    const inspirations = briefing.strategy.marketReferences.filter((r) => r.type === 'inspiration');

    const strategyPersonas = briefing.audience.personas.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        pains: p.mainPain || (p.pains?.length ? p.pains.join(', ') : undefined),
        desires: p.desires?.length ? p.desires.join(', ') : undefined,
        objections: p.objections?.length ? p.objections.join(', ') : undefined,
        behavior: p.behavior,
        photoUrl: p.photoUrl,
    }));

    const freq = briefing.planning.frequency;
    const { quantity: freqQty, period: freqPeriod } = canonicalFrequencyFields(freq);
    const postFrequency = freq.variable
        ? ''
        : freqQty && freqPeriod
          ? buildPostFrequency(freqQty, freqPeriod)
          : '';

    const strategyContentPillars = (internal.content?.pillarsDetailed?.length
        ? internal.content.pillarsDetailed
        : briefing.content.pillarsTags.map((name, i) => ({
              id: `pillar-${i}`,
              name,
          }))) as Client['strategyContentPillars'];

    return {
        toneOfVoice: briefing.communication.toneOfVoice || null,
        brandHistory: internal.brandIdentity?.history || briefing.strategy.brandWho || null,
        brandValues: internal.brandIdentity?.values || null,
        brandMission: internal.brandIdentity?.mission || null,
        brandVision: internal.brandIdentity?.vision || null,
        strategyCompetitors: competitors.length > 0
            ? competitors.map((r) => ({
                  id: r.id,
                  name: r.name,
                  link: r.link,
                  strengths: r.strengths,
                  weaknesses: r.weaknesses,
                  notes: r.note,
              }))
            : null,
        strategyInspirations: inspirations.length > 0
            ? inspirations.map((r) => ({
                  id: r.id,
                  name: r.name,
                  link: r.link,
                  whatInspires: r.whatInspires,
                  notes: r.note,
              }))
            : null,
        competitors: competitors.length > 0 ? competitors.map((r) => r.name).join('\n') : null,
        audienceAgeRange: internal.audience?.ageRange || null,
        audienceRegion: internal.audience?.region || null,
        audienceGeneralProfile: briefing.audience.main || null,
        audienceGeneralNotes: internal.audience?.demographicNotes || null,
        strategyPersonas: strategyPersonas.length > 0 ? strategyPersonas : null,
        audienceWho: briefing.audience.main || null,
        audiencePains: briefing.audience.painsTags.length > 0 ? tagsToLegacyText(briefing.audience.painsTags) : null,
        audienceDesires: briefing.audience.desiresTags.length > 0 ? tagsToLegacyText(briefing.audience.desiresTags) : null,
        commonObjections: briefing.audience.objectionsTags.length > 0 ? tagsToLegacyText(briefing.audience.objectionsTags) : null,
        objectives: briefing.content.profileObjective || null,
        kpis: internal.content?.kpis || null,
        strategyNotes: briefing.content.strategyNotes || null,
        businessSummary: internal.brandIdentity?.businessSummary || null,
        mainServices: briefing.strategy.mainServicesTags.length > 0 ? tagsToLegacyText(briefing.strategy.mainServicesTags) : null,
        differentiators: briefing.strategy.differentiators || null,
        howWantToBePerceived: briefing.strategy.perceivedAs || null,
        avoidInCommunication: briefing.communication.avoid || null,
        wordsThatFit: briefing.communication.brandWordsTags.length > 0 ? tagsToLegacyText(briefing.communication.brandWordsTags) : null,
        wordsThatDontFit: internal.communication?.wordsToAvoidTags?.length
            ? tagsToLegacyText(internal.communication.wordsToAvoidTags)
            : null,
        contentStyle: internal.communication?.contentStyle || null,
        preferredCta: v2CtaToLegacyLabel(briefing.communication.primaryCta) || null,
        mainProfileObjective: briefing.content.profileObjective || null,
        momentObjective: briefing.content.currentCampaignObjective || null,
        monthlyObjective: briefing.content.monthFocus || null,
        postFrequency: postFrequency || null,
        postFrequencyQuantity: freq.variable ? null : (freqQty ?? null),
        postFrequencyPeriod: freq.variable ? null : (freqPeriod ?? null),
        postFrequencyVariable: freq.variable ?? null,
        preferredPostDays: briefing.planning.preferredPostDays.length > 0 ? briefing.planning.preferredPostDays : null,
        planningCalendarNotes: internal.planning?.calendarNotes || null,
        planningAvgPostsPerWeek: internal.planning?.avgPostsPerWeek || null,
        planningProductionLeadDays: leadDaysToLegacy(briefing.planning.operation.productionLeadDays) || null,
        planningApprovalLeadDays: leadDaysToLegacy(briefing.planning.operation.approvalLeadDays) || null,
        planningSchedulingLeadDays: leadDaysToLegacy(briefing.planning.operation.schedulingLeadDays) || null,
        planningApprovalRequired: briefing.planning.operation.approvalRequired ?? null,
        planningPeriodFocus: briefing.content.monthFocus || null,
        planningPerformanceNotes: internal.content?.performanceNotes || null,
        planningAccountOwner: internal.planning?.accountOwnerLegacy || null,
        planningApprovalChannel: briefing.planning.operation.approvalChannel || null,
        planningClientResponseTime: briefing.planning.operation.clientResponseTime || null,
        planningOperationNotes: internal.planning?.operationNotes || null,
        strategyContentPillars: strategyContentPillars && strategyContentPillars.length > 0 ? strategyContentPillars : null,
        strategyLastUpdated: new Date().toISOString(),
        briefingV2: {
            ...briefing,
            updatedAt: new Date().toISOString(),
        },
    };
}

/** Projeta BriefingV2 nos campos flat do Client (dual-read para downstream). */
export function applyBriefingToClientFlat(briefing: BriefingV2): Partial<Client> {
    const legacy = syncLegacyBrandGuideFields(briefing);
    const freq = briefing.planning.frequency;
    const { quantity: freqQty, period: freqPeriod } = canonicalFrequencyFields(freq);
    const briefingCanonical: BriefingV2 = {
        ...briefing,
        planning: {
            ...briefing.planning,
            frequency: freq.variable
                ? { variable: true }
                : {
                      quantity: freqQty,
                      period: freqPeriod,
                      variable: false,
                  },
        },
    };

    return {
        briefingV2: briefingCanonical,
        toneOfVoice: briefing.communication.toneOfVoice,
        brandHistory: (legacy.brandHistory as string) || '',
        brandValues: (legacy.brandValues as string) || '',
        brandMission: (legacy.brandMission as string) || '',
        brandVision: (legacy.brandVision as string) || '',
        strategyCompetitors: (legacy.strategyCompetitors as Client['strategyCompetitors']) || [],
        strategyInspirations: (legacy.strategyInspirations as Client['strategyInspirations']) || [],
        competitors: (legacy.competitors as string) || '',
        audienceAgeRange: (legacy.audienceAgeRange as string) || '',
        audienceRegion: (legacy.audienceRegion as string) || '',
        audienceGeneralProfile: briefing.audience.main,
        audienceGeneralNotes: (legacy.audienceGeneralNotes as string) || '',
        strategyPersonas: (legacy.strategyPersonas as Client['strategyPersonas']) || [],
        audienceWho: briefing.audience.main,
        audiencePains: (legacy.audiencePains as string) || '',
        audienceDesires: (legacy.audienceDesires as string) || '',
        commonObjections: (legacy.commonObjections as string) || '',
        objectives: briefing.content.profileObjective,
        kpis: (legacy.kpis as string) || '',
        strategyNotes: briefing.content.strategyNotes,
        businessSummary: (legacy.businessSummary as string) || '',
        mainServices: (legacy.mainServices as string) || '',
        differentiators: briefing.strategy.differentiators,
        howWantToBePerceived: briefing.strategy.perceivedAs,
        avoidInCommunication: briefing.communication.avoid,
        wordsThatFit: (legacy.wordsThatFit as string) || '',
        wordsThatDontFit: (legacy.wordsThatDontFit as string) || '',
        contentStyle: (legacy.contentStyle as string) || '',
        preferredCta: (legacy.preferredCta as string) || '',
        mainProfileObjective: briefing.content.profileObjective,
        momentObjective: briefing.content.currentCampaignObjective,
        monthlyObjective: briefing.content.monthFocus,
		postFrequency: (legacy.postFrequency as string) || '',
		postFrequencyQuantity: freq.variable ? undefined : freqQty,
		postFrequencyPeriod: freq.variable ? undefined : freqPeriod,
        postFrequencyVariable: freq.variable,
        preferredPostDays: briefing.planning.preferredPostDays,
        planningCalendarNotes: (legacy.planningCalendarNotes as string) || '',
        planningAvgPostsPerWeek: (legacy.planningAvgPostsPerWeek as string) || '',
        planningProductionLeadDays: (legacy.planningProductionLeadDays as string) || '',
        planningApprovalLeadDays: (legacy.planningApprovalLeadDays as string) || '',
        planningSchedulingLeadDays: (legacy.planningSchedulingLeadDays as string) || '',
        planningApprovalRequired: briefing.planning.operation.approvalRequired,
        planningPeriodFocus: briefing.content.monthFocus,
        planningPerformanceNotes: (legacy.planningPerformanceNotes as string) || '',
        planningAccountOwner: (legacy.planningAccountOwner as string) || '',
        planningApprovalChannel: briefing.planning.operation.approvalChannel as string,
        planningClientResponseTime: briefing.planning.operation.clientResponseTime as string,
        planningOperationNotes: (legacy.planningOperationNotes as string) || '',
        strategyContentPillars: (legacy.strategyContentPillars as Client['strategyContentPillars']) || [],
        strategyLastUpdated: (legacy.strategyLastUpdated as string) || '',
        targetAudience: briefing.audience.main,
    };
}
