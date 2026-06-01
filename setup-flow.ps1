# Salve como setup-flow.ps1 e execute no PowerShell a partir da raiz do projeto

$ErrorActionPreference = 'Stop'

# 1) Postgres
Write-Host "==> Subindo Postgres..."
docker compose up -d postgres
Start-Sleep -Seconds 3
Write-Host "==> Habilitando pgcrypto..."
docker exec -i flow-erp-postgres psql -U flow -d flow -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

# 2) Envs
Write-Host "==> prisma/.env (se ausente)"
if (!(Test-Path "prisma/.env")) {
  if (Test-Path "prisma/.env.example") {
    Copy-Item "prisma/.env.example" "prisma/.env"
  } else {
    Set-Content -Path "prisma/.env" -Value 'DATABASE_URL=postgresql://flow:flow@localhost:5432/flow?schema=public' -NoNewline
  }
}

Write-Host "==> apps/api/.env (se ausente)"
if (!(Test-Path "apps/api/.env")) {
  if (Test-Path "apps/api/.env.example") {
    Copy-Item "apps/api/.env.example" "apps/api/.env"
  } else {
    $envContent = @"
PORT=3000
NODE_ENV=development
JWT_ACCESS_SECRET=dev-access-secret-xx
JWT_REFRESH_SECRET=dev-refresh-secret-xx
JWT_ACCESS_EXPIRES=900s
JWT_REFRESH_EXPIRES=7d
DATABASE_URL=postgresql://flow:flow@localhost:5432/flow?schema=public
S3_ENDPOINT=
S3_REGION=auto
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_BUCKET=flow-erp
FX_BASE_URL=https://api.exchangerate.host
CREDENTIALS_ENCRYPTION_KEY=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
CORS_ORIGINS=http://localhost:5173
GOOGLE_CLIENT_ID=
SEED_DEV=false
"@
    Set-Content -Path "apps/api/.env" -Value $envContent -NoNewline
  }
}

# 3) Instalar deps e Prisma
Write-Host "==> Instalando dependências e preparando Prisma..."
Push-Location apps/api
npm i --no-audit --no-fund
Pop-Location
# Executa Prisma a partir da raiz para evitar conflito de .env duplo
npx prisma generate --schema prisma/schema.prisma
npx prisma migrate deploy --schema prisma/schema.prisma

# 4) Seed (agency + owner)
Write-Host "==> Gerando hash bcrypt..."
$apiPath = Resolve-Path "apps/api"
Push-Location $apiPath
$jsPath = Join-Path (Get-Location) "hash-bcrypt.cjs"
$code   = 'const bcrypt=require("bcrypt"); bcrypt.hash("admin123",10).then(h=>{ console.log(h); }).catch(e=>{ console.error(e); process.exit(1); });'
Set-Content -Path $jsPath -Value $code -NoNewline
$hash = node $jsPath
Remove-Item $jsPath -Force
Pop-Location
$hash = $hash.Trim()
Pop-Location

$agencyId = [guid]::NewGuid().Guid
$env:AGENCY_ID = $agencyId

$sqlFile = Join-Path $env:TEMP "seed_flow.sql"
$sql = @"
INSERT INTO "Agency" (id,name,email,"baseCurrency","planTier","subscriptionStatus","maxUsers")
VALUES ('$agencyId','Flow Demo','demo@flow.test','BRL','plan_1','active',3);
INSERT INTO "User" (id,"agencyId",email,"passwordHash","fullName",role,permissions)
VALUES (gen_random_uuid(),'$agencyId','owner@flow.test','$hash','Owner','owner','[]')
ON CONFLICT (email,"agencyId") DO NOTHING;
"@
Set-Content -Path $sqlFile -Value $sql -NoNewline
Write-Host "==> Inserindo seed (agencyId=$agencyId)..."
Get-Content -Raw $sqlFile | docker exec -i flow-erp-postgres psql -U flow -d flow -v ON_ERROR_STOP=1 -f -
Remove-Item $sqlFile -Force

# 5) Iniciar API em background
Write-Host "==> Iniciando API em background..."
Start-Process -FilePath "npm" -ArgumentList "run start:dev" -WorkingDirectory "apps/api" -WindowStyle Minimized

# 6) Aguardar /health
Write-Host "==> Aguardando /health..."
$ok=$false; for($i=0;$i -lt 30;$i++){ try { $r=Invoke-RestMethod http://localhost:3000/health; if($r.ok){ $ok=$true; break } } catch {}; Start-Sleep 2 }
if(-not $ok){ throw "API não respondeu no tempo esperado" }

# 7) Login e /auth/me
Write-Host "==> Fazendo login..."
$resp = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/auth/login" -ContentType "application/json" -Body (@{ email="owner@flow.test"; password="admin123" } | ConvertTo-Json)
$token = $resp.accessToken
$headers = @{ Authorization = "Bearer $token" }

Write-Host "==> /auth/me"
$me = Invoke-RestMethod -Headers $headers -Uri "http://localhost:3000/auth/me"

"`nAGENCY_ID=$($env:AGENCY_ID)"
"ACCESS_TOKEN=$token"
"ME_RESPONSE:"
$me | ConvertTo-Json -Depth 5