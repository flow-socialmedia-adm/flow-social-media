/**
 * Design system centralizado de cores para Posts e Tarefas.
 *
 * FONTE ÚNICA DE VERDADE — toda definição de cor vive aqui.
 * Outros módulos (constants.ts, taskActionFlow.ts, defaultFlowColors.ts)
 * importam deste arquivo. Nenhum componente deve ter cor hardcoded.
 *
 * Hierarquia:
 *  - Posts: cores vivas (violet, pink, amber, blue, emerald)
 *  - Tarefas: escala cinza neutra (gray-100 → gray-300) — operação/admin, distinto de posts e previsão (slate)
 *  - Card Agenda: fundo = cor do STATUS (não substatus)
 *  - Substatus: mesma família cromática do status macro; na Agenda, pill branco translúcido (texto = substatus)
 */

export type StatusColorClasses = {
	bg: string;
	text: string;
	border: string;
	ring: string;
};

export type DotColorClasses = {
	bg: string;
	border: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// POST STATUS BASE COLORS  (paleta viva)
// Hex de referência nos comentários; usar as classes Tailwind no código.
// ─────────────────────────────────────────────────────────────────────────────
export const POST_STATUS_COLORS: Record<string, StatusColorClasses> = {
	pauta_criada: {         // #8B5CF6  violet-500
		bg: 'bg-violet-500', text: 'text-white', border: 'border-violet-600', ring: 'ring-violet-500',
	},
	em_producao: {          // #EC4899  pink-500
		bg: 'bg-pink-500', text: 'text-white', border: 'border-pink-600', ring: 'ring-pink-500',
	},
	aguardando_aprovacao: { // #F59E0B  amber-500
		bg: 'bg-amber-500', text: 'text-white', border: 'border-amber-600', ring: 'ring-amber-500',
	},
	// 'aprovado' é statusId real no backend; tratado visualmente como último
	// substatus de Aprovação → mesma cor da base da família amber.
	aprovado: {             // #F59E0B  amber-500
		bg: 'bg-amber-500', text: 'text-white', border: 'border-amber-600', ring: 'ring-amber-500',
	},
	agendado: {             // #2563EB  blue-600
		bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-700', ring: 'ring-blue-600',
	},
	publicado: {            // #10B981  emerald-500
		bg: 'bg-emerald-500', text: 'text-white', border: 'border-emerald-600', ring: 'ring-emerald-500',
	},
};

// ─────────────────────────────────────────────────────────────────────────────
// TASK STATUS BASE COLORS — cinzas suaves (≠ slate da previsão, ≠ violeta dos posts)
// ─────────────────────────────────────────────────────────────────────────────
export const TASK_STATUS_COLORS: Record<string, StatusColorClasses> = {
	a_fazer: {
		bg: 'bg-gray-100 dark:bg-gray-700/70',
		text: 'text-gray-700 dark:text-gray-200',
		border: 'border-gray-300 dark:border-gray-600',
		ring: 'ring-gray-300 dark:ring-gray-600',
	},
	em_andamento: {
		bg: 'bg-gray-300 dark:bg-gray-600/80',
		text: 'text-gray-900 dark:text-gray-100',
		border: 'border-gray-400 dark:border-gray-500',
		ring: 'ring-gray-400 dark:ring-gray-500',
	},
	concluido: {
		bg: 'bg-gray-400 dark:bg-gray-500/90',
		text: 'text-gray-900 dark:text-gray-100',
		border: 'border-gray-500 dark:border-gray-500',
		ring: 'ring-gray-500 dark:ring-gray-500',
	},
};

// ─────────────────────────────────────────────────────────────────────────────
// SUBSTATUS DOT COLORS — Posts
// Escala: light (primeiro) → medium → strong → dark (último = cor base do status)
// ─────────────────────────────────────────────────────────────────────────────
export const POST_SUBSTATUS_DOTS: Record<string, Record<'light' | 'medium' | 'strong' | 'dark', DotColorClasses>> = {
	pauta_criada: {
		// 1 substatus (Pauta criada) → todos os variants = violet-500 (base)
		light:  { bg: 'bg-violet-300', border: 'border-violet-400' },
		medium: { bg: 'bg-violet-500', border: 'border-violet-600' },
		strong: { bg: 'bg-violet-500', border: 'border-violet-600' },
		dark:   { bg: 'bg-violet-500', border: 'border-violet-600' },
	},
	em_producao: {
		// 3 substatuses: pink-300 → pink-400 → pink-500 (base)
		light:  { bg: 'bg-pink-300', border: 'border-pink-400' },
		medium: { bg: 'bg-pink-400', border: 'border-pink-500' },
		strong: { bg: 'bg-pink-400', border: 'border-pink-500' },
		dark:   { bg: 'bg-pink-500', border: 'border-pink-600' },
	},
	aguardando_aprovacao: {
		// 4 substatuses: amber-200 → amber-300 → amber-400 → amber-500 (base)
		light:  { bg: 'bg-amber-200', border: 'border-amber-300' },
		medium: { bg: 'bg-amber-300', border: 'border-amber-400' },
		strong: { bg: 'bg-amber-400', border: 'border-amber-500' },
		dark:   { bg: 'bg-amber-500', border: 'border-amber-600' },
	},
	// 'aprovado' usa a mesma paleta da família Aprovação (amber)
	// visualGroup='aguardando_aprovacao' no fluxo linear
	aprovado: {
		light:  { bg: 'bg-amber-200', border: 'border-amber-300' },
		medium: { bg: 'bg-amber-300', border: 'border-amber-400' },
		strong: { bg: 'bg-amber-400', border: 'border-amber-500' },
		dark:   { bg: 'bg-amber-500', border: 'border-amber-600' },
	},
	agendado: {
		// 2 substatuses: blue-400 → blue-600 (base)
		light:  { bg: 'bg-blue-400', border: 'border-blue-500' },
		medium: { bg: 'bg-blue-500', border: 'border-blue-600' },
		strong: { bg: 'bg-blue-500', border: 'border-blue-600' },
		dark:   { bg: 'bg-blue-600', border: 'border-blue-700' },
	},
	publicado: {
		// 1 substatus (Publicado) → emerald-500 (base)
		light:  { bg: 'bg-emerald-400', border: 'border-emerald-500' },
		medium: { bg: 'bg-emerald-500', border: 'border-emerald-600' },
		strong: { bg: 'bg-emerald-500', border: 'border-emerald-600' },
		dark:   { bg: 'bg-emerald-500', border: 'border-emerald-600' },
	},
};

// ─────────────────────────────────────────────────────────────────────────────
// SUBSTATUS DOT COLORS — Tarefas
// ─────────────────────────────────────────────────────────────────────────────
export const TASK_SUBSTATUS_DOTS: Record<string, Record<'light' | 'medium' | 'strong' | 'dark', DotColorClasses>> = {
	a_fazer: {
		light:  { bg: 'bg-gray-200', border: 'border-gray-300' },
		medium: { bg: 'bg-gray-300', border: 'border-gray-400' },
		strong: { bg: 'bg-gray-300', border: 'border-gray-400' },
		dark:   { bg: 'bg-gray-400', border: 'border-gray-500' },
	},
	em_andamento: {
		light:  { bg: 'bg-gray-400', border: 'border-gray-500' },
		medium: { bg: 'bg-gray-500', border: 'border-gray-600' },
		strong: { bg: 'bg-gray-500', border: 'border-gray-600' },
		dark:   { bg: 'bg-gray-600', border: 'border-gray-700' },
	},
	concluido: {
		light:  { bg: 'bg-gray-500', border: 'border-gray-600' },
		medium: { bg: 'bg-gray-600', border: 'border-gray-700' },
		strong: { bg: 'bg-gray-600', border: 'border-gray-700' },
		dark:   { bg: 'bg-gray-700', border: 'border-gray-800' },
	},
};

// Paleta combinada (posts + tarefas) para uso em taskActionFlow.ts.
// Inclui aliases para IDs canônicos do seed (todo/in_progress/done) para garantir
// que tasks com esses IDs recebam as cores pastéis corretas sem cair no fallback cinza.
export const ALL_SUBSTATUS_DOTS: Record<string, Record<'light' | 'medium' | 'strong' | 'dark', DotColorClasses>> = {
	...POST_SUBSTATUS_DOTS,
	...TASK_SUBSTATUS_DOTS,
	// Aliases canônicos → mesmos dots pastéis
	todo:        TASK_SUBSTATUS_DOTS.a_fazer,
	in_progress: TASK_SUBSTATUS_DOTS.em_andamento,
	done:        TASK_SUBSTATUS_DOTS.concluido,
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPE IDENTIFIER COLORS  (tag de tipo e borda lateral na Agenda)
// ─────────────────────────────────────────────────────────────────────────────
export const TYPE_BADGE = {
	post: { bg: 'bg-indigo-600', border: 'border-indigo-600' },  // tag POST + borda Agenda
	task: { bg: 'bg-gray-500', border: 'border-gray-500' },
} as const;

/** Tag de substatus na Agenda (posts em fundo colorido). */
export const AGENDA_SUBSTATUS_PILL_CLASS = 'bg-white/25 text-white border border-white/30';

/** Pill de substatus para tarefas na Agenda com fundo = cor do status (cinzas claros/médios). */
export const AGENDA_TASK_SUBSTATUS_PILL_ON_STATUS_BG =
	'bg-white/55 text-gray-800 border border-gray-400/65 dark:bg-white/20 dark:text-gray-100 dark:border-gray-500/55';
