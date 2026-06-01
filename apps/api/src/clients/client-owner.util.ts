import {
	type AgencyOperationalSettings,
	type UserEligibilityRow,
	getEligibleAgencyOwners,
	resolveAgencyDefaultOwner,
	findActiveAgencyOwnerUserId,
} from '../agencies/agency-operational.util';
import {
	CLIENT_STAGE_KEYS,
	CLIENT_INITIAL_OWNER_STAGE_KEY,
	type ClientStageKey,
} from './client-owner.constants';

export { CLIENT_STAGE_KEYS, CLIENT_INITIAL_OWNER_STAGE_KEY, type ClientStageKey };

/**
 * Preferências de responsáveis persistidas em Client.clientOwnerPreferencesJson.
 * Cadeia completa de fallback: ver JSDoc de `resolveResponsibleUser`.
 */

export type ClientOwnerPreferencesStored = {
	defaultOwnerUserId: string | null;
	useDefaultOwnerForAllStages: boolean;
	stageOwnerMap: Record<string, string>;
};

export type AgencySliceForClientOwner = Pick<AgencyOperationalSettings, 'mode' | 'defaultOwnerStrategy' | 'allowStageOwners'>;

export function defaultClientOwnerPreferences(): ClientOwnerPreferencesStored {
	return {
		defaultOwnerUserId: null,
		useDefaultOwnerForAllStages: true,
		stageOwnerMap: {},
	};
}

/** Lê JSON bruto; null/inválido → defaults. */
export function getClientOwnerPreferences(raw: unknown): ClientOwnerPreferencesStored {
	if (raw === null || raw === undefined) return defaultClientOwnerPreferences();
	if (typeof raw !== 'object' || Array.isArray(raw)) return defaultClientOwnerPreferences();
	const o = raw as Record<string, unknown>;
	const def = typeof o.defaultOwnerUserId === 'string' ? o.defaultOwnerUserId : null;
	const all = o.useDefaultOwnerForAllStages !== false;
	const map: Record<string, string> = {};
	if (o.stageOwnerMap && typeof o.stageOwnerMap === 'object' && !Array.isArray(o.stageOwnerMap)) {
		const raw = o.stageOwnerMap as Record<string, unknown>;
		for (const k of CLIENT_STAGE_KEYS) {
			const v = raw[k];
			if (typeof v === 'string') map[k] = v;
		}
	}
	return {
		defaultOwnerUserId: def,
		useDefaultOwnerForAllStages: all,
		stageOwnerMap: map,
	};
}

const POST_CTX = 'post' as const;

/** userId elegível para contexto post (conteúdo). */
export function validateClientOwnerAgainstAgencyEligibility(
	userId: string | null | undefined,
	users: UserEligibilityRow[],
): boolean {
	if (!userId) return false;
	const eligible = new Set(getEligibleAgencyOwners(users, POST_CTX).map((u) => u.id));
	return eligible.has(userId);
}

/** Mantém só chaves canónicas e userIds elegíveis. */
export function sanitizeClientStageOwnerMap(
	map: Record<string, string>,
	users: UserEligibilityRow[],
): Record<string, string> {
	const out: Record<string, string> = {};
	const allowedKeys = new Set<string>(CLIENT_STAGE_KEYS);
	for (const k of Object.keys(map)) {
		if (!allowedKeys.has(k)) continue;
		const uid = map[k];
		if (typeof uid === 'string' && validateClientOwnerAgainstAgencyEligibility(uid, users)) {
			out[k] = uid;
		}
	}
	return out;
}

function resolveAgencyChainFallback(users: UserEligibilityRow[], agency: AgencySliceForClientOwner): string | null {
	const fromStrategy = resolveAgencyDefaultOwner(users, agency);
	if (fromStrategy) return fromStrategy;
	return findActiveAgencyOwnerUserId(users);
}

/** defaultOwnerUserId válido; senão cai na cadeia agência (3 → 4). */
export function resolveClientDefaultOwner(
	prefs: ClientOwnerPreferencesStored,
	users: UserEligibilityRow[],
	agency: AgencySliceForClientOwner,
): string | null {
	if (validateClientOwnerAgainstAgencyEligibility(prefs.defaultOwnerUserId, users)) {
		return prefs.defaultOwnerUserId;
	}
	return resolveAgencyChainFallback(users, agency);
}

export type ClientRowSliceForResponsibleUser = {
	clientOwnerPreferencesJson?: unknown | null;
};

/**
 * Fallback chain:
 * 1. Stage owner
 * 2. Client default owner
 * 3. Agency default strategy
 * 4. Agency owner
 *
 * Orquestração única da cadeia completa (delega em `resolveClientStageOwner` → `resolveClientDefaultOwner` → agência).
 */
export function resolveResponsibleUser(params: {
	stageKey: ClientStageKey;
	client: ClientRowSliceForResponsibleUser;
	agency: AgencySliceForClientOwner;
	users: UserEligibilityRow[];
}): string | null {
	const stageKey = (CLIENT_STAGE_KEYS as readonly string[]).includes(params.stageKey)
		? params.stageKey
		: CLIENT_INITIAL_OWNER_STAGE_KEY;
	const prefs = getClientOwnerPreferences(params.client.clientOwnerPreferencesJson);
	return resolveClientStageOwner(stageKey, prefs, params.users, params.agency);
}

/**
 * Responsável para uma etapa canónica: mapa (se permitido) → default cliente → agência.
 */
export function resolveClientStageOwner(
	stageKey: ClientStageKey,
	prefs: ClientOwnerPreferencesStored,
	users: UserEligibilityRow[],
	agency: AgencySliceForClientOwner,
): string | null {
	const canUsePerStage =
		agency.mode === 'TEAM' && agency.allowStageOwners === true && !prefs.useDefaultOwnerForAllStages;
	if (canUsePerStage) {
		const uid = prefs.stageOwnerMap[stageKey];
		if (validateClientOwnerAgainstAgencyEligibility(uid, users)) return uid;
	}
	return resolveClientDefaultOwner(prefs, users, agency);
}

export type ResolvedClientOwnerPreferences = {
	resolvedDefaultUserId: string | null;
	stageResolved: Record<ClientStageKey, string | null>;
};

export function buildResolvedClientOwnerPreferences(
	prefs: ClientOwnerPreferencesStored,
	users: UserEligibilityRow[],
	agency: AgencySliceForClientOwner,
): ResolvedClientOwnerPreferences {
	const stageResolved = {} as Record<ClientStageKey, string | null>;
	for (const k of CLIENT_STAGE_KEYS) {
		stageResolved[k] = resolveResponsibleUser({
			stageKey: k,
			client: { clientOwnerPreferencesJson: prefs },
			agency,
			users,
		});
	}
	return {
		resolvedDefaultUserId: resolveClientDefaultOwner(prefs, users, agency),
		stageResolved,
	};
}

/**
 * Normaliza input para persistência: remove inválidos, aplica regras SOLO / allowStageOwners.
 */
export function normalizeClientOwnerPreferences(
	raw: unknown,
	users: UserEligibilityRow[],
	agency: AgencySliceForClientOwner,
): ClientOwnerPreferencesStored {
	let p = getClientOwnerPreferences(raw);

	if (agency.mode === 'SOLO') {
		p = {
			...p,
			useDefaultOwnerForAllStages: true,
			stageOwnerMap: {},
		};
	}

	if (!agency.allowStageOwners) {
		p = { ...p, stageOwnerMap: {} };
	}

	if (p.useDefaultOwnerForAllStages) {
		p = { ...p, stageOwnerMap: {} };
	}

	if (!validateClientOwnerAgainstAgencyEligibility(p.defaultOwnerUserId, users)) {
		p = { ...p, defaultOwnerUserId: null };
	}

	p = {
		...p,
		stageOwnerMap: sanitizeClientStageOwnerMap(p.stageOwnerMap, users),
	};

	return p;
}
