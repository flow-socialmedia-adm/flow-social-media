import type { Address } from '../types';

/** Retorna 8 dígitos ou null se o CEP não estiver completo. */
export function normalizeCep(input: string): string | null {
  const d = input.replace(/\D/g, '');
  if (d.length !== 8) return null;
  return d;
}

/** País fixo para resultados ViaCEP (Brasil). */
export const CEP_DEFAULT_COUNTRY = 'Brasil';

export type CepLookupData = Pick<Address, 'street' | 'neighborhood' | 'city' | 'state' | 'country'>;

export type CepLookupOutcome =
  | { ok: true; data: CepLookupData }
  | { ok: false; kind: 'invalid' | 'not_found' | 'network' | 'aborted' };

/** Heurística: ViaCEP só cobre Brasil; evita chamadas quando o país é claramente outro. */
export function isLikelyBrazilCountry(country?: string): boolean {
  const c = (country ?? '').trim().toLowerCase();
  if (!c) return true;
  return c === 'brasil' || c === 'brazil' || c === 'br' || c === 'bra';
}

/**
 * Preenche apenas campos ainda vazios (trim), para não apagar edição manual.
 */
export function mergeAddressFromCep(current: Partial<Address>, data: CepLookupData): Partial<Address> {
  const patch: Partial<Address> = {};
  const take = (key: keyof Address, val: string | undefined) => {
    const cur = (current[key] as string | undefined)?.trim();
    const next = (val ?? '').trim();
    if (!cur && next) (patch as Record<string, string>)[key] = next;
  };
  take('street', data.street);
  take('neighborhood', data.neighborhood);
  take('city', data.city);
  take('state', data.state);
  take('country', data.country);
  return patch;
}

/**
 * Sobrescreve rua, bairro, cidade, estado e país a partir do CEP (ação explícita do usuário).
 * Não altera número nem complemento.
 */
export function overwriteAddressFromCep(data: CepLookupData): Partial<Address> {
  return {
    street: (data.street ?? '').trim(),
    neighborhood: (data.neighborhood ?? '').trim(),
    city: (data.city ?? '').trim(),
    state: (data.state ?? '').trim(),
    country: (data.country ?? CEP_DEFAULT_COUNTRY).trim() || CEP_DEFAULT_COUNTRY,
  };
}

type ViaCepJson = {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

export async function lookupCepAddress(cepDigits: string, signal?: AbortSignal): Promise<CepLookupOutcome> {
  if (!/^\d{8}$/.test(cepDigits)) return { ok: false, kind: 'invalid' };
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`, {
      signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return { ok: false, kind: 'network' };
    const data = (await res.json()) as ViaCepJson;
    if (data.erro) return { ok: false, kind: 'not_found' };
    return {
      ok: true,
      data: {
        street: data.logradouro ?? '',
        neighborhood: data.bairro ?? '',
        city: data.localidade ?? '',
        state: data.uf ?? '',
        country: CEP_DEFAULT_COUNTRY,
      },
    };
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return { ok: false, kind: 'aborted' };
    return { ok: false, kind: 'network' };
  }
}
