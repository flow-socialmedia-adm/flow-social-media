import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateTaskDto {
	@IsOptional()
	@IsString()
	clientId?: string | null;

	@IsString()
	title!: string;

	@IsOptional()
	@IsDateString()
	date?: string; // YYYY-MM-DD - compatibilidade; preferir publishDate/dueDate

	@IsOptional()
	@IsDateString()
	publishDate?: string; // YYYY-MM-DD - obrigatório para POST (clientId preenchido)

	@IsOptional()
	@IsBoolean()
	isProvisionalPublishDate?: boolean;

	@IsOptional()
	@IsDateString()
	dueDate?: string; // YYYY-MM-DD - obrigatório para tarefa geral (clientId null)

	@IsOptional()
	@IsBoolean()
	isProvisionalDueDate?: boolean;

	@IsOptional()
	@IsString()
	postType?: 'static' | 'video' | 'carousel' | 'reels' | 'story' | null;

	@IsString()
	workflowId!: string;

	@IsString()
	statusId!: string;

	@IsOptional()
	@IsString()
	description?: string | null;

	@IsOptional()
	@IsString()
	category?: string | null;

	@IsOptional()
	@IsString()
	ownerUserId?: string | null;

	@IsOptional()
	@IsString()
	origin?: string | null;

	@IsOptional()
	@IsBoolean()
	bornAsForecast?: boolean;

	@IsOptional()
	@IsString()
	currentActionId?: string | null;
}


