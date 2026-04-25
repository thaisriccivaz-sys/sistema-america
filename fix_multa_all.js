const fs = require('fs');
let app = fs.readFileSync('frontend/app.js', 'utf8');

// ===== Fix 1: excluirMulta - use _recarregarListaMultas instead of btn.closest =====
const OLD_EXCLUIR = `window.excluirMulta = async function(multaId, colabId, btn) {
    if (!confirm('Excluir este registro de multa? Esta ação não pode ser desfeita.')) return;
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
    btn.disabled = true;
    try {
        const res = await fetch(\`\${API_URL}/colaboradores/\${colabId}/multas/\${multaId}\`, {
            method: 'DELETE',
            headers: { 'Authorization': \`Bearer \${currentToken}\` }
        });
        if (!res.ok) throw new Error('Falha ao excluir');
        const card = btn.closest('div[style]');
        if (card) card.remove();
        if (typeof showToast === 'function') showToast('Multa excluída.', 'success');
    } catch(e) {
        btn.innerHTML = orig;
        btn.disabled = false;
        alert('Erro: ' + e.message);
    }
};`;

const NEW_EXCLUIR = `window.excluirMulta = async function(multaId, colabId, btn) {
    if (!confirm('Excluir este registro de multa? Esta ação não pode ser desfeita.')) return;
    if (btn) { btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i>'; btn.disabled = true; }
    try {
        const res = await fetch(\`\${API_URL}/colaboradores/\${colabId}/multas/\${multaId}\`, {
            method: 'DELETE',
            headers: { 'Authorization': \`Bearer \${currentToken}\` }
        });
        if (!res.ok) throw new Error('Falha ao excluir');
        // Recarrega a lista em tempo real
        await window._recarregarListaMultas(colabId);
        if (typeof showToast === 'function') showToast('Multa excluída.', 'success');
    } catch(e) {
        if (btn) { btn.innerHTML = '<i class="ph ph-trash"></i> Excluir'; btn.disabled = false; }
        alert('Erro ao excluir: ' + e.message);
    }
};`;

if (app.includes(OLD_EXCLUIR)) {
    app = app.replace(OLD_EXCLUIR, NEW_EXCLUIR);
    console.log('✅ excluirMulta fixed - uses _recarregarListaMultas');
} else {
    console.log('❌ OLD_EXCLUIR not found exactly - trying brace-based replacement...');
    const idx = app.indexOf('window.excluirMulta = async function(multaId, colabId, btn)');
    if (idx !== -1) {
        let depth = 0; let end = idx;
        for (let i = idx; i < app.length; i++) {
            if (app[i] === '{') depth++;
            if (app[i] === '}') { depth--; if (depth === 0) { end = i+1; if (app[end] === ';') end++; break; } }
        }
        app = app.substring(0, idx) + NEW_EXCLUIR + app.substring(end);
        console.log('✅ excluirMulta replaced via brace counting');
    }
}

// ===== Fix 2: abrirPreviewDocumentoMulta - write HTML to iframe after append =====
const OLD_PREVIEW = `window.abrirPreviewDocumentoMulta = function(html, colabId, multaId, tipo) {
    let modal = document.getElementById('modal-preview-multa');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'modal-preview-multa';
    modal.style = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;flex-direction:column;';
    modal.innerHTML = \`
        <div style="background:#1e293b;padding:1rem;display:flex;align-items:center;justify-content:space-between;">
            <h3 style="margin:0;color:#fff;font-size:1rem;"><i class="ph ph-file-text" style="color:#f503c5;"></i> Termo — \${tipo === 'indicacao' ? 'Indicação de Condutor' : 'Pagamento NIC'}</h3>
            <div style="display:flex;gap:8px;">
                <button onclick="window.solicitarAssinaturaMulta(\${colabId}, \${multaId}, '\${tipo}')"
                    style="padding:0.5rem 1rem;background:#f503c5;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">
                    <i class="ph ph-pen"></i> Solicitar Assinatura
                </button>
                <button onclick="document.getElementById('modal-preview-multa').remove()"
                    style="padding:0.5rem 1rem;background:#475569;color:#fff;border:none;border-radius:8px;cursor:pointer;">Fechar</button>
            </div>
        </div>
        <iframe id="multa-preview-iframe" style="flex:1;border:none;"></iframe>
    \`;
    document.body.appendChild(modal);
};`;

const NEW_PREVIEW = `window.abrirPreviewDocumentoMulta = function(html, colabId, multaId, tipo) {
    let modal = document.getElementById('modal-preview-multa');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'modal-preview-multa';
    modal.style = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;flex-direction:column;';
    modal.innerHTML = \`
        <div style="background:#1e293b;padding:1rem;display:flex;align-items:center;justify-content:space-between;">
            <h3 style="margin:0;color:#fff;font-size:1rem;"><i class="ph ph-file-text" style="color:#f503c5;"></i> Termo — \${tipo === 'indicacao' ? 'Indicação de Condutor' : 'Pagamento NIC'}</h3>
            <div style="display:flex;gap:8px;">
                <button onclick="window.solicitarAssinaturaMulta(\${colabId}, \${multaId}, '\${tipo}')"
                    style="padding:0.5rem 1rem;background:#f503c5;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">
                    <i class="ph ph-pen"></i> Solicitar Assinatura
                </button>
                <button onclick="document.getElementById('modal-preview-multa').remove()"
                    style="padding:0.5rem 1rem;background:#475569;color:#fff;border:none;border-radius:8px;cursor:pointer;">Fechar</button>
            </div>
        </div>
        <iframe id="multa-preview-iframe" style="flex:1;border:none;background:#fff;"></iframe>
    \`;
    document.body.appendChild(modal);

    // Escrever HTML no iframe APÓS appendar ao DOM
    setTimeout(function() {
        var iframe = document.getElementById('multa-preview-iframe');
        if (iframe) {
            var doc = iframe.contentDocument || iframe.contentWindow.document;
            doc.open();
            doc.write(html);
            doc.close();
        }
    }, 50);
};`;

if (app.includes(OLD_PREVIEW)) {
    app = app.replace(OLD_PREVIEW, NEW_PREVIEW);
    console.log('✅ abrirPreviewDocumentoMulta fixed - writes HTML to iframe after append');
} else {
    const idx = app.indexOf('window.abrirPreviewDocumentoMulta = function(html, colabId, multaId, tipo)');
    if (idx !== -1) {
        let depth = 0; let end = idx;
        for (let i = idx; i < app.length; i++) {
            if (app[i] === '{') depth++;
            if (app[i] === '}') { depth--; if (depth === 0) { end = i+1; if (app[end] === ';') end++; break; } }
        }
        app = app.substring(0, idx) + NEW_PREVIEW + app.substring(end);
        console.log('✅ abrirPreviewDocumentoMulta replaced via brace counting');
    } else {
        console.log('❌ abrirPreviewDocumentoMulta not found!');
    }
}

// ===== Fix 3: solicitarAssinaturaMulta - replace blank modal with proper signature flow =====
const solIdx = app.indexOf('window.solicitarAssinaturaMulta = async function(colabId, multaId, tipo)');
if (solIdx !== -1) {
    let depth = 0; let end = solIdx;
    for (let i = solIdx; i < app.length; i++) {
        if (app[i] === '{') depth++;
        if (app[i] === '}') { depth--; if (depth === 0) { end = i+1; if (app[end] === ';') end++; break; } }
    }
    
    const NEW_SOLICITAR = `window.solicitarAssinaturaMulta = async function(colabId, multaId, tipo) {
    // Fechar o modal de preview
    var previewModal = document.getElementById('modal-preview-multa');
    if (previewModal) previewModal.remove();

    // Criar modal de assinatura próprio (inline, sem depender de modal-assinatura-testemunhas)
    var existente = document.getElementById('modal-assinatura-multa');
    if (existente) existente.remove();

    var modal = document.createElement('div');
    modal.id = 'modal-assinatura-multa';
    modal.style = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = \`
        <div style="background:#fff;border-radius:16px;padding:2rem;width:100%;max-width:500px;box-shadow:0 20px 60px rgba(0,0,0,0.4);">
            <h2 style="margin:0 0 0.5rem;color:#1e293b;"> Assinatura — Termo de Multa</h2>
            <p style="color:#64748b;margin-bottom:1.5rem;font-size:0.9rem;">Tipo: <b>\${tipo === 'indicacao' ? 'Indicação de Condutor' : 'Pagamento via NIC'}</b></p>

            <div style="margin-bottom:1rem;">
                <label style="display:block;font-size:0.85rem;font-weight:600;color:#475569;margin-bottom:4px;">Testemunha 1</label>
                <input id="multa-test1-nome" type="text" placeholder="Nome da Testemunha"
                    style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;box-sizing:border-box;">
            </div>
            <div style="margin-bottom:1.5rem;">
                <label style="display:block;font-size:0.85rem;font-weight:600;color:#475569;margin-bottom:4px;">Testemunha 2</label>
                <input id="multa-test2-nome" type="text" placeholder="Nome da Testemunha (opcional)"
                    style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;box-sizing:border-box;">
            </div>

            <p style="font-size:0.8rem;color:#94a3b8;margin-bottom:1.5rem;background:#f8fafc;padding:10px;border-radius:8px;">
                <i class="ph ph-info"></i> Confirme que o colaborador e as testemunhas listadas assinaram o documento físico.
            </p>

            <div style="display:flex;gap:12px;justify-content:flex-end;">
                <button onclick="document.getElementById('modal-assinatura-multa').remove()"
                    style="padding:0.6rem 1.2rem;background:#e2e8f0;color:#475569;border:none;border-radius:8px;cursor:pointer;font-weight:600;">Cancelar</button>
                <button onclick="window._confirmarAssinaturaMulta(\${colabId}, \${multaId}, '\${tipo}')"
                    style="padding:0.6rem 1.5rem;background:#f503c5;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">
                    ✔ Confirmar Assinaturas
                </button>
            </div>
        </div>
    \`;
    document.body.appendChild(modal);
};`;

    app = app.substring(0, solIdx) + NEW_SOLICITAR + app.substring(end);
    console.log('✅ solicitarAssinaturaMulta replaced with proper inline modal');
} else {
    console.log('❌ solicitarAssinaturaMulta not found!');
}

// ===== Fix 4: Add _confirmarAssinaturaMulta helper =====
if (!app.includes('window._confirmarAssinaturaMulta')) {
    const CONFIRM_FN = `
window._confirmarAssinaturaMulta = async function(colabId, multaId, tipo) {
    var modal = document.getElementById('modal-assinatura-multa');
    if (modal) modal.remove();

    try {
        await fetch(\`\${API_URL}/colaboradores/\${colabId}/multas/\${multaId}\`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${currentToken}\` },
            body: JSON.stringify({ status: 'assinado' })
        });

        if (tipo === 'indicacao') {
            window.confirmarMonacoMulta(colabId, multaId);
        } else {
            if (typeof showToast === 'function') showToast('✅ Termo NIC assinado com sucesso!', 'success');
            await window._recarregarListaMultas(colabId);
        }
    } catch(e) {
        alert('Erro ao confirmar assinatura: ' + e.message);
    }
};

`;
    // Inject before confirmarMonacoMulta
    const beforeIdx = app.indexOf('window.confirmarMonacoMulta = function');
    if (beforeIdx !== -1) {
        app = app.substring(0, beforeIdx) + CONFIRM_FN + app.substring(beforeIdx);
        console.log('✅ _confirmarAssinaturaMulta added');
    }
}

fs.writeFileSync('frontend/app.js', app);
console.log('All fixes applied. Size:', app.length);
