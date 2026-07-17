let protocolosAdministrativosList = [];
let currentProtocoloId = null;

async function apiFetch(url, options = {}, disableJsonContent = false) {
    const token = localStorage.getItem('erp_token') || localStorage.getItem('token');
    const headers = { ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!disableJsonContent && !headers['Content-Type'] && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    return fetch(url, { ...options, headers });
}

function initProtocolosAdministrativos() {
    const container = document.getElementById('protocolos-administrativos-container');
    if (!container) return;

    container.innerHTML = `
        <div class="page-header flex-between" style="margin-bottom:1.5rem;">
            <div style="display: flex; align-items: center; gap: 1rem;">
                <div style="width: 50px; height: 50px; border-radius: 12px; background: #ffedd5; color: #e8590c; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                    <i class="ph ph-file-text"></i>
                </div>
                <div>
                    <h2 style="margin: 0; font-size: 1.5rem; color: #1e293b;">Protocolos</h2>
                    <p style="margin: 0; color: #64748b; font-size: 0.9rem;">Gerencie protocolos de reclamações e anexos.</p>
                </div>
            </div>
            <button class="btn btn-primary" onclick="abrirModalNovoProtocolo()" style="background: #e8590c; border: none;">
                <i class="ph ph-plus"></i> Novo Protocolo
            </button>
        </div>

        <div class="card" style="padding: 1.5rem;">
            <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
                <input type="text" id="filtro-protocolos-busca" class="form-control" placeholder="Buscar por número, assunto ou status..." style="flex: 1; min-width: 250px;" onkeyup="filtrarProtocolos()">
                <select id="filtro-protocolos-status" class="form-control" style="width: 200px;" onchange="filtrarProtocolos()">
                    <option value="">Todos os Status</option>
                    <option value="Aberto">Aberto</option>
                    <option value="Em Andamento">Em Andamento</option>
                    <option value="Resolvido">Resolvido</option>
                </select>
            </div>
            
            <div class="table-responsive">
                <table class="table" style="width: 100%;">
                    <thead>
                        <tr>
                            <th>Números</th>
                            <th>Assunto</th>
                            <th>Status</th>
                            <th>Criado Em</th>
                            <th>Criado Por</th>
                            <th style="text-align: center;">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-protocolos">
                        <tr><td colspan="6" style="text-align: center; color: #94a3b8;">Carregando protocolos...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- MODAL NOVO PROTOCOLO -->
        <div id="modal-novo-protocolo" class="modal-overlay" style="display: none; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 9999;">
            <div class="modal-content" style="background: #fff; width: 500px; max-width: 95%; border-radius: 12px; padding: 2rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h3 style="margin: 0; font-size: 1.25rem;">Novo Protocolo</h3>
                    <button onclick="fecharModalNovoProtocolo()" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #64748b;"><i class="ph ph-x"></i></button>
                </div>
                <form id="form-novo-protocolo" onsubmit="salvarNovoProtocolo(event)">
                    <div class="input-group mb-3">
                        <label style="font-weight: 600; font-size: 0.85rem; color: #475569; display: block; margin-bottom: 4px;">Números (separados por vírgula se mais de um)</label>
                        <input type="text" id="novo-protocolo-numeros" class="form-control" required placeholder="Ex: 12345, 67890" style="width: 100%;">
                    </div>
                    <div class="input-group mb-4">
                        <label style="font-weight: 600; font-size: 0.85rem; color: #475569; display: block; margin-bottom: 4px;">Assunto da Reclamação</label>
                        <input type="text" id="novo-protocolo-assunto" class="form-control" required placeholder="Digite o assunto principal" style="width: 100%;">
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 1rem;">
                        <button type="button" class="btn btn-secondary" onclick="fecharModalNovoProtocolo()">Cancelar</button>
                        <button type="submit" class="btn btn-primary" style="background: #e8590c; border: none;">Salvar</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- MODAL VER PROTOCOLO (DETALHES, COMENTÁRIOS E ANEXOS) -->
        <div id="modal-ver-protocolo" class="modal-overlay" style="display: none; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 9999;">
            <div class="modal-content" style="background: #fff; width: 800px; max-width: 95%; max-height: 90vh; border-radius: 12px; display: flex; flex-direction: column;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; border-bottom: 1px solid #e2e8f0;">
                    <div>
                        <h3 id="ver-protocolo-titulo" style="margin: 0; font-size: 1.25rem; color: #1e293b;">Protocolo</h3>
                        <p id="ver-protocolo-sub" style="margin: 4px 0 0; color: #64748b; font-size: 0.9rem;"></p>
                    </div>
                    <div style="display: flex; gap: 1rem; align-items: center;">
                        <select id="ver-protocolo-status" class="form-control" style="padding: 4px 8px; font-size: 0.85rem;" onchange="alterarStatusProtocolo()">
                            <option value="Aberto">Aberto</option>
                            <option value="Em Andamento">Em Andamento</option>
                            <option value="Resolvido">Resolvido</option>
                        </select>
                        <button onclick="fecharModalVerProtocolo()" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #64748b;"><i class="ph ph-x"></i></button>
                    </div>
                </div>
                
                <div style="padding: 1.5rem; overflow-y: auto; flex: 1; display: grid; grid-template-columns: 1fr 300px; gap: 1.5rem;">
                    <!-- COMENTÁRIOS -->
                    <div style="display: flex; flex-direction: column; height: 100%;">
                        <h4 style="margin: 0 0 1rem 0; font-size: 1rem; color: #334155; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">Comentários</h4>
                        <div id="protocolo-comentarios-lista" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1rem; padding-right: 8px; max-height: 350px;">
                            <!-- Comentários renderizados via JS -->
                        </div>
                        <div style="display: flex; gap: 8px; background: #f8fafc; padding: 12px; border-radius: 8px;">
                            <input type="text" id="novo-comentario-texto" class="form-control" placeholder="Escreva um comentário..." style="flex: 1;" onkeypress="if(event.key === 'Enter') enviarComentarioProtocolo()">
                            <button class="btn btn-primary" onclick="enviarComentarioProtocolo()" style="background: #e8590c; border: none; padding: 8px 16px;"><i class="ph ph-paper-plane-right"></i> Enviar</button>
                        </div>
                    </div>
                    
                    <!-- ANEXOS -->
                    <div style="display: flex; flex-direction: column; height: 100%; border-left: 1px solid #e2e8f0; padding-left: 1.5rem;">
                        <h4 style="margin: 0 0 1rem 0; font-size: 1rem; color: #334155; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">Anexos</h4>
                        <div id="protocolo-anexos-lista" style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; flex: 1; overflow-y: auto; max-height: 250px;">
                            <!-- Anexos renderizados via JS -->
                        </div>
                        <div style="background: #f8fafc; padding: 12px; border-radius: 8px; text-align: center;">
                            <input type="file" id="upload-anexo-protocolo" style="display: none;" onchange="uploadAnexoProtocolo(event)">
                            <button class="btn btn-secondary" onclick="document.getElementById('upload-anexo-protocolo').click()" style="width: 100%; font-size: 0.85rem;" id="btn-upload-anexo">
                                <i class="ph ph-upload-simple"></i> Anexar Arquivo
                            </button>
                            <small id="upload-status" style="display: block; margin-top: 6px; color: #64748b; font-size: 0.75rem;"></small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    carregarProtocolos();
}

async function carregarProtocolos() {
    try {
        const res = await apiFetch('/api/administrativo/protocolos');
        if (!res.ok) throw new Error('Erro ao buscar protocolos');
        protocolosAdministrativosList = await res.json();
        renderizarProtocolos();
    } catch (e) {
        console.error(e);
        document.getElementById('tbody-protocolos').innerHTML = `<tr><td colspan="6" style="text-align:center;color:red;">Erro ao carregar dados</td></tr>`;
    }
}

function renderizarProtocolos() {
    const tbody = document.getElementById('tbody-protocolos');
    if (!tbody) return;

    const termo = (document.getElementById('filtro-protocolos-busca')?.value || '').toLowerCase();
    const statusFiltro = document.getElementById('filtro-protocolos-status')?.value || '';

    const filtrados = protocolosAdministrativosList.filter(p => {
        const matchTermo = (p.numeros || '').toLowerCase().includes(termo) || (p.assunto || '').toLowerCase().includes(termo);
        const matchStatus = statusFiltro ? p.status === statusFiltro : true;
        return matchTermo && matchStatus;
    });

    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8;">Nenhum protocolo encontrado.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtrados.map(p => {
        let statusColor = '#64748b';
        let statusBg = '#f1f5f9';
        if (p.status === 'Em Andamento') { statusColor = '#ca8a04'; statusBg = '#fef08a'; }
        if (p.status === 'Resolvido') { statusColor = '#15803d'; statusBg = '#bbf7d0'; }
        
        const dataStr = p.criado_em ? new Date(p.criado_em).toLocaleDateString('pt-BR') : '';

        return `
            <tr>
                <td style="font-weight: 600;">${escapeHtml(p.numeros || '')}</td>
                <td>${escapeHtml(p.assunto || '')}</td>
                <td><span style="background: ${statusBg}; color: ${statusColor}; padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">${escapeHtml(p.status || 'Aberto')}</span></td>
                <td>${dataStr}</td>
                <td>${escapeHtml(p.criado_por_nome || '')}</td>
                <td style="text-align: center;">
                    <button class="btn-icon" onclick="abrirModalVerProtocolo(${p.id})" title="Ver Detalhes" style="background: #f1f5f9; color: #3b82f6; border: none; border-radius: 6px; padding: 6px 10px; cursor: pointer;">
                        <i class="ph ph-eye"></i> Detalhes
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function filtrarProtocolos() {
    renderizarProtocolos();
}

function abrirModalNovoProtocolo() {
    document.getElementById('form-novo-protocolo').reset();
    document.getElementById('modal-novo-protocolo').style.display = 'flex';
}

function fecharModalNovoProtocolo() {
    document.getElementById('modal-novo-protocolo').style.display = 'none';
}

async function salvarNovoProtocolo(e) {
    e.preventDefault();
    const numeros = document.getElementById('novo-protocolo-numeros').value;
    const assunto = document.getElementById('novo-protocolo-assunto').value;
    
    try {
        const res = await apiFetch('/api/administrativo/protocolos', {
            method: 'POST',
            body: JSON.stringify({ numeros, assunto })
        });
        if (!res.ok) throw new Error('Falha ao salvar protocolo');
        
        showToast('Protocolo criado com sucesso', 'success');
        fecharModalNovoProtocolo();
        carregarProtocolos();
    } catch (e) {
        console.error(e);
        showToast('Erro ao criar protocolo', 'error');
    }
}

function abrirModalVerProtocolo(id) {
    const p = protocolosAdministrativosList.find(x => x.id === id);
    if (!p) return;
    currentProtocoloId = id;
    
    document.getElementById('ver-protocolo-titulo').textContent = 'Protocolo(s): ' + (p.numeros || '');
    document.getElementById('ver-protocolo-sub').textContent = p.assunto || '';
    document.getElementById('ver-protocolo-status').value = p.status || 'Aberto';
    
    renderizarComentarios(p.comentarios);
    renderizarAnexos(p.arquivos_json);
    
    document.getElementById('modal-ver-protocolo').style.display = 'flex';
}

function fecharModalVerProtocolo() {
    document.getElementById('modal-ver-protocolo').style.display = 'none';
    currentProtocoloId = null;
    carregarProtocolos(); // refresh to reflect status changes if any
}

async function alterarStatusProtocolo() {
    if (!currentProtocoloId) return;
    const novoStatus = document.getElementById('ver-protocolo-status').value;
    
    try {
        const res = await apiFetch(`/api/administrativo/protocolos/${currentProtocoloId}`, {
            method: 'PUT',
            body: JSON.stringify({ status: novoStatus })
        });
        if (!res.ok) throw new Error('Erro ao atualizar status');
        showToast('Status atualizado', 'success');
        
        const p = protocolosAdministrativosList.find(x => x.id === currentProtocoloId);
        if (p) p.status = novoStatus;
        
        renderizarProtocolos();
    } catch(e) {
        console.error(e);
        showToast('Erro ao atualizar status', 'error');
    }
}

function renderizarComentarios(comentariosJson) {
    const div = document.getElementById('protocolo-comentarios-lista');
    let comentarios = [];
    try { comentarios = JSON.parse(comentariosJson || '[]'); } catch(e){}
    
    if (comentarios.length === 0) {
        div.innerHTML = `<div style="text-align: center; color: #94a3b8; font-size: 0.9rem; margin-top: 2rem;">Nenhum comentário ainda.</div>`;
        return;
    }
    
    // Sort oldest to newest
    comentarios.sort((a,b) => new Date(a.dataHora) - new Date(b.dataHora));
    
    div.innerHTML = comentarios.map(c => {
        let dh = c.dataHora || '';
        if (dh.includes('T')) {
            dh = new Date(dh).toLocaleString('pt-BR');
        } else {
            // Already YYYY-MM-DD HH:mm:ss approx
            const pts = dh.split(' ');
            if (pts.length === 2) {
                const dPts = pts[0].split('-');
                if(dPts.length === 3) dh = `${dPts[2]}/${dPts[1]}/${dPts[0]} ${pts[1]}`;
            }
        }
        
        return `
            <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                    <span style="font-weight: 600; font-size: 0.85rem; color: #1e293b;"><i class="ph ph-user"></i> ${escapeHtml(c.usuario || 'Desconhecido')}</span>
                    <span style="font-size: 0.75rem; color: #64748b;"><i class="ph ph-clock"></i> ${dh}</span>
                </div>
                <div style="font-size: 0.9rem; color: #334155; line-height: 1.4; white-space: pre-wrap;">${escapeHtml(c.texto || '')}</div>
            </div>
        `;
    }).join('');
    
    // Scroll to bottom
    setTimeout(() => {
        div.scrollTop = div.scrollHeight;
    }, 50);
}

async function enviarComentarioProtocolo() {
    if (!currentProtocoloId) return;
    const input = document.getElementById('novo-comentario-texto');
    const texto = input.value.trim();
    if (!texto) return;
    
    try {
        const res = await apiFetch(`/api/administrativo/protocolos/${currentProtocoloId}/comentarios`, {
            method: 'POST',
            body: JSON.stringify({ texto })
        });
        if (!res.ok) throw new Error('Erro ao enviar comentário');
        
        const data = await res.json();
        input.value = '';
        
        const p = protocolosAdministrativosList.find(x => x.id === currentProtocoloId);
        if (p) {
            p.comentarios = JSON.stringify(data.comentarios);
            renderizarComentarios(p.comentarios);
        }
    } catch(e) {
        console.error(e);
        showToast('Erro ao enviar comentário', 'error');
    }
}

function renderizarAnexos(arquivosJson) {
    const div = document.getElementById('protocolo-anexos-lista');
    let anexos = [];
    try { anexos = JSON.parse(arquivosJson || '[]'); } catch(e){}
    
    if (anexos.length === 0) {
        div.innerHTML = `<div style="text-align: center; color: #94a3b8; font-size: 0.85rem; margin-top: 1rem;">Nenhum anexo</div>`;
        return;
    }
    
    div.innerHTML = anexos.map(a => {
        return `
            <div style="display: flex; align-items: center; justify-content: space-between; background: #fff; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 6px;">
                <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
                    <i class="ph ph-file" style="color: #64748b; font-size: 1.2rem;"></i>
                    <span style="font-size: 0.85rem; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;" title="${escapeHtml(a.nome_original)}">${escapeHtml(a.nome_original)}</span>
                </div>
                <a href="${a.url}" target="_blank" class="btn-icon" style="color: #3b82f6; text-decoration: none;" title="Visualizar">
                    <i class="ph ph-download-simple"></i>
                </a>
            </div>
        `;
    }).join('');
}

async function uploadAnexoProtocolo(event) {
    if (!currentProtocoloId) return;
    const file = event.target.files[0];
    if (!file) return;
    
    const statusText = document.getElementById('upload-status');
    const btn = document.getElementById('btn-upload-anexo');
    
    const formData = new FormData();
    formData.append('documento', file);
    
    try {
        statusText.textContent = 'Enviando...';
        btn.disabled = true;
        
        // Use standard fetch instead of apiFetch if it defaults to application/json
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/administrativo/protocolos/${currentProtocoloId}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (!res.ok) throw new Error('Falha no upload');
        const data = await res.json();
        
        const p = protocolosAdministrativosList.find(x => x.id === currentProtocoloId);
        if (p) {
            p.arquivos_json = JSON.stringify(data.arquivos);
            renderizarAnexos(p.arquivos_json);
        }
        showToast('Arquivo anexado!', 'success');
    } catch(e) {
        console.error(e);
        showToast('Erro ao anexar arquivo', 'error');
    } finally {
        statusText.textContent = '';
        btn.disabled = false;
        event.target.value = ''; // reset file input
    }
}
