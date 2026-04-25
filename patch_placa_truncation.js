const fs = require('fs');
const file = 'backend/server.js';
let content = fs.readFileSync(file, 'utf8');

const searchRegex = /if \(matPl\) placa = matPl\[1\]\.replace\(\/\[-\\s\]\/g, ''\)\.toUpperCase\(\);/g;
if (searchRegex.test(content)) {
    content = content.replace(searchRegex, `if (matPl) {
            placa = matPl[1].replace(/[-\\s]/g, '').toUpperCase();
            if (placa.length > 7) placa = placa.substring(0, 7); // Força 7 caracteres para remover lixo do pdf-parse
        }`);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Placa truncation patched!');
} else {
    console.log('Target string not found!');
}
