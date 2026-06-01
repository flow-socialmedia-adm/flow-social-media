import type { AgencyOperationMode, AgencyRole, Page, Permission, User } from '../types';
import {
	simpleAccessLevelToAgencyAccessLevelString,
	simpleAccessLevelToModuleMap,
} from './agencyUserAccess';
import {
	AGENCY_MODULE_KEYS,
	DEFAULT_NONE_PERMISSIONS,
	parseAgencyRolePermissions,
	type AgencyModuleKey,
	type ModuleAccessLevel,
} from './modulePermissions';

export type ResolveModulesOptions = { agencyOperationMode?: AgencyOperationMode | null };

/** Mapeamento página → módulo (null = não aplicar bloqueio por módulo aqui). */
export const PAGE_TO_MODULE: Record<Page, AgencyModuleKey | null> = {
	dashboard: null,
	clients: 'clients',
	planejamento: 'planning',
	producao: 'posts',
	tarefas: 'tasks',
	agenda: 'agenda',
	finance: 'financial',
	settings: 'settings',
	account: null,
};

const ALL_EDIT: Record<AgencyModuleKey, ModuleAccessLevel> = {
	clients: 'edit',
	planning: 'edit',
	posts: 'edit',
	tasks: 'edit',
	agenda: 'edit',
	financial: 'edit',
	contracts: 'edit',
	team: 'edit',
	settings: 'edit',
};

/** Fallback quando o usuário não tem `agencyRoleId`: deriva dos flags legados do JWT/API. */
function legacyPermissionsToModules(perms: Permission[], userRole: User['role']): Record<AgencyModuleKey, ModuleAccessLevel> {
	const out = { ...DEFAULT_NONE_PERMISSIONS };
	const p = new Set(perms);
	if (p.has('manage_clients')) out.clients = 'edit';
	else if (p.has('view_clients')) out.clients = 'view';

	if (p.has('manage_finance')) out.financial = 'edit';
	else if (p.has('view_finance')) out.financial = 'view';

	if (p.has('manage_team')) out.team = 'edit';
	else if (p.has('view_team')) out.team = 'view';

	if (p.has('manage_settings')) out.settings = 'edit';
	else if (p.has('view_settings')) out.settings = 'view';

	if (p.has('view_agenda')) {
		const contentLevel: ModuleAccessLevel = userRole === 'admin' ? 'edit' : 'view';
		out.planning = contentLevel;
		out.posts = contentLevel;
		out.tasks = contentLevel;
		out.agenda = contentLevel;
	}

	if (out.financial === 'edit') out.contracts = 'edit';
	else if (out.financial === 'view') out.contracts = 'view';

	return out;
}

/**
 * Mapa efetivo de módulo → nível para o usuário.
 * Prioridade: owner/admin (tudo edit) → lean + `simpleAccessLevel` → função (`agencyRole`) → legado `permissions[]`.
 */
export function resolveModulePermissions(
	user: User | null,
	agencyRoles: AgencyRole[] | undefined | null,
	options?: ResolveModulesOptions,
): Record<AgencyModuleKey, ModuleAccessLevel> {
	if (!user) return { ...DEFAULT_NONE_PERMISSIONS };
	if (user.role === 'owner' || user.role === 'admin') return { ...ALL_EDIT };

	const roles = agencyRoles ?? [];
	const legacy = legacyPermissionsToModules(user.permissions || [], user.role);
	const mode = options?.agencyOperationMode ?? 'solo';

	if (mode === 'lean' && user.simpleAccessLevel) {
		const fromSimple = simpleAccessLevelToModuleMap(user.simpleAccessLevel);
		return mergeModuleMaps(fromSimple, legacy);
	}

	if (user.agencyRoleId) {
		const role = roles.find((r) => r.id === user.agencyRoleId);
		if (role) {
			const fromRole = parseAgencyRolePermissions(role.permissions);
			return mergeModuleMaps(fromRole, legacy);
		}
	}

	return legacy;
}

const LEVEL_RANK: Record<ModuleAccessLevel, number> = { none: 0, view: 1, edit: 2 };

function mergeModuleMaps(
	a: Record<AgencyModuleKey, ModuleAccessLevel>,
	b: Record<AgencyModuleKey, ModuleAccessLevel>,
): Record<AgencyModuleKey, ModuleAccessLevel> {
	const out = { ...DEFAULT_NONE_PERMISSIONS };
	for (const k of AGENCY_MODULE_KEYS) {
		const la = LEVEL_RANK[a[k]];
		const lb = LEVEL_RANK[b[k]];
		out[k] = la >= lb ? a[k] : b[k];
	}
	return out;
}

export function getEffectiveAccessLevel(
	user: User | null,
	agencyRoles: AgencyRole[] | undefined | null,
	options?: ResolveModulesOptions,
): string {
	if (!user) return 'VIEWER';
	if (user.role === 'owner' || user.role === 'admin') return 'ADMIN';
	const mode = options?.agencyOperationMode ?? 'solo';
	if (mode === 'lean' && user.simpleAccessLevel) {
		return simpleAccessLevelToAgencyAccessLevelString(user.simpleAccessLevel);
	}
	const roles = agencyRoles ?? [];
	if (user.agencyRoleId) {
		const role = roles.find((r) => r.id === user.agencyRoleId);
		if (role?.accessLevel) return String(role.accessLevel);
	}
	return 'OPERATIONAL';
}

export function levelSatisfies(current: ModuleAccessLevel, required: 'view' | 'edit'): boolean {
	if (required === 'view') return current === 'view' || current === 'edit';
	return current === 'edit';
}

export function hasModulePermission(
	user: User | null,
	agencyRoles: AgencyRole[] | undefined | null,
	module: AgencyModuleKey,
	required: 'view' | 'edit',
	options?: ResolveModulesOptions,
): boolean {
	const map = resolveModulePermissions(user, agencyRoles, options);
	return levelSatisfies(map[module], required);
}

export function canViewModule(
	user: User | null,
	agencyRoles: AgencyRole[] | undefined | null,
	module: AgencyModuleKey,
	options?: ResolveModulesOptions,
): boolean {
	return hasModulePermission(user, agencyRoles, module, 'view', options);
}

export function canEditModule(
	user: User | null,
	agencyRoles: AgencyRole[] | undefined | null,
	module: AgencyModuleKey,
	options?: ResolveModulesOptions,
): boolean {
	return hasModulePermission(user, agencyRoles, module, 'edit', options);
}

export function getCurrentUserPermissions(
	user: User | null,
	agencyRoles: AgencyRole[] | undefined | null,
	options?: ResolveModulesOptions,
): Record<AgencyModuleKey, ModuleAccessLevel> {
	return resolveModulePermissions(user, agencyRoles, options);
}

export function getCurrentUserAccessLevel(
	user: User | null,
	agencyRoles: AgencyRole[] | undefined | null,
	options?: ResolveModulesOptions,
): string {
	return getEffectiveAccessLevel(user, agencyRoles, options);
}

/** Perfil de função da agência = OPERATIONAL (não owner/admin legado). Gestores/admin de função têm outros níveis. */
export function isOperationalAccessUser(
	user: User | null,
	agencyRoles: AgencyRole[] | undefined | null,
	options?: ResolveModulesOptions,
): boolean {
	if (!user) return false;
	if (user.role === 'owner' || user.role === 'admin') return false;
	return getEffectiveAccessLevel(user, agencyRoles, options) === 'OPERATIONAL';
}

export { AGENCY_MODULE_KEYS };
