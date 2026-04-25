const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'app.js');
let content = fs.readFileSync(filePath, 'utf8');

// Marcador de início exato (único no arquivo)
const startMarker = 'window.renderContratosTab = async function(container) {\r\n    container.innerHTML = \'<p class="text-muted" style="padding:1rem;">Carregando contratos configurados para este departamento...</p>\'';
const endMarker = '}\r\n\r\nwindow.initAdmissaoWorkflow';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker, startIdx);

if (startIdx === -1) {
  console.error('START MARKER NOT FOUND');
  process.exit(1);
}
if (endIdx === -1) {
  console.error('END MARKER NOT FOUND');
  process.exit(1);
}

console.log(`Found block: lines ${content.substring(0, startIdx).split('\n').length} to ${content.substring(0, endIdx).split('\n').length}`);

const NOVO_CONTRATOS = `window.renderContratosTab = async function(container) {
    if (!viewedColaborador) return;
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.innerHTML = \`
        <div style="display:flex; gap:4px; border-bottom:2px solid #e2e8f0; margin-bottom:1.25rem;">
            <button id="sub-tab-btn-admissao"
                style="padding:0.55rem 1.2rem; border:none; border-radius:8px 8px 0 0; font-weight:700; cursor:pointer; background:var(--primary-color); color:#fff; font-size:0.88rem; display:flex; align-items:center; gap:6px;">
                <i class="ph ph-briefcase"></i> Contratos de Admissão
            </button>
            <button id="sub-tab-btn-avulso"
                style="padding:0.55rem 1.2rem; border:none; border-radius:8px 8px 0 0; font-weight:600; cursor:pointer; background:#f1f5f9; color:#64748b; font-size:0.88rem; display:flex; align-items:center; gap:6px;">
                <i class="ph ph-file-plus"></i> Contratos
            </button>
        </div>
        <div id="contratos-sub-admissao">
            <p class="text-muted" style="padding:0.5rem;"><i class="ph ph-spinner ph-spin"></i> Carregando...</p>
        </div>
        <div id="contratos-sub-avulso" style="display:none;">
            <p class="text-muted" style="padding:0.5rem;"><i class="ph ph-spinner ph-spin"></i> Carregando geradores...</p>
        </div>\`;
    container.appendChild(wrapper);

    window._contratosAvulsoLoaded = false;

    window.switchContratosSubTab = function(tab) {
        const admDiv = document.getElementById('contratos-sub-admissao');
        const avDiv  = document.getElementById('contratos-sub-avulso');
        const btnAdm = document.getElementById('sub-tab-btn-admissao');
        const btnAv  = document.getElementById('sub-tab-btn-avulso');
        if (tab === 'admissao') {
            if (admDiv) admDiv.style.display = '';
            if (avDiv)  avDiv.style.display  = 'none';
            if (btnAdm) { btnAdm.style.background = 'var(--primary-color)'; btnAdm.style.color = '#fff'; }
            if (btnAv)  { btnAv.style.background  = '#f1f5f9'; btnAv.style.color  = '#64748b'; }
        } else {
            if (admDiv) admDiv.style.display = 'none';
            if (avDiv)  avDiv.style.display  = '';
            if (btnAdm) { btnAdm.style.background = '#f1f5f9'; btnAdm.style.color = '#64748b'; }
            if (btnAv)  { btnAv.style.background  = 'var(--primary-color)'; btnAv.style.color  = '#fff'; }
            if (!window._contratosAvulsoLoaded) {
                window._contratosAvulsoLoaded = true;
                const avDiv2 = document.getElementById('contratos-sub-avulso');
                if (avDiv2) window.renderContratosAvulso(avDiv2);
            }
        }
    };

    document.getElementById('sub-tab-btn-admissao').onclick = () => window.switchContratosSubTab('admissao');
    document.getElementById('sub-tab-btn-avulso').onclick   = () => window.switchContratosSubTab('avulso');

    try {
        const [depts, geradores, templates, assinaturas, docs] = await Promise.all([
            apiGet('/departamentos'),
            apiGet('/geradores'),
            apiGet('/gerador-departamento-templates').catch(() => []),
            apiGet(\`/admissao-assinaturas/\${viewedColaborador.id}\`).catch(() => []),
            apiGet(\`/colaboradores/\${viewedColaborador.id}/documentos\`).catch(() => [])
        ]);

        window._todosGeradores = geradores;

        let availableGeradores = [];
        const empDeptId = viewedColaborador.departamento;
        const deptObj = depts.find(d =>
            String(d.id) === String(empDeptId) ||
            d.nome.trim().toLowerCase() === String(empDeptId).trim().toLowerCase()
        );
        if (deptObj) {
            const geradorIds = [...new Set(templates
                .filter(t => Number(t.departamento_id) === Number(deptObj.id))
                .map(t => Number(t.gerador_id)))];
            const seen1 = new Set();
            availableGeradores = geradores.filter(g => geradorIds.includes(Number(g.id)) && !seen1.has(Number(g.id)) && seen1.add(Number(g.id)));
        }

        window._admissaoGeradores = availableGeradores;
        window._admissaoAssinaturas = assinaturas;

        const admDiv = document.getElementById('contratos-sub-admissao');
        if (admDiv) {
            if (availableGeradores.length > 0) {
                let html = \`
                    <div class="alert alert-info mb-3">
                        <i class="ph ph-info"></i> Contratos configurados via <b>Admissão</b> para o departamento deste colaborador.
                    </div>
                    <div id="contratos-signature-list" style="display:flex;flex-direction:column;gap:0.75rem;margin-bottom:1.5rem;">\`;
                html += window.buildAdmissaoSignatureRows(availableGeradores, assinaturas, docs, viewedColaborador);
                html += \`</div>
                    <div style="background:#f8fafc; padding:15px; border-radius:8px; border:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                        <div>
                            <div style="font-weight:700; color:#0f172a; margin-bottom:4px;">Envio para Assinatura Digital</div>
                            <div style="font-size:0.78rem; color:#64748b;">Documentos enviados ao e-mail do colaborador via Assinafy.</div>
                        </div>
                        <button id="btn-enviar-contratos" class="btn btn-primary" onclick="window.sendAdmissaoSignatures('contratos-signature-list','btn-enviar-contratos')" style="display:flex;align-items:center;gap:5px;">
                            <i class="ph ph-paper-plane-tilt"></i> Enviar para Assinatura
                        </button>
                    </div>\`;
                admDiv.innerHTML = html;
            } else {
                admDiv.innerHTML = \`<p class="text-muted" style="padding:1rem;text-align:center;">
                    Nenhum contrato configurado para o departamento <b>\${deptObj ? deptObj.nome : (empDeptId || 'Não Informado')}</b>.<br>
                    <small>Configure em <b>Geradores → Templates por Departamento</b>.</small>
                </p>\`;
            }
        }
    } catch(err) {
        const admDiv = document.getElementById('contratos-sub-admissao');
        if (admDiv) admDiv.innerHTML = \`<div class="alert alert-danger"><i class="ph ph-warning"></i> Erro: \${err.message}</div>\`;
    }
};

// === SUB-ABA CONTRATOS AVULSOS ===
window.renderContratosAvulso = async function(container) {
    if (!viewedColaborador || !container) return;
    container.innerHTML = '<p class="text-muted"><i class="ph ph-spinner ph-spin"></i> Carregando...</p>';
    try {
        const geradores = window._todosGeradores || await apiGet('/geradores');
        window._todosGeradores = geradores;

        let contratosAvulsos = [];
        try { contratosAvulsos = await apiGet(\`/colaboradores/\${viewedColaborador.id}/contratos-avulsos\`) || []; } catch(e) {}

        container.innerHTML = '';

        const infoEl = document.createElement('div');
        infoEl.className = 'alert alert-info mb-3';
        infoEl.innerHTML = '<i class="ph ph-info"></i> Gere qualquer contrato da lista de <b>Geradores</b> e solicite assinatura bilateral: colaborador via <b>Assinafy</b> + empresa via <b>Certificado Digital A1</b>.';
        container.appendChild(infoEl);

        const btnNovo = document.createElement('button');
        btnNovo.className = 'btn btn-primary';
        btnNovo.style.cssText = 'margin-bottom:1.25rem;display:flex;align-items:center;gap:6px;';
        btnNovo.innerHTML = '<i class="ph ph-plus"></i> Gerar Novo Contrato';
        btnNovo.onclick = () => window.abrirModalContratoAvulso(geradores);
        container.appendChild(btnNovo);

        if (contratosAvulsos.length === 0) {
            const vazio = document.createElement('div');
            vazio.className = 'alert alert-info';
            vazio.innerHTML = '<i class="ph ph-file-text"></i> Nenhum contrato gerado ainda. Clique em "Gerar Novo Contrato" para começar.';
            container.appendChild(vazio);
        } else {
            contratosAvulsos.forEach(c => {
                const card = document.createElement('div');
                card.style.cssText = 'border:1.5px solid #e2e8f0;border-radius:12px;padding:1rem;margin-bottom:0.75rem;background:#fff;';
                const cores = { pendente:'#f59e0b', enviado:'#3b82f6', assinado:'#10b981', cancelado:'#ef4444' };
                const labels = { pendente:'Pendente', enviado:'Enviado', assinado:'Assinado', cancelado:'Cancelado' };
                const cor = cores[c.status] || '#64748b';
                card.innerHTML = \`
                    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                        <span style="font-weight:700;color:#1e293b;font-size:0.95rem;"><i class="ph ph-file-text"></i> \${c.gerador_nome || 'Contrato'}</span>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span style="color:#94a3b8;font-size:0.78rem;">\${c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : ''}</span>
                            <span style="background:\${cor}20;color:\${cor};font-weight:700;font-size:0.75rem;padding:3px 10px;border-radius:20px;">\${labels[c.status] || c.status}</span>
                        </div>
                    </div>
                    \${c.status === 'pendente' ? \`<button class="btn btn-sm btn-primary" style="margin-top:8px;" onclick="window.enviarContratoAvulsoAssinatura(\${c.id},'\${(c.gerador_nome||'').replace(/'/g, "\\\\'")}')"><i class="ph ph-paper-plane-tilt"></i> Enviar para Assinatura</button>\` : ''}\`;
                container.appendChild(card);
            });
        }
    } catch(err) {
        container.innerHTML = \`<div class="alert alert-danger"><i class="ph ph-warning"></i> Erro: \${err.message}</div>\`;
    }
};

window.abrirModalContratoAvulso = function(geradores) {
    document.getElementById('modal-contrato-avulso')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'modal-contrato-avulso';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;';
    const opts = (geradores||[]).map(g => \`<option value="\${g.id}" data-nome="\${(g.nome||'').replace(/"/g,'&quot;')}">\${g.nome}</option>\`).join('');
    overlay.innerHTML = \`
        <div style="background:#fff;border-radius:14px;width:100%;max-width:520px;box-shadow:0 20px 60px rgba(0,0,0,0.2);overflow:hidden;">
            <div style="padding:1rem 1.5rem;border-bottom:1.5px solid #e2e8f0;background:#f8fafc;display:flex;justify-content:space-between;align-items:center;">
                <h3 style="margin:0;font-size:1rem;font-weight:700;color:#0f172a;"><i class="ph ph-file-plus"></i> Gerar Novo Contrato</h3>
                <button onclick="document.getElementById('modal-contrato-avulso').remove()" style="background:#f1f5f9;border:1px solid #e2e8f0;width:30px;height:30px;border-radius:8px;cursor:pointer;color:#64748b;display:flex;align-items:center;justify-content:center;"><i class="ph ph-x"></i></button>
            </div>
            <div style="padding:1.5rem;display:flex;flex-direction:column;gap:1rem;">
                <div>
                    <label style="font-size:0.82rem;font-weight:700;color:#374151;display:block;margin-bottom:6px;">Selecionar Documento (Gerador)</label>
                    <select id="ca-gerador-select" style="width:100%;padding:0.65rem;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                        <option value="">Selecione o documento...</option>
                        \${opts}
                    </select>
                </div>
                <div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:10px;padding:1rem;font-size:0.85rem;color:#1d4ed8;">
                    <b><i class="ph ph-shield-check"></i> Assinaturas bilaterais:</b><br>
                    &bull; Colaborador: <b>Assinafy</b> (por e-mail)<br>
                    &bull; Empresa: <b>Certificado Digital A1</b>
                </div>
                <div id="ca-msg" style="display:none;"></div>
                <div style="display:flex;justify-content:flex-end;gap:0.75rem;">
                    <button onclick="document.getElementById('modal-contrato-avulso').remove()" class="btn btn-secondary">Cancelar</button>
                    <button id="ca-btn-gerar" class="btn btn-primary" onclick="window.gerarContratoAvulso()" style="display:flex;align-items:center;gap:6px;">
                        <i class="ph ph-file-arrow-down"></i> Gerar e Enviar para Assinatura
                    </button>
                </div>
            </div>
        </div>\`;
    document.body.appendChild(overlay);
};

window.gerarContratoAvulso = async function() {
    const select      = document.getElementById('ca-gerador-select');
    const btn         = document.getElementById('ca-btn-gerar');
    const msgEl       = document.getElementById('ca-msg');
    const geradorId   = select ? select.value : '';
    const geradorNome = select ? (select.options[select.selectedIndex]?.getAttribute('data-nome') || '') : '';
    if (!geradorId) { if(msgEl){msgEl.style.display='block';msgEl.className='alert alert-warning';msgEl.textContent='Selecione um documento.';} return; }
    if (!viewedColaborador) return;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Gerando...'; }
    if (msgEl) msgEl.style.display = 'none';
    try {
        const res = await fetch(\`\${API_URL}/geradores/\${geradorId}/gerar\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${currentToken}\` },
            body: JSON.stringify({ colaborador_id: viewedColaborador.id })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao gerar documento');

        await fetch(\`\${API_URL}/colaboradores/\${viewedColaborador.id}/contratos-avulsos\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${currentToken}\` },
            body: JSON.stringify({ gerador_id: geradorId, gerador_nome: geradorNome, status: 'enviado', documento_url: data.url || '' })
        }).catch(() => {});

        if (msgEl) { msgEl.style.display='block'; msgEl.className='alert alert-info'; msgEl.innerHTML='<i class="ph ph-check-circle"></i> Contrato gerado e enviado para assinatura!'; }
        setTimeout(() => {
            document.getElementById('modal-contrato-avulso')?.remove();
            window._contratosAvulsoLoaded = false;
            window.switchContratosSubTab('avulso');
        }, 1400);
    } catch(e) {
        if (msgEl) { msgEl.style.display='block'; msgEl.className='alert alert-danger'; msgEl.textContent='Erro: '+e.message; }
        if (btn) { btn.disabled=false; btn.innerHTML='<i class="ph ph-file-arrow-down"></i> Gerar e Enviar para Assinatura'; }
    }
};

window.enviarContratoAvulsoAssinatura = async function(contratoId, nome) {
    if (!confirm(\`Enviar "\${nome}" para assinatura do colaborador?\`)) return;
    try {
        await fetch(\`\${API_URL}/contratos-avulsos/\${contratoId}/enviar\`, {
            method:'POST', headers:{'Authorization':\`Bearer \${currentToken}\`}
        });
        if (typeof showToast === 'function') showToast('Contrato enviado!','success');
        window._contratosAvulsoLoaded = false;
        window.switchContratosSubTab('avulso');
    } catch(e) { alert('Erro: '+e.message); }
};

`;

// Fazer a substituição
const before = content.substring(0, startIdx);
const after  = content.substring(endIdx);  // includes "\r\n\r\nwindow.initAdmissaoWorkflow..."

const newContent = before + NOVO_CONTRATOS + after;
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('SUCCESS - file patched');
console.log('Old size:', content.length, 'New size:', newContent.length);
