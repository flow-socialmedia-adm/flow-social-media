import React from 'react';
import { XIcon } from './icons';

type Props = {
	open: boolean;
	onClose: () => void;
	t: (key: string) => string;
};

/**
 * Drawer lateral (mesmo padrão visual do editor de funções da agência) com texto amigável sobre níveis de acesso.
 */
export const AccessLevelsHelpDrawer: React.FC<Props> = ({ open, onClose, t }) => {
	if (!open) return null;

	return (
		<>
			<button
				type="button"
				className="fixed inset-0 z-[72] bg-black/40"
				aria-label={t('cancel')}
				onClick={onClose}
			/>
			<div className="fixed inset-y-0 right-0 z-[73] flex w-full max-w-md flex-col border-l-[3px] border-l-indigo-500 bg-white shadow-xl dark:border-l-indigo-400 dark:bg-gray-900">
				<div className="border-b border-indigo-100/80 bg-gradient-to-r from-indigo-50/90 via-indigo-50/40 to-white px-4 py-3.5 dark:border-indigo-900/50 dark:from-indigo-950/50 dark:via-indigo-950/25 dark:to-gray-900">
					<div className="flex items-start justify-between gap-3">
						<h3 className="text-base font-semibold leading-snug text-indigo-950 dark:text-indigo-50">
							{t('settings_access_levels_help_title')}
						</h3>
						<button
							type="button"
							onClick={onClose}
							className="shrink-0 rounded-lg p-2 text-gray-500 transition-colors hover:bg-indigo-100/80 hover:text-indigo-800 dark:text-gray-400 dark:hover:bg-indigo-900/40 dark:hover:text-indigo-200"
						>
							<XIcon className="h-5 w-5" />
						</button>
					</div>
				</div>
				<div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-indigo-50/25 to-white px-4 py-4 dark:from-indigo-950/15 dark:to-gray-900">
					<p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
						{t('settings_access_levels_help_intro')}
					</p>
					<ul className="mt-4 space-y-3 text-sm text-gray-700 dark:text-gray-300">
						<li>
							<span className="font-medium text-gray-900 dark:text-white">
								{t('simple_access_administrador')}
							</span>
							<span className="text-gray-600 dark:text-gray-400"> — {t('settings_access_levels_help_admin')}</span>
						</li>
						<li>
							<span className="font-medium text-gray-900 dark:text-white">{t('simple_access_gestor')}</span>
							<span className="text-gray-600 dark:text-gray-400"> — {t('settings_access_levels_help_gestor')}</span>
						</li>
						<li>
							<span className="font-medium text-gray-900 dark:text-white">{t('simple_access_operacional')}</span>
							<span className="text-gray-600 dark:text-gray-400"> — {t('settings_access_levels_help_operacional')}</span>
						</li>
						<li>
							<span className="font-medium text-gray-900 dark:text-white">{t('simple_access_financeiro')}</span>
							<span className="text-gray-600 dark:text-gray-400"> — {t('settings_access_levels_help_financeiro')}</span>
						</li>
					</ul>
					<p className="mt-4 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
						{t('settings_access_levels_help_footer')}
					</p>
				</div>
			</div>
		</>
	);
};
