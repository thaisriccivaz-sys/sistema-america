const fs = require('fs');
const path = 'frontend/credenciamento.js';
let content = fs.readFileSync(path, 'utf8');

const regexOrder = /window\.ordenarHistoricoCred = function\(coluna\) \{\s*\/\/ Alterna direção\s*if \(window\._historicoCredSort\.col === coluna\) \{/g;
const replacementOrder = `window.ordenarHistoricoCred = function(coluna, forceDir = null) {
    if (forceDir) {
        window._historicoCredSort.col = coluna;
        window._historicoCredSort.dir = forceDir;
    } else if (window._historicoCredSort.col === coluna) {`;

content = content.replace(regexOrder, replacementOrder);
fs.writeFileSync(path, content, 'utf8');
console.log("Fixed sort logic signature in credenciamento.js");