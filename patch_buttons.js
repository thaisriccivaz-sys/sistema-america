const fs = require('fs');

// 1. Modificar index.html
let html = fs.readFileSync('frontend/index.html', 'utf8');

const btnHTML = `<button class="btn btn-danger" style="padding: 4px 12px; font-size: 12px; margin-right: 8px;" onclick="window.limparListaCredenciamentos()"><i class="ph ph-trash"></i> Limpar Lista</button>\n                            `;

const searchCom = '<button class="btn btn-outline" style="padding: 4px 12px; font-size: 12px;" onclick="window.carregarHistoricoComCred()">';
if (html.includes(searchCom) && !html.includes('limparListaCredenciamentos')) {
    html = html.replace(searchCom, btnHTML + searchCom);
}

const searchLog = '<button class="btn btn-outline" style="padding: 4px 12px; font-size: 12px;" onclick="window.carregarHistoricoCredenciamento()">';
if (html.includes(searchLog)) {
    // Only replace if not already added
    // Note: since the string is the same except the onclick, and we might have multiple, let's just replace the exact match
    html = html.replace(searchLog, btnHTML + searchLog);
}

fs.writeFileSync('frontend/index.html', html, 'utf8');
console.log('index.html buttons added');

// 2. Adicionar função no credenciamento.js
let js = fs.readFileSync('frontend/credenciamento.js', 'utf8');

const funcJS = `
// ==========================================
// FUNÇÃO PARA LIMPAR TODA A LISTA
// ==========================================
window.limparListaCredenciamentos = async function() {
    if (!confirm('ATENÇÃO: Tem certeza que deseja excluir TODOS os credenciamentos do sistema? Essa ação não pode ser desfeita.')) return;
    
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch('/api/logistica/credenciamentos/limpar-lista', {
            method: 'DELETE',
            headers: { 'Authorization': \`Bearer \${token}\` }
        });
        
        if (!res.ok) throw new Error('Erro ao limpar a lista.');
        
        showToast('Todos os credenciamentos foram limpos.', 'success');
        
        // Atualiza as duas listas caso estejam carregadas
        if (typeof window.carregarHistoricoCredenciamento === 'function') {
            window.carregarHistoricoCredenciamento();
        }
        if (typeof window.carregarHistoricoComCred === 'function') {
            window.carregarHistoricoComCred();
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
};
`;

if (!js.includes('limparListaCredenciamentos')) {
    js += '\n' + funcJS;
    fs.writeFileSync('frontend/credenciamento.js', js, 'utf8');
    console.log('credenciamento.js function added');
}
