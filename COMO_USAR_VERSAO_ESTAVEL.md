# 📚 COMO USAR VERSÕES ESTÁVEIS

## 🎯 Objetivo

As versões estáveis são **pontos de restauração** marcados no Git. Você pode voltar a qualquer versão estável a qualquer momento, garantindo um código funcional e testado.

---

## 📋 Versões Estáveis Disponíveis

### v1.0.3 (13/01/2026) ← **ATUAL**
✅ **Sistema 100% Funcional**
- Tarefa salva com campo de data
- Cliente exclui com confirmação única
- Navegação fluida sem travamentos
- Sem loops infinitos

**Tags Git**: `v1.0.3`

### v1.0.2 (13/01/2026)
✅ Loop infinito AgendaPage corrigido
- Tarefas salvam normalmente
- Performance restaurada

**Tags Git**: `v1.0.2`

### v1.0.1 (13/01/2026)
✅ ClientsPage "Carregando..." corrigido
- Lista de clientes carrega normalmente

**Tags Git**: `v1.0.1`

### v1.0.0 (13/01/2026)
✅ Sistema base funcional
- Autenticação robusta
- Navegação estável
- CRUD completo

**Tags Git**: `v1.0.0-stable`, `v1.0.0`

---

## 🔧 COMO RESTAURAR UMA VERSÃO

### Método 1: Script PowerShell (RECOMENDADO)

```powershell
# Restaurar versão mais recente (v1.0.3)
.\restaurar-versao-estavel.ps1

# Restaurar versão específica
.\restaurar-versao-estavel.ps1 v1.0.2
```

**O que o script faz:**
1. ✅ Verifica se a tag existe
2. ✅ Mostra informações da versão
3. ✅ Pede confirmação
4. ✅ Descarta alterações locais
5. ✅ Restaura o código da versão
6. ✅ Cria uma nova branch de trabalho

---

### Método 2: Git Manual

```bash
# 1. Ver versões disponíveis
git tag -l "v1.0.*"

# 2. Ver detalhes de uma versão
git show v1.0.3 --no-patch

# 3. Restaurar versão (ATENÇÃO: descarta alterações locais!)
git reset --hard HEAD
git checkout v1.0.3

# 4. Criar branch de trabalho (opcional)
git checkout -b stable-v1.0.3-backup

# 5. Voltar ao desenvolvimento
git checkout master
```

---

## ⚠️ AVISOS IMPORTANTES

### ⚠️ Alterações Não Salvas

**CUIDADO!** Restaurar uma versão **descarta todas as alterações não commitadas**.

**Antes de restaurar**:
```bash
# Salvar alterações atuais
git add .
git commit -m "wip: Trabalho em progresso"

# OU criar uma branch de backup
git checkout -b backup-antes-restaurar
git add .
git commit -m "backup: Antes de restaurar versão"
git checkout master
```

---

### ⚠️ Dependências

Após restaurar uma versão, você pode precisar:

```bash
# Reinstalar dependências do frontend
npm install

# Reinstalar dependências do backend
cd apps/api
npm install
```

---

### ⚠️ Banco de Dados

As versões estáveis **NÃO incluem** dados do banco.

Se precisar de dados limpos:
```bash
# Parar serviços
.\stop.bat

# Limpar volumes Docker (CUIDADO: remove todos os dados!)
docker-compose down -v

# Reiniciar
.\start.bat
```

---

## 📊 HISTÓRICO DE MUDANÇAS

### v1.0.3 → v1.0.2
- ✅ Adicionado campo de data no TaskModal
- ✅ Removida confirmação dupla em handleDeleteClient

### v1.0.2 → v1.0.1
- ✅ Removido `setTasks` das dependências de `useCallback`

### v1.0.1 → v1.0.0
- ✅ Removido `setClients` das dependências de `useCallback`
- ✅ Corrigida lógica de renderização do loading

---

## 🎯 QUANDO RESTAURAR

### ✅ Restaurar SE:
- Você fez alterações e o sistema quebrou
- Você quer testar uma versão anterior
- Você precisa de um ponto de partida estável
- Você quer comparar comportamentos

### ❌ NÃO Restaurar SE:
- Você está apenas explorando o código
- Suas alterações estão funcionando
- Você tem trabalho não salvo

---

## 🔍 VERIFICAR VERSÃO ATUAL

```bash
# Ver versão/commit atual
git describe --tags

# Ver último commit
git log -1 --oneline

# Ver todas as tags
git tag -l "v1.0.*"

# Ver branch atual
git branch --show-current
```

---

## 💡 DICAS

### Criar Pontos de Restauração

Se você fez mudanças importantes e quer criar um ponto de restauração:

```bash
# 1. Commit suas alterações
git add .
git commit -m "feat: Minha nova funcionalidade"

# 2. Criar tag
git tag -a v1.1.0 -m "Versão 1.1.0 - Nova funcionalidade X"

# 3. Documentar
# Criar arquivo VERSAO_ESTAVEL_v1.1.0.md
```

---

### Comparar Versões

```bash
# Ver diferenças entre versões
git diff v1.0.2..v1.0.3

# Ver arquivos alterados
git diff --name-only v1.0.2..v1.0.3

# Ver log entre versões
git log v1.0.2..v1.0.3 --oneline
```

---

## 📞 SUPORTE

Se tiver problemas ao restaurar:

1. Verifique se a tag existe: `git tag -l "v1.0.*"`
2. Verifique se tem alterações não salvas: `git status`
3. Salve seu trabalho antes de restaurar
4. Use o script PowerShell (mais seguro)

---

## ✅ CHECKLIST DE RESTAURAÇÃO

Antes de restaurar:
- [ ] Verificar se a versão existe
- [ ] Salvar trabalho atual (commit ou branch)
- [ ] Confirmar que quer descartar alterações
- [ ] Ter backup de dados importantes

Após restaurar:
- [ ] Reinstalar dependências (`npm install`)
- [ ] Reiniciar serviços (`.\start.bat`)
- [ ] Testar funcionalidades críticas
- [ ] Verificar logs de erro

---

**Versão deste guia**: 1.0  
**Última atualização**: 13/01/2026
