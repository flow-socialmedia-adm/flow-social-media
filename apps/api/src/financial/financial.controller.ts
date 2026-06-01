import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { FinancialService } from './financial.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('financial')
@ApiBearerAuth()
@Controller('financial')
export class FinancialController {
	constructor(private readonly service: FinancialService) {}

	@SkipThrottle() // Listagens não devem sofrer rate limit no app
	@Get()
	async list(
		@Query('type') type?: 'income' | 'expense',
		@Query('status') status?: 'pending' | 'paid' | 'overdue',
		@Query('clientId') clientId?: string,
		@Query('startDate') startDate?: string,
		@Query('endDate') endDate?: string,
		@Query('page') page = '1',
		@Query('pageSize') pageSize = '20',
	) {
		const p = Math.max(1, Number(page) || 1);
		const ps = Math.min(100, Math.max(1, Number(pageSize) || 20));
		return this.service.list({ type, status, clientId, startDate, endDate }, p, ps);
	}

	@Roles('owner', 'admin', 'editor')
	@SkipThrottle()
	@Post()
	async create(@Body() body: CreateEntryDto) {
		return this.service.create(body as any);
	}

	@Roles('owner', 'admin')
	@SkipThrottle()
	@Put(':id')
	async update(@Param('id') id: string, @Body() body: UpdateEntryDto) {
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
	@Post(':id/mark-paid')
	async markPaid(@Param('id') id: string) {
		return this.service.markPaid(id);
	}

	@Roles('owner', 'admin', 'editor')
	@SkipThrottle()
	@Post(':id/unpay')
	async unpay(@Param('id') id: string) {
		return this.service.unpay(id);
	}

	@SkipThrottle()
	@Get('kpis/month')
	async kpis() {
		return this.service.kpisCurrentMonth();
	}

	@SkipThrottle()
	@Get('charts/cashflow-6m')
	async cashflow() {
		return this.service.cashflowLast6Months();
	}

	@SkipThrottle()
	@Get('charts/pie')
	async pie(@Query('type') type: 'income' | 'expense') {
		return this.service.pieByCategory(type);
	}
}

