param(
    [switch]$Force = $false,
    [switch]$Quiet = $false
)

Write-Host "=== Flow ERP • Reset do Banco (Prisma) ===" -ForegroundColor Cyan

# 1) Verifica DATABASE_URL
if (-not $env:DATABASE_URL) {
    Write-Host "Variável de ambiente DATABASE_URL não encontrada." -ForegroundColor Yellow
    Write-Host "Defina-a antes de continuar. Exemplo:" -ForegroundColor Yellow
    Write-Host '$env:DATABASE_URL = "postgresql://user:pass@localhost:5432/flow_erp?schema=public"' -ForegroundColor DarkGray
    if (-not $Force) { exit 1 }
}

# 2) Confirmação destrutiva
if (-not $Force) {
    $answer = Read-Host "Isto irá APAGAR todos os dados do banco configurado em DATABASE_URL. Digite YES para confirmar"
    if ($answer -ne "YES") {
        Write-Host "Operação cancelada." -ForegroundColor Yellow
        exit 0
    }
}

# 3) Executa reset via Prisma
Write-Host "`n[1/3] Resetando banco de dados (prisma migrate reset)..." -ForegroundColor Cyan
npx prisma migrate reset --force --skip-seed --schema prisma/schema.prisma
if ($LASTEXITCODE -ne 0) {
    Write-Host "Falha ao executar prisma migrate reset." -ForegroundColor Red
    exit 1
}

# 4) Gera Prisma Client (raiz)
Write-Host "[2/3] Gerando Prisma Client (raiz)..." -ForegroundColor Cyan
npx prisma generate --schema prisma/schema.prisma
if ($LASTEXITCODE -ne 0) {
    Write-Host "Falha ao gerar Prisma Client (raiz)." -ForegroundColor Red
    exit 1
}

# 5) Gera Prisma Client no contexto da API (opcional, mas recomendado)
Write-Host "[3/3] Gerando Prisma Client (apps/api)..." -ForegroundColor Cyan
npm --prefix apps/api run prisma:generate | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Aviso: falha ao gerar client via script da API. Verifique apps/api/package.json." -ForegroundColor Yellow
} else {
    if (-not $Quiet) { Write-Host "Client da API gerado com sucesso." -ForegroundColor Green }
}

Write-Host "`nReset concluído com sucesso!" -ForegroundColor Green
Write-Host "Agora você pode reiniciar a API e o Front e testar o login/signup." -ForegroundColor Green











