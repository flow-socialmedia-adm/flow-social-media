import React from 'react';
import type { Client } from '../../types';
import type { IntelligenceItem } from '../../lib/intelligentCentral';
import { resolveClientImageUrl, resolveClientFallbackColor } from '../../lib/clientVisual';
import { toUploadUrl } from '../../lib/api';

type PlanningAgencyCentralProps = {
	ready: Client[];
	review: Client[];
	globalAlerts: IntelligenceItem[];
	t: (key: string, vars?: Record<string, string | number>) => string;
	onSelectClient: (clientId: string) => void;
};

const ClientChip: React.FC<{
	client: Client;
	onClick: () => void;
}> = ({ client, onClick }) => {
	const img = resolveClientImageUrl(client);
	const fallback = resolveClientFallbackColor(client);

	return (
		<button
			type="button"
			onClick={onClick}
			className="inline-flex max-w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-left text-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50/60 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/30"
		>
			{img ? (
				<img src={toUploadUrl(img)} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
			) : (
				<span
					className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
					style={{ backgroundColor: fallback }}
					aria-hidden
				>
					{(client.name || '?').slice(0, 2).toUpperCase()}
				</span>
			)}
			<span className="truncate font-medium text-gray-800 dark:text-gray-100">{client.name}</span>
		</button>
	);
};

const ClientRow: React.FC<{
	icon: string;
	title: string;
	count: number;
	clients: Client[];
	emptyKey: string;
	onSelectClient: (id: string) => void;
	t: PlanningAgencyCentralProps['t'];
}> = ({ icon, title, count, clients, emptyKey, onSelectClient, t }) => (
	<div className="space-y-2">
		<div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
			<span aria-hidden>{icon}</span>
			<span>{title}</span>
			<span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
				{count}
			</span>
		</div>
		{clients.length === 0 ? (
			<p className="text-xs text-gray-500 dark:text-gray-400">{t(emptyKey)}</p>
		) : (
			<div className="flex flex-wrap gap-2">
				{clients.map((c) => (
					<ClientChip key={c.id} client={c} onClick={() => onSelectClient(c.id)} />
				))}
			</div>
		)}
	</div>
);

export const PlanningAgencyCentral: React.FC<PlanningAgencyCentralProps> = ({
	ready,
	review,
	globalAlerts,
	t,
	onSelectClient,
}) => (
	<section
		className="rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/40"
		data-planning-scope="agency"
	>
		<h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('planning_agency_central_title')}</h2>

		<div className="mt-4 space-y-5">
			<ClientRow
				icon="✅"
				title={t('planning_agency_ready_title')}
				count={ready.length}
				clients={ready}
				emptyKey="planning_agency_ready_empty"
				onSelectClient={onSelectClient}
				t={t}
			/>

			<ClientRow
				icon="⚠️"
				title={t('planning_agency_review_title')}
				count={review.length}
				clients={review}
				emptyKey="planning_agency_review_empty"
				onSelectClient={onSelectClient}
				t={t}
			/>

			<div className="space-y-2 border-t border-gray-100 pt-4 dark:border-gray-800" data-planning-scope="agency-alerts">
				<div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
					<span aria-hidden>📅</span>
					<span>{t('planning_agency_month_alerts_title')}</span>
				</div>
				{globalAlerts.length === 0 ? (
					<p className="text-xs text-gray-500 dark:text-gray-400">{t('planning_agency_alerts_empty')}</p>
				) : (
					<ul className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
						{globalAlerts.map((item) => (
							<li key={item.id} className="flex items-start gap-2">
								<span className="mt-0.5 shrink-0 text-xs" aria-hidden>
									•
								</span>
								<span>{t(item.messageKey, item.messageParams as Record<string, string | number> | undefined)}</span>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	</section>
);
