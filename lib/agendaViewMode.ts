/**
 * Estilos dos cards na Agenda (POST / TAREFA / PREVISÃO).
 */

export type AgendaCardKind = 'post' | 'task' | 'forecast';

export function resolveAgendaCardKind(isGeneral: boolean, isForecast = false): AgendaCardKind {
    if (isGeneral) return 'task';
    if (isForecast) return 'forecast';
    return 'post';
}

/** Badge POST/TAREFA/PREVISÃO — faixa full-width no topo do contorno. */
export function getAgendaDifferentiatedBadgeClass(
    kind: AgendaCardKind,
    badgeSize: 'small' | 'default',
): string {
    const padX = badgeSize === 'small' ? 'px-2' : 'px-2.5';
    const text = badgeSize === 'small' ? 'text-[8px]' : 'text-[9px]';
    const minH = badgeSize === 'small' ? 'min-h-[20px]' : 'min-h-[24px]';
    const base = `${text} font-bold ${padX} py-1.5 ${minH} flex items-center gap-1.5 w-full shrink-0`;

    if (kind === 'post') {
        return `${base} text-white bg-[#7C3AED]`;
    }
    if (kind === 'forecast') {
        return `${base} text-white bg-slate-500 dark:bg-slate-600`;
    }
    return `${base} bg-white dark:bg-gray-800 text-[#6B7280]`;
}

/** Rótulo da faixa (sempre caixa alta). */
export function getAgendaDifferentiatedBadgeLabel(kind: AgendaCardKind): string {
    if (kind === 'task') return 'TAREFA';
    if (kind === 'forecast') return 'PREVISÃO';
    return 'POST';
}

/** Fundo do shell = cor da faixa, preenche cantos arredondados do contorno (previsão: só na faixa). */
export function getAgendaDifferentiatedWrapperBgClass(kind: AgendaCardKind): string {
    if (kind === 'post') return 'bg-[#7C3AED]';
    if (kind === 'forecast') return 'bg-transparent';
    return 'bg-white dark:bg-gray-800';
}

/** Previsão: sem overlay no shell (evita faixa sólida por cima do tracejado). */
export function agendaDifferentiatedShellHasOverlay(kind: AgendaCardKind): boolean {
    return kind !== 'forecast';
}

/** Card colado à faixa: sem arredondamento no topo (evita cantos brancos). */
export function getAgendaDifferentiatedEmbeddedCardRadiusClass(compact: boolean): string {
    return compact ? 'rounded-t-none rounded-b-md' : 'rounded-t-none rounded-b-lg';
}

/** Contorno envolve tag + card. */
export function agendaDifferentiatedShellWrapsBadge(): boolean {
    return true;
}

/**
 * Shell do card — contorno + overlay (posts roxo, tarefas cinza, previsão tracejado).
 */
export function getAgendaDifferentiatedCardShellClasses(kind: AgendaCardKind): {
    wrapperClass: string;
    overlayClass: string;
    overlayStyle: { backgroundColor: string };
} {
    if (kind === 'post') {
        return {
            wrapperClass: 'relative flex flex-col overflow-hidden rounded-lg border-2 border-[#7C3AED]',
            overlayClass: 'pointer-events-none absolute inset-0 z-[1]',
            overlayStyle: { backgroundColor: 'rgba(124,58,237,0.08)' },
        };
    }

    if (kind === 'forecast') {
        return {
            wrapperClass:
                'relative flex flex-col overflow-hidden rounded-lg border-2 border-dashed border-slate-400 dark:border-gray-500 bg-clip-padding',
            overlayClass: 'pointer-events-none absolute inset-0 z-[1]',
            overlayStyle: { backgroundColor: 'transparent' },
        };
    }

    return {
        wrapperClass: 'relative flex flex-col overflow-hidden rounded-lg border-2 border-[#6B7280]',
        overlayClass: 'pointer-events-none absolute inset-0 z-[1]',
        overlayStyle: { backgroundColor: 'rgba(107,114,128,0.06)' },
    };
}

/** Sombra mais suave para tarefas na Agenda. */
export function getAgendaDifferentiatedCardShadowClass(kind: AgendaCardKind): string | null {
    if (kind === 'post' || kind === 'forecast') return null;
    return 'shadow-sm hover:shadow';
}
