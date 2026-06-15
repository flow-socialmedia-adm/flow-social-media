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

const prisma = new PrismaClient();
const row = await prisma.client.findFirst({
	where: { name: { contains: 'Janete', mode: 'insensitive' }, deletedAt: null },
});
await prisma.$disconnect();

const client = normalizeClient(row);
const patch = patchClientBriefing(client, (b) => ({
	...b,
	planning: {
		...b.planning,
		frequency: { quantity: 4, period: 'month', variable: false },
	},
}));
const merged = { ...client, ...patch };
const legacy = syncLegacyBrandGuideFields(merged.briefingV2);

console.log('After patch to 4/month:');
console.log('briefingV2.frequency:', JSON.stringify(merged.briefingV2?.planning?.frequency));
console.log('postFrequencyQuantity:', merged.postFrequencyQuantity);
console.log('postFrequencyPeriod:', merged.postFrequencyPeriod);
console.log('postFrequency:', merged.postFrequency);
console.log('brandGuide sync postFrequencyPeriod:', legacy.postFrequencyPeriod);
console.log('brandGuide sync briefingV2.frequency:', JSON.stringify(legacy.briefingV2?.planning?.frequency));
