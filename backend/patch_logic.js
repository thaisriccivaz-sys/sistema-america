const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

const regexView = /let pathToFile = row\.signed_file_path \|\| row\.file_path;\s*if \(pathToFile && fs\.existsSync\(pathToFile\)\) \{\s*res\.setHeader\('Content-Type', 'application\/pdf'\);\s*res\.setHeader\('Content-Disposition', `inline; filename="\$\{encodeURIComponent\(row\.file_name \|\| 'documento\.pdf'\)\}"`\);\s*return fs\.createReadStream\(pathToFile\)\.pipe\(res\);\s*\}/g;

const replacementView = `let pathLocal = row.signed_file_path; // Prioriza o assinado local (.pfx)
        
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

        // Fallback final: Devolve o arquivo original NÃO ASSINADO (já que todas as opções assinadas falharam)
        pathLocal = row.file_path;
        if (pathLocal && fs.existsSync(pathLocal)) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', \`inline; filename="\${encodeURIComponent(row.file_name || 'documento.pdf')}"\`);
            return fs.createReadStream(pathLocal).pipe(res);
        }`;

// Since the whole block has been duplicated in my script logically, I need to completely strip the old Assinafy block if I put it all above
// Let's do a more robust surgical replace for view/:id and download/:id
