import type { BriefingV2 } from './briefingV2/types';

const DAY_SHORT: Record<string, string> = {
	mon: 'day_mon_short',
	tue: 'day_tue_short',
	wed: 'day_wed_short',
	thu: 'day_thu_short',
	fri: 'day_fri_short',
	sat: 'day_sat_short',
	sun: 'day_sun_short',
};

/** Frequência amigável: "1 post/sem" ou "8 posts/mês ≈ 2/sem". */
export function formatFriendlyFrequency(
	briefing: BriefingV2,
	t: (key: string, vars?: Record<string, string | number>) => string,
): string {
	const freq = briefing.planning.frequency;
	if (freq.variable) return t('planning_freq_friendly_variable');
	if (!freq.quantity || !freq.period) return t('planning_freq_friendly_empty');
	if (freq.period === 'week') {
		return freq.quantity === 1
			? t('planning_freq_friendly_one_week')
			: t('planning_freq_friendly_week', { n: freq.quantity });
	}
	const approx = Math.max(1, Math.round(freq.quantity / 4));
	return t('planning_freq_friendly_month', { n: freq.quantity, approx });
}

/** Dia preferencial curto para tag (primeiro dia ou lista abreviada). */
export function formatPreferredDayShort(
	days: string[],
	t: (key: string) => string,
): string {
	if (!days.length) return '';
	if (days.length === 1) {
		const key = DAY_SHORT[days[0]];
		return key ? t(key) : days[0];
	}
	return days
		.map((d) => {
			const key = DAY_SHORT[d];
			return key ? t(key) : d;
		})
		.join(', ');
}

export type ScheduleIndicator = {
	label: string;
	tone: 'neutral' | 'warning' | 'ok';
};

/** Sempre "Posts planejados: X/Y". */
export function formatScheduleIndicator(
	planned: number,
	goal: number | null,
	missing: number | null,
	t: (key: string, vars?: Record<string, string | number>) => string,
): ScheduleIndicator | null {
	if (goal == null || goal <= 0) return null;
	const tone = missing != null && missing > 0 ? 'warning' : 'ok';
	return { label: t('planning_schedule_posts_ratio', { planned, goal }), tone };
}

/** Label curto para tag de aprovação. */
export function formatApprovalTagLabel(
	approvalRequired: boolean | undefined,
	t: (key: string) => string,
): string {
	if (approvalRequired == null) return t('planning_approval_tag_empty');
	if (approvalRequired) return t('planning_approval_tag_yes');
	return t('planning_approval_tag_no');
};
