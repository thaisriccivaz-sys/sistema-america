// ============================================================
// MÓDULO: LOGÍSTICA SINISTROS
// Espelha o comportamento do sinistro no prontuário do colaborador.
// O sinistro é sempre salvo no prontuário do colaborador selecionado.
// ============================================================

let _logSinColabSelecionado = null; // colaborador vinculado ao sinistro atual
let _logSinListaColabs = [];        // cache de todos os colaboradores

/* ── Entrada principal: renderiza a tela de Logística › Sinistros ── */
window.renderLogisticaSinistros = async function() {
    const container = document.getElementById('logistica-sinistros-container');
    if (!container) return;

    // carrega colaboradores para busca (só uma vez por sessão)
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
            <button id="log-sin-btn-novo" onclick="window.logSinAbrirModalColaborador()" style="background:#d97706; color:#fff; border:none; padding:10px 20px; border-radius:8px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px; font-size:0.9rem;">
                <i class="ph ph-plus"></i> Novo Sinistro
            </button>
        </div>

        <!-- Busca de colaborador -->
        <div style="background:#fff; border-radius:12px; border:1px solid #e2e8f0; padding:1.25rem; margin-bottom:1.5rem; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
            <label style="font-size:0.85rem; font-weight:700; color:#475569; display:block; margin-bottom:8px;">
                <i class="ph ph-user-search" style="color:#d97706;"></i> Buscar Colaborador / Motorista
            </label>
            <div style="display:flex; gap:10px; align-items:center;">
                <input type="text" id="log-sin-busca-colab" placeholder="Digite o nome do colaborador..." autocomplete="off"
                    style="flex:1; padding:10px 12px; border:1.5px solid #e2e8f0; border-radius:8px; font-size:0.9rem; outline:none;"
                    oninput="window.logSinFiltrarColabs(this.value)">
                <button onclick="window.logSinLimparColab()" style="background:#f1f5f9; border:1px solid #e2e8f0; padding:9px 14px; border-radius:8px; cursor:pointer; color:#64748b;">
                    <i class="ph ph-x"></i>
                </button>
            </div>
            <!-- Dropdown de sugestões -->
            <div id="log-sin-dropdown-colabs" style="display:none; position:relative; z-index:100; background:#fff; border:1px solid #e2e8f0; border-radius:8px; margin-top:6px; max-height:220px; overflow-y:auto; box-shadow:0 4px 20px rgba(0,0,0,0.1);"></div>
            <!-- Colaborador selecionado -->
            <div id="log-sin-colab-badge" style="display:none; margin-top:12px; background:#fef3c7; border:1px solid #fcd34d; border-radius:8px; padding:10px 14px; display:flex; align-items:center; justify-content:space-between;">
                <span style="font-weight:700; color:#92400e;"><i class="ph ph-user-circle"></i> <span id="log-sin-colab-nome-badge"></span></span>
                <span id="log-sin-colab-cargo-badge" style="font-size:0.8rem; color:#b45309;"></span>
            </div>
        </div>

        <!-- Lista de sinistros do colaborador -->
        <div id="log-sin-lista-area">
            <div style="text-align:center; padding:3rem; color:#94a3b8;">
                <i class="ph ph-car-crash" style="font-size:3rem; display:block; margin-bottom:1rem;"></i>
                <p>Selecione um colaborador para ver ou registrar sinistros</p>
            </div>
        </div>
    </div>`;
};

/* ── Filtro de busca de colaboradores ─────────────────────────── */
window.logSinFiltrarColabs = function(val) {
    const dropdown = document.getElementById('log-sin-dropdown-colabs');
    if (!dropdown) return;
    if (!val || val.trim().length < 2) {
        dropdown.style.display = 'none';
        return;
    }
    const q = val.toLowerCase();
    const matches = _logSinListaColabs.filter(c => (c.nome_completo || '').toLowerCase().includes(q)).slice(0, 10);
    if (matches.length === 0) {
        dropdown.style.display = 'none';
        return;
    }
    dropdown.innerHTML = matches.map(c => `
        <div onclick="window.logSinSelecionarColab(${c.id})"
            style="padding:10px 14px; cursor:pointer; border-bottom:1px solid #f1f5f9; font-size:0.88rem; display:flex; flex-direction:column;"
            onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='#fff'">
            <span style="font-weight:600; color:#1e293b;">${c.nome_completo || ''}</span>
            <span style="color:#64748b; font-size:0.78rem;">${c.cargo || ''} — ${c.departamento || ''}</span>
        </div>`).join('');
    dropdown.style.display = 'block';
};

/* ── Selecionar colaborador e carregar seus sinistros ──────────── */
window.logSinSelecionarColab = async function(colabId) {
    const colab = _logSinListaColabs.find(c => c.id == colabId);
    if (!colab) return;

    _logSinColabSelecionado = colab;

    // Fecha dropdown e preenche badge
    const dropdown = document.getElementById('log-sin-dropdown-colabs');
    if (dropdown) dropdown.style.display = 'none';

    const input = document.getElementById('log-sin-busca-colab');
    if (input) input.value = colab.nome_completo;

    const badge = document.getElementById('log-sin-colab-badge');
    const badgeNome = document.getElementById('log-sin-colab-nome-badge');
    const badgeCargo = document.getElementById('log-sin-colab-cargo-badge');
    if (badge) badge.style.display = 'flex';
    if (badgeNome) badgeNome.textContent = colab.nome_completo;
    if (badgeCargo) badgeCargo.textContent = `${colab.cargo || ''} ${colab.departamento ? '— ' + colab.departamento : ''}`;

    // Habilita botão Novo Sinistro
    const btnNovo = document.getElementById('log-sin-btn-novo');
    if (btnNovo) {
        btnNovo.disabled = false;
        btnNovo.style.opacity = '1';
        btnNovo.style.pointerEvents = 'auto';
    }

    // Carrega sinistros do colaborador
    await window.logSinCarregarLista(colabId);
};

/* ── Limpa seleção de colaborador ─────────────────────────────── */
window.logSinLimparColab = function() {
    _logSinColabSelecionado = null;

    const input = document.getElementById('log-sin-busca-colab');
    if (input) input.value = '';

    const dropdown = document.getElementById('log-sin-dropdown-colabs');
    if (dropdown) dropdown.style.display = 'none';

    const badge = document.getElementById('log-sin-colab-badge');
    if (badge) badge.style.display = 'none';

    const btnNovo = document.getElementById('log-sin-btn-novo');
    if (btnNovo) {
        btnNovo.disabled = true;
        btnNovo.style.opacity = '0.5';
        btnNovo.style.pointerEvents = 'none';
    }

    const lista = document.getElementById('log-sin-lista-area');
    if (lista) lista.innerHTML = `
        <div style="text-align:center; padding:3rem; color:#94a3b8;">
            <i class="ph ph-car-crash" style="font-size:3rem; display:block; margin-bottom:1rem;"></i>
            <p>Selecione um colaborador para ver ou registrar sinistros</p>
        </div>`;
};

/* ── Carregar lista de sinistros do colaborador ─────────────────── */
window.logSinCarregarLista = async function(colabId) {
    const area = document.getElementById('log-sin-lista-area');
    if (!area) return;

    area.innerHTML = `<div style="text-align:center; padding:2rem; color:#94a3b8;"><i class="ph ph-spinner ph-spin" style="font-size:2rem;"></i><p style="margin-top:8px;">Carregando sinistros...</p></div>`;

    let sinistros = [];
    try {
        sinistros = await apiGet(`/colaboradores/${colabId}/sinistros`) || [];
    } catch(e) {
        area.innerHTML = `<div class="alert alert-info"><i class="ph ph-info"></i> Nenhum sinistro registrado ainda.</div>`;
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
    sinistros.forEach(s => window._logSinRenderCard(s, colabId, cardsContainer));
};

/* ── Renderizar card de sinistro ──────────────────────────────── */
window._logSinRenderCard = function(s, colabId, container) {
    const card = document.createElement('div');
    card.style.cssText = 'background:#fff; border-radius:12px; border:1px solid #e2e8f0; padding:1.25rem; box-shadow:0 1px 3px rgba(0,0,0,0.05); display:flex; flex-direction:column; gap:1rem;';

    const statusMap = {
        'pendente': { text: 'Aguardando Assinaturas', color: '#f59e0b', bg: '#fef3c7' },
        'assinado': { text: 'Finalizado e Assinado',  color: '#10b981', bg: '#d1fae5' }
    };
    const st = statusMap[s.status] || { text: s.status, color: '#64748b', bg: '#f1f5f9' };

    let signStatus = '';
    if (s.processo_iniciado && s.status !== 'assinado') {
        const testOk = s.assinatura_testemunha1_base64 && s.assinatura_testemunha2_base64;
        const condOk = s.assinatura_condutor_base64;
        signStatus = `
            <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
                <span style="font-size:0.75rem; padding:2px 8px; border-radius:4px; ${testOk ? 'background:#dcfce7; color:#166534;' : 'background:#fee2e2; color:#b91c1c;'}"><i class="ph ${testOk ? 'ph-check' : 'ph-x'}"></i> Testemunhas</span>
                <span style="font-size:0.75rem; padding:2px 8px; border-radius:4px; ${condOk ? 'background:#dcfce7; color:#166534;' : 'background:#fee2e2; color:#b91c1c;'}"><i class="ph ${condOk ? 'ph-check' : 'ph-x'}"></i> Condutor</span>
            </div>`;
    }

    let actionsHtml = '';
    if (s.status === 'assinado') {
        actionsHtml = `<button class="btn btn-sm" onclick="window.logSinVerDocumento(${s.id}, ${colabId})" style="color:#0284c7; background:#e0f2fe; border:none;"><i class="ph ph-eye"></i> Ver Documento</button>`;
    } else if (!s.processo_iniciado || !s.documento_html) {
        if (s.desconto === 'Não') {
            actionsHtml = `<div style="display:flex;gap:0.5rem;width:100%;justify-content:space-between;align-items:center;"><span style="font-size:0.85rem; color:#64748b;"><i class="ph ph-check-circle"></i> Apenas Registro (BO Anexado)</span> <button class="btn btn-sm btn-outline-danger" onclick="window.logSinExcluir(${s.id}, ${colabId})" style="color:#ef4444; border:1px solid #ef4444; background:transparent;"><i class="ph ph-trash"></i> Excluir</button></div>`;
        } else {
            actionsHtml = `<div style="display:flex;gap:0.5rem;justify-content:flex-end;"><button class="btn btn-sm" onclick="window.logSinGerarDocumento(${s.id}, ${colabId})" style="color:#0284c7; background:#e0f2fe; border:none;"><i class="ph ph-file-text"></i> Gerar Documento</button> <button class="btn btn-sm btn-outline-danger" onclick="window.logSinExcluir(${s.id}, ${colabId})" style="color:#ef4444; border:1px solid #ef4444; background:transparent;"><i class="ph ph-trash"></i> Excluir</button></div>`;
        }
    } else {
        const testOk = s.assinatura_testemunha1_base64 && s.assinatura_testemunha2_base64;
        const condOk = s.assinatura_condutor_base64;
        actionsHtml = `<div style="display:flex; gap:0.5rem;">`;
        if (!testOk) {
            actionsHtml += `<button class="btn btn-sm btn-primary" onclick="window.logSinAbrirAssinaturaTestemunhas(${s.id}, ${colabId})" style="background:#a78bfa; border:none;"><i class="ph ph-pen"></i> Assinar Testemunhas</button>`;
        } else if (!condOk) {
            actionsHtml += `<button class="btn btn-sm btn-primary" onclick="window.logSinAbrirAssinaturaCondutor(${s.id}, ${colabId})" style="background:#f59e0b; border:none;"><i class="ph ph-pen"></i> Assinar Condutor</button>`;
        }
        actionsHtml += `<button class="btn btn-sm" onclick="window.logSinVerDocumento(${s.id}, ${colabId})" style="color:#64748b; background:#f1f5f9; border:none;"><i class="ph ph-eye"></i> Preview</button>`;
        actionsHtml += `<button class="btn btn-sm btn-outline-danger" onclick="window.logSinExcluir(${s.id}, ${colabId})" style="color:#ef4444; border:1px solid #ef4444; background:transparent; margin-left:auto;"><i class="ph ph-trash"></i> Excluir</button>`;
        actionsHtml += `</div>`;
    }

    card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
                <h5 style="margin:0; font-size:1.1rem; color:#0f172a; font-weight:700;"><i class="ph ph-file-text" style="color:#d97706;"></i> BO: ${s.numero_boletim || 'N/A'}</h5>
                <p style="margin:4px 0 0; font-size:0.85rem; color:#64748b;"><i class="ph ph-calendar"></i> Ocorrido: ${s.data_hora || '—'} &nbsp;|&nbsp; ${s.natureza || 'Sem Natureza'}</p>
                <p style="margin:4px 0 0; font-size:0.85rem; color:#64748b;">${s.veiculo || '—'} &nbsp;|&nbsp; Placa: ${s.placa || '—'}</p>
                ${signStatus}
            </div>
            <span style="display:inline-block; padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:600; color:${st.color}; background:${st.bg}; white-space:nowrap;">${st.text}</span>
        </div>
        <div style="background:#f8fafc; border-top:1px dashed #cbd5e1; padding-top:0.75rem; display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:0.8rem; color:#475569;">
                <strong>Desconto:</strong> ${s.desconto || 'Não'} ${s.desconto === 'Sim' ? `(${s.parcelas}x de ${s.valor_parcela})` : ''}<br/>
                ${s.tipo_sinistro ? `<strong>Tipo:</strong> ${s.tipo_sinistro}` : ''}
            </div>
            ${actionsHtml}
        </div>`;

    container.appendChild(card);
};

/* ── Modal: seleção de colaborador para o novo sinistro ─────────── */
window.logSinAbrirModalColaborador = function() {
    if (!_logSinColabSelecionado) {
        // Destaca o campo de busca para o usuário selecionar primeiro
        const input = document.getElementById('log-sin-busca-colab');
        if (input) {
            input.style.borderColor = '#d97706';
            input.focus();
            setTimeout(() => { input.style.borderColor = '#e2e8f0'; }, 2500);
        }
        if (typeof Toastify !== 'undefined') {
            Toastify({ text: 'Selecione um colaborador antes de criar um sinistro.', backgroundColor: '#d97706', duration: 3000 }).showToast();
        } else {
            alert('Selecione um colaborador antes de criar um sinistro.');
        }
        return;
    }
    try {
        // Define o colaborador no contexto global (necessário para salvarSinistroFinal e assinaturas)
        viewedColaborador = _logSinColabSelecionado;

        const _backupRecarregar = window._recarregarListaSinistros;

        window._recarregarListaSinistros = async function(colabId) {
            // Recarrega a lista de logística
            await window.logSinCarregarLista(colabId);
            // Só restaura viewedColaborador se nenhum modal de sinistro estiver aberto
            const modalAberto = document.getElementById('modal-novo-sinistro')?.style?.display !== 'none'
                             || !!document.getElementById('modal-testemunhas-sinistro')
                             || !!document.getElementById('modal-condutor-sinistro');
            if (!modalAberto) {
                viewedColaborador = null;
                window._recarregarListaSinistros = _backupRecarregar;
            }
        };

        window.abrirModalNovoSinistro();
    } catch(e) {
        console.error('[LogSinistros] Erro ao abrir modal:', e);
        alert('Erro ao abrir modal de sinistro: ' + e.message);
    }
};

/* ── Ações: gerar, ver, excluir, assinar (delegam ao sinistros.js) ─ */
window.logSinGerarDocumento = async function(sinId, colabId) {
    try {
        const token = localStorage.getItem('erp_token');
        const r = await fetch(`${API_URL}/colaboradores/${colabId}/sinistros/${sinId}/gerar-documento`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (r.ok) {
            if (typeof Toastify !== 'undefined') Toastify({ text: 'Documento gerado!', backgroundColor: '#2563eb' }).showToast();
            await window.logSinCarregarLista(colabId);
        }
    } catch(e) { alert(e.message); }
};

window.logSinVerDocumento = async function(sinId, colabId) {
    const _backup = viewedColaborador;
    viewedColaborador = _logSinColabSelecionado;
    await window.verDocumentoSinistro(sinId, colabId);
    viewedColaborador = _backup;
};

window.logSinAbrirAssinaturaTestemunhas = async function(sinId, colabId) {
    const _backupViewed    = viewedColaborador;
    const _backupRecarregar = window._recarregarListaSinistros;
    viewedColaborador = _logSinColabSelecionado;
    window._recarregarListaSinistros = async function(cId) {
        await window.logSinCarregarLista(cId);
        viewedColaborador = _backupViewed;
        window._recarregarListaSinistros = _backupRecarregar;
    };
    await window.abrirModalAssinaturaTestemunhasSinistro(sinId, colabId);
};

window.logSinAbrirAssinaturaCondutor = async function(sinId, colabId) {
    const _backupViewed    = viewedColaborador;
    const _backupRecarregar = window._recarregarListaSinistros;
    viewedColaborador = _logSinColabSelecionado;
    window._recarregarListaSinistros = async function(cId) {
        await window.logSinCarregarLista(cId);
        viewedColaborador = _backupViewed;
        window._recarregarListaSinistros = _backupRecarregar;
    };
    await window.abrirModalAssinaturaCondutorSinistro(sinId, colabId);
};

window.logSinExcluir = async function(sinId, colabId) {
    if (!confirm('Tem certeza que deseja excluir este sinistro permanentemente?')) return;
    try {
        const token = localStorage.getItem('erp_token');
        const res = await fetch(`${API_URL}/colaboradores/${colabId}/sinistros/${sinId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!data.sucesso) throw new Error(data.error);
        if (typeof Toastify !== 'undefined') Toastify({ text: 'Sinistro excluído.', backgroundColor: '#ef4444' }).showToast();
        await window.logSinCarregarLista(colabId);
    } catch(e) { alert('Erro ao excluir: ' + e.message); }
};
