import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ActivityLogsService } from './activity-logs.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IngestActivityLogDto } from './dto/ingest-activity-log.dto';

@ApiTags('activity-logs')
@ApiBearerAuth()
@Controller('activity-logs')
export class ActivityLogsController {
	constructor(private readonly service: ActivityLogsService) {}

	@Get()
	async list(
		@Query('page') page = '1',
		@Query('pageSize') pageSize = '20',
		@Query('userId') userId?: string,
	) {
		return this.service.list(Number(page), Number(pageSize), userId);
	}

	/** Persiste evento disparado no cliente (`logActivity`) para o histórico da agência. */
	@Post('ingest')
	async ingest(@Body() dto: IngestActivityLogDto) {
		await this.service.ingest(dto);
		return { ok: true as const };
	}
}

