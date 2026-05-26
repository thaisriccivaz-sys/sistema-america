const fs = require('fs');

// Patch index.html
let html = fs.readFileSync('frontend/index.html', 'utf8');
html = html.replace('id="filtro-mtr-destinador"', 'id="f_mtr_dst_x2" readonly onfocus="this.removeAttribute(\'readonly\');"');
html = html.replace('id="filtro-mtr-gerador"', 'id="f_mtr_ger_x1" readonly onfocus="this.removeAttribute(\'readonly\');"');
fs.writeFileSync('frontend/index.html', html);
console.log('REPLACED IN HTML');

// Patch mtr.js
let mtrJs = fs.readFileSync('frontend/mtr.js', 'utf8');
mtrJs = mtrJs.replace(/filtro-mtr-gerador/g, 'f_mtr_ger_x1');
mtrJs = mtrJs.replace(/filtro-mtr-destinador/g, 'f_mtr_dst_x2');
fs.writeFileSync('frontend/mtr.js', mtrJs);
console.log('REPLACED IN MTR JS');
