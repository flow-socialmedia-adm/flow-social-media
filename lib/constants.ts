import type { StatusDefinition } from '../types';
import { POST_STATUS_COLORS, TASK_STATUS_COLORS } from './statusColors';

// --- UNIFIED VIBRANT COLOR PALETTE ---
export const WORKFLOW_STATUS_PALETTE = [
  // Reds
  { id: 'red-light', bg: 'bg-red-200', text: 'text-red-800', border: 'border-red-300 dark:border-red-200', ring: 'ring-red-400' },
  { id: 'red-medium', bg: 'bg-red-500', text: 'text-white', border: 'border-red-600 dark:border-red-400', ring: 'ring-red-500' },
  { id: 'red-dark', bg: 'bg-red-700', text: 'text-white', border: 'border-red-800 dark:border-red-600', ring: 'ring-red-700' },

  // Oranges
  { id: 'orange-light', bg: 'bg-orange-200', text: 'text-orange-800', border: 'border-orange-300 dark:border-orange-200', ring: 'ring-orange-400' },
  { id: 'orange-medium', bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-600 dark:border-orange-400', ring: 'ring-orange-500' },
  { id: 'orange-dark', bg: 'bg-orange-700', text: 'text-white', border: 'border-orange-800 dark:border-orange-600', ring: 'ring-orange-700' },

  // Greens
  { id: 'green-light', bg: 'bg-green-200', text: 'text-green-800', border: 'border-green-300 dark:border-green-200', ring: 'ring-green-400' },
  { id: 'green-medium', bg: 'bg-green-500', text: 'text-white', border: 'border-green-600 dark:border-green-400', ring: 'ring-green-500' },
  { id: 'green-dark', bg: 'bg-green-700', text: 'text-white', border: 'border-green-800 dark:border-green-600', ring: 'ring-green-700' },
  
  // Teals
  { id: 'teal-light', bg: 'bg-teal-200', text: 'text-teal-800', border: 'border-teal-300 dark:border-teal-200', ring: 'ring-teal-400' },
  { id: 'teal-medium', bg: 'bg-teal-500', text: 'text-white', border: 'border-teal-600 dark:border-teal-400', ring: 'ring-teal-500' },
  { id: 'teal-dark', bg: 'bg-teal-700', text: 'text-white', border: 'border-teal-800 dark:border-teal-600', ring: 'ring-teal-700' },

  // Blues
  { id: 'blue-light', bg: 'bg-blue-200', text: 'text-blue-800', border: 'border-blue-300 dark:border-blue-200', ring: 'ring-blue-400' },
  { id: 'blue-medium', bg: 'bg-blue-500', text: 'text-white', border: 'border-blue-600 dark:border-blue-400', ring: 'ring-blue-500' },
  { id: 'blue-dark', bg: 'bg-blue-700', text: 'text-white', border: 'border-blue-800 dark:border-blue-600', ring: 'ring-blue-700' },

  // Indigos
  { id: 'indigo-light', bg: 'bg-indigo-200', text: 'text-indigo-800', border: 'border-indigo-300 dark:border-indigo-200', ring: 'ring-indigo-400' },
  { id: 'indigo-medium', bg: 'bg-indigo-500', text: 'text-white', border: 'border-indigo-600 dark:border-indigo-400', ring: 'ring-indigo-500' },
  { id: 'indigo-dark', bg: 'bg-indigo-700', text: 'text-white', border: 'border-indigo-800 dark:border-indigo-600', ring: 'ring-indigo-700' },

  // Purples
  { id: 'purple-light', bg: 'bg-purple-200', text: 'text-purple-800', border: 'border-purple-300 dark:border-purple-200', ring: 'ring-purple-400' },
  { id: 'purple-medium', bg: 'bg-purple-500', text: 'text-white', border: 'border-purple-600 dark:border-purple-400', ring: 'ring-purple-500' },
  { id: 'purple-dark', bg: 'bg-purple-700', text: 'text-white', border: 'border-purple-800 dark:border-purple-600', ring: 'ring-purple-700' },

  // Cyans
  { id: 'cyan-light', bg: 'bg-cyan-200', text: 'text-cyan-800', border: 'border-cyan-300 dark:border-cyan-200', ring: 'ring-cyan-400' },
  { id: 'cyan-medium', bg: 'bg-cyan-500', text: 'text-white', border: 'border-cyan-600 dark:border-cyan-400', ring: 'ring-cyan-500' },
  { id: 'cyan-dark', bg: 'bg-cyan-700', text: 'text-white', border: 'border-cyan-800 dark:border-cyan-600', ring: 'ring-cyan-700' },

  // Grays
  { id: 'gray-light', bg: 'bg-gray-300', text: 'text-gray-800', border: 'border-gray-400 dark:border-gray-300', ring: 'ring-gray-400' },
  { id: 'gray-medium', bg: 'bg-gray-500', text: 'text-white', border: 'border-gray-600 dark:border-gray-400', ring: 'ring-gray-500' },
  { id: 'gray-dark', bg: 'bg-gray-700', text: 'text-white', border: 'border-gray-800 dark:border-gray-600', ring: 'ring-gray-700' },
];

export const colorMap = Object.fromEntries(
  WORKFLOW_STATUS_PALETTE.map(({ id, ...rest }) => [id, rest])
);

// Mapeamento de cores simples do backend para objetos de cor do frontend
const backendColorMap: Record<string, { bg: string; text: string; border: string; ring: string }> = {
  purple: { bg: 'bg-purple-500', text: 'text-white', border: 'border-purple-600', ring: 'ring-purple-500' },
  blue: { bg: 'bg-blue-500', text: 'text-white', border: 'border-blue-600', ring: 'ring-blue-500' },
  amber: { bg: 'bg-amber-500', text: 'text-white', border: 'border-amber-600', ring: 'ring-amber-500' },
  green: { bg: 'bg-green-500', text: 'text-white', border: 'border-green-600', ring: 'ring-green-500' },
  cyan: { bg: 'bg-cyan-500', text: 'text-white', border: 'border-cyan-600', ring: 'ring-cyan-500' },
  emerald: { bg: 'bg-emerald-500', text: 'text-white', border: 'border-emerald-600', ring: 'ring-emerald-500' },
  teal: { bg: 'bg-teal-500', text: 'text-white', border: 'border-teal-600', ring: 'ring-teal-500' },
  gray: { bg: 'bg-gray-500', text: 'text-white', border: 'border-gray-600', ring: 'ring-gray-500' },
};

// Overrides por statusId — derivados de statusColors.ts (fonte única de verdade).
// Inclui tanto os IDs da API (a_fazer, em_andamento, concluido) quanto os IDs
// canônicos do seed local (todo, in_progress, done) para cobrir qualquer variação
// de workflow que o backend possa retornar.
const statusColorOverrides: Record<string, { bg: string; text: string; border: string; ring: string }> = {
  // Posts (paleta viva)
  ...POST_STATUS_COLORS,
  // Tarefas gerais — IDs da API
  ...TASK_STATUS_COLORS,
  // Tarefas gerais — IDs canônicos do seed (alias para os mesmos tons pastéis)
  todo:        TASK_STATUS_COLORS.a_fazer,
  in_progress: TASK_STATUS_COLORS.em_andamento,
  done:        TASK_STATUS_COLORS.concluido,
};

/** IDs do seed legado `production` → mesmo visual que os status fixos da API em `statusColorOverrides`. */
const LEGACY_POST_STATUS_TO_OVERRIDE_KEY: Record<string, keyof typeof statusColorOverrides> = {
  ideia_post: 'pauta_criada',
  fazer_post: 'em_producao',
  enviar_aprovacao: 'aguardando_aprovacao',
  agendar_post: 'agendado',
  agendado_postado: 'publicado',
};

/**
 * Cor visual de um status de Posts — mesma lógica da página Posts (`convertBackendStatusToFrontend`):
 * override por id (API) → equivalência do fluxo legado → token vindo do backend → fallback.
 */
export function resolvePostStatusVisualColor(
  statusId: string,
  backendColorToken?: string,
): StatusDefinition['color'] {
  const direct = statusColorOverrides[statusId as keyof typeof statusColorOverrides];
  if (direct) return { ...direct };
  const mappedKey = LEGACY_POST_STATUS_TO_OVERRIDE_KEY[statusId];
  if (mappedKey) {
    const mapped = statusColorOverrides[mappedKey];
    if (mapped) return { ...mapped };
  }
  if (backendColorToken && backendColorMap[backendColorToken]) {
    return { ...backendColorMap[backendColorToken] };
  }
  const cm = colorMap['blue-medium'];
  return { bg: cm.bg, text: cm.text, border: cm.border, ring: cm.ring };
}

// Converter status do backend para formato do frontend
export function convertBackendStatusToFrontend(status: { id: string; name: string; color: string; order: number }): { id: string; nameKey: string; color: { bg: string; text: string; border: string; ring: string }; category: string } {
  const colorObj = resolvePostStatusVisualColor(status.id, status.color);
  // Determinar categoria baseado no ID ou ordem
  let category = 'todo';
  if (status.id.includes('producao') || status.id.includes('andamento')) category = 'in_progress';
  if (status.id.includes('aprovado') || status.id.includes('agendado') || status.id.includes('publicado') || status.id.includes('concluido')) category = 'done';
  
  return {
    id: status.id,
    nameKey: status.id, // Usar ID como nameKey para tradução
    color: colorObj,
    category,
  };
}

// --- POST KANBAN PHASES (view grouping only; status IDs from API) ---
export const POST_PHASES = {
  producao: { statusIds: ['pauta_criada', 'em_producao'], labelKey: 'phase_producao' },
  aprovacao: { statusIds: ['aguardando_aprovacao', 'aprovado'], labelKey: 'phase_aprovacao' },
  publicacao: { statusIds: ['agendado', 'publicado'], labelKey: 'phase_publicacao' },
} as const;

export const PUBLICACAO_PHASE_ID = 'publicacao' as const;

export type PostPhaseId = keyof typeof POST_PHASES;

/** Colunas do Kanban de Posts (5 colunas) - mapeia statusIds para coluna. */
export const POST_KANBAN_COLUMNS = [
    { id: 'pauta', labelKey: 'posts_column_pauta', statusIds: ['pauta_criada', 'ideia_post', 'todo'] },
    { id: 'producao', labelKey: 'posts_column_producao', statusIds: ['em_producao', 'fazer_post', 'enviar_aprovacao', 'agendar_post'] },
    { id: 'aprovacao', labelKey: 'posts_column_aprovacao', statusIds: ['aguardando_aprovacao', 'aprovado'] },
    { id: 'agendamento', labelKey: 'posts_column_agendamento', statusIds: ['agendado', 'agendado_postado'] },
    { id: 'publicacao', labelKey: 'posts_column_publicacao', statusIds: ['publicado'] },
] as const;

export type PostKanbanColumnId = (typeof POST_KANBAN_COLUMNS)[number]['id'];

/** Retorna o id da coluna para um statusId. */
export function getPostColumnByStatusId(statusId: string): PostKanbanColumnId {
    for (const col of POST_KANBAN_COLUMNS) {
        if (col.statusIds.includes(statusId)) return col.id;
    }
    return 'pauta'; // fallback: ideias/pauta
}

/** Retorna o primeiro statusId de uma coluna do Kanban. */
export function getFirstStatusIdOfColumn(columnId: PostKanbanColumnId): string {
    const col = POST_KANBAN_COLUMNS.find((c) => c.id === columnId);
    return col?.statusIds[0] || 'pauta_criada';
}

/** Returns the phase id for a given post status id, or null if unknown. */
export function getPhaseIdByStatusId(statusId: string): PostPhaseId | null {
  for (const [phaseId, phase] of Object.entries(POST_PHASES)) {
    if (phase.statusIds.includes(statusId)) return phaseId as PostPhaseId;
  }
  return null;
}

/** First status id in a phase (e.g. for "new post" in that phase). */
export function getFirstStatusIdOfPhase(phaseId: PostPhaseId): string {
  return POST_PHASES[phaseId].statusIds[0];
}

/** Last status id in a phase (used when dropping a post into that phase). */
export function getLastStatusIdOfPhase(phaseId: PostPhaseId): string {
  const ids = POST_PHASES[phaseId].statusIds;
  return ids[ids.length - 1];
}

// Converter workflow do backend para formato do frontend
export function convertBackendWorkflowToFrontend(wf: any): { id: string; nameKey: string; isCustom: boolean; category: 'client' | 'general'; statuses: any[] } {
  const statusesJson = typeof wf.statusesJson === 'string' ? JSON.parse(wf.statusesJson) : wf.statusesJson;
  const statuses = Array.isArray(statusesJson) 
    ? statusesJson.map(convertBackendStatusToFrontend)
    : [];
  
  return {
    id: wf.id,
    nameKey: wf.name || wf.id,
    isCustom: wf.isCustom || false,
    category: wf.category,
    statuses,
  };
}
