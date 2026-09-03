const fs = require('fs');
let code = fs.readFileSync('frontend/app.js', 'utf8');

const newCarregar = `async function carregarOpcoesResponsavel(selectElementId, responsavelId, responsavelNome) {
    const select = document.getElementById(selectElementId);
    if (!select) return;

    // Buscar colaboradores
    const colabs = await apiGet('/colaboradores');
    select.innerHTML = '<option value="">Nenhum</option>';

    let foundMatch = null;
    if (colabs) {
        colabs.forEach(c => {
            if (c.status === 'Desligado') return;
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.dataset.nome = c.nome_completo;
            opt.textContent = c.nome_completo;
            
            if ((responsavelId && c.id == responsavelId) || (!responsavelId && responsavelNome && c.nome_completo === responsavelNome)) {
                opt.selected = true;
                foundMatch = c.id;
            }
            select.appendChild(opt);
        });
        if (foundMatch) {
            select.value = foundMatch;
        } else {
            select.value = ""; // fallback para Nenhum
        }
    }
}`;

// Replace carregarOpcoesResponsavel
code = code.replace(/async function carregarOpcoesResponsavel.*?^\}/ms, newCarregar);

// Replace editDepartamento signature and call
const oldEdit = `window.editDepartamento = async function (id, nomeAtual, tipoAtual, responsavelIdAtual, nomeAsoAtual) {`;
const newEdit = `window.editDepartamento = async function (id, nomeAtual, tipoAtual, responsavelIdAtual, nomeAsoAtual, responsavelNomeAtual) {`;
code = code.replace(oldEdit, newEdit);
code = code.replace(/await carregarOpcoesResponsavel\('edit-departamento-responsavel', responsavelIdAtual\);/g, "await carregarOpcoesResponsavel('edit-departamento-responsavel', responsavelIdAtual, responsavelNomeAtual);");

// Replace onclick in renderDepartamentosTabela
const oldClick = `onclick="editDepartamento(\\$\\{d.id\\}, '\\$\\{d.nome.replace(/'/g, \\"\\\\'\\")\\}','\\$\\{tipo\\}','\\$\\{d.responsavel_id || ''\\}','\\$\\{(d.nome_aso||'').replace(/\\'/g,\\"\\\\\\\\'\\")\\}')"`;
const newClick = `onclick="editDepartamento(\\$\\{d.id\\}, '\\$\\{d.nome.replace(/'/g, \\"\\\\'\\")\\}','\\$\\{tipo\\}','\\$\\{d.responsavel_id || ''\\}','\\$\\{(d.nome_aso||'').replace(/\\'/g,\\"\\\\\\\\'\\")\\}', '\\$\\{(d.responsavel_nome||'').replace(/'/g, \\"\\\\'\\")\\}')"`;

// Since regex for strings with so many escapes can be brittle, I'll do a simple split/join around the onclick
let parts = code.split('onclick="editDepartamento(${d.id}');
if (parts.length > 1) {
    let replaced = parts[0];
    for (let i = 1; i < parts.length; i++) {
        let p = parts[i];
        let endIdx = p.indexOf(')"');
        if (endIdx !== -1) {
            let inside = p.substring(0, endIdx); // e.g. ", '${d.nome...}', '${tipo}', '${d.responsavel_id || ''}', '${d.nome_aso...}'"
            replaced += 'onclick="editDepartamento(${d.id}' + inside + `, '\${(d.responsavel_nome||\\'\\').replace(/\\'/g, \\"\\\\\\\\'\\")}')"` + p.substring(endIdx + 2);
        } else {
            replaced += 'onclick="editDepartamento(${d.id}' + p;
        }
    }
    code = replaced;
    console.log('Patched onclick');
}

fs.writeFileSync('frontend/app.js', code, 'utf8');
console.log('Saved app.js');
