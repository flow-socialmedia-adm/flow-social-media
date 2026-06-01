import type { Task } from '../types';
import { isPostForecast } from './postForecastVisual';
import {
	AGENDA_SUBSTATUS_PILL_CLASS,
	AGENDA_TASK_SUBSTATUS_PILL_ON_STATUS_BG,
} from './statusColors';

export type AgendaCardThemeSource = 'agenda' | 'posts' | 'tarefas';
export type AgendaCardVariant = 'default' | 'kanbanDesaturated';

export type AgendaCardFlags = {
	postForecast: boolean;
	isAgendaPage: boolean;
	isAgendaGeneralTask: boolean;
};

export type AgendaCardSurfaceInput = {
	flags: AgendaCardFlags;
	task: Task;
	variant: AgendaCardVariant;
	agendaDifferentiatedEmbedded: boolean;
	statusBorder?: string;
	baseBg: string;
	titleText: string;
	defaultOuterBorder: string;
};

export type AgendaCardSurface = {
	cardBg: string;
	cardTitle: string;
	cardBorder: string;
	agendaBubbleIconClass: string;
};

type AgendaCardThemeBaseInput = Omit<AgendaCardSurfaceInput, 'flags'> & {
	task: Task;
	sourcePage?: AgendaCardThemeSource;
};

export type AgendaCompactCardTheme = AgendaCardFlags &
	AgendaCardSurface & {
		agendaIconWrap: boolean;
		substatusPillClass: string;
	};

export type AgendaFullCardTheme = AgendaCardFlags &
	AgendaCardSurface & {
		substatusPillClass: string;
		agendaIconBubbleWrapClass: string;
	};

/** Uma chamada por render — evita repetir `isPostForecast` no TaskCard. */
export function resolveAgendaCardFlags(
	task: Task,
	sourcePage?: AgendaCardThemeSource,
): AgendaCardFlags {
	const postForecast = !task.isGeneral && isPostForecast(task);
	const isAgendaPage = sourcePage === 'agenda';
	return {
		postForecast,
		isAgendaPage,
		isAgendaGeneralTask: isAgendaPage && task.isGeneral && !postForecast,
	};
}

function resolveAgendaOuterBorder(
	flags: AgendaCardFlags,
	agendaDifferentiatedEmbedded: boolean,
	defaultOuterBorder: string,
): string {
	return flags.isAgendaPage
		? agendaDifferentiatedEmbedded || flags.postForecast
			? 'border-0'
			: 'border border-black/10 dark:border-white/15'
		: defaultOuterBorder;
}

function resolveAgendaSubstatusPillClass(
	flags: AgendaCardFlags,
	useTaskPillOnGeneral: boolean,
	cardTitleClass: string,
): string {
	if (!flags.isAgendaPage) {
		return 'bg-black/20 text-white border border-white/20';
	}
	if (useTaskPillOnGeneral && flags.isAgendaGeneralTask) {
		return cardTitleClass.includes('text-white')
			? AGENDA_SUBSTATUS_PILL_CLASS
			: AGENDA_TASK_SUBSTATUS_PILL_ON_STATUS_BG;
	}
	return AGENDA_SUBSTATUS_PILL_CLASS;
}

/** Superfície compartilhada (fundo, borda, título) para compact e full. */
export function resolveAgendaCardSurface(input: AgendaCardSurfaceInput): AgendaCardSurface {
	const {
		flags,
		task,
		variant,
		agendaDifferentiatedEmbedded,
		statusBorder = 'border-gray-300',
		baseBg,
		titleText,
		defaultOuterBorder,
	} = input;

	let cardBorder = resolveAgendaOuterBorder(flags, agendaDifferentiatedEmbedded, defaultOuterBorder);
	let cardBg = baseBg;
	let cardTitle = titleText;

	if (flags.postForecast) {
		const forecastInShell = flags.isAgendaPage;
		cardBg = forecastInShell
			? 'bg-white dark:bg-gray-800'
			: variant === 'kanbanDesaturated'
				? 'bg-slate-50 dark:bg-gray-900'
				: 'bg-slate-50 dark:bg-gray-800/95';
		cardTitle = 'text-slate-800 dark:text-slate-100';
		if (!forecastInShell) {
			cardBorder = flags.isAgendaPage
				? 'border border-dashed border-slate-300 dark:border-gray-600'
				: `border-l-4 border-dashed ${statusBorder}`;
		}
	}

	const agendaBubbleIconClass = cardTitle;

	return { cardBg, cardTitle, cardBorder, agendaBubbleIconClass };
}

export function getAgendaCompactCardTheme(
	input: AgendaCardThemeBaseInput,
	flags?: AgendaCardFlags,
): AgendaCompactCardTheme {
	const resolvedFlags = flags ?? resolveAgendaCardFlags(input.task, input.sourcePage);
	const surface = resolveAgendaCardSurface({
		...input,
		flags: resolvedFlags,
	});

	return {
		...resolvedFlags,
		...surface,
		agendaIconWrap: resolvedFlags.isAgendaPage,
		substatusPillClass: resolveAgendaSubstatusPillClass(resolvedFlags, true, surface.cardTitle),
	};
}

export function getAgendaFullCardTheme(
	input: AgendaCardThemeBaseInput,
	flags?: AgendaCardFlags,
): AgendaFullCardTheme {
	const resolvedFlags = flags ?? resolveAgendaCardFlags(input.task, input.sourcePage);
	const surface = resolveAgendaCardSurface({
		...input,
		flags: resolvedFlags,
	});

	const agendaIconBubbleWrapClass =
		resolvedFlags.postForecast && resolvedFlags.isAgendaPage
			? 'flex-shrink-0 flex items-center justify-center rounded-full bg-slate-200/80 dark:bg-gray-600/90 p-[3px] ring-1 ring-slate-300/90 dark:ring-gray-500'
			: 'flex-shrink-0 flex items-center justify-center rounded-full bg-white/30 p-[3px] ring-1 ring-white/25';

	return {
		...resolvedFlags,
		...surface,
		substatusPillClass: resolveAgendaSubstatusPillClass(resolvedFlags, false, surface.cardTitle),
		agendaIconBubbleWrapClass,
	};
}

/** Menu ⋮ em card com fundo claro (tarefa/previsão na Agenda). */
export function getAgendaMenuSurface(flags: AgendaCardFlags): 'light' | 'tinted' {
	return flags.isAgendaGeneralTask || (flags.postForecast && flags.isAgendaPage) ? 'light' : 'tinted';
}
