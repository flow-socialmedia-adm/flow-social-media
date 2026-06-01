/**
 * Mesma regra de categoria usada no frontend (`convertBackendStatusToFrontend`).
 * Mapeia statusId → buckets do dashboard (todo / doing / done).
 */
export type DashboardTaskBucket = 'todo' | 'doing' | 'done';

export function statusIdToDashboardBucket(statusId: string): DashboardTaskBucket {
	const id = statusId.toLowerCase();
	if (id.includes('producao') || id.includes('andamento')) return 'doing';
	if (
		id.includes('aprovado') ||
		id.includes('agendado') ||
		id.includes('publicado') ||
		id.includes('concluido')
	) {
		return 'done';
	}
	return 'todo';
}
