/**
 * Atribuição determinística de "Em execução por" (executionOwnerUserId) por substatus.
 * Alinhado às funções operacionais da equipe (`userFunctions` / keys do frontend).
 */

import {
	getClientOwnerPreferences,
	resolveClientDefaultOwner,
	type AgencySliceForClientOwner,
} from '../clients/client-owner.util';
import type { UserEligibilityRow } from '../agencies/agency-operational.util';

/** Chaves canônicas de função (mesmo vocabulário do checkbox "Funções do colaborador" no app). */
export type TeamFunctionKey =
	| 'social_media'
	| 'designer'
	| 'videomaker'
	| 'gestor'
	| 'estrategia'
	| 'atendimento'
	| 'trafego'
	| 'financeiro'
	| 'adm';

export type ExecutionAgencyMember = {
	id: string;
	fullName: string;
	userFunctions: string[];
	operationalRole?: string;
	/** Role da conta (owner/admin/editor) — usado em fallback de aprovação. */
	role?: string;
};

/** Mapeia sub-etapa (currentActionId) → função esperada. Fácil de expandir. */
const ACTION_TO_FUNCTION: Record<string, TeamFunctionKey> = {
	criando_pauta: 'social_media',
	criando_legenda: 'social_media',
	criando_arte: 'designer',
	editando_video: 'videomaker',
	enviado_aprovacao: 'gestor',
	aguardando_devolutiva: 'gestor',
	em_alteracao: 'social_media',
	agendando: 'social_media',
	agendado_final: 'social_media',
	publicado_final: 'social_media',
	planejando: 'estrategia',
	executando: 'social_media',
	revisando: 'gestor',
};

/**
 * Retorna a função operacional esperada para a sub-etapa atual.
 * `statusId` usado quando `currentActionId` é null (ex.: macro "aprovado").
 */
export function mapSubstatusToFunction(
	currentActionId: string | null | undefined,
	statusId: string | null | undefined,
): TeamFunctionKey | null {
	if (currentActionId && ACTION_TO_FUNCTION[currentActionId]) {
		return ACTION_TO_FUNCTION[currentActionId];
	}
	// Macro de aprovação sem sub-etapa (legado ou transição): mesma função que enviado_aprovacao / revisando.
	if (!currentActionId && (statusId === 'aprovado' || statusId === 'aguardando_aprovacao')) {
		return 'gestor';
	}
	// Tarefas gerais só-macro (sem currentActionId): equivalente ao antigo planejando / executando / concluído.
	if (!currentActionId && (statusId === 'a_fazer' || statusId === 'todo')) {
		return 'estrategia';
	}
	if (!currentActionId && (statusId === 'em_andamento' || statusId === 'in_progress')) {
		return 'social_media';
	}
	if (!currentActionId && (statusId === 'concluido' || statusId === 'done')) {
		return 'gestor';
	}
	return null;
}

function normalizeUserFunctions(raw: unknown): string[] {
	if (Array.isArray(raw)) {
		return raw.filter((x): x is string => typeof x === 'string' && x.length > 0);
	}
	if (typeof raw === 'string' && raw.trim()) {
		try {
			const p = JSON.parse(raw) as unknown;
			if (Array.isArray(p)) return normalizeUserFunctions(p);
		} catch {
			/* ignore */
		}
	}
	return [];
}

const OP_ROLE_TO_KEYS: Record<string, TeamFunctionKey[]> = {
	SOCIAL_MEDIA: ['social_media'],
	DESIGNER: ['designer'],
	VIDEO_EDITOR: ['videomaker'],
	GESTOR: ['gestor'],
	ATENDIMENTO: ['atendimento'],
	APROVACAO: ['gestor'],
	OUTRO: [],
};

/** Indica se o membro declara a função (checkboxes ou fallback por operationalRole). */
export function memberHasTeamFunction(m: ExecutionAgencyMember, fn: TeamFunctionKey): boolean {
	const fns = m.userFunctions;
	if (fn === 'videomaker') {
		if (fns.includes('videomaker') || fns.includes('video')) return true;
	} else if (fns.includes(fn)) {
		return true;
	}
	const or = m.operationalRole;
	if (or && OP_ROLE_TO_KEYS[or]?.includes(fn)) return true;
	return false;
}

export type ResolveExecutionOwnerParams = {
	currentActionId: string | null | undefined;
	statusId: string | null | undefined;
	clientId: string | null | undefined;
	createdByUserId: string | null | undefined;
	agencyMembers: ExecutionAgencyMember[];
	/** Responsável padrão do cliente (planejamento), já resolvido na cadeia de fallback. */
	clientOwnerUserId: string | null | undefined;
};

/**
 * Prioridade: (A) dono do cliente com a função → (B) único com a função → (C) criador com a função →
 * desempate determinístico. Para `gestor` (fase aprovação), se ninguém marcou a função no app,
 * usa owner/admin/editor e por último qualquer membro ativo.
 */
export function resolveExecutionOwner(params: ResolveExecutionOwnerParams): string | null {
	const fn = mapSubstatusToFunction(params.currentActionId, params.statusId);
	if (!fn) return null;

	let pool = params.agencyMembers.filter((m) => memberHasTeamFunction(m, fn));
	if (pool.length === 0 && fn === 'gestor') {
		pool = params.agencyMembers.filter((m) => {
			const r = m.role;
			return r === 'owner' || r === 'admin' || r === 'editor';
		});
	}
	if (pool.length === 0 && fn === 'gestor' && params.agencyMembers.length > 0) {
		pool = [...params.agencyMembers];
	}
	if (pool.length === 0) return null;

	const clientOwner = params.clientOwnerUserId?.trim() || null;
	if (clientOwner && pool.some((m) => m.id === clientOwner)) {
		return clientOwner;
	}

	if (pool.length === 1) {
		return pool[0].id;
	}

	const creator = params.createdByUserId?.trim() || null;
	if (creator && pool.some((m) => m.id === creator)) {
		return creator;
	}

	pool.sort((a, b) => a.id.localeCompare(b.id));
	return pool[0].id;
}

export function toExecutionMembersFromPrisma(
	rows: Array<{ id: string; fullName: string; userFunctions: unknown; operationalRole?: string; role?: string }>,
): ExecutionAgencyMember[] {
	return rows.map((r) => ({
		id: r.id,
		fullName: r.fullName,
		userFunctions: normalizeUserFunctions(r.userFunctions),
		operationalRole: r.operationalRole,
		role: r.role,
	}));
}

/** Resolve o "responsável pelo cliente" para uso na prioridade A. */
export function resolveClientOwnerForExecution(
	clientOwnerPreferencesJson: unknown,
	users: UserEligibilityRow[],
	agency: AgencySliceForClientOwner,
): string | null {
	const prefs = getClientOwnerPreferences(clientOwnerPreferencesJson);
	return resolveClientDefaultOwner(prefs, users, agency);
}
