const fs = require('fs');

// ===== FRONTEND: Apply all fixes safely =====
let app = fs.readFileSync('frontend/app.js', 'utf8');
const originalSize = app.length;

// --- Fix 1: santander - use dedicated endpoint ---
const OLD_FETCH = `try {
            // Salvar santander_ficha_data diretamente no colaborador (endpoint correto)
            await fetch(\`\${API_URL}/colaboradores/\${colab.id}\`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${currentToken}\` },
                body: JSON.stringify({ santander_ficha_data: colab.santander_ficha_data })
            });
            console.log('[Santander] Data salva no banco:', colab.santander_ficha_data);
        } catch(e) { console.error('[Santander] Erro ao salvar data:', e); }`;

const NEW_FETCH = `try {
            // Salvar via endpoint dedicado (mais confiável e direto)
            const sr = await fetch(\`\${API_URL}/colaboradores/\${colab.id}/santander-status\`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${currentToken}\` },
                body: JSON.stringify({ santander_ficha_data: colab.santander_ficha_data })
            });
            const sd = await sr.json();
            console.log('[Santander] Status salvo:', sd);
        } catch(e) { console.error('[Santander] Erro ao salvar data:', e); }`;

if (app.includes(OLD_FETCH)) {
    app = app.replace(OLD_FETCH, NEW_FETCH);
    console.log('✅ Fix 1: endpoint santander-status');
} else {
    console.log('⚠️ Fix 1: OLD_FETCH not found - might already be correct');
}

// --- Fix 2: Add eye button to multa card + verDocumentoMulta function ---

// Find the anchor and replace the buttons block carefully
const ANCHOR_TEXT = "onclick=\"window.continuarProcessoMulta(${m.id}, '${m.tipo_resolucao || ''}', ${colab.id})\"";
const anchorIdx = app.indexOf(ANCHOR_TEXT);
console.log('Button anchor at:', anchorIdx);

if (anchorIdx !== -1) {
    // Find start of the conditional block: ${(m.status === 'pendente'...
    let searchBack = anchorIdx;
    while (searchBack > 0 && !(app[searchBack] === '$' && app[searchBack+1] === '{' && app.substring(searchBack).startsWith("${(m.status"))) {
        searchBack--;
    }
    
    // Find end of the block: the closing ''}
    const blockEndSearch = app.indexOf("`: ''}", anchorIdx);
    if (blockEndSearch !== -1) {
        const blockEnd = blockEndSearch + "`: ''}".length;
        const blockContent = app.substring(searchBack, blockEnd);
        console.log('Block to replace (first 100 chars):', blockContent.substring(0, 100));
        
        // The new buttons block (no ternary wrapper needed, we inline conditions)
        const NEW_BUTTONS = `<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
                    \${m.status === 'pendente' ? \`<button class="btn btn-sm btn-primary" onclick="window.continuarProcessoMulta(\${m.id}, '\${m.tipo_resolucao || ''}', \${colab.id})"><i class="ph ph-arrow-right"></i> Continuar Processo</button>\` : ''}
                    \${(m.status === 'doc_gerado' || m.status === 'assinado' || m.status === 'confirmado') ? \`<button style="background:#dbeafe;color:#1d4ed8;border:1.5px solid #93c5fd;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.8rem;display:inline-flex;align-items:center;gap:4px;" onclick="window.verDocumentoMulta(\${m.id}, \${colab.id}, '\${m.tipo_resolucao || 'indicacao'}')"><i class="ph ph-eye"></i> Ver Documento</button>\` : ''}
                    \${(m.status === 'pendente' || m.status === 'doc_gerado') ? \`<button style="background:#fee2e2;color:#dc2626;border:1.5px solid #fca5a5;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.8rem;display:inline-flex;align-items:center;gap:4px;" onclick="window.excluirMulta(\${m.id}, \${colab.id}, this)"><i class="ph ph-trash"></i> Excluir</button>\` : ''}
                </div>`;
        
        app = app.substring(0, searchBack) + NEW_BUTTONS + app.substring(blockEnd);
        console.log('✅ Fix 2: eye button added to multa card');
    }
} else {
    console.log('⚠️ Fix 2: anchor not found');
}

// --- Fix 3: Add verDocumentoMulta before continuarProcessoMulta ---
if (!app.includes('window.verDocumentoMulta')) {
    const insertBefore = 'window.continuarProcessoMulta = async function(multaId, tipo, colabId)';
    if (app.includes(insertBefore)) {
        const VER_FN = `window.verDocumentoMulta = async function(multaId, colabId, tipo) {
    try {
        const res = await fetch(\`\${API_URL}/colaboradores/\${colabId}/multas/\${multaId}/gerar-documento\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${currentToken}\` },
            body: JSON.stringify({ tipo: tipo || 'indicacao' })
        });
        const data = await res.json();
        if (data.html) window.abrirPreviewDocumentoMulta(data.html, colabId, multaId, tipo || 'indicacao');
        else alert('Documento não disponível.');
    } catch(e) { alert('Erro ao carregar documento: ' + e.message); }
};

`;
        app = app.replace(insertBefore, VER_FN + insertBefore);
        console.log('✅ Fix 3: verDocumentoMulta function added');
    }
} else {
    console.log('⚠️ Fix 3: verDocumentoMulta already exists');
}

// Size sanity check - must not have grown more than 5KB
const newSize = app.length;
const growth = newSize - originalSize;
console.log(`\nSize: ${originalSize} → ${newSize} (diff: ${growth > 0 ? '+' : ''}${growth})`);

if (Math.abs(growth) > 10000) {
    console.log('❌ ERROR: File grew too large! Not saving. Diff:', growth);
    process.exit(1);
}

fs.writeFileSync('frontend/app.js', app);
console.log('✅ Frontend saved safely.');

// Quick sanity
const lines = app.split('\n').length;
console.log('Lines:', lines);
