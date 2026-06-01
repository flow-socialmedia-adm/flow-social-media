import { IsOptional, IsString, MinLength } from 'class-validator';

export class AcceptInviteDto {
	@IsString()
	@MinLength(20)
	token!: string;

	@IsOptional()
	@IsString()
	fullName?: string;

	@IsString()
	@MinLength(8)
	password!: string;

	@IsString()
	@MinLength(8)
	passwordConfirm!: string;
}
