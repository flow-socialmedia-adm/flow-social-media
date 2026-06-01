/**
 * Regras centrais de elegibilidade de responsáveis (agência).
 * Reutilizar em tarefas/posts/cliente nas fases seguintes.
 *
 * Ordem de fallback para resolver responsável (do mais específico ao mais genérico):
 *
 * Fallback order (global):
 * 1. Responsável da etapa (cliente: stageOwnerMap — ver client-owner.util)
 * 2. Responsável principal do cliente (defaultOwnerUserId)
 * 3. Agency default strategy
 * 4. Agency owner
 *
 * Resumo produto: Etapa → Cliente → Agência → Owner.
 * Neste módulo, `resolveAgencyDefaultOwner` cobre apenas o ramo agência quando
 * `defaultOwnerStrategy === AGENCY_OWNER` (equivale a 3 + 4); com `MANUAL`, o caller
 * deve escolher entre elegíveis sem forçar o owner (4 só se regra de produto exigir).
 */

export type AgencyModeValue = 'SOLO' | 'TEAM' | null | undefined;

export type DefaultOwnerStrategyValue = 'AGENCY_OWNER' | 'MANUAL';

export type EligibleOwnerSummary = {
	id: string;
	fullName: string;
	email: string;
	role: string;
	operationalRole: string;
};

export type AgencyOperationalSettings = {
	id: string;
	mode: AgencyModeValue;
	defaultOwnerStrategy: DefaultOwnerStrategyValue;
	allowStageOwners: boolean;
};

export type UserEligibilityRow = {
	id: string;
	fullName: string;
	email: string;
	role: string;
	deletedAt: Date | null;
	operationalRole: string;
	canBeTaskOwner: boolean;
	canBePostOwner: boolean;
};

export function isAgencyUserActive(u: Pick<UserEligibilityRow, 'deletedAt'>): boolean {
	return u.deletedAt == null;
}

export function isEligibleForTaskOwnership(u: UserEligibilityRow): boolean {
	return isAgencyUserActive(u) && u.canBeTaskOwner;
}

export function isEligibleForPostOwnership(u: UserEligibilityRow): boolean {
	return isAgencyUserActive(u) && u.canBePostOwner;
}

/** Elegíveis como responsáveis, conforme o contexto (tarefa vs post). */
export function getEligibleAgencyOwners(
	users: UserEligibilityRow[],
	context: 'task' | 'post',
): EligibleOwnerSummary[] {
	const filtered = context === 'task' ? users.filter(isEligibleForTaskOwnership) : users.filter(isEligibleForPostOwnership);
	return filtered.map(toSummary);
}

function toSummary(u: UserEligibilityRow): EligibleOwnerSummary {
	return {
		id: u.id,
		fullName: u.fullName,
		email: u.email,
		role: u.role,
		operationalRole: u.operationalRole,
	};
}

export function findActiveAgencyOwnerUserId(users: UserEligibilityRow[]): string | null {
	const owner = users.find((u) => u.role === 'owner' && isAgencyUserActive(u));
	return owner?.id ?? null;
}

/**
 * Id do utilizador padrão no nível agência quando defaultOwnerStrategy = AGENCY_OWNER
 * (owner ativo). Com MANUAL, retorna null — ver fallback global no cabeçalho do ficheiro.
 */
export function resolveAgencyDefaultOwner(
	users: UserEligibilityRow[],
	settings: Pick<AgencyOperationalSettings, 'defaultOwnerStrategy'>,
): string | null {
	if (settings.defaultOwnerStrategy !== 'AGENCY_OWNER') return null;
	return findActiveAgencyOwnerUserId(users);
}
