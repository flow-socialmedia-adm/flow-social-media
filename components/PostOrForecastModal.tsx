import React, { useState, useEffect, useMemo, useRef, useId, useCallback } from 'react';
import type { Task, PostType, AppContextType } from '../types';
import { PostType as PostTypeEnum } from '../types';
import { XIcon, AlertTriangleIcon, TrashIcon } from './icons';
import {
    decodeStepValue,
    encodeStepValue,
    firstStepForStatus,
    getGeneralLinearFlow,
    getPostLinearFlow,
    groupFlowByStatus,
    stepValueForTask,
} from '../lib/taskActionFlow';
import { CLIENT_INITIAL_OWNER_STAGE_KEY } from '../lib/client-stage-keys';
import {
    defaultClientOwnerPreferences,
    resolveClientStageOwnerUserId,
} from '../lib/client-owner-preferences';
import { getEligibleAgencyOwners } from '../lib/agencyOperational';
import { agencyShowsExecutionOwner } from '../lib/taskExecutionOwnerUi';
import { parseApiErrorMessage } from '../lib/api';
import TooltipHint from './TooltipHint';
import { getPostCreationHints } from '../lib/clientContext';
import { getTaskOperationalMilestones } from '../lib/operationalMilestones';
import { OperationalMilestonesInfoBlock } from './OperationalMilestonesPanel';

/** Opções do select de categoria (tarefa geral); evita `<input list>` que falha ao reabrir em alguns browsers. */
const GENERAL_TASK_CATEGORY_SELECT_OPTIONS = [
    'Reunião',
    'Planejamento',
    'Criação (Copy/Design)',
    'Aprovação',
    'Publicação',
    'Tráfego/Paid',
    'Relatório',
    'Financeiro',
    'Operacional',
    'Suporte/Cliente',
    'Follow-up',
    'Outros',
] as const;

/** Natureza do item: Previsão (reserva/planejamento) ou Post (em produção). */
export type ItemNature = 'forecast' | 'post';

/** Identifica se uma task é previsão (não post real). */
export function isForecastTask(task: Task | null | undefined): boolean {
    if (!task) return false;
    return task.category === 'forecast';
}

/** Identifica se uma task é post real (em fluxo de produção). */
export function isRealPostTask(task: Task | null | undefined): boolean {
    if (!task) return false;
    return !!task.clientId && !!task.postType && !isForecastTask(task);
}

export interface PostOrForecastModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: Task) => void | Promise<void>;
    onDelete?: (taskId: string) => void;
    task: Partial<Task> | null;
    context: AppContextType;
    clientsForSelect: { id: string; name: string }[];
    onQuickCreateClient: () => void;
    /** Natureza inicial ao abrir (Planejamento=forecast, Posts/Agenda=post) */
    initialNature?: ItemNature;
    initialDate?: string;
    initialClientId?: string;
    initialClientName?: string;
    onValidateForecast?: (clientId: string, date: string) => Promise<{ canCreate: boolean; message?: string }>;
    /** Exibir PostActions na edição (ProducaoPage) */
    onActionComplete?: () => void;
    onStatusChange?: (taskId: string, statusId: string) => void;
    /** Workflow para tarefas gerais (abrir com task.isGeneral na Agenda) */
    generalWorkflowId?: string;
    /** Persistido em `Task.origin` (ex.: tarefas, posts, agenda, planejamento) */
    persistenceOrigin?: string;
    /** Quando true, campos e ações de escrita ficam desativados (propagar conforme canEditModule no pai). */
    readOnly?: boolean;
}

const PostOrForecastModal: React.FC<PostOrForecastModalProps> = ({
    isOpen,
    onClose,
    onSave,
    onDelete,
    task,
    context,
    clientsForSelect,
    onQuickCreateClient,
    initialNature = 'forecast',
    initialDate,
    initialClientId,
    initialClientName,
    onValidateForecast,
    onActionComplete,
    onStatusChange,
    generalWorkflowId,
    persistenceOrigin,
    readOnly = false,
}) => {
    const [itemNature, setItemNature] = useState<ItemNature>(initialNature);
    const [isGeneralTask, setIsGeneralTask] = useState(false);
    const [clientId, setClientId] = useState(initialClientId || '');
    const [date, setDate] = useState(initialDate || '');
    const [title, setTitle] = useState('');
    const [postType, setPostType] = useState<PostType>('static');
    const [statusId, setStatusId] = useState('');
    const [description, setDescription] = useState('');
    const [generalCategory, setGeneralCategory] = useState('');
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [forecastWarning, setForecastWarning] = useState<string | null>(null);
    const [statusStepKey, setStatusStepKey] = useState('');
    const [ownerUserId, setOwnerUserId] = useState('');
    const [ownerPickerTouched, setOwnerPickerTouched] = useState(false);
    /** Espelha o select "cliente opcional" em tarefa geral — valor usado no save (evita estado atrasado no clique). */
    const generalOptionalClientIdRef = useRef('');
    const dateInputRef = useRef<HTMLInputElement>(null);

    const { t, workflows, clientWorkflowId, agencyMode, agencyProfile, clients, isOperationalProfile, currentUser } = context;
    const isTeamMode = agencyMode === 'TEAM';
    const isOperationSolo = (agencyProfile?.operationMode ?? 'solo') === 'solo';
    const canChangeTaskOwner = isTeamMode && !isOperationalProfile;
    const dateFieldId = useId();
    const isCreateMode = !task?.id;

    const openDatePicker = useCallback(() => {
        if (readOnly) return;
        const el = dateInputRef.current;
        if (!el) return;
        try {
            el.showPicker?.();
        } catch {
            el.focus();
            el.click();
        }
    }, [readOnly]);

    const postCreationHints = useMemo(
        () => getPostCreationHints(clients.find((c) => c.id === clientId)),
        [clients, clientId],
    );

    const selectedClient = useMemo(() => clients.find((c) => c.id === clientId), [clients, clientId]);

    const operationalMilestones = useMemo(() => {
        if (isGeneralTask || !date || !clientId) return [];
        return getTaskOperationalMilestones({ publishDate: date, date, clientId }, selectedClient);
    }, [isGeneralTask, date, clientId, selectedClient]);

    const suggestedOwnerUserId = useMemo(() => {
        if (!isTeamMode) return '';
        const members = agencyProfile?.teamMembers ?? [];
        const strategy = agencyProfile?.defaultOwnerStrategy ?? 'AGENCY_OWNER';
        const allow = agencyProfile?.allowStageOwners ?? false;
        const mode = agencyMode ?? 'SOLO';
        const prefs = clientId.trim()
            ? clients.find((c) => c.id === clientId)?.ownerPreferences ?? defaultClientOwnerPreferences()
            : defaultClientOwnerPreferences();
        return (
            resolveClientStageOwnerUserId(
                CLIENT_INITIAL_OWNER_STAGE_KEY,
                prefs,
                members,
                mode,
                allow,
                strategy,
            ) ?? ''
        );
    }, [
        isTeamMode,
        agencyProfile?.teamMembers,
        agencyProfile?.defaultOwnerStrategy,
        agencyProfile?.allowStageOwners,
        agencyMode,
        clients,
        clientId,
    ]);

    const postEligibleMembers = useMemo(
        () => getEligibleAgencyOwners(agencyProfile?.teamMembers ?? [], 'post'),
        [agencyProfile?.teamMembers],
    );
    const clientWorkflow = workflows[clientWorkflowId];
    const generalWorkflow = generalWorkflowId ? workflows[generalWorkflowId] : null;
    const firstStatusId = clientWorkflow?.statuses?.[0]?.id || '';
    const pautaStatusId = clientWorkflow?.statuses?.find((s) => s.id === 'pauta_criada')?.id || firstStatusId;

    const postLinearFlow = useMemo(() => getPostLinearFlow(clientWorkflow?.statuses), [clientWorkflow?.statuses]);
    const generalLinearFlow = useMemo(() => getGeneralLinearFlow(generalWorkflow?.statuses), [generalWorkflow?.statuses]);

    /**
     * Dependências estreitas: incluir workflows/linearFlow aqui fazia o efeito rodar a cada re-render do
     * contexto (nova referência) e resetava clientId e demais campos no meio da edição antes de salvar.
     */
    useEffect(() => {
        if (!isOpen) return;

        setErrorMessage(null);
        setForecastWarning(null);
        if (task?.id) {
            const isGeneral = !!task.isGeneral;
            setIsGeneralTask(isGeneral);
            if (isGeneral) {
                setItemNature('post');
                const gc = task.clientId || '';
                setClientId(gc);
                generalOptionalClientIdRef.current = gc;
                setGeneralCategory((task.category as string) || '');
                const gw = generalWorkflowId ? workflows[generalWorkflowId] : null;
                const sid = task.statusId || gw?.statuses?.[0]?.id || '';
                setStatusId(sid);
                const gf = getGeneralLinearFlow(gw?.statuses);
                if (gf) {
                    const v = stepValueForTask(task as Task, gw?.statuses);
                    setStatusStepKey(
                        v ||
                            encodeStepValue(sid, firstStepForStatus(gf, sid)?.actionId ?? null),
                    );
                } else setStatusStepKey('');
            } else {
                const isF = isForecastTask(task as Task);
                setItemNature(isF ? 'forecast' : 'post');
                setClientId(task.clientId || '');
                setPostType((task.postType as PostType) || 'static');
                const sid = task.statusId || firstStatusId;
                setStatusId(sid);
                if (!isF && postLinearFlow) {
                    const v = stepValueForTask(task as Task, clientWorkflow?.statuses);
                    setStatusStepKey(
                        v ||
                            encodeStepValue(
                                sid,
                                firstStepForStatus(postLinearFlow, sid)?.actionId ?? null,
                            ),
                    );
                } else setStatusStepKey('');
            }
            setDate((task.publishDate ?? task.dueDate ?? task.date) || '');
            setTitle(task.title || '');
            setDescription(task.description || '');
            if (isGeneral) {
                setOwnerUserId(((task as Task).ownerUserId as string | undefined) || '');
                setOwnerPickerTouched(true);
            } else {
                setOwnerUserId('');
                setOwnerPickerTouched(false);
            }
        } else {
            const startingGeneral = !!task?.isGeneral;
            setIsGeneralTask(startingGeneral);
            setItemNature(startingGeneral ? 'post' : initialNature);
            const newGc = initialClientId || task?.clientId || '';
            setClientId(newGc);
            generalOptionalClientIdRef.current = newGc;
            setDate(
                initialDate ||
                    (task?.publishDate ?? task?.dueDate ?? task?.date) ||
                    new Date().toISOString().slice(0, 10),
            );
            setTitle('');
            setPostType('static');
            const newSid = startingGeneral
                ? generalWorkflow?.statuses?.[0]?.id || ''
                : task?.statusId || pautaStatusId;
            setStatusId(newSid);
            setDescription('');
            setGeneralCategory((task?.category as string) || '');
            if (startingGeneral && generalLinearFlow?.length) {
                const fs = generalLinearFlow[0];
                setStatusStepKey(encodeStepValue(fs.statusId, fs.actionId));
                setStatusId(fs.statusId);
            } else if (!startingGeneral && postLinearFlow?.length) {
                setStatusStepKey(encodeStepValue(pautaStatusId, 'criando_pauta'));
            } else setStatusStepKey('');
            setOwnerUserId('');
            setOwnerPickerTouched(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- intencional: ver comentário acima do useEffect
    }, [isOpen, task, initialNature, initialClientId, initialDate]);

    useEffect(() => {
        if (!isOpen || !isCreateMode || !isTeamMode || !isGeneralTask || isOperationSolo) return;
        if (ownerPickerTouched) return;
        setOwnerUserId(suggestedOwnerUserId);
    }, [isOpen, isCreateMode, isTeamMode, isGeneralTask, isOperationSolo, ownerPickerTouched, suggestedOwnerUserId]);

    useEffect(() => {
        if (!isOpen || task?.id || isGeneralTask || itemNature === 'forecast') return;
        if (postCreationHints.suggestedPostType) {
            setPostType(postCreationHints.suggestedPostType);
        }
    }, [isOpen, task?.id, isGeneralTask, itemNature, postCreationHints.suggestedPostType]);

    const isForecast = itemNature === 'forecast';
    const isPost = itemNature === 'post' && !isGeneralTask;

    const generalCategorySelectOptions = useMemo(() => {
        const gc = generalCategory.trim();
        const known = new Set<string>([...GENERAL_TASK_CATEGORY_SELECT_OPTIONS]);
        const extra = gc && !known.has(gc) ? [gc] : [];
        return [...GENERAL_TASK_CATEGORY_SELECT_OPTIONS, ...extra];
    }, [generalCategory]);

    const canSave = isGeneralTask
        ? !!title?.trim() && !!date && !!generalCategory && !!statusId
        : isForecast
        ? !!clientId && !!date
        : !!clientId && !!date && !!postType && !!statusId;

    const handleSave = async () => {
        if (readOnly || !canSave) return;
        setSaving(true);
        setErrorMessage(null);
        setForecastWarning(null);

        try {
            if (isGeneralTask) {
                if (!generalWorkflowId || !generalWorkflow) {
                    setErrorMessage('Workflow de tarefa geral não configurado.');
                    setSaving(false);
                    return;
                }
                const dec =
                    generalLinearFlow && statusStepKey
                        ? decodeStepValue(statusStepKey)
                        : generalLinearFlow && statusId
                            ? firstStepForStatus(generalLinearFlow, statusId)
                            : null;
                const resolvedGeneralClient =
                    (generalOptionalClientIdRef.current || clientId).trim() || undefined;
                const taskToSave: Task = {
                    id: task?.id || '',
                    title: title.trim(),
                    date,
                    dueDate: date,
                    statusId: dec?.statusId || statusId || generalWorkflow.statuses?.[0]?.id || '',
                    workflowId: generalWorkflowId,
                    isGeneral: true,
                    category: generalCategory,
                    description: description.trim() || undefined,
                    origin: persistenceOrigin ?? 'tarefas',
                    bornAsForecast: false,
                    currentActionId:
                        generalLinearFlow && dec
                            ? dec.actionId
                            : (task as Task)?.currentActionId ?? null,
                    ...(canChangeTaskOwner && !isOperationSolo && ownerUserId ? { ownerUserId } : {}),
                    clientId: resolvedGeneralClient,
                };
                await onSave(taskToSave);
            } else if (isForecast) {
                if (onValidateForecast && clientId && date) {
                    const { canCreate, message } = await onValidateForecast(clientId, date);
                    if (!canCreate && message) {
                        setForecastWarning(message);
                        setSaving(false);
                        return;
                    }
                    if (message) setForecastWarning(message);
                }
                const taskToSave: Task = {
                    id: task?.id || '',
                    title: t('planning_forecast_type'),
                    date,
                    publishDate: date,
                    clientId,
                    postType: undefined,
                    statusId: firstStatusId,
                    workflowId: clientWorkflowId,
                    isGeneral: false,
                    category: 'forecast',
                    origin: persistenceOrigin ?? 'planejamento',
                    bornAsForecast: true,
                };
                await onSave(taskToSave);
            } else {
                if (onValidateForecast && clientId && date && isCreate) {
                    const { canCreate, message } = await onValidateForecast(clientId, date);
                    if (!canCreate && message) {
                        setForecastWarning(message);
                        setSaving(false);
                        return;
                    }
                    if (message) setForecastWarning(message);
                }
                const dec =
                    postLinearFlow && statusStepKey
                        ? decodeStepValue(statusStepKey)
                        : postLinearFlow && statusId
                            ? firstStepForStatus(postLinearFlow, statusId)
                            : null;
                const taskToSave: Task = {
                    id: task?.id || '',
                    title: title.trim() || t('planning_draft_default_title'),
                    date,
                    publishDate: date,
                    clientId,
                    postType,
                    statusId: dec?.statusId || statusId || pautaStatusId,
                    workflowId: clientWorkflowId,
                    isGeneral: false,
                    description: description.trim() || undefined,
                    origin: persistenceOrigin ?? 'posts',
                    bornAsForecast: false,
                    currentActionId:
                        postLinearFlow && dec
                            ? dec.actionId
                            : (task as Task)?.currentActionId ?? null,
                };
                await onSave(taskToSave);
            }
            onClose();
        } catch (e) {
            const fallback =
                isGeneralTask && persistenceOrigin === 'tarefas'
                    ? 'Não foi possível salvar a tarefa. Revise os campos obrigatórios.'
                    : t('planning_forecast_result_error');
            setErrorMessage(parseApiErrorMessage(e, fallback));
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const isCreate = !task?.id;

    /** Segmento Previsão/Post: compacto, sem container externo */
    const segActive =
        'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 bg-indigo-600 text-white shadow-sm';
    const segInactive =
        'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700/80 dark:text-gray-200 dark:hover:bg-gray-600';

    const setNatureForecast = () => {
        setItemNature('forecast');
    };
    const setNaturePost = () => {
        setItemNature('post');
        setStatusId(pautaStatusId);
        if (postLinearFlow?.length) {
            setStatusStepKey(encodeStepValue(pautaStatusId, 'criando_pauta'));
        }
    };

    const isPostsPageMode = persistenceOrigin === 'posts';
    const isTarefasPageMode = persistenceOrigin === 'tarefas';
    const createTitle = isPostsPageMode
        ? (isCreate ? 'Esse post é só uma ideia ou já vamos criar o post?' : 'O que vamos editar neste post?')
        : isTarefasPageMode
            ? (isCreate ? t('modal_general_task_create_title') : 'O que vamos editar nesta tarefa?')
        : isCreate
            ? isGeneralTask
                ? t('modal_general_task_create_title')
                : t('modal_idea_or_create')
            : t('edit_task');

    const showCreateHeadlineRule = isCreate;
    /** Divisória leve: tom suave, não compete com o conteúdo */
    const headlineRuleBorder = 'border-slate-200/50 dark:border-slate-500/35';

    const postCreateHeadline = showCreateHeadlineRule && !isGeneralTask;
    const generalTaskCreateHeadline = showCreateHeadlineRule && isGeneralTask;
    const fieldDisabled = readOnly;

    const memberName = (uid: string | undefined | null) => {
        if (!uid?.trim()) return '';
        return agencyProfile?.teamMembers?.find((m) => m.id === uid)?.name ?? uid;
    };
    /** Metadados somente leitura: equipe com operação não-solo (lean/estruturada). */
    const readOnlyMetaTeam = isTeamMode && !isOperationSolo;
    const metaCreatedByDisplay = readOnlyMetaTeam
        ? task?.id
            ? (task as Task).createdByUserId
                ? memberName((task as Task).createdByUserId)
                : t('history_user_unknown')
            : currentUser?.name?.trim() || t('history_user_unknown')
        : '';
    const metaClientOwnerId = readOnlyMetaTeam
        ? task?.id
            ? (task as Task).ownerUserId
            : suggestedOwnerUserId || undefined
        : undefined;
    const metaExecutionOwnerId =
        readOnlyMetaTeam &&
        task?.id &&
        !isForecast &&
        agencyShowsExecutionOwner(agencyProfile?.operationMode) &&
        (isPost || isGeneralTask)
            ? (task as Task).executionOwnerUserId
            : undefined;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-start pt-14 sm:pt-20 md:pt-24 px-4 pb-10 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 my-0">
                <div className="flex justify-between items-start gap-3 mb-5">
                    <div className={`min-w-0 pr-2 ${generalTaskCreateHeadline ? '' : 'flex-1'}`}>
                        {postCreateHeadline ? (
                            <>
                                <h2 className="text-gray-900 dark:text-white leading-snug text-lg sm:text-xl font-semibold">
                                    {createTitle}
                                </h2>
                                <div className={`mt-1 w-full border-b ${headlineRuleBorder}`} aria-hidden />
                            </>
                        ) : generalTaskCreateHeadline ? (
                            <div className="w-fit max-w-full">
                                <h2 className="text-gray-900 dark:text-white leading-snug text-lg font-bold">{createTitle}</h2>
                                <div className={`mt-1 w-full border-b ${headlineRuleBorder}`} aria-hidden />
                            </div>
                        ) : (
                            <h2 className={`text-gray-900 dark:text-white leading-snug ${isCreate && !isGeneralTask ? 'text-lg sm:text-xl font-semibold' : 'text-lg font-bold'}`}>
                                {createTitle}
                            </h2>
                        )}
                    </div>
                    <button type="button" onClick={onClose} className="p-2 rounded-lg shrink-0 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label={t('cancel')}>
                        <XIcon className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {readOnly && (
                    <div className="mb-4 rounded-lg border border-slate-200/90 dark:border-slate-600/50 bg-slate-50/90 dark:bg-slate-800/40 px-3 py-2.5 text-xs text-slate-600 dark:text-slate-300">
                        <p className="font-medium text-slate-800 dark:text-slate-100">{t('read_only_badge')}</p>
                        <p className="mt-1 text-slate-500 dark:text-slate-400 leading-snug">{t('read_only_hint')}</p>
                    </div>
                )}

                {/* Previsão / Post — sempre [Previsão] [Post]; oculto em Tarefa Geral */}
                {!isGeneralTask && (
                    <div className="mb-5">
                        {isCreate ? (
                            <>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <button type="button" onClick={setNatureForecast} disabled={fieldDisabled} className={`${isForecast ? segActive : segInactive} disabled:opacity-80 disabled:cursor-not-allowed`}>
                                        {t('planning_forecast')}
                                    </button>
                                    <button type="button" onClick={setNaturePost} disabled={fieldDisabled} className={`${isPost ? segActive : segInactive} disabled:opacity-80 disabled:cursor-not-allowed`}>
                                        {t('modal_segment_post')}
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mt-2.5 px-0.5">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center leading-snug">{t('modal_forecast_microcopy')}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center leading-snug">{t('modal_post_microcopy')}</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{t('item_nature')}</p>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <button type="button" onClick={setNatureForecast} disabled={fieldDisabled} className={`${isForecast ? segActive : segInactive} disabled:opacity-80 disabled:cursor-not-allowed`}>
                                        {t('planning_forecast')}
                                    </button>
                                    <button type="button" onClick={setNaturePost} disabled={fieldDisabled} className={`${isPost ? segActive : segInactive} disabled:opacity-80 disabled:cursor-not-allowed`}>
                                        {t('modal_segment_post')}
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mt-2.5 px-0.5">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center leading-snug">{t('modal_forecast_microcopy')}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center leading-snug">{t('modal_post_microcopy')}</p>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Cliente (não para Tarefa Geral) */}
                {!isGeneralTask && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('client')} <span className="text-red-500">*</span></label>
                        {clientsForSelect.length === 0 ? (
                            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm">
                                <p className={`mb-2 text-amber-800 dark:text-amber-200 ${fieldDisabled ? 'mb-0' : ''}`}>{t('no_clients_hint')}</p>
                                {!fieldDisabled && (
                                    <button type="button" onClick={onQuickCreateClient} className="px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 text-sm">
                                        {t('add_client')}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <select
                                value={clientId}
                                onChange={(e) => setClientId(e.target.value)}
                                disabled={fieldDisabled || !!initialClientId}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm disabled:opacity-70"
                            >
                                <option value="">{t('select_client') || 'Selecione um cliente'}</option>
                                {clientsForSelect.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        )}
                        {!isGeneralTask && clientId && postCreationHints.pillarNames.length > 0 && (
                            <p className="mt-1.5 text-xs text-indigo-700 dark:text-indigo-300">
                                {t('client_hint_pillars')}{' '}
                                <span className="font-medium">{postCreationHints.pillarNames.slice(0, 3).join(' · ')}</span>
                            </p>
                        )}
                        {!isGeneralTask && clientId && postCreationHints.contentStyle && (
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {t('client_hint_content_style', { style: postCreationHints.contentStyle })}
                            </p>
                        )}
                    </div>
                )}

                {/* Data: clique no rótulo ou na borda do campo chama showPicker(); clique no input mantém o nativo (Windows/Chrome). */}
                <div className={`mb-4 ${fieldDisabled ? 'opacity-80' : ''}`}>
                    <label
                        htmlFor={dateFieldId}
                        className={`block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 ${fieldDisabled ? 'cursor-not-allowed' : 'cursor-pointer select-none'}`}
                        onClick={(e) => {
                            if (fieldDisabled) return;
                            e.preventDefault();
                            openDatePicker();
                        }}
                    >
                        {isGeneralTask
                            ? t('due_date_label') || 'Data de entrega'
                            : isForecast
                              ? t('planning_forecast_date') || 'Data da previsão'
                              : t('publish_date_label') || 'Data de publicação'}{' '}
                        <span className="text-red-500">*</span>
                    </label>
                    <div
                        className={`flex w-full items-stretch rounded-lg border border-gray-300 dark:border-gray-600 bg-white px-3 py-2 dark:bg-gray-900 ${
                            fieldDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
                        }`}
                        onClick={() => {
                            if (fieldDisabled) return;
                            openDatePicker();
                        }}
                    >
                        <input
                            ref={dateInputRef}
                            id={dateFieldId}
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            disabled={fieldDisabled}
                            className={`min-h-[1.5rem] w-full flex-1 border-0 bg-transparent p-0 text-sm text-gray-900 focus:outline-none focus:ring-0 dark:text-gray-100 ${
                                fieldDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
                            }`}
                        />
                    </div>
                </div>

                {!isGeneralTask && date && operationalMilestones.length > 0 ? (
                    <OperationalMilestonesInfoBlock milestones={operationalMilestones} t={t} publishDate={date} />
                ) : null}

                {isGeneralTask && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('task_client_optional_label')}
                        </label>
                        {clientsForSelect.length === 0 ? (
                            <p className="text-xs text-slate-500 dark:text-slate-400 rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2">
                                {t('task_optional_client_no_list')}
                            </p>
                        ) : (
                            <select
                                value={clientId}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    generalOptionalClientIdRef.current = v;
                                    setClientId(v);
                                }}
                                disabled={fieldDisabled}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-80"
                            >
                                <option value="">{t('task_without_client')}</option>
                                {clientsForSelect.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                )}

                {isTeamMode && !isOperationSolo && isGeneralTask && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Responsável
                        </label>
                        {canChangeTaskOwner ? (
                            <>
                                <select
                                    value={ownerUserId}
                                    onChange={(e) => {
                                        setOwnerPickerTouched(true);
                                        setOwnerUserId(e.target.value);
                                    }}
                                    disabled={fieldDisabled}
                                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-80"
                                >
                                    <option value="">Automático (definido pelo sistema)</option>
                                    {postEligibleMembers.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Se deixar em automático, o servidor define com base nas preferências do cliente e da agência.
                                </p>
                            </>
                        ) : (
                            <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-900/50 dark:text-gray-200">
                                {(() => {
                                    const uid = (task as Task)?.ownerUserId || suggestedOwnerUserId;
                                    if (!uid) return 'Definido automaticamente pelo cliente/planejamento.';
                                    const name = postEligibleMembers.find((m) => m.id === uid)?.name;
                                    return name ? `Atribuído: ${name}` : `Responsável (ID interno): ${uid}`;
                                })()}
                            </p>
                        )}
                    </div>
                )}

                {readOnlyMetaTeam && (
                    <div
                        className="mb-4 flex flex-wrap gap-2"
                        aria-label={isGeneralTask ? t('task_modal_meta_aria') : t('post_modal_meta_aria')}
                    >
                        <TooltipHint
                            label={t('task_created_by', { name: metaCreatedByDisplay })}
                            className="inline-flex max-w-full"
                        >
                            <span className="inline-flex max-w-full items-center rounded-full border border-slate-200/90 bg-slate-100/90 px-2.5 py-1 text-[11px] font-medium leading-tight text-slate-700 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100">
                                <span className="truncate">{t('task_created_by', { name: metaCreatedByDisplay })}</span>
                            </span>
                        </TooltipHint>
                        {metaClientOwnerId?.trim() ? (
                            <TooltipHint
                                label={t('task_client_owner_by', { name: memberName(metaClientOwnerId) })}
                                className="inline-flex max-w-full"
                            >
                                <span className="inline-flex max-w-full items-center rounded-full border border-violet-200/90 bg-violet-50/95 px-2.5 py-1 text-[11px] font-medium leading-tight text-violet-900 dark:border-violet-700/60 dark:bg-violet-950/40 dark:text-violet-100">
                                    <span className="truncate">
                                        {t('task_client_owner_by', { name: memberName(metaClientOwnerId) })}
                                    </span>
                                </span>
                            </TooltipHint>
                        ) : null}
                        {metaExecutionOwnerId?.trim() ? (
                            <TooltipHint
                                label={t('task_execution_by', { name: memberName(metaExecutionOwnerId) })}
                                className="inline-flex max-w-full"
                            >
                                <span className="inline-flex max-w-full items-center rounded-full border border-teal-200/90 bg-teal-50/95 px-2.5 py-1 text-[11px] font-medium leading-tight text-teal-900 dark:border-teal-700/60 dark:bg-teal-950/35 dark:text-teal-100">
                                    <span className="truncate">
                                        {t('task_execution_by', { name: memberName(metaExecutionOwnerId) })}
                                    </span>
                                </span>
                            </TooltipHint>
                        ) : null}
                    </div>
                )}

                {/* Tarefa Geral: título, categoria, status */}
                {isGeneralTask && (
                    <>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('category') || 'Categoria'} <span className="text-red-500">*</span></label>
                            <select
                                value={generalCategory}
                                onChange={(e) => setGeneralCategory(e.target.value)}
                                disabled={fieldDisabled}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-80"
                            >
                                <option value="">{t('select_category_placeholder')}</option>
                                {generalCategorySelectOptions.map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('task_title')} <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder={t('task_title')}
                                disabled={fieldDisabled}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-80"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {generalLinearFlow?.some((s) => s.actionId != null)
                                    ? t('task_status_and_step')
                                    : t('status')}
                            </label>
                            {generalLinearFlow ? (
                                <select
                                    value={statusStepKey}
                                    onChange={(e) => {
                                        setStatusStepKey(e.target.value);
                                        setStatusId(decodeStepValue(e.target.value).statusId);
                                    }}
                                    disabled={fieldDisabled}
                                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-80"
                                >
                                    {groupFlowByStatus(generalLinearFlow).map(({ statusId: sid, steps }) => {
                                        const st = generalWorkflow?.statuses?.find((s) => s.id === sid);
                                        return (
                                            <optgroup key={sid} label={st ? t(st.nameKey) : sid}>
                                                {steps.map((step) => (
                                                    <option
                                                        key={encodeStepValue(step.statusId, step.actionId)}
                                                        value={encodeStepValue(step.statusId, step.actionId)}
                                                    >
                                                        {t(step.nameKey)}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        );
                                    })}
                                </select>
                            ) : (
                                <select
                                    value={statusId}
                                    onChange={(e) => setStatusId(e.target.value)}
                                    disabled={fieldDisabled}
                                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-80"
                                >
                                    {generalWorkflow?.statuses?.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {t(s.nameKey)}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('description')}</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                placeholder={t('description_placeholder')}
                                disabled={fieldDisabled}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm resize-none disabled:cursor-not-allowed disabled:opacity-80"
                            />
                        </div>
                    </>
                )}

                {/* Campos para Post real */}
                {isPost && (
                    <div className="space-y-4 modal-post-fields-enter">
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('post_title')} <span className="text-gray-400 font-normal">(opcional)</span></label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder={t('planning_title_placeholder')}
                                disabled={fieldDisabled}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-80"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('post_type') || 'Tipo do post'}</label>
                            <select
                                value={postType}
                                onChange={(e) => setPostType(e.target.value as PostType)}
                                disabled={fieldDisabled}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-80"
                            >
                                {Object.values(PostTypeEnum).map((type) => (
                                    <option key={type} value={type}>{t(type)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {postLinearFlow ? t('task_status_and_step') : t('status')}
                            </label>
                            {postLinearFlow ? (
                                <select
                                    value={statusStepKey}
                                    onChange={(e) => {
                                        setStatusStepKey(e.target.value);
                                        setStatusId(decodeStepValue(e.target.value).statusId);
                                    }}
                                    disabled={fieldDisabled}
                                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-80"
                                >
                                    {groupFlowByStatus(postLinearFlow).map(({ statusId: sid, steps }) => {
                                        const st = clientWorkflow?.statuses?.find((s) => s.id === sid);
                                        return (
                                            <optgroup key={sid} label={st ? t(st.nameKey) : sid}>
                                                {steps.map((step) => (
                                                    <option
                                                        key={encodeStepValue(step.statusId, step.actionId)}
                                                        value={encodeStepValue(step.statusId, step.actionId)}
                                                    >
                                                        {t(step.nameKey)}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        );
                                    })}
                                </select>
                            ) : (
                                <select
                                    value={statusId}
                                    onChange={(e) => setStatusId(e.target.value)}
                                    disabled={fieldDisabled}
                                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-80"
                                >
                                    {clientWorkflow?.statuses?.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {t(s.nameKey)}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('description')}</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                placeholder={t('description_placeholder')}
                                disabled={fieldDisabled}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm resize-none disabled:cursor-not-allowed disabled:opacity-80"
                            />
                        </div>
                    </div>
                )}

                {forecastWarning && (
                    <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-start gap-2">
                        <AlertTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-800 dark:text-amber-200">{forecastWarning}</p>
                    </div>
                )}

                {errorMessage && (
                    <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
                        {errorMessage}
                    </div>
                )}

                <div className="flex justify-end gap-2 mt-6">
                    {!readOnly && (isPostsPageMode || isTarefasPageMode ? (
                        <TooltipHint label={t('delete')}>
                            <button
                                type="button"
                                onClick={() => {
                                    if (task?.id && onDelete) onDelete(task.id);
                                }}
                                disabled={!task?.id || !onDelete}
                                className="p-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 disabled:cursor-not-allowed"
                                aria-label={t('delete')}
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </TooltipHint>
                    ) : (
                        !isPostsPageMode && !isTarefasPageMode && task?.id && onDelete && (
                            <button
                                onClick={() => onDelete(task.id!)}
                                className="px-4 py-2 text-sm rounded-lg border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                                {t('delete')}
                            </button>
                        )
                    ))}
                    <div className="flex-1" />
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                        {readOnly ? t('close') : t('cancel')}
                    </button>
                    {!readOnly && (
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving || !canSave}
                            className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {saving ? (t('saving') || 'Salvando...') : (t('save') || 'Salvar')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PostOrForecastModal;
