import React, { useState, useMemo, useContext, useEffect, useRef, useCallback } from 'react';
import { AppContext } from '../contexts/AppContext';
import { AuthContext } from '../contexts/AuthContext';
import type { Task, Client, Holiday, PostType, AppContextType, StatusDefinition, Workflow } from '../types';
import { getWeekDays, getMonthDays, formatDateToYYYYMMDD, getDayName, isToday, getTaskDisplayDate } from '../lib/utils';
import { computeAgendaVisibleSummary } from '../lib/agendaVisibleSummary';
import { buildAgendaIntelligenceItems, type IntelligenceItem } from '../lib/intelligentCentral';
import { createPlanningQuotaValidator, type PlanningQuotaClient } from '../lib/planningQuota';
import { useAgencyClientsRoster } from '../contexts/AgencyClientsRosterContext';
import {
    type AgendaHighlight,
    getAgendaCardHighlightState,
    getAgendaHighlightRingClass,
    parseYmdToLocalDate,
    resolveAgendaHighlightFromIntel,
    taskMatchesAgendaHighlight,
} from '../lib/agendaHighlight';
import IntelligentCentral from './IntelligentCentral';
import AgendaHighlightCardWrap from './agenda/AgendaHighlightCardWrap';
import { buildTaskDuplicatePayload } from '../lib/duplicateTask';
import { VideoIcon, CarouselIcon, ReelsIcon, StoryIcon, PlusIcon, ChevronLeftIcon, ChevronRightIcon, XIcon, TrashIcon, AlertTriangleIcon, ClipboardListIcon, CalendarIcon } from './icons';
import TasksOnboarding from './TasksOnboarding';
import PostOrForecastModal from './PostOrForecastModal';
import { mapApiTaskToTask } from '../lib/mapApiTaskToTask';
import { buildTaskFlowHistoryLine } from '../lib/activityHistoryPayload';
import TaskCard from './tasks/TaskCard';
import TaskCardWithBadge from './tasks/TaskCardWithBadge';
import {
    CONTENT_BELOW_HEADER_PAD,
    CONTENT_PAGE_BODY_INNER,
    CONTENT_PAGE_SCROLL_OUTER,
} from '../lib/contentPageHeader';
import ContentPageHeader from './ContentPageHeader';
import TooltipHint from './TooltipHint';
import { AgendaPurpleBarActions, AgendaViewDateStrip } from './AgendaPageHeaderToolbar';

/** Data da célula na grade (YYYY-MM-DD), alinhada ao Calendário editorial: posts usam publishDate quando existir. */
function agendaCellDayKey(task: Task): string {
    const d = getTaskDisplayDate(task);
    if (!d || typeof d !== 'string') return '';
    const s = d.trim();
    return s.length >= 10 ? s.slice(0, 10) : s;
}

/** Menu "O que vamos criar?" — mesmo fluxo no toolbar e nas células do calendário */
const AgendaWhatToCreateMenu: React.FC<{
    t: AppContextType['t'];
    onPost: () => void;
    onTask: () => void;
    variant: 'toolbar' | 'cellRow' | 'cellBlock' | 'cellBlockCompact' | 'emptyState';
    align?: 'left' | 'right';
    disabled?: boolean;
}> = ({ t, onPost, onTask, variant, align = 'right', disabled = false }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const noEditTip = t('tooltip_no_edit_permission');
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        if (open) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);
    useEffect(() => {
        if (disabled) setOpen(false);
    }, [disabled]);

    const toggleOpen = () => {
        if (disabled) return;
        setOpen((prev) => !prev);
    };

    const pickPost = () => {
        onPost();
        setOpen(false);
    };
    const pickTask = () => {
        onTask();
        setOpen(false);
    };

    const menuPanel = (
        <div
            role="menu"
            className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-2 w-56 sm:w-60 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-[70]`}
        >
            <p className="px-4 pt-1 pb-2 text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 mb-0.5">
                {t('agenda_menu_what_create')}
            </p>
            <button
                type="button"
                role="menuitem"
                onClick={pickPost}
                className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-800 dark:text-gray-100 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
            >
                {t('modal_segment_post')}
            </button>
            <button
                type="button"
                role="menuitem"
                onClick={pickTask}
                className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-800 dark:text-gray-100 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-b-lg"
            >
                {t('modal_menu_task')}
            </button>
        </div>
    );

    const wrapperClass =
        variant === 'toolbar'
            ? 'relative flex-shrink-0'
            : variant === 'emptyState'
              ? 'relative inline-flex'
              : 'relative w-full';

    const addToolbarLabel = disabled ? noEditTip : t('adicionar');

    if (variant === 'toolbar') {
        return (
            <div className={wrapperClass} ref={ref}>
                <TooltipHint label={addToolbarLabel}>
                    <button
                        type="button"
                        onClick={toggleOpen}
                        disabled={disabled}
                        aria-label={disabled ? noEditTip : t('adicionar')}
                        aria-expanded={open}
                        aria-disabled={disabled}
                        className={`h-10 w-10 flex items-center justify-center rounded-lg bg-white/90 backdrop-blur text-indigo-700 hover:bg-white border border-white/50 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-500 group ${disabled ? 'opacity-50 cursor-not-allowed hover:bg-white/90' : ''}`}
                    >
                        <PlusIcon className={`w-5 h-5 transition-transform duration-200 ${disabled ? '' : 'group-hover:rotate-90'}`} />
                    </button>
                </TooltipHint>
                {!disabled && open && menuPanel}
            </div>
        );
    }

    if (variant === 'emptyState') {
        return (
            <div className={wrapperClass} ref={ref}>
                <TooltipHint label={disabled ? noEditTip : t('agenda_menu_what_create')}>
                    <button
                        type="button"
                        onClick={toggleOpen}
                        disabled={disabled}
                        aria-label={disabled ? noEditTip : t('add_task')}
                        aria-expanded={open}
                        aria-disabled={disabled}
                        className={`inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700'}`}
                    >
                        <PlusIcon className="w-5 h-5 mr-2" />
                        {t('add_task')}
                    </button>
                </TooltipHint>
                {!disabled && open && menuPanel}
            </div>
        );
    }

    const isBlock = variant === 'cellBlock' || variant === 'cellBlockCompact';
    const blockPad = variant === 'cellBlockCompact' ? 'p-3' : 'p-4';

    const cellAddLabel = disabled ? noEditTip : t('agenda_menu_what_create');

    const cellRowBtnClass = `w-full h-10 rounded-md border border-dashed border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/50 flex items-center justify-center transition-colors ${
        disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50/80 dark:hover:bg-gray-700/30 cursor-pointer'
    }`;

    const cellBlockBtnClass = `w-full min-h-10 ${blockPad} rounded-md border border-dashed border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/50 flex items-center justify-center gap-2 transition-colors ${
        disabled
            ? 'opacity-50 cursor-not-allowed text-gray-400 dark:text-gray-500'
            : 'hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50/80 dark:hover:bg-gray-700/30 text-gray-500 dark:text-gray-400'
    }`;

    return (
        <div className={wrapperClass} ref={ref}>
            <TooltipHint label={cellAddLabel} className="w-full">
                <button
                    type="button"
                    onClick={toggleOpen}
                    disabled={disabled}
                    aria-expanded={open}
                    aria-label={disabled ? noEditTip : t('adicionar')}
                    aria-disabled={disabled}
                    className={isBlock ? cellBlockBtnClass : cellRowBtnClass}
                >
                    <PlusIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    {isBlock && <span className="text-sm font-medium">{t('add_task')}</span>}
                </button>
            </TooltipHint>
            {!disabled && open && menuPanel}
        </div>
    );
};

import { apiDelete, apiGet, apiPost, apiPut, apiPatch } from '../lib/api';
import { maybePromptOwnerChangeAfterTransition } from '../lib/ownerSuggestionPrompt';
import { CHANGE_SOURCE } from '../lib/taskStatusChangeSource';
import { defaultActionIdForStatus, resolveLinearFlowForTask } from '../lib/taskActionFlow';

// HOOK for media queries
const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    window.addEventListener('resize', listener);
    return () => window.removeEventListener('resize', listener);
  }, [matches, query]);

  return matches;
};

// HELPER COMPONENTS (TaskCard, TaskCardWithBadge importados de ./tasks/; toolbar da faixa roxa em AgendaPageHeaderToolbar)

const ConfirmationModal: React.FC<{ title?: string; message: string; onConfirm: () => void; onClose: () => void; t: AppContextType['t']; confirmText?: string; cancelText?: string; }> = ({ title, message, onConfirm, onClose, t, confirmText, cancelText }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-6 text-center">
            <AlertTriangleIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title || t('confirm')}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{message}</p>
            <div className="flex justify-center gap-4">
                <button onClick={onClose} className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600">{cancelText || t('cancel')}</button>
                <button onClick={onConfirm} className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700">{confirmText || t('confirm')}</button>
            </div>
        </div>
    </div>
);


// MAIN COMPONENT
import PhoneInput from './PhoneInput';

// Modal de Migração em Lote
const BatchMigrationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    pastTasks: Task[];
    futureTasks: Task[];
    workflows: Record<string, Workflow>;
    clientWorkflowId: string;
    generalWorkflowId: string;
    mapStatusByCategory: (oldStatus: StatusDefinition, targetWorkflow: Workflow) => string;
    onMigrate: (tasks: Task[], statuses: Record<string, string>, ignorePast: boolean) => Promise<void>;
    onIgnorePast: (taskIds: string[]) => void;
    ignoredTasks: Set<string>;
    t: AppContextType['t'];
}> = ({ isOpen, onClose, pastTasks, futureTasks, workflows, clientWorkflowId, generalWorkflowId, mapStatusByCategory, onMigrate, onIgnorePast, ignoredTasks, t }) => {
    const [selectedFutureTasks, setSelectedFutureTasks] = useState<Set<string>>(new Set());
    const [futureTaskStatuses, setFutureTaskStatuses] = useState<Record<string, string>>({});
    const [ignorePast, setIgnorePast] = useState(false);
    const [migrateAllToStatus, setMigrateAllToStatus] = useState<string>('');

    // Determinar workflow alvo baseado na primeira tarefa futura, ou usar clientWorkflowId como padrão
    const targetWorkflowId = futureTasks.length > 0 && futureTasks[0]?.isGeneral 
        ? generalWorkflowId 
        : clientWorkflowId;
    const targetWorkflow = workflows[targetWorkflowId];

    // Inicializar statuses sugeridos
    useEffect(() => {
        if (!isOpen || futureTasks.length === 0) {
            setFutureTaskStatuses({});
            setSelectedFutureTasks(new Set());
            setMigrateAllToStatus('');
            setIgnorePast(false);
            return;
        }
        const initialStatuses: Record<string, string> = {};
        futureTasks.forEach(task => {
            const targetWorkflowId = task.isGeneral ? generalWorkflowId : clientWorkflowId;
            const targetWorkflow = workflows[targetWorkflowId];
            if (targetWorkflow) {
                const oldWorkflow = workflows[task.workflowId!];
                const oldStatus = oldWorkflow?.statuses.find(s => s.id === task.statusId);
                if (oldStatus) {
                    initialStatuses[task.id] = mapStatusByCategory(oldStatus, targetWorkflow);
                } else {
                    initialStatuses[task.id] = targetWorkflow.statuses[0]?.id || '';
                }
            }
        });
        setFutureTaskStatuses(initialStatuses);
        setSelectedFutureTasks(new Set(futureTasks.map(t => t.id)));
        setMigrateAllToStatus('');
        setIgnorePast(false);
    }, [isOpen, futureTasks.length, generalWorkflowId, clientWorkflowId, workflows, mapStatusByCategory]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl p-6 my-8">
                <div className="flex items-start gap-4 mb-6">
                    <AlertTriangleIcon className="w-12 h-12 text-yellow-500 flex-shrink-0" />
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            Migração de Tarefas Antigas
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Você tem <strong>{pastTasks.length + futureTasks.length}</strong> tarefa(s) do workflow antigo:
                            <br />• {pastTasks.length} tarefa(s) passada(s)
                            <br />• {futureTasks.length} tarefa(s) futura(s)
                            <br /><br />
                            <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                                Você poderá migrar essas tarefas individualmente depois, se necessário.
                            </span>
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Tarefas Passadas */}
                {pastTasks.length > 0 && (
                    <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div className="flex items-center gap-3 mb-3">
                            <input
                                type="checkbox"
                                id="ignorePast"
                                checked={ignorePast}
                                onChange={(e) => setIgnorePast(e.target.checked)}
                                className="w-4 h-4 text-indigo-600 rounded"
                            />
                            <label htmlFor="ignorePast" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Ignorar tarefas passadas ({pastTasks.length} tarefas)
                            </label>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 ml-7 mb-3">
                            Não serão contabilizadas em relatórios, mas permanecerão visíveis
                        </p>
                        <div className="ml-7 max-h-32 overflow-y-auto space-y-1">
                            {pastTasks.map(task => {
                                const oldWorkflow = workflows[task.workflowId!];
                                const oldStatus = oldWorkflow?.statuses.find(s => s.id === task.statusId);
                                return (
                                    <div key={task.id} className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${oldStatus?.color.bg || 'bg-gray-400'}`}></span>
                                        <span>
                                            {(() => {
                                                const d = agendaCellDayKey(task) || task.date;
                                                const dateStr = d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
                                                return `${task.isGeneral ? 'Tarefa' : 'Post'}: "${task.title}" - ${dateStr}`;
                                            })()}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Tarefas Futuras */}
                {futureTasks.length > 0 && targetWorkflow && (
                    <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div className="flex items-center gap-3 mb-4">
                            <input
                                type="checkbox"
                                id="migrateAll"
                                checked={migrateAllToStatus !== ''}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        const firstStatusId = targetWorkflow.statuses[0]?.id || '';
                                        setMigrateAllToStatus(firstStatusId);
                                        const newStatuses: Record<string, string> = {};
                                        futureTasks.forEach(t => {
                                            newStatuses[t.id] = firstStatusId;
                                        });
                                        setFutureTaskStatuses(newStatuses);
                                    } else {
                                        setMigrateAllToStatus('');
                                    }
                                }}
                                className="w-4 h-4 text-indigo-600 rounded"
                            />
                            <label htmlFor="migrateAll" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Migrar todas tarefas futuras para:
                            </label>
                            <select
                                value={migrateAllToStatus}
                                onChange={(e) => {
                                    setMigrateAllToStatus(e.target.value);
                                    const newStatuses: Record<string, string> = {};
                                    futureTasks.forEach(t => {
                                        newStatuses[t.id] = e.target.value;
                                    });
                                    setFutureTaskStatuses(newStatuses);
                                }}
                                className="ml-2 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                            >
                                {targetWorkflow.statuses.map(s => (
                                    <option key={s.id} value={s.id}>{t(s.nameKey)}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {futureTasks.map(task => {
                                const oldWorkflow = workflows[task.workflowId!];
                                const oldStatus = oldWorkflow?.statuses.find(s => s.id === task.statusId);
                                const isSelected = selectedFutureTasks.has(task.id);
                                const suggestedStatus = futureTaskStatuses[task.id] || targetWorkflow.statuses[0]?.id || '';

                                return (
                                    <div key={task.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                                        <div className="flex items-start gap-3">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={(e) => {
                                                    const newSet = new Set(selectedFutureTasks);
                                                    if (e.target.checked) {
                                                        newSet.add(task.id);
                                                    } else {
                                                        newSet.delete(task.id);
                                                    }
                                                    setSelectedFutureTasks(newSet);
                                                }}
                                                className="w-4 h-4 text-indigo-600 rounded mt-1"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`w-3 h-3 rounded-full ${oldStatus?.color.bg || 'bg-gray-400'}`}></span>
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {task.isGeneral ? 'Tarefa' : 'Post'}: {task.title}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                                    Data:{' '}
                                                    {(() => {
                                                        const d = agendaCellDayKey(task) || task.date;
                                                        return d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
                                                    })()}{' '}
                                                    | Status atual: {oldStatus ? t(oldStatus.nameKey) : 'Desconhecido'}
                                                </div>
                                                <select
                                                    value={suggestedStatus}
                                                    onChange={(e) => {
                                                        setFutureTaskStatuses(prev => ({ ...prev, [task.id]: e.target.value }));
                                                    }}
                                                    className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                                                >
                                                    {targetWorkflow.statuses.map(s => (
                                                        <option key={s.id} value={s.id}>{t(s.nameKey)}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => {
                            if (ignorePast) {
                                onIgnorePast(pastTasks.map(t => t.id));
                            }
                            onClose();
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={async () => {
                            if (ignorePast) {
                                onIgnorePast(pastTasks.map(t => t.id));
                            }
                            const tasksToMigrate = futureTasks.filter(t => selectedFutureTasks.has(t.id));
                            await onMigrate(tasksToMigrate, futureTaskStatuses, ignorePast);
                            onClose();
                        }}
                        disabled={selectedFutureTasks.size === 0 && !ignorePast}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Migrar Selecionadas ({selectedFutureTasks.size})
                    </button>
                </div>
            </div>
        </div>
    );
};

// Modal de Migração Individual
const IndividualMigrationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    task: Task | null;
    workflows: Record<string, Workflow>;
    clientWorkflowId: string;
    generalWorkflowId: string;
    mapStatusByCategory: (oldStatus: StatusDefinition, targetWorkflow: Workflow) => string;
    onMigrate: (task: Task, newStatusId: string) => Promise<void>;
    t: AppContextType['t'];
}> = ({ isOpen, onClose, task, workflows, clientWorkflowId, generalWorkflowId, mapStatusByCategory, onMigrate, t }) => {
    const [selectedStatusId, setSelectedStatusId] = useState<string>('');

    useEffect(() => {
        if (task && isOpen) {
            const targetWorkflowId = task.isGeneral ? generalWorkflowId : clientWorkflowId;
            const targetWorkflow = workflows[targetWorkflowId];
            const oldWorkflow = workflows[task.workflowId!];
            const oldStatus = oldWorkflow?.statuses.find(s => s.id === task.statusId);
            
            if (oldStatus && targetWorkflow) {
                const suggestedStatus = mapStatusByCategory(oldStatus, targetWorkflow);
                setSelectedStatusId(suggestedStatus);
            } else if (targetWorkflow) {
                setSelectedStatusId(targetWorkflow.statuses[0]?.id || '');
            }
        }
    }, [task, isOpen, generalWorkflowId, clientWorkflowId, workflows, mapStatusByCategory]);

    if (!isOpen || !task) return null;

    const targetWorkflowId = task.isGeneral ? generalWorkflowId : clientWorkflowId;
    const targetWorkflow = workflows[targetWorkflowId];
    const oldWorkflow = workflows[task.workflowId!];
    const oldStatus = oldWorkflow?.statuses.find(s => s.id === task.statusId);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
                <div className="flex items-start gap-4 mb-4">
                    <AlertTriangleIcon className="w-10 h-10 text-yellow-500 flex-shrink-0" />
                    <div className="flex-1">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                            Migrar Tarefa
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                            Migrar "{task.title}" para o workflow atual
                        </p>
                        {oldStatus && (
                            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Status atual:</div>
                                <div className="flex items-center gap-2">
                                    <span className={`w-3 h-3 rounded-full ${oldStatus.color.bg}`}></span>
                                    <span className="text-sm font-medium">{t(oldStatus.nameKey)}</span>
                                </div>
                            </div>
                        )}
                        {targetWorkflow && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Novo status:
                                </label>
                                <select
                                    value={selectedStatusId}
                                    onChange={(e) => setSelectedStatusId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm"
                                >
                                    {targetWorkflow.statuses.map(s => (
                                        <option key={s.id} value={s.id}>{t(s.nameKey)}</option>
                                    ))}
                                </select>
                                {targetWorkflow.statuses.find(s => s.id === selectedStatusId) && (
                                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                        <span className={`w-2 h-2 rounded-full ${targetWorkflow.statuses.find(s => s.id === selectedStatusId)?.color.bg}`}></span>
                                        <span>Preview da cor do novo status</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={async () => {
                            if (selectedStatusId) {
                                await onMigrate(task, selectedStatusId);
                                onClose();
                            }
                        }}
                        disabled={!selectedStatusId}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Migrar
                    </button>
                </div>
            </div>
        </div>
    );
};

const QuickClientModal: React.FC<{ isOpen: boolean; onClose: () => void; onCreated: (created: any) => void; t: AppContextType['t']; defaultCurrency?: string }> = ({ isOpen, onClose, onCreated, t, defaultCurrency = 'BRL' }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('+55');
    const [countryCode, setCountryCode] = useState('BR');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Cadastro rápido de cliente</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Informe pelo menos o nome. Você poderá completar os dados depois em Clientes.</p>
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Nome</label>
                        <input value={name} onChange={(e)=>setName(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm" placeholder="Nome do cliente" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">E-mail (opcional)</label>
                        <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm" placeholder="email@cliente.com" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Telefone (opcional)</label>
                        <PhoneInput value={phone} onChange={setPhone} countryCode={countryCode} onCountryChange={setCountryCode} placeholder="(11) 99999-9999" />
                    </div>
                </div>
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                <div className="mt-6 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">Cancelar</button>
                    <button disabled={saving || !name.trim()} onClick={async ()=>{
                        setSaving(true);
                        try{
                            // Backend exige: name, type e currency
                            const created = await apiPost('/clients', { 
                                name: name.trim(), 
                                type: 'company', 
                                currency: (defaultCurrency || 'BRL'),
                                active: true,
                            });
                            onCreated(created);
                            setError(null);
                        } finally {
                            setSaving(false);
                            if (!name.trim()) setError('Informe o nome do cliente');
                        }
                    }} className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60">Salvar cliente</button>
                </div>
            </div>
        </div>
    );
};

const AgendaPage: React.FC = () => {
    const context = useContext(AppContext);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<'daily' | 'weekly' | 'monthly'>(() => {
        const stored = localStorage.getItem('flow_agendaView');
        return (stored === 'daily' || stored === 'weekly' || stored === 'monthly') ? stored : 'monthly';
    });
    const handleSetView = (v: 'daily' | 'weekly' | 'monthly') => {
        setView(v);
        localStorage.setItem('flow_agendaView', v);
    };
    const isAgendaActive = context?.page === 'agenda';
    const [filters, setFilters] = useState({ 
        client: 'all',      // Só para posts
        postType: 'all',    // Só para posts (renomeado de 'type')
        category: 'all',   // Só para tarefas gerais
        status: 'all',     // Para ambos
        workflow: 'all',    // Filtro por workflow: 'all', 'current', 'old'
        ownerUserId: 'all'  // Filtro por responsável (apenas em modo TEAM)
    });
    /** Pré-preenche cliente na criação de Post quando o filtro da Agenda é um cliente específico */
    const agendaPostContextClientId = filters.client !== 'all' ? filters.client : undefined;
    const [showFiltersPopover, setShowFiltersPopover] = useState(false);
    const [agendaLegendOpen, setAgendaLegendOpen] = useState(false);
    const [agendaHighlight, setAgendaHighlight] = useState<AgendaHighlight | null>(null);
    const firstHighlightScrollRef = useRef<HTMLDivElement>(null);
    const highlightNavigatedKeyRef = useRef<string | null>(null);
    const [showMigrationModal, setShowMigrationModal] = useState(false);
    const [showIndividualMigrationModal, setShowIndividualMigrationModal] = useState(false);
    const [taskToMigrate, setTaskToMigrate] = useState<Task | null>(null);
    const [ignoredTasks, setIgnoredTasks] = useState<Set<string>>(() => {
        // Carregar do localStorage
        try {
            const stored = localStorage.getItem('flow_ignoredTasks');
            return stored ? new Set(JSON.parse(stored)) : new Set();
        } catch (error) {
            console.error('Erro ao carregar ignoredTasks do localStorage:', error);
            return new Set();
        }
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Partial<Task> | null>(null);
    const [confirmation, setConfirmation] = useState<{
        isOpen: boolean;
        title?: string;
        message: string;
        onConfirm: () => void;
        onCancel?: () => void;
        /** Confirmação assíncrona: não fechar o modal no clique; o `onConfirm` fecha ao terminar. */
        leaveOpenUntilOnConfirmResolves?: boolean;
    } | null>(null);
    /** Substitui `window.prompt` ao soltar em área Kanban que pede data */
    const [kanbanDropDateDraft, setKanbanDropDateDraft] = useState<{ taskId: string; task: Task; draftDate: string } | null>(null);
    const [isQuickClientOpen, setIsQuickClientOpen] = useState(false);
    const [toast, setToast] = useState<{ open: boolean; message: string }>(() => ({ open: false, message: '' }));
    useEffect(() => {
        if (!toast.open) return;
        const id = setTimeout(() => setToast({ open: false, message: '' }), 3000);
        return () => clearTimeout(id);
    }, [toast]);
    const [isClientPostsVisible, setIsClientPostsVisible] = useState(true);
    const [isGeneralTasksVisible, setIsGeneralTasksVisible] = useState(true);
    const [activePopover, setActivePopover] = useState<string | null>(null);
    const [extraPopoverCount, setExtraPopoverCount] = useState<number>(0);
    const popoverRef = useRef<HTMLDivElement>(null);
    const isMobile = useMediaQuery('(max-width: 768px)');
    const isLg = useMediaQuery('(min-width: 1024px)');
    const [mobileSelectedDate, setMobileSelectedDate] = useState<Date | null>(null);
    
    // For drag-to-scroll
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    
    // For scroll arrows
    const [showScrollArrows, setShowScrollArrows] = useState({ left: false, right: false });
    const [isHoveringAgenda, setIsHoveringAgenda] = useState(false);
    /** IDs excluídos nesta sessão — evita que reloadTasks reincorpore o item apagado no merge in-range. */
    const deletedTaskIdsRef = useRef<Set<string>>(new Set());

    const t = context?.t ?? ((key: string) => key);
    const language = context?.language ?? 'pt';
    const tasks = context?.tasks ?? [];
    const setTasks = context?.setTasks ?? (() => {});
    const clients = context?.clients ?? [];
    const workflows = context?.workflows ?? {};
    const clientWorkflowId = context?.clientWorkflowId ?? '';
    const generalWorkflowId = context?.generalWorkflowId ?? '';
    const showConfirmation = context?.showConfirmation;
    const notify = context?.notify;
    const logActivity = context?.logActivity ?? (() => {});
    const agencyProfile = context?.agencyProfile;
    const agencyMode = context?.agencyMode;
    const setPage = context?.setPage ?? (() => {});
    const canEditModule = context?.canEditModule ?? (() => false);
    const isOperationalProfile = context?.isOperationalProfile ?? false;
    const canEditAgendaCal = canEditModule('agenda');
    const canEditTasksAgenda = canEditModule('tasks');
    const canEditPostsAgenda = canEditModule('posts');
    const isTeamMode = agencyMode === 'TEAM';

    const confirmAgendaPostStatusChange = useCallback((): Promise<boolean> => {
        return new Promise((resolve) => {
            setConfirmation({
                isOpen: true,
                message: t('confirm_post_status_change'),
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false),
            });
        });
    }, [t]);

    const confirmAgendaTaskStatusChange = useCallback((): Promise<boolean> => {
        return new Promise((resolve) => {
            setConfirmation({
                isOpen: true,
                message: t('confirm_task_status_change'),
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false),
            });
        });
    }, [t]);
    
    // Roster compartilhado de clientes ativos (id+name) — fonte única para dropdowns / validação / insights.
    const {
        roster: clientsForSelect,
        idSet: backendClientIds,
        nameById: rosterNameById,
        addClient: rosterAddClient,
    } = useAgencyClientsRoster();

    
    const auth = useContext(AuthContext);
    const [showTasksOnboarding, setShowTasksOnboarding] = useState(false);
    const [manualOpenRequested, setManualOpenRequested] = useState(false);

    // Flag persistida em localStorage para evitar reabertura mesmo se backend falhar
    const [hasBeenCompleted, setHasBeenCompleted] = useState(() => {
        try {
            return localStorage.getItem('flow_hasSeenTasksOnboarding') === 'true';
        } catch {
            return false;
        }
    });
    
    // Verificar se deve mostrar onboarding de tarefas - CAMADA 3
    // APENAS baseado em hasSeenTasksOnboarding, SEM dependência de navegação
    useEffect(() => {
        if (auth?.user) {
            // Perfil operacional: sem onboarding automático (fluxo focado em execução; Ajuda ainda pode abrir manualmente)
            if (isOperationalProfile && !manualOpenRequested) {
                setShowTasksOnboarding(false);
                return;
            }
            // Se já foi completado nesta sessão, nunca reabrir
            if (hasBeenCompleted) {
                setShowTasksOnboarding(false);
                return;
            }
            
            // Se foi solicitado manualmente via menu Ajuda, mostrar independente do flag
            if (manualOpenRequested) {
                setShowTasksOnboarding(true);
                return;
            }
            
            // Mostrar apenas se nunca viu E não foi completado (verificação estrita)
            // Verificar tanto o flag do backend quanto o localStorage (fallback)
            const backendHasSeen = auth.user.hasSeenTasksOnboarding === true;
            const localHasSeen = hasBeenCompleted;
            
            if (!backendHasSeen && !localHasSeen) {
                // Pequeno delay para garantir que a página carregou
                const timer = setTimeout(() => {
                    setShowTasksOnboarding(true);
                }, 500);
                return () => clearTimeout(timer);
            } else {
                // Se já viu (no backend OU local), garantir que está fechado
                setShowTasksOnboarding(false);
            }
        }
    }, [auth?.user?.hasSeenTasksOnboarding, manualOpenRequested, hasBeenCompleted, isOperationalProfile]);
    
    // Escutar eventos de abertura manual do menu Ajuda
    useEffect(() => {
        const handleOpenTasksOnboarding = () => {
            // Permitir reabertura manual mesmo se já foi completado
            setManualOpenRequested(true);
            setShowTasksOnboarding(true);
        };
        
        window.addEventListener('open-tasks-onboarding', handleOpenTasksOnboarding);
        return () => {
            window.removeEventListener('open-tasks-onboarding', handleOpenTasksOnboarding);
        };
    }, []);
    
    // Resetar flag manual quando fechar (mas manter hasBeenCompleted)
    useEffect(() => {
        if (!showTasksOnboarding && !manualOpenRequested) {
            // Resetar flag manual apenas se não foi solicitado manualmente
            // hasBeenCompleted permanece true para evitar reabertura automática
        }
    }, [showTasksOnboarding, manualOpenRequested]);
    
    const handleTasksOnboardingComplete = async () => {
        // Fechar IMEDIATAMENTE e marcar como completado (persistir em localStorage)
        setShowTasksOnboarding(false);
        setManualOpenRequested(false);
        setHasBeenCompleted(true);
        
        // Persistir em localStorage IMEDIATAMENTE (fallback se backend falhar)
        try {
            localStorage.setItem('flow_hasSeenTasksOnboarding', 'true');
        } catch (e) {
            console.warn('Erro ao salvar no localStorage:', e);
        }
        
        try {
            // Atualizar backend
            await apiPatch('/users/me/onboarding', {
                hasSeenTasksOnboarding: true,
            });
            // Atualizar AuthContext
            await auth?.refreshMe();
        } catch (error) {
            console.error('Erro ao salvar hasSeenTasksOnboarding no backend:', error);
            // Mesmo com erro, manter fechado usando localStorage como fallback
            // O hasBeenCompleted já está true e persistido
        }
    };
    
    // Buscar workflows com verificação de segurança
    const findWorkflowByCategory = (category: 'client' | 'general', defaultId?: string) => {
        if (defaultId && workflows[defaultId]) return workflows[defaultId];
        const found = Object.values(workflows).find((w: Workflow) => w.category === category);
        return found;
    };
    
    const clientWorkflow = workflows[clientWorkflowId] || findWorkflowByCategory('client', clientWorkflowId);
    const generalWorkflow = workflows[generalWorkflowId] || findWorkflowByCategory('general', generalWorkflowId);
    
    // Verificação de segurança: se workflows não existirem, retornar null
    if (!clientWorkflow || !generalWorkflow) {
        console.error('Workflows não encontrados:', { clientWorkflowId, generalWorkflowId, availableWorkflows: Object.keys(workflows) });
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                    <p className="text-red-600 dark:text-red-400 mb-2">Erro: Workflows não configurados</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Por favor, configure os workflows nas Configurações antes de usar as Tarefas.
                    </p>
                </div>
            </div>
        );
    }

    /** Ordena itens de um mesmo dia: todos os posts primeiro (por ordem de status do workflow de post), depois todas as tarefas (por ordem de status do workflow geral). Mesmo status: ordem estável por id. */
    const sortTasksForDay = useCallback((dayTasks: Task[]) => {
        if (!dayTasks.length || !clientWorkflow || !generalWorkflow) return dayTasks;
        const postStatusOrder = clientWorkflow.statuses.map(s => s.id);
        const taskStatusOrder = generalWorkflow.statuses.map(s => s.id);
        const statusIndex = (statusId: string, order: string[]) => {
            const i = order.indexOf(statusId);
            return i >= 0 ? i : 999;
        };
        const posts = dayTasks.filter(t => !t.isGeneral).sort((a, b) => {
            const diff = statusIndex(a.statusId, postStatusOrder) - statusIndex(b.statusId, postStatusOrder);
            return diff !== 0 ? diff : (a.id || '').localeCompare(b.id || '');
        });
        const tasks = dayTasks.filter(t => t.isGeneral).sort((a, b) => {
            const diff = statusIndex(a.statusId, taskStatusOrder) - statusIndex(b.statusId, taskStatusOrder);
            return diff !== 0 ? diff : (a.id || '').localeCompare(b.id || '');
        });
        return [...posts, ...tasks];
    }, [clientWorkflow, generalWorkflow]);

    const checkScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
            setShowScrollArrows({
                left: scrollLeft > 1, // Add a small buffer
                right: scrollLeft < scrollWidth - clientWidth - 1,
            });
        }
    };
    
    useEffect(() => {
        const container = scrollContainerRef.current;
        if(container) {
            checkScroll(); // Initial check
            container.addEventListener('scroll', checkScroll);
            window.addEventListener('resize', checkScroll);

            const handleMouseDown = (e: MouseEvent) => {
                setIsDragging(true);
                setStartX(e.pageX - container.offsetLeft);
                setScrollLeft(container.scrollLeft);
                container.style.cursor = 'grabbing';
            };
        
            const handleMouseLeaveOrUp = () => {
                setIsDragging(false);
                 container.style.cursor = 'grab';
            };
        
            const handleMouseMove = (e: MouseEvent) => {
                if (!isDragging) return;
                e.preventDefault();
                const x = e.pageX - container.offsetLeft;
                const walk = (x - startX) * 2; // scroll-fast
                container.scrollLeft = scrollLeft - walk;
            };

            container.addEventListener('mousedown', handleMouseDown);
            container.addEventListener('mouseleave', handleMouseLeaveOrUp);
            container.addEventListener('mouseup', handleMouseLeaveOrUp);
            container.addEventListener('mousemove', handleMouseMove);

            return () => {
                container.removeEventListener('scroll', checkScroll);
                window.removeEventListener('resize', checkScroll);
                container.removeEventListener('mousedown', handleMouseDown);
                container.removeEventListener('mouseleave', handleMouseLeaveOrUp);
                container.removeEventListener('mouseup', handleMouseLeaveOrUp);
                container.removeEventListener('mousemove', handleMouseMove);
            }
        }
    }, [isDragging, startX, scrollLeft]);


    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
          setActivePopover(null);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

    // Função de ordenação padrão: Posts de clientes primeiro, depois tarefas gerais
    const sortTasksStandard = useCallback((tasksToSort: Task[]) => {
        return [...tasksToSort].sort((a, b) => {
            // 1. Posts de clientes sempre primeiro
            if (!a.isGeneral && b.isGeneral) return -1;
            if (a.isGeneral && !b.isGeneral) return 1;
            
            // 2. Dentro de cada categoria, ordenar por data e título
            const dateCompare = (a.date || '').localeCompare(b.date || '');
            if (dateCompare !== 0) return dateCompare;
            
            // 3. Por cliente (para posts)
            if (!a.isGeneral && !b.isGeneral && a.clientId && b.clientId) {
                const clientA = clients.find(c => c.id === a.clientId)?.name || '';
                const clientB = clients.find(c => c.id === b.clientId)?.name || '';
                const clientCompare = clientA.localeCompare(clientB);
                if (clientCompare !== 0) return clientCompare;
            }
            
            // 4. Por título
            return a.title.localeCompare(b.title);
        });
    }, [clients]);

    const agendaTaskModalReadOnly = useMemo(() => {
        if (!isModalOpen || !selectedTask) return false;
        if (!canEditAgendaCal) return true;
        return selectedTask.isGeneral ? !canEditTasksAgenda : !canEditPostsAgenda;
    }, [isModalOpen, selectedTask, canEditAgendaCal, canEditTasksAgenda, canEditPostsAgenda]);

    // Detecta tarefas de workflows antigos
    const tasksFromOldWorkflows = useMemo(() => {
        if (!tasks || !Array.isArray(tasks)) return [];
        return tasks.filter(task => {
            if (!task || !task.workflowId) return false;
            const currentWorkflowId = task.isGeneral ? generalWorkflowId : clientWorkflowId;
            const isFromOldWorkflow = task.workflowId !== currentWorkflowId;
            
            // Verificar se o status existe no workflow atual
            const currentWorkflow = workflows[currentWorkflowId];
            const statusExists = currentWorkflow?.statuses.some(s => s.id === task.statusId);
            
            // Incluir tarefas que:
            // 1. Têm workflowId diferente do atual, OU
            // 2. Têm o mesmo workflowId mas o status não existe mais no workflow atual
            return isFromOldWorkflow || !statusExists;
        });
    }, [tasks, clientWorkflowId, generalWorkflowId, workflows]);

    // Função para mapear status por categoria
    const mapStatusByCategory = useCallback((oldStatus: StatusDefinition, targetWorkflow: Workflow): string => {
        const sameCategoryStatuses = targetWorkflow.statuses.filter(s => s.category === oldStatus.category);
        if (sameCategoryStatuses.length > 0) {
            return sameCategoryStatuses[0].id;
        }
        return targetWorkflow.statuses[0]?.id || '';
    }, []);

    // Separar tarefas antigas em passadas e futuras usando data da troca de workflow
    const oldWorkflowTasks = useMemo(() => {
        // Buscar data da troca de workflow para cada categoria
        const getWorkflowChangeDate = (isGeneral: boolean): string => {
            const category = isGeneral ? 'general' : 'client';
            const storedDate = localStorage.getItem(`flow_workflowChangeDate_${category}`);
            return storedDate || formatDateToYYYYMMDD(new Date()); // Fallback para hoje se não houver data armazenada
        };
        
        const allOld = tasksFromOldWorkflows.filter(t => !(ignoredTasks?.has(t.id) || false));
        
        // Separar usando data da troca específica para cada tipo de tarefa
        const past: Task[] = [];
        const future: Task[] = [];
        
        allOld.forEach(task => {
            const changeDate = getWorkflowChangeDate(task.isGeneral || false);
            if (task.date < changeDate) {
                past.push(task);
            } else {
                future.push(task);
            }
        });
        
        return { past, future };
    }, [tasksFromOldWorkflows, ignoredTasks]);

    // Mostra modal de migração quando há tarefas de workflows antigos (apenas uma vez)
    useEffect(() => {
        if (tasksFromOldWorkflows.length > 0 && !showMigrationModal) {
            // Verificar se já mostramos o modal antes (usando localStorage)
            const hasShownMigration = localStorage.getItem('flow_migrationModalShown');
            if (!hasShownMigration) {
                setShowMigrationModal(true);
                localStorage.setItem('flow_migrationModalShown', 'true');
            }
        } else if (tasksFromOldWorkflows.length === 0 && showMigrationModal) {
            // Fechar modal automaticamente se não houver mais tarefas antigas
            setShowMigrationModal(false);
        }
    }, [tasksFromOldWorkflows.length, showMigrationModal]);

    const filteredTasks = useMemo(() => {
        const safeTasks = Array.isArray(tasks) ? tasks : [];
        const filtered = safeTasks.filter(task => {
            // Filtro por workflow
            if (filters.workflow !== 'all') {
                const currentWorkflowId = task.isGeneral ? generalWorkflowId : clientWorkflowId;
                const isFromOldWorkflow = task.workflowId && task.workflowId !== currentWorkflowId;
                
                if (filters.workflow === 'current' && isFromOldWorkflow) return false;
                if (filters.workflow === 'old' && !isFromOldWorkflow) return false;
            }
            // Filtro de tipo (Posts/Tarefas) - aplicado primeiro
            if (task.isGeneral && !isGeneralTasksVisible) return false;
            if (!task.isGeneral && !isClientPostsVisible) return false;
            
            // Filtros específicos de posts
            if (!task.isGeneral) {
                if (filters.client !== 'all' && task.clientId !== filters.client) return false;
                if (filters.postType !== 'all' && task.postType !== filters.postType) return false;
            }
            
            // Filtros específicos de tarefas gerais
            if (task.isGeneral) {
                if (filters.category !== 'all' && task.category !== filters.category) return false;
            }
            
            // Filtro de status (para ambos)
            if (filters.status !== 'all' && task.statusId !== filters.status) return false;
            
            // Filtro por responsável (apenas em modo TEAM)
            if (isTeamMode && filters.ownerUserId !== 'all') {
                const taskOwnerId = (task as any).ownerUserId;
                if (filters.ownerUserId === 'none') {
                    if (taskOwnerId) return false; // Se filtro é "none", só mostrar tasks sem responsável
                } else {
                    if (taskOwnerId !== filters.ownerUserId) return false; // Se filtro é um userId, só mostrar tasks desse usuário
                }
            }
            
            return true;
        });
        return sortTasksStandard(filtered);
    }, [tasks, filters, isClientPostsVisible, isGeneralTasksVisible, clientWorkflowId, generalWorkflowId, sortTasksStandard]);
    
    // filteredTasks já inclui a lógica de Posts/Tarefas visíveis
    const visibleTasks = filteredTasks;

    const agendaVisibleSummary = useMemo(
        () =>
            computeAgendaVisibleSummary(visibleTasks, {
                view,
                currentDate,
                workflows,
                clientWorkflowId,
                generalWorkflowId,
            }),
        [visibleTasks, view, currentDate, workflows, clientWorkflowId, generalWorkflowId],
    );

    const agendaIntelligenceItems = useMemo(
        () =>
            buildAgendaIntelligenceItems({
                visibleTasks,
                clients,
                clientNamesById: rosterNameById,
                workflows,
                clientWorkflowId,
                generalWorkflowId,
                view,
                currentDate,
            }),
        [
            visibleTasks,
            clients,
            rosterNameById,
            workflows,
            clientWorkflowId,
            generalWorkflowId,
            view,
            currentDate,
        ],
    );

    const planningQuotaClients = useMemo((): PlanningQuotaClient[] => {
        return clients.map((c) => ({
            id: c.id,
            postFrequency: c.postFrequency,
            postFrequencyQuantity: c.postFrequencyQuantity,
            postFrequencyPeriod: c.postFrequencyPeriod,
            postFrequencyVariable: c.postFrequencyVariable,
        }));
    }, [clients]);

    const onValidatePlanningQuota = useMemo(
        () => createPlanningQuotaValidator(planningQuotaClients, t),
        [planningQuotaClients, t],
    );

    const firstHighlightedTaskId = useMemo(() => {
        if (!agendaHighlight) return null;
        const matching = visibleTasks
            .filter((t) =>
                taskMatchesAgendaHighlight(t, agendaHighlight, workflows, clientWorkflowId, generalWorkflowId),
            )
            .sort((a, b) => (agendaCellDayKey(a) || '').localeCompare(agendaCellDayKey(b) || ''));
        return matching[0]?.id ?? null;
    }, [agendaHighlight, visibleTasks, workflows, clientWorkflowId, generalWorkflowId]);

    const handleAgendaIntelAction = useCallback(
        (item: IntelligenceItem) => {
            const highlight = resolveAgendaHighlightFromIntel(item, {
                knownClientIds: backendClientIds,
            });
            if (highlight) setAgendaHighlight(highlight);
        },
        [backendClientIds],
    );

    useEffect(() => {
        if (!agendaHighlight) {
            highlightNavigatedKeyRef.current = null;
            return;
        }
        const highlightKey = `${agendaHighlight.kind}:${agendaHighlight.clientId ?? ''}:${agendaHighlight.dayKey ?? ''}`;
        if (highlightNavigatedKeyRef.current === highlightKey) return;
        const matching = visibleTasks.filter((t) =>
            taskMatchesAgendaHighlight(t, agendaHighlight, workflows, clientWorkflowId, generalWorkflowId),
        );
        if (matching.length === 0) return;
        highlightNavigatedKeyRef.current = highlightKey;
        const sorted = [...matching].sort((a, b) =>
            (agendaCellDayKey(a) || '').localeCompare(agendaCellDayKey(b) || ''),
        );
        const dayKey = agendaCellDayKey(sorted[0]) || sorted[0].date;
        const targetDate = dayKey ? parseYmdToLocalDate(dayKey) : null;
        if (targetDate) {
            setCurrentDate(targetDate);
            if (isMobile && view === 'monthly') setMobileSelectedDate(targetDate);
        }
    }, [agendaHighlight, visibleTasks, workflows, clientWorkflowId, generalWorkflowId, isMobile, view]);

    useEffect(() => {
        if (!agendaHighlight || !firstHighlightedTaskId) return;
        const timer = window.setTimeout(() => {
            firstHighlightScrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 250);
        return () => window.clearTimeout(timer);
    }, [agendaHighlight, firstHighlightedTaskId, currentDate, view, visibleTasks.length]);

    useEffect(() => {
        if (!agendaHighlight) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setAgendaHighlight(null);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [agendaHighlight]);

    const wrapAgendaTaskCard = useCallback(
        (task: Task, card: React.ReactElement) => {
            const state = getAgendaCardHighlightState(
                task,
                agendaHighlight,
                workflows,
                clientWorkflowId,
                generalWorkflowId,
            );
            const isFirst = task.id === firstHighlightedTaskId;
            return (
                <AgendaHighlightCardWrap
                    key={task.id}
                    state={state}
                    ringClass={agendaHighlight ? getAgendaHighlightRingClass(agendaHighlight.kind) : undefined}
                    scrollRef={isFirst ? firstHighlightScrollRef : undefined}
                >
                    {card}
                </AgendaHighlightCardWrap>
            );
        },
        [agendaHighlight, firstHighlightedTaskId, workflows, clientWorkflowId, generalWorkflowId],
    );

    const handleDateChange = (amount: number) => {
        const newDate = new Date(currentDate);
        if (view === 'weekly' || view === 'list') newDate.setDate(currentDate.getDate() + amount * 7);
        else if (view === 'monthly') newDate.setMonth(currentDate.getMonth() + amount);
        else if (view === 'daily') newDate.setDate(currentDate.getDate() + amount);
        setCurrentDate(newDate);
    };

    const openModal = (task: Partial<Task> | null, date?: string, clientId?: string, isGeneral: boolean = false) => {
        const workflow = isGeneral ? generalWorkflow : clientWorkflow;
        if (!workflow || !workflow.statuses || workflow.statuses.length === 0) {
            console.error('Workflow inválido ao abrir modal:', { isGeneral, workflow });
            setConfirmation({
                isOpen: true,
                title: 'Erro',
                message: t('workflow_not_configured'),
                onConfirm: () => setConfirmation(null),
            });
            return;
        }
        const defaultStatusId = workflow.statuses[0]?.id;
        if (!defaultStatusId) {
            console.error('Workflow sem status configurado:', { isGeneral, workflow });
            setConfirmation({
                isOpen: true,
                title: 'Erro',
                message: t('workflow_not_configured'),
                onConfirm: () => setConfirmation(null),
            });
            return;
        }
        
        // Se task existir e tiver statusId, validar se ainda existe no workflow atual
        // Para novas tarefas, não definir status padrão - usuário deve selecionar
        if (task?.id) {
            // É edição: validar status existente
            let validStatusId = '';
            if (task.statusId) {
                const statusExists = workflow.statuses.some(s => s.id === task.statusId);
                if (statusExists) {
                    validStatusId = task.statusId;
                } else {
                    // Status antigo não existe mais, não definir padrão
                    validStatusId = '';
                }
            }
            setSelectedTask({ ...task, statusId: validStatusId });
        } else {
            setSelectedTask({ date, clientId, statusId: defaultStatusId, isGeneral });
        }
        setIsModalOpen(true);
    };
    const openModalWithStatus = (statusId: string, isGeneral: boolean, date?: string, clientId?: string) => {
        const workflow = isGeneral ? generalWorkflow : clientWorkflow;
        // Validar se o statusId existe no workflow atual
        const statusExists = workflow?.statuses.some(s => s.id === statusId);
        
        if (!statusExists) {
            console.error('Status inválido ao abrir modal:', { statusId, isGeneral, workflow });
            setConfirmation({
                isOpen: true,
                title: 'Erro',
                message: t('status_required'),
                onConfirm: () => setConfirmation(null),
            });
            return;
        }
        
        // Usar o statusId fornecido se for válido
        setSelectedTask({ date: date || formatDateToYYYYMMDD(currentDate), clientId, statusId, isGeneral });
        setIsModalOpen(true);
    };
    const closeModal = () => { setIsModalOpen(false); setSelectedTask(null); };

    // Função para migração individual de tarefa
    const handleIndividualMigration = useCallback((task: Task) => {
        setTaskToMigrate(task);
        setShowIndividualMigrationModal(true);
    }, []);

    const getRange = useCallback(() => {
        if (view === 'daily') {
            const d = formatDateToYYYYMMDD(currentDate);
            return { startDate: d, endDate: d };
        }
        if (view === 'weekly') {
            const days = getWeekDays(currentDate);
            return { startDate: formatDateToYYYYMMDD(days[0]), endDate: formatDateToYYYYMMDD(days[6]) };
        }
        // monthly
        const monthDays = getMonthDays(currentDate);
        return { startDate: formatDateToYYYYMMDD(monthDays[0].date), endDate: formatDateToYYYYMMDD(monthDays[monthDays.length - 1].date) };
    }, [currentDate, view]);

    const reloadTasks = useCallback(async () => {
        try {
        const { startDate, endDate } = getRange();
        const resp = await apiGet<{ items: any[]; total: number }>(
            '/tasks',
            { startDate, endDate, page: 1, pageSize: 1000 }
        );
            
            if (!resp || !resp.items) {
                console.warn('Resposta inválida da API de tarefas:', resp);
                return;
            }
            
            const defaultDateStr = formatDateToYYYYMMDD(new Date());
            const mapped: Task[] = (resp.items || []).map((it: any) => mapApiTaskToTask(it, defaultDateStr));
            
            // Para todas as visualizações, mesclar com tarefas existentes que não estão no range atual
            // Isso garante que tarefas criadas em outras visualizações apareçam quando mudar de view
            setTasks(prev => {
                if (!prev || !Array.isArray(prev)) return mapped;
                // Criar um mapa das tarefas da API (versões mais recentes) por ID
                const apiTasksMap = new Map(mapped.map(t => [t.id, t]));
                
                // Separar tarefas existentes:
                // 1. Tarefas que estão na resposta da API - usar versão da API (mais recente)
                // 2. Tarefas que NÃO estão na resposta da API:
                //    - Se estiver fora do range: manter (para não perder ao mudar de visualização)
                //    - Se estiver dentro do range: manter TODAS (podem estar sendo atualizadas ou ainda não migradas)
                const existingTasks = prev.filter(t => {
                    if (!t || !t.id) return false;
                    if (deletedTaskIdsRef.current.has(t.id)) return false;
                    // Se está na resposta da API, não manter a versão antiga (a API tem a versão atualizada)
                    if (apiTasksMap.has(t.id)) return false;
                    
                    // Verificar se está dentro do range
                    const refDay =
                        agendaCellDayKey(t) ||
                        (t.date && String(t.date).trim().length >= 10 ? String(t.date).trim().slice(0, 10) : '');
                    const isInRange = refDay && refDay >= startDate && refDay <= endDate;
                    if (isInRange) {
                        // Se está dentro do range, manter TODAS as tarefas que não estão na API
                        // Isso inclui:
                        // - Tarefas que foram migradas recentemente (atualização otimista)
                        // - Tarefas que ainda não foram migradas (precisam aparecer)
                        // - Tarefas que estão sendo atualizadas pela API
                        return true;
                    }
                    
                    // Fora do range: manter para não perder ao mudar de visualização
                    return true;
                });
                
                // Combinar: tarefas existentes (não na API) + todas as tarefas da API (incluindo as atualizadas)
                const combined = [...existingTasks, ...mapped];
                // Remover duplicatas baseado no ID (a ordem garante que mapped tem prioridade)
                const unique = Array.from(new Map(combined.map(t => [t.id, t])).values());
                return unique;
            });
        } catch (error) {
            console.error('Erro ao carregar tarefas:', error);
            // Não quebra a aplicação, apenas loga o erro
        }
    }, [getRange, view]); // Removido setTasks - é função estável

    // Função para executar migração individual (deve vir depois de reloadTasks)
    const executeIndividualMigration = useCallback(async (task: Task, newStatusId: string) => {
        const targetWorkflowId = task.isGeneral ? generalWorkflowId : clientWorkflowId;
        try {
            // Atualização otimista: atualizar estado local imediatamente
            setTasks(prev => {
                if (!prev || !Array.isArray(prev)) return prev;
                return prev.map(t => 
                    t.id === task.id 
                        ? { ...t, workflowId: targetWorkflowId, statusId: newStatusId }
                        : t
                );
            });
            
            await apiPut(`/tasks/${task.id}`, {
                workflowId: targetWorkflowId,
                statusId: newStatusId,
            });
            // Aguardar um pouco mais para garantir que a API processou a atualização completamente
            await new Promise(resolve => setTimeout(resolve, 300));
            await reloadTasks();
            setToast({ open: true, message: 'Tarefa migrada com sucesso!' });
            
            // Fechar modal individual se estiver aberto
            setShowIndividualMigrationModal(false);
            setTaskToMigrate(null);
            // O useEffect irá fechar o modal de lote automaticamente se não houver mais tarefas antigas após reloadTasks
        } catch (error) {
            console.error('Erro ao migrar tarefa:', error);
            setToast({ open: true, message: 'Erro ao migrar tarefa. Tente novamente.' });
        }
    }, [generalWorkflowId, clientWorkflowId, reloadTasks, tasks, workflows, ignoredTasks, showMigrationModal]);

    useEffect(() => {
        // Adicionar pequeno delay para evitar múltiplas chamadas simultâneas
        const timeoutId = setTimeout(() => {
            reloadTasks().catch((error) => {
                console.error('Erro ao recarregar tarefas:', error);
            });
        }, 100);
        
        return () => clearTimeout(timeoutId);
    }, [currentDate, view, reloadTasks]); // reloadTasks só muda quando getRange ou view mudam


    const handleSaveTask = (taskToSave: Task) => {
        return (async () => {
            // GARANTIR: Sempre usar workflow fixo correto (ignorar workflowId do taskToSave se houver)
            const targetWorkflowId = taskToSave.isGeneral ? generalWorkflowId : clientWorkflowId;
            const targetWorkflow = workflows[targetWorkflowId];
            
            if (!targetWorkflow) {
                setConfirmation({
                    isOpen: true,
                    title: 'Erro',
                    message: 'Workflow fixo não encontrado. Por favor, recarregue a página.',
                    onConfirm: () => setConfirmation(null),
                });
                return;
            }
            
            // Validação: status precisa existir no workflow fixo
            const statusExists = targetWorkflow.statuses.some(s => s.id === taskToSave.statusId);
            
            if (!statusExists) {
                setConfirmation({
                    isOpen: true,
                    title: 'Status inválido',
                    message: 'O status selecionado não existe no workflow fixo. Por favor, selecione um status válido.',
                    onConfirm: () => setConfirmation(null),
                });
                return;
            }
            
            const payload: any = {
                title: taskToSave.title,
                date: taskToSave.date,
                workflowId: targetWorkflowId,
                statusId: taskToSave.statusId,
                clientId: taskToSave.clientId || null,
                postType: taskToSave.isGeneral ? null : taskToSave.postType || null,
                description: taskToSave.description || null,
                category: taskToSave.category || null,
                origin: taskToSave.origin ?? 'agenda',
                bornAsForecast: taskToSave.bornAsForecast ?? (!taskToSave.isGeneral && taskToSave.category === 'forecast'),
                currentActionId: taskToSave.currentActionId ?? null,
            };
            if (!taskToSave.isGeneral) {
                payload.publishDate = taskToSave.publishDate ?? taskToSave.date;
            } else {
                payload.dueDate = taskToSave.dueDate ?? taskToSave.date;
            }
            
            // Adicionar ownerUserId apenas em modo TEAM (operacional não altera responsável pelo payload)
            if (isTeamMode && (taskToSave as any).ownerUserId && !isOperationalProfile) {
                payload.ownerUserId = (taskToSave as any).ownerUserId;
            }
            
            // Validação: cliente precisa existir no backend (post/forecast: obrigatório; tarefa geral: opcional, mas se informado deve ser válido)
            if (!taskToSave.isGeneral) {
                if (!payload.clientId || !backendClientIds.has(payload.clientId)) {
                    // Em vez de alert/confirm nativo, usamos modais internos:
                    if (clientsForSelect.length === 0) {
                        setIsQuickClientOpen(true);
                    } else {
                        setConfirmation({
                            isOpen: true,
                            title: 'Cliente inválido',
                            message: 'Selecione um cliente existente para vincular esta tarefa ou cadastre um novo cliente.',
                            onConfirm: () => setConfirmation(null),
                        });
                    }
                    return;
                }
            } else if (payload.clientId && !backendClientIds.has(payload.clientId)) {
                setConfirmation({
                    isOpen: true,
                    title: 'Cliente inválido',
                    message: 'Selecione um cliente existente ou deixe em branco.',
                    onConfirm: () => setConfirmation(null),
                });
                return;
            }
            
            const isNewTask = !taskToSave.id?.trim() || taskToSave.id.startsWith('task-');
            try {
                if (isNewTask) {
                    await apiPost('/tasks', payload);
                    logActivity(
                        buildTaskFlowHistoryLine('created', {
                            name: taskToSave.title,
                            page: 'agenda',
                            isPost: !taskToSave.isGeneral,
                            isForecast: taskToSave.category === 'forecast',
                        }),
                    );
                } else {
                    const saved = await apiPut<Record<string, unknown>>(`/tasks/${taskToSave.id}`, payload);
                    if (isTeamMode && !isOperationalProfile) {
                        const resolveName = (id: string) =>
                            agencyProfile.teamMembers?.find((m) => m.id === id)?.name ?? id;
                        await maybePromptOwnerChangeAfterTransition(taskToSave.id, saved, resolveName, {
                            showConfirmation,
                            t,
                        });
                    }
                    logActivity(
                        buildTaskFlowHistoryLine('updated', {
                            name: taskToSave.title,
                            page: 'agenda',
                            isPost: !taskToSave.isGeneral,
                            isForecast: taskToSave.category === 'forecast',
                        }),
                    );
                    setTasks(prev => (prev ?? []).map(t => t.id === taskToSave.id ? {
                        ...t,
                        date: taskToSave.date,
                        publishDate: taskToSave.publishDate ?? t.publishDate,
                        dueDate: taskToSave.dueDate ?? t.dueDate,
                    } : t));
                }
                closeModal();
            } finally {
                try {
                    await reloadTasks();
                } catch (e: any) {
                    // no-op
                }
            }
        })().catch((e: any) => {
            setConfirmation({
                isOpen: true,
                title: 'Erro ao salvar',
                message: `${e.message || t('error_value_required')}`,
                onConfirm: () => setConfirmation(null),
            });
        });
    };

    // no-op mobile helpers removed (reverted to desktop behavior only)

    const handleDragStart = (e: React.DragEvent, task: Task) => {
        e.dataTransfer.setData('taskId', task.id);
        try { 
            e.dataTransfer.effectAllowed = 'move'; 
        } catch {}
        e.currentTarget.classList.add('opacity-50', 'scale-95');
    };

    const handleDuplicateTask = (taskId: string) => {
        const task = tasks.find((t) => t.id === taskId);
        if (!task) return;
        const canDup = task.isGeneral ? canEditTasksAgenda : canEditPostsAgenda;
        if (!canDup) return;

        const targetWorkflowId = task.isGeneral ? generalWorkflowId : clientWorkflowId;
        void (async () => {
            try {
                const payload = buildTaskDuplicatePayload(task, {
                    origin: 'agenda',
                    includeOwnerUserId: isTeamMode && !isOperationalProfile,
                });
                payload.workflowId = task.workflowId || targetWorkflowId;
                const created = await apiPost<Record<string, unknown>>('/tasks', payload);
                const todayStr = formatDateToYYYYMMDD(new Date());
                const mapped = mapApiTaskToTask(created, todayStr);
                setTasks((prev) => {
                    const next = (prev ?? []).filter((t) => t.id !== mapped.id);
                    next.push(mapped);
                    return next;
                });
                logActivity(
                    buildTaskFlowHistoryLine('created', {
                        name: mapped.title,
                        page: 'agenda',
                        isPost: !mapped.isGeneral,
                        isForecast: mapped.category === 'forecast',
                    }),
                );
                notify?.(task.isGeneral ? t('duplicate_task') : t('duplicate_post'));
            } catch {
                notify?.('Não foi possível duplicar. Tente novamente.');
            } finally {
                await reloadTasks();
            }
        })();
    };

    const handleInlineTitleSave = async (taskId: string, title: string) => {
        const task = tasks.find((t) => t.id === taskId);
        if (!task) return;
        const canEdit = task.isGeneral ? canEditTasksAgenda : canEditPostsAgenda;
        if (!canEdit) return;
        const trimmed = title.trim();
        if (!trimmed || trimmed === task.title) return;

        try {
            await apiPut(`/tasks/${taskId}`, { title: trimmed });
            setTasks((prev) => (prev ?? []).map((t) => (t.id === taskId ? { ...t, title: trimmed } : t)));
            logActivity(
                buildTaskFlowHistoryLine('updated', {
                    name: trimmed,
                    page: 'agenda',
                    isPost: !task.isGeneral,
                    isForecast: task.category === 'forecast',
                }),
            );
        } catch {
            notify?.('Não foi possível salvar o título. Tente novamente.');
            throw new Error('inline_title_save_failed');
        }
    };

    const handleDeleteTask = (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        showConfirmation({
            title: t('confirm_delete_title'),
            message: t('confirm_generic_delete_message'),
            onConfirm: () => {
                (async () => {
                    try {
                        deletedTaskIdsRef.current.add(taskId);
                        setTasks((prev) => (prev ?? []).filter((t) => t.id !== taskId));
                        await apiDelete(`/tasks/${taskId}`);
                        if (task)
                            logActivity(
                                buildTaskFlowHistoryLine('deleted', {
                                    name: task.title,
                                    page: 'agenda',
                                    isPost: !task.isGeneral,
                                    isForecast: task.category === 'forecast',
                                }),
                            );
                    } catch {
                        deletedTaskIdsRef.current.delete(taskId);
                        await reloadTasks();
                    } finally {
                        closeModal();
                        await reloadTasks();
                    }
                })();
            }
        });
    };

    const handleDropOnDate = (e: React.DragEvent<HTMLElement>, newDate: string) => {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-indigo-100', 'dark:bg-indigo-900/50');
        const taskId = e.dataTransfer.getData('taskId');
        const task = tasks.find(t => t.id === taskId);

        if (!task || agendaCellDayKey(task) === newDate) return;

        setConfirmation({
            isOpen: true,
            message: task.isGeneral ? t('confirm_task_date_change') : t('confirm_post_date_change'),
            leaveOpenUntilOnConfirmResolves: true,
            onConfirm: () => {
                (async () => {
                    try {
                        await apiPatch(`/tasks/${taskId}/date`, { date: newDate });
                        setTasks(prev => (prev ?? []).map(t => {
                            if (t.id !== taskId) return t;
                            const isPost = !!t.clientId;
                            return {
                                ...t,
                                date: newDate,
                                ...(isPost ? { publishDate: newDate } : { dueDate: newDate }),
                            };
                        }));
                    } finally {
                        logActivity(
                            buildTaskFlowHistoryLine('updated', {
                                name: task.title,
                                page: 'agenda',
                                isPost: !task.isGeneral,
                                isForecast: task.category === 'forecast',
                            }),
                        );
                        setConfirmation(null);
                        await reloadTasks();
                    }
                })();
            }
        });
    };


    const handleDropOnStatus = (e: React.DragEvent<HTMLElement>, statusId: string) => {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-indigo-100', 'dark:bg-indigo-900/50');
        const taskId = e.dataTransfer.getData('taskId');
        const task = tasks.find(t => t.id === taskId);
        if (!task || task.statusId === statusId) return;
        setConfirmation({
            isOpen: true,
            message: t('confirm_reschedule'),
            leaveOpenUntilOnConfirmResolves: true,
            onConfirm: () => {
                (async () => {
                    try {
                        const targetWf = task!.isGeneral ? workflows[generalWorkflowId] : workflows[clientWorkflowId];
                        const flow = resolveLinearFlowForTask(task!, targetWf?.statuses);
                        const defaultSub = flow ? defaultActionIdForStatus(flow, statusId) : undefined;
                        setTasks((prev) =>
                            (prev ?? []).map((t) =>
                                t.id !== taskId
                                    ? t
                                    : {
                                          ...t,
                                          statusId,
                                          ...(flow ? { currentActionId: defaultSub ?? undefined } : {}),
                                      },
                            ),
                        );
                        await apiPatch(`/tasks/${taskId}/status`, {
                            statusId,
                            changeSource: CHANGE_SOURCE.kanban_drag,
                            ...(flow ? { currentActionId: defaultSub ?? null } : {}),
                        });
                        if (task)
                            logActivity(
                                buildTaskFlowHistoryLine('updated', {
                                    name: task.title,
                                    page: 'agenda',
                                    isPost: !task.isGeneral,
                                    isForecast: task.category === 'forecast',
                                }),
                            );
                    } finally {
                        setConfirmation(null);
                        await reloadTasks();
                    }
                })();
            }
        });
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
        e.preventDefault();
        e.currentTarget.classList.add('bg-indigo-100', 'dark:bg-indigo-900/50');
    };

    const handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
        e.currentTarget.classList.remove('bg-indigo-100', 'dark:bg-indigo-900/50');
    }

    /** Áreas Kanban podem usar este handler para pedir data antes de atualizar via API */
    const handleDropOnKanbanDate = (e: React.DragEvent<HTMLElement>) => {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-indigo-100', 'dark:bg-indigo-900/50');
        const taskId = e.dataTransfer.getData('taskId');
        const task = tasks.find((ta) => ta.id === taskId);
        if (!task) return;
        const suggested = agendaCellDayKey(task) || task.date || formatDateToYYYYMMDD(currentDate);
        setKanbanDropDateDraft({ taskId: task.id, task, draftDate: suggested });
    };

    const confirmKanbanDropChosenDate = () => {
        if (!kanbanDropDateDraft) return;
        const trimmed = kanbanDropDateDraft.draftDate.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed) || Number.isNaN(Date.parse(`${trimmed}T12:00:00`))) {
            notify?.(t('invalid_date_yyyy_mm_dd'));
            return;
        }
        const { taskId, task } = kanbanDropDateDraft;
        setKanbanDropDateDraft(null);
        void (async () => {
            try {
                await apiPut(`/tasks/${taskId}/date`, { date: trimmed });
            } catch {
                await apiPost(`/tasks/${taskId}/date`, { date: trimmed });
            } finally {
                logActivity(
                    buildTaskFlowHistoryLine('updated', {
                        name: task.title,
                        page: 'agenda',
                        isPost: !task.isGeneral,
                        isForecast: task.category === 'forecast',
                    }),
                );
                await reloadTasks();
            }
        })();
    };

    /**
     * VISUALIZAÇÃO DIÁRIA LIMPA
     * Layout vertical focado em uma única data
     * Header com degradê compacto
     */
    const renderDailyView = () => {
        const dayStr = formatDateToYYYYMMDD(currentDate);
        const tasksForDay = sortTasksForDay(visibleTasks.filter(t => agendaCellDayKey(t) === dayStr));

        return (
            <div className="max-w-4xl mx-auto space-y-4">
                {/* Header do Dia - Número à esquerda (info principal) */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-md p-4 text-white">
                    <div className="flex items-center gap-4">
                        {/* Número do dia - Grande e destacado à esquerda */}
                        <div className="text-5xl font-bold leading-none">
                            {currentDate.getDate()}
                        </div>
                        
                        {/* Divisor sutil */}
                        <div className="w-px h-12 bg-white/30"></div>
                        
                        {/* Info do dia - À direita */}
                        <div className="flex-1">
                            <h2 className="text-xl font-bold leading-tight">
                                {getDayName(currentDate, 'long', language)}
                            </h2>
                            <p className="text-indigo-100 text-sm mt-0.5">
                                {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Lista de tarefas — slots vazios clean, sem bloco central */}
                {tasksForDay.length === 0 ? (
                    <AgendaWhatToCreateMenu disabled={!canEditAgendaCal}
                        variant="cellBlock"
                        t={t}
                        onPost={() => openModal(null, dayStr, agendaPostContextClientId, false)}
                        onTask={() => openModal(null, dayStr, undefined, true)}
                    />
                ) : (
                    <div className="flex flex-col gap-2">
                                {tasksForDay.map((task) =>
                            wrapAgendaTaskCard(
                                task,
                                <TaskCardWithBadge
                                    task={task}
                                    onClick={() => openModal(task)}
                                    context={context}
                                    onMigrate={handleIndividualMigration}
                                    ignoredTasks={ignoredTasks}
                                    onActionComplete={reloadTasks}
                                    confirmTaskStatusChange={confirmAgendaTaskStatusChange}
                                    confirmPostStatusChange={confirmAgendaPostStatusChange}
                                    sourcePage="agenda"
                                    onNavigateToPage={(page) => setPage(page)}
                                    onDelete={canEditAgendaCal ? handleDeleteTask : undefined}
                                    onDuplicate={canEditAgendaCal ? handleDuplicateTask : undefined}
                                    onInlineTitleSave={handleInlineTitleSave}
                                />,
                            ),
                        )}
                        {/* Botão adicionar no final */}
                        <AgendaWhatToCreateMenu disabled={!canEditAgendaCal}
                            variant="cellBlockCompact"
                            t={t}
                            onPost={() => openModal(null, dayStr, agendaPostContextClientId, false)}
                            onTask={() => openModal(null, dayStr, undefined, true)}
                        />
                    </div>
                )}
            </div>
        );
    };

    const renderClientRowView = (days: Date[]) => {
      const scrollBy = (amount: number) => {
        if(scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
        }
      };

      // Abaixo de lg: layout empilhado por dia (evita scroll horizontal)
      if (!isLg) {
        return (
          <div className="space-y-4 pb-4">
            {days.map(day => {
              const dayStr = formatDateToYYYYMMDD(day);
              const tasksForDay = sortTasksForDay(visibleTasks.filter(t => agendaCellDayKey(t) === dayStr));
              return (
                <div
                  key={dayStr}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
                  onDrop={(e) => handleDropOnDate(e, dayStr)}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-3">
                    <span className="text-sm font-medium">{getDayName(day, 'short', language)}</span>
                    <p className="font-bold text-2xl leading-tight mt-1">{day.getDate()}</p>
                  </div>
                  <div className="p-2 flex flex-col gap-1.5 min-h-[120px]">
                    {tasksForDay.map((task) =>
                      wrapAgendaTaskCard(
                        task,
                        <TaskCardWithBadge
                          task={task}
                          onClick={() => openModal(task)}
                          context={context}
                          onMigrate={handleIndividualMigration}
                          onActionComplete={reloadTasks}
                          confirmTaskStatusChange={confirmAgendaTaskStatusChange}
                          confirmPostStatusChange={confirmAgendaPostStatusChange}
                          sourcePage="agenda"
                          onNavigateToPage={(page) => setPage(page)}
                          onDelete={canEditAgendaCal ? handleDeleteTask : undefined}
                          onDuplicate={canEditAgendaCal ? handleDuplicateTask : undefined}
                          onInlineTitleSave={handleInlineTitleSave}
                        />,
                      ),
                    )}
                    <AgendaWhatToCreateMenu disabled={!canEditAgendaCal}
                      variant="cellRow"
                      t={t}
                      onPost={() => openModal(null, dayStr, agendaPostContextClientId, false)}
                      onTask={() => openModal(null, dayStr, undefined, true)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        );
      }

      return (
        <div 
            className="relative"
            onMouseEnter={() => setIsHoveringAgenda(true)}
            onMouseLeave={() => setIsHoveringAgenda(false)}
        >
             {isAgendaActive && view === 'weekly' && isHoveringAgenda && showScrollArrows.left && (
                <button onClick={() => scrollBy(-300) } className="fixed left-64 md:left-72 top-1/2 -translate-y-1/2 z-[5] p-2 bg-white/80 dark:bg-gray-800/80 rounded-full shadow-lg hover:bg-white dark:hover:bg-gray-700 transition-opacity duration-300">
                <ChevronLeftIcon />
            </button>
             )}
            {isAgendaActive && view === 'weekly' && isHoveringAgenda && showScrollArrows.right && (
                <button onClick={() => scrollBy(300) } className="fixed right-2 md:right-4 lg:right-8 top-1/2 -translate-y-1/2 z-[5] p-2 bg-white/80 dark:bg-gray-800/80 rounded-full shadow-lg hover:bg-white dark:hover:bg-gray-700 transition-opacity duration-300">
                <ChevronRightIcon />
            </button>
            )}
            <div ref={scrollContainerRef} className="overflow-x-auto pb-4 cursor-grab">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600">
                        <div className="grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(180px, 1fr))` }}>
                            {days.map(d => (
                                <div key={d.toISOString()} className="text-white p-3 text-center border-l border-white/20 first:border-l-0">
                                    <span className="text-sm font-medium">{getDayName(d, 'short', language)}</span>
                                    <p className="font-bold text-2xl leading-tight mt-1">{d.getDate()}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <table className="w-full table-fixed border-collapse" style={{ minWidth: `${days.length * 180}px`}}>
                        <thead className="invisible">
                            <tr>
                                {days.map(d => (
                                    <th key={d.toISOString()} className="min-w-[180px] p-0"></th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                {days.map(day => {
                                    const dayStr = formatDateToYYYYMMDD(day);
                                    const tasksForDay = sortTasksForDay(visibleTasks.filter(t => agendaCellDayKey(t) === dayStr));
                                    return (
                                        <td key={dayStr} className="align-top p-2 border-l border-gray-200 dark:border-gray-700 min-h-[200px] transition-colors duration-200" onDrop={(e) => handleDropOnDate(e, dayStr)} onDragOver={handleDragOver} onDragLeave={handleDragLeave}>
                                            <div className="flex flex-col gap-1.5 min-h-[200px]">
                                                {tasksForDay.map((task) =>
                            wrapAgendaTaskCard(
                                task,
                                <TaskCardWithBadge
                                    task={task}
                                    onClick={() => openModal(task)}
                                    context={context}
                                    onMigrate={handleIndividualMigration}
                                    onActionComplete={reloadTasks}
                                    confirmTaskStatusChange={confirmAgendaTaskStatusChange}
                                    confirmPostStatusChange={confirmAgendaPostStatusChange}
                                    sourcePage="agenda"
                                    onNavigateToPage={(page) => setPage(page)}
                                    onDelete={canEditAgendaCal ? handleDeleteTask : undefined}
                                    onDuplicate={canEditAgendaCal ? handleDuplicateTask : undefined}
                                    onInlineTitleSave={handleInlineTitleSave}
                                />,
                            ),
                                                )}
                                                <AgendaWhatToCreateMenu disabled={!canEditAgendaCal}
                                                    variant="cellRow"
                                                    t={t}
                                                    onPost={() => openModal(null, dayStr, agendaPostContextClientId, false)}
                                                    onTask={() => openModal(null, dayStr, undefined, true)}
                                                />
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        );
    };

    const renderDesktopMonthlyGridView = () => {
        const MAX_TASKS_VISIBLE = 2;
        const monthDays = getMonthDays(currentDate);
        const weekDays = getWeekDays(new Date()); 

        return (
            <>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden pb-24">
                <div className="grid grid-cols-7 border-t border-l border-gray-200 dark:border-gray-700">
                    {/* Header com degradê contínuo */}
                    <div className="col-span-7 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-lg">
                        <div className="grid grid-cols-7">
                {weekDays.map(day => (
                                <div key={day.getDay()} className="text-center text-white font-semibold text-sm p-2 border-l border-white/20 first:border-l-0">
                        {getDayName(day, 'short', language)}
                    </div>
                ))}
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-7 border-t border-l border-gray-200 dark:border-gray-700">
                {monthDays.map(({ date, isCurrentMonth }, index) => {
                    const dayStr = formatDateToYYYYMMDD(date);
                    const tasksForDay = sortTasksForDay(visibleTasks.filter(t => agendaCellDayKey(t) === dayStr));
                    const visibleTasksForDay = tasksForDay.slice(0, MAX_TASKS_VISIBLE);
                    const hiddenTasksCount = tasksForDay.length - visibleTasksForDay.length;

                    return (
                        <div key={index}
                             className={`relative min-h-[120px] p-1 border-b border-r border-gray-200 dark:border-gray-700 transition-colors duration-200 flex flex-col ${!isCurrentMonth ? 'bg-gray-100 dark:bg-gray-800/50' : ''}`}
                             onDrop={(e) => handleDropOnDate(e, dayStr)}
                             onDragOver={handleDragOver}
                             onDragLeave={handleDragLeave}
                        >
                            <span className={`font-medium mb-1 text-sm ${isToday(date) ? 'bg-indigo-600 text-white font-semibold rounded-full w-6 h-6 flex items-center justify-center' : ''} ${!isCurrentMonth ? 'text-gray-400 dark:text-gray-500' : !isToday(date) ? 'text-gray-700 dark:text-gray-300' : ''}`}>{date.getDate()}</span>
                            <div className="flex flex-col gap-1">
                                {visibleTasksForDay.map((task) =>
                                    wrapAgendaTaskCard(
                                        task,
                                        <TaskCardWithBadge
                                            task={task}
                                            onClick={() => openModal(task)}
                                            context={context}
                                            compact
                                            badgeSize="small"
                                            onMigrate={handleIndividualMigration}
                                            onActionComplete={reloadTasks}
                                            confirmTaskStatusChange={confirmAgendaTaskStatusChange}
                                            confirmPostStatusChange={confirmAgendaPostStatusChange}
                                            sourcePage="agenda"
                                            onNavigateToPage={(page) => setPage(page)}
                                            onDelete={canEditAgendaCal ? handleDeleteTask : undefined}
                                            onDuplicate={canEditAgendaCal ? handleDuplicateTask : undefined}
                                            onInlineTitleSave={handleInlineTitleSave}
                                        />,
                                    ),
                                )}
                                {hiddenTasksCount > 0 && (
                                    <button 
                                      onClick={() => {
                                        const willOpen = dayStr !== activePopover;
                                        setActivePopover(willOpen ? dayStr : null);
                                        setExtraPopoverCount(willOpen ? hiddenTasksCount : 0);
                                      }}
                                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline w-full text-left p-1 rounded"
                                    >
                                        {t('tasks_more', { count: hiddenTasksCount.toString() })}
                                    </button>
                                )}
                                <AgendaWhatToCreateMenu disabled={!canEditAgendaCal}
                                    variant="cellRow"
                                    t={t}
                                    onPost={() => openModal(null, dayStr, agendaPostContextClientId, false)}
                                    onTask={() => openModal(null, dayStr, undefined, true)}
                                />
                            </div>
                            {activePopover === dayStr && (
                                <div ref={popoverRef} className="absolute z-10 top-10 left-0 w-64 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-2 max-h-60 overflow-y-auto space-y-1">
                                    <p className="font-bold text-sm mb-2 p-1">{date.toLocaleDateString(language, { weekday: 'long', day: 'numeric' })}</p>
                                    {tasksForDay.map((task) =>
                                        wrapAgendaTaskCard(
                                            task,
                                            <TaskCardWithBadge
                                                task={task}
                                                onClick={() => openModal(task)}
                                                context={context}
                                                compact
                                                badgeSize="small"
                                                onMigrate={handleIndividualMigration}
                                                confirmTaskStatusChange={confirmAgendaTaskStatusChange}
                                                confirmPostStatusChange={confirmAgendaPostStatusChange}
                                                sourcePage="agenda"
                                                onNavigateToPage={(page) => setPage(page)}
                                                onDelete={canEditAgendaCal ? handleDeleteTask : undefined}
                                                onDuplicate={canEditAgendaCal ? handleDuplicateTask : undefined}
                                                onInlineTitleSave={handleInlineTitleSave}
                                            />,
                                        ),
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
                </div>
            </div>
            {/* Espaço extra proporcional à quantidade oculta no popover ativo */}
            <div style={{ height: activePopover ? Math.max(48, extraPopoverCount * 28) : 6 }} />
            </>
        );
    };
    
    const renderMobileMonthlyView = () => {
        const monthDays = getMonthDays(currentDate);
        const weekDays = getWeekDays(new Date()); 
        const selectedDayTasks = mobileSelectedDate
            ? sortTasksForDay(visibleTasks.filter(t => agendaCellDayKey(t) === formatDateToYYYYMMDD(mobileSelectedDate)))
            : [];

        return (
            <div>
                 <div className="grid grid-cols-7 text-center text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">
                    {weekDays.map(day => <div key={day.getDay()}>{getDayName(day, 'short', language)}</div>)}
                 </div>
                 <div className="grid grid-cols-7 gap-1">
                    {monthDays.map(({ date, isCurrentMonth }) => {
                        const dayStr = formatDateToYYYYMMDD(date);
                        const tasksForDay = isCurrentMonth ? sortTasksForDay(visibleTasks.filter(t => agendaCellDayKey(t) === dayStr)) : [];
                        const isSelected = mobileSelectedDate && formatDateToYYYYMMDD(mobileSelectedDate) === dayStr;
                        return (
                            <button key={dayStr} onClick={() => setMobileSelectedDate(date)} className={`p-1 h-12 flex flex-col items-center justify-start rounded-lg transition-colors ${!isCurrentMonth ? 'text-gray-300 dark:text-gray-600' : ''} ${isSelected ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                <span className={`text-sm ${isToday(date) && !isSelected ? 'text-indigo-600 font-bold' : ''}`}>{date.getDate()}</span>
                                <div className="flex gap-0.5 mt-1">
                                    {tasksForDay.slice(0, 3).map(task => {
                                        const client = clients.find(c => c.id === task.clientId);
                                        return <div key={task.id} className={`w-1.5 h-1.5 rounded-full ${client ? client.color : 'bg-gray-400'}`}></div>
                                    })}
                                </div>
                            </button>
                        )
                    })}
                 </div>
                 <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    {mobileSelectedDate ? (
                        <div>
                             <h3 className="font-bold text-lg mb-2">{mobileSelectedDate.toLocaleDateString(language, { weekday: 'long', day: 'numeric' })}</h3>
                             {selectedDayTasks.length > 0 ? (
                                <div className="space-y-2">
                                    {selectedDayTasks.map((task) =>
                            wrapAgendaTaskCard(
                                task,
                                <TaskCardWithBadge
                                    task={task}
                                    onClick={() => openModal(task)}
                                    context={context}
                                    onMigrate={handleIndividualMigration}
                                    onActionComplete={reloadTasks}
                                    confirmTaskStatusChange={confirmAgendaTaskStatusChange}
                                    confirmPostStatusChange={confirmAgendaPostStatusChange}
                                    sourcePage="agenda"
                                    onNavigateToPage={(page) => setPage(page)}
                                    onDelete={canEditAgendaCal ? handleDeleteTask : undefined}
                                    onDuplicate={canEditAgendaCal ? handleDuplicateTask : undefined}
                                    onInlineTitleSave={handleInlineTitleSave}
                                />,
                            ),
                                    )}
                                </div>
                             ) : <p className="text-gray-500 dark:text-gray-400">{t('no_tasks_for_this_day')}</p>}
                             <div className="mt-3">
                                <AgendaWhatToCreateMenu disabled={!canEditAgendaCal}
                                    variant="cellRow"
                                    t={t}
                                    onPost={() =>
                                        openModal(null, formatDateToYYYYMMDD(mobileSelectedDate!), agendaPostContextClientId, false)
                                    }
                                    onTask={() => openModal(null, formatDateToYYYYMMDD(mobileSelectedDate!), undefined, true)}
                                />
                             </div>
                        </div>
                    ) : <p className="text-gray-500 dark:text-gray-400 text-center py-4">{t('select_day_to_view_tasks')}</p>}
                 </div>
            </div>
        )
    }

    // Chips de resumo para POSTS (Agenda)
    const renderListView = () => {
        const groupedTasks = visibleTasks.reduce((acc, task) => {
            const dateKey = agendaCellDayKey(task) || null;
            if (dateKey) {
                (acc[dateKey] = acc[dateKey] || []).push(task);
            }
            return acc;
        }, {} as Record<string, Task[]>);

        const sortedDates = Object.keys(groupedTasks).sort();

        // Empty state quando não há tarefas
        if (sortedDates.length === 0) {
            return (
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center py-12 px-4">
                        <CalendarIcon className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            {t('no_tasks_in_period')}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                            {t('no_tasks_in_period_desc')}
                        </p>
                        <AgendaWhatToCreateMenu disabled={!canEditAgendaCal}
                            variant="emptyState"
                            t={t}
                            onPost={() => openModal(null, formatDateToYYYYMMDD(currentDate), agendaPostContextClientId, false)}
                            onTask={() => openModal(null, formatDateToYYYYMMDD(currentDate), undefined, true)}
                        />
                    </div>
                </div>
            );
        }

        return (
            <div className="p-2 max-w-4xl mx-auto space-y-4">
                {sortedDates.map(dateStr => {
                     const date = new Date(dateStr + 'T00:00:00');
                     return (
                        <div key={dateStr} className="mb-4">
                            {/* Header com degradê - Número à esquerda */}
                            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-md p-3 text-white mb-3 sticky top-0 z-10">
                                <div className="flex items-center gap-3">
                                    {/* Número do dia - Grande à esquerda */}
                                    <div className="text-4xl font-bold leading-none">
                                        {date.getDate()}
                                    </div>
                                    
                                    {/* Divisor sutil */}
                                    <div className="w-px h-10 bg-white/30"></div>
                                    
                                    {/* Info do dia - À direita */}
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold leading-tight">
                                            {getDayName(date, 'long', language)}
                                        </h3>
                                        <p className="text-indigo-100 text-xs mt-0.5">
                                            {date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Container com fundo mais claro para contraste */}
                            <div
                                className="flex flex-col gap-2 min-h-[64px] p-3 rounded-lg bg-gray-50 dark:bg-gray-950"
                                onDrop={(e) => handleDropOnDate(e, dateStr)}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                            >
                                {sortTasksForDay(groupedTasks[dateStr] || []).map((task) =>
                            wrapAgendaTaskCard(
                                task,
                                <TaskCardWithBadge
                                    task={task}
                                    onClick={() => openModal(task)}
                                    context={context}
                                    onMigrate={handleIndividualMigration}
                                    onActionComplete={reloadTasks}
                                    confirmTaskStatusChange={confirmAgendaTaskStatusChange}
                                    confirmPostStatusChange={confirmAgendaPostStatusChange}
                                    sourcePage="agenda"
                                    onNavigateToPage={(page) => setPage(page)}
                                    onDelete={canEditAgendaCal ? handleDeleteTask : undefined}
                                    onDuplicate={canEditAgendaCal ? handleDuplicateTask : undefined}
                                    onInlineTitleSave={handleInlineTitleSave}
                                />,
                            ),
                                )}
                                <AgendaWhatToCreateMenu disabled={!canEditAgendaCal}
                                    variant="cellRow"
                                    t={t}
                                    onPost={() => openModal(null, dateStr, agendaPostContextClientId, false)}
                                    onTask={() => openModal(null, dateStr, undefined, true)}
                                />
                            </div>
                        </div>
                     )
                })}
            </div>
        );
    };

    const KanbanBlock: React.FC<{workflow: AppContextType['workflows'][string], tasks: Task[]}> = ({ workflow, tasks }) => (
        <div className={`p-2 ${isMobile ? 'flex flex-col gap-2' : 'flex gap-2 overflow-x-auto pb-2'}`}>
            {workflow.statuses.map(status => {
                const statusConfig = status.color;
                return (
                    <div key={status.id}
                        className={`rounded-lg ${isMobile ? 'w-full bg-gray-100 dark:bg-gray-800' : 'w-72 flex-shrink-0 bg-gray-100 dark:bg-gray-800'}`}
                        onDrop={(e) => handleDropOnStatus(e, status.id)}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                    >
                            <div className={`p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-lg flex items-center justify-between`}>
                                <div className="flex items-center gap-2">
                                    <span className={`w-3 h-3 rounded-full ${statusConfig.bg} border-2 border-white`}></span>
                                    <span className="font-bold text-sm text-white">{t(status.nameKey)}</span>
                                </div>
                            {canEditAgendaCal && canEditPostsAgenda && (
                            <button type="button" onClick={() => openModalWithStatus(status.id, false)} className="w-6 h-6 flex items-center justify-center rounded bg-white/30 hover:bg-white/50 text-white">+</button>
                            )}
                        </div>
                        <div className="p-2 max-h-[calc(100vh-250px)] overflow-y-auto">
                            {tasks.filter(t => t.statusId === status.id).map((task) =>
                                    wrapAgendaTaskCard(
                                    task,
                                    <TaskCardWithBadge
                                    task={task}
                                    onClick={() => openModal(task)}
                                    context={context}
                                    variant="kanbanDesaturated"
                                    onMigrate={handleIndividualMigration}
                                    badgeSize="small"
                                    confirmTaskStatusChange={confirmAgendaTaskStatusChange}
                                    confirmPostStatusChange={confirmAgendaPostStatusChange}
                                    sourcePage="agenda"
                                    onNavigateToPage={(page) => setPage(page)}
                                    onDelete={canEditAgendaCal ? handleDeleteTask : undefined}
                                    onDuplicate={canEditAgendaCal ? handleDuplicateTask : undefined}
                                    onInlineTitleSave={handleInlineTitleSave}
                                    />,
                            ),
                            )}
                            {canEditAgendaCal && canEditPostsAgenda && (
                            <button
                                type="button"
                                onClick={() => openModalWithStatus(status.id, false)}
                                className="w-full h-8 mt-2 flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-400 transition-all"
                            >
                                <PlusIcon className="w-4 h-4" />
                            </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    )

    // Kanban unificado que combina statuses de ambos os workflows
    const UnifiedKanbanBlock: React.FC<{tasks: Task[]}> = ({ tasks }) => {
        // Combina todos os statuses únicos de ambos os workflows E das tarefas existentes
        const allStatuses = useMemo(() => {
            const clientStatuses = clientWorkflow.statuses;
            const generalStatuses = generalWorkflow.statuses;
            const statusMap = new Map<string, { status: StatusDefinition; isGeneral: boolean }>();
            
            // Adiciona statuses do workflow de clientes
            clientStatuses.forEach(status => {
                statusMap.set(status.id, { status, isGeneral: false });
            });
            
            // Adiciona statuses do workflow geral (se não existirem)
            generalStatuses.forEach(status => {
                if (!statusMap.has(status.id)) {
                    statusMap.set(status.id, { status, isGeneral: true });
                }
            });
            
            // Adiciona statuses das tarefas que podem ter workflows antigos
            tasks.forEach(task => {
                if (!statusMap.has(task.statusId)) {
                    // Buscar o workflow original da tarefa
                    let taskWorkflow: Workflow | undefined;
                    if (task.workflowId && workflows[task.workflowId]) {
                        taskWorkflow = workflows[task.workflowId];
                    } else {
                        // Fallback: usar workflow atual baseado em isGeneral
                        taskWorkflow = task.isGeneral ? generalWorkflow : clientWorkflow;
                    }
                    
                    // Buscar o status no workflow da tarefa
                    const taskStatus = taskWorkflow?.statuses.find(s => s.id === task.statusId);
                    if (taskStatus) {
                        statusMap.set(task.statusId, { 
                            status: taskStatus, 
                            isGeneral: task.isGeneral || false 
                        });
                    } else {
                        // Status não encontrado - usar cor padrão (amarelo) em vez de cinza
                        const fallbackStatus: StatusDefinition = {
                            id: task.statusId,
                            nameKey: 'unknown_status',
                            color: { bg: 'bg-yellow-500', text: 'text-yellow-100', border: 'border-yellow-500', ring: 'ring-yellow-500' },
                            category: 'todo'
                        };
                        statusMap.set(task.statusId, { 
                            status: fallbackStatus, 
                            isGeneral: task.isGeneral || false 
                        });
                    }
                }
            });
            
            return Array.from(statusMap.values());
        }, [clientWorkflow, generalWorkflow, tasks, workflows]);

        return (
            <div className={`p-2 ${isMobile ? 'flex flex-col gap-2' : 'flex gap-2 overflow-x-auto pb-2'}`}>
                {allStatuses.map(({ status, isGeneral }) => {
                    const statusConfig = status.color;
                    const tasksForStatus = tasks.filter(t => t.statusId === status.id);
                    return (
                        <div key={status.id}
                            className={`rounded-lg ${isMobile ? 'w-full bg-gray-100 dark:bg-gray-800' : 'w-72 flex-shrink-0 bg-gray-100 dark:bg-gray-800'}`}
                            onDrop={(e) => handleDropOnStatus(e, status.id)}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                        >
                            <div className={`p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-lg flex items-center justify-between`}>
                                <div className="flex items-center gap-2">
                                    <span className={`w-3 h-3 rounded-full ${statusConfig.bg} border-2 border-white`}></span>
                                    <span className="font-bold text-sm text-white">{t(status.nameKey)}</span>
                 </div>
                                {canEditAgendaCal && (isGeneral ? canEditTasksAgenda : canEditPostsAgenda) && (
                                <button 
                                    type="button"
                                    onClick={() => openModalWithStatus(status.id, isGeneral)} 
                                    className="w-6 h-6 flex items-center justify-center rounded bg-white/30 hover:bg-white/50 text-white"
                                >
                                    +
                                </button>
                                )}
            </div>
                            <div className="p-2 max-h-[calc(100vh-250px)] overflow-y-auto">
                                {tasksForStatus.map((task) =>
                                    wrapAgendaTaskCard(
                                    task,
                                    <TaskCardWithBadge
                                        task={task}
                                        onClick={() => openModal(task)}
                                        context={context}
                                        badgeSize="small"
                                        confirmTaskStatusChange={confirmAgendaTaskStatusChange}
                                        confirmPostStatusChange={confirmAgendaPostStatusChange}
                                        sourcePage="agenda"
                                        onNavigateToPage={(page) => setPage(page)}
                                        onDelete={canEditAgendaCal ? handleDeleteTask : undefined}
                                        onDuplicate={canEditAgendaCal ? handleDuplicateTask : undefined}
                                        onInlineTitleSave={handleInlineTitleSave}
                                    />,
                                ),
                                )}
                                {canEditAgendaCal && (isGeneral ? canEditTasksAgenda : canEditPostsAgenda) && (
                                <button
                                    type="button"
                                    onClick={() => openModalWithStatus(status.id, isGeneral)}
                                    className="w-full h-8 mt-2 flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-400 transition-all"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                </button>
                                )}
                </div>
            </div>
                    );
                })}
            </div>
        );
    };

    const renderKanbanView = () => (
        <div className="max-w-4xl mx-auto">
            <UnifiedKanbanBlock tasks={visibleTasks} />
      </div>
    );
    
    const renderContent = () => {
        switch (view) {
            case 'daily': return renderDailyView();
            case 'weekly': return renderClientRowView(getWeekDays(currentDate));
            case 'monthly': return isMobile ? renderMobileMonthlyView() : renderDesktopMonthlyGridView();
            default: return null;
        }
    };

    
    // Status options dinâmicos baseados nos workflows configurados
    const activeStatusOptions = useMemo(() => {
       const clientStatuses = isClientPostsVisible ? (clientWorkflow?.statuses || []) : [];
       const generalStatuses = isGeneralTasksVisible ? (generalWorkflow?.statuses || []) : [];
       const allStatuses = [...clientStatuses, ...generalStatuses];
       const uniqueStatuses = Array.from(new Map(allStatuses.map(s => [s.id, s])).values());
       return uniqueStatuses.map(s => ({ 
           value: s.id, 
           label: t(s.nameKey),
           color: s.color // Incluir cor para badge visual
       }));
    }, [isClientPostsVisible, isGeneralTasksVisible, clientWorkflow, generalWorkflow, t]);

    // Categorias para tarefas gerais
    const categoryOptions = useMemo(() => [
        { value: 'all', label: 'Todas as categorias' },
        { value: 'Reunião', label: 'Reunião' },
        { value: 'Planejamento', label: 'Planejamento' },
        { value: 'Criação (Copy/Design)', label: 'Criação (Copy/Design)' },
        { value: 'Aprovação', label: 'Aprovação' },
        { value: 'Publicação', label: 'Publicação' },
        { value: 'Tráfego/Paid', label: 'Tráfego/Paid' },
        { value: 'Relatório', label: 'Relatório' },
        { value: 'Financeiro', label: 'Financeiro' },
        { value: 'Operacional', label: 'Operacional' },
        { value: 'Suporte/Cliente', label: 'Suporte/Cliente' },
        { value: 'Follow-up', label: 'Follow-up' },
        { value: 'Outros', label: 'Outros' },
    ], []);

    if (!context) {
        return (
            <div className="flex min-h-full min-w-0 w-full flex-1 flex-col items-center justify-center p-8">
                <p className="text-sm text-gray-500 dark:text-gray-400">Carregando...</p>
            </div>
        );
    }

    return (
        <div className="flex min-h-full min-w-0 w-full flex-1 flex-col">
            <ContentPageHeader
                heading={t('agenda')}
                subtitle={t('agenda_page_subtitle')}
                actions={(
                        <AgendaPurpleBarActions
                            t={t}
                            clientWorkflow={clientWorkflow}
                            generalWorkflow={generalWorkflow}
                            isClientPostsVisible={isClientPostsVisible}
                            isGeneralTasksVisible={isGeneralTasksVisible}
                            agendaLegendOpen={agendaLegendOpen}
                            setAgendaLegendOpen={setAgendaLegendOpen}
                            showFiltersPopover={showFiltersPopover}
                            setShowFiltersPopover={setShowFiltersPopover}
                            filters={filters}
                            setFilters={setFilters}
                            clientsForSelect={clientsForSelect}
                            categoryOptions={categoryOptions}
                            activeStatusOptions={activeStatusOptions}
                            tasksFromOldWorkflows={tasksFromOldWorkflows}
                            oldWorkflowTasks={oldWorkflowTasks}
                            isTeamMode={isTeamMode}
                            agencyProfile={agencyProfile}
                            onOpenMigrationModal={() => setShowMigrationModal(true)}
                            setIsClientPostsVisible={setIsClientPostsVisible}
                            setIsGeneralTasksVisible={setIsGeneralTasksVisible}
                            addMenu={(
                                <AgendaWhatToCreateMenu
                                    disabled={!canEditAgendaCal}
                                    variant="toolbar"
                                    t={t}
                                    onPost={() => openModal(null, formatDateToYYYYMMDD(currentDate), agendaPostContextClientId, false)}
                                    onTask={() => openModal(null, formatDateToYYYYMMDD(currentDate), undefined, true)}
                                />
                            )}
                        />
                )}
            />
            <div className={`${CONTENT_PAGE_SCROLL_OUTER} ${CONTENT_BELOW_HEADER_PAD}`}>
                <div className={CONTENT_PAGE_BODY_INNER}>
                    {(isClientPostsVisible || isGeneralTasksVisible) && (
                        <div className="mb-5 flex flex-wrap items-stretch gap-3">
                            <div className="flex min-w-0 flex-1 flex-wrap gap-3">
                                {isClientPostsVisible && (
                                    <div className="flex h-[124px] min-w-[120px] flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50/50 px-4 py-3 shadow-sm dark:border-indigo-800 dark:bg-indigo-900/20 sm:max-w-[160px] sm:flex-initial">
                                        <div className="flex items-center gap-2">
                                            <ClipboardListIcon className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                                            <span className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">{agendaVisibleSummary.posts}</span>
                                        </div>
                                        <div className="text-center text-xs text-indigo-700 dark:text-indigo-300">{t('posts')}</div>
                                    </div>
                                )}
                                {isGeneralTasksVisible && (
                                    <div className="flex h-[124px] min-w-[120px] flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-gray-300 bg-gray-50/80 px-4 py-3 shadow-sm dark:border-gray-600 dark:bg-gray-800/50 sm:max-w-[160px] sm:flex-initial">
                                        <div className="flex items-center gap-2">
                                            <CalendarIcon className="h-5 w-5 shrink-0 text-gray-600 dark:text-gray-400" />
                                            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{agendaVisibleSummary.tasks}</span>
                                        </div>
                                        <div className="text-center text-xs text-gray-700 dark:text-gray-300">{t('tarefas')}</div>
                                    </div>
                                )}
                                <div className="flex h-[124px] min-w-[120px] flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 shadow-sm dark:border-red-800 dark:bg-red-950/30 sm:max-w-[160px] sm:flex-initial">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangleIcon className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                                        <span className="text-2xl font-bold text-red-900 dark:text-red-100">{agendaVisibleSummary.overdue}</span>
                                    </div>
                                    <div className="text-center text-xs text-red-700 dark:text-red-300">{t('agenda_summary_overdue')}</div>
                                </div>
                            </div>
                            <IntelligentCentral
                                className="w-full sm:max-w-[320px]"
                                items={agendaIntelligenceItems}
                                t={t}
                                onAction={handleAgendaIntelAction}
                            />
                        </div>
                    )}
                    {agendaHighlight && (
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 dark:border-amber-800 dark:bg-amber-950/40">
                            <p className="text-sm text-amber-900 dark:text-amber-100">{t('agenda_highlight_active')}</p>
                            <button
                                type="button"
                                onClick={() => setAgendaHighlight(null)}
                                className="shrink-0 rounded-md border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-gray-900 dark:text-amber-200 dark:hover:bg-amber-900/50"
                            >
                                {t('agenda_clear_highlight')}
                            </button>
                        </div>
                    )}
                    {!isClientPostsVisible && !isGeneralTasksVisible && (
                        <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
                            <p className="text-center text-sm text-yellow-800 dark:text-yellow-200">
                                Selecione <strong>Posts</strong> ou <strong>Tarefas</strong> para visualizar itens
                            </p>
                        </div>
                    )}
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <AgendaViewDateStrip
                            embedded
                            t={t}
                            language={language}
                            currentDate={currentDate}
                            setCurrentDate={setCurrentDate}
                            handleDateChange={handleDateChange}
                            view={view}
                            onSetView={handleSetView}
                        />
                        <div className="min-w-0">{renderContent()}</div>
                    </div>
                </div>
            </div>
            
            {/* Onboarding de Tarefas - CAMADA 3 */}
            {/* Onboarding de Tarefas - apenas se não foi completado OU foi solicitado manualmente */}
            {(!hasBeenCompleted || manualOpenRequested) && (
                <TasksOnboarding
                    isOpen={showTasksOnboarding}
                    onComplete={handleTasksOnboardingComplete}
                    onSkip={handleTasksOnboardingComplete}
                />
            )}
            
            {/* Modal de Migração em Lote */}
            <BatchMigrationModal
                isOpen={showMigrationModal && oldWorkflowTasks && (oldWorkflowTasks.past.length > 0 || oldWorkflowTasks.future.length > 0)}
                onClose={() => {
                    setShowMigrationModal(false);
                    // Se fechou manualmente e ainda há tarefas, marcar como mostrado para não aparecer novamente
                    if (oldWorkflowTasks && (oldWorkflowTasks.past.length > 0 || oldWorkflowTasks.future.length > 0)) {
                        localStorage.setItem('flow_migrationModalShown', 'true');
                    }
                }}
                pastTasks={oldWorkflowTasks?.past || []}
                futureTasks={oldWorkflowTasks?.future || []}
                workflows={workflows}
                clientWorkflowId={clientWorkflowId}
                generalWorkflowId={generalWorkflowId}
                mapStatusByCategory={mapStatusByCategory}
                onMigrate={async (tasksToMigrate, statuses, ignorePast) => {
                    // Atualização otimista PRIMEIRO: atualizar estado local imediatamente
                    // Isso garante que a UI seja atualizada imediatamente, antes mesmo de chamar a API
                    setTasks(prev => {
                        if (!prev || !Array.isArray(prev)) return prev;
                        const updated = [...prev];
                        tasksToMigrate.forEach(task => {
                            const targetWorkflowId = task.isGeneral ? generalWorkflowId : clientWorkflowId;
                            const newStatusId = statuses[task.id] || workflows[targetWorkflowId]?.statuses[0]?.id || '';
                            const index = updated.findIndex(t => t.id === task.id);
                            if (index >= 0) {
                                // Atualizar a tarefa com os novos dados de workflow e status
                                updated[index] = {
                                    ...updated[index],
                                    workflowId: targetWorkflowId,
                                    statusId: newStatusId,
                                };
                            } else {
                                // Se a tarefa não está no estado ainda, adicionar (não deveria acontecer, mas por segurança)
                                updated.push({
                                    ...task,
                                    workflowId: targetWorkflowId,
                                    statusId: newStatusId,
                                });
                            }
                        });
                        return updated;
                    });
                    
                    // Agora fazer as chamadas à API
                    const migrationPromises = tasksToMigrate.map(async (task) => {
                        const targetWorkflowId = task.isGeneral ? generalWorkflowId : clientWorkflowId;
                        const newStatusId = statuses[task.id] || workflows[targetWorkflowId]?.statuses[0]?.id || '';
                        
                        try {
                            await apiPut(`/tasks/${task.id}`, {
                                workflowId: targetWorkflowId,
                                statusId: newStatusId,
                            });
                        } catch (error) {
                            console.error(`Erro ao migrar tarefa ${task.id}:`, error);
                        }
                    });
                    
                    await Promise.all(migrationPromises);
                    // NÃO chamar reloadTasks imediatamente - a atualização otimista já atualizou a UI
                    // Apenas aguardar um pouco e depois recarregar para sincronizar com o servidor
                    // Mas não remover as tarefas atualizadas otimisticamente
                    setTimeout(async () => {
                        await reloadTasks();
                    }, 1000);
                    const pastCount = ignorePast ? oldWorkflowTasks.past.length : 0;
                    setToast({ 
                        open: true, 
                        message: `${tasksToMigrate.length} tarefa(s) migrada(s) com sucesso!${pastCount > 0 ? ` ${pastCount} tarefa(s) passada(s) ignorada(s).` : ''}` 
                    });
                    // O useEffect irá fechar o modal automaticamente se não houver mais tarefas antigas após reloadTasks
                }}
                onIgnorePast={(taskIds) => {
                    const newIgnored = new Set(ignoredTasks);
                    taskIds.forEach(id => newIgnored.add(id));
                    setIgnoredTasks(newIgnored);
                    localStorage.setItem('flow_ignoredTasks', JSON.stringify(Array.from(newIgnored)));
                }}
                ignoredTasks={ignoredTasks}
                t={t}
            />

            {/* Modal de Migração Individual */}
            <IndividualMigrationModal
                isOpen={showIndividualMigrationModal}
                onClose={() => {
                    setShowIndividualMigrationModal(false);
                    setTaskToMigrate(null);
                }}
                task={taskToMigrate}
                workflows={workflows}
                clientWorkflowId={clientWorkflowId}
                generalWorkflowId={generalWorkflowId}
                mapStatusByCategory={mapStatusByCategory}
                onMigrate={executeIndividualMigration}
                t={t}
            />
            
            <PostOrForecastModal
                isOpen={isModalOpen}
                onClose={closeModal}
                onSave={handleSaveTask}
                onDelete={handleDeleteTask}
                task={selectedTask}
                context={context}
                clientsForSelect={clientsForSelect}
                onQuickCreateClient={() => setIsQuickClientOpen(true)}
                initialNature="post"
                generalWorkflowId={generalWorkflowId}
                initialDate={selectedTask?.date || selectedTask?.publishDate || selectedTask?.dueDate}
                initialClientId={selectedTask?.clientId}
                onActionComplete={reloadTasks}
                persistenceOrigin="agenda"
                readOnly={agendaTaskModalReadOnly}
                onValidateForecast={onValidatePlanningQuota}
            />
            {kanbanDropDateDraft && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[52] p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-6 text-center">
                        <AlertTriangleIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('agenda_kanban_pick_date_title')}</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{t('agenda_kanban_pick_date_hint')}</p>
                        <input
                            type="date"
                            value={
                                /^\d{4}-\d{2}-\d{2}$/.test(kanbanDropDateDraft.draftDate.trim())
                                    ? kanbanDropDateDraft.draftDate.trim()
                                    : ''
                            }
                            onChange={(e) =>
                                setKanbanDropDateDraft((prev) =>
                                    prev ? { ...prev, draftDate: e.target.value } : prev,
                                )
                            }
                            className="mb-6 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                        />
                        <div className="flex justify-center gap-4">
                            <button
                                type="button"
                                className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600"
                                onClick={() => setKanbanDropDateDraft(null)}
                            >
                                {t('cancel')}
                            </button>
                            <button
                                type="button"
                                className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700"
                                onClick={confirmKanbanDropChosenDate}
                            >
                                {t('confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {confirmation?.isOpen && (
                <ConfirmationModal
                    title={confirmation.title}
                    message={confirmation.message}
                    onConfirm={() => {
                        confirmation.onConfirm();
                        if (!confirmation.leaveOpenUntilOnConfirmResolves) {
                            setConfirmation(null);
                        }
                    }}
                    onClose={() => {
                        confirmation.onCancel?.();
                        setConfirmation(null);
                    }}
                    t={t}
                />
            )}
            <QuickClientModal 
                isOpen={isQuickClientOpen} 
                onClose={() => setIsQuickClientOpen(false)} 
                onCreated={(created) => {
                    if (created?.id) {
                        rosterAddClient({ id: created.id, name: created.name });
                    }
                    setIsQuickClientOpen(false);
                    // seleciona automaticamente no modal de tarefa
                    setSelectedTask(prev => prev ? ({ ...prev, isGeneral: false, clientId: created.id }) : { id: `task-${Date.now()}`, isGeneral: false, clientId: created.id, date: new Date().toISOString().slice(0,10), title: '', statusId: clientWorkflow?.statuses[0]?.id || '' });
                    // Toast de sucesso
                    setToast({ open: true, message: 'Cliente criado com sucesso' });
                }}
                t={t}
                defaultCurrency={agencyProfile.baseCurrency || 'BRL'}
            />
            {toast.open && (
                <div className="fixed inset-0 z-[200] pointer-events-none flex items-start justify-center pt-8">
                    <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg text-sm pointer-events-auto">
                        {toast.message}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgendaPage;