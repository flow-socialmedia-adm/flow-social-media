import { describe, expect, it } from 'vitest';
import type { Client } from '../types';
import type { BriefingV2 } from './briefingV2/types';
import { patchClientBriefing } from './briefingV2';
import { getMonthlyPlanningGoal } from './planningSchedule';
import { countCalendarWeeksInMonth } from './utils';
import {
	buildPlanningFrequencyUpdater,
	parseFrequencyQtyDraft,
	sanitizeFrequencyQtyInput,
} from './planningFrequencyEdit';

function minimalBriefing(frequency: BriefingV2['planning']['frequency']): BriefingV2 {
	return {
		schemaVersion: 2,
		updatedAt: '2025-01-01T00:00:00.000Z',
		strategy: { brandWho: '', mainServicesTags: [], differentiators: '', perceivedAs: '', marketReferences: [] },
		audience: { main: '', painsTags: [], desiresTags: [], objectionsTags: [], personas: [] },
		communication: { toneOfVoice: '', avoid: '', brandWordsTags: [], primaryCta: '' },
		content: { profileObjective: '', currentCampaignObjective: '', monthFocus: '', pillarsTags: [], strategyNotes: '' },
		planning: {
			frequency,
			preferredPostDays: ['mon'],
			operation: { approvalChannel: '', clientResponseTime: '' },
		},
	};
}

function baseClient(): Client {
	return {
		id: 'c1',
		name: 'Test Client',
		color: 'bg-slate-600',
		createdAt: '2025-01-01T00:00:00.000Z',
		briefingV2: minimalBriefing({ quantity: 1, period: 'week', variable: false }),
	} as Client;
}

describe('planningFrequencyEdit', () => {
	it('sanitiza input de quantidade', () => {
		expect(sanitizeFrequencyQtyInput('4a.2')).toBe('42');
		expect(sanitizeFrequencyQtyInput('-3')).toBe('3');
		expect(sanitizeFrequencyQtyInput('')).toBe('');
	});

	it('parseFrequencyQtyDraft rejeita vazio e inválido', () => {
		expect(parseFrequencyQtyDraft('')).toBeNull();
		expect(parseFrequencyQtyDraft('0')).toBeNull();
		expect(parseFrequencyQtyDraft('4')).toBe(4);
	});

	it('1/sem → 4/mês: meta junho = 4 e campos legados sincronizados', () => {
		const client = baseClient();
		const patch = patchClientBriefing(client, buildPlanningFrequencyUpdater(4, 'month'));
		const merged = { ...client, ...patch };

		expect(merged.briefingV2?.planning.frequency).toMatchObject({ quantity: 4, period: 'month' });
		expect(merged.postFrequencyQuantity).toBe(4);
		expect(merged.postFrequencyPeriod).toBe('month');
		expect(merged.postFrequency).toContain('4');
		expect(getMonthlyPlanningGoal(merged, 2025, 5)).toBe(4);
	});

	it('4/mês → 1/sem: meta proporcional às semanas civis do mês', () => {
		let client = baseClient();
		client = { ...client, ...patchClientBriefing(client, buildPlanningFrequencyUpdater(4, 'month')) };
		client = { ...client, ...patchClientBriefing(client, buildPlanningFrequencyUpdater(1, 'week')) };

		const year = 2025;
		const month = 5; // junho
		const weeks = countCalendarWeeksInMonth(year, month);
		expect(getMonthlyPlanningGoal(client, year, month)).toBe(weeks);
		expect(client.postFrequencyPeriod).toBe('week');
		expect(client.postFrequencyQuantity).toBe(1);
	});
});
