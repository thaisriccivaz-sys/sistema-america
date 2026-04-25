const fs = require('fs');
const oldJs = fs.readFileSync('backend/server_old.js', 'utf8');
const curJs = fs.readFileSync('backend/server.js', 'utf8');

const startIndex = oldJs.indexOf('// Rota para obter INFO de um documento (sem arquivo)');
const endIndex = oldJs.indexOf('// ============================================\n// ROTAS DE APOIO');
let endIndexAlt = oldJs.indexOf('// ============================================\r\n// ROTAS DE APOIO');

if (startIndex > -1) {
    let end = endIndex > -1 ? endIndex : endIndexAlt;
    const toInsert = oldJs.substring(startIndex, end) + "\n\n";
    let curIdx = curJs.indexOf('// ============================================');
    if (curIdx > -1) {
        const finalJs = curJs.substring(0, curIdx) + toInsert + curJs.substring(curIdx);
        fs.writeFileSync('backend/server.js', finalJs, 'utf8');
        console.log("SUCCESS!");
    } else { console.log('curIdx null'); }
} else { console.log('startIdx null'); }
