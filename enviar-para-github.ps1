# Script para enviar Flow ERP para o GitHub
# Autor: Gerado automaticamente
# Data: 13/01/2026

param(
    [Parameter(Mandatory=$false)]
    [string]$RepoUrl = ""
)

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "  ENVIAR FLOW ERP PARA O GITHUB" -ForegroundColor Yellow
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""

# Se nao foi passada URL, perguntar
if ([string]::IsNullOrEmpty($RepoUrl)) {
    Write-Host "Cole a URL do repositorio GitHub:" -ForegroundColor Yellow
    Write-Host "   Exemplo: https://github.com/usuario/flow-erp.git" -ForegroundColor Gray
    Write-Host ""
    $RepoUrl = Read-Host "URL"
}

# Validar URL
if ([string]::IsNullOrEmpty($RepoUrl) -or $RepoUrl -notmatch "github\.com") {
    Write-Host ""
    Write-Host "[ERRO] URL invalida!" -ForegroundColor Red
    Write-Host "   A URL deve ser algo como: https://github.com/usuario/flow-erp.git" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "Verificando configuracao atual..." -ForegroundColor Cyan
Write-Host ""

# Verificar se ja tem remote
$existingRemote = git remote get-url origin 2>$null
if ($existingRemote) {
    Write-Host "[ATENCAO] Ja existe um remote 'origin' configurado:" -ForegroundColor Yellow
    Write-Host "   $existingRemote" -ForegroundColor White
    Write-Host ""
    $confirmacao = Read-Host "Deseja substitui-lo? (S/N)"
    
    if ($confirmacao -ne "S" -and $confirmacao -ne "s") {
        Write-Host ""
        Write-Host "[CANCELADO] Operacao cancelada." -ForegroundColor Red
        Write-Host ""
        exit 0
    }
    
    Write-Host ""
    Write-Host "Removendo remote existente..." -ForegroundColor Yellow
    git remote remove origin
}

Write-Host "Resumo do que sera enviado:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Repositorio: $RepoUrl" -ForegroundColor White

# Contar commits
$commitCount = (git rev-list --count HEAD)
Write-Host "   Commits: $commitCount" -ForegroundColor White

# Listar tags
$tags = git tag -l "v1.0.*"
$tagCount = ($tags | Measure-Object).Count
Write-Host "   Tags: $tagCount ($tags)" -ForegroundColor White

# Mostrar ultimo commit
$lastCommit = git log -1 --oneline
Write-Host "   Ultimo commit: $lastCommit" -ForegroundColor White

Write-Host ""
Write-Host "[ATENCAO] Esta operacao ira:" -ForegroundColor Yellow
Write-Host "   - Adicionar remote 'origin' apontando para o GitHub" -ForegroundColor White
Write-Host "   - Fazer push de todos os commits para a branch 'master'" -ForegroundColor White
Write-Host "   - Fazer push de todas as tags (v1.0.0, v1.0.3, etc.)" -ForegroundColor White
Write-Host "   - Configurar tracking da branch master" -ForegroundColor White
Write-Host ""

$confirmacao = Read-Host "Deseja continuar? (S/N)"

if ($confirmacao -ne "S" -and $confirmacao -ne "s") {
    Write-Host ""
    Write-Host "[CANCELADO] Operacao cancelada pelo usuario." -ForegroundColor Red
    Write-Host ""
    exit 0
}

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Green
Write-Host "  INICIANDO ENVIO PARA O GITHUB" -ForegroundColor Green
Write-Host "===============================================================" -ForegroundColor Green
Write-Host ""

# 1. Adicionar remote
Write-Host "1/3 Adicionando remote 'origin'..." -ForegroundColor Cyan
git remote add origin $RepoUrl

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERRO] Falha ao adicionar remote!" -ForegroundColor Red
    Write-Host ""
    exit 1
}

Write-Host "    [OK] Remote adicionado com sucesso!" -ForegroundColor Green
Write-Host ""

# 2. Push dos commits
Write-Host "2/3 Enviando commits para o GitHub..." -ForegroundColor Cyan
Write-Host "    Isso pode demorar alguns segundos..." -ForegroundColor Gray
Write-Host ""

git push -u origin master

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERRO] Falha ao fazer push dos commits!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possiveis causas:" -ForegroundColor Yellow
    Write-Host "   - Voce nao tem permissao para este repositorio" -ForegroundColor White
    Write-Host "   - Voce precisa fazer login no Git" -ForegroundColor White
    Write-Host "   - A URL esta incorreta" -ForegroundColor White
    Write-Host ""
    Write-Host "Para configurar credenciais:" -ForegroundColor Yellow
    Write-Host "   git config --global user.name 'Seu Nome'" -ForegroundColor White
    Write-Host "   git config --global user.email 'seu@email.com'" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "    [OK] Commits enviados com sucesso!" -ForegroundColor Green
Write-Host ""

# 3. Push das tags
Write-Host "3/3 Enviando tags para o GitHub..." -ForegroundColor Cyan
git push origin --tags

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[AVISO] Erro ao enviar tags (mas os commits foram enviados)" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "    [OK] Tags enviadas com sucesso!" -ForegroundColor Green
    Write-Host ""
}

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Green
Write-Host "  FLOW ERP ENVIADO PARA O GITHUB COM SUCESSO!" -ForegroundColor Green
Write-Host "===============================================================" -ForegroundColor Green
Write-Host ""

Write-Host "Repositorio: $RepoUrl" -ForegroundColor White
Write-Host ""
Write-Host "Acesse seu repositorio:" -ForegroundColor Cyan
$repoWebUrl = $RepoUrl -replace "\.git$", ""
Write-Host "   $repoWebUrl" -ForegroundColor White
Write-Host ""

Write-Host "O que foi enviado:" -ForegroundColor Cyan
Write-Host "   [OK] $commitCount commits" -ForegroundColor Green
Write-Host "   [OK] $tagCount tags de versao" -ForegroundColor Green
Write-Host "   [OK] Todo o codigo fonte" -ForegroundColor Green
Write-Host "   [OK] Documentacao completa" -ForegroundColor Green
Write-Host "   [OK] Scripts de automacao" -ForegroundColor Green
Write-Host ""

Write-Host "Proximos passos:" -ForegroundColor Yellow
Write-Host "   1. Acesse o repositorio no GitHub" -ForegroundColor White
Write-Host "   2. Verifique se tudo esta la" -ForegroundColor White
Write-Host "   3. Configure GitHub Actions (opcional)" -ForegroundColor White
Write-Host "   4. Adicione colaboradores (se necessario)" -ForegroundColor White
Write-Host ""

Write-Host "Flow ERP agora esta no GitHub!" -ForegroundColor Green
Write-Host ""
