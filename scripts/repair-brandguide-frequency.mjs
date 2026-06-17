/**
 * Repara frequência de clientes no brandGuideJson:
 * briefingV2.planning.frequency canônico sobrescreve campos flat legados.
 *
 * Uso: node scripts/repair-brandguide-frequency.mjs [--dry-run]
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const dryRun = process.argv.includes('--dry-run');
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../apps/api/.env');
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
	if (!line || line.startsWith('#')) continue;
	const i = line.indexOf('=');
	if (i < 0) continue;
	process.env[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, '');
}

const { normalizeClient } = await import('../components/clients/clientUtils.ts');
const { syncLegacyBrandGuideFields } = await import('../lib/briefingV2/syncLegacy.ts');
const { inspectClientFrequency, parseBrandGuideJson } = await import('../lib/reconcileClientFrequency.ts');

const prisma = new PrismaClient();
const rows = await prisma.client.findMany({
	where: { deletedAt: null },
	select: { id: true, name: true, brandGuideJson: true },
});

let repaired = 0;
for (const row of rows) {
	const brandGuide = parseBrandGuideJson(row.brandGuideJson);
	const client = normalizeClient(row);
	const inspection = inspectClientFrequency(client, brandGuide);
	if (!inspection.needsCorrection) continue;

	const legacy = syncLegacyBrandGuideFields(client.briefingV2);
	const nextGuide = { ...brandGuide, ...legacy };
	const after = inspectClientFrequency(normalizeClient({ ...row, brandGuideJson: nextGuide }), nextGuide);

	console.log(`[repair] ${client.name} (${client.id})`);
	console.log(`  antes: briefing=${inspection.briefingFrequency} flat=${inspection.flatFrequency} resolved=${inspection.resolvedFrequency}`);
	console.log(`  depois: briefing=${after.briefingFrequency} flat=${after.flatFrequency} resolved=${after.resolvedFrequency}`);

	if (!dryRun) {
		await prisma.client.update({
			where: { id: row.id },
			data: { brandGuideJson: nextGuide },
		});
	}
	repaired++;
}

console.log(dryRun ? `[dry-run] ${repaired} cliente(s) com conflito` : `[done] ${repaired} cliente(s) reparado(s)`);
await prisma.$disconnect();
