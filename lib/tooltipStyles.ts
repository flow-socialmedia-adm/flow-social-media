/**
 * Padrão visual de hints flutuantes (estilo “caixa clara” com borda índigo).
 *
 * **Layout:** `TooltipHint` renderiza o balão em `document.body` com `position: fixed`, para não
 * entrar na caixa de rolagem de cards/colunas com `overflow` e não empurrar layout horizontal.
 * A lógica de âncora/listeners está em `useTooltipAnchor` (reutilizável sem mudar o visual).
 */
export const TOOLTIP_SURFACE_CLASS =
    'rounded-lg border border-indigo-200/90 bg-white px-2.5 py-1.5 text-left text-[10px] font-medium leading-snug text-indigo-700 shadow-sm dark:border-indigo-600 dark:bg-gray-800 dark:text-indigo-200';

/** Equivalente a `ml-1.5` + `mt-0.5` em relação ao canto inferior-direito da âncora (viewport). */
export const TOOLTIP_ANCHOR_OFFSET_X_PX = 6;
export const TOOLTIP_ANCHOR_OFFSET_Y_PX = 2;

/** @deprecated Preferir `TooltipHint` (portal). Mantido só se algum layout precisar do modo absoluto legado. */
export const TOOLTIP_POSITION_BELOW_RIGHT_CLASS = 'left-full top-full ml-1.5 mt-0.5';

/** @deprecated Preferir `TooltipHint` (portal). */
export const TOOLTIP_FLOAT_LAYER_CLASS =
    'pointer-events-none absolute z-[60] w-max max-w-[14rem] opacity-0 transition-opacity duration-150';

/** Classes do balão em portal (`top`/`left`/`zIndex` via style em `TooltipHint`). */
export const TOOLTIP_PORTAL_BOX_CLASS =
    'pointer-events-none fixed w-max max-w-[14rem] transition-opacity duration-150';
