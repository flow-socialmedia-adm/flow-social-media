import React, { useMemo } from 'react';
import type { Client } from '../../../types';
import type { BriefingBlock, BriefingV2, PrimaryCta, ApprovalChannel, ClientResponseTime } from '../../../lib/briefingV2/types';
import { resolveBriefingV2 } from '../../../lib/briefingV2/migrate';
import { buildPostFrequency } from '../../../lib/utils';

const DAY_I18N: Record<string, string> = {
    mon: 'day_mon', tue: 'day_tue', wed: 'day_wed', thu: 'day_thu',
    fri: 'day_fri', sat: 'day_sat', sun: 'day_sun',
};

const BLOCK_BORDER: Record<BriefingBlock, string> = {
    strategy: 'border-l-violet-500',
    audience: 'border-l-sky-500',
    communication: 'border-l-rose-500',
    content: 'border-l-emerald-500',
    planning: 'border-l-amber-500',
};

const ReadOnlyField: React.FC<{ label: string; value?: string | null; multiline?: boolean }> = ({ label, value, multiline }) => {
    if (!value?.trim()) return null;
    return (
        <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
            {multiline ? (
                <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{value}</p>
            ) : (
                <p className="text-sm text-gray-800 dark:text-gray-200">{value}</p>
            )}
        </div>
    );
};

const ReadOnlyTags: React.FC<{ label: string; tags: string[] }> = ({ label, tags }) => {
    const filtered = tags.filter((t) => t.trim());
    if (filtered.length === 0) return null;
    return (
        <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{label}</p>
            <div className="flex flex-wrap gap-1.5">
                {filtered.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 text-xs rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {tag}
                    </span>
                ))}
            </div>
        </div>
    );
};

const BlockShell: React.FC<{ block: BriefingBlock; title: string; desc: string; children: React.ReactNode; hasContent: boolean }> = ({
    block, title, desc, children, hasContent,
}) => {
    if (!hasContent) return null;
    return (
        <section className={`rounded-lg border border-gray-200 dark:border-gray-700 border-l-4 ${BLOCK_BORDER[block]} p-4 sm:p-5 space-y-3`}>
            <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
            </div>
            {children}
        </section>
    );
};

export const BriefingV2ReadOnly: React.FC<{
    client: Client;
    t: (k: string, vars?: Record<string, string | number>) => string;
    blocks: BriefingBlock[];
    teamMembers?: Array<{ id: string; name?: string }>;
    resolveOwnerDisplay?: (id: string, members: Array<{ id: string; name?: string }>) => string;
}> = ({ client, t, blocks, teamMembers = [], resolveOwnerDisplay }) => {
    const briefing = useMemo(() => client.briefingV2 ?? resolveBriefingV2(client), [client]);

    const ctaLabel = (cta: PrimaryCta | '') => (cta ? t(`briefing_cta_${cta}`) : '');
    const channelLabel = (ch: ApprovalChannel | '') => (ch ? t(`briefing_channel_${ch}`) : '');
    const responseLabel = (rt: ClientResponseTime | '') => (rt ? t(`briefing_response_${rt}`) : '');

    const renderStrategy = (b: BriefingV2) => {
        const has = b.strategy.brandWho || b.strategy.mainServicesTags.length || b.strategy.differentiators ||
            b.strategy.perceivedAs || b.strategy.marketReferences.some((r) => r.name?.trim());
        return (
            <BlockShell block="strategy" title={t('briefing_block_strategy_title')} desc={t('briefing_block_strategy_desc')} hasContent={!!has}>
                <ReadOnlyField label={t('briefing_brand_who')} value={b.strategy.brandWho} multiline />
                <ReadOnlyTags label={t('briefing_main_services')} tags={b.strategy.mainServicesTags} />
                <ReadOnlyField label={t('briefing_differentiators')} value={b.strategy.differentiators} multiline />
                <ReadOnlyField label={t('briefing_perceived_as')} value={b.strategy.perceivedAs} multiline />
                {b.strategy.marketReferences.filter((r) => r.name?.trim()).map((ref) => (
                    <div key={ref.id} className="text-sm border-t border-gray-100 dark:border-gray-700 pt-2 first:border-0 first:pt-0">
                        <p className="font-medium text-gray-800 dark:text-gray-200">
                            {ref.name}
                            <span className="ml-2 text-xs font-normal text-gray-500">
                                ({ref.type === 'competitor' ? t('briefing_ref_type_competitor') : t('briefing_ref_type_inspiration')})
                            </span>
                        </p>
                        {ref.link && <p className="text-xs text-indigo-600 dark:text-indigo-400 truncate">{ref.link}</p>}
                        {ref.note && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap">{ref.note}</p>}
                    </div>
                ))}
            </BlockShell>
        );
    };

    const renderAudience = (b: BriefingV2) => {
        const has = b.audience.main || b.audience.painsTags.length || b.audience.desiresTags.length ||
            b.audience.objectionsTags.length || b.audience.personas.some((p) => p.name?.trim());
        return (
            <BlockShell block="audience" title={t('briefing_block_audience_title')} desc={t('briefing_block_audience_desc')} hasContent={!!has}>
                <ReadOnlyField label={t('briefing_audience_main')} value={b.audience.main} multiline />
                <ReadOnlyTags label={t('briefing_pains_tags')} tags={b.audience.painsTags} />
                <ReadOnlyTags label={t('briefing_desires_tags')} tags={b.audience.desiresTags} />
                <ReadOnlyTags label={t('briefing_objections_tags')} tags={b.audience.objectionsTags} />
                {b.audience.personas.filter((p) => p.name?.trim()).map((p) => (
                    <div key={p.id} className="rounded-md bg-gray-50 dark:bg-gray-900/40 p-3 space-y-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{p.name}</p>
                        {p.description && <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{p.description}</p>}
                        {p.mainPain && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                <span className="font-medium">{t('briefing_persona_main_pain')}:</span> {p.mainPain}
                            </p>
                        )}
                    </div>
                ))}
            </BlockShell>
        );
    };

    const renderCommunication = (b: BriefingV2) => {
        const has = b.communication.toneOfVoice || b.communication.brandWordsTags.length ||
            b.communication.primaryCta || b.communication.avoid;
        return (
            <BlockShell block="communication" title={t('briefing_block_communication_title')} desc={t('briefing_block_communication_desc')} hasContent={!!has}>
                <ReadOnlyField label={t('briefing_tone_of_voice')} value={b.communication.toneOfVoice} multiline />
                <ReadOnlyTags label={t('briefing_brand_words')} tags={b.communication.brandWordsTags} />
                {b.communication.primaryCta && (
                    <ReadOnlyField label={t('briefing_primary_cta')} value={ctaLabel(b.communication.primaryCta)} />
                )}
                <ReadOnlyField label={t('briefing_avoid_communication')} value={b.communication.avoid} multiline />
            </BlockShell>
        );
    };

    const renderContent = (b: BriefingV2) => {
        const has = b.content.profileObjective || b.content.currentCampaignObjective || b.content.monthFocus ||
            b.content.pillarsTags.length || b.content.strategyNotes;
        return (
            <BlockShell block="content" title={t('briefing_block_content_title')} desc={t('briefing_block_content_desc')} hasContent={!!has}>
                <ReadOnlyField label={t('briefing_profile_objective')} value={b.content.profileObjective} multiline />
                <ReadOnlyField label={t('briefing_current_campaign')} value={b.content.currentCampaignObjective} multiline />
                <ReadOnlyField label={t('briefing_month_focus')} value={b.content.monthFocus} multiline />
                <ReadOnlyTags label={t('briefing_pillars_tags')} tags={b.content.pillarsTags} />
                <ReadOnlyField label={t('briefing_strategy_notes')} value={b.content.strategyNotes} multiline />
            </BlockShell>
        );
    };

    const renderPlanning = (b: BriefingV2) => {
        const freq = b.planning.frequency;
        const op = b.planning.operation;
        const freqText = freq.variable
            ? t('planning_frequency_variable')
            : freq.quantity && freq.period
              ? buildPostFrequency(freq.quantity, freq.period)
              : '';
        const has = freqText || b.planning.preferredPostDays.length ||
            op.productionLeadDays != null || op.approvalRequired != null || op.approvalChannel || op.clientResponseTime;
        const owner = client.planningAccountOwner || b._internal?.planning?.accountOwnerLegacy;
        return (
            <BlockShell block="planning" title={t('briefing_block_planning_title')} desc={t('briefing_block_planning_desc')} hasContent={!!(has || owner)}>
                {freqText && <ReadOnlyField label={t('briefing_planning_frequency')} value={freqText} />}
                {b.planning.preferredPostDays.length > 0 && (
                    <ReadOnlyField
                        label={t('preferred_post_days')}
                        value={b.planning.preferredPostDays.map((d) => t(DAY_I18N[d] ?? d)).join(', ')}
                    />
                )}
                {(op.productionLeadDays != null || op.approvalLeadDays != null || op.schedulingLeadDays != null) && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                        {op.productionLeadDays != null && (
                            <p><span className="text-gray-500">{t('planning_lead_production')}:</span> {op.productionLeadDays}</p>
                        )}
                        {op.approvalLeadDays != null && (
                            <p><span className="text-gray-500">{t('planning_lead_approval')}:</span> {op.approvalLeadDays}</p>
                        )}
                        {op.schedulingLeadDays != null && (
                            <p><span className="text-gray-500">{t('planning_lead_scheduling')}:</span> {op.schedulingLeadDays}</p>
                        )}
                    </div>
                )}
                {op.approvalRequired != null && (
                    <ReadOnlyField label={t('planning_approval_required')} value={op.approvalRequired ? t('yes') : t('no')} />
                )}
                {op.approvalChannel && <ReadOnlyField label={t('briefing_approval_channel')} value={channelLabel(op.approvalChannel)} />}
                {op.clientResponseTime && <ReadOnlyField label={t('briefing_client_response_time')} value={responseLabel(op.clientResponseTime)} />}
                {owner && resolveOwnerDisplay && (
                    <ReadOnlyField label={t('planning_account_owner_label')} value={resolveOwnerDisplay(owner, teamMembers)} />
                )}
            </BlockShell>
        );
    };

    const renderers: Record<BriefingBlock, (b: BriefingV2) => React.ReactNode> = {
        strategy: renderStrategy,
        audience: renderAudience,
        communication: renderCommunication,
        content: renderContent,
        planning: renderPlanning,
    };

    const sections = blocks.map((block) => renderers[block](briefing)).filter(Boolean);
    if (sections.length === 0) {
        return <p className="text-sm text-gray-500 dark:text-gray-400">{t('briefing_presentation_empty')}</p>;
    }

    return <div className="space-y-4">{sections}</div>;
};
