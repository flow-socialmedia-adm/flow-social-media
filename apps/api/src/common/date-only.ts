/** Campos date-only (YYYY-MM-DD) — meio-dia UTC evita deslocamento ±1 dia. */

export function parseDateOnly(str: string): Date {
	return new Date(`${str.slice(0, 10)}T12:00:00.000Z`);
}

export function formatDateOnly(d: Date | null | undefined): string | null {
	if (!d) return null;
	const y = d.getUTCFullYear();
	const m = String(d.getUTCMonth() + 1).padStart(2, '0');
	const day = String(d.getUTCDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

export function dateOnlyRangeFilter(startDate?: string, endDate?: string) {
	if (!startDate && !endDate) return undefined;
	return {
		gte: startDate ? parseDateOnly(startDate) : undefined,
		lte: endDate ? new Date(`${endDate.slice(0, 10)}T23:59:59.999Z`) : undefined,
	};
}
