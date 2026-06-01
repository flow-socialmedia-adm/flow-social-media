import React, { useState, useRef, useEffect } from 'react';
import type { Client, SocialPlatform, SocialLink, FinancialEntry, User } from '../types';
import type { Language } from '../types';
import { ClipboardListIcon, DollarSignIcon, EyeIcon, EllipsisVerticalIcon, GlobeIcon, WhatsAppIcon, PhoneIcon, ChevronRightIcon, UploadCloudIcon, PaletteIcon } from './icons';
import { resolveColorHex, formatPhoneNumber } from '../lib/utils';
import { toUploadUrl } from '../lib/api';
import { resolveClientImageUrl } from '../lib/clientVisual';
import { ColorPickerPopover } from './ColorPickerPopover';
import TooltipHint from './TooltipHint';

export type SectionEmpty = {
    identity: boolean;
    data: boolean;
    guia: boolean;
    strategy: boolean;
    access: boolean;
    contract: boolean;
};

export type TabId = 'identity' | 'overview' | 'client_data' | 'brand_guide' | 'strategy' | 'planning' | 'contract' | 'finance';

const PRESENTATION_SECTION_STYLE = 'group relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 sm:p-8';

/** Dias da semana (valores em preferredPostDays) → chaves i18n day_* */
const PRESENTATION_PLANNING_DAY_I18N: Record<string, string> = {
    mon: 'day_mon',
    tue: 'day_tue',
    wed: 'day_wed',
    thu: 'day_thu',
    fri: 'day_fri',
    sat: 'day_sat',
    sun: 'day_sun',
};

const FINANCE_STATUS_MAP = {
    pending: { textKey: 'status_pending' as const, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
    paid: { textKey: 'status_paid' as const, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    overdue: { textKey: 'status_overdue' as const, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
};

function resolvePlanningAccountOwnerDisplay(raw: string | undefined, teamMembers: User[]): string {
    const v = (raw ?? '').trim();
    if (!v) return '';
    const m = teamMembers.find((u) => u.id === v);
    return m?.name ?? v;
}

export type QuickOverview = {
    postsAtivos: number;
    aguardandoAprovacao: number;
    tarefasPendentes: number;
    proximaRenovacao: string | null;
    statusConta?: 'em_dia' | 'atencao' | 'atrasado';
    tarefasAtrasadas?: number;
    postsAtrasados?: number;
};

export type ClientPresentationViewProps = {
    /** Estado editado: usado no header (logo, nome, cor) para refletir alterações ainda não salvas. */
    editedClient: Client;
    sectionEmpty: SectionEmpty;
    presentationModeForClient: boolean;
    clientPresentationFinanceEntries: FinancialEntry[];
    language: string;
    t: (key: string) => string;
    onBack: () => void;
    onEditClient: () => void;
    onExitPresentation: () => void;
    onPresentationModeChange?: (value: boolean) => void;
    onOpenEditSection: (tabId: TabId) => void;
    onCloseEditSection: () => void;
    editingSectionId: TabId | null;
    renderSectionEditor: (tabId: TabId) => React.ReactNode;
    socialIcons: Record<SocialPlatform, React.FC<{ className?: string }>>;
    onNavigateToPresentation?: () => void;
    quickOverview?: QuickOverview;
    onRequestTabChange?: (tabId: TabId, proceed: () => void) => void;
    onDelete?: () => void;
    /** Atualizar cliente (nome, cor, avatar). Usado para edição inline no header. */
    onUpdate?: (u: Partial<Client>) => void;
    /** Abrir modal de upload (ex.: avatar). */
    onOpenUpload?: (target: 'avatar') => void;
    /** Somente leitura: bloqueia edição no conteúdo (abas mantêm navegação). */
    readOnly?: boolean;
    /** Equipe da agência: resolve nome do responsável pelo cliente quando o valor é userId. */
    teamMembers?: User[];
};

function PresentationPlaceholder({ message, buttonLabel, onAdd, t, showAddButton = true }: { message: string; buttonLabel: string; onAdd: () => void; t: (key: string) => string; showAddButton?: boolean }) {
    return (
        <div className="rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 p-6 text-center">
            <div className="flex justify-center mb-3">
                <ClipboardListIcon className="w-10 h-10 text-gray-400 dark:text-gray-500" aria-hidden />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{message}</p>
            {showAddButton && (
                <button type="button" onClick={onAdd} className="px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded" aria-label={buttonLabel}>
                    {buttonLabel}
                </button>
            )}
        </div>
    );
}

export const ClientPresentationView: React.FC<ClientPresentationViewProps> = (props) => {
    const {
        editedClient,
        sectionEmpty,
        presentationModeForClient,
        clientPresentationFinanceEntries,
        language,
        t,
        onBack,
        onEditClient,
        onExitPresentation,
        onOpenEditSection,
        onCloseEditSection,
        editingSectionId,
        renderSectionEditor,
        socialIcons,
        onNavigateToPresentation,
        quickOverview = { postsAtivos: 0, aguardandoAprovacao: 0, tarefasPendentes: 0, proximaRenovacao: null, statusConta: 'em_dia' },
        onRequestTabChange,
        onDelete,
        onUpdate,
        onOpenUpload,
        readOnly = false,
        teamMembers = [],
    } = props;
    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [nameInputValue, setNameInputValue] = useState('');
    const nameInputRef = useRef<HTMLInputElement>(null);
    const bannerRef = useRef<HTMLDivElement>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [headerSocialIndex, setHeaderSocialIndex] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);

    /** Remove duplicatas mantendo 1 rede por plataforma (primeira ocorrência) */
    const deduplicateSocialLinks = (links: SocialLink[] | undefined): SocialLink[] => {
        if (!links?.length) return [];
        const seen = new Set<SocialPlatform>();
        return links.filter((l) => {
            if (seen.has(l.platform)) return false;
            seen.add(l.platform);
            return true;
        });
    };

    useEffect(() => {
        if (!menuOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuOpen]);

    useEffect(() => {
        if (isEditingName && nameInputRef.current) {
            nameInputRef.current.focus();
            nameInputRef.current.select();
        }
    }, [isEditingName]);

    const startEditingName = () => {
        if (presentationModeForClient || !onUpdate) return;
        setNameInputValue(editedClient.name || '');
        setIsEditingName(true);
    };
    const saveName = () => {
        if (!onUpdate) return;
        const trimmed = nameInputValue.trim();
        onUpdate({ name: trimmed || undefined });
        setIsEditingName(false);
    };

    const canEditHeader = !presentationModeForClient && !!onUpdate && !readOnly;
    const primaryContact = editedClient.contacts?.find((c: { isPrimary?: boolean }) => c.isPrimary) || editedClient.contacts?.[0];
    const tabIds: TabId[] = ['overview', 'client_data', 'brand_guide', 'strategy', 'planning', 'contract', 'finance'];
    const sectionsConfig: { key?: keyof SectionEmpty; label: string; tabId: TabId }[] = [
        { label: t('visao_geral'), tabId: 'overview' },
        { key: 'data', label: t('client_data'), tabId: 'client_data' },
        { key: 'guia', label: t('brand_guide'), tabId: 'brand_guide' },
        { key: 'strategy', label: t('strategy'), tabId: 'strategy' },
        { label: t('planejamento'), tabId: 'planning' },
        { key: 'contract', label: t('contract'), tabId: 'contract' },
        { label: t('finance'), tabId: 'finance' },
    ];
    const nextStepKey = sectionEmpty.data ? 'next_step_complete_data' : sectionEmpty.guia ? 'next_step_add_guia' : sectionEmpty.strategy ? 'next_step_add_strategy' : sectionEmpty.contract ? 'next_step_add_services' : null;
    const formatCurrency = (value: number) => new Intl.NumberFormat(language === 'pt' ? 'pt-BR' : 'en-US', { style: 'currency', currency: editedClient.currency || 'USD' }).format(value);

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto">
            {/* Botão Voltar + Excluir (discreto) */}
            {!presentationModeForClient && (
                <div className="flex items-center justify-between gap-4 mb-10">
                    <button type="button" onClick={onBack} className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1" aria-label={t('back')}>
                        ← {t('back')}
                    </button>
                </div>
            )}
            {/* Header com banner, logo, nome, quick links — usa editedClient para edição inline */}
            <div className="mb-6 -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8">
                {/* Barra de cor — altura 117px */}
                <div ref={bannerRef} className="h-[117px] relative" style={{ backgroundColor: resolveColorHex(editedClient.color) }}>
                    {canEditHeader && isColorPickerOpen && (
                        <ColorPickerPopover
                            color={resolveColorHex(editedClient.color)}
                            onChange={(c) => onUpdate?.({ color: c.replace(/^#/, '') || '475569' })}
                            onClose={() => setIsColorPickerOpen(false)}
                            anchorRef={bannerRef}
                            t={t}
                        />
                    )}
                    {canEditHeader && (
                        <div className="absolute bottom-3 right-4 z-20">
                            <TooltipHint label={t('personalize_cover')}>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setIsColorPickerOpen((v) => !v); }}
                                    className="flex items-center gap-2 px-2.5 py-1.5 text-white text-sm font-medium hover:font-semibold rounded transition-colors drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
                                    aria-label={t('personalize_cover')}
                                >
                                    <PaletteIcon className="w-5 h-5 shrink-0" />
                                    <span>{t('personalize_cover')}</span>
                                </button>
                            </TooltipHint>
                        </div>
                    )}
                    {(() => {
                        const hasPresentation = !presentationModeForClient && !!onNavigateToPresentation;
                        const hasExit = presentationModeForClient;
                        const hasDelete = !!onDelete;
                        const hasAny = hasPresentation || hasExit || hasDelete;
                        if (!hasAny) return null;
                        return (
                            <div className="absolute top-3 right-4 z-20" ref={menuRef}>
                                <TooltipHint label={t('menu_options')}>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
                                        className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-black/20 transition-colors"
                                        aria-label={t('menu_options')}
                                        aria-expanded={menuOpen}
                                    >
                                        <EllipsisVerticalIcon className="w-5 h-5" />
                                    </button>
                                </TooltipHint>
                                {menuOpen && (
                                    <div className="absolute right-0 top-full mt-1 py-1 min-w-[200px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600" onClick={(e) => e.stopPropagation()}>
                                        {hasPresentation && (
                                            <button
                                                type="button"
                                                onClick={() => { setMenuOpen(false); onNavigateToPresentation!(); }}
                                                className="w-full px-4 py-2 flex items-center gap-2 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                            >
                                                <EyeIcon className="w-4 h-4" />
                                                {t('presentation_mode')}
                                            </button>
                                        )}
                                        {hasExit && (
                                            <button
                                                type="button"
                                                onClick={() => { setMenuOpen(false); onExitPresentation(); }}
                                                className="w-full px-4 py-2 flex items-center gap-2 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                            >
                                                <span className="text-lg leading-none w-4 text-center">✕</span>
                                                {t('exit_presentation')}
                                            </button>
                                        )}
                                        {hasDelete && (
                                            <button
                                                type="button"
                                                onClick={() => { setMenuOpen(false); onDelete!(); }}
                                                className="w-full px-4 py-2 flex items-center gap-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                {t('delete_client')}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
                {/* Logo (metade na barra) + nome + links — mesma base que a edição (prévia antes de salvar). */}
                <div className="px-4 sm:px-6 lg:px-8 -mt-[85px] relative z-10 flex items-end gap-6 flex-wrap">
                    <div
                        className={`relative shrink-0 group/avatar ${canEditHeader && onOpenUpload ? 'cursor-pointer' : ''}`}
                        onClick={(e) => { e.stopPropagation(); canEditHeader && onOpenUpload && onOpenUpload('avatar'); }}
                        role={canEditHeader && onOpenUpload ? 'button' : undefined}
                        tabIndex={canEditHeader && onOpenUpload ? 0 : undefined}
                        onKeyDown={canEditHeader && onOpenUpload ? (e) => e.key === 'Enter' && onOpenUpload('avatar') : undefined}
                        aria-label={canEditHeader && onOpenUpload ? t('add_logo_or_photo') : undefined}
                    >
                        {(() => {
                            const headerLogoUrl = resolveClientImageUrl(editedClient);
                            return headerLogoUrl ? (
                                <div
                                    className="w-[170px] h-[170px] rounded-full overflow-hidden flex items-center justify-center shrink-0 border-4 border-white dark:border-gray-800 shadow-lg"
                                    // O header deve "materializar" a transparência com fundo branco.
                                    style={{ backgroundColor: '#ffffff' }}
                                >
                                    <img src={toUploadUrl(headerLogoUrl)} alt={editedClient.name || ''} className="max-w-full max-h-full w-auto h-auto object-contain" style={{ background: 'transparent' }} />
                                </div>
                            ) : (
                            <div className="w-[170px] h-[170px] rounded-full flex items-center justify-center text-white text-5xl font-bold border-4 border-white dark:border-gray-800 shadow-lg shrink-0 transition-opacity group-hover/avatar:opacity-0" style={{ backgroundColor: resolveColorHex(editedClient.color) }}>
                                {editedClient.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            );
                        })()}
                        {canEditHeader && onOpenUpload && (
                            <div className="absolute inset-0 rounded-full border-4 border-white dark:border-gray-800 bg-gray-500 dark:bg-gray-600 flex flex-col items-center justify-center gap-2 opacity-0 group-hover/avatar:opacity-100 transition-opacity pointer-events-none">
                                <UploadCloudIcon className="w-12 h-12 text-white shrink-0" aria-hidden />
                                <span className="text-white text-sm font-medium text-center px-2 leading-tight">
                                    <span className="block">{t('add_logo_line1')}</span>
                                    <span className="block">{t('add_logo_line2')}</span>
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0 self-start pt-8">
                        {isEditingName ? (
                            <input
                                ref={nameInputRef}
                                type="text"
                                value={nameInputValue}
                                onChange={(e) => setNameInputValue(e.target.value)}
                                onBlur={saveName}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setNameInputValue(editedClient.name || ''); setIsEditingName(false); } }}
                                className="text-2xl font-bold text-white leading-tight bg-transparent border-0 p-0 m-0 min-w-[120px] focus:outline-none focus:ring-0 placeholder:text-white/60"
                                placeholder={t('new_client')}
                            />
                        ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1
                                    className={`text-2xl font-bold text-white leading-tight transition-colors ${canEditHeader ? 'cursor-text hover:text-white/90' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); canEditHeader && startEditingName(); }}
                                    role={canEditHeader ? 'button' : undefined}
                                    tabIndex={canEditHeader ? 0 : undefined}
                                    onKeyDown={canEditHeader ? (e) => e.key === 'Enter' && startEditingName() : undefined}
                                    aria-label={canEditHeader ? t('client') : undefined}
                                >
                                    {editedClient.name || t('new_client')}
                                </h1>
                                {quickOverview.statusConta && (
                                    <span
                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            quickOverview.statusConta === 'em_dia'
                                                ? 'bg-emerald-500/90 text-white'
                                                : quickOverview.statusConta === 'atencao'
                                                ? 'bg-amber-500/90 text-white'
                                                : 'bg-red-500/90 text-white'
                                        }`}
                                    >
                                        {quickOverview.statusConta === 'em_dia'
                                            ? t('overview_status_em_dia')
                                            : quickOverview.statusConta === 'atencao'
                                            ? t('overview_status_atencao')
                                            : t('overview_status_atrasado')}
                                    </span>
                                )}
                            </div>
                        )}
                        {/* Ficha de contato — Linha 1: redes (carrossel), Linha 2: site, Linha 3: telefones */}
                        {(() => {
                            const links = deduplicateSocialLinks(editedClient.socialLinks);
                            const hasSocial = links.length > 0;
                            const hasWebsite = !!(editedClient.website?.trim());
                            const hasWa = !!(primaryContact?.whatsapp?.trim());
                            const hasPhone = !!(primaryContact?.landlinePhone?.trim());
                            const hasAny = hasSocial || hasWebsite || hasWa || hasPhone;
                            if (!hasAny) return null;

                            const lang = (language || 'pt') as Language;
                            const linkCls = 'inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:underline transition-colors';
                            const bullet = <span className="text-gray-300 dark:text-gray-500 text-xs mx-2 select-none" aria-hidden>•</span>;

                            return (
                                <div className="flex flex-col gap-1.5 mt-12">
                                    {/* Linha 1: Redes sociais (carrossel com seta imediatamente ao lado do link) */}
                                    {hasSocial && (() => {
                                        const current = links[headerSocialIndex % links.length];
                                        const displayUrl = current.url?.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') || '';
                                        const SocialIcon = socialIcons[current.platform];
                                        return (
                                            <div className="flex items-center gap-1 min-h-[24px] min-w-0 w-fit max-w-full">
                                                <a
                                                    href={current.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`flex items-center gap-1.5 min-w-0 overflow-hidden ${linkCls}`}
                                                    aria-label={current.platform}
                                                >
                                                    {SocialIcon ? <SocialIcon className="w-4 h-4 shrink-0" /> : null}
                                                    <span className="truncate">{displayUrl}</span>
                                                </a>
                                                {links.length > 1 && (
                                                    <TooltipHint label={t('next_social_link')}>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); setHeaderSocialIndex((i) => (i + 1) % links.length); }}
                                                            className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 shrink-0"
                                                            aria-label={t('next_social_link')}
                                                        >
                                                            <ChevronRightIcon className="w-4 h-4" />
                                                        </button>
                                                    </TooltipHint>
                                                )}
                                            </div>
                                        );
                                    })()}
                                    {/* Linha 2: Site */}
                                    {hasWebsite && (
                                        <div className="flex flex-wrap items-center gap-y-1">
                                            <a href={editedClient.website!.startsWith('http') ? editedClient.website! : `https://${editedClient.website}`} target="_blank" rel="noopener noreferrer" className={linkCls} aria-label="Website">
                                                <GlobeIcon className="w-4 h-4 shrink-0" />
                                                <span className="break-all">{editedClient.website!.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</span>
                                            </a>
                                        </div>
                                    )}
                                    {/* Linha 3: Telefones */}
                                    {(hasWa || hasPhone) && (
                                        <div className="flex flex-wrap items-center gap-y-1">
                                            {hasWa && (
                                                <a href={`https://wa.me/${(primaryContact!.whatsapp || '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className={linkCls} aria-label="WhatsApp">
                                                    <WhatsAppIcon className="w-4 h-4 shrink-0" />
                                                    <span>{formatPhoneNumber(primaryContact!.whatsapp!, lang)}</span>
                                                </a>
                                            )}
                                            {hasWa && hasPhone && bullet}
                                            {hasPhone && (
                                                <a href={`tel:${(primaryContact!.landlinePhone || '').replace(/\D/g, '')}`} className={linkCls} aria-label="Telefone">
                                                    <PhoneIcon className="w-4 h-4 shrink-0" />
                                                    <span>{formatPhoneNumber(primaryContact!.landlinePhone!, lang)}</span>
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>
            {/* Espaço entre header e abas (cards operacionais removidos — futuramente na aba Visão geral) */}
            {!presentationModeForClient && <div className="h-6" />}
            {/* Abas horizontais */}
            {!presentationModeForClient && (
                <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-wrap gap-2 pb-2">
                        {sectionsConfig.map(({ label, tabId }) => (
                            <button
                                key={tabId}
                                type="button"
                                onClick={() => {
                                    const proceed = () => {
                                        setActiveTab(tabId);
                                        if (editingSectionId) onCloseEditSection();
                                    };
                                    if (onRequestTabChange) {
                                        onRequestTabChange(tabId, proceed);
                                    } else {
                                        proceed();
                                    }
                                }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tabId ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            <div className={`space-y-8 pb-12${readOnly ? ' pointer-events-none select-text [&_a]:pointer-events-auto' : ''}`}>
                {(presentationModeForClient || activeTab === 'overview') && (
                !presentationModeForClient ? (
                    renderSectionEditor('overview')
                ) : (
                    <section className={PRESENTATION_SECTION_STYLE}>
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">{t('visao_geral')}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('visao_geral_placeholder_desc')}</p>
                    </section>
                )
                )}
                {(presentationModeForClient || activeTab === 'client_data') && (
                !presentationModeForClient ? (
                    renderSectionEditor('client_data')
                ) : (
                    <section className={PRESENTATION_SECTION_STYLE}>
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">{t('client_data')}</h3>
                        <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                            {(editedClient.legalRepresentativeName || editedClient.companyName || editedClient.name) && <p>{editedClient.name || editedClient.legalRepresentativeName || editedClient.companyName}</p>}
                            {editedClient.cnpj && <p>CNPJ: {editedClient.cnpj}</p>}
                            {editedClient.contacts?.map((c) => <p key={c.id}>{c.email}</p>)}
                        </div>
                    </section>
                )
                )}
                {(presentationModeForClient || activeTab === 'brand_guide') && (
                !presentationModeForClient ? (
                    renderSectionEditor('brand_guide')
                ) : (
                    <section className={PRESENTATION_SECTION_STYLE}>
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">{t('brand_guide')}</h3>
                        <div className="text-sm text-gray-700 dark:text-gray-300 space-y-3">
                            {editedClient.brandColors?.length ? (
                                <div className="flex flex-wrap gap-2 items-center">
                                    {(editedClient.brandColors.some(c => c.showInPresentation) ? editedClient.brandColors.filter(c => c.showInPresentation) : editedClient.brandColors).map((c, colorIdx) => {
                                        const hex = resolveColorHex(c.hex);
                                        const namePart = (c.name || '').trim();
                                        const chipLabel = namePart ? `${namePart} ${hex}` : hex;
                                        return (
                                            <TooltipHint key={`${hex}-${colorIdx}`} label={chipLabel}>
                                                <span
                                                    className="w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-600 inline-block"
                                                    style={{ backgroundColor: hex }}
                                                    role="img"
                                                    aria-label={chipLabel}
                                                />
                                            </TooltipHint>
                                        );
                                    })}
                                </div>
                            ) : null}
                            {(editedClient.typography?.primaryFont || editedClient.typography?.primaryFontAssetId) && (
                                <p><span className="font-medium text-gray-500">{(editedClient.typography?.primaryFontLabel || '').trim() || t('primary_font')}:</span>{' '}
                                    {editedClient.typography?.primaryFont ? (
                                        <span style={{ fontFamily: editedClient.typography.primaryFont }}>{editedClient.typography.primaryFont}</span>
                                    ) : (
                                        editedClient.brandAssets?.find(a => a.id === editedClient.typography?.primaryFontAssetId)?.name || t('file_name')
                                    )}
                                </p>
                            )}
                            {(editedClient.typography?.secondaryFont || editedClient.typography?.secondaryFontAssetId) && (
                                <p><span className="font-medium text-gray-500">{(editedClient.typography?.secondaryFontLabel || '').trim() || t('secondary_font')}:</span>{' '}
                                    {editedClient.typography?.secondaryFont ? (
                                        <span style={{ fontFamily: editedClient.typography.secondaryFont }}>{editedClient.typography.secondaryFont}</span>
                                    ) : (
                                        editedClient.brandAssets?.find(a => a.id === editedClient.typography?.secondaryFontAssetId)?.name || t('file_name')
                                    )}
                                </p>
                            )}
                            {(editedClient.typography?.tertiaryFont || editedClient.typography?.tertiaryFontAssetId) && (
                                <p><span className="font-medium text-gray-500">{(editedClient.typography?.tertiaryFontLabel || '').trim() || t('tertiary_font')}:</span>{' '}
                                    {editedClient.typography?.tertiaryFont ? (
                                        <span style={{ fontFamily: editedClient.typography.tertiaryFont }}>{editedClient.typography.tertiaryFont}</span>
                                    ) : (
                                        editedClient.brandAssets?.find(a => a.id === editedClient.typography?.tertiaryFontAssetId)?.name || t('file_name')
                                    )}
                                </p>
                            )}
                            {(editedClient.brandAssets?.filter(a => a.type === 'logo')?.length ?? 0) > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {editedClient.brandAssets?.filter(a => a.type === 'logo').map(a => a.url && <img key={a.id} src={toUploadUrl(a.url)} alt={a.name} className="h-12 object-contain rounded" />)}
                                </div>
                            )}
                        </div>
                    </section>
                )
                )}
                {(presentationModeForClient || activeTab === 'strategy') && (
                !presentationModeForClient ? (
                    renderSectionEditor('strategy')
                ) : (
                    <section className={PRESENTATION_SECTION_STYLE}>
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">{t('strategy')}</h3>
                        <div className="text-sm text-gray-700 dark:text-gray-300 space-y-3 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_strong]:font-semibold [&_em]:italic">
                            {editedClient.brandGuidelines && (
                                <p>
                                    <span className="font-medium text-gray-500">{t('directives')}:</span>{' '}
                                    {editedClient.brandGuidelines.includes('<') ? (
                                        <span dangerouslySetInnerHTML={{ __html: editedClient.brandGuidelines }} />
                                    ) : (
                                        <span className="whitespace-pre-wrap">{editedClient.brandGuidelines}</span>
                                    )}
                                </p>
                            )}
                            {editedClient.toneOfVoice && (
                                <p>
                                    <span className="font-medium text-gray-500">{t('tone_of_voice')}:</span>{' '}
                                    {editedClient.toneOfVoice.includes('<') ? (
                                        <span dangerouslySetInnerHTML={{ __html: editedClient.toneOfVoice }} />
                                    ) : (
                                        <span className="whitespace-pre-wrap">{editedClient.toneOfVoice}</span>
                                    )}
                                </p>
                            )}
                            {(editedClient.audienceWho || editedClient.targetAudience || editedClient.audiencePains || editedClient.audienceDesires) && (
                                <div>
                                    <span className="font-medium text-gray-500">{t('target_audience')}:</span>
                                    <div className="pl-2 border-l-2 border-gray-200 dark:border-gray-600 mt-1 space-y-1">
                                        {(editedClient.audienceWho || editedClient.targetAudience) && (
                                            <p>
                                                <span className="text-xs text-gray-500">{t('audience_who')}:</span>{' '}
                                                {(editedClient.audienceWho || editedClient.targetAudience || '').includes('<') ? (
                                                    <span dangerouslySetInnerHTML={{ __html: editedClient.audienceWho || editedClient.targetAudience || '' }} />
                                                ) : (
                                                    <span className="whitespace-pre-wrap">{editedClient.audienceWho || editedClient.targetAudience}</span>
                                                )}
                                            </p>
                                        )}
                                        {editedClient.audiencePains && (
                                            <p>
                                                <span className="text-xs text-gray-500">{t('audience_pains')}:</span>{' '}
                                                {editedClient.audiencePains.includes('<') ? <span dangerouslySetInnerHTML={{ __html: editedClient.audiencePains }} /> : <span className="whitespace-pre-wrap">{editedClient.audiencePains}</span>}
                                            </p>
                                        )}
                                        {editedClient.audienceDesires && (
                                            <p>
                                                <span className="text-xs text-gray-500">{t('audience_desires')}:</span>{' '}
                                                {editedClient.audienceDesires.includes('<') ? <span dangerouslySetInnerHTML={{ __html: editedClient.audienceDesires }} /> : <span className="whitespace-pre-wrap">{editedClient.audienceDesires}</span>}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                            {editedClient.objectives && (
                                <p>
                                    <span className="font-medium text-gray-500">{t('objectives')}:</span>{' '}
                                    {editedClient.objectives.includes('<') ? <span dangerouslySetInnerHTML={{ __html: editedClient.objectives }} /> : <span className="whitespace-pre-wrap">{editedClient.objectives}</span>}
                                </p>
                            )}
                            {editedClient.kpis && (
                                <p>
                                    <span className="font-medium text-gray-500">{t('kpis')}:</span>{' '}
                                    {editedClient.kpis.includes('<') ? <span dangerouslySetInnerHTML={{ __html: editedClient.kpis }} /> : <span className="whitespace-pre-wrap">{editedClient.kpis}</span>}
                                </p>
                            )}
                            {editedClient.strategyNotes && (
                                <p>
                                    <span className="font-medium text-gray-500">{t('strategy_notes')}:</span>{' '}
                                    {editedClient.strategyNotes.includes('<') ? <span dangerouslySetInnerHTML={{ __html: editedClient.strategyNotes }} /> : <span className="whitespace-pre-wrap">{editedClient.strategyNotes}</span>}
                                </p>
                            )}
                        </div>
                    </section>
                )
                )}
                {(presentationModeForClient || activeTab === 'planning') && (
                !presentationModeForClient ? (
                    renderSectionEditor('planning')
                ) : (
                    <section className={PRESENTATION_SECTION_STYLE}>
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">{t('planejamento')}</h3>
                        <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                            {editedClient.postFrequency && (
                                <p><span className="font-medium text-gray-500">{t('post_frequency')}:</span> {editedClient.postFrequency}</p>
                            )}
                            {(editedClient.preferredPostDays?.length ?? 0) > 0 && (
                                <p><span className="font-medium text-gray-500">{t('preferred_post_days')}:</span>{' '}
                                    {editedClient.preferredPostDays!.map((d) => t(PRESENTATION_PLANNING_DAY_I18N[d] || 'day_mon')).join(', ')}
                                </p>
                            )}
                            {editedClient.planningAccountOwner && (
                                <p>
                                    <span className="font-medium text-gray-500">{t('planning_account_owner_label')}:</span>{' '}
                                    {resolvePlanningAccountOwnerDisplay(editedClient.planningAccountOwner, teamMembers)}
                                </p>
                            )}
                            {!editedClient.postFrequency && !(editedClient.preferredPostDays?.length) && !editedClient.planningAccountOwner && !editedClient.kpis && (
                                <p className="text-gray-500 dark:text-gray-400">{t('planning_presentation_empty')}</p>
                            )}
                            {editedClient.kpis && (
                                <p><span className="font-medium text-gray-500">{t('planning_kpis_label')}:</span> <span className="whitespace-pre-wrap">{editedClient.kpis}</span></p>
                            )}
                        </div>
                    </section>
                )
                )}
                {(presentationModeForClient || activeTab === 'contract') && (
                !presentationModeForClient ? (
                    renderSectionEditor('contract')
                ) : (
                    <section className={PRESENTATION_SECTION_STYLE}>
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">{t('contract')}</h3>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                            {editedClient.contract?.services?.map((s) => <li key={s.id} className="flex justify-between"><span>{s.name}</span><span>{s.value != null ? new Intl.NumberFormat(language === 'pt' ? 'pt-BR' : 'en-US', { style: 'currency', currency: editedClient.currency || 'BRL' }).format(s.value) : '—'}</span></li>)}
                        </ul>
                    </section>
                )
                )}
                {(presentationModeForClient || activeTab === 'finance') && (
                <div className="space-y-6">
                    {(() => {
                        const pending = clientPresentationFinanceEntries.filter(e => e.status === 'pending' || e.status === 'overdue');
                        const paid = clientPresentationFinanceEntries.filter(e => e.status === 'paid');
                        const nextPayment = pending.length > 0
                            ? [...pending].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]
                            : null;
                        const totalReceived = paid.reduce((s, e) => s + e.value, 0);
                        const totalPending = pending.reduce((s, e) => s + e.value, 0);

                        return (
                            <div className="grid grid-cols-3 gap-3 mb-2">
                                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Próximo pagamento</p>
                                    {nextPayment ? (
                                        <>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(nextPayment.value)}</p>
                                            <TooltipHint
                                                label={`${new Date(nextPayment.dueDate + 'T00:00').toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US')} · ${nextPayment.description?.trim() || '-'}`}
                                                className="block min-w-0"
                                            >
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                    {new Date(nextPayment.dueDate + 'T00:00').toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US')} · {nextPayment.description}
                                                </p>
                                            </TooltipHint>
                                        </>
                                    ) : (
                                        <p className="text-sm text-gray-400">—</p>
                                    )}
                                </div>
                                <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                                    <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400">A receber</p>
                                    <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">{formatCurrency(totalPending)}</p>
                                    <p className="text-xs text-yellow-600 dark:text-yellow-400">{pending.length} {pending.length === 1 ? 'item' : 'itens'}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                    <p className="text-xs font-medium text-green-600 dark:text-green-400">Recebido</p>
                                    <p className="text-sm font-semibold text-green-700 dark:text-green-300">{formatCurrency(totalReceived)}</p>
                                    <p className="text-xs text-green-600 dark:text-green-400">{paid.length} {paid.length === 1 ? 'pagamento' : 'pagamentos'}</p>
                                </div>
                            </div>
                        );
                    })()}

                    {clientPresentationFinanceEntries.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-900/50">
                                    <tr>
                                        <th className="p-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('description')}</th>
                                        <th className="p-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('value')}</th>
                                        <th className="p-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('due_date')}</th>
                                        <th className="p-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('payment_date')}</th>
                                        <th className="p-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('status')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {clientPresentationFinanceEntries.map((entry) => {
                                        const { textKey, color } = FINANCE_STATUS_MAP[entry.status];
                                        const desc = entry.description?.trim() || '-';
                                        return (
                                            <tr key={entry.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                                                <td className="p-3 text-sm max-w-[220px] sm:max-w-xs align-top">
                                                    <TooltipHint label={desc} className="block w-full min-w-0">
                                                        <span className="block truncate">{desc}</span>
                                                    </TooltipHint>
                                                </td>
                                                <td className="p-3 text-sm font-semibold text-right">{formatCurrency(entry.value)}</td>
                                                <td className="p-3 text-sm text-center">{new Date(entry.dueDate + 'T00:00:00').toLocaleDateString(language)}</td>
                                                <td className="p-3 text-sm text-center">{entry.paymentDate ? new Date(entry.paymentDate + 'T00:00:00').toLocaleDateString(language) : '—'}</td>
                                                <td className="p-3 text-center"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${color}`}>{t(textKey)}</span></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('no_financial_entries_yet')}</p>
                    )}
                </div>
                )}
            </div>
        </div>
    );
};
