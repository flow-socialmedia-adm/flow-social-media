import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useOverflowAnchoredMenu } from '../lib/useOverflowAnchoredMenu';
import type { Task, Workflow, AppContextType, Client, Language } from '../types';
import { PostType as PostTypeEnum } from '../types';
import { getMonthName } from '../lib/utils';
import {
    CONTENT_PAGE_SUBTOOLBAR_STRIP,
    HEADER_GRADIENT_ICON_BUTTON_CLASS,
    HEADER_GRADIENT_SELECT_CLASS,
    HEADER_GRADIENT_TODAY_OR_TEXT_BUTTON_CLASS,
    SUBTOOLBAR_ICON_BUTTON_CLASS,
    SUBTOOLBAR_TEXT_BUTTON_CLASS,
    SUBTOOLBAR_VIEW_ACTIVE_CLASS,
    SUBTOOLBAR_VIEW_INACTIVE_CLASS,
} from '../lib/contentPageHeader';
import { ChevronLeftIcon, ChevronRightIcon, EyeIcon, SlidersHorizontalIcon, AlertTriangleIcon } from './icons';
import FilterDropdown from './tasks/FilterDropdown';
import TooltipHint from './TooltipHint';

const DailyViewIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="12" y1="14" x2="12" y2="18" />
    </svg>
);
const WeeklyViewIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="8" y1="14" x2="8" y2="18" />
        <line x1="12" y1="14" x2="12" y2="18" />
        <line x1="16" y1="14" x2="16" y2="18" />
    </svg>
);
const MonthlyViewIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <circle cx="8" cy="14" r="1" />
        <circle cx="12" cy="14" r="1" />
        <circle cx="16" cy="14" r="1" />
        <circle cx="8" cy="18" r="1" />
        <circle cx="12" cy="18" r="1" />
        <circle cx="16" cy="18" r="1" />
    </svg>
);

const VIEW_ICONS: Record<string, React.FC<{ className?: string }>> = {
    daily: DailyViewIcon,
    weekly: WeeklyViewIcon,
    monthly: MonthlyViewIcon,
};

type AgendaFilters = {
    client: string;
    postType: string;
    category: string;
    status: string;
    workflow: string;
    ownerUserId: string;
};

export type AgendaPageHeaderToolbarProps = {
    t: AppContextType['t'];
    language: string;
    currentDate: Date;
    setCurrentDate: (d: Date) => void;
    handleDateChange: (amount: number) => void;
    view: 'daily' | 'weekly' | 'monthly';
    onSetView: (v: 'daily' | 'weekly' | 'monthly') => void;
    clientWorkflow: Workflow | null | undefined;
    generalWorkflow: Workflow | null | undefined;
    isClientPostsVisible: boolean;
    isGeneralTasksVisible: boolean;
    agendaLegendOpen: boolean;
    setAgendaLegendOpen: React.Dispatch<React.SetStateAction<boolean>>;
    showFiltersPopover: boolean;
    setShowFiltersPopover: React.Dispatch<React.SetStateAction<boolean>>;
    filters: AgendaFilters;
    setFilters: React.Dispatch<React.SetStateAction<AgendaFilters>>;
    clientsForSelect: Pick<Client, 'id' | 'name'>[];
    categoryOptions: { value: string; label: string }[];
    activeStatusOptions: { value: string; label: string }[];
    tasksFromOldWorkflows: Task[];
    oldWorkflowTasks: { past: Task[]; future: Task[] } | null;
    isTeamMode: boolean;
    agencyProfile: { teamMembers?: { id: string; name: string }[] } | null | undefined;
    onOpenMigrationModal: () => void;
    setIsClientPostsVisible: (v: boolean) => void;
    setIsGeneralTasksVisible: (v: boolean) => void;
    addMenu: React.ReactNode;
};

export type AgendaPurpleBarActionsProps = Omit<
    AgendaPageHeaderToolbarProps,
    'language' | 'currentDate' | 'setCurrentDate' | 'handleDateChange' | 'view' | 'onSetView'
>;

/** Controles na faixa roxa: legenda, filtros, exibir, adicionar. */
export const AgendaPurpleBarActions: React.FC<AgendaPurpleBarActionsProps> = ({
    t,
    clientWorkflow,
    generalWorkflow,
    isClientPostsVisible,
    isGeneralTasksVisible,
    agendaLegendOpen,
    setAgendaLegendOpen,
    showFiltersPopover,
    setShowFiltersPopover,
    filters,
    setFilters,
    clientsForSelect,
    categoryOptions,
    activeStatusOptions,
    tasksFromOldWorkflows,
    oldWorkflowTasks,
    isTeamMode,
    agencyProfile,
    onOpenMigrationModal,
    setIsClientPostsVisible,
    setIsGeneralTasksVisible,
    addMenu,
}) => {
    const teamMembers = agencyProfile?.teamMembers ?? [];
    const {
        anchorRef: legendAnchorRef,
        menuRef: legendMenuRef,
        menuBox: legendMenuBox,
    } = useOverflowAnchoredMenu(agendaLegendOpen, setAgendaLegendOpen, { widthPx: 352 });
    const {
        anchorRef: filtersAnchorRef,
        menuRef: filtersMenuRef,
        menuBox: filtersMenuBox,
    } = useOverflowAnchoredMenu(showFiltersPopover, setShowFiltersPopover, { widthPx: 320 });

    const legendPanel = useMemo(() => {
        if (!agendaLegendOpen || !legendMenuBox) return null;
        return (
            <div
                ref={legendMenuRef}
                role="dialog"
                aria-label={t('status_legend_title')}
                style={{
                    position: 'fixed',
                    top: legendMenuBox.top,
                    left: legendMenuBox.left,
                    width: legendMenuBox.width,
                    zIndex: 10000,
                }}
                className="max-h-[min(70vh,28rem)] overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-600 dark:bg-gray-800"
                onClick={(e) => e.stopPropagation()}
            >
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('status_legend_title')}</p>
                {isClientPostsVisible && clientWorkflow && (
                    <div className="mb-4">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{t('posts')}</span>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {clientWorkflow.statuses.map((status) => (
                                <span
                                    key={status.id}
                                    className="inline-flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-800 dark:bg-gray-700/80 dark:text-gray-200"
                                >
                                    <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full border ${status.color.bg} ${status.color.border}`} />
                                    {t(status.nameKey)}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                {isGeneralTasksVisible && generalWorkflow && (
                    <div className="mb-1">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{t('tarefas')}</span>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {generalWorkflow.statuses.map((status) => (
                                <span
                                    key={status.id}
                                    className="inline-flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-800 dark:bg-gray-700/80 dark:text-gray-200"
                                >
                                    <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full border ${status.color.bg} ${status.color.border}`} />
                                    {t(status.nameKey)}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                {!isClientPostsVisible && !isGeneralTasksVisible && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Selecione <strong>{t('posts')}</strong> ou <strong>{t('tarefas')}</strong> ({t('exibir')}) para ver as legendas.
                    </p>
                )}
            </div>
        );
    }, [
        agendaLegendOpen,
        legendMenuBox,
        legendMenuRef,
        t,
        isClientPostsVisible,
        clientWorkflow,
        isGeneralTasksVisible,
        generalWorkflow,
    ]);

    const filtersPanel = useMemo(() => {
        if (!showFiltersPopover || !filtersMenuBox) return null;
        return (
            <div
                ref={filtersMenuRef}
                role="dialog"
                aria-label={t('filters')}
                style={{
                    position: 'fixed',
                    top: filtersMenuBox.top,
                    left: filtersMenuBox.left,
                    width: filtersMenuBox.width,
                    zIndex: 10000,
                }}
                className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-800"
                onClick={(e) => e.stopPropagation()}
            >
                        {isClientPostsVisible && (
                            <>
                                <FilterDropdown
                                    label="Cliente"
                                    name="client"
                                    options={[{ value: 'all', label: 'Todos os clientes' }, ...clientsForSelect.map((c) => ({ value: c.id, label: c.name }))]}
                                    value={filters.client || 'all'}
                                    onChange={(name, value) => setFilters((prev) => ({ ...prev, [name]: value }))}
                                />
                                <FilterDropdown
                                    label="Tipo"
                                    name="postType"
                                    options={[{ value: 'all', label: 'Todos os tipos' }, ...Object.values(PostTypeEnum).map((p) => ({ value: p, label: t(p) }))]}
                                    value={filters.postType || 'all'}
                                    onChange={(name, value) => setFilters((prev) => ({ ...prev, [name]: value }))}
                                />
                            </>
                        )}
                        {isGeneralTasksVisible && (
                            <FilterDropdown
                                label="Categoria"
                                name="category"
                                options={categoryOptions}
                                value={filters.category || 'all'}
                                onChange={(name, value) => setFilters((prev) => ({ ...prev, [name]: value }))}
                            />
                        )}
                        {(isClientPostsVisible || isGeneralTasksVisible) && (
                            <FilterDropdown
                                label="Status"
                                name="status"
                                options={[{ value: 'all', label: 'Todos os status' }, ...activeStatusOptions.map((s) => ({ value: s.value, label: s.label }))]}
                                value={filters.status || 'all'}
                                onChange={(name, value) => setFilters((prev) => ({ ...prev, [name]: value }))}
                            />
                        )}
                        {tasksFromOldWorkflows.length > 0 && (
                            <FilterDropdown
                                label="Workflow"
                                name="workflow"
                                options={[
                                    { value: 'all', label: 'Todos os workflows' },
                                    { value: 'current', label: 'Workflow atual' },
                                    { value: 'old', label: `Workflows antigos (${tasksFromOldWorkflows.length})` },
                                ]}
                                value={filters.workflow || 'all'}
                                onChange={(name, value) => setFilters((prev) => ({ ...prev, [name]: value }))}
                            />
                        )}
                        {isTeamMode && (isClientPostsVisible || isGeneralTasksVisible) && (
                            <FilterDropdown
                                label="Responsável"
                                name="ownerUserId"
                                options={[
                                    { value: 'all', label: 'Todos' },
                                    { value: 'none', label: 'Sem responsável' },
                                    ...teamMembers.map((member) => ({ value: member.id, label: member.name })),
                                ]}
                                value={filters.ownerUserId || 'all'}
                                onChange={(name, value) => setFilters((prev) => ({ ...prev, [name]: value }))}
                            />
                        )}
                        {oldWorkflowTasks && oldWorkflowTasks.future.length > 0 && (
                            <button
                                type="button"
                                onClick={() => {
                                    onOpenMigrationModal();
                                    setShowFiltersPopover(false);
                                }}
                                className="flex w-fit items-center gap-1.5 rounded-md border border-yellow-300 bg-yellow-100 px-3 py-1.5 text-xs font-medium text-yellow-700 hover:bg-yellow-200 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 dark:hover:bg-yellow-900/50"
                            >
                                <AlertTriangleIcon className="h-3.5 w-3.5" /> Migrar ({oldWorkflowTasks.future.length})
                            </button>
                        )}
                        {isClientPostsVisible && clientWorkflow && (
                            <div className="flex flex-wrap gap-2 border-t border-gray-200 pt-1 dark:border-gray-600">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const id = clientWorkflow.statuses.find((s) => s.id === 'em_producao')?.id;
                                        if (id) setFilters((prev) => ({ ...prev, status: id, workflow: 'current' }));
                                        setShowFiltersPopover(false);
                                    }}
                                    className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                >
                                    {t('agenda_filter_ready_to_send')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const id = clientWorkflow.statuses.find((s) => s.id === 'aprovado')?.id;
                                        if (id) setFilters((prev) => ({ ...prev, status: id, workflow: 'current' }));
                                        setShowFiltersPopover(false);
                                    }}
                                    className="rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300"
                                >
                                    {t('agenda_filter_approved_not_scheduled')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const id = clientWorkflow.statuses.find((s) => s.id === 'aguardando_aprovacao')?.id;
                                        if (id) setFilters((prev) => ({ ...prev, status: id, workflow: 'current' }));
                                        setShowFiltersPopover(false);
                                    }}
                                    className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                >
                                    {t('agenda_filter_awaiting_approval')}
                                </button>
                            </div>
                        )}
            </div>
        );
    }, [
        showFiltersPopover,
        filtersMenuBox,
        filtersMenuRef,
        t,
        isClientPostsVisible,
        clientsForSelect,
        filters,
        setFilters,
        isGeneralTasksVisible,
        categoryOptions,
        activeStatusOptions,
        tasksFromOldWorkflows,
        isTeamMode,
        teamMembers,
        oldWorkflowTasks,
        onOpenMigrationModal,
        setShowFiltersPopover,
        clientWorkflow,
    ]);

    return (
        <div className="flex flex-nowrap items-end gap-2">
            <div className="relative flex-shrink-0">
                <TooltipHint label={t('status_legend_title')}>
                    <button
                        ref={legendAnchorRef}
                        type="button"
                        onClick={() => {
                            setShowFiltersPopover(false);
                            setAgendaLegendOpen((o) => !o);
                        }}
                        className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${agendaLegendOpen ? 'border-white/50 bg-white text-indigo-700' : 'border border-white/30 bg-white/20 text-white hover:bg-white/30'}`}
                        aria-label={t('status_legend_title')}
                        aria-expanded={agendaLegendOpen}
                        aria-haspopup="dialog"
                    >
                        <EyeIcon className="h-5 w-5" />
                    </button>
                </TooltipHint>
                {typeof document !== 'undefined' && legendPanel ? createPortal(legendPanel, document.body) : null}
            </div>

            <div className="relative flex-shrink-0">
                <TooltipHint label={t('filters')}>
                    <button
                        ref={filtersAnchorRef}
                        type="button"
                        onClick={() => {
                            setAgendaLegendOpen(false);
                            setShowFiltersPopover((prev) => !prev);
                        }}
                        className={`flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors ${
                            showFiltersPopover ? 'border-white/50 bg-white text-indigo-700' : 'border-white/30 bg-white/20 text-white hover:bg-white/30'
                        }`}
                        aria-label={t('filters')}
                        aria-expanded={showFiltersPopover}
                        aria-haspopup="dialog"
                    >
                        <SlidersHorizontalIcon className="h-4 w-4 shrink-0" />
                        {t('filters')}
                    </button>
                </TooltipHint>
                {typeof document !== 'undefined' && filtersPanel ? createPortal(filtersPanel, document.body) : null}
            </div>

            <div className="flex items-center gap-1.5">
                <span className="whitespace-nowrap text-xs font-medium text-white/90">{t('exibir')}:</span>
                <TooltipHint label={t('exibir')}>
                    <select
                        value={isClientPostsVisible && isGeneralTasksVisible ? 'both' : isClientPostsVisible ? 'posts' : 'tasks'}
                        onChange={(e) => {
                            const v = e.target.value as 'posts' | 'tasks' | 'both';
                            setIsClientPostsVisible(v === 'posts' || v === 'both');
                            setIsGeneralTasksVisible(v === 'tasks' || v === 'both');
                        }}
                        className={HEADER_GRADIENT_SELECT_CLASS}
                        aria-label={t('exibir')}
                    >
                        <option value="both">{t('ambos')}</option>
                        <option value="posts">{t('posts')}</option>
                        <option value="tasks">{t('tarefas')}</option>
                    </select>
                </TooltipHint>
            </div>

            {addMenu}
        </div>
    );
};

export type AgendaViewDateStripProps = Pick<
    AgendaPageHeaderToolbarProps,
    't' | 'language' | 'currentDate' | 'setCurrentDate' | 'handleDateChange' | 'view' | 'onSetView'
> & {
    className?: string;
    /** Dentro do bloco do calendário (borda inferior, sem margem externa). */
    embedded?: boolean;
};

/** Vistas + navegação de data — barra neutra abaixo da faixa roxa. */
export const AgendaViewDateStrip: React.FC<AgendaViewDateStripProps> = ({
    t,
    language,
    currentDate,
    setCurrentDate,
    handleDateChange,
    view,
    onSetView,
    className,
    embedded = false,
}) => (
    <div
        className={
            embedded
                ? `flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50/90 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/60 ${className ?? ''}`
                : `${CONTENT_PAGE_SUBTOOLBAR_STRIP} ${className ?? ''}`
        }
    >
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
            {(['monthly', 'weekly', 'daily'] as const).map((v) => {
                const ViewIcon = VIEW_ICONS[v];
                const active = view === v;
                return (
                    <button
                        key={v}
                        type="button"
                        onClick={() => onSetView(v)}
                        className={`flex h-10 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-all ${
                            active ? SUBTOOLBAR_VIEW_ACTIVE_CLASS : SUBTOOLBAR_VIEW_INACTIVE_CLASS
                        }`}
                    >
                        {ViewIcon && <ViewIcon className="h-4 w-4 shrink-0" />}
                        <span>{t(v)}</span>
                    </button>
                );
            })}
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2" role="group" aria-label="Período e navegação de data">
            <button type="button" onClick={() => setCurrentDate(new Date())} className={SUBTOOLBAR_TEXT_BUTTON_CLASS}>
                {t('today')}
            </button>
            <div className="flex items-center gap-0.5 sm:gap-1">
                <button type="button" onClick={() => handleDateChange(-1)} className={SUBTOOLBAR_ICON_BUTTON_CLASS} aria-label={t('planning_week_nav_prev')}>
                    <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <p className="flex h-10 min-w-[9rem] max-w-[14rem] items-center justify-center px-1 text-center text-base font-bold tabular-nums text-gray-900 dark:text-white sm:min-w-[10.5rem] sm:text-lg">
                    {getMonthName(currentDate, language as Language)}
                </p>
                <button type="button" onClick={() => handleDateChange(1)} className={SUBTOOLBAR_ICON_BUTTON_CLASS} aria-label={t('planning_week_nav_next')}>
                    <ChevronRightIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
    </div>
);
