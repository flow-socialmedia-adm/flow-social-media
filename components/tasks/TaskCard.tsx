import React from 'react';
import type { Task, AppContextType, Workflow, PostType } from '../../types';
import { PostType as PostTypeEnum } from '../../types';
import { getTaskDisplayDate, isTaskDisplayDateProvisional, formatDateBR } from '../../lib/utils';
import {
    CARD_ROW_ICON_CLASS,
    CARD_ROW_CALENDAR_EXEC_ICON_CLASS,
    CARD_ROW_AVATAR_IMAGE_CLASS,
    CARD_ROW_AVATAR_PLACEHOLDER_CLASS,
    CARD_ROW_GAP_CLASS,
    AGENDA_COMPACT_CLIENT_LOGO_FRAME,
    AGENDA_COMPACT_CLIENT_LOGO_IMAGE,
    AGENDA_COMPACT_TYPE_ICON_FRAME,
} from '../../lib/cardRowVisual';
import { getSubstatusCardLabel } from '../../lib/taskActionFlow';
import {
    getAgendaCompactCardTheme,
    getAgendaFullCardTheme,
    getAgendaMenuSurface,
    resolveAgendaCardFlags,
} from '../../lib/agendaCardTheme';
import AgendaInlineTitle from './AgendaInlineTitle';
import { agencyShowsExecutionOwner } from '../../lib/taskExecutionOwnerUi';
import { resolveClientPostWorkflowId, resolveGeneralTaskWorkflowId } from '../../lib/colorSchemes';
import { StaticIcon, VideoIcon, CarouselIcon, ReelsIcon, StoryIcon, StickyNotesTaskIcon, CalendarIcon, TaskExecutionByIcon } from '../icons';
import { toUploadUrl } from '../../lib/api';
import { resolveClientImageUrl, resolveClientFallbackColor } from '../../lib/clientVisual';
import PostActions from '../PostActions';
import GeneralTaskActions from './GeneralTaskActions';
import {
    getAgendaDifferentiatedCardShadowClass,
    getAgendaDifferentiatedEmbeddedCardRadiusClass,
    resolveAgendaCardKind,
} from '../../lib/agendaViewMode';
import TooltipHint from '../TooltipHint';

function formatDDMM(dateStr: string): string {
    if (!dateStr || dateStr.length < 10) return '';
    return `${dateStr.slice(8, 10)}/${dateStr.slice(5, 7)}`;
}

/** Extrai hex (#rrggbb) de uma classe Tailwind como border-[#93c47d] ou bg-[#ea9999]. */
function getStatusHex(color: { bg?: string; text?: string; border?: string; ring?: string }): string | null {
    const str = [color.bg, color.border, color.ring].filter(Boolean).join(' ');
    const m = str.match(/#[0-9A-Fa-f]{6}/);
    return m ? m[0] : null;
}

function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

const POST_TYPE_ICONS: Record<PostType, React.FC<{className?: string}>> = {
    [PostTypeEnum.STATIC]: StaticIcon,
    [PostTypeEnum.VIDEO]: VideoIcon,
    [PostTypeEnum.CAROUSEL]: CarouselIcon,
    [PostTypeEnum.REELS]: ReelsIcon,
    [PostTypeEnum.STORY]: StoryIcon,
};

const TaskCard: React.FC<{
    task: Task;
    onClick: () => void;
    context: AppContextType;
    compact?: boolean;
    variant?: 'default' | 'kanbanDesaturated';
    onMigrate?: (task: Task) => void;
    ignoredTasks?: Set<string>;
    onActionComplete?: () => void;
    onStatusChange?: (taskId: string, statusId: string, currentActionId?: string | null) => void;
    /** Se false, desativa arrastar (ex.: board de Posts). Default true. */
    draggable?: boolean;
    sourcePage?: 'agenda' | 'posts' | 'tarefas';
    onNavigateToPage?: (page: 'producao' | 'tarefas' | 'agenda') => void;
    /** Tarefas gerais */
    confirmTaskStatusChange?: () => Promise<boolean>;
    /** Posts; se omitido, usa confirmTaskStatusChange como fallback */
    confirmPostStatusChange?: () => Promise<boolean>;
    onOpenStatusHistory?: () => void;
    onDelete?: (taskId: string) => void;
    onDuplicate?: (taskId: string) => void;
    onInlineTitleSave?: (taskId: string, title: string) => void | Promise<void>;
    /** Card dentro do shell diferenciado da Agenda (faixa + contorno). */
    agendaDifferentiatedEmbedded?: boolean;
}> = ({ task, onClick, context, compact = false, variant = 'default', onMigrate, ignoredTasks, onActionComplete, onStatusChange, draggable: draggableProp = true, sourcePage, onNavigateToPage, confirmTaskStatusChange, confirmPostStatusChange, onOpenStatusHistory, onDelete, onDuplicate, onInlineTitleSave, agendaDifferentiatedEmbedded = false }) => {
    const { clients, workflows, clientWorkflowId, generalWorkflowId, t, agencyProfile, showConfirmation, notify } = context;
    const agendaFlags = resolveAgendaCardFlags(task, sourcePage);
    const agendaMenuSurface = getAgendaMenuSurface(agendaFlags);
    const postForecastForKind = agendaFlags.postForecast;
    const agendaCardStyle = sourcePage === 'agenda';
    const agendaDifferentiatedShadow = agendaCardStyle
        ? getAgendaDifferentiatedCardShadowClass(resolveAgendaCardKind(task.isGeneral, postForecastForKind))
        : null;
    const embeddedRadius = agendaDifferentiatedEmbedded
        ? getAgendaDifferentiatedEmbeddedCardRadiusClass(compact)
        : compact
          ? 'rounded-md'
          : 'rounded-lg';
    const showExecutionRow = agencyShowsExecutionOwner(agencyProfile?.operationMode);
    const allowTaskMutations = task.isGeneral ? context.canEditModule('tasks') : context.canEditModule('posts');
    const draggableEffective = draggableProp && allowTaskMutations;
    /** Na Agenda o arraste fica na tag; o corpo do card fica clicável/editável. */
    const draggableOnCard = draggableEffective && sourcePage !== 'agenda';
    const agendaInlineTitle =
        sourcePage === 'agenda' && allowTaskMutations && !!onInlineTitleSave;
    const resolveTeamMemberName = (id: string) =>
        agencyProfile.teamMembers?.find((m) => m.id === id)?.name ?? id;
    
    const currentWorkflowId = task.isGeneral ? generalWorkflowId : clientWorkflowId;
    const resolvedWorkflowId = task.isGeneral
        ? resolveGeneralTaskWorkflowId(workflows, generalWorkflowId)
        : resolveClientPostWorkflowId(workflows, clientWorkflowId);
    const currentWorkflow: Workflow | undefined = workflows[resolvedWorkflowId];

    let isFromOldWorkflow = false;
    if (task.workflowId && workflows[task.workflowId]) {
        isFromOldWorkflow = task.workflowId !== currentWorkflowId;
    }

    if (!currentWorkflow) {
        return null;
    }

    let statusConfig = currentWorkflow.statuses.find(s => s.id === task.statusId);
    let hasStatusIssue = false;
    if (!statusConfig) {
        hasStatusIssue = true;
        if (isFromOldWorkflow && task.workflowId) {
            statusConfig = workflows[task.workflowId]?.statuses.find(s => s.id === task.statusId);
        }
        if (!statusConfig) {
            statusConfig = {
                id: task.statusId,
                nameKey: 'unknown_status',
                color: { bg: 'bg-yellow-500', text: 'text-yellow-100', border: 'border-yellow-500', ring: 'ring-yellow-500' },
                category: 'todo'
            };
        }
    }

    const workflow: Workflow = currentWorkflow;

    const Icon = task.isGeneral
        ? StickyNotesTaskIcon
        : (POST_TYPE_ICONS[task.postType!] ?? StaticIcon);
    const client = !task.isGeneral ? clients.find(c => c.id === task.clientId) : null;
    const subLine = getSubstatusCardLabel(task, t, currentWorkflow.statuses);
    const executionLine =
        showExecutionRow && task.executionOwnerUserId
            ? t('task_execution_by', { name: resolveTeamMemberName(task.executionOwnerUserId) })
            : null;
    const isIgnored = ignoredTasks?.has(task.id) || false;
    const migrateHint = t('task_migrate_to_current_workflow');

    /** Board Tarefas (Kanban desaturado): mesma hierarquia visual do PostCard. */
    if (task.isGeneral && variant === 'kanbanDesaturated' && !compact) {
        const displayDateRaw = getTaskDisplayDate(task);
        const generalClient = task.clientId ? clients.find((c) => c.id === task.clientId) : undefined;
        const clientDisplayName = generalClient?.name ?? '—';

        const generalClientImageUrl = resolveClientImageUrl(generalClient);

        return (
            <div
                draggable={draggableOnCard}
                onDragStart={
                    draggableOnCard
                        ? (e) => {
                              e.dataTransfer.setData('taskId', task.id);
                              try {
                                  e.dataTransfer.effectAllowed = 'move';
                              } catch {
                                  /* ignore */
                              }
                              e.currentTarget.classList.add('opacity-50', 'scale-95');
                          }
                        : undefined
                }
                onDragEnd={draggableOnCard ? (e) => e.currentTarget.classList.remove('opacity-50', 'scale-95') : undefined}
                className={`w-full text-left rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-3 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-150 group ${isIgnored ? 'opacity-50' : ''}`}
            >
                <div className="flex flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                    <button type="button" onClick={onClick} className="flex-1 min-w-0 text-left">
                        <span className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2 leading-snug">
                            {task.title || t('planning_draft_default_title')}
                        </span>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                        {(isFromOldWorkflow || hasStatusIssue) && onMigrate && (
                            <TooltipHint label={migrateHint} className="inline-flex shrink-0">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onMigrate(task);
                                    }}
                                    aria-label={migrateHint}
                                    className="w-6 h-6 flex items-center justify-center bg-yellow-400 dark:bg-yellow-500 rounded-full shadow-md hover:shadow-lg hover:scale-110 transition-all border-2 border-yellow-600 dark:border-yellow-400 flex-shrink-0"
                                >
                                    <svg
                                        className="w-4 h-4 text-gray-900 font-bold"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth={2.5}
                                        viewBox="0 0 24 24"
                                        aria-hidden
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                        />
                                    </svg>
                                </button>
                            </TooltipHint>
                        )}
                        {allowTaskMutations && (
                            <GeneralTaskActions
                                task={task}
                                context={context}
                                compact
                                onActionComplete={onActionComplete || onClick}
                                onStatusChange={onStatusChange}
                                sourcePage={sourcePage === 'agenda' || sourcePage === 'tarefas' ? sourcePage : undefined}
                                onNavigateToPage={onNavigateToPage ? (p) => onNavigateToPage(p) : undefined}
                                onOpenDetails={onClick}
                                confirmStatusChange={confirmTaskStatusChange}
                                onOpenHistory={onOpenStatusHistory}
                                skipOwnerTransitionPrompt={!!context.isOperationalProfile}
                            />
                        )}
                    </div>
                </div>
                <button type="button" onClick={onClick} className="w-full text-left flex flex-col gap-1">
                    <div className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400 leading-snug">
                        {statusConfig && (
                            <span
                                className={`inline-flex max-w-full items-center self-start px-2 py-0.5 rounded-lg text-[11px] font-medium leading-tight ${statusConfig.color?.bg || 'bg-gray-500'} ${statusConfig.color?.text || 'text-white'}`}
                            >
                                <span className="truncate">{subLine || t(statusConfig.nameKey)}</span>
                            </span>
                        )}
                        {generalClient ? (
                            <div className={`flex items-center ${CARD_ROW_GAP_CLASS} min-w-0`}>
                                {generalClientImageUrl ? (
                                    <img
                                        src={toUploadUrl(generalClientImageUrl)}
                                        alt={clientDisplayName}
                                        className={CARD_ROW_AVATAR_IMAGE_CLASS}
                                    />
                                ) : (
                                    <span
                                        className={CARD_ROW_AVATAR_PLACEHOLDER_CLASS}
                                        style={{ backgroundColor: resolveClientFallbackColor(generalClient) }}
                                        aria-hidden
                                    />
                                )}
                                <span className="truncate">{clientDisplayName}</span>
                            </div>
                        ) : null}
                        <div className={`flex items-center ${CARD_ROW_GAP_CLASS} min-w-0`}>
                            <StickyNotesTaskIcon className={CARD_ROW_ICON_CLASS} />
                            <span className="truncate">{task.category || t('task')}</span>
                        </div>
                        {displayDateRaw ? (
                            <div className={`flex items-center ${CARD_ROW_GAP_CLASS} min-w-0`}>
                                <CalendarIcon className={CARD_ROW_CALENDAR_EXEC_ICON_CLASS} />
                                <span className="shrink-0 whitespace-nowrap">
                                    {formatDateBR(displayDateRaw)}
                                    {isTaskDisplayDateProvisional(task) ? ' ⚑' : ''}
                                </span>
                            </div>
                        ) : null}
                    </div>
                    {executionLine ? (
                        <TooltipHint label={executionLine} className="block w-full min-w-0">
                            <div
                                className={`flex items-center ${CARD_ROW_GAP_CLASS} min-w-0 text-[0.6875rem] text-gray-500/95 dark:text-gray-400 leading-snug font-normal`}
                            >
                                <TaskExecutionByIcon className={CARD_ROW_CALENDAR_EXEC_ICON_CLASS} />
                                <span className="truncate">{executionLine}</span>
                            </div>
                        </TooltipHint>
                    ) : null}
                </button>
                </div>
            </div>
        );
    }

    if (compact) {
        // Cores de card e de badge em fundo branco: sempre a cor do **status** macro; na Agenda a tag de substatus é pill translúcida.
        const compactActiveBg = statusConfig.color?.bg ?? 'bg-gray-100';
        const compactActiveText = statusConfig.color?.text ?? 'text-gray-800';
        const baseBg = variant === 'kanbanDesaturated'
            ? 'bg-white dark:bg-gray-900'
            : compactActiveBg;
        const titleText = variant === 'kanbanDesaturated'
            ? 'text-slate-900 dark:text-slate-100'
            : compactActiveText;
        const defaultOuterBorder = `border-l-4 ${statusConfig.color?.border ?? 'border-gray-300'}`;
        const agendaTheme = getAgendaCompactCardTheme(
            {
                task,
                sourcePage,
                variant,
                agendaDifferentiatedEmbedded,
                statusBorder: statusConfig.color?.border,
                baseBg,
                titleText,
                defaultOuterBorder,
            },
            agendaFlags,
        );
        const statusHexCompact = statusConfig.color ? getStatusHex(statusConfig.color) : null;
        const statusBadgeStyleCompact = variant === 'kanbanDesaturated' && statusHexCompact
            ? { backgroundColor: hexToRgba(statusHexCompact, 0.15), border: `1px solid ${hexToRgba(statusHexCompact, 0.35)}`, color: statusHexCompact }
            : undefined;
        const statusBgCompact = statusConfig.color?.bg ?? 'bg-gray-100';
        const statusTextCompact = statusConfig.color?.text ?? 'text-gray-800';
        const statusBadgeClassCompact = variant === 'kanbanDesaturated'
            ? (!statusBadgeStyleCompact ? `${statusBgCompact} ${statusTextCompact} border border-current` : '')
            : sourcePage === 'agenda'
              ? agendaTheme.substatusPillClass
              : 'bg-black/20 text-white border border-white/20';
        const dateStrCompact = formatDDMM(getTaskDisplayDate(task));
        const metaPartsCompact: string[] = [];
        if (sourcePage !== 'agenda' && dateStrCompact) metaPartsCompact.push(`📅 ${dateStrCompact}${isTaskDisplayDateProvisional(task) ? ' ⚑' : ''}`);
        if (!task.isGeneral && client) metaPartsCompact.push(client.name);
        if (task.isGeneral) {
            const generalClientCompact = task.clientId ? clients.find(c => c.id === task.clientId) : null;
            if (generalClientCompact) metaPartsCompact.push(generalClientCompact.name);
            if (task.category) metaPartsCompact.push(task.category);
        }
        const metaLineCompact = metaPartsCompact.join(' • ');
        const agendaClientCompact = task.isGeneral
            ? (task.clientId ? clients.find((c) => c.id === task.clientId) : null)
            : client;
        const agendaTypeLabel = task.isGeneral ? (task.category || t('task')) : (task.postType ? t(task.postType) : '');

        const {
            postForecast: postForecastClient,
            agendaIconWrap,
            cardBg,
            cardTitle,
            cardBorder,
            agendaBubbleIconClass,
        } = agendaTheme;

        const agendaClientImageUrl = resolveClientImageUrl(agendaClientCompact || undefined);

        return (
             <div
                draggable={draggableOnCard}
                onDragStart={draggableOnCard ? (e) => { e.dataTransfer.setData('taskId', task.id); } : undefined}
                onClick={onClick}
                className={`p-1.5 ${embeddedRadius} cursor-pointer flex flex-col gap-1 ${cardBorder} ${cardBg} ${agendaDifferentiatedShadow ?? 'hover:shadow-lg'} transition-all duration-200 w-full text-left relative`}
            >
                <div className="flex items-center gap-1.5">
                    {!agendaIconWrap ? (
                        <Icon className={`h-4 w-4 shrink-0 ${cardTitle}`} />
                    ) : null}
                    {agendaInlineTitle ? (
                        <AgendaInlineTitle
                            taskId={task.id}
                            title={task.title}
                            canEdit={agendaInlineTitle}
                            surface={agendaMenuSurface}
                            className={`text-xs font-semibold ${cardTitle} truncate flex-1 min-w-0`}
                            onSave={onInlineTitleSave!}
                        />
                    ) : (
                        <p className={`text-xs font-semibold ${cardTitle} truncate flex-1 min-w-0`}>{task.title}</p>
                    )}
                    {!task.isGeneral && task.clientId && allowTaskMutations && (
                        <PostActions
                            task={task}
                            compact={true}
                            onActionComplete={onActionComplete || onClick}
                            onStatusChange={onStatusChange}
                            sourcePage={sourcePage === 'agenda' || sourcePage === 'posts' ? sourcePage : undefined}
                            onNavigateToPage={onNavigateToPage ? (p) => onNavigateToPage(p) : undefined}
                            onOpenDetails={onClick}
                            workflowStatuses={workflow?.statuses}
                            t={t}
                            confirmStatusChange={confirmPostStatusChange ?? confirmTaskStatusChange}
                            showConfirmation={showConfirmation}
                            notify={notify}
                            resolveTeamMemberName={resolveTeamMemberName}
                            skipOwnerTransitionPrompt={!!context.isOperationalProfile}
                            onDelete={onDelete}
                            onDuplicate={onDuplicate}
                            agendaMenuSurface={agendaMenuSurface}
                        />
                    )}
                    {task.isGeneral && allowTaskMutations && (
                        <GeneralTaskActions
                            task={task}
                            context={context}
                            compact={true}
                            onActionComplete={onActionComplete || onClick}
                            onStatusChange={onStatusChange}
                            sourcePage={sourcePage === 'agenda' || sourcePage === 'tarefas' ? sourcePage : undefined}
                            onNavigateToPage={onNavigateToPage ? (p) => onNavigateToPage(p) : undefined}
                            onOpenDetails={onClick}
                            confirmStatusChange={confirmTaskStatusChange}
                            onOpenHistory={onOpenStatusHistory}
                            skipOwnerTransitionPrompt={!!context.isOperationalProfile}
                            onDelete={onDelete}
                            onDuplicate={onDuplicate}
                            agendaMenuSurface={agendaMenuSurface}
                        />
                    )}
                    {(isFromOldWorkflow || hasStatusIssue) && onMigrate && (
                        <TooltipHint label={migrateHint} className="inline-flex shrink-0">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onMigrate(task);
                                }}
                                aria-label={migrateHint}
                                className="w-5 h-5 flex items-center justify-center bg-yellow-400 dark:bg-yellow-500 rounded-full shadow-md hover:shadow-lg hover:scale-110 transition-all border-2 border-yellow-600 dark:border-yellow-400 flex-shrink-0"
                            >
                                <svg
                                    className="w-3.5 h-3.5 text-gray-900 dark:text-gray-900 font-bold"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2.5}
                                    viewBox="0 0 24 24"
                                    aria-hidden
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        </TooltipHint>
                    )}
                </div>
                {sourcePage === 'agenda' ? (
                    <>
                        {statusConfig ? (
                            <span
                                className={`inline-flex max-w-full items-center text-[8px] font-medium px-1 py-0.5 rounded shrink-0 ${statusBadgeClassCompact}`}
                                style={statusBadgeStyleCompact}
                            >
                                <span className="truncate">{subLine || t(statusConfig.nameKey)}</span>
                            </span>
                        ) : null}
                        {agendaClientCompact ? (
                            <div className="flex items-center gap-1.5 min-w-0">
                                {agendaClientImageUrl ? (
                                    <span className={AGENDA_COMPACT_CLIENT_LOGO_FRAME}>
                                        <img
                                            src={toUploadUrl(agendaClientImageUrl)}
                                            alt={agendaClientCompact.name}
                                            className={AGENDA_COMPACT_CLIENT_LOGO_IMAGE}
                                        />
                                    </span>
                                ) : (
                                    <span
                                        className={AGENDA_COMPACT_CLIENT_LOGO_FRAME}
                                        style={{ backgroundColor: resolveClientFallbackColor(agendaClientCompact) }}
                                        aria-hidden
                                    />
                                )}
                                <span className={`text-[10px] ${cardTitle} truncate`}>{agendaClientCompact.name}</span>
                            </div>
                        ) : null}
                        {agendaTypeLabel ? (
                            <div className="flex items-center gap-1.5 min-w-0">
                                {agendaIconWrap ? (
                                    <span className={AGENDA_COMPACT_TYPE_ICON_FRAME}>
                                        <Icon className={`h-3.5 w-3.5 shrink-0 ${agendaBubbleIconClass}`} />
                                    </span>
                                ) : null}
                                <span className={`text-[10px] ${cardTitle} truncate`}>{agendaTypeLabel}</span>
                            </div>
                        ) : null}
                    </>
                ) : (metaLineCompact || statusConfig) ? (
                    <div className="flex items-center gap-1.5 min-h-0">
                        {metaLineCompact ? (
                            <span className={`text-[10px] ${cardTitle} truncate flex-1 min-w-0`}>{metaLineCompact}</span>
                        ) : <span className="flex-1" />}
                        {statusConfig && (
                            <span
                                className={`text-[8px] font-medium px-1 py-0.5 rounded shrink-0 ${statusBadgeClassCompact}`}
                                style={statusBadgeStyleCompact}
                            >
                                {subLine || t(statusConfig.nameKey)}
                            </span>
                        )}
                    </div>
                ) : null}
                {executionLine && sourcePage !== 'agenda' ? (
                    <TooltipHint label={executionLine} className="block w-full min-w-0 pl-4">
                        <p
                            className={`text-[10px] mt-0.5 truncate ${
                                variant === 'kanbanDesaturated'
                                    ? 'text-gray-500 dark:text-gray-400'
                                    : postForecastClient
                                      ? 'text-slate-600 dark:text-slate-400'
                                      : 'text-white/70'
                            }`}
                        >
                            {executionLine}
                        </p>
                    </TooltipHint>
                ) : null}
            </div>
        )
    }

    const fullActiveBg = statusConfig.color.bg;
    const fullActiveText = statusConfig.color.text;
    const baseBg = variant === 'kanbanDesaturated'
        ? 'bg-white dark:bg-gray-900'
        : fullActiveBg;
    const titleText = variant === 'kanbanDesaturated'
        ? 'text-slate-900 dark:text-slate-100'
        : fullActiveText;

    const statusHex = getStatusHex(statusConfig.color);
    // Estilo do badge de status: hex semitransparente apenas em fundo branco (kanbanDesaturado);
    // em fundo colorido (agenda/default) usa branco translúcido para manter legibilidade.
    const statusBadgeStyle = variant === 'kanbanDesaturated' && statusHex
        ? { backgroundColor: hexToRgba(statusHex, 0.15), border: `1px solid ${hexToRgba(statusHex, 0.35)}`, color: statusHex }
        : undefined;
    const defaultFullOuterBorder = `border-l-4 ${statusConfig.color?.border ?? 'border-gray-300'}`;
    const agendaFullTheme = getAgendaFullCardTheme(
        {
            task,
            sourcePage,
            variant,
            agendaDifferentiatedEmbedded,
            statusBorder: statusConfig.color?.border,
            baseBg,
            titleText,
            defaultOuterBorder: defaultFullOuterBorder,
        },
        agendaFlags,
    );
    const statusBadgeClass =
        variant === 'kanbanDesaturated'
            ? (!statusBadgeStyle ? `${statusConfig.color.bg} ${statusConfig.color.text} border border-current` : '')
            : sourcePage === 'agenda'
              ? agendaFullTheme.substatusPillClass
              : 'bg-black/20 text-white border border-white/20';

    const dateStr = formatDDMM(getTaskDisplayDate(task));
    const metaParts: string[] = [];
    if (sourcePage !== 'agenda' && dateStr) metaParts.push(`📅 ${dateStr}${isTaskDisplayDateProvisional(task) ? ' ⚑' : ''}`);
    if (!task.isGeneral && client) metaParts.push(client.name);
    if (task.isGeneral) {
        const generalClient = task.clientId ? clients.find(c => c.id === task.clientId) : null;
        if (generalClient) metaParts.push(generalClient.name);
        if (task.category) metaParts.push(task.category);
    }
    const metaLine = metaParts.join(' • ');
    const {
        postForecast: postForecastFull,
        cardBg: cardFullBg,
        cardTitle: cardFullTitle,
        cardBorder: cardFullBorder,
        agendaBubbleIconClass: agendaBubbleIconClassFull,
        agendaIconBubbleWrapClass,
    } = agendaFullTheme;

    return (
        <div
            draggable={draggableOnCard}
            onDragStart={draggableOnCard ? (e) => {
                e.dataTransfer.setData('taskId', task.id);
                try { e.dataTransfer.effectAllowed = 'move'; } catch {}
                e.currentTarget.classList.add('opacity-50', 'scale-95');
            } : undefined}
            onDragEnd={draggableOnCard ? (e) => e.currentTarget.classList.remove('opacity-50', 'scale-95') : undefined}
            onClick={onClick}
            className={`p-1.5 mb-1 ${embeddedRadius} cursor-pointer ${cardFullBorder} ${cardFullBg} ${
                agendaDifferentiatedShadow ??
                (sourcePage === 'tarefas' && variant === 'kanbanDesaturated' ? 'shadow-sm hover:shadow-md' : 'hover:shadow-lg')
            } hover:ring-1 ${statusConfig.color.ring} transition-all duration-200 w-full ${isIgnored ? 'opacity-50' : ''} flex items-start gap-2`}
        >
                <div className="flex-grow min-w-0">
                <div className="flex items-center gap-1.5">
                    {sourcePage === 'agenda' ? (
                        <span className={agendaIconBubbleWrapClass}>
                            <Icon className={`h-4 w-4 shrink-0 ${agendaBubbleIconClassFull}`} />
                        </span>
                    ) : (
                        <Icon className={`h-4 w-4 shrink-0 ${cardFullTitle}`} />
                    )}
                    <p className={`text-xs font-semibold ${cardFullTitle} break-words flex-1 min-w-0`}>{task.title}</p>
                </div>
                {(metaLine || statusConfig) && (
                    <div className="flex items-center gap-2 mt-0.5 min-h-0">
                        {metaLine ? (
                            <span
                                className={`text-[10px] truncate flex-1 min-w-0 ${
                                    variant === 'kanbanDesaturated'
                                        ? 'text-gray-500 dark:text-gray-400'
                                        : postForecastFull
                                          ? 'text-slate-600 dark:text-slate-400'
                                          : cardFullTitle
                                }`}
                            >
                                {metaLine}
                            </span>
                        ) : <span className="flex-1" />}
                        {statusConfig && (
                            <span
                                className={`text-[9px] font-medium px-1.5 py-0.5 rounded-md shrink-0 ${statusBadgeClass}`}
                                style={statusBadgeStyle}
                            >
                                {subLine || t(statusConfig.nameKey)}
                            </span>
                        )}
                    </div>
                )}
                {executionLine && sourcePage !== 'agenda' ? (
                    <TooltipHint label={executionLine} className="block w-full min-w-0">
                        <p
                            className={`text-[10px] mt-0.5 truncate ${
                                variant === 'kanbanDesaturated'
                                    ? 'text-gray-500 dark:text-gray-400'
                                    : postForecastFull
                                      ? 'text-slate-600 dark:text-slate-400'
                                      : 'text-white/70'
                            }`}
                        >
                            {executionLine}
                        </p>
                    </TooltipHint>
                ) : null}
            </div>
            {!task.isGeneral && task.clientId && allowTaskMutations && (
                <PostActions
                    task={task}
                    compact={false}
                    onActionComplete={onActionComplete || onClick}
                    onStatusChange={onStatusChange}
                    sourcePage={sourcePage === 'agenda' || sourcePage === 'posts' ? sourcePage : undefined}
                    onNavigateToPage={onNavigateToPage ? (p) => onNavigateToPage(p) : undefined}
                    onOpenDetails={onClick}
                    workflowStatuses={workflow?.statuses}
                    t={t}
                    confirmStatusChange={confirmPostStatusChange ?? confirmTaskStatusChange}
                    showConfirmation={showConfirmation}
                    notify={notify}
                    resolveTeamMemberName={resolveTeamMemberName}
                    skipOwnerTransitionPrompt={!!context.isOperationalProfile}
                    onDelete={onDelete}
                    onDuplicate={onDuplicate}
                />
            )}
            {task.isGeneral && allowTaskMutations && (
                <GeneralTaskActions
                    task={task}
                    context={context}
                    compact={false}
                    onActionComplete={onActionComplete || onClick}
                    onStatusChange={onStatusChange}
                    sourcePage={sourcePage === 'agenda' || sourcePage === 'tarefas' ? sourcePage : undefined}
                    onNavigateToPage={onNavigateToPage ? (p) => onNavigateToPage(p) : undefined}
                    onOpenDetails={onClick}
                    confirmStatusChange={confirmTaskStatusChange}
                    onOpenHistory={onOpenStatusHistory}
                    skipOwnerTransitionPrompt={!!context.isOperationalProfile}
                    onDelete={onDelete}
                    onDuplicate={onDuplicate}
                />
            )}
            {(isFromOldWorkflow || hasStatusIssue) && onMigrate && (
                <TooltipHint label={migrateHint} className="inline-flex shrink-0 self-center">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onMigrate(task);
                        }}
                        aria-label={migrateHint}
                        className="w-6 h-6 flex items-center justify-center bg-yellow-400 dark:bg-yellow-500 rounded-full shadow-md hover:shadow-lg hover:scale-110 transition-all border-2 border-yellow-600 dark:border-yellow-400 flex-shrink-0"
                    >
                        <svg
                            className="w-4 h-4 text-gray-900 dark:text-gray-900 font-bold"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2.5}
                            viewBox="0 0 24 24"
                            aria-hidden
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </TooltipHint>
            )}
        </div>
    );
};

export default TaskCard;
