import React, { useMemo } from 'react';
import type { Client } from '../../../types';
import type { BriefingBlock } from '../../../lib/briefingV2/types';
import {
    getBriefingGlobalProgress,
    getBriefingOverallStatus,
    BLOCK_ORDER,
    STRATEGY_TAB_BLOCKS,
    type BlockProgress,
} from '../../../lib/clientBriefingProgress';

const BLOCK_ACCENT: Record<BriefingBlock, string> = {
    strategy: 'bg-violet-500',
    audience: 'bg-sky-500',
    communication: 'bg-rose-500',
    content: 'bg-emerald-500',
    planning: 'bg-amber-500',
};

export type BriefingGlobalProgressProps = {
    client: Client;
    t: (k: string, vars?: Record<string, string | number>) => string;
    /** Exibir detalhamento por bloco (Overview). */
    showBlocks?: boolean;
    /** Limitar blocos exibidos (ex.: só aba Estratégia). */
    blocksFilter?: BriefingBlock[];
    compact?: boolean;
};

function progressBarColor(percent: number): string {
    if (percent >= 80) return 'bg-emerald-500';
    if (percent >= 40) return 'bg-indigo-500';
    return 'bg-amber-500';
}

export const BriefingGlobalProgress: React.FC<BriefingGlobalProgressProps> = ({
    client,
    t,
    showBlocks = false,
    blocksFilter,
    compact = false,
}) => {
    const global = useMemo(() => getBriefingGlobalProgress(client), [client]);
    const status = useMemo(() => getBriefingOverallStatus(client), [client]);

    const blocksToShow = blocksFilter ?? (showBlocks ? BLOCK_ORDER : []);
    const statusKey = `briefing_status_${status}`;

    return (
        <div className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${compact ? 'p-4' : 'p-5'}`}>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {t('briefing_global_title')}
                    </h3>
                    {!compact && (
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            {t(statusKey)}
                        </p>
                    )}
                </div>
                <div className="text-right shrink-0">
                    <p className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">
                        {global.filled}/{global.total}
                    </p>
                    <p className="text-xs font-medium tabular-nums text-gray-500 dark:text-gray-400">
                        {global.percent}%
                    </p>
                </div>
            </div>
            <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${progressBarColor(global.percent)}`}
                    style={{ width: `${global.percent}%` }}
                />
            </div>
            {blocksToShow.length > 0 && (
                <ul className={`${compact ? 'mt-3' : 'mt-4'} space-y-2`}>
                    {blocksToShow.map((block) => {
                        const p: BlockProgress = global.blocks[block];
                        const blockPercent = p.total > 0 ? Math.round((p.filled / p.total) * 100) : 0;
                        return (
                            <li key={block} className="flex items-center gap-3 text-xs">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${BLOCK_ACCENT[block]}`} />
                                <span className="flex-1 min-w-0 truncate text-gray-600 dark:text-gray-400">
                                    {t(`briefing_block_${block}_title`)}
                                </span>
                                <span className="shrink-0 tabular-nums font-medium text-gray-700 dark:text-gray-300">
                                    {p.filled}/{p.total}
                                </span>
                                <div className="w-16 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden shrink-0">
                                    <div
                                        className={`h-full rounded-full ${BLOCK_ACCENT[block]}`}
                                        style={{ width: `${blockPercent}%` }}
                                    />
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

/** Cabeçalho compacto para abas Estratégia / Planejamento (progresso parcial ou global). */
export const BriefingTabProgressHeader: React.FC<{
    client: Client;
    t: (k: string, vars?: Record<string, string | number>) => string;
    tab: 'strategy' | 'planning';
}> = ({ client, t, tab }) => {
    const global = useMemo(() => getBriefingGlobalProgress(client), [client]);
    const blocksFilter = tab === 'strategy' ? [...STRATEGY_TAB_BLOCKS] : (['planning'] as BriefingBlock[]);

    const tabFilled = blocksFilter.reduce((s, b) => s + global.blocks[b].filled, 0);
    const tabTotal = blocksFilter.reduce((s, b) => s + global.blocks[b].total, 0);

    return (
        <div className="rounded-xl border border-indigo-200/80 dark:border-indigo-800/50 bg-indigo-50/50 dark:bg-indigo-950/20 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {t('briefing_global_title')}
                    <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                        {global.filled}/{global.total} · {global.percent}%
                    </span>
                </p>
                <p className="text-xs tabular-nums text-gray-600 dark:text-gray-400">
                    {t(tab === 'strategy' ? 'briefing_tab_strategy_progress' : 'briefing_tab_planning_progress')}
                    {': '}
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{tabFilled}/{tabTotal}</span>
                </p>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-gray-200/80 dark:bg-gray-700 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${progressBarColor(global.percent)}`}
                    style={{ width: `${global.percent}%` }}
                />
            </div>
        </div>
    );
};
