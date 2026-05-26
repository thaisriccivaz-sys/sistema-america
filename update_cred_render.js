const fs = require('fs');
const path = 'frontend/credenciamento.js';
let content = fs.readFileSync(path, 'utf8');

const regexEmpty = /if \(\!window\._historicoCredDados \|\| window\._historicoCredDados\.length === 0\) return;/g;
const replacementEmpty = `const tbody = document.getElementById('tbody-historico-cred');
    if (!tbody) return;

    if (!window._historicoCredDados || window._historicoCredDados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#94a3b8; padding:2rem;">Nenhum credenciamento gerado ainda.</td></tr>';
        return;
    }`;

content = content.replace(regexEmpty, replacementEmpty);

const regexCarregarRender = /if \(data\.length === 0\) \{[\s\S]*?tbody\.innerHTML = data\.map\(cred => \{[\s\S]*?\}\)\.join\(''\);/g;
const replacementCarregarRender = `window.ordenarHistoricoCred('data', 'desc');`;

content = content.replace(regexCarregarRender, replacementCarregarRender);

fs.writeFileSync(path, content, 'utf8');
console.log("Fixed rendering in credenciamento.js");