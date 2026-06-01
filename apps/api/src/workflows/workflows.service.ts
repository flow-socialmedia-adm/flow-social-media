import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RequestContextService } from '../common/context/request-context.service';
import { ModuleAccessService } from '../common/permissions/module-access.service';
import { FORBIDDEN_ACTION_DENIED } from '../common/permissions/forbidden-messages';

type CreateWorkflowDto = {
	category: 'client' | 'general';
	name: string;
	isCustom?: boolean;
	statusesJson: unknown;
};

type UpdateWorkflowDto = Partial<CreateWorkflowDto>;

@Injectable()
export class WorkflowsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly ctx: RequestContextService,
		private readonly access: ModuleAccessService,
	) {}

	/**
	 * Status fixos para POSTS (não editáveis)
	 * IDs estáveis: pauta_criada, em_producao, aguardando_aprovacao, aprovado, agendado, publicado
	 */
	private postsFixedStatuses() {
		return [
			{ id: 'pauta_criada', name: 'Pauta Criada', color: 'purple', order: 1 },
			{ id: 'em_producao', name: 'Em Produção', color: 'blue', order: 2 },
			{ id: 'aguardando_aprovacao', name: 'Aguardando Aprovação', color: 'amber', order: 3 },
			{ id: 'aprovado', name: 'Aprovado', color: 'green', order: 4 },
			{ id: 'agendado', name: 'Agendado', color: 'cyan', order: 5 },
			{ id: 'publicado', name: 'Publicado', color: 'emerald', order: 6 },
		];
	}

	/**
	 * Status fixos para Tarefas Gerais (não editáveis)
	 * IDs estáveis: a_fazer, em_andamento, concluido
	 * SEM ações pendentes, apenas status simples
	 */
	private generalFixedStatuses() {
		return [
			{ id: 'a_fazer', name: 'A Fazer', color: 'gray', order: 1 },
			{ id: 'em_andamento', name: 'Em Andamento', color: 'blue', order: 2 },
			{ id: 'concluido', name: 'Concluído', color: 'green', order: 3 },
		];
	}

	/**
	 * @deprecated Mantido apenas para compatibilidade com workflows antigos
	 */
	private defaultStatuses(category: 'client' | 'general') {
		if (category === 'client') {
			return this.postsFixedStatuses();
		}
		return this.generalFixedStatuses();
	}

	/**
	 * Garante que workflows fixos existam para a agência
	 * Cria workflows fixos de POSTS e Tarefas Gerais se não existirem
	 */
	private async ensureDefaults(agencyId: string) {
		// Verificar se já existem workflows fixos
		const existingPosts = await this.prisma.workflow.findFirst({
			where: {
				agencyId,
				category: 'client',
				isCustom: false,
			},
		});

		const existingGeneral = await this.prisma.workflow.findFirst({
			where: {
				agencyId,
				category: 'general',
				isCustom: false,
			},
		});

		// Criar workflow fixo de POSTS se não existir
		if (!existingPosts) {
			await this.prisma.workflow.create({
				data: {
					agencyId,
					category: 'client',
					name: 'Fluxo de Posts',
					isCustom: false,
					statusesJson: this.postsFixedStatuses() as any,
				},
			});
		}

		// Criar workflow fixo de Tarefas Gerais se não existir
		if (!existingGeneral) {
			await this.prisma.workflow.create({
				data: {
					agencyId,
					category: 'general',
					name: 'Fluxo de Tarefas Gerais',
					isCustom: false,
					statusesJson: this.generalFixedStatuses() as any,
				},
			});
		}
	}

	/**
	 * Busca workflow fixo por categoria
	 */
	async getFixedWorkflow(category: 'client' | 'general') {
		const agencyId = this.ctx.get()?.agencyId!;
		await this.ensureDefaults(agencyId);
		return this.prisma.workflow.findFirst({
			where: {
				agencyId,
				category,
				isCustom: false,
			},
		});
	}

	async list() {
		await this.access.assertAnyView(['posts', 'tasks', 'planning']);
		const agencyId = this.ctx.get()?.agencyId!;
		await this.ensureDefaults(agencyId);
		return this.prisma.workflow.findMany({
			orderBy: { name: 'asc' },
		});
	}

	/**
	 * @deprecated Workflows não são mais editáveis
	 * Mantido apenas para compatibilidade, mas sempre lança erro
	 */
	async create(data: CreateWorkflowDto) {
		throw new ForbiddenException(FORBIDDEN_ACTION_DENIED);
	}

	/**
	 * @deprecated Workflows não são mais editáveis
	 * Mantido apenas para compatibilidade, mas sempre lança erro
	 */
	async update(id: string, data: UpdateWorkflowDto) {
		const existing = await this.prisma.workflow.findUnique({ where: { id } });
		if (existing && existing.isCustom === false) {
			throw new ForbiddenException(FORBIDDEN_ACTION_DENIED);
		}
		// Mesmo workflows customizados não podem ser editados agora
		throw new ForbiddenException(FORBIDDEN_ACTION_DENIED);
	}

	/**
	 * @deprecated Workflows não são mais removíveis
	 * Mantido apenas para compatibilidade, mas sempre lança erro
	 */
	async remove(id: string) {
		const existing = await this.prisma.workflow.findUnique({ where: { id } });
		if (existing && existing.isCustom === false) {
			throw new ForbiddenException(FORBIDDEN_ACTION_DENIED);
		}
		// Mesmo workflows customizados não podem ser removidos agora
		throw new ForbiddenException(FORBIDDEN_ACTION_DENIED);
	}
}

