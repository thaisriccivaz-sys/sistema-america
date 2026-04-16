// MOCK APPEND: Lógica de Assinatura Isolada
window.abrirModalAssinaturaTestemunhasSinistro = async function(sinId, colabId) {
    let sinistros = await apiGet(\`/colaboradores/\${colabId}/sinistros\`);
    let s = sinistros.find(x => x.id == sinId);
    if(!s || !s.documento_html) return alert('HTML do documento não encontrado!');

    let modal = document.getElementById('modal-testemunhas-sinistro');
    if(modal) modal.remove();

    window._sinistroDocHtmlTestemunhas = s.documento_html;

    modal = document.createElement('div');
    modal.id = 'modal-testemunhas-sinistro';
    modal.className = 'modal';
    modal.style = 'align-items:flex-start;';
    
    // Testemunhas dropdown
    let options = '<option value="">Selecione...</option>';
    if (window._testemunhasCache) {
        window._testemunhasCache.forEach(t => { options += \`<option value="\${t.NOME_COMPLETO}">\${t.NOME_COMPLETO}</option>\`; });
    }

    modal.innerHTML = \`
        <div class="modal-content" style="width:100%; max-width:100%; height:100vh; max-height:100vh; margin:0; border-radius:0; display:flex; flex-direction:column; background:#0f172a; overflow:hidden;">
            <div class="modal-header" style="flex-shrink:0; background:#1e293b; padding:0.85rem 1.5rem; display:flex; align-items:center; justify-content:space-between; border-bottom:none;">
                <h3 style="margin:0; color:#fff; font-size:1rem;"><i class="ph ph-users" style="color:#a78bfa;"></i> Assinatura de Testemunhas - Sinistro #\${s.id}</h3>
                <button onclick="document.getElementById('modal-testemunhas-sinistro').remove()" style="background:rgba(255,255,255,0.1); border:none; color:#fff; border-radius:8px; padding:6px 14px; cursor:pointer; font-size:0.9rem;">Fechar</button>
            </div>
            <div class="modal-body" style="padding:0; flex:1; display:flex; overflow:hidden;">
                <!-- Esquerda -->
                <div style="flex:1; overflow-y:auto; background:#f1f5f9; padding:1rem; display:flex; flex-direction:column;">
                    <div style="background:#fff; border-radius:8px; padding:20px; box-shadow:0 1px 3px rgba(0,0,0,0.1); min-height:800px;">
                        \${s.documento_html}
                    </div>
                </div>
                <!-- Direita -->
                <div style="width:360px; background:#fff; overflow-y:auto; padding:1.5rem 1.5rem 6rem 1.5rem; display:flex; flex-direction:column; gap:1.25rem; border-left:1px solid #e2e8f0; flex-shrink:0;">
                    <div>
                        <label style="font-weight:700; font-size:0.85rem; display:block; margin-bottom:6px;">Testemunha 1</label>
                        <select id="sin-t1-nome" class="form-control mb-2" style="width:100%;">\${options}</select>
                        <div style="border: 2px dashed #cbd5e1; background:#f8fafc; border-radius:8px; margin-bottom:0.5rem;">
                            <canvas id="sin-canvas-t1" style="width:100%; height:130px; cursor:crosshair;"></canvas>
                        </div>
                    </div>
                    <div>
                        <label style="font-weight:700; font-size:0.85rem; display:block; margin-bottom:6px;">Testemunha 2 <span style="font-size:0.8rem; font-weight:400; color:#94a3b8;">(opcional)</span></label>
                        <select id="sin-t2-nome" class="form-control mb-2" style="width:100%;">\${options}</select>
                        <div style="border: 2px dashed #cbd5e1; background:#f8fafc; border-radius:8px; margin-bottom:0.5rem;">
                            <canvas id="sin-canvas-t2" style="width:100%; height:130px; cursor:crosshair;"></canvas>
                        </div>
                    </div>
                    <button type="button" id="btn-conf-t-sin" onclick="window.salvarAssinaturaTestemunhasSinistro(\${sinId}, \${colabId})" style="padding:0.85rem; background:#2563eb; color:#fff; border:none; border-radius:10px; font-weight:700; font-size:1rem; cursor:pointer;"><i class="ph ph-check"></i> Salvar Assinaturas</button>
                </div>
            </div>
        </div>
    \`;
    document.body.appendChild(modal);
    modal.style.display = 'flex';

    setTimeout(() => {
        window._configurarCanvasMultiplo('sin-canvas-t1');
        window._configurarCanvasMultiplo('sin-canvas-t2');
    }, 100);
};

window.salvarAssinaturaTestemunhasSinistro = async function(sinId, colabId) {
    const t1Nome = document.getElementById('sin-t1-nome').value;
    const t2Nome = document.getElementById('sin-t2-nome').value;
    const c1 = document.getElementById('sin-canvas-t1');
    const c2 = document.getElementById('sin-canvas-t2');

    if (!t1Nome) return alert('Selecione a Testemunha 1.');
    if (!window._canvasTemConteudo('sin-canvas-t1')) return alert('A Testemunha 1 precisa assinar.');

    const t1Ass = c1.toDataURL('image/png');
    const t2Ass = (c2 && window._canvasTemConteudo('sin-canvas-t2')) ? c2.toDataURL('image/png') : null;

    let docHtmlComAssinaturas = window._sinistroDocHtmlTestemunhas || '';
    if (docHtmlComAssinaturas) {
        const inject = \`
            <div style="margin-top:20px;padding:10px;border-top:2px solid #e2e8f0;">
                <p style="font-weight:700;font-size:11px;">ASSINATURAS DAS TESTEMUNHAS:</p>
                <div style="display:flex;gap:20px;">
                    <div style="text-align:center;">
                        <img src="\${t1Ass}" style="max-width:180px;max-height:60px;border-bottom:1px solid #000;">
                        <p style="font-size:10px;margin:2px 0;">\${t1Nome}</p>
                    </div>
                    \${t2Ass && t2Nome ? \`<div style="text-align:center;">
                        <img src="\${t2Ass}" style="max-width:180px;max-height:60px;border-bottom:1px solid #000;">
                        <p style="font-size:10px;margin:2px 0;">\${t2Nome}</p>
                    </div>\` : ''}
                </div>
            </div>\`;
        docHtmlComAssinaturas = docHtmlComAssinaturas.replace('</body>', inject + '</body>');
    }

    try {
        const res = await fetch(\`\${API_URL}/colaboradores/\${colabId}/sinistros/\${sinId}/assinar-testemunhas\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${localStorage.getItem('token')}\` },
            body: JSON.stringify({ t1_nome: t1Nome, t1_base64: t1Ass, t2_nome: t2Nome || null, t2_base64: t2Ass, html_atualizado: docHtmlComAssinaturas })
        });
        const data = await res.json();
        if(!data.sucesso) throw new Error(data.error);

        document.getElementById('modal-testemunhas-sinistro').remove();
        Toastify({ text: "Testemunhas assinadas!", backgroundColor: "green" }).showToast();
        await window._recarregarListaSinistros(colabId);
    } catch(e) { alert(e.message); }
};

window.abrirModalAssinaturaCondutorSinistro = async function(sinId, colabId) {
    let sinistros = await apiGet(\`/colaboradores/\${colabId}/sinistros\`);
    let s = sinistros.find(x => x.id == sinId);
    if(!s || !s.documento_html) return alert('HTML do documento não encontrado!');

    let modal = document.getElementById('modal-condutor-sinistro');
    if(modal) modal.remove();

    window._sinistroDocHtmlCondutor = s.documento_html;

    modal = document.createElement('div');
    modal.id = 'modal-condutor-sinistro';
    modal.className = 'modal';
    modal.style = 'align-items:flex-start;';

    const colabName = window._currentColaboradorForProntuario.nome_completo;

    modal.innerHTML = \`
        <div class="modal-content" style="width:100%; max-width:100%; height:100vh; max-height:100vh; margin:0; border-radius:0; display:flex; flex-direction:column; background:#0f172a; overflow:hidden;">
            <div class="modal-header" style="flex-shrink:0; background:#1e293b; padding:0.85rem 1.5rem; display:flex; align-items:center; justify-content:space-between; border-bottom:none;">
                <h3 style="margin:0; color:#fff; font-size:1rem;"><i class="ph ph-pen" style="color:#d97706;"></i> Assinatura do Condutor - Sinistro #\${s.id}</h3>
                <button onclick="document.getElementById('modal-condutor-sinistro').remove()" style="background:rgba(255,255,255,0.1); border:none; color:#fff; border-radius:8px; padding:6px 14px; cursor:pointer; font-size:0.9rem;">Fechar</button>
            </div>
            <div class="modal-body" style="padding:0; flex:1; display:flex; overflow:hidden;">
                <!-- Esquerda -->
                <div style="flex:1; overflow-y:auto; background:#f1f5f9; padding:1rem; display:flex; flex-direction:column;">
                    <div style="background:#fff; border-radius:8px; padding:20px; box-shadow:0 1px 3px rgba(0,0,0,0.1); min-height:800px;">
                        \${s.documento_html}
                    </div>
                </div>
                <!-- Direita -->
                <div style="width:360px; background:#fff; overflow-y:auto; padding:1.5rem 1.5rem 6rem 1.5rem; display:flex; flex-direction:column; gap:1.25rem; border-left:1px solid #e2e8f0; flex-shrink:0;">
                    <div>
                        <label style="font-weight:700; font-size:0.85rem; display:block; margin-bottom:6px;">Assinatura de: <span style="color:#d97706;">\${colabName}</span></label>
                        <div style="border: 2px dashed #fcd34d; background:#f8fafc; border-radius:8px; margin-bottom:0.5rem;">
                            <canvas id="sin-canvas-condutor" style="width:100%; height:160px; cursor:crosshair;"></canvas>
                        </div>
                    </div>
                    <button type="button" onclick="window.salvarAssinaturaCondutorSinistro(\${sinId}, \${colabId})" style="padding:0.85rem; background:#2563eb; color:#fff; border:none; border-radius:10px; font-weight:700; font-size:1rem; cursor:pointer;"><i class="ph ph-check"></i> Salvar Assinatura do Condutor</button>
                </div>
            </div>
        </div>
    \`;
    document.body.appendChild(modal);
    modal.style.display = 'flex';

    setTimeout(() => { window._configurarCanvasMultiplo('sin-canvas-condutor'); }, 100);
};

window.salvarAssinaturaCondutorSinistro = async function(sinId, colabId) {
    const colabName = window._currentColaboradorForProntuario.nome_completo;
    if (!window._canvasTemConteudo('sin-canvas-condutor')) return alert('Assine o documento primeiro.');

    const assinaturaBase64 = document.getElementById('sin-canvas-condutor').toDataURL('image/png');
    let docHtmlComAssinaturas = window._sinistroDocHtmlCondutor || '';
    
    if (docHtmlComAssinaturas) {
        // Coloca a assinatura do condutor acima/antes das testemunhas
        const inject = \`
            <div style="margin-top:20px;padding:10px;border-top:2px solid #e2e8f0;">
                <p style="font-weight:700;font-size:11px;">ASSINATURA DO CONDUTOR:</p>
                <div style="text-align:center; width:200px;">
                    <img src="\${assinaturaBase64}" style="max-width:180px;max-height:60px;border-bottom:1px solid #000;">
                    <p style="font-size:10px;margin:2px 0;">\${colabName}</p>
                </div>
            </div>\`;
        
        if (docHtmlComAssinaturas.includes('ASSINATURAS DAS TESTEMUNHAS:')) {
            docHtmlComAssinaturas = docHtmlComAssinaturas.replace(
                '<div style="margin-top:20px;padding:10px;border-top:2px solid #e2e8f0;">', 
                inject + '<div style="margin-top:20px;padding:10px;border-top:2px solid #e2e8f0;">'
            );
        } else {
            docHtmlComAssinaturas = docHtmlComAssinaturas.replace('</body>', inject + '</body>');
        }
    }

    try {
        const res = await fetch(\`\${API_URL}/colaboradores/\${colabId}/sinistros/\${sinId}/assinar-condutor\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${localStorage.getItem('token')}\` },
            body: JSON.stringify({ assinatura_base64: assinaturaBase64, documento_html: docHtmlComAssinaturas })
        });
        const data = await res.json();
        if(!data.sucesso) throw new Error(data.error);

        document.getElementById('modal-condutor-sinistro').remove();
        Toastify({ text: "Condutor assinado!", backgroundColor: "green" }).showToast();
        await window._recarregarListaSinistros(colabId);
    } catch(e) { alert(e.message); }
};
