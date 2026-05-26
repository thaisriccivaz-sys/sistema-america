const fs = require('fs');

function fixFiles() {
    // 1. Fix index.html
    let htmlPath = 'frontend/index.html';
    let html = fs.readFileSync(htmlPath, 'utf8');
    
    // Comercial header
    html = html.replace('<th style="cursor:pointer;" onclick="window.ordenarHistoricoComCred(\'cliente\')">Cliente / Obra', '<th>OS</th>\n                                        <th style="cursor:pointer;" onclick="window.ordenarHistoricoComCred(\'cliente\')">Cliente / Obra');
    
    // Logistica header
    html = html.replace('<th style="cursor:pointer; white-space:nowrap;" onclick="window.ordenarHistoricoCred(\'cliente\')" title="Ordenar A-Z">Cliente / Obra', '<th>OS</th>\n                                        <th style="cursor:pointer; white-space:nowrap;" onclick="window.ordenarHistoricoCred(\'cliente\')" title="Ordenar A-Z">Cliente / Obra');
    
    // Colspans in index.html
    html = html.replace(/colspan="7"/g, 'colspan="8"');
    
    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log("Fixed " + htmlPath);

    // 2. Fix comercial_credenciamento.js
    let comJsPath = 'frontend/comercial_credenciamento.js';
    let comJs = fs.readFileSync(comJsPath, 'utf8');
    
    comJs = comJs.replace(/colspan="7"/g, 'colspan="8"');
    comJs = comJs.replace(/<td>\s*<b>\$\{cred\.os \? cred\.os \+ ' - ' : ''\}\$\{cred\.cliente_nome\}<\/b><br>/g, 
        '<td><b>${cred.os || \'-\'}</b></td>\n            <td>\n                <b>${cred.cliente_nome}</b><br>');
        
    fs.writeFileSync(comJsPath, comJs, 'utf8');
    console.log("Fixed " + comJsPath);

    // 3. Fix credenciamento.js
    let logJsPath = 'frontend/credenciamento.js';
    let logJs = fs.readFileSync(logJsPath, 'utf8');
    
    logJs = logJs.replace(/colspan="7"/g, 'colspan="8"');
    logJs = logJs.replace(/<td>\s*<b>\$\{cred\.os \? cred\.os \+ ' - ' : ''\}\$\{cred\.cliente_nome\}<\/b><br>/g, 
        '<td><b>${cred.os || \'-\'}</b></td>\n            <td>\n                <b>${cred.cliente_nome}</b><br>');
        
    fs.writeFileSync(logJsPath, logJs, 'utf8');
    console.log("Fixed " + logJsPath);
}

fixFiles();