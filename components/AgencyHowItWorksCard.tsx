import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppContext } from '../contexts/AppContext';
import { AuthContext } from '../contexts/AuthContext';
import { apiPut } from '../lib/api';
import { applyAgencyRoleTemplate } from '../lib/agencyRoleApply';
import { normalizeSimpleAccessLevelForUi } from '../lib/agencyUserAccess';
import type { AgencyOperationMode, SimpleAccessLevel, User } from '../types';
import { AccessLevelsHelpDrawer } from './AccessLevelsHelpDrawer';
import {
	AgencyTeamConfigurationTable,
	agencyRoleIdForAccessBucket,
	buildTeamConfigDraftKey,
	initialTeamConfigDrafts,
	normalizeOperationalFunctionsToSingle,
	serializeFunctionsForApi,
	toggleTeamFunctionList,
	withOwnerAdmFunctions,
	type TeamConfigRowDraft,
} from './AgencyTeamConfigurationTable';
import type { AgencyRolesManagerHandle } from './AgencyRolesManager';
import { AgencyRolesManager } from './AgencyRolesManager';
import { SaveIcon } from './icons';
import TooltipHint from './TooltipHint';

/**
 * Card unificado "Como sua agência funciona" com abstração de UI:
 * solo | equipe (internamente lean | structured).
 */
const AgencyHowItWorksCard: React.FC = () => {
	const app = useContext(AppContext);
	const auth = useContext(AuthContext);
	const [operationMode, setOperationMode] = useState<AgencyOperationMode>('solo');
	const [teamDraft, setTeamDraft] = useState<Record<string, TeamConfigRowDraft>>({});
	const [saving, setSaving] = useState(false);
	const [accessHelpOpen, setAccessHelpOpen] = useState(false);
	const [allowFlexibleOperationalFunctions, setAllowFlexibleOperationalFunctions] = useState(false);
	const teamSyncKey = useRef('');
	const rolesManagerRef = useRef<AgencyRolesManagerHandle>(null);

	useEffect(() => {
		if (!app) return;
		const om = app.agencyProfile.operationMode ?? 'solo';
		setAllowFlexibleOperationalFunctions(om === 'structured');
	}, [app, app?.agencyProfile.operationMode]);

	if (!app) return null;
	const { t, agencyProfile, reloadAgency, currentUser, notify, updateTeamMember, hasPermission, setPage } = app;

	const isOwner = currentUser?.role === 'owner';
	const agencyRoles = agencyProfile.agencyRoles ?? [];
	const teamMembers = agencyProfile.teamMembers;
	const persistedOperationMode = agencyProfile.operationMode ?? 'solo';
	const isTeamOperationMode = operationMode === 'lean' || operationMode === 'structured';
	const showTeamTable = isTeamOperationMode;

	const canEditRows = isOwner;
	const canManageModels =
		currentUser?.role === 'owner' ||
		(hasPermission('manage_settings') && currentUser?.role !== 'editor');

	useEffect(() => {
		setOperationMode(agencyProfile.operationMode ?? 'solo');
	}, [agencyProfile.operationMode]);

	useEffect(() => {
		if (operationMode !== 'lean' && operationMode !== 'structured') {
			teamSyncKey.current = '';
			return;
		}
		const mode = operationMode as 'lean' | 'structured';
		const key = buildTeamConfigDraftKey(mode, teamMembers, agencyRoles);
		if (key === teamSyncKey.current) return;
		teamSyncKey.current = key;
		setTeamDraft(initialTeamConfigDrafts(mode, teamMembers, agencyRoles));
	}, [operationMode, teamMembers, agencyRoles]);

	const updateTeamMemberCell = useCallback(
		(userId: string, patch: Partial<TeamConfigRowDraft>) => {
			setTeamDraft((prev) => {
				const cur = prev[userId];
				if (!cur) return prev;
				return {
					...prev,
					[userId]: {
						...cur,
						...patch,
						functions: patch.functions ?? cur.functions,
						simpleAccessLevel: patch.simpleAccessLevel ?? cur.simpleAccessLevel,
						agencyRoleId:
							patch.agencyRoleId !== undefined ? patch.agencyRoleId : cur.agencyRoleId,
					},
				};
			});
		},
		[],
	);

	const onToggleFunction = useCallback(
		(userId: string, fnKey: string, checked: boolean) => {
			setTeamDraft((prev) => {
				const cur = prev[userId];
				if (!cur) return prev;
				const member = teamMembers.find((m) => m.id === userId);
				const ownerRow = member?.role === 'owner';
				/** Modo equipe sem múltiplas funções: lean (toggle desligado) ou structured legado sem flex. */
				const enforceSingleOperational =
					!ownerRow &&
					checked &&
					(operationMode === 'lean' ||
						(operationMode === 'structured' && !allowFlexibleOperationalFunctions));
				const nextFns = enforceSingleOperational
					? toggleTeamFunctionList([], fnKey, true)
					: toggleTeamFunctionList(cur.functions, fnKey, checked);
				return {
					...prev,
					[userId]: {
						...cur,
						functions: nextFns,
					},
				};
			});
		},
		[teamMembers, operationMode, allowFlexibleOperationalFunctions],
	);

	const onChangeSimpleAccess = useCallback(
		(userId: string, level: SimpleAccessLevel) => {
			updateTeamMemberCell(userId, { simpleAccessLevel: normalizeSimpleAccessLevelForUi(level) });
		},
		[updateTeamMemberCell],
	);

	const onChangeStructuredAccessBucket = useCallback(
		(userId: string, bucket: SimpleAccessLevel) => {
			const norm = normalizeSimpleAccessLevelForUi(bucket);
			const rid = agencyRoleIdForAccessBucket(norm, agencyRoles);
			updateTeamMemberCell(userId, { agencyRoleId: rid || null });
		},
		[agencyRoles, updateTeamMemberCell],
	);

	const onRequestEditTemplate = useCallback((templateRoleId: string) => {
		if (!templateRoleId) return;
		rolesManagerRef.current?.openEditRoleById(templateRoleId);
	}, []);

	const saveAll = async () => {
		if (!isOwner) return;
		setSaving(true);
		try {
			await apiPut('/agencies/me', { operationMode });

			if (operationMode === 'lean') {
				for (const m of teamMembers) {
					if ((m.inviteStatus ?? 'active') !== 'active') continue;
					const d = teamDraft[m.id];
					if (!d) continue;
					const fns = serializeFunctionsForApi(
						m.role === 'owner'
							? withOwnerAdmFunctions(d.functions)
							: normalizeOperationalFunctionsToSingle(d.functions),
					);
					if (m.role === 'owner') {
						await apiPut(`/users/${m.id}`, { functions: fns });
						continue;
					}
					await apiPut(`/users/${m.id}`, {
						functions: fns,
						simpleAccessLevel: normalizeSimpleAccessLevelForUi(d.simpleAccessLevel),
					});
				}
			}

			if (operationMode === 'structured') {
				for (const m of teamMembers) {
					if ((m.inviteStatus ?? 'active') !== 'active') continue;
					const d = teamDraft[m.id];
					if (!d) continue;
					const fns = serializeFunctionsForApi(
						m.role === 'owner' ? withOwnerAdmFunctions(d.functions) : d.functions,
					);
					if (m.role === 'owner') {
						await apiPut(`/users/${m.id}`, { functions: fns });
						continue;
					}
					const role = agencyRoles.find((r) => r.id === d.agencyRoleId);
					if (!role) continue;
					const applied = applyAgencyRoleTemplate(role);
					const next: User = {
						...m,
						functions: fns,
						agencyRoleId: role.id,
						role: applied.role,
						permissions: applied.permissions,
						canBePostOwner: applied.canBePostOwner,
						canBeTaskOwner: applied.canBeTaskOwner,
						canBeClientOwner: applied.canBeClientOwner,
						canBePlanningOwner: applied.canBePlanningOwner,
					};
					await updateTeamMember(next, { skipAgencyReload: true });
				}
			}

			await auth?.refreshMe?.();
			await reloadAgency();
			notify?.(t('settings_save_success'));
		} catch {
			notify?.(t('agency_op_save_error'));
		} finally {
			setSaving(false);
		}
	};

	const disabledCls = !isOwner ? 'cursor-not-allowed opacity-60' : '';
	const settingsSubsectionTitleClass =
		'text-base font-semibold leading-snug text-gray-900 dark:text-white';
	const settingsSubsectionDescClass =
		'mt-1 max-w-2xl text-sm leading-relaxed text-gray-500 dark:text-gray-400';
	const radioLabelClass =
		'flex cursor-pointer items-center gap-2.5 rounded-md py-1.5 pl-0.5 pr-2 -mx-0.5 text-sm text-gray-800 dark:text-gray-200 transition-colors hover:bg-gray-50/80 dark:hover:bg-white/[0.03]';
	const selectedOptionHintClass =
		'mt-2 max-w-2xl border-l-2 border-indigo-200 pl-3.5 text-sm leading-relaxed text-gray-600 dark:border-indigo-500/35 dark:text-gray-300';

	return (
		<section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
			<div className="space-y-8 p-6">
				<div>
					<h2 className={settingsSubsectionTitleClass}>{t('settings_agency_operation_mode_title')}</h2>
					<p className={settingsSubsectionDescClass}>{t('settings_agency_operation_mode_desc')}</p>
					<div className={`mt-4 space-y-3 ${disabledCls}`}>
						<div>
							<label className={radioLabelClass}>
								<input
									type="radio"
									name="agencyOperationMode"
									checked={operationMode === 'solo'}
									onChange={() => setOperationMode('solo')}
									disabled={!isOwner}
									className="h-4 w-4 shrink-0 border-gray-300 text-indigo-600 focus:ring-indigo-500/30 dark:border-gray-600"
								/>
								<span>{t('settings_agency_operation_solo')}</span>
							</label>
							{operationMode === 'solo' && (
								<div className={selectedOptionHintClass} role="status">
									<p>{t('settings_operation_explain_solo')}</p>
								</div>
							)}
						</div>
						<div>
							<label className={radioLabelClass}>
								<input
									type="radio"
									name="agencyOperationMode"
									checked={isTeamOperationMode}
									onChange={() => setOperationMode(allowFlexibleOperationalFunctions ? 'structured' : 'lean')}
									disabled={!isOwner}
									className="h-4 w-4 shrink-0 border-gray-300 text-indigo-600 focus:ring-indigo-500/30 dark:border-gray-600"
								/>
								<span>{t('settings_agency_operation_team')}</span>
							</label>
							{isTeamOperationMode && (
								<div className={selectedOptionHintClass} role="status">
									<p>{t('settings_operation_explain_team')}</p>
								</div>
							)}
						</div>
					</div>
				</div>

				{showTeamTable && (
					<div
						id="settings-team-config"
						className="space-y-4 border-t border-gray-100 pt-6 scroll-mt-4 dark:border-gray-700"
					>
						<div className="space-y-4">
							<div>
								<div className="flex items-end justify-between gap-3">
									<div className="min-w-0 flex-1 pr-2">
										<h2 className={settingsSubsectionTitleClass}>
											{t('settings_team_unified_title')}
										</h2>
										<p className={settingsSubsectionDescClass}>
											{t('settings_team_unified_desc')}
										</p>
									</div>
									{isTeamOperationMode ? (
										<TooltipHint
											label={t('settings_team_allow_multiple_functions_tooltip')}
											className="inline-flex shrink-0"
										>
											<label
												className={`inline-flex shrink-0 items-center gap-1.5 ${isOwner ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
											>
												<span className="whitespace-nowrap text-xs font-medium text-gray-600 dark:text-gray-400">
													{t('settings_team_allow_multiple_functions')}
												</span>
												<span className="relative inline-flex shrink-0 items-center">
													<input
														type="checkbox"
														role="switch"
														aria-checked={allowFlexibleOperationalFunctions}
														aria-label={t('settings_team_allow_multiple_functions_tooltip')}
														className="peer sr-only"
														checked={allowFlexibleOperationalFunctions}
														onChange={(e) => {
															const checked = e.target.checked;
															setAllowFlexibleOperationalFunctions(checked);
															setOperationMode(checked ? 'structured' : 'lean');
														}}
														disabled={!isOwner}
													/>
													<span
														aria-hidden
														className="relative inline-block h-6 w-11 rounded-full bg-gray-200/90 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:ring-1 after:ring-gray-900/5 after:transition-transform after:content-[''] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-indigo-500/35 peer-checked:bg-indigo-600 peer-checked:after:translate-x-[1.25rem] dark:bg-gray-600/90 dark:after:ring-white/10 dark:peer-checked:bg-indigo-500"
													/>
												</span>
											</label>
										</TooltipHint>
									) : null}
								</div>
							</div>

							<div className="mt-8">
								<AgencyTeamConfigurationTable
									mode={operationMode === 'structured' ? 'structured' : 'lean'}
									teamMembers={teamMembers}
									agencyRoles={agencyRoles}
									drafts={teamDraft}
									canEditRows={canEditRows}
									canManageRoleTemplates={canManageModels && currentUser?.role !== 'editor'}
									onToggleFunction={onToggleFunction}
									onChangeSimpleAccess={onChangeSimpleAccess}
									onChangeStructuredAccessBucket={onChangeStructuredAccessBucket}
									onRequestEditTemplate={onRequestEditTemplate}
									onOpenAccessLevelsHelp={() => setAccessHelpOpen(true)}
									onCreateAgencyRole={() => rolesManagerRef.current?.openCreateRole()}
									showNewRoleInHeader={canManageModels && currentUser?.role !== 'editor'}
									currentUserId={currentUser?.id ?? null}
									onEditOwnProfile={() => {
										try {
											sessionStorage.setItem('flow_account_nav', JSON.stringify({ tab: 'details' }));
										} catch {
											/* ignore */
										}
										setPage('account');
									}}
									t={t}
								/>
							</div>
						</div>

						{/* Drawer de edição de funções da agência (sem tabela duplicada). */}
						<AgencyRolesManager ref={rolesManagerRef} variant="drawerOnly" />
					</div>
				)}

				<AccessLevelsHelpDrawer open={accessHelpOpen} onClose={() => setAccessHelpOpen(false)} t={t} />

				{isOwner && (
					<div className="border-t border-gray-100 pt-6 dark:border-gray-700">
						<button
							type="button"
							onClick={() => void saveAll()}
							disabled={saving}
							className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
						>
							<SaveIcon className="h-4 w-4" />
							{saving ? t('saving') : t('save')}
						</button>
					</div>
				)}
			</div>
		</section>
	);
};

export default AgencyHowItWorksCard;
