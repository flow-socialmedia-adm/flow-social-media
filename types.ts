import React from 'react';
import type { BriefingV2 } from './lib/briefingV2/types';
import type { ClientStageKey } from './lib/client-stage-keys';
import { CLIENT_STAGE_KEYS } from './lib/client-stage-keys';
import type { AgencyModuleKey, ModuleAccessLevel } from './lib/modulePermissions';

/** Etapas canónicas de responsáveis por etapa — manter alinhado ao backend (`client-owner.constants.ts`). */
export { CLIENT_STAGE_KEYS, type ClientStageKey };

export enum Language {
  EN = 'en',
  PT = 'pt',
  ES = 'es',
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
}

// 'team' and 'billing' are removed as top-level pages, they are now tabs within 'account'
export type Page = 'dashboard' | 'producao' | 'agenda' | 'tarefas' | 'clients' | 'planejamento' | 'finance' | 'settings' | 'account';

export type StatusCategory = 'todo' | 'in_progress' | 'done' | 'canceled';

export interface StatusDefinition {
  id: string;
  nameKey: string;
  color: { bg: string; text: string; border: string; ring: string; };
  category: StatusCategory;
  isCustom?: boolean;
}

export interface Workflow {
  id:string;
  nameKey: string;
  statuses: StatusDefinition[];
  isCustom?: boolean;
  category: 'client' | 'general';
}

/** Preferências de esquema de cores por área (posts / tarefas gerais). */
export type ColorSchemeAreaKey = 'posts' | 'tasks';

export type ColorSchemeActiveKind = 'default' | 'custom';

export interface ColorSchemeCustomData {
  id: 'custom';
  name: string;
  colors: Record<string, StatusDefinition['color']>;
}

export interface ColorSchemeAreaPreference {
  active: ColorSchemeActiveKind;
  custom: ColorSchemeCustomData | null;
}

export interface ColorSchemesPreferences {
  posts: ColorSchemeAreaPreference;
  tasks: ColorSchemeAreaPreference;
}

export type UserRole = 'owner' | 'admin' | 'editor';

/** Nível de acesso da função (AgencyRole.accessLevel). */
export type AgencyAccessLevel = 'ADMIN' | 'MANAGER' | 'OPERATIONAL' | 'FINANCIAL' | 'VIEWER';

export type AgencyRolePermissions = Record<AgencyModuleKey, ModuleAccessLevel>;

export interface AgencyRoleFlags {
	canBeResponsiblePosts: boolean;
	canBeResponsibleTasks: boolean;
	canBeResponsibleClients: boolean;
	canBeResponsiblePlanning: boolean;
}

export interface AgencyRole {
	id: string;
	name: string;
	accessLevel: AgencyAccessLevel | string;
	permissions: AgencyRolePermissions | Record<string, ModuleAccessLevel>;
	flags: AgencyRoleFlags | Record<string, boolean>;
	isSystem?: boolean;
	systemKey?: string | null;
	createdAt?: string;
	updatedAt?: string;
}

/** Função operacional (separada do perfil de acesso). Alinhado ao enum Prisma OperationalRole. */
export type OperationalRole =
  | 'SOCIAL_MEDIA'
  | 'DESIGNER'
  | 'VIDEO_EDITOR'
  | 'ATENDIMENTO'
  | 'GESTOR'
  | 'APROVACAO'
  | 'OUTRO';

export type DefaultOwnerStrategy = 'AGENCY_OWNER' | 'MANUAL';

/** Modo operacional descritivo da agência (independe de SOLO/TEAM em `mode`). */
export type AgencyOperationMode = 'solo' | 'lean' | 'structured';

/** Nível simples de acesso (modo lean). No modo structured a resolução ignora este campo. */
export type SimpleAccessLevel =
	| 'colaboracao'
	| 'gerenciar'
	| 'acesso_total'
	| 'administrador'
	| 'gestor'
	| 'operacional'
	| 'financeiro';

/** Preferência base para responsável pelo cliente (persistida; efeito nas telas em fase posterior). */
export type ClientResponsibleMode = 'default_member' | 'per_client_planning';

export type Permission =
	| 'view_dashboard'
	| 'view_agenda'
	| 'manage_clients'
	| 'view_clients'
	| 'manage_finance'
	| 'view_finance'
	| 'manage_team'
	| 'view_team'
	| 'manage_settings'
	| 'view_settings';

export type MemberInviteStatus = 'pending_invite' | 'active' | 'disabled';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: UserRole;
  permissions: Permission[]; // Granular access control
  password?: string; // Mock password for demo
  
  // Expanded Profile Data
  phone?: string;
  jobTitle?: string;
  /** ISO yyyy-mm-dd (perfil pessoal) */
  birthDate?: string;
  address?: Address;
  socialLinks?: SocialLink[];

  /** Função operacional (não confundir com role de acesso) */
  operationalRole?: OperationalRole;
  canBeTaskOwner?: boolean;
  canBePostOwner?: boolean;
  canBeClientOwner?: boolean;
  canBePlanningOwner?: boolean;

  /** Template de função da agência (`AgencyRole`), quando atribuído */
  agencyRoleId?: string | null;

  /** Funções operacionais múltiplas (complemento a `agencyRoleId` / permissões). */
  functions?: string[];

  /** Modo lean: permissões sem depender de `agencyRoleId`. */
  simpleAccessLevel?: SimpleAccessLevel | null;

  /** Convite / conta (API) */
  inviteStatus?: MemberInviteStatus;
  invitedAt?: string | null;
  activatedAt?: string | null;
}

export type PlanTier = 'plan_1' | 'plan_2' | 'plan_3';

export interface Subscription {
    tier: PlanTier;
    status: 'active' | 'canceled' | 'past_due' | 'trialing';
    maxUsers: number;
    renewsAt: string;
}

export interface AgencyProfile {
    name: string;
    avatarUrl?: string;
    contactEmail?: string;
    whatsapp?: string;
    /** Telefone fixo da agência (espelha `phone` retornado pela API). */
    landlinePhone?: string;
    baseCurrency: Currency;
    subscription: Subscription;
    teamMembers: User[];
    
    // Expanded Agency Data
    cnpj?: string;
    address?: Address;
    socialLinks?: SocialLink[];
    
    // Early subscription model fields for single-plan rollout
    plan_tier?: 'agencia' | 'starter' | 'pro' | 'premium';
    trial_start?: string; // ISO date
    trial_end?: string;   // ISO date
    subscription_status?: 'trialing' | 'active' | 'canceled' | 'past_due';

    /** Estratégia de responsável padrão (nível agência) */
    defaultOwnerStrategy?: DefaultOwnerStrategy;
  /** Permitir configuração de responsáveis por etapa (fases futuras) */
  allowStageOwners?: boolean;

  /** Funções reutilizáveis (templates) definidas na agência */
  agencyRoles?: AgencyRole[];

  /** Modo de operação (solo / lean / structured); não altera `agencyMode` SOLO/TEAM. */
  operationMode?: AgencyOperationMode;

  clientResponsibleMode?: ClientResponsibleMode;
  defaultClientOwnerUserId?: string | null;
}

export type FinancialStatus = 'pending' | 'paid' | 'overdue';
export type RecurrenceFrequency = 'weekly' | 'monthly' | 'yearly';

export interface FinancialEntry {
  id: string;
  clientId?: string; 
  serviceId?: string; 
  description: string;
  category: string; 
  value: number;
  currency?: Currency; 
  dueDate: string; 
  paymentDate?: string; 
  status: FinancialStatus;
  recurrence?: RecurrenceFrequency;
}

export interface FinancialExpense {
  id: string;
  supplier?: string;
  description: string;
  category: string;
  value: number;
  currency?: Currency;
  dueDate: string; 
  paymentDate?: string; 
  status: FinancialStatus;
  recurrence?: RecurrenceFrequency;
  attachmentUrl?: string;
}

/** Verbo da linha v2 do histórico global (coluna Ação). */
export type ActivityHistoryVerbV2 = 'created' | 'updated' | 'deleted' | 'added' | 'removed';

/** Tipo de item (trecho após o verbo, ex.: “o post”). */
export type ActivityHistoryItemV2 =
	| 'post'
	| 'forecast'
	| 'task'
	| 'client'
	| 'member'
	| 'settings_agency'
	| 'income'
	| 'expense';

/**
 * Página de origem da ação (entre parênteses, sozinha ou com guia).
 * `posts` = fluxo de posts no Planejamento (menu Planejamento / calendário semanal).
 * `editorial` = Produção / calendário editorial operacional.
 */
export type ActivityHistoryPageV2 = 'tasks' | 'editorial' | 'agenda' | 'posts' | 'clients' | 'financial' | 'account';

/** Guia do cliente (Clientes / …). Alinhado a TabId em ClientPresentationView. */
export type ActivityHistoryClientSectionV2 =
	| 'overview'
	| 'identity'
	| 'client_data'
	| 'brand_guide'
	| 'strategy'
	| 'planning'
	| 'contract'
	| 'finance';

/** Guia em Minha Conta. */
export type ActivityHistoryAccountTabV2 = 'details' | 'team' | 'billing';

/** Payload estruturado v2 — persistido em `detailsJson.line` na API. */
export interface ActivityHistoryLineV2 {
	v: 2;
	verb: ActivityHistoryVerbV2;
	item: ActivityHistoryItemV2;
	name: string;
	page: ActivityHistoryPageV2;
	clientSection?: ActivityHistoryClientSectionV2;
	accountTab?: ActivityHistoryAccountTabV2;
}

export interface ActivityLogEntry {
	id: string;
	userId: string;
	userName: string;
	timestamp: string;
	/** Linha semântica v2 (verbo + tipo + nome + origem). */
	line?: ActivityHistoryLineV2;
	/** Legado: chave i18n `act_*` ou texto técnico antigo. */
	actionKey?: string;
	targetName?: string;
}

export type AppContextType = {
  // Navigation
  page: Page;
  setPage: (page: Page) => void;

  // i18n & Theme
  language: Language;
  setLanguage: (language: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  t: (key: string, replacements?: Record<string, string>) => string;

  // Data & Workflows
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  notifications: Notification[];
  workflows: Record<string, Workflow>;
  setWorkflows: React.Dispatch<React.SetStateAction<Record<string, Workflow>>>;
  colorSchemes: ColorSchemesPreferences;
  setColorSchemes: React.Dispatch<React.SetStateAction<ColorSchemesPreferences>>;
  clientWorkflowId: string;
  setClientWorkflowId: (id: string) => void;
  generalWorkflowId: string;
  setGeneralWorkflowId: (id: string) => void;

  // Finance
  financialEntries: FinancialEntry[];
  setFinancialEntries: React.Dispatch<React.SetStateAction<FinancialEntry[]>>;
  financialExpenses: FinancialExpense[];
  setFinancialExpenses: React.Dispatch<React.SetStateAction<FinancialExpense[]>>;

  // Auth & User Management
  currentUser: User | null;
  login: (email: string) => void; 
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
  /** Permissões por módulo (função + legado; owner/admin com acesso total). */
  canViewModule: (module: AgencyModuleKey) => boolean;
  canEditModule: (module: AgencyModuleKey) => boolean;
  getModulePermissions: () => AgencyRolePermissions;
  /** Função com accessLevel OPERATIONAL (execução; sem dashboard geral; responsável travado no TEAM). */
  isOperationalProfile: boolean;
  agencyMode?: 'SOLO' | 'TEAM'; // Modo da agência (SOLO ou TEAM)
  
  // Agency Profile & Subscription
  agencyProfile: AgencyProfile;
  setAgencyProfile: React.Dispatch<React.SetStateAction<AgencyProfile>>;
  updateSubscription: (tier: PlanTier) => void;
  addTeamMember: (user: User) => Promise<{ devInviteUrl?: string } | void>;
  updateTeamMember: (
    user: User,
    opts?: { skipAgencyReload?: boolean; activityAccountTab?: ActivityHistoryAccountTabV2 },
  ) => Promise<void>;
  removeTeamMember: (userId: string) => void;
  /** Recarrega /agencies/me e sincroniza agencyProfile (equipe + campos da agência) */
  reloadAgency: () => Promise<void>;

  // Activity Log
  activityLog: ActivityLogEntry[];
  logActivity: (line: ActivityHistoryLineV2) => void;

  // Unsaved Changes & Confirmation Modal
  registerDirtyForm: (isDirty: boolean, saveFn?: () => void, discardFn?: () => void) => void;
  showConfirmation: (options: {
    title: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
  }) => void;

  // Toast notifications
  notify?: (message: string) => void;
  /** Aviso discreto no topo (ex.: após salvar cores do fluxo). */
  notifyBanner?: (message: string) => void;
};


export enum PostType {
  STATIC = 'static',
  VIDEO = 'video',
  CAROUSEL = 'carousel',
  REELS = 'reels',
  STORY = 'story',
}

export interface ClientContact {
    id: string;
    name: string;
    role: string;
    email: string;
    whatsapp?: string;
    landlinePhone?: string;
    notes?: string;
    isPrimary?: boolean;
}

export type SocialPlatform = 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'x' | 'youtube' | 'pinterest' | 'website' | 'email';

export interface SocialLink {
    platform: SocialPlatform;
    url: string;
}

export interface BrandColor {
    hex: string;
    name: string;
    /** Exibir na apresentação/landing */
    showInPresentation?: boolean;
}

export interface BrandAsset {
    id: string;
    name: string;
    type: 'logo' | 'brand_book' | 'font' | 'photo' | 'graphic' | 'icon' | 'other';
    /** URL ou data URL (base64) para download/visualização */
    url?: string;
}

export interface AccessCredential {
    id: string;
    platform: SocialPlatform;
    displayName?: string;
    username: string;
    password?: string;
    notes?: string;
}

export type PaymentFrequency = 'monthly' | 'yearly' | 'once';

export type ServiceStatus = 'active' | 'paused' | 'canceled' | 'completed';

export interface Service {
    id: string;
    name: string;
    value: number | null;
    frequency: PaymentFrequency;
    startDate?: string;
    endDate?: string;
    contractUrl?: string;
    /** Dia do mês para pagamento (1–31) – contratos recorrentes */
    paymentDay?: number;
    /** Status do serviço */
    status?: ServiceStatus;
}

export type Currency = 'BRL' | 'USD' | 'EUR';

export interface Address {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
}

/** Preferências persistidas em clientOwnerPreferencesJson (API). */
export interface ClientOwnerPreferences {
  defaultOwnerUserId: string | null;
  useDefaultOwnerForAllStages: boolean;
  stageOwnerMap: Partial<Record<ClientStageKey, string>>;
}

export type ClientOwnerPreferencesDraft = ClientOwnerPreferences;

/** Resultado da cadeia de fallback (pré-visualização / futura autoatribuição). */
export interface ResolvedClientOwnerPreferences {
  resolvedDefaultUserId: string | null;
  stageResolved: Record<ClientStageKey, string | null>;
}

export interface Client {
  id: string;
  name: string;
  color: string;
  avatarUrl?: string;
  createdAt: string; 
  
  // New fiscal/company data
  clientType: 'company' | 'individual';
  companyName?: string;
  cnpj?: string;
  companyStateRegistration?: string;
  companyLandlinePhone?: string;
  companyPhone?: string;
  address?: Address;
  legalRepresentativeName?: string;
  legalRepresentativeRg?: string;
  legalRepresentativeEmail?: string;
  legalRepresentativeWhatsapp?: string;
  legalRepresentativeRole?: string;
  legalRepresentativeBirthDate?: string;
  cpf?: string;
  legalRepresentativeAddress?: Address;
  isLegalAddressSameAsCompany?: boolean;
  currency?: Currency;

  website?: string;
  socialLinks?: SocialLink[];
  contacts?: ClientContact[];
  
  brandColors?: BrandColor[];
  /** Índice na paleta da cor usada no cabeçalho; null = nenhuma (usa cinza). Apenas um card pode ser favorito. */
  headerColorIndex?: number | null;
  /** Índice do logo principal em brandAssets (apenas type===logo); null = nenhum (mostra iniciais). Apenas um pode ser favorito. */
  principalLogoIndex?: number | null;
  typography?: {
      primaryFont: string;
      secondaryFont?: string;
      tertiaryFont?: string;
      /** ID do BrandAsset (type font) usado no slot primário, quando enviado por arquivo */
      primaryFontAssetId?: string;
      secondaryFontAssetId?: string;
      tertiaryFontAssetId?: string;
      /** Labels editáveis por agência (ex.: "Título", "Headline") */
      primaryFontLabel?: string;
      secondaryFontLabel?: string;
      tertiaryFontLabel?: string;
  };
  toneOfVoice?: string;
  brandGuidelines?: string;
  dos?: string[];
  donts?: string[];
  brandAssets?: BrandAsset[];

  objectives?: string;
  targetAudience?: string;
  /** Público: Quem é (legacy targetAudience fallback) */
  audienceWho?: string;
  /** Público: Dores */
  audiencePains?: string;
  /** Público: Desejos */
  audienceDesires?: string;
  /** KPIs - texto separado por linha */
  kpis?: string;
  /** Observações estratégicas */
  strategyNotes?: string;
  contentPillars?: string[];
  hashtags?: string[];

  /** Etapa 3B: estratégia expandida */
  businessSummary?: string;
  mainServices?: string;
  differentiators?: string;
  competitors?: string;
  howWantToBePerceived?: string;
  avoidInCommunication?: string;

  /** Etapa A: Essência da Marca */
  brandHistory?: string;
  brandValues?: string;
  brandMission?: string;
  brandVision?: string;
  strategyCompetitors?: Array<{ id: string; name: string; link?: string; strengths?: string; weaknesses?: string; notes?: string }>;
  strategyInspirations?: Array<{ id: string; name: string; link?: string; whatInspires?: string; notes?: string }>;

  /** Etapa A: Público */
  audienceAgeRange?: string;
  audienceRegion?: string;
  audienceGeneralProfile?: string;
  audienceGeneralNotes?: string;
  strategyPersonas?: Array<{ id: string; name: string; description?: string; pains?: string; desires?: string; objections?: string; behavior?: string; photoUrl?: string }>;
  commonObjections?: string;
  wordsThatFit?: string;
  wordsThatDontFit?: string;
  contentStyle?: string;
  preferredCta?: string;
  mainProfileObjective?: string;
  momentObjective?: string;
  monthlyObjective?: string;
  postFrequency?: string;
  /** Estrutura guiada da frequência (compatível com postFrequency) */
  postFrequencyQuantity?: number;
  postFrequencyPeriod?: 'week' | 'month';
  postFrequencyVariable?: boolean;
  preferredPostDays?: string[];
  /** Guia Planejamento (cliente): observações de calendário */
  planningCalendarNotes?: string;
  /** Quantidade média semanal (texto livre; pode complementar a frequência) */
  planningAvgPostsPerWeek?: string;
  /** Dias antes: produção / aprovação / agendamento */
  planningProductionLeadDays?: string;
  planningApprovalLeadDays?: string;
  planningSchedulingLeadDays?: string;
  /** Aprovação obrigatória antes de publicar */
  planningApprovalRequired?: boolean;
  /** Metas / foco do período (acompanhamento; não duplica objetivos estratégicos) */
  planningPeriodFocus?: string;
  /** Observações de performance */
  planningPerformanceNotes?: string;
  /** Operação da conta */
  planningAccountOwner?: string;
  planningApprovalChannel?: string;
  planningClientResponseTime?: string;
  planningOperationNotes?: string;
  strategyContentPillars?: Array<{ id: string; name: string; description?: string; objective?: string; exampleThemes?: string }>;
  /** ISO string - última atualização da estratégia (preenchido ao salvar) */
  strategyLastUpdated?: string;

  /** Briefing Schema V2 — canônico; campos flat são espelho para downstream (dual-read). */
  briefingV2?: BriefingV2;

  contract?: {
      services?: Service[];
  };
  accessCredentials?: AccessCredential[];

  /** Responsáveis na produção (espelho de clientOwnerPreferencesJson). */
  ownerPreferences?: ClientOwnerPreferences;
  
  notes?: string;
}


/** Opcional nas respostas da API após mudança de etapa (modo TEAM + post). */
export type TaskOwnerSuggestion = {
  shouldSuggestOwnerChange: boolean;
  suggestedOwnerUserId: string | null;
  currentOwnerUserId: string | null;
  stageKey: string | null;
};

export interface Task {
  id: string;
  date: string; // YYYY-MM-DD - data de exibição/agenda (publishDate para post, dueDate para tarefa)
  title: string;
  statusId: string;
  workflowId?: string; // ID do workflow original da tarefa
  isGeneral?: boolean;
  clientId?: string;
  postType?: PostType;
  description?: string;
  category?: string; // Para tarefas gerais: Reunião, Planejamento, Criação (Copy/Design), etc.
  ownerUserId?: string;
  // Separação fluxo vs tempo: posts usam publishDate, tarefas usam dueDate
  publishDate?: string; // YYYY-MM-DD - data de publicação (post)
  dueDate?: string; // YYYY-MM-DD - previsão de entrega (tarefa)
  isProvisionalPublishDate?: boolean;
  isProvisionalDueDate?: boolean;
  // Base para histórico e subetapa (próximas fases)
  origin?: string; // planejamento | posts | agenda | geracao_automatica | manual
  bornAsForecast?: boolean;
  convertedToPostAt?: string; // ISO date
  currentActionId?: string; // subetapa/ação atual
  /** Quem criou o registro (API); legado pode vir vazio. */
  createdByUserId?: string;
  /** Atribuição automática por substatus (modo equipe; omitir em solo). */
  executionOwnerUserId?: string;
}

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
}

export interface Notification {
  id: string;
  messageKey: string;
  messageParams?: Record<string, string>;
  type: 'info' | 'warning' | 'alert';
  read: boolean;
  createdAt: string; // ISO string date
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}