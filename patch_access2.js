const fs = require('fs');
let server = fs.readFileSync('backend/server.js', 'utf8');

const expiredCheck = `if (new Date() > validUntil) {
            return res.status(403).json({ error: 'Este link de credenciamento já expirou (validade de 7 dias).' });`;

const idx = server.indexOf('if (new Date() > validUntil) {');
if (idx !== -1) {
    const endIdx = server.indexOf('}', idx + 100); // look for the closing brace after the return and access logic
    const textInsideIf = server.substring(idx, endIdx + 1);
    
    if (textInsideIf.includes('acessado_em')) {
        console.log('Fixing block...');
        const accessLogic = `
        // Registrar primeiro acesso do cliente
        if (!cred.acessado_em) {
            db.run('UPDATE credenciamentos SET acessado_em = ? WHERE id = ?', [new Date().toISOString(), cred.id], () => {});
        }`;
        
        let newServer = server.replace(textInsideIf, expiredCheck + '\n        }\n' + accessLogic);
        
        fs.writeFileSync('backend/server.js', newServer, 'utf8');
        console.log('Fixed.');
    } else {
        console.log('Access logic is not inside the if block.');
    }
}
