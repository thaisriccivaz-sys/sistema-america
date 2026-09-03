const fs = require('fs');
let code = fs.readFileSync('frontend/app.js', 'utf8');

const toggleTarget = 'window.toggleBrigadistaFields = function (val) {';
const toggleFolhaFn = `window.toggleFolhaField = function(campo, valor) {
    const mapa = { insalubridade: 'section-folha-insalubridade', periculosidade: 'section-folha-periculosidade', sindical: 'section-folha-sindical', pensao: 'section-folha-pensao', plr: 'section-folha-plr' };
    const el = document.getElementById(mapa[campo]);
    if (!el) return;
    el.style.display = (valor === '1' || valor === 'Sim') ? '' : 'none';
};

window.toggleBrigadistaFields = function (val) {`;

if (!code.includes(toggleTarget)) { console.error('ERRO: toggleTarget não encontrado!'); process.exit(1); }
code = code.replace(toggleTarget, toggleFolhaFn);
console.log('✓ toggleFolhaField added');

fs.writeFileSync('frontend/app.js', code, 'utf8');
console.log('✓ app.js saved! Size:', code.length);
