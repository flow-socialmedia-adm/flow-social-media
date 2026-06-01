import React, { useRef, useEffect, useState } from 'react';
import type { Client, BrandAsset } from '../../../types';
import { PlusIcon, XIcon, CopyIcon, StarIcon, ArrowDownIcon, InfoIcon, FileTextIcon, ExternalLinkIcon, TypeIcon, EditIcon, ChevronDownIcon, ChevronRightIcon } from '../../icons';
import { toUploadUrl, apiUpload, apiUploadDocument, apiUploadFont, UPLOAD_DOCUMENT_MAX_BYTES, UPLOAD_FONT_MAX_BYTES } from '../../../lib/api';
import { resolveColorHex } from '../../../lib/utils';
import { UnsavedChangesBar } from '../UnsavedChangesBar';
import { CollapsibleBlock } from '../CollapsibleBlock';
import TooltipHint from '../../TooltipHint';

const BRAND_GUIDE_ACCENTS = {
    logos_elements: 'border-l-indigo-500',
    base_visual: 'border-l-emerald-500',
    biblioteca: 'border-l-amber-500',
    documentacao: 'border-l-slate-500',
} as const;

const CollapsibleSectionBlock: React.FC<{
    title: string;
    description: string;
    accent: keyof typeof BRAND_GUIDE_ACCENTS;
    expanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}> = ({ title, description, accent, expanded, onToggle, children }) => (
    <section className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden border-l-4 ${BRAND_GUIDE_ACCENTS[accent]}`}>
        <button type="button" onClick={onToggle} className="w-full flex items-center gap-3 px-5 py-4 text-left border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            {expanded ? <ChevronDownIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" /> : <ChevronRightIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />}
            <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
            </div>
        </button>
        {expanded && <div className="p-5 space-y-4">{children}</div>}
    </section>
);
import { ColorPickerPopover } from '../../ColorPickerPopover';
import { GOOGLE_FONTS_LIST } from '../../../lib/googleFonts';

const ICON_STYLE = 'w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0';

const LOGO_CARD_SIZE = 'min-w-[200px] w-[200px]';
const PALETTE_CARD_SIZE = LOGO_CARD_SIZE;
const MAX_LOGOS = 10;
const MAX_PHOTOS = 10;
const MAX_GRAPHICS = 10;
const MAX_ICONS = 10;
const ASSET_PREVIEW_SIZE = 140;

/** Card de um logo: padrão igual à Paleta (X para excluir, nome editável abaixo, estrela principal, segunda linha com Baixar) */
const LogoCard: React.FC<{
    asset: BrandAsset;
    isPrincipal: boolean;
    onSetPrincipal: () => void;
    onRemove: () => void;
    onNameChange: (name: string) => void;
    t: (k: string) => string;
    lastRef?: React.RefObject<HTMLDivElement | null>;
}> = ({ asset, isPrincipal, onSetPrincipal, onRemove, onNameChange, t, lastRef }) => {
    const [editingName, setEditingName] = useState(false);
    const [nameValue, setNameValue] = useState(asset.name || '');
    const displayName = asset.name?.trim() || t('logo_name_placeholder');

    useEffect(() => {
        setNameValue(asset.name || '');
    }, [asset.name]);

    const saveName = () => {
        setEditingName(false);
        const v = nameValue.trim();
        if (v !== (asset.name || '')) onNameChange(v || asset.name || '');
    };

    const handleDownload = async () => {
        if (!asset.url) return;
        const url = toUploadUrl(asset.url);
        const fileName = asset.name?.trim() || 'logo';
        try {
            if (url.startsWith('data:')) {
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.click();
            } else {
                const res = await fetch(url, { credentials: 'include' });
                if (!res.ok) throw new Error('Falha ao baixar');
                const blob = await res.blob();
                const objectUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = objectUrl;
                a.download = fileName;
                a.click();
                URL.revokeObjectURL(objectUrl);
            }
        } catch {
            window.open(url, '_blank');
        }
    };

    return (
        <div ref={lastRef as React.RefObject<HTMLDivElement>} className={`relative flex flex-col ${LOGO_CARD_SIZE} min-h-[220px] rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 overflow-visible`}>
            {/* Área circular com fundo quadriculado no círculo — transparência do logo aparece como xadrez */}
            <div className="relative flex-1 min-h-[160px] flex items-center justify-center p-4 rounded-t-xl">
                {asset.url && (
                    <div
                        className="w-[140px] h-[140px] rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-gray-200 dark:border-gray-600"
                        style={{
                            backgroundImage: 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)',
                            backgroundSize: '10px 10px',
                            backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0',
                            backgroundColor: '#f9fafb',
                        }}
                    >
                        <img src={toUploadUrl(asset.url)} alt={asset.name} className="max-w-full max-h-full w-auto h-auto object-contain" style={{ background: 'transparent' }} />
                    </div>
                )}
            </div>
            {/* Duas linhas como na Paleta: nome + estrela; depois Baixar */}
            <div className="px-3 pb-3 pt-1 space-y-2">
                <div className="flex items-center justify-between gap-2 min-h-[2rem]">
                    <div className="min-w-0 flex-1">
                        {editingName ? (
                            <input
                                type="text"
                                value={nameValue}
                                onChange={(e) => setNameValue(e.target.value)}
                                onBlur={saveName}
                                onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setNameValue(asset.name || ''); setEditingName(false); } }}
                                placeholder={t('logo_name_placeholder')}
                                className="w-full text-sm bg-gray-50 dark:bg-gray-700 rounded px-2 py-1 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                autoFocus
                            />
                        ) : (
                            <TooltipHint label={displayName}>
                                <button type="button" onClick={() => setEditingName(true)} className="w-full text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 truncate text-left">
                                    {displayName}
                                </button>
                            </TooltipHint>
                        )}
                    </div>
                    <TooltipHint label={isPrincipal ? t('principal') : t('set_as_principal')}>
                        <button
                            type="button"
                            onClick={onSetPrincipal}
                            aria-label={isPrincipal ? t('principal') : t('set_as_principal')}
                            className="shrink-0 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                            <StarIcon className={`w-5 h-5 ${isPrincipal ? 'text-indigo-600 dark:text-indigo-400 fill-indigo-600 dark:fill-indigo-400' : 'text-gray-400 dark:text-gray-500'}`} />
                        </button>
                    </TooltipHint>
                </div>
                <div className="flex items-center justify-center">
                    <TooltipHint label={t('download')}>
                        <button
                            type="button"
                            onClick={handleDownload}
                            aria-label={t('download')}
                            className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                            <ArrowDownIcon className="w-4 h-4 shrink-0" />
                            <span>{t('download')}</span>
                        </button>
                    </TooltipHint>
                </div>
            </div>
            {/* X para excluir — mesmo padrão da Paleta de Cores */}
            <TooltipHint label={t('remove_item')}>
                <button
                    type="button"
                    onClick={onRemove}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 z-10"
                    aria-label={t('remove_item')}
                >
                    <XIcon className="w-3 h-3" />
                </button>
            </TooltipHint>
        </div>
    );
};

/** Card para Fotos, Elementos gráficos e Ícones: quadrado com crop só visual (object-fit cover), sem estrela, nome editável + Baixar. */
const AssetCard: React.FC<{
    asset: BrandAsset;
    onRemove: () => void;
    onNameChange: (name: string) => void;
    t: (k: string) => string;
    lastRef?: React.RefObject<HTMLDivElement | null>;
}> = ({ asset, onRemove, onNameChange, t, lastRef }) => {
    const [editingName, setEditingName] = useState(false);
    const [nameValue, setNameValue] = useState(asset.name || '');

    useEffect(() => {
        setNameValue(asset.name || '');
    }, [asset.name]);

    const saveName = () => {
        setEditingName(false);
        const v = nameValue.trim();
        if (v !== (asset.name || '')) onNameChange(v || asset.name || '');
    };

    const handleDownload = async () => {
        if (!asset.url) return;
        const url = toUploadUrl(asset.url);
        const fileName = asset.name?.trim() || 'arquivo';
        try {
            if (url.startsWith('data:')) {
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.click();
            } else {
                const res = await fetch(url, { credentials: 'include' });
                if (!res.ok) throw new Error('Falha ao baixar');
                const blob = await res.blob();
                const objectUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = objectUrl;
                a.download = fileName;
                a.click();
                URL.revokeObjectURL(objectUrl);
            }
        } catch {
            window.open(url, '_blank');
        }
    };

    const isSvg = (asset.url || '').includes('svg+xml') || (asset.url || '').toLowerCase().endsWith('.svg');

    return (
        <div ref={lastRef as React.RefObject<HTMLDivElement>} className={`relative flex flex-col ${LOGO_CARD_SIZE} min-h-[220px] rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 overflow-visible`}>
            <div className="relative flex-1 min-h-[160px] flex items-center justify-center p-4 rounded-t-xl">
                {asset.url && (
                    <div
                        className="overflow-hidden rounded-xl flex items-center justify-center shrink-0 border border-gray-200 dark:border-gray-600"
                        style={{
                            width: ASSET_PREVIEW_SIZE,
                            height: ASSET_PREVIEW_SIZE,
                            backgroundImage: 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)',
                            backgroundSize: '10px 10px',
                            backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0',
                            backgroundColor: '#f9fafb',
                        }}
                    >
                        {isSvg ? (
                            <img src={toUploadUrl(asset.url)} alt={asset.name} className="max-w-full max-h-full w-auto h-auto object-contain" style={{ background: 'transparent' }} />
                        ) : (
                            <img src={toUploadUrl(asset.url)} alt={asset.name} className="w-full h-full object-cover object-center" style={{ background: 'transparent' }} />
                        )}
                    </div>
                )}
            </div>
            <div className="px-3 pb-3 pt-1 space-y-2">
                <div className="min-h-[2rem]">
                    {editingName ? (
                        <input
                            type="text"
                            value={nameValue}
                            onChange={(e) => setNameValue(e.target.value)}
                            onBlur={saveName}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setNameValue(asset.name || ''); setEditingName(false); } }}
                            placeholder={t('asset_name_placeholder')}
                            className="w-full text-sm bg-gray-50 dark:bg-gray-700 rounded px-2 py-1 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            autoFocus
                        />
                    ) : (
                        <TooltipHint label={asset.name?.trim() || t('asset_name_placeholder')}>
                            <button type="button" onClick={() => setEditingName(true)} className="w-full text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 truncate text-left">
                                {asset.name?.trim() || t('asset_name_placeholder')}
                            </button>
                        </TooltipHint>
                    )}
                </div>
                <div className="flex items-center justify-center">
                    <TooltipHint label={t('download')}>
                        <button type="button" onClick={handleDownload} aria-label={t('download')} className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                            <ArrowDownIcon className="w-4 h-4 shrink-0" />
                            <span>{t('download')}</span>
                        </button>
                    </TooltipHint>
                </div>
            </div>
            <TooltipHint label={t('remove_item')}>
                <button type="button" onClick={onRemove} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 z-10" aria-label={t('remove_item')}>
                    <XIcon className="w-3 h-3" />
                </button>
            </TooltipHint>
        </div>
    );
};

/** Baixa fonte do Google Fonts via CSS API — busca o CSS, extrai a URL do arquivo e faz o download. */
async function downloadGoogleFont(fontFamily: string): Promise<void> {
    const familyForUrl = fontFamily.trim().replace(/\s+/g, '+');
    const cssUrl = `https://fonts.googleapis.com/css2?family=${familyForUrl}:wght@400&display=swap`;
    const cssRes = await fetch(cssUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; rv:91.0) Gecko/20100101 Firefox/91.0' } });
    if (!cssRes.ok) throw new Error('Fonte não encontrada.');
    const css = await cssRes.text();
    const urlMatch = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/);
    if (!urlMatch?.[1]) throw new Error('Não foi possível obter o arquivo da fonte.');
    const fontUrl = urlMatch[1];
    const fontRes = await fetch(fontUrl);
    if (!fontRes.ok) throw new Error('Falha ao baixar a fonte.');
    const blob = await fontRes.blob();
    const ext = fontUrl.includes('.woff2') ? 'woff2' : fontUrl.includes('.woff') ? 'woff' : 'ttf';
    const fileName = `${fontFamily.replace(/\s+/g, '-')}.${ext}`;
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(objectUrl);
}

/** Card de fonte: layout horizontal — ícone Type, nome, download, X. Suporta asset (upload) ou Google Font. */
const FontCard: React.FC<{
    asset?: BrandAsset;
    googleFontName?: string;
    onRemove: () => void;
    t: (k: string) => string;
}> = ({ asset, googleFontName, onRemove, t }) => {
    const isGoogleFont = !!googleFontName;
    const displayName = isGoogleFont ? googleFontName : ((asset?.name || '').trim() || t('file_name'));
    const subtitle = isGoogleFont ? t('google_font_label') : '.ttf, .otf, .woff';

    const handleDownload = async () => {
        if (isGoogleFont && googleFontName) {
            try {
                await downloadGoogleFont(googleFontName);
            } catch (err) {
                console.error('[FontCard] downloadGoogleFont:', err);
                window.open(`https://fonts.google.com/specimen/${encodeURIComponent(googleFontName)}`, '_blank');
            }
            return;
        }
        if (!asset?.url) return;
        const url = toUploadUrl(asset.url);
        const fileName = (asset.name || '').trim() || 'font.ttf';
        try {
            if (url.startsWith('data:')) {
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.click();
            } else {
                const res = await fetch(url, { credentials: 'include' });
                if (!res.ok) throw new Error('Falha ao baixar');
                const blob = await res.blob();
                const objectUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = objectUrl;
                a.download = fileName;
                a.click();
                URL.revokeObjectURL(objectUrl);
            }
        } catch {
            window.open(url, '_blank');
        }
    };

    return (
        <div className="relative flex flex-row items-center gap-3 px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 overflow-visible min-h-[72px]">
            <div className="w-14 h-14 shrink-0 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50">
                <TypeIcon className="w-8 h-8 text-indigo-500 dark:text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                <TooltipHint label={displayName}>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{displayName}</p>
                </TooltipHint>
                <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                <TooltipHint label={t('download')}>
                    <button
                        type="button"
                        onClick={handleDownload}
                        className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        aria-label={t('download')}
                    >
                        <ArrowDownIcon className="w-4 h-4" />
                    </button>
                </TooltipHint>
            </div>
            <TooltipHint label={t('remove_item')}>
                <button type="button" onClick={onRemove} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 z-10" aria-label={t('remove_item')}>
                    <XIcon className="w-3 h-3" />
                </button>
            </TooltipHint>
        </div>
    );
};

/** Card do Manual da marca (PDF): layout horizontal — ícone PDF à esquerda, nome editável (hover roxo) + nome do arquivo em cinza ao centro, ícones ver/baixar à direita, X para excluir. */
const BrandBookCard: React.FC<{
    asset: BrandAsset;
    onRemove: () => void;
    onNameChange: (name: string) => void;
    t: (k: string) => string;
}> = ({ asset, onRemove, onNameChange, t }) => {
    const customName = (asset.name || '').replace(/\.pdf$/i, '').trim();
    const [editingName, setEditingName] = useState(false);
    const originalNameFromUrl = (() => {
        if (!asset.url) return null;
        const idx = asset.url.indexOf('?');
        if (idx === -1) return null;
        const params = new URLSearchParams(asset.url.slice(idx + 1));
        return params.get('originalName');
    })();

    const hasOriginalNameInUrl = !!originalNameFromUrl?.trim();
    const uiCustomName = hasOriginalNameInUrl ? customName : '';

    const [nameValue, setNameValue] = useState(uiCustomName);

    const originalFileName = originalNameFromUrl || asset.name?.trim() || 'manual.pdf';

    const displayName = uiCustomName || t('file_name');
    const isPlaceholder = !uiCustomName;

    useEffect(() => {
        setNameValue(hasOriginalNameInUrl ? customName : '');
    }, [asset.name, asset.url]);

    const saveName = () => {
        setEditingName(false);
        const v = nameValue.trim();
        const sanitized = v.replace(/\.pdf$/i, '').trim();
        if (!sanitized) {
            if ((asset.name || '').trim() !== '') onNameChange('');
            setNameValue('');
            return;
        }
        if (sanitized !== uiCustomName) onNameChange(sanitized);
    };

    const handleDownload = async () => {
        if (!asset.url) return;
        const url = toUploadUrl(asset.url);
        const fileName = originalFileName || asset.name?.trim() || 'manual-da-marca.pdf';
        try {
            if (url.startsWith('data:')) {
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.click();
            } else {
                const res = await fetch(url, { credentials: 'include' });
                if (!res.ok) throw new Error('Falha ao baixar');
                const blob = await res.blob();
                const objectUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = objectUrl;
                a.download = fileName;
                a.click();
                URL.revokeObjectURL(objectUrl);
            }
        } catch {
            window.open(url, '_blank');
        }
    };

    const openInNewTab = () => {
        if (!asset.url) return;
        window.open(toUploadUrl(asset.url), '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="relative flex flex-row items-center gap-3 px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 overflow-visible min-h-[72px]">
            <div className="w-14 h-14 shrink-0 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50">
                <FileTextIcon className="w-8 h-8 text-red-500 dark:text-red-400" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                <div className="min-h-[1.5rem]">
                    {editingName ? (
                        <input
                            type="text"
                            value={nameValue}
                            onChange={(e) => setNameValue(e.target.value)}
                            onBlur={saveName}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setNameValue(uiCustomName); setEditingName(false); } }}
                            placeholder={t('file_name')}
                            className="w-full text-sm bg-transparent py-1 px-0 border-0 border-b border-gray-300 dark:border-gray-500 focus:outline-none focus:ring-0 focus:border-gray-400 dark:focus:border-gray-400 text-gray-700 dark:text-gray-300"
                            autoFocus
                        />
                    ) : (
                        <TooltipHint label={displayName}>
                            <button
                                type="button"
                                onClick={() => setEditingName(true)}
                                className={`w-full text-sm hover:text-indigo-600 dark:hover:text-indigo-400 truncate text-left ${isPlaceholder ? 'text-gray-500 dark:text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}
                            >
                                {displayName}
                            </button>
                        </TooltipHint>
                    )}
                </div>
                <TooltipHint label={originalFileName || 'manual.pdf'}>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{originalFileName || 'manual.pdf'}</p>
                </TooltipHint>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                <TooltipHint label={t('open_pdf')}>
                    <button
                        type="button"
                        onClick={openInNewTab}
                        className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        aria-label={t('open_pdf')}
                    >
                        <ExternalLinkIcon className="w-4 h-4" />
                    </button>
                </TooltipHint>
                <TooltipHint label={t('download')}>
                    <button
                        type="button"
                        onClick={handleDownload}
                        className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        aria-label={t('download')}
                    >
                        <ArrowDownIcon className="w-4 h-4" />
                    </button>
                </TooltipHint>
            </div>
            <TooltipHint label={t('remove_item')}>
                <button type="button" onClick={onRemove} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 z-10" aria-label={t('remove_item')}>
                    <XIcon className="w-3 h-3" />
                </button>
            </TooltipHint>
        </div>
    );
};

export type BrandGuideSectionEditorProps = {
    editedClient: Client;
    handlers: {
        onUpdate: (u: Partial<Client>) => void;
        onCancel: () => void;
        onSave: () => void;
        requestConfirmation: (cb: () => void) => void;
        onCopy: (hex: string) => void;
        showConfirmation?: (opts: { title: string; message: string; onConfirm: () => void }) => void;
    };
    isDirty: boolean;
    saveBarMessage: { text: string; type: 'success' | 'error' } | null;
    onFeedbackDismiss: () => void;
    t: (k: string) => string;
    logoUploadError: string | null;
    setLogoUploadError: (s: string | null) => void;
    copiedHex: string | null;
    onOpenLogoUpload?: () => void;
    onOpenPhotoUpload?: () => void;
    onOpenGraphicUpload?: () => void;
    onOpenIconUpload?: () => void;
    /** Abre o modal de upload de ícone já com este arquivo (raster). Para SVG use handleAssetFile direto. */
    onOpenIconUploadWithFile?: (file: File) => void;
    assetUploadError: string | null;
    uploadTarget: string;
    /** Estado de expansão dos blocos (controlado pelo pai para preservar ao trocar de guia). */
    expandedSections: Record<string, boolean>;
    /** Callback para atualizar o estado de expansão. */
    onExpandedSectionsChange: (next: Record<string, boolean>) => void;
    /** Se false, barra de salvar fica a cargo do ClientDetail (fixa no rodapé). Default true. */
    embeddedSaveBar?: boolean;
};

export const BrandGuideSectionEditor: React.FC<BrandGuideSectionEditorProps> = (props) => {
    const {
        editedClient,
        handlers: { onUpdate, onCancel, onSave, requestConfirmation, onCopy, showConfirmation },
        isDirty,
        saveBarMessage,
        onFeedbackDismiss,
        t,
        logoUploadError,
        setLogoUploadError,
        copiedHex,
        onOpenLogoUpload,
        onOpenPhotoUpload,
        onOpenGraphicUpload,
        onOpenIconUpload,
        onOpenIconUploadWithFile,
        assetUploadError,
        uploadTarget,
        expandedSections,
        onExpandedSectionsChange,
        embeddedSaveBar = true,
    } = props;

    const brandAssets = editedClient.brandAssets || [];
    const lastColorRef = useRef<HTMLDivElement>(null);
    const lastLogoRef = useRef<HTMLDivElement>(null);
    const colorTriggerRef = useRef<HTMLButtonElement>(null);
    const [shouldScrollToNewColor, setShouldScrollToNewColor] = useState(false);
    const [shouldScrollToNewLogo, setShouldScrollToNewLogo] = useState(false);
    const [editingColorIndex, setEditingColorIndex] = useState<number | null>(null);
    const [editingColorNameIndex, setEditingColorNameIndex] = useState<number | null>(null);

    const [fontDraft, setFontDraft] = useState<Record<string, string>>({});
    const [editingFontLabel, setEditingFontLabel] = useState<'primary' | 'secondary' | 'tertiary' | null>(null);
    const [fontLabelDraft, setFontLabelDraft] = useState('');
    const prevIsDirtyRef = useRef(isDirty);
    useEffect(() => {
        if (prevIsDirtyRef.current && !isDirty && editingFontLabel) {
            setEditingFontLabel(null);
            setFontLabelDraft('');
        }
        prevIsDirtyRef.current = isDirty;
    }, [isDirty, editingFontLabel]);

    const toggleSection = (key: string) => {
        onExpandedSectionsChange({ ...expandedSections, [key]: !expandedSections[key] });
    };

    useEffect(() => {
        if (!shouldScrollToNewColor) return;
        const el = lastColorRef.current;
        if (el) {
            requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
        }
        setShouldScrollToNewColor(false);
    }, [shouldScrollToNewColor]);

    useEffect(() => {
        if (!shouldScrollToNewLogo) return;
        const el = lastLogoRef.current;
        if (el) {
            requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
        }
        setShouldScrollToNewLogo(false);
    }, [shouldScrollToNewLogo]);

    const logos = brandAssets.filter((a: BrandAsset) => a.type === 'logo');
    const photos = brandAssets.filter((a: BrandAsset) => a.type === 'photo');
    const graphics = brandAssets.filter((a: BrandAsset) => a.type === 'graphic');
    const icons = brandAssets.filter((a: BrandAsset) => a.type === 'icon');
    const brandBook = brandAssets.find((a: BrandAsset) => a.type === 'brand_book');
    const isLogosLimitReached = logos.length >= MAX_LOGOS;
    const isPhotosLimitReached = photos.length >= MAX_PHOTOS;
    const isGraphicsLimitReached = graphics.length >= MAX_GRAPHICS;
    const isIconsLimitReached = icons.length >= MAX_ICONS;

    const addBrandAsset = (asset: BrandAsset, type?: BrandAsset['type']) => {
        const nextAssets = [...brandAssets, asset];
        const update: Partial<Client> = { brandAssets: nextAssets };
        if (type === 'logo' && asset.url) {
            const wasFirstLogo = !brandAssets.some((a: BrandAsset) => a.type === 'logo');
            if (wasFirstLogo) update.principalLogoIndex = 0;
            setShouldScrollToNewLogo(true);
        }
        onUpdate(update);
    };
    const removeBrandAsset = (id: string) => {
        const removed = brandAssets.find((a: BrandAsset) => a.id === id);
        const nextAssets = brandAssets.filter((a: BrandAsset) => a.id !== id);
        const update: Partial<Client> = { brandAssets: nextAssets };
        if (removed?.type === 'logo') {
            const currentLogos = brandAssets.filter((a: BrandAsset) => a.type === 'logo');
            const removedLogoIndex = currentLogos.findIndex((a: BrandAsset) => a.id === id);
            const principalIdx = editedClient.principalLogoIndex ?? null;
            if (principalIdx === removedLogoIndex) {
                update.principalLogoIndex = null;
            } else if (principalIdx !== null && principalIdx > removedLogoIndex) {
                update.principalLogoIndex = principalIdx - 1;
            }
        }
        if (removed?.type === 'font') {
            const ty = editedClient.typography || {};
            const slotKeys: Array<'primaryFontAssetId' | 'secondaryFontAssetId' | 'tertiaryFontAssetId'> = ['primaryFontAssetId', 'secondaryFontAssetId', 'tertiaryFontAssetId'];
            const tyCopy = { ...ty };
            for (const k of slotKeys) {
                if (ty[k] === id) delete tyCopy[k];
            }
            update.typography = tyCopy;
        }
        onUpdate(update);
    };

    type FontSlot = 'primary' | 'secondary' | 'tertiary';
    type FontLabelKey = 'primaryFontLabel' | 'secondaryFontLabel' | 'tertiaryFontLabel';
    const FONT_SLOTS: { slot: FontSlot; fontKey: keyof NonNullable<Client['typography']>; assetIdKey: 'primaryFontAssetId' | 'secondaryFontAssetId' | 'tertiaryFontAssetId'; labelKey: FontLabelKey; defaultLabelKey: 'primary_font' | 'secondary_font' | 'tertiary_font' }[] = [
        { slot: 'primary', fontKey: 'primaryFont', assetIdKey: 'primaryFontAssetId', labelKey: 'primaryFontLabel', defaultLabelKey: 'primary_font' },
        { slot: 'secondary', fontKey: 'secondaryFont', assetIdKey: 'secondaryFontAssetId', labelKey: 'secondaryFontLabel', defaultLabelKey: 'secondary_font' },
        { slot: 'tertiary', fontKey: 'tertiaryFont', assetIdKey: 'tertiaryFontAssetId', labelKey: 'tertiaryFontLabel', defaultLabelKey: 'tertiary_font' },
    ];

    const handleFontFileUpload = async (file: File, slot: FontSlot) => {
        const n = (file.name || '').toLowerCase();
        if (!n.endsWith('.ttf') && !n.endsWith('.otf') && !n.endsWith('.woff')) {
            setLogoUploadError(t('upload_font_hint').replace(/\.$/, '') + '. Use .ttf, .otf ou .woff.');
            return;
        }
        if (file.size > UPLOAD_FONT_MAX_BYTES) {
            setLogoUploadError('Arquivo muito grande. Máximo 10MB.');
            return;
        }
        setLogoUploadError(null);
        try {
            const { url } = await apiUploadFont(file);
            const assetId = `asset-${Date.now()}`;
            const asset: BrandAsset = { id: assetId, name: file.name, type: 'font', url };
            const ty = editedClient.typography || {};
            const conf = FONT_SLOTS.find((c) => c.slot === slot)!;
            const oldAssetId = ty[conf.assetIdKey];
            const nextAssets = [...brandAssets.filter((a) => a.id !== oldAssetId), asset];
            const typoUpdate: NonNullable<Client['typography']> = { ...ty, [conf.fontKey]: '', [conf.assetIdKey]: assetId };
            onUpdate({ brandAssets: nextAssets, typography: typoUpdate });
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erro no upload.';
            setLogoUploadError(msg);
        }
    };

    const clearFontSlot = (slot: FontSlot, assetId?: string) => {
        const ty = editedClient.typography || {};
        const conf = FONT_SLOTS.find((c) => c.slot === slot)!;
        const typoUpdate = { ...ty, [conf.fontKey]: undefined, [conf.assetIdKey]: undefined };
        let nextAssets = brandAssets;
        if (assetId) nextAssets = brandAssets.filter((a) => a.id !== assetId);
        onUpdate({ typography: typoUpdate, brandAssets: nextAssets });
        setFontDraft((prev) => { const n = { ...prev }; delete n[slot]; return n; });
    };

    const handleAssetFile = async (file: File, type: BrandAsset['type']) => {
        if (type === 'logo' && file.type.startsWith('image/')) {
            if (isLogosLimitReached) {
                setLogoUploadError(t('logos_limit_reached_tooltip'));
                return;
            }
            setLogoUploadError(null);
            try {
                const { url } = await apiUpload(file);
                addBrandAsset({ id: `asset-${Date.now()}`, name: file.name, type, url }, type);
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Erro no upload.';
                setLogoUploadError(msg);
            }
            return;
        }
        if ((type === 'photo' || type === 'graphic' || type === 'icon') && file.type.startsWith('image/')) {
            if ((type === 'photo' && isPhotosLimitReached) || (type === 'graphic' && isGraphicsLimitReached) || (type === 'icon' && isIconsLimitReached)) {
                setLogoUploadError(type === 'photo' ? t('photos_limit_reached_tooltip') : type === 'graphic' ? t('graphics_limit_reached_tooltip') : t('icons_limit_reached_tooltip'));
                return;
            }
            setLogoUploadError(null);
            try {
                const { url } = await apiUpload(file);
                addBrandAsset({ id: `asset-${Date.now()}`, name: file.name, type, url }, type);
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Erro no upload.';
                setLogoUploadError(msg);
            }
            return;
        }
        if (type === 'icon' && (file.type === 'image/svg+xml' || (file.name || '').toLowerCase().endsWith('.svg'))) {
            if (isIconsLimitReached) {
                setLogoUploadError(t('icons_limit_reached_tooltip'));
                return;
            }
        }
        if (type === 'brand_book' && (file.type === 'application/pdf' || (file.name || '').toLowerCase().endsWith('.pdf'))) {
            setLogoUploadError(null);
            if (file.size > UPLOAD_DOCUMENT_MAX_BYTES) {
                setLogoUploadError(t('brand_book_too_large'));
                return;
            }
            try {
                const { url } = await apiUploadDocument(file);
                const originalName = file.name;
                const urlWithOriginalName = url.includes('?') ? `${url}&originalName=${encodeURIComponent(originalName)}` : `${url}?originalName=${encodeURIComponent(originalName)}`;
                // `name` guarda apenas o texto custom (renomeável). O nome original do arquivo fica em `originalName` na URL.
                addBrandAsset({ id: `asset-${Date.now()}`, name: '', type, url: urlWithOriginalName }, type);
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Erro no upload.';
                setLogoUploadError(msg);
            }
            return;
        }
        // Font: não usar base64; deve ser enviado via handleFontFileUpload(slot)
        if (type === 'font') return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const url = reader.result as string;
            addBrandAsset({ id: `asset-${Date.now()}`, name: file.name, type, url }, type);
        };
        reader.readAsDataURL(file);
    };

    const setLogoName = (id: string, name: string) => {
        onUpdate({
            brandAssets: brandAssets.map((a) => (a.id === id ? { ...a, name } : a)),
        });
    };

    const setPrincipalLogo = (index: number | null) => onUpdate({ principalLogoIndex: index });

    const renderAssetGrid = (items: BrandAsset[], type: BrandAsset['type'], onAdd: () => void) => (
        <div className="flex flex-wrap gap-3">
            {items.map((a, idx) => (
                <div
                    key={a.id}
                    ref={idx === items.length - 1 ? lastLogoRef : undefined}
                    className="relative group"
                >
                    {a.url && <img src={toUploadUrl(a.url)} alt={a.name} className="w-20 h-20 object-contain rounded-lg border border-gray-200 dark:border-gray-600" />}
                    <button type="button" onClick={() => removeBrandAsset(a.id)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"><XIcon className="w-3 h-3" /></button>
                </div>
            ))}
            <button type="button" onClick={onAdd} className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400 hover:border-indigo-500 hover:text-indigo-500">
                <PlusIcon className="w-6 h-6" />
            </button>
        </div>
    );

    return (
        <div className="space-y-4">
            {embeddedSaveBar && (isDirty || saveBarMessage) && (
                <div className="flex justify-end -mt-2">
                    <UnsavedChangesBar onCancel={onCancel} onSave={onSave} requestConfirmation={requestConfirmation} feedback={saveBarMessage ?? undefined} onFeedbackDismiss={onFeedbackDismiss} />
                </div>
            )}
            <div className="space-y-4">
                {/* Bloco 1: Logotipos e elementos principais */}
                <CollapsibleSectionBlock title={t('brand_guide_block_logos_title')} description={t('brand_guide_block_logos_desc')} accent="logos_elements" expanded={!!expandedSections.main_logos_elements} onToggle={() => toggleSection('main_logos_elements')}>
                <CollapsibleBlock title={t('logo_variations')} expanded={!!expandedSections.logos} onToggle={() => toggleSection('logos')}>
                    <div className="pt-4">
                        <input type="file" accept="image/*" className="hidden" id="brand-logo-upload" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAssetFile(f, 'logo'); e.target.value = ''; }} />
                        {logos.length === 0 ? (
                            <div className="rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 p-8 text-center">
                                <p className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">{t('logos_empty_title')}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 max-w-md mx-auto">{t('logos_empty_description')}</p>
                                {/* Frase única do limite (quantidade + tamanho por arquivo) */}
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">{t('logos_limit_info')}</p>
                                <TooltipHint label={t('add_logo')}>
                                    <button
                                        type="button"
                                        onClick={() => (onOpenLogoUpload ? onOpenLogoUpload() : document.getElementById('brand-logo-upload')?.click())}
                                        className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
                                        aria-label={t('add_logo')}
                                    >
                                        {t('add_logo')}
                                    </button>
                                </TooltipHint>
                            </div>
                        ) : (
                            <>
                                {logoUploadError && <p className="text-sm text-amber-600 dark:text-amber-400 mb-2" role="alert">{logoUploadError}</p>}
                                <div className="flex flex-wrap gap-4">
                                    {logos.map((a, idx) => {
                                        const principalIdx = editedClient.principalLogoIndex ?? null;
                                        const isPrincipal = principalIdx === idx;
                                        return (
                                            <LogoCard
                                                key={a.id}
                                                asset={a}
                                                isPrincipal={isPrincipal}
                                                onSetPrincipal={() => setPrincipalLogo(isPrincipal ? null : idx)}
                                                onRemove={() => {
                                                    if (isPrincipal && showConfirmation) {
                                                        showConfirmation({ title: t('confirm_delete_title'), message: t('confirm_delete_principal_logo'), onConfirm: () => removeBrandAsset(a.id) });
                                                    } else {
                                                        removeBrandAsset(a.id);
                                                    }
                                                }}
                                                onNameChange={(name) => setLogoName(a.id, name)}
                                                t={t}
                                                lastRef={idx === logos.length - 1 ? lastLogoRef : undefined}
                                            />
                                        );
                                    })}
                                    <TooltipHint label={isLogosLimitReached ? t('logos_limit_reached_tooltip') : t('add_logo')}>
                                        <button
                                            type="button"
                                            aria-disabled={isLogosLimitReached}
                                            aria-label={isLogosLimitReached ? t('logos_limit_reached_tooltip') : t('add_logo')}
                                            onClick={() => {
                                                if (isLogosLimitReached) return;
                                                onOpenLogoUpload ? onOpenLogoUpload() : document.getElementById('brand-logo-upload')?.click();
                                            }}
                                            className={`${LOGO_CARD_SIZE} min-h-[200px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors bg-gray-50/30 dark:bg-gray-800/20 ${
                                                isLogosLimitReached
                                                    ? 'border-gray-300 text-gray-400 cursor-not-allowed hover:border-red-500 hover:text-red-500'
                                                    : 'border-gray-300 dark:border-gray-600 text-gray-400 hover:border-indigo-500 hover:text-indigo-500'
                                            }`}
                                        >
                                            <PlusIcon className="w-8 h-8" />
                                            <span className="text-sm font-medium">{t('add_logo')}</span>
                                        </button>
                                    </TooltipHint>
                                </div>
                                <div className="mt-6 pt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <InfoIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" aria-hidden />
                                    <span className={isLogosLimitReached ? 'text-red-600 dark:text-red-400' : ''}>
                                        {logos.length}/{MAX_LOGOS} logotipos • {t('logos_upto_5mb_per_file')}
                                        {isLogosLimitReached ? ` — ${t('logos_limit_reached_label')}` : ''}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </CollapsibleBlock>

                {/* Ícones — dentro do Bloco 1 */}
                <CollapsibleBlock title={t('icons')} expanded={!!expandedSections.icons} onToggle={() => toggleSection('icons')}>
                    <div className="pt-4">
                        <input
                            type="file"
                            accept=".svg,image/svg+xml,image/jpeg,image/png,image/webp"
                            className="hidden"
                            id="brand-icon-upload"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                e.target.value = '';
                                if (!f) return;
                                const isSvg = f.type === 'image/svg+xml' || (f.name || '').toLowerCase().endsWith('.svg');
                                if (isSvg) handleAssetFile(f, 'icon');
                                else onOpenIconUploadWithFile?.(f);
                            }}
                        />
                        {icons.length === 0 ? (
                            <div className="rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 p-8 text-center">
                                <p className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">{t('icons_empty_title')}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 max-w-md mx-auto">{t('icons_empty_description')}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">{t('icons_limit_info')}</p>
                                <TooltipHint label={t('add_icon')}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!isIconsLimitReached) document.getElementById('brand-icon-upload')?.click();
                                        }}
                                        className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
                                        aria-label={t('add_icon')}
                                    >
                                        {t('add_icon')}
                                    </button>
                                </TooltipHint>
                            </div>
                        ) : (
                            <>
                                {uploadTarget === 'icon' && assetUploadError && <p className="text-sm text-amber-600 dark:text-amber-400 mb-2" role="alert">{assetUploadError}</p>}
                                <div className="flex flex-wrap gap-4">
                                    {icons.map((a, idx) => (
                                        <AssetCard key={a.id} asset={a} onRemove={() => removeBrandAsset(a.id)} onNameChange={(name) => onUpdate({ brandAssets: brandAssets.map((x) => (x.id === a.id ? { ...x, name } : x)) })} t={t} lastRef={idx === icons.length - 1 ? lastLogoRef : undefined} />
                                    ))}
                                    <TooltipHint label={isIconsLimitReached ? t('icons_limit_reached_tooltip') : t('add_icon')}>
                                        <button
                                            type="button"
                                            aria-disabled={isIconsLimitReached}
                                            aria-label={isIconsLimitReached ? t('icons_limit_reached_tooltip') : t('add_icon')}
                                            onClick={() => {
                                                if (!isIconsLimitReached) document.getElementById('brand-icon-upload')?.click();
                                            }}
                                            className={`${LOGO_CARD_SIZE} min-h-[200px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors bg-gray-50/30 dark:bg-gray-800/20 ${isIconsLimitReached ? 'border-gray-300 text-gray-400 cursor-not-allowed hover:border-red-500 hover:text-red-500' : 'border-gray-300 dark:border-gray-600 text-gray-400 hover:border-indigo-500 hover:text-indigo-500'}`}
                                        >
                                            <PlusIcon className="w-8 h-8" />
                                            <span className="text-sm font-medium">{t('add_icon')}</span>
                                        </button>
                                    </TooltipHint>
                                </div>
                                <div className="mt-6 pt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <InfoIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" aria-hidden />
                                    <span className={isIconsLimitReached ? 'text-red-600 dark:text-red-400' : ''}>{icons.length}/{MAX_ICONS} ícones • {t('logos_upto_5mb_per_file')}{isIconsLimitReached ? ` — ${t('logos_limit_reached_label')}` : ''}</span>
                                </div>
                            </>
                        )}
                    </div>
                </CollapsibleBlock>

                {/* Elementos gráficos — dentro do Bloco 1 */}
                <CollapsibleBlock title={t('graphic_elements')} expanded={!!expandedSections.graphics} onToggle={() => toggleSection('graphics')}>
                    <div className="pt-4">
                        {graphics.length === 0 ? (
                            <div className="rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 p-8 text-center">
                                <p className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">{t('graphics_empty_title')}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 max-w-md mx-auto">{t('graphics_empty_description')}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">{t('graphics_limit_info')}</p>
                                <TooltipHint label={t('add_graphic')}>
                                    <button type="button" onClick={() => onOpenGraphicUpload?.()} className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors" aria-label={t('add_graphic')}>
                                        {t('add_graphic')}
                                    </button>
                                </TooltipHint>
                            </div>
                        ) : (
                            <>
                                {uploadTarget === 'graphic' && assetUploadError && <p className="text-sm text-amber-600 dark:text-amber-400 mb-2" role="alert">{assetUploadError}</p>}
                                <div className="flex flex-wrap gap-4">
                                    {graphics.map((a, idx) => (
                                        <AssetCard key={a.id} asset={a} onRemove={() => removeBrandAsset(a.id)} onNameChange={(name) => onUpdate({ brandAssets: brandAssets.map((x) => (x.id === a.id ? { ...x, name } : x)) })} t={t} lastRef={idx === graphics.length - 1 ? lastLogoRef : undefined} />
                                    ))}
                                    <TooltipHint label={isGraphicsLimitReached ? t('graphics_limit_reached_tooltip') : t('add_graphic')}>
                                        <button
                                            type="button"
                                            aria-disabled={isGraphicsLimitReached}
                                            aria-label={isGraphicsLimitReached ? t('graphics_limit_reached_tooltip') : t('add_graphic')}
                                            onClick={() => {
                                                if (!isGraphicsLimitReached) onOpenGraphicUpload?.();
                                            }}
                                            className={`${LOGO_CARD_SIZE} min-h-[200px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors bg-gray-50/30 dark:bg-gray-800/20 ${isGraphicsLimitReached ? 'border-gray-300 text-gray-400 cursor-not-allowed hover:border-red-500 hover:text-red-500' : 'border-gray-300 dark:border-gray-600 text-gray-400 hover:border-indigo-500 hover:text-indigo-500'}`}
                                        >
                                            <PlusIcon className="w-8 h-8" />
                                            <span className="text-sm font-medium">{t('add_graphic')}</span>
                                        </button>
                                    </TooltipHint>
                                </div>
                                <div className="mt-6 pt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <InfoIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" aria-hidden />
                                    <span className={isGraphicsLimitReached ? 'text-red-600 dark:text-red-400' : ''}>{graphics.length}/{MAX_GRAPHICS} elementos gráficos • {t('logos_upto_5mb_per_file')}{isGraphicsLimitReached ? ` — ${t('logos_limit_reached_label')}` : ''}</span>
                                </div>
                            </>
                        )}
                    </div>
                </CollapsibleBlock>
                </CollapsibleSectionBlock>

                {/* Bloco 2: Base visual da marca */}
                <CollapsibleSectionBlock title={t('brand_guide_block_base_title')} description={t('brand_guide_block_base_desc')} accent="base_visual" expanded={!!expandedSections.main_base_visual} onToggle={() => toggleSection('main_base_visual')}>
                <CollapsibleBlock title={t('color_palette')} expanded={!!expandedSections.colors} onToggle={() => toggleSection('colors')}>
                    <div className="pt-4">
                        {!editedClient.brandColors?.length ? (
                            <div className="rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 p-8 text-center">
                                <p className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">{t('palette_empty_title')}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">{t('palette_empty_description')}</p>
                                <TooltipHint label={t('add_color')}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onUpdate({ brandColors: [...(editedClient.brandColors || []), { name: 'Nova Cor', hex: '#000000' }], headerColorIndex: 0 });
                                            setShouldScrollToNewColor(true);
                                        }}
                                        className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
                                        aria-label={t('add_color')}
                                    >
                                        {t('add_color')}
                                    </button>
                                </TooltipHint>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-4">
                                {editedClient.brandColors?.map((c, i) => {
                                    const hex = resolveColorHex(c.hex);
                                    const headerColorIndex = editedClient.headerColorIndex ?? null;
                                    const isHeaderColor = headerColorIndex === i;
                                    return (
                                        <div key={i} ref={i === (editedClient.brandColors?.length ?? 1) - 1 ? lastColorRef : undefined} className={`relative flex flex-col ${PALETTE_CARD_SIZE} min-h-[220px] rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 overflow-visible`}>
                                            <div className="flex-1 min-h-[100px] flex flex-col items-center justify-center p-4">
                                                <TooltipHint label={t('brand_color')}>
                                                    <button
                                                        ref={editingColorIndex === i ? colorTriggerRef : undefined}
                                                        type="button"
                                                        onClick={() => setEditingColorIndex(i)}
                                                        className="w-28 h-28 rounded-full border-2 border-gray-200 dark:border-gray-600 shadow-md shrink-0 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                        style={{ backgroundColor: hex }}
                                                        aria-label={t('brand_color')}
                                                    />
                                                </TooltipHint>
                                            </div>
                                            <div className="px-3 pb-3 pt-1 space-y-2">
                                                <div className="flex items-center justify-between gap-2 min-h-[2rem]">
                                                    {editingColorNameIndex === i ? (
                                                        <input
                                                            type="text"
                                                            value={c.name}
                                                            onChange={(e) => { const nc = [...(editedClient.brandColors || [])]; nc[i] = { ...nc[i], name: e.target.value }; onUpdate({ brandColors: nc }); }}
                                                            onBlur={() => setEditingColorNameIndex(null)}
                                                            onKeyDown={(e) => { if (e.key === 'Enter') setEditingColorNameIndex(null); if (e.key === 'Escape') setEditingColorNameIndex(null); }}
                                                            className="flex-1 min-w-0 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded px-2 py-1 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-left"
                                                            placeholder={t('color_name')}
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <TooltipHint label={c.name?.trim() || t('color_name')} className="flex-1 min-w-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingColorNameIndex(i)}
                                                                className="flex w-full min-w-0 text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 truncate text-left cursor-pointer"
                                                                aria-label={c.name?.trim() || t('color_name')}
                                                            >
                                                                {c.name?.trim() || t('color_name')}
                                                            </button>
                                                        </TooltipHint>
                                                    )}
                                                    <TooltipHint label={isHeaderColor ? t('principal') : t('set_as_principal')}>
                                                        <button
                                                            type="button"
                                                            onClick={() => onUpdate(isHeaderColor ? { headerColorIndex: null } : { headerColorIndex: i })}
                                                            className="shrink-0 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                                                            aria-label={isHeaderColor ? t('principal') : t('set_as_principal')}
                                                        >
                                                            <StarIcon className={`w-5 h-5 ${isHeaderColor ? 'text-indigo-600 dark:text-indigo-400 fill-indigo-600 dark:fill-indigo-400' : 'text-gray-400 dark:text-gray-500'}`} />
                                                        </button>
                                                    </TooltipHint>
                                                </div>
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{hex}</span>
                                                    <TooltipHint label={copiedHex === hex ? t('copied') : t('copy')}>
                                                        <button
                                                            type="button"
                                                            onClick={() => onCopy(hex)}
                                                            className="p-1 rounded text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                                                            aria-label={copiedHex === hex ? t('copied') : t('copy')}
                                                        >
                                                            {copiedHex === hex ? t('copied') : <CopyIcon className="w-4 h-4" />}
                                                        </button>
                                                    </TooltipHint>
                                                </div>
                                            </div>
                                            <div className="absolute -top-1 -right-1 z-10">
                                                <TooltipHint label={t('remove_item')}>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const doRemove = () => {
                                                                const next = editedClient.brandColors?.filter((_, idx) => idx !== i) ?? [];
                                                                const currentHeaderIndex = editedClient.headerColorIndex ?? null;
                                                                const update: Partial<Client> = { brandColors: next };
                                                                if (currentHeaderIndex === i) {
                                                                    update.headerColorIndex = null;
                                                                } else if (currentHeaderIndex !== null && currentHeaderIndex > i) {
                                                                    update.headerColorIndex = currentHeaderIndex - 1;
                                                                }
                                                                onUpdate(update);
                                                                setEditingColorIndex(null);
                                                                if (editingColorNameIndex === i) setEditingColorNameIndex(null);
                                                            };
                                                            if (isHeaderColor && showConfirmation) {
                                                                showConfirmation({ title: t('confirm_delete_title'), message: t('confirm_delete_principal_color'), onConfirm: doRemove });
                                                            } else {
                                                                doRemove();
                                                            }
                                                        }}
                                                        className="bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                                                        aria-label={t('remove_item')}
                                                    >
                                                        <XIcon className="w-3 h-3" />
                                                    </button>
                                                </TooltipHint>
                                            </div>
                                        </div>
                                    );
                                })}
                                <TooltipHint label={t('add_color')}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const next = [...(editedClient.brandColors || []), { name: 'Nova Cor', hex: '#000000' }];
                                            const wasFirst = !editedClient.brandColors?.length;
                                            onUpdate({ brandColors: next, ...(wasFirst ? { headerColorIndex: 0 } : {}) });
                                            setShouldScrollToNewColor(true);
                                        }}
                                        className={`${PALETTE_CARD_SIZE} min-h-[220px] rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-indigo-500 hover:text-indigo-500 transition-colors bg-gray-50/30 dark:bg-gray-800/20`}
                                        aria-label={t('add_color')}
                                    >
                                        <PlusIcon className="w-8 h-8" />
                                        <span className="text-sm font-medium">{t('add_color')}</span>
                                    </button>
                                </TooltipHint>
                            </div>
                        )}
                        {editingColorIndex !== null && editedClient.brandColors?.[editingColorIndex] && (
                            <ColorPickerPopover
                                color={resolveColorHex(editedClient.brandColors[editingColorIndex].hex)}
                                onChange={(newHex) => {
                                    const nc = [...(editedClient.brandColors || [])];
                                    nc[editingColorIndex] = { ...nc[editingColorIndex], hex: newHex };
                                    onUpdate({ brandColors: nc });
                                }}
                                onClose={() => setEditingColorIndex(null)}
                                anchorRef={colorTriggerRef}
                                t={t}
                            />
                        )}
                    </div>
                </CollapsibleBlock>

                {/* 3. Fontes — 3 slots: Primária, Secundária, Terciária — Google Fonts ou upload de arquivo */}
                <CollapsibleBlock title={t('typography_fonts')} expanded={!!expandedSections.fonts} onToggle={() => toggleSection('fonts')}>
                    <div className="pt-4 space-y-8">
                        {logoUploadError && <p className="text-sm text-amber-600 dark:text-amber-400" role="alert">{logoUploadError}</p>}
                        {FONT_SLOTS.map(({ slot, fontKey, assetIdKey, labelKey, defaultLabelKey }) => {
                            const ty = editedClient.typography || {};
                            const googleFont = (ty[fontKey] as string) || '';
                            const assetId = ty[assetIdKey];
                            const fontAsset = assetId ? brandAssets.find((a) => a.id === assetId && a.type === 'font') : null;
                            const customLabel = ty[labelKey];
                            const displayLabel = (customLabel || '').trim() || t(defaultLabelKey);
                            const isEditingLabel = editingFontLabel === slot;
                            return (
                                <div key={slot} className="space-y-2">
                                    <div className="flex items-center gap-2 min-h-[1.75rem]">
                                        {isEditingLabel ? (
                                            <input
                                                type="text"
                                                value={fontLabelDraft}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setFontLabelDraft(val);
                                                    onUpdate({ typography: { ...ty, [labelKey]: val.trim() || undefined } });
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Escape') {
                                                        setEditingFontLabel(null);
                                                        setFontLabelDraft('');
                                                        (e.target as HTMLInputElement).blur();
                                                    }
                                                }}
                                                placeholder={t('font_label_placeholder')}
                                                className="w-full max-w-[280px] text-sm font-medium bg-transparent py-1 px-0 border-0 border-b border-gray-300 dark:border-gray-500 focus:outline-none focus:ring-0 focus:border-gray-400 dark:focus:border-gray-400 text-gray-700 dark:text-gray-300 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                                                autoFocus
                                            />
                                        ) : (
                                            <TooltipHint label={t('edit') || 'Editar'}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingFontLabel(slot);
                                                        setFontLabelDraft(displayLabel);
                                                    }}
                                                    className="group flex items-center gap-2 max-w-[280px] text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left"
                                                    aria-label={t('edit') || 'Editar'}
                                                >
                                                    <span className="truncate">{displayLabel}</span>
                                                    <EditIcon className="w-3.5 h-3.5 shrink-0 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                                                </button>
                                            </TooltipHint>
                                        )}
                                    </div>
                                    {fontAsset ? (
                                        <FontCard
                                            asset={fontAsset}
                                            onRemove={() => clearFontSlot(slot, fontAsset.id)}
                                            t={t}
                                        />
                                    ) : googleFont ? (
                                        <FontCard
                                            googleFontName={googleFont}
                                            onRemove={() => clearFontSlot(slot)}
                                            t={t}
                                        />
                                    ) : (
                                        <div className="flex items-center gap-6 flex-wrap">
                                            <input
                                                list={`google-fonts-${slot}`}
                                                value={fontDraft[slot] ?? ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setFontDraft((prev) => ({ ...prev, [slot]: val }));
                                                    const trimmed = val.trim();
                                                    if (trimmed && GOOGLE_FONTS_LIST.includes(trimmed)) {
                                                        const oldId = ty[assetIdKey];
                                                        const nextAssets = oldId ? brandAssets.filter((a) => a.id !== oldId) : brandAssets;
                                                        onUpdate({ typography: { ...ty, [fontKey]: trimmed, [assetIdKey]: undefined }, brandAssets: nextAssets });
                                                        setFontDraft((prev) => { const n = { ...prev }; delete n[slot]; return n; });
                                                    }
                                                }}
                                                onBlur={() => {
                                                    const val = (fontDraft[slot] ?? '').trim();
                                                    if (!val) return;
                                                    const oldId = ty[assetIdKey];
                                                    const nextAssets = oldId ? brandAssets.filter((a) => a.id !== oldId) : brandAssets;
                                                    onUpdate({ typography: { ...ty, [fontKey]: val, [assetIdKey]: undefined }, brandAssets: nextAssets });
                                                    setFontDraft((prev) => { const n = { ...prev }; delete n[slot]; return n; });
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.currentTarget.blur();
                                                    }
                                                }}
                                                placeholder={t('google_font_hint')}
                                                className="w-full max-w-[280px] bg-gray-50 dark:bg-gray-700 p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-gray-900 dark:text-white"
                                            />
                                            <datalist id={`google-fonts-${slot}`}>{GOOGLE_FONTS_LIST.map((f) => <option key={f} value={f} />)}</datalist>
                                            <div className="flex items-center gap-3 shrink-0 pl-4 sm:pl-6 border-l border-gray-200 dark:border-gray-600">
                                                <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('or_upload_font')}</span>
                                                <label className="inline-flex items-center px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors text-indigo-600 dark:text-indigo-400 shrink-0">
                                                    <span>{t('select_font_file')}</span>
                                                    <input type="file" accept=".ttf,.otf,.woff" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFontFileUpload(f, slot); e.target.value = ''; }} />
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('fonts_empty_hint')}</p>
                    </div>
                </CollapsibleBlock>
                </CollapsibleSectionBlock>

                {/* Bloco 3: Biblioteca visual */}
                <CollapsibleSectionBlock title={t('brand_guide_block_biblioteca_title')} description={t('brand_guide_block_biblioteca_desc')} accent="biblioteca" expanded={!!expandedSections.main_biblioteca} onToggle={() => toggleSection('main_biblioteca')}>
                <CollapsibleBlock title={t('photos')} expanded={!!expandedSections.photos} onToggle={() => toggleSection('photos')}>
                    <div className="pt-4">
                        {photos.length === 0 ? (
                            <div className="rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 p-8 text-center">
                                <p className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">{t('photos_empty_title')}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 max-w-md mx-auto">{t('photos_empty_description')}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">{t('photos_limit_info')}</p>
                                <TooltipHint label={t('add_photo')}>
                                    <button type="button" onClick={() => onOpenPhotoUpload?.()} className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors" aria-label={t('add_photo')}>
                                        {t('add_photo')}
                                    </button>
                                </TooltipHint>
                            </div>
                        ) : (
                            <>
                                {uploadTarget === 'photo' && assetUploadError && <p className="text-sm text-amber-600 dark:text-amber-400 mb-2" role="alert">{assetUploadError}</p>}
                                <div className="flex flex-wrap gap-4">
                                    {photos.map((a, idx) => (
                                        <AssetCard key={a.id} asset={a} onRemove={() => removeBrandAsset(a.id)} onNameChange={(name) => onUpdate({ brandAssets: brandAssets.map((x) => (x.id === a.id ? { ...x, name } : x)) })} t={t} lastRef={idx === photos.length - 1 ? lastLogoRef : undefined} />
                                    ))}
                                    <TooltipHint label={isPhotosLimitReached ? t('photos_limit_reached_tooltip') : t('add_photo')}>
                                        <button
                                            type="button"
                                            aria-disabled={isPhotosLimitReached}
                                            aria-label={isPhotosLimitReached ? t('photos_limit_reached_tooltip') : t('add_photo')}
                                            onClick={() => {
                                                if (!isPhotosLimitReached) onOpenPhotoUpload?.();
                                            }}
                                            className={`${LOGO_CARD_SIZE} min-h-[200px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors bg-gray-50/30 dark:bg-gray-800/20 ${isPhotosLimitReached ? 'border-gray-300 text-gray-400 cursor-not-allowed hover:border-red-500 hover:text-red-500' : 'border-gray-300 dark:border-gray-600 text-gray-400 hover:border-indigo-500 hover:text-indigo-500'}`}
                                        >
                                            <PlusIcon className="w-8 h-8" />
                                            <span className="text-sm font-medium">{t('add_photo')}</span>
                                        </button>
                                    </TooltipHint>
                                </div>
                                <div className="mt-6 pt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <InfoIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" aria-hidden />
                                    <span className={isPhotosLimitReached ? 'text-red-600 dark:text-red-400' : ''}>{photos.length}/{MAX_PHOTOS} fotos • {t('logos_upto_5mb_per_file')}{isPhotosLimitReached ? ` — ${t('logos_limit_reached_label')}` : ''}</span>
                                </div>
                            </>
                        )}
                    </div>
                </CollapsibleBlock>
                </CollapsibleSectionBlock>

                {/* Bloco 4: Documentação da marca */}
                <CollapsibleSectionBlock title={t('brand_guide_block_documentacao_title')} description={t('brand_guide_block_documentacao_desc')} accent="documentacao" expanded={!!expandedSections.main_documentacao} onToggle={() => toggleSection('main_documentacao')}>
                <CollapsibleBlock title={t('brand_book_pdf')} expanded={!!expandedSections.brand_book} onToggle={() => toggleSection('brand_book')}>
                    <div className="pt-4">
                        {brandBook ? (
                            <BrandBookCard
                                asset={brandBook}
                                onRemove={() => removeBrandAsset(brandBook.id)}
                                onNameChange={(name) =>
                                    onUpdate({
                                        brandAssets: brandAssets.map((x) => {
                                            if (x.id !== brandBook.id) return x;
                                            const currentUrl = x.url || '';
                                            if (!currentUrl || currentUrl.includes('originalName=')) return { ...x, name };

                                            const originalName = (x.name || '').trim() || 'manual.pdf';
                                            const urlWithOriginalName = currentUrl.includes('?')
                                                ? `${currentUrl}&originalName=${encodeURIComponent(originalName)}`
                                                : `${currentUrl}?originalName=${encodeURIComponent(originalName)}`;
                                            return { ...x, name, url: urlWithOriginalName };
                                        }),
                                    })
                                }
                                t={t}
                            />
                        ) : (
                            <>
                                <div className="rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 p-6 text-center">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t('brand_book_empty_hint')}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">PDF • até 50 MB</p>
                                    <label className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer transition-colors">
                                        <span>{t('add_brand_book')}</span>
                                        <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAssetFile(f, 'brand_book'); e.target.value = ''; }} />
                                    </label>
                                </div>
                                {logoUploadError && <p className="text-sm text-amber-600 dark:text-amber-400 mt-2" role="alert">{logoUploadError}</p>}
                            </>
                        )}
                    </div>
                </CollapsibleBlock>
                </CollapsibleSectionBlock>
            </div>
        </div>
    );
};
