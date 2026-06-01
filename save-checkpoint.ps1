param (
    [string]$Message = "Checkpoint automático"
)

# Verifica se existe repositório .git
if (-not (Test-Path ".git")) {
    Write-Host "Nenhum repositório Git encontrado nesta pasta." -ForegroundColor Red
    Write-Host "Execute antes: git init" -ForegroundColor Yellow
    exit 1
}

# Verifica mudanças
$gitStatus = git status --porcelain
if (-not $gitStatus) {
    Write-Host "Nenhuma alteração para salvar. Working tree clean." -ForegroundColor Yellow
    exit 0
}

# Adiciona tudo
Write-Host "Adicionando arquivos..." -ForegroundColor Cyan
git add .

# Faz commit
Write-Host "Salvando checkpoint..." -ForegroundColor Cyan
git commit -m "Checkpoint: $Message"

# Mostra último commit
$lastCommit = git log --oneline -1
Write-Host ""
Write-Host "Checkpoint salvo com sucesso!" -ForegroundColor Green
Write-Host "Commit: $lastCommit" -ForegroundColor Green
