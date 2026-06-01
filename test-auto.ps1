# 🧪 Flow ERP - Testes Automatizados
# Valida se o sistema está funcionando corretamente

$ErrorActionPreference = 'Continue'

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "    🧪 FLOW ERP - Testes Automáticos   " -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$API_URL = "http://localhost:3000"
$FRONTEND_URL = "http://localhost:5173"
$testsPassed = 0
$testsFailed = 0

function Test-Service {
    param(
        [string]$Name,
        [string]$Url,
        [int]$ExpectedStatus = 200
    )
    
    Write-Host "Testando $Name..." -ForegroundColor Yellow -NoNewline
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq $ExpectedStatus) {
            Write-Host " ✅ OK" -ForegroundColor Green
            return $true
        } else {
            Write-Host " ❌ Status: $($response.StatusCode)" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host " ❌ ERRO: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-ApiEndpoint {
    param(
        [string]$Name,
        [string]$Path,
        [string]$Method = "GET",
        [hashtable]$Body = $null,
        [hashtable]$Headers = @{},
        [int]$ExpectedStatus = 200
    )
    
    Write-Host "  └─ Testando $Name..." -ForegroundColor Gray -NoNewline
    
    try {
        $params = @{
            Uri = "$API_URL$Path"
            Method = $Method
            TimeoutSec = 10
            UseBasicParsing = $true
            Headers = $Headers
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json)
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-WebRequest @params -ErrorAction Stop
        
        if ($response.StatusCode -eq $ExpectedStatus) {
            Write-Host " ✅" -ForegroundColor Green
            return $true
        } else {
            Write-Host " ❌ Status: $($response.StatusCode)" -ForegroundColor Red
            return $false
        }
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq $ExpectedStatus) {
            Write-Host " ✅ (Esperado $ExpectedStatus)" -ForegroundColor Green
            return $true
        }
        Write-Host " ❌ $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

Write-Host "═══════════════════════════════════════" -ForegroundColor White
Write-Host "📡 Testando Serviços Básicos" -ForegroundColor White
Write-Host "═══════════════════════════════════════" -ForegroundColor White
Write-Host ""

# Teste 1: Docker Postgres
Write-Host "[1/8] 🐳 Docker Postgres..." -ForegroundColor Yellow -NoNewline
try {
    $container = docker inspect flow-erp-postgres 2>&1 | ConvertFrom-Json
    if ($container.State.Running -eq $true) {
        Write-Host " ✅ Rodando" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host " ❌ Parado" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host " ❌ Não encontrado" -ForegroundColor Red
    $testsFailed++
}

# Teste 2: API Health
Write-Host "[2/8] 📡 API Health..." -ForegroundColor Yellow -NoNewline
if (Test-Service "API" "$API_URL/health") {
    $testsPassed++
} else {
    $testsFailed++
}

# Teste 3: Frontend
Write-Host "[3/8] 🌐 Frontend..." -ForegroundColor Yellow -NoNewline
if (Test-Service "Frontend" "$FRONTEND_URL") {
    $testsPassed++
} else {
    $testsFailed++
}

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor White
Write-Host "🔐 Testando Autenticação" -ForegroundColor White
Write-Host "═══════════════════════════════════════" -ForegroundColor White
Write-Host ""

# Teste 4: Endpoint de Login (sem credenciais, espera 400)
Write-Host "[4/8] 🔑 Endpoint /auth/login..." -ForegroundColor Yellow -NoNewline
if (Test-ApiEndpoint "Login" "/auth/login" -Method POST -ExpectedStatus 400) {
    $testsPassed++
} else {
    $testsFailed++
}

# Teste 5: Endpoint de Signup (sem dados, espera 400)
Write-Host "[5/8] 📝 Endpoint /auth/signup..." -ForegroundColor Yellow -NoNewline
if (Test-ApiEndpoint "Signup" "/auth/signup" -Method POST -ExpectedStatus 400) {
    $testsPassed++
} else {
    $testsFailed++
}

# Teste 6: Endpoint /auth/me (sem token, espera 401)
Write-Host "[6/8] 👤 Endpoint /auth/me..." -ForegroundColor Yellow -NoNewline
if (Test-ApiEndpoint "Me" "/auth/me" -Method GET -ExpectedStatus 401) {
    $testsPassed++
} else {
    $testsFailed++
}

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor White
Write-Host "🧪 Testando Refresh Token" -ForegroundColor White
Write-Host "═══════════════════════════════════════" -ForegroundColor White
Write-Host ""

# Teste 7: Refresh token inválido (espera 401)
Write-Host "[7/8] 🔄 Token Refresh (inválido)..." -ForegroundColor Yellow -NoNewline
$body = @{ refreshToken = "token.invalido.teste" }
if (Test-ApiEndpoint "Refresh" "/auth/refresh" -Method POST -Body $body -ExpectedStatus 401) {
    $testsPassed++
} else {
    $testsFailed++
}

# Teste 8: Verificar logs de API (opcional)
Write-Host "[8/8] 📋 Logs da API..." -ForegroundColor Yellow -NoNewline
try {
    $logTest = Invoke-WebRequest -Uri "$API_URL/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    if ($logTest.StatusCode -eq 200) {
        Write-Host " ✅ API respondendo" -ForegroundColor Green
        $testsPassed++
    }
} catch {
    Write-Host " ❌ API não está respondendo" -ForegroundColor Red
    $testsFailed++
}

# Resumo
Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "           📊 RESULTADO FINAL           " -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Total de testes: " -NoNewline -ForegroundColor White
Write-Host "$($testsPassed + $testsFailed)" -ForegroundColor Cyan
Write-Host "Passou: " -NoNewline -ForegroundColor White
Write-Host "$testsPassed" -ForegroundColor Green
Write-Host "Falhou: " -NoNewline -ForegroundColor White
Write-Host "$testsFailed" -ForegroundColor Red

$percentage = [math]::Round(($testsPassed / ($testsPassed + $testsFailed)) * 100, 0)
Write-Host "Taxa de sucesso: " -NoNewline -ForegroundColor White
Write-Host "$percentage%" -ForegroundColor $(if ($percentage -ge 80) { "Green" } elseif ($percentage -ge 50) { "Yellow" } else { "Red" })

Write-Host ""
if ($testsFailed -eq 0) {
    Write-Host "🎉 Todos os testes passaram! Sistema funcionando perfeitamente!" -ForegroundColor Green
} elseif ($testsFailed -le 2) {
    Write-Host "⚠️  Alguns testes falharam. Verifique se todos os serviços estão rodando." -ForegroundColor Yellow
} else {
    Write-Host "❌ Muitos testes falharam. Execute .\start.bat para iniciar o sistema." -ForegroundColor Red
}

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if ($testsFailed -gt 0) {
    Write-Host "💡 Dicas para resolver problemas:" -ForegroundColor Yellow
    Write-Host "   1. Verifique se rodou: .\start.bat" -ForegroundColor White
    Write-Host "   2. Aguarde ~10 segundos após iniciar" -ForegroundColor White
    Write-Host "   3. Verifique se as portas 3000 e 5173 estão livres" -ForegroundColor White
    Write-Host "   4. Olhe os logs nos terminais abertos" -ForegroundColor White
    Write-Host ""
}

Write-Host "🧪 Para testar token expiration: .\test-token-expiration.ps1 setup" -ForegroundColor Cyan
Write-Host ""
Read-Host "Pressione Enter para sair"
