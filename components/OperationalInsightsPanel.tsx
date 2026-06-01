import React from 'react';
import type { OperationalInsight } from '../lib/operationalInsights';
import { AlertTriangleIcon, InfoIcon, BellIcon } from './icons';

const SEVERITY_STYLES: Record<
	OperationalInsight['severity'],
	{ wrap: string; icon: React.ReactNode }
> = {
	info: {
		wrap: 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200',
		icon: <InfoIcon className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />,
	},
	warning: {
		wrap: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100',
		icon: <AlertTriangleIcon className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />,
	},
	alert: {
		wrap: 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100',
		icon: <AlertTriangleIcon className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />,
	},
};

type OperationalInsightsPanelProps = {
	insights: OperationalInsight[];
	t: (key: string, params?: Record<string, string | number>) => string;
	title?: string;
	className?: string;
	compact?: boolean;
};

const OperationalInsightsPanel: React.FC<OperationalInsightsPanelProps> = ({
	insights,
	t,
	title,
	className = '',
	compact = false,
}) => {
	if (insights.length === 0) return null;

	return (
		<div className={className}>
			{title ? (
				<div className="mb-3 flex items-center gap-2">
					<BellIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
					<h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
				</div>
			) : null}
			<ul className={`flex flex-col ${compact ? 'gap-1.5' : 'gap-2'}`}>
				{insights.map((insight) => {
					const style = SEVERITY_STYLES[insight.severity];
					const params =
						insight.count != null ? { count: insight.count } : undefined;
					return (
						<li
							key={insight.id}
							className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-snug ${style.wrap} ${compact ? '' : 'sm:text-sm'}`}
						>
							{style.icon}
							<span className="min-w-0 flex-1">{t(insight.messageKey, params)}</span>
						</li>
					);
				})}
			</ul>
		</div>
	);
};

export default OperationalInsightsPanel;
