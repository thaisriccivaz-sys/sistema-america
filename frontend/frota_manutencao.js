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
        <span style="font-size:0.8rem;color:#94a3b8;">Realizada de</span>
        <input id="mn-tab-hist-f-real-de" type="date" style="border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;font-size:0.8rem;outline:none;" onchange="window.mnFiltrarTabHistorico()">
        <span style="font-size:0.8rem;color:#94a3b8;">até</span>
        <input id="mn-tab-hist-f-real-ate" type="date" style="border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;font-size:0.8rem;outline:none;" onchange="window.mnFiltrarTabHistorico()">
        <button style="padding:4px 12px;background:#ef4444;color:#fff;border:none;border-radius:6px;font-size:0.8rem;cursor:pointer;" onclick="['mn-tab-hist-f-placa','mn-tab-hist-f-tm','mn-tab-hist-f-tipo','mn-tab-hist-f-real-de','mn-tab-hist-f-real-ate'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});window.mnFiltrarTabHistorico();">Limpar</button>
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
        if (fTm      && (m.tipo||'').toLowerCase() !== fTm) return false;
        if (fTipo    && !(m.tipo_veiculo||'').toLowerCase().includes(fTipo)) return false;
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
    const container = document.getElementById('mn-hist-view-container');
    if (!container) return;
    const _fmtD = d => { if(!d) return '—'; const [y,mo,di]=d.split('-'); return di+'/'+mo+'/'+y.slice(2); };

    if (!lista.length) {
        container.innerHTML = '<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:3rem;text-align:center;color:#94a3b8;">Nenhuma manutenção encontrada.</div>';
        return;
    }

    let html = `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
        <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
            <thead><tr style="background:#f1f5f9;border-bottom:2px solid #e2e8f0;">
                <th style="padding:10px;width:36px;"></th>
                <th style="padding:10px;text-align:left;color:#475569;font-weight:700;">Placa</th>
                <th style="padding:10px;text-align:left;color:#475569;font-weight:700;">Tipo Veículo</th>
                <th style="padding:10px;text-align:center;color:#475569;font-weight:700;">Categoria</th>
                <th style="padding:10px;text-align:left;color:#475569;font-weight:700;">Serviço</th>
                <th style="padding:10px;text-align:center;color:#475569;font-weight:700;">Status</th>
                <th style="padding:10px;text-align:center;color:#475569;font-weight:700;">Data Realizada / KM</th>
                <th style="padding:10px;text-align:center;color:#475569;font-weight:700;">Data Agendada</th>
                <th style="padding:10px;text-align:right;color:#475569;font-weight:700;">Próximo KM</th>
                <th style="padding:10px;text-align:left;color:#475569;font-weight:700;">Fornecedor</th>
            </tr></thead>
            <tbody>`;

    lista.forEach((m, i) => {
        const bgRow = i % 2 === 0 ? '#fff' : '#fafafa';
        const desc = (m.descricao || '—').replace(/"/g, '&quot;');
        const obsId = 'mn-hist-obs-' + (m.id || i);
        const hasObs = !!(m.observacoes && m.observacoes.trim());
        const hasObsAg = !!(m.observacoes_agendamento && m.observacoes_agendamento.trim());
        const showExpander = hasObs || hasObsAg;
        // Categoria: preferir categoria_nome, fallback ao tipo (preventiva/corretiva)
        const catLabel = m.categoria_nome || (m.tipo ? (m.tipo.charAt(0).toUpperCase() + m.tipo.slice(1)) : '—');
        const catColor = m.tipo === 'preventiva' ? '#0284c7' : '#d97706';

        const statusCorHist = {concluida:'#2d9e5f',agendada:'#2563eb',programada:'#7c3aed',em_andamento:'#d97706',cancelada:'#94a3b8',reagendada:'#f97316'};
        const statusLblHist = {concluida:'Concluída',agendada:'Agendada',programada:'Programada',em_andamento:'Em Andamento',cancelada:'Cancelada',reagendada:'Reagendada'};
        const sHistKey = m.status||'concluida';
        const histStatusBadge = `<span style="background:${statusCorHist[sHistKey]||'#94a3b8'}22;color:${statusCorHist[sHistKey]||'#94a3b8'};padding:2px 8px;border-radius:20px;font-size:0.75rem;font-weight:700;white-space:nowrap;">${statusLblHist[sHistKey]||sHistKey}</span>`;

        html += `<tr style="background:${bgRow};border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background='#f0fdf4'" onmouseout="this.style.background='${bgRow}'">`;
        html += `<td style="padding:6px 8px;text-align:center;">`;
        if (showExpander) {
            html += `<button onclick="const el=document.getElementById('${obsId}');el.style.display=el.style.display==='none'?'table-row':'none';this.style.transform=el.style.display!=='none'?'rotate(90deg)':'rotate(0)'"
                style="background:none;border:none;cursor:pointer;color:#64748b;font-size:1rem;transition:transform .2s;padding:0;"
                title="Ver observações"><i class="ph ph-caret-right"></i></button>`;
        }
        html += `</td>`;
        html += `<td style="padding:10px;font-weight:700;color:#1e293b;white-space:nowrap;">${m.placa||'—'}</td>`;
        html += `<td style="padding:10px;color:#64748b;white-space:nowrap;">${m.tipo_veiculo||'—'}</td>`;
        html += `<td style="padding:10px;text-align:center;"><span style="background:${catColor}18;color:${catColor};padding:2px 8px;border-radius:20px;font-size:0.75rem;font-weight:700;white-space:nowrap;">${catLabel}</span></td>`;
        html += `<td style="padding:10px;max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${desc}">${m.descricao||'—'}</td>`;
        html += `<td style="padding:10px;text-align:center;">${histStatusBadge}</td>`;
        html += `<td style="padding:10px;text-align:center;color:#2d9e5f;font-weight:600;white-space:nowrap;">${_fmtD(m.data_conclusao)}<br><span style="font-size:0.75rem;font-weight:400;color:#64748b;">${m.km_na_manutencao ? Number(m.km_na_manutencao).toLocaleString('pt-BR')+' km' : '—'}</span></td>`;
        html += `<td style="padding:10px;text-align:center;color:#2563eb;white-space:nowrap;">${_fmtD(m.data_agendamento)}</td>`;
        html += `<td style="padding:10px;text-align:right;color:#0284c7;font-weight:600;white-space:nowrap;">${m.km_proxima_manutencao ? Number(m.km_proxima_manutencao).toLocaleString('pt-BR')+' km' : '—'}</td>`;
        html += `<td style="padding:10px;color:#64748b;">${m.fornecedor||'—'}</td>`;
        html += `</tr>`;

        // Linha expansível de observações
        if (showExpander) {
            html += `<tr id="${obsId}" style="display:none;background:#fffbeb;border-bottom:1px solid #fef3c7;">`;
            html += `<td colspan="9" style="padding:8px 24px 10px;">`;
            html += `<div style="display:flex;flex-direction:column;gap:6px;">`;
            if (hasObs) {
                html += `<div style="display:flex;align-items:flex-start;gap:8px;">`;
                html += `<i class="ph ph-note-pencil" style="color:#d97706;font-size:1.1rem;flex-shrink:0;margin-top:2px;"></i>`;
                html += `<div style="font-size:0.83rem;color:#78350f;white-space:pre-wrap;line-height:1.5;"><strong>Obs (Cadastro):</strong> ${(m.observacoes||'').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`;
                html += `</div>`;
            }
            if (hasObsAg) {
                html += `<div style="display:flex;align-items:flex-start;gap:8px;">`;
                html += `<i class="ph ph-calendar-plus" style="color:#2563eb;font-size:1.1rem;flex-shrink:0;margin-top:2px;"></i>`;
                html += `<div style="font-size:0.83rem;color:#1e40af;white-space:pre-wrap;line-height:1.5;"><strong>Obs (Agendamento):</strong> ${(m.observacoes_agendamento||'').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`;
                html += `</div>`;
            }
            html += `</div></td></tr>`;
        }
    });

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
    const prevSubAba = window._mnPrevSubAba || 'plano';
    sub.innerHTML = `
    <!-- Sub-tabs da Preventiva -->
    <div style="display:flex;gap:4px;margin-bottom:1rem;background:#fff;padding:5px;border-radius:10px;border:1px solid #e2e8f0;width:fit-content;">
        <button id="mn-prev-sub-plano" onclick="window.mnPrevMudarSub('plano')"
            style="padding:7px 18px;border:none;border-radius:7px;font-weight:600;cursor:pointer;font-size:0.87rem;display:flex;align-items:center;gap:6px;background:${prevSubAba==='plano'?'#0284c7':'transparent'};color:${prevSubAba==='plano'?'#fff':'#64748b'};">
            <i class="ph ph-calendar-check"></i> Plano Preventivo
        </button>
        <button id="mn-prev-sub-hist" onclick="window.mnPrevMudarSub('historico')"
            style="padding:7px 18px;border:none;border-radius:7px;font-weight:600;cursor:pointer;font-size:0.87rem;display:flex;align-items:center;gap:6px;background:${prevSubAba==='historico'?'#0284c7':'transparent'};color:${prevSubAba==='historico'?'#fff':'#64748b'};">
            <i class="ph ph-clock-counter-clockwise"></i> Histórico de Preventivas
        </button>
    </div>
    <div id="mn-prev-sub-conteudo"></div>`;

    window.mnPrevMudarSub(prevSubAba);
}

window.mnPrevMudarSub = function(aba) {
    window._mnPrevSubAba = aba;
    ['plano','historico'].forEach(a => {
        const btn = document.getElementById('mn-prev-sub-' + a);
        if (btn) { btn.style.background = a===aba?'#0284c7':'transparent'; btn.style.color = a===aba?'#fff':'#64748b'; }
    });
    const c = document.getElementById('mn-prev-sub-conteudo');
    if (!c) return;
    if (aba === 'plano') mnPrevRenderPlano(c);
    else mnPrevRenderHistorico(c);
};

function mnPrevRenderPlano(c) {
    const frota = window._manutFrota || [];
    const idsComPrev = new Set((window._manutDados||[]).filter(m => m.tipo==='preventiva').map(m => String(m.veiculo_id)));
    const veicOpts = frota.map(v => `<option value="${v.id}">${v.placa} \u2014 ${(v.marca_modelo_versao||'').substring(0,28)}</option>`).join('');
    c.innerHTML = `
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

async function mnPrevRenderHistorico(c) {
    const frota = window._manutFrota || [];
    const veicOpts = frota.map(v => `<option value="${v.id}">${v.placa}</option>`).join('');
    c.innerHTML = `
    <!-- Filtros -->
    <div style="background:#fff;padding:0.75rem 1rem;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:1rem;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <i class="ph ph-funnel" style="color:#0284c7;"></i>
        <select id="mn-prevhist-veiculo" onchange="window.mnCarregarPrevHist()" style="padding:6px 10px;border:1px solid #cbd5e1;border-radius:8px;font-size:0.85rem;outline:none;background:#fff;">
            <option value="">Todos os Veículos</option>${veicOpts}
        </select>
        <select id="mn-prevhist-status" onchange="window.mnCarregarPrevHist()" style="padding:6px 10px;border:1px solid #cbd5e1;border-radius:8px;font-size:0.85rem;outline:none;background:#fff;">
            <option value="">Todos Status</option>
            <option value="agendada">Agendada</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="concluida">Concluída</option>
            <option value="cancelada">Cancelada</option>
        </select>
        <button onclick="window.mnCarregarPrevHist()" style="padding:6px 12px;background:#0284c7;color:#fff;border:none;border-radius:8px;font-size:0.8rem;cursor:pointer;display:flex;align-items:center;gap:4px;">
            <i class="ph ph-arrows-clockwise"></i> Atualizar
        </button>
        <span id="mn-prevhist-count" style="margin-left:auto;font-size:0.8rem;color:#94a3b8;"></span>
    </div>
    <!-- Tabela -->
    <div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
        <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
            <thead><tr style="background:#f1f5f9;border-bottom:2px solid #e2e8f0;">
                <th style="padding:10px 12px;text-align:left;color:#475569;font-weight:700;">Placa</th>
                <th style="padding:10px 12px;text-align:left;color:#475569;font-weight:700;">Serviço</th>
                <th style="padding:10px 12px;text-align:center;color:#475569;font-weight:700;">Status</th>
                <th style="padding:10px 12px;text-align:center;color:#475569;font-weight:700;">Data Agend.</th>
                <th style="padding:10px 12px;text-align:center;color:#475569;font-weight:700;">KM Realizado</th>
                <th style="padding:10px 12px;text-align:center;color:#475569;font-weight:700;">KM Próxima</th>
                <th style="padding:10px 12px;text-align:center;color:#475569;font-weight:700;">KM Restante</th>
                <th style="padding:10px 12px;text-align:center;color:#475569;font-weight:700;">Ações</th>
            </tr></thead>
            <tbody id="mn-prevhist-tbody">
                <tr><td colspan="8" style="padding:2rem;text-align:center;color:#94a3b8;"><i class="ph ph-circle-notch ph-spin" style="font-size:1.5rem;"></i></td></tr>
            </tbody>
        </table>
        </div>
    </div>`;
    window.mnCarregarPrevHist();
}

window.mnCarregarPrevHist = async function() {
    const tok = window._manutTok || window.currentToken || localStorage.getItem('token');
    const fV = document.getElementById('mn-prevhist-veiculo')?.value || '';
    const fS = document.getElementById('mn-prevhist-status')?.value || '';

    let url = '/api/frota/manutencoes/historico';
    try {
        const r = await fetch(url, { headers: { Authorization: 'Bearer ' + tok } });
        let lista = (await r.json()) || [];
        lista = lista.filter(m => m.tipo === 'preventiva' || !m.tipo);
        if (fV) lista = lista.filter(m => String(m.veiculo_id) === fV);
        if (fS) lista = lista.filter(m => m.status === fS);
        mnRenderPrevHistDados(lista);
    } catch(e) {
        const tbody = document.getElementById('mn-prevhist-tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="padding:1.5rem;text-align:center;color:#dc2626;">Erro ao carregar.</td></tr>';
    }
};

function mnRenderPrevHistDados(lista) {
    const count = document.getElementById('mn-prevhist-count');
    if (count) count.textContent = lista.length + ' registro' + (lista.length !== 1 ? 's' : '');

    const tbody = document.getElementById('mn-prevhist-tbody');
    if (!tbody) return;

    if (!lista.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="padding:2.5rem;text-align:center;color:#94a3b8;"><i class="ph ph-calendar-check" style="font-size:2rem;display:block;margin-bottom:8px;"></i>Nenhuma manutenção preventiva encontrada.</td></tr>';
        return;
    }

    const statusCor = { agendada:'#2563eb', em_andamento:'#d97706', concluida:'#10b981', cancelada:'#94a3b8', programada:'#7c3aed' };
    const statusLbl = { agendada:'Agendada', em_andamento:'Em Andamento', concluida:'Concluída', cancelada:'Cancelada', programada:'Programada' };
    const fmtD = d => { if (!d) return '—'; const p = d.split('T')[0].split('-'); return `${p[2]}/${p[1]}/${p[0].slice(2)}`; };

    tbody.innerHTML = lista.map((m, i) => {
        const bgRow = i % 2 === 0 ? '#fff' : '#fafafa';
        const sKey = m.status || 'concluida';
        const statusBadge = `<span style="background:${statusCor[sKey]||'#94a3b8'}22;color:${statusCor[sKey]||'#94a3b8'};padding:2px 10px;border-radius:20px;font-size:0.75rem;font-weight:700;white-space:nowrap;">${statusLbl[sKey]||sKey}</span>`;

        const kmAtualVeic = (window._manutFrota||[]).find(v => v.id == m.veiculo_id)?.km_atual || 0;
        const kmProx = m.km_proxima_manutencao;
        let kmRestHtml = '—';
        if (kmProx && kmAtualVeic) {
            const rest = kmProx - kmAtualVeic;
            const cor = rest <= 0 ? '#dc2626' : rest <= 1000 ? '#d97706' : '#10b981';
            kmRestHtml = `<span style="color:${cor};font-weight:700;">${rest <= 0 ? 'Vencida há ' + Math.abs(rest).toLocaleString('pt-BR') : 'Restam ' + rest.toLocaleString('pt-BR')} km</span>`;
        }

        let acoes = '';
        if (sKey === 'agendada' || sKey === 'programada') {
            acoes += `<button onclick="window.mnCorrAcao(${m.id},'em_andamento')" style="background:#d97706;color:#fff;border:none;border-radius:6px;padding:3px 8px;font-size:0.72rem;cursor:pointer;font-weight:600;white-space:nowrap;display:inline-flex;align-items:center;gap:3px;"><i class="ph ph-play"></i> Iniciar</button> `;
        }
        if (sKey === 'em_andamento') {
            acoes += `<button onclick="window.mnCorrConcluir(${m.id})" style="background:#10b981;color:#fff;border:none;border-radius:6px;padding:3px 8px;font-size:0.72rem;cursor:pointer;font-weight:600;white-space:nowrap;display:inline-flex;align-items:center;gap:3px;"><i class="ph ph-check"></i> Concluir</button> `;
        }
        acoes += `<button onclick="window.abrirModalManutencao(${m.id})" style="background:#2563eb18;color:#2563eb;border:1px solid #2563eb40;border-radius:6px;padding:3px 6px;font-size:0.72rem;cursor:pointer;display:inline-flex;align-items:center;"><i class="ph ph-pencil"></i></button>`;

        return `<tr style="background:${bgRow};border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background='${bgRow}'">
            <td style="padding:10px 12px;font-weight:700;color:#1e293b;white-space:nowrap;">${m.placa||'—'}</td>
            <td style="padding:10px 12px;max-width:200px;"><span title="${(m.descricao||'').replace(/"/g,'&quot;')}" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${m.descricao||'—'}</span></td>
            <td style="padding:10px 12px;text-align:center;">${statusBadge}</td>
            <td style="padding:10px 12px;text-align:center;color:#64748b;">${fmtD(m.data_agendamento)}</td>
            <td style="padding:10px 12px;text-align:center;color:#475569;font-weight:600;">${m.km_na_manutencao ? Number(m.km_na_manutencao).toLocaleString('pt-BR')+' km' : '—'}</td>
            <td style="padding:10px 12px;text-align:center;color:#0284c7;font-weight:600;">${kmProx ? Number(kmProx).toLocaleString('pt-BR')+' km' : '—'}</td>
            <td style="padding:10px 12px;text-align:center;">${kmRestHtml}</td>
            <td style="padding:10px 12px;text-align:center;">
                <div style="display:flex;gap:4px;align-items:center;justify-content:center;flex-wrap:wrap;">${acoes}</div>
            </td>
        </tr>`;
    }).join('');
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
            const tipoIcon = item.tipo_conclusao === 'revisao' 
                ? ` <span title="Sem necessidade de manutenção (apenas revisão)" style="cursor:help;">❌</span>` 
                : (item.data_ultima_manutencao ? ` <span title="Manutenção realizada completa" style="cursor:help;">✔️</span>` : '');
            const ultimaManuTxt = `<div style="display:flex;flex-direction:column;align-items:center;"><div style="display:flex;align-items:center;">${fmtDate(item.data_ultima_manutencao)}${tipoIcon}${obsIconConcluida}</div>${kmUltStr}</div>`;
            const dataAgendadaTxt = item.data_agendamento
                ? `<span style="font-weight:700;color:#2563eb;font-size:0.82rem;display:flex;align-items:center;justify-content:center;gap:4px;">${fmtDate(item.data_agendamento).replace(/<[^>]+>/g,'').trim()}${obsIconAgendada}</span>`
                : '<span style="color:#94a3b8;">—</span>';

            let obsNovaIcon = '';
            if (item.observacoes) {
                obsNovaIcon = ` <i class="ph ph-chat-text" style="color:#d97706;cursor:pointer;font-size:1.1rem;margin-left:4px;vertical-align:middle;" title="${item.observacoes.replace(/"/g,'&quot;')}" onclick="alert('Observação (Cadastro):\\n\\n${item.observacoes.replace(/'/g,"\\'").replace(/\n/g,'\\n')}')"></i>`;
            }

            return `<tr style="background:${bg};border-bottom:1px solid #e2e8f0;">
                <td style="padding:0.6rem 0.5rem;text-align:center;">
                    <input type="checkbox" class="mn-prev-cb mn-prev-cb-cat-${catKey}" data-id="${item.id}" data-cat-id="${item.servico_catalogo_id}" data-nome="${nomeSafe}" onchange="window.mnPrevCbChanged()" style="width:15px;height:15px;cursor:pointer;">
                </td>
                <td style="padding:0.6rem 0.9rem;">
                    <div style="display:flex;align-items:center;gap:6px;">
                        <i class="ph ph-${icone}" style="color:${cor};font-size:1rem;"></i>
                        <span style="font-weight:600;color:#1e293b;font-size:0.85rem;">${nome}</span>${obsNovaIcon}
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
                            ? `<button title="Finalizar manutenção" onclick="window.mnConcluirIndividual(${item.id}, ${item.servico_catalogo_id}, '${nomeSafe}')" style="background:#16a34a;color:#fff;border:none;border-radius:6px;padding:0 10px;height:28px;cursor:pointer;display:flex;align-items:center;gap:4px;font-size:0.72rem;font-weight:700;white-space:nowrap;"><i class="ph ph-check-circle"></i> Finalizar</button>`
                            : (item.status === 'agendada'
                                ? `<button onclick="window.mnIniciarManutencao(${item.id}, '${nomeSafe}')" style="background:#d97706;color:#fff;border:none;border-radius:6px;padding:0 10px;height:28px;cursor:pointer;display:flex;align-items:center;gap:4px;font-size:0.72rem;font-weight:700;white-space:nowrap;" title="Iniciar Manutenção"><i class="ph ph-play"></i> Iniciar</button>
                                   <button onclick="window.mnAgendarIndividual(${item.id}, '${nomeSafe}')" style="background:#7c3aed;color:#fff;border:none;border-radius:6px;padding:0 10px;height:28px;cursor:pointer;display:flex;align-items:center;gap:4px;font-size:0.72rem;font-weight:700;white-space:nowrap;" title="Reagendar"><i class="ph ph-calendar-plus"></i> Agendar</button>`
                                : `<button onclick="window.mnAgendarIndividual(${item.id}, '${nomeSafe}')" style="background:#7c3aed;color:#fff;border:none;border-radius:6px;padding:0 10px;height:28px;cursor:pointer;display:flex;align-items:center;gap:4px;font-size:0.72rem;font-weight:700;white-space:nowrap;" title="Agendar"><i class="ph ph-calendar-plus"></i> Agendar</button>`)
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
    sub.innerHTML = `
    <!-- Cards de resumo -->
    <div id="mn-corr-cards" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:1rem;"></div>

    <!-- Filtros e tabela -->
    <div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
        <div style="background:#f8fafc;padding:0.75rem 1rem;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <i class="ph ph-funnel" style="color:#d97706;"></i>
            <select id="mn-corr-veiculo" onchange="window.mnCarregarCorretivas()" style="padding:6px 10px;border:1px solid #cbd5e1;border-radius:8px;font-size:0.85rem;outline:none;background:#fff;">
                <option value="">Todos os Veículos</option>${veicOpts}
            </select>
            <select id="mn-corr-status" onchange="window.mnCarregarCorretivas()" style="padding:6px 10px;border:1px solid #cbd5e1;border-radius:8px;font-size:0.85rem;outline:none;background:#fff;">
                <option value="">Todos Status</option>
                <option value="agendada" style="color:#d97706;font-weight:700;">Novo</option>
                <option value="em_andamento" style="color:#dc2626;font-weight:700;">Em Andamento</option>
                <option value="aguardando" style="color:#2563eb;font-weight:700;">Aguardando</option>
                <option value="concluida" style="color:#10b981;font-weight:700;">Concluído</option>
                <option value="cancelada">Cancelada</option>
            </select>
            <button onclick="window.mnCarregarCorretivas()" style="padding:6px 12px;background:#d97706;color:#fff;border:none;border-radius:8px;font-size:0.8rem;cursor:pointer;display:flex;align-items:center;gap:4px;">
                <i class="ph ph-arrows-clockwise"></i> Atualizar
            </button>
            <span id="mn-corr-count" style="margin-left:auto;font-size:0.8rem;color:#94a3b8;"></span>
        </div>
        <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
            <thead><tr style="background:#f1f5f9;border-bottom:2px solid #e2e8f0;">
                <th style="padding:10px 12px;text-align:left;color:#475569;font-weight:700;">Veículo</th>
                <th style="padding:10px 12px;text-align:left;color:#475569;font-weight:700;">Defeito / Problema</th>
                <th style="padding:10px 12px;text-align:center;color:#475569;font-weight:700;">Status</th>
                <th style="padding:10px 12px;text-align:center;color:#475569;font-weight:700;">Data Início</th>
                <th style="padding:10px 12px;text-align:center;color:#475569;font-weight:700;">⏱ Dias Parado</th>
                <th style="padding:10px 12px;text-align:center;color:#475569;font-weight:700;">Data Conclusão</th>
                <th style="padding:10px 12px;text-align:center;color:#475569;font-weight:700;">Fornecedor</th>
                <th style="padding:10px 12px;text-align:right;color:#475569;font-weight:700;">R$ Peças</th>
                <th style="padding:10px 12px;text-align:right;color:#475569;font-weight:700;">R$ Mão de obra</th>
                <th style="padding:10px 12px;text-align:right;color:#475569;font-weight:700;">R$ Total</th>
                <th style="padding:10px 12px;text-align:center;color:#475569;font-weight:700;">Ações</th>
            </tr></thead>
            <tbody id="mn-corr-tbody">
                <tr><td colspan="11" style="padding:2rem;text-align:center;color:#94a3b8;">
                    <i class="ph ph-circle-notch ph-spin" style="font-size:1.5rem;"></i>
                </td></tr>
            </tbody>
        </table>
        </div>
    </div>`;
    window.mnCarregarCorretivas();
}

window.mnCarregarCorretivas = async function() {
    const tok = window._manutTok || window.currentToken || localStorage.getItem('token');
    const fV = document.getElementById('mn-corr-veiculo')?.value || '';
    const fS = document.getElementById('mn-corr-status')?.value || '';
    let url = '/api/frota/manutencoes/corretivas';
    const params = [];
    if (fV) params.push('veiculo_id=' + fV);
    if (fS) params.push('status=' + fS);
    if (params.length) url += '?' + params.join('&');
    try {
        const r = await fetch(url, { headers: { Authorization: 'Bearer ' + tok } });
        const lista = await r.json();
        window._mnCorrDados = Array.isArray(lista) ? lista : [];
        _mnRenderCorretivaDados(window._mnCorrDados);
    } catch(e) {
        const tbody = document.getElementById('mn-corr-tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="11" style="padding:1.5rem;text-align:center;color:#dc2626;">Erro ao carregar manutenções corretivas.</td></tr>';
    }
};

function _mnRenderCorretivaDados(lista) {
    const cardsEl = document.getElementById('mn-corr-cards');
    if (cardsEl) {
        const emAndamento = lista.filter(m => m.status === 'em_andamento').length;
        const agendadas   = lista.filter(m => m.status === 'agendada').length;
        const mesAtual    = new Date().toISOString().slice(0, 7);
        const concluidasMes = lista.filter(m => m.status === 'concluida' && (m.data_conclusao || '').startsWith(mesAtual)).length;
        const maxDias     = lista.filter(m => m.status === 'em_andamento').reduce((mx, m) => Math.max(mx, m.dias_parado || 0), 0);
        cardsEl.innerHTML = [
            { cor: '#dc2626', bg: '#fef2f2', icone: 'ph-wrench',        label: 'Em Andamento',         val: emAndamento },
            { cor: '#d97706', bg: '#fffbeb', icone: 'ph-calendar-plus', label: 'Novos',                 val: agendadas },
            { cor: '#2563eb', bg: '#eff6ff', icone: 'ph-hourglass',     label: 'Aguardando',            val: lista.filter(m => m.status === 'aguardando').length },
            { cor: '#10b981', bg: '#ecfdf5', icone: 'ph-check-circle',  label: 'Concluídas este mês',   val: concluidasMes },
            { cor: '#7c3aed', bg: '#f5f3ff', icone: 'ph-clock',         label: 'Máx. dias parado',      val: maxDias + ' dia' + (maxDias !== 1 ? 's' : '') },
        ].map(c => `
            <div style="background:${c.bg};border:1px solid ${c.cor}30;border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:12px;">
                <div style="background:${c.cor}18;border-radius:10px;width:42px;height:42px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="ph ${c.icone}" style="color:${c.cor};font-size:1.3rem;"></i>
                </div>
                <div>
                    <div style="font-size:1.4rem;font-weight:800;color:${c.cor};">${c.val}</div>
                    <div style="font-size:0.75rem;color:#64748b;font-weight:600;">${c.label}</div>
                </div>
            </div>`).join('');
    }

    const count = document.getElementById('mn-corr-count');
    if (count) count.textContent = lista.length + ' registro' + (lista.length !== 1 ? 's' : '');

    const statusCor = { agendada:'#d97706', em_andamento:'#dc2626', aguardando:'#2563eb', concluida:'#10b981', cancelada:'#94a3b8' };
    const statusLbl = { agendada:'Novo', em_andamento:'Em Andamento', aguardando:'Aguardando', concluida:'Concluído', cancelada:'Cancelada' };
    const fmtD = d => {
        if (!d) return '<span style="color:#94a3b8;">—</span>';
        const p = d.split('T')[0].split('-');
        return `<span style="font-weight:600;">${p[2]}/${p[1]}/${(p[0]||'').slice(2)}</span>`;
    };

    const tbody = document.getElementById('mn-corr-tbody');
    if (!tbody) return;

    if (!lista.length) {
        tbody.innerHTML = '<tr><td colspan="11" style="padding:2.5rem;text-align:center;color:#94a3b8;"><i class="ph ph-wrench" style="font-size:2rem;display:block;margin-bottom:8px;"></i>Nenhuma manutenção corretiva encontrada.</td></tr>';
        return;
    }

    tbody.innerHTML = lista.map((m, i) => {
        const bgRow = i % 2 === 0 ? '#fff' : '#fafafa';
        const sKey = m.status || 'agendada';
        const statusBadge = `<span style="background:${statusCor[sKey]||'#94a3b8'}22;color:${statusCor[sKey]||'#94a3b8'};padding:2px 10px;border-radius:20px;font-size:0.75rem;font-weight:700;white-space:nowrap;">${statusLbl[sKey]||sKey}</span>`;

        const dias = m.dias_parado || 0;
        const diasCor = dias >= 7 ? '#dc2626' : dias >= 3 ? '#d97706' : '#10b981';
        const diasBadge = sKey === 'agendada'
            ? '<span style="color:#d97706;font-size:0.8rem;font-weight:700;">Novo</span>'
            : `<span style="background:${diasCor}18;color:${diasCor};padding:2px 10px;border-radius:20px;font-size:0.8rem;font-weight:700;">${dias} dia${dias !== 1 ? 's' : ''}</span>`;

        let acoes = '';
        acoes += '<button onclick="window.mnCorrEditarInterno(' + m.id + ')" style="background:#2563eb;color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:0.75rem;cursor:pointer;font-weight:600;white-space:nowrap;display:inline-flex;align-items:center;gap:3px;"><i class="ph ph-pencil-simple"></i> Editar</button>';
        if (sKey !== 'concluida' && sKey !== 'cancelada') {
            acoes += ' <button title="Cancelar manutenção" onclick="window.mnCorrCancelarInterno(' + m.id + ')" style="background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;font-size:0.75rem;cursor:pointer;display:inline-flex;align-items:center;"><i class="ph ph-x"></i></button>';
        }

        return `<tr style="background:${bgRow};border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background='#fefce8'" onmouseout="this.style.background='${bgRow}'">
            <td style="padding:10px 12px;font-weight:700;color:#1e293b;white-space:nowrap;">${m.placa||'—'}<br><span style="font-size:0.72rem;font-weight:400;color:#64748b;">${(m.tipo_veiculo||'').toLowerCase()}</span></td>
            <td style="padding:10px 12px;max-width:220px;"><span title="${(m.descricao||'').replace(/"/g,'&quot;')}" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${m.descricao||'—'}</span></td>
            <td style="padding:10px 12px;text-align:center;">${statusBadge}</td>
            <td style="padding:10px 12px;text-align:center;">${fmtD(m.data_inicio)}</td>
            <td style="padding:10px 12px;text-align:center;">${diasBadge}</td>
            <td style="padding:10px 12px;text-align:center;">${fmtD(m.data_conclusao)}</td>
            <td style="padding:10px 12px;text-align:center;color:#64748b;">${m.fornecedor||'—'}</td>
            <td style="padding:10px 12px;text-align:right;color:#2563eb;font-weight:600;white-space:nowrap;">${window._mnFmtR(m.custo_pecas)}</td>
            <td style="padding:10px 12px;text-align:right;color:#d97706;font-weight:600;white-space:nowrap;">${window._mnFmtR(m.custo_mao_obra)}</td>
            <td style="padding:10px 12px;text-align:right;color:#10b981;font-weight:700;white-space:nowrap;">${window._mnFmtR(m.custo)}</td>
            <td style="padding:10px 12px;text-align:center;"><div style="display:flex;gap:4px;align-items:center;justify-content:center;">${acoes}</div></td>
        </tr>`;
    }).join('');
}

window.mnCorrAcaoInterno = async function(id, status) {
    const labels = { em_andamento: 'iniciar', cancelada: 'cancelar' };
    if (!confirm(`Deseja ${labels[status]||'atualizar'} esta manutenção?`)) return;
    const tok = window._manutTok || window.currentToken || localStorage.getItem('token');
    try {
        const r = await fetch(`/api/frota/manutencoes/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
            body: JSON.stringify({ status })
        });
        if (!r.ok) throw new Error((await r.json()).error || 'Erro');
        if (typeof mostrarToastAviso === 'function') mostrarToastAviso('✅ Status atualizado!');
        window.mnCarregarCorretivas();
    } catch(e) { if (typeof mostrarToastAviso === 'function') mostrarToastAviso('❌ ' + e.message); }
};

window.mnCorrConcluirInterno = function(id) {
    let modal = document.getElementById('mn-corr-concl-modal');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'mn-corr-concl-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;';
    modal.innerHTML = `
    <div style="background:#fff;border-radius:14px;width:100%;max-width:400px;box-shadow:0 20px 50px rgba(0,0,0,0.2);">
        <div style="background:linear-gradient(135deg,#065f46,#10b981);padding:16px 20px;border-radius:14px 14px 0 0;display:flex;align-items:center;gap:10px;">
            <i class="ph ph-check-circle" style="color:#fff;font-size:1.4rem;"></i>
            <span style="color:#fff;font-weight:700;font-size:1rem;">Concluir Manutenção</span>
            <button onclick="document.getElementById('mn-corr-concl-modal').remove()" style="margin-left:auto;background:rgba(255,255,255,0.15);border:none;border-radius:50%;width:28px;height:28px;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;"><i class="ph ph-x"></i></button>
        </div>
        <div style="padding:20px;">
            <div style="margin-bottom:12px;"><label style="font-size:0.8rem;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">KM na Manutenção</label>
                <input type="number" id="mn-corri-km" placeholder="Ex: 45000" style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;outline:none;box-sizing:border-box;"></div>
            <div style="margin-bottom:12px;"><label style="font-size:0.8rem;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">Custo (R$)</label>
                <input type="number" step="0.01" id="mn-corri-custo" placeholder="Ex: 350.00" style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;outline:none;box-sizing:border-box;"></div>
            <div style="margin-bottom:12px;"><label style="font-size:0.8rem;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">Fornecedor</label>
                <input type="text" id="mn-corri-forn" placeholder="Ex: Oficina Central" style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;outline:none;box-sizing:border-box;"></div>
            <div style="margin-bottom:18px;"><label style="font-size:0.8rem;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">Observações</label>
                <textarea id="mn-corri-obs" rows="2" placeholder="O que foi feito..." style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;outline:none;resize:vertical;font-family:inherit;box-sizing:border-box;"></textarea></div>
            <div style="display:flex;gap:8px;justify-content:flex-end;">
                <button onclick="document.getElementById('mn-corr-concl-modal').remove()" style="padding:9px 18px;border:1.5px solid #e2e8f0;border-radius:8px;background:#fff;color:#64748b;cursor:pointer;font-weight:600;">Cancelar</button>
                <button onclick="window._mnCorrSalvarConclInterno(${id})" style="padding:9px 20px;border:none;border-radius:8px;background:#10b981;color:#fff;cursor:pointer;font-weight:700;display:flex;align-items:center;gap:6px;"><i class="ph ph-check"></i> Salvar Conclusão</button>
            </div>
        </div>
    </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
};

window._mnCorrSalvarConclInterno = async function(id) {
    const tok = window._manutTok || window.currentToken || localStorage.getItem('token');
    const km = document.getElementById('mn-corri-km')?.value;
    const custo = document.getElementById('mn-corri-custo')?.value;
    const fornecedor = document.getElementById('mn-corri-forn')?.value;
    const observacoes = document.getElementById('mn-corri-obs')?.value;
    try {
        const r = await fetch(`/api/frota/manutencoes/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
            body: JSON.stringify({ status: 'concluida', km_na_manutencao: km||null, custo: custo||null, fornecedor: fornecedor||null, observacoes: observacoes||null })
        });
        if (!r.ok) throw new Error((await r.json()).error || 'Erro');
        document.getElementById('mn-corr-concl-modal')?.remove();
        if (typeof mostrarToastAviso === 'function') mostrarToastAviso('✅ Manutenção concluída!');
        window.mnCarregarCorretivas();
    } catch(e) { if (typeof mostrarToastAviso === 'function') mostrarToastAviso('❌ ' + e.message); }
};

window.mnCorrCancelarInterno = function(id) {
    window.mnCorrAcaoInterno(id, 'cancelada');
};

window._mnFmtR = function(v) {
    var n = Number(v);
    if (v == null || v === '' || !isFinite(n) || n <= 0) return '—';
    return 'R$\u00a0' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
};

window._MN_STATUS = [
    { v: 'agendada',     l: 'Novo',         c: '#d97706' },
    { v: 'em_andamento', l: 'Em andamento', c: '#dc2626' },
    { v: 'aguardando',   l: 'Aguardando',   c: '#2563eb' },
    { v: 'concluida',    l: 'Concluído',    c: '#10b981' }
];

window._mnEdEsc = function(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
};

window._mnNum = function(v) {
    var t = String(v == null ? '' : v).trim();
    if (!t) return 0;
    if (t.indexOf(',') !== -1) t = t.replace(/\./g, '').replace(',', '.');
    var n = parseFloat(t);
    return isFinite(n) && n > 0 ? n : 0;
};

window._mnMoneyFmt = function(n) {
    return Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Mascara de dinheiro no formato 00,00 (os digitos entram pelos centavos)
window._mnMask = function(el, cb) {
    el.setAttribute('inputmode', 'numeric');
    el.addEventListener('focus', function() { try { el.select(); } catch (e) {} });
    el.addEventListener('input', function() {
        var d = el.value.replace(/\D/g, '');
        var n = d ? parseInt(d, 10) / 100 : 0;
        el.value = window._mnMoneyFmt(n);
        if (cb) cb(n);
    });
};

// quantidade x valor unitario = total (o campo editado manda)
window._mnCalcPeca = function(o, campo) {
    var q = window._mnNum(o.quantidade), u = window._mnNum(o.valor_unit), t = window._mnNum(o.valor_total);
    if (campo === 'valor_total') {
        if (q > 0) o.valor_unit = Math.round(t / q * 10000) / 10000;
        o.valor_total = t;
    } else {
        o.valor_total = Math.round(q * u * 100) / 100;
    }
};

window._mnGarantirDatalist = function() {
    if (document.getElementById('mn-unidades')) return;
    var dl = document.createElement('datalist');
    dl.id = 'mn-unidades';
    dl.innerHTML = ['UN', 'PC', 'JG', 'KT', 'LT', 'CX', 'KG', 'M', 'PAR', 'CJ'].map(function(u) { return '<option value="' + u + '">'; }).join('');
    document.body.appendChild(dl);
};

window._mnFmtMoeda = function(n) {
    return 'R$\u00a0' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
};

// Garantia conta a partir da data de conclusao da manutencao
window._mnGarantiaAte = function(dataConclusao, valor, unidade, status) {
    var v = parseInt(valor);
    if (!(v > 0)) return null;
    var uni = unidade === 'meses' ? 'meses' : 'dias';
    var rotulo = v + ' ' + (uni === 'meses' ? (v === 1 ? 'mês' : 'meses') : (v === 1 ? 'dia' : 'dias'));
    if (status !== 'concluida' || !dataConclusao) {
        return { txt: 'Garantia de ' + rotulo + ' — conta a partir da conclusão da manutenção', cor: '#64748b' };
    }
    var d = new Date(String(dataConclusao).split('T')[0] + 'T00:00:00');
    if (isNaN(d.getTime())) return null;
    if (uni === 'meses') d.setMonth(d.getMonth() + v); else d.setDate(d.getDate() + v);
    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    var dd = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getFullYear()).slice(2);
    if (d >= hoje) return { txt: 'Garantia de ' + rotulo + ' — válida até ' + dd, cor: '#059669' };
    return { txt: 'Garantia de ' + rotulo + ' — vencida em ' + dd, cor: '#dc2626' };
};

window.mnCorrEditarInterno = async function(id) {
    var tok = window._manutTok || window.currentToken || localStorage.getItem('token');
    var hdr = { Authorization: 'Bearer ' + tok };
    var det;
    try {
        var r = await fetch('/api/frota/manutencoes/' + id + '/detalhe', { headers: hdr });
        if (!r.ok) throw new Error('Erro ao carregar a manutenção');
        det = await r.json();
        var rc = await fetch('/api/frota/catalogo', { headers: hdr });
        if (rc.ok) window._manutCatalogo = await rc.json();
    } catch (e) { alert(e.message); return; }
    var m = det.manutencao;
    window._mnEd = {
        id: id,
        m: m,
        status: m.status || 'agendada',
        solicitados: (det.solicitados || []).map(function(s) { return s.nome; }),
        realizados: (det.realizados || []).map(function(s) {
            return { id: s.id, nome: s.nome, catalogo_id: s.catalogo_id, item_ref: s.item_ref, mao_obra: s.mao_obra || '', garantia_valor: s.garantia_valor || '', garantia_unidade: s.garantia_unidade || 'dias' };
        }),
        pecas: det.pecas || [],
        notas: det.notas || []
    };
    window._mnEdMontar();
};

window._mnEdFechar = function() {
    var el = document.getElementById('mn-corr-edit-modal'); if (el) el.remove();
    var pop = document.getElementById('mned-lista-pop'); if (pop) pop.remove();
};

window._mnEdMontar = function() {
    var ed = window._mnEd, m = ed.m, esc = window._mnEdEsc;
    window._mnEdFechar();
    var lbl = 'font-size:0.78rem;font-weight:700;color:#64748b;display:block;margin-bottom:4px;';
    var inp = 'width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;outline:none;box-sizing:border-box;font-family:inherit;background:#fff;';
    var sec = 'border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin-bottom:14px;background:#fff;';
    var secT = 'font-size:0.8rem;font-weight:800;color:#1e293b;text-transform:uppercase;letter-spacing:.04em;display:flex;align-items:center;gap:6px;';
    var btnSec = 'padding:6px 12px;border:1.5px solid #cbd5e1;border-radius:8px;background:#fff;color:#475569;cursor:pointer;font-weight:600;font-size:0.78rem;display:inline-flex;align-items:center;gap:5px;';
    var modal = document.createElement('div');
    modal.id = 'mn-corr-edit-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;';
    modal.innerHTML =
        '<div style="background:#f8fafc;border-radius:14px;width:100%;max-width:940px;max-height:94vh;display:flex;flex-direction:column;box-shadow:0 20px 50px rgba(0,0,0,0.25);">'
      + '<div style="background:linear-gradient(135deg,#1e293b,#334155);padding:16px 20px;border-radius:14px 14px 0 0;display:flex;align-items:center;gap:10px;flex-shrink:0;">'
      + '<i class="ph ph-pencil-simple" style="color:#fff;font-size:1.3rem;"></i>'
      + '<div><div style="color:#fff;font-weight:700;font-size:1rem;">Editar Manutenção</div><div style="color:rgba(255,255,255,0.7);font-size:0.8rem;">' + esc(m.placa || '') + '</div></div>'
      + '<button type="button" id="mned-x" title="Fechar" style="margin-left:auto;background:rgba(255,255,255,0.15);border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;"><i class="ph ph-x"></i></button>'
      + '</div>'
      + '<div style="padding:18px 20px;overflow-y:auto;flex:1;">'
      +   '<div style="margin-bottom:14px;"><label style="' + lbl + '">Defeito / Problema</label><div style="font-size:0.85rem;color:#334155;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;">' + esc(m.descricao || '—') + '</div></div>'
      +   '<div style="margin-bottom:14px;"><label style="' + lbl + '">Status *</label><div id="mned-status" style="display:flex;gap:8px;flex-wrap:wrap;"></div></div>'
      +   '<div style="display:grid;grid-template-columns:1fr 2fr;gap:12px;margin-bottom:14px;">'
      +     '<div><label style="' + lbl + '">KM na manutenção</label><input type="number" id="mned-km" placeholder="Ex: 45000" value="' + esc(m.km_na_manutencao || '') + '" style="' + inp + '"></div>'
      +     '<div><label style="' + lbl + '">Fornecedor / Oficina</label><input type="text" id="mned-forn" placeholder="Ex: Oficina Central" value="' + esc(m.fornecedor || '') + '" style="' + inp + '"></div>'
      +   '</div>'
      +   '<div style="' + sec + '">'
      +     '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;"><div style="' + secT + '"><i class="ph ph-list-checks" style="color:#d97706;"></i> Manutenções solicitadas</div><button type="button" id="mned-alt-lista" style="margin-left:auto;' + btnSec + '"><i class="ph ph-pencil-simple"></i> Alterar lista</button></div>'
      +     '<div id="mned-solic" style="display:flex;flex-wrap:wrap;gap:6px;"></div>'
      +   '</div>'
      +   '<div style="' + sec + '">'
      +     '<div style="' + secT + 'margin-bottom:10px;"><i class="ph ph-wrench" style="color:#d97706;"></i> Serviços realizados</div>'
      +     '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">'
      +       '<select id="mned-add-sel" style="' + inp + 'flex:1;min-width:260px;width:auto;"></select>'
      +       '<input type="text" id="mned-add-outro" placeholder="Digite o serviço realizado" style="' + inp + 'flex:1;min-width:200px;width:auto;display:none;">'
      +       '<button type="button" id="mned-add-btn" style="padding:8px 14px;border:none;border-radius:8px;background:#d97706;color:#fff;cursor:pointer;font-weight:700;font-size:0.82rem;display:inline-flex;align-items:center;gap:5px;"><i class="ph ph-plus"></i> Adicionar serviço</button>'
      +     '</div>'
      +     '<div id="mned-serv"></div>'
      +   '</div>'
      +   '<div style="' + sec + '">'
      +     '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;"><div style="' + secT + '"><i class="ph ph-receipt" style="color:#2563eb;"></i> Peças e notas fiscais</div><button type="button" id="mned-pecas-geral" style="margin-left:auto;' + btnSec + '"><i class="ph ph-plus"></i> Incluir peças</button></div>'
      +     '<div id="mned-notas"></div>'
      +   '</div>'
      +   '<div id="mned-total" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px;"></div>'
      +   '<div><label style="' + lbl + '">Observações</label><textarea id="mned-obs" rows="3" placeholder="O que foi feito / situação atual..." style="' + inp + 'resize:vertical;">' + esc(m.observacoes || '') + '</textarea></div>'
      + '</div>'
      + '<div style="padding:12px 20px;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:flex-end;background:#fff;border-radius:0 0 14px 14px;flex-shrink:0;">'
      +   '<button type="button" id="mned-cancel" style="padding:9px 18px;border:1.5px solid #e2e8f0;border-radius:8px;background:#fff;color:#64748b;cursor:pointer;font-weight:600;">Cancelar</button>'
      +   '<button type="button" id="mned-save" style="padding:9px 22px;border:none;border-radius:8px;background:#2563eb;color:#fff;cursor:pointer;font-weight:700;display:flex;align-items:center;gap:6px;"><i class="ph ph-floppy-disk"></i> Salvar</button>'
      + '</div>'
      + '</div>';
    document.body.appendChild(modal);

    document.getElementById('mned-x').onclick = window._mnEdFechar;
    document.getElementById('mned-cancel').onclick = window._mnEdFechar;
    modal.addEventListener('mousedown', function(e) { if (e.target === modal) window._mnEdFechar(); });
    document.getElementById('mned-alt-lista').onclick = window._mnEdAbrirLista;
    document.getElementById('mned-add-btn').onclick = window._mnEdAdicionar;
    document.getElementById('mned-save').onclick = function() { window.mnCorrSalvarEdicaoInterno(ed.id); };
    document.getElementById('mned-add-sel').onchange = function() {
        document.getElementById('mned-add-outro').style.display = (this.value === '__outro__') ? 'block' : 'none';
    };

    document.getElementById('mned-pecas-geral').onclick = function() { window._mnEdAbrirPecas(null); };
    window._mnEdRenderStatus();
    window._mnEdRenderSolic();
    window._mnEdRenderAdd();
    window._mnEdRenderServ();
    window._mnEdRenderNotas();
};

window._mnEdRenderStatus = function() {
    var ed = window._mnEd, box = document.getElementById('mned-status');
    if (!box) return;
    var lista = window._MN_STATUS.slice();
    if (ed.m.status === 'cancelada') lista.push({ v: 'cancelada', l: 'Cancelada', c: '#94a3b8' });
    box.innerHTML = lista.map(function(s) {
        var ativo = ed.status === s.v;
        var css = 'padding:8px 18px;border-radius:999px;font-size:0.84rem;font-weight:700;cursor:pointer;transition:all .15s;border:2px solid ' + s.c + ';'
            + (ativo ? 'background:' + s.c + ';color:#fff;box-shadow:0 2px 8px ' + s.c + '66;' : 'background:' + s.c + '18;color:' + s.c + ';');
        return '<button type="button" data-s="' + s.v + '" style="' + css + '">' + (ativo ? '<i class="ph ph-check"></i> ' : '') + s.l + '</button>';
    }).join('');
    box.querySelectorAll('[data-s]').forEach(function(b) {
        b.onclick = function() {
            window._mnEd.status = b.getAttribute('data-s');
            window._mnEdRenderStatus();
            window._mnEdRenderServ();
        };
    });
};

window._mnEdRenderSolic = function() {
    var ed = window._mnEd, box = document.getElementById('mned-solic'), esc = window._mnEdEsc;
    if (!box) return;
    if (!ed.solicitados.length) {
        box.innerHTML = '<span style="font-size:0.82rem;color:#94a3b8;">Nenhum item solicitado. Use "Alterar lista".</span>';
        return;
    }
    box.innerHTML = ed.solicitados.map(function(n) {
        return '<span style="background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:999px;padding:4px 12px;font-size:0.78rem;font-weight:600;">' + esc(n) + '</span>';
    }).join('');
};

window._mnEdRenderAdd = function() {
    var ed = window._mnEd, sel = document.getElementById('mned-add-sel'), esc = window._mnEdEsc;
    if (!sel) return;
    var cat = window._manutCatalogo || [];
    var refs = ed.solicitados.map(function(n) { return n.indexOf('Outros') === 0 ? 'Outros' : n; });
    var sug = cat.filter(function(s) { return s.item_ref && refs.indexOf(s.item_ref) !== -1; });
    var opt = function(s) { return '<option value="' + s.id + '">' + esc(s.nome) + '</option>'; };
    var html = '<option value="">Selecione o serviço realizado...</option>';
    if (sug.length) html += '<optgroup label="★ Sugeridos para os itens solicitados">' + sug.map(opt).join('') + '</optgroup>';
    var grupos = {}, ordem = [];
    cat.forEach(function(s) {
        if (sug.indexOf(s) !== -1) return;
        var k = s.categoria_nome || 'Outros';
        if (!grupos[k]) { grupos[k] = []; ordem.push(k); }
        grupos[k].push(s);
    });
    ordem.sort(function(a, b) {
        var ca = a.indexOf('(Corretiva)') !== -1 ? 0 : 1, cb = b.indexOf('(Corretiva)') !== -1 ? 0 : 1;
        return ca - cb;
    });
    ordem.forEach(function(k) { html += '<optgroup label="' + esc(k) + '">' + grupos[k].map(opt).join('') + '</optgroup>'; });
    html += '<option value="__outro__">✏ Outro serviço (digitar)</option>';
    sel.innerHTML = html;
};

window._mnEdAdicionar = function() {
    var ed = window._mnEd;
    var sel = document.getElementById('mned-add-sel');
    var v = sel.value;
    if (!v) { alert('Selecione o serviço realizado.'); return; }
    var novo;
    if (v === '__outro__') {
        var txt = document.getElementById('mned-add-outro').value.trim();
        if (!txt) { alert('Digite o serviço realizado.'); return; }
        novo = { id: null, nome: txt, catalogo_id: null, item_ref: null };
    } else {
        var s = (window._manutCatalogo || []).find(function(x) { return String(x.id) === String(v); });
        if (!s) return;
        if (ed.realizados.some(function(r) { return String(r.catalogo_id) === String(s.id); })) { alert('Esse serviço já foi adicionado.'); return; }
        novo = { id: null, nome: s.nome, catalogo_id: s.id, item_ref: s.item_ref || null };
    }
    novo.mao_obra = ''; novo.garantia_valor = ''; novo.garantia_unidade = 'dias';
    ed.realizados.push(novo);
    sel.value = '';
    document.getElementById('mned-add-outro').value = '';
    document.getElementById('mned-add-outro').style.display = 'none';
    window._mnEdRenderServ();
};

window._mnEdSvcOptions = function(sel) {
    var ed = window._mnEd, esc = window._mnEdEsc;
    var h = '<option value="">Sem vínculo (geral)</option>';
    ed.realizados.forEach(function(s) {
        if (s.id) h += '<option value="' + s.id + '"' + (String(s.id) === String(sel) ? ' selected' : '') + '>' + esc(s.nome) + '</option>';
    });
    return h;
};

window._mnEdPecaHtml = function(p, i) {
    var esc = window._mnEdEsc, ed = window._mnEd, fm = window._mnMoneyFmt;
    var ipt = 'padding:4px 6px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:0.8rem;outline:none;box-sizing:border-box;font-family:inherit;';
    var g = window._mnGarantiaAte(ed.m.data_conclusao, p.garantia_valor, p.garantia_unidade, ed.status);
    return '<div style="padding:7px 9px;background:#fff;border:1px solid #dbeafe;border-radius:8px;margin-top:6px;">'
      + '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">'
      +   '<i class="ph ph-gear-six" style="color:#2563eb;"></i>'
      +   '<div style="flex:1;min-width:170px;font-size:0.82rem;font-weight:600;color:#1e293b;">' + esc(p.descricao)
      +     (p.codigo ? ' <span style="color:#94a3b8;font-weight:400;">(' + esc(p.codigo) + ')</span>' : '')
      +     (p.nota_id ? ' <i class="ph ph-receipt" title="Veio da nota fiscal" style="color:#2563eb;"></i>' : '') + '</div>'
      +   '<input type="number" min="0" step="1" data-pi="' + i + '" data-pf="quantidade" value="' + esc(p.quantidade) + '" title="Quantidade" style="' + ipt + 'width:66px;">'
      +   '<input type="text" list="mn-unidades" data-pi="' + i + '" data-pf="unidade" value="' + esc(p.unidade) + '" placeholder="Un." title="Unidade de medida" style="' + ipt + 'width:54px;text-transform:uppercase;">'
      +   '<span style="font-size:0.78rem;color:#64748b;">× R$</span>'
      +   '<input type="text" data-money="1" data-pi="' + i + '" data-pf="valor_unit" value="' + fm(p.valor_unit) + '" title="Valor unitário" style="' + ipt + 'width:92px;text-align:right;">'
      +   '<span style="font-size:0.78rem;color:#64748b;">= R$</span>'
      +   '<input type="text" data-money="1" data-pi="' + i + '" data-pf="valor_total" value="' + fm(p.valor_total) + '" title="Total" style="' + ipt + 'width:100px;text-align:right;font-weight:700;color:#2563eb;">'
      +   '<input type="number" min="0" step="1" data-pi="' + i + '" data-pf="garantia_valor" value="' + esc(p.garantia_valor) + '" placeholder="Gar." title="Garantia da peça" style="' + ipt + 'width:56px;">'
      +   '<select data-pi="' + i + '" data-pf="garantia_unidade" style="' + ipt + 'background:#fff;"><option value="dias"' + (p.garantia_unidade !== 'meses' ? ' selected' : '') + '>dias</option><option value="meses"' + (p.garantia_unidade === 'meses' ? ' selected' : '') + '>meses</option></select>'
      +   '<select data-pi="' + i + '" data-pf="servico_id" title="Serviço ao qual a peça pertence" style="' + ipt + 'background:#fff;max-width:170px;">' + window._mnEdSvcOptions(p.servico_id) + '</select>'
      +   '<button type="button" data-prm="' + i + '" title="Remover peça" style="padding:4px 8px;border:1px solid #fecaca;border-radius:6px;background:#fef2f2;color:#dc2626;cursor:pointer;"><i class="ph ph-trash"></i></button>'
      + '</div>'
      + (g ? '<div style="margin-top:4px;font-size:0.72rem;font-weight:600;color:' + g.cor + ';"><i class="ph ph-shield-check"></i> Peça: ' + g.txt + '</div>' : '')
      + '</div>';
};

window._mnEdRenderServ = function() {
    var ed = window._mnEd, box = document.getElementById('mned-serv'), esc = window._mnEdEsc, fm = window._mnMoneyFmt;
    if (!box) return;
    window._mnGarantirDatalist();
    var temServico = function(sid) { return ed.realizados.some(function(s) { return s.id && String(s.id) === String(sid); }); };
    var orfas = [];
    ed.pecas.forEach(function(p, i) { if (!p.servico_id || !temServico(p.servico_id)) orfas.push(i); });
    if (!ed.realizados.length && !orfas.length) {
        box.innerHTML = '<div style="padding:14px;text-align:center;color:#94a3b8;font-size:0.82rem;">Nenhum serviço realizado informado ainda. Escolha um serviço acima e clique em "Adicionar serviço".</div>';
        window._mnEdRenderTotais();
        return;
    }
    var lbl = 'font-size:0.7rem;font-weight:700;color:#64748b;display:block;margin-bottom:2px;';
    var ipt = 'padding:6px 8px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;outline:none;box-sizing:border-box;font-family:inherit;';
    var btnPeca = 'padding:5px 12px;border:1.5px solid #2563eb;border-radius:8px;background:#eff6ff;color:#2563eb;cursor:pointer;font-weight:700;font-size:0.76rem;display:inline-flex;align-items:center;gap:5px;';
    var html = ed.realizados.map(function(s, i) {
        var g = window._mnGarantiaAte(ed.m.data_conclusao, s.garantia_valor, s.garantia_unidade, ed.status);
        var pecasHtml = '';
        if (s.id) {
            ed.pecas.forEach(function(p, pi) { if (String(p.servico_id) === String(s.id)) pecasHtml += window._mnEdPecaHtml(p, pi); });
        }
        return '<div style="border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;margin-bottom:8px;background:#f8fafc;">'
          + '<div style="display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap;">'
          +   '<div style="flex:1;min-width:220px;"><div style="font-weight:700;color:#1e293b;font-size:0.87rem;">' + esc(s.nome) + '</div>' + (s.item_ref ? '<div style="font-size:0.72rem;color:#94a3b8;">Item: ' + esc(s.item_ref) + '</div>' : '') + '</div>'
          +   '<div><label style="' + lbl + '">Mão de obra (R$)</label><input type="text" data-money="1" data-i="' + i + '" data-f="mao_obra" value="' + fm(window._mnNum(s.mao_obra)) + '" placeholder="0,00" style="' + ipt + 'width:130px;text-align:right;"></div>'
          +   '<div><label style="' + lbl + '">Garantia do serviço</label><div style="display:flex;gap:4px;"><input type="number" min="0" step="1" data-i="' + i + '" data-f="garantia_valor" value="' + esc(s.garantia_valor) + '" placeholder="0" style="' + ipt + 'width:70px;"><select data-i="' + i + '" data-f="garantia_unidade" style="' + ipt + 'background:#fff;"><option value="dias"' + (s.garantia_unidade !== 'meses' ? ' selected' : '') + '>dias</option><option value="meses"' + (s.garantia_unidade === 'meses' ? ' selected' : '') + '>meses</option></select></div></div>'
          +   '<button type="button" data-rm="' + i + '" title="Remover serviço" style="padding:7px 10px;border:1px solid #fecaca;border-radius:8px;background:#fef2f2;color:#dc2626;cursor:pointer;"><i class="ph ph-trash"></i></button>'
          + '</div>'
          + (g ? '<div style="margin-top:6px;font-size:0.74rem;font-weight:600;color:' + g.cor + ';"><i class="ph ph-shield-check"></i> ' + g.txt + '</div>' : '')
          + pecasHtml
          + '<div style="margin-top:8px;">' + (s.id
                ? '<button type="button" data-ip="' + s.id + '" style="' + btnPeca + '"><i class="ph ph-plus"></i> Incluir peças</button>'
                : '<button type="button" data-ipn="' + i + '" style="' + btnPeca + '"><i class="ph ph-plus"></i> Incluir peças</button>') + '</div>'
          + '</div>';
    }).join('');
    if (orfas.length) {
        html += '<div style="border:1px dashed #cbd5e1;border-radius:10px;padding:10px 12px;margin-bottom:8px;background:#fff;">'
          + '<div style="font-weight:700;color:#475569;font-size:0.82rem;"><i class="ph ph-gear-six" style="color:#2563eb;"></i> Peças sem serviço vinculado</div>'
          + orfas.map(function(pi) { return window._mnEdPecaHtml(ed.pecas[pi], pi); }).join('') + '</div>';
    }
    box.innerHTML = html;

    box.querySelectorAll('[data-f]').forEach(function(el) {
        var i = parseInt(el.getAttribute('data-i')), f = el.getAttribute('data-f');
        if (f === 'mao_obra') {
            window._mnMask(el, function(n) {
                window._mnEd.realizados[i].mao_obra = n;
                window._mnEdRenderTotais();
            });
            return;
        }
        el.oninput = function() { window._mnEd.realizados[i][f] = el.value; };
        el.onchange = function() {
            window._mnEd.realizados[i][f] = el.value;
            window._mnEdRenderServ();
        };
    });
    box.querySelectorAll('[data-rm]').forEach(function(b) {
        b.onclick = function() {
            var i = parseInt(b.getAttribute('data-rm'));
            var rem = window._mnEd.realizados[i];
            if (rem && rem.id) window._mnEd.pecas.forEach(function(p) { if (String(p.servico_id) === String(rem.id)) p.servico_id = null; });
            window._mnEd.realizados.splice(i, 1);
            window._mnEdRenderServ();
        };
    });
    box.querySelectorAll('[data-ip]').forEach(function(b) {
        b.onclick = function() { window._mnEdAbrirPecas(parseInt(b.getAttribute('data-ip'))); };
    });
    box.querySelectorAll('[data-ipn]').forEach(function(b) {
        b.onclick = async function() {
            var i = parseInt(b.getAttribute('data-ipn'));
            try { await window._mnEdSalvarDetalhe(); } catch (e) { alert(e.message); return; }
            var s2 = window._mnEd.realizados[i];
            window._mnEdAbrirPecas(s2 ? s2.id : null);
        };
    });
    box.querySelectorAll('[data-pf]').forEach(function(el) {
        var i = parseInt(el.getAttribute('data-pi')), f = el.getAttribute('data-pf');
        var dinheiro = el.hasAttribute('data-money');
        var aplicar = function() {
            var p = window._mnEd.pecas[i];
            if (!p) return;
            if (f === 'servico_id') p[f] = el.value ? parseInt(el.value) : null;
            else if (dinheiro) p[f] = window._mnNum(el.value);
            else if (f === 'unidade') p[f] = el.value.toUpperCase();
            else p[f] = el.value;
            if (f === 'quantidade' || f === 'valor_unit' || f === 'valor_total') {
                window._mnCalcPeca(p, f);
                var u = box.querySelector('[data-pi="' + i + '"][data-pf="valor_unit"]');
                var t = box.querySelector('[data-pi="' + i + '"][data-pf="valor_total"]');
                if (f !== 'valor_unit' && u) u.value = fm(p.valor_unit);
                if (f !== 'valor_total' && t) t.value = fm(p.valor_total);
                window._mnEdRenderTotais();
            }
        };
        if (dinheiro) { window._mnMask(el, aplicar); return; }
        el.oninput = aplicar;
        if (f === 'garantia_valor' || f === 'garantia_unidade' || f === 'servico_id') el.onchange = function() { aplicar(); window._mnEdRenderServ(); };
    });
    box.querySelectorAll('[data-prm]').forEach(function(b) {
        b.onclick = function() {
            window._mnEd.pecas.splice(parseInt(b.getAttribute('data-prm')), 1);
            window._mnEdRenderServ();
        };
    });
    window._mnEdRenderTotais();
};

window._mnEdRenderNotas = function() {
    var ed = window._mnEd, box = document.getElementById('mned-notas'), esc = window._mnEdEsc;
    if (!box) return;
    if (!ed.notas.length) {
        box.innerHTML = '<div style="font-size:0.8rem;color:#94a3b8;">Nenhuma nota fiscal anexada. Use "Incluir peças" e escolha a aba "Nota fiscal (PDF)".</div>';
        return;
    }
    var btn = 'padding:6px 10px;border-radius:8px;cursor:pointer;';
    box.innerHTML = ed.notas.map(function(n) {
        var emi = n.data_emissao ? ' · ' + esc(n.data_emissao) : '';
        return '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;margin-bottom:6px;">'
          + '<i class="ph ph-receipt" style="color:#2563eb;font-size:1.2rem;"></i>'
          + '<div style="flex:1;font-size:0.82rem;color:#1e293b;"><b>NF ' + esc(n.numero || '—') + '</b> · ' + esc(n.fornecedor || 'Fornecedor não identificado') + emi
          +   (n.valor_total ? ' · <b style="color:#059669;">' + window._mnFmtMoeda(n.valor_total) + '</b>' : '') + '</div>'
          + '<button type="button" data-nv="' + n.id + '" title="Ver nota fiscal" style="' + btn + 'border:1px solid #bfdbfe;background:#eff6ff;color:#2563eb;"><i class="ph ph-eye"></i></button>'
          + '<button type="button" data-nd="' + n.id + '" title="Excluir nota fiscal" style="' + btn + 'border:1px solid #fecaca;background:#fef2f2;color:#dc2626;"><i class="ph ph-trash"></i></button>'
          + '</div>';
    }).join('');
    box.querySelectorAll('[data-nv]').forEach(function(b) { b.onclick = function() { window._mnEdVerNota(parseInt(b.getAttribute('data-nv'))); }; });
    box.querySelectorAll('[data-nd]').forEach(function(b) { b.onclick = function() { window._mnEdExcluirNota(parseInt(b.getAttribute('data-nd'))); }; });
};

window._mnEdRenderTotais = function() {
    var ed = window._mnEd, box = document.getElementById('mned-total');
    if (!box) return;
    var mo = 0, pc = 0;
    ed.realizados.forEach(function(s) { mo += window._mnNum(s.mao_obra); });
    (ed.pecas || []).forEach(function(p) { pc += Number(p.valor_total) || 0; });
    var legado = (!ed.realizados.length && !(ed.pecas || []).length && Number(ed.m.custo) > 0);
    var total = legado ? Number(ed.m.custo) : (mo + pc);
    var card = function(titulo, valor, cor, fundo) {
        return '<div style="background:' + fundo + ';border:1px solid ' + cor + '40;border-radius:12px;padding:12px 14px;"><div style="font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;">' + titulo + '</div><div style="font-size:1.25rem;font-weight:800;color:' + cor + ';">' + window._mnFmtMoeda(valor) + '</div></div>';
    };
    box.innerHTML = card('R$ Peças', pc, '#2563eb', '#eff6ff')
        + card('R$ Mão de obra', mo, '#d97706', '#fffbeb')
        + card('R$ Total', total, '#059669', '#ecfdf5')
        + (legado ? '<div style="grid-column:1/-1;font-size:0.74rem;color:#94a3b8;">Total lançado antes do detalhamento por serviço. Ao informar serviços e mão de obra, o total passa a ser calculado automaticamente.</div>' : '');
};

window._mnEdAbrirLista = function() {
    var grupos = window._LOG_SIN_MANUT_ITENS;
    var ed = window._mnEd, esc = window._mnEdEsc;
    if (!grupos) { alert('Lista de manutenções indisponível. Atualize a página (Ctrl+F5).'); return; }
    var nomesLista = [];
    grupos.forEach(function(g) { g.itens.forEach(function(it) { nomesLista.push(it.nome); }); });
    var marcados = [], extras = [], temOutros = false, textoOutros = '';
    ed.solicitados.forEach(function(n) {
        if (n.indexOf('Outros') === 0) { temOutros = true; textoOutros = n.replace(/^Outros:?\s*/, ''); }
        else if (nomesLista.indexOf(n) === -1) extras.push(n);
        else marcados.push(n);
    });
    var lista = grupos.map(function(g) {
        return '<p style="margin:12px 0 6px;font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">' + esc(g.grupo) + '</p>'
          + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">'
          + g.itens.map(function(it) {
                var chk = (it.nome === 'Outros' ? temOutros : marcados.indexOf(it.nome) !== -1) ? ' checked' : '';
                return '<label style="display:flex;align-items:center;gap:8px;padding:7px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.82rem;cursor:pointer;background:#f8fafc;user-select:none;">'
                  + '<input type="checkbox" data-nome="' + esc(it.nome) + '"' + chk + ' style="width:16px;height:16px;accent-color:#d97706;flex-shrink:0;">'
                  + '<i class="ph ' + it.icone + '" style="font-size:1.05rem;color:#d97706;flex-shrink:0;"></i><span>' + esc(it.nome) + '</span></label>';
            }).join('')
          + '</div>';
    }).join('');
    var pop = document.createElement('div');
    pop.id = 'mned-lista-pop';
    pop.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.6);display:flex;align-items:center;justify-content:center;z-index:10001;padding:16px;';
    pop.innerHTML = '<div style="background:#fff;border-radius:16px;width:100%;max-width:680px;max-height:92vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.3);">'
      + '<div style="background:linear-gradient(135deg,#1e293b,#334155);padding:16px 20px;border-radius:16px 16px 0 0;display:flex;align-items:center;gap:12px;">'
      + '<div style="background:#d97706;border-radius:10px;width:38px;height:38px;display:flex;align-items:center;justify-content:center;"><i class="ph ph-list-checks" style="color:#fff;font-size:1.3rem;"></i></div>'
      + '<div style="color:#fff;font-weight:700;">Manutenções solicitadas</div>'
      + '<button type="button" id="mned-lista-x" style="margin-left:auto;background:rgba(255,255,255,0.15);border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;"><i class="ph ph-x"></i></button>'
      + '</div>'
      + '<div style="padding:16px 20px;">'
      + '<p style="margin:0;font-size:0.8rem;color:#64748b;">Marque os itens que também precisam de manutenção. A alteração também atualiza o sinistro de origem.</p>'
      + lista
      + '<div id="mned-lista-outros" style="display:' + (temOutros ? 'block' : 'none') + ';margin-top:12px;"><textarea id="mned-lista-outros-txt" rows="2" placeholder="Descreva a manutenção de &quot;Outros&quot;..." style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:0.85rem;font-family:inherit;resize:vertical;">' + esc(textoOutros) + '</textarea></div>'
      + '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">'
      + '<button type="button" id="mned-lista-cancel" style="padding:9px 18px;border:1.5px solid #e2e8f0;border-radius:8px;background:#fff;color:#64748b;cursor:pointer;font-weight:600;">Cancelar</button>'
      + '<button type="button" id="mned-lista-ok" style="padding:9px 20px;border:none;border-radius:8px;background:#d97706;color:#fff;cursor:pointer;font-weight:700;"><i class="ph ph-check"></i> Aplicar</button>'
      + '</div></div></div>';
    document.body.appendChild(pop);
    var fechar = function() { var p = document.getElementById('mned-lista-pop'); if (p) p.remove(); };
    document.getElementById('mned-lista-x').onclick = fechar;
    document.getElementById('mned-lista-cancel').onclick = fechar;
    pop.addEventListener('mousedown', function(e) { if (e.target === pop) fechar(); });
    pop.querySelectorAll('input[data-nome]').forEach(function(c) {
        c.onchange = function() {
            var o = pop.querySelector('input[data-nome="Outros"]');
            document.getElementById('mned-lista-outros').style.display = (o && o.checked) ? 'block' : 'none';
        };
    });
    document.getElementById('mned-lista-ok').onclick = function() {
        var sel = [];
        var outrosMarcado = false;
        pop.querySelectorAll('input[data-nome]').forEach(function(c) {
            if (!c.checked) return;
            if (c.getAttribute('data-nome') === 'Outros') outrosMarcado = true; else sel.push(c.getAttribute('data-nome'));
        });
        var txt = document.getElementById('mned-lista-outros-txt').value.trim();
        if (outrosMarcado && !txt) { alert('Descreva a manutenção no campo "Outros".'); return; }
        extras.forEach(function(x) { sel.push(x); });
        if (outrosMarcado) sel.push('Outros: ' + txt);
        window._mnEd.solicitados = sel;
        fechar();
        window._mnEdRenderSolic();
        window._mnEdRenderAdd();
    };
};

window._mnEdTok = function() {
    return window._manutTok || window.currentToken || localStorage.getItem('token');
};

// Salva servicos, mao de obra, garantia e pecas (edicoes) e devolve os ids gravados
window._mnEdSalvarDetalhe = async function() {
    var ed = window._mnEd, N = window._mnNum;
    var r = await fetch('/api/frota/manutencoes/' + ed.id + '/detalhe', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + window._mnEdTok() },
        body: JSON.stringify({
            solicitados: ed.solicitados,
            realizados: ed.realizados.map(function(s) {
                return { id: s.id, nome: s.nome, catalogo_id: s.catalogo_id, item_ref: s.item_ref, mao_obra: N(s.mao_obra), garantia_valor: s.garantia_valor, garantia_unidade: s.garantia_unidade };
            }),
            pecas: ed.pecas.map(function(p) {
                return { id: p.id, codigo: p.codigo, descricao: p.descricao, unidade: p.unidade, quantidade: N(p.quantidade) || 1, valor_unit: N(p.valor_unit), valor_total: N(p.valor_total), garantia_valor: p.garantia_valor, garantia_unidade: p.garantia_unidade, servico_id: p.servico_id };
            })
        })
    });
    if (!r.ok) { var e = await r.json().catch(function() { return {}; }); throw new Error(e.error || 'Erro ao salvar os serviços'); }
    var j = await r.json();
    ed.realizados = (j.realizados || []).map(function(s) {
        return { id: s.id, nome: s.nome, catalogo_id: s.catalogo_id, item_ref: s.item_ref, mao_obra: s.mao_obra || 0, garantia_valor: s.garantia_valor || '', garantia_unidade: s.garantia_unidade || 'dias' };
    });
    ed.pecas = j.pecas || [];
    return j;
};

// Recarrega pecas e notas do servidor (apos incluir/excluir nota ou pecas)
window._mnEdRecarregarDetalhe = async function() {
    var ed = window._mnEd;
    var r = await fetch('/api/frota/manutencoes/' + ed.id + '/detalhe', { headers: { Authorization: 'Bearer ' + window._mnEdTok() } });
    if (!r.ok) throw new Error('Erro ao recarregar a manutenção');
    var d = await r.json();
    ed.pecas = d.pecas || [];
    ed.notas = d.notas || [];
};

// Botao de olho: abre o PDF da nota (stream privado do R2)
window._mnEdVerNota = async function(id) {
    var w = window.open('', '_blank');
    try {
        var r = await fetch('/api/frota/manutencoes/notas/' + id + '/pdf', { headers: { Authorization: 'Bearer ' + window._mnEdTok() } });
        if (!r.ok) { var e = await r.json().catch(function() { return {}; }); throw new Error(e.error || 'Não foi possível abrir a nota'); }
        var blob = await r.blob();
        var url = URL.createObjectURL(blob);
        if (w) w.location.href = url; else window.open(url, '_blank');
    } catch (err) {
        if (w) w.close();
        alert(err.message);
    }
};

window._mnEdExcluirNota = async function(id) {
    if (!confirm('Excluir esta nota fiscal?\n\nAs peças lançadas por ela também serão excluídas. Esta ação não pode ser desfeita.')) return;
    try {
        await window._mnEdSalvarDetalhe();
        var r = await fetch('/api/frota/manutencoes/notas/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + window._mnEdTok() } });
        if (!r.ok) { var e = await r.json().catch(function() { return {}; }); throw new Error(e.error || 'Erro ao excluir a nota'); }
        await window._mnEdRecarregarDetalhe();
        window._mnEdRenderServ();
        window._mnEdRenderNotas();
        if (typeof mostrarToastAviso === 'function') mostrarToastAviso('✅ Nota fiscal excluída.');
    } catch (err) { alert(err.message); }
};

window._mnpFechar = function() {
    var p = document.getElementById('mnp-pop'); if (p) p.remove();
};

window._mnpAposSalvar = async function(msg) {
    await window._mnEdRecarregarDetalhe();
    window._mnpFechar();
    window._mnEdRenderServ();
    window._mnEdRenderNotas();
    if (typeof mostrarToastAviso === 'function') mostrarToastAviso(msg);
};

window._mnpMostrarAba = function(aba) {
    var dig = document.getElementById('mnp-aba-dig'), nf = document.getElementById('mnp-aba-nf');
    var bd = document.getElementById('mnp-tab-dig'), bn = document.getElementById('mnp-tab-nf');
    if (!dig || !nf) return;
    dig.style.display = aba === 'dig' ? 'block' : 'none';
    nf.style.display = aba === 'nf' ? 'block' : 'none';
    var on = 'padding:9px 18px;border:none;border-bottom:3px solid #2563eb;background:#eff6ff;color:#2563eb;font-weight:700;cursor:pointer;font-size:0.85rem;';
    var off = 'padding:9px 18px;border:none;border-bottom:3px solid transparent;background:#fff;color:#64748b;font-weight:600;cursor:pointer;font-size:0.85rem;';
    bd.style.cssText = aba === 'dig' ? on : off;
    bn.style.cssText = aba === 'nf' ? on : off;
};

window._mnpAddLinha = function() {
    var box = document.getElementById('mnp-rows');
    if (!box) return;
    window._mnGarantirDatalist();
    var fm = window._mnMoneyFmt;
    var ipt = 'padding:7px 9px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.83rem;outline:none;box-sizing:border-box;font-family:inherit;background:#fff;';
    var row = document.createElement('div');
    row.className = 'mnp-row';
    row.style.cssText = 'display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:8px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;margin-bottom:8px;';
    row.innerHTML = '<input type="text" data-k="descricao" placeholder="Descrição da peça *" style="' + ipt + 'flex:2;min-width:200px;">'
      + '<input type="number" data-k="quantidade" min="0" step="1" value="1" title="Quantidade" style="' + ipt + 'width:70px;">'
      + '<input type="text" list="mn-unidades" data-k="unidade" value="UN" placeholder="Un." title="Unidade de medida" style="' + ipt + 'width:58px;text-transform:uppercase;">'
      + '<span style="font-size:0.78rem;color:#64748b;">× R$</span>'
      + '<input type="text" data-k="valor_unit" value="0,00" title="Valor unitário" style="' + ipt + 'width:100px;text-align:right;">'
      + '<span style="font-size:0.78rem;color:#64748b;">= R$</span>'
      + '<input type="text" data-k="valor_total" value="0,00" title="Total" style="' + ipt + 'width:108px;text-align:right;font-weight:700;color:#2563eb;">'
      + '<input type="number" data-k="garantia_valor" min="0" step="1" placeholder="Garantia" title="Garantia da peça" style="' + ipt + 'width:84px;">'
      + '<select data-k="garantia_unidade" style="' + ipt + '"><option value="dias">dias</option><option value="meses">meses</option></select>'
      + '<select data-k="servico_id" title="Serviço ao qual a peça pertence" style="' + ipt + 'max-width:210px;">' + window._mnEdSvcOptions(window._mnp.servicoId) + '</select>'
      + '<button type="button" data-x="1" title="Remover linha" style="padding:6px 9px;border:1px solid #fecaca;border-radius:8px;background:#fef2f2;color:#dc2626;cursor:pointer;"><i class="ph ph-trash"></i></button>';
    box.appendChild(row);
    var obj = { quantidade: 1, valor_unit: 0, valor_total: 0 };
    row._obj = obj;
    var q = row.querySelector('[data-k="quantidade"]'), un = row.querySelector('[data-k="valor_unit"]'), tt = row.querySelector('[data-k="valor_total"]');
    var sync = function(campo) {
        window._mnCalcPeca(obj, campo);
        if (campo !== 'valor_unit') un.value = fm(obj.valor_unit);
        if (campo !== 'valor_total') tt.value = fm(obj.valor_total);
    };
    q.addEventListener('input', function() { obj.quantidade = q.value; sync('quantidade'); });
    window._mnMask(un, function(n) { obj.valor_unit = n; sync('valor_unit'); });
    window._mnMask(tt, function(n) { obj.valor_total = n; sync('valor_total'); });
    row.querySelector('[data-x]').onclick = function() { row.remove(); };
};

window._mnpSalvarManual = async function() {
    var ed = window._mnEd, N = window._mnNum;
    var pecas = [];
    document.querySelectorAll('#mnp-rows .mnp-row').forEach(function(r) {
        var g = function(k) { var el = r.querySelector('[data-k="' + k + '"]'); return el ? el.value : ''; };
        var desc = g('descricao').trim();
        if (!desc) return;
        var o = r._obj || {};
        var qtd = N(g('quantidade')) || 1;
        var vu = N(o.valor_unit);
        var vt = N(o.valor_total) || Math.round(qtd * vu * 100) / 100;
        pecas.push({ descricao: desc, unidade: g('unidade').trim().toUpperCase(), quantidade: qtd, valor_unit: vu, valor_total: vt,
                     garantia_valor: g('garantia_valor'), garantia_unidade: g('garantia_unidade'), servico_id: g('servico_id') || null });
    });
    if (!pecas.length) { alert('Informe ao menos uma peça (descrição).'); return; }
    var btn = document.getElementById('mnp-salvar-dig');
    if (btn) btn.disabled = true;
    try {
        var r = await fetch('/api/frota/manutencoes/' + ed.id + '/pecas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + window._mnEdTok() },
            body: JSON.stringify({ pecas: pecas })
        });
        if (!r.ok) { var e = await r.json().catch(function() { return {}; }); throw new Error(e.error || 'Erro ao salvar as peças'); }
        await window._mnpAposSalvar('✅ Peças incluídas!');
    } catch (err) {
        if (btn) btn.disabled = false;
        alert(err.message);
    }
};

window._mnpAnalisar = async function() {
    var ed = window._mnEd, esc = window._mnEdEsc;
    var f = document.getElementById('mnp-file').files[0];
    if (!f) { alert('Selecione o PDF da nota fiscal.'); return; }
    var btn = document.getElementById('mnp-analisar'), res = document.getElementById('mnp-nf-res');
    var original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Analisando...';
    res.innerHTML = '';
    var fd = new FormData();
    fd.append('arquivo', f);
    try {
        var r = await fetch('/api/frota/manutencoes/' + ed.id + '/notas/analisar', { method: 'POST', headers: { Authorization: 'Bearer ' + window._mnEdTok() }, body: fd });
        var j = await r.json().catch(function() { return {}; });
        if (!r.ok) throw new Error(j.error || 'Erro ao analisar a nota');
        var g = j.garantia_sugerida;
        window._mnp.arquivo = f;
        window._mnp.nf = {
            dados: j,
            itens: (j.itens || []).map(function(it) {
                return { sel: true, codigo: it.codigo, descricao: it.descricao, unidade: it.unidade, quantidade: it.quantidade, valor_unit: it.valor_unit, valor_total: it.valor_total,
                         garantia_valor: g ? g.valor : '', garantia_unidade: g ? g.unidade : 'dias', servico_id: window._mnp.servicoId || '' };
            })
        };
        window._mnpRenderNf();
    } catch (err) {
        res.innerHTML = '<div style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:8px;padding:10px 12px;font-size:0.84rem;"><i class="ph ph-warning"></i> ' + esc(err.message) + '</div>';
    } finally {
        btn.disabled = false;
        btn.innerHTML = original;
    }
};

window._mnpTotalSel = function() {
    var nf = window._mnp.nf, t = 0, n = 0;
    nf.itens.forEach(function(i) { if (i.sel) { t += Number(i.valor_total) || 0; n++; } });
    var el = document.getElementById('mnp-sel-total');
    if (el) el.innerHTML = n + ' item(ns) selecionado(s) · <b>' + window._mnFmtMoeda(t) + '</b>';
};

window._mnpRenderNf = function() {
    var nf = window._mnp.nf, d = nf.dados, esc = window._mnEdEsc, res = document.getElementById('mnp-nf-res'), fm = window._mnMoneyFmt;
    if (!res) return;
    window._mnGarantirDatalist();
    var avisos = (d.avisos || []).map(function(a) { return esc(a); }).join('<br>');
    if (!nf.itens.length) {
        res.innerHTML = '<div style="background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:8px;padding:10px 12px;font-size:0.84rem;"><i class="ph ph-warning"></i> ' + (avisos || 'Nenhum item identificado.') + ' Use a aba "Digitar peças".</div>';
        return;
    }
    var chip = function(t) { return '<span style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:999px;padding:3px 10px;font-size:0.76rem;color:#334155;">' + t + '</span>'; };
    var chips = chip('<b>NF ' + esc(d.numero || '—') + '</b>' + (d.serie ? ' / série ' + esc(d.serie) : ''))
        + chip(esc(d.fornecedor || 'Fornecedor não identificado'))
        + (d.cnpj ? chip('CNPJ ' + esc(d.cnpj)) : '')
        + (d.emissao ? chip('Emissão ' + esc(d.emissao)) : '')
        + chip(d.fonte === 'ia' ? '<i class="ph ph-sparkle"></i> Leitura por IA' : '<i class="ph ph-scan"></i> Leitura automática');
    var status = d.soma_confere
        ? '<div style="background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;border-radius:8px;padding:8px 12px;font-size:0.82rem;margin:8px 0;"><i class="ph ph-check-circle"></i> A soma dos itens lidos (' + window._mnFmtMoeda(d.soma_itens) + ') confere com o total de produtos da nota. Os campos abaixo podem ser ajustados.</div>'
        : '<div style="background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:8px;padding:8px 12px;font-size:0.82rem;margin:8px 0;"><i class="ph ph-warning"></i> ' + (avisos || 'Confira os valores antes de salvar.') + '</div>';
    var ipt = 'padding:5px 7px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:0.8rem;outline:none;box-sizing:border-box;font-family:inherit;background:#fff;';
    var th = 'padding:8px;text-align:left;color:#475569;font-weight:700;font-size:0.74rem;white-space:nowrap;';
    var rows = nf.itens.map(function(it, i) {
        return '<tr style="border-bottom:1px solid #e2e8f0;">'
          + '<td style="padding:6px 8px;"><input type="checkbox" data-ni="' + i + '" data-nk="sel"' + (it.sel ? ' checked' : '') + ' style="width:16px;height:16px;accent-color:#2563eb;"></td>'
          + '<td style="padding:6px 8px;color:#64748b;white-space:nowrap;">' + esc(it.codigo) + '</td>'
          + '<td style="padding:6px 8px;"><input type="text" data-ni="' + i + '" data-nk="descricao" value="' + esc(it.descricao) + '" style="' + ipt + 'width:100%;min-width:220px;"></td>'
          + '<td style="padding:6px 8px;white-space:nowrap;"><input type="number" min="0" step="1" data-ni="' + i + '" data-nk="quantidade" value="' + esc(it.quantidade) + '" title="Quantidade" style="' + ipt + 'width:66px;"> '
          +   '<input type="text" list="mn-unidades" data-ni="' + i + '" data-nk="unidade" value="' + esc(it.unidade) + '" placeholder="Un." title="Unidade de medida" style="' + ipt + 'width:52px;text-transform:uppercase;"></td>'
          + '<td style="padding:6px 8px;white-space:nowrap;"><input type="text" data-money="1" data-ni="' + i + '" data-nk="valor_unit" value="' + fm(it.valor_unit) + '" title="Valor unitário" style="' + ipt + 'width:96px;text-align:right;"></td>'
          + '<td style="padding:6px 8px;white-space:nowrap;"><input type="text" data-money="1" data-ni="' + i + '" data-nk="valor_total" value="' + fm(it.valor_total) + '" title="Total" style="' + ipt + 'width:104px;text-align:right;font-weight:700;"></td>'
          + '<td style="padding:6px 8px;white-space:nowrap;"><input type="number" min="0" step="1" data-ni="' + i + '" data-nk="garantia_valor" value="' + esc(it.garantia_valor) + '" placeholder="0" style="' + ipt + 'width:58px;"> '
          +   '<select data-ni="' + i + '" data-nk="garantia_unidade" style="' + ipt + '"><option value="dias"' + (it.garantia_unidade !== 'meses' ? ' selected' : '') + '>dias</option><option value="meses"' + (it.garantia_unidade === 'meses' ? ' selected' : '') + '>meses</option></select></td>'
          + '<td style="padding:6px 8px;"><select data-ni="' + i + '" data-nk="servico_id" style="' + ipt + 'max-width:200px;">' + window._mnEdSvcOptions(it.servico_id) + '</select></td>'
          + '</tr>';
    }).join('');
    res.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:6px;">' + chips + '</div>' + status
      + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">'
      +   '<label style="font-size:0.8rem;font-weight:600;color:#334155;display:flex;align-items:center;gap:5px;cursor:pointer;"><input type="checkbox" id="mnp-all" checked style="width:16px;height:16px;accent-color:#2563eb;"> Marcar todos</label>'
      +   '<span style="margin-left:auto;font-size:0.8rem;color:#64748b;">Serviço para os marcados:</span>'
      +   '<select id="mnp-bulk" style="' + ipt + 'max-width:240px;">' + window._mnEdSvcOptions('') + '</select>'
      +   '<button type="button" id="mnp-bulk-ok" style="padding:6px 12px;border:1.5px solid #2563eb;border-radius:8px;background:#eff6ff;color:#2563eb;cursor:pointer;font-weight:700;font-size:0.78rem;">Aplicar</button>'
      + '</div>'
      + '<div style="overflow-x:auto;border:1px solid #e2e8f0;border-radius:10px;"><table style="width:100%;border-collapse:collapse;font-size:0.8rem;">'
      +   '<thead><tr style="background:#f1f5f9;"><th style="' + th + '"></th><th style="' + th + '">Código</th><th style="' + th + '">Descrição</th><th style="' + th + '">Qtd / Un.</th><th style="' + th + '">Valor unit. (R$)</th><th style="' + th + '">Total (R$)</th><th style="' + th + '">Garantia da peça</th><th style="' + th + '">Serviço</th></tr></thead>'
      +   '<tbody>' + rows + '</tbody></table></div>'
      + '<div style="display:flex;align-items:center;gap:10px;margin-top:12px;flex-wrap:wrap;">'
      +   '<div id="mnp-sel-total" style="font-size:0.84rem;color:#334155;"></div>'
      +   '<button type="button" id="mnp-salvar-nf" style="margin-left:auto;padding:10px 22px;border:none;border-radius:8px;background:#2563eb;color:#fff;cursor:pointer;font-weight:700;display:flex;align-items:center;gap:6px;"><i class="ph ph-floppy-disk"></i> Salvar peças selecionadas e anexar a nota</button>'
      + '</div>';

    res.querySelectorAll('[data-ni]').forEach(function(el) {
        var i = parseInt(el.getAttribute('data-ni')), k = el.getAttribute('data-nk');
        var dinheiro = el.hasAttribute('data-money');
        var h = function() {
            var it = window._mnp.nf.itens[i];
            if (!it) return;
            if (k === 'sel') it.sel = el.checked;
            else if (dinheiro) it[k] = window._mnNum(el.value);
            else if (k === 'unidade') it[k] = el.value.toUpperCase();
            else it[k] = el.value;
            if (k === 'quantidade' || k === 'valor_unit' || k === 'valor_total') {
                window._mnCalcPeca(it, k);
                var tr = el.closest('tr');
                var u = tr.querySelector('[data-nk="valor_unit"]'), t = tr.querySelector('[data-nk="valor_total"]');
                if (k !== 'valor_unit' && u) u.value = fm(it.valor_unit);
                if (k !== 'valor_total' && t) t.value = fm(it.valor_total);
            }
            if (k === 'sel' || k === 'quantidade' || k === 'valor_unit' || k === 'valor_total') window._mnpTotalSel();
        };
        if (dinheiro) { window._mnMask(el, h); return; }
        el.oninput = h;
        el.onchange = h;
    });
    document.getElementById('mnp-all').onchange = function() {
        var v = this.checked;
        window._mnp.nf.itens.forEach(function(it) { it.sel = v; });
        res.querySelectorAll('[data-nk="sel"]').forEach(function(c) { c.checked = v; });
        window._mnpTotalSel();
    };
    document.getElementById('mnp-bulk-ok').onclick = function() {
        var v = document.getElementById('mnp-bulk').value;
        window._mnp.nf.itens.forEach(function(it) { if (it.sel) it.servico_id = v; });
        window._mnpRenderNf();
    };
    document.getElementById('mnp-salvar-nf').onclick = window._mnpSalvarNf;
    window._mnpTotalSel();
};

window._mnpSalvarNf = async function() {
    var ed = window._mnEd, nf = window._mnp.nf;
    var sel = nf.itens.filter(function(i) { return i.sel && String(i.descricao || '').trim(); });
    if (!sel.length) { alert('Marque ao menos um item da nota.'); return; }
    var d = nf.dados;
    var btn = document.getElementById('mnp-salvar-nf');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...'; }
    var fd = new FormData();
    fd.append('arquivo', window._mnp.arquivo);
    fd.append('dados', JSON.stringify({
        numero: d.numero, serie: d.serie, fornecedor: d.fornecedor, cnpj: d.cnpj, data_emissao: d.emissao, valor_total: d.soma_itens, chave_acesso: d.chave_acesso,
        pecas: sel.map(function(i) {
            return { codigo: i.codigo, descricao: i.descricao, unidade: i.unidade, quantidade: window._mnNum(i.quantidade) || 1, valor_unit: window._mnNum(i.valor_unit), valor_total: window._mnNum(i.valor_total),
                     garantia_valor: i.garantia_valor, garantia_unidade: i.garantia_unidade, servico_id: i.servico_id || null };
        })
    }));
    try {
        var r = await fetch('/api/frota/manutencoes/' + ed.id + '/notas', { method: 'POST', headers: { Authorization: 'Bearer ' + window._mnEdTok() }, body: fd });
        if (!r.ok) { var e = await r.json().catch(function() { return {}; }); throw new Error(e.error || 'Erro ao salvar a nota'); }
        await window._mnpAposSalvar('✅ Nota fiscal anexada e peças incluídas!');
    } catch (err) {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar peças selecionadas e anexar a nota'; }
        alert(err.message);
    }
};

window._mnEdAbrirPecas = async function(servicoId) {
    try { await window._mnEdSalvarDetalhe(); } catch (e) { alert(e.message); return; }
    window._mnEdRenderServ();
    window._mnpFechar();
    window._mnp = { servicoId: servicoId || null, arquivo: null, nf: null };
    var nomeSvc = '';
    if (servicoId) { var s = window._mnEd.realizados.find(function(x) { return String(x.id) === String(servicoId); }); if (s) nomeSvc = s.nome; }
    var esc = window._mnEdEsc;
    var pop = document.createElement('div');
    pop.id = 'mnp-pop';
    pop.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.6);display:flex;align-items:center;justify-content:center;z-index:10002;padding:16px;';
    pop.innerHTML = '<div style="background:#fff;border-radius:16px;width:100%;max-width:1040px;max-height:94vh;display:flex;flex-direction:column;box-shadow:0 25px 60px rgba(0,0,0,0.3);">'
      + '<div style="background:linear-gradient(135deg,#1e293b,#334155);padding:16px 20px;border-radius:16px 16px 0 0;display:flex;align-items:center;gap:12px;flex-shrink:0;">'
      +   '<div style="background:#2563eb;border-radius:10px;width:38px;height:38px;display:flex;align-items:center;justify-content:center;"><i class="ph ph-gear-six" style="color:#fff;font-size:1.3rem;"></i></div>'
      +   '<div><div style="color:#fff;font-weight:700;">Incluir peças</div><div style="color:rgba(255,255,255,0.7);font-size:0.8rem;">' + (nomeSvc ? 'Serviço: ' + esc(nomeSvc) : 'Peças da manutenção') + '</div></div>'
      +   '<button type="button" id="mnp-x" title="Fechar" style="margin-left:auto;background:rgba(255,255,255,0.15);border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;"><i class="ph ph-x"></i></button>'
      + '</div>'
      + '<div style="display:flex;border-bottom:1px solid #e2e8f0;flex-shrink:0;">'
      +   '<button type="button" id="mnp-tab-dig"><i class="ph ph-pencil-simple"></i> Digitar peças</button>'
      +   '<button type="button" id="mnp-tab-nf"><i class="ph ph-receipt"></i> Nota fiscal (PDF)</button>'
      + '</div>'
      + '<div style="padding:16px 20px;overflow-y:auto;flex:1;">'
      +   '<div id="mnp-aba-dig">'
      +     '<div id="mnp-rows"></div>'
      +     '<div style="display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap;margin-top:6px;">'
      +       '<button type="button" id="mnp-add-linha" style="padding:8px 14px;border:1.5px solid #cbd5e1;border-radius:8px;background:#fff;color:#475569;cursor:pointer;font-weight:600;font-size:0.82rem;"><i class="ph ph-plus"></i> Adicionar linha</button>'
      +       '<button type="button" id="mnp-salvar-dig" style="padding:9px 22px;border:none;border-radius:8px;background:#2563eb;color:#fff;cursor:pointer;font-weight:700;display:flex;align-items:center;gap:6px;"><i class="ph ph-floppy-disk"></i> Salvar peças</button>'
      +     '</div>'
      +   '</div>'
      +   '<div id="mnp-aba-nf" style="display:none;">'
      +     '<p style="margin:0 0 10px;font-size:0.82rem;color:#64748b;">Anexe o PDF da nota fiscal (DANFE). O sistema lê os itens e os valores; você escolhe quais peças entram e a qual serviço cada uma pertence. O PDF fica guardado e pode ser consultado pelo botão de olho.</p>'
      +     '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">'
      +       '<input type="file" id="mnp-file" accept="application/pdf,.pdf" style="flex:1;min-width:240px;padding:8px;border:1.5px dashed #cbd5e1;border-radius:8px;background:#f8fafc;font-size:0.84rem;">'
      +       '<button type="button" id="mnp-analisar" style="padding:9px 18px;border:none;border-radius:8px;background:#d97706;color:#fff;cursor:pointer;font-weight:700;display:flex;align-items:center;gap:6px;"><i class="ph ph-scan"></i> Analisar nota fiscal</button>'
      +     '</div>'
      +     '<div id="mnp-nf-res" style="margin-top:12px;"></div>'
      +   '</div>'
      + '</div></div>';
    document.body.appendChild(pop);
    document.getElementById('mnp-x').onclick = window._mnpFechar;
    pop.addEventListener('mousedown', function(e) { if (e.target === pop) window._mnpFechar(); });
    document.getElementById('mnp-tab-dig').onclick = function() { window._mnpMostrarAba('dig'); };
    document.getElementById('mnp-tab-nf').onclick = function() { window._mnpMostrarAba('nf'); };
    document.getElementById('mnp-add-linha').onclick = window._mnpAddLinha;
    document.getElementById('mnp-salvar-dig').onclick = window._mnpSalvarManual;
    document.getElementById('mnp-analisar').onclick = window._mnpAnalisar;
    window._mnpMostrarAba('dig');
    window._mnpAddLinha();
};

window.mnCorrSalvarEdicaoInterno = async function(id) {
    var ed = window._mnEd;
    var btn = document.getElementById('mned-save');
    if (btn) btn.disabled = true;
    try {
        await window._mnEdSalvarDetalhe();
        var km = document.getElementById('mned-km').value;
        var forn = document.getElementById('mned-forn').value.trim();
        var obs = document.getElementById('mned-obs').value.trim();
        var rs = await fetch('/api/frota/manutencoes/' + id + '/status', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + window._mnEdTok() },
            body: JSON.stringify({ status: ed.status, km_na_manutencao: km || null, fornecedor: forn || null, observacoes: obs || null })
        });
        if (!rs.ok) { var e2 = await rs.json().catch(function() { return {}; }); throw new Error(e2.error || 'Erro ao salvar o status'); }
        window._mnEdFechar();
        if (typeof mostrarToastAviso === 'function') mostrarToastAviso('✅ Manutenção atualizada!');
        window.mnCarregarCorretivas();
    } catch (e) {
        if (btn) btn.disabled = false;
        if (typeof mostrarToastAviso === 'function') mostrarToastAviso('❌ ' + e.message); else alert(e.message);
    }
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
    
    // Sempre recarrega (evita lista desatualizada na sessao quando o catalogo muda)
    window._manutCategorias = await fetch('/api/frota/categorias', { headers: { Authorization: 'Bearer ' + tok } }).then(r => r.ok ? r.json() : (window._manutCategorias || [])).catch(() => (window._manutCategorias || []));
    window._manutCatalogo = await fetch('/api/frota/catalogo', { headers: { Authorization: 'Bearer ' + tok } }).then(r => r.ok ? r.json() : (window._manutCatalogo || [])).catch(() => (window._manutCatalogo || []));

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

    const frota = window._manutFrota || [];
    const TIPOS_VEICULO = ['Caminhão','Caminhonete','Caminhão Tanque','Utilitário','Carretinha'];

    // Build vehicle opts for edit mode (single select)
    const veicOpts = frota.map(v => `<option value="${v.id}" ${m.veiculo_id==v.id?'selected':''}>${v.placa} — ${(v.marca_modelo_versao||'').substring(0,30)}</option>`).join('');
    
    const fornecedores = [...new Set((window._manutDados||[]).map(x => x.fornecedor).filter(Boolean))];
    const fornListOpts = fornecedores.map(f => `<option value="${f.replace(/"/g,'&quot;')}">`).join('');

    const inp = (fid,val,ph,type,list) => `<input id="${fid}" value="${val||''}" placeholder="${ph||''}" type="${type||'text'}" ${list?`list="${list}"`:''} style="width:100%;padding:0.6rem;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;font-size:0.9rem;outline:none;">`;
    const lbl = t => `<label style="font-size:0.8rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">${t}</label>`;
    const sel = (fid, optsArr, selected, disabled, onchg) => `<select id="${fid}" ${disabled?'disabled':''} ${onchg?`onchange="${onchg}"`:''} style="width:100%;padding:0.6rem;border:1px solid #cbd5e1;border-radius:8px;background:${disabled?'#f8fafc':'#fff'};box-sizing:border-box;font-size:0.9rem;outline:none;${disabled?'cursor:not-allowed;color:#64748b;':''}">${optsArr.map(o=>`<option value="${o.v}" ${selected===o.v?'selected':''}>${o.l}</option>`).join('')}</select>`;

    const catOpts = [{v:'', l:'Selecione...'}, {v:'__todas__', l:'★ Todas as categorias (ver todos os serviços)'}].concat((window._manutCategorias||[]).map(c => ({v:c.id, l:c.nome})));

    // Multi-vehicle panel HTML (only for new maintenance)
    const tipoSelect = `<select onchange="window.mnModalFiltrarTipo(this.value)" style="padding:4px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.83rem;outline:none;background:#fff;color:#475569;">
        <option value="">Todos os tipos</option>
        ${TIPOS_VEICULO.map(t => `<option value="${t.toLowerCase()}">${t}</option>`).join('')}
    </select>`;

    const veicCheckboxes = frota.map(v => {
        const tipoVeic = (v.tipo_veiculo || '').toLowerCase();
        return `<label class="mn-vei-row" data-tipo="${tipoVeic}" style="display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:6px;cursor:pointer;border:1px solid transparent;transition:background .1s;"
                    onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                <input type="checkbox" class="mn-vei-cb" value="${v.id}" data-placa="${v.placa}" data-km="${v.km_atual||0}"
                    style="width:14px;height:14px;cursor:pointer;accent-color:#d97706;">
                <span style="font-weight:700;color:#1e293b;font-size:0.83rem;min-width:70px;">${v.placa}</span>
                <span style="color:#64748b;font-size:0.78rem;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${(v.marca_modelo_versao||'').substring(0,28)}</span>
                ${tipoVeic ? `<span style="background:#f1f5f9;color:#475569;font-size:0.7rem;padding:1px 7px;border-radius:999px;">${v.tipo_veiculo}</span>` : ''}
            </label>`;
    }).join('');

    const veiculoSection = id ? `
    <div>${lbl('Veículo *')}<select id="mn-m-veiculo" onchange="window.mnModalVeiculoChanged()" style="width:100%;padding:0.6rem;border:1px solid #cbd5e1;border-radius:8px;background:#fff;box-sizing:border-box;font-size:0.9rem;outline:none;"><option value="">Selecione...</option>${veicOpts}</select></div>` : `
    <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
            ${lbl('Veículos *')}
            <span id="mn-vei-count" style="font-size:0.78rem;color:#d97706;font-weight:700;">0 selecionado(s)</span>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;align-items:center;">
            <span style="font-size:0.75rem;color:#94a3b8;font-weight:600;">Filtrar:</span>
            ${tipoSelect}
        </div>
        <div style="display:flex;gap:6px;margin-bottom:6px;">
            <input id="mn-vei-busca" type="text" placeholder="Buscar placa..." oninput="window.mnModalFiltrarVeicBusca(this.value)"
                style="flex:1;padding:5px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.83rem;outline:none;">
            <button type="button" onclick="window.mnModalVeiSelecionarTodos(true)"
                style="padding:5px 10px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;font-size:0.78rem;cursor:pointer;color:#475569;">Todos</button>
            <button type="button" onclick="window.mnModalVeiSelecionarTodos(false)"
                style="padding:5px 10px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;font-size:0.78rem;cursor:pointer;color:#475569;">Nenhum</button>
        </div>
        <div id="mn-vei-lista" style="max-height:200px;overflow-y:auto;border:1.5px solid #e2e8f0;border-radius:8px;padding:4px;background:#fff;display:flex;flex-direction:column;gap:1px;">
            ${veicCheckboxes || '<div style="padding:12px;text-align:center;color:#94a3b8;font-size:0.82rem;">Nenhum veículo cadastrado.</div>'}
        </div>
        <input type="hidden" id="mn-m-veiculo" value="">
    </div>`;

    let ov = document.getElementById('modal-manut-ov'); if (ov) ov.remove();
    ov = document.createElement('div'); ov.id = 'modal-manut-ov';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.75);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;';

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
    ${veiculoSection}
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
        <div>${lbl('Categoria')}${sel('mn-m-cat', catOpts, (!id && m.tipo === 'corretiva') ? '__todas__' : '', false, 'window.mnModalCatChanged()')}</div>
        <div id="mn-m-serv-container" style="display:none;flex-direction:column;gap:1rem;">
            <div>${lbl('KM Intervalo')}<input id="mn-m-intervalo" type="number" placeholder="Ex: 10000" style="width:100%;padding:0.6rem;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;font-size:0.9rem;outline:none;"></div>
            <div>${lbl('Selecione os Serviços')}<div id="mn-m-serv-checkboxes" style="background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:0.6rem;max-height:340px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;"></div></div>
            <div id="mn-m-serv-novo-box" style="display:none;">${lbl('Nome do Novo Serviço')}${inp('mn-m-serv-novo', '', 'Ex: Troca de válvula específica...')}</div>
            <button id="mn-m-btn-add" onclick="window.mnModalAddServico()" style="background:#0284c7;color:#fff;border:none;border-radius:8px;padding:0.6rem;font-weight:600;cursor:pointer;font-size:0.85rem;">Adicionar Serviços Selecionados à Lista</button>
        </div>
    </div>
    <div id="mn-m-servicos-lista" style="display:flex;flex-direction:column;gap:6px;"></div>
    <input type="hidden" id="mn-m-km" value="${m.km_na_manutencao||''}">
  </div>
</div></div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    if (!id && m.tipo === 'corretiva') window.mnModalCatChanged();
    
    // Add event listeners for new modal logic
    const veiCbs = document.querySelectorAll('.mn-vei-cb');
    veiCbs.forEach(cb => cb.onchange = () => {
        document.getElementById('mn-vei-count').textContent = document.querySelectorAll('.mn-vei-cb:checked').length + ' selecionado(s)';
    });

    // Auto-fill KM if vehicle is already selected (edit mode)
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
        if (!interv && m.servico_catalogo_id) {
            const catItem = (window._manutCatalogo||[]).find(c => c.id == m.servico_catalogo_id);
            if (catItem) interv = catItem.periodicidade_padrao;
        }
        if (!interv && m.descricao) {
            const catItem = (window._manutCatalogo||[]).find(c => c.nome === m.descricao);
            if (catItem) interv = catItem.periodicidade_padrao;
        }
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

window.mnModalFiltrarTipo = function(tipo) {
    const lista = document.querySelectorAll('.mn-vei-row');
    lista.forEach(row => {
        if(!tipo || row.dataset.tipo === tipo) row.style.display = 'flex';
        else row.style.display = 'none';
    });
};

window.mnModalFiltrarVeicBusca = function(val) {
    const lista = document.querySelectorAll('.mn-vei-row');
    const v = val.toLowerCase();
    lista.forEach(row => {
        const placa = row.querySelector('span').textContent.toLowerCase();
        if(placa.includes(v)) row.style.display = 'flex';
        else row.style.display = 'none';
    });
};

window.mnModalVeiSelecionarTodos = function(sel) {
    document.querySelectorAll('.mn-vei-cb').forEach(cb => {
        if(cb.closest('.mn-vei-row').style.display !== 'none') cb.checked = sel;
    });
    document.getElementById('mn-vei-count').textContent = document.querySelectorAll('.mn-vei-cb:checked').length + ' selecionado(s)';
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
    const todas = (cid === '__todas__');
    const catalogo = window._manutCatalogo || [];
    const catItens = todas ? catalogo : catalogo.filter(s => s.categoria_id == cid);
    const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

    const htmlBusca = `<input type="text" id="mn-m-serv-busca" placeholder="Buscar serviço..." oninput="window.mnModalFiltrarServ(this.value)" style="width:100%;padding:0.45rem 0.6rem;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;font-size:0.85rem;outline:none;">`;

    // Checkbox to select all (apenas os serviços visíveis no filtro)
    const htmlAll = `<label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;font-weight:700;color:#0284c7;cursor:pointer;padding-bottom:6px;border-bottom:1px solid #e2e8f0;">
        <input type="checkbox" onchange="const chk=this.checked; document.querySelectorAll('.mn-serv-cb').forEach(c=>{ if (c.value!=='novo' && c.closest('label').style.display!=='none') c.checked=chk; }); window.mnModalServCbChanged();"> Selecionar Todos
    </label>`;

    // "+ Novo Serviço" só faz sentido com uma categoria definida
    const htmlNovo = todas ? '' : `<label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;color:#d97706;cursor:pointer;margin-top:6px;margin-bottom:6px;font-weight:600;">
        <input type="checkbox" class="mn-serv-cb" value="novo" data-nome="novo" onchange="window.mnModalServCbChanged()"> + Novo Serviço...
    </label>`;

    const linha = s => `
        <label data-busca="${esc(norm(s.nome))}" style="display:flex;align-items:center;gap:6px;font-size:0.85rem;color:#1e293b;cursor:pointer;">
            <input type="checkbox" class="mn-serv-cb" value="${s.id}" data-cat="${s.categoria_id || ''}" data-nome="${esc(s.nome)}" data-interval="${s.periodicidade_padrao}" onchange="window.mnModalServCbChanged()"> ${esc(s.nome)}
        </label>`;

    let htmlCbs = '';
    if (!todas) {
        htmlCbs = catItens.map(linha).join('');
    } else {
        // Todas as categorias: serviços agrupados por categoria (corretivas primeiro)
        const grupos = {}, ordem = [];
        catItens.forEach(s => {
            const k = s.categoria_nome || 'Outros';
            if (!grupos[k]) { grupos[k] = []; ordem.push(k); }
            grupos[k].push(s);
        });
        ordem.sort((a, b) => (a.indexOf('(Corretiva)') !== -1 ? 0 : 1) - (b.indexOf('(Corretiva)') !== -1 ? 0 : 1));
        htmlCbs = ordem.map(k => `<div class="mn-serv-cat" style="font-size:0.72rem;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.04em;margin-top:8px;padding-top:6px;border-top:1px solid #e2e8f0;">${esc(k)}</div>` + grupos[k].map(linha).join('')).join('');
    }

    sBox.innerHTML = htmlBusca + htmlAll + htmlNovo + htmlCbs;
    document.getElementById('mn-m-intervalo').value = '';
};

window.mnModalFiltrarServ = function(txt) {
    const t = String(txt || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    document.querySelectorAll('#mn-m-serv-checkboxes label[data-busca]').forEach(l => {
        l.style.display = (!t || l.dataset.busca.indexOf(t) !== -1) ? 'flex' : 'none';
    });
    document.querySelectorAll('#mn-m-serv-checkboxes .mn-serv-cat').forEach(h => {
        let el = h.nextElementSibling, visivel = false;
        while (el && !el.classList.contains('mn-serv-cat')) {
            if (el.dataset && el.dataset.busca !== undefined && el.style.display !== 'none') visivel = true;
            el = el.nextElementSibling;
        }
        h.style.display = visivel ? 'block' : 'none';
    });
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
            cat_id: cb.dataset.cat || cSel.value,
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

    // Collect selected vehicles: multi (new) or single (edit)
    let vids = [];
    if (!idEdit) {
        // Multi-vehicle checkboxes
        document.querySelectorAll('.mn-vei-cb:checked').forEach(cb => vids.push(cb.value));
        if (!vids.length) return alert('Selecione ao menos um veículo');
    } else {
        const vid = g('mn-m-veiculo');
        if (!vid) return alert('Selecione o veículo');
        vids = [vid];
    }

    if (window._mnModalServicos.length === 0) return alert('Adicione pelo menos um serviço à lista');

    const dataAg = g('mn-m-data-ag') || null;
    let statusFinal = g('mn-m-status') || 'programada';
    if (dataAg && (statusFinal === 'programada' || statusFinal === 'concluida')) statusFinal = 'agendada';

    const basePayload = {
        tipo: g('mn-m-tipo'),
        status: statusFinal,
        data_agendamento: dataAg,
        fornecedor: g('mn-m-forn'),
        observacoes: g('mn-m-obs')
    };

    try {
        document.getElementById('modal-manut-ov').style.opacity = '0.5';
        document.getElementById('modal-manut-ov').style.pointerEvents = 'none';

        // For each selected vehicle × each service
        for (let vId of vids) {
            // Get KM for this vehicle
            const veicData = (window._manutFrota||[]).find(v => v.id == vId);
            const kmVeic = veicData?.km_atual || 0;

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

                const kmManut = (s.km || kmVeic) ? parseInt(s.km || kmVeic) : null;
                const interv = s.intervalo ? parseInt(s.intervalo) : null;
                const kmProx = (kmManut && interv) ? (kmManut + interv) : null;

                const payload = {
                    ...basePayload,
                    veiculo_id: vId,
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
                if (sel && vids.length > 0) {
                    sel.value = vids[0];
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
    const servsIds = Array.from(cbs).map(cb => cb.dataset.catId);
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
                <label style="font-size:0.82rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Tipo de Manutenção</label>
                <select id="ci-tipo-conclusao" onchange="document.getElementById('ci-aviso-revisao').style.display = this.value === 'revisao' ? 'block' : 'none'" style="width:100%;padding:0.6rem;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;font-size:0.9rem;outline:none;margin-bottom:6px;">
                    <option value="realizada">✔️ Manutenção realizada completa</option>
                    <option value="revisao">❌ Sem necessidade de manutenção (apenas revisão)</option>
                </select>
                <div id="ci-aviso-revisao" style="display:none;font-size:0.75rem;color:#b45309;background:#fef3c7;padding:6px 8px;border-radius:6px;border:1px solid #fde68a;margin-bottom:8px;">
                    <i class="ph ph-warning-circle"></i> Caso selecione essa opção o sistema apenas vai avisar sobre a próxima revisão no próximo intervalo programado.
                </div>
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
        const tipoConc = document.getElementById('ci-tipo-conclusao').value;
        if (!dataConc) return alert('Informe a data de finalização');
        const btn = document.getElementById('btn-fin-ag-salvar');
        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-circle-notch ph-spin"></i> Salvando...';
        try {
            const res = await fetch('/api/frota/manutencoes/finalizar-agendado', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + window._manutTok },
                body: JSON.stringify({ veiculo_id: vid, servicos_ids: servsIds, data_conclusao: dataConc, observacoes: obs, km_realizado: kmVal, tipo_conclusao: tipoConc })
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
window.mnConcluirIndividual = async function(manutId, catalogoId, nome) {
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
                        <label style="font-size:0.82rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Tipo de Manutenção</label>
                        <select id="ci-tipo-conclusao" onchange="document.getElementById('ci-aviso-revisao').style.display = this.value === 'revisao' ? 'block' : 'none'" style="width:100%;padding:0.6rem;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;font-size:0.9rem;outline:none;margin-bottom:6px;">
                            <option value="realizada">✔️ Manutenção realizada completa</option>
                            <option value="revisao">❌ Sem necessidade de manutenção (apenas revisão)</option>
                        </select>
                        <div id="ci-aviso-revisao" style="display:none;font-size:0.75rem;color:#b45309;background:#fef3c7;padding:6px 8px;border-radius:6px;border:1px solid #fde68a;margin-bottom:8px;">
                            <i class="ph ph-warning-circle"></i> Caso selecione essa opção o sistema apenas vai avisar sobre a próxima revisão no próximo intervalo programado.
                        </div>
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

    window._mnConcluirVid        = vid;
    window._mnConcluirManutId    = manutId;
    window._mnConcluirCatalogoId = catalogoId;
    window._mnConcluirModo       = 'realizada';

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
                const tipoConc = document.getElementById('ci-tipo-conclusao').value;
                if (!dataConc) { btn.disabled=false; btn.innerHTML='<i class="ph ph-check-circle"></i> Confirmar Realizada'; return alert('Informe a data da manutenção'); }
                res = await fetch('/api/frota/manutencoes/finalizar-agendado', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
                    body: JSON.stringify({
                        veiculo_id: window._mnConcluirVid,
                        servicos_ids: [String(window._mnConcluirCatalogoId)],
                        data_conclusao: dataConc,
                        observacoes: obs,
                        km_realizado: kmVal,
                        tipo_conclusao: tipoConc
                    })
                });
            } else {
                res = await fetch('/api/frota/manutencoes/' + window._mnConcluirManutId, {
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
            const inp  = document.getElementById('ci-km') || document.getElementById('mn-conc-km');
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
                    onclick="['mn-hist-f-placa','mn-hist-f-tm','mn-hist-f-tipo','mn-hist-f-real-de','mn-hist-f-real-ate','mn-hist-f-ag-de','mn-hist-f-ag-ate'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});window._mnFiltrarHistoricoManut();">
                    Limpar
                </button>
            </div>
            <div style="overflow-y:auto;max-height:260px;">
                <table style="width:100%;border-collapse:collapse;font-size:0.75rem;">
                    <thead>
                        <tr style="background:#f1f5f9;position:sticky;top:0;z-index:2;">
                            <th style="padding:10px;text-align:left;color:#64748b;">Veículo/Placa</th>
                            <th style="padding:10px;text-align:left;color:#64748b;">Tipo Veículo</th>
                            <th style="padding:10px;text-align:center;color:#64748b;">Categoria</th>
                            <th style="padding:10px;text-align:left;color:#64748b;">Descrição Serviço</th>
                            <th style="padding:10px;text-align:center;color:#64748b;">Data Conclusão</th>
                            <th style="padding:10px;text-align:center;color:#64748b;">Data Agendada (Antiga)</th>
                            <th style="padding:10px;text-align:right;color:#64748b;">Próxima Manutenção</th>
                            <th style="padding:10px;text-align:left;color:#64748b;">Fornecedor</th>
                            <th style="padding:10px;text-align:center;color:#64748b;width:40px;"></th>
                        </tr>
                    </thead>
                    <tbody id="mn-hist-tbody">
                        <tr><td colspan="9" style="text-align:center;padding:16px;color:#94a3b8;">Carregando...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;

    document.body.appendChild(wrapper);

    let _aberto = false;
    let _dados  = [];
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
        const fRealDe  = document.getElementById('mn-hist-f-real-de')?.value  || '';
        const fRealAte = document.getElementById('mn-hist-f-real-ate')?.value || '';
        const fAgDe    = document.getElementById('mn-hist-f-ag-de')?.value    || '';
        const fAgAte   = document.getElementById('mn-hist-f-ag-ate')?.value   || '';

        const lista = _dados.filter(m => {
            if (fPlaca   && !(m.placa||'').toLowerCase().includes(fPlaca)) return false;
            if (fTm      && (m.tipo_manutencao||'').toLowerCase() !== fTm) return false;
            if (fTipo    && !(m.tipo_veiculo||'').toLowerCase().includes(fTipo)) return false;
            if (fRealDe  && (m.data_conclusao||'')   < fRealDe)  return false;
            if (fRealAte && (m.data_conclusao||'')   > fRealAte) return false;
            if (fAgDe    && (m.data_agendamento||'') < fAgDe)    return false;
            if (fAgAte   && (m.data_agendamento||'') > fAgAte)   return false;
            return true;
        });

        if (!lista.length) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:14px;color:#94a3b8;">Nenhuma manutenção encontrada.</td></tr>';
            return;
        }

        window.toggleMnHistObs = function(btn) {
            const trObs = btn.closest('tr').nextElementSibling;
            if (trObs.style.display === 'none') {
                trObs.style.display = 'table-row';
                btn.className = 'ph ph-caret-up';
            } else {
                trObs.style.display = 'none';
                btn.className = 'ph ph-caret-down';
            }
        };

        tbody.innerHTML = lista.map((m, i) => {
            const bgRow = i % 2 === 0 ? '#fff' : '#fafafa';
            const desc = (m.descricao || '—').replace(/"/g, '&quot;');
            const categoria = (m.categoria_nome || '—');
            const tipoIcon = m.tipo_conclusao === 'revisao' 
                ? ' <span title="Sem necessidade de manutenção (apenas revisão)" style="cursor:help;">❌</span>' 
                : ' <span title="Manutenção realizada completa" style="cursor:help;">✔️</span>';
            const obsText = m.observacoes ? m.observacoes.replace(/\n/g, '<br>') : 'Nenhuma observação.';
            
            return '<tr style="background:' + bgRow + ';border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background=\'#f0fdf4\'" onmouseout="this.style.background=\'' + bgRow + '\'">' +
                '<td style="padding:10px;font-weight:700;color:#1e293b;">' + (m.placa||'—') + '</td>' +
                '<td style="padding:10px;color:#64748b;">' + (m.tipo_veiculo||'—') + '</td>' +
                '<td style="padding:10px;text-align:center;color:#64748b;">' + categoria + '</td>' +
                '<td style="padding:10px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + desc + '">' + (m.descricao||'—') + '</td>' +
                '<td style="padding:10px;text-align:center;color:#2d9e5f;font-weight:600;">' + _fmtData(m.data_conclusao) + tipoIcon + '<br><span style="font-size:0.68rem;font-weight:400;color:#64748b;">' + (m.km_na_manutencao ? Number(m.km_na_manutencao).toLocaleString('pt-BR')+' km' : '—') + '</span></td>' +
                '<td style="padding:10px;text-align:center;color:#64748b;">' + _fmtData(m.data_agendamento) + '</td>' +
                '<td style="padding:10px;text-align:right;color:#0284c7;font-weight:600;">' + (m.km_proxima_manutencao ? Number(m.km_proxima_manutencao).toLocaleString('pt-BR')+' km' : '—') + '</td>' +
                '<td style="padding:10px;color:#64748b;">' + (m.fornecedor||'—') + '</td>' +
                '<td style="padding:10px;text-align:center;cursor:pointer;"><i class="ph ph-caret-down" style="font-size:1.1rem;color:#64748b;" onclick="window.toggleMnHistObs(this)"></i></td>' +
                '</tr>' + 
                '<tr style="display:none;background:' + bgRow + ';border-bottom:1px solid #f1f5f9;"><td colspan="9" style="padding:10px;color:#475569;font-size:0.85rem;background:#f8fafc;"><strong style="color:#1e293b;">Observações:</strong><br>' + obsText + '</td></tr>';
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
            if (tbody) tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:14px;color:#ef4444;">Erro ao carregar histórico.</td></tr>';
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
