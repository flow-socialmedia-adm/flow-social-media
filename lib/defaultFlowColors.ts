import type { StatusDefinition } from '../types';
import { TASK_STATUS_COLORS } from './statusColors';
import { OFFICIAL_POST_STATUS_COLORS } from './postFlowOfficialColors';

/** IDs fixos do fluxo de posts (cores apenas; ordem/IDs de negócio inalterados). */
export const CANONICAL_POST_STATUS_IDS = [
	'ideia_post',
	'fazer_post',
	'enviar_aprovacao',
	'agendar_post',
	'agendado_postado',
] as const;

/** IDs fixos do fluxo geral de tarefas. */
export const CANONICAL_TASK_STATUS_IDS = ['todo', 'in_progress', 'done'] as const;

/** Cores padrão do fluxo de posts (= cópia da paleta oficial da página Posts). */
export const DEFAULT_POST_STATUS_COLORS: Record<string, StatusDefinition['color']> = cloneColorMap(OFFICIAL_POST_STATUS_COLORS);

/** Cores padrão do fluxo geral de tarefas — paleta pastel definida em statusColors.ts.
 * Mapeamento: todo=a_fazer (gray-400), in_progress=em_andamento (cyan-300), done=concluido (teal-300).
 */
export const DEFAULT_TASK_STATUS_COLORS: Record<string, StatusDefinition['color']> = {
	todo:        { ...TASK_STATUS_COLORS.a_fazer },
	in_progress: { ...TASK_STATUS_COLORS.em_andamento },
	done:        { ...TASK_STATUS_COLORS.concluido },
};


export function cloneStatusColor(c: StatusDefinition['color']): StatusDefinition['color'] {
	return { bg: c.bg, text: c.text, border: c.border, ring: c.ring };
}

export function cloneColorMap(map: Record<string, StatusDefinition['color']>): Record<string, StatusDefinition['color']> {
	const out: Record<string, StatusDefinition['color']> = {};
	for (const k of Object.keys(map)) {
		out[k] = cloneStatusColor(map[k]);
	}
	return out;
}
