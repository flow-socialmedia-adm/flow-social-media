import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { applyScrollRevealDelta } from './scrollAncestors';

/**
 * Selector do container principal de scroll da aplicação.
 * Corresponde ao <main className="app-main-scroll ..."> em App.tsx.
 */
export const APP_MAIN_SCROLL_SELECTOR = '.app-main-scroll';

const SAFETY_SPACE = 64;

/**
 * Respiro visual obrigatório abaixo do menu (além de `margin` + SAFETY_SPACE).
 * Sem isso, em zoom 100% o cálculo “encaixa” no limite e o menu fica colado na borda
 * da janela; com zoom maior o viewport menor força mais scroll e parece haver folga.
 */
const EXTRA_COMFORT_GAP = 48;

/**
 * Hook reutilizável que compensa overflow de viewport para elementos flutuantes.
 *
 * Distribui scroll pelos ancestrais com overflow-y (ex.: coluna Kanban) e só então
 * padding + scroll no main. Vários pares de RAF permitem que `place()` atualize o menu
 * fixed entre tentativas (zoom 100% vs maior).
 */
export function useViewportOverflow(
	isOpen: boolean,
	floatRef: RefObject<HTMLDivElement | null>,
	anchorRef: RefObject<HTMLDivElement | null>,
	margin = 12,
): void {
	const addedPaddingRef = useRef(0);
	const rafIdsRef = useRef<number[]>([]);

	useEffect(() => {
		const cancelScheduled = () => {
			for (const id of rafIdsRef.current) {
				cancelAnimationFrame(id);
			}
			rafIdsRef.current = [];
		};

		if (!isOpen) {
			cancelScheduled();
			if (addedPaddingRef.current > 0) {
				const container = document.querySelector<HTMLElement>(APP_MAIN_SCROLL_SELECTOR);
				if (container) {
					const current = parseFloat(container.style.paddingBottom || '0');
					const next = Math.max(0, current - addedPaddingRef.current);
					if (next === 0) {
						container.style.removeProperty('padding-bottom');
					} else {
						container.style.paddingBottom = `${next}px`;
					}
				}
				addedPaddingRef.current = 0;
			}
			return;
		}

		cancelScheduled();

		const tryReveal = () => {
			const float = floatRef.current;
			const anchor = anchorRef.current;
			if (!float || !anchor) return;

			const vvHeight = window.visualViewport?.height ?? window.innerHeight;
			const menuBottom = float.getBoundingClientRect().bottom;
			const allowedBottom = vvHeight - margin - SAFETY_SPACE - EXTRA_COMFORT_GAP;
			const overflow = menuBottom - allowedBottom;
			if (overflow <= 0) return;

			const delta = Math.ceil(overflow);
			const main = document.querySelector<HTMLElement>(APP_MAIN_SCROLL_SELECTOR);
			applyScrollRevealDelta(anchor, delta, main, (px) => {
				addedPaddingRef.current += px;
			});
		};

		// Três pares RAF + tryReveal: place() precisa de frames extras no zoom 100%.
		const s1 = requestAnimationFrame(() => {
			const s2 = requestAnimationFrame(() => {
				tryReveal();
				const s3 = requestAnimationFrame(() => {
					const s4 = requestAnimationFrame(() => {
						tryReveal();
						const s5 = requestAnimationFrame(() => {
							const s6 = requestAnimationFrame(() => {
								tryReveal();
							});
							rafIdsRef.current.push(s6);
						});
						rafIdsRef.current.push(s5);
					});
					rafIdsRef.current.push(s4);
				});
				rafIdsRef.current.push(s3);
			});
			rafIdsRef.current.push(s2);
		});
		rafIdsRef.current.push(s1);

		return () => {
			cancelScheduled();
		};
	}, [isOpen, floatRef, anchorRef, margin]);
}
