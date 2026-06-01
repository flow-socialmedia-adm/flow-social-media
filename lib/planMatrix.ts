export type PlanKey = 'agencia' | 'starter' | 'pro' | 'premium';

export const planMatrix: Record<PlanKey, {
	label: string;
	isLegacy?: boolean;
	price: number;
	maxUsers?: number;
	maxClients?: number | 'unlimited';
	features: string[];
}> = {
	agencia: {
		label: 'Plano Agência',
		isLegacy: true,
		price: 47.9,
		maxUsers: 5,
		maxClients: 'unlimited',
		features: [
			'Agenda de Posts de Clientes e de Tarefas Internas',
			'Clientes ilimitados',
			'Financeiro Completo',
			'Guia de Marca',
			'Estratégia de Cliente',
			'Gerenciamento de Contratos',
		],
	},
	starter: {
		label: 'Starter',
		price: 0,
		features: [],
	},
	pro: {
		label: 'Pro',
		price: 0,
		features: [],
	},
	premium: {
		label: 'Premium',
		price: 0,
		features: [],
	},
};

export default planMatrix;


