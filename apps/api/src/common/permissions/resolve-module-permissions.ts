import { AgencyOperationMode, Role, SimpleAccessLevel } from '@prisma/client';
import {
	AGENCY_MODULE_KEYS,
	DEFAULT_NONE_PERMISSIONS,
	parseAgencyRolePermissions,
	type AgencyModuleKey,
	type ModuleAccessLevel,
} from './agency-module-keys';
import { simpleAccessLevelToModuleMap } from './lean-simple-access-pack';

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

function asLegacyPermissionSet(raw: unknown): Set<string> {
	if (!Array.isArray(raw)) return new Set();
	return new Set(raw.map((x) => String(x)));
}

/** Mesma regra que `lib/resolveUserModuleAccess.ts` → `legacyPermissionsToModules` (userRole editor). */
function legacyPermissionsToModules(perms: unknown, userRole: Role): Record<AgencyModuleKey, ModuleAccessLevel> {
	const out = { ...DEFAULT_NONE_PERMISSIONS };
	const p = asLegacyPermissionSet(perms);
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

export type UserRowForPermissions = {
	role: Role;
	permissions: unknown;
	agencyRoleId: string | null;
	agencyRole?: { permissions: unknown } | null;
	simpleAccessLevel?: SimpleAccessLevel | null;
	agencyOperationMode?: AgencyOperationMode | null;
};

/**
 * Prioridade: owner/admin (tudo edit) → modo lean + `simpleAccessLevel` → função (`AgencyRole`) → legado `permissions[]`.
 */
export function resolveModulePermissions(user: UserRowForPermissions | null): Record<AgencyModuleKey, ModuleAccessLevel> {
	if (!user) return { ...DEFAULT_NONE_PERMISSIONS };
	if (user.role === 'owner' || user.role === 'admin') return { ...ALL_EDIT };

	const legacy = legacyPermissionsToModules(user.permissions, user.role);

	if (user.agencyOperationMode === 'lean' && user.simpleAccessLevel) {
		const fromSimple = simpleAccessLevelToModuleMap(user.simpleAccessLevel);
		return mergeModuleMaps(fromSimple, legacy);
	}

	if (user.agencyRoleId && user.agencyRole) {
		const fromRole = parseAgencyRolePermissions(user.agencyRole.permissions);
		return mergeModuleMaps(fromRole, legacy);
	}

	return legacy;
}

export function levelSatisfies(current: ModuleAccessLevel, required: 'view' | 'edit'): boolean {
	if (required === 'view') return current === 'view' || current === 'edit';
	return current === 'edit';
}
