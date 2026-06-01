import { BadRequestException } from '@nestjs/common';
import { SYSTEM_ROLE_KEYS } from './agency-role-defaults';

export const MODULE_KEYS = [
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

export type ModuleKey = (typeof MODULE_KEYS)[number];
export type ModulePerm = 'none' | 'view' | 'edit';

const LEVELS = new Set<ModulePerm>(['none', 'view', 'edit']);

export function normalizePermissions(raw: Record<string, unknown>): Record<ModuleKey, ModulePerm> {
	const out = {} as Record<ModuleKey, ModulePerm>;
	for (const key of MODULE_KEYS) {
		const v = raw[key];
		const s = typeof v === 'string' ? v : 'none';
		if (!LEVELS.has(s as ModulePerm)) {
			throw new BadRequestException(`Permissão inválida no módulo: ${key}`);
		}
		out[key] = s as ModulePerm;
	}
	return out;
}

export function normalizeFlags(raw: Record<string, unknown>) {
	return {
		canBeResponsiblePosts: raw.canBeResponsiblePosts !== false,
		canBeResponsibleTasks: raw.canBeResponsibleTasks !== false,
		canBeResponsibleClients: raw.canBeResponsibleClients !== false,
		canBeResponsiblePlanning: raw.canBeResponsiblePlanning !== false,
	};
}

/** Função Administrador de sistema: sempre tudo em edição + todos os flags. */
export function mergePermissionsFromExisting(
	existing: Record<string, unknown> | null | undefined,
	patch?: Record<string, unknown>,
): Record<ModuleKey, ModulePerm> {
	const base: Record<string, string> = {};
	for (const k of MODULE_KEYS) {
		base[k] = typeof existing?.[k] === 'string' ? (existing[k] as string) : 'none';
	}
	if (patch) {
		for (const k of MODULE_KEYS) {
			if (patch[k] !== undefined) base[k] = String(patch[k]);
		}
	}
	return normalizePermissions(base);
}

export function enforceAdminSystemRole(
	permissions: Record<ModuleKey, ModulePerm>,
	flags: ReturnType<typeof normalizeFlags>,
	systemKey: string | null,
) {
	if (systemKey !== SYSTEM_ROLE_KEYS.ADMIN) return { permissions, flags };
	const allEdit = {} as Record<ModuleKey, ModulePerm>;
	for (const k of MODULE_KEYS) allEdit[k] = 'edit';
	return {
		permissions: allEdit,
		flags: {
			canBeResponsiblePosts: true,
			canBeResponsibleTasks: true,
			canBeResponsibleClients: true,
			canBeResponsiblePlanning: true,
		},
	};
}
