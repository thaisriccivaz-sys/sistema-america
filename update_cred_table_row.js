const fs = require('fs');
let credJsPath = 'frontend/credenciamento.js';
let credJs = fs.readFileSync(credJsPath, 'utf8');

const r1 = /<td style="font-size:0.8rem; line-height:1.6;">\$\{colabsText\}<\/td>\r?\n\s*<td style="font-size:0.8rem; line-height:1.6;">\$\{veicsText\}<\/td>\r?\n\s*<td style="font-size:0.8rem; line-height:1.6;">\$\{licencasText\}<\/td>/g;
const replacement1 = `<td>\${cred.qtd_max_colaboradores === 0 ? 'Ilimitado' : cred.qtd_max_colaboradores}</td>
            <td style="font-size:0.8rem; line-height:1.6;">\${colabsText}</td>
            <td>\${cred.qtd_max_veiculos === 0 ? 'Ilimitado' : cred.qtd_max_veiculos}</td>
            <td style="font-size:0.8rem; line-height:1.6;">\${veicsText}</td>
            <td style="font-size:0.8rem; line-height:1.6;">\${licencasText}</td>`;

credJs = credJs.replace(r1, replacement1);

// Now let's fix the verify limit bugs.
// The user says "o maximo é 2 colaborador e o sistema está deixando eu adicionar quantos quiser, ao adicionar 2 os campos de seleção devem ser desabilitados"
// And "Ao ir adicionando ir mostrando quantos estou adicionando deixando a quantidade assim: 2/5 ou 5/todos"

const verifyColabOld = `window.verificarLimiteColabCred = function(cb) {
    if (!cb.checked) return;
    const limit = window._credLimites ? window._credLimites.colabs : 0;
    if (limit <= 0) return;
    const checkboxes = document.querySelectorAll('#lista-selecao-colab input[type="checkbox"]:checked');
    if (checkboxes.length > limit) {
        alert('Você não pode selecionar mais de ' + limit + ' colaborador(es) nesta solicitação.');
        cb.checked = false;
    }
};`;

const verifyColabNew = `window.verificarLimiteColabCred = function(cb) {
    const limit = window._credLimites ? window._credLimites.colabs : 0;
    const limitNum = parseInt(limit) || 0;
    const checkboxes = document.querySelectorAll('#lista-selecao-colab input[type="checkbox"]:checked');
    let count = checkboxes.length;
    
    if (cb && cb.checked && limitNum > 0 && count > limitNum) {
        alert('Você não pode selecionar mais de ' + limitNum + ' colaborador(es) nesta solicitação.');
        cb.checked = false;
        count--;
    }
    
    // Update label text like 2/5
    const spanModal = document.getElementById('cred-modal-limit-colabs-span');
    if (spanModal) {
        spanModal.textContent = \`(\${count}/\${limitNum > 0 ? limitNum : 'Todos'})\`;
    }

    // Disable unchecked boxes if limit reached
    const allCbs = document.querySelectorAll('#lista-selecao-colab input[type="checkbox"]');
    allCbs.forEach(box => {
        if (!box.checked) {
            box.disabled = (limitNum > 0 && count >= limitNum);
        }
    });
};`;

credJs = credJs.replace(verifyColabOld, verifyColabNew);

const verifyVeicOld = `window.verificarLimiteVeicCred = function(cb) {
    if (!cb.checked) return;
    const limit = window._credLimites ? window._credLimites.veics : 0;
    if (limit <= 0) return;
    const checkboxes = document.querySelectorAll('#lista-selecao-veic input[type="checkbox"]:checked');
    if (checkboxes.length > limit) {
        alert('Você não pode selecionar mais de ' + limit + ' veículo(s) nesta solicitação.');
        cb.checked = false;
    }
};`;

const verifyVeicNew = `window.verificarLimiteVeicCred = function(cb) {
    const limit = window._credLimites ? window._credLimites.veics : 0;
    const limitNum = parseInt(limit) || 0;
    const checkboxes = document.querySelectorAll('#lista-selecao-veic input[type="checkbox"]:checked');
    let count = checkboxes.length;
    
    if (cb && cb.checked && limitNum > 0 && count > limitNum) {
        alert('Você não pode selecionar mais de ' + limitNum + ' veículo(s) nesta solicitação.');
        cb.checked = false;
        count--;
    }
    
    // Update label text like 2/5
    const spanModal = document.getElementById('cred-modal-limit-veics-span');
    if (spanModal) {
        spanModal.textContent = \`(\${count}/\${limitNum > 0 ? limitNum : 'Todos'})\`;
    }

    // Disable unchecked boxes if limit reached
    const allCbs = document.querySelectorAll('#lista-selecao-veic input[type="checkbox"]');
    allCbs.forEach(box => {
        if (!box.checked) {
            box.disabled = (limitNum > 0 && count >= limitNum);
        }
    });
};`;

credJs = credJs.replace(verifyVeicOld, verifyVeicNew);

fs.writeFileSync(credJsPath, credJs, 'utf8');
console.log("Updated table row rendering and disable checks in credenciamento.js");