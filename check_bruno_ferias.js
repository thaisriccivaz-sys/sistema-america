// Extrair texto do PDF ControlID usando strings legíveis
const fs = require('fs');
const buf = fs.readFileSync('C:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/Exemplos/relatorio_202676_1709.PDF');
const txt = buf.toString('latin1');

// Extrair strings legíveis (sequências de caracteres imprimíveis com 4+ chars)
const strings = [];
let cur = '';
for (let i = 0; i < txt.length; i++) {
    const c = txt.charCodeAt(i);
    if (c >= 32 && c <= 126) {
        cur += txt[i];
    } else {
        if (cur.length >= 4) strings.push(cur);
        cur = '';
    }
}
if (cur.length >= 4) strings.push(cur);

// Filtrar strings relevantes (férias, vacation, toolTip, justif, status)
const relevant = strings.filter(s => {
    const l = s.toLowerCase();
    return l.includes('rias') || l.includes('rias') || l.includes('vacat') 
        || l.includes('justif') || l.includes('tooltip')
        || l.includes('status') || l.includes('situac')
        || l.includes('15/06') || l.includes('16/06') || l.includes('17/06')
        || l.includes('Bruno') || l.includes('bruno');
});

console.log('=== Strings relevantes no PDF ===');
relevant.slice(0, 100).forEach(s => console.log(s));

// Também mostrar strings que têm F maiúsculo (pode ser Férias formatado)
console.log('\n=== Strings contendo F ===');
strings.filter(s => /F.r/.test(s) || /f.r/.test(s)).slice(0, 20).forEach(s => console.log(s));
