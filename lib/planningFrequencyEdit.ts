import type { BriefingV2 } from './briefingV2/types';

/** Mantém apenas dígitos (máx. 2 — quantidade até 99). */
export function sanitizeFrequencyQtyInput(raw: string): string {
	return raw.replace(/\D/g, '').slice(0, 2);
}

/** Parse do rascunho; null = vazio ou inválido (não salvar). */
export function parseFrequencyQtyDraft(draft: string): number | null {
	const trimmed = draft.trim();
	if (!trimmed) return null;
	const n = parseInt(trimmed, 10);
	if (Number.isNaN(n) || n < 1) return null;
	return Math.min(99, n);
}

/** Mesma estrutura usada em Cliente > Operação dos Posts (PlanningSectionEditor). */
export function buildPlanningFrequencyUpdater(
	quantity: number,
	period: 'week' | 'month',
): (b: BriefingV2) => BriefingV2 {
	return (b) => ({
		...b,
		planning: {
			...b.planning,
			frequency: { quantity, period, variable: false },
		},
	});
}
