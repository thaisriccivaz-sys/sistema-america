const fs = require('fs');
let app = fs.readFileSync('frontend/app.js', 'utf8');

// Use line number-based replacement - find the exact line content at 11426 area
// The exact string at line 11426:
const idx = app.indexOf("m.status === 'pendente' ? `<button class=\"btn btn-sm btn-primary\" style=\"margin-top:8px;\" onclick=\"window.continuarProcessoMulta(");
console.log('Found at character index:', idx);
if (idx === -1) {
    // Try without escape
    const idx2 = app.indexOf("m.status === 'pendente'");
    console.log('Basic search at:', idx2);
    process.exit(1);
}

// Find start of the expression (the ${) before m.status
const exprStart = app.lastIndexOf('${', idx);
// Find end of the line (the next line with monaco_confirmado)
const monacoLine = app.indexOf("m.monaco_confirmado ?", idx);
const monacoEnd = app.indexOf('` : \'\'}', monacoLine) + '` : \'\'}'.length;

const oldSection = app.substring(exprStart, monacoEnd);
console.log('\n--- OLD SECTION ---\n', JSON.stringify(oldSection.substring(0, 200)));

const newSection = `\${(m.status === 'pendente' || m.status === 'doc_gerado') ? \`
                <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
                    \${m.status === 'pendente' ? \`<button class="btn btn-sm btn-primary" onclick="window.continuarProcessoMulta(\${m.id}, '\${m.tipo_resolucao || ''}', \${colab.id})"><i class="ph ph-arrow-right"></i> Continuar Processo</button>\` : ''}
                    <button style="background:#fee2e2;color:#dc2626;border:1.5px solid #fca5a5;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.8rem;display:inline-flex;align-items:center;gap:4px;" onclick="window.excluirMulta(\${m.id}, \${colab.id}, this)">
                        <i class="ph ph-trash"></i> Excluir
                    </button>
                </div>\` : ''}
                \${m.monaco_confirmado ? \`<div style="margin-top:6px;font-size:0.8rem;color:#8b5cf6;"><i class="ph ph-check-circle"></i> Monaco confirmado: <b>\${m.monaco_confirmado}</b></div>\` : ''}`;

app = app.substring(0, exprStart) + newSection + app.substring(monacoEnd);

// Add window.excluirMulta function before window.continuarProcessoMulta
const BEFORE = 'window.continuarProcessoMulta = async function';
const EXCLUIR = `window.excluirMulta = async function(multaId, colabId, btn) {
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

`;
app = app.replace(BEFORE, EXCLUIR + BEFORE);

fs.writeFileSync('frontend/app.js', app);

const v = fs.readFileSync('frontend/app.js', 'utf8');
console.log('excluirMulta fn:', v.includes('window.excluirMulta = async function'));
console.log('trash icon:', v.includes('ph ph-trash'));
console.log('Done.');
