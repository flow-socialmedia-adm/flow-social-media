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
			className="inline-flex max-w-full items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm shadow-sm transition-all hover:border-indigo-300 hover:bg-indigo-50/70 hover:shadow dark:border-gray-600 dark:bg-gray-800/90 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/40"
		>
			{img ? (
				<img src={toUploadUrl(img)} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-gray-200/80 dark:ring-gray-600" />
			) : (
				<span
					className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ring-1 ring-gray-200/80 dark:ring-gray-600"
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
	tone: 'ready' | 'review';
	onSelectClient: (id: string) => void;
	t: PlanningAgencyCentralProps['t'];
}> = ({ icon, title, count, clients, emptyKey, tone, onSelectClient, t }) => {
	const toneClass =
		tone === 'ready'
			? 'border-emerald-100/80 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20'
			: 'border-amber-100/80 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20';

	return (
		<div className={`rounded-lg border px-3.5 py-3.5 ${toneClass}`}>
			<div className="flex items-center gap-2">
				<span className="text-base" aria-hidden>
					{icon}
				</span>
				<h3 className="flex-1 text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
				<span className="rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-gray-700 shadow-sm dark:bg-gray-800/80 dark:text-gray-200">
					{count}
				</span>
			</div>
			<div className="mt-3">
				{clients.length === 0 ? (
					<p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">{t(emptyKey)}</p>
				) : (
					<div className="flex flex-wrap gap-2">
						{clients.map((c) => (
							<ClientChip key={c.id} client={c} onClick={() => onSelectClient(c.id)} />
						))}
					</div>
				)}
			</div>
		</div>
	);
};

export const PlanningAgencyCentral: React.FC<PlanningAgencyCentralProps> = ({
	ready,
	review,
	globalAlerts,
	t,
	onSelectClient,
}) => (
	<section
		className="rounded-xl border border-gray-200 bg-white px-4 py-5 shadow-sm dark:border-gray-700 dark:bg-gray-900/40"
		data-planning-scope="agency"
	>
		<header className="border-b border-gray-100 pb-3.5 dark:border-gray-800">
			<h2 className="text-base font-bold tracking-tight text-gray-900 dark:text-white">{t('planning_agency_central_title')}</h2>
		</header>

		<div className="mt-4 space-y-3">
			<ClientRow
				icon="✅"
				title={t('planning_agency_ready_title')}
				count={ready.length}
				clients={ready}
				emptyKey="planning_agency_ready_empty"
				tone="ready"
				onSelectClient={onSelectClient}
				t={t}
			/>

			<ClientRow
				icon="⚠️"
				title={t('planning_agency_review_title')}
				count={review.length}
				clients={review}
				emptyKey="planning_agency_review_empty"
				tone="review"
				onSelectClient={onSelectClient}
				t={t}
			/>

			<div
				className="rounded-lg border border-indigo-100/80 bg-indigo-50/40 px-3.5 py-3.5 dark:border-indigo-900/40 dark:bg-indigo-950/25"
				data-planning-scope="agency-alerts"
			>
				<div className="flex items-center gap-2">
					<span className="text-base" aria-hidden>
						📅
					</span>
					<h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('planning_agency_month_alerts_title')}</h3>
				</div>
				<div className="mt-2.5">
					{globalAlerts.length === 0 ? (
						<p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">{t('planning_agency_alerts_empty')}</p>
					) : (
						<ul className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
							{globalAlerts.map((item) => (
								<li key={item.id} className="flex items-start gap-2 rounded-md bg-white/60 px-2 py-1.5 dark:bg-gray-900/40">
									<span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" aria-hidden />
									<span>{t(item.messageKey, item.messageParams as Record<string, string | number> | undefined)}</span>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</div>
	</section>
);
