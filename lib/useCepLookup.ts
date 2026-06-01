import { useCallback, useEffect, useRef, useState } from 'react';
import type { Address } from '../types';
import {
  isLikelyBrazilCountry,
  lookupCepAddress,
  mergeAddressFromCep,
  normalizeCep,
  overwriteAddressFromCep,
} from './cepLookup';

export type CepMergePatch = Partial<Pick<Address, 'street' | 'neighborhood' | 'city' | 'state' | 'country'>>;

const DEBOUNCE_MS = 320;

type UseCepLookupOptions = {
  getAddress: () => Partial<Address>;
  onMerge: (patch: CepMergePatch) => void;
  t: (key: string) => string;
};

/**
 * Busca CEP (ViaCEP) no blur e ao completar 8 dígitos (com debounce).
 * Não altera número/complemento; merge só em campos vazios.
 */
export function useCepLookup(options: UseCepLookupOptions) {
  const optsRef = useRef(options);
  optsRef.current = options;

  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastSuccessCepRef = useRef<string | null>(null);

  const clearDebounce = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  };

  const runLookup = useCallback(async (rawZip: string, lookupOpts?: { mode?: 'auto' | 'force' }) => {
    const mode = lookupOpts?.mode ?? 'auto';
    const digits = normalizeCep(rawZip);
    const { getAddress, onMerge, t } = optsRef.current;

    if (!digits) {
      setHint(null);
      return;
    }

    if (mode === 'auto') {
      if (!isLikelyBrazilCountry(getAddress().country)) {
        setHint(null);
        return;
      }
      if (lastSuccessCepRef.current === digits) return;
    }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    setHint(null);

    try {
      const outcome = await lookupCepAddress(digits, ac.signal);

      if (abortRef.current !== ac) return;

      if (outcome.ok) {
        lastSuccessCepRef.current = digits;
        const patch =
          mode === 'force'
            ? overwriteAddressFromCep(outcome.data)
            : mergeAddressFromCep(getAddress(), outcome.data);
        if (Object.keys(patch).length > 0) onMerge(patch as CepMergePatch);
        setHint(null);
        return;
      }

      if (outcome.kind === 'aborted' || outcome.kind === 'invalid') return;

      lastSuccessCepRef.current = null;
      if (outcome.kind === 'not_found') setHint(t('field_cep_hint_not_found'));
      else setHint(null);
    } finally {
      if (abortRef.current === ac) setLoading(false);
    }
  }, []);

  const onCepChange = useCallback(
    (nextRaw: string) => {
      const digits = normalizeCep(nextRaw);
      clearDebounce();

      if (!digits || digits.length < 8) {
        lastSuccessCepRef.current = null;
        setHint(null);
        return;
      }

      debounceRef.current = window.setTimeout(() => {
        debounceRef.current = null;
        void runLookup(nextRaw, { mode: 'auto' });
      }, DEBOUNCE_MS);
    },
    [runLookup]
  );

  const onCepBlur = useCallback(
    (currentRaw: string) => {
      clearDebounce();
      void runLookup(currentRaw, { mode: 'auto' });
    },
    [runLookup]
  );

  const applyForceFromCep = useCallback(
    (rawZip: string) => {
      clearDebounce();
      void runLookup(rawZip, { mode: 'force' });
    },
    [runLookup]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      abortRef.current?.abort();
    };
  }, []);

  return { onCepChange, onCepBlur, applyForceFromCep, loading, hint };
}
