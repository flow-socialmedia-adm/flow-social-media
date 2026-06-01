import { IsIn, IsObject, IsString, MaxLength, MinLength } from 'class-validator';

export const AGENCY_ACCESS_LEVELS = ['ADMIN', 'MANAGER', 'OPERATIONAL', 'FINANCIAL', 'VIEWER'] as const;

export class CreateAgencyRoleDto {
	@IsString()
	@MinLength(1)
	@MaxLength(120)
	name!: string;

	@IsIn([...AGENCY_ACCESS_LEVELS])
	accessLevel!: (typeof AGENCY_ACCESS_LEVELS)[number];

	@IsObject()
	permissions!: Record<string, string>;

	@IsObject()
	flags!: {
		canBeResponsiblePosts?: boolean;
		canBeResponsibleTasks?: boolean;
		canBeResponsibleClients?: boolean;
		canBeResponsiblePlanning?: boolean;
	};
}
