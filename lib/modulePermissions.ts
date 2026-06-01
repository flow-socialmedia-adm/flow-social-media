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

export function parseAgencyRoleFlags(raw: unknown): {
	canBeResponsiblePosts: boolean;
	canBeResponsibleTasks: boolean;
	canBeResponsibleClients: boolean;
	canBeResponsiblePlanning: boolean;
} {
	const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
	return {
		canBeResponsiblePosts: o.canBeResponsiblePosts !== false,
		canBeResponsibleTasks: o.canBeResponsibleTasks !== false,
		canBeResponsibleClients: o.canBeResponsibleClients !== false,
		canBeResponsiblePlanning: o.canBeResponsiblePlanning !== false,
	};
}

const PERMISSIONS_SUMMARY_SEP = ' · ';

/**
 * Lista módulos com acesso (view/edit) usando nomes completos (i18n `agency_module_*`).
 * Encurta de forma legível se passar de `maxLength` (prioriza módulos na ordem canônica).
 */
export function permissionsSummary(
	perms: Record<AgencyModuleKey, ModuleAccessLevel>,
	t: (k: string) => string,
	maxLength = 96,
): string {
	const parts: string[] = [];
	for (const k of AGENCY_MODULE_KEYS) {
		if (perms[k] !== 'none') parts.push(t(`agency_module_${k}`));
	}
	if (!parts.length) return '—';
	let out = '';
	for (const p of parts) {
		const next = out ? `${out}${PERMISSIONS_SUMMARY_SEP}${p}` : p;
		if (next.length > maxLength) {
			if (out) return `${out}…`;
			return p.length > maxLength ? `${p.slice(0, Math.max(1, maxLength - 1)).trim()}…` : p;
		}
		out = next;
	}
	return out;
}
