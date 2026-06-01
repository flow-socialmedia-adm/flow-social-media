import React, { useEffect, useRef, useState, type RefCallback } from 'react';
import type { SocialLink, SocialPlatform } from '../types';
import { TrashIcon, PlusIcon, EyeIcon, EyeOffIcon } from './icons';
import {
    socialIcons,
    ALL_SOCIAL_PLATFORMS,
    SOCIAL_PLATFORM_LABELS,
    getLinkPrefix,
    socialUrlToDisplayHandle,
    buildSocialUrlFromUsernameInput,
    normalizeWebsiteUrl,
} from './clients/socialHelpers';
import TooltipHint from './TooltipHint';

const ICON_STYLE = 'h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500';

const rowToLink = (r: { platform: SocialPlatform; url: string }): SocialLink => ({
    platform: r.platform,
    url:
        r.platform === 'website' || r.platform === 'email'
            ? normalizeWebsiteUrl(r.url || '')
            : r.url || '',
});

export const AgencySocialLinksEditor: React.FC<{
    links: SocialLink[];
    onChange: (next: SocialLink[]) => void;
    disabled: boolean;
    t: (k: string) => string;
    /** Tooltip quando edição bloqueada (ex.: só leitura). */
    disabledTitle?: string;
}> = ({ links, onChange, disabled, t, disabledTitle }) => {
    /** Linha reta só na base; visível apenas com foco no link (focus-within). Sem cantos arredondados. */
    const linkFieldShell =
        'flex min-w-0 flex-1 items-center gap-2 border-b border-transparent py-1 transition-colors focus-within:border-gray-400 dark:focus-within:border-gray-500';
    const linkInputClass =
        'min-w-0 flex-1 border-0 bg-transparent px-0 py-0 text-sm focus:outline-none focus:ring-0 disabled:opacity-60';
    const passwordInputClass =
        'w-[100px] min-w-0 shrink-0 border-0 border-b border-transparent bg-transparent px-0 py-1 text-sm transition-colors focus:border-gray-400 focus:outline-none focus:ring-0 dark:focus:border-gray-500 disabled:opacity-60';
    const [passwordByIndex, setPasswordByIndex] = useState<Record<number, string>>({});
    const [passwordVisibility, setPasswordVisibility] = useState<Record<number, boolean>>({});
    const [dropdownIndex, setDropdownIndex] = useState<number | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const linkFieldRefs = useRef<(HTMLInputElement | null)[]>([]);

    const focusLinkField = (rowIndex: number) => {
        window.setTimeout(() => {
            linkFieldRefs.current[rowIndex]?.focus();
        }, 0);
    };

    const list = links || [];
    const noPersistedLinks = list.length === 0;

    const rows: { platform: SocialPlatform; url: string }[] = noPersistedLinks
        ? [{ platform: 'website', url: '' }]
        : list.map((l) => ({
              platform: l.platform,
              url:
                  l.platform === 'website' || l.platform === 'email'
                      ? normalizeWebsiteUrl(l.url || '')
                      : l.url || '',
          }));

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownIndex(null);
            }
        };
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, []);

    const updateRow = (index: number, patch: Partial<{ platform: SocialPlatform; url: string }>) => {
        const next = rows.map((r, j) => (j === index ? { ...r, ...patch } : r));
        onChange(next.map(rowToLink));
    };

    const removeRow = (index: number) => {
        if (noPersistedLinks) return;
        onChange(list.filter((_, j) => j !== index));
        setPasswordByIndex((prev) => {
            const o = { ...prev };
            delete o[index];
            return o;
        });
    };

    const addRow = () => {
        const base = noPersistedLinks ? rows.map(rowToLink) : list.map(rowToLink);
        onChange([...base, { platform: 'website', url: '' }]);
    };

    const renderLinkInput = (
        platform: SocialPlatform,
        urlVal: string,
        onUrlChange: (v: string) => void,
        linkInputRef: RefCallback<HTMLInputElement>,
    ) => {
        if (platform === 'website') {
            return (
                <div className={linkFieldShell}>
                    <input
                        ref={linkInputRef}
                        type="text"
                        value={urlVal}
                        onChange={(e) => onUrlChange(e.target.value)}
                        placeholder="www.exemplo.com"
                        disabled={disabled}
                        className={linkInputClass}
                    />
                </div>
            );
        }
        if (platform === 'email') {
            return (
                <div className={linkFieldShell}>
                    <input
                        ref={linkInputRef}
                        type="email"
                        value={urlVal}
                        onChange={(e) => onUrlChange(e.target.value)}
                        placeholder="email@exemplo.com"
                        disabled={disabled}
                        className={linkInputClass}
                    />
                </div>
            );
        }
        const prefix = getLinkPrefix(platform);
        const usernamePart = socialUrlToDisplayHandle(platform, urlVal);
        return (
            <div className={linkFieldShell}>
                <span className="shrink-0 text-sm text-gray-500 dark:text-gray-400">{prefix}</span>
                <input
                    ref={linkInputRef}
                    type="text"
                    value={usernamePart}
                    onChange={(e) => onUrlChange(buildSocialUrlFromUsernameInput(platform, e.target.value))}
                    placeholder="usuario"
                    disabled={disabled}
                    className={linkInputClass}
                />
            </div>
        );
    };

    if (disabled && list.length === 0) {
        const empty = <p className="text-sm text-gray-500 dark:text-gray-400">—</p>;
        return disabledTitle ? <TooltipHint label={disabledTitle}>{empty}</TooltipHint> : empty;
    }

    if (disabled) {
        return (
            <ul className="space-y-2 text-sm">
                {list.map((l, i) => (
                    <li key={`${l.platform}-${i}`}>
                        <a
                            href={l.url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                                {SOCIAL_PLATFORM_LABELS[l.platform] ?? l.platform}:
                            </span>{' '}
                            {l.url}
                        </a>
                    </li>
                ))}
            </ul>
        );
    }

    return (
        <div className="flex flex-col space-y-3">
            {rows.map((r, i) => {
                const Icon = socialIcons[r.platform];
                const showPw = passwordVisibility[i];
                const isOpen = dropdownIndex === i;
                const label = SOCIAL_PLATFORM_LABELS[r.platform] ?? t('website');
                const hideTrash = noPersistedLinks && i === 0;
                const setLinkInputRef: RefCallback<HTMLInputElement> = (el) => {
                    linkFieldRefs.current[i] = el;
                };

                return (
                    <div
                        key={`row-${i}-${r.platform}`}
                        ref={(el) => {
                            if (el && isOpen) dropdownRef.current = el;
                        }}
                        className="grid grid-cols-1 gap-y-2 py-1 sm:grid-cols-2 sm:items-center sm:gap-x-6"
                    >
                        <div className="flex min-w-0 items-center gap-2">
                            <div className="relative shrink-0">
                                <TooltipHint label={label}>
                                    <button
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => setDropdownIndex(isOpen ? null : i)}
                                        className="flex h-9 w-9 items-center justify-center rounded text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                                        aria-label={label}
                                    >
                                        <Icon className={ICON_STYLE} />
                                    </button>
                                </TooltipHint>
                                {isOpen && (
                                    <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800">
                                        {ALL_SOCIAL_PLATFORMS.map((p) => {
                                            const PIcon = socialIcons[p];
                                            return (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    onClick={() => {
                                                        const userPart = socialUrlToDisplayHandle(r.platform, r.url);
                                                        const nextUrl =
                                                            p === 'website' || p === 'email'
                                                                ? userPart || ''
                                                                : buildSocialUrlFromUsernameInput(p, userPart);
                                                        updateRow(i, { platform: p, url: nextUrl });
                                                        setDropdownIndex(null);
                                                        focusLinkField(i);
                                                    }}
                                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                                                >
                                                    <PIcon className="h-4 w-4 shrink-0 text-gray-600 dark:text-gray-300" />
                                                    <span>{SOCIAL_PLATFORM_LABELS[p] ?? t('website')}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            {renderLinkInput(r.platform, r.url, (v) => updateRow(i, { url: v }), setLinkInputRef)}
                        </div>
                        <div className="flex min-w-0 items-center gap-0.5 sm:justify-start">
                            <input
                                type={!passwordByIndex[i] ? 'text' : showPw ? 'text' : 'password'}
                                value={passwordByIndex[i] || ''}
                                onChange={(e) =>
                                    setPasswordByIndex((prev) => ({
                                        ...prev,
                                        [i]: e.target.value,
                                    }))
                                }
                                placeholder={t('password')}
                                disabled={disabled}
                                className={passwordInputClass}
                            />
                            <TooltipHint label={showPw ? t('hide_password') : t('show_password')}>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setPasswordVisibility((p) => ({
                                            ...p,
                                            [i]: !p[i],
                                        }))
                                    }
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded text-gray-500 hover:text-indigo-600"
                                    aria-label={showPw ? t('hide_password') : t('show_password')}
                                >
                                    {showPw ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                                </button>
                            </TooltipHint>
                            {hideTrash ? (
                                <div className="h-9 w-9 shrink-0" aria-hidden />
                            ) : (
                                <TooltipHint label={t('remove_item')}>
                                    <button
                                        type="button"
                                        onClick={() => removeRow(i)}
                                        className="flex h-9 w-9 shrink-0 items-center justify-center text-gray-400 hover:text-red-500"
                                        aria-label={t('remove_item')}
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </TooltipHint>
                            )}
                        </div>
                    </div>
                );
            })}
            <button
                type="button"
                onClick={addRow}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 p-2.5 text-sm text-gray-500 transition-colors hover:border-indigo-500 hover:text-indigo-600 dark:border-gray-600 dark:hover:text-indigo-400"
            >
                <PlusIcon className="h-4 w-4 shrink-0" />
                {t('add_link_cta')}
            </button>
        </div>
    );
};
