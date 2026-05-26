const fs = require('fs');

let pathCom = 'frontend/comercial_credenciamento.js';
let contentCom = fs.readFileSync(pathCom, 'utf8');

const regexFilterCom = /window\.filtrarHistoricoComCred\s*=\s*function\(\)\s*\{[\s\S]*?rows\.forEach\(row\s*=>\s*\{[\s\S]*?\}\);\s*\}/;

const newFilterCom = `window.filtrarHistoricoComCred = function() {
    const elOs = document.getElementById('filtro-pesquisa-os-com-cred');
    const elCliente = document.getElementById('filtro-pesquisa-cliente-com-cred');
    const elEndereco = document.getElementById('filtro-pesquisa-endereco-com-cred');
    const elEmail = document.getElementById('filtro-pesquisa-email-com-cred');
    
    const termoOs = elOs ? (elOs.value || '').toLowerCase().trim() : '';
    const termoCliente = elCliente ? (elCliente.value || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '') : '';
    const termoEndereco = elEndereco ? (elEndereco.value || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '') : '';
    const termoEmail = elEmail ? (elEmail.value || '').toLowerCase().trim() : '';
    
    const rows = document.querySelectorAll('#tbody-comercial-cred tr');
    let lastRowMatch = true;
    
    rows.forEach(row => {
        if (row.cells.length === 1) {
            if (!lastRowMatch) row.style.display = 'none';
            return;
        }
        
        const osText = row.cells[0].textContent.toLowerCase().trim();
        let cName = '', cEmail = '', cEnd = '';
        
        if (row.cells[1] && row.cells[1].children.length >= 3) {
            cName = row.cells[1].children[0].textContent.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
            cEmail = row.cells[1].children[1].textContent.toLowerCase().trim();
            cEnd = row.cells[1].children[2].textContent.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
        } else {
            // Fallback se n\u00e3o tiver a estrutura exata de divs
            cName = row.cells[1].textContent.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
            cEmail = cName;
            cEnd = cName;
        }
        
        let match = true;
        if (termoOs && !osText.includes(termoOs)) match = false;
        if (termoCliente && !cName.includes(termoCliente)) match = false;
        if (termoEmail && !cEmail.includes(termoEmail)) match = false;
        if (termoEndereco && !cEnd.includes(termoEndereco)) match = false;
        
        row.style.display = match ? '' : 'none';
        lastRowMatch = match;
    });
}`;

contentCom = contentCom.replace(regexFilterCom, newFilterCom);
fs.writeFileSync(pathCom, contentCom, 'utf8');

// Do the same for Logistica
let pathLog = 'frontend/credenciamento.js';
let contentLog = fs.readFileSync(pathLog, 'utf8');

const regexFilterLog = /window\.filtrarHistoricoCred\s*=\s*function\(\)\s*\{[\s\S]*?rows\.forEach\(row\s*=>\s*\{[\s\S]*?\}\);\s*\}/;

const newFilterLog = `window.filtrarHistoricoCred = function() {
    const elOs = document.getElementById('filtro-pesquisa-os-cred');
    const elCliente = document.getElementById('filtro-pesquisa-cliente-cred');
    const elEndereco = document.getElementById('filtro-pesquisa-endereco-cred');
    const elEmail = document.getElementById('filtro-pesquisa-email-cred');
    
    const termoOs = elOs ? (elOs.value || '').toLowerCase().trim() : '';
    const termoCliente = elCliente ? (elCliente.value || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '') : '';
    const termoEndereco = elEndereco ? (elEndereco.value || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '') : '';
    const termoEmail = elEmail ? (elEmail.value || '').toLowerCase().trim() : '';
    
    const rows = document.querySelectorAll('#tbody-credenciamentos tr');
    let lastRowMatch = true;
    
    rows.forEach(row => {
        if (row.cells.length === 1) {
            if (!lastRowMatch) row.style.display = 'none';
            return;
        }
        
        const osText = row.cells[0].textContent.toLowerCase().trim();
        let cName = '', cEmail = '', cEnd = '';
        
        if (row.cells[1] && row.cells[1].children.length >= 3) {
            cName = row.cells[1].children[0].textContent.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
            cEmail = row.cells[1].children[1].textContent.toLowerCase().trim();
            cEnd = row.cells[1].children[2].textContent.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
        } else {
            cName = row.cells[1].textContent.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
            cEmail = cName;
            cEnd = cName;
        }
        
        let match = true;
        if (termoOs && !osText.includes(termoOs)) match = false;
        if (termoCliente && !cName.includes(termoCliente)) match = false;
        if (termoEmail && !cEmail.includes(termoEmail)) match = false;
        if (termoEndereco && !cEnd.includes(termoEndereco)) match = false;
        
        row.style.display = match ? '' : 'none';
        lastRowMatch = match;
    });
}`;

contentLog = contentLog.replace(regexFilterLog, newFilterLog);
fs.writeFileSync(pathLog, contentLog, 'utf8');

console.log("Updated both files to use 4-field logic");