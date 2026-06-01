# Versão estável v1.1.0

**Data**: Janeiro 2026  
**Status**: Produção  
**Tag Git**: `v1.1.0`

---

## Checkpoint: Padronização dos botões de ação

Esta versão estabiliza a regra global de que **nenhum botão executa ação ou muda status automaticamente**. Toda interação de ação passa por um menu (dropdown/popover), com escolha explícita do usuário.

---

## Principais alterações

### Regra global
- Nenhum botão executa ação ou muda status com um clique direto.
- Um único botão de interação por card, que sempre abre um submenu.
- Ações listadas no menu; execução somente após escolha explícita (e modais quando a ação exigir).

### Agenda
- Removidos botões de ação direta nos cards.
- Um único botão (ícone de três pontos) por card que abre submenu.
- **Posts**: submenu "Ações do Post" (Enviar para aprovação, Marcar ajuste solicitado, Aprovar, Agendar post, Marcar como publicado, etc.) + divisor + "Abrir em Posts".
- **Tarefas gerais**: submenu "Ações da Tarefa" (Ir para [status]) + divisor + "Abrir em Tarefas".
- Link "→ Posts" / "→ Tarefas" removido do card e incorporado ao submenu.

### Página Posts (Produção)
- Botões que avançavam status automaticamente substituídos por menu de ações.
- Mesmo comportamento da Agenda: clique abre menu, usuário escolhe a ação.
- Opção "Ver na Agenda" no submenu (após divisor).

### Página Tarefas
- Substituição de botões diretos (ex.: "Concluir") por menu de ações.
- Submenu "Ações da Tarefa" com mudanças de status (Ir para [status]) + "Ver na Agenda".

### Arquivos alterados / novos
- `lib/i18n.ts` – Chaves para títulos e labels dos menus de ação.
- `components/PostActions.tsx` – Refatorado: sempre menu (popover), sem execução no primeiro clique.
- `components/tasks/GeneralTaskActions.tsx` – Novo: menu de ações para tarefas gerais.
- `components/tasks/TaskCard.tsx` – Novas props `sourcePage` e `onNavigateToPage`; integração de GeneralTaskActions.
- `components/tasks/TaskCardWithBadge.tsx` – Remoção do botão "→ Posts/Tarefas"; repasse de props.
- `components/AgendaPage.tsx` – `sourcePage="agenda"` e `onNavigateToPage` em todos os usos de TaskCardWithBadge.
- `components/ProducaoPage.tsx` – `sourcePage="posts"` e `onNavigateToPage` para "Ver na Agenda".
- `components/TarefasPage.tsx` – `sourcePage="tarefas"` e `onNavigateToPage` para "Ver na Agenda".
- `components/icons.tsx` – Ícone `EllipsisVerticalIcon` para o botão de ações.

### Backend
- Sem alterações: `GET /tasks/:id/available-actions` e `PATCH /tasks/:id/post-action` (posts); `PATCH /tasks/:id/status` (tarefas gerais).

---

## Como restaurar esta versão no futuro

```bash
git fetch --tags
git checkout v1.1.0
```

Ou criar um branch a partir desta tag:

```bash
git checkout -b restaurar-v1.1.0 v1.1.0
```

---

## Versão no package.json

- Raiz: `"version": "1.1.0"`
- API: `"version": "1.1.0"`
