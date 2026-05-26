const fs = require('fs');

// Fix frontend/credenciamento.js
let js = fs.readFileSync('frontend/credenciamento.js', 'utf8');

// Modals
js = js.replace(/function abrirModalAddCredColab\(\)/g, 'window.abrirModalAddCredColab = function()');
js = js.replace(/function fecharModalAddCredColab\(\)/g, 'window.fecharModalAddCredColab = function()');
js = js.replace(/function abrirModalAddCredVeic\(\)/g, 'window.abrirModalAddCredVeic = function()');
js = js.replace(/function fecharModalAddCredVeic\(\)/g, 'window.fecharModalAddCredVeic = function()');
js = js.replace(/function abrirModalAddCredLicenca\(\)/g, 'window.abrirModalAddCredLicenca = function()');
js = js.replace(/function fecharModalAddCredLicenca\(\)/g, 'window.fecharModalAddCredLicenca = function()');

// Confirm actions
js = js.replace(/function confirmarSelecaoCredColab\(\)/g, 'window.confirmarSelecaoCredColab = function()');
js = js.replace(/function confirmarSelecaoCredVeic\(\)/g, 'window.confirmarSelecaoCredVeic = function()');
js = js.replace(/function confirmarSelecaoCredLicenca\(\)/g, 'window.confirmarSelecaoCredLicenca = function()');

// Select all actions
js = js.replace(/function selecionarTodosColabs\(\)/g, 'window.selecionarTodosColabs = function()');
js = js.replace(/function selecionarTodosVeiculos\(\)/g, 'window.selecionarTodosVeiculos = function()');

// Add select all licenses function
if (!js.includes('selecionarTodasLicencas')) {
    const selecVeicIdx = js.indexOf('window.selecionarTodosVeiculos = function() {');
    if (selecVeicIdx !== -1) {
        const nextFunction = js.indexOf('// ── Filtro de busca nos modais ────────────────────────────────────────────────', selecVeicIdx);
        const newFunc = `
window.selecionarTodasLicencas = function() {
    const checkboxes = document.querySelectorAll('#cred-licencas-quadro input[type="checkbox"]');
    const todosChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => { 
        cb.checked = !todosChecked; 
        window.toggleLicencaCred(cb.value, cb.checked); 
    });
    const btn = document.getElementById('btn-todas-licencas');
    if (btn) btn.textContent = todosChecked ? 'Selecionar Todas' : 'Desmarcar Todas';
}
`;
        js = js.substring(0, nextFunction) + newFunc + js.substring(nextFunction);
    }
}

// Search filtering
js = js.replace(/function filtrarListaCred\(containerId, termo\)/g, 'window.filtrarListaCred = function(containerId, termo)');

// Delete action
js = js.replace(/function excluirCredenciamento\(id\)/g, 'window.excluirCredenciamento = function(id)');

// Generate action
js = js.replace(/async function gerarEnviarCredenciamento\(\)/g, 'window.gerarEnviarCredenciamento = async function()');

fs.writeFileSync('frontend/credenciamento.js', js, 'utf8');

// Fix frontend/index.html (Add 'Selecionar Todas' to licenses modal)
let html = fs.readFileSync('frontend/index.html', 'utf8');
const anchor = '<button class="btn btn-outline" onclick="fecharModalAddCredLicenca()">Cancelar</button>';
if (html.includes(anchor) && !html.includes('btn-todas-licencas')) {
    html = html.replace(
        anchor,
        anchor + '\n                <button id="btn-todas-licencas" class="btn btn-secondary" onclick="window.selecionarTodasLicencas()" style="background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;">Selecionar Todas</button>'
    );
    fs.writeFileSync('frontend/index.html', html, 'utf8');
}

console.log('Fixed missing window references and added select all for licenses.');
