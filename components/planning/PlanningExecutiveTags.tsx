import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Client, User } from '../../types';
import type { patchClientBriefing } from '../../lib/briefingV2';
import { patchClientBriefing as patchFn } from '../../lib/briefingV2';
import { resolveClientBriefing } from '../../lib/briefingV2/migrate';
import { defaultClientOwnerPreferences } from '../../lib/client-owner-preferences';
import { getActivePostEligibleOwners } from '../../lib/agencyOperational';
import {
	formatFriendlyFrequency,
	formatPreferredDayShort,
	formatScheduleIndicator,
} from '../../lib/planningFriendlyLabels';
import { briefingStatusLabelKey } from '../../lib/planningBriefingSummary';
import { getBriefingOverallStatus } from '../../lib/clientBriefingProgress';
import type { ClientScheduleSummary } from '../../lib/planningSchedule';

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
type DayKey = (typeof DAY_ORDER)[number];
type EditMode = 'frequency' | 'day' | 'owner' | null;

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

const inlineInputClass =
	'w-12 rounded border border-indigo-300 bg-white px-1 py-0.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-indigo-600 dark:bg-gray-900 dark:text-white';
const inlineSelectClass =
	'rounded border border-indigo-300 bg-white py-0.5 pl-1 pr-6 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-indigo-600 dark:bg-gray-900 dark:text-white';

export const PlanningExecutiveTags: React.FC<PlanningExecutiveTagsProps> = ({
	client,
	teamMembers,
	scheduleSummary,
	canEdit,
	saving = false,
	t,
	onBriefingPatch,
	onClientPatch,
}) => {
	const briefing = useMemo(() => resolveClientBriefing(client), [client]);
	const [editMode, setEditMode] = useState<EditMode>(null);
	const wrapRef = useRef<HTMLDivElement>(null);

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

	const ownerSelectValue =
		!resolvedOwnerId && !rawLegacy
			? ''
			: eligibleIds.has(resolvedOwnerId)
			  ? resolvedOwnerId
			  : rawLegacy
			    ? `__legacy__:${rawLegacy}`
			    : '';

	const scheduleTag = scheduleSummary
		? formatScheduleIndicator(scheduleSummary.planned, scheduleSummary.goal, scheduleSummary.missing, t)
		: null;

	const [freqQtyDraft, setFreqQtyDraft] = useState(String(freq.quantity ?? ''));
	useEffect(() => {
		setFreqQtyDraft(String(freq.quantity ?? ''));
	}, [client.id, freq.quantity, freq.period, freq.variable]);

	useEffect(() => {
		if (!editMode) return;
		const onDocClick = (e: MouseEvent) => {
			if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
				setEditMode(null);
			}
		};
		document.addEventListener('mousedown', onDocClick);
		return () => document.removeEventListener('mousedown', onDocClick);
	}, [editMode]);

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

	const saveFrequency = (qty: number, period: 'week' | 'month') => {
		patch((b) => ({
			...b,
			planning: {
				...b.planning,
				frequency: { quantity: qty, period, variable: false },
			},
		}));
		setEditMode(null);
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

	const openEdit = (mode: EditMode) => {
		if (!canEdit || saving) return;
		setEditMode(mode);
	};

	return (
		<div ref={wrapRef} className="flex flex-wrap items-start justify-between gap-3">
			<div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
				{editMode === 'frequency' ? (
					<span className={`${tagBase} border-indigo-300 bg-indigo-50/60 dark:border-indigo-600 dark:bg-indigo-950/30`}>
						<input
							type="number"
							min={1}
							max={99}
							autoFocus
							value={freqQtyDraft}
							onChange={(e) => setFreqQtyDraft(e.target.value)}
							onBlur={() => {
								const n = parseInt(freqQtyDraft, 10);
								if (!Number.isNaN(n) && n >= 1) saveFrequency(Math.min(99, n), freq.period ?? 'week');
								else setEditMode(null);
							}}
							className={inlineInputClass}
						/>
						<select
							value={freq.period ?? 'week'}
							onChange={(e) => {
								const n = parseInt(freqQtyDraft, 10) || freq.quantity || 1;
								saveFrequency(Math.min(99, Math.max(1, n)), e.target.value as 'week' | 'month');
							}}
							className={inlineSelectClass}
						>
							<option value="week">{t('planning_freq_period_week_short')}</option>
							<option value="month">{t('planning_freq_period_month_short')}</option>
						</select>
					</span>
				) : (
					<button type="button" onClick={() => openEdit('frequency')} className={tagInteractive} disabled={!canEdit}>
						{formatFriendlyFrequency(briefing, t)}
					</button>
				)}

				<span className={`${tagBase} border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200`}>
					{t(briefingStatusLabelKey(getBriefingOverallStatus(client)))}
				</span>

				{scheduleTag ? (
					<span className={scheduleTag.tone === 'warning' ? tagWarning : tagOk}>{scheduleTag.label}</span>
				) : null}

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

				{saving ? (
					<span className="text-[10px] text-gray-400 dark:text-gray-500">{t('planning_inline_saving')}</span>
				) : null}
			</div>

			<div className="shrink-0">
				{editMode === 'owner' ? (
					<select
						autoFocus
						value={ownerSelectValue}
						onChange={(e) => {
							setOwner(e.target.value);
							setEditMode(null);
						}}
						onBlur={() => setEditMode(null)}
						className="rounded-full border-0 bg-indigo-600 py-1 pl-3 pr-8 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-indigo-500"
					>
						<option value="">{t('planning_placeholder_select')}</option>
						{ownerOptions.map((m) => (
							<option key={m.id} value={m.id}>
								{m.name}
							</option>
						))}
					</select>
				) : (
					<button
						type="button"
						onClick={() => openEdit('owner')}
						disabled={!canEdit}
						className="inline-flex items-center rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
					>
						{ownerName || t('planning_owner_tag_empty')}
					</button>
				)}
			</div>
		</div>
	);
};
