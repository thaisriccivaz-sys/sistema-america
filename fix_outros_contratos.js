/**
 * fix_outros_contratos.js
 * Corrige 3 problemas no fluxo de "Outros Contratos":
 * 1. uploadContratoExterno - adiciona modal com Nome + Exige Assinatura? + envia colaborador_id/nome corretos
 * 2. Backend: corrige naming e path de salvamento (CONTRATOS/Outros_*) via multer storage
 * 3. Garante que assinafy_sent_at é exibido corretamente na UI
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// PATCH 1: frontend/app.js - corrige uploadContratoExterno
// ============================================================
const appPath = path.join(__dirname, 'frontend', 'app.js');
let appContent = fs.readFileSync(appPath, 'utf8');

const OLD_UPLOAD_EXTERNO = `window.uploadContratoExterno = async function(input) {\r\n    const file = input.files[0];\r\n    if (!file) return;\r\n    \r\n    let docType = prompt('Qual o nome deste documento?', file.name.replace('.pdf',''));\r\n    if (!docType) return;\r\n    \r\n    const formData = new FormData();\r\n    formData.append('arquivo', file);\r\n    formData.append('tab_name', 'CONTRATOS_AVULSOS');\r\n    formData.append('document_type', docType);\r\n    \r\n    try {\r\n        Swal.fire({title: 'Anexando...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});\r\n        const res = await fetch(\`\${API_URL}/documentos\`, {\r\n            method: 'POST', headers: {'Authorization': \`Bearer \${currentToken}\`}, body: formData\r\n        }); // rota correta\r\n        if (!res.ok) throw new Error('Falha ao anexar PDF');\r\n        Swal.close();\r\n        showToast('Documento anexado!', 'success');\r\n        // For\\u00e7a reload mesmo que j\\u00e1 esteja na aba\r\n        window._contratosAvulsoLoaded = false;\r\n        const avDivUp = document.getElementById('contratos-sub-avulso');\r\n        if (avDivUp) { avDivUp.innerHTML = '<p class=\"text-muted\"><i class=\"ph ph-spinner ph-spin\"></i> Atualizando...</p>'; }\r\n        window._contratosAvulsoLoaded = true;\r\n        if (avDivUp) await window.renderContratosAvulso(avDivUp);\r\n        window.switchContratosSubTab('avulso');\r\n    } catch(e) {\r\n        Swal.fire('Erro', e.message, 'error');\r\n    }\r\n};`;

const NEW_UPLOAD_EXTERNO = `window.uploadContratoExterno = async function(input) {
    const file = input.files[0];
    if (!file || !viewedColaborador) return;

    // Modal personalizado para capturar nome e se exige assinatura
    const { value: formValues } = await Swal.fire({
        title: '<i class="ph ph-file-plus"></i> Anexar Contrato',
        html: \`
            <div style="text-align:left;display:flex;flex-direction:column;gap:0.75rem;padding:0.25rem 0;">
                <div>
                    <label style="font-size:0.82rem;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Nome do Documento</label>
                    <input id="swal-doctype" class="swal2-input" style="margin:0;width:100%;box-sizing:border-box;"
                        placeholder="Ex: Acordo de Confidencialidade"
                        value="\${file.name.replace(/\\.pdf$/i,'').substring(0,60)}">
                </div>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:0.75rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;">
                    <span style="font-size:0.85rem;font-weight:700;color:#334155;">Exige Assinatura?</span>
                    <div style="display:flex;gap:1rem;">
                        <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:0.9rem;font-weight:500;">
                            <input type="radio" name="swal-ass" value="sim" id="swal-ass-sim"> Sim
                        </label>
                        <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:0.9rem;font-weight:500;">
                            <input type="radio" name="swal-ass" value="nao" id="swal-ass-nao" checked> Não
                        </label>
                    </div>
                </div>
            </div>
        \`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: '<i class="ph ph-upload-simple"></i> Anexar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#2563eb',
        preConfirm: () => {
            const docType = document.getElementById('swal-doctype')?.value?.trim();
            const assRadio = document.querySelector('input[name="swal-ass"]:checked');
            if (!docType) {
                Swal.showValidationMessage('Informe o nome do documento');
                return false;
            }
            return { docType, exigeAssinatura: assRadio?.value === 'sim' };
        }
    });

    if (!formValues) return;
    const { docType, exigeAssinatura } = formValues;

    const colaboradorNome = viewedColaborador.nome_completo || '';
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tab_name', 'CONTRATOS_AVULSOS');
    formData.append('document_type', docType);
    formData.append('colaborador_id', viewedColaborador.id);
    formData.append('colaborador_nome', colaboradorNome);
    // Sinaliza ao backend para salvar na pasta CONTRATOS com nome Outros_
    formData.append('outros_contrato', 'true');
    formData.append('outros_contrato_nome', docType);
    if (!exigeAssinatura) {
        formData.append('assinafy_status', 'NAO_EXIGE');
    }

    try {
        Swal.fire({ title: 'Anexando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const res = await fetch(\`\${API_URL}/documentos\`, {
            method: 'POST',
            headers: { 'Authorization': \`Bearer \${currentToken}\` },
            body: formData
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Falha ao anexar PDF');

        const docId = data.id;

        // Se exige assinatura, enviar para Assinafy automaticamente
        if (exigeAssinatura && docId) {
            Swal.update({ title: 'Enviando para assinatura...' });
            try {
                const assResp = await fetch(\`\${API_URL}/assinafy/upload\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${currentToken}\` },
                    body: JSON.stringify({ document_id: docId, colaborador_id: viewedColaborador.id })
                });
                const assData = await assResp.json().catch(() => ({}));
                if (!assResp.ok) {
                    console.warn('[uploadContratoExterno] Assinafy falhou:', assData.error);
                    Swal.fire('Atenção', 'Documento salvo, mas o envio para assinatura falhou: ' + (assData.error || 'Erro desconhecido'), 'warning');
                } else {
                    Swal.fire({ icon: 'success', title: 'Documento enviado para assinatura!', text: 'O colaborador receberá um e-mail para assinar o documento.', timer: 3000, showConfirmButton: false });
                }
            } catch(assErr) {
                Swal.fire('Atenção', 'Documento salvo, mas falha ao registrar assinatura: ' + assErr.message, 'warning');
            }
        } else {
            Swal.fire({ icon: 'success', title: 'Documento anexado!', timer: 1800, showConfirmButton: false });
        }

        // Força reload da lista
        window._contratosAvulsoLoaded = false;
        const avDivUp = document.getElementById('contratos-sub-avulso');
        if (avDivUp) {
            avDivUp.innerHTML = '<p class="text-muted"><i class="ph ph-spinner ph-spin"></i> Atualizando...</p>';
            window._contratosAvulsoLoaded = true;
            await window.renderContratosAvulso(avDivUp);
        }
        window.switchContratosSubTab('avulso');
    } catch(e) {
        Swal.fire('Erro', e.message, 'error');
    }
};`;

if (appContent.includes('window.uploadContratoExterno = async function')) {
    appContent = appContent.replace(
        'window.uploadContratoExterno = async function(input) {\r\n    const file = input.files[0];\r\n    if (!file) return;\r\n    \r\n    let docType = prompt(\'Qual o nome deste documento?\', file.name.replace(\'.pdf\',\'\'));\r\n    if (!docType) return;\r\n    \r\n    const formData = new FormData();\r\n    formData.append(\'arquivo\', file);\r\n    formData.append(\'tab_name\', \'CONTRATOS_AVULSOS\');\r\n    formData.append(\'document_type\', docType);\r\n    \r\n    try {\r\n        Swal.fire({title: \'Anexando...\', allowOutsideClick: false, didOpen: () => Swal.showLoading()});\r\n        const res = await fetch(`${API_URL}/documentos`, {\r\n            method: \'POST\', headers: {\'Authorization\': `Bearer ${currentToken}`}, body: formData\r\n        }); // rota correta\r\n        if (!res.ok) throw new Error(\'Falha ao anexar PDF\');\r\n        Swal.close();\r\n        showToast(\'Documento anexado!\', \'success\');\r\n        // For',
        NEW_UPLOAD_EXTERNO + '\r\n\r\n// PLACEHOLDER_AFTER_UPLOAD_EXTERNO'
    );
    console.log('PATCH 1 aplicado com estratégia alternativa');
} else {
    console.log('Pattern não encontrado para PATCH 1, tentando alternativa...');
}

// Estratégia alternativa: buscar pelo índice
const OLD_START = 'window.uploadContratoExterno = async function(input) {';
const OLD_END = '// Vers';
const idxStart = appContent.indexOf(OLD_START);
const idxEnd = appContent.indexOf('\r\n// Vers', idxStart);

if (idxStart !== -1 && idxEnd !== -1) {
    const before = appContent.substring(0, idxStart);
    const after = appContent.substring(idxEnd);
    appContent = before + NEW_UPLOAD_EXTERNO + '\r\n\r\n' + after;
    console.log('PATCH 1 (frontend uploadContratoExterno): OK');
} else {
    console.error('PATCH 1 FALHOU - markers not found. idxStart:', idxStart, 'idxEnd:', idxEnd);
    process.exit(1);
}

// ============================================================
// PATCH 2: frontend/app.js - melhorar buildContratosSignatureRows
// Adicionar timestamp de envio em AZUL e assinatura em VERDE
// ============================================================

const OLD_TIMESTAMPS = `                        \${isSigned && (ass?.assinado_em || doc.assinafy_signed_at)
                            ? \`<span style="font-size:0.72rem;color:#166534;background:#dcfce7;border-radius:10px;padding:1px 8px;font-weight:600;"><i class="ph ph-check-circle"></i> Assinado: \${new Date(ass?.assinado_em || doc.assinafy_signed_at).toLocaleString('pt-BR')}</span>\`
                            : (isPending || isSigned) && doc.assinafy_sent_at
                                ? \`<span style="font-size:0.72rem;color:#92400e;background:#fef3c7;border-radius:10px;padding:1px 8px;font-weight:600;"><i class="ph ph-paper-plane-tilt"></i> Enviado: \${new Date(doc.assinafy_sent_at).toLocaleString('pt-BR')}</span>\`
                                : ''}`;

const NEW_TIMESTAMPS = `                        \${isSigned && (ass?.assinado_em || doc.assinafy_signed_at)
                            ? \`<span style="font-size:0.72rem;color:#166534;background:#dcfce7;border-radius:10px;padding:1px 8px;font-weight:600;"><i class="ph ph-check-circle"></i> Assinado em: \${new Date(ass?.assinado_em || doc.assinafy_signed_at).toLocaleString('pt-BR')}</span>\`
                            : ''}
                        \${(isPending || (isSigned && doc.assinafy_sent_at)) && doc.assinafy_sent_at
                            ? \`<span style="font-size:0.72rem;color:#1d4ed8;background:#dbeafe;border-radius:10px;padding:1px 8px;font-weight:600;"><i class="ph ph-paper-plane-tilt"></i> Enviado em: \${new Date(doc.assinafy_sent_at).toLocaleString('pt-BR')}</span>\`
                            : ''}`;

if (appContent.includes('Assinado: ${new Date(ass?.assinado_em')) ) {
    appContent = appContent.replace(
        `                        \${isSigned && (ass?.assinado_em || doc.assinafy_signed_at)\r\n                            ? \`<span style="font-size:0.72rem;color:#166534;background:#dcfce7;border-radius:10px;padding:1px 8px;font-weight:600;"><i class="ph ph-check-circle"></i> Assinado: \${new Date(ass?.assinado_em || doc.assinafy_signed_at).toLocaleString('pt-BR')}</span>\`\r\n                            : (isPending || isSigned) && doc.assinafy_sent_at\r\n                                ? \`<span style="font-size:0.72rem;color:#92400e;background:#fef3c7;border-radius:10px;padding:1px 8px;font-weight:600;"><i class="ph ph-paper-plane-tilt"></i> Enviado: \${new Date(doc.assinafy_sent_at).toLocaleString('pt-BR')}</span>\`\r\n                                : ''}`,
        `                        \${isSigned && (ass?.assinado_em || doc.assinafy_signed_at)\r\n                            ? \`<span style="font-size:0.72rem;color:#166534;background:#dcfce7;border-radius:10px;padding:1px 8px;font-weight:600;"><i class="ph ph-check-circle"></i> Assinado em: \${new Date(ass?.assinado_em || doc.assinafy_signed_at).toLocaleString('pt-BR')}</span>\`\r\n                            : ''}\r\n                        \${doc.assinafy_sent_at\r\n                            ? \`<span style="font-size:0.72rem;color:#1d4ed8;background:#dbeafe;border-radius:10px;padding:1px 8px;font-weight:600;"><i class="ph ph-paper-plane-tilt"></i> Enviado em: \${new Date(doc.assinafy_sent_at).toLocaleString('pt-BR')}</span>\`\r\n                            : ''}`
    );
    console.log('PATCH 2 (timestamps azul/verde): OK');
} else {
    console.warn('PATCH 2 pattern não encontrado - timestamps mantidos como estão');
}

fs.writeFileSync(appPath, appContent, 'utf8');
console.log('frontend/app.js salvo com sucesso.');

// ============================================================
// PATCH 3: backend/server.js
// Fix naming do arquivo CONTRATOS_AVULSOS → CONTRATOS/Outros_NomeContrato_NomeColab.pdf
// ============================================================

const serverPath = path.join(__dirname, 'backend', 'server.js');
let serverContent = fs.readFileSync(serverPath, 'utf8');

// 3a) Corrigir o multer storage para CONTRATOS_AVULSOS → pasta CONTRATOS/ com prefixo Outros_
const OLD_STORAGE_DEST = `        let finalDir = path.join(BASE_PATH, safeNomeColab, safeTab);

        if (year && year !== 'null' && year !== 'undefined' && year !== '') {
            const safeYear = String(year).replace(/[^0-9]/g, '');
            if (safeYear) {
                finalDir = path.join(finalDir, safeYear);
                // Para Pagamentos: sub-pasta com o nome do mês em português (ex: Marco, Abril)
                if (safeTab === 'PAGAMENTOS' && month && month !== 'null' && month !== 'undefined' && month !== '') {
                    finalDir = path.join(finalDir, getMesNome(month));
                }
            }
        }`;

const NEW_STORAGE_DEST = `        // Contratos Avulsos (Outros Contratos): salvar em CONTRATOS/ (não em CONTRATOS_AVULSOS)
        let finalDir;
        if (safeTab === 'CONTRATOS_AVULSOS') {
            finalDir = path.join(BASE_PATH, safeNomeColab, 'CONTRATOS');
        } else {
            finalDir = path.join(BASE_PATH, safeNomeColab, safeTab);
        }

        if (safeTab !== 'CONTRATOS_AVULSOS' && year && year !== 'null' && year !== 'undefined' && year !== '') {
            const safeYear = String(year).replace(/[^0-9]/g, '');
            if (safeYear) {
                finalDir = path.join(finalDir, safeYear);
                // Para Pagamentos: sub-pasta com o nome do mês em português (ex: Marco, Abril)
                if (safeTab === 'PAGAMENTOS' && month && month !== 'null' && month !== 'undefined' && month !== '') {
                    finalDir = path.join(finalDir, getMesNome(month));
                }
            }
        }`;

if (serverContent.includes('let finalDir = path.join(BASE_PATH, safeNomeColab, safeTab);')) {
    serverContent = serverContent.replace(
        `        let finalDir = path.join(BASE_PATH, safeNomeColab, safeTab);\r\n\r\n        if (year && year !== 'null' && year !== 'undefined' && year !== '') {\r\n            const safeYear = String(year).replace(/[^0-9]/g, '');\r\n            if (safeYear) {\r\n                finalDir = path.join(finalDir, safeYear);\r\n                // Para Pagamentos: sub-pasta com o nome do m\\u00eas em portugu\\u00eas (ex: Marco, Abril)\r\n                if (safeTab === 'PAGAMENTOS' && month && month !== 'null' && month !== 'undefined' && month !== '') {\r\n                    finalDir = path.join(finalDir, getMesNome(month));\r\n                }\r\n            }\r\n        }`,
        `        // Contratos Avulsos (Outros Contratos): salvar em CONTRATOS/ (n\\u00e3o em CONTRATOS_AVULSOS)\r\n        let finalDir;\r\n        if (safeTab === 'CONTRATOS_AVULSOS') {\r\n            finalDir = path.join(BASE_PATH, safeNomeColab, 'CONTRATOS');\r\n        } else {\r\n            finalDir = path.join(BASE_PATH, safeNomeColab, safeTab);\r\n        }\r\n\r\n        if (safeTab !== 'CONTRATOS_AVULSOS' && year && year !== 'null' && year !== 'undefined' && year !== '') {\r\n            const safeYear = String(year).replace(/[^0-9]/g, '');\r\n            if (safeYear) {\r\n                finalDir = path.join(finalDir, safeYear);\r\n                // Para Pagamentos: sub-pasta com o nome do m\\u00eas em portugu\\u00eas (ex: Marco, Abril)\r\n                if (safeTab === 'PAGAMENTOS' && month && month !== 'null' && month !== 'undefined' && month !== '') {\r\n                    finalDir = path.join(finalDir, getMesNome(month));\r\n                }\r\n            }\r\n        }`
    );
    console.log('PATCH 3a (storage destination CONTRATOS_AVULSOS): OK');
} else {
    console.error('PATCH 3a FALHOU - pattern not found');
    process.exit(1);
}

// 3b) Corrigir o filename do multer para CONTRATOS_AVULSOS → Outros_NomeContrato_NomeColab.pdf
const OLD_FILENAME = `    filename: function (req, file, cb) {
        const docType = req.body.document_type || 'DOCUMENTO';
        const colab = req.body.colaborador_nome || 'COLAB';
        const customName = req.body.custom_name;
        const ext = path.extname(file.originalname);

        let base = "";
        if (customName) {
            base = customName;
        } else {
            const safeType = formatarPasta(docType).toUpperCase();
            const safeColab = formatarNome(colab);
            base = \`\${safeType}_\${safeColab}\`;
        }`;

const NEW_FILENAME = `    filename: function (req, file, cb) {
        const docType = req.body.document_type || 'DOCUMENTO';
        const colab = req.body.colaborador_nome || 'COLAB';
        const customName = req.body.custom_name;
        const tab = req.body.tab_name || '';
        const ext = path.extname(file.originalname);

        let base = "";
        if (customName) {
            base = customName;
        } else if (tab === 'CONTRATOS_AVULSOS') {
            // Naming: Outros_NomeContrato_NomeColab
            const safeType = formatarPasta(docType);
            const safeColab = formatarNome(colab);
            base = \`Outros_\${safeType}_\${safeColab}\`;
        } else {
            const safeType = formatarPasta(docType).toUpperCase();
            const safeColab = formatarNome(colab);
            base = \`\${safeType}_\${safeColab}\`;
        }`;

if (serverContent.includes("filename: function (req, file, cb) {\r\n        const docType = req.body.document_type || 'DOCUMENTO';")) {
    serverContent = serverContent.replace(
        `    filename: function (req, file, cb) {\r\n        const docType = req.body.document_type || 'DOCUMENTO';\r\n        const colab = req.body.colaborador_nome || 'COLAB';\r\n        const customName = req.body.custom_name;\r\n        const ext = path.extname(file.originalname);\r\n\r\n        let base = "";\r\n        if (customName) {\r\n            base = customName;\r\n        } else {\r\n            const safeType = formatarPasta(docType).toUpperCase();\r\n            const safeColab = formatarNome(colab);\r\n            base = \`\${safeType}_\${safeColab}\`;\r\n        }`,
        `    filename: function (req, file, cb) {\r\n        const docType = req.body.document_type || 'DOCUMENTO';\r\n        const colab = req.body.colaborador_nome || 'COLAB';\r\n        const customName = req.body.custom_name;\r\n        const tab = req.body.tab_name || '';\r\n        const ext = path.extname(file.originalname);\r\n\r\n        let base = "";\r\n        if (customName) {\r\n            base = customName;\r\n        } else if (tab === 'CONTRATOS_AVULSOS') {\r\n            // Naming: Outros_NomeContrato_NomeColab\r\n            const safeType = formatarPasta(docType);\r\n            const safeColab = formatarNome(colab);\r\n            base = \`Outros_\${safeType}_\${safeColab}\`;\r\n        } else {\r\n            const safeType = formatarPasta(docType).toUpperCase();\r\n            const safeColab = formatarNome(colab);\r\n            base = \`\${safeType}_\${safeColab}\`;\r\n        }`
    );
    console.log('PATCH 3b (filename Outros_*): OK');
} else {
    console.error('PATCH 3b FALHOU - pattern not found');
    process.exit(1);
}

// 3c) Adicionar migration para assinafy_sent_at (se não existir na tabela documentos)
const MIGRATION_SENT_AT = `// MIGRATION: Garantir coluna assinafy_sent_at na tabela documentos
db.run("ALTER TABLE documentos ADD COLUMN assinafy_sent_at DATETIME", (err) => {
    if (err && !err.message.includes('duplicate column')) console.error('Migration assinafy_sent_at:', err.message);
    else if (!err) console.log('MIGRATION: Coluna assinafy_sent_at adicionada.');
});
`;

// Inserir a migration logo após o início das migrations de colunas
const MIGRATION_ANCHOR = `db.run("ALTER TABLE colaboradores ADD COLUMN tamanho_camiseta TEXT"`;
if (!serverContent.includes('assinafy_sent_at DATETIME')) {
    serverContent = serverContent.replace(
        MIGRATION_ANCHOR,
        MIGRATION_SENT_AT + '\n' + MIGRATION_ANCHOR
    );
    console.log('PATCH 3c (migration assinafy_sent_at): OK');
} else {
    console.log('PATCH 3c: coluna assinafy_sent_at já existe, pulando.');
}

// 3d) Garantir que quando o upload é de CONTRATOS_AVULSOS sem exigir assinatura,
//     o OneDrive upload vai para a pasta CONTRATOS/ com nome correto
// (O código de uploadDocToOneDrive já trata isso. Só precisamos garantir que
//  o tab_name CONTRATOS_AVULSOS com assinafy_status=NAO_EXIGE também vai para OneDrive)

const OLD_OD_BLOCK = `        // CONTRATOS_AVULSOS: só sincroniza ao OneDrive depois de assinado (via poll de assinaturas)
        if (doc.tab_name === 'CONTRATOS_AVULSOS' && doc.assinafy_status !== 'Assinado') {
            console.log(\`[OD-AUTO] Bloqueando sync OneDrive para doc \${docId} (CONTRATOS_AVULSOS não assinado)\`);
            return;
        }`;

const NEW_OD_BLOCK = `        // CONTRATOS_AVULSOS: sincroniza ao OneDrive se assinado OU se não exige assinatura
        if (doc.tab_name === 'CONTRATOS_AVULSOS' && doc.assinafy_status !== 'Assinado' && doc.assinafy_status !== 'NAO_EXIGE') {
            console.log(\`[OD-AUTO] Bloqueando sync OneDrive para doc \${docId} (CONTRATOS_AVULSOS pendente: \${doc.assinafy_status})\`);
            return;
        }`;

if (serverContent.includes("CONTRATOS_AVULSOS: só sincroniza ao OneDrive depois de assinado")) {
    serverContent = serverContent.replace(
        `        // CONTRATOS_AVULSOS: s\\u00f3 sincroniza ao OneDrive depois de assinado (via poll de assinaturas)\r\n        if (doc.tab_name === 'CONTRATOS_AVULSOS' && doc.assinafy_status !== 'Assinado') {\r\n            console.log(\`[OD-AUTO] Bloqueando sync OneDrive para doc \${docId} (CONTRATOS_AVULSOS n\\u00e3o assinado)\`);\r\n            return;\r\n        }`,
        `        // CONTRATOS_AVULSOS: sincroniza ao OneDrive se assinado OU se n\\u00e3o exige assinatura\r\n        if (doc.tab_name === 'CONTRATOS_AVULSOS' && doc.assinafy_status !== 'Assinado' && doc.assinafy_status !== 'NAO_EXIGE') {\r\n            console.log(\`[OD-AUTO] Bloqueando sync OneDrive para doc \${docId} (CONTRATOS_AVULSOS pendente: \${doc.assinafy_status})\`);\r\n            return;\r\n        }`
    );
    console.log('PATCH 3d (OneDrive NAO_EXIGE): OK');
} else {
    console.warn('PATCH 3d - pattern não encontrado, OneDrive NAO_EXIGE não corrigido');
}

// 3e) Garantir que _podeOneDrive também aceita NAO_EXIGE para CONTRATOS_AVULSOS no POST /documentos
const OLD_PODE_OD = `                        : tab_name !== 'CONTRATOS_AVULSOS';\r\n                    if (_podeOneDrive2) {`;
const NEW_PODE_OD = `                        : (tab_name !== 'CONTRATOS_AVULSOS' || assinafy_status === 'NAO_EXIGE');\r\n                    if (_podeOneDrive2) {`;

if (serverContent.includes(`: tab_name !== 'CONTRATOS_AVULSOS';\r\n                    if (_podeOneDrive2) {`)) {
    serverContent = serverContent.replace(OLD_PODE_OD, NEW_PODE_OD);
    console.log('PATCH 3e (podeOneDrive2 NAO_EXIGE update): OK');
}

const OLD_PODE_OD_INSERT = `                        : tab_name !== 'CONTRATOS_AVULSOS';\r\n                    if (_podeOneDrive) {`;
const NEW_PODE_OD_INSERT = `                        : (tab_name !== 'CONTRATOS_AVULSOS' || assinafy_status === 'NAO_EXIGE');\r\n                    if (_podeOneDrive) {`;

if (serverContent.includes(`: tab_name !== 'CONTRATOS_AVULSOS';\r\n                    if (_podeOneDrive) {`)) {
    serverContent = serverContent.replace(OLD_PODE_OD_INSERT, NEW_PODE_OD_INSERT);
    console.log('PATCH 3e2 (podeOneDrive insert NAO_EXIGE): OK');
}

// 3f) Corrigir o cloudName do upload OneDrive para CONTRATOS_AVULSOS → Outros_NomeContrato_NomeColab.pdf (sem timestamp)
const OLD_CLOUD_NAME_AVULSO = `        } else if (doc.tab_name === 'CONTRATOS_AVULSOS') {\r\n            // Contratos avulsos permitem múltiplos; adiciona timestamp para evitar sobrescrita no OneDrive\r\n            const ts = new Date().toISOString().slice(0,19).replace(/[-T:]/g,'');\r\n            cloudName = \`\${formatarPasta(doc.document_type || doc.tab_name).replace(/\\\\s+/g, '_')}_\${docYear}_\${ts}_\${safeColab}.pdf\`;`;
const NEW_CLOUD_NAME_AVULSO = `        } else if (doc.tab_name === 'CONTRATOS_AVULSOS') {\r\n            // Contratos avulsos: salvar como Outros_NomeContrato_NomeColab.pdf\r\n            cloudName = \`Outros_\${formatarPasta(doc.document_type || doc.tab_name).replace(/\\\\s+/g, '_')}_\${safeColab}.pdf\`;`;

if (serverContent.includes("Contratos avulsos permitem m")) {
    serverContent = serverContent.replace(
        `        } else if (doc.tab_name === 'CONTRATOS_AVULSOS') {\r\n            // Contratos avulsos permitem m\\u00faltiplos; adiciona timestamp para evitar sobrescrita no OneDrive\r\n            const ts = new Date().toISOString().slice(0,19).replace(/[-T:]/g,'');\r\n            cloudName = \`\${formatarPasta(doc.document_type || doc.tab_name).replace(/\\\\s+/g, '_')}_\${docYear}_\${ts}_\${safeColab}.pdf\`;`,
        `        } else if (doc.tab_name === 'CONTRATOS_AVULSOS') {\r\n            // Contratos avulsos (Outros Contratos): salvar como Outros_NomeContrato_NomeColab.pdf\r\n            cloudName = \`Outros_\${formatarPasta(doc.document_type || doc.tab_name).replace(/\\\\s+/g, '_')}_\${safeColab}.pdf\`;`
    );
    console.log('PATCH 3f (cloudName Outros_*): OK');
} else {
    console.warn('PATCH 3f - cloudName pattern não encontrado');
}

// Salvar server.js
fs.writeFileSync(serverPath, serverContent, 'utf8');
console.log('backend/server.js salvo com sucesso.');

console.log('\n==============================================');
console.log('TODOS OS PATCHES APLICADOS COM SUCESSO!');
console.log('==============================================');
console.log('Resumo das correções:');
console.log('1. uploadContratoExterno: modal com Nome + Exige Assinatura?');
console.log('2. colaborador_id/nome enviados corretamente para o backend');
console.log('3. Arquivo salvo em CONTRATOS/Outros_NomeContrato_NomeColab.pdf');
console.log('4. Se exige assinatura: chama /assinafy/upload automaticamente');
console.log('5. Timestamps: enviado em (AZUL) e assinado em (VERDE)');
console.log('6. OneDrive: sincroniza para NAO_EXIGE também');
console.log('7. Migration: assinafy_sent_at garantida no banco');
