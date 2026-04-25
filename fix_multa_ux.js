const fs = require('fs');
let app = fs.readFileSync('frontend/app.js', 'utf8');

// ===================================================
// FIX 1: showToast not defined — create global helper
// ===================================================
// Add a global showToast wrapper at the top of app.js (after first line)
const GLOBAL_TOAST = `// Global toast helper (wraps any available notification system)
function showToast(msg, type) {
    // Try Bootstrap toast, then alert
    const toast = document.getElementById('global-toast');
    if (toast) {
        const toastBody = toast.querySelector('.toast-body');
        if (toastBody) toastBody.textContent = msg;
        toast.className = 'toast align-items-center border-0 ' + (type === 'error' ? 'bg-danger text-white' : 'bg-success text-white');
        try { new bootstrap.Toast(toast, { delay: 3000 }).show(); return; } catch(e) {}
    }
    // Fallback: floating div
    const div = document.createElement('div');
    div.style = 'position:fixed;bottom:24px;right:24px;z-index:99999;background:' + (type === 'error' ? '#dc2626' : '#16a34a') + ';color:#fff;padding:12px 20px;border-radius:10px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,0.2);font-size:0.9rem;';
    div.textContent = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}

`;

// Insert after the first line of app.js
const firstNewline = app.indexOf('\n');
app = app.substring(0, firstNewline + 1) + GLOBAL_TOAST + app.substring(firstNewline + 1);

// ===================================================
// FIX 2: After saving new multa → close modal + reload list (no preview)
// ===================================================
const OLD_AFTER_SAVE = `        document.getElementById('modal-nova-multa').remove();

        if (docData.html) {
            window.abrirPreviewDocumentoMulta(docData.html, colabId, multaId, window._multaTipoSelecionado);
        }`;

const NEW_AFTER_SAVE = `        document.getElementById('modal-nova-multa').remove();

        // Salvar o html gerado no registro para visualização posterior
        window._multaHtmlCache = window._multaHtmlCache || {};
        window._multaHtmlCache[multaId] = { html: docData.html, tipo: window._multaTipoSelecionado };

        // Recarregar lista de multas sem abrir preview
        const listContainer = document.getElementById('multas-lista-container');
        const mainContainer = listContainer ? listContainer.parentElement : null;
        if (mainContainer) {
            await window.renderMultasMotoristaTab(mainContainer);
        }
        showToast('Multa registrada! Use o botão 👁 para visualizar o documento.', 'success');`;

if (app.includes(OLD_AFTER_SAVE)) {
    app = app.replace(OLD_AFTER_SAVE, NEW_AFTER_SAVE);
    console.log('Fix 2 (multa save flow): OK');
} else {
    console.error('Fix 2 pattern not found!');
}

// ===================================================
// FIX 3: Add eye button to multa cards + fix continuarProcesso
// ===================================================
// Find the delete button section in the card and add eye button
const OLD_CARD_BTN = `<button style="background:#fee2e2;color:#dc2626;border:1.5px solid #fca5a5;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.8rem;display:inline-flex;align-items:center;gap:4px;" onclick="window.excluirMulta(\${m.id}, \${colab.id}, this)">
                        <i class="ph ph-trash"></i> Excluir
                    </button>`;

const NEW_CARD_BTN = `<button style="background:#fee2e2;color:#dc2626;border:1.5px solid #fca5a5;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.8rem;display:inline-flex;align-items:center;gap:4px;" onclick="window.excluirMulta(\${m.id}, \${colab.id}, this)">
                        <i class="ph ph-trash"></i> Excluir
                    </button>
                    <button style="background:#eff6ff;color:#2563eb;border:1.5px solid #bfdbfe;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.8rem;display:inline-flex;align-items:center;gap:4px;" onclick="window.visualizarDocumentoMulta(\${m.id}, \${colab.id}, '\${m.tipo_resolucao || 'indicacao'}')">
                        <i class="ph ph-eye"></i> Ver Documento
                    </button>`;

if (app.includes(OLD_CARD_BTN)) {
    app = app.replace(OLD_CARD_BTN, NEW_CARD_BTN);
    console.log('Fix 3 (eye button in card): OK');
} else {
    console.error('Fix 3 pattern not found for eye button!');
}

// ===================================================
// FIX 4: Add window.visualizarDocumentoMulta function
// ===================================================
const FN_VISUALIZAR = `window.visualizarDocumentoMulta = async function(multaId, colabId, tipo) {
    // Check cache first
    const cache = window._multaHtmlCache && window._multaHtmlCache[multaId];
    if (cache && cache.html) {
        window.abrirPreviewDocumentoMulta(cache.html, colabId, multaId, tipo || cache.tipo);
        return;
    }
    // Fetch from backend
    try {
        const res = await fetch(\`\${API_URL}/colaboradores/\${colabId}/multas/\${multaId}/gerar-documento\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${currentToken}\` },
            body: JSON.stringify({ tipo: tipo || 'indicacao' })
        });
        const data = await res.json();
        if (data.html) {
            window._multaHtmlCache = window._multaHtmlCache || {};
            window._multaHtmlCache[multaId] = { html: data.html, tipo };
            window.abrirPreviewDocumentoMulta(data.html, colabId, multaId, tipo);
        } else {
            alert('Documento não disponível.');
        }
    } catch(e) {
        alert('Erro ao carregar documento: ' + e.message);
    }
};

`;

// Add before window.excluirMulta
app = app.replace('window.excluirMulta = async function', FN_VISUALIZAR + 'window.excluirMulta = async function');

// ===================================================
// FIX 5: Fix continuarProcessoMulta — also uses it as visualizar now
// ===================================================
// The continuarProcesso was also supposed to open the preview, let's make it use visualizarDocumentoMulta
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

if (app.includes(OLD_CONTINUAR)) {
    app = app.replace(OLD_CONTINUAR, NEW_CONTINUAR);
    console.log('Fix 5 (continuarProcesso delegates to visualizar): OK');
} else {
    console.error('Fix 5 pattern not found!');
}

fs.writeFileSync('frontend/app.js', app);

const v = fs.readFileSync('frontend/app.js', 'utf8');
console.log('\n--- Verification ---');
console.log('Global showToast:', v.includes('function showToast(msg, type)'));
console.log('visualizarDocumentoMulta:', v.includes('window.visualizarDocumentoMulta = async'));
console.log('Eye button:', v.includes('ph ph-eye'));
console.log('Reload list after save:', v.includes('Recarregar lista de multas'));
console.log('continuarProcesso simplified:', v.includes('await window.visualizarDocumentoMulta'));
console.log('Done.');
