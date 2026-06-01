/**
 * Chaves canónicas de `stageOwnerMap` em `clientOwnerPreferencesJson`.
 * Não renomear sem migração de dados — valores já gravados no JSON usam estes ids.
 */
export const CLIENT_STAGE_KEYS = [
	'legenda',
	'arte',
	'video',
	'aprovacao',
	'agendamento',
	'publicacao',
] as const;

export type ClientStageKey = (typeof CLIENT_STAGE_KEYS)[number];

/** Etapa inicial para autoatribuição na criação (primeira chave do fluxo de conteúdo). */
export const CLIENT_INITIAL_OWNER_STAGE_KEY: ClientStageKey = CLIENT_STAGE_KEYS[0];
