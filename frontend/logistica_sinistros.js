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
        'assinado': { text: 'Finalizado e Assinado',  color: '#10b981', bg: '#d1fae5' },
        'iniciado': { text: 'Iniciado', color: '#b45309', bg: '#fef08a' }
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
                    ${s.observacoes ? `<p style="margin:6px 0 0; font-size:0.85rem; color:#334155; background:#f1f5f9; padding:6px 10px; border-radius:6px;"><i class="ph ph-info"></i> <strong>Obs:</strong> ${s.observacoes}</p>` : ''}
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
            ${(s.status === 'pendente' || s.status === 'iniciado') ? `
            <div style="display:flex; gap:8px;">
                <button onclick="window.logSinExcluirSinistro(${s.id}, ${s.colaborador_id})" title="Excluir sinistro" style="background:#fef2f2; border:1px solid #fecaca; color:#ef4444; border-radius:8px; padding:5px 14px; font-size:0.78rem; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:5px; transition:all .2s;" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='#fef2f2'">
                    <i class="ph ph-trash"></i> Excluir
                </button>
                <button onclick="window.logSinAbrirModalEditar(${s.id}, ${s.colaborador_id})" title="Editar sinistro"
                    style="background:#f1f5f9; border:1.5px solid #cbd5e1; color:#475569; border-radius:8px; padding:5px 14px; font-size:0.78rem; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:5px; transition:all .2s;"
                    onmouseover="this.style.background='#e2e8f0'; this.style.color='#1e293b'" onmouseout="this.style.background='#f1f5f9'; this.style.color='#475569'">
                    <i class="ph ph-pencil-simple"></i> Editar
                </button>
            </div>` : `
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
        
        const colabsOptions = _logSinListaColabs
            .slice()
            .sort((a, b) => (a.nome_completo || '').localeCompare(b.nome_completo || ''))
            .map(c => `<option value="${c.id}">${c.nome_completo} (${c.cpf || ''})</option>`)
            .join('');

        m.innerHTML = `
            <div class="modal-content" style="max-width:100vw; width:100vw; height:100vh; max-height:100vh; margin:0; border-radius:0; display:flex; flex-direction:column; overflow:hidden;">
                <div class="modal-header" style="background:linear-gradient(135deg,#0f172a,#1e293b); z-index:10; flex-shrink:0;">
                    <h3 style="color:#fff; margin:0; display:flex; align-items:center; gap:8px;"><i class="ph ph-warning" style="color:#34d399;"></i> Registrar Novo Sinistro</h3>
                    <button onclick="document.getElementById('modal-logistica-novo-sinistro').style.display='none'" class="btn-close" style="background:rgba(255,255,255,0.15); color:#fff;"><i class="ph ph-x"></i></button>
                </div>
                <div class="modal-body" style="flex:1; overflow-y:auto; padding:1.5rem;">
                    <div id="log-sinistro-step-1">
                        <div class="input-group" style="margin-bottom: 1rem;">
                            <label>Selecionar Colaborador *</label>
                            <select id="log-sin-colab-select" class="form-control" style="font-size: 0.9rem; padding: 10px;">
                                <option value="">-- Selecione o colaborador envolvido --</option>
                                ${colabsOptions}
                            </select>
                        </div>
                        <!-- Busca de veículo por placa -->
                        <div class="input-group" style="margin-bottom:1rem;">
                            <label><i class="ph ph-truck" style="color:#d97706;"></i> Selecionar Veículo (buscar por placa)</label>
                            <div style="position:relative;width:100%;">
                                <input type="text" id="log-sin-placa-search" class="form-control" placeholder="Digite a placa ou modelo..." autocomplete="off"
                                    oninput="window._logSinFiltrarVeiculos(this.value)"
                                    style="width:100%;box-sizing:border-box;padding-right:2.2rem;">
                                <i class="ph ph-magnifying-glass" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);color:#94a3b8;pointer-events:none;"></i>
                            </div>
                            <div id="log-sin-veiculo-dropdown" style="display:none;position:absolute;z-index:9999;background:#fff;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.12);max-height:200px;overflow-y:auto;width:100%;margin-top:2px;"></div>
                        </div>
                        <!-- 3 painéis lado a lado -->
                        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:0.75rem; margin-bottom:0.75rem;">
                            <!-- Veículo Selecionado -->
                            <div id="log-sin-veiculo-dados-step1" style="display:none;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:0.9rem 1rem;min-height:60px;">
                                <p style="margin:0 0 0.45rem;font-weight:700;font-size:0.79rem;color:#b45309;text-transform:uppercase;letter-spacing:0.5px;"><i class="ph ph-truck"></i> Veículo Selecionado</p>
                                <div id="log-sin-veiculo-dados-step1-rows" style="display:flex;flex-direction:column;gap:0.3rem;"></div>
                            </div>
                            <!-- Dados do Colaborador -->
                            <div id="log-sin-dados-colab-section-s1" style="display:none;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:0.9rem 1rem;min-height:60px;">
                                <p style="margin:0 0 0.45rem;font-weight:700;font-size:0.79rem;color:#15803d;text-transform:uppercase;letter-spacing:0.5px;"><i class="ph ph-user"></i> Dados do Colaborador</p>
                                <div id="log-sin-dados-colab-rows-s1" style="display:flex;flex-direction:column;gap:0.3rem;"></div>
                            </div>
                            <!-- Dados do Declarante -->
                            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:0.9rem 1rem;min-height:60px;">
                                <p style="margin:0 0 0.45rem;font-weight:700;font-size:0.79rem;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.5px;"><i class="ph ph-identification-card"></i> Dados do Declarante</p>
                                <div id="log-sin-dados-declarante-rows-s1" style="display:flex;flex-direction:column;gap:0.3rem;"></div>
                            </div>
                        </div>

                        <!-- Nº do Protocolo -->
                        <div class="input-group" style="margin-bottom:1rem;">
                            <label><i class="ph ph-hash" style="color:#475569;"></i> Nº do Protocolo / Boletim <span style="font-size:0.78rem;color:#94a3b8;font-weight:400;">(opcional)</span></label>
                            <input type="text" id="log-sin-protocolo" class="form-control" placeholder="Ex: 2026.00123456">
                        </div>

                        <button type="button" class="btn btn-primary" onclick="window.logSinSalvarIniciado()" id="log-sin-btn-iniciar" style="width:100%;margin-top:0.25rem;background:#0f172a;border:none;">
                            <i class="ph ph-floppy-disk"></i> Salvar — Status: Iniciado
                        </button>
                    </div>

                    <div id="log-sinistro-step-2" style="display:none;">
                        <div style="display:flex; gap:1.5rem; align-items:flex-start; min-height:calc(100vh - 160px);">
                            <!-- COLUNA ESQUERDA: Dados do BO e Arquivos -->
                            <div style="flex:1.1; min-width:0; display:flex; flex-direction:column; gap:0.85rem;">
                                <div id="log-sin-bo-notif" style="display:none; border-radius:8px; padding:0.5rem 0.75rem; font-size:0.85rem;"></div>

                                <!-- BO Upload -->
                                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:0.9rem 1rem;">
                                    <p style="margin:0 0 0.5rem;font-weight:600;font-size:0.85rem;color:#334155;"><i class="ph ph-file-pdf" style="color:#dc2626;"></i> Boletim de Ocorrência (PDF)</p>
                                    <div style="display:flex;gap:0.5rem;align-items:flex-end;">
                                        <div style="flex:1;"><input type="file" id="log-sinistro-file-bo" accept=".pdf,image/*" class="form-control" style="font-size:0.82rem;"></div>
                                        <button type="button" class="btn btn-secondary" onclick="window.logSinProcessarLeituraBO()" style="white-space:nowrap;font-size:0.82rem;padding:0.45rem 0.8rem;"><i class="ph ph-scan"></i> Analisar BO</button>
                                    </div>
                                </div>

                                <!-- Campos do BO -->
                                <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                                    <div class="input-group"><label>Boletim Nº</label><input type="text" id="log-sin-bo" class="form-control"></div>
                                    <div class="input-group"><label>Data e Hora da Ocorrência</label><input type="text" id="log-sin-data" class="form-control" placeholder="13/04/2026 às 13:30"></div>
                                </div>
                                <div class="input-group"><label>Natureza da Ocorrência</label><input type="text" id="log-sin-natureza" class="form-control"></div>
                                <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                                    <div class="input-group"><label>Marca/Modelo</label><input type="text" id="log-sin-veiculo" class="form-control"></div>
                                    <div class="input-group"><label>Placa</label><input type="text" id="log-sin-placa" class="form-control"></div>
                                </div>

                                <hr style="border-color:#e2e8f0; margin:0.25rem 0;">
                                <div id="area-log-sinistro-desconto" style="display:none;"></div>

                                <!-- Orçamentos -->
                                <div style="background:#f8fafc; padding:1rem; border-radius:8px; border:1px solid #e2e8f0;">
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
                                        <input type="file" id="log-sin-orcs-file" multiple accept="image/jpeg,image/png,.jpg,.png" style="display:none;" onchange="window._logSinAdicionarOrcs(this.files); this.value='';">
                                    </div>
                                    <div id="log-sin-orcs-preview" style="display:none; margin-top:10px; display:flex; flex-wrap:wrap; gap:8px;"></div>
                                    <p id="log-sin-orcs-count" style="margin:6px 0 0; font-size:0.75rem; color:#475569; display:none;"></p>
                                </div>

                                <!-- Fotos e Vídeos -->
                                <div style="background:#f0f9ff; padding:1rem; border-radius:8px; border:1px solid #bae6fd;">
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
                                        <input type="file" id="log-sin-midias-file" multiple accept="image/*,video/*" style="display:none;" onchange="window._logSinAdicionarMidias(this.files); this.value='';">
                                    </div>
                                    <div id="log-sin-midias-preview" style="display:none; margin-top:10px; display:flex; flex-wrap:wrap; gap:8px;"></div>
                                    <p id="log-sin-midias-count" style="margin:6px 0 0; font-size:0.75rem; color:#0369a1; display:none;"></p>
                                </div>
                            </div>

                            <!-- COLUNA DIREITA: Tipo de Sinistro + Observações -->
                            <div style="width:380px; flex-shrink:0; display:flex; flex-direction:column; gap:0.85rem; position:sticky; top:0;">
                                <!-- Tipo de Sinistro -->
                                <div class="input-group" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:1rem;">
                                    <label style="color:#c2410c;font-weight:700;"><i class="ph ph-tag"></i> Tipo de Sinistro</label>
                                    <select id="log-sin-tipo" class="form-control" style="font-size:0.9rem;">
                                        <option value="">-- Selecione o tipo --</option>
                                        <option value="Danos em Terceiros e Nosso">Danos em Terceiros e Nosso</option>
                                        <option value="Danos em Terceiros">Danos em Terceiros</option>
                                        <option value="Danos no Nosso Veículo">Danos no Nosso Veículo</option>
                                        <option value="Outros Danos">Outros Danos</option>
                                    </select>
                                </div>

                                <!-- Observações -->
                                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:1rem;flex:1;">
                                    <p style="margin:0 0 8px;font-weight:700;font-size:0.85rem;color:#334155;"><i class="ph ph-note-pencil" style="color:#6366f1;"></i> Observações</p>
                                    <textarea id="log-sin-observacoes" class="form-control" rows="8" placeholder="Descreva os detalhes do sinistro, informações adicionais, notas importantes..." style="resize:vertical; min-height:180px;"></textarea>
                                </div>

                                <!-- Aviso RH -->
                                <div class="alert alert-warning" style="font-size: 0.82rem; margin:0;">
                                    <i class="ph ph-warning"></i> Assinaturas e acordos de desconto devem ser finalizados pelo RH. O RH será notificado deste registro.
                                </div>

                                <!-- Botão Finalizar -->
                                <button type="button" class="btn btn-primary" onclick="window.logSinFinalizarSinistro()" id="log-sin-btn-finalizar" style="width:100%; background:#059669; border:none; padding:0.75rem;">
                                    <i class="ph ph-check"></i> Finalizar e Salvar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(m);
    }

    document.getElementById('log-sinistro-step-1').style.display = 'block';
    document.getElementById('log-sinistro-step-2').style.display = 'none';
    var logBoInput = document.getElementById('log-sinistro-file-bo');
    if (logBoInput) logBoInput.value = '';
    var logProtoInput = document.getElementById('log-sin-protocolo');
    if (logProtoInput) logProtoInput.value = '';
    document.getElementById('log-sin-colab-select').value = '';
    window._logSinMidiasFiles = [];
    window._logSinOrcFiles = [];
    window._logSinistroAtualId = null;
    window._logSinistroAtualColabId = null;
    if (typeof window._logSinAtualizarPreviewMidias === 'function') window._logSinAtualizarPreviewMidias();

    // Preencher dados fixos do declarante e ocultar/limpar seções dinâmicas
    window._logSinPreencherDeclarante();

    // Ocultar e limpar seção de colaborador (Step 1 e Step 2)
    var colabS1 = document.getElementById('log-sin-dados-colab-section-s1');
    var colabS1Rows = document.getElementById('log-sin-dados-colab-rows-s1');
    if (colabS1) { colabS1.style.display = 'none'; }
    if (colabS1Rows) { colabS1Rows.innerHTML = ''; }

    var colabS2 = document.getElementById('log-sin-dados-colab-section');
    var colabS2Rows = document.getElementById('log-sin-dados-colab-rows');
    if (colabS2) { colabS2.style.display = 'none'; }
    if (colabS2Rows) { colabS2Rows.innerHTML = ''; }

    // Ocultar e limpar seção de veículo (Step 1 e Step 2)
    var veicS1 = document.getElementById('log-sin-veiculo-dados-step1');
    var veicS1Rows = document.getElementById('log-sin-veiculo-dados-step1-rows');
    if (veicS1) { veicS1.style.display = 'none'; }
    if (veicS1Rows) { veicS1Rows.innerHTML = ''; }

    var veicS2 = document.getElementById('log-sin-dados-veiculo-section');
    var veicS2Rows = document.getElementById('log-sin-dados-veiculo-rows');
    if (veicS2) { veicS2.style.display = 'none'; }
    if (veicS2Rows) { veicS2Rows.innerHTML = ''; }

    // Ao selecionar colaborador, atualizar dados exibidos
    var selColab = document.getElementById('log-sin-colab-select');
    if (selColab) {
        selColab.onchange = function() { window._logSinAtualizarDadosColab(this.value); };
    }

    // Reset veículo e carregar lista
    window._logSinVeiculoSelecionado = null;
    var logPlacaInp = document.getElementById('log-sin-placa-search');
    if (logPlacaInp) logPlacaInp.value = '';
    var logVeicDD = document.getElementById('log-sin-veiculo-dropdown');
    if (logVeicDD) logVeicDD.style.display = 'none';
    window._logSinPreencherDadosVeiculo();
    window._logSinCarregarVeiculos();

    m.style.display = 'flex';
};

// Helper: delega para _sinLinhaCopiavel (com scheme 'colab'|'veiculo'|'declarante')
window._logSinLinhaCopiavel = function(label, value, scheme) {
    if (typeof window._sinLinhaCopiavel === 'function') return window._sinLinhaCopiavel(label, value, scheme);
    return label + ': ' + value; // fallback
};

// Preenche dados do declarante (Step 1 e Step 2)
window._logSinPreencherDeclarante = function() {
    var dados = [
        { label: 'Nome da Mãe', value: 'Sandra Regina Mezuraro' },
        { label: 'CNH', value: '04130394162' },
        { label: 'Validade CNH', value: '16/10/2034' },
        { label: 'Profissão', value: 'Publicitario' },
        { label: 'Celular', value: '11 94788-4343' }
    ];
    var html = dados.map(function(d) { return window._logSinLinhaCopiavel(d.label, d.value, 'declarante'); }).join('');
    ['log-sin-dados-declarante-rows', 'log-sin-dados-declarante-rows-s1'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.innerHTML = html;
    });
};

// Atualiza dados do colaborador selecionado (Step 1 e Step 2)
window._logSinAtualizarDadosColab = function(colabId) {
    var pares = [
        { section: 'log-sin-dados-colab-section-s1', rows: 'log-sin-dados-colab-rows-s1' },
        { section: 'log-sin-dados-colab-section',    rows: 'log-sin-dados-colab-rows' }
    ];
    if (!colabId) {
        pares.forEach(function(p) { var s = document.getElementById(p.section); if (s) s.style.display='none'; });
        return;
    }
    var c = (_logSinListaColabs || []).find(function(x) { return String(x.id) === String(colabId); });
    if (!c) {
        pares.forEach(function(p) { var s = document.getElementById(p.section); if (s) s.style.display='none'; });
        return;
    }
    var dados = [];
    if (c.nome_completo) dados.push({ label: 'Nome Completo', value: c.nome_completo });
    if (c.endereco)      dados.push({ label: 'Endereço',      value: c.endereco });
    if (c.telefone)      dados.push({ label: 'Telefone/Cel',  value: c.telefone });
    if (!dados.length) {
        pares.forEach(function(p) { var s = document.getElementById(p.section); if (s) s.style.display='none'; });
        return;
    }
    var html = dados.map(function(d) { return window._logSinLinhaCopiavel(d.label, d.value, 'colab'); }).join('');
    pares.forEach(function(p) {
        var section = document.getElementById(p.section);
        var rows    = document.getElementById(p.rows);
        if (section && rows) { rows.innerHTML = html; section.style.display = 'block'; }
    });
};

// ---- VEÍCULO (Logística) ----
window._logSinListaVeiculos = [];

window._logSinCarregarVeiculos = async function() {
    if (window._logSinListaVeiculos.length) return;
    try {
        var data = await apiGet('/frota/veiculos');
        if (Array.isArray(data)) window._logSinListaVeiculos = data;
    } catch(e) { console.warn('[logSinistros] Erro ao carregar veículos', e); }
};

window._logSinFiltrarVeiculos = function(q) {
    var dd = document.getElementById('log-sin-veiculo-dropdown');
    if (!dd) return;
    var lista = window._logSinListaVeiculos;
    if (!q || q.length < 1) { dd.style.display = 'none'; return; }
    var termo = q.toLowerCase();
    var filtrados = lista.filter(function(v) {
        return (v.placa || '').toLowerCase().includes(termo) || (v.marca_modelo_versao || '').toLowerCase().includes(termo);
    }).slice(0, 12);
    if (!filtrados.length) { dd.style.display = 'none'; return; }
    dd.innerHTML = filtrados.map(function(v) {
        return '<div onclick="window._logSinSelecionarVeiculo(' + v.id + ')" ' +
            'style="padding:0.5rem 0.75rem;cursor:pointer;border-bottom:1px solid #f1f5f9;font-size:0.85rem;" ' +
            'onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'#fff\'">' +
            '<strong style="color:#1e293b;">' + (v.placa || '') + '</strong>' +
            '<span style="color:#64748b;margin-left:8px;">' + (v.marca_modelo_versao || '') + '</span>' +
            '</div>';
    }).join('');
    dd.style.display = 'block';
};

window._logSinSelecionarVeiculo = function(id) {
    var v = (window._logSinListaVeiculos || []).find(function(x) { return x.id === id; });
    var dd = document.getElementById('log-sin-veiculo-dropdown');
    var inp = document.getElementById('log-sin-placa-search');
    if (dd) dd.style.display = 'none';
    if (!v) return;
    if (inp) inp.value = (v.placa || '') + (v.marca_modelo_versao ? ' — ' + v.marca_modelo_versao : '');
    window._logSinVeiculoSelecionado = v;
    window._logSinPreencherDadosVeiculo();
};

window._logSinPreencherDadosVeiculo = function() {
    var v = window._logSinVeiculoSelecionado;
    var s1 = document.getElementById('log-sin-veiculo-dados-step1');
    var r1 = document.getElementById('log-sin-veiculo-dados-step1-rows');
    var s2 = document.getElementById('log-sin-dados-veiculo-section');
    var r2 = document.getElementById('log-sin-dados-veiculo-rows');
    if (!v) {
        if (s1) s1.style.display = 'none';
        if (s2) s2.style.display = 'none';
        return;
    }
    var dados = [];
    if (v.placa)              dados.push({ label: 'Placa',          value: v.placa });
    if (v.marca_modelo_versao)dados.push({ label: 'Modelo',         value: v.marca_modelo_versao });
    if (v.ano_fabricacao)     dados.push({ label: 'Ano Fabricação', value: v.ano_fabricacao });
    if (v.renavam)            dados.push({ label: 'Renavam',        value: v.renavam });
    if (v.cor_predominante)   dados.push({ label: 'Cor',            value: v.cor_predominante });
    var html = dados.map(function(d) { return window._logSinLinhaCopiavel(d.label, d.value, 'veiculo'); }).join('');
    if (s1 && r1) { r1.innerHTML = html; s1.style.display = 'block'; }
    if (s2 && r2) { r2.innerHTML = html; s2.style.display = 'block'; }
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
    const fileInput = document.getElementById('log-sinistro-file-bo');
    if (!fileInput || !fileInput.files.length) return alert('Selecione o arquivo do BO.');

    const formData = new FormData();
    formData.append('arquivo', fileInput.files[0]);

    const btn = document.getElementById('log-sin-btn-finalizar') ||
                document.querySelector('#log-sinistro-step-2 button.btn-secondary');
    const oldText = btn ? btn.innerHTML : '';
    if (btn) { btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Lendo...'; btn.disabled = true; }

    let boletimData = {};
    try {
        const res = await fetch(`${API_URL}/extrair-bo`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` },
            body: formData
        });
        if (res.status === 401 || res.status === 403) { alert('Sessão expirada.'); location.reload(); return; }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro interno.');
        boletimData = data;
    } catch(e) {
        console.warn('Leitura BO falhou, modo manual:', e.message);
    } finally {
        if (btn) { btn.innerHTML = oldText; btn.disabled = false; }

        var fbo  = document.getElementById('log-sin-bo');      if (fbo)  fbo.value  = boletimData.boletim    || fbo.value  || '';
        var fdt  = document.getElementById('log-sin-data');    if (fdt)  fdt.value  = boletimData.data_hora  || fdt.value  || '';
        var fnat = document.getElementById('log-sin-natureza');if (fnat) fnat.value = (boletimData.natureza||'').replace(/Crime\s+Consumado[^\-]*\-?\s*/gi,'').trim() || fnat.value || '';
        var fvei = document.getElementById('log-sin-veiculo'); if (fvei) fvei.value = boletimData.marca_modelo || fvei.value || '';
        var fpla = document.getElementById('log-sin-placa');   if (fpla) fpla.value = boletimData.placa || fpla.value || '';

        const temDados = boletimData.boletim || boletimData.natureza || boletimData.placa || boletimData.marca_modelo;
        const notifEl = document.getElementById('log-sin-bo-notif');
        if (notifEl) {
            notifEl.style.display = 'block';
            notifEl.innerHTML = temDados
                ? '<i class="ph ph-check-circle"></i> Dados extraídos. Confira ou edite se necessário.'
                : '<i class="ph ph-warning"></i> Preenchimento automático não disponível. Preencha manualmente.';
            notifEl.style.cssText = temDados
                ? 'display:block;background:#d1fae5;color:#065f46;border:1px solid #6ee7b7;border-radius:8px;padding:0.5rem 0.75rem;margin-bottom:1rem;font-size:0.85rem;'
                : 'display:block;background:#fef3c7;color:#92400e;border:1px solid #fcd34d;border-radius:8px;padding:0.5rem 0.75rem;margin-bottom:1rem;font-size:0.85rem;';
        }
    }
};

// Step 1: Salvar sinistro logistica com status 'iniciado'
window.logSinSalvarIniciado = async function() {
    const colabId = document.getElementById('log-sin-colab-select').value;
    if (!colabId) return alert('Selecione o colaborador envolvido.');

    const btn = document.getElementById('log-sin-btn-iniciar');
    const oldText = btn ? btn.innerHTML : '';
    if (btn) { btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...'; btn.disabled = true; }

    try {
        const formData = new FormData();
        formData.append('status', 'iniciado');
        const proto = document.getElementById('log-sin-protocolo');
        if (proto && proto.value) formData.append('numero_boletim', proto.value);
        if (window._logSinVeiculoSelecionado) {
            formData.append('placa', window._logSinVeiculoSelecionado.placa || '');
            formData.append('veiculo', window._logSinVeiculoSelecionado.marca_modelo_versao || '');
        }

        const res = await fetch(`${API_URL}/colaboradores/${colabId}/sinistros`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` },
            body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao salvar.');

        window._logSinistroAtualId = data.id;
        window._logSinistroAtualColabId = colabId;

        document.getElementById('log-sinistro-step-1').style.display = 'none';
        document.getElementById('log-sinistro-step-2').style.display = 'block';
        const notif = document.getElementById('log-sin-bo-notif');
        if (notif) {
            notif.innerHTML = '<i class="ph ph-check-circle"></i> Sinistro criado com <strong>Status: Iniciado</strong>. Complete as informações abaixo (opcional).';
            notif.style.cssText = 'display:block;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;border-radius:8px;padding:0.6rem 0.85rem;margin-bottom:1rem;font-size:0.85rem;';
        }
        if (window._logSinVeiculoSelecionado) {
            var fv = document.getElementById('log-sin-veiculo'); if (fv) fv.value = window._logSinVeiculoSelecionado.marca_modelo_versao || '';
            var fp = document.getElementById('log-sin-placa');   if (fp) fp.value = window._logSinVeiculoSelecionado.placa || '';
        }
        await window.logSinCarregarListaGeral();
    } catch(e) {
        alert('Erro ao salvar: ' + e.message);
    } finally {
        if (btn) { btn.innerHTML = oldText; btn.disabled = false; }
    }
};

// Step 2: Finalizar sinistro logistica via PATCH
window.logSinFinalizarSinistro = async function() {
    const sinId   = window._logSinistroAtualId;
    const colabId = window._logSinistroAtualColabId;
    if (!sinId || !colabId) return alert('Sinistro não identificado. Salve o Passo 1 primeiro.');

    if (window._isSavingSinistro) return;
    window._isSavingSinistro = true;

    const btn = document.getElementById('log-sin-btn-finalizar');
    const oldText = btn ? btn.innerHTML : '';
    if (btn) { btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...'; btn.disabled = true; }

    try {
        const formData = new FormData();
        formData.append('status', 'pendente');
        formData.append('desconto', 'Sim');

        var fbo  = document.getElementById('log-sin-bo');      if (fbo && fbo.value)  formData.append('numero_boletim', fbo.value);
        var fdt  = document.getElementById('log-sin-data');    if (fdt && fdt.value)  formData.append('data_hora', fdt.value);
        var fnat = document.getElementById('log-sin-natureza');if (fnat && fnat.value) formData.append('natureza', fnat.value);
        var fvei = document.getElementById('log-sin-veiculo'); if (fvei && fvei.value) formData.append('veiculo', fvei.value);
        var fpla = document.getElementById('log-sin-placa');   if (fpla && fpla.value) formData.append('placa', fpla.value);
        var fpar = document.getElementById('log-sin-parcelas');if (fpar) formData.append('parcelas', fpar.value);
        var fvtot= document.getElementById('log-sin-valor-total');if (fvtot && fvtot.value) formData.append('valor_total', fvtot.value);
        var ftipo = document.getElementById('log-sin-tipo'); if (ftipo && ftipo.value) formData.append('tipo_sinistro', ftipo.value);
        var fobs = document.getElementById('log-sin-observacoes'); if (fobs && fobs.value.trim()) formData.append('observacoes', fobs.value.trim());

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

        // Arquivo BO
        const boFile = document.getElementById('log-sinistro-file-bo');
        if (boFile && boFile.files.length) formData.append('arquivo', boFile.files[0]);

        const res = await fetch(`${API_URL}/colaboradores/${colabId}/sinistros/${sinId}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` },
            body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao finalizar.');

        // Mídias
        const filesMidia = window._logSinMidiasFiles || [];
        if (filesMidia.length > 0) {
            if (btn) btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando Mídias...';
            for (let i = 0; i < filesMidia.length; i++) {
                if (btn) btn.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Mídias (${i+1}/${filesMidia.length})...`;
                const mfData = new FormData();
                mfData.append('file', filesMidia[i]);
                try {
                    const rM = await fetch(`${API_URL}/sinistros/${sinId}/midia`, {
                        method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` }, body: mfData
                    });
                    if (!rM.ok) { const e = await rM.json(); console.error('Erro mídia:', e); }
                } catch(e) { console.error('Falha mídia:', e); }
            }
        }

        if (typeof Toastify !== 'undefined') Toastify({ text: 'Sinistro finalizado!', backgroundColor: '#10b981' }).showToast();
        document.getElementById('modal-logistica-novo-sinistro').style.display = 'none';
        await window.logSinCarregarListaGeral();
    } catch(e) {
        alert('Erro ao finalizar: ' + e.message);
    } finally {
        if (btn) { btn.innerHTML = oldText; btn.disabled = false; }
        window._isSavingSinistro = false;
    }
};

// Alias para compatibilidade
window.logSinSalvarFinal = window.logSinFinalizarSinistro;


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
    window._logSinEditBOFile       = null;

    // Buscar dados atuais do sinistro
    let sinistro = null;
    try {
        const lista = await apiGet('/logistica/sinistros');
        sinistro = (lista || []).find(function(s) { return s.id === sinId; });
    } catch(e) { alert('Erro ao carregar sinistro.'); return; }
    if (!sinistro) { alert('Sinistro não encontrado.'); return; }
    if (sinistro.status !== 'pendente' && sinistro.status !== 'iniciado') {
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
        <div class="modal-content" style="max-width:100vw; width:100vw; height:100vh; max-height:100vh; margin:0; border-radius:0; display:flex; flex-direction:column; overflow:hidden;">
            <div class="modal-header" style="background:linear-gradient(135deg,#0f172a,#1e293b); z-index:10; flex-shrink:0;">
                <h3 style="color:#fff; margin:0; display:flex; align-items:center; gap:8px;">
                    <i class="ph ph-pencil-simple" style="color:#60a5fa;"></i> Editar Sinistro
                    <span style="font-size:0.75rem; background:#fbbf24; color:#1e293b; border-radius:12px; padding:2px 10px; font-weight:700; margin-left:6px;">PENDENTE</span>
                </h3>
                <button onclick="document.getElementById('modal-log-sin-editar').style.display='none'" class="btn-close" style="background:rgba(255,255,255,0.15); color:#fff;"><i class="ph ph-x"></i></button>
            </div>
            <div class="modal-body" style="display:flex; gap:1.5rem; align-items:flex-start; flex:1; overflow-y:auto; padding:1.5rem;">

                <!-- COLUNA ESQUERDA: Dados do BO e Arquivos -->
                <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:0.9rem;">

                    <div style="background:#fef9c3; border:1px solid #fde047; border-radius:8px; padding:0.6rem 0.85rem; font-size:0.82rem; color:#713f12; display:flex; align-items:center; gap:6px;">
                        <i class="ph ph-warning"></i>
                        Edição disponível apenas antes das assinaturas do colaborador e da testemunha.
                    </div>

                    <div id="edit-sin-msg" style="display:none; margin-bottom:0.5rem;"></div>

                    <!-- BO Upload -->
                    <div class="input-group" style="background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #e2e8f0;">
                        <label style="color:#0f172a; margin-bottom:6px;"><i class="ph ph-file-pdf" style="color:#dc2626;"></i> Boletim de Ocorrência (PDF) - <span style="color:#64748b;font-weight:normal;">Opcional (Extrair Dados)</span></label>
                        <div style="display:flex; gap:0.5rem; align-items:center;">
                            <input type="file" id="edit-sin-file-bo" accept="application/pdf" class="form-control" style="flex:1;">
                            <button type="button" class="btn btn-secondary" onclick="window.logSinEditProcessarLeituraBO(this)" style="white-space:nowrap;font-size:0.82rem;padding:0.45rem 0.8rem;">
                                <i class="ph ph-scan"></i> Analisar BO
                            </button>
                        </div>
                    </div>

                    <!-- DADOS BÁSICOS -->
                    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:0.75rem;">
                        <div class="input-group">
                            <label>Boletim Nº</label>
                            <input type="text" id="edit-sin-bo" class="form-control" value="${sinistro.numero_boletim || ''}">
                        </div>
                        <div class="input-group">
                            <label>Data e Hora da Ocorrência</label>
                            <input type="text" id="edit-sin-data" class="form-control" value="${sinistro.data_hora || ''}">
                        </div>
                        <div class="input-group">
                            <label>Natureza da Ocorrência</label>
                            <input type="text" id="edit-sin-natureza" class="form-control" value="${(sinistro.natureza || '').replace(/Crime\s+Consumado[^\-]*\-?\s*/gi, '').trim()}">
                        </div>
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

                </div>

                <!-- COLUNA DIREITA: Tipo de Sinistro + Observações + Histórico -->
                <div style="flex:1; flex-shrink:0; display:flex; flex-direction:column; gap:0.9rem; position:sticky; top:0; align-self:flex-start;">

                    <!-- Tipo de Sinistro -->
                    <div class="input-group" style="background:#fff7ed; border:1px solid #fed7aa; border-radius:10px; padding:1rem;">
                        <label style="color:#c2410c; font-weight:700;"><i class="ph ph-tag"></i> Tipo de Sinistro</label>
                        <select id="edit-sin-tipo" class="form-control" style="font-size:0.9rem;">
                            <option value="">-- Selecione o tipo --</option>
                            <option value="Danos em Terceiros e Nosso" ${sinistro.tipo_sinistro === 'Danos em Terceiros e Nosso' ? 'selected' : ''}>Danos em Terceiros e Nosso</option>
                            <option value="Danos em Terceiros" ${sinistro.tipo_sinistro === 'Danos em Terceiros' ? 'selected' : ''}>Danos em Terceiros</option>
                            <option value="Danos no Nosso Veículo" ${sinistro.tipo_sinistro === 'Danos no Nosso Veículo' ? 'selected' : ''}>Danos no Nosso Veículo</option>
                            <option value="Outros Danos" ${sinistro.tipo_sinistro === 'Outros Danos' ? 'selected' : ''}>Outros Danos</option>
                        </select>
                    </div>

                    <!-- Histórico de Observações -->
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:1rem; flex:1;">
                        <p style="margin:0 0 10px; font-weight:700; font-size:0.85rem; color:#334155; display:flex; align-items:center; gap:6px;">
                            <i class="ph ph-chat-text" style="color:#6366f1;"></i> Histórico de Observações
                        </p>
                        <div id="edit-sin-historico-obs" style="max-height:300px; overflow-y:auto; display:flex; flex-direction:column-reverse; gap:8px; margin-bottom:10px;">
                            ${(function() {
                                let hist = [];
                                try { if (sinistro.observacoes_historico) hist = JSON.parse(sinistro.observacoes_historico); } catch(e) {}
                                if (!hist.length && sinistro.observacoes) {
                                    return '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:8px 10px;font-size:0.82rem;color:#1e40af;">'
                                        + '<p style="margin:0 0 3px;font-size:0.7rem;color:#64748b;">Observação inicial</p>'
                                        + '<p style="margin:0;">' + sinistro.observacoes.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</p></div>';
                                }
                                if (!hist.length) return '<p style="font-size:0.8rem;color:#94a3b8;margin:0;text-align:center;padding:1rem;">Nenhuma observação registrada ainda.</p>';
                                // Mostrar do mais novo ao mais antigo
                                return hist.slice().reverse().map(function(h) {
                                    return '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;">'
                                        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">'
                                        + '<span style="font-size:0.73rem;font-weight:700;color:#6366f1;"><i class="ph ph-user-circle"></i> ' + (h.autor || 'Sistema') + '</span>'
                                        + '<span style="font-size:0.68rem;color:#94a3b8;white-space:nowrap;margin-left:6px;">' + (h.data || '') + '</span>'
                                        + '</div>'
                                        + '<p style="margin:0;font-size:0.83rem;color:#334155;line-height:1.5;">' + (h.texto || '').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</p>'
                                        + '</div>';
                                }).join('');
                            })()}
                        </div>
                        <hr style="border-color:#e2e8f0; margin:0 0 10px;">
                        <p style="margin:0 0 5px; font-size:0.78rem; font-weight:600; color:#475569;"><i class="ph ph-plus-circle"></i> Nova Observação</p>
                        <textarea id="edit-sin-nova-obs" class="form-control" rows="8" placeholder="Escreva uma nova observação aqui..." style="resize:vertical; font-size:0.85rem; min-height:180px;"></textarea>
                    </div>

                    <!-- Botões -->
                    <div style="display:flex; gap:0.5rem;">
                        <button onclick="document.getElementById('modal-log-sin-editar').style.display='none'"
                            style="flex:1; border:1px solid #e2e8f0; background:#fff; color:#374151; border-radius:8px; padding:0.6rem 1rem; font-size:0.85rem; font-weight:600; cursor:pointer;">
                            Cancelar
                        </button>
                        <button id="btn-edit-sin-salvar" onclick="window.logSinSalvarEdicao()"
                            style="flex:2; border:none; background:#059669; color:#fff; border-radius:8px; padding:0.6rem 1.25rem; font-size:0.85rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
                            <i class="ph ph-floppy-disk"></i> Salvar Alterações
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;


    modal.style.display = 'flex';

    // Renderizar grade de mídias existentes
    window._logSinEditRenderMidiasExistentes();
};

window.logSinEditProcessarLeituraBO = async function(btn) {
    const fileInput = document.getElementById('edit-sin-file-bo');
    if (!fileInput || !fileInput.files.length) return alert('Selecione o arquivo do BO em PDF.');

    const formData = new FormData();
    formData.append('arquivo', fileInput.files[0]);

    const oldText = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Lendo...'; 
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/extrair-bo`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` },
            body: formData
        });
        if (res.status === 401 || res.status === 403) { alert('Sessão expirada.'); location.reload(); return; }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro na leitura.');

        const fbo = document.getElementById('edit-sin-bo');
        if (fbo && data.protocolo && !fbo.value) fbo.value = data.protocolo;
        
        const fdt = document.getElementById('edit-sin-data'); 
        if (fdt && data.data_hora) fdt.value = data.data_hora;
        
        const fnat = document.getElementById('edit-sin-natureza'); 
        if (fnat && data.natureza) fnat.value = data.natureza.replace(/Crime\s+Consumado[^\-]*\-?\s*/gi, '').trim();

        window._logSinEditBOFile = fileInput.files[0];

        const notif = document.getElementById('edit-sin-msg');
        if (notif) {
            notif.innerHTML = '<i class="ph ph-check-circle"></i> Leitura concluída! O PDF também será salvo ao enviar.';
            notif.style.cssText = 'display:block; padding:0.6rem 0.85rem; border-radius:8px; font-size:0.82rem; background:#d1fae5; border:1px solid #6ee7b7; color:#065f46; margin-bottom:10px;';
        }
    } catch(e) {
        alert('Erro ao analisar BO: ' + e.message);
    } finally {
        btn.innerHTML = oldText;
        btn.disabled = false;
    }
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
        var formData = new FormData();
        if (document.getElementById('edit-sin-bo')) formData.append('numero_boletim', document.getElementById('edit-sin-bo').value);
        if (document.getElementById('edit-sin-data')) formData.append('data_hora', document.getElementById('edit-sin-data').value);
        if (document.getElementById('edit-sin-natureza')) formData.append('natureza', document.getElementById('edit-sin-natureza').value);
        if (document.getElementById('edit-sin-veiculo')) formData.append('veiculo', document.getElementById('edit-sin-veiculo').value);
        if (document.getElementById('edit-sin-placa')) formData.append('placa', document.getElementById('edit-sin-placa').value);
        var fTipo = document.getElementById('edit-sin-tipo'); if (fTipo && fTipo.value) formData.append('tipo_sinistro', fTipo.value);
        var fNovaObs = document.getElementById('edit-sin-nova-obs');
        if (fNovaObs && fNovaObs.value.trim()) {
            formData.append('nova_observacao', fNovaObs.value.trim());
            var nomeAutor = (typeof currentUser !== 'undefined' && currentUser)
                ? (currentUser.nome || currentUser.username || 'Sistema')
                : 'Sistema';
            formData.append('autor_observacao', nomeAutor);
        }

        if (window._logSinEditBOFile) {
            formData.append('arquivo', window._logSinEditBOFile);
        } else {
            var fFile = document.getElementById('edit-sin-file-bo');
            if (fFile && fFile.files.length > 0) {
                formData.append('arquivo', fFile.files[0]);
            }
        }

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
            formData.append('orcamentos_base64', JSON.stringify(orcsBase64));
        }

        var resPatch = await fetch(API_URL + '/colaboradores/' + colabId + '/sinistros/' + sinId, {
            method: 'PATCH',
            headers: {
                'Authorization': 'Bearer ' + (localStorage.getItem('erp_token') || '')
            },
            body: formData
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

        // Limpar campo de nova observação e recarregar histórico
        var obsField = document.getElementById('edit-sin-nova-obs');
        if (obsField) obsField.value = '';

        // Atualizar o histórico de observações sem fechar o modal
        try {
            var resSin = await fetch(API_URL + '/colaboradores/' + colabId + '/sinistros', {
                headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('erp_token') || '') }
            });
            if (resSin.ok) {
                var listaSin = await resSin.json();
                var sinAtual = Array.isArray(listaSin) ? listaSin.find(function(s) { return s.id == sinId; }) : null;
                if (sinAtual) {
                    var histContainer = document.getElementById('edit-sin-historico-obs');
                    if (histContainer) {
                        var hist = [];
                        try { if (sinAtual.observacoes_historico) hist = JSON.parse(sinAtual.observacoes_historico); } catch(e) {}
                        if (!hist.length && sinAtual.observacoes) {
                            histContainer.innerHTML = '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:8px 10px;font-size:0.82rem;color:#1e40af;"><p style="margin:0 0 3px;font-size:0.7rem;color:#64748b;">Observação inicial</p><p style="margin:0;">' + sinAtual.observacoes.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</p></div>';
                        } else if (!hist.length) {
                            histContainer.innerHTML = '<p style="font-size:0.8rem;color:#94a3b8;margin:0;text-align:center;padding:1rem;">Nenhuma observação registrada ainda.</p>';
                        } else {
                            histContainer.innerHTML = hist.slice().reverse().map(function(h) {
                                return '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;">'
                                    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">'
                                    + '<span style="font-size:0.73rem;font-weight:700;color:#6366f1;"><i class="ph ph-user-circle"></i> ' + (h.autor || 'Sistema') + '</span>'
                                    + '<span style="font-size:0.68rem;color:#94a3b8;white-space:nowrap;margin-left:6px;">' + (h.data || '') + '</span>'
                                    + '</div>'
                                    + '<p style="margin:0;font-size:0.83rem;color:#334155;line-height:1.5;">' + (h.texto || '').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</p>'
                                    + '</div>';
                            }).join('');
                        }
                        histContainer.scrollTop = 0; // Vai para o topo (mais recente)
                    }
                }
            }
        } catch(eHist) { console.warn('Erro ao recarregar histórico:', eHist); }

        // Atualizar lista geral em background sem fechar o modal
        if (typeof window.logSinCarregarListaGeral === 'function') window.logSinCarregarListaGeral();

    } catch(e) {
        showMsg(e.message, false);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = oldTxt; }
    }
}

// ============================================================
// EXCLUSÃO DE SINISTRO
// ============================================================
window.logSinExcluirSinistro = async function(sinId, colabId) {
    if (!confirm('Tem certeza que deseja excluir este sinistro permanentemente?')) return;
    
    const senha = prompt('Para excluir o sinistro, digite a senha de autorização:');
    if (senha !== 'EXL2499!') {
        return alert('Senha incorreta. Exclusão cancelada.');
    }

    try {
        const res = await fetch(`${API_URL}/colaboradores/${colabId}/sinistros/${sinId}`, {
            method: 'DELETE',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('erp_token')}`,
                'x-delete-password': senha
            }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao excluir sinistro.');

        if (typeof Toastify !== 'undefined') {
            Toastify({ text: 'Sinistro excluído com sucesso!', backgroundColor: '#10b981' }).showToast();
        } else {
            alert('Sinistro excluído com sucesso!');
        }

        await window.logSinCarregarListaGeral();
    } catch (e) {
        alert('Erro ao excluir: ' + e.message);
    }
};

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