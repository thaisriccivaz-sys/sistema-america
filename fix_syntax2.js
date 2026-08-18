const fs = require('fs');
let c = fs.readFileSync('frontend/testes_candidatos.js', 'utf8');
c = c.replace(/\\n\\n    const rotaHtml/g, '\n\n    const rotaHtml');
fs.writeFileSync('frontend/testes_candidatos.js', c, 'utf8');
