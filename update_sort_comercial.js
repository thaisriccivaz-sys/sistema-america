const fs = require('fs');
const path = 'frontend/comercial_credenciamento.js';
let content = fs.readFileSync(path, 'utf8');

const regexOrder = /window\.ordenarHistoricoComCred = function\(coluna\) \{\s*if \(window\._historicoComCredSort\.col === coluna\) \{/g;
const replacementOrder = `window.ordenarHistoricoComCred = function(coluna, forceDir = null) {
    if (forceDir) {
        window._historicoComCredSort.col = coluna;
        window._historicoComCredSort.dir = forceDir;
    } else if (window._historicoComCredSort.col === coluna) {`;

content = content.replace(regexOrder, replacementOrder);

const regexLoad = /window\.ordenarHistoricoComCred\(window\._historicoComCredSort\.col\);/g;
const replacementLoad = `window.ordenarHistoricoComCred('data', 'desc');`;

content = content.replace(regexLoad, replacementLoad);

fs.writeFileSync(path, content, 'utf8');
console.log("Fixed sorting direction in comercial_credenciamento.js");