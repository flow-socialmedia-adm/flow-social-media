import type { AgencyModuleKey } from './agency-module-keys';

/** Campos mínimos da task para decidir módulo de conteúdo (espelha `mapApiTaskToTask` / backend). */
export type TaskAccessShape = {
	clientId: string | null;
	postType: string | null;
	category: string | null;
	bornAsForecast: boolean | null;
	origin: string | null;
};

export function taskContentModule(row: TaskAccessShape): AgencyModuleKey {
	const isForecast = row.category === 'forecast' || row.bornAsForecast === true;
	if (isForecast) return 'planning';
	const isRealPost = !!row.clientId && !!row.postType;
	if (isRealPost) return 'posts';
	return 'tasks';
}

export function taskRequiresAgendaGate(row: TaskAccessShape): boolean {
	return row.origin === 'agenda';
}

export function taskAccessFromCreatePayload(d: {
	clientId?: string | null;
	postType?: unknown;
	category?: string | null;
	bornAsForecast?: boolean | null;
	origin?: string | null;
}): TaskAccessShape {
	return {
		clientId: d.clientId ?? null,
		postType: d.postType != null && d.postType !== '' ? String(d.postType) : null,
		category: d.category ?? null,
		bornAsForecast: d.bornAsForecast ?? null,
		origin: d.origin ?? null,
	};
}

export function taskAccessFromPrismaRow(row: {
	clientId: string | null;
	postType: string | null;
	category: string | null;
	bornAsForecast: boolean | null;
	origin: string | null;
}): TaskAccessShape {
	return {
		clientId: row.clientId,
		postType: row.postType,
		category: row.category,
		bornAsForecast: row.bornAsForecast,
		origin: row.origin,
	};
}
