# Briefing Schema V2 — Cadastro do Cliente

Documento de referência **antes da implementação** da reestruturação dos cadastros (Prompt A).

**Objetivo:** interface simples para operação diária, com modelo de dados **expansível** para IA, formulário externo, briefing avançado e automações — sem retrabalho futuro.

**Escopo deste schema:** blocos **Estratégia · Público · Comunicação · Conteúdo · Planejamento** dentro do briefing operacional.

**Fora deste schema (permanecem como hoje):** Identidade visual, Dados cadastrais, Contrato, Financeiro, Overview.

**Não altera nesta fase:** página Calendário Editorial / Planejamento de Conteúdo.

---

## Princípios

| Princípio | Regra |
|-----------|--------|
| UI enxuta | Só campos que respondem perguntas operacionais claras |
| Modelo rico | Campos internos e legados permanecem no JSON para leitura futura |
| Um nível de acordeão | 5 blocos principais recolhíveis; **sem** acordeão dentro de acordeão |
| Dual-read | Normalização lê V2 com fallback V1 durante transição |
| Formulário externo | Mesmo JSON que a UI interna (`brandGuideJson.briefingV2`) |

---

## Onde persiste

```text
Client (Prisma)
├── brandGuideJson
│   ├── briefingV2          ← schema canônico (novo)
│   ├── …campos legados V1… ← espelho / fallback durante migração
│   └── brandColors, typography, brandAssets … (visual — fora do briefingV2)
├── clientOwnerPreferencesJson   ← responsáveis por etapa (operacional agência)
├── notes                        ← notas gerais do cliente (≠ observações estratégicas)
└── …
```

**Versão do schema:**

```json
{
  "briefingV2": {
    "schemaVersion": 2,
    "updatedAt": "2026-06-01T12:00:00.000Z",
    "strategy": { … },
    "audience": { … },
    "communication": { … },
    "content": { … },
    "planning": { … },
    "_internal": { … }
  }
}
```

---

## Legenda de visibilidade

| Símbolo | Significado |
|---------|-------------|
| **UI** | Campo visível e editável na nova interface |
| **INT** | Campo no modelo V2, preparado para IA/automação; **não** exposto na UI inicial |
| **LEG** | Campo legado V1; permanece em `brandGuideJson` raiz; **não** aparece na UI; leitura via fallback |
| **OPS** | Operacional da agência; fora do briefing do cliente (ex.: `ownerPreferences`) |

---

## 1. Campos visíveis na interface (UI)

Cinco blocos recolhíveis. Indicador por bloco: **`X/Y preenchidos`**.

### 1.1 Estratégia

*Pergunta: “Quem é essa marca e como ela quer ser percebida?”*

| Campo UI | Chave V2 | Tipo | Obrigatório p/ Y |
|----------|----------|------|------------------|
| Quem é a marca? | `strategy.brandWho` | `string` (longo) | sim |
| Principais serviços/produtos | `strategy.mainServicesTags` | `string[]` | sim |
| Diferenciais da marca | `strategy.differentiators` | `string` | sim |
| Como deseja ser percebida? | `strategy.perceivedAs` | `string` | sim |
| Referências de mercado | `strategy.marketReferences[]` | ver §4 | sim (≥1 item) |

**Y = 5**

### 1.2 Público

*Pergunta: “Para quem estamos criando conteúdo?”*

| Campo UI | Chave V2 | Tipo | Obrigatório p/ Y |
|----------|----------|------|------------------|
| Público principal | `audience.main` | `string` | sim |
| Principais dores | `audience.painsTags` | `string[]` | sim |
| Principais desejos | `audience.desiresTags` | `string[]` | sim |
| Principais objeções | `audience.objectionsTags` | `string[]` | sim |
| Personas *(opcional)* | `audience.personas[]` | ver §4 | **não** conta em Y |

**Y = 4** (personas opcional, fora do progresso)

### 1.3 Comunicação

*Pergunta: “Como essa marca conversa?”*

| Campo UI | Chave V2 | Tipo | Obrigatório p/ Y |
|----------|----------|------|------------------|
| Tom de voz | `communication.toneOfVoice` | `string` | sim |
| Palavras e conceitos da marca | `communication.brandWordsTags` | `string[]` | sim |
| CTA principal | `communication.primaryCta` | enum (§ enums) | sim |
| O que evitar na comunicação | `communication.avoid` | `string` | sim |

**Y = 4**

### 1.4 Conteúdo

*Pergunta: “O que devemos produzir?”*

| Campo UI | Chave V2 | Tipo | Obrigatório p/ Y |
|----------|----------|------|------------------|
| Objetivo do perfil | `content.profileObjective` | `string` | sim |
| Objetivo atual / campanha vigente | `content.currentCampaignObjective` | `string` | sim |
| Foco do mês | `content.monthFocus` | `string` | sim |
| Pilares de conteúdo | `content.pillarsTags` | `string[]` | sim |
| Observações estratégicas | `content.strategyNotes` | `string` | sim |

**Y = 5**

> **Nota:** `content.strategyNotes` persiste em `briefingV2.content.strategyNotes`, **não** em `Client.notes` (notas gerais).

### 1.5 Planejamento

*Pergunta: “Como essa operação funciona?”*

| Campo UI | Chave V2 | Tipo | Obrigatório p/ Y |
|----------|----------|------|------------------|
| Quantidade | `planning.frequency.quantity` | `number` | sim* |
| Período | `planning.frequency.period` | `'week' \| 'month'` | sim* |
| Frequência variável | `planning.frequency.variable` | `boolean` | — |
| Dias preferenciais | `planning.preferredPostDays` | `'mon'…'sun'[]` | sim |
| Produção (dias antes) | `planning.operation.productionLeadDays` | `number` | sim |
| Aprovação (dias antes) | `planning.operation.approvalLeadDays` | `number` | sim |
| Agendamento (dias antes) | `planning.operation.schedulingLeadDays` | `number` | sim |
| Aprovação obrigatória | `planning.operation.approvalRequired` | `boolean` | sim |
| Canal de aprovação | `planning.operation.approvalChannel` | enum | sim |
| Prazo médio de resposta | `planning.operation.clientResponseTime` | enum | sim |

\* Se `frequency.variable === true`, quantidade/período não entram no Y (considera-se preenchido).

**Y = 9** (ou 8 quando variável)

**OPS (UI separada, modo equipe):** `clientOwnerPreferencesJson` — responsáveis por etapa; **não** faz parte de `briefingV2`.

---

## 2. Campos internos preparados para futuro (INT)

Ficam em `briefingV2._internal`. **Não aparecem na UI inicial.** Podem ser preenchidos por:

- migração a partir de V1
- IA (extração a partir de `brandWho`, documentos, entrevistas)
- formulário externo avançado (fase posterior)
- automações

### 2.1 Identidade de marca estruturada

```typescript
interface InternalBrandIdentity {
  /** Narrativa unificada exibida na UI como "Quem é a marca?" */
  brandWho?: string;

  /** Campos estruturados — INT, não UI inicial */
  mission?: string;
  vision?: string;
  values?: string;           // texto ou markdown; futuro: string[]
  history?: string;
  businessSummary?: string;

  /** Síntese gerada por IA a partir dos campos acima */
  aiSummary?: string;
  aiSummaryGeneratedAt?: string; // ISO
}
```

**Chave:** `briefingV2._internal.brandIdentity`

**Relação com UI:** `strategy.brandWho` é a **face pública**; `mission` / `vision` / `values` alimentam IA sem sobrecarregar o formulário.

### 2.2 Público enriquecido

```typescript
interface InternalAudience {
  ageRange?: string;
  region?: string;
  demographicNotes?: string;
  aiPersonaHints?: string;
}
```

**Chave:** `briefingV2._internal.audience`

### 2.3 Comunicação enriquecida

```typescript
interface InternalCommunication {
  wordsToAvoidTags?: string[];   // ex-V1 wordsThatDontFit
  contentStyle?: string;         // ex-V1 contentStyle
  secondaryCtas?: string[];
}
```

**Chave:** `briefingV2._internal.communication`

### 2.4 Conteúdo / performance (futuro)

```typescript
interface InternalContent {
  kpis?: string;                 // ex-V1 kpis
  performanceNotes?: string;
  pillarsDetailed?: Array<{
    id: string;
    name: string;
    description?: string;
    objective?: string;
    exampleThemes?: string[];
  }>;
}
```

**Chave:** `briefingV2._internal.content`

### 2.5 Planejamento operacional extra

```typescript
interface InternalPlanning {
  calendarNotes?: string;
  operationNotes?: string;
  accountOwnerLegacy?: string;   // ex planningAccountOwner
  avgPostsPerWeek?: string;
}
```

**Chave:** `briefingV2._internal.planning`

### 2.6 Metadados

```typescript
interface BriefingInternalMeta {
  migratedFromV1At?: string;
  migrationVersion?: number;
  externalFormSubmissionId?: string;
  lastAiEnrichmentAt?: string;
}
```

**Chave:** `briefingV2._internal.meta`

---

## 3. Campos que não aparecem na UI agora, mas permanecem no modelo

### 3.1 Dentro de `briefingV2._internal` (INT — §2)

Todos os campos INT acima.

### 3.2 Campos legados V1 na raiz de `brandGuideJson` (LEG)

Permanecem para **dual-read** e rollback. A UI V2 **não edita** diretamente; sync opcional no save.

| Campo LEG (V1) | Destino V2 / INT | Ação na migração |
|----------------|------------------|------------------|
| `brandHistory` | `_internal.brandIdentity.history` + concat → `strategy.brandWho` | preservar |
| `brandMission` | `_internal.brandIdentity.mission` | preservar |
| `brandVision` | `_internal.brandIdentity.vision` | preservar |
| `brandValues` | `_internal.brandIdentity.values` | preservar |
| `mainServices` (texto) | `strategy.mainServicesTags` | split → tags |
| `strategyCompetitors[]` | `strategy.marketReferences` (`type: competitor`) | merge |
| `strategyInspirations[]` | `strategy.marketReferences` (`type: inspiration`) | merge |
| `audienceAgeRange` etc. | `_internal.audience.*` + concat → `audience.main` | preservar |
| `strategyPersonas[]` (completo) | `audience.personas[]` (UI) + `_internal` extras | slim + preservar |
| `wordsThatFit` | `communication.brandWordsTags` | split |
| `wordsThatDontFit` | `_internal.communication.wordsToAvoidTags` | preservar |
| `contentStyle` | `_internal.communication.contentStyle` | preservar |
| `strategyContentPillars[]` | `content.pillarsTags` + `_internal.content.pillarsDetailed` | tags + preservar |
| `monthlyObjective` / `planningPeriodFocus` | `content.monthFocus` | unificar |
| `strategyNotes` / `Client.notes` | `content.strategyNotes` | normalizar destino |
| `kpis`, `planningPerformanceNotes` | `_internal.content.*` / `_internal.planning.*` | preservar |
| `postFrequency*` | `planning.frequency.*` | mapear 1:1 |
| `planning*LeadDays` | `planning.operation.*` | string → number |

### 3.3 Outros LEG sem editor ativo (manter no tipo `Client`)

`objectives`, `businessSummary`, `targetAudience`, `dos`, `donts`, `hashtags`, `contentPillars[]`, `competitors` (texto), `planningAvgPostsPerWeek`, `brandGuidelines`

---

## 4. Exemplos de estruturas

### 4.1 `internalBrandIdentity` (INT)

```json
{
  "_internal": {
    "brandIdentity": {
      "brandWho": "A Chama Zé do Gás é uma distribuidora familiar de gás GLP na região metropolitana…",
      "mission": "Levar gás com segurança e agilidade para cada lar.",
      "vision": "Ser a referência em entrega rápida na Grande São Paulo.",
      "values": "Segurança, proximidade, honestidade no preço.",
      "history": "Fundada em 1998 pelo José…",
      "aiSummary": "Marca local, tom próximo, foco em confiança e rapidez.",
      "aiSummaryGeneratedAt": "2026-06-01T14:30:00.000Z"
    }
  }
}
```

### 4.2 Referência de mercado (`marketReferences`)

```typescript
type MarketReferenceType = 'competitor' | 'inspiration';

interface MarketReference {
  id: string;
  type: MarketReferenceType;
  name: string;
  link?: string;
  note?: string;

  // INT — não UI inicial; preservados na migração
  strengths?: string;      // ex competitor
  weaknesses?: string;
  whatInspires?: string;   // ex inspiration
}
```

**UI:** nome, link (opcional), observação (opcional). Tipo inferido na migração ou editável em fase avançada.

```json
{
  "strategy": {
    "marketReferences": [
      {
        "id": "ref-1",
        "type": "competitor",
        "name": "Gás Rápido SP",
        "link": "https://exemplo.com",
        "note": "Fortes em app; fracos no atendimento humano.",
        "strengths": "App, logística",
        "weaknesses": "Atendimento"
      },
      {
        "id": "ref-2",
        "type": "inspiration",
        "name": "Ultragaz",
        "link": "https://ultragaz.com.br",
        "note": "Tom institucional equilibrado.",
        "whatInspires": "Clareza visual e CTA direto"
      }
    ]
  }
}
```

### 4.3 Persona (UI mínima + campos futuros)

```typescript
interface BriefingPersona {
  id: string;
  name: string;
  description?: string;

  // INT — opcionais; UI futura / IA / formulário externo
  pains?: string[];
  desires?: string[];
  objections?: string[];
  behavior?: string;
  ageRange?: string;
  region?: string;
  photoUrl?: string;
  aiGenerated?: boolean;
}
```

**UI inicial:** `name` + `description` apenas.

```json
{
  "audience": {
    "main": "Donas de casa e pequenos comércios que compram gás recorrente.",
    "painsTags": ["medo de atraso", "preço instável"],
    "desiresTags": ["entrega rápida", "confiança"],
    "objectionsTags": ["será que chega hoje?"],
    "personas": [
      {
        "id": "persona-1",
        "name": "Maria, 42 anos",
        "description": "Mãe, organiza compras da casa, prioriza praticidade.",
        "pains": ["medo de ficar sem gás"],
        "desires": ["entrega no mesmo dia"],
        "objections": ["preço mais caro que concorrente"],
        "behavior": "Compra pelo WhatsApp quando o botijão acaba",
        "photoUrl": null,
        "aiGenerated": false
      }
    ]
  }
}
```

### 4.4 Exemplo completo mínimo (`briefingV2`)

```json
{
  "schemaVersion": 2,
  "updatedAt": "2026-06-01T12:00:00.000Z",
  "strategy": {
    "brandWho": "Distribuidora familiar de gás GLP…",
    "mainServicesTags": ["Gás P13", "Gás P45", "Instalação"],
    "differentiators": "Entrega em até 2h, atendimento humano 7 dias.",
    "perceivedAs": "Confiável, rápida e próxima do bairro.",
    "marketReferences": []
  },
  "audience": {
    "main": "Residências e pequenos comércios locais.",
    "painsTags": ["atraso", "preço"],
    "desiresTags": ["rapidez"],
    "objectionsTags": ["desconfiança de preço"],
    "personas": []
  },
  "communication": {
    "toneOfVoice": "Próximo, direto, sem jargão.",
    "brandWordsTags": ["segurança", "rapidez", "vizinho"],
    "primaryCta": "whatsapp",
    "avoid": "Prometer prazo impossível; tom agressivo."
  },
  "content": {
    "profileObjective": "Ser referência local de confiança.",
    "currentCampaignObjective": "Reforçar entrega expressa no verão.",
    "monthFocus": "Dicas de economia + prova social de entrega.",
    "pillarsTags": ["Dicas", "Bastidores", "Promoções"],
    "strategyNotes": "Evitar posts genéricos de datas comemorativas."
  },
  "planning": {
    "frequency": { "quantity": 3, "period": "week", "variable": false },
    "preferredPostDays": ["mon", "wed", "fri"],
    "operation": {
      "productionLeadDays": 5,
      "approvalLeadDays": 3,
      "schedulingLeadDays": 1,
      "approvalRequired": true,
      "approvalChannel": "whatsapp",
      "clientResponseTime": "up_to_24h"
    }
  },
  "_internal": {
    "brandIdentity": {
      "mission": "…",
      "vision": "…",
      "values": "…"
    },
    "meta": { "migrationVersion": 1 }
  }
}
```

---

## 5. Enums (UI)

### 5.1 CTA principal (`communication.primaryCta`)

| Valor | Label UI |
|-------|----------|
| `schedule_consultation` | Agendar consulta |
| `request_quote` | Solicitar orçamento |
| `whatsapp` | Chamar no WhatsApp |
| `buy` | Comprar |
| `contact` | Entrar em contato |
| `other` | Outro |

**Mapeamento V1 → V2:** tabela a definir na migração (ex.: `Agende` → `schedule_consultation`).

### 5.2 Canal de aprovação (`planning.operation.approvalChannel`)

`whatsapp` · `email` · `trello` · `clickup` · `other`

### 5.3 Prazo médio de resposta (`planning.operation.clientResponseTime`)

`same_day` · `up_to_24h` · `up_to_48h` · `up_to_72h` · `over_72h`

---

## 6. Progresso X/Y (preparado, sem IA)

Utilitário futuro: `lib/clientBriefingProgress.ts`

```typescript
type BriefingBlock = 'strategy' | 'audience' | 'communication' | 'content' | 'planning';

interface BlockProgress {
  filled: number;
  total: number;
  labelKey: string; // i18n
}

function getBriefingBlockProgress(client: Client, block: BriefingBlock): BlockProgress;
```

Exibição na UI: `Estratégia: 3/5 preenchidos` (por bloco).

---

## 7. Consumo downstream (referência)

| Consumidor | Campos V2 prioritários | Fallback LEG |
|------------|------------------------|--------------|
| Calendário / previsões | `planning.frequency`, `planning.preferredPostDays` | `postFrequency*` |
| Marcos operacionais | `planning.operation.*LeadDays` | `planning*LeadDays` |
| `clientContext.ts` | `content.pillarsTags`, `content.monthFocus` | pilares V1 |
| IA futura | `_internal.brandIdentity`, personas completas, `marketReferences` | V1 raiz |
| Formulário externo | `briefingV2` inteiro | — |

---

## 8. O que **não** muda nesta reestruturação

- Aba **Identidade visual** (`brandColors`, `typography`, `brandAssets`)
- Aba **Dados do cliente** (fiscal, contatos, redes)
- Aba **Contrato** / **Financeiro**
- Página **Calendário Editorial**
- Lógica interna da **Central Inteligente**
- `clientOwnerPreferencesJson` (responsáveis por etapa)

---

## 9. Próximos passos de implementação

1. Tipos TypeScript `BriefingV2` em `types.ts`
2. `normalizeClient()` — ler `briefingV2` + fallback V1
3. `handleSaveClient()` — escrever `briefingV2` + sync LEG opcional
4. Script `migrate-client-briefing-v2`
5. UI: 5 editores flat (sem acordeão interno)
6. `clientBriefingProgress.ts`

---

## 10. Histórico

| Data | Versão doc | Notas |
|------|------------|-------|
| 2026-06-01 | 1.0 | Schema inicial pós-auditoria Prompt A |
| 2026-06-01 | 1.1 | Roadmap de consumo dos dados (referência funcional de produto) |

---

## 11. Roadmap de consumo dos dados

Objetivo desta seção: transformar o schema em **referência funcional de produto** — mapeando **onde cada campo será usado** (hoje, em construção ou futuro).

**Legenda de status**

| Status | Significado |
|--------|-------------|
| **Hoje** | Já consumido por módulo existente |
| **Sprint A+** | Previsto na reestruturação de cadastros / normalização V2 |
| **Fase 6+** | Wizard, calendário ou operação editorial |
| **Futuro** | IA, benchmark, automações — ainda não implementado |

---

### 11.1 Tabela geral — campo → módulo futuro

| Campo (chave V2) | Onde será usado | Status |
|------------------|-----------------|--------|
| `strategy.brandWho` | IA de conteúdo, Wizard Planejar cliente, copy de posts | Sprint A+ / Fase 6+ |
| `_internal.brandIdentity.mission` | IA de conteúdo, alinhamento estratégico de pautas | Futuro |
| `_internal.brandIdentity.vision` | IA de conteúdo, direcionamento de campanhas | Futuro |
| `_internal.brandIdentity.values` | IA de conteúdo, filtros de tom e mensagem | Futuro |
| `_internal.brandIdentity.history` | IA de conteúdo, storytelling e pautas institucionais | Futuro |
| `_internal.brandIdentity.aiSummary` | IA de conteúdo, contexto compacto para prompts | Futuro |
| `strategy.mainServicesTags` | IA de pautas, sugestões por linha de produto/serviço | Futuro |
| `strategy.differentiators` | IA de conteúdo, argumentos de venda em posts | Futuro |
| `strategy.perceivedAs` | IA de conteúdo, consistência de posicionamento | Futuro |
| `strategy.marketReferences` | Benchmark e inteligência | Futuro |
| `strategy.marketReferences.type` | Benchmark automático (concorrente vs inspiração) | Futuro |
| `strategy.marketReferences.strengths` / `weaknesses` | Análise competitiva, gaps de conteúdo | Futuro |
| `strategy.marketReferences.whatInspires` | Referências criativas, moodboard de comunicação | Futuro |
| `audience.main` | IA de pautas, segmentação de mensagens | Futuro |
| `audience.painsTags` | Sugestão de pautas, ganchos emocionais | Futuro |
| `audience.desiresTags` | Sugestão de pautas, CTAs e promessas | Futuro |
| `audience.objectionsTags` | Roteiros de conteúdo educativo / quebra de objeção | Futuro |
| `audience.personas[]` | IA de conteúdo, calendário por persona | Futuro |
| `audience.personas[].pains` | Sugestão de pautas por persona | Futuro |
| `audience.personas[].desires` | Temas e ângulos por persona | Futuro |
| `audience.personas[].objections` | Conteúdo de conversão / FAQ | Futuro |
| `audience.personas[].behavior` | Formato e canal sugerido (Reels, carrossel, etc.) | Futuro |
| `_internal.audience.ageRange` / `region` | Segmentação avançada, ads (futuro) | Futuro |
| `communication.toneOfVoice` | IA de conteúdo, revisão de copy | Futuro |
| `communication.brandWordsTags` | IA de conteúdo, vocabulário permitido | Futuro |
| `communication.primaryCta` | Posts, legendas, calendário (CTA padrão) | Futuro / parcial hoje |
| `communication.avoid` | IA de conteúdo, guardrails de geração | Futuro |
| `_internal.communication.wordsToAvoidTags` | IA de conteúdo, lista negativa | Futuro |
| `_internal.communication.contentStyle` | Formato visual/textual sugerido | Futuro |
| `content.profileObjective` | Planejamento de conteúdo, metas de perfil | Fase 6+ |
| `content.currentCampaignObjective` | Planejamento de conteúdo, campanha vigente | Fase 6+ |
| `content.monthFocus` | Calendário editorial, Wizard, Central (contexto) | **Hoje** / Fase 6+ |
| `content.pillarsTags` | Geração automática de calendário, distribuição de temas | **Hoje** / Futuro |
| `content.strategyNotes` | IA de pautas, restrições editoriais | Futuro |
| `_internal.content.pillarsDetailed` | IA de conteúdo, temas exemplo por pilar | Futuro |
| `_internal.content.kpis` | Dashboard de performance, metas numéricas | Futuro |
| `planning.frequency.*` | Previsões, meta do período, quota | **Hoje** |
| `planning.preferredPostDays` | Geração de previsões, slots sugeridos | **Hoje** |
| `planning.operation.productionLeadDays` | Planejamento recomendado (marco produção) | **Hoje** |
| `planning.operation.approvalLeadDays` | Planejamento recomendado (marco aprovação) | **Hoje** |
| `planning.operation.schedulingLeadDays` | Planejamento recomendado (marco agendamento) | **Hoje** |
| `planning.operation.approvalRequired` | Fluxo Posts, bloqueios de publicação | **Hoje** / Futuro |
| `planning.operation.approvalChannel` | Alertas operacionais, lembretes ao cliente | Futuro |
| `planning.operation.clientResponseTime` | Alertas operacionais, SLA de aprovação | Futuro |
| `clientOwnerPreferencesJson` | Responsáveis por etapa, Agenda, Tarefas | **Hoje** |
| `_internal.planning.calendarNotes` | Notas no Wizard / calendário | Futuro |
| `_internal.meta.externalFormSubmissionId` | Formulário externo do cliente | Futuro |

---

### 11.2 Planejamento de conteúdo

Módulos: **Calendário Editorial**, **Wizard Planejar cliente**, **Posts**, **Agenda**, **Central Inteligente** (builders existentes).

| Uso | Campos que alimentam | Status |
|-----|----------------------|--------|
| **Metas** | `planning.frequency.quantity`, `planning.frequency.period`, `planning.frequency.variable` | **Hoje** |
| **Metas (contexto)** | `content.profileObjective`, `content.currentCampaignObjective`, `_internal.content.kpis` | Fase 6+ / Futuro |
| **Previsões** | `planning.frequency.*`, `planning.preferredPostDays` | **Hoje** |
| **Cronograma** | `planning.preferredPostDays`, `content.monthFocus`, `content.pillarsTags` | **Hoje** (parcial) / Fase 6+ |
| **Calendário** | `planning.frequency.*`, `planning.preferredPostDays`, marcos `planning.operation.*LeadDays` | **Hoje** |
| **Completude do briefing** | progresso X/Y por bloco (`lib/clientBriefingProgress.ts`) | Sprint A+ |
| **Wizard (passo 1–3)** | `strategy.brandWho`, `planning.frequency.*`, `planning.preferredPostDays` | Fase 6+ |

---

### 11.3 IA de conteúdo (futuro)

Módulo ainda **não implementado**. Campos listados são a **fonte oficial** para prompts, RAG e automações.

| Uso | Campos que alimentarão |
|-----|------------------------|
| **Geração de pautas** | `strategy.brandWho`, `_internal.brandIdentity.*`, `audience.main`, `audience.painsTags`, `audience.desiresTags`, `content.strategyNotes`, `communication.toneOfVoice`, `communication.avoid` |
| **Sugestões de temas** | `content.monthFocus`, `content.currentCampaignObjective`, `audience.personas[]`, `strategy.mainServicesTags`, `strategy.differentiators` |
| **Distribuição de pilares** | `content.pillarsTags`, `_internal.content.pillarsDetailed`, `planning.frequency.*` |
| **Calendário automático** | `content.pillarsTags`, `planning.preferredPostDays`, `planning.frequency.*`, `content.monthFocus`, `communication.primaryCta` |
| **Revisão / guardrails** | `communication.brandWordsTags`, `_internal.communication.wordsToAvoidTags`, `communication.avoid`, `strategy.perceivedAs` |
| **Contexto compacto (prompt)** | `_internal.brandIdentity.aiSummary` |

---

### 11.4 Benchmark e inteligência (futuro)

Módulo ainda **não implementado**. Complementa (não substitui) a Central Inteligente de planejamento.

| Uso | Campos que alimentarão |
|-----|------------------------|
| **Referências de mercado** | `strategy.marketReferences[]` (nome, link, note) |
| **Concorrentes** | `strategy.marketReferences` onde `type === 'competitor'`, campos INT `strengths`, `weaknesses` |
| **Inspirações** | `strategy.marketReferences` onde `type === 'inspiration'`, campo INT `whatInspires` |
| **Benchmark automático** | `marketReferences.type`, `marketReferences.link`, cruzamento com `strategy.differentiators` e `strategy.perceivedAs` |
| **Alertas de posicionamento** | gaps entre `perceivedAs` desejado e análise de referências (futuro) |

---

### 11.5 Operação (futuro + parcial hoje)

Módulos: **Agenda**, **Tarefas**, **Posts**, **Central Inteligente**, marcos operacionais.

| Uso | Campos que alimentarão | Status |
|-----|------------------------|--------|
| **Alertas de prazo** | `planning.operation.*LeadDays` vs datas de publicação | **Hoje** (marcos recomendados) |
| **Alertas de SLA** | `planning.operation.clientResponseTime`, `planning.operation.approvalRequired` | Futuro |
| **Canal de aprovação** | `planning.operation.approvalChannel` | Futuro |
| **Aprovações pendentes** | `planning.operation.approvalRequired`, status em Posts | **Hoje** (parcial) |
| **Acompanhamento da equipe** | `clientOwnerPreferencesJson`, `planning.operation.productionLeadDays` | **Hoje** |
| **Lacunas de planejamento** | `planning.frequency.*` vs itens no calendário | **Hoje** (Central / KPIs) |
| **Notas operacionais** | `_internal.planning.calendarNotes`, `_internal.planning.operationNotes` | Futuro |

---

### 11.6 Formulário externo (futuro)

O formulário preenchido pelo **próprio cliente** usará o **mesmo JSON** `briefingV2`:

| Superfície UI externa | Subconjunto V2 exposto |
|-----------------------|-------------------------|
| Essência da marca | `strategy.brandWho`, `strategy.mainServicesTags`, `strategy.differentiators`, `strategy.perceivedAs` |
| Público | `audience.main`, tags de dores/desejos/objeções |
| Comunicação | `communication.toneOfVoice`, `communication.primaryCta`, `communication.avoid` |
| Conteúdo | `content.profileObjective`, `content.currentCampaignObjective`, `content.monthFocus`, `content.pillarsTags` |
| Planejamento | `planning.frequency.*`, `planning.preferredPostDays`, preferências de aprovação |

Campos **INT** (`mission`, `vision`, `values`, personas completas) podem ser enriquecidos depois pela agência ou por IA — sem exigir do cliente no formulário inicial.

---

### 11.7 Princípio de consumo

1. **UI simples → modelo rico:** a operação preenche pouco; IA e automações leem também `_internal`.
2. **Dual-read durante transição:** consumidores atuais continuam com fallback LEG até migrarem para V2.
3. **Um cadastro, vários módulos:** nenhum módulo deve duplicar briefing em JSON paralelo.
4. **Calendário Editorial não duplica briefing:** consome `planning.*` e `content.monthFocus` / `pillarsTags`; não re-cadastra estratégia na tela do calendário.

