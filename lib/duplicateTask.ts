import type { Task } from '../types';
import { formatDateToYYYYMMDD } from './utils';

/** Título do clone: `Original (2)`, `Original (3)`, … */
export function buildDuplicatedTaskTitle(sourceTitle: string): string {
    const base = (sourceTitle || '').trim() || 'Sem título';
    const match = base.match(/^(.+?) \((\d+)\)$/);
    if (match) {
        const next = Math.max(2, parseInt(match[2], 10) + 1);
        return `${match[1].trim()} (${next})`;
    }
    return `${base} (2)`;
}

export type BuildTaskDuplicatePayloadOptions = {
    origin: string;
    /** Incluir ownerUserId no payload (modo TEAM). */
    includeOwnerUserId?: boolean;
};

/**
 * Payload para POST /tasks — mesmos dados operacionais, sem id/histórico.
 * Usado pela Agenda (e reutilizável em outras páginas).
 */
export function buildTaskDuplicatePayload(
    source: Task,
    options: BuildTaskDuplicatePayloadOptions,
): Record<string, unknown> {
    const dateStr =
        source.publishDate ??
        source.dueDate ??
        source.date ??
        formatDateToYYYYMMDD(new Date());
    const isForecast = source.category === 'forecast';
    const isGeneral = source.isGeneral && !isForecast;

    const payload: Record<string, unknown> = {
        title: buildDuplicatedTaskTitle(source.title),
        date: dateStr,
        workflowId: source.workflowId,
        statusId: source.statusId,
        clientId: source.clientId ?? null,
        postType: isGeneral ? null : source.postType ?? null,
        description: source.description ?? null,
        category: source.category ?? null,
        origin: options.origin,
        bornAsForecast: source.bornAsForecast ?? isForecast,
        currentActionId: source.currentActionId ?? null,
    };

    if (!isGeneral) {
        payload.publishDate = source.publishDate ?? source.date ?? dateStr;
        payload.isProvisionalPublishDate = source.isProvisionalPublishDate ?? false;
    } else {
        payload.dueDate = source.dueDate ?? source.date ?? dateStr;
        payload.isProvisionalDueDate = source.isProvisionalDueDate ?? false;
    }

    if (options.includeOwnerUserId && source.ownerUserId) {
        payload.ownerUserId = source.ownerUserId;
    }

    return payload;
}
