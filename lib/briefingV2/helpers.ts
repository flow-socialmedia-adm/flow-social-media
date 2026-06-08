import type { PrimaryCta } from './types';

export function splitToTags(text: string | undefined | null): string[] {
    if (!text?.trim()) return [];
    const parts = text.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
    return Array.from(new Set(parts));
}

export function tagsToLegacyText(tags: string[]): string {
    return tags.join(', ');
}

export function newId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function parseLeadDays(value: string | undefined | null): number | undefined {
    if (value == null || value === '') return undefined;
    const n = parseInt(String(value), 10);
    return Number.isNaN(n) ? undefined : Math.max(0, n);
}

export function leadDaysToLegacy(n: number | undefined): string {
    return n == null ? '' : String(n);
}

const LEGACY_CTA_TO_V2: Record<string, PrimaryCta> = {
    agende: 'schedule_consultation',
    schedule: 'schedule_consultation',
    'agendar consulta': 'schedule_consultation',
    orçamento: 'request_quote',
    'solicitar orçamento': 'request_quote',
    whatsapp: 'whatsapp',
    compre: 'buy',
    'compre agora': 'buy',
    contato: 'contact',
    'entre em contato': 'contact',
    outro: 'other',
};

export function legacyCtaToV2(raw: string | undefined | null): PrimaryCta | '' {
    if (!raw?.trim()) return '';
    const key = raw.trim().toLowerCase();
    if (LEGACY_CTA_TO_V2[key]) return LEGACY_CTA_TO_V2[key];
    if (key.includes('whatsapp')) return 'whatsapp';
    if (key.includes('compr')) return 'buy';
    if (key.includes('agend') || key.includes('consult')) return 'schedule_consultation';
    if (key.includes('orç') || key.includes('orc')) return 'request_quote';
    if (key.includes('contato') || key.includes('contact')) return 'contact';
    return 'other';
}

const V2_CTA_LABELS_PT: Record<PrimaryCta, string> = {
    schedule_consultation: 'Agendar consulta',
    request_quote: 'Solicitar orçamento',
    whatsapp: 'Chamar no WhatsApp',
    buy: 'Comprar',
    contact: 'Entrar em contato',
    other: 'Outro',
};

export function v2CtaToLegacyLabel(cta: PrimaryCta | ''): string {
    if (!cta) return '';
    return V2_CTA_LABELS_PT[cta] ?? cta;
}

export function normalizeChannel(raw: string | undefined | null): string {
    if (!raw?.trim()) return '';
    const s = raw.trim().toLowerCase();
    if (s.includes('whatsapp')) return 'whatsapp';
    if (s.includes('email') || s.includes('e-mail')) return 'email';
    if (s.includes('trello')) return 'trello';
    if (s.includes('clickup')) return 'clickup';
    return 'other';
}

export function normalizeResponseTime(raw: string | undefined | null): string {
    if (!raw?.trim()) return '';
    const s = raw.trim().toLowerCase();
    if (s.includes('mesmo dia') || s === 'same_day') return 'same_day';
    if (s.includes('24')) return 'up_to_24h';
    if (s.includes('48')) return 'up_to_48h';
    if (s.includes('72')) return 'up_to_72h';
    if (s.includes('mais') || s.includes('over')) return 'over_72h';
    return raw;
}
