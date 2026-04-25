const fs = require('fs');
let c = fs.readFileSync('frontend/app.js', 'utf8');

const s1 = `if (document.getElementById('colab-emergencia-telefone')) document.getElementById('colab-emergencia-telefone').value = c.contato_emergencia_telefone || '';`;
const rep1 = `${s1}\n        if (document.getElementById('colab-emergencia2-nome')) document.getElementById('colab-emergencia2-nome').value = c.contato_emergencia2_nome || '';\n        if (document.getElementById('colab-emergencia2-telefone')) document.getElementById('colab-emergencia2-telefone').value = c.contato_emergencia2_telefone || '';`;
c = c.replace(s1, rep1);

const s2 = `contato_emergencia_telefone: document.getElementById('colab-emergencia-telefone').value,`;
const rep2 = `${s2}\n            contato_emergencia2_nome: document.getElementById('colab-emergencia2-nome') ? document.getElementById('colab-emergencia2-nome').value : '',\n            contato_emergencia2_telefone: document.getElementById('colab-emergencia2-telefone') ? document.getElementById('colab-emergencia2-telefone').value : '',`;
c = c.replace(s2, rep2);

fs.writeFileSync('frontend/app.js', c);
console.log('Feito');
