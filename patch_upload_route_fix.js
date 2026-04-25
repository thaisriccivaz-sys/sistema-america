/**
 * patch_upload_route_fix.js
 * Corrige uploadContratoExterno:
 * - Rota errada: /colaboradores/:id/documentos → /documentos (que tem upload.single('file'))
 * - Campo errado: formData 'documento' → 'file'
 * - Adiciona colaborador_id ao formData (necessário para /api/documentos)
 */
const fs = require('fs');
const path = require('path');
const appPath = path.join(__dirname, 'frontend', 'app.js');
let app = fs.readFileSync(appPath, 'utf8');

const OLD = `    const formData = new FormData();\r\n    formData.append('arquivo', file);\r\n    formData.append('tab_name', 'CONTRATOS');\r\n    formData.append('document_type', docType);\r\n    \r\n    try {\r\n        Swal.fire({title: 'Anexando...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});\r\n        const res = await fetch(\`\${API_URL}/colaboradores/\${viewedColaborador.id}/documentos\`, {\r\n            method: 'POST', headers: {'Authorization': \`Bearer \${currentToken}\`}, body: formData\r\n        });`;

const NEW = `    const formData = new FormData();\r\n    formData.append('file', file);                                // campo esperado pelo /api/documentos\r\n    formData.append('tab_name', 'CONTRATOS');\r\n    formData.append('document_type', docType);\r\n    formData.append('colaborador_id', viewedColaborador.id);     // obrigatório\r\n    \r\n    try {\r\n        Swal.fire({title: 'Anexando...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});\r\n        const res = await fetch(\`\${API_URL}/documentos\`, {       // rota correta com multer 'file'\r\n            method: 'POST', headers: {'Authorization': \`Bearer \${currentToken}\`}, body: formData\r\n        });`;

if (app.includes(OLD)) {
    app = app.replace(OLD, NEW);
    console.log('✅ uploadContratoExterno: rota e campo corrigidos (CRLF)');
} else {
    const OLD_LF = OLD.replace(/\r\n/g, '\n');
    const NEW_LF = NEW.replace(/\r\n/g, '\n');
    if (app.includes(OLD_LF)) {
        app = app.replace(OLD_LF, NEW_LF);
        console.log('✅ uploadContratoExterno: rota e campo corrigidos (LF)');
    } else {
        // Patch parcial: só consertar o que for encontrado
        let patched = false;

        // 1) campo 'arquivo' → 'file'
        if (app.includes(`formData.append('arquivo', file);`)) {
            app = app.replace(`formData.append('arquivo', file);`, `formData.append('file', file); // campo esperado pelo /api/documentos`);
            console.log('✅ Campo arquivo → file');
            patched = true;
        } else if (app.includes(`formData.append('documento', file);`)) {
            app = app.replace(`formData.append('documento', file);`, `formData.append('file', file); // campo esperado pelo /api/documentos`);
            console.log('✅ Campo documento → file');
            patched = true;
        }

        // 2) rota errada
        if (app.includes(`\`\${API_URL}/colaboradores/\${viewedColaborador.id}/documentos\``)) {
            app = app.replace(
                `\`\${API_URL}/colaboradores/\${viewedColaborador.id}/documentos\``,
                `\`\${API_URL}/documentos\` // rota correta`
            );
            console.log('✅ Rota corrigida');
            patched = true;
        }

        // 3) adicionar colaborador_id se não estiver
        if (!app.includes(`formData.append('colaborador_id', viewedColaborador.id)`) && app.includes(`formData.append('tab_name', 'CONTRATOS');`)) {
            app = app.replace(
                `formData.append('tab_name', 'CONTRATOS');`,
                `formData.append('tab_name', 'CONTRATOS');\n    formData.append('colaborador_id', viewedColaborador.id);`
            );
            console.log('✅ colaborador_id adicionado');
            patched = true;
        }

        if (!patched) {
            console.error('❌ Nenhuma correção aplicada');
            process.exit(1);
        }
    }
}

fs.writeFileSync(appPath, app, 'utf8');
console.log('✅ frontend/app.js salvo');
