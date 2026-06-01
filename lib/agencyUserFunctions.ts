/** Chaves canônicas de funções operacionais (multi-função). Alinhado à validação da API. */
export const AGENCY_USER_FUNCTION_KEYS = [
	'adm',
	'gestor',
	'social_media',
	'designer',
	'atendimento',
	'videomaker',
	'estrategia',
	'trafego',
	'financeiro',
] as const;

export type AgencyUserFunctionKey = (typeof AGENCY_USER_FUNCTION_KEYS)[number];
