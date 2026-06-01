# 🛑 Flow ERP - Stop Master Script
# Para todos os serviços

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Red
Write-Host "    🛑 FLOW ERP - Parando Sistema      " -ForegroundColor Red
Write-Host "═══════════════════════════════════════" -ForegroundColor Red
Write-Host ""

# Parar Docker Compose
Write-Host "[1/2] 🐳 Parando containers Docker..." -ForegroundColor Yellow
docker compose down
Write-Host "✅ Containers parados" -ForegroundColor Green

# Matar processos Node/Nest
Write-Host ""
Write-Host "[2/2] 🔪 Finalizando processos Node..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "✅ Processos finalizados" -ForegroundColor Green

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Green
Write-Host "    ✅ SISTEMA PARADO COM SUCESSO!     " -ForegroundColor Green
Write-Host "═══════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "Para iniciar novamente: .\start.bat" -ForegroundColor Cyan
Write-Host ""
Read-Host "Pressione Enter para sair"
