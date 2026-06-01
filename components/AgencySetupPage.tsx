import React, { useEffect, useState } from 'react';
import { apiGet, apiPut } from '../lib/api';

const AgencySetupPage: React.FC<{ onComplete: () => void; onSkip: () => void }> = ({ onComplete, onSkip }) => {
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [currency, setCurrency] = useState<'BRL'|'USD'|'EUR'>('BRL');
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		(async () => {
			try {
				const agency = await apiGet<any>('/agencies/me');
				setName(agency.name || '');
				setEmail(agency.email || '');
				setCurrency((agency.baseCurrency as any) || 'BRL');
			} catch {}
		})();
	}, []);

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
			<div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
				<h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Configuração inicial da agência</h2>
				<p className="text-sm text-gray-600 dark:text-gray-300 mb-6">Você pode alterar essas informações depois em Configurações.</p>
				<div className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome da Agência</label>
						<input value={name} onChange={(e)=>setName(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">E-mail da Agência</label>
						<input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Moeda Base</label>
						<select value={currency} onChange={(e)=>setCurrency(e.target.value as any)} className="mt-1 w-full px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
							<option value="BRL">BRL</option>
							<option value="USD">USD</option>
							<option value="EUR">EUR</option>
						</select>
					</div>
				</div>
				<button
					disabled={saving}
					onClick={async () => {
						setSaving(true);
						try {
							await apiPut('/agencies/me', { name, email, baseCurrency: currency });
							onComplete();
						} finally {
							setSaving(false);
						}
					}}
					className="mt-6 w-full py-3 rounded-md bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60"
				>
					Salvar e continuar
				</button>
				<button onClick={onSkip} className="mt-3 w-full text-sm text-gray-600 dark:text-gray-300 hover:underline">Pular agora</button>
			</div>
		</div>
	);
};

export default AgencySetupPage;


