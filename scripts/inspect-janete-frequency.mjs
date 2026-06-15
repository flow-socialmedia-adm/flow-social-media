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

const prisma = new PrismaClient();
const row = await prisma.client.findFirst({
	where: { name: { contains: 'Janete', mode: 'insensitive' }, deletedAt: null },
});
await prisma.$disconnect();

if (!row) {
	console.log('Janete not found');
	process.exit(1);
}

const client = normalizeClient(row);
const summary = computeClientMonthlySchedule(client, [], new Date(2026, 5, 1));
const freq = resolvePlanningFrequency(client);
const label = formatScheduleIndicator(summary.plannedCount, summary.goal, summary.remainingCount, (k, v) =>
	k === 'planning_schedule_posts_ratio' ? `Posts planejados: ${v?.planned}/${v?.goal}` : k,
);

console.log('[PlanningTagTrace REAL DB]', JSON.stringify({
	clientId: client.id,
	clientName: client.name,
	briefingV2Frequency: client.briefingV2?.planning?.frequency,
	postFrequency: client.postFrequency,
	postFrequencyQuantity: client.postFrequencyQuantity,
	postFrequencyPeriod: client.postFrequencyPeriod,
	frequencyResolved: freq,
	scheduleSummaryGoal: summary.goal,
	scheduleSummaryPlannedCount: summary.plannedCount,
	labelRendered: label?.label,
}, null, 2));
