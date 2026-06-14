import React, { useEffect, useMemo, useState } from 'react';
import type { Client } from '../../types';
import type { patchClientBriefing } from '../../lib/briefingV2';
import { resolveClientBriefing } from '../../lib/briefingV2/migrate';
import { getBriefingMonthFields } from '../../lib/planningSchedule';
import { TagsInput } from '../clients/briefing/TagsInput';

type EditField = 'monthObjective' | 'pillars' | null;

type PlanningMonthContentBlockProps = {
	client: Client;
	canEdit: boolean;
	saving?: boolean;
	t: (key: string, vars?: Record<string, string | number>) => string;
	onBriefingPatch: (updater: Parameters<typeof patchClientBriefing>[1]) => void;
};

const labelClass = 'text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400';
const valueClass =
	'mt-0.5 text-sm text-gray-800 dark:text-gray-200 cursor-pointer rounded px-1 -mx-1 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/30';
const emptyClass = 'mt-0.5 text-sm italic text-gray-400 dark:text-gray-500';
const inputClass =
	'mt-0.5 w-full rounded border border-indigo-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-indigo-600 dark:bg-gray-900 dark:text-white';

export const PlanningMonthContentBlock: React.FC<PlanningMonthContentBlockProps> = ({
	client,
	canEdit,
	saving = false,
	t,
	onBriefingPatch,
}) => {
	const briefing = useMemo(() => resolveClientBriefing(client), [client]);
	const fields = useMemo(() => getBriefingMonthFields(briefing), [briefing]);

	const [editField, setEditField] = useState<EditField>(null);
	const [objectiveDraft, setObjectiveDraft] = useState(fields.monthObjective);

	useEffect(() => {
		setObjectiveDraft(fields.monthObjective);
	}, [client.id, fields.monthObjective]);

	const patch = (updater: Parameters<typeof patchClientBriefing>[1]) => {
		if (!canEdit || saving) return;
		onBriefingPatch(updater);
	};

	const saveObjective = () => {
		const v = objectiveDraft.trim();
		patch((b) => ({ ...b, content: { ...b.content, currentCampaignObjective: v } }));
		setEditField(null);
	};

	const pillarsDisplay = fields.pillars.length ? fields.pillars.join(' • ') : '';

	const openEdit = (field: EditField) => {
		if (!canEdit || saving) return;
		setEditField(field);
	};

	return (
		<div className="mt-4 space-y-3 border-t border-gray-100 pt-4 dark:border-gray-800">
			<div>
				<p className={labelClass}>{t('planning_month_objective_label')}</p>
				{editField === 'monthObjective' ? (
					<input
						type="text"
						autoFocus
						value={objectiveDraft}
						onChange={(e) => setObjectiveDraft(e.target.value)}
						onBlur={saveObjective}
						onKeyDown={(e) => {
							if (e.key === 'Enter') saveObjective();
							if (e.key === 'Escape') {
								setObjectiveDraft(fields.monthObjective);
								setEditField(null);
							}
						}}
						className={inputClass}
						placeholder={t('briefing_current_campaign_placeholder')}
					/>
				) : (
					<p
						className={fields.monthObjective ? valueClass : emptyClass}
						onClick={() => openEdit('monthObjective')}
						role={canEdit ? 'button' : undefined}
						tabIndex={canEdit ? 0 : undefined}
						onKeyDown={(e) => e.key === 'Enter' && openEdit('monthObjective')}
					>
						{fields.monthObjective || t('planning_click_to_define')}
					</p>
				)}
			</div>

			<div>
				<p className={labelClass}>{t('planning_pillars_label')}</p>
				{editField === 'pillars' ? (
					<div className="mt-1">
						<TagsInput
							label=""
							tags={briefing.content.pillarsTags ?? []}
							onChange={(tags) => patch((b) => ({ ...b, content: { ...b.content, pillarsTags: tags } }))}
							placeholder={t('planning_placeholder_add_pillars')}
						/>
						<button
							type="button"
							onClick={() => setEditField(null)}
							className="mt-1 text-xs text-indigo-600 hover:underline dark:text-indigo-400"
						>
							{t('done')}
						</button>
					</div>
				) : (
					<p
						className={pillarsDisplay ? valueClass : emptyClass}
						onClick={() => openEdit('pillars')}
						role={canEdit ? 'button' : undefined}
						tabIndex={canEdit ? 0 : undefined}
						onKeyDown={(e) => e.key === 'Enter' && openEdit('pillars')}
					>
						{pillarsDisplay || t('planning_click_to_define')}
					</p>
				)}
			</div>
		</div>
	);
};
