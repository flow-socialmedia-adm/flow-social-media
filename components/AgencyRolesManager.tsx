import React, {
	useContext,
	useMemo,
	useState,
	useCallback,
	useRef,
	useEffect,
	forwardRef,
	useImperativeHandle,
} from 'react';
import { AppContext } from '../contexts/AppContext';
import { apiDelete, apiPost, apiPut } from '../lib/api';
import type { AgencyAccessLevel, AgencyRole } from '../types';
import { PlusIcon, TrashIcon, EditIcon, XIcon, UsersIcon, ChevronDownIcon } from './icons';
import { accessLevelLabelKey } from '../lib/agencyRoleApply';
import {
	AGENCY_MODULE_KEYS,
	DEFAULT_NONE_PERMISSIONS,
	type AgencyModuleKey,
	type ModuleAccessLevel,
	permissionsSummary,
} from '../lib/modulePermissions';
import { GhostInput } from './GhostInput';
import TooltipHint from './TooltipHint';
import { UnsavedChangesBar } from './clients/UnsavedChangesBar';

/** Níveis exibidos no editor (sem VIEWER — permissões finas ficam por módulo). */
const ACCESS_LEVELS: AgencyAccessLevel[] = ['ADMIN', 'MANAGER', 'OPERATIONAL', 'FINANCIAL'];

function normalizeRoleEditorAccessLevel(level: AgencyAccessLevel): AgencyAccessLevel {
	return level === 'VIEWER' ? 'OPERATIONAL' : level;
}
const LEVEL_OPTS: ModuleAccessLevel[] = ['none', 'view', 'edit'];

/** Oculta na UI o acordeão “Responsabilidades no fluxo” (flags). Estrutura interna e API inalteradas. */
const SHOW_ROLE_WORKFLOW_RESPONSIBILITIES_UI = false;

type Draft = {
	name: string;
	accessLevel: AgencyAccessLevel;
	permissions: Record<AgencyModuleKey, ModuleAccessLevel>;
	flags: {
		canBeResponsiblePosts: boolean;
		canBeResponsibleTasks: boolean;
		canBeResponsibleClients: boolean;
		canBeResponsiblePlanning: boolean;
	};
};

function draftFromRole(r: AgencyRole): Draft {
	const perms = r.permissions as Record<AgencyModuleKey, ModuleAccessLevel>;
	const flags = r.flags as Draft['flags'];
	return {
		name: r.name,
		accessLevel: normalizeRoleEditorAccessLevel((r.accessLevel as AgencyAccessLevel) || 'OPERATIONAL'),
		permissions: { ...DEFAULT_NONE_PERMISSIONS, ...perms },
		flags: {
			canBeResponsiblePosts: flags?.canBeResponsiblePosts !== false,
			canBeResponsibleTasks: flags?.canBeResponsibleTasks !== false,
			canBeResponsibleClients: flags?.canBeResponsibleClients !== false,
			canBeResponsiblePlanning: flags?.canBeResponsiblePlanning !== false,
		},
	};
}

function emptyDraft(): Draft {
	return {
		name: '',
		accessLevel: 'OPERATIONAL',
		permissions: { ...DEFAULT_NONE_PERMISSIONS },
		flags: {
			canBeResponsiblePosts: true,
			canBeResponsibleTasks: true,
			canBeResponsibleClients: true,
			canBeResponsiblePlanning: true,
		},
	};
}

function serializeDraft(d: Draft) {
	return JSON.stringify(d);
}

export type AgencyRolesManagerHandle = {
	openEditRoleById: (roleId: string) => void;
	openCreateRole: () => void;
};

export type AgencyRolesManagerProps = {
	/** `drawerOnly`: só o painel lateral (sem tabela/listagem). */
	variant?: 'full' | 'drawerOnly';
};

export const AgencyRolesManager = forwardRef<AgencyRolesManagerHandle, AgencyRolesManagerProps>(function AgencyRolesManager(
	{ variant = 'full' },
	ref,
) {
	const context = useContext(AppContext);
	const [panelOpen, setPanelOpen] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editingSystemKey, setEditingSystemKey] = useState<string | null>(null);
	const [draft, setDraft] = useState<Draft>(emptyDraft());
	const baselineRef = useRef<string>('');
	const [busy, setBusy] = useState(false);
	const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
	const [advancedOpen, setAdvancedOpen] = useState(false);

	if (!context) return null;
	const { t, agencyProfile, reloadAgency, currentUser, hasPermission, showConfirmation, notify } = context;

	const roles = agencyProfile.agencyRoles ?? [];
	const canManage = hasPermission('manage_settings');

	const isDirty = panelOpen && serializeDraft(draft) !== baselineRef.current;

	const openCreate = useCallback(() => {
		setAdvancedOpen(false);
		setEditingId(null);
		setEditingSystemKey(null);
		const d = emptyDraft();
		setDraft(d);
		baselineRef.current = serializeDraft(d);
		setPanelOpen(true);
	}, []);

	const openEdit = useCallback((r: AgencyRole) => {
		setAdvancedOpen(false);
		setEditingId(r.id);
		setEditingSystemKey(r.isSystem && r.systemKey ? String(r.systemKey) : null);
		const d = draftFromRole(r);
		setDraft(d);
		baselineRef.current = serializeDraft(d);
		setPanelOpen(true);
	}, []);

	useImperativeHandle(
		ref,
		() => ({
			openEditRoleById: (roleId: string) => {
				const r = roles.find((x) => x.id === roleId);
				if (r) openEdit(r);
			},
			openCreateRole: () => openCreate(),
		}),
		[roles, openEdit, openCreate],
	);

	const closePanel = useCallback(() => {
		setPanelOpen(false);
		setEditingId(null);
		setEditingSystemKey(null);
		setDraft(emptyDraft());
		baselineRef.current = '';
		setFeedback(null);
		setAdvancedOpen(false);
	}, []);

	const saveRole = async () => {
		const name = draft.name.trim();
		if (!name) return;
		setBusy(true);
		setFeedback(null);
		try {
			const payload = {
				name,
				accessLevel: draft.accessLevel,
				permissions: draft.permissions,
				flags: draft.flags,
			};
			if (editingId) {
				await apiPut(`/agencies/me/roles/${editingId}`, payload);
			} else {
				await apiPost('/agencies/me/roles', payload);
			}
			await reloadAgency();
			setFeedback({ text: t('changes_saved'), type: 'success' });
			baselineRef.current = serializeDraft(draft);
			setTimeout(() => {
				closePanel();
			}, 600);
		} catch {
			setFeedback({ text: t('agency_role_save_error'), type: 'error' });
		} finally {
			setBusy(false);
		}
	};

	const discardDraft = () => {
		try {
			const parsed = JSON.parse(baselineRef.current) as Draft;
			setDraft(parsed);
		} catch {
			closePanel();
		}
	};

	const removeRole = async (r: AgencyRole) => {
		if (r.isSystem) {
			notify?.(t('agency_role_system_no_delete'));
			return;
		}
		setBusy(true);
		try {
			await apiDelete(`/agencies/me/roles/${r.id}`);
			await reloadAgency();
		} catch {
			notify?.(t('agency_role_delete_error'));
		} finally {
			setBusy(false);
		}
	};

	const summaryFn = useMemo(
		() => (r: AgencyRole) => permissionsSummary(r.permissions as Record<AgencyModuleKey, ModuleAccessLevel>, t),
		[t],
	);

	const lockAdminSystemRole = editingSystemKey === 'ADMIN';
	const lockPermissionsGrid = lockAdminSystemRole;

	useEffect(() => {
		if (!panelOpen) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') closePanel();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [panelOpen, closePanel]);

	const requestBarConfirmation = useCallback(
		(onDiscard: () => void) => {
			showConfirmation({
				title: t('confirm_discard_changes_title'),
				message: t('confirm_discard_changes'),
				confirmText: t('continue_editing'),
				cancelText: t('discard'),
				onConfirm: () => {},
				onCancel: onDiscard,
			});
		},
		[showConfirmation, t],
	);

	return (
		<div>
			{variant === 'full' && canManage && currentUser?.role !== 'editor' && (
				<div className="mb-4 flex flex-wrap items-center gap-2">
					<button
						type="button"
						onClick={openCreate}
						className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
						disabled={busy}
					>
						<PlusIcon className="h-4 w-4" />
						{t('agency_roles_create_cta')}
					</button>
				</div>
			)}

			{variant === 'full' && (
			<div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
				<div className="overflow-x-auto">
					<table className="w-full min-w-[720px] text-left text-sm">
						<thead>
							<tr className="border-b border-gray-200 bg-gray-50/90 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-600 dark:bg-gray-900/50 dark:text-gray-400">
								<th className="px-4 py-3">{t('agency_roles_table_function')}</th>
								<th className="px-3 py-3">{t('agency_roles_table_access_level_col')}</th>
								<th className="px-3 py-3">{t('agency_roles_table_permissions_summary')}</th>
								<th className="w-24 px-2 py-3" />
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100 dark:divide-gray-700">
							{roles.length === 0 ? (
								<tr>
									<td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
										{t('agency_roles_empty')}
									</td>
								</tr>
							) : (
								roles.map((r) => {
									const permSummary = summaryFn(r);
									return (
									<tr key={r.id}>
										<td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
											{r.name}
											{r.isSystem && (
												<span className="ml-2 text-[10px] font-normal uppercase text-gray-400">
													{t('agency_role_system_badge')}
												</span>
											)}
										</td>
										<td className="px-3 py-3 text-gray-700 dark:text-gray-300">
											{t(accessLevelLabelKey(r.accessLevel))}
										</td>
										<td className="min-w-[10rem] max-w-[min(36rem,58vw)] truncate px-3 py-3 text-xs text-gray-600 dark:text-gray-300">
											<TooltipHint label={permSummary} className="block w-full min-w-0">
												<span className="block truncate">{permSummary}</span>
											</TooltipHint>
										</td>
										<td className="px-2 py-3 text-right">
											{canManage && currentUser?.role !== 'editor' && (
												<div className="flex justify-end gap-1">
													<TooltipHint label={t('edit')}>
														<button
															type="button"
															onClick={() => openEdit(r)}
															className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-indigo-600 dark:hover:bg-gray-700"
															aria-label={t('edit')}
															disabled={busy}
														>
															<EditIcon className="h-4 w-4" />
														</button>
													</TooltipHint>
													{!r.isSystem && (
														<TooltipHint label={t('delete')}>
															<button
																type="button"
																onClick={() => void removeRole(r)}
																className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
																aria-label={t('delete')}
																disabled={busy}
															>
																<TrashIcon className="h-4 w-4" />
															</button>
														</TooltipHint>
													)}
												</div>
											)}
										</td>
									</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			</div>
			)}

			{panelOpen && (
				<>
					<button
						type="button"
						className="fixed inset-0 z-[60] bg-black/40"
						aria-label={t('cancel')}
						onClick={() => {
							if (isDirty) requestBarConfirmation(closePanel);
							else closePanel();
						}}
					/>
					<div className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col border-l-[3px] border-l-indigo-500 bg-white shadow-xl dark:border-l-indigo-400 dark:bg-gray-900">
						<div className="border-b border-indigo-100/80 bg-gradient-to-r from-indigo-50/90 via-indigo-50/40 to-white px-4 py-3.5 dark:border-indigo-900/50 dark:from-indigo-950/50 dark:via-indigo-950/25 dark:to-gray-900">
							<div className="flex items-start justify-between gap-3">
								<div className="flex min-w-0 items-center gap-2.5">
									<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300">
										<UsersIcon className="h-5 w-5" />
									</span>
									<h3 className="text-base font-semibold leading-snug text-indigo-950 dark:text-indigo-50">
										{editingId ? t('agency_roles_edit_title') : t('agency_roles_new_title')}
									</h3>
								</div>
								<button
									type="button"
									onClick={() => {
										if (isDirty) requestBarConfirmation(closePanel);
										else closePanel();
									}}
									className="shrink-0 rounded-lg p-2 text-gray-500 transition-colors hover:bg-indigo-100/80 hover:text-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/35 dark:text-gray-400 dark:hover:bg-indigo-900/40 dark:hover:text-indigo-200"
								>
									<XIcon className="h-5 w-5" />
								</button>
							</div>
						</div>
						<div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-indigo-50/25 to-white px-4 py-4 dark:from-indigo-950/15 dark:to-gray-900">
							{lockPermissionsGrid && (
								<p className="mb-3 rounded-lg border border-indigo-100/80 bg-indigo-50/90 px-3 py-2 text-xs text-indigo-900 dark:border-indigo-800/50 dark:bg-indigo-950/40 dark:text-indigo-100">
									{t('agency_role_admin_fixed_hint')}
								</p>
							)}
							<div className="space-y-4">
								<div>
									<label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
										{t('agency_roles_name_label')}
									</label>
									<GhostInput
										value={draft.name}
										onChange={(v) => setDraft((d) => ({ ...d, name: v }))}
										placeholder={t('agency_roles_name_placeholder')}
										disabled={busy || lockAdminSystemRole}
										className="w-full text-sm"
									/>
								</div>
								<div>
									<label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
										{t('agency_roles_access_level_label')}
									</label>
									<select
										value={normalizeRoleEditorAccessLevel(draft.accessLevel)}
										disabled={busy || lockPermissionsGrid}
										onChange={(e) =>
											setDraft((d) => ({
												...d,
												accessLevel: e.target.value as AgencyAccessLevel,
											}))
										}
										className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20"
									>
										{ACCESS_LEVELS.map((lv) => (
											<option key={lv} value={lv}>
												{t(accessLevelLabelKey(lv))}
											</option>
										))}
									</select>
								</div>
								<div>
									<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-900/55 dark:text-indigo-300/75">
										{t('agency_roles_modules_title')}
									</p>
									<div className="space-y-2">
										{AGENCY_MODULE_KEYS.map((key) => (
											<div
												key={key}
												className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-2 py-1.5 transition-colors hover:border-indigo-100 hover:bg-indigo-50/40 dark:border-gray-700 dark:hover:border-indigo-900/50 dark:hover:bg-indigo-950/20"
											>
												<span className="text-sm text-gray-800 dark:text-gray-200">
													{t(`agency_module_${key}`)}
												</span>
												<select
													value={draft.permissions[key]}
													disabled={busy || lockPermissionsGrid}
													onChange={(e) =>
														setDraft((d) => ({
															...d,
															permissions: {
																...d.permissions,
																[key]: e.target.value as ModuleAccessLevel,
															},
														}))
													}
													className="max-w-[9rem] rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-indigo-400"
												>
													{LEVEL_OPTS.map((lv) => (
														<option key={lv} value={lv}>
															{t(`perm_level_${lv}`)}
														</option>
													))}
												</select>
											</div>
										))}
									</div>
								</div>
								{SHOW_ROLE_WORKFLOW_RESPONSIBILITIES_UI ? (
									<div>
										<button
											type="button"
											onClick={() => setAdvancedOpen((o) => !o)}
											aria-expanded={advancedOpen}
											className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2.5 text-left text-sm font-medium text-gray-800 transition-colors hover:border-indigo-200 hover:bg-indigo-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-200 dark:hover:border-indigo-800/50 dark:hover:bg-indigo-950/30 dark:focus-visible:ring-indigo-400/25"
										>
											<span className="text-indigo-900/85 dark:text-indigo-200/90">{t('agency_role_advanced_options')}</span>
											<ChevronDownIcon
												className={`h-5 w-5 shrink-0 text-indigo-500 transition-transform dark:text-indigo-400 ${advancedOpen ? 'rotate-180' : ''}`}
											/>
										</button>
										{advancedOpen && (
											<div className="mt-3 space-y-3 rounded-lg border border-gray-100 bg-white/70 px-3 py-3 dark:border-gray-700 dark:bg-gray-800/50">
												<p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
													{t('agency_role_advanced_responsibility_desc')}
												</p>
												<p className="text-xs font-semibold uppercase tracking-wide text-indigo-900/55 dark:text-indigo-300/75">
													{t('agency_roles_flags_title')}
												</p>
												<div className="space-y-2">
													<label className="flex cursor-pointer items-center gap-2 rounded-md py-0.5 text-sm text-gray-700 transition-colors hover:text-indigo-900 dark:text-gray-300 dark:hover:text-indigo-200">
														<input
															type="checkbox"
															className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500/35 dark:border-gray-600"
															checked={draft.flags.canBeResponsiblePosts}
															disabled={busy || lockPermissionsGrid}
															onChange={(e) =>
																setDraft((d) => ({
																	...d,
																	flags: { ...d.flags, canBeResponsiblePosts: e.target.checked },
																}))
															}
														/>
														{t('agency_roles_flag_posts')}
													</label>
													<label className="flex cursor-pointer items-center gap-2 rounded-md py-0.5 text-sm text-gray-700 transition-colors hover:text-indigo-900 dark:text-gray-300 dark:hover:text-indigo-200">
														<input
															type="checkbox"
															className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500/35 dark:border-gray-600"
															checked={draft.flags.canBeResponsibleTasks}
															disabled={busy || lockPermissionsGrid}
															onChange={(e) =>
																setDraft((d) => ({
																	...d,
																	flags: { ...d.flags, canBeResponsibleTasks: e.target.checked },
																}))
															}
														/>
														{t('agency_roles_flag_tasks')}
													</label>
													<label className="flex cursor-pointer items-center gap-2 rounded-md py-0.5 text-sm text-gray-700 transition-colors hover:text-indigo-900 dark:text-gray-300 dark:hover:text-indigo-200">
														<input
															type="checkbox"
															className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500/35 dark:border-gray-600"
															checked={draft.flags.canBeResponsibleClients}
															disabled={busy || lockPermissionsGrid}
															onChange={(e) =>
																setDraft((d) => ({
																	...d,
																	flags: { ...d.flags, canBeResponsibleClients: e.target.checked },
																}))
															}
														/>
														{t('agency_roles_flag_clients')}
													</label>
													<label className="flex cursor-pointer items-center gap-2 rounded-md py-0.5 text-sm text-gray-700 transition-colors hover:text-indigo-900 dark:text-gray-300 dark:hover:text-indigo-200">
														<input
															type="checkbox"
															className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500/35 dark:border-gray-600"
															checked={draft.flags.canBeResponsiblePlanning}
															disabled={busy || lockPermissionsGrid}
															onChange={(e) =>
																setDraft((d) => ({
																	...d,
																	flags: { ...d.flags, canBeResponsiblePlanning: e.target.checked },
																}))
															}
														/>
														{t('agency_roles_flag_planning')}
													</label>
												</div>
											</div>
										)}
									</div>
								) : null}
							</div>
						</div>
					</div>

					{isDirty && (
						<UnsavedChangesBar
							onCancel={discardDraft}
							onSave={() => void saveRole()}
							requestConfirmation={requestBarConfirmation}
							feedback={feedback}
							onFeedbackDismiss={() => setFeedback(null)}
						/>
					)}
				</>
			)}
		</div>
	);
});
