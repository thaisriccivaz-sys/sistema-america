const fs = require('fs');
let code = fs.readFileSync('frontend/fechamento.js', 'utf8');

const start = code.indexOf('function inpHora(idx, campo, val)');
const end = code.indexOf('function inpNum(', start);

if (start < 0 || end < 0) {
    console.log('ERRO: não encontrou inpHora ou inpNum');
    process.exit(1);
}

// Reescrever inpHora usando concatenação de strings puras — sem template literal, sem aspas duplas dentro
const newFn = [
    'function inpHora(idx, campo, val) {',
    "    const v = (val && val !== '00:00' && val !== '0:00' && val !== '0') ? val : '';",
    "    const tag = [",
    "        '<input',",
    "        ' type=' + String.fromCharCode(34) + 'text' + String.fromCharCode(34),",
    "        ' placeholder=' + String.fromCharCode(34) + String.fromCharCode(34),",
    "        ' value=' + String.fromCharCode(34) + (v||'') + String.fromCharCode(34),",
    "        ' style=' + String.fromCharCode(34) + 'width:55px;padding:.2rem;border:1px solid #e5e7eb;border-radius:.3rem;text-align:center;font-size:.8rem;' + String.fromCharCode(34),",
    "        ' oninput=' + String.fromCharCode(34) + 'window._fechamento.atualizar(' + idx + ',' + String.fromCharCode(39) + campo + String.fromCharCode(39) + ',this.value)' + String.fromCharCode(34),",
    "        ' onblur=' + String.fromCharCode(34) + 'if(this.value===String.fromCharCode(48)+String.fromCharCode(48)+String.fromCharCode(58)+String.fromCharCode(48)+String.fromCharCode(48)||!this.value.trim())this.value=' + String.fromCharCode(34),",
    "        '>',",
    "    ].join('');",
    "    return tag;",
    '}',
].join('\n    ');

// Abordagem mais simples ainda: usar document.createElement no runtime em vez de HTML string
// Mas como precisamos retornar string HTML, vamos usar a abordagem de chr codes
// Na verdade, o problema mais simples é: substituir aspas duplas dentro do template por entidades ou usar aspas simples para os atributos HTML

const newFnSimple = `function inpHora(idx, campo, val) {
    const v = (val && val !== '00:00' && val !== '0:00' && val !== '0') ? val : '';
    const q = "'";
    return '<input type=' + q + 'text' + q +
        ' placeholder=' + q + q +
        ' value=' + q + (v || '') + q +
        ' style=' + q + 'width:55px;padding:.2rem;border:1px solid #e5e7eb;border-radius:.3rem;text-align:center;font-size:.8rem;' + q +
        ' oninput=' + q + 'window._fechamento.atualizar(' + idx + ',"' + campo + '",this.value)' + q +
        ' onblur=' + q + 'if(this.value==="00:00"||this.value==="0:00"||this.value==="0")this.value=""' + q + '>';
}
`;

code = code.substring(0, start) + newFnSimple + '\n    ' + code.substring(end);
fs.writeFileSync('frontend/fechamento.js', code, 'utf8');
console.log('✅ OK, tamanho:', code.length);
