import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { PostActionDto } from './dto/post-action.dto';
import { MoveStatusDto } from './dto/move-status.dto';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
	constructor(private readonly service: TasksService) {}

	@SkipThrottle()
	@Get()
	async list(
		@Query('clientId') clientId?: string,
		@Query('postType') postType?: string,
		@Query('statusId') statusId?: string,
		@Query('startDate') startDate?: string,
		@Query('endDate') endDate?: string,
		@Query('ownerUserId') ownerUserId?: string,
		@Query('page') page = '1',
		@Query('pageSize') pageSize = '20',
	) {
		const p = Math.max(1, Number(page) || 1);
		const ps = Math.min(1000, Math.max(1, Number(pageSize) || 20));
		return this.service.list({ clientId, postType, statusId, startDate, endDate, ownerUserId }, p, ps);
	}

	/**
	 * Contagens agregadas usadas pela Central Inteligente.
	 * Aditivo: não altera comportamento de outras rotas.
	 *
	 * Query (seções independentes — envie só o que a página precisa):
	 *   - generalWorkflowId: resumo de tarefas gerais (Tarefas).
	 *   - clientWorkflowId: resumo de posts reais (Posts).
	 *   - wipThreshold (opcional, default 8): limite WIP em tarefas gerais.
	 *   - staleProductionDays (opcional, default 14): limite "em produção há muito tempo" em posts.
	 */
	@SkipThrottle()
	@Get('summary')
	async summary(
		@Query('generalWorkflowId') generalWorkflowId?: string,
		@Query('clientWorkflowId') clientWorkflowId?: string,
		@Query('wipThreshold') wipThreshold?: string,
		@Query('staleProductionDays') staleProductionDays?: string,
	) {
		const threshold = Math.max(1, Number(wipThreshold) || 8);
		const staleDays = Math.max(1, Number(staleProductionDays) || 14);
		return this.service.summary({
			generalWorkflowId,
			clientWorkflowId,
			wipThreshold: threshold,
			staleProductionDays: staleDays,
		});
	}

	@Roles('owner', 'admin', 'editor')
	@SkipThrottle()
	@Post()
	async create(@Body() body: CreateTaskDto) {
		return this.service.create(body as any);
	}

	@Roles('owner', 'admin', 'editor')
	@SkipThrottle()
	@Put(':id')
	async update(@Param('id') id: string, @Body() body: UpdateTaskDto) {
		return this.service.update(id, body as any);
	}

	@Roles('owner', 'admin', 'editor')
	@SkipThrottle()
	@Delete(':id')
	async remove(@Param('id') id: string) {
		return this.service.remove(id);
	}

	@Roles('owner', 'admin', 'editor')
	@SkipThrottle()
	@Patch(':id/date')
	async moveDate(@Param('id') id: string, @Body() body: { date: string }) {
		return this.service.moveDate(id, body.date);
	}

	@Roles('owner', 'admin', 'editor')
	@SkipThrottle()
	@Patch(':id/status')
	async moveStatus(@Param('id') id: string, @Body() body: MoveStatusDto) {
		return this.service.moveStatus(id, body.statusId, body.changeSource, body.currentActionId);
	}

	@Roles('owner', 'admin', 'editor')
	@SkipThrottle()
	@Get(':id/available-actions')
	async getAvailableActions(@Param('id') id: string) {
		return { actions: await this.service.getAvailablePostActions(id) };
	}

	@Roles('owner', 'admin', 'editor')
	@SkipThrottle()
	@Get(':id/status-history')
	async getStatusHistory(@Param('id') id: string) {
		return this.service.getStatusHistory(id);
	}

	@Roles('owner', 'admin', 'editor')
	@SkipThrottle()
	@Patch(':id/post-action')
	async executePostAction(@Param('id') id: string, @Body() body: PostActionDto) {
		return this.service.executePostAction(id, body.action, {
			scheduledDate: body.scheduledDate,
			platform: body.platform,
			notes: body.notes,
		});
	}
}

