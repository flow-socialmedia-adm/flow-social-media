import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { RequestContextService } from '../common/context/request-context.service';
import { resolveModulePermissions } from '../common/permissions/resolve-module-permissions';
import type { IngestActivityLogDto } from './dto/ingest-activity-log.dto';

function normalizeFilterUserId(raw?: string): string | undefined {
	if (raw === undefined || raw === null) return undefined;
	const t = String(raw).trim();
	return t.length > 0 ? t : undefined;
}

@Injectable()
export class ActivityLogsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly ctx: RequestContextService,
	) {}

	/** Grava log sem depender do ALS (ex.: após o fim do request no interceptor). */
	async createLogEntry(
		actor: { agencyId: string; userId: string },
		actionKey: string,
		targetName?: string,
		detailsJson?: unknown,
	) {
		await this.prisma.activityLog.create({
			data: {
				agencyId: actor.agencyId,
				userId: actor.userId,
				actionKey,
				targetName: targetName ?? null,
				detailsJson: detailsJson as any,
			},
		});
	}

	async log(actionKey: string, targetName?: string, detailsJson?: unknown) {
		const store = this.ctx.get();
		if (!store?.agencyId || !store?.userId) return;
		await this.createLogEntry(
			{ agencyId: store.agencyId, userId: store.userId },
			actionKey,
			targetName,
			detailsJson,
		);
	}

	async ingest(dto: IngestActivityLogDto) {
		const store = this.ctx.get();
		if (!store?.agencyId || !store?.userId) return;
		if (dto.line?.v === 2) {
			await this.prisma.activityLog.create({
				data: {
					agencyId: store.agencyId,
					userId: store.userId,
					actionKey: 'history.v2',
					targetName: dto.line.name,
					detailsJson: { line: dto.line } as object,
				},
			});
			return;
		}
		if (dto.actionKey != null && dto.targetName != null) {
			await this.log(String(dto.actionKey), String(dto.targetName));
		}
	}

	async list(page = 1, pageSize = 20, filterUserIdRaw?: string) {
		const store = this.ctx.get();
		const tokenUserId = store?.userId;
		if (!tokenUserId) {
			return { items: [], total: 0, page, pageSize };
		}

		const filterUserId = normalizeFilterUserId(filterUserIdRaw);

		const dbUser = await this.prisma.user.findUnique({
			where: { id: tokenUserId },
			select: {
				role: true,
				agencyId: true,
				permissions: true,
				agencyRoleId: true,
				simpleAccessLevel: true,
				agencyRole: { select: { permissions: true } },
				agency: { select: { operationMode: true } },
			},
		});
		if (!dbUser?.agencyId) {
			return { items: [], total: 0, page, pageSize };
		}

		const agencyIdForQuery = dbUser.agencyId;

		const modMap = resolveModulePermissions({
			role: dbUser.role,
			permissions: dbUser.permissions,
			agencyRoleId: dbUser.agencyRoleId,
			agencyRole: dbUser.agencyRole,
			simpleAccessLevel: dbUser.simpleAccessLevel,
			agencyOperationMode: dbUser.agency?.operationMode ?? null,
		});

		const jwtRole = String(store?.role ?? '').toLowerCase();
		const dbRole = String(dbUser.role).toLowerCase();
		const isElevated =
			jwtRole === 'owner' ||
			jwtRole === 'admin' ||
			dbRole === 'owner' ||
			dbRole === 'admin' ||
			modMap.team === 'edit';

		const where: Prisma.ActivityLogWhereInput = { agencyId: agencyIdForQuery };

		if (!isElevated) {
			where.userId = tokenUserId;
		} else if (filterUserId) {
			const member = await this.prisma.user.findFirst({
				where: { id: filterUserId, agencyId: agencyIdForQuery },
				select: { id: true },
			});
			if (!member) {
				return { items: [], total: 0, page, pageSize };
			}
			where.userId = filterUserId;
		}

		const skip = (page - 1) * pageSize;
		const [rows, total] = await this.prisma.$transaction([
			this.prisma.activityLog.findMany({
				where,
				orderBy: { createdAt: 'desc' },
				skip,
				take: pageSize,
				include: { user: { select: { id: true, fullName: true } } },
			}),
			this.prisma.activityLog.count({ where }),
		]);

		const items = rows.map((row) => {
			const dj = row.detailsJson as { line?: { v?: number } } | null | undefined;
			const line = dj?.line?.v === 2 ? dj.line : undefined;
			return {
				id: row.id,
				userId: row.userId,
				userName: row.user?.fullName ?? '—',
				actionKey: line ? 'history.v2' : row.actionKey,
				targetName: row.targetName ?? '',
				timestamp: row.createdAt.toISOString(),
				...(line ? { line } : {}),
			};
		});

		return { items, total, page, pageSize };
	}
}
