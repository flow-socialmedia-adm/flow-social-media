import React, { useContext, useMemo } from 'react';
import { AppContext } from '../../../contexts/AppContext';
import type { AgencyOperationMode, Client } from '../../../types';
import type { ApprovalChannel, ClientResponseTime } from '../../../lib/briefingV2/types';
import { patchClientBriefing } from '../../../lib/briefingV2';
import { migrateClientToBriefingV2 } from '../../../lib/briefingV2/migrate';
import { getBriefingBlockProgressFromBriefing } from '../../../lib/clientBriefingProgress';
import { buildPostFrequency } from '../../../lib/utils';
import { getEligibleAgencyOwners } from '../../../lib/agencyOperational';
import { UnsavedChangesBar } from '../UnsavedChangesBar';
import { ClientOwnerPreferencesPanel } from '../ClientOwnerPreferencesPanel';
import { BriefingBlockSection } from '../briefing/BriefingBlockSection';
import { BriefingTabProgressHeader } from '../briefing/BriefingGlobalProgress';

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

const APPROVAL_CHANNELS: ApprovalChannel[] = ['whatsapp', 'email', 'trello', 'clickup', 'other'];
const RESPONSE_TIMES: ClientResponseTime[] = ['same_day', 'up_to_24h', 'up_to_48h', 'up_to_72h', 'over_72h'];

function sortDays(days: string[]): string[] {
    const set = new Set(days);
    return DAY_ORDER.filter((d) => set.has(d));
}

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
    t: (k: string, vars?: Record<string, string | number>) => string;
    expandedSections: Record<string, boolean>;
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

    const briefing = useMemo(
        () => editedClient.briefingV2 ?? migrateClientToBriefingV2(editedClient),
        [editedClient],
    );

    const progress = useMemo(
        () => getBriefingBlockProgressFromBriefing(briefing, 'planning'),
        [briefing],
    );

    const taskEligibleOwners = useMemo(() => {
        const base = getEligibleAgencyOwners(teamMembers, 'task');
        return base.filter((e) => {
            const u = teamMembers.find((m) => m.id === e.id);
            return u != null && (u.inviteStatus ?? 'active') === 'active';
        });
    }, [teamMembers]);

    const preferredDays = sortDays(briefing.planning.preferredPostDays ?? []);
    const freq = briefing.planning.frequency;
    const op = briefing.planning.operation;

    const patch = (updater: Parameters<typeof patchClientBriefing>[1]) => {
        onUpdate(patchClientBriefing(editedClient, updater));
    };

    const toggleSection = () => {
        onExpandedSectionsChange({ ...expandedSections, planning: !expandedSections.planning });
    };

    const toggleDay = (day: DayKey) => {
        const set = new Set(preferredDays);
        if (set.has(day)) set.delete(day);
        else set.add(day);
        patch((b) => ({
            ...b,
            planning: { ...b.planning, preferredPostDays: sortDays(Array.from(set)) },
        }));
    };

    const handleQuantityChange = (v: number | '') => {
        if (freq.variable) return;
        const quantity = v === '' ? undefined : Math.min(99, Math.max(1, v));
        const period = freq.period ?? 'week';
        patch((b) => ({
            ...b,
            planning: {
                ...b.planning,
                frequency: { quantity, period, variable: false },
            },
        }));
    };

    const handlePeriodChange = (period: 'week' | 'month') => {
        if (freq.variable) return;
        const quantity = freq.quantity ?? 1;
        patch((b) => ({
            ...b,
            planning: {
                ...b.planning,
                frequency: { quantity, period, variable: false },
            },
        }));
    };

    const handleVariableChange = (checked: boolean) => {
        patch((b) => ({
            ...b,
            planning: {
                ...b.planning,
                frequency: checked
                    ? { quantity: undefined, period: undefined, variable: true }
                    : { quantity: freq.quantity ?? 1, period: freq.period ?? 'week', variable: false },
            },
        }));
    };

    const updateLeadDays = (
        field: 'productionLeadDays' | 'approvalLeadDays' | 'schedulingLeadDays',
        raw: string,
    ) => {
        const n = raw === '' ? undefined : Math.max(0, parseInt(raw, 10) || 0);
        patch((b) => ({
            ...b,
            planning: {
                ...b.planning,
                operation: { ...b.planning.operation, [field]: n },
            },
        }));
    };

    const accountOwner = editedClient.planningAccountOwner || briefing._internal?.planning?.accountOwnerLegacy || '';

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

            <BriefingTabProgressHeader client={editedClient} t={t} tab="planning" />

            <BriefingBlockSection
                title={t('briefing_block_planning_title')}
                description={t('briefing_block_planning_desc')}
                accent="planning"
                expanded={!!expandedSections.planning}
                onToggle={toggleSection}
                progress={progress}
                progressLabel={t('briefing_progress_label')}
            >
                <div>
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">{t('briefing_planning_frequency')}</h4>
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-4 items-start">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                                    {t('planning_frequency_quantity')}
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={99}
                                    value={freq.quantity ?? ''}
                                    onChange={(e) =>
                                        handleQuantityChange(e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0)
                                    }
                                    disabled={freq.variable}
                                    className="w-28 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white disabled:opacity-50"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                                    {t('planning_frequency_period')}
                                </label>
                                <select
                                    value={freq.period ?? 'week'}
                                    onChange={(e) => handlePeriodChange(e.target.value as 'week' | 'month')}
                                    disabled={freq.variable}
                                    className="w-44 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white disabled:opacity-50"
                                >
                                    <option value="week">{t('planning_frequency_per_week')}</option>
                                    <option value="month">{t('planning_frequency_per_month')}</option>
                                </select>
                            </div>
                        </div>
                        <label className="flex items-start gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={freq.variable}
                                onChange={(e) => handleVariableChange(e.target.checked)}
                                className="mt-1 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{t('planning_frequency_variable')}</span>
                        </label>
                        {!freq.variable && freq.quantity && freq.period && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {buildPostFrequency(freq.quantity, freq.period)}
                            </p>
                        )}
                    </div>
                </div>

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

                <div>
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">{t('briefing_planning_operation')}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {(
                            [
                                ['productionLeadDays', 'planning_lead_production'],
                                ['approvalLeadDays', 'planning_lead_approval'],
                                ['schedulingLeadDays', 'planning_lead_scheduling'],
                            ] as const
                        ).map(([field, labelKey]) => (
                            <div key={field}>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{t(labelKey)}</label>
                                <input
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={op[field] ?? ''}
                                    onChange={(e) => updateLeadDays(field, e.target.value)}
                                    placeholder={t('planning_lead_days_placeholder')}
                                    className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="mt-4">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{t('planning_approval_required')}</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    patch((b) => ({
                                        ...b,
                                        planning: {
                                            ...b.planning,
                                            operation: { ...b.planning.operation, approvalRequired: true },
                                        },
                                    }))
                                }
                                className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                                    op.approvalRequired === true
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                                }`}
                            >
                                {t('yes')}
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    patch((b) => ({
                                        ...b,
                                        planning: {
                                            ...b.planning,
                                            operation: { ...b.planning.operation, approvalRequired: false },
                                        },
                                    }))
                                }
                                className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                                    op.approvalRequired === false
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                                }`}
                            >
                                {t('no')}
                            </button>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{t('briefing_approval_channel')}</label>
                    <select
                        value={op.approvalChannel || ''}
                        onChange={(e) =>
                            patch((b) => ({
                                ...b,
                                planning: {
                                    ...b.planning,
                                    operation: {
                                        ...b.planning.operation,
                                        approvalChannel: e.target.value as ApprovalChannel | '',
                                    },
                                },
                            }))
                        }
                        className="w-full sm:w-72 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white"
                    >
                        <option value="">{t('briefing_select_placeholder')}</option>
                        {APPROVAL_CHANNELS.map((ch) => (
                            <option key={ch} value={ch}>
                                {t(`briefing_channel_${ch}`)}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{t('briefing_client_response_time')}</label>
                    <select
                        value={op.clientResponseTime || ''}
                        onChange={(e) =>
                            patch((b) => ({
                                ...b,
                                planning: {
                                    ...b.planning,
                                    operation: {
                                        ...b.planning.operation,
                                        clientResponseTime: e.target.value as ClientResponseTime | '',
                                    },
                                },
                            }))
                        }
                        className="w-full sm:w-72 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white"
                    >
                        <option value="">{t('briefing_select_placeholder')}</option>
                        {RESPONSE_TIMES.map((rt) => (
                            <option key={rt} value={rt}>
                                {t(`briefing_response_${rt}`)}
                            </option>
                        ))}
                    </select>
                </div>

                {operationMode !== 'solo' && (
                    <div className="border-t border-gray-200 pt-5 dark:border-gray-700">
                        <ClientOwnerPreferencesPanel editedClient={editedClient} onUpdate={onUpdate} />
                    </div>
                )}

                {operationMode !== 'solo' && (
                    <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                            {t('planning_account_owner_label')}
                        </label>
                        {(() => {
                            const raw = accountOwner.trim();
                            const eligibleIds = new Set(taskEligibleOwners.map((e) => e.id));
                            const valueForSelect = !raw ? '' : eligibleIds.has(raw) ? raw : `__legacy__:${raw}`;
                            return (
                                <select
                                    value={valueForSelect}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        const owner = !v ? '' : v.startsWith('__legacy__:') ? v.slice('__legacy__:'.length) : v;
                                        onUpdate({
                                            planningAccountOwner: owner,
                                            ...patchClientBriefing(editedClient, (b) => ({
                                                ...b,
                                                _internal: {
                                                    ...b._internal,
                                                    planning: {
                                                        ...b._internal?.planning,
                                                        accountOwnerLegacy: owner || undefined,
                                                    },
                                                },
                                            })),
                                        });
                                    }}
                                    className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white"
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
            </BriefingBlockSection>
        </div>
    );
};
