const fs = require('fs');

const file = 'backend/server.js';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('/api/colaboradores/:id/sinistros/:sinistroId\', authenticateToken, (req, res) => {')) {
    const routeCode = `
app.delete('/api/colaboradores/:id/sinistros/:sinistroId', authenticateToken, (req, res) => {
    const { id, sinistroId } = req.params;
    
    // Nao deixamos excluir se ja estiver assinado, por seguranca da assinatura digital.
    db.get('SELECT status FROM sinistros WHERE id = ? AND colaborador_id = ?', [sinistroId, id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Sinistro nao encontrado' });
        if (row.status === 'assinado') return res.status(403).json({ error: 'Nao eh possivel excluir um sinistro ja assinado.' });
        
        db.run('DELETE FROM sinistros WHERE id = ? AND colaborador_id = ?', [sinistroId, id], function(err2) {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ sucesso: true });
        });
    });
});
`;
    // Insert just before `app.post('/api/colaboradores/:id/sinistros',`
    content = content.replace("app.post('/api/colaboradores/:id/sinistros',", routeCode + "\napp.post('/api/colaboradores/:id/sinistros',");
    fs.writeFileSync(file, content, 'utf8');
    console.log("Servidor patchado com a rota de exclusao!");
}
