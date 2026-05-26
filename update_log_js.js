const fs = require('fs');

let logPath = 'frontend/credenciamento.js';
let logJs = fs.readFileSync(logPath, 'utf8');

// 1. Remove Link, add Reenviar E-mail, change status text
// In _renderizarTabelaHistorico (for search modal) and carregarHistoricoCredenciamento
logJs = logJs.replace(/<span style="color:#16a34a; font-weight:600;"><i class="ph ph-check-circle"><\/i>.*?<\/span>/g, '<span style="color:#16a34a; font-weight:600;"><i class="ph ph-check-circle"></i> Acessado</span>');
logJs = logJs.replace(/<span style="color:#4f46e5; font-weight:600;"><i class="ph ph-paper-plane-right"><\/i>.*?<\/span>/g, '<span style="color:#4f46e5; font-weight:600;"><i class="ph ph-paper-plane-right"></i> Enviado</span>');
logJs = logJs.replace(/<span style="color:#f59e0b; font-weight:600;"><i class="ph ph-clock"><\/i>.*?<\/span>/g, '<span style="color:#f59e0b; font-weight:600;"><i class="ph ph-clock"></i> Recebido</span>');

// Remove Link and add Reenviar E-mail
logJs = logJs.replace(/<a href="\/credenciamento-publico\.html\?token=\$\{cred\.token\}" target="_blank" class="btn-acao"><i class="ph ph-link"><\/i> Link<\/a>/g, 
    `\${cred.token ? \`<button class="btn-acao" onclick="reenviarEmailCredenciamento('\${cred.id}')"><i class="ph ph-envelope-simple"></i> Reenviar</button>\` : ''}`);

logJs = logJs.replace(/<a href="\/credenciamento-publico\.html\?token=\$\{c\.token\}" target="_blank" class="btn-acao"><i class="ph ph-link"><\/i> Link<\/a>/g, 
    `\${c.token ? \`<button class="btn-acao" onclick="reenviarEmailCredenciamento('\${c.id}')"><i class="ph ph-envelope-simple"></i> Reenviar</button>\` : ''}`);

// Ensure reenviarEmailCredenciamento function is added to logJs
if (!logJs.includes('reenviarEmailCredenciamento')) {
    logJs += `
window.reenviarEmailCredenciamento = async function(id) {
    if (!confirm('Deseja reenviar o e-mail do credenciamento para o cliente?')) return;
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch(\`/api/credenciamentos/\${id}/reenviar\`, { method: 'POST', headers: { 'Authorization': \`Bearer \${token}\` } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        alert('E-mail reenviado com sucesso!');
    } catch(err) {
        alert('Erro ao reenviar e-mail: ' + err.message);
    }
};`;
}

fs.writeFileSync(logPath, logJs, 'utf8');
console.log("Updated credenciamento.js with new status text and Reenviar button");