import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppContext } from '../../contexts/AppContext';
import {
	CANONICAL_POST_STATUS_IDS,
	CANONICAL_TASK_STATUS_IDS,
	DEFAULT_POST_STATUS_COLORS,
	DEFAULT_TASK_STATUS_COLORS,
	cloneColorMap,
	cloneStatusColor,
} from '../../lib/defaultFlowColors';
import {
	cloneColorSchemeAreaPreference,
	fingerprintColorSchemeArea,
	resolveClientPostWorkflowId,
	resolveGeneralTaskWorkflowId,
} from '../../lib/colorSchemes';
import {
	buildColorSchemeActivation,
	buildColorSchemeContentSave,
} from '../../lib/colorSchemeEditing';
import type { ColorSchemeAreaKey, StatusDefinition } from '../../types';
import { ColorSchemeColorPicker } from './ColorSchemeColorPicker';
import { ColorSchemePanel } from './ColorSchemePanel';

const POST_LABEL_KEYS = {
	ideia_post: 'settings_post_flow_label_pauta',
	fazer_post: 'settings_post_flow_label_producao',
	enviar_aprovacao: 'settings_post_flow_label_aprovacao',
	agendar_post: 'settings_post_flow_label_agendamento',
	agendado_postado: 'settings_post_flow_label_publicacao',
} as const;

const TASK_LABEL_KEYS = {
	todo: 'category_todo',
	in_progress: 'status_in_progress',
	done: 'done',
} as const;

type ActionState = 'idle' | 'saving' | 'success' | 'error';
type SchemeKind = 'default' | 'custom';

export const ColorSchemeAreaSection: React.FC<{
	area: ColorSchemeAreaKey;
	titleKey: string;
	descKey: string;
}> = ({ area, titleKey, descKey }) => {
	const context = useContext(AppContext)!;
	const { t, workflows, clientWorkflowId, generalWorkflowId, colorSchemes, saveColorSchemeArea, hasPermission } =
		context;
	const canManage = hasPermission('manage_settings');
	const workflowId =
		area === 'posts'
			? resolveClientPostWorkflowId(workflows, clientWorkflowId)
			: resolveGeneralTaskWorkflowId(workflows, generalWorkflowId);
	const workflow = workflows[workflowId];
	const committedArea = area === 'posts' ? colorSchemes.posts : colorSchemes.tasks;
	const defaults = area === 'posts' ? DEFAULT_POST_STATUS_COLORS : DEFAULT_TASK_STATUS_COLORS;
	const ids = area === 'posts' ? CANONICAL_POST_STATUS_IDS : CANONICAL_TASK_STATUS_IDS;
	const labelMap = area === 'posts' ? POST_LABEL_KEYS : TASK_LABEL_KEYS;

	const [selectedScheme, setSelectedScheme] = useState<SchemeKind>(committedArea.active);
	const [draftArea, setDraftArea] = useState(() => cloneColorSchemeAreaPreference(committedArea));
	const [editingInlineName, setEditingInlineName] = useState(false);
	const [nameDraft, setNameDraft] = useState(() => committedArea.custom?.name ?? '');
	const [pickerAnchor, setPickerAnchor] = useState<{ statusId: string; element: HTMLElement } | null>(null);
	const [saveState, setSaveState] = useState<ActionState>('idle');
	const [applyState, setApplyState] = useState<ActionState>('idle');
	const nameInputRef = useRef<HTMLInputElement>(null);
	const skipRenameBlurRef = useRef(false);
	const saveTimerRef = useRef<number | null>(null);
	const applyTimerRef = useRef<number | null>(null);

	const committedContentFingerprint = useMemo(
		() => fingerprintColorSchemeArea({ active: 'default', custom: committedArea.custom }),
		[committedArea.custom],
	);
	const draftContentFingerprint = useMemo(
		() => fingerprintColorSchemeArea({ active: 'default', custom: draftArea.custom }),
		[draftArea.custom],
	);
	const previousCommittedContentRef = useRef(committedContentFingerprint);
	const isContentDirty = draftContentFingerprint !== committedContentFingerprint;

	useEffect(() => {
		const previous = previousCommittedContentRef.current;
		if (previous === committedContentFingerprint) return;
		previousCommittedContentRef.current = committedContentFingerprint;
		if (draftContentFingerprint === previous || draftContentFingerprint === committedContentFingerprint) {
			setDraftArea(cloneColorSchemeAreaPreference(committedArea));
		}
	}, [committedArea, committedContentFingerprint, draftContentFingerprint]);

	useEffect(() => {
		if (!editingInlineName) setNameDraft(draftArea.custom?.name ?? '');
	}, [draftArea.custom?.name, editingInlineName]);

	useEffect(() => {
		if (!editingInlineName) return;
		nameInputRef.current?.focus();
		nameInputRef.current?.select();
	}, [editingInlineName]);

	useEffect(
		() => () => {
			if (saveTimerRef.current != null) window.clearTimeout(saveTimerRef.current);
			if (applyTimerRef.current != null) window.clearTimeout(applyTimerRef.current);
		},
		[],
	);

	const resolveRowColor = useCallback(
		(statusId: string): StatusDefinition['color'] => {
			const fallback = { bg: 'bg-gray-400', text: 'text-white', border: 'border-gray-400', ring: 'ring-gray-400' };
			const base = defaults[statusId];
			const workflowColor = workflow?.statuses.find((status) => status.id === statusId)?.color;
			if (selectedScheme === 'custom' && draftArea.custom) {
				const override = draftArea.custom.colors[statusId];
				if (base && override) return { ...cloneStatusColor(base), ...cloneStatusColor(override) };
				if (override) return cloneStatusColor(override);
			}
			return base ? cloneStatusColor(base) : workflowColor ? cloneStatusColor(workflowColor) : fallback;
		},
		[defaults, draftArea.custom, selectedScheme, workflow],
	);

	const statusRows = ids.map((id) => ({
		id,
		labelKey: labelMap[id as keyof typeof labelMap],
		color: resolveRowColor(id),
	}));
	const displayedCustom = draftArea.custom ?? committedArea.custom;
	const isNewUnsavedCustom = !!draftArea.custom && !committedArea.custom;
	const isPendingCustomDeletion = !draftArea.custom && !!committedArea.custom;
	const showPickers = canManage && selectedScheme === 'custom' && !!draftArea.custom;

	const showTemporaryState = (
		setState: React.Dispatch<React.SetStateAction<ActionState>>,
		timerRef: React.MutableRefObject<number | null>,
		state: 'success' | 'error',
	) => {
		setState(state);
		if (timerRef.current != null) window.clearTimeout(timerRef.current);
		timerRef.current = window.setTimeout(() => {
			setState('idle');
			timerRef.current = null;
		}, 3200);
	};

	const commitRename = () => {
		if (!draftArea.custom) return setEditingInlineName(false);
		const name = nameDraft.trim() || t('color_scheme_custom_default_name');
		setDraftArea((current) =>
			current.custom ? { ...current, custom: { ...current.custom, name } } : current,
		);
		setEditingInlineName(false);
	};

	const handleSaveContent = async () => {
		if (!canManage || !isContentDirty || saveState === 'saving' || applyState === 'saving') return;
		const custom = draftArea.custom
			? { ...draftArea.custom, name: editingInlineName ? nameDraft.trim() || t('color_scheme_custom_default_name') : draftArea.custom.name }
			: null;
		const payload = buildColorSchemeContentSave(committedArea, custom);
		setDraftArea(payload);
		setEditingInlineName(false);
		setSaveState('saving');
		try {
			await saveColorSchemeArea(area, payload);
			showTemporaryState(setSaveState, saveTimerRef, 'success');
		} catch {
			showTemporaryState(setSaveState, saveTimerRef, 'error');
		}
	};

	const handleApplyScheme = async () => {
		if (!canManage || selectedScheme === committedArea.active || applyState === 'saving' || saveState === 'saving') return;
		if (selectedScheme === 'custom' && !committedArea.custom) return;
		setApplyState('saving');
		try {
			await saveColorSchemeArea(area, buildColorSchemeActivation(committedArea, selectedScheme));
			showTemporaryState(setApplyState, applyTimerRef, 'success');
		} catch {
			showTemporaryState(setApplyState, applyTimerRef, 'error');
		}
	};

	const handleSelect = (scheme: SchemeKind) => {
		if (!canManage) return;
		if (scheme === 'custom' && !draftArea.custom && committedArea.custom) {
			setDraftArea(cloneColorSchemeAreaPreference({ active: committedArea.active, custom: committedArea.custom }));
		}
		if (scheme === 'custom' && !displayedCustom) return;
		setSelectedScheme(scheme);
		setPickerAnchor(null);
	};

	const handleNewScheme = () => {
		if (!canManage || displayedCustom) return;
		const name = t('color_scheme_custom_default_name');
		setDraftArea({
			active: committedArea.active,
			custom: { id: 'custom', name, colors: cloneColorMap(defaults) },
		});
		setSelectedScheme('custom');
		setNameDraft(name);
		setEditingInlineName(true);
	};

	const handleDeleteCustom = () => {
		if (!canManage || !draftArea.custom) return;
		setDraftArea({ active: committedArea.active, custom: null });
		setSelectedScheme('default');
		setEditingInlineName(false);
		setPickerAnchor(null);
	};

	return (
		<div>
			<h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">{t(titleKey)}</h2>
			<p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">{t(descKey)}</p>
			{!canManage ? <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">{t('color_scheme_admin_only')}</p> : null}
			{!workflow ? <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">{t('settings_workflow_missing_hint')}</p> : null}

			<ColorSchemePanel
				t={t}
				canManage={canManage}
				selectedScheme={selectedScheme}
				draftArea={draftArea}
				committedArea={committedArea}
				displayedCustom={displayedCustom}
				isNewUnsavedCustom={isNewUnsavedCustom}
				isPendingCustomDeletion={isPendingCustomDeletion}
				editingInlineName={editingInlineName}
				nameDraft={nameDraft}
				nameInputRef={nameInputRef}
				skipRenameBlurRef={skipRenameBlurRef}
				statusRows={statusRows}
				showPickers={showPickers}
				isContentDirty={isContentDirty}
				saveState={saveState}
				applyState={applyState}
				onSelect={handleSelect}
				onApply={() => void handleApplyScheme()}
				onNameChange={setNameDraft}
				onCancelRename={() => {
					setNameDraft(draftArea.custom?.name ?? '');
					setEditingInlineName(false);
				}}
				onCommitRename={commitRename}
				onStartRename={() => {
					if (!draftArea.custom) return;
					setNameDraft(draftArea.custom.name);
					setEditingInlineName(true);
				}}
				onDeleteCustom={handleDeleteCustom}
				onNewScheme={handleNewScheme}
				onColorClick={(statusId, element) =>
					setPickerAnchor((current) => (current?.statusId === statusId ? null : { statusId, element }))
				}
				onSave={() => void handleSaveContent()}
			/>

			<ColorSchemeColorPicker
				anchor={pickerAnchor?.element ?? null}
				onClose={() => setPickerAnchor(null)}
				onSelect={(color) => {
					if (!pickerAnchor) return;
					const { id: _id, ...colorProps } = color;
					setDraftArea((current) =>
						current.custom
							? {
									...current,
									custom: {
										...current.custom,
										colors: { ...current.custom.colors, [pickerAnchor.statusId]: colorProps },
									},
								}
							: current,
					);
					setPickerAnchor(null);
				}}
			/>
		</div>
	);
};
