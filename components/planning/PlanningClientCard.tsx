import React, { forwardRef } from 'react';
import type { Client, User } from '../../types';
import type { patchClientBriefing } from '../../lib/briefingV2';
import FilterDropdown from '../tasks/FilterDropdown';
import TooltipHint from '../TooltipHint';
import { resolveClientImageUrl, resolveClientFallbackColor } from '../../lib/clientVisual';
import { toUploadUrl } from '../../lib/api';
import type { ClientScheduleSummary } from '../../lib/planningSchedule';
import { PlanningExecutiveTags } from './PlanningExecutiveTags';
import { PlanningMonthContentBlock } from './PlanningMonthContentBlock';

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
	forecastGenerating: boolean;
	teamMembers: User[];
	scheduleSummary: ClientScheduleSummary | null;
	savingClient?: boolean;
	t: (key: string, vars?: Record<string, string | number>) => string;
	onClientFilterChange: (value: string) => void;
	onGenerateForecasts: () => void;
	onBriefingPatch: (clientId: string, updater: Parameters<typeof patchClientBriefing>[1]) => void;
	onClientPatch: (clientId: string, patch: Partial<Client>) => void;
};

const ClientAvatar: React.FC<{ client: Client }> = ({ client }) => {
	const img = resolveClientImageUrl(client);
	const fallback = resolveClientFallbackColor(client);

	if (img) {
		return (
			<img
				src={toUploadUrl(img)}
				alt=""
				className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-600"
			/>
		);
	}

	return (
		<span
			className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ring-1 ring-gray-200 dark:ring-gray-600"
			style={{ backgroundColor: fallback }}
			aria-hidden
		>
			{(client.name || '?').slice(0, 2).toUpperCase()}
		</span>
	);
};

export const PlanningClientCard = forwardRef<HTMLElement, PlanningClientCardProps>(function PlanningClientCard(
	{
		clients,
		clientFilter,
		clientFilterOptions,
		clientFilterSelectClass,
		selectedClient,
		isLocked,
		canEditPlanning,
		canGenerateForecasts,
		generateForecastsTooltip,
		forecastGenerating,
		teamMembers,
		scheduleSummary,
		savingClient = false,
		t,
		onClientFilterChange,
		onGenerateForecasts,
		onBriefingPatch,
		onClientPatch,
	},
	ref,
) {
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
			ref={ref}
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
					<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
						<div className="flex min-w-0 items-center gap-3">
							<ClientAvatar client={selectedClient} />
							<h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">{selectedClient.name}</h2>
						</div>
						<div className="flex flex-wrap items-center gap-2 lg:justify-end">
							{clientSelect}
							<div className="relative inline-flex shrink-0" data-planning-wizard-step="generate-forecasts">
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
											onClick={() => canGenerateForecasts && canEditPlanning && !forecastGenerating && onGenerateForecasts()}
											disabled={!canGenerateForecasts || !canEditPlanning || forecastGenerating}
											aria-label={t('planning_generate_forecasts')}
											className={`inline-flex h-10 items-center rounded-lg border border-indigo-200 bg-white px-4 text-sm font-medium text-indigo-700 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-indigo-700 dark:bg-gray-800 dark:text-indigo-300 dark:focus:ring-offset-gray-900 ${!canGenerateForecasts || !canEditPlanning ? 'pointer-events-none cursor-not-allowed opacity-50' : 'hover:border-indigo-300 hover:bg-indigo-50 dark:hover:border-indigo-600 dark:hover:bg-indigo-950/40'}`}
										>
											{t('planning_generate_forecasts')}
										</button>
									</span>
								</TooltipHint>
							</div>
						</div>
					</div>

					<div className="mt-3" data-planning-wizard-step="planning-summary">
						<PlanningExecutiveTags
							client={selectedClient}
							teamMembers={teamMembers}
							scheduleSummary={scheduleSummary}
							canEdit={canEditPlanning}
							saving={savingClient}
							t={t}
							onBriefingPatch={(updater) => onBriefingPatch(selectedClient.id, updater)}
							onClientPatch={(patch) => onClientPatch(selectedClient.id, patch)}
						/>
					</div>

					<PlanningMonthContentBlock
						client={selectedClient}
						canEdit={canEditPlanning}
						saving={savingClient}
						t={t}
						onBriefingPatch={(updater) => onBriefingPatch(selectedClient.id, updater)}
					/>
				</>
			) : null}
		</section>
	);
});

export type { ClientScheduleSummary };
