import React, { useContext, useMemo } from 'react';
import { AppContext } from '../../../contexts/AppContext';
import type { AgencyOperationMode, Client } from '../../../types';
import { parsePostFrequencyStructured, buildPostFrequency } from '../../../lib/utils';
import { getEligibleAgencyOwners } from '../../../lib/agencyOperational';
import { UnsavedChangesBar } from '../UnsavedChangesBar';
import { ChevronDownIcon, ChevronRightIcon } from '../../icons';
import { ClientOwnerPreferencesPanel } from '../ClientOwnerPreferencesPanel';

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
type DayKey = (typeof DAY_ORDER)[number];

const DAY_I18N: Record<DayKey, string> = {
    mon: 'day_mon',
    tue: 'day_tue',
    wed: 'day_wed',
    thu: 'day_thu',
    fri: 'day_fri',
    sat: 'day_sat',
    sun: 'day_sun',
};

function sortDays(days: string[]): string[] {
    const set = new Set(days);
    return DAY_ORDER.filter((d) => set.has(d));
}

const BLOCK_ACCENTS = {
    frequency: 'border-l-indigo-500',
    performance: 'border-l-emerald-500',
    operation: 'border-l-amber-500',
} as const;

/** Deriva quantidade, período e variável a partir do cliente (com fallback de parsing). */
function getFrequencyState(c: Client): { quantity: number | ''; period: 'week' | 'month'; variable: boolean } {
    if (c.postFrequencyVariable) {
        return { quantity: '', period: 'week', variable: true };
    }
    if (c.postFrequencyQuantity != null && c.postFrequencyQuantity > 0 && (c.postFrequencyPeriod === 'week' || c.postFrequencyPeriod === 'month')) {
        return { quantity: c.postFrequencyQuantity, period: c.postFrequencyPeriod, variable: false };
    }
    const parsed = parsePostFrequencyStructured(c.postFrequency);
    if (parsed) return { quantity: parsed.quantity, period: parsed.period, variable: false };
    return { quantity: '', period: 'week', variable: false };
}

const FrequencyGuidedFields: React.FC<{ editedClient: Client; onUpdate: (u: Partial<Client>) => void; t: (k: string) => string }> = ({ editedClient, onUpdate, t }) => {
    const { quantity, period, variable } = useMemo(() => getFrequencyState(editedClient), [editedClient.postFrequency, editedClient.postFrequencyQuantity, editedClient.postFrequencyPeriod, editedClient.postFrequencyVariable]);

    const handleQuantityChange = (v: number | '') => {
        if (variable) return;
        if (v === '') {
            onUpdate({ postFrequency: '', postFrequencyQuantity: undefined, postFrequencyPeriod: period, postFrequencyVariable: false });
            return;
        }
        const q = Math.min(99, Math.max(1, v));
        onUpdate({
            postFrequency: buildPostFrequency(q, period),
            postFrequencyQuantity: q,
            postFrequencyPeriod: period,
            postFrequencyVariable: false,
        });
    };

    const handlePeriodChange = (p: 'week' | 'month') => {
        if (variable) return;
        const q = quantity === '' ? 1 : (typeof quantity === 'number' ? quantity : 1);
        onUpdate({
            postFrequency: buildPostFrequency(q, p),
            postFrequencyQuantity: q,
            postFrequencyPeriod: p,
            postFrequencyVariable: false,
        });
    };

    const handleVariableChange = (checked: boolean) => {
        if (checked) {
            onUpdate({ postFrequency: '', postFrequencyQuantity: undefined, postFrequencyPeriod: undefined, postFrequencyVariable: true });
        } else {
            onUpdate({ postFrequencyVariable: false });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-4 items-start">
                <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{t('planning_frequency_quantity')}</label>
                    <input
                        type="number"
                        min={1}
                        max={99}
                        value={quantity === '' ? '' : quantity}
                        onChange={(e) => handleQuantityChange(e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0)}
                        disabled={variable}
                        className="w-28 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{t('planning_frequency_period')}</label>
                    <select
                        value={period}
                        onChange={(e) => handlePeriodChange(e.target.value as 'week' | 'month')}
                        disabled={variable}
                        className="w-44 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <option value="week">{t('planning_frequency_per_week')}</option>
                        <option value="month">{t('planning_frequency_per_month')}</option>
                    </select>
                </div>
            </div>
            <div>
                <label className="flex items-start gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={variable}
                        onChange={(e) => handleVariableChange(e.target.checked)}
                        className="mt-1 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{t('planning_frequency_variable')}</span>
                </label>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 ml-6">{t('planning_frequency_variable_hint')}</p>
            </div>
        </div>
    );
};

const SectionBlock: React.FC<{ title: string; description: string; accent: keyof typeof BLOCK_ACCENTS; expanded: boolean; onToggle: () => void; children: React.ReactNode }> = ({ title, description, accent, expanded, onToggle, children }) => (
    <section className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden border-l-4 ${BLOCK_ACCENTS[accent]}`}>
        <button type="button" onClick={onToggle} className="w-full flex items-center gap-3 px-5 py-4 text-left border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            {expanded ? <ChevronDownIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" /> : <ChevronRightIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />}
            <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
            </div>
        </button>
        {expanded && <div className="p-5 space-y-4">{children}</div>}
    </section>
);

const SimpleInput: React.FC<{
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    label?: string;
    rows?: number;
}> = ({ value, onChange, placeholder, label, rows = 2 }) => (
    <div>
        {label && <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{label}</label>}
        <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        />
    </div>
);

export type PlanningSectionEditorProps = {
    editedClient: Client;
    handlers: {
        onUpdate: (u: Partial<Client>) => void;
        onCancel: () => void;
        onSave: () => void;
        requestConfirmation: (cb: () => void) => void;
    };
    isDirty: boolean;
    saveBarMessage: { text: string; type: 'success' | 'error' } | null;
    onFeedbackDismiss: () => void;
    t: (k: string) => string;
    /** Estado de expansão dos blocos principais (controlado pelo pai). */
    expandedSections: Record<string, boolean>;
    /** Callback para atualizar o estado de expansão. */
    onExpandedSectionsChange: (next: Record<string, boolean>) => void;
    embeddedSaveBar?: boolean;
};

export const PlanningSectionEditor: React.FC<PlanningSectionEditorProps> = ({
    editedClient,
    handlers: { onUpdate, onCancel, onSave, requestConfirmation },
    isDirty,
    saveBarMessage,
    onFeedbackDismiss,
    t,
    expandedSections,
    onExpandedSectionsChange,
    embeddedSaveBar = true,
}) => {
    const appCtx = useContext(AppContext);
    const operationMode: AgencyOperationMode = appCtx?.agencyProfile.operationMode ?? 'solo';
    const teamMembers = appCtx?.agencyProfile?.teamMembers ?? [];

    const taskEligibleOwners = useMemo(() => {
        const base = getEligibleAgencyOwners(teamMembers, 'task');
        return base.filter((e) => {
            const u = teamMembers.find((m) => m.id === e.id);
            return u != null && (u.inviteStatus ?? 'active') === 'active';
        });
    }, [teamMembers]);

    const preferredDays = sortDays(editedClient.preferredPostDays ?? []);
    const toggleSection = (key: string) => onExpandedSectionsChange({ ...expandedSections, [key]: !expandedSections[key] });
    const toggleDay = (day: DayKey) => {
        const set = new Set(preferredDays);
        if (set.has(day)) set.delete(day);
        else set.add(day);
        onUpdate({ preferredPostDays: sortDays(Array.from(set)) });
    };

    return (
        <div className="space-y-6">
            {embeddedSaveBar && (isDirty || saveBarMessage) && (
                <div className="flex justify-end -mt-2">
                    <UnsavedChangesBar
                        onCancel={onCancel}
                        onSave={onSave}
                        requestConfirmation={requestConfirmation}
                        feedback={saveBarMessage ?? undefined}
                        onFeedbackDismiss={onFeedbackDismiss}
                    />
                </div>
            )}

            <div className="space-y-6">
                <SectionBlock title={t('planning_block_frequency')} description={t('planning_block_frequency_desc')} accent="frequency" expanded={!!expandedSections.main_frequency} onToggle={() => toggleSection('main_frequency')}>
                    <FrequencyGuidedFields editedClient={editedClient} onUpdate={onUpdate} t={t} />
                    <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{t('preferred_post_days')}</label>
                        <div className="flex flex-wrap gap-2">
                            {DAY_ORDER.map((day) => (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => toggleDay(day)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                        preferredDays.includes(day)
                                            ? 'bg-indigo-600 text-white border-indigo-600'
                                            : 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-indigo-400'
                                    }`}
                                >
                                    {t(DAY_I18N[day])}
                                </button>
                            ))}
                        </div>
                    </div>
                    <SimpleInput
                        label={t('planning_calendar_notes_label')}
                        value={editedClient.planningCalendarNotes || ''}
                        onChange={(v) => onUpdate({ planningCalendarNotes: v })}
                        placeholder={t('planning_calendar_notes_placeholder')}
                        rows={2}
                    />
                    {operationMode !== 'solo' && (
                        <div className="border-t border-gray-200 pt-5 dark:border-gray-700">
                            <ClientOwnerPreferencesPanel editedClient={editedClient} onUpdate={onUpdate} />
                        </div>
                    )}
                </SectionBlock>

                <SectionBlock title={t('planning_block_performance')} description={t('planning_block_performance_desc')} accent="performance" expanded={!!expandedSections.main_performance} onToggle={() => toggleSection('main_performance')}>
                    <SimpleInput
                        label={t('planning_kpis_label')}
                        value={editedClient.kpis || ''}
                        onChange={(v) => onUpdate({ kpis: v })}
                        placeholder={t('planning_kpis_placeholder')}
                        rows={2}
                    />
                    <SimpleInput
                        label={t('planning_period_focus_label')}
                        value={editedClient.planningPeriodFocus || ''}
                        onChange={(v) => onUpdate({ planningPeriodFocus: v })}
                        placeholder={t('planning_period_focus_placeholder')}
                        rows={2}
                    />
                    <SimpleInput
                        label={t('planning_performance_notes_label')}
                        value={editedClient.planningPerformanceNotes || ''}
                        onChange={(v) => onUpdate({ planningPerformanceNotes: v })}
                        placeholder={t('planning_performance_notes_placeholder')}
                        rows={2}
                    />
                </SectionBlock>

                <SectionBlock title={t('planning_block_operation')} description={t('planning_block_operation_desc')} accent="operation" expanded={!!expandedSections.main_operation} onToggle={() => toggleSection('main_operation')}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{t('planning_lead_production')}</label>
                            <input
                                type="number"
                                min={0}
                                step={1}
                                value={editedClient.planningProductionLeadDays === undefined || editedClient.planningProductionLeadDays === '' ? '' : editedClient.planningProductionLeadDays}
                                onChange={(e) => onUpdate({ planningProductionLeadDays: e.target.value === '' ? '' : String(Math.max(0, parseInt(e.target.value, 10) || 0)) })}
                                placeholder={t('planning_lead_days_placeholder')}
                                className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{t('planning_lead_approval')}</label>
                            <input
                                type="number"
                                min={0}
                                step={1}
                                value={editedClient.planningApprovalLeadDays === undefined || editedClient.planningApprovalLeadDays === '' ? '' : editedClient.planningApprovalLeadDays}
                                onChange={(e) => onUpdate({ planningApprovalLeadDays: e.target.value === '' ? '' : String(Math.max(0, parseInt(e.target.value, 10) || 0)) })}
                                placeholder={t('planning_lead_days_placeholder')}
                                className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{t('planning_lead_scheduling')}</label>
                            <input
                                type="number"
                                min={0}
                                step={1}
                                value={editedClient.planningSchedulingLeadDays === undefined || editedClient.planningSchedulingLeadDays === '' ? '' : editedClient.planningSchedulingLeadDays}
                                onChange={(e) => onUpdate({ planningSchedulingLeadDays: e.target.value === '' ? '' : String(Math.max(0, parseInt(e.target.value, 10) || 0)) })}
                                placeholder={t('planning_lead_days_placeholder')}
                                className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{t('planning_approval_required')}</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => onUpdate({ planningApprovalRequired: true })}
                                className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                                    editedClient.planningApprovalRequired === true
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                                }`}
                            >
                                {t('yes')}
                            </button>
                            <button
                                type="button"
                                onClick={() => onUpdate({ planningApprovalRequired: false })}
                                className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                                    editedClient.planningApprovalRequired === false
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                                }`}
                            >
                                {t('no')}
                            </button>
                        </div>
                    </div>
                    {operationMode === 'solo' ? null : (
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                                {t('planning_account_owner_label')}
                            </label>
                            {(() => {
                                const raw = (editedClient.planningAccountOwner || '').trim();
                                const eligibleIds = new Set(taskEligibleOwners.map((e) => e.id));
                                const valueForSelect =
                                    !raw ? '' : eligibleIds.has(raw) ? raw : `__legacy__:${raw}`;
                                return (
                                    <select
                                        value={valueForSelect}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            if (!v) {
                                                onUpdate({ planningAccountOwner: '' });
                                                return;
                                            }
                                            if (v.startsWith('__legacy__:')) {
                                                onUpdate({ planningAccountOwner: v.slice('__legacy__:'.length) });
                                                return;
                                            }
                                            onUpdate({ planningAccountOwner: v });
                                        }}
                                        className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="">{t('planning_account_owner_select_placeholder')}</option>
                                        {taskEligibleOwners.map((e) => (
                                            <option key={e.id} value={e.id}>
                                                {e.name}
                                            </option>
                                        ))}
                                        {raw && !eligibleIds.has(raw) ? (
                                            <option value={`__legacy__:${raw}`}>
                                                {t('planning_account_owner_legacy_option', { text: raw })}
                                            </option>
                                        ) : null}
                                    </select>
                                );
                            })()}
                        </div>
                    )}
                    <SimpleInput
                        label={t('planning_approval_channel_label')}
                        value={editedClient.planningApprovalChannel || ''}
                        onChange={(v) => onUpdate({ planningApprovalChannel: v })}
                        placeholder={t('planning_approval_channel_placeholder')}
                        rows={1}
                    />
                    <SimpleInput
                        label={t('planning_client_response_label')}
                        value={editedClient.planningClientResponseTime || ''}
                        onChange={(v) => onUpdate({ planningClientResponseTime: v })}
                        placeholder={t('planning_client_response_placeholder')}
                        rows={1}
                    />
                    <SimpleInput
                        label={t('planning_operation_notes_label')}
                        value={editedClient.planningOperationNotes || ''}
                        onChange={(v) => onUpdate({ planningOperationNotes: v })}
                        placeholder={t('planning_operation_notes_placeholder')}
                        rows={2}
                    />
                </SectionBlock>
            </div>
        </div>
    );
};
