import React, { useState } from 'react';
import { apiPut } from '../lib/api';
import { CheckIcon, UserCircleIcon, UsersIcon, SparklesIcon, CheckSquareIcon, BriefcaseIcon, CreditCardIcon } from './icons';

type OnboardingSetupPageProps = {
  onComplete: () => void;
  initialMode?: 'SOLO' | 'TEAM';
  initialShowGuidedTour?: boolean;
};

const OnboardingSetupPage: React.FC<OnboardingSetupPageProps> = ({ 
  onComplete, 
  initialMode = 'SOLO',
  initialShowGuidedTour = true 
}) => {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<'SOLO' | 'TEAM'>(initialMode);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [showGuidedTour, setShowGuidedTour] = useState(initialShowGuidedTour);
  const [saving, setSaving] = useState(false);

  const handlePreferenceToggle = (pref: string) => {
    setPreferences(prev => 
      prev.includes(pref) 
        ? prev.filter(p => p !== pref)
        : [...prev, pref]
    );
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      // Atualizar agência com modo e flags de onboarding
      await apiPut('/agencies/me', {
        mode,
        onboardingCompleted: true,
        showGuidedTour,
      });
      
      // Recarregar dados do usuário para atualizar agencyMode no contexto
      // O AuthContext vai atualizar automaticamente no próximo refreshMe
      
      onComplete();
    } catch (error) {
      console.error('Erro ao salvar configuração inicial:', error);
      // Mesmo com erro, continuar para não bloquear o usuário
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 md:p-10">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Passo {step} de 3
            </span>
            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
              {Math.round((step / 3) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Modo SOLO vs TEAM */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Você trabalha sozinho(a) ou em equipe?
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Isso ajuda a personalizar sua experiência no Flow ERP
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              <button
                onClick={() => setMode('SOLO')}
                className={`p-6 rounded-xl border-2 transition-all ${
                  mode === 'SOLO'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-lg scale-105'
                    : 'border-gray-300 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-700'
                }`}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    mode === 'SOLO' 
                      ? 'bg-indigo-500 text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    <UserCircleIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Sozinho(a)</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Trabalho individual ou freelancer
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMode('TEAM')}
                className={`p-6 rounded-xl border-2 transition-all ${
                  mode === 'TEAM'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-lg scale-105'
                    : 'border-gray-300 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-700'
                }`}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    mode === 'TEAM' 
                      ? 'bg-indigo-500 text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    <UsersIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Em Equipe</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Agência ou empresa com múltiplos membros
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Preferências de uso */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                O que você mais vai usar no dia a dia?
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Selecione as áreas principais para personalizar seus atalhos
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              {[
                { id: 'posts', label: 'Posts', icon: SparklesIcon, description: 'Criação e gestão de posts para clientes' },
                { id: 'tasks', label: 'Tarefas Internas', icon: CheckSquareIcon, description: 'Organização de tarefas gerais' },
                { id: 'clients', label: 'Clientes', icon: BriefcaseIcon, description: 'Gestão de clientes e contatos' },
                { id: 'finance', label: 'Financeiro', icon: CreditCardIcon, description: 'Controle financeiro e receitas' },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = preferences.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => handlePreferenceToggle(item.id)}
                    className={`p-5 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-md'
                        : 'border-gray-300 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-700'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? 'bg-indigo-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{item.label}</h3>
                          {isSelected && (
                            <CheckIcon className="w-5 h-5 text-indigo-500" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Tour Guiado */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Quer que a gente te guie nos primeiros passos?
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Podemos mostrar um tour rápido pelo sistema para você conhecer as principais funcionalidades
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              <button
                onClick={() => setShowGuidedTour(true)}
                className={`p-6 rounded-xl border-2 transition-all ${
                  showGuidedTour
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-lg scale-105'
                    : 'border-gray-300 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-700'
                }`}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    showGuidedTour 
                      ? 'bg-indigo-500 text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    <SparklesIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Sim, me guie</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Mostrar tour guiado no dashboard
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setShowGuidedTour(false)}
                className={`p-6 rounded-xl border-2 transition-all ${
                  !showGuidedTour
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-lg scale-105'
                    : 'border-gray-300 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-700'
                }`}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    !showGuidedTour 
                      ? 'bg-indigo-500 text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    <CheckIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Não, obrigado</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Pular o tour e explorar sozinho
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setStep(prev => Math.max(1, prev - 1))}
            disabled={step === 1}
            className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Voltar
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(prev => prev + 1)}
              className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-md hover:from-indigo-700 hover:to-purple-700 shadow-md transition-all"
            >
              Continuar
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={saving}
              className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-md hover:from-indigo-700 hover:to-purple-700 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  Finalizar
                  <CheckIcon className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingSetupPage;
