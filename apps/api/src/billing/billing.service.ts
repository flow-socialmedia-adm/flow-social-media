import { ForbiddenException, Injectable } from '@nestjs/common';
import { FORBIDDEN_ACTION_DENIED } from '../common/permissions/forbidden-messages';
import { PrismaService } from '../database/prisma.service';
import { RequestContextService } from '../common/context/request-context.service';

@Injectable()
export class BillingService {
	constructor(private readonly prisma: PrismaService, private readonly ctx: RequestContextService) {}

	async attachCard(payload: { cardNumber: string; expMonth: string; expYear: string; cvc: string; cardHolder?: string }) {
		const role = this.ctx.get()?.role;
		if (role !== 'owner') throw new ForbiddenException(FORBIDDEN_ACTION_DENIED);
		const agencyId = this.ctx.get()?.agencyId!;

		// For MVP: basic Luhn check and masking; integrate PSP later
		const digits = payload.cardNumber.replace(/\D/g, '');
		const last4 = digits.slice(-4);
		const brand = this.detectBrand(digits);

		await this.prisma.agency.update({
            where: { id: agencyId },
            data: {
              cardOnFile: true,
            },
          });
          

		return { ok: true, cardLast4: last4, cardBrand: brand };
	}

	private detectBrand(d: string) {
		if (/^4\d{12,18}$/.test(d)) return 'visa';
		if (/^5[1-5]\d{14}$/.test(d)) return 'mastercard';
		if (/^3[47]\d{13}$/.test(d)) return 'amex';
		return 'unknown';
	}
}


