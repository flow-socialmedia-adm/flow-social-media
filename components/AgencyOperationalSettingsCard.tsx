import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../contexts/AppContext';
import { AuthContext } from '../contexts/AuthContext';
import { apiPut } from '../lib/api';
import type { DefaultOwnerStrategy } from '../types';
import { BriefcaseIcon, SaveIcon } from './icons';

type AgencyOperationalSettingsCardProps = {
	/** Quando true, o título principal fica a cargo da página (seção mais integrada). */
	embedded?: boolean;
};

/**
 * Configuração operacional da agência (owner). Reutiliza Agency.mode (SOLO/TEAM).
 */
const AgencyOperationalSettingsCard: React.FC<AgencyOperationalSettingsCardProps> = ({ embedded = false }) => {
	const app = useContext(AppContext);
	const auth = useContext(AuthContext);
	const [mode, setMode] = useState<'SOLO' | 'TEAM'>('SOLO');
	const [strategy, setStrategy] = useState<DefaultOwnerStrategy>('AGENCY_OWNER');
	const [allowStages, setAllowStages] = useState(false);
	const [saving, setSaving] = useState(false);

	if (!app) return null;
	const { t, agencyProfile, agencyMode, reloadAgency, currentUser, notify } = app;

	useEffect(() => {
		setMode(agencyMode || 'SOLO');
		setStrategy(agencyProfile.defaultOwnerStrategy ?? 'AGENCY_OWNER');
		setAllowStages(!!agencyProfile.allowStageOwners);
	}, [agencyMode, agencyProfile.defaultOwnerStrategy, agencyProfile.allowStageOwners]);

	if (currentUser?.role !== 'owner') return null;

	const handleSave = async () => {
		setSaving(true);
		try {
			await apiPut('/agencies/me', {
				mode,
				defaultOwnerStrategy: strategy,
				allowStageOwners: mode === 'TEAM' ? allowStages : false,
			});
			await auth?.refreshMe?.();
			await reloadAgency();
		} catch {
			notify?.(t('agency_op_save_error'));
		} finally {
			setSaving(false);
		}
	};

	return (
		<div
			className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6 ${embedded ? '' : 'mb-8'}`}
		>
			{!embedded && (
				<div className="mb-4 flex items-center gap-2">
					<BriefcaseIcon className="h-5 w-5 text-indigo-500" />
					<h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('agency_op_title')}</h2>
				</div>
			)}
			{!embedded && (
				<p className="mb-4 text-sm text-gray-500 dark:text-gray-400">{t('agency_op_subtitle')}</p>
			)}

			<div className="max-w-lg space-y-4">
				<div>
					<label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">{t('agency_op_mode')}</label>
					<select
						value={mode}
						onChange={(e) => setMode(e.target.value as 'SOLO' | 'TEAM')}
						className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-sm"
					>
						<option value="SOLO">{t('mode_solo')}</option>
						<option value="TEAM">{t('mode_team')}</option>
					</select>
				</div>

				<div>
					<label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">{t('agency_op_default_owner')}</label>
					<select
						value={strategy}
						onChange={(e) => setStrategy(e.target.value as DefaultOwnerStrategy)}
						className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-sm"
					>
						<option value="AGENCY_OWNER">{t('agency_op_strategy_owner')}</option>
						<option value="MANUAL">{t('agency_op_strategy_manual')}</option>
					</select>
				</div>

				{mode === 'TEAM' && (
					<label className="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							checked={allowStages}
							onChange={(e) => setAllowStages(e.target.checked)}
							className="h-4 w-4 rounded border-gray-300 text-indigo-600"
						/>
						<span className="text-sm text-gray-700 dark:text-gray-300">{t('agency_op_allow_stages')}</span>
					</label>
				)}

				{mode === 'SOLO' && (
					<p className="text-xs text-gray-500 dark:text-gray-400">{t('agency_op_solo_hint')}</p>
				)}

				<button
					type="button"
					onClick={handleSave}
					disabled={saving}
					className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
				>
					<SaveIcon className="w-4 h-4" />
					{saving ? t('saving') : t('save')}
				</button>
			</div>
		</div>
	);
};

export default AgencyOperationalSettingsCard;
