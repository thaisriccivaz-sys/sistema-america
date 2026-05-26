const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'logistica_sinistros.js');
let c = fs.readFileSync(filePath, 'utf8');

// =============================================================
// 1) Adicionar botão Editar no card (apenas status 'pendente')
// =============================================================
const oldCardFooter =
    "        <div style=\"background:#f8fafc; border-top:1px dashed #cbd5e1; padding-top:0.75rem; display:flex; justify-content:space-between; align-items:center; margin-top:0.5rem;\">\r\n" +
    "            <div style=\"font-size:0.8rem; color:#475569;\">\r\n" +
    "\r\n" +
    "                ${s.tipo_sinistro ? `<strong>Tipo:</strong> ${s.tipo_sinistro}` : ''}\r\n" +
    "            </div>\r\n" +
    "        </div>";

const newCardFooter =
    "        <div style=\"background:#f8fafc; border-top:1px dashed #cbd5e1; padding-top:0.75rem; display:flex; justify-content:space-between; align-items:center; margin-top:0.5rem;\">\r\n" +
    "            <div style=\"font-size:0.8rem; color:#475569;\">\r\n" +
    "\r\n" +
    "                ${s.tipo_sinistro ? `<strong>Tipo:</strong> ${s.tipo_sinistro}` : ''}\r\n" +
    "            </div>\r\n" +
    "            ${s.status === 'pendente' ? `\r\n" +
    "            <button onclick=\"window.logSinAbrirModalEditar(${s.id}, ${s.colaborador_id})\" title=\"Editar sinistro\"\r\n" +
    "                style=\"background:#f1f5f9; border:1.5px solid #cbd5e1; color:#475569; border-radius:8px; padding:5px 14px; font-size:0.78rem; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:5px; transition:all .2s;\"\r\n" +
    "                onmouseover=\"this.style.background='#e2e8f0'; this.style.color='#1e293b'\" onmouseout=\"this.style.background='#f1f5f9'; this.style.color='#475569'\">\r\n" +
    "                <i class=\"ph ph-pencil-simple\"></i> Editar\r\n" +
    "            </button>` : `\r\n" +
    "            <span style=\"font-size:0.72rem; color:#94a3b8; display:flex; align-items:center; gap:4px;\">\r\n" +
    "                <i class=\"ph ph-lock\"></i> Assinado — edição bloqueada\r\n" +
    "            </span>`}\r\n" +
    "        </div>";

if (c.includes(oldCardFooter)) {
    c = c.replace(oldCardFooter, newCardFooter);
    console.log('PARTE 1 (botao editar) OK');
} else {
    console.error('PARTE 1 - NAO ENCONTRADO');
    // debug
    const idx = c.indexOf('tipo_sinistro');
    console.log(JSON.stringify(c.substring(idx - 10, idx + 200)));
}

// =============================================================
// 2) Adicionar funcoes do modal de edicao no final do arquivo
// =============================================================
const editFunctions = `

// ============================================================
// MODAL DE EDIÇÃO DE SINISTRO (logística) — apenas status pendente
// ============================================================
window._logSinEditOrcFiles = [];
window._logSinEditandoId   = null;
window._logSinEditColabId  = null;

window.logSinAbrirModalEditar = async function(sinId, colabId) {
    window._logSinEditandoId  = sinId;
    window._logSinEditColabId = colabId;
    window._logSinEditOrcFiles = [];

    // Buscar dados atuais do sinistro
    let sinistro = null;
    try {
        const lista = await apiGet('/logistica/sinistros');
        sinistro = (lista || []).find(function(s) { return s.id === sinId; });
    } catch(e) { alert('Erro ao carregar sinistro.'); return; }
    if (!sinistro) { alert('Sinistro não encontrado.'); return; }
    if (sinistro.status !== 'pendente') {
        alert('Este sinistro já possui assinaturas e não pode ser editado.');
        return;
    }

    // Orçamentos existentes
    let orcsExistentes = [];
    try { if (sinistro.orcamentos_paths) orcsExistentes = JSON.parse(sinistro.orcamentos_paths); } catch(e) {}

    // Criar/resetar modal
    let modal = document.getElementById('modal-log-sin-editar');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-log-sin-editar';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    modal.innerHTML = \`
        <div class="modal-content" style="max-width:620px;">
            <div class="modal-header" style="background:linear-gradient(135deg,#0f172a,#1e293b);">
                <h3 style="color:#fff; margin:0; display:flex; align-items:center; gap:8px;">
                    <i class="ph ph-pencil-simple" style="color:#60a5fa;"></i> Editar Sinistro
                    <span style="font-size:0.75rem; background:#fbbf24; color:#1e293b; border-radius:12px; padding:2px 10px; font-weight:700; margin-left:6px;">PENDENTE</span>
                </h3>
                <button onclick="document.getElementById('modal-log-sin-editar').style.display='none'" class="btn-close" style="background:rgba(255,255,255,0.15); color:#fff;"><i class="ph ph-x"></i></button>
            </div>
            <div class="modal-body">

                <div style="background:#fef9c3; border:1px solid #fde047; border-radius:8px; padding:0.6rem 0.85rem; margin-bottom:1rem; font-size:0.82rem; color:#713f12; display:flex; align-items:center; gap:6px;">
                    <i class="ph ph-warning"></i>
                    Edição disponível apenas antes das assinaturas do colaborador e da testemunha.
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:0.75rem;">
                    <div class="input-group">
                        <label>Boletim Nº</label>
                        <input type="text" id="edit-sin-bo" class="form-control" value="\${sinistro.numero_boletim || ''}">
                    </div>
                    <div class="input-group">
                        <label>Data e Hora da Ocorrência</label>
                        <input type="text" id="edit-sin-data" class="form-control" value="\${sinistro.data_hora || ''}">
                    </div>
                </div>
                <div class="input-group" style="margin-bottom:0.75rem;">
                    <label>Natureza da Ocorrência</label>
                    <input type="text" id="edit-sin-natureza" class="form-control" value="\${(sinistro.natureza || '').replace(/Crime\\\\s+Consumado[^\\\\-]*\\\\-?\\\\s*/gi, '').trim()}">
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:1rem;">
                    <div class="input-group">
                        <label>Marca/Modelo</label>
                        <input type="text" id="edit-sin-veiculo" class="form-control" value="\${sinistro.veiculo || ''}">
                    </div>
                    <div class="input-group">
                        <label>Placa</label>
                        <input type="text" id="edit-sin-placa" class="form-control" value="\${sinistro.placa || ''}">
                    </div>
                </div>

                <hr style="border-color:#e2e8f0; margin:1rem 0;">

                <!-- Orçamentos existentes -->
                \${orcsExistentes.length > 0 ? \`
                <div style="margin-bottom:1rem;">
                    <p style="font-size:0.85rem; font-weight:700; color:#374151; margin-bottom:8px;"><i class="ph ph-receipt"></i> Orçamentos já anexados (\${orcsExistentes.length})</p>
                    <div style="display:flex; flex-wrap:wrap; gap:8px;">
                        \${orcsExistentes.map(function(p, idx) {
                            return '<a href="javascript:void(0)" onclick="window.abrirArquivoOneDrive(\\'' + p + '\\')" style="display:inline-flex;align-items:center;gap:4px;font-size:0.78rem;color:#0369a1;background:#e0f2fe;padding:4px 8px;border-radius:4px;text-decoration:none;"><i class=\\"ph ph-image\\"></i> Orç. ' + (idx + 1) + '</a>';
                        }).join('')}
                    </div>
                </div>
                \` : ''}

                <!-- Novos orçamentos -->
                <div style="background:#f8fafc; padding:0.85rem; border-radius:8px; border:1px solid #e2e8f0;">
                    <p style="margin:0 0 8px; font-weight:600; font-size:0.85rem;"><i class="ph ph-image"></i> Adicionar orçamentos (JPG/PNG)</p>
                    <div id="edit-sin-orc-dropzone"
                        style="border:2px dashed #cbd5e1; border-radius:10px; background:#f1f5f9; padding:1rem; text-align:center; cursor:pointer; transition:all .2s;"
                        onclick="document.getElementById('edit-sin-orcs-file').click()"
                        ondragover="event.preventDefault(); this.style.background='#e2e8f0';"
                        ondragleave="this.style.background='#f1f5f9';"
                        ondrop="event.preventDefault(); this.style.background='#f1f5f9'; window._logSinEditAdicionarOrcs(event.dataTransfer.files);">
                        <i class="ph ph-upload-simple" style="font-size:1.8rem; color:#94a3b8; display:block; margin-bottom:4px;"></i>
                        <p style="margin:0; font-size:0.82rem; font-weight:600; color:#475569;">Arraste imagens de orçamento aqui</p>
                        <p style="margin:2px 0 0; font-size:0.72rem; color:#94a3b8;">ou clique &bull; apenas JPG e PNG &bull; múltiplos de uma vez</p>
                        <input type="file" id="edit-sin-orcs-file" multiple accept="image/jpeg,image/png,.jpg,.png" style="display:none;"
                            onchange="window._logSinEditAdicionarOrcs(this.files); this.value='';">
                    </div>
                    <div id="edit-sin-orcs-preview" style="display:none; margin-top:10px; display:flex; flex-wrap:wrap; gap:8px;"></div>
                    <p id="edit-sin-orcs-count" style="margin:6px 0 0; font-size:0.75rem; color:#475569; display:none;"></p>
                </div>

                <div id="edit-sin-msg" style="display:none; margin-top:0.75rem; padding:0.6rem 0.85rem; border-radius:8px; font-size:0.82rem;"></div>
            </div>
            <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:0.5rem; padding:1rem 1.25rem; border-top:1px solid #e2e8f0; background:#f8fafc;">
                <button onclick="document.getElementById('modal-log-sin-editar').style.display='none'"
                    style="border:1px solid #e2e8f0; background:#fff; color:#374151; border-radius:8px; padding:0.5rem 1rem; font-size:0.85rem; font-weight:600; cursor:pointer;">
                    Cancelar
                </button>
                <button id="btn-edit-sin-salvar" onclick="window.logSinSalvarEdicao()"
                    style="border:none; background:#059669; color:#fff; border-radius:8px; padding:0.5rem 1.25rem; font-size:0.85rem; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px;">
                    <i class="ph ph-floppy-disk"></i> Salvar Alterações
                </button>
            </div>
        </div>
    \`;

    modal.style.display = 'flex';
};

window._logSinEditAdicionarOrcs = function(fileList) {
    if (!fileList || !fileList.length) return;
    Array.from(fileList).forEach(function(f) {
        var ext = f.name.split('.').pop().toLowerCase();
        if (!['jpg','jpeg','png'].includes(ext)) {
            alert('Apenas JPG ou PNG são aceitos para orçamentos. Ignorado: ' + f.name);
            return;
        }
        var jaExiste = window._logSinEditOrcFiles.some(function(x) { return x.name === f.name && x.size === f.size; });
        if (!jaExiste) window._logSinEditOrcFiles.push(f);
    });
    window._logSinEditAtualizarPreviewOrcs();
};

window._logSinEditRemoverOrc = function(idx) {
    window._logSinEditOrcFiles.splice(idx, 1);
    window._logSinEditAtualizarPreviewOrcs();
};

window._logSinEditAtualizarPreviewOrcs = function() {
    var previewEl = document.getElementById('edit-sin-orcs-preview');
    var countEl   = document.getElementById('edit-sin-orcs-count');
    if (!previewEl) return;
    var files = window._logSinEditOrcFiles;
    if (!files.length) {
        previewEl.style.display = 'none';
        if (countEl) countEl.style.display = 'none';
        return;
    }
    previewEl.style.display = 'flex';
    previewEl.innerHTML = '';
    if (countEl) {
        countEl.textContent = files.length + ' novo' + (files.length > 1 ? 's' : '') + ' orçamento' + (files.length > 1 ? 's' : '') + ' selecionado' + (files.length > 1 ? 's' : '');
        countEl.style.display = 'block';
    }
    files.forEach(function(f, idx) {
        var card = document.createElement('div');
        card.style.cssText = 'position:relative;width:72px;height:72px;border-radius:8px;overflow:hidden;border:2px solid #d1d5db;flex-shrink:0;';
        var img = document.createElement('img');
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
        var reader = new FileReader();
        reader.onload = function(ev) { img.src = ev.target.result; };
        reader.readAsDataURL(f);
        card.appendChild(img);
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.innerHTML = '&times;';
        btn.style.cssText = 'position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;border:none;background:rgba(239,68,68,0.9);color:#fff;font-size:0.8rem;cursor:pointer;padding:0;';
        btn.setAttribute('onclick', 'window._logSinEditRemoverOrc(' + idx + ')');
        card.appendChild(btn);
        previewEl.appendChild(card);
    });
};

window.logSinSalvarEdicao = async function() {
    const sinId   = window._logSinEditandoId;
    const colabId = window._logSinEditColabId;
    if (!sinId || !colabId) return;

    const btn    = document.getElementById('btn-edit-sin-salvar');
    const msgEl  = document.getElementById('edit-sin-msg');
    const oldTxt = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...'; }

    try {
        const formData = new URLSearchParams();
        formData.set('numero_boletim', document.getElementById('edit-sin-bo')?.value || '');
        formData.set('data_hora',      document.getElementById('edit-sin-data')?.value || '');
        formData.set('natureza',       document.getElementById('edit-sin-natureza')?.value || '');
        formData.set('veiculo',        document.getElementById('edit-sin-veiculo')?.value || '');
        formData.set('placa',          document.getElementById('edit-sin-placa')?.value || '');

        // Converter novos orçamentos para base64
        if (window._logSinEditOrcFiles.length > 0) {
            if (btn) btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando orçamentos...';
            const orcsBase64 = [];
            for (const f of window._logSinEditOrcFiles) {
                const b64 = await new Promise(function(resolve) {
                    var rd = new FileReader();
                    rd.onload = function() { resolve(rd.result); };
                    rd.readAsDataURL(f);
                });
                orcsBase64.push(b64);
            }
            formData.set('orcamentos_base64', JSON.stringify(orcsBase64));
        }

        const res = await fetch(API_URL + '/colaboradores/' + colabId + '/sinistros/' + sinId, {
            method: 'PATCH',
            headers: {
                'Authorization': 'Bearer ' + (localStorage.getItem('erp_token') || ''),
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData.toString()
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao salvar alterações.');

        // Sucesso
        if (msgEl) {
            msgEl.style.display = 'block';
            msgEl.style.cssText = 'display:block; margin-top:0.75rem; padding:0.6rem 0.85rem; border-radius:8px; background:#d1fae5; border:1px solid #6ee7b7; color:#065f46; font-size:0.82rem;';
            msgEl.innerHTML = '<i class="ph ph-check-circle"></i> Sinistro atualizado com sucesso!';
        }
        setTimeout(async function() {
            document.getElementById('modal-log-sin-editar').style.display = 'none';
            await window.logSinCarregarListaGeral();
        }, 1200);

    } catch(e) {
        if (msgEl) {
            msgEl.style.display = 'block';
            msgEl.style.cssText = 'display:block; margin-top:0.75rem; padding:0.6rem 0.85rem; border-radius:8px; background:#fee2e2; border:1px solid #fca5a5; color:#991b1b; font-size:0.82rem;';
            msgEl.innerHTML = '<i class="ph ph-warning"></i> ' + e.message;
        }
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = oldTxt; }
    }
};
`;

c += editFunctions;
console.log('PARTE 2 (funcoes edicao) adicionadas');

fs.writeFileSync(filePath, c, 'utf8');
console.log('DONE - bytes:', Buffer.byteLength(c));
