import type {
	ColorSchemeAreaPreference,
	ColorSchemeCustomData,
} from '../types';

export function buildColorSchemeContentSave(
	committed: ColorSchemeAreaPreference,
	custom: ColorSchemeCustomData | null,
): ColorSchemeAreaPreference {
	return {
		active: custom ? committed.active : 'default',
		custom,
	};
}

export function buildColorSchemeActivation(
	committed: ColorSchemeAreaPreference,
	active: 'default' | 'custom',
): ColorSchemeAreaPreference {
	if (active === 'custom' && !committed.custom) {
		return { active: 'default', custom: null };
	}
	return {
		active,
		custom: committed.custom,
	};
}
