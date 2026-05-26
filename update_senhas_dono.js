const fs = require('fs');
const path = 'frontend/logistica_senhas.js';
let content = fs.readFileSync(path, 'utf8');

// Update initLogisticaSenhas to inject the header dynamically or we can just leave a placeholder or generate the table head via JS.
// Actually, it's easier to just give the <th> an ID and toggle its display in `renderSenhasTable`.
content = content.replace(
    /<th>Usuário<\/th>/,
    `<th>Usuário</th>\n                            <th id="th-dono-senha" style="display:none; color:#d9480f;">Dono do Sistema</th>`
);
content = content.replace(
    /<tr><td colspan="5"/g,
    `<tr><td colspan="6"`
);

// Update renderSenhasTable
const renderTableReplacement = `
function renderSenhasTable(senhas) {
    const tbody = document.getElementById('table-senhas-body');
    const thDono = document.getElementById('th-dono-senha');
    if (!tbody) return;

    const isDiretoria = window.isTopAdmin || (window.currentUser && String(window.currentUser.departamento).toLowerCase().includes('diretoria') || String(window.currentUser?.role).toLowerCase() === 'diretoria');
    const showDono = isDiretoria && currentSenhaTab === 'pessoal';

    if (thDono) {
        thDono.style.display = showDono ? 'table-cell' : 'none';
    }

    if (!senhas || senhas.length === 0) {
        tbody.innerHTML = \`<tr><td colspan="\${showDono ? 6 : 5}" style="text-align:center; padding:2rem; color:#64748b;">Nenhuma senha cadastrada.</td></tr>\`;
        return;
    }

    tbody.innerHTML = '';
    senhas.forEach((s, index) => {
        const tr = document.createElement('tr');
        
        let linkHtml = s.link ? \`<a href="\${s.link}" target="_blank" style="color:#228be6; text-decoration:none; display:flex; align-items:center; gap:4px; max-width:250px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="\${s.link}"><i class="ph ph-link" style="flex-shrink:0;"></i> <span style="overflow:hidden; text-overflow:ellipsis;">\${s.link}</span></a>\` : '<span style="color:#94a3b8;">-</span>';
        
        // Input readonly password field para facilitar copiar/mostrar
        const pwdId = \`table-pwd-\${s.id}\`;
        const pwdHtml = \`
            <div style="display:flex; align-items:center; gap:8px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:4px 8px;">
                <input type="password" id="\${pwdId}" value="\${s.senha.replace(/"/g, '&quot;')}" readonly style="border:none; background:transparent; width:100%; outline:none; font-family:monospace; color:#334155; pointer-events:none;">
                <button type="button" onclick="togglePasswordVisibility('\${pwdId}', 'icon-\${pwdId}')" style="background:none; border:none; cursor:pointer; color:#64748b; display:flex; align-items:center;" title="Mostrar/Ocultar">
                    <i class="ph ph-eye" id="icon-\${pwdId}"></i>
                </button>
                <button type="button" onclick="copiarSenha('\${pwdId}')" style="background:none; border:none; cursor:pointer; color:#64748b; display:flex; align-items:center;" title="Copiar Senha">
                    <i class="ph ph-copy"></i>
                </button>
            </div>
        \`;

        let donoHtml = showDono ? \`<td style="color:#d9480f; font-weight:600; font-size:0.9rem;">\${s.owner_nome || s.owner_username || 'Desconhecido'}</td>\` : '';

        tr.innerHTML = \`
            <td style="font-weight:600; color:#1e293b;">\${s.servico}</td>
            <td>\${linkHtml}</td>
            <td style="font-family:monospace; font-size:0.95rem;">\${s.usuario}</td>
            \${donoHtml}
            <td>\${pwdHtml}</td>
            <td style="text-align: right;">
                <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
                    <button class="btn-action btn-sm" style="color:#228be6; background:#e7f5ff; border:none;" onclick='editarSenha(\${JSON.stringify(s)})' title="Editar"><i class="ph ph-pencil"></i></button>
                    <button class="btn-action btn-sm" style="color:#ef4444; background:#fee2e2; border:none;" onclick="excluirSenha(\${s.id})" title="Excluir"><i class="ph ph-trash"></i></button>
                </div>
            </td>
        \`;
        tbody.appendChild(tr);
    });
}
`;

// Extract old renderSenhasTable to replace it
const oldRenderMatch = content.match(/function renderSenhasTable\(senhas\) \{[\s\S]*?    \}\);\n\}/);
if (oldRenderMatch) {
    content = content.replace(oldRenderMatch[0], renderTableReplacement.trim());
    fs.writeFileSync(path, content, 'utf8');
    console.log("Updated logistica_senhas.js");
} else {
    console.log("Could not find renderSenhasTable block");
}