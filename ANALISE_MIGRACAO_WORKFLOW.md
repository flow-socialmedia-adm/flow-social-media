# 📋 ANÁLISE E PROPOSTA: MIGRAÇÃO DE WORKFLOWS

## 🔍 PROBLEMAS IDENTIFICADOS

### 1. Badge Visual Não Aparece
- **Problema**: O badge de workflow antigo está sendo calculado mas não está sendo renderizado no TaskCard normal (apenas no compact)
- **Causa**: A variável `isFromOldWorkflow` está sendo definida mas não está sendo usada na renderização do card normal

### 2. Modal de Migração Não Aparece ao Mudar Workflow
- **Problema**: O modal só aparece uma vez (usa localStorage) e não detecta mudanças de workflow
- **Causa**: O `useEffect` verifica apenas se já foi mostrado antes, não detecta mudanças de workflow

### 3. Migração com Diferença de Status
- **Cenário**: Produção Agência tem 5 status, Padrão tem 3 status
- **Problema Atual**: Mapeia para o primeiro status se não existir
- **Risco**: Perda de informação sobre o progresso real da tarefa

---

## 💡 PROPOSTAS DE SOLUÇÃO

### 1. ✅ CORREÇÃO DO BADGE VISUAL
**Solução**: Adicionar o badge também na renderização normal do TaskCard (não apenas no compact)

**Implementação**:
- Renderizar o ícone `AlertTriangleIcon` ao lado do título em todas as visualizações
- Manter tooltip informativo

---

### 2. ✅ DETECÇÃO DE MUDANÇA DE WORKFLOW
**Solução**: Detectar mudanças de workflow e resetar o flag do modal

**Implementação**:
- Usar um `useEffect` que monitora mudanças em `clientWorkflowId` e `generalWorkflowId`
- Quando detectar mudança, resetar `flow_migrationModalShown` e mostrar o modal novamente
- Adicionar confirmação antes de mudar workflow na página de Settings

---

### 3. 🎯 MIGRAÇÃO INTELIGENTE DE STATUS

#### Opção A: Mapeamento por Categoria (RECOMENDADA)
**Conceito**: Mapear status baseado na categoria (todo, in_progress, done)

**Vantagens**:
- Preserva o sentido do status (não perde progresso)
- Funciona bem mesmo com workflows diferentes
- Lógica simples e previsível

**Exemplo**:
```
Produção Agência → Padrão
- "pauta_criada" (todo) → "todo" (todo)
- "fazer_post" (in_progress) → "in_progress" (in_progress)
- "enviar_aprovacao" (in_progress) → "in_progress" (in_progress)
- "agendar_post" (in_progress) → "in_progress" (in_progress)
- "agendado_postado" (done) → "done" (done)
```

**Implementação**:
```typescript
// Mapear por categoria
const mapStatusByCategory = (oldStatus: StatusDefinition, targetWorkflow: Workflow) => {
  const sameCategoryStatuses = targetWorkflow.statuses.filter(s => s.category === oldStatus.category);
  if (sameCategoryStatuses.length > 0) {
    // Se houver múltiplos, usar o primeiro da mesma categoria
    return sameCategoryStatuses[0].id;
  }
  // Fallback: primeiro status do workflow
  return targetWorkflow.statuses[0]?.id;
};
```

#### Opção B: Mapeamento Manual/Configurável
**Conceito**: Permitir que o usuário configure o mapeamento

**Vantagens**:
- Máximo controle
- Pode mapear status específicos

**Desvantagens**:
- Mais complexo
- Requer interface adicional
- Pode ser confuso para usuários

#### Opção C: Mapeamento por Ordem
**Conceito**: Mapear pelo índice relativo na lista

**Exemplo**:
```
Produção Agência (5 status) → Padrão (3 status)
- Status 1/5 → Status 1/3
- Status 2/5 → Status 2/3
- Status 3/5 → Status 3/3
- Status 4/5 → Status 3/3 (último)
- Status 5/5 → Status 3/3 (último)
```

**Desvantagens**:
- Pode perder sentido semântico
- Não preserva categoria

**RECOMENDAÇÃO**: **Opção A (Mapeamento por Categoria)** - Mais simples, preserva o sentido e funciona bem na maioria dos casos.

---

### 4. 📊 LEGENDA DE CORES DISCRETA

#### Proposta 1: Tooltip no Header (RECOMENDADA)
**Localização**: Ao lado do título da visualização ou no header de cada coluna (Kanban)

**Visual**:
- Ícone pequeno de informação (ℹ️) ou paleta (🎨)
- Ao passar o mouse, mostra tooltip com legenda
- Ou clique abre um popover discreto

**Vantagens**:
- Não ocupa espaço permanente
- Disponível quando necessário
- Não interfere no layout

**Exemplo Visual**:
```
[Diária] [Semanal] [Mensal] [Lista] [Kanban] [ℹ️] ← Ícone discreto
```

#### Proposta 2: Badge Expandível
**Localização**: Canto inferior direito, pequeno badge

**Visual**:
- Badge pequeno "Status" ou ícone de paleta
- Ao clicar, expande um painel lateral discreto
- Mostra todos os statuses do workflow atual com suas cores

**Vantagens**:
- Sempre visível mas discreto
- Não interfere no layout principal

#### Proposta 3: Legenda no Filtro de Status
**Localização**: Ao lado do dropdown de Status

**Visual**:
- Cada opção no dropdown mostra a cor ao lado
- Ou tooltip ao passar o mouse sobre o dropdown

**Vantagens**:
- Contextual (aparece onde é relevante)
- Não ocupa espaço extra

**RECOMENDAÇÃO**: **Proposta 1 (Tooltip no Header)** - Mais discreto e não interfere no layout.

---

### 5. ✅ CONFIRMAÇÃO ANTES DE TROCAR WORKFLOW

**Localização**: Página de Settings, antes de confirmar mudança de workflow

**Comportamento**:
1. Usuário seleciona novo workflow
2. Ao clicar em "Confirmar" ou tentar salvar
3. Sistema detecta se há tarefas do workflow antigo
4. Mostra modal de confirmação com:
   - Quantidade de tarefas afetadas
   - Opção de migrar automaticamente
   - Opção de manter como está
   - Aviso sobre mapeamento de status

**Implementação**:
- Interceptar `handleConfirmWorkflow` na SettingsPage
- Verificar tarefas do workflow antigo antes de confirmar
- Mostrar modal de confirmação
- Se escolher migrar, executar migração antes de confirmar workflow

---

## 📝 RESUMO DAS DECISÕES NECESSÁRIAS

1. **Migração de Status**: ✅ **Opção A (Mapeamento por Categoria)** - Aprovar?
2. **Legenda de Cores**: ✅ **Proposta 1 (Tooltip no Header)** - Aprovar?
3. **Confirmação de Workflow**: ✅ Implementar na SettingsPage - Aprovar?

---

## 🚀 PRÓXIMOS PASSOS APÓS APROVAÇÃO

1. Corrigir badge visual no TaskCard
2. Implementar detecção de mudança de workflow
3. Implementar mapeamento por categoria
4. Adicionar tooltip de legenda no header
5. Adicionar confirmação na SettingsPage
