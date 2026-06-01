import React from 'react';
import type { AppContextType } from '../types';
import { formatDateBR } from '../lib/utils';
import {
	type MilestoneDayCounts,
	type OperationalMilestone,
	type OperationalMilestoneKind,
	MILESTONE_KIND_BADGE_CLASS,
	MILESTONE_KIND_DOT_CLASS,
} from '../lib/operationalMilestones';
import TooltipHint from './TooltipHint';

const MILESTONE_KIND_ORDER: OperationalMilestoneKind[] = ['production', 'approval', 'scheduling'];

type MilestoneLabelKey =
	| 'operational_milestone_production'
	| 'operational_milestone_approval'
	| 'operational_milestone_scheduling';

const MILESTONE_LABEL_KEYS: Record<OperationalMilestoneKind, MilestoneLabelKey> = {
	production: 'operational_milestone_production',
	approval: 'operational_milestone_approval',
	scheduling: 'operational_milestone_scheduling',
};

const MILESTONE_SHORT_KEYS: Record<OperationalMilestoneKind, 'operational_milestone_short_production' | 'operational_milestone_short_approval' | 'operational_milestone_short_scheduling'> = {
	production: 'operational_milestone_short_production',
	approval: 'operational_milestone_short_approval',
	scheduling: 'operational_milestone_short_scheduling',
};

export const OperationalMilestoneDots: React.FC<{
	counts: MilestoneDayCounts;
	t: AppContextType['t'];
}> = ({ counts, t }) => {
	const kinds = MILESTONE_KIND_ORDER.filter((k) => counts[k] > 0);
	if (kinds.length === 0) return null;

	return (
		<div className="mt-0.5 flex flex-wrap items-center justify-center gap-0.5">
			{kinds.map((kind) => (
				<TooltipHint
					key={kind}
					label={t('operational_milestone_day_tooltip', {
						kind: t(MILESTONE_LABEL_KEYS[kind]),
						count: String(counts[kind]),
					})}
				>
					<span
						className={`inline-flex h-3.5 min-w-[1rem] items-center justify-center gap-0.5 rounded px-0.5 text-[8px] font-bold leading-none text-white ${MILESTONE_KIND_DOT_CLASS[kind]}`}
					>
						{counts[kind] > 1 ? counts[kind] : null}
					</span>
				</TooltipHint>
			))}
		</div>
	);
};

export const OperationalMilestonesCompactLine: React.FC<{
	milestones: OperationalMilestone[];
	t: AppContextType['t'];
}> = ({ milestones, t }) => {
	if (milestones.length === 0) return null;

	return (
		<div className="mt-0.5 flex flex-wrap gap-x-1.5 gap-y-0.5 text-[9px] leading-tight text-gray-500 dark:text-gray-400">
			{milestones.map((m) => (
				<span key={`${m.kind}-${m.date}`} className="inline-flex items-center gap-0.5">
					<span className={`h-1.5 w-1.5 shrink-0 rounded-full ${MILESTONE_KIND_DOT_CLASS[m.kind]}`} aria-hidden />
					<span className="font-medium text-gray-600 dark:text-gray-300">{t(MILESTONE_SHORT_KEYS[m.kind])}</span>
					<span>{formatDateBR(m.date)}</span>
				</span>
			))}
		</div>
	);
};

export const OperationalMilestonesInfoBlock: React.FC<{
	milestones: OperationalMilestone[];
	t: AppContextType['t'];
	publishDate: string;
}> = ({ milestones, t, publishDate }) => {
	if (milestones.length === 0) return null;

	return (
		<div className="mb-4 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2.5 dark:border-indigo-900/50 dark:bg-indigo-950/30">
			<p className="mb-2 text-xs font-semibold text-indigo-800 dark:text-indigo-200">{t('operational_milestone_title')}</p>
			<ul className="space-y-1.5">
				{milestones.map((m) => (
					<li key={`${m.kind}-${m.date}`} className="flex items-start justify-between gap-2 text-xs">
						<span className="inline-flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
							<span className={`inline-flex rounded px-1.5 py-px text-[10px] font-semibold ${MILESTONE_KIND_BADGE_CLASS[m.kind]}`}>
								{t(MILESTONE_LABEL_KEYS[m.kind])}
							</span>
						</span>
						<span className="shrink-0 font-medium text-gray-900 dark:text-gray-100">{formatDateBR(m.date)}</span>
					</li>
				))}
			</ul>
			<p className="mt-2 text-[10px] text-gray-500 dark:text-gray-400">
				{t('operational_milestone_publish_ref', { date: formatDateBR(publishDate) })}
			</p>
		</div>
	);
};
