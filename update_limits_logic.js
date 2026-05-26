const fs = require('fs');

let credJsPath = 'frontend/credenciamento.js';
let credJs = fs.readFileSync(credJsPath, 'utf8');

// 1. Injetar window._credLimites em abrirModalCumprirSolicitacao
const oldModalOpenStr = "window._credSolicitacaoId = id;";
const newModalOpenStr = `window._credSolicitacaoId = id;

    window._credLimites = {
        colabs: dados ? parseInt(dados.qtd_max_colaboradores || 0) : 0,
        veics: dados ? parseInt(dados.qtd_max_veiculos || 0) : 0
    };
    
    const maxColabsText = window._credLimites.colabs > 0 ? \`(Máx: \${window._credLimites.colabs})\` : '(Ilimitado)';
    const maxVeicsText = window._credLimites.veics > 0 ? \`(Máx: \${window._credLimites.veics})\` : '(Ilimitado)';
    
    const spanColabs = document.getElementById('cred-limit-colabs-span');
    if (spanColabs) spanColabs.textContent = maxColabsText;
    
    const spanVeics = document.getElementById('cred-limit-veics-span');
    if (spanVeics) spanVeics.textContent = maxVeicsText;
    
    const spanModalColabs = document.getElementById('cred-modal-limit-colabs-span');
    if (spanModalColabs) spanModalColabs.textContent = maxColabsText;
    
    const spanModalVeics = document.getElementById('cred-modal-limit-veics-span');
    if (spanModalVeics) spanModalVeics.textContent = maxVeicsText;`;

credJs = credJs.replace(oldModalOpenStr, newModalOpenStr);

// Also in abrirModalNovoCredenciamento (set to Ilimitado)
const oldNovoOpenStr = "window._credSolicitacaoId = null;";
const newNovoOpenStr = `window._credSolicitacaoId = null;
    window._credLimites = { colabs: 0, veics: 0 };
    const spanColabs = document.getElementById('cred-limit-colabs-span'); if (spanColabs) spanColabs.textContent = '(Ilimitado)';
    const spanVeics = document.getElementById('cred-limit-veics-span'); if (spanVeics) spanVeics.textContent = '(Ilimitado)';
    const spanModalColabs = document.getElementById('cred-modal-limit-colabs-span'); if (spanModalColabs) spanModalColabs.textContent = '(Ilimitado)';
    const spanModalVeics = document.getElementById('cred-modal-limit-veics-span'); if (spanModalVeics) spanModalVeics.textContent = '(Ilimitado)';`;

credJs = credJs.replace(oldNovoOpenStr, newNovoOpenStr);

// 2. Modify renderListaColabsCred
const renderColabsOld = `<input type="checkbox" id="cred-colab-\${c.id}" value="\${c.id}"
                \${credenciamentoState.selecionadosColabs.includes(String(c.id)) ? 'checked' : ''}>`;
const renderColabsNew = `<input type="checkbox" id="cred-colab-\${c.id}" value="\${c.id}"
                \${credenciamentoState.selecionadosColabs.includes(String(c.id)) ? 'checked' : ''} onchange="window.verificarLimiteColabCred(this)">`;
credJs = credJs.replace(renderColabsOld, renderColabsNew);

// 3. Modify renderListaVeicCred
const renderVeicsOld = `<input type="checkbox" id="cred-veic-\${v.id}" value="\${v.id}"
                \${credenciamentoState.selecionadosVeic.includes(String(v.id)) ? 'checked' : ''}>`;
const renderVeicsNew = `<input type="checkbox" id="cred-veic-\${v.id}" value="\${v.id}"
                \${credenciamentoState.selecionadosVeic.includes(String(v.id)) ? 'checked' : ''} onchange="window.verificarLimiteVeicCred(this)">`;
credJs = credJs.replace(renderVeicsOld, renderVeicsNew);

// 4. Inject verificarLimite functions
const verifyLimitsLogic = `
window.verificarLimiteColabCred = function(cb) {
    if (!cb.checked) return;
    const limit = window._credLimites ? window._credLimites.colabs : 0;
    if (limit <= 0) return;
    const checkboxes = document.querySelectorAll('#lista-selecao-colab input[type="checkbox"]:checked');
    if (checkboxes.length > limit) {
        alert('Você não pode selecionar mais de ' + limit + ' colaborador(es) nesta solicitação.');
        cb.checked = false;
    }
};

window.verificarLimiteVeicCred = function(cb) {
    if (!cb.checked) return;
    const limit = window._credLimites ? window._credLimites.veics : 0;
    if (limit <= 0) return;
    const checkboxes = document.querySelectorAll('#lista-selecao-veic input[type="checkbox"]:checked');
    if (checkboxes.length > limit) {
        alert('Você não pode selecionar mais de ' + limit + ' veículo(s) nesta solicitação.');
        cb.checked = false;
    }
};
`;

if (!credJs.includes("window.verificarLimiteColabCred")) {
    credJs = credJs.replace('// ── Selecionar Todos ──────────────────────────────────────────────────────────', verifyLimitsLogic + '\n// ── Selecionar Todos ──────────────────────────────────────────────────────────');
}

// 5. Update selecionarTodos
const selColabsOld = `window.selecionarTodosColabs = function() {
    const checkboxes = document.querySelectorAll('#lista-selecao-colab input[type="checkbox"]');
    const todosChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !todosChecked);
    const btn = document.getElementById('btn-todos-colabs');
    if (btn) btn.textContent = todosChecked ? 'Selecionar Todos' : 'Desmarcar Todos';
}`;
const selColabsNew = `window.selecionarTodosColabs = function() {
    const checkboxes = document.querySelectorAll('#lista-selecao-colab input[type="checkbox"]');
    const todosChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    if (todosChecked) {
        checkboxes.forEach(cb => cb.checked = false);
    } else {
        const limit = window._credLimites ? window._credLimites.colabs : 0;
        let count = 0;
        checkboxes.forEach(cb => {
            if (limit > 0 && count >= limit) {
                cb.checked = false;
            } else {
                cb.checked = true;
                count++;
            }
        });
        if (limit > 0 && checkboxes.length > limit) {
            alert('Apenas ' + limit + ' colaborador(es) foram selecionados devido ao limite da solicitação.');
        }
    }
    const btn = document.getElementById('btn-todos-colabs');
    if (btn) btn.textContent = todosChecked ? 'Selecionar Todos' : 'Desmarcar Todos';
}`;
credJs = credJs.replace(selColabsOld, selColabsNew);

const selVeicsOld = `window.selecionarTodosVeiculos = function() {
    const checkboxes = document.querySelectorAll('#lista-selecao-veic input[type="checkbox"]');
    const todosChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !todosChecked);
    const btn = document.getElementById('btn-todos-veics');
    if (btn) btn.textContent = todosChecked ? 'Selecionar Todos' : 'Desmarcar Todos';
}`;
const selVeicsNew = `window.selecionarTodosVeiculos = function() {
    const checkboxes = document.querySelectorAll('#lista-selecao-veic input[type="checkbox"]');
    const todosChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    if (todosChecked) {
        checkboxes.forEach(cb => cb.checked = false);
    } else {
        const limit = window._credLimites ? window._credLimites.veics : 0;
        let count = 0;
        checkboxes.forEach(cb => {
            if (limit > 0 && count >= limit) {
                cb.checked = false;
            } else {
                cb.checked = true;
                count++;
            }
        });
        if (limit > 0 && checkboxes.length > limit) {
            alert('Apenas ' + limit + ' veículo(s) foram selecionados devido ao limite da solicitação.');
        }
    }
    const btn = document.getElementById('btn-todos-veics');
    if (btn) btn.textContent = todosChecked ? 'Selecionar Todos' : 'Desmarcar Todos';
}`;
credJs = credJs.replace(selVeicsOld, selVeicsNew);

fs.writeFileSync(credJsPath, credJs, 'utf8');
console.log("Updated credenciamento.js with limits logic");