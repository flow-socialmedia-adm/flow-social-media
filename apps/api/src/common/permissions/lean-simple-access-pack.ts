import { Role, SimpleAccessLevel } from '@prisma/client';
import {
	AGENCY_MODULE_KEYS,
	DEFAULT_NONE_PERMISSIONS,
	type AgencyModuleKey,
	type ModuleAccessLevel,
} from './agency-module-keys';

function P(p: Partial<Record<AgencyModuleKey, ModuleAccessLevel>>): Record<AgencyModuleKey, ModuleAccessLevel> {
	const out = { ...DEFAULT_NONE_PERMISSIONS };
	for (const k of AGENCY_MODULE_KEYS) {
		if (p[k] !== undefined) out[k] = p[k]!;
	}
	return out;
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

const ALL_FLAGS_TRUE = {
	canBeResponsiblePosts: true,
	canBeResponsibleTasks: true,
	canBeResponsibleClients: true,
	canBeResponsiblePlanning: true,
} as const;

const FLAGS_SOCIAL = {
	canBeResponsiblePosts: true,
	canBeResponsibleTasks: true,
	canBeResponsibleClients: false,
	canBeResponsiblePlanning: false,
} as const;

const FLAGS_DESIGNER = FLAGS_SOCIAL;

const FLAGS_FINANCEIRO = {
	canBeResponsiblePosts: false,
	canBeResponsibleTasks: false,
	canBeResponsibleClients: false,
	canBeResponsiblePlanning: false,
} as const;

type ResponsibilityFlags = {
	canBeResponsiblePosts: boolean;
	canBeResponsibleTasks: boolean;
	canBeResponsibleClients: boolean;
	canBeResponsiblePlanning: boolean;
};

type PackSource = {
	accessLevelStr: 'ADMIN' | 'MANAGER' | 'OPERATIONAL' | 'FINANCIAL';
	modules: Record<AgencyModuleKey, ModuleAccessLevel>;
	flags: ResponsibilityFlags;
};

const ALL_LEGACY = [
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
] as const;

/** Espelha `lib/agencyRoleApply.ts` → `modulesToLegacyPermissions`. */
export function modulesToLegacyPermissions(
	accessLevel: string,
	perms: Record<AgencyModuleKey, ModuleAccessLevel>,
): string[] {
	if (accessLevel === 'ADMIN') {
		return [...ALL_LEGACY];
	}
	const set = new Set<string>();
	set.add('view_dashboard');
	const contentKeys: AgencyModuleKey[] = ['planning', 'posts', 'tasks', 'agenda'];
	if (contentKeys.some((k) => perms[k] !== 'none')) {
		set.add('view_agenda');
	}
	if (perms.clients === 'edit') set.add('manage_clients');
	if (perms.clients === 'view') set.add('view_clients');
	if (perms.financial === 'edit') set.add('manage_finance');
	if (perms.financial === 'view') set.add('view_finance');
	if (perms.team === 'edit') set.add('manage_team');
	if (perms.team === 'view') set.add('view_team');
	if (perms.settings === 'edit') set.add('manage_settings');
	if (perms.settings === 'view') set.add('view_settings');
	return [...set];
}

function packSource(level: SimpleAccessLevel): PackSource {
	switch (level) {
		case 'acesso_total':
		case 'administrador':
			return { accessLevelStr: 'ADMIN', modules: ALL_EDIT, flags: ALL_FLAGS_TRUE };
		case 'gerenciar':
		case 'gestor':
			return { accessLevelStr: 'MANAGER', modules: MANAGER_PERMS, flags: ALL_FLAGS_TRUE };
		case 'colaboracao':
			return { accessLevelStr: 'OPERATIONAL', modules: SOCIAL_MEDIA_PERMS, flags: FLAGS_SOCIAL };
		case 'operacional':
			return { accessLevelStr: 'OPERATIONAL', modules: DESIGNER_PERMS, flags: FLAGS_DESIGNER };
		case 'financeiro':
			return { accessLevelStr: 'FINANCIAL', modules: FINANCEIRO_PERMS, flags: FLAGS_FINANCEIRO };
		default:
			return { accessLevelStr: 'OPERATIONAL', modules: SOCIAL_MEDIA_PERMS, flags: FLAGS_SOCIAL };
	}
}

export function simpleAccessLevelToModuleMap(level: SimpleAccessLevel): Record<AgencyModuleKey, ModuleAccessLevel> {
	return { ...packSource(level).modules };
}

/** Nível de função da agência (ADMIN / MANAGER / …) para UI / JWT legado. */
export function simpleAccessLevelToAgencyAccessLevelString(level: SimpleAccessLevel): string {
	return packSource(level).accessLevelStr;
}

export function leanUserPrismaPack(level: SimpleAccessLevel): {
	simpleAccessLevel: SimpleAccessLevel;
	permissions: string[];
	role: Role;
	agencyRoleId: null;
	canBeTaskOwner: boolean;
	canBePostOwner: boolean;
	canBeClientOwner: boolean;
	canBePlanningOwner: boolean;
} {
	const src = packSource(level);
	const perms = modulesToLegacyPermissions(src.accessLevelStr, src.modules);
	const role: Role = src.accessLevelStr === 'ADMIN' || src.accessLevelStr === 'MANAGER' ? 'admin' : 'editor';
	return {
		simpleAccessLevel: level,
		permissions: perms,
		role,
		agencyRoleId: null,
		canBeTaskOwner: src.flags.canBeResponsibleTasks,
		canBePostOwner: src.flags.canBeResponsiblePosts,
		canBeClientOwner: src.flags.canBeResponsibleClients,
		canBePlanningOwner: src.flags.canBeResponsiblePlanning,
	};
}
