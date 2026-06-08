import React, { useMemo } from 'react';
import type { Client } from '../../../types';
import type { PrimaryCta } from '../../../lib/briefingV2/types';
import { patchClientBriefing } from '../../../lib/briefingV2';
import { getBriefingBlockProgressFromBriefing } from '../../../lib/clientBriefingProgress';
import { migrateClientToBriefingV2 } from '../../../lib/briefingV2/migrate';
import { UnsavedChangesBar } from '../UnsavedChangesBar';
import { BriefingBlockSection, SimpleTextarea } from './BriefingBlockSection';
import { TagsInput } from './TagsInput';
import { MarketReferencesEditor } from './MarketReferencesEditor';
import { PersonasEditor } from './PersonasEditor';

const PRIMARY_CTA_OPTIONS: PrimaryCta[] = [
    'schedule_consultation',
    'request_quote',
    'whatsapp',
    'buy',
    'contact',
    'other',
];

export type BriefingV2StrategyEditorProps = {
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

export const BriefingV2StrategyEditor: React.FC<BriefingV2StrategyEditorProps> = ({
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
    const briefing = useMemo(
        () => editedClient.briefingV2 ?? migrateClientToBriefingV2(editedClient),
        [editedClient],
    );

    const progress = useMemo(
        () => ({
            strategy: getBriefingBlockProgressFromBriefing(briefing, 'strategy'),
            audience: getBriefingBlockProgressFromBriefing(briefing, 'audience'),
            communication: getBriefingBlockProgressFromBriefing(briefing, 'communication'),
            content: getBriefingBlockProgressFromBriefing(briefing, 'content'),
        }),
        [briefing],
    );

    const patch = (updater: Parameters<typeof patchClientBriefing>[1]) => {
        onUpdate(patchClientBriefing(editedClient, updater));
    };

    const toggle = (key: string) => {
        onExpandedSectionsChange({ ...expandedSections, [key]: !expandedSections[key] });
    };

    const progressLabel = t('briefing_progress_label');

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

            <BriefingBlockSection
                title={t('briefing_block_strategy_title')}
                description={t('briefing_block_strategy_desc')}
                accent="strategy"
                expanded={!!expandedSections.strategy}
                onToggle={() => toggle('strategy')}
                progress={progress.strategy}
                progressLabel={progressLabel}
            >
                <SimpleTextarea
                    label={t('briefing_brand_who')}
                    value={briefing.strategy.brandWho}
                    onChange={(v) => patch((b) => ({ ...b, strategy: { ...b.strategy, brandWho: v } }))}
                    placeholder={t('briefing_brand_who_placeholder')}
                    rows={4}
                />
                <TagsInput
                    label={t('briefing_main_services')}
                    tags={briefing.strategy.mainServicesTags}
                    onChange={(tags) => patch((b) => ({ ...b, strategy: { ...b.strategy, mainServicesTags: tags } }))}
                    placeholder={t('briefing_tags_placeholder')}
                />
                <SimpleTextarea
                    label={t('briefing_differentiators')}
                    value={briefing.strategy.differentiators}
                    onChange={(v) => patch((b) => ({ ...b, strategy: { ...b.strategy, differentiators: v } }))}
                    placeholder={t('briefing_differentiators_placeholder')}
                    rows={2}
                />
                <SimpleTextarea
                    label={t('briefing_perceived_as')}
                    value={briefing.strategy.perceivedAs}
                    onChange={(v) => patch((b) => ({ ...b, strategy: { ...b.strategy, perceivedAs: v } }))}
                    placeholder={t('briefing_perceived_as_placeholder')}
                    rows={2}
                />
                <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        {t('briefing_market_references')}
                    </label>
                    <MarketReferencesEditor
                        references={briefing.strategy.marketReferences}
                        onChange={(refs) => patch((b) => ({ ...b, strategy: { ...b.strategy, marketReferences: refs } }))}
                        t={t}
                    />
                </div>
            </BriefingBlockSection>

            <BriefingBlockSection
                title={t('briefing_block_audience_title')}
                description={t('briefing_block_audience_desc')}
                accent="audience"
                expanded={!!expandedSections.audience}
                onToggle={() => toggle('audience')}
                progress={progress.audience}
                progressLabel={progressLabel}
            >
                <SimpleTextarea
                    label={t('briefing_audience_main')}
                    value={briefing.audience.main}
                    onChange={(v) => patch((b) => ({ ...b, audience: { ...b.audience, main: v } }))}
                    placeholder={t('briefing_audience_main_placeholder')}
                    rows={3}
                />
                <TagsInput
                    label={t('briefing_pains_tags')}
                    tags={briefing.audience.painsTags}
                    onChange={(tags) => patch((b) => ({ ...b, audience: { ...b.audience, painsTags: tags } }))}
                    placeholder={t('briefing_tags_placeholder')}
                />
                <TagsInput
                    label={t('briefing_desires_tags')}
                    tags={briefing.audience.desiresTags}
                    onChange={(tags) => patch((b) => ({ ...b, audience: { ...b.audience, desiresTags: tags } }))}
                    placeholder={t('briefing_tags_placeholder')}
                />
                <TagsInput
                    label={t('briefing_objections_tags')}
                    tags={briefing.audience.objectionsTags}
                    onChange={(tags) => patch((b) => ({ ...b, audience: { ...b.audience, objectionsTags: tags } }))}
                    placeholder={t('briefing_tags_placeholder')}
                />
                <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        {t('briefing_personas')}
                    </label>
                    <PersonasEditor
                        personas={briefing.audience.personas}
                        onChange={(personas) => patch((b) => ({ ...b, audience: { ...b.audience, personas } }))}
                        t={t}
                    />
                </div>
            </BriefingBlockSection>

            <BriefingBlockSection
                title={t('briefing_block_communication_title')}
                description={t('briefing_block_communication_desc')}
                accent="communication"
                expanded={!!expandedSections.communication}
                onToggle={() => toggle('communication')}
                progress={progress.communication}
                progressLabel={progressLabel}
            >
                <SimpleTextarea
                    label={t('briefing_tone_of_voice')}
                    value={briefing.communication.toneOfVoice}
                    onChange={(v) => patch((b) => ({ ...b, communication: { ...b.communication, toneOfVoice: v } }))}
                    placeholder={t('briefing_tone_of_voice_placeholder')}
                    rows={3}
                />
                <TagsInput
                    label={t('briefing_brand_words')}
                    tags={briefing.communication.brandWordsTags}
                    onChange={(tags) => patch((b) => ({ ...b, communication: { ...b.communication, brandWordsTags: tags } }))}
                    placeholder={t('briefing_tags_placeholder')}
                />
                <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        {t('briefing_primary_cta')}
                    </label>
                    <select
                        value={briefing.communication.primaryCta || ''}
                        onChange={(e) =>
                            patch((b) => ({
                                ...b,
                                communication: { ...b.communication, primaryCta: e.target.value as PrimaryCta | '' },
                            }))
                        }
                        className="w-full sm:w-72 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="">{t('briefing_select_placeholder')}</option>
                        {PRIMARY_CTA_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                                {t(`briefing_cta_${opt}`)}
                            </option>
                        ))}
                    </select>
                </div>
                <SimpleTextarea
                    label={t('briefing_avoid_communication')}
                    value={briefing.communication.avoid}
                    onChange={(v) => patch((b) => ({ ...b, communication: { ...b.communication, avoid: v } }))}
                    placeholder={t('briefing_avoid_communication_placeholder')}
                    rows={2}
                />
            </BriefingBlockSection>

            <BriefingBlockSection
                title={t('briefing_block_content_title')}
                description={t('briefing_block_content_desc')}
                accent="content"
                expanded={!!expandedSections.content}
                onToggle={() => toggle('content')}
                progress={progress.content}
                progressLabel={progressLabel}
            >
                <SimpleTextarea
                    label={t('briefing_profile_objective')}
                    value={briefing.content.profileObjective}
                    onChange={(v) => patch((b) => ({ ...b, content: { ...b.content, profileObjective: v } }))}
                    placeholder={t('briefing_profile_objective_placeholder')}
                    rows={2}
                />
                <SimpleTextarea
                    label={t('briefing_current_campaign')}
                    value={briefing.content.currentCampaignObjective}
                    onChange={(v) => patch((b) => ({ ...b, content: { ...b.content, currentCampaignObjective: v } }))}
                    placeholder={t('briefing_current_campaign_placeholder')}
                    rows={2}
                />
                <SimpleTextarea
                    label={t('briefing_month_focus')}
                    value={briefing.content.monthFocus}
                    onChange={(v) => patch((b) => ({ ...b, content: { ...b.content, monthFocus: v } }))}
                    placeholder={t('briefing_month_focus_placeholder')}
                    rows={2}
                />
                <TagsInput
                    label={t('briefing_pillars_tags')}
                    tags={briefing.content.pillarsTags}
                    onChange={(tags) => patch((b) => ({ ...b, content: { ...b.content, pillarsTags: tags } }))}
                    placeholder={t('briefing_tags_placeholder')}
                />
                <SimpleTextarea
                    label={t('briefing_strategy_notes')}
                    value={briefing.content.strategyNotes}
                    onChange={(v) => patch((b) => ({ ...b, content: { ...b.content, strategyNotes: v } }))}
                    placeholder={t('briefing_strategy_notes_placeholder')}
                    rows={3}
                />
            </BriefingBlockSection>
        </div>
    );
};
