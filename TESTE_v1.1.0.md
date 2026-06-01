# 🧪 GUIA DE TESTE - Versão 1.1.0

## ⚡ TESTE RÁPIDO (5 minutos)

### Passo 1: Iniciar o Sistema
```bash
# Execute o arquivo start.bat OU:
npm run dev
```

### Passo 2: Acessar a Agenda
1. Faça login no sistema
2. Navegue até a página **Agenda**
3. ✅ **VERIFIQUE**: A visualização deve abrir em **"Diária"** por padrão

---

## 🎯 CHECKLIST DE TESTES

### ✅ 1. Visualização Padrão Diária

**O que testar:**
- [ ] Ao abrir a Agenda, a view "Diária" está selecionada
- [ ] O header mostra um gradiente roxo/indigo bonito
- [ ] A data está formatada corretamente (dia da semana + data completa)
- [ ] O número do dia está em destaque

**Resultado esperado:**
- Layout vertical limpo
- Header premium com gradiente
- Botão "+" para adicionar tarefa no topo

---

### ✅ 2. Novo Design de Cards (Opção A)

**O que testar:**
- [ ] Todos os cards têm **fundo branco** (modo escuro) ou **cinza claro** (modo claro)
- [ ] Há uma **borda lateral colorida** (cor do status)
- [ ] **Ícones visíveis**:
  - 💼 Briefcase para Posts de Clientes
  - 📋 Calendar para Tarefas Gerais
- [ ] Badge de categoria ("Post de Cliente" ou "Tarefa Geral")
- [ ] Status em badge arredondado
- [ ] Nome do cliente aparece para posts

**Resultado esperado:**
- Visual uniforme e profissional
- Fácil distinção entre posts e tarefas gerais
- Informações bem organizadas

---

### ✅ 3. Ordenação Consistente

**O que testar em CADA visualização:**

#### Diária:
- [ ] Posts de clientes aparecem PRIMEIRO
- [ ] Tarefas gerais aparecem DEPOIS

#### Semanal:
- [ ] Mesma ordem: posts primeiro, tarefas depois

#### Mensal:
- [ ] Mesma ordem em cada dia do mês

#### Lista:
- [ ] Mesma ordem para cada data agrupada

**Como testar:**
1. Crie 1 post de cliente e 1 tarefa geral para o mesmo dia
2. Alterne entre as visualizações
3. Verifique se a ordem é sempre a mesma

**Resultado esperado:**
- Ordem consistente em TODAS as views
- Posts sempre acima das tarefas gerais

---

### ✅ 4. Visualização Lista

**O que testar:**
- [ ] Cards usam o novo design UnifiedTaskCard
- [ ] Layout espaçado e limpo
- [ ] Agrupamento por data funciona
- [ ] Botão "+" aparece em cada grupo de data

**Resultado esperado:**
- Mesmo visual da view diária
- Fácil leitura

---

### ✅ 5. Visualização Mensal

**Desktop:**
- [ ] Cards compactos (CompactTaskCard) nas células
- [ ] Ícone e borda colorida visíveis
- [ ] Máximo de 2 tarefas visíveis por célula
- [ ] Botão "X mais tarefas" funciona
- [ ] Popover mostra todas as tarefas

**Mobile:**
- [ ] Calendário em grid 7x6
- [ ] Ao clicar em um dia, aparece a lista abaixo
- [ ] Lista usa UnifiedTaskCard
- [ ] Bolinhas coloridas nos dias com tarefas

**Resultado esperado:**
- Células organizadas
- Fácil navegação
- Visual consistente

---

### ✅ 6. Modo Claro vs Escuro

**Como testar:**
1. Abra a Agenda em modo escuro
2. Verifique o visual dos cards
3. Alterne para modo claro (configurações do sistema)
4. Recarregue a página
5. Verifique o visual novamente

**Resultado esperado (Modo Escuro):**
- Fundo dos cards: cinza escuro (`#1F2937`)
- Texto: branco/cinza claro
- Ícones com bom contraste

**Resultado esperado (Modo Claro):**
- Fundo dos cards: branco
- Texto: cinza escuro/preto
- Ícones com bom contraste

---

### ✅ 7. Funcionalidades Preservadas

**Drag and Drop:**
- [ ] Arraste uma tarefa entre datas na view semanal
- [ ] Arraste uma tarefa entre células na view mensal
- [ ] Animação de opacidade durante o drag

**Modals:**
- [ ] Botão "+" abre modal de criação
- [ ] Clicar em um card abre modal de edição
- [ ] Salvar funciona corretamente
- [ ] Excluir funciona corretamente

**Filtros:**
- [ ] Filtro por cliente funciona
- [ ] Filtro por tipo de post funciona
- [ ] Filtro por status funciona
- [ ] Toggle de visibilidade de seções funciona

**Navegação:**
- [ ] Setas de navegação entre datas funcionam
- [ ] Botões "Hoje", "Anterior", "Próximo" funcionam

---

## 🎨 TESTE VISUAL DETALHADO

### Visualização Diária

**Elementos a verificar:**
1. **Header do Dia**:
   - Gradiente indigo-purple
   - Dia da semana em fonte grande
   - Data completa legível
   - Número do dia em destaque (direita)

2. **Cards de Tarefas**:
   - Espaçamento de 12px entre cards
   - Sombra suave no hover
   - Ícone dentro de um quadrado com fundo (20% da cor do status)
   - Badge de categoria destacado
   - Status em badge arredondado
   - Indicador de drag (6 pontos) aparece no hover

3. **Empty State**:
   - Ícone de calendário grande
   - Mensagem "Sem tarefas para este dia"

---

## 🐛 POSSÍVEIS PROBLEMAS E SOLUÇÕES

### Problema: Cards não aparecem
**Solução**: Verifique se há tarefas cadastradas para a data selecionada

### Problema: Ordem inconsistente
**Solução**: Limpe o cache do navegador (Ctrl + Shift + R)

### Problema: Visual quebrado
**Solução**: 
1. Verifique se o Tailwind CSS está carregando
2. Inspecione o console do navegador para erros
3. Recompile o projeto: `npm run dev`

### Problema: Ícones não aparecem
**Solução**: Verifique se os imports de `lucide-react` estão corretos

---

## ✅ CRITÉRIOS DE APROVAÇÃO

Para considerar o teste bem-sucedido, TODOS os itens devem estar ✅:

- [ ] Visualização padrão é "Diária"
- [ ] Novo design de cards está aplicado
- [ ] Ordenação é consistente em todas as views
- [ ] Visual funciona bem em modo claro E escuro
- [ ] Drag and drop funciona
- [ ] Todas as funcionalidades anteriores preservadas
- [ ] Sem erros no console do navegador
- [ ] Performance não foi afetada negativamente

---

## 📸 SCREENSHOTS SUGERIDOS

Para documentar a implementação, tire screenshots de:

1. **Visualização Diária** (modo escuro e claro)
2. **Card de Post de Cliente** (close-up)
3. **Card de Tarefa Geral** (close-up)
4. **Visualização Lista**
5. **Visualização Mensal Desktop**
6. **Visualização Mensal Mobile**
7. **Comparação Antes/Depois** (se possível)

---

## 🎉 APROVAÇÃO FINAL

Se todos os testes passaram:
- ✅ A versão 1.1.0 está **APROVADA**
- ✅ Pronta para uso em **PRODUÇÃO**
- ✅ Pode ser marcada como **STABLE**

---

**Boa sorte nos testes!** 🚀

Se encontrar algum problema, relate:
- O que estava fazendo
- O que esperava ver
- O que viu de fato
- Screenshot (se aplicável)
- Console log (F12 → Console)
