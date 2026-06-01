import React, { useState, useMemo, useContext, useEffect, useCallback, useRef } from 'react';
import { AppContext } from '../contexts/AppContext';
import type { Task } from '../types';
import { formatDateToYYYYMMDD } from '../lib/utils';
import { PlusIcon, AlertTriangleIcon, ChevronRightIcon, ChevronDownIcon, ClipboardListIcon, ClockIcon, CheckCircleIcon, CheckSquareIcon } from './icons';
import TaskCardWithBadge from './tasks/TaskCardWithBadge';
import FilterDropdown from './tasks/FilterDropdown';
import PostOrForecastModal from './PostOrForecastModal';
import TaskStatusHistoryModal from './TaskStatusHistoryModal';
import { apiDelete, apiGet, apiPost, apiPut, apiPatch } from '../lib/api';
import { CHANGE_SOURCE } from '../lib/taskStatusChangeSource';
import { defaultActionIdForStatus, resolveLinearFlowForTask } from '../lib/taskActionFlow';
import { resolveGeneralTaskWorkflowId } from '../lib/colorSchemes';
import { mapApiTaskToTask } from '../lib/mapApiTaskToTask';
import { buildTaskFlowHistoryLine } from '../lib/activityHistoryPayload';
import {
    CONTENT_BELOW_HEADER_PAD,
    CONTENT_PAGE_BODY_INNER,
    CONTENT_PAGE_SCROLL_OUTER,
    HEADER_FILTER_LABEL_SR_ONLY,
    HEADER_GRADIENT_PLUS_CLASS,
    HEADER_GRADIENT_SEARCH_CLASS,
    HEADER_GRADIENT_SELECT_CLASS,
} from '../lib/contentPageHeader';
import ContentPageHeader from './ContentPageHeader';
import TooltipHint from './TooltipHint';
import IntelligentCentral from './IntelligentCentral';
import { buildTasksIntelligenceItems, type IntelligenceItem } from '../lib/intelligentCentral';
import { useAgencyClientsRoster } from '../contexts/AgencyClientsRosterContext';
import { useTasksGlobalSummary } from '../lib/useTasksGlobalSummary';

const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    window.addEventListener('resize', listener);
    return () => window.removeEventListener('resize', listener);
  }, [query]);
  return matches;
};

/** Categorias usadas no filtro da página (tarefas da API podem ter outras, alinhadas à modal unificada) */
const GENERAL_CATEGORIES = ['Financeiro', 'Comercial', 'Cliente', 'Operacional'];

const TarefasPage: React.FC = () => {
    const context = useContext(AppContext);
    const [filters, setFilters] = useState({ 
        category: 'all',
        client: 'all',
        searchTitle: '',
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Partial<Task> | null>(null);
    const [toast, setToast] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
    const [confirmation, setConfirmation] = useState<{
        isOpen?: boolean;
        title?: string;
        message: string;
        onConfirm: () => void;
        onCancel?: () => void;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusHistoryTaskId, setStatusHistoryTaskId] = useState<string | null>(null);
    
    useEffect(() => {
        if (!toast.open) return;
        const id = setTimeout(() => setToast({ open: false, message: '' }), 3000);
        return () => clearTimeout(id);
    }, [toast]);

    if (!context) return null;
    const { t, tasks, setTasks, clients, workflows, generalWorkflowId, showConfirmation, logActivity, agencyProfile, agencyMode, setPage, canEditModule, isOperationalProfile } = context;
    const canEditTasks = canEditModule('tasks');
    const isTeamMode = agencyMode === 'TEAM';
    
    const generalWorkflow = workflows[resolveGeneralTaskWorkflowId(workflows, generalWorkflowId)];
    if (!generalWorkflow) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                    <p className="text-red-600 dark:text-red-400 mb-2">Erro: Workflow de tarefas gerais não configurado</p>
                </div>
            </div>
        );
    }

    // Filtrar apenas tarefas gerais
    const generalTasks = useMemo(() => {
        return tasks.filter(task => task.isGeneral);
    }, [tasks]);

    // Filtrar tarefas pelos filtros
    const filteredTasks = useMemo(() => {
        return generalTasks.filter(task => {
            if (filters.category !== 'all' && task.category !== filters.category) return false;
            if (filters.client !== 'all' && task.clientId !== filters.client) return false;
            if (filters.searchTitle) {
                const q = filters.searchTitle.toLowerCase().trim();
                if (!q) return true;
                const title = (task.title || '').toLowerCase();
                if (!title.includes(q)) return false;
            }
            return true;
        });
    }, [generalTasks, filters]);

    // Resumo para cards
    const todayStr = formatDateToYYYYMMDD(new Date());
    const doneStatusIds = useMemo(() => new Set(
        generalWorkflow?.statuses?.filter((s: { category?: string }) => s.category === 'done').map((s: { id: string }) => s.id) || []
    ), [generalWorkflow]);
    const firstStatusId = generalWorkflow?.statuses?.[0]?.id;
    const inProgressStatusIds = useMemo(() => new Set(
        generalWorkflow?.statuses?.slice(1, -1).map((s: { id: string }) => s.id) || []
    ), [generalWorkflow]);

    const tasksSummary = useMemo(() => {
        const total = filteredTasks.length;
        const todo = firstStatusId ? filteredTasks.filter(t => t.statusId === firstStatusId).length : 0;
        const inProgress = filteredTasks.filter(t => inProgressStatusIds.has(t.statusId)).length;
        const done = filteredTasks.filter(t => doneStatusIds.has(t.statusId)).length;
        const overdue = filteredTasks.filter(t => {
            const due = t.dueDate || t.date;
            if (!due) return false;
            if (due >= todayStr) return false;
            return !doneStatusIds.has(t.statusId);
        }).length;
        return { total, todo, inProgress, done, overdue };
    }, [filteredTasks, firstStatusId, inProgressStatusIds, doneStatusIds, todayStr]);

    const { nameById: rosterNameById } = useAgencyClientsRoster();

    /**
     * Contagens globais (atrasadas, sem responsável, WIP) vindas de /tasks/summary.
     * Quando indisponíveis (carregando ou erro), o builder cai para o cálculo local
     * em `tasks` — preservando o comportamento anterior sem regressão.
     */
    const { counts: tasksGlobalCounts, refresh: refreshTasksSummary } = useTasksGlobalSummary({
        generalWorkflowId,
        enabled: !!generalWorkflowId,
    });

    const tasksIntelligenceItems = useMemo(
        () =>
            buildTasksIntelligenceItems({
                tasks,
                clients,
                clientNamesById: rosterNameById,
                workflows,
                generalWorkflowId,
                isTeamMode,
                globalCounts: tasksGlobalCounts,
            }),
        [tasks, clients, rosterNameById, workflows, generalWorkflowId, isTeamMode, tasksGlobalCounts],
    );

    const handleTasksIntelAction = useCallback(
        (item: IntelligenceItem) => {
            if (item.id === 'tasks-without-client') {
                setFilters((prev) => ({ ...prev, client: 'all' }));
            }
            // demais ações apenas chamam atenção; sem auto-filtros agressivos
            void item;
        },
        [setFilters],
    );

    const confirmTaskStatusChange = useCallback(
        () =>
            new Promise<boolean>((resolve) => {
                setConfirmation({
                    message: t('confirm_task_status_change'),
                    onConfirm: () => {
                        resolve(true);
                    },
                    onCancel: () => {
                        resolve(false);
                    },
                });
            }),
        [t]
    );

    const reloadTasks = useCallback(async () => {
        try {
            // Carregar tarefas da semana atual para ter contexto completo
            const today = new Date();
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay()); // Domingo
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6); // Sábado
            
            const startDate = formatDateToYYYYMMDD(startOfWeek);
            const endDate = formatDateToYYYYMMDD(endOfWeek);
            
            const resp = await apiGet<{ items: any[]; total: number }>(
                '/tasks',
                { startDate, endDate, page: 1, pageSize: 1000 },
                { bypassShortLivedCache: true },
            );
            
            if (!resp || !resp.items) {
                console.warn('Resposta inválida da API de tarefas:', resp);
                return;
            }
            
            const todayStr = formatDateToYYYYMMDD(today);
            const mapped: Task[] = (resp.items || []).map((it: any) => mapApiTaskToTask(it, todayStr));
            
            setTasks(prev => {
                if (!prev || !Array.isArray(prev)) return mapped;
                
                // Criar mapa das tarefas da API para verificação rápida
                const apiTasksMap = new Map(mapped.map(t => [t.id, t]));
                
                // Manter tarefas existentes que não estão na resposta da API (fora do range ou ainda não migradas)
                const existingTasks = prev.filter(t => {
                    if (!t || !t.id) return false;
                    // Se está na resposta da API, usar versão da API (mais recente)
                    if (apiTasksMap.has(t.id)) return false;
                    // Manter apenas tarefas gerais (não posts) para esta página
                    if (!t.isGeneral) return false;
                    // Tarefas gerais no range da API: se não estão na resposta, foram excluídas - não manter
                    const taskDate = t.dueDate || t.date || '';
                    if (taskDate >= startDate && taskDate <= endDate) return false;
                    return true;
                });
                
                // Combinar: tarefas existentes + todas as tarefas da API
                const combined = [...existingTasks, ...mapped];
                // Remover duplicatas baseado no ID (a ordem garante que mapped tem prioridade)
                const unique = Array.from(new Map(combined.map(t => [t.id, t])).values());
                
                
                return unique;
            });
        } catch (error) {
            console.error('Erro ao recarregar tarefas:', error);
        } finally {
            setLoading(false);
            // Refaz o resumo global para refletir criações/edições/conclusões recentes
            void refreshTasksSummary();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshTasksSummary]); // setTasks é estável do contexto, não precisa estar nas dependências

    const hasLoadedRef = useRef(false);
    useEffect(() => {
        if (hasLoadedRef.current) return;
        hasLoadedRef.current = true;
        reloadTasks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Carregar apenas uma vez ao montar

    const normalizeTaskClientId = (c: string | undefined | null) =>
        c == null || String(c).trim() === '' ? '' : String(c).trim();

    const handleSaveTask = async (taskToSave: Task): Promise<void> => {
            const targetWorkflowId = generalWorkflowId;
            const targetWorkflow = workflows[targetWorkflowId];

            if (!targetWorkflow) {
                throw new Error('Workflow fixo não encontrado. Por favor, recarregue a página.');
            }

            const statusExists = targetWorkflow.statuses.some(s => s.id === taskToSave.statusId);
            if (!statusExists) {
                throw new Error('O status selecionado não existe no workflow fixo.');
            }

            const isNewTask = !taskToSave.id?.trim() || taskToSave.id.startsWith('task-');
            const existingTask = !isNewTask ? tasks.find((t) => t.id === taskToSave.id) : undefined;

            if (isNewTask && !taskToSave.category?.trim()) {
                throw new Error('Informe uma categoria para a tarefa.');
            }

            const payload: any = {
                title: taskToSave.title,
                date: taskToSave.date,
                dueDate: taskToSave.dueDate ?? taskToSave.date,
                isProvisionalDueDate: taskToSave.isProvisionalDueDate ?? false,
                workflowId: targetWorkflowId,
                statusId: taskToSave.statusId,
                category: (taskToSave.category ?? existingTask?.category ?? null),
                description: taskToSave.description || null,
                clientId: normalizeTaskClientId(taskToSave.clientId) || null,
                origin: taskToSave.origin ?? 'tarefas',
                bornAsForecast: taskToSave.bornAsForecast ?? false,
                currentActionId: taskToSave.currentActionId ?? null,
            };

            if (payload.clientId && !clients.some((c) => c.id === payload.clientId)) {
                throw new Error('Selecione um cliente existente ou deixe em branco.');
            }
            
            const isOperationSolo = (agencyProfile?.operationMode ?? 'solo') === 'solo';
            if (
                isTeamMode &&
                !isOperationSolo &&
                (taskToSave as any).ownerUserId &&
                !isOperationalProfile
            ) {
                payload.ownerUserId = (taskToSave as any).ownerUserId;
            }
            
            try {
                if (isNewTask) {
                    const created = await apiPost<any>('/tasks', payload);
                    logActivity(
                        buildTaskFlowHistoryLine('created', {
                            name: taskToSave.title,
                            page: 'tasks',
                            isPost: false,
                        }),
                    );
                    const todayStr = formatDateToYYYYMMDD(new Date());
                    const newTask = (created && created.id)
                        ? (() => {
                              const mapped = mapApiTaskToTask(created, todayStr);
                              const fromSave = taskToSave.clientId?.trim();
                              return {
                                  ...mapped,
                                  clientId: mapped.clientId ?? fromSave ?? undefined,
                              };
                          })()
                        : {
                            ...taskToSave,
                            id: created?.id ?? `task-${Date.now()}`,
                            date: taskToSave.dueDate ?? taskToSave.date ?? todayStr,
                            isGeneral: true,
                          } as Task;
                    setTasks(prev => {
                        const next = (prev || []).filter(t => t.id !== newTask.id);
                        next.push(newTask);
                        return next;
                    });
                } else {
                    const statusChanged = !!existingTask && existingTask.statusId !== taskToSave.statusId;
                    if (statusChanged) {
                        const flow = resolveLinearFlowForTask(
                            { ...taskToSave, isGeneral: true } as Task,
                            generalWorkflow.statuses,
                        );
                        const sub =
                            flow && (taskToSave.currentActionId == null || taskToSave.currentActionId === '')
                                ? defaultActionIdForStatus(flow, taskToSave.statusId)
                                : taskToSave.currentActionId ?? null;
                        setTasks((prev) =>
                            (prev ?? []).map((t) =>
                                t.id === taskToSave.id
                                    ? {
                                          ...t,
                                          statusId: taskToSave.statusId,
                                          ...(flow ? { currentActionId: sub ?? undefined } : {}),
                                      }
                                    : t,
                            ),
                        );
                        await apiPatch(`/tasks/${taskToSave.id}/status`, {
                            statusId: taskToSave.statusId,
                            changeSource: CHANGE_SOURCE.update,
                            ...(flow ? { currentActionId: sub ?? null } : {}),
                        });
                    }

                    const dueOrDate = taskToSave.dueDate ?? taskToSave.date;
                    const existingDueOrDate = existingTask?.dueDate ?? existingTask?.date;
                    const substatusChanged =
                        !!existingTask &&
                        (existingTask.currentActionId ?? null) !== (taskToSave.currentActionId ?? null);
                    const hasNonStatusChanges =
                        !existingTask ||
                        (existingTask.title || '') !== (taskToSave.title || '') ||
                        (existingDueOrDate || '') !== (dueOrDate || '') ||
                        (existingTask.category || '') !== (taskToSave.category || '') ||
                        (existingTask.description || '') !== (taskToSave.description || '') ||
                        normalizeTaskClientId(existingTask.clientId) !==
                            normalizeTaskClientId(taskToSave.clientId) ||
                        substatusChanged;

                    if (!hasNonStatusChanges) {
                        logActivity(
                            buildTaskFlowHistoryLine('updated', {
                                name: taskToSave.title,
                                page: 'tasks',
                                isPost: false,
                            }),
                        );
                        closeModal();
                        return;
                    }

                    const updated = await apiPut<any>(`/tasks/${taskToSave.id}`, payload);
                    logActivity(
                        buildTaskFlowHistoryLine('updated', {
                            name: taskToSave.title,
                            page: 'tasks',
                            isPost: false,
                        }),
                    );
                    const todayStr = formatDateToYYYYMMDD(new Date());
                    const row = updated as Record<string, unknown> | null | undefined;
                    if (row?.id) {
                        const updatedTask = mapApiTaskToTask(row as Record<string, unknown>, todayStr);
                        const fromApi = row.clientId ?? row.client_id;
                        const nextClientId =
                            fromApi === undefined || fromApi === null
                                ? normalizeTaskClientId(taskToSave.clientId) || undefined
                                : fromApi === ''
                                  ? undefined
                                  : String(fromApi);
                        setTasks((prev) =>
                            (prev ?? []).map((t) =>
                                t.id === updatedTask.id ? { ...updatedTask, clientId: nextClientId } : t,
                            ),
                        );
                    } else {
                        const cid = normalizeTaskClientId(taskToSave.clientId) || undefined;
                        setTasks((prev) =>
                            (prev ?? []).map((t) =>
                                t.id === taskToSave.id ? { ...t, ...taskToSave, clientId: cid } : t,
                            ),
                        );
                    }
                }
                closeModal();
            } finally {
                if (isNewTask) {
                    setTimeout(() => { reloadTasks(); }, 0);
                } else {
                    await reloadTasks();
                }
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
                        await apiDelete(`/tasks/${taskId}`);
                        if (task)
                            logActivity(
                                buildTaskFlowHistoryLine('deleted', {
                                    name: task.title,
                                    page: 'tasks',
                                    isPost: false,
                                }),
                            );
                        setTasks(prev => (prev || []).filter(t => t.id !== taskId));
                    } finally {
                        closeModal();
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
            message: t('confirm_task_status_change'),
            onConfirm: () => {
                (async () => {
                    try {
                        const flow = task ? resolveLinearFlowForTask(task, generalWorkflow.statuses) : null;
                        const defaultSub = flow ? defaultActionIdForStatus(flow, statusId) : undefined;
                        setTasks((prev) =>
                            (prev ?? []).map((t) =>
                                t.id === taskId
                                    ? {
                                          ...t,
                                          statusId,
                                          ...(flow ? { currentActionId: defaultSub ?? undefined } : {}),
                                      }
                                    : t,
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
                                    page: 'tasks',
                                    isPost: false,
                                }),
                            );
                    } catch {
                        await reloadTasks();
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
    };

    const updateTaskStatusInList = useCallback((taskId: string, statusId: string, currentActionId?: string | null) => {
        setTasks((prev) =>
            (prev ?? []).map((t) =>
                t.id === taskId
                    ? {
                          ...t,
                          statusId,
                          ...(currentActionId !== undefined ? { currentActionId: currentActionId ?? undefined } : {}),
                      }
                    : t,
            ),
        );
    }, [setTasks]);

    const handleTaskActionComplete = useCallback(
        async (patchResult?: unknown) => {
            if (patchResult && typeof patchResult === 'object' && patchResult !== null && 'id' in patchResult) {
                const row = patchResult as Record<string, unknown>;
                const todayStr = formatDateToYYYYMMDD(new Date());
                const mapped = mapApiTaskToTask(row, todayStr);
                setTasks((prev) =>
                    (prev ?? []).map((t) => (t.id === mapped.id ? { ...t, ...mapped } : t)),
                );
            }
            await reloadTasks();
        },
        [reloadTasks, setTasks],
    );

    const openModal = (task: Task | null) => {
        setSelectedTask(task ? { ...task } : { isGeneral: true });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedTask(null);
    };

    const openModalWithStatus = (statusId: string) => {
        setSelectedTask({ 
            isGeneral: true,
            statusId,
            date: formatDateToYYYYMMDD(new Date()),
        });
        setIsModalOpen(true);
    };

    const isLg = useMediaQuery('(min-width: 1024px)');
    const [accordionStatusId, setAccordionStatusId] = useState<string | null>(null);

    if (loading) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 flex flex-col min-h-full">
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-full min-w-0 w-full flex-1 flex-col">
            <ContentPageHeader
                heading={t('tarefas')}
                subtitle={t('tasks_page_subtitle')}
                actions={(
                    <>
                            <input
                                type="text"
                                placeholder={t('tasks_search_placeholder')}
                                value={filters.searchTitle || ''}
                                onChange={(e) => setFilters((prev) => ({ ...prev, searchTitle: e.target.value }))}
                                className={HEADER_GRADIENT_SEARCH_CLASS}
                            />
                            <FilterDropdown
                                label={t('client')}
                                name="client"
                                options={[{ value: 'all', label: t('planning_all_clients') }, ...clients.map(c => ({ value: c.id, label: c.name }))]}
                                value={filters.client || 'all'}
                                onChange={(name, value) => setFilters(prev => ({ ...prev, [name]: value }))}
                                labelClassName={HEADER_FILTER_LABEL_SR_ONLY}
                                selectClassName={HEADER_GRADIENT_SELECT_CLASS}
                            />
                            <FilterDropdown
                                label="Categoria"
                                name="category"
                                options={[{ value: 'all', label: 'Todas as categorias' }, ...GENERAL_CATEGORIES.map(c => ({ value: c, label: c }))]}
                                value={filters.category || 'all'}
                                onChange={(name, value) => setFilters(prev => ({ ...prev, [name]: value }))}
                                labelClassName={HEADER_FILTER_LABEL_SR_ONLY}
                                selectClassName={HEADER_GRADIENT_SELECT_CLASS}
                            />
                            {canEditTasks && (
                                <TooltipHint label={t('new_task')}>
                                    <button
                                        type="button"
                                        onClick={() => openModal(null)}
                                        aria-label={t('new_task')}
                                        className={HEADER_GRADIENT_PLUS_CLASS}
                                    >
                                        <PlusIcon className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
                                    </button>
                                </TooltipHint>
                            )}
                    </>
                )}
            />

            <div className={`${CONTENT_PAGE_SCROLL_OUTER} ${CONTENT_BELOW_HEADER_PAD}`}>
                <div className={CONTENT_PAGE_BODY_INNER}>
                {/* Cards KPI + Central Inteligente (padrão Agenda) */}
                <div className="mb-10 flex w-full flex-wrap items-stretch gap-3">
                    <div className="flex min-w-0 flex-1 flex-wrap gap-3">
                        <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/20 px-4 py-3 shadow-sm h-[124px] min-w-[132px] flex-1 sm:flex-initial">
                            <div className="flex items-center gap-2">
                                <ClipboardListIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                <span className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">{tasksSummary.total}</span>
                            </div>
                            <div className="text-xs text-indigo-700 dark:text-indigo-300 text-center">{t('tasks_summary_total')}</div>
                        </div>
                        <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-3 shadow-sm h-[124px] min-w-[132px] flex-1 sm:flex-initial">
                            <div className="flex items-center gap-2">
                                <CheckSquareIcon className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0" />
                                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{tasksSummary.todo}</span>
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-400 text-center">{t('tasks_summary_todo')}</div>
                        </div>
                        <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20 px-4 py-3 shadow-sm h-[124px] min-w-[132px] flex-1 sm:flex-initial">
                            <div className="flex items-center gap-2">
                                <ClockIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                                <span className="text-2xl font-bold text-amber-900 dark:text-amber-100">{tasksSummary.inProgress}</span>
                            </div>
                            <div className="text-xs text-amber-700 dark:text-amber-300 text-center">{t('tasks_summary_in_progress')}</div>
                        </div>
                        <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/20 px-4 py-3 shadow-sm h-[124px] min-w-[132px] flex-1 sm:flex-initial">
                            <div className="flex items-center gap-2">
                                <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{tasksSummary.done}</span>
                            </div>
                            <div className="text-xs text-emerald-700 dark:text-emerald-300 text-center">{t('tasks_summary_done')}</div>
                        </div>
                        <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20 px-4 py-3 shadow-sm h-[124px] min-w-[132px] flex-1 sm:flex-initial">
                            <div className="flex items-center gap-2">
                                <AlertTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                                <span className="text-2xl font-bold text-red-900 dark:text-red-100">{tasksSummary.overdue}</span>
                            </div>
                            <div className="text-xs text-red-700 dark:text-red-300 text-center">{t('tasks_summary_overdue')}</div>
                        </div>
                    </div>
                    <IntelligentCentral
                        className="w-full sm:max-w-[320px]"
                        items={tasksIntelligenceItems}
                        t={t}
                        onAction={handleTasksIntelAction}
                    />
                </div>

                {generalTasks.length === 0 && (
                    <p className="mb-4 rounded-lg border border-dashed border-gray-300 bg-gray-50/80 px-4 py-3 text-center text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300">
                        {t('empty_state_no_tasks')}
                    </p>
                )}

                {/* Desktop lg: Kanban com colunas flex; abaixo de lg: accordion por status */}
                {/* Board Kanban — sempre visível, mesmo sem dados */}
                {isLg ? (
                <div className="flex min-h-0 w-full flex-1 flex-col">
                <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
                    {generalWorkflow.statuses.map(status => {
                        const statusConfig = status.color;
                        const tasksForStatus = filteredTasks.filter(t => t.statusId === status.id);
                        return (
                            <div
                                key={status.id}
                                className="flex flex-col rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm min-h-[360px]"
                                {...(canEditTasks
                                    ? {
                                          onDrop: (e: React.DragEvent<HTMLDivElement>) => handleDropOnStatus(e, status.id),
                                          onDragOver: handleDragOver,
                                          onDragLeave: handleDragLeave,
                                      }
                                    : {})}
                            >
                                <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-xl flex items-center justify-between flex-shrink-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-3 h-3 rounded-full ${statusConfig.bg} border-2 border-white`}></span>
                                        <span className="font-bold text-sm text-white">{t(status.nameKey)}</span>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-lg bg-white/25 text-white text-xs font-medium">{tasksForStatus.length}</span>
                                </div>
                                <div className="p-2 flex-1 min-h-[320px] overflow-y-auto space-y-2">
                                    {tasksForStatus.map(task => (
                                        <TaskCardWithBadge
                                            key={task.id}
                                            task={task}
                                            onClick={() => openModal(task)}
                                            context={context}
                                            variant="kanbanDesaturated"
                                            badgeSize="small"
                                            onActionComplete={handleTaskActionComplete}
                                            onStatusChange={updateTaskStatusInList}
                                            sourcePage="tarefas"
                                            onNavigateToPage={(page) => setPage(page)}
                                            confirmTaskStatusChange={confirmTaskStatusChange}
                                            onOpenStatusHistory={() => setStatusHistoryTaskId(task.id)}
                                            onDelete={canEditTasks ? handleDeleteTask : undefined}
                                        />
                                    ))}
                                    {canEditTasks && (
                                    <button
                                        onClick={() => openModalWithStatus(status.id)}
                                        className="w-full h-12 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-400 transition-all"
                                    >
                                        <PlusIcon className="w-5 h-5 mr-1" />
                                        <span className="text-sm">{t('kanban_add_task')}</span>
                                    </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                </div>
            ) : (
                <div className="flex min-h-0 w-full flex-1 flex-col">
                <div className="mb-6 min-h-0 flex-1 space-y-2 overflow-auto">
                    {generalWorkflow.statuses.map(status => {
                        const statusConfig = status.color;
                        const tasksForStatus = filteredTasks.filter(t => t.statusId === status.id);
                        const isExpanded = accordionStatusId === status.id;
                        return (
                            <div key={status.id} className="rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setAccordionStatusId(isExpanded ? null : status.id)}
                                    className="w-full p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-lg flex items-center justify-between text-left"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className={`w-3 h-3 rounded-full ${statusConfig.bg} border-2 border-white`}></span>
                                        <span className="font-bold text-sm text-white">{t(status.nameKey)} ({tasksForStatus.length})</span>
                                    </div>
                                    {isExpanded ? <ChevronDownIcon className="w-5 h-5 text-white flex-shrink-0" /> : <ChevronRightIcon className="w-5 h-5 text-white flex-shrink-0" />}
                                </button>
                                {isExpanded && (
                                    <div className="p-2 max-h-[50vh] overflow-y-auto">
                                        {tasksForStatus.map(task => (
                                            <TaskCardWithBadge
                                                key={task.id}
                                                task={task}
                                                onClick={() => openModal(task)}
                                                context={context}
                                                variant="kanbanDesaturated"
                                                badgeSize="small"
                                                onActionComplete={handleTaskActionComplete}
                                                onStatusChange={updateTaskStatusInList}
                                                sourcePage="tarefas"
                                                onNavigateToPage={(page) => setPage(page)}
                                                confirmTaskStatusChange={confirmTaskStatusChange}
                                                onOpenStatusHistory={() => setStatusHistoryTaskId(task.id)}
                                                onDelete={canEditTasks ? handleDeleteTask : undefined}
                                            />
                                        ))}
                                        {canEditTasks && (
                                        <button
                                            onClick={() => openModalWithStatus(status.id)}
                                            className="w-full h-12 mt-2 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-400 transition-all"
                                        >
                                            <PlusIcon className="w-5 h-5 mr-1" />
                                            <span className="text-sm">{t('kanban_add_task')}</span>
                                        </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                </div>
            )}

                </div>
            </div>

            {/* Modais */}
            <PostOrForecastModal
                isOpen={isModalOpen}
                onClose={closeModal}
                onSave={handleSaveTask}
                onDelete={handleDeleteTask}
                task={selectedTask}
                context={context}
                clientsForSelect={clients.map((c) => ({ id: c.id, name: c.name }))}
                onQuickCreateClient={() => {}}
                initialNature="post"
                generalWorkflowId={generalWorkflowId}
                initialDate={selectedTask?.date || selectedTask?.dueDate || selectedTask?.publishDate}
                onActionComplete={reloadTasks}
                persistenceOrigin="tarefas"
                readOnly={!canEditTasks}
            />

            <TaskStatusHistoryModal
                isOpen={!!statusHistoryTaskId}
                taskId={statusHistoryTaskId}
                variant="task"
                onClose={() => setStatusHistoryTaskId(null)}
                t={t}
            />

            {/* Toast */}
            {toast.open && (
                <div className="fixed bottom-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-md shadow-lg z-50">
                    {toast.message}
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-6 text-center">
                        <AlertTriangleIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                        {confirmation.title && <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{confirmation.title}</h2>}
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{confirmation.message}</p>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => {
                                    confirmation.onCancel?.();
                                    setConfirmation(null);
                                }}
                                className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600"
                            >
                                {t('cancel')}
                            </button>
                            <button onClick={() => { confirmation.onConfirm(); setConfirmation(null); }} className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700">{t('confirm')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TarefasPage;
