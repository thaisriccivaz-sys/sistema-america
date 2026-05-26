const fs = require('fs');
const path = 'backend/server.js';
let content = fs.readFileSync(path, 'utf8');

const regexReenviar = /app\.post\('\/api\/credenciamentos\/:id\/reenviar', authenticateToken, \(req, res\) => \{\s*db\.get\('SELECT \* FROM credenciamentos WHERE id = \?', \[req\.params\.id\], \(err, cred\) => \{\s*if \(err \|\| !cred\) return res\.status\(500\)\.json\(\{ error: 'Credenciamento n\uFFFD?o encontrado' \}\);\s*if \(!cred\.token\) return res\.status\(400\)\.json\(\{ error: 'Este credenciamento ainda n\uFFFD?o possui um link gerado pela log\uFFFD?stica\.' \}\);\s*const baseUrl = process\.env\.PUBLIC_URL \|\| \`\$\{req\.protocol\}:\/\/\$\{req\.get\('host'\)\}\`;\s*const link = \`\$\{baseUrl\}\/credenciamento-publico\.html\?token=\$\{cred\.token\}\`;\s*const logoUrl = \`\$\{baseUrl\}\/assets\/logo-header\.png\`;\s*const validUntil = new Date\(cred\.valid_until\);\s*const mailOptions = \{\s*from: process\.env\.EMAIL_USER,\s*to: cred\.cliente_email,/g;

// To avoid encoding issues with regex, let's replace manually by splitting
let targetPattern = `app.post('/api/credenciamentos/:id/reenviar', authenticateToken, (req, res) => {
    db.get('SELECT * FROM credenciamentos WHERE id = ?', [req.params.id], (err, cred) => {`;

const startIdx = content.indexOf(targetPattern);
if (startIdx !== -1) {
    const endIdx = content.indexOf(`to: cred.cliente_email,`, startIdx);
    if (endIdx !== -1) {
        const replacement = `app.post('/api/credenciamentos/:id/reenviar', authenticateToken, (req, res) => {
    db.get('SELECT * FROM credenciamentos WHERE id = ?', [req.params.id], (err, cred) => {
        if (err || !cred) return res.status(500).json({ error: 'Credenciamento não encontrado' });
        if (!cred.token) return res.status(400).json({ error: 'Este credenciamento ainda não possui um link gerado pela logística.' });
        
        const { novoEmail } = req.body || {};
        const emailToUse = novoEmail ? novoEmail.trim() : cred.cliente_email;

        if (novoEmail && novoEmail.trim() !== cred.cliente_email) {
            db.run('UPDATE credenciamentos SET cliente_email = ? WHERE id = ?', [emailToUse, cred.id], () => {});
            cred.cliente_email = emailToUse;
        }

        const baseUrl = process.env.PUBLIC_URL || \`\${req.protocol}://\${req.get('host')}\`;
        const link = \`\${baseUrl}/credenciamento-publico.html?token=\${cred.token}\`;
        const logoUrl = \`\${baseUrl}/assets/logo-header.png\`;
        
        const validUntil = new Date(cred.valid_until);
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: emailToUse,`;
            
        content = content.substring(0, startIdx) + replacement + content.substring(endIdx + `to: cred.cliente_email,`.length);
        fs.writeFileSync(path, content, 'utf8');
        console.log("Updated reenviar endpoint in server.js");
    }
}