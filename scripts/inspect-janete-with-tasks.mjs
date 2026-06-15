import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../apps/api/.env');
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
	if (!line || line.startsWith('#')) continue;
	const i = line.indexOf('=');
	if (i < 0) continue;
	process.env[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, '');
}

const { normalizeClient } = await import('../components/clients/clientUtils.ts');
const { computeClientMonthlySchedule, resolvePlanningFrequency } = await import('../lib/planningSchedule.ts');
const { formatScheduleIndicator } = await import('../lib/planningFriendlyLabels.ts');
const { mapApiTaskToTask } = await import('../lib/mapApiTaskToTask.ts');

const prisma = new PrismaClient();
const row = await prisma.client.findFirst({
	where: { name: { contains: 'Janete', mode: 'insensitive' }, deletedAt: null },
});
const tasks = await prisma.task.findMany({
	where: {
		clientId: row.id,
		deletedAt: null,
		publishDate: { gte: new Date('2026-06-01'), lte: new Date('2026-06-30') },
	},
	select: { id: true, title: true, publishDate: true, postType: true, category: true, clientId: true, statusId: true, isGeneral: true },
});
await prisma.$disconnect();

const client = normalizeClient(row);
const todayStr = '2026-06-09';
const mapped = tasks.map((t) => mapApiTaskToTask(t, todayStr));
const summary = computeClientMonthlySchedule(client, mapped, new Date(2026, 5, 1));
const label = formatScheduleIndicator(summary.plannedCount, summary.goal, summary.remainingCount, (k, v) =>
	k === 'planning_schedule_posts_ratio' ? `Posts planejados: ${v?.planned}/${v?.goal}` : k,
);

console.log('[Janete June 2026 with tasks]', {
	taskCount: tasks.length,
	plannedCount: summary.plannedCount,
	goal: summary.goal,
	frequencyResolved: resolvePlanningFrequency(client),
	labelRendered: label?.label,
});
