import React, { useMemo } from 'react';
import type { Client, User } from '../../types';
import FilterDropdown from '../tasks/FilterDropdown';
import TooltipHint from '../TooltipHint';
import { ChevronDownIcon } from '../icons';
import { resolveClientImageUrl, resolveClientFallbackColor } from '../../lib/clientVisual';
import { toUploadUrl } from '../../lib/api';
import {
	briefingStatusLabelKey,
	buildPlanningBriefingSummary,
} from '../../lib/planningBriefingSummary';
import type { TabId } from '../ClientPresentationView';
import type { ForecastPeriodKey } from '../../lib/utils';

export type ClientScheduleSummary = {
	planned: number;
	goal: number | null;
	missing: number | null;
};

type PlanningClientCardProps = {
	clients: Client[];
	clientFilter: string;
	clientFilterOptions: { value: string; label: string }[];
	clientFilterSelectClass: string;
	selectedClient: Client | null;
	isLocked: boolean;
	canEditPlanning: boolean;
	canGenerateForecasts: boolean;
	generateForecastsTooltip: string | null;
	forecastPopoverOpen: boolean;
	forecastGenerating: boolean;
	forecastPopoverRef: React.RefObject<HTMLDivElement | null>;
	teamMembers: User[];
	scheduleSummary: ClientScheduleSummary | null;
	t: (key: string, vars?: Record<string, string | number>) => string;
	onClientFilterChange: (value: string) => void;
	onToggleForecastPopover: () => void;
	onGenerateForecasts: (period: ForecastPeriodKey) => void;
	onOpenClientTab: (clientId: string, tab: TabId) => void;
};

const StatusPill: React.FC<{ label: string }> = ({ label }) => (
	<span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
		{label}
	</span>
);

const SummaryColumn: React.FC<{
	title: string;
	children: React.ReactNode;
}> = ({ title, children }) => (
	<div className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-3 dark:border-gray-700/80 dark:bg-gray-800/40">
		<h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">{title}</h3>
		<div className="mt-2.5 space-y-2.5">{children}</div>
	</div>
);

const SummaryField: React.FC<{
	label: string;
	value?: string;
	t: PlanningClientCardProps['t'];
}> = ({ label, value, t }) => (
	<div>
		<p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
		{value?.trim() ? (
			<p className="mt-0.5 text-sm text-gray-800 dark:text-gray-200">{value}</p>
		) : (
			<p className="mt-0.5 text-sm italic text-gray-400 dark:text-gray-500">{t('planning_field_not_defined')}</p>
		)}
	</div>
);

const ClientAvatar: React.FC<{ client: Client; size?: 'md' | 'lg' }> = ({ client, size = 'md' }) => {
	const img = resolveClientImageUrl(client);
	const fallback = resolveClientFallbackColor(client);
	const sizeClass = size === 'lg' ? 'h-12 w-12 text-sm' : 'h-11 w-11 text-sm';

	if (img) {
		return (
			<img
				src={toUploadUrl(img)}
				alt=""
				className={`${sizeClass} shrink-0 rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-600`}
			/>
		);
	}

	return (
		<span
			className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full font-bold text-white ring-1 ring-gray-200 dark:ring-gray-600`}
			style={{ backgroundColor: fallback }}
			aria-hidden
		>
			{(client.name || '?').slice(0, 2).toUpperCase()}
		</span>
	);
};

const ForecastButton: React.FC<{
	canEditPlanning: boolean;
	canGenerateForecasts: boolean;
	generateForecastsTooltip: string | null;
	forecastPopoverOpen: boolean;
	forecastGenerating: boolean;
	forecastPopoverRef: React.RefObject<HTMLDivElement | null>;
	t: PlanningClientCardProps['t'];
	onToggleForecastPopover: () => void;
	onGenerateForecasts: (period: ForecastPeriodKey) => void;
}> = ({
	canEditPlanning,
	canGenerateForecasts,
	generateForecastsTooltip,
	forecastPopoverOpen,
	forecastGenerating,
	forecastPopoverRef,
	t,
	onToggleForecastPopover,
	onGenerateForecasts,
}) => (
	<div ref={forecastPopoverRef} className="relative inline-flex shrink-0" data-planning-wizard-step="generate-forecasts">
		<TooltipHint
			label={
				!canEditPlanning
					? t('tooltip_no_edit_permission')
					: generateForecastsTooltip
					  ? t(generateForecastsTooltip)
					  : t('planning_generate_forecasts')
			}
		>
			<span className={`inline-flex ${!canGenerateForecasts || !canEditPlanning ? 'cursor-not-allowed' : ''}`}>
				<button
					type="button"
					onClick={() => canGenerateForecasts && canEditPlanning && !forecastGenerating && onToggleForecastPopover()}
					disabled={!canGenerateForecasts || !canEditPlanning || forecastGenerating}
					aria-label={t('planning_generate_forecasts')}
					aria-expanded={forecastPopoverOpen}
					aria-haspopup="true"
					className={`inline-flex h-10 items-center gap-1 rounded-lg border border-indigo-200 bg-white px-4 pr-2 text-sm font-medium text-indigo-700 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-indigo-700 dark:bg-gray-800 dark:text-indigo-300 dark:focus:ring-offset-gray-900 ${!canGenerateForecasts || !canEditPlanning ? 'pointer-events-none cursor-not-allowed opacity-50' : 'hover:border-indigo-300 hover:bg-indigo-50 dark:hover:border-indigo-600 dark:hover:bg-indigo-950/40'}`}
				>
					{t('planning_generate_forecasts')}
					<ChevronDownIcon className={`h-4 w-4 transition-transform ${forecastPopoverOpen ? 'rotate-180' : ''}`} />
				</button>
			</span>
		</TooltipHint>
		{forecastPopoverOpen && canGenerateForecasts && canEditPlanning ? (
			<div
				className="absolute top-full right-0 z-50 mt-1 min-w-[180px] rounded-lg border border-gray-200 bg-white py-1.5 shadow-lg dark:border-gray-600 dark:bg-gray-800"
				role="menu"
			>
				{(['1m', '3m', '6m', '1y'] as ForecastPeriodKey[]).map((p) => (
					<button
						key={p}
						type="button"
						role="menuitem"
						onClick={() => onGenerateForecasts(p)}
						disabled={forecastGenerating}
						className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-indigo-50 focus:bg-indigo-50 focus:outline-none disabled:opacity-50 dark:text-gray-200 dark:hover:bg-indigo-900/30 dark:focus:bg-indigo-900/30"
					>
						{t(`planning_forecast_period_${p}`)}
					</button>
				))}
			</div>
		) : null}
	</div>
);

export const PlanningClientCard: React.FC<PlanningClientCardProps> = ({
	clients,
	clientFilter,
	clientFilterOptions,
	clientFilterSelectClass,
	selectedClient,
	isLocked,
	canEditPlanning,
	canGenerateForecasts,
	generateForecastsTooltip,
	forecastPopoverOpen,
	forecastGenerating,
	forecastPopoverRef,
	teamMembers,
	scheduleSummary,
	t,
	onClientFilterChange,
	onToggleForecastPopover,
	onGenerateForecasts,
	onOpenClientTab,
}) => {
	const summary = useMemo(
		() => (selectedClient ? buildPlanningBriefingSummary(selectedClient, t, teamMembers) : null),
		[selectedClient, t, teamMembers],
	);

	const clientSelect = (
		<FilterDropdown
			layout="inline"
			label={t('client')}
			labelClassName="sr-only"
			name="clientFilter"
			options={clientFilterOptions}
			value={clientFilter}
			onChange={(_, value) => onClientFilterChange(value)}
			disabled={clients.length === 0}
			selectClassName={clientFilterSelectClass}
		/>
	);

	return (
		<section
			className="rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/40"
			data-planning-wizard-step="client-entry"
			data-planning-wizard-phase={isLocked ? 'select-client' : 'plan-client'}
			data-planning-scope="client"
		>
			{isLocked ? (
				<>
					<h2 className="text-base font-semibold text-gray-900 dark:text-white">{t('planning_client_card_title_empty')}</h2>
					<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('planning_pick_client_hint')}</p>
					<div className="mt-4">{clientSelect}</div>
				</>
			) : selectedClient ? (
				<>
					<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
						<div className="flex min-w-0 items-start gap-3">
							<ClientAvatar client={selectedClient} size="lg" />
							<div className="min-w-0 flex-1">
								<h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">{selectedClient.name}</h2>
								<div className="mt-2 flex flex-wrap gap-2">
									{summary?.frequencyLabel ? <StatusPill label={summary.frequencyLabel} /> : null}
									<StatusPill label={t(briefingStatusLabelKey(summary?.overallStatus ?? 'empty'))} />
									<StatusPill
										label={t('planning_client_planning_status', {
											status: t(briefingStatusLabelKey(summary?.planningStatus ?? 'empty')),
										})}
									/>
								</div>
							</div>
						</div>
						<div className="flex flex-wrap items-end gap-3 lg:justify-end">
							{clientSelect}
							<ForecastButton
								canEditPlanning={canEditPlanning}
								canGenerateForecasts={canGenerateForecasts}
								generateForecastsTooltip={generateForecastsTooltip}
								forecastPopoverOpen={forecastPopoverOpen}
								forecastGenerating={forecastGenerating}
								forecastPopoverRef={forecastPopoverRef}
								t={t}
								onToggleForecastPopover={onToggleForecastPopover}
								onGenerateForecasts={onGenerateForecasts}
							/>
						</div>
					</div>

					{summary ? (
						<div className="mt-5 space-y-4 border-t border-gray-100 pt-4 dark:border-gray-800" data-planning-wizard-step="planning-summary">
							<div className="grid gap-3 md:grid-cols-3">
								<SummaryColumn title={t('planning_summary_content_title')}>
									<SummaryField label={t('briefing_current_campaign_objective')} value={summary.objectiveLabel} t={t} />
									<SummaryField label={t('briefing_month_focus')} value={summary.monthFocusLabel} t={t} />
									<SummaryField label={t('briefing_content_pillars')} value={summary.pillarsLabel} t={t} />
								</SummaryColumn>
								<SummaryColumn title={t('planning_summary_planning_title')}>
									<SummaryField label={t('briefing_planning_frequency')} value={summary.frequencyLabel} t={t} />
									<SummaryField label={t('preferred_post_days')} value={summary.preferredDaysLabel} t={t} />
									{scheduleSummary ? (
										<>
											<SummaryField
												label={t('planning_summary_planned_label')}
												value={String(scheduleSummary.planned)}
												t={t}
											/>
											{scheduleSummary.goal != null ? (
												<SummaryField
													label={t('planning_summary_goal_label')}
													value={String(scheduleSummary.goal)}
													t={t}
												/>
											) : null}
											{scheduleSummary.missing != null ? (
												<SummaryField
													label={t('planning_summary_missing_label')}
													value={String(scheduleSummary.missing)}
													t={t}
												/>
											) : null}
										</>
									) : null}
								</SummaryColumn>
								<SummaryColumn title={t('planning_summary_operation_title')}>
									<SummaryField label={t('planning_approval_required')} value={summary.approvalLabel} t={t} />
									<SummaryField label={t('briefing_approval_channel')} value={summary.channelLabel} t={t} />
									<SummaryField label={t('client_responsible_by_client_label')} value={summary.ownerLabel} t={t} />
								</SummaryColumn>
							</div>

							{summary.quickActions.length > 0 ? (
								<div className="rounded-lg border border-amber-100/80 bg-amber-50/40 px-3 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">
									<h4 className="text-xs font-semibold uppercase tracking-wide text-amber-900/80 dark:text-amber-200/90">
										{t('planning_recommended_actions_title')}
									</h4>
									<div className="mt-2.5 flex flex-wrap gap-2">
										{summary.quickActions.map((action) => (
											<button
												key={action.id}
												type="button"
												onClick={() => onOpenClientTab(selectedClient.id, action.tab)}
												className="rounded-md border border-amber-200/80 bg-white px-2.5 py-1 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-50 dark:border-amber-800 dark:bg-gray-900/50 dark:text-amber-200 dark:hover:bg-amber-950/40"
											>
												{t(action.labelKey)}
											</button>
										))}
									</div>
								</div>
							) : null}
						</div>
					) : null}
				</>
			) : null}
		</section>
	);
};
