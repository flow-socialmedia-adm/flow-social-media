# Monitor Detalhado com Logs do Console

$frontendLog = "c:\Users\Mariana S\.cursor\projects\d-Projetos-Flow-ERP\terminals\8.txt"

Write-Host "=== MONITOR DETALHADO - Flow ERP ===" -ForegroundColor Cyan
Write-Host "Monitorando navegação em tempo real..." -ForegroundColor Yellow
Write-Host "Pressione Ctrl+C para parar" -ForegroundColor Gray
Write-Host ""

$lastSize = 0

while ($true) {
    if (Test-Path $frontendLog) {
        $currentSize = (Get-Item $frontendLog).Length
        
        if ($currentSize -gt $lastSize) {
            $content = Get-Content $frontendLog -Raw
            $newContent = $content.Substring([Math]::Min($lastSize, $content.Length))
            
            # Filtrar logs relevantes
            $lines = $newContent -split "`n"
            foreach ($line in $lines) {
                if ($line -match "\[Sidebar\]|\[App\]|ERROR|Error|error|ERRO|Warning") {
                    $timestamp = Get-Date -Format "HH:mm:ss"
                    
                    # Colorir por tipo
                    $color = "White"
                    if ($line -match "ERROR|Error|ERRO|❌") { $color = "Red" }
                    elseif ($line -match "Warning|⚠️") { $color = "Yellow" }
                    elseif ($line -match "✅") { $color = "Green" }
                    elseif ($line -match "\[Sidebar\]") { $color = "Cyan" }
                    elseif ($line -match "\[App\]") { $color = "Magenta" }
                    
                    Write-Host "[$timestamp] $line" -ForegroundColor $color
                }
            }
            
            $lastSize = $currentSize
        }
    }
    
    Start-Sleep -Milliseconds 500
}
