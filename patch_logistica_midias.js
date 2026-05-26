const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'logistica_sinistros.js');
let c = fs.readFileSync(filePath, 'utf8');

// =============================================================
// Substituir a função logSinAbrirModalEditar para incluir
// gerenciamento de mídias (visualizar, excluir, adicionar)
// =============================================================

const oldFuncStart = "window.logSinAbrirModalEditar = async function(sinId, colabId) {";
const startIdx = c.indexOf(oldFuncStart);
if (startIdx === -1) { console.error('FUNC NAO ENCONTRADA'); process.exit(1); }

// Encontrar o fim da função (próxima declaração de window. no mesmo nível)
const nextFuncMarker = "\nwindow._logSinEditAdicionarOrcs";
const endIdx = c.indexOf(nextFuncMarker, startIdx);
if (endIdx === -1) { console.error('FIM DA FUNC NAO ENCONTRADO'); process.exit(1); }

console.log('Substituindo de', startIdx, 'ate', endIdx);

const newFunc = `window._logSinEditMidiasExistentes = []; // { url, nome, tipo, idx }
window._logSinEditNovasMidias   = []; // File objects

window.logSinAbrirModalEditar = async function(sinId, colabId) {
    window._logSinEditandoId       = sinId;
    window._logSinEditColabId      = colabId;
    window._logSinEditOrcFiles     = [];
    window._logSinEditNovasMidias  = [];

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

    // Mídias existentes
    let midiasExistentes = [];
    try { if (sinistro.midias_paths) midiasExistentes = JSON.parse(sinistro.midias_paths); } catch(e) {}
    window._logSinEditMidiasExistentes = midiasExistentes.map(function(m, i) {
        return { url: (typeof m === 'string' ? m : m.url), nome: (m.nome || ''), tipo: (m.tipo || ''), idx: i };
    });

    // Criar/resetar modal
    let modal = document.getElementById('modal-log-sin-editar');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-log-sin-editar';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    modal.innerHTML = \`
        <div class="modal-content" style="max-width:660px; max-height:92vh; overflow-y:auto;">
            <div class="modal-header" style="background:linear-gradient(135deg,#0f172a,#1e293b); position:sticky; top:0; z-index:10;">
                <h3 style="color:#fff; margin:0; display:flex; align-items:center; gap:8px;">
                    <i class="ph ph-pencil-simple" style="color:#60a5fa;"></i> Editar Sinistro
                    <span style="font-size:0.75rem; background:#fbbf24; color:#1e293b; border-radius:12px; padding:2px 10px; font-weight:700; margin-left:6px;">PENDENTE</span>
                </h3>
                <button onclick="document.getElementById('modal-log-sin-editar').style.display='none'" class="btn-close" style="background:rgba(255,255,255,0.15); color:#fff;"><i class="ph ph-x"></i></button>
            </div>
            <div class="modal-body" style="display:flex; flex-direction:column; gap:1rem;">

                <div style="background:#fef9c3; border:1px solid #fde047; border-radius:8px; padding:0.6rem 0.85rem; font-size:0.82rem; color:#713f12; display:flex; align-items:center; gap:6px;">
                    <i class="ph ph-warning"></i>
                    Edição disponível apenas antes das assinaturas do colaborador e da testemunha.
                </div>

                <!-- DADOS BÁSICOS -->
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                    <div class="input-group">
                        <label>Boletim Nº</label>
                        <input type="text" id="edit-sin-bo" class="form-control" value="\${sinistro.numero_boletim || ''}">
                    </div>
                    <div class="input-group">
                        <label>Data e Hora da Ocorrência</label>
                        <input type="text" id="edit-sin-data" class="form-control" value="\${sinistro.data_hora || ''}">
                    </div>
                </div>
                <div class="input-group">
                    <label>Natureza da Ocorrência</label>
                    <input type="text" id="edit-sin-natureza" class="form-control" value="\${(sinistro.natureza || '').replace(/Crime\\s+Consumado[^\\-]*\\-?\\s*/gi, '').trim()}">
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                    <div class="input-group">
                        <label>Marca/Modelo</label>
                        <input type="text" id="edit-sin-veiculo" class="form-control" value="\${sinistro.veiculo || ''}">
                    </div>
                    <div class="input-group">
                        <label>Placa</label>
                        <input type="text" id="edit-sin-placa" class="form-control" value="\${sinistro.placa || ''}">
                    </div>
                </div>

                <hr style="border-color:#e2e8f0; margin:0;">

                <!-- FOTOS E VÍDEOS EXISTENTES -->
                <div>
                    <p style="font-size:0.85rem; font-weight:700; color:#1e293b; margin:0 0 8px; display:flex; align-items:center; gap:6px;">
                        <i class="ph ph-camera" style="color:#0369a1;"></i>
                        Fotos e Vídeos Anexados
                        <span id="edit-midias-count-badge" style="background:#e0f2fe; color:#0369a1; border-radius:12px; padding:1px 8px; font-size:0.72rem; font-weight:700;">
                            \${midiasExistentes.length}
                        </span>
                    </p>
                    <div id="edit-sin-midias-grid" style="display:flex; flex-wrap:wrap; gap:8px; min-height:40px;">
                        \${midiasExistentes.length === 0
                            ? '<p style="font-size:0.8rem; color:#94a3b8; margin:0;">Nenhuma mídia anexada ainda.</p>'
                            : ''}
                    </div>
                </div>

                <!-- ADICIONAR NOVAS MÍDIAS -->
                <div style="background:#f0f9ff; padding:0.85rem; border-radius:8px; border:1px solid #bae6fd;">
                    <p style="margin:0 0 8px; font-weight:600; font-size:0.85rem; color:#0369a1;"><i class="ph ph-upload-simple"></i> Adicionar fotos e vídeos</p>
                    <div id="edit-sin-midia-dropzone"
                        style="border:2px dashed #7dd3fc; border-radius:10px; background:#e0f2fe; padding:1rem; text-align:center; cursor:pointer; transition:all .2s;"
                        onclick="document.getElementById('edit-sin-midias-file').click()"
                        ondragover="event.preventDefault(); this.style.background='#bae6fd';"
                        ondragleave="this.style.background='#e0f2fe';"
                        ondrop="event.preventDefault(); this.style.background='#e0f2fe'; window._logSinEditAdicionarMidias(event.dataTransfer.files);">
                        <i class="ph ph-upload-simple" style="font-size:1.8rem; color:#0ea5e9; display:block; margin-bottom:4px;"></i>
                        <p style="margin:0; font-weight:600; font-size:0.82rem; color:#0369a1;">Arraste fotos e vídeos aqui</p>
                        <p style="margin:2px 0 0; font-size:0.72rem; color:#38bdf8;">ou clique &bull; múltiplos arquivos &bull; Máx. 500MB cada</p>
                        <input type="file" id="edit-sin-midias-file" multiple accept="image/*,video/*" style="display:none;"
                            onchange="window._logSinEditAdicionarMidias(this.files); this.value='';">
                    </div>
                    <div id="edit-sin-novas-midias-preview" style="display:none; margin-top:10px; flex-wrap:wrap; gap:8px;"></div>
                </div>

                <hr style="border-color:#e2e8f0; margin:0;">

                <!-- ORÇAMENTOS EXISTENTES -->
                \${orcsExistentes.length > 0 ? \`
                <div>
                    <p style="font-size:0.85rem; font-weight:700; color:#374151; margin:0 0 6px;"><i class="ph ph-receipt"></i> Orçamentos já anexados (\${orcsExistentes.length})</p>
                    <div style="display:flex; flex-wrap:wrap; gap:6px;">
                        \${orcsExistentes.map(function(p, idx) {
                            return '<a href="javascript:void(0)" onclick="window.abrirArquivoOneDrive(\\'' + p + '\\')" style="display:inline-flex;align-items:center;gap:4px;font-size:0.78rem;color:#0369a1;background:#e0f2fe;padding:4px 8px;border-radius:4px;text-decoration:none;"><i class=\\"ph ph-image\\"></i> Orç. ' + (idx + 1) + '</a>';
                        }).join('')}
                    </div>
                </div>
                \` : ''}

                <!-- ADICIONAR NOVOS ORÇAMENTOS -->
                <div style="background:#f8fafc; padding:0.85rem; border-radius:8px; border:1px solid #e2e8f0;">
                    <p style="margin:0 0 8px; font-weight:600; font-size:0.85rem;"><i class="ph ph-image"></i> Adicionar orçamentos (JPG/PNG)</p>
                    <div id="edit-sin-orc-dropzone"
                        style="border:2px dashed #cbd5e1; border-radius:10px; background:#f1f5f9; padding:1rem; text-align:center; cursor:pointer; transition:all .2s;"
                        onclick="document.getElementById('edit-sin-orcs-file').click()"
                        ondragover="event.preventDefault(); this.style.background='#e2e8f0';"
                        ondragleave="this.style.background='#f1f5f9';"
                        ondrop="event.preventDefault(); this.style.background='#f1f5f9'; window._logSinEditAdicionarOrcs(event.dataTransfer.files);">
                        <i class="ph ph-upload-simple" style="font-size:1.8rem; color:#94a3b8; display:block; margin-bottom:4px;"></i>
                        <p style="margin:0; font-size:0.82rem; font-weight:600; color:#475569;">Arraste fotos dos orçamentos aqui</p>
                        <p style="margin:2px 0 0; font-size:0.72rem; color:#94a3b8;">ou clique &bull; apenas JPG e PNG</p>
                        <input type="file" id="edit-sin-orcs-file" multiple accept="image/jpeg,image/png,.jpg,.png" style="display:none;"
                            onchange="window._logSinEditAdicionarOrcs(this.files); this.value='';">
                    </div>
                    <div id="edit-sin-orcs-preview" style="display:none; margin-top:10px; display:flex; flex-wrap:wrap; gap:8px;"></div>
                    <p id="edit-sin-orcs-count" style="margin:6px 0 0; font-size:0.75rem; color:#475569; display:none;"></p>
                </div>

                <div id="edit-sin-msg" style="display:none; padding:0.6rem 0.85rem; border-radius:8px; font-size:0.82rem;"></div>
            </div>
            <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:0.5rem; padding:1rem 1.25rem; border-top:1px solid #e2e8f0; background:#f8fafc; position:sticky; bottom:0; z-index:10;">
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

    // Renderizar grade de mídias existentes
    window._logSinEditRenderMidiasExistentes();
};

window._logSinEditRenderMidiasExistentes = function() {
    var grid = document.getElementById('edit-sin-midias-grid');
    var badge = document.getElementById('edit-midias-count-badge');
    if (!grid) return;
    var midias = window._logSinEditMidiasExistentes;
    if (!midias || midias.length === 0) {
        grid.innerHTML = '<p style="font-size:0.8rem; color:#94a3b8; margin:0;">Nenhuma mídia anexada ainda.</p>';
        if (badge) badge.textContent = '0';
        return;
    }
    if (badge) badge.textContent = String(midias.length);
    grid.innerHTML = '';
    midias.forEach(function(m, i) {
        var isVideo = m.tipo && m.tipo.startsWith('video/');
        if (!isVideo) {
            var ext = (m.url || '').split('.').pop().toLowerCase().split('?')[0];
            isVideo = ['mp4','mov','avi','mkv','webm'].includes(ext);
        }
        var card = document.createElement('div');
        card.style.cssText = 'position:relative;width:90px;height:90px;border-radius:10px;overflow:hidden;border:2px solid #bae6fd;background:#f0f9ff;flex-shrink:0;';
        if (!isVideo) {
            var img = document.createElement('img');
            img.src = m.url;
            img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
            img.onerror = function() { this.src=''; this.parentElement.style.background='#e0f2fe'; };
            card.appendChild(img);
        } else {
            var iconDiv = document.createElement('div');
            iconDiv.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#1e293b;';
            iconDiv.innerHTML = '<i class="ph ph-video" style="font-size:2rem;color:#60a5fa;"></i><span style="font-size:0.55rem;color:#94a3b8;margin-top:4px;padding:0 4px;text-align:center;word-break:break-all;">' + (m.nome || 'Vídeo').slice(0, 12) + '</span>';
            card.appendChild(iconDiv);
        }
        // Botão excluir
        var btnDel = document.createElement('button');
        btnDel.type = 'button';
        btnDel.title = 'Excluir esta mídia';
        btnDel.innerHTML = '<i class="ph ph-trash"></i>';
        btnDel.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:none;background:rgba(239,68,68,0);color:transparent;cursor:pointer;font-size:1.5rem;display:flex;align-items:center;justify-content:center;transition:all .2s;';
        btnDel.onmouseover = function() { this.style.background='rgba(239,68,68,0.75)'; this.style.color='#fff'; };
        btnDel.onmouseout  = function() { this.style.background='rgba(239,68,68,0)'; this.style.color='transparent'; };
        btnDel.onclick = function() { window._logSinEditExcluirMidiaExistente(i); };
        card.appendChild(btnDel);
        // Label tipo
        var label = document.createElement('span');
        label.style.cssText = 'position:absolute;bottom:2px;left:2px;background:rgba(0,0,0,0.55);color:#fff;font-size:0.55rem;border-radius:3px;padding:1px 4px;pointer-events:none;';
        label.textContent = isVideo ? 'Vídeo' : 'Foto';
        card.appendChild(label);
        grid.appendChild(card);
    });
};

window._logSinEditExcluirMidiaExistente = async function(localIdx) {
    var sinId = window._logSinEditandoId;
    if (!sinId) return;
    var midias = window._logSinEditMidiasExistentes;
    if (!midias || localIdx < 0 || localIdx >= midias.length) return;
    var m = midias[localIdx];
    var nomeExib = m.nome || ('Mídia ' + (localIdx + 1));
    if (!confirm('Excluir "' + nomeExib + '"? Esta ação não pode ser desfeita.')) return;

    // Desabilitar o grid durante a operação
    var grid = document.getElementById('edit-sin-midias-grid');
    if (grid) grid.style.opacity = '0.5';

    try {
        // Usa o índice REAL no banco (antes das exclusões anteriores nesta sessão)
        // Como pode ter excluído outros antes, vamos usar o índice da posição atual no array
        // O backend recebe o índice no array atual do banco, mas como fazemos exclusões
        // sequenciais e o array no banco vai diminuindo, precisamos rastrear o índice real
        // Solução: o _logSinEditMidiasExistentes tem o .idx original
        var idxNoBanco = m.idx;
        // Ajustar pelo numero de exclusoes ja feitas antes desta posicao na sessao atual
        // (Para simplificar, rebuscar o sinistro e encontrar por URL)
        var res = await fetch(API_URL + '/sinistros/' + sinId + '/midia/' + idxNoBanco, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('erp_token') || '') }
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao excluir mídia.');

        // Remove do array local e re-renderiza
        midias.splice(localIdx, 1);
        // Atualizar índices restantes
        midias.forEach(function(item, i) { item.idx = i; });
        window._logSinEditRenderMidiasExistentes();

    } catch(e) {
        alert('Erro ao excluir: ' + e.message);
    } finally {
        if (grid) grid.style.opacity = '1';
    }
};

window._logSinEditAdicionarMidias = function(fileList) {
    if (!fileList || !fileList.length) return;
    Array.from(fileList).forEach(function(f) {
        var jaExiste = window._logSinEditNovasMidias.some(function(x) { return x.name === f.name && x.size === f.size; });
        if (!jaExiste) window._logSinEditNovasMidias.push(f);
    });
    window._logSinEditRenderNovasMidias();
};

window._logSinEditRemoverNovaMidia = function(idx) {
    window._logSinEditNovasMidias.splice(idx, 1);
    window._logSinEditRenderNovasMidias();
};

window._logSinEditRenderNovasMidias = function() {
    var previewEl = document.getElementById('edit-sin-novas-midias-preview');
    if (!previewEl) return;
    var files = window._logSinEditNovasMidias;
    if (!files.length) {
        previewEl.style.display = 'none';
        return;
    }
    previewEl.style.display = 'flex';
    previewEl.innerHTML = '';
    files.forEach(function(f, idx) {
        var card = document.createElement('div');
        card.title = f.name;
        card.style.cssText = 'position:relative;width:80px;height:80px;border-radius:8px;overflow:hidden;border:2px dashed #7dd3fc;background:#e0f2fe;flex-shrink:0;';
        if (f.type.startsWith('image/')) {
            var img = document.createElement('img');
            img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
            var reader = new FileReader();
            reader.onload = function(ev) { img.src = ev.target.result; };
            reader.readAsDataURL(f);
            card.appendChild(img);
        } else {
            var icon = document.createElement('div');
            icon.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#1e293b;';
            icon.innerHTML = '<i class="ph ph-video" style="font-size:1.6rem;color:#60a5fa;"></i><span style="font-size:0.55rem;color:#94a3b8;margin-top:2px;padding:0 4px;word-break:break-all;">' + f.name.slice(0,12) + '</span>';
            card.appendChild(icon);
        }
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.innerHTML = '&times;';
        btn.style.cssText = 'position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;border:none;background:rgba(239,68,68,0.9);color:#fff;font-size:0.8rem;cursor:pointer;padding:0;';
        btn.setAttribute('onclick', 'window._logSinEditRemoverNovaMidia(' + idx + ')');
        card.appendChild(btn);
        // badge "NOVO"
        var novo = document.createElement('span');
        novo.style.cssText = 'position:absolute;bottom:2px;left:2px;background:#059669;color:#fff;font-size:0.5rem;border-radius:3px;padding:1px 4px;font-weight:700;';
        novo.textContent = 'NOVO';
        card.appendChild(novo);
        previewEl.appendChild(card);
    });
};

`;

c = c.substring(0, startIdx) + newFunc + c.substring(endIdx);
console.log('MODAL EDITAR substituido, novo tamanho:', c.length);

// =============================================================
// Atualizar logSinSalvarEdicao para incluir upload de novas mídias
// =============================================================
const oldSalvar = "window.logSinSalvarEdicao = async function() {";
const salvarIdx = c.indexOf(oldSalvar);
if (salvarIdx === -1) { console.error('SALVAR NAO ENCONTRADO'); process.exit(1); }

const endSalvarMarker = "\n};\n";
let endSalvarIdx = c.indexOf(endSalvarMarker, salvarIdx);
// Encontrar o próximo `};` que fecha a função logSinSalvarEdicao
// Procurar por "window." depois do bloco
const nextWindowAfterSalvar = c.indexOf("\nwindow.", salvarIdx + 100);
endSalvarIdx = c.indexOf("\n};\n", salvarIdx);

console.log('Substituindo logSinSalvarEdicao de', salvarIdx, 'ate', endSalvarIdx);

const newSalvar = `window.logSinSalvarEdicao = async function() {
    var sinId   = window._logSinEditandoId;
    var colabId = window._logSinEditColabId;
    if (!sinId || !colabId) return;

    var btn    = document.getElementById('btn-edit-sin-salvar');
    var msgEl  = document.getElementById('edit-sin-msg');
    var oldTxt = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...'; }

    function showMsg(txt, ok) {
        if (!msgEl) return;
        msgEl.style.display = 'block';
        msgEl.style.cssText = 'display:block; padding:0.6rem 0.85rem; border-radius:8px; font-size:0.82rem; ' +
            (ok ? 'background:#d1fae5; border:1px solid #6ee7b7; color:#065f46;'
                : 'background:#fee2e2; border:1px solid #fca5a5; color:#991b1b;');
        msgEl.innerHTML = (ok ? '<i class="ph ph-check-circle"></i> ' : '<i class="ph ph-warning"></i> ') + txt;
    }

    try {
        // 1) Salvar campos básicos e orçamentos
        var formData = new URLSearchParams();
        formData.set('numero_boletim', document.getElementById('edit-sin-bo')?.value || '');
        formData.set('data_hora',      document.getElementById('edit-sin-data')?.value || '');
        formData.set('natureza',       document.getElementById('edit-sin-natureza')?.value || '');
        formData.set('veiculo',        document.getElementById('edit-sin-veiculo')?.value || '');
        formData.set('placa',          document.getElementById('edit-sin-placa')?.value || '');

        if (window._logSinEditOrcFiles && window._logSinEditOrcFiles.length > 0) {
            if (btn) btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando orçamentos...';
            var orcsBase64 = [];
            for (var i = 0; i < window._logSinEditOrcFiles.length; i++) {
                var f = window._logSinEditOrcFiles[i];
                var b64 = await new Promise(function(resolve) {
                    var rd = new FileReader(); rd.onload = function() { resolve(rd.result); }; rd.readAsDataURL(f);
                });
                orcsBase64.push(b64);
            }
            formData.set('orcamentos_base64', JSON.stringify(orcsBase64));
        }

        var resPatch = await fetch(API_URL + '/colaboradores/' + colabId + '/sinistros/' + sinId, {
            method: 'PATCH',
            headers: {
                'Authorization': 'Bearer ' + (localStorage.getItem('erp_token') || ''),
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData.toString()
        });
        var patchData = await resPatch.json();
        if (!resPatch.ok) throw new Error(patchData.error || 'Erro ao salvar campos.');

        // 2) Upload de novas mídias (uma a uma)
        var novasMidias = window._logSinEditNovasMidias || [];
        if (novasMidias.length > 0) {
            for (var j = 0; j < novasMidias.length; j++) {
                if (btn) btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando mídia ' + (j+1) + '/' + novasMidias.length + '...';
                var mfData = new FormData();
                mfData.append('file', novasMidias[j]);
                var rMidia = await fetch(API_URL + '/sinistros/' + sinId + '/midia', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('erp_token') || '') },
                    body: mfData
                });
                if (!rMidia.ok) {
                    var errMidia = await rMidia.json().catch(function() { return {}; });
                    console.warn('Falha ao enviar mídia:', errMidia.error);
                    showMsg('Atenção: ' + novasMidias[j].name + ' não foi enviada — ' + (errMidia.error || 'erro desconhecido'), false);
                    await new Promise(function(r) { setTimeout(r, 1500); });
                }
            }
        }

        showMsg('Sinistro atualizado com sucesso!', true);
        setTimeout(async function() {
            document.getElementById('modal-log-sin-editar').style.display = 'none';
            await window.logSinCarregarListaGeral();
        }, 1200);

    } catch(e) {
        showMsg(e.message, false);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = oldTxt; }
    }
}`;

// Substituir a função logSinSalvarEdicao antiga
c = c.substring(0, salvarIdx) + newSalvar + c.substring(endSalvarIdx + 4); // +4 para pular \n};\n
console.log('logSinSalvarEdicao substituida');

fs.writeFileSync(filePath, c, 'utf8');
console.log('DONE - bytes:', Buffer.byteLength(c));
