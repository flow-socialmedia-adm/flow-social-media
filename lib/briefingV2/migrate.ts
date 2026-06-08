import type { Client } from '../../types';
import type { BriefingV2, BriefingPersona, MarketReference } from './types';
import {
    splitToTags,
    newId,
    parseLeadDays,
    legacyCtaToV2,
    normalizeChannel,
    normalizeResponseTime,
} from './helpers';

type ClientLike = Partial<Client> & Record<string, unknown>;

function buildBrandWho(c: ClientLike): string {
    const parts = [
        c.brandHistory,
        c.businessSummary,
        c.brandGuidelines,
    ].filter((p) => typeof p === 'string' && p.trim());
    if (parts.length > 0) return parts.join('\n\n').trim();
    return (c.brandHistory as string) || (c.businessSummary as string) || '';
}

function buildAudienceMain(c: ClientLike): string {
    const profile = (c.audienceGeneralProfile as string) || (c.targetAudience as string) || '';
    if (profile.trim()) return profile.trim();
    const who = (c.audienceWho as string) || '';
    if (who.trim()) return who.trim();
    const personas = c.strategyPersonas as Client['strategyPersonas'];
    if (Array.isArray(personas) && personas[0]?.description?.trim()) {
        return personas[0].description.trim();
    }
    return '';
}

function migrateMarketReferences(c: ClientLike): MarketReference[] {
    const refs: MarketReference[] = [];
    const competitors = (c.strategyCompetitors as Client['strategyCompetitors']) || [];
    for (const comp of competitors) {
        if (!comp?.name?.trim()) continue;
        refs.push({
            id: comp.id || newId('ref'),
            type: 'competitor',
            name: comp.name.trim(),
            link: comp.link,
            note: comp.notes,
            strengths: comp.strengths,
            weaknesses: comp.weaknesses,
        });
    }
    const inspirations = (c.strategyInspirations as Client['strategyInspirations']) || [];
    for (const insp of inspirations) {
        if (!insp?.name?.trim()) continue;
        refs.push({
            id: insp.id || newId('ref'),
            type: 'inspiration',
            name: insp.name.trim(),
            link: insp.link,
            note: insp.notes,
            whatInspires: insp.whatInspires,
        });
    }
    if (refs.length === 0) {
        const compText = (c.competitors as string) || '';
        if (compText.trim()) {
            compText.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).forEach((name, i) => {
                refs.push({ id: newId(`ref-comp-${i}`), type: 'competitor', name });
            });
        }
    }
    return refs;
}

function migratePersonas(c: ClientLike): BriefingPersona[] {
    const existing = c.strategyPersonas as Client['strategyPersonas'];
    if (!Array.isArray(existing) || existing.length === 0) return [];
    return existing.map((p) => {
        const painsStr = typeof p.pains === 'string' ? p.pains : '';
        const mainPain = painsStr.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)[0] || '';
        return {
            id: p.id || newId('persona'),
            name: p.name || '',
            description: p.description,
            mainPain: mainPain || undefined,
            pains: painsStr ? splitToTags(painsStr) : undefined,
            desires: p.desires ? splitToTags(p.desires) : undefined,
            objections: p.objections ? splitToTags(p.objections) : undefined,
            behavior: p.behavior,
            photoUrl: p.photoUrl,
        };
    });
}

function migratePillarsTags(c: ClientLike): string[] {
    const pillars = c.strategyContentPillars as Client['strategyContentPillars'];
    if (Array.isArray(pillars) && pillars.length > 0) {
        return pillars.map((p) => p.name).filter(Boolean);
    }
    const legacy = c.contentPillars as string[] | undefined;
    if (Array.isArray(legacy) && legacy.length > 0) return legacy.filter(Boolean);
    return [];
}

function migrateFrequency(c: ClientLike): BriefingV2['planning']['frequency'] {
    const variable = Boolean(c.postFrequencyVariable);
    if (variable) {
        return { quantity: undefined, period: undefined, variable: true };
    }
    const qty = c.postFrequencyQuantity as number | undefined;
    const period = c.postFrequencyPeriod as 'week' | 'month' | undefined;
    if (qty != null && qty > 0 && (period === 'week' || period === 'month')) {
        return { quantity: qty, period, variable: false };
    }
    return { quantity: undefined, period: 'week', variable: false };
}

function migrateStrategyNotes(c: ClientLike, brandGuide: Record<string, unknown>): string {
    return (
        (brandGuide.strategyNotes as string) ||
        (c.strategyNotes as string) ||
        (c.notes as string) ||
        ''
    ).trim();
}

/** Migra campos V1 (flat / brandGuide legado) para BriefingV2. */
export function migrateClientToBriefingV2(
    c: ClientLike,
    brandGuide: Record<string, unknown> = {},
): BriefingV2 {
    const brandWho = buildBrandWho(c);
    const audienceMain = buildAudienceMain(c);
    const monthFocus = ((c.monthlyObjective as string) || (c.planningPeriodFocus as string) || '').trim();
    const strategyNotes = migrateStrategyNotes(c, brandGuide);

    const objectionsFromPersona = (() => {
        const personas = c.strategyPersonas as Client['strategyPersonas'];
        if (Array.isArray(personas) && personas[0]?.objections) {
            return splitToTags(personas[0].objections);
        }
        return splitToTags(c.commonObjections as string);
    })();

    const painsFromPersona = (() => {
        const personas = c.strategyPersonas as Client['strategyPersonas'];
        if (Array.isArray(personas) && personas[0]?.pains) {
            return splitToTags(personas[0].pains);
        }
        return splitToTags(c.audiencePains as string);
    })();

    const desiresFromPersona = (() => {
        const personas = c.strategyPersonas as Client['strategyPersonas'];
        if (Array.isArray(personas) && personas[0]?.desires) {
            return splitToTags(personas[0].desires);
        }
        return splitToTags(c.audienceDesires as string);
    })();

    return {
        schemaVersion: 2,
        updatedAt: new Date().toISOString(),
        strategy: {
            brandWho,
            mainServicesTags: splitToTags((c.mainServices as string) || ''),
            differentiators: ((c.differentiators as string) || '').trim(),
            perceivedAs: ((c.howWantToBePerceived as string) || '').trim(),
            marketReferences: migrateMarketReferences(c),
        },
        audience: {
            main: audienceMain,
            painsTags: painsFromPersona,
            desiresTags: desiresFromPersona,
            objectionsTags: objectionsFromPersona,
            personas: migratePersonas(c),
        },
        communication: {
            toneOfVoice: ((c.toneOfVoice as string) || '').trim(),
            brandWordsTags: splitToTags((c.wordsThatFit as string) || ''),
            primaryCta: legacyCtaToV2(c.preferredCta as string),
            avoid: ((c.avoidInCommunication as string) || '').trim(),
        },
        content: {
            profileObjective: ((c.mainProfileObjective as string) || (c.objectives as string) || '').trim(),
            currentCampaignObjective: ((c.momentObjective as string) || '').trim(),
            monthFocus,
            pillarsTags: migratePillarsTags(c),
            strategyNotes,
        },
        planning: {
            frequency: migrateFrequency(c),
            preferredPostDays: Array.isArray(c.preferredPostDays)
                ? (c.preferredPostDays as string[])
                : [],
            operation: {
                productionLeadDays: parseLeadDays(c.planningProductionLeadDays as string),
                approvalLeadDays: parseLeadDays(c.planningApprovalLeadDays as string),
                schedulingLeadDays: parseLeadDays(c.planningSchedulingLeadDays as string),
                approvalRequired: c.planningApprovalRequired as boolean | undefined,
                approvalChannel: normalizeChannel(c.planningApprovalChannel as string) as BriefingV2['planning']['operation']['approvalChannel'],
                clientResponseTime: normalizeResponseTime(c.planningClientResponseTime as string) as BriefingV2['planning']['operation']['clientResponseTime'],
            },
        },
        _internal: {
            brandIdentity: {
                brandWho,
                mission: (c.brandMission as string) || undefined,
                vision: (c.brandVision as string) || undefined,
                values: (c.brandValues as string) || undefined,
                history: (c.brandHistory as string) || undefined,
                businessSummary: (c.businessSummary as string) || undefined,
            },
            audience: {
                ageRange: (c.audienceAgeRange as string) || undefined,
                region: (c.audienceRegion as string) || undefined,
                demographicNotes: (c.audienceGeneralNotes as string) || undefined,
            },
            communication: {
                wordsToAvoidTags: splitToTags((c.wordsThatDontFit as string) || ''),
                contentStyle: (c.contentStyle as string) || undefined,
            },
            content: {
                kpis: (c.kpis as string) || undefined,
                performanceNotes: (c.planningPerformanceNotes as string) || undefined,
                pillarsDetailed: Array.isArray(c.strategyContentPillars)
                    ? (c.strategyContentPillars as Client['strategyContentPillars'])?.map((p) => ({
                          id: p.id,
                          name: p.name,
                          description: p.description,
                          objective: p.objective,
                          exampleThemes: p.exampleThemes,
                      }))
                    : undefined,
            },
            planning: {
                calendarNotes: (c.planningCalendarNotes as string) || undefined,
                operationNotes: (c.planningOperationNotes as string) || undefined,
                accountOwnerLegacy: (c.planningAccountOwner as string) || undefined,
                avgPostsPerWeek: (c.planningAvgPostsPerWeek as string) || undefined,
            },
            meta: {
                migratedFromV1At: new Date().toISOString(),
                migrationVersion: 1,
            },
        },
    };
}

/** Parseia briefingV2 do brandGuideJson com validação mínima. */
export function parseBriefingV2FromBrandGuide(brandGuide: Record<string, unknown>): BriefingV2 | null {
    const raw = brandGuide.briefingV2;
    if (!raw || typeof raw !== 'object') return null;
    const b = raw as BriefingV2;
    if (b.schemaVersion !== 2) return null;
    if (!b.strategy || !b.audience || !b.communication || !b.content || !b.planning) return null;
    return b;
}

/** Resolve briefing: V2 canônico ou migração a partir de V1. */
export function resolveBriefingV2(
    c: ClientLike,
    brandGuide: Record<string, unknown> = {},
): BriefingV2 {
    const existing = parseBriefingV2FromBrandGuide(brandGuide);
    if (existing) return existing;
    return migrateClientToBriefingV2(c, brandGuide);
}
