const fs = require('fs');
let code = fs.readFileSync('frontend/fechamento.js', 'utf8');

const start = code.indexOf('function inpNum(idx, campo, val, placeholder, step)');
const end = code.indexOf('function inpDsr(', start);

if (start < 0 || end < 0) {
    console.log('ERRO: não encontrou inpNum ou inpDsr');
    process.exit(1);
}

// Reescrever completamente sem template literals problemáticos
const newInpNum = `function inpNum(idx, campo, val, placeholder, step) {
    var v = parseFloat(val);
    if (isNaN(v) || v === 0) v = '';
    var displayVal = '';
    var isMoney = step === '0.01';
    if (v !== '') {
        displayVal = isMoney ? parseFloat(v).toFixed(2) : String(v);
    }
    var styleComum = 'padding:.2rem;border:1px solid #e5e7eb;border-radius:.3rem;text-align:right;font-size:.8rem;';
    var inputW = isMoney ? '58px' : '68px';
    var blurFn = isMoney
        ? 'if(this.value && parseFloat(this.value)!==0){this.value=parseFloat(this.value).toFixed(2);}else{this.value="";}'
        : 'if(this.value && parseFloat(this.value)===0){this.value="";}';
    var oninputFn = 'window._fechamento.atualizar(' + idx + ',"' + campo + '",parseFloat(this.value)||0)';
    var inputHtml = '<input type="text" inputmode="decimal"' +
        ' value="' + displayVal + '"' +
        ' placeholder=""' +
        ' style="width:' + inputW + ';' + styleComum + '"' +
        ' oninput="' + oninputFn + '"' +
        ' onblur="' + blurFn + '">';
    if (isMoney) {
        return '<div style="display:flex;align-items:center;gap:1px;">' +
            '<span style="color:#6b7280;font-size:.75rem;margin-right:1px;">R$</span>' +
            inputHtml + '</div>';
    }
    return inputHtml;
}
`;

code = code.substring(0, start) + newInpNum + '\n    ' + code.substring(end);
fs.writeFileSync('frontend/fechamento.js', code, 'utf8');
console.log('✅ inpNum reescrito, tamanho:', code.length);
