# Abre 2 janelas do PowerShell: API e Frontend (você acompanha os logs em cada uma)
# Use quando pedir "abra a aplicação" ou "reinicie a aplicação"

$apiPath = "D:\_Projetos\Flow ERP\apps\api"
$frontPath = "D:\_Projetos\Flow ERP"

# 1) PowerShell da API
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$apiPath'; npm run start:dev"

# 2) PowerShell do Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontPath'; npm run dev"
