import type { Client } from '../types';
import type { BriefingBlock, BriefingV2 } from './briefingV2/types';
import { resolveClientBriefing } from './briefingV2/migrate';

export interface BlockProgress {
    filled: number;
    total: number;
    labelKey: string;
}

export interface BriefingGlobalProgress {
    filled: number;
    total: number;
    percent: number;
    blocks: Record<BriefingBlock, BlockProgress>;
}

const BLOCK_ORDER: BriefingBlock[] = ['strategy', 'audience', 'communication', 'content', 'planning'];

const STRATEGY_TAB_BLOCKS: BriefingBlock[] = ['strategy', 'audience', 'communication', 'content'];

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
                (briefing.strategy.marketReferences ?? []).some((r) => r.name?.trim()),
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
                isFilledTags(briefing.content.pillarsTags ?? []),
                isFilledString(briefing.content.strategyNotes),
            ].filter(Boolean).length;
            return { filled, total: 3, labelKey: BLOCK_LABEL_KEYS.content };
        }
        case 'planning': {
            const freq = briefing.planning.frequency;
            const op = briefing.planning.operation;
            const freqFilled = freq.variable
                ? true
                : isFilledNumber(freq.quantity) && isFilledEnum(freq.period);
            const filled = [
                freqFilled,
                (briefing.planning.preferredPostDays ?? []).length > 0,
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
    const briefing = resolveClientBriefing(client);
    return getBriefingBlockProgressFromBriefing(briefing, block);
}

export function getAllBriefingBlockProgress(client: Client): Record<BriefingBlock, BlockProgress> {
    const briefing = resolveClientBriefing(client);
    return {
        strategy: getBriefingBlockProgressFromBriefing(briefing, 'strategy'),
        audience: getBriefingBlockProgressFromBriefing(briefing, 'audience'),
        communication: getBriefingBlockProgressFromBriefing(briefing, 'communication'),
        content: getBriefingBlockProgressFromBriefing(briefing, 'content'),
        planning: getBriefingBlockProgressFromBriefing(briefing, 'planning'),
    };
}

/** Progresso global agregado — fonte única para Overview, Estratégia e Planejamento. */
export function getBriefingGlobalProgress(client: Client): BriefingGlobalProgress {
    const blocks = getAllBriefingBlockProgress(client);
    let filled = 0;
    let total = 0;
    for (const block of BLOCK_ORDER) {
        filled += blocks[block].filled;
        total += blocks[block].total;
    }
    const percent = total > 0 ? Math.round((filled / total) * 100) : 0;
    return { filled, total, percent, blocks };
}

export function isBriefingBlockEmpty(client: Client, block: BriefingBlock): boolean {
    const p = getBriefingBlockProgress(client, block);
    return p.filled === 0;
}

/** Briefing sem nenhum campo preenchido (onboarding). */
export function isBriefingEmpty(client: Client): boolean {
    return getBriefingGlobalProgress(client).filled === 0;
}

/** Aba Estratégia vazia — nenhum dado nos 4 blocos da aba. */
export function isBriefingStrategyTabEmpty(client: Client): boolean {
    return STRATEGY_TAB_BLOCKS.every((b) => isBriefingBlockEmpty(client, b));
}

/** Aba Planejamento vazia. */
export function isBriefingPlanningTabEmpty(client: Client): boolean {
    return isBriefingBlockEmpty(client, 'planning');
}

export type BriefingOverallStatus = 'empty' | 'started' | 'partial' | 'complete';

export function getBriefingOverallStatus(client: Client): BriefingOverallStatus {
    const { filled, total, percent } = getBriefingGlobalProgress(client);
    if (filled === 0) return 'empty';
    if (filled === total) return 'complete';
    if (percent >= 50) return 'partial';
    return 'started';
}

export { BLOCK_ORDER, STRATEGY_TAB_BLOCKS };
