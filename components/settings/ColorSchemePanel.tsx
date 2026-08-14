import React from 'react';
import type { ColorSchemeAreaPreference, StatusDefinition } from '../../types';
import { CheckIcon, EditIcon, TrashIcon } from '../icons';
import TooltipHint from '../TooltipHint';

type Translate = (key: string) => string;
type SchemeKind = 'default' | 'custom';
type ActionState = 'idle' | 'saving' | 'success' | 'error';

export interface ColorSchemeStatusRow {
	id: string;
	labelKey: string;
	color: StatusDefinition['color'];
}

interface Props {
	t: Translate;
	canManage: boolean;
	selectedScheme: SchemeKind;
	draftArea: ColorSchemeAreaPreference;
	committedArea: ColorSchemeAreaPreference;
	displayedCustom: ColorSchemeAreaPreference['custom'];
	isNewUnsavedCustom: boolean;
	isPendingCustomDeletion: boolean;
	editingInlineName: boolean;
	nameDraft: string;
	nameInputRef: React.RefObject<HTMLInputElement | null>;
	skipRenameBlurRef: React.MutableRefObject<boolean>;
	statusRows: ColorSchemeStatusRow[];
	showPickers: boolean;
	isContentDirty: boolean;
	saveState: ActionState;
	applyState: ActionState;
	onSelect: (scheme: SchemeKind) => void;
	onApply: () => void;
	onNameChange: (name: string) => void;
	onCancelRename: () => void;
	onCommitRename: () => void;
	onStartRename: () => void;
	onDeleteCustom: () => void;
	onNewScheme: () => void;
	onColorClick: (statusId: string, element: HTMLElement) => void;
	onSave: () => void;
}

const SelectionDot: React.FC<{ selected: boolean }> = ({ selected }) => (
	<span
		className={`inline-flex h-4 w-4 items-center justify-center rounded-full border ${
			selected ? 'border-violet-500' : 'border-gray-300 dark:border-gray-600'
		}`}
	>
		{selected ? <span className="h-2 w-2 rounded-full bg-violet-600 dark:bg-violet-400" /> : null}
	</span>
);

const InUseBadge: React.FC<{ label: string }> = ({ label }) => (
	<span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-300">
		{label}
	</span>
);

const SchemeRow: React.FC<{ kind: SchemeKind; panel: Props }> = ({ kind, panel }) => {
	const isCustom = kind === 'custom';
	if (isCustom && !panel.displayedCustom) return null;

	const selected = panel.selectedScheme === kind;
	const inUse = panel.committedArea.active === kind && (!isCustom || !!panel.committedArea.custom);
	const canApply =
		panel.canManage &&
		selected &&
		!inUse &&
		(kind === 'default' || (!!panel.committedArea.custom && !panel.isPendingCustomDeletion));
	const label = isCustom ? panel.displayedCustom?.name : panel.t('color_scheme_default_name');

	return (
		<div
			className={`flex min-h-[3.5rem] items-center gap-2 rounded-lg px-2.5 py-2 transition-colors ${
				selected
					? 'bg-violet-50/65 dark:bg-violet-950/25'
					: 'hover:bg-gray-50/60 dark:hover:bg-white/[0.025]'
			} ${isCustom && panel.isPendingCustomDeletion ? 'opacity-65' : ''}`}
		>
			<button
				type="button"
				role="radio"
				aria-checked={selected}
				disabled={!panel.canManage}
				onClick={() => panel.onSelect(kind)}
				className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full disabled:cursor-default"
				aria-label={`${panel.t('color_scheme_select_aria')}: ${label}`}
			>
				<SelectionDot selected={selected} />
			</button>

			<div className="min-w-0 flex-1">
				{isCustom && panel.editingInlineName && panel.draftArea.custom ? (
					<div className="flex min-w-0 items-center gap-1.5">
						<input
							ref={panel.nameInputRef}
							type="text"
							value={panel.nameDraft}
							autoComplete="off"
							aria-label={panel.t('color_scheme_rename_aria')}
							onChange={(event) => panel.onNameChange(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === 'Enter') {
									event.preventDefault();
									panel.onCommitRename();
								}
								if (event.key === 'Escape') panel.onCancelRename();
							}}
							onBlur={() => {
								requestAnimationFrame(() => {
									if (panel.skipRenameBlurRef.current) {
										panel.skipRenameBlurRef.current = false;
										return;
									}
									panel.onCommitRename();
								});
							}}
							className="min-w-0 flex-1 border-0 border-b border-violet-300/70 bg-transparent px-0.5 py-1 text-sm font-semibold text-gray-900 outline-none focus:border-violet-500 focus:ring-0 dark:border-violet-500/40 dark:text-white"
							placeholder={panel.t('color_scheme_custom_default_name')}
						/>
						<TooltipHint label={panel.t('color_scheme_save_name')}>
							<button
								type="button"
								className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-violet-600 transition hover:bg-violet-100/70 dark:text-violet-300 dark:hover:bg-violet-950/40"
								aria-label={panel.t('color_scheme_save_name')}
								onMouseDown={() => {
									panel.skipRenameBlurRef.current = true;
								}}
								onClick={panel.onCommitRename}
							>
								<CheckIcon className="h-4 w-4" />
							</button>
						</TooltipHint>
					</div>
				) : (
					<button
						type="button"
						disabled={!panel.canManage}
						onClick={() => panel.onSelect(kind)}
						className="block max-w-full truncate text-left text-sm font-semibold text-gray-900 disabled:cursor-default dark:text-gray-100"
					>
						{label}
					</button>
				)}
				<div className="mt-0.5 flex flex-wrap items-center gap-1.5">
					{!isCustom ? (
						<span className="text-[11px] text-gray-500 dark:text-gray-400">
							{panel.t('color_scheme_system_default')}
						</span>
					) : null}
					{isCustom && panel.isNewUnsavedCustom ? (
						<span className="text-[11px] font-medium text-violet-600 dark:text-violet-300">
							{panel.t('color_scheme_new_unsaved')}
						</span>
					) : null}
					{isCustom && panel.isPendingCustomDeletion ? (
						<span className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
							{panel.t('color_scheme_delete_unsaved')}
						</span>
					) : null}
					{inUse ? <InUseBadge label={panel.t('color_scheme_in_use')} /> : null}
				</div>
			</div>

			<div className="flex shrink-0 items-center">
				{canApply ? (
					<TooltipHint label={panel.t('color_scheme_apply')}>
						<button
							type="button"
							disabled={panel.applyState === 'saving'}
							onClick={panel.onApply}
							className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-violet-600 transition hover:bg-violet-100/70 disabled:opacity-50 dark:text-violet-300 dark:hover:bg-violet-950/40"
							aria-label={panel.t('color_scheme_apply')}
						>
							<CheckIcon className="h-4 w-4" />
						</button>
					</TooltipHint>
				) : null}
				{isCustom && panel.canManage && panel.draftArea.custom && !panel.editingInlineName ? (
					<>
						<TooltipHint label={panel.t('color_scheme_rename_aria')}>
							<button
								type="button"
								className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/30 dark:hover:text-violet-300"
								aria-label={panel.t('color_scheme_rename_aria')}
								onClick={panel.onStartRename}
							>
								<EditIcon className="h-4 w-4" />
							</button>
						</TooltipHint>
						<TooltipHint label={panel.t('color_scheme_menu_delete')}>
							<button
								type="button"
								className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/25 dark:hover:text-red-400"
								aria-label={panel.t('color_scheme_menu_delete')}
								onClick={panel.onDeleteCustom}
							>
								<TrashIcon className="h-4 w-4" />
							</button>
						</TooltipHint>
					</>
				) : null}
			</div>
		</div>
	);
};

export const ColorSchemePanel: React.FC<Props> = (props) => (
	<div className="mt-5 overflow-hidden rounded-xl bg-white/30 ring-1 ring-gray-900/[0.04] dark:bg-white/[0.015] dark:ring-white/[0.06] md:grid md:grid-cols-[minmax(13rem,28%)_minmax(0,1fr)]">
		<div className="p-3.5 md:border-r md:border-gray-200/55 dark:md:border-white/[0.07]">
			<p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
				{props.t('color_scheme_schemes_heading')}
			</p>
			<div className="space-y-1" role="radiogroup" aria-label={props.t('color_scheme_selector_label')}>
				<SchemeRow kind="default" panel={props} />
				{props.displayedCustom ? <SchemeRow kind="custom" panel={props} /> : null}
			</div>
			{props.canManage && !props.displayedCustom ? (
				<button
					type="button"
					className="ml-2.5 mt-2.5 text-sm font-medium text-violet-600 underline-offset-2 transition hover:text-violet-500 hover:underline dark:text-violet-400"
					onClick={props.onNewScheme}
				>
					{props.t('color_scheme_new_link')}
				</button>
			) : null}
			{props.applyState === 'success' ? (
				<p className="ml-2.5 mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-300" role="status">
					{props.t('color_scheme_apply_success')}
				</p>
			) : null}
			{props.applyState === 'error' ? (
				<p className="ml-2.5 mt-2 text-xs font-medium text-red-700 dark:text-red-300" role="alert">
					{props.t('color_scheme_apply_error')}
				</p>
			) : null}
		</div>

		<div className="border-t border-gray-200/55 p-3.5 dark:border-white/[0.07] md:border-t-0 md:py-3.5 md:pl-7 md:pr-3.5">
			<p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
				{props.t('color_scheme_colors_heading')}
			</p>
			<ul className="divide-y divide-gray-900/[0.04] rounded-xl bg-white/40 ring-1 ring-gray-900/[0.02] dark:divide-white/[0.05] dark:bg-white/[0.02] dark:ring-white/[0.04]">
				{props.statusRows.map((row) => (
					<li key={row.id} className="flex items-center gap-2.5 px-3 py-1.5">
						{props.showPickers ? (
							<TooltipHint label={props.t('color_scheme_change_color')}>
								<button
									type="button"
									aria-label={props.t('color_scheme_change_color')}
									className={`h-5 w-5 shrink-0 rounded-full ${row.color.bg} shadow-sm ring-1 ring-black/[0.06] transition hover:ring-2 hover:ring-violet-400/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 dark:ring-white/10`}
									onClick={(event) => props.onColorClick(row.id, event.currentTarget)}
								/>
							</TooltipHint>
						) : (
							<span className={`h-5 w-5 shrink-0 rounded-full ${row.color.bg} shadow-sm ring-1 ring-black/[0.06] dark:ring-white/10`} />
						)}
						<span className="min-w-0 flex-1 truncate text-[13px] font-medium text-gray-700 dark:text-gray-200">
							{props.t(row.labelKey)}
						</span>
					</li>
				))}
			</ul>
			{props.canManage ? (
				<div className="mt-4 flex flex-wrap items-center justify-end gap-3">
					{props.saveState === 'success' ? (
						<span className="text-sm font-medium text-emerald-700 dark:text-emerald-300" role="status">
							{props.t('color_scheme_save_context_success')}
						</span>
					) : null}
					{props.saveState === 'error' ? (
						<span className="text-sm font-medium text-red-700 dark:text-red-300" role="alert">
							{props.t('color_scheme_save_context_error')}
						</span>
					) : null}
					<button
						type="button"
						disabled={!props.isContentDirty || props.saveState === 'saving'}
						onClick={props.onSave}
						className="inline-flex min-h-[2.5rem] items-center justify-center rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-45"
					>
						{props.saveState === 'saving'
							? props.t('color_scheme_saving_section')
							: props.t('color_scheme_save_section')}
					</button>
				</div>
			) : null}
		</div>
	</div>
);
