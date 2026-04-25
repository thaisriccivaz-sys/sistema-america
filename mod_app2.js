const fs = require('fs');
let c = fs.readFileSync('frontend/app.js', 'utf8');

const s3 = `{ key: 'contato_emergencia_telefone', label: 'Emg. Tel.' },`;
const rep3 = `{ key: 'contato_emergencia_telefone', label: 'Emg. Tel.' },\n        { key: 'contato_emergencia2_nome', label: 'Emg. Nome 2' },\n        { key: 'contato_emergencia2_telefone', label: 'Emg. Tel. 2' },`;
c = c.replace(s3, rep3);

fs.writeFileSync('frontend/app.js', c);
console.log('Feito visualizacao');
