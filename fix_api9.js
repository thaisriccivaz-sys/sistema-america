const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

const startStr = '// Rota para a página de Entregas';
const startIdx = code.indexOf(startStr);
if (startIdx > -1) {
    const searchEnd = code.indexOf('res.json(rows);', startIdx);
    const endIdx = code.indexOf('});', searchEnd);
    const finalEndIdx = code.indexOf('});', endIdx + 3) + 3; // The outer });
    
    const block = code.substring(startIdx, finalEndIdx);
    
    code = code.replace(block, '');
    
    const cronFunc = 'function verificarLicencasVencimentoCron() {';
    if (code.includes(cronFunc)) {
        code = code.replace(cronFunc, block + '\n\n' + cronFunc);
        fs.writeFileSync('backend/server.js', code);
        console.log('Fixed using robust substring');
    }
} else {
    console.log('start string not found');
}
