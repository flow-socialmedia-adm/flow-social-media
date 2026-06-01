import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../contexts/AppContext';
import {
	CONTENT_BELOW_HEADER_PAD,
	CONTENT_PAGE_BODY_INNER,
	CONTENT_PAGE_SCROLL_OUTER,
} from '../lib/contentPageHeader';
import ContentPageHeader from './ContentPageHeader';
import { SystemSettingsPanel } from './SettingsPage';
import AgencyHowItWorksCard from './AgencyHowItWorksCard';

const AgencySettingsPage: React.FC = () => {
	const app = useContext(AppContext);
	const [activeTab, setActiveTab] = useState<'operation' | 'flows'>('operation');

	useEffect(() => {
		if (!app) return;
		try {
			const v = sessionStorage.getItem('flow_settings_focus');
			if (v !== 'team-config') return;
			sessionStorage.removeItem('flow_settings_focus');
			const id = window.setTimeout(() => {
				document.getElementById('settings-team-config')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}, 120);
			return () => window.clearTimeout(id);
		} catch {
			/* ignore */
		}
	}, [app]);

	if (!app) return null;
	const { t } = app;

	return (
		<div className="flex min-h-full min-w-0 w-full flex-1 flex-col">
			<ContentPageHeader
				heading={t('settings_page_title')}
				subtitle={t('settings_page_subtitle')}
			/>

			<div className={`${CONTENT_PAGE_SCROLL_OUTER} ${CONTENT_BELOW_HEADER_PAD}`}>
				<div className={`${CONTENT_PAGE_BODY_INNER} space-y-10 pb-12`}>
					<nav
						className="-mt-1 flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700 sm:gap-2"
						aria-label={t('settings_page_title')}
					>
						<button
							type="button"
							onClick={() => setActiveTab('operation')}
							className={`pb-2.5 px-2 text-sm font-medium whitespace-nowrap transition-colors sm:px-3 ${
								activeTab === 'operation'
									? 'border-b-2 border-indigo-500 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
									: 'border-b-2 border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
							}`}
						>
							{t('settings_tab_operation')}
						</button>
						<button
							type="button"
							onClick={() => setActiveTab('flows')}
							className={`pb-2.5 px-2 text-sm font-medium whitespace-nowrap transition-colors sm:px-3 ${
								activeTab === 'flows'
									? 'border-b-2 border-indigo-500 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
									: 'border-b-2 border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
							}`}
						>
							{t('settings_tab_flows')}
						</button>
					</nav>

					{activeTab === 'operation' && <AgencyHowItWorksCard />}
					{activeTab === 'flows' && (
						<section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
							<SystemSettingsPanel />
						</section>
					)}
				</div>
			</div>
		</div>
	);
};

export default AgencySettingsPage;
