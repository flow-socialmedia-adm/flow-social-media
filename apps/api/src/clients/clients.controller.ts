import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@ApiTags('clients')
@ApiBearerAuth()
@Controller('clients')
export class ClientsController {
	constructor(private readonly service: ClientsService) {}

	@Get()
	async list(@Query('page') page = '1', @Query('pageSize') pageSize = '20', @Query('onlyDeleted') onlyDeleted = 'false') {
		const p = Math.max(1, Number(page) || 1);
		const ps = Math.min(100, Math.max(1, Number(pageSize) || 20));
		return this.service.list(p, ps, onlyDeleted === 'true');
	}

	@Get(':id')
	async get(@Param('id') id: string) {
		return this.service.get(id);
	}

	@Roles('owner', 'admin', 'editor')
	@Post()
	async create(@Body() body: CreateClientDto) {
		return this.service.create(body as any);
	}

	@Roles('owner', 'admin', 'editor')
	@Put(':id')
	async update(@Param('id') id: string, @Body() body: UpdateClientDto) {
		return this.service.update(id, body as any);
	}

	@Roles('owner', 'admin', 'editor')
	@Delete(':id')
	async remove(@Param('id') id: string) {
		return this.service.remove(id);
	}

	@Roles('owner', 'admin', 'editor')
	@Post(':id/restore')
	async restore(@Param('id') id: string) {
		return this.service.restore(id);
	}
}

