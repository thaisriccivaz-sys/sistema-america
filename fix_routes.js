const fs = require('fs');
const oldJs = fs.readFileSync('backend/server_old.js', 'utf8');
const curJs = fs.readFileSync('backend/server.js', 'utf8');

const regex = /\/\/ Rota para obter INFO de um documento(.*?)\/\/ ============================================/s;
const match = oldJs.match(regex);
if (match) {
    const toInsert = "// Rota para obter INFO de um documento" + match[1] + "\n\n";
    // Now insert this right before "// ============================================\n// ROTAS DE APOIO"
    const finalJs = curJs.replace('// ============================================\r\n// ROTAS DE APOIO', toInsert + '// ============================================\r\n// ROTAS DE APOIO');
    fs.writeFileSync('backend/server.js', finalJs, 'utf8');
    console.log("Inserted missing routes successfully.");
} else {
    console.log("Could not find routes in old js.");
}
