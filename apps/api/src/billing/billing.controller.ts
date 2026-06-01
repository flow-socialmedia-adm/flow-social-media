import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
	constructor(private readonly service: BillingService) {}

	@Roles('owner')
	@Post('attach-card')
	async attachCard(
		@Body()
		body: {
			cardNumber: string;
			expMonth: string;
			expYear: string;
			cvc: string;
			cardHolder?: string;
		},
	) {
		return this.service.attachCard(body);
	}
}


