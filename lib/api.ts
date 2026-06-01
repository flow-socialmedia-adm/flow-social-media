export const API_URL = import.meta.env.VITE_API_URL as string;

/** Limite de tamanho para upload de imagem (5MB). Usar para validação no frontend e consistência com o backend. */
export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
/** Limite para upload de documento PDF, ex.: manual da marca (50MB). */
export const UPLOAD_DOCUMENT_MAX_BYTES = 50 * 1024 * 1024;
/** Limite para upload de fontes (.ttf, .otf, .woff) — 10MB. */
export const UPLOAD_FONT_MAX_BYTES = 10 * 1024 * 1024;

/** Converte URL relativa de upload (/uploads/xxx) para URL absoluta. Usa o origin do servidor para que imagens estáticas em /uploads não passem por /api. */
export function toUploadUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http')) return url;
  let origin: string;
  try {
    origin = API_URL.startsWith('http') ? new URL(API_URL).origin : window.location.origin;
  } catch {
    origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  }
  return url.startsWith('/') ? `${origin}${url}` : `${origin}/${url}`;
}

type Tokens = { accessToken: string; refreshToken?: string };
const tokenKey = 'flow.tokens';

// Event system for token changes
type TokenEventListener = () => void;
const tokenClearedListeners: Set<TokenEventListener> = new Set();

export function onTokensCleared(callback: TokenEventListener) {
  tokenClearedListeners.add(callback);
  return () => tokenClearedListeners.delete(callback);
}

function getTokens(): Tokens | null {
  const raw = localStorage.getItem(tokenKey);
  return raw ? JSON.parse(raw) : null;
}
function setTokens(tokens: Tokens) {
  localStorage.setItem(tokenKey, JSON.stringify(tokens));
}
function clearTokens() {
  localStorage.removeItem(tokenKey);
  
  // Clear any cached GET requests
  getCache.clear();
  
  // Clear inflight requests to prevent race conditions
  inflightGet.clear();
  
  // Reset refresh state
  isRefreshing = false;
  waitQueue = [];
  
  // Notify all listeners that tokens were cleared
  tokenClearedListeners.forEach(listener => {
    try {
      listener();
    } catch (err) {
      console.error('[api] Error in token cleared listener:', err);
    }
  });
}

let isRefreshing = false;
let waitQueue: Array<() => void> = [];
const inflightGet = new Map<string, Promise<Response>>();
const getCache = new Map<string, { expiresAt: number; body: string; contentType: string }>();
const GET_TTL_MS = 2500;

async function doFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  // DEBUG: início da requisição
  try { console.debug?.('[api] fetch start', input); } catch {}
  const method = (init?.method || 'GET').toUpperCase();
  // Deduplicação/coalescing para GET idênticos
  if (method === 'GET' && typeof input === 'string') {
    const key = input;
    // Cache curto para evitar storms em navegações rápidas
    const cached = getCache.get(key);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      try { console.debug?.('[api] cache hit GET', key); } catch {}
      return new Response(cached.body, {
        status: 200,
        headers: { 'Content-Type': cached.contentType || 'application/json' },
      });
    }
    const pending = inflightGet.get(key);
    if (pending) {
      try { console.debug?.('[api] coalesced GET', key); } catch {}
      const shared = await pending;
      return shared.clone();
    }
  }
  const tokens = getTokens();
  const headers = new Headers(init?.headers ?? {});
  if (tokens?.accessToken) {
    headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  }
  // Evita preflight desnecessário: não setar Content-Type em GET
  // Para FormData, não setar Content-Type (browser define multipart/form-data com boundary)
  if (method !== 'GET' && !(init?.body instanceof FormData)) {
    headers.set('Content-Type', headers.get('Content-Type') ?? 'application/json');
  }
  const doActualFetch = () => fetch(input, { ...init, headers, credentials: 'include', cache: 'no-store' });
  let res: Response;
  if (method === 'GET' && typeof input === 'string') {
    const key = input;
    const p = doActualFetch();
    inflightGet.set(key, p);
    try {
      res = await p;
    } finally {
      inflightGet.delete(key);
    }
    // Preenche cache apenas para 200 OK
    try {
      if (res.ok && res.status === 200) {
        const clone = res.clone();
        const text = await clone.text();
        const contentType = clone.headers.get('Content-Type') || 'application/json';
        getCache.set(key, { body: text, contentType, expiresAt: Date.now() + GET_TTL_MS });
      }
    } catch {}
  } else {
    res = await doActualFetch();
  }
  // simple backoff for 429
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('retry-after') || '1');
    const jitter = Math.random() * 250;
    await new Promise((r) => setTimeout(r, Math.min(3000, retryAfter * 1000) + jitter));
    res = await fetch(input, { ...init, headers, credentials: 'include', cache: 'no-store' });
  }
  if (res.status !== 401) return res;

  // 401 handling with refresh
  try { console.debug?.('[api] 401 detected', input); } catch {}
  if (!tokens?.refreshToken) {
    try { console.debug?.('[api] no refresh token available'); } catch {}
    return res;
  }
  
  // avoid parallel refresh storms
  if (isRefreshing) {
    try { console.debug?.('[api] waiting for refresh', { queueSize: waitQueue.length, url: input }); } catch {}
    await new Promise<void>((resolve) => waitQueue.push(resolve));
    
    // After waiting, check if tokens were cleared (refresh failed)
    const tokensAfterWait = getTokens();
    if (!tokensAfterWait?.accessToken) {
      try { console.debug?.('[api] tokens cleared during wait, aborting retry', input); } catch {}
      return new Response(JSON.stringify({ 
        error: 'unauthorized', 
        code: 'session_expired',
        message: 'Session expired, please login again' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } else {
    isRefreshing = true;
    let refreshSuccess = false;
    
    try {
      try { console.debug?.('[api] refresh start'); } catch {}
      const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });
      
      if (!refreshRes.ok) {
        try { console.debug?.('[api] refresh failed', { status: refreshRes.status }); } catch {}
        clearTokens();
        refreshSuccess = false;
      } else {
        const body = await refreshRes.json();
        setTokens({ accessToken: body.accessToken, refreshToken: tokens.refreshToken });
        try { console.debug?.('[api] refresh ok'); } catch {}
        refreshSuccess = true;
      }
    } catch (err) {
      try { console.error?.('[api] refresh error', err); } catch {}
      clearTokens();
      refreshSuccess = false;
    } finally {
      isRefreshing = false;
      try { console.debug?.('[api] refresh done, releasing queue', { released: waitQueue.length, success: refreshSuccess }); } catch {}
      waitQueue.splice(0).forEach((fn) => fn());
    }
    
    // If refresh failed, return proper 401 response
    if (!refreshSuccess) {
      try { console.debug?.('[api] returning 401 after refresh failure', input); } catch {}
      return new Response(JSON.stringify({ 
        error: 'unauthorized', 
        code: 'session_expired',
        message: 'Session expired, please login again' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // retry original request with new token
  try { console.debug?.('[api] retrying original', input); } catch {}
  const retryHeaders = new Headers(init?.headers ?? {});
  const nextTokens = getTokens();
  if (nextTokens?.accessToken) {
    retryHeaders.set('Authorization', `Bearer ${nextTokens.accessToken}`);
  }
  if (!(init?.body instanceof FormData)) {
    retryHeaders.set('Content-Type', retryHeaders.get('Content-Type') ?? 'application/json');
  }
  return fetch(input, { ...init, headers: retryHeaders, credentials: 'include' });
}

/**
 * Extrai mensagem legível de um erro da API.
 * Evita exibir JSON bruto (ex.: {"statusCode":500,"message":"Internal server error"}) ao usuário.
 */
export function parseApiErrorMessage(err: unknown, fallback = 'Erro ao processar a requisição.'): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  if (!raw) return fallback;
  if (raw.trimStart().startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const msg = parsed.message;
      if (Array.isArray(msg)) {
        const parts = msg.filter((m): m is string => typeof m === 'string' && m.trim().length > 0);
        if (parts.length) return parts.join(' ');
      }
      if (typeof msg === 'string' && msg && msg.toLowerCase() !== 'internal server error') return msg;
      return fallback;
    } catch {
      return fallback;
    }
  }
  return raw;
}

export type ApiGetOptions = {
  /**
   * Evita cache in-memory / coalescing de GET idênticos (doFetch) por alguns segundos.
   * Use após mutações (POST/PUT) quando a mesma URL precisa refletir dados novos na hora.
   */
  bypassShortLivedCache?: boolean;
};

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | boolean>,
  options?: ApiGetOptions,
): Promise<T> {
  const url = new URL(`${API_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  }
  if (options?.bypassShortLivedCache) {
    url.searchParams.set('_nc', String(Date.now()));
  }
  const res = await doFetch(url.toString(), { method: 'GET' });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, body?: any): Promise<T> {
  const res = await doFetch(`${API_URL}${path}`, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

/** Sem Authorization — rotas públicas (convite, reset de senha). */
export async function apiGetPublic<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { credentials: 'include', cache: 'no-store' });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

export async function apiPostPublic<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

export async function apiPut<T>(path: string, body?: any): Promise<T> {
  const res = await doFetch(`${API_URL}${path}`, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

export async function apiPatch<T>(path: string, body?: any): Promise<T> {
  const res = await doFetch(`${API_URL}${path}`, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await doFetch(`${API_URL}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

export type UploadResponse = { url: string };

const UPLOAD_FIELD = 'file';

function isFileOrBlob(value: unknown): value is File | Blob {
  return value instanceof File || value instanceof Blob;
}

/** Garante que FormData recebe só Blob binário: lê o conteúdo, valida que não é texto, e anexa um Blob novo. */
export async function apiUpload(file: File | Blob): Promise<UploadResponse> {
  if (typeof file === 'string') {
    throw new Error('Arquivo inválido: não envie base64 nem data URL.');
  }
  if (!isFileOrBlob(file) || file.size === 0) {
    throw new Error('Arquivo inválido ou vazio.');
  }
  if (file.size > UPLOAD_MAX_BYTES) {
    throw new Error('Arquivo muito grande. Máximo 5MB.');
  }
  const tokens = getTokens();
  if (!tokens?.accessToken) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const b0 = bytes[0];
  const b1 = bytes[1];
  const looksLikeText = bytes.length > 4 && bytes.slice(0, 20).every((b) => b >= 0x20 && b <= 0x7e);
  if (looksLikeText) {
    throw new Error('Arquivo inválido: conteúdo em texto. Envie um arquivo de imagem binário.');
  }
  const jpeg = b0 === 0xff && b1 === 0xd8;
  const png = b0 === 0x89 && b1 === 0x50;
  const webp = bytes.length >= 4 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46;
  if (!jpeg && !png && !webp) {
    throw new Error('Arquivo inválido: não é uma imagem (JPEG, PNG ou WebP).');
  }

  const mimeType =
    file instanceof File && file.type && file.type.startsWith('image/')
      ? file.type
      : png
        ? 'image/png'
        : webp
          ? 'image/webp'
          : 'image/jpeg';
  const filename =
    file instanceof File && file.name
      ? file.name
      : png
        ? 'logo.png'
        : webp
          ? 'logo.webp'
          : 'logo.jpg';

  const blob = new Blob([arrayBuffer], { type: mimeType });
  const formData = new FormData();
  formData.append(UPLOAD_FIELD, blob, filename);

  const url = `${API_URL}/uploads`;
  const res = await doFetch(url, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try {
      const json = JSON.parse(text);
      if (json?.message) msg = json.message;
    } catch {}
    if (res.status === 401) msg = 'Sessão expirada. Faça login novamente.';
    else if (res.status === 403) msg = 'Sem permissão para enviar arquivos.';
    else if (res.status === 413) msg = 'Arquivo muito grande. Máximo 5MB.';
    throw new Error(msg || `Upload falhou: ${res.status}`);
  }
  return res.json() as Promise<UploadResponse>;
}

/** Upload de PDF (ex.: manual da marca). Limite 50MB. */
export async function apiUploadDocument(file: File | Blob): Promise<UploadResponse> {
  if (!isFileOrBlob(file) || file.size === 0) {
    throw new Error('Arquivo inválido ou vazio.');
  }
  if (file.size > UPLOAD_DOCUMENT_MAX_BYTES) {
    throw new Error('Arquivo muito grande. Máximo 50MB.');
  }
  const isPdf =
    (file instanceof File && (file.type === 'application/pdf' || (file.name || '').toLowerCase().endsWith('.pdf'))) ||
    (file instanceof Blob && file.type === 'application/pdf');
  if (!isPdf) {
    throw new Error('Apenas PDF é permitido.');
  }
  const tokens = getTokens();
  if (!tokens?.accessToken) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }
  const formData = new FormData();
  const blob = file instanceof Blob ? file : new Blob([await file.arrayBuffer()], { type: 'application/pdf' });
  const filename = file instanceof File && file.name ? file.name : 'documento.pdf';
  formData.append(UPLOAD_FIELD, blob, filename);
  const url = `${API_URL}/uploads/document`;
  const res = await doFetch(url, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try {
      const json = JSON.parse(text);
      if (json?.message) msg = json.message;
    } catch {}
    if (res.status === 401) msg = 'Sessão expirada. Faça login novamente.';
    else if (res.status === 403) msg = 'Sem permissão para enviar arquivos.';
    else if (res.status === 413) msg = 'Arquivo muito grande. Máximo 50MB.';
    throw new Error(msg || `Upload falhou: ${res.status}`);
  }
  return res.json() as Promise<UploadResponse>;
}

/** Upload de fonte (.ttf, .otf, .woff). Limite 10MB. */
export async function apiUploadFont(file: File | Blob): Promise<UploadResponse> {
  if (!isFileOrBlob(file) || file.size === 0) {
    throw new Error('Arquivo inválido ou vazio.');
  }
  if (file.size > UPLOAD_FONT_MAX_BYTES) {
    throw new Error('Arquivo muito grande. Máximo 10MB.');
  }
  const name = (file instanceof File ? file.name : '').toLowerCase();
  const validExt = name.endsWith('.ttf') || name.endsWith('.otf') || name.endsWith('.woff');
  if (!validExt) {
    throw new Error('Apenas fontes .ttf, .otf ou .woff são permitidas.');
  }
  const tokens = getTokens();
  if (!tokens?.accessToken) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }
  const formData = new FormData();
  const blob = file instanceof Blob ? file : new Blob([await file.arrayBuffer()], { type: (file as File).type });
  const filename = file instanceof File && file.name ? file.name : 'font.ttf';
  formData.append(UPLOAD_FIELD, blob, filename);
  const url = `${API_URL}/uploads/font`;
  const res = await doFetch(url, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try {
      const json = JSON.parse(text);
      if (json?.message) msg = json.message;
    } catch {}
    if (res.status === 401) msg = 'Sessão expirada. Faça login novamente.';
    else if (res.status === 403) msg = 'Sem permissão para enviar arquivos.';
    else if (res.status === 413) msg = 'Arquivo muito grande. Máximo 10MB.';
    throw new Error(msg || `Upload falhou: ${res.status}`);
  }
  return res.json() as Promise<UploadResponse>;
}

export const authStorage = { getTokens, setTokens, clearTokens };


