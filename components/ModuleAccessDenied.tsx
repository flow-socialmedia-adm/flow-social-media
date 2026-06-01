import React, { useContext } from 'react';
import { AppContext } from '../contexts/AppContext';
import { ShieldIcon } from './icons';

export const ModuleAccessDenied: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
	const ctx = useContext(AppContext);
	const t = ctx?.t ?? ((k: string) => k);

	return (
		<div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
			<div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-gray-800 dark:text-gray-400">
				<ShieldIcon className="h-7 w-7" aria-hidden />
			</div>
			<div className="max-w-md space-y-2">
				<h1 className="text-lg font-semibold text-gray-900 dark:text-white">{t('module_access_restricted_title')}</h1>
				<p className="text-sm text-gray-600 dark:text-gray-400">{t('module_access_restricted_body')}</p>
			</div>
			{onBack && (
				<button
					type="button"
					onClick={onBack}
					className="mt-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
				>
					{t('module_access_back')}
				</button>
			)}
		</div>
	);
};
