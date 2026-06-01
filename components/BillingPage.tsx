import React, { useContext, useState } from 'react';
import { AppContext } from '../contexts/AppContext';
import { CheckCircleIcon, CreditCardIcon, StarIcon } from './icons';
import { PlanTier } from '../types';
import { formatDateBR } from '../lib/utils';
import planMatrix from '../lib/planMatrix';

const PLANS: { id: PlanTier; nameKey: string; users: number; price: string; features: string[] }[] = [
    {
        id: 'plan_1',
        nameKey: 'plan_1',
        users: 1,
        price: 'R$ 0,00',
        features: ['1 colaborador', 'Clientes Ilimitados', 'Tarefas Básicas', 'Relatórios Simples']
    },
    {
        id: 'plan_2',
        nameKey: 'plan_2',
        users: 3,
        price: 'R$ 49,90',
        features: ['Até 3 colaboradores', 'Fluxos Personalizados', 'Gestão Financeira', 'Suporte Prioritário']
    },
    {
        id: 'plan_3',
        nameKey: 'plan_3',
        users: 5,
        price: 'R$ 89,90',
        features: ['Até 5 colaboradores', 'IA Integrada (Beta)', 'Relatórios Avançados', 'White Label']
    }
];

const FuturePlansGrid: React.FC<{ currentTier: string; onUpgrade: (planId: PlanTier) => void; t: (k: string, r?: any) => string }> = ({ currentTier, onUpgrade, t }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PLANS.map((plan) => {
                const isCurrent = currentTier === plan.id;
                return (
                    <div key={plan.id} className={`relative flex flex-col p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 ${isCurrent ? 'border-indigo-500 transform scale-105' : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'}`}>
                        {isCurrent && (
                            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-indigo-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                {t('selected')}
                            </div>
                        )}
                        <div className="mb-4">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t(plan.nameKey)}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('users_limit', { count: plan.users.toString() })}</p>
                        </div>
                        <div className="mb-6">
                            <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{plan.price}</span>
                            <span className="text-gray-500 dark:text-gray-400 text-sm">/mês</span>
                        </div>
                        <ul className="mb-8 space-y-3 flex-1">
                            {plan.features.map((feature, idx) => (
                                <li key={idx} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                                    <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={() => !isCurrent && onUpgrade(plan.id)}
                            disabled={isCurrent}
                            className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${isCurrent ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 cursor-default' : 'bg-gray-900 dark:bg-gray-700 text-white hover:bg-indigo-600 dark:hover:bg-indigo-600'}`}
                        >
                            {isCurrent ? t('current_plan') : t('change_plan')}
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

const BillingPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
    const context = useContext(AppContext);
    if (!context) return null;
    const { t, agencyProfile, updateSubscription, showConfirmation } = context;

    const handleUpgrade = (planId: PlanTier) => {
         showConfirmation({
            title: t('change_plan'),
            message: `Deseja alterar seu plano para ${t(planId)}?`,
            onConfirm: () => updateSubscription(planId),
            confirmText: t('confirm')
        });
    };

    // Feature flags
    const showFuturePlans = false;

    // Resolve plan tier (new model or fallback)
    const currentTierNew = agencyProfile.plan_tier ?? 'agencia';
    const legacyTier = agencyProfile.subscription?.tier;

    // Trial data
    const trialStart = agencyProfile.trial_start ? new Date(agencyProfile.trial_start) : undefined;
    const trialEnd = agencyProfile.trial_end
        ? new Date(agencyProfile.trial_end)
        : (trialStart ? new Date(trialStart.getTime() + 10 * 24 * 60 * 60 * 1000) : undefined);
    const trialActive = (agencyProfile.subscription_status === 'trialing') || (!!trialEnd && new Date() <= trialEnd);

    const mainContent = (
        <>
            {/* Single-plan card: Plano Agência */}
            {currentTierNew === 'agencia' && (
                <div className="w-full max-w-md">
                    <div className="relative flex w-full flex-col p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-indigo-500">
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                            ATIVO
                        </div>
                        <div className="mb-4 text-center">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Plano Agência</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Inclui 10 dias de teste (cartão necessário para liberar o acesso)
                            </p>
                        </div>
                        <div className="mb-6 text-center">
                            <span className="text-4xl font-extrabold text-gray-900 dark:text-white">R$ 47,90</span>
                            <span className="text-gray-500 dark:text-gray-400 text-sm">/mês</span>
                        </div>
                        <ul className="mb-8 space-y-3">
                            {planMatrix.agencia.features.map((feature, idx) => (
                                <li key={idx} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                                    <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                        <button
                            disabled
                            className="w-full py-3 px-4 rounded-lg font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 cursor-default"
                        >
                            Plano Atual
                        </button>
                    </div>
                </div>
            )}

            {/* Toggleable future plans grid (hidden for now) */}
            {showFuturePlans && (
                <div className="mt-10">
                    <FuturePlansGrid currentTier={legacyTier} onUpgrade={handleUpgrade} t={t} />
                </div>
            )}

            {/* Trial info card replaces "Próxima Cobrança" */}
            <div className="mt-12 bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-xl border border-indigo-100 dark:border-indigo-800">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Período de teste ativo</h3>
                <div className="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    <p>Você está em um teste gratuito de 10 dias.</p>
                    {trialEnd ? (
                        <p>Seu teste termina em {formatDateBR(trialEnd)}.</p>
                    ) : (
                        <p>Seu teste termina em breve.</p>
                    )}
                    <p>
                        A partir dessa data, a mensalidade de R$ 47,90 será cobrada automaticamente no cartão cadastrado,
                        a menos que você cancele antes do término do período de teste.
                    </p>
                </div>
            </div>

            {/* Informative block below plan card */}
            <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-white">Vem novidade por aí</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Você está no Plano Agência.</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    Quando novos planos forem lançados, você poderá migrar e manter benefícios exclusivos deste plano.
                </p>
            </div>
        </>
    );

    if (embedded) {
        return <div className="w-full min-w-0 text-left">{mainContent}</div>;
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('plans_billing')}</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    {t('current_plan')}: <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {currentTierNew === 'agencia' ? 'Plano Agência' : t(legacyTier)}
                    </span>
                </p>
            </header>
            {mainContent}
        </div>
    );
};

export default BillingPage;