const fs = require('fs');
let html = fs.readFileSync('frontend/fechamento.js', 'utf8');

// Replace inpHora
const regexHora = /function inpHora\(idx, campo, val\) \{[\s\S]*?return `<input type="text" placeholder="00:00"[\s\S]*?\};?\n    \}/;

const novaHora = `function inpHora(idx, campo, val) {
        let v = val || '';
        if (v === '00:00' || v === '0:00' || v === '0') v = '';
        let blur = ' onblur="if(this.value === \\'00:00\\' || this.value === \\'0:00\\' || this.value === \\'0\\') this.value = \\'\\';"';
        return \`<input type="text" placeholder="" value="\${v}" style="width:55px;padding:.2rem;border:1px solid #e5e7eb;border-radius:.3rem;text-align:center;font-size:.8rem;" oninput="window._fechamento.atualizar(\${idx},'\${campo}',this.value)"\${blur}>\`;
    }`;

// Wait, the original inpHora was:
// function inpHora(idx, campo, val) {
//     return `<input type="text" placeholder="00:00" value="${val||''}" style="width:55px;padding:.2rem;border:1px solid #e5e7eb;border-radius:.3rem;text-align:center;font-size:.8rem;" oninput="window._fechamento.atualizar(${idx},'${campo}',this.value)">`;
// }

const regexHora2 = /function inpHora\(idx, campo, val\) \{\s*return `<input type="text" placeholder="00:00" value="\$\{val\|\|''\}" style="width:55px;padding:\.2rem;border:1px solid #e5e7eb;border-radius:\.3rem;text-align:center;font-size:\.8rem;" oninput="window\._fechamento\.atualizar\(\$\{idx\},'\$\{campo\}',this\.value\)">`;\s*\}/;

if (regexHora2.test(html)) {
    html = html.replace(regexHora2, novaHora);
} else {
    console.log('inpHora não encontrado via regexHora2');
}

// Replace inpNum
const regexNum = /function inpNum\(idx, campo, val, placeholder, step\) \{[\s\S]*?\}(?=\s*function inpDsr)/;

const novoNum = `function inpNum(idx, campo, val, placeholder, step) {
        let v = parseFloat(val);
        if (isNaN(v) || v === 0) v = '';
        let blur = '';
        if (step === '0.01') {
            if (v !== '') v = parseFloat(v).toFixed(2);
            blur = ' onblur="if(this.value && parseFloat(this.value) !== 0) this.value = parseFloat(this.value).toFixed(2); else this.value = \\'\\';"';
        } else {
            blur = ' onblur="if(this.value && parseFloat(this.value) === 0) this.value = \\'\\';"';
        }
        return \`<input type="number" step="\${step||1}" min="0" value="\${v}" placeholder="" style="width:68px;padding:.2rem;border:1px solid #e5e7eb;border-radius:.3rem;text-align:right;font-size:.8rem;" oninput="window._fechamento.atualizar(\${idx},'\${campo}',this.value)"\${blur}>\`;
    }`;

if (regexNum.test(html)) {
    html = html.replace(regexNum, novoNum);
} else {
    console.log('inpNum não encontrado via regexNum');
}

fs.writeFileSync('frontend/fechamento.js', html, 'utf8');
console.log('Sucesso!');
