# 🔍 Flow ERP - Monitor de Erros
# Detecta automaticamente problemas de tela preta e travamento de navegação

param(
    [int]$Seconds = 30,  # Tempo de monitoramento em segundos
    [switch]$Continuous  # Monitoramento contínuo
)

$ErrorActionPreference = 'Continue'

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "       🔍 FLOW ERP - MONITOR DE ERROS ATIVO" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$terminalsPath = "c:\Users\Mariana S\.cursor\projects\d-Projetos-Flow-ERP\terminals"
$frontendLog = "$terminalsPath\7.txt"
$apiLog = "$terminalsPath\6.txt"

$issuesFound = @()
$warnings = @()

# Cores para output
function Write-Error-Custom {
    param([string]$Message)
    Write-Host "[ERRO] $Message" -ForegroundColor Red
    $script:issuesFound += "[ERRO] $Message"
}

function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "[AVISO] $Message" -ForegroundColor Yellow
    $script:warnings += "[AVISO] $Message"
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

# Verificar se os logs existem
Write-Info "Verificando logs..."
if (-not (Test-Path $frontendLog)) {
    Write-Error-Custom "Log do Frontend não encontrado: $frontendLog"
    Write-Host "Execute .\start.bat primeiro!" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $apiLog)) {
    Write-Error-Custom "Log da API não encontrado: $apiLog"
    Write-Host "Execute .\start.bat primeiro!" -ForegroundColor Yellow
    exit 1
}

Write-Success "Logs encontrados"
Write-Host ""

# Função para analisar logs do Frontend
function Analyze-Frontend {
    Write-Host "───────────────────────────────────────" -ForegroundColor Gray
    Write-Host "🌐 Analisando Frontend (Vite)" -ForegroundColor White
    Write-Host "───────────────────────────────────────" -ForegroundColor Gray
    
    $content = Get-Content $frontendLog -Raw -ErrorAction SilentlyContinue
    
    if ([string]::IsNullOrWhiteSpace($content)) {
        Write-Error-Custom "Log do Frontend está vazio"
        return
    }
    
    # Verificar se Vite está rodando
    if ($content -match "VITE.*ready in (\d+) ms") {
        $time = $matches[1]
        Write-Success "Vite iniciado em ${time}ms"
    } else {
        Write-Error-Custom "Vite não está rodando corretamente"
    }
    
    # Verificar porta
    if ($content -match "Local:\s+(http://[^\s]+)") {
        $url = $matches[1]
        Write-Success "Servidor rodando em: $url"
    } else {
        Write-Error-Custom "Porta do servidor não encontrada"
    }
    
    # Detectar erros de compilação
    $compilationErrors = ([regex]::Matches($content, "error|Error|ERROR") | Measure-Object).Count
    if ($compilationErrors -gt 0) {
        Write-Error-Custom "Encontrados $compilationErrors erros de compilação"
    }
    
    # Detectar warnings excessivos
    $warningCount = ([regex]::Matches($content, "warning|Warning") | Measure-Object).Count
    if ($warningCount -gt 20) {
        Write-Warning-Custom "Muitos warnings: $warningCount (pode afetar performance)"
    } elseif ($warningCount -gt 0) {
        Write-Info "Warnings encontrados: $warningCount (normais)"
    }
    
    # Detectar hot reload loops
    $reloadCount = ([regex]::Matches($content, "page reload|hmr reload") | Measure-Object).Count
    if ($reloadCount -gt 10) {
        Write-Error-Custom "LOOP DE RELOAD DETECTADO! ($reloadCount reloads)"
        Write-Host "   Isso pode causar tela preta!" -ForegroundColor Red
    } elseif ($reloadCount -gt 5) {
        Write-Warning-Custom "Muitos reloads: $reloadCount"
    }
    
    # Detectar Fast Refresh issues
    if ($content -match "Could not Fast Refresh") {
        $frCount = ([regex]::Matches($content, "Could not Fast Refresh") | Measure-Object).Count
        Write-Warning-Custom "Problemas de Fast Refresh: $frCount ocorrências"
    }
    
    # Últimas linhas do log (para ver estado atual)
    Write-Host ""
    Write-Host "📋 Últimas 5 linhas do log:" -ForegroundColor Cyan
    $lines = ($content -split "`n") | Select-Object -Last 5
    foreach ($line in $lines) {
        if ($line -match "error|Error|ERROR") {
            Write-Host "   $line" -ForegroundColor Red
        } elseif ($line -match "warning|Warning") {
            Write-Host "   $line" -ForegroundColor Yellow
        } else {
            Write-Host "   $line" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
}

# Função para analisar logs da API
function Analyze-API {
    Write-Host "───────────────────────────────────────" -ForegroundColor Gray
    Write-Host "📡 Analisando API (NestJS)" -ForegroundColor White
    Write-Host "───────────────────────────────────────" -ForegroundColor Gray
    
    $content = Get-Content $apiLog -Raw -ErrorAction SilentlyContinue
    
    if ([string]::IsNullOrWhiteSpace($content)) {
        Write-Error-Custom "Log da API está vazio"
        return
    }
    
    # Verificar se NestJS iniciou
    if ($content -match "Nest application successfully started") {
        Write-Success "NestJS iniciado com sucesso"
    } else {
        Write-Error-Custom "NestJS não iniciou corretamente"
    }
    
    # Verificar compilação
    if ($content -match "Found (\d+) errors") {
        $errors = $matches[1]
        if ($errors -eq "0") {
            Write-Success "Compilação sem erros"
        } else {
            Write-Error-Custom "Erros de compilação: $errors"
        }
    }
    
    # Detectar erros de runtime
    $runtimeErrors = ([regex]::Matches($content, "\[ERROR\]|\[Nest\].*ERROR") | Measure-Object).Count
    if ($runtimeErrors -gt 0) {
        Write-Error-Custom "Erros de runtime na API: $runtimeErrors"
    }
    
    # Verificar rotas mapeadas
    $routesCount = ([regex]::Matches($content, "Mapped \{[^}]+\}") | Measure-Object).Count
    if ($routesCount -gt 0) {
        Write-Success "Rotas mapeadas: $routesCount"
    }
    
    Write-Host ""
}

# Função para verificar processos
function Check-Processes {
    Write-Host "───────────────────────────────────────" -ForegroundColor Gray
    Write-Host "🔧 Verificando Processos" -ForegroundColor White
    Write-Host "───────────────────────────────────────" -ForegroundColor Gray
    
    # Docker
    try {
        $dockerRunning = docker ps --filter "name=flow-erp-postgres" --format "{{.Status}}" 2>$null
        if ($dockerRunning -match "Up") {
            Write-Success "Docker Postgres rodando"
        } else {
            Write-Error-Custom "Docker Postgres não está rodando"
        }
    } catch {
        Write-Error-Custom "Docker não encontrado ou não está rodando"
    }
    
    # Node processes
    $nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        Write-Success "Processos Node ativos: $($nodeProcesses.Count)"
    } else {
        Write-Error-Custom "Nenhum processo Node rodando"
    }
    
    Write-Host ""
}

# Função para testar conexão com frontend
function Test-Frontend-Connection {
    Write-Host "───────────────────────────────────────" -ForegroundColor Gray
    Write-Host "🌐 Testando Conexão com Frontend" -ForegroundColor White
    Write-Host "───────────────────────────────────────" -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        
        if ($response.StatusCode -eq 200) {
            Write-Success "Frontend responde: HTTP $($response.StatusCode)"
            
            # Verificar se tem conteúdo
            $contentLength = $response.Content.Length
            if ($contentLength -gt 1000) {
                Write-Success "Conteúdo HTML presente: $contentLength bytes"
            } else {
                Write-Error-Custom "HTML muito pequeno: $contentLength bytes (possível tela preta)"
            }
            
            # Verificar se tem <div id="root">
            if ($response.Content -match '<div id="root"') {
                Write-Success "Elemento root encontrado"
            } else {
                Write-Error-Custom "Elemento root NÃO encontrado (tela preta provável)"
            }
            
            # Verificar se tem scripts
            $scriptCount = ([regex]::Matches($response.Content, '<script') | Measure-Object).Count
            if ($scriptCount -gt 0) {
                Write-Success "Scripts carregados: $scriptCount"
            } else {
                Write-Error-Custom "Nenhum script encontrado"
            }
        }
    } catch {
        Write-Error-Custom "Não foi possível conectar ao frontend: $($_.Exception.Message)"
    }
    
    Write-Host ""
}

# Função para detectar problemas específicos
function Detect-Specific-Issues {
    Write-Host "───────────────────────────────────────" -ForegroundColor Gray
    Write-Host "🔍 Detectando Problemas Específicos" -ForegroundColor White
    Write-Host "───────────────────────────────────────" -ForegroundColor Gray
    
    $frontendContent = Get-Content $frontendLog -Raw -ErrorAction SilentlyContinue
    
    # Loop infinito de renders
    if ($frontendContent -match "LOOP INFINITO DETECTADO") {
        Write-Error-Custom "LOOP INFINITO DE RENDERS DETECTADO no código React!"
        Write-Host "   Causa: useEffect ou setState em loop" -ForegroundColor Red
    }
    
    # Erro de sintaxe
    if ($frontendContent -match "SyntaxError|Unexpected token") {
        Write-Error-Custom "Erro de sintaxe no código JavaScript/TypeScript"
    }
    
    # Module not found
    if ($frontendContent -match "Cannot find module|Module not found") {
        Write-Error-Custom "Módulo não encontrado - possível import quebrado"
    }
    
    # Memory leak
    if ($frontendContent -match "memory|heap|allocation") {
        Write-Warning-Custom "Possível problema de memória detectado"
    }
    
    # CORS errors
    if ($frontendContent -match "CORS|Cross-Origin") {
        Write-Warning-Custom "Possível erro de CORS"
    }
    
    Write-Host ""
}

# Função principal de monitoramento
function Start-Monitoring {
    $iteration = 1
    $startTime = Get-Date
    
    do {
        Clear-Host
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "    🔍 FLOW ERP - MONITOR DE ERROS" -ForegroundColor Cyan
        Write-Host "    Iteração: $iteration | Tempo: $((Get-Date) - $startTime)" -ForegroundColor Cyan
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host ""
        
        # Resetar contadores
        $script:issuesFound = @()
        $script:warnings = @()
        
        # Executar análises
        Check-Processes
        Analyze-API
        Analyze-Frontend
        Test-Frontend-Connection
        Detect-Specific-Issues
        
        # Resumo
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "📊 RESUMO" -ForegroundColor White
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
        
        if ($issuesFound.Count -eq 0 -and $warnings.Count -eq 0) {
            Write-Host "✅ Nenhum problema detectado!" -ForegroundColor Green
        } else {
            if ($issuesFound.Count -gt 0) {
                Write-Host ""
                Write-Host "❌ PROBLEMAS CRÍTICOS ($($issuesFound.Count)):" -ForegroundColor Red
                foreach ($issue in $issuesFound) {
                    Write-Host "   $issue" -ForegroundColor Red
                }
            }
            
            if ($warnings.Count -gt 0) {
                Write-Host ""
                Write-Host "⚠️  AVISOS ($($warnings.Count)):" -ForegroundColor Yellow
                foreach ($warning in $warnings) {
                    Write-Host "   $warning" -ForegroundColor Yellow
                }
            }
        }
        
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
        
        if ($Continuous) {
            Write-Host ""
            Write-Host "Próxima verificação em 5 segundos... (Ctrl+C para parar)" -ForegroundColor Gray
            Start-Sleep -Seconds 5
            $iteration++
        }
        
    } while ($Continuous)
}

# Executar monitoramento
Start-Monitoring

Write-Host ""
Write-Host "Monitoramento concluído!" -ForegroundColor Green
Write-Host ""
