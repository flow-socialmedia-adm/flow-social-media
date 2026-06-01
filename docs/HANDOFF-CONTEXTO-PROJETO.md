# Flow Social Media — Documento de contexto e handoff

**Objetivo:** abrir este arquivo em um novo chat, nova pasta ou novo repositório e recuperar o estado do projeto sem depender do histórico anterior do Cursor.

**Última atualização:** junho/2026  
**Pasta oficial:** `C:\Users\mari_\Projects\flow-social-media`  
**Branch principal:** `master` @ commit `ce7302a` (commit inicial deste repositório)  
**GitHub (atual):** https://github.com/flow-socialmedia-adm/flow-social-media  
**Remote SSH:** `git@github-flow:flow-socialmedia-adm/flow-social-media.git`  
**Git local (este repo):** `Flow Social Media` &lt;flowsocialmedia.adm@gmail.com&gt;

> **Histórico:** o código MVP foi desenvolvido antes no repositório `maevetheron-hash/flow-erp` (checkpoint `fa68cb7`). Esse repositório é apenas **referência/backup** — não é a origem atual de commits nem push.

---

## 1. O que é o sistema

**Flow Social Media** (produto; em partes do código/docs ainda aparece o nome legado *Flow ERP*) é um ERP/CRM para **agências de mídia social e freelancers**. Centraliza:

- Cadastro e estratégia de **clientes** (brand guide, frequência de posts, pilares, contratos)
- **Calendário Editorial** (planejamento mensal/semanal, previsões e posts)
- **Posts** (Kanban de produção: pauta → publicação)
- **Tarefas** gerais da agência
- **Agenda** unificada (posts + tarefas + previsões)
- **Financeiro**, **equipe**, **permissões**, **assinaturas** (Stripe)
- **Central Inteligente** — painel de insights operacionais (origem → mensagem → ação opcional), sem engine de IA pesada no MVP

**Modelo de dados central:** quase tudo operacional vive em **`Task`** (Prisma). Previsão de post e post real são o **mesmo registro**, diferenciados por campos (`category`, `postType`, `bornAsForecast`, `convertedToPostAt`).

---

## 2. Stack e estrutura de pastas

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 19 + Vite 6 + TypeScript |
| Backend | NestJS + Prisma |
| Banco | PostgreSQL (Docker `flow-erp-postgres`) |
| Auth | JWT access + refresh, Google OAuth opcional |
| i18n | `lib/i18n.ts` (pt / en / es) |

```
C:\Users\mari_\Projects\flow-social-media\
├── App.tsx                 # Shell, rotas por `page`, AppContext
├── components/             # Páginas e UI (PlanningPage, AgendaPage, ProducaoPage…)
├── contexts/               # AppContext, AuthContext, AgencyClientsRosterContext
├── lib/                    # Lógica compartilhada (API, insights, quotas, utils)
├── apps/api/               # API NestJS
├── prisma/                 # schema + migrations
├── docs/                   # Auditorias, regras MVP, este handoff
├── start.bat / start.ps1   # Subir Docker + API + frontend
└── flow_backup.sql         # Backup local — NÃO vai pro Git (ver §8)
```

---

## 3. Como rodar e acessar (desenvolvimento)

### Pré-requisitos

- Node.js 20+
- Docker Desktop
- Windows: `start.bat` ou `.\start.ps1` (na pasta oficial acima)

### URLs padrão

| Serviço | URL |
|---------|-----|
| **Frontend** | http://localhost:5173 |
| **API** | http://localhost:3000 |
| **Swagger** | http://localhost:3000/api |
| **Health** | http://localhost:3000/health |

### Variáveis de ambiente (não versionadas)

| Exemplo versionado | Criar localmente |
|--------------------|------------------|
| `apps/api/.env.example` | `apps/api/.env` |
| `prisma/.env.example` | `prisma/.env` |
| — | `.env.local` na **raiz** (Vite): `VITE_API_URL=http://localhost:3000` |

**Obrigatório na API:** `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` (mín. 16 caracteres).  
**Postgres padrão (docker):** `postgresql://flow:flow@localhost:5432/flow`

### Migrations

```powershell
cd apps/api
npx prisma migrate deploy --schema ../../prisma/schema.prisma
```

---

## 4. Módulos do produto (páginas)

Definido em `types.ts` → `Page` e sidebar:

| `page` | UI | Módulo permissão |
|--------|-----|------------------|
| `dashboard` | Dashboard | insights agregados |
| `planejamento` | **Calendário Editorial** | `planning` |
| `producao` | **Posts** (Kanban) | `posts` |
| `tarefas` | Tarefas gerais | `tasks` |
| `agenda` | Agenda | `agenda` |
| `clients` | Clientes | `clients` |
| `finance` | Financeiro | `financial` |
| `settings` / `account` | Configurações / conta | `settings` |

Permissões por papel: `apps/api/src/common/permissions/agency-module-keys.ts` ↔ `lib/modulePermissions.ts` (`none` | `view` | `edit`).

**Perfis:** modo agência SOLO vs TEAM, perfil operacional (redireciona para Posts), papéis customizáveis com módulos.

---

## 5. O que foi construído / ajustado no MVP (cronologia resumida)

O MVP abaixo veio do desenvolvimento anterior (repositório legado) e está presente no código deste repositório a partir de `ce7302a`.

### 5.1 Central Inteligente e confiança nos dados

- Componente **`IntelligentCentral.tsx`** — carrossel de insights
- Builders em **`lib/intelligentCentral.ts`**: `buildPlanningIntelligenceItems`, `buildAgendaIntelligenceItems`, `buildPostsIntelligenceItems`, `buildTasksIntelligenceItems`, `buildDashboardIntelligenceItems`
- **Regras oficiais:** `docs/MVP-INTELLIGENCE-RULES.md`
- **Auditoria de fontes:** `docs/AUDIT-MVP-INTELLIGENCE-PLANNING-SOURCE.md`
- Agenda: insights só no **período visível**; aviso de atrasos fora do período **sem** destaque automático
- Posts/Tarefas: contagens **globais** via `GET /tasks/summary` (`lib/usePostsGlobalSummary.ts`, `lib/useTasksGlobalSummary.ts`)

### 5.2 Planejamento → Calendário → Posts (Fase 5)

- **Auditoria:** `docs/AUDIT-MVP-PHASE5-PLANNING-CALENDAR-POSTS.md`
- **Consumo de previsão:** ao criar post real (`POST /tasks`) no mesmo cliente + data, a API **converte** a previsão existente (mantém `id`, histórico `convert_forecast`) — não deleta
- **Quota unificada:** `lib/planningQuota.ts`
- **Posts:** Kanban só posts reais (`isRealPostFlowTask` em `ProducaoPage`)
- Implementação API: `apps/api/src/tasks/tasks.service.ts` (`findConsumableForecast`, `convertForecastWithCreatePayload`)

### 5.3 UX Calendário Editorial (Fase 5.1)

- Abre em **Mensal**; botões **Mensal (resumo)** → **Semanal**
- Filtro **Cliente** no subtoolbar (antes dos toggles de view)
- Central contextual: **`lib/planningCentralView.ts`** (Agência agregada vs cliente específico)
- Células mensais: badges separados **posts** vs **previsões**
- Período explícito: `01/06/2026 até 30/06/2026`
- KPIs com escopo **(Agência)** ou **(Cliente)**
- Insights informativos (5/6 semanas) **sem** CTA “Revisar planejamento”

### 5.4 Marcos operacionais (Fase 5.2 — UI)

- **`lib/operationalMilestones.ts`** — cálculo produção / aprovação / agendamento (offsets do cadastro do cliente)
- Exibição em: Calendário Editorial, modal post/previsão, Agenda
- Ver também: `docs/MVP-PHASE52-INTEGRATION-POINTS.md`

### 5.5 Checkpoint legado (repositório antigo — só histórico)

- Repositório **`maevetheron-hash/flow-erp`**, commit **`fa68cb7`**: *Checkpoint antes da reorganização do Flow*
- Não usar esse remote para push; manter apenas como backup/referência se necessário

### 5.6 Outras entregas relevantes

- Cliente: seções Brand Guide, Estratégia, Planejamento, identidade, contratos
- Workflow de posts linear (pauta → produção → aprovação → agendamento → publicação)
- Histórico de status (`TaskStatusHistoryModal`)
- Convites de equipe, reset de senha, uploads, owner por etapa
- Destaque visual na Agenda (`lib/agendaHighlight.ts`)

---

## 6. Padrões de backend

### API (NestJS)

- **Contexto de request:** `RequestContextService` (agencyId, userId)
- **Permissões:** `ModuleAccessService`, guards, `task-module-access.ts` (previsão = módulo `planning`, post = `posts`)
- **Tasks:** `tasks.controller.ts` / `tasks.service.ts` — CRUD, `move-status`, **`summary`** (contagens globais posts/tarefas)
- **Conversão previsão → post:** no `update` e no `create` (consumo de slot)
- **Posts reais em queries agregadas:** `realPostBaseWhere` exclui `category=forecast` / `bornAsForecast`
- **DTOs:** `apps/api/src/tasks/dto/`
- **Migrations:** sempre em `prisma/migrations/`

### Convenções

- Datas de post: `publishDate` + `date` alinhados
- `changeSource` em histórico: `create`, `update`, `convert_forecast`, etc. (`task-status-change-source.ts`)
- Não commitar `.env` reais nem backups SQL

---

## 7. Padrões de frontend

### Estado global

- **`AppContext`:** tasks, clients, workflows, `setPage`, permissões, toasts, idioma
- **`AuthContext`:** login, tokens, refresh automático
- **`AgencyClientsRosterContext`:** roster de clientes para Agenda/insights

### API client

- **`lib/api.ts`:** `apiGet`, `apiPost`, `apiPut`, `apiPatch` com `VITE_API_URL`
- Mapeamento API → UI: **`lib/mapApiTaskToTask.ts`**

### Lógica de domínio (preferir reutilizar)

| Arquivo | Uso |
|---------|-----|
| `lib/intelligentCentral.ts` | Builders de insights |
| `lib/planningQuota.ts` | Meta mensal / alerta de excesso |
| `lib/planningCentralView.ts` | Escopo Agência vs cliente na Central do planejamento |
| `lib/operationalMilestones.ts` | Marcos produção / aprovação / agendamento |
| `lib/clientContext.ts` | Perfil de planejamento do cliente |
| `lib/taskActionFlow.ts` | `isRealPostFlowTask`, fluxo linear de post |
| `lib/postForecastVisual.ts` | `isPostForecast` |
| `lib/utils.ts` | `getExpectedForWeek`, `computeForecastDatesToCreate`, calendário |
| `lib/i18n.ts` | Todas as strings UI |

### Páginas principais

| Arquivo | Responsabilidade |
|---------|------------------|
| `components/PlanningPage.tsx` | Calendário Editorial |
| `components/ProducaoPage.tsx` | Posts Kanban |
| `components/TarefasPage.tsx` | Tarefas gerais |
| `components/AgendaPage.tsx` | Agenda |
| `components/DashboardPage.tsx` | Dashboard |
| `components/PostOrForecastModal.tsx` | Modal unificado post/previsão/tarefa |
| `components/clients/ClientDetail.tsx` | Ficha do cliente |

### Navegação entre módulos

- Abrir post no Kanban a partir do planejamento: `localStorage` chave `flow_posts_edit_target_task_id`

---

## 8. Estilos visuais (UI)

### Faixa roxa de cabeçalho (páginas operacionais)

Definido em **`lib/contentPageHeader.ts`**:

- Gradiente: `from-indigo-500 to-purple-600`
- Largura máxima conteúdo: **`max-w-[1400px]`** (`CONTENT_PAGE_LAYOUT_LANE`)
- Altura padrão header: ~`6.75rem` / `7.5rem` (sm+)
- Botões no header: classes `HEADER_GRADIENT_*`, `SUBTOOLBAR_VIEW_ACTIVE_CLASS` / `INACTIVE`

### Componentes visuais recorrentes

- **Previsão:** borda tracejada, slate, badge “PREVISÃO” na Agenda
- **Post:** borda colorida por status (`lib/postStatusBorder.ts`, cores do workflow)
- **Central Inteligente:** card gradiente roxo/indigo, carrossel, origem + contexto + mensagem
- **KPIs:** cards arredondados `rounded-xl` com bordas coloridas (indigo, violet, amber)
- **Dark mode:** classes `dark:` em Tailwind no projeto

### Referência de página

- **Tarefas** é referência de padding do header (`CONTENT_PAGE_HEADER_PAD_Y_TASKS_REFERENCE`)

---

## 9. Git, branches e checkpoint

### Repositório remoto (atual)

```
origin  git@github-flow:flow-socialmedia-adm/flow-social-media.git
```

| Item | Valor |
|------|--------|
| Organização / repo | `flow-socialmedia-adm/flow-social-media` |
| Branch padrão | **`master`** (não `main`) |
| SSH | Host alias **`github-flow`** → chave `id_ed25519_flow` |
| Identidade **local** (só neste repo) | `user.name=Flow Social Media`, `user.email=flowsocialmedia.adm@gmail.com` |

### Commit inicial deste repositório

```
ce7302a Versão inicial do Flow Social Media
```

### Histórico legado (não é origem atual)

Repositório anterior: **`maevetheron-hash/flow-erp`** — uso apenas como backup/referência.

```
fa68cb7 Checkpoint antes da reorganização do Flow   # último checkpoint conhecido no repo antigo
ae5c318 feat(mvp): reorganize editorial calendar UX (phase 5.1)
862fb2e feat(mvp): connect planning forecasts to real post creation
…
```

Branches de feature do período legado (referência): `feature/mvp-editorial-calendar-ux-5.1`, `feature/mvp-planning-calendar-posts-connection`, etc.

### Verificar configuração (PowerShell, na pasta oficial)

```powershell
cd C:\Users\mari_\Projects\flow-social-media
git remote -v
git branch -vv
git config --local user.name
git config --local user.email
git fetch origin
ssh -T git@github-flow
```

### Ao mudar máquina ou clonar de novo

1. Clone: `git clone git@github-flow:flow-socialmedia-adm/flow-social-media.git`
2. Pasta recomendada: `C:\Users\mari_\Projects\flow-social-media`
3. Confirme identidade local: `git config user.name "Flow Social Media"` e `git config user.email "flowsocialmedia.adm@gmail.com"` **dentro do repo**
4. Não commite `.env` nem `flow_backup.sql`

---

## 10. Backups e o que NÃO versionar

| Item | Onde | No Git? |
|------|------|---------|
| **Código + migrations** | GitHub `flow-socialmedia-adm/flow-social-media` @ `master` | Sim |
| **Backup SQL** | `flow_backup.sql` na raiz do projeto | **Não** (`.gitignore`) |
| **Secrets** | `apps/api/.env`, `prisma/.env`, `.env.local` | **Não** |
| **Uploads locais** | `apps/api/uploads/` (se usado) | Parcial (`.gitkeep`) |

**Recomendação:** copie `flow_backup.sql` para nuvem ou HD externo antes de trocar de máquina.

**Restaurar banco (exemplo):**

```powershell
docker exec -i flow-erp-postgres psql -U flow -d flow < flow_backup.sql
```

(Ajuste comando conforme seu dump — pg_restore vs psql depende do formato do arquivo.)

---

## 11. Documentação interna (ler nesta ordem)

| Arquivo | Conteúdo |
|---------|----------|
| **Este arquivo** | Visão geral handoff |
| `docs/MVP-INTELLIGENCE-RULES.md` | Regras da Central Inteligente |
| `docs/AUDIT-MVP-PHASE5-PLANNING-CALENDAR-POSTS.md` | Fluxo planejamento ↔ posts |
| `docs/MVP-PHASE52-INTEGRATION-POINTS.md` | Marcos operacionais (integração) |
| `docs/AUDIT-MVP-INTELLIGENCE-PLANNING-SOURCE.md` | Auditoria de dados dos insights |
| `docs/MVP-DIAGNOSTICO-BASE.md` | Diagnóstico geral MVP |
| `README.md` | Instalação e comandos |

---

## 12. Próximos passos sugeridos

### Central Inteligente — marcos operacionais

Insights do tipo “produção deveria ter iniciado” na Central: só após regras de negócio fechadas (`lib/intelligentCentral.ts`).

### Melhorias técnicas conhecidas

- Central/Agenda: alguns insights dependem do **range de tasks carregado** na página
- Aviso “atrasos fora do período” na Agenda usa só dados em memória
- Unificar ainda mais “quota do período” se surgir drift entre modal e geração em lote
- `Task` sem `createdAt` no schema — ordem de consumo de previsão usa `id`

### Fora do escopo MVP atual

- IA generativa de pauta/legenda
- Engine de automações complexas
- Histórico dedicado de planejamento
- Alterar layout global estabilizado sem pedido explícito

### Reorganização (conta / pasta / GitHub)

- [x] Nome do projeto: **Flow Social Media**
- [x] Pasta oficial: `C:\Users\mari_\Projects\flow-social-media`
- [x] Repositório GitHub: `flow-socialmedia-adm/flow-social-media`
- [x] Remote SSH `github-flow` + e-mail Git local do projeto
- [ ] Renomear strings legadas “Flow ERP” na UI/docs (opcional, gradual)
- [ ] Copiar `flow_backup.sql` e `.env` para local seguro em cada máquina nova

---

## 13. Prompt sugerido para novo chat no Cursor

Cole algo assim:

```
Estou continuando o Flow Social Media. Leia primeiro docs/HANDOFF-CONTEXTO-PROJETO.md.
Pasta: C:\Users\mari_\Projects\flow-social-media
Branch principal: master. Commit de referência: ce7302a.
GitHub: flow-socialmedia-adm/flow-social-media (SSH github-flow).
Não alterar backend/regras de previsão/quota/Central builders sem pedido explícito.
```

---

## 14. Conta e acesso (preencher localmente — não commitar)

_Use este bloco só na sua máquina; pode apagar senhas antes de qualquer push._

| Item | Valor |
|------|--------|
| GitHub (atual) | `flow-socialmedia-adm/flow-social-media` |
| GitHub (legado / backup) | `maevetheron-hash/flow-erp` |
| E-mail Git (este repo) | `flowsocialmedia.adm@gmail.com` |
| Pasta oficial | `C:\Users\mari_\Projects\flow-social-media` |
| Pasta legada | `C:\Users\mari_\Documents\Projetos\Flow ERP` |
| Usuário admin dev | __________________________ |
| Stripe / produção | __________________________ |

---

*Documento atualizado após migração para o repositório Flow Social Media (`ce7302a`).*
