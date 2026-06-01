import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { FocusEvent, RefObject } from 'react';
import { TOOLTIP_ANCHOR_OFFSET_X_PX, TOOLTIP_ANCHOR_OFFSET_Y_PX } from './tooltipStyles';
import { subscribeAncestorScrollContainers } from './scrollAncestors';

const VIEW_MARGIN_PX = 8;
const ESTIMATED_MAX_WIDTH_PX = 224; /* max-w-[14rem] */
const ESTIMATED_HEIGHT_PX = 40;

function sameCoords(
    a: { left: number; top: number } | null,
    b: { left: number; top: number },
): boolean {
    return !!a && Math.round(a.left) === Math.round(b.left) && Math.round(a.top) === Math.round(b.top);
}

export type TooltipAnchorWrapProps = {
    onPointerEnter: () => void;
    onPointerLeave: () => void;
    onFocusCapture: (e: FocusEvent<HTMLSpanElement>) => void;
    onBlurCapture: (e: FocusEvent<HTMLSpanElement>) => void;
};

export type UseTooltipAnchorResult = {
    wrapRef: RefObject<HTMLSpanElement | null>;
    tipRef: RefObject<HTMLDivElement | null>;
    open: boolean;
    coords: { left: number; top: number } | null;
    wrapProps: TooltipAnchorWrapProps;
};

/**
 * Posicionamento do hint em portal + listeners de scroll/viewport.
 * Evita `setCoords` quando o resultado é idêntico (menos renders em scroll longo).
 * Engajamento = hover no wrapper OU foco em descendente (teclado / leitor de tela).
 */
export function useTooltipAnchor(dependencyKey: string): UseTooltipAnchorResult {
    const wrapRef = useRef<HTMLSpanElement>(null);
    const tipRef = useRef<HTMLDivElement>(null);
    const hoverInsideRef = useRef(false);
    const focusInsideRef = useRef(false);

    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState<{ left: number; top: number } | null>(null);

    const applyEngagement = useCallback(() => {
        const engaged = hoverInsideRef.current || focusInsideRef.current;
        setOpen(engaged);
        if (!engaged) return;

        const anchor = wrapRef.current;
        if (!anchor) return;

        const rect = anchor.getBoundingClientRect();
        const next = {
            left: rect.right + TOOLTIP_ANCHOR_OFFSET_X_PX,
            top: rect.bottom + TOOLTIP_ANCHOR_OFFSET_Y_PX,
        };
        setCoords((prev) => (sameCoords(prev, next) ? prev : next));
    }, []);

    const computePosition = useCallback(() => {
        const anchor = wrapRef.current;
        if (!anchor) return;

        const rect = anchor.getBoundingClientRect();
        let left = rect.right + TOOLTIP_ANCHOR_OFFSET_X_PX;
        let top = rect.bottom + TOOLTIP_ANCHOR_OFFSET_Y_PX;

        const tip = tipRef.current;
        const tw = tip?.offsetWidth ?? ESTIMATED_MAX_WIDTH_PX;
        const th = tip?.offsetHeight ?? ESTIMATED_HEIGHT_PX;

        const vv = window.visualViewport;
        const vw = vv?.width ?? window.innerWidth;
        const vh = vv?.height ?? window.innerHeight;

        if (left + tw > vw - VIEW_MARGIN_PX) {
            left = Math.max(VIEW_MARGIN_PX, vw - tw - VIEW_MARGIN_PX);
        }
        if (left < VIEW_MARGIN_PX) left = VIEW_MARGIN_PX;

        if (top + th > vh - VIEW_MARGIN_PX) {
            const above = rect.top - th - TOOLTIP_ANCHOR_OFFSET_Y_PX;
            top = above >= VIEW_MARGIN_PX ? above : Math.max(VIEW_MARGIN_PX, vh - th - VIEW_MARGIN_PX);
        }
        if (top < VIEW_MARGIN_PX) top = VIEW_MARGIN_PX;

        setCoords((prev) => {
            const next = { left, top };
            return sameCoords(prev, next) ? prev : next;
        });
    }, []);

    useLayoutEffect(() => {
        if (!open) {
            setCoords(null);
            return;
        }

        computePosition();
        const anchor = wrapRef.current;
        if (!anchor) return;

        const unsubAncestors = subscribeAncestorScrollContainers(anchor, computePosition);
        window.addEventListener('resize', computePosition);
        window.addEventListener('scroll', computePosition, true);
        window.visualViewport?.addEventListener('resize', computePosition);
        window.visualViewport?.addEventListener('scroll', computePosition);
        const raf = requestAnimationFrame(computePosition);

        return () => {
            cancelAnimationFrame(raf);
            unsubAncestors();
            window.removeEventListener('resize', computePosition);
            window.removeEventListener('scroll', computePosition, true);
            window.visualViewport?.removeEventListener('resize', computePosition);
            window.visualViewport?.removeEventListener('scroll', computePosition);
        };
    }, [open, computePosition, dependencyKey]);

    const onPointerEnter = useCallback(() => {
        hoverInsideRef.current = true;
        applyEngagement();
    }, [applyEngagement]);

    const onPointerLeave = useCallback(() => {
        hoverInsideRef.current = false;
        applyEngagement();
    }, [applyEngagement]);

    const onFocusCapture = useCallback(
        (e: FocusEvent<HTMLSpanElement>) => {
            if (!wrapRef.current?.contains(e.target as Node)) return;
            focusInsideRef.current = true;
            applyEngagement();
        },
        [applyEngagement],
    );

    const onBlurCapture = useCallback(
        (e: FocusEvent<HTMLSpanElement>) => {
            const next = e.relatedTarget as Node | null;
            if (next && wrapRef.current?.contains(next)) return;
            focusInsideRef.current = false;
            applyEngagement();
        },
        [applyEngagement],
    );

    return {
        wrapRef,
        tipRef,
        open,
        coords,
        wrapProps: {
            onPointerEnter,
            onPointerLeave,
            onFocusCapture,
            onBlurCapture,
        },
    };
}
