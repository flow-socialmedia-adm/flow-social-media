import { ArrayMaxSize, IsArray, IsBoolean, IsEmail, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { USER_FUNCTION_KEYS } from '../user-functions.constants';

export const SIMPLE_ACCESS_LEVEL_VALUES = [
	'colaboracao',
	'gerenciar',
	'acesso_total',
	'administrador',
	'gestor',
	'operacional',
	'financeiro',
] as const;

export const OPERATIONAL_ROLE_VALUES = [
	'SOCIAL_MEDIA',
	'DESIGNER',
	'VIDEO_EDITOR',
	'ATENDIMENTO',
	'GESTOR',
	'APROVACAO',
	'OUTRO',
] as const;

export class CreateUserDto {
	@IsEmail()
	email!: string;

	@IsString()
	password!: string;

	@IsString()
	fullName!: string;

	@IsIn(['owner', 'admin', 'editor'])
	role!: 'owner' | 'admin' | 'editor';

	@IsOptional()
	@IsArray()
	permissions?: string[];

	@IsOptional()
	@IsString()
	avatarUrl?: string | null;

	@IsOptional()
	@IsString()
	jobTitle?: string | null;

	@IsOptional()
	@IsString()
	phone?: string | null;

	@IsOptional()
	@IsString()
	birthDate?: string | null;

	@IsOptional()
	@IsIn([...OPERATIONAL_ROLE_VALUES])
	operationalRole?: (typeof OPERATIONAL_ROLE_VALUES)[number];

	@IsOptional()
	@IsBoolean()
	canBeTaskOwner?: boolean;

	@IsOptional()
	@IsBoolean()
	canBePostOwner?: boolean;

	@IsOptional()
	@IsUUID()
	agencyRoleId?: string | null;

	@IsOptional()
	@IsBoolean()
	canBeClientOwner?: boolean;

	@IsOptional()
	@IsBoolean()
	canBePlanningOwner?: boolean;

	@IsOptional()
	@IsArray()
	@ArrayMaxSize(32)
	@IsString({ each: true })
	@IsIn([...USER_FUNCTION_KEYS], { each: true })
	functions?: string[];

	@IsOptional()
	@IsIn([...SIMPLE_ACCESS_LEVEL_VALUES])
	simpleAccessLevel?: (typeof SIMPLE_ACCESS_LEVEL_VALUES)[number];
}


