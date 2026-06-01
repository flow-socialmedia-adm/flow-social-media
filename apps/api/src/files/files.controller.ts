import { Body, Controller, Post } from '@nestjs/common';
import { FilesService } from './files.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

class PresignDto {
	key!: string;
	op!: 'put' | 'get';
	contentType?: string;
}

@ApiTags('files')
@ApiBearerAuth()
@Controller('files')
export class FilesController {
	constructor(private readonly service: FilesService) {}

	@Post('presign')
	async presign(@Body() dto: PresignDto) {
		if (dto.op === 'put') {
			return this.service.presignPut(dto.key, dto.contentType);
		}
		return this.service.presignGet(dto.key);
	}
}

