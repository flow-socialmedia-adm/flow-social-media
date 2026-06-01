import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RequestContextService } from '../context/request-context.service';
import type { AgencyModuleKey, ModuleAccessLevel } from './agency-module-keys';
import { resolveModulePermissions, levelSatisfies, type UserRowForPermissions } from './resolve-module-permissions';
import {
	type TaskAccessShape,
	taskContentModule,
	taskRequiresAgendaGate,
} from './task-module-access';
import { FORBIDDEN_ACTION_DENIED, FORBIDDEN_MODULE_VIEW } from './forbidden-messages';

@Injectable()
export class ModuleAccessService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly ctx: RequestContextService,
	) {}

	private async loadResolved(): Promise<Record<AgencyModuleKey, ModuleAccessLevel>> {
		const store = this.ctx.get();
		if (store?.resolvedModulePermissions) return store.resolvedModulePermissions;

		const userId = store?.userId;
		const agencyId = store?.agencyId;
		if (!userId || !agencyId) {
			throw new ForbiddenException(FORBIDDEN_MODULE_VIEW);
		}

		const user = await this.prisma.user.findFirst({
			where: { id: userId, agencyId, deletedAt: null },
			select: {
				role: true,
				permissions: true,
				agencyRoleId: true,
				simpleAccessLevel: true,
				agencyRole: { select: { permissions: true } },
				agency: { select: { operationMode: true } },
			},
		});

		if (!user) {
			throw new ForbiddenException(FORBIDDEN_MODULE_VIEW);
		}

		const row: UserRowForPermissions = {
			role: user.role,
			permissions: user.permissions,
			agencyRoleId: user.agencyRoleId,
			agencyRole: user.agencyRole,
			simpleAccessLevel: user.simpleAccessLevel,
			agencyOperationMode: user.agency?.operationMode ?? null,
		};
		const map = resolveModulePermissions(row);
		if (store) store.resolvedModulePermissions = map;
		return map;
	}

	async getModulePermissions(): Promise<Record<AgencyModuleKey, ModuleAccessLevel>> {
		return this.loadResolved();
	}

	async assertCanView(module: AgencyModuleKey): Promise<void> {
		const map = await this.loadResolved();
		if (!levelSatisfies(map[module], 'view')) {
			throw new ForbiddenException(FORBIDDEN_MODULE_VIEW);
		}
	}

	async assertCanEdit(module: AgencyModuleKey): Promise<void> {
		const map = await this.loadResolved();
		if (!levelSatisfies(map[module], 'edit')) {
			throw new ForbiddenException(FORBIDDEN_ACTION_DENIED);
		}
	}

	/** Basta um dos módulos com nível view ou superior. */
	async assertAnyView(modules: AgencyModuleKey[]): Promise<void> {
		const map = await this.loadResolved();
		const ok = modules.some((m) => levelSatisfies(map[m], 'view'));
		if (!ok) throw new ForbiddenException(FORBIDDEN_MODULE_VIEW);
	}

	/** Todos os módulos precisam de edit (ex.: cliente + contrato). */
	async assertAllEdit(modules: AgencyModuleKey[]): Promise<void> {
		const map = await this.loadResolved();
		const ok = modules.every((m) => levelSatisfies(map[m], 'edit'));
		if (!ok) throw new ForbiddenException(FORBIDDEN_ACTION_DENIED);
	}

	/** Leitura de task: módulo de conteúdo (posts | tasks | planning). */
	async assertTaskView(row: TaskAccessShape): Promise<void> {
		const mod = taskContentModule(row);
		await this.assertCanView(mod);
	}

	/** Mutação de task: edit no módulo de conteúdo; se `origin === 'agenda'`, também exige edit em agenda. */
	async assertTaskEdit(row: TaskAccessShape): Promise<void> {
		if (taskRequiresAgendaGate(row)) {
			await this.assertCanEdit('agenda');
		}
		await this.assertCanEdit(taskContentModule(row));
	}
}
