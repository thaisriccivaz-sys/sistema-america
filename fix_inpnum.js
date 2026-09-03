const fs = require('fs');
let html = fs.readFileSync('frontend/fechamento.js', 'utf8');

const regex = /function inpNum\(idx, campo, val, placeholder, step\) \{[\s\S]*?\}/;

const substituto = `function inpNum(idx, campo, val, placeholder, step) {
        let v = (val || val === 0) ? val : '';
        let blur = '';
        if (step === '0.01') {
            if (v !== '') v = parseFloat(v).toFixed(2);
            blur = ' onblur="if(this.value) this.value = parseFloat(this.value).toFixed(2);"';
        }
        return \`<input type="number" step="\${step||1}" min="0" value="\${v}" placeholder="\${placeholder||'0'}" style="width:68px;padding:.2rem;border:1px solid #e5e7eb;border-radius:.3rem;text-align:right;font-size:.8rem;" oninput="window._fechamento.atualizar(\${idx},'\${campo}',this.value)"\${blur}>\`;
    }`;

if (regex.test(html)) {
    html = html.replace(regex, substituto);
    fs.writeFileSync('frontend/fechamento.js', html, 'utf8');
    console.log('Sucesso!');
} else {
    console.log('Não encontrou inpNum');
}
