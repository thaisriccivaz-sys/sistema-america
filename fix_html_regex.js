const fs = require('fs');

let htmlCode = fs.readFileSync('frontend/index.html', 'utf8');

const regexDeprt = /<th onclick="window\.sortTable\(this\)" style="cursor:pointer;white-space:nowrap;" title="Ordenar">Deprt\. <i class="ph ph-arrows-down-up" style="font-size:0\.8em;color:#94a3b8;margin-left:2px;"><\/i><\/th>/;
const regexMotivo = /<th onclick="window\.sortTable\(this\)" style="cursor:pointer;" title="Ordenar">Motivo <i class="ph ph-arrows-down-up" style="font-size:0\.85em; color:#94a3b8; margin-left:4px;"><\/i><\/th>/;

if (regexDeprt.test(htmlCode)) {
    htmlCode = htmlCode.replace(regexDeprt, '');
    console.log("Removed Deprt header");
} else {
    console.log("Deprt header not found");
}

if (regexMotivo.test(htmlCode)) {
    htmlCode = htmlCode.replace(regexMotivo, '');
    console.log("Removed Motivo header");
} else {
    console.log("Motivo header not found");
}

// Colspan fix
htmlCode = htmlCode.replace('<tr><td colspan="7" style="text-align:center;color:#64748b;">Carregando...</td></tr>', '<tr><td colspan="6" style="text-align:center;color:#64748b;">Carregando...</td></tr>');
htmlCode = htmlCode.replace('<tr><td colspan="7" style="text-align:center;color:#64748b;">Selecione um item</td></tr>', '<tr><td colspan="6" style="text-align:center;color:#64748b;">Selecione um item</td></tr>');

fs.writeFileSync('frontend/index.html', htmlCode, 'utf8');
