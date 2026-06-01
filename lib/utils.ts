import { Language } from '../types';
import type { Task } from '../types';

const getLocaleForLang = (lang: Language | string) => {
    const l = String(lang || '').toLowerCase();
    if (l === 'pt' || l.startsWith('pt-')) return 'pt-BR';
    if (l === 'es' || l.startsWith('es-')) return 'es-ES';
    if (l === 'en' || l.startsWith('en-')) return 'en-US';
    return 'en-US';
}

export const formatPhoneNumber = (phone: string, lang: Language | string = 'pt') => {
    if (phone == null || phone === '') return '';
    const onlyNums = String(phone).replace(/\D/g, '').replace(/^0+/, '');
    if (onlyNums.length === 0) return String(phone);

    // Brasil: +55 (99) 99999-9999 ou +55 (99) 9999-9999
    // Caso 1: 55 + DDD(2) + número (12-13 dígitos totais)
    if (onlyNums.startsWith('55') && onlyNums.length >= 12) {
        const ddd = onlyNums.substring(2, 4);
        const number = onlyNums.substring(4);
        if (number.length >= 9) return `+55 (${ddd}) ${number.substring(0, 5)}-${number.substring(5)}`;
        if (number.length === 8) return `+55 (${ddd}) ${number.substring(0, 4)}-${number.substring(4)}`;
    }
    // Caso 2: apenas DDD(2) + número — 11 dígitos (celular) ou 10 (fixo)
    if (onlyNums.length === 11 || onlyNums.length === 10) {
        const ddd = onlyNums.substring(0, 2);
        const d = parseInt(ddd, 10);
        if (d >= 11 && d <= 99) {
            if (onlyNums.length === 11) return `+55 (${ddd}) ${onlyNums.substring(2, 7)}-${onlyNums.substring(7)}`;
            return `+55 (${ddd}) ${onlyNums.substring(2, 6)}-${onlyNums.substring(6)}`;
        }
    }

    const locale = getLocaleForLang(lang);

    if (locale === 'pt-BR' && (onlyNums.length === 11 || onlyNums.length === 10)) {
        const ddd = onlyNums.substring(0, 2);
        const d = parseInt(ddd, 10);
        if (d >= 11 && d <= 99) {
            if (onlyNums.length === 11) return `+55 (${ddd}) ${onlyNums.substring(2, 7)}-${onlyNums.substring(7)}`;
            return `+55 (${ddd}) ${onlyNums.substring(2, 6)}-${onlyNums.substring(6)}`;
        }
    }

    if (locale === 'en-US') {
        if (onlyNums.length === 10 && !onlyNums.startsWith('55')) return `(${onlyNums.substring(0, 3)}) ${onlyNums.substring(3, 6)}-${onlyNums.substring(6)}`;
        if (onlyNums.length === 11 && onlyNums.startsWith('1')) return `+1 (${onlyNums.substring(1, 4)}) ${onlyNums.substring(4, 7)}-${onlyNums.substring(7)}`;
    }

    return phone;
};

/** Valor interno permanece YYYY-MM-DD; exibição em modo leitura (ex.: Minha Conta). */
export const formatIsoDateForDisplayBr = (iso: string): string => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec((iso || '').trim());
    if (!m) return (iso || '').trim();
    const [, y, mo, d] = m;
    return `${d}/${mo}/${y}`;
};

export const getWeekDays = (date: Date) => {
  const startOfWeek = new Date(date);
  const dayOfWeek = date.getDay(); // 0 for Sunday
  startOfWeek.setDate(date.getDate() - dayOfWeek); 
  
  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    days.push(day);
  }
  return days;
};

/** Semana iniciando na segunda-feira (seg–dom). */
export const getWeekDaysMondayFirst = (date: Date): Date[] => {
  const d = new Date(date);
  const day = d.getDay(); // 0=dom, 1=seg, ..., 6=sab
  const offset = day === 0 ? -6 : 1 - day; // segunda = início
  d.setDate(d.getDate() + offset);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    return x;
  });
};

/** Parseia postFrequency em texto para { quantity, period } quando possível.
 * Ex.: "2 posts por semana" -> { quantity: 2, period: 'week' }
 *      "8 posts por mês" -> { quantity: 8, period: 'month' }
 * Retorna null se não conseguir interpretar. */
export const parsePostFrequencyStructured = (postFrequency: string | undefined): { quantity: number; period: 'week' | 'month' } | null => {
  if (!postFrequency || !postFrequency.trim()) return null;
  const s = postFrequency.trim().toLowerCase();
  const numMatch = s.match(/(\d{1,2})/);
  if (!numMatch) return null;
  const num = parseInt(numMatch[1], 10);
  if (Number.isNaN(num) || num < 1 || num > 99) return null;
  if (/m[eé]s|month/.test(s)) return { quantity: num, period: 'month' };
  if (/semana|week/.test(s)) return { quantity: num, period: 'week' };
  return null;
};

/** Gera string postFrequency a partir de quantidade e período. */
export const buildPostFrequency = (quantity: number, period: 'week' | 'month', t?: (k: string) => string): string => {
  if (period === 'week') return `${quantity} posts por semana`;
  return `${quantity} posts por mês`;
};

/** Extrai número esperado de posts por semana a partir de postFrequency.
 * Heurística: "3 por semana" -> 3; "12 posts/mês" -> 3 (divide por 4); "5" -> 5.
 * Nota: Para contratos mensais, use getExpectedForWeek com weekDays para considerar
 * apenas os dias do mês na semana (evita puxar datas de meses vizinhos). */
export const parsePostsPerWeek = (postFrequency: string | undefined): number | null => {
  if (!postFrequency || !postFrequency.trim()) return null;
  const s = postFrequency.trim().toLowerCase();
  const num = parseInt(s.replace(/\D/g, '').slice(0, 2) || '0', 10);
  if (Number.isNaN(num) || num < 1 || num > 20) return null;
  if (/m[eé]s|month/.test(s)) return Math.max(1, Math.round(num / 4));
  return num;
};

/** Tipo mínimo para cliente com campos de frequência. */
export type ClientFrequencyInput = {
  postFrequency?: string;
  postFrequencyQuantity?: number;
  postFrequencyPeriod?: 'week' | 'month';
  postFrequencyVariable?: boolean;
};

/** Retorna a expectativa de posts para a semana, considerando contratos por semana ou mês.
 * - Contrato por semana: retorna quantity diretamente.
 * - Contrato por mês: distribui a meta mensal de forma proporcional aos dias da semana
 *   que pertencem a cada mês (não usa datas de meses vizinhos).
 * - Frequência variável: retorna null (sem meta fixa).
 * - Compatibilidade: se não houver campos estruturados, usa parsePostsPerWeek(postFrequency). */
export function getExpectedForWeek(client: ClientFrequencyInput, weekDays: Date[]): number | null {
  if (client.postFrequencyVariable === true) return null;

  const qty = client.postFrequencyQuantity;
  const period = client.postFrequencyPeriod;

  if (qty != null && qty > 0 && period === 'week') return qty;

  if (qty != null && qty > 0 && period === 'month') {
    const byMonth = new Map<string, { count: number; daysInMonth: number }>();
    for (const d of weekDays) {
      const y = d.getFullYear();
      const m = d.getMonth();
      const key = `${y}-${m}`;
      if (!byMonth.has(key)) {
        const lastDay = new Date(y, m + 1, 0);
        byMonth.set(key, { count: 0, daysInMonth: lastDay.getDate() });
      }
      const entry = byMonth.get(key)!;
      entry.count += 1;
    }
    let expected = 0;
    for (const { count, daysInMonth } of byMonth.values()) {
      expected += (count / daysInMonth) * qty;
    }
    return Math.round(expected * 10) / 10;
  }

  return parsePostsPerWeek(client.postFrequency);
}

export const getMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days = [];
    const firstDayOfWeek = firstDay.getDay(); 
    for (let i = 0; i < firstDayOfWeek; i++) {
        const prevMonthDay = new Date(firstDay);
        prevMonthDay.setDate(firstDay.getDate() - (firstDayOfWeek - i));
        days.push({ date: prevMonthDay, isCurrentMonth: false });
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
        days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    const lastDayOfWeek = lastDay.getDay();
    if (lastDayOfWeek < 6) {
        for (let i = 1; i < 7 - lastDayOfWeek; i++) {
            const nextMonthDay = new Date(lastDay);
            nextMonthDay.setDate(lastDay.getDate() + i);
            days.push({ date: nextMonthDay, isCurrentMonth: false });
        }
    }
    
    return days;
};

export const formatDateToYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Períodos para geração de previsões: próximo mês, 3, 6, 12 meses. */
export type ForecastPeriodKey = '1m' | '3m' | '6m' | '1y';

/** Retorna intervalo de datas para o período (a partir de hoje). */
export function getDateRangeForForecastPeriod(period: ForecastPeriodKey): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  if (period === '1m') end.setMonth(end.getMonth() + 1);
  else if (period === '3m') end.setMonth(end.getMonth() + 3);
  else if (period === '6m') end.setMonth(end.getMonth() + 6);
  else end.setFullYear(end.getFullYear() + 1);
  end.setDate(end.getDate() - 1); // último dia do período
  return { start, end };
}

const DAY_KEYS_FORECAST = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

function isPreferredDayForDate(client: { preferredPostDays?: string[] }, date: Date): boolean {
  if (!client.preferredPostDays?.length) return false;
  const key = DAY_KEYS_FORECAST[(date.getDay() + 6) % 7];
  return client.preferredPostDays.includes(key);
}

/** Meta esperada para um mês (contrato mensal). */
export function getExpectedForMonth(client: ClientFrequencyInput, year: number, month: number): number | null {
  if (client.postFrequencyVariable === true) return null;
  const qty = client.postFrequencyQuantity;
  const period = client.postFrequencyPeriod;
  if (qty != null && qty > 0 && period === 'month') return qty;
  if (qty != null && qty > 0 && period === 'week') return Math.ceil((qty * 4.33)); // ~4.33 semanas/mês
  return parsePostsPerWeek(client.postFrequency) != null ? Math.ceil((parsePostsPerWeek(client.postFrequency)! * 4.33)) : null;
}

/** Meta esperada para uma semana (contrato semanal). */
export function getExpectedForWeekOnly(client: ClientFrequencyInput): number | null {
  if (client.postFrequencyVariable === true) return null;
  const qty = client.postFrequencyQuantity;
  const period = client.postFrequencyPeriod;
  if (qty != null && qty > 0 && period === 'week') return qty;
  if (qty != null && qty > 0 && period === 'month') return Math.ceil(qty / 4.33);
  return parsePostsPerWeek(client.postFrequency);
}

type ForecastClientInput = ClientFrequencyInput & { preferredPostDays?: string[] };

/** Gera lista de datas (YYYY-MM-DD) para criar previsões, respeitando meta, ocupação e dias preferenciais. */
export function computeForecastDatesToCreate(
  client: ForecastClientInput,
  periodStart: Date,
  periodEnd: Date,
  existingCountByDate: Map<string, number>
): string[] {
  const results: string[] = [];
  const period = client.postFrequencyPeriod;
  const qty = client.postFrequencyQuantity;
  if (!qty || qty < 1 || (period !== 'week' && period !== 'month')) return results;

  const occupied = new Set<string>();
  for (const [dateStr, count] of existingCountByDate) {
    if (count > 0) occupied.add(dateStr);
  }

  if (period === 'month') {
    const cur = new Date(periodStart);
    while (cur <= periodEnd) {
      const y = cur.getFullYear();
      const m = cur.getMonth();
      const lastDay = new Date(y, m + 1, 0);
      const monthEnd = lastDay > periodEnd ? new Date(periodEnd) : lastDay;
      const monthStart = new Date(Math.max(new Date(y, m, 1).getTime(), periodStart.getTime()));

      const expected = Math.ceil(getExpectedForMonth(client, y, m) ?? 0);
      let existing = 0;
      const d = new Date(monthStart);
      while (d <= monthEnd) {
        const ds = formatDateToYYYYMMDD(d);
        existing += existingCountByDate.get(ds) ?? 0;
        d.setDate(d.getDate() + 1);
      }
      const remainder = Math.max(0, expected - existing);
      const candidates: { date: Date; preferred: boolean }[] = [];
      const d2 = new Date(monthStart);
      while (d2 <= monthEnd) {
        const ds = formatDateToYYYYMMDD(d2);
        if (!occupied.has(ds)) {
          candidates.push({ date: new Date(d2), preferred: isPreferredDayForDate(client, d2) });
        }
        d2.setDate(d2.getDate() + 1);
      }
      candidates.sort((a, b) => (b.preferred ? 1 : 0) - (a.preferred ? 1 : 0) || a.date.getTime() - b.date.getTime());
      for (let i = 0; i < remainder && i < candidates.length; i++) {
        const ds = formatDateToYYYYMMDD(candidates[i].date);
        results.push(ds);
        occupied.add(ds);
      }
      cur.setMonth(cur.getMonth() + 1);
      cur.setDate(1);
    }
  } else {
    const weekStart = new Date(periodStart);
    const dow = weekStart.getDay();
    const offset = dow === 0 ? -6 : 1 - dow;
    weekStart.setDate(weekStart.getDate() + offset);
    weekStart.setHours(0, 0, 0, 0);

    while (weekStart <= periodEnd) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const effectiveEnd = weekEnd > periodEnd ? periodEnd : weekEnd;
      const effectiveStart = weekStart < periodStart ? periodStart : weekStart;

      const expected = Math.ceil(getExpectedForWeekOnly(client) ?? 0);
      let existing = 0;
      const d = new Date(effectiveStart);
      while (d <= effectiveEnd) {
        existing += existingCountByDate.get(formatDateToYYYYMMDD(d)) ?? 0;
        d.setDate(d.getDate() + 1);
      }
      const remainder = Math.max(0, expected - existing);
      const candidates: { date: Date; preferred: boolean }[] = [];
      const d2 = new Date(effectiveStart);
      while (d2 <= effectiveEnd) {
        const ds = formatDateToYYYYMMDD(d2);
        if (!occupied.has(ds)) {
          candidates.push({ date: new Date(d2), preferred: isPreferredDayForDate(client, d2) });
        }
        d2.setDate(d2.getDate() + 1);
      }
      candidates.sort((a, b) => (b.preferred ? 1 : 0) - (a.preferred ? 1 : 0) || a.date.getTime() - b.date.getTime());
      for (let i = 0; i < remainder && i < candidates.length; i++) {
        const ds = formatDateToYYYYMMDD(candidates[i].date);
        results.push(ds);
        occupied.add(ds);
      }
      weekStart.setDate(weekStart.getDate() + 7);
    }
  }
  return results;
}

export const getDayName = (date: Date, length: 'short' | 'long', lang: Language) => {
    return new Intl.DateTimeFormat(getLocaleForLang(lang), { weekday: length }).format(date);
};

export const getMonthName = (date: Date, lang: Language) => {
    return new Intl.DateTimeFormat(getLocaleForLang(lang), { month: 'long', year: 'numeric' }).format(date);
};

export const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
};

/** Data de exibição/agenda: post usa publishDate, tarefa usa dueDate; fallback para date. Sempre retorna string. */
export const getTaskDisplayDate = (task: Task | null | undefined): string => {
    if (!task) return '';
    return ((task.clientId ? (task.publishDate ?? task.date) : (task.dueDate ?? task.date)) ?? (task.date ?? '')) || '';
};

/** Indica se a data de exibição do task é provisória. */
export const isTaskDisplayDateProvisional = (task: Task | null | undefined): boolean => {
    if (!task) return false;
    return !!task.clientId ? !!task.isProvisionalPublishDate : !!task.isProvisionalDueDate;
};

/** Converte client.color (Tailwind ou hex) para hex para uso em style/input. */
const TAILWIND_TO_HEX: Record<string, string> = {
    'bg-slate-600': '#475569',
    'bg-gray-600': '#4b5563',
    'bg-indigo-600': '#4f46e5',
};
export const resolveColorHex = (c: string | null | undefined): string =>
    (c && /^#[0-9a-fA-F]{6}$/.test(c)) ? c : (c ? (TAILWIND_TO_HEX[c] ?? '#475569') : '#475569');

// Formats a given Date or ISO/date string to pt-BR short format (dd/MM/yyyy)
export const formatDateBR = (dateLike?: string | Date | null) => {
    if (!dateLike) return '';
    const d = typeof dateLike === 'string' ? new Date(dateLike) : dateLike;
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
};
