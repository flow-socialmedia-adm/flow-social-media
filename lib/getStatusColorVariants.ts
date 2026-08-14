import { WORKFLOW_STATUS_PALETTE } from './constants';
import type { StatusDefinition } from '../types';

/**
 * A partir da cor "base" de um status (escolha do usuário), gera variações para
 * substatus, hover, bordas e badges. Retorna classes `bg-*` (Tailwind) alinhadas
 * à família de cor da paleta quando possível; em cores custom (ex.: `bg-[#...]`)
 * repete a base em todas as variações.
 */
export function getStatusColorVariants(base: StatusDefinition['color']): {
	base: string;
	light: string;
	lighter: string;
	dark: string;
} {
	const b = base.bg;
	const idx = WORKFLOW_STATUS_PALETTE.findIndex((p) => p.bg === b);
	if (idx < 0) {
		return { base: b, light: b, lighter: b, dark: b };
	}
	const group = Math.floor(idx / 3) * 3;
	const light = WORKFLOW_STATUS_PALETTE[group];
	const dark = WORKFLOW_STATUS_PALETTE[group + 2];
	const lighterBg = light.bg
		.replace(/-200\b/g, '-100')
		.replace(/-300\b/g, '-100');
	return {
		base: b,
		light: light.bg,
		lighter: lighterBg,
		dark: dark.bg,
	};
}

/** Tom de uma sub-etapa, sempre derivado da família do status principal. */
export function getStatusColorVariantClass(
	base: StatusDefinition['color'],
	variant: 'light' | 'medium' | 'strong' | 'dark' | undefined,
): string {
	const colors = getStatusColorVariants(base);
	switch (variant) {
		case 'light':
			return colors.lighter;
		case 'medium':
			return colors.light;
		case 'strong':
			return colors.base;
		case 'dark':
			return colors.dark;
		default:
			return colors.base;
	}
}
