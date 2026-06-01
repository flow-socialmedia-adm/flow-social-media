import type { AgencyProfile, AgencyRole, Permission, SimpleAccessLevel, User } from '../types';
import { modulesToLegacyPermissions } from './agencyRoleApply';
import {
	parseAgencyRolePermissions,
	permissionsSummary,
	type AgencyModuleKey,
	type ModuleAccessLevel,
} from './modulePermissions';

function P(p: Partial<Record<AgencyModuleKey, ModuleAccessLevel>>): Record<AgencyModuleKey, ModuleAccessLevel> {
	const base: Record<AgencyModuleKey, ModuleAccessLevel> = {
		clients: 'none',
		planning: 'none',
		posts: 'none',
		tasks: 'none',
		agenda: 'none',
		financial: 'none',
		contracts: 'none',
		team: 'none',
		settings: 'none',
	};
	return { ...base, ...p };
}

const ALL_EDIT = P({
	clients: 'edit',
	planning: 'edit',
	posts: 'edit',
	tasks: 'edit',
	agenda: 'edit',
	financial: 'edit',
	contracts: 'edit',
	team: 'edit',
	settings: 'edit',
});

const MANAGER_PERMS = P({
	clients: 'edit',
	planning: 'edit',
	posts: 'edit',
	tasks: 'edit',
	agenda: 'edit',
	financial: 'view',
	contracts: 'view',
	team: 'view',
	settings: 'none',
});

const SOCIAL_MEDIA_PERMS = P({
	clients: 'view',
	planning: 'edit',
	posts: 'edit',
	tasks: 'edit',
	agenda: 'edit',
	financial: 'none',
	contracts: 'none',
	team: 'none',
	settings: 'none',
});

const DESIGNER_PERMS = P({
	clients: 'view',
	planning: 'view',
	posts: 'edit',
	tasks: 'edit',
	agenda: 'view',
	financial: 'none',
	contracts: 'none',
	team: 'none',
	settings: 'none',
});

const FINANCEIRO_PERMS = P({
	clients: 'view',
	planning: 'none',
	posts: 'none',
	tasks: 'none',
	agenda: 'none',
	financial: 'edit',
	contracts: 'edit',
	team: 'none',
	settings: 'none',
});

function packSource(level: SimpleAccessLevel): {
	accessLevelStr: 'ADMIN' | 'MANAGER' | 'OPERATIONAL' | 'FINANCIAL';
	modules: Record<AgencyModuleKey, ModuleAccessLevel>;
} {
	switch (level) {
		case 'acesso_total':
		case 'administrador':
			return { accessLevelStr: 'ADMIN', modules: ALL_EDIT };
		case 'gerenciar':
		case 'gestor':
			return { accessLevelStr: 'MANAGER', modules: MANAGER_PERMS };
		case 'colaboracao':
			return { accessLevelStr: 'OPERATIONAL', modules: SOCIAL_MEDIA_PERMS };
		case 'operacional':
			return { accessLevelStr: 'OPERATIONAL', modules: DESIGNER_PERMS };
		case 'financeiro':
			return { accessLevelStr: 'FINANCIAL', modules: FINANCEIRO_PERMS };
		default:
			return { accessLevelStr: 'OPERATIONAL', modules: SOCIAL_MEDIA_PERMS };
	}
}

export function simpleAccessLevelToModuleMap(
	level: SimpleAccessLevel,
): Record<AgencyModuleKey, ModuleAccessLevel> {
	return { ...packSource(level).modules };
}

export function simpleAccessLevelToAgencyAccessLevelString(level: SimpleAccessLevel): string {
	return packSource(level).accessLevelStr;
}

/** Níveis exibidos na Configuração da equipe (lean e structured): 4 opções canônicas. */
export const SETTINGS_TEAM_ACCESS_LEVELS: SimpleAccessLevel[] = [
	'administrador',
	'gestor',
	'operacional',
	'financeiro',
];

/** Níveis disponíveis no select para membros que não são o dono (sem Administrador). */
export const SETTINGS_MEMBER_ACCESS_LEVELS: SimpleAccessLevel[] = ['gestor', 'operacional', 'financeiro'];

/** Normaliza valores legados do banco para um dos 4 níveis da UI. */
export function normalizeSimpleAccessLevelForUi(
	level: SimpleAccessLevel | null | undefined,
): SimpleAccessLevel {
	switch (level) {
		case 'administrador':
		case 'acesso_total':
			return 'administrador';
		case 'gestor':
		case 'gerenciar':
			return 'gestor';
		case 'financeiro':
			return 'financeiro';
		case 'colaboracao':
		case 'operacional':
		default:
			return 'operacional';
	}
}

/**
 * Nível efetivo para membros não owner: nunca administrador/acesso_total (evita promoção via UI).
 * Valores legados “altos” caem em Gestor.
 */
export function sanitizeSimpleLevelForNonOwner(level: SimpleAccessLevel): SimpleAccessLevel {
	if (level === 'financeiro') return 'financeiro';
	if (level === 'gestor' || level === 'gerenciar') return 'gestor';
	if (level === 'administrador' || level === 'acesso_total') return 'gestor';
	return 'operacional';
}

export function permissionsSummaryForSimpleAccessLevel(
	level: SimpleAccessLevel,
	t: (key: string) => string,
): string {
	return permissionsSummary(simpleAccessLevelToModuleMap(level), t);
}

/** Valor do `<select>` (3 opções) → enum persistido no modo lean. */
export function leanTierUiToSimpleAccessLevel(tier: 'admin' | 'manage' | 'collab'): SimpleAccessLevel {
	if (tier === 'admin') return 'acesso_total';
	if (tier === 'manage') return 'gerenciar';
	return 'colaboracao';
}

/** Enum persistido → valor do `<select>` (operacional/financeiro aparecem como "collab" sem alterar layout). */
export function leanAccessSelectValueFromSimple(level: SimpleAccessLevel | null | undefined): 'admin' | 'manage' | 'collab' {
	if (level === 'acesso_total' || level === 'administrador') return 'admin';
	if (level === 'gerenciar' || level === 'gestor') return 'manage';
	return 'collab';
}

/** Fallback: coluna vazia + `AgencyRole` de sistema (dados legados em modo lean). */
export function inferSimpleAccessFromMember(member: User, roles: AgencyRole[]): SimpleAccessLevel {
	if (member.simpleAccessLevel) return member.simpleAccessLevel;
	const r = roles.find((x) => x.id === member.agencyRoleId);
	const sk = r?.systemKey;
	if (sk === 'ADMIN') return 'acesso_total';
	if (sk === 'MANAGER') return 'gerenciar';
	return 'colaboracao';
}

export type AgencyUserAccessShape = {
	accessLevel: string;
	permissions: Permission[];
	isAdmin: boolean;
};

/**
 * Visão unificada de acesso (lean: `simpleAccessLevel`; structured: `AgencyRole`; fallback legado).
 */
export function getUserAccess(
	user: User,
	agency: Pick<AgencyProfile, 'operationMode' | 'agencyRoles'>,
): AgencyUserAccessShape {
	const mode = agency.operationMode ?? 'solo';

	if (user.role === 'owner') {
		const perms = modulesToLegacyPermissions('ADMIN', ALL_EDIT);
		return { accessLevel: 'ADMIN', permissions: perms as Permission[], isAdmin: true };
	}

	if (user.role === 'admin') {
		return {
			accessLevel: 'ADMIN',
			permissions: (user.permissions ?? []) as Permission[],
			isAdmin: true,
		};
	}

	if (mode === 'lean' && user.simpleAccessLevel) {
		const al = simpleAccessLevelToAgencyAccessLevelString(user.simpleAccessLevel);
		const modules = simpleAccessLevelToModuleMap(user.simpleAccessLevel);
		const perms = modulesToLegacyPermissions(al, modules);
		return { accessLevel: al, permissions: perms as Permission[], isAdmin: false };
	}

	const roles = agency.agencyRoles ?? [];
	const r = user.agencyRoleId ? roles.find((x) => x.id === user.agencyRoleId) : undefined;
	if (r) {
		const parsed = parseAgencyRolePermissions(r.permissions);
		const perms = modulesToLegacyPermissions(r.accessLevel, parsed);
		return {
			accessLevel: String(r.accessLevel),
			permissions: perms as Permission[],
			isAdmin: false,
		};
	}

	return {
		accessLevel: 'OPERATIONAL',
		permissions: (user.permissions ?? []) as Permission[],
		isAdmin: false,
	};
}
