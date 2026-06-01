import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('health')
export class HealthController {
	@Public()
	@SkipThrottle()
	@Get()
	ready() {
		return { ok: true };
	}
}

