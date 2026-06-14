# Regras de Planejamento de Conteúdo

Documento canônico para contagem de posts e geração de previsões na página **Planejamento de Conteúdo** (Calendário Editorial).

---

## 1. Posts planejados X/Y

### Escopo

- **Período:** mês civil exibido no calendário (`currentMonthAnchor`), independente da vista semanal/mensal nas tags executivas.
- **Cliente:** cliente selecionado no filtro (nunca agregado multi-cliente).

### Meta (Y)

`Y = ceil(getExpectedForMonth(cliente, ano, mês))`

- Contrato **mensal:** `postFrequencyQuantity`.
- Contrato **semanal:** `ceil(quantidade × 4,33)`.
- **Frequência variável** ou sem quantidade/período válidos: tag oculta (`goal = null`).

### Contagem (X) — slot ocupado

Um item conta **1 slot** se:

1. Possui `clientId`, não é tarefa geral (`isGeneral === false`), **e**
2. **Post real:** `postType` definido e `category !== 'forecast'`, **ou**
3. **Previsão:** `category === 'forecast'`.

**Status de workflow não altera a contagem.** Posts em produção, aguardando aprovação, aprovados, agendados e publicados contam igualmente, desde que tenham `postType` (post real) ou sejam previsão.

**Data do slot:** `publishDate ?? date` (string `YYYY-MM-DD`, primeiros 10 caracteres). O item entra no mês se a data estiver entre o 1º e o último dia do mês (inclusive).

### Exibição

Sempre: **`Posts planejados: X/Y`**

- Tom **ok** (verde) quando `X >= Y`.
- Tom **warning** (âmbar) quando `X < Y`.

Não alternar para "Faltam: N" na tag executiva.

### Implementação

- `lib/planningSchedule.ts` — funções `taskOccupiesPlanningSlot`, `getTaskPlanningDate`, `computeClientMonthlySchedule`.
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
| **Planejamento de Conteúdo** (página calendário) | Objetivo do mês, foco do mês, pilares (leitura/edição inline), previsões, calendário |
