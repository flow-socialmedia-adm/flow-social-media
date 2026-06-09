/** Caminhos públicos dos assets de marca Flow Social Media. */
export const BRAND_ASSETS = {
	fullLight: '/branding/logo-full-light.png',
	fullDark: '/branding/logo-full-dark.png',
	symbolColor: '/branding/logo-symbol-color.png',
	symbolWhite: '/branding/logo-symbol-white.png',
	favicon16: '/branding/favicon-16.png',
	favicon32: '/branding/favicon-32.png',
	favicon48: '/branding/favicon-48.png',
	appleTouchIcon: '/branding/apple-touch-icon.png',
} as const;

export const BRAND_PRODUCT_NAME = 'Flow Social Media';

export type BrandLogoVariant = 'full' | 'symbol';

/** Superfície de exibição: auto segue o tema; light/dark força o par de assets. */
export type BrandLogoSurface = 'auto' | 'light' | 'dark';

export function resolveBrandLogoSrc(
	variant: BrandLogoVariant,
	surface: BrandLogoSurface,
	theme: 'light' | 'dark',
): string {
	const isDark = surface === 'auto' ? theme === 'dark' : surface === 'dark';
	if (variant === 'symbol') {
		return isDark ? BRAND_ASSETS.symbolWhite : BRAND_ASSETS.symbolColor;
	}
	return isDark ? BRAND_ASSETS.fullDark : BRAND_ASSETS.fullLight;
}
