import React, { useCallback, useEffect, useState } from 'react';
import type { IntelligenceItem } from '../lib/intelligentCentral';
import { resolveIntelligenceClientLabel } from '../lib/intelligentCentral';
import { ChevronLeftIcon, ChevronRightIcon, ZapIcon } from './icons';

type IntelligentCentralProps = {
	items: IntelligenceItem[];
	t: (key: string, params?: Record<string, string | number>) => string;
	title?: string;
	className?: string;
	onAction?: (item: IntelligenceItem) => void;
	emptyMessageKey?: string;
};

const IntelligentCentral: React.FC<IntelligentCentralProps> = ({
	items,
	t,
	title,
	className = '',
	onAction,
	emptyMessageKey = 'intel_central_balanced',
}) => {
	const [index, setIndex] = useState(0);

	useEffect(() => {
		setIndex(0);
	}, [items]);

	const safeIndex = items.length > 0 ? Math.min(index, items.length - 1) : 0;
	const current = items[safeIndex];

	const goPrev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
	const goNext = useCallback(
		() => setIndex((i) => Math.min(items.length - 1, i + 1)),
		[items.length],
	);

	return (
		<div
			className={`group flex min-h-[124px] min-w-[240px] max-w-[360px] flex-1 flex-col rounded-xl border border-indigo-100 bg-gradient-to-br from-purple-50 to-indigo-50 shadow-sm dark:border-indigo-800/50 dark:from-purple-900/20 dark:to-indigo-900/20 ${className}`}
		>
			<div className="flex h-full min-h-0 flex-col px-4 pb-4 pt-3">
				<div className="mb-1 flex shrink-0 items-center justify-between gap-2">
					<div className="flex min-w-0 items-center gap-2">
						<span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white shadow-sm dark:bg-gray-800">
							<ZapIcon className="h-4 w-4 text-amber-500 dark:text-amber-400" />
						</span>
						<h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
							{title ?? t('intel_central_title')}
						</h3>
					</div>
					{items.length > 1 ? (
						<div className="flex shrink-0 items-center gap-0.5 text-gray-600 dark:text-gray-400">
							<button
								type="button"
								onClick={goPrev}
								disabled={safeIndex <= 0}
								aria-label={t('planning_week_nav_prev')}
								className="rounded p-1 hover:bg-white/60 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-gray-700/60"
							>
								<ChevronLeftIcon className="h-4 w-4" />
							</button>
							<span className="min-w-[2.5ch] text-center text-[11px] font-medium tabular-nums">
								{safeIndex + 1}/{items.length}
							</span>
							<button
								type="button"
								onClick={goNext}
								disabled={safeIndex >= items.length - 1}
								aria-label={t('planning_week_nav_next')}
								className="rounded p-1 hover:bg-white/60 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-gray-700/60"
							>
								<ChevronRightIcon className="h-4 w-4" />
							</button>
						</div>
					) : items.length === 1 ? (
						<span className="shrink-0 text-[11px] text-gray-500 dark:text-gray-400">1/1</span>
					) : null}
				</div>

				<div className="flex min-h-0 flex-1 flex-col justify-center gap-2 pt-1">
					{current ? (
						<>
							<p className="text-xs font-semibold text-indigo-800 dark:text-indigo-200">
								{resolveIntelligenceClientLabel(current.clientName, t)}
							</p>
							{current.contextKey ? (
								<p className="text-[10px] leading-snug text-gray-500 dark:text-gray-400">
									{t(current.contextKey)}
								</p>
							) : null}
							<p className="line-clamp-3 text-xs leading-snug text-gray-700 dark:text-gray-300">
								{t(current.messageKey, current.messageParams)}
							</p>
							{current.actionLabelKey && onAction ? (
								<button
									type="button"
									onClick={() => onAction(current)}
									className="self-start text-left text-[11px] font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
								>
									{t(current.actionLabelKey)}
								</button>
							) : current.actionLabelKey ? (
								<span className="text-[11px] font-medium text-indigo-600/80 dark:text-indigo-400/80">
									{t(current.actionLabelKey)}
								</span>
							) : null}
						</>
					) : (
						<p className="text-xs italic text-gray-600 dark:text-gray-400">{t(emptyMessageKey)}</p>
					)}
				</div>
			</div>
		</div>
	);
};

export default IntelligentCentral;
