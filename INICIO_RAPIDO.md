# 🚀 Flow ERP - Início Rápido

## ⚡ Começar em 3 Passos

### 1️⃣ Iniciar Tudo
```
Clique duas vezes em: start.bat
```

**O que acontece:**
- ✅ Inicia Docker (Postgres)
- ✅ Inicia API (porta 3000)
- ✅ Inicia Frontend (porta 5173)
- ✅ Abre 2 terminais automaticamente

⏱️ **Aguarde ~10 segundos** para os servidores iniciarem completamente

### 2️⃣ Testar Sistema
```
Clique duas vezes em: test-auto.bat
```

**Valida:**
- ✅ Docker rodando
- ✅ API funcionando
- ✅ Frontend carregando
- ✅ Endpoints de autenticação

### 3️⃣ Acessar Aplicação
```
http://localhost:5173
```

---

## 🛑 Parar Tudo

```
Clique duas vezes em: stop.bat
```

Para Docker e todos os processos Node.

---

## 📁 Arquivos Importantes

| Arquivo | Descrição | Quando Usar |
|---------|-----------|-------------|
| **start.bat** | Iniciar tudo | Sempre que ligar o PC |
| **test-auto.bat** | Testar sistema | Após iniciar / Para validar |
| **stop.bat** | Parar tudo | Ao finalizar trabalho |
| test-token-expiration.ps1 | Teste de tokens | Desenvolvimento |
| TESTE_RAPIDO.md | Guia de testes | Desenvolvimento |

---

## 🌐 URLs do Sistema

| Serviço | URL | Descrição |
|---------|-----|-----------|
| **Frontend** | http://localhost:5173 | Aplicação principal |
| **API** | http://localhost:3000 | Backend REST |
| **API Docs** | http://localhost:3000/api | Swagger/OpenAPI |
| **Health** | http://localhost:3000/health | Status da API |

---

## 🔧 Comandos Manuais (Avançado)

Se precisar rodar manualmente:

### Docker
```powershell
docker compose up -d     # Iniciar
docker compose down      # Parar
docker compose logs -f   # Ver logs
```

### API
```powershell
cd apps/api
npm run start:dev
```

### Frontend
```powershell
npm run dev
```

---

## ❓ Problemas Comuns

### "Docker não está rodando"
**Solução:** Inicie o Docker Desktop

### "Porta já está em uso"
**Solução:**
```powershell
# Ver o que está usando a porta 3000
netstat -ano | findstr :3000

# Matar processo (substitua PID)
taskkill /PID <numero> /F
```

### "Cannot connect to localhost"
**Solução:**
1. Execute `.\start.bat`
2. Aguarde 10 segundos
3. Execute `.\test-auto.bat` para validar
4. Se falhar, olhe os logs nos terminais abertos

### "npm: command not found"
**Solução:** Instale Node.js (https://nodejs.org)

---

## 🧪 Testar Expiração de Token

Para testar o sistema de refresh token:

```powershell
# 1. Configurar tempo curto de expiração
.\test-token-expiration.ps1 setup

# 2. Reiniciar API
cd apps/api
npm run start:dev

# 3. Testar navegação após 30 segundos

# 4. Restaurar tempos normais
.\test-token-expiration.ps1 restore
```

**Documentação completa:** `TESTE_TOKEN_EXPIRACAO.md`

---

## 💡 Dicas

- 🔄 **Sempre rode `.\start.bat`** quando ligar o computador
- 🧪 **Use `.\test-auto.bat`** para verificar se está tudo OK
- 🛑 **Use `.\stop.bat`** antes de desligar ou fazer backup
- 📝 **Logs estão nos terminais** que abrem automaticamente
- 🐛 **Console do navegador (F12)** mostra erros do frontend

---

## 🎯 Fluxo Ideal de Trabalho

```
1. Ligar PC
2. .\start.bat (clique duplo)
3. Aguardar 10 segundos
4. .\test-auto.bat (opcional, para validar)
5. Abrir http://localhost:5173
6. Trabalhar normalmente
7. .\stop.bat (ao terminar)
```

---

## 📚 Documentação Adicional

- **TESTE_TOKEN_EXPIRACAO.md** - Guia completo de testes de token
- **TESTE_RAPIDO.md** - Teste rápido (5 minutos)
- **README.md** - Documentação do projeto
- **test-token-helper.js** - Helper de testes para o navegador

---

**Pronto! Agora é só clicar em `start.bat` e começar! 🚀**
