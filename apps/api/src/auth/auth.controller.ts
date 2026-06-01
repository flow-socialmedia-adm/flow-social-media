import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Post,
	Query,
	Req,
	Res,
	UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { IsEmail, IsOptional, IsString } from 'class-validator';
import { Response } from 'express';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { PasswordResetAcceptDto } from './dto/password-reset-accept.dto';

class LoginDto {
	@IsEmail() email!: string;
	@IsString() password!: string;
}

class RefreshDto {
	@IsString()
	refreshToken!: string;
}

class SignupDto {
	@IsString() ownerName!: string;
	@IsString() agencyName!: string;
	@IsString() phone!: string;
	@IsEmail() email!: string;
	@IsString() password!: string;
	@IsString() passwordConfirm!: string;
}

class GoogleDto {
	@IsString() credential!: string; // Google ID token
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
	constructor(private readonly auth: AuthService) {}

	@Public()
	@Post('login')
	async login(@Body() dto: LoginDto) {
		return this.auth.login(dto);
	}

	@ApiBearerAuth()
	@UseGuards(JwtAuthGuard)
	@Get('me')
	async me(@Req() req: any) {
		return this.auth.me(req.user.sub);
	}

	@Public()
	@Post('refresh')
	async refresh(@Body() dto: RefreshDto, @Res() res: Response) {
		try {
			const payload = this.auth.verifyRefreshToken(dto.refreshToken);
			await this.auth.assertUserCanRefresh(payload.sub);
			return res.status(HttpStatus.OK).json({
				accessToken: this.auth.signAccessToken({
					sub: payload.sub,
					agencyId: payload.agencyId,
					role: payload.role,
					permissions: payload.permissions ?? [],
				}),
			});
		} catch (err: any) {
			// Evita ExceptionsHandler/logs para caso esperado e padroniza a resposta 401
			const code =
				err?.response?.code === 'refresh_token_expired' ||
				err?.name === 'TokenExpiredError'
					? 'refresh_token_expired'
					: 'refresh_token_invalid';
			return res.status(HttpStatus.UNAUTHORIZED).json({
				error: 'unauthorized',
				code,
				message: 'Session expired, please login again',
			});
		}
	}

	@Public()
	@Post('signup')
	async signup(@Body() dto: SignupDto) {
		return this.auth.signup(dto as any);
	}

	@Public()
	@Post('google')
	async loginWithGoogle(@Body() dto: GoogleDto) {
		return this.auth.loginWithGoogle(dto.credential);
	}

	@Public()
	@Get('invite/preview')
	async invitePreview(@Query('token') token?: string) {
		return this.auth.getInvitePreview(token || '');
	}

	@Public()
	@Post('invite/accept')
	async inviteAccept(@Body() dto: AcceptInviteDto) {
		return this.auth.acceptInvite(dto);
	}

	@Public()
	@Get('password-reset/preview')
	async passwordResetPreview(@Query('token') token?: string) {
		return this.auth.getPasswordResetPreview(token || '');
	}

	@Public()
	@Post('password-reset/accept')
	async passwordResetAccept(@Body() dto: PasswordResetAcceptDto) {
		return this.auth.acceptPasswordReset(dto);
	}

	@ApiBearerAuth()
	@UseGuards(JwtAuthGuard)
	@Delete('account')
	@HttpCode(200)
	async deleteAccount(@Req() req: any) {
		return this.auth.softDeleteAccount(req.user.sub);
	}
}

