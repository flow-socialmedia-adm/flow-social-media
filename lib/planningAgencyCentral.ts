import type { Client } from '../types';
import type { IntelligenceItem } from './intelligentCentral';
import { clientHasStructuredFrequency } from './clientContext';
import { getBriefingBlockProgress } from './clientBriefingProgress';

export type AgencyPlanningLists = {
	ready: Client[];
	review: Client[];
	globalAlerts: IntelligenceItem[];
};

/** Clientes prontos vs. revisão + alertas globais da agência (sempre visíveis). */
export function computeAgencyPlanningLists(
	clients: Client[],
	intelligenceItems: IntelligenceItem[],
): AgencyPlanningLists {
	const reviewIds = new Set<string>();
	for (const item of intelligenceItems) {
		if (item.clientName === '__agency__') continue;
		if (item.clientId) reviewIds.add(item.clientId);
		if (item.severity === 'warning' || item.severity === 'alert') {
			const idFromKey = item.id.split('-').pop();
			if (idFromKey && clients.some((c) => c.id === idFromKey)) reviewIds.add(idFromKey);
		}
	}

	for (const c of clients) {
		const planning = getBriefingBlockProgress(c, 'planning');
		const hasFreq = clientHasStructuredFrequency(c) || c.postFrequencyVariable;
		if (!hasFreq || planning.filled < Math.ceil(planning.total * 0.4)) {
			reviewIds.add(c.id);
		}
	}

	const review = clients.filter((c) => reviewIds.has(c.id));
	const reviewSet = new Set(review.map((c) => c.id));
	const ready = clients.filter((c) => !reviewSet.has(c.id));

	const globalAlerts = intelligenceItems.filter((item) => item.clientName === '__agency__');

	return { ready, review, globalAlerts };
}
