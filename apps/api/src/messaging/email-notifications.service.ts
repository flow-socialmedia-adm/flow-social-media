import { Injectable, Logger } from '@nestjs/common';

/**
 * Camada fina para envio futuro (SMTP/provedor). Em desenvolvimento apenas loga.
 */
@Injectable()
export class EmailNotificationsService {
	private readonly logger = new Logger(EmailNotificationsService.name);

	private isDev(): boolean {
		return process.env.NODE_ENV !== 'production';
	}

	notifyInviteAccepted(_to: string, _agencyName: string): void {
		if (this.isDev()) {
			this.logger.debug(`[email stub] invite accepted → ${_to}`);
		}
	}

	logInviteLink(to: string, link: string): void {
		if (this.isDev()) {
			this.logger.log(`[DEV convite] para=${to} link=${link}`);
		}
	}

	logPasswordResetLink(to: string, link: string): void {
		if (this.isDev()) {
			this.logger.log(`[DEV reset senha] para=${to} link=${link}`);
		}
	}
}
