import type { ColorSchemesPreferences, ColorSchemeAreaPreference, Workflow } from '../types';
import {
	CANONICAL_POST_STATUS_IDS,
	CANONICAL_TASK_STATUS_IDS,
	DEFAULT_POST_STATUS_COLORS,
	DEFAULT_TASK_STATUS_COLORS,
	cloneColorMap,
	cloneStatusColor,
} from './defaultFlowColors';

/** Cópia profunda de uma área (posts/tasks) para rascunho na UI de configurações. */
export function cloneColorSchemeAreaPreference(area: ColorSchemeAreaPreference): ColorSchemeAreaPreference {
	return JSON.parse(JSON.stringify(area)) as ColorSchemeAreaPreference;
}

export function fingerprintColorSchemeArea(area: ColorSchemeAreaPreference): string {
	return JSON.stringify(area);
}

function colorsEqual(a: { bg: string; text: string; border: string; ring: string }, b: typeof a): boolean {
	return a.bg === b.bg && a.text === b.text && a.border === b.border && a.ring === b.ring;
}

/**
 * Mapeamento bidirecional entre os IDs canônicos do seed local e os IDs usados pela API/backend.
 *
 * Seed local (CANONICAL_POST_STATUS_IDS) → API/backend:
 *   ideia_post      ↔ pauta_criada
 *   fazer_post      ↔ em_producao
 *   enviar_aprovacao ↔ aguardando_aprovacao
 *   agendar_post    ↔ agendado
 *   agendado_postado ↔ publicado
 *
 * Ao consultar a cor de um status, se não encontrar pelo ID exato tenta o alias,
 * garantindo que o esquema ativo seja aplicado independentemente de qual conjunto de
 * IDs o workflow do backend está usando.
 */
const POST_STATUS_ALIAS: Record<string, string> = {
	// canônico → API
	ideia_post: 'pauta_criada',
	fazer_post: 'em_producao',
	enviar_aprovacao: 'aguardando_aprovacao',
	agendar_post: 'agendado',
	agendado_postado: 'publicado',
	// API → canônico (reverso)
	pauta_criada: 'ideia_post',
	em_producao: 'fazer_post',
	aguardando_aprovacao: 'enviar_aprovacao',
	aprovado: 'enviar_aprovacao',
	agendado: 'agendar_post',
	publicado: 'agendado_postado',
} as const;

/** IDs canônicos + aliases da API — usados para detectar se um workflow é de posts. */
const ALL_POST_STATUS_IDS: ReadonlySet<string> = new Set([
	...CANONICAL_POST_STATUS_IDS,
	'pauta_criada',
	'em_producao',
	'aguardando_aprovacao',
	'aprovado',
	'agendado',
	'publicado',
]);

/**
 * Mapeamento bidirecional entre os IDs canônicos de tarefas gerais e os IDs usados pela API/backend.
 *
 * Seed local (CANONICAL_TASK_STATUS_IDS) → API/backend:
 *   todo       ↔ a_fazer
 *   in_progress ↔ em_andamento
 *   done       ↔ concluido
 */
const TASK_STATUS_ALIAS: Record<string, string> = {
	// canônico → API
	todo: 'a_fazer',
	in_progress: 'em_andamento',
	done: 'concluido',
	// API → canônico (reverso)
	a_fazer: 'todo',
	em_andamento: 'in_progress',
	concluido: 'done',
} as const;

/** IDs canônicos + aliases da API — usados para detectar se um workflow é de tarefas gerais. */
const ALL_TASK_STATUS_IDS: ReadonlySet<string> = new Set([
	...CANONICAL_TASK_STATUS_IDS,
	'a_fazer',
	'em_andamento',
	'concluido',
]);

/** Garante que aplicação de cores e UI de posts leiam o workflow que de fato contém os status canônicos (evita p.ex. `standard` vs `production` ou tarefa colada a um id antigo). */
export function resolveClientPostWorkflowId(
	workflows: Record<string, Workflow>,
	preferred: string,
): string {
	const isPostWorkflow = (w: Workflow | undefined) =>
		w?.statuses?.some((s) => ALL_POST_STATUS_IDS.has(s.id)) ?? false;

	if (isPostWorkflow(workflows[preferred])) return preferred;
	if (isPostWorkflow(workflows['production'])) return 'production';
	const found = Object.values(workflows).find(
		(w) => w?.category === 'client' && isPostWorkflow(w),
	);
	return found?.id ?? preferred;
}

export function resolveGeneralTaskWorkflowId(
	workflows: Record<string, Workflow>,
	preferred: string,
): string {
	const isTaskWorkflow = (w: Workflow | undefined) =>
		w?.statuses?.some((s) => ALL_TASK_STATUS_IDS.has(s.id)) ?? false;

	if (isTaskWorkflow(workflows[preferred])) return preferred;
	if (isTaskWorkflow(workflows['standard_general'])) return 'standard_general';
	const found = Object.values(workflows).find(
		(w) => w?.category === 'general' && isTaskWorkflow(w),
	);
	return found?.id ?? preferred;
}

export function createDefaultColorSchemesPreferences(): ColorSchemesPreferences {
	return {
		posts: { active: 'default', custom: null },
		tasks: { active: 'default', custom: null },
	};
}

export function normalizeColorSchemesPreferences(raw: unknown): ColorSchemesPreferences {
	const base = createDefaultColorSchemesPreferences();
	if (!raw || typeof raw !== 'object') return base;
	const o = raw as Record<string, unknown>;
	const mergeArea = (key: 'posts' | 'tasks', defaults: Record<string, Workflow['statuses'][0]['color']>): ColorSchemeAreaPreference => {
		const a = o[key];
		if (!a || typeof a !== 'object') return base[key];
		const ar = a as Record<string, unknown>;
		const active = ar.active === 'custom' ? 'custom' : 'default';
		let custom: ColorSchemeAreaPreference['custom'] = null;
		const c = ar.custom;
		if (c && typeof c === 'object') {
			const cr = c as Record<string, unknown>;
			const name = typeof cr.name === 'string' && cr.name.trim() ? cr.name.trim() : 'Custom';
			const colorsRaw = cr.colors;
			const colors: Record<string, Workflow['statuses'][0]['color']> = {};
			if (colorsRaw && typeof colorsRaw === 'object') {
				for (const [cid, val] of Object.entries(colorsRaw as Record<string, unknown>)) {
					if (!val || typeof val !== 'object') continue;
					const v = val as Record<string, unknown>;
					if (
						typeof v.bg === 'string' &&
						typeof v.text === 'string' &&
						typeof v.border === 'string' &&
						typeof v.ring === 'string'
					) {
						colors[cid] = { bg: v.bg, text: v.text, border: v.border, ring: v.ring };
					}
				}
			}
			custom = { id: 'custom', name, colors: { ...defaults, ...colors } };
		}
		if (active === 'custom' && !custom) return { active: 'default', custom: null };
		return { active, custom };
	};
	return {
		posts: mergeArea('posts', DEFAULT_POST_STATUS_COLORS),
		tasks: mergeArea('tasks', DEFAULT_TASK_STATUS_COLORS),
	};
}

/**
 * Payload compacto persistido pela agência: mantém somente overrides do custom.
 * O esquema Padrão continua vindo de DEFAULT_*_STATUS_COLORS no frontend.
 */
export function serializeColorSchemeAreaPreference(
	area: 'posts' | 'tasks',
	preference: ColorSchemeAreaPreference,
): ColorSchemeAreaPreference {
	const normalized = normalizeColorSchemesPreferences({
		posts: area === 'posts' ? preference : undefined,
		tasks: area === 'tasks' ? preference : undefined,
	})[area];
	if (!normalized.custom) return { active: 'default', custom: null };

	const defaults = area === 'posts' ? DEFAULT_POST_STATUS_COLORS : DEFAULT_TASK_STATUS_COLORS;
	const allowedIds = area === 'posts' ? CANONICAL_POST_STATUS_IDS : CANONICAL_TASK_STATUS_IDS;
	const overrides: Record<string, Workflow['statuses'][0]['color']> = {};
	for (const statusId of allowedIds) {
		const color = normalized.custom.colors[statusId];
		const defaultColor = defaults[statusId];
		if (color && defaultColor && !colorsEqual(color, defaultColor)) {
			overrides[statusId] = cloneStatusColor(color);
		}
	}
	return {
		active: normalized.active,
		custom: {
			id: 'custom',
			name: normalized.custom.name,
			colors: overrides,
		},
	};
}

function resolveColorsForArea(
	area: ColorSchemeAreaPreference,
	defaults: Record<string, Workflow['statuses'][0]['color']>,
): Record<string, Workflow['statuses'][0]['color']> {
	if (area.active === 'custom' && area.custom) {
		return { ...defaults, ...cloneColorMap(area.custom.colors) };
	}
	return cloneColorMap(defaults);
}

function patchWorkflowStatusColors(
	workflows: Record<string, Workflow>,
	workflowKey: string,
	resolved: Record<string, Workflow['statuses'][0]['color']>,
	allowedIds: readonly string[],
	aliasMap?: Record<string, string>,
): Record<string, Workflow> {
	const wf = workflows[workflowKey];
	if (!wf) return workflows;
	let touched = false;
	const nextStatuses = wf.statuses.map((st) => {
		// Considera o status elegível se o seu ID direto OU o seu alias estiver na lista de IDs permitidos.
		const aliasId = aliasMap?.[st.id];
		const eligible = allowedIds.includes(st.id) || (aliasId != null && allowedIds.includes(aliasId));
		if (!eligible) return st;
		// Busca a cor pelo ID direto; se não encontrar, tenta o alias (ex.: workflow usa 'pauta_criada'
		// mas a cor foi salva em 'ideia_post').
		const nc = resolved[st.id] ?? (aliasId != null ? resolved[aliasId] : undefined);
		if (!nc) return st;
		if (colorsEqual(st.color, nc)) return st;
		touched = true;
		return { ...st, color: cloneStatusColor(nc) };
	});
	if (!touched) return workflows;
	return { ...workflows, [workflowKey]: { ...wf, statuses: nextStatuses } };
}

/**
 * Aplica apenas cores nos workflows ativos de posts (`clientWorkflowId`) e tarefas gerais (`generalWorkflowId`).
 * Não altera IDs, ordem, nameKey ou categorias.
 */
export function applyActiveColorSchemes(
	workflows: Record<string, Workflow>,
	prefs: ColorSchemesPreferences,
	postsWorkflowKey: string,
	tasksWorkflowKey: string,
): Record<string, Workflow> {
	let next = workflows;
	const postColors = resolveColorsForArea(prefs.posts, DEFAULT_POST_STATUS_COLORS);
	const taskColors = resolveColorsForArea(prefs.tasks, DEFAULT_TASK_STATUS_COLORS);
	const effectivePostKey = resolveClientPostWorkflowId(next, postsWorkflowKey);
	const n1 = patchWorkflowStatusColors(next, effectivePostKey, postColors, CANONICAL_POST_STATUS_IDS, POST_STATUS_ALIAS);
	if (n1 !== next) next = n1;
	const effectiveTaskKey = resolveGeneralTaskWorkflowId(next, tasksWorkflowKey);
	const n2 = patchWorkflowStatusColors(next, effectiveTaskKey, taskColors, CANONICAL_TASK_STATUS_IDS, TASK_STATUS_ALIAS);
	if (n2 !== next) next = n2;
	return next;
}
