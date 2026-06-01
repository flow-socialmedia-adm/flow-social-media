import { formatDateToYYYYMMDD } from './utils';

export type OperationalMilestoneKind = 'production' | 'approval' | 'scheduling';

export interface ClientOperationalLeadConfig {
	productionDays: number | null;
	approvalDays: number | null;
	schedulingDays: number | null;
	approvalRequired: boolean;
}

export interface OperationalMilestone {
	kind: OperationalMilestoneKind;
	/** YYYY-MM-DD — data sugerida do marco */
	date: string;
	/** YYYY-MM-DD — data de publicação de origem */
	publishDate: string;
}

export interface ClientLeadDaysInput {
	planningProductionLeadDays?: string | null;
	planningApprovalLeadDays?: string | null;
	planningSchedulingLeadDays?: string | null;
	planningApprovalRequired?: boolean | null;
}

export type MilestoneDayCounts = Record<OperationalMilestoneKind, number>;

export function parseLeadDaysValue(value: string | null | undefined): number | null {
	if (value === null || value === undefined || value === '') return null;
	const n = parseInt(String(value), 10);
	if (Number.isNaN(n) || n < 0) return null;
	return n;
}

export function getClientOperationalLeadConfig(client: ClientLeadDaysInput | null | undefined): ClientOperationalLeadConfig {
	return {
		productionDays: parseLeadDaysValue(client?.planningProductionLeadDays),
		approvalDays: parseLeadDaysValue(client?.planningApprovalLeadDays),
		schedulingDays: parseLeadDaysValue(client?.planningSchedulingLeadDays),
		approvalRequired: client?.planningApprovalRequired !== false,
	};
}

export function hasOperationalLeadConfig(config: ClientOperationalLeadConfig): boolean {
	return (
		(config.productionDays != null && config.productionDays > 0) ||
		(config.approvalRequired && config.approvalDays != null && config.approvalDays > 0) ||
		(config.schedulingDays != null && config.schedulingDays > 0)
	);
}

function subtractIsoDays(isoDate: string, days: number): string {
	const d = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
	d.setDate(d.getDate() - days);
	return formatDateToYYYYMMDD(d);
}

export function computeOperationalMilestones(
	publishDate: string,
	config: ClientOperationalLeadConfig,
): OperationalMilestone[] {
	const pub = publishDate.slice(0, 10);
	if (!pub || pub.length < 10) return [];

	const result: OperationalMilestone[] = [];

	if (config.productionDays != null && config.productionDays > 0) {
		result.push({ kind: 'production', date: subtractIsoDays(pub, config.productionDays), publishDate: pub });
	}
	if (config.approvalRequired && config.approvalDays != null && config.approvalDays > 0) {
		result.push({ kind: 'approval', date: subtractIsoDays(pub, config.approvalDays), publishDate: pub });
	}
	if (config.schedulingDays != null && config.schedulingDays > 0) {
		result.push({ kind: 'scheduling', date: subtractIsoDays(pub, config.schedulingDays), publishDate: pub });
	}

	return result.sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));
}

export function getTaskOperationalMilestones(
	task: { publishDate?: string; date?: string; clientId?: string },
	client: ClientLeadDaysInput | null | undefined,
): OperationalMilestone[] {
	const pub = (task.publishDate ?? task.date ?? '').slice(0, 10);
	if (!pub || !task.clientId) return [];
	const config = getClientOperationalLeadConfig(client);
	if (!hasOperationalLeadConfig(config)) return [];
	return computeOperationalMilestones(pub, config);
}

export function emptyMilestoneDayCounts(): MilestoneDayCounts {
	return { production: 0, approval: 0, scheduling: 0 };
}

export function buildMilestoneDayIndex(
	items: Array<{ publishDate?: string; date?: string; clientId?: string }>,
	getClientConfig: (clientId: string) => ClientOperationalLeadConfig,
): Map<string, MilestoneDayCounts> {
	const map = new Map<string, MilestoneDayCounts>();

	for (const item of items) {
		const pub = (item.publishDate ?? item.date ?? '').slice(0, 10);
		if (!pub || !item.clientId) continue;
		const config = getClientConfig(item.clientId);
		if (!hasOperationalLeadConfig(config)) continue;

		for (const milestone of computeOperationalMilestones(pub, config)) {
			const existing = map.get(milestone.date) ?? emptyMilestoneDayCounts();
			existing[milestone.kind] += 1;
			map.set(milestone.date, existing);
		}
	}

	return map;
}

export const MILESTONE_KIND_DOT_CLASS: Record<OperationalMilestoneKind, string> = {
	production: 'bg-amber-500',
	approval: 'bg-orange-500',
	scheduling: 'bg-violet-500',
};

export const MILESTONE_KIND_BADGE_CLASS: Record<OperationalMilestoneKind, string> = {
	production: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
	approval: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
	scheduling: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
};
