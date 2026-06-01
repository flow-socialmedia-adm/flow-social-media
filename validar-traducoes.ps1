# Script para Validar Traduções
# Encontra todas as chaves t('...') usadas no código e verifica se existem em i18n.ts

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  VALIDADOR DE TRADUCOES" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Extrair todas as chaves usadas no código
Write-Host "Buscando chaves de traducao no codigo..." -ForegroundColor Yellow

$usedKeys = @{}

# Buscar em todos os arquivos .tsx
Get-ChildItem -Path "." -Include "*.tsx" -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $matches = [regex]::Matches($content, "t\([`"']([a-zA-Z0-9_]+)[`"']")
    foreach ($match in $matches) {
        $key = $match.Groups[1].Value
        if (-not $usedKeys.ContainsKey($key)) {
            $usedKeys[$key] = @()
        }
        $usedKeys[$key] += $_.Name
    }
}

Write-Host "Encontradas $($usedKeys.Count) chaves unicas" -ForegroundColor White
Write-Host ""

# Ler arquivo i18n.ts
Write-Host "Lendo arquivo de traducoes..." -ForegroundColor Yellow
$i18nContent = Get-Content "lib\i18n.ts" -Raw

# Verificar quais chaves estão faltando
Write-Host ""
Write-Host "CHAVES FALTANDO NO ARQUIVO DE TRADUCOES:" -ForegroundColor Red
Write-Host "=========================================" -ForegroundColor Red
Write-Host ""

$missingKeys = @()
foreach ($key in $usedKeys.Keys | Sort-Object) {
    if ($i18nContent -notmatch "`"$key`":\s*\{") {
        $missingKeys += $key
        Write-Host "  $key" -ForegroundColor Red
        Write-Host "    Usado em: $($usedKeys[$key] -join ', ')" -ForegroundColor Gray
        Write-Host ""
    }
}

if ($missingKeys.Count -eq 0) {
    Write-Host "Nenhuma chave faltando!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Total de chaves faltando: $($missingKeys.Count)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pressione Enter para fechar..." -ForegroundColor Gray
$null = Read-Host
