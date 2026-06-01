import React from 'react';
import type { Task, AppContextType } from '../../types';
import { isPostForecast } from '../../lib/postForecastVisual';
import {
    getAgendaDifferentiatedBadgeClass,
    getAgendaDifferentiatedBadgeLabel,
    getAgendaDifferentiatedCardShellClasses,
    getAgendaDifferentiatedWrapperBgClass,
    agendaDifferentiatedShellHasOverlay,
    agendaDifferentiatedShellWrapsBadge,
    resolveAgendaCardKind,
} from '../../lib/agendaViewMode';
import { getTaskOperationalMilestones } from '../../lib/operationalMilestones';
import { OperationalMilestonesCompactLine } from '../OperationalMilestonesPanel';
import TaskCard from './TaskCard';
import { AlertTriangleIcon, AlarmClockIcon, LayoutGridIcon, CheckSquareIcon } from '../icons';
import TooltipHint from '../TooltipHint';

// Componente helper para TaskCard com Badge
const TaskCardWithBadge: React.FC<{ 
    task: Task; 
    onClick: () => void; 
    context: AppContextType;
    compact?: boolean;
    variant?: 'default' | 'kanbanDesaturated';
    badgeSize?: 'small' | 'default';
    onMigrate?: (task: Task) => void;
    ignoredTasks?: Set<string>;
    onActionComplete?: () => void;
    onStatusChange?: (taskId: string, statusId: string, currentActionId?: string | null) => void;
    sourcePage?: 'agenda' | 'posts' | 'tarefas';
    onNavigateToPage?: (page: 'producao' | 'tarefas' | 'agenda') => void;
    confirmTaskStatusChange?: () => Promise<boolean>;
    confirmPostStatusChange?: () => Promise<boolean>;
    onOpenStatusHistory?: () => void;
    onDelete?: (taskId: string) => void;
    onDuplicate?: (taskId: string) => void;
    onInlineTitleSave?: (taskId: string, title: string) => void | Promise<void>;
}> = ({ task, onClick, context, compact = false, variant: variantProp = 'default', badgeSize = 'default', onMigrate, ignoredTasks, onActionComplete, onStatusChange, sourcePage, onNavigateToPage, confirmTaskStatusChange, confirmPostStatusChange, onOpenStatusHistory, onDelete, onDuplicate, onInlineTitleSave }) => {
    const { t, workflows, clientWorkflowId, generalWorkflowId, clients } = context;
    const applyAgendaCardStyle = sourcePage === 'agenda';
    const forecastPost = !task.isGeneral && isPostForecast(task);
    const agendaCardKind = resolveAgendaCardKind(task.isGeneral, forecastPost);

    const variant = variantProp;

    // Verificar se é workflow antigo ou tem problema de status
    let isFromOldWorkflow = false;
    let hasStatusIssue = false;
    const workflowId = task.workflowId || (task.isGeneral ? generalWorkflowId : clientWorkflowId);
    const workflow = workflows[workflowId];
    const statusConfig = workflow?.statuses.find(s => s.id === task.statusId);
    
    if (task.workflowId && workflows[task.workflowId]) {
        const currentWorkflowId = task.isGeneral ? generalWorkflowId : clientWorkflowId;
        isFromOldWorkflow = task.workflowId !== currentWorkflowId;
        
        const statusExists = workflow?.statuses.some(s => s.id === task.statusId);
        if (!statusExists) {
            hasStatusIssue = true;
        }
    }
    
    const badgeText = applyAgendaCardStyle
        ? getAgendaDifferentiatedBadgeLabel(agendaCardKind)
        : task.isGeneral
          ? 'TAREFA'
          : forecastPost
            ? t('planning_forecast')
            : 'POST';
    // POST=indigo; previsão=slate; TAREFA=gray-500
    const badgeBg = task.isGeneral ? 'bg-gray-500' : forecastPost ? 'bg-slate-500' : 'bg-indigo-600';
    const badgeIconClass = badgeSize === 'small' ? 'w-2.5 h-2.5 shrink-0 opacity-95' : 'w-3 h-3 shrink-0 opacity-95';
    const badgeClass = applyAgendaCardStyle
        ? getAgendaDifferentiatedBadgeClass(agendaCardKind, badgeSize === 'small' ? 'small' : 'default')
        : badgeSize === 'small'
          ? `${badgeBg} text-white text-[8px] font-bold px-1.5 py-0.5 rounded-t-md inline-flex items-center gap-1 self-start ml-2`
          : `${badgeBg} text-white text-[9px] font-bold px-2 py-0.5 rounded-t-lg inline-flex items-center gap-1 self-start ml-2.5`;
    const badgeIconColor = applyAgendaCardStyle
        ? agendaCardKind === 'task'
            ? 'text-[#6B7280]'
            : 'text-white'
        : 'text-white';

    const cardShell = applyAgendaCardStyle ? getAgendaDifferentiatedCardShellClasses(agendaCardKind) : null;
    const shellWrapsBadge = cardShell ? agendaDifferentiatedShellWrapsBadge() : false;

    /** Na página Tarefas o Kanban é só tarefa geral; a tag “TAREFA” é redundante. Na Agenda mantém-se para distinguir post/tarefa. */
    const showKindBadge = sourcePage !== 'tarefas';

    const canDragBadge =
        sourcePage === 'agenda' &&
        (task.isGeneral ? context.canEditModule('tasks') : context.canEditModule('posts'));

    const operationalMilestones =
        sourcePage === 'agenda' && !task.isGeneral && task.clientId
            ? getTaskOperationalMilestones(task, clients.find((c) => c.id === task.clientId))
            : [];

    const milestoneLine =
        operationalMilestones.length > 0 ? (
            <div className="px-2 pb-1">
                <OperationalMilestonesCompactLine milestones={operationalMilestones} t={t} />
            </div>
        ) : null;

    const kindBadge = showKindBadge ? (
        <div
            className={`${badgeClass}${canDragBadge ? ' cursor-grab active:cursor-grabbing' : ''}`}
            draggable={canDragBadge}
            onDragStart={
                canDragBadge
                    ? (e) => {
                          e.stopPropagation();
                          e.dataTransfer.setData('taskId', task.id);
                          try {
                              e.dataTransfer.effectAllowed = 'move';
                          } catch {
                              /* ignore */
                          }
                      }
                    : undefined
            }
        >
            {task.isGeneral ? (
                <CheckSquareIcon className={`${badgeIconClass} ${badgeIconColor}`} aria-hidden />
            ) : forecastPost ? (
                <AlarmClockIcon className={`${badgeIconClass} ${badgeIconColor}`} aria-hidden />
            ) : (
                <LayoutGridIcon className={`${badgeIconClass} ${badgeIconColor}`} aria-hidden />
            )}
            <span>{badgeText}</span>
            {(isFromOldWorkflow || hasStatusIssue) && (
                <TooltipHint
                    label={hasStatusIssue ? t('status_not_found_in_workflow') : (t('task_from_old_workflow') || 'Tarefa de workflow antigo')}
                    className="inline-flex shrink-0"
                >
                    <span
                        className="inline-flex"
                        aria-label={hasStatusIssue ? t('status_not_found_in_workflow') : (t('task_from_old_workflow') || 'Tarefa de workflow antigo')}
                    >
                        <AlertTriangleIcon className="w-3 h-3 text-yellow-400 flex-shrink-0" aria-hidden />
                    </span>
                </TooltipHint>
            )}
        </div>
    ) : null;

    const taskCardNode = (
        <TaskCard
            task={task}
            onClick={onClick}
            context={context}
            compact={compact}
            variant={variant}
            onMigrate={onMigrate}
            ignoredTasks={ignoredTasks}
            onActionComplete={onActionComplete}
            onStatusChange={onStatusChange}
            draggable={sourcePage !== 'posts' && sourcePage !== 'agenda'}
            sourcePage={sourcePage}
            onNavigateToPage={onNavigateToPage}
            confirmTaskStatusChange={confirmTaskStatusChange}
            confirmPostStatusChange={confirmPostStatusChange}
            onOpenStatusHistory={onOpenStatusHistory}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onInlineTitleSave={onInlineTitleSave}
            agendaDifferentiatedEmbedded={Boolean(cardShell && shellWrapsBadge)}
        />
    );
    
    if (cardShell && shellWrapsBadge) {
        const wrapperBg = getAgendaDifferentiatedWrapperBgClass(agendaCardKind);
        const showShellOverlay = agendaDifferentiatedShellHasOverlay(agendaCardKind);
        return (
            <div className={`${cardShell.wrapperClass} ${wrapperBg}`}>
                <div className="relative z-0 flex flex-col">
                    {kindBadge}
                    <div className="relative">
                        {showShellOverlay ? (
                            <div className={cardShell.overlayClass} style={cardShell.overlayStyle} aria-hidden />
                        ) : null}
                        {taskCardNode}
                    </div>
                    {milestoneLine}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            {kindBadge}
            <div className={showKindBadge ? '-mt-px relative' : 'relative'}>{taskCardNode}</div>
            {milestoneLine}
        </div>
    );
};

export default TaskCardWithBadge;
