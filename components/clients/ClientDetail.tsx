import React, { useState, useContext, useRef, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { AppContext } from '../../contexts/AppContext';
import type {
	Client,
	SocialPlatform,
	SocialLink,
	AccessCredential,
	BrandAsset,
	Service,
	FinancialEntry,
	ActivityHistoryClientSectionV2,
} from '../../types';
import { apiUpload, toUploadUrl } from '../../lib/api';
import { getTaskDisplayDate } from '../../lib/utils';
import { ClientPresentationView, type TabId } from '../ClientPresentationView';
const UploadModal = lazy(() => import('./UploadModal').then((m) => ({ default: m.UploadModal })));
import { UnsavedChangesBar } from './UnsavedChangesBar';
import { ClientDataForms } from './ClientDataForms';
import { ContractServicesManager } from './ContractServicesManager';
import { AccessCredentialModal } from './AccessCredentialModal';
import { urlTemplates, extractUsernameFromUrl, socialIcons, buildSocialUrlFromInput, normalizeWebsiteUrl } from './socialHelpers';
import { defaultClientOwnerPreferences } from '../../lib/client-owner-preferences';
import { stableStringify } from '../../lib/utils/stableStringify';
import { useGoogleFont } from './useGoogleFont';
const BrandGuideSectionEditor = lazy(() => import('./sectionEditors/BrandGuideSectionEditor').then((m) => ({ default: m.BrandGuideSectionEditor })));
const BriefingV2StrategyEditor = lazy(() => import('./briefing/BriefingV2StrategyEditor').then((m) => ({ default: m.BriefingV2StrategyEditor })));
import { STRATEGY_DEFAULT_EXPANDED } from './sectionEditors/strategySectionConstants';
import { BRAND_GUIDE_DEFAULT_EXPANDED } from './sectionEditors/brandGuideSectionConstants';
import { CLIENT_DATA_DEFAULT_EXPANDED } from './sectionEditors/clientDataSectionConstants';
import { PLANNING_DEFAULT_EXPANDED } from './sectionEditors/planningSectionConstants';
const PlanningSectionEditor = lazy(() => import('./sectionEditors/PlanningSectionEditor').then((m) => ({ default: m.PlanningSectionEditor })));
const OverviewSection = lazy(() => import('./sectionEditors/OverviewSection').then((m) => ({ default: m.OverviewSection })));

const SectionEditorFallback = () => <div className="py-8 text-center text-sm text-gray-500">Carregando...</div>;

class OverviewErrorBoundary extends React.Component<{ children: React.ReactNode; fallback: React.ReactNode }, { hasError: boolean }> {
    state = { hasError: false };
    static getDerivedStateFromError = () => ({ hasError: true });
    componentDidCatch(error: Error) {
        console.error('[OverviewErrorBoundary]', error);
    }
    render() {
        return this.state.hasError ? this.props.fallback : this.props.children;
    }
}

// --- ClientDetail Main Component ---
const ClientDetail: React.FC<{
    client: Client;
    onBack: () => void;
    onSave: (
        client: Client,
        options?: {
            contractChanged?: boolean;
            activityClientSection?: ActivityHistoryClientSectionV2;
            onBarFeedback?: (msg: string, type: 'success' | 'error') => void;
        },
    ) => Promise<Client | null>;
    onDelete: (clientId: string) => void;
    isPresentationRoute?: boolean;
    onNavigateToPresentation?: () => void;
}> = ({ client, onBack, onSave, onDelete, isPresentationRoute = false, onNavigateToPresentation }) => {
    const context = useContext(AppContext);
    if (!context) return null;
    const { t, language, registerDirtyForm, showConfirmation, financialEntries, tasks, workflows, clientWorkflowId, generalWorkflowId, canEditModule, agencyProfile } = context;
    const canEditClients = canEditModule('clients');
    const canEditContracts = canEditModule('contracts');
    type EditingLock = null | 'tab:client_data' | 'tab:brand_guide' | 'tab:strategy' | 'tab:contract' | 'tab:finance';
    const [editingLock, setEditingLock] = useState<EditingLock>(null);
    const [editingSectionId, setEditingSectionId] = useState<TabId | null>(null);
    const [strategyExpandedSections, setStrategyExpandedSections] = useState<Record<string, boolean>>(() => ({ ...STRATEGY_DEFAULT_EXPANDED }));
    const [brandGuideExpandedSections, setBrandGuideExpandedSections] = useState<Record<string, boolean>>(() => ({ ...BRAND_GUIDE_DEFAULT_EXPANDED }));
    const [clientDataExpandedSections, setClientDataExpandedSections] = useState<Record<string, boolean>>(() => ({ ...CLIENT_DATA_DEFAULT_EXPANDED }));
    const [planningExpandedSections, setPlanningExpandedSections] = useState<Record<string, boolean>>(() => ({ ...PLANNING_DEFAULT_EXPANDED }));
    const [editedClient, setEditedClient] = useState<Client>(client);
    const lastSyncedClientIdRef = useRef<string | null>(null);
    const [copiedHex, setCopiedHex] = useState<string | null>(null);
    const [passwordVisibility, setPasswordVisibility] = useState<Record<string, boolean>>({});
    const [socialPlatformDropdownIndex, setSocialPlatformDropdownIndex] = useState<number | null>(null);
    const [pendingSocialUrl, setPendingSocialUrl] = useState('');
    const [pendingPassword, setPendingPassword] = useState('');
    const [pendingPlatform, setPendingPlatform] = useState<SocialPlatform | ''>('');
    const socialPlatformDropdownRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (socialPlatformDropdownIndex === null) return;
        const onDocClick = (e: MouseEvent) => {
            if (socialPlatformDropdownRef.current && !socialPlatformDropdownRef.current.contains(e.target as Node)) setSocialPlatformDropdownIndex(null);
        };
        document.addEventListener('click', onDocClick);
        return () => document.removeEventListener('click', onDocClick);
    }, [socialPlatformDropdownIndex]);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadTarget, setUploadTarget] = useState<'avatar' | 'logo' | 'contract' | 'photo' | 'graphic' | 'icon' | 'persona_photo'>('avatar');
    const [personaPhotoUploadIndex, setPersonaPhotoUploadIndex] = useState<number | null>(null);
    const [initialUploadFile, setInitialUploadFile] = useState<File | null>(null);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
    const [isContractFormDirty, setIsContractFormDirty] = useState(false);
    const [forceCloseEditToken, setForceCloseEditToken] = useState(0);
    const [accessCredentialModalOpen, setAccessCredentialModalOpen] = useState(false);
    const [accessCredentialFormState, setAccessCredentialFormState] = useState<Partial<AccessCredential> | null>(null);
    const [saveBarMessage, setSaveBarMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const contractServiceActionsRef = useRef<{ save: () => Service[] | null; cancel: () => void } | null>(null);
    const onRegisterContractActions = useCallback((actions: { save: () => Service[] | null; cancel: () => void } | null) => {
        contractServiceActionsRef.current = actions;
    }, []);

    const CONTEXT_PANEL_STORAGE = 'flow.clientContextPanel.expanded';
    const getPanelStored = useCallback((id: string) => {
        try {
            const v = localStorage.getItem(`${CONTEXT_PANEL_STORAGE}.${id}`);
            return v === null ? null : v === 'true';
        } catch { return null; }
    }, []);
    const setPanelStored = useCallback((id: string, value: boolean) => {
        try { localStorage.setItem(`${CONTEXT_PANEL_STORAGE}.${id}`, String(value)); } catch {}
    }, []);

    const [isLg, setIsLg] = useState(typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true);
    useEffect(() => {
        const m = window.matchMedia('(min-width: 1024px)');
        setIsLg(m.matches);
        const f = () => setIsLg(m.matches);
        m.addEventListener('change', f);
        return () => m.removeEventListener('change', f);
    }, []);

    const [panelExpanded, setPanelExpandedState] = useState(() => {
        const stored = getPanelStored(client.id);
        if (stored !== null) return stored;
        if (typeof window !== 'undefined' && window.innerWidth < 1024) return false;
        return true;
    });
    useEffect(() => {
        const stored = getPanelStored(client.id);
        if (stored !== null) setPanelExpandedState(stored);
        else setPanelExpandedState(isLg);
    }, [client.id, getPanelStored, isLg]);

    const setPanelExpanded = useCallback((value: boolean) => {
        setPanelExpandedState(value);
        setPanelStored(client.id, value);
    }, [client.id, setPanelStored]);

    useGoogleFont(editedClient.typography?.primaryFont);
    useGoogleFont(editedClient.typography?.secondaryFont);

    useEffect(() => {
        if (client.id !== lastSyncedClientIdRef.current) {
            setEditingLock(null);
            setIsContractFormDirty(false);
            setStrategyExpandedSections({ ...STRATEGY_DEFAULT_EXPANDED });
            setBrandGuideExpandedSections({ ...BRAND_GUIDE_DEFAULT_EXPANDED });
            setClientDataExpandedSections({ ...CLIENT_DATA_DEFAULT_EXPANDED });
            setPlanningExpandedSections({ ...PLANNING_DEFAULT_EXPANDED });
        }
    }, [client.id]);

    useEffect(() => {
        const clientIdChanged = client.id !== lastSyncedClientIdRef.current;
        if (!clientIdChanged && (editingLock || isContractFormDirty)) return;

        const synced: Client = {
            ...client,
            contract: {
                ...(client.contract ?? {}),
                services: Array.isArray(client.contract?.services) ? client.contract.services : [],
            },
        };
        setEditedClient(synced);
        lastSyncedClientIdRef.current = client.id;
    }, [client, editingLock, isContractFormDirty]);

    const isDirty = useMemo(() => {
        /** Retorna true se todos os campos do bloco "Dados da Empresa" estão vazios. Usado para ignorar o toggle do checkbox quando não há dados. */
        const isCompanyDataEmpty = (c: Client): boolean => {
            const t = (s: string | undefined) => (s ?? '').trim();
            if (t(c.companyName)) return false;
            if (t(c.cnpj)) return false;
            if (t(c.companyStateRegistration)) return false;
            if (t(c.companyLandlinePhone)) return false;
            if (t(c.companyPhone)) return false;
            const addr = c.address ?? {};
            const addrVals = [addr.street, addr.number, addr.complement, addr.neighborhood, addr.city, addr.state, addr.zipCode, addr.country];
            if (addrVals.some((v) => t(v))) return false;
            const contacts = c.contacts ?? [];
            if (contacts.some((ct) => t(ct.name) || t(ct.role) || t(ct.email) || t(ct.whatsapp) || t(ct.notes))) return false;
            if (c.clientType === 'company') {
                const ln = t(c.legalRepresentativeName);
                const n = t(c.name);
                if (ln && ln !== n) return false;
            }
            return true;
        };

        const pickEditableFields = (c: Client) => ({
            name: c.name ?? '',
            color: c.color ?? '',
            avatarUrl: c.avatarUrl ?? '',
            currency: c.currency ?? 'BRL',
            clientType: c.clientType ?? 'individual',
            website: c.website ?? '',
            companyName: c.companyName ?? '',
            cnpj: c.cnpj ?? '',
            companyStateRegistration: c.companyStateRegistration ?? '',
            companyLandlinePhone: c.companyLandlinePhone ?? '',
            companyPhone: c.companyPhone ?? '',
            cpf: c.cpf ?? '',
            legalRepresentativeName: c.legalRepresentativeName ?? '',
            legalRepresentativeRg: c.legalRepresentativeRg ?? '',
            legalRepresentativeEmail: c.legalRepresentativeEmail ?? '',
            legalRepresentativeWhatsapp: c.legalRepresentativeWhatsapp ?? '',
            legalRepresentativeRole: c.legalRepresentativeRole ?? '',
            legalRepresentativeBirthDate: c.legalRepresentativeBirthDate ?? '',
            isLegalAddressSameAsCompany: c.isLegalAddressSameAsCompany ?? false,
            address: c.address ?? {},
            legalRepresentativeAddress: c.legalRepresentativeAddress ?? {},
            contacts: (c.contacts ?? []).map(ct => ({
                id: ct.id, name: ct.name ?? '', role: ct.role ?? '',
                email: ct.email ?? '', whatsapp: ct.whatsapp ?? '',
                landlinePhone: ct.landlinePhone ?? '', notes: ct.notes ?? '',
                isPrimary: ct.isPrimary ?? false,
            })).sort((a, b) => String(a.id).localeCompare(String(b.id))),
            socialLinks: c.socialLinks ?? [],
            accessCredentials: (c.accessCredentials ?? []).map(ac => ({ platform: ac.platform, username: ac.username ?? '', password: ac.password ?? '' })),
            brandColors: (c.brandColors ?? []).slice(),
            headerColorIndex: c.headerColorIndex ?? null,
            principalLogoIndex: c.principalLogoIndex ?? null,
            typography: c.typography ?? {},
            brandAssets: (c.brandAssets ?? []).sort((a, b) => String(a.id).localeCompare(String(b.id))),
            toneOfVoice: c.toneOfVoice ?? '',
            brandGuidelines: c.brandGuidelines ?? '',
            brandHistory: c.brandHistory ?? '',
            brandValues: c.brandValues ?? '',
            brandMission: c.brandMission ?? '',
            brandVision: c.brandVision ?? '',
            strategyCompetitors: (c.strategyCompetitors ?? []).map(x => ({ id: x.id, name: x.name, link: x.link, strengths: x.strengths, weaknesses: x.weaknesses, notes: x.notes })),
            strategyInspirations: (c.strategyInspirations ?? []).map(x => ({ id: x.id, name: x.name, link: x.link, whatInspires: x.whatInspires, notes: x.notes })),
            audienceAgeRange: c.audienceAgeRange ?? '',
            audienceRegion: c.audienceRegion ?? '',
            audienceGeneralProfile: c.audienceGeneralProfile ?? '',
            audienceGeneralNotes: c.audienceGeneralNotes ?? '',
            strategyPersonas: (c.strategyPersonas ?? []).map(x => ({ id: x.id, name: x.name, description: x.description, pains: x.pains, desires: x.desires, objections: x.objections, behavior: x.behavior, photoUrl: x.photoUrl })),
            targetAudience: c.targetAudience ?? '',
            audienceWho: c.audienceWho ?? '',
            audiencePains: c.audiencePains ?? '',
            audienceDesires: c.audienceDesires ?? '',
            objectives: c.objectives ?? '',
            kpis: c.kpis ?? '',
            strategyNotes: c.strategyNotes ?? '',
            businessSummary: c.businessSummary ?? '',
            mainServices: c.mainServices ?? '',
            differentiators: c.differentiators ?? '',
            competitors: c.competitors ?? '',
            howWantToBePerceived: c.howWantToBePerceived ?? '',
            avoidInCommunication: c.avoidInCommunication ?? '',
            commonObjections: c.commonObjections ?? '',
            wordsThatFit: c.wordsThatFit ?? '',
            wordsThatDontFit: c.wordsThatDontFit ?? '',
            contentStyle: c.contentStyle ?? '',
            preferredCta: c.preferredCta ?? '',
            mainProfileObjective: c.mainProfileObjective ?? '',
            momentObjective: c.momentObjective ?? '',
            monthlyObjective: c.monthlyObjective ?? '',
            postFrequency: c.postFrequency ?? '',
            postFrequencyQuantity: c.postFrequencyQuantity,
            postFrequencyPeriod: c.postFrequencyPeriod,
            postFrequencyVariable: c.postFrequencyVariable ?? false,
            preferredPostDays: (c.preferredPostDays ?? []).slice().sort(),
            planningCalendarNotes: c.planningCalendarNotes ?? '',
            planningAvgPostsPerWeek: c.planningAvgPostsPerWeek ?? '',
            planningProductionLeadDays: c.planningProductionLeadDays ?? '',
            planningApprovalLeadDays: c.planningApprovalLeadDays ?? '',
            planningSchedulingLeadDays: c.planningSchedulingLeadDays ?? '',
            planningApprovalRequired: c.planningApprovalRequired ?? false,
            planningPeriodFocus: c.planningPeriodFocus ?? '',
            planningPerformanceNotes: c.planningPerformanceNotes ?? '',
            planningAccountOwner: c.planningAccountOwner ?? '',
            planningApprovalChannel: c.planningApprovalChannel ?? '',
            planningClientResponseTime: c.planningClientResponseTime ?? '',
            planningOperationNotes: c.planningOperationNotes ?? '',
            strategyContentPillars: (c.strategyContentPillars ?? []).map(p => ({ id: p.id, name: p.name, description: p.description, objective: p.objective, exampleThemes: p.exampleThemes })),
            strategyLastUpdated: c.strategyLastUpdated ?? '',
            dos: (c.dos ?? []).slice().sort(),
            donts: (c.donts ?? []).slice().sort(),
            ownerPreferences: stableStringify(c.ownerPreferences ?? defaultClientOwnerPreferences()),
            contract: {
                ...(c.contract ?? {}),
                services: Array.isArray(c.contract?.services) ? c.contract.services : [],
            },
        });

        /** Normaliza para comparação: se clientType=company e dados da empresa vazios, trata como individual (toggle sem preenchimento). */
        const normalizeForCompanyToggleComparison = (c: Client, picked: object): object => {
            if (c.clientType !== 'company' || !isCompanyDataEmpty(c)) return picked;
            return { ...picked, clientType: 'individual', legalRepresentativeName: '' };
        };

        const editedPicked = pickEditableFields(editedClient);
        const clientPicked = pickEditableFields(client);
        const editedStr = JSON.stringify(editedPicked);
        const clientStr = JSON.stringify(clientPicked);
        let baseDirty = editedStr !== clientStr;

        if (baseDirty) {
            const editedNorm = normalizeForCompanyToggleComparison(editedClient, editedPicked);
            const clientNorm = normalizeForCompanyToggleComparison(client, clientPicked);
            if (JSON.stringify(editedNorm) === JSON.stringify(clientNorm)) baseDirty = false;
        }

        const pendingDirty = !!(pendingPlatform || (pendingSocialUrl?.trim()) || (pendingPassword?.trim()));
        return baseDirty || pendingDirty;
    }, [editedClient, client, pendingPlatform, pendingSocialUrl, pendingPassword]);
    const isAnythingDirty = isDirty || isContractFormDirty;

    useEffect(() => {
        if (isDirty || isContractFormDirty) setSaveBarMessage(null);
    }, [isDirty, isContractFormDirty]);

    const handleSave = useCallback(async () => {
        let clientToSave = editedClient;
        let contractWasUpdated = isContractFormDirty;

        if (contractServiceActionsRef.current) {
            const updatedServices = contractServiceActionsRef.current.save();
            if (updatedServices === null) return;
            clientToSave = { ...editedClient, contract: { ...editedClient.contract, services: updatedServices } };
            contractWasUpdated = true;
        }

        const baseServices = client.contract?.services ?? [];
        const toSaveServices = clientToSave.contract?.services ?? [];
        if (!contractWasUpdated && (baseServices.length !== toSaveServices.length || JSON.stringify(baseServices.map(s => s.id)) !== JSON.stringify(toSaveServices.map(s => s.id)))) {
            contractWasUpdated = true;
        }

        if (pendingPlatform && (pendingSocialUrl?.trim() || pendingPassword?.trim())) {
            let fullUrl = buildSocialUrlFromInput(pendingSocialUrl?.trim() || '', pendingPlatform);
            if (pendingPlatform === 'website' || pendingPlatform === 'email') fullUrl = normalizeWebsiteUrl(fullUrl);
            if (fullUrl) {
                const existingLinks = clientToSave.socialLinks || [];
                const existingCreds = clientToSave.accessCredentials || [];
                const credId = `cred-${Date.now()}`;
                const username = (pendingPlatform === 'website' || pendingPlatform === 'email') ? fullUrl : extractUsernameFromUrl(pendingPlatform, fullUrl);
                clientToSave = {
                    ...clientToSave,
                    socialLinks: [...existingLinks.filter(l => l.platform !== pendingPlatform), { platform: pendingPlatform, url: fullUrl }],
                    accessCredentials: [...existingCreds.filter(c => c.platform !== pendingPlatform), { id: credId, platform: pendingPlatform, username, password: pendingPassword || undefined, displayName: undefined }],
                };
                setPendingPlatform('');
                setPendingSocialUrl('');
                setPendingPassword('');
            }
        }

        let activityClientSection: ActivityHistoryClientSectionV2 | undefined;
        if (editingSectionId) {
            activityClientSection = editingSectionId as ActivityHistoryClientSectionV2;
        } else if (editingLock === 'tab:client_data') {
            activityClientSection = 'client_data';
        } else if (editingLock === 'tab:brand_guide') {
            activityClientSection = 'brand_guide';
        } else if (editingLock === 'tab:strategy') {
            activityClientSection = 'strategy';
        } else if (editingLock === 'tab:contract') {
            activityClientSection = 'contract';
        } else if (editingLock === 'tab:finance') {
            activityClientSection = 'finance';
        }

        const savedClient = await onSave(clientToSave, {
            contractChanged: contractWasUpdated,
            activityClientSection,
            onBarFeedback: (msg, type) => setSaveBarMessage({ text: msg, type }),
        });
        if (savedClient) {
            setEditedClient(savedClient);
            setIsContractFormDirty(false);
            setEditingLock(null);
            setPendingPlatform('');
            setPendingSocialUrl('');
            setPendingPassword('');
        }
    }, [editedClient, client, onSave, isContractFormDirty, pendingPlatform, pendingSocialUrl, pendingPassword]);

    const handleCancel = useCallback(() => {
        if (contractServiceActionsRef.current) {
            contractServiceActionsRef.current.cancel();
        }
        setEditedClient(client);
        setIsContractFormDirty(false);
        setEditingLock(null);
        setPendingSocialUrl('');
        setPendingPassword('');
        setPendingPlatform('');
    }, [client]);

    useEffect(() => {
        registerDirtyForm(isAnythingDirty, handleSave, handleCancel);
        return () => {
            registerDirtyForm(false);
        };
    }, [isAnythingDirty, registerDirtyForm, handleSave, handleCancel]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isAnythingDirty) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isAnythingDirty]);

    const requestConfirmation = useCallback((onDiscard: () => void) => {
        showConfirmation({
            title: t('confirm_discard_changes_title'),
            message: t('confirm_discard_changes'),
            confirmText: t('continue_editing'),
            cancelText: t('discard'),
            onConfirm: () => {},
            onCancel: onDiscard,
        });
    }, [showConfirmation, t]);

    const requestNavigationWithSaveOption = useCallback((action: () => void) => {
        if (!isAnythingDirty) {
            action();
            return;
        }
        showConfirmation({
            title: t('confirm_unsaved_leave_title'),
            message: t('confirm_unsaved_leave'),
            confirmText: t('save'),
            cancelText: t('discard'),
            onConfirm: async () => {
                await handleSave();
                action();
            },
            onCancel: () => {
                handleCancel();
                setEditingLock(null);
                setIsContractFormDirty(false);
                action();
            },
        });
    }, [isAnythingDirty, showConfirmation, t, handleSave, handleCancel]);

    const discardEdits = useCallback(() => {
        handleCancel();
        setEditingLock(null);
        setIsContractFormDirty(false);
        setForceCloseEditToken(tok => tok + 1);
    }, [handleCancel]);

    const requestNavigation = useCallback((action: () => void) => {
        if (!editingLock && !isAnythingDirty) {
            action();
            return;
        }
        requestNavigationWithSaveOption(action);
    }, [editingLock, isAnythingDirty, requestNavigationWithSaveOption]);

    const handleUpdate = (update: Partial<Client>) => {
        setEditedClient(prev => {
            const newClientData = { ...prev, ...update };
            if (update.socialLinks && update.accessCredentials) {
                return newClientData;
            }
            if (update.accessCredentials) {
                const newSocialLinks: SocialLink[] = update.accessCredentials
                    .filter(c => c.username)
                    .map(c => (c.platform === 'website' || c.platform === 'email')
                        ? { platform: c.platform, url: (c.platform === 'website' || c.platform === 'email') ? normalizeWebsiteUrl(c.username) : c.username }
                        : { platform: c.platform, url: (urlTemplates[c.platform] || '').replace('{username}', c.username) || c.username });
                return { ...newClientData, socialLinks: newSocialLinks.filter(l => l.url) };
            }
            if (update.socialLinks) {
                const newAccessCredentials: AccessCredential[] = update.socialLinks.map((l, i) => {
                    const existing = (newClientData.accessCredentials || [])[i];
                    const username = (l.platform === 'website' || l.platform === 'email') ? l.url : extractUsernameFromUrl(l.platform, l.url);
                    return {
                        id: existing?.id || `cred-${Date.now()}-${i}`,
                        platform: l.platform,
                        username,
                        displayName: existing?.displayName,
                    };
                });
                return { ...newClientData, accessCredentials: newAccessCredentials };
            }
            return newClientData;
        });
    };

    const handleCopy = (hex: string) => {
        navigator.clipboard.writeText(hex);
        setCopiedHex(hex);
        setTimeout(() => setCopiedHex(null), 1500);
    };

    const handleFileSelected = async (file: File | Blob) => {
        if (!file || !(file instanceof File || file instanceof Blob) || file.size === 0) {
            setUploadError('Arquivo inválido ou vazio.');
            return;
        }
        const isImage = file.type.startsWith('image/');
        if (!isImage) {
            setUploadError('Selecione uma imagem (JPEG, PNG ou WebP).');
            return;
        }
        setUploadError(null);
        setUploadLoading(true);
        try {
            const { url } = await apiUpload(file);
            const assetName = file instanceof File ? file.name : 'logo.jpg';
            if (uploadTarget === 'persona_photo' && personaPhotoUploadIndex !== null) {
                const personas = [...(editedClient.strategyPersonas ?? [])];
                if (personas[personaPhotoUploadIndex]) {
                    personas[personaPhotoUploadIndex] = { ...personas[personaPhotoUploadIndex], photoUrl: url };
                    handleUpdate({ strategyPersonas: personas });
                }
                setPersonaPhotoUploadIndex(null);
            } else if (uploadTarget === 'avatar') {
                const brandAssets = editedClient.brandAssets || [];
                const newAsset: BrandAsset = { id: `asset-${Date.now()}`, name: assetName, type: 'logo', url };
                const wasFirstLogo = !brandAssets.some((a: BrandAsset) => a.type === 'logo');
                handleUpdate({
                    avatarUrl: url,
                    brandAssets: [...brandAssets, newAsset],
                    ...(wasFirstLogo ? { principalLogoIndex: 0 } : {}),
                });
            } else if (uploadTarget === 'photo' || uploadTarget === 'graphic' || uploadTarget === 'icon') {
                const brandAssets = editedClient.brandAssets || [];
                const newAsset: BrandAsset = { id: `asset-${Date.now()}`, name: assetName, type: uploadTarget, url };
                handleUpdate({ brandAssets: [...brandAssets, newAsset] });
            } else {
                const brandAssets = editedClient.brandAssets || [];
                const newAsset: BrandAsset = { id: `asset-${Date.now()}`, name: assetName, type: 'logo', url };
                const wasFirstLogo = !brandAssets.some((a: BrandAsset) => a.type === 'logo');
                handleUpdate({ brandAssets: [...brandAssets, newAsset], ...(wasFirstLogo ? { principalLogoIndex: 0 } : {}) });
            }
            setIsUploadModalOpen(false);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erro no upload.';
            setUploadError(msg);
        } finally {
            setUploadLoading(false);
        }
    };

    const handleBack = () => {
        requestNavigation(onBack);
    };

    const handleDeleteCredential = (credentialId: string) => {
        showConfirmation({
            title: t('confirm_delete_title'),
            message: t('confirm_generic_delete_message'),
            onConfirm: () => handleUpdate({ accessCredentials: editedClient.accessCredentials?.filter(c => c.id !== credentialId) })
        });
    };

    const openAccessCredentialModal = (cred: AccessCredential | null) => {
        if (cred) {
            setAccessCredentialFormState({ ...cred });
        } else {
            setAccessCredentialFormState({ id: `cred-${Date.now()}`, platform: 'instagram', username: '', displayName: '', password: '', notes: '' });
        }
        setAccessCredentialModalOpen(true);
        setEditingLock('tab:identity');
    };

    const closeAccessCredentialModal = () => {
        setAccessCredentialModalOpen(false);
        setAccessCredentialFormState(null);
        setEditingLock(null);
    };

    const handleAddCredentialClick = () => {
        if (editingLock !== null && editingLock !== 'tab:identity') {
            requestNavigation(() => openAccessCredentialModal(null));
            return;
        }
        openAccessCredentialModal(null);
    };

    const handleSaveAccessCredential = () => {
        if (!accessCredentialFormState || !accessCredentialFormState.platform) return;
        const cred: AccessCredential = {
            id: accessCredentialFormState.id || `cred-${Date.now()}`,
            platform: accessCredentialFormState.platform as SocialPlatform,
            displayName: accessCredentialFormState.displayName || undefined,
            username: accessCredentialFormState.username || '',
            password: accessCredentialFormState.password || undefined,
            notes: accessCredentialFormState.notes || undefined,
        };
        const list = editedClient.accessCredentials || [];
        const exists = list.some(c => c.id === cred.id);
        const next = exists ? list.map(c => c.id === cred.id ? cred : c) : [...list, cred];
        handleUpdate({ accessCredentials: next });
        closeAccessCredentialModal();
    };

    const handleCopyCredentialUsername = (cred: AccessCredential) => {
        const text = cred.username ? (cred.platform === 'email' ? cred.username : `@${cred.username}`) : '';
        if (text) navigator.clipboard.writeText(text);
    };

    const getCredentialProfileUrl = (cred: AccessCredential): string => {
        if (cred.platform === 'email') return cred.username ? `mailto:${cred.username}` : '#';
        if (cred.platform === 'website') return cred.username || '#';
        const template = urlTemplates[cred.platform];
        return template ? template.replace('{username}', cred.username || '') : '#';
    };

    const openEditForSection = useCallback((tabId: TabId) => {
        setEditingSectionId(tabId);
    }, []);

    const closeEditSection = useCallback(() => {
        setEditingSectionId(null);
        setEditingLock(null);
        setForceCloseEditToken(t => t + 1);
    }, []);

    const onEditEndSection = useCallback(() => {
        setEditingLock(null);
        closeEditSection();
    }, [closeEditSection]);

    const quickOverview = useMemo(() => {
        const cid = editedClient?.id;
        if (!cid) return { postsAtivos: 0, aguardandoAprovacao: 0, tarefasPendentes: 0, proximaRenovacao: null as string | null, statusConta: 'em_dia' as const, tarefasAtrasadas: 0, postsAtrasados: 0 };
        const clientTasks = (tasks || []).filter((ta: { clientId?: string }) => ta.clientId === cid);
        const wf = workflows?.[clientWorkflowId || '']?.statuses || [];
        const genWf = workflows?.[generalWorkflowId || '']?.statuses || [];
        const doneIds = new Set([...wf.filter((s: { category?: string }) => s.category === 'done').map((s: { id: string }) => s.id), ...genWf.filter((s: { category?: string }) => s.category === 'done').map((s: { id: string }) => s.id)]);
        const postsAtivos = clientTasks.filter((ta: { workflowId?: string; statusId?: string }) => ta.workflowId === clientWorkflowId && !doneIds.has(ta.statusId)).length;
        const aguardandoAprovacao = clientTasks.filter((ta: { statusId?: string }) => /aprovacao|enviar_aprovacao/i.test(ta.statusId || '')).length;
        const tarefasPendentes = clientTasks.filter((ta: { workflowId?: string; statusId?: string; isGeneral?: boolean }) => {
            const w = ta.isGeneral ? workflows?.[generalWorkflowId || ''] : workflows?.[ta.workflowId || clientWorkflowId || ''];
            const statuses = w?.statuses || [];
            const status = statuses.find((s: { id: string }) => s.id === ta.statusId);
            return status && (status as { category?: string }).category !== 'done';
        }).length;
        const today = new Date().toISOString().slice(0, 10);
        const endDates = (editedClient.contract?.services || []).map((s: Service) => s.endDate).filter(Boolean) as string[];
        const futureEnds = endDates.filter(d => d >= today).sort();
        const proximaRenovacao = futureEnds[0] || null;
        const tarefasAtrasadas = clientTasks.filter((ta: { isGeneral?: boolean }) => {
            const d = getTaskDisplayDate(ta);
            if (!d || d >= today) return false;
            const w = ta.isGeneral ? workflows?.[generalWorkflowId || ''] : workflows?.[clientWorkflowId || ''];
            const status = w?.statuses?.find((s: { id: string }) => s.id === (ta as { statusId?: string }).statusId);
            return status && (status as { category?: string }).category !== 'done';
        }).length;
        const postsAtrasados = clientTasks.filter((ta: { clientId?: string; workflowId?: string }) => {
            if (!ta.clientId || ta.workflowId !== clientWorkflowId) return false;
            const d = getTaskDisplayDate(ta);
            return d && d < today && !doneIds.has((ta as { statusId?: string }).statusId);
        }).length;
        let statusConta: 'em_dia' | 'atencao' | 'atrasado' = 'em_dia';
        if (tarefasAtrasadas > 0 || postsAtrasados > 0) statusConta = 'atrasado';
        else if (aguardandoAprovacao > 2 || tarefasPendentes > 5) statusConta = 'atencao';
        return { postsAtivos, aguardandoAprovacao, tarefasPendentes, proximaRenovacao, statusConta, tarefasAtrasadas, postsAtrasados };
    }, [editedClient?.id, editedClient?.contract?.services, tasks, workflows, clientWorkflowId, generalWorkflowId]);

    const renderSectionEditor = useCallback((tabId: TabId) => {
        switch (tabId) {
            case 'overview':
                return (
                    <OverviewErrorBoundary
                        fallback={
                            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
                                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">{t('visao_geral')}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{t('visao_geral_placeholder_desc')}</p>
                            </div>
                        }
                    >
                        <Suspense fallback={<SectionEditorFallback />}>
                            <OverviewSection
                                editedClient={editedClient}
                                quickOverview={quickOverview}
                                clientTasks={(tasks || []).filter((ta: { clientId?: string }) => ta.clientId === editedClient?.id)}
                                workflows={workflows || {}}
                                clientWorkflowId={clientWorkflowId || ''}
                                generalWorkflowId={generalWorkflowId || ''}
                                                t={t}
                                language={language}
                            />
                        </Suspense>
                    </OverviewErrorBoundary>
                );
            case 'planning':
                                        return (
                    <Suspense fallback={<SectionEditorFallback />}>
                        <PlanningSectionEditor
                            editedClient={editedClient}
                            handlers={{ onUpdate: handleUpdate, onCancel: handleCancel, onSave: handleSave, requestConfirmation }}
                            isDirty={isDirty}
                            saveBarMessage={saveBarMessage}
                            onFeedbackDismiss={() => setSaveBarMessage(null)}
                            t={t}
                            expandedSections={planningExpandedSections}
                            onExpandedSectionsChange={setPlanningExpandedSections}
                            embeddedSaveBar={false}
                        />
                    </Suspense>
                );
            case 'client_data':
                return (
                    <ClientDataForms
                        layout="minimal"
                        client={editedClient}
                        onUpdate={handleUpdate}
                        context={context}
                        isDirty={isDirty}
                        onSave={handleSave}
                        onCancel={handleCancel}
                        saveBarMessage={saveBarMessage}
                        onFeedbackDismiss={() => setSaveBarMessage(null)}
                        onDelete={() => onDelete(client.id)}
                        requestConfirmation={requestConfirmation}
                        onRequestEdit={() => {
                            if (editingLock !== null && editingLock !== 'tab:client_data') {
                                requestNavigation(() => {});
                                return false;
                            }
                            setEditingLock('tab:client_data');
                            return true;
                        }}
                        onEditEnd={onEditEndSection}
                        editDisabled={editingLock !== null && editingLock !== 'tab:client_data'}
                        forceCloseEditToken={forceCloseEditToken}
                        expandedSections={clientDataExpandedSections}
                        onExpandedSectionsChange={setClientDataExpandedSections}
                        embeddedSaveBar={false}
                    />
                );
            case 'brand_guide':
                return (
                    <Suspense fallback={<SectionEditorFallback />}>
                        <BrandGuideSectionEditor
                            editedClient={editedClient}
                            handlers={{ onUpdate: handleUpdate, onCancel: handleCancel, onSave: handleSave, requestConfirmation, onCopy: handleCopy, showConfirmation }}
                            isDirty={isDirty}
                            saveBarMessage={saveBarMessage}
                            onFeedbackDismiss={() => setSaveBarMessage(null)}
                            t={t}
                            logoUploadError={logoUploadError}
                            setLogoUploadError={setLogoUploadError}
                            copiedHex={copiedHex}
                            onOpenLogoUpload={() => { setUploadTarget('logo'); setLogoUploadError(null); setIsUploadModalOpen(true); }}
                            onOpenPhotoUpload={() => { setUploadTarget('photo'); setUploadError(null); setIsUploadModalOpen(true); }}
                            onOpenGraphicUpload={() => { setUploadTarget('graphic'); setUploadError(null); setIsUploadModalOpen(true); }}
                            onOpenIconUpload={() => { setUploadTarget('icon'); setUploadError(null); setIsUploadModalOpen(true); }}
                            onOpenIconUploadWithFile={(file) => { setInitialUploadFile(file); setUploadTarget('icon'); setUploadError(null); setIsUploadModalOpen(true); }}
                            assetUploadError={uploadError}
                            uploadTarget={uploadTarget}
                            expandedSections={brandGuideExpandedSections}
                            onExpandedSectionsChange={setBrandGuideExpandedSections}
                            embeddedSaveBar={false}
                        />
                    </Suspense>
                );
            case 'strategy':
                return (
                    <Suspense fallback={<SectionEditorFallback />}>
                        <BriefingV2StrategyEditor
                            editedClient={editedClient}
                            handlers={{ onUpdate: handleUpdate, onCancel: handleCancel, onSave: handleSave, requestConfirmation }}
                            isDirty={isDirty}
                            saveBarMessage={saveBarMessage}
                            onFeedbackDismiss={() => setSaveBarMessage(null)}
                            t={t}
                            expandedSections={strategyExpandedSections}
                            onExpandedSectionsChange={setStrategyExpandedSections}
                            embeddedSaveBar={false}
                        />
                    </Suspense>
                );
            case 'contract':
                return (
                    <div className="space-y-6">
                        <div>
                            <ContractServicesManager
                                services={editedClient.contract?.services || []}
                                onServicesUpdate={(svcs) => handleUpdate({ contract: { ...editedClient.contract, services: svcs } })}
                                clientCurrency={editedClient.currency}
                                onCurrencyChange={(currency) => handleUpdate({ currency })}
                                context={context}
                                requestConfirmation={requestConfirmation}
                                onDirtyChange={setIsContractFormDirty}
                                readOnly={!canEditClients || !canEditContracts}
                                onRequestEdit={() => {
                                    if (editingLock !== null && editingLock !== 'tab:contract') {
                                        requestNavigation(() => {});
                                        return false;
                                    }
                                    return true;
                                }}
                                onEditStart={() => setEditingLock('tab:contract')}
                                onEditEnd={onEditEndSection}
                                onRegisterActions={onRegisterContractActions}
                            />
                        </div>
                    </div>
                );
            default:
                return null;
        }
    }, [editedClient, handleUpdate, handleSave, handleCancel, requestConfirmation, closeEditSection, onEditEndSection, forceCloseEditToken, isDirty, isContractFormDirty, context, client.id, onDelete, t, editingLock, requestNavigation, setEditingLock, copiedHex, handleCopy, setIsContractFormDirty, setIsUploadModalOpen, setUploadTarget, setPasswordVisibility, pendingPlatform, pendingSocialUrl, pendingPassword, socialPlatformDropdownIndex, saveBarMessage, quickOverview, tasks, workflows, clientWorkflowId, generalWorkflowId, language, strategyExpandedSections, brandGuideExpandedSections, clientDataExpandedSections, canEditClients, canEditContracts]);

    const sectionEmpty = useMemo(() => ({
        identity: false,
        data: !editedClient.companyName && !editedClient.legalRepresentativeName && !(editedClient.contacts?.length),
        guia: !(editedClient.brandColors?.length) && !editedClient.typography?.primaryFont && !editedClient.toneOfVoice && !(editedClient.dos?.length) && !(editedClient.donts?.length) && !(editedClient.brandAssets?.length),
        strategy: !editedClient.toneOfVoice && !editedClient.brandGuidelines && !editedClient.objectives && !editedClient.targetAudience && !editedClient.audienceWho && !editedClient.audiencePains && !editedClient.audienceDesires && !editedClient.kpis && !editedClient.strategyNotes,
        access: !(editedClient.accessCredentials?.length),
        contract: !(editedClient.contract?.services?.length),
    }), [editedClient]);

    const clientPresentationFinanceEntries = useMemo(() => {
        if (!editedClient?.id) return [];
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const currentMonthStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

        const fromGlobal = (financialEntries || []).filter(
            (entry: FinancialEntry) => entry.clientId === editedClient.id
        );

        const globalKeys = new Set(
            fromGlobal.map(e => `${e.description}-${e.dueDate?.slice(0, 7)}`)
        );

        const derivedFromContract: FinancialEntry[] = [];
        (editedClient.contract?.services || []).forEach((service: Service) => {
            if (service.status === 'canceled' || service.status === 'paused') return;
            const startDate = service.startDate ? new Date(service.startDate + 'T00:00') : null;
            const endDate = service.endDate ? new Date(service.endDate + 'T00:00') : null;
            const isMonthly = service.frequency === 'monthly';
            const isOnce = service.frequency === 'once';

            if (isMonthly && startDate && startDate <= monthEnd && (!endDate || endDate >= monthStart)) {
                const payDay = service.paymentDay || 10;
                const dueDate = `${currentMonthStr}-${String(payDay).padStart(2, '0')}`;
                const key = `${service.name}-${currentMonthStr}`;
                if (!globalKeys.has(key)) {
                    derivedFromContract.push({
                        id: `_contract-${service.id}-${currentMonthStr}`,
                        clientId: editedClient.id,
                        description: service.name,
                        category: 'fee_monthly_services',
                        value: service.value || 0,
                        currency: editedClient.currency,
                        dueDate,
                        status: 'pending',
                    } as FinancialEntry);
                }
            } else if (isOnce && startDate) {
                const dueMonth = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
                const key = `${service.name}-${dueMonth}`;
                if (!globalKeys.has(key)) {
                    derivedFromContract.push({
                        id: `_contract-${service.id}-once`,
                        clientId: editedClient.id,
                        description: service.name,
                        category: 'fee_one_off',
                        value: service.value || 0,
                        currency: editedClient.currency,
                        dueDate: service.startDate,
                        status: 'pending',
                    } as FinancialEntry);
                }
            }
        });

        return [...fromGlobal, ...derivedFromContract]
            .sort((a: FinancialEntry, b: FinancialEntry) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
    }, [editedClient?.id, editedClient.contract, editedClient.currency, financialEntries]);

    return (
        <div className={isAnythingDirty || saveBarMessage ? 'pb-20 sm:pb-24 md:pb-28' : 'pb-12'}>
            {isUploadModalOpen && (
                <Suspense fallback={null}>
                    <UploadModal
                        onClose={() => { setIsUploadModalOpen(false); setUploadError(null); setInitialUploadFile(null); setPersonaPhotoUploadIndex(null); }}
                        onFileSelect={handleFileSelected}
                        isLoading={uploadLoading}
                        uploadError={uploadError}
                        onValidationError={(msg) => setUploadError(msg ?? null)}
                        uploadTarget={uploadTarget}
                        initialFile={initialUploadFile}
                        onInitialFileConsumed={() => setInitialUploadFile(null)}
                        readOnly={!canEditClients}
                    />
                </Suspense>
            )}
            {accessCredentialModalOpen && accessCredentialFormState && (
                <AccessCredentialModal
                    formState={accessCredentialFormState}
                    onFormChange={setAccessCredentialFormState}
                    onClose={closeAccessCredentialModal}
                    onSave={handleSaveAccessCredential}
                    isEditing={!!(accessCredentialFormState.id && editedClient.accessCredentials?.some(c => c.id === accessCredentialFormState.id))}
                    t={t}
                    readOnly={!canEditClients}
                />
            )}
            <ClientPresentationView
                editedClient={editedClient}
                sectionEmpty={sectionEmpty}
                presentationModeForClient={false}
                clientPresentationFinanceEntries={clientPresentationFinanceEntries}
                language={language}
                t={t}
                onBack={handleBack}
                onEditClient={() => {}}
                onExitPresentation={() => {}}
                onOpenEditSection={openEditForSection}
                onCloseEditSection={closeEditSection}
                editingSectionId={editingSectionId}
                renderSectionEditor={renderSectionEditor}
                socialIcons={socialIcons}
                onNavigateToPresentation={isPresentationRoute ? undefined : onNavigateToPresentation}
                onDelete={client.id && client.id !== 'new' && canEditClients ? () => showConfirmation({ title: t('confirm_delete_title'), message: t('confirm_delete_client'), onConfirm: () => onDelete(client.id) }) : undefined}
                onUpdate={canEditClients ? handleUpdate : undefined}
                onOpenUpload={canEditClients ? ((target) => { setUploadTarget(target); setIsUploadModalOpen(true); }) : undefined}
                readOnly={!canEditClients}
                teamMembers={agencyProfile?.teamMembers ?? []}
                quickOverview={quickOverview}
                onRequestTabChange={(tabId, proceed) => {
                    if (isAnythingDirty) {
                        requestNavigationWithSaveOption(proceed);
                    } else {
                        proceed();
                    }
                }}
            />
            {(isAnythingDirty || saveBarMessage) && (canEditClients || (isContractFormDirty && canEditContracts)) && (
                <UnsavedChangesBar
                    onCancel={handleCancel}
                    onSave={handleSave}
                    requestConfirmation={requestConfirmation}
                    feedback={saveBarMessage ?? undefined}
                    onFeedbackDismiss={() => setSaveBarMessage(null)}
                />
            )}
        </div>
    );
};

export default ClientDetail;
