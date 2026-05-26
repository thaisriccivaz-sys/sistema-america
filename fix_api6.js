const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

const startIdx = code.indexOf('// Rota para a página de Entregas');
if (startIdx > -1) {
    const endOfRoute = code.indexOf('});', code.indexOf('res.json(rows);', startIdx)) + 3;
    const block = code.substring(startIdx, endOfRoute);
    
    // Remove block from current position
    code = code.replace(block, '');
    
    // Insert it right before verificarLicencasVencimentoCron
    const dest = 'function verificarLicencasVencimentoCron() {';
    code = code.replace(dest, block + '\n\n' + dest);
    fs.writeFileSync('backend/server.js', code);
    console.log('Fixed using substring');
}
