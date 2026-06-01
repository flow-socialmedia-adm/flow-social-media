# Script para restaurar versão estável do Flow ERP
# Usage: .\restaurar-versao-estavel.ps1 [versao]
# Example: .\restaurar-versao-estavel.ps1 v1.0.3

param(
    [string]$Versao = "v1.0.3"
)

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  RESTAURAR VERSÃO ESTÁVEL - Flow ERP" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Verificar se a tag existe
$tagExists = git tag -l $Versao
if (-not $tagExists) {
    Write-Host "❌ ERRO: Tag '$Versao' não encontrada!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Tags disponíveis:" -ForegroundColor Yellow
    git tag -l "v1.0.*"
    Write-Host ""
    exit 1
}

Write-Host "📋 Informações da versão:" -ForegroundColor Cyan
Write-Host ""
git show $Versao --no-patch --pretty=format:"%h - %s (%ad)" --date=short
Write-Host ""
Write-Host ""

# Confirmação
Write-Host "⚠️  ATENÇÃO: Esta ação irá:" -ForegroundColor Yellow
Write-Host "   • Descartar todas as alterações não commitadas" -ForegroundColor White
Write-Host "   • Restaurar o código para a versão $Versao" -ForegroundColor White
Write-Host ""
$confirmacao = Read-Host "Deseja continuar? (S/N)"

if ($confirmacao -ne "S" -and $confirmacao -ne "s") {
    Write-Host ""
    Write-Host "❌ Operação cancelada pelo usuário." -ForegroundColor Red
    Write-Host ""
    exit 0
}

Write-Host ""
Write-Host "🔄 Restaurando versão $Versao..." -ForegroundColor Yellow
Write-Host ""

# Descartar alterações locais
Write-Host "1/3 Descartando alterações locais..." -ForegroundColor Gray
git reset --hard HEAD

# Fazer checkout da tag
Write-Host "2/3 Fazendo checkout da tag $Versao..." -ForegroundColor Gray
git checkout $Versao

# Voltar para a branch master (opcional)
Write-Host "3/3 Criando branch a partir da tag..." -ForegroundColor Gray
$branchName = "stable-$Versao-" + (Get-Date -Format "yyyyMMdd-HHmmss")
git checkout -b $branchName

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ VERSÃO RESTAURADA COM SUCESSO!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Versão: $Versao" -ForegroundColor White
Write-Host "🌿 Branch: $branchName" -ForegroundColor White
Write-Host ""
Write-Host "💡 Próximos passos:" -ForegroundColor Cyan
Write-Host "   1. Execute: .\start.bat" -ForegroundColor White
Write-Host "   2. Acesse: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "📝 Para voltar ao desenvolvimento:" -ForegroundColor Cyan
Write-Host "   git checkout master" -ForegroundColor White
Write-Host ""
