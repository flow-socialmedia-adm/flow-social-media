import React, { useState, useContext, useEffect } from 'react';
import { XIcon, SparklesIcon, CheckSquareIcon, ChevronRightIcon } from './icons';
import { apiPatch } from '../lib/api';
import { AuthContext } from '../contexts/AuthContext';
import { AppContext } from '../contexts/AppContext';
import TooltipHint from './TooltipHint';

type TasksOnboardingProps = {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
};

const TasksOnboarding: React.FC<TasksOnboardingProps> = ({ isOpen, onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const auth = useContext(AuthContext);
  const app = useContext(AppContext);
  const skipLabel = app?.t('skip') ?? 'Pular';

  // Resetar step quando fechar
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const steps = [
    {
      title: 'Posts vs Tarefas Gerais',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No Flow ERP, você trabalha com dois tipos de itens:
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
              <SparklesIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Posts</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Posts para clientes. Têm status fixos e ações pendentes. A cor indica o status atual.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <CheckSquareIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Tarefas Gerais</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Tarefas internas. Fluxo simples: A Fazer → Em Andamento → Concluído.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Como funciona Posts',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Posts têm um fluxo fixo com 6 status. O status muda através de <strong>ações</strong>:
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-gray-700 dark:text-gray-300">Pauta Criada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-gray-700 dark:text-gray-300">Em Produção</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="text-gray-700 dark:text-gray-300">Aguardando Aprovação</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-700 dark:text-gray-300">Aprovado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
              <span className="text-gray-700 dark:text-gray-300">Agendado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-gray-700 dark:text-gray-300">Publicado</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
            <strong>Dica:</strong> A cor do card indica o status. O ícone mostra a ação pendente disponível.
          </p>
        </div>
      ),
    },
    {
      title: 'Como ler a agenda',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            A agenda mostra todos os seus posts e tarefas organizados por data:
          </p>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 list-disc list-inside">
            <li><strong>Visualização Diária:</strong> Veja o que precisa fazer hoje</li>
            <li><strong>Visualização Semanal:</strong> Planeje sua semana</li>
            <li><strong>Visualização Mensal:</strong> Visão geral do mês</li>
            <li><strong>Lista:</strong> Todas as tarefas em uma lista</li>
            <li><strong>Kanban:</strong> Organize por status (drag and drop)</li>
          </ul>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
            Use os filtros para encontrar rapidamente o que precisa.
          </p>
        </div>
      ),
    },
  ];

  const isLast = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleComplete = async () => {
    try {
      // Marcar como visto no backend IMEDIATAMENTE
      await apiPatch('/users/me/onboarding', {
        hasSeenTasksOnboarding: true,
      });
      // Atualizar AuthContext IMEDIATAMENTE
      await auth?.refreshMe();
      onComplete();
    } catch (error) {
      console.error('Erro ao salvar hasSeenTasksOnboarding:', error);
      onComplete(); // Continuar mesmo com erro
    }
  };

  const handleSkip = async () => {
    try {
      // Marcar como visto no backend IMEDIATAMENTE
      await apiPatch('/users/me/onboarding', {
        hasSeenTasksOnboarding: true,
      });
      // Atualizar AuthContext IMEDIATAMENTE
      await auth?.refreshMe();
      onComplete();
    } catch (error) {
      console.error('Erro ao salvar hasSeenTasksOnboarding:', error);
      onComplete(); // Continuar mesmo com erro
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg animate-fadeInUp">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                  Passo {currentStep + 1} de {steps.length}
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {steps[currentStep].title}
              </h3>
            </div>
            <TooltipHint label={skipLabel} portalZIndex={10060}>
              <button
                type="button"
                onClick={handleSkip}
                aria-label={skipLabel}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <XIcon className="w-5 h-5" aria-hidden />
              </button>
            </TooltipHint>
          </div>

          <div className="mb-6">
            {steps[currentStep].content}
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>

            <div className="flex items-center gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep
                      ? 'bg-indigo-600'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-md hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center gap-2"
            >
              {isLast ? 'Finalizar' : 'Próximo'}
              {!isLast && <ChevronRightIcon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TasksOnboarding;
