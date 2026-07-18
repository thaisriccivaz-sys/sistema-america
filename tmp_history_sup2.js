const fs = require('fs');
let code = fs.readFileSync('frontend/recibos.js', 'utf8');

const regexStr = /if\s*\(isSupervisao\)\s*\{\s*s\.isAutoSupervisao\s*=\s*true;\s*\/\/\s*Garante a cor azul para supervisores\s*\}/;
        
const replacementStr = `if (isSupervisao) {
            s.isAutoSupervisao = true; // Garante a cor azul para supervisores
            s.faltas = 0;
            s.faltasVT = 0;
            s.faltasVR = 0;
        }`;

code = code.replace(regexStr, replacementStr);
fs.writeFileSync('frontend/recibos.js', code, 'utf8');
console.log('Fixed supervisor history load with regex.');
