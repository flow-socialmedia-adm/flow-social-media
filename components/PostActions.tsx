import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Task, type AppContextType } from '../types';
import type { StatusDefinition } from '../types';
import { apiPatch, parseApiErrorMessage } from '../lib/api';
import { maybePromptOwnerChangeAfterTransition } from '../lib/ownerSuggestionPrompt';
import { CHANGE_SOURCE } from '../lib/taskStatusChangeSource';
import {
	defaultActionIdForStatus,
	getCurrentStepIndexForTask,
	getPostLinearFlow,
	groupFlowByStatus,
	isRealPostFlowTask,
	isTaskOnLinearFlowStep,
	type LinearFlowStep,
} from '../lib/taskActionFlow';
import { useOverflowAnchoredMenu } from '../lib/useOverflowAnchoredMenu';
import { CheckIcon, EllipsisVerticalIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';
import TooltipHint from './TooltipHint';
import { getPhaseIdByStatusId, getPostColumnByStatusId } from '../lib/constants';
import { CardOverflowSecondaryMenu } from './tasks/CardOverflowSecondaryMenu';

const POST_STATUS_ORDER = ['pauta_criada', 'em_producao', 'aguardando_aprovacao', 'aprovado', 'agendado', 'publicado'] as const;
const PHASE_IDS_ORDER = ['producao', 'aprovacao', 'publicacao'] as const;

type PostActionsProps = {
	task: Task;
	onActionComplete?: (patchResult?: unknown) => void | Promise<void>;
	onStatusChange?: (taskId: string, statusId: string, currentActionId?: string | null) => void;
	compact?: boolean;
	sourcePage?: 'agenda' | 'posts';
	onNavigateToPage?: (page: 'producao' | 'agenda') => void;
	onOpenDetails?: () => void;
	workflowStatuses?: StatusDefinition[];
	t: (key: string) => string;
	confirmStatusChange?: () => Promise<boolean>;
	onOpenHistory?: () => void;
	/** Nome amigável para o diálogo de sugestão de responsável (modo TEAM). */
	resolveTeamMemberName?: (userId: string) => string;
	/** Operacional: não abre prompt de troca de responsável após transição (evita PUT negado). */
	skipOwnerTransitionPrompt?: boolean;
	/** Modal global (App) quando `confirmStatusChange` não vem do pai. */
	showConfirmation?: AppContextType['showConfirmation'];
	notify?: AppContextType['notify'];
	onDelete?: (taskId: string) => void;
	onDuplicate?: (taskId: string) => void;
	/** Agenda: fundo claro do card → ícone ⋮ mais escuro. */
	agendaMenuSurface?: 'light' | 'tinted';
};

const PostActions: React.FC<PostActionsProps> = ({
	task,
	onActionComplete,
	onStatusChange,
	compact = false,
	sourcePage,
	onNavigateToPage,
	onOpenDetails,
	workflowStatuses = [],
	t,
	confirmStatusChange,
	onOpenHistory,
	resolveTeamMemberName,
	skipOwnerTransitionPrompt = false,
	showConfirmation,
	notify,
	onDelete,
	onDuplicate,
	agendaMenuSurface = 'tinted',
}) => {
	const memberName = resolveTeamMemberName ?? ((id: string) => id);
	const [loading, setLoading] = useState(false);
	const [popoverOpen, setPopoverOpen] = useState(false);
	const { anchorRef, menuRef, menuBox } = useOverflowAnchoredMenu(popoverOpen, setPopoverOpen);

	const linearFlow = useMemo(
		() => (isRealPostFlowTask(task) ? getPostLinearFlow(workflowStatuses) : null),
		[task, workflowStatuses],
	);

	const orderedStatuses = POST_STATUS_ORDER.map((id) => workflowStatuses.find((s) => s.id === id)).filter(Boolean) as StatusDefinition[];
	const currentStatusIndex = orderedStatuses.findIndex((s) => s.id === task.statusId);
	const currentStatus = currentStatusIndex >= 0 ? orderedStatuses[currentStatusIndex] : null;
	const phaseId = task.statusId ? getPhaseIdByStatusId(task.statusId) : null;
	const phaseNumber = phaseId ? PHASE_IDS_ORDER.indexOf(phaseId) + 1 : 0;
	const totalStatuses = orderedStatuses.length;

	const flowIndex = linearFlow ? getCurrentStepIndexForTask(task, linearFlow) : -1;
	const currentFlowStep = linearFlow && flowIndex >= 0 ? linearFlow[flowIndex] : null;

	const positionLabel = linearFlow && currentFlowStep
		? t(currentFlowStep.nameKey)
		: currentStatus
			? `${t(currentStatus.nameKey)} (${currentStatusIndex + 1}/${totalStatuses})`
			: '';

	const phaseLabel = phaseNumber > 0 ? `Fase ${phaseNumber}/3 • ${currentStatusIndex + 1}/${totalStatuses}` : '';

	const runConfirmIfStatusChange = async (statusChanging: boolean): Promise<boolean> => {
		if (!statusChanging) return true;
		if (confirmStatusChange) return confirmStatusChange();
		if (showConfirmation) {
			return new Promise<boolean>((resolve) => {
				showConfirmation({
					title: t('confirm'),
					message: t('confirm_post_status_change'),
					onConfirm: () => resolve(true),
					onCancel: () => resolve(false),
				});
			});
		}
		return false;
	};

	const patchStatusAndAction = async (statusId: string, currentActionId: string | null | undefined, statusChanging: boolean) => {
		if (loading || !task.id) return;
		if (statusChanging && statusId === 'agendado') {
			const pubDate = task.publishDate ?? task.date;
			if (!pubDate || String(pubDate).trim() === '') {
				notify?.(t('publish_date_required_for_agendado'));
				return;
			}
		}
		setLoading(true);
		setPopoverOpen(false);
		try {
			const body: { statusId: string; changeSource: string; currentActionId?: string | null } = {
				statusId,
				changeSource: CHANGE_SOURCE.quick_action,
			};
			if (currentActionId !== undefined) {
				body.currentActionId = currentActionId;
			}
			onStatusChange?.(task.id, statusId, currentActionId);
			const res = await apiPatch<Record<string, unknown>>(`/tasks/${task.id}/status`, body);
			const cb = onActionComplete;
			if (cb) await Promise.resolve(cb(res));
			if (!skipOwnerTransitionPrompt && showConfirmation) {
				const ownerUpdated = await maybePromptOwnerChangeAfterTransition(task.id, res, memberName, {
					showConfirmation,
					t,
				});
				if (ownerUpdated && cb) await Promise.resolve(cb(res));
			}
		} catch (err: unknown) {
			notify?.(parseApiErrorMessage(err, 'Erro ao alterar status. Tente novamente.'));
		} finally {
			setLoading(false);
		}
	};

	const applyLinearStep = async (step: LinearFlowStep) => {
		if (loading || !task.id) return;
		const statusIdChanged = step.statusId !== task.statusId;
		/** Confirma só ao trocar de coluna no Kanban; ex.: Aprovação: aguardando → aprovado = mesma coluna, sem modal. */
		const kanbanColumnChanged =
			getPostColumnByStatusId(task.statusId) !== getPostColumnByStatusId(step.statusId);
		// Fechar o menu antes de abrir a confirmação para evitar sobreposição
		if (statusIdChanged) setPopoverOpen(false);
		const ok = await runConfirmIfStatusChange(kanbanColumnChanged);
		if (!ok) return;
		await patchStatusAndAction(step.statusId, step.actionId, statusIdChanged);
	};

	/** Fluxo simples (sem sub-etapas reconhecidas): só troca status macro. */
	const setStatusMacroOnly = async (statusId: string) => {
		if (loading || !task.id || task.statusId === statusId) return;
		// Fechar o menu antes de abrir a confirmação para evitar sobreposição
		setPopoverOpen(false);
		const kanbanColumnChanged = getPostColumnByStatusId(task.statusId) !== getPostColumnByStatusId(statusId);
		const ok = await runConfirmIfStatusChange(kanbanColumnChanged);
		if (!ok) return;
		if (statusId === 'agendado') {
			const pubDate = task.publishDate ?? task.date;
			if (!pubDate || String(pubDate).trim() === '') {
				notify?.(t('publish_date_required_for_agendado'));
				return;
			}
		}
		setLoading(true);
		setPopoverOpen(false);
		try {
			const flow = linearFlow;
			const defaultSub = flow ? defaultActionIdForStatus(flow, statusId) : undefined;
			onStatusChange?.(task.id, statusId, defaultSub ?? undefined);
			const res = await apiPatch<Record<string, unknown>>(`/tasks/${task.id}/status`, {
				statusId,
				changeSource: CHANGE_SOURCE.quick_action,
				...(flow ? { currentActionId: defaultSub ?? null } : {}),
			});
			if (onActionComplete) await Promise.resolve(onActionComplete(res));
			if (!skipOwnerTransitionPrompt && showConfirmation) {
				const ownerUpdated = await maybePromptOwnerChangeAfterTransition(task.id, res, memberName, {
					showConfirmation,
					t,
				});
				if (ownerUpdated && onActionComplete) await Promise.resolve(onActionComplete(res));
			}
		} catch (err: unknown) {
			notify?.(parseApiErrorMessage(err, 'Erro ao alterar status. Tente novamente.'));
		} finally {
			setLoading(false);
		}
	};

	const goPrev = () => {
		if (!linearFlow || flowIndex <= 0) return;
		void applyLinearStep(linearFlow[flowIndex - 1]);
	};

	const goNext = () => {
		if (!linearFlow || flowIndex < 0 || flowIndex >= linearFlow.length - 1) return;
		void applyLinearStep(linearFlow[flowIndex + 1]);
	};

	const goPrevFallback = () => {
		if (currentStatusIndex <= 0) return;
		void setStatusMacroOnly(orderedStatuses[currentStatusIndex - 1].id);
	};

	const goNextFallback = () => {
		if (currentStatusIndex < 0 || currentStatusIndex >= totalStatuses - 1) return;
		void setStatusMacroOnly(orderedStatuses[currentStatusIndex + 1].id);
	};

	if (task.isGeneral || !task.clientId) return null;
	const showNavItem = onNavigateToPage && (sourcePage === 'agenda' || sourcePage === 'posts');
	const hasOpenDetails = !!onOpenDetails;
	const showHistoryOnPosts = sourcePage === 'posts' && !!onOpenHistory;
	const hasAnyItem =
		orderedStatuses.length > 0 ||
		showNavItem ||
		hasOpenDetails ||
		showHistoryOnPosts ||
		!!onDelete ||
		!!onDuplicate;
	const closeAnd = (fn: () => void) => {
		setPopoverOpen(false);
		fn();
	};
	if (!hasAnyItem) return null;

	const canGoPrev = linearFlow ? flowIndex > 0 : currentStatusIndex > 0;
	const canGoNext = linearFlow ? flowIndex >= 0 && flowIndex < linearFlow.length - 1 : currentStatusIndex >= 0 && currentStatusIndex < totalStatuses - 1;

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
				<div className="shrink-0 px-2 py-1.5 flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-700">
					<TooltipHint label={t('back')} portalZIndex={10050}>
						<button
							type="button"
							onClick={() => (linearFlow ? goPrev() : goPrevFallback())}
							disabled={!canGoPrev || loading}
							className="p-1 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
							aria-label={t('back')}
						>
							<ChevronLeftIcon className="w-4 h-4" />
						</button>
					</TooltipHint>
					<TooltipHint label={phaseLabel} className="flex-1 min-w-0 flex justify-center">
						<span className="min-w-0 text-center text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{positionLabel}</span>
					</TooltipHint>
					<TooltipHint label={t('next')} portalZIndex={10050}>
						<button
							type="button"
							onClick={() => (linearFlow ? goNext() : goNextFallback())}
							disabled={!canGoNext || loading}
							className="p-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-gray-400 dark:disabled:bg-gray-600"
							aria-label={t('next')}
						>
							<ChevronRightIcon className="w-4 h-4" />
						</button>
					</TooltipHint>
				</div>

			<div className="px-2 py-1">
				<div className="px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('status_of_post')}</div>
					<div>
						{linearFlow ? (
							grouped.map(({ statusId, steps }) => {
								const st = workflowStatuses.find((s) => s.id === statusId);
								if (!st) return null;
								const onlyMacro = steps.length === 1 && steps[0].actionId === null;
								if (onlyMacro) {
									const step = steps[0];
									const active = isTaskOnLinearFlowStep(task, step, linearFlow);
									return (
										<button
											key={statusId}
											type="button"
											onClick={() => void applyLinearStep(step)}
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
													onClick={() => void applyLinearStep(step)}
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
										onClick={() => void setStatusMacroOnly(status.id)}
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
						duplicateLabel={onDuplicate ? t('duplicate_post') : undefined}
						onDuplicate={onDuplicate ? () => closeAnd(() => onDuplicate(task.id)) : undefined}
						editLabel={onOpenDetails ? (sourcePage === 'posts' ? 'Editar post' : t('edit')) : undefined}
						onEdit={onOpenDetails ? () => closeAnd(onOpenDetails) : undefined}
						deleteLabel={t('delete')}
						onDelete={onDelete ? () => closeAnd(() => onDelete(task.id)) : undefined}
					>
						{sourcePage === 'agenda' && onNavigateToPage ? (
							<button
								type="button"
								onClick={() => closeAnd(() => onNavigateToPage('producao'))}
								className="w-full px-2 py-1 text-left text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded"
							>
								{t('open_in_posts')}
							</button>
						) : null}
						{sourcePage === 'posts' && onNavigateToPage ? (
							<button
								type="button"
								onClick={() => closeAnd(() => onNavigateToPage('agenda'))}
								className="w-full px-2 py-1 text-left text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded"
							>
								{t('view_in_agenda')}
							</button>
						) : null}
						{showHistoryOnPosts && onOpenHistory ? (
							<button
								type="button"
								onClick={() => closeAnd(onOpenHistory)}
								className="w-full px-2 py-1 text-left text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded"
							>
								{t('view_status_history')}
							</button>
						) : null}
					</CardOverflowSecondaryMenu>
			</div>
		) : null;

	const agendaCompactMenuClass =
		compact && sourcePage === 'agenda'
			? agendaMenuSurface === 'light'
				? 'bg-gray-100/90 text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:bg-gray-700/90 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-gray-100'
				: 'bg-white/15 text-white/80 hover:bg-white/30 hover:text-white'
			: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/60 shadow-sm hover:shadow';

	return (
		<div className="relative flex-shrink-0">
			<TooltipHint label={t('status_of_post')}>
				<button
					ref={anchorRef}
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						setPopoverOpen((v) => !v);
					}}
					className={`flex items-center justify-center rounded-full transition-all flex-shrink-0 ${compact ? 'w-5 h-5' : 'w-8 h-8'} ${agendaCompactMenuClass}`}
					aria-label={t('status_of_post')}
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

export default PostActions;
