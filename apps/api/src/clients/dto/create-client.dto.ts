import { Allow, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateClientDto {
	@IsString()
	name!: string;

	@IsOptional()
	@IsString()
	color?: string | null;

	@IsOptional()
	@IsString()
	avatarUrl?: string | null;

	@IsOptional()
	@IsString()
	website?: string | null;

	@IsOptional()
	contactsJson?: unknown;

	@IsEnum({ company: 'company', individual: 'individual' })
	type!: 'company' | 'individual';

	@IsOptional()
	@IsString()
	document?: string | null;

	@IsEnum({ BRL: 'BRL', USD: 'USD', EUR: 'EUR' })
	currency!: 'BRL' | 'USD' | 'EUR';

	@IsOptional()
	@IsBoolean()
	active?: boolean;

	@IsOptional()
	contractJson?: unknown;

	@IsOptional()
	addressJson?: unknown;

	@IsOptional()
	brandGuideJson?: unknown;

	@IsOptional()
	socialLinksJson?: unknown;

	@IsOptional()
	accessCredentialsJson?: unknown;

	@IsOptional()
	@IsString()
	notes?: string | null;

	@IsOptional()
	@Allow()
	clientOwnerPreferencesJson?: unknown;
}


