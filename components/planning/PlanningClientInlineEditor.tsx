import React, { useMemo, useState, useEffect } from 'react';
import type { Client, User } from '../../types';
import type { ApprovalChannel } from '../../lib/briefingV2/types';
import { patchClientBriefing } from '../../lib/briefingV2';
import { migrateClientToBriefingV2 } from '../../lib/briefingV2/migrate';
import { defaultClientOwnerPreferences } from '../../lib/client-owner-preferences';
import { getActivePostEligibleOwners } from '../../lib/agencyOperational';
import { TagsInput } from '../clients/briefing/TagsInput';

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
type DayKey = (typeof DAY_ORDER)[number];

const DAY_I18N: Record<DayKey, string> = {
	mon: 'day_mon',
	tue: 'day_tue',
	wed: 'day_wed',
	thu: 'day_thu',
	fri: 'day_fri',
	sat: 'day_sat',
	sun: 'day_sun',
};

const APPROVAL_CHANNELS: ApprovalChannel[] = ['whatsapp', 'email', 'trello', 'clickup', 'other'];

function sortDays(days: string[]): string[] {
	const set = new Set(days);
	return DAY_ORDER.filter((d) => set.has(d));
}

type PlanningClientInlineEditorProps = {
	client: Client;
	teamMembers: User[];
	canEdit: boolean;
	saving?: boolean;
	t: (key: string, vars?: Record<string, string | number>) => string;
	onBriefingPatch: (updater: Parameters<typeof patchClientBriefing>[1]) => void;
	onClientPatch: (patch: Partial<Client>) => void;
};

const fieldClass =
	'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-white';
const labelClass = 'text-xs font-medium text-gray-500 dark:text-gray-400';
const sectionTitleClass = 'text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300';

const InlineSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
	<div className="space-y-3 border-t border-gray-100 pt-4 dark:border-gray-800">
		<h4 className={sectionTitleClass}>{title}</h4>
		{children}
	</div>
);

export const PlanningClientInlineEditor: React.FC<PlanningClientInlineEditorProps> = ({
	client,
	teamMembers,
	canEdit,
	saving = false,
	t,
	onBriefingPatch,
	onClientPatch,
}) => {
	const briefing = useMemo(() => client.briefingV2 ?? migrateClientToBriefingV2(client), [client]);
	const freq = briefing.planning.frequency;
	const preferredDays = sortDays(briefing.planning.preferredPostDays ?? []);
	const op = briefing.planning.operation;

	const [monthFocusDraft, setMonthFocusDraft] = useState(briefing.content.monthFocus ?? '');
	useEffect(() => {
		setMonthFocusDraft(briefing.content.monthFocus ?? '');
	}, [client.id, briefing.content.monthFocus]);

	const ownerOptions = useMemo(() => getActivePostEligibleOwners(teamMembers), [teamMembers]);
	const prefs = client.ownerPreferences ?? defaultClientOwnerPreferences();
	const rawLegacy = (client.planningAccountOwner || '').trim();
	const prefsId = (prefs.defaultOwnerUserId || '').trim();
	const eligibleIds = new Set(ownerOptions.map((m) => m.id));
	const resolvedOwnerId = prefsId || (rawLegacy && eligibleIds.has(rawLegacy) ? rawLegacy : '');
	const ownerSelectValue =
		!resolvedOwnerId && !rawLegacy
			? ''
			: eligibleIds.has(resolvedOwnerId)
			  ? resolvedOwnerId
			  : rawLegacy
			    ? `__legacy__:${rawLegacy}`
			    : '';

	const patch = (updater: Parameters<typeof patchClientBriefing>[1]) => {
		if (!canEdit || saving) return;
		onBriefingPatch(updater);
	};

	const setOwner = (value: string) => {
		if (!canEdit || saving) return;
		if (!value) {
			onClientPatch({
				ownerPreferences: { ...prefs, defaultOwnerUserId: null, useDefaultOwnerForAllStages: true },
				planningAccountOwner: '',
			});
			return;
		}
		if (value.startsWith('__legacy__:')) {
			onClientPatch({
				planningAccountOwner: value.slice('__legacy__:'.length),
				ownerPreferences: { ...prefs, defaultOwnerUserId: null, useDefaultOwnerForAllStages: true },
			});
			return;
		}
		onClientPatch({
			ownerPreferences: { ...prefs, defaultOwnerUserId: value, useDefaultOwnerForAllStages: true },
			planningAccountOwner: value,
		});
	};

	const toggleDay = (day: DayKey) => {
		const set = new Set(preferredDays);
		if (set.has(day)) set.delete(day);
		else set.add(day);
		patch((b) => ({
			...b,
			planning: { ...b.planning, preferredPostDays: sortDays(Array.from(set)) },
		}));
	};

	const disabled = !canEdit || saving;

	return (
		<div className="mt-4 space-y-0" data-planning-wizard-step="planning-summary">
			<InlineSection title={t('planning_summary_planning_title')}>
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					<div>
						<label className={labelClass}>{t('planning_frequency_quantity')}</label>
						<input
							type="number"
							min={1}
							max={99}
							disabled={disabled || freq.variable}
							value={freq.quantity ?? ''}
							placeholder={t('planning_placeholder_fill')}
							onChange={(e) => {
								const v = e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0;
								if (v === '') return;
								patch((b) => ({
									...b,
									planning: {
										...b.planning,
										frequency: { quantity: Math.min(99, Math.max(1, v)), period: freq.period ?? 'week', variable: false },
									},
								}));
							}}
							className={`${fieldClass} mt-1`}
						/>
					</div>
					<div>
						<label className={labelClass}>{t('planning_frequency_period')}</label>
						<select
							disabled={disabled || freq.variable}
							value={freq.period ?? 'week'}
							onChange={(e) =>
								patch((b) => ({
									...b,
									planning: {
										...b.planning,
										frequency: {
											quantity: freq.quantity ?? 1,
											period: e.target.value as 'week' | 'month',
											variable: false,
										},
									},
								}))
							}
							className={`${fieldClass} mt-1`}
						>
							<option value="week">{t('planning_frequency_per_week')}</option>
							<option value="month">{t('planning_frequency_per_month')}</option>
						</select>
					</div>
				</div>
				<label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
					<input
						type="checkbox"
						checked={!!freq.variable}
						disabled={disabled}
						onChange={(e) =>
							patch((b) => ({
								...b,
								planning: {
									...b.planning,
									frequency: e.target.checked
										? { quantity: undefined, period: undefined, variable: true }
										: { quantity: freq.quantity ?? 1, period: freq.period ?? 'week', variable: false },
								},
							}))
						}
						className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
					/>
					{t('planning_frequency_variable')}
				</label>
				<div>
					<p className={labelClass}>{t('preferred_post_days')}</p>
					<div className="mt-1.5 flex flex-wrap gap-1.5">
						{DAY_ORDER.map((day) => {
							const active = preferredDays.includes(day);
							return (
								<button
									key={day}
									type="button"
									disabled={disabled}
									onClick={() => toggleDay(day)}
									className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
										active
											? 'bg-indigo-600 text-white'
											: 'border border-gray-200 bg-white text-gray-600 hover:border-indigo-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
									} disabled:opacity-50`}
								>
									{t(DAY_I18N[day])}
								</button>
							);
						})}
					</div>
				</div>
			</InlineSection>

			<InlineSection title={t('planning_summary_content_title')}>
				<div>
					<label className={labelClass}>{t('briefing_month_focus')}</label>
					<textarea
						rows={2}
						disabled={disabled}
						value={monthFocusDraft}
						placeholder={t('planning_placeholder_fill')}
						onChange={(e) => setMonthFocusDraft(e.target.value)}
						onBlur={() => {
							if (monthFocusDraft === (briefing.content.monthFocus ?? '')) return;
							patch((b) => ({
								...b,
								content: { ...b.content, monthFocus: monthFocusDraft },
							}));
						}}
						className={`${fieldClass} mt-1 resize-y`}
					/>
				</div>
				<TagsInput
					label={t('briefing_content_pillars')}
					tags={briefing.content.pillarsTags}
					onChange={(tags) => patch((b) => ({ ...b, content: { ...b.content, pillarsTags: tags } }))}
					placeholder={t('planning_placeholder_add_pillars')}
				/>
			</InlineSection>

			<InlineSection title={t('planning_summary_operation_title')}>
				<div className="grid gap-3 sm:grid-cols-2">
					<div>
						<label className={labelClass}>{t('client_responsible_by_client_label')}</label>
						<select
							disabled={disabled}
							value={ownerSelectValue}
							onChange={(e) => setOwner(e.target.value)}
							className={`${fieldClass} mt-1`}
						>
							<option value="">{t('planning_placeholder_select')}</option>
							{ownerOptions.map((m) => (
								<option key={m.id} value={m.id}>
									{m.name}
								</option>
							))}
						</select>
					</div>
					<div>
						<label className={labelClass}>{t('planning_approval_required')}</label>
						<select
							disabled={disabled}
							value={op.approvalRequired == null ? '' : op.approvalRequired ? 'yes' : 'no'}
							onChange={(e) => {
								const v = e.target.value;
								patch((b) => ({
									...b,
									planning: {
										...b.planning,
										operation: {
											...b.planning.operation,
											approvalRequired: v === '' ? undefined : v === 'yes',
										},
									},
								}));
							}}
							className={`${fieldClass} mt-1`}
						>
							<option value="">{t('planning_placeholder_select')}</option>
							<option value="yes">{t('yes')}</option>
							<option value="no">{t('no')}</option>
						</select>
					</div>
					<div>
						<label className={labelClass}>{t('briefing_approval_channel')}</label>
						<select
							disabled={disabled}
							value={op.approvalChannel || ''}
							onChange={(e) =>
								patch((b) => ({
									...b,
									planning: {
										...b.planning,
										operation: {
											...b.planning.operation,
											approvalChannel: e.target.value as ApprovalChannel,
										},
									},
								}))
							}
							className={`${fieldClass} mt-1`}
						>
							<option value="">{t('planning_placeholder_select')}</option>
							{APPROVAL_CHANNELS.map((ch) => (
								<option key={ch} value={ch}>
									{t(`briefing_channel_${ch}`)}
								</option>
							))}
						</select>
					</div>
				</div>
			</InlineSection>

			{saving ? (
				<p className="border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
					{t('planning_inline_saving')}
				</p>
			) : null}
		</div>
	);
};
