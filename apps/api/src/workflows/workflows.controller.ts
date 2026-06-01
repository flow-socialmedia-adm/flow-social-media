import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('workflows')
@ApiBearerAuth()
@Controller('workflows')
export class WorkflowsController {
	constructor(private readonly service: WorkflowsService) {}

	@Get()
	async list() {
		return this.service.list();
	}

	@Roles('owner', 'admin')
	@Post()
	async create(@Body() body: any) {
		return this.service.create(body);
	}

	@Roles('owner', 'admin')
	@Put(':id')
	async update(@Param('id') id: string, @Body() body: any) {
		return this.service.update(id, body);
	}

	@Roles('owner', 'admin')
	@Delete(':id')
	async remove(@Param('id') id: string) {
		return this.service.remove(id);
	}
}

