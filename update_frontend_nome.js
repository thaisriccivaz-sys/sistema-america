const fs = require('fs');
const path = 'frontend/logistica_senhas.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Add 'Nome' to the table headers in initLogisticaSenhas
content = content.replace(
    /<th>Serviço \/ Acesso<\/th>/,
    `<th>Nome</th>\n                            <th>Serviço / Acesso</th>`
);

// 2. Remove 'required' from all inputs in the modal, and add 'senha-nome' input
// Current:
// <label>Visibilidade *</label>
// <select id="senha-tipo" required style="width:100%;padding:0.6rem;border:1px solid #e2e8f0;border-radius:6px;outline:none;background:#f8fafc;">
content = content.replace(
    /<select id="senha-tipo" required style=/g,
    `<select id="senha-tipo" style=`
);
content = content.replace(
    /<label>Visibilidade \*<\/label>/g,
    `<label>Visibilidade</label>`
);

content = content.replace(
    /<input type="text" id="senha-servico" list="servicos-list" placeholder="Ex: Cobli, SimpliRoute, etc" autocomplete="off" required>/g,
    `<input type="text" id="senha-servico" list="servicos-list" placeholder="Ex: Cobli, SimpliRoute, etc" autocomplete="off">`
);
content = content.replace(
    /<label>Nome do Serviço \/ Tipo de Acesso \*<\/label>/g,
    `<label>Nome do Serviço / Tipo de Acesso</label>`
);

content = content.replace(
    /<input type="text" id="senha-usuario" placeholder="Login ou e-mail" autocomplete="off" required>/g,
    `<input type="text" id="senha-usuario" placeholder="Login ou e-mail" autocomplete="off">`
);
content = content.replace(
    /<label>Usuário \*<\/label>/g,
    `<label>Usuário</label>`
);

content = content.replace(
    /<input type="password" id="senha-valor" placeholder="Sua senha" autocomplete="new-password" required style="padding-right:40px;">/g,
    `<input type="password" id="senha-valor" placeholder="Sua senha" autocomplete="new-password" style="padding-right:40px;">`
);
content = content.replace(
    /<label>Senha \*<\/label>/g,
    `<label>Senha</label>`
);

// Add the Nome field right above Visibilidade
content = content.replace(
    /<div class="input-group mb-3">\s*<label>Visibilidade<\/label>/,
    `<div class="input-group mb-3">
                            <label>Nome</label>
                            <input type="text" id="senha-nome" placeholder="Ex: Conta Principal" autocomplete="off">
                        </div>
                        <div class="input-group mb-3">
                            <label>Visibilidade</label>`
);

// 3. Update table columns rendering
content = content.replace(
    /<tr><td colspan="5" style=/g,
    `<tr><td colspan="6" style=`
);
content = content.replace(
    /<tr><td colspan="\$\{showDono \? 6 : 5\}" style=/g,
    `<tr><td colspan="\${showDono ? 7 : 6}" style=`
);

content = content.replace(
    /tr\.innerHTML = `\s*<td style="font-weight:600; color:#1e293b;">\$\{s\.servico\}<\/td>/,
    `tr.innerHTML = \`
            <td style="font-weight:600; color:#1e293b;">\${s.nome || '<span style="color:#94a3b8;">-</span>'}</td>
            <td>\${s.servico || '-'}</td>`
);


// 4. Update JavaScript modal logic (openSenhasModal, editarSenha, salvarSenha)
content = content.replace(
    /document\.getElementById\('senha-id'\)\.value = '';/,
    `document.getElementById('senha-id').value = '';
    document.getElementById('senha-nome').value = '';`
);

content = content.replace(
    /document\.getElementById\('senha-id'\)\.value = senhaObj\.id;/,
    `document.getElementById('senha-id').value = senhaObj.id;
    document.getElementById('senha-nome').value = senhaObj.nome || '';`
);

content = content.replace(
    /const servico = document\.getElementById\('senha-servico'\)\.value\.trim\(\);/,
    `const nome = document.getElementById('senha-nome').value.trim();
    const servico = document.getElementById('senha-servico').value.trim();`
);

content = content.replace(
    /if \(!servico \|\| !usuario \|\| !senha\) \{\s*Swal\.fire\('Erro', 'Preencha os campos obrigatórios.', 'error'\);\s*return;\s*\}/,
    ``
);

content = content.replace(
    /const payload = \{ servico, link, usuario, senha, tipo \};/,
    `const payload = { nome, servico, link, usuario, senha, tipo };`
);


fs.writeFileSync(path, content, 'utf8');
console.log('Updated logistica_senhas.js');