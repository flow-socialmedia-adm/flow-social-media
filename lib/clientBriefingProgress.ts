import type { Client } from '../types';
import type { BriefingBlock, BriefingV2 } from './briefingV2/types';
import { resolveBriefingV2 } from './briefingV2/migrate';

export interface BlockProgress {
    filled: number;
    total: number;
    labelKey: string;
}

const BLOCK_LABEL_KEYS: Record<BriefingBlock, string> = {
    strategy: 'briefing_block_strategy',
    audience: 'briefing_block_audience',
    communication: 'briefing_block_communication',
    content: 'briefing_block_content',
    planning: 'briefing_block_planning',
};

function isFilledString(v: string | undefined | null): boolean {
    return Boolean(v?.trim());
}

function isFilledTags(tags: string[] | undefined): boolean {
    return Array.isArray(tags) && tags.some((t) => t.trim());
}

function isFilledNumber(v: number | undefined | null): boolean {
    return v != null && !Number.isNaN(v);
}

function isFilledBool(v: boolean | undefined | null): boolean {
    return v === true || v === false;
}

function isFilledEnum(v: string | undefined | null): boolean {
    return Boolean(v?.trim());
}

export function getBriefingBlockProgressFromBriefing(briefing: BriefingV2, block: BriefingBlock): BlockProgress {
    switch (block) {
        case 'strategy': {
            const filled = [
                isFilledString(briefing.strategy.brandWho),
                isFilledTags(briefing.strategy.mainServicesTags),
                isFilledString(briefing.strategy.differentiators),
                isFilledString(briefing.strategy.perceivedAs),
                briefing.strategy.marketReferences.some((r) => r.name?.trim()),
            ].filter(Boolean).length;
            return { filled, total: 5, labelKey: BLOCK_LABEL_KEYS.strategy };
        }
        case 'audience': {
            const filled = [
                isFilledString(briefing.audience.main),
                isFilledTags(briefing.audience.painsTags),
                isFilledTags(briefing.audience.desiresTags),
                isFilledTags(briefing.audience.objectionsTags),
            ].filter(Boolean).length;
            return { filled, total: 4, labelKey: BLOCK_LABEL_KEYS.audience };
        }
        case 'communication': {
            const filled = [
                isFilledString(briefing.communication.toneOfVoice),
                isFilledTags(briefing.communication.brandWordsTags),
                isFilledEnum(briefing.communication.primaryCta),
                isFilledString(briefing.communication.avoid),
            ].filter(Boolean).length;
            return { filled, total: 4, labelKey: BLOCK_LABEL_KEYS.communication };
        }
        case 'content': {
            const filled = [
                isFilledString(briefing.content.profileObjective),
                isFilledString(briefing.content.currentCampaignObjective),
                isFilledString(briefing.content.monthFocus),
                isFilledTags(briefing.content.pillarsTags),
                isFilledString(briefing.content.strategyNotes),
            ].filter(Boolean).length;
            return { filled, total: 5, labelKey: BLOCK_LABEL_KEYS.content };
        }
        case 'planning': {
            const freq = briefing.planning.frequency;
            const op = briefing.planning.operation;
            const freqFilled = freq.variable
                ? true
                : isFilledNumber(freq.quantity) && isFilledEnum(freq.period);
            const filled = [
                freqFilled,
                briefing.planning.preferredPostDays.length > 0,
                isFilledNumber(op.productionLeadDays),
                isFilledNumber(op.approvalLeadDays),
                isFilledNumber(op.schedulingLeadDays),
                isFilledBool(op.approvalRequired),
                isFilledEnum(op.approvalChannel),
                isFilledEnum(op.clientResponseTime),
            ].filter(Boolean).length;
            const total = freq.variable ? 8 : 9;
            return { filled, total, labelKey: BLOCK_LABEL_KEYS.planning };
        }
        default:
            return { filled: 0, total: 0, labelKey: block };
    }
}

export function getBriefingBlockProgress(client: Client, block: BriefingBlock): BlockProgress {
    const briefing = client.briefingV2 ?? resolveBriefingV2(client);
    return getBriefingBlockProgressFromBriefing(briefing, block);
}

export function getAllBriefingBlockProgress(client: Client): Record<BriefingBlock, BlockProgress> {
    const briefing = client.briefingV2 ?? resolveBriefingV2(client);
    return {
        strategy: getBriefingBlockProgressFromBriefing(briefing, 'strategy'),
        audience: getBriefingBlockProgressFromBriefing(briefing, 'audience'),
        communication: getBriefingBlockProgressFromBriefing(briefing, 'communication'),
        content: getBriefingBlockProgressFromBriefing(briefing, 'content'),
        planning: getBriefingBlockProgressFromBriefing(briefing, 'planning'),
    };
}
