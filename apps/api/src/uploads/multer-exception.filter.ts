import {
	ExceptionFilter,
	Catch,
	ArgumentsHost,
	HttpStatus,
	Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { MulterError } from 'multer';

const MSG_FILE_TOO_LARGE = 'Arquivo muito grande. Máximo 5MB.';

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(MulterExceptionFilter.name);

	catch(exception: MulterError, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const res = ctx.getResponse<Response>();

		if (exception.code === 'LIMIT_FILE_SIZE') {
			this.logger.warn(`File too large: ${exception.message}`);
			res.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
				statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
				message: MSG_FILE_TOO_LARGE,
			});
			return;
		}

		this.logger.warn(`Multer error: ${exception.code} - ${exception.message}`);
		res.status(HttpStatus.BAD_REQUEST).json({
			statusCode: HttpStatus.BAD_REQUEST,
			message: exception.message || 'Erro no upload.',
		});
	}
}
