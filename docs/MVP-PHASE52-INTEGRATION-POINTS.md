# Fase 5.2 — Pontos de integração (produção / aprovação / agendamento)

Documento preparatório. **Nada implementado nesta etapa.**

## Objetivo futuro

Exibir datas operacionais derivadas do planejamento:

- **Produção** — X dias antes da publicação
- **Aprovação** — Y dias antes da publicação
- **Agendamento** — Z dias antes da publicação

## Onde integrar (mapeamento)

| Superfície | Arquivo | Ponto de extensão |
|------------|---------|-------------------|
| Calendário mensal | `components/PlanningPage.tsx` | Célula do heatmap (`planningMonthDayStats`) — indicadores compactos além de P/F |
| Calendário semanal | `components/PlanningPage.tsx` | Cards por slot (`postsByClientAndDate`) — badge ou sublinha de marco operacional |
| Modal Post/Previsão | `components/PostOrForecastModal.tsx` | Bloco informativo abaixo da data de publicação quando `publishDate` definida |
| Agenda | `components/AgendaPage.tsx` | `TaskCard` / `resolveAgendaCardKind` — marcos visuais sem alterar drag/drop |
| Central Inteligente | `lib/intelligentCentral.ts` | Novos insights apenas após regras de negócio fechadas (ex.: “produção deveria ter iniciado”) |

## Dados necessários (futuro)

- Configuração por agência ou cliente: offsets de dias (produção, aprovação, agendamento)
- Fonte: possivelmente `brandGuideJson` ou settings operacionais
- Cálculo: `publishDate` − offset → data sugerida de marco

## Restrições herdadas

- Não duplicar lógica de quota/previsão já em `lib/planningQuota.ts`
- Manter distinção previsão vs post real (`isPostForecast`, `isRealPostFlowTask`)
- Insights operacionais devem respeitar escopo Agência vs Cliente (padrão 5.1 em `lib/planningCentralView.ts`)
