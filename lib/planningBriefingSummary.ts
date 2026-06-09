import type { Client, User } from '../types';
import type { TabId } from '../components/ClientPresentationView';
import type { BriefingV2 } from './briefingV2/types';
import { resolveBriefingV2 } from './briefingV2/migrate';
import { getBriefingGlobalProgress, getBriefingOverallStatus, type BriefingOverallStatus } from './clientBriefingProgress';
import { buildPostFrequency } from './utils';
import { clientHasStructuredFrequency } from './clientContext';

export type PlanningQuickAction = {
	id: string;
	labelKey: string;
	tab: TabId;
};

export type PlanningBriefingSummary = {
	briefing: BriefingV2;
	globalProgress: ReturnType<typeof getBriefingGlobalProgress>;
	overallStatus: BriefingOverallStatus;
	planningStatus: BriefingOverallStatus;
	contentStatus: BriefingOverallStatus;
	frequencyLabel: string;
	preferredDaysLabel: string;
	objectiveLabel: string;
	monthFocusLabel: string;
	pillarsLabel: string;
	approvalLabel: string;
	channelLabel: string;
	ownerLabel: string;
	quickActions: PlanningQuickAction[];
};

const DAY_I18N: Record<string, string> = {
	mon: 'day_mon',
	tue: 'day_tue',
	wed: 'day_wed',
	thu: 'day_thu',
	fri: 'day_fri',
	sat: 'day_sat',
	sun: 'day_sun',
};

function resolveOwnerLabel(client: Client, teamMembers: User[]): string {
	const ownerId = client.ownerPreferences?.defaultOwnerUserId || client.planningAccountOwner || '';
	if (!ownerId.trim()) return '';
	const member = teamMembers.find((m) => m.id === ownerId);
	return member?.name || ownerId;
}

export function buildPlanningBriefingSummary(
	client: Client,
	t: (key: string, vars?: Record<string, string | number>) => string,
	teamMembers: User[] = [],
): PlanningBriefingSummary {
	const briefing = client.briefingV2 ?? resolveBriefingV2(client);
	const globalProgress = getBriefingGlobalProgress(client);
	const overallStatus = getBriefingOverallStatus(client);
	const planningBlock = globalProgress.blocks.planning;
	const contentBlock = globalProgress.blocks.content;

	const planningStatus: BriefingOverallStatus =
		planningBlock.filled === 0
			? 'empty'
			: planningBlock.filled >= planningBlock.total
			  ? 'complete'
			  : planningBlock.filled / planningBlock.total >= 0.5
			    ? 'partial'
			    : 'started';

	const contentStatus: BriefingOverallStatus =
		contentBlock.filled === 0
			? 'empty'
			: contentBlock.filled >= contentBlock.total
			  ? 'complete'
			  : contentBlock.filled / contentBlock.total >= 0.5
			    ? 'partial'
			    : 'started';

	const freq = briefing.planning.frequency;
	const frequencyLabel = freq.variable
		? t('planning_frequency_variable')
		: freq.quantity && freq.period
		  ? buildPostFrequency(freq.quantity, freq.period, t)
		  : '';

	const preferredDaysLabel = briefing.planning.preferredPostDays.length
		? briefing.planning.preferredPostDays.map((d) => t(DAY_I18N[d] ?? d)).join(', ')
		: '';

	const op = briefing.planning.operation;
	const approvalLabel =
		op.approvalRequired == null ? '' : op.approvalRequired ? t('yes') : t('no');
	const channelLabel = op.approvalChannel ? t(`briefing_channel_${op.approvalChannel}`) : '';

	const quickActions: PlanningQuickAction[] = [];
	if (!freq.variable && !clientHasStructuredFrequency(client)) {
		quickActions.push({ id: 'frequency', labelKey: 'planning_quick_action_define_frequency', tab: 'planning' });
	}
	if (!briefing.content.pillarsTags.some((p) => p.trim())) {
		quickActions.push({ id: 'pillars', labelKey: 'planning_quick_action_define_pillars', tab: 'strategy' });
	}
	if (!briefing.content.monthFocus?.trim()) {
		quickActions.push({ id: 'month_focus', labelKey: 'planning_quick_action_define_month_focus', tab: 'strategy' });
	}
	if (!resolveOwnerLabel(client, teamMembers).trim()) {
		quickActions.push({ id: 'owner', labelKey: 'planning_quick_action_define_owner', tab: 'planning' });
	}

	return {
		briefing,
		globalProgress,
		overallStatus,
		planningStatus,
		contentStatus,
		frequencyLabel,
		preferredDaysLabel,
		objectiveLabel: briefing.content.currentCampaignObjective?.trim() || briefing.content.profileObjective?.trim() || '',
		monthFocusLabel: briefing.content.monthFocus?.trim() || '',
		pillarsLabel: briefing.content.pillarsTags.filter((p) => p.trim()).join(', '),
		approvalLabel,
		channelLabel,
		ownerLabel: resolveOwnerLabel(client, teamMembers),
		quickActions,
	};
}

export function briefingStatusLabelKey(status: BriefingOverallStatus): string {
	return `planning_briefing_status_${status}`;
}
