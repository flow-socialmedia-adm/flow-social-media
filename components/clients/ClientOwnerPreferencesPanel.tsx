import React, { useContext, useMemo } from 'react';
import { AppContext } from '../../contexts/AppContext';
import type { AgencyOperationMode, Client } from '../../types';
import { defaultClientOwnerPreferences } from '../../lib/client-owner-preferences';
import { getActivePostEligibleOwners } from '../../lib/agencyOperational';

export const ClientOwnerPreferencesPanel: React.FC<{
	editedClient: Client;
	onUpdate: (u: Partial<Client>) => void;
}> = ({ editedClient, onUpdate }) => {
	const ctx = useContext(AppContext);
	const members = ctx?.agencyProfile.teamMembers ?? [];
	const operationMode: AgencyOperationMode = ctx?.agencyProfile.operationMode ?? 'solo';

	const options = useMemo(() => getActivePostEligibleOwners(members), [members]);

	if (!ctx) return null;
	if (operationMode === 'solo') return null;

	const { t, canEditModule } = ctx;
	const canEditClients = canEditModule('clients');
	const prefs = editedClient.ownerPreferences ?? defaultClientOwnerPreferences();

	const rawLegacy = (editedClient.planningAccountOwner || '').trim();
	const prefsId = (prefs.defaultOwnerUserId || '').trim();
	const eligibleIds = new Set(options.map((m) => m.id));
	const resolvedId = prefsId || (rawLegacy && eligibleIds.has(rawLegacy) ? rawLegacy : '');
	const valueForSelect =
		!resolvedId && !rawLegacy
			? ''
			: eligibleIds.has(resolvedId)
			  ? resolvedId
			  : rawLegacy
			    ? `__legacy__:${rawLegacy}`
			    : '';

	const setDefaultOwner = (userId: string | null) => {
		const base = editedClient.ownerPreferences ?? defaultClientOwnerPreferences();
		const ownerId = userId ?? '';
		onUpdate({
			ownerPreferences: {
				...base,
				defaultOwnerUserId: userId,
				useDefaultOwnerForAllStages: true,
			},
			// Espelho legado (planningAccountOwner) — ver TODO em ClientsPage / syncLegacy.
			planningAccountOwner: ownerId,
		});
	};

	return (
		<div className="space-y-2">
			<label className="block text-xs font-medium text-gray-600 dark:text-gray-400" htmlFor="client-responsible-by-client">
				{t('client_responsible_by_client_label')}
			</label>
			<p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">{t('client_responsible_by_client_hint')}</p>
			<select
				id="client-responsible-by-client"
				value={valueForSelect}
				onChange={(e) => {
					const v = e.target.value;
					if (!v) {
						setDefaultOwner(null);
						return;
					}
					if (v.startsWith('__legacy__:')) {
						const legacy = v.slice('__legacy__:'.length);
						onUpdate({
							planningAccountOwner: legacy,
							ownerPreferences: {
								...(editedClient.ownerPreferences ?? defaultClientOwnerPreferences()),
								defaultOwnerUserId: null,
								useDefaultOwnerForAllStages: true,
							},
						});
						return;
					}
					setDefaultOwner(v);
				}}
				disabled={!canEditClients}
				className="w-full max-w-md text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
			>
				<option value="">{t('planning_account_owner_select_placeholder')}</option>
				{options.map((m) => (
					<option key={m.id} value={m.id}>
						{m.name}
					</option>
				))}
				{rawLegacy && !eligibleIds.has(rawLegacy) && !eligibleIds.has(resolvedId) ? (
					<option value={`__legacy__:${rawLegacy}`}>
						{t('planning_account_owner_legacy_option', { text: rawLegacy })}
					</option>
				) : null}
			</select>
		</div>
	);
};
