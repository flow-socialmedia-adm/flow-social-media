/**
 * Helpers de elegibilidade (espelho leve do backend `agency-operational.util.ts`).
 *
 * Ordem de fallback para responsável (do mais específico ao mais genérico):
 *
 * Fallback order:
 * 1. Etapa (cliente: stageOwnerMap — client-owner-preferences)
 * 2. Cliente (defaultOwnerUserId)
 * 3. Agency default strategy
 * 4. Agency owner
 *
 * Resumo: Etapa → Cliente → Agência → Owner.
 */

import type { User, OperationalRole, DefaultOwnerStrategy } from '../types';

export const OPERATIONAL_ROLES_LIST: OperationalRole[] = [
	'SOCIAL_MEDIA',
	'DESIGNER',
	'VIDEO_EDITOR',
	'ATENDIMENTO',
	'GESTOR',
	'APROVACAO',
	'OUTRO',
];

export type { DefaultOwnerStrategy, OperationalRole };

export type EligibleOwnerSummary = {
	id: string;
	name: string;
	email: string;
	role: string;
	operationalRole: OperationalRole;
};

export function isEligibleForTaskOwnership(u: User): boolean {
	return u.canBeTaskOwner !== false;
}

export function isEligibleForPostOwnership(u: User): boolean {
	return u.canBePostOwner !== false;
}

export function getEligibleAgencyOwners(members: User[], context: 'task' | 'post'): EligibleOwnerSummary[] {
	const filtered = context === 'task' ? members.filter(isEligibleForTaskOwnership) : members.filter(isEligibleForPostOwnership);
	return filtered.map(toSummary);
}

/** Membros ativos (convite/conta) e elegíveis como responsável de post — lista para selects no cliente. */
export function getActivePostEligibleOwners(members: User[]): EligibleOwnerSummary[] {
	return getEligibleAgencyOwners(members, 'post').filter((e) => {
		const u = members.find((m) => m.id === e.id);
		return u != null && (u.inviteStatus ?? 'active') === 'active';
	});
}

function toSummary(u: User): EligibleOwnerSummary {
	return {
		id: u.id,
		name: u.name,
		email: u.email,
		role: u.role,
		operationalRole: u.operationalRole ?? 'OUTRO',
	};
}

/** Ramo agência (3+4) quando strategy === AGENCY_OWNER; ver fallback no cabeçalho. */
export function resolveAgencyDefaultOwner(members: User[], strategy: DefaultOwnerStrategy): string | null {
	if (strategy !== 'AGENCY_OWNER') return null;
	const o = members.find((m) => m.role === 'owner');
	return o?.id ?? null;
}

/** Passo 3 → 4 da cadeia agência: estratégia AGENCY_OWNER, senão owner ativo. */
export function resolveAgencyOwnerFallbackChain(members: User[], strategy: DefaultOwnerStrategy): string | null {
	const fromStrategy = resolveAgencyDefaultOwner(members, strategy);
	if (fromStrategy) return fromStrategy;
	const o = members.find((m) => m.role === 'owner');
	return o?.id ?? null;
}
