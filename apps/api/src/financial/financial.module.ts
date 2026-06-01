import { Module } from '@nestjs/common';
import { FinancialService } from './financial.service';
import { FinancialController } from './financial.controller';
import { PrismaModule } from '../database/prisma.module';
import { FxModule } from '../fx/fx.module';

@Module({
	imports: [PrismaModule, FxModule],
	controllers: [FinancialController],
	providers: [FinancialService],
	exports: [FinancialService],
})
export class FinancialModule {}

