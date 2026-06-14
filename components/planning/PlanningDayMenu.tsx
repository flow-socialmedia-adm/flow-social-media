import React from 'react';
import type { Task } from '../../types';
import { isPostForecast } from '../../lib/postForecastVisual';

export type PlanningDayMenuState = {
	date: Date;
	dateStr: string;
	items: Task[];
	clientId: string;
	clientName: string;
};

type PlanningDayMenuProps = {
	menu: PlanningDayMenuState | null;
	canEdit: boolean;
	canViewPosts: boolean;
	t: (key: string) => string;
	onClose: () => void;
	onCreatePost: (clientId: string, clientName: string, date: string) => void;
	onCreateForecast: (clientId: string, clientName: string, date: string) => void;
	onEditHere: (task: Task) => void;
	onOpenInPosts: (taskId: string) => void;
};

export const PlanningDayMenu: React.FC<PlanningDayMenuProps> = ({
	menu,
	canEdit,
	canViewPosts,
	t,
	onClose,
	onCreatePost,
	onCreateForecast,
	onEditHere,
	onOpenInPosts,
}) => {
	if (!menu) return null;

	const { date, dateStr, items, clientId, clientName } = menu;
	const dateLabel = `${date.getDate()}/${date.getMonth() + 1}`;

	return (
		<>
			<button type="button" className="fixed inset-0 z-[115] bg-black/20" aria-label={t('cancel')} onClick={onClose} />
			<div className="fixed left-1/2 top-1/2 z-[116] w-full max-w-xs -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-200 bg-white p-3 shadow-xl dark:border-gray-700 dark:bg-gray-900">
				<p className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
					{t('planning_day_menu_title')} — {dateLabel}
				</p>

				{items.length === 0 ? (
					canEdit ? (
						<div className="flex flex-col gap-2">
							<button
								type="button"
								onClick={() => {
									onCreatePost(clientId, clientName, dateStr);
									onClose();
								}}
								className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200"
							>
								{t('planning_day_create_post')}
							</button>
							<button
								type="button"
								onClick={() => {
									onCreateForecast(clientId, clientName, dateStr);
									onClose();
								}}
								className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
							>
								{t('planning_day_create_forecast')}
							</button>
						</div>
					) : (
						<p className="text-sm text-gray-500 dark:text-gray-400">{t('planning_day_empty_readonly')}</p>
					)
				) : (
					<div className="space-y-2">
						{items.map((item) => {
							const isForecast = isPostForecast(item);
							const title =
								item.title || (isForecast ? t('planning_forecast_type') : t('planning_draft_default_title'));
							return (
								<div
									key={item.id}
									className={`rounded-lg border p-2 ${isForecast ? 'border-dashed border-slate-300 dark:border-slate-600' : 'border-gray-200 dark:border-gray-700'}`}
								>
									<p className="truncate text-sm font-medium text-gray-900 dark:text-white">{title}</p>
									<div className="mt-2 flex flex-wrap gap-2">
										<button
											type="button"
											onClick={() => {
												onEditHere(item);
												onClose();
											}}
											className="rounded-md border border-indigo-200 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-900/30"
										>
											{t('planning_month_edit_here')}
										</button>
										{!isForecast && canViewPosts ? (
											<button
												type="button"
												onClick={() => {
													onOpenInPosts(item.id);
													onClose();
												}}
												className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
											>
												{t('planning_month_open_in_posts')}
											</button>
										) : null}
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</>
	);
};
