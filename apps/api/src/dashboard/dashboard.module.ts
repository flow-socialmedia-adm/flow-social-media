import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { PrismaModule } from '../database/prisma.module';
import { FxModule } from '../fx/fx.module';

@Module({
	imports: [PrismaModule, FxModule],
	controllers: [DashboardController],
	providers: [DashboardService],
})
export class DashboardModule {}

