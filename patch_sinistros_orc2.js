const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'sinistros.js');
let c = fs.readFileSync(filePath, 'utf8');

const oldColeta =
    "            const fileInputs = document.querySelectorAll('input[name=\"sin_orc_file\"]');\r\n" +
    "            const filesOrc = [];\r\n" +
    "            fileInputs.forEach(i => { if(i.files && i.files.length > 0) for(let f of i.files) filesOrc.push(f); });";

const newColeta = "            const filesOrc = window._sinOrcFiles || [];";

if (c.includes(oldColeta)) {
    c = c.replace(oldColeta, newColeta);
    console.log('OK - coleta orcamentos substituida');
} else {
    // tentar sem \r
    const oldColeta2 =
        "            const fileInputs = document.querySelectorAll('input[name=\"sin_orc_file\"]');\n" +
        "            const filesOrc = [];\n" +
        "            fileInputs.forEach(i => { if(i.files && i.files.length > 0) for(let f of i.files) filesOrc.push(f); });";
    if (c.includes(oldColeta2)) {
        c = c.replace(oldColeta2, newColeta);
        console.log('OK - coleta orcamentos substituida (LF)');
    } else {
        console.error('NAO ENCONTRADO - dump:');
        const idx = c.indexOf('sin_orc_file');
        console.log(JSON.stringify(c.substring(idx - 20, idx + 200)));
    }
}

fs.writeFileSync(filePath, c, 'utf8');
console.log('DONE');
