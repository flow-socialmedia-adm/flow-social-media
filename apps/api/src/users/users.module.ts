import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../database/prisma.module';
import { EmailNotificationsService } from '../messaging/email-notifications.service';

@Module({
	imports: [PrismaModule],
	controllers: [UsersController],
	providers: [UsersService, EmailNotificationsService],
	exports: [UsersService],
})
export class UsersModule {}

