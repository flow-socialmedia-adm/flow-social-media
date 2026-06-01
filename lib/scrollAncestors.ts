/**
 * Utilitários para scroll aninhado (ex.: coluna Kanban com overflow-y-auto dentro do main).
 * Eventos `scroll` não propagam — é preciso ouvir cada container e, ao compensar overflow,
 * distribuir o delta do container mais interno para o externo.
 */

/**
 * Lista ancestrais com possível scroll vertical, do mais interno ao mais externo
 * (primeiro elemento = pai direto que pode rolar, … até o documento).
 */
export function getVerticalScrollChainFromNode(start: HTMLElement | null): HTMLElement[] {
	const chain: HTMLElement[] = [];
	let el: HTMLElement | null = start?.parentElement ?? null;
	while (el) {
		const { overflowY } = getComputedStyle(el);
		if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
			chain.push(el);
		}
		el = el.parentElement;
	}
	return chain;
}

/**
 * Registra `handler` em todo ancestral com overflow-y rolável até o body.
 * Usado para `place()` em menus fixed alinhados à âncora.
 */
export function subscribeAncestorScrollContainers(
	start: HTMLElement | null,
	handler: () => void,
): () => void {
	if (!start || typeof document === 'undefined') return () => {};
	const cleanups: (() => void)[] = [];
	let el: HTMLElement | null = start.parentElement;
	while (el) {
		const { overflowY, overflowX } = getComputedStyle(el);
		const yScroll = overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';
		const xScroll = overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'overlay';
		if (yScroll || xScroll) {
			el.addEventListener('scroll', handler, { passive: true });
			const node = el;
			cleanups.push(() => node.removeEventListener('scroll', handler));
		}
		el = el.parentElement;
	}
	return () => {
		for (const u of cleanups) u();
	};
}

export type MainPaddingTracker = (pixelsAddedToMain: number) => void;

/**
 * Aplica até `delta` pixels de scroll “para baixo” na cadeia (âncora sobe na viewport),
 * começando pelos scrollers internos. O que faltar vira padding-bottom no `mainEl` + scroll do main.
 */
export function applyScrollRevealDelta(
	anchor: HTMLElement,
	delta: number,
	mainEl: HTMLElement | null,
	onMainPadding: MainPaddingTracker,
): void {
	let left = Math.max(0, delta);
	if (left <= 0) return;

	const chain = getVerticalScrollChainFromNode(anchor);
	for (const sc of chain) {
		if (left <= 0) break;
		const maxScroll = sc.scrollHeight - sc.clientHeight;
		const room = Math.max(0, maxScroll - sc.scrollTop);
		const step = Math.min(left, room);
		if (step > 0) {
			sc.scrollTop += step;
			left -= step;
		}
	}

	if (left > 0 && mainEl) {
		const cur = parseFloat(mainEl.style.paddingBottom || '0');
		mainEl.style.paddingBottom = `${cur + left}px`;
		onMainPadding(left);
		void mainEl.offsetHeight;
		const maxScroll = mainEl.scrollHeight - mainEl.clientHeight;
		const room = Math.max(0, maxScroll - mainEl.scrollTop);
		const step = Math.min(left, room);
		if (step > 0) {
			mainEl.scrollTop += step;
		}
	}
}
