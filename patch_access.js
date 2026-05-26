const fs = require('fs');
let server = fs.readFileSync('backend/server.js', 'utf8');

const targetStr = `        const validUntil = new Date(cred.valid_until);
        if (new Date() > validUntil) {
            return res.status(403).json({ error: 'Este link de credenciamento já expirou (validade de 7 dias).' });


        // Registrar primeiro acesso do cliente
        if (!cred.acessado_em) {
            db.run('UPDATE credenciamentos SET acessado_em = ? WHERE id = ?', [new Date().toISOString(), cred.id], () => {});
        }
        }`;

const replacementStr = `        const validUntil = new Date(cred.valid_until);
        if (new Date() > validUntil) {
            return res.status(403).json({ error: 'Este link de credenciamento já expirou (validade de 7 dias).' });
        }

        // Registrar primeiro acesso do cliente
        if (!cred.acessado_em) {
            db.run('UPDATE credenciamentos SET acessado_em = ? WHERE id = ?', [new Date().toISOString(), cred.id], () => {});
        }`;

if (server.includes(targetStr)) {
    server = server.replace(targetStr, replacementStr);
    fs.writeFileSync('backend/server.js', server, 'utf8');
    console.log('Fixed unreachable access tracking code.');
} else {
    console.log('Target string not found, it might already be fixed.');
}
