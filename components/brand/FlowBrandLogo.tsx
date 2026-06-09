import React, { useContext, useState } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { Theme } from '../../types';
import {
	BRAND_PRODUCT_NAME,
	resolveBrandLogoSrc,
	type BrandLogoSurface,
	type BrandLogoVariant,
} from '../../lib/brandAssets';

export type FlowBrandLogoProps = {
	variant?: BrandLogoVariant;
	/** Altura em px. Largura automática via object-contain. */
	height?: number;
	surface?: BrandLogoSurface;
	className?: string;
	theme?: 'light' | 'dark';
};

const DEFAULT_HEIGHT: Record<BrandLogoVariant, number> = {
	full: 44,
	symbol: 36,
};

export const FlowBrandLogo: React.FC<FlowBrandLogoProps> = ({
	variant = 'full',
	height,
	surface = 'auto',
	className = '',
	theme: themeOverride,
}) => {
	const ctx = useContext(AppContext);
	const theme = themeOverride ?? (ctx?.theme === Theme.DARK ? 'dark' : 'light');
	const [failed, setFailed] = useState(false);
	const h = height ?? DEFAULT_HEIGHT[variant];
	const src = resolveBrandLogoSrc(variant, surface, theme);

	if (failed) {
		return (
			<span
				className={`inline-block font-bold tracking-tight text-slate-800 dark:text-white ${className}`}
				style={{ fontSize: variant === 'symbol' ? '0.875rem' : '1rem', lineHeight: `${h}px` }}
			>
				{BRAND_PRODUCT_NAME}
			</span>
		);
	}

	return (
		<img
			src={src}
			alt={BRAND_PRODUCT_NAME}
			onError={() => setFailed(true)}
			className={`block w-auto bg-transparent object-contain ${className}`}
			style={{ height: h, maxWidth: '100%', background: 'transparent' }}
			decoding="async"
		/>
	);
};
