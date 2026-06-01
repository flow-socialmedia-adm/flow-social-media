import React, { useEffect, useRef } from 'react';
import type { Address } from '../types';
import { CheckIcon } from './icons';
import TooltipHint from './TooltipHint';
import { GhostInput } from './GhostInput';
import { normalizeCep } from '../lib/cepLookup';
import { useCepLookup, type CepMergePatch } from '../lib/useCepLookup';

type Props = {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  address: Partial<Address>;
  onMergeAddressFields: (patch: CepMergePatch) => void;
  t: (key: string) => string;
  disabledHint?: string;
  /** CEP com 8 dígitos mas não encontrado (ViaCEP) — usar para bloquear salvar no formulário pai. */
  onBlockingHintChange?: (blocking: boolean) => void;
};

/**
 * Campo CEP com estilo GhostInput + busca ViaCEP (somente frontend).
 */
export const CepGhostInput: React.FC<Props> = ({
  value,
  onChange,
  disabled,
  className = '',
  placeholder = '00000-000',
  address,
  onMergeAddressFields,
  t,
  disabledHint,
  onBlockingHintChange,
}) => {
  const addressRef = useRef(address);
  addressRef.current = address;

  const mergeRef = useRef(onMergeAddressFields);
  mergeRef.current = onMergeAddressFields;

  const { onCepChange, onCepBlur, applyForceFromCep, loading, hint } = useCepLookup({
    getAddress: () => addressRef.current,
    onMerge: (p) => mergeRef.current(p),
    t,
  });

  const zipRef = useRef(value);
  zipRef.current = value;

  const handleChange = (v: string) => {
    zipRef.current = v;
    onChange(v);
    onCepChange(v);
  };

  const cepComplete = normalizeCep(value) !== null;

  useEffect(() => {
    onBlockingHintChange?.(!!hint);
  }, [hint, onBlockingHintChange]);

  return (
    <div
      className={`flex min-w-0 w-full flex-wrap items-center gap-x-1.5 gap-y-0 ${className}`}
    >
      <GhostInput
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        mask="cep"
        disabled={disabled}
        disabledHint={disabledHint}
        onEditBlur={() => onCepBlur(zipRef.current)}
        className="min-w-0 w-[min(100%,130px)] shrink-0"
      />
      {cepComplete && !disabled && (
        <TooltipHint label={t('cep_lookup_update_by_cep')}>
          <button
            type="button"
            disabled={loading}
            onClick={() => applyForceFromCep(zipRef.current)}
            aria-label={t('cep_lookup_update_by_cep')}
            className="shrink-0 rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-gray-700/50 dark:hover:text-indigo-400"
          >
            <CheckIcon className="h-4 w-4" />
          </button>
        </TooltipHint>
      )}
      {loading && (
        <span
          role="status"
          aria-live="polite"
          aria-label={t('cep_lookup_loading_aria')}
          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400 opacity-80 animate-pulse dark:bg-gray-500"
        />
      )}
      {hint ? (
        <span
          role="status"
          aria-live="polite"
          className="shrink-0 text-[10px] font-medium leading-tight text-red-600 dark:text-red-400"
        >
          {hint}
        </span>
      ) : null}
    </div>
  );
};
