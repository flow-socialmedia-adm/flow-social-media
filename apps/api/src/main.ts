import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule);

	app.use(
		helmet({
			crossOriginResourcePolicy: { policy: 'cross-origin' },
		}),
	);
	// CORS por ambiente: CORS_ORIGINS="http://localhost:5173,https://app.suaempresa.com"
	const originsEnv = process.env.CORS_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean);
	app.enableCors({
		origin: originsEnv && originsEnv.length > 0 ? originsEnv : true,
		credentials: true,
	});
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
		}),
	);

	const uploadsDir = join(process.cwd(), 'uploads');
	if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
	app.useStaticAssets(uploadsDir, { prefix: '/uploads' });

	const config = new DocumentBuilder()
		.setTitle('Flow ERP API')
		.setDescription('API do Flow ERP (SaaS multi-tenant)')
		.setVersion('0.1.0')
		.addBearerAuth()
		.build();
	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('docs', app, document);

	const port = process.env.PORT ? Number(process.env.PORT) : 3000;
	await app.listen(port);
}

bootstrap();

