const fs = require('fs');

let credJsPath = 'frontend/credenciamento.js';
let credJs = fs.readFileSync(credJsPath, 'utf8');

// 1. Add onchange to checkboxes (Regex robusto)
const colabRegex = /<input type="checkbox" id="cred-colab-\$\{c\.id\}" value="\$\{c\.id\}"\s+\$\{credenciamentoState\.selecionadosColabs\.includes\(String\(c\.id\)\) \? 'checked' : ''\}>/g;
const colabNew = `<input type="checkbox" id="cred-colab-\${c.id}" value="\${c.id}" \${credenciamentoState.selecionadosColabs.includes(String(c.id)) ? 'checked' : ''} onchange="window.verificarLimiteColabCred()">`;
credJs = credJs.replace(colabRegex, colabNew);

const veicRegex = /<input type="checkbox" id="cred-veic-\$\{v\.id\}" value="\$\{v\.id\}"\s+\$\{credenciamentoState\.selecionadosVeic\.includes\(String\(v\.id\)\) \? 'checked' : ''\}>/g;
const veicNew = `<input type="checkbox" id="cred-veic-\${v.id}" value="\${v.id}" \${credenciamentoState.selecionadosVeic.includes(String(v.id)) ? 'checked' : ''} onchange="window.verificarLimiteVeicCred()">`;
credJs = credJs.replace(veicRegex, veicNew);

// 2. Update verificarLimite functions
const verifyRegex = /window\.verificarLimiteColabCred = function\(cb\) \{[\s\S]*?window\.verificarLimiteVeicCred = function\(cb\) \{[\s\S]*?\};/g;
const newVerify = `window.verificarLimiteColabCred = function() {
    const limitNum = window._credLimites ? parseInt(window._credLimites.colabs) || 0 : 0;
    const checkboxes = document.querySelectorAll('#lista-selecao-colab input[type="checkbox"]:checked');
    let count = checkboxes.length;
    
    const spanModal = document.getElementById('cred-modal-limit-colabs-span');
    if (spanModal) {
        spanModal.textContent = \`(\${count}/\${limitNum > 0 ? limitNum : 'Todos'})\`;
        if (limitNum > 0 && count > limitNum) {
            spanModal.style.color = '#ef4444';
            spanModal.style.fontWeight = 'bold';
        } else {
            spanModal.style.color = '#64748b';
            spanModal.style.fontWeight = 'normal';
        }
    }
};

window.verificarLimiteVeicCred = function() {
    const limitNum = window._credLimites ? parseInt(window._credLimites.veics) || 0 : 0;
    const checkboxes = document.querySelectorAll('#lista-selecao-veic input[type="checkbox"]:checked');
    let count = checkboxes.length;
    
    const spanModal = document.getElementById('cred-modal-limit-veics-span');
    if (spanModal) {
        spanModal.textContent = \`(\${count}/\${limitNum > 0 ? limitNum : 'Todos'})\`;
        if (limitNum > 0 && count > limitNum) {
            spanModal.style.color = '#ef4444';
            spanModal.style.fontWeight = 'bold';
        } else {
            spanModal.style.color = '#64748b';
            spanModal.style.fontWeight = 'normal';
        }
    }
};`;

credJs = credJs.replace(verifyRegex, newVerify);

// 3. Revert selecionarTodos functions to NOT block
const selTodosRegex = /window\.selecionarTodosColabs = function\(\) \{[\s\S]*?window\.selecionarTodosVeiculos = function\(\) \{[\s\S]*?\}/g;
const newSelTodos = `window.selecionarTodosColabs = function() {
    const checkboxes = document.querySelectorAll('#lista-selecao-colab input[type="checkbox"]');
    const todosChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !todosChecked);
    
    if (typeof window.verificarLimiteColabCred === 'function') window.verificarLimiteColabCred();
    
    const btn = document.getElementById('btn-todos-colabs');
    if (btn) btn.textContent = todosChecked ? 'Selecionar Todos' : 'Desmarcar Todos';
}
window.selecionarTodosVeiculos = function() {
    const checkboxes = document.querySelectorAll('#lista-selecao-veic input[type="checkbox"]');
    const todosChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !todosChecked);
    
    if (typeof window.verificarLimiteVeicCred === 'function') window.verificarLimiteVeicCred();
    
    const btn = document.getElementById('btn-todos-veics');
    if (btn) btn.textContent = todosChecked ? 'Selecionar Todos' : 'Desmarcar Todos';
}`;
credJs = credJs.replace(selTodosRegex, newSelTodos);

fs.writeFileSync(credJsPath, credJs, 'utf8');
console.log("Updated check logic to not block and properly update real-time.");