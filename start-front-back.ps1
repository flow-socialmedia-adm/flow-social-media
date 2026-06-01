# Abre PowerShell para API e Frontend (Docker já deve estar rodando)
$root = "d:\_Projetos\Flow ERP"
$apiCmd = "Write-Host '=======================================' -ForegroundColor Blue; Write-Host '          FLOW ERP - API' -ForegroundColor Blue; Write-Host '=======================================' -ForegroundColor Blue; Write-Host 'Servidor: http://localhost:3000' -ForegroundColor White; Write-Host ''; Set-Location '$root\apps\api'; npm run start:dev"
$frontCmd = "Write-Host '=======================================' -ForegroundColor Blue; Write-Host '        FLOW ERP - FRONTEND' -ForegroundColor Blue; Write-Host '=======================================' -ForegroundColor Blue; Write-Host 'Aplicacao: http://localhost:5173' -ForegroundColor White; Write-Host ''; Set-Location '$root'; npm run dev"

Start-Process powershell -ArgumentList "-NoExit", "-Command", $apiCmd
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontCmd
