# ⚡ Teste Rápido - 5 Minutos

## 🎯 Método Mais Rápido

### 1️⃣ Ativar Modo Teste (PowerShell)
```powershell
.\test-token-expiration.ps1 setup
```

### 2️⃣ Reiniciar API
```powershell
cd apps/api
npm run start:dev
```

### 3️⃣ No Navegador

**A) Abrir Console (F12) e carregar helper:**
```javascript
// Copie e cole todo o conteúdo de: test-token-helper.js
// Depois execute:
tokenTestHelper.help()
```

**B) Fazer login e testar:**
1. Login normalmente
2. Executar no console: `tokenTestHelper.showTokens()`
3. Aguardar 35 segundos ⏱️
4. Navegar: Dashboard → Clientes → Agenda
5. Observar logs no console

**Resultado Esperado:**
```
✅ [api] 401 detected
✅ [api] refresh start
✅ [api] refresh ok
✅ [api] retrying original
✅ Navegação funcionou!
```

### 4️⃣ Testar Expiração Completa

Aguardar mais 90 segundos e navegar novamente:

**Resultado Esperado:**
```
✅ [api] refresh failed
✅ [AuthContext] tokens cleared, logging out
✅ [App] user lost, redirecting to login
✅ Redirecionou para login!
```

### 5️⃣ Restaurar Configuração Normal
```powershell
.\test-token-expiration.ps1 restore
cd apps/api
npm run start:dev
```

---

## 🚀 Testes Extras (Opcional)

### Teste de Race Condition
```javascript
// No console do navegador após 35 segundos
tokenTestHelper.stressTest(20)
// Deve mostrar todas as requisições com mesmo status
```

### Simular Token Inválido
```javascript
tokenTestHelper.corruptTokens()
// Navegar entre páginas
// Deve redirecionar para login
```

### Monitorar em Tempo Real
```javascript
tokenTestHelper.watchTokens()
// Deixar rodando e navegar pelo sistema
// Ver tokens sendo atualizados
// Parar: tokenTestHelper.stopWatch()
```

---

## 📊 Checklist Mínimo

- [ ] Refresh automático funciona (35s)
- [ ] Logout automático funciona (2min)
- [ ] Não trava durante refresh
- [ ] Redireciona para login quando sessão expira

---

## ❓ Problemas?

Consulte: **TESTE_TOKEN_EXPIRACAO.md** (guia completo)
