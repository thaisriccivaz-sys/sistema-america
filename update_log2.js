const fs = require('fs');

let path = 'frontend/credenciamento.js';
let content = fs.readFileSync(path, 'utf8');

const insertAfter = '<div style="display:flex; flex-wrap:wrap; gap:30px;">';
const newDetails = `<div style="flex:1; min-width:250px;">
                        <div style="color:#64748b; font-weight:600; margin-bottom:4px;">⏱️ Status Detalhado:</div>
                        <div style="color:#334155; font-size:0.8rem; line-height:1.6;">
                            <b>Solicitado em:</b> \${solDataStr} (por \${solNome})<br>
                            \${cred.enviado_em ? \`<b>Enviado em:</b> \${new Date(cred.enviado_em).toLocaleString('pt-BR')} (por \${envNome})<br>\` : ''}
                            \${cred.acessado_em ? \`<b>Acessado em:</b> \${new Date(cred.acessado_em).toLocaleString('pt-BR')}<br>\` : ''}
                        </div>
                    </div>`;

// Replace first occurrence (which is inside _renderizarTabelaHistorico)
if (!content.includes('⏱️ Status Detalhado:')) {
    content = content.replace(insertAfter, insertAfter + "\n                    " + newDetails);
    
    // Replace second occurrence (if exists) by looking for the next insertAfter after the first replacement
    const firstIndex = content.indexOf('⏱️ Status Detalhado:');
    if (firstIndex !== -1) {
        const nextPartIndex = content.indexOf(insertAfter, firstIndex);
        if (nextPartIndex !== -1) {
            content = content.substring(0, nextPartIndex) + 
                      content.substring(nextPartIndex).replace(insertAfter, insertAfter + "\n                    " + newDetails);
        }
    }
    
    fs.writeFileSync(path, content, 'utf8');
    console.log("Added status details to credenciamento.js details block");
} else {
    console.log("Details already exist in credenciamento.js");
}