# Script de teste do backend após refatoração
# Testa os novos endpoints e funcionalidades

$API_URL = "http://localhost:3000"
$headers = @{}

Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  TESTE DO BACKEND - REFATORAÇÃO" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Teste 1: Health Check
Write-Host "[1/7] Testando Health Check..." -ForegroundColor Yellow -NoNewline
try {
    $health = Invoke-RestMethod -Uri "$API_URL/health" -Method GET -ErrorAction Stop
    Write-Host " OK" -ForegroundColor Green
} catch {
    Write-Host " FALHOU" -ForegroundColor Red
    Write-Host "   Erro: $_" -ForegroundColor Red
    exit 1
}

# Teste 2: Login
Write-Host "[2/7] Fazendo login..." -ForegroundColor Yellow -NoNewline
try {
    $loginBody = @{
        email = "owner@flow.test"
        password = "admin123"
    } | ConvertTo-Json

    $loginResp = Invoke-RestMethod -Uri "$API_URL/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -ErrorAction Stop
    $token = $loginResp.accessToken
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    Write-Host " OK" -ForegroundColor Green
    Write-Host "   Token obtido: $($token.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host " FALHOU" -ForegroundColor Red
    Write-Host "   Erro: $_" -ForegroundColor Red
    exit 1
}

# Teste 3: /auth/me - Verificar novos campos
Write-Host "[3/7] Testando /auth/me (novos campos)..." -ForegroundColor Yellow -NoNewline
try {
    $me = Invoke-RestMethod -Uri "$API_URL/auth/me" -Method GET -Headers $headers -ErrorAction Stop
    
    $hasAgencyMode = $me.PSObject.Properties.Name -contains "agencyMode"
    $hasOnboarding = $me.PSObject.Properties.Name -contains "onboarding"
    $hasHasSeenTasksOnboarding = $me.PSObject.Properties.Name -contains "hasSeenTasksOnboarding"
    
    if ($hasAgencyMode -and $hasOnboarding -and $hasHasSeenTasksOnboarding) {
        Write-Host " OK" -ForegroundColor Green
        Write-Host "   agencyMode: $($me.agencyMode)" -ForegroundColor Gray
        Write-Host "   onboarding.completed: $($me.onboarding.completed)" -ForegroundColor Gray
        Write-Host "   onboarding.showGuidedTour: $($me.onboarding.showGuidedTour)" -ForegroundColor Gray
        Write-Host "   hasSeenTasksOnboarding: $($me.hasSeenTasksOnboarding)" -ForegroundColor Gray
    } else {
        Write-Host " FALHOU - Campos faltando" -ForegroundColor Red
        Write-Host "   Campos encontrados: $($me.PSObject.Properties.Name -join ', ')" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host " FALHOU" -ForegroundColor Red
    Write-Host "   Erro: $_" -ForegroundColor Red
    exit 1
}

# Teste 4: /workflows - Verificar workflows fixos
Write-Host "[4/7] Testando /workflows (workflows fixos)..." -ForegroundColor Yellow -NoNewline
try {
    $workflows = Invoke-RestMethod -Uri "$API_URL/workflows" -Method GET -Headers $headers -ErrorAction Stop
    
    $postsWorkflow = $workflows | Where-Object { $_.category -eq "client" -and $_.isCustom -eq $false }
    $generalWorkflow = $workflows | Where-Object { $_.category -eq "general" -and $_.isCustom -eq $false }
    
    if ($postsWorkflow -and $generalWorkflow) {
        Write-Host " OK" -ForegroundColor Green
        Write-Host "   Workflow POSTS encontrado: $($postsWorkflow.name)" -ForegroundColor Gray
        Write-Host "   Workflow Tarefas Gerais encontrado: $($generalWorkflow.name)" -ForegroundColor Gray
        
        # Verificar status fixos de POSTS
        $postsStatusesJson = $postsWorkflow.statusesJson
        if ($postsStatusesJson -is [string]) {
            $postsStatuses = $postsStatusesJson | ConvertFrom-Json
        } else {
            $postsStatuses = $postsStatusesJson
        }
        $expectedPostsStatuses = @("pauta_criada", "em_producao", "aguardando_aprovacao", "aprovado", "agendado", "publicado")
        $foundStatuses = $postsStatuses | ForEach-Object { $_.id }
        $allFound = $true
        foreach ($status in $expectedPostsStatuses) {
            if ($foundStatuses -notcontains $status) {
                $allFound = $false
                break
            }
        }
        
        if ($allFound) {
            Write-Host "   Status fixos de POSTS: OK (6 status encontrados)" -ForegroundColor Green
        } else {
            Write-Host "   Status fixos de POSTS: FALHOU" -ForegroundColor Red
            Write-Host "     Esperados: $($expectedPostsStatuses -join ', ')" -ForegroundColor Red
            Write-Host "     Encontrados: $($foundStatuses -join ', ')" -ForegroundColor Red
        }
        
        # Verificar status fixos de Tarefas Gerais
        $generalStatusesJson = $generalWorkflow.statusesJson
        if ($generalStatusesJson -is [string]) {
            $generalStatuses = $generalStatusesJson | ConvertFrom-Json
        } else {
            $generalStatuses = $generalStatusesJson
        }
        $expectedGeneralStatuses = @("a_fazer", "em_andamento", "concluido")
        $foundGeneralStatuses = $generalStatuses | ForEach-Object { $_.id }
        $allGeneralFound = $true
        foreach ($status in $expectedGeneralStatuses) {
            if ($foundGeneralStatuses -notcontains $status) {
                $allGeneralFound = $false
                break
            }
        }
        
        if ($allGeneralFound) {
            Write-Host "   Status fixos de Tarefas Gerais: OK (3 status encontrados)" -ForegroundColor Green
        } else {
            Write-Host "   Status fixos de Tarefas Gerais: FALHOU" -ForegroundColor Red
            Write-Host "     Esperados: $($expectedGeneralStatuses -join ', ')" -ForegroundColor Red
            Write-Host "     Encontrados: $($foundGeneralStatuses -join ', ')" -ForegroundColor Red
        }
    } else {
        Write-Host " FALHOU - Workflows fixos não encontrados" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host " FALHOU" -ForegroundColor Red
    Write-Host "   Erro: $_" -ForegroundColor Red
    exit 1
}

# Teste 5: Criar task (testar ownerUserId em modo SOLO)
Write-Host "[5/7] Testando criação de task (ownerUserId automático)..." -ForegroundColor Yellow -NoNewline
try {
    # Buscar workflow de tarefas gerais
    $workflows = Invoke-RestMethod -Uri "$API_URL/workflows" -Method GET -Headers $headers -ErrorAction Stop
    $generalWorkflow = $workflows | Where-Object { $_.category -eq "general" -and $_.isCustom -eq $false }
    $generalStatusesJson = $generalWorkflow.statusesJson
    if ($generalStatusesJson -is [string]) {
        $generalStatuses = $generalStatusesJson | ConvertFrom-Json
    } else {
        $generalStatuses = $generalStatusesJson
    }
    $firstStatus = $generalStatuses[0]
    
    $taskBody = @{
        title = "Teste Task - Backend Refactor"
        date = (Get-Date).ToString("yyyy-MM-dd")
        workflowId = $generalWorkflow.id
        statusId = $firstStatus.id
        category = "Teste"
    } | ConvertTo-Json
    
    $task = Invoke-RestMethod -Uri "$API_URL/tasks" -Method POST -Body $taskBody -ContentType "application/json" -Headers $headers -ErrorAction Stop
    
    if ($task.ownerUserId) {
        Write-Host " OK" -ForegroundColor Green
        Write-Host "   Task criada: $($task.id)" -ForegroundColor Gray
        Write-Host "   ownerUserId preenchido automaticamente: $($task.ownerUserId)" -ForegroundColor Gray
    } else {
        Write-Host " AVISO - ownerUserId não foi preenchido" -ForegroundColor Yellow
        Write-Host "   Task criada: $($task.id)" -ForegroundColor Gray
    }
    
    # Limpar: deletar task de teste
    Invoke-RestMethod -Uri "$API_URL/tasks/$($task.id)" -Method DELETE -Headers $headers -ErrorAction SilentlyContinue | Out-Null
} catch {
    Write-Host " FALHOU" -ForegroundColor Red
    Write-Host "   Erro: $_" -ForegroundColor Red
}

# Teste 6: Listar tasks com filtro ownerUserId
Write-Host "[6/7] Testando filtro ownerUserId em /tasks..." -ForegroundColor Yellow -NoNewline
try {
    $me = Invoke-RestMethod -Uri "$API_URL/auth/me" -Method GET -Headers $headers -ErrorAction Stop
    $userId = $me.id
    
    $tasks = Invoke-RestMethod -Uri "$API_URL/tasks?ownerUserId=$userId" -Method GET -Headers $headers -ErrorAction Stop
    Write-Host " OK" -ForegroundColor Green
    Write-Host "   Filtro funcionando, encontradas $($tasks.total) tasks" -ForegroundColor Gray
} catch {
    Write-Host " FALHOU" -ForegroundColor Red
    Write-Host "   Erro: $_" -ForegroundColor Red
}

# Teste 7: Endpoint de ações de POSTS (GET available-actions)
Write-Host "[7/7] Testando endpoint de ações de POSTS..." -ForegroundColor Yellow -NoNewline
try {
    # Primeiro, buscar ou criar um cliente de teste
    $clients = $null
    try {
        $clients = Invoke-RestMethod -Uri "$API_URL/clients" -Method GET -Headers $headers -ErrorAction Stop
    } catch {
        # Se não existir endpoint ou não houver clientes, criar um
    }
    
    $clientId = $null
    if ($clients -and $clients.Count -gt 0) {
        $clientId = $clients[0].id
    } else {
        # Criar cliente de teste
        try {
            $clientBody = @{
                name = "Cliente Teste - Backend Refactor"
                type = "company"
                currency = "BRL"
            } | ConvertTo-Json
            
            $newClient = Invoke-RestMethod -Uri "$API_URL/clients" -Method POST -Body $clientBody -ContentType "application/json" -Headers $headers -ErrorAction Stop
            $clientId = $newClient.id
            Write-Host " (cliente de teste criado)" -ForegroundColor Gray -NoNewline
        } catch {
            Write-Host " (não foi possível criar cliente)" -ForegroundColor Yellow -NoNewline
        }
    }
    
    if ($clientId) {
        $postBody = @{
            title = "Teste POST - Backend Refactor"
            date = (Get-Date).ToString("yyyy-MM-dd")
            workflowId = $postsWorkflow.id
            statusId = $firstStatus.id
            clientId = $clientId
            postType = "static"
        } | ConvertTo-Json
        
        $post = Invoke-RestMethod -Uri "$API_URL/tasks" -Method POST -Body $postBody -ContentType "application/json" -Headers $headers -ErrorAction Stop
        
        # Testar endpoint de ações disponíveis
        $availableActions = Invoke-RestMethod -Uri "$API_URL/tasks/$($post.id)/available-actions" -Method GET -Headers $headers -ErrorAction Stop
        
        Write-Host " OK" -ForegroundColor Green
        Write-Host "   POST criado com status: $($post.statusId)" -ForegroundColor Gray
        if ($availableActions.actions -and $availableActions.actions.Count -gt 0) {
            Write-Host "   Ações disponíveis: $($availableActions.actions -join ', ')" -ForegroundColor Gray
        } else {
            Write-Host "   Nenhuma ação disponível (esperado para status: $($post.statusId))" -ForegroundColor Gray
        }
        
        # Testar execução de ação (se houver ações disponíveis)
        if ($availableActions.actions -and $availableActions.actions.Count -gt 0) {
            $actionToTest = $availableActions.actions[0]
            Write-Host "   Testando ação: $actionToTest" -ForegroundColor Cyan -NoNewline
            
            try {
                $actionBody = @{
                    action = $actionToTest
                } | ConvertTo-Json
                
                $updatedPost = Invoke-RestMethod -Uri "$API_URL/tasks/$($post.id)/post-action" -Method PATCH -Body $actionBody -ContentType "application/json" -Headers $headers -ErrorAction Stop
                Write-Host " OK" -ForegroundColor Green
                Write-Host "     Novo status: $($updatedPost.statusId)" -ForegroundColor Gray
            } catch {
                Write-Host " FALHOU" -ForegroundColor Red
                Write-Host "     Erro: $_" -ForegroundColor Red
            }
        }
        
        # Limpar: deletar post de teste
        Invoke-RestMethod -Uri "$API_URL/tasks/$($post.id)" -Method DELETE -Headers $headers -ErrorAction SilentlyContinue | Out-Null
    } else {
        Write-Host " PULADO - Nenhum cliente encontrado para criar POST" -ForegroundColor Yellow
    }
} catch {
    Write-Host " FALHOU" -ForegroundColor Red
    Write-Host "   Erro: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=======================================" -ForegroundColor Green
Write-Host "  TESTES CONCLUÍDOS!" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
Write-Host ""
