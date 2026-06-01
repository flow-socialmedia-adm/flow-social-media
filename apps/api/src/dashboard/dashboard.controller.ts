import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
	constructor(private readonly service: DashboardService) {}

	@Get('summary')
	async summary() {
		return this.service.tasksSummaryWeek();
	}

	@Get('next-financial')
	async nextFinancial() {
		return this.service.nextFinancial();
	}

	@Get('recent-clients')
	async recentClients() {
	return this.service.recentClients();
	}
}

