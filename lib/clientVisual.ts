import type { Client } from '../types';

type ClientLike = Pick<Client, 'avatarUrl' | 'brandAssets' | 'color'>;

export const CLIENT_AVATAR_FALLBACK_COLOR = '#9CA3AF';

/**
 * Resolve a imagem principal do cliente para uso em avatares/cards.
 * Prioriza avatarUrl; se ausente, usa o primeiro asset de logo.
 */
export function resolveClientImageUrl(client: ClientLike | undefined | null): string | null {
    if (!client) return null;
    if (client.avatarUrl) return client.avatarUrl;
    const logoAsset = (client.brandAssets || []).find((a) => a.type === 'logo' && !!a.url);
    return logoAsset?.url || null;
}

/**
 * Resolve cor de fallback para bolinha/avatar sem imagem.
 */
export function resolveClientFallbackColor(client: Pick<ClientLike, 'color'> | undefined | null): string {
    return client?.color || CLIENT_AVATAR_FALLBACK_COLOR;
}
