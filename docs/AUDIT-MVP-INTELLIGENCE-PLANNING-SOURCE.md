# Auditoria — Central Inteligente: origem real dos dados

**Branch:** `audit/mvp-intelligence-planning-source`
**Data:** 2026-05-25
**Escopo:** mapear, por insight, a origem de dados (Cliente / Planejamento / tasks carregadas) e o escopo efetivo por página da Central Inteligente. **Nenhum comportamento foi alterado.**

Arquivos analisados:

- `lib/intelligentCentral.ts` (5 builders)
- `lib/clientContext.ts` (perfil de cliente)
- `lib/operationalInsights.ts` (helpers `isRealPost`, `isApprovedNotScheduled`, `isTaskDone`)
- `components/DashboardPage.tsx`, `components/PlanningPage.tsx`, `components/AgendaPage.tsx`, `components/ProducaoPage.tsx`, `components/TarefasPage.tsx`

---

## 1. Tabela mestre — todos os insights atuais

Convenções:
- **Origem real**: dados que efetivamente compõem a regra (sem incluir o `clientNameById` que serve apenas para rotular).
- **Usa Cliente?**: faz uso de `Client` (frequência, pillars, preferências, status etc.).
- **Usa Planejamento?**: faz uso de `planning items` (posts/forecasts atrelados a `clientId` em janela temporal definida).
- **Tasks carregadas?**: opera apenas sobre o array `tasks` em memória (sujeito ao range carregado pelo `reloadTasks` da página).
- **Escopo efetivo**: janela temporal real (não o que o nome do builder sugere).

| Página | ID do insight | Builder | Fonte dos dados | Usa Cliente? | Usa Planejamento? | Apenas tasks carregadas? | Escopo efetivo | Observação |
|---|---|---|---|---|---|---|---|---|
| Planejamento | `month-six-weeks` | `buildPlanningIntelligenceItems` | `monthHasSixWeeks` do calendário | ❌ | ❌ | ❌ | Mês atual visível | Cosmético / orientação |
| Planejamento | `month-five-weeks` | `buildPlanningIntelligenceItems` | `monthHasFiveWeeks` | ❌ | ❌ | ❌ | Mês atual visível | Cosmético / orientação |
| Planejamento | `no-frequency-{id}` | `buildPlanningIntelligenceItems` | `client.hasStructuredFrequency` (de `clientContext`) | ✅ | ❌ | ❌ | Por cliente | OK — usa cadastro |
| Planejamento | `empty-week-{id}` | `buildPlanningIntelligenceItems` | `expectedPerWeek` (Cliente) vs `inRange.filter(clientId)` | ✅ | ✅ | ✅ (planningItems) | Janela `startDate..endDate` | OK — coerente com a janela |
| Planejamento | `below-frequency-{id}` | idem | `expectedPerWeek` vs `planned` | ✅ | ✅ | ✅ | Janela `startDate..endDate` | OK |
| Planejamento | `excess-day-{id}` | idem | `clientItems` agrupados por dia | ✅ (rótulo) | ✅ | ✅ | Janela | OK |
| Planejamento | `concentration-{id}` | idem | `clientItems` agrupados por dia | ✅ (rótulo) | ✅ | ✅ | Janela | OK |
| Dashboard | (todos os insights de Planejamento) | `buildDashboardIntelligenceItems` → delega a `buildPlanningIntelligenceItems` | profiles via `getClientPlanningProfile` + posts da semana atual | ✅ | ✅ | ✅ | **Semana atual fixa (segunda → domingo)** | **Atenção:** dashboard é "global da agência", mas a janela é apenas a semana atual. Não cobre meses |
| Agenda | `agenda-approved-{clientId}` | `buildAgendaIntelligenceItems` | `visibleTasks.filter(isApprovedNotScheduled)` por cliente | ✅ (rótulo) | ❌ | ✅ | **Apenas período visível** (dia/semana/mês) | Coerente |
| Agenda | `agenda-overdue-{clientId}` | idem | `visibleTasks` com `getTaskDisplayDate < today && !done` | ✅ (rótulo) | ❌ | ✅ | **Apenas período visível** | **Inconsistência**: se o usuário está em "março" e há atrasos em "janeiro", não aparecem. Se há atrasos em "fevereiro" e o usuário navega para "abril", também somem. Pode causar falsa sensação de saúde |
| Agenda | `agenda-orphan-tasks` | idem | `visibleTasks` sem `clientId` em `clientNameById` | ❌ | ❌ | ✅ | Período visível | Coerente |
| Agenda | `agenda-overload-{day}` | idem | `visibleTasks.isGeneral` agrupadas por `dayKey` | ❌ | ❌ | ✅ | Período visível | Coerente |
| Agenda | `no-future-{clientId}` | idem | `clients` com frequência X `visibleTasks` futuras | ✅ | ❌ | ✅ | Inconsistência híbrida — itera `clients` mas valida em `visibleTasks` | **Inconsistência**: se há posts futuros em "junho" mas o usuário está em "maio", a regra acha que não tem futuro. **Falso-positivo** garantido fora da janela carregada |
| Posts | `posts-approved-pending` | `buildPostsIntelligenceItems` | `tasks.filter(isRealPost & isApprovedNotScheduled)` | ❌ | ❌ | ✅ | **Mês civil atual** (reloadTasks da ProducaoPage usa `startOfMonth..endOfMonth`) | Não vê posts aprovados de meses anteriores |
| Posts | `posts-overdue` | idem | `tasks` com `dayKey < today && !done` | ❌ | ❌ | ✅ | **Mês civil atual** | **Inconsistência**: posts atrasados de janeiro nunca aparecem em maio. Pode passar despercebido |
| Posts | `posts-without-client` | idem | `tasks` posts com `!clientId` | ❌ | ❌ | ✅ | Mês civil atual | OK na janela |
| Posts | `posts-without-owner` | idem | `tasks` posts com `!ownerUserId` (TEAM) | ❌ | ❌ | ✅ | Mês civil atual | OK na janela |
| Posts | `posts-stale-production` | idem | `tasks` em `em_producao` com `publishDate < hoje-14d` | ❌ | ❌ | ✅ | Mês civil atual | **Inconsistência**: posts presos há 60 dias em outro mês não aparecem |
| Posts | `posts-orphan` | idem | `tasks` apontando para `clientId` não conhecido | ❌ | ❌ | ✅ | Mês civil atual | Coerente |
| Tarefas | `tasks-overdue` | `buildTasksIntelligenceItems` | `generalTasks.filter(due < today && !done)` | ❌ | ❌ | ✅ | **Semana civil atual** (reloadTasks da TarefasPage usa `domingo..sábado`) | **Inconsistência grave**: tarefas atrasadas em semana anterior não aparecem |
| Tarefas | `tasks-without-owner` | idem | `generalTasks` sem `ownerUserId` (TEAM) | ❌ | ❌ | ✅ | Semana atual | Mesmo problema de escopo |
| Tarefas | `tasks-without-client` | idem | categoria preenchida mas `clientId` vazio | ❌ | ❌ | ✅ | Semana atual | Mesmo problema |
| Tarefas | `tasks-wip-overload` | idem | tarefas em status "em andamento" > 8 | ❌ | ❌ | ✅ | Semana atual | **Crítico**: limite WIP baseado só em 1 semana subdimensiona o real |
| Tarefas | `tasks-recent-done` | idem | concluídas nos últimos 7 dias | ❌ | ❌ | ✅ | Semana atual | Já é "histórico"; OK ser informativo |
| Tarefas | `tasks-orphan` | idem | `generalTasks` sem nome resolvido | ❌ | ❌ | ✅ | Semana atual | Coerente |

---

## 2. Validação dos dados de Cliente

| Dado planejado | Onde é usado | Como é lido | Status |
|---|---|---|---|
| Frequência contratada | `buildPlanningIntelligenceItems` (`empty-week`, `below-frequency`), `buildAgendaIntelligenceItems` (`no-future-{id}`) | `clientHasStructuredFrequency` + `getExpectedForWeek` em `clientContext.ts` | ✅ Usa cadastro original (`postFrequencyQuantity`, `postFrequencyPeriod`) |
| Planejamento semanal/mensal | `buildPlanningIntelligenceItems` via `planningItems` derivados em PlanningPage | Janela `startDate..endDate` repassada pela página | ✅ Cobre semana e mês conforme a view |
| Responsáveis (`ownerUserId`) | `buildPostsIntelligenceItems` (`posts-without-owner`), `buildTasksIntelligenceItems` (`tasks-without-owner`) | Lido diretamente de `Task.ownerUserId` (não do Cliente) | ⚠️ Não distingue "owner padrão do cliente" vs "owner pontual da task". Não há regra "cliente sem responsável" hoje |
| Cliente ativo/inativo | implícito: `/clients` filtra `deletedAt: null` | `clientNameById` derivado de roster | ✅ Cliente excluído gera `*-orphan` |
| Cliente sem planejamento | `buildPlanningIntelligenceItems` (`no-frequency-{id}`) | `client.hasStructuredFrequency` | ✅ |
| Cliente sem posts futuros | `buildAgendaIntelligenceItems` (`no-future-{clientId}`) | Cruza `clients` com frequência X `visibleTasks` futuras | ⚠️ Janela limitada à view da Agenda (ver §3) |
| Pilares (`strategyContentPillars`) | **Não é insumo da Central** (apenas usado em `getPostCreationHints`) | — | ➖ Fora do escopo atual |
| Preferências de dias (`preferredPostDays`) | **Não é insumo da Central** | — | ➖ Fora do escopo atual |
| Status do cliente (custom) | **Não existe campo `status` no Cliente** hoje | — | ➖ N/A |

---

## 3. Validação de escopo por página

### Agenda
- **Carga de dados:** `reloadTasks` em `AgendaPage.tsx:1361` chama `/tasks?startDate=...&endDate=...` com range = `dia | semana | mês` conforme a `view`. Cache local mescla itens já vistos em outras views, mas o builder recebe **só `visibleTasks`** (filtrado pelo período + filtros).
- **`buildAgendaIntelligenceItems` conta apenas itens do período visível?** Sim. ✅
- **Pode contar itens fora do período visível?** **Não.** Atrasos antigos (anteriores ao início da janela) não aparecem nessa view.
- **Ação de destaque pode apontar para item errado?** Sim em dois cenários:
  1. `no-future-{clientId}` itera **todos os `clients`** mas valida em `visibleTasks`. Se o cliente tem post em junho e o usuário está em maio, dispara um aviso enganoso.
  2. `agenda-overdue-{clientId}` lista atrasos do período visível; clicar para destacar funciona, mas atrasos de meses anteriores ficam invisíveis sem aviso paralelo.

### Dashboard
- **Carga de dados:** `tasks` e `clients` do `AppContext` (carga inicial em `App.tsx`).
- **Visão global da agência?** Parcialmente. `buildDashboardIntelligenceItems` ancora **na semana atual** (`getWeekDaysMondayFirst()` → `startDate..endDate` Mon-Sun) e delega a `buildPlanningIntelligenceItems`.
- **Pode mostrar pendências antigas?** **Não.** A janela é a semana atual; atrasos de semanas anteriores ou pendências do próximo mês não entram.

### Posts (ProducaoPage)
- **Carga de dados:** `reloadTasks` em `ProducaoPage.tsx:265` carrega **mês civil atual** (`startOfMonth..endOfMonth`, `pageSize: 1000`).
- **Usa todos os posts ou apenas os carregados?** Apenas o mês civil corrente (+ cache de execuções anteriores que pode estar parcial).
- **Implicações:**
  - `posts-overdue` não enxerga atrasos de meses anteriores.
  - `posts-stale-production` (≥ 14 dias) só dispara para posts cujo `publishDate` cai no mês atual.
  - `posts-approved-pending`, `posts-without-client` e `posts-without-owner` representam **só o mês corrente**, podendo subdimensionar gravemente o backlog real.

### Tarefas (TarefasPage)
- **Carga de dados:** `reloadTasks` em `TarefasPage.tsx` (linhas ~145-204) carrega **semana civil atual** (`domingo..sábado`, `pageSize: 1000`).
- **Usa todas as tarefas ou apenas as carregadas?** Apenas a semana atual.
- **Implicações:**
  - `tasks-overdue` é o problema mais sério: tarefa atrasada de "duas semanas atrás" **não aparece** porque nunca é carregada.
  - `tasks-wip-overload` (limite 8) é avaliado só sobre a semana — uma agência com 15 tarefas WIP herdadas de semanas anteriores não dispara o alerta.
  - `tasks-recent-done` (últimos 7 dias) coincidentalmente bate com a janela carregada, então funciona; é o único insight da página cujo escopo casa com a fonte.

### Planejamento
- **Usa frequência do cliente?** ✅ Direto de `getClientPlanningProfile` → `expectedPerWeek`.
- **Usa distribuição planejada?** ✅ `planningItems` agrupados por `clientId` e janela.
- **Usa posts reais/previsões?** ✅ `planningItems = tasks.filter(t => !t.isGeneral && t.clientId && (t.postType || isPostForecast(t)))` → cobre ambos.
- **Janela:** `startDate..endDate` repassados pela própria página, casando com a view (semana/mês). ✅ A página tem o melhor casamento entre fonte e regra.

---

## 4. Inconsistências encontradas (ordenadas por severidade)

| # | Severidade | Onde | Inconsistência | Impacto observável |
|---|---|---|---|---|
| 1 | 🔴 Alta | **Tarefas / `tasks-overdue`** | Janela carregada é só a semana atual | Backlog real fica oculto; agência "parece" em dia |
| 2 | 🔴 Alta | **Posts / `posts-overdue`** | Janela carregada é só o mês atual | Posts atrasados antigos somem ao virar mês |
| 3 | 🟠 Média | **Posts / `posts-stale-production`** | Limite ≥14 dias contra `publishDate`, mas só dentro do mês civil | Posts presos em meses anteriores nunca disparam |
| 4 | 🟠 Média | **Tarefas / `tasks-wip-overload`** | Limite 8 medido só na semana | WIP real é subdimensionado |
| 5 | 🟠 Média | **Dashboard** | Builder pega a semana atual e ignora atraso histórico ou pendência distante | Visão "global" não é tão global |
| 6 | 🟠 Média | **Agenda / `no-future-{clientId}`** | Itera `clients` mas valida em `visibleTasks` (período visível) | Falso-positivo: cliente com post em maio dispara aviso quando o usuário está em abril |
| 7 | 🟡 Baixa | **Agenda / `agenda-overdue-{clientId}`** | Conta só atrasos no período visível | Não é incorreto, mas falta aviso paralelo de pendências antigas (oportunidade de §4 do plano) |
| 8 | 🟡 Baixa | **Posts / `posts-recent-done` equivalente** | Não existe (paridade quebrada com Tarefas) | Posts publicados recentes não viram insight; usuário pode não enxergar produtividade |
| 9 | 🟢 Cosmética | **Vários insights** com `severity: 'alert'` para coisas que já podem ter sido feitas | Posts publicados antes de hoje continuam sendo "overdue" porque `isTaskDone` exige status `category === 'done'` | Se a configuração de workflow não marcar `publicado` como `done`, gera ruído |

---

## 5. Recomendação técnica — menor risco

A causa raiz da maioria das inconsistências (#1-#5) é **a Central operar sobre o `tasks` em memória da página**, que reflete a janela de UI, não a realidade da agência.

### Estratégia recomendada (do menor para o maior esforço)

**Etapa A — Separar contagens "pendência" das contagens "visíveis" (1-2 dias, sem backend novo):**
1. Para insights de "atraso" e "WIP", a página deve carregar uma **agregação mínima paralela** (counts por categoria), via `/tasks/summary` simples ou via filtros adicionais ao `/tasks` (`status=overdue&pageSize=1`).
2. A Central recebe esses números agregados pelo `input` (ex.: `overdueCountGlobal`) e os builders deixam de derivar de `tasks.filter(...)` para esses casos críticos.
3. Mantém a interpretação "visível" para insights leves (orphan, overload, sem cliente) — esses **podem** ficar no escopo da página.

**Etapa B — Avisos paralelos "fora do período" (alinhado com §4 do briefing do usuário):**
4. Na Agenda, exibir um **aviso textual sem ação de destaque** quando houver atrasos fora do período visível. Não navega, não destaca, apenas comunica que há `N` pendências fora desta janela.
5. Aplica o mesmo padrão em Posts e Tarefas.

**Etapa C — Histórico (MVP+):**
6. Página dedicada de Histórico cobre o que hoje é "concluídas recentes" e elimina ruído da Central para itens já feitos. **Não fazer agora**, mas projetar a saída de `posts-overdue`/`tasks-overdue` para incluir um link "ver histórico".

### Por que essa ordem minimiza risco
- A Etapa A não muda a UI, só substitui a fonte de **alguns campos** dos insights. Pode ser feita insight a insight (uma PR por página).
- A Etapa B adiciona um item informativo a mais por página, sem mexer nos insights existentes.
- A Etapa C é puramente novo escopo.

### Aproveitamento do que já existe
- `buildIntelligenceClientNameMap` continua sendo a fonte única de rotulagem.
- `AgencyClientsRosterContext` continua resolvendo nomes.
- Não precisa criar novos campos no `Client`.
- Não precisa novo backend (apenas usar filtros do `/tasks` que já aceita `status`, `startDate`, `endDate`).

---

## 6. Arquivos que precisariam ser alterados depois (não agora)

| Arquivo | Mudança esperada | Risco |
|---|---|---|
| `lib/intelligentCentral.ts` | Aceitar contagens globais opcionais (`overdueGlobalCount`, `wipGlobalCount`, etc.) em `buildPostsIntelligenceItems` / `buildTasksIntelligenceItems` / `buildAgendaIntelligenceItems`; usar global quando presente, cair para tasks visíveis quando não | Baixo (aditivo) |
| `components/AgendaPage.tsx` | Buscar `count` de atrasos do range completo via `/tasks?status=overdue&pageSize=1` (ou similar) e repassar ao builder; adicionar aviso informativo "fora do período" | Médio (1 chamada extra por troca de view) |
| `components/ProducaoPage.tsx` | Idem: carregar count de overdue + stale fora do mês corrente | Médio |
| `components/TarefasPage.tsx` | Idem: carregar count de overdue + WIP global fora da semana | Médio (maior impacto, pois é onde o problema é mais grave) |
| `components/DashboardPage.tsx` | Trocar `buildDashboardIntelligenceItems` para receber também janela "atrasos globais" e "próximos 30 dias", além da semana | Médio |
| `apps/api/src/tasks/tasks.controller.ts` | Validar se já há filtros `status=overdue` ou similar; caso não, adicionar endpoint leve `/tasks/summary` | Médio (depende do que já existe) |
| `lib/operationalInsights.ts` | Possivelmente expor uma versão "global" de `isTaskDone` que aceite mapa de workflow pré-resolvido | Baixo |
| `lib/i18n.ts` | Novas chaves para "fora do período visível" (ex.: `intel_outside_window_overdue`) | Trivial |
| `components/IntelligentCentral.tsx` | Nenhuma mudança esperada — segue puro renderer | — |
| (opcional, MVP+) `components/HistoryPage.tsx` | Página nova de histórico (out of scope hoje) | Alto |

---

## 7. Resumo executivo

- **5 builders auditados**, totalizando **24 insights** ativos.
- **Cliente** é fonte direta de **7 insights** (frequência, planejamento, posts futuros, no-frequency). **Coerente** com o cadastro.
- **Planejamento** é fonte direta de **5 insights** (todos em `buildPlanningIntelligenceItems`). **Coerente** com a janela escolhida pela página.
- **17 dos 24 insights** operam apenas sobre `tasks` carregadas na página → **escopo é o da janela de UI**, não da agência.
- **6 inconsistências de severidade média/alta** identificadas, todas decorrentes do mesmo padrão (regra global avaliada em fonte local). Nenhuma é bug de lógica isolada — todas se resolvem alimentando o builder com contagens agregadas adicionais ao `tasks` visível.
- **Nenhum novo campo no Cliente** é necessário para corrigir.
- **Nenhuma engine de IA / resolver complexo** é necessária.
- A correção pode ser feita de forma **estritamente aditiva**, página a página, sem alterar o componente `IntelligentCentral`, sem mexer no layout, e respeitando totalmente o limite "origem → mensagem → ação opcional".

---

## 8. Riscos encontrados (consolidado)

1. **Risco de subnotificação de pendências** (alto): atrasos antigos em Posts e Tarefas estão estatisticamente ocultos. Pode dar a impressão errada de operação saudável.
2. **Risco de falso-positivo** (médio): `no-future-{clientId}` na Agenda pode acusar cliente sem futuro mesmo quando há post planejado fora da janela visível.
3. **Risco de inconsistência entre páginas** (médio): Dashboard, Posts e Tarefas podem mostrar contagens diferentes para "atrasos" porque cada um usa uma janela diferente.
4. **Risco de ruído com workflow customizado** (baixo): se uma agência configurar o status `publicado` sem `category: 'done'`, posts publicados aparecem como "overdue".
5. **Risco zero** de quebra de UI nesta auditoria (nenhum código foi alterado).

---

**Fim da auditoria.** Próximo passo sugerido (ainda não autorizado): abrir branch `feature/mvp-intelligence-global-counts` para a Etapa A.
