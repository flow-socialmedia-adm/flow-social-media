import React, { RefObject } from 'react';
import type { Client, SocialPlatform, SocialLink, AccessCredential, BrandAsset } from '../../../types';
import { TrashIcon, XIcon, LinkIcon, UploadCloudIcon, CopyIcon, EyeIcon, EyeOffIcon } from '../../icons';
import { resolveColorHex } from '../../../lib/utils';
import PhoneInput from '../../PhoneInput';
import { COUNTRIES } from '../../../lib/phone';
import { toUploadUrl } from '../../../lib/api';
import { resolveClientImageUrl } from '../../../lib/clientVisual';
import { ColorPickerPopover } from '../../ColorPickerPopover';
import TooltipHint from '../../TooltipHint';
import { UnsavedChangesBar } from '../UnsavedChangesBar';
import {
    getLinkPrefix,
    socialIcons,
    SOCIAL_PLATFORM_LABELS,
    socialUrlToDisplayHandle,
    buildSocialUrlFromUsernameInput,
} from '../socialHelpers';

const SOCIAL_PLATFORMS_NO_WEB: SocialPlatform[] = ['instagram', 'facebook', 'linkedin', 'tiktok', 'x', 'youtube', 'pinterest'];

export type IdentitySectionEditorProps = {
    editedClient: Client;
    client: Client;
    handlers: {
        onUpdate: (u: Partial<Client>) => void;
        onCancel: () => void;
        onSave: () => void;
        requestConfirmation: (cb: () => void) => void;
        onCopy: (hex: string) => void;
    };
    isDirty: boolean;
    saveBarMessage: { text: string; type: 'success' | 'error' } | null;
    onFeedbackDismiss: () => void;
    t: (k: string) => string;
    pendingPlatform: SocialPlatform | '';
    setPendingPlatform: (p: SocialPlatform | '') => void;
    pendingSocialUrl: string;
    setPendingSocialUrl: (s: string) => void;
    pendingPassword: string;
    setPendingPassword: (s: string) => void;
    socialPlatformDropdownIndex: number | null;
    setSocialPlatformDropdownIndex: (n: number | null) => void;
    socialPlatformDropdownRef: RefObject<HTMLDivElement | null>;
    passwordVisibility: Record<string, boolean>;
    setPasswordVisibility: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    onOpenUpload: (target: 'avatar') => void;
    colorTriggerRef: RefObject<HTMLDivElement | null>;
    isColorPickerOpen: boolean;
    setIsColorPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
    copiedHex: string | null;
};

export const IdentitySectionEditor: React.FC<IdentitySectionEditorProps> = (props) => {
    const {
        editedClient,
        client,
        handlers: { onUpdate, onCancel, onSave, requestConfirmation, onCopy },
        isDirty,
        saveBarMessage,
        onFeedbackDismiss,
        t,
        pendingPlatform,
        setPendingPlatform,
        pendingSocialUrl,
        setPendingSocialUrl,
        pendingPassword,
        setPendingPassword,
        socialPlatformDropdownIndex,
        setSocialPlatformDropdownIndex,
        socialPlatformDropdownRef,
        passwordVisibility,
        setPasswordVisibility,
        onOpenUpload,
        colorTriggerRef,
        isColorPickerOpen,
        setIsColorPickerOpen,
        copiedHex,
    } = props;

    const primaryContact = editedClient.contacts?.find((c) => c.isPrimary) || editedClient.contacts?.[0];
    const buildRedesList = (): { platform: SocialPlatform | ''; url: string; password?: string; credId?: string }[] => {
        const creds = editedClient.accessCredentials || [];
        const links = editedClient.socialLinks || [];
        const merged = new Map<SocialPlatform, { url: string; password?: string; credId?: string }>();
        links.forEach((l) => {
            if (!merged.has(l.platform)) {
                const cred = creds.find((c) => c.platform === l.platform);
                merged.set(l.platform, { url: l.url, password: cred?.password, credId: cred?.id });
            }
        });
        creds.forEach((c) => {
            if (!merged.has(c.platform))
                merged.set(c.platform, {
                    url: c.username ? (c.username.startsWith('http') ? c.username : `@${c.username.replace(/^@/, '')}`) : '',
                    password: c.password,
                    credId: c.id,
                });
        });
        return [...merged.entries()].map(([platform, v]) => ({ platform, url: v.url || '', password: v.password, credId: v.credId }));
    };
    const credsList = editedClient.accessCredentials || [];
    const redesList = buildRedesList();

    const updatePendingRede = (upd: Partial<{ platform: SocialPlatform | ''; url: string; password?: string }>) => {
        if (upd.platform !== undefined) {
            if (upd.platform !== pendingPlatform) {
                setPendingSocialUrl('');
                setPendingPassword('');
            }
            setPendingPlatform(upd.platform);
        }
        if (upd.url !== undefined) setPendingSocialUrl(upd.url);
        if (upd.password !== undefined) setPendingPassword(upd.password);
    };

    const updateRede = (index: number, upd: Partial<{ platform: SocialPlatform | ''; url: string; password?: string }>) => {
        const next = redesList.map((r, i) => (i === index ? { ...r, ...upd } : r));
        const valid = next.filter((r) => r.platform);
        if (valid.length === 0) {
            onUpdate({ socialLinks: [], accessCredentials: [] });
            return;
        }
        const newLinks: SocialLink[] = valid.map((r) => ({ platform: r.platform as SocialPlatform, url: r.url ?? '' }));
        const newCreds: AccessCredential[] = valid.map((r, i) => {
            const existing = credsList.find((c) => c.platform === r.platform);
            const credId = existing?.id || r.credId || `cred-${Date.now()}-${i}`;
            const username = socialUrlToDisplayHandle(r.platform as SocialPlatform, r.url);
            return {
                id: credId,
                platform: r.platform as SocialPlatform,
                username,
                password: r.password,
                displayName: existing?.displayName,
            };
        });
        onUpdate({ socialLinks: newLinks, accessCredentials: newCreds });
    };

    const swapDial = (oldVal: string, newCode: string) => {
        const oc = COUNTRIES.find((cc) => (oldVal || '').startsWith(cc.dial)) || COUNTRIES[0];
        const nc = COUNTRIES.find((cc) => cc.code === newCode) || COUNTRIES[0];
        const d = (oldVal || '').replace(/\D/g, '');
        const od = oc.dial.replace(/\D/g, '');
        const rem = d.startsWith(od) ? d.slice(od.length) : d;
        return `${nc.dial}${rem}`;
    };
    const list = editedClient.contacts || [];
    const j = primaryContact ? list.findIndex((x) => x.id === primaryContact.id) : 0;
    const idx = j >= 0 ? j : 0;
    const k = idx >= 0 ? idx : 0;
    const updateWa = (val: string) => {
        const c = list.length ? [...list] : [{ id: `c-${Date.now()}`, name: editedClient.name || '', role: '', email: '', isPrimary: true }];
        const tgt = primaryContact ? c.findIndex((x) => x.id === primaryContact.id) : 0;
        const target = tgt >= 0 ? tgt : 0;
        if (!c[target]) c[target] = { id: `c-${Date.now()}`, name: editedClient.name || '', role: '', email: '', isPrimary: true };
        c[target] = { ...c[target], whatsapp: val };
        onUpdate({ contacts: c });
    };
    const updatePh = (val: string) => {
        const c = list.length ? [...list] : [{ id: `c-${Date.now()}`, name: editedClient.name || '', role: '', email: '', isPrimary: true }];
        const tgt = primaryContact ? c.findIndex((x) => x.id === primaryContact.id) : 0;
        const target = tgt >= 0 ? tgt : 0;
        if (!c[target]) c[target] = { id: `c-${Date.now()}`, name: editedClient.name || '', role: '', email: '', isPrimary: true };
        c[target] = { ...c[target], landlinePhone: val };
        onUpdate({ contacts: c });
    };

    const EDITING_ROW_INDEX = -1;
    const EditingIcon = pendingPlatform ? socialIcons[pendingPlatform] : LinkIcon;

    const fieldBase = 'rounded hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors focus:outline-none focus:ring-0 focus:border-gray-400 dark:focus:border-gray-400';
    const renderLinkInput = (platform: SocialPlatform | '', urlVal: string, onUrlChange: (v: string) => void) => {
        if (platform) {
            const prefix = getLinkPrefix(platform);
                const usernamePart = socialUrlToDisplayHandle(platform, urlVal);
            return (
                <div className={`flex flex-1 min-w-[100px] items-center gap-2 border-b border-gray-300 dark:border-gray-600 py-1 ${fieldBase}`}>
                    <span className="px-1 text-sm text-gray-500 dark:text-gray-400 shrink-0">{prefix}</span>
                    <input
                        type="text"
                        value={usernamePart}
                        onChange={(e) => onUrlChange(buildSocialUrlFromUsernameInput(platform, e.target.value))}
                        placeholder="usuario"
                        className="flex-1 min-w-0 text-sm bg-transparent px-0 py-0 border-0 focus:outline-none focus:ring-0"
                    />
                </div>
            );
        }
        return (
            <input
                type="text"
                value={urlVal}
                onChange={(e) => onUrlChange(e.target.value)}
                placeholder={t('user_or_link')}
                className={`flex-1 min-w-[100px] text-sm bg-transparent border-b border-gray-300 dark:border-gray-600 px-0 py-1 ${fieldBase}`}
            />
        );
    };

    const img = resolveClientImageUrl(editedClient);
    const hasImg = !!img;

    return (
        <div className="space-y-6">
            {(isDirty || saveBarMessage) && (
                <div className="flex justify-end">
                    <UnsavedChangesBar onCancel={onCancel} onSave={onSave} requestConfirmation={requestConfirmation} feedback={saveBarMessage} onFeedbackDismiss={onFeedbackDismiss} />
                </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,360px)_1fr] gap-4 lg:gap-6">
                <div className="flex flex-col items-center gap-6 max-w-[360px] w-full">
                        <div className="flex flex-col items-center gap-3">
                        <div className="relative shrink-0 group/logo">
                            <div className="w-[170px] h-[170px] rounded-full overflow-hidden ring-2 ring-gray-200 dark:ring-gray-600 bg-gray-50 dark:bg-gray-800/90 flex items-center justify-center transition-shadow group-hover/logo:shadow-lg">
                                {img ? (
                                    <img src={toUploadUrl(img)} alt="" className="w-full h-full object-cover rounded-full" />
                                ) : (
                                    <>
                                        <UploadCloudIcon className="w-12 h-12 text-gray-400 dark:text-gray-500" aria-hidden />
                                        <TooltipHint label={t('add_logo_or_photo')}>
                                            <button
                                                type="button"
                                                onClick={() => onOpenUpload('avatar')}
                                                className="absolute inset-0 rounded-full bg-transparent hover:bg-gray-900/5 dark:hover:bg-white/5 transition-colors"
                                                aria-label={t('add_logo_or_photo')}
                                            />
                                        </TooltipHint>
                                    </>
                                )}
                                {hasImg && (
                                    <TooltipHint label={t('add_logo_or_photo')}>
                                        <button
                                            type="button"
                                            onClick={() => onOpenUpload('avatar')}
                                            className="absolute inset-0 rounded-full bg-black/0 hover:bg-black/40 transition-colors"
                                            aria-label={t('add_logo_or_photo')}
                                        />
                                    </TooltipHint>
                                )}
                            </div>
                            {hasImg && (
                                <TooltipHint label={t('remove_item')}>
                                    <button
                                        type="button"
                                        onClick={() => onUpdate({ avatarUrl: undefined, brandAssets: (editedClient.brandAssets || []).filter((a: BrandAsset) => a.type !== 'logo') })}
                                        className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 z-10 -translate-x-1/4 -translate-y-1/4"
                                        aria-label={t('remove_item')}
                                    >
                                        <XIcon className="w-3 h-3" />
                                    </button>
                                </TooltipHint>
                            )}
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-base font-medium text-gray-700 dark:text-gray-300">{t('add_logo_or_photo')}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">JPG ou PNG • até 5MB</p>
                            <p className="text-sm text-gray-400 dark:text-gray-500">PNGs transparentes recebem fundo branco automaticamente.</p>
                            <div className="flex items-center justify-center gap-3 flex-wrap">
                                <button type="button" onClick={() => onOpenUpload('avatar')} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">{t('upload_from_computer')}</button>
                                {hasImg && (
                                    <TooltipHint label={t('remove_item')}>
                                        <button
                                            type="button"
                                            onClick={() => onUpdate({ avatarUrl: undefined, brandAssets: (editedClient.brandAssets || []).filter((a: BrandAsset) => a.type !== 'logo') })}
                                            className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
                                            aria-label={t('remove_item')}
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </TooltipHint>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="w-full border-t border-gray-200 dark:border-gray-600 pt-6">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">{t('brand_color')}</p>
                        <div ref={colorTriggerRef as RefObject<HTMLDivElement>} className="relative flex items-center justify-center gap-3">
                            <TooltipHint label={t('brand_color')}>
                                <button
                                    type="button"
                                    onClick={() => setIsColorPickerOpen((v) => !v)}
                                    className="w-10 h-10 rounded-full border-2 border-gray-300 dark:border-gray-600 shrink-0 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    style={{ backgroundColor: resolveColorHex(editedClient.color) }}
                                    aria-label={t('brand_color')}
                                >
                                    <span className="sr-only">{t('brand_color')}</span>
                                </button>
                            </TooltipHint>
                            <input type="text" value={resolveColorHex(editedClient.color)} onChange={(e) => { const v = e.target.value.replace(/^#/, ''); if (/^[0-9a-fA-F]{0,6}$/i.test(v)) onUpdate({ color: v.length === 6 ? '#' + v.toLowerCase() : (v ? '#' + v : '#475569') }); }} className="w-24 text-sm bg-transparent px-0 py-1 rounded border-0 border-b border-gray-300 dark:border-gray-600 font-mono hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors focus:outline-none focus:ring-0 focus:border-gray-400 dark:focus:border-gray-400" placeholder="#xxxxxx" />
                            <TooltipHint label={t('copy')}>
                                <button
                                    type="button"
                                    onClick={() => onCopy(resolveColorHex(editedClient.color))}
                                    className="p-1.5 text-gray-400 hover:text-indigo-600 rounded transition-colors"
                                    aria-label={t('copy')}
                                >
                                    <CopyIcon className="w-4 h-4" />
                                </button>
                            </TooltipHint>
                            {isColorPickerOpen && (
                                <ColorPickerPopover color={resolveColorHex(editedClient.color)} onChange={(c) => onUpdate({ color: c })} onClose={() => setIsColorPickerOpen(false)} anchorRef={colorTriggerRef} t={t} />
                            )}
                        </div>
                    </div>
                </div>
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{t('client')} *</label>
                        <input type="text" value={editedClient.name || ''} onChange={(e) => onUpdate({ name: e.target.value || undefined })} placeholder={t('client')} className={`w-full bg-transparent p-1.5 rounded border-0 border-b border-gray-300 dark:border-gray-600 text-sm ${fieldBase}`} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">WhatsApp *</label>
                        <PhoneInput value={list[idx]?.whatsapp || ''} countryCode={COUNTRIES.find((cc) => (list[idx]?.whatsapp || '').startsWith(cc.dial))?.code || 'BR'} onCountryChange={(code) => updateWa(swapDial(list[idx]?.whatsapp || '', code))} onChange={updateWa} placeholder="(11) 99999-9999" appearance="clean" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{t('contact_phone')}</label>
                        <PhoneInput value={list[k]?.landlinePhone || ''} countryCode={COUNTRIES.find((cc) => (list[k]?.landlinePhone || '').startsWith(cc.dial))?.code || 'BR'} onCountryChange={(code) => updatePh(swapDial(list[k]?.landlinePhone || '', code))} onChange={updatePh} placeholder="(11) 99999-9999" appearance="clean" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('social_media_and_links')}</label>
                        <div className="space-y-1.5">
                            <div ref={socialPlatformDropdownIndex === EDITING_ROW_INDEX ? socialPlatformDropdownRef : undefined} className="relative flex flex-wrap gap-2 items-center py-1">
                                <div className="relative shrink-0">
                                    <TooltipHint label={pendingPlatform ? (SOCIAL_PLATFORM_LABELS[pendingPlatform] || pendingPlatform) : t('select_platform')}>
                                        <button
                                            type="button"
                                            onClick={() => setSocialPlatformDropdownIndex(socialPlatformDropdownIndex === EDITING_ROW_INDEX ? null : EDITING_ROW_INDEX)}
                                            className="w-9 h-9 flex items-center justify-center rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                            aria-label={pendingPlatform ? (SOCIAL_PLATFORM_LABELS[pendingPlatform] || pendingPlatform) : t('select_platform')}
                                        >
                                            <EditingIcon className="w-4 h-4" />
                                        </button>
                                    </TooltipHint>
                                    {socialPlatformDropdownIndex === EDITING_ROW_INDEX && (
                                        <div className="absolute top-full left-0 mt-1 z-50 min-w-[160px] py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg">
                                            <button type="button" onClick={() => { updatePendingRede({ platform: '' }); setSocialPlatformDropdownIndex(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"><LinkIcon className="w-4 h-4 text-gray-500 shrink-0" /><span>—</span></button>
                                            {SOCIAL_PLATFORMS_NO_WEB.filter((p) => !redesList.some((x) => x.platform === p)).map((p) => {
                                                const PIcon = socialIcons[p];
                                                return (
                                                    <button key={p} type="button" onClick={() => { updatePendingRede({ platform: p }); setSocialPlatformDropdownIndex(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                                                        <PIcon className="w-4 h-4 shrink-0 text-gray-600 dark:text-gray-300" /><span>{SOCIAL_PLATFORM_LABELS[p] || p}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                {renderLinkInput(pendingPlatform, pendingSocialUrl, setPendingSocialUrl)}
                                <div className="flex items-center shrink-0">
                                    <input type={!pendingPassword ? 'text' : (passwordVisibility['rede-editing'] ? 'text' : 'password')} value={pendingPassword} onChange={(e) => setPendingPassword(e.target.value)} placeholder={t('password')} className={`w-[90px] text-sm bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 px-0 py-1 rounded ${fieldBase}`} />
                                    <TooltipHint label={passwordVisibility['rede-editing'] ? t('hide_password') : t('show_password')}>
                                        <button
                                            type="button"
                                            onClick={() => setPasswordVisibility((p) => ({ ...p, 'rede-editing': !p['rede-editing'] }))}
                                            className="w-9 h-9 flex items-center justify-center rounded text-gray-500 hover:text-indigo-600"
                                            aria-label={passwordVisibility['rede-editing'] ? t('hide_password') : t('show_password')}
                                        >
                                            {passwordVisibility['rede-editing'] ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                                        </button>
                                    </TooltipHint>
                                </div>
                                <div className="w-9 h-9 shrink-0" aria-hidden />
                            </div>
                            {redesList.map((r, i) => {
                                const Icon = r.platform ? socialIcons[r.platform] : LinkIcon;
                                const showPw = passwordVisibility[`rede-${i}`];
                                const isDropdownOpen = socialPlatformDropdownIndex === i;
                                const plat = r.platform;
                                const isRowSaved = plat && (client.accessCredentials?.some((c) => c.platform === plat) || client.socialLinks?.some((l) => l.platform === plat));
                                return (
                                    <div key={i} ref={isDropdownOpen ? socialPlatformDropdownRef : undefined} className="relative flex flex-wrap gap-2 items-center py-1">
                                        <div className="relative shrink-0">
                                            <TooltipHint label={r.platform ? (SOCIAL_PLATFORM_LABELS[r.platform] || r.platform) : t('select_platform')}>
                                                <button
                                                    type="button"
                                                    onClick={() => setSocialPlatformDropdownIndex(isDropdownOpen ? null : i)}
                                                    className="w-9 h-9 flex items-center justify-center rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    aria-label={r.platform ? (SOCIAL_PLATFORM_LABELS[r.platform] || r.platform) : t('select_platform')}
                                                >
                                                    <Icon className="w-4 h-4" />
                                                </button>
                                            </TooltipHint>
                                            {isDropdownOpen && (
                                                <div className="absolute top-full left-0 mt-1 z-50 min-w-[160px] py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg">
                                                    <button type="button" onClick={() => { updateRede(i, { platform: '' }); setSocialPlatformDropdownIndex(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"><LinkIcon className="w-4 h-4 text-gray-500 shrink-0" /><span>—</span></button>
                                                    {(r.platform ? SOCIAL_PLATFORMS_NO_WEB : SOCIAL_PLATFORMS_NO_WEB.filter((p) => !redesList.some((x, j) => j !== i && x.platform === p))).map((p) => {
                                                        const PIcon = socialIcons[p];
                                                        return (
                                                            <button key={p} type="button" onClick={() => { updateRede(i, { platform: p, url: r.url, password: r.password }); setSocialPlatformDropdownIndex(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                                                                <PIcon className="w-4 h-4 shrink-0 text-gray-600 dark:text-gray-300" /><span>{SOCIAL_PLATFORM_LABELS[p] || p}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                        {renderLinkInput(r.platform, r.url, (v) => updateRede(i, { url: v }))}
                                        <div className="flex items-center shrink-0">
                                            <input type={!r.password ? 'text' : (showPw ? 'text' : 'password')} value={r.password || ''} onChange={(e) => updateRede(i, { password: e.target.value || undefined })} placeholder={t('password')} className={`w-[90px] text-sm bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 px-0 py-1 rounded ${fieldBase}`} />
                                            <TooltipHint label={showPw ? t('hide_password') : t('show_password')}>
                                                <button
                                                    type="button"
                                                    onClick={() => setPasswordVisibility((p) => ({ ...p, [`rede-${i}`]: !p[`rede-${i}`] }))}
                                                    className="w-9 h-9 flex items-center justify-center rounded text-gray-500 hover:text-indigo-600"
                                                    aria-label={showPw ? t('hide_password') : t('show_password')}
                                                >
                                                    {showPw ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                                                </button>
                                            </TooltipHint>
                                        </div>
                                        {isRowSaved ? (
                                            <TooltipHint label={t('remove_item')}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newLinks = (editedClient.socialLinks || []).filter((l) => l.platform !== plat);
                                                        const newCreds = (editedClient.accessCredentials || []).filter((c) => c.platform !== plat);
                                                        onUpdate({ socialLinks: newLinks, accessCredentials: newCreds });
                                                    }}
                                                    className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-red-500 shrink-0"
                                                    aria-label={t('remove_item')}
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </TooltipHint>
                                        ) : (
                                            <div className="w-9 h-9 shrink-0" aria-hidden />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{t('site_optional')}</label>
                        <input type="url" value={editedClient.website || ''} onChange={(e) => onUpdate({ website: e.target.value || undefined })} placeholder="https://..." className={`w-full bg-transparent p-1.5 rounded border-0 border-b border-gray-300 dark:border-gray-600 text-sm ${fieldBase}`} />
                    </div>
                </div>
            </div>
        </div>
    );
};
