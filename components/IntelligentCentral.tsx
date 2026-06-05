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
	/** Recolhido por padrão — não compete visualmente com o calendário. */
	variant?: 'default' | 'compact' | 'embedded';
	/** Chave i18n para resumo compacto quando há itens (recebe { n }). */
	compactCountKey?: string;
	/** Controle externo de expansão (variant embedded). */
	expanded?: boolean;
	onExpandedChange?: (expanded: boolean) => void;
};

const IntelligentCentral: React.FC<IntelligentCentralProps> = ({
	items,
	t,
	title,
	className = '',
	onAction,
	emptyMessageKey = 'intel_central_balanced',
	variant = 'default',
	compactCountKey,
	expanded: expandedProp,
	onExpandedChange,
}) => {
	const [index, setIndex] = useState(0);
	const [expandedInternal, setExpandedInternal] = useState(variant !== 'compact' && variant !== 'embedded');
	const expanded = expandedProp ?? expandedInternal;
	const setExpanded = onExpandedChange ?? setExpandedInternal;

	useEffect(() => {
		setIndex(0);
	}, [items]);

	useEffect(() => {
		if (variant === 'compact') setExpanded(false);
	}, [variant]);

	const safeIndex = items.length > 0 ? Math.min(index, items.length - 1) : 0;
	const current = items[safeIndex];

	const goPrev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
	const goNext = useCallback(
		() => setIndex((i) => Math.min(items.length - 1, i + 1)),
		[items.length],
	);

	const shellClass =
		variant === 'embedded'
			? ''
			: variant === 'compact'
				? 'rounded-lg border border-gray-200/80 bg-gray-50/60 dark:border-gray-700/80 dark:bg-gray-800/40'
				: 'min-h-[124px] min-w-[240px] max-w-[360px] flex-1 rounded-xl border border-indigo-100 bg-gradient-to-br from-purple-50 to-indigo-50 shadow-sm dark:border-indigo-800/50 dark:from-purple-900/20 dark:to-indigo-900/20';

	const compactSummary =
		items.length > 0
			? t(compactCountKey ?? 'planning_intel_alerts_count', { n: items.length })
			: t('planning_intel_no_alerts');

	const renderDetails = () => (
		<div className={`flex min-h-0 flex-col gap-2 ${variant === 'embedded' ? 'pt-1' : 'flex-1 justify-center pt-1'}`}>
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
	);

	if (variant === 'embedded') {
		if (!expanded || items.length === 0) return null;
		return (
			<div className={`mt-3 border-t border-gray-200/80 pt-3 dark:border-gray-700/70 ${className}`}>
				<div className="mb-2 flex items-center justify-between gap-2">
					<span className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
						{t('planning_status_details_label')}
					</span>
					<div className="flex items-center gap-2">
						{items.length > 1 ? (
							<div className="flex items-center gap-0.5 text-gray-600 dark:text-gray-400">
								<button
									type="button"
									onClick={goPrev}
									disabled={safeIndex <= 0}
									aria-label={t('planning_week_nav_prev')}
									className="rounded p-1 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-gray-800"
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
									className="rounded p-1 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-gray-800"
								>
									<ChevronRightIcon className="h-4 w-4" />
								</button>
							</div>
						) : null}
						<button
							type="button"
							onClick={() => setExpanded(false)}
							className="text-[11px] font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
						>
							{t('planning_intel_hide_details')}
						</button>
					</div>
				</div>
				{renderDetails()}
			</div>
		);
	}

	if (variant === 'compact' && !expanded) {
		return (
			<div className={`flex items-center justify-between gap-3 px-3 py-2 ${shellClass} ${className}`}>
				<span className="flex min-w-0 items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
					<ZapIcon className="h-3.5 w-3.5 shrink-0 text-amber-500 dark:text-amber-400" />
					<span className="truncate">{compactSummary}</span>
				</span>
				{items.length > 0 ? (
					<button
						type="button"
						onClick={() => setExpanded(true)}
						className="shrink-0 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
					>
						{t('planning_intel_view_details')}
					</button>
				) : null}
			</div>
		);
	}

	return (
		<div className={`group flex flex-col ${shellClass} ${className}`}>
			<div className={`flex h-full min-h-0 flex-col ${variant === 'compact' ? 'px-3 pb-3 pt-2' : 'px-4 pb-4 pt-3'}`}>
				<div className="mb-1 flex shrink-0 items-center justify-between gap-2">
					<div className="flex min-w-0 items-center gap-2">
						<span
							className={`inline-flex shrink-0 items-center justify-center rounded-full bg-white dark:bg-gray-800 ${
								variant === 'compact' ? 'h-6 w-6' : 'h-7 w-7 shadow-sm'
							}`}
						>
							<ZapIcon className={`text-amber-500 dark:text-amber-400 ${variant === 'compact' ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
						</span>
						<h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
							{title ?? t('intel_central_title')}
						</h3>
					</div>
					<div className="flex shrink-0 items-center gap-2">
						{items.length > 1 ? (
							<div className="flex items-center gap-0.5 text-gray-600 dark:text-gray-400">
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
							<span className="text-[11px] text-gray-500 dark:text-gray-400">1/1</span>
						) : null}
						{variant === 'compact' ? (
							<button
								type="button"
								onClick={() => setExpanded(false)}
								className="shrink-0 text-[11px] font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
							>
								{t('planning_intel_hide_details')}
							</button>
						) : null}
					</div>
				</div>

				<div className="flex min-h-0 flex-1 flex-col justify-center gap-2 pt-1">
					{renderDetails()}
				</div>
			</div>
		</div>
	);
};

export default IntelligentCentral;
