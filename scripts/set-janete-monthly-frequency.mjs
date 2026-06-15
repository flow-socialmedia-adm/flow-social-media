/**
 * Atualiza Janete Gomes para 4 posts/mês (contrato correto).
 * Uso: npx tsx scripts/set-janete-monthly-frequency.mjs
 */
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
const { patchClientBriefing } = await import('../lib/briefingV2/index.ts');
const { syncLegacyBrandGuideFields } = await import('../lib/briefingV2/syncLegacy.ts');
const { parseBrandGuideJson } = await import('../lib/reconcileClientFrequency.ts');
const { computeClientMonthlySchedule, resolvePlanningFrequency } = await import('../lib/planningSchedule.ts');

const prisma = new PrismaClient();
const row = await prisma.client.findFirst({
	where: { name: { contains: 'Janete', mode: 'insensitive' }, deletedAt: null },
});
if (!row) throw new Error('Janete not found');

const client = normalizeClient(row);
const patch = patchClientBriefing(client, (b) => ({
	...b,
	planning: {
		...b.planning,
		frequency: { quantity: 4, period: 'month', variable: false },
	},
}));
const merged = { ...client, ...patch };
const brandGuide = parseBrandGuideJson(row.brandGuideJson);
const legacy = syncLegacyBrandGuideFields(merged.briefingV2);
const nextGuide = { ...brandGuide, ...legacy };

await prisma.client.update({
	where: { id: row.id },
	data: { brandGuideJson: nextGuide },
});

const saved = normalizeClient({ ...row, brandGuideJson: nextGuide });
const summary = computeClientMonthlySchedule(saved, [], new Date(2026, 5, 1));
console.log('[Janete repaired]', {
	frequencyResolved: resolvePlanningFrequency(saved),
	goal: summary.goal,
	label: `Posts planejados: ${summary.plannedCount}/${summary.goal}`,
});

await prisma.$disconnect();
