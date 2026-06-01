import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { subscribeAncestorScrollContainers } from './scrollAncestors';
import { useViewportOverflow } from './useViewportOverflow';

/**
 * Largura única dos menus flutuantes dos 3 pontinhos (Posts, Tarefas, Agenda equivalente).
 * Pinch zoom escala este valor em coordenadas de layout dentro de `place()`.
 */
export const OVERFLOW_ANCHORED_MENU_WIDTH_PX = 300;

const GAP_PX = 6;
const EDGE_MARGIN_PX = 8;

export type OverflowAnchoredMenuBox = { top: number; left: number; width: number };

/**
 * Motor compartilhado: posição abaixo da âncora, centralização horizontal, visualViewport,
 * listeners em todos os ancestrais com scroll, useViewportOverflow (folga inferior + cadeia).
 *
 * O consumidor mantém `open` / `setOpen`; fornece `anchorRef` no botão e `menuRef` no painel portal.
 */
export type OverflowAnchoredMenuOptions = {
	/** Largura do painel portalado (padrão: OVERFLOW_ANCHORED_MENU_WIDTH_PX). */
	widthPx?: number;
};

export function useOverflowAnchoredMenu(
	open: boolean,
	setOpen: Dispatch<SetStateAction<boolean>>,
	options?: OverflowAnchoredMenuOptions,
): {
	anchorRef: RefObject<HTMLButtonElement | null>;
	menuRef: RefObject<HTMLDivElement | null>;
	menuBox: OverflowAnchoredMenuBox | null;
} {
	const anchorRef = useRef<HTMLButtonElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const [menuBox, setMenuBox] = useState<OverflowAnchoredMenuBox | null>(null);

	useLayoutEffect(() => {
		if (!open) {
			setMenuBox(null);
			return;
		}

		const place = () => {
			const el = anchorRef.current;
			if (!el) return;
			const rect = el.getBoundingClientRect();

			const vv = window.visualViewport;
			const vvWidth = vv?.width ?? window.innerWidth;
			const scale = vv?.scale ?? 1;

			const baseWidth = options?.widthPx ?? OVERFLOW_ANCHORED_MENU_WIDTH_PX;
			const menuWidth = scale === 1 ? baseWidth : Math.round(baseWidth * scale);

			const anchorCenter = rect.left + rect.width / 2;
			const idealLeft = anchorCenter - menuWidth / 2;
			const clampedLeft = Math.min(Math.max(EDGE_MARGIN_PX, idealLeft), vvWidth - menuWidth - EDGE_MARGIN_PX);

			const vvPageTop = vv?.pageTop ?? 0;
			const vvPageLeft = vv?.pageLeft ?? 0;
			const top = scale === 1 ? rect.bottom + GAP_PX : rect.bottom / scale + vvPageTop + GAP_PX / scale;
			const left = scale === 1 ? clampedLeft : clampedLeft / scale + vvPageLeft;

			setMenuBox({ top: Math.round(top), left: Math.round(left), width: menuWidth });
		};

		place();
		const unsubScrollAncestors = subscribeAncestorScrollContainers(anchorRef.current, place);
		window.addEventListener('resize', place);
		window.addEventListener('scroll', place, true);
		window.visualViewport?.addEventListener('resize', place);
		window.visualViewport?.addEventListener('scroll', place);

		return () => {
			unsubScrollAncestors();
			window.removeEventListener('resize', place);
			window.removeEventListener('scroll', place, true);
			window.visualViewport?.removeEventListener('resize', place);
			window.visualViewport?.removeEventListener('scroll', place);
		};
	}, [open, options?.widthPx]);

	useViewportOverflow(open, menuRef, anchorRef);

	useEffect(() => {
		if (!open) return;
		const handleClickOutside = (e: MouseEvent) => {
			const t = e.target as Node;
			if (anchorRef.current?.contains(t)) return;
			if (menuRef.current?.contains(t)) return;
			setOpen(false);
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [open, setOpen]);

	return { anchorRef, menuRef, menuBox };
}
