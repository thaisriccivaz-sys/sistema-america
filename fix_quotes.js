const fs = require('fs');
const file = 'frontend/testes_candidatos.js';
let content = fs.readFileSync(file, 'utf8');

const startIdx = content.indexOf('function _renderDet(c) {');
if (startIdx !== -1) {
    let block = content.substring(startIdx);
    block = block.replace(/\\\\"/g, '\\"');
    content = content.substring(0, startIdx) + block;
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed syntax safely');
}
