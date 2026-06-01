# 🔄 Como Restaurar a Versão Estável

Se você fez alterações e o sistema parou de funcionar, siga este guia para voltar à versão estável v1.0.0.

---

## 🚀 MÉTODO 1: Restauração Automática (RECOMENDADO)

### Windows - Duplo Clique:
```
Clique duas vezes em: restaurar-versao-estavel.bat
```

### Ou via PowerShell:
```powershell
.\restaurar-versao-estavel.ps1
```

**O que o script faz:**
1. ✅ Para todos os serviços
2. ✅ Salva suas alterações atuais (backup automático)
3. ✅ Volta para a versão estável v1.0.0
4. ✅ Limpa e reinstala dependências
5. ✅ Recria o banco de dados
6. ✅ Sistema pronto para uso

**⚠️ ATENÇÃO:** Todas as alterações não commitadas serão salvas no `git stash`

---

## 🔧 MÉTODO 2: Restauração Manual

### Passo a Passo:

#### 1. Parar Serviços
```powershell
.\stop.ps1
```

#### 2. Salvar Alterações Atuais (Opcional)
```powershell
# Criar backup das suas alterações
git stash push -m "Backup antes de restaurar"

# OU criar uma branch com suas alterações
git checkout -b minha-versao-com-problemas
git add .
git commit -m "Salvando alterações antes de restaurar"
```

#### 3. Voltar para Versão Estável
```powershell
git checkout v1.0.0-stable
```

#### 4. Limpar e Reinstalar Dependências
```powershell
# Frontend
Remove-Item -Recurse -Force node_modules
npm install

# API
Remove-Item -Recurse -Force apps\api\node_modules
cd apps\api
npm install
cd ..\..
```

#### 5. Recriar Banco de Dados
```powershell
.\reset-db.ps1
```

#### 6. Iniciar Sistema
```powershell
.\start.bat
```

---

## 📊 VERIFICAR VERSÃO ATUAL

### Ver qual versão está ativa:
```powershell
git describe --tags
# Deve mostrar: v1.0.0-stable
```

### Ver todas as versões disponíveis:
```powershell
git tag
```

### Ver histórico de commits:
```powershell
git log --oneline -10
```

---

## 🔄 RECUPERAR ALTERAÇÕES APÓS RESTAURAR

### Se você usou `git stash`:

```powershell
# Ver backups salvos
git stash list

# Recuperar último backup
git stash pop

# Recuperar backup específico
git stash apply stash@{0}
```

### Se você criou uma branch:

```powershell
# Ver suas branches
git branch -a

# Voltar para sua branch
git checkout minha-versao-com-problemas
```

---

## 🆕 CRIAR NOVA FUNCIONALIDADE A PARTIR DA VERSÃO ESTÁVEL

### Método Recomendado:

```powershell
# 1. Garantir que está na versão estável
git checkout v1.0.0-stable

# 2. Criar nova branch para sua feature
git checkout -b feature/minha-nova-funcionalidade

# 3. Fazer suas alterações...

# 4. Commitar quando estiver funcionando
git add .
git commit -m "feat: Minha nova funcionalidade"

# 5. Se der problema, voltar para estável
git checkout v1.0.0-stable
```

---

## 🚨 PROBLEMAS COMUNS E SOLUÇÕES

### Problema: "modified files, cannot checkout"

**Solução:**
```powershell
# Salvar alterações temporariamente
git stash

# Voltar para estável
git checkout v1.0.0-stable
```

---

### Problema: Dependências não instalam

**Solução:**
```powershell
# Limpar cache do npm
npm cache clean --force

# Deletar node_modules
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force apps\api\node_modules

# Reinstalar
npm install
cd apps\api
npm install
cd ..\..
```

---

### Problema: Banco de dados com erro

**Solução:**
```powershell
# Recriar banco completamente
.\reset-db.ps1

# Ou manualmente:
docker compose down -v
docker compose up -d postgres
# Aguardar ~10 segundos
cd apps\api
npx prisma migrate deploy --schema=../../prisma/schema.prisma
cd ..\..
```

---

### Problema: Docker não inicia

**Solução:**
1. Abrir Docker Desktop manualmente
2. Aguardar inicializar completamente
3. Verificar: `docker ps`
4. Tentar novamente: `.\start.bat`

---

## ✅ CHECKLIST PÓS-RESTAURAÇÃO

Após restaurar, verifique:

- [ ] `git describe --tags` mostra `v1.0.0-stable`
- [ ] Docker está rodando: `docker ps`
- [ ] Postgres está healthy
- [ ] `.\start.bat` executa sem erros
- [ ] API responde: http://localhost:3000
- [ ] Frontend responde: http://localhost:5173
- [ ] Login funciona
- [ ] Navegação entre páginas funciona
- [ ] Sem erros no console do navegador

---

## 📞 ÚLTIMA OPÇÃO: CLONE LIMPO

Se nada funcionar, clone o repositório novamente:

```powershell
# 1. Fazer backup da pasta atual (renomear)
Rename-Item "d:\_Projetos\Flow ERP" "Flow ERP - Backup"

# 2. Clonar repositório novamente
cd "d:\_Projetos"
git clone [URL_DO_SEU_REPOSITORIO] "Flow ERP"
cd "Flow ERP"

# 3. Checkout na versão estável
git checkout v1.0.0-stable

# 4. Instalar e iniciar
npm install
cd apps\api
npm install
cd ..\..
.\start.bat
```

---

## 📚 DOCUMENTAÇÃO ADICIONAL

- **Versão Estável Completa:** `VERSAO_ESTAVEL_v1.0.0.md`
- **Início Rápido:** `INICIO_RAPIDO.md`
- **Guia Completo:** `COMECE_AQUI.txt`
- **Correções Aplicadas:** `CORRECAO_COMPLETA.md`

---

## 🎯 RESUMO RÁPIDO

```powershell
# Restauração rápida (1 comando):
.\restaurar-versao-estavel.bat

# Verificar versão:
git describe --tags

# Iniciar sistema:
.\start.bat

# Acessar:
http://localhost:5173
```

---

**🎉 Sistema restaurado com sucesso!**

Se precisar de ajuda adicional, consulte a documentação completa em `VERSAO_ESTAVEL_v1.0.0.md`.
