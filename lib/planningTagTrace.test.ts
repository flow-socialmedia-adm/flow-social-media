/**
 * Executa trace real da cadeia Janete (conflito briefing mensal vs flat semanal).
 * Uso: npx vitest run lib/planningFrequency.test.ts -t "trace real"
 */
import { describe, expect, it } from 'vitest';
import type { Task } from '../types';
import { normalizeClient } from '../components/clients/clientUtils';
import {
	computeClientMonthlySchedule,
	resolvePlanningFrequency,
} from './planningSchedule';
import { formatScheduleIndicator } from './planningFriendlyLabels';

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

const t = (key: string, vars?: Record<string, string | number>) => {
	if (key === 'planning_schedule_posts_ratio' && vars) {
		return `Posts planejados: ${vars.planned}/${vars.goal}`;
	}
	return key;
};

describe('planningTagTrace', () => {
	it('trace real — Janete conflito briefing 4/mês vs flat 1/semana', () => {
		const raw = {
			id: 'janete-trace',
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
		const summary = computeClientMonthlySchedule(client, [], new Date(2025, 5, 1));
		const frequencyResolved = resolvePlanningFrequency(client);
		const scheduleTag = formatScheduleIndicator(
			summary.plannedCount,
			summary.goal,
			summary.remainingCount,
			t,
		);

		const trace = {
			stage: 'trace.real.janete',
			clientName: client.name,
			monthAnchor: summary.monthStart,
			frequencyResolved,
			monthlyGoalFromSchedule: summary.goal,
			plannedCountFromSchedule: summary.plannedCount,
			remainingCountFromSchedule: summary.remainingCount,
			scheduleSummaryReceivedByCard: {
				goal: summary.goal,
				plannedCount: summary.plannedCount,
				remainingCount: summary.remainingCount,
			},
			labelRendered: scheduleTag?.label,
			briefingFrequencyRaw: client.briefingV2?.planning?.frequency,
			flatFrequency: {
				qty: client.postFrequencyQuantity,
				period: client.postFrequencyPeriod,
				postFrequency: client.postFrequency,
			},
		};

		// eslint-disable-next-line no-console
		console.log('[PlanningTagTrace]', JSON.stringify(trace, null, 2));

		expect(summary.goal).toBe(4);
		expect(scheduleTag?.label).toBe('Posts planejados: 0/4');

		const plannedTasks: Task[] = ['2025-06-03', '2025-06-10', '2025-06-17', '2025-06-24'].map(
			(date, i) => ({
				id: `task-${i}`,
				title: `Post ${i + 1}`,
				clientId: client.id,
				postType: 'reels' as const,
				publishDate: date,
				date,
				statusId: 's1',
				isGeneral: false,
				category: 'post' as const,
			}),
		);
		const summaryWithPosts = computeClientMonthlySchedule(client, plannedTasks, new Date(2025, 5, 1));
		const tagWithPosts = formatScheduleIndicator(
			summaryWithPosts.plannedCount,
			summaryWithPosts.goal,
			summaryWithPosts.remainingCount,
			t,
		);
		// eslint-disable-next-line no-console
		console.log('[PlanningTagTrace]', JSON.stringify({
			...trace,
			stage: 'trace.real.janete.4posts',
			plannedCountFromSchedule: summaryWithPosts.plannedCount,
			monthlyGoalFromSchedule: summaryWithPosts.goal,
			labelRendered: tagWithPosts?.label,
		}, null, 2));
		expect(summaryWithPosts.plannedCount).toBe(4);
		expect(summaryWithPosts.goal).toBe(4);
		expect(tagWithPosts?.label).toBe('Posts planejados: 4/4');
	});
});
