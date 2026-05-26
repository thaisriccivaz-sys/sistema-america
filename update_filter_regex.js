const fs = require('fs');

let pathCom = 'frontend/comercial_credenciamento.js';
let contentCom = fs.readFileSync(pathCom, 'utf8');

const regexFilterCom = /window\.filtrarHistoricoComCred\s*=\s*function\(\)\s*\{[\s\S]*?rows\.forEach\(row\s*=>\s*\{[\s\S]*?\}\);\s*\}/;

const newFilterCom = `window.filtrarHistoricoComCred = function() {
    const elGlobal = document.getElementById('filtro-pesquisa-com-cred');
    const elOs = document.getElementById('filtro-pesquisa-os-com-cred');
    const termoGlobal = elGlobal ? (elGlobal.value || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '') : '';
    const termoOs = elOs ? (elOs.value || '').toLowerCase().trim() : '';
    
    const rows = document.querySelectorAll('#tbody-comercial-cred tr');
    let lastRowMatch = true;
    
    rows.forEach(row => {
        if (row.cells.length === 1) {
            if (!lastRowMatch) row.style.display = 'none';
            return;
        }
        
        const osText = row.cells[0].textContent.toLowerCase().trim();
        const textoGlobal = (row.textContent).toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
        
        let match = true;
        if (termoGlobal && !textoGlobal.includes(termoGlobal)) match = false;
        if (termoOs && !osText.includes(termoOs)) match = false;
        
        row.style.display = match ? '' : 'none';
        lastRowMatch = match;
    });
}`;

contentCom = contentCom.replace(regexFilterCom, newFilterCom);
fs.writeFileSync(pathCom, contentCom, 'utf8');

let pathLog = 'frontend/credenciamento.js';
let contentLog = fs.readFileSync(pathLog, 'utf8');

// Do the same fix for logistica (search the whole row instead of just cells[1])
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
        const textoGlobal = (row.textContent).toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
        
        let match = true;
        if (termoGlobal && !textoGlobal.includes(termoGlobal)) match = false;
        if (termoOs && !osText.includes(termoOs)) match = false;
        
        row.style.display = match ? '' : 'none';
        lastRowMatch = match;
    });
}`;

contentLog = contentLog.replace(regexFilterLog, newFilterLog);
fs.writeFileSync(pathLog, contentLog, 'utf8');

console.log("Updated both JS files to use the correct entire-row search and correctly apply OS filters");