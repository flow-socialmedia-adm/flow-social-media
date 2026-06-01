import type { AgencyRole, Permission, UserRole } from '../types';
import { parseAgencyRoleFlags, parseAgencyRolePermissions, type AgencyModuleKey } from './modulePermissions';

const ALL_LEGACY: Permission[] = [
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

/** Converte módulos + nível em permissões legadas do JWT / front (exceto owner). */
export function modulesToLegacyPermissions(accessLevel: string, perms: Record<AgencyModuleKey, 'none' | 'view' | 'edit'>): Permission[] {
	if (accessLevel === 'ADMIN') {
		return [...ALL_LEGACY];
	}
	const set = new Set<Permission>();
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

export function userRoleFromAccessLevel(accessLevel: string): UserRole {
	if (accessLevel === 'ADMIN' || accessLevel === 'MANAGER') return 'admin';
	return 'editor';
}

export function applyAgencyRoleTemplate(role: AgencyRole): {
	role: UserRole;
	permissions: Permission[];
	canBePostOwner: boolean;
	canBeTaskOwner: boolean;
	canBeClientOwner: boolean;
	canBePlanningOwner: boolean;
	agencyRoleId: string;
} {
	const perms = parseAgencyRolePermissions(role.permissions);
	const flags = parseAgencyRoleFlags(role.flags);
	return {
		role: userRoleFromAccessLevel(role.accessLevel),
		permissions: modulesToLegacyPermissions(role.accessLevel, perms),
		canBePostOwner: flags.canBeResponsiblePosts,
		canBeTaskOwner: flags.canBeResponsibleTasks,
		canBeClientOwner: flags.canBeResponsibleClients,
		canBePlanningOwner: flags.canBeResponsiblePlanning,
		agencyRoleId: role.id,
	};
}

export function accessLevelLabelKey(level: string): string {
	switch (level) {
		case 'ADMIN':
			return 'agency_access_level_admin';
		case 'MANAGER':
			return 'agency_access_level_manager';
		case 'OPERATIONAL':
			return 'agency_access_level_operational';
		case 'FINANCIAL':
			return 'agency_access_level_financial';
		case 'VIEWER':
			return 'agency_access_level_viewer';
		default:
			return 'agency_access_level_operational';
	}
}
