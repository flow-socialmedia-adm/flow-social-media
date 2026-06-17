import { describe, expect, it } from 'vitest';
import type { Client, Task, Workflow } from '../types';
import { countClientMonthlyOverduePosts, isPostOperationallyOverdue } from './planningOverduePosts';

const workflows: Record<string, Workflow> = {
	client_wf: {
		id: 'client_wf',
		name: 'Posts',
		statuses: [
			{ id: 'em_producao', nameKey: 'em_producao', category: 'in_progress' },
			{ id: 'publicado', nameKey: 'publicado', category: 'done' },
		],
	},
};

const client: Client = {
	id: 'c1',
	name: 'Cliente',
	color: 'bg-slate-600',
	createdAt: '2025-01-01',
	planningProductionLeadDays: '3',
	planningApprovalRequired: true,
};

function post(overrides: Partial<Task> = {}): Task {
	return {
		id: 't1',
		title: 'Post',
		clientId: 'c1',
		postType: 'reels',
		category: 'post',
		statusId: 'em_producao',
		publishDate: '2026-06-15',
		date: '2026-06-15',
		isGeneral: false,
		workflowId: 'client_wf',
		...overrides,
	} as Task;
}

describe('planningOverduePosts', () => {
	it('não conta previsões', () => {
		const forecast = post({ category: 'forecast', postType: undefined, publishDate: '2026-06-01' });
		expect(
			isPostOperationallyOverdue(forecast, client, workflows, 'client_wf', 'general_wf', '2026-06-20'),
		).toBe(false);
	});

	it('conta post real com data de publicação passada e não concluído', () => {
		const task = post({ publishDate: '2026-06-01', statusId: 'em_producao' });
		expect(
			isPostOperationallyOverdue(task, client, workflows, 'client_wf', 'general_wf', '2026-06-20'),
		).toBe(true);
	});

	it('não conta post publicado/concluído', () => {
		const task = post({ publishDate: '2026-06-01', statusId: 'publicado' });
		expect(
			isPostOperationallyOverdue(task, client, workflows, 'client_wf', 'general_wf', '2026-06-20'),
		).toBe(false);
	});

	it('conta apenas posts do mês visível', () => {
		const inMonth = post({ id: 'a', publishDate: '2026-06-05' });
		const outMonth = post({ id: 'b', publishDate: '2026-07-05' });
		const count = countClientMonthlyOverduePosts(
			client,
			[inMonth, outMonth],
			new Date(2026, 5, 1),
			workflows,
			'client_wf',
			'general_wf',
		);
		expect(count).toBe(1);
	});
});
