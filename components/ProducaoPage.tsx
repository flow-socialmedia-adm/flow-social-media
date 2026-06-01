import React, { useState, useMemo, useContext, useEffect, useCallback, useRef } from 'react';
import { AppContext } from '../contexts/AppContext';
import { AuthContext } from '../contexts/AuthContext';
import type { Task, AppContextType, Workflow } from '../types';
import { PostType as PostTypeEnum } from '../types';
import { formatDateToYYYYMMDD } from '../lib/utils';
import { PlusIcon, AlertTriangleIcon, ChevronRightIcon, ChevronDownIcon } from './icons';
import PostOrForecastModal from './PostOrForecastModal';
import { mapApiTaskToTask } from '../lib/mapApiTaskToTask';
import { buildTaskFlowHistoryLine } from '../lib/activityHistoryPayload';
import FilterDropdown from './tasks/FilterDropdown';
import { apiDelete, apiGet, apiPost, apiPut, apiPatch } from '../lib/api';
import { CHANGE_SOURCE } from '../lib/taskStatusChangeSource';
import { maybePromptOwnerChangeAfterTransition } from '../lib/ownerSuggestionPrompt';
import { defaultActionIdForStatus, getPostLinearFlow } from '../lib/taskActionFlow';
import {
    CONTENT_BELOW_HEADER_PAD,
    CONTENT_PAGE_BODY_INNER,
    CONTENT_PAGE_SCROLL_OUTER,
    HEADER_FILTER_LABEL_SR_ONLY,
    HEADER_GRADIENT_PLUS_CLASS,
    HEADER_GRADIENT_SEARCH_CLASS,
    HEADER_GRADIENT_SELECT_CLASS,
} from '../lib/contentPageHeader';
import PhoneInput from './PhoneInput';
import { useAgencyClientsRoster } from '../contexts/AgencyClientsRosterContext';
import IntelligentCentral from './IntelligentCentral';
import { buildPostsIntelligenceItems, type IntelligenceItem } from '../lib/intelligentCentral';
import { usePostsGlobalSummary } from '../lib/usePostsGlobalSummary';
import { isRealPostFlowTask } from '../lib/taskActionFlow';
import { createPlanningQuotaValidator, type PlanningQuotaClient } from '../lib/planningQuota';
import { POST_KANBAN_COLUMNS, getPostColumnByStatusId } from '../lib/constants';
import { resolveClientPostWorkflowId } from '../lib/colorSchemes';
import PostCard from './posts/PostCard';
import TaskStatusHistoryModal from './TaskStatusHistoryModal';
import { ClipboardListIcon, CheckCircleIcon, ClockIcon, SparklesIcon } from './icons';
import ContentPageHeader from './ContentPageHeader';
import TooltipHint from './TooltipHint';

const POSTS_MODAL_TARGET_KEY = 'flow_posts_edit_target_task_id';

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

// Modal de criação rápida de cliente (reutilizado do AgendaPage)
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

const ProducaoPage: React.FC = () => {
    const context = useContext(AppContext);
    const [filters, setFilters] = useState({ 
        client: 'all',
        postType: 'all',
        status: 'all',
        searchTitle: '',
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Partial<Task> | null>(null);
    const [isQuickClientOpen, setIsQuickClientOpen] = useState(false);
    const [toast, setToast] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
    const [confirmation, setConfirmation] = useState<{ isOpen: boolean; title?: string; message: string; onConfirm: () => void; onCancel?: () => void; } | null>(null);
    const [accordionExpanded, setAccordionExpanded] = useState<string | null>('pauta');
    const [statusHistoryTaskId, setStatusHistoryTaskId] = useState<string | null>(null);
    const isMobile = useMediaQuery('(max-width: 768px)');

    useEffect(() => {
        if (!toast.open) return;
        const id = setTimeout(() => setToast({ open: false, message: '' }), 3000);
        return () => clearTimeout(id);
    }, [toast]);

    if (!context) return null;
    const { t, tasks, setTasks, workflows, clientWorkflowId, showConfirmation, logActivity, agencyProfile, agencyMode, setPage, canEditModule, isOperationalProfile } = context;
    const canEditPosts = canEditModule('posts');
    
    const {
        roster: clientsForSelect,
        idSet: backendClientIds,
        addClient: rosterAddClient,
    } = useAgencyClientsRoster();
    const isTeamMode = agencyMode === 'TEAM';
    
    const auth = useContext(AuthContext);
    
    const clientWorkflow = workflows[resolveClientPostWorkflowId(workflows, clientWorkflowId)];
    if (!clientWorkflow) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                    <p className="text-red-600 dark:text-red-400 mb-2">Erro: Workflow de posts não configurado</p>
                </div>
            </div>
        );
    }


    // Filtrar apenas posts reais (exclui previsões do planejamento)
    const posts = useMemo(() => {
        return tasks.filter((task) => isRealPostFlowTask(task));
    }, [tasks]);

    const planningQuotaClients = useMemo((): PlanningQuotaClient[] => {
        return (context?.clients ?? []).map((c) => ({
            id: c.id,
            postFrequency: c.postFrequency,
            postFrequencyQuantity: c.postFrequencyQuantity,
            postFrequencyPeriod: c.postFrequencyPeriod,
            postFrequencyVariable: c.postFrequencyVariable,
        }));
    }, [context?.clients]);

    const onValidatePlanningQuota = useMemo(
        () => createPlanningQuotaValidator(planningQuotaClients, t),
        [planningQuotaClients, t],
    );

    // Filtrar posts pelos filtros
    const filteredPosts = useMemo(() => {
        return posts.filter(post => {
            if (filters.client !== 'all' && post.clientId !== filters.client) return false;
            if (filters.postType !== 'all' && post.postType !== filters.postType) return false;
            if (filters.status !== 'all' && post.statusId !== filters.status) return false;
            if (filters.searchTitle?.trim()) {
                const q = filters.searchTitle.trim().toLowerCase();
                if (!(post.title || '').toLowerCase().includes(q)) return false;
            }
            return true;
        });
    }, [posts, filters]);

    // Agrupar posts por coluna Kanban (5 colunas)
    const postsByColumn = useMemo(() => {
        const byCol: Record<string, Task[]> = { pauta: [], producao: [], aprovacao: [], agendamento: [], publicacao: [] };
        for (const post of filteredPosts) {
            const colId = getPostColumnByStatusId(post.statusId);
            if (byCol[colId]) byCol[colId].push(post);
        }
        return byCol;
    }, [filteredPosts]);

    // Ordenar posts em cada coluna
    const postsByColumnSorted = useMemo(() => {
        if (!clientWorkflow) return postsByColumn;
        const statusOrder = new Map(clientWorkflow.statuses.map((s, i) => [s.id, i]));
        const byCol = { ...postsByColumn };
        for (const colId of Object.keys(byCol)) {
            const arr = [...(byCol[colId] || [])];
            arr.sort((a, b) => {
                const ai = statusOrder.get(a.statusId) ?? 999;
                const bi = statusOrder.get(b.statusId) ?? 999;
                if (ai !== bi) return ai - bi;
                const dateA = a.publishDate ?? a.date ?? '';
                const dateB = b.publishDate ?? b.date ?? '';
                return dateA.localeCompare(dateB);
            });
            byCol[colId] = arr;
        }
        return byCol;
    }, [postsByColumn, clientWorkflow]);

    // Resumo para cards
    const postsSummary = useMemo(() => {
        const total = filteredPosts.length;
        const producao = filteredPosts.filter((p) => getPostColumnByStatusId(p.statusId) === 'producao').length;
        const aprovacao = filteredPosts.filter((p) => getPostColumnByStatusId(p.statusId) === 'aprovacao').length;
        const agendamento = filteredPosts.filter((p) => getPostColumnByStatusId(p.statusId) === 'agendamento').length;
        const publicacao = filteredPosts.filter((p) => getPostColumnByStatusId(p.statusId) === 'publicacao').length;
        return { total, producao, aprovacao, agendamento, publicacao };
    }, [filteredPosts]);

    // Status que existe no workflow para "add" em cada coluna
    /** Primeiro status da coluna: ordem de `col.statusIds` (ex.: aprovação = aguardando_aprovacao antes de aprovado). */
    const firstStatusIdByColumn = useMemo(() => {
        const map: Record<string, string> = {};
        const wf = clientWorkflow?.statuses ?? [];
        const wfIds = new Set(wf.map((st) => st.id));
        for (const col of POST_KANBAN_COLUMNS) {
            let chosen = '';
            for (const sid of col.statusIds) {
                if (wfIds.has(sid)) {
                    chosen = sid;
                    break;
                }
            }
            if (!chosen) {
                const s = wf.find((st) => col.statusIds.includes(st.id));
                chosen = s?.id || wf[0]?.id || '';
            }
            map[col.id] = chosen;
        }
        return map;
    }, [clientWorkflow]);

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
    }, []);

    const confirmPostStatusChange = useCallback((): Promise<boolean> => {
        return new Promise((resolve) => {
            setConfirmation({
                isOpen: true,
                message: t('confirm_post_status_change'),
                onConfirm: () => {
                    setConfirmation(null);
                    resolve(true);
                },
                onCancel: () => {
                    setConfirmation(null);
                    resolve(false);
                },
            });
        });
    }, [t]);

    const { counts: postsGlobalCounts, refresh: refreshPostsSummary } = usePostsGlobalSummary({
        clientWorkflowId,
        enabled: !!clientWorkflowId,
    });

    const reloadTasks = useCallback(async () => {
        try {
            // Mês civil atual: evita sumir post criado com data fora da "semana atual" e cobre o Kanban com folga
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

            const startDate = formatDateToYYYYMMDD(startOfMonth);
            const endDate = formatDateToYYYYMMDD(endOfMonth);
            
            /** Sempre bypass do cache curto de GET (lib/api): após PATCH/drag um GET imediato pode devolver lista antiga em cache e reverter o card. */
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
                    // Manter apenas tarefas que são posts (não gerais) para esta página
                    if (t.isGeneral) return false;
                    // Posts no range carregado: se não vêm na API, não manter (exceto otimista já tratado pelo POST)
                    const taskDate = t.publishDate || t.dueDate || t.date || '';
                    if (taskDate >= startDate && taskDate <= endDate) return false;
                    return true;
                });
                
                // Combinar: tarefas existentes + todas as tarefas da API
                const combined = [...existingTasks, ...mapped];
                // Remover duplicatas baseado no ID (a ordem garante que mapped tem prioridade)
                const unique = Array.from(new Map(combined.map(t => [t.id, t])).values());
                
                // Verificar se realmente mudou (status, data de publicação/entrega) para evitar re-render desnecessário
                const prevMap = new Map(prev.map(t => [t.id, t]));
                const hasChanged = unique.length !== prev.length ||
                    unique.some(t => {
                        const prevTask = prevMap.get(t.id);
                        if (!prevTask) return true;
                        return prevTask.statusId !== t.statusId ||
                            prevTask.currentActionId !== t.currentActionId ||
                            prevTask.date !== t.date ||
                            prevTask.publishDate !== t.publishDate ||
                            prevTask.dueDate !== t.dueDate ||
                            prevTask.executionOwnerUserId !== t.executionOwnerUserId ||
                            prevTask.createdByUserId !== t.createdByUserId;
                    });

                if (!hasChanged) return prev;
                return unique;
            });
        } catch (error) {
            console.error('Erro ao recarregar tarefas:', error);
        } finally {
            void refreshPostsSummary();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshPostsSummary]);

    const hasLoadedRef = useRef(false);
    useEffect(() => {
        if (hasLoadedRef.current) return;
        hasLoadedRef.current = true;
        reloadTasks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Carregar apenas uma vez ao montar

    const handleSaveTask = (taskToSave: Task) => {
        return (async () => {
            const targetWorkflowId = clientWorkflowId;
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
            
            const statusExists = targetWorkflow.statuses.some(s => s.id === taskToSave.statusId);
            if (!statusExists) {
                setConfirmation({
                    isOpen: true,
                    title: 'Status inválido',
                    message: 'O status selecionado não existe no workflow fixo.',
                    onConfirm: () => setConfirmation(null),
                });
                return;
            }
            
            const isForecast = taskToSave.category === 'forecast';
            const payload: any = {
                title: taskToSave.title,
                date: taskToSave.date,
                publishDate: taskToSave.publishDate ?? taskToSave.date,
                workflowId: targetWorkflowId,
                statusId: taskToSave.statusId,
                clientId: taskToSave.clientId || null,
                postType: isForecast ? null : taskToSave.postType || null,
                description: taskToSave.description || null,
                category: isForecast ? 'forecast' : taskToSave.category || null,
                origin: taskToSave.origin ?? 'posts',
                bornAsForecast: isForecast ? true : (taskToSave.bornAsForecast ?? false),
                currentActionId: taskToSave.currentActionId ?? null,
            };
            
            if (isTeamMode && (taskToSave as any).ownerUserId && !isOperationalProfile) {
                payload.ownerUserId = (taskToSave as any).ownerUserId;
            }
            
            if (!payload.clientId || !backendClientIds.has(payload.clientId)) {
                if (clientsForSelect.length === 0) {
                    setIsQuickClientOpen(true);
                } else {
                    setConfirmation({
                        isOpen: true,
                        title: 'Cliente inválido',
                        message: 'Selecione um cliente existente.',
                        onConfirm: () => setConfirmation(null),
                    });
                }
                return;
            }
            
            const isNewTask = !taskToSave.id?.trim() || taskToSave.id.startsWith('task-');
            try {
                if (isNewTask) {
                    const created = await apiPost<any>('/tasks', payload);
                    logActivity(
                        buildTaskFlowHistoryLine('created', {
                            name: taskToSave.title,
                            page: 'editorial',
                            isPost: true,
                        }),
                    );
                    const todayStr = formatDateToYYYYMMDD(new Date());
                    if (created?.id) {
                        const newTask = mapApiTaskToTask(created, todayStr);
                        setTasks((prev) => {
                            const list = prev ?? [];
                            if (list.some((t) => t.id === newTask.id)) {
                                return list.map((t) => (t.id === newTask.id ? newTask : t));
                            }
                            return [...list, newTask];
                        });
                    }
                } else {
                    /** Salvar pelo modal já confirma a ação; não pedir segundo diálogo de status. */
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
                            page: 'editorial',
                            isPost: true,
                        }),
                    );
                    setTasks(prev => (prev ?? []).map(t => t.id === taskToSave.id ? {
                        ...t,
                        ...taskToSave,
                        date: taskToSave.publishDate ?? taskToSave.date ?? t.date,
                        publishDate: taskToSave.publishDate ?? t.publishDate,
                        dueDate: taskToSave.dueDate ?? t.dueDate,
                    } : t));
                }
                closeModal();
            } finally {
                await reloadTasks();
            }
        })().catch((e: any) => {
            /** Rejeita para o PostOrForecastModal não chamar onClose; o modal exibe o erro em `setErrorMessage`. */
            throw e instanceof Error ? e : new Error(String(e?.message ?? e ?? t('error_value_required')));
        });
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
                                    page: 'editorial',
                                    isPost: true,
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
            message: 'Confirmar mudança de status do post?',
            onConfirm: () => {
                setConfirmation(null);
                void (async () => {
                    try {
                        const linearFlow = getPostLinearFlow(clientWorkflow?.statuses);
                        const defaultSub = linearFlow ? defaultActionIdForStatus(linearFlow, statusId) : undefined;
                        setTasks((prev) =>
                            (prev ?? []).map((t) =>
                                t.id === taskId
                                    ? {
                                          ...t,
                                          statusId,
                                          ...(linearFlow ? { currentActionId: defaultSub ?? undefined } : {}),
                                      }
                                    : t,
                            ),
                        );
                        const patchRes = await apiPatch<Record<string, unknown>>(`/tasks/${taskId}/status`, {
                            statusId,
                            changeSource: CHANGE_SOURCE.kanban_drag,
                            ...(linearFlow ? { currentActionId: defaultSub ?? null } : {}),
                        });
                        const todayStr = formatDateToYYYYMMDD(new Date());
                        const fromApi = mapApiTaskToTask(patchRes, todayStr);
                        setTasks((prev) =>
                            (prev ?? []).map((t) => (t.id === taskId ? { ...t, ...fromApi } : t)),
                        );
                        if (task)
                            logActivity(
                                buildTaskFlowHistoryLine('updated', {
                                    name: task.title,
                                    page: 'editorial',
                                    isPost: true,
                                }),
                            );
                    } finally {
                        await reloadTasks();
                    }
                })();
            },
        });
    };

    const openModal = (task: Task | null) => {
        setSelectedTask(task ? { ...task } : { isGeneral: false });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedTask(null);
    };

    useEffect(() => {
        let targetId = '';
        try {
            targetId = localStorage.getItem(POSTS_MODAL_TARGET_KEY) || '';
        } catch {
            return;
        }
        if (!targetId) return;
        const targetTask = tasks.find((task) => task.id === targetId && !task.isGeneral);
        if (!targetTask) return;
        setSelectedTask({ ...targetTask });
        setIsModalOpen(true);
        try {
            localStorage.removeItem(POSTS_MODAL_TARGET_KEY);
        } catch {}
    }, [tasks]);

    const openModalWithStatus = (statusId: string) => {
        setSelectedTask({ 
            isGeneral: false,
            statusId,
            date: formatDateToYYYYMMDD(new Date()),
        });
        setIsModalOpen(true);
    };

    const columnIds = POST_KANBAN_COLUMNS.map((c) => c.id);

    const statusOptions = useMemo(() => [
        { value: 'all', label: t('all') },
        ...(clientWorkflow?.statuses || []).map((s) => ({ value: s.id, label: t(s.nameKey) })),
    ], [clientWorkflow, t]);

    const clientsMap = useMemo(() => {
        const m = new Map<string, string>();
        for (const c of clientsForSelect) m.set(c.id, c.name);
        for (const c of (context?.clients || [])) if (!m.has(c.id)) m.set(c.id, c.name);
        return m;
    }, [clientsForSelect, context?.clients]);

    const postsIntelligenceItems = useMemo(
        () =>
            buildPostsIntelligenceItems({
                tasks,
                clients: context?.clients ?? [],
                clientNamesById: clientsMap,
                workflows,
                clientWorkflowId,
                generalWorkflowId: context?.generalWorkflowId ?? '',
                isTeamMode,
                globalCounts: postsGlobalCounts,
            }),
        [
            tasks,
            context?.clients,
            clientsMap,
            workflows,
            clientWorkflowId,
            context?.generalWorkflowId,
            isTeamMode,
            postsGlobalCounts,
        ],
    );

    const handlePostsIntelAction = useCallback(
        (item: IntelligenceItem) => {
            if (item.actionLabelKey === 'intel_action_schedule_posts') {
                setFilters((prev) => ({ ...prev, status: 'aprovado' }));
            } else if (item.id === 'posts-overdue') {
                setFilters((prev) => ({ ...prev, status: 'all' }));
            } else if (item.id === 'posts-stale-production') {
                setFilters((prev) => ({ ...prev, status: 'em_producao' }));
            }
            // demais ações ('intel_action_review_posts', etc.) só destacam o card; sem mudança de filtro
        },
        [setFilters],
    );

    return (
        <div className="flex min-h-full min-w-0 w-full flex-1 flex-col">
            <ContentPageHeader
                heading={t('posts')}
                subtitle={t('posts_page_subtitle')}
                actions={(
                    <>
                        <input
                            type="text"
                            placeholder={t('posts_search_placeholder')}
                            value={filters.searchTitle || ''}
                            onChange={(e) => setFilters((prev) => ({ ...prev, searchTitle: e.target.value }))}
                            className={HEADER_GRADIENT_SEARCH_CLASS}
                        />
                        <FilterDropdown
                            label="Cliente"
                            name="client"
                            options={[{ value: 'all', label: t('planning_all_clients') }, ...clientsForSelect.map(c => ({ value: c.id, label: c.name }))]}
                            value={filters.client || 'all'}
                            onChange={(name, value) => setFilters(prev => ({ ...prev, [name]: value }))}
                            labelClassName={HEADER_FILTER_LABEL_SR_ONLY}
                            selectClassName={HEADER_GRADIENT_SELECT_CLASS}
                        />
                        <FilterDropdown
                            label={t('status')}
                            name="status"
                            options={statusOptions}
                            value={filters.status || 'all'}
                            onChange={(name, value) => setFilters(prev => ({ ...prev, [name]: value }))}
                            labelClassName={HEADER_FILTER_LABEL_SR_ONLY}
                            selectClassName={HEADER_GRADIENT_SELECT_CLASS}
                        />
                        <FilterDropdown
                            label="Tipo"
                            name="postType"
                            options={[{ value: 'all', label: 'Todos os tipos' }, ...Object.values(PostTypeEnum).map(p => ({ value: p, label: t(p) }))]}
                            value={filters.postType || 'all'}
                            onChange={(name, value) => setFilters(prev => ({ ...prev, [name]: value }))}
                            labelClassName={HEADER_FILTER_LABEL_SR_ONLY}
                            selectClassName={HEADER_GRADIENT_SELECT_CLASS}
                        />
                        {canEditPosts && (
                            <TooltipHint label={t('new_post')}>
                                <button
                                    type="button"
                                    onClick={() => openModal(null)}
                                    aria-label={t('new_post')}
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
                            <span className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">{postsSummary.total}</span>
                        </div>
                        <div className="text-xs text-indigo-700 dark:text-indigo-300 text-center">{t('posts')}</div>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-900/20 px-4 py-3 shadow-sm h-[124px] min-w-[132px] flex-1 sm:flex-initial">
                        <div className="flex items-center gap-2">
                            <ClockIcon className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0" />
                            <span className="text-2xl font-bold text-violet-900 dark:text-violet-100">{postsSummary.producao}</span>
                        </div>
                        <div className="text-xs text-violet-700 dark:text-violet-300 text-center">{t('posts_column_producao')}</div>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20 px-4 py-3 shadow-sm h-[124px] min-w-[132px] flex-1 sm:flex-initial">
                        <div className="flex items-center gap-2">
                            <AlertTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span className="text-2xl font-bold text-amber-900 dark:text-amber-100">{postsSummary.aprovacao}</span>
                        </div>
                        <div className="text-xs text-amber-700 dark:text-amber-300 text-center">{t('posts_column_aprovacao')}</div>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/20 px-4 py-3 shadow-sm h-[124px] min-w-[132px] flex-1 sm:flex-initial">
                        <div className="flex items-center gap-2">
                            <CheckCircleIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <span className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">{postsSummary.agendamento}</span>
                        </div>
                        <div className="text-xs text-indigo-700 dark:text-indigo-300 text-center">{t('posts_column_agendamento')}</div>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/20 px-4 py-3 shadow-sm h-[124px] min-w-[132px] flex-1 sm:flex-initial">
                        <div className="flex items-center gap-2">
                            <SparklesIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{postsSummary.publicacao}</span>
                        </div>
                        <div className="text-xs text-emerald-700 dark:text-emerald-300 text-center">{t('posts_column_publicacao')}</div>
                    </div>
                </div>
                <IntelligentCentral
                    className="w-full sm:max-w-[320px]"
                    items={postsIntelligenceItems}
                    t={t}
                    onAction={handlePostsIntelAction}
                />
            </div>

            {posts.length === 0 && (
                <p className="mb-4 rounded-lg border border-dashed border-indigo-200 bg-indigo-50/50 px-4 py-3 text-center text-sm text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-200">
                    {t('empty_state_no_posts')}
                </p>
            )}

            {/* Board Kanban — sempre visível, mesmo sem dados */}
            {isMobile ? (
                <div className="flex min-h-0 w-full flex-1 flex-col">
                <div className="mb-6 min-h-0 flex-1 space-y-2 overflow-auto">
                    {columnIds.map((colId, idx) => {
                        const col = POST_KANBAN_COLUMNS[idx];
                        const colTasks = postsByColumnSorted[colId] || [];
                        const isExpanded = accordionExpanded === colId;
                        return (
                            <div key={colId} className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                                <button
                                    type="button"
                                    onClick={() => setAccordionExpanded(isExpanded ? null : colId)}
                                    className="w-full p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-lg flex items-center justify-between text-left"
                                >
                                    <span className="font-bold text-sm text-white">{t(col.labelKey)} ({colTasks.length})</span>
                                    {isExpanded ? <ChevronDownIcon className="w-5 h-5 text-white" /> : <ChevronRightIcon className="w-5 h-5 text-white" />}
                                </button>
                                {isExpanded && (
                                    <div
                                        className="p-2 min-h-[200px] max-h-[70vh] overflow-y-auto space-y-2"
                                        {...(canEditPosts
                                            ? {
                                                  onDragOver: (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.currentTarget.classList.add('bg-indigo-100', 'dark:bg-indigo-900/50'); },
                                                  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => e.currentTarget.classList.remove('bg-indigo-100', 'dark:bg-indigo-900/50'),
                                                  onDrop: (e: React.DragEvent<HTMLDivElement>) => handleDropOnStatus(e, firstStatusIdByColumn[colId] || clientWorkflow?.statuses?.[0]?.id || ''),
                                              }
                                            : {})}
                                    >
                                        {colTasks.map((task) => (
                                            <PostCard
                                                key={task.id}
                                                task={task}
                                                onClick={() => openModal(task)}
                                                context={context}
                                                clientName={clientsMap.get(task.clientId || '')}
                                                onActionComplete={reloadTasks}
                                                onStatusChange={updateTaskStatusInList}
                                                sourcePage="posts"
                                                onNavigateToPage={(page) => setPage(page)}
                                                confirmStatusChange={confirmPostStatusChange}
                                                onOpenStatusHistory={() => setStatusHistoryTaskId(task.id)}
                                                onDelete={canEditPosts ? handleDeleteTask : undefined}
                                                draggable={canEditPosts}
                                                onDragStart={canEditPosts ? (e) => {
                                                    e.dataTransfer.setData('taskId', task.id);
                                                    e.dataTransfer.effectAllowed = 'move';
                                                } : undefined}
                                            />
                                        ))}
                                        {canEditPosts && (
                                        <button
                                            onClick={() => openModalWithStatus(firstStatusIdByColumn[colId] || clientWorkflow?.statuses?.[0]?.id || '')}
                                            className="w-full h-12 mt-2 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-400 transition-all"
                                        >
                                            <PlusIcon className="w-5 h-5 mr-1" />
                                            <span className="text-sm">{t('kanban_add_post')}</span>
                                        </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                </div>
            ) : (
                /* Kanban Posts: 5 colunas sempre na mesma linha, largura proporcional (sem wrap) */
                <div className="flex min-h-0 w-full flex-1 flex-col">
                    <div className="grid min-h-0 min-w-0 flex-1 grid-cols-5 gap-2">
                        {columnIds.map((colId, idx) => {
                            const col = POST_KANBAN_COLUMNS[idx];
                            const colTasks = postsByColumnSorted[colId] || [];
                            return (
                                <div
                                    key={colId}
                                    className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-sm dark:border-gray-700 dark:bg-gray-800/50"
                                >
                                    <div className="flex min-w-0 flex-shrink-0 items-center justify-between gap-2 rounded-t-xl bg-gradient-to-r from-indigo-500 to-purple-600 p-3">
                                        <span className="truncate text-sm font-bold text-white">{t(col.labelKey)}</span>
                                        <span className="rounded-lg bg-white/25 px-2 py-0.5 text-xs font-medium text-white">{colTasks.length}</span>
                                    </div>
                                    <div
                                        className="min-h-[300px] flex-1 space-y-2 overflow-y-auto p-2"
                                        {...(canEditPosts
                                            ? {
                                                  onDragOver: (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.currentTarget.classList.add('bg-indigo-100', 'dark:bg-indigo-900/50'); },
                                                  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => e.currentTarget.classList.remove('bg-indigo-100', 'dark:bg-indigo-900/50'),
                                                  onDrop: (e: React.DragEvent<HTMLDivElement>) => handleDropOnStatus(e, firstStatusIdByColumn[colId] || clientWorkflow?.statuses?.[0]?.id || ''),
                                              }
                                            : {})}
                                    >
                                        {colTasks.map((task) => (
                                            <PostCard
                                                key={task.id}
                                                task={task}
                                                onClick={() => openModal(task)}
                                                context={context}
                                                clientName={clientsMap.get(task.clientId || '')}
                                                onActionComplete={reloadTasks}
                                                onStatusChange={updateTaskStatusInList}
                                                sourcePage="posts"
                                                onNavigateToPage={(page) => setPage(page)}
                                                confirmStatusChange={confirmPostStatusChange}
                                                onOpenStatusHistory={() => setStatusHistoryTaskId(task.id)}
                                                onDelete={canEditPosts ? handleDeleteTask : undefined}
                                                draggable={canEditPosts}
                                                onDragStart={canEditPosts ? (e) => {
                                                    e.dataTransfer.setData('taskId', task.id);
                                                    e.dataTransfer.effectAllowed = 'move';
                                                } : undefined}
                                            />
                                        ))}
                                        {canEditPosts && (
                                        <button
                                            onClick={() => openModalWithStatus(firstStatusIdByColumn[colId] || clientWorkflow?.statuses?.[0]?.id || '')}
                                            className="flex h-12 w-full items-center justify-center rounded-xl border-2 border-dashed border-gray-300 text-gray-400 transition-all hover:border-indigo-400 hover:text-indigo-500 dark:border-gray-600 dark:text-gray-500 dark:hover:text-indigo-400"
                                        >
                                            <PlusIcon className="mr-1 h-5 w-5" />
                                            <span className="text-sm">{t('kanban_add_post')}</span>
                                        </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            </div>
            </div>

            {/* Modal unificada Post/Previsão */}
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
                onActionComplete={reloadTasks}
                onStatusChange={updateTaskStatusInList}
                persistenceOrigin="posts"
                readOnly={!canEditPosts}
                onValidateForecast={onValidatePlanningQuota}
            />

            <TaskStatusHistoryModal
                isOpen={!!statusHistoryTaskId}
                taskId={statusHistoryTaskId}
                variant="post"
                onClose={() => setStatusHistoryTaskId(null)}
                t={t}
            />

            <QuickClientModal
                isOpen={isQuickClientOpen}
                onClose={() => setIsQuickClientOpen(false)}
                onCreated={(created) => {
                    if (created?.id) {
                        rosterAddClient({ id: created.id, name: created.name });
                    }
                    setIsQuickClientOpen(false);
                }}
                t={t}
                defaultCurrency={agencyProfile.baseCurrency || 'BRL'}
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
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{confirmation.title || t('confirm')}</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{confirmation.message}</p>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => { confirmation.onCancel?.(); setConfirmation(null); }} className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600">{t('cancel')}</button>
                            <button onClick={() => { confirmation.onConfirm(); setConfirmation(null); }} className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700">{t('confirm')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProducaoPage;
