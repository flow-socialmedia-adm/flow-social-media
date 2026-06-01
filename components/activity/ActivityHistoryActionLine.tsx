import React from 'react';
import type {
	ActivityHistoryAccountTabV2,
	ActivityHistoryClientSectionV2,
	ActivityHistoryLineV2,
	ActivityLogEntry,
} from '../../types';

export function isTechnicalActivityActionKey(actionKey?: string): boolean {
	if (!actionKey || typeof actionKey !== 'string') return false;
	return /^(GET|POST|PUT|PATCH|DELETE)\s+\//i.test(actionKey.trim());
}

function clientSectionToI18nKey(section: ActivityHistoryClientSectionV2): string {
	const map: Record<ActivityHistoryClientSectionV2, string> = {
		overview: 'hist_tab_client_overview',
		identity: 'hist_tab_client_identity',
		client_data: 'hist_tab_client_data',
		brand_guide: 'hist_tab_client_brand_guide',
		strategy: 'hist_tab_client_strategy',
		planning: 'hist_tab_client_planning',
		contract: 'hist_tab_client_contract',
		finance: 'hist_tab_client_finance',
	};
	return map[section] ?? 'hist_tab_client_overview';
}

function accountTabToI18nKey(tab: ActivityHistoryAccountTabV2): string {
	const map: Record<ActivityHistoryAccountTabV2, string> = {
		details: 'hist_tab_account_details',
		team: 'hist_tab_account_team',
		billing: 'hist_tab_account_billing',
	};
	return map[tab] ?? 'hist_tab_account_details';
}

export function activityHistoryOriginLabel(line: ActivityHistoryLineV2, t: (key: string) => string): string {
	const pageKey = `hist_page_${line.page}`;
	if (line.page === 'clients') {
		const sec = line.clientSection;
		if (!sec) return t('hist_page_clients');
		return `${t('hist_page_clients')} / ${t(clientSectionToI18nKey(sec))}`;
	}
	if (line.page === 'account') {
		const tab = line.accountTab ?? 'details';
		return `${t('hist_page_account')} / ${t(accountTabToI18nKey(tab))}`;
	}
	return t(pageKey);
}

type TFn = (key: string, replacements?: Record<string, string>) => string;

export const ActivityHistoryActionLine: React.FC<{
	entry: ActivityLogEntry;
	t: TFn;
}> = ({ entry, t }) => {
	const line = entry.line;
	if (line?.v === 2) {
		const verb = t(`hist_verb_${line.verb}`);
		const item = t(`hist_item_${line.item}`);
		const origin = activityHistoryOriginLabel(line, t);
		return (
			<>
				{verb}{' '}
				<strong>{item}</strong>{' '}
				<em className="italic">{line.name}</em>{' '}
				<strong>({origin})</strong>
			</>
		);
	}
	const ak = entry.actionKey ?? '';
	const target = entry.targetName ?? '';
	return (
		<>
			{t(ak)}
			{target ? (
				<>
					{' '}
					<span className="font-semibold text-gray-800 dark:text-gray-200">{target}</span>
				</>
			) : null}
		</>
	);
};
