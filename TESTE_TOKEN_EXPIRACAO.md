# 🧪 Guia de Testes - Expiração de Token

## Método 1: Reduzir Tempo de Expiração (⚡ Mais Rápido)

### Passo 1: Editar arquivo .env da API

Abra `apps/api/.env` e altere estas linhas:

```env
# ANTES (15 minutos)
JWT_ACCESS_EXPIRES=900s
JWT_REFRESH_EXPIRES=7d

# DEPOIS (30 segundos para access, 2 minutos para refresh)
JWT_ACCESS_EXPIRES=30s
JWT_REFRESH_EXPIRES=120s
```

### Passo 2: Reiniciar a API

```powershell
# No terminal da API (Ctrl+C para parar)
cd apps/api
npm run start:dev
```

### Passo 3: Testar no Frontend

1. **Login normalmente** na aplicação
2. **Aguarde 35 segundos** (token access expira em 30s)
3. **Navegue entre páginas** (Dashboard → Clientes → Agenda)
4. **Observe o comportamento**:
   - ✅ Sistema deve fazer refresh automático
   - ✅ Navegação deve funcionar sem travar
   - ✅ Veja logs no console do navegador

5. **Aguarde mais 90 segundos** (refresh token expira)
6. **Tente navegar novamente**
7. **Resultado esperado**:
   - ✅ Sistema detecta que refresh falhou
   - ✅ Redireciona automaticamente para login
   - ✅ Não trava a interface

### Passo 4: Restaurar tempos originais

```env
JWT_ACCESS_EXPIRES=900s
JWT_REFRESH_EXPIRES=7d
```

---

## Método 2: Forçar Expiração via DevTools (🔧 Sem Reiniciar)

### Passo 1: Abrir DevTools

1. `F12` ou `Ctrl+Shift+I` no navegador
2. Ir para aba **Console**

### Passo 2: Executar script para expirar tokens

```javascript
// Limpar tokens manualmente
localStorage.removeItem('flow.tokens');
console.log('✅ Tokens removidos!');

// Agora tente navegar entre páginas
// Sistema deve redirecionar para login
```

### Passo 3: Simular token expirado (mais realista)

```javascript
// Pegar tokens atuais
const tokens = JSON.parse(localStorage.getItem('flow.tokens') || '{}');
console.log('Tokens atuais:', tokens);

// Simular token corrompido
localStorage.setItem('flow.tokens', JSON.stringify({
  accessToken: 'token.invalido.aqui',
  refreshToken: 'refresh.invalido.aqui'
}));

console.log('✅ Tokens corrompidos! Tente navegar agora.');
// Sistema deve tentar refresh, falhar, e redirecionar para login
```

---

## Método 3: Monitorar Logs no Console (👀 Durante Teste)

### Abra o Console do navegador e observe os logs:

```
[api] fetch start /auth/me
[api] 401 detected /auth/me
[api] refresh start
[api] refresh ok
[api] retrying original /auth/me
✅ Refresh automático funcionou!

// Se refresh falhar:
[api] refresh failed { status: 401 }
[api] returning 401 after refresh failure
[AuthContext] tokens cleared, logging out
[App] user lost, redirecting to login
✅ Logout automático funcionou!
```

---

## Método 4: Teste de Múltiplos Cliques (🖱️ Race Condition)

### Objetivo: Testar se múltiplas requisições simultâneas funcionam

1. **Reduzir tempo de token** (Método 1)
2. **Aguardar expiração**
3. **Clicar rapidamente** em várias páginas seguidas:
   - Dashboard → Clientes → Agenda → Financeiro
4. **Resultado esperado**:
   - ✅ Apenas 1 tentativa de refresh
   - ✅ Outras requisições aguardam na fila
   - ✅ Todas recebem novo token ou erro consistente
   - ✅ Não trava

### Observar no Console:

```
[api] 401 detected /clients
[api] 401 detected /tasks
[api] 401 detected /agencies/me
[api] refresh start
[api] waiting for refresh { queueSize: 2, url: /tasks }
[api] waiting for refresh { queueSize: 3, url: /agencies/me }
[api] refresh ok
[api] refresh done, releasing queue { released: 3, success: true }
[api] retrying original /clients
[api] retrying original /tasks
[api] retrying original /agencies/me
✅ Todas as requisições foram retriadas com sucesso!
```

---

## 🎯 Checklist de Validação

Use esta lista para garantir que tudo está funcionando:

- [ ] **Refresh Automático**: Token expira, sistema renova automaticamente
- [ ] **Navegação Fluida**: Não trava durante refresh
- [ ] **Logout Automático**: Quando refresh falha, redireciona para login
- [ ] **Sem Loops**: Não fica tentando refresh infinitamente
- [ ] **Múltiplas Requisições**: Race condition tratada corretamente
- [ ] **Cache Limpo**: Após logout, não aparecem dados antigos
- [ ] **Logs Informativos**: Console mostra o que está acontecendo

---

## 🐛 Problemas Comuns e Soluções

### "Sistema não está fazendo refresh"
- Verifique se JWT_ACCESS_EXPIRES está configurado corretamente
- Confirme que a API reiniciou após mudar o .env

### "Trava em 'waiting for refresh'"
- Isso foi corrigido! Se ainda acontecer, verifique se salvou todos os arquivos

### "Não redireciona para login"
- Abra o console e procure por erros
- Verifique se o AuthContext está montado corretamente

### "Erro de CORS"
- Verifique CORS_ORIGINS no .env da API
- Certifique-se que VITE_API_URL aponta para a API correta

---

## 📊 Teste de Performance

### Script para simular carga:

```javascript
// No console do navegador
async function testeStress() {
  console.log('🚀 Iniciando teste de stress...');
  
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(
      fetch('http://localhost:3000/agencies/me', {
        headers: {
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('flow.tokens')).accessToken}`
        }
      }).then(r => ({ status: r.status, i }))
    );
  }
  
  const results = await Promise.all(promises);
  console.log('✅ Resultados:', results);
  console.log('Todas retornaram status:', new Set(results.map(r => r.status)));
}

// Executar teste
testeStress();
```

---

## ✅ Teste Automatizado (Opcional)

Crie um arquivo de teste E2E se quiser automatizar:

```typescript
// test/auth-expiration.e2e.spec.ts
describe('Token Expiration', () => {
  it('should refresh token automatically', async () => {
    // Login
    // Wait for token to expire
    // Navigate between pages
    // Verify no errors
  });
  
  it('should redirect to login when refresh fails', async () => {
    // Login
    // Corrupt refresh token
    // Try to navigate
    // Verify redirected to login
  });
});
```

---

## 🎓 Dicas Finais

1. **Sempre teste em ambiente DEV primeiro**
2. **Monitore o console do navegador** durante os testes
3. **Use tempos curtos** (30s/120s) apenas para testes
4. **Restaure configurações** após terminar
5. **Teste em diferentes navegadores** (Chrome, Firefox, Edge)

**Boa sorte com os testes! 🚀**
