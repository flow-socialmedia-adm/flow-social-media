import { ArrayMaxSize, IsArray, IsBoolean, IsEmail, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { OPERATIONAL_ROLE_VALUES } from './create-user.dto';
import { USER_FUNCTION_KEYS } from '../user-functions.constants';

export class InviteUserDto {
	@IsEmail()
	email!: string;

	@IsString()
	fullName!: string;

	@IsIn(['admin', 'editor'])
	role!: 'admin' | 'editor';

	@IsOptional()
	@IsArray()
	permissions?: string[];

	@IsOptional()
	@IsIn([...OPERATIONAL_ROLE_VALUES])
	operationalRole?: (typeof OPERATIONAL_ROLE_VALUES)[number];

	@IsOptional()
	@IsBoolean()
	canBeTaskOwner?: boolean;

	@IsOptional()
	@IsBoolean()
	canBePostOwner?: boolean;

	@IsUUID()
	agencyRoleId!: string;

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
}
