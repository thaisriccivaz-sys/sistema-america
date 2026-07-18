const fs = require('fs');
let code = fs.readFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/backend/server.js', 'utf8');

const regex = /app\.get\('\/api\/colaboradores\/:id\/documentos',\s*authenticateToken,\s*\(req,\s*res\)\s*=>\s*\{[\s\S]*?res\.json\(rows\);\s*\}\);\s*\}\);\s*\}\);/g;

const replacement = `app.get('/api/colaboradores/:id/documentos', authenticateToken, (req, res) => {
    db.all('SELECT * FROM documentos WHERE colaborador_id = ? ORDER BY tab_name, year, month', [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        db.all('SELECT documento_id, data_hora FROM assinaturas_auditoria WHERE colaborador_id = ? ORDER BY data_hora ASC', [req.params.id], (err3, audits) => {
            const auditMap = {};
            (audits || []).forEach(a => {
                if (!auditMap[a.documento_id]) auditMap[a.documento_id] = [];
                auditMap[a.documento_id].push(a.data_hora);
            });
            rows.forEach(r => {
                if (auditMap[r.id]) {
                    r.data_assinatura_testemunhas = auditMap[r.id][0];
                    if (auditMap[r.id].length > 1) {
                        r.data_assinatura_colaborador = auditMap[r.id][auditMap[r.id].length - 1];
                    }
                }
            });

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
    });
});`;

let count = 0;
code = code.replace(regex, () => { count++; return count === 1 ? replacement : ''; });

fs.writeFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/backend/server.js', code, 'utf8');
console.log('Replaced ' + count + ' occurrences.');
