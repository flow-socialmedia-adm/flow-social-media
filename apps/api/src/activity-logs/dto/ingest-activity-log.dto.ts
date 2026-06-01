import { Type } from 'class-transformer';
import { Equals, IsIn, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

const VERBS = ['created', 'updated', 'deleted', 'added', 'removed'] as const;
const ITEMS = ['post', 'forecast', 'task', 'client', 'member', 'settings_agency', 'income', 'expense'] as const;
const PAGES = ['tasks', 'editorial', 'agenda', 'posts', 'clients', 'financial', 'account'] as const;
const CLIENT_SECTIONS = [
	'overview',
	'identity',
	'client_data',
	'brand_guide',
	'strategy',
	'planning',
	'contract',
	'finance',
] as const;
const ACCOUNT_TABS = ['details', 'team', 'billing'] as const;

export class ActivityHistoryLineIngestDto {
	@Equals(2)
	v!: 2;

	@IsIn([...VERBS])
	verb!: (typeof VERBS)[number];

	@IsIn([...ITEMS])
	item!: (typeof ITEMS)[number];

	@IsString()
	@MaxLength(500)
	name!: string;

	@IsIn([...PAGES])
	page!: (typeof PAGES)[number];

	@IsOptional()
	@IsIn([...CLIENT_SECTIONS])
	clientSection?: (typeof CLIENT_SECTIONS)[number];

	@IsOptional()
	@IsIn([...ACCOUNT_TABS])
	accountTab?: (typeof ACCOUNT_TABS)[number];
}

export class IngestActivityLogDto {
	@IsOptional()
	@ValidateNested()
	@Type(() => ActivityHistoryLineIngestDto)
	line?: ActivityHistoryLineIngestDto;

	/** Legado (pré-v2). */
	@IsOptional()
	@IsString()
	@MaxLength(200)
	actionKey?: string;

	@IsOptional()
	@IsString()
	@MaxLength(500)
	targetName?: string;
}
