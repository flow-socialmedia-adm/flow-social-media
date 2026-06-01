/** Fonte única de módulos — alinhada ao frontend (`lib/modulePermissions.ts`). */
export const AGENCY_MODULE_KEYS = [
	'clients',
	'planning',
	'posts',
	'tasks',
	'agenda',
	'financial',
	'contracts',
	'team',
	'settings',
] as const;

export type AgencyModuleKey = (typeof AGENCY_MODULE_KEYS)[number];
export type ModuleAccessLevel = 'none' | 'view' | 'edit';

export const DEFAULT_NONE_PERMISSIONS: Record<AgencyModuleKey, ModuleAccessLevel> = {
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

export function parseAgencyRolePermissions(raw: unknown): Record<AgencyModuleKey, ModuleAccessLevel> {
	const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
	const out = { ...DEFAULT_NONE_PERMISSIONS };
	for (const k of AGENCY_MODULE_KEYS) {
		const v = o[k];
		if (v === 'view' || v === 'edit' || v === 'none') out[k] = v;
	}
	return out;
}
