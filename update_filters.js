const fs = require('fs');

// --- Comercial JS ---
let pathCom = 'frontend/comercial_credenciamento.js';
let contentCom = fs.readFileSync(pathCom, 'utf8');

const oldFilterCom = `window.filtrarHistoricoComCred = function() {
    const termo = (document.getElementById('filtro-pesquisa-com-cred').value || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
    const rows = document.querySelectorAll('#tbody-comercial-cred tr');
    rows.forEach(row => {
        if (row.cells.length === 1) return;
        const texto = (row.cells[0].textContent + ' ' + row.cells[1].textContent).toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
        row.style.display = texto.includes(termo) ? '' : 'none';
    });
}`;

const newFilterCom = `window.filtrarHistoricoComCred = function() {
    const termoGlobal = (document.getElementById('filtro-pesquisa-com-cred').value || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
    const termoOs = (document.getElementById('filtro-pesquisa-os-com-cred').value || '').toLowerCase().trim();
    const rows = document.querySelectorAll('#tbody-comercial-cred tr');
    
    let lastRowMatch = true;
    rows.forEach(row => {
        if (row.cells.length === 1) {
            if (!lastRowMatch) row.style.display = 'none';
            return;
        }
        
        const osText = row.cells[0].textContent.toLowerCase().trim();
        const textoGlobal = (row.cells[1].textContent).toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
        
        let match = true;
        if (termoGlobal && !textoGlobal.includes(termoGlobal)) match = false;
        if (termoOs && !osText.includes(termoOs)) match = false;
        
        row.style.display = match ? '' : 'none';
        lastRowMatch = match;
    });
}`;

contentCom = contentCom.replace(oldFilterCom, newFilterCom);
fs.writeFileSync(pathCom, contentCom, 'utf8');


// --- Logistica JS ---
let pathLog = 'frontend/credenciamento.js';
let contentLog = fs.readFileSync(pathLog, 'utf8');

const regexFilterLog = /window\.filtrarHistoricoCred\s*=\s*function\(\)\s*\{[\s\S]*?rows\.forEach\(row\s*=>\s*\{[\s\S]*?\}\);\s*\}/;

const newFilterLog = `window.filtrarHistoricoCred = function() {
    const elGlobal = document.getElementById('filtro-pesquisa-cred');
    const elOs = document.getElementById('filtro-pesquisa-os-cred');
    const termoGlobal = elGlobal ? (elGlobal.value || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '') : '';
    const termoOs = elOs ? (elOs.value || '').toLowerCase().trim() : '';
    
    const rows = document.querySelectorAll('#tbody-credenciamentos tr');
    let lastRowMatch = true;
    
    rows.forEach(row => {
        if (row.cells.length === 1) {
            if (!lastRowMatch) row.style.display = 'none';
            return;
        }
        
        const osText = row.cells[0].textContent.toLowerCase().trim();
        const textoGlobal = (row.cells[1].textContent).toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
        
        let match = true;
        if (termoGlobal && !textoGlobal.includes(termoGlobal)) match = false;
        if (termoOs && !osText.includes(termoOs)) match = false;
        
        row.style.display = match ? '' : 'none';
        lastRowMatch = match;
    });
}`;

contentLog = contentLog.replace(regexFilterLog, newFilterLog);
fs.writeFileSync(pathLog, contentLog, 'utf8');

console.log("Updated filters in JS files");