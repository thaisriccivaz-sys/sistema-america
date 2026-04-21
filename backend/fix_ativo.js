const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

js = js.replace(/if \(effectiveStatus === 'Ativo'\) stats\.ativos \+= 1;/g, "if (effectiveStatus === 'Ativo' || effectiveStatus === 'Em Integração') stats.ativos += 1;");

fs.writeFileSync('backend/server.js', js, 'utf8');
