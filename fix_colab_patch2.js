const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

const regex = /app\.patch\('\/api\/colaboradores\/:id\/destaque', authenticateToken, \(req, res\) => \{[\s\S]*?\}\);/;
const append = "\n\napp.patch('/api/colaboradores/:id/habilidades_equipe', authenticateToken, (req, res) => {\n    db.run('UPDATE colaboradores SET habilidades_equipe = ? WHERE id = ?', [req.body.habilidades, req.params.id], function(err) {\n        if (err) return res.status(500).json({ error: err.message });\n        res.json({ sucesso: true });\n    });\n});";

code = code.replace(regex, "$&" + append);

fs.writeFileSync('backend/server.js', code);
console.log('Done');
