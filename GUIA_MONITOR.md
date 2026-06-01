# 🔍 Guia do Monitor de Erros

## 🚀 Como Usar

### **Método 1: Clique Duplo (Recomendado)**
```
Clique 2x em: monitor-erros.bat
```
- Monitora continuamente
- Atualiza a cada 5 segundos
- Pressione Ctrl+C para parar

### **Método 2: PowerShell (Uma Vez)**
```powershell
.\monitor-erros.ps1
```
- Executa uma análise única
- Mostra resultado e sai

### **Método 3: PowerShell (Contínuo)**
```powershell
.\monitor-erros.ps1 -Continuous
```
- Monitora continuamente
- Atualiza a cada 5 segundos

---

## 📊 O Que o Monitor Detecta

### **✅ Verificações Realizadas:**

#### **1. Processos**
- ✅ Docker Postgres rodando
- ✅ Processos Node ativos
- ❌ Serviços parados

#### **2. API (NestJS)**
- ✅ Compilação sem erros
- ✅ Aplicação iniciada
- ✅ Rotas mapeadas
- ❌ Erros de runtime
- ❌ Erros de compilação

#### **3. Frontend (Vite)**
- ✅ Vite iniciado
- ✅ Servidor rodando
- ❌ Erros de compilação
- ❌ **Loop de reload** (causa tela preta)
- ❌ Problemas de Fast Refresh
- ⚠️ Warnings excessivos

#### **4. Conexão HTTP**
- ✅ Frontend responde
- ✅ HTML com conteúdo
- ✅ Elemento root presente
- ✅ Scripts carregados
- ❌ HTML vazio (tela preta)
- ❌ Sem elemento root

#### **5. Problemas Específicos**
- ❌ Loop infinito de renders
- ❌ Erros de sintaxe
- ❌ Módulos não encontrados
- ⚠️ Problemas de memória
- ⚠️ Erros de CORS

---

## 🎯 Interpretando os Resultados

### **Tela Preta - Possíveis Causas:**

#### **1. Loop de Reload**
```
❌ ERRO: LOOP DE RELOAD DETECTADO! (15 reloads)
   Isso pode causar tela preta!
```
**Solução:** Há um problema no código causando reloads infinitos

#### **2. HTML Vazio**
```
❌ ERRO: HTML muito pequeno: 234 bytes (possível tela preta)
```
**Solução:** Frontend não está compilando corretamente

#### **3. Elemento Root Ausente**
```
❌ ERRO: Elemento root NÃO encontrado (tela preta provável)
```
**Solução:** React não está montando no DOM

#### **4. Loop Infinito de Renders**
```
❌ ERRO: LOOP INFINITO DE RENDERS DETECTADO no código React!
   Causa: useEffect ou setState em loop
```
**Solução:** Problema no código React (useEffect sem dependencies)

---

### **Travamento de Navegação - Possíveis Causas:**

#### **1. Erros de Runtime**
```
❌ ERRO: Erros de runtime na API: 3
```
**Solução:** API está falhando em requisições

#### **2. Processos Parados**
```
❌ ERRO: Docker Postgres não está rodando
```
**Solução:** Execute `.\start.bat`

#### **3. Warnings Excessivos**
```
⚠️ AVISO: Muitos warnings: 25 (pode afetar performance)
```
**Solução:** Corrigir warnings no código

---

## 📋 Exemplo de Saída

### **Sistema Saudável:**
```
═══════════════════════════════════════════════════════════
       🔍 FLOW ERP - MONITOR DE ERROS ATIVO
═══════════════════════════════════════════════════════════

───────────────────────────────────────
🔧 Verificando Processos
───────────────────────────────────────
✅ OK: Docker Postgres rodando
✅ OK: Processos Node ativos: 2

───────────────────────────────────────
📡 Analisando API (NestJS)
───────────────────────────────────────
✅ OK: NestJS iniciado com sucesso
✅ OK: Compilação sem erros
✅ OK: Rotas mapeadas: 30

───────────────────────────────────────
🌐 Analisando Frontend (Vite)
───────────────────────────────────────
✅ OK: Vite iniciado em 4681ms
✅ OK: Servidor rodando em: http://localhost:5173/
ℹ️  INFO: Warnings encontrados: 6 (normais)

───────────────────────────────────────
🌐 Testando Conexão com Frontend
───────────────────────────────────────
✅ OK: Frontend responde: HTTP 200
✅ OK: Conteúdo HTML presente: 15234 bytes
✅ OK: Elemento root encontrado
✅ OK: Scripts carregados: 3

═══════════════════════════════════════════════════════════
📊 RESUMO
═══════════════════════════════════════════════════════════
✅ Nenhum problema detectado!
```

### **Sistema com Problemas:**
```
═══════════════════════════════════════════════════════════
📊 RESUMO
═══════════════════════════════════════════════════════════

❌ PROBLEMAS CRÍTICOS (3):
   [ERRO] LOOP DE RELOAD DETECTADO! (15 reloads)
   [ERRO] HTML muito pequeno: 234 bytes (possível tela preta)
   [ERRO] Elemento root NÃO encontrado (tela preta provável)

⚠️  AVISOS (2):
   [AVISO] Muitos warnings: 25 (pode afetar performance)
   [AVISO] Problemas de Fast Refresh: 8 ocorrências
```

---

## 🔧 Ações Recomendadas

### **Se detectar Loop de Reload:**
1. Pare os servidores: `.\stop.bat`
2. Verifique o código recente (App.tsx)
3. Remova logs de debug excessivos
4. Reinicie: `.\start.bat`

### **Se detectar Tela Preta:**
1. Abra o console do navegador (F12)
2. Procure por erros em vermelho
3. Execute o monitor: `.\monitor-erros.bat`
4. Siga as recomendações do monitor

### **Se detectar Travamento:**
1. Verifique se API está respondendo
2. Verifique logs no console
3. Limpe cache: `localStorage.clear()` no console
4. Recarregue a página (Ctrl+F5)

---

## 💡 Dicas

1. **Execute o monitor ANTES de reportar problemas**
   - Ele mostrará exatamente o que está errado

2. **Deixe rodando em modo contínuo**
   - `.\monitor-erros.bat`
   - Monitora em tempo real

3. **Copie a saída do resumo**
   - Facilita comunicar o problema

4. **Verifique os logs completos**
   - Frontend: `c:\Users\Mariana S\.cursor\projects\d-Projetos-Flow-ERP\terminals\7.txt`
   - API: `c:\Users\Mariana S\.cursor\projects\d-Projetos-Flow-ERP\terminals\6.txt`

---

## 🎯 Fluxo de Diagnóstico

```
1. Sistema com problema
   ↓
2. Execute: .\monitor-erros.bat
   ↓
3. Veja o RESUMO
   ↓
4. Se houver ERROS CRÍTICOS:
   - Siga ações recomendadas
   - Corrija o código
   - Reinicie sistema
   ↓
5. Execute monitor novamente
   ↓
6. Confirme: ✅ Nenhum problema detectado!
```

---

## 📞 Suporte

Se o monitor detectar problemas que você não sabe resolver:

1. **Copie a saída completa do monitor**
2. **Tire screenshot da tela**
3. **Abra o console do navegador (F12)**
4. **Copie os erros em vermelho**
5. **Reporte com todas essas informações**

---

**Monitor criado para detectar:**
- ✅ Tela preta
- ✅ Travamento de navegação
- ✅ Loops infinitos
- ✅ Erros de compilação
- ✅ Problemas de conexão
- ✅ Issues de performance

**Use sempre que houver problemas! 🔍**
