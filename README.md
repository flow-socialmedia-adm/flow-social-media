# 🚀 Flow ERP - Social Media ERP/CRM

Sistema completo de gestão para agências de mídia social e freelancers.

## ⚡ Início Rápido (1 Minuto)

### Windows

**Clique duas vezes em:**
```
start.bat
```

**Pronto!** O sistema irá:
- ✅ Iniciar Docker (Postgres)
- ✅ Iniciar API (http://localhost:3000)
- ✅ Iniciar Frontend (http://localhost:5173)

Aguarde ~10 segundos e acesse: **http://localhost:5173**

### Validar Sistema

**Clique duas vezes em:**
```
test-auto.bat
```

### Parar Tudo

**Clique duas vezes em:**
```
stop.bat
```

---

## 📚 Documentação

| Arquivo | Descrição |
|---------|-----------|
| **[INICIO_RAPIDO.md](INICIO_RAPIDO.md)** | Guia rápido de início |
| **[TESTE_TOKEN_EXPIRACAO.md](TESTE_TOKEN_EXPIRACAO.md)** | Testes de autenticação |
| **[TESTE_RAPIDO.md](TESTE_RAPIDO.md)** | Teste em 5 minutos |

---

## 🛠️ Pré-requisitos

- **Node.js** 20+ ([Download](https://nodejs.org))
- **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop))
- **PowerShell** (Já vem no Windows)

---

## 🧩 Configuração local (primeira vez)

Os ficheiros `apps/api/.env` e `prisma/.env` **não são versionados** (apenas os exemplos abaixo).

| Origem (versionado) | Destino (local, não commitar) |
|----------------------|-------------------------------|
| `apps/api/.env.example` | `apps/api/.env` |
| `prisma/.env.example` | `prisma/.env` |

Na raiz do repositório (PowerShell):

```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item prisma/.env.example prisma/.env
```

Em `apps/api/.env`, altere `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` para valores fortes (mínimo **16 caracteres** cada; a API valida isto ao arrancar — ver `apps/api/src/app.module.ts`).

### Caminho rápido (Windows)

1. Garanta **Node.js 20+** e **Docker Desktop** instalados.
2. Execute `start.bat` ou `.\start.ps1` na raiz: sobe o Postgres, cria os `.env` em falta (copiando dos `.env.example` quando existem), instala dependências se necessário, executa migrations e abre a API e o frontend em janelas separadas.

### Caminho manual (PowerShell)

1. `docker compose up -d postgres` e aguarde o contentor `flow-erp-postgres` ficar pronto.
2. Copie os ficheiros `.env.example` como na tabela acima e ajuste variáveis.
3. Instale dependências: `npm install` na raiz e `npm install` dentro de `apps/api`.
4. Aplicar migrations (comando igual ao usado em `start.ps1`, a partir da raiz):

```powershell
cd apps/api
npx prisma migrate deploy --schema ../../prisma/schema.prisma
cd ../..
```

5. **API:** `cd apps/api; npm run start:dev`
6. **Frontend:** na raiz, `npm run dev`

### Script alternativo: `setup-flow.ps1`

`.\setup-flow.ps1` sobe o Postgres, garante `.env` (copiando dos exemplos quando possível), instala dependências da API, corre `prisma generate` / `migrate deploy`, seed de demonstração e verifica `/health`. Útil para montar um ambiente completo de teste; leia o script antes de usar em dados reais.

### Frontend (raiz do projeto)

O Vite lê variáveis do diretório raiz (`vite.config.ts` — `loadEnv`). Para apontar a API, login Google e Gemini, use um ficheiro local **não versionado** (por exemplo `.env.local` na raiz — o padrão `*.local` já está no `.gitignore`):

```env
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=
VITE_GOOGLE_API_KEY=
GEMINI_API_KEY=
```

Sem `VITE_API_URL`, o cliente HTTP em `lib/api.ts` pode ficar sem URL válida.

---

## 🏗️ Arquitetura

```
Flow ERP/
├── apps/
│   └── api/              # NestJS + Prisma API
├── components/           # React Components
├── contexts/            # React Contexts
├── lib/                 # Utilities
├── prisma/              # Database Schema
├── start.bat           # 🚀 Iniciar tudo
├── test-auto.bat       # 🧪 Testar sistema
└── stop.bat            # 🛑 Parar tudo
```

---

## 🌟 Funcionalidades

### ✅ Gestão Completa
- **Dashboard** com métricas em tempo real
- **Clientes** com cadastro completo
- **Agenda** e gerenciamento de tarefas
- **Financeiro** com controle de receitas/despesas
- **Workflows** personalizados
- **Equipe** com controle de permissões

### 🔐 Autenticação Robusta
- Login com email/senha
- Login com Google OAuth
- JWT com refresh token automático
- Sistema de permissões por função

### 💳 Assinaturas e Pagamentos
- Integração com Stripe
- Planos flexíveis (Agência, Estúdio, Empresa)
- Trial de 10 dias
- Gestão de assinaturas

### 🤖 IA Integrada
- Chat com IA para suporte
- Sugestões inteligentes
- Análise de dados

---

## 🔧 Comandos Úteis

### Scripts Automatizados (.bat)
```bash
start.bat           # Iniciar tudo
test-auto.bat       # Testar sistema
stop.bat            # Parar tudo
```

### Scripts PowerShell
```powershell
.\start.ps1                          # Iniciar tudo (detalhado)
.\setup-flow.ps1                     # Postgres + env + prisma + seed demo (ver script)
.\test-auto.ps1                      # Testes automatizados
.\stop.ps1                           # Parar tudo
.\test-token-expiration.ps1 setup    # Modo teste de tokens
.\test-token-expiration.ps1 restore  # Restaurar tempos normais
```

### Docker
```bash
docker compose up -d          # Iniciar containers
docker compose down           # Parar containers
docker compose logs -f        # Ver logs
docker exec -it flow-erp-postgres psql -U flow -d flow  # Acessar banco
```

### API (Manual)
```bash
cd apps/api
npm install                   # Instalar dependências
npm run start:dev            # Modo desenvolvimento
npm run build                # Build para produção
npm run start:prod           # Rodar produção
npx prisma studio            # Abrir Prisma Studio
```

### Frontend (Manual)
```bash
npm install                   # Instalar dependências
npm run dev                  # Modo desenvolvimento
npm run build                # Build para produção
npm run preview              # Preview do build
```

---

## 🌐 URLs

| Serviço | URL | Descrição |
|---------|-----|-----------|
| **Frontend** | http://localhost:5173 | Aplicação React |
| **API** | http://localhost:3000 | Backend NestJS |
| **API Docs** | http://localhost:3000/api | Swagger UI |
| **Health Check** | http://localhost:3000/health | Status da API |

---

## 🧪 Testes

### Testes Automatizados
```bash
.\test-auto.bat
```

**Valida:**
- ✅ Docker Postgres rodando
- ✅ API respondendo (health check)
- ✅ Frontend carregando
- ✅ Endpoints de autenticação
- ✅ Sistema de refresh token

### Testes de Token (Desenvolvimento)

**1. Ativar modo teste (tokens curtos):**
```powershell
.\test-token-expiration.ps1 setup
```

**2. Reiniciar API:**
```bash
cd apps/api
npm run start:dev
```

**3. Testar navegação:**
- Fazer login
- Aguardar 35 segundos
- Navegar entre páginas
- Observar refresh automático

**4. Restaurar configuração:**
```powershell
.\test-token-expiration.ps1 restore
```

**Documentação completa:** [TESTE_TOKEN_EXPIRACAO.md](TESTE_TOKEN_EXPIRACAO.md)

---

## 🐛 Solução de Problemas

### Docker não está rodando
**Solução:** Inicie o Docker Desktop

### Porta já em uso
```powershell
# Ver processo na porta
netstat -ano | findstr :3000

# Matar processo
taskkill /PID <numero> /F

# Ou use stop.bat para parar tudo
.\stop.bat
```

### Erro de conexão com banco
```bash
# Recriar containers
docker compose down -v
docker compose up -d

# Aguardar e executar migrations
cd apps/api
npx prisma migrate deploy --schema ../../prisma/schema.prisma
```

### Sistema travando após navegação
Isso foi corrigido! Se ainda acontecer:
1. Verifique se está na última versão
2. Rode `.\test-auto.bat` para validar
3. Veja os logs no console do navegador (F12)

---

## 🔐 Variáveis de ambiente (referência)

- **Modelo completo da API:** `apps/api/.env.example` (sem segredos reais).
- **Prisma CLI:** `prisma/.env.example` (apenas `DATABASE_URL`).
- **Validação ao arrancar:** `apps/api/src/app.module.ts` (Joi) — exige `DATABASE_URL`, `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` (mín. 16 caracteres), com defaults para `PORT`, `NODE_ENV`, expiração de JWT, `FX_BASE_URL`, etc.
- **Opcionais na API:** `CORS_ORIGINS`, variáveis `S3_*`, `CREDENTIALS_ENCRYPTION_KEY`, `GOOGLE_CLIENT_ID` (login Google), `SEED_DEV`.
- **Frontend:** ver na secção **Configuração local (primeira vez)** o bloco «Frontend (raiz do projeto)».

**Nota:** `start.bat` / `start.ps1` criam os `.env` em falta copiando dos `.env.example` quando existem; caso contrário usam um template mínimo embutido.

---

## 📊 Stack Tecnológica

### Backend
- **NestJS** - Framework Node.js
- **Prisma** - ORM
- **PostgreSQL** - Banco de dados
- **JWT** - Autenticação
- **Passport** - Estratégias de auth
- **Swagger** - Documentação API

### Frontend
- **React** 19
- **TypeScript**
- **Vite** - Build tool
- **Tailwind CSS** - Estilização

### DevOps
- **Docker** - Containerização
- **Docker Compose** - Orquestração

---

## 🚀 Deploy

### Produção

1. **Build da API:**
```bash
cd apps/api
npm run build
```

2. **Build do Frontend:**
```bash
npm run build
```

3. **Configurar variáveis de ambiente de produção**

4. **Executar migrations:**
```bash
npx prisma migrate deploy
```

5. **Iniciar aplicação:**
```bash
cd apps/api
npm run start:prod
```

---

## 📝 Convenções de Código

- **Commits:** Usar commits semânticos
- **Branches:** `feature/nome`, `fix/nome`, `docs/nome`
- **TypeScript:** Sempre tipar adequadamente
- **Testes:** Testar funcionalidades críticas
- **Logs:** Usar sistema de logs estruturado

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto é proprietário. Todos os direitos reservados.

---

## 🆘 Suporte

- **Documentação:** Veja os arquivos `.md` na raiz do projeto
- **Issues:** Abra uma issue no repositório
- **Logs:** Verifique os terminais abertos pelo `start.bat`

---

## 🎉 Começar Agora!

```bash
# 1. Clone o repositório (se ainda não fez)
git clone <url-do-repo>
cd "Flow ERP"

# 2. Clique duas vezes em start.bat
# OU execute:
.\start.bat

# 3. Aguarde ~10 segundos

# 4. Acesse: http://localhost:5173

# 5. Faça login ou crie uma conta
```

**Pronto para usar! 🚀**

---

<div align="center">
  <strong>Made with ❤️ for Social Media Agencies</strong>
</div>
