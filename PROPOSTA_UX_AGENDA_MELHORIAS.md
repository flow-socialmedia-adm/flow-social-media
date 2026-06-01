# Proposta de Melhorias UX/SaaS - Página Agenda

## 📋 Análise do Estado Atual

### Problemas Identificados:

1. **Layout dos Controles (Navegação, Filtros, Visualizações)**
   - Em visualizações centralizadas (Lista, Diária, Kanban), os controles ficam no canto esquerdo
   - Layout não é responsivo e não aproveita bem o espaço central
   - Navegação de datas e botões de visualização ficam separados visualmente

2. **Filtro Posts vs Tarefas Gerais**
   - Não há interface visual para alternar entre Posts e Tarefas Gerais
   - Usuário não tem controle claro sobre o que está vendo
   - Com as tags implementadas, faz sentido ter um controle visual para isso

3. **Filtros Atuais (Cliente, Tipo, Status)**
   - Filtro "Cliente" só funciona para Posts (desabilitado para Tarefas Gerais)
   - Filtro "Tipo" só funciona para Posts (tipo de post)
   - Filtro "Status" funciona para ambos, mas não diferencia visualmente
   - UX confusa: filtros aparecem mas não funcionam para Tarefas Gerais

---

## 🎨 Proposta de Solução Moderna SaaS

### **OPÇÃO A: Header Unificado com Barra de Ações Flutuante (Recomendada)**

#### Conceito:
Criar um header fixo/sticky no topo com todos os controles organizados em uma barra horizontal moderna, similar ao Notion, Linear, ou Monday.com.

#### Layout Proposto:

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Hoje] [<] [>]  Janeiro 2026          [Diária][Semanal][Mensal]... │
│                                                                     │
│ [● Posts] [● Tarefas]  |  [Cliente ▼] [Tipo ▼] [Status ▼] [+ Nova] │
└─────────────────────────────────────────────────────────────────────┘
```

#### Estrutura Detalhada:

**Linha 1 - Navegação e Visualizações:**
- **Esquerda**: Navegação de datas (Hoje, <, >, Mês/Ano)
- **Direita**: Botões de visualização (Diária, Semanal, Mensal, Lista, Kanban)
- **Centralizado**: Título do período atual (ex: "Janeiro 2026")

**Linha 2 - Filtros e Ações:**
- **Esquerda**: Toggle Chips para Posts/Tarefas (estilo moderno com ícones)
- **Centro**: Filtros contextuais (só aparecem quando relevante)
- **Direita**: Botão "+ Nova Tarefa"

#### Vantagens:
✅ Todos os controles em um lugar lógico
✅ Funciona bem em visualizações centralizadas
✅ Visual limpo e moderno
✅ Responsivo (empilha em mobile)
✅ Filtros contextuais (só aparecem quando fazem sentido)

---

### **OPÇÃO B: Sidebar Lateral com Filtros (Alternativa)**

#### Conceito:
Sidebar fixa à esquerda com todos os filtros e controles, similar ao Jira ou Asana.

#### Layout Proposto:

```
┌──────┬────────────────────────────────────────────┐
│      │  [Hoje] [<] [>]  Janeiro 2026               │
│      │  [Diária][Semanal][Mensal]... [+ Nova]      │
│      ├─────────────────────────────────────────────┤
│      │                                              │
│ Filt │  CONTEÚDO CENTRALIZADO                      │
│ ros  │  (Lista, Diária, Kanban)                     │
│      │                                              │
│      │                                              │
└──────┴─────────────────────────────────────────────┘
```

#### Vantagens:
✅ Filtros sempre visíveis
✅ Não ocupa espaço do header
✅ Bom para telas grandes

#### Desvantagens:
⚠️ Ocupa espaço lateral
⚠️ Menos eficiente em mobile
⚠️ Pode não combinar com o design atual

---

## 🎯 Solução Recomendada: OPÇÃO A (Header Unificado)

### Detalhamento da Implementação:

#### 1. **Toggle Posts/Tarefas (Chips Modernos)**

**Design:**
```
┌─────────────┬──────────────┐
│ 📱 Posts    │ ✓ Tarefas    │  ← Chips com ícones, estilo toggle
└─────────────┴──────────────┘
```

**Comportamento:**
- Chips clicáveis (pode selecionar ambos, apenas um, ou nenhum)
- Visual: Chip ativo = fundo colorido (roxo para Posts, azul para Tarefas)
- Chip inativo = borda + fundo transparente
- Ícones: 📱 para Posts, ✓ para Tarefas
- Posição: Início da linha de filtros

**Estados:**
- Ambos selecionados: Mostra tudo (padrão)
- Apenas Posts: Mostra só posts de clientes
- Apenas Tarefas: Mostra só tarefas gerais
- Nenhum selecionado: Mostra mensagem "Selecione um tipo para visualizar"

---

#### 2. **Filtros Contextuais Inteligentes**

**Filtro de Cliente:**
- **Quando aparece**: Apenas quando "Posts" está selecionado
- **Label**: "Cliente" (mais curto)
- **Estilo**: Dropdown moderno com busca (se muitos clientes)
- **Opção padrão**: "Todos os clientes"

**Filtro de Tipo de Post:**
- **Quando aparece**: Apenas quando "Posts" está selecionado
- **Label**: "Tipo" (mais curto)
- **Estilo**: Dropdown com ícones dos tipos
- **Opção padrão**: "Todos os tipos"

**Filtro de Categoria (NOVO):**
- **Quando aparece**: Apenas quando "Tarefas" está selecionado
- **Label**: "Categoria"
- **Opções**: As 12 categorias padrão (Reunião, Planejamento, etc.)
- **Opção padrão**: "Todas as categorias"

**Filtro de Status:**
- **Quando aparece**: Sempre (funciona para ambos)
- **Label**: "Status"
- **Opções**: Combina statuses de ambos os workflows
- **Visual**: Badge colorido ao lado do nome do status
- **Opção padrão**: "Todos os status"

**Filtro de Data (NOVO - Opcional):**
- **Quando aparece**: Sempre
- **Label**: "Período"
- **Opções**: Hoje, Esta semana, Este mês, Personalizado
- **Estilo**: Dropdown ou botões rápidos

---

#### 3. **Layout Responsivo do Header**

**Desktop (> 1024px):**
```
┌────────────────────────────────────────────────────────────────────────┐
│ [Hoje] [<] [>]  Janeiro 2026    [Diária][Semanal][Mensal][Lista][Kanban] │
│                                                                        │
│ [● Posts] [● Tarefas]  |  [Cliente ▼] [Tipo ▼] [Status ▼]  [+ Nova]  │
└────────────────────────────────────────────────────────────────────────┘
```

**Tablet (768px - 1024px):**
```
┌────────────────────────────────────────────┐
│ [Hoje] [<] [>]  Janeiro 2026               │
│ [Diária][Semanal][Mensal]...               │
│                                            │
│ [● Posts] [● Tarefas]                      │
│ [Cliente ▼] [Tipo ▼] [Status ▼] [+ Nova]  │
└────────────────────────────────────────────┘
```

**Mobile (< 768px):**
```
┌──────────────────────┐
│ [Hoje] [<] [>]       │
│ Janeiro 2026          │
│                      │
│ [Diária][Semanal]... │
│                      │
│ [● Posts] [● Tarefas]│
│                      │
│ [Filtros ▼] [+ Nova] │ ← Menu dropdown
└──────────────────────┘
```

---

#### 4. **Componentes Visuais Propostos**

**Toggle Chips (Posts/Tarefas):**
```tsx
<div className="flex gap-2">
  <button className={`
    px-3 py-1.5 rounded-full text-sm font-medium transition-all
    ${isClientPostsVisible 
      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-2 border-indigo-500' 
      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-2 border-transparent hover:border-gray-300'}
  `}>
    <StaticIcon className="w-4 h-4 inline mr-1" />
    Posts
  </button>
  <button className={`
    px-3 py-1.5 rounded-full text-sm font-medium transition-all
    ${isGeneralTasksVisible 
      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-2 border-blue-600' 
      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-2 border-transparent hover:border-gray-300'}
  `}>
    <CheckSquareIcon className="w-4 h-4 inline mr-1" />
    Tarefas
  </button>
</div>
```

**Filtros Contextuais:**
- Dropdowns modernos com busca (se necessário)
- Badges de status coloridos
- Ícones nos filtros quando relevante
- Animações suaves ao mostrar/ocultar

---

## 🔄 Fluxo de Filtros Inteligentes

### Cenário 1: Apenas Posts Selecionado
```
Filtros disponíveis:
- Cliente (dropdown)
- Tipo de Post (dropdown)
- Status (dropdown com statuses de posts)
```

### Cenário 2: Apenas Tarefas Selecionado
```
Filtros disponíveis:
- Categoria (dropdown com 12 opções)
- Status (dropdown com statuses de tarefas gerais)
```

### Cenário 3: Ambos Selecionados
```
Filtros disponíveis:
- Cliente (dropdown - filtra apenas posts)
- Tipo de Post (dropdown - filtra apenas posts)
- Categoria (dropdown - filtra apenas tarefas)
- Status (dropdown - filtra ambos)
```

### Cenário 4: Nenhum Selecionado
```
Mensagem: "Selecione Posts ou Tarefas para visualizar"
Filtros: Desabilitados
```

---

## 📐 Estrutura de Código Proposta

### Novo Estado:
```typescript
const [taskTypeFilter, setTaskTypeFilter] = useState<{
  posts: boolean;
  tasks: boolean;
}>({ posts: true, tasks: true });

const [filters, setFilters] = useState({
  client: 'all',      // Só para posts
  postType: 'all',    // Só para posts
  category: 'all',   // Só para tarefas
  status: 'all',      // Para ambos
});
```

### Lógica de Filtros:
```typescript
const filteredTasks = useMemo(() => {
  return tasks.filter(task => {
    // Filtro de tipo (Posts/Tarefas)
    if (task.isGeneral && !taskTypeFilter.tasks) return false;
    if (!task.isGeneral && !taskTypeFilter.posts) return false;
    
    // Filtros específicos de posts
    if (!task.isGeneral) {
      if (filters.client !== 'all' && task.clientId !== filters.client) return false;
      if (filters.postType !== 'all' && task.postType !== filters.postType) return false;
    }
    
    // Filtros específicos de tarefas
    if (task.isGeneral) {
      if (filters.category !== 'all' && task.category !== filters.category) return false;
    }
    
    // Filtro de status (para ambos)
    if (filters.status !== 'all' && task.statusId !== filters.status) return false;
    
    return true;
  });
}, [tasks, taskTypeFilter, filters]);
```

---

## 🎨 Visual Final Proposto

### Header Unificado:
```
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  [Hoje]  [◄]  [►]     Janeiro 2026     [Diária] [Semanal] [Mensal] [Lista] │
│                                                                             │
│  ┌─────────┐ ┌──────────┐  │  [Cliente ▼] [Tipo ▼] [Status ▼]  [+ Nova] │
│  │ 📱 Posts│ │ ✓ Tarefas│  │                                               │
│  └─────────┘ └──────────┘  │                                               │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

### Características:
- **Sticky Header**: Fica fixo ao rolar (opcional)
- **Espaçamento**: Padding consistente
- **Cores**: Usar o degradê azul/roxo nos elementos ativos
- **Animações**: Transições suaves ao mostrar/ocultar filtros
- **Responsivo**: Adapta-se bem a diferentes tamanhos de tela

---

## ✅ Benefícios da Solução

1. **UX Melhorada:**
   - Todos os controles em um lugar lógico
   - Filtros contextuais (só aparecem quando fazem sentido)
   - Visual limpo e moderno estilo SaaS

2. **Funcionalidade Completa:**
   - Controle claro de Posts vs Tarefas
   - Filtros funcionam corretamente para ambos os tipos
   - Filtro de categoria para tarefas gerais

3. **Responsividade:**
   - Funciona bem em todas as visualizações
   - Adapta-se a diferentes tamanhos de tela
   - Mobile-friendly

4. **Manutenibilidade:**
   - Código organizado e claro
   - Fácil de estender no futuro
   - Componentes reutilizáveis

---

## 🚀 Próximos Passos (Após Aprovação)

1. Refatorar header em componente separado
2. Implementar toggle chips Posts/Tarefas
3. Implementar filtros contextuais inteligentes
4. Adicionar filtro de categoria
5. Ajustar layout responsivo
6. Adicionar animações e transições
7. Testar em todas as visualizações

---

## 📝 Notas de Implementação

- Manter compatibilidade com código existente
- Usar os mesmos padrões de design (degradê azul/roxo)
- Garantir acessibilidade (keyboard navigation, ARIA labels)
- Testar performance (memoização adequada)
- Considerar persistência de filtros (localStorage opcional)
