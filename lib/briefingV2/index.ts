export type * from './types';
export { migrateClientToBriefingV2, parseBriefingV2FromBrandGuide, resolveBriefingV2 } from './migrate';
export { syncLegacyBrandGuideFields, applyBriefingToClientFlat } from './syncLegacy';
export { splitToTags, newId, v2CtaToLegacyLabel, legacyCtaToV2 } from './helpers';

import type { Client } from '../../types';
import type { BriefingV2 } from './types';
import { migrateClientToBriefingV2 } from './migrate';
import { applyBriefingToClientFlat } from './syncLegacy';

/** Atualiza briefing parcialmente e retorna patch do Client com flat sincronizado. */
export function patchClientBriefing(
    client: Client,
    updater: (b: BriefingV2) => BriefingV2,
): Partial<Client> {
    const base = client.briefingV2 ?? migrateClientToBriefingV2(client);
    const next = updater({
        ...base,
        _internal: base._internal,
        updatedAt: new Date().toISOString(),
    });
    return applyBriefingToClientFlat(next);
}
