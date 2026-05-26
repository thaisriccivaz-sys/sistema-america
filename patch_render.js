const fs = require('fs');

const renderBlock = `
        const renderAvatar = (nome, foto, b64) => {
            const initial = (nome || 'U')[0].toUpperCase();
            if (b64) return \\\`<img src="\\\${b64}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;">\\\`;
            if (foto) return \\\`<img src="/\\\${foto}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;" onerror="this.outerHTML='<div style=\\\\'width:36px; height:36px; border-radius:50%; background:#e2e8f0; display:flex; align-items:center; justify-content:center; font-weight:bold; color:#64748b; font-size:16px;\\\\'>\\\${initial}</div>'">\\\`;
            return \\\`<div style="width:36px; height:36px; border-radius:50%; background:#e2e8f0; display:flex; align-items:center; justify-content:center; font-weight:bold; color:#64748b; font-size:16px;">\\\${initial}</div>\\\`;
        };

        const solNome = cred.sol_nome_usuario || cred.sol_username || cred.solicitado_por_nome || 'Usuário Comercial';
        const envNome = cred.env_nome_usuario || cred.env_username || cred.enviado_por_nome || 'Usuário Logística';
        const solDataStr = cred.created_at ? new Date(cred.created_at).toLocaleString('pt-BR') : 'Data não registrada';
        const envDataStr = cred.enviado_em ? new Date(cred.enviado_em).toLocaleString('pt-BR') : 'Data não registrada';
`;

const htmlBlock = `
                <div style="margin-top:15px; padding-top:15px; border-top:1px solid #e2e8f0; display:flex; flex-wrap:wrap; gap:30px;">
                    <div style="flex:1; min-width:250px;">
                        <div style="color:#64748b; font-weight:600; margin-bottom:8px;">Solicitação (Comercial):</div>
                        <div style="display:flex; align-items:center; gap:10px;">
                            \${renderAvatar(solNome, cred.sol_foto, cred.sol_foto_b64)}
                            <div>
                                <div style="font-weight:600; color:#334155; font-size:0.9rem;">\${solNome}</div>
                                <div style="font-size:0.75rem; color:#64748b;"><i class="ph ph-calendar-blank"></i> \${solDataStr}</div>
                            </div>
                        </div>
                    </div>

                    <div style="flex:1; min-width:250px;">
                        <div style="color:#64748b; font-weight:600; margin-bottom:8px;">Envio do Credenciamento (Logística):</div>
                        \${cred.status === 'enviado' || cred.enviado_em ? \`
                            <div style="display:flex; align-items:center; gap:10px;">
                                \${renderAvatar(envNome, cred.env_foto, cred.env_foto_b64)}
                                <div>
                                    <div style="font-weight:600; color:#334155; font-size:0.9rem;">\${envNome}</div>
                                    <div style="font-size:0.75rem; color:#64748b;"><i class="ph ph-calendar-blank"></i> \${envDataStr}</div>
                                </div>
                            </div>
                        \` : \`
                            <div style="padding:10px; background:#fef2f2; color:#ef4444; border-radius:6px; font-size:0.8rem; display:inline-block;">
                                <i class="ph ph-x-circle"></i> Credenciamento não enviado
                            </div>
                        \`}
                    </div>
                    
                    <div style="flex:1; min-width:250px;">
                        <div style="color:#64748b; font-weight:600; margin-bottom:8px;">Acesso do Cliente:</div>
                        \${cred.acessado_em ? \`
                            <div style="padding:10px; background:#f0fdf4; color:#166534; border-radius:6px; font-size:0.8rem; display:inline-block; border:1px solid #bbf7d0;">
                                <i class="ph ph-check-circle"></i> Link acessado pelo cliente
                                <div style="margin-top:4px; font-weight:600;">
                                    <i class="ph ph-clock"></i> Acessado em: \${new Date(cred.acessado_em).toLocaleString('pt-BR')}
                                </div>
                            </div>
                        \` : \`
                            <div style="font-size:0.8rem; color:#94a3b8; font-style:italic;">
                                Cliente ainda não abriu o link.
                            </div>
                        \`}
                    </div>
                </div>
`;

function processFile(path) {
    let content = fs.readFileSync(path, 'utf8');
    
    // Insert renderBlock right before return `<tr>...`
    if (!content.includes('const renderAvatar =')) {
        content = content.replace('return `\n        <tr>', renderBlock + '\n        return `\n        <tr>');
    }
    
    // Replace the HTML
    const startStr = '<div style="margin-top:15px; padding-top:15px; border-top:1px solid #e2e8f0; display:flex; flex-wrap:wrap; gap:30px;">';
    const endStr = '</td>';
    
    const idxStart = content.indexOf(startStr);
    if (idxStart !== -1) {
        const idxEnd = content.indexOf(endStr, idxStart);
        if (idxEnd !== -1) {
            content = content.substring(0, idxStart) + htmlBlock + '            ' + content.substring(idxEnd);
            fs.writeFileSync(path, content, 'utf8');
            console.log("Updated", path);
        }
    }
}

processFile('frontend/comercial_credenciamento.js');
processFile('frontend/credenciamento.js');