import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { DevSeedService } from './dev.seed.service';

@Module({
	imports: [PrismaModule],
	providers: [DevSeedService],
})
export class DevModule {}

