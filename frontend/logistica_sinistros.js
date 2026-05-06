// ============================================================
// MÓDULO: LOGÍSTICA SINISTROS
// Visão global de todos os sinistros abertos.
// Permite apenas o registro de novos sinistros (sem assinaturas).
// ============================================================

let _logSinListaColabs = [];        // cache de todos os colaboradores

/* ── Entrada principal: renderiza a tela de Logística › Sinistros ── */
window.renderLogisticaSinistros = async function() {
    const container = document.getElementById('logistica-sinistros-container');
    if (!container) return;

    // carrega colaboradores para o modal
    if (_logSinListaColabs.length === 0) {
        try {
            const data = await apiGet('/colaboradores');
            if (Array.isArray(data)) _logSinListaColabs = data;
        } catch(e) { console.error('[LogSinistros] erro ao carregar colaboradores', e); }
    }

    container.innerHTML = `
    <div style="padding:1.5rem;">
        <!-- Header -->
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
            <div style="display:flex; align-items:center; gap:14px;">
                <div style="background:linear-gradient(135deg,#d97706,#b45309); width:52px; height:52px; border-radius:14px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(217,119,6,0.3);">
                    <i class="ph ph-car-crash" style="font-size:1.7rem; color:#fff;"></i>
                </div>
                <div>
                    <h1 style="margin:0; font-size:1.5rem; font-weight:800; color:#0f172a;">Sinistros</h1>
                    <p style="margin:0; color:#64748b; font-size:0.85rem;">Boletins de Ocorrência · Logística</p>
                </div>
            </div>
            <button onclick="window.logSinAbrirModalNovo()" style="background:#d97706; color:#fff; border:none; padding:10px 20px; border-radius:8px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px; font-size:0.9rem;">
                <i class="ph ph-plus"></i> Novo Sinistro
            </button>
        </div>

        <!-- Lista global de sinistros -->
        <div id="log-sin-lista-area">
            <div style="text-align:center; padding:3rem; color:#94a3b8;">
                <i class="ph ph-spinner ph-spin" style="font-size:2rem;"></i>
                <p style="margin-top:8px;">Carregando sinistros...</p>
            </div>
        </div>
    </div>`;

    await window.logSinCarregarListaGeral();
};

/* ── Carregar lista global de sinistros ─────────────────── */
window.logSinCarregarListaGeral = async function() {
    const area = document.getElementById('log-sin-lista-area');
    if (!area) return;

    let sinistros = [];
    try {
        sinistros = await apiGet(`/logistica/sinistros`) || [];
    } catch(e) {
        area.innerHTML = `<div class="alert alert-info"><i class="ph ph-info"></i> Erro ao carregar sinistros.</div>`;
        return;
    }

    if (sinistros.length === 0) {
        area.innerHTML = `
            <div style="text-align:center; padding:3rem; background:#fff; border-radius:12px; border:2px dashed #e2e8f0;">
                <i class="ph ph-car-crash" style="font-size:3rem; color:#cbd5e1; margin-bottom:1rem; display:block;"></i>
                <h5 style="color:#475569; font-weight:600; margin-bottom:0.5rem;">Nenhum sinistro registrado</h5>
                <p style="color:#94a3b8; font-size:0.9rem; margin:0;">Clique em "Novo Sinistro" para registrar um Boletim de Ocorrência.</p>
            </div>`;
        return;
    }

    area.innerHTML = '<div id="log-sin-cards" style="display:flex; flex-direction:column; gap:1.25rem;"></div>';
    const cardsContainer = document.getElementById('log-sin-cards');
    sinistros.forEach(s => window._logSinRenderCardGeral(s, cardsContainer));
};

/* ── Renderizar card global de sinistro ──────────────────────────────── */
window._logSinRenderCardGeral = function(s, container) {
    const card = document.createElement('div');
    card.style.cssText = 'background:#fff; border-radius:12px; border:1px solid #e2e8f0; padding:1.25rem; box-shadow:0 1px 3px rgba(0,0,0,0.05); display:flex; flex-direction:column; gap:1rem; transition: all 0.2s;';

    const statusMap = {
        'pendente': { text: 'Aguardando Assinaturas (RH)', color: '#f59e0b', bg: '#fef3c7' },
        'assinado': { text: 'Finalizado e Assinado',  color: '#10b981', bg: '#d1fae5' }
    };
    const st = statusMap[s.status] || { text: s.status, color: '#64748b', bg: '#f1f5f9' };

    let orcamentosLinks = '';
    if (s.orcamentos_paths) {
        try {
            const orcs = JSON.parse(s.orcamentos_paths);
            if (Array.isArray(orcs) && orcs.length > 0) {
                orcamentosLinks = orcs.map((path, idx) => 
                    `<a href="javascript:void(0)" onclick="window.abrirArquivoOneDrive('${path}')" style="display:inline-flex; align-items:center; gap:4px; font-size:0.8rem; color:#0284c7; background:#e0f2fe; padding:4px 8px; border-radius:4px; text-decoration:none; margin-right:4px;">
                        <i class="ph ph-paperclip"></i> Orçamento ${idx + 1}
                    </a>`
                ).join('');
            }
        } catch(e) {}
    }

    const aberturaTxt = s.usuario_abertura ? `Aberto por: <b>${s.usuario_abertura}</b>` : 'Aberto via Sistema';
    const dataCriacao = s.created_at ? new Date(s.created_at).toLocaleString('pt-BR') : '—';
    const assinCondutorTxt = s.data_assinatura_condutor ? `Assinado em: ${new Date(s.data_assinatura_condutor).toLocaleString('pt-BR')}` : 'Não assinado';

    card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div style="display:flex; gap:12px;">
                <!-- Setinha de expansão -->
                <button onclick="this.parentElement.parentElement.nextElementSibling.style.display = this.parentElement.parentElement.nextElementSibling.style.display === 'none' ? 'block' : 'none'; this.querySelector('i').classList.toggle('ph-caret-right'); this.querySelector('i').classList.toggle('ph-caret-down');" style="background:none; border:none; cursor:pointer; padding:4px; color:#64748b; font-size:1.2rem;">
                    <i class="ph ph-caret-right"></i>
                </button>
                <div>
                    <h5 style="margin:0; font-size:1.1rem; color:#0f172a; font-weight:700;"><i class="ph ph-user" style="color:#d97706;"></i> ${s.nome_completo || 'Colaborador Desconhecido'}</h5>
                    <p style="margin:4px 0 0; font-size:0.85rem; color:#64748b;"><i class="ph ph-file-text"></i> BO: ${s.numero_boletim || 'N/A'} &nbsp;|&nbsp; <i class="ph ph-calendar"></i> Ocorrido: ${s.data_hora || '—'}</p>
                    <p style="margin:4px 0 0; font-size:0.85rem; color:#64748b;">${s.veiculo || '—'} &nbsp;|&nbsp; Placa: ${s.placa || '—'}</p>
                </div>
            </div>
            <span style="display:inline-block; padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:600; color:${st.color}; background:${st.bg}; white-space:nowrap;">${st.text}</span>
        </div>
        
        <!-- Detalhes Expansíveis -->
        <div style="display:none; padding-top:1rem; margin-top:0.5rem; border-top:1px dashed #e2e8f0;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; font-size:0.85rem; color:#475569;">
                <div>
                    <p style="margin:0 0 6px 0;"><i class="ph ph-info"></i> ${aberturaTxt}</p>
                    <p style="margin:0 0 6px 0;"><i class="ph ph-clock"></i> Registrado no sistema: ${dataCriacao}</p>
                    <p style="margin:0 0 6px 0;"><i class="ph ph-pen"></i> Assinatura do Colaborador: ${assinCondutorTxt}</p>
                </div>
                <div>
                    <p style="margin:0 0 6px 0;"><strong>Anexos:</strong></p>
                    ${s.boletim_path ? `<a href="javascript:void(0)" onclick="window.abrirArquivoOneDrive('${s.boletim_path}')" style="display:inline-flex; align-items:center; gap:4px; font-size:0.8rem; color:#d97706; background:#fef3c7; padding:4px 8px; border-radius:4px; text-decoration:none; margin-bottom:6px;"><i class="ph ph-file-pdf"></i> Visualizar Boletim de Ocorrência</a><br/>` : ''}
                    ${orcamentosLinks}
                </div>
            </div>
        </div>
    `;

    container.appendChild(card);
};

/* ── Modal Logística: Novo Sinistro ─────────────────────────── */
window.logSinAbrirModalNovo = function() {
    let m = document.getElementById('modal-logistica-novo-sinistro');
    if (!m) {
        m = document.createElement('div');
        m.id = 'modal-logistica-novo-sinistro';
        m.className = 'modal';
        
        const colabsOptions = _logSinListaColabs.map(c => `<option value="${c.id}">${c.nome_completo} (${c.cpf || ''})</option>`).join('');

        m.innerHTML = `
            <div class="modal-content" style="max-width:640px;">
                <div class="modal-header">
                    <h3><i class="ph ph-car-crash" style="color:#d97706;"></i> Registrar Novo Sinistro</h3>
                    <button onclick="document.getElementById('modal-logistica-novo-sinistro').style.display='none'" class="btn-close"><i class="ph ph-x"></i></button>
                </div>
                <div class="modal-body">
                    <div id="log-sinistro-step-1">
                        <div class="input-group" style="margin-bottom: 1rem;">
                            <label>Selecionar Colaborador *</label>
                            <select id="log-sin-colab-select" class="form-control" style="font-size: 0.9rem; padding: 10px;">
                                <option value="">-- Selecione o colaborador envolvido --</option>
                                ${colabsOptions}
                            </select>
                        </div>
                        <p style="font-size:0.9rem; color:#475569; margin-bottom:1rem;">Anexe o Boletim de Ocorrência (PDF). O sistema tentará extrair os dados automaticamente.</p>
                        <div class="input-group">
                            <label>Arquivo do BO *</label>
                            <input type="file" id="log-sinistro-file-bo" accept=".pdf,image/*" class="form-control">
                        </div>
                        <button type="button" class="btn btn-primary" onclick="window.logSinProcessarLeituraBO()" style="width:100%; margin-top:0.5rem; background:#d97706; border-color:#b45309;">
                            <i class="ph ph-scan"></i> Analisar BO e Continuar
                        </button>
                    </div>

                    <div id="log-sinistro-step-2" style="display:none;">
                        <div id="log-sin-bo-notif" style="display:none; border-radius:8px; padding:0.5rem 0.75rem; margin-bottom:1rem; font-size:0.85rem;"></div>

                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                            <div class="input-group">
                                <label>Boletim Nº</label>
                                <input type="text" id="log-sin-bo" class="form-control">
                            </div>
                            <div class="input-group">
                                <label>Data e Hora da Ocorrência</label>
                                <input type="text" id="log-sin-data" class="form-control" placeholder="13/04/2026 às 13:30">
                            </div>
                        </div>
                        <div class="input-group">
                            <label>Natureza da Ocorrência</label>
                            <input type="text" id="log-sin-natureza" class="form-control">
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                            <div class="input-group">
                                <label>Marca/Modelo</label>
                                <input type="text" id="log-sin-veiculo" class="form-control">
                            </div>
                            <div class="input-group">
                                <label>Placa</label>
                                <input type="text" id="log-sin-placa" class="form-control">
                            </div>
                        </div>

                        <hr style="border-color:#e2e8f0; margin:1.25rem 0;"/>
                        
                        <div style="background:#f8fafc; padding:1rem; border-radius:8px; border:1px solid #e2e8f0; margin-bottom:1rem;">
                            <p style="margin:0 0 10px; font-weight:600; font-size:0.9rem;"><i class="ph ph-paperclip"></i> Anexar Orçamentos</p>
                            <div id="log-sin-orc-upload">
                                <div id="log-sin-orcamentos-list" style="display:flex; flex-direction:column; gap:8px;">
                                    <input type="file" name="log_sin_orc_file" accept=".pdf,image/*" class="form-control" style="font-size:0.8rem;">
                                </div>
                                <button type="button" class="btn btn-sm" onclick="window._addLogSinOrcField()" style="margin-top:8px; width:100%; border:1px dashed #cbd5e1; background:#fff; color:#475569;"><i class="ph ph-plus"></i> Adicionar mais orçamentos</button>
                            </div>
                        </div>

                        <div class="alert alert-warning" style="font-size: 0.85rem; margin-bottom: 1rem;">
                            <i class="ph ph-warning"></i> Assinaturas e acordos de desconto devem ser realizados exclusivamente pelo departamento de Recursos Humanos. O RH será notificado deste registro.
                        </div>

                        <button type="button" class="btn btn-primary" onclick="window.logSinSalvarFinal()" style="width:100%; background:#059669; border:none;">
                            <i class="ph ph-check"></i> Concluir Registro
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(m);
    }

    document.getElementById('log-sinistro-step-1').style.display = 'block';
    document.getElementById('log-sinistro-step-2').style.display = 'none';
    document.getElementById('log-sinistro-file-bo').value = '';
    document.getElementById('log-sin-colab-select').value = '';
    
    // reset orcamentos list
    const orcList = document.getElementById('log-sin-orcamentos-list');
    if (orcList) {
        orcList.innerHTML = '<input type="file" name="log_sin_orc_file" accept=".pdf,image/*" class="form-control" style="font-size:0.8rem;">';
    }

    m.style.display = 'flex';
};

window._addLogSinOrcField = function() {
    const d = document.createElement('div');
    d.innerHTML = '<input type="file" name="log_sin_orc_file" accept=".pdf,image/*" class="form-control" style="font-size:0.8rem; margin-top:4px;">';
    document.getElementById('log-sin-orcamentos-list').appendChild(d);
};

window.logSinProcessarLeituraBO = async function() {
    const colabSelect = document.getElementById('log-sin-colab-select');
    if (!colabSelect.value) return alert('Por favor, selecione o colaborador envolvido no sinistro.');

    const fileInput = document.getElementById('log-sinistro-file-bo');
    if (!fileInput.files.length) return alert('Selecione o arquivo do BO.');

    const formData = new FormData();
    formData.append('arquivo', fileInput.files[0]);

    const btn = document.querySelector('#log-sinistro-step-1 button');
    const oldText = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Lendo documento...';
    btn.disabled = true;

    let boletimData = {};
    try {
        const res = await fetch(`${API_URL}/extrair-bo`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` },
            body: formData
        });
        if (res.status === 401 || res.status === 403) {
            alert("Aviso: Sua sessão expirou. Por favor, recarregue a página e faça login novamente para enviar o documento.");
            location.reload();
            return;
        }

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro interno no servidor.');

        boletimData = data;
    } catch(e) {
        console.warn('Leitura BO falhou, modo manual:', e.message);
    } finally {
        btn.innerHTML = oldText;
        btn.disabled = false;

        document.getElementById('log-sin-bo').value = boletimData.boletim || '';
        document.getElementById('log-sin-data').value = boletimData.data_hora || '';
        document.getElementById('log-sin-natureza').value = boletimData.natureza || '';
        document.getElementById('log-sin-veiculo').value = boletimData.marca_modelo || '';
        document.getElementById('log-sin-placa').value = boletimData.placa || '';

        const temDados = boletimData.boletim || boletimData.natureza || boletimData.placa || boletimData.marca_modelo;
        const notifEl = document.getElementById('log-sin-bo-notif');
        if (notifEl) {
            notifEl.style.display = 'block';
            if (temDados) {
                notifEl.innerHTML = '<i class="ph ph-check-circle"></i> Dados extraídos. Confira ou edite se necessário.';
                notifEl.style.cssText = 'display:block;background:#d1fae5;color:#065f46;border:1px solid #6ee7b7;border-radius:8px;padding:0.5rem 0.75rem;margin-bottom:1rem;font-size:0.85rem;';
            } else {
                notifEl.innerHTML = '<i class="ph ph-warning"></i> Preenchimento automático não disponível para este PDF. Preencha os campos abaixo manualmente.';
                notifEl.style.cssText = 'display:block;background:#fef3c7;color:#92400e;border:1px solid #fcd34d;border-radius:8px;padding:0.5rem 0.75rem;margin-bottom:1rem;font-size:0.85rem;';
            }
        }

        document.getElementById('log-sinistro-step-1').style.display = 'none';
        document.getElementById('log-sinistro-step-2').style.display = 'block';
    }
};

window.logSinSalvarFinal = async function() {
    const colabId = document.getElementById('log-sin-colab-select').value;
    if (!colabId) return alert('Colaborador não selecionado.');

    const fileBO = document.getElementById('log-sinistro-file-bo').files[0];
    if (!fileBO) return alert('O arquivo do BO não foi encontrado. Volte ao passo anterior.');

    const formData = new FormData();
    formData.append('arquivo', fileBO);
    formData.append('numero_boletim', document.getElementById('log-sin-bo').value || '');
    formData.append('data_hora', document.getElementById('log-sin-data').value || '');
    formData.append('natureza', document.getElementById('log-sin-natureza').value || '');
    formData.append('veiculo', document.getElementById('log-sin-veiculo').value || '');
    formData.append('placa', document.getElementById('log-sin-placa').value || '');
    // Logística apenas registra, sem descontos definidos
    formData.append('desconto', 'Não');

    // Orçamentos
    const fileInputs = document.querySelectorAll('input[name="log_sin_orc_file"]');
    const filesOrc = [];
    fileInputs.forEach(i => { if(i.files && i.files.length > 0) for(let f of i.files) filesOrc.push(f); });
    if (filesOrc.length > 0) {
        const orcsBase64 = [];
        for (const f of filesOrc) {
            const b64 = await new Promise(r => { const rd = new FileReader(); rd.onload = () => r(rd.result); rd.readAsDataURL(f); });
            orcsBase64.push(b64);
        }
        formData.append('orcamentos_base64', JSON.stringify(orcsBase64));
    }

    const btn = document.querySelector('#log-sinistro-step-2 button.btn-primary');
    const oldText = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Registrando...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/colaboradores/${colabId}/sinistros`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` },
            body: formData
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || 'Erro ao registrar sinistro.');

        if (typeof Toastify !== 'undefined') Toastify({ text: 'Sinistro registrado com sucesso!', backgroundColor: '#10b981' }).showToast();
        
        document.getElementById('modal-logistica-novo-sinistro').style.display = 'none';
        
        // Recarregar a lista
        await window.logSinCarregarListaGeral();
        
    } catch(e) {
        alert('Erro ao salvar: ' + e.message);
    } finally {
        btn.innerHTML = oldText;
        btn.disabled = false;
    }
};
