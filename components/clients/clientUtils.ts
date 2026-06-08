import type { Client, SocialLink } from '../../types';
import { parseClientOwnerPreferencesFromApi } from '../../lib/client-owner-preferences';
import { applyBriefingToClientFlat } from '../../lib/briefingV2/syncLegacy';
import { resolveBriefingV2 } from '../../lib/briefingV2/migrate';

/**
 * Guardrail: Merge de clientes preservando campos essenciais.
 * Evita perda de dados quando um patch é parcial (ex: não inclui avatarUrl).
 *
 * Uso: quando precisar atualizar clients[] com dados potencialmente parciais.
 */
export const mergeClientsPreserveEssentials = (
    prevClients: Client[],
    nextClients: Partial<Client>[]
): Client[] => {
    const prevMap = new Map(prevClients.map(c => [c.id, c]));
    const essentialFields: (keyof Client)[] = [
        'avatarUrl', 'contract', 'brandAssets', 'brandColors',
        'socialLinks', 'accessCredentials', 'typography', 'address', 'ownerPreferences'
    ];

    return nextClients.map(next => {
        const prev = prevMap.get(next.id || '');
        if (!prev) {
            return next as Client;
        }

        const merged: Client = { ...prev, ...next } as Client;

        for (const field of essentialFields) {
            const nextVal = next[field];
            const prevVal = prev[field];
            if (nextVal === undefined && prevVal !== undefined) {
                (merged as Record<string, unknown>)[field] = prevVal;
            }
        }

        return merged;
    });
};

export const normalizeClient = (c: Record<string, unknown>): Client => {
    const brandGuide = (c.brandGuideJson || {}) as Record<string, unknown>;
    const address = (c.addressJson || c.address || {}) as Record<string, unknown>;
    const rawContract = (c.contractJson ?? c.contract ?? {}) as Record<string, unknown>;
    const contract = {
        ...(typeof rawContract === 'object' && rawContract !== null ? rawContract : {}),
        services: Array.isArray((rawContract as Record<string, unknown>)?.services)
            ? (rawContract as Record<string, unknown>).services
            : [],
    };
    const rawSocialLinks = (c.socialLinksJson || c.socialLinks || []) as SocialLink[];
    const socialLinks = (() => {
        const seen = new Set<string>();
        return rawSocialLinks.filter((l: SocialLink) => {
            const key = `${l.platform}::${l.url || ''}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    })();
    const rawCreds = Array.isArray(c.accessCredentials) ? c.accessCredentials
        : (Array.isArray(c.accessCredentialsJson) ? c.accessCredentialsJson : []) as Array<{ platform?: string; username?: string; id?: string }>;
    const accessCredentials = (() => {
        const seen = new Set<string>();
        return rawCreds.filter((ac: { platform?: string; username?: string; id?: string }) => {
            const p = ac.platform;
            if (!p) return false;
            const key = ac.id || `${p}::${ac.username || ''}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    })();

    const baseClient: Client = {
        id: (c.id as string) || '',
        name: (c.name as string) || '',
        color: (c.color as string) || 'bg-slate-600',
        avatarUrl: (c.avatarUrl as string) || '',
        createdAt: (c.createdAt as string) || new Date().toISOString(),
        currency: (c.currency || 'BRL') as Client['currency'],
        clientType: (c.type || c.clientType || 'individual') as Client['clientType'],
        website: (c.website as string) || '',
        companyName: (c.companyName as string) || '',
        cnpj: (c.cnpj as string) || '',
        companyStateRegistration: ((c.companyStateRegistration ?? (brandGuide as Record<string, unknown>).companyStateRegistration) as string) ?? '',
        companyLandlinePhone: ((c.companyLandlinePhone ?? (brandGuide as Record<string, unknown>).companyLandlinePhone) as string) ?? '',
        companyPhone: ((c.companyPhone ?? (brandGuide as Record<string, unknown>).companyPhone) as string) ?? '',
        cpf: (c.cpf as string) || '',
        legalRepresentativeName: (c.legalRepresentativeName as string) || '',
        legalRepresentativeRg: ((c.legalRepresentativeRg ?? (brandGuide as Record<string, unknown>).legalRepresentativeRg) as string) ?? '',
        legalRepresentativeEmail: ((c.legalRepresentativeEmail ?? (brandGuide as Record<string, unknown>).legalRepresentativeEmail) as string) ?? '',
        legalRepresentativeWhatsapp: ((c.legalRepresentativeWhatsapp ?? (brandGuide as Record<string, unknown>).legalRepresentativeWhatsapp) as string) ?? '',
        legalRepresentativeRole: ((c.legalRepresentativeRole ?? (brandGuide as Record<string, unknown>).legalRepresentativeRole) as string) ?? '',
        legalRepresentativeBirthDate: ((c.legalRepresentativeBirthDate ?? (brandGuide as Record<string, unknown>).legalRepresentativeBirthDate) as string) ?? '',
        isLegalAddressSameAsCompany: (c.isLegalAddressSameAsCompany as boolean) || false,
        address: address as Client['address'],
        legalRepresentativeAddress: (c.legalRepresentativeAddress || {}) as Client['legalRepresentativeAddress'],
        contacts: ((c.contacts || c.contactsJson || []) as Array<Record<string, unknown>>).map((ct: Record<string, unknown>) => ({
            id: ct.id, name: ct.name, role: ct.role, email: ct.email,
            whatsapp: ct.whatsapp, landlinePhone: ct.landlinePhone,
            notes: ct.notes, isPrimary: ct.isPrimary
        })) as Client['contacts'],
        socialLinks,
        accessCredentials: accessCredentials as Client['accessCredentials'],
        brandColors: (brandGuide.brandColors || c.brandColors || []) as Client['brandColors'],
        headerColorIndex: (brandGuide.headerColorIndex ?? c.headerColorIndex ?? null) as number | null,
        principalLogoIndex: (() => {
            const fromGuide = brandGuide.principalLogoIndex ?? c.principalLogoIndex;
            if (fromGuide != null) return fromGuide as number | null;
            const assets = (brandGuide.brandAssets || c.brandAssets || []) as Client['brandAssets'];
            const avatar = (c.avatarUrl as string) || '';
            if (!avatar) return null;
            const logos = assets.filter((a: { type?: string }) => a.type === 'logo');
            const idx = logos.findIndex((a: { url?: string }) => (a.url || '') === avatar);
            return idx >= 0 ? idx : null;
        })(),
        typography: (brandGuide.typography || c.typography || {}) as Client['typography'],
        brandAssets: (brandGuide.brandAssets || c.brandAssets || []) as Client['brandAssets'],
        toneOfVoice: (brandGuide.toneOfVoice || c.toneOfVoice || '') as string,
        brandGuidelines: (brandGuide.brandGuidelines || c.brandGuidelines || '') as string,
        brandHistory: ((brandGuide.brandHistory ?? c.brandHistory ?? brandGuide.brandGuidelines ?? c.brandGuidelines) as string) || '',
        brandValues: ((brandGuide.brandValues ?? c.brandValues) as string) || '',
        brandMission: ((brandGuide.brandMission ?? c.brandMission) as string) || '',
        brandVision: ((brandGuide.brandVision ?? c.brandVision) as string) || '',
        strategyCompetitors: (() => {
            const existing = brandGuide.strategyCompetitors ?? c.strategyCompetitors;
            if (Array.isArray(existing) && existing.length > 0) return existing as Client['strategyCompetitors'];
            const compText = (brandGuide.competitors ?? c.competitors ?? '') as string;
            if (!compText?.trim()) return [];
            const lines = compText.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
            return lines.map((name, i) => ({ id: `comp-${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`, name, link: undefined, strengths: undefined, weaknesses: undefined, notes: undefined }));
        })(),
        strategyInspirations: (Array.isArray(brandGuide.strategyInspirations ?? c.strategyInspirations) ? (brandGuide.strategyInspirations ?? c.strategyInspirations) : []) as Client['strategyInspirations'],
        audienceAgeRange: ((brandGuide.audienceAgeRange ?? c.audienceAgeRange) as string) || '',
        audienceRegion: ((brandGuide.audienceRegion ?? c.audienceRegion) as string) || '',
        audienceGeneralProfile: ((brandGuide.audienceGeneralProfile ?? c.audienceGeneralProfile) as string) || '',
        audienceGeneralNotes: ((brandGuide.audienceGeneralNotes ?? c.audienceGeneralNotes) as string) || '',
        strategyPersonas: (() => {
            const existing = brandGuide.strategyPersonas ?? c.strategyPersonas;
            if (Array.isArray(existing) && existing.length > 0) return existing as Client['strategyPersonas'];
            const who = ((brandGuide.audienceWho ?? c.audienceWho) as string) || '';
            const pains = ((brandGuide.audiencePains ?? c.audiencePains) as string) || '';
            const desires = ((brandGuide.audienceDesires ?? c.audienceDesires) as string) || '';
            const objections = ((brandGuide.commonObjections ?? c.commonObjections) as string) || '';
            if (!who.trim() && !pains.trim() && !desires.trim()) return [];
            return [{
                id: `persona-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                name: 'Público principal',
                description: who || undefined,
                pains: pains || undefined,
                desires: desires || undefined,
                objections: objections || undefined,
                behavior: undefined,
            }];
        })(),
        targetAudience: (c.targetAudience as string) || '',
        audienceWho: ((brandGuide.audienceWho ?? c.audienceWho) as string) || '',
        audiencePains: ((brandGuide.audiencePains ?? c.audiencePains) as string) || '',
        audienceDesires: ((brandGuide.audienceDesires ?? c.audienceDesires) as string) || '',
        objectives: ((brandGuide.objectives ?? c.objectives) as string) || '',
        kpis: ((brandGuide.kpis ?? c.kpis) as string) || '',
        strategyNotes: (c.notes || c.strategyNotes || (brandGuide.strategyNotes as string) || '') as string,
        dos: (c.dos || []) as string[],
        donts: (c.donts || []) as string[],
        businessSummary: (brandGuide.businessSummary ?? c.businessSummary ?? '') as string,
        mainServices: (brandGuide.mainServices ?? c.mainServices ?? '') as string,
        differentiators: (brandGuide.differentiators ?? c.differentiators ?? '') as string,
        competitors: (brandGuide.competitors ?? c.competitors ?? '') as string,
        howWantToBePerceived: (brandGuide.howWantToBePerceived ?? c.howWantToBePerceived ?? '') as string,
        avoidInCommunication: (brandGuide.avoidInCommunication ?? c.avoidInCommunication ?? '') as string,
        commonObjections: (brandGuide.commonObjections ?? c.commonObjections ?? '') as string,
        wordsThatFit: (brandGuide.wordsThatFit ?? c.wordsThatFit ?? '') as string,
        wordsThatDontFit: (brandGuide.wordsThatDontFit ?? c.wordsThatDontFit ?? '') as string,
        contentStyle: (brandGuide.contentStyle ?? c.contentStyle ?? '') as string,
        preferredCta: (brandGuide.preferredCta ?? c.preferredCta ?? '') as string,
        mainProfileObjective: (brandGuide.mainProfileObjective ?? c.mainProfileObjective ?? '') as string,
        momentObjective: (brandGuide.momentObjective ?? c.momentObjective ?? '') as string,
        monthlyObjective: (brandGuide.monthlyObjective ?? c.monthlyObjective ?? '') as string,
        postFrequency: (brandGuide.postFrequency ?? c.postFrequency ?? '') as string,
        postFrequencyQuantity: (brandGuide.postFrequencyQuantity ?? c.postFrequencyQuantity) as number | undefined,
        postFrequencyPeriod: (brandGuide.postFrequencyPeriod ?? c.postFrequencyPeriod) as 'week' | 'month' | undefined,
        postFrequencyVariable: Boolean(brandGuide.postFrequencyVariable ?? c.postFrequencyVariable),
        preferredPostDays: Array.isArray(brandGuide.preferredPostDays ?? c.preferredPostDays)
            ? (brandGuide.preferredPostDays ?? c.preferredPostDays) as string[]
            : [],
        planningCalendarNotes: ((brandGuide.planningCalendarNotes ?? c.planningCalendarNotes) as string) || '',
        planningAvgPostsPerWeek: ((brandGuide.planningAvgPostsPerWeek ?? c.planningAvgPostsPerWeek) as string) || '',
        planningProductionLeadDays: ((brandGuide.planningProductionLeadDays ?? c.planningProductionLeadDays) as string) || '',
        planningApprovalLeadDays: ((brandGuide.planningApprovalLeadDays ?? c.planningApprovalLeadDays) as string) || '',
        planningSchedulingLeadDays: ((brandGuide.planningSchedulingLeadDays ?? c.planningSchedulingLeadDays) as string) || '',
        planningApprovalRequired: Boolean(brandGuide.planningApprovalRequired ?? c.planningApprovalRequired),
        planningPeriodFocus: ((brandGuide.planningPeriodFocus ?? c.planningPeriodFocus) as string) || '',
        planningPerformanceNotes: ((brandGuide.planningPerformanceNotes ?? c.planningPerformanceNotes) as string) || '',
        planningAccountOwner: ((brandGuide.planningAccountOwner ?? c.planningAccountOwner) as string) || '',
        planningApprovalChannel: ((brandGuide.planningApprovalChannel ?? c.planningApprovalChannel) as string) || '',
        planningClientResponseTime: ((brandGuide.planningClientResponseTime ?? c.planningClientResponseTime) as string) || '',
        planningOperationNotes: ((brandGuide.planningOperationNotes ?? c.planningOperationNotes) as string) || '',
        strategyContentPillars: Array.isArray(brandGuide.strategyContentPillars ?? c.strategyContentPillars)
            ? (brandGuide.strategyContentPillars ?? c.strategyContentPillars) as Client['strategyContentPillars']
            : [],
        strategyLastUpdated: (brandGuide.strategyLastUpdated ?? c.strategyLastUpdated ?? '') as string,
        contract: contract as Client['contract'],
        ownerPreferences: parseClientOwnerPreferencesFromApi(c.clientOwnerPreferencesJson),
    };

    const briefing = resolveBriefingV2(baseClient, brandGuide);
    return { ...baseClient, ...applyBriefingToClientFlat(briefing) };
};
