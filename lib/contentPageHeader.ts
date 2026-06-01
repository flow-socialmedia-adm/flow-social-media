/**
 * Padding vertical oficial da faixa roxa — **referência da página Tarefas** (não alterar sem validar lá).
 * - Mobile: `py-6` (1,5rem topo + 1,5rem base)
 * - sm+: `py-[1.6875rem]` topo e base (≈ +50% sobre 1,125rem)
 *
 * **Distância oficial da borda inferior da faixa até a linha de base do título/controles** =
 * o `padding-bottom` implícito nesse `py` (1,5rem mobile; 1,6875rem a partir de `sm`), com a linha interna em
 * `sm:items-end` e o bloco da direita em `CONTENT_PAGE_HEADER_ACTIONS_ROW` (inclui `mt-1`).
 */
export const CONTENT_PAGE_HEADER_PAD_Y_TASKS_REFERENCE = 'py-6 sm:py-[1.6875rem]';

/** Degradê + sombra da faixa roxa, sem padding horizontal (o recuo lateral fica em CONTENT_PAGE_LAYOUT_LANE). */
export const CONTENT_PAGE_HEADER_GRADIENT_BAR_ONLY =
    'w-full shrink-0 border-b border-white/10 bg-gradient-to-r from-indigo-500 to-purple-600 dark:border-white/10 shadow-[0_10px_28px_-10px_rgba(67,56,202,0.38)] dark:shadow-[0_12px_32px_-10px_rgba(0,0,0,0.55)]';

/** Faixa roxa: só degradê + padding vertical (sem px horizontal). */
const CONTENT_PAGE_HEADER_BASE = `${CONTENT_PAGE_HEADER_GRADIENT_BAR_ONLY}`;

/**
 * Coluna única do app: `max-w-[1400px]` centralizada com **padding horizontal dentro** da coluna.
 * Header e corpo usam a mesma string → título da faixa roxa e primeiro conteúdo abaixo ficam no mesmo eixo.
 */
export const CONTENT_PAGE_LAYOUT_LANE =
    'mx-auto box-border w-full min-w-0 max-w-[1400px] px-4 sm:px-6 lg:px-8';

/**
 * Faixa roxa usada **apenas em Tarefas** (e como base da referência): padding vertical + degradê + sombra.
 * Preferir o componente `ContentPageHeader` (usa `CONTENT_PAGE_HEADER_CLASS_STANDARD`).
 */
export const CONTENT_PAGE_HEADER_CLASS = `${CONTENT_PAGE_HEADER_BASE} ${CONTENT_PAGE_HEADER_PAD_Y_TASKS_REFERENCE}`;

/**
 * Faixa padrão com altura fixa — Dashboard, Clientes, Agenda, Financeiro.
 * `box-border` + `h`/`max-h` iguais evitam faixa mais alta quando os controles quebram linha.
 */
export const CONTENT_PAGE_HEADER_CLASS_STANDARD = `${CONTENT_PAGE_HEADER_CLASS} box-border h-[6.75rem] max-h-[6.75rem] sm:h-[7.5rem] sm:max-h-[7.5rem]`;

/** @deprecated Preferir CONTENT_PAGE_HEADER_CLASS_STANDARD */
export const CONTENT_PAGE_HEADER_CLASS_SYNC_TASKS_BAND = CONTENT_PAGE_HEADER_CLASS_STANDARD;

/** @deprecated Todas as páginas usam CONTENT_PAGE_HEADER_CLASS_STANDARD */
export const CONTENT_PAGE_HEADER_CLASS_TOOLBAR = CONTENT_PAGE_HEADER_CLASS_STANDARD;

/** @deprecated Todas as páginas usam CONTENT_PAGE_HEADER_CLASS_STANDARD */
export const CONTENT_PAGE_HEADER_CLASS_DENSE = CONTENT_PAGE_HEADER_CLASS_STANDARD;

/** Rótulo acessível oculto nos filtros da faixa (altura = só o select h-10). */
export const HEADER_FILTER_LABEL_SR_ONLY = 'sr-only';

/** Barra secundária abaixo da faixa (vistas / data) — mesmo eixo horizontal do corpo. */
export const CONTENT_PAGE_SUBTOOLBAR_STRIP =
    'mb-3 flex w-full min-w-0 flex-wrap items-center justify-between gap-2.5 px-0 py-0';

/** Botões de vista / data fora da faixa roxa (estilo neutro). */
export const SUBTOOLBAR_TEXT_BUTTON_CLASS =
    'flex h-10 min-h-[2.5rem] shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700';

export const SUBTOOLBAR_ICON_BUTTON_CLASS =
    'flex h-10 w-10 min-h-[2.5rem] shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-800 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700';

export const SUBTOOLBAR_VIEW_ACTIVE_CLASS =
    'border-indigo-600 bg-indigo-50 text-indigo-800 shadow-sm dark:border-indigo-400 dark:bg-indigo-950/50 dark:text-indigo-100';

export const SUBTOOLBAR_VIEW_INACTIVE_CLASS =
    'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700';

/** @deprecated Use `ContentPageHeader` + `CONTENT_PAGE_HEADER_CLASS_STANDARD`. */
export const CONTENT_PAGE_HEADER_CLASS_ACCOUNT_ALIGNED = CONTENT_PAGE_HEADER_CLASS_STANDARD;

/** Conteúdo da faixa (título + toolbar) — igual à coluna do corpo. */
export const CONTENT_PAGE_HEADER_INNER = CONTENT_PAGE_LAYOUT_LANE;

/** Corpo da página — mesma coluna que o header. */
export const CONTENT_PAGE_BODY_INNER = CONTENT_PAGE_LAYOUT_LANE;

/**
 * @deprecated O padding horizontal do corpo está em CONTENT_PAGE_LAYOUT_LANE. Mantido para migração pontual.
 * Preferir: `CONTENT_PAGE_SCROLL_OUTER` + filho `CONTENT_PAGE_BODY_INNER`.
 */
export const CONTENT_PAGE_BODY_PAD_X = 'px-4 pb-8 sm:px-6 lg:px-8';

/**
 * Área rolável abaixo da faixa: sem padding horizontal (evita “duas caixas” com larguras diferentes).
 * Filho típico: `CONTENT_PAGE_BODY_INNER`.
 */
export const CONTENT_PAGE_SCROLL_OUTER = 'flex min-h-0 w-full min-w-0 flex-1 flex-col pb-8';

/** Padding-top abaixo da faixa (conteúdo / KPI) — ritmo amplo entre header e corpo */
export const CONTENT_BELOW_HEADER_PAD = 'pt-14 sm:pt-16';

/** Linha título + controles — alinhamento pela base (referência Tarefas). */
export const CONTENT_PAGE_HEADER_TOOLBAR_ROW =
    'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between';

/** @deprecated Use `ContentPageHeader` (estrutura interna equivalente). */
export const CONTENT_PAGE_HEADER_INNER_TOOLBAR = `${CONTENT_PAGE_LAYOUT_LANE} ${CONTENT_PAGE_HEADER_TOOLBAR_ROW}`;

/** Busca, filtros, botões à direita: mesma linha de base do `h1` (referência Tarefas). */
export const CONTENT_PAGE_HEADER_ACTIONS_ROW = 'mt-1 flex flex-wrap items-end gap-2';

/** Controles na faixa padrão (uma linha; scroll horizontal se necessário). */
export const CONTENT_PAGE_HEADER_ACTIONS_ROW_NOWRAP =
    'mt-1 flex flex-nowrap items-end gap-2 overflow-x-auto max-w-full [scrollbar-width:thin]';

/** Controles do header em degradê: altura e raio uniformes */
export const HEADER_GRADIENT_SEARCH_CLASS =
    'h-10 min-h-[2.5rem] rounded-lg border-0 bg-white/20 text-white placeholder-white/70 px-3 text-sm min-w-[140px] box-border leading-none focus:outline-none focus:ring-2 focus:ring-white/50';

export const HEADER_GRADIENT_SELECT_CLASS =
    'h-10 min-h-[2.5rem] rounded-lg border border-white/30 bg-white/20 text-white text-sm px-3 min-w-[120px] box-border focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 [&_option]:text-gray-900';

/** @deprecated Na faixa roxa use HEADER_FILTER_LABEL_SR_ONLY — rótulo visível aumenta a altura da barra. */
export const HEADER_GRADIENT_LABEL_CLASS = 'text-xs font-medium text-white/90 mb-1';

export const HEADER_GRADIENT_PLUS_CLASS =
    'h-10 w-10 shrink-0 flex items-center justify-center rounded-lg bg-white/90 backdrop-blur text-indigo-700 hover:bg-white border border-white/50 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-500 group disabled:opacity-50 disabled:cursor-not-allowed';

/** Navegação de mês / setas na faixa (Financeiro, Agenda) */
export const HEADER_GRADIENT_ICON_BUTTON_CLASS =
    'h-10 w-10 flex shrink-0 items-center justify-center rounded-lg border border-white/30 bg-white/20 text-white transition-colors hover:bg-white/30';

export const HEADER_GRADIENT_TODAY_OR_TEXT_BUTTON_CLASS =
    'flex h-10 shrink-0 items-center justify-center rounded-lg border border-white/30 bg-white/20 px-3 text-sm font-medium text-white transition-colors hover:bg-white/30';
