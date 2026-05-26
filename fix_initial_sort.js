const fs = require('fs');

function fixInitialSortDirection() {
    let comJsPath = 'frontend/comercial_credenciamento.js';
    let comJs = fs.readFileSync(comJsPath, 'utf8');
    comJs = comJs.replace(
        "window._historicoComCredSort = { col: 'data', dir: 'desc' };",
        "window._historicoComCredSort = { col: 'data', dir: 'asc' };"
    );
    fs.writeFileSync(comJsPath, comJs, 'utf8');
    console.log("Fixed " + comJsPath);

    let logJsPath = 'frontend/credenciamento.js';
    let logJs = fs.readFileSync(logJsPath, 'utf8');
    logJs = logJs.replace(
        "window._historicoCredSort = { col: 'data', dir: 'desc' };",
        "window._historicoCredSort = { col: 'data', dir: 'asc' };"
    );
    fs.writeFileSync(logJsPath, logJs, 'utf8');
    console.log("Fixed " + logJsPath);
}

fixInitialSortDirection();