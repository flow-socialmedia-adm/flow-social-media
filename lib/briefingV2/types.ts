/** Briefing Schema V2 — ver docs/BRIEFING-SCHEMA-V2.md */

export type MarketReferenceType = 'competitor' | 'inspiration';

export interface MarketReference {
    id: string;
    type: MarketReferenceType;
    name: string;
    link?: string;
    note?: string;
    strengths?: string;
    weaknesses?: string;
    whatInspires?: string;
}

export interface BriefingPersona {
    id: string;
    name: string;
    description?: string;
    /** Dor principal (UI) — também espelhada em pains[0] */
    mainPain?: string;
    pains?: string[];
    desires?: string[];
    objections?: string[];
    behavior?: string;
    ageRange?: string;
    region?: string;
    photoUrl?: string;
    aiGenerated?: boolean;
}

export interface InternalBrandIdentity {
    brandWho?: string;
    mission?: string;
    vision?: string;
    values?: string;
    history?: string;
    businessSummary?: string;
    aiSummary?: string;
    aiSummaryGeneratedAt?: string;
}

export interface BriefingV2Internal {
    brandIdentity?: InternalBrandIdentity;
    audience?: {
        ageRange?: string;
        region?: string;
        demographicNotes?: string;
        aiPersonaHints?: string;
    };
    communication?: {
        wordsToAvoidTags?: string[];
        contentStyle?: string;
        secondaryCtas?: string[];
    };
    content?: {
        kpis?: string;
        performanceNotes?: string;
        pillarsDetailed?: Array<{
            id: string;
            name: string;
            description?: string;
            objective?: string;
            exampleThemes?: string;
        }>;
    };
    planning?: {
        calendarNotes?: string;
        operationNotes?: string;
        accountOwnerLegacy?: string;
        avgPostsPerWeek?: string;
    };
    meta?: {
        migratedFromV1At?: string;
        migrationVersion?: number;
        externalFormSubmissionId?: string;
        lastAiEnrichmentAt?: string;
    };
}

export type PrimaryCta =
    | 'schedule_consultation'
    | 'request_quote'
    | 'whatsapp'
    | 'buy'
    | 'contact'
    | 'other';

export type ApprovalChannel = 'whatsapp' | 'email' | 'trello' | 'clickup' | 'other';

export type ClientResponseTime =
    | 'same_day'
    | 'up_to_24h'
    | 'up_to_48h'
    | 'up_to_72h'
    | 'over_72h';

export interface BriefingV2 {
    schemaVersion: 2;
    updatedAt?: string;
    strategy: {
        brandWho: string;
        mainServicesTags: string[];
        differentiators: string;
        perceivedAs: string;
        marketReferences: MarketReference[];
    };
    audience: {
        main: string;
        painsTags: string[];
        desiresTags: string[];
        objectionsTags: string[];
        personas: BriefingPersona[];
    };
    communication: {
        toneOfVoice: string;
        brandWordsTags: string[];
        primaryCta: PrimaryCta | '';
        avoid: string;
    };
    content: {
        profileObjective: string;
        currentCampaignObjective: string;
        monthFocus: string;
        pillarsTags: string[];
        strategyNotes: string;
    };
    planning: {
        frequency: {
            quantity?: number;
            period?: 'week' | 'month';
            variable: boolean;
        };
        preferredPostDays: string[];
        operation: {
            productionLeadDays?: number;
            approvalLeadDays?: number;
            schedulingLeadDays?: number;
            approvalRequired?: boolean;
            approvalChannel: ApprovalChannel | '';
            clientResponseTime: ClientResponseTime | '';
        };
    };
    _internal?: BriefingV2Internal;
}

export type BriefingBlock = 'strategy' | 'audience' | 'communication' | 'content' | 'planning';
