/**
 * Padrão visual da coluna esquerda em cards brancos (Posts, Tarefas kanban, etc.):
 * avatar do cliente e ícones de meta compartilham a mesma caixa (tamanho + shrink),
 * para alinhar na grade e evitar sensação de “logo menor que o ícone”.
 *
 * Ao pedir ajuste de tamanho/alinhamento nesses cards, altere apenas este arquivo.
 */
export const CARD_ROW_MEDIA_BOX = 'h-6 w-6 shrink-0';

/** Ícones de metadado — referência óptica: tipo de tarefa (post-it) e tipo de mídia no post. */
export const CARD_ROW_ICON_CLASS = `${CARD_ROW_MEDIA_BOX} text-gray-500 dark:text-gray-300`;

/**
 * Calendário e "em execução por" preenchem mais o viewBox que o post-it; mesmo downscale para os dois.
 * Ajuste fino do alinhamento vs. `CARD_ROW_ICON_CLASS`: altere só o fator `scale-[...]`.
 */
export const CARD_ROW_CALENDAR_EXEC_ICON_CLASS = `${CARD_ROW_ICON_CLASS} scale-[0.88] origin-center`;

/** Foto do cliente — mesma caixa que `CARD_ROW_ICON_CLASS`. */
export const CARD_ROW_AVATAR_IMAGE_CLASS = `${CARD_ROW_MEDIA_BOX} rounded-full object-cover border border-white/60 dark:border-gray-700/60`;

/** Placeholder colorido quando não há foto. */
export const CARD_ROW_AVATAR_PLACEHOLDER_CLASS = `${CARD_ROW_MEDIA_BOX} rounded-full border border-white/60 dark:border-gray-700/60`;

/** Espaço entre ícone/avatar e o texto da linha */
export const CARD_ROW_GAP_CLASS = 'gap-2';

/**
 * Agenda — cards compactos (TaskCard): moldura da bolinha do logo do cliente.
 * Sem padding interno; a foto preenche o círculo (`object-cover`). Ajuste o tamanho aqui.
 */
export const AGENDA_COMPACT_CLIENT_LOGO_FRAME =
    'block h-4 w-4 shrink-0 overflow-hidden rounded-full ring-1 ring-inset ring-white/45';

/** Imagem do logo dentro da moldura acima */
export const AGENDA_COMPACT_CLIENT_LOGO_IMAGE =
    'block h-full w-full min-h-0 min-w-0 object-cover object-center';

/** Bolinha do ícone de tipo (post/tarefa) na mesma grade do logo — sem padding interno. */
export const AGENDA_COMPACT_TYPE_ICON_FRAME =
    'flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/30 ring-1 ring-inset ring-white/45';
