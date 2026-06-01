# 🧪 GUIA RÁPIDO DE TESTE NO NAVEGADOR

## ✅ TUDO PRONTO!

Todas as funcionalidades foram implementadas e não há erros. Você pode testar no navegador!

---

## 🚀 O QUE TESTAR

### 1️⃣ **ONBOARDING (3 Camadas)**

#### **CAMADA 1: Setup Inicial**
- Faça login pela primeira vez (ou resete `onboardingCompleted = false` no banco)
- Deve aparecer o **Setup Inicial** perguntando:
  - ✅ "Você trabalha sozinho(a) ou em equipe?" (modo SOLO/TEAM)
  - ✅ "Quer que a gente te guie nos primeiros passos?" (tour guiado)
- Complete o setup e verifique redirecionamento

#### **CAMADA 2: Tour Guiado**
- Aparece no Dashboard se você habilitou no setup
- Deve mostrar 4-5 passos explicando a interface
- Pode avançar, voltar ou pular

#### **CAMADA 3: Onboarding de Tarefas**
- Navegue para **Tarefas** pela primeira vez
- Deve aparecer o onboarding explicando:
  - ✅ Diferença entre Posts e Tarefas Gerais
  - ✅ Como funcionam Posts (cor = status, ícone = ação)
  - ✅ Como ler a agenda

---

### 2️⃣ **MODO SOLO vs TEAM**

#### **Modo SOLO:**
1. Defina agência como `SOLO` (no setup ou via API)
2. Crie um novo POST
3. ✅ Campo "Responsável" **NÃO deve aparecer**
4. ✅ POST criado deve ter `ownerUserId` preenchido automaticamente
5. ✅ Filtros não devem ter opção "Responsável"

#### **Modo TEAM:**
1. Defina agência como `TEAM` (no setup ou via API)
2. Crie um novo POST
3. ✅ Campo "Responsável" **deve aparecer**
4. ✅ Selecione um responsável e crie POST
5. ✅ POST criado deve ter `ownerUserId` do responsável selecionado
6. ✅ Filtros devem ter opção "Responsável"

---

### 3️⃣ **AÇÕES DE POSTS**

1. **Criar um POST:**
   - Cliente: qualquer cliente
   - Tipo: Static/Video/etc
   - Status inicial: "Pauta Criada"

2. **Verificar ações disponíveis:**
   - ✅ Deve aparecer ícone/botão de ação no card do POST
   - ✅ Ação disponível: "Enviar para Produção"

3. **Executar ação:**
   - Clique na ação
   - ✅ Status deve mudar para "Em Produção"
   - ✅ Nova ação disponível: "Enviar para Aprovação"

4. **Testar ações com modais:**
   - **Agendar Post:**
     - Status: "Aprovado"
     - Ação: "Agendar Post"
     - ✅ Modal deve abrir pedindo data e plataforma
   - **Pedir Ajuste:**
     - Status: "Aguardando Aprovação"
     - Ação: "Pedir Ajuste"
     - ✅ Modal deve abrir pedindo notas

5. **Edição manual de status:**
   - Abra um POST existente no modal
   - ✅ Campo "Status" deve estar **desabilitado** (modo leitura)
   - ✅ Mensagem: "(altere via ações)"
   - ✅ Apenas POSTS novos podem ter status inicial selecionado

---

### 4️⃣ **CHIPS EDUCativos**

- Na visualização **Lista** de Tarefas
- Com POSTS visíveis, deve aparecer chips como:
  - ✅ "X em produção prontos para envio"
  - ✅ "X aprovados não agendados"
  - ✅ "X aguardando aprovação"
- Chips aparecem apenas quando há POSTS com esses status

---

### 5️⃣ **TAREFAS GERAIS**

1. Criar uma tarefa geral
2. ✅ Não deve ter ações de POST (apenas posts têm ações)
3. ✅ Status pode ser editado manualmente (diferente de POSTS)
4. ✅ Workflow simples: A Fazer / Em Andamento / Concluído

---

### 6️⃣ **WORKFLOWS FIXOS**

- ✅ Não deve ser possível criar workflows customizados
- ✅ Workflow de POSTS tem 6 status fixos
- ✅ Workflow de Tarefas Gerais tem 3 status fixos
- ✅ Tarefas antigas continuam funcionando (compatibilidade)

---

## 🔍 CHECKLIST RÁPIDO

### ✅ Onboarding
- [ ] Setup inicial aparece após primeiro login
- [ ] Tour guiado aparece no dashboard (se habilitado)
- [ ] Onboarding de tarefas aparece na primeira vez

### ✅ Modo SOLO/TEAM
- [ ] SOLO: campo responsável oculto
- [ ] TEAM: campo responsável visível
- [ ] ownerUserId preenchido automaticamente em SOLO

### ✅ Ações de POSTS
- [ ] Ações aparecem no card do POST
- [ ] Ações contextuais (mudam com status)
- [ ] Modais funcionam (agendar, pedir ajuste)
- [ ] Status não editável manualmente em POSTS

### ✅ UI/UX
- [ ] Chips educativos aparecem
- [ ] Filtros adaptados para modo TEAM
- [ ] Interface responsiva

---

## 🐛 PROBLEMAS COMUNS

**Se algo não funcionar:**

1. **Onboarding não aparece:**
   - Verifique `onboardingCompleted = false` no banco
   - Limpe localStorage do navegador

2. **Ações não aparecem:**
   - Verifique se é um POST (tem `clientId` e `postType`)
   - Verifique se está usando workflow fixo de POSTS
   - Verifique status atual do POST

3. **Campo responsável não aparece/desaparece:**
   - Verifique `agencyMode` no `/auth/me`
   - Force refresh do contexto (`auth.refreshMe()`)

---

## 📝 NOTAS

- **Workflows fixos** são criados automaticamente pelo backend (`ensureDefaults()`)
- **Compatibilidade** com tarefas antigas é mantida
- **Migração** de tarefas antigas é opcional e manual

---

**Divirta-se testando! 🎉**
