const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

const patchCode = \
// ------ PATCH /api/colaboradores/:id/habilidades_equipe -----------------------------------------------------------
app.patch('/api/colaboradores/:id/habilidades_equipe', authenticateToken, (req, res) => {
    const { habilidades } = req.body;
    db.run('UPDATE colaboradores SET habilidades_equipe = ? WHERE id = ?', [habilidades, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ sucesso: true });
    });
});
\;

code = code.replace(
    /app\.patch\('\/api\/colaboradores\/:id\/destaque', authenticateToken, \(req, res\) => \{\n(.*?)db\.run(.*?\n.*?\n.*?\n.*?\n.*?\n)/,
    "$&" + patchCode
);

fs.writeFileSync('backend/server.js', code);
console.log('Fixed patch');
