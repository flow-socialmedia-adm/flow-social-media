import React from 'react';
import { COUNTRIES, getFlagSvg } from '../lib/phone.tsx';

// Inline SVG flags to ensure consistent rendering across OS/browsers (Windows included)
const FlagBR = () => (
	<svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true">
		<rect width="20" height="14" fill="#009B3A"/>
		<polygon points="10,2 17,7 10,12 3,7" fill="#FFDF00"/>
		<circle cx="10" cy="7" r="3" fill="#002776"/>
	</svg>
);
const FlagUS = () => (
	<svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true">
		<rect width="20" height="14" fill="#B22234"/>
		{[...Array(6)].map((_,i)=>(
			<rect key={i} y={i*2+1} width="20" height="1" fill="#FFFFFF"/>
		))}
		<rect width="9" height="7" fill="#3C3B6E"/>
		{[...Array(3)].map((_,r)=>[...Array(4)].map((_,c)=>(
			<circle key={`${r}-${c}`} cx={1.2 + c*2} cy={1 + r*2} r="0.25" fill="#FFFFFF"/>
		)))}
	</svg>
);
const FlagAR = () => (
	<svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true">
		<rect width="20" height="14" fill="#75AADB"/>
		<rect y="4" width="20" height="6" fill="#FFFFFF"/>
		<circle cx="10" cy="7" r="1.5" fill="#F6B40E"/>
	</svg>
);
const FlagPT = () => (
	<svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true">
		<rect width="20" height="14" fill="#FF0000"/>
		<rect width="8" height="14" fill="#006600"/>
		<circle cx="8" cy="7" r="2.2" fill="#FFCC00"/>
	</svg>
);
const FlagES = () => (
	<svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true">
		<rect width="20" height="14" fill="#AA151B"/>
		<rect y="3" width="20" height="8" fill="#F1BF00"/>
	</svg>
);
const FlagFR = () => (
	<svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true">
		<rect width="20" height="14" fill="#ED2939"/>
		<rect width="13.3" height="14" fill="#FFFFFF"/>
		<rect width="6.6" height="14" fill="#002395"/>
	</svg>
);

export type PhoneInputProps = {
	label?: string;
	value: string;
	onChange: (next: string) => void;
	countryCode: string; // 'BR', 'US', ...
	onCountryChange?: (code: string) => void;
	error?: string;
	required?: boolean;
	className?: string;
	placeholder?: string;
	appearance?: 'default' | 'clean';
	/** BR: força máscara e limite de dígitos locais (DDD + número). Ignorado fora de +55. */
	brNumberKind?: 'auto' | 'mobile' | 'landline';
};

function getCountryByDialValue(value: string) {
	const found = COUNTRIES.find(c => (value || '').startsWith(c.dial));
	return found || COUNTRIES[0];
}

function formatMask(
	digitsOnly: string,
	dial: string,
	brKind: 'auto' | 'mobile' | 'landline' = 'auto',
): string {
	// digitsOnly does NOT include dial prefix
	if (dial === '+55') {
		if (digitsOnly.length <= 2) return digitsOnly;
		const ddd = digitsOnly.slice(0, 2);
		const rest = digitsOnly.slice(2);
		if (brKind === 'landline') {
			if (digitsOnly.length <= 6) return `(${ddd}) ${rest}`;
			return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4, 8)}`;
		}
		if (brKind === 'mobile') {
			if (digitsOnly.length <= 7) return `(${ddd}) ${rest}`;
			return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`;
		}
		// auto: celular 11 dígitos ou número que começa com 9 após o DDD
		const treatAsMobile =
			digitsOnly.length === 11 || (rest.length >= 1 && rest.charAt(0) === '9' && digitsOnly.length >= 3);
		if (treatAsMobile) {
			if (digitsOnly.length <= 7) return `(${ddd}) ${rest}`;
			return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`;
		}
		if (digitsOnly.length <= 6) return `(${ddd}) ${rest}`;
		return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4, 8)}`;
	}
	if (dial === '+1') {
		if (digitsOnly.length <= 3) return digitsOnly;
		if (digitsOnly.length <= 6) return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3)}`;
		return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6, 10)}`;
	}
	return digitsOnly; // generic minimal formatting for other countries
}

function maxBrLocalDigits(brKind: 'auto' | 'mobile' | 'landline'): number {
	if (brKind === 'landline') return 10;
	return 11;
}

const PhoneInput: React.FC<PhoneInputProps> = ({
	label,
	value,
	onChange,
	countryCode,
	onCountryChange,
	error,
	required,
	className = '',
	placeholder = '(11) 99999-9999',
	appearance = 'default',
	brNumberKind = 'auto',
}) => {
	const [open, setOpen] = React.useState(false);
	const [query, setQuery] = React.useState('');
	const [numberFocused, setNumberFocused] = React.useState(false);
	const wrapperRef = React.useRef<HTMLDivElement | null>(null);
	const country = React.useMemo(() => COUNTRIES.find(c => c.code === (countryCode || '').toUpperCase()) || getCountryByDialValue(value || ''), [countryCode, value]);
	const allDigits = (value || '').replace(/\D/g, '');
	const dialDigits = country.dial.replace(/\D/g, '');
	const localDigitsRaw = allDigits.startsWith(dialDigits) ? allDigits.slice(dialDigits.length) : allDigits;
	const brCap = country.dial === '+55' ? maxBrLocalDigits(brNumberKind) : null;
	const localDigits =
		brCap !== null && localDigitsRaw.length > brCap ? localDigitsRaw.slice(0, brCap) : localDigitsRaw;
	const display = formatMask(localDigits, country.dial, country.dial === '+55' ? brNumberKind : 'auto');

	React.useEffect(() => {
		if (country.dial !== '+55' || brCap === null) return;
		if (localDigitsRaw.length <= brCap) return;
		const next = `${country.dial}${localDigitsRaw.slice(0, brCap)}`;
		if (next !== (value || '')) onChange(next);
	}, [country.dial, brCap, localDigitsRaw, value, onChange]);

	React.useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (!wrapperRef.current) return;
			if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
		};
		window.addEventListener('mousedown', handler);
		return () => window.removeEventListener('mousedown', handler);
	}, []);

	const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const raw = e.target.value;
		let digits = raw.replace(/\D/g, '');
		if (country.dial === '+55') {
			const cap = maxBrLocalDigits(brNumberKind);
			digits = digits.slice(0, cap);
		}
		onChange(`${country.dial}${digits}`);
	};

	const filtered = React.useMemo(() => {
		const q = (query || '').toLowerCase().trim();
		if (!q) return COUNTRIES;
		return COUNTRIES.filter(c =>
			c.name.toLowerCase().includes(q) ||
			c.dial.includes(q) ||
			c.code.toLowerCase().includes(q)
		);
	}, [query]);

	const isClean = appearance === 'clean';
	const widthCh = React.useMemo(() => {
		const len = Math.max((display || '').length, (placeholder || '').length, 10);
		return Math.min(28, Math.max(10, len + 2));
	}, [display, placeholder]);
	const showNumberUnderline = numberFocused || !!error;

	const triggerClass = isClean
		? 'inline-flex cursor-pointer items-center gap-1 rounded-md border-0 border-transparent bg-transparent px-1 py-0.5 text-xs text-gray-900 shadow-none outline-none transition-colors hover:bg-gray-100/90 focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400/35 dark:text-white dark:hover:bg-gray-700/45 sm:text-sm'
		: 'inline-flex items-center gap-2 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white px-2 py-2 text-xs sm:text-sm';
	const inputClass = isClean
		? `box-content min-w-0 border-0 border-b bg-transparent px-0.5 py-0.5 text-sm text-gray-900 transition-colors focus:outline-none focus:ring-0 dark:text-white ${
				error
					? 'border-red-500 dark:border-red-500'
					: showNumberUnderline
						? 'border-gray-300 dark:border-gray-600'
						: 'border-transparent'
		  }`
		: `flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm focus:outline-none focus:ring-0 focus:border-gray-400 ${error ? 'border-red-500 focus:border-red-500' : ''}`;
	const wrapperClass = isClean
		? 'inline-flex max-w-full flex-wrap items-end gap-1.5'
		: 'flex gap-2 items-stretch';

	return (
		<div className={`${isClean ? 'min-w-0 max-w-full' : 'w-full'} ${className}`}>
			{label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}{required ? ' *' : ''}</label>}
			<div ref={wrapperRef} className={wrapperClass}>
				<div className="relative shrink-0">
				<button
					type="button"
					onClick={() => setOpen((v)=>!v)}
					className={triggerClass}
				>
					<span className="inline-flex items-center w-5 h-[14px]">{getFlagSvg(country.code)}</span>
					<span className="leading-none tabular-nums">{country.dial}</span>
					<span className="ml-0.5 text-gray-500 dark:text-gray-400">▾</span>
				</button>
				{open && (
					<div className="absolute z-50 mt-1 w-60 max-h-72 overflow-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
						<div className="sticky top-0 bg-white dark:bg-gray-800 p-2 border-b border-gray-200 dark:border-gray-700">
							<input
								autoFocus
								value={query}
								onChange={(e)=>setQuery(e.target.value)}
								placeholder="Buscar país ou código"
								className="w-full px-2 py-1 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
							/>
						</div>
						<ul className="py-1 text-sm">
							{filtered.map((c) => (
								<li key={`${c.code}-${c.dial}`}>
									<button
										type="button"
										onClick={() => {
											const digits = (value || '').replace(/\D/g, '');
											const currentDialDigits = country.dial.replace(/\D/g, '');
											let remaining = digits.startsWith(currentDialDigits)
												? digits.slice(currentDialDigits.length)
												: digits;
											if (c.dial === '+55') {
												remaining = remaining.slice(0, maxBrLocalDigits(brNumberKind));
											}
											onChange(`${c.dial}${remaining}`);
											onCountryChange && onCountryChange(c.code);
											setOpen(false);
										}}
										className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
									>
										<span className="inline-flex items-center w-5 h-[14px]">{getFlagSvg(c.code)}</span>
										<span className="flex-1 text-left">{c.name}</span>
										<span className="opacity-80">{c.dial}</span>
									</button>
								</li>
							))}
						</ul>
					</div>
				)}
				</div>
			<input
				type="tel"
				value={display}
				onChange={handleNumberChange}
				onFocus={() => setNumberFocused(true)}
				onBlur={() => setNumberFocused(false)}
				placeholder={placeholder}
				className={inputClass}
				style={isClean ? { width: `${widthCh}ch`, maxWidth: '100%' } : undefined}
			/>
			</div>
			{error && <p className="mt-1 text-xs text-red-600">{error}</p>}
			{/* ATENÇÃO: use sempre este PhoneInput para campos de telefone/celular
			    em novas telas, para manter bandeiras, DDI e validação padronizadas. */}
		</div>
	);
};

export default PhoneInput;


