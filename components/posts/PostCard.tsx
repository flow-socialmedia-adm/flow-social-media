import React from 'react';
import type { Task, AppContextType, Client } from '../../types';
import { PostType } from '../../types';
import PostActions from '../PostActions';
import { getSubstatusCardLabel } from '../../lib/taskActionFlow';
import { agencyShowsExecutionOwner } from '../../lib/taskExecutionOwnerUi';
import { resolveClientPostWorkflowId } from '../../lib/colorSchemes';
import { toUploadUrl } from '../../lib/api';
import { getTaskDisplayDate, isTaskDisplayDateProvisional, formatDateBR } from '../../lib/utils';
import {
    CARD_ROW_ICON_CLASS,
    CARD_ROW_CALENDAR_EXEC_ICON_CLASS,
    CARD_ROW_AVATAR_IMAGE_CLASS,
    CARD_ROW_AVATAR_PLACEHOLDER_CLASS,
    CARD_ROW_GAP_CLASS,
} from '../../lib/cardRowVisual';
import { resolveClientImageUrl, resolveClientFallbackColor } from '../../lib/clientVisual';
import { isPostForecast } from '../../lib/postForecastVisual';
import { StaticIcon, VideoIcon, CarouselIcon, ReelsIcon, StoryIcon, CalendarIcon, TaskExecutionByIcon } from '../icons';
import TooltipHint from '../TooltipHint';

const POST_TYPE_ICONS: Record<PostType, React.FC<{ className?: string }>> = {
    [PostType.STATIC]: StaticIcon,
    [PostType.VIDEO]: VideoIcon,
    [PostType.CAROUSEL]: CarouselIcon,
    [PostType.REELS]: ReelsIcon,
    [PostType.STORY]: StoryIcon,
};

function buildStatusBadgeClass(status: { color?: { bg: string; text: string } } | undefined): string {
    const bg = status?.color?.bg || 'bg-gray-500';
    const tx = status?.color?.text || 'text-white';
    return `shrink-0 px-2 py-0.5 rounded-lg text-[11px] font-medium leading-tight ${bg} ${tx}`;
}

const PostCardClientRow: React.FC<{
    legacyLayout: boolean;
    clientImageUrl?: string | null;
    clientColor: string;
    name: string;
}> = ({ legacyLayout, clientImageUrl, clientColor, name }) => {
    if (legacyLayout) return <div className="truncate">{name}</div>;

    return (
        <div className={`flex items-center ${CARD_ROW_GAP_CLASS} min-w-0`}>
            {clientImageUrl ? (
                <img
                    src={toUploadUrl(clientImageUrl)}
                    alt={name}
                    className={CARD_ROW_AVATAR_IMAGE_CLASS}
                />
            ) : (
                <span
                    className={CARD_ROW_AVATAR_PLACEHOLDER_CLASS}
                    style={{ backgroundColor: clientColor }}
                    aria-hidden
                />
            )}
            <span className="truncate">{name}</span>
        </div>
    );
};

/** Card de post para o board Kanban da página de Posts. */
const PostCard: React.FC<{
    task: Task;
    onClick: () => void;
    context: AppContextType;
    clientName?: string;
    draggable?: boolean;
    onDragStart?: (e: React.DragEvent<HTMLButtonElement>) => void;
    onActionComplete?: () => void;
    onStatusChange?: (taskId: string, statusId: string, currentActionId?: string | null) => void;
    sourcePage?: 'agenda' | 'posts';
    onNavigateToPage?: (page: 'producao' | 'agenda') => void;
    confirmStatusChange?: () => Promise<boolean>;
    onOpenStatusHistory?: () => void;
    onDelete?: (taskId: string) => void;
}> = ({
    task,
    onClick,
    context,
    clientName,
    draggable = false,
    onDragStart,
    onActionComplete,
    onStatusChange,
    sourcePage,
    onNavigateToPage,
    confirmStatusChange,
    onOpenStatusHistory,
    onDelete,
}) => {
    const { t, workflows, clientWorkflowId, agencyProfile, showConfirmation, notify, clients } = context;
    const showExecutionRow = agencyShowsExecutionOwner(agencyProfile?.operationMode);
    const resolveTeamMemberName = (id: string) =>
        agencyProfile.teamMembers?.find((m) => m.id === id)?.name ?? id;

    const workflow = workflows[resolveClientPostWorkflowId(workflows, clientWorkflowId)];
    const status = workflow?.statuses?.find((s) => s.id === task.statusId);
    const name = clientName || '?';
    const client: Client | undefined = task.clientId ? clients.find((c) => c.id === task.clientId) : undefined;

    const subLine = getSubstatusCardLabel(task, t, workflow?.statuses);
    const displayDateRaw = getTaskDisplayDate(task);

    const postTypeIcon = task.postType ? POST_TYPE_ICONS[task.postType] : null;
    const clientColor = resolveClientFallbackColor(client);
    const clientImageUrl = resolveClientImageUrl(client);
    const legacyLayout = sourcePage !== 'posts';

    const statusBadgeClass = buildStatusBadgeClass(status);
    const forecast = isPostForecast(task);
    const surfaceClass = forecast
        ? 'border-dashed border-slate-300 dark:border-gray-500 bg-slate-50 dark:bg-gray-800/90 hover:border-slate-400 dark:hover:border-gray-400'
        : 'border-solid border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-indigo-300 dark:hover:border-indigo-600';

    return (
        <div
            draggable={draggable}
            onDragStart={onDragStart}
            className={`w-full text-left rounded-xl border p-3 shadow-sm hover:shadow-md transition-all duration-150 group ${surfaceClass}`}
        >
            <div className="flex flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                    <button type="button" onClick={onClick} className="flex-1 min-w-0 text-left">
                        <span className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2 leading-snug">
                            {task.title || t('planning_draft_default_title')}
                        </span>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                        {legacyLayout && status ? (
                            <span className={statusBadgeClass}>{subLine || t(status.nameKey)}</span>
                        ) : null}
                        {context.canEditModule('posts') ? (
                            <PostActions
                                task={task}
                                compact
                                onActionComplete={onActionComplete}
                                onStatusChange={onStatusChange}
                                sourcePage={sourcePage}
                                onNavigateToPage={onNavigateToPage}
                                onOpenDetails={onClick}
                                workflowStatuses={workflow?.statuses}
                                confirmStatusChange={confirmStatusChange}
                                showConfirmation={showConfirmation}
                                notify={notify}
                                onOpenHistory={onOpenStatusHistory}
                                t={t}
                                resolveTeamMemberName={resolveTeamMemberName}
                                skipOwnerTransitionPrompt={!!context.isOperationalProfile}
                                onDelete={onDelete}
                            />
                        ) : null}
                    </div>
                </div>

                <button type="button" onClick={onClick} className="w-full text-left flex flex-col gap-1">
                    {!legacyLayout && status ? (
                        <span className={`inline-flex max-w-full items-center self-start ${statusBadgeClass}`}>
                            <span className="truncate">{subLine || t(status.nameKey)}</span>
                        </span>
                    ) : null}

                    <div className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400 leading-snug">
                        <PostCardClientRow
                            legacyLayout={legacyLayout}
                            clientImageUrl={clientImageUrl}
                            clientColor={clientColor}
                            name={name}
                        />

                        <div className={`flex items-center ${CARD_ROW_GAP_CLASS} min-w-0`}>
                            {postTypeIcon ? React.createElement(postTypeIcon, { className: CARD_ROW_ICON_CLASS }) : null}
                            {task.postType ? <span className="truncate">{t(task.postType)}</span> : null}
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

                    {showExecutionRow && task.executionOwnerUserId ? (
                        <TooltipHint
                            label={t('task_execution_by', { name: resolveTeamMemberName(task.executionOwnerUserId) })}
                            className="block w-full min-w-0"
                        >
                            <div
                                className={`flex items-center ${CARD_ROW_GAP_CLASS} min-w-0 text-[0.6875rem] text-gray-500/95 dark:text-gray-400 leading-snug font-normal`}
                            >
                                <TaskExecutionByIcon className={CARD_ROW_CALENDAR_EXEC_ICON_CLASS} />
                                <span className="truncate">
                                    {t('task_execution_by', { name: resolveTeamMemberName(task.executionOwnerUserId) })}
                                </span>
                            </div>
                        </TooltipHint>
                    ) : null}
                </button>
            </div>
        </div>
    );
};

export default PostCard;
