const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

const target = `const db = require('./database');`;

const replace = `const db = require('./database');

// Recarregar configurações do sistema (ex: certificado)
db.all("SELECT chave, valor FROM configuracoes_sistema", [], (err, rows) => {
    if (!err && rows) {
        rows.forEach(r => {
            if (r.chave === 'pfx_path') process.env.PFX_PATH = r.valor;
            if (r.chave === 'pfx_password_b64') process.env.PFX_PASSWORD = Buffer.from(r.valor, 'base64').toString('utf8');
        });
        console.log('[SISTEMA] Configurações de certificado carregadas com sucesso.');
    }
});`;

js = js.replace(target, replace);
fs.writeFileSync('backend/server.js', js, 'utf8');
