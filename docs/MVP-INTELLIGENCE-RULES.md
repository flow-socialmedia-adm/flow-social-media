# Regras oficiais — Central Inteligente (MVP)

Documento de consolidação das regras operacionais. Sem engine nova, sem layout novo.

## Estrutura de cada insight

| Campo | Função |
|---|---|
| **Origem** | `clientName` (`__agency__` → "Agência") |
| **Contexto** | `contextKey` opcional (período visível, visão global, recorte carregado) |
| **Mensagem** | `messageKey` + `messageParams` |
| **Ação** | `actionLabelKey` opcional — só quando faz sentido interagir |

## Por página

### Agenda

- Insights de **pendência** (atraso, aprovado pendente, sobrecarga do dia, órfãs) consideram apenas o **período visível** (dia / semana / mês conforme a view).
- **`agenda-outside-period-overdue`**: aviso informativo se há atrasos **fora** do período, entre os dados já carregados.
  - Sem `actionLabelKey` → sem botão, sem destaque, sem navegação automática.
- Removido da Agenda: insight "cliente sem posts futuros" (escopo global — permanece no Dashboard / Planejamento).

### Dashboard

- Visão **global da agência** (semana corrente para planejamento operacional).
- `contextKey`: `intel_context_agency_global`.

### Calendário Editorial (Planejamento)

- Insights no **período da view** (semana ou mês).
- `contextKey`: `intel_context_planning_period_weekly` | `intel_context_planning_period_monthly`.

### Posts

- Pendências operacionais usam **`GET /tasks/summary?clientWorkflowId=...`** quando disponível.
- Mensagens distinguem **global** vs **recorte carregado** (mês civil).
- Fallback local se a API falhar.

### Tarefas

- Mesmo padrão de Posts com **`GET /tasks/summary?generalWorkflowId=...`**.
- Recorte local = semana civil carregada na página.

## Publicados e concluídos

| Tipo | Não entra em |
|---|---|
| Posts `publicado` / status `done` | atrasos, aprovados pendentes, sem responsável, produção parada |
| Tarefas concluídas (`category: done`) | atrasos, WIP, sem responsável, sem cliente |

**Permitido:** `intel_tasks_recent_done` — métrica informativa, sem ação.

## Destaque na Agenda

- Só insights com `actionLabelKey` e `intelligenceItemAllowsAgendaHighlight(item) === true`.
- `agenda-outside-period-overdue` nunca dispara destaque.

## Arquivos centrais

- `lib/intelligentCentral.ts` — builders puros
- `lib/intelligencePeriod.ts` — período visível da Agenda
- `lib/agendaHighlight.ts` — destaque visual (Agenda)
- `components/IntelligentCentral.tsx` — apresentação
- `lib/usePostsGlobalSummary.ts` / `lib/useTasksGlobalSummary.ts` — contagens globais

## Fora de escopo (MVP atual)

- IA, histórico dedicado, automações, migração automática, novos insights complexos.
