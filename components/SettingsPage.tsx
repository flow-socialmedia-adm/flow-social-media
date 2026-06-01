import React, { useContext } from 'react';
import { AppContext } from '../contexts/AppContext';
import { ColorSchemeAreaSection } from './settings/ColorSchemeAreaSection';

export const SystemSettingsPanel: React.FC = () => {
	const context = useContext(AppContext);
	if (!context) return null;
	return (
		<div>
			<ColorSchemeAreaSection area="posts" titleKey="settings_post_flow_title" descKey="settings_post_flow_desc" />
			<div className="mt-12 border-t border-gray-100 pt-10 dark:border-gray-800">
				<ColorSchemeAreaSection area="tasks" titleKey="settings_tasks_flow_title" descKey="settings_tasks_flow_desc" />
			</div>
		</div>
	);
};

const SettingsPage: React.FC = () => {
	const context = useContext(AppContext);
	if (!context) return null;
	const { t } = context;
	return (
		<div className="p-4 sm:p-6 lg:p-8">
			<header className="mb-6">
				<h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('system_settings')}</h1>
			</header>
			<main className="mt-6">
				<SystemSettingsPanel />
			</main>
		</div>
	);
};

export default SettingsPage;
