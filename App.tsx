
import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback, Component } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, Routes, Route } from 'react-router-dom';
import {
  Language,
  Theme,
  AppContextType,
  Page,
  Client,
  Task,
  Notification,
  PostType,
  Workflow,
  AgencyProfile,
  FinancialEntry,
  FinancialExpense,
  Currency,
  User,
  PlanTier,
  Permission,
  ActivityLogEntry,
  ActivityHistoryLineV2,
  ActivityHistoryAccountTabV2,
  ColorSchemesPreferences,
} from './types';
import { AppContext } from './contexts/AppContext';
import { AgencyClientsRosterProvider } from './contexts/AgencyClientsRosterContext';
import { getTranslator } from './lib/i18n';
import { formatDateToYYYYMMDD } from './lib/utils';
import { colorMap, convertBackendWorkflowToFrontend } from './lib/constants';
import { normalizeClient } from './components/clients/clientUtils';
import { OFFICIAL_POST_STATUS_COLORS } from './lib/postFlowOfficialColors';
import { apiGet, apiPatch, apiPost, apiPut, apiDelete } from './lib/api';
import { mergeAgencyFromApi } from './lib/mapAgencyApi';
import { inferSimpleAccessFromMember } from './lib/agencyUserAccess';
import {
  applyActiveColorSchemes,
  loadColorSchemesPreferences,
  normalizeColorSchemesPreferences,
} from './lib/colorSchemes';
import {
	PAGE_TO_MODULE,
	canViewModule as resolveCanViewModule,
	canEditModule as resolveCanEditModule,
	getCurrentUserPermissions,
	isOperationalAccessUser,
} from './lib/resolveUserModuleAccess';
import type { AgencyModuleKey } from './lib/modulePermissions';
import { ModuleAccessDenied } from './components/ModuleAccessDenied';
import LandingPage from './components/LandingPage';
import LandingPageV2 from './components/landing-v2/LandingPageV2';

interface PageErrorBoundaryProps {
  children: React.ReactNode;
  goDashboard: () => void;
  onErrorFallback: (error: Error, reset: () => void, goDashboard: () => void) => React.ReactNode;
}
class PageErrorBoundary extends Component<PageErrorBoundaryProps> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error('[PageErrorBoundary]', error); }
  reset = () => this.setState({ error: null });
  render() {
    if (this.state.error) {
      const goDashboard = () => { this.reset(); this.props.goDashboard(); };
      return this.props.onErrorFallback(this.state.error, this.reset, goDashboard);
    }
    return this.props.children;
  }
}
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import InviteAcceptPage from './components/InviteAcceptPage';
import PasswordResetPage from './components/PasswordResetPage';
import PaymentPage from './components/PaymentPage';
import OnboardingSetupPage from './components/OnboardingSetupPage';
const ProducaoPage = React.lazy(() => import('./components/ProducaoPage'));
const AgendaPage = React.lazy(() => import('./components/AgendaPage'));
const TarefasPage = React.lazy(() => import('./components/TarefasPage'));
const PlanningPage = React.lazy(() => import('./components/PlanningPage'));
import Sidebar from './components/Sidebar';
import DashboardPage from './components/DashboardPage';
const ClientsPage = React.lazy(() => import('./components/ClientsPage'));
const FinancePage = React.lazy(() => import('./components/FinancePage'));
const AgencySettingsPage = React.lazy(() => import('./components/AgencySettingsPage'));
import AccountSettingsPage from './components/AccountSettingsPage';
import AIChatModal from './components/AIChatModal';
import TooltipHint from './components/TooltipHint';
import { SparklesIcon, AlertTriangleIcon, MenuIcon } from './components/icons';
import { AuthContext } from './contexts/AuthContext';

// --- LOCAL STORAGE HOOK ---
function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = useCallback((value) => {
    setStoredValue(prev => {
      try {
        const valueToStore = value instanceof Function ? value(prev) : value;
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        return valueToStore;
      } catch (error) {
        console.error(error);
        return prev;
      }
    });
  }, [key]);

  return [storedValue, setValue];
}


// --- INITIAL WORKFLOW DEFINITIONS ---
const initialWorkflows: Record<string, Workflow> = {
    standard: {
        id: 'standard',
        nameKey: 'standard_flow',
        category: 'client',
        isCustom: false,
        statuses: [
            { id: 'todo', nameKey: 'category_todo', color: colorMap['red-medium'], category: 'todo' },
            { id: 'in_progress', nameKey: 'status_in_progress', color: colorMap['orange-medium'], category: 'in_progress' },
            { id: 'done', nameKey: 'done', color: colorMap['green-medium'], category: 'done' },
        ]
    },
    production: {
        id: 'production',
        nameKey: 'production_flow',
        category: 'client',
        isCustom: false,
        statuses: [
            { id: 'ideia_post', nameKey: 'ideia_post', color: OFFICIAL_POST_STATUS_COLORS.ideia_post, category: 'todo' },
            { id: 'fazer_post', nameKey: 'fazer_post', color: OFFICIAL_POST_STATUS_COLORS.fazer_post, category: 'in_progress' },
            { id: 'enviar_aprovacao', nameKey: 'enviar_aprovacao', color: OFFICIAL_POST_STATUS_COLORS.enviar_aprovacao, category: 'in_progress' },
            { id: 'agendar_post', nameKey: 'agendar_post', color: OFFICIAL_POST_STATUS_COLORS.agendar_post, category: 'in_progress' },
            { id: 'agendado_postado', nameKey: 'agendado_postado', color: OFFICIAL_POST_STATUS_COLORS.agendado_postado, category: 'done' },
        ]
    },
    standard_general: {
        id: 'standard_general',
        nameKey: 'standard_general_flow',
        category: 'general',
        isCustom: false,
        statuses: [
            { id: 'todo', nameKey: 'category_todo', color: colorMap['red-medium'], category: 'todo' },
            { id: 'in_progress', nameKey: 'status_in_progress', color: colorMap['orange-medium'], category: 'in_progress' },
            { id: 'done', nameKey: 'done', color: colorMap['green-medium'], category: 'done' },
        ]
    }
};

// MOCK DATA (Clientes iniciais removidos: novas contas começam com 0 clientes)
const initialClients: Client[] = [];

// Tarefas iniciais removidas para não referenciar clientes inexistentes
const initialTasks: Task[] = [];

const initialNotifications: Notification[] = [];

// --- RICH MOCK FINANCIAL DATA ---
const generateHistoricalData = () => {
    const entries: FinancialEntry[] = [];
    const expenses: FinancialExpense[] = [];
    return { entries, expenses };
}

const { entries: initialFinancialEntries, expenses: initialFinancialExpenses } = generateHistoricalData();

const initialAgencyProfile: AgencyProfile = {
    name: 'Minha Agência',
    avatarUrl: '',
    contactEmail: 'contato@agencia.com',
    whatsapp: '+5511999998888',
    landlinePhone: '',
    baseCurrency: 'BRL',
    subscription: {
        tier: 'plan_2', // legado
        status: 'trialing' as any,
        maxUsers: 3,
        renewsAt: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
    },
    teamMembers: [],
    agencyRoles: [],
    // Novo modelo (fase inicial)
    plan_tier: 'agencia',
    trial_start: new Date().toISOString(),
    trial_end: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    subscription_status: 'trialing',
    defaultOwnerStrategy: 'AGENCY_OWNER',
    allowStageOwners: false,
    operationMode: 'solo',
    clientResponsibleMode: 'per_client_planning',
    defaultClientOwnerUserId: null,
};

const initialActivityLog: ActivityLogEntry[] = [];

const ConfirmationModal: React.FC<{
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  t: AppContextType['t'];
}> = ({ isOpen, title, message, onConfirm, onCancel, confirmText, cancelText, t }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-6 text-center">
                <AlertTriangleIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 whitespace-pre-line">{message}</p>
                <div className="flex justify-center gap-4">
                    <button onClick={onConfirm} className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700">{confirmText || t('yes')}</button>
                    <button onClick={onCancel} className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600">{cancelText || t('no')}</button>
                </div>
            </div>
        </div>
    );
};

/** Toast inferior (`notify`, mensagens disparadas dentro deste componente): tempo até ocultar automaticamente */
const APP_TOAST_DURATION_MS = 4500;

const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = React.useContext(AuthContext);
  const mappedUser = useMemo(() => {
    if (!auth?.user) return null;
    return {
      id: auth.user.id,
      name: auth.user.fullName,
      email: auth.user.email,
      avatarUrl: auth.user.avatarUrl ?? undefined,
      birthDate: auth.user.birthDate ?? undefined,
      phone: auth.user.phone ?? undefined,
      role: auth.user.role,
      permissions: (auth.user.permissions as any) || [],
      agencyRoleId: auth.user.agencyRoleId ?? null,
      simpleAccessLevel: (auth.user.simpleAccessLevel as User['simpleAccessLevel']) ?? null,
    } as unknown as User;
  }, [auth?.user]);

  const [page, _setPage] = useState<Page>('dashboard');
  const [view, setView] = useState<'landing' | 'login' | 'signup' | 'payment' | 'onboarding'>('landing');
  
  // Wrapper com log para debug (usando useRef para evitar dependência circular)
  const pageRef = useRef<Page>('dashboard');
  useEffect(() => {
    pageRef.current = page;
  }, [page]);
  
  const setPage = useCallback((newPage: Page) => {
    console.log(`[App] 🔄 setPage chamado: ${pageRef.current} → ${newPage}`);
    _setPage(newPage);
    console.log(`[App] ✅ setPage executado com sucesso`);
  }, []);
  
  const [language, setLanguage] = useLocalStorage<Language>('flow_language', Language.PT);
  const [theme, setTheme] = useLocalStorage<Theme>('flow_theme', Theme.DARK);

  const [clients, setClients] = useLocalStorage<Client[]>('flow_clients', initialClients);
  const [tasks, setTasks] = useLocalStorage<Task[]>('flow_tasks', initialTasks);
  const [notifications] = useState<Notification[]>(initialNotifications);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [agencyProfile, setAgencyProfile] = useLocalStorage<AgencyProfile>('flow_agencyProfile', initialAgencyProfile);
  const agencyRolesList = agencyProfile.agencyRoles ?? [];
  const agencyOperationMode = agencyProfile.operationMode ?? 'solo';
  const moduleResolveOpts = useMemo(
    () => ({ agencyOperationMode }),
    [agencyOperationMode],
  );

  const canViewModule = useCallback(
    (module: AgencyModuleKey) => resolveCanViewModule(mappedUser, agencyRolesList, module, moduleResolveOpts),
    [mappedUser, agencyRolesList, moduleResolveOpts],
  );
  const canEditModule = useCallback(
    (module: AgencyModuleKey) => resolveCanEditModule(mappedUser, agencyRolesList, module, moduleResolveOpts),
    [mappedUser, agencyRolesList, moduleResolveOpts],
  );
  const getModulePermissions = useCallback(
    () => getCurrentUserPermissions(mappedUser, agencyRolesList, moduleResolveOpts),
    [mappedUser, agencyRolesList, moduleResolveOpts],
  );

  const isOperationalProfile = useMemo(
    () => isOperationalAccessUser(mappedUser, agencyRolesList, moduleResolveOpts),
    [mappedUser, agencyRolesList, moduleResolveOpts],
  );

  useLayoutEffect(() => {
    if (!mappedUser || !isOperationalProfile) return;
    if (page === 'dashboard') {
      _setPage('producao');
    }
  }, [mappedUser?.id, isOperationalProfile, page]);

  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const bannerTimerRef = useRef<number | null>(null);

  const emitToast = useCallback((message: string) => {
    setToast({ open: true, message });
    window.setTimeout(
      () => setToast((prev) => (prev.open ? { open: false, message: '' } : prev)),
      APP_TOAST_DURATION_MS,
    );
  }, []);

  // Workflow State
  const [workflows, setWorkflows] = useLocalStorage<Record<string, Workflow>>('flow_workflows', initialWorkflows);
  const [clientWorkflowId, setClientWorkflowId] = useLocalStorage<string>('flow_clientWorkflowId', 'standard');
  const [generalWorkflowId, setGeneralWorkflowId] = useLocalStorage<string>('flow_generalWorkflowId', 'standard_general');

  const [colorSchemes, setColorSchemesState] = useState<ColorSchemesPreferences>(() => loadColorSchemesPreferences());
  const colorSchemesRef = useRef(colorSchemes);
  colorSchemesRef.current = colorSchemes;

  const setColorSchemes = useCallback((action: React.SetStateAction<ColorSchemesPreferences>) => {
    setColorSchemesState((prev) => {
      const next = typeof action === 'function' ? (action as (p: ColorSchemesPreferences) => ColorSchemesPreferences)(prev) : action;
      const norm = normalizeColorSchemesPreferences(next);
      try {
        window.localStorage.setItem('flow_colorSchemes', JSON.stringify(norm));
      } catch {
        /* ignore */
      }
      return norm;
    });
  }, []);

  const colorSchemeStorageSynced = useRef(false);
  useEffect(() => {
    if (colorSchemeStorageSynced.current) return;
    colorSchemeStorageSynced.current = true;
    try {
      if (!window.localStorage.getItem('flow_colorSchemes')) {
        window.localStorage.setItem('flow_colorSchemes', JSON.stringify(colorSchemes));
      }
    } catch {
      /* ignore */
    }
  }, [colorSchemes]);

  useEffect(() => {
    setWorkflows((prev) =>
      applyActiveColorSchemes(prev, colorSchemes, clientWorkflowId, generalWorkflowId),
    );
  }, [colorSchemes, clientWorkflowId, generalWorkflowId, setWorkflows]);

  // Finance State
  const [financialEntries, setFinancialEntries] = useLocalStorage<FinancialEntry[]>('flow_financialEntries', initialFinancialEntries);
  const [financialExpenses, setFinancialExpenses] = useLocalStorage<FinancialExpense[]>('flow_financialExpenses', initialFinancialExpenses);
  
  // Activity Log State
  const [activityLog, setActivityLog] = useLocalStorage<ActivityLogEntry[]>('flow_activityLog', initialActivityLog);

  // Unsaved Changes & Confirmation Modal State
  const dirtyFormRef = useRef<{ save?: () => void; discard?: () => void }>({});
  const [confirmationProps, setConfirmationProps] = useState<any>(null);

  const t = useMemo(() => getTranslator(language), [language]);

  const hasPermission = useCallback((permission: Permission) => {
      if (!mappedUser) return false;
      if (mappedUser.role === 'owner' || mappedUser.role === 'admin') return true;
      return (mappedUser.permissions || []).includes(permission);
  }, [mappedUser]);
  
  const logActivity = useCallback((line: ActivityHistoryLineV2) => {
    if (!mappedUser) return;
    const payload = { ...line, v: 2 as const };
    const newEntry: ActivityLogEntry = {
      id: `log-${Date.now()}`,
      userId: mappedUser.id,
      userName: mappedUser.name,
      timestamp: new Date().toISOString(),
      line: payload,
      actionKey: 'history.v2',
      targetName: line.name,
    };
    setActivityLog((prev) => [newEntry, ...prev].slice(0, 50));
    void apiPost('/activity-logs/ingest', { line: payload }).catch(() => {
      /* offline / sessão: histórico local continua válido */
    });
  }, [mappedUser, setActivityLog]);

  const showConfirmation = useCallback(({ title, message, onConfirm, onCancel, confirmText, cancelText }) => {
    setConfirmationProps({
        title,
        message,
        confirmText,
        cancelText,
        onConfirm: () => {
            onConfirm?.();
            setConfirmationProps(null);
        },
        onCancel: () => {
            onCancel?.();
            setConfirmationProps(null);
        },
    });
  }, []);

  const registerDirtyForm = useCallback((isDirty: boolean, saveFn?: () => void, discardFn?: () => void) => {
    if (isDirty) {
        dirtyFormRef.current = { save: saveFn, discard: discardFn };
    } else {
        dirtyFormRef.current = {};
    }
  }, []);
  
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (dirtyFormRef.current && dirtyFormRef.current.save) {
            e.preventDefault();
            e.returnValue = t('confirm_discard_changes');
            return t('confirm_discard_changes');
        }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [t]);

  const canViewModuleRef = useRef(canViewModule);
  useEffect(() => {
    canViewModuleRef.current = canViewModule;
  }, [canViewModule]);

  const executeNavigation = useCallback((targetPage: Page) => {
    dirtyFormRef.current = {};

    let resolvedPage = targetPage;
    if (resolvedPage === 'dashboard' && isOperationalProfile) {
      resolvedPage = 'producao';
    }

    const mod = PAGE_TO_MODULE[resolvedPage];
    if (mod && !canViewModuleRef.current(mod)) {
      emitToast(t('module_access_restricted_body'));
      return;
    }

    if (resolvedPage === 'clients') {
      navigate('/clientes');
    } else if (location.pathname.startsWith('/clientes')) {
      navigate('/');
    }
    setPage(resolvedPage);
  }, [setPage, navigate, location.pathname, t, isOperationalProfile, emitToast]);

  // Sincronizar page com URL: quando estiver em /clientes/*, considerar página "clients" (sidebar ativo)
  useEffect(() => {
    if (location.pathname.startsWith('/clientes')) {
      _setPage('clients');
    }
  }, [location.pathname]);
  
  const handleNavigationAttempt = useCallback((targetPage: Page) => {
    console.log(`[App] handleNavigationAttempt: ${pageRef.current} → ${targetPage} (page atual: ${page})`);
    console.log(`[App] dirtyFormRef:`, dirtyFormRef.current);
    
    // Usar page atual em vez de pageRef para verificação mais precisa
    if (page === targetPage) {
      console.log(`[App] ⚠️ Já está na página ${targetPage}, ignorando`);
      return; 
    }

    if (dirtyFormRef.current.save) {
        console.log(`[App] ⚠️ Formulário sujo, pedindo confirmação`);
        showConfirmation({
            title: t('confirm_discard_changes_title'),
            message: t('confirm_discard_changes'),
            confirmText: t('continue_editing'),
            cancelText: t('discard'),
            onConfirm: () => {
                console.log(`[App] Usuário escolheu continuar editando`);
            },
            onCancel: () => {
                console.log(`[App] ✅ Usuário confirmou descarte`);
                if (dirtyFormRef.current.discard) {
                    dirtyFormRef.current.discard();
                }
                dirtyFormRef.current = {};
                executeNavigation(targetPage);
            }
        });
    } else {
        console.log(`[App] ✅ Sem formulário sujo, navegando diretamente`);
        executeNavigation(targetPage);
    }
  }, [page, t, showConfirmation, executeNavigation]);

  // Removido estado isNavigating - navegação simplificada

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === Theme.DARK) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);
  
  // Após autenticar, não piscar tela de pagamento; gating decidirá a navegação
  const handleLogin = () => {
    setPage('dashboard'); // Reset página ao fazer login
    setView('dashboard');
  };

  const handleLogout = () => {
    auth?.logout();
    setPage('dashboard'); // Reset página ao fazer logout
    setView('landing');
  };

  const updateSubscription = (tier: PlanTier) => {
      const limits = {
          'plan_1': 1,
          'plan_2': 3,
          'plan_3': 5
      };
      setAgencyProfile(prev => ({
          ...prev,
          subscription: {
              ...prev.subscription,
              tier,
              maxUsers: limits[tier]
          }
      }));
      emitToast(t('plan_changed_toast', { tier: tier.toUpperCase() }));
  };

  const reloadAgency = useCallback(async () => {
    try {
      const agency = await apiGet<any>('/agencies/me');
      setAgencyProfile((prev) => mergeAgencyFromApi(agency, prev));
    } catch {}
  }, [setAgencyProfile]);

  const addTeamMember = async (user: User) => {
      try {
          const res =           await apiPost<{ devInviteUrl?: string }>('/users/invite', {
              email: user.email.trim().toLowerCase(),
              fullName: user.name.trim(),
              role: user.role === 'admin' ? 'admin' : 'editor',
              permissions: user.permissions,
              operationalRole: user.operationalRole ?? 'OUTRO',
              canBeTaskOwner: user.canBeTaskOwner !== false,
              canBePostOwner: user.canBePostOwner !== false,
              canBeClientOwner: user.canBeClientOwner !== false,
              canBePlanningOwner: user.canBePlanningOwner !== false,
              agencyRoleId: user.agencyRoleId,
              ...(user.functions?.length ? { functions: user.functions } : {}),
          });
          await reloadAgency();
          logActivity({
            v: 2,
            verb: 'added',
            item: 'member',
            name: user.name,
            page: 'account',
            accountTab: 'team',
          });
          return { devInviteUrl: res.devInviteUrl };
      } catch (e) {
          emitToast(t('team_invite_failed_toast'));
          throw e;
      }
  };

  const updateTeamMember = async (
    user: User,
    opts?: { skipAgencyReload?: boolean; activityAccountTab?: ActivityHistoryAccountTabV2 },
  ) => {
      try {
          await apiPut(`/users/${user.id}`, {
              email: user.email,
              fullName: user.name,
              role: user.role,
              permissions: user.permissions,
              avatarUrl: user.avatarUrl ?? null,
              jobTitle: user.jobTitle ?? null,
              phone: user.phone ?? null,
              birthDate: user.birthDate ?? null,
              operationalRole: user.operationalRole ?? 'OUTRO',
              canBeTaskOwner: user.canBeTaskOwner !== false,
              canBePostOwner: user.canBePostOwner !== false,
              canBeClientOwner: user.canBeClientOwner !== false,
              canBePlanningOwner: user.canBePlanningOwner !== false,
              agencyRoleId: user.agencyRoleId ?? null,
              ...(user.functions !== undefined ? { functions: user.functions } : {}),
              ...(agencyProfile.operationMode === 'lean' && user.role !== 'owner'
                ? {
                    simpleAccessLevel: inferSimpleAccessFromMember(user, agencyProfile.agencyRoles ?? []),
                  }
                : {}),
          });
          if (!opts?.skipAgencyReload) {
              await reloadAgency();
          }
          if (auth?.user?.id === user.id) {
              await auth.refreshMe();
          }
          logActivity({
            v: 2,
            verb: 'updated',
            item: 'member',
            name: user.name,
            page: 'account',
            accountTab: opts?.activityAccountTab ?? 'team',
          });
      } catch {
          emitToast(t('team_member_update_failed'));
      }
  };

  const removeTeamMember = async (userId: string) => {
      const member = agencyProfile.teamMembers.find(u => u.id === userId);
      if (member?.role === 'owner') {
          emitToast(t('team_owner_remove_forbidden'));
          return;
      }
      try {
          await apiDelete(`/users/${userId}`);
          await reloadAgency();
          if (member)
            logActivity({
              v: 2,
              verb: 'removed',
              item: 'member',
              name: member.name,
              page: 'account',
              accountTab: 'team',
            });
      } catch {
          emitToast(t('team_member_remove_failed'));
      }
  };

  const contextValue: AppContextType = useMemo(() => ({
    page,
    setPage: handleNavigationAttempt,
    language,
    setLanguage,
    theme,
    setTheme,
    t,
    clients,
    setClients,
    tasks,
    setTasks,
    notifications,
    workflows,
    setWorkflows,
    colorSchemes,
    setColorSchemes,
    clientWorkflowId,
    setClientWorkflowId,
    generalWorkflowId,
    setGeneralWorkflowId,
    financialEntries,
    setFinancialEntries,
    financialExpenses,
    setFinancialExpenses,
    currentUser: mappedUser as any,
    login: handleLogin,
    logout: handleLogout,
    hasPermission,
    canViewModule,
    canEditModule,
    getModulePermissions,
    isOperationalProfile,
    agencyMode: auth?.user?.agencyMode || 'SOLO', // Usar agencyMode do AuthContext
    agencyProfile,
    setAgencyProfile,
    registerDirtyForm,
    showConfirmation,
    updateSubscription,
    addTeamMember,
    updateTeamMember,
    removeTeamMember,
    reloadAgency,
    activityLog,
    logActivity,
    notify: (message: string) => emitToast(message),
    notifyBanner: (message: string) => {
      if (bannerTimerRef.current != null) window.clearTimeout(bannerTimerRef.current);
      setBannerMessage(message);
      bannerTimerRef.current = window.setTimeout(() => {
        setBannerMessage(null);
        bannerTimerRef.current = null;
      }, 5200);
    },
  }), [
    page, handleNavigationAttempt, language, setLanguage, theme, setTheme, t,
    clients, setClients, tasks, setTasks, notifications, workflows, setWorkflows,
    colorSchemes, setColorSchemes,
    clientWorkflowId, setClientWorkflowId, generalWorkflowId, setGeneralWorkflowId,
    financialEntries, setFinancialEntries, financialExpenses, setFinancialExpenses,
    mappedUser, handleLogin, handleLogout, hasPermission, canViewModule, canEditModule, getModulePermissions, isOperationalProfile, agencyProfile, setAgencyProfile,
    registerDirtyForm, showConfirmation, emitToast, updateSubscription, addTeamMember,
    updateTeamMember, removeTeamMember, reloadAgency, activityLog, logActivity
  ]);

  const renderPage = () => {
    const denyModuleBack = () => {
      navigate('/');
      _setPage(isOperationalProfile ? 'producao' : 'dashboard');
    };
    try {
    // Rotas React Router para clientes: useParams() só funciona dentro de Route
    if (location.pathname.startsWith('/clientes')) {
      if (!canViewModule('clients')) {
        return <ModuleAccessDenied onBack={denyModuleBack} />;
      }
      return (
        <Routes>
          <Route path="/clientes/new" element={<ClientsPage />} />
          <Route path="/clientes/:id/apresentacao" element={<ClientsPage />} />
          <Route path="/clientes/:id" element={<ClientsPage />} />
          <Route path="/clientes" element={<ClientsPage />} />
        </Routes>
      );
    }
    switch(page) {
      case 'dashboard':
        if (isOperationalProfile) {
          if (!canViewModule('posts')) return <ModuleAccessDenied onBack={denyModuleBack} />;
          return <ProducaoPage />;
        }
        return <DashboardPage />;
      case 'producao':
        if (!canViewModule('posts')) return <ModuleAccessDenied onBack={denyModuleBack} />;
        return <ProducaoPage />;
      case 'agenda':
        if (!canViewModule('agenda')) return <ModuleAccessDenied onBack={denyModuleBack} />;
        return <AgendaPage />;
      case 'tarefas':
        if (!canViewModule('tasks')) return <ModuleAccessDenied onBack={denyModuleBack} />;
        return <TarefasPage />;
      case 'planejamento':
        if (!canViewModule('planning')) return <ModuleAccessDenied onBack={denyModuleBack} />;
        return <PlanningPage />;
      case 'clients':
        if (!canViewModule('clients')) return <ModuleAccessDenied onBack={denyModuleBack} />;
        return <ClientsPage />;
      case 'finance':
        if (!canViewModule('financial')) return <ModuleAccessDenied onBack={denyModuleBack} />;
        return <FinancePage />;
      case 'settings':
        if (!canViewModule('settings')) return <ModuleAccessDenied onBack={denyModuleBack} />;
        return <AgencySettingsPage />;
      case 'account':
        return <AccountSettingsPage />;
      default:
        if (isOperationalProfile && canViewModule('posts')) {
          return <ProducaoPage />;
        }
        return <DashboardPage />;
      }
    } catch (error) {
      console.error(`[App] ❌ ERRO ao renderizar página ${page}:`, error);
      return <div style={{padding: '20px', color: 'red'}}>
        <h2>Erro ao carregar página</h2>
        <p>{String(error)}</p>
        <button onClick={() => _setPage('dashboard')}>Voltar ao Dashboard</button>
      </div>;
    }
  }
  
  // After login: fetch live agency and decide gating
  const hasInitializedRef = useRef(false);
  
  React.useEffect(() => {
    if (!mappedUser) {
      hasInitializedRef.current = false;
      return;
    }
    
    // Só executa UMA VEZ após login
    if (hasInitializedRef.current) {
      console.log(`[App] ⚠️ Agency fetch já executado, ignorando`);
      return;
    }
    
    console.log(`[App] 🔄 Buscando dados da agência...`);
    hasInitializedRef.current = true;
    
    (async () => {
      // Não mudar a view aqui para evitar piscar o pagamento; aguardamos a decisão
      try {
        const agency = await apiGet<any>('/agencies/me');
        console.log(`[App] ✅ Dados da agência recebidos, cardOnFile:`, agency.cardOnFile);
        
        setAgencyProfile((prev) => mergeAgencyFromApi(agency, prev));
        
        // Carregar workflows do backend e garantir uso dos fixos
        try {
          const workflowsBackend = await apiGet<any[]>('/workflows');
          console.log(`[App] ✅ Workflows carregados do backend:`, workflowsBackend.length);
          
          // Converter workflows do backend para formato do frontend
          const workflowsMap: Record<string, Workflow> = {};
          let resolvedPostsWorkflowId = '';
          let resolvedGeneralWorkflowId = '';
          
          workflowsBackend.forEach((wf: any) => {
            const converted = convertBackendWorkflowToFrontend(wf);
            workflowsMap[wf.id] = converted;
            
            // Identificar workflows fixos
            if (wf.category === 'client' && !wf.isCustom) {
              resolvedPostsWorkflowId = wf.id;
            }
            if (wf.category === 'general' && !wf.isCustom) {
              resolvedGeneralWorkflowId = wf.id;
            }
          });
          
          // Garantir que temos os workflows fixos
          if (!resolvedPostsWorkflowId || !resolvedGeneralWorkflowId) {
            console.warn(`[App] ⚠️ Workflows fixos não encontrados, usando fallback`);
            // Se não encontrou, usar IDs do localStorage ou criar fallback
            if (!resolvedPostsWorkflowId) {
              resolvedPostsWorkflowId = Object.keys(workflowsMap).find(id => workflowsMap[id].category === 'client' && !workflowsMap[id].isCustom) || 'fallback-posts';
            }
            if (!resolvedGeneralWorkflowId) {
              resolvedGeneralWorkflowId = Object.keys(workflowsMap).find(id => workflowsMap[id].category === 'general' && !workflowsMap[id].isCustom) || 'fallback-general';
            }
          }
          
          // Atualizar estado com workflows do backend
          setWorkflows(workflowsMap);
          if (resolvedPostsWorkflowId) setClientWorkflowId(resolvedPostsWorkflowId);
          if (resolvedGeneralWorkflowId) setGeneralWorkflowId(resolvedGeneralWorkflowId);

          setWorkflows((prev) =>
            applyActiveColorSchemes(
              prev,
              colorSchemesRef.current,
              resolvedPostsWorkflowId || clientWorkflowId,
              resolvedGeneralWorkflowId || generalWorkflowId,
            ),
          );

          console.log(`[App] ✅ Workflows fixos identificados: POSTS=${resolvedPostsWorkflowId}, GENERAL=${resolvedGeneralWorkflowId}`);
        } catch (err) {
          console.error(`[App] ❌ Erro ao carregar workflows:`, err);
          // Continuar com workflows do localStorage em caso de erro
        }

        // Carrega `context.clients` com dados completos (avatar/cor/etc.) — para id+name leve, ver `useAgencyClientsRoster`.
        try {
          const clientsBackend = await apiGet<{ items: any[]; total: number }>('/clients', { page: 1, pageSize: 1000 });
          const mappedClients = (clientsBackend?.items || []).map((c: any) => normalizeClient(c as Record<string, unknown>));
          if (mappedClients.length > 0) setClients(mappedClients);
        } catch (err) {
          console.warn(`[App] ⚠️ Erro ao carregar clientes:`, err);
        }
        
        const isOwner = mappedUser?.role === 'owner';

        // Membros convidados não passam por cobrança/onboarding da agência do owner
        if (!agency.cardOnFile) {
          if (isOwner) {
            console.log(`[App] 💳 Sem cartão (owner), redirecionando para payment`);
            setView('payment');
            return;
          }
          console.log(`[App] ✅ Membro: sem gate de cartão`);
          setView('dashboard' as any);
          return;
        }

        console.log(`[App] ✅ Cartão OK, verificando onboarding`);
        if (!agency.onboardingCompleted) {
          if (isOwner) {
            console.log(`[App] 📋 Onboarding não completo (owner)`);
            setView('onboarding' as any);
            return;
          }
          console.log(`[App] ✅ Membro: sem onboarding de nova agência`);
          setView('dashboard' as any);
        } else {
          console.log(`[App] ✅ Onboarding completo, indo para dashboard`);
          setView('dashboard' as any);
        }
      } catch (err) {
        console.error(`[App] ❌ Erro ao buscar agência:`, err);
        // Em falha, mantém dashboard; usuário já autenticado
        setView('dashboard' as any);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mappedUser?.id, mappedUser?.role]);

  // Logado: URL da landing v2 não deve ficar órfã (evita /landing-v2 + shell do app).
  useEffect(() => {
    if (mappedUser && location.pathname === '/landing-v2') {
      navigate('/', { replace: true });
    }
  }, [mappedUser, location.pathname, navigate]);

  // Migração defensiva: se algum storage antigo tiver onboardingStep=agency_setup, marcar como completed
  React.useEffect(() => {
    if (!mappedUser) return;
    try {
      const keys = ['flow.onboardingStep', 'onboardingStep'];
      for (const k of keys) {
        const raw = window.localStorage.getItem(k);
        if (!raw) continue;
        const val = (() => {
          try { return JSON.parse(raw); } catch { return raw; }
        })();
        if (val === 'agency_setup') {
          window.localStorage.setItem(k, JSON.stringify('completed'));
        }
      }
    } catch {}
  }, [mappedUser?.id]);

  // Decide content AFTER all hooks are declared
  let content: React.ReactNode = null;
  if (!mappedUser) {
    if (location.pathname.startsWith('/invite/accept')) {
      content = <InviteAcceptPage />;
    } else if (location.pathname.startsWith('/reset-password')) {
      content = <PasswordResetPage />;
    } else if (location.pathname === '/landing-v2') {
      content = (
        <LandingPageV2
          onNavigateToSignup={() => {
            navigate('/');
            setView('signup');
          }}
          onNavigateToLogin={() => {
            navigate('/');
            setView('login');
          }}
          onBackToClassicLanding={() => {
            navigate('/');
            setView('landing');
          }}
        />
      );
    } else {
      content = (
        <>
          {view === 'landing' && (
            <LandingPage
              onNavigateToLogin={() => setView('login')}
              onNavigateToSignup={() => setView('signup')}
            />
          )}
          {view === 'login' && <LoginPage onLogin={handleLogin} onNavigateToLanding={() => setView('landing')} onNavigateToSignup={() => setView('signup')} />}
          {view === 'signup' && <SignupPage onSignup={handleLogin} onNavigateToLogin={() => setView('login')} onNavigateToLanding={() => setView('landing')} />}
        </>
      );
    }
  } else if (view === 'payment') {
    content = (
      <PaymentPage
        onSuccess={() => {
          // Após pagamento, verificar onboarding
          // O useEffect vai verificar e redirecionar para onboarding ou dashboard
          setView('dashboard' as any);
        }}
        onBack={() => { auth?.logout(); setView('signup'); }}
      />
    );
  } else if (view === 'onboarding') {
    content = (
      <OnboardingSetupPage
        onComplete={async () => {
          // Recarregar dados do usuário para atualizar agencyMode e flags de onboarding
          await auth?.refreshMe();
          // Recarregar dados da agência também
          try {
            const agency = await apiGet<any>('/agencies/me');
            setAgencyProfile((prev) => mergeAgencyFromApi(agency, prev));
          } catch (err) {
            console.error('Erro ao recarregar dados da agência:', err);
          }
          // Ir para dashboard após completar onboarding
          setView('dashboard' as any);
        }}
        initialMode={auth?.user?.agencyMode || 'SOLO'}
        initialShowGuidedTour={auth?.user?.onboarding?.showGuidedTour ?? true}
      />
    );
  } else {
    content = (
      <>
        {bannerMessage ? (
          <div
            className="fixed top-4 left-1/2 z-[300] flex max-w-[min(100vw-1.5rem,28rem)] -translate-x-1/2 justify-center px-3 pointer-events-none"
            role="status"
            aria-live="polite"
          >
            <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-violet-300/40 bg-violet-600 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-violet-900/30">
              <span className="text-center leading-snug">{bannerMessage}</span>
              <button
                type="button"
                onClick={() => {
                  if (bannerTimerRef.current != null) window.clearTimeout(bannerTimerRef.current);
                  bannerTimerRef.current = null;
                  setBannerMessage(null);
                }}
                className="shrink-0 rounded-lg p-1 text-white/90 hover:bg-white/15"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
          </div>
        ) : null}
        <ConfirmationModal 
          isOpen={!!confirmationProps}
          t={t}
          {...confirmationProps}
        />
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
          {isMobileMenuOpen && <div className="fixed inset-0 bg-black/30 z-20 md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>}
          <div className="flex-1 flex flex-col md:ml-64 overflow-hidden min-h-0">
            <div className="md:hidden flex-shrink-0 flex items-center h-12 px-3 bg-gradient-to-r from-indigo-500 to-purple-600 shadow-sm border-b border-white/10">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 rounded-lg text-white hover:bg-white/15 transition-colors"
                aria-label="Menu"
              >
                <MenuIcon className="w-6 h-6" />
              </button>
            </div>
            <main className="app-main-scroll relative min-h-0 flex-1 overflow-y-auto">
              <PageErrorBoundary
                key={page}
                goDashboard={() => setPage(isOperationalProfile ? 'producao' : 'dashboard')}
                onErrorFallback={(error, reset, goDashboard) => (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
                    <p className="text-gray-600 dark:text-gray-400">{t('error_loading_page')}</p>
                    <button
                      onClick={goDashboard}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      {t('back_to_dashboard')}
                    </button>
                  </div>
                )}
              >
                <React.Suspense fallback={
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin h-6 w-6 rounded-full border-2 border-indigo-600 border-t-transparent"></div>
                  </div>
                }>
                  {renderPage()}
                </React.Suspense>
              </PageErrorBoundary>
            </main>
            {typeof document !== 'undefined' &&
              createPortal(
                <div className="pointer-events-none fixed bottom-6 right-6 z-[100]">
                  <TooltipHint label={t('chat_with_ai')} className="pointer-events-auto inline-flex" portalZIndex={10050}>
                    <button
                      type="button"
                      onClick={() => setIsAiChatOpen(true)}
                      aria-label={t('chat_with_ai')}
                      className="bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-transform transform hover:scale-110"
                    >
                      <SparklesIcon className="w-6 h-6" />
                    </button>
                  </TooltipHint>
                </div>,
                document.body,
              )}
            {toast.open &&
              typeof document !== 'undefined' &&
              createPortal(
                <div className="pointer-events-none fixed bottom-24 right-6 z-[200] flex max-w-[min(100vw-2rem,20rem)] items-end justify-end sm:bottom-24">
                  <div className="pointer-events-auto flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-900/95 px-4 py-3 text-[14px] leading-snug text-white shadow-lg backdrop-blur-sm dark:bg-gray-800/95">
                    <span>{toast.message}</span>
                    <button
                      type="button"
                      onClick={() => setToast({ open: false, message: '' })}
                      className="-mr-1 rounded p-1 text-gray-300 hover:bg-gray-700/80 hover:text-white"
                      aria-label="Fechar"
                    >
                      ×
                    </button>
                  </div>
                </div>,
                document.body,
              )}
          </div>
          <AIChatModal isOpen={isAiChatOpen} onClose={() => setIsAiChatOpen(false)} />
        </div>
      </>
    );
  }

  return (
    <AppContext.Provider value={contextValue}>
      <AgencyClientsRosterProvider enabled={!!mappedUser}>{content}</AgencyClientsRosterProvider>
    </AppContext.Provider>
  );
};

export default App;