import React from 'react';
import type { AppContextType } from '../types';
import { formatDateBR } from '../lib/utils';
import type { OperationalMilestone, OperationalMilestoneKind } from '../lib/operationalMilestones';

const MILESTONE_KIND_ORDER: OperationalMilestoneKind[] = ['production', 'approval', 'scheduling'];

type RecommendedLineKey =
	| 'recommended_planning_production_ideal'
	| 'recommended_planning_approval_ideal'
	| 'recommended_planning_scheduling_ideal';

const RECOMMENDED_LINE_KEYS: Record<OperationalMilestoneKind, RecommendedLineKey> = {
	production: 'recommended_planning_production_ideal',
	approval: 'recommended_planning_approval_ideal',
	scheduling: 'recommended_planning_scheduling_ideal',
};

/** Bloco informativo no modal post/previsão (única superfície de exibição). */
export const OperationalMilestonesInfoBlock: React.FC<{
	milestones: OperationalMilestone[];
	t: AppContextType['t'];
	publishDate: string;
}> = ({ milestones, t, publishDate }) => {
	if (milestones.length === 0 && !publishDate) return null;

	const ordered = MILESTONE_KIND_ORDER.map((kind) => milestones.find((m) => m.kind === kind)).filter(
		(m): m is OperationalMilestone => m != null,
	);

	return (
		<div className="mb-4 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2.5 dark:border-indigo-900/50 dark:bg-indigo-950/30">
			<p className="mb-2 text-xs font-semibold text-indigo-800 dark:text-indigo-200">{t('recommended_planning_title')}</p>
			<ul className="space-y-1.5">
				{ordered.map((m) => (
					<li key={m.kind} className="flex items-center justify-between gap-2 text-xs text-gray-700 dark:text-gray-200">
						<span>{t(RECOMMENDED_LINE_KEYS[m.kind])}</span>
						<span className="shrink-0 font-medium tabular-nums text-gray-900 dark:text-gray-100">{formatDateBR(m.date)}</span>
					</li>
				))}
				{publishDate ? (
					<li className="flex items-center justify-between gap-2 text-xs text-gray-700 dark:text-gray-200">
						<span>{t('recommended_planning_publish')}</span>
						<span className="shrink-0 font-medium tabular-nums text-gray-900 dark:text-gray-100">{formatDateBR(publishDate)}</span>
					</li>
				) : null}
			</ul>
		</div>
	);
};
