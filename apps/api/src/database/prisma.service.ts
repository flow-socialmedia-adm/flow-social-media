import { INestApplication, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { RequestContextService } from '../common/context/request-context.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
	constructor(private readonly ctx: RequestContextService) {
		super();
		this.$use(async (params, next) => {
			const store = this.ctx.get();
			// Only scope when we have an agency context
			if (store?.agencyId) {
				const modelsWithAgency = new Set([
					'User',
					'Client',
					'Workflow',
					'Task',
					'FinancialEntry',
					'ActivityLog',
				]);
				if (modelsWithAgency.has(params.model ?? '')) {
					// Inject tenant on where-scoped operations
					const actionsToScopeWhere = new Set([
						'findMany',
						'findFirst',
						'updateMany',
						'deleteMany',
						'count',
						'aggregate',
					]);
					if (actionsToScopeWhere.has(params.action)) {
						params.args = params.args ?? {};
						params.args.where = params.args.where ?? {};
						params.args.where = {
							AND: [{ agencyId: store.agencyId }, params.args.where],
						};
					}
					// Harden single-item operations
					if (params.action === 'findUnique') {
						params.action = 'findFirst';
						params.args = params.args ?? {};
						params.args.where = {
							AND: [{ agencyId: store.agencyId }, params.args.where],
						};
					}
					if (params.action === 'update') {
						params.action = 'updateMany';
						params.args = params.args ?? {};
						params.args.where = {
							AND: [{ agencyId: store.agencyId }, params.args.where],
						};
					}
					if (params.action === 'delete') {
						params.action = 'deleteMany';
						params.args = params.args ?? {};
						params.args.where = {
							AND: [{ agencyId: store.agencyId }, params.args.where],
						};
					}
					// Inject agencyId on create
					if (params.action === 'create') {
						params.args = params.args ?? {};
						params.args.data = params.args.data ?? {};
						if (typeof params.args.data.agencyId === 'undefined') {
							params.args.data.agencyId = store.agencyId;
						}
					}
					// Upsert: enforce where with agencyId and ensure create has agencyId
					if (params.action === 'upsert') {
						params.args = params.args ?? {};
						params.args.where = {
							AND: [{ agencyId: store.agencyId }, params.args.where],
						};
						params.args.create = params.args.create ?? {};
						if (typeof params.args.create.agencyId === 'undefined') {
							params.args.create.agencyId = store.agencyId;
						}
					}
				}
			}
			return next(params);
		});
	}
	async onModuleInit() {
		await this.$connect();
	}

	async onModuleDestroy() {
		await this.$disconnect();
	}
}

