import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../contexts/AppContext';
import { AuthContext } from '../contexts/AuthContext';
import { EyeIcon, EyeOffIcon, GoogleIcon } from './icons';
import PhoneInput from './PhoneInput';
import { FlowBrandLogo } from './brand/FlowBrandLogo';

interface SignupPageProps {
	onSignup: () => void;
	onNavigateToLogin: () => void;
	onNavigateToLanding: () => void;
}

const SignupPage: React.FC<SignupPageProps> = ({ onSignup, onNavigateToLogin, onNavigateToLanding }) => {
	const context = useContext(AppContext);
	const { signup, googleLogin } = useContext(AuthContext);
	const [showPassword, setShowPassword] = useState(false);
	const [ownerName, setOwnerName] = useState('');
	const [agencyName, setAgencyName] = useState('');
	const [phone, setPhone] = useState('+55');
	const [countryCode, setCountryCode] = useState('BR');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [passwordConfirm, setPasswordConfirm] = useState('');
	const [agree, setAgree] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const strong = /(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}/.test(password);
	// PhoneInput usa bandeiras reais (ver componente compartilhado)
	const SIGNUP_DRAFT_KEY = 'flow.signupDraft';

	type SignupFieldError = {
		email?: string;
		password?: string;
		confirmPassword?: string;
		phone?: string;
		name?: string;
		agencyName?: string;
		terms?: string;
		global?: string;
	};
	const [fieldErrors, setFieldErrors] = useState<SignupFieldError>({});

	const isValidEmail = (value: string) => {
		// Regex simples de e-mail
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || '').trim());
	};
	const isValidPhone = (full: string) => {
		const digits = (full || '').replace(/\D/g, '');
		if ((full || '').startsWith('+55')) {
			// +55 (2 dígitos) + 11 dígitos locais
			const local = digits.slice(2);
			return local.length === 11;
		}
		// Validação mínima para outros países
		// Remove o código do país (assumindo que o valor começa com '+')
		const match = /^\+(\d+)/.exec(full || '');
		const dialLen = match ? match[1].length : 0;
		const local = dialLen ? digits.slice(dialLen) : digits;
		return local.length >= 8;
	};
	const ensurePasswordStrong = (pwd: string) => /(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}/.test(pwd || '');

	// Montagem: carrega rascunho salvo (para permitir voltar do pagamento mantendo dados).
	// Se a navegação for um RELOAD (F5/Ctrl+F5), apagamos o rascunho para recomeçar do zero.
	useEffect(() => {
		setError(null);
		setFieldErrors({});
		let isReload = false;
		try {
			// Navigation Timing Level 2
			const nav = (performance && 'getEntriesByType' in performance) ? (performance.getEntriesByType('navigation') as any) : [];
			if (nav && nav.length && nav[0] && nav[0].type === 'reload') {
				isReload = true;
			} else if ((performance as any).navigation && (performance as any).navigation.type === 1) {
				// Fallback para navegadores antigos
				isReload = true;
			}
		} catch {}

		if (!isReload) {
			try {
				const raw = localStorage.getItem(SIGNUP_DRAFT_KEY);
				if (raw) {
					const d = JSON.parse(raw);
					if (typeof d.ownerName === 'string') setOwnerName(d.ownerName);
					if (typeof d.agencyName === 'string') setAgencyName(d.agencyName);
					// compat: versões antigas salvavam separados
					if (typeof d.phone === 'string') setPhone(d.phone);
					if (typeof d.email === 'string') setEmail(d.email);
					if (typeof d.password === 'string') setPassword(d.password);
					if (typeof d.passwordConfirm === 'string') setPasswordConfirm(d.passwordConfirm);
					// compat: caso antigo, countryCode + phoneRaw
					if (typeof d.countryCode === 'string') setCountryCode(d.countryCode);
					if (typeof d.countryCode === 'string' && typeof d.phoneRaw === 'string') {
						const combined = `${d.countryCode === 'BR' ? '+55' : d.countryCode}${String(d.phoneRaw).replace(/\D/g, '')}`;
						setPhone(combined);
					}
					if (typeof d.agree === 'boolean') setAgree(d.agree);
					return;
				}
			} catch {}
		} else {
			// Limpa rascunho em reload explícito
			try { localStorage.removeItem(SIGNUP_DRAFT_KEY); } catch {}
		}
		// sem rascunho → começa limpo
		setOwnerName('');
		setAgencyName('');
		setPhone('+55');
		setCountryCode('BR');
		setEmail('');
		setPassword('');
		setPasswordConfirm('');
		setAgree(false);
	}, []);

	if (!context) return null;
	const { t, notify } = context;

	// Auto-clear phone error when value becomes valid
	useEffect(() => {
		if (!fieldErrors.phone) return;
		if (isValidPhone(phone)) {
			setFieldErrors((prev) => ({ ...prev, phone: undefined }));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [phone]);
	return (
		<div className="min-h-screen bg-white dark:bg-gray-900 flex">
			<div className="hidden lg:flex w-1/2 bg-[#4285F4] relative items-center justify-center p-12 text-white flex-col">
				<div className="absolute top-8 left-8">
					<FlowBrandLogo variant="full" height={48} surface="dark" />
				</div>
				<div className="z-10 text-center">
					<h1 className="text-5xl font-bold mb-4">{t('create_account')}</h1>
					<p className="text-lg max-w-sm">Crie sua agência e ganhe 10 dias de teste.</p>
				</div>
				<div className="absolute top-10 right-10 w-20 h-20 bg-white/10 rounded-full"></div>
				<div className="absolute bottom-10 left-10 w-24 h-24 bg-white/10 rounded-lg transform rotate-45"></div>
			</div>

			<div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
				<div className="w-full max-w-md">
					<div className="flex justify-center mb-8 lg:hidden">
						<FlowBrandLogo variant="full" height={48} />
					</div>
					<h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Criar conta</h2>
					<p className="text-gray-600 dark:text-gray-400 mb-8">
						Já tem uma conta?{' '}
						<button onClick={onNavigateToLogin} className="font-medium text-indigo-600 hover:text-indigo-500">Fazer login</button>
					</p>

					<form autoComplete="off" onSubmit={async (e) => {
						e.preventDefault();
						setError(null);
						setFieldErrors({});
						setSubmitting(true);
						try {
							// validações de front
							const newErrors: SignupFieldError = {};
							if (!ownerName.trim()) newErrors.name = t('signup_required_field');
							if (!agencyName.trim()) newErrors.agencyName = t('signup_required_field');
							if (!email.trim() || !isValidEmail(email)) newErrors.email = t('signup_email_invalid');
							if (!isValidPhone(phone)) newErrors.phone = t('signup_phone_invalid');
							if (!ensurePasswordStrong(password)) newErrors.password = t('signup_password_requirements');
							if (password !== passwordConfirm) newErrors.confirmPassword = t('signup_password_mismatch');
							if (!agree) newErrors.terms = t('signup_terms_required');

							if (Object.keys(newErrors).length > 0) {
								setFieldErrors(newErrors);
								// foco no primeiro erro
								if (newErrors.name) (document.querySelector('input[name="signup-owner"]') as HTMLInputElement | null)?.focus();
								else if (newErrors.agencyName) (document.querySelector('input[name="signup-agency"]') as HTMLInputElement | null)?.focus();
								else if (newErrors.email) (document.querySelector('input[name="signup-email"]') as HTMLInputElement | null)?.focus();
								else if (newErrors.phone) (document.querySelector('input[name="signup-phone"]') as HTMLInputElement | null)?.focus();
								else if (newErrors.password) (document.querySelector('input[name="signup-password"]') as HTMLInputElement | null)?.focus();
								else if (newErrors.confirmPassword) (document.querySelector('input[name="signup-password-confirm"]') as HTMLInputElement | null)?.focus();
								setSubmitting(false);
								return;
							}

							// Salva rascunho para permitir retorno após cancelamento no pagamento
							localStorage.setItem(
								SIGNUP_DRAFT_KEY,
								JSON.stringify({ ownerName, agencyName, phone, countryCode, email, password, passwordConfirm, agree })
							);

							await signup({ ownerName, agencyName, phone, email, password, passwordConfirm });
							onSignup();
						} catch (err: any) {
							// Interpretar erro do backend sem exibir JSON cru
							let friendly: SignupFieldError = {};
							try {
								const parsed = JSON.parse(err?.message || '{}');
								const messagesArr: string[] = Array.isArray(parsed?.message)
									? parsed.message
									: (parsed?.message ? [String(parsed.message)] : []);
								// mapear mensagens conhecidas
								if (messagesArr.some((m) => /already in use/i.test(m))) {
									friendly.email = t('signup_email_in_use');
								} else if (messagesArr.some((m) => /must be an email/i.test(m) || /email.*invalid/i.test(m))) {
									friendly.email = t('signup_email_invalid');
								} else if (messagesArr.some((m) => /password.*include/i.test(m))) {
									friendly.password = t('signup_password_requirements');
								} else if (messagesArr.some((m) => /passwords do not match/i.test(m))) {
									friendly.confirmPassword = t('signup_password_mismatch');
								} else if (parsed?.error && parsed?.statusCode) {
									friendly.global = t('signup_generic_error');
								}
							} catch {
								friendly.global = t('signup_generic_error');
							}
							if (friendly.global) setError(friendly.global);
							if (Object.keys(friendly).length > 0) setFieldErrors(friendly);
							if (!friendly.global && Object.keys(friendly).length === 0) setError(t('signup_generic_error'));
						} finally {
							setSubmitting(false);
						}
					}}>
						<div className="space-y-6">
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Seu Nome</label>
								<input
									name="signup-owner"
									autoComplete="off"
									value={ownerName}
									onChange={(e)=>{
										setOwnerName(e.target.value);
										if (fieldErrors.name && e.target.value.trim()) {
											setFieldErrors((prev)=>({ ...prev, name: undefined }));
										}
									}}
									onBlur={() => {
										if (!ownerName.trim()) setFieldErrors((prev)=>({ ...prev, name: t('signup_required_field') }));
									}}
									required
									className="mt-1 block w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
								/>
								{fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome da sua agência</label>
								<input
									name="signup-agency"
									autoComplete="off"
									value={agencyName}
									onChange={(e)=>{
										setAgencyName(e.target.value);
										if (fieldErrors.agencyName && e.target.value.trim()) {
											setFieldErrors((prev)=>({ ...prev, agencyName: undefined }));
										}
									}}
									onBlur={() => {
										if (!agencyName.trim()) setFieldErrors((prev)=>({ ...prev, agencyName: t('signup_required_field') }));
									}}
									required
									className="mt-1 block w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
								/>
								{fieldErrors.agencyName && <p className="mt-1 text-xs text-red-600">{fieldErrors.agencyName}</p>}
							</div>
							<div>
								<PhoneInput
									label="Celular"
									value={phone}
									countryCode={countryCode}
									onCountryChange={(c)=>setCountryCode(c)}
									onChange={(val)=>{
										setPhone(val);
										if (fieldErrors.phone && isValidPhone(val)) {
											setFieldErrors((prev)=>({ ...prev, phone: undefined }));
										}
									}}
									placeholder="(11) 99999-9999"
									error={fieldErrors.phone}
									required
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">E-mail</label>
								<input
									type="email"
									name="signup-email"
									autoComplete="new-email"
									value={email}
									onChange={(e)=>{
										setEmail(e.target.value);
										if (fieldErrors.email && isValidEmail(e.target.value)) {
											setFieldErrors((prev)=>({ ...prev, email: undefined }));
										}
									}}
									onBlur={() => {
										if (!isValidEmail(email)) {
											setFieldErrors((prev) => ({ ...prev, email: t('signup_email_invalid') }));
										} else {
											setFieldErrors((prev) => ({ ...prev, email: undefined }));
										}
									}}
									required
									className="mt-1 block w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
								/>
								{fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
							</div>
							<div className="relative">
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Definir senha</label>
								<input
									name="signup-password"
									autoComplete="new-password"
									value={password}
									onChange={(e)=>{
										const next = e.target.value;
										setPassword(next);
										// limpar erro de senha fraca assim que ficar válida
										if (fieldErrors.password && ensurePasswordStrong(next)) {
											setFieldErrors((prev)=>({ ...prev, password: undefined }));
										}
										// se já havia erro de confirmação e agora coincidem, limpar
										if (fieldErrors.confirmPassword && passwordConfirm === next) {
											setFieldErrors((prev)=>({ ...prev, confirmPassword: undefined }));
										}
									}}
									type={showPassword ? "text" : "password"}
									required
									className="mt-1 block w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
								/>
								<button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
									{showPassword ? <EyeOffIcon/> : <EyeIcon/>}
								</button>
								<div className="mt-1 text-xs">
									<span className={strong ? 'text-green-600' : 'text-gray-500'}>{t('signup_password_help')}</span>
								</div>
								{fieldErrors.password && <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirmar senha</label>
								<input
									name="signup-password-confirm"
									autoComplete="new-password"
									value={passwordConfirm}
									onChange={(e)=>{
										const next = e.target.value;
										setPasswordConfirm(next);
										if (fieldErrors.confirmPassword && password === next) {
											setFieldErrors((prev)=>({ ...prev, confirmPassword: undefined }));
										}
									}}
									onBlur={() => {
										if (password !== passwordConfirm) {
											setFieldErrors((prev)=>({ ...prev, confirmPassword: t('signup_password_mismatch') }));
										} else {
											setFieldErrors((prev)=>({ ...prev, confirmPassword: undefined }));
										}
									}}
									onFocus={() => {
										// Ao focar no confirmar, valide a força da senha
										if (!ensurePasswordStrong(password)) {
											setFieldErrors((prev) => ({
												...prev,
												password: 'Sua senha precisa ter pelo menos 8 caracteres, 1 letra maiúscula, 1 número e 1 caractere especial.',
											}));
										}
									}}
									type={showPassword ? "text" : "password"}
									required
									className="mt-1 block w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
								/>
								{fieldErrors.confirmPassword && <p className="mt-1 text-xs text-red-600">{fieldErrors.confirmPassword}</p>}
							</div>
							<label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
								<input type="checkbox" checked={agree} onChange={(e)=>setAgree(e.target.checked)} />
								Aceito os termos e políticas
							</label>
							{fieldErrors.terms && <p className="mt-1 text-xs text-red-600">{fieldErrors.terms}</p>}
						</div>

						<div className="mt-8">
							<button disabled={submitting} type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
								Criar conta
							</button>
							{error && <p className="mt-3 text-sm text-red-600">{error}</p>}
						</div>
					</form>

					<div className="mt-6 relative">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
						</div>
						<div className="relative flex justify-center text-sm">
							<span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">ou</span>
						</div>
					</div>

					<div className="mt-6">
						<button
							onClick={async () => {
								const clientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID as string | undefined;
								if (!clientId || !(window as any).google?.accounts?.id) {
									notify?.(t('google_oauth_not_configured'));
									return;
								}
								(window as any).google.accounts.id.initialize({
									client_id: clientId,
									callback: async (resp: any) => {
										if (resp?.credential) {
											try {
												await googleLogin(resp.credential);
												onSignup();
											} catch {
												notify?.(t('google_sign_up_failed'));
											}
										}
									},
								});
								(window as any).google.accounts.id.prompt();
							}}
							className="w-full inline-flex justify-center items-center py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
						>
							<GoogleIcon className="w-5 h-5 mr-3" />
							Criar com Google
						</button>
					</div>

					<div className="mt-4 text-center">
						<button onClick={onNavigateToLanding} className="text-sm text-indigo-600 hover:text-indigo-500">&larr; Voltar para a página inicial</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default SignupPage;


