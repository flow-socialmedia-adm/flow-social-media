# 📋 PLANO DE MIGRAÇÃO DE WORKFLOWS - PARA APROVAÇÃO

## 🎯 VISÃO GERAL DA SOLUÇÃO

A solução proposta mantém as tarefas antigas visíveis e funcionais, mas com identificação visual clara, permitindo migração individual ou em lote conforme necessário.

---

## 🔄 FLUXO DE MUDANÇA DE WORKFLOW

### 1. **Detecção e Confirmação Inicial**

**Quando**: Usuário tenta mudar workflow na página de Settings

**Comportamento**:
1. Sistema detecta se há tarefas do workflow atual
2. Mostra modal de confirmação com:
   - **Quantidade total de tarefas afetadas**
   - **Quantidade de tarefas passadas** (anteriores à data atual)
   - **Quantidade de tarefas futuras** (hoje ou futuras)
   - Opções:
     - ✅ **"Continuar e manter tarefas antigas"** (padrão)
     - ❌ **"Cancelar"**

**Exemplo de Mensagem**:
```
Você está prestes a mudar o workflow de "Produção Agência" para "Padrão".

Isso afetará 15 tarefas existentes:
• 8 tarefas passadas (anteriores a hoje)
• 7 tarefas futuras (hoje ou futuras)

As tarefas antigas serão mantidas com seus status originais, mas você poderá migrá-las individualmente quando necessário.

Deseja continuar?
```

---

## 🎨 IDENTIFICAÇÃO VISUAL DE TAREFAS ANTIGAS

### **Badge/Indicador Visual**
- **Ícone de alerta amarelo** (⚠️) ao lado do título da tarefa
- **Borda tracejada** ou **fundo levemente diferente** (opcional)
- **Tooltip**: "Tarefa de workflow antigo - Clique para migrar"

### **Comportamento**
- Tarefas antigas **mantêm suas cores originais** (status do workflow antigo)
- Funcionam normalmente (arrastar, editar, etc.)
- Visualmente distintas mas não intrusivas

---

## 🔧 MIGRAÇÃO INDIVIDUAL DE TAREFAS

### **Botão de Migração Discreto**

**Localização**: 
- Ao lado do ícone de alerta na tarefa
- Ou no menu de ações (3 pontos) se existir

**Visual**:
- Botão pequeno com ícone de "refresh" ou "sync" (🔄)
- Ou texto "Migrar" em fonte pequena
- Cor discreta (cinza/azul claro)

**Ao Clicar**:
- Abre modal de migração individual
- Mostra:
  - Tarefa atual (título, status atual, workflow antigo)
  - Dropdown com statuses do novo workflow
  - Preview da cor do novo status
  - Botão "Migrar esta tarefa"
  - Checkbox "Aplicar mesmo status para tarefas similares" (opcional)

---

## 📦 MIGRAÇÃO EM LOTE

### **Modal de Migração em Lote**

**Acesso**:
- Botão "Migrar Tarefas Antigas" no header da agenda (quando há tarefas antigas)
- Ou link no modal de confirmação inicial

**Estrutura do Modal**:

#### **Seção 1: Tarefas Passadas (Históricas)**
```
┌─────────────────────────────────────────┐
│ Tarefas Passadas (8 tarefas)            │
│                                         │
│ ☐ Ignorar tarefas passadas              │
│   (Não serão contabilizadas)            │
│                                         │
│ [Lista de tarefas passadas - somente   │
│  leitura, sem opção de migração]       │
└─────────────────────────────────────────┘
```

#### **Seção 2: Tarefas Futuras (Migráveis)**
```
┌─────────────────────────────────────────┐
│ Tarefas Futuras (7 tarefas)              │
│                                         │
│ ☐ Migrar todas para: [Dropdown Status] │
│                                         │
│ Lista de Tarefas:                        │
│ ┌─────────────────────────────────────┐ │
│ │ ☐ Post: "Título 1"                  │ │
│ │   Status atual: "fazer_post" (roxo)  │ │
│ │   Novo status: [Dropdown] "in_progress"│
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ ☐ Tarefa: "Título 2"                │ │
│ │   Status atual: "agendar_post" (cyan)│ │
│ │   Novo status: [Dropdown] "in_progress"│
│ └─────────────────────────────────────┘ │
│                                         │
│ [Migrar Selecionadas] [Cancelar]       │
└─────────────────────────────────────────┘
```

**Funcionalidades**:
- **Checkbox global**: "Migrar todas para [Status]"
- **Checkboxes individuais**: Selecionar tarefas específicas
- **Dropdown por tarefa**: Escolher status diferente para cada uma
- **Preview de cores**: Mostrar cor do novo status
- **Mapeamento inteligente**: Sugerir status por categoria (todo/in_progress/done)

---

## 🎯 DETALHES DE IMPLEMENTAÇÃO

### **1. Identificação de Tarefas Antigas**

```typescript
const isFromOldWorkflow = task.workflowId && 
  task.workflowId !== (task.isGeneral ? generalWorkflowId : clientWorkflowId);
```

### **2. Separação Passado/Futuro**

```typescript
const today = formatDateToYYYYMMDD(new Date());
const pastTasks = oldTasks.filter(t => t.date < today);
const futureTasks = oldTasks.filter(t => t.date >= today);
```

### **3. Mapeamento Inteligente de Status**

```typescript
// Sugerir status baseado na categoria
const suggestStatus = (oldStatus: StatusDefinition, newWorkflow: Workflow) => {
  const sameCategory = newWorkflow.statuses.filter(s => s.category === oldStatus.category);
  return sameCategory[0] || newWorkflow.statuses[0];
};
```

### **4. Ação "Ignorar Tarefas Passadas"**

- Marcar tarefas passadas com flag `ignored: true` (localStorage ou backend)
- Não contabilizar em relatórios/estatísticas
- Ainda visíveis mas com opacidade reduzida
- Opção de "desmarcar ignoradas" no futuro

---

## 📱 LAYOUT DO MODAL DE MIGRAÇÃO EM LOTE

```
┌─────────────────────────────────────────────────────┐
│  Migração de Tarefas Antigas              [X]      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Você tem 15 tarefas do workflow antigo:            │
│  • 8 tarefas passadas                                │
│  • 7 tarefas futuras                                 │
│                                                      │
│  ┌─ Tarefas Passadas ───────────────────────────┐ │
│  │ ☐ Ignorar tarefas passadas                    │ │
│  │   (Não serão contabilizadas em relatórios)    │ │
│  │                                                │ │
│  │ 📋 Lista (somente leitura):                   │ │
│  │   • Post: "Título 1" - 10/01/2026             │ │
│  │   • Tarefa: "Título 2" - 12/01/2026           │ │
│  │   ...                                          │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─ Tarefas Futuras ────────────────────────────┐ │
│  │ ☐ Migrar todas para: [Dropdown: in_progress] │ │
│  │                                                │ │
│  │ ☐ Post: "Título 3" - 20/01/2026              │ │
│  │    Status atual: fazer_post (roxo)            │ │
│  │    Novo status: [Dropdown] in_progress       │ │
│  │                                                │ │
│  │ ☐ Tarefa: "Título 4" - 25/01/2026            │ │
│  │    Status atual: agendar_post (cyan)          │ │
│  │    Novo status: [Dropdown] in_progress       │ │
│  │                                                │ │
│  │ ... (mais tarefas)                            │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  [Migrar Selecionadas (3)]  [Cancelar]             │
└─────────────────────────────────────────────────────┘
```

---

## ✅ VANTAGENS DESTA ABORDAGEM

1. **Não Perde Dados**: Tarefas antigas permanecem visíveis e funcionais
2. **Controle Granular**: Migração individual ou em lote conforme necessário
3. **Flexibilidade**: Usuário escolhe quando e como migrar
4. **Histórico Preservado**: Tarefas passadas podem ser ignoradas mas mantidas
5. **Visual Claro**: Fácil identificar tarefas antigas sem ser intrusivo
6. **Mapeamento Inteligente**: Sugere status apropriado baseado em categoria

---

## ❓ PONTOS PARA DECISÃO

### **1. Armazenamento de "Ignoradas"**
- **Opção A**: localStorage (apenas frontend)
- **Opção B**: Backend (campo `ignored` na tabela Task)
- **Recomendação**: Opção B (mais robusto)

### **2. Visual de Tarefas Ignoradas**
- **Opção A**: Opacidade reduzida (50%)
- **Opção B**: Linha riscada
- **Opção C**: Badge "Ignorada"
- **Recomendação**: Opção A + C (opacidade + badge)

### **3. Localização do Botão de Migração Individual**
- **Opção A**: Ao lado do ícone de alerta (sempre visível)
- **Opção B**: Menu de 3 pontos (mais discreto)
- **Opção C**: Ao passar mouse sobre a tarefa
- **Recomendação**: Opção A (mais acessível)

### **4. Mapeamento Automático de Status**
- **Opção A**: Sempre sugerir por categoria
- **Opção B**: Permitir escolher manualmente sempre
- **Opção C**: Sugerir mas permitir mudar
- **Recomendação**: Opção C (melhor UX)

---

## 🚀 ORDEM DE IMPLEMENTAÇÃO

1. ✅ Corrigir badge visual (já implementado, verificar se funciona)
2. ✅ Adicionar confirmação na SettingsPage antes de mudar workflow
3. ✅ Implementar identificação visual de tarefas antigas
4. ✅ Criar modal de migração individual
5. ✅ Criar modal de migração em lote
6. ✅ Implementar funcionalidade "ignorar tarefas passadas"
7. ✅ Adicionar botão "Migrar Tarefas Antigas" no header

---

## 📝 PERGUNTAS PARA APROVAÇÃO

1. ✅ O fluxo geral está de acordo com sua visão?
2. ✅ A estrutura do modal de migração em lote faz sentido?
3. ✅ As opções de "ignorar tarefas passadas" e "migrar futuras" estão claras?
4. ✅ O visual proposto (badge + botão discreto) é adequado?
5. ✅ Alguma funcionalidade adicional que gostaria de incluir?

**Aguardando sua aprovação para iniciar a implementação! 🚀**
