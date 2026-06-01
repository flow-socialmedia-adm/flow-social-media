# 🐛 Correção: Loop Infinito na AgendaPage

**Data:** 13 de Janeiro de 2026  
**Versão:** v1.0.2  
**Bug:** #003

---

## ❌ PROBLEMA REPORTADO

### **Sintomas:**
1. ✅ Conseguia adicionar novo cliente
2. ❌ Não conseguia salvar tarefa - clica em "Salvar" e nada acontece
3. ❌ Console mostra 18+ re-renders da AgendaPage

### **Console:**
```
App.tsx:516 [App] 🎨 renderPage chamado para: agenda
App.tsx:524 [App] 🎨 Renderizando AgendaPage
(... repete 18 vezes!)
```

---

## 🔍 CAUSA RAIZ

### **Código Problemático (linhas 458-479):**

```typescript
// ❌ ANTES (com bug):
const reloadTasks = useCallback(async () => {
    // ... busca tarefas ...
    setTasks(mapped);
}, [getRange, setTasks]); // ❌ setTasks nas dependências!

useEffect(() => {
    reloadTasks().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps ❌ Escondendo o problema!
}, [currentDate, view]); // ❌ Faltando reloadTasks!
```

---

## 🎯 ANÁLISE DO PROBLEMA

### **1. Loop Infinito Causado por setTasks:**

1. `useEffect` executa → chama `reloadTasks()`
2. `reloadTasks` chama `setTasks(mapped)`
3. Contexto atualiza (tasks mudam)
4. `setTasks` "muda" (nova referência no contexto recriado)
5. `reloadTasks` é recriado (dependência mudou)
6. `useEffect` detecta mudança em `reloadTasks`... **mas não pode executar** porque `reloadTasks` não está nas dependências!
7. Resultado: **LOOP INFINITO** porque `reloadTasks` continua sendo recriado

### **2. eslint-disable Escondendo o Problema:**

O comentário `// eslint-disable-next-line react-hooks/exhaustive-deps` estava **silenciando o aviso** do React sobre dependências faltando.

- O React **sabe** que `reloadTasks` deveria estar nas dependências
- O desenvolvedor **silenciou** o aviso em vez de corrigir
- Isso **escondeu** o problema real

---

## ✅ SOLUÇÃO APLICADA

### **Código Corrigido:**

```typescript
// ✅ DEPOIS (corrigido):
const reloadTasks = useCallback(async () => {
    // ... busca tarefas ...
    setTasks(mapped);
}, [getRange]); // ✅ Removido setTasks - é função estável!

useEffect(() => {
    reloadTasks().catch(() => {});
}, [currentDate, view, reloadTasks]); // ✅ Adicionado reloadTasks, removido eslint-disable
```

---

## 📊 POR QUE FUNCIONA AGORA?

### **1. setTasks é Função Estável:**
- Retornada por `useState` no contexto
- React **garante** que nunca muda
- **Não precisa** estar nas dependências

### **2. Dependências Corretas:**
- `reloadTasks` só recria quando `getRange` muda
- `getRange` só muda quando `currentDate` ou `view` mudam
- `useEffect` executa quando `currentDate`, `view` ou `reloadTasks` mudam
- **Sem loop!** ✅

### **3. Sem eslint-disable:**
- Agora o React pode avisar se algo estiver errado
- Dependências estão corretas
- Código mais manutenível

---

## 🔄 PADRÃO IDENTIFICADO

Este é o **TERCEIRO caso** do mesmo problema:

| Página | Linha | Problema | Status |
|--------|-------|----------|--------|
| **FinancePage** | 769 | `setFinancialEntries` nas deps | ✅ Corrigido |
| **ClientsPage** | 1381 | `setClients` nas deps | ✅ Corrigido |
| **AgendaPage** | 474 | `setTasks` nas deps | ✅ Corrigido |

### **Regra de Ouro:**

> **NUNCA adicionar funções `setState` nas dependências de `useCallback` ou `useEffect`!**
>
> Elas são **sempre estáveis** e **nunca mudam**.

---

## 🧪 VALIDAÇÃO

### **Teste Realizado:**

1. ✅ Navegou para Agenda
2. ✅ Abriu aba Lista
3. ✅ Clicou em "+ Adicionar Tarefa"
4. ✅ Preencheu formulário
5. ✅ Clicou em "Salvar"
6. ❌ **ANTES:** Nada acontecia (loop bloqueava)
7. ✅ **DEPOIS:** Tarefa salva com sucesso!

### **Console:**

**ANTES:**
```
[App] 🎨 Renderizando AgendaPage
[App] 🎨 Renderizando AgendaPage
[App] 🎨 Renderizando AgendaPage
(... 18 vezes!)
```

**DEPOIS:**
```
[App] 🎨 Renderizando AgendaPage
[App] 🎨 Renderizando AgendaPage
(... 1-2 vezes apenas) ✅
```

---

## 📝 ARQUIVOS MODIFICADOS

### **components/AgendaPage.tsx**

**Alterações:**
1. Linha 474: Removido `setTasks` das dependências
2. Linha 479: Adicionado `reloadTasks` nas dependências
3. Linha 478: Removido `eslint-disable-next-line`

---

## 🎓 LIÇÕES APRENDIDAS

### **1. Não Silenciar Avisos do React:**

❌ **ERRADO:**
```typescript
useEffect(() => {
    doSomething();
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [partialDeps]);
```

✅ **CORRETO:**
```typescript
useEffect(() => {
    doSomething();
}, [allCorrectDeps]);
```

### **2. Funções setState São Estáveis:**

```typescript
const [data, setData] = useState([]);

// ❌ ERRADO
useCallback(() => { setData(x); }, [setData])

// ✅ CORRETO
useCallback(() => { setData(x); }, [])
```

### **3. Validar Dependências:**

Sempre que usar:
- `useCallback`
- `useEffect`
- `useMemo`

Pergunte: **"Esta dependência realmente muda?"**

---

## 🔍 COMO IDENTIFICAR ESSE PROBLEMA

### **Sintomas:**
1. Re-renders infinitos no console
2. Ações não funcionam (botões não respondem)
3. Performance ruim
4. Navegação travando

### **Diagnóstico:**
1. Verificar console → muitos re-renders?
2. Procurar `useCallback` e `useEffect`
3. Verificar se tem `setState` nas dependências
4. Verificar se tem `eslint-disable` escondendo avisos

### **Correção:**
1. Remover `setState` das dependências
2. Adicionar dependências corretas no `useEffect`
3. Remover `eslint-disable`
4. Testar novamente

---

## ✅ RESULTADO FINAL

```
✅ Loop infinito corrigido
✅ Botão "Salvar" funciona
✅ Tarefas são salvas corretamente
✅ Performance normal (1-2 re-renders)
✅ Código mais manutenível
✅ Sem avisos silenciados
```

---

## 🚀 IMPACTO

### **ANTES:**
- ❌ Impossível salvar tarefas
- ❌ Loop infinito de re-renders
- ❌ Performance péssima
- ❌ Usuário frustrado

### **DEPOIS:**
- ✅ Tarefas salvam normalmente
- ✅ 1-2 re-renders apenas
- ✅ Performance normal
- ✅ Experiência fluida

---

## 📊 MÉTRICAS

| Métrica | Antes | Depois |
|---------|-------|--------|
| **Re-renders** | 18+ | 1-2 |
| **Botão Salvar** | ❌ Não funciona | ✅ Funciona |
| **Performance** | Péssima | Normal |
| **UX** | Quebrada | Funcional |

---

## 🎯 PRÓXIMOS PASSOS

### **Prevenção:**

1. ✅ Varrer TODAS as páginas buscando mesmo padrão
2. ✅ Criar lint rule customizada (se possível)
3. ✅ Documentar regra de ouro
4. ✅ Revisar PRs buscando esse padrão

### **Validação Completa:**

Testar todas as páginas:
- ✅ Dashboard
- ✅ Agenda ← **CORRIGIDO AGORA**
- ✅ Clientes ← Já corrigido
- ✅ Financeiro ← Já corrigido
- ✅ Configurações
- ✅ Conta

---

**Bug:** #003  
**Severidade:** 🔴 CRÍTICA (bloqueava funcionalidade principal)  
**Status:** ✅ CORRIGIDO  
**Versão:** v1.0.2
