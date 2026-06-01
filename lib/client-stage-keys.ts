/**
 * Espelho de `apps/api/src/clients/client-owner.constants.ts` — manter sincronizado.
 * (O bundler do frontend não importa da API; duplicação controlada por comentário.)
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

/** Espelho de `CLIENT_INITIAL_OWNER_STAGE_KEY` na API — manter sincronizado. */
export const CLIENT_INITIAL_OWNER_STAGE_KEY: ClientStageKey = CLIENT_STAGE_KEYS[0];
