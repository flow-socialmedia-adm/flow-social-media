import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { Task, AppContextType } from '../../types';
import { apiPatch, parseApiErrorMessage } from '../../lib/api';
import { maybePromptOwnerChangeAfterTransition } from '../../lib/ownerSuggestionPrompt';
import { CHANGE_SOURCE } from '../../lib/taskStatusChangeSource';
import {
	defaultActionIdForStatus,
	getCurrentStepIndexForTask,
	getGeneralLinearFlow,
	groupFlowByStatus,
	isTaskOnLinearFlowStep,
	type LinearFlowStep,
} from '../../lib/taskActionFlow';
import { useOverflowAnchoredMenu } from '../../lib/useOverflowAnchoredMenu';
import { EllipsisVerticalIcon, ChevronLeftIcon, ChevronRightIcon, CheckIcon } from '../icons';
import TooltipHint from '../TooltipHint';
import { CardOverflowSecondaryMenu } from './CardOverflowSecondaryMenu';

type GeneralTaskActionsProps = {
	task: Task;
	context: AppContextType;
	/** Recebe o corpo JSON da API após PATCH /tasks/:id/status (merge de execution owner, etc.). */
	onActionComplete?: (patchResult?: unknown) => void | Promise<void>;
	onStatusChange?: (taskId: string, statusId: string, currentActionId?: string | null) => void;
	sourcePage?: 'agenda' | 'tarefas';
	onNavigateToPage?: (page: 'tarefas' | 'agenda') => void;
	onOpenDetails?: () => void;
	compact?: boolean;
	confirmStatusChange?: () => Promise<boolean>;
	onOpenHistory?: () => void;
	/** Operacional: não abre prompt de troca de responsável após transição (evita PUT negado). */
	skipOwnerTransitionPrompt?: boolean;
	onDelete?: (taskId: string) => void;
	onDuplicate?: (taskId: string) => void;
	/** Agenda: fundo claro do card → ícone ⋮ mais escuro. */
	agendaMenuSurface?: 'light' | 'tinted';
};

const GeneralTaskActions: React.FC<GeneralTaskActionsProps> = ({
	task,
	context,
	onActionComplete,
	onStatusChange,
	sourcePage,
	onNavigateToPage,
	onOpenDetails,
	compact = false,
	confirmStatusChange,
	onOpenHistory,
	skipOwnerTransitionPrompt = false,
	onDelete,
	onDuplicate,
	agendaMenuSurface = 'tinted',
}) => {
	const { workflows, generalWorkflowId, t, showConfirmation, agencyProfile, notify } = context;
	const resolveTeamMemberName = (id: string) =>
		agencyProfile.teamMembers?.find((m) => m.id === id)?.name ?? id;
	const [popoverOpen, setPopoverOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const { anchorRef, menuRef, menuBox } = useOverflowAnchoredMenu(popoverOpen, setPopoverOpen);

	const workflow =
		task.workflowId && workflows[task.workflowId] ? workflows[task.workflowId] : workflows[generalWorkflowId];

	const linearFlow = useMemo(
		() => (task.isGeneral && workflow?.statuses ? getGeneralLinearFlow(workflow.statuses) : null),
		[task.isGeneral, workflow?.statuses],
	);

	const isTarefasMenu = sourcePage === 'tarefas' || sourcePage === 'agenda';

	const otherStatuses = workflow?.statuses.filter((s) => s.id !== task.statusId) ?? [];
	const orderedStatuses = workflow?.statuses ?? [];
	const currentStatusIndex = orderedStatuses.findIndex((s) => s.id === task.statusId);
	const currentStatus = currentStatusIndex >= 0 ? orderedStatuses[currentStatusIndex] : null;

	const flowIndex = linearFlow ? getCurrentStepIndexForTask(task, linearFlow) : -1;
	const currentFlowStep = linearFlow && flowIndex >= 0 ? linearFlow[flowIndex] : null;

	const positionLabel =
		linearFlow && currentFlowStep
			? t(currentFlowStep.nameKey)
			: currentStatus
				? t(currentStatus.nameKey)
				: t('status');

	const showNavItem = onNavigateToPage && (sourcePage === 'agenda' || sourcePage === 'tarefas');
	const hasAnyItem =
		(isTarefasMenu ? orderedStatuses.length > 0 : otherStatuses.length > 0) ||
		showNavItem ||
		!!onOpenDetails ||
		(isTarefasMenu && !!onOpenHistory) ||
		!!onDelete ||
		!!onDuplicate;
	const closeAnd = (fn: () => void) => {
		setPopoverOpen(false);
		fn();
	};
	const secondaryMenuItemClass =
		'w-full px-2 py-1 text-left text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded';
	if (!workflow || !hasAnyItem) return null;

	const canGoPrevLinear = linearFlow ? flowIndex > 0 : false;
	const canGoNextLinear = linearFlow ? flowIndex >= 0 && flowIndex < linearFlow.length - 1 : false;
	const canGoPrevSimple = currentStatusIndex > 0;
	const canGoNextSimple = currentStatusIndex >= 0 && currentStatusIndex < orderedStatuses.length - 1;
	const canGoPrev = linearFlow ? canGoPrevLinear : canGoPrevSimple;
	const canGoNext = linearFlow ? canGoNextLinear : canGoNextSimple;

	const runConfirm = (statusChanging: boolean, run: () => void) => {
		if (!statusChanging) {
			run();
			return;
		}
		if (confirmStatusChange) {
			void (async () => {
				const ok = await confirmStatusChange();
				if (ok) run();
			})();
			return;
		}
		if (showConfirmation) {
			showConfirmation({
				title: t('confirm'),
				message: t('confirm_task_status_change'),
				onConfirm: run,
			});
			return;
		}
		return;
	};

	const patchStep = (statusId: string, currentActionId: string | null | undefined, statusChanging: boolean) => {
		if (loading || !task.id) return;
		setLoading(true);
		setPopoverOpen(false);
		const body: { statusId: string; changeSource: string; currentActionId?: string | null } = {
			statusId,
			changeSource: CHANGE_SOURCE.quick_action,
		};
		if (currentActionId !== undefined) body.currentActionId = currentActionId;
		onStatusChange?.(task.id, statusId, currentActionId);
		void apiPatch<Record<string, unknown>>(`/tasks/${task.id}/status`, body)
			.then(async (res) => {
				if (onActionComplete) await Promise.resolve(onActionComplete(res));
				if (!skipOwnerTransitionPrompt && showConfirmation) {
					const ownerUpdated = await maybePromptOwnerChangeAfterTransition(task.id, res, resolveTeamMemberName, {
						showConfirmation,
						t,
					});
					if (ownerUpdated && onActionComplete) await Promise.resolve(onActionComplete(res));
				}
			})
		.catch((error: unknown) => {
			console.error('Erro ao alterar status:', error);
			notify?.(parseApiErrorMessage(error, 'Erro ao alterar status.'));
		})
			.finally(() => setLoading(false));
	};

	const applyLinearStep = (step: LinearFlowStep) => {
		if (loading || !task.id) return;
		const statusChanging = step.statusId !== task.statusId;
		// Fechar o menu antes de abrir a confirmação para evitar sobreposição
		if (statusChanging) setPopoverOpen(false);
		runConfirm(statusChanging, () => patchStep(step.statusId, step.actionId, statusChanging));
	};

	const executeStatusChange = (statusId: string) => {
		if (loading || !task.id || task.statusId === statusId) return;
		// Fechar o menu antes de abrir a confirmação para evitar sobreposição
		setPopoverOpen(false);
		runConfirm(true, () => {
			const flow = linearFlow;
			const defaultSub = flow ? defaultActionIdForStatus(flow, statusId) : undefined;
			patchStep(statusId, flow ? defaultSub ?? null : undefined, true);
		});
	};

	const handleStatusClick = (statusId: string) => {
		if (statusId === task.statusId) return;
		executeStatusChange(statusId);
	};

	const goPrev = () => {
		if (linearFlow) {
			if (flowIndex <= 0) return;
			applyLinearStep(linearFlow[flowIndex - 1]);
			return;
		}
		if (!canGoPrevSimple) return;
		handleStatusClick(orderedStatuses[currentStatusIndex - 1].id);
	};

	const goNext = () => {
		if (linearFlow) {
			if (flowIndex < 0 || flowIndex >= linearFlow.length - 1) return;
			applyLinearStep(linearFlow[flowIndex + 1]);
			return;
		}
		if (!canGoNextSimple) return;
		handleStatusClick(orderedStatuses[currentStatusIndex + 1].id);
	};

	const grouped = linearFlow ? groupFlowByStatus(linearFlow) : [];

	const menuPanel =
		popoverOpen && menuBox ? (
		<div
			ref={menuRef}
			role="menu"
			style={{
				position: 'fixed',
				top: menuBox.top,
				left: menuBox.left,
				width: menuBox.width,
				zIndex: 10000,
			}}
			className="py-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600"
			onClick={(e) => e.stopPropagation()}
		>
					{isTarefasMenu ? (
						<>
						<div className="shrink-0 px-2 py-1.5 flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-700">
							<TooltipHint label={t('back')} portalZIndex={10050}>
								<button
									type="button"
									onClick={goPrev}
									disabled={!canGoPrev || loading}
									className="p-1 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
									aria-label={t('back')}
								>
									<ChevronLeftIcon className="w-4 h-4" />
								</button>
							</TooltipHint>
							<span className="flex-1 min-w-0 text-center text-xs font-medium text-gray-700 dark:text-gray-200 truncate">
								{positionLabel}
							</span>
							<TooltipHint label={t('next')} portalZIndex={10050}>
								<button
									type="button"
									onClick={goNext}
									disabled={!canGoNext || loading}
									className="p-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-gray-400 dark:disabled:bg-gray-600"
									aria-label={t('next')}
								>
									<ChevronRightIcon className="w-4 h-4" />
								</button>
							</TooltipHint>
						</div>

					<div className="px-2 py-1">
						<div className="px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('status_of_task')}</div>
							<div>
								{linearFlow ? (
									grouped.map(({ statusId, steps }) => {
										const st = orderedStatuses.find((s) => s.id === statusId);
										if (!st) return null;
										const onlyMacro = steps.length === 1 && steps[0].actionId === null;
										if (onlyMacro) {
											const step = steps[0];
											const active = isTaskOnLinearFlowStep(task, step, linearFlow);
											return (
												<button
													key={statusId}
													type="button"
													onClick={() => applyLinearStep(step)}
													disabled={loading}
													className={`w-full px-2 py-1 flex items-center gap-1.5 text-[10px] text-left rounded-md transition-colors ${
														active
															? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 font-medium'
															: 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
													}`}
												>
													{active ? (
														<CheckIcon className="w-3 h-3 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
													) : (
														<span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.color.bg} border ${st.color.border || ''}`} />
													)}
													<span className="font-medium">{t(st.nameKey)}</span>
												</button>
											);
										}
										return (
											<div key={statusId} className="mb-0.5">
												<div className="px-2 py-0.5 flex items-center gap-1.5 text-[11px] font-medium text-gray-600 dark:text-gray-300">
													<span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.color.bg} border ${st.color.border || ''}`} />
													<span>{t(st.nameKey)}</span>
												</div>
												{steps.map((step) => {
													const active = isTaskOnLinearFlowStep(task, step, linearFlow);
													return (
														<button
															key={`${step.statusId}-${step.actionId ?? 'x'}`}
															type="button"
															onClick={() => applyLinearStep(step)}
															disabled={loading}
															className={`w-full pl-5 pr-2 py-0.5 flex items-center gap-1.5 text-[11px] text-left rounded-md transition-colors ${
																active
																	? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 font-medium'
																	: 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
															}`}
														>
															{active ? (
																<CheckIcon className="w-3 h-3 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
															) : (
																<span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.color.bg} border ${st.color.border || ''}`} />
															)}
															<span>{t(step.nameKey)}</span>
														</button>
													);
												})}
											</div>
										);
									})
								) : (
									orderedStatuses.map((status) => {
										const isCurrent = status.id === task.statusId;
										return (
											<button
												key={status.id}
												type="button"
												onClick={() => handleStatusClick(status.id)}
												disabled={loading}
												className={`w-full px-2 py-1 flex items-center gap-1.5 text-[10px] text-left rounded-md transition-colors ${
													isCurrent
														? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 font-medium'
														: 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
												}`}
											>
												{isCurrent ? (
													<CheckIcon className="w-3 h-3 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
												) : (
													<span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status.color.bg} ${status.color.border || ''} border`} />
												)}
												<span>{t(status.nameKey)}</span>
											</button>
										);
									})
								)}
								</div>
							</div>
							<CardOverflowSecondaryMenu
								duplicateLabel={onDuplicate ? t('duplicate_task') : undefined}
								onDuplicate={onDuplicate ? () => closeAnd(() => onDuplicate(task.id)) : undefined}
								editLabel={onOpenDetails ? t('edit_task_menu') : undefined}
								onEdit={onOpenDetails ? () => closeAnd(onOpenDetails) : undefined}
								deleteLabel={t('delete')}
								onDelete={onDelete ? () => closeAnd(() => onDelete(task.id)) : undefined}
							>
								{sourcePage === 'tarefas' && onNavigateToPage ? (
									<button
										type="button"
										onClick={() => closeAnd(() => onNavigateToPage('agenda'))}
										className={secondaryMenuItemClass}
									>
										{t('view_in_agenda_task_menu')}
									</button>
								) : null}
								{sourcePage === 'agenda' && onNavigateToPage ? (
									<button
										type="button"
										onClick={() => closeAnd(() => onNavigateToPage('tarefas'))}
										className={secondaryMenuItemClass}
									>
										{t('view_in_tasks_task_menu')}
									</button>
								) : null}
								{isTarefasMenu && onOpenHistory ? (
									<button
										type="button"
										onClick={() => closeAnd(onOpenHistory)}
										className={secondaryMenuItemClass}
									>
										{t('view_status_history')}
									</button>
								) : null}
							</CardOverflowSecondaryMenu>
						</>
					) : (
						<>
						<div className="shrink-0 px-3 py-1.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-700">
							{t('actions_of_task')}
						</div>
						{otherStatuses.map((status) => (
							<button
								key={status.id}
								type="button"
								onClick={() => handleStatusClick(status.id)}
								className="w-full px-3 py-1.5 text-left text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
							>
								{t('action_go_to_status').replace('{status}', t(status.nameKey))}
							</button>
						))}
						<CardOverflowSecondaryMenu
							variant="spacious"
							duplicateLabel={onDuplicate ? t('duplicate_task') : undefined}
							onDuplicate={onDuplicate ? () => closeAnd(() => onDuplicate(task.id)) : undefined}
							editLabel={onOpenDetails ? t('open_details') : undefined}
							onEdit={onOpenDetails ? () => closeAnd(onOpenDetails) : undefined}
							deleteLabel={t('delete')}
							onDelete={onDelete ? () => closeAnd(() => onDelete(task.id)) : undefined}
						>
							{sourcePage === 'agenda' && onNavigateToPage ? (
								<button
									type="button"
									onClick={() => closeAnd(() => onNavigateToPage('tarefas'))}
									className="w-full px-3 py-1.5 text-left text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
								>
									{t('open_in_tasks')}
								</button>
							) : null}
						</CardOverflowSecondaryMenu>
						</>
					)}
			</div>
		) : null;

	const ellipsisHint = isTarefasMenu ? t('status_of_task') : t('actions_of_task');
	const agendaCompactMenuClass =
		compact && sourcePage === 'agenda'
			? agendaMenuSurface === 'light'
				? 'bg-gray-100/90 text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:bg-gray-700/90 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-gray-100'
				: 'bg-white/15 text-white/80 hover:bg-white/30 hover:text-white'
			: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/60 shadow-sm hover:shadow';

	return (
		<div className="relative flex-shrink-0">
			<TooltipHint label={ellipsisHint}>
				<button
					ref={anchorRef}
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						setPopoverOpen((v) => !v);
					}}
					className={`flex items-center justify-center rounded-full transition-all flex-shrink-0 ${compact ? 'w-5 h-5' : 'w-8 h-8'} ${agendaCompactMenuClass}`}
					aria-label={ellipsisHint}
					aria-expanded={popoverOpen}
					aria-haspopup="menu"
					disabled={loading}
				>
					<EllipsisVerticalIcon className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
				</button>
			</TooltipHint>
			{typeof document !== 'undefined' && menuPanel ? createPortal(menuPanel, document.body) : null}
		</div>
	);
};

export default GeneralTaskActions;
