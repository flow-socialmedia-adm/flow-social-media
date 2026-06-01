# Monitor Simples - Atualizado para novos logs
param([switch]$Continuous)

$frontendLog = "c:\Users\Mariana S\.cursor\projects\d-Projetos-Flow-ERP\terminals\8.txt"
$apiLog = "c:\Users\Mariana S\.cursor\projects\d-Projetos-Flow-ERP\terminals\9.txt"

Write-Host "Monitor de Erros - Flow ERP" -ForegroundColor Cyan
Write-Host ""

do {
    $errors = @()
    
    # Frontend
    if (Test-Path $frontendLog) {
        $fc = Get-Content $frontendLog -Raw
        $reloads = ([regex]::Matches($fc, "page reload")).Count
        
        Write-Host "[Frontend] Reloads: $reloads" -ForegroundColor $(if ($reloads -gt 10) { "Red" } else { "Green" })
        
        if ($reloads -gt 10) {
            $errors += "LOOP DE RELOAD (mais de 10)"
        }
    }
    
    # API
    if (Test-Path $apiLog) {
        $ac = Get-Content $apiLog -Raw
        if ($ac -match "successfully started") {
            Write-Host "[API] Rodando" -ForegroundColor Green
        }
    }
    
    # Conexao
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        Write-Host "[HTTP] OK - $($r.Content.Length) bytes" -ForegroundColor Green
        
        if ($r.Content.Length -lt 1000) {
            $errors += "HTML muito pequeno"
        }
    } catch {
        Write-Host "[HTTP] ERRO" -ForegroundColor Red
        $errors += "Frontend nao responde"
    }
    
    Write-Host ""
    if ($errors.Count -eq 0) {
        Write-Host "Status: TUDO OK" -ForegroundColor Green
    } else {
        Write-Host "PROBLEMAS:" -ForegroundColor Red
        $errors | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    }
    
    if ($Continuous) {
        Start-Sleep -Seconds 5
        Clear-Host
    }
} while ($Continuous)
