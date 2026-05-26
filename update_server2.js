const fs = require('fs');

let serverPath = 'backend/server.js';
let serverJs = fs.readFileSync(serverPath, 'utf8');

// 1. Create table
if (!serverJs.includes('CREATE TABLE IF NOT EXISTS comercial_notificacoes')) {
    serverJs = serverJs.replace("CREATE TABLE IF NOT EXISTS logistica_notificacoes_pendentes",
        `CREATE TABLE IF NOT EXISTS comercial_notificacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER,
            mensagem TEXT,
            tipo TEXT,
            lida INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );\n    CREATE TABLE IF NOT EXISTS logistica_notificacoes_pendentes`);
}

// 2. Add endpoints for comercial_notificacoes
if (!serverJs.includes('/api/comercial/notificacoes/pendentes')) {
    const endpoints = `
// --- NOTIFICACOES COMERCIAL ---
app.get('/api/comercial/notificacoes/pendentes', authenticateToken, (req, res) => {
    db.all('SELECT * FROM comercial_notificacoes WHERE lida = 0 AND usuario_id = ? ORDER BY created_at ASC', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});
app.put('/api/comercial/notificacoes/:id/lida', authenticateToken, (req, res) => {
    db.run('UPDATE comercial_notificacoes SET lida = 1 WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.post('/api/credenciamentos/:id/reenviar', authenticateToken, (req, res) => {
    db.get('SELECT * FROM credenciamentos WHERE id = ?', [req.params.id], (err, cred) => {
        if (err || !cred) return res.status(500).json({ error: 'Credenciamento não encontrado' });
        if (!cred.token) return res.status(400).json({ error: 'Este credenciamento ainda não possui um link gerado pela logística.' });
        
        const baseUrl = process.env.PUBLIC_URL || \`\${req.protocol}://\${req.get('host')}\`;
        const link = \`\${baseUrl}/credenciamento-publico.html?token=\${cred.token}\`;
        const logoUrl = \`\${baseUrl}/assets/logo-header.png\`;
        
        const validUntil = new Date(cred.valid_until);
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: cred.cliente_email,
            subject: 'Credenciamento de Equipe - América Rental (Reenvio)',
            html: \`<div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <img src="\${logoUrl}" alt="América Rental" style="max-height: 60px;">
                        </div>
                        <h2 style="color: #2d9e5f; text-align: center;">Credenciamento de Equipe Liberado</h2>
                        <p>Olá <b>\${cred.cliente_nome}</b>,</p>
                        <p>Abaixo está o link para acesso aos documentos da equipe alocada para sua obra/evento.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="\${link}" style="background: #2d9e5f; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                                Acessar Prontuários e Documentos
                            </a>
                        </div>
                        <p style="text-align: center; font-size: 12px; color: #999;">
                            <i>Este link expira automaticamente em \${validUntil.toLocaleDateString('pt-BR')}.</i>
                        </p>
                    </div>\`
        };
        
        sendMailHelper(mailOptions).then(() => {
            res.json({ message: 'E-mail reenviado com sucesso.' });
        }).catch(e => res.status(500).json({ error: e.message }));
    });
});
`;
    serverJs = serverJs.replace("// DELETE Autenticado: Excluir credenciamento", endpoints + "\n// DELETE Autenticado: Excluir credenciamento");
}

// 3. When Logistica envia, create notif
const sendEmailSuccess = "res.json({ message: 'E-mail de credenciamento enviado com sucesso.', link });";
if (serverJs.includes(sendEmailSuccess) && !serverJs.includes('INSERT INTO comercial_notificacoes (usuario_id, mensagem, tipo)')) {
    serverJs = serverJs.replace(sendEmailSuccess, 
        `db.run("INSERT INTO comercial_notificacoes (usuario_id, mensagem, tipo) VALUES (?, ?, 'credenciamento_enviado')", [cred.solicitado_por_id, \`A Logística enviou o credenciamento da OS \${cred.os} para o cliente \${cred.cliente_nome}.\`]);
         ${sendEmailSuccess}`);
}

// 4. When Cliente accesses
const publicAcesso = "if (!cred.acessado_em) {\n            db.run('UPDATE credenciamentos SET acessado_em = ? WHERE id = ?', [new Date().toISOString(), cred.id], () => { });\n        }";
if (serverJs.includes(publicAcesso)) {
    const publicAcessoNew = `if (!cred.acessado_em) {
            db.run('UPDATE credenciamentos SET acessado_em = ? WHERE id = ?', [new Date().toISOString(), cred.id], () => { 
                db.run("INSERT INTO comercial_notificacoes (usuario_id, mensagem, tipo) VALUES (?, ?, 'credenciamento_acessado')", [cred.solicitado_por_id, \`O cliente \${cred.cliente_nome} (OS \${cred.os}) acabou de acessar o link do credenciamento!\`]);
            });
        }`;
    serverJs = serverJs.replace(publicAcesso, publicAcessoNew);
}

fs.writeFileSync(serverPath, serverJs, 'utf8');
console.log("Updated server.js for Comercial Notificacoes and Reenviar");