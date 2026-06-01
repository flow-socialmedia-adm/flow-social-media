import type { Task } from '../types';
import { ALL_SUBSTATUS_DOTS } from './statusColors';

/**
 * Base para sub-etapas: fluxos lineares + `Task.currentActionId`.
 * Evoluções futuras (timeline no histórico, métricas por substatus, insights):
 * reutilizar os mesmos `actionId` e estes arrays como fonte de verdade.
 */

/** Variação de tom dentro da paleta de um status. */
export type ColorVariant = 'light' | 'medium' | 'strong' | 'dark';

/**
 * Etapa linear: macro status + sub-ação (currentActionId).
 * actionId null = apenas o status macro, sem sub-etapa obrigatória.
 * Mantido como lista ordenada para setas, menu agrupado e futuras métricas/timeline.
 *
 * visualGroup: quando definido, agrupa visualmente este passo sob outro statusId no menu/modal.
 * O statusId real da etapa é preservado e usado na chamada de API.
 *
 * colorVariant: tom dentro da paleta do grupo (light → dark) para representar progressão visual.
 */
export type LinearFlowStep = {
	statusId: string;
	actionId: string | null;
	nameKey: string;
	visualGroup?: string;
	colorVariant?: ColorVariant;
};

type DotColor = { bg: string; border: string };

// Paleta de substatus importada de statusColors.ts (fonte única de verdade).
const SUBSTATUS_DOT_COLORS: Record<string, Record<ColorVariant, DotColor>> = ALL_SUBSTATUS_DOTS;

/**
 * Cor de indicador (dot) para substatus: **sempre o mesmo tom do status macro** (variante `dark` = cor base do status).
 * Não varia mais por `colorVariant` do passo — o substatus distingue-se pelo texto.
 * Em menus com `StatusDefinition` disponível, prefira `status.color` diretamente.
 */
export function getSubstatusColor(_step: LinearFlowStep, groupStatusId: string): DotColor {
	const scale = SUBSTATUS_DOT_COLORS[groupStatusId] ?? SUBSTATUS_DOT_COLORS[_step.statusId];
	const fallback: DotColor = { bg: 'bg-gray-400', border: 'border-gray-500' };
	if (!scale) return fallback;
	return scale.dark ?? scale.medium ?? scale.strong ?? fallback;
}

/**
 * Classe CSS de texto para badge de substatus.
 * Retorna texto escuro em tons claros (100–400) e branco nos demais.
 * Inclui -400 pois cores como amber-400, cyan-400, gray-400 têm luminância alta.
 */
export function substatusBadgeTextClass(dotBg: string): string {
	if (/bg-\[#(B8A8CF|AD97BD|A58DB3|9881AF|8A71A4)\]/i.test(dotBg)) return 'text-white';
	return /-(100|200|300|400)(\b|\s|$)/.test(dotBg) ? 'text-slate-800 dark:text-slate-100' : 'text-white';
}

/** Fluxo canônico de posts (workflow de cliente). Ordem = navegação linear. */
export const POST_CLIENT_LINEAR_FLOW: LinearFlowStep[] = [
	{ statusId: 'pauta_criada',          actionId: 'criando_pauta',        nameKey: 'substatus_criando_pauta',          colorVariant: 'medium' },
	{ statusId: 'em_producao',           actionId: 'criando_legenda',      nameKey: 'substatus_criando_legenda',         colorVariant: 'light'  },
	{ statusId: 'em_producao',           actionId: 'criando_arte',         nameKey: 'substatus_criando_arte',            colorVariant: 'medium' },
	{ statusId: 'em_producao',           actionId: 'editando_video',       nameKey: 'substatus_editando_video',          colorVariant: 'dark'   },
	{ statusId: 'aguardando_aprovacao',  actionId: 'enviado_aprovacao',    nameKey: 'substatus_enviado_aprovacao',       colorVariant: 'light'  },
	{ statusId: 'aguardando_aprovacao',  actionId: 'aguardando_devolutiva',nameKey: 'substatus_aguardando_devolutiva',   colorVariant: 'medium' },
	{ statusId: 'aguardando_aprovacao',  actionId: 'em_alteracao',         nameKey: 'substatus_em_alteracao',            colorVariant: 'strong' },
	// 'aprovado' é um status real no backend; visualGroup agrupa-o visualmente dentro de 'aguardando_aprovacao'
	{ statusId: 'aprovado',              actionId: null,                   nameKey: 'aprovado',   visualGroup: 'aguardando_aprovacao', colorVariant: 'dark' },
	{ statusId: 'agendado',              actionId: 'agendando',            nameKey: 'substatus_agendando',               colorVariant: 'light'  },
	{ statusId: 'agendado',              actionId: 'agendado_final',       nameKey: 'substatus_agendado_final',          colorVariant: 'dark'   },
	{ statusId: 'publicado',             actionId: 'publicado_final',      nameKey: 'substatus_publicado_final',         colorVariant: 'medium' },
];

/** Fluxo canônico de tarefas gerais (API): apenas 3 colunas macro, sem sub-etapas. */
export const GENERAL_TASK_LINEAR_FLOW: LinearFlowStep[] = [
	{ statusId: 'a_fazer', actionId: null, nameKey: 'a_fazer', colorVariant: 'medium' },
	{ statusId: 'em_andamento', actionId: null, nameKey: 'em_andamento', colorVariant: 'medium' },
	{ statusId: 'concluido', actionId: null, nameKey: 'concluido', colorVariant: 'medium' },
];

const GENERAL_MOCK_CATEGORY_ORDER: Record<string, number> = {
	todo: 0,
	in_progress: 1,
	done: 2,
};

function isGeneralThreeColumnMock(statuses: { category?: string }[]): boolean {
	if (statuses.length !== 3) return false;
	const cats = new Set(statuses.map((s) => s.category || ''));
	return cats.has('todo') && cats.has('in_progress') && cats.has('done');
}

/** Monta fluxo macro-only a partir do workflow mock (todo / in_progress / done). */
function generalMacroFlowFromMockStatuses(
	statuses: { id: string; category?: string; nameKey: string }[],
): LinearFlowStep[] {
	return [...statuses]
		.sort(
			(a, b) =>
				(GENERAL_MOCK_CATEGORY_ORDER[a.category || ''] ?? 9) -
				(GENERAL_MOCK_CATEGORY_ORDER[b.category || ''] ?? 9),
		)
		.map((s) => ({
			statusId: s.id,
			actionId: null,
			nameKey: s.nameKey,
			colorVariant: 'medium' as ColorVariant,
		}));
}

export const POST_FLOW_STATUS_ORDER = [
	'pauta_criada',
	'em_producao',
	'aguardando_aprovacao',
	'aprovado',
	'agendado',
	'publicado',
] as const;

export const GENERAL_FLOW_STATUS_ORDER = ['a_fazer', 'em_andamento', 'concluido'] as const;

export function isRealPostFlowTask(task: Pick<Task, 'clientId' | 'postType' | 'category' | 'isGeneral'>): boolean {
	return (
		!task.isGeneral &&
		!!task.clientId &&
		!!task.postType &&
		task.category !== 'forecast'
	);
}

export function getPostLinearFlow(workflowStatuses?: { id: string }[]): LinearFlowStep[] | null {
	if (!workflowStatuses?.length) return null;
	const ids = new Set(workflowStatuses.map((s) => s.id));
	if (!POST_FLOW_STATUS_ORDER.every((id) => ids.has(id))) return null;
	return POST_CLIENT_LINEAR_FLOW;
}

export function getGeneralLinearFlow(
	workflowStatuses?: { id: string; category?: string; nameKey: string }[],
): LinearFlowStep[] | null {
	if (!workflowStatuses?.length) return null;
	const ids = new Set(workflowStatuses.map((s) => s.id));
	if (GENERAL_FLOW_STATUS_ORDER.every((id) => ids.has(id))) {
		return GENERAL_TASK_LINEAR_FLOW;
	}
	if (isGeneralThreeColumnMock(workflowStatuses)) {
		return generalMacroFlowFromMockStatuses(workflowStatuses);
	}
	return null;
}

/** Fluxo linear aplicável ao item (null se workflow customizado ou item sem fluxo de etapas). */
export function resolveLinearFlowForTask(
	task: Pick<Task, 'isGeneral' | 'clientId' | 'postType' | 'category'>,
	workflowStatuses?: { id: string }[],
): LinearFlowStep[] | null {
	if (isRealPostFlowTask(task)) return getPostLinearFlow(workflowStatuses);
	if (task.isGeneral) return getGeneralLinearFlow(workflowStatuses);
	return null;
}

/** Primeiro passo do fluxo para um status (primeira ocorrência na ordem linear). */
export function firstStepForStatus(flow: LinearFlowStep[], statusId: string): LinearFlowStep | undefined {
	return flow.find((s) => s.statusId === statusId);
}

export function defaultActionIdForStatus(flow: LinearFlowStep[], statusId: string): string | null {
	const s = firstStepForStatus(flow, statusId);
	return s ? s.actionId : null;
}

/**
 * Índice da etapa atual no fluxo linear.
 * Compatível com valores legados em currentActionId vindos de ações de post antigas.
 */
export function getCurrentStepIndexForTask(
	task: Pick<Task, 'statusId' | 'currentActionId'>,
	flow: LinearFlowStep[],
): number {
	if (!task.statusId || flow.length === 0) return 0;
	const aid = normalizeLegacyActionId(task.currentActionId ?? null, task.statusId);
	const exact = flow.findIndex((s) => s.statusId === task.statusId && (s.actionId ?? null) === (aid ?? null));
	if (exact >= 0) return exact;
	if (aid) {
		const byAction = flow.findIndex((s) => s.actionId === aid);
		if (byAction >= 0) return byAction;
	}
	const byStatus = flow.findIndex((s) => s.statusId === task.statusId);
	return byStatus >= 0 ? byStatus : 0;
}

/** Igualdade de etapa linear (menus 3 pontinhos, cards). */
export function areLinearFlowStepsEqual(a: LinearFlowStep, b: LinearFlowStep): boolean {
	return a.statusId === b.statusId && (a.actionId ?? null) === (b.actionId ?? null);
}

/** Indica se a tarefa está exatamente nesta etapa do fluxo. */
export function isTaskOnLinearFlowStep(task: Task, step: LinearFlowStep, flow: LinearFlowStep[]): boolean {
	const idx = getCurrentStepIndexForTask(task, flow);
	const cur = flow[idx];
	return !!cur && areLinearFlowStepsEqual(cur, step);
}

/** Mapeia ações de post legadas para um actionId do fluxo linear. */
function normalizeLegacyActionId(raw: string | null, _statusId: string): string | null {
	if (!raw) return null;
	if (raw === 'aprovar') return null;
	const legacy: Record<string, string> = {
		agendar_post: 'agendando',
		enviar_para_producao: 'criando_legenda',
		enviar_para_aprovacao: 'enviado_aprovacao',
		pedir_ajuste: 'criando_legenda',
		marcar_como_publicado: 'publicado_final',
	};
	if (legacy[raw]) return legacy[raw];
	return raw;
}

/** Rótulo secundário no card: só quando há sub-etapa (actionId definido). */
export function getSubstatusCardLabel(
	task: Pick<Task, 'statusId' | 'currentActionId' | 'clientId' | 'postType' | 'category' | 'isGeneral'>,
	t: (k: string) => string,
	workflowStatuses?: { id: string }[],
): string | null {
	const flow = resolveLinearFlowForTask(task, workflowStatuses);
	if (!flow) return null;
	const idx = getCurrentStepIndexForTask(task, flow);
	const step = flow[idx];
	if (!step || step.actionId === null) return null;
	return t(step.nameKey);
}

/**
 * Agrupa passos por chave visual (visualGroup ?? statusId), preservando a ordem de primeira aparição.
 * Passos com `visualGroup` são exibidos dentro do grupo do statusId referenciado,
 * mas seu `statusId` real é mantido para chamadas de API corretas.
 */
export function groupFlowByStatus(flow: LinearFlowStep[]): { statusId: string; steps: LinearFlowStep[] }[] {
	const seen = new Set<string>();
	const order: string[] = [];
	for (const s of flow) {
		const key = s.visualGroup ?? s.statusId;
		if (!seen.has(key)) {
			seen.add(key);
			order.push(key);
		}
	}
	return order.map((groupKey) => ({
		statusId: groupKey,
		steps: flow.filter((x) => (x.visualGroup ?? x.statusId) === groupKey),
	}));
}

/** Valor único para <option> / estado do modal: "statusId::actionId" (action vazio = macro). */
export function encodeStepValue(statusId: string, actionId: string | null): string {
	return `${statusId}::${actionId ?? ''}`;
}

export function decodeStepValue(raw: string): { statusId: string; actionId: string | null } {
	const i = raw.indexOf('::');
	if (i < 0) return { statusId: raw, actionId: null };
	const statusId = raw.slice(0, i);
	const rest = raw.slice(i + 2);
	return { statusId, actionId: rest === '' ? null : rest };
}

/** Ações de substatus antigas de tarefas gerais (antes do fluxo só-macro). */
const LEGACY_GENERAL_ACTION_NAME_KEYS: Record<string, string> = {
	planejando: 'substatus_planejando',
	executando: 'substatus_executando',
	revisando: 'substatus_revisando',
	concluido_final: 'substatus_concluido_final',
};

/** Chave i18n da sub-etapa conhecida (histórico, tooltips); desconhecidos retornam null. */
export function substatusNameKeyForActionId(actionId: string | null | undefined): string | null {
	if (actionId == null || actionId === '') return null;
	const legacy = LEGACY_GENERAL_ACTION_NAME_KEYS[actionId];
	if (legacy) return legacy;
	const all = [...POST_CLIENT_LINEAR_FLOW, ...GENERAL_TASK_LINEAR_FLOW];
	const step = all.find((s) => s.actionId === actionId);
	return step?.nameKey ?? null;
}

export function stepValueForTask(
	task: Pick<Task, 'statusId' | 'currentActionId' | 'clientId' | 'postType' | 'category' | 'isGeneral'>,
	workflowStatuses?: { id: string }[],
): string | null {
	const flow = resolveLinearFlowForTask(task, workflowStatuses);
	if (!flow || !task.statusId) return null;
	const idx = getCurrentStepIndexForTask(task, flow);
	const step = flow[idx];
	if (!step) return encodeStepValue(task.statusId, null);
	return encodeStepValue(step.statusId, step.actionId);
}
