import React, { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AppContext } from '../../contexts/AppContext';
import { EditIcon, TrashIcon, CheckIcon, ChevronDownIcon } from '../icons';
import { WORKFLOW_STATUS_PALETTE } from '../../lib/constants';
import type { ColorSchemeAreaKey, ColorSchemeAreaPreference, StatusDefinition } from '../../types';
import {
	CANONICAL_POST_STATUS_IDS,
	CANONICAL_TASK_STATUS_IDS,
	DEFAULT_POST_STATUS_COLORS,
	DEFAULT_TASK_STATUS_COLORS,
	cloneColorMap,
	cloneStatusColor,
} from '../../lib/defaultFlowColors';
import TooltipHint from '../TooltipHint';
import {
	resolveClientPostWorkflowId,
	resolveGeneralTaskWorkflowId,
	cloneColorSchemeAreaPreference,
	fingerprintColorSchemeArea,
} from '../../lib/colorSchemes';

const POPOVER_W = 320;
const POPOVER_H = 132;
const Z_PICKER = 11000;
const Z_SCHEME_DROPDOWN = 10050;

function useOnClickOutside(
	open: boolean,
	onClose: () => void,
	popRef: React.RefObject<HTMLElement | null>,
	extraIgnoreRef?: React.RefObject<HTMLElement | null>,
) {
	useEffect(() => {
		if (!open) return;
		const handler = (e: MouseEvent) => {
			const t = e.target as Node;
			if (popRef.current?.contains(t)) return;
			if (extraIgnoreRef?.current?.contains(t)) return;
			onClose();
		};
		document.addEventListener('mousedown', handler);
		return () => document.removeEventListener('mousedown', handler);
	}, [open, onClose, popRef, extraIgnoreRef]);
}

const ColorPickerPortal: React.FC<{
	open: boolean;
	anchorEl: HTMLElement | null;
	ignoreOutsideRef: React.RefObject<HTMLElement | null>;
	onClose: () => void;
	onSelect: (color: (typeof WORKFLOW_STATUS_PALETTE)[0]) => void;
}> = ({ open, anchorEl, ignoreOutsideRef, onClose, onSelect }) => {
	const popRef = useRef<HTMLDivElement>(null);
	const [pos, setPos] = useState({ top: 0, left: 0 });

	useLayoutEffect(() => {
		if (!open || !anchorEl) return;
		const rect = anchorEl.getBoundingClientRect();
		const margin = 8;
		let left = rect.left + rect.width / 2 - POPOVER_W / 2;
		left = Math.max(margin, Math.min(left, window.innerWidth - POPOVER_W - margin));
		let top = rect.bottom + margin;
		if (top + POPOVER_H > window.innerHeight - margin) {
			top = rect.top - POPOVER_H - margin;
		}
		if (top < margin) top = margin;
		setPos({ top, left });
	}, [open, anchorEl]);

	useOnClickOutside(open && !!anchorEl, onClose, popRef, ignoreOutsideRef);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open, onClose]);

	if (!open || !anchorEl || typeof document === 'undefined') return null;

	return createPortal(
		<div
			ref={popRef}
			className="fixed w-80 rounded-xl border border-gray-200/60 bg-white/95 p-2.5 shadow-xl shadow-gray-900/[0.08] backdrop-blur-sm dark:border-gray-600/50 dark:bg-gray-900/95"
			style={{ top: pos.top, left: pos.left, zIndex: Z_PICKER }}
			role="dialog"
			aria-modal="true"
		>
			<div className="grid grid-cols-8 gap-2 sm:grid-cols-9">
				{WORKFLOW_STATUS_PALETTE.map((color) => (
					<button
						key={color.id}
						type="button"
						onClick={() => onSelect(color)}
						className={`h-7 w-7 rounded-full ${color.bg} transition hover:ring-2 hover:ring-indigo-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
						aria-label={color.id}
					/>
				))}
			</div>
		</div>,
		document.body,
	);
};

const SchemeSelectDropdown: React.FC<{
	area: ColorSchemeAreaKey;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	areaPrefs: { active: 'default' | 'custom'; custom: ColorSchemeAreaPreference['custom'] };
	t: (k: string) => void;
	onSelect: (v: 'default' | 'custom') => void;
}> = ({ area, open, onOpenChange, areaPrefs, t, onSelect }) => {
	const triggerRef = useRef<HTMLButtonElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

	useOnClickOutside(open, () => onOpenChange(false), panelRef, triggerRef);

	useLayoutEffect(() => {
		if (!open || !triggerRef.current) return;
		const r = triggerRef.current.getBoundingClientRect();
		setPos({ top: r.bottom + 6, left: r.left, width: Math.max(r.width, 200) });
	}, [open, areaPrefs.active, areaPrefs.custom?.name]);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onOpenChange(false);
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open, onOpenChange]);

	const currentLabel =
		areaPrefs.active === 'default'
			? t('color_scheme_default_name')
			: areaPrefs.custom?.name ?? t('color_scheme_custom_default_name');

	if (typeof document === 'undefined') return null;

	return (
		<div className="relative min-w-0 flex-1 sm:max-w-[240px]">
			<button
				type="button"
				ref={triggerRef}
				id={`color-scheme-trigger-${area}`}
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={`color-scheme-listbox-${area}`}
				className="flex w-full min-h-[2.5rem] items-center justify-between gap-2 rounded-2xl border border-gray-200/50 bg-white/95 px-3.5 py-2 text-left text-sm text-gray-900 shadow-sm shadow-gray-900/[0.04] ring-1 ring-gray-900/[0.03] transition hover:border-violet-200/80 hover:shadow-md hover:ring-violet-500/10 focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:border-gray-600/40 dark:bg-gray-800/80 dark:text-gray-100 dark:ring-white/[0.06] dark:hover:border-violet-500/20 dark:focus:ring-violet-400/25"
				onClick={() => onOpenChange(!open)}
			>
				<span className="min-w-0 truncate font-medium">{currentLabel}</span>
				<ChevronDownIcon
					className={`h-4 w-4 shrink-0 text-gray-400 transition dark:text-gray-500 ${open ? 'rotate-180' : ''}`}
				/>
			</button>
			{open
				? createPortal(
						<div
							ref={panelRef}
							id={`color-scheme-listbox-${area}`}
							role="listbox"
							aria-labelledby={`color-scheme-trigger-${area}`}
							className="max-h-64 overflow-y-auto rounded-2xl border border-gray-200/50 bg-white/95 py-1 shadow-lg shadow-gray-900/[0.08] ring-1 ring-gray-900/[0.04] dark:border-gray-600/50 dark:bg-gray-800/95 dark:ring-white/[0.06]"
							style={{
								position: 'fixed',
								top: pos.top,
								left: pos.left,
								width: pos.width,
								zIndex: Z_SCHEME_DROPDOWN,
							}}
						>
							<button
								type="button"
								role="option"
								aria-selected={areaPrefs.active === 'default'}
								className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition ${
									areaPrefs.active === 'default'
										? 'bg-violet-50/95 font-medium text-violet-900 dark:bg-violet-950/50 dark:text-violet-100'
										: 'text-gray-800 hover:bg-violet-50/50 dark:text-gray-100 dark:hover:bg-violet-950/30'
								}`}
								onClick={() => {
									onSelect('default');
									onOpenChange(false);
								}}
							>
								{t('color_scheme_default_name')}
							</button>
							{areaPrefs.custom ? (
								<button
									type="button"
									role="option"
									aria-selected={areaPrefs.active === 'custom'}
									className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition ${
										areaPrefs.active === 'custom'
											? 'bg-violet-50/95 font-medium text-violet-900 dark:bg-violet-950/50 dark:text-violet-100'
											: 'text-gray-800 hover:bg-violet-50/50 dark:text-gray-100 dark:hover:bg-violet-950/30'
									}`}
									onClick={() => {
										onSelect('custom');
										onOpenChange(false);
									}}
								>
									<span className="min-w-0 truncate">{areaPrefs.custom.name}</span>
								</button>
							) : null}
						</div>,
						document.body,
					)
				: null}
		</div>
	);
};

const POST_LABEL_KEYS: Record<(typeof CANONICAL_POST_STATUS_IDS)[number], string> = {
	ideia_post: 'settings_post_flow_label_pauta',
	fazer_post: 'settings_post_flow_label_producao',
	enviar_aprovacao: 'settings_post_flow_label_aprovacao',
	agendar_post: 'settings_post_flow_label_agendamento',
	agendado_postado: 'settings_post_flow_label_publicacao',
};

const TASK_LABEL_KEYS: Record<(typeof CANONICAL_TASK_STATUS_IDS)[number], string> = {
	todo: 'category_todo',
	in_progress: 'status_in_progress',
	done: 'done',
};

export const ColorSchemeAreaSection: React.FC<{
	area: ColorSchemeAreaKey;
	titleKey: string;
	descKey: string;
}> = ({ area, titleKey, descKey }) => {
	const context = useContext(AppContext)!;
	const {
		t,
		workflows,
		clientWorkflowId,
		generalWorkflowId,
		colorSchemes,
		setColorSchemes,
		hasPermission,
		notifyBanner,
	} = context;

	const canManage = hasPermission('manage_settings');
	const workflowId =
		area === 'posts'
			? resolveClientPostWorkflowId(workflows, clientWorkflowId)
			: resolveGeneralTaskWorkflowId(workflows, generalWorkflowId);
	const workflow = workflows[workflowId];
	const ids = area === 'posts' ? CANONICAL_POST_STATUS_IDS : CANONICAL_TASK_STATUS_IDS;
	const labelMap = area === 'posts' ? POST_LABEL_KEYS : TASK_LABEL_KEYS;

	const committedArea = area === 'posts' ? colorSchemes.posts : colorSchemes.tasks;
	const committedFingerprint = useMemo(() => fingerprintColorSchemeArea(committedArea), [committedArea]);

	const [draftArea, setDraftArea] = useState(() => cloneColorSchemeAreaPreference(committedArea));
	const prevCommittedFpRef = useRef<string | null>(null);

	useEffect(() => {
		if (prevCommittedFpRef.current === null) {
			prevCommittedFpRef.current = committedFingerprint;
			return;
		}
		if (prevCommittedFpRef.current !== committedFingerprint) {
			prevCommittedFpRef.current = committedFingerprint;
			setDraftArea(cloneColorSchemeAreaPreference(committedArea));
		}
	}, [committedFingerprint, committedArea]);

	const isDirty = useMemo(
		() => fingerprintColorSchemeArea(draftArea) !== committedFingerprint,
		[draftArea, committedFingerprint],
	);

	const prefsForPreview = canManage ? draftArea : committedArea;

	const [pickerAnchor, setPickerAnchor] = useState<{ statusId: string; el: HTMLElement } | null>(null);
	const [schemeDropdownOpen, setSchemeDropdownOpen] = useState(false);
	const [editingInlineName, setEditingInlineName] = useState(false);
	const [nameDraft, setNameDraft] = useState(() => committedArea.custom?.name ?? '');
	const nameInputRef = useRef<HTMLInputElement>(null);
	const skipRenameBlurRef = useRef(false);
	const pickerSwatchRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
		if (!editingInlineName) {
			setNameDraft(draftArea.custom?.name ?? '');
		}
	}, [draftArea.custom?.name, editingInlineName]);

	useEffect(() => {
		if (editingInlineName) {
			nameInputRef.current?.focus();
			nameInputRef.current?.select();
		}
	}, [editingInlineName]);

	const defaults = area === 'posts' ? DEFAULT_POST_STATUS_COLORS : DEFAULT_TASK_STATUS_COLORS;

	const resolveRowColor = useCallback(
		(statusId: string): StatusDefinition['color'] => {
			const fallback: StatusDefinition['color'] = {
				bg: 'bg-gray-400',
				text: 'text-white',
				border: 'border-gray-400',
				ring: 'ring-gray-400',
			};
			const base = defaults[statusId];
			const fromWf = workflow?.statuses.find((s) => s.id === statusId)?.color;

			if (prefsForPreview.active === 'custom' && prefsForPreview.custom) {
				const ov = prefsForPreview.custom.colors[statusId];
				if (base && ov) return { ...cloneStatusColor(base), ...cloneStatusColor(ov) };
				if (ov) return cloneStatusColor(ov);
				if (base) return cloneStatusColor(base);
				return fromWf ? cloneStatusColor(fromWf) : fallback;
			}

			if (base) return cloneStatusColor(base);
			return fromWf ? cloneStatusColor(fromWf) : fallback;
		},
		[workflow, defaults, prefsForPreview.active, prefsForPreview.custom],
	);

	const statusRows = ids.map((id) => ({
		id,
		labelKey: labelMap[id as keyof typeof labelMap],
		color: resolveRowColor(id),
	}));

	const handleSaveSection = () => {
		if (!canManage || !isDirty) return;
		setColorSchemes((prev) => ({
			...prev,
			[area]: draftArea,
		}));
		notifyBanner?.(t('color_scheme_flow_saved_success'));
	};

	const applyColorToCustom = (statusId: string, color: (typeof WORKFLOW_STATUS_PALETTE)[0]) => {
		const { id: _id, ...colorProps } = color;
		setDraftArea((prev) => {
			if (!prev.custom) return prev;
			return {
				...prev,
				custom: {
					...prev.custom,
					colors: { ...prev.custom.colors, [statusId]: colorProps },
				},
			};
		});
		setPickerAnchor(null);
	};

	const onSelectScheme = (v: 'default' | 'custom') => {
		if (!canManage) return;
		if (v === 'default') setDraftArea((d) => ({ ...d, active: 'default' }));
		if (v === 'custom' && draftArea.custom) setDraftArea((d) => ({ ...d, active: 'custom' }));
	};

	const onNewScheme = () => {
		if (!canManage || draftArea.custom) return;
		const name = t('color_scheme_custom_default_name');
		const nextArea: ColorSchemeAreaPreference = {
			active: 'custom',
			custom: {
				id: 'custom',
				name,
				colors: cloneColorMap(area === 'posts' ? DEFAULT_POST_STATUS_COLORS : DEFAULT_TASK_STATUS_COLORS),
			},
		};
		setDraftArea(nextArea);
		setNameDraft(name);
		setSchemeDropdownOpen(false);
		setEditingInlineName(true);
	};

	const onDeleteCustom = () => {
		if (!canManage || !draftArea.custom) return;
		if (draftArea.active !== 'custom') return;
		setDraftArea({ active: 'default', custom: null });
		setEditingInlineName(false);
	};

	const saveRenameIfChanged = () => {
		if (!canManage || !draftArea.custom) {
			setEditingInlineName(false);
			return;
		}
		const name = nameDraft.trim() || t('color_scheme_custom_default_name');
		if (name !== draftArea.custom.name) {
			setDraftArea((prev) =>
				prev.custom ? { ...prev, custom: { ...prev.custom, name } } : prev,
			);
		}
		setEditingInlineName(false);
	};

	const startInlineRename = () => {
		if (!draftArea.custom) return;
		setNameDraft(draftArea.custom.name);
		setSchemeDropdownOpen(false);
		setEditingInlineName(true);
	};

	const showPickers = canManage && draftArea.active === 'custom' && draftArea.custom;

	return (
		<div>
			<h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">{t(titleKey)}</h2>
			<p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">{t(descKey)}</p>

			{!canManage ? (
				<p className="mt-3 text-sm text-gray-600 dark:text-gray-400">{t('color_scheme_admin_only')}</p>
			) : null}

			{canManage ? (
				<div className="mt-5 flex flex-wrap items-center gap-2 sm:gap-2.5">
					{editingInlineName && draftArea.custom ? (
						<>
							<input
								ref={nameInputRef}
								type="text"
								value={nameDraft}
								autoComplete="off"
								aria-label={t('color_scheme_rename_aria')}
								onChange={(e) => setNameDraft(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										e.preventDefault();
										saveRenameIfChanged();
									}
									if (e.key === 'Escape') {
										setNameDraft(draftArea.custom?.name ?? '');
										setEditingInlineName(false);
									}
								}}
								onBlur={() => {
									requestAnimationFrame(() => {
										if (skipRenameBlurRef.current) {
											skipRenameBlurRef.current = false;
											return;
										}
										saveRenameIfChanged();
									});
								}}
								className="min-h-[2.5rem] min-w-0 max-w-sm flex-1 rounded-2xl border border-violet-200/40 bg-white/95 px-3.5 py-2 text-sm text-gray-900 shadow-sm ring-1 ring-violet-500/15 focus:border-violet-300/60 focus:outline-none focus:ring-2 focus:ring-violet-500/25 dark:border-violet-500/20 dark:bg-gray-800/90 dark:text-white dark:ring-violet-400/20"
								placeholder={t('color_scheme_custom_default_name')}
							/>
							<TooltipHint label={t('color_scheme_save_name')}>
								<button
									type="button"
									className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-sm transition hover:bg-violet-500"
									aria-label={t('color_scheme_save_name')}
									onMouseDown={() => {
										skipRenameBlurRef.current = true;
									}}
									onClick={() => saveRenameIfChanged()}
								>
									<CheckIcon className="h-4 w-4" />
								</button>
							</TooltipHint>
						</>
					) : (
						<>
							<SchemeSelectDropdown
								area={area}
								open={schemeDropdownOpen}
								onOpenChange={setSchemeDropdownOpen}
								areaPrefs={draftArea}
								t={t}
								onSelect={onSelectScheme}
							/>
							{draftArea.custom ? (
								<TooltipHint label={t('color_scheme_rename_aria')}>
									<button
										type="button"
										className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-gray-400 transition hover:bg-violet-50/80 hover:text-violet-700 dark:hover:bg-violet-950/30 dark:hover:text-violet-300"
										aria-label={t('color_scheme_rename_aria')}
										onClick={startInlineRename}
									>
										<EditIcon className="h-4 w-4" />
									</button>
								</TooltipHint>
							) : null}
							{draftArea.active === 'custom' && draftArea.custom ? (
								<TooltipHint label={t('color_scheme_menu_delete')}>
									<button
										type="button"
										className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-gray-400 transition hover:bg-red-50/80 hover:text-red-600 dark:hover:bg-red-950/25 dark:hover:text-red-400"
										aria-label={t('color_scheme_menu_delete')}
										onClick={onDeleteCustom}
									>
										<TrashIcon className="h-4 w-4" />
									</button>
								</TooltipHint>
							) : null}
							{!draftArea.custom ? (
								<button
									type="button"
									className="shrink-0 text-sm font-medium text-violet-600/95 underline-offset-2 hover:text-violet-500 hover:underline dark:text-violet-400/90"
									onClick={onNewScheme}
								>
									{t('color_scheme_new_link')}
								</button>
							) : null}
						</>
					)}
				</div>
			) : null}

			{!canManage ? <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('color_scheme_readonly')}</p> : null}

			{!workflow ? (
				<p className="mt-3 text-sm text-amber-700 dark:text-amber-300" role="status">
					{t('settings_workflow_missing_hint')}
				</p>
			) : null}

			<ul
				role="list"
				className="mt-4 divide-y divide-gray-900/[0.04] rounded-xl bg-white/40 ring-1 ring-gray-900/[0.02] dark:divide-white/[0.05] dark:bg-white/[0.02] dark:ring-white/[0.04]"
			>
				{statusRows.map((row) => {
					const c = row.color;
					return (
						<li key={row.id}>
							<div className="flex items-center gap-2.5 px-3 py-1.5 transition-colors hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
								{showPickers ? (
									<TooltipHint label={t('color_scheme_change_color')}>
										<button
											type="button"
											aria-label={t('color_scheme_change_color')}
											className={`h-5 w-5 shrink-0 rounded-full ${c.bg} shadow-sm ring-1 ring-black/[0.06] transition hover:ring-2 hover:ring-violet-400/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 dark:ring-white/10`}
											onClick={(e) => {
												const el = e.currentTarget;
												pickerSwatchRef.current = el;
												setPickerAnchor((cur) =>
													cur?.statusId === row.id ? null : { statusId: row.id, el },
												);
											}}
										/>
									</TooltipHint>
								) : (
									<TooltipHint label={t('color_scheme_readonly_preview')}>
										<span
											role="img"
											aria-label={t('color_scheme_readonly_preview')}
											className={`inline-flex h-5 w-5 shrink-0 rounded-full ${c.bg} shadow-sm ring-1 ring-black/[0.06] dark:ring-white/10`}
										/>
									</TooltipHint>
								)}
								<span className="min-w-0 flex-1 truncate text-[13px] font-medium leading-snug text-gray-700 dark:text-gray-200">
									{t(row.labelKey)}
								</span>
							</div>
						</li>
					);
				})}
			</ul>

			{canManage ? (
				<div className="mt-4 flex justify-end">
					<button
						type="button"
						disabled={!isDirty}
						onClick={handleSaveSection}
						className="inline-flex min-h-[2.5rem] items-center justify-center rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-violet-600"
					>
						{t('color_scheme_save_section')}
					</button>
				</div>
			) : null}

			<ColorPickerPortal
				open={!!pickerAnchor}
				anchorEl={pickerAnchor?.el ?? null}
				ignoreOutsideRef={pickerSwatchRef}
				onClose={() => {
					pickerSwatchRef.current = null;
					setPickerAnchor(null);
				}}
				onSelect={(col) => {
					if (pickerAnchor) applyColorToCustom(pickerAnchor.statusId, col);
				}}
			/>
		</div>
	);
};
