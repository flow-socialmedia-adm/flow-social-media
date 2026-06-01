import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
	constructor(private readonly service: UsersService) {}

	@Get()
	async list(@Query('page') page = '1', @Query('pageSize') pageSize = '20') {
		const p = Math.max(1, Number(page) || 1);
		const ps = Math.min(100, Math.max(1, Number(pageSize) || 20));
		return this.service.list(p, ps);
	}

	@Patch('me/onboarding')
	async updateMyOnboarding(@Body() body: { hasSeenTasksOnboarding?: boolean }) {
		return this.service.updateMyOnboarding(body);
	}

	@Roles('owner', 'admin')
	@Post('invite')
	async invite(@Body() body: InviteUserDto) {
		return this.service.inviteMember(body as any);
	}

	@Roles('owner', 'admin', 'editor')
	@Post()
	async create(@Body() body: CreateUserDto) {
		return this.service.create(body as any);
	}

	@Roles('owner', 'admin')
	@Post(':id/resend-invite')
	async resendInvite(@Param('id') id: string) {
		return this.service.resendInvite(id);
	}

	@Roles('owner', 'admin')
	@Delete(':id/invite')
	async cancelInvite(@Param('id') id: string) {
		return this.service.cancelInvite(id);
	}

	@Roles('owner', 'admin')
	@Patch(':id/disable')
	async disable(@Param('id') id: string) {
		return this.service.disableMember(id);
	}

	@Roles('owner', 'admin')
	@Patch(':id/reactivate')
	async reactivate(@Param('id') id: string) {
		return this.service.reactivateMember(id);
	}

	@Roles('owner', 'admin')
	@Post(':id/password-reset')
	async passwordReset(@Param('id') id: string) {
		return this.service.requestPasswordReset(id);
	}

	@Roles('owner', 'admin', 'editor')
	@Put(':id')
	async update(@Param('id') id: string, @Body() body: UpdateUserDto) {
		return this.service.update(id, body as any);
	}

	@Roles('owner', 'admin', 'editor')
	@Delete(':id')
	async remove(@Param('id') id: string) {
		return this.service.remove(id);
	}
}
