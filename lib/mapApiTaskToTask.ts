import type { Task } from '../types';
import { normalizeDateOnly } from './dateOnly';

function normalizeDate(v: unknown): string | undefined {
	return normalizeDateOnly(v);
}

function normalizeIso(v: unknown): string | undefined {
	if (v == null) return undefined;
	if (typeof v === 'string') return v;
	if (typeof v === 'object' && v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString();
	return undefined;
}

function extractClientId(it: Record<string, unknown>): string | undefined {
	const raw = it.clientId ?? it.client_id;
	if (raw == null || raw === '') return undefined;
	if (typeof raw === 'object' && raw !== null && 'id' in (raw as object)) {
		const id = (raw as { id: unknown }).id;
		return id != null && String(id).trim() !== '' ? String(id) : undefined;
	}
	const s = String(raw).trim();
	return s || undefined;
}

/** Mapeia linha da API `/tasks` para `Task` do app (incl. previsão, origem e subetapa). */
export function mapApiTaskToTask(it: Record<string, unknown>, todayStr: string): Task {
	const pub = normalizeDate(it.publishDate);
	const due = normalizeDate(it.dueDate);
	const d = normalizeDate(it.date);
	const dateStr = pub ?? due ?? d ?? todayStr;
	const category = (it.category as string) || undefined;
	const isForecast = category === 'forecast';
	return {
		id: String(it.id ?? ''),
		date: dateStr,
		title: (it.title as string) || '',
		statusId: (it.statusId as string) || '',
		workflowId: (it.workflowId as string) || undefined,
		isGeneral: isForecast ? false : !it.postType,
		clientId: extractClientId(it),
		postType: (it.postType as Task['postType']) || undefined,
		description: (it.description as string) || undefined,
		category,
		ownerUserId: (it.ownerUserId as string) || undefined,
		publishDate: pub ?? undefined,
		dueDate: due ?? undefined,
		isProvisionalPublishDate: (it.isProvisionalPublishDate as boolean) ?? false,
		isProvisionalDueDate: (it.isProvisionalDueDate as boolean) ?? false,
		origin: (it.origin as string) || undefined,
		bornAsForecast: it.bornAsForecast === true ? true : it.bornAsForecast === false ? false : undefined,
		convertedToPostAt: normalizeIso(it.convertedToPostAt),
		currentActionId: (it.currentActionId as string) || undefined,
		createdByUserId: (it.createdByUserId as string) || undefined,
		executionOwnerUserId: (it.executionOwnerUserId as string) || undefined,
	};
}
