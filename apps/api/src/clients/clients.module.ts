import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { PrismaModule } from '../database/prisma.module';
import { CryptoService } from '../common/security/crypto.service';
@Module({
	imports: [PrismaModule],
	controllers: [ClientsController],
	providers: [ClientsService, CryptoService],
})
export class ClientsModule {}

