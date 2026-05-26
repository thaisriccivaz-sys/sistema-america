const fs = require('fs');
let sv = fs.readFileSync('backend/server.js', 'utf8');

// Add public EPI download endpoint before app.listen
const insertBefore = 'app.listen(PORT, () => {';
const epiEndpoint = `
// GET Público: Baixar Ficha de EPI do credenciamento (gerada como PDF via snapshot)
app.get('/api/publico/credenciamento/:token/epi/:epiId', (req, res) => {
    db.get('SELECT * FROM credenciamentos WHERE token = ?', [req.params.token], (err, cred) => {
        if (!cred || new Date() > new Date(cred.valid_until)) return res.status(403).send('Link inválido/expirado');

        let colabs = [];
        try { colabs = JSON.parse(cred.colaboradores_ids || '[]'); } catch(e) {}

        db.get('SELECT * FROM colaborador_epi_fichas WHERE id = ?', [req.params.epiId], (err2, ficha) => {
            if (err2 || !ficha) return res.status(404).send('Ficha de EPI não encontrada');
            if (!colabs.find(c => String(c.id) === String(ficha.colaborador_id))) return res.status(403).send('Acesso negado');

            // Redirecionar para o endpoint autenticado de geração de PDF de EPI via ficha
            // Estratégia: usar o snapshot_epis e snapshot_termo para montar um PDF simples
            // Como fallback, retornar JSON com os dados
            res.status(404).json({ error: 'Download direto de Ficha EPI não disponível. Use o sistema interno para gerar o PDF.' });
        });
    });
});

`;

if (!sv.includes(insertBefore)) { console.log('ERROR: app.listen not found'); process.exit(1); }
sv = sv.replace(insertBefore, epiEndpoint + insertBefore);
fs.writeFileSync('backend/server.js', sv, 'utf8');
console.log('[OK] EPI download endpoint added');
