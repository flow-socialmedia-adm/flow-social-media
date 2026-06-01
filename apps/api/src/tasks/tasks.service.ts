import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { UserEligibilityRow } from '../agencies/agency-operational.util';
import {
	mapSubstatusToFunction,
	resolveExecutionOwner,
	resolveClientOwnerForExecution,
	toExecutionMembersFromPrisma,
} from './execution-owner.util';
import { PrismaService } from '../database/prisma.service';
import { RequestContextService } from '../common/context/request-context.service';
import { ModuleAccessService } from '../common/permissions/module-access.service';
import { taskAccessFromCreatePayload, taskAccessFromPrismaRow } from '../common/permissions/task-module-access';
import {
	normalizeTaskStatusChangeSourceForResponse,
	normalizeTaskStatusChangeSourceForStorage,
} from './task-status-change-source';
import { resolveDefaultActionId, POST_CLIENT_LINEAR } from './task-action-flow';
import { CLIENT_INITIAL_OWNER_STAGE_KEY } from '../clients/client-owner.constants';
import {
	resolveResponsibleUser,
	validateClientOwnerAgainstAgencyEligibility,
	type AgencySliceForClientOwner,
} from '../clients/client-owner.util';
import { getAgencyEligibleUsers } from '../agencies/get-agency-eligible-users';
import { mapPostTaskStateToClientStageKey } from './post-task-stage-key.util';
import { buildOwnerSuggestionPayload } from './owner-suggestion.util';
import type { OwnerSuggestionDto } from './owner-suggestion.dto';

type CreateTaskDto = {
	clientId?: string | null;
	title: string;
	date?: string;
	publishDate?: string;
	isProvisionalPublishDate?: boolean;
	dueDate?: string;
	isProvisionalDueDate?: boolean;
	postType?: 'static' | 'video' | 'carousel' | 'reels' | 'story' | null;
	workflowId: string;
	statusId: string;
	description?: string | null;
	category?: string | null;
	ownerUserId?: string | null;
	origin?: string | null;
	bornAsForecast?: boolean;
	currentActionId?: string | null;
};

type UpdateTaskDto = Partial<CreateTaskDto>;

function toDateStr(d: Date | null | undefined): string | null {
	if (!d) return null;
	return d.toISOString().slice(0, 10);
}

@Injectable()
export class TasksService {
	private readonly logger = new Logger(TasksService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly ctx: RequestContextService,
		private readonly access: ModuleAccessService,
	) {}

	private formatTaskResponse(row: any, ownerSuggestion?: OwnerSuggestionDto | null) {
		const base = {
			...row,
			date: toDateStr(row.date) ?? row.date,
			publishDate: toDateStr(row.publishDate) ?? null,
			dueDate: toDateStr(row.dueDate) ?? null,
			isProvisionalPublishDate: row.isProvisionalPublishDate ?? false,
			isProvisionalDueDate: row.isProvisionalDueDate ?? false,
			convertedToPostAt: row.convertedToPostAt ? row.convertedToPostAt.toISOString() : null,
		};
		if (ownerSuggestion?.shouldSuggestOwnerChange) {
			return { ...base, ownerSuggestion };
		}
		return base;
	}

	/**
	 * Sugestão de troca de responsável após transição (não persiste). Omitida em kanban drag.
	 */
	/** Não deve derrubar PATCH/PUT de status: falhas aqui viravam 500 para o cliente. */
	private async safeComputeOwnerSuggestionAfterPostTransition(
		row: {
			clientId: string | null;
			postType: string | null;
			category: string | null;
			bornAsForecast: boolean | null;
			ownerUserId: string | null;
			statusId: string;
			currentActionId: string | null;
		},
		changeSource?: string | null,
	): Promise<OwnerSuggestionDto | undefined> {
		try {
			return await this.computeOwnerSuggestionAfterPostTransition(row, changeSource);
		} catch (err) {
			this.logger.warn(`owner suggestion skipped after transition: ${err}`);
			return undefined;
		}
	}

	private async computeOwnerSuggestionAfterPostTransition(
		row: {
			clientId: string | null;
			postType: string | null;
			category: string | null;
			bornAsForecast: boolean | null;
			ownerUserId: string | null;
			statusId: string;
			currentActionId: string | null;
		},
		changeSource?: string | null,
	): Promise<OwnerSuggestionDto | undefined> {
		if (changeSource === 'kanban_drag') {
			return undefined;
		}
		const agencyId = this.ctx.get()?.agencyId!;
		const agency = await this.prisma.agency.findUnique({
			where: { id: agencyId },
			select: { mode: true, defaultOwnerStrategy: true, allowStageOwners: true },
		});
		if (!agency || agency.mode === 'SOLO') {
			return undefined;
		}
		const isForecast = row.category === 'forecast' || row.bornAsForecast === true;
		const isRealPost = !!row.clientId && !!row.postType && !isForecast;
		if (!isRealPost) {
			return undefined;
		}
		const stageKey = mapPostTaskStateToClientStageKey(row.statusId, row.currentActionId);
		if (!stageKey) {
			return undefined;
		}
		const usersRows = await getAgencyEligibleUsers(this.prisma, agencyId);
		const agencySlice: AgencySliceForClientOwner = {
			mode: agency.mode ?? 'TEAM',
			defaultOwnerStrategy: agency.defaultOwnerStrategy ?? 'AGENCY_OWNER',
			allowStageOwners: agency.allowStageOwners ?? false,
		};
		let clientJson: unknown | null = null;
		const c = await this.prisma.client.findFirst({
			where: { id: row.clientId!, agencyId },
		});
		if (c != null && 'clientOwnerPreferencesJson' in c) {
			clientJson = (c as { clientOwnerPreferencesJson?: unknown }).clientOwnerPreferencesJson ?? null;
		}
		const suggestedOwnerUserId = resolveResponsibleUser({
			stageKey,
			client: { clientOwnerPreferencesJson: clientJson },
			agency: agencySlice,
			users: usersRows,
		});
		return buildOwnerSuggestionPayload(stageKey, row.ownerUserId, suggestedOwnerUserId);
	}

	private rowToOwnerSuggestionInput(row: {
		clientId: string | null;
		postType: string | null;
		category: string | null;
		bornAsForecast: boolean | null;
		ownerUserId: string | null;
		statusId: string;
		currentActionId: string | null;
	}) {
		return {
			clientId: row.clientId,
			postType: row.postType,
			category: row.category,
			bornAsForecast: row.bornAsForecast,
			ownerUserId: row.ownerUserId,
			statusId: row.statusId,
			currentActionId: row.currentActionId,
		};
	}

	private async recordStatusHistory(
		tx: Prisma.TransactionClient,
		params: {
			taskId: string;
			statusId: string;
			userId: string | null;
			changeSource?: string | null;
			currentActionId?: string | null;
			detailJson?: Prisma.InputJsonValue | null;
		},
	) {
		const detailPayload =
			params.detailJson === undefined
				? {}
				: {
						detailJson:
							params.detailJson === null ? Prisma.JsonNull : params.detailJson,
				  };
		await tx.taskStatusHistory.create({
			data: {
				taskId: params.taskId,
				statusId: params.statusId,
				currentActionId: params.currentActionId ?? null,
				userId: params.userId,
				changeSource: normalizeTaskStatusChangeSourceForStorage(params.changeSource),
				...detailPayload,
			},
		});
	}

	private async recordExecutionOwnerAutoHistory(
		tx: Prisma.TransactionClient,
		params: {
			taskId: string;
			statusId: string;
			currentActionId: string | null;
			actorUserId: string | null;
			executionOwnerUserId: string;
			executionOwnerName: string | null | undefined;
		},
	) {
		await tx.taskStatusHistory.create({
			data: {
				taskId: params.taskId,
				statusId: params.statusId,
				currentActionId: params.currentActionId,
				userId: params.actorUserId,
				changeSource: normalizeTaskStatusChangeSourceForStorage('execution_owner_auto'),
				detailJson: {
					type: 'execution_owner',
					userId: params.executionOwnerUserId,
					userName: params.executionOwnerName ?? '',
				},
			},
		});
	}

	/**
	 * Modo solo (operationMode): não atribui execution owner.
	 * Previsões/forecast: não atribui.
	 * Post real ou tarefa geral (sem postType): atribui quando há função mapeada para o substatus.
	 */
	private async computeExecutionOwnerAssignment(row: {
		clientId: string | null;
		postType: string | null;
		category: string | null;
		bornAsForecast: boolean | null;
		statusId: string;
		currentActionId: string | null;
		createdByUserId: string | null;
	}): Promise<{ userId: string | null; fullName: string | null }> {
		const agencyId = this.ctx.get()?.agencyId!;
		const agency = await this.prisma.agency.findUnique({
			where: { id: agencyId },
			select: {
				operationMode: true,
				mode: true,
				defaultOwnerStrategy: true,
				allowStageOwners: true,
			},
		});
		if (!agency || agency.operationMode === 'solo') {
			return { userId: null, fullName: null };
		}

		const isForecast = row.category === 'forecast' || row.bornAsForecast === true;
		if (isForecast) {
			return { userId: null, fullName: null };
		}

		const isClientPost = !!(row.clientId && row.postType);
		const isGeneralTask = !row.postType;
		if (!isClientPost && !isGeneralTask) {
			return { userId: null, fullName: null };
		}

		const users = await this.prisma.user.findMany({
			where: { agencyId, deletedAt: null, inviteStatus: 'active' },
			select: {
				id: true,
				fullName: true,
				userFunctions: true,
				operationalRole: true,
				email: true,
				role: true,
				deletedAt: true,
				canBeTaskOwner: true,
				canBePostOwner: true,
			},
		});
		const members = toExecutionMembersFromPrisma(users);
		const eligibleRows = users as unknown as UserEligibilityRow[];

		let clientOwnerUserId: string | null = null;
		if (row.clientId) {
			const c = await this.prisma.client.findFirst({
				where: { id: row.clientId, agencyId },
				select: { clientOwnerPreferencesJson: true },
			});
			const agencySlice: AgencySliceForClientOwner = {
				mode: agency.mode ?? 'TEAM',
				defaultOwnerStrategy: agency.defaultOwnerStrategy ?? 'AGENCY_OWNER',
				allowStageOwners: agency.allowStageOwners ?? false,
			};
			clientOwnerUserId = resolveClientOwnerForExecution(
				c?.clientOwnerPreferencesJson ?? null,
				eligibleRows,
				agencySlice,
			);
		}

		let uid = resolveExecutionOwner({
			currentActionId: row.currentActionId,
			statusId: row.statusId,
			clientId: row.clientId,
			createdByUserId: row.createdByUserId,
			agencyMembers: members,
			clientOwnerUserId,
		});
		/** Tarefa geral: substatus muitas vezes não mapeia em ACTION_TO_FUNCTION — ainda assim exibir “em execução por” (criador). */
		if (!uid && isGeneralTask && row.createdByUserId) {
			const creator = users.find((x) => x.id === row.createdByUserId);
			if (creator) uid = creator.id;
		}
		if (!uid) {
			return { userId: null, fullName: null };
		}
		const u = users.find((x) => x.id === uid);
		return { userId: uid, fullName: u?.fullName?.trim() ?? null };
	}

	private parseWorkflowStatusMap(statusesJson: unknown): Map<string, { id: string; nameKey: string }> {
		const map = new Map<string, { id: string; nameKey: string }>();
		if (statusesJson == null) return map;
		let arr: unknown[] = [];
		if (Array.isArray(statusesJson)) {
			arr = statusesJson;
		} else if (typeof statusesJson === 'string') {
			try {
				const p = JSON.parse(statusesJson) as unknown;
				if (Array.isArray(p)) arr = p;
			} catch {
				return map;
			}
		}
		for (const s of arr) {
			if (s && typeof s === 'object' && 'id' in (s as object)) {
				const raw = s as { id: unknown; nameKey?: unknown };
				const id = String(raw.id);
				map.set(id, { id, nameKey: String(raw.nameKey ?? id) });
			}
		}
		return map;
	}

	async getStatusHistory(taskId: string) {
		const agencyId = this.ctx.get()?.agencyId!;

		const task = await this.prisma.task.findFirst({
			where: { id: taskId, agencyId },
			select: {
				id: true,
				workflowId: true,
				clientId: true,
				postType: true,
				category: true,
				bornAsForecast: true,
				origin: true,
			},
		});
		if (!task) {
			throw new Error('Task not found');
		}
		await this.access.assertTaskView(taskAccessFromPrismaRow(task));

		const history = await this.prisma.taskStatusHistory.findMany({
			where: { taskId },
			orderBy: { changedAt: 'asc' },
		});

		const userIds = [...new Set(history.map((h) => h.userId).filter(Boolean))] as string[];
		const users =
			userIds.length > 0
				? await this.prisma.user.findMany({
						where: { id: { in: userIds }, agencyId },
						select: { id: true, fullName: true, email: true, avatarUrl: true },
				  })
				: [];
		const userMap = new Map(users.map((u) => [u.id, u]));

		const wf = await this.prisma.workflow.findFirst({
			where: { id: task.workflowId, agencyId },
			select: { statusesJson: true },
		});
		const statusMap = this.parseWorkflowStatusMap(wf?.statusesJson ?? null);

		const items = history.map((h) => ({
			id: h.id,
			taskId: h.taskId,
			statusId: h.statusId,
			currentActionId: h.currentActionId ?? null,
			changedAt: h.changedAt.toISOString(),
			userId: h.userId,
			changeSource: normalizeTaskStatusChangeSourceForResponse(h.changeSource),
			detailJson: h.detailJson ?? null,
			status: statusMap.get(h.statusId) ?? null,
			user: h.userId ? userMap.get(h.userId) ?? null : null,
		}));

		return { taskId: task.id, workflowId: task.workflowId, items };
	}

	/**
	 * Resumo agregado para a Central Inteligente (tarefas gerais e/ou posts).
	 * Cada seção é calculada apenas quando o workflow correspondente é informado.
	 */
	async summary(input: {
		generalWorkflowId?: string;
		clientWorkflowId?: string;
		wipThreshold?: number;
		staleProductionDays?: number;
	}): Promise<{
		general?: {
			overdueCount: number;
			unassignedActiveCount: number;
			wipCount: number;
			todayStr: string;
			wipThreshold: number;
			generalWorkflowId: string | null;
			generalWorkflowResolved: boolean;
		};
		posts?: {
			overdueCount: number;
			approvedPendingCount: number;
			unassignedActiveCount: number;
			staleProductionCount: number;
			todayStr: string;
			staleProductionDays: number;
			clientWorkflowId: string | null;
			clientWorkflowResolved: boolean;
		};
	}> {
		await this.access.assertAnyView(['tasks', 'posts', 'planning', 'agenda']);
		const agencyId = this.ctx.get()?.agencyId!;
		const today = new Date();
		const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
		const todayDate = new Date(`${todayStr}T00:00:00`);
		const wipThreshold = Math.max(1, input.wipThreshold ?? 8);
		const staleProductionDays = Math.max(1, input.staleProductionDays ?? 14);
		const staleDate = new Date(todayDate);
		staleDate.setDate(staleDate.getDate() - staleProductionDays);

		const result: {
			general?: {
				overdueCount: number;
				unassignedActiveCount: number;
				wipCount: number;
				todayStr: string;
				wipThreshold: number;
				generalWorkflowId: string | null;
				generalWorkflowResolved: boolean;
			};
			posts?: {
				overdueCount: number;
				approvedPendingCount: number;
				unassignedActiveCount: number;
				staleProductionCount: number;
				todayStr: string;
				staleProductionDays: number;
				clientWorkflowId: string | null;
				clientWorkflowResolved: boolean;
			};
		} = {};

		const generalWorkflowIdRaw = (input.generalWorkflowId || '').trim();
		if (generalWorkflowIdRaw) {
			result.general = await this.summaryGeneralSection(
				agencyId,
				generalWorkflowIdRaw,
				todayStr,
				todayDate,
				wipThreshold,
			);
		}

		const clientWorkflowIdRaw = (input.clientWorkflowId || '').trim();
		if (clientWorkflowIdRaw) {
			result.posts = await this.summaryPostsSection(
				agencyId,
				clientWorkflowIdRaw,
				todayStr,
				todayDate,
				staleDate,
				staleProductionDays,
			);
		}

		return result;
	}

	private async summaryGeneralSection(
		agencyId: string,
		generalWorkflowIdRaw: string,
		todayStr: string,
		todayDate: Date,
		wipThreshold: number,
	) {
		const emptyCounts = {
			overdueCount: 0,
			unassignedActiveCount: 0,
			wipCount: 0,
			todayStr,
			wipThreshold,
			generalWorkflowId: generalWorkflowIdRaw,
			generalWorkflowResolved: false,
		};

		const wf = await this.prisma.workflow.findFirst({
			where: { id: generalWorkflowIdRaw, agencyId },
			select: { id: true, statusesJson: true },
		});
		if (!wf) {
			return emptyCounts;
		}

		const { doneIds, inProgressIds } = this.classifyWorkflowStatuses(wf.statusesJson);
		const doneFilter = doneIds.length > 0 ? { notIn: doneIds } : undefined;
		const baseWhere = { agencyId, workflowId: generalWorkflowIdRaw };

		const [overdueCount, unassignedActiveCount, wipCount] = await this.prisma.$transaction([
			this.prisma.task.count({
				where: {
					...baseWhere,
					date: { lt: todayDate },
					...(doneFilter ? { statusId: doneFilter } : {}),
				},
			}),
			this.prisma.task.count({
				where: {
					...baseWhere,
					ownerUserId: null,
					...(doneFilter ? { statusId: doneFilter } : {}),
				},
			}),
			inProgressIds.length > 0
				? this.prisma.task.count({
						where: { ...baseWhere, statusId: { in: inProgressIds } },
				  })
				: this.prisma.task.count({ where: { id: '__never__' } }),
		]);

		return {
			overdueCount,
			unassignedActiveCount,
			wipCount,
			todayStr,
			wipThreshold,
			generalWorkflowId: generalWorkflowIdRaw,
			generalWorkflowResolved: true,
		};
	}

	/** Posts reais: com cliente, tipo de post e fora de previsão/forecast. */
	private realPostBaseWhere(agencyId: string, clientWorkflowId: string) {
		return {
			agencyId,
			workflowId: clientWorkflowId,
			postType: { not: null },
			clientId: { not: null },
			NOT: {
				OR: [{ category: 'forecast' }, { bornAsForecast: true }],
			},
		};
	}

	private async summaryPostsSection(
		agencyId: string,
		clientWorkflowIdRaw: string,
		todayStr: string,
		todayDate: Date,
		staleDate: Date,
		staleProductionDays: number,
	) {
		const emptyCounts = {
			overdueCount: 0,
			approvedPendingCount: 0,
			unassignedActiveCount: 0,
			staleProductionCount: 0,
			todayStr,
			staleProductionDays,
			clientWorkflowId: clientWorkflowIdRaw,
			clientWorkflowResolved: false,
		};

		const wf = await this.prisma.workflow.findFirst({
			where: { id: clientWorkflowIdRaw, agencyId },
			select: { id: true, statusesJson: true },
		});
		if (!wf) {
			return emptyCounts;
		}

		const { doneIds } = this.classifyWorkflowStatuses(wf.statusesJson);
		const activeStatusFilter =
			doneIds.length > 0 ? { statusId: { notIn: doneIds } } : {};

		const baseWhere = this.realPostBaseWhere(agencyId, clientWorkflowIdRaw);

		const [overdueCount, approvedPendingCount, unassignedActiveCount, staleProductionCount] =
			await this.prisma.$transaction([
				this.prisma.task.count({
					where: {
						...baseWhere,
						date: { lt: todayDate },
						...activeStatusFilter,
					},
				}),
				this.prisma.task.count({
					where: {
						...baseWhere,
						statusId: 'aprovado',
					},
				}),
				this.prisma.task.count({
					where: {
						...baseWhere,
						ownerUserId: null,
						...activeStatusFilter,
					},
				}),
				this.prisma.task.count({
					where: {
						...baseWhere,
						statusId: 'em_producao',
						date: { lt: staleDate },
					},
				}),
			]);

		return {
			overdueCount,
			approvedPendingCount,
			unassignedActiveCount,
			staleProductionCount,
			todayStr,
			staleProductionDays,
			clientWorkflowId: clientWorkflowIdRaw,
			clientWorkflowResolved: true,
		};
	}

	/**
	 * Classifica statuses do workflow geral a partir do `statusesJson` cru.
	 * Padrão do schema atual: itens com `category: 'done'` são conclusão; `category: 'todo'`
	 * é coluna inicial; demais são tratados como "em andamento" para fins de WIP.
	 */
	private classifyWorkflowStatuses(statusesJson: unknown): {
		doneIds: string[];
		inProgressIds: string[];
	} {
		const doneIds: string[] = [];
		const inProgressIds: string[] = [];
		let arr: unknown[] = [];
		if (Array.isArray(statusesJson)) {
			arr = statusesJson;
		} else if (typeof statusesJson === 'string') {
			try {
				const p = JSON.parse(statusesJson) as unknown;
				if (Array.isArray(p)) arr = p;
			} catch {
				return { doneIds, inProgressIds };
			}
		}
		for (const s of arr) {
			if (!s || typeof s !== 'object' || !('id' in (s as object))) continue;
			const raw = s as { id: unknown; category?: unknown };
			const id = String(raw.id);
			const category = typeof raw.category === 'string' ? raw.category : '';
			if (category === 'done') {
				doneIds.push(id);
			} else if (category !== 'todo') {
				inProgressIds.push(id);
			}
		}
		return { doneIds, inProgressIds };
	}

	async list(
		filters: {
			clientId?: string;
			postType?: string;
			statusId?: string;
			startDate?: string;
			endDate?: string;
			ownerUserId?: string;
		},
		page: number,
		pageSize: number,
	) {
		await this.access.assertAnyView(['posts', 'tasks', 'planning', 'agenda']);
		const where = {
			clientId: filters.clientId,
			postType: (filters.postType as any) || undefined,
			statusId: filters.statusId,
			ownerUserId: filters.ownerUserId || undefined,
			date:
				filters.startDate || filters.endDate
					? {
							gte: filters.startDate ? new Date(filters.startDate) : undefined,
							lte: filters.endDate ? new Date(filters.endDate) : undefined,
					  }
					: undefined,
		} as any;
		const skip = (page - 1) * pageSize;
		const [rows, total] = await this.prisma.$transaction([
			this.prisma.task.findMany({
				where,
				orderBy: [{ date: 'asc' }, { title: 'asc' }],
				skip,
				take: pageSize,
			}),
			this.prisma.task.count({ where }),
		]);
		const enrichedRows = await this.enrichRowsWithComputedGestorExecutionOwner(rows);
		const items = enrichedRows.map((row: any) => this.formatTaskResponse(row));
		return { items, total, page, pageSize };
	}

	/** Primeira previsão disponível no dia (cliente + data) para consumo ao criar post real. */
	private async findConsumableForecast(
		agencyId: string,
		clientId: string,
		publishDateStr: string,
	) {
		const publishDate = new Date(`${publishDateStr}T00:00:00`);
		return this.prisma.task.findFirst({
			where: {
				agencyId,
				clientId,
				postType: null,
				OR: [{ category: 'forecast' }, { bornAsForecast: true }],
				publishDate,
			},
			orderBy: { id: 'asc' },
		});
	}

	/** Converte previsão existente com payload de criação de post (mantém id e histórico). */
	private async convertForecastWithCreatePayload(
		existing: {
			id: string;
			convertedToPostAt: Date | null;
		},
		createData: Record<string, unknown>,
		userId: string,
		nextExecOnCreate: { userId: string | null; fullName: string | null },
	) {
		const convertedFromForecast = !existing.convertedToPostAt;
		const updateData: Record<string, unknown> = {
			title: createData.title,
			postType: createData.postType,
			workflowId: createData.workflowId,
			statusId: createData.statusId,
			description: createData.description,
			ownerUserId: createData.ownerUserId,
			origin: createData.origin,
			date: createData.date,
			publishDate: createData.publishDate,
			isProvisionalPublishDate: createData.isProvisionalPublishDate,
			currentActionId: createData.currentActionId,
			executionOwnerUserId: createData.executionOwnerUserId,
			category: null,
			bornAsForecast: false,
		};
		if (convertedFromForecast) {
			updateData.convertedToPostAt = new Date();
		}

		const updated = await this.prisma.$transaction(async (tx) => {
			const row = await tx.task.update({
				where: { id: existing.id },
				data: updateData,
			});
			await this.recordStatusHistory(tx, {
				taskId: existing.id,
				statusId: row.statusId,
				userId,
				changeSource: convertedFromForecast ? 'convert_forecast' : 'update',
				currentActionId: row.currentActionId ?? null,
			});
			if (nextExecOnCreate.userId) {
				await this.recordExecutionOwnerAutoHistory(tx, {
					taskId: existing.id,
					statusId: row.statusId,
					currentActionId: row.currentActionId ?? null,
					actorUserId: userId,
					executionOwnerUserId: nextExecOnCreate.userId,
					executionOwnerName: nextExecOnCreate.fullName,
				});
			}
			return row;
		});

		return this.formatTaskResponse(updated);
	}

	async create(data: CreateTaskDto) {
		const agencyId = this.ctx.get()?.agencyId!;
		const userId = this.ctx.get()?.userId!;

		await this.access.assertTaskEdit(taskAccessFromCreatePayload(data));

		const agency = await this.prisma.agency.findUnique({
			where: { id: agencyId },
			select: {
				mode: true,
				defaultOwnerStrategy: true,
				allowStageOwners: true,
			},
		});
		if (!agency) {
			throw new Error('Agency not found');
		}

		const safeTitle = (data.title || '').trim();
		const safePostType = (data.postType ?? null) as any;
		const hasClient = !!(data.clientId && String(data.clientId).trim());
		const isForecastItem = data.category === 'forecast' || data.bornAsForecast === true;
		const isRealPost = hasClient && safePostType != null && !isForecastItem;

		/** Tarefa geral pode ter `clientId` opcional sem `postType`; só post real exige tipo. */

		let mainDateStr: string;
		if (isRealPost || isForecastItem) {
			mainDateStr = (data.publishDate || data.date || '').slice(0, 10);
			if (!mainDateStr) {
				throw new Error('Data de publicação é obrigatória para post ou previsão vinculada a cliente.');
			}
		} else {
			mainDateStr = (data.dueDate || data.date || '').slice(0, 10);
			if (!mainDateStr) {
				throw new Error('Previsão de entrega é obrigatória para tarefa.');
			}
		}
		const parsedDate = new Date(`${mainDateStr}T00:00:00`);

		let ownerUserId: string | null = null;
		if (agency.mode === 'SOLO') {
			ownerUserId = userId;
		} else {
			const usersRows = await getAgencyEligibleUsers(this.prisma, agencyId);
			const agencySlice: AgencySliceForClientOwner = {
				mode: agency.mode ?? 'TEAM',
				defaultOwnerStrategy: agency.defaultOwnerStrategy ?? 'AGENCY_OWNER',
				allowStageOwners: agency.allowStageOwners ?? false,
			};
			const requested =
				data.ownerUserId != null && String(data.ownerUserId).trim() !== ''
					? String(data.ownerUserId).trim()
					: null;
			if (requested && validateClientOwnerAgainstAgencyEligibility(requested, usersRows)) {
				ownerUserId = requested;
			} else {
				let clientJson: unknown | null = null;
				if (hasClient && data.clientId) {
					const c = await this.prisma.client.findFirst({
						where: { id: data.clientId, agencyId },
					});
					clientJson =
						c != null && 'clientOwnerPreferencesJson' in c
							? ((c as { clientOwnerPreferencesJson?: unknown }).clientOwnerPreferencesJson ?? null)
							: null;
				}
				ownerUserId = resolveResponsibleUser({
					stageKey: CLIENT_INITIAL_OWNER_STAGE_KEY,
					client: { clientOwnerPreferencesJson: clientJson },
					agency: agencySlice,
					users: usersRows,
				});
				this.logger.debug(
					`owner auto-resolved: clientId=${hasClient && data.clientId ? data.clientId : 'null'} stageKey=${CLIENT_INITIAL_OWNER_STAGE_KEY} resolvedOwnerUserId=${ownerUserId ?? 'null'}`,
				);
			}
		}

		const createData: any = {
			agencyId,
			clientId: hasClient ? data.clientId : null,
			title: safeTitle,
			date: parsedDate,
			postType: isForecastItem ? null : safePostType,
			workflowId: data.workflowId,
			statusId: data.statusId,
			description: data.description ?? null,
			category: data.category ?? null,
			ownerUserId,
			origin: data.origin ?? null,
			bornAsForecast: isForecastItem ? (data.bornAsForecast ?? true) : (data.bornAsForecast ?? false),
			currentActionId: data.currentActionId ?? null,
			createdByUserId: userId,
		};

		const nextExecOnCreate = await this.computeExecutionOwnerAssignment({
			clientId: createData.clientId,
			postType: createData.postType,
			category: createData.category,
			bornAsForecast: createData.bornAsForecast,
			statusId: createData.statusId,
			currentActionId: createData.currentActionId,
			createdByUserId: userId,
		});
		createData.executionOwnerUserId = nextExecOnCreate.userId;

		if (isRealPost || isForecastItem) {
			createData.publishDate = parsedDate;
			createData.isProvisionalPublishDate = data.isProvisionalPublishDate ?? false;
		} else {
			createData.dueDate = parsedDate;
			createData.isProvisionalDueDate = data.isProvisionalDueDate ?? false;
		}

		if (isRealPost && data.clientId) {
			const consumable = await this.findConsumableForecast(
				agencyId,
				String(data.clientId).trim(),
				mainDateStr,
			);
			if (consumable) {
				return this.convertForecastWithCreatePayload(
					consumable,
					createData,
					userId,
					nextExecOnCreate,
				);
			}
		}

		const created = await this.prisma.$transaction(async (tx) => {
			const task = await tx.task.create({ data: createData });
			await this.recordStatusHistory(tx, {
				taskId: task.id,
				statusId: task.statusId,
				userId,
				changeSource: 'create',
				currentActionId: task.currentActionId ?? null,
			});
			if (nextExecOnCreate.userId) {
				await this.recordExecutionOwnerAutoHistory(tx, {
					taskId: task.id,
					statusId: task.statusId,
					currentActionId: task.currentActionId ?? null,
					actorUserId: userId,
					executionOwnerUserId: nextExecOnCreate.userId,
					executionOwnerName: nextExecOnCreate.fullName,
				});
			}
			return task;
		});

		return this.formatTaskResponse(created);
	}

	async update(id: string, data: UpdateTaskDto) {
		const agencyId = this.ctx.get()?.agencyId!;
		const userId = this.ctx.get()?.userId!;

		const existing = await this.prisma.task.findFirst({
			where: { id, agencyId },
		});
		if (!existing) {
			throw new Error('Task not found');
		}

		const nextAccess = taskAccessFromPrismaRow({
			clientId: data.clientId !== undefined ? data.clientId : existing.clientId,
			postType:
				data.postType !== undefined ? (data.postType as string | null) : existing.postType,
			category: data.category !== undefined ? data.category : existing.category,
			bornAsForecast:
				data.bornAsForecast !== undefined ? data.bornAsForecast : existing.bornAsForecast,
			origin: data.origin !== undefined ? data.origin : existing.origin,
		});
		await this.access.assertTaskEdit(nextAccess);

		const agency = await this.prisma.agency.findUnique({
			where: { id: agencyId },
			select: { mode: true },
		});

		const updateData: any = {};

		if (data.clientId !== undefined) updateData.clientId = data.clientId;
		if (data.title !== undefined) updateData.title = data.title;
		if (data.postType !== undefined) updateData.postType = data.postType as any;
		if (data.workflowId !== undefined) updateData.workflowId = data.workflowId;
		if (data.statusId !== undefined) updateData.statusId = data.statusId;
		if (data.description !== undefined) updateData.description = data.description;
		if (data.category !== undefined) updateData.category = data.category;
		if (data.origin !== undefined) updateData.origin = data.origin;
		if (data.bornAsForecast !== undefined) updateData.bornAsForecast = data.bornAsForecast;
		if (data.currentActionId !== undefined) updateData.currentActionId = data.currentActionId;

		if (data.publishDate !== undefined) {
			const d = new Date((data.publishDate || '').slice(0, 10) + 'T00:00:00');
			updateData.date = d;
			updateData.publishDate = d;
			updateData.isProvisionalPublishDate = data.isProvisionalPublishDate ?? false;
		} else if (data.dueDate !== undefined) {
			const d = new Date((data.dueDate || '').slice(0, 10) + 'T00:00:00');
			updateData.date = d;
			updateData.dueDate = d;
			updateData.isProvisionalDueDate = data.isProvisionalDueDate ?? false;
		} else if (data.date !== undefined) {
			updateData.date = new Date((data.date || '').slice(0, 10) + 'T00:00:00');
		}

		if (agency?.mode === 'SOLO') {
			updateData.ownerUserId = userId;
		} else if (data.ownerUserId !== undefined) {
			updateData.ownerUserId = data.ownerUserId;
		}

		const nextClientId = data.clientId !== undefined ? data.clientId : existing.clientId;
		const nextPostType = data.postType !== undefined ? data.postType : existing.postType;
		const wasForecast = existing.bornAsForecast === true || existing.category === 'forecast';
		const becomesRealPost = !!(nextClientId && nextPostType);

		if (wasForecast && becomesRealPost) {
			if (!existing.convertedToPostAt) {
				updateData.convertedToPostAt = new Date();
			}
			if (data.category === undefined && existing.category === 'forecast') {
				updateData.category = null;
			}
		}

		const nextStatusId =
			data.statusId !== undefined ? data.statusId : existing.statusId;
		const statusChanged = nextStatusId !== existing.statusId;

		let proposedAction: string | null =
			data.currentActionId !== undefined
				? (data.currentActionId as string | null)
				: (existing.currentActionId ?? null);
		const nextCat = data.category !== undefined ? data.category : existing.category;
		const nextBorn = data.bornAsForecast !== undefined ? data.bornAsForecast : existing.bornAsForecast;
		const isForecastNorm = nextCat === 'forecast' || nextBorn === true;
		if (statusChanged && !isForecastNorm && !!(nextClientId && nextPostType)) {
			const pa = proposedAction;
			const step = pa ? POST_CLIENT_LINEAR.find((s) => s.actionId === pa) : null;
			if (!step || step.statusId !== nextStatusId) {
				proposedAction = resolveDefaultActionId(
					{
						clientId: nextClientId,
						postType: nextPostType as string | null,
						category: nextCat as string | null,
					},
					nextStatusId,
				);
				updateData.currentActionId = proposedAction;
			}
		}

		const actionChanged = (proposedAction ?? null) !== (existing.currentActionId ?? null);

		/** Só no primeiro momento em que a previsão vira post (evita duplicar convert_forecast em PUTs seguintes). */
		const convertedFromForecast =
			wasForecast && becomesRealPost && !existing.convertedToPostAt;

		if (
			Object.keys(updateData).length === 0 &&
			!statusChanged &&
			!convertedFromForecast &&
			!actionChanged
		) {
			return this.formatTaskResponse(existing);
		}

		const mergedCategoryForExec =
			convertedFromForecast && existing.category === 'forecast' && data.category === undefined
				? null
				: data.category !== undefined
					? data.category
					: existing.category;
		const mergedBornForExec =
			data.bornAsForecast !== undefined ? data.bornAsForecast : existing.bornAsForecast;
		const mergedActionForExec = proposedAction;

		const shouldRecomputeExecution = statusChanged || actionChanged || convertedFromForecast;
		let nextExecution = { userId: null as string | null, fullName: null as string | null };
		const prevExecution = existing.executionOwnerUserId ?? null;
		if (shouldRecomputeExecution) {
			nextExecution = await this.computeExecutionOwnerAssignment({
				clientId: nextClientId,
				postType: nextPostType,
				category: mergedCategoryForExec,
				bornAsForecast: mergedBornForExec,
				statusId: nextStatusId,
				currentActionId: mergedActionForExec ?? null,
				createdByUserId: existing.createdByUserId ?? userId,
			});
			if (nextExecution.userId !== prevExecution) {
				updateData.executionOwnerUserId = nextExecution.userId;
			}
		}

		const updated = await this.prisma.$transaction(async (tx) => {
			const row = await tx.task.update({
				where: { id },
				data: updateData,
			});
			// Usar nextStatusId (computado antes da transação) em vez de row.statusId:
			// row.statusId pode ser undefined no retorno do Prisma em certas versões com
			// transações interativas, causando falha no create do TaskStatusHistory.
			if (statusChanged) {
				await this.recordStatusHistory(tx, {
					taskId: id,
					statusId: nextStatusId,
					userId,
					changeSource: convertedFromForecast ? 'convert_forecast' : 'update',
					currentActionId: row.currentActionId ?? null,
				});
			} else if (convertedFromForecast) {
				await this.recordStatusHistory(tx, {
					taskId: id,
					statusId: nextStatusId,
					userId,
					changeSource: 'convert_forecast',
					currentActionId: row.currentActionId ?? null,
				});
			} else if (actionChanged) {
				await this.recordStatusHistory(tx, {
					taskId: id,
					statusId: nextStatusId,
					userId,
					changeSource: 'substatus_change',
					currentActionId: row.currentActionId ?? null,
				});
			}
			if (
				shouldRecomputeExecution &&
				nextExecution.userId &&
				nextExecution.userId !== prevExecution
			) {
				// Mesmo motivo de recordStatusHistory: não usar row.statusId (pode vir incompleto no retorno do update na transação).
				const actionForHistory = row.currentActionId ?? proposedAction ?? null;
				await this.recordExecutionOwnerAutoHistory(tx, {
					taskId: id,
					statusId: nextStatusId,
					currentActionId: actionForHistory,
					actorUserId: userId,
					executionOwnerUserId: nextExecution.userId,
					executionOwnerName: nextExecution.fullName,
				});
			}
			return row;
		});

		let ownerSuggestion: OwnerSuggestionDto | undefined;
		if (statusChanged || actionChanged) {
			ownerSuggestion = await this.safeComputeOwnerSuggestionAfterPostTransition(
				this.rowToOwnerSuggestionInput(updated),
				null,
			);
		}
		return this.formatTaskResponse(updated, ownerSuggestion);
	}

	async remove(id: string) {
		const agencyId = this.ctx.get()?.agencyId!;
		const row = await this.prisma.task.findFirst({
			where: { id, agencyId },
			select: {
				clientId: true,
				postType: true,
				category: true,
				bornAsForecast: true,
				origin: true,
			},
		});
		if (!row) throw new Error('Task not found');
		await this.access.assertTaskEdit(taskAccessFromPrismaRow(row));
		return this.prisma.task.delete({ where: { id } });
	}

	async moveDate(id: string, dateStr: string) {
		const agencyId = this.ctx.get()?.agencyId!;
		const parsed = new Date((dateStr || '').slice(0, 10) + 'T00:00:00');
		const task = await this.prisma.task.findFirst({
			where: { id, agencyId },
			select: {
				clientId: true,
				postType: true,
				category: true,
				bornAsForecast: true,
				origin: true,
			},
		});
		if (!task) throw new Error('Task not found');
		await this.access.assertTaskEdit(taskAccessFromPrismaRow(task));
		const data: { date: Date; publishDate?: Date; dueDate?: Date } = { date: parsed };
		if (task.clientId) data.publishDate = parsed;
		else data.dueDate = parsed;
		const updated = await this.prisma.task.update({
			where: { id },
			data,
		});
		return this.formatTaskResponse(updated);
	}

	async moveStatus(id: string, statusId: string, changeSource?: string | null, currentActionId?: string | null) {
		const agencyId = this.ctx.get()?.agencyId!;
		const userId = this.ctx.get()?.userId!;

		const existing = await this.prisma.task.findFirst({
			where: { id, agencyId },
		});
		if (!existing) {
			throw new Error('Task not found');
		}

		await this.access.assertTaskEdit(taskAccessFromPrismaRow(existing));

		if (existing.statusId === statusId) {
			const nextAction =
				currentActionId === undefined ? existing.currentActionId : currentActionId;
			if ((existing.currentActionId ?? null) === (nextAction ?? null)) {
				return this.formatTaskResponse(existing);
			}
			const prevExecution = existing.executionOwnerUserId ?? null;
			const nextExecution = await this.computeExecutionOwnerAssignment({
				clientId: existing.clientId,
				postType: existing.postType,
				category: existing.category,
				bornAsForecast: existing.bornAsForecast,
				statusId: existing.statusId,
				currentActionId: nextAction ?? null,
				createdByUserId: existing.createdByUserId ?? userId,
			});
			const sameStatusUpdate: Record<string, unknown> = { currentActionId: nextAction ?? null };
			if (nextExecution.userId !== prevExecution) {
				sameStatusUpdate.executionOwnerUserId = nextExecution.userId;
			}
			const updatedSameStatus = await this.prisma.$transaction(async (tx) => {
				const row = await tx.task.update({
					where: { id },
					data: sameStatusUpdate as any,
				});
				await this.recordStatusHistory(tx, {
					taskId: id,
					statusId: existing.statusId,
					userId,
					changeSource: 'substatus_change',
					currentActionId: row.currentActionId ?? null,
				});
				if (nextExecution.userId && nextExecution.userId !== prevExecution) {
					await this.recordExecutionOwnerAutoHistory(tx, {
						taskId: id,
						statusId: existing.statusId,
						currentActionId: row.currentActionId ?? null,
						actorUserId: userId,
						executionOwnerUserId: nextExecution.userId,
						executionOwnerName: nextExecution.fullName,
					});
				}
				return row;
			});
			const ownerSuggestionSame = await this.safeComputeOwnerSuggestionAfterPostTransition(
				this.rowToOwnerSuggestionInput(updatedSameStatus),
				changeSource,
			);
			return this.formatTaskResponse(updatedSameStatus, ownerSuggestionSame);
		}

		let resolvedAction: string | null;
		if (currentActionId !== undefined && currentActionId !== null) {
			resolvedAction = currentActionId;
		} else if (currentActionId === null) {
			resolvedAction = null;
		} else {
			resolvedAction = resolveDefaultActionId(
				{
					clientId: existing.clientId,
					postType: existing.postType,
					category: existing.category,
				},
				statusId,
			);
		}

		const prevExecutionMoved = existing.executionOwnerUserId ?? null;
		const nextExecutionMoved = await this.computeExecutionOwnerAssignment({
			clientId: existing.clientId,
			postType: existing.postType,
			category: existing.category,
			bornAsForecast: existing.bornAsForecast,
			statusId,
			currentActionId: resolvedAction,
			createdByUserId: existing.createdByUserId ?? userId,
		});
		const moveUpdate: Record<string, unknown> = { statusId, currentActionId: resolvedAction };
		if (nextExecutionMoved.userId !== prevExecutionMoved) {
			moveUpdate.executionOwnerUserId = nextExecutionMoved.userId;
		}

		const updated = await this.prisma.$transaction(async (tx) => {
			const row = await tx.task.update({
				where: { id },
				data: moveUpdate as any,
			});
			await this.recordStatusHistory(tx, {
				taskId: id,
				statusId,
				userId,
				changeSource,
				currentActionId: resolvedAction,
			});
			if (nextExecutionMoved.userId && nextExecutionMoved.userId !== prevExecutionMoved) {
				await this.recordExecutionOwnerAutoHistory(tx, {
					taskId: id,
					statusId,
					currentActionId: resolvedAction,
					actorUserId: userId,
					executionOwnerUserId: nextExecutionMoved.userId,
					executionOwnerName: nextExecutionMoved.fullName,
				});
			}
			return row;
		});

		const ownerSuggestionMoved = await this.safeComputeOwnerSuggestionAfterPostTransition(
			this.rowToOwnerSuggestionInput(updated),
			changeSource,
		);
		return this.formatTaskResponse(updated, ownerSuggestionMoved);
	}

	private getPostActionsByStatus(): Record<string, string[]> {
		return {
			pauta_criada: ['enviar_para_producao'],
			em_producao: ['enviar_para_aprovacao', 'marcar_como_publicado'],
			aguardando_aprovacao: ['aprovar', 'pedir_ajuste'],
			aprovado: ['agendar_post'],
			agendado: ['marcar_como_publicado'],
			publicado: [],
		};
	}

	async getAvailablePostActions(taskId: string): Promise<string[]> {
		const agencyId = this.ctx.get()?.agencyId!;
		const task = await this.prisma.task.findFirst({
			where: { id: taskId, agencyId },
			select: {
				id: true,
				clientId: true,
				postType: true,
				statusId: true,
				category: true,
				bornAsForecast: true,
				origin: true,
			},
		});

		if (!task) {
			throw new Error('Tarefa não encontrada');
		}

		await this.access.assertTaskView(taskAccessFromPrismaRow(task));

		if (!task.clientId || !task.postType) {
			return [];
		}

		const actionsByStatus = this.getPostActionsByStatus();
		return actionsByStatus[task.statusId] || [];
	}

	async executePostAction(taskId: string, action: string, data?: { scheduledDate?: string; platform?: string; notes?: string }) {
		const agencyId = this.ctx.get()?.agencyId!;
		const userId = this.ctx.get()?.userId!;

		const task = await this.prisma.task.findFirst({
			where: { id: taskId, agencyId },
			select: {
				id: true,
				agencyId: true,
				clientId: true,
				postType: true,
				statusId: true,
				description: true,
				category: true,
				bornAsForecast: true,
				origin: true,
				createdByUserId: true,
				executionOwnerUserId: true,
			},
		});

		if (!task) {
			throw new Error('Tarefa não encontrada');
		}

		await this.access.assertTaskEdit(taskAccessFromPrismaRow(task));

		if (!task.clientId || !task.postType) {
			throw new Error('Ações de POST só podem ser executadas em tarefas de POST');
		}

		const availableActions = await this.getAvailablePostActions(taskId);
		if (!availableActions.includes(action)) {
			throw new Error(`Ação "${action}" não é válida para o status atual "${task.statusId}"`);
		}

		const statusTransitions: Record<string, string> = {
			enviar_para_producao: 'em_producao',
			enviar_para_aprovacao: 'aguardando_aprovacao',
			aprovar: 'aprovado',
			pedir_ajuste: 'em_producao',
			agendar_post: 'agendado',
			marcar_como_publicado: 'publicado',
		};

		const newStatusId = statusTransitions[action];
		if (!newStatusId) {
			throw new Error(`Ação "${action}" não possui transição de status definida`);
		}

		if (action === 'agendar_post') {
			if (!data?.scheduledDate) {
				throw new Error('Data de agendamento é obrigatória para ação "agendar_post"');
			}
			if (!data?.platform) {
				throw new Error('Plataforma é obrigatória para ação "agendar_post"');
			}
		}

		const subAfterAction: Record<string, string | null> = {
			enviar_para_producao: 'criando_legenda',
			enviar_para_aprovacao: 'enviado_aprovacao',
			aprovar: null,
			pedir_ajuste: 'criando_legenda',
			agendar_post: 'agendando',
			marcar_como_publicado: 'publicado_final',
		};

		const updateData: any = {
			statusId: newStatusId,
			currentActionId: subAfterAction[action] ?? null,
		};

		let description = task.description || '';
		if (action === 'agendar_post' && data?.scheduledDate && data?.platform) {
			const scheduleInfo = `\n\n[Agendado] Data: ${data.scheduledDate}, Plataforma: ${data.platform}`;
			description = description + scheduleInfo;
			updateData.description = description;
		} else if (action === 'pedir_ajuste' && data?.notes) {
			const adjustmentNote = `\n\n[Ajuste solicitado] ${data.notes}`;
			description = description + adjustmentNote;
			updateData.description = description;
		}

		const prevExecutionPostAction = task.executionOwnerUserId ?? null;
		const nextExecutionPostAction = await this.computeExecutionOwnerAssignment({
			clientId: task.clientId,
			postType: task.postType,
			category: task.category,
			bornAsForecast: task.bornAsForecast,
			statusId: newStatusId,
			currentActionId: updateData.currentActionId ?? null,
			createdByUserId: task.createdByUserId ?? userId,
		});
		if (nextExecutionPostAction.userId !== prevExecutionPostAction) {
			updateData.executionOwnerUserId = nextExecutionPostAction.userId;
		}

		const result = await this.prisma.$transaction(async (tx) => {
			const row = await tx.task.update({
				where: { id: taskId },
				data: updateData,
			});
			await this.recordStatusHistory(tx, {
				taskId,
				statusId: newStatusId,
				userId,
				changeSource: 'post_action',
				currentActionId: updateData.currentActionId ?? null,
			});
			if (
				nextExecutionPostAction.userId &&
				nextExecutionPostAction.userId !== prevExecutionPostAction
			) {
				await this.recordExecutionOwnerAutoHistory(tx, {
					taskId,
					statusId: newStatusId,
					currentActionId: updateData.currentActionId ?? null,
					actorUserId: userId,
					executionOwnerUserId: nextExecutionPostAction.userId,
					executionOwnerName: nextExecutionPostAction.fullName,
				});
			}
			return row;
		});

		const ownerSuggestionPostAction = await this.safeComputeOwnerSuggestionAfterPostTransition(
			this.rowToOwnerSuggestionInput(result),
			'post_action',
		);
		return this.formatTaskResponse(result, ownerSuggestionPostAction);
	}

	/**
	 * Lista: preenche `executionOwnerUserId` só na resposta para posts na fase “gestor” (aprovação)
	 * quando o banco está null — equipes sem checkbox “Gestor” ou registros antigos.
	 * Não persiste aqui; transições via PATCH passam a gravar com os fallbacks de `resolveExecutionOwner`.
	 */
	private async enrichRowsWithComputedGestorExecutionOwner(rows: any[]): Promise<any[]> {
		const agencyId = this.ctx.get()?.agencyId!;
		const agency = await this.prisma.agency.findUnique({
			where: { id: agencyId },
			select: {
				operationMode: true,
				mode: true,
				defaultOwnerStrategy: true,
				allowStageOwners: true,
			},
		});
		if (!agency || agency.operationMode === 'solo') {
			return rows;
		}

		const indicesNeed: number[] = [];
		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];
			if (row.executionOwnerUserId) continue;
			if (row.category === 'forecast' || row.bornAsForecast === true) continue;
			if (!row.clientId || !row.postType) continue;
			if (mapSubstatusToFunction(row.currentActionId, row.statusId) !== 'gestor') continue;
			indicesNeed.push(i);
		}
		if (indicesNeed.length === 0) return rows;

		const users = await this.prisma.user.findMany({
			where: { agencyId, deletedAt: null, inviteStatus: 'active' },
			select: {
				id: true,
				fullName: true,
				userFunctions: true,
				operationalRole: true,
				role: true,
				email: true,
				deletedAt: true,
				canBeTaskOwner: true,
				canBePostOwner: true,
			},
		});
		const members = toExecutionMembersFromPrisma(users);
		const eligibleRows = users as unknown as UserEligibilityRow[];
		const agencySlice: AgencySliceForClientOwner = {
			mode: agency.mode ?? 'TEAM',
			defaultOwnerStrategy: agency.defaultOwnerStrategy ?? 'AGENCY_OWNER',
			allowStageOwners: agency.allowStageOwners ?? false,
		};

		const clientIds = [...new Set(indicesNeed.map((i) => rows[i].clientId).filter(Boolean))] as string[];
		const clientRows = await this.prisma.client.findMany({
			where: { id: { in: clientIds }, agencyId },
			select: { id: true, clientOwnerPreferencesJson: true },
		});
		const clientById = new Map(clientRows.map((c) => [c.id, c]));

		const out = rows.map((r) => ({ ...r }));
		for (const i of indicesNeed) {
			const row = rows[i];
			const c = row.clientId ? clientById.get(row.clientId) : undefined;
			const clientOwnerUserId = resolveClientOwnerForExecution(
				c?.clientOwnerPreferencesJson ?? null,
				eligibleRows,
				agencySlice,
			);
			const uid = resolveExecutionOwner({
				currentActionId: row.currentActionId,
				statusId: row.statusId,
				clientId: row.clientId,
				createdByUserId: row.createdByUserId,
				agencyMembers: members,
				clientOwnerUserId,
			});
			if (uid) out[i] = { ...out[i], executionOwnerUserId: uid };
		}
		return out;
	}
}
