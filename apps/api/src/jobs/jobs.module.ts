import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { JobsService } from './jobs.service';
import { PrismaModule } from '../database/prisma.module';

@Module({
	imports: [ScheduleModule.forRoot(), PrismaModule],
	providers: [JobsService],
})
export class JobsModule {}

