import React, { useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { AppContext } from '../contexts/AppContext';
import type { Task, Language } from '../types';
import { formatDateToYYYYMMDD, getWeekDaysMondayFirst, getExpectedForWeek, getDateRangeForForecastPeriod, computeForecastDatesToCreate, getMonthName, getMonthDays, isToday } from '../lib/utils';
import type { ForecastPeriodKey } from '../lib/utils';
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, PlusIcon, ClipboardListIcon, CalendarIcon, AlertTriangleIcon, FunnelIcon } from './icons';
import FilterDropdown from './tasks/FilterDropdown';
import { apiGet, apiPost, apiPut } from '../lib/api';
import {
    CONTENT_BELOW_HEADER_PAD,
    CONTENT_PAGE_BODY_INNER,
    CONTENT_PAGE_SCROLL_OUTER,
    HEADER_GRADIENT_PLUS_CLASS,
    CONTENT_PAGE_SUBTOOLBAR_STRIP,
    SUBTOOLBAR_ICON_BUTTON_CLASS,
    SUBTOOLBAR_TEXT_BUTTON_CLASS,
    SUBTOOLBAR_VIEW_ACTIVE_CLASS,
    SUBTOOLBAR_VIEW_INACTIVE_CLASS,
} from '../lib/contentPageHeader';
import PostOrForecastModal, { isForecastTask } from './PostOrForecastModal';
import { mapApiTaskToTask } from '../lib/mapApiTaskToTask';
import { buildTaskFlowHistoryLine } from '../lib/activityHistoryPayload';
import { resolveClientPostWorkflowId } from '../lib/colorSchemes';
import { getPostStatusBorderClass } from '../lib/postStatusBorder';
import ContentPageHeader from './ContentPageHeader';
import TooltipHint from './TooltipHint';
import { getClientPlanningProfile } from '../lib/clientContext';
import { buildPlanningIntelligenceItems, type IntelligenceItem } from '../lib/intelligentCentral';
import { createPlanningQuotaValidator } from '../lib/planningQuota';
import { scopePlanningCentralItems } from '../lib/planningCentralView';
import IntelligentCentral from './IntelligentCentral';

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

/** Mesmo marcador de “hoje” da Agenda (mensal). */
const PLANNING_TODAY_DAY_MARKER_CLASS =
    'inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white';
const POSTS_MODAL_TARGET_KEY = 'flow_posts_edit_target_task_id';

function isPreferredDay(client: { preferredPostDays?: string[] }, date: Date): boolean {
    if (!client.preferredPostDays?.length) return false;
    const key = DAY_KEYS[(date.getDay() + 6) % 7];
    return client.preferredPostDays.includes(key);
}

function buildMonthDayIndicatorTooltip(
    dayItems: Task[],
    kind: 'posts' | 'forecasts',
    clientFilter: string,
    clientNameById: Map<string, string>,
    t: (key: string, params?: Record<string, string>) => string,
): string {
    const filtered =
        kind === 'forecasts'
            ? dayItems.filter((it) => it.category === 'forecast')
            : dayItems.filter((it) => it.category !== 'forecast');
    const prefix =
        kind === 'forecasts' ? t('planning_month_cell_legend_forecasts') : t('planning_month_cell_legend_posts');
    if (filtered.length === 0) return prefix;

    const detail =
        clientFilter === 'all'
            ? [
                  ...new Set(
                      filtered.map((it) => clientNameById.get(it.clientId || '') || t('planning_client_unknown')),
                  ),
              ].join(', ')
            : filtered
                  .map((it) =>
                      it.title ||
                      (kind === 'forecasts' ? t('planning_forecast_type') : t('planning_draft_default_title')),
                  )
                  .join(', ');

    return `${prefix}: ${detail}`;
}

function groupPlanningDayItemsByClient(
    items: Task[],
    clientNameById: Map<string, string>,
    unknownClientLabel: string,
) {
    const groups = new Map<string, Task[]>();
    for (const item of items) {
        const clientId = item.clientId || '';
        if (!groups.has(clientId)) groups.set(clientId, []);
        groups.get(clientId)!.push(item);
    }
    return [...groups.entries()]
        .map(([clientId, clientItems]) => ({
            clientId,
            clientName: clientNameById.get(clientId) || unknownClientLabel,
            items: [...clientItems].sort((a, b) => {
                const aForecast = a.category === 'forecast' ? 1 : 0;
                const bForecast = b.category === 'forecast' ? 1 : 0;
                if (aForecast !== bForecast) return aForecast - bForecast;
                return (a.title || '').localeCompare(b.title || '', 'pt-BR');
            }),
        }))
        .sort((a, b) => a.clientName.localeCompare(b.clientName, 'pt-BR'));
}

type PlanningClient = {
    id: string;
    name: string;
    color?: string;
    postFrequency?: string;
    postFrequencyQuantity?: number;
    postFrequencyPeriod?: 'week' | 'month';
    postFrequencyVariable?: boolean;
    preferredPostDays?: string[];
    planningProductionLeadDays?: string;
    planningApprovalLeadDays?: string;
    planningSchedulingLeadDays?: string;
    planningApprovalRequired?: boolean;
};

const PlanningPage: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) return null;

    const { t, language, tasks, setTasks, workflows, clientWorkflowId, notify, setPage, agencyMode, canEditModule, canViewModule, logActivity } =
        context;
    const canEditPlanning = canEditModule('planning');
    const canViewPosts = canViewModule('posts');

    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const d = new Date();
        const day = d.getDay();
        const offset = day === 0 ? -6 : 1 - day;
        d.setDate(d.getDate() + offset);
        d.setHours(0, 0, 0, 0);
        return d;
    });
    const [clients, setClients] = useState<PlanningClient[]>([]);
    const [clientFilter, setClientFilter] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [createModal, setCreateModal] = useState<{ clientId: string; clientName: string; date: string } | null>(null);
    const [modalTask, setModalTask] = useState<Partial<Task> | null>(null);
    const [forecastPopoverOpen, setForecastPopoverOpen] = useState(false);
    const [forecastGenerating, setForecastGenerating] = useState(false);
    const forecastPopoverRef = useRef<HTMLDivElement>(null);
    const [planningView, setPlanningView] = useState<'weekly' | 'monthly'>('monthly');
    const [currentMonthAnchor, setCurrentMonthAnchor] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1);
    });

    const weekDays = useMemo(() => getWeekDaysMondayFirst(currentWeekStart), [currentWeekStart]);
    const startDate = formatDateToYYYYMMDD(weekDays[0]);
    const endDate = formatDateToYYYYMMDD(weekDays[6]);

    const { dataStartDate, dataEndDate } = useMemo(() => {
        if (planningView === 'weekly') {
            return { dataStartDate: startDate, dataEndDate: endDate };
        }
        const y = currentMonthAnchor.getFullYear();
        const mo = currentMonthAnchor.getMonth();
        return {
            dataStartDate: formatDateToYYYYMMDD(new Date(y, mo, 1)),
            dataEndDate: formatDateToYYYYMMDD(new Date(y, mo + 1, 0)),
        };
    }, [planningView, startDate, endDate, currentMonthAnchor]);

    const clientWorkflow = workflows[resolveClientPostWorkflowId(workflows, clientWorkflowId)];
    const firstStatusId = clientWorkflow?.statuses?.[0]?.id || '';

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const [clientsResp, tasksResp] = await Promise.all([
                    apiGet<{ items: any[] }>('/clients', { page: 1, pageSize: 500 }),
                    apiGet<{ items: any[] }>('/tasks', { startDate: dataStartDate, endDate: dataEndDate, page: 1, pageSize: 1000 }),
                ]);
                const rawClients = clientsResp?.items || [];
                const planningClients: PlanningClient[] = rawClients.map((c: any) => {
                    const bg = (c.brandGuideJson || {}) as Record<string, unknown>;
                    return {
                        id: c.id,
                        name: c.name || '',
                        color: c.color,
                        postFrequency: (bg.postFrequency ?? c.postFrequency) as string | undefined,
                        postFrequencyQuantity: (bg.postFrequencyQuantity ?? c.postFrequencyQuantity) as number | undefined,
                        postFrequencyPeriod: (bg.postFrequencyPeriod ?? c.postFrequencyPeriod) as 'week' | 'month' | undefined,
                        postFrequencyVariable: Boolean(bg.postFrequencyVariable ?? c.postFrequencyVariable),
                        preferredPostDays: Array.isArray(bg.preferredPostDays ?? c.preferredPostDays)
                            ? (bg.preferredPostDays ?? c.preferredPostDays) as string[]
                            : [],
                        planningProductionLeadDays: String(bg.planningProductionLeadDays ?? c.planningProductionLeadDays ?? ''),
                        planningApprovalLeadDays: String(bg.planningApprovalLeadDays ?? c.planningApprovalLeadDays ?? ''),
                        planningSchedulingLeadDays: String(bg.planningSchedulingLeadDays ?? c.planningSchedulingLeadDays ?? ''),
                        planningApprovalRequired: Boolean(bg.planningApprovalRequired ?? c.planningApprovalRequired ?? true),
                    };
                });
                setClients(planningClients);

                if (tasksResp?.items) {
                    const todayStr = formatDateToYYYYMMDD(new Date());
                    const mapped: Task[] = (tasksResp.items || []).map((it: any) => mapApiTaskToTask(it, todayStr));
                    setTasks((prev: Task[]) => {
                        const existing = prev || [];
                        const inRange = (t: Task) => {
                            const d = (t.publishDate ?? t.date) ?? '';
                            return d && d >= dataStartDate && d <= dataEndDate;
                        };
                        const outside = existing.filter((t) => !inRange(t));
                        const combined = [...outside, ...mapped];
                        return Array.from(new Map(combined.map((t) => [t.id, t])).values());
                    });
                }
            } catch (e) {
                console.error('[PlanningPage] load error', e);
            } finally {
                setLoading(false);
            }
        })();
    }, [dataStartDate, dataEndDate]);

    const reloadPlanningTasks = useCallback(async () => {
        try {
            const tasksResp = await apiGet<{ items: any[] }>('/tasks', {
                startDate: dataStartDate,
                endDate: dataEndDate,
                page: 1,
                pageSize: 1000,
            });
            if (!tasksResp?.items) return;
            const todayStr = formatDateToYYYYMMDD(new Date());
            const mapped: Task[] = (tasksResp.items || []).map((it: any) => mapApiTaskToTask(it, todayStr));
            setTasks((prev: Task[]) => {
                const existing = prev || [];
                const inRange = (task: Task) => {
                    const d = (task.publishDate ?? task.date) ?? '';
                    return d && d >= dataStartDate && d <= dataEndDate;
                };
                const outside = existing.filter((t) => !inRange(t));
                const combined = [...outside, ...mapped];
                return Array.from(new Map(combined.map((t) => [t.id, t])).values());
            });
        } catch (e) {
            console.error('[PlanningPage] reload tasks error', e);
        }
    }, [dataStartDate, dataEndDate, setTasks]);

    /** Itens do planejamento: posts reais (postType) + previsões (category='forecast') */
    const planningItems = useMemo(() => {
        const list = tasks || [];
        return list.filter((x): x is Task => !x.isGeneral && !!x.clientId && ((!!x.postType) || x.category === 'forecast'));
    }, [tasks]);

    const filteredClients = useMemo(() => {
        if (clientFilter === 'all') return clients;
        return clients.filter((c) => c.id === clientFilter);
    }, [clients, clientFilter]);

    const selectedClient = useMemo(() => {
        if (clientFilter === 'all') return null;
        return clients.find((c) => c.id === clientFilter) ?? null;
    }, [clients, clientFilter]);

    const clientNameById = useMemo(() => {
        const map = new Map<string, string>();
        for (const c of clients) map.set(c.id, c.name);
        return map;
    }, [clients]);
    const [monthlyDayDetail, setMonthlyDayDetail] = useState<{ date: Date; items: Task[] } | null>(null);

    const { canGenerateForecasts, generateForecastsTooltip } = useMemo(() => {
        if (clientFilter === 'all') {
            return { canGenerateForecasts: false, generateForecastsTooltip: 'planning_generate_forecasts_tooltip' as const };
        }
        const client = selectedClient;
        if (!client) return { canGenerateForecasts: false, generateForecastsTooltip: 'planning_generate_forecasts_tooltip' as const };
        if (client.postFrequencyVariable) {
            return { canGenerateForecasts: false, generateForecastsTooltip: 'planning_generate_forecasts_tooltip_variable' as const };
        }
        const hasValidFrequency =
            typeof client.postFrequencyQuantity === 'number' &&
            client.postFrequencyQuantity > 0 &&
            (client.postFrequencyPeriod === 'week' || client.postFrequencyPeriod === 'month');
        if (!hasValidFrequency) {
            return { canGenerateForecasts: false, generateForecastsTooltip: 'planning_generate_forecasts_tooltip_no_frequency' as const };
        }
        return { canGenerateForecasts: true, generateForecastsTooltip: null };
    }, [clientFilter, selectedClient]);

    const weekSummary = useMemo(() => {
        let totalPlanned = 0;
        let totalExpected = 0;
        let clientsWithGap = 0;
        for (const c of filteredClients) {
            const clientItems = planningItems.filter((p) => p.clientId === c.id && (p.publishDate ?? p.date) >= startDate && (p.publishDate ?? p.date) <= endDate);
            const planned = clientItems.length;
            const expected = getExpectedForWeek(c, weekDays);
            totalPlanned += planned;
            if (expected != null) {
                totalExpected += expected;
                if (planned < expected) clientsWithGap += 1;
            }
        }
        return { totalPlanned, totalExpected, clientsWithGap };
    }, [filteredClients, planningItems, startDate, endDate, weekDays]);

    const monthCalendarRows = useMemo(() => {
        if (planningView !== 'monthly') return { five: false, six: false };
        const year = currentMonthAnchor.getFullYear();
        const month = currentMonthAnchor.getMonth();
        const firstDay = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstWeekday = firstDay.getDay();
        const offset = firstWeekday === 0 ? 6 : firstWeekday - 1;
        const rows = Math.ceil((daysInMonth + offset) / 7);
        return { five: rows >= 5, six: rows >= 6 };
    }, [planningView, currentMonthAnchor]);

    const planningIntelligenceItems = useMemo(() => {
        const profiles = filteredClients.map((c) =>
            getClientPlanningProfile(
                {
                    id: c.id,
                    name: c.name,
                    postFrequency: c.postFrequency,
                    postFrequencyQuantity: c.postFrequencyQuantity,
                    postFrequencyPeriod: c.postFrequencyPeriod,
                    postFrequencyVariable: c.postFrequencyVariable,
                    preferredPostDays: c.preferredPostDays,
                } as import('../types').Client,
                weekDays,
            ),
        );
        const raw = buildPlanningIntelligenceItems({
            clients: profiles,
            planningItems,
            weekDays,
            startDate: planningView === 'monthly' ? dataStartDate : startDate,
            endDate: planningView === 'monthly' ? dataEndDate : endDate,
            monthHasFiveWeeks: monthCalendarRows.five,
            monthHasSixWeeks: monthCalendarRows.six,
        });
        return scopePlanningCentralItems(raw, clientFilter).map((item) => {
            const { contextKey: _ctx, ...rest } = item;
            return rest;
        });
    }, [
        filteredClients,
        planningItems,
        weekDays,
        startDate,
        endDate,
        dataStartDate,
        dataEndDate,
        planningView,
        monthCalendarRows,
        clientFilter,
    ]);

    const kpiScopeSuffix = useMemo(() => {
        if (clientFilter === 'all') return t('planning_kpi_scope_agency');
        return t('planning_kpi_scope_client', { name: selectedClient?.name ?? t('planning_client_unknown') });
    }, [clientFilter, selectedClient, t]);

    const postsByClientAndDate = useMemo(() => {
        const map = new Map<string, Task[]>();
        for (const p of planningItems) {
            const date = p.publishDate ?? p.date ?? '';
            if (!date || date < dataStartDate || date > dataEndDate) continue;
            const key = `${p.clientId}::${date}`;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(p);
        }
        return map;
    }, [planningItems, dataStartDate, dataEndDate]);

    const goPrevWeek = useCallback(() => {
        const d = new Date(currentWeekStart);
        d.setDate(d.getDate() - 7);
        setCurrentWeekStart(d);
    }, [currentWeekStart]);

    const goNextWeek = useCallback(() => {
        const d = new Date(currentWeekStart);
        d.setDate(d.getDate() + 7);
        setCurrentWeekStart(d);
    }, [currentWeekStart]);

    const goThisWeek = useCallback(() => {
        const d = new Date();
        const day = d.getDay();
        const offset = day === 0 ? -6 : 1 - day;
        d.setDate(d.getDate() + offset);
        d.setHours(0, 0, 0, 0);
        setCurrentWeekStart(d);
        setCurrentMonthAnchor(new Date(d.getFullYear(), d.getMonth(), 1));
    }, []);

    const goPrevMonth = useCallback(() => {
        setCurrentMonthAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    }, []);

    const goNextMonth = useCallback(() => {
        setCurrentMonthAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    }, []);

    const goThisMonth = useCallback(() => {
        const d = new Date();
        setCurrentMonthAnchor(new Date(d.getFullYear(), d.getMonth(), 1));
    }, []);

    const planningMonthDayStats = useMemo(() => {
        const map = new Map<string, { total: number; planned: number; forecast: number }>();
        if (planningView !== 'monthly') return map;
        const y = currentMonthAnchor.getFullYear();
        const m = currentMonthAnchor.getMonth();
        const low = formatDateToYYYYMMDD(new Date(y, m, 1));
        const hi = formatDateToYYYYMMDD(new Date(y, m + 1, 0));
        for (const p of planningItems) {
            if (clientFilter !== 'all' && p.clientId !== clientFilter) continue;
            const ds = (p.publishDate ?? p.date ?? '').slice(0, 10);
            if (!ds || ds < low || ds > hi) continue;
            const existing = map.get(ds) ?? { total: 0, planned: 0, forecast: 0 };
            existing.total += 1;
            if (p.category === 'forecast') existing.forecast += 1;
            else existing.planned += 1;
            map.set(ds, existing);
        }
        return map;
    }, [planningView, planningItems, clientFilter, currentMonthAnchor]);

    const planningMonthItemsByDay = useMemo(() => {
        const map = new Map<string, Task[]>();
        if (planningView !== 'monthly') return map;
        const y = currentMonthAnchor.getFullYear();
        const m = currentMonthAnchor.getMonth();
        const low = formatDateToYYYYMMDD(new Date(y, m, 1));
        const hi = formatDateToYYYYMMDD(new Date(y, m + 1, 0));
        for (const p of planningItems) {
            if (clientFilter !== 'all' && p.clientId !== clientFilter) continue;
            const ds = (p.publishDate ?? p.date ?? '').slice(0, 10);
            if (!ds || ds < low || ds > hi) continue;
            if (!map.has(ds)) map.set(ds, []);
            map.get(ds)!.push(p);
        }
        return map;
    }, [planningView, planningItems, clientFilter, currentMonthAnchor]);

    const monthPlannedTotal = useMemo(() => {
        if (planningView !== 'monthly') return 0;
        return Array.from(planningMonthDayStats.values()).reduce((sum, stats) => sum + stats.total, 0);
    }, [planningView, planningMonthDayStats]);

    const monthRealPostsTotal = useMemo(() => {
        if (planningView !== 'monthly') return 0;
        return Array.from(planningMonthDayStats.values()).reduce((sum, stats) => sum + stats.planned, 0);
    }, [planningView, planningMonthDayStats]);

    const monthForecastsTotal = useMemo(() => {
        if (planningView !== 'monthly') return 0;
        return Array.from(planningMonthDayStats.values()).reduce((sum, stats) => sum + stats.forecast, 0);
    }, [planningView, planningMonthDayStats]);

    const monthDistinctDaysWithPosts = useMemo(() => {
        if (planningView !== 'monthly') return 0;
        return planningMonthDayStats.size;
    }, [planningView, planningMonthDayStats]);

    const openWeekContainingDay = useCallback((day: Date) => {
        const monday = getWeekDaysMondayFirst(day)[0];
        monday.setHours(0, 0, 0, 0);
        setCurrentWeekStart(monday);
        setPlanningView('weekly');
        setMonthlyDayDetail(null);
    }, []);

    const openTaskInPostsPage = useCallback((taskId: string) => {
        try {
            localStorage.setItem(POSTS_MODAL_TARGET_KEY, taskId);
        } catch {}
        setMonthlyDayDetail(null);
        setPage('producao');
    }, [setPage]);

    const openCreate = useCallback((clientId: string, clientName: string, date: string) => {
        setModalTask(null);
        setCreateModal({ clientId, clientName, date });
    }, []);

    const closeCreate = useCallback(() => {
        setCreateModal(null);
        setModalTask(null);
    }, []);

    const openEditInPlanning = useCallback((task: Task) => {
        setModalTask({ ...task });
        setCreateModal({
            clientId: task.clientId || '',
            clientName: clientNameById.get(task.clientId || '') || t('planning_client_unknown'),
            date: task.publishDate || task.date || formatDateToYYYYMMDD(new Date()),
        });
        setMonthlyDayDetail(null);
    }, [clientNameById, t]);

    const handleSaveFromModal = useCallback(
        async (taskToSave: Task) => {
            const isForecast = taskToSave.category === 'forecast';
            const isEdit = !!taskToSave.id;
            const payload: Record<string, unknown> = {
                title: taskToSave.title || (isForecast ? t('planning_forecast_type') : t('planning_draft_default_title')),
                date: taskToSave.date,
                publishDate: taskToSave.publishDate || taskToSave.date,
                clientId: taskToSave.clientId,
                workflowId: clientWorkflowId,
                statusId: taskToSave.statusId || firstStatusId,
                postType: isForecast ? null : taskToSave.postType,
                category: isForecast ? 'forecast' : undefined,
                description: taskToSave.description,
                origin: taskToSave.origin ?? 'planejamento',
                bornAsForecast: isForecast ? (taskToSave.bornAsForecast ?? true) : false,
                currentActionId: taskToSave.currentActionId ?? null,
            };
            if (agencyMode === 'TEAM' && taskToSave.ownerUserId) {
                payload.ownerUserId = taskToSave.ownerUserId;
            }
            if (isEdit) {
                const updated = await apiPut<any>(`/tasks/${taskToSave.id}`, payload);
                logActivity(
                    buildTaskFlowHistoryLine('updated', {
                        name: (taskToSave.title || (isForecast ? t('planning_forecast_type') : t('planning_draft_default_title'))) as string,
                        page: 'posts',
                        isPost: !isForecast,
                        isForecast,
                    }),
                );
                const updatedTask: Task = {
                    ...taskToSave,
                    id: updated.id || taskToSave.id,
                    date: updated.date?.slice(0, 10) || taskToSave.date,
                    publishDate: updated.publishDate?.slice(0, 10) || taskToSave.publishDate || taskToSave.date,
                    category: updated.category ?? taskToSave.category,
                    postType: updated.postType ?? taskToSave.postType,
                    statusId: updated.statusId ?? taskToSave.statusId,
                };
                setTasks((prev: Task[]) => (prev || []).map((item) => (item.id === taskToSave.id ? { ...item, ...updatedTask } : item)));
                await reloadPlanningTasks();
                return;
            }

            const created = await apiPost<any>('/tasks', payload);
            logActivity(
                buildTaskFlowHistoryLine('created', {
                    name: (taskToSave.title || (isForecast ? t('planning_forecast_type') : t('planning_draft_default_title'))) as string,
                    page: 'posts',
                    isPost: !isForecast,
                    isForecast,
                }),
            );
            const todayStr = formatDateToYYYYMMDD(new Date());
            const newTask: Task = mapApiTaskToTask(created, todayStr);
            setTasks((prev: Task[]) => {
                const list = prev || [];
                if (list.some((item) => item.id === newTask.id)) {
                    return list.map((item) => (item.id === newTask.id ? { ...item, ...newTask } : item));
                }
                return [...list, newTask];
            });
            await reloadPlanningTasks();
        },
        [agencyMode, clientWorkflowId, firstStatusId, reloadPlanningTasks, setTasks, t]
    );

    const onValidateForecast = useMemo(
        () => createPlanningQuotaValidator(clients, t),
        [clients, t],
    );

    const weekLabel = `${weekDays[0].getDate()}/${weekDays[0].getMonth() + 1} – ${weekDays[6].getDate()}/${weekDays[6].getMonth() + 1} ${weekDays[0].getFullYear()}`;

    const handleHeaderAdd = useCallback(() => {
        const first = filteredClients[0];
        if (!first) return;
        const dateStr = planningView === 'weekly' ? startDate : dataStartDate;
        openCreate(first.id, first.name, dateStr);
    }, [filteredClients, startDate, dataStartDate, planningView, openCreate]);

    const focusClient = useCallback((clientId: string) => setClientFilter((prev) => (prev === clientId ? 'all' : clientId)), []);

    const handlePlanningIntelAction = useCallback(
        (item: IntelligenceItem) => {
            if (item.clientId) {
                focusClient(item.clientId);
            }
        },
        [focusClient],
    );

    useEffect(() => {
        if (!forecastPopoverOpen) return;
        const onOutside = (e: MouseEvent) => {
            if (forecastPopoverRef.current && !forecastPopoverRef.current.contains(e.target as Node)) {
                setForecastPopoverOpen(false);
            }
        };
        document.addEventListener('mousedown', onOutside);
        return () => document.removeEventListener('mousedown', onOutside);
    }, [forecastPopoverOpen]);

    const handleGenerateForecasts = useCallback(
        async (period: ForecastPeriodKey) => {
            if (!selectedClient || !firstStatusId || !clientWorkflowId || forecastGenerating) return;
            setForecastGenerating(true);
            setForecastPopoverOpen(false);
            try {
                const { start, end } = getDateRangeForForecastPeriod(period);
                const rangeStart = formatDateToYYYYMMDD(start);
                const rangeEnd = formatDateToYYYYMMDD(end);
                const resp = await apiGet<{ items: any[] }>('/tasks', {
                    startDate: rangeStart,
                    endDate: rangeEnd,
                    clientId: selectedClient.id,
                    page: 1,
                    pageSize: 2000,
                });
                const existingTasks = (resp?.items || []) as Array<{ publishDate?: string; date?: string; postType?: string; category?: string }>;
                const countByDate = new Map<string, number>();
                for (const task of existingTasks) {
                    const occupiesSlot = !!task.postType || task.category === 'forecast';
                    if (!occupiesSlot) continue;
                    const d = (task.publishDate ?? task.date)?.slice(0, 10) || '';
                    if (d) countByDate.set(d, (countByDate.get(d) ?? 0) + 1);
                }
                const datesToCreate = computeForecastDatesToCreate(
                    selectedClient,
                    start,
                    end,
                    countByDate
                );
                let created = 0;
                for (const dateStr of datesToCreate) {
                    const payload = {
                        title: t('planning_forecast_type'),
                        date: dateStr,
                        publishDate: dateStr,
                        clientId: selectedClient.id,
                        postType: null,
                        workflowId: clientWorkflowId,
                        statusId: firstStatusId,
                        category: 'forecast',
                        origin: 'planejamento',
                        bornAsForecast: true,
                    };
                    const createdTask = await apiPost<any>('/tasks', payload);
                    const newTask: Task = {
                        id: createdTask.id,
                        title: payload.title,
                        date: dateStr,
                        publishDate: dateStr,
                        statusId: firstStatusId,
                        workflowId: clientWorkflowId,
                        clientId: selectedClient.id,
                        postType: undefined,
                        category: 'forecast',
                        isGeneral: false,
                        origin: 'planejamento',
                        bornAsForecast: true,
                    };
                    setTasks((prev: Task[]) => [...(prev || []), newTask]);
                    created++;
                }
                if (notify) {
                    if (created === 0) {
                        notify(t('planning_forecast_result_none'));
                    } else {
                        notify(t('planning_forecast_result_created', { n: String(created) }));
                    }
                }
            } catch (e) {
                console.error('[PlanningPage] generate forecasts error', e);
                if (notify) notify(t('planning_forecast_result_error'));
            } finally {
                setForecastGenerating(false);
            }
        },
        [selectedClient, firstStatusId, clientWorkflowId, forecastGenerating, t, setTasks, notify]
    );

    return (
        <div className="flex min-h-full min-w-0 w-full flex-1 flex-col">
            {/* Mesma hierarquia do header de Tarefas; `justify-end` só aqui: ancoragem na base da faixa (min-h > conteúdo). */}
            <ContentPageHeader
                heading={t('editorial_calendar')}
                subtitle={t('editorial_calendar_subtitle')}
                actions={(
                    <>
                            {/* Botão Gerar previsões - popover com opções de período */}
                            <div ref={forecastPopoverRef} className="relative inline-flex">
                                <TooltipHint
                                    label={
                                        !canEditPlanning
                                            ? t('tooltip_no_edit_permission')
                                            : generateForecastsTooltip
                                              ? t(generateForecastsTooltip)
                                              : t('planning_generate_forecasts')
                                    }
                                >
                                    <span
                                        className={`inline-flex ${!canGenerateForecasts || !canEditPlanning ? 'cursor-not-allowed' : ''}`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => canGenerateForecasts && canEditPlanning && !forecastGenerating && setForecastPopoverOpen((o) => !o)}
                                            disabled={!canGenerateForecasts || !canEditPlanning || forecastGenerating}
                                            aria-label={t('planning_generate_forecasts')}
                                            aria-expanded={forecastPopoverOpen}
                                            aria-haspopup="true"
                                            className={`h-10 pl-4 pr-2 rounded-lg border border-white/30 bg-white/20 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-500 transition-all inline-flex items-center gap-1 ${!canGenerateForecasts || !canEditPlanning ? 'opacity-50 cursor-not-allowed pointer-events-none hover:bg-white/20' : 'hover:bg-white/30'}`}
                                        >
                                            {t('planning_generate_forecasts')}
                                            <ChevronDownIcon className={`w-4 h-4 transition-transform ${forecastPopoverOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                    </span>
                                </TooltipHint>
                                {forecastPopoverOpen && canGenerateForecasts && canEditPlanning && (
                                    <div
                                        className="absolute top-full right-0 mt-1 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg z-50 min-w-[180px]"
                                        role="menu"
                                    >
                                        {(['1m', '3m', '6m', '1y'] as ForecastPeriodKey[]).map((p) => (
                                            <button
                                                key={p}
                                                type="button"
                                                role="menuitem"
                                                onClick={() => handleGenerateForecasts(p)}
                                                disabled={forecastGenerating}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 focus:bg-indigo-50 dark:focus:bg-indigo-900/30 focus:outline-none disabled:opacity-50"
                                            >
                                                {t(`planning_forecast_period_${p}`)}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {canEditPlanning && (
                            <TooltipHint label={t('planning_add_post_slot')}>
                                <button
                                    type="button"
                                    onClick={handleHeaderAdd}
                                    disabled={filteredClients.length === 0}
                                    aria-label={t('adicionar')}
                                    className={HEADER_GRADIENT_PLUS_CLASS}
                                >
                                    <PlusIcon className="h-5 w-5 transition-transform duration-200 group-hover:rotate-90" />
                                </button>
                            </TooltipHint>
                            )}
                    </>
                )}
            />

            <main className={`${CONTENT_PAGE_SCROLL_OUTER} ${CONTENT_BELOW_HEADER_PAD}`}>
                <div className={`${CONTENT_PAGE_BODY_INNER} flex flex-col gap-7`}>
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <div className="animate-pulse text-gray-500 dark:text-gray-400">{t('loading') || 'Carregando...'}</div>
                        </div>
                    ) : filteredClients.length === 0 ? (
                        <div className="rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 p-12 text-center">
                            <p className="text-gray-500 dark:text-gray-400">{t('empty_state_clients_subtitle')}</p>
                        </div>
                    ) : (
                        <>
                            {/* Cards de métricas + Dicas Estratégicas na mesma linha */}
                            <div className="flex flex-wrap gap-4 items-stretch">
                                <div className="flex flex-wrap gap-3 flex-1 min-w-0">
                                    {planningView === 'weekly' ? (
                                        <>
                                            <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/20 px-4 py-3 shadow-sm h-[124px]">
                                                <div className="flex items-center gap-2">
                                                    <ClipboardListIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                                    <span className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">{weekSummary.totalPlanned}</span>
                                                </div>
                                                <div className="text-xs text-indigo-700 dark:text-indigo-300 text-center">
                                                    {clientFilter === 'all' ? t('planning_summary_planned_agency') : t('planning_summary_planned_client')}
                                                </div>
                                                <div className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 text-center truncate max-w-[10rem]">{kpiScopeSuffix}</div>
                                            </div>
                                            <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-3 shadow-sm h-[124px]">
                                                <div className="flex items-center gap-2">
                                                    <CalendarIcon className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0" />
                                                    <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{Math.ceil(weekSummary.totalExpected)}</span>
                                                </div>
                                                <div className="text-xs text-slate-600 dark:text-slate-400 text-center">
                                                    {clientFilter === 'all' ? t('planning_summary_expected_agency') : t('planning_summary_expected_client')}
                                                </div>
                                                <div className="text-[10px] text-slate-500 dark:text-slate-500 text-center truncate max-w-[10rem]">{kpiScopeSuffix}</div>
                                            </div>
                                            {weekSummary.clientsWithGap > 0 && (
                                                <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 shadow-sm h-[124px]">
                                                    <div className="flex items-center gap-2">
                                                        <AlertTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                                                        <span className="text-2xl font-bold text-amber-800 dark:text-amber-200">{weekSummary.clientsWithGap}</span>
                                                    </div>
                                                    <div className="text-xs text-amber-700 dark:text-amber-300 text-center">{t('planning_summary_clients_gap_agency')}</div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/60 dark:bg-violet-950/30 px-4 py-3 shadow-sm h-[124px] min-w-[140px]">
                                                <div className="flex items-center gap-2">
                                                    <ClipboardListIcon className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0" />
                                                    <span className="text-2xl font-bold text-violet-900 dark:text-violet-100">{monthPlannedTotal}</span>
                                                </div>
                                                <div className="text-xs text-violet-800 dark:text-violet-200 text-center max-w-[10rem]">
                                                    {clientFilter === 'all' ? t('planning_month_summary_planned_agency') : t('planning_month_summary_planned_client')}
                                                </div>
                                                <div className="text-[10px] text-violet-700/90 dark:text-violet-300/90 text-center truncate max-w-[10rem]">{kpiScopeSuffix}</div>
                                            </div>
                                            <div className="flex flex-col items-center justify-center gap-0.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/20 px-3 py-3 shadow-sm h-[124px] min-w-[100px]">
                                                <span className="text-xl font-bold text-indigo-900 dark:text-indigo-100">{monthRealPostsTotal}</span>
                                                <div className="text-[10px] text-indigo-700 dark:text-indigo-300 text-center leading-tight">{t('planning_month_summary_posts')}</div>
                                            </div>
                                            <div className="flex flex-col items-center justify-center gap-0.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50 px-3 py-3 shadow-sm h-[124px] min-w-[100px]">
                                                <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{monthForecastsTotal}</span>
                                                <div className="text-[10px] text-slate-600 dark:text-slate-400 text-center leading-tight">{t('planning_month_summary_forecasts')}</div>
                                            </div>
                                            <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-3 shadow-sm h-[124px] min-w-[140px]">
                                                <div className="flex items-center gap-2">
                                                    <CalendarIcon className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0" />
                                                    <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{monthDistinctDaysWithPosts}</span>
                                                </div>
                                                <div className="text-xs text-slate-600 dark:text-slate-400 text-center max-w-[10rem]">
                                                    {clientFilter === 'all' ? t('planning_month_summary_active_days_agency') : t('planning_month_summary_active_days_client')}
                                                </div>
                                                <div className="text-[10px] text-slate-500 dark:text-slate-500 text-center truncate max-w-[10rem]">{kpiScopeSuffix}</div>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <IntelligentCentral
                                    className="max-w-[320px] shrink-0"
                                    items={planningIntelligenceItems}
                                    t={t}
                                    onAction={handlePlanningIntelAction}
                                    emptyMessageKey="planning_balanced"
                                />
                            </div>

                            <div className="border-t border-gray-200/80 pt-3 dark:border-gray-700/80">
                                <div className={`${CONTENT_PAGE_SUBTOOLBAR_STRIP} mt-0.5 items-center gap-2`}>
                                    <FilterDropdown
                                        layout="inline"
                                        label={t('client')}
                                        name="clientFilter"
                                        options={[{ value: 'all', label: t('planning_all_clients') }, ...clients.map((c) => ({ value: c.id, label: c.name }))]}
                                        value={clientFilter}
                                        onChange={(_, value) => setClientFilter(value)}
                                        disabled={clients.length === 0}
                                        selectClassName="h-10 min-h-[2.5rem] min-w-[160px] rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 shadow-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                                    />
                                    <TooltipHint label={t('planning_view_monthly_hint')}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPlanningView('monthly');
                                                setCurrentMonthAnchor(new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), 1));
                                            }}
                                            className={`flex h-10 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-all ${
                                                planningView === 'monthly' ? SUBTOOLBAR_VIEW_ACTIVE_CLASS : SUBTOOLBAR_VIEW_INACTIVE_CLASS
                                            }`}
                                        >
                                            <span>{t('planning_view_monthly')}</span>
                                        </button>
                                    </TooltipHint>
                                    <TooltipHint label={t('planning_view_weekly_hint')}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPlanningView('weekly');
                                                const monday = getWeekDaysMondayFirst(currentMonthAnchor)[0];
                                                monday.setHours(0, 0, 0, 0);
                                                setCurrentWeekStart(monday);
                                            }}
                                            className={`flex h-10 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-all ${
                                                planningView === 'weekly' ? SUBTOOLBAR_VIEW_ACTIVE_CLASS : SUBTOOLBAR_VIEW_INACTIVE_CLASS
                                            }`}
                                        >
                                            <span>{t('planning_view_weekly')}</span>
                                        </button>
                                    </TooltipHint>
                                    <div className="ml-auto flex min-w-0 flex-wrap items-center gap-2">
                                        {planningView === 'weekly' ? (
                                            <>
                                                <TooltipHint label={t('planning_go_current_week_hint')}>
                                                    <button type="button" onClick={goThisWeek} className={SUBTOOLBAR_TEXT_BUTTON_CLASS}>
                                                        {t('today')}
                                                    </button>
                                                </TooltipHint>
                                                <div className="flex items-center gap-0.5 sm:gap-1">
                                                    <TooltipHint label={t('planning_week_nav_prev')}>
                                                        <button type="button" onClick={goPrevWeek} className={SUBTOOLBAR_ICON_BUTTON_CLASS} aria-label={t('planning_week_nav_prev')}>
                                                            <ChevronLeftIcon className="h-5 w-5" />
                                                        </button>
                                                    </TooltipHint>
                                                    <p className="flex h-10 min-w-[10rem] max-w-[16rem] items-center justify-center px-1 text-center text-sm font-bold tabular-nums text-gray-900 dark:text-white sm:text-base">
                                                        {weekLabel}
                                                    </p>
                                                    <TooltipHint label={t('planning_week_nav_next')}>
                                                        <button type="button" onClick={goNextWeek} className={SUBTOOLBAR_ICON_BUTTON_CLASS} aria-label={t('planning_week_nav_next')}>
                                                            <ChevronRightIcon className="h-5 w-5" />
                                                        </button>
                                                    </TooltipHint>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <TooltipHint label={t('planning_go_current_month_hint')}>
                                                    <button type="button" onClick={goThisMonth} className={SUBTOOLBAR_TEXT_BUTTON_CLASS}>
                                                        {t('today')}
                                                    </button>
                                                </TooltipHint>
                                                <div className="flex items-center gap-0.5 sm:gap-1">
                                                    <TooltipHint label={t('planning_month_nav_prev')}>
                                                        <button type="button" onClick={goPrevMonth} className={SUBTOOLBAR_ICON_BUTTON_CLASS} aria-label={t('planning_month_nav_prev')}>
                                                            <ChevronLeftIcon className="h-5 w-5" />
                                                        </button>
                                                    </TooltipHint>
                                                    <p className="flex h-10 min-w-[10rem] max-w-[16rem] items-center justify-center px-1 text-center text-sm font-bold tabular-nums text-gray-900 dark:text-white sm:text-base">
                                                        {getMonthName(currentMonthAnchor, language as Language)}
                                                    </p>
                                                    <TooltipHint label={t('planning_month_nav_next')}>
                                                        <button type="button" onClick={goNextMonth} className={SUBTOOLBAR_ICON_BUTTON_CLASS} aria-label={t('planning_month_nav_next')}>
                                                            <ChevronRightIcon className="h-5 w-5" />
                                                        </button>
                                                    </TooltipHint>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Mapa editorial: Cliente | SEG | TER | QUA | QUI | SEX | SAB | DOM */}
                            {planningView === 'weekly' && (
                            <div className="overflow-x-auto">
                                <div className="min-w-[700px] space-y-4">
                                    {/* Header das datas - dois blocos independentes */}
                                    <div className="flex min-w-0">
                                        <div className="w-[220px] shrink-0 flex flex-col justify-end">
                                            <div className="py-2 px-4 rounded-xl bg-indigo-50 dark:bg-slate-600/60 border border-slate-200 dark:border-slate-500 shadow-sm flex items-center justify-center min-h-[40px] mr-3 max-w-[208px]">
                                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">{t('clients')}</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0 grid grid-cols-7 gap-px bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl overflow-hidden">
                                        {weekDays.map((d, i) => (
                                            <div key={i} className="flex flex-col items-center justify-center px-2 py-3.5 text-center">
                                                <div className="text-[10px] font-medium uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                                    {t(`day_${DAY_KEYS[(d.getDay() + 6) % 7]}`)}
                                                </div>
                                                <div
                                                    className={`mt-0.5 flex justify-center ${
                                                        isToday(d)
                                                            ? PLANNING_TODAY_DAY_MARKER_CLASS
                                                            : 'text-2xl font-extrabold text-indigo-900 dark:text-indigo-100'
                                                    }`}
                                                >
                                                    {d.getDate()}
                                                </div>
                                            </div>
                                        ))}
                                        </div>
                                    </div>

                                    {/* Linhas por cliente - cards clicáveis */}
                                    {filteredClients.map((client, rowIdx) => {
                                        const expectedPerWeek = getExpectedForWeek(client, weekDays);
                                        const clientItems = planningItems.filter((p) => p.clientId === client.id && (p.publishDate ?? p.date) >= startDate && (p.publishDate ?? p.date) <= endDate);
                                        const plannedCount = clientItems.length;
                                        const gap = expectedPerWeek != null && plannedCount < expectedPerWeek;
                                        const statusIndicator = gap ? 'bg-amber-400' : 'bg-emerald-500';
                                        const isAlt = rowIdx % 2 === 1;
                                        const isActive = clientFilter === client.id;

                                        return (
                                            <div
                                                key={client.id}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => focusClient(client.id)}
                                                onKeyDown={(e) => e.key === 'Enter' && focusClient(client.id)}
                                                aria-label={
                                                    isActive
                                                        ? t('planning_row_filter_aria_show_all', { name: client.name })
                                                        : t('planning_row_filter_aria', { name: client.name })
                                                }
                                                className={`group grid grid-cols-[220px_repeat(7,1fr)] gap-px overflow-visible rounded-xl border shadow-sm transition-all cursor-pointer hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-700/50 ${isActive ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50/40 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700'} ${isAlt && !isActive ? 'bg-gray-50/50 dark:bg-gray-800/50' : ''} ${!isAlt && !isActive ? 'bg-white dark:bg-gray-800' : ''}`}
                                            >
                                                {/* Coluna cliente: nome + funil fixo à direita; texto da dica só no hover do ícone */}
                                                <div
                                                    className={`relative flex min-h-[80px] flex-col justify-center gap-1 overflow-visible rounded-l-xl px-4 py-3 ${isActive ? 'bg-indigo-50/40 dark:bg-indigo-900/20' : isAlt ? 'bg-gray-50/80 dark:bg-gray-800/80' : 'bg-white dark:bg-gray-800'} group-hover:bg-indigo-50/30 dark:group-hover:bg-indigo-900/10 transition-colors`}
                                                >
                                                    <div className="flex min-w-0 items-center gap-2">
                                                        <span className="min-w-0 flex-1 truncate text-base font-bold text-gray-900 dark:text-white">
                                                            {client.name}
                                                        </span>
                                                        <TooltipHint
                                                            label={
                                                                isActive
                                                                    ? t('planning_row_filter_hint_show_all')
                                                                    : t('planning_row_filter_hint')
                                                            }
                                                            className="shrink-0 text-indigo-500 dark:text-indigo-400"
                                                        >
                                                            <span className="rounded p-0.5" aria-hidden>
                                                                <FunnelIcon className="h-4 w-4 shrink-0" />
                                                            </span>
                                                        </TooltipHint>
                                                    </div>
                                                    {expectedPerWeek != null && (
                                                        <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                                                            {plannedCount}/{Math.ceil(expectedPerWeek)} {t('planning_planned_badge')}
                                                            <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${statusIndicator}`} aria-hidden />
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Slots por dia */}
                                                {weekDays.map((d, colIdx) => {
                                                    const dateStr = formatDateToYYYYMMDD(d);
                                                    const cellPosts = postsByClientAndDate.get(`${client.id}::${dateStr}`) || [];
                                                    const isForecast = cellPosts.length === 0 && isPreferredDay(client, d);
                                                    const isLastCol = colIdx === 6;

                                                    return (
                                                        <div
                                                            key={colIdx}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className={`min-h-[80px] p-2 flex flex-col gap-1 ${isActive ? 'bg-indigo-50/40 dark:bg-indigo-900/20' : isAlt ? 'bg-gray-50/50 dark:bg-gray-800/30' : 'bg-white dark:bg-gray-800'} ${isLastCol ? 'rounded-r-xl' : ''}`}
                                                        >
                                                            {cellPosts.length > 0 ? (
                                                                <div className="flex flex-col gap-1 flex-1">
                                                                    {cellPosts.map((item) => {
                                                                        if (isForecastTask(item)) {
                                                                            return (
                                                                                <TooltipHint key={item.id} label={t('planning_forecast_type')}>
                                                                                    <div className="text-xs px-2 py-1.5 rounded-r border-l-2 border-dashed border-slate-400 bg-slate-50/80 dark:bg-slate-800/50 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                                                                                        <div className="font-medium truncate text-[11px]">{t('planning_forecast')}</div>
                                                                                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{t('planning_forecast_date')}</div>
                                                                                    </div>
                                                                                </TooltipHint>
                                                                            );
                                                                        }
                                                                        const status = clientWorkflow?.statuses?.find((s) => s.id === item.statusId);
                                                                        const borderClass =
                                                                            status?.color?.border
                                                                                ? status.color.border
                                                                                : getPostStatusBorderClass(status);
                                                                        return (
                                                                            <TooltipHint
                                                                                key={item.id}
                                                                                label={`${item.title || '—'} – ${t(item.postType || '') || item.postType || ''}`}
                                                                            >
                                                                                <div
                                                                                    className={`text-xs px-2 py-1.5 rounded-r border-l-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 ${borderClass} text-gray-900 dark:text-gray-100`}
                                                                                >
                                                                                    <div className="font-medium truncate text-[11px]">{item.title || '—'}</div>
                                                                                    <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{t(item.postType || '') || item.postType || ''}</div>
                                                                                </div>
                                                                            </TooltipHint>
                                                                        );
                                                                    })}
                                                                    {canEditPlanning && (
                                                                    <TooltipHint label={t('planning_add_post_slot')}>
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => { e.stopPropagation(); openCreate(client.id, client.name, dateStr); }}
                                                                            aria-label={t('planning_add_post_slot')}
                                                                            className="mt-0.5 flex items-center justify-center py-1 rounded border border-dashed border-gray-200 dark:border-gray-600 hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors"
                                                                        >
                                                                            <PlusIcon className="w-3 h-3 text-gray-400" />
                                                                        </button>
                                                                    </TooltipHint>
                                                                    )}
                                                                </div>
                                                            ) : isForecast ? (
                                                                /* 2. Previsão de post - slot vazio em dia preferencial (intenção editorial) */
                                                                canEditPlanning ? (
                                                                <TooltipHint label={t('planning_add_post_slot')}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => openCreate(client.id, client.name, dateStr)}
                                                                        aria-label={t('planning_add_post_slot')}
                                                                        className="flex-1 min-h-[56px] rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100/70 dark:hover:bg-slate-700/40 transition-colors cursor-pointer flex flex-col items-center justify-center gap-1"
                                                                    >
                                                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400">
                                                                            {t('planning_forecast')}
                                                                        </span>
                                                                        <span className="text-[9px] text-slate-500 dark:text-slate-500">{t('planning_day_suggested')}</span>
                                                                    </button>
                                                                </TooltipHint>
                                                                ) : (
                                                                <div className="flex-1 min-h-[56px] rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col items-center justify-center gap-1 opacity-70">
                                                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400">{t('planning_forecast')}</span>
                                                                    <span className="text-[9px] text-slate-500 dark:text-slate-500">{t('planning_day_suggested')}</span>
                                                                </div>
                                                                )
                                                            ) : (
                                                                /* 3. Slot vazio */
                                                                canEditPlanning ? (
                                                                <TooltipHint label={t('planning_add_post_slot')}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => openCreate(client.id, client.name, dateStr)}
                                                                        aria-label={t('planning_add_post_slot')}
                                                                        className="flex-1 min-h-[56px] rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/30 flex flex-col items-center justify-center transition-colors cursor-pointer"
                                                                    >
                                                                        <PlusIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                                                    </button>
                                                                </TooltipHint>
                                                                ) : (
                                                                <div className="flex-1 min-h-[56px] rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-600 flex flex-col items-center justify-center opacity-60">
                                                                    <PlusIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                                                </div>
                                                                )
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            )}

                            {planningView === 'monthly' && (
                                <div className="rounded-xl border border-gray-200 bg-white px-5 py-5 shadow-sm dark:border-gray-700 dark:bg-gray-900/40 sm:px-6 sm:py-6">
                                    <h3 className="mb-2 text-xl font-bold tracking-tight text-gray-800 dark:text-gray-100">{t('planning_month_heatmap_intro')}</h3>
                                    <div className="mb-3 flex flex-wrap items-center gap-3 text-[10px] text-gray-500 dark:text-gray-400">
                                        <span className="inline-flex items-center gap-1">
                                            <span className="inline-block h-2 w-2 rounded-full bg-indigo-600" aria-hidden />
                                            {t('planning_month_cell_legend_posts')}
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                            <span className="inline-block h-2 w-2 rounded-full border border-dashed border-slate-400 bg-slate-100 dark:border-slate-500 dark:bg-slate-700" aria-hidden />
                                            {t('planning_month_cell_legend_forecasts')}
                                        </span>
                                    </div>
                                    <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                        {(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const).map((k) => (
                                            <div key={k}>{t(`day_${k}`)}</div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-7 gap-1.5">
                                        {getMonthDays(currentMonthAnchor).map(({ date, isCurrentMonth }, idx) => {
                                            const ds = formatDateToYYYYMMDD(date);
                                            const dayItems = planningMonthItemsByDay.get(ds) || [];
                                            const dayStats = planningMonthDayStats.get(ds);
                                            const planned = dayStats?.planned ?? 0;
                                            const forecast = dayStats?.forecast ?? 0;
                                            const hasItems = planned > 0 || forecast > 0;
                                            const isTodayCell = isCurrentMonth && isToday(date);
                                            const postsTooltip = buildMonthDayIndicatorTooltip(
                                                dayItems,
                                                'posts',
                                                clientFilter,
                                                clientNameById,
                                                t,
                                            );
                                            const forecastsTooltip = buildMonthDayIndicatorTooltip(
                                                dayItems,
                                                'forecasts',
                                                clientFilter,
                                                clientNameById,
                                                t,
                                            );
                                            return (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => {
                                                        if (isCurrentMonth && hasItems) {
                                                            setMonthlyDayDetail({ date, items: planningMonthItemsByDay.get(ds) || [] });
                                                            return;
                                                        }
                                                        openWeekContainingDay(date);
                                                    }}
                                                    className={`flex min-h-[4.25rem] flex-col items-center justify-center rounded-lg border p-1 text-center transition-colors ${
                                                        isCurrentMonth
                                                            ? 'border-gray-200 bg-gray-50/90 hover:border-indigo-300 dark:border-gray-600 dark:bg-gray-800/60 dark:hover:border-indigo-500'
                                                            : 'border-transparent bg-gray-50/20 text-gray-400 dark:bg-gray-900/20'
                                                    }`}
                                                >
                                                    <span
                                                        className={`${
                                                            isTodayCell
                                                                ? PLANNING_TODAY_DAY_MARKER_CLASS
                                                                : `text-sm font-semibold ${isCurrentMonth ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`
                                                        }`}
                                                    >
                                                        {date.getDate()}
                                                    </span>
                                                    {isCurrentMonth && hasItems ? (
                                                        <div className="mt-0.5 flex flex-wrap items-center justify-center gap-1">
                                                            {planned > 0 ? (
                                                                <TooltipHint label={postsTooltip}>
                                                                    <span className="inline-flex items-center gap-0.5 rounded bg-indigo-100 px-1 py-px text-[9px] font-bold leading-none text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200">
                                                                        <span className="h-1 w-1 rounded-full bg-indigo-600" aria-hidden />
                                                                        {planned}
                                                                    </span>
                                                                </TooltipHint>
                                                            ) : null}
                                                            {forecast > 0 ? (
                                                                <TooltipHint label={forecastsTooltip}>
                                                                    <span className="inline-flex items-center gap-0.5 rounded border border-dashed border-slate-300 bg-slate-100/90 px-1 py-px text-[9px] font-bold leading-none text-slate-600 dark:border-slate-500 dark:bg-slate-800/80 dark:text-slate-300">
                                                                        <span className="h-1 w-1 rounded-full border border-slate-400" aria-hidden />
                                                                        {forecast}
                                                                    </span>
                                                                </TooltipHint>
                                                            ) : null}
                                                        </div>
                                                    ) : null}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="mt-4 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{t('planning_month_heatmap_footer')}</p>
                                </div>
                            )}
                            {planningView === 'monthly' && monthlyDayDetail && (
                                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/35 p-4" onClick={() => setMonthlyDayDetail(null)}>
                                    <div
                                        className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-900"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="mb-3 flex items-center justify-between">
                                            <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                                                {t('planning_month_detail_title', { date: `${monthlyDayDetail.date.getDate()}/${monthlyDayDetail.date.getMonth() + 1}` })}
                                            </h4>
                                            <button type="button" onClick={() => setMonthlyDayDetail(null)} className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">x</button>
                                        </div>
                                        <div className="max-h-[min(60vh,28rem)] space-y-4 overflow-y-auto pr-1">
                                            {groupPlanningDayItemsByClient(
                                                monthlyDayDetail.items,
                                                clientNameById,
                                                t('planning_client_unknown'),
                                            ).map((group) => (
                                                <section key={group.clientId}>
                                                    <h5 className="mb-2 border-b border-gray-200 pb-1 text-sm font-semibold text-gray-900 dark:border-gray-700 dark:text-white">
                                                        {group.clientName}
                                                    </h5>
                                                    <div className="space-y-2">
                                                        {group.items.map((item) => {
                                                            const isForecast = isForecastTask(item);
                                                            const status = clientWorkflow?.statuses?.find((s) => s.id === item.statusId);
                                                            const postTypeLabel = item.postType ? t(item.postType) || item.postType : '';
                                                            const statusLabel = status ? t(status.nameKey) : '';
                                                            const secondary = isForecast
                                                                ? t('planning_forecast')
                                                                : [postTypeLabel, statusLabel].filter(Boolean).join(' · ');
                                                            const title =
                                                                item.title ||
                                                                (isForecast ? t('planning_forecast_type') : t('planning_draft_default_title'));

                                                            return (
                                                                <div
                                                                    key={item.id}
                                                                    className={`rounded-lg border bg-gray-50/80 p-2.5 dark:bg-gray-800/60 ${
                                                                        isForecast
                                                                            ? 'border-dashed border-slate-300 dark:border-slate-600'
                                                                            : 'border-gray-200 dark:border-gray-700'
                                                                    }`}
                                                                >
                                                                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{title}</div>
                                                                    {secondary ? (
                                                                        <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{secondary}</div>
                                                                    ) : null}
                                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                                        {isForecast ? (
                                                                            <>
                                                                                <TooltipHint label={t('planning_month_convert_here_hint')}>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => openEditInPlanning(item)}
                                                                                        className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                                                                                    >
                                                                                        {t('planning_month_convert_here')}
                                                                                    </button>
                                                                                </TooltipHint>
                                                                                <TooltipHint label={t('planning_month_edit_planning_hint')}>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => openEditInPlanning(item)}
                                                                                        className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                                                                                    >
                                                                                        {t('planning_month_edit_planning')}
                                                                                    </button>
                                                                                </TooltipHint>
                                                                                <TooltipHint
                                                                                    label={
                                                                                        !canViewPosts
                                                                                            ? t('planning_month_no_posts_permission')
                                                                                            : t('planning_month_open_in_posts_hint')
                                                                                    }
                                                                                >
                                                                                    <button
                                                                                        type="button"
                                                                                        disabled={!canViewPosts}
                                                                                        onClick={() => openTaskInPostsPage(item.id)}
                                                                                        className={`rounded-md border px-2.5 py-1 text-xs font-medium ${canViewPosts ? 'border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-900/30' : 'cursor-not-allowed border-gray-200 text-gray-400 dark:border-gray-700 dark:text-gray-500'}`}
                                                                                    >
                                                                                        {t('planning_month_open_in_posts')}
                                                                                    </button>
                                                                                </TooltipHint>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <TooltipHint label={t('planning_month_edit_here_hint')}>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => openEditInPlanning(item)}
                                                                                        className="rounded-md border border-indigo-200 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-900/30"
                                                                                    >
                                                                                        {t('planning_month_edit_here')}
                                                                                    </button>
                                                                                </TooltipHint>
                                                                                <TooltipHint
                                                                                    label={
                                                                                        !canViewPosts
                                                                                            ? t('planning_month_no_posts_permission')
                                                                                            : t('planning_month_open_in_posts_hint')
                                                                                    }
                                                                                >
                                                                                    <button
                                                                                        type="button"
                                                                                        disabled={!canViewPosts}
                                                                                        onClick={() => openTaskInPostsPage(item.id)}
                                                                                        className={`rounded-md border px-2.5 py-1 text-xs font-medium ${canViewPosts ? 'border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700' : 'cursor-not-allowed border-gray-200 text-gray-400 dark:border-gray-700 dark:text-gray-500'}`}
                                                                                    >
                                                                                        {t('planning_month_open_in_posts')}
                                                                                    </button>
                                                                                </TooltipHint>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </section>
                                            ))}
                                        </div>
                                        <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700">
                                                <div className="flex flex-wrap gap-2">
                                                    <TooltipHint
                                                        label={!canViewPosts ? t('planning_month_no_posts_permission') : t('planning_month_go_posts_hint')}
                                                    >
                                                        <button
                                                            type="button"
                                                            disabled={!canViewPosts}
                                                            onClick={() => {
                                                                setMonthlyDayDetail(null);
                                                                if (canViewPosts) setPage('producao');
                                                            }}
                                                            className={`rounded-md border px-3 py-1.5 text-xs font-medium ${canViewPosts ? 'border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700' : 'cursor-not-allowed border-gray-200 text-gray-400 dark:border-gray-700 dark:text-gray-500'}`}
                                                        >
                                                            {t('planning_month_go_posts')}
                                                        </button>
                                                    </TooltipHint>
                                                    <TooltipHint label={t('planning_month_open_week_hint')}>
                                                        <button
                                                            type="button"
                                                            onClick={() => openWeekContainingDay(monthlyDayDetail.date)}
                                                            className="rounded-md border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-900/30"
                                                        >
                                                            {t('planning_month_open_week')}
                                                        </button>
                                                    </TooltipHint>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>

            {createModal && (
                <PostOrForecastModal
                    isOpen={!!createModal}
                    onClose={closeCreate}
                    onSave={handleSaveFromModal}
                    task={modalTask}
                    context={context}
                    clientsForSelect={clients.map((c) => ({ id: c.id, name: c.name }))}
                    onQuickCreateClient={() => setPage('clients')}
                    initialNature={modalTask ? (modalTask.category === 'forecast' ? 'forecast' : 'post') : 'forecast'}
                    initialDate={createModal.date}
                    initialClientId={createModal.clientId}
                    initialClientName={createModal.clientName}
                    onValidateForecast={onValidateForecast}
                    persistenceOrigin="planejamento"
                    readOnly={!canEditPlanning}
                />
            )}
        </div>
    );
};

export default PlanningPage;
