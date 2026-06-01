/**
 * Leitura/normalização leve de clientOwnerPreferencesJson no frontend.
 * Regras fortes de validação ficam no backend (client-owner.util.ts).
 *
 * Cadeia de fallback (alinhada ao backend):
 * 1. Responsável da etapa (stageOwnerMap)
 * 2. Responsável principal do cliente (defaultOwnerUserId)
 * 3. Regra padrão da agência + 4. Owner da agência → resolveAgencyOwnerFallbackChain
 */

import type {
	ClientOwnerPreferences,
	ResolvedClientOwnerPreferences,
	User,
	DefaultOwnerStrategy,
} from '../types';
import type { ClientStageKey } from './client-stage-keys';
import { CLIENT_STAGE_KEYS } from './client-stage-keys';
import { getEligibleAgencyOwners, resolveAgencyOwnerFallbackChain } from './agencyOperational';

export type { ClientOwnerPreferences, ClientStageKey, ResolvedClientOwnerPreferences, ClientOwnerPreferencesDraft } from '../types';
export { CLIENT_STAGE_KEYS } from './client-stage-keys';

export function defaultClientOwnerPreferences(): ClientOwnerPreferences {
	return {
		defaultOwnerUserId: null,
		useDefaultOwnerForAllStages: true,
		stageOwnerMap: {},
	};
}

/** Interpreta valor vindo da API (objeto ou ausente). */
export function parseClientOwnerPreferencesFromApi(raw: unknown): ClientOwnerPreferences {
	if (raw === null || raw === undefined) return defaultClientOwnerPreferences();
	if (typeof raw !== 'object' || Array.isArray(raw)) return defaultClientOwnerPreferences();
	const o = raw as Record<string, unknown>;
	const def = typeof o.defaultOwnerUserId === 'string' ? o.defaultOwnerUserId : null;
	const all = o.useDefaultOwnerForAllStages !== false;
	const map: Partial<Record<ClientStageKey, string>> = {};
	if (o.stageOwnerMap && typeof o.stageOwnerMap === 'object' && !Array.isArray(o.stageOwnerMap)) {
		for (const k of CLIENT_STAGE_KEYS) {
			const v = (o.stageOwnerMap as Record<string, unknown>)[k];
			if (typeof v === 'string' && v) map[k] = v;
		}
	}
	return {
		defaultOwnerUserId: def,
		useDefaultOwnerForAllStages: all,
		stageOwnerMap: map,
	};
}

function eligiblePostIdSet(members: User[]): Set<string> {
	return new Set(getEligibleAgencyOwners(members, 'post').map((e) => e.id));
}

export function resolveClientDefaultOwnerUserId(
	prefs: ClientOwnerPreferences,
	members: User[],
	agencyDefaultStrategy: DefaultOwnerStrategy,
): string | null {
	const elig = eligiblePostIdSet(members);
	if (prefs.defaultOwnerUserId && elig.has(prefs.defaultOwnerUserId)) return prefs.defaultOwnerUserId;
	return resolveAgencyOwnerFallbackChain(members, agencyDefaultStrategy);
}

/** Leitura leve; ordem de fallback alinhada ao backend `resolveResponsibleUser`. */
export function resolveClientStageOwnerUserId(
	stageKey: ClientStageKey,
	prefs: ClientOwnerPreferences,
	members: User[],
	agencyMode: 'SOLO' | 'TEAM' | undefined,
	allowStageOwners: boolean,
	agencyDefaultStrategy: DefaultOwnerStrategy,
): string | null {
	const canMap =
		agencyMode === 'TEAM' && allowStageOwners === true && !prefs.useDefaultOwnerForAllStages;
	if (canMap) {
		const uid = prefs.stageOwnerMap[stageKey];
		const elig = eligiblePostIdSet(members);
		if (uid && elig.has(uid)) return uid;
	}
	return resolveClientDefaultOwnerUserId(prefs, members, agencyDefaultStrategy);
}

export function buildResolvedClientOwnerPreferences(
	prefs: ClientOwnerPreferences,
	members: User[],
	agencyMode: 'SOLO' | 'TEAM' | undefined,
	allowStageOwners: boolean,
	agencyDefaultStrategy: DefaultOwnerStrategy,
): ResolvedClientOwnerPreferences {
	const stageResolved = {} as Record<ClientStageKey, string | null>;
	for (const k of CLIENT_STAGE_KEYS) {
		stageResolved[k] = resolveClientStageOwnerUserId(
			k,
			prefs,
			members,
			agencyMode,
			allowStageOwners,
			agencyDefaultStrategy,
		);
	}
	return {
		resolvedDefaultUserId: resolveClientDefaultOwnerUserId(prefs, members, agencyDefaultStrategy),
		stageResolved,
	};
}
