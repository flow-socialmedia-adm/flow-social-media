import {
	BadRequestException,
	Controller,
	Logger,
	MaxFileSizeValidator,
	ParseFilePipe,
	Post,
	UnprocessableEntityException,
	UploadedFile,
	UseFilters,
	UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MulterExceptionFilter } from './multer-exception.filter';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { writeFileSync } from 'fs';
import { Roles } from '../common/decorators/roles.decorator';
import * as sharp from 'sharp';

const UPLOAD_DIR = join(process.cwd(), 'uploads');
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024; // 50MB para PDF (manual da marca)
const MAX_FONT_SIZE = 10 * 1024 * 1024; // 10MB para fontes (.ttf, .otf, .woff)
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const FONT_MIMES = ['font/ttf', 'font/otf', 'font/woff', 'font/woff2', 'application/x-font-ttf', 'application/x-font-otf', 'application/font-woff', 'application/font-woff2'];
const MSG_FILE_TOO_LARGE = 'Arquivo muito grande. Máximo 5MB.';
const MSG_DOCUMENT_TOO_LARGE = 'Arquivo muito grande. Máximo 50MB.';
const MSG_FONT_TOO_LARGE = 'Arquivo muito grande. Máximo 10MB.';
const MSG_INVALID_TYPE = 'Tipo de arquivo não permitido. Use JPEG, PNG ou WebP.';
const MSG_INVALID_PDF = 'Apenas PDF é permitido.';
const MSG_INVALID_FONT = 'Apenas fontes .ttf, .otf ou .woff são permitidas.';

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
@UseFilters(MulterExceptionFilter)
export class UploadsController {
	private readonly logger = new Logger(UploadsController.name);

	@Roles('owner', 'admin', 'editor')
	@Post()
	@UseInterceptors(
		FileInterceptor('file', {
			limits: { fileSize: MAX_SIZE },
			fileFilter: (_req, file, cb) => {
				if (!ALLOWED_TYPES.includes(file.mimetype)) {
					return cb(
						new UnprocessableEntityException(MSG_INVALID_TYPE),
						false,
					);
				}
				cb(null, true);
			},
			storage: memoryStorage(),
		}),
	)
	@ApiConsumes('multipart/form-data')
	@ApiBody({
		schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
	})
	async upload(
		@UploadedFile(
			new ParseFilePipe({
				fileIsRequired: false,
				validators: [new MaxFileSizeValidator({ maxSize: MAX_SIZE })],
				exceptionFactory: () => new BadRequestException(MSG_FILE_TOO_LARGE),
			}),
		)
		file?: Express.Multer.File,
	) {
		if (!file) {
			throw new BadRequestException('Nenhum arquivo recebido.');
		}
		this.logger.log(`upload: mimetype=${file.mimetype} size=${file.size}`);
		this.logger.log(`upload: head=${file.buffer?.subarray(0, 16).toString('hex')}`);

		const preserveTransparency = file.mimetype === 'image/png' || file.mimetype === 'image/webp';
		const ext = preserveTransparency ? 'png' : 'jpg';
		const filename = `${randomUUID()}.${ext}`;
		const outPath = join(UPLOAD_DIR, filename);

		try {
			if (preserveTransparency) {
				if (file.mimetype === 'image/png') {
					writeFileSync(outPath, file.buffer);
				} else {
					await sharp(file.buffer)
						.png({ compressionLevel: 6 })
						.toFile(outPath);
				}
			} else {
				await sharp(file.buffer)
					.flatten({ background: { r: 255, g: 255, b: 255 } })
					.jpeg({ quality: 90 })
					.toFile(outPath);
			}
		} catch (err: any) {
			this.logger.error(`sharp error: ${err?.message || err}`, err?.stack);
			throw new BadRequestException('Imagem inválida ou corrompida. Tente outro arquivo.');
		}

		return { url: `/uploads/${filename}` };
	}

	@Roles('owner', 'admin', 'editor')
	@Post('document')
	@UseInterceptors(
		FileInterceptor('file', {
			limits: { fileSize: MAX_DOCUMENT_SIZE },
			fileFilter: (_req, file, cb) => {
				if (file.mimetype !== 'application/pdf') {
					return cb(
						new UnprocessableEntityException(MSG_INVALID_PDF),
						false,
					);
				}
				cb(null, true);
			},
			storage: memoryStorage(),
		}),
	)
	@ApiConsumes('multipart/form-data')
	@ApiBody({
		schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
	})
	async uploadDocument(
		@UploadedFile(
			new ParseFilePipe({
				fileIsRequired: false,
				validators: [new MaxFileSizeValidator({ maxSize: MAX_DOCUMENT_SIZE })],
				exceptionFactory: () => new BadRequestException(MSG_DOCUMENT_TOO_LARGE),
			}),
		)
		file?: Express.Multer.File,
	) {
		if (!file) {
			throw new BadRequestException('Nenhum arquivo recebido.');
		}
		this.logger.log(`uploadDocument: mimetype=${file.mimetype} size=${file.size}`);
		const filename = `${randomUUID()}.pdf`;
		const outPath = join(UPLOAD_DIR, filename);
		writeFileSync(outPath, file.buffer);
		return { url: `/uploads/${filename}` };
	}

	@Roles('owner', 'admin', 'editor')
	@Post('font')
	@UseInterceptors(
		FileInterceptor('file', {
			limits: { fileSize: MAX_FONT_SIZE },
			fileFilter: (_req, file, cb) => {
				const n = (file.originalname || '').toLowerCase();
				const validExt = n.endsWith('.ttf') || n.endsWith('.otf') || n.endsWith('.woff');
				const validMime = FONT_MIMES.includes(file.mimetype) || file.mimetype?.startsWith?.('font/') || file.mimetype?.includes?.('font');
				if (!validExt && !validMime) {
					return cb(
						new UnprocessableEntityException(MSG_INVALID_FONT),
						false,
					);
				}
				cb(null, true);
			},
			storage: memoryStorage(),
		}),
	)
	@ApiConsumes('multipart/form-data')
	@ApiBody({
		schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
	})
	async uploadFont(
		@UploadedFile(
			new ParseFilePipe({
				fileIsRequired: false,
				validators: [new MaxFileSizeValidator({ maxSize: MAX_FONT_SIZE })],
				exceptionFactory: () => new BadRequestException(MSG_FONT_TOO_LARGE),
			}),
		)
		file?: Express.Multer.File,
	) {
		if (!file) {
			throw new BadRequestException('Nenhum arquivo recebido.');
		}
		this.logger.log(`uploadFont: mimetype=${file.mimetype} size=${file.size}`);
		const name = (file.originalname || 'font').toLowerCase();
		const ext = name.endsWith('.woff2') ? 'woff2' : name.endsWith('.woff') ? 'woff' : name.endsWith('.otf') ? 'otf' : 'ttf';
		const filename = `${randomUUID()}.${ext}`;
		const outPath = join(UPLOAD_DIR, filename);
		writeFileSync(outPath, file.buffer);
		return { url: `/uploads/${filename}` };
	}
}
