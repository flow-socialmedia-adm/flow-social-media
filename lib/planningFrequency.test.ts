import { describe, expect, it } from 'vitest';
import type { Client } from '../types';
import type { BriefingV2 } from './briefingV2/types';
import { normalizeClient } from '../components/clients/clientUtils';
import {
	computeClientMonthlySchedule,
	getMonthlyPlanningGoal,
	logPlanningTagTrace,
	resolvePlanningFrequency,
} from './planningSchedule';
import {
	normalizePlanningPeriod,
	normalizePlanningQuantity,
	resolveFrequencyFromBriefingV2,
} from './planningFrequency';

function minimalBriefing(
	frequency: BriefingV2['planning']['frequency'],
): BriefingV2 {
	return {
		schemaVersion: 2,
		updatedAt: '2025-01-01T00:00:00.000Z',
		strategy: {
			brandWho: '',
			mainServicesTags: [],
			differentiators: '',
			perceivedAs: '',
			marketReferences: [],
		},
		audience: {
			main: '',
			painsTags: [],
			desiresTags: [],
			objectionsTags: [],
			personas: [],
		},
		communication: {
			toneOfVoice: '',
			avoid: '',
			brandWordsTags: [],
			primaryCta: '',
		},
		content: {
			profileObjective: '',
			currentCampaignObjective: '',
			monthFocus: '',
			pillarsTags: [],
			strategyNotes: '',
		},
		planning: {
			frequency,
			preferredPostDays: ['mon'],
			operation: {
				approvalChannel: '',
				clientResponseTime: '',
			},
		},
	};
}

describe('planningFrequency', () => {
	it('normaliza períodos mensais e semanais', () => {
		expect(normalizePlanningPeriod('mensal')).toBe('month');
		expect(normalizePlanningPeriod('por mês')).toBe('month');
		expect(normalizePlanningPeriod('per_month')).toBe('month');
		expect(normalizePlanningPeriod('semanal')).toBe('week');
		expect(normalizePlanningPeriod('por semana')).toBe('week');
		expect(normalizePlanningPeriod('per_week')).toBe('week');
	});

	it('normaliza quantidade string', () => {
		expect(normalizePlanningQuantity('4')).toBe(4);
	});

	it('briefingV2 mensal vence campos flat semanais — meta junho = 4', () => {
		const client = {
			id: 'janete-1',
			name: 'Janete Gomes',
			color: 'bg-slate-600',
			createdAt: '2025-01-01T00:00:00.000Z',
			postFrequencyQuantity: 1,
			postFrequencyPeriod: 'week',
			postFrequency: '1 post por semana',
			briefingV2: minimalBriefing({
				quantity: '4' as unknown as number,
				period: 'mensal' as 'month',
				variable: false,
			}),
		} as Client;

		expect(resolveFrequencyFromBriefingV2(client)).toEqual({ quantity: 4, period: 'month' });
		expect(resolvePlanningFrequency(client)).toEqual({ quantity: 4, period: 'month' });
		expect(getMonthlyPlanningGoal(client, 2025, 5)).toBe(4);
	});

	it('normalizeClient reconcilia flat legado com briefingV2 mensal incompleto no brandGuide', () => {
		const raw = {
			id: 'janete-2',
			name: 'Janete Gomes',
			brandGuideJson: {
				postFrequencyQuantity: 1,
				postFrequencyPeriod: 'week',
				postFrequency: '1 post por semana',
				briefingV2: minimalBriefing({
					quantity: '4' as unknown as number,
					period: 'mensal' as 'month',
					variable: false,
				}),
			},
		};

		const client = normalizeClient(raw as Record<string, unknown>);

		expect(client.postFrequencyQuantity).toBe(4);
		expect(client.postFrequencyPeriod).toBe('month');
		expect(client.postFrequency).toContain('4');
		expect(resolvePlanningFrequency(client)).toEqual({ quantity: 4, period: 'month' });
		expect(getMonthlyPlanningGoal(client, 2025, 5)).toBe(4);

		const summary = computeClientMonthlySchedule(client, [], new Date(2025, 5, 1));
		expect(summary.goal).toBe(4);

		logPlanningTagTrace({
			stage: 'vitest.janete-conflict',
			clientName: client.name,
			monthAnchor: summary.monthStart,
			frequencyResolved: resolvePlanningFrequency(client),
			monthlyGoalFromSchedule: summary.goal,
			plannedCountFromSchedule: summary.plannedCount,
			remainingCountFromSchedule: summary.remainingCount,
			briefingFrequencyRaw: client.briefingV2?.planning?.frequency,
			flatFrequency: {
				qty: client.postFrequencyQuantity,
				period: client.postFrequencyPeriod,
				postFrequency: client.postFrequency,
			},
			labelRendered: `Posts planejados: ${summary.plannedCount}/${summary.goal}`,
		});
	});
});
