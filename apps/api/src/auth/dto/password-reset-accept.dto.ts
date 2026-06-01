import { IsString, MinLength } from 'class-validator';

export class PasswordResetAcceptDto {
	@IsString()
	@MinLength(20)
	token!: string;

	@IsString()
	@MinLength(8)
	password!: string;

	@IsString()
	@MinLength(8)
	passwordConfirm!: string;
}
