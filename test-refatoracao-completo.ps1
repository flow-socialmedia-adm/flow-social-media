# Script de teste completo da refatoração de tarefas/posts
# Valida todas as funcionalidades implementadas

$API_URL = "http://localhost:3000"
$global:headers = @{}
$errors = 0
$passed = 0

function Write-TestResult {
    param([string]$testName, [bool]$success, [string]$message = "")
    if ($success) {
        Write-Host "[PASS]" -ForegroundColor Green -NoNewline
        $script:passed++
    } else {
        Write-Host "[FAIL]" -ForegroundColor Red -NoNewline
        $script:errors++
    }
    Write-Host " - $testName" -ForegroundColor White
    if ($message -and -not $success) {
        Write-Host "   Erro: $message" -ForegroundColor Yellow
    }
}

Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  TESTE COMPLETO - REFATORAÇÃO" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# ==========================================
# FASE 1: AUTENTICAÇÃO E ESTRUTURA BASE
# ==========================================
Write-Host "┌─────────────────────────────────────┐" -ForegroundColor Cyan
Write-Host "│ FASE 1: Autenticação                │" -ForegroundColor Cyan
Write-Host "└─────────────────────────────────────┘" -ForegroundColor Cyan
Write-Host ""

# Teste 1.1: Login
Write-Host "[1.1] Login..." -ForegroundColor Yellow -NoNewline
try {
    $loginBody = @{
        email = "owner@flow.test"
        password = "admin123"
    } | ConvertTo-Json
    
    $loginResp = Invoke-RestMethod -Uri "$API_URL/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -ErrorAction Stop
    $token = $loginResp.accessToken
    $global:headers = @{ "Authorization" = "Bearer $token" }
    Write-TestResult "Login" $true
} catch {
    Write-TestResult "Login" $false $_.Exception.Message
    exit 1
}

# Teste 1.2: /auth/me - Verificar campos novos
Write-Host "[1.2] /auth/me - Campos novos..." -ForegroundColor Yellow -NoNewline
try {
    $me = Invoke-RestMethod -Uri "$API_URL/auth/me" -Method GET -Headers $global:headers -ErrorAction Stop
    
    $hasAgencyMode = $me.PSObject.Properties.Name -contains "agencyMode"
    $hasOnboarding = $me.PSObject.Properties.Name -contains "onboarding"
    $hasHasSeenTasksOnboarding = $me.PSObject.Properties.Name -contains "hasSeenTasksOnboarding"
    
    $allPresent = $hasAgencyMode -and $hasOnboarding -and $hasHasSeenTasksOnboarding
    
    if ($allPresent) {
        $onboardingObj = $me.onboarding
        $hasOnboardingCompleted = $onboardingObj.PSObject.Properties.Name -contains "onboardingCompleted"
        $hasShowGuidedTour = $onboardingObj.PSObject.Properties.Name -contains "showGuidedTour"
        $hasHasSeenHomeTour = $onboardingObj.PSObject.Properties.Name -contains "hasSeenHomeTour"
        
        $allOnboardingFields = $hasOnboardingCompleted -and $hasShowGuidedTour -and $hasHasSeenHomeTour
        Write-TestResult "/auth/me - Campos novos" $allOnboardingFields
    } else {
        Write-TestResult "/auth/me - Campos novos" $false "Faltando campos"
    }
} catch {
    Write-TestResult "/auth/me - Campos novos" $false $_.Exception.Message
}

# ==========================================
# FASE 2: WORKFLOWS FIXOS
# ==========================================
Write-Host ""
Write-Host "┌─────────────────────────────────────┐" -ForegroundColor Cyan
Write-Host "│ FASE 2: Workflows Fixos             │" -ForegroundColor Cyan
Write-Host "└─────────────────────────────────────┘" -ForegroundColor Cyan
Write-Host ""

# Teste 2.1: Workflows fixos de POSTS
Write-Host "[2.1] Workflow fixo de POSTS..." -ForegroundColor Yellow -NoNewline
try {
    $workflows = Invoke-RestMethod -Uri "$API_URL/workflows" -Method GET -Headers $global:headers -ErrorAction Stop
    $postsWorkflow = $workflows | Where-Object { $_.category -eq "client" -and $_.isCustom -eq $false }
    
    if ($postsWorkflow) {
        $statusesJson = $postsWorkflow.statusesJson
        if ($statusesJson -is [string]) {
            $statusesJson = $statusesJson | ConvertFrom-Json
        }
        
        $expectedStatuses = @('pauta_criada', 'em_producao', 'aguardando_aprovacao', 'aprovado', 'agendado', 'publicado')
        $actualStatusIds = $statusesJson | ForEach-Object { $_.id }
        $allPresent = ($expectedStatuses | ForEach-Object { $actualStatusIds -contains $_ }) -notcontains $false
        
        Write-TestResult "Workflow fixo de POSTS" $allPresent
    } else {
        Write-TestResult "Workflow fixo de POSTS" $false "Workflow não encontrado"
    }
} catch {
    Write-TestResult "Workflow fixo de POSTS" $false $_.Exception.Message
}

# Teste 2.2: Workflow fixo de Tarefas Gerais
Write-Host "[2.2] Workflow fixo de Tarefas Gerais..." -ForegroundColor Yellow -NoNewline
try {
    $workflows = Invoke-RestMethod -Uri "$API_URL/workflows" -Method GET -Headers $global:headers -ErrorAction Stop
    $generalWorkflow = $workflows | Where-Object { $_.category -eq "general" -and $_.isCustom -eq $false }
    
    if ($generalWorkflow) {
        $statusesJson = $generalWorkflow.statusesJson
        if ($statusesJson -is [string]) {
            $statusesJson = $statusesJson | ConvertFrom-Json
        }
        
        $expectedStatuses = @('a_fazer', 'em_andamento', 'concluido')
        $actualStatusIds = $statusesJson | ForEach-Object { $_.id }
        $allPresent = ($expectedStatuses | ForEach-Object { $actualStatusIds -contains $_ }) -notcontains $false
        
        Write-TestResult "Workflow fixo de Tarefas Gerais" $allPresent
    } else {
        Write-TestResult "Workflow fixo de Tarefas Gerais" $false "Workflow não encontrado"
    }
} catch {
    Write-TestResult "Workflow fixo de Tarefas Gerais" $false $_.Exception.Message
}

# Teste 2.3: Workflows não editáveis
Write-Host "[2.3] Workflows fixos não editáveis..." -ForegroundColor Yellow -NoNewline
try {
    $workflows = Invoke-RestMethod -Uri "$API_URL/workflows" -Method GET -Headers $global:headers -ErrorAction Stop
    $postsWorkflow = $workflows | Where-Object { $_.category -eq "client" -and $_.isCustom -eq $false }
    
    if ($postsWorkflow) {
        try {
            $updateBody = @{
                name = "Teste de Edição"
            } | ConvertTo-Json
            
            Invoke-RestMethod -Uri "$API_URL/workflows/$($postsWorkflow.id)" -Method PUT -Body $updateBody -ContentType "application/json" -Headers $global:headers -ErrorAction Stop
            Write-TestResult "Workflows fixos não editáveis" $false "Permitiu edição"
        } catch {
            $errorMsg = $_.Exception.Message
            if ($errorMsg -match "403" -or $errorMsg -match "Forbidden" -or $errorMsg -match "não.*editável" -or $errorMsg -match "fixo") {
                Write-TestResult "Workflows fixos não editáveis" $true
            } else {
                Write-TestResult "Workflows fixos não editáveis" $false "Erro inesperado: $errorMsg"
            }
        }
    } else {
        Write-TestResult "Workflows fixos não editáveis" $false "Workflow não encontrado"
    }
} catch {
    Write-TestResult "Workflows fixos não editáveis" $false $_.Exception.Message
}

# ==========================================
# FASE 3: MODO SOLO/TEAM E OWNER
# ==========================================
Write-Host ""
Write-Host "┌─────────────────────────────────────┐" -ForegroundColor Cyan
Write-Host "│ FASE 3: Modo SOLO/TEAM              │" -ForegroundColor Cyan
Write-Host "└─────────────────────────────────────┘" -ForegroundColor Cyan
Write-Host ""

# Teste 3.1: Atualizar modo da agência
Write-Host "[3.1] Atualizar modo da agência..." -ForegroundColor Yellow -NoNewline
try {
    $updateBody = @{
        mode = "TEAM"
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri "$API_URL/agencies/me" -Method PUT -Body $updateBody -ContentType "application/json" -Headers $global:headers -ErrorAction Stop | Out-Null
    
    $me = Invoke-RestMethod -Uri "$API_URL/auth/me" -Method GET -Headers $global:headers -ErrorAction Stop
    $isTeam = $me.agencyMode -eq "TEAM"
    
    Write-TestResult "Atualizar modo da agência" $isTeam
} catch {
    Write-TestResult "Atualizar modo da agência" $false $_.Exception.Message
}

# Teste 3.2: Criar POST em modo TEAM (com ownerUserId)
Write-Host "[3.2] Criar POST em modo TEAM..." -ForegroundColor Yellow -NoNewline
try {
    # Primeiro, criar um cliente
    $clientBody = @{
        name = "Cliente Teste TEAM"
        type = "company"
        currency = "BRL"
    } | ConvertTo-Json
    
    $client = Invoke-RestMethod -Uri "$API_URL/clients" -Method POST -Body $clientBody -ContentType "application/json" -Headers $global:headers -ErrorAction Stop
    
    # Buscar workflows
    $workflows = Invoke-RestMethod -Uri "$API_URL/workflows" -Method GET -Headers $global:headers -ErrorAction Stop
    $postsWorkflow = $workflows | Where-Object { $_.category -eq "client" -and $_.isCustom -eq $false }
    $statusesJson = $postsWorkflow.statusesJson
    if ($statusesJson -is [string]) {
        $statusesJson = $statusesJson | ConvertFrom-Json
    }
    $pautaCriadaStatus = ($statusesJson | Where-Object { $_.id -eq "pauta_criada" }).id
    
    # Criar POST
    $taskBody = @{
        title = "POST Teste TEAM"
        date = (Get-Date).ToString("yyyy-MM-dd")
        clientId = $client.id
        postType = "STATIC"
        workflowId = $postsWorkflow.id
        statusId = $pautaCriadaStatus
        ownerUserId = $me.user.id
    } | ConvertTo-Json
    
    $task = Invoke-RestMethod -Uri "$API_URL/tasks" -Method POST -Body $taskBody -ContentType "application/json" -Headers $global:headers -ErrorAction Stop
    
    $hasOwner = $task.ownerUserId -eq $me.user.id
    Write-TestResult "Criar POST em modo TEAM" $hasOwner
    
    # Limpar
    Invoke-RestMethod -Uri "$API_URL/tasks/$($task.id)" -Method DELETE -Headers $global:headers -ErrorAction SilentlyContinue | Out-Null
    Invoke-RestMethod -Uri "$API_URL/clients/$($client.id)" -Method DELETE -Headers $global:headers -ErrorAction SilentlyContinue | Out-Null
} catch {
    Write-TestResult "Criar POST em modo TEAM" $false $_.Exception.Message
}

# Teste 3.3: Criar POST em modo SOLO (ownerUserId automático)
Write-Host "[3.3] Criar POST em modo SOLO..." -ForegroundColor Yellow -NoNewline
try {
    # Mudar para SOLO
    $updateBody = @{
        mode = "SOLO"
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$API_URL/agencies/me" -Method PUT -Body $updateBody -ContentType "application/json" -Headers $global:headers -ErrorAction Stop | Out-Null
    
    # Criar cliente
    $clientBody = @{
        name = "Cliente Teste SOLO"
        type = "company"
        currency = "BRL"
    } | ConvertTo-Json
    $client = Invoke-RestMethod -Uri "$API_URL/clients" -Method POST -Body $clientBody -ContentType "application/json" -Headers $global:headers -ErrorAction Stop
    
    # Buscar workflows
    $workflows = Invoke-RestMethod -Uri "$API_URL/workflows" -Method GET -Headers $global:headers -ErrorAction Stop
    $postsWorkflow = $workflows | Where-Object { $_.category -eq "client" -and $_.isCustom -eq $false }
    $statusesJson = $postsWorkflow.statusesJson
    if ($statusesJson -is [string]) {
        $statusesJson = $statusesJson | ConvertFrom-Json
    }
    $pautaCriadaStatus = ($statusesJson | Where-Object { $_.id -eq "pauta_criada" }).id
    
    # Criar POST sem ownerUserId
    $taskBody = @{
        title = "POST Teste SOLO"
        date = (Get-Date).ToString("yyyy-MM-dd")
        clientId = $client.id
        postType = "STATIC"
        workflowId = $postsWorkflow.id
        statusId = $pautaCriadaStatus
    } | ConvertTo-Json
    
    $task = Invoke-RestMethod -Uri "$API_URL/tasks" -Method POST -Body $taskBody -ContentType "application/json" -Headers $global:headers -ErrorAction Stop
    
    $me = Invoke-RestMethod -Uri "$API_URL/auth/me" -Method GET -Headers $global:headers -ErrorAction Stop
    $autoOwner = $task.ownerUserId -eq $me.user.id
    
    Write-TestResult "Criar POST em modo SOLO (auto owner)" $autoOwner
    
    # Limpar
    Invoke-RestMethod -Uri "$API_URL/tasks/$($task.id)" -Method DELETE -Headers $global:headers -ErrorAction SilentlyContinue | Out-Null
    Invoke-RestMethod -Uri "$API_URL/clients/$($client.id)" -Method DELETE -Headers $global:headers -ErrorAction SilentlyContinue | Out-Null
} catch {
    Write-TestResult "Criar POST em modo SOLO" $false $_.Exception.Message
}

# ==========================================
# FASE 4: AÇÕES DE POSTS
# ==========================================
Write-Host ""
Write-Host "┌─────────────────────────────────────┐" -ForegroundColor Cyan
Write-Host "│ FASE 4: Ações de POSTS              │" -ForegroundColor Cyan
Write-Host "└─────────────────────────────────────┘" -ForegroundColor Cyan
Write-Host ""

# Teste 4.1: Buscar ações disponíveis
Write-Host "[4.1] Buscar ações disponíveis..." -ForegroundColor Yellow -NoNewline
try {
    # Criar POST
    $clientBody = @{
        name = "Cliente Teste Ações"
        type = "company"
        currency = "BRL"
    } | ConvertTo-Json
    $client = Invoke-RestMethod -Uri "$API_URL/clients" -Method POST -Body $clientBody -ContentType "application/json" -Headers $global:headers -ErrorAction Stop
    
    $workflows = Invoke-RestMethod -Uri "$API_URL/workflows" -Method GET -Headers $global:headers -ErrorAction Stop
    $postsWorkflow = $workflows | Where-Object { $_.category -eq "client" -and $_.isCustom -eq $false }
    $statusesJson = $postsWorkflow.statusesJson
    if ($statusesJson -is [string]) {
        $statusesJson = $statusesJson | ConvertFrom-Json
    }
    $pautaCriadaStatus = ($statusesJson | Where-Object { $_.id -eq "pauta_criada" }).id
    
    $taskBody = @{
        title = "POST Teste Ações"
        date = (Get-Date).ToString("yyyy-MM-dd")
        clientId = $client.id
        postType = "STATIC"
        workflowId = $postsWorkflow.id
        statusId = $pautaCriadaStatus
    } | ConvertTo-Json
    $task = Invoke-RestMethod -Uri "$API_URL/tasks" -Method POST -Body $taskBody -ContentType "application/json" -Headers $global:headers -ErrorAction Stop
    
    # Buscar ações
    $actions = Invoke-RestMethod -Uri "$API_URL/tasks/$($task.id)/available-actions" -Method GET -Headers $global:headers -ErrorAction Stop
    
    $hasActions = $actions.actions.Count -gt 0
    $expectedAction = $actions.actions -contains "enviar_para_producao"
    
    Write-TestResult "Buscar ações disponíveis" ($hasActions -and $expectedAction)
    
    # Limpar
    Invoke-RestMethod -Uri "$API_URL/tasks/$($task.id)" -Method DELETE -Headers $global:headers -ErrorAction SilentlyContinue | Out-Null
    Invoke-RestMethod -Uri "$API_URL/clients/$($client.id)" -Method DELETE -Headers $global:headers -ErrorAction SilentlyContinue | Out-Null
} catch {
    Write-TestResult "Buscar ações disponíveis" $false $_.Exception.Message
}

# Teste 4.2: Executar ação de POST
Write-Host "[4.2] Executar ação de POST..." -ForegroundColor Yellow -NoNewline
try {
    # Criar POST
    $clientBody = @{
        name = "Cliente Teste Execução"
        type = "company"
        currency = "BRL"
    } | ConvertTo-Json
    $client = Invoke-RestMethod -Uri "$API_URL/clients" -Method POST -Body $clientBody -ContentType "application/json" -Headers $global:headers -ErrorAction Stop
    
    $workflows = Invoke-RestMethod -Uri "$API_URL/workflows" -Method GET -Headers $global:headers -ErrorAction Stop
    $postsWorkflow = $workflows | Where-Object { $_.category -eq "client" -and $_.isCustom -eq $false }
    $statusesJson = $postsWorkflow.statusesJson
    if ($statusesJson -is [string]) {
        $statusesJson = $statusesJson | ConvertFrom-Json
    }
    $pautaCriadaStatus = ($statusesJson | Where-Object { $_.id -eq "pauta_criada" }).id
    
    $taskBody = @{
        title = "POST Teste Execução"
        date = (Get-Date).ToString("yyyy-MM-dd")
        clientId = $client.id
        postType = "STATIC"
        workflowId = $postsWorkflow.id
        statusId = $pautaCriadaStatus
    } | ConvertTo-Json
    $task = Invoke-RestMethod -Uri "$API_URL/tasks" -Method POST -Body $taskBody -ContentType "application/json" -Headers $global:headers -ErrorAction Stop
    
    # Executar ação
    $actionBody = @{
        action = "enviar_para_producao"
    } | ConvertTo-Json
    $updatedTask = Invoke-RestMethod -Uri "$API_URL/tasks/$($task.id)/post-action" -Method PATCH -Body $actionBody -ContentType "application/json" -Headers $global:headers -ErrorAction Stop
    
    $statusChanged = $updatedTask.statusId -eq "em_producao"
    
    Write-TestResult "Executar ação de POST" $statusChanged
    
    # Limpar
    Invoke-RestMethod -Uri "$API_URL/tasks/$($task.id)" -Method DELETE -Headers $global:headers -ErrorAction SilentlyContinue | Out-Null
    Invoke-RestMethod -Uri "$API_URL/clients/$($client.id)" -Method DELETE -Headers $global:headers -ErrorAction SilentlyContinue | Out-Null
} catch {
    Write-TestResult "Executar ação de POST" $false $_.Exception.Message
}

# Teste 4.3: Validar ação inválida
Write-Host "[4.3] Validar ação inválida..." -ForegroundColor Yellow -NoNewline
try {
    # Criar POST em produção
    $clientBody = @{
        name = "Cliente Teste Validação"
        type = "company"
        currency = "BRL"
    } | ConvertTo-Json
    $client = Invoke-RestMethod -Uri "$API_URL/clients" -Method POST -Body $clientBody -ContentType "application/json" -Headers $global:headers -ErrorAction Stop
    
    $workflows = Invoke-RestMethod -Uri "$API_URL/workflows" -Method GET -Headers $global:headers -ErrorAction Stop
    $postsWorkflow = $workflows | Where-Object { $_.category -eq "client" -and $_.isCustom -eq $false }
    $statusesJson = $postsWorkflow.statusesJson
    if ($statusesJson -is [string]) {
        $statusesJson = $statusesJson | ConvertFrom-Json
    }
    $emProducaoStatus = ($statusesJson | Where-Object { $_.id -eq "em_producao" }).id
    
    $taskBody = @{
        title = "POST Teste Validação"
        date = (Get-Date).ToString("yyyy-MM-dd")
        clientId = $client.id
        postType = "STATIC"
        workflowId = $postsWorkflow.id
        statusId = $emProducaoStatus
    } | ConvertTo-Json
    $task = Invoke-RestMethod -Uri "$API_URL/tasks" -Method POST -Body $taskBody -ContentType "application/json" -Headers $global:headers -ErrorAction Stop
    
    # Tentar ação inválida (aprovar não é válido para em_producao)
    try {
        $actionBody = @{
            action = "aprovar"
        } | ConvertTo-Json
        Invoke-RestMethod -Uri "$API_URL/tasks/$($task.id)/post-action" -Method PATCH -Body $actionBody -ContentType "application/json" -Headers $global:headers -ErrorAction Stop | Out-Null
        Write-TestResult "Validar ação inválida" $false "Permitiu ação inválida"
    } catch {
        $errorMsg = $_.Exception.Message
        if ($errorMsg -match "não é válida" -or $errorMsg -match "não válida") {
            Write-TestResult "Validar ação inválida" $true
        } else {
            Write-TestResult "Validar ação inválida" $false "Erro inesperado: $errorMsg"
        }
    }
    
    # Limpar
    Invoke-RestMethod -Uri "$API_URL/tasks/$($task.id)" -Method DELETE -Headers $global:headers -ErrorAction SilentlyContinue | Out-Null
    Invoke-RestMethod -Uri "$API_URL/clients/$($client.id)" -Method DELETE -Headers $global:headers -ErrorAction SilentlyContinue | Out-Null
} catch {
    Write-TestResult "Validar ação inválida" $false $_.Exception.Message
}

# ==========================================
# RESUMO
# ==========================================
Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  RESUMO DOS TESTES" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""
    Write-Host "Passou: $passed" -ForegroundColor Green
    Write-Host "Falhou: $errors" -ForegroundColor Red
    Write-Host "Total:  $($passed + $errors)" -ForegroundColor White
Write-Host ""

if ($errors -eq 0) {
    Write-Host "TODOS OS TESTES PASSARAM!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "ALGUNS TESTES FALHARAM" -ForegroundColor Yellow
    exit 1
}
