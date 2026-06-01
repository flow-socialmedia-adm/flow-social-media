/**
 * 🧪 Helper de Teste - Expiração de Token
 * 
 * Como usar:
 * 1. Abra o console do navegador (F12)
 * 2. Copie e cole este arquivo inteiro
 * 3. Execute os comandos abaixo
 */

window.tokenTestHelper = {
  
  /**
   * Mostra os tokens atuais
   */
  showTokens() {
    const tokens = localStorage.getItem('flow.tokens');
    if (!tokens) {
      console.log('❌ Nenhum token encontrado');
      return null;
    }
    const parsed = JSON.parse(tokens);
    console.log('🔑 Tokens atuais:');
    console.log('Access Token:', parsed.accessToken?.substring(0, 50) + '...');
    console.log('Refresh Token:', parsed.refreshToken?.substring(0, 50) + '...');
    
    // Decodificar JWT (parte do payload)
    try {
      const payload = JSON.parse(atob(parsed.accessToken.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = payload.exp - now;
      console.log('📅 Expira em:', expiresIn, 'segundos (', Math.floor(expiresIn / 60), 'minutos )');
      console.log('👤 Usuário:', payload.sub);
      console.log('🏢 Agência:', payload.agencyId);
      console.log('🎭 Role:', payload.role);
    } catch (e) {
      console.log('⚠️  Não foi possível decodificar o token');
    }
    
    return parsed;
  },
  
  /**
   * Limpa os tokens (simula logout)
   */
  clearTokens() {
    localStorage.removeItem('flow.tokens');
    console.log('✅ Tokens removidos! Recarregue a página ou navegue para ser redirecionado ao login.');
  },
  
  /**
   * Corrompe os tokens (simula token expirado/inválido)
   */
  corruptTokens() {
    const fake = {
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlIiwiaWF0IjoxNTE2MjM5MDIyfQ.invalid',
      refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlIiwiaWF0IjoxNTE2MjM5MDIyfQ.invalid'
    };
    localStorage.setItem('flow.tokens', JSON.stringify(fake));
    console.log('✅ Tokens corrompidos! Tente navegar ou fazer uma requisição.');
    console.log('   Sistema deve tentar refresh, falhar, e redirecionar para login.');
  },
  
  /**
   * Testa fazer uma requisição com o token atual
   */
  async testRequest(endpoint = '/auth/me') {
    console.log(`🚀 Testando requisição para: ${endpoint}`);
    const tokens = localStorage.getItem('flow.tokens');
    if (!tokens) {
      console.log('❌ Nenhum token encontrado');
      return;
    }
    
    const { accessToken } = JSON.parse(tokens);
    const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:3000';
    
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📊 Status:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Resposta:', data);
      } else {
        const text = await response.text();
        console.log('❌ Erro:', text);
      }
    } catch (error) {
      console.error('💥 Erro na requisição:', error);
    }
  },
  
  /**
   * Teste de stress - múltiplas requisições simultâneas
   */
  async stressTest(count = 10) {
    console.log(`🏋️ Iniciando teste de stress com ${count} requisições...`);
    const tokens = localStorage.getItem('flow.tokens');
    if (!tokens) {
      console.log('❌ Nenhum token encontrado');
      return;
    }
    
    const { accessToken } = JSON.parse(tokens);
    const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:3000';
    
    const startTime = performance.now();
    const promises = [];
    
    for (let i = 0; i < count; i++) {
      promises.push(
        fetch(`${API_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })
        .then(r => ({ id: i, status: r.status, ok: r.ok }))
        .catch(e => ({ id: i, error: e.message }))
      );
    }
    
    const results = await Promise.all(promises);
    const endTime = performance.now();
    
    console.log('📊 Resultados:');
    console.log(`   Total: ${count} requisições`);
    console.log(`   Tempo: ${(endTime - startTime).toFixed(2)}ms`);
    console.log(`   Sucesso: ${results.filter(r => r.ok).length}`);
    console.log(`   Erro: ${results.filter(r => !r.ok).length}`);
    console.log(`   Status únicos:`, [...new Set(results.map(r => r.status))]);
    console.table(results);
  },
  
  /**
   * Monitora mudanças nos tokens
   */
  watchTokens() {
    console.log('👀 Monitorando mudanças nos tokens...');
    console.log('   (Pressione Ctrl+C ou execute tokenTestHelper.stopWatch() para parar)');
    
    let lastValue = localStorage.getItem('flow.tokens');
    
    const interval = setInterval(() => {
      const currentValue = localStorage.getItem('flow.tokens');
      if (currentValue !== lastValue) {
        console.log('🔄 Tokens mudaram!');
        if (!currentValue) {
          console.log('   ❌ Tokens foram removidos');
        } else if (!lastValue) {
          console.log('   ✅ Tokens foram adicionados');
        } else {
          console.log('   🔄 Tokens foram atualizados');
        }
        this.showTokens();
        lastValue = currentValue;
      }
    }, 1000);
    
    this._watchInterval = interval;
    return () => clearInterval(interval);
  },
  
  /**
   * Para o monitoramento
   */
  stopWatch() {
    if (this._watchInterval) {
      clearInterval(this._watchInterval);
      console.log('✅ Monitoramento parado');
    }
  },
  
  /**
   * Mostra ajuda
   */
  help() {
    console.log(`
🧪 Token Test Helper - Comandos Disponíveis:

tokenTestHelper.showTokens()       - Mostra tokens atuais e tempo de expiração
tokenTestHelper.clearTokens()      - Remove tokens (simula logout)
tokenTestHelper.corruptTokens()    - Corrompe tokens (simula token inválido)
tokenTestHelper.testRequest()      - Testa requisição com token atual
tokenTestHelper.stressTest(10)     - Teste de stress com N requisições
tokenTestHelper.watchTokens()      - Monitora mudanças nos tokens em tempo real
tokenTestHelper.stopWatch()        - Para o monitoramento
tokenTestHelper.help()             - Mostra esta ajuda

📚 Exemplos:

// Ver tokens
tokenTestHelper.showTokens();

// Simular expiração
tokenTestHelper.corruptTokens();
// Agora navegue entre páginas e observe o comportamento

// Testar refresh automático
tokenTestHelper.corruptTokens();
tokenTestHelper.testRequest();

// Teste de carga
tokenTestHelper.stressTest(20);

// Monitorar em tempo real
tokenTestHelper.watchTokens();
// Navegue pelo sistema e veja os tokens sendo atualizados
    `);
  }
};

// Auto-executar help na primeira vez
console.log('✅ Token Test Helper carregado!');
console.log('💡 Execute: tokenTestHelper.help() para ver comandos disponíveis');

