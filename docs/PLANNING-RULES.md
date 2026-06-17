# Regras de Planejamento de Conteúdo

Documento canônico para contagem de posts e geração de previsões na página **Planejamento de Conteúdo** (Calendário Editorial).

---

## 1. Posts planejados X/Y

### Escopo

- **Período:** mês civil exibido no calendário (`currentMonthAnchor`), independente da vista semanal/mensal nas tags executivas.
- **Cliente:** cliente selecionado no filtro (nunca agregado multi-cliente).

### Meta (Y)

Fonte canônica: `getMonthlyPlanningGoal(cliente, ano, mês)` em `lib/planningSchedule.ts`.

| Contrato | Regra |
|----------|--------|
| **Por mês** | `Y = quantidade contratada` (ex.: 4 posts/mês → meta **4**, mesmo em meses com 5 semanas) |
| **Por semana** | `Y = quantidade × semanas civis do mês` (seg–dom com ≥1 dia no mês; ex.: 1/sem em mês de 5 semanas → meta **5**) |
| **Variável** ou sem quantidade/período válidos | tag oculta (`goal = null`) |

Resolução de frequência (ordem): `briefingV2.planning.frequency` (se preenchido) → string legada (`postFrequency`) → campos flat (`postFrequencyQuantity` / `postFrequencyPeriod`).

Quantidade e período são normalizados (`normalizePlanningQuantity`, `normalizePlanningPeriod`) — aceita `"4"`, `"monthly"`, `"mensal"`, `"por mês"`, etc.

### Reconciliação briefingV2 × campos legados

Ao carregar (`normalizeClient`) e ao salvar (`patchClientBriefing` / `savePlanningClient`):

1. Se `briefingV2.planning.frequency` tiver quantidade + período válidos → **vence** e sincroniza flat/legado.
2. Se briefing estiver vazio → usa flat/legado e projeta em `briefingV2`.
3. Campos sincronizados: `postFrequencyQuantity`, `postFrequencyPeriod`, `postFrequency`, `briefingV2.planning.frequency`.

Inspeção: `npx tsx scripts/inspect-client-frequency.mjs`  
Reparo: `npx tsx scripts/repair-brandguide-frequency.mjs` (opcional `--dry-run`)

Briefing e flat **nunca são misturados** na resolução (qty de um + period de outro).

**Mês com 5 semanas:** não altera a meta de clientes **por mês**; gera apenas alerta informativo de distribuição na Central da Agência (`intel_month_five_weeks`). Clientes **por semana** têm meta proporcional ao número real de semanas do mês.

### Contagem (X) — slot ocupado

Fonte canônica: `computeClientMonthlySchedule(client, tasks, monthAnchor)`.

Retorna `plannedCount`, `goal`, `remainingCount`, `countedItems[]`, `ignoredItems[]`.

Um item conta **1 slot** (`plannedCount`) se:

1. `clientId` = cliente selecionado;
2. Não é tarefa geral (`isGeneral === false`);
3. **Post real** (`postType`) **ou previsão** (`category === 'forecast'`);
4. Data normalizada (`normalizeDateOnly` em `publishDate ?? date`) dentro do mês civil visível (`monthStart`..`monthEnd`).

**Não conta:** tarefas gerais, posts de outros clientes, itens sem data, itens fora do mês visível, tarefas sem `postType` e sem `category=forecast`.

**Status de workflow não altera a contagem.**

Motivos de exclusão (audit): `wrong_client`, `general_task`, `not_planning_slot`, `missing_date`, `outside_visible_month`.

### Visão Geral do Cliente (métrica diferente)

A aba **Cliente > Visão Geral** usa `postsThisMonth`: conta **todas** as tasks do cliente com data no mês civil atual (`getTaskDisplayDate`), **sem** filtrar post/previsão/tarefa geral.

| Tela | Métrica | Escopo |
|------|---------|--------|
| **Planejamento de Conteúdo** | `Posts planejados: X/Y` | Slots de planejamento (post + previsão) no **mês visível** |
| **Visão Geral** | "Posts do mês" (`overview_posts_month`) | Todas as tasks datadas no mês civil **atual** (pode incluir tarefas, histórico misturado) |

Números podem divergir (ex.: 7 na Visão Geral vs 4 no Planejamento). Planejamento **nunca** mistura histórico fora do mês visível.

### Auditoria (dev)

Com cliente Janete selecionado em dev, `logClientMonthlyScheduleAudit` imprime tabela no console com cada task, data normalizada e motivo de inclusão/exclusão.

### Exibição

Sempre: **`Posts planejados: X/Y`**

- Tom **ok** (verde) quando `X >= Y`.
- Tom **warning** (âmbar) quando `X < Y`.

Não alternar para "Faltam: N" na tag executiva.

### Tag operacional — posts atrasados

Métrica separada de X/Y. Fonte: `countClientMonthlyOverduePosts()` (`lib/planningOverduePosts.ts`).

- Posts **reais** do mês visível; **não** previsões.
- Atrasado = não concluído (`isTaskDone`) e (data publicação &lt; hoje **ou** marco operacional vencido).
- Exibição: `0 atrasados` (neutro) | `N post(s) atrasado(s)` (âmbar).

### Implementação

- `lib/planningSchedule.ts` — `computeClientMonthlySchedule`, `resolvePlanningFrequency`, `getMonthlyPlanningGoal`.
- `lib/planningFrequency.ts` — normalização e prioridade briefingV2.
- `lib/reconcileClientFrequency.ts` — reconciliação load/save.
- `lib/planningOverduePosts.ts` — `countClientMonthlyOverduePosts`.
- `lib/dateOnly.ts` — `normalizeDateOnly` para datas de slot.
- Consumido em `PlanningPage.tsx` → `PlanningExecutiveTags`.

---

## 2. Gerar previsões

### Pré-requisitos (botão habilitado)

Todos obrigatórios:

| Requisito | Campo |
|-----------|--------|
| Frequência fixa | `planning.frequency`: quantidade > 0, período `week` ou `month`, `variable !== true` |
| Dias preferenciais | `planning.preferredPostDays.length > 0` |
| Objetivo do mês | `content.currentCampaignObjective` preenchido |

Se faltar qualquer um: botão desabilitado, tooltip *"Complete o planejamento do cliente antes de gerar previsões."*

### Escopo temporal

- **Somente o mês civil atual** (mês de `new Date()` no fuso local do navegador).
- **Sem** opções de 3 meses, 6 meses ou 1 ano.

### Quantidade criada

```
restantes = max(0, meta_mensal - slots_ocupados_no_mês)
```

`slots_ocupados` usa a mesma regra de contagem da seção 1, no mês atual.

Cria **exatamente `restantes` previsões**, uma por dia livre, priorizando `preferredPostDays`, **a partir de hoje** até o fim do mês (não preenche dias passados).

Cada previsão: `category: 'forecast'`, `postType: null`, `bornAsForecast: true`, `origin: 'planejamento'`.

### Resultado

- `0` criadas → toast informativo (período já completo).
- `N > 0` → toast de sucesso.

---

## 3. Datas (date-only)

Campos `date`, `publishDate`, `dueDate` são **datas civis** (`YYYY-MM-DD`), sem componente horário relevante.

- **Persistência:** `YYYY-MM-DDT12:00:00.000Z` (meio-dia UTC evita deslocamento ±1 dia).
- **Leitura API:** componentes UTC (`getUTCFullYear`, `getUTCMonth`, `getUTCDate`).
- **UI / calendário:** `formatDateToYYYYMMDD` (partes locais) alinhado com strings `YYYY-MM-DD` da API.

---

## 4. Separação conceitual

| Contexto | Conteúdo |
|----------|----------|
| **Estratégia do Cliente** (aba) | Objetivo do perfil, pilares, público, tom, diferenciais, observações — permanente |
| **Operação dos Posts** (aba, ex-Planejamento) | Frequência, dias, responsável, aprovação, canal, prazos |
| **Planejamento de Conteúdo** (página calendário) | Objetivo do mês, pilares (leitura/edição inline), previsões, calendário |
