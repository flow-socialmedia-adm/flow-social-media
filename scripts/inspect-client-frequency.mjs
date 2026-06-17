/**
 * Inspeção de frequência de todos os clientes ativos.
 * Uso: npx tsx scripts/inspect-client-frequency.mjs
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
const { inspectClientFrequency, parseBrandGuideJson } = await import('../lib/reconcileClientFrequency.ts');

const prisma = new PrismaClient();
const rows = await prisma.client.findMany({
	where: { deletedAt: null },
	select: { id: true, name: true, brandGuideJson: true },
	orderBy: { name: 'asc' },
});
await prisma.$disconnect();

console.log('Cliente | briefing frequency | flat frequency | frequência resolvida | precisa correção?');
console.log('---|---|---|---|---');

let needsFix = 0;
for (const row of rows) {
	const brandGuide = parseBrandGuideJson(row.brandGuideJson);
	const client = normalizeClient(row);
	const inspection = inspectClientFrequency(client, brandGuide);
	if (inspection.needsCorrection) needsFix++;
	console.log(
		`${inspection.clientName} | ${inspection.briefingFrequency} | ${inspection.flatFrequency} | ${inspection.resolvedFrequency} | ${inspection.needsCorrection ? 'sim' : 'não'}`,
	);
}

console.log(`\nTotal: ${rows.length} cliente(s) | ${needsFix} precisa(m) correção`);
