const fs = require('fs');

let path = 'frontend/comercial_credenciamento.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Status Badges changes
content = content.replace(/statusBadge = \`<span style="color:#eab308; font-weight:600;"><i class="ph ph-clock"><\/i> Solicitado em \$\{dtFormatada\}<\/span>\`;/g, 
                          'statusBadge = `<span style="color:#eab308; font-weight:600;"><i class="ph ph-clock"></i> Solicitado</span>`;');

// 2. Add Reenviar button to acoes
content = content.replace(/let acoes = '';\s*if \(cred\.status === 'solicitado'\) \{\s*acoes = \`<button class="btn btn-warning btn-sm".*?<\/button>\`;\s*\}/g,
    `let acoes = '';
        if (cred.status === 'solicitado') {
            acoes = \`<button class="btn btn-warning btn-sm" style="padding:4px 8px; font-size:12px; margin-right:4px;" onclick="window.abrirModalSolicitarCredenciamento('\${cred.id}')" title="Editar Solicitação"><i class="ph ph-pencil-simple"></i></button>\`;
        } else if (cred.token) {
            acoes = \`<button class="btn btn-outline btn-sm" style="padding:4px 8px; font-size:12px; margin-right:4px;" onclick="window.reenviarEmailCredenciamento('\${cred.id}')" title="Reenviar E-mail"><i class="ph ph-envelope-simple"></i></button>\`;
        }`);

// 3. Add details info into details row
const insertAfter = '<div style="display:flex; flex-wrap:wrap; gap:30px;">';
const newDetails = `<div style="flex:1; min-width:250px;">
                        <div style="color:#64748b; font-weight:600; margin-bottom:4px;">⏱️ Status Detalhado:</div>
                        <div style="color:#334155; font-size:0.8rem; line-height:1.6;">
                            <b>Solicitado em:</b> \${solDataStr} (por \${solNome})<br>
                            \${cred.enviado_em ? \`<b>Enviado em:</b> \${new Date(cred.enviado_em).toLocaleString('pt-BR')} (por \${envNome})<br>\` : ''}
                            \${cred.acessado_em ? \`<b>Acessado em:</b> \${new Date(cred.acessado_em).toLocaleString('pt-BR')}<br>\` : ''}
                        </div>
                    </div>`;

content = content.replace(insertAfter, insertAfter + "\n                    " + newDetails);

// Ensure reenviarEmailCredenciamento is defined globally in comercial_credenciamento
if (!content.includes('reenviarEmailCredenciamento')) {
    content += `\nwindow.reenviarEmailCredenciamento = async function(id) {
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
};\n`;
}

fs.writeFileSync(path, content, 'utf8');
console.log("Updated comercial_credenciamento.js with status, reenviar button, and details");