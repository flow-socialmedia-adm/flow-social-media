import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { ModuleAccessService } from './module-access.service';

@Global()
@Module({
	imports: [PrismaModule],
	providers: [ModuleAccessService],
	exports: [ModuleAccessService],
})
export class PermissionsModule {}
