/**
 * Script de Teste Automatizado de Navegação
 * 
 * Como usar:
 * 1. Abra http://localhost:5173
 * 2. Faça login
 * 3. Abra Console (F12)
 * 4. Cole este script e pressione Enter
 * 5. Digite: testarNavegacao(20) // testa 20 cliques
 */

window.testarNavegacao = function(numCliques = 20) {
    console.log(`%c🚀 INICIANDO TESTE DE NAVEGAÇÃO`, 'background: #4CAF50; color: white; padding: 5px; font-weight: bold');
    console.log(`%c📊 ${numCliques} cliques programados`, 'color: #2196F3; font-weight: bold');
    console.log('');
    
    const paginas = ['dashboard', 'clients', 'agenda', 'finance', 'settings', 'account'];
    let cliquesRealizados = 0;
    let erros = 0;
    let sucessos = 0;
    
    const paginaInicial = localStorage.getItem('flow_page') || 'dashboard';
    console.log(`%c📍 Página inicial: ${paginaInicial}`, 'color: #FF9800');
    console.log('');
    
    function clicarPagina(index) {
        if (cliquesRealizados >= numCliques) {
            finalizarTeste();
            return;
        }
        
        const paginaAleatoria = paginas[Math.floor(Math.random() * paginas.length)];
        cliquesRealizados++;
        
        console.log(`%c[${cliquesRealizados}/${numCliques}] Clicando em: ${paginaAleatoria}`, 'color: #9C27B0; font-weight: bold');
        
        try {
            // Simular click no menu
            const botoes = Array.from(document.querySelectorAll('button'));
            const botaoPagina = botoes.find(btn => {
                const texto = btn.textContent.toLowerCase();
                if (paginaAleatoria === 'dashboard') return texto.includes('dashboard') || texto.includes('painel');
                if (paginaAleatoria === 'clients') return texto.includes('client') || texto.includes('clientes');
                if (paginaAleatoria === 'agenda') return texto.includes('agenda') || texto.includes('calendar');
                if (paginaAleatoria === 'finance') return texto.includes('finance') || texto.includes('finan');
                if (paginaAleatoria === 'settings') return texto.includes('setting') || texto.includes('config');
                if (paginaAleatoria === 'account') return texto.includes('account') || texto.includes('conta');
                return false;
            });
            
            if (botaoPagina) {
                botaoPagina.click();
                sucessos++;
                console.log(`%c  ✅ Click executado`, 'color: #4CAF50');
            } else {
                console.log(`%c  ⚠️ Botão não encontrado para ${paginaAleatoria}`, 'color: #FF9800');
            }
            
        } catch (error) {
            erros++;
            console.error(`%c  ❌ ERRO ao clicar:`, 'color: #F44336; font-weight: bold', error);
        }
        
        // Próximo clique com delay variável (250ms a 1500ms)
        const delay = 250 + Math.random() * 1250;
        setTimeout(() => clicarPagina(index + 1), delay);
    }
    
    function finalizarTeste() {
        console.log('');
        console.log(`%c═══════════════════════════════════════`, 'color: #607D8B');
        console.log(`%c✅ TESTE CONCLUÍDO!`, 'background: #4CAF50; color: white; padding: 5px; font-weight: bold; font-size: 14px');
        console.log(`%c═══════════════════════════════════════`, 'color: #607D8B');
        console.log('');
        console.log(`%c📊 ESTATÍSTICAS:`, 'color: #2196F3; font-weight: bold; font-size: 13px');
        console.log(`   Total de cliques: ${cliquesRealizados}`);
        console.log(`   %c✅ Sucessos: ${sucessos}`, 'color: #4CAF50; font-weight: bold');
        console.log(`   %c❌ Erros: ${erros}`, 'color: #F44336; font-weight: bold');
        console.log('');
        
        if (erros === 0) {
            console.log(`%c🎉 PERFEITO! Nenhum erro detectado!`, 'background: #4CAF50; color: white; padding: 5px; font-weight: bold');
        } else {
            console.log(`%c⚠️ ATENÇÃO: ${erros} erro(s) encontrado(s)`, 'background: #FF9800; color: white; padding: 5px; font-weight: bold');
        }
        
        console.log('');
        console.log(`%c💡 Verifique se a navegação travou`, 'color: #2196F3');
        console.log(`%c   Se travou, role para cima e veja o último log antes do travamento`, 'color: #757575');
        console.log('');
    }
    
    // Iniciar teste após 1 segundo
    setTimeout(() => clicarPagina(0), 1000);
};

// Monitorar mudanças de página
let ultimaPagina = localStorage.getItem('flow_page') || 'dashboard';
setInterval(() => {
    const paginaAtual = localStorage.getItem('flow_page') || 'dashboard';
    if (paginaAtual !== ultimaPagina) {
        console.log(`%c📍 Página mudou: ${ultimaPagina} → ${paginaAtual}`, 'color: #00BCD4; font-weight: bold');
        ultimaPagina = paginaAtual;
    }
}, 100);

console.log(`%c✅ Script de teste carregado!`, 'background: #4CAF50; color: white; padding: 5px; font-weight: bold');
console.log('');
console.log(`%c📖 COMO USAR:`, 'color: #2196F3; font-weight: bold; font-size: 13px');
console.log(`   Digite no console: %ctestarNavegacao(20)`, 'color: #9C27B0; font-weight: bold');
console.log(`   (Isso testará 20 cliques aleatórios)`);
console.log('');
console.log(`%c💡 DICA: Deixe esta janela visível durante o teste!`, 'color: #FF9800; font-weight: bold');
console.log('');
