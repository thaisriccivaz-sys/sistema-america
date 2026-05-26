import re

with open('frontend/sinistros.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find exact start/end markers
start_marker = '// =========================================================\n// MODAL: FINALIZAR SINISTRO (RH)'
end_marker = '\n\n'  # two blank lines at very end of file

start_idx = content.find(start_marker)
if start_idx == -1:
    start_marker = start_marker.replace('\n', '\r\n')
    start_idx = content.find(start_marker)

print(f"Start at: {start_idx}")

# Keep everything before start_idx
before = content[:start_idx]

new_block = r"""// =========================================================
// MODAL: FINALIZAR SINISTRO (RH) — Fluxo 2 etapas
// =========================================================

window.abrirFinalizarSinistro = async function(sinId, colabId) {
    document.getElementById('modal-fin-sin-step1')?.remove();
    document.getElementById('modal-finalizar-sinistro')?.remove();
    const sinistros = await apiGet(`/colaboradores/${colabId}/sinistros`);
    const s = (sinistros||[]).find(x => x.id == sinId);
    if (!s) return alert('Sinistro não encontrado.');

    if (s.assinatura_testemunha1_base64) {
        return window._abrirTelaCondutorSinistro(sinId, colabId);
    }

    const m = document.createElement('div');
    m.id = 'modal-fin-sin-step1';
    m.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;';
    const opcs = ['Danos em Terceiros e Nosso','Danos em Terceiros','Danos no Nosso Veículo','Outros Danos'];
    const parcOpts = [1,2,3,4,5,6].map(n=>`<option value="${n}" ${parseInt(s.parcelas||1)==n?'selected':''}>${n}x</option>`).join('');
    const tipoOpts = opcs.map(o=>`<option value="${o}" ${(s.tipo_sinistro||'')==o?'selected':''}>${o}</option>`).join('');
    m.innerHTML = `<div style="background:#fff;border-radius:16px;padding:2rem;width:480px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
        <h3 style="margin:0 0 1.5rem;font-size:1.15rem;font-weight:800;color:#0f172a;"><i class="ph ph-flag-checkered" style="color:#7c3aed;"></i> Finalizar Sinistro — Dados do Desconto</h3>
        <div style="display:flex;flex-direction:column;gap:1rem;">
            <div>
                <label style="font-size:0.85rem;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Tipo do Sinistro *</label>
                <select id="fs1-tipo" class="form-control"><option value="">Selecione...</option>${tipoOpts}</select>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
                <div>
                    <label style="font-size:0.85rem;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Valor Total do Desconto (R$) *</label>
                    <input type="text" id="fs1-valor" class="form-control" value="${s.valor_total||''}" placeholder="Ex: 1.200,00" oninput="window._fs1Calc()">
                </div>
                <div>
                    <label style="font-size:0.85rem;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Parcelas *</label>
                    <select id="fs1-parcelas" class="form-control" onchange="window._fs1Calc()">${parcOpts}</select>
                </div>
            </div>
            <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:0.75rem;text-align:center;">
                <span style="font-size:0.8rem;color:#166534;">Valor por parcela:</span>
                <strong id="fs1-display" style="color:#15803d;font-size:1.1rem;display:block;">R$ 0,00</strong>
            </div>
        </div>
        <div style="display:flex;gap:0.75rem;margin-top:1.5rem;">
            <button onclick="document.getElementById('modal-fin-sin-step1').remove()" style="flex:1;padding:10px;background:#f1f5f9;border:none;border-radius:8px;cursor:pointer;font-weight:600;color:#64748b;">Cancelar</button>
            <button id="fs1-btn-confirmar" onclick="window._fs1Confirmar(${sinId},${colabId})" style="flex:2;padding:10px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:0.95rem;">
                <i class="ph ph-file-text"></i> Finalizar e Anexar ao Prontuário
            </button>
        </div>
    </div>`;
    document.body.appendChild(m);
    setTimeout(() => window._fs1Calc(), 100);
};

window._fs1Calc = function() {
    const v = parseFloat((document.getElementById('fs1-valor')?.value||'0').replace(/[^0-9,]/g,'').replace(',','.')) || 0;
    const q = parseInt(document.getElementById('fs1-parcelas')?.value) || 1;
    const el = document.getElementById('fs1-display');
    if (el) el.innerText = 'R$ ' + (v/q).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
};

window._fs1Confirmar = async function(sinId, colabId) {
    const tipo = document.getElementById('fs1-tipo').value;
    const valorStr = document.getElementById('fs1-valor').value;
    const qtd = parseInt(document.getElementById('fs1-parcelas').value) || 1;
    if (!tipo) return alert('Selecione o Tipo do Sinistro.');
    const valorRaw = parseFloat(valorStr.replace(/[^0-9,]/g,'').replace(',','.')) || 0;
    if (valorRaw <= 0) return alert('Informe o valor do desconto (maior que zero).');
    const valorParcela = (valorRaw/qtd).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
    const btn = document.getElementById('fs1-btn-confirmar');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Gerando documento...'; }
    try {
        const token = localStorage.getItem('erp_token');
        await fetch(`${API_URL}/colaboradores/${colabId}/sinistros/${sinId}/dados-financeiros`, {
            method: 'PUT',
            headers: {'Content-Type':'application/json','Authorization':`Bearer ${token}`},
            body: JSON.stringify({tipo_sinistro:tipo, valor_total:valorStr, parcelas:qtd, valor_parcela:valorParcela})
        });
        const rGen = await fetch(`${API_URL}/colaboradores/${colabId}/sinistros/${sinId}/gerar-documento`, {
            method: 'POST', headers: {'Authorization':`Bearer ${token}`}
        });
        const genData = await rGen.json();
        document.getElementById('modal-fin-sin-step1').remove();
        const sinistros2 = await apiGet(`/colaboradores/${colabId}/sinistros`);
        const s2 = (sinistros2||[]).find(x => x.id == sinId) || {};
        await window._abrirTelaAssinaturaSinistro(sinId, colabId, genData.html || '', s2);
    } catch(e) {
        alert('Erro: ' + e.message);
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-file-text"></i> Finalizar e Anexar ao Prontuário'; }
    }
};

window._abrirTelaAssinaturaSinistro = async function(sinId, colabId, docHtml, s) {
    document.getElementById('modal-finalizar-sinistro')?.remove();
    const colabName = viewedColaborador?.nome_completo || s.nome_completo || 'Colaborador';
    const vParc = s.valor_parcela ? `R$ ${parseFloat(String(s.valor_parcela).replace(',','.')).toLocaleString('pt-BR',{minimumFractionDigits:2})}` : '—';
    const modal = document.createElement('div');
    modal.id = 'modal-finalizar-sinistro';
    modal.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.7);display:flex;align-items:stretch;';
    modal.innerHTML = `
        <div style="width:100%;height:100vh;display:flex;flex-direction:column;background:#0f172a;overflow:hidden;">
            <div style="flex-shrink:0;background:linear-gradient(90deg,#7c3aed,#4f46e5);padding:0.9rem 1.5rem;display:flex;align-items:center;justify-content:space-between;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <i class="ph ph-flag-checkered" style="font-size:1.4rem;color:#fff;"></i>
                    <h3 style="margin:0;color:#fff;font-size:1rem;font-weight:700;">Sinistro #${sinId} — ${colabName} &nbsp;|&nbsp; ${s.parcelas||1}x de ${vParc}</h3>
                </div>
                <div style="display:flex;gap:8px;">
                    <button onclick="window.abrirFinalizarSinistro(${sinId},${colabId})" style="background:rgba(255,255,255,0.15);border:none;color:#fff;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:0.85rem;"><i class="ph ph-pencil"></i> Editar Dados</button>
                    <button onclick="document.getElementById('modal-finalizar-sinistro').remove()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;border-radius:8px;padding:6px 16px;cursor:pointer;font-size:0.9rem;">✕ Fechar</button>
                </div>
            </div>
            <div style="flex:1;display:flex;overflow:hidden;">
                <div style="flex:1;overflow-y:auto;background:#e2e8f0;padding:1.5rem;">
                    <div style="background:white;margin:0 auto;width:21cm;min-height:29.7cm;padding:0;box-shadow:0 4px 24px rgba(0,0,0,0.18);border:1px solid #ddd;overflow:hidden;">
                        ${docHtml}
                    </div>
                </div>
                <div style="width:380px;flex-shrink:0;background:#1e293b;overflow-y:auto;display:flex;flex-direction:column;border-left:1px solid rgba(255,255,255,0.08);">
                    <div id="fin-painel-testemunhas" style="padding:1.25rem;display:flex;flex-direction:column;gap:1rem;">
                        <p style="color:#94a3b8;font-size:0.75rem;font-weight:700;text-transform:uppercase;margin:0;">✍️ Assinaturas das Testemunhas</p>
                        <div style="background:#0f172a;border-radius:10px;padding:1rem;">
                            <label style="color:#94a3b8;font-size:0.75rem;display:block;margin-bottom:4px;">Testemunha 1 *</label>
                            <select id="fin-t1-nome" class="form-control" style="background:#1e293b;color:#e2e8f0;border:1px solid #334155;margin-bottom:6px;"><option value="">Selecione...</option></select>
                            <div style="border:1px dashed #475569;border-radius:6px;background:#fff;overflow:hidden;">
                                <canvas id="fin-canvas-t1" style="width:100%;height:100px;cursor:crosshair;display:block;"></canvas>
                            </div>
                            <button onclick="window._sinLimparCanvas('fin-canvas-t1')" style="margin-top:4px;background:transparent;border:1px solid #475569;color:#94a3b8;border-radius:6px;padding:3px 10px;font-size:0.75rem;cursor:pointer;"><i class="ph ph-eraser"></i> Limpar</button>
                        </div>
                        <div style="background:#0f172a;border-radius:10px;padding:1rem;">
                            <label style="color:#94a3b8;font-size:0.75rem;display:block;margin-bottom:4px;">Testemunha 2 <span style="color:#475569;">(opcional)</span></label>
                            <select id="fin-t2-nome" class="form-control" style="background:#1e293b;color:#e2e8f0;border:1px solid #334155;margin-bottom:6px;"><option value="">Selecione...</option></select>
                            <div style="border:1px dashed #475569;border-radius:6px;background:#fff;overflow:hidden;">
                                <canvas id="fin-canvas-t2" style="width:100%;height:100px;cursor:crosshair;display:block;"></canvas>
                            </div>
                            <button onclick="window._sinLimparCanvas('fin-canvas-t2')" style="margin-top:4px;background:transparent;border:1px solid #475569;color:#94a3b8;border-radius:6px;padding:3px 10px;font-size:0.75rem;cursor:pointer;"><i class="ph ph-eraser"></i> Limpar</button>
                        </div>
                        <button id="btn-fin-testemunhas" onclick="window._finSalvarTestemunhas(${sinId},${colabId},false)" style="padding:0.9rem;background:#2563eb;color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer;"><i class="ph ph-check"></i> Confirmar Assinaturas das Testemunhas</button>
                        <button onclick="window._finSalvarTestemunhas(${sinId},${colabId},true)" style="padding:0.75rem;background:#7c3aed;color:#fff;border:none;border-radius:10px;font-weight:600;cursor:pointer;font-size:0.88rem;"><i class="ph ph-flag-checkered"></i> Finalizar sem assinatura do condutor</button>
                    </div>
                    <div id="fin-painel-condutor" style="display:none;padding:1.25rem;flex-direction:column;gap:1rem;">
                        <p style="color:#94a3b8;font-size:0.75rem;font-weight:700;text-transform:uppercase;margin:0;">✅ Testemunhas Assinadas</p>
                        <p style="color:#e2e8f0;font-size:0.95rem;margin:0;">O colaborador irá assinar o documento?</p>
                        <div style="display:flex;gap:0.75rem;">
                            <button onclick="window._finMostrarAssinaturaCondutor()" style="flex:1;padding:0.85rem;background:#059669;color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer;"><i class="ph ph-check"></i> Sim, vai assinar</button>
                            <button onclick="window._finFinalizar(${sinId},${colabId},false)" style="flex:1;padding:0.85rem;background:#475569;color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer;"><i class="ph ph-x"></i> Não</button>
                        </div>
                    </div>
                    <div id="fin-painel-ass-condutor" style="display:none;padding:1.25rem;flex-direction:column;gap:1rem;">
                        <p style="color:#94a3b8;font-size:0.75rem;font-weight:700;text-transform:uppercase;margin:0;">✍️ Assinatura do Condutor</p>
                        <div style="background:#0f172a;border-radius:10px;padding:1rem;">
                            <label style="color:#e2e8f0;font-size:0.85rem;font-weight:600;display:block;margin-bottom:8px;">Assinatura de: <span style="color:#f59e0b;">${colabName}</span></label>
                            <div style="border:2px dashed #f59e0b;border-radius:8px;overflow:hidden;">
                                <canvas id="fin-canvas-condutor" style="width:100%;height:160px;cursor:crosshair;display:block;background:#fff;"></canvas>
                            </div>
                            <button onclick="window._sinLimparCanvas('fin-canvas-condutor')" style="margin-top:6px;background:transparent;border:1px solid #475569;color:#94a3b8;border-radius:6px;padding:4px 12px;font-size:0.78rem;cursor:pointer;"><i class="ph ph-eraser"></i> Limpar</button>
                        </div>
                        <button id="btn-fin-condutor" onclick="window._finFinalizar(${sinId},${colabId},true)" style="padding:1rem;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border:none;border-radius:12px;font-weight:700;font-size:1rem;cursor:pointer;"><i class="ph ph-check-circle"></i> Confirmar e Finalizar Sinistro</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    window._finalizarSinistroDocHtml = docHtml;

    try {
        const colabs = await apiGet('/colaboradores') || [];
        const outros = colabs.filter(c => String(c.id) !== String(colabId));
        let opts = '<option value="">Selecione...</option>';
        outros.forEach(c => { const n = c.nome_completo || c.nome || ''; if (n) opts += `<option value="${n}">${n}</option>`; });
        ['fin-t1-nome','fin-t2-nome'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = opts; });
    } catch(e) {}

    setTimeout(() => {
        ['fin-canvas-t1','fin-canvas-t2'].forEach(id => window._sinSetupCanvas(id));
    }, 250);
};

window._sinLimparCanvas = function(id) {
    const c = document.getElementById(id); if (!c) return;
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
};
window._sinLimparCanvasFinalizar = function() { window._sinLimparCanvas('fin-canvas-condutor'); };
window._calcFinSinParcela = function() {};

window._finSalvarTestemunhas = async function(sinId, colabId, finalizarSemCondutor) {
    const t1Nome = document.getElementById('fin-t1-nome').value;
    if (!t1Nome) return alert('Selecione pelo menos a Testemunha 1.');
    if (!window._sinCanvasTemConteudo('fin-canvas-t1')) return alert('A Testemunha 1 precisa assinar.');
    const t1Ass = document.getElementById('fin-canvas-t1').toDataURL('image/png');
    const t2Nome = document.getElementById('fin-t2-nome')?.value || '';
    const t2Ass = window._sinCanvasTemConteudo('fin-canvas-t2') ? document.getElementById('fin-canvas-t2').toDataURL('image/png') : null;
    let docHtml = window._finalizarSinistroDocHtml || '';
    const injectTest = `<div style="margin-top:16px;padding:10px;border-top:2px solid #e2e8f0;"><p style="font-weight:700;font-size:11px;">ASSINATURAS DAS TESTEMUNHAS:</p><div style="display:flex;gap:20px;"><div style="text-align:center;"><img src="${t1Ass}" style="max-width:180px;max-height:60px;border-bottom:1px solid #000;"><p style="font-size:10px;margin:2px 0;">${t1Nome}</p></div>${t2Ass&&t2Nome?`<div style="text-align:center;"><img src="${t2Ass}" style="max-width:180px;max-height:60px;border-bottom:1px solid #000;"><p style="font-size:10px;margin:2px 0;">${t2Nome}</p></div>`:''}</div></div>`;
    docHtml = docHtml.replace('</body>', injectTest + '</body>');
    window._finalizarSinistroDocHtml = docHtml;
    const btn = document.getElementById('btn-fin-testemunhas');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...'; }
    try {
        const res = await fetch(`${API_URL}/colaboradores/${colabId}/sinistros/${sinId}/assinar-testemunhas`, {
            method: 'POST',
            headers: {'Content-Type':'application/json','Authorization':`Bearer ${localStorage.getItem('erp_token')}`},
            body: JSON.stringify({t1_nome:t1Nome, t1_base64:t1Ass, t2_nome:t2Nome||null, t2_base64:t2Ass, html_atualizado:docHtml, finalizar_sem_condutor:finalizarSemCondutor})
        });
        const data = await res.json();
        if (!data.sucesso) throw new Error(data.error);
        if (finalizarSemCondutor) {
            document.getElementById('modal-finalizar-sinistro')?.remove();
            if (typeof Toastify !== 'undefined') Toastify({text:'Sinistro finalizado pelas testemunhas!', backgroundColor:'#059669'}).showToast();
            await window._recarregarListaSinistros(colabId);
        } else {
            document.getElementById('fin-painel-testemunhas').style.display = 'none';
            const p = document.getElementById('fin-painel-condutor');
            p.style.display = 'flex'; p.style.flexDirection = 'column';
        }
    } catch(e) {
        alert('Erro: ' + e.message);
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-check"></i> Confirmar Assinaturas das Testemunhas'; }
    }
};

window._finMostrarAssinaturaCondutor = function() {
    document.getElementById('fin-painel-condutor').style.display = 'none';
    const p = document.getElementById('fin-painel-ass-condutor');
    p.style.display = 'flex'; p.style.flexDirection = 'column';
    setTimeout(() => window._sinSetupCanvas('fin-canvas-condutor'), 150);
};

window._finFinalizar = async function(sinId, colabId, comCondutor) {
    const colabName = viewedColaborador?.nome_completo || 'Colaborador';
    let docHtml = window._finalizarSinistroDocHtml || '';
    let assinaturaBase64 = null;
    if (comCondutor) {
        if (!window._sinCanvasTemConteudo('fin-canvas-condutor')) return alert('O colaborador precisa assinar.');
        assinaturaBase64 = document.getElementById('fin-canvas-condutor').toDataURL('image/png');
        const inj = `<div style="margin-top:20px;padding:10px;border-top:2px solid #e2e8f0;"><p style="font-weight:700;font-size:11px;">ASSINATURA DO CONDUTOR:</p><div style="text-align:center;width:200px;"><img src="${assinaturaBase64}" style="max-width:180px;max-height:60px;border-bottom:1px solid #000;"><p style="font-size:10px;margin:2px 0;">${colabName}</p></div></div>`;
        docHtml = docHtml.replace('</body>', inj + '</body>');
    }
    const btn = document.getElementById('btn-fin-condutor');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Finalizando...'; }
    try {
        const res = await fetch(`${API_URL}/colaboradores/${colabId}/sinistros/${sinId}/assinar-condutor`, {
            method: 'POST',
            headers: {'Content-Type':'application/json','Authorization':`Bearer ${localStorage.getItem('erp_token')}`},
            body: JSON.stringify({assinatura_base64:assinaturaBase64, documento_html:docHtml})
        });
        const data = await res.json();
        if (!data.sucesso) throw new Error(data.error || 'Erro ao finalizar.');
        document.getElementById('modal-finalizar-sinistro')?.remove();
        if (typeof Toastify !== 'undefined') Toastify({text:'✅ Sinistro finalizado e assinado!', backgroundColor:'#059669', duration:4000}).showToast();
        await window._recarregarListaSinistros(colabId);
    } catch(e) {
        alert('Erro ao finalizar: ' + e.message);
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-check-circle"></i> Confirmar e Finalizar Sinistro'; }
    }
};

window._abrirTelaCondutorSinistro = async function(sinId, colabId) {
    const sinistros = await apiGet(`/colaboradores/${colabId}/sinistros`);
    const s = (sinistros||[]).find(x => x.id == sinId) || {};
    await window._abrirTelaAssinaturaSinistro(sinId, colabId, s.documento_html || '', s);
    setTimeout(() => {
        document.getElementById('fin-painel-testemunhas').style.display = 'none';
        const p = document.getElementById('fin-painel-condutor');
        if (p) { p.style.display = 'flex'; p.style.flexDirection = 'column'; }
    }, 400);
};
"""

with open('frontend/sinistros.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the block to replace
start_tag = '// =========================================================\r\n// MODAL: FINALIZAR SINISTRO (RH)'
if start_tag not in content:
    start_tag = start_tag.replace('\r\n', '\n')

start_idx = content.find(start_tag)
print(f"Found at index: {start_idx}")

before = content[:start_idx]
new_content = before + new_block

with open('frontend/sinistros.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Done! Lines written:", new_content.count('\n'))
