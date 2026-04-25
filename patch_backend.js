const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

const newRoute = `
// Rota para marcar documento como Outro Meio
app.post('/api/admissao-assinaturas/outro-meio', authenticateToken, (req, res) => {
    const { id, source } = req.body;
    if (!id || !source) return res.status(400).json({ error: 'id e source são obrigatórios' });

    let table = source === 'admissao' ? 'admissao_assinaturas' : 'documentos';
    db.run(\`UPDATE \${table} SET assinafy_status = 'Outro Meio' WHERE id = ?\`, [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Documento não encontrado' });
        res.json({ ok: true, message: 'Documento marcado como resolvido (Outro Meio).' });
    });
});
app.get('/api/admissao-assinaturas/todos',`;

js = js.replace("app.get('/api/admissao-assinaturas/todos',", newRoute);

fs.writeFileSync('backend/server.js', js, 'utf8');
