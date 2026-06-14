import React, { useMemo } from 'react';
import type { Client, Task } from '../../../types';
import { getTaskDisplayDate, buildPostFrequency } from '../../../lib/utils';
import { CalendarIcon, ClipboardListIcon, ClockIcon, CheckCircleIcon, DollarSignIcon, AlertTriangleIcon } from '../../icons';
import TooltipHint from '../../TooltipHint';
import { BriefingGlobalProgress } from '../briefing/BriefingGlobalProgress';
import { getBriefingGlobalProgress } from '../../../lib/clientBriefingProgress';
import { resolveClientBriefing } from '../../../lib/briefingV2/migrate';

const DAY_I18N: Record<string, string> = {
    mon: 'day_mon', tue: 'day_tue', wed: 'day_wed', thu: 'day_thu',
    fri: 'day_fri', sat: 'day_sat', sun: 'day_sun',
};

function getCalendarDayState(
    task: Task,
    today: string,
    doneStatusIds: Set<string>,
    approvalStatusIds: Set<string>,
    publishedStatusIds: Set<string>
): 'verde' | 'amarelo' | 'cinza' | 'vermelho' {
    const dateStr = getTaskDisplayDate(task);
    if (!dateStr) return 'cinza';
    const isDone = doneStatusIds.has(task.statusId);
    const isApproval = approvalStatusIds.has(task.statusId);
    const isPublished = publishedStatusIds.has(task.statusId);
    const isOverdue = dateStr < today && !isDone;

    if (isOverdue) return 'vermelho';
    if (isPublished || isDone) return 'verde';
    if (isApproval) return 'amarelo';
    return 'cinza';
}

export type OverviewSectionProps = {
    editedClient: Client;
    quickOverview: {
        postsAtivos: number;
        aguardandoAprovacao: number;
        tarefasPendentes: number;
        proximaRenovacao: string | null;
        statusConta?: 'em_dia' | 'atencao' | 'atrasado';
        tarefasAtrasadas?: number;
        postsAtrasados?: number;
    };
    clientTasks: Task[];
    workflows: Record<string, { statuses?: Array<{ id: string; category?: string }> }>;
    clientWorkflowId: string;
    generalWorkflowId: string;
    t: (k: string) => string;
    language: string;
};

export const OverviewSection: React.FC<OverviewSectionProps> = ({
    editedClient,
    quickOverview,
    clientTasks,
    workflows,
    clientWorkflowId,
    generalWorkflowId,
    t,
    language,
}) => {
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const firstDayOfWeek = monthStart.getDay();
    const daysInMonth = monthEnd.getDate();

    const wf = workflows?.[clientWorkflowId]?.statuses ?? [];
    const generalWf = workflows?.[generalWorkflowId]?.statuses ?? [];
    const doneIds = new Set<string>([
        ...wf.filter((s) => s.category === 'done').map((s) => s.id),
        ...generalWf.filter((s) => s.category === 'done').map((s) => s.id),
    ]);
    const approvalIds = new Set<string>(wf.filter((s) => /aprovacao|aprovado/i.test(s.id)).map((s) => s.id));
    const publishedIds = new Set<string>(wf.filter((s) => /publicado|agendado/i.test(s.id)).map((s) => s.id));

    const briefingGlobal = useMemo(() => getBriefingGlobalProgress(editedClient), [editedClient]);
    const briefing = useMemo(() => resolveClientBriefing(editedClient), [editedClient]);
    const pillarTags = (briefing.content.pillarsTags ?? []).filter((p) => p.trim());
    const monthFocus = briefing.content.monthFocus?.trim() || '';

    const planningFreqLabel = useMemo(() => {
        const freq = briefing.planning.frequency;
        if (freq.variable) return t('planning_frequency_variable');
        if (freq.quantity && freq.period) return buildPostFrequency(freq.quantity, freq.period);
        return '';
    }, [briefing, t]);

    const preferredDays = (briefing.planning.preferredPostDays ?? []).slice().sort();

    const postsThisMonth = useMemo(() => {
        const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
        return clientTasks.filter((ta) => {
            if (!ta.clientId) return false;
            const d = getTaskDisplayDate(ta);
            return d >= start && d <= end;
        }).length;
    }, [clientTasks, year, month, daysInMonth]);

    const calendarData = useMemo(() => {
        const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
        const byDate = new Map<string, 'verde' | 'amarelo' | 'cinza' | 'vermelho'>();
        clientTasks.forEach((ta) => {
            const d = getTaskDisplayDate(ta);
            if (!d || d < start || d > end) return;
            const state = getCalendarDayState(ta, today, doneIds, approvalIds, publishedIds);
            const current = byDate.get(d);
            if (!current || state === 'vermelho') byDate.set(d, state);
            else if (state === 'amarelo' && current !== 'vermelho') byDate.set(d, state);
            else if (state === 'verde' && current !== 'vermelho' && current !== 'amarelo') byDate.set(d, state);
            else if (state === 'cinza' && !current) byDate.set(d, state);
        });
        return byDate;
    }, [clientTasks, year, month, daysInMonth, today, doneIds, approvalIds, publishedIds]);

    const nextActions = useMemo(() => {
        const actions: { id: string; title: string; type: 'overdue' | 'approval'; date?: string }[] = [];
        clientTasks.forEach((ta) => {
            const d = getTaskDisplayDate(ta);
            if (!d) return;
            if (d < today && !doneIds.has(ta.statusId)) {
                actions.push({ id: ta.id, title: ta.title || '-', type: 'overdue', date: d });
            } else if (approvalIds.has(ta.statusId)) {
                actions.push({ id: ta.id, title: ta.title || '-', type: 'approval', date: d });
            }
        });
        return actions.slice(0, 8);
    }, [clientTasks, today, doneIds, approvalIds]);

    const healthScore = useMemo(() => {
        let score = 0;
        const max = 4;
        if (briefingGlobal.percent >= 50) score += 1;
        const hasPlanning = briefingGlobal.blocks.planning.filled > 0;
        if (hasPlanning) score += 1;
        const tasksOnTrack = (quickOverview.tarefasAtrasadas ?? 0) === 0 && (quickOverview.postsAtrasados ?? 0) === 0;
        if (tasksOnTrack) score += 1;
        if (postsThisMonth > 0 || quickOverview.postsAtivos > 0) score += 1;
        return Math.round((score / max) * 100);
    }, [briefingGlobal, quickOverview.tarefasAtrasadas, quickOverview.postsAtrasados, quickOverview.postsAtivos, postsThisMonth]);

    const statusConta = quickOverview.statusConta ?? 'em_dia';

    const formatDate = (d: string) => new Date(d + 'T00:00').toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { day: '2-digit', month: 'short' });
    const formatRenovacao = (d: string) => {
        const diff = Math.ceil((new Date(d).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diff <= 0) return t('overview_renewal_overdue');
        if (diff <= 7) return t('overview_renewal_days').replace('{n}', String(diff));
        return formatDate(d);
    };

    const calendarDays: (number | null)[] = [];
    const padStart = (firstDayOfWeek + 6) % 7;
    for (let i = 0; i < padStart; i++) calendarDays.push(null);
    for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);
    const weekDayLabels = ['day_mon', 'day_tue', 'day_wed', 'day_thu', 'day_fri', 'day_sat', 'day_sun'];

    const cardClass = 'flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800';
    const iconWrap = 'p-2 rounded-lg shrink-0';

    return (
        <div className="space-y-6">
            {/* 4 cards principais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={cardClass}>
                    <div className={`${iconWrap} bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400`}>
                        <ClipboardListIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{postsThisMonth}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('overview_posts_month')}</p>
                        {quickOverview.postsAtivos > 0 && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{quickOverview.postsAtivos} {t('overview_in_progress')}</p>
                        )}
                    </div>
                </div>
                <div className={cardClass}>
                    <div className={`${iconWrap} bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400`}>
                        <ClockIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{quickOverview.aguardandoAprovacao}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('overview_awaiting_approval')}</p>
                    </div>
                </div>
                <div className={cardClass}>
                    <div className={`${iconWrap} bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400`}>
                        <CheckCircleIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{quickOverview.tarefasPendentes}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('overview_pending_tasks')}</p>
                        {(quickOverview.tarefasAtrasadas ?? 0) > 0 && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{quickOverview.tarefasAtrasadas} {t('overview_overdue')}</p>
                        )}
                    </div>
                </div>
                <div className={cardClass}>
                    <div className={`${iconWrap} bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400`}>
                        <DollarSignIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {quickOverview.proximaRenovacao ? formatRenovacao(quickOverview.proximaRenovacao) : '—'}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('overview_next_renewal')}</p>
                    </div>
                </div>
            </div>

            <BriefingGlobalProgress client={editedClient} t={t} showBlocks />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Saúde da conta */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('overview_health_title')}</h3>
                    <div className="flex items-center gap-4">
                        <div className="relative w-16 h-16 shrink-0">
                            <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                                <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    className="text-gray-200 dark:text-gray-600"
                                />
                                <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeDasharray={`${healthScore}, 100`}
                                    className="text-emerald-500 transition-all"
                                />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{healthScore}%</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('overview_health_hint')}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Planejamento resumo (V2) */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('overview_planning_title')}</h3>
                    <div className="space-y-2 text-sm">
                        {planningFreqLabel ? <p><span className="text-gray-500 dark:text-gray-400">{t('post_frequency')}:</span> {planningFreqLabel}</p> : null}
                        {preferredDays.length > 0 && (
                            <p>
                                <span className="text-gray-500 dark:text-gray-400">{t('preferred_post_days')}:</span>{' '}
                                {preferredDays.map((d) => t(DAY_I18N[d] ?? 'day_mon')).join(', ')}
                            </p>
                        )}
                        <p>
                            <span className="text-gray-500 dark:text-gray-400">{t('planning_approval_required')}</span>{' '}
                            {briefing.planning.operation.approvalRequired === true ? t('yes') : briefing.planning.operation.approvalRequired === false ? t('no') : '—'}
                        </p>
                        {!planningFreqLabel && preferredDays.length === 0 && briefing.planning.operation.approvalRequired === undefined && (
                            <p className="text-gray-500 dark:text-gray-400">{t('overview_planning_empty')}</p>
                        )}
                        {pillarTags.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                                {pillarTags.slice(0, 5).map((p) => (
                                    <span key={p} className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                                        {p}
                                    </span>
                                ))}
                            </div>
                        )}
                        {monthFocus && (
                            <TooltipHint label={monthFocus} className="block w-full min-w-0">
                                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                    <span className="font-medium text-gray-500">{t('briefing_month_focus')}:</span> {monthFocus}
                                </p>
                            </TooltipHint>
                        )}
                    </div>
                </div>

                {/* Mini calendário */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-gray-500" />
                        {t('overview_calendar_title')}
                    </h3>
                    <div className="grid grid-cols-7 gap-0.5 text-center">
                        {weekDayLabels.map((l) => (
                            <div key={l} className="text-[10px] font-medium text-gray-500 dark:text-gray-400 py-1">{t(l)}</div>
                        ))}
                        {calendarDays.map((d, i) => {
                            if (d === null) return <div key={`pad-${i}`} />;
                            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                            const state = calendarData.get(dateStr);
                            const isToday = dateStr === today;
                            const bg = state === 'vermelho' ? 'bg-red-500/80' : state === 'amarelo' ? 'bg-amber-400/80' : state === 'verde' ? 'bg-emerald-500/80' : state === 'cinza' ? 'bg-gray-400/60' : '';
                            return (
                                <div
                                    key={d}
                                    className={`min-w-[28px] h-7 rounded flex items-center justify-center text-xs font-medium ${isToday ? 'ring-2 ring-indigo-500 ring-inset' : ''} ${state ? `${bg} text-white` : 'text-gray-700 dark:text-gray-300'}`}
                                >
                                    {d}
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />{t('overview_calendar_published')}</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />{t('overview_calendar_approval')}</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400" />{t('overview_calendar_planned')}</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />{t('overview_calendar_overdue')}</span>
                    </div>
                </div>
            </div>

            {/* Próximas ações */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <AlertTriangleIcon className="w-4 h-4 text-amber-500" />
                    {t('overview_next_actions_title')}
                </h3>
                {nextActions.length > 0 ? (
                    <ul className="space-y-2">
                        {nextActions.map((a) => (
                            <li key={a.id} className="flex items-center justify-between gap-2 text-sm py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                                <span className="truncate">{a.title}</span>
                                <span className={`shrink-0 text-xs px-2 py-0.5 rounded ${a.type === 'overdue' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'}`}>
                                    {a.type === 'overdue' ? t('overview_overdue') : t('overview_awaiting_approval_short')}
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('overview_next_actions_empty')}</p>
                )}
            </div>
        </div>
    );
};
