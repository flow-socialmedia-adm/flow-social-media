import { Allow, IsBoolean, IsEmail, IsEnum, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateAgencyDto {
	@IsOptional()
	@IsString()
	name?: string;

	@IsOptional()
	@IsString()
	cnpj?: string | null;

	@IsOptional()
	@IsEmail()
	email?: string;

	@IsOptional()
	@IsString()
	phone?: string | null;

	@IsOptional()
	@Allow()
	addressJson?: unknown;

	@IsOptional()
	@IsString()
	logoUrl?: string | null;

	@IsOptional()
	@IsString()
	brandColor?: string;

	@IsOptional()
	@IsEnum({ BRL: 'BRL', USD: 'USD', EUR: 'EUR' })
	baseCurrency?: 'BRL' | 'USD' | 'EUR';

	// Onboarding fields
	@IsOptional()
	@IsEnum({ SOLO: 'SOLO', TEAM: 'TEAM' })
	mode?: 'SOLO' | 'TEAM';

	@IsOptional()
	onboardingCompleted?: boolean;

	@IsOptional()
	showGuidedTour?: boolean;

	@IsOptional()
	hasSeenHomeTour?: boolean;

	@IsOptional()
	@IsIn(['AGENCY_OWNER', 'MANUAL'])
	defaultOwnerStrategy?: 'AGENCY_OWNER' | 'MANUAL';

	@IsOptional()
	@IsBoolean()
	allowStageOwners?: boolean;

	/** Modo operacional descritivo (independe de `mode` SOLO/TEAM). */
	@IsOptional()
	@IsIn(['solo', 'lean', 'structured'])
	operationMode?: 'solo' | 'lean' | 'structured';

	/** Preferência base para responsável pelo cliente (Fase 1 — sem efeito nas telas ainda). */
	@IsOptional()
	@IsIn(['default_member', 'per_client_planning'])
	clientResponsibleMode?: 'default_member' | 'per_client_planning';

	@IsOptional()
	@IsUUID()
	defaultClientOwnerUserId?: string | null;
}


