/**
 * patch_contratos_fixes.js
 * Corrige 4 problemas na aba Contratos:
 * 1. Renomeia aba interna "Contratos" → "Outros Contratos"
 * 2. Auto-refresh após salvar/excluir: recarrega a lista sem sair da tela
 * 3. Botão olho: corrige URL `undefined` → usa openDocViewerPopup com popup fullscreen
 * 4. Popup 100% tela cheia para visualizar documento
 */
const fs = require('fs');
const path = require('path');
const appPath = path.join(__dirname, 'frontend', 'app.js');
let app = fs.readFileSync(appPath, 'utf8');
let changed = 0;

function patch(desc, oldStr, newStr) {
    if (app.includes(oldStr)) {
        app = app.replace(oldStr, newStr);
        console.log(`✅ ${desc}`);
        changed++;
    } else {
        console.warn(`⚠️  NÃO ENCONTRADO: ${desc}`);
    }
}

// ── 1. Renomear aba interna "Contratos" → "Outros Contratos" ────────────────
patch(
    'Renomear aba Contratos → Outros Contratos',
    `                <i class="ph ph-file-plus"></i> Contratos\r\n            </button>`,
    `                <i class="ph ph-file-plus"></i> Outros Contratos\r\n            </button>`
);
// Fallback CRLF alternativo
patch(
    'Renomear aba Contratos → Outros Contratos (LF)',
    `                <i class="ph ph-file-plus"></i> Contratos\n            </button>`,
    `                <i class="ph ph-file-plus"></i> Outros Contratos\n            </button>`
);

// ── 2. Auto-refresh: deleteDocumentoContrato deve recarregar a lista ─────────
// Problema: switchContratosSubTab('avulso') não recarrega se já estava na aba avulso
// Solução: forçar reload explícito da função renderContratosAvulso
patch(
    'deleteDocumentoContrato: forçar reload da lista após exclusão',
    `window.deleteDocumentoContrato = async function(docId) {\r\n    if (!confirm('Deseja excluir este documento?')) return;\r\n    try {\r\n        const res = await fetch(\`\${API_URL}/documentos/\${docId}\`,{ method:'DELETE', headers:{'Authorization':\`Bearer \${currentToken}\`}});\r\n        if(!res.ok) throw new Error('Falha ao excluir');\r\n        window.switchContratosSubTab('avulso');\r\n    } catch(e) { alert(e.message); }\r\n};`,
    `window.deleteDocumentoContrato = async function(docId) {\r\n    if (!confirm('Deseja excluir este documento?')) return;\r\n    try {\r\n        const res = await fetch(\`\${API_URL}/documentos/\${docId}\`,{ method:'DELETE', headers:{'Authorization':\`Bearer \${currentToken}\`}});\r\n        if(!res.ok) throw new Error('Falha ao excluir');\r\n        // Força reload mesmo que já esteja na aba avulso\r\n        window._contratosAvulsoLoaded = false;\r\n        const avDiv = document.getElementById('contratos-sub-avulso');\r\n        if (avDiv) { avDiv.innerHTML = '<p class=\"text-muted\"><i class=\"ph ph-spinner ph-spin\"></i> Atualizando...</p>'; }\r\n        window._contratosAvulsoLoaded = true;\r\n        if (avDiv) await window.renderContratosAvulso(avDiv);\r\n        window.switchContratosSubTab('avulso');\r\n        showToast('Documento excluído!', 'success');\r\n    } catch(e) { alert(e.message); }\r\n};`
);

// ── 3. uploadContratoExterno: reload após salvar ─────────────────────────────
patch(
    'uploadContratoExterno: forçar reload após salvar',
    `        Swal.close();\r\n        showToast('Documento anexado!', 'success');\r\n        window.switchContratosSubTab('avulso');`,
    `        Swal.close();\r\n        showToast('Documento anexado!', 'success');\r\n        // Força reload mesmo que já esteja na aba\r\n        window._contratosAvulsoLoaded = false;\r\n        const avDivUp = document.getElementById('contratos-sub-avulso');\r\n        if (avDivUp) { avDivUp.innerHTML = '<p class=\"text-muted\"><i class=\"ph ph-spinner ph-spin\"></i> Atualizando...</p>'; }\r\n        window._contratosAvulsoLoaded = true;\r\n        if (avDivUp) await window.renderContratosAvulso(avDivUp);\r\n        window.switchContratosSubTab('avulso');`
);

// ── 4. Corrigir botão olho: URL undefined → popup fullscreen ─────────────────
// A linha atual produz "sistema-america.onrender.comundefined" se file_url for undefined
// Substituir por uma função de visualização com popup 100% tela
const OLD_EYE_BTN = `       let eyeBtn = \`<button type="button" onclick="window.open('\${API_URL.replace('/api','') + doc.file_url}', '_blank'); event.preventDefault(); event.stopPropagation();" style="border:none;background:none;cursor:pointer;color:#64748b;" title="Ver PDF Original"><i class="ph ph-eye" style="font-size:1.2rem;"></i></button>\`;`;

const NEW_EYE_BTN = `       // URL segura: garante que file_url não é undefined e usa popup fullscreen
       const _rawUrl = doc.file_url || '';
       const _docUrl = _rawUrl.startsWith('http') ? _rawUrl : (API_URL.replace('/api','') + _rawUrl);
       const _docName = (doc.document_type || doc.file_name || 'Documento').replace(/'/g, "\\\\'");
       let eyeBtn = \`<button type="button" onclick="window.openContratoViewerPopup('\${_docUrl}', '\${_docName}'); event.preventDefault(); event.stopPropagation();" style="border:none;background:none;cursor:pointer;color:#64748b;" title="Ver PDF"><i class="ph ph-eye" style="font-size:1.2rem;"></i></button>\`;`;

patch('Corrigir botão olho: URL undefined → popup fullscreen', OLD_EYE_BTN, NEW_EYE_BTN);

// ── 5. Adicionar função openContratoViewerPopup após renderContratosAvulso ───
const INSERT_AFTER = `window.buildContratosSignatureRows = function(assinaturas, docs, colab) {`;
const NEW_POPUP_FN = `// ── Popup fullscreen 100% para visualizar PDFs de contratos ──────────────
window.openContratoViewerPopup = function(pdfUrl, nomeDoc) {
    if (!pdfUrl || pdfUrl.endsWith('undefined') || pdfUrl.endsWith('/')) {
        alert('URL do documento não encontrada. O arquivo pode não ter sido enviado ao servidor.');
        return;
    }
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    // Adiciona token se a URL é da API interna
    const finalUrl = pdfUrl.includes(window.location.hostname) || pdfUrl.includes('onrender.com')
        ? (pdfUrl.includes('?') ? pdfUrl + '&token=' + token : pdfUrl + '?token=' + token)
        : pdfUrl;

    let overlay = document.getElementById('contrato-viewer-overlay');
    if (overlay) overlay.remove();
    overlay = document.createElement('div');
    overlay.id = 'contrato-viewer-overlay';
    // Popup FULLSCREEN 100%
    overlay.style.cssText = 'position:fixed;inset:0;background:#0f172a;z-index:99999;display:flex;flex-direction:column;';
    document.body.appendChild(overlay);

    overlay.innerHTML = \`
        <div style="background:#1e293b;display:flex;align-items:center;justify-content:space-between;padding:0.75rem 1.25rem;flex-shrink:0;border-bottom:1px solid #334155;">
            <div style="display:flex;align-items:center;gap:0.75rem;">
                <i class="ph ph-file-pdf" style="color:#ef4444;font-size:1.5rem;"></i>
                <div>
                    <div style="font-weight:700;color:#f1f5f9;font-size:0.95rem;">\${nomeDoc}</div>
                    <div style="font-size:0.72rem;color:#94a3b8;">Visualizador de Documento</div>
                </div>
            </div>
            <div style="display:flex;gap:0.5rem;">
                <a href="\${finalUrl}" download="\${nomeDoc}.pdf" target="_blank"
                   style="display:inline-flex;align-items:center;gap:0.4rem;background:#22c55e;color:#fff;padding:0.5rem 1.1rem;border-radius:8px;font-weight:600;font-size:0.85rem;text-decoration:none;">
                    <i class="ph ph-download-simple"></i> Baixar
                </a>
                <button onclick="document.getElementById('contrato-viewer-overlay').remove()"
                        style="background:#ef4444;color:#fff;border:none;border-radius:8px;padding:0.5rem 1.1rem;cursor:pointer;font-weight:600;display:flex;align-items:center;gap:0.4rem;font-size:0.85rem;">
                    <i class="ph ph-x"></i> Fechar
                </button>
            </div>
        </div>
        <div style="flex:1;position:relative;background:#525659;">
            <div id="cv-loading" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;gap:0.75rem;">
                <i class="ph ph-circle-notch ph-spin" style="font-size:3rem;color:#6366f1;"></i>
                <span style="font-weight:600;">Carregando documento...</span>
            </div>
            <iframe src="\${finalUrl}"
                style="width:100%;height:100%;border:none;display:block;"
                onload="var l=document.getElementById('cv-loading');if(l)l.style.display='none';"
                onerror="var l=document.getElementById('cv-loading');if(l)l.innerHTML='<i class=\\'ph ph-warning\\' style=\\'font-size:3rem;color:#f59e0b;\\'></i><span>Não foi possível carregar o PDF. <a href=\\''+encodeURI('\${finalUrl}')+'\\' target=\\'_blank\\' style=\\'color:#60a5fa;\\'>Abrir em nova aba</a></span>';">
            </iframe>
        </div>\`;

    // ESC fecha o popup
    const closeOnEsc = (e) => { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', closeOnEsc); } };
    document.addEventListener('keydown', closeOnEsc);
};

window.buildContratosSignatureRows = function(assinaturas, docs, colab) {`;

patch('Adicionar openContratoViewerPopup antes de buildContratosSignatureRows', INSERT_AFTER, NEW_POPUP_FN);

// ── 6. abrirModalGerarContrato: reload após gerar documento ──────────────────
// Buscar chamadas de switchContratosSubTab('avulso') dentro do modal de gerar
const OLD_MODAL_RELOAD_1 = `        window.switchContratosSubTab('avulso');\r\n    } catch(e) {\r\n        alert('Erro fatal: ' + e.message);\r\n        btn.innerHTML = oldHtml;\r\n        btn.disabled = false;\r\n    }\r\n};\r\nwindow.abrirModalGerarContrato`;

const NEW_MODAL_RELOAD_1 = `        // Forçar reload da lista
        window._contratosAvulsoLoaded = false;
        const _avDivLote = document.getElementById('contratos-sub-avulso');
        if (_avDivLote) await window.renderContratosAvulso(_avDivLote);
        window.switchContratosSubTab('avulso');\r\n    } catch(e) {\r\n        alert('Erro fatal: ' + e.message);\r\n        btn.innerHTML = oldHtml;\r\n        btn.disabled = false;\r\n    }\r\n};\r\nwindow.abrirModalGerarContrato`;

patch('enviarAssinaturaLoteContratos: reload após enviar', OLD_MODAL_RELOAD_1, NEW_MODAL_RELOAD_1);

// ── Salvar ───────────────────────────────────────────────────────────────────
if (changed === 0) {
    console.error('❌ Nenhuma substituição foi feita!');
    process.exit(1);
}
fs.writeFileSync(appPath, app, 'utf8');
console.log(`\n✅ ${changed} substituições aplicadas. frontend/app.js salvo.`);
