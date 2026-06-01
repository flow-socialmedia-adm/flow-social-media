import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { apiGetPublic, apiPostPublic } from '../lib/api';

const PasswordResetPage: React.FC = () => {
	const [searchParams] = useSearchParams();
	const token = searchParams.get('token') || '';
	const [loading, setLoading] = useState(true);
	const [valid, setValid] = useState(false);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [passwordConfirm, setPasswordConfirm] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [done, setDone] = useState(false);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			if (!token) {
				setLoading(false);
				return;
			}
			try {
				const q = new URLSearchParams({ token });
				const prev = await apiGetPublic<{ valid: boolean; email?: string }>(
					`/auth/password-reset/preview?${q.toString()}`,
				);
				if (cancelled) return;
				if (prev.valid) {
					setValid(true);
					setEmail(prev.email || '');
				}
			} catch {
				if (!cancelled) setValid(false);
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [token]);

	const submit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		try {
			await apiPostPublic('/auth/password-reset/accept', {
				token,
				password,
				passwordConfirm,
			});
			setDone(true);
		} catch (err: unknown) {
			let msg = 'Não foi possível redefinir a senha.';
			try {
				const t = err instanceof Error ? err.message : '';
				if (t.startsWith('{')) {
					const j = JSON.parse(t) as { message?: string | string[] };
					if (Array.isArray(j.message)) msg = j.message.join(', ');
					else if (typeof j.message === 'string') msg = j.message;
				}
			} catch {
				/* keep default */
			}
			setError(msg);
		}
	};

	if (loading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-600 dark:bg-gray-900 dark:text-gray-300">
				Carregando…
			</div>
		);
	}

	if (!token || !valid) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-6 text-center dark:bg-gray-900">
				<p className="text-gray-700 dark:text-gray-300">Link inválido ou expirado.</p>
				<Link to="/" className="text-indigo-600 hover:underline dark:text-indigo-400">
					Voltar ao início
				</Link>
			</div>
		);
	}

	if (done) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-6 dark:bg-gray-900">
				<p className="text-lg font-medium text-gray-900 dark:text-white">Senha alterada com sucesso.</p>
				<Link
					to="/"
					className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
				>
					Entrar
				</Link>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 dark:bg-gray-900">
			<form
				onSubmit={(e) => void submit(e)}
				className="w-full max-w-md space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
			>
				<h1 className="text-xl font-bold text-gray-900 dark:text-white">Nova senha</h1>
				<p className="text-sm text-gray-600 dark:text-gray-400">{email}</p>
				<div>
					<label htmlFor="reset-pw" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
						Nova senha
					</label>
					<input
						id="reset-pw"
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						autoComplete="new-password"
						className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
					/>
				</div>
				<div>
					<label htmlFor="reset-pw2" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
						Confirmar senha
					</label>
					<input
						id="reset-pw2"
						type="password"
						value={passwordConfirm}
						onChange={(e) => setPasswordConfirm(e.target.value)}
						autoComplete="new-password"
						className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
					/>
				</div>
				<p className="text-xs text-gray-500 dark:text-gray-400">
					Mínimo 8 caracteres, com maiúscula, número e caractere especial.
				</p>
				{error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
				<button
					type="submit"
					className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
				>
					Salvar senha
				</button>
			</form>
		</div>
	);
};

export default PasswordResetPage;
