import type { IntelligenceItem } from './intelligentCentral';

/** Insights puramente informativos — sem CTA na Central do planejamento. */
const INFORMATIONAL_IDS = new Set(['month-five-weeks', 'month-six-weeks']);

type AgencyAggregateRule = {
	prefix: string;
	id: string;
	messageKey: string;
	severity: IntelligenceItem['severity'];
};

const AGENCY_AGGREGATE_RULES: AgencyAggregateRule[] = [
	{ prefix: 'no-frequency-', id: 'agency-no-frequency', messageKey: 'intel_planning_agency_no_frequency', severity: 'warning' },
	{ prefix: 'empty-week-', id: 'agency-empty-week', messageKey: 'intel_planning_agency_empty_week', severity: 'warning' },
	{ prefix: 'below-frequency-', id: 'agency-below-frequency', messageKey: 'intel_planning_agency_below_frequency', severity: 'warning' },
	{ prefix: 'excess-day-', id: 'agency-excess-day', messageKey: 'intel_planning_agency_excess_day', severity: 'warning' },
	{ prefix: 'concentration-', id: 'agency-concentration', messageKey: 'intel_planning_agency_concentration', severity: 'warning' },
];

function stripNonActionableLabels(items: IntelligenceItem[]): IntelligenceItem[] {
	return items.map((item) => {
		if (INFORMATIONAL_IDS.has(item.id)) {
			const { actionLabelKey: _removed, ...rest } = item;
			return rest;
		}
		return item;
	});
}

function aggregateAgencyInsights(clientItems: IntelligenceItem[]): IntelligenceItem[] {
	const agencyBase = clientItems.filter((i) => i.clientName === '__agency__');
	const perClient = clientItems.filter((i) => i.clientName !== '__agency__');
	const aggregated: IntelligenceItem[] = [...stripNonActionableLabels(agencyBase)];

	for (const rule of AGENCY_AGGREGATE_RULES) {
		const matches = perClient.filter((i) => i.id.startsWith(rule.prefix));
		if (matches.length === 0) continue;
		aggregated.push({
			id: rule.id,
			clientName: '__agency__',
			messageKey: rule.messageKey,
			messageParams: { count: matches.length },
			severity: rule.severity,
		});
	}

	return aggregated.slice(0, 12);
}

/** Escopo da Central no Calendário Editorial — sem alterar o builder. */
export function scopePlanningCentralItems(
	items: IntelligenceItem[],
	clientFilter: string,
): IntelligenceItem[] {
	const stripped = stripNonActionableLabels(items);

	if (clientFilter === 'all') {
		return aggregateAgencyInsights(stripped);
	}

	return stripped
		.filter(
			(item) =>
				item.clientId === clientFilter ||
				item.id === `no-frequency-${clientFilter}` ||
				item.id === `empty-week-${clientFilter}` ||
				item.id === `below-frequency-${clientFilter}` ||
				item.id === `excess-day-${clientFilter}` ||
				item.id === `concentration-${clientFilter}`,
		)
		.map((item) => {
			if (INFORMATIONAL_IDS.has(item.id)) {
				const { actionLabelKey: _removed, ...rest } = item;
				return rest;
			}
			return item;
		});
}

/** Formata intervalo dd/mm/yyyy — dd/mm/yyyy para exibição no subtoolbar. */
export function formatPlanningPeriodRange(startYmd: string, endYmd: string): string {
	const fmt = (ymd: string) => {
		const [y, m, d] = ymd.split('-');
		return `${d}/${m}/${y}`;
	};
	return `${fmt(startYmd)} até ${fmt(endYmd)}`;
}
