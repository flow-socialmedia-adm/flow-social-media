import React, { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import type { Client } from '../../../types';
import { UnsavedChangesBar } from '../UnsavedChangesBar';
import { CollapsibleBlock } from '../CollapsibleBlock';
import { createPortal } from 'react-dom';
import { PlusIcon, XIcon, ChevronRightIcon, ChevronLeftIcon, ChevronDownIcon, InfoIcon, UploadCloudIcon } from '../../icons';
import TooltipHint from '../../TooltipHint';
import { toUploadUrl } from '../../../lib/api';

const PILLAR_SUGGESTIONS: Array<{ name: string; description?: string }> = [
    { name: 'Autoridade', description: 'Dúvidas frequentes, orientações e posicionamento como referência' },
    { name: 'Conversão', description: 'Chamadas para ação e ofertas' },
    { name: 'Conexão', description: 'Relacionamento, empatia e proximidade com o público' },
    { name: 'Bastidores', description: 'Rotina, equipe e processo de trabalho' },
    { name: 'Prova social', description: 'Depoimentos, resultados e antes e depois' },
    { name: 'Educação', description: 'Conteúdo informativo e ensino' },
    { name: 'Objeções', description: 'Esclarecimento de dúvidas e mitos' },
    { name: 'Institucional', description: 'História, valores e cultura da marca' },
];

/** Converte HTML existente para texto puro (compatibilidade com dados antigos). */
function htmlToPlainText(html: string): string {
    if (!html || !html.trim()) return '';
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
}

/** Exibe valor que pode ser HTML ou texto; retorna sempre texto para textarea. */
function toEditableValue(val: string | undefined): string {
    if (!val) return '';
    return val.includes('<') ? htmlToPlainText(val) : val;
}

/** 10 campos essenciais para a regra x/10 preenchidos (Etapa A) */
const STRATEGY_ESSENTIAL_TOTAL = 10;

function computeFilledCount(c: Client): number {
    const str = (v: unknown) => (typeof v === 'string' ? (v as string).trim() : '');
    let count = 0;
    if (str(c.brandHistory || c.brandGuidelines)) count++;
    if (str(c.brandValues)) count++;
    if (str(c.brandMission)) count++;
    if (str(c.brandVision)) count++;
    if (str(c.mainServices)) count++;
    if (str(c.differentiators)) count++;
    if (str(c.howWantToBePerceived)) count++;
    const hasPublico = str(c.audienceAgeRange) || str(c.audienceRegion) || str(c.audienceGeneralProfile) ||
        ((c.strategyPersonas ?? []).some((p) => (p.name ?? '').trim()));
    if (hasPublico) count++;
    const hasObjetivos = str(c.mainProfileObjective) || str(c.momentObjective) || str(c.monthlyObjective);
    if (hasObjetivos) count++;
    const hasPillar = (c.strategyContentPillars ?? []).some((p) => (p.name ?? '').trim());
    if (hasPillar) count++;
    return count;
}

function formatLastUpdated(iso: string | undefined): string {
    if (!iso || !iso.trim()) return '—';
    try {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '—';
        return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
        return '—';
    }
}

export type StrategySectionEditorProps = {
    editedClient: Client;
    handlers: {
        onUpdate: (u: Partial<Client>) => void;
        onCancel: () => void;
        onSave: () => void;
        requestConfirmation: (cb: () => void) => void;
    };
    isDirty: boolean;
    saveBarMessage: { text: string; type: 'success' | 'error' } | null;
    onFeedbackDismiss: () => void;
    t: (k: string) => string;
    /** Abre o modal de upload para foto da persona (Etapa B). */
    onOpenPersonaPhotoUpload?: (personaIdx: number) => void;
    /** Estado de expansão dos blocos (controlado pelo pai para preservar ao trocar de guia). */
    expandedSections: Record<string, boolean>;
    /** Callback para atualizar o estado de expansão. */
    onExpandedSectionsChange: (next: Record<string, boolean>) => void;
    embeddedSaveBar?: boolean;
};

const PillarsHelpPopover: React.FC<{ t: (k: string) => string }> = ({ t }) => {
    const [open, setOpen] = useState(false);
    const [page, setPage] = useState(1);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
    const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const popoverWidth = 288;
    const popoverHeight = 420;

    useEffect(() => {
        if (open) setPage(1);
    }, [open]);

    const updatePosition = () => {
        const trigger = triggerRef.current;
        if (!trigger || typeof document === 'undefined') return;
        const rect = trigger.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const showAbove = spaceBelow < popoverHeight && rect.top > spaceBelow;
        const top = showAbove ? rect.top - popoverHeight - 8 : rect.bottom + 8;
        const left = Math.max(8, Math.min(rect.left, window.innerWidth - popoverWidth - 8));
        setPopoverStyle({
            position: 'fixed',
            top,
            left,
            width: popoverWidth,
            zIndex: 9999,
        });
    };

    useLayoutEffect(() => {
        if (!open) return;
        updatePosition();
        const ro = new ResizeObserver(updatePosition);
        if (triggerRef.current) ro.observe(triggerRef.current);
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        return () => {
            ro.disconnect();
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onDocClick = (e: MouseEvent) => {
            const trigger = triggerRef.current;
            const popover = popoverRef.current;
            if (popover && !popover.contains(e.target as Node) && trigger && !trigger.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, [open]);

    useEffect(() => () => { if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current); }, []);

    const handleMouseEnter = () => {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        setOpen(true);
    };
    const handleMouseLeave = () => {
        hoverTimerRef.current = setTimeout(() => setOpen(false), 150);
    };

    const renderPageContent = () => {
        if (page === 1) {
            return (
                <>
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1.5">{t('content_pillars')}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{t('pillars_explanation')}</p>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('pillars_popover_ideal_subtitle')}</p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5 list-disc list-inside">
                        {t('pillars_popover_ideal_items').split('\n').map((line, i) => (
                            <li key={i}>{line}</li>
                        ))}
                    </ul>
                </>
            );
        }
        if (page === 2) {
            const exLines = t('pillars_popover_ex1_example').split('\n');
            return (
                <>
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1.5">{t('pillars_popover_ex1_title')}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1.5">{t('pillars_popover_ex1_text')}</p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5 list-disc list-inside mb-2">
                        {t('pillars_popover_ex1_list').split('\n').map((line, i) => (
                            <li key={i}>{line}</li>
                        ))}
                    </ul>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('pillars_popover_ex1_aux')}</p>
                    <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded p-2 space-y-1">
                        {exLines.map((line, i) => (
                            <p key={i}>{line}</p>
                        ))}
                    </div>
                </>
            );
        }
        if (page === 3) {
            const exLines = t('pillars_popover_ex2_example').split('\n');
            return (
                <>
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1.5">{t('pillars_popover_ex2_title')}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1.5">{t('pillars_popover_ex2_text')}</p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5 list-disc list-inside mb-2">
                        {t('pillars_popover_ex2_list').split('\n').map((line, i) => (
                            <li key={i}>{line}</li>
                        ))}
                    </ul>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('pillars_popover_ex2_aux')}</p>
                    <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded p-2 space-y-1">
                        {exLines.map((line, i) => (
                            <p key={i}>{line}</p>
                        ))}
                    </div>
                </>
            );
        }
        const exLines = t('pillars_popover_ex3_example').split('\n');
        return (
            <>
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1.5">{t('pillars_popover_ex3_title')}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1.5">{t('pillars_popover_ex3_text')}</p>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5 list-disc list-inside mb-2">
                    {t('pillars_popover_ex3_list').split('\n').map((line, i) => (
                        <li key={i}>{line}</li>
                    ))}
                </ul>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('pillars_popover_ex3_aux')}</p>
                <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded p-2 space-y-1">
                    {exLines.map((line, i) => (
                        <p key={i}>{line}</p>
                    ))}
                </div>
            </>
        );
    };

    const popoverEl = open ? (
        <div
            ref={popoverRef}
            style={popoverStyle}
            className="w-72 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-xl p-3 text-left"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-gray-200 dark:border-gray-600">
                <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={`p-0.5 rounded ${page === 1 ? 'opacity-50 cursor-not-allowed text-gray-400' : 'text-gray-600 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400'}`}
                    aria-label="Anterior"
                >
                    <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400">{page}/4</span>
                <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(4, p + 1))}
                    disabled={page === 4}
                    className={`p-0.5 rounded ${page === 4 ? 'opacity-50 cursor-not-allowed text-gray-400' : 'text-gray-600 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400'}`}
                    aria-label="Próximo"
                >
                    <ChevronRightIcon className="w-4 h-4" />
                </button>
            </div>
            <div className="min-h-[320px] max-h-[360px] overflow-y-auto">{renderPageContent()}</div>
        </div>
    ) : null;

    return (
        <span className="inline-flex" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="p-1 rounded text-gray-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                aria-label={t('content_pillars')}
            >
                <InfoIcon className="w-4 h-4" />
            </button>
            {popoverEl && typeof document !== 'undefined' && createPortal(popoverEl, document.body)}
        </span>
    );
};

const BLOCK_ACCENTS = {
    essencia: 'border-l-indigo-500',
    publico: 'border-l-emerald-500',
    comunicacao: 'border-l-amber-500',
};

const SectionBlock: React.FC<{ title: string; description: string; accent?: keyof typeof BLOCK_ACCENTS; expanded: boolean; onToggle: () => void; children: React.ReactNode }> = ({ title, description, accent, expanded, onToggle, children }) => (
    <section className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden ${accent ? `border-l-4 ${BLOCK_ACCENTS[accent]}` : ''}`}>
        <button type="button" onClick={onToggle} className="w-full flex items-center gap-3 px-5 py-4 text-left border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            {expanded ? <ChevronDownIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" /> : <ChevronRightIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />}
            <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
            </div>
        </button>
        {expanded && <div className="p-5 space-y-3">{children}</div>}
    </section>
);

const SimpleInput: React.FC<{
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    label?: string;
    hint?: string;
    rows?: number;
}> = ({ value, onChange, placeholder, label, hint, rows = 2 }) => (
    <div>
        {label && <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{label}</label>}
        <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        />
        {hint && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
);


export const StrategySectionEditor: React.FC<StrategySectionEditorProps> = (props) => {
    const {
        editedClient,
        handlers: { onUpdate, onCancel, onSave, requestConfirmation },
        isDirty,
        saveBarMessage,
        onFeedbackDismiss,
        t,
        onOpenPersonaPhotoUpload,
        expandedSections,
        onExpandedSectionsChange,
        embeddedSaveBar = true,
    } = props;

    const toggleSection = (key: string) => {
        onExpandedSectionsChange({ ...expandedSections, [key]: !expandedSections[key] });
    };

    const filledCount = useMemo(() => computeFilledCount(editedClient), [editedClient]);
    const pillarCount = editedClient.strategyContentPillars?.length ?? 0;
    const monthlyObj = editedClient.monthlyObjective || editedClient.momentObjective || '';
    const lastUpdated = formatLastUpdated(editedClient.strategyLastUpdated);

    const lastAddedPillarIdRef = useRef<string | null>(null);
    const pillarNameInputRef = useRef<HTMLInputElement>(null);

    const addPillar = (name = '', description = '') => {
        const pillars = editedClient.strategyContentPillars ?? [];
        const newId = `pilar-${Date.now()}`;
        lastAddedPillarIdRef.current = newId;
        onExpandedSectionsChange({ ...expandedSections, pillars: true });
        onUpdate({
            strategyContentPillars: [
                ...pillars,
                { id: newId, name, description, objective: '', exampleThemes: '' },
            ],
        });
    };

    const addPillarFromSuggestion = (suggestion: { name: string; description?: string }) => {
        addPillar(suggestion.name, suggestion.description || '');
    };

    const updatePillar = (idx: number, patch: Partial<{ name: string; description?: string; objective?: string; exampleThemes?: string }>) => {
        const pillars = [...(editedClient.strategyContentPillars ?? [])];
        if (!pillars[idx]) return;
        pillars[idx] = { ...pillars[idx], ...patch };
        onUpdate({ strategyContentPillars: pillars });
    };

    const removePillar = (idx: number) => {
        const pillars = (editedClient.strategyContentPillars ?? []).filter((_, i) => i !== idx);
        onUpdate({ strategyContentPillars: pillars });
    };

    const addCompetitor = () => {
        const list = editedClient.strategyCompetitors ?? [];
        onUpdate({ strategyCompetitors: [...list, { id: `comp-${Date.now()}`, name: '', link: '', strengths: '', weaknesses: '', notes: '' }] });
    };
    const updateCompetitor = (idx: number, patch: Partial<{ name: string; link?: string; strengths?: string; weaknesses?: string; notes?: string }>) => {
        const list = [...(editedClient.strategyCompetitors ?? [])];
        if (!list[idx]) return;
        list[idx] = { ...list[idx], ...patch };
        onUpdate({ strategyCompetitors: list });
    };
    const removeCompetitor = (idx: number) => {
        onUpdate({ strategyCompetitors: (editedClient.strategyCompetitors ?? []).filter((_, i) => i !== idx) });
    };

    const addInspiration = () => {
        const list = editedClient.strategyInspirations ?? [];
        onUpdate({ strategyInspirations: [...list, { id: `insp-${Date.now()}`, name: '', link: '', whatInspires: '', notes: '' }] });
    };
    const updateInspiration = (idx: number, patch: Partial<{ name: string; link?: string; whatInspires?: string; notes?: string }>) => {
        const list = [...(editedClient.strategyInspirations ?? [])];
        if (!list[idx]) return;
        list[idx] = { ...list[idx], ...patch };
        onUpdate({ strategyInspirations: list });
    };
    const removeInspiration = (idx: number) => {
        onUpdate({ strategyInspirations: (editedClient.strategyInspirations ?? []).filter((_, i) => i !== idx) });
    };

    const addPersona = () => {
        const list = editedClient.strategyPersonas ?? [];
        onUpdate({ strategyPersonas: [...list, { id: `persona-${Date.now()}`, name: '', description: '', pains: '', desires: '', objections: '', behavior: '' }] });
    };
    const updatePersona = (idx: number, patch: Partial<{ name: string; description?: string; pains?: string; desires?: string; objections?: string; behavior?: string; photoUrl?: string }>) => {
        const list = [...(editedClient.strategyPersonas ?? [])];
        if (!list[idx]) return;
        list[idx] = { ...list[idx], ...patch };
        onUpdate({ strategyPersonas: list });
    };
    const removePersona = (idx: number) => {
        onUpdate({ strategyPersonas: (editedClient.strategyPersonas ?? []).filter((_, i) => i !== idx) });
    };

    useEffect(() => {
        const pendingId = lastAddedPillarIdRef.current;
        if (!pendingId) return;
        const pillars = editedClient.strategyContentPillars ?? [];
        const idx = pillars.findIndex((p) => p.id === pendingId);
        if (idx < 0) return;
        lastAddedPillarIdRef.current = null;
        const raf = requestAnimationFrame(() => {
            const card = document.querySelector(`[data-pillar-id="${pendingId}"]`);
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            const input = pillarNameInputRef.current;
            if (input) {
                setTimeout(() => input.focus(), 100);
            }
        });
        return () => cancelAnimationFrame(raf);
    }, [editedClient.strategyContentPillars]);

    const ctaOptions = (t('cta_options') || 'Saiba mais;Outro').split(';');

    return (
        <div className="space-y-6">
            {embeddedSaveBar && (isDirty || saveBarMessage) && (
                <div className="flex justify-end -mt-2">
                    <UnsavedChangesBar onCancel={onCancel} onSave={onSave} requestConfirmation={requestConfirmation} feedback={saveBarMessage ?? undefined} onFeedbackDismiss={onFeedbackDismiss} />
                </div>
            )}

            {/* Cabeçalho-resumo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('strategy_status')}</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{filledCount}/{STRATEGY_ESSENTIAL_TOTAL} {t('strategy_preenchidos')}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('strategy_monthly_objective')}</p>
                    {monthlyObj?.trim() ? (
                        <TooltipHint label={monthlyObj} className="block w-full min-w-0">
                            <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white truncate">{monthlyObj}</p>
                        </TooltipHint>
                    ) : (
                        <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white truncate">—</p>
                    )}
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('strategy_pillars_count')}</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{pillarCount}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('strategy_last_updated')}</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{lastUpdated}</p>
                </div>
            </div>

            {/* 1. Essência da Marca */}
            <SectionBlock title={t('strategy_block_essencia_title')} description={t('strategy_block_essencia_desc')} accent="essencia" expanded={!!expandedSections.main_essencia} onToggle={() => toggleSection('main_essencia')}>
                <CollapsibleBlock title={t('brand_history')} expanded={!!expandedSections.brand_history} onToggle={() => toggleSection('brand_history')}>
                    <div className="pt-2">
                        <SimpleInput value={toEditableValue(editedClient.brandHistory || editedClient.brandGuidelines)} onChange={(v) => onUpdate({ brandHistory: v })} placeholder={t('brand_history_placeholder')} rows={3} />
                    </div>
                </CollapsibleBlock>
                <CollapsibleBlock title={t('brand_values')} expanded={!!expandedSections.brand_values} onToggle={() => toggleSection('brand_values')}>
                    <div className="pt-2">
                        <SimpleInput value={editedClient.brandValues || ''} onChange={(v) => onUpdate({ brandValues: v })} placeholder={t('brand_values_placeholder')} rows={2} />
                    </div>
                </CollapsibleBlock>
                <CollapsibleBlock title={t('brand_mission')} expanded={!!expandedSections.brand_mission} onToggle={() => toggleSection('brand_mission')}>
                    <div className="pt-2">
                        <SimpleInput value={editedClient.brandMission || ''} onChange={(v) => onUpdate({ brandMission: v })} placeholder={t('brand_mission_placeholder')} rows={2} />
                    </div>
                </CollapsibleBlock>
                <CollapsibleBlock title={t('brand_vision')} expanded={!!expandedSections.brand_vision} onToggle={() => toggleSection('brand_vision')}>
                    <div className="pt-2">
                        <SimpleInput value={editedClient.brandVision || ''} onChange={(v) => onUpdate({ brandVision: v })} placeholder={t('brand_vision_placeholder')} rows={2} />
                    </div>
                </CollapsibleBlock>
                <CollapsibleBlock title={t('main_services')} expanded={!!expandedSections.main_services} onToggle={() => toggleSection('main_services')}>
                    <div className="pt-2">
                        <SimpleInput value={editedClient.mainServices || ''} onChange={(v) => onUpdate({ mainServices: v })} placeholder={t('main_services_hint')} rows={2} />
                    </div>
                </CollapsibleBlock>
                <CollapsibleBlock title={t('differentiators')} expanded={!!expandedSections.differentiators} onToggle={() => toggleSection('differentiators')}>
                    <div className="pt-2">
                        <SimpleInput value={editedClient.differentiators || ''} onChange={(v) => onUpdate({ differentiators: v })} placeholder={t('differentiators_hint')} rows={2} />
                    </div>
                </CollapsibleBlock>
                <CollapsibleBlock title={t('how_want_to_be_perceived')} expanded={!!expandedSections.how_want_to_be_perceived} onToggle={() => toggleSection('how_want_to_be_perceived')}>
                    <div className="pt-2">
                        <SimpleInput value={editedClient.howWantToBePerceived || ''} onChange={(v) => onUpdate({ howWantToBePerceived: v })} placeholder={t('how_want_to_be_perceived_hint')} rows={2} />
                    </div>
                </CollapsibleBlock>
                <CollapsibleBlock title={t('strategy_competitors_label')} expanded={!!expandedSections.competitors} onToggle={() => toggleSection('competitors')}>
                    <div className="pt-2 space-y-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('strategy_competitors_hint')}</p>
                        <button type="button" onClick={addCompetitor} className="flex items-center gap-2 px-3 py-1.5 text-sm text-indigo-600 dark:text-indigo-400 border border-dashed border-indigo-300 dark:border-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                            <PlusIcon className="w-4 h-4" />
                            {t('add_competitor')}
                        </button>
                        {(editedClient.strategyCompetitors ?? []).map((item, idx) => (
                            <div key={item.id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 space-y-2">
                                <div className="flex justify-between items-center gap-2">
                                    <input type="text" value={item.name} onChange={(e) => updateCompetitor(idx, { name: e.target.value })} placeholder={t('competitor_name_placeholder')} className="flex-1 text-sm font-medium rounded px-2 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900" />
                                    <button type="button" onClick={() => removeCompetitor(idx)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><XIcon className="w-4 h-4" /></button>
                                </div>
                                <SimpleInput label={t('competitor_link')} value={item.link || ''} onChange={(v) => updateCompetitor(idx, { link: v })} placeholder={t('competitor_link_placeholder')} rows={1} />
                                <SimpleInput label={t('competitor_strengths')} value={item.strengths || ''} onChange={(v) => updateCompetitor(idx, { strengths: v })} placeholder={t('competitor_strengths_placeholder')} rows={1} />
                                <SimpleInput label={t('competitor_weaknesses')} value={item.weaknesses || ''} onChange={(v) => updateCompetitor(idx, { weaknesses: v })} placeholder={t('competitor_weaknesses_placeholder')} rows={1} />
                                <SimpleInput label={t('competitor_notes')} value={item.notes || ''} onChange={(v) => updateCompetitor(idx, { notes: v })} placeholder={t('competitor_notes_placeholder')} rows={1} />
                            </div>
                        ))}
                    </div>
                </CollapsibleBlock>
                <CollapsibleBlock title={t('strategy_inspirations_label')} expanded={!!expandedSections.inspirations} onToggle={() => toggleSection('inspirations')}>
                    <div className="pt-2 space-y-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('strategy_inspirations_hint')}</p>
                        <button type="button" onClick={addInspiration} className="flex items-center gap-2 px-3 py-1.5 text-sm text-indigo-600 dark:text-indigo-400 border border-dashed border-indigo-300 dark:border-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                            <PlusIcon className="w-4 h-4" />
                            {t('add_inspiration')}
                        </button>
                        {(editedClient.strategyInspirations ?? []).map((item, idx) => (
                            <div key={item.id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 space-y-2">
                                <div className="flex justify-between items-center gap-2">
                                    <input type="text" value={item.name} onChange={(e) => updateInspiration(idx, { name: e.target.value })} placeholder={t('inspiration_name_placeholder')} className="flex-1 text-sm font-medium rounded px-2 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900" />
                                    <button type="button" onClick={() => removeInspiration(idx)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><XIcon className="w-4 h-4" /></button>
                                </div>
                                <SimpleInput label={t('inspiration_link')} value={item.link || ''} onChange={(v) => updateInspiration(idx, { link: v })} placeholder={t('inspiration_link_placeholder')} rows={1} />
                                <SimpleInput label={t('inspiration_what_inspires')} value={item.whatInspires || ''} onChange={(v) => updateInspiration(idx, { whatInspires: v })} placeholder={t('inspiration_what_inspires_placeholder')} rows={2} />
                                <SimpleInput label={t('inspiration_notes')} value={item.notes || ''} onChange={(v) => updateInspiration(idx, { notes: v })} placeholder={t('inspiration_notes_placeholder')} rows={1} />
                            </div>
                        ))}
                    </div>
                </CollapsibleBlock>
            </SectionBlock>

            {/* 2. Público */}
            <SectionBlock title={t('strategy_block_publico_title')} description={t('strategy_block_publico_desc')} accent="publico" expanded={!!expandedSections.main_publico} onToggle={() => toggleSection('main_publico')}>
                <CollapsibleBlock title={t('audience_general_section')} expanded={!!expandedSections.audience_general} onToggle={() => toggleSection('audience_general')}>
                    <div className="pt-2 space-y-3">
                        <SimpleInput label={t('audience_age_range')} value={editedClient.audienceAgeRange || ''} onChange={(v) => onUpdate({ audienceAgeRange: v })} placeholder={t('audience_age_range_placeholder')} rows={1} />
                        <SimpleInput label={t('audience_region')} value={editedClient.audienceRegion || ''} onChange={(v) => onUpdate({ audienceRegion: v })} placeholder={t('audience_region_placeholder')} rows={1} />
                        <SimpleInput label={t('audience_general_profile')} value={editedClient.audienceGeneralProfile || ''} onChange={(v) => onUpdate({ audienceGeneralProfile: v })} placeholder={t('audience_general_profile_placeholder')} rows={3} />
                        <SimpleInput label={t('audience_general_notes')} value={editedClient.audienceGeneralNotes || ''} onChange={(v) => onUpdate({ audienceGeneralNotes: v })} placeholder={t('audience_general_notes_placeholder')} rows={2} />
                    </div>
                </CollapsibleBlock>
                <CollapsibleBlock title={t('strategy_personas_label')} expanded={!!expandedSections.personas} onToggle={() => toggleSection('personas')}>
                    <div className="pt-2 space-y-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('strategy_personas_hint')}</p>
                        <button type="button" onClick={addPersona} className="flex items-center gap-2 px-3 py-1.5 text-sm text-indigo-600 dark:text-indigo-400 border border-dashed border-indigo-300 dark:border-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                            <PlusIcon className="w-4 h-4" />
                            {t('add_persona')}
                        </button>
                        {(editedClient.strategyPersonas ?? []).map((item, idx) => (
                            <div key={item.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 overflow-hidden shadow-sm">
                                {/* Cabeçalho: foto à esquerda, nome ao lado, X à direita */}
                                <div className="flex items-center gap-4 p-4 border-b border-gray-100 dark:border-gray-700/70">
                                    {onOpenPersonaPhotoUpload ? (
                                        <div className="shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center">
                                            {item.photoUrl ? (
                                                <div className="relative w-full h-full">
                                                    <img src={toUploadUrl(item.photoUrl)} alt="" className="w-full h-full object-cover" />
                                                    <button type="button" onClick={() => updatePersona(idx, { photoUrl: undefined })} className="absolute top-0.5 right-0.5 p-1 bg-red-500 text-white rounded-md hover:bg-red-600 shadow" aria-label={t('remove_item')}><XIcon className="w-3.5 h-3.5" /></button>
                                                </div>
                                            ) : (
                                                <button type="button" onClick={() => onOpenPersonaPhotoUpload(idx)} className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-600 border border-dashed border-gray-200 dark:border-gray-600 rounded-xl transition-colors p-2">
                                                    <UploadCloudIcon className="w-8 h-8" />
                                                    <span className="text-xs font-medium">{t('add_photo')}</span>
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="shrink-0 w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-700/50" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <input type="text" value={item.name} onChange={(e) => updatePersona(idx, { name: e.target.value })} placeholder={t('persona_name_placeholder')} className="w-full text-base font-semibold rounded-lg px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400" />
                                    </div>
                                    <button type="button" onClick={() => removePersona(idx)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg shrink-0" aria-label={t('remove_item')}><XIcon className="w-5 h-5" /></button>
                                </div>
                                {/* Campos agrupados: Perfil e Motivadores */}
                                <div className="p-4 space-y-5">
                                    <div className="space-y-3">
                                        <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('persona_group_perfil')}</h5>
                                        <SimpleInput label={t('persona_description')} value={item.description || ''} onChange={(v) => updatePersona(idx, { description: v })} placeholder={t('persona_description_placeholder')} rows={2} />
                                        <SimpleInput label={t('persona_behavior')} value={item.behavior || ''} onChange={(v) => updatePersona(idx, { behavior: v })} placeholder={t('persona_behavior_placeholder')} rows={2} />
                                    </div>
                                    <div className="space-y-3">
                                        <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('persona_group_motivadores')}</h5>
                                        <SimpleInput label={t('persona_pains')} value={item.pains || ''} onChange={(v) => updatePersona(idx, { pains: v })} placeholder={t('persona_pains_placeholder')} rows={2} />
                                        <SimpleInput label={t('persona_desires')} value={item.desires || ''} onChange={(v) => updatePersona(idx, { desires: v })} placeholder={t('persona_desires_placeholder')} rows={2} />
                                        <SimpleInput label={t('persona_objections')} value={item.objections || ''} onChange={(v) => updatePersona(idx, { objections: v })} placeholder={t('persona_objections_placeholder')} rows={2} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CollapsibleBlock>
            </SectionBlock>

            {/* 3. Comunicação e Conteúdo */}
            <SectionBlock title={t('strategy_block_comunicacao_title')} description={t('strategy_block_comunicacao_desc')} accent="comunicacao" expanded={!!expandedSections.main_comunicacao} onToggle={() => toggleSection('main_comunicacao')}>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-1 mb-2">{t('strategy_subgroup_communication')}</h4>
                <CollapsibleBlock title={t('tone_of_voice')} expanded={!!expandedSections.tone_of_voice} onToggle={() => toggleSection('tone_of_voice')}>
                    <div className="pt-2">
                        <SimpleInput value={toEditableValue(editedClient.toneOfVoice)} onChange={(v) => onUpdate({ toneOfVoice: v })} placeholder={t('tone_of_voice')} rows={2} />
                    </div>
                </CollapsibleBlock>
                <CollapsibleBlock title={t('words_that_fit')} expanded={!!expandedSections.words_that_fit} onToggle={() => toggleSection('words_that_fit')}>
                    <div className="pt-2">
                        <SimpleInput value={editedClient.wordsThatFit || ''} onChange={(v) => onUpdate({ wordsThatFit: v })} placeholder={t('words_that_fit_hint')} rows={1} />
                    </div>
                </CollapsibleBlock>
                <CollapsibleBlock title={t('words_that_dont_fit')} expanded={!!expandedSections.words_that_dont_fit} onToggle={() => toggleSection('words_that_dont_fit')}>
                    <div className="pt-2">
                        <SimpleInput value={editedClient.wordsThatDontFit || ''} onChange={(v) => onUpdate({ wordsThatDontFit: v })} placeholder={t('words_that_dont_fit_hint')} rows={1} />
                    </div>
                </CollapsibleBlock>
                <CollapsibleBlock title={t('content_style')} expanded={!!expandedSections.content_style} onToggle={() => toggleSection('content_style')}>
                    <div className="pt-2">
                        <SimpleInput value={editedClient.contentStyle || ''} onChange={(v) => onUpdate({ contentStyle: v })} placeholder={t('content_style_hint')} rows={2} />
                    </div>
                </CollapsibleBlock>
                <CollapsibleBlock title={t('preferred_cta')} expanded={!!expandedSections.preferred_cta} onToggle={() => toggleSection('preferred_cta')}>
                    <div className="pt-2">
                        <select value={editedClient.preferredCta || ''} onChange={(e) => onUpdate({ preferredCta: e.target.value })} className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500">
                            <option value="">—</option>
                            {ctaOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                </CollapsibleBlock>
                <CollapsibleBlock title={t('avoid_in_communication')} expanded={!!expandedSections.avoid_in_communication} onToggle={() => toggleSection('avoid_in_communication')}>
                    <div className="pt-2">
                        <SimpleInput value={editedClient.avoidInCommunication || ''} onChange={(v) => onUpdate({ avoidInCommunication: v })} placeholder={t('avoid_in_communication_hint')} rows={2} />
                    </div>
                </CollapsibleBlock>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-4 mb-2">{t('strategy_subgroup_content')}</h4>
                <CollapsibleBlock title={t('main_profile_objective')} expanded={!!expandedSections.main_profile_objective} onToggle={() => toggleSection('main_profile_objective')}>
                    <div className="pt-2">
                        <SimpleInput value={editedClient.mainProfileObjective || ''} onChange={(v) => onUpdate({ mainProfileObjective: v })} placeholder={t('main_profile_objective_placeholder')} rows={1} />
                    </div>
                </CollapsibleBlock>
                <CollapsibleBlock title={t('moment_objective')} expanded={!!expandedSections.moment_objective} onToggle={() => toggleSection('moment_objective')}>
                    <div className="pt-2">
                        <SimpleInput value={editedClient.momentObjective || ''} onChange={(v) => onUpdate({ momentObjective: v })} placeholder={t('moment_objective_placeholder')} rows={1} />
                    </div>
                </CollapsibleBlock>
                <CollapsibleBlock title={t('strategy_monthly_objective')} expanded={!!expandedSections.monthly_objective} onToggle={() => toggleSection('monthly_objective')}>
                    <div className="pt-2">
                        <SimpleInput value={editedClient.monthlyObjective || ''} onChange={(v) => onUpdate({ monthlyObjective: v })} placeholder={t('monthly_objective_placeholder')} rows={1} />
                    </div>
                </CollapsibleBlock>
                <CollapsibleBlock title={t('strategy_notes')} expanded={!!expandedSections.strategy_notes} onToggle={() => toggleSection('strategy_notes')}>
                    <div className="pt-2">
                        <SimpleInput value={toEditableValue(editedClient.strategyNotes)} onChange={(v) => onUpdate({ strategyNotes: v })} placeholder={t('strategy_notes')} rows={3} />
                    </div>
                </CollapsibleBlock>
                <CollapsibleBlock title={t('content_pillars')} icon={<PillarsHelpPopover t={t} />} expanded={!!expandedSections.pillars} onToggle={() => toggleSection('pillars')}>
                    <div className="pt-2 space-y-3">
                        <p className="text-xs text-gray-600 dark:text-gray-400">{t('pillars_intro')}</p>
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t('pillars_examples_label')}</p>
                        <div className="flex flex-wrap gap-2">
                            {PILLAR_SUGGESTIONS.map((s) => (
                                <button
                                    key={s.name}
                                    type="button"
                                    onClick={() => addPillarFromSuggestion(s)}
                                    className="px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
                                >
                                    {s.name}
                                </button>
                            ))}
                        </div>
                        <button type="button" onClick={() => addPillar()} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 border border-dashed border-indigo-300 dark:border-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                            <PlusIcon className="w-4 h-4" />
                            {t('add_pillar')}
                        </button>
                        {(editedClient.strategyContentPillars ?? []).map((p, idx) => (
                            <div key={p.id} data-pillar-id={p.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-800/30">
                                <div className="flex justify-between items-center gap-2 mb-2">
                                    <input
                                        ref={p.id === lastAddedPillarIdRef.current ? pillarNameInputRef : undefined}
                                        type="text"
                                        value={p.name}
                                        onChange={(e) => updatePillar(idx, { name: e.target.value })}
                                        placeholder={t('pillar_name_placeholder')}
                                        className="flex-1 text-sm font-medium bg-transparent rounded px-2 py-1 border-0 border-b border-gray-200 dark:border-gray-600 focus:ring-0 focus:border-indigo-500"
                                    />
                                    <button type="button" onClick={() => removePillar(idx)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded shrink-0" aria-label={t('remove_item')}>
                                        <XIcon className="w-4 h-4" />
                                    </button>
                                </div>
                                <SimpleInput label={t('pillar_explanation_label')} value={p.description || p.objective || ''} onChange={(v) => updatePillar(idx, { description: v })} placeholder={t('pillar_explanation_placeholder')} rows={2} />
                                <SimpleInput label={t('pillar_example_themes')} value={p.exampleThemes || ''} onChange={(v) => updatePillar(idx, { exampleThemes: v })} placeholder={t('pillar_example_themes_placeholder')} rows={2} />
                            </div>
                        ))}
                    </div>
                </CollapsibleBlock>
            </SectionBlock>
        </div>
    );
};
