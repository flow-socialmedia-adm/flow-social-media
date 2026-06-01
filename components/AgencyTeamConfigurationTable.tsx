import React from 'react';
import { toUploadUrl } from '../lib/api';
import { EditIcon, InfoIcon, PlusIcon, SettingsIcon } from './icons';
import {
	inferSimpleAccessFromMember,
	normalizeSimpleAccessLevelForUi,
	permissionsSummaryForSimpleAccessLevel,
	sanitizeSimpleLevelForNonOwner,
	SETTINGS_MEMBER_ACCESS_LEVELS,
} from '../lib/agencyUserAccess';
import { parseAgencyRolePermissions, permissionsSummary, type AgencyModuleKey, type ModuleAccessLevel } from '../lib/modulePermissions';
import type { AgencyRole, SimpleAccessLevel, User } from '../types';
import TooltipHint from './TooltipHint';

/** Ordem das funções na coluna “Função do colaborador” (chaves alinhadas à API). */
export const TEAM_TABLE_FUNCTION_KEYS = [
	'adm',
	'gestor',
	'social_media',
	'designer',
	'atendimento',
	'videomaker',
	'estrategia',
	'trafego',
	'financeiro',
] as const;

export type TeamConfigRowDraft = {
	functions: string[];
	simpleAccessLevel: SimpleAccessLevel;
	agencyRoleId: string | null;
};

const FN_LABEL_KEY: Record<(typeof TEAM_TABLE_FUNCTION_KEYS)[number], string> = {
	adm: 'team_user_fn_adm',
	gestor: 'team_user_fn_gestor_fn',
	social_media: 'team_user_fn_social_media',
	designer: 'team_user_fn_designer',
	atendimento: 'team_user_fn_atendimento',
	videomaker: 'team_user_fn_videomaker',
	estrategia: 'team_user_fn_estrategia',
	trafego: 'team_user_fn_trafego',
	financeiro: 'team_user_fn_financeiro',
};

const TEAM_FN_FLOW_I18N: Record<(typeof TEAM_TABLE_FUNCTION_KEYS)[number], string> = {
	adm: 'team_fn_flow_adm',
	gestor: 'team_fn_flow_gestor',
	social_media: 'team_fn_flow_social_media',
	designer: 'team_fn_flow_designer',
	atendimento: 'team_fn_flow_atendimento',
	videomaker: 'team_fn_flow_videomaker',
	estrategia: 'team_fn_flow_estrategia',
	trafego: 'team_fn_flow_trafego',
	financeiro: 'team_fn_flow_financeiro',
};

function collectFlowLinesForFunctions(fns: string[], t: (key: string) => string): string[] {
	const parts: string[] = [];
	const seen = new Set<string>();
	for (const key of TEAM_TABLE_FUNCTION_KEYS) {
		if (!hasTeamFunction(fns, key)) continue;
		const msgKey = TEAM_FN_FLOW_I18N[key];
		const raw = t(msgKey);
		if (!raw || raw === msgKey) continue;
		for (const seg of raw.split('|').map((s) => s.trim()).filter(Boolean)) {
			if (seen.has(seg)) continue;
			seen.add(seg);
			parts.push(seg);
		}
	}
	return parts;
}

function CollaboratorFlowPreview({ lines, emptyLabel }: { lines: string[]; emptyLabel: string }) {
	if (lines.length === 0) {
		return <p className="text-xs leading-relaxed text-gray-400 dark:text-gray-500">{emptyLabel}</p>;
	}
	return (
		<ul className="space-y-2">
			{lines.map((line, i) => (
				<li key={i} className="flex gap-2.5 text-xs leading-snug text-gray-700 dark:text-gray-300">
					<span
						className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400/90 ring-2 ring-indigo-100/90 dark:bg-indigo-400 dark:ring-indigo-900/60"
						aria-hidden
					/>
					<span>{line}</span>
				</li>
			))}
		</ul>
	);
}

function teamMemberStatusBadge(member: User, t: (key: string) => string) {
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
}

const SIMPLE_LEVEL_LABEL_KEY: Record<SimpleAccessLevel, string> = {
	colaboracao: 'simple_access_colaboracao',
	gerenciar: 'simple_access_gerenciar',
	acesso_total: 'simple_access_acesso_total',
	administrador: 'simple_access_administrador',
	gestor: 'simple_access_gestor',
	operacional: 'simple_access_operacional',
	financeiro: 'simple_access_financeiro',
};

export function hasTeamFunction(functions: string[], key: string): boolean {
	if (key === 'videomaker') return functions.includes('videomaker') || functions.includes('video');
	return functions.includes(key);
}

export function toggleTeamFunctionList(functions: string[], key: string, on: boolean): string[] {
	let next = [...functions];
	if (key === 'videomaker') {
		next = next.filter((x) => x !== 'video' && x !== 'videomaker');
		if (on) next.push('videomaker');
		return [...new Set(next)];
	}
	next = next.filter((x) => x !== key);
	if (on) next.push(key);
	return [...new Set(next)];
}

/** Uma função operacional por colaborador (ordem da tabela), para modo equipe sem múltiplas funções. */
export function normalizeOperationalFunctionsToSingle(functions: string[]): string[] {
	for (const key of TEAM_TABLE_FUNCTION_KEYS) {
		if (hasTeamFunction(functions, key)) {
			return toggleTeamFunctionList([], key, true);
		}
	}
	return [];
}

export function withOwnerAdmFunctions(functions: string[]): string[] {
	return [...new Set(['adm', ...functions.filter((k) => k !== 'adm')])];
}

export function serializeFunctionsForApi(functions: string[]): string[] {
	const out: string[] = [];
	for (const x of functions) {
		if (x === 'video') {
			if (!out.includes('videomaker')) out.push('videomaker');
			continue;
		}
		if (!out.includes(x)) out.push(x);
	}
	return out;
}

/** Mapeia o nível da UI (4 opções) para o id da função de sistema correspondente. */
export function agencyRoleIdForAccessBucket(bucket: SimpleAccessLevel, roles: AgencyRole[]): string {
	if (!roles.length) return '';
	const pick = (...fns: Array<() => AgencyRole | undefined>) => {
		for (const fn of fns) {
			const r = fn();
			if (r) return r.id;
		}
		return '';
	};
	switch (bucket) {
		case 'administrador':
		case 'acesso_total':
			return pick(
				() => roles.find((r) => r.systemKey === 'ADMIN'),
				() => roles.find((r) => r.accessLevel === 'ADMIN'),
			);
		case 'gestor':
		case 'gerenciar':
			return pick(
				() => roles.find((r) => r.systemKey === 'MANAGER'),
				() => roles.find((r) => r.accessLevel === 'MANAGER'),
			);
		case 'financeiro':
			return pick(
				() => roles.find((r) => r.systemKey === 'FINANCEIRO'),
				() => roles.find((r) => r.accessLevel === 'FINANCIAL'),
			);
		case 'colaboracao':
		case 'operacional':
		default:
			return pick(
				() => roles.find((r) => r.systemKey === 'SOCIAL_MEDIA'),
				() => roles.find((r) => r.systemKey === 'DESIGNER'),
				() => roles.find((r) => r.accessLevel === 'OPERATIONAL'),
			);
	}
}

export function structuredAccessBucketFromRole(role: AgencyRole | undefined): SimpleAccessLevel {
	if (!role) return 'operacional';
	if (role.systemKey === 'ADMIN' || role.accessLevel === 'ADMIN') return 'administrador';
	if (role.systemKey === 'MANAGER' || role.accessLevel === 'MANAGER') return 'gestor';
	if (role.systemKey === 'FINANCEIRO' || role.accessLevel === 'FINANCIAL') return 'financeiro';
	return 'operacional';
}

export function defaultStructuredRoleId(member: User, roles: AgencyRole[]): string {
	if (member.agencyRoleId && roles.some((r) => r.id === member.agencyRoleId)) {
		const b = structuredAccessBucketFromRole(roles.find((r) => r.id === member.agencyRoleId));
		const bucket =
			member.role === 'owner' ? b : b === 'administrador' ? 'gestor' : b;
		return agencyRoleIdForAccessBucket(bucket, roles) || member.agencyRoleId;
	}
	return agencyRoleIdForAccessBucket('operacional', roles) || roles[0]?.id || '';
}

export function buildTeamConfigDraftKey(
	mode: 'lean' | 'structured',
	members: User[],
	roles: AgencyRole[],
): string {
	return `${mode}|${members.map((m) => `${m.id}:${m.simpleAccessLevel ?? ''}:${m.agencyRoleId ?? ''}:${(m.functions ?? []).join(',')}`).join('|')}|${roles.map((r) => r.id).join(',')}`;
}

export function initialTeamConfigDrafts(
	mode: 'lean' | 'structured',
	members: User[],
	roles: AgencyRole[],
): Record<string, TeamConfigRowDraft> {
	const next: Record<string, TeamConfigRowDraft> = {};
	for (const m of members) {
		const rawFns = [...(m.functions ?? [])];
		const fnsNonOwner = rawFns.filter((k) => k !== 'adm');
		const fns = m.role === 'owner' ? withOwnerAdmFunctions(rawFns) : fnsNonOwner;

		const inferred = normalizeSimpleAccessLevelForUi(inferSimpleAccessFromMember(m, roles));
		const leanLevel =
			m.role === 'owner' ? inferred : sanitizeSimpleLevelForNonOwner(inferred);

		if (mode === 'lean') {
			next[m.id] = {
				functions:
					m.role === 'owner' ? fns : normalizeOperationalFunctionsToSingle(fnsNonOwner),
				simpleAccessLevel: leanLevel,
				agencyRoleId: m.agencyRoleId ?? null,
			};
		} else {
			next[m.id] = {
				functions: fns,
				simpleAccessLevel: leanLevel,
				agencyRoleId: defaultStructuredRoleId(m, roles) || null,
			};
		}
	}
	return next;
}

export type AgencyTeamConfigurationTableProps = {
	mode: 'lean' | 'structured';
	teamMembers: User[];
	agencyRoles: AgencyRole[];
	drafts: Record<string, TeamConfigRowDraft>;
	canEditRows: boolean;
	canManageRoleTemplates: boolean;
	onToggleFunction: (userId: string, fnKey: string, checked: boolean) => void;
	onChangeSimpleAccess: (userId: string, level: SimpleAccessLevel) => void;
	onChangeStructuredAccessBucket: (userId: string, bucket: SimpleAccessLevel) => void;
	onRequestEditTemplate: (templateRoleId: string) => void;
	/** Abre o drawer de ajuda sobre níveis de acesso (ícone ao lado de “Nível de acesso”). */
	onOpenAccessLevelsHelp?: () => void;
	/** “+ Nova função” no cabeçalho da coluna de função do colaborador. */
	onCreateAgencyRole?: () => void;
	showNewRoleInHeader?: boolean;
	/** Linha do usuário logado — exibe “Meu perfil” e ação de editar quando houver callback. */
	currentUserId?: string | null;
	/** Abre Minha Conta › Detalhes (só para a própria linha). */
	onEditOwnProfile?: () => void;
	t: (key: string) => string;
};

export const AgencyTeamConfigurationTable: React.FC<AgencyTeamConfigurationTableProps> = ({
	mode,
	teamMembers,
	agencyRoles,
	drafts,
	canEditRows,
	canManageRoleTemplates,
	onToggleFunction,
	onChangeSimpleAccess,
	onChangeStructuredAccessBucket,
	onRequestEditTemplate,
	onOpenAccessLevelsHelp,
	onCreateAgencyRole,
	showNewRoleInHeader = false,
	currentUserId = null,
	onEditOwnProfile,
	t,
}) => {
	const selectClass =
		'min-w-0 flex-1 max-w-[13rem] rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-indigo-400';

	const iconBtnClass =
		'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-gray-400 transition-colors hover:border-gray-200 hover:bg-gray-50 hover:text-indigo-600 dark:hover:border-gray-600 dark:hover:bg-gray-800 dark:hover:text-indigo-400';

	const headerIconBtnClass =
		'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/25 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/40';

	const headerInfoBtnClass =
		'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-indigo-600 transition-colors hover:border-indigo-200/80 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 dark:text-indigo-400 dark:hover:border-indigo-800/50 dark:hover:bg-indigo-950/40';

	const flowCellClass =
		'rounded-lg border border-indigo-100/60 bg-indigo-50/35 px-3 py-2.5 dark:border-indigo-900/40 dark:bg-indigo-950/25';

	const profileEditBtnClass =
		'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100';

	return (
		<div className="overflow-x-auto rounded-xl border border-gray-200/90 bg-white shadow-sm dark:border-gray-700/90 dark:bg-gray-800/40">
			<table className="w-full min-w-[1000px] table-fixed text-left text-sm">
				<colgroup>
					<col className="w-[24%]" />
					<col className="w-[28%]" />
					<col className="w-[48%]" />
				</colgroup>
				<thead className="border-b border-gray-100 bg-gray-50/80 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-400">
					<tr>
						<th className="px-5 py-3.5 align-middle sm:px-6">{t('team_table_col_member')}</th>
						<th className="min-w-0 px-5 py-3.5 align-middle sm:px-6">
							<div className="flex flex-wrap items-center gap-1.5">
								<span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									{t('settings_team_col_access')}
								</span>
								{onOpenAccessLevelsHelp ? (
									<TooltipHint label={t('settings_team_levels_help_link')}>
										<button
											type="button"
											onClick={onOpenAccessLevelsHelp}
											className={headerInfoBtnClass}
											aria-label={t('settings_team_levels_help_link')}
										>
											<InfoIcon className="h-4 w-4 opacity-90" />
										</button>
									</TooltipHint>
								) : null}
							</div>
						</th>
						<th className="min-w-0 px-5 py-3.5 align-middle sm:px-6">
							<div className="flex flex-wrap items-center gap-1.5">
								<span className="text-[11px] font-semibold uppercase tracking-wide">
									{t('settings_team_col_functions')}
								</span>
								{showNewRoleInHeader && onCreateAgencyRole ? (
									<TooltipHint label={t('settings_team_new_role_short')}>
										<button
											type="button"
											onClick={onCreateAgencyRole}
											className={headerIconBtnClass}
											aria-label={t('settings_team_new_role_short')}
										>
											<PlusIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
										</button>
									</TooltipHint>
								) : null}
							</div>
						</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-gray-100 dark:divide-gray-700/80">
					{teamMembers.map((member) => {
						const isOwnerRow = member.role === 'owner';
						const rowDisabled = !canEditRows || (member.inviteStatus ?? 'active') !== 'active';
						const draft = drafts[member.id];
						const fns = draft?.functions ?? [];

						const normLeanLevel = draft
							? isOwnerRow
								? normalizeSimpleAccessLevelForUi(draft.simpleAccessLevel)
								: sanitizeSimpleLevelForNonOwner(
										normalizeSimpleAccessLevelForUi(draft.simpleAccessLevel),
									)
							: 'operacional';
						const accessSummaryLean =
							draft && !isOwnerRow && mode === 'lean'
								? permissionsSummaryForSimpleAccessLevel(normLeanLevel, t)
								: null;

						const rolePick =
							draft && mode === 'structured' && draft.agencyRoleId
								? agencyRoles.find((r) => r.id === draft.agencyRoleId)
								: undefined;
						const structuredBucketRaw = structuredAccessBucketFromRole(rolePick);
						const structuredBucket =
							!isOwnerRow && structuredBucketRaw === 'administrador'
								? 'gestor'
								: structuredBucketRaw;
						const accessSummaryStructured =
							rolePick && mode === 'structured'
								? permissionsSummary(
										parseAgencyRolePermissions(rolePick.permissions) as Record<
											AgencyModuleKey,
											ModuleAccessLevel
										>,
										t,
									)
								: null;

						const templateRoleIdForEdit =
							mode === 'lean' && draft && !isOwnerRow
								? agencyRoleIdForAccessBucket(normLeanLevel, agencyRoles)
								: mode === 'structured' && draft?.agencyRoleId
									? draft.agencyRoleId
									: '';

						const flowLines = collectFlowLinesForFunctions(fns, t);
						const isMe = currentUserId != null && member.id === currentUserId;

						return (
							<tr key={member.id}>
								<td className="align-middle px-5 py-3.5 sm:px-6">
									<div className="flex min-w-0 items-center gap-3.5">
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
										<div className="min-w-0 flex-1">
											<div className="flex flex-wrap items-center gap-2">
												<span className="font-semibold text-gray-900 dark:text-white">{member.name}</span>
												{isOwnerRow && (
													<TooltipHint label={t('role_owner')}>
														<span className="text-amber-500" aria-hidden>
															★
														</span>
													</TooltipHint>
												)}
												{isMe && (
													<span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-200">
														{t('my_profile')}
													</span>
												)}
											</div>
											<p className="mt-2 truncate text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
											<div className="mt-1.5 flex flex-wrap items-center gap-1.5">
												{teamMemberStatusBadge(member, t)}
												{isMe && onEditOwnProfile ? (
													<TooltipHint label={t('team_edit_profile_tooltip')}>
														<button
															type="button"
															onClick={onEditOwnProfile}
															className={profileEditBtnClass}
															aria-label={t('team_edit_profile_tooltip')}
														>
															<EditIcon className="h-5 w-5" />
														</button>
													</TooltipHint>
												) : null}
											</div>
										</div>
									</div>
								</td>
								<td className="align-middle px-5 py-3.5 sm:px-6">
									{isOwnerRow ? (
										<div>
											<p className="text-xs font-medium text-gray-800 dark:text-gray-200">
												{t('settings_team_access_owner_label')}
											</p>
											<p className="mt-1 max-w-[17rem] text-xs leading-relaxed text-gray-500 dark:text-gray-400">
												{t('settings_team_access_owner_summary')}
											</p>
										</div>
									) : mode === 'lean' && draft ? (
										<div className="space-y-1">
											<div className="flex items-center gap-1">
												<select
													value={normLeanLevel}
													disabled={rowDisabled}
													onChange={(e) =>
														onChangeSimpleAccess(
															member.id,
															normalizeSimpleAccessLevelForUi(e.target.value as SimpleAccessLevel),
														)
													}
													className={selectClass}
												>
													{SETTINGS_MEMBER_ACCESS_LEVELS.map((lv) => (
														<option key={lv} value={lv}>
															{t(SIMPLE_LEVEL_LABEL_KEY[lv])}
														</option>
													))}
												</select>
												{canManageRoleTemplates && templateRoleIdForEdit && !rowDisabled && (
													<TooltipHint label={t('settings_team_edit_level_template')}>
														<button
															type="button"
															className={iconBtnClass}
															aria-label={t('settings_team_edit_level_template')}
															onClick={() => onRequestEditTemplate(templateRoleIdForEdit)}
														>
															<SettingsIcon className="h-4 w-4" />
														</button>
													</TooltipHint>
												)}
											</div>
											{accessSummaryLean ? (
												<div className="mt-1 max-w-[17rem] text-xs leading-relaxed text-gray-500 dark:text-gray-400">
													<span className="block">{t('settings_team_access_areas_prefix')}</span>
													<span className="block">{accessSummaryLean}</span>
												</div>
											) : null}
										</div>
									) : mode === 'structured' && draft ? (
										<div className="space-y-1">
											<div className="flex items-center gap-1">
												<select
													value={structuredBucket}
													disabled={rowDisabled || agencyRoles.length === 0}
													onChange={(e) =>
														onChangeStructuredAccessBucket(
															member.id,
															normalizeSimpleAccessLevelForUi(e.target.value as SimpleAccessLevel),
														)
													}
													className={selectClass}
												>
													{agencyRoles.length === 0 ? (
														<option value="">{t('settings_team_no_roles')}</option>
													) : (
														SETTINGS_MEMBER_ACCESS_LEVELS.map((lv) => (
															<option key={lv} value={lv}>
																{t(SIMPLE_LEVEL_LABEL_KEY[lv])}
															</option>
														))
													)}
												</select>
												{canManageRoleTemplates && templateRoleIdForEdit && !rowDisabled && (
													<TooltipHint label={t('settings_team_edit_level_template')}>
														<button
															type="button"
															className={iconBtnClass}
															aria-label={t('settings_team_edit_level_template')}
															onClick={() => onRequestEditTemplate(templateRoleIdForEdit)}
														>
															<SettingsIcon className="h-4 w-4" />
														</button>
													</TooltipHint>
												)}
											</div>
											{accessSummaryStructured ? (
												<div className="mt-1 max-w-[17rem] text-xs leading-relaxed text-gray-500 dark:text-gray-400">
													<span className="block">{t('settings_team_access_areas_prefix')}</span>
													<span className="block">{accessSummaryStructured}</span>
												</div>
											) : (
												<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">—</p>
											)}
										</div>
									) : (
										<span className="text-xs text-gray-400">—</span>
									)}
								</td>
								<td className="align-middle px-5 py-3.5 sm:px-6">
									<div className="flex flex-row flex-wrap items-center gap-x-4 gap-y-3 sm:flex-nowrap sm:gap-x-5">
										<div className="min-w-[10rem] shrink-0">
											<div className="flex flex-col gap-1.5">
												{TEAM_TABLE_FUNCTION_KEYS.map((key) => {
													const isAdm = key === 'adm';
													const checked = isAdm ? isOwnerRow : hasTeamFunction(fns, key);
													const disabled = rowDisabled || isAdm;
													return (
														<label
															key={key}
															className={`flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 ${
																disabled ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
															}`}
														>
															<input
																type="checkbox"
																checked={checked}
																disabled={disabled}
																onChange={(e) => onToggleFunction(member.id, key, e.target.checked)}
																className="h-3.5 w-3.5 shrink-0 rounded border-gray-300 text-indigo-600"
															/>
															<span>{t(FN_LABEL_KEY[key])}</span>
														</label>
													);
												})}
											</div>
										</div>
										<div
											className="mx-0.5 hidden w-px shrink-0 self-stretch bg-gradient-to-b from-indigo-200 via-indigo-300/90 to-indigo-100 dark:from-indigo-800 dark:via-indigo-700/90 dark:to-indigo-900 sm:block sm:min-h-[5rem]"
											aria-hidden
										/>
										<div className={`min-w-0 flex-1 ${flowCellClass}`}>
											<p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-800/85 dark:text-indigo-200/85">
												{t('settings_team_col_flow_effect')}
											</p>
											<CollaboratorFlowPreview
												lines={flowLines}
												emptyLabel={t('settings_team_flow_empty')}
											/>
										</div>
									</div>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
};
