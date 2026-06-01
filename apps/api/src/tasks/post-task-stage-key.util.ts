import type { ClientStageKey } from '../clients/client-owner.constants';

/**
 * Mapeia estado de post (macro + sub-ação) → chave de etapa em `CLIENT_STAGE_KEYS`.
 * Alinhado a `POST_CLIENT_LINEAR` em `task-action-flow.ts` e ao fluxo do frontend.
 * Se não houver mapeamento seguro → null (sem sugestão de responsável).
 */
const ACTION_ID_TO_STAGE: Record<string, ClientStageKey> = {
	criando_pauta: 'legenda',
	criando_legenda: 'legenda',
	criando_arte: 'arte',
	editando_video: 'video',
	enviado_aprovacao: 'aprovacao',
	aguardando_devolutiva: 'aprovacao',
	em_alteracao: 'aprovacao',
	agendando: 'agendamento',
	agendado_final: 'agendamento',
	publicado_final: 'publicacao',
};

/** Fallback quando `currentActionId` é null (ex.: aprovado sem sub-etapa). */
const STATUS_ONLY_STAGE: Record<string, ClientStageKey> = {
	pauta_criada: 'legenda',
	em_producao: 'legenda',
	aguardando_aprovacao: 'aprovacao',
	aprovado: 'aprovacao',
	agendado: 'agendamento',
	publicado: 'publicacao',
};

export function mapPostTaskStateToClientStageKey(
	statusId: string,
	currentActionId: string | null | undefined,
): ClientStageKey | null {
	const aid = currentActionId ?? null;
	if (aid) {
		const byAction = ACTION_ID_TO_STAGE[aid];
		return byAction ?? null;
	}
	return STATUS_ONLY_STAGE[statusId] ?? null;
}
