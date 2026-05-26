const fs = require('fs');

let serverPath = 'backend/server.js';
let serverJs = fs.readFileSync(serverPath, 'utf8');

const regex = /app\.get\('\/api\/colaboradores\/:id\/documentos', authenticateToken, \(req, res\) => \{[\s\S]*?res\.json\(rows\);\s*\}\);\s*\}\);/g;

const replacement = `app.get('/api/colaboradores/:id/documentos', authenticateToken, (req, res) => {
    db.all('SELECT * FROM documentos WHERE colaborador_id = ? ORDER BY tab_name, year, month', [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.all('SELECT * FROM colaborador_epi_fichas WHERE colaborador_id = ? AND status = "ativa" ORDER BY id DESC LIMIT 1', [req.params.id], (err2, epis) => {
            if (!err2 && epis && epis.length > 0) {
                rows.push({
                    id: 'epi_' + epis[0].id,
                    colaborador_id: req.params.id,
                    document_type: 'Ficha de EPI',
                    tab_name: 'Ficha de EPI'
                });
            }
            res.json(rows);
        });
    });
});`;

serverJs = serverJs.replace(regex, replacement);
fs.writeFileSync(serverPath, serverJs, 'utf8');
console.log("Updated endpoint /api/colaboradores/:id/documentos to include EPI");