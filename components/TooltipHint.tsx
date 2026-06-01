import React from 'react';
import { createPortal } from 'react-dom';
import { TOOLTIP_SURFACE_CLASS, TOOLTIP_PORTAL_BOX_CLASS } from '../lib/tooltipStyles';
import { useTooltipAnchor } from '../lib/useTooltipAnchor';

export type TooltipHintProps = {
    /** Texto exibido no balão ao passar o mouse sobre o gatilho ou seus filhos. */
    label: string;
    children: React.ReactNode;
    /** Classes extras no wrapper (`relative inline-flex`). */
    className?: string;
    /**
     * z-index do balão no `document.body`. Use valor acima de `10000` quando o gatilho estiver
     * dentro de menu flutuante (ex.: setas voltar/avançar do painel de status).
     */
    portalZIndex?: number;
};

/**
 * Hint flutuante: visual padrão do sistema + posição à direita e levemente abaixo da âncora.
 * O balão é renderizado em portal (`body` + `fixed`) para não ser cortado por `overflow` dos cards
 * nem gerar barra de rolagem horizontal. Lógica de âncora em `useTooltipAnchor`.
 */
const TooltipHint: React.FC<TooltipHintProps> = ({
    label,
    children,
    className = '',
    portalZIndex = 9999,
}) => {
    const { wrapRef, tipRef, open, coords, wrapProps } = useTooltipAnchor(label);

    const portal =
        open &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
            <div
                ref={tipRef}
                role="tooltip"
                style={{ left: coords.left, top: coords.top, zIndex: portalZIndex }}
                className={`${TOOLTIP_PORTAL_BOX_CLASS} ${TOOLTIP_SURFACE_CLASS} opacity-100`}
            >
                {label}
            </div>,
            document.body,
        );

    return (
        <>
            <span
                ref={wrapRef}
                className={`relative inline-flex items-center ${className}`.trim()}
                {...wrapProps}
            >
                {children}
            </span>
            {portal}
        </>
    );
};

export default TooltipHint;
