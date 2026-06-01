import React, { useState, useEffect, useContext } from 'react';
import { XIcon, ChevronRightIcon, ChevronLeftIcon } from './icons';
import { AppContext } from '../contexts/AppContext';
import TooltipHint from './TooltipHint';

type TourStep = {
  id: string;
  title: string;
  content: string;
  target?: string; // Seletor CSS do elemento a destacar
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
};

type GuidedTourProps = {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
  steps: TourStep[];
};

const GuidedTour: React.FC<GuidedTourProps> = ({ isOpen, onComplete, onSkip, steps }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties>({});
  const app = useContext(AppContext);
  const skipTourLabel = app?.t('guided_tour_skip') ?? 'Pular tour';

  useEffect(() => {
    if (!isOpen || steps.length === 0) return;

    const step = steps[currentStep];
    if (step.target) {
      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setOverlayStyle({
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9998,
        });
      }
    } else {
      setOverlayStyle({
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9998,
      });
    }
  }, [isOpen, currentStep, steps]);

  if (!isOpen || steps.length === 0) return null;

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirst) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <>
      {/* Overlay escuro */}
      <div
        className="fixed inset-0 bg-black/60 z-[9998]"
        style={overlayStyle}
        onClick={isLast ? onComplete : handleNext}
      />

      {/* Tooltip do tour */}
      <div className="fixed z-[9999] bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 max-w-sm animate-fadeInUp" style={{
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                Passo {currentStep + 1} de {steps.length}
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {step.title}
            </h3>
          </div>
          <TooltipHint label={skipTourLabel} portalZIndex={10060}>
            <button
              type="button"
              onClick={onSkip}
              aria-label={skipTourLabel}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <XIcon className="w-5 h-5" aria-hidden />
            </button>
          </TooltipHint>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {step.content}
        </p>

        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={isFirst}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <ChevronLeftIcon className="w-4 h-4" />
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
    </>
  );
};

export default GuidedTour;
