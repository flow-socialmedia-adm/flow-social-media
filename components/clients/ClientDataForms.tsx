import React, { useState, useRef, useEffect } from 'react';
import type { Client, Address, ClientContact, SocialPlatform, SocialLink, AccessCredential } from '../../types';
import type { AppContextType } from '../../types';
import { BriefcaseIcon, TrashIcon, UserCircleIcon, AtSignIcon, PhoneIcon, FileTextIcon, WhatsAppIcon, StarIcon, MapPinIcon, BuildingIcon, PlusIcon, HomeIcon, GlobeIcon, CalendarIcon, LinkIcon, EyeIcon, EyeOffIcon, ChevronDownIcon, ChevronRightIcon } from '../icons';
import { formatPhoneNumber } from '../../lib/utils';
import { COUNTRIES, getFlagByPhone } from '../../lib/phone';
import PhoneInput from '../PhoneInput';
import { GhostInput } from '../GhostInput';
import { CepGhostInput } from '../CepGhostInput';
import type { CepMergePatch } from '../../lib/useCepLookup';
import TooltipHint from '../TooltipHint';
import { EditableCard } from './EditableCard';
import { UnsavedChangesBar } from './UnsavedChangesBar';
import {
    socialIcons,
    ALL_SOCIAL_PLATFORMS,
    SOCIAL_PLATFORM_LABELS,
    getLinkPrefix,
    socialUrlToDisplayHandle,
    buildSocialUrlFromUsernameInput,
    normalizeWebsiteUrl,
} from './socialHelpers';

const BLOCK_STYLE = 'bg-white/95 dark:bg-gray-800/95 rounded-xl p-5';

const CLIENT_DATA_ACCENTS = {
    professional: 'border-l-indigo-500',
    address: 'border-l-emerald-500',
    social: 'border-l-amber-500',
    company: 'border-l-slate-500',
} as const;

const CollapsibleSectionBlock: React.FC<{
    heading: string;
    description: string;
    accent: keyof typeof CLIENT_DATA_ACCENTS;
    expanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}> = ({ heading, description, accent, expanded, onToggle, children }) => (
    <section className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden border-l-4 ${CLIENT_DATA_ACCENTS[accent]}`}>
        <button type="button" onClick={onToggle} className="w-full flex items-center gap-3 px-5 py-4 text-left border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            {expanded ? <ChevronDownIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" /> : <ChevronRightIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />}
            <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{heading}</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
            </div>
        </button>
        {expanded && <div className="p-5 space-y-4">{children}</div>}
    </section>
);
const ICON_STYLE = 'w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0';

export const ClientDataForms: React.FC<{
    client: Client;
    onUpdate: (update: Partial<Client>) => void;
    context: AppContextType;
    isDirty: boolean;
    onSave: () => void;
    onCancel: () => void;
    onDelete: () => void;
    requestConfirmation: (onConfirm: () => void) => void;
    onRequestEdit?: () => boolean;
    onEditEnd?: () => void;
    editDisabled?: boolean;
    forceCloseEditToken?: number;
    layout?: 'card' | 'minimal';
    saveBarMessage?: { text: string; type: 'success' | 'error' } | null;
    onFeedbackDismiss?: () => void;
    expandedSections?: Record<string, boolean>;
    onExpandedSectionsChange?: (next: Record<string, boolean>) => void;
    /** Se false, não renderiza a barra de salvar embutida (ex.: barra fixa global no ClientDetail). Default true. */
    embeddedSaveBar?: boolean;
}> = ({ client, onUpdate, context, isDirty, onSave, onCancel, onDelete, requestConfirmation, layout = 'card', saveBarMessage, onFeedbackDismiss, expandedSections = { professional: false, address: false, social: false, company: false }, onExpandedSectionsChange = () => {}, embeddedSaveBar = true }) => {
    const { t, showConfirmation } = context;
    const [showOtherContacts, setShowOtherContacts] = useState((client.contacts?.length ?? 0) > 1);
    const [socialPlatformDropdownIndex, setSocialPlatformDropdownIndex] = useState<number | null>(null);
    const [passwordVisibility, setPasswordVisibility] = useState<Record<string, boolean>>({});
    const [shouldScrollToNewLink, setShouldScrollToNewLink] = useState(false);
    const [shouldScrollToCompanySection, setShouldScrollToCompanySection] = useState(false);
    const [shouldScrollToNewContact, setShouldScrollToNewContact] = useState(false);
    const [shouldScrollToContactsSection, setShouldScrollToContactsSection] = useState(false);
    const socialPlatformDropdownRef = useRef<HTMLDivElement>(null);
    const lastSocialRowRef = useRef<HTMLDivElement>(null);
    const companySectionRef = useRef<HTMLDivElement>(null);
    const lastContactRef = useRef<HTMLDivElement>(null);
    const contactsSectionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (socialPlatformDropdownRef.current && !socialPlatformDropdownRef.current.contains(e.target as Node)) {
                setSocialPlatformDropdownIndex(null);
            }
        };
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, []);

    useEffect(() => {
        if (!shouldScrollToNewLink) return;
        const el = lastSocialRowRef.current;
        if (el) {
            requestAnimationFrame(() => {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        }
        setShouldScrollToNewLink(false);
    }, [shouldScrollToNewLink]);

    useEffect(() => {
        if (!shouldScrollToCompanySection) return;
        const el = companySectionRef.current;
        if (el) {
            requestAnimationFrame(() => {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        }
        setShouldScrollToCompanySection(false);
    }, [shouldScrollToCompanySection]);

    useEffect(() => {
        if (!shouldScrollToNewContact) return;
        const el = lastContactRef.current;
        if (el) {
            requestAnimationFrame(() => {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        }
        setShouldScrollToNewContact(false);
    }, [shouldScrollToNewContact]);

    useEffect(() => {
        if (!shouldScrollToContactsSection) return;
        const el = contactsSectionRef.current;
        if (el) {
            requestAnimationFrame(() => {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        }
        setShouldScrollToContactsSection(false);
    }, [shouldScrollToContactsSection]);

    const includeCompanyData = client.clientType === 'company';
    const useAsPrimaryContact = (() => {
        const primary = client.contacts?.find((c) => c.isPrimary) || client.contacts?.[0];
        const profName = includeCompanyData ? (client.legalRepresentativeName || '') : (client.name || '');
        return !!(primary?.isPrimary && (primary.name === profName || !profName?.trim()));
    })();

    const isAddressEmpty = (addr: Address | undefined): boolean => {
        if (!addr) return true;
        const vals = [addr.street, addr.number, addr.complement, addr.neighborhood, addr.city, addr.state, addr.zipCode, addr.country];
        return !vals.some((v) => v?.trim());
    };

    const handleAddressChange = (addressType: 'address' | 'legalRepresentativeAddress', field: keyof Address, value: string) => {
        onUpdate({
            [addressType]: {
                ...(client[addressType] || {}),
                [field]: value
            }
        });
    };

    const mergeCepIntoAddress =
        (addressType: 'address' | 'legalRepresentativeAddress') => (patch: CepMergePatch) => {
            onUpdate({
                [addressType]: {
                    ...(client[addressType] || {}),
                    ...patch,
                },
            });
        };

    const handleDeleteContact = (contactId: string) => {
        showConfirmation({
            title: t('confirm_delete_title'),
            message: t('confirm_generic_delete_message'),
            onConfirm: () => onUpdate({ contacts: client.contacts?.filter((c) => c.id !== contactId) })
        });
    };

    const syncPrimaryContactFromLegalRep = (payload?: Partial<Client>) => {
        const next = payload ? { ...client, ...payload } : client;
        const name = includeCompanyData ? (next.legalRepresentativeName || next.name || '') : (next.name || '');
        const email = next.legalRepresentativeEmail || '';
        const whatsapp = next.legalRepresentativeWhatsapp || '';
        const role = next.legalRepresentativeRole || '';
        const list = client.contacts || [];
        if (list[0]) {
            onUpdate({ ...(payload || {}), contacts: list.map((c, i) => (i === 0 ? { ...c, name, email, whatsapp, role, isPrimary: true } : { ...c, isPrimary: false })) });
        } else {
            onUpdate({ ...(payload || {}), contacts: [{ id: `c-${Date.now()}`, name, role, email, whatsapp, isPrimary: true }] });
        }
    };

    const clearPrimaryContactFields = () => {
        const list = client.contacts || [];
        if (list[0]) {
            const nextContacts = list.map((c, i) => (i === 0 ? { ...c, name: '', email: '', whatsapp: '', role: '', isPrimary: false } : { ...c, isPrimary: i === 1 }));
            onUpdate({ contacts: nextContacts });
        }
    };

    const handleLegalRepFieldChange = (update: Partial<Client>) => {
        if (useAsPrimaryContact) {
            syncPrimaryContactFromLegalRep(update);
        } else {
            onUpdate(update);
        }
    };

    const swapDial = (oldVal: string, newCode: string) => {
        const oc = COUNTRIES.find((cc) => (oldVal || '').startsWith(cc.dial)) || COUNTRIES[0];
        const nc = COUNTRIES.find((cc) => cc.code === newCode) || COUNTRIES[0];
        const d = (oldVal || '').replace(/\D/g, '');
        const od = oc.dial.replace(/\D/g, '');
        const rem = d.startsWith(od) ? d.slice(od.length) : d;
        return `${nc.dial}${rem}`;
    };

    const renderAddressBlock = (address: Address | undefined, addressType: 'address' | 'legalRepresentativeAddress', _expanded: boolean, _setExpanded: (v: boolean) => void, disabled = false) => {
        const rowClass = 'flex items-center gap-2';
        return (
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className={rowClass}>
                    <FileTextIcon className={ICON_STYLE} />
                    <CepGhostInput
                        value={address?.zipCode || ''}
                        onChange={(v) => handleAddressChange(addressType, 'zipCode', v)}
                        address={address || {}}
                        onMergeAddressFields={mergeCepIntoAddress(addressType)}
                        disabled={disabled}
                        placeholder="00000-000"
                        t={t}
                        className="min-w-0 flex-1"
                    />
                </div>
                <div className={rowClass}>
                    <MapPinIcon className={ICON_STYLE} />
                    <GhostInput value={address?.street || ''} onChange={(v) => handleAddressChange(addressType, 'street', v)} placeholder={t('street')} disabled={disabled} className="flex-1 min-w-0" />
                </div>
                <div className={rowClass}>
                    <BuildingIcon className={ICON_STYLE} />
                    <GhostInput value={address?.number || ''} onChange={(v) => handleAddressChange(addressType, 'number', v)} placeholder={t('number')} disabled={disabled} className="flex-1 min-w-0 max-w-[90px]" />
                </div>
                <div className={rowClass}>
                    <PlusIcon className={ICON_STYLE} />
                    <GhostInput value={address?.complement || ''} onChange={(v) => handleAddressChange(addressType, 'complement', v)} placeholder={t('complement')} disabled={disabled} className="flex-1 min-w-0" />
                </div>
                <div className={rowClass}>
                    <BuildingIcon className={ICON_STYLE} />
                    <GhostInput value={address?.neighborhood || ''} onChange={(v) => handleAddressChange(addressType, 'neighborhood', v)} placeholder={t('neighborhood')} disabled={disabled} className="flex-1 min-w-0" />
                </div>
                <div className={rowClass}>
                    <HomeIcon className={ICON_STYLE} />
                    <GhostInput value={address?.city || ''} onChange={(v) => handleAddressChange(addressType, 'city', v)} placeholder={t('city')} disabled={disabled} className="flex-1 min-w-0" />
                </div>
                <div className={rowClass}>
                    <GlobeIcon className={ICON_STYLE} />
                    <GhostInput value={address?.country || ''} onChange={(v) => handleAddressChange(addressType, 'country', v)} placeholder={t('country')} disabled={disabled} className="flex-1 min-w-0" />
                </div>
                <div className={rowClass}>
                    <MapPinIcon className={ICON_STYLE} />
                    <GhostInput value={address?.state || ''} onChange={(v) => handleAddressChange(addressType, 'state', v)} placeholder={t('state')} disabled={disabled} className="flex-1 min-w-0 max-w-[90px]" />
                </div>
            </div>
        );
    };

    const toggleSection = (key: string) => {
        onExpandedSectionsChange({ ...expandedSections, [key]: !expandedSections[key] });
    };

    const formContent = () => (
        <div className="space-y-5 bg-transparent -m-6 p-6 sm:-m-8 sm:p-8">
            {embeddedSaveBar && (isDirty || saveBarMessage) && layout === 'minimal' && (
                <div className="flex justify-end -mt-2">
                    <UnsavedChangesBar onCancel={onCancel} onSave={onSave} requestConfirmation={requestConfirmation} feedback={saveBarMessage ?? undefined} onFeedbackDismiss={onFeedbackDismiss} />
                </div>
            )}

            {/* Bloco 1: Dados do Profissional */}
            <CollapsibleSectionBlock
                heading={includeCompanyData ? t('legal_representative') : t('professional_data')}
                description={t('client_data_block_professional_desc')}
                accent="professional"
                expanded={!!expandedSections.professional}
                onToggle={() => toggleSection('professional')}
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3">
                    <div className="md:col-span-2 flex items-center gap-2">
                        <UserCircleIcon className={ICON_STYLE} />
                        <GhostInput value={includeCompanyData ? (client.legalRepresentativeName || '') : (client.name || '')} onChange={(v) => handleLegalRepFieldChange(includeCompanyData ? { legalRepresentativeName: v } : { name: v })} placeholder={t('client_name')} className="flex-1 min-w-0" />
                    </div>
                    <div className="flex items-center gap-2">
                        <FileTextIcon className={ICON_STYLE} />
                        <GhostInput value={client.cpf || ''} onChange={(v) => onUpdate({ cpf: v })} placeholder={t('cpf')} mask="cpf" className="flex-1 min-w-0 max-w-[140px]" />
                    </div>
                    {/* Documentos e cargo: RG | Data nascimento | Cargo */}
                    <div className="flex items-center gap-2">
                        <FileTextIcon className={ICON_STYLE} />
                        <GhostInput value={client.legalRepresentativeRg || ''} onChange={(v) => onUpdate({ legalRepresentativeRg: v })} placeholder={t('rg')} className="flex-1 min-w-0" />
                    </div>
                    <div className="flex items-center gap-2">
                        <CalendarIcon className={ICON_STYLE} />
                        <GhostInput type="date" value={client.legalRepresentativeBirthDate || ''} onChange={(v) => onUpdate({ legalRepresentativeBirthDate: v })} placeholder={t('birth_date')} className="flex-1 min-w-0" />
                    </div>
                    <div className="flex items-center gap-2">
                        <BriefcaseIcon className={ICON_STYLE} />
                        <GhostInput value={client.legalRepresentativeRole || ''} onChange={(v) => handleLegalRepFieldChange({ legalRepresentativeRole: v })} placeholder={t('contact_role')} className="flex-1 min-w-0" />
                    </div>
                    {/* Contatos: E-mail | WhatsApp */}
                    <div className="flex items-center gap-2 md:col-span-2">
                        <AtSignIcon className={ICON_STYLE} />
                        <GhostInput type="email" value={client.legalRepresentativeEmail || ''} onChange={(v) => handleLegalRepFieldChange({ legalRepresentativeEmail: v })} placeholder={t('email')} className="flex-1 min-w-0" />
                    </div>
                    <div className="flex items-center gap-2">
                        <WhatsAppIcon className={ICON_STYLE} />
                        <PhoneInput value={client.legalRepresentativeWhatsapp || ''} countryCode={(COUNTRIES.find((cc) => (client.legalRepresentativeWhatsapp || '').startsWith(cc.dial))?.code) || 'BR'} onCountryChange={(code) => handleLegalRepFieldChange({ legalRepresentativeWhatsapp: swapDial(client.legalRepresentativeWhatsapp || '', code) })} onChange={(val) => handleLegalRepFieldChange({ legalRepresentativeWhatsapp: val })} placeholder="(11) 99999-9999" appearance="clean" className="flex-1 min-w-0" />
                    </div>
                </div>
            </CollapsibleSectionBlock>

            {/* Bloco 2: Endereço */}
            <CollapsibleSectionBlock heading={t('address')} description={t('client_data_block_address_desc')} accent="address" expanded={!!expandedSections.address} onToggle={() => toggleSection('address')}>
                <div className="space-y-3">
                    {renderAddressBlock(client.legalRepresentativeAddress, 'legalRepresentativeAddress', true, () => {})}
                </div>
            </CollapsibleSectionBlock>

            {/* Bloco: Redes Sociais e Site — mesmo layout da guia Perfil, com espaço para senha */}
            {(() => {
                const credMatchesLink = (link: { platform: SocialPlatform; url: string }, cred: AccessCredential, used: Set<string>): boolean => {
                    if (cred.platform !== link.platform || used.has(cred.id)) return false;
                    if (link.platform === 'website' || link.platform === 'email') {
                        const linkNorm = normalizeWebsiteUrl(link.url);
                        const credNorm = normalizeWebsiteUrl(cred.username || '');
                        return credNorm === linkNorm;
                    }
                    return socialUrlToDisplayHandle(link.platform, link.url) === cred.username;
                };
                const buildRedesList = (): { platform: SocialPlatform; url: string; password?: string; credId?: string }[] => {
                    const creds = client.accessCredentials || [];
                    const links = client.socialLinks || [];
                    const used = new Set<string>();
                    const fromLinks = links.map((l) => {
                        const cred = creds.find((c) => credMatchesLink(l, c, used));
                        if (cred) used.add(cred.id);
                        const url = (l.platform === 'website' || l.platform === 'email') ? normalizeWebsiteUrl(l.url || '') : (l.url || '');
                        return { platform: l.platform, url, password: cred?.password, credId: cred?.id };
                    });
                    const fromCredsOnly = creds
                        .filter((c) => !used.has(c.id))
                        .map((c) => {
                            const rawUrl = (c.platform === 'website' || c.platform === 'email') ? (c.username || '') : (c.username ? (c.username.startsWith('http') ? c.username : (c.username.startsWith('@') ? c.username : `@${c.username}`)) : '');
                            const url = (c.platform === 'website' || c.platform === 'email') ? normalizeWebsiteUrl(rawUrl) : rawUrl;
                            return {
                            platform: c.platform,
                            url,
                            password: c.password,
                            credId: c.id,
                        };
                        });
                    return [...fromLinks, ...fromCredsOnly];
                };
                const redesList = buildRedesList();
                const credsList = client.accessCredentials || [];
                const displayList = redesList.length === 0
                    ? [{ platform: 'website' as SocialPlatform, url: '', password: undefined as string | undefined, credId: undefined as string | undefined }]
                    : redesList;
                const isPlaceholder = (i: number) => redesList.length === 0 && i === 0;
                const linkFieldShell =
                    'flex flex-1 min-w-[140px] items-center gap-2 border-b border-transparent py-1 transition-colors focus-within:border-gray-400 dark:focus-within:border-gray-500';
                const linkInputClass =
                    'flex-1 min-w-0 text-sm bg-transparent px-0 py-0 border-0 focus:outline-none focus:ring-0';
                const passwordInputClass =
                    'w-[100px] text-sm bg-transparent border-0 border-b border-transparent px-0 py-1 transition-colors focus:border-gray-400 focus:outline-none focus:ring-0 dark:focus:border-gray-500';
                const updateRede = (index: number, upd: Partial<{ platform: SocialPlatform; url: string; password?: string }>) => {
                    const list = displayList;
                    const next = list.map((r, i) => (i === index ? { ...r, ...upd } : r));
                    const valid = next.filter((r) => r.platform) as typeof redesList;
                    if (valid.length === 0) {
                        onUpdate({ socialLinks: [], accessCredentials: [] });
                        return;
                    }
                    const newLinks: SocialLink[] = valid.map((r) => {
                        const url = (r.platform === 'website' || r.platform === 'email') ? normalizeWebsiteUrl(r.url ?? '') : (r.url ?? '');
                        return { platform: r.platform, url };
                    });
                    const newCreds: AccessCredential[] = valid.map((r, i) => {
                        const existing = credsList.find((c) => c.id === r.credId) || credsList.find((c) => c.platform === r.platform);
                        const credId = existing?.id || r.credId || `cred-${Date.now()}-${i}`;
                        const urlForCred = (r.platform === 'website' || r.platform === 'email') ? normalizeWebsiteUrl(r.url ?? '') : r.url;
                        const username =
                            r.platform === 'website' || r.platform === 'email'
                                ? urlForCred
                                : socialUrlToDisplayHandle(r.platform, r.url);
                        return { id: credId, platform: r.platform, username, password: r.password, displayName: existing?.displayName };
                    });
                    onUpdate({ socialLinks: newLinks, accessCredentials: newCreds });
                };
                const removeRede = (index: number) => {
                    const nextList = displayList.filter((_, i) => i !== index);
                    const nextLinks: SocialLink[] = nextList.map((r) => {
                        const url = (r.platform === 'website' || r.platform === 'email') ? normalizeWebsiteUrl(r.url ?? '') : (r.url ?? '');
                        return { platform: r.platform, url };
                    });
                    const nextCreds: AccessCredential[] = nextList.map((r, i) => {
                        const existing = credsList.find((c) => c.id === r.credId);
                        const urlForCred = (r.platform === 'website' || r.platform === 'email') ? normalizeWebsiteUrl(r.url ?? '') : r.url;
                        return {
                            id: r.credId || existing?.id || `cred-${Date.now()}-${i}`,
                            platform: r.platform,
                            username:
                                r.platform === 'website' || r.platform === 'email'
                                    ? urlForCred
                                    : socialUrlToDisplayHandle(r.platform, r.url),
                            password: r.password,
                            displayName: existing?.displayName,
                        };
                    });
                    onUpdate({ socialLinks: nextLinks, accessCredentials: nextCreds });
                };
                const renderLinkInput = (platform: SocialPlatform, urlVal: string, onUrlChange: (v: string) => void) => {
                    if (platform === 'website') {
                        return (
                            <div className={linkFieldShell}>
                                <input
                                    type="text"
                                    value={urlVal}
                                    onChange={(e) => onUrlChange(e.target.value)}
                                    placeholder="www.exemplo.com"
                                    className={linkInputClass}
                                />
                            </div>
                        );
                    }
                    if (platform === 'email') {
                        return (
                            <div className={linkFieldShell}>
                                <input
                                    type="email"
                                    value={urlVal}
                                    onChange={(e) => onUrlChange(e.target.value)}
                                    placeholder="email@exemplo.com"
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
                                type="text"
                                value={usernamePart}
                                onChange={(e) => onUrlChange(buildSocialUrlFromUsernameInput(platform, e.target.value))}
                                placeholder="usuario"
                                className={linkInputClass}
                            />
                        </div>
                    );
                };
                return (
                    <CollapsibleSectionBlock heading={t('social_media_and_site')} description={t('client_data_block_social_desc')} accent="social" expanded={!!expandedSections.social} onToggle={() => toggleSection('social')}>
                        <div className="space-y-2">
                            {displayList.map((r, i) => {
                                const Icon = socialIcons[r.platform];
                                const showPw = passwordVisibility[`rede-${i}`];
                                const isDropdownOpen = socialPlatformDropdownIndex === i;
                                const label = SOCIAL_PLATFORM_LABELS[r.platform] ?? t('website');
                                const isLastRow = i === displayList.length - 1;
                                return (
                                    <div
                                        key={r.credId || `row-${i}`}
                                        ref={(el) => {
                                            if (el && isLastRow) lastSocialRowRef.current = el;
                                            if (isDropdownOpen) socialPlatformDropdownRef.current = el;
                                        }}
                                        className="flex flex-wrap items-center gap-2 py-1"
                                    >
                                        <div className="relative shrink-0">
                                            <TooltipHint label={label}>
                                                <button
                                                    type="button"
                                                    onClick={() => setSocialPlatformDropdownIndex(isDropdownOpen ? null : i)}
                                                    className="w-9 h-9 flex items-center justify-center rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    aria-label={label}
                                                >
                                                    <Icon className={ICON_STYLE} />
                                                </button>
                                            </TooltipHint>
                                            {isDropdownOpen && (
                                                <div className="absolute top-full left-0 mt-1 z-50 min-w-[160px] py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg">
                                                    {ALL_SOCIAL_PLATFORMS.map((p) => {
                                                        const PIcon = socialIcons[p];
                                                        return (
                                                            <button key={p} type="button" onClick={() => { updateRede(i, { platform: p, url: r.url, password: r.password }); setSocialPlatformDropdownIndex(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                                                                <PIcon className="w-4 h-4 shrink-0 text-gray-600 dark:text-gray-300" />
                                                                <span>{SOCIAL_PLATFORM_LABELS[p] ?? t('website')}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                        {renderLinkInput(r.platform, r.url, (v) => updateRede(i, { url: v }))}
                                        <div className="flex items-center shrink-0 gap-0.5">
                                            <input
                                                type={!r.password ? 'text' : showPw ? 'text' : 'password'}
                                                value={r.password || ''}
                                                onChange={(e) => updateRede(i, { password: e.target.value || undefined })}
                                                placeholder={t('password')}
                                                className={passwordInputClass}
                                            />
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
                                        {isPlaceholder(i) ? (
                                            <div className="w-9 h-9 shrink-0" aria-hidden />
                                        ) : (
                                            <TooltipHint label={t('remove_item')}>
                                                <button
                                                    type="button"
                                                    onClick={() => removeRede(i)}
                                                    className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-500 shrink-0"
                                                    aria-label={t('remove_item')}
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </TooltipHint>
                                        )}
                                    </div>
                                );
                            })}
                            <button type="button" onClick={() => {
                                const newPlatform = 'website' as SocialPlatform;
                                const baseLinks = redesList.length > 0 ? redesList : [];
                                const baseCreds = credsList;
                                const newLinks: SocialLink[] = baseLinks.map((r) => {
                                    const url = (r.platform === 'website' || r.platform === 'email') ? normalizeWebsiteUrl(r.url ?? '') : (r.url ?? '');
                                    return { platform: r.platform, url };
                                });
                                const newCreds: AccessCredential[] = baseLinks.map((r, i) => {
                                    const existing = baseCreds.find((c) => c.id === r.credId) || baseCreds.find((c) => c.platform === r.platform);
                                    const urlForCred = (r.platform === 'website' || r.platform === 'email') ? normalizeWebsiteUrl(r.url ?? '') : r.url;
                                    return {
                                        id: existing?.id || r.credId || `cred-${Date.now()}-${i}`,
                                        platform: r.platform,
                                        username:
                                            r.platform === 'website' || r.platform === 'email'
                                                ? urlForCred
                                                : socialUrlToDisplayHandle(r.platform, r.url),
                                        password: r.password,
                                        displayName: existing?.displayName,
                                    };
                                });
                                if (isPlaceholder(0)) {
                                    const first = displayList[0];
                                    const p1 = first?.platform ?? 'website';
                                    const firstUrl = (p1 === 'website' || p1 === 'email') ? normalizeWebsiteUrl(first?.url ?? '') : (first?.url ?? '');
                                    onUpdate({
                                        socialLinks: [{ platform: p1, url: firstUrl }, { platform: newPlatform, url: '' }],
                                        accessCredentials: [
                                            {
                                                id: `cred-${Date.now()}-0`,
                                                platform: p1,
                                                username:
                                                    p1 === 'website' || p1 === 'email'
                                                        ? firstUrl
                                                        : socialUrlToDisplayHandle(p1, first?.url ?? ''),
                                                password: first?.password,
                                            },
                                            { id: `cred-${Date.now()}-1`, platform: newPlatform, username: '', password: undefined },
                                        ],
                                    });
                                } else {
                                    newLinks.push({ platform: newPlatform, url: '' });
                                    newCreds.push({ id: `cred-${Date.now()}`, platform: newPlatform, username: '', password: undefined });
                                    onUpdate({ socialLinks: newLinks, accessCredentials: newCreds });
                                }
                                setShouldScrollToNewLink(true);
                            }} className="w-full text-sm p-2.5 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg text-gray-500 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center justify-center gap-2">
                                <PlusIcon className="w-4 h-4" />
                                {t('add_link')}
                            </button>
                        </div>
                    </CollapsibleSectionBlock>
                );
            })()}

            {/* Checkbox: Incluir dados da empresa — destaque leve, sem quadro branco. Não apaga campos ao alternar. */}
            <label className="flex items-center gap-3 cursor-pointer py-2 px-0 rounded-lg hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                <input type="checkbox" checked={includeCompanyData} onChange={(e) => {
                    const checked = e.target.checked;
                    const update: Partial<Client> = { clientType: checked ? 'company' : 'individual' };
                    if (checked && !client.legalRepresentativeName?.trim() && client.name?.trim()) {
                        update.legalRepresentativeName = client.name;
                    } else if (!checked && !client.name?.trim() && client.legalRepresentativeName?.trim()) {
                        update.name = client.legalRepresentativeName;
                    }
                    onUpdate(update);
                    if (checked) setShouldScrollToCompanySection(true);
                }} className="rounded w-5 h-5 shrink-0" />
                <BriefcaseIcon className={ICON_STYLE} />
                <span className="text-base font-semibold text-gray-800 dark:text-gray-200">{t('add_company_data')}</span>
            </label>

            {/* Bloco 4: Dados da Empresa (condicional) — só aparece com Incluir dados da empresa */}
            {includeCompanyData && (
                <CollapsibleSectionBlock heading={t('company_data')} description={t('client_data_block_company_desc')} accent="company" expanded={!!expandedSections.company} onToggle={() => toggleSection('company')}>
                <div ref={companySectionRef} className="space-y-4">
                    <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('company_data')}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3">
                        <div className="md:col-span-2 flex items-center gap-2">
                            <BriefcaseIcon className={ICON_STYLE} />
                            <GhostInput value={client.companyName || ''} onChange={(v) => onUpdate({ companyName: v })} placeholder={t('legal_name')} className="flex-1 min-w-0" />
                        </div>
                        <div className="flex items-center gap-2">
                            <FileTextIcon className={ICON_STYLE} />
                            <GhostInput value={client.cnpj || ''} onChange={(v) => onUpdate({ cnpj: v })} placeholder={t('cnpj')} mask="cnpj" className="flex-1 min-w-0" />
                        </div>
                        <div className="flex items-center gap-2">
                            <FileTextIcon className={ICON_STYLE} />
                            <GhostInput value={client.companyStateRegistration || ''} onChange={(v) => onUpdate({ companyStateRegistration: v })} placeholder={t('state_registration')} className="flex-1 min-w-0" />
                        </div>
                        <div className="flex items-center gap-2 md:col-span-2">
                            <LinkIcon className={ICON_STYLE} />
                            <GhostInput value={client.website || ''} onChange={(v) => onUpdate({ website: v })} placeholder={t('website')} className="flex-1 min-w-0" />
                        </div>
                        <div className="flex items-center gap-2 md:col-span-2">
                            <PhoneIcon className={ICON_STYLE} />
                            <PhoneInput value={client.companyLandlinePhone || ''} countryCode={(COUNTRIES.find((cc) => (client.companyLandlinePhone || '').startsWith(cc.dial))?.code) || 'BR'} onCountryChange={(code) => onUpdate({ companyLandlinePhone: swapDial(client.companyLandlinePhone || '', code) })} onChange={(val) => onUpdate({ companyLandlinePhone: val })} placeholder="(11) 3333-4444" appearance="clean" className="flex-1 min-w-0" />
                            <WhatsAppIcon className={ICON_STYLE} />
                            <PhoneInput value={client.companyPhone || ''} countryCode={(COUNTRIES.find((cc) => (client.companyPhone || '').startsWith(cc.dial))?.code) || 'BR'} onCountryChange={(code) => onUpdate({ companyPhone: swapDial(client.companyPhone || '', code) })} onChange={(val) => onUpdate({ companyPhone: val })} placeholder="(11) 99999-9999" appearance="clean" className="flex-1 min-w-0" />
                        </div>
                    </div>
                    </div>

                    <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('company_address')}</h4>
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 cursor-pointer mb-3">
                            <input
                                type="checkbox"
                                checked={!!client.isLegalAddressSameAsCompany}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    onUpdate({
                                        isLegalAddressSameAsCompany: checked,
                                        address: checked ? (client.legalRepresentativeAddress ?? {}) : {},
                                    });
                                }}
                                className="rounded"
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400">{t('same_address_as_company')}</span>
                        </label>
                        {renderAddressBlock(client.isLegalAddressSameAsCompany ? client.legalRepresentativeAddress : client.address, 'address', true, () => {}, !!client.isLegalAddressSameAsCompany)}
                    </div>
                    </div>

                    <div ref={contactsSectionRef}>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('contacts')}</h4>
                <div className="space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer py-1">
                        <input type="checkbox" checked={useAsPrimaryContact} onChange={(e) => { if (e.target.checked) { syncPrimaryContactFromLegalRep(); setShouldScrollToContactsSection(true); } else { clearPrimaryContactFields(); } }} className="rounded" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{includeCompanyData ? t('use_legal_rep_as_primary_contact') : t('use_as_primary_contact')}</span>
                    </label>
                    {(() => {
                        const sortedContacts = [...(client.contacts || [])].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
                        return sortedContacts.map((c, sortedIdx) => {
                            const i = client.contacts?.findIndex((orig) => orig.id === c.id) ?? sortedIdx;
                            const isPrimary = sortedIdx === 0;
                            if (!isPrimary && !showOtherContacts) return null;
                            const isLastContact = sortedIdx === sortedContacts.length - 1;
                            return (
                            <div key={c.id} ref={isLastContact ? lastContactRef : undefined} className="p-3 rounded-lg">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <UserCircleIcon className={ICON_STYLE} />
                                        <GhostInput
                                            value={isPrimary && useAsPrimaryContact ? (includeCompanyData ? (client.legalRepresentativeName || '') : (client.name || '')) : c.name}
                                            onChange={(v) => { const nc = [...(client.contacts || [])]; nc[i] = { ...nc[i], name: v }; onUpdate({ contacts: nc }); }}
                                            placeholder={t('contact_name')}
                                            className="flex-1 min-w-0"
                                            disabled={isPrimary && useAsPrimaryContact}
                                        />
                                        {!isPrimary && <button type="button" onClick={() => handleDeleteContact(c.id)} className="p-1 text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <BriefcaseIcon className={ICON_STYLE} />
                                        <GhostInput value={isPrimary && useAsPrimaryContact ? (client.legalRepresentativeRole || '') : c.role} onChange={(v) => { const nc = [...(client.contacts || [])]; nc[i] = { ...nc[i], role: v }; onUpdate({ contacts: nc }); }} placeholder={t('contact_role')} className="flex-1 min-w-0" disabled={isPrimary && useAsPrimaryContact} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <AtSignIcon className={ICON_STYLE} />
                                        <GhostInput type="email" value={isPrimary && useAsPrimaryContact ? (client.legalRepresentativeEmail || '') : c.email} onChange={(v) => { const nc = [...(client.contacts || [])]; nc[i] = { ...nc[i], email: v }; onUpdate({ contacts: nc }); }} placeholder={t('email')} className="flex-1 min-w-0" disabled={isPrimary && useAsPrimaryContact} />
                                    </div>
                                    <div className={`flex items-center gap-2 ${isPrimary && useAsPrimaryContact ? 'opacity-90 pointer-events-none' : ''}`}>
                                        <WhatsAppIcon className={ICON_STYLE} />
                                        <div className="flex-1 min-w-0">
                                            <PhoneInput value={isPrimary && useAsPrimaryContact ? (client.legalRepresentativeWhatsapp || '') : (c.whatsapp || '')} countryCode={(COUNTRIES.find((cc) => ((isPrimary && useAsPrimaryContact ? client.legalRepresentativeWhatsapp : c.whatsapp) || '').startsWith(cc.dial))?.code) || 'BR'} onCountryChange={(code) => { if (!(isPrimary && useAsPrimaryContact)) { const nc = [...(client.contacts || [])]; nc[i] = { ...nc[i], whatsapp: swapDial(c.whatsapp || '', code) }; onUpdate({ contacts: nc }); } }} onChange={(val) => { if (!(isPrimary && useAsPrimaryContact)) { const nc = [...(client.contacts || [])]; nc[i] = { ...nc[i], whatsapp: val }; onUpdate({ contacts: nc }); } }} placeholder="(11) 99999-9999" appearance="clean" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <FileTextIcon className={ICON_STYLE} />
                                        <textarea value={c.notes || ''} onChange={(e) => { const nc = [...(client.contacts || [])]; nc[i] = { ...nc[i], notes: e.target.value }; onUpdate({ contacts: nc }); }} placeholder={t('notes_optional')} className="flex-1 min-w-0 text-sm bg-gray-50 dark:bg-gray-700/50 border-b border-gray-300 dark:border-gray-500 py-1 px-0 rounded min-h-[2rem]" rows={2} />
                                    </div>
                                </div>
                            </div>
                        );
                    });
                    })()}
                    <button type="button" onClick={() => { setShowOtherContacts(true); const newContact: ClientContact = { id: `c-${Date.now()}`, name: '', role: '', email: '' }; onUpdate({ contacts: [...(client.contacts || []), newContact] }); setShouldScrollToNewContact(true); }} className="w-full text-sm p-2.5 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg text-gray-500 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        + {t('add_other_contacts')}
                    </button>
                </div>
                    </div>
                </div>
                </CollapsibleSectionBlock>
            )}
        </div>
    );

    if (layout === 'minimal') {
        return (
            <div className="space-y-6">
                {formContent()}
            </div>
        );
    }

    return (
        <EditableCard heading={t('client_data')} icon={<BriefcaseIcon className="text-indigo-500" />} onSave={onSave} onCancel={onCancel} isDirty={isDirty} requestConfirmation={requestConfirmation}>
            {formContent}
        </EditableCard>
    );
};
