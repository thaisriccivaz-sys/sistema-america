const fs = require('fs');
let app = fs.readFileSync('frontend/app.js', 'utf8');

// 1: showToast fix
const GLOBAL_TOAST = `function showToast(msg, type) {
    const toast = document.getElementById('global-toast');
    if (toast) {
        const toastBody = toast.querySelector('.toast-body');
        if (toastBody) toastBody.textContent = msg;
        toast.className = 'toast align-items-center border-0 ' + (type === 'error' ? 'bg-danger text-white' : 'bg-success text-white');
        try { new bootstrap.Toast(toast, { delay: 3000 }).show(); return; } catch(e) {}
    }
    const div = document.createElement('div');
    div.style = 'position:fixed;bottom:24px;right:24px;z-index:99999;background:' + (type === 'error' ? '#dc2626' : '#16a34a') + ';color:#fff;padding:12px 20px;border-radius:10px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,0.2);';
    div.textContent = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}
`;
if (!app.includes('function showToast(msg, type)')) {
    const firstNewline = app.indexOf('\n');
    app = app.substring(0, firstNewline + 1) + GLOBAL_TOAST + app.substring(firstNewline + 1);
}

// 2: Fix multa card buttons using idx
const multaCardStr = "m.status === 'pendente' ? `<button class=\"btn btn-sm btn-primary\" style=\"margin-top:8px;\" onclick=\"window.continuarProcessoMulta(";
const idx = app.indexOf(multaCardStr);
if (idx !== -1) {
    const exprStart = app.lastIndexOf('${', idx);
    const monacoLine = app.indexOf("m.monaco_confirmado ?", idx);
    const monacoEnd = app.indexOf('` : \'\'}', monacoLine) + '` : \'\'}'.length;
    
    // Instead of replacing blindly, slice it out
    if (exprStart !== -1 && monacoLine !== -1) {
        const newSection = `\${(m.status === 'pendente' || m.status === 'doc_gerado') ? \`
                <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
                    \${m.status === 'pendente' ? \`<button class="btn btn-sm btn-primary" onclick="window.continuarProcessoMulta(\${m.id}, '\${m.tipo_resolucao || ''}', \${colab.id})"><i class="ph ph-arrow-right"></i> Continuar Processo</button>\` : ''}
                    <button style="background:#eff6ff;color:#2563eb;border:1.5px solid #bfdbfe;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.8rem;display:inline-flex;align-items:center;gap:4px;" onclick="window.visualizarDocumentoMulta(\${m.id}, \${colab.id}, '\${m.tipo_resolucao || 'indicacao'}')">
                        <i class="ph ph-eye"></i> Ver Documento
                    </button>
                    <button style="background:#fee2e2;color:#dc2626;border:1.5px solid #fca5a5;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.8rem;display:inline-flex;align-items:center;gap:4px;" onclick="window.excluirMulta(\${m.id}, \${colab.id}, this)">
                        <i class="ph ph-trash"></i> Excluir
                    </button>
                </div>\` : ''}
                \${m.monaco_confirmado ? \`<div style="margin-top:6px;font-size:0.8rem;color:#8b5cf6;"><i class="ph ph-check-circle"></i> Monaco confirmado: <b>\${m.monaco_confirmado}</b></div>\` : ''}`;
        
        app = app.substring(0, exprStart) + newSection + app.substring(monacoEnd);
    }
}

// 3: Add the functions (excluirMulta and visualizarDocumentoMulta)
if (!app.includes('window.excluirMulta =')) {
    const BEFORE = 'window.continuarProcessoMulta = async function';
    const NEW_FNS = `window.excluirMulta = async function(multaId, colabId, btn) {
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
};

window.visualizarDocumentoMulta = async function(multaId, colabId, tipo) {
    window._multaHtmlCache = window._multaHtmlCache || {};
    if (window._multaHtmlCache[multaId] && window._multaHtmlCache[multaId].html) {
        window.abrirPreviewDocumentoMulta(window._multaHtmlCache[multaId].html, colabId, multaId, tipo || window._multaHtmlCache[multaId].tipo);
        return;
    }
    try {
        const res = await fetch(\`\${API_URL}/colaboradores/\${colabId}/multas/\${multaId}/gerar-documento\`, { // FIX BACKEND FETCH
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${currentToken}\` },
            body: JSON.stringify({ tipo: tipo || 'indicacao' })
        });
        const data = await res.json();
        if (data.html) {
            window._multaHtmlCache[multaId] = { html: data.html, tipo };
            window.abrirPreviewDocumentoMulta(data.html, colabId, multaId, tipo);
        } else alert('Documento não disponível.');
    } catch(e) { alert('Erro: ' + e.message); }
};

`;
    app = app.replace(BEFORE, NEW_FNS + BEFORE);
}

// 4: Fix salvarNovaMulta no auto preview
const OLD_SAVE_MULTA = `        document.getElementById('modal-nova-multa').remove();

        if (docData.html) {
            window.abrirPreviewDocumentoMulta(docData.html, colabId, multaId, window._multaTipoSelecionado);
        }`;
        
const NEW_SAVE_MULTA = `        document.getElementById('modal-nova-multa').remove();

        window._multaHtmlCache = window._multaHtmlCache || {};
        if (docData.html) window._multaHtmlCache[multaId] = { html: docData.html, tipo: window._multaTipoSelecionado };
        
        const mc = document.getElementById('multas-lista-container');
        if (mc && mc.parentElement) await window.renderMultasMotoristaTab(mc.parentElement);
        showToast('Multa salva! Use 👁 Ver Documento para abri-la.', 'success');`;

app = app.replace(OLD_SAVE_MULTA, NEW_SAVE_MULTA);

// 5: Fix continuarProcesso to delegate
const OLD_CONTINUAR = `window.continuarProcessoMulta = async function(multaId, tipo, colabId) {
    const res = await fetch(\`\${API_URL}/colaboradores/\${colabId}/multas/\${multaId}/gerar-documento\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${currentToken}\` },
        body: JSON.stringify({ tipo: tipo || 'indicacao' })
    });
    const data = await res.json();
    if (data.html) window.abrirPreviewDocumentoMulta(data.html, colabId, multaId, tipo || 'indicacao');
};`;

const NEW_CONTINUAR = `window.continuarProcessoMulta = async function(multaId, tipo, colabId) {
    await window.visualizarDocumentoMulta(multaId, colabId, tipo || 'indicacao');
};`;

app = app.replace(OLD_CONTINUAR, NEW_CONTINUAR);

fs.writeFileSync('frontend/app.js', app);
console.log("UX modifications for Multas injected successfully.");
