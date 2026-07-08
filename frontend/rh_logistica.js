// ============================================================
// MÓDULO: RH LOGÍSTICA
// Telas de Sinistros e Multas dentro do menu RH.
// Sinistros: visão global com todas as ações (RH pode assinar/finalizar).
// Multas: reutiliza o módulo multas_logistica com container alternativo.
// ============================================================


// Variáveis globais do módulo
var _rhSinListaTodos = [];
var _rhSinListaColabs = [];

// ─── TELA: RH > LOGÍSTICA > SINISTROS ────────────────────────────────────────

window.initRhLogisticaSinistros = async function() {
    var container = document.getElementById('rh-logistica-sinistros-container');
    if (!container) return;

    container.innerHTML = window._rhSinBuildLayout();

    if (_rhSinListaColabs.length === 0) {
        try {
            var data = await apiGet('/colaboradores');
            if (Array.isArray(data)) _rhSinListaColabs = data;
        } catch(e) { console.error('[RH-Sinistros]', e); }
    }

    await window.rhSinCarregarTodos();
};

window._rhSinBuildLayout = function() {
    return [
        '<div style="padding:1.5rem;">',
        '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">',
        '<div style="display:flex; align-items:center; gap:14px;">',
        '<div style="background:linear-gradient(135deg,#f503c5,#c026d3); width:52px; height:52px; border-radius:14px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(245,3,197,0.3);">',
        '<i class="ph ph-warning" style="font-size:1.7rem; color:#fff;"></i>',
        '</div>',
        '<div>',
        '<h1 style="margin:0; font-size:1.5rem; font-weight:800; color:#0f172a;">Sinistros — RH</h1>',
        '<p style="margin:0; color:#64748b; font-size:0.85rem;">Boletins de Ocorrência · Todos os Colaboradores</p>',
        '</div>',
        '</div>',
        '<div style="display:flex; gap:10px; flex-wrap:wrap;">',
        '<button onclick="window.rhSinAbrirModalNovo()" style="background:#f503c5; color:#fff; border:none; padding:10px 20px; border-radius:8px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px; font-size:0.9rem;" onmouseover="this.style.background=\'#c026d3\'" onmouseout="this.style.background=\'#f503c5\'">',
        '<i class="ph ph-plus"></i> Novo Sinistro</button>',
        '<button onclick="window.initRhLogisticaSinistros()" style="background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; padding:10px 14px; border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:6px; font-size:0.9rem;">',
        '<i class="ph ph-arrows-clockwise"></i> Atualizar</button>',
        '</div></div>',
        '<div style="display:flex; flex-wrap:wrap; gap:0.6rem; margin-bottom:1rem; padding:0.8rem; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0;">',
        '<div style="position:relative; flex:2; min-width:200px;">',
        '<i class="ph ph-magnifying-glass" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#94a3b8; pointer-events:none;"></i>',
        '<input type="search" id="rh-sin-search" placeholder="Buscar por colaborador ou nº do BO..." oninput="window.rhSinFiltrarLista()" style="width:100%; padding:0.45rem 0.7rem 0.45rem 34px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; outline:none; box-sizing:border-box;" autocomplete="new-password">',
        '</div>',
        '<select id="rh-sin-status" onchange="window.rhSinFiltrarLista()" style="flex:1; min-width:160px; padding:0.45rem 0.7rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; outline:none;">',
        '<option value="">Todos os Status</option>',
        '<option value="pendente">Aguardando Assinaturas</option>',
        '<option value="assinado_testemunhas">Assinado pelas Testemunhas</option>',
        '<option value="assinado">Finalizado e Assinado</option>',
        '</select>',
        '<button onclick="window.rhSinLimparFiltros()" style="padding:0.45rem 0.8rem; background:#e2e8f0; border:none; border-radius:6px; cursor:pointer; font-size:0.82rem; color:#475569; white-space:nowrap;">&#x2715; Limpar</button>',
        '</div>',
        '<div id="rh-sin-contagem" style="font-size:0.82rem; color:#64748b; margin-bottom:0.75rem;"></div>',
        '<div id="rh-sin-lista-area">',
        '<div style="text-align:center; padding:3rem; color:#94a3b8;">',
        '<i class="ph ph-spinner ph-spin" style="font-size:2rem;"></i>',
        '<p style="margin-top:8px;">Carregando sinistros...</p>',
        '</div></div></div>'
    ].join('');
};

window.rhSinCarregarTodos = async function() {
    var area = document.getElementById('rh-sin-lista-area');
    if (!area) return;
    try {
        var data = await apiGet('/logistica/sinistros');
        _rhSinListaTodos = Array.isArray(data) ? data : [];
    } catch(e) {
        console.error('[RH-Sinistros]', e);
        if (area) area.innerHTML = '<div style="background:#fef2f2; color:#991b1b; padding:1rem; border-radius:8px;">Erro ao carregar sinistros. Tente atualizar.</div>';
        return;
    }
    window.rhSinFiltrarLista();
};

window.rhSinFiltrarLista = function() {
    var inp = document.getElementById('rh-sin-search');
    var selSt = document.getElementById('rh-sin-status');
    var termo = inp ? inp.value.toLowerCase().trim() : '';
    var statusFiltro = selSt ? selSt.value : '';
    var lista = _rhSinListaTodos.filter(function(s) {
        if (termo) {
            var n = (s.colaborador_nome || s.nome_completo || '').toLowerCase();
            var b = (s.numero_boletim || '').toLowerCase();
            if (!n.includes(termo) && !b.includes(termo)) return false;
        }
        if (statusFiltro && s.status !== statusFiltro) return false;
        return true;
    });
    var ord = { pendente: 0, assinado_testemunhas: 1, assinado: 2 };
    lista.sort(function(a, b) {
        var oa = ord[a.status] !== undefined ? ord[a.status] : 9;
        var ob = ord[b.status] !== undefined ? ord[b.status] : 9;
        if (oa !== ob) return oa - ob;
        return (b.id || 0) - (a.id || 0);
    });
    var contEl = document.getElementById('rh-sin-contagem');
    if (contEl) contEl.textContent = lista.length + ' sinistro' + (lista.length !== 1 ? 's' : '') + ' encontrado' + (lista.length !== 1 ? 's' : '');
    var area = document.getElementById('rh-sin-lista-area');
    if (!area) return;
    if (lista.length === 0) {
        area.innerHTML = '<div style="text-align:center; padding:3rem; background:#f8fafc; border-radius:12px; border:2px dashed #e2e8f0;"><i class="ph ph-warning" style="font-size:3rem; color:#cbd5e1; display:block; margin-bottom:1rem;"></i><h5 style="color:#475569; font-weight:600;">Nenhum sinistro encontrado</h5><p style="color:#94a3b8; font-size:0.9rem; margin:0;">Ajuste os filtros ou cadastre um novo sinistro.</p></div>';
        return;
    }
    area.innerHTML = '<div id="rh-sin-cards" style="display:flex; flex-direction:column; gap:1rem;"></div>';
    var cardsDiv = document.getElementById('rh-sin-cards');
    lista.forEach(function(s) { window._rhSinRenderCard(s, cardsDiv); });
};

window.rhSinLimparFiltros = function() {
    var inp = document.getElementById('rh-sin-search');
    var sel = document.getElementById('rh-sin-status');
    if (inp) inp.value = '';
    if (sel) sel.value = '';
    window.rhSinFiltrarLista();
};

window._rhSinRenderCard = function(s, container) {
    var statusMap = {
        pendente: { text: 'Aguardando Assinaturas', color: '#f59e0b', bg: '#fef3c7', icon: 'ph-clock' },
        assinado_testemunhas: { text: 'Assinado pelas Testemunhas', color: '#8b5cf6', bg: '#ede9fe', icon: 'ph-pencil-simple' },
        assinado: { text: 'Finalizado e Assinado', color: '#10b981', bg: '#d1fae5', icon: 'ph-check-circle' }
    };
    var st = statusMap[s.status] || { text: s.status, color: '#64748b', bg: '#f1f5f9', icon: 'ph-warning' };
    var testemunhasOk = !!(s.assinatura_testemunha1_base64);
    var condutorOk = !!(s.assinatura_condutor_base64);
    var nomeColab = s.colaborador_nome || s.nome_completo || '—';
    var colabId = s.colaborador_id;
    var signStatus = '';
    if (s.processo_iniciado && s.status !== 'assinado') {
        var tOk = testemunhasOk ? 'background:#dcfce7; color:#166534;' : 'background:#fee2e2; color:#b91c1c;';
        var cOk = condutorOk ? 'background:#dcfce7; color:#166534;' : 'background:#fee2e2; color:#b91c1c;';
        var tIco = testemunhasOk ? 'ph-check' : 'ph-x';
        var cIco = condutorOk ? 'ph-check' : 'ph-x';
        signStatus = '<div style="display:flex; gap:0.5rem; margin-top:0.5rem; flex-wrap:wrap;">'
            + '<span style="font-size:0.75rem; padding:2px 8px; border-radius:4px; ' + tOk + '"><i class="ph ' + tIco + '"></i> Testemunhas</span>'
            + '<span style="font-size:0.75rem; padding:2px 8px; border-radius:4px; ' + cOk + '"><i class="ph ' + cIco + '"></i> Condutor</span>'
            + '</div>';
    }
    var btns = '';
    if (s.status === 'pendente') {
        btns += '<button onclick="window.rhSinAbrirModalEditar(' + s.id + ',' + colabId + ')" style="background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; padding:0.4rem 0.8rem; border-radius:6px; cursor:pointer; font-size:0.82rem; font-weight:600; display:flex; align-items:center; gap:4px;"><i class="ph ph-pencil-simple"></i> Editar</button>';
        if (s.processo_iniciado) {
            btns += '<button onclick="window.abrirFinalizarSinistro(' + s.id + ',' + colabId + ')" style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; padding:0.4rem 0.8rem; border-radius:6px; cursor:pointer; font-size:0.82rem; font-weight:600; display:flex; align-items:center; gap:4px;"><i class="ph ph-signature"></i> Assinaturas</button>';
        } else {
            btns += '<button onclick="window.abrirFinalizarSinistro(' + s.id + ',' + colabId + ')" style="background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; padding:0.4rem 0.8rem; border-radius:6px; cursor:pointer; font-size:0.82rem; font-weight:600; display:flex; align-items:center; gap:4px;"><i class="ph ph-pen-nib"></i> Finalizar Sinistro</button>';
        }
    }
    if (s.status === 'assinado_testemunhas' && !condutorOk) {
        btns += '<button onclick="window.abrirFinalizarSinistro(' + s.id + ',' + colabId + ')" style="background:#ede9fe; color:#7c3aed; border:1px solid #ddd6fe; padding:0.4rem 0.8rem; border-radius:6px; cursor:pointer; font-size:0.82rem; font-weight:600; display:flex; align-items:center; gap:4px;"><i class="ph ph-signature"></i> Assinar Condutor</button>';
    }
    if (s.documento_html || s.status === 'assinado') {
        btns += '<button onclick="window.verDocumentoSinistro(' + s.id + ',' + colabId + ')" style="background:#f0fdf4; color:#059669; border:1px solid #a7f3d0; padding:0.4rem 0.8rem; border-radius:6px; cursor:pointer; font-size:0.82rem; font-weight:600; display:flex; align-items:center; gap:4px;"><i class="ph ph-file-text"></i> Ver Documento</button>';
    }
    btns += '<button onclick="window.rhSinExcluirCard(' + s.id + ',' + colabId + ')" style="background:#fef2f2; color:#dc2626; border:1px solid #fecaca; padding:0.4rem 0.8rem; border-radius:6px; cursor:pointer; font-size:0.82rem; font-weight:600; display:flex; align-items:center; gap:4px;"><i class="ph ph-trash"></i> Excluir</button>';
    var card = document.createElement('div');
    card.style.cssText = 'background:#fff; border-radius:12px; border:1px solid #e2e8f0; padding:1.25rem; box-shadow:0 1px 3px rgba(0,0,0,0.05); transition:box-shadow 0.2s;';
    card.onmouseenter = function() { card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; };
    card.onmouseleave = function() { card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; };
    card.innerHTML =
        '<div style="display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:0.75rem;">'
        + '<div style="flex:1; min-width:200px;">'
        + '<div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.3rem; flex-wrap:wrap;">'
        + '<span style="background:#fce4f8; color:#f503c5; font-weight:800; font-size:0.82rem; padding:2px 10px; border-radius:20px;"><i class="ph ph-user"></i> ' + nomeColab + '</span>'
        + '<span style="background:' + st.bg + '; color:' + st.color + '; font-size:0.78rem; font-weight:700; padding:2px 10px; border-radius:20px;"><i class="ph ' + st.icon + '"></i> ' + st.text + '</span>'
        + '</div>'
        + '<div style="font-size:0.85rem; color:#334155; font-weight:600; margin-bottom:0.25rem;">BO: ' + (s.numero_boletim || '—') + (s.natureza ? ' <span style="color:#64748b; font-weight:400;">&middot; ' + s.natureza + '</span>' : '') + '</div>'
        + '<div style="font-size:0.8rem; color:#64748b; display:flex; gap:1rem; flex-wrap:wrap;">'
        + (s.data_hora ? '<span><i class="ph ph-calendar"></i> ' + s.data_hora + '</span>' : '')
        + (s.placa ? '<span><i class="ph ph-car"></i> ' + s.placa + '</span>' : '')
        + (s.veiculo ? '<span><i class="ph ph-truck"></i> ' + s.veiculo + '</span>' : '')
        + (s.tipo_sinistro ? '<span><i class="ph ph-tag"></i> ' + s.tipo_sinistro + '</span>' : '')
        + '</div>'
        + signStatus
        + '</div>'
        + '<div style="display:flex; flex-wrap:wrap; gap:0.4rem; align-items:flex-start;">' + btns + '</div>'
        + '</div>';
    container.appendChild(card);
};

window.rhSinAbrirModalNovo = function() {
    if (typeof window.logSinAbrirModalNovo === 'function') {
        if (_rhSinListaColabs.length > 0 && typeof window._logSinListaColabs !== 'undefined') {
            window._logSinListaColabs = _rhSinListaColabs;
        }
        window.logSinAbrirModalNovo();
        var _origSalvar = window.logSinSalvarFinal;
        window.logSinSalvarFinal = async function() {
            var r = await _origSalvar.apply(this, arguments);
            setTimeout(function() { window.rhSinCarregarTodos(); }, 1200);
            window.logSinSalvarFinal = _origSalvar;
            return r;
        };
    } else {
        alert('Módulo de sinistros da logística não carregado. Tente novamente.');
    }
};

window.rhSinAbrirModalEditar = function(sinId, colabId) {
    if (typeof window.logSinAbrirModalEditar === 'function') {
        window.logSinAbrirModalEditar(sinId, colabId);
    }
};

window.rhSinExcluirCard = async function(sinId, colabId) {
    if (typeof window.excluirSinistro === 'function') {
        var colabAnterior = window.viewedColaborador;
        window.viewedColaborador = { id: colabId };
        await window.excluirSinistro(sinId, colabId);
        window.viewedColaborador = colabAnterior;
        setTimeout(function() { window.rhSinCarregarTodos(); }, 800);
    } else {
        alert('Função de exclusão não disponível. Acesse pelo prontuário do colaborador.');
    }
};

// ─── TELA: RH > LOGÍSTICA > MULTAS ───────────────────────────────────────────

window.initRhLogisticaMultas = async function() {
    var container = document.getElementById('rh-multas-logistica-container');
    if (!container) return;
    container.innerHTML = [
        '<div style="display:flex; align-items:center; justify-content:center; padding:3rem; flex-direction:column; gap:1rem; color:#94a3b8;">',
        '<i class="ph ph-spinner ph-spin" style="font-size:2.5rem;"></i>',
        '<p>Carregando multas...</p>',
        '</div>'
    ].join('');
    if (typeof carregarColaboradoresMultas === 'function'
        && typeof colaboradoresMultas !== 'undefined'
        && colaboradoresMultas.length === 0) {
        await carregarColaboradoresMultas();
    }
    // Troca o ID temporariamente para o esperado pelo módulo multas_logistica
    container.id = 'multas-logistica-container';
    if (typeof renderMultasLogistica === 'function') {
        renderMultasLogistica(container);
    } else {
        container.id = 'rh-multas-logistica-container';
        container.innerHTML = '<div style="text-align:center; padding:3rem; background:#f8fafc; border-radius:12px; border:2px dashed #e2e8f0;"><h5 style="color:#475569;">Módulo de multas não carregado</h5><p style="color:#94a3b8; font-size:0.9rem;">Recarregue a página e tente novamente.</p></div>';
        return;
    }
    container.id = 'rh-multas-logistica-container';
    try {
        var token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
        var response = await fetch('/api/logistica/multas', { headers: { 'Authorization': 'Bearer ' + token } });
        if (response.ok) {
            var multas = await response.json();
            if (typeof multasLogistica !== 'undefined') multasLogistica = multas;
            if (typeof filtrarMultasLogistica === 'function') filtrarMultasLogistica();
        }
    } catch(e) { console.error('[RH-Multas]', e); }
    _rhMultasInjetarHeader(container);
};

function _rhMultasInjetarHeader(container) {
    var titulo = container.querySelector('h2');
    if (!titulo) return;
    titulo.innerHTML = [
        '<div style="display:flex; align-items:center; gap:12px;">',
        '<div style="background:linear-gradient(135deg,#f503c5,#c026d3); width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 10px rgba(245,3,197,0.3); flex-shrink:0;">',
        '<i class="ph ph-receipt" style="font-size:1.3rem; color:#fff;"></i>',
        '</div>',
        '<div>',
        '<div style="font-size:1.15rem; font-weight:800; color:#0f172a; line-height:1.2;">Controle de Multas</div>',
        '<div style="font-size:0.78rem; color:#94a3b8; font-weight:400;">RH &middot; Todos os Colaboradores</div>',
        '</div></div>'
    ].join('');
}