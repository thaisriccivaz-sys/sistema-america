const fs = require('fs');
let credJsPath = 'frontend/credenciamento.js';
let credJs = fs.readFileSync(credJsPath, 'utf8');

const oldResumoColabs = `function atualizarResumoColabs() {
    const list = document.getElementById('cred-colabs-list');
    if (!list) return;`;

const newResumoColabs = `function atualizarResumoColabs() {
    const list = document.getElementById('cred-colabs-list');
    if (!list) return;
    
    const limitNum = window._credLimites ? window._credLimites.colabs : 0;
    const maxText = limitNum > 0 ? limitNum : 'Todos';
    const count = credenciamentoState.selecionadosColabs.length;
    const span = document.getElementById('cred-limit-colabs-span');
    if (span) span.textContent = \`(\${count}/\${maxText})\`;`;

credJs = credJs.replace(oldResumoColabs, newResumoColabs);

const oldResumoVeic = `function atualizarResumoVeiculos() {
    const list = document.getElementById('cred-veiculos-list');
    if (!list) return;`;

const newResumoVeic = `function atualizarResumoVeiculos() {
    const list = document.getElementById('cred-veiculos-list');
    if (!list) return;
    
    const limitNum = window._credLimites ? window._credLimites.veics : 0;
    const maxText = limitNum > 0 ? limitNum : 'Todos';
    const count = credenciamentoState.selecionadosVeic.length;
    const span = document.getElementById('cred-limit-veics-span');
    if (span) span.textContent = \`(\${count}/\${maxText})\`;`;

credJs = credJs.replace(oldResumoVeic, newResumoVeic);

fs.writeFileSync(credJsPath, credJs, 'utf8');
console.log("Updated credenciamento.js with real-time UI counts.");