const fs = require('fs');
let c = fs.readFileSync('frontend/testes_candidatos.js', 'utf8');

const targetStr = '<span style="line-height:1.4;">\ <span style="color:#94a3b8;">- \</span></span>';
const newStr = '<span style="line-height:1.4;">\ <span style="color:#94a3b8;">- \</span></span>';

c = c.replace(targetStr, newStr);
fs.writeFileSync('frontend/testes_candidatos.js', c, 'utf8');
console.log('Fixed frontend log rendering');
