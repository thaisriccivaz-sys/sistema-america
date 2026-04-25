/**
 * patch_token_runtime.js
 * Dois problemas a corrigir:
 * 1. O token no botão olho era capturado no build-time → inválido no clique
 * 2. As linhas de _docToken e _viewUrl estavam no buildContratosSignatureRows mas o token
 *    deve ser avaliado no CLIQUE, não na renderização
 *
 * Solução:
 * - Substituir o eyeBtn para chamar openContratoViewerById(doc.id, nome)
 * - Adicionar a função openContratoViewerById que captura o token no momento do clique
 */
const fs = require('fs');
const f = require('path').join(__dirname, 'frontend', 'app.js');
let app = fs.readFileSync(f, 'utf8');

// ── 1. Substituir as 3 linhas do eyeBtn no buildContratosSignatureRows ─────
// Corrigir: remover as linhas de _docToken, _viewUrl, e mudar o eyeBtn
const OLD_EYE_BLOCK = `       // Usa /api/documentos/view/:id?token= (rota autenticada que serve o arquivo real)
       const _docToken = window.currentToken || localStorage.getItem('erp_token') || '';
       const _viewUrl = API_URL + '/documentos/view/' + doc.id + '?token=' + _docToken;
       const _docName = (doc.document_type || doc.file_name || 'Documento').replace(/'/g, "\\\\'");
       let eyeBtn = \`<button type="button" onclick="window.openContratoViewerPopup('\${_viewUrl}', '\${_docName}'); event.preventDefault(); event.stopPropagation();" style="border:none;background:none;cursor:pointer;color:#64748b;" title="Ver PDF"><i class="ph ph-eye" style="font-size:1.2rem;"></i></button>\`;`;

const NEW_EYE_BLOCK = `       // openContratoViewerById busca o token no CLIQUE (não no build-time)
       const _docName = (doc.document_type || doc.file_name || 'Documento').replace(/'/g, "\\\\'");
       let eyeBtn = \`<button type="button" onclick="window.openContratoViewerById(\${doc.id}, '\${_docName}'); event.preventDefault(); event.stopPropagation();" style="border:none;background:none;cursor:pointer;color:#64748b;" title="Ver PDF"><i class="ph ph-eye" style="font-size:1.2rem;"></i></button>\`;`;

if (app.includes(OLD_EYE_BLOCK)) {
    app = app.replace(OLD_EYE_BLOCK, NEW_EYE_BLOCK);
    console.log('✅ eyeBtn corrigido para usar openContratoViewerById');
} else {
    // Tentar variação com LF
    const OLD_LF = OLD_EYE_BLOCK.replace(/\r\n/g, '\n');
    const NEW_LF = NEW_EYE_BLOCK.replace(/\r\n/g, '\n');
    if (app.includes(OLD_LF)) {
        app = app.replace(OLD_LF, NEW_LF);
        console.log('✅ eyeBtn corrigido (LF)');
    } else {
        console.warn('⚠️ Bloco não encontrado, tentando linha por linha...');
        // Localizar e substituir somente a linha do eyeBtn
        const OLD_LINE = `       let eyeBtn = \`<button type="button" onclick="window.openContratoViewerPopup('\${_viewUrl}', '\${_docName}'); event.preventDefault(); event.stopPropagation();" style="border:none;background:none;cursor:pointer;color:#64748b;" title="Ver PDF"><i class="ph ph-eye" style="font-size:1.2rem;"></i></button>\`;`;
        const NEW_LINE = `       let eyeBtn = \`<button type="button" onclick="window.openContratoViewerById(\${doc.id}, '\${_docName}'); event.preventDefault(); event.stopPropagation();" style="border:none;background:none;cursor:pointer;color:#64748b;" title="Ver PDF"><i class="ph ph-eye" style="font-size:1.2rem;"></i></button>\`;`;
        if (app.includes(OLD_LINE)) {
            app = app.replace(OLD_LINE, NEW_LINE);
            console.log('✅ eyeBtn linha individual corrigida');
        } else {
            console.error('❌ Não conseguiu encontrar o bloco do eyeBtn');
        }
    }
}

// ── 2. Adicionar openContratoViewerById antes de buildContratosSignatureRows ─
const INSERT_BEFORE = 'window.buildContratosSignatureRows = function';
const idx = app.indexOf(INSERT_BEFORE);
if (idx === -1) { console.error('❌ buildContratosSignatureRows não encontrado'); process.exit(1); }

// Verificar se openContratoViewerById já existe
if (app.includes('window.openContratoViewerById')) {
    console.log('⚠️ openContratoViewerById já existe, pulando inserção');
} else {
    const NEW_FN = `// Versão segura: pega o token no momento do clique (não no build-time da lista)
window.openContratoViewerById = function(docId, nomeDoc) {
    var token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
    if (!token) { alert('Sessão expirada. Faça login novamente.'); return; }
    var pdfUrl = API_URL + '/documentos/view/' + docId + '?token=' + encodeURIComponent(token);
    window.openContratoViewerPopup(pdfUrl, nomeDoc);
};

`;
    app = app.slice(0, idx) + NEW_FN + app.slice(idx);
    console.log('✅ openContratoViewerById adicionada');
}

fs.writeFileSync(f, app, 'utf8');
console.log('✅ app.js salvo');
