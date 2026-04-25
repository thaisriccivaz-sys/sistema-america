/**
 * patch_upload_field.js
 * Corrige o campo do formData no uploadContratoExterno:
 * - Backend /api/colaboradores/:id/documentos usa multer.single('arquivo') ou 'file'
 * - Verificar qual rota é usada e corrigir o nome do campo
 */
const fs = require('fs');
const path = require('path');
const appPath = path.join(__dirname, 'frontend', 'app.js');
let app = fs.readFileSync(appPath, 'utf8');

// O uploadContratoExterno usa /api/colaboradores/:id/documentos
// Mas o backend tem /api/documentos (upload.single('file'))
// Vamos verificar o endpoint e corrigir o campo

// A rota /api/colaboradores/:id/documentos provavelmente usa upload.single('arquivo')
// o campo 'documento' provavelmente está errado - usar 'arquivo' ou 'file'

// Corrigir o campo de 'documento' para 'arquivo' no uploadContratoExterno
const OLD_FIELD = `    formData.append('documento', file);\r\n    formData.append('tab_name', 'CONTRATOS');`;
const NEW_FIELD = `    formData.append('arquivo', file);\r\n    formData.append('tab_name', 'CONTRATOS');`;

if (app.includes(OLD_FIELD)) {
    app = app.replace(OLD_FIELD, NEW_FIELD);
    console.log('✅ Campo formData corrigido: documento → arquivo');
} else {
    const OLD_LF = OLD_FIELD.replace(/\r\n/g, '\n');
    const NEW_LF = NEW_FIELD.replace(/\r\n/g, '\n');
    if (app.includes(OLD_LF)) {
        app = app.replace(OLD_LF, NEW_LF);
        console.log('✅ Campo formData corrigido (LF)');
    } else {
        console.warn('⚠️  Campo já corrigido ou não encontrado');
    }
}

fs.writeFileSync(appPath, app, 'utf8');
console.log('✅ app.js salvo');
