const fs = require('fs');

function rebuildLogic() {
    let js = fs.readFileSync('backend/server.js', 'utf8');

    // Remove old document view/:id route body and rebuild it cleanly
    const regexDocView = /app\.get\('\/api\/documentos\/view\/:id', authenticateToken, \(req, res\) => \{[\s\S]*?return res\.status\(404\)\.json\(\{ error: 'Arquivo físico não encontrado no servidor\.' \}\);\s*\}\);\s*\}\);/g;

    const newDocView = `app.get('/api/documentos/view/:id', authenticateToken, (req, res) => {
    db.get('SELECT * FROM documentos WHERE id = ?', [req.params.id], async (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Documento não encontrado' });

        let pathLocal = row.signed_file_path; // Tentar assinado local primeiro
        
        // Se existe fisicamente (.pfx concluído)
        if (pathLocal && fs.existsSync(pathLocal)) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', \`inline; filename="\${encodeURIComponent(row.file_name || 'documento.pdf')}"\`);
            return fs.createReadStream(pathLocal).pipe(res);
        }

        // Se NAO tem assinado local (.pfx vazio ou excluído), mas tem Assinafy (colaborador assinou), tentar buscar da Assinafy
        if (row.assinafy_id) {
            try {
                const r = await fetch(\`https://api.assinafy.com.br/v1/documents/\${row.assinafy_id}\`, { headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey, 'Accept': 'application/json' } });
                if (r.ok) {
                    const data = await r.json();
                    const signedUrl = extractSignedUrl(data?.data || data);
                    if (signedUrl) {
                        try {
                            if (!signedUrl.includes('assinafy.com.br')) {
                                return res.redirect(signedUrl);
                            } else {
                                const dl = await fetch(signedUrl, { headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey } });
                                if (dl.ok) {
                                    const arrayBuffer = await dl.arrayBuffer();
                                    res.setHeader('Content-Type', 'application/pdf');
                                    return res.send(Buffer.from(arrayBuffer));
                                }
                            }
                        } catch(err) { }
                    }
                }
            } catch(e) { console.warn('Proxy Assinafy erro:', e.message); }
        }

        // Fallback final: Devolve o arquivo original NÃO ASSINADO
        pathLocal = row.file_path;
        if (pathLocal && fs.existsSync(pathLocal)) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', \`inline; filename="\${encodeURIComponent(row.file_name || 'documento.pdf')}"\`);
            return fs.createReadStream(pathLocal).pipe(res);
        }

        return res.status(404).json({ error: 'Arquivo físico não encontrado no servidor.' });
    });
});`;
    
    js = js.replace(regexDocView, newDocView);

    // ============================================ //
    // DO THE SAME FOR ADMISSAO-ASSINATURAS DOWNLOAD
    // ============================================ //
    const regexAdmDown = /app\.get\('\/api\/admissao-assinaturas\/:id\/download', authenticateToken, async \(req, res\) => \{[\s\S]*?return res\.status\(404\)\.json\(\{ error: 'Arquivo físico não encontrado no servidor\.' \}\);\s*\}\);/g;
    const newAdmDown = `app.get('/api/admissao-assinaturas/:id/download', authenticateToken, async (req, res) => {
    try {
        const row = await new Promise((resolve, reject) =>
            db.get('SELECT * FROM admissao_assinaturas WHERE id = ?', [req.params.id], (err, r) => err ? reject(err) : resolve(r))
        );
        if (!row) return res.status(404).json({ error: 'Registro não encontrado' });

        let pathToFile = row.signed_file_path;

        if (pathToFile && fs.existsSync(pathToFile)) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', \`inline; filename="\${encodeURIComponent(row.nome_documento || 'documento')}_Assinado.pdf"\`);
            return fs.createReadStream(pathToFile).pipe(res);
        }

        if (row.assinafy_id) {
            try {
                const r = await fetch(\`https://api.assinafy.com.br/v1/documents/\${row.assinafy_id}\`, { headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey, 'Accept': 'application/json' } });
                if (r.ok) {
                    const data = await r.json();
                    const signedUrl = extractSignedUrl(data?.data || data);
                    if (signedUrl) {
                        try {
                            if (!signedUrl.includes('assinafy.com.br')) {
                                return res.redirect(signedUrl);
                            } else {
                                const dl = await fetch(signedUrl, { headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey } });
                                if (dl.ok) {
                                    const arrayBuffer = await dl.arrayBuffer();
                                    res.setHeader('Content-Type', 'application/pdf');
                                    return res.send(Buffer.from(arrayBuffer));
                                }
                            }
                        } catch(err) { }
                    }
                }
            } catch(e) { }
        }

        return res.status(404).json({ error: 'Arquivo assinado físico não encontrado no servidor.' });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});`;
    js = js.replace(regexAdmDown, newAdmDown);

    // ============================================ //
    // DO THE SAME FOR DOCUMENTOS/DOWNLOAD/:ID
    // ============================================ //
    const regexDocDown = /app\.get\('\/api\/documentos\/download\/:id', authenticateToken, \(req, res\) => \{[\s\S]*?return res\.status\(404\)\.json\(\{ error: 'Arquivo físico não encontrado no servidor\.' \}\);\s*\}\);\s*\}\);/g;
    const newDocDown = `app.get('/api/documentos/download/:id', authenticateToken, (req, res) => {
    db.get('SELECT * FROM documentos WHERE id = ?', [req.params.id], async (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Documento não encontrado' });

        let pathLocal = row.signed_file_path; // Tentar assinado local primeiro
        
        // Se existe fisicamente (.pfx concluído)
        if (pathLocal && fs.existsSync(pathLocal)) {
            return res.download(pathLocal, row.file_name || 'documento.pdf');
        }

        // Se NAO tem assinado local (.pfx vazio ou excluído), mas tem Assinafy (colaborador assinou), tentar buscar da Assinafy
        if (row.assinafy_id) {
            try {
                const r = await fetch(\`https://api.assinafy.com.br/v1/documents/\${row.assinafy_id}\`, { headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey, 'Accept': 'application/json' } });
                if (r.ok) {
                    const data = await r.json();
                    const signedUrl = extractSignedUrl(data?.data || data);
                    if (signedUrl) {
                        try {
                            if (!signedUrl.includes('assinafy.com.br')) {
                                return res.redirect(signedUrl);
                            } else {
                                const dl = await fetch(signedUrl, { headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey } });
                                if (dl.ok) {
                                    const arrayBuffer = await dl.arrayBuffer();
                                    res.setHeader('Content-Type', 'application/pdf');
                                    res.setHeader('Content-Disposition', \`attachment; filename="\${encodeURIComponent(row.file_name || 'documento.pdf')}"\`);
                                    return res.send(Buffer.from(arrayBuffer));
                                }
                            }
                        } catch(err) { }
                    }
                }
            } catch(e) { console.warn('Proxy Assinafy erro:', e.message); }
        }

        // Fallback final: Devolve o arquivo original NÃO ASSINADO
        pathLocal = row.file_path;
        if (pathLocal && fs.existsSync(pathLocal)) {
            return res.download(pathLocal, row.file_name || 'documento.pdf');
        }

        return res.status(404).json({ error: 'Arquivo físico não encontrado no servidor.' });
    });
});`;
    js = js.replace(regexDocDown, newDocDown);

    fs.writeFileSync('backend/server.js', js, 'utf8');
}
rebuildLogic();
