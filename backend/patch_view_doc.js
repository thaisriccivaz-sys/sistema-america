const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

const regex = /let pathToFile = row\.signed_file_path \|\| row\.file_path;\s+if \(pathToFile && fs\.existsSync\(pathToFile\)\) \{[\s\S]*?return fs\.createReadStream\(pathToFile\)\.pipe\(res\);\s+\}\s+\/\/ Se local não existe, tenta Assinafy\s+if \(row\.assinafy_id\) \{/g;

const replacement = `let pathToFileLocal = row.signed_file_path; // Tentar assinado local primeiro

        if (pathToFileLocal && fs.existsSync(pathToFileLocal)) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', \`inline; filename="\${encodeURIComponent(row.file_name || 'documento.pdf')}"\`);
            return fs.createReadStream(pathToFileLocal).pipe(res);
        }

        // Se tem Assinafy, pega o link direto (que pode estar assinado lá)
        if (row.assinafy_id) {`;

js = js.replace(regex, replacement);

// Se não bateu no regex (talvez por acentos nas barras), fazer replace manual
if(js.includes('let pathToFile = row.signed_file_path || row.file_path;')) {
    js = js.replace('let pathToFile = row.signed_file_path || row.file_path;', replacement.split('if (row.assinafy_id)')[0]);
    js = js.replace(/\/\/ Se local n(?:\\u00e3|ã|Ã£)o existe, tenta Assinafy/g, '// Tenta Assinafy');
}

// Add fallback to local file after Assinafy try/catch
js = js.replace(/console\.warn\(\'\[VIEW-DOC\] Falha proxy Assinafy:\', e\.message\);\n\s+\}\n\s+\}\n\s+return res\.status\(404\)/g, 
`console.warn('[VIEW-DOC] Falha proxy Assinafy:', e.message);
            }
        }

        // Fallback final: arquivo original não assinado
        let pathUnsigned = row.file_path;
        if (pathUnsigned && fs.existsSync(pathUnsigned)) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', \`inline; filename="\${encodeURIComponent(row.file_name || 'documento.pdf')}"\`);
            return fs.createReadStream(pathUnsigned).pipe(res);
        }

        return res.status(404)`);

fs.writeFileSync('backend/server.js', js, 'utf8');
