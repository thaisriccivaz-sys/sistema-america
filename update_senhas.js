const fs = require('fs');
const path = 'frontend/logistica_senhas.js';
let content = fs.readFileSync(path, 'utf8');

// Insert currentSenhaTab definition at the top
content = content.replace("let senhasLogisticaList = [];", "let senhasLogisticaList = [];\nlet currentSenhaTab = 'compartilhada';");

// Insert Tabs UI
content = content.replace(
    /<div class="card p-4">/,
    `<div class="tabs" style="display:flex; gap:1rem; margin-bottom:1rem; border-bottom:1px solid #e2e8f0; padding-bottom:0.5rem; margin-top: -0.5rem;">
            <button id="tab-senha-comp" onclick="switchSenhaTab('compartilhada')" style="background:none; border:none; border-bottom:2px solid #2d9e5f; color:#2d9e5f; font-weight:600; padding:0.5rem 1rem; cursor:pointer; font-size:1rem;">Senhas Compartilhadas</button>
            <button id="tab-senha-pess" onclick="switchSenhaTab('pessoal')" style="background:none; border:none; border-bottom:2px solid transparent; color:#64748b; font-weight:600; padding:0.5rem 1rem; cursor:pointer; font-size:1rem;">Senhas Pessoais</button>
        </div>
        <div class="card p-4">`
);

// Insert 'tipo' field to modal
content = content.replace(
    /<div class="input-group mb-3">\s*<label>Nome do Serviço \/ Tipo de Acesso \*/,
    `<div class="input-group mb-3">
                            <label>Visibilidade *</label>
                            <select id="senha-tipo" required style="width:100%;padding:0.6rem;border:1px solid #e2e8f0;border-radius:6px;outline:none;background:#f8fafc;">
                                <option value="compartilhada">Senha Compartilhada (Uso Geral)</option>
                                <option value="pessoal">Senha Pessoal (Privado)</option>
                            </select>
                        </div>
                        <div class="input-group mb-3">
                            <label>Nome do Serviço / Tipo de Acesso *`
);

// Filter logic update
content = content.replace(
    /return matchServico && matchUsuario && matchLink;/,
    `let matchTab = (s.tipo === currentSenhaTab || (!s.tipo && currentSenhaTab === 'compartilhada'));
        return matchServico && matchUsuario && matchLink && matchTab;`
);

// openSenhasModal update
content = content.replace(
    /document\.getElementById\('senha-id'\)\.value = '';/,
    `document.getElementById('senha-id').value = '';
    document.getElementById('senha-tipo').value = currentSenhaTab;`
);

// editarSenha update
content = content.replace(
    /document\.getElementById\('senha-id'\)\.value = senhaObj\.id;/,
    `document.getElementById('senha-id').value = senhaObj.id;
    document.getElementById('senha-tipo').value = senhaObj.tipo || 'compartilhada';`
);

// salvarSenha update
content = content.replace(
    /const senha = document\.getElementById\('senha-valor'\)\.value\.trim\(\);/,
    `const senha = document.getElementById('senha-valor').value.trim();
    const tipo = document.getElementById('senha-tipo').value;`
);

content = content.replace(
    /const payload = \{ servico, link, usuario, senha \};/,
    `const payload = { servico, link, usuario, senha, tipo };`
);

// Add switchSenhaTab function at the end
content += `\n
function switchSenhaTab(tipo) {
    currentSenhaTab = tipo;
    const btnComp = document.getElementById('tab-senha-comp');
    const btnPess = document.getElementById('tab-senha-pess');
    if (tipo === 'compartilhada') {
        btnComp.style.borderBottomColor = '#2d9e5f'; btnComp.style.color = '#2d9e5f';
        btnPess.style.borderBottomColor = 'transparent'; btnPess.style.color = '#64748b';
    } else {
        btnPess.style.borderBottomColor = '#2d9e5f'; btnPess.style.color = '#2d9e5f';
        btnComp.style.borderBottomColor = 'transparent'; btnComp.style.color = '#64748b';
    }
    filtrarSenhasMulti();
}
`;

fs.writeFileSync(path, content, 'utf8');
console.log('Updated logistica_senhas.js');