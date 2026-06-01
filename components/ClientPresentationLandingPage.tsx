import React, { useState, useEffect, useRef } from 'react';
import type { Client, SocialPlatform, Theme } from '../types';
import { Language } from '../types';
import { formatPhoneNumber, resolveColorHex } from '../lib/utils';
import TooltipHint from './TooltipHint';
import { getFlagByPhone } from '../lib/phone.tsx';
import { toUploadUrl } from '../lib/api';
import { resolveClientImageUrl } from '../lib/clientVisual';
import { LinkIcon, InstagramIcon, FacebookIcon, LinkedinIcon, TiktokIcon, XIconSocial, YoutubeIcon, PinterestIcon, PhoneIcon, WhatsAppIcon, AtSignIcon } from './icons';

const cardSocialIcons: Record<SocialPlatform, React.FC<{ className?: string }>> = {
    website: LinkIcon,
    instagram: InstagramIcon,
    facebook: FacebookIcon,
    linkedin: LinkedinIcon,
    tiktok: TiktokIcon,
    x: XIconSocial,
    youtube: YoutubeIcon,
    pinterest: PinterestIcon,
};

export type ClientPresentationLandingPageProps = {
    client: Client;
    language: string;
    t: (key: string) => string;
    appTheme: Theme;
    onBack: () => void;
};

function useGoogleFont(fontName?: string) {
    useEffect(() => {
        if (!fontName) return;
        const fontId = `font-${fontName.replace(/ /g, '-')}`;
        if (document.getElementById(fontId)) return;
        const link = document.createElement('link');
        link.id = fontId;
        link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }, [fontName]);
}

function FadeSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(([e]) => {
            if (e.isIntersecting) setVisible(true);
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
        obs.observe(el);
        return () => obs.disconnect();
    }, []);
    return (
        <div ref={ref} className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}>
            {children}
        </div>
    );
}

export const ClientPresentationLandingPage: React.FC<ClientPresentationLandingPageProps> = ({
    client,
    language,
    t,
    appTheme,
    onBack,
}) => {
    const [localTheme, setLocalTheme] = useState<Theme>(appTheme);
    const isDark = localTheme === 'dark';
    const lang = language === 'pt' ? Language.PT : language === 'es' ? Language.ES : Language.EN;
    useGoogleFont(client.typography?.primaryFont);
    useGoogleFont(client.typography?.secondaryFont);
    const primaryFont = client.typography?.primaryFont;
    const formatCurrency = (v: number) => new Intl.NumberFormat(language === 'pt' ? 'pt-BR' : 'en-US', { style: 'currency', currency: client.currency || 'BRL' }).format(v);

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-gray-800 text-white text-sm shadow-lg z-50';
        toast.textContent = t('link_copied');
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    };

    const toggleTheme = () => setLocalTheme(prev => prev === 'dark' ? 'light' : 'dark');

    const colors = (client.brandColors || []).filter(c => c.showInPresentation);
    const displayColors = colors.length > 0 ? colors : (client.brandColors || []);
    const accentColor = displayColors[0]?.hex || client.brandColors?.[0]?.hex;
    const links = client.socialLinks || [];
    const services = client.contract?.services || [];
    const clientImgUrl = resolveClientImageUrl(client);

    return (
        <div className={`min-h-screen ${isDark ? 'dark bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`} data-landing-theme={isDark ? 'dark' : 'light'} style={primaryFont ? { fontFamily: `"${primaryFont}", system-ui, sans-serif` } : undefined}>
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 print:py-4">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-8 print:hidden">
                    <button type="button" onClick={onBack} className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1">
                        ✕ {t('exit_presentation')}
                    </button>
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={toggleTheme} className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors" aria-label={t('theme_mode')}>
                            {isDark ? '☀️' : '🌙'}
                        </button>
                        <button type="button" onClick={copyLink} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${!accentColor ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' : ''}`} style={accentColor ? { backgroundColor: accentColor + '30', color: accentColor } : undefined}>
                            <LinkIcon className="w-4 h-4" /> {t('copy_link')}
                        </button>
                        <button type="button" onClick={() => window.print()} className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium">
                            {t('generate_pdf')}
                        </button>
                    </div>
                </div>

                <FadeSection className="mb-16">
                    <div className={`h-32 sm:h-40 rounded-2xl ${client.color} relative overflow-hidden`} />
                    <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-16 sm:-mt-20 relative z-10 px-4 sm:px-6">
                        {clientImgUrl ? (
                            <img src={toUploadUrl(clientImgUrl)} alt={client.name} className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-white dark:border-gray-900 shadow-xl bg-gray-200 dark:bg-gray-700" />
                        ) : (
                            <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-2xl flex items-center justify-center text-white text-4xl font-bold border-4 border-white dark:border-gray-900 shadow-xl ${client.color}`}>
                                {client.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                        )}
                        <div className="pb-1">
                            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">{client.name}</h1>
                            {client.website && (
                                <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm mt-1 block">
                                    {client.website.replace(/^https?:\/\//, '')}
                                </a>
                            )}
                        </div>
                    </div>
                </FadeSection>

                <FadeSection className="mb-16">
                    <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('profile_section')}</h2>
                    <div className="flex flex-wrap items-center gap-4">
                        {clientImgUrl ? <img src={toUploadUrl(clientImgUrl)} alt="" className="w-16 h-16 rounded-full object-cover" /> : <div className={`w-16 h-16 rounded-full ${client.color} flex items-center justify-center text-white text-2xl font-bold`}>{client.name?.charAt(0)?.toUpperCase() || '?'}</div>}
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{client.name}</p>
                            {client.website && <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 dark:text-indigo-400">{client.website.replace(/^https?:\/\//, '')}</a>}
                            {links.length > 0 && (
                                <div className="flex gap-2 mt-2">
                                    {links.map((link) => {
                                        const Icon = cardSocialIcons[link.platform];
                                        if (!Icon) return null;
                                        return <a key={link.platform} href={link.url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 bg-gray-100 dark:bg-gray-800" aria-label={link.platform}><Icon className="w-5 h-5" /></a>;
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </FadeSection>

                {(displayColors.length > 0 || client.typography?.primaryFont || (client.brandAssets?.filter(a => a.type === 'logo')?.length ?? 0) > 0) && (
                    <FadeSection className="mb-16">
                        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('brand_guide')}</h2>
                        <div className="space-y-4">
                            {displayColors.length > 0 && (
                                <div className="flex flex-wrap gap-3">
                                    {displayColors.map((c, i) => {
                                        const hex = resolveColorHex(c.hex);
                                        const namePart = (c.name || '').trim();
                                        const chipLabel = namePart ? `${namePart} ${hex}` : hex;
                                        return (
                                            <TooltipHint key={`${hex}-${i}`} label={chipLabel}>
                                                <span
                                                    className="w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-600 inline-block"
                                                    style={{ backgroundColor: hex }}
                                                    role="img"
                                                    aria-label={chipLabel}
                                                />
                                            </TooltipHint>
                                        );
                                    })}
                                </div>
                            )}
                            {client.typography?.primaryFont && <p className="text-lg" style={{ fontFamily: client.typography.primaryFont }}>{client.typography.primaryFont}</p>}
                            {(client.brandAssets?.filter(a => a.type === 'logo')?.length ?? 0) > 0 && (
                                <div className="flex flex-wrap gap-4">
                                    {client.brandAssets?.filter(a => a.type === 'logo').map(a => a.url && <img key={a.id} src={toUploadUrl(a.url)} alt={a.name} className="h-14 object-contain" />)}
                                </div>
                            )}
                        </div>
                    </FadeSection>
                )}

                {(client.contacts?.length ?? 0) > 0 && (
                    <FadeSection className="mb-16">
                        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('contacts')}</h2>
                        <div className="space-y-4">
                            {client.contacts!.map((c) => (
                                <div key={c.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50">
                                    <p className="font-semibold text-gray-900 dark:text-white">{c.name}</p>
                                    {c.role && <p className="text-sm text-gray-500 dark:text-gray-400">{c.role}</p>}
                                    <div className="flex flex-wrap gap-3 mt-2">
                                        {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"><AtSignIcon className="w-4 h-4" />{c.email}</a>}
                                        {c.whatsapp && <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><WhatsAppIcon className="w-4 h-4" /><span className="inline-flex items-center w-5 h-[14px]">{getFlagByPhone(c.whatsapp)}</span>{formatPhoneNumber(c.whatsapp, lang)}</span>}
                                        {c.landlinePhone && <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><PhoneIcon className="w-4 h-4" /><span className="inline-flex items-center w-5 h-[14px]">{getFlagByPhone(c.landlinePhone)}</span>{formatPhoneNumber(c.landlinePhone, lang)}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </FadeSection>
                )}

                {(client.toneOfVoice || client.audienceWho || client.targetAudience || client.objectives || client.kpis || client.strategyNotes) && (
                    <FadeSection className="mb-16">
                        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('strategy')}</h2>
                        <div className="space-y-4 text-gray-700 dark:text-gray-300">
                            {client.toneOfVoice && <p><span className="font-medium text-gray-500 dark:text-gray-400">{t('tone_of_voice')}:</span> <span className="whitespace-pre-wrap">{client.toneOfVoice}</span></p>}
                            {(client.audienceWho || client.targetAudience) && <p><span className="font-medium text-gray-500 dark:text-gray-400">{t('target_audience')}:</span> <span className="whitespace-pre-wrap">{client.audienceWho || client.targetAudience}</span></p>}
                            {client.objectives && <p><span className="font-medium text-gray-500 dark:text-gray-400">{t('objectives')}:</span> <span className="whitespace-pre-wrap">{client.objectives}</span></p>}
                            {client.kpis && <p><span className="font-medium text-gray-500 dark:text-gray-400">{t('kpis')}:</span> <span className="whitespace-pre-wrap">{client.kpis}</span></p>}
                            {client.strategyNotes && <p><span className="font-medium text-gray-500 dark:text-gray-400">{t('strategy_notes')}:</span> <span className="whitespace-pre-wrap">{client.strategyNotes}</span></p>}
                        </div>
                    </FadeSection>
                )}

                {services.length > 0 && (
                    <FadeSection className="mb-16">
                        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('contract')}</h2>
                        <ul className="space-y-2">
                            {services.map(s => (
                                <li key={s.id} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                                    <span className="font-medium">{s.name}</span>
                                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{s.value != null ? formatCurrency(s.value) : '—'}</span>
                                </li>
                            ))}
                        </ul>
                    </FadeSection>
                )}
            </div>

            <style>{`
                @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .print\\:hidden { display: none !important; } .dark { background: #f9fafb !important; color: #111827 !important; } [data-landing-theme="dark"] { background: #f9fafb !important; color: #111827 !important; } }
            `}</style>
        </div>
    );
};
