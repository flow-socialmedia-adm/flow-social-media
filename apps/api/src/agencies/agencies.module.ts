import { Module } from '@nestjs/common';
import { AgenciesService } from './agencies.service';
import { AgenciesController } from './agencies.controller';
import { PrismaModule } from '../database/prisma.module';

@Module({
	imports: [PrismaModule],
	controllers: [AgenciesController],
	providers: [AgenciesService],
})
export class AgenciesModule {}

