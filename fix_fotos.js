const fs = require('fs');
let code = fs.readFileSync('frontend/app.js', 'utf8');

const t1 = "`${API_URL.replace('/api', '')}/${c.foto_path}?t=${Date.now()}`";
const r1 = "(c.foto_path.startsWith('http') ? c.foto_path : `${API_URL.replace('/api', '')}/${c.foto_path}?t=${Date.now()}`)";
code = code.replace(t1, r1);

const t2 = "`${API_URL.replace('/api', '')}/${viewedColaborador.foto_path}?t=${Date.now()}`";
const r2 = "(viewedColaborador.foto_path.startsWith('http') ? viewedColaborador.foto_path : `${API_URL.replace('/api', '')}/${viewedColaborador.foto_path}?t=${Date.now()}`)";
code = code.replace(t2, r2);

const t3 = "`${API_URL.replace('/api', '')}/${updated.foto_path}?t=${Date.now()}`";
const r3 = "(updated.foto_path.startsWith('http') ? updated.foto_path : `${API_URL.replace('/api', '')}/${updated.foto_path}?t=${Date.now()}`)";
code = code.replace(t3, r3);

fs.writeFileSync('frontend/app.js', code, 'utf8');
console.log('App.js corrigido');
