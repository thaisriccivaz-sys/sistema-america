const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

code = code.replace(
    'db.run("ALTER TABLE colaboradores ADD COLUMN adiantamento_salarial TEXT", (err) => {',
    'db.run("ALTER TABLE colaboradores ADD COLUMN habilidades_equipe TEXT", () => {});\ndb.run("ALTER TABLE colaboradores ADD COLUMN adiantamento_salarial TEXT", (err) => {'
);

code = code.replace(
    /c\.escala_ciclo_inicio, c\.horario_entrada, c\.horario_saida, c\.destaque_equipe/g,
    'c.escala_ciclo_inicio, c.horario_entrada, c.horario_saida, c.destaque_equipe, c.habilidades_equipe'
);

const patchEndpoint = \pp.patch('/api/colaboradores/:id/destaque', authenticateToken, (req, res) => {
    db.run('UPDATE colaboradores SET destaque_equipe = CASE WHEN destaque_equipe = 1 THEN 0 ELSE 1 END WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ sucesso: true });
    });
});

app.patch('/api/colaboradores/:id/habilidades_equipe', authenticateToken, (req, res) => {
    db.run('UPDATE colaboradores SET habilidades_equipe = ? WHERE id = ?', [req.body.habilidades, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ sucesso: true });
    });
});\;

code = code.replace(/app\.patch\('\/api\/colaboradores\/:id\/destaque', authenticateToken, \(req, res\) => \{[\s\S]*?res\.json\(\{ sucesso: true \}\);\n    \}\);\n\}\);/, patchEndpoint);

fs.writeFileSync('backend/server.js', code);
console.log('Done 3');
