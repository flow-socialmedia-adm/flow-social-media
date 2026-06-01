import React, { useContext, useState, useEffect } from 'react';
import { apiDelete, apiPatch, apiPost, toUploadUrl } from '../lib/api';
import { AppContext } from '../contexts/AppContext';
import {
	UserPlusIcon,
	TrashIcon,
	ShieldIcon,
	BanIcon,
	EditIcon,
	SendIcon,
	KeyIcon,
	CheckCircleIcon,
	XIcon,
	LinkIcon,
} from './icons';
import type { User, UserRole, Permission, AgencyRole } from '../types';
import { AGENCY_USER_FUNCTION_KEYS } from '../lib/agencyUserFunctions';
import { applyAgencyRoleTemplate } from '../lib/agencyRoleApply';
import { hasTeamFunction, serializeFunctionsForApi, toggleTeamFunctionList } from './AgencyTeamConfigurationTable';
import TooltipHint from './TooltipHint';

const USER_FUNCTION_OPTIONS: { key: (typeof AGENCY_USER_FUNCTION_KEYS)[number]; labelKey: string }[] = [
	{ key: 'adm', labelKey: 'team_user_fn_adm' },
	{ key: 'gestor', labelKey: 'team_user_fn_gestor_fn' },
	{ key: 'social_media', labelKey: 'team_user_fn_social_media' },
	{ key: 'designer', labelKey: 'team_user_fn_designer' },
	{ key: 'atendimento', labelKey: 'team_user_fn_atendimento' },
	{ key: 'videomaker', labelKey: 'team_user_fn_videomaker' },
	{ key: 'estrategia', labelKey: 'team_user_fn_estrategia' },
	{ key: 'trafego', labelKey: 'team_user_fn_trafego' },
	{ key: 'financeiro', labelKey: 'team_user_fn_financeiro' },
];

interface TeamSettingsProps {
	onEditProfile?: () => void;
}

const ALL_PERMISSIONS: Permission[] = [
	'view_dashboard',
	'view_agenda',
	'manage_clients',
	'view_clients',
	'manage_finance',
	'view_finance',
	'manage_team',
	'view_team',
	'manage_settings',
	'view_settings',
];

function getDefaultPermissions(role: UserRole): Permission[] {
	switch (role) {
		case 'owner':
			return ALL_PERMISSIONS;
		case 'admin':
			return [
				'view_dashboard',
				'view_agenda',
				'manage_clients',
				'view_clients',
				'manage_finance',
				'view_finance',
				'manage_team',
				'view_team',
			];
		case 'editor':
			return ['view_dashboard', 'view_agenda', 'manage_clients', 'view_clients'];
		default:
			return ['view_dashboard'];
	}
}

export const TeamSettings: React.FC<TeamSettingsProps> = ({ onEditProfile }) => {
	const context = useContext(AppContext);
	const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
	const [inviteName, setInviteName] = useState('');
	const [inviteEmail, setInviteEmail] = useState('');
	const [inviteAgencyRoleId, setInviteAgencyRoleId] = useState<string>('');
	const [inviteRole, setInviteRole] = useState<'admin' | 'editor'>('editor');
	const [invitePermissions, setInvitePermissions] = useState<Permission[]>(() => getDefaultPermissions('editor'));
	const [inviteCanPost, setInviteCanPost] = useState(true);
	const [inviteCanTask, setInviteCanTask] = useState(true);
	const [inviteCanClient, setInviteCanClient] = useState(true);
	const [inviteCanPlanning, setInviteCanPlanning] = useState(true);
	const [inviteFunctions, setInviteFunctions] = useState<string[]>([]);
	const [devLinkModal, setDevLinkModal] = useState<string | null>(null);

	const reloadAgency = context?.reloadAgency;

	/** Recarrega membros ao abrir a página e ao voltar à aba — após aceitar convite o dono via cache antigo de `pending_invite`. */
	useEffect(() => {
		void reloadAgency?.();
	}, [reloadAgency]);

	useEffect(() => {
		const onVis = () => {
			if (document.visibilityState === 'visible') void reloadAgency?.();
		};
		document.addEventListener('visibilitychange', onVis);
		return () => document.removeEventListener('visibilitychange', onVis);
	}, [reloadAgency]);

	if (!context) return null;
	const {
		t,
		agencyProfile,
		addTeamMember,
		removeTeamMember,
		showConfirmation,
		setPage,
		currentUser,
		canViewModule,
		canEditModule,
		notify,
	} = context;

	const canEditTeam = canEditModule('team');
	const canManageInvites = currentUser?.role === 'owner' || currentUser?.role === 'admin';
	const canInvite = canEditTeam && canManageInvites;
	const canOpenSettings = canViewModule('settings');
	const agencyRoles = agencyProfile.agencyRoles ?? [];
	const hasAgencyRoles = agencyRoles.length > 0;

	/** Só o nome da função no select; o nível de acesso fica na coluna dedicada. */
	const inviteRoleOptionLabel = (r: AgencyRole) => r.name;

	const activeUserCount = agencyProfile.teamMembers.length;
	const maxUsers = agencyProfile.subscription.maxUsers;
	const isLimitReached = activeUserCount >= maxUsers;
	const usagePercentage = (activeUserCount / maxUsers) * 100;

	const openInviteModal = () => {
		setInviteName('');
		setInviteEmail('');
		setInviteAgencyRoleId('');
		setInviteRole('editor');
		setInvitePermissions(getDefaultPermissions('editor'));
		setInviteCanPost(true);
		setInviteCanTask(true);
		setInviteCanClient(true);
		setInviteCanPlanning(true);
		setInviteFunctions([]);
		setIsInviteModalOpen(true);
	};

	const applyInviteTemplate = (roleId: string) => {
		setInviteAgencyRoleId(roleId);
		if (!roleId) {
			setInviteRole('editor');
			setInvitePermissions(getDefaultPermissions('editor'));
			setInviteCanPost(true);
			setInviteCanTask(true);
			setInviteCanClient(true);
			setInviteCanPlanning(true);
			return;
		}
		const def = agencyRoles.find((r) => r.id === roleId);
		if (!def) return;
		const applied = applyAgencyRoleTemplate(def);
		setInviteRole(applied.role === 'admin' ? 'admin' : 'editor');
		setInvitePermissions(applied.permissions);
		setInviteCanPost(applied.canBePostOwner);
		setInviteCanTask(applied.canBeTaskOwner);
		setInviteCanClient(applied.canBeClientOwner);
		setInviteCanPlanning(applied.canBePlanningOwner);
	};

	const handleInviteSave = async () => {
		const name = inviteName.trim();
		const email = inviteEmail.trim();
		if (!name || !email || !inviteAgencyRoleId || !hasAgencyRoles) return;
		const newUser: User = {
			id: `user-${Date.now()}`,
			name,
			email,
			role: inviteRole,
			permissions: invitePermissions,
			operationalRole: 'OUTRO',
			canBeTaskOwner: inviteCanTask,
			canBePostOwner: inviteCanPost,
			canBeClientOwner: inviteCanClient,
			canBePlanningOwner: inviteCanPlanning,
			agencyRoleId: inviteAgencyRoleId,
			functions: inviteFunctions,
		};
		try {
			const r = await addTeamMember(newUser);
			setIsInviteModalOpen(false);
			if (r && typeof r === 'object' && r.devInviteUrl) {
				setDevLinkModal(r.devInviteUrl);
			} else {
				notify?.(t('team_invite_created_toast'));
			}
		} catch {
			/* alert já em App */
		}
	};

	const onResendInvite = async (userId: string) => {
		try {
			const r = await apiPost<{ devInviteUrl?: string }>(`/users/${userId}/resend-invite`, {});
			await reloadAgency?.();
			if (import.meta.env.DEV && r.devInviteUrl) setDevLinkModal(r.devInviteUrl);
			notify?.('Convite reenviado.');
		} catch {
			notify?.('Falha ao reenviar convite.');
		}
	};

	const onCancelInvite = (userId: string) => {
		showConfirmation({
			title: t('delete'),
			message: t('team_invite_cancel_confirm'),
			onConfirm: async () => {
				try {
					await apiDelete(`/users/${userId}/invite`);
					await reloadAgency?.();
					notify?.('Convite cancelado.');
				} catch {
					notify?.('Falha ao cancelar convite.');
				}
			},
		});
	};

	const onDisableMember = (userId: string) => {
		showConfirmation({
			title: t('delete'),
			message: t('team_disable_access_confirm'),
			onConfirm: async () => {
				try {
					await apiPatch(`/users/${userId}/disable`, {});
					await reloadAgency?.();
					notify?.('Acesso desativado.');
				} catch {
					notify?.('Falha ao desativar.');
				}
			},
		});
	};

	const onReactivateMember = async (userId: string) => {
		try {
			await apiPatch(`/users/${userId}/reactivate`, {});
			await reloadAgency?.();
			notify?.('Acesso reativado.');
		} catch {
			notify?.('Falha ao reativar.');
		}
	};

	const onRequestPasswordReset = async (userId: string) => {
		try {
			const r = await apiPost<{ devPasswordResetUrl?: string }>(`/users/${userId}/password-reset`, {});
			if (import.meta.env.DEV && r.devPasswordResetUrl) {
				setDevLinkModal(r.devPasswordResetUrl);
				notify?.('Link de teste de redefinição gerado (veja o modal).');
			} else {
				notify?.('Instruções de redefinição serão enviadas por e-mail quando o envio estiver ativo.');
			}
		} catch {
			notify?.('Falha ao solicitar redefinição.');
		}
	};

	const memberStatusBadge = (member: User) => {
		const s = member.inviteStatus ?? 'active';
		if (s === 'pending_invite') {
			return (
				<span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
					{t('team_status_awaiting_activation')}
				</span>
			);
		}
		if (s === 'disabled') {
			return (
				<span className="inline-flex rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-800 dark:bg-gray-600 dark:text-gray-100">
					{t('team_status_no_access')}
				</span>
			);
		}
		return (
			<span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100">
				{t('team_status_active')}
			</span>
		);
	};

	const actionIconClass =
		'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:pointer-events-none disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100';

	const actionRowClass = 'flex min-h-10 flex-nowrap items-center justify-start gap-3';

	/** Duas colunas a partir de lg: colaborador minmax(320px,520px), ações 168px; md em 2 col com min 0 para card estreito. */
	const teamMemberListGridClass =
		'grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-[minmax(0,520px)_168px] md:items-center md:justify-start md:gap-y-0 lg:grid-cols-[minmax(320px,520px)_168px]';

	const handleRemove = (userId: string) => {
		showConfirmation({
			title: t('delete'),
			message: t('confirm_generic_delete_message'),
			onConfirm: () => removeTeamMember(userId),
		});
	};

	const toggleInviteFunction = (fnKey: string, checked: boolean) => {
		setInviteFunctions((prev) => serializeFunctionsForApi(toggleTeamFunctionList(prev, fnKey, checked)));
	};

	const openSettingsTeamConfig = () => {
		setIsInviteModalOpen(false);
		try {
			sessionStorage.setItem('flow_settings_focus', 'team-config');
		} catch {
			/* ignore */
		}
		setPage('settings');
	};

	return (
		<div className="w-full min-w-0 text-left">
			<p className="mb-8 text-sm leading-relaxed text-gray-600 dark:text-gray-300 sm:mb-10">{t('team_equipe_intro')}</p>
			{canInvite && (
				<div className="mb-6 flex justify-end">
					<TooltipHint label={isLimitReached ? t('user_limit_reached') : t('invite_member')}>
						<button
							type="button"
							onClick={openInviteModal}
							disabled={isLimitReached}
							aria-label={isLimitReached ? t('user_limit_reached') : t('invite_member')}
							className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-600 dark:hover:bg-indigo-500"
						>
							<UserPlusIcon className="h-5 w-5 shrink-0" />
							<span>{t('invite_member')}</span>
						</button>
					</TooltipHint>
				</div>
			)}

			<div>
				<div className="mb-6 rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-900/40">
					<div className="mb-2 flex items-center justify-between">
						<span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('active_users')}</span>
						<span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
							{activeUserCount} / {maxUsers}
						</span>
					</div>
					<div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
						<div
							className={`h-2.5 rounded-full transition-all duration-500 ${isLimitReached ? 'bg-red-500' : 'bg-indigo-600'}`}
							style={{ width: `${Math.min(usagePercentage, 100)}%` }}
						/>
					</div>
					{isLimitReached && (
						<p className="mt-2 flex items-center gap-1 text-xs text-red-500">
							<ShieldIcon className="h-3 w-3 shrink-0" />
							{t('user_limit_reached')}.{' '}
							<button
								type="button"
								onClick={() => setPage('account')}
								className="font-bold underline hover:text-red-700"
							>
								{t('upgrade')}
							</button>
						</p>
					)}
				</div>

				<div className="overflow-hidden rounded-xl border border-gray-200 bg-white text-sm shadow-sm dark:border-gray-700 dark:bg-gray-800">
					<div className="min-w-0">
						<div
							className={`border-b border-gray-200 bg-gray-50/90 px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500 md:px-6 dark:border-gray-600 dark:bg-gray-900/50 dark:text-gray-400 ${teamMemberListGridClass}`}
						>
							<span className="min-w-0 pl-3 md:pl-4">{t('team_table_col_member')}</span>
							<span className="w-full whitespace-nowrap text-left md:w-[168px] md:shrink-0">
								{t('team_table_col_actions')}
							</span>
						</div>
						<ul className="divide-y divide-gray-100 dark:divide-gray-700" role="list">
							{agencyProfile.teamMembers.map((member) => {
								const isMe = member.id === currentUser?.id;
								const isOwner = member.role === 'owner';
								const isPending = member.inviteStatus === 'pending_invite';
								const isDisabled = member.inviteStatus === 'disabled';

								return (
									<li key={member.id}>
										<div
											className={`px-5 py-5 md:px-6 md:py-6 ${teamMemberListGridClass}`}
										>
											<div className="flex min-w-0 max-w-[520px] items-center gap-3.5 pl-3 md:pl-4">
												{member.avatarUrl ? (
													<img
														src={toUploadUrl(member.avatarUrl)}
														alt=""
														className="h-9 w-9 shrink-0 rounded-full border border-gray-200 object-cover dark:border-gray-600"
													/>
												) : (
													<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200">
														{member.name.charAt(0).toUpperCase()}
													</div>
												)}
												<div className="min-w-0">
													<div className="flex flex-wrap items-center gap-2">
														<span className="font-semibold text-gray-900 dark:text-white">{member.name}</span>
														{isMe && (
															<span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-200">
																{t('my_profile')}
															</span>
														)}
														{isOwner && (
															<TooltipHint label={t('role_owner')}>
																<span className="text-amber-500" aria-hidden>
																	★
																</span>
															</TooltipHint>
														)}
													</div>
													<p className="mt-2 truncate text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
													<div className="mt-1.5 flex flex-wrap items-center gap-1.5">
														{memberStatusBadge(member)}
														{isMe && onEditProfile && (
															<TooltipHint label={t('team_edit_profile_tooltip')}>
																<button
																	type="button"
																	onClick={() => onEditProfile()}
																	className={actionIconClass}
																	aria-label={t('team_edit_profile_tooltip')}
																>
																	<EditIcon className="h-5 w-5" />
																</button>
															</TooltipHint>
														)}
													</div>
												</div>
											</div>
											<div className="flex w-full min-w-0 items-center justify-start md:w-[168px] md:shrink-0">
												{!isOwner && canManageInvites && (
													<div className={actionRowClass}>
														{isPending && (
															<>
																{import.meta.env.DEV ? (
																	<TooltipHint label={t('team_action_dev_invite_link')}>
																		<button
																			type="button"
																			onClick={() => void onResendInvite(member.id)}
																			className={actionIconClass}
																			aria-label={t('team_action_dev_invite_link')}
																		>
																			<LinkIcon className="h-5 w-5" />
																		</button>
																	</TooltipHint>
																) : (
																	<TooltipHint label={t('team_action_resend_invite')}>
																		<button
																			type="button"
																			onClick={() => void onResendInvite(member.id)}
																			className={actionIconClass}
																			aria-label={t('team_action_resend_invite')}
																		>
																			<SendIcon className="h-5 w-5" />
																		</button>
																	</TooltipHint>
																)}
																<TooltipHint label={t('team_action_cancel_invite')}>
																	<button
																		type="button"
																		onClick={() => onCancelInvite(member.id)}
																		className={`${actionIconClass} hover:text-red-600 dark:hover:text-red-400`}
																		aria-label={t('team_action_cancel_invite')}
																	>
																		<XIcon className="h-5 w-5" />
																	</button>
																</TooltipHint>
																<TooltipHint label={t('team_action_remove_member')}>
																	<button
																		type="button"
																		onClick={() => handleRemove(member.id)}
																		className={`${actionIconClass} hover:text-red-600 dark:hover:text-red-400`}
																		aria-label={t('team_action_remove_member')}
																	>
																		<TrashIcon className="h-5 w-5" />
																	</button>
																</TooltipHint>
															</>
														)}
														{!isPending && !isDisabled && (
															<>
																<TooltipHint label={t('team_action_password_reset')}>
																	<button
																		type="button"
																		onClick={() => void onRequestPasswordReset(member.id)}
																		className={actionIconClass}
																		aria-label={t('team_action_password_reset')}
																	>
																		<KeyIcon className="h-5 w-5" />
																	</button>
																</TooltipHint>
																<TooltipHint label={t('team_action_disable_access')}>
																	<button
																		type="button"
																		onClick={() => onDisableMember(member.id)}
																		className={`${actionIconClass} text-gray-600 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-950/30 dark:hover:text-red-400`}
																		aria-label={t('team_action_disable_access')}
																	>
																		<BanIcon className="h-5 w-5" />
																	</button>
																</TooltipHint>
																<TooltipHint label={t('team_action_remove_member')}>
																	<button
																		type="button"
																		onClick={() => handleRemove(member.id)}
																		className={`${actionIconClass} hover:text-red-600 dark:hover:text-red-400`}
																		aria-label={t('team_action_remove_member')}
																	>
																		<TrashIcon className="h-5 w-5" />
																	</button>
																</TooltipHint>
															</>
														)}
														{isDisabled && (
															<TooltipHint label={t('team_action_reactivate_access')}>
																<button
																	type="button"
																	onClick={() => void onReactivateMember(member.id)}
																	className={`${actionIconClass} text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40`}
																	aria-label={t('team_action_reactivate_access')}
																>
																	<CheckCircleIcon className="h-5 w-5" />
																</button>
															</TooltipHint>
														)}
													</div>
												)}
											</div>
										</div>
									</li>
								);
							})}
						</ul>
					</div>
				</div>

				{canOpenSettings && (
					<div className="mt-5 flex flex-wrap items-baseline gap-x-1 gap-y-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
						<span>{t('team_equipe_footer_line')}</span>
						<button
							type="button"
							onClick={openSettingsTeamConfig}
							className="font-medium text-indigo-600 underline-offset-2 hover:text-indigo-800 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300"
						>
							{t('team_equipe_footer_link_settings')}
						</button>
					</div>
				)}
			</div>

			{isInviteModalOpen && canInvite && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
					<div
						className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-600 dark:bg-gray-800"
						role="dialog"
						aria-labelledby="team-invite-title"
					>
						<h2 id="team-invite-title" className="mb-1 text-xl font-bold text-gray-900 dark:text-white">
							{t('invite_member')}
						</h2>
						<p className="mb-4 text-sm text-gray-500 dark:text-gray-400">{t('team_invite_modal_hint')}</p>

						{isLimitReached ? (
							<div className="py-4 text-center">
								<ShieldIcon className="mx-auto mb-3 h-12 w-12 text-red-500" />
								<h3 className="mb-2 text-lg font-bold text-gray-800 dark:text-white">
									{t('user_limit_reached')}
								</h3>
								<p className="mb-6 text-gray-600 dark:text-gray-400">{t('upgrade_plan_msg')}</p>
								<div className="flex justify-center gap-3">
									<button
										type="button"
										onClick={() => setIsInviteModalOpen(false)}
										className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
									>
										{t('cancel')}
									</button>
									<button
										type="button"
										onClick={() => {
											setIsInviteModalOpen(false);
											setPage('account');
										}}
										className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
									>
										{t('upgrade')}
									</button>
								</div>
							</div>
						) : !hasAgencyRoles ? (
							<div className="space-y-4 py-2">
								<p className="text-sm font-medium text-gray-900 dark:text-white">{t('team_invite_no_roles_title')}</p>
								<p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
									{t('team_invite_no_roles_message')}
								</p>
								<div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
									<button
										type="button"
										onClick={() => setIsInviteModalOpen(false)}
										className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
									>
										{t('cancel')}
									</button>
									{canOpenSettings ? (
										<button
											type="button"
											onClick={openSettingsTeamConfig}
											className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
										>
											{t('team_invite_go_settings')}
										</button>
									) : (
										<p className="text-xs text-gray-500 dark:text-gray-400">{t('team_invite_no_roles_contact_admin')}</p>
									)}
								</div>
							</div>
						) : (
							<div className="space-y-4">
								<div>
									<label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
										{t('full_name')}
									</label>
									<input
										type="text"
										value={inviteName}
										onChange={(e) => setInviteName(e.target.value)}
										className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-gray-900 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-400"
									/>
								</div>
								<div>
									<label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
										{t('email')}
									</label>
									<input
										type="email"
										value={inviteEmail}
										onChange={(e) => setInviteEmail(e.target.value)}
										className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-gray-900 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-400"
									/>
								</div>
								<div>
									<label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
										{t('team_invite_role_template')}
									</label>
									<select
										value={inviteAgencyRoleId}
										onChange={(e) => applyInviteTemplate(e.target.value)}
										required
										className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-gray-900 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-400"
									>
										<option value="" disabled>
											{t('team_invite_role_choose')}
										</option>
										{agencyRoles.map((r) => (
											<option key={r.id} value={r.id}>
												{inviteRoleOptionLabel(r)}
											</option>
										))}
									</select>
									<p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
										{t('team_invite_role_defines_access')}
									</p>
								</div>
								<div>
									<span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
										{t('team_user_functions_label')}
									</span>
									<div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-600">
										{USER_FUNCTION_OPTIONS.map(({ key, labelKey }) => (
											<label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
												<input
													type="checkbox"
													checked={hasTeamFunction(inviteFunctions, key)}
													onChange={(e) => toggleInviteFunction(key, e.target.checked)}
													className="h-4 w-4 rounded border-gray-300 text-indigo-600"
												/>
												<span>{t(labelKey)}</span>
											</label>
										))}
									</div>
								</div>
								<div className="mt-6 flex justify-end gap-3">
									<button
										type="button"
										onClick={() => setIsInviteModalOpen(false)}
										className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
									>
										{t('cancel')}
									</button>
									<button
										type="button"
										onClick={() => void handleInviteSave()}
										disabled={!inviteName.trim() || !inviteEmail.trim() || !inviteAgencyRoleId}
										className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
									>
										{t('invite_member')}
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			)}

			{devLinkModal && (
				<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
					<div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-600 dark:bg-gray-800">
						<h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
							Link de teste (desenvolvimento)
						</h3>
						<p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
							Em produção este link não é exibido; use envio de e-mail. Copie e abra em uma janela anônima para testar.
						</p>
						<input
							readOnly
							value={devLinkModal}
							className="mb-4 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-800 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
						/>
						<div className="flex flex-wrap justify-end gap-2">
							<button
								type="button"
								onClick={() => {
									void navigator.clipboard.writeText(devLinkModal);
									notify?.('Link copiado.');
								}}
								className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
							>
								Copiar
							</button>
							<button
								type="button"
								onClick={() => setDevLinkModal(null)}
								className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
							>
								Fechar
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

const TeamPage: React.FC = () => {
	return (
		<div className="w-full min-w-0 text-left">
			<TeamSettings />
		</div>
	);
};

export default TeamPage;
