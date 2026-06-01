# Auditoria MVP — Fase 5: Planejamento → Calendário → Posts

**Branch:** `feature/mvp-planning-calendar-posts-connection`  
**Data:** 2026-05-28  
**Escopo:** mapear o que já conecta, o que é parcial e o que falta **antes** de implementar correções.  
**Fora de escopo desta fase:** IA, geração de pauta/legenda, histórico, automações complexas, novos dashboards, alteração de layout/Agenda/Central visual.

**Referências:** `docs/MVP-DIAGNOSTICO-BASE.md`, `docs/AUDIT-MVP-INTELLIGENCE-PLANNING-SOURCE.md`, `docs/MVP-INTELLIGENCE-RULES.md`

**PR anterior (consolidação de regras):** branch `feature/mvp-intelligence-final-rules` — push feito; PR **não aberto** (registrado).

---

## Modelo de dados (base)

Tudo vive no mesmo registro **`Task`** (Prisma). Previsão ≠ post real por **campos**, não por tabela:

| Estado | `category` | `postType` | `bornAsForecast` | `convertedToPostAt` |
|--------|------------|------------|------------------|---------------------|
| Previsão | `forecast` | `null` | `true` | — |
| Post real | `null` (após conversão) | enum | `false` (após conversão) | preenchido na 1ª conversão |

Estratégia do cliente: `Client.brandGuideJson` (frequência, pilares, `preferredPostDays`, etc.) — `ClientsPage`, `PlanningSectionEditor`, `getClientPlanningProfile` (`lib/clientContext.ts`).

---

## Tabela mestre — fluxos

| Fluxo | Já funciona | Parcial | Não implementado | Observação |
|-------|:-----------:|:-------:|:----------------:|------------|
| **1. Cliente define estratégia** (frequência, pilares, dias preferidos, responsáveis) | ✅ | | | Persistência em `brandGuideJson` + `clientOwnerPreferencesJson`. Pilares não alimentam Central (só hints em `getPostCreationHints`). |
| **2. Planejamento interpreta meta** (esperado semana/mês, gap, concentração) | ✅ | | | `getExpectedForWeek`, `weekSummary`, `planningMonthDayStats` em `PlanningPage.tsx`; insights em `buildPlanningIntelligenceItems`. |
| **3. Calendário mostra previsões** (registros + slots fantasma) | ✅ | | | Tasks `category=forecast`; UI tracejada; dias preferidos sem task = slot visual não persistido. |
| **4. Gerar previsões em lote** | ✅ | | | `handleGenerateForecasts` → `computeForecastDatesToCreate` (`lib/utils.ts`). |
| **5. Conversão previsão → post** (mesmo `Task.id`) | ✅ | | | `TasksService.update`: `convertedToPostAt`, limpa `category`, histórico `convert_forecast`. Modal em Planejamento/Agenda/Posts. |
| **6. Post novo consome/substitui previsão no mesmo dia** | | | ✅ | `POST /tasks` **não** remove nem converte previsão existente. Post + previsão no mesmo dia **coexistem** e ambos ocupam slot (`occupiesSlot = postType \|\| forecast`). |
| **7. Posts (Kanban) só posts reais** | | ✅ | | `ProducaoPage` filtra `!isGeneral && clientId` **sem** excluir `category=forecast` — previsões podem aparecer no Kanban. Helper correto existe: `isRealPostFlowTask` (`lib/taskActionFlow.ts`). |
| **8. API métricas/summary só posts reais** | ✅ | | | `realPostBaseWhere` exclui forecast (`tasks.service.ts`). |
| **9. Agenda distingue PREVISÃO vs POST** | ✅ | | | `isPostForecast`, badges, métricas visíveis excluem previsão de contagem de posts (`agendaVisibleSummary.ts`). |
| **10. Alerta frequência ultrapassada** (criar previsão/post) | | ✅ | | `onValidateForecast`: aviso `planning_forecast_exceed_warning`, **`canCreate: true`** — nunca bloqueia. Fórmula mensal usa `ceil(qty*4.33)` na validação vs proporcional em `getExpectedForWeek`. |
| **11. Alerta operacional na Central (planejamento)** | ✅ | | | `below-frequency`, `excess-day`, `concentration`, `empty-week` — informativos, sem bloqueio. |
| **12. Insight “meta mensal ultrapassada” (bloqueio)** | | | ✅ | Só warning no modal; sem insight dedicado equivalente ao texto do prompt. |
| **13. Planejamento → Posts (navegação)** | ✅ | | | `openTaskInPostsPage` + `localStorage` `flow_posts_edit_target_task_id`. |
| **14. Atualização automática de métricas ao salvar** | | ✅ | | Recálculo **em memória** ao `setTasks` / reload do período; sem event bus. Cada página recarrega seu range. |
| **15. Central Inteligente reflete planejamento** | | ✅ | | Planejamento: coerente com janela. Posts/Tarefas/Agenda: escopo = tasks carregadas (+ global counts onde implementado). |
| **16. Dashboard operacional (semana)** | ✅ | | | `computeDashboardOperationalInsights` + delegação a `buildPlanningIntelligenceItems` (semana fixa). |
| **17. Distinção workflow previsão vs post** | ✅ | | | `task-module-access.ts`: módulo `planning` vs `posts`. |
| **18. Publicado/concluído fora de pendências** | ✅ | | | Regras da etapa anterior (`MVP-INTELLIGENCE-RULES.md`); API summary exclui `done`. |

---

## Arquivos centrais por etapa

| Etapa | Arquivos |
|-------|----------|
| Estratégia | `PlanningSectionEditor.tsx`, `StrategySectionEditor.tsx`, `ClientsPage.tsx`, `lib/clientContext.ts`, `lib/utils.ts` |
| Calendário | `PlanningPage.tsx`, `PostOrForecastModal.tsx` |
| Geração / meta | `computeForecastDatesToCreate`, `getExpectedForWeek`, `onValidateForecast` |
| API | `apps/api/src/tasks/tasks.service.ts` (`create`, `update`, `realPostBaseWhere`, `summary`) |
| Posts UI | `ProducaoPage.tsx`, `PostCard.tsx`, `lib/postForecastVisual.ts` |
| Agenda | `AgendaPage.tsx`, `lib/agendaVisibleSummary.ts` |
| Central | `lib/intelligentCentral.ts`, `lib/operationalInsights.ts` |

---

## Implementação (2026-05-28)

| Item | Status | Detalhe |
|------|--------|---------|
| Consumo automático | ✅ | `TasksService.create` → `findConsumableForecast` + `convertForecastWithCreatePayload` (conversão, não delete) |
| Posts sem previsões | ✅ | `ProducaoPage` usa `isRealPostFlowTask` |
| Quota unificada | ✅ | `lib/planningQuota.ts` + `getExpectedForMonth` |
| Alerta excesso (post real) | ✅ | `PostOrForecastModal` valida previsão e post; Producao/Agenda/Planejamento passam validador |
| Refresh | ✅ | `reloadPlanningTasks`, `reloadTasks`, `refreshPostsSummary` |

## Lacunas prioritárias (histórico pré-implementação)

1. ~~Consumo de previsão~~ — implementado (conversão in-place).
2. ~~ProducaoPage filtro~~ — implementado.
3. ~~Alinhar quota~~ — `lib/planningQuota.ts`.
4. ~~Alerta de excesso post real~~ — modal + validador compartilhado.
5. ~~Propagação~~ — reloads nas páginas afetadas.

---

## O que NÃO alterar nesta fase

- Layout estabilizado, cores, drag/drop, workflow principal
- Agenda e Central Inteligente **visual**
- Novos insights complexos / IA / histórico

---

## Critérios de validação (pós-implementação)

- [ ] Post real no dia de uma previsão reduz previsões (conversão ou remoção)
- [ ] Métricas planejado/esperado e contadores de previsão atualizam
- [ ] Kanban Posts não lista previsões
- [ ] Excesso de frequência exibe aviso ao criar (previsão e post)
- [ ] Calendário editorial e Agenda permanecem coerentes
- [ ] Sem regressão visual
