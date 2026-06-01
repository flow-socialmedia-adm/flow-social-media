/** Lista fechada validada na API; expandir aqui e no frontend `lib/agencyUserFunctions.ts`. */
export const USER_FUNCTION_KEYS = [
	'adm',
	'gestor',
	'social_media',
	'designer',
	'atendimento',
	'video',
	'videomaker',
	'estrategia',
	'trafego',
	'financeiro',
] as const;

export type UserFunctionKey = (typeof USER_FUNCTION_KEYS)[number];

const ALLOWED = new Set<string>(USER_FUNCTION_KEYS);

export function normalizeUserFunctionsJson(input: unknown): string[] {
	if (!Array.isArray(input)) return [];
	const out: string[] = [];
	for (const x of input) {
		if (typeof x !== 'string' || !ALLOWED.has(x)) continue;
		if (!out.includes(x)) out.push(x);
		if (out.length >= 32) break;
	}
	return out;
}
