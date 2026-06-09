
import React, { useState, useMemo, useContext, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { AppContext } from '../contexts/AppContext';
import { AuthContext } from '../contexts/AuthContext';
import { apiDelete, apiGet, apiPut, apiUpload, authStorage, parseApiErrorMessage, toUploadUrl } from '../lib/api';
import { UserCircleIcon, CreditCardIcon, AtSignIcon, WhatsAppIcon, PlusIcon, UploadCloudIcon, BuildingIcon, MapPinIcon, FileTextIcon, HistoryIcon, GlobeIcon, CalendarIcon, HomeIcon, PhoneIcon } from './icons';
import { User, AgencyProfile, Address, Currency, ActivityLogEntry } from '../types';
import { ActivityHistoryActionLine, isTechnicalActivityActionKey } from './activity/ActivityHistoryActionLine';
import { TeamSettings } from './TeamPage';
import BillingPage from './BillingPage';
import PhoneInput from './PhoneInput';
import { GhostInput } from './GhostInput';
import { CepGhostInput } from './CepGhostInput';
import { UnsavedChangesBar } from './clients/UnsavedChangesBar';
import { COUNTRIES } from '../lib/phone.tsx';
import {
    CONTENT_PAGE_BODY_INNER,
    CONTENT_PAGE_SCROLL_OUTER,
    CONTENT_BELOW_HEADER_PAD,
} from '../lib/contentPageHeader';
import ContentPageHeader from './ContentPageHeader';
import { AgencySocialLinksEditor } from './AgencySocialLinksEditor';
import { InlineCurrencyField } from './InlineCurrencyField';
import { isLikelyBrazilCountry } from '../lib/cepLookup';
import TooltipHint from './TooltipHint';

const ClientsUploadModal = lazy(() =>
    import('./clients/UploadModal').then((m) => ({ default: m.UploadModal })),
);

// Países movidos para componente compartilhado (PHONE_COUNTRIES)

const getInitials = (name: string) => {
    const words = name.split(' ');
    if (words.length > 1) {
        return words[0].charAt(0) + words[words.length - 1].charAt(0);
    }
    return name.substring(0, 2).toUpperCase();
};

// --- Validation Helpers ---
const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

const digitsOnly = (s: string | undefined) => (s || '').replace(/\D/g, '');

/** BR: 10 dígitos (fixo) ou 11 (celular com 9 na terceira posição). DDD 11–99. */
const validateBrLocalDigits = (local: string, kind: 'any' | 'mobile' | 'landline' = 'any'): boolean => {
    const ddd = parseInt(local.slice(0, 2), 10);
    if (!(ddd >= 11 && ddd <= 99)) return false;

    // Fixo BR clássico: 10 dígitos (DDD + 8)
    if (local.length === 10) {
        return kind !== 'mobile';
    }
    if (local.length === 11) {
        if (kind === 'landline') return false;
        if (kind === 'mobile') return local.charAt(2) === '9';
        return true;
    }
    return false;
};

/** Número completo (com DDI) — usado quando há dígitos além do DDI. */
const validatePhoneCore = (phone: string, kind: 'any' | 'mobile' | 'landline' = 'any'): boolean => {
    const p = (phone || '').trim();
    if (!p) return false;
    const country = COUNTRIES.find((c) => p.startsWith(c.dial)) || COUNTRIES[0];
    const dialD = country.dial.replace(/\D/g, '');
    const all = digitsOnly(p);
    const local = all.startsWith(dialD) ? all.slice(dialD.length) : all;
    if (local.length === 0) return false;
    if (country.dial === '+55' || country.code === 'BR') {
        return validateBrLocalDigits(local, kind);
    }
    if (country.dial === '+1') {
        if (kind === 'landline') return local.length >= 10 && local.length <= 11;
        return local.length === 10;
    }
    return local.length >= 8 && local.length <= 14;
};

/** Telefone vazio ou só DDI = válido (campo opcional). */
const validatePhoneOptional = (
    phone: string | undefined,
    kind: 'any' | 'mobile' | 'landline' = 'any',
) => {
    const p = (phone || '').trim();
    if (!p) return true;
    const allDigits = digitsOnly(p);
    const country = COUNTRIES.find((c) => p.startsWith(c.dial)) || COUNTRIES[0];
    const dialD = country.dial.replace(/\D/g, '');
    if (allDigits.length <= dialD.length) return true;
    return validatePhoneCore(p, kind);
};

const snapshotUserForAccountDirty = (u: User | null): string => {
    if (!u) return '';
    return JSON.stringify({
        id: u.id,
        name: u.name,
        email: u.email,
        birthDate: u.birthDate ?? '',
        avatarUrl: u.avatarUrl ?? '',
        phone: digitsOnly(u.phone),
    });
};

const snapshotAgencyForAccountDirty = (a: AgencyProfile): string =>
    JSON.stringify({
        name: a.name ?? '',
        cnpj: a.cnpj ?? '',
        contactEmail: a.contactEmail ?? '',
        avatarUrl: a.avatarUrl ?? '',
        baseCurrency: a.baseCurrency ?? 'BRL',
        whatsapp: digitsOnly(a.whatsapp),
        landlinePhone: digitsOnly(a.landlinePhone),
        address: {
            zipCode: a.address?.zipCode ?? '',
            street: a.address?.street ?? '',
            number: a.address?.number ?? '',
            neighborhood: a.address?.neighborhood ?? '',
            city: a.address?.city ?? '',
            state: a.address?.state ?? '',
            country: a.address?.country ?? '',
            complement: a.address?.complement ?? '',
        },
        socialLinks: (a.socialLinks ?? []).map((s) => ({
            platform: s.platform ?? '',
            url: s.url ?? '',
        })),
    });

// PhoneInput + GhostInput — mesmo padrão visual da guia Dados do cliente (ClientDataForms)

const ICON_STYLE = 'h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500';

const AccountSectionCard: React.FC<{
    heading: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    headingClassName?: string;
}> = ({ heading, icon, children, headingClassName = '' }) => (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-2 border-b border-gray-200 p-4 dark:border-gray-700">
            <span className="text-indigo-500">{icon}</span>
            <h3 className={`text-lg font-semibold text-gray-900 dark:text-white ${headingClassName}`}>{heading}</h3>
        </div>
        <div className="flex-grow p-6">{children}</div>
    </div>
);

/** Três trilhas fixas (efeito tabela): inícios das colunas 2 e 3 alinhados em header e linhas; mesmo gap entre 1↔2 e 2↔3. */
const activityHistoryGridClass =
    'grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-[minmax(240px,360px)_minmax(320px,420px)_140px] md:items-center md:justify-start md:gap-x-4 md:gap-y-0';

type ActivityLogsApiResponse = {
    items: ActivityLogEntry[];
    total: number;
    page: number;
    pageSize: number;
};

function mergeActivityLogsById(remote: ActivityLogEntry[], local: ActivityLogEntry[]): ActivityLogEntry[] {
    const map = new Map<string, ActivityLogEntry>();
    for (const r of remote) map.set(r.id, r);
    for (const l of local) {
        if (!map.has(l.id)) map.set(l.id, l);
    }
    const merged = Array.from(map.values());
    /** Evita duas linhas iguais: mesma ação no mesmo segundo com id local (`log-…`) e id do servidor (ingest). */
    const byFingerprint = new Map<string, ActivityLogEntry>();
    const fingerprint = (e: ActivityLogEntry) => {
        const sec = Math.floor(new Date(e.timestamp).getTime() / 1000);
        if (e.line?.v === 2) {
            const L = e.line;
            return `v2|${e.userId}|${L.verb}|${L.item}|${(L.name || '').trim()}|${L.page}|${L.clientSection ?? ''}|${
                L.accountTab ?? ''
            }|${sec}`;
        }
        return `${e.userId}|${e.actionKey ?? ''}|${(e.targetName || '').trim()}|${sec}`;
    };
    const preferEntry = (a: ActivityLogEntry, b: ActivityLogEntry) => {
        const aLocal = a.id.startsWith('log-');
        const bLocal = b.id.startsWith('log-');
        if (aLocal && !bLocal) return b;
        if (!aLocal && bLocal) return a;
        return new Date(a.timestamp).getTime() >= new Date(b.timestamp).getTime() ? a : b;
    };
    for (const e of merged) {
        const fp = fingerprint(e);
        const prev = byFingerprint.get(fp);
        byFingerprint.set(fp, prev ? preferEntry(prev, e) : e);
    }
    return Array.from(byFingerprint.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
}

const ActivityHistory: React.FC = () => {
    const { t, language, activityLog, agencyProfile, currentUser, canEditModule } = useContext(AppContext)!;
    /** Mesma ideia do backend: owner/admin, legado `manage_team`, ou função com equipe em nível edit. */
    const canFilterByCollaborator =
        currentUser?.role === 'owner' ||
        currentUser?.role === 'admin' ||
        (currentUser?.permissions ?? []).includes('manage_team') ||
        canEditModule('team');
    const [filterUserId, setFilterUserId] = useState('');
    const [remoteItems, setRemoteItems] = useState<ActivityLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const collaboratorOptions = useMemo(
        () => agencyProfile.teamMembers.filter((m) => m.inviteStatus !== 'disabled'),
        [agencyProfile.teamMembers],
    );

    const localFiltered = useMemo(() => {
        if (!canFilterByCollaborator) {
            return activityLog.filter((a) => a.userId === currentUser?.id);
        }
        if (filterUserId) {
            return activityLog.filter((a) => a.userId === filterUserId);
        }
        return activityLog;
    }, [activityLog, canFilterByCollaborator, filterUserId, currentUser?.id]);

    const rows = useMemo(
        () => mergeActivityLogsById(remoteItems, localFiltered),
        [remoteItems, localFiltered],
    );
    const visibleRows = useMemo(
        () => rows.filter((e) => !(e.line == null && isTechnicalActivityActionKey(e.actionKey))),
        [rows],
    );

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const pageSize = 100;
            const baseParams: Record<string, string | number> = { pageSize };
            if (canFilterByCollaborator && filterUserId) {
                baseParams.userId = filterUserId;
            }
            const merged: ActivityLogEntry[] = [];
            let total = 0;
            for (let page = 1; page <= 40; page += 1) {
                const data = await apiGet<ActivityLogsApiResponse>(
                    '/activity-logs',
                    { ...baseParams, page },
                    { bypassShortLivedCache: true },
                );
                const chunk = data.items ?? [];
                if (page === 1) {
                    total = typeof data.total === 'number' ? data.total : 0;
                }
                merged.push(...chunk);
                if (chunk.length === 0 || chunk.length < pageSize) break;
                if (total > 0 && merged.length >= total) break;
            }
            setRemoteItems(merged);
        } catch (err) {
            setRemoteItems([]);
            setLoadError(parseApiErrorMessage(err, t('history_load_error')));
        } finally {
            setLoading(false);
        }
    }, [canFilterByCollaborator, filterUserId, t]);

    useEffect(() => {
        void fetchLogs();
    }, [fetchLogs]);

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white text-left text-sm shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-200 px-5 py-4 md:px-6 dark:border-gray-700">
                <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                    <HistoryIcon className="h-5 w-5 shrink-0 text-indigo-500" /> {t('activity_history')}
                </h3>
            </div>
            {canFilterByCollaborator && (
                <div className="border-b border-gray-200 px-5 py-3 md:px-6 dark:border-gray-700">
                    <label htmlFor="activity-history-collab-filter" className="sr-only">
                        {t('history_filter_collaborator_aria')}
                    </label>
                    <select
                        id="activity-history-collab-filter"
                        value={filterUserId}
                        onChange={(e) => setFilterUserId(e.target.value)}
                        aria-label={t('history_filter_collaborator_aria')}
                        className="w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-gray-600 dark:bg-gray-900 dark:text-white md:w-80"
                    >
                        <option value="">{t('history_filter_all_collaborators')}</option>
                        {collaboratorOptions.map((m) => (
                            <option key={m.id} value={m.id}>
                                {m.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}
            <div className="min-w-0 overflow-x-auto">
                {loadError && (
                    <p className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100 md:px-6">
                        {loadError}
                    </p>
                )}
                <div
                    className={`border-b border-gray-200 bg-gray-50/90 px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 md:px-6 dark:border-gray-600 dark:bg-gray-900/50 dark:text-gray-400 ${activityHistoryGridClass}`}
                >
                    <span className="min-w-0 pl-3 md:pl-4">{t('team_table_col_member')}</span>
                    <span className="min-w-0">{t('action')}</span>
                    <span className="min-w-0 text-left">{t('date')}</span>
                </div>
                {loading && visibleRows.length === 0 ? (
                    <p className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400 md:px-6">{t('history_loading')}</p>
                ) : null}
                {loading && visibleRows.length > 0 ? (
                    <p className="border-b border-gray-100 px-5 py-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400 md:px-6">
                        {t('history_loading')}
                    </p>
                ) : null}
                <ul className="divide-y divide-gray-100 dark:divide-gray-700" role="list">
                    {visibleRows.length > 0 ? (
                        visibleRows.map((act) => (
                            <li key={act.id}>
                                <div
                                    className={`px-5 py-5 transition-colors hover:bg-gray-50 md:px-6 dark:hover:bg-gray-800/50 ${activityHistoryGridClass}`}
                                >
                                    <div className="min-w-0 pl-3 md:pl-4">
                                        <span className="block truncate font-medium text-gray-900 dark:text-white">
                                            {act.userName}
                                        </span>
                                    </div>
                                    <div className="min-w-0 break-words text-gray-600 dark:text-gray-300">
                                        <ActivityHistoryActionLine entry={act} t={t} />
                                    </div>
                                    <div className="min-w-0 text-left text-sm text-gray-500 dark:text-gray-400">
                                        {new Date(act.timestamp).toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US')}
                                    </div>
                                </div>
                            </li>
                        ))
                    ) : !loading && visibleRows.length === 0 ? (
                        <li className="px-5 py-10 text-center text-gray-500 dark:text-gray-400 md:px-6">
                            {t('no_data_available')}
                        </li>
                    ) : null}
                </ul>
            </div>
        </div>
    );
};


const AccountSettingsPage: React.FC = () => {
    const context = useContext(AppContext);
    
    if (!context) return null;

    const auth = useContext(AuthContext);
    const {
        t,
        currentUser,
        agencyProfile,
        agencyMode,
        setAgencyProfile,
        updateTeamMember,
        reloadAgency,
        canViewModule,
        canEditModule,
        registerDirtyForm,
        showConfirmation,
        notify,
        logActivity,
    } = context;

    /**
     * Abas de Minha Conta não devem depender do pacote lean de `simpleAccessLevel` (resolveModulePermissions),
     * que zera team/settings/financial para vários perfis — ao mudar para Equipe pequena as abas sumiam.
     * Equipe: só faz sentido com agência em modo TEAM. Histórico e faturamento permanecem na página.
     */
    const showAccountTeamTab = (agencyMode ?? 'SOLO') === 'TEAM';
    const showAccountHistoryTab = true;
    const showAccountBillingTab = true;
    
    // State for Profile Tab
    const [localUser, setLocalUser] = useState<User | null>(currentUser);
    // State for Agency Data
    const [localAgency, setLocalAgency] = useState<AgencyProfile>(agencyProfile);
    
    // UI States
    const [activeTab, setActiveTab] = useState('details');

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem('flow_account_nav');
            if (!raw) return;
            sessionStorage.removeItem('flow_account_nav');
            const { tab } = JSON.parse(raw) as { tab?: string };
            if (tab === 'details' || tab === 'team') setActiveTab(tab);
        } catch {
            /* ignore */
        }
    }, []);

    const [showDelete, setShowDelete] = useState(false);
    const [confirmAgency, setConfirmAgency] = useState('');

    // Errors State
    const [userErrors, setUserErrors] = useState<{email?: string, phone?: string}>({});
    const [agencyErrors, setAgencyErrors] = useState<{
        email?: string;
        phone?: string;
        landline?: string;
        zipCode?: string;
    }>({});
    const [cepBlocksSave, setCepBlocksSave] = useState(false);
    const [saveBarFeedback, setSaveBarFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // Upload States
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [accountUploadDest, setAccountUploadDest] = useState<'user' | 'agency'>('user');
    const [accountUploadLoading, setAccountUploadLoading] = useState(false);
    const [accountUploadError, setAccountUploadError] = useState<string | null>(null);

    useEffect(() => {
        setLocalUser(currentUser);
    }, [currentUser]);
    
    useEffect(() => {
        setLocalAgency(agencyProfile);
    }, [agencyProfile]);

    const getCountryFromPhone = (p: string | undefined) => {
        const match = COUNTRIES.find(c => (p || '').startsWith(c.dial));
        return match ? match.code : 'BR';
    };

    const [userPhoneCountry, setUserPhoneCountry] = useState<string>(getCountryFromPhone(currentUser?.phone));
    const [agencyPhoneCountry, setAgencyPhoneCountry] = useState<string>(getCountryFromPhone(agencyProfile.whatsapp));
    const [agencyLandlineCountry, setAgencyLandlineCountry] = useState<string>(getCountryFromPhone(agencyProfile.landlinePhone));

    useEffect(() => {
        setUserPhoneCountry(getCountryFromPhone(localUser?.phone));
    }, [localUser?.phone]);

    useEffect(() => {
        setAgencyPhoneCountry(getCountryFromPhone(localAgency.whatsapp));
    }, [localAgency.whatsapp]);

    useEffect(() => {
        setAgencyLandlineCountry(getCountryFromPhone(localAgency.landlinePhone));
    }, [localAgency.landlinePhone]);

    const validateUserForm = useCallback((): boolean => {
        if (!localUser) return false;
        const errors: { email?: string; phone?: string } = {};
        if (localUser.email && !validateEmail(localUser.email)) errors.email = t('field_hint_email_invalid');
        if (!validatePhoneOptional(localUser.phone, 'mobile')) errors.phone = t('field_hint_phone_invalid');
        setUserErrors(errors);
        return Object.keys(errors).length === 0;
    }, [localUser, t]);

    const validateAgencyForm = useCallback((): boolean => {
        const errors: {
            email?: string;
            phone?: string;
            landline?: string;
            zipCode?: string;
        } = {};
        if (localAgency.contactEmail && !validateEmail(localAgency.contactEmail)) errors.email = t('field_hint_email_invalid');
        if (!validatePhoneOptional(localAgency.whatsapp, 'mobile')) errors.phone = t('field_hint_phone_invalid');
        if (!validatePhoneOptional(localAgency.landlinePhone, 'landline')) errors.landline = t('field_hint_phone_invalid');
        const zipDigits = digitsOnly(localAgency.address?.zipCode);
        if (
            canEditModule('settings') &&
            isLikelyBrazilCountry(localAgency.address?.country) &&
            zipDigits.length > 0 &&
            zipDigits.length !== 8
        ) {
            errors.zipCode = t('field_hint_cep_incomplete');
        }
        setAgencyErrors(errors);
        return Object.keys(errors).length === 0;
    }, [localAgency, t, canEditModule]);

    const persistAgencyLocalAndApi = useCallback(async (): Promise<boolean> => {
        if (currentUser?.role === 'owner') {
            try {
                await apiPut('/agencies/me', {
                    name: localAgency.name,
                    cnpj: localAgency.cnpj || null,
                    email: localAgency.contactEmail || '',
                    phone: localAgency.landlinePhone || null,
                    logoUrl: localAgency.avatarUrl ?? null,
                    baseCurrency: localAgency.baseCurrency,
                    addressJson: {
                        ...(localAgency.address || {}),
                        whatsapp: localAgency.whatsapp,
                        socialLinks: localAgency.socialLinks ?? [],
                    },
                });
                await reloadAgency();
                logActivity({
                    v: 2,
                    verb: 'updated',
                    item: 'settings_agency',
                    name: 'Dados da agência',
                    page: 'account',
                    accountTab: 'details',
                });
                return true;
            } catch {
                return false;
            }
        }
        setAgencyProfile(localAgency);
        logActivity({
            v: 2,
            verb: 'updated',
            item: 'settings_agency',
            name: 'Dados da agência',
            page: 'account',
            accountTab: 'details',
        });
        return true;
    }, [currentUser?.role, localAgency, reloadAgency, setAgencyProfile, logActivity]);

    const isUserDirty = snapshotUserForAccountDirty(localUser) !== snapshotUserForAccountDirty(currentUser);
    const isAgencyDirty = snapshotAgencyForAccountDirty(localAgency) !== snapshotAgencyForAccountDirty(agencyProfile);
    const isDirty = isUserDirty || isAgencyDirty;

    const prevIsDirtyRef = useRef(false);
    useEffect(() => {
        if (isDirty && !prevIsDirtyRef.current) {
            setSaveBarFeedback(null);
        }
        prevIsDirtyRef.current = isDirty;
    }, [isDirty]);

    const runSaveDetails = useCallback(async () => {
        setSaveBarFeedback(null);
        const attemptedUser = isUserDirty;
        const attemptedAgency = isAgencyDirty && canEditModule('settings');
        if (!attemptedUser && !attemptedAgency) return;

        let userValidationOk = !attemptedUser;
        let agencyValidationOk = !attemptedAgency;
        let userApiOk = !attemptedUser;
        let agencyApiOk = !attemptedAgency;
        let agencyBlockedCep = false;

        if (attemptedUser) {
            userValidationOk = validateUserForm();
            if (userValidationOk) {
                try {
                    await updateTeamMember(localUser!, {
                        ...(attemptedAgency ? { skipAgencyReload: true } : {}),
                        activityAccountTab: 'details',
                    });
                    await auth?.refreshMe?.();
                    userApiOk = true;
                } catch {
                    userApiOk = false;
                }
            } else {
                userApiOk = false;
            }
        }

        if (attemptedAgency) {
            agencyValidationOk = validateAgencyForm();
            if (!agencyValidationOk) {
                agencyApiOk = false;
            } else if (cepBlocksSave) {
                agencyBlockedCep = true;
                agencyApiOk = false;
            } else {
                agencyApiOk = await persistAgencyLocalAndApi();
            }
        }

        if (attemptedUser && userApiOk && attemptedAgency && !agencyApiOk) {
            try {
                await reloadAgency();
            } catch {
                /* mantém equipe sincronizada após PUT do usuário quando a agência não persistiu */
            }
        }

        const userAllOk = !attemptedUser || (userValidationOk && userApiOk);
        const agencyAllOk = !attemptedAgency || (agencyValidationOk && agencyApiOk && !agencyBlockedCep);

        if (userAllOk && agencyAllOk) {
            setSaveBarFeedback({ type: 'success', text: t('changes_saved') });
        } else if (
            userValidationOk &&
            agencyValidationOk &&
            agencyBlockedCep &&
            userApiOk &&
            !agencyApiOk
        ) {
            setSaveBarFeedback({ type: 'error', text: t('account_bar_check_cep') });
        } else if (!userValidationOk || !agencyValidationOk) {
            setSaveBarFeedback({ type: 'error', text: t('account_bar_review_fields') });
        } else {
            setSaveBarFeedback({ type: 'error', text: t('account_bar_save_failed') });
        }
    }, [
        isUserDirty,
        isAgencyDirty,
        cepBlocksSave,
        validateUserForm,
        validateAgencyForm,
        persistAgencyLocalAndApi,
        updateTeamMember,
        reloadAgency,
        localUser,
        auth,
        t,
        canEditModule,
    ]);

    const flushDetailsDiscard = useCallback(() => {
        setLocalUser(currentUser);
        setUserErrors({});
        setLocalAgency(agencyProfile);
        setAgencyErrors({});
        setSaveBarFeedback(null);
    }, [currentUser, agencyProfile]);

    const saveDetailsRef = useRef<() => boolean>(() => true);
    saveDetailsRef.current = () => {
        void runSaveDetails();
        return true;
    };

    useEffect(() => {
        if (activeTab !== 'details' || !isDirty) {
            registerDirtyForm(false);
            return () => registerDirtyForm(false);
        }
        const save = () => saveDetailsRef.current();
        registerDirtyForm(true, save, flushDetailsDiscard);
        return () => registerDirtyForm(false);
    }, [activeTab, isDirty, registerDirtyForm, flushDetailsDiscard]);

    useEffect(() => {
        if (activeTab !== 'details') setSaveBarFeedback(null);
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'team' && !showAccountTeamTab) setActiveTab('details');
    }, [activeTab, showAccountTeamTab]);

    const requestBarConfirmation = useCallback((onDiscard: () => void) => {
        showConfirmation({
            title: t('confirm_discard_changes_title'),
            message: t('confirm_discard_changes'),
            confirmText: t('continue_editing'),
            cancelText: t('discard'),
            onConfirm: () => {},
            onCancel: onDiscard,
        });
    }, [showConfirmation, t]);

    const handleTabChange = (tabId: string) => {
        if (activeTab === tabId) return;

        if (isDirty) {
            showConfirmation({
                title: t('confirm_discard_changes_title'),
                message: t('confirm_discard_changes'),
                confirmText: t('discard'),
                cancelText: t('cancel'),
                onConfirm: () => {
                    flushDetailsDiscard();
                    setActiveTab(tabId);
                },
            });
        } else {
            setActiveTab(tabId);
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

    if (!localUser) return null;

    const canEditAgency = canEditModule('settings');
    const noEditTip = canEditAgency ? undefined : t('tooltip_no_edit_permission');

    const handleAgencyAddressChange = (field: keyof Address, value: string) => {
        if (field === 'zipCode') setAgencyErrors((e) => ({ ...e, zipCode: undefined }));
        setLocalAgency((prev) => ({
            ...prev,
            address: { ...prev.address, [field]: value },
        }));
    };
    
    const handleAccountUploadFile = async (file: File | Blob) => {
        if (!file || (!(file instanceof File) && !(file instanceof Blob)) || file.size === 0) {
            setAccountUploadError('Arquivo inválido ou vazio.');
            return;
        }
        const mime = file instanceof File ? file.type : '';
        if (mime && !mime.startsWith('image/')) {
            setAccountUploadError('Selecione uma imagem (JPEG, PNG ou WebP).');
            return;
        }
        setAccountUploadError(null);
        setAccountUploadLoading(true);
        try {
            const { url } = await apiUpload(file);
            if (accountUploadDest === 'user') {
                if (!localUser) {
                    setAccountUploadError(t('agency_op_save_error'));
                    return;
                }
                setLocalUser({ ...localUser, avatarUrl: url });
            } else {
                setLocalAgency((prev) => ({ ...prev, avatarUrl: url }));
            }
            setIsUploadModalOpen(false);
            setAccountUploadError(null);
        } catch (err) {
            const msg = err instanceof Error ? err.message : t('agency_op_save_error');
            setAccountUploadError(msg);
        } finally {
            setAccountUploadLoading(false);
        }
    };

    const openAccountUpload = (dest: 'user' | 'agency') => {
        setAccountUploadDest(dest);
        setAccountUploadError(null);
        setIsUploadModalOpen(true);
    };
    
    // (Removido UserProfileCard inline para evitar remount e perda de foco)

    const tabBtn = (id: string) =>
        `pb-2.5 px-2 text-sm font-medium whitespace-nowrap transition-colors sm:px-3 ${
            activeTab === id
                ? 'border-b-2 border-indigo-500 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-b-2 border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
        }`;

    return (
        <>
        <div className="flex min-h-full min-w-0 w-full flex-1 flex-col">
            <ContentPageHeader
                heading={t('account_settings')}
                subtitle={t('account_settings_subtitle')}
            />

            <div className={`${CONTENT_PAGE_SCROLL_OUTER} ${CONTENT_BELOW_HEADER_PAD}`}>
                <div className={`${CONTENT_PAGE_BODY_INNER} text-left`}>
                <nav
                    className="-mt-1 flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700 sm:gap-2"
                    aria-label={t('account_settings')}
                >
                     <button type="button" onClick={() => handleTabChange('details')} className={tabBtn('details')}>
                         {t('details')}
                     </button>
                     {showAccountTeamTab && (
                         <button type="button" onClick={() => handleTabChange('team')} className={tabBtn('team')}>
                             {t('team')}
                         </button>
                     )}
                     {showAccountHistoryTab && (
                        <button type="button" onClick={() => handleTabChange('history')} className={tabBtn('history')}>
                            {t('history')}
                        </button>
                     )}
                     {showAccountBillingTab && (
                         <button type="button" onClick={() => handleTabChange('billing')} className={tabBtn('billing')}>
                             {t('billing')}
                         </button>
                     )}
                </nav>

            <main
                className={`mt-8 w-full min-w-0 text-left ${activeTab === 'details' && (isDirty || saveBarFeedback) ? 'pb-20 sm:pb-24' : ''}`}
            >
                 {activeTab === 'details' && (
                    <div className="flex flex-col gap-8">
                        <AccountSectionCard heading={t('personal_data')} icon={<UserCircleIcon className="h-5 w-5" />}>
                            <div className="space-y-6">
                                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
                                    <div className="flex shrink-0 justify-center sm:justify-start sm:pt-1">
                                        <button
                                            type="button"
                                            onClick={() => openAccountUpload('user')}
                                            className="group relative cursor-pointer"
                                        >
                                            {localUser.avatarUrl ? (
                                                <img
                                                    src={toUploadUrl(localUser.avatarUrl)}
                                                    alt=""
                                                    className="h-28 w-28 rounded-full border border-gray-200 bg-gray-100 object-cover shadow-sm ring-4 ring-white dark:border-gray-600 dark:bg-gray-800 dark:ring-gray-800"
                                                />
                                            ) : (
                                                <div className="flex h-28 w-28 items-center justify-center rounded-full border border-gray-200 bg-indigo-600 text-3xl font-bold text-white shadow-sm ring-4 ring-white dark:border-gray-600 dark:ring-gray-800">
                                                    {getInitials(localUser.name)}
                                                </div>
                                            )}
                                            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                                                <UploadCloudIcon className="h-8 w-8 text-white" />
                                            </div>
                                        </button>
                                    </div>
                                    <div className="grid min-w-0 flex-1 grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">
                                        <div className="flex min-w-0 flex-wrap items-center gap-2 md:col-span-2">
                                            <UserCircleIcon className={ICON_STYLE} />
                                            <GhostInput
                                                value={localUser.name}
                                                onChange={(v) => setLocalUser((prev) => (prev ? { ...prev, name: v } : null))}
                                                placeholder={t('full_name')}
                                                className="min-w-0 flex-1"
                                            />
                                            <TooltipHint label={`${t('role')}: ${t(`role_${localUser.role}`)}`}>
                                                <span className="inline-flex shrink-0 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200">
                                                    {t(`role_${localUser.role}`)}
                                                </span>
                                            </TooltipHint>
                                        </div>
                                        <div className="flex min-w-0 items-center gap-2 md:col-span-2">
                                            <CalendarIcon className={ICON_STYLE} />
                                            <GhostInput
                                                type="date"
                                                value={localUser.birthDate || ''}
                                                onChange={(v) => setLocalUser((prev) => (prev ? { ...prev, birthDate: v } : null))}
                                                placeholder={t('birth_date')}
                                                className="min-w-0 flex-1"
                                            />
                                        </div>
                                        <div className="flex min-w-0 items-center gap-2 md:col-span-2">
                                            <AtSignIcon className={ICON_STYLE} />
                                            <div className="min-w-0 flex-1">
                                                <GhostInput
                                                    type="email"
                                                    value={localUser.email}
                                                    onChange={(v) => {
                                                        setUserErrors((e) => ({ ...e, email: undefined }));
                                                        setLocalUser((prev) => (prev ? { ...prev, email: v } : null));
                                                    }}
                                                    placeholder={t('email')}
                                                    className="w-full"
                                                />
                                                {userErrors.email && <p className="mt-1 text-xs text-red-500">{userErrors.email}</p>}
                                            </div>
                                        </div>
                                        <div className="flex min-w-0 items-center gap-2 md:col-span-2">
                                            <WhatsAppIcon className={ICON_STYLE} />
                                            <PhoneInput
                                                value={localUser.phone || ''}
                                                onChange={(val) => {
                                                    setUserErrors((e) => ({ ...e, phone: undefined }));
                                                    setLocalUser((prev) => (prev ? { ...prev, phone: val } : null));
                                                }}
                                                countryCode={userPhoneCountry}
                                                onCountryChange={(code) => {
                                                    setUserPhoneCountry(code);
                                                    setLocalUser((prev) =>
                                                        prev ? { ...prev, phone: swapDial(prev.phone || '', code) } : null,
                                                    );
                                                }}
                                                error={userErrors.phone}
                                                appearance="clean"
                                                className="min-w-0 flex-1"
                                                brNumberKind="mobile"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </AccountSectionCard>

                        <AccountSectionCard heading={t('agency_details')} icon={<BuildingIcon className="h-5 w-5" />}>
                            {!canEditAgency && (
                                <div
                                    role="status"
                                    className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-800/80 dark:bg-amber-950/35 dark:text-amber-100"
                                >
                                    {t('agency_edit_admin_only')}
                                </div>
                            )}
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-[7rem,minmax(0,1fr)] sm:gap-8">
                                <div className="flex justify-center sm:justify-start sm:self-start">
                                    {noEditTip ? (
                                        <TooltipHint label={noEditTip}>
                                            <button
                                                type="button"
                                                onClick={() => canEditAgency && openAccountUpload('agency')}
                                                className={`group relative shrink-0 ${canEditAgency ? 'cursor-pointer' : 'cursor-default opacity-80'}`}
                                                disabled={!canEditAgency}
                                                aria-label={noEditTip}
                                            >
                                                {localAgency.avatarUrl ? (
                                                    <img
                                                        src={toUploadUrl(localAgency.avatarUrl)}
                                                        alt=""
                                                        className="h-28 w-28 rounded-full border border-gray-200 bg-gray-100 object-cover shadow-sm ring-4 ring-white dark:border-gray-600 dark:bg-gray-800 dark:ring-gray-800"
                                                    />
                                                ) : (
                                                    <div className="flex h-28 w-28 items-center justify-center rounded-full border border-gray-200 bg-indigo-600 text-2xl font-bold text-white shadow-sm ring-4 ring-white dark:border-gray-600 dark:ring-gray-800">
                                                        {getInitials(localAgency.name)}
                                                    </div>
                                                )}
                                                {canEditAgency && (
                                                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                                                        <UploadCloudIcon className="h-7 w-7 text-white" />
                                                    </div>
                                                )}
                                            </button>
                                        </TooltipHint>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => canEditAgency && openAccountUpload('agency')}
                                            className={`group relative shrink-0 ${canEditAgency ? 'cursor-pointer' : 'cursor-default opacity-80'}`}
                                            disabled={!canEditAgency}
                                        >
                                            {localAgency.avatarUrl ? (
                                                <img
                                                    src={toUploadUrl(localAgency.avatarUrl)}
                                                    alt=""
                                                    className="h-28 w-28 rounded-full border border-gray-200 bg-gray-100 object-cover shadow-sm ring-4 ring-white dark:border-gray-600 dark:bg-gray-800 dark:ring-gray-800"
                                                />
                                            ) : (
                                                <div className="flex h-28 w-28 items-center justify-center rounded-full border border-gray-200 bg-indigo-600 text-2xl font-bold text-white shadow-sm ring-4 ring-white dark:border-gray-600 dark:ring-gray-800">
                                                    {getInitials(localAgency.name)}
                                                </div>
                                            )}
                                            {canEditAgency && (
                                                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                                                    <UploadCloudIcon className="h-7 w-7 text-white" />
                                                </div>
                                            )}
                                        </button>
                                    )}
                                </div>

                                <div className="min-w-0">
                                    {/* Bloco 1 — Informações principais */}
                                    <section>
                                        <h4 className="mb-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                                            {t('agency_main_info')}
                                        </h4>
                                        <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <BuildingIcon className={ICON_STYLE} />
                                                <GhostInput
                                                    value={localAgency.name}
                                                    onChange={(v) => setLocalAgency((prev) => ({ ...prev, name: v }))}
                                                    placeholder={t('agency_name')}
                                                    disabled={!canEditAgency}
                                                    disabledHint={noEditTip}
                                                    className="min-w-0 flex-1 text-base font-medium text-gray-900 dark:text-white"
                                                />
                                            </div>
                                            <div className="flex min-w-0 items-center gap-2">
                                                <FileTextIcon className={`${ICON_STYLE} text-gray-400`} />
                                                <GhostInput
                                                    value={localAgency.cnpj || ''}
                                                    onChange={(v) => setLocalAgency((prev) => ({ ...prev, cnpj: v }))}
                                                    placeholder={t('cnpj')}
                                                    mask="cnpj"
                                                    disabled={!canEditAgency}
                                                    disabledHint={noEditTip}
                                                    className="min-w-0 flex-1 text-sm text-gray-600 dark:text-gray-400"
                                                />
                                            </div>
                                            <div className="flex min-w-0 items-center gap-2">
                                                <AtSignIcon className={ICON_STYLE} />
                                                <div className="min-w-0 flex-1">
                                                    <GhostInput
                                                        type="email"
                                                        value={localAgency.contactEmail || ''}
                                                        onChange={(v) => {
                                                            setAgencyErrors((e) => ({ ...e, email: undefined }));
                                                            setLocalAgency((prev) => ({ ...prev, contactEmail: v }));
                                                        }}
                                                        placeholder={t('contact_email')}
                                                        disabled={!canEditAgency}
                                                        disabledHint={noEditTip}
                                                        className="w-full"
                                                    />
                                                    {agencyErrors.email && (
                                                        <p className="mt-1 text-xs text-red-500">{agencyErrors.email}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div
                                                className={`flex min-w-0 items-center gap-2 ${!canEditAgency ? 'pointer-events-none opacity-80' : ''}`}
                                            >
                                                <CreditCardIcon className={ICON_STYLE} />
                                                <InlineCurrencyField
                                                    value={localAgency.baseCurrency}
                                                    onChange={(c) => setLocalAgency((prev) => ({ ...prev, baseCurrency: c }))}
                                                    disabled={!canEditAgency}
                                                    disabledHint={noEditTip}
                                                    menuTitle={t('agency_system_default_currency')}
                                                    options={[
                                                        { value: 'BRL', label: t('currency_display_brl') },
                                                        { value: 'USD', label: t('currency_display_usd') },
                                                        { value: 'EUR', label: t('currency_display_eur') },
                                                    ]}
                                                />
                                            </div>
                                            {noEditTip ? (
                                                <TooltipHint label={noEditTip} className="block w-full min-w-0 sm:col-span-2">
                                                    <div
                                                        className={`flex min-w-0 items-center gap-2 ${!canEditAgency ? 'pointer-events-none opacity-80' : ''}`}
                                                    >
                                                        <WhatsAppIcon className={ICON_STYLE} />
                                                        <PhoneInput
                                                            value={localAgency.whatsapp || ''}
                                                            onChange={(val) => {
                                                                setAgencyErrors((e) => ({ ...e, phone: undefined }));
                                                                setLocalAgency((prev) => ({ ...prev, whatsapp: val }));
                                                            }}
                                                            countryCode={agencyPhoneCountry}
                                                            onCountryChange={(code) => {
                                                                setAgencyPhoneCountry(code);
                                                                setLocalAgency((prev) => ({
                                                                    ...prev,
                                                                    whatsapp: swapDial(prev.whatsapp || '', code),
                                                                }));
                                                            }}
                                                            error={agencyErrors.phone}
                                                            appearance="clean"
                                                            className="min-w-0 w-full flex-1"
                                                            brNumberKind="mobile"
                                                        />
                                                    </div>
                                                </TooltipHint>
                                            ) : (
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <WhatsAppIcon className={ICON_STYLE} />
                                                    <PhoneInput
                                                        value={localAgency.whatsapp || ''}
                                                        onChange={(val) => {
                                                            setAgencyErrors((e) => ({ ...e, phone: undefined }));
                                                            setLocalAgency((prev) => ({ ...prev, whatsapp: val }));
                                                        }}
                                                        countryCode={agencyPhoneCountry}
                                                        onCountryChange={(code) => {
                                                            setAgencyPhoneCountry(code);
                                                            setLocalAgency((prev) => ({
                                                                ...prev,
                                                                whatsapp: swapDial(prev.whatsapp || '', code),
                                                            }));
                                                        }}
                                                        error={agencyErrors.phone}
                                                        appearance="clean"
                                                        className="min-w-0 w-full flex-1"
                                                        brNumberKind="mobile"
                                                    />
                                                </div>
                                            )}
                                            {noEditTip ? (
                                                <TooltipHint label={noEditTip} className="block w-full min-w-0 sm:col-span-2">
                                                    <div
                                                        className={`flex min-w-0 items-center gap-2 ${!canEditAgency ? 'pointer-events-none opacity-80' : ''}`}
                                                    >
                                                        <PhoneIcon className={ICON_STYLE} />
                                                        <PhoneInput
                                                            value={localAgency.landlinePhone || ''}
                                                            onChange={(val) => {
                                                                setAgencyErrors((e) => ({ ...e, landline: undefined }));
                                                                setLocalAgency((prev) => ({ ...prev, landlinePhone: val }));
                                                            }}
                                                            countryCode={agencyLandlineCountry}
                                                            onCountryChange={(code) => {
                                                                setAgencyLandlineCountry(code);
                                                                setLocalAgency((prev) => ({
                                                                    ...prev,
                                                                    landlinePhone: swapDial(prev.landlinePhone || '', code),
                                                                }));
                                                            }}
                                                            error={agencyErrors.landline}
                                                            appearance="clean"
                                                            className="min-w-0 w-full flex-1"
                                                            placeholder={t('landline_phone')}
                                                            brNumberKind="landline"
                                                        />
                                                    </div>
                                                </TooltipHint>
                                            ) : (
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <PhoneIcon className={ICON_STYLE} />
                                                    <PhoneInput
                                                        value={localAgency.landlinePhone || ''}
                                                        onChange={(val) => {
                                                            setAgencyErrors((e) => ({ ...e, landline: undefined }));
                                                            setLocalAgency((prev) => ({ ...prev, landlinePhone: val }));
                                                        }}
                                                        countryCode={agencyLandlineCountry}
                                                        onCountryChange={(code) => {
                                                            setAgencyLandlineCountry(code);
                                                            setLocalAgency((prev) => ({
                                                                ...prev,
                                                                landlinePhone: swapDial(prev.landlinePhone || '', code),
                                                            }));
                                                        }}
                                                        error={agencyErrors.landline}
                                                        appearance="clean"
                                                        className="min-w-0 w-full flex-1"
                                                        placeholder={t('landline_phone')}
                                                        brNumberKind="landline"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    {/* Bloco 2 — Endereço */}
                                    <section className="mt-10 border-t border-gray-200 pt-8 dark:border-gray-700">
                                        <h4 className="mb-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                                            {t('address')}
                                        </h4>
                                        {(() => {
                                            const addressGrid = (
                                                <div
                                                    className={`grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 ${!canEditAgency ? 'pointer-events-none opacity-50' : ''}`}
                                                >
                                            <div className="flex min-w-0 flex-col gap-1">
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <FileTextIcon className={ICON_STYLE} />
                                                    <CepGhostInput
                                                        value={localAgency.address?.zipCode || ''}
                                                        onChange={(v) => handleAgencyAddressChange('zipCode', v)}
                                                        address={localAgency.address || {}}
                                                        onMergeAddressFields={(patch) =>
                                                            setLocalAgency((prev) => ({
                                                                ...prev,
                                                                address: { ...prev.address, ...patch },
                                                            }))
                                                        }
                                                        disabled={!canEditAgency}
                                                        disabledHint={noEditTip}
                                                        placeholder="00000-000"
                                                        t={t}
                                                        className="min-w-0 flex-1"
                                                        onBlockingHintChange={canEditAgency ? setCepBlocksSave : undefined}
                                                    />
                                                </div>
                                                {agencyErrors.zipCode && (
                                                    <p className="ml-7 text-xs text-red-600 dark:text-red-400">
                                                        {agencyErrors.zipCode}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex min-w-0 items-center gap-2">
                                                <MapPinIcon className={ICON_STYLE} />
                                                <GhostInput
                                                    value={localAgency.address?.street || ''}
                                                    onChange={(v) => handleAgencyAddressChange('street', v)}
                                                    placeholder={t('street')}
                                                    disabled={!canEditAgency}
                                                    disabledHint={noEditTip}
                                                    className="min-w-0 flex-1"
                                                />
                                            </div>
                                            <div className="flex min-w-0 items-center gap-2">
                                                <BuildingIcon className={ICON_STYLE} />
                                                <GhostInput
                                                    value={localAgency.address?.number || ''}
                                                    onChange={(v) => handleAgencyAddressChange('number', v)}
                                                    placeholder={t('number')}
                                                    disabled={!canEditAgency}
                                                    disabledHint={noEditTip}
                                                    className="min-w-0 flex-1 max-w-[90px]"
                                                />
                                            </div>
                                            <div className="flex min-w-0 items-center gap-2">
                                                <PlusIcon className={ICON_STYLE} />
                                                <GhostInput
                                                    value={localAgency.address?.complement || ''}
                                                    onChange={(v) => handleAgencyAddressChange('complement', v)}
                                                    placeholder={t('complement')}
                                                    disabled={!canEditAgency}
                                                    disabledHint={noEditTip}
                                                    className="min-w-0 flex-1"
                                                />
                                            </div>
                                            <div className="flex min-w-0 items-center gap-2">
                                                <BuildingIcon className={ICON_STYLE} />
                                                <GhostInput
                                                    value={localAgency.address?.neighborhood || ''}
                                                    onChange={(v) => handleAgencyAddressChange('neighborhood', v)}
                                                    placeholder={t('neighborhood')}
                                                    disabled={!canEditAgency}
                                                    disabledHint={noEditTip}
                                                    className="min-w-0 flex-1"
                                                />
                                            </div>
                                            <div className="flex min-w-0 items-center gap-2">
                                                <HomeIcon className={ICON_STYLE} />
                                                <GhostInput
                                                    value={localAgency.address?.city || ''}
                                                    onChange={(v) => handleAgencyAddressChange('city', v)}
                                                    placeholder={t('city')}
                                                    disabled={!canEditAgency}
                                                    disabledHint={noEditTip}
                                                    className="min-w-0 flex-1"
                                                />
                                            </div>
                                            <div className="flex min-w-0 items-center gap-2">
                                                <GlobeIcon className={ICON_STYLE} />
                                                <GhostInput
                                                    value={localAgency.address?.country || ''}
                                                    onChange={(v) => handleAgencyAddressChange('country', v)}
                                                    placeholder={t('country')}
                                                    disabled={!canEditAgency}
                                                    disabledHint={noEditTip}
                                                    className="min-w-0 flex-1"
                                                />
                                            </div>
                                            <div className="flex min-w-0 items-center gap-2">
                                                <MapPinIcon className={ICON_STYLE} />
                                                <GhostInput
                                                    value={localAgency.address?.state || ''}
                                                    onChange={(v) => handleAgencyAddressChange('state', v)}
                                                    placeholder={t('state')}
                                                    disabled={!canEditAgency}
                                                    disabledHint={noEditTip}
                                                    className="min-w-0 flex-1 max-w-[90px]"
                                                />
                                            </div>
                                                </div>
                                            );
                                            return noEditTip ? (
                                                <TooltipHint label={noEditTip} className="block w-full min-w-0">
                                                    {addressGrid}
                                                </TooltipHint>
                                            ) : (
                                                addressGrid
                                            );
                                        })()}
                                    </section>

                                    {/* Bloco 3 — Redes sociais */}
                                    <section className="mt-10 border-t border-gray-200 pt-8 dark:border-gray-700">
                                        <h4 className="mb-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                                            {t('social_media_and_site')}
                                        </h4>
                                        <AgencySocialLinksEditor
                                            links={localAgency.socialLinks || []}
                                            onChange={(next) => setLocalAgency((prev) => ({ ...prev, socialLinks: next }))}
                                            disabled={!canEditAgency}
                                            disabledTitle={noEditTip}
                                            t={t}
                                        />
                                    </section>
                                </div>
                            </div>
                        </AccountSectionCard>
                            
                            {/* Danger zone - Encerrar conta */}
                            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Encerrar conta</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                                    Ao encerrar sua conta, o acesso ao Flow Social Media será bloqueado imediatamente. Dados básicos podem ser mantidos por tempo limitado para fins legais e de segurança.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setShowDelete(true)}
                                    className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
                                >
                                    Excluir minha conta
                                </button>
                            </div>
                    </div>
                 )}

                 {activeTab === 'team' && showAccountTeamTab && (
                     <div>
                         <h2 className="mb-1 text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
                             {t('team_management')}
                         </h2>
                         <TeamSettings onEditProfile={() => handleTabChange('details')} />
                     </div>
                 )}

                 {activeTab === 'history' && showAccountHistoryTab && (
                     <ActivityHistory />
                 )}

                 {activeTab === 'billing' && showAccountBillingTab && (
                     <div>
                         <h2 className="mb-6 text-base font-semibold tracking-tight text-gray-900 dark:text-white">
                             {t('plans_billing')}
                         </h2>
                         <BillingPage embedded />
                     </div>
                 )}
            </main>

            {activeTab === 'details' && (isDirty || saveBarFeedback) && (
                <UnsavedChangesBar
                    onCancel={flushDetailsDiscard}
                    onSave={runSaveDetails}
                    requestConfirmation={requestBarConfirmation}
                    feedback={saveBarFeedback}
                    onFeedbackDismiss={() => setSaveBarFeedback(null)}
                />
            )}

             {isUploadModalOpen && (
                <Suspense fallback={null}>
                    <ClientsUploadModal
                        onClose={() => {
                            setIsUploadModalOpen(false);
                            setAccountUploadError(null);
                        }}
                        onFileSelect={(f) => void handleAccountUploadFile(f)}
                        isLoading={accountUploadLoading}
                        uploadError={accountUploadError}
                        onValidationError={(msg) => setAccountUploadError(msg ?? null)}
                        uploadTarget="persona_photo"
                    />
                </Suspense>
            )}
                </div>
        </div>
        </div>
        
        {/* Modal de confirmação - Encerrar conta */}
        {showDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Tem certeza que deseja encerrar sua conta?</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                        Essa ação não poderá ser desfeita. Para confirmar, digite o nome da sua agência abaixo.
                    </p>
                    <input
                        value={confirmAgency}
                        onChange={(e) => setConfirmAgency(e.target.value)}
                        placeholder="Digite exatamente o nome da sua agência"
                        className="w-full px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            onClick={() => { setShowDelete(false); setConfirmAgency(''); }}
                            className="px-4 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:underline"
                        >
                            Cancelar
                        </button>
                        <button
                            disabled={confirmAgency.trim() !== (agencyProfile?.name ?? '').trim()}
                            onClick={async () => {
                                try {
                                    await apiDelete('/auth/account');
                                    authStorage.clearTokens();
                                    window.location.href = '/';
                                } catch {
                                    notify?.(t('account_close_failed'));
                                }
                            }}
                            className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold"
                        >
                            Confirmar exclusão
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

export default AccountSettingsPage;
