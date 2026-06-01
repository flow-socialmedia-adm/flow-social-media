import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../database/prisma.module';
import { JwtStrategy } from './jwt.strategy';

@Module({
	imports: [
		PassportModule,
		JwtModule.register({
			secret: process.env.JWT_ACCESS_SECRET || 'dev-secret',
			signOptions: {
				expiresIn: process.env.JWT_ACCESS_EXPIRES || '900s',
			},
		}),
		PrismaModule,
	],
	controllers: [AuthController],
	providers: [AuthService, JwtStrategy],
	exports: [AuthService],
})
export class AuthModule {}

