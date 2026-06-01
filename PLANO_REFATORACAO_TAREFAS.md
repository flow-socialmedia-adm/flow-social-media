# 📋 PLANO DE REFATORAÇÃO - SISTEMA DE TAREFAS/POSTS

**Data de Criação**: 15/01/2026  
**Versão Base**: v1.0.5  
**Objetivo**: Refatorar sistema de tarefas para uso simples e intuitivo, com workflows fixos e onboarding progressivo

---

## 🎯 OBJETIVO GERAL

Refatorar o sistema de tarefas/posts para:
- ✅ Tornar o uso simples e intuitivo para agências e pequenas agências
- ✅ Implementar status fixos + ações pendentes para POSTS
- ✅ Manter tarefas gerais com fluxo simples
- ✅ Introduzir responsável (owner) com modo SOLO vs TEAM
- ✅ Implementar onboarding progressivo em camadas (setup + tour + tarefas)
- ✅ **Sem quebrar o código atual e sem retrabalho futuro**

---

## 📊 ANÁLISE DA ESTRUTURA ATUAL

### Banco de Dados (Prisma)
- ✅ `Agency`: possui campos básicos, falta `mode`, `onboardingCompleted`, `showGuidedTour`, `hasSeenHomeTour`
- ✅ `User`: falta `hasSeenTasksOnboarding`
- ✅ `Task`: falta `ownerUserId` (opcional)
- ✅ `Workflow`: estrutura OK, mas precisa garantir workflows fixos

### Backend
- ✅ `/auth/me`: retorna dados do usuário, precisa incluir `agencyMode` e flags de onboarding
- ✅ `/agencies/me`: retorna dados da agência, precisa incluir novos campos
- ✅ `WorkflowsService`: cria workflows padrão, precisa garantir workflows fixos
- ✅ `TasksService`: precisa adicionar lógica de `ownerUserId` e validação de ações

### Frontend
- ✅ `AuthContext`: consome `/auth/me`, precisa estender tipo `User`
- ✅ `App.tsx`: gerencia `agencyProfile`, precisa incluir novos campos
- ✅ `AgendaPage.tsx`: gerencia tarefas, precisa adaptar para workflows fixos e ações
- ✅ `SettingsPage.tsx`: gerencia workflows, precisa desabilitar edição

---

## 🗺️ PLANO DE IMPLEMENTAÇÃO - ETAPAS

---

## 📦 ETAPA 1: MIGRAÇÃO DO BANCO DE DADOS

### 1.1 Adicionar Enum `AgencyMode`
**Arquivo**: `prisma/schema.prisma`

```prisma
enum AgencyMode {
  SOLO
  TEAM
}
```

### 1.2 Adicionar Campos em `Agency`
**Arquivo**: `prisma/schema.prisma`

```prisma
model Agency {
  // ... campos existentes ...
  
  // Novo: Modo da agência
  mode                AgencyMode?         @default(SOLO)
  
  // Novo: Flags de onboarding
  onboardingCompleted Boolean             @default(false)
  showGuidedTour      Boolean             @default(true)
  hasSeenHomeTour     Boolean             @default(false)
  
  // ... resto dos campos ...
}
```

### 1.3 Adicionar Campo em `User`
**Arquivo**: `prisma/schema.prisma`

```prisma
model User {
  // ... campos existentes ...
  
  // Novo: Flag de onboarding de tarefas
  hasSeenTasksOnboarding Boolean          @default(false)
  
  // ... resto dos campos ...
}
```

### 1.4 Adicionar Campo em `Task`
**Arquivo**: `prisma/schema.prisma`

```prisma
model Task {
  // ... campos existentes ...
  
  // Novo: Responsável (opcional)
  ownerUserId         String?
  
  // ... resto dos campos ...
}
```

### 1.5 Criar Migration
**Comando**: `npx prisma migrate dev --name add_onboarding_and_mode_fields`

### 1.6 Atualizar Prisma Client
**Comando**: `npx prisma generate`

**Riscos**:
- ⚠️ **MÉDIO**: Migração pode falhar se houver dados inconsistentes
- ⚠️ **BAIXO**: Campos opcionais com defaults seguros

**Dependências**:
- ✅ Nenhuma - primeira etapa

**Validação**:
- ✅ Migration executada com sucesso
- ✅ Prisma Client gerado
- ✅ Campos aparecem no schema

---

## 🔧 ETAPA 2: BACKEND - ESTENDER ENDPOINTS DE AUTENTICAÇÃO

### 2.1 Estender `AuthService.me()`
**Arquivo**: `apps/api/src/auth/auth.service.ts`

**Mudanças**:
- Buscar dados da agência junto com o usuário
- Incluir `agencyMode` e flags de onboarding no retorno
- Incluir `hasSeenTasksOnboarding` do usuário

**Retorno esperado**:
```typescript
{
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  role: 'owner' | 'admin' | 'editor';
  permissions: string[];
  agencyId: string;
  agencyMode: 'SOLO' | 'TEAM';
  hasSeenTasksOnboarding: boolean;
  onboarding: {
    completed: boolean;
    showGuidedTour: boolean;
    hasSeenHomeTour: boolean;
  };
}
```

### 2.2 Estender `AuthService.me()` para Incluir Dados da Agência
**Arquivo**: `apps/api/src/auth/auth.service.ts`

**Mudanças**:
- Fazer join com `Agency` para buscar `mode`, `onboardingCompleted`, `showGuidedTour`, `hasSeenHomeTour`
- Incluir esses campos no retorno de `/auth/me`
- **NOTA**: Não criar novos endpoints nesta fase, apenas estender `/auth/me`

**Riscos**:
- ⚠️ **BAIXO**: Mudança de contrato do `/auth/me` pode quebrar frontend se não atualizado simultaneamente
- ⚠️ **BAIXO**: Campos opcionais mantêm compatibilidade

**Dependências**:
- ✅ ETAPA 1 concluída (campos no banco)

**Validação**:
- ✅ `/auth/me` retorna novos campos
- ✅ `/agencies/me` retorna novos campos
- ✅ Endpoints de atualização funcionam

---

## 🔒 ETAPA 3: BACKEND - WORKFLOWS FIXOS

### 3.1 Definir Workflows Fixos de POSTS
**Arquivo**: `apps/api/src/workflows/workflows.service.ts`

**Status fixos de POSTS** (IDs estáveis):
```typescript
const POSTS_FIXED_STATUSES = [
  { id: 'pauta_criada', name: 'Pauta Criada', color: 'purple', order: 1 },
  { id: 'em_producao', name: 'Em Produção', color: 'blue', order: 2 },
  { id: 'aguardando_aprovacao', name: 'Aguardando Aprovação', color: 'amber', order: 3 },
  { id: 'aprovado', name: 'Aprovado', color: 'green', order: 4 },
  { id: 'agendado', name: 'Agendado', color: 'cyan', order: 5 },
  { id: 'publicado', name: 'Publicado', color: 'emerald', order: 6 },
];
```

### 3.2 Definir Workflows Fixos de Tarefas Gerais
**Arquivo**: `apps/api/src/workflows/workflows.service.ts`

**Status fixos de Tarefas Gerais** (apenas 3, sem ações):
```typescript
const GENERAL_FIXED_STATUSES = [
  { id: 'a_fazer', name: 'A Fazer', color: 'gray', order: 1 },
  { id: 'em_andamento', name: 'Em Andamento', color: 'blue', order: 2 },
  { id: 'concluido', name: 'Concluído', color: 'green', order: 3 },
];
```

**IMPORTANTE**: Tarefas Gerais NÃO têm ações pendentes, NÃO têm endpoint de ação. Apenas POSTS usam `post-action`.

### 3.3 Modificar `ensureDefaults()`
**Arquivo**: `apps/api/src/workflows/workflows.service.ts`

**Mudanças**:
- Criar workflow fixo de POSTS com IDs estáveis
- Criar workflow fixo de Tarefas Gerais com IDs estáveis
- Adicionar flag `isFixed: true` no `statusesJson` (ou usar `isCustom: false`)

### 3.4 Criar Método para Buscar Workflow Fixo
**Arquivo**: `apps/api/src/workflows/workflows.service.ts`

**Novo método**: `getFixedWorkflow(category: 'client' | 'general')`

### 3.5 Desabilitar Criação/Edição de Workflows
**Arquivo**: `apps/api/src/workflows/workflows.controller.ts`

**Mudanças**:
- Remover ou desabilitar endpoints `POST /workflows` e `PUT /workflows/:id`
- Manter apenas `GET /workflows` para leitura
- Adicionar validação para não permitir edição de workflows fixos

**Riscos**:
- ⚠️ **MÉDIO**: Agências existentes podem ter workflows customizados que precisam ser migrados
- ⚠️ **BAIXO**: Workflows fixos garantem consistência

**Dependências**:
- ✅ ETAPA 1 concluída (estrutura do banco)

**Validação**:
- ✅ Workflows fixos são criados automaticamente para novas agências
- ✅ Endpoints de criação/edição estão desabilitados
- ✅ Workflows existentes continuam funcionando (compatibilidade)

---

## 👤 ETAPA 4: BACKEND - OWNER USER ID E LÓGICA SOLO/TEAM

### 4.1 Adicionar `ownerUserId` em `CreateTaskDto`
**Arquivo**: `apps/api/src/tasks/dto/create-task.dto.ts`

```typescript
export class CreateTaskDto {
  // ... campos existentes ...
  ownerUserId?: string | null;
}
```

### 4.2 Adicionar `ownerUserId` em `UpdateTaskDto`
**Arquivo**: `apps/api/src/tasks/dto/update-task.dto.ts`

```typescript
export class UpdateTaskDto {
  // ... campos existentes ...
  ownerUserId?: string | null;
}
```

### 4.3 Modificar `TasksService.create()`
**Arquivo**: `apps/api/src/tasks/tasks.service.ts`

**Lógica**:
1. Buscar modo da agência (`agency.mode`)
2. Se `mode === 'SOLO'`:
   - Ignorar `ownerUserId` do DTO
   - Preencher automaticamente com `userId` do contexto
3. Se `mode === 'TEAM'`:
   - Usar `ownerUserId` do DTO (se fornecido)
   - Permitir `null` (opcional)

### 4.4 Modificar `TasksService.update()`
**Arquivo**: `apps/api/src/tasks/tasks.service.ts`

**Lógica**:
- Aplicar mesma regra de SOLO/TEAM
- Em modo SOLO, sempre sobrescrever com usuário logado

### 4.5 Adicionar Filtro por `ownerUserId` em `TasksService.list()`
**Arquivo**: `apps/api/src/tasks/tasks.service.ts`

**Mudanças**:
- Adicionar query param `ownerUserId` opcional
- Filtrar tarefas por responsável

### 4.6 Atualizar `TasksController`
**Arquivo**: `apps/api/src/tasks/tasks.controller.ts`

**Mudanças**:
- Adicionar query param `ownerUserId` no `GET /tasks`

**Riscos**:
- ⚠️ **BAIXO**: Campo opcional mantém compatibilidade
- ⚠️ **BAIXO**: Lógica de SOLO/TEAM é transparente para o frontend

**Dependências**:
- ✅ ETAPA 1 concluída (`ownerUserId` no banco)
- ✅ ETAPA 2 concluída (`agencyMode` disponível)

**Validação**:
- ✅ Tarefas criadas em modo SOLO têm `ownerUserId` preenchido automaticamente
- ✅ Tarefas criadas em modo TEAM podem ter `ownerUserId` opcional
- ✅ Filtro por `ownerUserId` funciona

---

## ⚡ ETAPA 5: BACKEND - AÇÕES DE POSTS

### 5.1 Definir Ações Disponíveis por Status
**Arquivo**: `apps/api/src/tasks/tasks.service.ts` (novo método)

**Mapeamento de ações**:
```typescript
const POST_ACTIONS_BY_STATUS = {
  pauta_criada: ['enviar_para_producao'],
  em_producao: ['enviar_para_aprovacao', 'marcar_como_publicado'],
  aguardando_aprovacao: ['aprovar', 'pedir_ajuste'],
  aprovado: ['agendar_post'],
  agendado: ['marcar_como_publicado'],
  publicado: [], // Nenhuma ação disponível
};
```

### 5.2 Criar DTO para Ação de POST
**Arquivo**: `apps/api/src/tasks/dto/post-action.dto.ts` (novo)

```typescript
export class PostActionDto {
  action: 'enviar_para_producao' | 'enviar_para_aprovacao' | 'aprovar' | 'pedir_ajuste' | 'agendar_post' | 'marcar_como_publicado';
  scheduledDate?: string; // Para ação 'agendar_post'
  platform?: string; // Para ação 'agendar_post'
  notes?: string; // Para ação 'pedir_ajuste'
}
```

### 5.3 Criar Método `executePostAction()`
**Arquivo**: `apps/api/src/tasks/tasks.service.ts`

**Lógica**:
1. Validar que a tarefa é um POST (`clientId` não nulo, `postType` não nulo)
2. Validar que o status atual permite a ação
3. Executar transição de status:
   - `enviar_para_producao`: `pauta_criada` → `em_producao`
   - `enviar_para_aprovacao`: `em_producao` → `aguardando_aprovacao`
   - `aprovar`: `aguardando_aprovacao` → `aprovado`
   - `pedir_ajuste`: `aguardando_aprovacao` → `em_producao`
   - `agendar_post`: `aprovado` → `agendado` (requer `scheduledDate` e `platform`)
   - `marcar_como_publicado`: `em_producao` ou `agendado` → `publicado`
4. Salvar dados adicionais (data agendada, plataforma, notas) em `description` ou campo JSON

### 5.4 Criar Endpoint `PATCH /tasks/:id/post-action`
**Arquivo**: `apps/api/src/tasks/tasks.controller.ts`

**Validações**:
- ✅ Tarefa existe
- ✅ Tarefa é um POST
- ✅ Ação é válida para o status atual
- ✅ Dados obrigatórios fornecidos (ex.: `scheduledDate` para `agendar_post`)

### 5.5 Criar Método para Listar Ações Disponíveis
**Arquivo**: `apps/api/src/tasks/tasks.service.ts`

**Novo método**: `getAvailablePostActions(taskId: string)`

**Retorno**: Array de ações disponíveis para a tarefa

**Riscos**:
- ⚠️ **MÉDIO**: Validação complexa de transições de status
- ⚠️ **BAIXO**: Endpoint específico para POSTS não afeta tarefas gerais

**Dependências**:
- ✅ ETAPA 3 concluída (workflows fixos de POSTS)
- ✅ ETAPA 4 concluída (estrutura de tasks)

**Validação**:
- ✅ Ações são validadas corretamente
- ✅ Transições de status funcionam
- ✅ Dados adicionais são salvos

---

## 👥 ETAPA 6: FRONTEND - MODO SOLO VS TEAM

### 6.1 Estender `AuthContext`
**Arquivo**: `contexts/AuthContext.tsx`

**Mudanças**:
- Estender tipo `User` para incluir `agencyMode` e flags de onboarding
- Atualizar `refreshMe()` para consumir novos campos de `/auth/me`

### 6.2 Estender `AppContext`
**Arquivo**: `App.tsx`

**Mudanças**:
- Adicionar `agencyMode` ao `agencyProfile`
- Atualizar consumo de `/agencies/me` para incluir novos campos (se necessário)

### 6.3 Adaptar `AgendaPage` para Modo SOLO
**Arquivo**: `components/AgendaPage.tsx`

**Mudanças**:
- Esconder campo "Responsável" se `agencyMode === 'SOLO'`
- Não enviar `ownerUserId` no payload se modo SOLO
- Mostrar avatar do responsável apenas em modo TEAM

### 6.4 Adaptar Filtros para Modo TEAM
**Arquivo**: `components/AgendaPage.tsx`

**Mudanças**:
- Adicionar filtro por responsável apenas se `agencyMode === 'TEAM'`
- Mostrar lista de usuários da agência no filtro

### 6.5 Adaptar `TaskModal` para Modo SOLO/TEAM
**Arquivo**: `components/AgendaPage.tsx` (TaskModal)

**Mudanças**:
- Mostrar campo "Responsável" apenas se `agencyMode === 'TEAM'`
- Em modo SOLO, não exibir campo (backend preenche automaticamente)

**Riscos**:
- ⚠️ **BAIXO**: Modo SOLO simplifica a UI
- ⚠️ **BAIXO**: Modo TEAM mantém funcionalidade completa

**Dependências**:
- ✅ ETAPA 2 concluída (agencyMode disponível)
- ✅ ETAPA 4 concluída (lógica de ownerUserId)

**Validação**:
- ✅ Campo responsável escondido em modo SOLO
- ✅ Campo responsável visível em modo TEAM
- ✅ Filtro por responsável funciona em modo TEAM

---

## 🎨 ETAPA 7: FRONTEND - ONBOARDING EM 3 CAMADAS

### 7.1 CAMADA 1: Setup Inicial (Modal/Page)
**Arquivo**: `components/OnboardingSetupPage.tsx` (novo)

**Funcionalidades**:
1. Pergunta 1: "Você trabalha sozinho(a) ou em equipe?"
   - Opções: SOLO | TEAM
   - Salvar em `agency.mode`
2. Pergunta 2: "O que você mais vai usar no dia a dia?"
   - Checkboxes: Posts, Tarefas internas, Clientes, Financeiro
   - Salvar em `agency.preferences` (JSON) - apenas para atalhos
3. Pergunta 3: "Quer que a gente te guie nos primeiros passos?"
   - Opções: Sim | Não
   - Salvar em `agency.showGuidedTour`

**Integração**:
- Aparecer após pagamento, antes do dashboard
- Verificar `agency.onboardingCompleted === false`
- Após completar, salvar `onboardingCompleted = true`

### 6.2 CAMADA 2: Tour Guiado na Home/Dashboard
**Arquivo**: `components/GuidedTour.tsx` (novo)

**Funcionalidades**:
- Mostrar apenas se `agency.showGuidedTour === true` e `agency.hasSeenHomeTour === false`
- Tour com 4-5 passos:
  1. Visão geral do dashboard
  2. Tarefas
  3. Clientes
  4. Financeiro (se existir no plano)
  5. CTA: "Ir para Tarefas"
- Permitir: Avançar, Pular tour
- Salvar `hasSeenHomeTour = true` ao finalizar ou pular

**Biblioteca sugerida**: `react-joyride` ou implementação customizada

### 6.3 CAMADA 3: Onboarding de Tarefas
**Arquivo**: `components/TasksOnboarding.tsx` (novo)

**Funcionalidades**:
- Mostrar apenas se `user.hasSeenTasksOnboarding === false`
- Conteúdo:
  1. Diferença entre Posts e Tarefas Gerais
  2. Como funciona Posts (cor = status, ícone = ação)
  3. Como ler a agenda
- Salvar `hasSeenTasksOnboarding = true` ao finalizar

**Integração**:
- Aparecer na primeira vez que o usuário entra em Tarefas
- Verificar `user.hasSeenTasksOnboarding === false`

### 6.4 Menu "Ver Novamente"
**Arquivo**: `components/Sidebar.tsx` ou `components/AccountSettingsPage.tsx`

**Funcionalidades**:
- Adicionar opção "Ver novamente" no menu Ajuda
- Permitir reativar qualquer camada de onboarding

**Riscos**:
- ⚠️ **BAIXO**: Onboarding não bloqueia uso do sistema
- ⚠️ **BAIXO**: Flags permitem controle fino

**Dependências**:
- ✅ ETAPA 2 concluída (endpoints de onboarding)

**Validação**:
- ✅ Setup inicial aparece após pagamento
- ✅ Tour guiado aparece no dashboard (se habilitado)
- ✅ Onboarding de tarefas aparece na primeira vez
- ✅ Menu "Ver novamente" funciona

---

## 🎯 ETAPA 8: FRONTEND - AÇÕES DE POSTS

### 8.1 Criar Componente de Ações de POST
**Arquivo**: `components/PostActions.tsx` (novo)

**Funcionalidades**:
- Receber tarefa (POST) como prop
- Buscar ações disponíveis via `GET /tasks/:id/available-actions` (ou calcular no frontend)
- Exibir botões de ações contextuais ao status
- Chamar `PATCH /tasks/:id/post-action` ao clicar

### 8.2 Integrar Ações no `TaskCard`
**Arquivo**: `components/AgendaPage.tsx` (TaskCard)

**Mudanças**:
- Mostrar componente `PostActions` apenas para POSTS
- Exibir ícone de ação pendente no card
- Mostrar tooltip com ação disponível

### 8.3 Criar Modal para Ação "Agendar Post"
**Arquivo**: `components/SchedulePostModal.tsx` (novo)

**Funcionalidades**:
- Campos: Data, Plataforma (Instagram, Facebook, etc.)
- Validação: Data obrigatória, Plataforma obrigatória
- Chamar `PATCH /tasks/:id/post-action` com `action: 'agendar_post'`

### 8.4 Criar Modal para Ação "Pedir Ajuste"
**Arquivo**: `components/RequestAdjustmentModal.tsx` (novo)

**Funcionalidades**:
- Campo: Notas (textarea)
- Chamar `PATCH /tasks/:id/post-action` com `action: 'pedir_ajuste'`

### 8.5 Adaptar `TaskModal` para Desabilitar Edição Manual de Status em POSTS
**Arquivo**: `components/AgendaPage.tsx` (TaskModal)

**Mudanças**:
- Se tarefa é POST, desabilitar campo "Status"
- Mostrar mensagem: "Status de posts é alterado apenas através de ações"
- Mostrar ações disponíveis dentro do modal

### 8.6 Adicionar Chips Educativos
**Arquivo**: `components/AgendaPage.tsx`

**Funcionalidades**:
- Chip "Em produção prontos para envio" (status `em_producao`)
- Chip "Aprovados não agendados" (status `aprovado`)
- Chip "Aguardando aprovação" (status `aguardando_aprovacao`)

**Riscos**:
- ⚠️ **MÉDIO**: UI complexa com múltiplos modais
- ⚠️ **BAIXO**: Ações contextuais melhoram UX

**Dependências**:
- ✅ ETAPA 5 concluída (endpoint de ações)

**Validação**:
- ✅ Ações aparecem corretamente por status
- ✅ Modais funcionam
- ✅ Status não é editável manualmente em POSTS
- ✅ Chips educativos aparecem

---

## 🧪 ETAPA 9: TESTES E VALIDAÇÃO

### 9.1 Testes de Backend
- ✅ Workflows fixos são criados automaticamente
- ✅ Endpoints de criação/edição de workflows estão desabilitados
- ✅ `ownerUserId` é preenchido automaticamente em modo SOLO
- ✅ Ações de POSTS são validadas corretamente
- ✅ Transições de status funcionam

### 9.2 Testes de Frontend
- ✅ Onboarding aparece nas condições corretas
- ✅ Modo SOLO esconde responsável
- ✅ Modo TEAM mostra responsável
- ✅ Ações de POSTS aparecem corretamente
- ✅ Status não é editável manualmente em POSTS

### 9.3 Testes de Integração
- ✅ Fluxo completo: Setup → Tour → Tarefas
- ✅ Criação de POST em modo SOLO
- ✅ Criação de POST em modo TEAM
- ✅ Execução de ações de POSTS
- ✅ Migração de tarefas antigas (compatibilidade)

### 9.4 Testes de Compatibilidade
- ✅ Agências existentes continuam funcionando
- ✅ Tarefas antigas são renderizadas com fallback
- ✅ Workflows antigos não quebram o sistema

**Riscos**:
- ⚠️ **MÉDIO**: Testes extensivos necessários
- ⚠️ **BAIXO**: Compatibilidade mantida

**Dependências**:
- ✅ Todas as etapas anteriores concluídas

**Validação**:
- ✅ Todos os testes passam
- ✅ Sistema funciona em produção

---

## 📊 RESUMO DE RISCOS E DEPENDÊNCIAS

### Riscos Críticos
1. **MIGRAÇÃO DO BANCO** (ETAPA 1)
   - ⚠️ **MÉDIO**: Migração pode falhar se houver dados inconsistentes
   - **Mitigação**: Campos opcionais com defaults seguros

2. **MUDANÇA DE CONTRATO** (ETAPA 2)
   - ⚠️ **BAIXO**: Mudança de `/auth/me` pode quebrar frontend
   - **Mitigação**: Atualizar frontend simultaneamente

3. **VALIDAÇÃO DE AÇÕES** (ETAPA 5)
   - ⚠️ **MÉDIO**: Validação complexa de transições
   - **Mitigação**: Testes extensivos

### Dependências Críticas
1. **ETAPA 1 → ETAPA 2**: Campos no banco antes de estender endpoints
2. **ETAPA 2 → ETAPA 7**: `agencyMode` disponível antes de adaptar UI
3. **ETAPA 3 → ETAPA 5**: Workflows fixos antes de ações de POSTS
4. **ETAPA 4 → ETAPA 7**: Lógica de `ownerUserId` antes de adaptar UI

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Fundação (Etapas 1-2)
- [ ] ETAPA 1: Migração do banco de dados
- [ ] ETAPA 2: Estender endpoints de autenticação

### Fase 2: Backend Core (Etapas 3-5)
- [ ] ETAPA 3: Workflows fixos
- [ ] ETAPA 4: Owner User ID e lógica SOLO/TEAM
- [ ] ETAPA 5: Ações de POSTS

### Fase 3: Frontend Core (Etapas 6-8)
- [ ] ETAPA 6: Modo SOLO vs TEAM (UI adaptativa - PRIMEIRO)
- [ ] ETAPA 7: Onboarding em 3 camadas (DEPOIS)
- [ ] ETAPA 8: Ações de POSTS

### Fase 4: Validação (Etapa 9)
- [ ] ETAPA 9: Testes e validação completa

---

## 🚀 ORDEM DE EXECUÇÃO RECOMENDADA

1. **ETAPA 1** → Migração do banco (fundação)
2. **ETAPA 2** → Estender `/auth/me` apenas (dados disponíveis)
3. **ETAPA 3** → Workflows fixos (estrutura de POSTS e Tarefas Gerais)
4. **ETAPA 4** → Owner User ID (responsável)
5. **ETAPA 5** → Ações de POSTS (funcionalidade core - apenas POSTS)
6. **ETAPA 6** → Modo SOLO/TEAM (UI adaptativa - PRIMEIRO)
7. **ETAPA 7** → Onboarding (UX - DEPOIS)
8. **ETAPA 8** → Ações de POSTS (UI)
9. **ETAPA 9** → Testes (validação)

---

## 📝 NOTAS IMPORTANTES

1. **Compatibilidade**: Manter lógica de migração para uso futuro, mas não permitir personalização
2. **Workflows Fixos**: Não editáveis via UI nem API (exceto seed/ensureDefaults)
3. **Modo SOLO**: Backend preenche `ownerUserId` automaticamente
4. **Ações Contextuais**: UI mostra apenas ações válidas, backend valida novamente
5. **Onboarding**: Não bloqueia uso do sistema, pode ser reativado via menu

---

**Próximo Passo**: Aguardar aprovação do plano antes de iniciar a implementação.
