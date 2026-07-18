const fs = require('fs');
let code = fs.readFileSync('frontend/recibos.js', 'utf8');

const regexStr = /case 'folgas':[\s\S]*?case 'faltas':[\s\S]*?break;/g;
        
const replacementStr = `case 'folgas':
            case 'folgasVT':
            case 'folgasVR':
                valA = selA[_recibosSortCol] || 0;
                valB = selB[_recibosSortCol] || 0;
                break;
            case 'faltas':
            case 'faltasVT':
            case 'faltasVR':
                valA = selA[_recibosSortCol] || 0;
                valB = selB[_recibosSortCol] || 0;
                break;`;

code = code.replace(regexStr, replacementStr);
fs.writeFileSync('frontend/recibos.js', code, 'utf8');
console.log('Fixed sorting logic.');
