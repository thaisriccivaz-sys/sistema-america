const fs = require('fs');

// ===== BACKEND: Fix 1 - Add santander_ficha_data to PUT /api/colaboradores/:id =====
let server = fs.readFileSync('backend/server.js', 'utf8');

// The PUT route's colunas list ends with 'conjuge_nome', 'conjuge_cpf'
// There are TWO lists - one for POST and one for PUT. We need to fix the PUT one.
// The PUT route starts at app.put('/api/colaboradores/:id',  and its colunas list ends at line 1653

// Find the specific PUT route
const putRouteMarker = "app.put('/api/colaboradores/:id', authenticateToken, (req, res) => {";
const putIdx = server.indexOf(putRouteMarker);

if (putIdx === -1) {
    console.log('❌ PUT route not found');
    process.exit(1);
}

// Find the colunas list within the PUT route
const putSection = server.substring(putIdx, putIdx + 3000);
const lastConjuge = putSection.lastIndexOf("'conjuge_nome', 'conjuge_cpf'");
if (lastConjuge === -1) {
    console.log('❌ conjuge columns not found in PUT route');
    process.exit(1);
}

const absLast = putIdx + lastConjuge;
const OLD_PUT_COLS = "'conjuge_nome', 'conjuge_cpf'\n    ];";
const NEW_PUT_COLS = "'conjuge_nome', 'conjuge_cpf',\n        'santander_ficha_data'\n    ];";

// Verify we're replacing the right one (the PUT route, not POST)
const contextBefore = server.substring(absLast - 50, absLast + 50);
console.log('Context around replacement:', contextBefore.replace(/\r\n/g, '|'));

if (server.substring(absLast, absLast + OLD_PUT_COLS.length).includes("'conjuge_nome'")) {
    // Find and replace only at this position
    server = server.substring(0, absLast) + 
              server.substring(absLast).replace("'conjuge_nome', 'conjuge_cpf'\r\n    ];", "'conjuge_nome', 'conjuge_cpf',\r\n        'santander_ficha_data'\r\n    ];");
    console.log('✅ Added santander_ficha_data to PUT route allowed columns');
} else {
    console.log('⚠️ Trying direct string replacement...');
    server = server.replace(
        "'conjuge_nome', 'conjuge_cpf'\r\n    ];\r\n\r\n    const allowedColunas = colunas;\r\n    const bodyKeys = Object.keys(data);\r\n    const updates = bodyKeys.filter(k => allowedColunas.includes(k));",
        "'conjuge_nome', 'conjuge_cpf',\r\n        'santander_ficha_data'\r\n    ];\r\n\r\n    const allowedColunas = colunas;\r\n    const bodyKeys = Object.keys(data);\r\n    const updates = bodyKeys.filter(k => allowedColunas.includes(k));"
    );
    console.log('✅ Applied via direct string replacement');
}

// ===== BACKEND: Fix 2 - Add dedicated santander status endpoint (bulletproof) =====
const SANTANDER_ENDPOINT = `
// ─── ENDPOINT DEDICADO: Salvar status Santander ──────────────────────────────
// PUT /api/colaboradores/:id/santander-status
app.put('/api/colaboradores/:id/santander-status', authenticateToken, (req, res) => {
    const { santander_ficha_data } = req.body;
    const { id } = req.params;
    if (!santander_ficha_data) return res.status(400).json({ error: 'santander_ficha_data obrigatório' });
    
    db.run(
        'UPDATE colaboradores SET santander_ficha_data = ? WHERE id = ?',
        [santander_ficha_data, id],
        function(err) {
            if (err) {
                console.error('[Santander Status] Erro:', err.message);
                return res.status(500).json({ error: err.message });
            }
            console.log('[Santander Status] Salvo para colaborador', id, ':', santander_ficha_data);
            res.json({ sucesso: true, santander_ficha_data });
        }
    );
});
// ─────────────────────────────────────────────────────────────────────────────

`;

// Add before the multa routes
if (!server.includes("'/api/colaboradores/:id/santander-status'")) {
    const multaMarker = '// ─── ROTAS DE MULTAS DE TRÂNSITO ──────';
    const insertAt = server.indexOf(multaMarker);
    if (insertAt !== -1) {
        server = server.substring(0, insertAt) + SANTANDER_ENDPOINT + server.substring(insertAt);
        console.log('✅ Dedicated santander-status endpoint added');
    } else {
        // Try alternate marker
        const multaMarker2 = "app.get('/api/colaboradores/:id/multas'";
        const insertAt2 = server.indexOf(multaMarker2);
        if (insertAt2 !== -1) {
            server = server.substring(0, insertAt2) + SANTANDER_ENDPOINT + server.substring(insertAt2);
            console.log('✅ Dedicated santander-status endpoint added (alternate location)');
        }
    }
}

// ===== BACKEND: Fix 3 - Update multa document template =====
// Fix 1: parcelamento - use (✓) and (  ) instead of ( ) and (( ))
// Fix 2: logo - use full header (we'll use a text header for now, backend doesn't have base64)
// Fix 3: local e data - add Guarulhos format
// Fix 4: testemunha - pass names to the template
// These require the endpoint to receive testemunha names too

// Get current multa template
const multalIdx = server.indexOf("app.post('/api/colaboradores/:id/multas/:multaId/gerar-documento'");

if (multalIdx !== -1) {
    // Find check variables for parcelas
    const OLD_CHECKS = `        const check1x = parcelas === 1 ? '✓' : '( )';
        const check2x = parcelas === 2 ? '✓' : '( )';
        const check3x = parcelas === 3 ? '✓' : '( )';`;
    const NEW_CHECKS = `        const check1x = parcelas == 1 ? '<b>✓</b>' : '&nbsp;&nbsp;';
        const check2x = parcelas == 2 ? '<b>✓</b>' : '&nbsp;&nbsp;';
        const check3x = parcelas == 3 ? '<b>✓</b>' : '&nbsp;&nbsp;';`;
    
    if (server.includes(OLD_CHECKS)) {
        server = server.replace(OLD_CHECKS, NEW_CHECKS);
        console.log('✅ Parcelamento check marks fixed');
    }

    // Fix logo-header (text → proper header)
    const OLD_HEADER_CSS = `.logo-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #0077b6; padding-bottom: 10px; }`;
    const NEW_HEADER_CSS = `.logo-header { text-align: center; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 3px solid #0b5394; }
            .logo-header h1 { font-size: 28px; color: #0b5394; font-weight: 900; letter-spacing: 2px; margin: 0; }
            .logo-header span { font-size: 13px; color: #555; display: block; }`;
    
    if (server.includes(OLD_HEADER_CSS)) {
        server = server.replace(OLD_HEADER_CSS, NEW_HEADER_CSS);
        console.log('✅ Logo header CSS updated');
    }

    const OLD_HEADER_HTML = `        <div class="logo-header">
            <div><strong>AMÉRICA RENTAL</strong><br><small>desde 1999</small></div>
        </div>`;
    const NEW_HEADER_HTML = `        <div class="logo-header">
            <h1>AMÉRICA RENTAL</h1>
            <span>Equipamentos Ltda • desde 1999</span>
        </div>`;

    if (server.includes(OLD_HEADER_HTML)) {
        server = server.replace(OLD_HEADER_HTML, NEW_HEADER_HTML);
        console.log('✅ Logo header HTML updated');
    }

    // Fix parcelas display - replace the paragraph
    const OLD_PARC = `        <p class="parcelas">Solicito que o desconto seja feito em: &nbsp;
            (\${check1x}) 1x &nbsp;&nbsp;&nbsp;
            (\${check2x}) 2x &nbsp;&nbsp;&nbsp;
            (\${check3x}) 3x
        </p>`;
    const NEW_PARC = `        <p class="parcelas">Solicito que o desconto seja feito em: &nbsp;&nbsp;
            (\${check1x}) <b>1x</b> &nbsp;&nbsp;&nbsp;&nbsp;
            (\${check2x}) <b>2x</b> &nbsp;&nbsp;&nbsp;&nbsp;
            (\${check3x}) <b>3x</b>
        </p>`;

    if (server.includes(OLD_PARC)) {
        server = server.replace(OLD_PARC, NEW_PARC);
        console.log('✅ Parcelamento paragraph updated');
    }

    // Fix Local e Data field
    const OLD_DATA = `        <p>___________________________________________________, _____ de ______________ de _________</p>`;
    
    // Generate the proper date format
    const NEW_DATA = `        \${(function() {
            var meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
            var d = multa.data_infracao ? new Date(multa.data_infracao + 'T12:00:00') : new Date();
            var hoje = new Date();
            var dia = hoje.getDate();
            var mes = meses[hoje.getMonth()];
            var ano = hoje.getFullYear();
            return '<p>Guarulhos, ' + dia + ' de ' + mes + ' de ' + ano + '.</p>';
        })()}`;

    if (server.includes(OLD_DATA)) {
        server = server.replace(OLD_DATA, NEW_DATA);
        console.log('✅ Local e data updated to Guarulhos format');
    }

    // Fix signature block - better layout
    const OLD_ASSIN = `        <div class="assinaturas">
            <div class="assin-row">
                <div class="assin-box">Assinatura do Colaborador<br><br>\${nome}</div>
                <div class="assin-box">Testemunha 1<br><br>&nbsp;</div>
                <div class="assin-box">Testemunha 2<br><br>&nbsp;</div>
            </div>
        </div>`;
    const NEW_ASSIN = `        <div class="assinaturas">
            <div class="assin-row">
                <div class="assin-box">Assinatura do Colaborador<br><br>\${nome}</div>
            </div>
            <div class="assin-row">
                <div class="assin-box">Testemunha 1<br><br>&nbsp;<br>&nbsp;</div>
                <div class="assin-box">Testemunha 2<br><br>&nbsp;<br>&nbsp;</div>
            </div>
        </div>`;

    if (server.includes(OLD_ASSIN)) {
        server = server.replace(OLD_ASSIN, NEW_ASSIN);
        console.log('✅ Signature blocks updated');
    }
}

fs.writeFileSync('backend/server.js', server);
console.log('Backend saved. Size:', server.length);

// ===== FRONTEND: Fix 1 - Update gerarFichaSantander to use dedicated endpoint =====
let app = fs.readFileSync('frontend/app.js', 'utf8');

// Replace the fetch call to use dedicated santander-status endpoint
const OLD_FETCH_SANTANDER = `// Salvar santander_ficha_data diretamente no colaborador (endpoint correto)
            await fetch(\`\${API_URL}/colaboradores/\${colab.id}\`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${currentToken}\` },
                body: JSON.stringify({ santander_ficha_data: colab.santander_ficha_data })
            });
            console.log('[Santander] Data salva no banco:', colab.santander_ficha_data);
        } catch(e) { console.error('[Santander] Erro ao salvar data:', e); }`;

const NEW_FETCH_SANTANDER = `// Salvar via endpoint dedicado (mais confiável)
            const saveRes = await fetch(\`\${API_URL}/colaboradores/\${colab.id}/santander-status\`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${currentToken}\` },
                body: JSON.stringify({ santander_ficha_data: colab.santander_ficha_data })
            });
            const saveData = await saveRes.json();
            console.log('[Santander] Resposta do servidor:', saveData);
        } catch(e) { console.error('[Santander] Erro ao salvar data:', e); }`;

if (app.includes(OLD_FETCH_SANTANDER)) {
    app = app.replace(OLD_FETCH_SANTANDER, NEW_FETCH_SANTANDER);
    console.log('✅ Frontend: usando endpoint dedicado santander-status');
} else {
    // Find and replace any /admissao or /colaboradores/:id call in the santander context
    const idx = app.indexOf('/santander-status');
    if (idx !== -1) {
        console.log('⚠️ Endpoint já atualizado anteriormente');
    } else {
        // Find the save call by a broader pattern
        const savePattern = app.indexOf('API_URL}/colaboradores/${colab.id}');
        console.log('⚠️ Pattern not found, savePattern at:', savePattern);
    }
}

// ===== FRONTEND: Fix 2 - Add eye button to multa card =====
// Find the card rendering code
const OLD_CARD_BUTTONS = `\${(m.status === 'pendente' || m.status === 'doc_gerado') ? \`
                <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
                    \${m.status === 'pendente' ? \`<button class="btn btn-sm btn-primary" onclick="window.continuarProcessoMulta(\${m.id}, '\${m.tipo_resolucao || ''}', \${colab.id})"><i class="ph ph-arrow-right"></i> Continuar Processo</button>\` : ''}
                    <button style="background:#fee2e2;color:#dc2626;border:1.5px solid #fca5a5;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.8rem;display:inline-flex;align-items:center;gap:4px;" onclick="window.excluirMulta(\${m.id}, \${colab.id}, this)">
                        <i class="ph ph-trash"></i> Excluir
                    </button>
                </div>\` : ''}`;

const NEW_CARD_BUTTONS = `<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
                    \${(m.status === 'pendente') ? \`<button class="btn btn-sm btn-primary" onclick="window.continuarProcessoMulta(\${m.id}, '\${m.tipo_resolucao || ''}', \${colab.id})"><i class="ph ph-arrow-right"></i> Continuar Processo</button>\` : ''}
                    \${(m.status === 'doc_gerado' || m.status === 'assinado' || m.status === 'confirmado') ? \`<button style="background:#dbeafe;color:#1d4ed8;border:1.5px solid #93c5fd;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.8rem;display:inline-flex;align-items:center;gap:4px;" onclick="window.verDocumentoMulta(\${m.id}, \${colab.id}, '\${m.tipo_resolucao || 'indicacao'}')"><i class="ph ph-eye"></i> Ver Documento</button>\` : ''}
                    \${(m.status === 'pendente' || m.status === 'doc_gerado') ? \`<button style="background:#fee2e2;color:#dc2626;border:1.5px solid #fca5a5;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.8rem;display:inline-flex;align-items:center;gap:4px;" onclick="window.excluirMulta(\${m.id}, \${colab.id}, this)"><i class="ph ph-trash"></i> Excluir</button>\` : ''}
                </div>`;

if (app.includes(OLD_CARD_BUTTONS)) {
    app = app.replace(OLD_CARD_BUTTONS, NEW_CARD_BUTTONS);
    console.log('✅ Eye button added to multa card');
} else {
    console.log('⚠️ OLD_CARD_BUTTONS not found exactly');
    // Try shorter match
    const idx2 = app.indexOf("window.continuarProcessoMulta(${m.id}");
    console.log('continuarProcessoMulta at:', idx2);
}

// Add verDocumentoMulta function if not present
if (!app.includes('window.verDocumentoMulta')) {
    const insertBefore = 'window.continuarProcessoMulta = async function';
    const fnInsert = `window.verDocumentoMulta = async function(multaId, colabId, tipo) {
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
    if (app.includes(insertBefore)) {
        app = app.replace(insertBefore, fnInsert + insertBefore);
        console.log('✅ verDocumentoMulta function added');
    }
}

fs.writeFileSync('frontend/app.js', app);
console.log('Frontend saved. Size:', app.length);
