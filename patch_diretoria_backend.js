const fs = require('fs');

// 1. PATCH backend/database.js to create the table
let dbFile = fs.readFileSync('backend/database.js', 'utf8');
if (!dbFile.includes('CREATE TABLE IF NOT EXISTS diretoria_notificacoes_pendentes')) {
    dbFile = dbFile.replace(
        'CREATE TABLE IF NOT EXISTS logistica_notificacoes_pendentes',
        `CREATE TABLE IF NOT EXISTS diretoria_notificacoes_pendentes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo TEXT,
            dados TEXT,
            lido INTEGER DEFAULT 0,
            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS logistica_notificacoes_pendentes`
    );
    // Also create the department 'Diretoria' if it's missing (can be done via sqlite run)
    fs.writeFileSync('backend/database.js', dbFile);
}

// 2. PATCH backend/server.js
let s = fs.readFileSync('backend/server.js', 'utf8');

// A function to check and notify
const checkFunc = `
function checkColaboradorDesligado(colab_id) {
    db.get("SELECT nome_completo FROM colaboradores WHERE id = ?", [colab_id], (err, colab) => {
        if (!colab) return;
        const nome = colab.nome_completo;
        db.all("SELECT nome FROM departamentos WHERE responsavel_id = ? OR responsavel_nome = ?", [colab_id, nome], (errD, deptos) => {
            if (errD || !deptos || deptos.length === 0) return;
            
            deptos.forEach(d => {
                // Notificar a diretoria
                const area = d.nome;
                const dados = JSON.stringify({ colab_nome: nome, area: area });
                db.run("INSERT INTO diretoria_notificacoes_pendentes (tipo, dados) VALUES ('desligamento_responsavel', ?)", [dados]);
                
                // Enviar e-mail para a Diretoria
                db.all("SELECT email FROM usuarios WHERE role = 'Diretoria' OR departamento = 'Diretoria'", [], (errU, users) => {
                    const emails = new Set();
                    (users || []).forEach(u => { if (u.email && u.email.includes('@')) emails.add(u.email); });
                    if (emails.size > 0) {
                        const htmlMail = \`
                            <h2>Aviso de Desligamento</h2>
                            <p>O colaborador <b>\${nome}</b>, que era responsável pela área <b>\${area}</b>, foi desligado.</p>
                            <p>Outro colaborador deve ser incluído na função.</p>
                        \`;
                        const transporter = require('nodemailer').createTransport({
                            host: 'mail.americarental.com.br', port: 465, secure: true,
                            auth: { user: process.env.EMAIL_USER || 'contato@americarental.com.br', pass: process.env.EMAIL_PASS || 'fV6?H3hP5t3A' },
                            tls: { rejectUnauthorized: false }
                        });
                        transporter.sendMail({
                            from: '"América Rental" <contato@americarental.com.br>',
                            to: [...emails].join(', '),
                            subject: 'Aviso de Desligamento de Responsável - ' + area,
                            html: htmlMail
                        }).catch(e => console.error("Email error:", e));
                    }
                });
            });
        });
    });
}
`;

if (!s.includes('checkColaboradorDesligado')) {
    s = s.replace('const uploadAtestado', checkFunc + '\nconst uploadAtestado');
}

// Call in DELETE /api/colaboradores/:id
s = s.replace(
    "db.run(\"UPDATE colaboradores SET status = 'Desligado' WHERE id = ?\", [id], function (updateErr) {",
    "db.run(\"UPDATE colaboradores SET status = 'Desligado' WHERE id = ?\", [id], function (updateErr) {\n                if (!updateErr) checkColaboradorDesligado(id);"
);

// Call in PUT /api/colaboradores/:id
const putSearch = "db.run(query, values, function (err) {\n        if (err) return res.status(500).json({ error: err.message });\n        res.json({ message: 'Colaborador atualizado com sucesso' });\n    });";
const putReplace = "db.run(query, values, function (err) {\n        if (err) return res.status(500).json({ error: err.message });\n        if (data.status === 'Desligado') checkColaboradorDesligado(id);\n        res.json({ message: 'Colaborador atualizado com sucesso' });\n    });";
s = s.replace(putSearch, putReplace);

// Add Diretoria Notificacoes endpoints
const endpoints = `
// GET /api/diretoria/notificacoes/pendentes
app.get('/api/diretoria/notificacoes/pendentes', authenticateToken, (req, res) => {
    db.all("SELECT * FROM diretoria_notificacoes_pendentes WHERE lido = 0 ORDER BY criado_em DESC LIMIT 20", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// PUT /api/diretoria/notificacoes/:id/lida
app.put('/api/diretoria/notificacoes/:id/lida', authenticateToken, (req, res) => {
    db.run("UPDATE diretoria_notificacoes_pendentes SET lido = 1 WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Lida' });
    });
});
`;
if (!s.includes('/api/diretoria/notificacoes/pendentes')) {
    s = s.replace('// GET /api/logistica/notificacoes/pendentes', endpoints + '\n// GET /api/logistica/notificacoes/pendentes');
}

fs.writeFileSync('backend/server.js', s);
