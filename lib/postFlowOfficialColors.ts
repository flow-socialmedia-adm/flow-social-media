import type { StatusDefinition } from '../types';
import { resolvePostStatusVisualColor } from './constants';

/**
 * Cores do fluxo de posts no esquema "Padrão" e no seed `production` — derivadas **somente** de
 * `resolvePostStatusVisualColor` em `lib/constants.ts` (mesma regra que `convertBackendStatusToFrontend`
 * usa na página Posts: `statusColorOverrides` + equivalência dos IDs legados).
 *
 * Não há paleta paralela: qualquer alteração visual de Posts deve ser feita em `statusColorOverrides`
 * / `resolvePostStatusVisualColor`; este objeto apenas materializa os cinco IDs canônicos do seed.
 */
export const OFFICIAL_POST_STATUS_COLORS: Record<string, StatusDefinition['color']> = {
	ideia_post: { ...resolvePostStatusVisualColor('ideia_post') },
	fazer_post: { ...resolvePostStatusVisualColor('fazer_post') },
	enviar_aprovacao: { ...resolvePostStatusVisualColor('enviar_aprovacao') },
	agendar_post: { ...resolvePostStatusVisualColor('agendar_post') },
	agendado_postado: { ...resolvePostStatusVisualColor('agendado_postado') },
};
