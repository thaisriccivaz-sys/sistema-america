const fs = require('fs');
let sv = fs.readFileSync('backend/server.js', 'utf8');

// Check if management endpoints already exist
if (sv.includes("GET Autenticado: Listar todos os credenciamentos")) {
    console.log('[SKIP] Management endpoints already present');
} else {
    // Find the GET público endpoint and insert before it
    const anchor = '// GET Público: Busca dados do credenciamento e resolve os documentos';
    const idx = sv.indexOf(anchor);
    if (idx === -1) { console.log('ERROR: anchor not found'); process.exit(1); }
    
    const newCode = `// GET Autenticado: Listar todos os credenciamentos
app.get('/api/logistica/credenciamentos', authenticateToken, (req, res) => {
    db.all(\`SELECT id, cliente_nome, cliente_email, token, colaboradores_ids, veiculos_ids, licencas_ids, docs_exigidos, valid_until, acessado_em, created_at
            FROM credenciamentos ORDER BY created_at DESC\`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// DELETE Autenticado: Excluir credenciamento
app.delete('/api/logistica/credenciamentos/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM credenciamentos WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ok: true });
    });
});

`;
    sv = sv.slice(0, idx) + newCode + sv.slice(idx);
    console.log('[OK] Management endpoints added');
}

// Add client access tracking after expiry check in GET público
const accessAnchor = 'Este link de credenciamento já expirou (validade de 7 dias).';
const idx2 = sv.indexOf(accessAnchor);
if (idx2 !== -1) {
    // Find the closing of the expiry if block
    const afterExpiry = sv.indexOf('\n', sv.indexOf('})', idx2));
    const snippet = '\n\n        // Registrar primeiro acesso do cliente\n        if (!cred.acessado_em) {\n            db.run(\'UPDATE credenciamentos SET acessado_em = ? WHERE id = ?\', [new Date().toISOString(), cred.id], () => {});\n        }\n';
    
    // Check if already added
    if (!sv.includes('Registrar primeiro acesso do cliente')) {
        sv = sv.slice(0, afterExpiry + 1) + snippet + sv.slice(afterExpiry + 1);
        console.log('[OK] Access tracking added');
    } else {
        console.log('[SKIP] Access tracking already present');
    }
}

// Ensure acessado_em column migration exists in database.js
let db = fs.readFileSync('backend/database.js', 'utf8');
if (!db.includes('acessado_em')) {
    // Find a good place: after another ALTER TABLE on credenciamentos or at the end of migrations
    const migAnchor = 'licencas_ids';
    const migIdx = db.indexOf(migAnchor);
    if (migIdx !== -1) {
        const lineEnd = db.indexOf('\n', db.indexOf('\n', db.indexOf('\n', migIdx) + 1) + 1);
        const migCode = `
    // Adicionar coluna acessado_em se nao existir
    db.run("ALTER TABLE credenciamentos ADD COLUMN acessado_em TEXT", (err) => {
        if (err && !err.message.includes('duplicate')) { /* coluna ja existe */ }
    });
`;
        db = db.slice(0, lineEnd) + migCode + db.slice(lineEnd);
        fs.writeFileSync('backend/database.js', db, 'utf8');
        console.log('[OK] acessado_em column migration added to database.js');
    } else {
        console.log('[WARN] Could not find anchor in database.js');
    }
} else {
    console.log('[SKIP] acessado_em already in database.js');
}

fs.writeFileSync('backend/server.js', sv, 'utf8');
console.log('Done');
