import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { AgenciesService } from './agencies.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdateAgencyDto } from './dto/update-agency.dto';
import { CreateAgencyRoleDto } from './dto/create-agency-role.dto';
import { UpdateAgencyRoleDto } from './dto/update-agency-role.dto';

@ApiTags('agencies')
@ApiBearerAuth()
@Controller('agencies')
export class AgenciesController {
	constructor(private readonly service: AgenciesService) {}

	@Get('me/roles')
	async listRoles() {
		return this.service.listAgencyRoles();
	}

	@Get('me')
	async me() {
		return this.service.getMyAgency();
	}

	@Roles('owner')
	@Put('me')
	async update(@Body() body: UpdateAgencyDto) {
		return this.service.updateMyAgency(body as any);
	}

	@Roles('owner', 'admin', 'editor')
	@Post('me/roles')
	async createRole(@Body() body: CreateAgencyRoleDto) {
		return this.service.createAgencyRole(body);
	}

	@Roles('owner', 'admin', 'editor')
	@Put('me/roles/:id')
	async updateRole(@Param('id') id: string, @Body() body: UpdateAgencyRoleDto) {
		return this.service.updateAgencyRole(id, body);
	}

	@Roles('owner', 'admin', 'editor')
	@Delete('me/roles/:id')
	async deleteRole(@Param('id') id: string) {
		return this.service.deleteAgencyRole(id);
	}
}

