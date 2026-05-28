(function(){
'use strict';

window.initFrotaManutencoes = async function(containerEl) {
    const c = containerEl || document.getElementById('frota-conteudo') || document.getElementById('frota-veiculos-container');
    if (!c) return;
    const tok = window.currentToken || localStorage.getItem('token');
    window._manutTok = tok;

    // Sub-tab state
    window._mnSubAba = window._mnSubAba || 'preventiva';

    c.innerHTML = `<div style="padding:1.5rem;background:#f8fafc;min-height:100%;">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:1rem;">
    <h2 style="margin:0;color:#1e293b;display:flex;align-items:center;gap:12px;font-size:1.5rem;">
        <div style="background:#d97706;color:#fff;width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;">
            <i class="ph ph-wrench"></i>
        </div>
        Manutenções
    </h2>
    <button onclick="window.abrirModalManutencao(null)" style="background:#d97706;color:#fff;border:none;border-radius:8px;padding:0.65rem 1.1rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;">
        <i class="ph ph-plus"></i> Nova Manutenção
    </button>
</div>

<!-- Sub-abas -->
<div style="display:flex;gap:4px;margin-bottom:1.5rem;background:#fff;padding:6px;border-radius:10px;border:1px solid #e2e8f0;width:fit-content;">
    <button id="mn-sub-btn-preventiva" onclick="window.mnMudarSubAba('preventiva')" 
        style="padding:0.5rem 1.2rem;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:0.9rem;display:flex;align-items:center;gap:6px;background:#d97706;color:#fff;">
        <i class="ph ph-calendar-check"></i> Preventiva
    </button>
    <button id="mn-sub-btn-corretiva" onclick="window.mnMudarSubAba('corretiva')" 
        style="padding:0.5rem 1.2rem;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:0.9rem;display:flex;align-items:center;gap:6px;background:transparent;color:#64748b;">
        <i class="ph ph-wrench"></i> Corretiva
    </button>
    <button id="mn-sub-btn-historico" onclick="window.mnMudarSubAba('historico')" 
        style="padding:0.5rem 1.2rem;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:0.9rem;display:flex;align-items:center;gap:6px;background:transparent;color:#64748b;">
        <i class="ph ph-clock-counter-clockwise"></i> Histórico
    </button>
</div>

<div id="mn-sub-conteudo"></div>
</div>`;



    const [frota, manut] = await Promise.all([
        fetch('/api/frota/veiculos', { headers: { Authorization: 'Bearer ' + tok } }).then(r => r.json()),
        fetch('/api/frota/manutencoes', { headers: { Authorization: 'Bearer ' + tok } }).then(r => r.json())
    ]);

    window._manutFrota = frota || [];
    window._manutDados = manut || [];

    window.mnMudarSubAba(window._mnSubAba || 'preventiva');
};



window.mnMudarSubAba = function(aba) {
    window._mnSubAba = aba;
    ['preventiva','corretiva','historico'].forEach(a => {
        const btn = document.getElementById('mn-sub-btn-' + a);
        if (!btn) return;
        btn.style.background = a === aba ? '#d97706' : 'transparent';
        btn.style.color = a === aba ? '#fff' : '#64748b';
    });
    const sub = document.getElementById('mn-sub-conteudo');
    if (!sub) return;
    if (aba === 'preventiva') mnRenderPreventivaTela(sub);
    else if (aba === 'corretiva') mnRenderCorretivaTela(sub);
    else mnRenderHistoricoTela(sub);
};

window.mnRenderHistoricoTela = function(sub) {
    const viewMode = window._mnHistView || 'lista';
    sub.innerHTML = `
    <!-- Barra de controles -->
    <div style="background:#fff;padding:0.75rem 1rem;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:1rem;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <!-- Toggle Lista/Calendário -->
        <div style="display:flex;gap:4px;background:#f1f5f9;padding:3px;border-radius:8px;margin-right:8px;">
            <button id="mn-hist-view-lista" onclick="window._mnHistView='lista';window.mnRenderHistoricoTela(document.getElementById('mn-sub-conteudo'))" 
                style="padding:4px 12px;border:none;border-radius:6px;font-size:0.8rem;font-weight:600;cursor:pointer;background:${viewMode==='lista'?'#fff':'transparent'};color:${viewMode==='lista'?'#1e293b':'#64748b'};box-shadow:${viewMode==='lista'?'0 1px 3px rgba(0,0,0,0.1)':'none'};">
                <i class="ph ph-list" style="margin-right:4px;"></i>Lista
            </button>
            <button id="mn-hist-view-cal" onclick="window._mnHistView='calendario';window.mnRenderHistoricoTela(document.getElementById('mn-sub-conteudo'))" 
                style="padding:4px 12px;border:none;border-radius:6px;font-size:0.8rem;font-weight:600;cursor:pointer;background:${viewMode==='calendario'?'#fff':'transparent'};color:${viewMode==='calendario'?'#1e293b':'#64748b'};box-shadow:${viewMode==='calendario'?'0 1px 3px rgba(0,0,0,0.1)':'none'};">
                <i class="ph ph-calendar" style="margin-right:4px;"></i>Calendário
            </button>
        </div>
        <i class="ph ph-funnel" style="color:#16a34a;font-size:1rem;flex-shrink:0;"></i>
        <input id="mn-tab-hist-f-placa" type="text" placeholder="Placa..." style="border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;font-size:0.8rem;width:100px;outline:none;" oninput="window.mnFiltrarTabHistorico()">
        <select id="mn-tab-hist-f-tm" style="border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;font-size:0.8rem;outline:none;" onchange="window.mnFiltrarTabHistorico()">
            <option value="">Tipo Manutenção</option>
            <option value="preventiva">Preventiva</option>
            <option value="corretiva">Corretiva</option>
        </select>
        <select id="mn-tab-hist-f-tipo" style="border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;font-size:0.8rem;outline:none;" onchange="window.mnFiltrarTabHistorico()">
            <option value="">Tipo veículo</option>
            <option value="caminhão">Caminhão</option>
            <option value="caminhonete">Caminhonete</option>
            <option value="utilitário">Utilitário</option>
            <option value="carretinha">Carretinha</option>
            <option value="caminhão tanque">Caminhão Tanque</option>
        </select>
        <select id="mn-tab-hist-f-crit" style="border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;font-size:0.8rem;outline:none;" onchange="window.mnFiltrarTabHistorico()">
            <option value="">Criticidade</option>
            <option value="Critica">Crítica</option>
            <option value="Alta">Alta</option>
            <option value="Media">Média</option>
            <option value="Baixa">Baixa</option>
        </select>
        <span style="font-size:0.8rem;color:#94a3b8;">Realizada de</span>
        <input id="mn-tab-hist-f-real-de" type="date" style="border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;font-size:0.8rem;outline:none;" onchange="window.mnFiltrarTabHistorico()">
        <span style="font-size:0.8rem;color:#94a3b8;">até</span>
        <input id="mn-tab-hist-f-real-ate" type="date" style="border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;font-size:0.8rem;outline:none;" onchange="window.mnFiltrarTabHistorico()">
        <button style="padding:4px 12px;background:#ef4444;color:#fff;border:none;border-radius:6px;font-size:0.8rem;cursor:pointer;" onclick="['mn-tab-hist-f-placa','mn-tab-hist-f-tm','mn-tab-hist-f-tipo','mn-tab-hist-f-crit','mn-tab-hist-f-real-de','mn-tab-hist-f-real-ate'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});window.mnFiltrarTabHistorico();">Limpar</button>
        <span id="mn-tab-hist-count" style="margin-left:auto;background:#dcfce7;color:#166534;border-radius:99px;padding:2px 10px;font-size:0.8rem;font-weight:700;"></span>
    </div>
    <!-- Área de conteúdo: lista ou calendário -->
    <div id="mn-hist-view-container"></div>`;
    window.mnCarregarTabHistorico();
};

window._mnTabHistDados = [];

window.mnCarregarTabHistorico = async function() {
    try {
        const tok = window._manutTok || window.currentToken || localStorage.getItem('token');
        const res = await fetch('/api/frota/manutencoes/historico', { headers: { Authorization: 'Bearer ' + tok } });
        window._mnTabHistDados = await res.json();
        if (!Array.isArray(window._mnTabHistDados)) window._mnTabHistDados = [];
        const viewMode = window._mnHistView || 'lista';
        if (viewMode === 'calendario') {
            window._mnRenderHistCalendario(window._mnTabHistDados||[]);
        } else {
            window._mnRenderHistLista(window._mnTabHistDados||[]);
        }
    } catch(e) {
        const tbody = document.getElementById('mn-tab-hist-tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:20px;color:#ef4444;">Erro ao carregar histórico.</td></tr>';
    }
};

// ─── CARREGAR HISTÓRICO (shared) ───────────────────────────────────────────────
// ─── FILTRAR HISTÓRICO ─────────────────────────────────────────────────────────
window.mnFiltrarTabHistorico = function() {
    const viewMode = window._mnHistView || 'lista';
    const fPlaca   = (document.getElementById('mn-tab-hist-f-placa')?.value   || '').trim().toLowerCase();
    const fTm      = (document.getElementById('mn-tab-hist-f-tm')?.value      || '').toLowerCase();
    const fTipo    = (document.getElementById('mn-tab-hist-f-tipo')?.value    || '').toLowerCase();
    const fCrit    = (document.getElementById('mn-tab-hist-f-crit')?.value    || '').toLowerCase();
    const fRealDe  = document.getElementById('mn-tab-hist-f-real-de')?.value  || '';
    const fRealAte = document.getElementById('mn-tab-hist-f-real-ate')?.value || '';

    const lista = window._mnTabHistDados.filter(m => {
        if (fPlaca   && !(m.placa||'').toLowerCase().includes(fPlaca)) return false;
        if (fTm      && (m.tipo_manutencao||'').toLowerCase() !== fTm) return false;
        if (fTipo    && !(m.tipo_veiculo||'').toLowerCase().includes(fTipo)) return false;
        if (fCrit    && (m.criticidade||'').toLowerCase() !== fCrit) return false;
        if (fRealDe  && (m.data_conclusao||'')   < fRealDe)  return false;
        if (fRealAte && (m.data_conclusao||'')   > fRealAte) return false;
        return true;
    });

    const count = document.getElementById('mn-tab-hist-count');
    if (count) count.textContent = lista.length + ' registros';

    if (viewMode === 'calendario') {
        window._mnRenderHistCalendario(lista);
    } else {
        window._mnRenderHistLista(lista);
    }
};

// ─── RENDER LISTA ──────────────────────────────────────────────────────────────
window._mnRenderHistLista = function(lista) {
    // Garante que o container tenha a tabela
    const container = document.getElementById('mn-hist-view-container');
    if (!container) return;
    const _critCor = { Critica:'#dc2626', Alta:'#d97706', Media:'#0284c7', Baixa:'#2d9e5f' };
    const _fmtD = d => { if(!d) return '—'; const [y,mo,di]=d.split('-'); return di+'/'+mo+'/'+y.slice(2); };

    if (!lista.length) {
        container.innerHTML = '<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:3rem;text-align:center;color:#94a3b8;">Nenhuma manutenção encontrada.</div>';
        return;
    }

    // Build or reuse table
    let html = `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
        <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
            <thead><tr style="background:#f1f5f9;border-bottom:2px solid #e2e8f0;">
                <th style="padding:10px;text-align:left;color:#475569;font-weight:700;">Placa</th>
                <th style="padding:10px;text-align:left;color:#475569;font-weight:700;">Tipo Veículo</th>
                <th style="padding:10px;text-align:center;color:#475569;font-weight:700;">Tipo Manut.</th>
                <th style="padding:10px;text-align:left;color:#475569;font-weight:700;">Serviço</th>
                <th style="padding:10px;text-align:center;color:#475569;font-weight:700;">Criticidade</th>
                <th style="padding:10px;text-align:center;color:#475569;font-weight:700;">Data Realizada / KM</th>
                <th style="padding:10px;text-align:center;color:#475569;font-weight:700;">Data Agendada</th>
                <th style="padding:10px;text-align:right;color:#475569;font-weight:700;">Próximo KM</th>
                <th style="padding:10px;text-align:left;color:#475569;font-weight:700;">Fornecedor</th>
            </tr></thead>
            <tbody>`;
    html += lista.map((m, i) => {
        const bgRow = i % 2 === 0 ? '#fff' : '#fafafa';
        const cor = _critCor[m.criticidade] || '#94a3b8';
        const critBadge = m.criticidade
            ? '<span style="background:' + cor + '22;color:' + cor + ';padding:2px 8px;border-radius:20px;font-size:0.75rem;font-weight:700;">' + m.criticidade + '</span>'
            : '—';
        const desc = (m.descricao || '—').replace(/"/g, '&quot;');
        return '<tr style="background:' + bgRow + ';border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background=\'#f0fdf4\'" onmouseout="this.style.background=\'' + bgRow + '\'">' +
            '<td style="padding:10px;font-weight:700;color:#1e293b;white-space:nowrap;">' + (m.placa||'—') + '</td>' +
            '<td style="padding:10px;color:#64748b;white-space:nowrap;">' + (m.tipo_veiculo||'—') + '</td>' +
            '<td style="padding:10px;text-align:center;color:#64748b;font-weight:600;white-space:nowrap;text-transform:capitalize;">' + (m.tipo_manutencao||'—') + '</td>' +
            '<td style="padding:10px;max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + desc + '">' + (m.descricao||'—') + '</td>' +
            '<td style="padding:10px;text-align:center;">' + critBadge + '</td>' +
            '<td style="padding:10px;text-align:center;color:#2d9e5f;font-weight:600;white-space:nowrap;">' + _fmtD(m.data_conclusao) + '<br><span style="font-size:0.75rem;font-weight:400;color:#64748b;">' + (m.km_na_manutencao ? Number(m.km_na_manutencao).toLocaleString('pt-BR')+' km' : '—') + '</span></td>' +
            '<td style="padding:10px;text-align:center;color:#2563eb;white-space:nowrap;">' + _fmtD(m.data_agendamento) + '</td>' +
            '<td style="padding:10px;text-align:right;color:#0284c7;font-weight:600;white-space:nowrap;">' + (m.km_proxima_manutencao ? Number(m.km_proxima_manutencao).toLocaleString('pt-BR')+' km' : '—') + '</td>' +
            '<td style="padding:10px;color:#64748b;">' + (m.fornecedor||'—') + '</td>' +
            '</tr>';
    }).join('');
    html += '</tbody></table></div></div>';
    container.innerHTML = html;
};

// ─── RENDER CALENDÁRIO ─────────────────────────────────────────────────────────
window._mnHistCalMes = window._mnHistCalMes || (()=>{const n=new Date();return {y:n.getFullYear(),m:n.getMonth()};})();

window._mnRenderHistCalendario = function(lista) {
    const container = document.getElementById('mn-hist-view-container');
    if (!container) return;
    const { y, m } = window._mnHistCalMes;
    const mesNomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const diasSem  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

    // Monta lookup dia → eventos (manutencoes realizadas naquele dia)
    const eventosPorDia = {};
    // Também mapeia períodos em_andamento (data_inicio → data_conclusao ou hoje)
    const andamentoPorDia = {}; // dia_str -> [{placa, descricao}]

    // Todos os dados (não filtrados) para os períodos em andamento
    const todosAndamento = (window._mnTabHistDados||[]).filter(mm => mm.status_hist === 'em_andamento' || mm.em_andamento);

    lista.forEach(mm => {
        const dia = mm.data_conclusao || mm.data_agendamento;
        if (!dia) return;
        const [dy,dmo,ddi] = dia.split('-').map(Number);
        if (dy === y && dmo-1 === m) {
            const key = ddi;
            if (!eventosPorDia[key]) eventosPorDia[key] = [];
            eventosPorDia[key].push(mm);
        }
    });

    // Mapear periodos em manutenção (do historico geral, status=em_andamento)
    (window._mnTabHistDados||[]).forEach(mm => {
        if (!mm.data_inicio) return;
        const startDate = new Date(mm.data_inicio + 'T12:00:00');
        const endDate   = mm.data_conclusao ? new Date(mm.data_conclusao + 'T12:00:00') : new Date();
        const curDate   = new Date(startDate);
        while (curDate <= endDate) {
            if (curDate.getFullYear()===y && curDate.getMonth()===m) {
                const d = curDate.getDate();
                if (!andamentoPorDia[d]) andamentoPorDia[d]=[];
                andamentoPorDia[d].push({ placa: mm.placa, descricao: mm.descricao });
            }
            curDate.setDate(curDate.getDate()+1);
        }
    });

    const primeiroDia = new Date(y, m, 1).getDay();
    const ultimoDia  = new Date(y, m+1, 0).getDate();

    let grid = '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;">';
    diasSem.forEach(d => {
        grid += `<div style="text-align:center;font-size:0.72rem;font-weight:700;color:#64748b;padding:6px 0;">${d}</div>`;
    });
    for (let i=0; i<primeiroDia; i++) grid += '<div></div>';
    for (let d=1; d<=ultimoDia; d++) {
        const hoje = new Date(); const ehHoje = d===hoje.getDate() && m===hoje.getMonth() && y===hoje.getFullYear();
        const eventos = eventosPorDia[d] || [];
        const andamento = andamentoPorDia[d] || [];
        const temEvento = eventos.length > 0;
        const temAndamento = andamento.length > 0;
        const bgCell = ehHoje ? '#dbeafe' : (temAndamento ? '#fef3c7' : '#fff');
        const borderCell = ehHoje ? '2px solid #2563eb' : (temAndamento ? '1.5px solid #f59e0b' : '1px solid #e2e8f0');
        let title = '';
        if (temAndamento) title += andamento.map(a => '🔧 '+a.placa+' — '+a.descricao).join('\n') + '\n';
        if (temEvento) title += eventos.map(e => '✅ '+e.placa+(e.descricao?' — '+e.descricao:'')).join('\n');
        const dots = (temAndamento ? '<span style="color:#d97706;font-size:1rem;" title="Em Manutenção">🔧</span>' : '') +
            eventos.slice(0,3).map(e => '<span style="display:inline-block;width:7px;height:7px;background:#16a34a;border-radius:50%;margin:1px;" title="' + (e.placa||'') + '"></span>').join('');
        grid += `<div style="background:${bgCell};border:${borderCell};border-radius:6px;padding:4px;min-height:58px;cursor:${(temEvento||temAndamento)?'pointer':'default'};position:relative;" title="${title.trim()}" onclick="window._mnCalDiaClick(${d}, ${y}, ${m})">
            <div style="font-size:0.78rem;font-weight:${ehHoje?700:600};color:${ehHoje?'#2563eb':'#475569'};">${d}</div>
            <div style="display:flex;flex-wrap:wrap;gap:2px;margin-top:2px;">${dots}</div>
        </div>`;
    }
    grid += '</div>';

    container.innerHTML = `
    <div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
        <div style="background:#1e293b;padding:0.75rem 1rem;display:flex;align-items:center;justify-content:space-between;">
            <button onclick="window._mnHistNavMes(-1)" style="background:rgba(255,255,255,0.1);border:none;color:#fff;width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;"><i class="ph ph-caret-left"></i></button>
            <span style="font-weight:700;color:#fff;font-size:1rem;">${mesNomes[m]} ${y}</span>
            <button onclick="window._mnHistNavMes(1)" style="background:rgba(255,255,255,0.1);border:none;color:#fff;width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;"><i class="ph ph-caret-right"></i></button>
        </div>
        <div style="padding:0.75rem;">${grid}</div>
        <div style="padding:0.5rem 1rem;border-top:1px solid #f1f5f9;display:flex;gap:1rem;align-items:center;font-size:0.75rem;color:#64748b;">
            <span style="display:flex;align-items:center;gap:4px;"><span style="display:inline-block;width:10px;height:10px;background:#16a34a;border-radius:50%;"></span>Manutenção realizada</span>
            <span style="display:flex;align-items:center;gap:4px;">🔧 Em manutenção (período)</span>
            <span style="display:flex;align-items:center;gap:4px;"><span style="display:inline-block;width:10px;height:10px;background:#dbeafe;border:2px solid #2563eb;border-radius:2px;"></span>Hoje</span>
        </div>
        <div id="mn-cal-detail" style="padding:0.75rem 1rem;border-top:1px solid #f1f5f9;min-height:40px;"></div>
    </div>`;
};

window._mnHistNavMes = function(dir) {
    let {y, m} = window._mnHistCalMes;
    m += dir;
    if (m > 11) { m=0; y++; } else if (m < 0) { m=11; y--; }
    window._mnHistCalMes = {y, m};
    window.mnFiltrarTabHistorico();
};

window._mnCalDiaClick = function(dia, y, m) {
    const detail = document.getElementById('mn-cal-detail');
    if (!detail) return;
    const _critCor = { Critica:'#dc2626', Alta:'#d97706', Media:'#0284c7', Baixa:'#2d9e5f' };
    const eventos = (window._mnTabHistDados||[]).filter(mm => {
        const d = mm.data_conclusao || mm.data_agendamento;
        if (!d) return false;
        const [dy,dmo,ddi]=d.split('-').map(Number);
        return dy===y && dmo-1===m && ddi===dia;
    });
    // Periodos em andamento neste dia
    const andamentos = (window._mnTabHistDados||[]).filter(mm => {
        if (!mm.data_inicio) return false;
        const start = new Date(mm.data_inicio+'T12:00:00');
        const end   = mm.data_conclusao ? new Date(mm.data_conclusao+'T12:00:00') : new Date();
        const check = new Date(y, m, dia);
        return check >= new Date(start.getFullYear(),start.getMonth(),start.getDate()) &&
               check <= new Date(end.getFullYear(),end.getMonth(),end.getDate());
    });
    let html = `<div style="font-weight:700;color:#1e293b;margin-bottom:6px;">${String(dia).padStart(2,'0')}/${String(m+1).padStart(2,'0')}/${y}</div>`;
    if (!eventos.length && !andamentos.length) { detail.innerHTML = html + '<span style="color:#94a3b8;font-size:0.82rem;">Nenhuma manutenção neste dia.</span>'; return; }
    if (andamentos.length) {
        html += '<div style="font-size:0.8rem;font-weight:600;color:#d97706;margin-bottom:4px;">🔧 Em Manutenção:</div>';
        andamentos.forEach(mm => {
            html += `<div style="font-size:0.8rem;color:#78350f;padding:2px 0;">${mm.placa||''} — ${mm.descricao||'—'} (${mm.data_inicio} → ${mm.data_conclusao||'em andamento'})</div>`;
        });
    }
    if (eventos.length) {
        html += '<div style="font-size:0.8rem;font-weight:600;color:#16a34a;margin:6px 0 4px;">✅ Realizadas:</div>';
        eventos.forEach(mm => {
            const cor = _critCor[mm.criticidade] || '#94a3b8';
            html += `<div style="font-size:0.8rem;color:#374151;padding:2px 0;">${mm.placa||''} — ${mm.descricao||'—'} <span style="color:${cor};font-weight:600;">(${mm.criticidade||''})</span></div>`;
        });
    }
    detail.innerHTML = html;
};


function mnRenderPreventivaTela(sub) {
    const frota = window._manutFrota || [];
    // Apenas veículos com ao menos uma manutenção preventiva registrada
    const idsComPrev = new Set((window._manutDados||[]).filter(m => m.tipo==='preventiva').map(m => String(m.veiculo_id)));
    const frotaComPrev = frota.filter(v => idsComPrev.has(String(v.id)));
    const veicOpts = frotaComPrev.map(v => `<option value="${v.id}">${v.placa} \u2014 ${(v.marca_modelo_versao||'').substring(0,28)}</option>`).join('');
    sub.innerHTML = `
    <div style="background:#fff;padding:1rem 1.25rem;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:1rem;display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
        <label style="font-weight:700;color:#475569;font-size:0.9rem;">Veículo:</label>
        <select id="mn-prev-veiculo" onchange="window.mnCarregarPreventivoVeiculo()" style="padding:0.6rem 1rem;border:1px solid #cbd5e1;border-radius:8px;font-size:0.9rem;outline:none;min-width:240px;background:#fff;">
            <option value="">Selecione...</option>${veicOpts}
        </select>
        <div id="mn-prev-km-box" style="display:none;align-items:center;gap:8px;flex-wrap:wrap;">
            <i class="ph ph-gauge" style="color:#d97706;font-size:1.1rem;"></i>
            <span style="font-size:0.85rem;color:#64748b;font-weight:600;">KM atual:</span>
            <span id="mn-prev-km-label" style="font-size:0.82rem;color:#64748b;font-weight:700;"></span>
        </div>
    </div>
    <div id="mn-prev-plano"><div style="padding:3rem;text-align:center;color:#94a3b8;">Selecione um ve\u00edculo para ver o plano preventivo.</div></div>`;
}

window.mnCarregarPreventivoVeiculo = async function() {
    const vid = document.getElementById('mn-prev-veiculo')?.value;
    const kmBox = document.getElementById('mn-prev-km-box');
    const planoEl = document.getElementById('mn-prev-plano');
    if (!kmBox || !planoEl) return;
    if (!vid) { kmBox.style.display='none'; planoEl.innerHTML=''; return; }
    kmBox.style.display = 'flex';
    const v = (window._manutFrota||[]).find(x => x.id == vid);
    const kmInp = document.getElementById('mn-prev-km');
    const kmLbl = document.getElementById('mn-prev-km-label');
    if (kmInp && v?.km_atual) kmInp.value = v.km_atual;
    if (kmLbl && v) kmLbl.textContent = v.km_atual ? `Registrado: ${Number(v.km_atual).toLocaleString('pt-BR')} km` : '';
    planoEl.innerHTML = '<div style="padding:1.5rem;text-align:center;color:#94a3b8;"><i class="ph ph-circle-notch ph-spin"></i> Carregando plano...</div>';
    const tok = window._manutTok;
    try {
        const res = await fetch('/api/frota/manutencoes/preventivo/' + vid, { headers: { Authorization: 'Bearer ' + tok } });
        const data = await res.json();
        planoEl.innerHTML = mnRenderPlanoAgrupado(data);
    } catch(e) { planoEl.innerHTML = '<div style="padding:1rem;color:#dc2626;">Erro ao carregar plano.</div>'; }
};

function mnRenderPlanoAgrupado(data) {
    const { km_atual, grupos } = data;
    if (!grupos || !Object.keys(grupos).length) return '<div style="padding:2rem;text-align:center;color:#94a3b8;"><i class="ph ph-wrench" style="font-size:2rem;display:block;margin-bottom:0.5rem;"></i>Nenhuma manutenção preventiva registrada para este veículo.</div>';
    const critCor = { Critica:'#dc2626', Alta:'#d97706', Media:'#0284c7', Baixa:'#2d9e5f' };

    let html = `<div style="display:flex;flex-direction:column;gap:1rem;">`;
    Object.entries(grupos).forEach(([catNome, cat]) => {
        const catKey = catNome.replace(/[^a-zA-Z0-9]/g, '_');
        const rows = cat.itens.map(item => {
            let cor = '#2d9e5f', bg = '#ecfdf5', icone = 'check-circle';
            if (item.status_item==='vencida') { cor='#dc2626'; bg='#fef2f2'; icone='warning'; }
            else if (item.status_item==='proxima') { cor='#d97706'; bg='#fffbeb'; icone='clock'; }

            const kmUltTxt = item.km_ultima
                ? `<span style="font-weight:700;color:#475569;">${Number(item.km_ultima).toLocaleString('pt-BR')} km</span>`
                : '<span style="color:#94a3b8;">—</span>';

            const kmProxTxt = item.km_proxima
                ? `<span style="font-weight:700;color:#0284c7;">${Number(item.km_proxima).toLocaleString('pt-BR')} km</span>`
                : '<span style="color:#94a3b8;">—</span>';

            const intervaloTxt = item.intervalo_configurado ? `<br><span style="font-size:0.68rem;font-weight:400;color:#64748b;">(Intervalo: ${Number(item.intervalo_configurado).toLocaleString('pt-BR')} km)</span>` : '';
            const kmRestTxt = (item.km_restante <= 0
                ? `<span style="color:#dc2626;font-weight:700;">Vencida há ${Math.abs(Math.round(item.km_restante)).toLocaleString('pt-BR')} km</span>`
                : `<span style="color:${cor};font-weight:700;">Restam ${Math.round(item.km_restante).toLocaleString('pt-BR')} km</span>`) + intervaloTxt;

            const criticBadge = `<span style="background:${critCor[item.criticidade]||'#94a3b8'}22;color:${critCor[item.criticidade]||'#94a3b8'};padding:1px 7px;border-radius:20px;font-size:0.72rem;font-weight:700;">${item.criticidade||'Media'}</span>`;

            const statusCor = {concluida:'#2d9e5f',agendada:'#2563eb',programada:'#7c3aed',em_andamento:'#d97706',cancelada:'#94a3b8'};
            const statusLbl = {concluida:'Concluída',agendada:'Agendada',programada:'Programada',em_andamento:'Em Andamento',cancelada:'Cancelada'};
            const sKey = item.status||'concluida';
            const statusBadge = `<span style="background:${statusCor[sKey]||'#94a3b8'}22;color:${statusCor[sKey]||'#94a3b8'};padding:1px 7px;border-radius:20px;font-size:0.72rem;font-weight:700;">${statusLbl[sKey]||sKey}</span>`;

            const nome = item.descricao || item.nome || '—';
            const nomeSafe = nome.replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;');
            
            const createObsIcon = (obs, color) => obs ? ` <i class="ph ph-chat-text" style="color:${color};cursor:pointer;font-size:1.1rem;margin-left:4px;vertical-align:middle;" title="${obs.replace(/"/g,'&quot;')}" onclick="alert('Observações:\\n\\n${obs.replace(/'/g,"\\'").replace(/\n/g,'\\n')}')"></i>` : '';

            const obsIconConcluida = createObsIcon(item.observacoes_concluida, '#0284c7');
            const obsIconAgendada = createObsIcon(item.observacoes_agendada, '#2563eb');

            // Última manutenção realizada
            const fmtDate = d => {
                if (!d) return '<span style="color:#94a3b8;">—</span>';
                const [y,m,dia] = d.split('-');
                return `<span style="font-weight:600;color:#475569;font-size:0.82rem;">${dia||d}/${m||''}/${(y||'').slice(2)}</span>`;
            };
            const kmUltStr = item.km_ultima ? `<span style="font-size:0.68rem;font-weight:400;color:#64748b;">${Number(item.km_ultima).toLocaleString('pt-BR')} km</span>` : '';
            const ultimaManuTxt = `<div style="display:flex;flex-direction:column;align-items:center;"><div>${fmtDate(item.data_ultima_manutencao)}${obsIconConcluida}</div>${kmUltStr}</div>`;
            const dataAgendadaTxt = item.data_agendamento
                ? `<span style="font-weight:700;color:#2563eb;font-size:0.82rem;display:flex;align-items:center;justify-content:center;gap:4px;">${fmtDate(item.data_agendamento).replace(/<[^>]+>/g,'').trim()}${obsIconAgendada}</span>`
                : '<span style="color:#94a3b8;">—</span>';

            return `<tr style="background:${bg};border-bottom:1px solid #e2e8f0;">
                <td style="padding:0.6rem 0.5rem;text-align:center;">
                    <input type="checkbox" class="mn-prev-cb mn-prev-cb-cat-${catKey}" data-id="${item.id}" data-nome="${nomeSafe}" onchange="window.mnPrevCbChanged()" style="width:15px;height:15px;cursor:pointer;">
                </td>
                <td style="padding:0.6rem 0.9rem;">
                    <div style="display:flex;align-items:center;gap:6px;">
                        <i class="ph ph-${icone}" style="color:${cor};font-size:1rem;"></i>
                        <span style="font-weight:600;color:#1e293b;font-size:0.85rem;">${nome}</span>
                        ${item.observacoes_concluida ? `<i class="ph ph-note" style="color:#0284c7;cursor:pointer;font-size:1rem;flex-shrink:0;" title="${item.observacoes_concluida.replace(/"/g,'&quot;')}" onclick="alert('Anotação da última manutenção:\\n\\n${item.observacoes_concluida.replace(/'/g,"\\'").replace(/\n/g,'\\n')}')"></i>` : ''}
                    </div>
                </td>
                <td style="padding:0.6rem 0.9rem;text-align:center;">${criticBadge}</td>
                <td style="padding:0.6rem 0.9rem;text-align:center;">${statusBadge}</td>
                <td style="padding:0.6rem 0.9rem;text-align:center;">${ultimaManuTxt}</td>
                <td style="padding:0.6rem 0.9rem;text-align:center;">${dataAgendadaTxt}</td>
                <td style="padding:0.6rem 0.9rem;text-align:center;font-size:0.82rem;">${kmProxTxt}</td>
                <td style="padding:0.6rem 0.9rem;text-align:center;">${kmRestTxt}</td>
                <td style="padding:0.6rem 0.5rem;text-align:center;">
                    <div style="display:flex;gap:4px;justify-content:center;align-items:center;">
                        ${item.status === 'em_andamento'
                            ? `<button title="Finalizar manutenção" onclick="window.mnConcluirIndividual(${item.id}, '${nomeSafe}')" style="background:#16a34a;color:#fff;border:none;border-radius:6px;padding:0 10px;height:28px;cursor:pointer;display:flex;align-items:center;gap:4px;font-size:0.72rem;font-weight:700;white-space:nowrap;"><i class="ph ph-check-circle"></i> Finalizar</button>`
                            : item.status === 'agendada'
                                ? `<button onclick="window.mnIniciarManutencao(${item.id}, '${nomeSafe}')" style="background:#d97706;color:#fff;border:none;border-radius:6px;padding:0 10px;height:28px;cursor:pointer;display:flex;align-items:center;gap:4px;font-size:0.72rem;font-weight:700;white-space:nowrap;" title="Iniciar Manutenção"><i class="ph ph-play"></i> Iniciar</button>`
                                : `<button onclick="window.mnAgendarIndividual(${item.id}, '${nomeSafe}')" style="background:#7c3aed;color:#fff;border:none;border-radius:6px;padding:0 10px;height:28px;cursor:pointer;display:flex;align-items:center;gap:4px;font-size:0.72rem;font-weight:700;white-space:nowrap;" title="Agendar"><i class="ph ph-calendar-plus"></i> Agendar</button>`
                        }
                        <button onclick="window.mnEditarRapido(${item.id}, '${nomeSafe}', ${item.intervalo_configurado || item.periodicidade_padrao || 0}, '${(item.observacoes||'').replace(/'/g,"\\'")}', ${item.km_ultima || 0})"
                            style="background:#2563eb;color:#fff;border:none;border-radius:6px;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;" title="Editar intervalo e observação">
                            <i class="ph ph-pencil"></i>
                        </button>
                        <button onclick="window.excluirManutencao(${item.id})"
                            style="background:#dc2626;color:#fff;border:none;border-radius:6px;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;" title="Excluir">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');

        html += `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
            <div style="background:#1e293b;padding:0.65rem 1rem;display:flex;align-items:center;gap:8px;">
                <input type="checkbox" onchange="window.mnPrevToggleCat(this, '${catKey}')"
                    style="width:15px;height:15px;cursor:pointer;accent-color:#f59e0b;" title="Selecionar todos">
                <i class="ph ph-${cat.icone||'wrench'}" style="color:#f59e0b;font-size:1rem;"></i>
                <span style="font-weight:700;color:#fff;font-size:0.9rem;">${catNome}</span>
                <span style="margin-left:auto;font-size:0.78rem;color:#94a3b8;">${cat.itens.length} serviços</span>
            </div>
            <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:0.83rem;">
                <thead><tr style="background:#f1f5f9;">
                    <th style="padding:0.5rem 0.5rem;width:36px;"></th>
                    <th style="padding:0.5rem 0.9rem;text-align:left;color:#64748b;font-weight:600;">Serviço</th>
                    <th style="padding:0.5rem 0.9rem;text-align:center;color:#64748b;font-weight:600;">Criticidade</th>
                    <th style="padding:0.5rem 0.9rem;text-align:center;color:#64748b;font-weight:600;">Situação</th>
                    <th style="padding:0.5rem 0.9rem;text-align:center;color:#64748b;font-weight:600;">Última Manu.</th>
                    <th style="padding:0.5rem 0.9rem;text-align:center;color:#64748b;font-weight:600;">Data Agendada</th>
                    <th style="padding:0.5rem 0.9rem;text-align:center;color:#64748b;font-weight:600;">Próximo KM</th>
                    <th style="padding:0.5rem 0.9rem;text-align:center;color:#64748b;font-weight:600;">Status KM</th>
                    <th style="padding:0.5rem 0.5rem;width:70px;"></th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table></div>
        </div>`;
    });

    // Barra de ações em massa
    html += `</div>
    <div id="mn-prev-mass-actions" style="display:none;position:sticky;bottom:0;background:#1e293b;color:#fff;padding:0.75rem 1rem;border-radius:10px;margin-top:0.5rem;flex-wrap:wrap;gap:8px;align-items:center;">
        <i class="ph ph-check-square" style="color:#f59e0b;font-size:1.1rem;"></i>
        <span style="font-weight:600;font-size:0.88rem;"><span id="mn-prev-sel-count">0</span> selecionado(s)</span>
        <div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap;">
            <button onclick="window.mnIniciarSelecionados()" style="background:#d97706;color:#fff;border:none;border-radius:8px;padding:0.45rem 1rem;font-weight:600;font-size:0.83rem;cursor:pointer;display:flex;align-items:center;gap:6px;">
                <i class="ph ph-play"></i> Iniciar Programados
            </button>
            <button onclick="window.mnFinalizarAgendado()" style="background:#2d9e5f;color:#fff;border:none;border-radius:8px;padding:0.45rem 1rem;font-weight:600;font-size:0.83rem;cursor:pointer;display:flex;align-items:center;gap:6px;">
                <i class="ph ph-check-circle"></i> Finalizar Selecionados
            </button>
            <button onclick="window.mnAgendarSelecionados()" style="background:#7c3aed;color:#fff;border:none;border-radius:8px;padding:0.45rem 1rem;font-weight:600;font-size:0.83rem;cursor:pointer;display:flex;align-items:center;gap:6px;">
                <i class="ph ph-calendar-plus"></i> Agendar Selecionados
            </button>
            <button onclick="window.mnEditarIntervaloObsSelecionados()" style="background:#0284c7;color:#fff;border:none;border-radius:8px;padding:0.45rem 1rem;font-weight:600;font-size:0.83rem;cursor:pointer;display:flex;align-items:center;gap:6px;">
                <i class="ph ph-pencil-simple"></i> Editar Intervalo
            </button>
            <button onclick="window.mnExcluirSelecionados()" style="background:#dc2626;color:#fff;border:none;border-radius:8px;padding:0.45rem 1rem;font-weight:600;font-size:0.83rem;cursor:pointer;display:flex;align-items:center;gap:6px;">
                <i class="ph ph-trash"></i> Excluir Selecionadas
            </button>
        </div>
    </div>`;
    return html;
}




window.registrarManutPreventiva = function(servicoId, nome, tipoControle) {
    const vid = document.getElementById('mn-prev-veiculo')?.value;
    if (!vid) return alert('Selecione um veículo primeiro');
    window.abrirModalManutencaoPreventiva(servicoId, nome, tipoControle, vid);
};

window.abrirModalManutencaoPreventiva = function(servicoId, nome, tipoControle, vid) {
    // Opens the modal pre-filled for a specific preventive maintenance item
    window.abrirModalManutencao(null, { tipo: 'preventiva', servico_catalogo_id: servicoId, descricao: nome, tipoControle, vid });
};


window.mnSalvarKmPreventivo = async function() {
    const vid = document.getElementById('mn-prev-veiculo')?.value;
    const km = document.getElementById('mn-prev-km')?.value;
    if (!vid || !km) return alert('Selecione o veículo e informe o KM');
    const tok = window._manutTok;
    const res = await fetch('/api/frota/veiculos/' + vid + '/km', {
        method: 'PUT', headers: {'Content-Type':'application/json', Authorization: 'Bearer ' + tok},
        body: JSON.stringify({ km_atual: parseInt(km) })
    });
    if (res.ok) {
        const v = (window._manutFrota||[]).find(x => x.id == vid);
        if (v) v.km_atual = parseInt(km);
        const lbl = document.getElementById('mn-prev-km-label');
        if (lbl) lbl.textContent = `Registrado: ${Number(km).toLocaleString('pt-BR')} km`;
        window.mnCarregarPreventivoVeiculo();
    } else alert('Erro ao salvar KM');
};

function mnRenderCorretivaTela(sub) {
    const frota = window._manutFrota || [];
    const veicOpts = frota.map(v => `<option value="${v.id}">${v.placa}</option>`).join('');
    const statusCor = {agendada:'#2563eb',em_andamento:'#dc2626',concluida:'#2d9e5f',cancelada:'#94a3b8'};
    const statusLbl = {agendada:'Agendada',em_andamento:'Em Andamento',concluida:'Concluída',cancelada:'Cancelada'};
    const rows = (window._manutDados||[]).filter(m => m.tipo==='corretiva');
    const makeRow = m => `<tr style="border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
        <td style="padding:0.7rem 1rem;font-weight:700;">${m.placa||'—'}</td>
        <td style="padding:0.7rem 1rem;max-width:200px;">${m.descricao||'—'}</td>
        <td style="padding:0.7rem 1rem;text-align:center;"><span style="background:${statusCor[m.status]||'#94a3b8'}22;color:${statusCor[m.status]||'#94a3b8'};padding:2px 10px;border-radius:20px;font-size:0.78rem;font-weight:700;">${statusLbl[m.status]||m.status}</span></td>
        <td style="padding:0.7rem 1rem;text-align:center;color:#64748b;">${m.data_agendamento||m.data_conclusao||'—'}</td>
        <td style="padding:0.7rem 1rem;text-align:center;color:#64748b;">${m.fornecedor||'—'}</td>
        <td style="padding:0.7rem 1rem;text-align:center;color:#64748b;">${m.custo?'R$ '+Number(m.custo).toFixed(2).replace('.',','):'—'}</td>
        <td style="padding:0.7rem 1rem;text-align:center;display:flex;gap:4px;">
            <button onclick="window.abrirModalManutencao(${m.id})" style="background:#2563eb;color:#fff;border:none;border-radius:6px;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;"><i class="ph ph-pencil"></i></button>
            <button onclick="window.excluirManutencao(${m.id})" style="background:#dc2626;color:#fff;border:none;border-radius:6px;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;"><i class="ph ph-trash"></i></button>
        </td>
    </tr>`;
    sub.innerHTML = `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
        <div style="background:#f8fafc;padding:0.75rem 1rem;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-weight:700;color:#1e293b;display:flex;align-items:center;gap:8px;"><i class="ph ph-wrench" style="color:#d97706;"></i> Manutenções Corretivas</span>
            <div style="display:flex;gap:8px;">
                <select id="mn-corr-veiculo" onchange="window.mnFiltrarCorretiva()" style="padding:0.5rem;border:1px solid #cbd5e1;border-radius:8px;font-size:0.85rem;outline:none;background:#fff;"><option value="">Todos os Veículos</option>${veicOpts}</select>
                <select id="mn-corr-status" onchange="window.mnFiltrarCorretiva()" style="padding:0.5rem;border:1px solid #cbd5e1;border-radius:8px;font-size:0.85rem;outline:none;background:#fff;">
                    <option value="">Todos Status</option><option value="agendada">Agendada</option><option value="em_andamento">Em Andamento</option><option value="concluida">Concluída</option><option value="cancelada">Cancelada</option>
                </select>
            </div>
        </div>
        <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
            <thead><tr style="background:#f1f5f9;">
                <th style="padding:0.6rem 1rem;text-align:left;color:#64748b;">Placa</th>
                <th style="padding:0.6rem 1rem;text-align:left;color:#64748b;">Descrição</th>
                <th style="padding:0.6rem 1rem;text-align:center;color:#64748b;">Status</th>
                <th style="padding:0.6rem 1rem;text-align:center;color:#64748b;">Data</th>
                <th style="padding:0.6rem 1rem;text-align:center;color:#64748b;">Fornecedor</th>
                <th style="padding:0.6rem 1rem;text-align:center;color:#64748b;">Custo</th>
                <th style="padding:0.6rem 1rem;"></th>
            </tr></thead>
            <tbody id="mn-corr-tbody">${rows.length ? rows.map(makeRow).join('') : '<tr><td colspan="7" style="padding:2rem;text-align:center;color:#94a3b8;">Nenhuma manutenção corretiva registrada.</td></tr>'}</tbody>
        </table></div>
    </div>`;
}

window.mnFiltrarCorretiva = function() {
    const fV = document.getElementById('mn-corr-veiculo')?.value||'';
    const fS = document.getElementById('mn-corr-status')?.value||'';
    let rows = (window._manutDados||[]).filter(m=>m.tipo==='corretiva');
    if (fV) rows = rows.filter(m=>String(m.veiculo_id)===fV);
    if (fS) rows = rows.filter(m=>m.status===fS);
    const tbody = document.getElementById('mn-corr-tbody');
    if (!tbody) return;
    const statusCor={agendada:'#2563eb',em_andamento:'#dc2626',concluida:'#2d9e5f',cancelada:'#94a3b8'};
    const statusLbl={agendada:'Agendada',em_andamento:'Em Andamento',concluida:'Concluída',cancelada:'Cancelada'};
    tbody.innerHTML = rows.length ? rows.map(m=>`<tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:0.7rem 1rem;font-weight:700;">${m.placa||'—'}</td>
        <td style="padding:0.7rem 1rem;">${m.descricao||'—'}</td>
        <td style="padding:0.7rem 1rem;text-align:center;"><span style="background:${statusCor[m.status]||'#94a3b8'}22;color:${statusCor[m.status]||'#94a3b8'};padding:2px 10px;border-radius:20px;font-size:0.78rem;font-weight:700;">${statusLbl[m.status]||m.status}</span></td>
        <td style="padding:0.7rem 1rem;text-align:center;color:#64748b;">${m.data_agendamento||m.data_conclusao||'—'}</td>
        <td style="padding:0.7rem 1rem;text-align:center;color:#64748b;">${m.fornecedor||'—'}</td>
        <td style="padding:0.7rem 1rem;text-align:center;color:#64748b;">${m.custo?'R$ '+Number(m.custo).toFixed(2).replace('.',','):'—'}</td>
        <td style="padding:0.7rem 1rem;display:flex;gap:4px;">
            <button onclick="window.abrirModalManutencao(${m.id})" style="background:#2563eb;color:#fff;border:none;border-radius:6px;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;"><i class="ph ph-pencil"></i></button>
            <button onclick="window.excluirManutencao(${m.id})" style="background:#dc2626;color:#fff;border:none;border-radius:6px;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;"><i class="ph ph-trash"></i></button>
        </td>
    </tr>`).join('') : '<tr><td colspan="7" style="padding:2rem;text-align:center;color:#94a3b8;">Nenhuma encontrada.</td></tr>';
};

async function mnCarregarPreventivo(vid, tok) {

    const panel = document.getElementById('mn-preventivo-panel');
    if (!panel) return;
    panel.style.display = 'block';
    panel.innerHTML = '<div style="padding:1rem;text-align:center;color:#94a3b8;"><i class="ph ph-circle-notch ph-spin"></i> Calculando plano preventivo...</div>';
    try {
        const res = await fetch('/api/frota/preventivo/' + vid, { headers: { Authorization: 'Bearer ' + tok } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        panel.innerHTML = mnRenderPreventivo(data);
    } catch(e) {
        panel.innerHTML = '<div style="padding:1rem;color:#dc2626;">Erro ao carregar plano preventivo.</div>';
    }
}

function mnRenderPreventivo(data) {
    const { km_atual, plano } = data;
    const rows = (plano || []).map(item => {
        let cor = '#2d9e5f'; let icone = 'check-circle'; let bg = '#ecfdf5';
        if (item.status_item === 'vencida') { cor = '#dc2626'; icone = 'warning'; bg = '#fef2f2'; }
        else if (item.status_item === 'proxima') { cor = '#d97706'; icone = 'clock'; bg = '#fffbeb'; }
        const kmRestLabel = item.km_restante <= 0
            ? `<span style="color:#dc2626;font-weight:700;">Vencida há ${Math.abs(item.km_restante).toLocaleString('pt-BR')} km</span>`
            : `<span style="color:${cor};font-weight:700;">Restam ${item.km_restante.toLocaleString('pt-BR')} km</span>`;
        return `<tr style="background:${bg};border-bottom:1px solid #e2e8f0;">
            <td style="padding:0.6rem 1rem;"><i class="ph ph-${icone}" style="color:${cor};"></i> <strong style="color:${cor};">${item.nome}</strong></td>
            <td style="padding:0.6rem 1rem;color:#64748b;font-size:0.85rem;">${item.descricao||''}</td>
            <td style="padding:0.6rem 1rem;text-align:center;color:#475569;font-size:0.85rem;">A cada ${item.intervalo_km.toLocaleString('pt-BR')} km</td>
            <td style="padding:0.6rem 1rem;text-align:center;color:#475569;font-size:0.85rem;">${item.km_ultima ? item.km_ultima.toLocaleString('pt-BR') + ' km' : '—'}</td>
            <td style="padding:0.6rem 1rem;text-align:center;">${kmRestLabel}</td>
        </tr>`;
    }).join('');

    return `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
        <div style="background:#f8fafc;padding:0.75rem 1rem;border-bottom:1px solid #e2e8f0;font-weight:700;color:#1e293b;display:flex;align-items:center;gap:8px;">
            <i class="ph ph-clipboard-text" style="color:#d97706;font-size:1.1rem;"></i>
            Plano de Manutenção Preventiva — KM Atual: <span style="color:#0284c7;">${(km_atual||0).toLocaleString('pt-BR')} km</span>
        </div>
        <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
            <thead>
                <tr style="background:#f1f5f9;">
                    <th style="padding:0.5rem 1rem;text-align:left;color:#64748b;font-weight:600;">Serviço</th>
                    <th style="padding:0.5rem 1rem;text-align:left;color:#64748b;font-weight:600;">Descrição</th>
                    <th style="padding:0.5rem 1rem;text-align:center;color:#64748b;font-weight:600;">Intervalo</th>
                    <th style="padding:0.5rem 1rem;text-align:center;color:#64748b;font-weight:600;">Último KM</th>
                    <th style="padding:0.5rem 1rem;text-align:center;color:#64748b;font-weight:600;">Status</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
        </div>
    </div>`;
}

function mnRenderLista() {
    const el = document.getElementById('mn-lista');
    if (!el) return;
    const fVeiculo = document.getElementById('mn-filtro-veiculo')?.value || '';
    const fStatus = document.getElementById('mn-filtro-status')?.value || '';
    let rows = [...(window._manutDados || [])];
    if (fVeiculo) rows = rows.filter(m => String(m.veiculo_id) === fVeiculo);
    if (fStatus) rows = rows.filter(m => m.status === fStatus);
    if (!rows.length) {
        el.innerHTML = '<div style="padding:3rem;text-align:center;color:#94a3b8;"><i class="ph ph-wrench" style="font-size:2rem;"></i><br>Nenhuma manutenção encontrada.</div>';
        return;
    }
    const statusCor = { agendada:'#2563eb', em_andamento:'#dc2626', concluida:'#2d9e5f', cancelada:'#94a3b8' };
    const statusLabel = { agendada:'Agendada', em_andamento:'Em Andamento', concluida:'Concluída', cancelada:'Cancelada' };
    const tipoCor = { preventiva:'#7c3aed', corretiva:'#d97706' };
    el.innerHTML = `<div style="overflow-x:auto;">
    <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
        <thead><tr style="background:#f1f5f9;">
            <th style="padding:0.75rem 1rem;text-align:left;color:#64748b;">Veículo</th>
            <th style="padding:0.75rem 1rem;text-align:left;color:#64748b;">Tipo</th>
            <th style="padding:0.75rem 1rem;text-align:left;color:#64748b;">Descrição</th>
            <th style="padding:0.75rem 1rem;text-align:center;color:#64748b;">KM</th>
            <th style="padding:0.75rem 1rem;text-align:center;color:#64748b;">Status</th>
            <th style="padding:0.75rem 1rem;text-align:center;color:#64748b;">Data</th>
            <th style="padding:0.75rem 1rem;text-align:center;color:#64748b;">Custo</th>
            <th style="padding:0.75rem 1rem;text-align:center;color:#64748b;"></th>
        </tr></thead>
        <tbody>${rows.map(m => `
        <tr style="border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
            <td style="padding:0.75rem 1rem;font-weight:700;color:#1e293b;">${m.placa||'—'}</td>
            <td style="padding:0.75rem 1rem;"><span style="background:${tipoCor[m.tipo]||'#94a3b8'}22;color:${tipoCor[m.tipo]||'#94a3b8'};padding:2px 8px;border-radius:20px;font-size:0.78rem;font-weight:600;">${m.tipo}</span></td>
            <td style="padding:0.75rem 1rem;color:#374151;max-width:250px;">${m.descricao||'—'}</td>
            <td style="padding:0.75rem 1rem;text-align:center;color:#64748b;">${m.km_na_manutencao ? m.km_na_manutencao.toLocaleString('pt-BR') + ' km' : '—'}</td>
            <td style="padding:0.75rem 1rem;text-align:center;"><span style="background:${statusCor[m.status]||'#94a3b8'}22;color:${statusCor[m.status]||'#94a3b8'};padding:2px 10px;border-radius:20px;font-size:0.78rem;font-weight:700;">${statusLabel[m.status]||m.status}</span></td>
            <td style="padding:0.75rem 1rem;text-align:center;color:#64748b;">${m.data_agendamento||m.data_conclusao||'—'}</td>
            <td style="padding:0.75rem 1rem;text-align:center;color:#64748b;">${m.custo ? 'R$ ' + Number(m.custo).toFixed(2).replace('.',',') : '—'}</td>
            <td style="padding:0.75rem 1rem;text-align:center;display:flex;gap:4px;justify-content:center;">
                <button onclick="window.abrirModalManutencao(${m.id})" style="background:#2563eb;color:#fff;border:none;border-radius:6px;width:30px;height:30px;cursor:pointer;display:flex;align-items:center;justify-content:center;" title="Editar"><i class="ph ph-pencil"></i></button>
                <button onclick="window.excluirManutencao(${m.id})" style="background:#dc2626;color:#fff;border:none;border-radius:6px;width:30px;height:30px;cursor:pointer;display:flex;align-items:center;justify-content:center;" title="Excluir"><i class="ph ph-trash"></i></button>
            </td>
        </tr>`).join('')}</tbody>
    </table></div>`;
}

window.mnFiltrar = function() { mnRenderLista(); };

window.mnAtualizarKm = async function() {
    const vid = document.getElementById('mn-filtro-veiculo')?.value;
    const km = document.getElementById('mn-km-input')?.value;
    if (!vid || !km) return alert('Selecione o veículo e informe o KM');
    const tok = window._manutTok;
    const res = await fetch('/api/frota/veiculos/' + vid + '/km', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
        body: JSON.stringify({ km_atual: parseInt(km) })
    });
    if (res.ok) {
        const v = window._manutFrota?.find(x => x.id == vid);
        if (v) v.km_atual = parseInt(km);
        const el = document.getElementById('mn-km-atual');
        if (el) el.textContent = `KM registrado: ${Number(km).toLocaleString('pt-BR')} km`;
        await mnCarregarPreventivo(vid, tok);
        await fetch('/api/frota/veiculos', { headers: { Authorization: 'Bearer ' + tok } })
            .then(r => r.json()).then(d => { window._frotaDados = d; });
    } else alert('Erro ao atualizar KM');
};

window.abrirModalManutencao = async function(id, opts = {}) {
    const tok = window._manutTok;
    
    if (!window._manutCategorias) {
        window._manutCategorias = await fetch('/api/frota/categorias', { headers: { Authorization: 'Bearer ' + tok } }).then(r=>r.json());
    }
    if (!window._manutCatalogo) {
        window._manutCatalogo = await fetch('/api/frota/catalogo', { headers: { Authorization: 'Bearer ' + tok } }).then(r=>r.json());
    }

    let m = {};
    if (id) {
        m = (window._manutDados||[]).find(x => x.id === id) || {};
    } else {
        m = {
            tipo: opts.tipo || (window._mnSubAba === 'preventiva' ? 'preventiva' : 'corretiva'),
            veiculo_id: opts.vid || '',
            servico_catalogo_id: opts.servico_catalogo_id || '',
            descricao: opts.descricao || '',
            tipo_controle: opts.tipoControle || 'KM'
        };
    }

    let ov = document.getElementById('modal-manut-ov'); if (ov) ov.remove();
    ov = document.createElement('div'); ov.id = 'modal-manut-ov';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.75);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;';
    
    const frota = window._manutFrota || [];
    const veicOpts = frota.map(v => `<option value="${v.id}" ${m.veiculo_id==v.id?'selected':''}>${v.placa} \u2014 ${(v.marca_modelo_versao||'').substring(0,30)}</option>`).join('');
    
    const fornecedores = [...new Set((window._manutDados||[]).map(x => x.fornecedor).filter(Boolean))];
    const fornListOpts = fornecedores.map(f => `<option value="${f.replace(/"/g,'&quot;')}">`).join('');

    const inp = (fid,val,ph,type,list) => `<input id="${fid}" value="${val||''}" placeholder="${ph||''}" type="${type||'text'}" ${list?`list="${list}"`:''} style="width:100%;padding:0.6rem;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;font-size:0.9rem;outline:none;">`;
    const lbl = t => `<label style="font-size:0.8rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">${t}</label>`;
    const sel = (fid, optsArr, selected, disabled, onchg) => `<select id="${fid}" ${disabled?'disabled':''} ${onchg?`onchange="${onchg}"`:''} style="width:100%;padding:0.6rem;border:1px solid #cbd5e1;border-radius:8px;background:${disabled?'#f8fafc':'#fff'};box-sizing:border-box;font-size:0.9rem;outline:none;${disabled?'cursor:not-allowed;color:#64748b;':''}">${optsArr.map(o=>`<option value="${o.v}" ${selected===o.v?'selected':''}>${o.l}</option>`).join('')}</select>`;

    const catOpts = [{v:'', l:'Selecione...'}].concat((window._manutCategorias||[]).map(c => ({v:c.id, l:c.nome})));

    ov.innerHTML = `<div style="background:#fff;border-radius:16px;width:100%;max-width:1100px;height:88vh;display:flex;flex-direction:column;box-shadow:0 25px 50px -12px rgba(0,0,0,0.35);overflow:hidden;">
<div style="padding:1rem 1.5rem;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#fffbeb;flex-shrink:0;">
    <div style="font-size:1rem;font-weight:700;color:#92400e;display:flex;align-items:center;gap:8px;">
        <div style="background:#d97706;color:#fff;width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;"><i class="ph ph-wrench"></i></div>
        ${id ? 'Editar Manutenção' : (m.tipo==='preventiva' ? 'Nova Preventiva' : 'Nova Corretiva')}
    </div>
    <button onclick="document.getElementById('modal-manut-ov').remove()" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:#94a3b8;"><i class="ph ph-x"></i></button>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;flex:1;overflow:hidden;">
  <div style="padding:1.5rem;display:flex;flex-direction:column;gap:1rem;overflow-y:auto;border-right:1px solid #e2e8f0;">
    <datalist id="lista-fornecedores">${fornListOpts}</datalist>
    <div>${lbl('Veículo *')}<select id="mn-m-veiculo" onchange="window.mnModalVeiculoChanged()" style="width:100%;padding:0.6rem;border:1px solid #cbd5e1;border-radius:8px;background:#fff;box-sizing:border-box;font-size:0.9rem;outline:none;"><option value="">Selecione...</option>${veicOpts}</select></div>
    ${id ? `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div>${lbl('Tipo *')}${sel('mn-m-tipo', [{v:'preventiva',l:'Preventiva'},{v:'corretiva',l:'Corretiva'}], m.tipo, opts.tipo!==undefined, 'const box=document.getElementById("mn-forn-data-box"); if(box) box.style.display=this.value==="preventiva"?"none":"grid";')}</div>
        <div>${lbl('Status *')}${sel('mn-m-status', [{v:'programada',l:'Programada'},{v:'agendada',l:'Agendada'},{v:'em_andamento',l:'Em Andamento'},{v:'concluida',l:'Concluída'},{v:'cancelada',l:'Cancelada'}], m.status||'programada', false)}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div>${lbl('Fornecedor / Oficina')}${inp('mn-m-forn', m.fornecedor, 'Digite para buscar ou criar...', 'text', 'lista-fornecedores')}</div>
        <div>${lbl('Data Agendamento')}<input id="mn-m-data-ag" value="${m.data_agendamento||''}" type="date" onchange="window.mnModalDataAgChanged(this)" style="width:100%;padding:0.6rem;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;font-size:0.9rem;outline:none;"></div>
    </div>
    <div id="mn-forn-data-box" style="display:none;"></div>` : `
    <input type="hidden" id="mn-m-tipo" value="${m.tipo||'preventiva'}">
    <input type="hidden" id="mn-m-status" value="programada">
    <input type="hidden" id="mn-m-forn" value="${m.fornecedor||''}">
    <input type="hidden" id="mn-m-data-ag" value="${m.data_agendamento||''}">
    <div id="mn-forn-data-box" style="display:none;"></div>`}
    <div style="flex:1;">${lbl('Observações')}<textarea id="mn-m-obs" placeholder="Observações adicionais..." style="width:100%;padding:0.6rem;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;font-size:0.9rem;outline:none;min-height:100px;resize:vertical;">${m.observacoes||''}</textarea></div>
    <div style="display:flex;gap:1rem;justify-content:flex-end;padding-top:0.75rem;border-top:1px solid #e2e8f0;">
        <button onclick="document.getElementById('modal-manut-ov').remove()" style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;padding:0.6rem 1.2rem;font-weight:600;cursor:pointer;color:#475569;">Cancelar</button>
        <button onclick="window.salvarManutencao(${id||'null'})" style="background:#d97706;color:#fff;border:none;border-radius:8px;padding:0.6rem 1.5rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;"><i class="ph ph-floppy-disk"></i> ${id ? 'Salvar Alterações' : 'Registrar'}</button>
    </div>
  </div>
  <div style="padding:1.5rem;display:flex;flex-direction:column;gap:1rem;overflow-y:auto;">
    <h4 style="margin:0;font-size:0.9rem;color:#1e293b;display:flex;align-items:center;gap:6px;"><i class="ph ph-list-plus" style="color:#0284c7;"></i> Serviços</h4>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:1rem;display:flex;flex-direction:column;gap:1rem;">
        <div>${lbl('Categoria')}${sel('mn-m-cat', catOpts, '', false, 'window.mnModalCatChanged()')}</div>
        <div id="mn-m-serv-container" style="display:none;flex-direction:column;gap:1rem;">
            <div>${lbl('KM Intervalo')}<input id="mn-m-intervalo" type="number" placeholder="Ex: 10000" style="width:100%;padding:0.6rem;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;font-size:0.9rem;outline:none;"></div>
            <div>${lbl('Selecione os Serviços')}<div id="mn-m-serv-checkboxes" style="background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:0.6rem;max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;"></div></div>
            <div id="mn-m-serv-novo-box" style="display:none;">${lbl('Nome do Novo Serviço')}${inp('mn-m-serv-novo', '', 'Ex: Troca de válvula específica...')}</div>
            <button id="mn-m-btn-add" onclick="window.mnModalAddServico()" style="background:#0284c7;color:#fff;border:none;border-radius:8px;padding:0.6rem;font-weight:600;cursor:pointer;font-size:0.85rem;">Adicionar Serviços Selecionados à Lista</button>
        </div>
    </div>
    <div id="mn-m-servicos-lista" style="display:flex;flex-direction:column;gap:6px;"></div>
    <input type="hidden" id="mn-m-km" value="${m.km_na_manutencao||''}">\r
  </div>
</div></div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });

    // Auto-fill KM if vehicle is already selected
    if (m.veiculo_id) setTimeout(() => { if (window.mnModalVeiculoChanged) window.mnModalVeiculoChanged(); }, 50);

    window._mnModalServicos = [];
    
    if (opts.multi_servicos && opts.multi_servicos.length > 0) {
        window._mnModalServicos = opts.multi_servicos.map(s => {
            let interv = s.intervalo;
            if (!interv && s.servico_id) {
                const catItem = (window._manutCatalogo||[]).find(c => c.id == s.servico_id);
                if (catItem) interv = catItem.periodicidade_padrao;
            }
            return {
                id: null,
                cat_id: s.cat_id || '',
                servico_id: s.servico_id,
                nome: s.nome,
                km: s.km || '',
                intervalo: interv || ''
            };
        });
        window.mnModalRenderServicos();
    } else if (m.descricao) {
        let interv = m.intervalo_configurado || '';
        // 1) busca pelo ID do serviço no catálogo
        if (!interv && m.servico_catalogo_id) {
            const catItem = (window._manutCatalogo||[]).find(c => c.id == m.servico_catalogo_id);
            if (catItem) interv = catItem.periodicidade_padrao;
        }
        // 2) fallback: busca pelo nome no catálogo
        if (!interv && m.descricao) {
            const catItem = (window._manutCatalogo||[]).find(c => c.nome === m.descricao);
            if (catItem) interv = catItem.periodicidade_padrao;
        }
        // 3) fallback: km_proxima - km_na_manutencao
        if (!interv && m.km_proxima_manutencao && m.km_na_manutencao) {
            interv = m.km_proxima_manutencao - m.km_na_manutencao;
        }

        window._mnModalServicos.push({
            id: m.id,
            cat_id: '',
            servico_id: m.servico_catalogo_id,
            nome: m.descricao,
            km: m.km_na_manutencao || '',
            intervalo: interv || ''
        });
        window.mnModalRenderServicos();
    }
};

window.mnModalVeiculoChanged = function() {
    const vid = document.getElementById('mn-m-veiculo').value;
    const v = (window._manutFrota||[]).find(x => x.id == vid);
    if (v && v.km_atual) {
        document.getElementById('mn-m-km').value = v.km_atual;
    } else {
        document.getElementById('mn-m-km').value = '';
    }
};

// Auto-muda status para 'agendada' ao preencher data de agendamento
window.mnModalDataAgChanged = function(input) {
    const statusSel = document.getElementById('mn-m-status');
    if (!statusSel || statusSel.tagName !== 'SELECT') return; // só age se for select visível
    if (input.value) {
        // Muda para agendada (exceto se já está em andamento ou cancelada)
        if (statusSel.value !== 'em_andamento' && statusSel.value !== 'cancelada') {
            statusSel.value = 'agendada';
        }
    } else {
        // Se apagou a data, volta para programada
        if (statusSel.value === 'agendada') {
            statusSel.value = 'programada';
        }
    }
};


window.mnModalCatChanged = function() {
    const cid = document.getElementById('mn-m-cat').value;
    const sBox = document.getElementById('mn-m-serv-checkboxes');
    const cCont = document.getElementById('mn-m-serv-container');
    const nBox = document.getElementById('mn-m-serv-novo-box');
    nBox.style.display = 'none';
    sBox.innerHTML = '';
    if (!cid) {
        cCont.style.display = 'none';
        return;
    }
    cCont.style.display = 'flex';
    const catItens = (window._manutCatalogo||[]).filter(s => s.categoria_id == cid);
    
    // Checkbox to select all
    const htmlAll = `<label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;font-weight:700;color:#0284c7;cursor:pointer;padding-bottom:6px;border-bottom:1px solid #e2e8f0;">
        <input type="checkbox" onchange="const cbs=document.querySelectorAll('.mn-serv-cb'); cbs.forEach(c=>{c.checked=this.checked; window.mnModalServCbChanged();})"> Selecionar Todos
    </label>
    <label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;color:#d97706;cursor:pointer;margin-top:6px;margin-bottom:6px;font-weight:600;">
        <input type="checkbox" class="mn-serv-cb" value="novo" data-nome="novo" onchange="window.mnModalServCbChanged()"> + Novo Serviço...
    </label>`;
    
    let htmlCbs = catItens.map(s => `
        <label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;color:#1e293b;cursor:pointer;">
            <input type="checkbox" class="mn-serv-cb" value="${s.id}" data-nome="${s.nome}" data-interval="${s.periodicidade_padrao}" onchange="window.mnModalServCbChanged()"> ${s.nome}
        </label>
    `).join('');
        
    sBox.innerHTML = htmlAll + htmlCbs;
    document.getElementById('mn-m-intervalo').value = '';
};

window.mnModalServCbChanged = function() {
    const cbs = document.querySelectorAll('.mn-serv-cb:checked');
    const nBox = document.getElementById('mn-m-serv-novo-box');
    let isNovo = false;
    cbs.forEach(cb => { if (cb.value === 'novo') isNovo = true; });
    nBox.style.display = isNovo ? 'block' : 'none';
};

window.mnModalAddServico = function() {
    const cSel = document.getElementById('mn-m-cat');
    const cbs = document.querySelectorAll('.mn-serv-cb:checked');
    const nInp = document.getElementById('mn-m-serv-novo');
    const kmInp = document.getElementById('mn-m-km');
    const intInp = document.getElementById('mn-m-intervalo');

    if (!cSel.value) return alert('Selecione uma categoria');
    if (cbs.length === 0) return alert('Selecione ao menos um serviço');
    
    let hasNovo = false;
    cbs.forEach(cb => {
        let nome = cb.dataset.nome;
        let servId = cb.value;
        
        if (servId === 'novo') {
            if (!nInp.value.trim()) { hasNovo = true; return; }
            nome = nInp.value.trim();
            servId = '';
        }

        // Intervalo: usa o campo preenchido pelo usuário; se vazio, usa o padrão do catálogo
        const intValAtual = intInp ? intInp.value.trim() : '';
        const intervaloFinal = intValAtual || (cb.dataset.interval && cb.dataset.interval !== 'undefined' ? cb.dataset.interval : '');
        window._mnModalServicos.push({
            cat_id: cSel.value,
            servico_id: servId,
            nome: nome,
            km: '',
            intervalo: intervaloFinal
        });
    });
    
    if (hasNovo) return alert('Digite o nome do novo serviço');

    document.querySelectorAll('.mn-serv-cb').forEach(c => c.checked = false);
    nInp.value = '';
    document.getElementById('mn-m-serv-novo-box').style.display = 'none';
    window.mnModalRenderServicos();
};

window.mnModalRemoveServico = function(idx) {
    window._mnModalServicos.splice(idx, 1);
    window.mnModalRenderServicos();
};

window.mnAplicarIntervaloTodos = function() {
    const intInp = document.getElementById('mn-m-intervalo');
    const val = intInp?.value?.trim();
    if (!val) return alert('Digite o KM de intervalo antes de aplicar.');
    if (!window._mnModalServicos.length) return alert('Adicione serviços à lista primeiro.');
    window._mnModalServicos.forEach(s => { s.intervalo = val; });
    window.mnModalRenderServicos();
    if (typeof showToast === 'function') showToast(`Intervalo de ${Number(val).toLocaleString('pt-BR')} km aplicado a todos os ${window._mnModalServicos.length} serviços.`, 'success');
};

window.mnModalEditarIntervaloServico = function(idx) {

    const serv = window._mnModalServicos[idx];
    const n = prompt(`Novo intervalo para ${serv.nome}:`, serv.intervalo || '');
    if (n !== null) {
        serv.intervalo = n;
        window.mnModalRenderServicos();
    }
};

window.mnModalRenderServicos = function() {
    const list = document.getElementById('mn-m-servicos-lista');
    if (!list) return;
    // Group by category name
    const cats = {};
    window._mnModalServicos.forEach((s, i) => {
        const catNome = (window._manutCategorias||[]).find(c => c.id == s.cat_id)?.nome || 'Serviços';
        if (!cats[catNome]) cats[catNome] = [];
        cats[catNome].push({...s, _idx: i});
    });
    list.innerHTML = Object.entries(cats).map(([catNome, itens]) => {
        const uid = 'mn-cat-acc-' + catNome.replace(/\W/g,'');
        const rows = itens.map(s => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:0.4rem 0.6rem;background:#f8fafc;border-radius:6px;margin-bottom:4px;">
                <span style="font-size:0.83rem;color:#1e293b;">${s.nome}${s.intervalo ? `<span style="color:#94a3b8;margin-left:8px;font-size:0.75rem;">Int: ${s.intervalo} km</span>` : ''}</span>
                <div style="display:flex;gap:8px;">
                    <button onclick="window.mnModalEditarIntervaloServico(${s._idx})" style="background:none;border:none;color:#0284c7;cursor:pointer;padding:0;" title="Editar Intervalo"><i class="ph ph-pencil-simple"></i></button>
                    <button onclick="window.mnModalRemoveServico(${s._idx})" style="background:none;border:none;color:#dc2626;cursor:pointer;padding:0;" title="Remover"><i class="ph ph-trash"></i></button>
                </div>
            </div>
        `).join('');
        return `<div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
            <button onclick="const d=document.getElementById('${uid}'); d.style.display=d.style.display==='none'?'block':'none'; this.querySelector('i').className='ph ph-'+(d.style.display==='none'?'caret-right':'caret-down')" style="width:100%;background:#f1f5f9;border:none;padding:0.6rem 0.8rem;display:flex;justify-content:space-between;align-items:center;font-weight:700;font-size:0.85rem;color:#1e293b;cursor:pointer;">
                <span><i class="ph ph-folder" style="color:#d97706;margin-right:6px;"></i>${catNome} <span style="font-weight:400;color:#64748b;">(${itens.length})</span></span>
                <i class="ph ph-caret-down"></i>
            </button>
            <div id="${uid}" style="display:block;padding:0.5rem;">${rows}</div>
        </div>`;
    }).join('');
};

window.salvarManutencao = async function(idEdit) {
    const tok = window._manutTok;
    const g = sel => { const el = document.getElementById(sel); return el ? el.value.trim() : ''; };
    const vid = g('mn-m-veiculo');
    if (!vid) return alert('Selecione o veículo');
    
    if (window._mnModalServicos.length === 0) {
        const sSel = document.getElementById('mn-m-serv');
        if (sSel && sSel.value) window.mnModalAddServico();
        if (window._mnModalServicos.length === 0) return alert('Adicione pelo menos um serviço à lista');
    }

    const dataAg = g('mn-m-data-ag') || null;
    let statusFinal = g('mn-m-status') || 'programada';
    // Se tem data de agendamento, força status agendada (exceto se já está concluída/em_andamento/cancelada)
    if (dataAg && (statusFinal === 'programada' || statusFinal === 'concluida')) {
        statusFinal = 'agendada';
    }

    const basePayload = {
        veiculo_id: vid,
        tipo: g('mn-m-tipo'),
        status: statusFinal,
        data_agendamento: dataAg,
        fornecedor: g('mn-m-forn'),
        observacoes: g('mn-m-obs')
    };

    try {
        document.getElementById('modal-manut-ov').style.opacity = '0.5';
        document.getElementById('modal-manut-ov').style.pointerEvents = 'none';

        for (let s of window._mnModalServicos) {
            let sId = s.servico_id;
            if (!sId && s.cat_id) {
                const resCat = await fetch('/api/frota/catalogo', {
                    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
                    body: JSON.stringify({ categoria_id: s.cat_id, nome: s.nome, periodicidade_padrao: s.intervalo||null })
                });
                if (resCat.ok) {
                    const dataCat = await resCat.json();
                    sId = dataCat.id;
                    window._manutCatalogo = null;
                }
            }

            // Pega KM atual do campo (preenchido ao selecionar veículo)
            const kmAtualCampo = document.getElementById('mn-m-km')?.value;
            const kmManut = (s.km || kmAtualCampo) ? parseInt(s.km || kmAtualCampo) : null;
            const interv = s.intervalo ? parseInt(s.intervalo) : null;
            const kmProx = (kmManut && interv) ? (kmManut + interv) : null;

            const payload = {
                ...basePayload,
                descricao: s.nome,
                servico_catalogo_id: sId || null,
                km_na_manutencao: kmManut,
                km_proxima_manutencao: kmProx
            };

            const url = idEdit ? '/api/frota/manutencoes/' + idEdit : '/api/frota/manutencoes';
            const method = idEdit ? 'PUT' : 'POST';
            
            const res = await fetch(url, {
                method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Erro ao salvar ' + s.nome);
        }

        document.getElementById('modal-manut-ov')?.remove();
        
        const [manut, frota] = await Promise.all([
            fetch('/api/frota/manutencoes', { headers: { Authorization: 'Bearer ' + tok } }).then(r => r.json()),
            fetch('/api/frota/veiculos', { headers: { Authorization: 'Bearer ' + tok } }).then(r => r.json())
        ]);
        window._manutDados = manut || [];
        window._manutFrota = frota || [];
        window._frotaDados = frota || [];
        
        if (window._mnSubAba === 'corretiva') {
            const sub = document.getElementById('mn-sub-conteudo');
            if (sub) mnRenderCorretivaTela(sub);
        } else {
            // Re-renderiza a aba preventiva COMPLETA (incluindo dropdown de veículos)
            const sub = document.getElementById('mn-sub-conteudo');
            if (sub) {
                mnRenderPreventivaTela(sub);
                // Seleciona automaticamente o veículo recém-salvo
                const sel = document.getElementById('mn-prev-veiculo');
                if (sel && vid) {
                    sel.value = vid;
                    window.mnCarregarPreventivoVeiculo();
                }
            }
        }
    } catch(e) { 
        alert('Erro: ' + e.message); 
        const ov = document.getElementById('modal-manut-ov');
        if (ov) { ov.style.opacity='1'; ov.style.pointerEvents='auto'; }
    }
};

window.excluirManutencao = async function(id) {
    if (!confirm('Excluir esta manutenção?')) return;
    const tok = window._manutTok;
    await fetch('/api/frota/manutencoes/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + tok } });
    // Recarrega lista geral
    const manut = await fetch('/api/frota/manutencoes', { headers: { Authorization: 'Bearer ' + tok } }).then(r => r.json());
    window._manutDados = manut || [];
    mnRenderLista();
    // Se a aba preventiva estiver aberta, recarrega também
    if (typeof window.mnCarregarPreventivoVeiculo === 'function') {
        window.mnCarregarPreventivoVeiculo();
    }
};

window.mnExcluirSelecionados = async function() {
    const cbs = document.querySelectorAll('.mn-prev-cb:checked');
    if (!cbs.length) return;
    const ids = Array.from(cbs).map(cb => cb.dataset.id);
    const nomes = Array.from(cbs).map(cb => `• ${cb.dataset.nome}`).join('<br>');

    const { isConfirmed } = await Swal.fire({
        title: `Excluir ${ids.length} manutenção(ões)?`,
        html: `<div style="text-align:left;font-size:0.85rem;max-height:200px;overflow-y:auto;">${nomes}</div>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: `<i class="ph ph-trash"></i> Excluir todas`,
        cancelButtonText: 'Cancelar',
    });
    if (!isConfirmed) return;

    const tok = window._manutTok;
    await Promise.all(ids.map(id =>
        fetch('/api/frota/manutencoes/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + tok } })
    ));

    const manut = await fetch('/api/frota/manutencoes', { headers: { Authorization: 'Bearer ' + tok } }).then(r => r.json());
    window._manutDados = manut || [];
    mnRenderLista();
    if (typeof window.mnCarregarPreventivoVeiculo === 'function') {
        window.mnCarregarPreventivoVeiculo();
    }
    if (typeof showToast === 'function') showToast(`${ids.length} manutenção(ões) excluída(s).`, 'success');
};

window.mnPrevToggleCat = function(cb, catId) {
    document.querySelectorAll('.mn-prev-cb-cat-'+catId).forEach(c => c.checked = cb.checked);
    window.mnPrevCbChanged();
};

window.mnPrevCbChanged = function() {
    const cbs = document.querySelectorAll('.mn-prev-cb:checked');
    const bar = document.getElementById('mn-prev-mass-actions');
    const cnt = document.getElementById('mn-prev-sel-count');
    if(!bar) return;
    if(cbs.length > 0) {
        bar.style.display = 'flex';
        cnt.textContent = cbs.length;
    } else {
        bar.style.display = 'none';
    }
};

// Agendar individualmente (botão roxo por linha)
window.mnAgendarIndividual = function(itemId, nome) {
    const vid = document.getElementById('mn-prev-veiculo')?.value;
    if (!vid) return alert('Selecione um veículo primeiro');
    // Desmarca todos e marca apenas este
    document.querySelectorAll('.mn-prev-cb').forEach(c => c.checked = false);
    const cb = document.querySelector(`.mn-prev-cb[data-id="${itemId}"]`);
    if (cb) { cb.checked = true; window.mnPrevCbChanged(); }
    window.mnAgendarSelecionados();
};

// Popup rápido: editar apenas KM Intervalo e Observação
window.mnEditarRapido = function(id, nome, intervaloAtual, obsAtual, kmUltima) {
    let ov = document.getElementById('mn-editar-rapido-ov');
    if (ov) ov.remove();

    ov = document.createElement('div');
    ov.id = 'mn-editar-rapido-ov';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.65);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;';

    ov.innerHTML = `
    <div style="background:#fff;border-radius:14px;width:100%;max-width:420px;box-shadow:0 20px 50px rgba(0,0,0,0.25);overflow:hidden;">
        <div style="background:#1e293b;padding:1rem 1.25rem;display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:8px;">
                <i class="ph ph-pencil-simple" style="color:#f59e0b;font-size:1.1rem;"></i>
                <span style="color:#fff;font-weight:700;font-size:0.95rem;">Editar Manutenção</span>
            </div>
            <button onclick="document.getElementById('mn-editar-rapido-ov').remove()" style="background:none;border:none;color:#94a3b8;font-size:1.3rem;cursor:pointer;line-height:1;"><i class="ph ph-x"></i></button>
        </div>
        <div style="padding:1.25rem;display:flex;flex-direction:column;gap:0.5rem;">
            <p style="margin:0 0 0.75rem;font-size:0.83rem;color:#64748b;background:#f1f5f9;padding:0.5rem 0.75rem;border-radius:8px;">
                <i class="ph ph-wrench" style="color:#0284c7;"></i> <strong style="color:#1e293b;">${nome}</strong>
            </p>
            <label style="font-size:0.83rem;font-weight:600;color:#475569;">KM Intervalo</label>
            <input id="mn-er-intervalo" type="number" value="${intervaloAtual||''}" placeholder="Ex: 10000"
                style="padding:0.6rem 0.75rem;border:1.5px solid #cbd5e1;border-radius:8px;font-size:0.9rem;outline:none;width:100%;box-sizing:border-box;"
                onfocus="this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#cbd5e1'">
            <label style="font-size:0.83rem;font-weight:600;color:#475569;margin-top:0.5rem;">Observações</label>
            <textarea id="mn-er-obs" placeholder="Observações adicionais..." rows="3"
                style="padding:0.6rem 0.75rem;border:1.5px solid #cbd5e1;border-radius:8px;font-size:0.9rem;outline:none;width:100%;box-sizing:border-box;resize:vertical;"
                onfocus="this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#cbd5e1'">${obsAtual||''}</textarea>
        </div>
        <div style="padding:0.9rem 1.25rem;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:0.75rem;background:#f8fafc;">
            <button onclick="document.getElementById('mn-editar-rapido-ov').remove()"
                style="background:#fff;border:1px solid #cbd5e1;color:#475569;padding:0.5rem 1.1rem;border-radius:8px;font-weight:600;cursor:pointer;font-size:0.85rem;">Cancelar</button>
            <button id="mn-er-salvar-btn"
                style="background:#2563eb;color:#fff;border:none;padding:0.5rem 1.4rem;border-radius:8px;font-weight:700;cursor:pointer;font-size:0.85rem;display:flex;align-items:center;gap:6px;">
                <i class="ph ph-floppy-disk"></i> Salvar
            </button>
        </div>
    </div>`;

    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });

    document.getElementById('mn-er-salvar-btn').onclick = async () => {
        const intervalo = document.getElementById('mn-er-intervalo').value.trim();
        const obs = document.getElementById('mn-er-obs').value.trim();
        const btn = document.getElementById('mn-er-salvar-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-circle-notch ph-spin"></i> Salvando...';

        try {
            // Busca os dados atuais do registro para não perder outros campos
            const tok = window._manutTok;
            const res = await fetch(`/api/frota/manutencoes/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
                body: JSON.stringify({
                    observacoes: obs || null,
                    _apenas_intervalo_obs: true,
                    intervalo_km: intervalo ? parseInt(intervalo) : null,
                    km_ultima: kmUltima != null ? parseInt(kmUltima) : null
                })
            });
            if (res.ok) {
                ov.remove();
                window.mnCarregarPreventivoVeiculo();
            } else {
                const err = await res.json().catch(() => ({}));
                alert('Erro ao salvar: ' + (err.error || res.status));
                btn.disabled = false;
                btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar';
            }
        } catch(e) {
            alert('Erro de conexão: ' + e.message);
            btn.disabled = false;
            btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar';
        }
    };
};


window.mnEditarIntervaloObsSelecionados = function() {
    const cbs = document.querySelectorAll('.mn-prev-cb:checked');
    if(!cbs.length) return;
    const vid = document.getElementById('mn-prev-veiculo')?.value;
    if(!vid) return alert('Selecione o veículo');

    const servsIds = Array.from(cbs).map(cb => cb.dataset.id);

    let ov = document.getElementById('modal-mass-edit-obs'); if (ov) ov.remove();
    ov = document.createElement('div'); ov.id = 'modal-mass-edit-obs';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.75);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;';
    
    ov.innerHTML = `<div style="background:#fff;border-radius:12px;width:100%;max-width:500px;display:flex;flex-direction:column;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);overflow:hidden;">
        <div style="padding:1rem 1.5rem;border-bottom:1px solid #e2e8f0;background:#f8fafc;display:flex;justify-content:space-between;align-items:center;">
            <div style="font-size:1rem;font-weight:700;color:#1e293b;display:flex;align-items:center;gap:8px;"><i class="ph ph-pencil-simple" style="color:#0284c7;"></i> Editar ${cbs.length} Serviço(s)</div>
            <button onclick="document.getElementById('modal-mass-edit-obs').remove()" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:#94a3b8;"><i class="ph ph-x"></i></button>
        </div>
        <div style="padding:1.5rem;display:flex;flex-direction:column;gap:1rem;">
            <div style="background:#e0f2fe;color:#0369a1;padding:0.75rem;border-radius:8px;font-size:0.85rem;display:flex;gap:8px;">
                <i class="ph ph-info" style="font-size:1.2rem;"></i>
                <span>Preencha apenas o que deseja alterar para todos os serviços selecionados. O que deixar em branco não será alterado.</span>
            </div>
            <div>
                <label style="font-size:0.85rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">KM de intervalo para a próxima</label>
                <input id="me-obs-intervalo" type="number" placeholder="Ex: 10000" style="width:100%;padding:0.6rem;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;font-size:0.9rem;outline:none;">
            </div>
            <div>
                <label style="font-size:0.85rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Observações</label>
                <textarea id="me-obs-texto" placeholder="Observações..." style="width:100%;padding:0.6rem;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;font-size:0.9rem;outline:none;min-height:100px;resize:vertical;"></textarea>
            </div>
        </div>
        <div style="padding:1rem 1.5rem;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:1rem;background:#f8fafc;">
            <button onclick="document.getElementById('modal-mass-edit-obs').remove()" style="background:#fff;border:1px solid #cbd5e1;color:#475569;padding:0.5rem 1rem;border-radius:6px;font-weight:600;cursor:pointer;">Cancelar</button>
            <button id="btn-me-obs-salvar" style="background:#0284c7;color:#fff;border:none;padding:0.5rem 1.2rem;border-radius:6px;font-weight:600;cursor:pointer;">Salvar Alterações</button>
        </div>
    </div>`;
    document.body.appendChild(ov);

    document.getElementById('btn-me-obs-salvar').onclick = async () => {
        const intv = document.getElementById('me-obs-intervalo').value;
        const obs = document.getElementById('me-obs-texto').value;
        
        if (!intv && !obs) {
            alert('Preencha ao menos um dos campos para alterar.');
            return;
        }

        try {
            document.getElementById('btn-me-obs-salvar').textContent = 'Salvando...';
            document.getElementById('btn-me-obs-salvar').disabled = true;
            
            const res = await fetch('/api/frota/manutencoes/em-massa-intervalo-obs', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + window._manutTok },
                body: JSON.stringify({ veiculo_id: vid, servicos_ids: servsIds, intervalo: intv, observacoes: obs })
            });

            if (res.ok) {
                ov.remove();
                alert('Serviços atualizados com sucesso!');
                window.mnCarregarPreventivoVeiculo();
            } else {
                const err = await res.json();
                alert('Erro: ' + (err.error || 'Desconhecido'));
                document.getElementById('btn-me-obs-salvar').textContent = 'Salvar Alterações';
                document.getElementById('btn-me-obs-salvar').disabled = false;
            }
        } catch (e) {
            alert('Erro de conexão');
            document.getElementById('btn-me-obs-salvar').textContent = 'Salvar Alterações';
            document.getElementById('btn-me-obs-salvar').disabled = false;
        }
    };
};


window.mnExcluirServicoModal = async function(id, idx) {
    const s = prompt('Digite a senha para confirmar a exclusão:');
    if (s !== 'EXu2499!') {
        if (s !== null) alert('Senha incorreta!');
        return;
    }
    
    if (!confirm('Tem certeza que deseja excluir este serviço do Catálogo Geral? Isso afetará todos os veículos.')) return;
    
    try {
        const res = await fetch('/api/frota/catalogo/' + id, {
            method: 'DELETE',
            headers: { Authorization: 'Bearer ' + window._manutTok }
        });
        if (res.ok) {
            const tr = document.querySelector(`tr[data-idx="${idx}"]`);
            if (tr) tr.remove();
            alert('Serviço excluído do catálogo.');
        } else {
            const err = await res.json();
            alert('Erro ao excluir: ' + (err.error || 'Desconhecido'));
        }
    } catch (e) {
        alert('Erro de conexão ao excluir.');
    }
};


window.mnAgendarSelecionados = function() {
    const cbs = document.querySelectorAll('.mn-prev-cb:checked');
    if (!cbs.length) return;
    const vid = document.getElementById('mn-prev-veiculo')?.value;
    if (!vid) return alert('Selecione o veículo');
    const servsIds = Array.from(cbs).map(cb => cb.dataset.id);
    const nomes = Array.from(cbs).map(cb => cb.dataset.nome).join(', ');
    const veiculo = (window._manutFrota || []).find(x => x.id == vid);
    const placa = veiculo?.placa || 'Veículo';

    let ov = document.getElementById('modal-agendar-sel'); if (ov) ov.remove();
    ov = document.createElement('div'); ov.id = 'modal-agendar-sel';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.75);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;';

    const hoje = new Date().toISOString().slice(0, 10);

    ov.innerHTML = `<div style="background:#fff;border-radius:12px;width:100%;max-width:520px;display:flex;flex-direction:column;box-shadow:0 20px 40px rgba(0,0,0,0.2);overflow:hidden;">
        <div style="padding:1rem 1.5rem;border-bottom:1px solid #e2e8f0;background:#f5f3ff;display:flex;justify-content:space-between;align-items:center;">
            <div style="font-size:1rem;font-weight:700;color:#5b21b6;display:flex;align-items:center;gap:8px;"><i class="ph ph-calendar-plus" style="color:#7c3aed;"></i> Agendar ${cbs.length} Serviço(s)</div>
            <button onclick="document.getElementById('modal-agendar-sel').remove()" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:#94a3b8;"><i class="ph ph-x"></i></button>
        </div>
        <div style="padding:1.5rem;display:flex;flex-direction:column;gap:1rem;">
            <div style="background:#f5f3ff;color:#5b21b6;padding:0.75rem;border-radius:8px;font-size:0.82rem;">
                <div style="margin-bottom:6px;"><i class="ph ph-car-profile"></i> Placa: <strong>${placa}</strong></div>
                <div><i class="ph ph-info"></i> <strong>Serviços:</strong> ${nomes}</div>
            </div>
            <div style="background:#e0f2fe;color:#0369a1;padding:0.65rem;border-radius:8px;font-size:0.82rem;">
                <i class="ph ph-lightbulb"></i> A KM será contabilizada apenas no dia da finalização da manutenção, não no agendamento.
            </div>
            <div>
                <label style="font-size:0.85rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Fornecedor / Oficina</label>
                <input id="ag-sel-fornecedor" type="text" placeholder="Nome da oficina ou fornecedor..." style="width:100%;padding:0.6rem;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;font-size:0.9rem;outline:none;">
            </div>
            <div>
                <label style="font-size:0.85rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Data do Agendamento</label>
                <input id="ag-sel-data" type="date" value="${hoje}" style="width:100%;padding:0.6rem;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;font-size:0.9rem;outline:none;">
            </div>
            <div>
                <label style="font-size:0.85rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Observações</label>
                <textarea id="ag-sel-obs" placeholder="Observações do agendamento..." style="width:100%;padding:0.6rem;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;font-size:0.9rem;outline:none;min-height:80px;resize:vertical;"></textarea>
            </div>
        </div>
        <div style="padding:1rem 1.5rem;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:1rem;background:#f8fafc;">
            <button onclick="document.getElementById('modal-agendar-sel').remove()" style="background:#fff;border:1px solid #cbd5e1;color:#475569;padding:0.5rem 1rem;border-radius:6px;font-weight:600;cursor:pointer;">Cancelar</button>
            <button id="btn-ag-sel-salvar" style="background:#7c3aed;color:#fff;border:none;padding:0.5rem 1.5rem;border-radius:6px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;"><i class="ph ph-calendar-plus"></i> Agendar</button>
        </div>
    </div>`;
    document.body.appendChild(ov);

    document.getElementById('btn-ag-sel-salvar').onclick = async () => {
        const fornecedor = document.getElementById('ag-sel-fornecedor').value.trim();
        const dataAg = document.getElementById('ag-sel-data').value;
        const obs = document.getElementById('ag-sel-obs').value.trim();
        const btn = document.getElementById('btn-ag-sel-salvar');
        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-circle-notch ph-spin"></i> Agendando...';
        try {
            const res = await fetch('/api/frota/manutencoes/agendar-selecionados', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + window._manutTok },
                body: JSON.stringify({ veiculo_id: vid, servicos_ids: servsIds, fornecedor, data_agendamento: dataAg, observacoes: obs })
            });
            const data = res.ok ? await res.json() : null;
            const errData = !res.ok ? await res.text() : null;
            if (res.ok) {
                ov.remove();
                // Esconder barra ANTES de recarregar (elemento ainda existe)
                const bar = document.getElementById('mn-prev-mass-actions');
                if (bar) bar.style.display = 'none';
                alert(`✅ ${cbs.length} manutenção(oes) agendada(s) com sucesso!`);
                window.mnCarregarPreventivoVeiculo();
            } else {
                let errMsg = 'Erro desconhecido';
                try { errMsg = JSON.parse(errData).error || errData; } catch(ex) { errMsg = errData || 'Erro ' + res.status; }
                alert('Erro ao agendar: ' + errMsg);
                btn.disabled = false;
                btn.innerHTML = '<i class="ph ph-calendar-plus"></i> Agendar';
            }
        } catch(e) {
            alert('Erro de conexão: ' + e.message);
            btn.disabled = false;
            btn.innerHTML = '<i class="ph ph-calendar-plus"></i> Agendar';
        }
    };
};

window.mnFinalizarAgendado = function() {
    const cbs = document.querySelectorAll('.mn-prev-cb:checked');
    if (!cbs.length) return;
    const vid = document.getElementById('mn-prev-veiculo')?.value;
    if (!vid) return alert('Selecione o veículo');
    const servsIds = Array.from(cbs).map(cb => cb.dataset.id);
    const nomes = Array.from(cbs).map(cb => cb.dataset.nome).join(', ');
    const veiculo = (window._manutFrota || []).find(x => x.id == vid);

    const placa = veiculo?.placa || 'Veículo';
    const kmAtual = veiculo?.km_atual || 0;

    let ov = document.getElementById('modal-finalizar-ag'); if (ov) ov.remove();
    ov = document.createElement('div'); ov.id = 'modal-finalizar-ag';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.75);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;';

    const hoje = new Date().toISOString().slice(0, 10);
    window._mnConcluirVid = vid;

    ov.innerHTML = `<div style="background:#fff;border-radius:16px;width:100%;max-width:480px;display:flex;flex-direction:column;box-shadow:0 25px 50px rgba(0,0,0,0.3);overflow:hidden;">
        <div style="padding:1rem 1.5rem;border-bottom:1px solid #e2e8f0;background:#f0fdf4;display:flex;justify-content:space-between;align-items:center;">
            <div style="font-size:1rem;font-weight:700;color:#166534;display:flex;align-items:center;gap:8px;">
                <i class="ph ph-check-circle" style="color:#16a34a;font-size:1.3rem;"></i>
                Registrar ${cbs.length} Serviço(s)
            </div>
            <button onclick="document.getElementById('modal-finalizar-ag').remove()" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:#94a3b8;"><i class="ph ph-x"></i></button>
        </div>
        <div style="padding:1.5rem;display:flex;flex-direction:column;gap:1rem;">
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:0.75rem;font-size:0.83rem;color:#166534;">
                <div style="margin-bottom:6px;"><i class="ph ph-car-profile"></i> Placa: <strong>${placa}</strong></div>
                <div><i class="ph ph-list-checks"></i> <strong>${nomes}</strong></div>
            </div>
            <div>
                <label style="font-size:0.82rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Data da Manutenção *</label>
                <input id="ci-data" type="date" value="${hoje}"
                    oninput="window.mnConcluirBuscarKmData(this.value)"
                    style="width:100%;padding:0.6rem;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;font-size:0.9rem;outline:none;">
                <span id="ci-km-hint" style="font-size:0.75rem;color:#64748b;margin-top:4px;display:block;">KM atual do veículo: <strong>${Number(kmAtual).toLocaleString('pt-BR')} km</strong></span>
            </div>
            <div>
                <label style="font-size:0.82rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">KM na Manutenção</label>
                <div style="display:flex;gap:6px;align-items:center;">
                    <input id="ci-km" type="number" value="${kmAtual||''}" min="0" placeholder="Ex: 85000"
                        style="flex:1;padding:0.6rem;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;font-size:0.9rem;outline:none;">
                    <span style="font-size:0.8rem;color:#64748b;white-space:nowrap;">km</span>
                </div>
                <span style="font-size:0.72rem;color:#94a3b8;margin-top:3px;display:block;">Preenchido automaticamente — edite se necessário</span>
            </div>
            <div>
                <label style="font-size:0.82rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Observações</label>
                <textarea id="ci-obs" placeholder="Observações sobre a manutenção realizada..." style="width:100%;padding:0.6rem;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;font-size:0.9rem;outline:none;min-height:70px;resize:vertical;"></textarea>
            </div>
        </div>
        <div style="padding:1rem 1.5rem;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:1rem;background:#f8fafc;">
            <button onclick="document.getElementById('modal-finalizar-ag').remove()" style="background:#fff;border:1px solid #cbd5e1;color:#475569;padding:0.5rem 1rem;border-radius:6px;font-weight:600;cursor:pointer;">Cancelar</button>
            <button id="btn-fin-ag-salvar" style="background:#16a34a;color:#fff;border:none;padding:0.5rem 1.5rem;border-radius:6px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;">
                <i class="ph ph-check-circle"></i> Confirmar Realizada
            </button>
        </div>
    </div>`;
    document.body.appendChild(ov);

    document.getElementById('btn-fin-ag-salvar').onclick = async () => {
        const dataConc = document.getElementById('ci-data').value;
        const kmVal    = parseInt(document.getElementById('ci-km').value) || null;
        const obs      = document.getElementById('ci-obs').value.trim();
        if (!dataConc) return alert('Informe a data de finalização');
        const btn = document.getElementById('btn-fin-ag-salvar');
        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-circle-notch ph-spin"></i> Salvando...';
        try {
            const res = await fetch('/api/frota/manutencoes/finalizar-agendado', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + window._manutTok },
                body: JSON.stringify({ veiculo_id: vid, servicos_ids: servsIds, data_conclusao: dataConc, observacoes: obs, km_realizado: kmVal })
            });
            const errData = !res.ok ? await res.text() : null;
            if (res.ok) {
                ov.remove();
                // Esconder barra ANTES de recarregar (elemento ainda existe)
                const bar = document.getElementById('mn-prev-mass-actions');
                if (bar) bar.style.display = 'none';
                // Desmarcar todos os checkboxes
                document.querySelectorAll('.mn-prev-cb').forEach(c => c.checked = false);
                alert(`✅ ${cbs.length} manutenção(oes) finalizada(s) com sucesso!`);
                window.mnCarregarPreventivoVeiculo();
            } else {
                let errMsg = 'Erro desconhecido';
                try { errMsg = JSON.parse(errData).error || errData; } catch(ex) { errMsg = errData || 'Erro ' + res.status; }
                alert('Erro ao finalizar: ' + errMsg);
                btn.disabled = false;
                btn.innerHTML = '<i class="ph ph-check-circle"></i> Finalizar';
            }
        } catch(e) {
            alert('Erro de conexão: ' + e.message);
            btn.disabled = false;
            btn.innerHTML = '<i class="ph ph-check-circle"></i> Finalizar';
        }

    };
};

// ──────────────────────────────────────────────────────────────
//  BOTÃO VERDE: REGISTRAR MANUTENÇÃO REALIZADA (individual)
// ──────────────────────────────────────────────────────────────
window.mnConcluirIndividual = async function(itemId, nome) {
    const vid = document.getElementById('mn-prev-veiculo')?.value;
    if (!vid) return alert('Selecione um veículo primeiro');
    const veiculo = (window._manutFrota || []).find(x => x.id == vid);
    const tok     = window._manutTok;
    const kmAtual = veiculo?.km_atual || 0;
    const placa   = veiculo?.placa || 'Veículo';
    const hoje    = new Date().toISOString().slice(0, 10);

    let ov = document.getElementById('modal-concluir-ind'); if (ov) ov.remove();
    ov = document.createElement('div'); ov.id = 'modal-concluir-ind';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.75);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;';
    ov.innerHTML = `
        <div style="background:#fff;border-radius:16px;width:100%;max-width:480px;display:flex;flex-direction:column;box-shadow:0 25px 50px rgba(0,0,0,0.3);overflow:hidden;">
            <div style="padding:1rem 1.5rem;border-bottom:1px solid #e2e8f0;background:#f0fdf4;display:flex;justify-content:space-between;align-items:center;">
                <div style="font-size:1rem;font-weight:700;color:#166534;display:flex;align-items:center;gap:8px;">
                    <i class="ph ph-check-circle" style="color:#16a34a;font-size:1.3rem;"></i>
                    Registrar Manutenção Realizada
                </div>
                <button onclick="document.getElementById('modal-concluir-ind').remove()" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:#94a3b8;"><i class="ph ph-x"></i></button>
            </div>
            <div style="padding:1.5rem;display:flex;flex-direction:column;gap:1rem;">
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:0.75rem;font-size:0.83rem;color:#166534;">
                    <div style="margin-bottom:6px;"><i class="ph ph-car-profile"></i> Placa: <strong>${placa}</strong></div>
                    <div><i class="ph ph-wrench"></i> <strong>${nome}</strong></div>
                </div>
                <!-- Toggle Realizada / Não Realizada -->
                <div style="display:flex;gap:8px;">
                    <button id="ci-btn-real" onclick="window._mnToggleConcluir('realizada')" style="flex:1;padding:0.55rem;border-radius:8px;border:2px solid #16a34a;background:#16a34a;color:#fff;font-weight:700;font-size:0.85rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;"><i class="ph ph-check-circle"></i> Realizada</button>
                    <button id="ci-btn-nreal" onclick="window._mnToggleConcluir('nao_realizada')" style="flex:1;padding:0.55rem;border-radius:8px;border:2px solid #94a3b8;background:#fff;color:#64748b;font-weight:700;font-size:0.85rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;"><i class="ph ph-x-circle"></i> Não Realizada</button>
                </div>
                <div id="ci-campos-realizacao">
                    <div style="margin-bottom:0.75rem;">
                        <label style="font-size:0.82rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Data da Manutenção *</label>
                        <input id="ci-data" type="date" value="${hoje}"
                            oninput="window.mnConcluirBuscarKmData(this.value)"
                            style="width:100%;padding:0.6rem;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;font-size:0.9rem;outline:none;">
                        <span id="ci-km-hint" style="font-size:0.75rem;color:#64748b;margin-top:4px;display:block;">KM atual do veículo: <strong>${Number(kmAtual).toLocaleString('pt-BR')} km</strong></span>
                    </div>
                    <div style="margin-bottom:0.75rem;">
                        <label style="font-size:0.82rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">KM na Manutenção</label>
                        <div style="display:flex;gap:6px;align-items:center;">
                            <input id="ci-km" type="number" value="${kmAtual||''}" min="0" placeholder="Ex: 85000"
                                style="flex:1;padding:0.6rem;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;font-size:0.9rem;outline:none;">
                            <span style="font-size:0.8rem;color:#64748b;white-space:nowrap;">km</span>
                        </div>
                        <span style="font-size:0.72rem;color:#94a3b8;margin-top:3px;display:block;">Preenchido automaticamente — edite se necessário</span>
                    </div>
                    <div>
                        <label style="font-size:0.82rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Observações</label>
                        <textarea id="ci-obs" placeholder="Observações sobre a manutenção realizada..." style="width:100%;padding:0.6rem;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;font-size:0.9rem;outline:none;min-height:60px;resize:vertical;"></textarea>
                    </div>
                </div>
                <div id="ci-msg-nreal" style="display:none;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:0.75rem;font-size:0.83rem;color:#991b1b;">
                    <i class="ph ph-info"></i> A manutenção será marcada como <strong>não realizada</strong>. A última data e KM registrados permanecerão inalterados.
                </div>
            </div>
            <div style="padding:1rem 1.5rem;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:1rem;background:#f8fafc;">
                <button onclick="document.getElementById('modal-concluir-ind').remove()" style="background:#fff;border:1px solid #cbd5e1;color:#475569;padding:0.5rem 1rem;border-radius:6px;font-weight:600;cursor:pointer;">Cancelar</button>
                <button id="btn-ci-salvar" style="background:#16a34a;color:#fff;border:none;padding:0.5rem 1.5rem;border-radius:6px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;">
                    <i class="ph ph-check-circle"></i> Confirmar Realizada
                </button>
            </div>
        </div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });

    window._mnConcluirVid    = vid;
    window._mnConcluirItemId = itemId;
    window._mnConcluirModo   = 'realizada';

    window._mnToggleConcluir = function(modo) {
        window._mnConcluirModo = modo;
        const bReal  = document.getElementById('ci-btn-real');
        const bNreal = document.getElementById('ci-btn-nreal');
        const campos = document.getElementById('ci-campos-realizacao');
        const msgNr  = document.getElementById('ci-msg-nreal');
        const btnSalvar = document.getElementById('btn-ci-salvar');
        if (modo === 'realizada') {
            bReal.style.cssText  = 'flex:1;padding:0.55rem;border-radius:8px;border:2px solid #16a34a;background:#16a34a;color:#fff;font-weight:700;font-size:0.85rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;';
            bNreal.style.cssText = 'flex:1;padding:0.55rem;border-radius:8px;border:2px solid #94a3b8;background:#fff;color:#64748b;font-weight:700;font-size:0.85rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;';
            campos.style.display = ''; msgNr.style.display = 'none';
            btnSalvar.style.background = '#16a34a'; btnSalvar.innerHTML = '<i class="ph ph-check-circle"></i> Confirmar Realizada';
        } else {
            bNreal.style.cssText = 'flex:1;padding:0.55rem;border-radius:8px;border:2px solid #dc2626;background:#dc2626;color:#fff;font-weight:700;font-size:0.85rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;';
            bReal.style.cssText  = 'flex:1;padding:0.55rem;border-radius:8px;border:2px solid #94a3b8;background:#fff;color:#64748b;font-weight:700;font-size:0.85rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;';
            campos.style.display = 'none'; msgNr.style.display = '';
            btnSalvar.style.background = '#dc2626'; btnSalvar.innerHTML = '<i class="ph ph-x-circle"></i> Confirmar Não Realizada';
        }
    };

    document.getElementById('btn-ci-salvar').onclick = async () => {
        const modo  = window._mnConcluirModo;
        const btn   = document.getElementById('btn-ci-salvar');
        btn.disabled = true; btn.innerHTML = '<i class="ph ph-circle-notch ph-spin"></i> Salvando...';
        try {
            let res;
            if (modo === 'realizada') {
                const dataConc = document.getElementById('ci-data').value;
                const kmVal    = parseInt(document.getElementById('ci-km').value) || null;
                const obs      = document.getElementById('ci-obs').value.trim();
                if (!dataConc) { btn.disabled=false; btn.innerHTML='<i class="ph ph-check-circle"></i> Confirmar Realizada'; return alert('Informe a data da manutenção'); }
                res = await fetch('/api/frota/manutencoes/finalizar-agendado', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
                    body: JSON.stringify({
                        veiculo_id: window._mnConcluirVid,
                        servicos_ids: [String(window._mnConcluirItemId)],
                        data_conclusao: dataConc,
                        observacoes: obs,
                        km_realizado: kmVal
                    })
                });
            } else {
                res = await fetch('/api/frota/manutencoes/' + window._mnConcluirItemId, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
                    body: JSON.stringify({ status: 'cancelada' })
                });
            }
            if (res.ok) {
                ov.remove();
                const bar = document.getElementById('mn-prev-mass-actions');
                if (bar) bar.style.display = 'none';
                window.mnCarregarPreventivoVeiculo();
                if (typeof window._mnRecarregarHistoricoManut === 'function') window._mnRecarregarHistoricoManut();
                const msg = modo === 'realizada' ? 'Manutenção registrada com sucesso!' : 'Marcada como não realizada.';
                if (typeof mostrarToastAviso === 'function') mostrarToastAviso(msg); else alert(msg);
            } else {
                const errData = await res.text();
                let errMsg = 'Erro desconhecido';
                try { errMsg = JSON.parse(errData).error || errData; } catch(ex) { errMsg = errData || 'Erro ' + res.status; }
                alert('Erro: ' + errMsg);
                btn.disabled = false;
                btn.innerHTML = '<i class="ph ph-check-circle"></i> Confirmar';
            }
        } catch(e) {
            alert('Erro de conexão: ' + e.message);
            btn.disabled = false;
            btn.innerHTML = '<i class="ph ph-check-circle"></i> Confirmar';
        }
    };
};


// Ao mudar a data: busca KM do veículo naquele dia via histórico
window.mnConcluirBuscarKmData = async function(data) {
    const vid = window._mnConcluirVid;
    if (!vid || !data) return;
    try {
        const tok = window._manutTok;
        const res = await fetch('/api/frota/veiculos/' + vid + '/km-em-data?data=' + data, {
            headers: { Authorization: 'Bearer ' + tok }
        });
        if (res.ok) {
            const json = await res.json();
            const km = json.km;
            const hint = document.getElementById('ci-km-hint');
            const inp  = document.getElementById('ci-km');
            if (km != null) {
                if (inp)  inp.value = km;
                const d = data.split('-').reverse().join('/');
                if (hint) hint.innerHTML = 'KM registrado em ' + d + ': <strong>' + Number(km).toLocaleString('pt-BR') + ' km</strong>';
            } else {
                if (hint) hint.innerHTML = '<span style="color:#d97706;">Sem registro de KM para esta data — usando KM atual</span>';
                const veiculo = (window._manutFrota || []).find(x => x.id == vid);
                if (inp && veiculo && veiculo.km_atual) inp.value = veiculo.km_atual;
            }
        }
    } catch(e) {}
};

// ══════════════════════════════════════════════════════════════
//  DRAWER DE HISTÓRICO DE MANUTENÇÕES REALIZADAS
// ══════════════════════════════════════════════════════════════
window._mnMontarDrawerHistoricoManut = function() {
    document.getElementById('mn-hist-wrapper')?.remove();

    const wrapper = document.createElement('div');
    wrapper.id = 'mn-hist-wrapper';
    wrapper.style.cssText = 'position:fixed;bottom:40px;left:60px;right:0;z-index:9400;display:flex;flex-direction:column;align-items:flex-start;pointer-events:none;';

    wrapper.innerHTML = `
        <div id="mn-hist-btn-row" style="padding:0 0 0 12px;pointer-events:all;">
            <button id="mn-hist-toggle-btn"
                style="display:flex;align-items:center;gap:6px;background:#f0fdf4;border:1.5px solid #bbf7d0;border-bottom:none;border-radius:8px 8px 0 0;padding:5px 16px;cursor:pointer;color:#166534;font-size:0.78rem;font-weight:700;box-shadow:0 -2px 8px rgba(0,0,0,0.06);transition:background 0.15s;white-space:nowrap;"
                onmouseenter="this.style.background='#dcfce7'" onmouseleave="this.style.background='#f0fdf4'"
                onclick="window._mnToggleHistoricoManut()">
                <i id="mn-hist-icon" class="ph ph-caret-up-bold" style="font-size:0.85rem;"></i>
                <i class="ph ph-clock-counter-clockwise" style="color:#16a34a;"></i>
                Histórico de Manutenções
                <span id="mn-hist-count" style="background:#dcfce7;color:#166534;border-radius:99px;padding:1px 8px;font-size:0.7rem;"></span>
            </button>
        </div>
        <div id="mn-hist-panel"
            style="width:100%;background:#fff;box-shadow:0 -4px 20px rgba(0,0,0,0.12);max-height:0;overflow:hidden;transition:max-height 0.35s cubic-bezier(.4,0,.2,1);order:-1;pointer-events:all;">
            <div style="display:flex;align-items:center;gap:6px;padding:6px 12px;border-bottom:1px solid #f1f5f9;background:#f8fafc;flex-wrap:wrap;">
                <i class="ph ph-funnel" style="color:#16a34a;font-size:0.9rem;flex-shrink:0;"></i>
                <input id="mn-hist-f-placa" type="text" placeholder="Placa..."
                    style="border:1px solid #e2e8f0;border-radius:6px;padding:3px 8px;font-size:0.74rem;width:90px;height:24px;outline:none;"
                    oninput="window._mnFiltrarHistoricoManut()">
                <select id="mn-hist-f-tm" style="border:1px solid #e2e8f0;border-radius:6px;padding:2px 5px;font-size:0.74rem;height:24px;outline:none;"
                    onchange="window._mnFiltrarHistoricoManut()">
                    <option value="">Tipo Manutenção</option>
                    <option value="preventiva">Preventiva</option>
                    <option value="corretiva">Corretiva</option>
                </select>
                <select id="mn-hist-f-tipo" style="border:1px solid #e2e8f0;border-radius:6px;padding:2px 5px;font-size:0.74rem;height:24px;outline:none;"
                    onchange="window._mnFiltrarHistoricoManut()">
                    <option value="">Tipo veículo</option>
                    <option value="caminhão">Caminhão</option>
                    <option value="caminhonete">Caminhonete</option>
                    <option value="utilitário">Utilitário</option>
                    <option value="carretinha">Carretinha</option>
                    <option value="caminhão tanque">Caminhão Tanque</option>
                </select>
                <select id="mn-hist-f-crit" style="border:1px solid #e2e8f0;border-radius:6px;padding:2px 5px;font-size:0.74rem;height:24px;outline:none;"
                    onchange="window._mnFiltrarHistoricoManut()">
                    <option value="">Criticidade</option>
                    <option value="Critica">Crítica</option>
                    <option value="Alta">Alta</option>
                    <option value="Media">Média</option>
                    <option value="Baixa">Baixa</option>
                </select>
                <span style="font-size:0.7rem;color:#94a3b8;white-space:nowrap;">Realizada de</span>
                <input id="mn-hist-f-real-de" type="date" style="border:1px solid #e2e8f0;border-radius:6px;padding:2px 5px;font-size:0.72rem;height:24px;outline:none;"
                    onchange="window._mnFiltrarHistoricoManut()">
                <span style="font-size:0.7rem;color:#94a3b8;">até</span>
                <input id="mn-hist-f-real-ate" type="date" style="border:1px solid #e2e8f0;border-radius:6px;padding:2px 5px;font-size:0.72rem;height:24px;outline:none;"
                    onchange="window._mnFiltrarHistoricoManut()">
                <span style="font-size:0.7rem;color:#94a3b8;white-space:nowrap;">Agendada de</span>
                <input id="mn-hist-f-ag-de" type="date" style="border:1px solid #e2e8f0;border-radius:6px;padding:2px 5px;font-size:0.72rem;height:24px;outline:none;"
                    onchange="window._mnFiltrarHistoricoManut()">
                <span style="font-size:0.7rem;color:#94a3b8;">até</span>
                <input id="mn-hist-f-ag-ate" type="date" style="border:1px solid #e2e8f0;border-radius:6px;padding:2px 5px;font-size:0.72rem;height:24px;outline:none;"
                    onchange="window._mnFiltrarHistoricoManut()">
                <button style="padding:2px 10px;background:#ef4444;color:#fff;border:none;border-radius:4px;font-size:0.7rem;cursor:pointer;height:24px;"
                    onclick="['mn-hist-f-placa','mn-hist-f-tm','mn-hist-f-tipo','mn-hist-f-crit','mn-hist-f-real-de','mn-hist-f-real-ate','mn-hist-f-ag-de','mn-hist-f-ag-ate'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});window._mnFiltrarHistoricoManut();">
                    Limpar
                </button>
            </div>
            <div style="overflow-y:auto;max-height:260px;">
                <table style="width:100%;border-collapse:collapse;font-size:0.75rem;">
                    <thead>
                        <tr style="background:#f1f5f9;position:sticky;top:0;z-index:2;">
                            <th style="padding:5px 10px;text-align:left;color:#475569;font-weight:700;white-space:nowrap;">Placa</th>
                            <th style="padding:5px 10px;text-align:left;color:#475569;font-weight:700;white-space:nowrap;">Tipo Veículo</th>
                            <th style="padding:5px 10px;text-align:center;color:#475569;font-weight:700;white-space:nowrap;">Tipo Manut.</th>
                            <th style="padding:5px 10px;text-align:left;color:#475569;font-weight:700;">Serviço</th>
                            <th style="padding:5px 10px;text-align:center;color:#475569;font-weight:700;">Criticidade</th>
                            <th style="padding:5px 10px;text-align:center;color:#475569;font-weight:700;white-space:nowrap;">Data Realizada / KM</th>
                            <th style="padding:5px 10px;text-align:center;color:#475569;font-weight:700;white-space:nowrap;">Data Agendada</th>
                            <th style="padding:5px 10px;text-align:right;color:#475569;font-weight:700;white-space:nowrap;">Próximo KM</th>
                            <th style="padding:5px 10px;text-align:left;color:#475569;font-weight:700;">Fornecedor</th>
                        </tr>
                    </thead>
                    <tbody id="mn-hist-tbody">
                        <tr><td colspan="10" style="text-align:center;padding:16px;color:#94a3b8;">Carregando...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;

    document.body.appendChild(wrapper);

    let _aberto = false;
    let _dados  = [];
    const _critCor = { Critica:'#dc2626', Alta:'#d97706', Media:'#0284c7', Baixa:'#2d9e5f' };
    const _fmtData = ds => {
        if (!ds) return '—';
        const p = ds.split('-');
        return (p.length === 3) ? (p[2]+'/'+p[1]+'/'+p[0]) : ds;
    };

    function _renderLinhas() {
        const tbody = document.getElementById('mn-hist-tbody');
        if (!tbody) return;
        const fPlaca   = (document.getElementById('mn-hist-f-placa')?.value   || '').trim().toLowerCase();
        const fTm      = (document.getElementById('mn-hist-f-tm')?.value      || '').toLowerCase();
        const fTipo    = (document.getElementById('mn-hist-f-tipo')?.value    || '').toLowerCase();
        const fCrit    = (document.getElementById('mn-hist-f-crit')?.value    || '').toLowerCase();
        const fRealDe  = document.getElementById('mn-hist-f-real-de')?.value  || '';
        const fRealAte = document.getElementById('mn-hist-f-real-ate')?.value || '';
        const fAgDe    = document.getElementById('mn-hist-f-ag-de')?.value    || '';
        const fAgAte   = document.getElementById('mn-hist-f-ag-ate')?.value   || '';

        const lista = _dados.filter(m => {
            if (fPlaca   && !(m.placa||'').toLowerCase().includes(fPlaca)) return false;
            if (fTm      && (m.tipo_manutencao||'').toLowerCase() !== fTm) return false;
            if (fTipo    && !(m.tipo_veiculo||'').toLowerCase().includes(fTipo)) return false;
            if (fCrit    && (m.criticidade||'').toLowerCase() !== fCrit) return false;
            if (fRealDe  && (m.data_conclusao||'')   < fRealDe)  return false;
            if (fRealAte && (m.data_conclusao||'')   > fRealAte) return false;
            if (fAgDe    && (m.data_agendamento||'') < fAgDe)    return false;
            if (fAgAte   && (m.data_agendamento||'') > fAgAte)   return false;
            return true;
        });

        if (!lista.length) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:14px;color:#94a3b8;">Nenhuma manutenção encontrada.</td></tr>';
            return;
        }

        tbody.innerHTML = lista.map((m, i) => {
            const bgRow = i % 2 === 0 ? '#fff' : '#fafafa';
            const cor = _critCor[m.criticidade] || '#94a3b8';
            const critBadge = m.criticidade
                ? '<span style="background:' + cor + '22;color:' + cor + ';padding:1px 7px;border-radius:20px;font-size:0.7rem;font-weight:700;">' + m.criticidade + '</span>'
                : '—';
            const desc = (m.descricao || '—').replace(/"/g, '&quot;');
            return '<tr style="background:' + bgRow + ';border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background=\'#f0fdf4\'" onmouseout="this.style.background=\'' + bgRow + '\'">' +
                '<td style="padding:5px 10px;font-weight:700;color:#1e293b;white-space:nowrap;">' + (m.placa||'—') + '</td>' +
                '<td style="padding:5px 10px;color:#64748b;white-space:nowrap;">' + (m.tipo_veiculo||'—') + '</td>' +
                '<td style="padding:5px 10px;text-align:center;color:#64748b;font-weight:600;white-space:nowrap;text-transform:capitalize;">' + (m.tipo_manutencao||'—') + '</td>' +
                '<td style="padding:5px 10px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + desc + '">' + (m.descricao||'—') + '</td>' +
                '<td style="padding:5px 10px;text-align:center;">' + critBadge + '</td>' +
                '<td style="padding:5px 10px;text-align:center;color:#2d9e5f;font-weight:600;white-space:nowrap;">' + _fmtData(m.data_conclusao) + '<br><span style="font-size:0.68rem;font-weight:400;color:#64748b;">' + (m.km_na_manutencao ? Number(m.km_na_manutencao).toLocaleString('pt-BR')+' km' : '—') + '</span></td>' +
                '<td style="padding:5px 10px;text-align:center;color:#2563eb;white-space:nowrap;">' + _fmtData(m.data_agendamento) + '</td>' +
                '<td style="padding:5px 10px;text-align:right;color:#0284c7;font-weight:600;white-space:nowrap;">' + (m.km_proxima_manutencao ? Number(m.km_proxima_manutencao).toLocaleString('pt-BR')+' km' : '—') + '</td>' +
                '<td style="padding:5px 10px;color:#64748b;">' + (m.fornecedor||'—') + '</td>' +
                '</tr>';
        }).join('');
    }

    async function _carregar() {
        try {
            const tok = window._manutTok || window.currentToken || localStorage.getItem('token');
            const res = await fetch('/api/frota/manutencoes/historico', { headers: { Authorization: 'Bearer ' + tok } });
            _dados = await res.json();
            if (!Array.isArray(_dados)) _dados = [];
            const count = document.getElementById('mn-hist-count');
            if (count) count.textContent = _dados.length;
            _renderLinhas();
        } catch(e) {
            const tbody = document.getElementById('mn-hist-tbody');
            if (tbody) tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:14px;color:#ef4444;">Erro ao carregar histórico.</td></tr>';
        }
    }

    window._mnToggleHistoricoManut = function() {
        _aberto = !_aberto;
        const panel = document.getElementById('mn-hist-panel');
        const icon  = document.getElementById('mn-hist-icon');
        if (panel) panel.style.maxHeight = _aberto ? '370px' : '0';
        if (icon)  icon.className = _aberto ? 'ph ph-caret-down-bold' : 'ph ph-caret-up-bold';
        if (_aberto && !_dados.length) _carregar();
    };

    document.addEventListener('mousedown', (e) => {
        if (!_aberto) return;
        if (e.target.closest('#mn-hist-wrapper')) return;
        window._mnToggleHistoricoManut();
    });

    window._mnRecarregarHistoricoManut = function() { _dados = []; _carregar(); };
    window._mnFiltrarHistoricoManut    = function() { _renderLinhas(); };
};

})();

// ─────────────────────────────────────────────────────────────────────────────
// AÇÕES DA TABELA DE MANUTENÇÕES PREVENTIVAS
// ─────────────────────────────────────────────────────────────────────────────

/** Utilitário: pega token */
function _mnGetTok() {
    return window._manutTok || window.currentToken || localStorage.getItem('token');
}

/** Utilitário: recarrega o plano do veículo atual */
function _mnRecarregarPlano() {
    if (typeof window.mnCarregarPreventivoVeiculo === 'function') {
        window.mnCarregarPreventivoVeiculo();
    }
}

/** Utilitário: mostra toast rápido */
function _mnToast(msg, tipo) {
    if (typeof window.showToast === 'function') { window.showToast(msg, tipo || 'success'); return; }
    // fallback simples
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:99999;
        background:${tipo==='error'?'#dc2626':'#16a34a'};color:#fff;
        padding:10px 18px;border-radius:8px;font-size:0.88rem;font-weight:600;
        box-shadow:0 4px 16px rgba(0,0,0,.2);transition:opacity .4s;`;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; setTimeout(()=>t.remove(),400); }, 2800);
}

// ── INICIAR MANUTENÇÃO (individual) ──────────────────────────────────────────
window.mnIniciarManutencao = async function(id, nome) {
    // popup para selecionar data de início
    const dataHoje = new Date().toISOString().slice(0, 10);
    const modal = document.createElement('div');
    modal.id = 'mn-modal-iniciar';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div style="background:#fff;border-radius:14px;padding:1.5rem 1.75rem;min-width:320px;max-width:420px;box-shadow:0 8px 32px rgba(0,0,0,.18);">
            <h3 style="margin:0 0 1rem;color:#1e293b;font-size:1.05rem;display:flex;align-items:center;gap:8px;">
                <i class="ph ph-play-circle" style="color:#d97706;font-size:1.3rem;"></i>
                Iniciar Manutenção
            </h3>
            <p style="margin:0 0 1rem;font-size:0.88rem;color:#475569;">
                <strong>${nome}</strong>
            </p>
            <label style="font-size:0.82rem;font-weight:600;color:#64748b;">Data de Início</label>
            <input id="mn-ini-data" type="date" value="${dataHoje}"
                style="width:100%;box-sizing:border-box;margin-top:4px;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:0.9rem;outline:none;">
            <div style="display:flex;gap:8px;margin-top:1.2rem;justify-content:flex-end;">
                <button onclick="document.getElementById('mn-modal-iniciar').remove()"
                    style="padding:7px 18px;border:1.5px solid #e2e8f0;background:#fff;border-radius:8px;font-size:0.85rem;cursor:pointer;color:#64748b;">
                    Cancelar
                </button>
                <button id="mn-ini-confirmar"
                    style="padding:7px 18px;background:#d97706;color:#fff;border:none;border-radius:8px;font-size:0.85rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;">
                    <i class="ph ph-play"></i> Iniciar
                </button>
            </div>
        </div>`;
    document.body.appendChild(modal);

    document.getElementById('mn-ini-confirmar').onclick = async function() {
        const dataInicio = document.getElementById('mn-ini-data')?.value || dataHoje;
        this.disabled = true;
        this.innerHTML = '<i class="ph ph-spinner"></i> Salvando...';
        try {
            const tok = _mnGetTok();
            const res = await fetch(`/api/frota/manutencoes/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
                body: JSON.stringify({ status: 'em_andamento', data_inicio: dataInicio })
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.error || 'Erro ao iniciar manutenção');
            modal.remove();
            _mnToast('✅ Manutenção iniciada! Veículo marcado como Em Manutenção.', 'success');
            _mnRecarregarPlano();
        } catch (e) {
            _mnToast(e.message, 'error');
            this.disabled = false;
            this.innerHTML = '<i class="ph ph-play"></i> Iniciar';
        }
    };
};

// ── INICIAR SELECIONADOS (em massa) ──────────────────────────────────────────
window.mnIniciarSelecionados = async function() {
    const cbs = Array.from(document.querySelectorAll('.mn-prev-cb:checked'));
    if (!cbs.length) { _mnToast('Selecione ao menos um item.', 'error'); return; }

    const nomes = cbs.map(cb => cb.dataset.nome).join('\n• ');
    if (!confirm(`Deseja iniciar ${cbs.length} manutenção(ões)?\n\n• ${nomes}\n\nOs veículos serão marcados como Em Manutenção.`)) return;

    const dataHoje = new Date().toISOString().slice(0, 10);
    const tok = _mnGetTok();
    let erros = 0;

    await Promise.all(cbs.map(async cb => {
        try {
            const res = await fetch(`/api/frota/manutencoes/${cb.dataset.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
                body: JSON.stringify({ status: 'em_andamento', data_inicio: dataHoje })
            });
            if (!res.ok) erros++;
        } catch { erros++; }
    }));

    if (erros > 0) _mnToast(`${cbs.length - erros} iniciada(s), ${erros} com erro.`, erros === cbs.length ? 'error' : 'success');
    else _mnToast(`✅ ${cbs.length} manutenção(ões) iniciada(s)!`, 'success');
    _mnRecarregarPlano();
};

// ── CONCLUIR INDIVIDUAL ───────────────────────────────────────────────────────
window.mnConcluirIndividual = function(id, nome) {
    const vid = document.getElementById('mn-prev-veiculo')?.value || '';
    const veiculo = (window._manutFrota || []).find(v => v.id == vid);
    const kmAtual = veiculo?.km_atual || '';
    const dataHoje = new Date().toISOString().slice(0, 10);

    const modal = document.createElement('div');
    modal.id = 'mn-modal-concluir';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div style="background:#fff;border-radius:14px;padding:1.5rem 1.75rem;min-width:340px;max-width:460px;box-shadow:0 8px 32px rgba(0,0,0,.18);">
            <h3 style="margin:0 0 1rem;color:#1e293b;font-size:1.05rem;display:flex;align-items:center;gap:8px;">
                <i class="ph ph-check-circle" style="color:#16a34a;font-size:1.3rem;"></i>
                Registrar Manutenção Realizada
            </h3>
            <p style="margin:0 0 1rem;font-size:0.88rem;color:#475569;"><strong>${nome}</strong></p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <div>
                    <label style="font-size:0.8rem;font-weight:600;color:#64748b;">Data Realizada</label>
                    <input id="mn-conc-data" type="date" value="${dataHoje}"
                        style="width:100%;box-sizing:border-box;margin-top:4px;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:0.88rem;outline:none;">
                </div>
                <div>
                    <label style="font-size:0.8rem;font-weight:600;color:#64748b;">KM na Manutenção</label>
                    <input id="mn-conc-km" type="number" value="${kmAtual}" placeholder="Ex: 45000"
                        style="width:100%;box-sizing:border-box;margin-top:4px;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:0.88rem;outline:none;">
                </div>
                <div>
                    <label style="font-size:0.8rem;font-weight:600;color:#64748b;">Custo (R$)</label>
                    <input id="mn-conc-custo" type="number" step="0.01" placeholder="Ex: 350.00"
                        style="width:100%;box-sizing:border-box;margin-top:4px;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:0.88rem;outline:none;">
                </div>
                <div>
                    <label style="font-size:0.8rem;font-weight:600;color:#64748b;">Fornecedor</label>
                    <input id="mn-conc-forn" type="text" placeholder="Ex: Auto Peças Silva"
                        style="width:100%;box-sizing:border-box;margin-top:4px;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:0.88rem;outline:none;">
                </div>
            </div>
            <div style="margin-top:10px;">
                <label style="font-size:0.8rem;font-weight:600;color:#64748b;">Observações</label>
                <textarea id="mn-conc-obs" rows="2" placeholder="Observações opcionais..."
                    style="width:100%;box-sizing:border-box;margin-top:4px;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:0.88rem;outline:none;resize:vertical;"></textarea>
            </div>
            <div style="display:flex;gap:8px;margin-top:1.2rem;justify-content:flex-end;">
                <button onclick="document.getElementById('mn-modal-concluir').remove()"
                    style="padding:7px 18px;border:1.5px solid #e2e8f0;background:#fff;border-radius:8px;font-size:0.85rem;cursor:pointer;color:#64748b;">
                    Cancelar
                </button>
                <button id="mn-conc-confirmar"
                    style="padding:7px 18px;background:#16a34a;color:#fff;border:none;border-radius:8px;font-size:0.85rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;">
                    <i class="ph ph-check-circle"></i> Concluir
                </button>
            </div>
        </div>`;
    document.body.appendChild(modal);

    document.getElementById('mn-conc-confirmar').onclick = async function() {
        const data_conclusao = document.getElementById('mn-conc-data')?.value;
        const km = document.getElementById('mn-conc-km')?.value;
        const custo = document.getElementById('mn-conc-custo')?.value;
        const fornecedor = document.getElementById('mn-conc-forn')?.value;
        const observacoes = document.getElementById('mn-conc-obs')?.value;

        this.disabled = true;
        this.innerHTML = '<i class="ph ph-spinner"></i> Salvando...';
        try {
            const tok = _mnGetTok();
            const res = await fetch(`/api/frota/manutencoes/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
                body: JSON.stringify({
                    status: 'concluida',
                    data_conclusao: data_conclusao || null,
                    km_na_manutencao: km ? parseInt(km) : null,
                    custo: custo ? parseFloat(custo) : null,
                    fornecedor: fornecedor || null,
                    observacoes: observacoes || null
                })
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.error || 'Erro ao concluir manutenção');
            modal.remove();
            _mnToast('✅ Manutenção registrada como concluída!', 'success');
            _mnRecarregarPlano();
        } catch (e) {
            _mnToast(e.message, 'error');
            this.disabled = false;
            this.innerHTML = '<i class="ph ph-check-circle"></i> Concluir';
        }
    };
};

// ── AGENDAR INDIVIDUAL ────────────────────────────────────────────────────────
window.mnAgendarIndividual = function(id, nome) {
    const dataHoje = new Date().toISOString().slice(0, 10);

    const modal = document.createElement('div');
    modal.id = 'mn-modal-agendar';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div style="background:#fff;border-radius:14px;padding:1.5rem 1.75rem;min-width:320px;max-width:400px;box-shadow:0 8px 32px rgba(0,0,0,.18);">
            <h3 style="margin:0 0 1rem;color:#1e293b;font-size:1.05rem;display:flex;align-items:center;gap:8px;">
                <i class="ph ph-calendar-plus" style="color:#7c3aed;font-size:1.3rem;"></i>
                Agendar Manutenção
            </h3>
            <p style="margin:0 0 1rem;font-size:0.88rem;color:#475569;"><strong>${nome}</strong></p>
            <label style="font-size:0.82rem;font-weight:600;color:#64748b;">Data Agendada</label>
            <input id="mn-age-data" type="date" value="${dataHoje}"
                style="width:100%;box-sizing:border-box;margin-top:4px;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:0.9rem;outline:none;">
            <label style="font-size:0.82rem;font-weight:600;color:#64748b;display:block;margin-top:10px;">Observações</label>
            <textarea id="mn-age-obs" rows="2" placeholder="Observações opcionais..."
                style="width:100%;box-sizing:border-box;margin-top:4px;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:0.88rem;outline:none;resize:vertical;"></textarea>
            <div style="display:flex;gap:8px;margin-top:1.2rem;justify-content:flex-end;">
                <button onclick="document.getElementById('mn-modal-agendar').remove()"
                    style="padding:7px 18px;border:1.5px solid #e2e8f0;background:#fff;border-radius:8px;font-size:0.85rem;cursor:pointer;color:#64748b;">
                    Cancelar
                </button>
                <button id="mn-age-confirmar"
                    style="padding:7px 18px;background:#7c3aed;color:#fff;border:none;border-radius:8px;font-size:0.85rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;">
                    <i class="ph ph-calendar-plus"></i> Agendar
                </button>
            </div>
        </div>`;
    document.body.appendChild(modal);

    document.getElementById('mn-age-confirmar').onclick = async function() {
        const data_agendamento = document.getElementById('mn-age-data')?.value;
        const observacoes = document.getElementById('mn-age-obs')?.value;
        if (!data_agendamento) { _mnToast('Informe a data.', 'error'); return; }

        this.disabled = true;
        this.innerHTML = '<i class="ph ph-spinner"></i> Salvando...';
        try {
            const tok = _mnGetTok();
            const res = await fetch(`/api/frota/manutencoes/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
                body: JSON.stringify({ status: 'agendada', data_agendamento, observacoes: observacoes || null })
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.error || 'Erro ao agendar');
            modal.remove();
            _mnToast('✅ Manutenção agendada!', 'success');
            _mnRecarregarPlano();
        } catch (e) {
            _mnToast(e.message, 'error');
            this.disabled = false;
            this.innerHTML = '<i class="ph ph-calendar-plus"></i> Agendar';
        }
    };
};

// ── AGENDAR SELECIONADOS ──────────────────────────────────────────────────────
window.mnAgendarSelecionados = function() {
    const cbs = Array.from(document.querySelectorAll('.mn-prev-cb:checked'));
    if (!cbs.length) { _mnToast('Selecione ao menos um item.', 'error'); return; }

    const dataHoje = new Date().toISOString().slice(0, 10);
    const modal = document.createElement('div');
    modal.id = 'mn-modal-agendar-sel';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div style="background:#fff;border-radius:14px;padding:1.5rem 1.75rem;min-width:320px;max-width:400px;box-shadow:0 8px 32px rgba(0,0,0,.18);">
            <h3 style="margin:0 0 0.75rem;color:#1e293b;font-size:1.05rem;display:flex;align-items:center;gap:8px;">
                <i class="ph ph-calendar-plus" style="color:#7c3aed;font-size:1.3rem;"></i>
                Agendar ${cbs.length} Manutenção(ões)
            </h3>
            <label style="font-size:0.82rem;font-weight:600;color:#64748b;">Data de Agendamento</label>
            <input id="mn-agsel-data" type="date" value="${dataHoje}"
                style="width:100%;box-sizing:border-box;margin-top:4px;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:0.9rem;outline:none;">
            <div style="display:flex;gap:8px;margin-top:1.2rem;justify-content:flex-end;">
                <button onclick="document.getElementById('mn-modal-agendar-sel').remove()"
                    style="padding:7px 18px;border:1.5px solid #e2e8f0;background:#fff;border-radius:8px;font-size:0.85rem;cursor:pointer;color:#64748b;">
                    Cancelar
                </button>
                <button id="mn-agsel-confirmar"
                    style="padding:7px 18px;background:#7c3aed;color:#fff;border:none;border-radius:8px;font-size:0.85rem;font-weight:700;cursor:pointer;">
                    Confirmar
                </button>
            </div>
        </div>`;
    document.body.appendChild(modal);

    document.getElementById('mn-agsel-confirmar').onclick = async function() {
        const data_agendamento = document.getElementById('mn-agsel-data')?.value;
        if (!data_agendamento) { _mnToast('Informe a data.', 'error'); return; }
        this.disabled = true;
        this.textContent = 'Salvando...';
        const tok = _mnGetTok();
        let erros = 0;
        await Promise.all(cbs.map(async cb => {
            try {
                const r = await fetch(`/api/frota/manutencoes/${cb.dataset.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
                    body: JSON.stringify({ status: 'agendada', data_agendamento })
                });
                if (!r.ok) erros++;
            } catch { erros++; }
        }));
        modal.remove();
        _mnToast(erros ? `${cbs.length - erros} agendada(s), ${erros} com erro.` : `✅ ${cbs.length} agendada(s)!`, erros ? 'error' : 'success');
        _mnRecarregarPlano();
    };
};

// ── FINALIZAR AGENDADO (selecionados) ─────────────────────────────────────────
window.mnFinalizarAgendado = async function() {
    const cbs = Array.from(document.querySelectorAll('.mn-prev-cb:checked'));
    if (!cbs.length) { _mnToast('Selecione ao menos um item.', 'error'); return; }

    const nomes = cbs.map(cb => cb.dataset.nome).join('\n• ');
    if (!confirm(`Deseja marcar como CONCLUÍDA(s) ${cbs.length} manutenção(ões)?\n\n• ${nomes}`)) return;

    const dataHoje = new Date().toISOString().slice(0, 10);
    const tok = _mnGetTok();
    let erros = 0;
    await Promise.all(cbs.map(async cb => {
        try {
            const r = await fetch(`/api/frota/manutencoes/${cb.dataset.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
                body: JSON.stringify({ status: 'concluida', data_conclusao: dataHoje })
            });
            if (!r.ok) erros++;
        } catch { erros++; }
    }));
    _mnToast(erros ? `${cbs.length - erros} concluída(s), ${erros} com erro.` : `✅ ${cbs.length} marcada(s) como concluída!`, erros ? 'error' : 'success');
    _mnRecarregarPlano();
};

// ── EXCLUIR SELECIONADOS ──────────────────────────────────────────────────────
window.mnExcluirSelecionados = async function() {
    const cbs = Array.from(document.querySelectorAll('.mn-prev-cb:checked'));
    if (!cbs.length) { _mnToast('Selecione ao menos um item.', 'error'); return; }

    const nomes = cbs.map(cb => cb.dataset.nome).join('\n• ');
    if (!confirm(`Deseja EXCLUIR ${cbs.length} manutenção(ões)?\n\n• ${nomes}\n\nEsta ação não pode ser desfeita.`)) return;

    const tok = _mnGetTok();
    let erros = 0;
    await Promise.all(cbs.map(async cb => {
        try {
            const r = await fetch(`/api/frota/manutencoes/${cb.dataset.id}`, {
                method: 'DELETE',
                headers: { Authorization: 'Bearer ' + tok }
            });
            if (!r.ok) erros++;
        } catch { erros++; }
    }));
    _mnToast(erros ? `${cbs.length - erros} excluída(s), ${erros} com erro.` : `✅ ${cbs.length} excluída(s)!`, erros ? 'error' : 'success');
    _mnRecarregarPlano();
};

// ── CONTROLE DE CHECKBOXES ────────────────────────────────────────────────────
window.mnPrevCbChanged = function() {
    const total = document.querySelectorAll('.mn-prev-cb:checked').length;
    const bar = document.getElementById('mn-prev-mass-actions');
    const cnt = document.getElementById('mn-prev-sel-count');
    if (bar) bar.style.display = total > 0 ? 'flex' : 'none';
    if (cnt) cnt.textContent = total;
};

window.mnPrevToggleCat = function(masterCb, catKey) {
    document.querySelectorAll(`.mn-prev-cb-cat-${catKey}`).forEach(cb => { cb.checked = masterCb.checked; });
    window.mnPrevCbChanged();
};
