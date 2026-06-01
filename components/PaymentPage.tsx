import React, { useState } from 'react';
import { apiPost } from '../lib/api';

const PaymentPage: React.FC<{ onSuccess: () => void; onBack: () => void }> = ({ onSuccess, onBack }) => {
	const [holder, setHolder] = useState('');
	const [number, setNumber] = useState('');
	const [exp, setExp] = useState('');
	const [cvc, setCvc] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
			<div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
				<h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Adicionar forma de pagamento</h2>
				<p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
					Sua avaliação gratuita de 10 dias será iniciada após cadastrar o cartão. A cobrança de R$ 47,90/mês ocorrerá automaticamente ao final do período, salvo cancelamento.
				</p>
				<form
					onSubmit={async (e) => {
						e.preventDefault();
						setError(null);
						setSubmitting(true);
						try {
							const [expMonth, expYear] = exp.split('/').map((s) => s.trim());
							await apiPost('/billing/attach-card', {
								cardHolder: holder,
								cardNumber: number,
								expMonth,
								expYear,
								cvc,
							});
							// Limpa rascunho de cadastro ao confirmar pagamento
							try { localStorage.removeItem('flow.signupDraft'); } catch {}
							onSuccess();
						} catch (e: any) {
							setError('Falha ao cadastrar cartão. Verifique os dados.');
						} finally {
							setSubmitting(false);
						}
					}}
				>
					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome no cartão</label>
							<input value={holder} onChange={(e)=>setHolder(e.target.value)} placeholder="Ex.: Nome do titular" required className="mt-1 w-full px-3 py-2 rounded-md bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Número do cartão</label>
							<input value={number} onChange={(e)=>setNumber(e.target.value)} required inputMode="numeric" placeholder="4242 4242 4242 4242" className="mt-1 w-full px-3 py-2 rounded-md bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
						</div>
						<div className="flex gap-3">
							<div className="flex-1">
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Validade (MM/AA)</label>
								<input value={exp} onChange={(e)=>setExp(e.target.value)} required placeholder="12/28" className="mt-1 w-full px-3 py-2 rounded-md bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
							</div>
							<div className="w-32">
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">CVC</label>
								<input value={cvc} onChange={(e)=>setCvc(e.target.value)} required placeholder="123" className="mt-1 w-full px-3 py-2 rounded-md bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
							</div>
						</div>
					</div>
					{error && <p className="mt-3 text-sm text-red-600">{error}</p>}
					<button disabled={submitting} type="submit" className="mt-6 w-full py-3 rounded-md bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60">Iniciar teste gratuito</button>
					<button type="button" onClick={onBack} className="mt-3 w-full text-sm text-gray-600 dark:text-gray-300 hover:underline">Cancelar</button>
				</form>
			</div>
		</div>
	);
};

export default PaymentPage;


