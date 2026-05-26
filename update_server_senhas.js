const fs = require('fs');
const path = 'backend/server.js';
let content = fs.readFileSync(path, 'utf8');

const endpoints = `
// ==========================================
// MÓDULO LOGÍSTICA: COFRE DE SENHAS
// ==========================================
const crypto = require('crypto');
const SENHAS_ENCRYPTION_KEY = crypto.scryptSync(process.env.JWT_SECRET || 'america-rental-secreto-super-seguro-2026', 'salt', 32);
const SENHAS_ENCRYPTION_ALGORITHM = 'aes-256-cbc';
const SENHAS_IV_LENGTH = 16;

function encryptPassword(text) {
    let iv = crypto.randomBytes(SENHAS_IV_LENGTH);
    let cipher = crypto.createCipheriv(SENHAS_ENCRYPTION_ALGORITHM, SENHAS_ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptPassword(text) {
    let textParts = text.split(':');
    if (textParts.length !== 2) return text; // Fallback if not encrypted correctly
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv(SENHAS_ENCRYPTION_ALGORITHM, SENHAS_ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

app.get('/api/logistica/senhas', verificarToken, (req, res) => {
    db.all("SELECT * FROM logistica_senhas ORDER BY servico ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const senhas = rows.map(r => {
            r.senha = r.senha_encriptada ? decryptPassword(r.senha_encriptada) : '';
            delete r.senha_encriptada;
            return r;
        });
        res.json(senhas);
    });
});

app.post('/api/logistica/senhas', verificarToken, (req, res) => {
    const { servico, link, usuario, senha } = req.body;
    if (!servico || !usuario || !senha) return res.status(400).json({ error: 'Serviço, usuário e senha são obrigatórios.' });
    
    const senhaEncriptada = encryptPassword(senha);
    db.run("INSERT INTO logistica_senhas (servico, link, usuario, senha_encriptada) VALUES (?, ?, ?, ?)", [servico, link, usuario, senhaEncriptada], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, message: 'Senha cadastrada com sucesso' });
    });
});

app.put('/api/logistica/senhas/:id', verificarToken, (req, res) => {
    const { servico, link, usuario, senha } = req.body;
    const updates = [];
    const params = [];
    
    if (servico) { updates.push("servico = ?"); params.push(servico); }
    if (link !== undefined) { updates.push("link = ?"); params.push(link); }
    if (usuario) { updates.push("usuario = ?"); params.push(usuario); }
    if (senha) { 
        updates.push("senha_encriptada = ?"); 
        params.push(encryptPassword(senha)); 
    }
    
    if (updates.length === 0) return res.status(400).json({ error: 'Nenhum dado para atualizar.' });
    updates.push("updated_at = CURRENT_TIMESTAMP");
    params.push(req.params.id);
    
    db.run(\`UPDATE logistica_senhas SET \${updates.join(', ')} WHERE id = ?\`, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Senha atualizada com sucesso' });
    });
});

app.delete('/api/logistica/senhas/:id', verificarToken, (req, res) => {
    db.run("DELETE FROM logistica_senhas WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Senha deletada com sucesso' });
    });
});

// START SERVER
`;

content = content.replace('// START SERVER', endpoints);

// Add table creation
const tableCreation = `
// Migração: Cofre de Senhas da Logística
db.run(\`
    CREATE TABLE IF NOT EXISTS logistica_senhas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        servico TEXT NOT NULL,
        link TEXT,
        usuario TEXT NOT NULL,
        senha_encriptada TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
\`);
`;
content = content.replace('// Blacklist de cargos e departamentos excluidos manualmente', tableCreation + '\n// Blacklist de cargos e departamentos excluidos manualmente');

fs.writeFileSync(path, content, 'utf8');
console.log("Updated server.js");