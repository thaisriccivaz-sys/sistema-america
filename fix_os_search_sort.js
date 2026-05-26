const fs = require('fs');

function fixFiles() {
    let count = 0;
    
    // 1. index.html
    let htmlPath = 'frontend/index.html';
    let html = fs.readFileSync(htmlPath, 'utf8');
    
    // Comercial table OS Header
    html = html.replace(
        `<th>OS</th>\n                                        <th style="cursor:pointer;" onclick="window.ordenarHistoricoComCred('cliente')">`,
        `<th style="cursor:pointer;" onclick="window.ordenarHistoricoComCred('os')">OS <i class="ph ph-arrows-down-up"></i></th>\n                                        <th style="cursor:pointer;" onclick="window.ordenarHistoricoComCred('cliente')">`
    );
    
    // Logistica table OS Header
    html = html.replace(
        `<th>OS</th>\n                                        <th style="cursor:pointer; white-space:nowrap;" onclick="window.ordenarHistoricoCred('cliente')"`,
        `<th style="cursor:pointer; white-space:nowrap;" onclick="window.ordenarHistoricoCred('os')" title="Ordenar OS">OS <i class="ph ph-arrows-down-up" style="color:#94a3b8; font-size:12px;"></i></th>\n                                        <th style="cursor:pointer; white-space:nowrap;" onclick="window.ordenarHistoricoCred('cliente')"`
    );
    
    // Search placeholders
    html = html.replace('placeholder="Buscar cliente ou e-mail..."', 'placeholder="Buscar OS, cliente ou e-mail..."');
    html = html.replace('placeholder="Buscar cliente, e-mail ou endereço..."', 'placeholder="Buscar OS, cliente, e-mail..."');
    
    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log("Fixed " + htmlPath);

    // Helper for sorting logic insertion
    const sortOsBlock = `} else if (coluna === 'os') {
        dados.sort((a, b) => {
            const osA = (a.os || '').toLowerCase();
            const osB = (b.os || '').toLowerCase();
            if (osA < osB) return window._historicoComCredSort.dir === 'asc' ? -1 : 1;
            if (osA > osB) return window._historicoComCredSort.dir === 'asc' ? 1 : -1;
            return 0;
        });
    `;
    const sortOsBlockCred = sortOsBlock.replace(/_historicoComCredSort/g, '_historicoCredSort');

    // 2. comercial_credenciamento.js
    let comJsPath = 'frontend/comercial_credenciamento.js';
    let comJs = fs.readFileSync(comJsPath, 'utf8');
    
    // Filter
    comJs = comJs.replace(
        "const texto = row.cells[0].textContent.toLowerCase()",
        "const texto = (row.cells[0].textContent + ' ' + row.cells[1].textContent).toLowerCase()"
    );
    
    // Sorting
    comJs = comJs.replace(
        "} else if (coluna === 'data') {",
        sortOsBlock + "} else if (coluna === 'data') {"
    );
    
    fs.writeFileSync(comJsPath, comJs, 'utf8');
    console.log("Fixed " + comJsPath);

    // 3. credenciamento.js
    let logJsPath = 'frontend/credenciamento.js';
    let logJs = fs.readFileSync(logJsPath, 'utf8');
    
    // Filter
    logJs = logJs.replace(
        "const texto = row.cells[0].textContent.toLowerCase()",
        "const texto = (row.cells[0].textContent + ' ' + row.cells[1].textContent).toLowerCase()"
    );
    
    // Sorting
    logJs = logJs.replace(
        "} else if (coluna === 'data') {",
        sortOsBlockCred + "} else if (coluna === 'data') {"
    );
    
    fs.writeFileSync(logJsPath, logJs, 'utf8');
    console.log("Fixed " + logJsPath);
}

fixFiles();