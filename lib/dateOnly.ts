/** Utilitários para campos date-only (YYYY-MM-DD) sem deslocamento de fuso. */

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})/;

/** Converte string date-only em Date UTC meio-dia (persistência estável). */
export function parseDateOnlyUtc(str: string): Date {
	const s = str.slice(0, 10);
	return new Date(`${s}T12:00:00.000Z`);
}

/** Formata Date para YYYY-MM-DD usando componentes UTC. */
export function formatDateOnlyUtc(d: Date): string {
	const y = d.getUTCFullYear();
	const m = String(d.getUTCMonth() + 1).padStart(2, '0');
	const day = String(d.getUTCDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

/** Normaliza valor da API para YYYY-MM-DD. */
export function normalizeDateOnly(v: unknown): string | undefined {
	if (v == null) return undefined;
	if (typeof v === 'string') {
		const m = DATE_ONLY_RE.exec(v);
		return m ? `${m[1]}-${m[2]}-${m[3]}` : undefined;
	}
	if (typeof v === 'object' && v instanceof Date && !Number.isNaN(v.getTime())) {
		return formatDateOnlyUtc(v);
	}
	return undefined;
}

/** Hoje como YYYY-MM-DD no fuso local do navegador. */
export function todayDateOnlyLocal(): string {
	const d = new Date();
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}
