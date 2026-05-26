const fs = require('fs');

let server = fs.readFileSync('backend/server.js', 'utf8');

// 1. UPDATE /api/logistica/credenciamento
if (!server.includes('solicitado_por_nome, solicitado_por_id, enviado_por_nome, enviado_por_id') && server.includes('db.run(`INSERT INTO credenciamentos (cliente_nome, cliente_email, endereco_instalacao, token')) {
    server = server.replace(
        'valid_until) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`',
        'valid_until, solicitado_por_nome, solicitado_por_id, solicitado_por_foto, enviado_por_nome, enviado_por_id, enviado_por_foto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`'
    );
    server = server.replace(
        `JSON.stringify(licencas || []), validUntil.toISOString()],`,
        `JSON.stringify(licencas || []), validUntil.toISOString(), req.user ? req.user.nome || req.user.username : null, req.user ? req.user.id : null, req.body.enviado_por_foto || null, req.user ? req.user.nome || req.user.username : null, req.user ? req.user.id : null, req.body.enviado_por_foto || null],`
    );
}

// 2. UPDATE /api/logistica/credenciamento/:id/enviar
if (!server.includes('enviado_por_nome = ?') && server.includes("status = 'enviado', created_at = CURRENT_TIMESTAMP WHERE id = ?")) {
    server = server.replace(
        "status = 'enviado', created_at = CURRENT_TIMESTAMP WHERE id = ?",
        "status = 'enviado', created_at = CURRENT_TIMESTAMP, enviado_por_nome = ?, enviado_por_id = ?, enviado_por_foto = ? WHERE id = ?"
    );
    server = server.replace(
        `req.params.id],`,
        `req.user ? req.user.nome || req.user.username : null, req.user ? req.user.id : null, req.body.enviado_por_foto || null, req.params.id],`
    );
}

fs.writeFileSync('backend/server.js', server);
console.log('Done patch 2');
