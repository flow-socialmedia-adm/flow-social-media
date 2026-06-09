import React, { useState, useContext, useRef, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AppContext } from '../contexts/AppContext';
import type { Client, SocialPlatform, ActivityHistoryClientSectionV2 } from '../types';
import { apiDelete, apiGet, apiPost, apiPut } from '../lib/api';
const ClientDetail = lazy(() => import('./clients/ClientDetail'));
import { ClientList } from './clients/ClientList';
import { ClientPresentationLandingPage } from './ClientPresentationLandingPage';
import { normalizeClient } from './clients/clientUtils';
import { defaultClientOwnerPreferences } from '../lib/client-owner-preferences';
import { urlTemplates } from './clients/socialHelpers';
import { resolveColorHex } from '../lib/utils';
import { migrateClientToBriefingV2 } from '../lib/briefingV2/migrate';
import { syncLegacyBrandGuideFields } from '../lib/briefingV2/syncLegacy';
import {
    CONTENT_BELOW_HEADER_PAD,
    CONTENT_PAGE_BODY_INNER,
    CONTENT_PAGE_SCROLL_OUTER,
    HEADER_GRADIENT_PLUS_CLASS,
} from '../lib/contentPageHeader';
import { PlusIcon } from './icons';
import { ModuleAccessDenied } from './ModuleAccessDenied';
import ContentPageHeader from './ContentPageHeader';
import TooltipHint from './TooltipHint';

// --- Main Page Component ---
const ClientsPage: React.FC = () => {
    const { id: routeId } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const context = useContext(AppContext);
    const [draftClient, setDraftClient] = useState<Client | null>(null);
    const [loading, setLoading] = useState(false);
    const [detailClient, setDetailClient] = useState<Client | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const mountedRef = useRef(true);
    const pageSize = 500;

    const isPresentationRoute = location.pathname.endsWith('/apresentacao');
    const clientIdFromRoute = isPresentationRoute
        ? location.pathname.replace(/\/apresentacao$/, '').split('/').pop()
        : (location.pathname === '/clientes/new' ? 'new' : routeId);

    if (!context) return null;
    const { clients, setClients, t, setTasks, logActivity, notify, registerDirtyForm, canEditModule, isOperationalProfile } = context;
    const canEditClients = canEditModule('clients');

    useEffect(() => {
        const id = clientIdFromRoute;
        if (!isOperationalProfile || !id || id === 'new' || isPresentationRoute) return;
        if (canEditClients) return;
        navigate(`/clientes/${id}/apresentacao`, { replace: true });
    }, [isOperationalProfile, canEditClients, clientIdFromRoute, isPresentationRoute, navigate]);

    useEffect(() => {
        return () => { mountedRef.current = false; };
    }, []);

    const loadClients = useCallback(async () => {
        setLoading(true);
        try {
            const resp = await apiGet<{ items: unknown[]; total: number }>('/clients', { page: 1, pageSize, _ts: Date.now() });
            const mapped = (resp.items || []).map((c) => normalizeClient(c as Record<string, unknown>));
            setClients(mapped);
        } catch (error) {
            console.error('[ClientsPage] Erro ao carregar clientes:', error);
        } finally {
            setLoading(false);
        }
    }, [setClients]);

    useEffect(() => {
        loadClients();
    }, [loadClients]);

    useEffect(() => {
        const id = clientIdFromRoute;
        if (!id || id === 'new' || id.startsWith('client-')) {
            setDetailClient(null);
            setDetailLoading(false);
            return;
        }
        setDetailLoading(true);
        setDetailClient(null);
        apiGet<unknown>(`/clients/${id}`, { _ts: Date.now() })
            .then((raw) => {
                setDetailClient(normalizeClient(raw as Record<string, unknown>));
            })
            .catch((err) => {
                console.error('[ClientsPage] Erro ao carregar cliente:', err);
            })
            .finally(() => {
                setDetailLoading(false);
            });
    }, [clientIdFromRoute]);

    const handleAddNewClient = () => {
        const draft: Client = {
            id: 'new',
            name: '',
            color: 'bg-slate-600',
            createdAt: new Date().toISOString(),
            currency: 'BRL',
            clientType: 'individual',
            contacts: [],
            socialLinks: [],
            ownerPreferences: defaultClientOwnerPreferences(),
        };
        setDraftClient(draft);
        navigate('/clientes/new');
    };

    const handleCloseDetails = () => {
        setDraftClient(null);
        navigate('/clientes');
    };

    const handleSaveClient = async (
        clientToSave: Client,
        options?: {
            contractChanged?: boolean;
            activityClientSection?: ActivityHistoryClientSectionV2;
            onBarFeedback?: (msg: string, type: 'success' | 'error') => void;
        },
    ): Promise<Client | null> => {
        const report = (msg: string, type: 'success' | 'error') => {
            if (options?.onBarFeedback) options.onBarFeedback(msg, type);
            else notify?.(msg);
        };
        try {
            if (!clientToSave.name || clientToSave.name.trim() === '') {
                report('Informe um nome para salvar o cliente.', 'error');
                return null;
            }
            if (clientToSave.avatarUrl?.startsWith?.('data:')) {
                report('Envie a foto do cabeçalho pelo botão de upload. Arquivos em base64 não podem ser salvos.', 'error');
                return null;
            }
            const hasBase64Asset = (clientToSave.brandAssets || []).some((a) => a.url?.startsWith?.('data:'));
            if (hasBase64Asset) {
                report('Um ou mais arquivos (logo, ícone SVG, manual da marca etc.) precisam ser enviados pelo botão de upload antes de salvar.', 'error');
                return null;
            }

            const normalizeSocialLinkUrl = (url: string, platform: SocialPlatform): string => {
                if (!url?.trim()) return '';
                const u = url.trim();
                if (u.startsWith('http')) return u;
                if (u.startsWith('@')) {
                    const tmpl = urlTemplates[platform];
                    return tmpl ? tmpl.replace('{username}', u.slice(1).replace(/^@/, '')) : u;
                }
                const domainRegex = new RegExp(`^(https?://)?(www\\.)?${platform}\\.com`, 'i');
                if (domainRegex.test(u)) return u.startsWith('http') ? u : `https://${u}`;
                const tmpl = urlTemplates[platform];
                return tmpl ? tmpl.replace('{username}', u) : `https://${platform}.com/${u}`;
            };
            const socialLinksForPayload = (clientToSave.socialLinks || [])
                .map((l) => ({ ...l, url: normalizeSocialLinkUrl(l.url, l.platform) }))
                .filter((l) => l.url);

            const contactsForPayload = (clientToSave.contacts || []).map(
                (ct: { id?: string; name?: string; role?: string; email?: string; whatsapp?: string; landlinePhone?: string; notes?: string; isPrimary?: boolean }) => ({
                    id: ct.id ?? '',
                    name: ct.name ?? '',
                    role: ct.role ?? '',
                    email: ct.email ?? '',
                    whatsapp: ct.whatsapp ?? '',
                    landlinePhone: ct.landlinePhone ?? '',
                    notes: ct.notes ?? '',
                    isPrimary: !!ct.isPrimary,
                })
            );

            // Sem cor favorita na paleta: faixa volta ao estado inicial (cinza neutro), como ao remover logo favorito.
            const headerColorHex = (clientToSave.headerColorIndex != null && clientToSave.brandColors?.[clientToSave.headerColorIndex])
                ? resolveColorHex(clientToSave.brandColors[clientToSave.headerColorIndex].hex)
                : '#475569';
            const logos = (clientToSave.brandAssets || []).filter((a: { type?: string }) => a.type === 'logo');
            const avatarUrlFromPrincipal = (clientToSave.principalLogoIndex != null && logos[clientToSave.principalLogoIndex]?.url)
                ? logos[clientToSave.principalLogoIndex].url
                : null;
            const briefingBase = clientToSave.briefingV2 ?? migrateClientToBriefingV2(clientToSave);
            const briefingForSave = {
                ...briefingBase,
                _internal: {
                    ...briefingBase._internal,
                    planning: {
                        ...briefingBase._internal?.planning,
                        accountOwnerLegacy:
                            clientToSave.planningAccountOwner ||
                            briefingBase._internal?.planning?.accountOwnerLegacy,
                    },
                },
            };
            const legacyBriefingSync = syncLegacyBrandGuideFields(briefingForSave);

            const clientPayload: Record<string, unknown> = {
                name: clientToSave.name?.trim() ?? '',
                type: clientToSave.clientType || 'individual',
                currency: clientToSave.currency || 'BRL',
                active: true,
                color: headerColorHex,
                avatarUrl: avatarUrlFromPrincipal ?? null,
                website: clientToSave.website?.trim() || null,
                contactsJson: contactsForPayload.length > 0 ? contactsForPayload : null,
                socialLinksJson: socialLinksForPayload,
                addressJson: clientToSave.address || null,
                brandGuideJson: {
                    brandColors: clientToSave.brandColors || [],
                    headerColorIndex: clientToSave.headerColorIndex ?? null,
                    principalLogoIndex: clientToSave.principalLogoIndex ?? null,
                    typography: clientToSave.typography || {},
                    brandAssets: clientToSave.brandAssets || [],
                    legalRepresentativeRg: clientToSave.legalRepresentativeRg || null,
                    legalRepresentativeEmail: clientToSave.legalRepresentativeEmail || null,
                    legalRepresentativeWhatsapp: clientToSave.legalRepresentativeWhatsapp || null,
                    legalRepresentativeRole: clientToSave.legalRepresentativeRole || null,
                    legalRepresentativeBirthDate: clientToSave.legalRepresentativeBirthDate || null,
                    companyStateRegistration: clientToSave.companyStateRegistration || null,
                    companyLandlinePhone: clientToSave.companyLandlinePhone || null,
                    companyPhone: clientToSave.companyPhone || null,
                    brandGuidelines: (clientToSave.brandHistory || clientToSave.brandGuidelines) || null,
                    ...legacyBriefingSync,
                },
                accessCredentialsJson: clientToSave.accessCredentials || null,
                // TODO(Briefing V2): separar `content.strategyNotes` (briefing) de `Client.notes` (notas internas).
                // Hoje: dual-write por compatibilidade — ver lib/briefingV2/syncLegacy.ts.
                notes: briefingForSave.content.strategyNotes || clientToSave.strategyNotes || null,
                clientOwnerPreferencesJson: clientToSave.ownerPreferences ?? defaultClientOwnerPreferences(),
            };

            const isCreate = clientToSave.id === 'new' || clientToSave.id.startsWith('client-');
            if (isCreate || options?.contractChanged === true) {
                clientPayload.contractJson = clientToSave.contract ?? null;
            }

            let savedClient: Client;

            if (isCreate) {
                const created = await apiPost<Record<string, unknown>>('/clients', clientPayload);
                if (!created?.id) throw new Error('API não retornou cliente após criação');
                savedClient = normalizeClient(created);
                savedClient = {
                    ...savedClient,
                    accessCredentials: clientToSave.accessCredentials || [],
                    contract: clientToSave.contract ?? savedClient.contract ?? { services: [] },
                };
                if (!Array.isArray(savedClient.contract?.services)) {
                    savedClient.contract = { ...(savedClient.contract ?? {}), services: [] };
                }
                setClients((prev) => [...prev, savedClient]);
                setDetailClient(savedClient);
                setDraftClient(null);
                navigate(`/clientes/${created.id as string}`);
                logActivity({
                    v: 2,
                    verb: 'created',
                    item: 'client',
                    name: clientToSave.name,
                    page: 'clients',
                    clientSection: options?.activityClientSection,
                });
            } else {
                const updated = await apiPut<Record<string, unknown>>(`/clients/${clientToSave.id}`, clientPayload);
                let apiData = updated;
                if (!updated?.id) {
                    apiData = await apiGet<Record<string, unknown>>(`/clients/${clientToSave.id}`, { _ts: Date.now() });
                }
                if (apiData?.id) {
                    savedClient = normalizeClient(apiData);
                    savedClient = { ...savedClient, accessCredentials: clientToSave.accessCredentials || [] };
                } else {
                    savedClient = { ...clientToSave };
                }
                setClients((prev) => prev.map((c) => (c.id === clientToSave.id ? savedClient : c)));
                if (clientIdFromRoute === clientToSave.id) setDetailClient(savedClient);
                logActivity({
                    v: 2,
                    verb: 'updated',
                    item: 'client',
                    name: clientToSave.name,
                    page: 'clients',
                    clientSection: options?.activityClientSection,
                });
            }
            report('Cliente salvo com sucesso', 'success');
            return savedClient;
        } catch (err) {
            console.error('[handleSaveClient] Erro:', err);
            report('Não foi possível salvar, tente novamente.', 'error');
            return null;
        }
    };

    const handleDeleteClient = (clientId: string) => {
        const client = clients.find((c) => c.id === clientId);
        registerDirtyForm(false);
        navigate('/clientes');
        const snapshot = [...clients];
        setClients((prev) => prev.filter((c) => c.id !== clientId));
        setTasks((prev) => prev.filter((t) => t.clientId !== clientId));
        (async () => {
            try {
                await apiDelete(`/clients/${clientId}`);
                client &&
                    logActivity({
                        v: 2,
                        verb: 'deleted',
                        item: 'client',
                        name: client.name,
                        page: 'clients',
                    });
                await loadClients();
            } catch {
                setClients(snapshot);
                notify?.('Não foi possível excluir, tente novamente.');
            }
        })();
    };

    const newClientDraft: Client = useMemo(
        () => ({
            id: 'new',
            name: '',
            color: 'bg-slate-600',
            createdAt: new Date().toISOString(),
            currency: 'BRL',
            clientType: 'individual',
            contacts: [],
            socialLinks: [],
            ownerPreferences: defaultClientOwnerPreferences(),
        }),
        []
    );

    const selectedClient: Client | undefined =
        clientIdFromRoute === undefined
            ? undefined
            : clientIdFromRoute === 'new'
              ? (draftClient ?? newClientDraft)
              : (detailClient ?? clients.find((c) => c.id === clientIdFromRoute) ?? (draftClient?.id === clientIdFromRoute ? draftClient : undefined));

    if (selectedClient) {
        if (clientIdFromRoute === 'new' && !canEditClients) {
            return <ModuleAccessDenied onBack={() => navigate('/clientes')} />;
        }
        if (isPresentationRoute) {
            return (
                <ClientPresentationLandingPage
                    client={selectedClient}
                    language={context.language}
                    t={context.t}
                    appTheme={context.theme}
                    onBack={() => clientIdFromRoute && navigate(`/clientes/${clientIdFromRoute}`)}
                />
            );
        }
        return (
            <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto">
                <Suspense fallback={<div className="py-12 text-center text-gray-500">Carregando...</div>}>
                    <ClientDetail
                        client={selectedClient}
                        onBack={handleCloseDetails}
                        onSave={handleSaveClient}
                        onDelete={handleDeleteClient}
                        isPresentationRoute={false}
                        onNavigateToPresentation={clientIdFromRoute ? () => navigate(`/clientes/${clientIdFromRoute}/apresentacao`) : undefined}
                    />
                </Suspense>
            </div>
        );
    }

    return (
        <>
            {loading ? (
                <div className="p-4 sm:p-6 lg:p-8">
                    <div className="animate-pulse text-sm text-gray-500">Carregando...</div>
                </div>
            ) : (
                <div className="flex min-h-full min-w-0 w-full flex-1 flex-col">
                    <ContentPageHeader
                        heading={t('manage_clients')}
                        subtitle={t('manage_clients_subtitle')}
                        actions={
                            canEditClients ? (
                                <TooltipHint label={t('add_client')}>
                                    <button
                                        type="button"
                                        onClick={handleAddNewClient}
                                        className={HEADER_GRADIENT_PLUS_CLASS}
                                        aria-label={t('add_client')}
                                    >
                                        <PlusIcon className="h-5 w-5 transition-transform duration-200 group-hover:rotate-90" />
                                    </button>
                                </TooltipHint>
                            ) : null
                        }
                    />
                    <div className={`${CONTENT_PAGE_SCROLL_OUTER} ${CONTENT_BELOW_HEADER_PAD}`}>
                        <div className={`${CONTENT_PAGE_BODY_INNER} text-left`}>
                        <ClientList
                            hidePageHeader
                            clients={clients}
                            onSelectClient={(id) => navigate(`/clientes/${id}`)}
                            onAddClient={handleAddNewClient}
                            onDeleteClient={handleDeleteClient}
                            allowAdd={canEditClients}
                            showDeletedHistory={canEditClients}
                            onRestoreClient={canEditClients ? async (id) => {
                                await apiPost(`/clients/${id}/restore`, {});
                                await loadClients();
                                notify?.(t('client_restored') || 'Cliente restaurado.');
                            } : undefined}
                        />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ClientsPage;
