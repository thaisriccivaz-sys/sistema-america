const fs = require('fs');

// 1. Update frota.js — add _renderGestaoFrota and fix initFrotaVeiculos to render inside frota-conteudo
let fj = fs.readFileSync('frontend/frota.js', 'utf8');

// Add _renderGestaoFrota as alias right before initFrotaVeiculos
const insertBefore = 'window.initFrotaVeiculos = async function() {';
const alias = `// _renderGestaoFrota: renders fleet tab content into a given container
function _renderGestaoFrota(container) {
    // initFrotaVeiculos already renders into frota-conteudo, just call it
    window.initFrotaVeiculos();
}

`;
if (!fj.includes('_renderGestaoFrota(container)')) {
    fj = fj.replace(insertBefore, alias + insertBefore);
}
fs.writeFileSync('frontend/frota.js', fj);
console.log('[frota.js] _renderGestaoFrota added');

// 2. Update frota_manutencao.js — accept optional container param
let mj = fs.readFileSync('frontend/frota_manutencao.js', 'utf8');

// Replace the first line of initFrotaManutencoes to accept container
mj = mj.replace(
    `window.initFrotaManutencoes = async function() {
    const c = document.getElementById('frota-veiculos-container');
    if (!c) return;`,
    `window.initFrotaManutencoes = async function(containerEl) {
    const c = containerEl || document.getElementById('frota-conteudo') || document.getElementById('frota-veiculos-container');
    if (!c) return;`
);

fs.writeFileSync('frontend/frota_manutencao.js', mj);
console.log('[frota_manutencao.js] container param added');

// 3. Bump cache buster
let html = fs.readFileSync('frontend/index.html', 'utf8');
const ts = Date.now();
html = html.replace(/frota\.js\?v=\d+/g, `frota.js?v=${ts}`);
html = html.replace(/frota_manutencao\.js\?v=\d+/g, `frota_manutencao.js?v=${ts}`);
fs.writeFileSync('frontend/index.html', html);
console.log('[index.html] cache busted');
