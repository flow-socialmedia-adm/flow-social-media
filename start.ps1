# Flow ERP - Script de Inicialização Automática
# Este script inicia Docker, Postgres, API e Frontend

# Cores
$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "    FLOW ERP - Iniciando Sistema    " -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Etapa 1: Verificar Docker
Write-Host "[1/6] Verificando Docker..." -ForegroundColor Yellow

if (Get-Command docker -ErrorAction SilentlyContinue) {
    $dockerStatus = docker ps 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Docker esta rodando" -ForegroundColor Green
    } else {
        Write-Host "Docker nao esta rodando!" -ForegroundColor Red
        Write-Host "   Por favor, inicie o Docker Desktop e tente novamente." -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "Docker nao encontrado!" -ForegroundColor Red
    Write-Host "   Por favor, instale o Docker Desktop." -ForegroundColor Yellow
    exit 1
}

# Etapa 2: Iniciar Postgres
Write-Host ""
Write-Host "[2/6] Iniciando Postgres..." -ForegroundColor Yellow

docker compose up -d postgres 2>&1 | Out-Null

# Etapa 3: Aguardar Postgres ficar pronto
Write-Host "[3/6] Aguardando Postgres ficar pronto..." -ForegroundColor Yellow

$postgresReady = $false
$maxAttempts = 30
$attempt = 0

while (-not $postgresReady -and $attempt -lt $maxAttempts) {
    try {
        $health = docker inspect --format='{{.State.Health.Status}}' flow-erp-postgres 2>&1
        if ($health -eq "healthy") {
            $postgresReady = $true
            Write-Host "Postgres esta pronto!" -ForegroundColor Green
        } else {
            Write-Host "   Tentativa $($attempt + 1)/$maxAttempts - Status: $health" -ForegroundColor Gray
            Start-Sleep -Seconds 2
            $attempt++
        }
    } catch {
        Write-Host "   Tentativa $($attempt + 1)/$maxAttempts - Aguardando..." -ForegroundColor Gray
        Start-Sleep -Seconds 2
        $attempt++
    }
}

if (-not $postgresReady) {
    Write-Host "Postgres nao ficou pronto a tempo!" -ForegroundColor Red
    Write-Host "   Verifique os logs: docker logs flow-erp-postgres" -ForegroundColor Yellow
    exit 1
}

# Etapa 4: Verificar arquivos .env
Write-Host ""
Write-Host "[4/6] Verificando arquivos .env..." -ForegroundColor Yellow

# Criar apps/api/.env se não existir (preferir .env.example versionado)
if (-not (Test-Path "apps/api/.env")) {
    if (Test-Path "apps/api/.env.example") {
        Write-Host "   Copiando apps/api/.env a partir de .env.example..." -ForegroundColor Gray
        Copy-Item "apps/api/.env.example" "apps/api/.env"
        Write-Host "   apps/api/.env criado (revise segredos se necessário)" -ForegroundColor Green
    } else {
        Write-Host "   Criando apps/api/.env (template mínimo; falta apps/api/.env.example)" -ForegroundColor Gray
        $apiEnv = @"
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://flow:flow@localhost:5432/flow?schema=public
JWT_ACCESS_SECRET=change-me-access-secret-min-16-chars
JWT_REFRESH_SECRET=change-me-refresh-secret-min-16
JWT_ACCESS_EXPIRES=900s
JWT_REFRESH_EXPIRES=7d
CORS_ORIGINS=http://localhost:5173
FX_BASE_URL=https://api.exchangerate.host
SEED_DEV=false
S3_ENDPOINT=
S3_REGION=auto
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_BUCKET=
CREDENTIALS_ENCRYPTION_KEY=
GOOGLE_CLIENT_ID=
"@
        Set-Content -Path "apps/api/.env" -Value $apiEnv -NoNewline
        Write-Host "   apps/api/.env criado" -ForegroundColor Green
    }
}

# Criar prisma/.env se não existir
if (-not (Test-Path "prisma/.env")) {
    if (Test-Path "prisma/.env.example") {
        Write-Host "   Copiando prisma/.env a partir de .env.example..." -ForegroundColor Gray
        Copy-Item "prisma/.env.example" "prisma/.env"
        Write-Host "   prisma/.env criado" -ForegroundColor Green
    } else {
        Write-Host "   Criando prisma/.env (fallback; falta prisma/.env.example)" -ForegroundColor Gray
        Set-Content -Path "prisma/.env" -Value 'DATABASE_URL=postgresql://flow:flow@localhost:5432/flow?schema=public' -NoNewline
        Write-Host "   prisma/.env criado" -ForegroundColor Green
    }
}

Write-Host "Arquivos .env prontos" -ForegroundColor Green

# Etapa 5: Verificar dependências
Write-Host ""
Write-Host "[5/6] Verificando dependencias..." -ForegroundColor Yellow

if (-not (Test-Path "apps/api/node_modules")) {
    Write-Host "   Instalando dependencias da API..." -ForegroundColor Gray
    Push-Location apps/api
    npm install --silent
    Pop-Location
    Write-Host "   Dependencias da API instaladas" -ForegroundColor Green
}

if (-not (Test-Path "node_modules")) {
    Write-Host "   Instalando dependencias do Frontend..." -ForegroundColor Gray
    npm install --silent
    Write-Host "   Dependencias do Frontend instaladas" -ForegroundColor Green
}

Write-Host "Dependencias prontas" -ForegroundColor Green

# Etapa 6: Executar migrations
Write-Host ""
Write-Host "[6/6] Executando migrations..." -ForegroundColor Yellow

Push-Location apps/api
try {
    npx prisma migrate deploy --schema=../../prisma/schema.prisma 2>&1 | Out-Null
    Write-Host "Database atualizado" -ForegroundColor Green
} catch {
    Write-Host "Erro ao executar migrations (pode ser normal se ja rodou antes)" -ForegroundColor Yellow
}
Pop-Location

# Tudo pronto
Write-Host ""
Write-Host "=======================================" -ForegroundColor Green
Write-Host "    SISTEMA PRONTO PARA INICIAR!    " -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
Write-Host ""

Write-Host "Abrindo terminais..." -ForegroundColor Cyan
Write-Host ""

# Abrir terminal para API
Write-Host "API: http://localhost:3000" -ForegroundColor White
$apiScript = @"
Write-Host '=======================================' -ForegroundColor Blue
Write-Host '          FLOW ERP - API' -ForegroundColor Blue
Write-Host '=======================================' -ForegroundColor Blue
Write-Host ''
Write-Host 'Servidor: http://localhost:3000' -ForegroundColor White
Write-Host 'Docs: http://localhost:3000/api' -ForegroundColor White
Write-Host ''
Set-Location '$PWD\apps\api'
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host 'Build da API falhou.' -ForegroundColor Red; pause; exit 1 }
npm run start:dev
"@
Start-Process powershell -ArgumentList "-NoExit", "-Command", $apiScript

Start-Sleep -Seconds 2

# Abrir terminal para Frontend
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
$frontendScript = @"
Write-Host '=======================================' -ForegroundColor Blue
Write-Host '        FLOW ERP - FRONTEND' -ForegroundColor Blue
Write-Host '=======================================' -ForegroundColor Blue
Write-Host ''
Write-Host 'Aplicacao: http://localhost:5173' -ForegroundColor White
Write-Host ''
Set-Location '$PWD'
npm run dev
"@
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendScript

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "   Terminais abertos com sucesso!   " -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "API rodando em:      http://localhost:3000" -ForegroundColor Green
Write-Host "Frontend rodando em: http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "Dica: Aguarde ~10 segundos para os servidores iniciarem" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para rodar testes: .\test-auto.ps1" -ForegroundColor Cyan
Write-Host "Para parar tudo: .\stop.ps1" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pressione Enter para fechar esta janela..." -ForegroundColor Gray
$null = Read-Host
