const fs = require('fs');
let sv = fs.readFileSync('backend/server.js', 'utf8');

// Insert 2 new public endpoints BEFORE app.listen
const insertBefore = "app.listen(PORT, () => {";
const newEndpoints = `
// GET Público: Baixar arquivo de licença do credenciamento
app.get('/api/publico/credenciamento/:token/licenca/:licId', (req, res) => {
    db.get('SELECT * FROM credenciamentos WHERE token = ?', [req.params.token], (err, cred) => {
        if (!cred || new Date() > new Date(cred.valid_until)) return res.status(403).send('Link inválido/expirado');
        
        // Verificar que a licença pertence ao credenciamento
        let licencasIds = [];
        try { licencasIds = JSON.parse(cred.licencas_ids || '[]'); } catch(e){}
        if (!licencasIds.find(l => String(l.id) === String(req.params.licId))) {
            return res.status(403).send('Acesso negado a esta licença');
        }
        
        db.get('SELECT * FROM licencas WHERE id = ?', [req.params.licId], (err2, row) => {
            if (err2 || !row) return res.status(404).send('Licença não encontrada');
            if (!row.file_path && !row.file_name) return res.status(404).send('Nenhum arquivo anexado a esta licença');
            
            let absPath = '';
            if (row.file_path) absPath = path.resolve(__dirname, '..', '..', row.file_path);
            if (!absPath || !fs.existsSync(absPath)) {
                const empresaDir = path.join(LICENCAS_UPLOAD_PATH, (row.empresa || 'GERAL').toUpperCase().replace(/[^A-Z0-9]/g, '_'));
                const finalPath = path.join(empresaDir, row.file_name);
                if (fs.existsSync(finalPath)) absPath = finalPath;
            }
            if (!absPath || !fs.existsSync(absPath)) return res.status(404).send('Arquivo físico não encontrado');
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="' + row.file_name + '"');
            res.sendFile(absPath);
        });
    });
});

`;

if (!sv.includes(insertBefore)) {
    console.log('ERROR: app.listen not found'); process.exit(1);
}
sv = sv.replace(insertBefore, newEndpoints + insertBefore);
fs.writeFileSync('backend/server.js', sv, 'utf8');
console.log('[OK] Endpoint de download de licença adicionado');
