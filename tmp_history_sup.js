const fs = require('fs');
let code = fs.readFileSync('frontend/recibos.js', 'utf8');

const targetStr = `        if (isSupervisao) {
            s.isAutoSupervisao = true; // Garante a cor azul para supervisores
        }`;
        
const replacementStr = `        if (isSupervisao) {
            s.isAutoSupervisao = true; // Garante a cor azul para supervisores
            s.faltas = 0;
            s.faltasVT = 0;
            s.faltasVR = 0;
        }`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('frontend/recibos.js', code, 'utf8');
console.log('Fixed supervisor history load.');
