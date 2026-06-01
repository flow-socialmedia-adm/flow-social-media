import React, { useState } from 'react';
import type { StatusDefinition } from '../types';
import { EyeIcon, EyeOffIcon } from './icons';
import TooltipHint from './TooltipHint';

const LEGEND_STORAGE_PREFIX = 'legendVisible.';

type StatusLegendPopoverProps = {
  statuses: StatusDefinition[];
  t: (key: string) => string;
  title?: string;
  /** Chave para persistir "legenda sempre visível" (ex: 'posts', 'tasks', 'agenda'). Gera localStorage key legendVisible.{storageKey} */
  storageKey?: string;
  /** Se false, renderiza apenas o botão do olho (chips ficam em outro lugar, ex.: sub-bar da Agenda). Default true. */
  chipsInline?: boolean;
  /** Chamado quando o usuário alterna a visibilidade da legenda (para o pai sincronizar state). */
  onVisibilityChange?: (visible: boolean) => void;
  /** Se true, estiliza o botão do olho para fundo degradê (ex.: header Agenda). Default false. */
  variantOnGradient?: boolean;
};

const StatusLegendPopover: React.FC<StatusLegendPopoverProps> = ({ statuses, t, storageKey, chipsInline = true, onVisibilityChange, variantOnGradient = false }) => {
  const storageKeyFull = storageKey ? `${LEGEND_STORAGE_PREFIX}${storageKey}` : null;
  const [legendAlwaysVisible, setLegendAlwaysVisible] = useState(() => {
    if (!storageKeyFull || typeof localStorage === 'undefined') return false;
    return localStorage.getItem(storageKeyFull) === 'true';
  });

  const toggleLegendAlwaysVisible = () => {
    const next = !legendAlwaysVisible;
    setLegendAlwaysVisible(next);
    if (storageKeyFull) localStorage.setItem(storageKeyFull, String(next));
    onVisibilityChange?.(next);
  };

  if (!statuses.length) return null;

  return (
    <div className="flex items-center gap-2 flex-none min-w-0">
      {storageKeyFull ? (
        <>
          <TooltipHint label={legendAlwaysVisible ? t('legend_hide_always') : t('legend_show_always')}>
            <button
              type="button"
              onClick={toggleLegendAlwaysVisible}
              className={`p-1.5 rounded-md transition-colors flex-shrink-0 ${
                variantOnGradient
                  ? (legendAlwaysVisible ? 'text-white hover:bg-white/20' : 'text-white/80 hover:bg-white/20 hover:text-white')
                  : (legendAlwaysVisible
                    ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200')
              }`}
              aria-label={legendAlwaysVisible ? t('legend_hide_always') : t('legend_show_always')}
            >
              {legendAlwaysVisible ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </button>
          </TooltipHint>
          {legendAlwaysVisible && chipsInline && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
              {statuses.map((status) => (
                <span
                  key={status.id}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700/80 text-gray-700 dark:text-gray-200 text-xs whitespace-nowrap flex-shrink-0"
                >
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${status.color.bg} ${status.color.border} border`} />
                  {t(status.nameKey)}
                </span>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};

export default StatusLegendPopover;
