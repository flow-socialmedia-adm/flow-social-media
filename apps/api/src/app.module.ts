import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { PrismaModule } from './database/prisma.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { RequestContextInterceptor } from './common/interceptors/request-context.interceptor';
import { AuthModule } from './auth/auth.module';
import { AgenciesModule } from './agencies/agencies.module';
import { UsersModule } from './users/users.module';
import { FilesModule } from './files/files.module';
import { UploadsModule } from './uploads/uploads.module';
import { ClientsModule } from './clients/clients.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { TasksModule } from './tasks/tasks.module';
import { FinancialModule } from './financial/financial.module';
import { FxModule } from './fx/fx.module';
import { JobsModule } from './jobs/jobs.module';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { ActivityInterceptor } from './common/interceptors/activity.interceptor';
import { HealthModule } from './health/health.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DevModule } from './dev/dev.module';
import { BillingModule } from './billing/billing.module';
import { PermissionsModule } from './common/permissions/permissions.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			validationSchema: Joi.object({
				NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
				PORT: Joi.number().default(3000),
				DATABASE_URL: Joi.string().uri({ scheme: [/postgres(ql)?/] }).required(),
				JWT_ACCESS_SECRET: Joi.string().min(16).required(),
				JWT_REFRESH_SECRET: Joi.string().min(16).required(),
				JWT_ACCESS_EXPIRES: Joi.string().default('900s'),
				JWT_REFRESH_EXPIRES: Joi.string().default('7d'),
				FX_BASE_URL: Joi.string().uri().default('https://api.exchangerate.host'),
				CORS_ORIGINS: Joi.string().allow('', null),
				S3_ENDPOINT: Joi.string().allow('', null),
				S3_REGION: Joi.string().allow('', null),
				S3_ACCESS_KEY_ID: Joi.string().allow('', null),
				S3_SECRET_ACCESS_KEY: Joi.string().allow('', null),
				S3_BUCKET: Joi.string().allow('', null),
				CREDENTIALS_ENCRYPTION_KEY: Joi.string().allow('', null),
				SEED_DEV: Joi.string().valid('true', 'false').default('false'),
			}),
		}),
		ThrottlerModule.forRoot([
			{ ttl: 60_000, limit: 120 },
		]),
		PrismaModule,
		PermissionsModule,
		AuthModule,
		AgenciesModule,
		UsersModule,
		FilesModule,
		UploadsModule,
		ClientsModule,
		WorkflowsModule,
		TasksModule,
		FinancialModule,
		FxModule,
		JobsModule,
		ActivityLogsModule,
		HealthModule,
		DashboardModule,
		DevModule,
		BillingModule,
	],
	providers: [
		{ provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
		{ provide: APP_INTERCEPTOR, useClass: ActivityInterceptor },
		{ provide: APP_GUARD, useClass: JwtAuthGuard },
		{ provide: APP_GUARD, useClass: RolesGuard },
		{ provide: APP_GUARD, useClass: PermissionsGuard },
		{ provide: APP_GUARD, useClass: ThrottlerGuard },
	],
})
export class AppModule {}

