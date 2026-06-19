import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Client, User } from '../../types';
import type { patchClientBriefing } from '../../lib/briefingV2';
import { patchClientBriefing as patchFn } from '../../lib/briefingV2';
import { resolveClientBriefing } from '../../lib/briefingV2/migrate';
import { defaultClientOwnerPreferences } from '../../lib/client-owner-preferences';
import { getActivePostEligibleOwners } from '../../lib/agencyOperational';
import {
	formatFriendlyFrequency,
	formatOverduePostsIndicator,
	formatPreferredDayShort,
	formatScheduleIndicator,
} from '../../lib/planningFriendlyLabels';
import type { ClientScheduleSummary } from '../../lib/planningSchedule';
import { logPlanningTagTrace, resolvePlanningFrequency } from '../../lib/planningSchedule';
import {
	buildPlanningFrequencyUpdater,
	parseFrequencyQtyDraft,
	sanitizeFrequencyQtyInput,
} from '../../lib/planningFrequencyEdit';

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
type DayKey = (typeof DAY_ORDER)[number];
type EditMode = 'frequency' | 'day' | null;

const DAY_I18N: Record<DayKey, string> = {
	mon: 'day_mon_short',
	tue: 'day_tue_short',
	wed: 'day_wed_short',
	thu: 'day_thu_short',
	fri: 'day_fri_short',
	sat: 'day_sat_short',
	sun: 'day_sun_short',
};

function sortDays(days: string[]): string[] {
	const set = new Set(days);
	return DAY_ORDER.filter((d) => set.has(d));
}

type PlanningExecutiveTagsProps = {
	client: Client;
	teamMembers: User[];
	scheduleSummary: ClientScheduleSummary | null;
	overduePostsCount: number;
	canEdit: boolean;
	saving?: boolean;
	t: (key: string, vars?: Record<string, string | number>) => string;
	onBriefingPatch: (updater: Parameters<typeof patchClientBriefing>[1]) => void;
	onClientPatch: (patch: Partial<Client>) => void;
};

const tagBase =
	'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors';
const tagInteractive = `${tagBase} cursor-pointer border-gray-200 bg-gray-50 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/80 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-indigo-500`;
const tagWarning = `${tagBase} border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200`;
const tagOk = `${tagBase} border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200`;
const tagOverdueAlert = `${tagBase} border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200`;
const tagOverdueNeutral = `${tagBase} border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-500`;
const tagOwnerEmpty = `${tagBase} cursor-pointer border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:bg-gray-700/80`;
const tagOwnerFilled =
	'inline-flex cursor-pointer items-center rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600';
const ownerDropdownPanelClass =
	'absolute right-0 top-full z-50 mt-1 min-w-[180px] max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg ring-1 ring-gray-900/5 dark:border-gray-600 dark:bg-gray-800 dark:ring-white/10';
const ownerDropdownItemClass =
	'flex w-full items-center px-3 py-2 text-left text-xs text-gray-700 transition hover:bg-indigo-50 dark:text-gray-200 dark:hover:bg-indigo-950/40';
const ownerDropdownItemActiveClass =
	'bg-indigo-50 font-medium text-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-100';

const inlineInputClass =
	'w-9 rounded border border-indigo-300 bg-white px-1 py-0.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-indigo-600 dark:bg-gray-900 dark:text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';
const inlinePeriodTriggerClass =
	'inline-flex items-center gap-0.5 rounded border border-indigo-300 bg-white py-0.5 pl-1.5 pr-1 text-xs text-gray-900 hover:bg-indigo-50/80 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-indigo-600 dark:bg-gray-900 dark:text-white dark:hover:bg-indigo-950/40';
const periodDropdownPanelClass =
	'absolute left-0 top-full z-50 mt-0.5 min-w-[120px] rounded-lg border border-gray-200 bg-white py-0.5 shadow-lg ring-1 ring-gray-900/5 dark:border-gray-600 dark:bg-gray-800 dark:ring-white/10';
const periodDropdownItemClass =
	'flex w-full items-center px-2.5 py-1.5 text-left text-xs text-gray-700 transition hover:bg-indigo-50 dark:text-gray-200 dark:hover:bg-indigo-950/40';
const periodDropdownItemActiveClass =
	'bg-indigo-50 font-medium text-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-100';

export const PlanningExecutiveTags: React.FC<PlanningExecutiveTagsProps> = ({
	client,
	teamMembers,
	scheduleSummary,
	overduePostsCount,
	canEdit,
	saving = false,
	t,
	onBriefingPatch,
	onClientPatch,
}) => {
	const briefing = useMemo(() => resolveClientBriefing(client), [client]);
	const [editMode, setEditMode] = useState<EditMode>(null);
	const [ownerOpen, setOwnerOpen] = useState(false);
	const [periodOpen, setPeriodOpen] = useState(false);
	const wrapRef = useRef<HTMLDivElement>(null);
	const freqEditRef = useRef<HTMLSpanElement>(null);

	const freq = briefing.planning.frequency;
	const preferredDays = sortDays(briefing.planning.preferredPostDays ?? []);

	const ownerOptions = useMemo(() => getActivePostEligibleOwners(teamMembers), [teamMembers]);
	const prefs = client.ownerPreferences ?? defaultClientOwnerPreferences();
	const rawLegacy = (client.planningAccountOwner || '').trim();
	const prefsId = (prefs.defaultOwnerUserId || '').trim();
	const eligibleIds = new Set(ownerOptions.map((m) => m.id));
	const resolvedOwnerId = prefsId || (rawLegacy && eligibleIds.has(rawLegacy) ? rawLegacy : '');
	const ownerName =
		ownerOptions.find((m) => m.id === resolvedOwnerId)?.name ||
		(rawLegacy && !resolvedOwnerId ? rawLegacy : '') ||
		'';

	const hasOwner = Boolean(ownerName);

	const scheduleTag = scheduleSummary
		? formatScheduleIndicator(
				scheduleSummary.plannedCount,
				scheduleSummary.goal,
				scheduleSummary.remainingCount,
				t,
			)
		: null;
	const scheduleLabel = scheduleTag?.label ?? null;
	const overdueTag = formatOverduePostsIndicator(overduePostsCount, t);

	useEffect(() => {
		if (!import.meta.env.DEV || !scheduleSummary || scheduleLabel == null) return;
		if (!/janete/i.test(client.name || '')) return;
		logPlanningTagTrace({
			stage: 'PlanningExecutiveTags',
			clientName: client.name,
			monthAnchor: scheduleSummary.monthStart,
			frequencyResolved: resolvePlanningFrequency(client),
			monthlyGoalFromSchedule: scheduleSummary.goal,
			plannedCountFromSchedule: scheduleSummary.plannedCount,
			remainingCountFromSchedule: scheduleSummary.remainingCount,
			scheduleSummaryReceivedByTags: scheduleSummary,
			labelRendered: scheduleLabel,
		});
	}, [client, scheduleSummary, scheduleLabel]);

	const [freqQtyDraft, setFreqQtyDraft] = useState(String(freq.quantity ?? ''));
	const [freqPeriodDraft, setFreqPeriodDraft] = useState<'week' | 'month'>(freq.period ?? 'week');
	useEffect(() => {
		setFreqQtyDraft(String(freq.quantity ?? ''));
		setFreqPeriodDraft(freq.period ?? 'week');
	}, [client.id, freq.quantity, freq.period, freq.variable]);

	const patch = (updater: Parameters<typeof patchFn>[1]) => {
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

	const saveFrequency = useCallback(
		(qty: number, period: 'week' | 'month') => {
			if (!canEdit || saving) return;
			onBriefingPatch(buildPlanningFrequencyUpdater(qty, period));
			setEditMode(null);
			setPeriodOpen(false);
		},
		[onBriefingPatch, canEdit, saving],
	);

	const cancelFrequencyEdit = useCallback(() => {
		setFreqQtyDraft(String(freq.quantity ?? ''));
		setFreqPeriodDraft(freq.period ?? 'week');
		setPeriodOpen(false);
		setEditMode(null);
	}, [freq.quantity, freq.period]);

	const commitFrequencyEdit = useCallback(() => {
		const qty = parseFrequencyQtyDraft(freqQtyDraft);
		if (qty == null) {
			cancelFrequencyEdit();
			return;
		}
		const unchanged =
			qty === freq.quantity && freqPeriodDraft === (freq.period ?? 'week') && !freq.variable;
		if (unchanged) {
			cancelFrequencyEdit();
			return;
		}
		saveFrequency(qty, freqPeriodDraft);
	}, [freqQtyDraft, freqPeriodDraft, freq.quantity, freq.period, freq.variable, cancelFrequencyEdit, saveFrequency]);

	const selectPeriod = useCallback(
		(period: 'week' | 'month') => {
			setFreqPeriodDraft(period);
			setPeriodOpen(false);
			const qty = parseFrequencyQtyDraft(freqQtyDraft) ?? freq.quantity ?? 1;
			if (period === (freq.period ?? 'week') && qty === freq.quantity && !freq.variable) {
				cancelFrequencyEdit();
				return;
			}
			saveFrequency(qty, period);
		},
		[freqQtyDraft, freq.quantity, freq.period, freq.variable, cancelFrequencyEdit, saveFrequency],
	);

	useEffect(() => {
		if (!editMode && !ownerOpen && !periodOpen) return;
		const onDocClick = (e: MouseEvent) => {
			const target = e.target as Node;
			if (periodOpen && freqEditRef.current && !freqEditRef.current.contains(target)) {
				setPeriodOpen(false);
			}
			if (wrapRef.current && !wrapRef.current.contains(target)) {
				if (editMode === 'frequency') commitFrequencyEdit();
				else setEditMode(null);
				setOwnerOpen(false);
				setPeriodOpen(false);
			}
		};
		document.addEventListener('mousedown', onDocClick);
		return () => document.removeEventListener('mousedown', onDocClick);
	}, [editMode, ownerOpen, periodOpen, commitFrequencyEdit]);

	const toggleDay = (day: DayKey) => {
		const set = new Set(preferredDays);
		if (set.has(day)) set.delete(day);
		else set.add(day);
		patch((b) => ({
			...b,
			planning: { ...b.planning, preferredPostDays: sortDays(Array.from(set)) },
		}));
	};

	const openEdit = (mode: EditMode) => {
		if (!canEdit || saving) return;
		setOwnerOpen(false);
		if (editMode === 'frequency' && mode !== 'frequency') commitFrequencyEdit();
		setPeriodOpen(false);
		if (mode === 'frequency') {
			setFreqQtyDraft(String(freq.quantity ?? ''));
			setFreqPeriodDraft(freq.period ?? 'week');
			setEditMode('frequency');
		} else {
			setEditMode(mode);
		}
	};

	const openOwnerPicker = () => {
		if (!canEdit || saving) return;
		if (editMode === 'frequency') commitFrequencyEdit();
		setEditMode(null);
		setPeriodOpen(false);
		setOwnerOpen(true);
	};

	return (
		<div ref={wrapRef} className="flex flex-wrap items-start justify-between gap-3">
			<div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
				{editMode === 'frequency' ? (
					<span
						ref={freqEditRef}
						className={`${tagBase} relative border-indigo-300 bg-indigo-50/60 dark:border-indigo-600 dark:bg-indigo-950/30`}
					>
						<input
							type="text"
							inputMode="numeric"
							autoComplete="off"
							autoFocus
							value={freqQtyDraft}
							onChange={(e) => setFreqQtyDraft(sanitizeFrequencyQtyInput(e.target.value))}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									commitFrequencyEdit();
								}
								if (e.key === 'Escape') {
									e.preventDefault();
									cancelFrequencyEdit();
								}
							}}
							className={inlineInputClass}
							aria-label={t('planning_frequency_quantity')}
						/>
						<div className="relative">
							<button
								type="button"
								onMouseDown={(e) => e.preventDefault()}
								onClick={() => setPeriodOpen((open) => !open)}
								className={inlinePeriodTriggerClass}
								aria-expanded={periodOpen}
								aria-haspopup="listbox"
							>
								{freqPeriodDraft === 'month'
									? t('planning_freq_period_month_short')
									: t('planning_freq_period_week_short')}
							</button>
							{periodOpen ? (
								<div role="listbox" className={periodDropdownPanelClass}>
									{(['week', 'month'] as const).map((period) => {
										const isActive = freqPeriodDraft === period;
										const label =
											period === 'week'
												? t('planning_freq_period_week_short')
												: t('planning_freq_period_month_short');
										return (
											<button
												key={period}
												type="button"
												role="option"
												aria-selected={isActive}
												className={`${periodDropdownItemClass} ${isActive ? periodDropdownItemActiveClass : ''}`}
												onMouseDown={(e) => e.preventDefault()}
												onClick={() => selectPeriod(period)}
											>
												{label}
											</button>
										);
									})}
								</div>
							) : null}
						</div>
					</span>
				) : (
					<button type="button" onClick={() => openEdit('frequency')} className={tagInteractive} disabled={!canEdit}>
						{formatFriendlyFrequency(briefing, t)}
					</button>
				)}

				{editMode === 'day' ? (
					<span className={`${tagBase} flex-wrap border-indigo-300 bg-indigo-50/60 dark:border-indigo-600 dark:bg-indigo-950/30`}>
						{DAY_ORDER.map((day) => (
							<button
								key={day}
								type="button"
								onClick={() => toggleDay(day)}
								className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
									preferredDays.includes(day)
										? 'bg-indigo-600 text-white'
										: 'text-gray-600 hover:bg-indigo-100 dark:text-gray-300'
								}`}
							>
								{t(DAY_I18N[day])}
							</button>
						))}
					</span>
				) : (
					<button type="button" onClick={() => openEdit('day')} className={tagInteractive} disabled={!canEdit}>
						{preferredDays.length ? formatPreferredDayShort(preferredDays, t) : t('planning_day_tag_empty')}
					</button>
				)}

				{scheduleTag ? (
					<span className={scheduleTag.tone === 'warning' ? tagWarning : tagOk}>{scheduleTag.label}</span>
				) : null}

				<span className={overdueTag.tone === 'alert' ? tagOverdueAlert : tagOverdueNeutral}>{overdueTag.label}</span>

				{saving ? (
					<span className="text-[10px] text-gray-400 dark:text-gray-500">{t('planning_inline_saving')}</span>
				) : null}
			</div>

			<div className="relative shrink-0">
				<button
					type="button"
					onClick={openOwnerPicker}
					disabled={!canEdit}
					className={hasOwner ? tagOwnerFilled : tagOwnerEmpty}
					aria-expanded={ownerOpen}
					aria-haspopup="listbox"
				>
					{hasOwner ? ownerName : t('planning_owner_tag_empty')}
				</button>
				{ownerOpen ? (
					<div role="listbox" className={ownerDropdownPanelClass}>
						{ownerOptions.map((m) => {
							const isActive = m.id === resolvedOwnerId;
							return (
								<button
									key={m.id}
									type="button"
									role="option"
									aria-selected={isActive}
									className={`${ownerDropdownItemClass} ${isActive ? ownerDropdownItemActiveClass : ''}`}
									onClick={() => {
										setOwner(m.id);
										setOwnerOpen(false);
									}}
								>
									{m.name}
								</button>
							);
						})}
						{rawLegacy && !eligibleIds.has(resolvedOwnerId) ? (
							<button
								type="button"
								role="option"
								aria-selected={!resolvedOwnerId}
								className={`${ownerDropdownItemClass} ${!resolvedOwnerId ? ownerDropdownItemActiveClass : ''}`}
								onClick={() => {
									setOwner(`__legacy__:${rawLegacy}`);
									setOwnerOpen(false);
								}}
							>
								{rawLegacy}
							</button>
						) : null}
					</div>
				) : null}
			</div>
		</div>
	);
};
