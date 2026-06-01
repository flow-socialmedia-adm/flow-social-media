import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum PostAction {
	ENVIAR_PARA_PRODUCAO = 'enviar_para_producao',
	ENVIAR_PARA_APROVACAO = 'enviar_para_aprovacao',
	APROVAR = 'aprovar',
	PEDIR_AJUSTE = 'pedir_ajuste',
	AGENDAR_POST = 'agendar_post',
	MARCAR_COMO_PUBLICADO = 'marcar_como_publicado',
}

export class PostActionDto {
	@IsEnum(PostAction)
	action!: PostAction;

	@IsOptional()
	@IsString()
	scheduledDate?: string; // Para ação 'agendar_post' - formato: YYYY-MM-DD

	@IsOptional()
	@IsString()
	platform?: string; // Para ação 'agendar_post' - ex: 'instagram', 'facebook'

	@IsOptional()
	@IsString()
	notes?: string; // Para ação 'pedir_ajuste'
}
