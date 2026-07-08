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
                <div style="background:linear-gradient(135deg,#059669,#047857); width:52px; height:52px; border-radius:14px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(5,150,105,0.3);">
                    <i class="ph ph-warning" style="font-size:1.7rem; color:#fff;"></i>
                </div>
                <div>
                    <h1 style="margin:0; font-size:1.5rem; font-weight:800; color:#0f172a;">Sinistros</h1>
                    <p style="margin:0; color:#64748b; font-size:0.85rem;">Boletins de Ocorrência · Logística</p>
                </div>
            </div>
            <div style="display:flex; gap:10px;">
                <a href="https://sso-cidadao.policia-civil.sp.gov.br/realms/dipol-cidadao/protocol/openid-connect/auth?response_type=code&client_id=dipol-de&state=bnVCS1dCUC1LNnFHYUVZWXVhZWtOWVQxa0ZFaGtYdH5tTTJUVHdKeHFCcWtv%3B%252Farea-do-cidadao%253Ffocus%253Dacompanhar-bo&redirect_uri=https%3A%2F%2Fdelegaciadigital.policia-civil.sp.gov.br%2Farea-do-cidadao&scope=openid%20profile%20email&code_challenge=AJsiT-cVMuAZa3xEGvNfCpPb2bFDI94RGF3w_A_mq6I&code_challenge_method=S256&nonce=bnVCS1dCUC1LNnFHYUVZWXVhZWtOWVQxa0ZFaGtYdH5tTTJUVHdKeHFCcWtv" target="_blank" style="background:#0284c7; color:#fff; text-decoration:none; padding:10px 20px; border-radius:8px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px; font-size:0.9rem; transition:all .2s;" onmouseover="this.style.background='#0369a1'" onmouseout="this.style.background='#0284c7'">
                    <i class="ph ph-magnifying-glass"></i> Acompanhar Andamento
                </a>
                <a href="https://sso-cidadao.policia-civil.sp.gov.br/realms/dipol-cidadao/protocol/openid-connect/auth?response_type=code&client_id=dipol-de&state=MWh0WUp0aFNWbTNJeUdLV35IUnNjblllTWExenozLUFqWnhING5FR25nRVlq%3B%252Fcomunicar-ocorrencia&redirect_uri=https%3A%2F%2Fdelegaciadigital.policia-civil.sp.gov.br%2Farea-do-cidadao&scope=openid%20profile%20email&code_challenge=s1h_YNlZJ4yV7DZZFYy3UhskE2KUpkpmMBRVDOlVbyQ&code_challenge_method=S256&nonce=MWh0WUp0aFNWbTNJeUdLV35IUnNjblllTWExenozLUFqWnhING5FR25nRVlq" target="_blank" style="background:#eab308; color:#fff; text-decoration:none; padding:10px 20px; border-radius:8px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px; font-size:0.9rem; transition:all .2s;" onmouseover="this.style.background='#ca8a04'" onmouseout="this.style.background='#eab308'">
                    <i class="ph ph-warning-circle"></i> Comunicar Ocorrência
                </a>
                <button onclick="window.logSinAbrirModalNovo()" style="background:#059669; color:#fff; border:none; padding:10px 20px; border-radius:8px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px; font-size:0.9rem; transition:all .2s;" onmouseover="this.style.background='#047857'" onmouseout="this.style.background='#059669'">
                    <i class="ph ph-plus"></i> Novo Sinistro
                </button>
                <button onclick="window.abrirModalVideoLogistica()" style="background:#f1f5f9; color:#0369a1; border:1px solid #bae6fd; padding:10px; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:1.2rem; transition:all .2s;" onmouseover="this.style.background='#e0f2fe'" onmouseout="this.style.background='#f1f5f9'" title="Vídeo Explicativo">
                    <i class="ph ph-play-circle"></i>
                </button>
            </div>
        </div>

        <!-- Lista global de sinistros -->
        <div style="margin-bottom:1rem; position:relative;">
            <!-- Dummy inputs para capturar o autofill agressivo do Chrome -->
            <input type="text" style="width:0; height:0; position:absolute; z-index:-1; opacity:0;" tabindex="-1" autocomplete="username">
            <input type="password" style="width:0; height:0; position:absolute; z-index:-1; opacity:0;" tabindex="-1" autocomplete="current-password">
            
            <i class="ph ph-magnifying-glass" style="position:absolute; left:12px; top:12px; color:#94a3b8; font-size:1.1rem;"></i>
            <input type="search" id="log-sin-search" name="log_sin_search_aleatorio" placeholder="Buscar sinistro por nome do colaborador ou BO..." onkeyup="window.logSinFiltrarLista()" class="form-control" style="padding:12px 12px 12px 36px; border-radius:8px; height:auto;" autocomplete="off" role="presentation" value="">
        </div>
        <div id="log-sin-lista-area">
            <div style="text-align:center; padding:3rem; color:#94a3b8;">
                <i class="ph ph-spinner ph-spin" style="font-size:2rem;"></i>
                <p style="margin-top:8px;">Carregando sinistros...</p>
            </div>
        </div>
    </div>`;

    // Limpa o campo caso o Chrome atrase o autofill
    setTimeout(() => {
        const inp = document.getElementById('log-sin-search');
        if (inp) inp.value = '';
    }, 500);

    await window.logSinCarregarListaGeral();
};

window.logSinFiltrarLista = function() {
    const termo = document.getElementById('log-sin-search').value.toLowerCase();
    const cards = document.querySelectorAll('#log-sin-cards > div');
    cards.forEach(card => {
        const txt = card.innerText.toLowerCase();
        if (txt.includes(termo)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
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
                <i class="ph ph-warning" style="font-size:3rem; color:#cbd5e1; margin-bottom:1rem; display:block;"></i>
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

    let midiasLinks = '';
    if (s.midias_paths) {
        try {
            const midias = JSON.parse(s.midias_paths);
            if (Array.isArray(midias) && midias.length > 0) {
                midiasLinks = midias.map((m, idx) => {
                    const isVideo = m.tipo && m.tipo.startsWith('video/');
                    const texto = isVideo ? `Vídeo do dano ${idx + 1}` : `Foto do dano ${idx + 1}`;
                    const icone = 'ph-paperclip';
                    return `<a href="${m.url}" target="_blank" style="display:inline-flex; align-items:center; gap:4px; font-size:0.8rem; color:#0369a1; background:#f0f9ff; padding:4px 8px; border-radius:4px; text-decoration:none; margin-right:4px;">
                        <i class="ph ${icone}"></i> ${texto}
                    </a>`;
                }).join('');
            }
        } catch(e) {}
    }

    const aberturaTxt = s.usuario_abertura ? `Aberto por: <b>${s.usuario_abertura}</b>` : 'Aberto via Sistema';
    const dataCriacao = s.created_at ? new Date((s.created_at + 'Z').replace(' Z','Z').replace(' ', 'T')).toLocaleString('pt-BR') : '—';
    const assinCondutorTxt = s.data_assinatura_condutor ? `Assinado em: ${new Date((s.data_assinatura_condutor + 'Z').replace(' Z','Z').replace(' ', 'T')).toLocaleString('pt-BR')}` : 'Não assinado';

    card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div style="display:flex; gap:12px;">
                <!-- Setinha de expansão -->
                <button onclick="this.parentElement.parentElement.nextElementSibling.style.display = this.parentElement.parentElement.nextElementSibling.style.display === 'none' ? 'block' : 'none'; this.querySelector('i').classList.toggle('ph-caret-right'); this.querySelector('i').classList.toggle('ph-caret-down');" style="background:none; border:none; cursor:pointer; padding:4px; color:#64748b; font-size:1.2rem;">
                    <i class="ph ph-caret-right"></i>
                </button>
                <div>
                    <h5 style="margin:0; font-size:1.1rem; color:#0f172a; font-weight:700;"><i class="ph ph-user" style="color:#059669;"></i> ${s.nome_completo || 'Colaborador Desconhecido'}</h5>
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
                    ${s.boletim_path ? `<a href="javascript:void(0)" onclick="window.abrirArquivoOneDrive('${s.boletim_path}')" style="display:inline-flex; align-items:center; gap:4px; font-size:0.8rem; color:#059669; background:#dcfce7; padding:4px 8px; border-radius:4px; text-decoration:none; margin-bottom:6px;"><i class="ph ph-file-pdf"></i> Visualizar Boletim de Ocorrência</a><br/>` : ''}
                    ${orcamentosLinks}
                    ${midiasLinks}
                </div>
            </div>
        </div>
        
        <div style="background:#f8fafc; border-top:1px dashed #cbd5e1; padding-top:0.75rem; display:flex; justify-content:space-between; align-items:center; margin-top:0.5rem;">
            <div style="font-size:0.8rem; color:#475569;">

                ${s.tipo_sinistro ? `<strong>Tipo:</strong> ${s.tipo_sinistro}` : ''}
            </div>
            ${s.status === 'pendente' ? `
            <button onclick="window.logSinAbrirModalEditar(${s.id}, ${s.colaborador_id})" title="Editar sinistro"
                style="background:#f1f5f9; border:1.5px solid #cbd5e1; color:#475569; border-radius:8px; padding:5px 14px; font-size:0.78rem; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:5px; transition:all .2s;"
                onmouseover="this.style.background='#e2e8f0'; this.style.color='#1e293b'" onmouseout="this.style.background='#f1f5f9'; this.style.color='#475569'">
                <i class="ph ph-pencil-simple"></i> Editar
            </button>` : `
            <span style="font-size:0.72rem; color:#94a3b8; display:flex; align-items:center; gap:4px;">
                <i class="ph ph-lock"></i> Assinado — edição bloqueada
            </span>`}
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
                    <h3><i class="ph ph-warning" style="color:#059669;"></i> Registrar Novo Sinistro</h3>
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
                        <button type="button" class="btn btn-primary" onclick="window.logSinProcessarLeituraBO()" style="width:100%; margin-top:0.5rem; background:#059669; border-color:#047857;">
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

                        <div id="area-log-sinistro-desconto" style="display:none;"></div>
                        
                        <div style="background:#f8fafc; padding:1rem; border-radius:8px; border:1px solid #e2e8f0; margin-bottom:1rem;">
                            <p style="margin:0 0 8px; font-weight:600; font-size:0.9rem;"><i class="ph ph-receipt"></i> Orçamentos (fotos JPG/PNG)</p>
                            <div id="log-sin-orc-dropzone"
                                style="border:2px dashed #cbd5e1; border-radius:10px; background:#f1f5f9; padding:1.2rem 1rem; text-align:center; cursor:pointer; transition:all .2s;"
                                onclick="document.getElementById('log-sin-orcs-file').click()"
                                ondragover="event.preventDefault(); this.style.background='#e2e8f0'; this.style.borderColor='#94a3b8';"
                                ondragleave="this.style.background='#f1f5f9'; this.style.borderColor='#cbd5e1';"
                                ondrop="event.preventDefault(); this.style.background='#f1f5f9'; this.style.borderColor='#cbd5e1'; window._logSinAdicionarOrcs(event.dataTransfer.files);">
                                <i class="ph ph-image" style="font-size:1.8rem; color:#94a3b8; display:block; margin-bottom:4px;"></i>
                                <p style="margin:0; font-weight:600; font-size:0.82rem; color:#475569;">Arraste fotos dos orçamentos aqui</p>
                                <p style="margin:2px 0 0; font-size:0.72rem; color:#94a3b8;">ou clique para selecionar &bull; apenas JPG e PNG &bull; múltiplos de uma vez</p>
                                <input type="file" id="log-sin-orcs-file" multiple accept="image/jpeg,image/png,.jpg,.png" style="display:none;"
                                    onchange="window._logSinAdicionarOrcs(this.files); this.value='';">
                            </div>
                            <div id="log-sin-orcs-preview" style="display:none; margin-top:10px; display:flex; flex-wrap:wrap; gap:8px;"></div>
                            <p id="log-sin-orcs-count" style="margin:6px 0 0; font-size:0.75rem; color:#475569; display:none;"></p>
                        </div>

                        <div style="background:#f0f9ff; padding:1rem; border-radius:8px; border:1px solid #bae6fd; margin-bottom:1rem;">
                            <p style="margin:0 0 8px; font-weight:600; font-size:0.9rem; color:#0369a1;"><i class="ph ph-camera"></i> Fotos e Vídeos dos Itens Danificados</p>
                            <div id="log-sin-dropzone"
                                style="border:2px dashed #7dd3fc; border-radius:10px; background:#e0f2fe; padding:1.5rem 1rem; text-align:center; cursor:pointer; transition:all .2s;"
                                onclick="document.getElementById('log-sin-midias-file').click()"
                                ondragover="event.preventDefault(); this.style.background='#bae6fd'; this.style.borderColor='#0ea5e9';"
                                ondragleave="this.style.background='#e0f2fe'; this.style.borderColor='#7dd3fc';"
                                ondrop="event.preventDefault(); this.style.background='#e0f2fe'; this.style.borderColor='#7dd3fc'; window._logSinAdicionarMidias(event.dataTransfer.files);">
                                <i class="ph ph-upload-simple" style="font-size:2rem; color:#0ea5e9; display:block; margin-bottom:6px;"></i>
                                <p style="margin:0; font-weight:600; font-size:0.85rem; color:#0369a1;">Arraste fotos e vídeos aqui</p>
                                <p style="margin:2px 0 0; font-size:0.75rem; color:#38bdf8;">ou clique para selecionar &bull; múltiplos arquivos &bull; Máx. 500MB cada</p>
                                <input type="file" id="log-sin-midias-file" multiple accept="image/*,video/*" style="display:none;"
                                    onchange="window._logSinAdicionarMidias(this.files); this.value='';">
                            </div>
                            <div id="log-sin-midias-preview" style="display:none; margin-top:10px; display:flex; flex-wrap:wrap; gap:8px;"></div>
                            <p id="log-sin-midias-count" style="margin:6px 0 0; font-size:0.75rem; color:#0369a1; display:none;"></p>
                        </div>

                        <div class="alert alert-warning" style="font-size: 0.85rem; margin-bottom: 1rem;">
                            <i class="ph ph-warning"></i> Assinaturas e acordos de desconto devem ser finalizados exclusivamente pelo departamento de Recursos Humanos. O RH será notificado deste registro e fará a coleta da assinatura do colaborador.
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
    window._logSinMidiasFiles = [];
    if (typeof window._logSinAtualizarPreviewMidias === 'function') window._logSinAtualizarPreviewMidias();

    m.style.display = 'flex';
};

// _addLogSinOrcField removido - usar _logSinAdicionarOrcs com drag-and-drop

// ============================================================
// GERENCIADOR DE MÍDIAS DA LOGÍSTICA - drag-and-drop + multi-select
// ============================================================
window._logSinMidiasFiles = [];

window._logSinAdicionarMidias = function(fileList) {
    if (!fileList || !fileList.length) return;
    Array.from(fileList).forEach(function(f) {
        var jaExiste = window._logSinMidiasFiles.some(function(x) { return x.name === f.name && x.size === f.size; });
        if (!jaExiste) window._logSinMidiasFiles.push(f);
    });
    window._logSinAtualizarPreviewMidias();
};

window._logSinRemoverMidia = function(idx) {
    window._logSinMidiasFiles.splice(idx, 1);
    window._logSinAtualizarPreviewMidias();
};

window._logSinAtualizarPreviewMidias = function() {
    var previewEl = document.getElementById('log-sin-midias-preview');
    var countEl   = document.getElementById('log-sin-midias-count');
    if (!previewEl) return;
    var files = window._logSinMidiasFiles;
    if (!files.length) {
        previewEl.style.display = 'none';
        if (countEl) countEl.style.display = 'none';
        return;
    }
    previewEl.style.display = 'flex';
    previewEl.innerHTML = '';
    if (countEl) {
        var nFotos  = files.filter(function(f){ return f.type.startsWith('image/'); }).length;
        var nVideos = files.filter(function(f){ return f.type.startsWith('video/'); }).length;
        var partes = [];
        if (nFotos)  partes.push(nFotos  + ' foto'  + (nFotos  > 1 ? 's' : ''));
        if (nVideos) partes.push(nVideos + ' vídeo' + (nVideos > 1 ? 's' : ''));
        countEl.textContent = 'Selecionado: ' + partes.join(' e ');
        countEl.style.display = 'block';
    }
    files.forEach(function(f, idx) {
        var card = document.createElement('div');
        card.title = f.name;
        card.style.cssText = 'position:relative;width:80px;height:80px;border-radius:8px;overflow:hidden;border:2px solid #bae6fd;background:#f0f9ff;flex-shrink:0;';
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
            icon.innerHTML = '<i class="ph ph-video" style="font-size:1.6rem;color:#60a5fa;"></i><span style="font-size:0.55rem;color:#94a3b8;margin-top:2px;padding:0 4px;overflow:hidden;word-break:break-all;">' + f.name.slice(0,14) + '</span>';
            card.appendChild(icon);
        }
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.innerHTML = '&times;';
        btn.style.cssText = 'position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;border:none;background:rgba(239,68,68,0.9);color:#fff;font-size:0.8rem;cursor:pointer;padding:0;';
        btn.setAttribute('onclick', 'window._logSinRemoverMidia(' + idx + ')');
        card.appendChild(btn);
        previewEl.appendChild(card);
    });
};

// ============================================================
// GERENCIADOR DE ORÇAMENTOS DA LOGÍSTICA - drag-and-drop, JPG/PNG
// ============================================================
window._logSinOrcFiles = [];

window._logSinAdicionarOrcs = function(fileList) {
    if (!fileList || !fileList.length) return;
    Array.from(fileList).forEach(function(f) {
        var ext = f.name.split('.').pop().toLowerCase();
        if (!['jpg','jpeg','png'].includes(ext)) {
            alert('Apenas imagens JPG ou PNG são aceitas para orçamentos. Arquivo ignorado: ' + f.name);
            return;
        }
        var jaExiste = window._logSinOrcFiles.some(function(x) { return x.name === f.name && x.size === f.size; });
        if (!jaExiste) window._logSinOrcFiles.push(f);
    });
    window._logSinAtualizarPreviewOrcs();
};

window._logSinRemoverOrc = function(idx) {
    window._logSinOrcFiles.splice(idx, 1);
    window._logSinAtualizarPreviewOrcs();
};

window._logSinAtualizarPreviewOrcs = function() {
    var previewEl = document.getElementById('log-sin-orcs-preview');
    var countEl   = document.getElementById('log-sin-orcs-count');
    if (!previewEl) return;
    var files = window._logSinOrcFiles;
    if (!files.length) {
        previewEl.style.display = 'none';
        if (countEl) countEl.style.display = 'none';
        return;
    }
    previewEl.style.display = 'flex';
    previewEl.innerHTML = '';
    if (countEl) {
        countEl.textContent = files.length + ' orçamento' + (files.length > 1 ? 's' : '') + ' selecionado' + (files.length > 1 ? 's' : '');
        countEl.style.display = 'block';
    }
    files.forEach(function(f, idx) {
        var card = document.createElement('div');
        card.title = f.name;
        card.style.cssText = 'position:relative;width:80px;height:80px;border-radius:8px;overflow:hidden;border:2px solid #d1d5db;background:#f9fafb;flex-shrink:0;';
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
        btn.setAttribute('onclick', 'window._logSinRemoverOrc(' + idx + ')');
        card.appendChild(btn);
        previewEl.appendChild(card);
    });
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
        // Limpa "Crime Consumado..." da natureza antes de preencher
        const naturezaLimpa = (boletimData.natureza || '').replace(/Crime\s+Consumado[^\-]*\-?\s*/gi, '').trim();
        document.getElementById('log-sin-natureza').value = naturezaLimpa;
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

window.toggleLogSinistroDesconto = function(show) {
    document.getElementById('area-log-sinistro-desconto').style.display = show ? 'block' : 'none';
};

window._calcLogSinParcela = function() {
    const vTotalStr = document.getElementById('log-sin-valor-total').value || '0';
    const vTotalRaw = parseFloat(vTotalStr.replace(/[^0-9,]/g,'').replace(',','.')) || 0;
    const qtd = parseInt(document.getElementById('log-sin-parcelas').value) || 1;
    const vParcela = vTotalRaw / qtd;
    
    document.getElementById('log-sin-valor-parcela-display').innerText = 'Parcela: R$ ' + vParcela.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
    document.getElementById('log-sin-parcelas').dataset.valor_parcela = vParcela.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
};

window.logSinSalvarFinal = async function() {
    if (window._isSavingSinistro) return;

    const colabId = document.getElementById('log-sin-colab-select').value;
    if (!colabId) return alert('Colaborador não selecionado.');

    const fileBO = document.getElementById('log-sinistro-file-bo').files[0];
    if (!fileBO) return alert('O arquivo do BO não foi encontrado. Volte ao passo anterior.');

    window._isSavingSinistro = true;

    const temDesconto = 'Sim'; // Sempre passamos Sim para o RH avaliar
    const parcelas = temDesconto === 'Sim' ? (document.getElementById('log-sin-parcelas')?.value || 1) : null;

    const formData = new FormData();
    formData.append('arquivo', fileBO);
    formData.append('numero_boletim', document.getElementById('log-sin-bo').value || '');
    formData.append('data_hora', document.getElementById('log-sin-data').value || '');
    formData.append('natureza', document.getElementById('log-sin-natureza').value || '');
    formData.append('veiculo', document.getElementById('log-sin-veiculo').value || '');
    formData.append('placa', document.getElementById('log-sin-placa').value || '');
    formData.append('desconto', temDesconto);

    // Valor/parcelas serão definidos pelo RH ao finalizar

    // Orçamentos
    const filesOrc = window._logSinOrcFiles || [];
    if (filesOrc.length > 0) {
        const orcsBase64 = [];
        for (const f of filesOrc) {
            const b64 = await new Promise(r => { const rd = new FileReader(); rd.onload = () => r(rd.result); rd.readAsDataURL(f); });
            orcsBase64.push(b64);
        }
        formData.append('orcamentos_base64', JSON.stringify(orcsBase64));
    }

    const filesMidia = window._logSinMidiasFiles || [];

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

        const sinId = data.id;

        // Upload media files to R2
        if (filesMidia.length > 0 && sinId) {
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando Mídias...';
            for (let i = 0; i < filesMidia.length; i++) {
                btn.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Enviando Mídias (${i+1}/${filesMidia.length})...`;
                const mfData = new FormData();
                mfData.append('file', filesMidia[i]);
                try {
                    const rMidia = await fetch(`${API_URL}/sinistros/${sinId}/midia`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` },
                        body: mfData
                    });
                    if (!rMidia.ok) {
                        const err = await rMidia.json();
                        throw new Error(err.error || 'Erro ao enviar mídia.');
                    }
                } catch(e) {
                    console.error('Falha ao enviar mídia:', e);
                    alert('Falha ao enviar arquivo ' + filesMidia[i].name + ': ' + e.message);
                }
            }
        }

        if (typeof Toastify !== 'undefined') Toastify({ text: 'Sinistro registrado com sucesso!', backgroundColor: '#10b981' }).showToast();
        
        document.getElementById('modal-logistica-novo-sinistro').style.display = 'none';
        
        // Recarregar a lista
        await window.logSinCarregarListaGeral();
        
    } catch(e) {
        alert('Erro ao salvar: ' + e.message);
    } finally {
        btn.innerHTML = oldText;
        btn.disabled = false;
        window._isSavingSinistro = false;
    }
};


// ============================================================
// MODAL DE EDIÇÃO DE SINISTRO (logística) — apenas status pendente
// ============================================================
window._logSinEditOrcFiles = [];
window._logSinEditandoId   = null;
window._logSinEditColabId  = null;

window._logSinEditMidiasExistentes = []; // { url, nome, tipo, idx }
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

    modal.innerHTML = `
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
                        <input type="text" id="edit-sin-bo" class="form-control" value="${sinistro.numero_boletim || ''}">
                    </div>
                    <div class="input-group">
                        <label>Data e Hora da Ocorrência</label>
                        <input type="text" id="edit-sin-data" class="form-control" value="${sinistro.data_hora || ''}">
                    </div>
                </div>
                <div class="input-group">
                    <label>Natureza da Ocorrência</label>
                    <input type="text" id="edit-sin-natureza" class="form-control" value="${(sinistro.natureza || '').replace(/Crime\s+Consumado[^\-]*\-?\s*/gi, '').trim()}">
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                    <div class="input-group">
                        <label>Marca/Modelo</label>
                        <input type="text" id="edit-sin-veiculo" class="form-control" value="${sinistro.veiculo || ''}">
                    </div>
                    <div class="input-group">
                        <label>Placa</label>
                        <input type="text" id="edit-sin-placa" class="form-control" value="${sinistro.placa || ''}">
                    </div>
                </div>

                <hr style="border-color:#e2e8f0; margin:0;">

                <!-- FOTOS E VÍDEOS EXISTENTES -->
                <div>
                    <p style="font-size:0.85rem; font-weight:700; color:#1e293b; margin:0 0 8px; display:flex; align-items:center; gap:6px;">
                        <i class="ph ph-camera" style="color:#0369a1;"></i>
                        Fotos e Vídeos Anexados
                        <span id="edit-midias-count-badge" style="background:#e0f2fe; color:#0369a1; border-radius:12px; padding:1px 8px; font-size:0.72rem; font-weight:700;">
                            ${midiasExistentes.length}
                        </span>
                    </p>
                    <div id="edit-sin-midias-grid" style="display:flex; flex-wrap:wrap; gap:8px; min-height:40px;">
                        ${midiasExistentes.length === 0
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
                ${orcsExistentes.length > 0 ? `
                <div>
                    <p style="font-size:0.85rem; font-weight:700; color:#374151; margin:0 0 6px;"><i class="ph ph-receipt"></i> Orçamentos já anexados (${orcsExistentes.length})</p>
                    <div style="display:flex; flex-wrap:wrap; gap:6px;">
                        ${orcsExistentes.map(function(p, idx) {
                            return '<a href="javascript:void(0)" onclick="window.abrirArquivoOneDrive(\'' + p + '\')" style="display:inline-flex;align-items:center;gap:4px;font-size:0.78rem;color:#0369a1;background:#e0f2fe;padding:4px 8px;border-radius:4px;text-decoration:none;"><i class=\"ph ph-image\"></i> Orç. ' + (idx + 1) + '</a>';
                        }).join('')}
                    </div>
                </div>
                ` : ''}

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
    `;

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
}

// ============================================================
// MODAL DE VÍDEO EXPLICATIVO
// ============================================================
window.abrirModalVideoLogistica = function() {
    let m = document.getElementById('modal-video-logistica');
    if (!m) {
        m = document.createElement('div');
        m.id = 'modal-video-logistica';
        m.className = 'modal';
        m.style.zIndex = '9999999';
        m.innerHTML = `
            <div class="modal-content" style="width:90vw; max-width:1400px; height:90vh; display:flex; flex-direction:column; padding:0; overflow:hidden; background:#0f172a;">
                <div class="modal-header" style="background:#1e293b; border-bottom:1px solid #334155; padding:12px 20px;">
                    <h3 style="color:#fff; margin:0; font-size:1.1rem; display:flex; align-items:center; gap:8px;">
                        <i class="ph ph-play-circle" style="color:#38bdf8;"></i> Vídeo Explicativo - Sinistros Logística
                    </h3>
                    <button onclick="document.getElementById('modal-video-logistica').style.display='none'; document.getElementById('logistica-video-player').pause();" class="btn-close" style="color:#94a3b8; background:transparent; border:none; cursor:pointer; font-size:1.2rem;"><i class="ph ph-x"></i></button>
                </div>
                <div style="background:#000; flex:1; width:100%; min-height:0; display:flex; justify-content:center; align-items:center;">
                    <video id="logistica-video-player" controls style="max-width:100%; max-height:100%; object-fit:contain;">
                        <source src="./assets/videos/Logistica - Sinistro.mp4" type="video/mp4">
                        Seu navegador não suporta a tag de vídeo.
                    </video>
                </div>
            </div>
        `;
        document.body.appendChild(m);
    }
    m.style.display = 'flex';
    const video = document.getElementById('logistica-video-player');
    if (video) video.play();
};