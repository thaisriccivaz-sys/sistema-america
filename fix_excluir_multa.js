const fs = require('fs');
let app = fs.readFileSync('frontend/app.js', 'utf8');

// Fix the multa card action buttons to add delete button
const OLD = `                \${m.status === 'pendente' ? \`<button class="btn btn-sm btn-primary" style="margin-top:8px;" onclick="window.continuarProcessoMulta(\${m.id}, '\${m.tipo_resolucao || ''}', \${colab.id})"><i class="ph ph-arrow-right"></i> Continuar Processo</button>\` : ''}
                \${m.monaco_confirmado ? \`<div style="margin-top:6px;font-size:0.8rem;color:#8b5cf6;"><i class="ph ph-check-circle"></i> Monaco confirmado: <b>\${m.monaco_confirmado}</b></div>\` : ''}
            \`;`;

const NEW = `                \${(m.status === 'pendente' || m.status === 'doc_gerado') ? \`
                <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
                    \${m.status === 'pendente' ? \`<button class="btn btn-sm btn-primary" onclick="window.continuarProcessoMulta(\${m.id}, '\${m.tipo_resolucao || ''}', \${colab.id})"><i class="ph ph-arrow-right"></i> Continuar Processo</button>\` : ''}
                    <button class="btn btn-sm" style="background:#fee2e2;color:#dc2626;border:1.5px solid #fca5a5;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.8rem;display:inline-flex;align-items:center;gap:4px;" onclick="window.excluirMulta(\${m.id}, \${colab.id}, this)">
                        <i class="ph ph-trash"></i> Excluir
                    </button>
                </div>\` : ''}
                \${m.monaco_confirmado ? \`<div style="margin-top:6px;font-size:0.8rem;color:#8b5cf6;"><i class="ph ph-check-circle"></i> Monaco confirmado: <b>\${m.monaco_confirmado}</b></div>\` : ''}
            \`;`;

if (app.includes(OLD)) {
    app = app.replace(OLD, NEW);
    console.log('Card buttons fix: OK');
} else {
    console.error('Pattern not found!');
    // Try to find approximate location
    const idx = app.indexOf("m.status === 'pendente' ? `<button class=\"btn btn-sm btn-primary\"");
    console.log('Approx index:', idx);
    process.exit(1);
}

// Add window.excluirMulta function before window.continuarProcessoMulta
const EXCLUIR_FN = `
window.excluirMulta = async function(multaId, colabId, btn) {
    if (!confirm('Tem certeza que deseja excluir este registro de multa? Esta ação não pode ser desfeita.')) return;
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
    btn.disabled = true;
    try {
        const res = await fetch(\`\${API_URL}/colaboradores/\${colabId}/multas/\${multaId}\`, {
            method: 'DELETE',
            headers: { 'Authorization': \`Bearer \${currentToken}\` }
        });
        if (!res.ok) throw new Error('Falha ao excluir');
        // Remove card from DOM
        const card = btn.closest('div[style*="border-radius:12px"]');
        if (card) card.remove();
        if (typeof showToast === 'function') showToast('Multa excluída com sucesso.', 'success');
    } catch(e) {
        btn.innerHTML = orig;
        btn.disabled = false;
        alert('Erro ao excluir: ' + e.message);
    }
};

`;

app = app.replace(
    'window.continuarProcessoMulta = async function',
    EXCLUIR_FN + 'window.continuarProcessoMulta = async function'
);

fs.writeFileSync('frontend/app.js', app);

const v = fs.readFileSync('frontend/app.js', 'utf8');
console.log('excluirMulta function:', v.includes('window.excluirMulta = async function'));
console.log('Delete button in card:', v.includes('ph ph-trash'));
console.log('Done.');
