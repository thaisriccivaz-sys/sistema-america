const fs = require('fs');
let code = fs.readFileSync('frontend/fechamento.js', 'utf8');

// Corrigir a função inpHora — reescrever com string concatenation para evitar
// qualquer problema de escaping dentro de template literal
const oldInpHora = /function inpHora\(idx, campo, val\) \{\s*let v = val \|\| '';\s*if \(v === '00:00'.*\) v = '';\s*return `<input[^`]*>`;\s*\}/s;

const newInpHora = `function inpHora(idx, campo, val) {
        let v = val || '';
        if (v === '00:00' || v === '0:00' || v === '0') v = '';
        return '<input type="text" placeholder="" value="' + v + '" style="width:55px;padding:.2rem;border:1px solid #e5e7eb;border-radius:.3rem;text-align:center;font-size:.8rem;" ' +
            'oninput="window._fechamento.atualizar(' + idx + ',\\'' + campo + '\\',this.value)" ' +
            'onblur="if([\\'00:00\\',\\'0:00\\',\\'0\\'].includes(this.value))this.value=\\'\\';"></input>';
    }`;

// Usar abordagem mais simples — template literal com concatenação
const newInpHoraSimple = `function inpHora(idx, campo, val) {
        const v = (val && val !== '00:00' && val !== '0:00' && val !== '0') ? val : '';
        return \`<input type="text" placeholder="" value="\${v}" style="width:55px;padding:.2rem;border:1px solid #e5e7eb;border-radius:.3rem;text-align:center;font-size:.8rem;" oninput="window._fechamento.atualizar(\${idx},'\${campo}',this.value)" onblur="var z=['00:00','0:00','0'];if(z.indexOf(this.value)>=0)this.value='';">\`;
    }`;

if (oldInpHora.test(code)) {
    code = code.replace(oldInpHora, newInpHoraSimple);
    console.log('✅ inpHora corrigido');
} else {
    console.log('❌ regex não encontrou inpHora');
    // Fallback: localizar e substituir manualmente
    const start = code.indexOf('function inpHora(idx, campo, val)');
    const end = code.indexOf('function inpNum(', start);
    if (start > 0 && end > 0) {
        code = code.substring(0, start) + newInpHoraSimple + '\n    ' + code.substring(end);
        console.log('✅ inpHora corrigido via fallback');
    }
}

fs.writeFileSync('frontend/fechamento.js', code, 'utf8');
console.log('Tamanho:', code.length);
