import { Allow, IsIn, IsOptional, IsString } from 'class-validator';
import { TASK_STATUS_CHANGE_SOURCES } from '../task-status-change-source';

/** Entrada: canônicos + legado aceito (normalizado ao gravar). */
const MOVE_STATUS_CHANGE_SOURCE_INPUT = [...TASK_STATUS_CHANGE_SOURCES, 'patch_status'] as [string, ...string[]];

export class MoveStatusDto {
	@IsString()
	statusId!: string;

	@IsOptional()
	@IsIn(MOVE_STATUS_CHANGE_SOURCE_INPUT)
	changeSource?: string;

	/** Sub-etapa linear (`currentActionId`); omitir para o servidor usar o padrão do fluxo. */
	@Allow()
	@IsOptional()
	currentActionId?: string | null;
}
