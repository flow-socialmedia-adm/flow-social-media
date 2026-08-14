import { Allow, IsIn } from 'class-validator';

export class UpdateAgencyColorSchemeDto {
	@IsIn(['posts', 'tasks'])
	area!: 'posts' | 'tasks';

	@Allow()
	preference!: unknown;
}
