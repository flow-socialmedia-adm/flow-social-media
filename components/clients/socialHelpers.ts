import React from 'react';
import type { SocialPlatform } from '../../types';
import { LinkIcon, InstagramIcon, FacebookIcon, LinkedinIcon, TiktokIcon, XIconSocial, YoutubeIcon, PinterestIcon, AtSignIcon } from '../icons';

export const socialIcons: Record<SocialPlatform, React.FC<{ className?: string }>> = {
    website: LinkIcon,
    email: AtSignIcon,
    instagram: InstagramIcon,
    facebook: FacebookIcon,
    linkedin: LinkedinIcon,
    tiktok: TiktokIcon,
    x: XIconSocial,
    youtube: YoutubeIcon,
    pinterest: PinterestIcon,
};

export const cardSocialIcons: Record<SocialPlatform, React.FC<{ className?: string }>> = socialIcons;

export const ALL_SOCIAL_PLATFORMS: SocialPlatform[] = ['instagram', 'facebook', 'linkedin', 'tiktok', 'x', 'youtube', 'pinterest', 'website', 'email'];

export const SOCIAL_PLATFORM_LABELS: Record<string, string> = {
    instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', tiktok: 'TikTok',
    x: 'X', youtube: 'YouTube', pinterest: 'Pinterest', website: 'Site', email: 'E-mail',
};

export const urlTemplates: Record<string, string> = {
    instagram: 'https://instagram.com/{username}',
    facebook: 'https://facebook.com/{username}',
    linkedin: 'https://linkedin.com/in/{username}',
    tiktok: 'https://tiktok.com/@{username}',
    x: 'https://x.com/{username}',
    youtube: 'https://youtube.com/@{username}',
    pinterest: 'https://pinterest.com/{username}',
};

/** Prefixo fixo exibido no campo de link (ex: "instagram.com/" ou "tiktok.com/@") */
export const getLinkPrefix = (platform: SocialPlatform): string => {
    if (platform === 'website' || platform === 'email') return '';
    if (['tiktok', 'youtube'].includes(platform)) return `${platform}.com/@`;
    if (platform === 'linkedin') return 'linkedin.com/in/';
    return `${platform}.com/`;
};

/** Constrói URL completa a partir do que o usuário digitou (username, @user ou URL parcial) */
export const buildSocialUrlFromInput = (input: string, platform: SocialPlatform): string => {
    if (!input?.trim()) return '';
    const u = input.trim();
    if (platform === 'website') return u;
    if (platform === 'email') return u;
    if (u.startsWith('http')) return u;
    if (u.startsWith('@')) {
        const t = urlTemplates[platform];
        return t ? t.replace('{username}', u.slice(1).replace(/^@/, '')) : u;
    }
    const domainRegex = new RegExp(`^(https?://)?(www\\.)?${platform}\\.com`, 'i');
    if (domainRegex.test(u)) return u.startsWith('http') ? u : `https://${u}`;
    const t = urlTemplates[platform];
    return t ? t.replace('{username}', u) : `https://${platform}.com/${u}`;
};

const BAD_PREFIXES: Record<string, string> = { website: 'https://website.com/', email: 'https://email.com/' };

/** Remove prefixo incorreto de URL (ex: https://website.com/www.x.com -> www.x.com, https://email.com/x@y.com -> x@y.com) */
export const normalizeWebsiteUrl = (url: string): string => {
    if (!url?.trim()) return url || '';
    const u = url.trim();
    for (const prefix of Object.values(BAD_PREFIXES)) {
        if (u.toLowerCase().startsWith(prefix)) return u.slice(prefix.length);
    }
    return u;
};

/** Normaliza URL/email por plataforma (remove prefixos incorretos) */
export const normalizePlatformUrl = (platform: SocialPlatform, url: string): string => {
    if (platform !== 'website' && platform !== 'email') return url || '';
    return normalizeWebsiteUrl(url);
};

const stripAt = (s: string) => s.replace(/^@+/, '').trim();

function hostMatchesPlatform(hostname: string, platform: SocialPlatform): boolean {
    const h = hostname.replace(/^www\./i, '').toLowerCase();
    switch (platform) {
        case 'instagram':
            return h === 'instagram.com';
        case 'facebook':
            return h === 'facebook.com' || h === 'm.facebook.com' || h === 'fb.com';
        case 'linkedin':
            return h === 'linkedin.com' || h.endsWith('.linkedin.com');
        case 'tiktok':
            return h === 'tiktok.com' || h === 'm.tiktok.com';
        case 'x':
            return h === 'x.com' || h === 'twitter.com' || h === 'mobile.twitter.com';
        case 'youtube':
            return h === 'youtube.com' || h === 'm.youtube.com' || h === 'youtu.be';
        case 'pinterest':
            return h === 'pinterest.com' || h.endsWith('.pinterest.com');
        default:
            return false;
    }
}

/**
 * Extrai só o identificador (usuário, @handle, vanity) a partir da URL salva.
 * Nunca devolve a URL completa — usado no campo ao lado do prefixo "instagram.com/".
 */
export const extractUsernameFromUrl = (platform: SocialPlatform, url: string): string => {
    if (platform === 'website' || platform === 'email') return (url || '').trim();
    if (!url?.trim()) return '';
    let s = url.trim();
    if (s.startsWith('@')) return stripAt(s);

    const hasProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(s);
    const domainSlash = /\.[a-z]{2,}\//i.test(s);
    if (!hasProtocol && !domainSlash) {
        return stripAt(s);
    }

    let href = s;
    if (!hasProtocol) {
        href = `https://${s}`;
    }

    try {
        const u = new URL(href);
        const host = u.hostname;

        if (platform === 'youtube' && host.replace(/^www\./i, '').toLowerCase() === 'youtu.be') {
            const seg = u.pathname.replace(/^\//, '').split('/')[0];
            return seg ? stripAt(seg) : '';
        }

        if (!hostMatchesPlatform(host, platform)) {
            return '';
        }

        const parts = u.pathname.split('/').filter(Boolean).map((p) => decodeURIComponent(p));

        switch (platform) {
            case 'linkedin': {
                const i = parts.indexOf('in');
                if (i >= 0 && parts[i + 1]) return stripAt(parts[i + 1]);
                return parts.length ? stripAt(parts[parts.length - 1]) : '';
            }
            case 'tiktok': {
                const at = parts.find((p) => p.startsWith('@'));
                if (at) return stripAt(at.replace(/^@+/, ''));
                return parts.length ? stripAt(parts[parts.length - 1].replace(/^@+/, '')) : '';
            }
            case 'youtube': {
                const at = parts.find((p) => p.startsWith('@'));
                if (at) return stripAt(at.replace(/^@+/, ''));
                return parts.length ? stripAt(parts[parts.length - 1]) : '';
            }
            default:
                return parts.length ? stripAt(parts[parts.length - 1]) : '';
        }
    } catch {
        return '';
    }
};

/** O que o usuário vê no input (handle apenas; nunca repete https://…). */
export const socialUrlToDisplayHandle = (platform: SocialPlatform, url: string): string => {
    if (!url?.trim() || !platform) return '';
    const u = url.trim();
    if (u.startsWith('@')) return stripAt(u);
    const extracted = extractUsernameFromUrl(platform, u);
    if (extracted) return extracted;
    if (!/:\/\//i.test(u) && !/\.[a-z]{2,}\//i.test(u)) return stripAt(u);
    return '';
};

/** Monta a URL canônica a partir do que digitou (só @user, URL completa ou colada). */
export const buildSocialUrlFromUsernameInput = (platform: SocialPlatform, input: string): string => {
    if (platform === 'website') return normalizeWebsiteUrl(input);
    if (platform === 'email') return (input || '').trim();
    const trimmed = (input || '').trim();
    if (!trimmed) return '';
    const handle = extractUsernameFromUrl(platform, trimmed) || (!/:\/\//i.test(trimmed) ? stripAt(trimmed) : '');
    const tmpl = urlTemplates[platform];
    if (!handle) {
        if (/:\/\//i.test(trimmed)) return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
        return '';
    }
    return tmpl ? tmpl.replace('{username}', handle) : `https://${platform}.com/${handle}`;
};
