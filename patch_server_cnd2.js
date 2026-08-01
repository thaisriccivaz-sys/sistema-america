const fs = require('fs');
const file = 'backend/server.js';
let c = fs.readFileSync(file, 'utf8');

if (!c.includes('/api/public/cnd/:token')) {
// 1. Injetar Rotas Publicas
const rotasPublicas = `
// ============================================================================
// API PUBLICA - CNDs
// ============================================================================
app.get('/api/public/cnd/:token', (req, res) => {
    const token = req.params.token;
    db.get('SELECT * FROM cnd_upload_tokens WHERE token = ?', [token], (err, row) => {
        if (err) return res.status(500).json({ error: 'Erro no servidor' });
        if (!row) return res.status(404).json({ error: 'Link inválido, já utilizado ou expirado.' });

        db.get('SELECT empresa, nome, validade FROM licencas WHERE nome = ?', [row.cnd_nome], (errLic, rowLic) => {
            if (errLic) return res.status(500).json({ error: 'Erro interno.' });
            res.json({
                cnd_nome: row.cnd_nome,
                empresa: rowLic ? rowLic.empresa : 'Não definida',
                validade_atual: rowLic ? rowLic.validade : null
            });
        });
    });
});

app.post('/api/public/cnd/:token', upload.single('file'), (req, res) => {
    const token = req.params.token;
    const novaValidade = req.body.validade;
    
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    if (!novaValidade) return res.status(400).json({ error: 'Data de validade não informada.' });

    db.get('SELECT cnd_nome FROM cnd_upload_tokens WHERE token = ?', [token], async (err, row) => {
        if (err) return res.status(500).json({ error: 'Erro no servidor' });
        if (!row) return res.status(404).json({ error: 'Link inválido ou expirado.' });

        try {
            // Verifica se a licenca existe
            db.get('SELECT id, empresa FROM licencas WHERE nome = ?', [row.cnd_nome], (errLic, licRow) => {
                if (errLic) throw errLic;
                
                if (licRow) {
                    const path = require('path');
                    const fs = require('fs');
                    const LICENCAS_UPLOAD_PATH = process.env.LICENCAS_UPLOAD_PATH || path.join(__dirname, '..', 'uploads', 'licencas');
                    const empresaDir = path.join(LICENCAS_UPLOAD_PATH, (licRow.empresa || 'GERAL').toUpperCase().replace(/[^A-Z0-9]/g, '_'));
                    if (!fs.existsSync(empresaDir)) fs.mkdirSync(empresaDir, { recursive: true });
                    
                    const ext = path.extname(req.file.originalname) || '.pdf';
                    const safeName = row.cnd_nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
                    const fileName = safeName + ext;
                    const filePath = path.join(empresaDir, fileName);
                    
                    if (req.file.buffer) {
                        fs.writeFileSync(filePath, req.file.buffer);
                    } else if (req.file.path) {
                        fs.copyFileSync(req.file.path, filePath);
                        fs.unlinkSync(req.file.path);
                    }

                    const BASE_UPLOAD_PATH = process.env.BASE_UPLOAD_PATH || path.join(__dirname, '..', 'uploads');
                    const relPath = path.relative(path.join(BASE_UPLOAD_PATH, '..', '..'), filePath).replace(/\\/g, '/');

                    const dataIso = novaValidade; // assumindo formato YYYY-MM-DD
                    
                    // Update
                    const sql = "UPDATE licencas SET file_name = ?, file_path = ?, file_data = NULL, validade = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
                    db.run(sql, [fileName, relPath, dataIso, licRow.id], function(errUpd) {
                        if (errUpd) return res.status(500).json({ error: errUpd.message });
                        db.run('DELETE FROM cnd_upload_tokens WHERE token = ?', [token]); // apaga token
                        res.json({ success: true, message: 'Documento atualizado com sucesso.' });
                    });
                } else {
                    return res.status(400).json({ error: 'Licença base não encontrada no sistema para ser atualizada.' });
                }
            });
        } catch (uploadErr) {
            console.error('[Public CND] Erro:', uploadErr);
            res.status(500).json({ error: 'Erro ao fazer upload do arquivo' });
        }
    });
});
`;

    // Replace before app.listen
    c = c.replace(/app\.listen\(/, match => rotasPublicas + '\n' + match);
    fs.writeFileSync(file, c);
    console.log('Rotas inseridas com sucesso!');
} else {
    console.log('Rotas ja existem.');
}
