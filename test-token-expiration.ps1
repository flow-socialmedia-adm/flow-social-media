# 🧪 Script de Teste - Expiração de Token
# Execute: .\test-token-expiration.ps1

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('setup', 'restore', 'info')]
    [string]$Action = 'info'
)

$envFile = "apps/api/.env"

function Show-Info {
    Write-Host "`n=====================================" -ForegroundColor Cyan
    Write-Host "🧪 Teste de Expiração de Token" -ForegroundColor Cyan
    Write-Host "=====================================" -ForegroundColor Cyan
    
    Write-Host "`nConfiguração atual do .env:" -ForegroundColor Yellow
    
    if (Test-Path $envFile) {
        $content = Get-Content $envFile -Raw
        
        if ($content -match 'JWT_ACCESS_EXPIRES=(\S+)') {
            $access = $matches[1]
            Write-Host "  Access Token:  $access" -ForegroundColor White
            
            if ($access -eq "30s" -or $access -eq "60s") {
                Write-Host "  ⚠️  MODO DE TESTE ATIVO!" -ForegroundColor Red
            } elseif ($access -eq "900s" -or $access -eq "15m") {
                Write-Host "  ✅ Modo normal (15 minutos)" -ForegroundColor Green
            }
        }
        
        if ($content -match 'JWT_REFRESH_EXPIRES=(\S+)') {
            $refresh = $matches[1]
            Write-Host "  Refresh Token: $refresh" -ForegroundColor White
            
            if ($refresh -eq "120s" -or $refresh -eq "2m") {
                Write-Host "  ⚠️  MODO DE TESTE ATIVO!" -ForegroundColor Red
            } elseif ($refresh -eq "7d") {
                Write-Host "  ✅ Modo normal (7 dias)" -ForegroundColor Green
            }
        }
    } else {
        Write-Host "  ❌ Arquivo .env não encontrado em: $envFile" -ForegroundColor Red
    }
    
    Write-Host "`nComandos disponíveis:" -ForegroundColor Yellow
    Write-Host "  .\test-token-expiration.ps1 setup    - Ativa modo teste (30s/120s)" -ForegroundColor White
    Write-Host "  .\test-token-expiration.ps1 restore  - Restaura tempos normais (900s/7d)" -ForegroundColor White
    Write-Host "  .\test-token-expiration.ps1 info     - Mostra esta informação" -ForegroundColor White
    
    Write-Host "`n📚 Guia completo: TESTE_TOKEN_EXPIRACAO.md" -ForegroundColor Cyan
    Write-Host "🔧 Helper JS: test-token-helper.js (copie para o console do navegador)" -ForegroundColor Cyan
    Write-Host ""
}

function Set-TestMode {
    Write-Host "`n🔧 Configurando modo de teste..." -ForegroundColor Yellow
    
    if (-not (Test-Path $envFile)) {
        Write-Host "❌ Arquivo .env não encontrado: $envFile" -ForegroundColor Red
        return
    }
    
    # Backup
    $backupFile = "$envFile.backup"
    Copy-Item $envFile $backupFile -Force
    Write-Host "✅ Backup criado: $backupFile" -ForegroundColor Green
    
    # Alterar tempos
    $content = Get-Content $envFile -Raw
    $content = $content -replace 'JWT_ACCESS_EXPIRES=\S+', 'JWT_ACCESS_EXPIRES=30s'
    $content = $content -replace 'JWT_REFRESH_EXPIRES=\S+', 'JWT_REFRESH_EXPIRES=120s'
    Set-Content $envFile $content -NoNewline
    
    Write-Host "✅ Tempos alterados:" -ForegroundColor Green
    Write-Host "   Access Token:  30s (antes: 900s)" -ForegroundColor White
    Write-Host "   Refresh Token: 120s (antes: 7d)" -ForegroundColor White
    
    Write-Host "`n⚠️  IMPORTANTE: Reinicie a API para aplicar as mudanças!" -ForegroundColor Red
    Write-Host "   cd apps/api && npm run start:dev" -ForegroundColor Yellow
    
    Write-Host "`n📋 Próximos passos:" -ForegroundColor Cyan
    Write-Host "   1. Reinicie a API" -ForegroundColor White
    Write-Host "   2. Faça login na aplicação" -ForegroundColor White
    Write-Host "   3. Aguarde 35 segundos" -ForegroundColor White
    Write-Host "   4. Navegue entre páginas e observe o comportamento" -ForegroundColor White
    Write-Host "   5. Execute: .\test-token-expiration.ps1 restore quando terminar" -ForegroundColor White
    Write-Host ""
}

function Restore-NormalMode {
    Write-Host "`n🔄 Restaurando modo normal..." -ForegroundColor Yellow
    
    if (-not (Test-Path $envFile)) {
        Write-Host "❌ Arquivo .env não encontrado: $envFile" -ForegroundColor Red
        return
    }
    
    $backupFile = "$envFile.backup"
    if (Test-Path $backupFile) {
        Copy-Item $backupFile $envFile -Force
        Remove-Item $backupFile -Force
        Write-Host "✅ Backup restaurado e removido" -ForegroundColor Green
    } else {
        # Restaurar manualmente se não houver backup
        $content = Get-Content $envFile -Raw
        $content = $content -replace 'JWT_ACCESS_EXPIRES=\S+', 'JWT_ACCESS_EXPIRES=900s'
        $content = $content -replace 'JWT_REFRESH_EXPIRES=\S+', 'JWT_REFRESH_EXPIRES=7d'
        Set-Content $envFile $content -NoNewline
        Write-Host "✅ Tempos restaurados manualmente" -ForegroundColor Green
    }
    
    Write-Host "✅ Tempos restaurados:" -ForegroundColor Green
    Write-Host "   Access Token:  900s (15 minutos)" -ForegroundColor White
    Write-Host "   Refresh Token: 7d (7 dias)" -ForegroundColor White
    
    Write-Host "`n⚠️  Reinicie a API para aplicar as mudanças!" -ForegroundColor Red
    Write-Host "   cd apps/api && npm run start:dev" -ForegroundColor Yellow
    Write-Host ""
}

# Executar ação
switch ($Action) {
    'setup' {
        Set-TestMode
    }
    'restore' {
        Restore-NormalMode
    }
    'info' {
        Show-Info
    }
}
