import { Module } from '@nestjs/common';
import { FxService } from './fx.service';
import { PrismaModule } from '../database/prisma.module';

@Module({
	imports: [PrismaModule],
	providers: [FxService],
	exports: [FxService],
})
export class FxModule {}

