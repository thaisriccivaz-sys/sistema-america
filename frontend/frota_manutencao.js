(function(){
'use strict';

window.initFrotaManutencoes = async function(containerEl) {
    const c = containerEl || document.getElementById('frota-conteudo') || document.getElementById('frota-veiculos-container');
    if (!c) return;
    const tok = window.currentToken || localStorage.getItem('token');
    window._manutTok = tok;

    // Sub-tab state
    window._mnSubAba = 'corretiva';

    c.innerHTML = `<div style="padding:1.5rem;background:#f8fafc;min-height:100%;">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:1rem;">
    <h2 style="margin:0;color:#1e293b;display:flex;align-items:center;gap:12px;font-size:1.5rem;">
        <div style="background:#d97706;color:#fff;width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;">
            <i class="ph ph-wrench"></i>
        </div>
        Manutenções
    </h2>
</div>

<!-- Sub-abas -->
<div style="display:flex;gap:4px;margin-bottom:1.5rem;background:#fff;padding:6px;border-radius:10px;border:1px solid #e2e8f0;width:fit-content;">
    <button id="mn-sub-btn-corretiva" onclick="window.mnMudarSubAba('corretiva')" 
        style="padding:0.5rem 1.2rem;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:0.9rem;display:flex;align-items:center;gap:6px;background:#d97706;color:#fff;">
        <i class="ph ph-wrench"></i> Corretiva
    </button>
    <button id="mn-sub-btn-revisao" onclick="window.mnMudarSubAba('revisao')" 
        style="padding:0.5rem 1.2rem;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:0.9rem;display:flex;align-items:center;gap:6px;background:transparent;color:#64748b;">
        <i class="ph ph-seal-check"></i> Revisão
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

    window._manutFrota = window._mnOrdenarFrota ? window._mnOrdenarFrota(frota || []) : (frota || []);
    window._manutDados = manut || [];

    const abaInicial = window._mnSubAbaInicial || window._mnSubAba || 'corretiva';
    window._mnSubAbaInicial = null;
    window.mnMudarSubAba(abaInicial);
};



window.mnMudarSubAba = function(aba) {
    if (aba === 'corretivas') aba = 'corretiva';
    if (aba === 'preventiva') aba = 'revisao';
    window._mnSubAba = aba;
    ['corretiva','revisao','historico'].forEach(a => {
        const btn = document.getElementById('mn-sub-btn-' + a);
        if (!btn) return;
        btn.style.background = a === aba ? '#d97706' : 'transparent';
        btn.style.color = a === aba ? '#fff' : '#64748b';
    });
    const sub = document.getElementById('mn-sub-conteudo');
    if (!sub) return;
    if (aba === 'corretiva') mnRenderCorretivaTela(sub);
    else if (aba === 'revisao') window.mnRenderRevisaoTela(sub);
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
    <div id="mn-hist-view-container"></div>
    <div id="mn-hist-revisoes" style="margin-top:1.5rem;"></div>`;
    window.mnCarregarTabHistorico();
    window.mnCarregarHistRevisoes();
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
        <div style="overflow-x:auto;overflow-y:auto;max-height:calc(100vh - 300px);">
        <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
            <thead style="position:sticky;top:0;z-index:2;background:#f1f5f9;box-shadow:inset 0 -2px 0 #e2e8f0;"><tr style="background:#f1f5f9;border-bottom:2px solid #e2e8f0;">
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
    sub.innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:8px;">
        <button onclick="window.abrirModalManutencao(null,{tipo:'preventiva'})" style="padding:7px 14px;background:#d97706;color:#fff;border:none;border-radius:8px;font-size:0.82rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;">
            <i class="ph ph-plus"></i> Nova Manutenção Preventiva
        </button>
    </div>
    <div id="mn-prev-sub-conteudo"></div>`;

    window.mnPrevMudarSub('plano');
}

// A aba Preventiva mostra direto os cards; os historicos ficam somente na aba Historico
window.mnPrevMudarSub = function(aba) {
    window._mnPrevSubAba = 'plano';
    const c = document.getElementById('mn-prev-sub-conteudo');
    if (!c) return;
    mnPrevRenderPlano(c);
};

window._mnOrdenarFrota = function(lista) {
    const typeWeight = function(t) {
        t = String(t || '').trim().toLowerCase();
        if (t === 'utilitário' || t === 'utilitario') return 1;
        if (t === 'caminhonete') return 2;
        if (t === 'caminhão' || t === 'caminhao') return 3;
        if (t === 'caminhão tanque' || t === 'caminhao tanque') return 4;
        if (t === 'carretinha') return 5;
        return 6;
    };
    return (lista || []).slice().sort(function(a, b) {
        const wA = typeWeight(a.tipo_veiculo);
        const wB = typeWeight(b.tipo_veiculo);
        if (wA !== wB) return wA - wB;
        return String(a.placa || '').localeCompare(String(b.placa || ''));
    });
};

function mnPrevRenderPlano(c) {
    const frota = window._mnOrdenarFrota(window._manutFrota || []);
    const veicOpts = frota.map(v => `<option value="${v.id}">${v.placa} \u2014 ${(v.marca_modelo_versao||'').substring(0,28)}</option>`).join('');
    c.innerHTML = `
    <div id="mn-prev-cards" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:1rem;">${window._mnPrevCardsHtml()}</div>
    <div id="mn-prev-bar" style="display:none;background:#fff;padding:1rem 1.25rem;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:1rem;align-items:center;gap:1rem;flex-wrap:wrap;">
        <button type="button" onclick="window.mnPrevVoltarCards()" style="padding:0.55rem 1rem;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;color:#475569;font-weight:700;font-size:0.85rem;cursor:pointer;display:flex;align-items:center;gap:6px;"><i class="ph ph-arrow-left"></i> Todos os ve\u00edculos</button>
        <label style="font-weight:700;color:#475569;font-size:0.9rem;">Ve\u00edculo:</label>
        <select id="mn-prev-veiculo" onchange="window.mnCarregarPreventivoVeiculo()" style="padding:0.6rem 1rem;border:1px solid #cbd5e1;border-radius:8px;font-size:0.9rem;outline:none;min-width:240px;background:#fff;">
            <option value="">Selecione...</option>${veicOpts}
        </select>
        <div id="mn-prev-km-box" style="display:none;align-items:center;gap:8px;flex-wrap:wrap;">
            <i class="ph ph-gauge" style="color:#d97706;font-size:1.1rem;"></i>
            <span style="font-size:0.85rem;color:#64748b;font-weight:600;">KM atual:</span>
            <span id="mn-prev-km-label" style="font-size:0.82rem;color:#64748b;font-weight:700;"></span>
        </div>
    </div>
    <div id="mn-prev-plano"></div>`;
    // Atualiza KM/fotos com os dados mais recentes (KM pode ter sido alterado na Gest\u00e3o de Frota)
    window._mnPrevAtualizarFrota();
}

// Cards de todos os ve\u00edculos (layout semelhante ao da Gest\u00e3o de Frota). modo: 'preventiva' (padrao) ou 'revisao'
// Badge da situacao da revisao do veiculo (ao lado da placa na aba Revisao)
window._mnRevBadgeHtml = function(v) {
    const st = v && v.revisao_status;
    if (!st) return '';
    const base = 'padding:2px 8px;border-radius:999px;font-size:0.66rem;font-weight:800;display:inline-flex;align-items:center;gap:4px;letter-spacing:0.3px;white-space:nowrap;';
    const mapa = {
        vencida:    { bg: '#fee2e2', cor: '#dc2626', bd: '#fca5a5', ico: 'ph-warning-circle', txt: 'REVISÃO VENCIDA' },
        a_vencer:   { bg: '#ffedd5', cor: '#ea580c', bd: '#fdba74', ico: 'ph-calendar-plus', txt: 'AGENDAR REVISÃO' },
        agendada:   { bg: '#dbeafe', cor: '#1d4ed8', bd: '#93c5fd', ico: 'ph-calendar-check', txt: 'REVISÃO AGENDADA' },
        em_revisao: { bg: '#fef3c7', cor: '#b45309', bd: '#fde68a', ico: 'ph-wrench', txt: 'EM REVISÃO' },
        ok:         { bg: '#dcfce7', cor: '#15803d', bd: '#86efac', ico: 'ph-check-circle', txt: 'REVISÃO OK' }
    };
    const m = mapa[st];
    if (!m) return '';
    let titulo = '';
    const info = v.revisao_info || {};
    if (st === 'agendada' && info.data_agendada) titulo = 'Agendada para ' + _mnRevFmtDataBR(info.data_agendada);
    if (st === 'a_vencer') titulo = [info.falta_km != null ? 'Faltam ' + Number(info.falta_km).toLocaleString('pt-BR') + ' km' : '', info.falta_dias != null ? 'Faltam ' + info.falta_dias + ' dia(s)' : ''].filter(Boolean).join(' • ');
    return '<span title="' + titulo + '" style="background:' + m.bg + ';color:' + m.cor + ';border:1px solid ' + m.bd + ';' + base + '"><i class="ph-fill ' + m.ico + '"></i> ' + m.txt + '</span>';
};

window._mnRevCarretinhaPrazoInfo = function(v) {
    if (!v || !window._mnRevEhCarretinha(v)) return null;
    const info = v.revisao_info || {};
    const hoje = window._mnHojeISO();
    let dtLimite = info.limite_data ? String(info.limite_data).slice(0, 10) : '';
    if (!dtLimite) {
        const base = String(v.data_inicio_garantia || '').split(/[T ]/)[0] || String(v.created_at || '').split(/[T ]/)[0];
        if (base) dtLimite = _mnRevSomarMesesISO(base, 12);
    }
    const diffDias = dtLimite ? _mnRevDiffDias(dtLimite, hoje) : null;
    return {
        dtLimite: dtLimite,
        dtLimiteBR: dtLimite ? _mnRevFmtDataBR(dtLimite) : '—',
        diffDias: diffDias,
        vencida: (v.revisao_status === 'vencida' || (diffDias !== null && diffDias < 0))
    };
};

// Linha abaixo da placa: dias parado em revisao (EM REVISAO), data do agendamento (REVISAO AGENDADA) ou vencimento da carretinha
window._mnRevBadgeDiasHtml = function(v) {
    const st = v && v.revisao_status;
    const info = (v && v.revisao_info) || {};
    if (st === 'em_revisao') {
        const d = Number(info.dias_parado || 0);
        return '<span style="font-size:0.74rem;font-weight:700;color:#c2410c;"><i class="ph ph-timer"></i> ' + (d === 0 ? 'Parado em revisão desde hoje' : d + (d === 1 ? ' dia' : ' dias') + ' parado em revisão') + '</span>';
    }
    if (st === 'agendada' && info.data_agendada) {
        return '<span style="font-size:0.74rem;font-weight:700;color:#1d4ed8;"><i class="ph ph-calendar-blank"></i> Agendada para ' + _mnRevFmtDataBR(info.data_agendada) + '</span>';
    }
    if (v && window._mnRevEhCarretinha(v)) {
        const cp = window._mnRevCarretinhaPrazoInfo(v);
        if (cp && cp.dtLimite && cp.diffDias !== null) {
            if (cp.diffDias < 0) {
                const atr = Math.abs(cp.diffDias);
                return '<span style="font-size:0.74rem;font-weight:700;color:#dc2626;"><i class="ph ph-calendar-x"></i> Venceu em ' + cp.dtLimiteBR + ' • há ' + atr + (atr === 1 ? ' dia' : ' dias') + '</span>';
            }
            if (cp.diffDias === 0) {
                return '<span style="font-size:0.74rem;font-weight:700;color:#d97706;"><i class="ph ph-calendar-check"></i> Vence hoje (' + cp.dtLimiteBR + ')</span>';
            }
            return '<span style="font-size:0.74rem;font-weight:700;color:' + (cp.diffDias <= 30 ? '#d97706' : '#15803d') + ';"><i class="ph ph-calendar-check"></i> Vence em ' + cp.dtLimiteBR + ' • faltam ' + cp.diffDias + (cp.diffDias === 1 ? ' dia' : ' dias') + '</span>';
        }
    }
    return '';
};

window._mnRevCarretinhaCardFooterHtml = function(v) {
    const cp = window._mnRevCarretinhaPrazoInfo(v);
    if (!cp || !cp.dtLimite || cp.diffDias === null) {
        return '<div style="background:#f8fafc;padding:0.6rem 1rem;border-top:1px solid #e2e8f0;font-size:0.78rem;color:#64748b;font-weight:600;"><i class="ph ph-calendar-check" style="color:#7c3aed;"></i> Plano por tempo — revisão a cada 12 meses (sem KM)</div>';
    }
    if (cp.diffDias < 0) {
        const atr = Math.abs(cp.diffDias);
        return '<div style="background:#fef2f2;padding:0.6rem 1rem;border-top:1px solid #fecaca;display:flex;flex-direction:column;gap:3px;">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">'
            + '<span style="font-size:0.76rem;color:#991b1b;font-weight:700;"><i class="ph-fill ph-warning-circle" style="color:#dc2626;"></i> Data que venceu:</span>'
            + '<span style="font-size:0.84rem;font-weight:800;color:#dc2626;">' + cp.dtLimiteBR + '</span>'
            + '</div>'
            + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">'
            + '<span style="font-size:0.74rem;color:#7f1d1d;font-weight:600;">Situação do prazo:</span>'
            + '<span style="font-size:0.78rem;font-weight:800;color:#b91c1c;">Venceu há ' + atr + (atr === 1 ? ' dia' : ' dias') + '</span>'
            + '</div>'
            + '</div>';
    }
    const cor = cp.diffDias <= 30 ? '#d97706' : '#15803d';
    const bg = cp.diffDias <= 30 ? '#fffbeb' : '#f8fafc';
    const bd = cp.diffDias <= 30 ? '#fde68a' : '#e2e8f0';
    const txtDias = cp.diffDias === 0 ? 'Vence hoje!' : ('Faltam ' + cp.diffDias + (cp.diffDias === 1 ? ' dia' : ' dias') + ' para vencer');
    return '<div style="background:' + bg + ';padding:0.6rem 1rem;border-top:1px solid ' + bd + ';display:flex;flex-direction:column;gap:3px;">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">'
        + '<span style="font-size:0.76rem;color:#475569;font-weight:700;"><i class="ph ph-calendar-check" style="color:#7c3aed;"></i> Data que vence:</span>'
        + '<span style="font-size:0.84rem;font-weight:800;color:#1e293b;">' + cp.dtLimiteBR + '</span>'
        + '</div>'
        + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">'
        + '<span style="font-size:0.74rem;color:#64748b;font-weight:600;">Prazo:</span>'
        + '<span style="font-size:0.78rem;font-weight:800;color:' + cor + ';">' + txtDias + '</span>'
        + '</div>'
        + '</div>';
};

// Filtros da aba Revisao: busca (placa / modelo / tipo), tipo, garantia e status da revisao
window._mnRevFiltro = window._mnRevFiltro || { busca: '', tipo: '', garantia: '', status: '' };
window._mnRevFiltroAceita = function(v) {
    const f = window._mnRevFiltro || {};
    const norm = window._mnNorm || function(t) { return String(t || '').toLowerCase(); };
    if (f.busca) {
        const alvo = norm((v.placa || '') + ' ' + (v.marca_modelo_versao || '') + ' ' + (v.tipo_veiculo || ''));
        if (!norm(f.busca).split(' ').filter(Boolean).every(function(p) { return alvo.indexOf(p) !== -1; })) return false;
    }
    if (f.tipo && norm(v.tipo_veiculo) !== norm(f.tipo)) return false;
    if (f.garantia) {
        const garAte = String(v.garantia_fabrica_ate || '').split('T')[0];
        const temGar = (v.garantia_fabrica == 1 || v.garantia_fabrica === '1' || v.garantia_fabrica === true || !!garAte);
        const emGar = temGar && !(garAte && garAte < window._mnHojeISO());
        if (f.garantia === 'sim' && !emGar) return false;
        if (f.garantia === 'nao' && emGar) return false;
    }
    if (f.status) {
        const st = v.revisao_status || 'sem_status';
        if (st !== f.status) return false;
    }
    return true;
};
window._mnRevKpiCardsHtml = function() {
    const frota = window._manutFrota || [];
    const f = window._mnRevFiltro || {};
    const stAtivo = f.status || 'todos';
    const cont = { vencida: 0, a_vencer: 0, agendada: 0, em_revisao: 0, ok: 0 };
    frota.forEach(function(v) {
        const s = v && v.revisao_status;
        if (s && cont[s] !== undefined) cont[s]++;
    });
    const cards = [
        { key: 'vencida',    cor: '#dc2626', bg: '#fef2f2', icone: 'ph-warning-circle', label: 'Revisão Vencida',  val: cont.vencida },
        { key: 'a_vencer',   cor: '#ea580c', bg: '#fff7ed', icone: 'ph-calendar-plus',  label: 'Agendar Revisão',  val: cont.a_vencer },
        { key: 'agendada',   cor: '#2563eb', bg: '#eff6ff', icone: 'ph-calendar-check', label: 'Revisão Agendada', val: cont.agendada },
        { key: 'em_revisao', cor: '#d97706', bg: '#fffbeb', icone: 'ph-wrench',         label: 'Em Revisão',       val: cont.em_revisao },
        { key: 'ok',         cor: '#10b981', bg: '#ecfdf5', icone: 'ph-check-circle',   label: 'Revisão OK',       val: cont.ok },
        { key: 'todos',      cor: '#7c3aed', bg: '#f5f3ff', icone: 'ph-list-bullets',   label: 'Todos',            val: frota.length }
    ];
    return cards.map(function(k) {
        const ativo = stAtivo === k.key;
        return '<div onclick="window._mnRevFiltrarCard(\'' + k.key + '\')" title="Filtrar por: ' + k.label + '"'
            + ' style="background:' + (ativo ? k.bg : '#fff') + ';border:' + (ativo ? '2px solid ' + k.cor : '1px solid #e2e8f0') + ';border-left:4px solid ' + k.cor + ';border-radius:12px;padding:1rem;display:flex;align-items:center;gap:12px;box-shadow:' + (ativo ? '0 4px 12px ' + k.cor + '22' : '0 2px 6px rgba(0,0,0,0.04)') + ';cursor:pointer;transition:all 0.15s;user-select:none;">'
            + '<div style="width:42px;height:42px;border-radius:10px;background:' + k.cor + '18;color:' + k.cor + ';display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;">'
            + '<i class="ph ' + k.icone + '"></i></div>'
            + '<div>'
            + '<div style="font-size:1.5rem;font-weight:800;color:#1e293b;line-height:1;">' + k.val + '</div>'
            + '<div style="font-size:0.75rem;color:' + (ativo ? k.cor : '#64748b') + ';font-weight:' + (ativo ? '700' : '600') + ';margin-top:2px;">' + k.label + '</div>'
            + '</div>'
            + '</div>';
    }).join('');
};
window._mnRevFiltrarCard = function(key) {
    const f = window._mnRevFiltro || {};
    const novoStatus = (key === 'todos' || f.status === key) ? '' : key;
    const sel = document.getElementById('mn-rev-f-status');
    if (sel) sel.value = novoStatus;
    window._mnRevFiltroAtualizar('status', novoStatus);
};
window._mnRevFiltroAtualizar = function(campo, valor) {
    window._mnRevFiltro[campo] = valor;
    const kpiBox = document.getElementById('mn-rev-kpi-cards');
    if (kpiBox) kpiBox.innerHTML = window._mnRevKpiCardsHtml();
    const grid = document.getElementById('mn-rev-cards');
    if (grid && grid.style.display !== 'none') grid.innerHTML = window._mnPrevCardsHtml('revisao');
    const cont = document.getElementById('mn-rev-filtro-cont');
    if (cont) {
        const total = (window._manutFrota || []).length;
        const n = (window._manutFrota || []).filter(window._mnRevFiltroAceita).length;
        cont.textContent = n + ' de ' + total + ' veículo(s)';
    }
};
window._mnRevFiltroLimpar = function() {
    window._mnRevFiltro = { busca: '', tipo: '', garantia: '', status: '' };
    const sub = document.getElementById('mn-sub-conteudo');
    if (sub) window.mnRenderRevisaoTela(sub);
};
window._mnRevFiltroBarraHtml = function() {
    const f = window._mnRevFiltro || {};
    const E = window._mnRevEsc;
    const tipos = Array.from(new Set((window._manutFrota || []).map(function(v) { return String(v.tipo_veiculo || '').trim(); }).filter(Boolean))).sort();
    const sel = 'padding:0.5rem 0.7rem;border:1px solid #cbd5e1;border-radius:8px;font-size:0.84rem;background:#fff;outline:none;';
    const opt = function(val, txt, atual) { return '<option value="' + val + '"' + (atual === val ? ' selected' : '') + '>' + txt + '</option>'; };
    const total = (window._manutFrota || []).length;
    const n = (window._manutFrota || []).filter(window._mnRevFiltroAceita).length;
    return '<div id="mn-rev-filtros-wrap">'
        + '<div id="mn-rev-kpi-cards" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:12px;margin-bottom:12px;">' + window._mnRevKpiCardsHtml() + '</div>'
        + '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:0.8rem 1rem;margin-bottom:1rem;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">'
        + '<div style="position:relative;flex:1;min-width:220px;"><i class="ph ph-magnifying-glass" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#94a3b8;"></i>'
        + '<input type="text" id="mn-rev-f-busca" autocomplete="off" value="' + E(f.busca || '') + '" placeholder="Pesquisar placa, modelo ou tipo do veículo..." oninput="window._mnRevFiltroAtualizar(\'busca\', this.value)" style="width:100%;box-sizing:border-box;padding:0.5rem 0.7rem 0.5rem 2rem;border:1px solid #cbd5e1;border-radius:8px;font-size:0.84rem;outline:none;"></div>'
        + '<select onchange="window._mnRevFiltroAtualizar(\'tipo\', this.value)" style="' + sel + '" title="Tipo de veículo">' + opt('', 'Todos os tipos', f.tipo || '') + tipos.map(function(t) { return opt(E(t), E(t), f.tipo || ''); }).join('') + '</select>'
        + '<select onchange="window._mnRevFiltroAtualizar(\'garantia\', this.value)" style="' + sel + '" title="Garantia">' + opt('', 'Garantia: todos', f.garantia || '') + opt('sim', 'Em garantia', f.garantia || '') + opt('nao', 'Fora de garantia', f.garantia || '') + '</select>'
        + '<select id="mn-rev-f-status" onchange="window._mnRevFiltroAtualizar(\'status\', this.value)" style="' + sel + '" title="Status da revisão">' + opt('', 'Status da revisão: todos', f.status || '') + opt('vencida', 'Revisão vencida', f.status || '') + opt('a_vencer', 'Agendar Revisão', f.status || '') + opt('agendada', 'Revisão agendada', f.status || '') + opt('em_revisao', 'Em revisão', f.status || '') + opt('ok', 'Revisão OK', f.status || '') + opt('sem_status', 'Sem status', f.status || '') + '</select>'
        + '<button type="button" onclick="window._mnRevFiltroLimpar()" style="padding:0.5rem 0.9rem;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;color:#475569;font-weight:700;font-size:0.8rem;cursor:pointer;display:inline-flex;align-items:center;gap:5px;"><i class="ph ph-x-circle"></i> Limpar</button>'
        + '<span id="mn-rev-filtro-cont" style="font-size:0.78rem;color:#64748b;font-weight:700;">' + n + ' de ' + total + ' veículo(s)</span>'
        + '</div>'
        + '</div>';
};

window._mnPrevCardsHtml = function(modo) {
    const ehRevisao = modo === 'revisao';
    const hojeISO = window._mnHojeISO();
    const todos = window._mnOrdenarFrota(window._manutFrota || []);
    if (!todos.length) return '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#94a3b8;">Nenhum ve\u00edculo cadastrado.</div>';
    let frota = todos;
    if (ehRevisao && window._mnRevFiltroAceita) {
        frota = todos.filter(window._mnRevFiltroAceita);
        if (!frota.length) return '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#94a3b8;"><i class="ph ph-funnel" style="font-size:2rem;"></i><div style="margin-top:6px;font-weight:600;">Nenhum veículo encontrado com os filtros aplicados.</div></div>';
    }
    const prevPorVeic = {};
    (window._manutDados || []).forEach(m => { if (m.tipo === 'preventiva') prevPorVeic[String(m.veiculo_id)] = (prevPorVeic[String(m.veiculo_id)] || 0) + 1; });
    return frota.map(v => {
        const foto = v.foto_url || v.foto_base64 || '';
        const parado = (v.em_manutencao == 1 || v.em_manutencao === '1' || v.em_manutencao === true);
        const nPrev = prevPorVeic[String(v.id)] || 0;
        const garAte = String(v.garantia_fabrica_ate || '').split('T')[0];
        const temGar = (v.garantia_fabrica == 1 || v.garantia_fabrica === '1' || v.garantia_fabrica === true || !!garAte);
        const garVencida = temGar && garAte && garAte < hojeISO;
        const manutRibbon = parado ? `
            <div style="position:absolute;top:0;left:0;width:0;height:0;border-top:60px solid #dc2626;border-right:60px solid transparent;z-index:2;"></div>
            <div style="position:absolute;top:8px;left:6px;z-index:3;color:#fff;font-size:1.1rem;transform:rotate(-45deg);width:30px;text-align:center;">
                <i class="ph ph-wrench"></i>
            </div>` : '';
        const fotoHtml = foto
            ? `<div onclick="if(window.abrirFotoVeiculoFrota)window.abrirFotoVeiculoFrota(${v.id})" title="Clique para abrir e salvar a foto" style="height:140px;width:100%;background-image:url('${foto}');background-size:cover;background-position:center;border-bottom:1px solid ${parado ? '#fecaca' : '#e2e8f0'};cursor:pointer;"></div>`
            : `<div style="height:140px;width:100%;background:${parado ? '#fee2e2' : '#f1f5f9'};border-bottom:1px solid ${parado ? '#fecaca' : '#e2e8f0'};display:flex;align-items:center;justify-content:center;color:${parado ? '#fca5a5' : '#cbd5e1'};font-size:3rem;"><i class="ph ph-truck"></i></div>`;
        const linhaPlano = ehRevisao ? '' : `
                <div style="display:flex;justify-content:space-between;border-bottom:1px solid #f1f5f9;padding-bottom:0.3rem;">
                    <span style="font-weight:600;color:#94a3b8;">Plano preventivo:</span>
                    <span style="font-weight:700;color:${nPrev ? '#0284c7' : '#d97706'};">${nPrev ? nPrev + (nPrev === 1 ? ' item' : ' itens') : 'N\u00e3o cadastrado'}</span>
                </div>`;
        const linhaGarantia = !ehRevisao ? '' : `
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;border-bottom:1px solid ${parado ? '#fecaca' : '#f1f5f9'};padding-bottom:0.4rem;">
                    <span style="font-weight:600;color:#94a3b8;">Garantia at\u00e9:</span>
                    <input type="date" id="mn-gar-dt-${v.id}" value="${garAte}" onchange="window.mnGarantiaSalvar(${v.id}, false)" onblur="window.mnGarantiaSalvar(${v.id}, true)" onkeydown="if(event.key==='Enter')this.blur()" style="padding:0.2rem 0.4rem;border:1px solid ${garVencida ? '#fca5a5' : '#e2e8f0'};border-radius:6px;font-size:0.8rem;outline:none;color:${garVencida ? '#dc2626' : '#1e293b'};background:#fff;">
                </div>`;
        const btnAcao = ehRevisao
            ? `<button onclick="window.mnRevisaoAbrirVeiculo(${v.id})" style="background:#7c3aed;color:#fff;border:none;border-radius:8px;padding:0.45rem 0.9rem;font-size:0.8rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;"><i class="ph ph-seal-check"></i> Ver revis\u00e3o</button>`
            : `<button onclick="window.mnPrevAbrirVeiculo(${v.id})" style="background:#0284c7;color:#fff;border:none;border-radius:8px;padding:0.45rem 0.9rem;font-size:0.8rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;"><i class="ph ph-calendar-check"></i> Ver plano</button>`;
        return `
        <div style="background:${parado ? '#fff5f5' : '#fff'};border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.08);overflow:hidden;border:${parado ? '2px solid #fca5a5' : '1px solid #e2e8f0'};position:relative;display:flex;flex-direction:column;transition:transform .2s, box-shadow .2s;" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 20px rgba(0,0,0,0.12)';" onmouseout="this.style.transform='none';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)';">
            ${manutRibbon}
            ${fotoHtml}
            <div style="padding:1rem;flex:1;display:flex;flex-direction:column;gap:0.5rem;font-size:0.85rem;color:#475569;">
                <div style="display:flex;flex-direction:column;gap:0.1rem;">
                    <span style="font-weight:600;color:#94a3b8;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.5px;">Placa</span>
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                        <span style="font-weight:800;color:${parado ? '#dc2626' : '#1e293b'};font-size:1.2rem;">${v.placa || 'N/D'}</span>
                        ${ehRevisao ? window._mnRevBadgeHtml(v) : ''}
                    </div>
                    ${ehRevisao ? window._mnRevBadgeDiasHtml(v) : ''}
                </div>
                <div style="background:${parado ? '#fef2f2' : '#f8fafc'};border:1px solid ${parado ? '#fecaca' : '#e2e8f0'};padding:0.6rem;border-radius:8px;">
                    <span style="font-weight:700;color:#1e293b;line-height:1.2;">${v.marca_modelo_versao || 'N/D'}</span>
                </div>${linhaPlano}${linhaGarantia}
            </div>
            ${(ehRevisao && window._mnRevEhCarretinha(v)) ? window._mnRevCarretinhaCardFooterHtml(v) : ehRevisao ? `<div style="background:${parado ? '#fef2f2' : '#f8fafc'};padding:0.6rem 1rem;border-top:1px solid ${parado ? '#fecaca' : '#e2e8f0'};display:flex;align-items:center;justify-content:space-between;gap:8px;" title="A KM é preenchida diariamente na tela de Gestão de Frota">
                <div style="display:flex;align-items:center;gap:6px;">
                    <i class="ph ph-gauge" style="color:#d97706;font-size:1rem;"></i>
                    <span style="font-size:0.78rem;color:#64748b;font-weight:600;">KM atual:</span>
                </div>
                <span style="font-size:0.88rem;font-weight:800;color:#1e293b;">${v.km_atual ? Number(v.km_atual).toLocaleString('pt-BR') + ' km' : 'Não informado'}</span>
            </div>` : `<div style="background:${parado ? '#fef2f2' : '#f8fafc'};padding:0.6rem 1rem;border-top:1px solid ${parado ? '#fecaca' : '#e2e8f0'};display:flex;align-items:center;gap:8px;">
                <i class="ph ph-gauge" style="color:#d97706;font-size:1rem;"></i>
                <span style="font-size:0.78rem;color:#64748b;font-weight:600;">KM atual:</span>
                <input type="number" id="mn-prevcard-km-${v.id}" value="${v.km_atual || ''}" placeholder="Digite KM"
                    style="flex:1;min-width:0;padding:0.3rem 0.5rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.8rem;outline:none;"
                    onkeydown="if(event.key==='Enter')window.mnPrevSalvarKmCard(${v.id})">
                <button onclick="window.mnPrevSalvarKmCard(${v.id})" style="background:#d97706;color:#fff;border:none;border-radius:6px;padding:0.3rem 0.6rem;font-size:0.75rem;cursor:pointer;font-weight:600;white-space:nowrap;">Salvar</button>
            </div>`}
            <div style="background:${parado ? '#fef2f2' : '#f8fafc'};padding:0.75rem 1rem;border-top:1px solid ${parado ? '#fecaca' : '#e2e8f0'};display:flex;justify-content:space-between;align-items:center;gap:8px;">
                <div style="font-weight:800;color:${parado ? '#f87171' : '#cbd5e1'};font-size:0.75rem;letter-spacing:1px;text-transform:uppercase;">${v.tipo_veiculo || 'VE\u00cdCULO'}</div>
                ${btnAcao}
            </div>
        </div>`;
    }).join('');
};

window.mnGarantiaSalvar = async function(vid, fromBlur) {
    const dt = document.getElementById('mn-gar-dt-' + vid);
    if (!dt) return;
    const val = String(dt.value || '').trim();
    if (val) {
        const ano = parseInt(val.split('-')[0], 10);
        if (!ano || ano < 2000) return;
    }
    const prev = (window._manutFrota || []).find(function(x) { return String(x.id) === String(vid); });
    const prevAte = prev ? String(prev.garantia_fabrica_ate || '').split('T')[0] : '';
    if (val === prevAte) {
        if (fromBlur && (!val || val < window._mnHojeISO())) {
            const gridRev0 = document.getElementById('mn-rev-cards');
            if (gridRev0 && gridRev0.style.display !== 'none') gridRev0.innerHTML = window._mnPrevCardsHtml('revisao');
        }
        return;
    }
    const tem = !!val;
    [window._manutFrota, window._frotaDados].forEach(function(arr) {
        const v = (arr || []).find(function(x) { return String(x.id) === String(vid); });
        if (v) { v.garantia_fabrica = tem ? 1 : 0; v.garantia_fabrica_ate = tem ? val : null; }
    });
    const inpFrota = document.getElementById('fv-garantia-ate');
    if (inpFrota) inpFrota.value = tem ? val : '';
    const tok = window._manutTok || window.currentToken || localStorage.getItem('token');
    try {
        const res = await fetch('/api/frota/veiculos/' + vid + '/garantia', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
            body: JSON.stringify({ garantia_fabrica: tem ? 1 : 0, garantia_fabrica_ate: tem ? val : null })
        });
        const j = await res.json().catch(function() { return {}; });
        if (!res.ok) throw new Error(j.error || 'Erro ao salvar a garantia');
        if (dt) {
            const venc = tem && val < window._mnHojeISO();
            dt.style.borderColor = venc ? '#fca5a5' : '#e2e8f0';
            dt.style.color = venc ? '#dc2626' : '#1e293b';
        }
        if (fromBlur && (!tem || val < window._mnHojeISO())) {
            const gridRev = document.getElementById('mn-rev-cards');
            if (gridRev && gridRev.style.display !== 'none') gridRev.innerHTML = window._mnPrevCardsHtml('revisao');
        }
        if (typeof mostrarToastAviso === 'function') mostrarToastAviso('\u2705 Data de garantia atualizada!');
    } catch (e) { alert(e.message); }
};

// ══════════════════════════════════════════════════════════════════════════════
// ABA REVISÃO — PLANO DE MANUTENÇÃO PROGRAMADA E PRESERVAÇÃO DE GARANTIA
// Base técnica: Manual Fiat Strada 2026/2027 — Motor 1.3 Flex
// ══════════════════════════════════════════════════════════════════════════════

// ── Plano de revisao (por modelo de veiculo). Hoje todos os modelos usam o plano PADRAO; depois cada modelo tera o seu em _mnRevPlanosPorModelo ──
// Cada servico: tipo 'troca' (aparece so quando o marco da revisao atinge km OU meses, o que ocorrer primeiro),
// 'verificacao' com verificaDe (aparece apenas quando a troca correspondente NAO aparece) ou 'fixo' (aparece em toda revisao).
(function() {
    const fmtKm = function(n) { return Number(n).toLocaleString('pt-BR'); };
    const T = function(id, nome, km, meses, extra) {
        const o = { id: id, nome: 'Troca de ' + nome, tipo: 'troca', grupo: 'obrigatorio', km: km, meses: meses };
        o.desc = 'Substituir a cada ' + (km ? fmtKm(km) + ' km' : '') + (km && meses ? ' ou ' : '') + (meses ? meses + ' meses' : '');
        return Object.assign(o, extra || {});
    };
    const V = function(id, nome, verificaDe) {
        return { id: id, nome: 'Verificação de ' + nome, tipo: 'verificacao', verificaDe: verificaDe, grupo: 'obrigatorio', desc: 'Verificar a cada 10.000 km ou 12 meses' };
    };
    const F = function(id, nome) { return { id: id, nome: nome, tipo: 'fixo', grupo: 'obrigatorio', desc: 'Verificar a cada 10.000 km ou 12 meses' }; };
    const C = function(id, nome, desc, tipoPadrao) { return { id: id, nome: nome, tipo: 'fixo', grupo: 'conferencia', desc: desc || 'Verificar a cada 10.000 km ou 12 meses', tipoPadrao: tipoPadrao || 'vistoriado' }; };
    const O = function(id, nome, desc) { return { id: id, nome: nome, tipo: 'fixo', grupo: 'opcional', desc: desc || 'A cada 10.000 km ou 12 meses', tipoPadrao: 'vistoriado' }; };

    window._mnRevPlanoPadrao = [
        // Serviços OBRIGATÓRIOS (Mecânico)
        T('troca_oleo_motor', 'Óleo do motor', 10000, 12),
        T('troca_filtro_oleo', 'Filtro de óleo', 10000, 12),
        T('troca_filtro_combustivel', 'Filtro de combustível', 10000, 12),
        T('troca_filtro_ar_motor', 'Filtro de ar do motor', 20000, 24),
        V('verif_filtro_ar_motor', 'Filtro de ar do motor', 'troca_filtro_ar_motor'),
        T('troca_liquido_arrefecimento', 'Líquido de arrefecimento', 240000, 120),
        V('verif_liquido_arrefecimento', 'Líquido de arrefecimento', 'troca_liquido_arrefecimento'),
        T('troca_oleo_cambio', 'Óleo do câmbio manual', 10000, 12, { apenasPrimeira: true, desc: 'Substituir na primeira revisão (10.000 km ou 12 meses); nas demais, apenas verificação' }),
        V('verif_oleo_cambio', 'Óleo do câmbio manual', 'troca_oleo_cambio'),
        T('troca_fluido_freio', 'Fluido de freio', 40000, 24),
        V('verif_fluido_freio', 'Fluido de freio', 'troca_fluido_freio'),
        T('troca_fluido_embreagem', 'Fluido da embreagem', 40000, 24),
        V('verif_fluido_embreagem', 'Fluido da embreagem', 'troca_fluido_embreagem'),
        F('verif_pastilhas_discos', 'Verificação das pastilhas e discos de freio'),
        F('verif_freio_estacionamento', 'Verificação do freio de estacionamento'),
        F('verif_suspensao', 'Verificação da suspensão'),
        F('verif_caixa_direcao', 'Verificação da caixa de direção'),
        F('verif_homocinetica', 'Verificação de homocinética'),
        F('verif_escapamento', 'Verificação do escapamento'),
        F('verif_estanqueidade', 'Verificação de estanqueidade do motor e do câmbio'),
        T('troca_velas', 'Velas de ignição', 40000, null, { desc: 'Substituir a cada 40.000 km, independentemente do tempo' }),
        V('verif_velas', 'Velas de ignição', 'troca_velas'),
        F('verif_filtro_ar_condicionado', 'Verificação do filtro do ar-condicionado'),
        F('verif_ventilacao_carter', 'Verificação do sistema de ventilação do cárter'),
        F('higienizacao_alimentacao', 'Higienização do sistema de alimentação'),
        T('troca_correias', 'Correias dos órgãos auxiliares', 120000, 72),
        V('verif_correias', 'Correias dos órgãos auxiliares', 'troca_correias'),
        F('verif_filtro_canister', 'Verificação do filtro de ar do canister'),
        // Conferências internas OBRIGATÓRIAS
        C('verif_pneus', 'Verificação de pneus'),
        C('verif_bateria_12v', 'Verificação da bateria de 12 V'),
        C('verif_palhetas', 'Verificação das palhetas'),
        C('verif_iluminacao', 'Verificação da iluminação'),
        C('verif_carroceria', 'Verificação da carroceria e proteções inferiores'),
        C('verif_cameras_rastreadores', 'Verificação de câmeras e rastreadores'),
        C('verif_capas_banco_volante', 'Verificação de capas de banco e volante'),
        C('verif_kit_socorro', 'Verificação do kit de socorro'),
        C('verif_mangueiras', 'Verificação de mangueiras'),
        C('verif_tanques', 'Verificação de tanques'),
        C('verif_mangote', 'Verificação de mangote'),
        C('verif_tanque_succao', 'Verificação de tanque de sucção'),
        C('verif_tanque_agua', 'Verificação de tanque de água'),
        C('verif_motor_succao', 'Verificação de motor de sucção'),
        C('lavagem_motor', 'Lavagem técnica do motor', 'A cada 10.000 km ou 12 meses', 'troca_manutencao'),
        // OPCIONAIS
        O('rodizio_pneus', 'Rodízio de pneus'),
        O('alinhamento_rodas', 'Alinhamento das rodas', 'Conforme necessidade identificada'),
        O('limpeza_bicos', 'Limpeza de bicos injetores'),
        O('descarbonizacao', 'Descarbonização do motor'),
        O('aditivos_combustivel', 'Aditivos extras no combustível')
    ];

    // Plano das CARRETINHAS: sem KM, revisao somente por TEMPO (a cada 12 meses). Todos os itens sao verificacao obrigatoria com foto obrigatoria.
    const CC = function(id, nome) { return C(id, nome, 'Verificar a cada 12 meses', 'vistoriado'); };
    window._mnRevPlanoCarretinha = [
        CC('car_pneus', 'Verificação de pneus'),
        CC('car_funilaria', 'Verificação de funilaria'),
        CC('car_pintura', 'Verificação de pintura'),
        CC('car_alinhamento_balanceamento', 'Verificação de alinhamento e balanceamento'),
        CC('car_eixo', 'Verificação de eixo'),
        CC('car_step', 'Verificação de step'),
        CC('car_eletrica', 'Verificação da parte elétrica'),
        CC('car_iluminacao', 'Verificação da iluminação'),
        CC('car_acessorios', 'Verificação de acessórios')
    ];
})();

// Cada modelo de veiculo tera seu plano (chave = marca_modelo_versao em maiusculas). Por enquanto todos usam o PADRAO.
window._mnRevPlanosPorModelo = window._mnRevPlanosPorModelo || {};
window._mnRevEhCarretinha = function(v) {
    return String((v && v.tipo_veiculo) || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().indexOf('carretinha') !== -1;
};
window._mnRevPlanoDoVeiculo = function(v) {
    if (window._mnRevEhCarretinha(v)) return window._mnRevPlanoCarretinha;
    const chave = String((v && v.marca_modelo_versao) || '').toUpperCase().trim();
    return window._mnRevPlanosPorModelo[chave] || window._mnRevPlanoPadrao;
};

// Historico: TODAS as revisoes ja realizadas de todos os veiculos (a aba Revisao mostra so as ultimas 12 de cada veiculo)
window.mnCarregarHistRevisoes = async function() {
    const box = document.getElementById('mn-hist-revisoes');
    if (!box) return;
    box.innerHTML = '<div style="padding:1rem;text-align:center;color:#94a3b8;font-size:0.85rem;"><i class="ph ph-circle-notch ph-spin"></i> Carregando revisões...</div>';
    const tok = window._manutTok || window.currentToken || localStorage.getItem('token');
    try {
        const res = await fetch('/api/frota/revisoes-historico/todas?_=' + Date.now(), { headers: { Authorization: 'Bearer ' + tok }, cache: 'no-store' });
        const rows = await res.json();
        if (!res.ok || !Array.isArray(rows)) throw new Error((rows && rows.error) || 'Erro ao carregar');
        const E = window._mnRevEsc;
        const fmt = function(n) { return Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
        const fd = function(d) { if (!d) return '—'; const p = String(d).split('T')[0].split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : d; };
        const linhas = rows.map(function(r, i) {
            const bg = i % 2 === 0 ? '#fff' : '#fafafa';
            return `<tr style="background:${bg};border-bottom:1px solid #f1f5f9;">
                <td style="padding:9px 12px;font-weight:800;color:#1e293b;white-space:nowrap;">${E(r.placa || '—')}</td>
                <td style="padding:9px 12px;color:#475569;">${E(r.marca_modelo_versao || '')}</td>
                <td style="padding:9px 12px;text-align:center;color:#6d28d9;font-weight:700;">${Number(r.marco_km).toLocaleString('pt-BR')} km</td>
                <td style="padding:9px 12px;text-align:center;">${fd(r.data_revisao)}</td>
                <td style="padding:9px 12px;text-align:center;">${r.km_revisao ? Number(r.km_revisao).toLocaleString('pt-BR') + ' km' : '—'}</td>
                <td style="padding:9px 12px;">${E(r.concessionaria || '—')}${r.numero_os ? ' <span style="color:#94a3b8;">(OS ' + E(r.numero_os) + ')</span>' : ''}</td>
                <td style="padding:9px 12px;text-align:right;">${fmt(r.valor_pecas)}</td>
                <td style="padding:9px 12px;text-align:right;">${fmt(r.valor_mao_obra)}</td>
                <td style="padding:9px 12px;text-align:right;font-weight:800;">${fmt(r.valor_total)}</td>
                <td style="padding:9px 12px;text-align:center;">${r.n_anexos || 0}</td>
                <td style="padding:9px 12px;text-align:center;"><button type="button" onclick="window._mnRevHistAbrir(${r.veiculo_id})" style="background:#7c3aed;color:#fff;border:none;border-radius:6px;padding:3px 10px;font-size:0.75rem;font-weight:700;cursor:pointer;">Ver</button></td>
            </tr>`;
        }).join('');
        box.innerHTML = `
        <div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
            <div style="padding:0.8rem 1rem;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
                <div style="font-weight:800;color:#1e293b;font-size:0.95rem;"><i class="ph ph-seal-check" style="color:#7c3aed;"></i> Histórico de Revisões Realizadas</div>
                <span style="background:#f3e8ff;color:#6d28d9;border-radius:99px;padding:2px 10px;font-size:0.8rem;font-weight:700;">${rows.length} revisão(ões)</span>
            </div>
            <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:0.82rem;">
                <thead><tr style="background:#f1f5f9;color:#475569;text-align:left;">
                    <th style="padding:9px 12px;">Placa</th><th style="padding:9px 12px;">Veículo</th><th style="padding:9px 12px;text-align:center;">Marco</th>
                    <th style="padding:9px 12px;text-align:center;">Data</th><th style="padding:9px 12px;text-align:center;">KM</th><th style="padding:9px 12px;">Concessionária</th>
                    <th style="padding:9px 12px;text-align:right;">Peças</th><th style="padding:9px 12px;text-align:right;">Mão de obra</th><th style="padding:9px 12px;text-align:right;">Total</th>
                    <th style="padding:9px 12px;text-align:center;">Notas</th><th style="padding:9px 12px;"></th></tr></thead>
                <tbody>${linhas || '<tr><td colspan="11" style="padding:1.5rem;text-align:center;color:#94a3b8;">Nenhuma revisão realizada ainda.</td></tr>'}</tbody>
            </table></div>
        </div>`;
    } catch (e) {
        box.innerHTML = '<div style="padding:1rem;color:#dc2626;font-size:0.85rem;">Erro ao carregar o histórico de revisões: ' + window._mnRevEsc(e.message) + '</div>';
    }
};

window._mnRevHistAbrir = function(vid) {
    if (typeof window.mnMudarSubAba === 'function') window.mnMudarSubAba('revisao');
    setTimeout(function() { window.mnRevisaoAbrirVeiculo(vid); }, 60);
};

window.mnRenderRevisaoTela = function(sub) {
    sub.innerHTML = `
        ${window._mnRevFiltroBarraHtml()}
        <div id="mn-rev-cards" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:1rem;">${window._mnPrevCardsHtml('revisao')}</div>
        <div id="mn-rev-detalhe" style="display:none;"></div>`;
    window._mnPrevAtualizarFrota();
    if (window._mnRevVeicId) {
        const vid = window._mnRevVeicId;
        window._mnRevVeicId = null;
        window.mnRevisaoAbrirVeiculo(vid);
    }
};

window.mnRevisaoVoltarCards = function() {
    const det = document.getElementById('mn-rev-detalhe');
    const grid = document.getElementById('mn-rev-cards');
    const filtrosWrap = document.getElementById('mn-rev-filtros-wrap');
    if (det) { det.style.display = 'none'; det.innerHTML = ''; }
    if (filtrosWrap) filtrosWrap.style.display = '';
    const kpiBox = document.getElementById('mn-rev-kpi-cards');
    if (kpiBox && typeof window._mnRevKpiCardsHtml === 'function') kpiBox.innerHTML = window._mnRevKpiCardsHtml();
    const contRev = document.getElementById('mn-rev-filtro-cont');
    if (contRev && typeof window._mnRevFiltroAceita === 'function') {
        const lista = window._manutFrota || [];
        contRev.textContent = lista.filter(window._mnRevFiltroAceita).length + ' de ' + lista.length + ' veículo(s)';
    }
    if (grid) { grid.style.display = 'grid'; grid.innerHTML = window._mnPrevCardsHtml('revisao'); }
    window._mnRevAtual = null;
};

function _mnRevSomarMesesISO(dtIso, meses) {
    if (!dtIso) return '';
    const p = String(dtIso).split('T')[0].split('-');
    if (p.length !== 3) return '';
    const yr = parseInt(p[0], 10);
    if (isNaN(yr) || yr < 1900) return '';
    const d = new Date(yr, parseInt(p[1], 10) - 1 + Number(meses || 0), 1);
    d.setFullYear(yr, parseInt(p[1], 10) - 1 + Number(meses || 0), 1);
    const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(parseInt(p[2], 10), ultimoDia));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function _mnRevDiffDias(dtAlvoIso, hojeIso) {
    if (!dtAlvoIso || !hojeIso) return null;
    const d1 = new Date(dtAlvoIso + 'T00:00:00');
    const d0 = new Date(hojeIso + 'T00:00:00');
    return Math.round((d1 - d0) / (1000 * 60 * 60 * 24));
}

function _mnRevFmtDataBR(dtIso) {
    if (!dtIso) return '—';
    const p = String(dtIso).split('T')[0].split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : dtIso;
}

function _mnRevInferirInicioGarantia(v) {
    const salva = String(v?.data_inicio_garantia || '').split('T')[0];
    if (salva) return salva;
    const ate = String(v?.garantia_fabrica_ate || '').split('T')[0];
    
    return '';
}

window.mnRevisaoAbrirVeiculo = async function(vid) {
    const grid = document.getElementById('mn-rev-cards');
    const det = document.getElementById('mn-rev-detalhe');
    const filtrosWrap = document.getElementById('mn-rev-filtros-wrap');
    if (!det) return;
    if (filtrosWrap) filtrosWrap.style.display = 'none';
    if (grid) grid.style.display = 'none';
    det.style.display = 'block';
    det.innerHTML = `<div style="padding:3rem;text-align:center;color:#64748b;"><i class="ph ph-circle-notch ph-spin" style="font-size:2rem;color:#7c3aed;"></i><div style="margin-top:8px;font-weight:600;">Carregando plano de revisão e garantia...</div></div>`;

    const tok = window._manutTok || window.currentToken || localStorage.getItem('token');
    try {
        const res = await fetch('/api/frota/revisoes/' + vid + '?_=' + Date.now(), {
            headers: { Authorization: 'Bearer ' + tok },
            cache: 'no-store'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao carregar revisões');
        window._mnRevAtual = data;
        window._mnRenderPainelRevisaoVeiculo();
    } catch (e) {
        det.innerHTML = `<div style="padding:2rem;text-align:center;color:#dc2626;font-weight:600;">Erro: ${e.message} <br><button onclick="window.mnRevisaoVoltarCards()" style="margin-top:1rem;padding:0.5rem 1rem;border-radius:8px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;">Voltar</button></div>`;
    }
};

window._mnRevSalvarConfigVeiculo = async function(vid) {
    const dtGarAte = String(document.getElementById('mn-rev-cfg-garantia')?.value || '').trim();
    if (dtGarAte) {
        const ano = parseInt(dtGarAte.split('-')[0], 10);
        if (!ano || ano < 2000 || ano > 2100) return;
    }
    const usoSev = document.getElementById('mn-rev-cfg-severo')?.value === '1' ? 1 : 0;
    const tok = window._manutTok || window.currentToken || localStorage.getItem('token');
    try {
        const res = await fetch('/api/frota/revisoes/' + vid + '/config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
            body: JSON.stringify({ garantia_fabrica_ate: dtGarAte || null, uso_severo: usoSev })
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error || 'Erro ao salvar configuração');
        if (window._mnRevAtual && window._mnRevAtual.veiculo) {
            window._mnRevAtual.veiculo.garantia_fabrica = dtGarAte ? 1 : 0;
            window._mnRevAtual.veiculo.garantia_fabrica_ate = dtGarAte || null;
            window._mnRevAtual.veiculo.uso_severo = usoSev;
            if (j.revisao_status !== undefined) {
                window._mnRevAtual.veiculo.revisao_status = j.revisao_status;
                window._mnRevAtual.veiculo.revisao_info = j.revisao_info || {};
            }
        }
        [window._manutFrota, window._frotaDados].forEach(arr => {
            const v = (arr || []).find(x => String(x.id) === String(vid));
            if (v) {
                v.garantia_fabrica = dtGarAte ? 1 : 0;
                v.garantia_fabrica_ate = dtGarAte || null;
                v.uso_severo = usoSev;
                if (j.revisao_status !== undefined) {
                    v.revisao_status = j.revisao_status;
                    v.revisao_info = j.revisao_info || {};
                }
            }
        });
        if (typeof mostrarToastAviso === 'function') mostrarToastAviso('\u2705 Parâmetros de revisão atualizados!');
        if (typeof window._mnPrevAtualizarFrota === 'function') await window._mnPrevAtualizarFrota();
        await window.mnRevisaoAbrirVeiculo(vid);
    } catch (e) { alert(e.message); }
};

window._mnRevSalvarInicioPlano = async function(vid) {
    const dt = String(document.getElementById('mn-rev-cfg-inicio')?.value || '').trim();
    if (dt) {
        const ano = parseInt(dt.split('-')[0], 10);
        if (!ano || ano < 2000 || ano > 2100) return;
    }
    const tok = window._manutTok || window.currentToken || localStorage.getItem('token');
    try {
        const res = await fetch('/api/frota/revisoes/' + vid + '/config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
            body: JSON.stringify({ data_inicio_garantia: dt || null })
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error || 'Erro ao salvar o início do plano');
        [window._manutFrota, window._frotaDados].forEach(arr => {
            const v = (arr || []).find(x => String(x.id) === String(vid));
            if (v) {
                v.data_inicio_garantia = dt || null;
                if (j.revisao_status !== undefined) {
                    v.revisao_status = j.revisao_status;
                    v.revisao_info = j.revisao_info || {};
                }
            }
        });
        if (window._mnRevAtual && window._mnRevAtual.veiculo) {
            window._mnRevAtual.veiculo.data_inicio_garantia = dt || null;
            if (j.revisao_status !== undefined) {
                window._mnRevAtual.veiculo.revisao_status = j.revisao_status;
                window._mnRevAtual.veiculo.revisao_info = j.revisao_info || {};
            }
        }
        if (typeof window._mnPrevAtualizarFrota === 'function') await window._mnPrevAtualizarFrota();
        await window.mnRevisaoAbrirVeiculo(vid);
        if (typeof mostrarToastAviso === 'function') mostrarToastAviso('\u2705 Início do plano atualizado!');
    } catch (e) { alert(e.message); }
};

window._mnRevSalvarDataPrimeiraRevisao = async function(vid, dtPrimeiraIso, passoMeses, fromBlur) {
    const dtAlvo = String(dtPrimeiraIso || '').trim();
    if (dtAlvo) {
        const ano = parseInt(dtAlvo.split('-')[0], 10);
        if (!ano || ano < 2000 || ano > 2100) return;
    }
    if (!fromBlur && document.activeElement && document.activeElement.type === 'date') {
        clearTimeout(window._mnRevTimerDtPrimeira);
        window._mnRevTimerDtPrimeira = setTimeout(function() {
            window._mnRevSalvarDataPrimeiraRevisao(vid, dtAlvo, passoMeses, true);
        }, 550);
        return;
    }
    clearTimeout(window._mnRevTimerDtPrimeira);
    const meses = Number(passoMeses) || 12;
    const dtIni = dtAlvo ? _mnRevSomarMesesISO(dtAlvo, -meses) : '';
    const vAtual = (window._mnRevAtual && window._mnRevAtual.veiculo && String(window._mnRevAtual.veiculo.id) === String(vid))
        ? window._mnRevAtual.veiculo
        : (window._manutFrota || []).find(function(x) { return String(x.id) === String(vid); });
    const prevIni = vAtual ? String(vAtual.data_inicio_garantia || '').split('T')[0] : '';
    if ((dtIni || '') === (prevIni || '')) return;
    const tok = window._manutTok || window.currentToken || localStorage.getItem('token');
    try {
        const res = await fetch('/api/frota/revisoes/' + vid + '/config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
            body: JSON.stringify({ data_inicio_garantia: dtIni || null })
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error || 'Erro ao salvar a data da 1ª revisão');
        [window._manutFrota, window._frotaDados].forEach(arr => {
            const v = (arr || []).find(x => String(x.id) === String(vid));
            if (v) {
                v.data_inicio_garantia = dtIni || null;
                if (j.revisao_status !== undefined) {
                    v.revisao_status = j.revisao_status;
                    v.revisao_info = j.revisao_info || {};
                }
            }
        });
        if (window._mnRevAtual && window._mnRevAtual.veiculo) {
            window._mnRevAtual.veiculo.data_inicio_garantia = dtIni || null;
            if (j.revisao_status !== undefined) {
                window._mnRevAtual.veiculo.revisao_status = j.revisao_status;
                window._mnRevAtual.veiculo.revisao_info = j.revisao_info || {};
            }
        }
        await window.mnRevisaoAbrirVeiculo(vid);
        if (typeof window._mnPrevAtualizarFrota === 'function') await window._mnPrevAtualizarFrota();
        if (typeof mostrarToastAviso === 'function') mostrarToastAviso('\u2705 Data da 1ª revisão atualizada!');
    } catch (e) { alert(e.message); }
};

window._mnRenderPainelRevisaoVeiculo = function() {
    const det = document.getElementById('mn-rev-detalhe');
    const ctx = window._mnRevAtual;
    if (!det || !ctx || !ctx.veiculo) return;
    const v = ctx.veiculo;
    const revsMap = {};
    (ctx.revisoes || []).forEach(r => { revsMap[Number(r.marco_km)] = r; });

    const ehCar = window._mnRevEhCarretinha(v);
    const kmAtual = ehCar ? 0 : Number(v.km_atual || 0);
    const hojeIso = window._mnHojeISO();
    const dtIniGar = ehCar ? (_mnRevInferirInicioGarantia(v) || String(v.created_at || '').split(/[T ]/)[0]) : _mnRevInferirInicioGarantia(v);
    const garAte = String(v.garantia_fabrica_ate || '').split('T')[0];
    const usoSevero = !ehCar && Number(v.uso_severo || 0) === 1;
    const passoKm = usoSevero ? 5000 : 10000;
    const passoMeses = usoSevero ? 6 : 12;
    const dtPrimeiraRev = dtIniGar ? _mnRevSomarMesesISO(dtIniGar, passoMeses) : '';

    // Marcos: cada ciclo respeita +passoKm ou +passoMeses (o que ocorrer primeiro) a partir da ultima revisao realizada.
    // Lista = concluidos/vencidos + o proximo marco ainda nao vencido (sem marcos futuros alem dele).
    const lista = [];
    let prevReal = null, temVencidaLoop = false, ultimaVencidaLoop = null, qtdVencidasLoop = 0;
    for (let n = 1; n <= 400; n++) {
        const kmNominal = n * passoKm;
        const mesesNominal = n * passoMeses;
        const reg = revsMap[kmNominal] || null;
        const realizada = !!(reg && reg.status === 'realizada');
        let kmLimite = kmNominal;
        let dtLimite = dtIniGar ? _mnRevSomarMesesISO(dtIniGar, mesesNominal) : '';
        if (prevReal) {
            const kmPrev = String(prevReal.observacoes || '').includes('marcada como feita manualmente') ? Number(prevReal.marco_km || 0) : Number(prevReal.km_revisao || 0);
            if (kmPrev) kmLimite = kmPrev + passoKm;
            if (prevReal.data_revisao) dtLimite = _mnRevSomarMesesISO(prevReal.data_revisao, passoMeses);
        }
        const diffKm = kmLimite - kmAtual;
        const diffDias = dtLimite ? _mnRevDiffDias(dtLimite, hojeIso) : null;
        const vencKm = kmAtual > 0 && diffKm <= 0;
        const vencTempo = diffDias !== null && diffDias < 0;
        const vencida = !realizada && (vencKm || vencTempo);
        if (ehCar && temVencidaLoop && !realizada && !vencida) break;
        const item = { n: n, kmNominal: kmNominal, mesesNominal: mesesNominal, reg: reg, realizada: realizada, kmLimite: kmLimite, dtLimite: dtLimite, diffKm: diffKm, diffDias: diffDias, vencKm: vencKm, vencTempo: vencTempo, vencida: vencida };
        lista.push(item);
        if (vencida) {
            temVencidaLoop = true;
            ultimaVencidaLoop = item;
            qtdVencidasLoop++;
        }
        prevReal = realizada ? reg : null;
        if (!realizada && !vencida) break;
    }
    const totalMarcos = lista.length;
    const marcos = lista.slice().reverse();

    // Sincroniza o status do veiculo (usado no cabecalho e no card externo) diretamente com os marcos calculados
    const revsLista = Array.isArray(ctx.revisoes) ? ctx.revisoes : [];
    const emRevLocal = revsLista.find(r => r.status === 'agendada' && (!r.data_revisao || String(r.data_revisao).trim() === '' || String(r.data_revisao).slice(0, 10) <= hojeIso));
    const agLocal = !emRevLocal ? revsLista.filter(r => r.status === 'agendada' && r.data_revisao && String(r.data_revisao).slice(0, 10) > hojeIso).sort((a, b) => String(a.data_revisao).localeCompare(String(b.data_revisao)))[0] : null;
    const ultimoItem = lista[lista.length - 1] || null;
    let marcoPendenteLocal = null;
    if (temVencidaLoop && ultimaVencidaLoop) {
        marcoPendenteLocal = {
            status: 'vencida',
            n: ultimaVencidaLoop.n,
            marco_km: ultimaVencidaLoop.kmNominal,
            marco_meses: ultimaVencidaLoop.mesesNominal,
            limite_km: ultimaVencidaLoop.kmLimite,
            limite_data: ultimaVencidaLoop.dtLimite || null,
            atraso_km: (kmAtual > 0 && ultimaVencidaLoop.diffKm <= 0) ? Math.abs(ultimaVencidaLoop.diffKm) : null,
            atraso_dias: (ultimaVencidaLoop.diffDias !== null && ultimaVencidaLoop.diffDias < 0) ? Math.abs(ultimaVencidaLoop.diffDias) : null,
            qtd_vencidas: qtdVencidasLoop,
            eh_carretinha: !!ehCar
        };
    } else if (ultimoItem && !ultimoItem.realizada) {
        const proxKmCalc = kmAtual > 0 && ultimoItem.diffKm > 0 && ultimoItem.diffKm <= 1000;
        const proxTempoCalc = ultimoItem.diffDias !== null && ultimoItem.diffDias >= 0 && ultimoItem.diffDias <= 30;
        if (proxKmCalc || proxTempoCalc) {
            marcoPendenteLocal = {
                status: 'a_vencer',
                n: ultimoItem.n,
                marco_km: ultimoItem.kmNominal,
                marco_meses: ultimoItem.mesesNominal,
                limite_km: ultimoItem.kmLimite,
                limite_data: ultimoItem.dtLimite || null,
                falta_km: (kmAtual > 0 && ultimoItem.diffKm > 0) ? ultimoItem.diffKm : null,
                falta_dias: (ultimoItem.diffDias !== null && ultimoItem.diffDias >= 0) ? ultimoItem.diffDias : null,
                eh_carretinha: !!ehCar
            };
        }
    }
    let revInfoCalc = { status: null };
    if (emRevLocal) {
        const ini = String(emRevLocal.parado_desde || emRevLocal.data_revisao || emRevLocal.created_at || '').slice(0, 10);
        const dias = ini ? Math.max(0, _mnRevDiffDias(hojeIso, ini) || 0) : 0;
        revInfoCalc = { status: 'em_revisao', dias_parado: dias, marco_km: emRevLocal.marco_km, eh_carretinha: !!ehCar, marco_pendente: marcoPendenteLocal };
    } else if (agLocal) {
        revInfoCalc = { status: 'agendada', data_agendada: String(agLocal.data_revisao).slice(0, 10), marco_km: agLocal.marco_km, eh_carretinha: !!ehCar, marco_pendente: marcoPendenteLocal };
    } else if (marcoPendenteLocal) {
        revInfoCalc = Object.assign({}, marcoPendenteLocal, { marco_pendente: marcoPendenteLocal });
    } else if (ultimoItem && !ultimoItem.realizada) {
        revInfoCalc = {
            status: (kmAtual > 0 || dtIniGar) ? 'ok' : null,
            n: ultimoItem.n,
            marco_km: ultimoItem.kmNominal,
            marco_meses: ultimoItem.mesesNominal,
            limite_km: ultimoItem.kmLimite,
            limite_data: ultimoItem.dtLimite || null,
            falta_km: (kmAtual > 0 && ultimoItem.diffKm > 0) ? ultimoItem.diffKm : null,
            falta_dias: (ultimoItem.diffDias !== null && ultimoItem.diffDias >= 0) ? ultimoItem.diffDias : null,
            eh_carretinha: !!ehCar
        };
    } else if (kmAtual > 0 || dtIniGar) {
        revInfoCalc = { status: 'ok', eh_carretinha: !!ehCar };
    }
    v.revisao_status = revInfoCalc.status;
    v.revisao_info = revInfoCalc;

    let alertasCriticos = [];
    let proxMarcoInfo = null;

    const cardsMarcosHtml = marcos.map(m => {
        const reg = m.reg;
        const status = reg ? (reg.status || 'pendente') : 'pendente';
        const agendada = status === 'agendada';
        const { realizada, kmLimite, dtLimite, diffKm, diffDias } = m;

        let sitCor = '#64748b', sitBg = '#f8fafc', sitBorda = '#e2e8f0', sitLabel = 'No Prazo';
        let kmStatusTxt = '', tempoStatusTxt = '', prevalenciaTxt = '', carDataVencRowHtml = '';

        if (realizada) {
            sitCor = '#15803d'; sitBg = '#f0fdf4'; sitBorda = '#86efac';
            sitLabel = 'Realizada';
            const kmFeita = (reg && String(reg.observacoes || '').includes('marcada como feita manualmente')) ? Number(reg.marco_km || reg.km_revisao || kmLimite) : Number((reg && reg.km_revisao) || 0);
            kmStatusTxt = kmFeita ? `Feita com ${kmFeita.toLocaleString('pt-BR')} km` : `Limite ${kmLimite.toLocaleString('pt-BR')} km`;
            tempoStatusTxt = (reg && reg.data_revisao) ? `Em ${_mnRevFmtDataBR(reg.data_revisao)}` : 'Data não informada';
            prevalenciaTxt = (reg && reg.concessionaria) ? `Concessionária: ${reg.concessionaria}${reg.numero_os ? ' (OS ' + reg.numero_os + ')' : ''}` : 'Revisão concluída e registrada';
        } else {
            const proxKm = kmAtual > 0 && diffKm > 0 && diffKm <= 1000;
            const proxTempo = diffDias !== null && diffDias >= 0 && diffDias <= 30;
            if (m.vencida) {
                sitCor = '#dc2626'; sitBg = '#fef2f2'; sitBorda = '#fca5a5';
                sitLabel = agendada ? 'Agendada (Vencida)' : 'Vencida';
                alertasCriticos.push(ehCar
                    ? `${m.n}ª revisão (a cada 12 meses${dtLimite ? ' — venceu em <b>' + _mnRevFmtDataBR(dtLimite) + '</b>' : ''}): venceu por tempo há <b>${Math.abs(diffDias)} ${Math.abs(diffDias) === 1 ? 'dia' : 'dias'}</b>.`
                    : `${m.n}ª revisão (limite <b>${kmLimite.toLocaleString('pt-BR')} km</b>${dtLimite ? ' ou <b>' + _mnRevFmtDataBR(dtLimite) + '</b>' : ''}): ${m.vencKm ? `ultrapassou <b>${Math.abs(diffKm).toLocaleString('pt-BR')} km</b>` : ''}${m.vencKm && m.vencTempo ? ' e ' : ''}${m.vencTempo ? `venceu por tempo há <b>${Math.abs(diffDias)} dias</b>` : ''}.`);
            } else if (agendada) {
                sitCor = '#1d4ed8'; sitBg = '#dbeafe'; sitBorda = '#93c5fd';
                sitLabel = 'Agendada';
            } else if (proxKm || proxTempo) {
                sitCor = '#ea580c'; sitBg = '#ffedd5'; sitBorda = '#fdba74';
                sitLabel = 'Agendar Revisão';
            } else {
                sitCor = '#0284c7'; sitBg = '#f0f9ff'; sitBorda = '#bae6fd';
                sitLabel = 'Próxima Revisão';
            }

            kmStatusTxt = kmAtual > 0
                ? (diffKm <= 0
                    ? `<span style="color:#dc2626;font-weight:800;">Passou ${Math.abs(diffKm).toLocaleString('pt-BR')} km</span>`
                    : `<span style="color:${diffKm <= 1000 ? '#d97706' : '#0f172a'};font-weight:700;">Faltam ${diffKm.toLocaleString('pt-BR')} km</span>`)
                : '<span style="color:#94a3b8;">KM atual não informado</span>';

            if (ehCar) {
                if (dtLimite) {
                    const atrDias = Math.abs(diffDias);
                    carDataVencRowHtml = `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                        <span style="color:#64748b;font-weight:600;"><i class="ph ph-calendar-blank"></i> ${diffDias < 0 ? 'Data que venceu:' : 'Data que vence:'}</span>
                        <span style="color:${diffDias < 0 ? '#dc2626' : '#0f172a'};font-weight:800;">${_mnRevFmtDataBR(dtLimite)}</span>
                    </div>`;
                    tempoStatusTxt = diffDias < 0
                        ? `<span style="color:#dc2626;font-weight:800;">Venceu há ${atrDias} ${atrDias === 1 ? 'dia' : 'dias'} (${_mnRevFmtDataBR(dtLimite)})</span>`
                        : (diffDias === 0
                            ? `<span style="color:#d97706;font-weight:800;">Vence hoje (${_mnRevFmtDataBR(dtLimite)})</span>`
                            : `<span style="color:${diffDias <= 30 ? '#d97706' : '#15803d'};font-weight:800;">Faltam ${diffDias} ${diffDias === 1 ? 'dia' : 'dias'} para vencer (${_mnRevFmtDataBR(dtLimite)})</span>`);
                } else {
                    tempoStatusTxt = '<span style="color:#94a3b8;">Informe a data da 1ª revisão</span>';
                }
            } else {
                tempoStatusTxt = dtLimite
                    ? (diffDias < 0
                        ? `<span style="color:#dc2626;font-weight:800;">Vencida há ${Math.abs(diffDias)} dias (${_mnRevFmtDataBR(dtLimite)})</span>`
                        : `<span style="color:${diffDias <= 30 ? '#d97706' : '#0f172a'};font-weight:700;">Faltam ${diffDias} dias (${_mnRevFmtDataBR(dtLimite)})</span>`)
                    : '<span style="color:#94a3b8;">Informe o início da garantia / compra</span>';
            }

            if (kmAtual > 0 && dtLimite) {
                const percKm = Math.max(0, Math.min(150, Math.round(((kmAtual - (kmLimite - passoKm)) / passoKm) * 100)));
                const diasTotais = Math.max(1, passoMeses * 30.4);
                const percTempo = Math.max(0, Math.min(150, Math.round(((diasTotais - diffDias) / diasTotais) * 100)));
                prevalenciaTxt = percKm >= percTempo
                    ? `\u26A1 Critério mais próximo: <b>Quilometragem (${percKm}% do ciclo vs ${percTempo}% do tempo)</b>`
                    : `\u23F0 Critério mais próximo: <b>Tempo (${percTempo}% do prazo vs ${percKm}% do ciclo de KM)</b>`;
            } else if (ehCar) {
                prevalenciaTxt = '\u23F0 Plano por tempo: verificação obrigatória a cada 12 meses (sem KM)';
            } else if (kmAtual > 0) {
                prevalenciaTxt = `\u26A1 Acompanhando por KM (${Math.max(0, Math.round(((kmAtual - (kmLimite - passoKm)) / passoKm) * 100))}% do ciclo)`;
            } else {
                prevalenciaTxt = 'Preencha a data de início para comparar KM × Tempo';
            }
            if (!m.vencida) proxMarcoInfo = { km: kmLimite, diffKm: diffKm, diffDias: diffDias, dtLimiteIso: dtLimite };
        }

        const nAnexos = reg && Array.isArray(reg.anexos) ? reg.anexos.length : 0;
        const vTotal = reg ? Number(reg.valor_total || 0) : 0;
        const itensObj = (reg && reg.itens) || {};
        const qtdVerif = Object.keys(itensObj).filter(k => itensObj[k] && (itensObj[k].realizado === true || itensObj[k].realizado === 'true')).length;
        const qtdTrocaManut = Object.keys(itensObj).filter(k => itensObj[k] && (itensObj[k].realizado === true || itensObj[k].realizado === 'true') && itensObj[k].tipo === 'troca_manutencao').length;

        return `
        <div style="background:#fff;border:2px solid ${sitBorda};border-radius:14px;padding:1.1rem;display:flex;flex-direction:column;gap:0.75rem;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                <div>
                    <div style="font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">${m.n}ª Revisão</div>
                    <div style="font-size:1.1rem;font-weight:800;color:#1e293b;">${ehCar ? (m.n * 12) + ' meses' : kmLimite.toLocaleString('pt-BR') + ' km'} <span style="font-size:0.82rem;font-weight:600;color:${ehCar && !realizada && m.vencida ? '#dc2626' : '#64748b'};">${dtLimite ? (ehCar ? (!realizada && m.vencida ? '• Venceu em ' : '• Vence em ') : 'ou até ') + _mnRevFmtDataBR(dtLimite) : 'ou ' + passoMeses + ' meses'}</span></div>
                </div>
                <span style="background:${sitBg};color:${sitCor};border:1px solid ${sitBorda};padding:4px 10px;border-radius:999px;font-size:0.74rem;font-weight:800;white-space:nowrap;">${sitLabel}</span>
            </div>

            ${window._mnRevParadoCardBannerHtml(reg)}

            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:0.65rem 0.8rem;display:flex;flex-direction:column;gap:6px;font-size:0.8rem;">
                ${ehCar ? carDataVencRowHtml : `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                    <span style="color:#64748b;font-weight:600;"><i class="ph ph-gauge"></i> Por KM:</span>
                    <span>${kmStatusTxt}</span>
                </div>`}
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                    <span style="color:#64748b;font-weight:600;"><i class="ph ph-calendar"></i> ${ehCar ? 'Prazo da revisão:' : 'Por Tempo:'}</span>
                    <span>${tempoStatusTxt}</span>
                </div>
                ${(m.n === 1 && !realizada) ? `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding-top:6px;border-top:1px dashed #cbd5e1;">
                    <span style="color:#475569;font-weight:700;font-size:0.76rem;"><i class="ph ph-pencil-simple" style="color:#7c3aed;"></i> Data da 1ª revisão:</span>
                    <input type="date" value="${dtLimite || ''}" onchange="window._mnRevSalvarDataPrimeiraRevisao(${v.id}, this.value, ${passoMeses}, false)" onblur="window._mnRevSalvarDataPrimeiraRevisao(${v.id}, this.value, ${passoMeses}, true)" onkeydown="if(event.key==='Enter')this.blur()" style="border:1.5px solid #c4b5fd;border-radius:6px;padding:2px 8px;font-size:0.78rem;font-weight:700;color:#1e293b;background:#fff;cursor:pointer;" title="Altere a data desta 1ª revisão para definir se está vencida ou espaçar a próxima revisão">
                </div>` : ''}
                <div style="border-top:1px dashed #cbd5e1;padding-top:5px;font-size:0.75rem;color:#475569;">
                    ${prevalenciaTxt}
                </div>
            </div>

            <div style="display:flex;flex-wrap:wrap;gap:6px;font-size:0.75rem;">
                <span style="background:#f1f5f9;color:#334155;padding:3px 8px;border-radius:6px;font-weight:600;">
                    <i class="ph ph-currency-circle-dollar"></i> Custo: <b>${vTotal > 0 ? vTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}</b>
                </span>
                <span style="background:#f1f5f9;color:#334155;padding:3px 8px;border-radius:6px;font-weight:600;">
                    <i class="ph ph-file-pdf"></i> Notas/OS: <b>${nAnexos}</b>
                </span>
                ${qtdVerif > 0 ? `<span style="background:#ecfdf5;color:#047857;padding:3px 8px;border-radius:6px;font-weight:600;"><i class="ph ph-check-square-offset"></i> ${qtdVerif} serviços realizados (${qtdTrocaManut} c/ troca/manut.)</span>` : ''}
            </div>

            <div style="display:flex;gap:8px;margin-top:auto;padding-top:4px;">
                <button onclick="window.mnRevAbrirModalMarco(${m.kmNominal}, ${m.mesesNominal})" style="flex:1;background:#7c3aed;color:#fff;border:none;border-radius:8px;padding:0.55rem 0.8rem;font-size:0.8rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                    <i class="ph ph-clipboard-text"></i> ${realizada ? 'Ver / Editar Revisão' : 'Registrar / Checklist'}
                </button>
                ${(m.vencida && !realizada) ? `<button type="button" onclick="window.mnRevMarcarFeita(${m.kmNominal}, ${m.mesesNominal}, this)" title="Marcar esta revisão vencida como feita" style="flex:0 0 auto;background:#16a34a;color:#fff;border:none;border-radius:8px;padding:0.55rem 0.8rem;font-size:1rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;"><i class="ph ph-check"></i></button>` : ''}
            </div>
        </div>`;
    }).join('');

    const bannerDiagnHtml = alertasCriticos.length > 0
        ? `<div style="background:#fef2f2;border:1.5px solid #fca5a5;border-left:5px solid #dc2626;border-radius:12px;padding:1rem 1.25rem;margin-bottom:1.25rem;">
            <div style="font-weight:800;color:#991b1b;font-size:0.95rem;margin-bottom:6px;display:flex;align-items:center;gap:8px;">
                <i class="ph ph-warning-octagon" style="font-size:1.3rem;color:#dc2626;"></i>
                Revisões vencidas (${v.placa}${ehCar ? '' : ' — ' + kmAtual.toLocaleString('pt-BR') + ' km'})
            </div>
            <ul style="margin:0;padding-left:1.25rem;color:#7f1d1d;font-size:0.84rem;line-height:1.5;">
                ${alertasCriticos.slice(0, 6).map(a => `<li>${a}</li>`).join('')}
                ${alertasCriticos.length > 6 ? `<li>... e mais <b>${alertasCriticos.length - 6}</b> revisão(ões) anterior(es) vencida(s) listadas nos cards abaixo.</li>` : ''}
                <li>Se a revisão já foi executada, clique em <b>"Registrar / Checklist"</b> no card correspondente, marque como <b>Realizada</b>, marque os serviços realizados e anexe a Nota Fiscal / Ordem de Serviço.</li>
                ${proxMarcoInfo ? (ehCar ? `<li>Próxima revisão até <b>${_mnRevFmtDataBR(proxMarcoInfo.dtLimiteIso)}</b>.</li>` : `<li>Próxima revisão: <b>${proxMarcoInfo.km.toLocaleString('pt-BR')} km</b> (faltam <b>${proxMarcoInfo.diffKm.toLocaleString('pt-BR')} km</b>${proxMarcoInfo.dtLimiteIso ? ` ou até <b>${_mnRevFmtDataBR(proxMarcoInfo.dtLimiteIso)}</b>` : ''}).</li>`) : ''}
            </ul>
        </div>`
        : `<div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-left:5px solid #16a34a;border-radius:12px;padding:0.9rem 1.25rem;margin-bottom:1.25rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
            <div style="color:#166534;font-size:0.86rem;font-weight:600;">
                <i class="ph ph-seal-check" style="color:#16a34a;font-size:1.1rem;"></i>
                ${ehCar ? 'Revisões em dia (plano por tempo — a cada 12 meses).' : 'Revisões em dia para a quilometragem atual (<b>' + kmAtual.toLocaleString('pt-BR') + ' km</b>).'}
                ${proxMarcoInfo ? (ehCar ? `Próxima revisão em <b>${_mnRevFmtDataBR(proxMarcoInfo.dtLimiteIso)}</b> (faltam <b>${proxMarcoInfo.diffDias} ${proxMarcoInfo.diffDias === 1 ? 'dia' : 'dias'}</b>).` : `Próxima revisão aos <b>${proxMarcoInfo.km.toLocaleString('pt-BR')} km</b> (faltam <b>${proxMarcoInfo.diffKm.toLocaleString('pt-BR')} km</b>${proxMarcoInfo.dtLimiteIso ? ` ou até <b>${_mnRevFmtDataBR(proxMarcoInfo.dtLimiteIso)}</b>` : ''}).`) : ''}
            </div>
        </div>`;

    [window._manutFrota, window._frotaDados].forEach(arr => {
        const fv = (arr || []).find(x => String(x.id) === String(v.id));
        if (fv) {
            fv.revisao_status = v.revisao_status;
            fv.revisao_info = v.revisao_info || {};
            if (v.data_inicio_garantia !== undefined) fv.data_inicio_garantia = v.data_inicio_garantia;
        }
    });

    det.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:1rem;">
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:1rem 1.25rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                <button onclick="window.mnRevisaoVoltarCards()" style="background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;border-radius:8px;padding:0.45rem 0.9rem;font-size:0.82rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
                    <i class="ph ph-arrow-left"></i> Voltar aos veículos
                </button>
                <div>
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                        <span style="font-size:1.25rem;font-weight:800;color:#1e293b;">${v.placa}</span>
                        ${window._mnRevBadgeHtml(v)}
                        <span style="background:#f3e8ff;color:#6d28d9;padding:2px 10px;border-radius:999px;font-size:0.75rem;font-weight:700;">Plano de Revisão</span>
                    </div>
                    <div style="font-size:0.84rem;color:#64748b;font-weight:600;">${v.marca_modelo_versao || ''}</div>
                </div>
            </div>

            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                ${ehCar ? '' : `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:0.45rem 0.85rem;" title="Preenchido diariamente pelo assistente na tela de Gestão de Frota">
                    <div style="font-size:0.68rem;font-weight:700;color:#64748b;text-transform:uppercase;">KM Atual (Somente leitura)</div>
                    <div style="font-size:1rem;font-weight:800;color:#0f172a;"><i class="ph ph-gauge" style="color:#d97706;"></i> ${kmAtual ? kmAtual.toLocaleString('pt-BR') + ' km' : 'Não informado'}</div>
                </div>`}
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:0.4rem 0.75rem;" title="Defina a data da 1ª revisão do plano (coloque data passada se já estiver vencida ou datas espaçadas para não vencerem todas no mesmo dia)">
                    <label style="font-size:0.68rem;font-weight:700;color:#64748b;text-transform:uppercase;display:block;">Data da 1ª Revisão:</label>
                    <input type="date" id="mn-rev-cfg-primeira" value="${dtPrimeiraRev}" onchange="window._mnRevSalvarDataPrimeiraRevisao(${v.id}, this.value, ${passoMeses}, false)" onblur="window._mnRevSalvarDataPrimeiraRevisao(${v.id}, this.value, ${passoMeses}, true)" onkeydown="if(event.key==='Enter')this.blur()" style="border:1px solid #cbd5e1;border-radius:6px;padding:2px 6px;font-size:0.8rem;font-weight:700;color:${dtPrimeiraRev ? (dtPrimeiraRev < hojeIso ? '#dc2626' : '#1e293b') : '#1e293b'};">
                </div>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:0.4rem 0.75rem;">
                    <label style="font-size:0.68rem;font-weight:700;color:#64748b;text-transform:uppercase;display:block;">Garantia até:</label>
                    <input type="date" id="mn-rev-cfg-garantia" value="${garAte}" onchange="window._mnRevSalvarConfigVeiculo(${v.id})" onblur="window._mnRevSalvarConfigVeiculo(${v.id})" onkeydown="if(event.key==='Enter')this.blur()" style="border:1px solid #cbd5e1;border-radius:6px;padding:2px 6px;font-size:0.8rem;font-weight:700;color:${garAte ? (garAte < hojeIso ? '#dc2626' : '#16a34a') : '#1e293b'};">
                </div>
                ${ehCar ? '' : `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:0.4rem 0.75rem;">
                    <label style="font-size:0.68rem;font-weight:700;color:#64748b;text-transform:uppercase;display:block;">Regime de Uso</label>
                    <select id="mn-rev-cfg-severo" onchange="window._mnRevSalvarConfigVeiculo(${v.id})" style="border:1px solid #cbd5e1;border-radius:6px;padding:2px 6px;font-size:0.8rem;font-weight:700;color:${usoSevero ? '#dc2626' : '#1e293b'};">
                        <option value="0"${usoSevero ? '' : ' selected'}>Normal (10.000 km / 12m)</option>
                        <option value="1"${usoSevero ? ' selected' : ''}>Uso Severo (5.000 km / 6m)</option>
                    </select>
                </div>`}
            </div>
        </div>

        ${bannerDiagnHtml}

        <div>
            <h3 style="margin:0 0 0.25rem;font-size:1rem;color:#1e293b;display:flex;align-items:center;gap:8px;">
                <i class="ph ph-calendar-check" style="color:#7c3aed;font-size:1.2rem;"></i>
                ${ehCar ? 'Revisões — a cada 12 meses da última revisão (plano por tempo, sem KM)' : 'Revisões — a cada ' + passoKm.toLocaleString('pt-BR') + ' km ou ' + passoMeses + ' meses da última revisão (o que ocorrer primeiro)'}
            </h3>
            <div style="font-size:0.76rem;color:#64748b;margin-bottom:0.75rem;">Exibindo ${marcos.length} revisão(ões) — ordenadas da mais próxima do vencimento para a mais antiga. Todas as revisões realizadas ficam na aba Histórico.</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:1rem;">
                ${cardsMarcosHtml}
            </div>
        </div>
    </div>`;
};

// Abre o modal completo para registrar/editar uma revisao especifica (ex: 10.000 km): 1) execucao, 2) servicos, 3) notas/OS, 4) valores
window._mnRevEsc = function(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

// Lista de servicos da revisao: obrigatorios mecanicos, conferencias internas obrigatorias e opcionais
window._mnRevServicosDoMarco = function(marcoKm) {
    const ctx = window._mnRevAtual;
    const v = (ctx && ctx.veiculo) || {};
    const passoKm = Number(v.uso_severo) === 1 ? 5000 : 10000;
    const passoMeses = Number(v.uso_severo) === 1 ? 6 : 12;
    const n = Math.max(1, Math.round(Number(marcoKm) / passoKm));
    const plano = window._mnRevPlanoDoVeiculo(v);
    // Troca vence quando o marco atinge o intervalo em km OU em meses (o que ocorrer primeiro)
    const vence = function(def) {
        if (def.apenasPrimeira) return n === 1;
        const porKm = def.km ? Math.floor((n * passoKm) / def.km) > Math.floor(((n - 1) * passoKm) / def.km) : false;
        const porTempo = def.meses ? Math.floor((n * passoMeses) / def.meses) > Math.floor(((n - 1) * passoMeses) / def.meses) : false;
        return porKm || porTempo;
    };
    const trocaVence = {};
    plano.forEach(function(d) { if (d.tipo === 'troca') trocaVence[d.id] = vence(d); });
    const lista = [];
    plano.forEach(function(d) {
        if (d.tipo === 'troca') {
            if (trocaVence[d.id]) lista.push({ id: d.id, nome: d.nome, desc: d.desc, risco: '', grupo: d.grupo, origem: 'Troca prevista neste marco', tipoPadrao: 'troca_manutencao' });
        } else if (d.tipo === 'verificacao') {
            if (!trocaVence[d.verificaDe]) lista.push({ id: d.id, nome: d.nome, desc: d.desc, risco: '', grupo: d.grupo, origem: 'Verificação (a troca não é prevista neste marco)', tipoPadrao: 'vistoriado' });
        } else if (d.grupo === 'conferencia') {
            lista.push({ id: d.id, nome: d.nome, desc: d.desc, risco: '', grupo: 'conferencia', origem: 'Conferência interna obrigatória (anexar foto)', tipoPadrao: d.tipoPadrao || 'vistoriado' });
        } else {
            lista.push({ id: d.id, nome: d.nome, desc: d.desc, risco: '', grupo: d.grupo, origem: d.grupo === 'obrigatorio' ? 'Obrigatório em toda revisão' : '', tipoPadrao: 'vistoriado' });
        }
    });
    return lista;
};

window._mnRevFotosConfDoItem = function(servicoId) {
    const reg = window._mnRevRegAtual();
    const midias = (reg && Array.isArray(reg.midias)) ? reg.midias : [];
    return midias.filter(function(m) { return m.categoria === 'conferencia_foto' && String(m.servico_id) === String(servicoId); });
};

window._mnRevRenderFotosConfItem = function(servicoId) {
    const E = window._mnRevEsc;
    const fotos = window._mnRevFotosConfDoItem(servicoId);
    if (!fotos.length) {
        return '<span style="font-size:0.7rem;color:#dc2626;font-weight:700;">Nenhuma foto anexada (obrigatória)</span>';
    }
    return fotos.map(function(f) {
        const url = f.url || ('/api/frota/revisoes/midias/' + f.id + '/arquivo');
        return `<div style="position:relative;width:44px;height:44px;border-radius:6px;overflow:hidden;border:1.5px solid #cbd5e1;background:#f8fafc;flex-shrink:0;" title="${E(f.nome_arquivo || 'Foto')} — clique para ampliar">
            <img src="${E(url)}" onclick="window._mnRevVerMidia(${f.id})" style="width:100%;height:100%;object-fit:cover;cursor:pointer;display:block;">
            <button type="button" onclick="window._mnRevExcluirMidia(${f.id})" title="Remover foto" style="position:absolute;top:1px;right:1px;width:16px;height:16px;border-radius:50%;background:rgba(220,38,38,0.9);color:#fff;border:none;font-size:11px;line-height:14px;padding:0;cursor:pointer;display:flex;align-items:center;justify-content:center;">&times;</button>
        </div>`;
    }).join('');
};

window._mnRevLinhaServicoHtml = function(s, st) {
    const E = window._mnRevEsc;
    const marcado = st.realizado === true || st.realizado === 'true';
    const tipo = (s.grupo === 'opcional' && !marcado) ? 'vistoriado' : (st.tipo || s.tipoPadrao);
    const isConf = s.grupo === 'conferencia';
    const obrig = s.grupo === 'obrigatorio' || isConf;
    const badgeHtml = isConf
        ? '<span style="background:#eff6ff;color:#1d4ed8;border:1px solid #93c5fd;padding:1px 7px;border-radius:999px;font-size:0.66rem;font-weight:800;white-space:nowrap;">OBRIGATÓRIO</span>'
        : (obrig
            ? '<span style="background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;padding:1px 7px;border-radius:999px;font-size:0.66rem;font-weight:800;white-space:nowrap;">OBRIGATÓRIO</span>'
            : '<span style="background:#f1f5f9;color:#64748b;padding:1px 7px;border-radius:999px;font-size:0.66rem;font-weight:700;white-space:nowrap;">OPCIONAL</span>');
    const selectTipoHtml = `<select data-rev-item="${s.id}" data-rev-field="tipo" ${marcado ? '' : 'disabled'} style="width:100%;padding:5px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.78rem;font-weight:600;${marcado ? '' : 'background:#f1f5f9;color:#94a3b8;'}">
                <option value="troca_manutencao"${tipo === 'troca_manutencao' ? ' selected' : ''}>Manutenção / troca realizada</option>
                <option value="vistoriado"${tipo === 'vistoriado' ? ' selected' : ''}>Vistoriado (sem manutenção/troca)</option>
            </select>`;
    const inputObsHtml = `<input type="text" data-rev-item="${s.id}" data-rev-field="obs" value="${E(st.obs || '')}" placeholder="Obs / marca / detalhe..." style="width:100%;padding:5px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.78rem;box-sizing:border-box;${isConf ? 'margin-top:5px;' : ''}">`;
    const colsTipoObs = isConf ? `
        <td style="padding:8px 10px;width:240px;">
            ${selectTipoHtml}
            ${inputObsHtml}
        </td>` : `
        <td style="padding:8px 10px;width:250px;">
            ${selectTipoHtml}
        </td>
        <td style="padding:8px 10px;width:190px;">
            ${inputObsHtml}
        </td>`;
    const colFotoConf = isConf ? `
        <td style="padding:8px 10px;min-width:210px;">
            <div style="display:flex;flex-direction:column;gap:5px;">
                <div>
                    <label id="mn-rev-lbl-conf-${s.id}" style="display:inline-flex;align-items:center;gap:5px;background:#0284c7;color:#fff;padding:3px 9px;border-radius:6px;font-size:0.73rem;font-weight:700;cursor:pointer;">
                        <i class="ph ph-camera"></i> + Anexar foto(s)
                        <input type="file" accept="image/*" multiple style="display:none;" onchange="window._mnRevAnexarFotosConf('${s.id}', this)">
                    </label>
                </div>
                <div id="mn-rev-conf-fotos-${s.id}" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">${window._mnRevRenderFotosConfItem(s.id)}</div>
            </div>
        </td>` : '';
    return `
    <tr data-rev-row="${s.id}" style="border-bottom:1px solid #e2e8f0;background:${marcado ? '#f0fdf4' : '#fff'};">
        <td style="padding:8px 10px;width:34px;text-align:center;">
            <input type="checkbox" data-rev-item="${s.id}" data-rev-field="realizado" data-rev-grupo="${s.grupo}" ${marcado ? 'checked' : ''} onchange="window._mnRevServicoMarcou('${s.id}')" style="width:18px;height:18px;cursor:pointer;accent-color:#16a34a;">
        </td>
        <td style="padding:8px 10px;">
            <div style="font-weight:700;color:#1e293b;display:flex;align-items:center;gap:6px;flex-wrap:${isConf ? 'nowrap' : 'wrap'};">${E(s.nome)}
                ${badgeHtml}
            </div>
            <div style="font-size:0.74rem;color:#64748b;">${E(s.desc)}</div>
            ${(s.origem || s.risco) ? `<div style="font-size:0.7rem;color:#94a3b8;">${E(s.origem || '')}${s.risco ? ' • Risco p/ garantia: ' + E(s.risco) : ''}</div>` : ''}
        </td>
        ${colsTipoObs}
        ${colFotoConf}
    </tr>`;
};

window._mnRevToggleGrupo = function(grupo, forcarAberto) {
    const body = document.getElementById('mn-rev-grp-body-' + grupo);
    const ico = document.getElementById('mn-rev-grp-ico-' + grupo);
    if (!body) return;
    const abrir = forcarAberto !== undefined ? !!forcarAberto : (body.style.display === 'none');
    body.style.display = abrir ? 'block' : 'none';
    if (ico) ico.className = abrir ? 'ph-bold ph-caret-down' : 'ph-bold ph-caret-right';
};

// Pesquisa de servicos no modal da revisao (filtra as linhas pelo nome/descricao)
window._mnRevFiltrarServicos = function(txt) {
    const norm = function(t) { return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); };
    const palavras = norm(txt).split(' ').filter(Boolean);
    document.querySelectorAll('#mn-rev-modal-ov tr[data-rev-row]').forEach(function(tr) {
        if (tr.getAttribute('data-cf-oculto') === '1') { tr.style.display = 'none'; return; }
        const alvo = norm(tr.textContent);
        const visivel = palavras.every(function(p) { return alvo.indexOf(p) !== -1; });
        tr.style.display = visivel ? '' : 'none';
        if (visivel && palavras.length) {
            const cb = tr.querySelector('input[data-rev-grupo]');
            const grp = cb && cb.getAttribute('data-rev-grupo');
            if (grp) window._mnRevToggleGrupo(grp, true);
        }
    });
};

window._mnRevServicoMarcou = function(id) {
    const cb = document.querySelector('#mn-rev-modal-ov input[data-rev-item="' + id + '"][data-rev-field="realizado"]');
    const sel = document.querySelector('#mn-rev-modal-ov select[data-rev-item="' + id + '"][data-rev-field="tipo"]');
    const row = document.querySelector('#mn-rev-modal-ov tr[data-rev-row="' + id + '"]');
    if (!cb) return;
    if (sel) {
        if (cb.checked && cb.getAttribute('data-rev-grupo') === 'opcional') sel.value = 'vistoriado';
        sel.disabled = !cb.checked;
        sel.style.background = cb.checked ? '' : '#f1f5f9';
        sel.style.color = cb.checked ? '' : '#94a3b8';
    }
    if (row) row.style.background = cb.checked ? '#f0fdf4' : '#fff';
    if (!cb.checked) window._mnRevPodarVinculos(id);
    window._mnRevAtualizarContadorObrig();
};

window._mnRevAtualizarContadorObrig = function() {
    const servs = window._mnRevServicosModal || [];
    const obrig = servs.filter(function(s) { return s.grupo === 'obrigatorio'; });
    const conf = servs.filter(function(s) { return s.grupo === 'conferencia'; });
    const opcio = servs.filter(function(s) { return s.grupo === 'opcional'; });
    let ok = 0, okConf = 0, okConfFotos = 0, okOpcio = 0;
    obrig.forEach(function(s) {
        const cb = document.querySelector('#mn-rev-modal-ov input[data-rev-item="' + s.id + '"][data-rev-field="realizado"]');
        if (cb && cb.checked) ok++;
    });
    conf.forEach(function(s) {
        const cb = document.querySelector('#mn-rev-modal-ov input[data-rev-item="' + s.id + '"][data-rev-field="realizado"]');
        if (cb && cb.checked) okConf++;
        if (window._mnRevFotosConfDoItem(s.id).length > 0) okConfFotos++;
    });
    opcio.forEach(function(s) {
        const cb = document.querySelector('#mn-rev-modal-ov input[data-rev-item="' + s.id + '"][data-rev-field="realizado"]');
        if (cb && cb.checked) okOpcio++;
    });
    const el = document.getElementById('mn-rev-cont-obrig');
    if (el) {
        const totalObrig = obrig.length + conf.length;
        const okTotal = ok + okConf;
        const completo = okTotal === totalObrig && okConfFotos === conf.length;
        el.textContent = okTotal + ' de ' + totalObrig + ' obrigatórios marcados • ' + okConfFotos + ' de ' + conf.length + ' c/ foto';
        el.style.background = completo ? '#dcfce7' : '#fef2f2';
        el.style.color = completo ? '#15803d' : '#b91c1c';
    }
    const cbAllObrig = document.getElementById('mn-rev-cb-all-obrig');
    if (cbAllObrig) cbAllObrig.checked = obrig.length > 0 && ok === obrig.length;
    const cbAllConf = document.getElementById('mn-rev-cb-all-conf');
    if (cbAllConf) cbAllConf.checked = conf.length > 0 && okConf === conf.length;
    const cbAllOpcio = document.getElementById('mn-rev-cb-all-opcio');
    if (cbAllOpcio) cbAllOpcio.checked = opcio.length > 0 && okOpcio === opcio.length;
};

window._mnRevMarcarTodosGrupo = function(grupo, marcado) {
    const servs = (window._mnRevServicosModal || []).filter(function(s) { return s.grupo === grupo; });
    servs.forEach(function(s) {
        const cb = document.querySelector('#mn-rev-modal-ov input[data-rev-item="' + s.id + '"][data-rev-field="realizado"]');
        const sel = document.querySelector('#mn-rev-modal-ov select[data-rev-item="' + s.id + '"][data-rev-field="tipo"]');
        const row = document.querySelector('#mn-rev-modal-ov tr[data-rev-row="' + s.id + '"]');
        if ((row && row.getAttribute('data-cf-oculto') === '1') || (cb && cb.disabled)) return;
        if (cb) cb.checked = !!marcado;
        if (sel) {
            if (marcado && grupo === 'opcional') sel.value = 'vistoriado';
            sel.disabled = !marcado;
            sel.style.background = marcado ? '' : '#f1f5f9';
            sel.style.color = marcado ? '' : '#94a3b8';
        }
        if (row) row.style.background = marcado ? '#f0fdf4' : '#fff';
        if (!marcado) window._mnRevPodarVinculos(s.id);
    });
    window._mnRevAtualizarContadorObrig();
};

window._mnRevAoMudarStatus = function() {
    const st = document.getElementById('mn-rev-f-status')?.value || 'pendente';
    const dcEl = document.getElementById('mn-rev-f-data-concl');
    if (st === 'realizada' && dcEl && !dcEl.value) {
        dcEl.value = window._mnHojeISO();
    }
    window._mnRevAtualizarInfoParado();
};

window._mnRevAoMudarData = function() {
    const dt = String(document.getElementById('mn-rev-f-data')?.value || '').trim();
    const stEl = document.getElementById('mn-rev-f-status');
    if (dt && stEl && stEl.value === 'pendente') stEl.value = 'agendada';
    window._mnRevAtualizarInfoParado();
};

window.mnRevAbrirModalMarco = function(marcoKm, marcoMeses) {
    const ctx = window._mnRevAtual;
    if (!ctx || !ctx.veiculo) return;
    const E = window._mnRevEsc;
    const v = ctx.veiculo;
    const ehCar = window._mnRevEhCarretinha(v);
    const reg = (ctx.revisoes || []).find(function(r) { return Number(r.marco_km) === Number(marcoKm); }) || {
        id: null, veiculo_id: v.id, marco_km: marcoKm, marco_meses: marcoMeses, status: 'pendente', data_solicitacao: '', data_revisao: '', data_conclusao: '', km_revisao: '',
        concessionaria: (function() { const ga = String(v.garantia_fabrica_ate || '').split('T')[0]; return (ga && ga >= window._mnHojeISO()) ? 'Concessionária Autorizada Fiat' : ''; })(), numero_os: '', valor_pecas: 0, valor_mao_obra: 0, valor_total: 0,
        itens: {}, observacoes: '', anexos: [], midias: [], lancamentos: []
    };
    const avisosMap = (ctx && ctx.avisos) || {};
    const revInfo = v.revisao_info || {};
    const mpInfo = revInfo.marco_pendente || revInfo;
    const emAlertaMarco = mpInfo && Number(mpInfo.marco_km) === Number(marcoKm) && (mpInfo.status === 'a_vencer' || mpInfo.status === 'vencida' || revInfo.status === 'a_vencer' || revInfo.status === 'vencida');
    const dtSolicPadrao = String(reg.data_solicitacao || avisosMap[Number(marcoKm)] || (emAlertaMarco ? window._mnHojeISO() : '')).split('T')[0];
    const dtRevPadrao = String(reg.data_revisao || '').split('T')[0];
    const dtConclPadrao = String(reg.data_conclusao || (reg.status === 'realizada' ? (reg.concluido_em || reg.data_revisao || '') : '')).split('T')[0];
    const statusModal = (reg.status === 'pendente' && dtRevPadrao && dtRevPadrao <= window._mnHojeISO()) ? 'agendada' : (reg.status || 'pendente');
    const itensSalvos = reg.itens || {};
    window._mnRevMarcoAtual = { km: marcoKm, meses: marcoMeses };
    window._mnRevNotaStage = null;
    window._mnRevRateioSel = [];
    const servicos = window._mnRevServicosDoMarco(marcoKm);
    window._mnRevServicosModal = servicos;

    let ov = document.getElementById('mn-rev-modal-ov');
    if (ov) ov.remove();
    ov = document.createElement('div');
    ov.id = 'mn-rev-modal-ov';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.75);backdrop-filter:blur(3px);z-index:10050;display:flex;align-items:stretch;justify-content:center;padding:0;overflow:hidden;';

    const obrig = servicos.filter(function(s) { return s.grupo === 'obrigatorio'; });
    const conf = servicos.filter(function(s) { return s.grupo === 'conferencia'; });
    const opcio = servicos.filter(function(s) { return s.grupo === 'opcional'; });
    const thServ = `<thead><tr style="background:#f1f5f9;text-align:left;color:#475569;">
        <th style="padding:8px 10px;width:34px;text-align:center;">OK</th>
        <th style="padding:8px 10px;">Serviço / O que fazer</th>
        <th style="padding:8px 10px;width:250px;">Foi realizado como?</th>
        <th style="padding:8px 10px;width:190px;">Observações</th></tr></thead>`;
    const thConf = `<thead><tr style="background:#f1f5f9;text-align:left;color:#475569;">
        <th style="padding:8px 10px;width:34px;text-align:center;">OK</th>
        <th style="padding:8px 10px;">Conferência / O que fazer</th>
        <th style="padding:8px 10px;width:240px;">Foi realizado como?</th>
        <th style="padding:8px 10px;min-width:210px;">Fotos obrigatórias (R2)</th></tr></thead>`;

    ov.innerHTML = `
    <div style="background:#fff;border-radius:0;width:100%;max-width:none;height:100vh;max-height:100vh;display:flex;flex-direction:column;box-shadow:none;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#5b21b6,#7c3aed);color:#fff;padding:1.1rem 1.5rem;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
            <div>
                <div style="font-size:0.75rem;opacity:0.9;font-weight:600;text-transform:uppercase;">${E(v.placa)} • ${E(v.marca_modelo_versao || '')}${ehCar ? ' • Plano por tempo (a cada 12 meses)' : ' • KM Atual: ' + Number(v.km_atual || 0).toLocaleString('pt-BR') + ' km'}</div>
                <h3 style="margin:2px 0 0;font-size:1.2rem;font-weight:800;">${ehCar ? (Math.round(Number(marcoKm) / 10000) + 'ª Revisão (' + marcoMeses + ' meses)') : (Math.round(Number(marcoKm) / (Number(v.uso_severo) === 1 ? 5000 : 10000)) + 'ª Revisão (marco ' + Number(marcoKm).toLocaleString('pt-BR') + ' km / ' + marcoMeses + ' meses)')}</h3>
            </div>
            <button onclick="document.getElementById('mn-rev-modal-ov').remove()" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:34px;height:34px;border-radius:50%;cursor:pointer;font-size:1.2rem;">&times;</button>
        </div>

        <div style="padding:1.25rem 1.5rem;overflow-y:auto;flex:1;display:block;">
            <!-- 1. Registro de execucao -->
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:1rem;margin-bottom:1.25rem;">
                <div style="font-weight:800;color:#1e293b;margin-bottom:0.75rem;font-size:0.9rem;"><i class="ph ph-wrench" style="color:#7c3aed;"></i> 1. Registro de Execução da Revisão</div>
                <div id="mn-rev-parado-info" style="margin-bottom:0.75rem;"></div>
                <input type="hidden" id="mn-rev-f-km" value="${(reg.status === 'realizada' && reg.km_revisao) ? reg.km_revisao : (v.km_atual || '')}">
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:0.75rem;">
                    <div>
                        <label style="font-size:0.75rem;font-weight:700;color:#475569;display:block;margin-bottom:4px;">Situação da Revisão *</label>
                        <select id="mn-rev-f-status" onchange="window._mnRevAoMudarStatus()" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:8px;font-weight:700;font-size:0.85rem;">
                            <option value="pendente"${statusModal === 'pendente' ? ' selected' : ''}>Pendente</option>
                            <option value="agendada"${statusModal === 'agendada' ? ' selected' : ''}>Agendada</option>
                            <option value="realizada"${statusModal === 'realizada' ? ' selected' : ''}>Realizada (Concluída)</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-size:0.75rem;font-weight:700;color:#475569;display:block;margin-bottom:4px;">Data da solicitação</label>
                        <input type="date" id="mn-rev-f-data-solic" value="${dtSolicPadrao}" title="Data em que surgiu o alerta de revisão próxima (pode ser editada)" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:8px;font-size:0.85rem;box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="font-size:0.75rem;font-weight:700;color:#475569;display:block;margin-bottom:4px;">Data da Revisão</label>
                        <input type="date" id="mn-rev-f-data" onchange="window._mnRevAoMudarData()" value="${dtRevPadrao}" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:8px;font-size:0.85rem;box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="font-size:0.75rem;font-weight:700;color:#475569;display:block;margin-bottom:4px;">Data de conclusão</label>
                        <input type="date" id="mn-rev-f-data-concl" value="${dtConclPadrao}" title="Data de conclusão da revisão (pode ser editada)" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:8px;font-size:0.85rem;box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="font-size:0.75rem;font-weight:700;color:#475569;display:block;margin-bottom:4px;">Concessionária / Autorizada</label>
                        <input type="text" id="mn-rev-f-conc" value="${E(reg.concessionaria || '')}" placeholder="Ex: Concessionária Fiat" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:8px;font-size:0.85rem;box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="font-size:0.75rem;font-weight:700;color:#475569;display:block;margin-bottom:4px;">Nº Ordem de Serviço (OS)</label>
                        <input type="text" id="mn-rev-f-os" value="${E(reg.numero_os || '')}" placeholder="Nº da OS" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:8px;font-size:0.85rem;box-sizing:border-box;">
                    </div>
                </div>
            </div>

            <!-- 2. Servicos obrigatorios, conferencias internas e opcionais -->
            <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:1.25rem;">
                <div style="background:#f8fafc;padding:0.75rem 1rem;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                    <div style="font-weight:800;color:#1e293b;font-size:0.9rem;"><i class="ph ph-list-checks" style="color:#7c3aed;"></i> 2. Serviços da Revisão — marque o que foi realizado</div>
                    <div style="position:relative;flex:1;min-width:200px;max-width:340px;margin-left:auto;">
                        <i class="ph ph-magnifying-glass" style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:#94a3b8;"></i>
                        <input type="text" id="mn-rev-busca-serv" autocomplete="off" placeholder="Pesquisar serviço pelo nome..." oninput="window._mnRevFiltrarServicos(this.value)" style="width:100%;padding:0.4rem 0.6rem 0.4rem 1.9rem;border:1px solid #cbd5e1;border-radius:8px;font-size:0.8rem;box-sizing:border-box;">
                    </div>
                    <span id="mn-rev-cont-obrig" style="font-size:0.75rem;font-weight:800;padding:3px 10px;border-radius:999px;background:#fef2f2;color:#b91c1c;"></span>
                </div>
                ${obrig.length ? `                <div onclick="window._mnRevToggleGrupo('obrigatorio')" style="padding:7px 12px;background:#fef2f2;color:#991b1b;font-size:0.78rem;font-weight:800;border-bottom:1px solid #fecaca;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;cursor:pointer;user-select:none;">
                    <span style="display:inline-flex;align-items:center;gap:6px;"><i id="mn-rev-grp-ico-obrigatorio" class="ph-bold ph-caret-right"></i> <span>Serviços OBRIGATÓRIOS (Mecânico)</span></span>
                    <label onclick="event.stopPropagation()" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;background:#fff;border:1px solid #fca5a5;color:#991b1b;padding:3px 10px;border-radius:6px;font-size:0.76rem;font-weight:800;">
                        <input type="checkbox" id="mn-rev-cb-all-obrig" onchange="window._mnRevMarcarTodosGrupo('obrigatorio', this.checked)" style="width:16px;height:16px;cursor:pointer;accent-color:#16a34a;"> Marcar todos os obrigatórios
                    </label>
                </div>
                <div id="mn-rev-grp-body-obrigatorio" style="overflow-x:auto;display:none;"><table style="width:100%;border-collapse:collapse;font-size:0.8rem;">${thServ}<tbody>${obrig.map(function(s) { return window._mnRevLinhaServicoHtml(s, itensSalvos[s.id] || {}); }).join('')}</tbody></table></div>` : ''}
                <div onclick="window._mnRevToggleGrupo('conferencia')" style="padding:7px 12px;background:#eff6ff;color:#1e40af;font-size:0.78rem;font-weight:800;border-top:1px solid #bfdbfe;border-bottom:1px solid #bfdbfe;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;cursor:pointer;user-select:none;">
                    <span style="display:inline-flex;align-items:center;gap:6px;"><i id="mn-rev-grp-ico-conferencia" class="ph-bold ${window._mnRevModoCompras ? 'ph-caret-right' : 'ph-caret-down'}"></i> <span>Conferências OBRIGATÓRIAS (Interno)</span></span>
                    <label onclick="event.stopPropagation()" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;background:#fff;border:1px solid #93c5fd;color:#1e40af;padding:3px 10px;border-radius:6px;font-size:0.76rem;font-weight:800;">
                        <input type="checkbox" id="mn-rev-cb-all-conf" onchange="window._mnRevMarcarTodosGrupo('conferencia', this.checked)" style="width:16px;height:16px;cursor:pointer;accent-color:#16a34a;"> Marcar todas as conferências
                    </label>
                </div>
                <div id="mn-rev-grp-body-conferencia" style="overflow-x:auto;display:${window._mnRevModoCompras ? 'none' : 'block'};"><table style="width:100%;border-collapse:collapse;font-size:0.8rem;">${thConf}<tbody>${conf.map(function(s) { return window._mnRevLinhaServicoHtml(s, itensSalvos[s.id] || {}); }).join('')}</tbody></table></div>
                ${opcio.length ? `                <div onclick="window._mnRevToggleGrupo('opcional')" style="padding:7px 12px;background:#f1f5f9;color:#475569;font-size:0.78rem;font-weight:800;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;cursor:pointer;user-select:none;">
                    <span style="display:inline-flex;align-items:center;gap:6px;"><i id="mn-rev-grp-ico-opcional" class="ph-bold ph-caret-right"></i> <span>OPCIONAIS</span></span>
                    <label onclick="event.stopPropagation()" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;background:#fff;border:1px solid #cbd5e1;color:#334155;padding:3px 10px;border-radius:6px;font-size:0.76rem;font-weight:800;">
                        <input type="checkbox" id="mn-rev-cb-all-opcio" onchange="window._mnRevMarcarTodosGrupo('opcional', this.checked)" style="width:16px;height:16px;cursor:pointer;accent-color:#16a34a;"> Marcar todos os opcionais
                    </label>
                </div>
                <div id="mn-rev-grp-body-opcional" style="overflow-x:auto;display:none;"><table style="width:100%;border-collapse:collapse;font-size:0.8rem;">${thServ}<tbody>${opcio.map(function(s) { return window._mnRevLinhaServicoHtml(s, itensSalvos[s.id] || {}); }).join('')}</tbody></table></div>` : ''}
            </div>

            <!-- 3. Anexar notas / OS -->
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:1rem;margin-bottom:1.25rem;">
                <div style="font-weight:800;color:#1e293b;margin-bottom:0.75rem;font-size:0.9rem;"><i class="ph ph-receipt" style="color:#0284c7;"></i> 3. Anexar Nota Fiscal de Serviço, Nota de Peças ou Ordem de Serviço (PDF)</div>
                <div style="background:#fff;border:1px dashed #94a3b8;border-radius:10px;padding:0.85rem;">
                    <div style="font-size:0.76rem;color:#475569;margin-bottom:8px;">Selecione o PDF: o sistema lê a nota e preenche as peças e a mão de obra (valores podem estar separados ou juntos, em uma ou várias notas). Depois vincule cada item a um serviço da revisão.</div>
                    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                        <input type="hidden" id="mn-rev-anx-tipo" value="nota_servico">
                        <label style="display:inline-flex;align-items:center;gap:6px;background:#0284c7;color:#fff;padding:0.5rem 1rem;border-radius:8px;font-size:0.82rem;font-weight:700;cursor:pointer;">
                            <i class="ph ph-paperclip"></i> Anexar documento (PDF)
                            <input type="file" id="mn-rev-anx-file" accept="application/pdf" onchange="window._mnRevAoEscolherPdf(this)" style="display:none;">
                        </label>
                        <span style="font-size:0.74rem;color:#64748b;">O sistema identifica automaticamente o tipo do documento (nota de peças, nota de serviço ou OS).</span>
                    </div>
                    <div style="margin-top:0.75rem;"><button type="button" onclick="window._mnRevIniciarManual()" style="background:#fff;color:#0284c7;border:1px solid #7dd3fc;border-radius:8px;padding:0.4rem 0.9rem;font-size:0.8rem;font-weight:700;cursor:pointer;">+ Adicionar peça / serviço manual</button></div>
                    <div id="mn-rev-stage" style="margin-top:0.75rem;"></div>
                    <div style="font-size:0.78rem;font-weight:700;color:#334155;margin:0.9rem 0 6px;">Notas / OS já anexadas nesta revisão:</div>
                    <div id="mn-rev-anx-lista" style="display:flex;flex-direction:column;gap:6px;"></div>
                </div>
            </div>

            <!-- 4. Valores -->
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:1rem;margin-bottom:1.25rem;">
                <div style="font-weight:800;color:#1e293b;margin-bottom:0.75rem;font-size:0.9rem;"><i class="ph ph-currency-circle-dollar" style="color:#16a34a;"></i> 4. Valores da Revisão (somente visualização — vêm das notas anexadas e das linhas manuais)</div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0.75rem;">
                    <div style="background:#dbeafe;border:1.5px solid #93c5fd;border-radius:12px;padding:0.75rem 0.9rem;">
                        <label style="font-size:0.75rem;font-weight:800;color:#1e40af;display:block;margin-bottom:4px;">Valor de Peças (R$)</label>
                        <input type="number" step="0.01" id="mn-rev-f-vpecas" value="${reg.valor_pecas || 0}" readonly tabindex="-1" style="width:100%;padding:0.25rem 0;border:none;border-radius:0;font-size:1.25rem;font-weight:800;box-sizing:border-box;background:transparent;color:#1e3a8a;cursor:default;outline:none;">
                    </div>
                    <div style="background:#e0f2fe;border:1.5px solid #7dd3fc;border-radius:12px;padding:0.75rem 0.9rem;">
                        <label style="font-size:0.75rem;font-weight:800;color:#0369a1;display:block;margin-bottom:4px;">Valor Mão de Obra / Serviço (R$)</label>
                        <input type="number" step="0.01" id="mn-rev-f-vmo" value="${reg.valor_mao_obra || 0}" readonly tabindex="-1" style="width:100%;padding:0.25rem 0;border:none;border-radius:0;font-size:1.25rem;font-weight:800;box-sizing:border-box;background:transparent;color:#075985;cursor:default;outline:none;">
                    </div>
                    <div style="background:#dcfce7;border:1.5px solid #86efac;border-radius:12px;padding:0.75rem 0.9rem;">
                        <label style="font-size:0.75rem;font-weight:800;color:#15803d;display:block;margin-bottom:4px;">Valor Total da Revisão (R$)</label>
                        <input type="number" step="0.01" id="mn-rev-f-vtotal" value="${reg.valor_total || 0}" readonly tabindex="-1" style="width:100%;padding:0.25rem 0;border:none;border-radius:0;font-size:1.25rem;font-weight:800;box-sizing:border-box;background:transparent;color:#166534;cursor:default;outline:none;">
                    </div>
                </div>
                <div id="mn-rev-custos-serv" style="margin-top:0.9rem;"></div>
            </div>

            <!-- 5. Video geral do veiculo -->
            <div id="mn-rev-sec-video" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:1rem;margin-bottom:1.25rem;">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:0.65rem;">
                    <div style="font-weight:800;color:#1e293b;font-size:0.9rem;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        <i class="ph ph-video-camera" style="color:#7c3aed;"></i> 5. Vídeo geral do veículo
                        <span style="background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;padding:1px 8px;border-radius:999px;font-size:0.68rem;font-weight:800;">OBRIGATÓRIO PARA CONCLUIR</span>
                    </div>
                </div>
                <div style="background:#fff;border:1px dashed #94a3b8;border-radius:10px;padding:0.85rem;">
                    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                        <div style="font-size:0.78rem;color:#475569;">Anexe um vídeo geral do veículo (obrigatório para alterar a situação da revisão para Realizada / Concluída).</div>
                        <label id="mn-rev-lbl-video" style="display:inline-flex;align-items:center;gap:6px;background:#7c3aed;color:#fff;padding:0.45rem 0.95rem;border-radius:8px;font-size:0.8rem;font-weight:700;cursor:pointer;">
                            <i class="ph ph-upload-simple"></i> Anexar vídeo geral do veículo
                            <input type="file" id="mn-rev-inp-video" accept="video/*" style="display:none;" onchange="window._mnRevAnexarVideoGeral(this)">
                        </label>
                    </div>
                    <div id="mn-rev-video-lista" style="margin-top:0.75rem;"></div>
                </div>
            </div>

            <div>
                <label style="font-size:0.78rem;font-weight:700;color:#475569;display:block;margin-bottom:4px;">Observações Gerais da Revisão / Recomendações da Concessionária</label>
                <textarea id="mn-rev-f-obs" rows="2" placeholder="Anote detalhes da Ordem de Serviço, pendências ou observações..." style="width:100%;padding:0.6rem;border:1px solid #cbd5e1;border-radius:8px;font-size:0.85rem;box-sizing:border-box;">${E(reg.observacoes || '')}</textarea>
            </div>
        </div>

        <div style="background:#f8fafc;padding:1rem 1.5rem;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:10px;flex-shrink:0;">
            <button type="button" onclick="document.getElementById('mn-rev-modal-ov').remove()" style="background:#fff;color:#475569;border:1px solid #cbd5e1;border-radius:8px;padding:0.6rem 1.2rem;font-weight:700;cursor:pointer;">Cancelar</button>
            <button type="button" id="mn-rev-btn-salvar" onclick="window.mnRevSalvarMarco(${marcoKm}, ${marcoMeses}, false)" style="background:#7c3aed;color:#fff;border:none;border-radius:8px;padding:0.6rem 1.4rem;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:6px;">
                <i class="ph ph-floppy-disk"></i> Salvar Revisão
            </button>
        </div>
    </div>`;

    document.body.appendChild(ov);
    window._mnRevAtualizarModalDados(false);
    window._mnRevAtualizarContadorObrig();
    window._mnRevAtualizarInfoParado();
};

// ── Vinculo de linhas da nota a servicos: lista suspensa (na frente de tudo) apenas com os servicos marcados no passo 2 ──
window._mnRevServicosMarcados = function() {
    return (window._mnRevServicosModal || []).filter(function(s) {
        const row = document.querySelector('#mn-rev-modal-ov tr[data-rev-row="' + s.id + '"]');
        if (row && row.getAttribute('data-cf-oculto') === '1') return false;
        const cb = document.querySelector('#mn-rev-modal-ov input[data-rev-item="' + s.id + '"][data-rev-field="realizado"]');
        return cb && cb.checked;
    });
};

window._mnRevVincLabel = function(servicos) {
    const arr = servicos || [];
    if (!arr.length) return 'Vincular serviço... \u25BE';
    if (arr.length === 1) {
        const s = (window._mnRevServicosModal || []).find(function(x) { return x.id === arr[0]; });
        return (s ? s.nome : arr[0]) + ' \u25BE';
    }
    return arr.length + ' serviços \u25BE';
};

window._mnRevFecharVinculo = function() {
    const el = document.getElementById('mn-rev-vinc-pop');
    if (el) el.remove();
    if (window._mnRevVincOutside) {
        document.removeEventListener('mousedown', window._mnRevVincOutside, true);
        window.removeEventListener('scroll', window._mnRevVincScroll, true);
        window.removeEventListener('keydown', window._mnRevVincKey, true);
        window._mnRevVincOutside = null;
    }
};

window._mnRevAbrirVinculo = function(i, btn) {
    const st = window._mnRevNotaStage;
    if (!st || !st.lancs[i] || !btn) return;
    const jaAberto = document.getElementById('mn-rev-vinc-pop');
    const mesmo = jaAberto && jaAberto.getAttribute('data-linha') === String(i);
    window._mnRevFecharVinculo();
    if (mesmo) return;
    const E = window._mnRevEsc;
    const l = st.lancs[i];
    const marcados = window._mnRevServicosMarcados();
    window._mnRevVincFiltro = '';
    const pop = document.createElement('div');
    pop.id = 'mn-rev-vinc-pop';
    pop.setAttribute('data-linha', String(i));
    const r = btn.getBoundingClientRect();
    const largura = 330;
    const alturaMax = 340;
    const esq = Math.min(Math.max(8, r.right - largura), window.innerWidth - largura - 8);
    const abreAcima = (window.innerHeight - r.bottom) < alturaMax && r.top > alturaMax;
    pop.style.cssText = 'position:fixed;z-index:10300;width:' + largura + 'px;max-height:' + alturaMax + 'px;overflow-y:auto;background:#fff;border:1px solid #cbd5e1;border-radius:10px;box-shadow:0 12px 30px rgba(0,0,0,0.28);padding:0 12px 8px;left:' + esq + 'px;' + (abreAcima ? 'bottom:' + (window.innerHeight - r.top + 4) + 'px;' : 'top:' + (r.bottom + 4) + 'px;');
    pop.innerHTML = '<div style="position:sticky;top:0;background:#fff;padding:8px 0 6px;border-bottom:1px solid #e2e8f0;z-index:1;">'
        + '<div style="font-size:0.74rem;font-weight:800;color:#075985;margin-bottom:5px;">Serviços marcados no passo 2</div>'
        + (marcados.length ? '<input type="text" id="mn-rev-vinc-busca" autocomplete="off" placeholder="Pesquisar serviço pelo nome..." oninput="window._mnRevVincFiltro=this.value;window._mnRevVincDesenhar(' + i + ')" style="width:100%;box-sizing:border-box;padding:0.35rem 0.55rem;border:1px solid #cbd5e1;border-radius:7px;font-size:0.78rem;outline:none;">' : '')
        + '</div><div id="mn-rev-vinc-lista"></div>';
    document.body.appendChild(pop);
    window._mnRevVincDesenhar(i);
    const campoBusca = document.getElementById('mn-rev-vinc-busca');
    if (campoBusca) { try { campoBusca.focus(); } catch (e) {} }
    window._mnRevVincOutside = function(ev) { if (!pop.contains(ev.target) && ev.target !== btn) window._mnRevFecharVinculo(); };
    window._mnRevVincScroll = function(ev) { if (!pop.contains(ev.target)) window._mnRevFecharVinculo(); };
    window._mnRevVincKey = function(ev) { if (ev.key === 'Escape') window._mnRevFecharVinculo(); };
    document.addEventListener('mousedown', window._mnRevVincOutside, true);
    window.addEventListener('scroll', window._mnRevVincScroll, true);
    window.addEventListener('keydown', window._mnRevVincKey, true);
};

window._mnRevVincPassa = function(s) {
    const norm = function(t) { return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); };
    const palavras = norm(window._mnRevVincFiltro || '').split(' ').filter(Boolean);
    const alvo = norm(s.nome);
    return palavras.every(function(p) { return alvo.indexOf(p) !== -1; });
};

// Lista do popup de vinculo: busca por nome + "selecionar todos" por tipo (Obrigatorios / Conferencias / Opcionais)
window._mnRevVincDesenhar = function(i) {
    const box = document.getElementById('mn-rev-vinc-lista');
    const st = window._mnRevNotaStage;
    if (!box || !st || !st.lancs[i]) return;
    const E = window._mnRevEsc;
    const l = st.lancs[i];
    const marcados = window._mnRevServicosMarcados();
    if (!marcados.length) {
        box.innerHTML = '<div style="font-size:0.78rem;color:#b45309;padding:8px 0;">Nenhum serviço marcado. Marque no passo 2 os serviços que foram realizados para poder vincular.</div>';
        return;
    }
    const bloco = function(titulo, grupo) {
        const lista = marcados.filter(function(s) { return s.grupo === grupo; }).filter(window._mnRevVincPassa);
        if (!lista.length) return '';
        const todos = lista.every(function(s) { return l.servicos.indexOf(s.id) >= 0; });
        return '<label style="display:flex;align-items:center;gap:6px;font-size:0.68rem;font-weight:800;color:#475569;background:#f1f5f9;border-radius:6px;padding:4px 6px;margin:8px 0 2px;cursor:pointer;">'
            + '<input type="checkbox" ' + (todos ? 'checked' : '') + ' onchange="window._mnRevStageToggleGrupo(' + i + ',\'' + grupo + '\',this.checked)" style="accent-color:#7c3aed;"> ' + titulo + ' <span style="font-weight:600;color:#94a3b8;">(selecionar todos)</span></label>'
            + lista.map(function(s) {
                return '<label style="display:flex;align-items:center;gap:6px;font-size:0.78rem;color:#1e293b;padding:3px 0 3px 8px;cursor:pointer;"><input type="checkbox" ' + (l.servicos.indexOf(s.id) >= 0 ? 'checked' : '') + ' onchange="window._mnRevStageToggleServ(' + i + ',\'' + s.id + '\',this.checked);window._mnRevVincDesenhar(' + i + ')" style="accent-color:#7c3aed;"> ' + E(s.nome) + '</label>';
            }).join('');
    };
    box.innerHTML = bloco('OBRIGATÓRIOS (MECÂNICO)', 'obrigatorio') + bloco('CONFERÊNCIAS INTERNAS', 'conferencia') + bloco('OPCIONAIS', 'opcional')
        || '<div style="font-size:0.78rem;color:#94a3b8;padding:8px 0;">Nenhum serviço encontrado para a pesquisa.</div>';
};

window._mnRevStageToggleGrupo = function(i, grupo, marcado) {
    const st = window._mnRevNotaStage;
    if (!st || !st.lancs[i]) return;
    window._mnRevServicosMarcados().filter(function(s) { return s.grupo === grupo; }).filter(window._mnRevVincPassa).forEach(function(s) {
        window._mnRevStageToggleServ(i, s.id, marcado);
    });
    window._mnRevVincDesenhar(i);
};

window._mnRevStageToggleServ = function(i, id, marcado) {
    const st = window._mnRevNotaStage;
    if (!st || !st.lancs[i]) return;
    const arr = st.lancs[i].servicos;
    const pos = arr.indexOf(id);
    if (marcado && pos < 0) arr.push(id);
    if (!marcado && pos >= 0) arr.splice(pos, 1);
    const btn = document.getElementById('mn-stg-btn-' + i);
    if (btn) { btn.textContent = window._mnRevVincLabel(arr); btn.style.color = arr.length ? '#15803d' : '#b45309'; }
    window._mnRevAtualizarCustosPreview();
};

// Servico desmarcado no passo 2: remove o vinculo das linhas ainda nao anexadas
window._mnRevPodarVinculos = function(id) {
    const st = window._mnRevNotaStage;
    if (!st) return;
    let mudou = false;
    st.lancs.forEach(function(l) { const p = l.servicos.indexOf(id); if (p >= 0) { l.servicos.splice(p, 1); mudou = true; } });
    if (mudou) { window._mnRevFecharVinculo(); window._mnRevRenderStage(); }
};

// Custo por servico em tempo real: notas ja lancadas + linhas da nota em edicao (conforme vai vinculando)
window._mnRevAtualizarCustosPreview = function() {
    const el = document.getElementById('mn-rev-custos-serv');
    const reg = window._mnRevRegAtual();
    const lancs = reg ? (reg.lancamentos || []).slice() : [];
    const st = window._mnRevNotaStage;
    if (st) st.lancs.forEach(function(l) {
        if (l.incluir && !(l.tipo === 'peca' && l.estoque) && Number(l.valor_total) > 0) lancs.push({ tipo: l.tipo, valor_total: Number(l.valor_total), servicos: l.servicos || [], fornecedor: st.fornecedor || l.fornecedor || '' });
    });
    if (el) el.innerHTML = window._mnRevCustosPorServicoHtml(lancs);
    const boxStage = document.getElementById('mn-rev-stage-custos');
    if (boxStage) {
        const soStage = [];
        if (st) st.lancs.forEach(function(l) { if (l.incluir && !(l.tipo === 'peca' && l.estoque) && Number(l.valor_total) > 0) soStage.push({ tipo: l.tipo, valor_total: Number(l.valor_total), servicos: l.servicos || [], fornecedor: st.fornecedor || l.fornecedor || '' }); });
        boxStage.innerHTML = st ? window._mnRevCustosPorServicoHtml(soStage) : '';
    }
};

// ── Veiculo parado durante a revisao (agendada): dias parado ──
// Contagem de veiculo parado na revisao: comeca as 08:00 (Brasilia) do dia do agendamento
window._mnRevParadoDur = function(iniDate, fimMs) {
    const ini = new Date(String(iniDate).split('T')[0] + 'T08:00:00-03:00').getTime();
    if (isNaN(ini)) return null;
    const ms = (fimMs || Date.now()) - ini;
    if (ms < 0) return null;
    const min = Math.floor(ms / 60000);
    return { min: min, dias: Math.floor(min / 1440), horas: Math.floor((min % 1440) / 60) };
};

window._mnRevDurTxt = function(min) {
    const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60);
    return '<b>' + d + ' dia' + (d === 1 ? '' : 's') + ' e ' + h + ' hora' + (h === 1 ? '' : 's') + '</b>';
};

window._mnRevFmtDataHora = function(v) {
    if (!v) return '';
    const s = String(v);
    if (s.length <= 10) return _mnRevFmtDataBR(s);
    const d = new Date(s);
    if (isNaN(d.getTime())) return _mnRevFmtDataBR(s);
    return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Trecho que se atualiza sozinho a cada minuto enquanto o veiculo esta parado
window._mnRevParadoLive = function(ini) {
    const d = String(ini).split('T')[0];
    const dur = window._mnRevParadoDur(d);
    window._mnRevParadoIniciarTick();
    return '<span class="mn-rev-parado-live" data-ini="' + d + '">' + window._mnRevDurTxt(dur ? dur.min : 0) + '</span>';
};

window._mnRevParadoTick = function() {
    const els = document.querySelectorAll('.mn-rev-parado-live');
    if (!els.length) { clearInterval(window._mnRevParadoTimer); window._mnRevParadoTimer = null; return; }
    els.forEach(function(el) {
        const dur = window._mnRevParadoDur(el.getAttribute('data-ini'));
        el.innerHTML = window._mnRevDurTxt(dur ? dur.min : 0);
    });
};

window._mnRevParadoIniciarTick = function() {
    if (!window._mnRevParadoTimer) window._mnRevParadoTimer = setInterval(window._mnRevParadoTick, 60000);
};

window._mnRevCalcMinConcluida = function(reg) {
    if (!reg) return null;
    if (String(reg.observacoes || '').includes('marcada como feita manualmente')) return null;
    if (reg.parado_minutos !== null && reg.parado_minutos !== undefined && reg.parado_minutos !== '') return Number(reg.parado_minutos);
    if (reg.dias_parado !== null && reg.dias_parado !== undefined && reg.dias_parado !== '') return Number(reg.dias_parado) * 1440;
    const ini = String(reg.parado_desde || reg.data_revisao || '').split('T')[0];
    if (!ini) return null;
    const fimStr = reg.concluido_em || reg.updated_at || reg.created_at;
    const fimMs = fimStr ? new Date(String(fimStr).includes('T') ? fimStr : (String(fimStr).replace(' ', 'T') + 'Z')).getTime() : Date.now();
    const dur = window._mnRevParadoDur(ini, isNaN(fimMs) ? Date.now() : fimMs);
    return dur ? dur.min : 0;
};

window._mnRevParadoCardBannerHtml = function(reg) {
    if (!reg) return '';
    const hoje = window._mnHojeISO();
    if (reg.status === 'agendada') {
        const ini = String(reg.data_revisao || reg.parado_desde || '').split('T')[0];
        if (!ini) return '';
        if (ini > hoje) {
            return '<div style="background:#fffbeb;border:1.5px solid #f59e0b;border-radius:10px;padding:0.6rem 0.8rem;color:#92400e;font-size:0.78rem;font-weight:600;">\uD83D\uDCC5 Agendada para <b>' + _mnRevFmtDataBR(ini) + '</b> — veículo disponível até essa data (contagem inicia às 08:00)</div>';
        }
        return '<div style="background:linear-gradient(135deg,#fef2f2,#fee2e2);border:2px solid #ef4444;border-radius:10px;padding:0.65rem 0.8rem;box-shadow:0 2px 6px rgba(220,38,38,0.12);">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;flex-wrap:wrap;">'
            + '<span style="background:#dc2626;color:#fff;padding:3px 9px;border-radius:6px;font-size:0.78rem;font-weight:900;letter-spacing:0.3px;">\uD83D\uDEA7 VEÍCULO INDISPONÍVEL</span>'
            + '<span style="font-size:0.75rem;font-weight:800;color:#991b1b;">(desde ' + _mnRevFmtDataBR(ini) + ' 08:00)</span>'
            + '</div>'
            + '<div style="margin-top:6px;font-size:0.82rem;font-weight:700;color:#7f1d1d;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">'
            + '<span>Parado há:</span>'
            + '<span style="background:#fff;border:1.5px solid #f87171;color:#b91c1c;padding:2px 10px;border-radius:6px;font-size:0.92rem;font-weight:900;">' + window._mnRevParadoLive(ini) + '</span>'
            + '</div>'
            + '</div>';
    }
    if (reg.status === 'realizada') {
        const min = window._mnRevCalcMinConcluida(reg);
        if (min === null || isNaN(min)) return '';
        const ini = String(reg.parado_desde || reg.data_revisao || '').split('T')[0];
        return '<div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;padding:0.6rem 0.8rem;">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;flex-wrap:wrap;">'
            + '<span style="font-size:0.78rem;font-weight:800;color:#15803d;">\u23F1\uFE0F Tempo com veículo parado:</span>'
            + '<span style="background:#16a34a;color:#fff;padding:2px 9px;border-radius:6px;font-size:0.86rem;font-weight:900;">' + window._mnRevDurTxt(min) + '</span>'
            + '</div>'
            + (ini ? '<div style="margin-top:3px;font-size:0.73rem;font-weight:600;color:#166534;">(desde ' + _mnRevFmtDataBR(ini) + ' 08:00' + (reg.concluido_em ? ' até ' + window._mnRevFmtDataHora(reg.concluido_em) : '') + ')</div>' : '')
            + '</div>';
    }
    return '';
};

window._mnRevParadoTxt = function(reg) {
    if (!reg) return '';
    const hoje = window._mnHojeISO();
    if (reg.status === 'agendada') {
        const ini = String(reg.data_revisao || reg.parado_desde || '').split('T')[0];
        if (!ini) return '';
        if (ini > hoje) return '\uD83D\uDCC5 Agendada para <b>' + _mnRevFmtDataBR(ini) + '</b> — veículo disponível até essa data (a contagem de parado começa às 08:00)';
        return '\uD83D\uDEA7 Veículo <b style="color:#dc2626;">indisponível</b> — parado há ' + window._mnRevParadoLive(ini) + ' (desde ' + _mnRevFmtDataBR(ini) + ' 08:00)';
    }
    if (reg.status === 'realizada') {
        const min = window._mnRevCalcMinConcluida(reg);
        if (min === null || isNaN(min)) return '';
        const ini = String(reg.parado_desde || reg.data_revisao || '').split('T')[0];
        return '\u2705 Ficou parado ' + window._mnRevDurTxt(min) + (ini ? ' (desde ' + _mnRevFmtDataBR(ini) + ' 08:00' + (reg.concluido_em ? ' até ' + window._mnRevFmtDataHora(reg.concluido_em) : '') + ')' : '');
    }
    return '';
};

window._mnRevAtualizarInfoParado = function() {
    const el = document.getElementById('mn-rev-parado-info');
    if (!el) return;
    const reg = window._mnRevRegAtual();
    const status = document.getElementById('mn-rev-f-status')?.value || 'pendente';
    const dt = String(document.getElementById('mn-rev-f-data')?.value || '').split('T')[0];
    const hoje = window._mnHojeISO();
    let html = '', bg = '#f0fdf4', borda = '#bbf7d0', cor = '#166534';
    if (status === 'agendada') {
        const iniSalvo = (reg && reg.status === 'agendada' && reg.parado_desde) ? String(reg.parado_desde).split('T')[0] : '';
        const ini = dt || iniSalvo || hoje;
        if (ini > hoje) { html = '\uD83D\uDCC5 Agendada para <b>' + _mnRevFmtDataBR(ini) + '</b> — o veículo continua <b>disponível</b> no resumo da rota até essa data. A contagem de parado começa às 08:00 desse dia.'; bg = '#fffbeb'; borda = '#fde68a'; cor = '#92400e'; }
        else { html = '\uD83D\uDEA7 Veículo <b>indisponível</b> no resumo da rota — parado há ' + window._mnRevParadoLive(ini) + ' (desde ' + _mnRevFmtDataBR(ini) + ' 08:00). A contagem recomeça se a data da revisão for alterada.'; bg = '#fef2f2'; borda = '#fecaca'; cor = '#991b1b'; }
    } else if (status === 'realizada') {
        if (reg && reg.status === 'realizada' && (!dt || dt === String(reg.parado_desde || reg.data_revisao || '').split('T')[0]) && window._mnRevParadoTxt(reg)) {
            html = window._mnRevParadoTxt(reg) + ' — veículo disponível no resumo da rota.';
        } else {
            const ini = dt || (reg && String(reg.parado_desde || reg.data_revisao || '').split('T')[0]) || hoje;
            const dur = ini > hoje ? null : window._mnRevParadoDur(ini);
            html = '\u2705 Ao salvar como Realizada o veículo volta a ficar <b>disponível</b> no resumo da rota. Tempo parado: ' + window._mnRevDurTxt(dur ? dur.min : 0) + ' (desde ' + _mnRevFmtDataBR(ini) + ' 08:00).';
        }
    } else {
        html = '\u2705 Veículo disponível no resumo da rota (revisão sem agendamento).';
    }
    el.innerHTML = '<div style="background:' + bg + ';border:1px solid ' + borda + ';color:' + cor + ';border-radius:8px;padding:6px 10px;font-size:0.8rem;">' + html + '</div>';
};

// Revisao do marco aberto (dados mais recentes vindos do servidor)
window._mnRevRegAtual = function() {
    const m = window._mnRevMarcoAtual;
    const ctx = window._mnRevAtual;
    if (!m || !ctx) return null;
    return (ctx.revisoes || []).find(function(r) { return Number(r.marco_km) === Number(m.km); }) || null;
};

// Atualiza lista de anexos, midias (fotos/video) e custo por servico (e, se pedido, os campos de valores) a partir dos dados do servidor
window._mnRevAtualizarModalDados = function(atualizaValores) {
    const reg = window._mnRevRegAtual();
    const listaEl = document.getElementById('mn-rev-anx-lista');
    if (listaEl) listaEl.innerHTML = window._mnRevRenderListaAnexos(reg ? (reg.anexos || []) : [], reg ? (reg.lancamentos || []) : []);
    if (atualizaValores && reg) {
        const set = function(id, val) { const el = document.getElementById(id); if (el) el.value = Number(val || 0).toFixed(2); };
        set('mn-rev-f-vpecas', reg.valor_pecas); set('mn-rev-f-vmo', reg.valor_mao_obra); set('mn-rev-f-vtotal', reg.valor_total);
    }
    (window._mnRevServicosModal || []).forEach(function(s) {
        if (s.grupo !== 'conferencia') return;
        const box = document.getElementById('mn-rev-conf-fotos-' + s.id);
        if (box) box.innerHTML = window._mnRevRenderFotosConfItem(s.id);
    });
    if (typeof window._mnRevRenderVideoGeral === 'function') window._mnRevRenderVideoGeral();
    if (typeof window._mnRevAtualizarContadorObrig === 'function') window._mnRevAtualizarContadorObrig();
    const custEl = document.getElementById('mn-rev-custos-serv');
    if (custEl) window._mnRevAtualizarCustosPreview();
};

window._mnRevCustosPorServicoHtml = function(lancs) {
    if (!lancs || !lancs.length) return '<div style="font-size:0.78rem;color:#94a3b8;">Os custos por serviço aparecem aqui conforme você vincula as linhas da nota aos serviços.</div>';
    const nomes = {};
    (window._mnRevServicosModal || []).forEach(function(s) { nomes[s.id] = s; });
    const reg = typeof window._mnRevRegAtual === 'function' ? window._mnRevRegAtual() : null;
    const anxForns = {};
    ((reg && reg.anexos) || []).forEach(function(a) { if (a && a.id && a.fornecedor) anxForns[a.id] = a.fornecedor; });
    const acc = {};
    let semVinculo = 0;
    lancs.forEach(function(l) {
        const sv = Array.isArray(l.servicos) ? l.servicos : [];
        const val = Number(l.valor_total || 0);
        if (!sv.length) { semVinculo += val; return; }
        const forn = String(l.fornecedor || (l.anexo_id && anxForns[l.anexo_id]) || '').trim();
        const parte = val / sv.length;
        sv.forEach(function(id) {
            if (!acc[id]) acc[id] = { pecas: 0, mo: 0, fornecedores: [] };
            if (l.tipo === 'mao_obra') acc[id].mo += parte; else acc[id].pecas += parte;
            if (forn && acc[id].fornecedores.indexOf(forn) === -1) acc[id].fornecedores.push(forn);
        });
    });
    const fmt = function(n) { return Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
    const E = window._mnRevEsc;
    const linhas = Object.keys(acc).map(function(id) {
        const s = nomes[id];
        const a = acc[id];
        const grpCor = s ? (s.grupo === 'obrigatorio' ? '#dc2626' : (s.grupo === 'conferencia' ? '#1d4ed8' : '#64748b')) : '#64748b';
        const grpTxt = (!window._mnRevModoCompras && s) ? (s.grupo === 'obrigatorio' ? 'OBRIGATÓRIO' : (s.grupo === 'conferencia' ? 'OBRIGATÓRIO' : 'OPCIONAL')) : '';
        const fornTxt = a.fornecedores.length ? a.fornecedores.map(E).join(' / ') : '<span style="color:#94a3b8;">—</span>';
        return `<tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:5px 8px;font-weight:600;color:#1e293b;">${E(s ? s.nome : id)}${grpTxt ? ` <span style="font-size:0.66rem;font-weight:800;color:${grpCor};">${grpTxt}</span>` : ''}</td><td style="padding:5px 8px;color:#334155;font-weight:600;">${fornTxt}</td><td style="padding:5px 8px;text-align:right;">${fmt(a.pecas)}</td><td style="padding:5px 8px;text-align:right;">${fmt(a.mo)}</td><td style="padding:5px 8px;text-align:right;font-weight:800;">${fmt(a.pecas + a.mo)}</td></tr>`;
    }).join('');
    return `<div style="font-size:0.78rem;font-weight:700;color:#334155;margin-bottom:4px;">Custo por serviço (rateado entre os serviços vinculados)</div>
    <div style="overflow-x:auto;background:#fff;border:1px solid #e2e8f0;border-radius:8px;"><table style="width:100%;border-collapse:collapse;font-size:0.78rem;">
    <thead><tr style="background:#f1f5f9;color:#475569;text-align:left;"><th style="padding:5px 8px;">Serviço</th><th style="padding:5px 8px;">Fornecedor</th><th style="padding:5px 8px;text-align:right;">Peças</th><th style="padding:5px 8px;text-align:right;">Mão de obra</th><th style="padding:5px 8px;text-align:right;">Total</th></tr></thead>
    <tbody>${linhas}</tbody></table></div>
    ${semVinculo > 0 ? `<div style="font-size:0.74rem;color:#b45309;margin-top:4px;">Valor sem vínculo a serviço: ${fmt(semVinculo)}</div>` : ''}`;
};

window._mnRevCalcTotalModal = function() {
    const vp = parseFloat(document.getElementById('mn-rev-f-vpecas')?.value || '0') || 0;
    const vm = parseFloat(document.getElementById('mn-rev-f-vmo')?.value || '0') || 0;
    const vtEl = document.getElementById('mn-rev-f-vtotal');
    if (vtEl) vtEl.value = (Math.round((vp + vm) * 100) / 100).toFixed(2);
};

window._mnRevRenderListaAnexos = function(anexos, lancs) {
    const E = window._mnRevEsc;
    const manuais = (lancs || []).filter(function(l) { return !l.anexo_id; });
    if ((!anexos || !anexos.length) && !manuais.length) {
        return '<div style="font-size:0.78rem;color:#94a3b8;padding:4px 0;">Nenhuma nota ou OS anexada ainda nesta revisão.</div>';
    }
    const nomes = {};
    (window._mnRevServicosModal || []).forEach(function(s) { nomes[s.id] = s.nome; });
    const tipoLbl = { nota_servico: 'NF Serviço (Mão de Obra)', nota_pecas: 'NF Peças (DANFE)', ordem_servico: 'Ordem de Serviço (OS)', outro: 'Comprovante' };
    const fmt = function(n) { return Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
    const garTxt = function(l) {
        const g = l.garantia_valor;
        if (g === undefined || g === null || g === '') return '';
        const n = Number(g);
        if (!(n > 0)) return 'sem garantia';
        return 'garantia ' + n + ' ' + (l.garantia_unidade === 'meses' ? (n === 1 ? 'mês' : 'meses') : (n === 1 ? 'dia' : 'dias'));
    };
    // Notas em PDF: resumo + linhas lancadas (com a garantia informada)
    const docs = (anexos || []).map(function(a) {
        const linhasDoc = (lancs || []).filter(function(l) { return Number(l.anexo_id) === Number(a.id); });
        const linhasHtml = linhasDoc.length ? `<div style="margin-top:4px;border-top:1px dashed #e2e8f0;padding-top:4px;">${linhasDoc.map(function(l) {
            const gt = garTxt(l);
            return `<div style="display:flex;justify-content:space-between;gap:8px;font-size:0.74rem;color:#475569;padding:1px 0;"><span><b>${l.tipo === 'mao_obra' ? 'Serviço' : 'Peça'}:</b> ${E(l.descricao)}${gt ? ` <span style="color:#0369a1;font-weight:700;">• ${gt}</span>` : ''}</span><b>${fmt(l.valor_total)}</b></div>`;
        }).join('')}</div>` : '';
        return `
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:6px 10px;font-size:0.78rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <i class="ph ph-file-pdf" style="color:#dc2626;font-size:1.1rem;"></i>
                    <span style="font-weight:700;color:#1e293b;">${tipoLbl[a.tipo_documento] || E(a.tipo_documento)}</span>
                    ${a.numero_nota ? `<span style="color:#475569;">Nº <b>${E(a.numero_nota)}</b></span>` : ''}
                    ${a.fornecedor ? `<span style="color:#0369a1;font-weight:700;">• ${E(a.fornecedor)}</span>` : ''}
                    ${Number(a.valor || 0) > 0 ? `<span style="color:#15803d;font-weight:700;">${fmt(a.valor)}</span>` : ''}
                    <span style="color:#94a3b8;">(${E(a.nome_arquivo || 'PDF')})</span>
                </div>
                <div style="display:flex;align-items:center;gap:6px;">
                    <button type="button" onclick="window._mnRevAbrirPdfAnexo(${a.id})" style="background:#0284c7;color:#fff;border:none;border-radius:6px;padding:3px 9px;font-size:0.74rem;font-weight:700;cursor:pointer;">Abrir PDF</button>
                    <button type="button" onclick="window._mnRevExcluirAnexo(${a.id})" style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:6px;padding:3px 8px;font-size:0.74rem;font-weight:700;cursor:pointer;">Excluir</button>
                </div>
            </div>
            ${linhasHtml}
        </div>`;
    }).join('');
    // Lancamentos manuais (sem PDF): listados porque nao ha arquivo para consultar
    const man = manuais.length ? `
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:6px 10px;font-size:0.78rem;">
            <div style="font-weight:700;color:#1e293b;margin-bottom:4px;"><i class="ph ph-pencil-simple" style="color:#0284c7;"></i> Lançamentos manuais</div>
            ${manuais.map(function(l) {
                const sv = (l.servicos || []).map(function(id) { return E(nomes[id] || id); }).join(', ') || '<span style="color:#b45309;">sem vínculo</span>';
                return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:3px 0;border-top:1px dashed #e2e8f0;">
                    <span style="color:#475569;"><b>${l.tipo === 'mao_obra' ? 'Serviço' : 'Peça'}:</b> ${E(l.descricao)}${l.fornecedor ? ` <span style="color:#0369a1;font-weight:600;">(${E(l.fornecedor)})</span>` : ''}${garTxt(l) ? ` <span style="color:#0369a1;font-weight:700;">• ${garTxt(l)}</span>` : ''} <span style="color:#94a3b8;">→ ${sv}</span></span>
                    <span style="display:flex;align-items:center;gap:8px;"><b>${fmt(l.valor_total)}</b>
                    <button type="button" onclick="window._mnRevExcluirLancamento(${l.id})" style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:6px;padding:2px 8px;font-size:0.72rem;font-weight:700;cursor:pointer;">Excluir</button></span>
                </div>`;
            }).join('')}
        </div>` : '';
    return docs + man;
};

// Lancamento manual de peca/servico (sem PDF) — permite adicionar varias linhas com o mesmo fornecedor ate lancar valores
window._mnRevIniciarManual = function() {
    if (!window._mnRevNotaStage || window._mnRevNotaStage.file) {
        window._mnRevNotaStage = { file: null, numero: '', fornecedor: '', lancs: [], avisos: [] };
    }
    window._mnRevStageAdd();
    const el = document.getElementById('mn-rev-stage');
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
};

window._mnRevExcluirLancamento = async function(id) {
    if (!confirm('Deseja excluir este lançamento manual?')) return;
    const tok = window._manutTok || window.currentToken || localStorage.getItem('token');
    try {
        const res = await fetch('/api/frota/revisoes/lancamentos/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + tok } });
        const j = await res.json().catch(function() { return {}; });
        if (!res.ok) throw new Error(j.error || 'Erro ao excluir lançamento');
        await window._mnRevRecarregarDados();
        window._mnRevAtualizarModalDados(true);
        window._mnRenderPainelRevisaoVeiculo();
    } catch (e) { alert(e.message); }
};

// ── Leitura do PDF e vinculo das linhas aos servicos ─────────────────────────
window._mnRevAoEscolherPdf = async function(inp) {
    const file = inp && inp.files && inp.files[0];
    const stageEl = document.getElementById('mn-rev-stage');
    if (!file) { window._mnRevNotaStage = null; if (stageEl) stageEl.innerHTML = ''; window._mnRevAtualizarCustosPreview(); return; }
    if (stageEl) stageEl.innerHTML = '<div style="padding:1rem;text-align:center;color:#64748b;font-size:0.82rem;"><i class="ph ph-circle-notch ph-spin" style="color:#0284c7;"></i> Lendo a nota fiscal... (pode levar alguns segundos)</div>';
    const tok = window._manutTok || window.currentToken || localStorage.getItem('token');
    let j = {};
    try {
        const fd = new FormData();
        fd.append('arquivo', file);
        const r = await fetch('/api/frota/revisoes/analisar-nota', { method: 'POST', headers: { Authorization: 'Bearer ' + tok }, body: fd });
        j = await r.json().catch(function() { return {}; });
        if (!r.ok) j = {};
    } catch (e) { j = {}; }

    const nfP = j.nf_pecas || {}, nfS = j.nf_servico || {};
    const lancs = [];
    const chave = function(s) { return String(s || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, '').substring(0, 14); };
    (nfP.itens || []).forEach(function(it) {
        if (Number(it.valor_total) > 0) lancs.push({ tipo: 'peca', codigo: it.codigo || '', descricao: it.descricao || '', quantidade: Number(it.quantidade) || 1, valor_total: Number(it.valor_total), servicos: [], incluir: true });
    });
    (nfS.itens || []).forEach(function(it) {
        const val = Number(it.valor) || 0;
        if (!(val > 0)) return;
        const dup = lancs.some(function(l) { return Math.abs(l.valor_total - val) < 0.005 && chave(l.descricao) === chave(it.descricao); });
        if (!dup) lancs.push({ tipo: 'mao_obra', codigo: '', descricao: it.descricao || '', quantidade: 1, valor_total: val, servicos: [], incluir: true });
    });
    const tipoSel = document.getElementById('mn-rev-anx-tipo');
    if (tipoSel) {
        const temP = lancs.some(function(l) { return l.tipo === 'peca'; }), temM = lancs.some(function(l) { return l.tipo === 'mao_obra'; });
        if (temP && temM) tipoSel.value = 'ordem_servico'; else if (temP) tipoSel.value = 'nota_pecas'; else if (temM) tipoSel.value = 'nota_servico'; else tipoSel.value = 'outro';
    }
    window._mnRevNotaStage = {
        file: file,
        numero: nfS.numero || nfP.numero || '',
        fornecedor: nfS.fornecedor || nfP.fornecedor || '',
        lancs: lancs,
        avisos: [].concat(nfP.avisos || [], nfS.avisos || []).filter(function(a, i, arr) { return a && arr.indexOf(a) === i; })
    };
    window._mnRevRateioSel = [];
    const concEl = document.getElementById('mn-rev-f-conc');
    if (concEl && window._mnRevNotaStage.fornecedor && (!concEl.value || concEl.value === 'Concessionária Autorizada Fiat')) concEl.value = window._mnRevNotaStage.fornecedor;
    window._mnRevRenderStage();
};

window._mnRevServicosOpcoesHtml = function(selecionados, prefixo, handler) {
    const E = window._mnRevEsc;
    const servs = window._mnRevServicosModal || [];
    const bloco = function(titulo, lista) {
        return `<div style="font-size:0.66rem;font-weight:800;color:#64748b;margin:4px 0 2px;">${titulo}</div>` + lista.map(function(s) {
            const ck = selecionados.indexOf(s.id) >= 0;
            return `<label style="display:flex;align-items:center;gap:6px;font-size:0.76rem;color:#1e293b;padding:2px 0;cursor:pointer;"><input type="checkbox" ${ck ? 'checked' : ''} onchange="${handler.replace('__ID__', s.id)}" style="accent-color:#7c3aed;"> ${E(s.nome)}</label>`;
        }).join('');
    };
    return bloco('OBRIGATÓRIOS', servs.filter(function(s) { return s.grupo === 'obrigatorio'; })) + bloco('OPCIONAIS', servs.filter(function(s) { return s.grupo === 'opcional'; }));
};

window._mnRevRenderStage = function() {
    const el = document.getElementById('mn-rev-stage');
    const st = window._mnRevNotaStage;
    if (!el) return;
    if (!st) { el.innerHTML = ''; return; }
    const E = window._mnRevEsc;
    const sel = window._mnRevRateioSel || [];
    const linhas = st.lancs.map(function(l, i) {
        const ehPeca = l.tipo === 'peca';
        const ehEstoque = ehPeca && !!l.estoque;
        const colEstoque = ehPeca
            ? `<label style="display:inline-flex;align-items:center;gap:4px;font-size:0.74rem;font-weight:700;color:${ehEstoque ? '#7c3aed' : '#475569'};cursor:pointer;" title="Peça comprada para estoque (não precisa vincular a serviço, valor subtraído da revisão e não aparece na lista salva)"><input type="checkbox" ${ehEstoque ? 'checked' : ''} onchange="window._mnRevStageSet(${i},'estoque',this.checked)" style="accent-color:#7c3aed;"> Estoque</label>`
            : `<span style="color:#cbd5e1;font-size:0.72rem;" title="Disponível apenas para peças">—</span>`;
        const colVinculo = ehEstoque
            ? `<span style="font-size:0.74rem;font-weight:700;color:#7c3aed;background:#f5f3ff;border:1px solid #ddd6fe;padding:3px 8px;border-radius:6px;display:inline-block;width:100%;box-sizing:border-box;text-align:center;">Estoque (sem vínculo)</span>`
            : `<button type="button" id="mn-stg-btn-${i}" onclick="window._mnRevAbrirVinculo(${i}, this)" style="width:100%;text-align:left;cursor:pointer;font-size:0.76rem;font-weight:700;color:${l.servicos.length ? '#15803d' : '#b45309'};border:1px solid #cbd5e1;border-radius:6px;padding:3px 8px;background:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${window._mnRevVincLabel(l.servicos)}</button>`;
        return `<tr style="border-bottom:1px solid #e2e8f0;${ehEstoque ? 'background:#faf5ff;' : ''}">
            <td style="padding:5px 6px;text-align:center;"><input type="checkbox" ${l.incluir ? 'checked' : ''} onchange="window._mnRevStageSet(${i},'incluir',this.checked)" style="accent-color:#0284c7;"></td>
            <td style="padding:5px 6px;"><select onchange="window._mnRevStageSet(${i},'tipo',this.value)" style="padding:3px 4px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.76rem;"><option value="peca"${l.tipo === 'peca' ? ' selected' : ''}>Peça</option><option value="mao_obra"${l.tipo === 'mao_obra' ? ' selected' : ''}>Mão de obra</option></select></td>
            <td style="padding:5px 6px;"><input type="text" value="${E(l.descricao)}" onchange="window._mnRevStageSet(${i},'descricao',this.value)" style="width:100%;padding:3px 6px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.76rem;box-sizing:border-box;"></td>
            <td style="padding:5px 6px;width:110px;"><input type="number" step="0.01" value="${Number(l.valor_total || 0).toFixed(2)}" onchange="window._mnRevStageSet(${i},'valor_total',this.value)" style="width:100%;padding:3px 6px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.76rem;text-align:right;box-sizing:border-box;"></td>
            <td style="padding:5px 6px;width:160px;">${ehEstoque ? '<span style="color:#cbd5e1;font-size:0.72rem;" title="Peças de estoque não precisam de garantia">—</span>' : `<div style="display:flex;gap:4px;align-items:center;"><input type="number" min="0" step="1" value="${l.garantia_valor === undefined || l.garantia_valor === null ? '' : E(l.garantia_valor)}" placeholder="Garantia *" title="${ehPeca ? 'Garantia da peça' : 'Garantia da mão de obra / serviço'} (obrigatório — informe 0 se não houver)" onchange="window._mnRevStageSet(${i},'garantia_valor',this.value)" style="width:78px;padding:3px 6px;border:1px solid ${(l.garantia_valor === undefined || l.garantia_valor === null || l.garantia_valor === '') ? '#fca5a5' : '#cbd5e1'};border-radius:6px;font-size:0.76rem;text-align:right;box-sizing:border-box;"><select onchange="window._mnRevStageSet(${i},'garantia_unidade',this.value)" style="padding:3px 4px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.74rem;"><option value="dias"${l.garantia_unidade !== 'meses' ? ' selected' : ''}>dias</option><option value="meses"${l.garantia_unidade === 'meses' ? ' selected' : ''}>meses</option></select></div>`}</td>
            <td style="padding:5px 6px;width:82px;text-align:center;">${colEstoque}</td>
            <td style="padding:5px 6px;width:190px;">${colVinculo}</td>
            <td style="padding:5px 6px;width:30px;text-align:center;"><button type="button" onclick="window._mnRevStageRemove(${i})" title="Remover linha" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:1rem;">&times;</button></td>
        </tr>`;
    }).join('');
    el.innerHTML = `
    <div style="border:1.5px solid #bae6fd;background:#f0f9ff;border-radius:10px;padding:0.8rem;">
        <div style="font-weight:800;color:#075985;font-size:0.85rem;margin-bottom:6px;"><i class="ph ph-file-pdf"></i> ${st.file ? E(st.file.name) + ' — confira o que foi lido e vincule aos serviços' : 'Lançamento manual — informe o fornecedor, as peças/serviços, os valores e vincule aos serviços'}</div>
        ${(st.avisos || []).map(function(a) { return `<div style="font-size:0.74rem;color:#b45309;margin-bottom:3px;">\u26A0\uFE0F ${E(a)}</div>`; }).join('')}
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;margin:6px 0 10px;">
            ${st.file ? `<div><label style="font-size:0.7rem;font-weight:600;color:#64748b;display:block;margin-bottom:2px;">Nº da Nota / OS</label><input type="text" value="${E(st.numero)}" oninput="window._mnRevNotaStage.numero=this.value" style="width:100%;padding:0.4rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.8rem;box-sizing:border-box;background:#fff;"></div>` : ''}
            <div><label style="font-size:0.7rem;font-weight:600;color:#64748b;display:block;margin-bottom:2px;">Fornecedor${st.file ? '' : ' (peças / serviços adicionados manualmente)'}</label><input type="text" value="${E(st.fornecedor)}" placeholder="Informe o fornecedor..." oninput="window._mnRevNotaStage.fornecedor=this.value;window._mnRevAtualizarCustosPreview()" style="width:100%;padding:0.4rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.8rem;box-sizing:border-box;background:#fff;"></div>
        </div>
        <div style="overflow-x:auto;background:#fff;border:1px solid #e2e8f0;border-radius:8px;">
            <table style="width:100%;border-collapse:collapse;font-size:0.78rem;">
                <thead><tr style="background:#f1f5f9;color:#475569;text-align:left;"><th style="padding:5px 6px;width:34px;text-align:center;">Usar</th><th style="padding:5px 6px;width:110px;">Tipo</th><th style="padding:5px 6px;">Descrição (peça / serviço)</th><th style="padding:5px 6px;">Valor (R$)</th><th style="padding:5px 6px;width:160px;">Garantia *</th><th style="padding:5px 6px;width:82px;text-align:center;">Estoque</th><th style="padding:5px 6px;">Serviço vinculado *</th><th></th></tr></thead>
                <tbody>${linhas || '<tr><td colspan="8" style="padding:10px;text-align:center;color:#94a3b8;">Nenhuma linha foi lida automaticamente. Adicione as linhas manualmente.</td></tr>'}</tbody>
            </table>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-top:6px;">
            <button type="button" onclick="window._mnRevStageAdd()" style="background:#fff;color:#0284c7;border:1px solid #7dd3fc;border-radius:6px;padding:3px 10px;font-size:0.76rem;font-weight:700;cursor:pointer;">+ Adicionar linha manual</button>
            <div id="mn-rev-stage-tot" style="font-size:0.8rem;font-weight:800;color:#0f172a;"></div>
        </div>
        
        <div id="mn-rev-stage-custos" style="margin-top:8px;"></div>
        <div style="margin-top:10px;text-align:right;">
            <button type="button" id="mn-rev-anx-btn" onclick="window._mnRevAnexarPdf()" style="background:#16a34a;color:#fff;border:none;border-radius:8px;padding:0.55rem 1.1rem;font-size:0.82rem;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:6px;"><i class="ph ph-upload-simple"></i> ${st.file ? 'Anexar PDF e lançar valores' : 'Lançar valores'}</button>
        </div>
    </div>`;
    window._mnRevStageTotais();
};

window._mnRevStageTotais = function() {
    const st = window._mnRevNotaStage;
    const el = document.getElementById('mn-rev-stage-tot');
    if (!st || !el) return;
    let p = 0, m = 0, est = 0;
    st.lancs.forEach(function(l) {
        if (!l.incluir) return;
        if (l.tipo === 'mao_obra') m += Number(l.valor_total) || 0;
        else if (l.estoque) est += Number(l.valor_total) || 0;
        else p += Number(l.valor_total) || 0;
    });
    const f = function(n) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
    el.textContent = 'Peças: ' + f(p) + '  •  Mão de obra: ' + f(m) + (est > 0 ? '  •  Estoque abatido: -' + f(est) : '') + '  •  Total da revisão: ' + f(p + m);
    window._mnRevAtualizarCustosPreview();
};

window._mnRevStageSet = function(i, campo, valor) {
    const st = window._mnRevNotaStage;
    if (!st || !st.lancs[i]) return;
    if (campo === 'valor_total') st.lancs[i][campo] = parseFloat(valor) || 0;
    else if (campo === 'garantia_valor') st.lancs[i].garantia_valor = String(valor).trim() === '' ? '' : Math.max(0, parseInt(valor, 10) || 0);
    else if (campo === 'estoque') st.lancs[i].estoque = !!valor;
    else st.lancs[i][campo] = valor;
    if (campo === 'tipo' && valor === 'mao_obra') st.lancs[i].estoque = false;
    if (campo === 'tipo' || campo === 'estoque' || campo === 'garantia_valor') {
        window._mnRevFecharVinculo();
        window._mnRevRenderStage();
        return;
    }
    window._mnRevStageTotais();
};

window._mnRevStageAdd = function() {
    const st = window._mnRevNotaStage;
    if (!st) return;
    const tipoDoc = document.getElementById('mn-rev-anx-tipo')?.value;
    st.lancs.push({ tipo: (!st.file || tipoDoc === 'nota_pecas') ? 'peca' : 'mao_obra', codigo: '', descricao: '', quantidade: 1, valor_total: 0, servicos: [], incluir: true });
    window._mnRevRenderStage();
};

window._mnRevStageRemove = function(i) {
    const st = window._mnRevNotaStage;
    if (!st) return;
    st.lancs.splice(i, 1);
    window._mnRevRenderStage();
};

window._mnRevColetarItensModal = function() {
    const itens = {};
    document.querySelectorAll('#mn-rev-modal-ov [data-rev-item]').forEach(function(el) {
        const id = el.getAttribute('data-rev-item');
        const field = el.getAttribute('data-rev-field');
        if (!id || !field) return;
        if (!itens[id]) itens[id] = {};
        itens[id][field] = el.type === 'checkbox' ? el.checked : el.value;
    });
    return itens;
};

window.mnRevSalvarMarco = async function(marcoKm, marcoMeses, silencioso) {
    const ctx = window._mnRevAtual;
    if (!ctx || !ctx.veiculo) return null;
    const vid = ctx.veiculo.id;
    const tok = window._manutTok || window.currentToken || localStorage.getItem('token');
    const status = document.getElementById('mn-rev-f-status')?.value || 'pendente';
    const itens = window._mnRevColetarItensModal();

    // No Compras o registro ja existe (revisao concluida): anexos/lancamentos nao regravam o status da logistica
    if (silencioso && window._mnRevModoCompras) {
        const regCompras = window._mnRevRegAtual();
        if (regCompras && regCompras.id) return regCompras;
    }

    // Para concluir a revisao, todos os itens de Conferencias internas devem estar marcados como feitos, com foto anexada, alem do video geral
    if (!silencioso && status === 'realizada') {
        const semCheckConf = (window._mnRevServicosModal || []).filter(function(s) {
            return s.grupo === 'conferencia' && !(itens[s.id] && (itens[s.id].realizado === true || itens[s.id].realizado === 'true'));
        });
        if (semCheckConf.length) {
            window._mnRevToggleGrupo('conferencia', true);
            semCheckConf.forEach(function(s) { const row = document.querySelector('#mn-rev-modal-ov tr[data-rev-row="' + s.id + '"]'); if (row) row.style.background = '#fee2e2'; });
            const row0 = document.querySelector('#mn-rev-modal-ov tr[data-rev-row="' + semCheckConf[0].id + '"]');
            if (row0) row0.scrollIntoView({ behavior: 'smooth', block: 'center' });
            alert('Para salvar a revisão como Realizada, é obrigatório selecionar (marcar como feito) todos os itens de Conferências OBRIGATÓRIAS (Interno).\n\nItens não marcados (' + semCheckConf.length + '):\n- ' + semCheckConf.map(function(s) { return s.nome; }).join('\n- '));
            return null;
        }
        const semFoto = (window._mnRevServicosModal || []).filter(function(s) {
            return s.grupo === 'conferencia' && window._mnRevFotosConfDoItem(s.id).length === 0;
        });
        if (semFoto.length) {
            window._mnRevToggleGrupo('conferencia', true);
            semFoto.forEach(function(s) { const row = document.querySelector('#mn-rev-modal-ov tr[data-rev-row="' + s.id + '"]'); if (row) row.style.background = '#fee2e2'; });
            const row0 = document.querySelector('#mn-rev-modal-ov tr[data-rev-row="' + semFoto[0].id + '"]');
            if (row0) row0.scrollIntoView({ behavior: 'smooth', block: 'center' });
            alert('Para salvar a revisão como Realizada, é obrigatório anexar ao menos uma foto em cada item de Conferências OBRIGATÓRIAS (Interno).\n\nItens sem foto anexada (' + semFoto.length + '):\n- ' + semFoto.map(function(s) { return s.nome; }).join('\n- '));
            return null;
        }
        const regAtual = window._mnRevRegAtual();
        const temVideo = ((regAtual && regAtual.midias) || []).some(function(m) { return m.categoria === 'video_geral'; });
        if (!temVideo) {
            const secVid = document.getElementById('mn-rev-sec-video');
            if (secVid) {
                secVid.style.borderColor = '#dc2626';
                secVid.style.background = '#fef2f2';
                secVid.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            alert('Para salvar a revisão como Realizada (Concluída), é obrigatório anexar o vídeo geral do veículo no item "5. Vídeo geral do veículo".');
            return null;
        }
    }

    const btn = document.getElementById('mn-rev-btn-salvar');
    if (btn && !silencioso) { btn.disabled = true; btn.textContent = 'Salvando...'; }

    const regExistente = window._mnRevRegAtual();
    const statusEnvio = silencioso
        ? ((regExistente && regExistente.status) ? regExistente.status : 'pendente')
        : status;
    const dcInp = document.getElementById('mn-rev-f-data-concl');
    if (statusEnvio === 'realizada' && dcInp && !dcInp.value) {
        dcInp.value = window._mnHojeISO();
    }

    const body = {
        marco_km: marcoKm,
        marco_meses: marcoMeses,
        status: statusEnvio,
        silencioso: !!silencioso,
        data_solicitacao: document.getElementById('mn-rev-f-data-solic')?.value || null,
        data_revisao: document.getElementById('mn-rev-f-data')?.value || null,
        data_conclusao: dcInp ? (dcInp.value || null) : null,
        km_revisao: document.getElementById('mn-rev-f-km')?.value || null,
        concessionaria: document.getElementById('mn-rev-f-conc')?.value || null,
        numero_os: document.getElementById('mn-rev-f-os')?.value || null,
        valor_pecas: parseFloat(document.getElementById('mn-rev-f-vpecas')?.value || '0') || 0,
        valor_mao_obra: parseFloat(document.getElementById('mn-rev-f-vmo')?.value || '0') || 0,
        valor_total: parseFloat(document.getElementById('mn-rev-f-vtotal')?.value || '0') || 0,
        itens: itens,
        observacoes: document.getElementById('mn-rev-f-obs')?.value || null
    };

    try {
        const res = await fetch('/api/frota/revisoes/' + vid + '/salvar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
            body: JSON.stringify(body)
        });
        const j = await res.json().catch(function() { return {}; });
        if (!res.ok) throw new Error(j.error || 'Erro ao salvar revisão');
        if (!silencioso) {
            if (typeof mostrarToastAviso === 'function') mostrarToastAviso('\u2705 Revisão salva com sucesso!');
            document.getElementById('mn-rev-modal-ov')?.remove();
            if (typeof window._mnPrevAtualizarFrota === 'function') await window._mnPrevAtualizarFrota();
            await window.mnRevisaoAbrirVeiculo(vid);
        }
        return j.revisao;
    } catch (e) {
        if (!silencioso) alert('Erro: ' + e.message);
        if (btn && !silencioso) { btn.disabled = false; btn.textContent = 'Salvar Revisão'; }
        return null;
    }
};

// Atalho: marca uma revisao VENCIDA como feita (sem checklist/fotos), so para atualizar o historico rapidamente
window.mnRevMarcarFeita = async function(kmNominal, mesesNominal, btnEl) {
    const ctx = window._mnRevAtual;
    if (!ctx || !ctx.veiculo) return;
    const v = ctx.veiculo;
    const marcoTxt = window._mnRevEhCarretinha(v) ? ((Number(mesesNominal) || 12) + ' meses') : (Number(kmNominal).toLocaleString('pt-BR') + ' km');
    if (btnEl) { btnEl.disabled = true; btnEl.style.opacity = '0.6'; btnEl.innerHTML = '<i class="ph ph-circle-notch ph-spin"></i>'; }
    const tok = window._manutTok || window.currentToken || localStorage.getItem('token');
    const reg = (ctx.revisoes || []).find(function(r) { return Number(r.marco_km) === Number(kmNominal); });
    const body = {
        marco_km: Number(kmNominal),
        marco_meses: Number(mesesNominal) || undefined,
        status: 'realizada',
        data_revisao: window._mnHojeISO(),
        concessionaria: (reg && reg.concessionaria) || null,
        numero_os: (reg && reg.numero_os) || null,
        itens: (reg && reg.itens) || {},
        observacoes: (reg && reg.observacoes) || 'Revisão vencida marcada como feita manualmente (atualização rápida).',
        marcar_feita_rapido: true
    };
    try {
        const res = await fetch('/api/frota/revisoes/' + v.id + '/salvar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
            body: JSON.stringify(body)
        });
        const j = await res.json().catch(function() { return {}; });
        if (!res.ok) throw new Error(j.error || 'Erro ao marcar a revisão como feita');
        if (j.revisao_status !== undefined) {
            [window._manutFrota, window._frotaDados].forEach(function(arr) {
                const fv = (arr || []).find(function(x) { return String(x.id) === String(v.id); });
                if (fv) { fv.revisao_status = j.revisao_status; fv.revisao_info = j.revisao_info || {}; }
            });
        }
        await window._mnRevRecarregarDados();
        window._mnRenderPainelRevisaoVeiculo();
        if (typeof window._mnPrevAtualizarFrota === 'function') await window._mnPrevAtualizarFrota();
        if (typeof mostrarToastAviso === 'function') mostrarToastAviso('\u2705 Revisão de ' + marcoTxt + ' marcada como feita!');
    } catch (e) {
        if (btnEl) { btnEl.disabled = false; btnEl.style.opacity = ''; btnEl.innerHTML = '<i class="ph ph-check"></i>'; }
        alert('Erro: ' + e.message);
    }
};

window._mnRevRecarregarDados = async function() {
    const tok = window._manutTok || window.currentToken || localStorage.getItem('token');
    const vid = window._mnRevAtual.veiculo.id;
    const r = await fetch('/api/frota/revisoes/' + vid + '?_=' + Date.now(), { headers: { Authorization: 'Bearer ' + tok }, cache: 'no-store' });
    window._mnRevAtual = await r.json();
};

window._mnRevAnexarPdf = async function() {
    const st = window._mnRevNotaStage;
    const m = window._mnRevMarcoAtual;
    if (!st || !m) return alert('Selecione um arquivo PDF ou adicione uma linha manual.');
    const usadas = st.lancs.filter(function(l) { return l.incluir && !(l.tipo === 'peca' && l.estoque) && (Number(l.valor_total) > 0); });
    const temEstoque = st.lancs.some(function(l) { return l.incluir && l.tipo === 'peca' && l.estoque && (Number(l.valor_total) > 0); });
    if (!usadas.length && !temEstoque) return alert('Informe ao menos uma linha com valor.');
    const semDesc = usadas.filter(function(l) { return !String(l.descricao || '').trim(); });
    if (semDesc.length) return alert('Preencha a descrição de todas as linhas utilizadas.');
    const semVinculo = usadas.filter(function(l) { return !l.servicos.length; });
    if (semVinculo.length) return alert('Vincule cada peça / serviço a pelo menos um serviço marcado no passo 2.\n\nSem vínculo (' + semVinculo.length + '):\n- ' + semVinculo.map(function(l) { return l.descricao; }).join('\n- '));
    const semGarantia = usadas.filter(function(l) { return l.garantia_valor === undefined || l.garantia_valor === null || l.garantia_valor === ''; });
    if (semGarantia.length) return alert('Informe a garantia de cada peça / mão de obra (preencha 0 se não houver garantia).\n\nSem garantia preenchida (' + semGarantia.length + '):\n- ' + semGarantia.map(function(l) { return l.descricao; }).join('\n- '));

    if (!usadas.length && temEstoque && !st.file) {
        window._mnRevNotaStage = null;
        window._mnRevFecharVinculo();
        window._mnRevRenderStage();
        if (typeof mostrarToastAviso === 'function') mostrarToastAviso('\u2705 Peças de estoque abatidas (não lançadas na revisão)!');
        return;
    }

    const rotulo = st.file ? 'Anexar PDF e lançar valores' : 'Lançar valores';
    const btn = document.getElementById('mn-rev-anx-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }
    try {
        const fornStage = String(st.fornecedor || '').trim();
        const concEl = document.getElementById('mn-rev-f-conc');
        if (concEl && fornStage && (!concEl.value || concEl.value === 'Concessionária Autorizada Fiat')) concEl.value = fornStage;
        const savedRev = await window.mnRevSalvarMarco(m.km, m.meses, true);
        if (!savedRev || !savedRev.id) throw new Error('Não foi possível criar o registro da revisão.');
        const tok = window._manutTok || window.currentToken || localStorage.getItem('token');
        const payload = usadas.map(function(l) { return { tipo: l.tipo, codigo: l.codigo, descricao: l.descricao, quantidade: l.quantidade, valor_total: l.valor_total, servicos: l.servicos, modo_rateio: l.modo_rateio || null, garantia_valor: l.garantia_valor, garantia_unidade: l.garantia_unidade === 'meses' ? 'meses' : 'dias', fornecedor: fornStage || l.fornecedor || null }; });
        let res;
        if (st.file) {
            const total = usadas.reduce(function(t, l) { return t + (Number(l.valor_total) || 0); }, 0);
            const fd = new FormData();
            fd.append('arquivo', st.file);
            fd.append('tipo_documento', document.getElementById('mn-rev-anx-tipo')?.value || 'nota_servico');
            fd.append('numero_nota', st.numero || '');
            fd.append('valor', String(Math.round(total * 100) / 100));
            fd.append('fornecedor', fornStage);
            fd.append('dados', JSON.stringify({ lancamentos: payload }));
            res = await fetch('/api/frota/revisoes/' + savedRev.id + '/anexos', { method: 'POST', headers: { Authorization: 'Bearer ' + tok }, body: fd });
        } else {
            res = await fetch('/api/frota/revisoes/' + savedRev.id + '/lancamentos', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify({ fornecedor: fornStage || null, lancamentos: payload }) });
        }
        const j = await res.json().catch(function() { return {}; });
        if (!res.ok) throw new Error(j.error || 'Erro ao salvar');

        await window._mnRevRecarregarDados();
        window._mnRevNotaStage = null;
        window._mnRevFecharVinculo();
        const fileInp = document.getElementById('mn-rev-anx-file');
        if (fileInp) fileInp.value = '';
        window._mnRevRenderStage();
        window._mnRevAtualizarModalDados(true);
        window._mnRenderPainelRevisaoVeiculo();
        if (typeof mostrarToastAviso === 'function') mostrarToastAviso(st.file ? '\u2705 Nota / OS anexada e valores lançados!' : '\u2705 Lançamento manual salvo!');
    } catch (e) {
        alert('Erro ao salvar: ' + e.message);
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-upload-simple"></i> ' + rotulo; }
    }
};

window._mnRevAbrirPdfAnexo = async function(anexoId) {
    const tok = window._manutTok || window.currentToken || localStorage.getItem('token');
    try {
        const res = await fetch('/api/frota/revisoes/anexos/' + anexoId + '/pdf', { headers: { Authorization: 'Bearer ' + tok } });
        if (!res.ok) throw new Error('Não foi possível abrir o PDF.');
        const blob = await res.blob();
        window.open(URL.createObjectURL(blob), '_blank');
    } catch (e) { alert(e.message); }
};

window._mnRevExcluirAnexo = async function(anexoId) {
    if (!confirm('Deseja realmente excluir este PDF anexado e os valores lançados por ele?')) return;
    const tok = window._manutTok || window.currentToken || localStorage.getItem('token');
    try {
        const res = await fetch('/api/frota/revisoes/anexos/' + anexoId, { method: 'DELETE', headers: { Authorization: 'Bearer ' + tok } });
        if (!res.ok) throw new Error('Erro ao excluir anexo');
        await window._mnRevRecarregarDados();
        window._mnRevAtualizarModalDados(true);
        window._mnRenderPainelRevisaoVeiculo();
        if (typeof mostrarToastAviso === 'function') mostrarToastAviso('\u2705 Anexo removido!');
    } catch (e) { alert(e.message); }
};

// ── Fotos das Conferências Internas e 5. Vídeo Geral do Veículo (Cloudflare R2) ──
window._mnRevRenderVideoGeral = function() {
    const el = document.getElementById('mn-rev-video-lista');
    if (!el) return;
    const E = window._mnRevEsc;
    const reg = window._mnRevRegAtual();
    const videos = ((reg && reg.midias) || []).filter(function(m) { return m.categoria === 'video_geral'; });
    if (!videos.length) {
        el.innerHTML = '<div style="font-size:0.76rem;color:#dc2626;font-weight:700;padding:4px 0;"><i class="ph ph-warning-circle"></i> Nenhum vídeo geral anexado ainda (obrigatório para concluir a revisão).</div>';
        return;
    }
    const secVid = document.getElementById('mn-rev-sec-video');
    if (secVid) { secVid.style.borderColor = '#e2e8f0'; secVid.style.background = '#f8fafc'; }
    el.innerHTML = videos.map(function(v) {
        const url = v.url || ('/api/frota/revisoes/midias/' + v.id + '/arquivo');
        return `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;background:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;padding:8px 12px;">
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                <video src="${E(url)}" controls preload="metadata" style="width:240px;max-width:100%;height:135px;border-radius:8px;background:#0f172a;object-fit:cover;"></video>
                <div>
                    <div style="font-size:0.82rem;font-weight:800;color:#15803d;display:flex;align-items:center;gap:5px;"><i class="ph ph-check-circle"></i> Vídeo geral anexado</div>
                    <div style="font-size:0.75rem;color:#475569;margin-top:2px;">${E(v.nome_arquivo || 'video.mp4')}</div>
                    <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
                        <a href="${E(url)}" target="_blank" rel="noopener" style="background:#0284c7;color:#fff;text-decoration:none;border-radius:6px;padding:4px 10px;font-size:0.74rem;font-weight:700;display:inline-flex;align-items:center;gap:4px;"><i class="ph ph-arrow-square-out"></i> Abrir vídeo</a>
                        <button type="button" onclick="window._mnRevExcluirMidia(${v.id})" style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:6px;padding:4px 10px;font-size:0.74rem;font-weight:700;cursor:pointer;">Excluir vídeo</button>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
};

window._mnRevAnexarFotosConf = async function(servicoId, inp) {
    const files = Array.from((inp && inp.files) || []);
    if (!files.length) return;
    const m = window._mnRevMarcoAtual;
    if (!m) return;
    const lbl = document.getElementById('mn-rev-lbl-conf-' + servicoId);
    const origHtml = lbl ? lbl.innerHTML : '';
    if (lbl) { lbl.style.opacity = '0.6'; lbl.style.pointerEvents = 'none'; }
    try {
        let reg = window._mnRevRegAtual();
        if (!reg || !reg.id) {
            reg = await window.mnRevSalvarMarco(m.km, m.meses, true);
        }
        if (!reg || !reg.id) throw new Error('Não foi possível preparar o registro da revisão.');
        const tok = window._manutTok || window.currentToken || localStorage.getItem('token');
        const fd = new FormData();
        fd.append('categoria', 'conferencia_foto');
        fd.append('servico_id', servicoId);
        files.forEach(function(f) { fd.append('arquivos', f); });
        const res = await fetch('/api/frota/revisoes/' + reg.id + '/midias', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + tok },
            body: fd
        });
        const j = await res.json().catch(function() { return {}; });
        if (!res.ok) throw new Error(j.error || 'Erro ao enviar foto(s) para o R2');

        const cb = document.querySelector('#mn-rev-modal-ov input[data-rev-item="' + servicoId + '"][data-rev-field="realizado"]');
        if (cb && !cb.checked) {
            cb.checked = true;
            window._mnRevServicoMarcou(servicoId);
        }
        await window._mnRevRecarregarDados();
        const box = document.getElementById('mn-rev-conf-fotos-' + servicoId);
        if (box) box.innerHTML = window._mnRevRenderFotosConfItem(servicoId);
        window._mnRevAtualizarContadorObrig();
        if (typeof mostrarToastAviso === 'function') mostrarToastAviso('\u2705 ' + files.length + ' foto(s) anexada(s) com sucesso!');
    } catch (e) {
        alert('Erro ao anexar foto(s): ' + e.message);
    } finally {
        if (inp) inp.value = '';
        if (lbl) {
            lbl.style.opacity = '';
            lbl.style.pointerEvents = '';
            if (origHtml && !lbl.querySelector('input')) lbl.innerHTML = origHtml;
        }
    }
};

window._mnRevAnexarVideoGeral = async function(inp) {
    const file = inp && inp.files && inp.files[0];
    if (!file) return;
    const m = window._mnRevMarcoAtual;
    if (!m) return;
    const lbl = document.getElementById('mn-rev-lbl-video');
    if (lbl) { lbl.style.opacity = '0.6'; lbl.style.pointerEvents = 'none'; }
    const listaEl = document.getElementById('mn-rev-video-lista');
    if (listaEl) listaEl.innerHTML = '<div style="font-size:0.8rem;color:#0284c7;font-weight:700;padding:6px 0;"><i class="ph ph-circle-notch ph-spin"></i> Enviando vídeo geral do veículo para o Cloudflare R2... aguarde.</div>';
    try {
        let reg = window._mnRevRegAtual();
        if (!reg || !reg.id) {
            reg = await window.mnRevSalvarMarco(m.km, m.meses, true);
        }
        if (!reg || !reg.id) throw new Error('Não foi possível preparar o registro da revisão.');
        const tok = window._manutTok || window.currentToken || localStorage.getItem('token');
        const fd = new FormData();
        fd.append('categoria', 'video_geral');
        fd.append('arquivos', file);
        const res = await fetch('/api/frota/revisoes/' + reg.id + '/midias', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + tok },
            body: fd
        });
        const j = await res.json().catch(function() { return {}; });
        if (!res.ok) throw new Error(j.error || 'Erro ao enviar vídeo para o R2');

        await window._mnRevRecarregarDados();
        window._mnRevRenderVideoGeral();
        if (typeof mostrarToastAviso === 'function') mostrarToastAviso('\u2705 Vídeo geral do veículo anexado com sucesso!');
    } catch (e) {
        alert('Erro ao anexar vídeo: ' + e.message);
        window._mnRevRenderVideoGeral();
    } finally {
        if (inp) inp.value = '';
        if (lbl) { lbl.style.opacity = ''; lbl.style.pointerEvents = ''; }
    }
};

window._mnRevExcluirMidia = async function(midiaId) {
    if (!confirm('Deseja realmente excluir este arquivo (foto/vídeo)?')) return;
    const tok = window._manutTok || window.currentToken || localStorage.getItem('token');
    try {
        const res = await fetch('/api/frota/revisoes/midias/' + midiaId, {
            method: 'DELETE',
            headers: { Authorization: 'Bearer ' + tok }
        });
        const j = await res.json().catch(function() { return {}; });
        if (!res.ok) throw new Error(j.error || 'Erro ao excluir mídia');
        await window._mnRevRecarregarDados();
        window._mnRevAtualizarModalDados(false);
        if (typeof mostrarToastAviso === 'function') mostrarToastAviso('\u2705 Arquivo removido!');
    } catch (e) {
        alert('Erro ao excluir: ' + e.message);
    }
};

window._mnRevVerMidia = function(midiaId) {
    const reg = window._mnRevRegAtual();
    const midia = ((reg && reg.midias) || []).find(function(m) { return Number(m.id) === Number(midiaId); });
    const url = (midia && midia.url) ? midia.url : ('/api/frota/revisoes/midias/' + midiaId + '/arquivo');
    const nome = (midia && midia.nome_arquivo) ? midia.nome_arquivo : 'Foto da conferência';
    const E = window._mnRevEsc;
    let ov = document.getElementById('mn-rev-lightbox-ov');
    if (ov) ov.remove();
    ov = document.createElement('div');
    ov.id = 'mn-rev-lightbox-ov';
    ov.onclick = function(ev) { if (ev.target === ov) ov.remove(); };
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.88);backdrop-filter:blur(4px);z-index:10600;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1.5rem;';
    ov.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;max-width:920px;margin-bottom:10px;color:#fff;">
            <div style="font-size:0.9rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${E(nome)}</div>
            <div style="display:flex;align-items:center;gap:8px;">
                <a href="${E(url)}" target="_blank" rel="noopener" style="background:#0284c7;color:#fff;text-decoration:none;padding:5px 12px;border-radius:8px;font-size:0.78rem;font-weight:700;display:inline-flex;align-items:center;gap:5px;"><i class="ph ph-arrow-square-out"></i> Abrir original</a>
                <button type="button" onclick="document.getElementById('mn-rev-lightbox-ov')?.remove()" style="background:rgba(255,255,255,0.2);color:#fff;border:none;width:34px;height:34px;border-radius:50%;font-size:1.2rem;cursor:pointer;">&times;</button>
            </div>
        </div>
        <img src="${E(url)}" alt="${E(nome)}" style="max-width:92vw;max-height:82vh;object-fit:contain;border-radius:10px;background:#0f172a;box-shadow:0 20px 50px rgba(0,0,0,0.5);">
    `;
    document.body.appendChild(ov);
};

window._mnPrevAtualizarFrota = async function() {
    try {
        const tok = window._manutTok || window.currentToken || localStorage.getItem('token');
        const r = await fetch('/api/frota/veiculos?_=' + Date.now(), { headers: { Authorization: 'Bearer ' + tok }, cache: 'no-store' });
        const lista = await r.json();
        if (!Array.isArray(lista)) return;
        window._manutFrota = lista;
        window._frotaDados = lista;
        const kpiBox = document.getElementById('mn-rev-kpi-cards');
        if (kpiBox && typeof window._mnRevKpiCardsHtml === 'function') kpiBox.innerHTML = window._mnRevKpiCardsHtml();
        const contRev = document.getElementById('mn-rev-filtro-cont');
        if (contRev && typeof window._mnRevFiltroAceita === 'function') {
            contRev.textContent = lista.filter(window._mnRevFiltroAceita).length + ' de ' + lista.length + ' veículo(s)';
        }
        const grid = document.getElementById('mn-prev-cards');
        if (grid && grid.style.display !== 'none') grid.innerHTML = window._mnPrevCardsHtml();
        const gridRev = document.getElementById('mn-rev-cards');
        if (gridRev && gridRev.style.display !== 'none') gridRev.innerHTML = window._mnPrevCardsHtml('revisao');
    } catch (e) { /* mantem os dados ja carregados */ }
};

window.mnPrevAbrirVeiculo = function(id) {
    const sel = document.getElementById('mn-prev-veiculo');
    if (!sel) return;
    sel.value = String(id);
    window.mnCarregarPreventivoVeiculo();
};

window.mnPrevVoltarCards = function() {
    const sel = document.getElementById('mn-prev-veiculo');
    if (sel) sel.value = '';
    window.mnCarregarPreventivoVeiculo();
    const grid = document.getElementById('mn-prev-cards');
    if (grid) grid.innerHTML = window._mnPrevCardsHtml();
};

window.mnPrevSalvarKmCard = async function(vid) {
    const inp = document.getElementById('mn-prevcard-km-' + vid);
    if (!inp || !inp.value) return alert('Informe o KM atual.');
    const km = parseInt(inp.value, 10);
    const tok = window._manutTok || window.currentToken || localStorage.getItem('token');
    try {
        const res = await fetch('/api/frota/veiculos/' + vid + '/km', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
            body: JSON.stringify({ km_atual: km })
        });
        if (!res.ok) throw new Error('Erro ao salvar KM');
        [window._manutFrota, window._frotaDados].forEach(function(arr) {
            const v = (arr || []).find(function(x) { return String(x.id) === String(vid); });
            if (v) v.km_atual = km;
        });
        if (typeof mostrarToastAviso === 'function') mostrarToastAviso('\u2705 KM atualizado!');
    } catch (e) { alert(e.message); }
};

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
    const _gridPv = document.getElementById('mn-prev-cards'), _barPv = document.getElementById('mn-prev-bar');
    if (!vid) { kmBox.style.display='none'; planoEl.innerHTML=''; if (_gridPv) _gridPv.style.display='grid'; if (_barPv) _barPv.style.display='none'; return; }
    if (_gridPv) _gridPv.style.display='none'; if (_barPv) _barPv.style.display='flex';
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
            <select id="mn-corr-status" onchange="window._mnCorrCardFiltro=this.value||'';window._mnRenderCorretivaDados(window._mnCorrDados||[])" style="padding:6px 10px;border:1px solid #cbd5e1;border-radius:8px;font-size:0.85rem;outline:none;background:#fff;">
                <option value="">Todos Status</option>
                <option value="agendada" style="color:#d97706;font-weight:700;">Novo</option>
                <option value="em_andamento" style="color:#dc2626;font-weight:700;">Em Manutenção</option>
                <option value="aguardando" style="color:#2563eb;font-weight:700;">Aguardando</option>
                <option value="concluida" style="color:#10b981;font-weight:700;">Concluído</option>
                <option value="cancelada">Cancelada</option>
            </select>
            <select id="mn-corr-tipoveic" onchange="window._mnRenderCorretivaDados(window._mnCorrDados||[])" style="padding:6px 10px;border:1px solid #cbd5e1;border-radius:8px;font-size:0.85rem;outline:none;background:#fff;">
                <option value="">Todos os Tipos</option>${window._mnCorrTipoVeicOpts()}
            </select>
            <button onclick="window.mnCarregarCorretivas()" style="padding:6px 12px;background:#d97706;color:#fff;border:none;border-radius:8px;font-size:0.8rem;cursor:pointer;display:flex;align-items:center;gap:4px;">
                <i class="ph ph-arrows-clockwise"></i> Atualizar
            </button>
            <span id="mn-corr-count" style="margin-left:auto;font-size:0.8rem;color:#94a3b8;"></span>
            <button onclick="window.mnCorrNovaInterno()" style="padding:7px 14px;background:#d97706;color:#fff;border:none;border-radius:8px;font-size:0.82rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;">
                <i class="ph ph-plus"></i> Nova Manutenção Corretiva
            </button>
        </div>
        <div style="overflow-x:auto;overflow-y:auto;max-height:calc(100vh - 230px);">
        <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
            <thead id="mn-corr-thead" style="position:sticky;top:0;z-index:2;background:#f1f5f9;"></thead>
            <tbody id="mn-corr-tbody">
                <tr><td colspan="12" style="padding:2rem;text-align:center;color:#94a3b8;">
                    <i class="ph ph-circle-notch ph-spin" style="font-size:1.5rem;"></i>
                </td></tr>
            </tbody>
        </table>
        </div>
    </div>`;
    window._mnRenderCorrThead();
    window.mnCarregarCorretivas();
}

window._mnCorrSort = window._mnCorrSort || { col: '', dir: 'asc' };
window._mnCorrCardFiltro = window._mnCorrCardFiltro || '';

window._mnRenderCorrThead = function() {
    var thead = document.getElementById('mn-corr-thead');
    if (!thead) return;
    var st = window._mnCorrSort || { col: '', dir: 'asc' };
    var cols = [
        { k: 'placa',          l: 'Veículo' },
        { k: 'descricao',      l: 'Defeito / Problema' },
        { k: 'status',         l: 'Status' },
        { k: 'data_inicio',    l: 'Data<br>Início' },
        { k: 'dias_pedido',    l: '⏱ Dias do<br>Pedido' },
        { k: 'dias_parado',    l: '🚫 Dias Sem<br>Rodar' },
        { k: 'data_conclusao', l: 'Data<br>Conclusão' },
        { k: 'fornecedor',     l: 'Fornecedor' },
        { k: 'custo_pecas',    l: 'R$ Peças' },
        { k: 'custo_mao_obra', l: 'R$ Mão de<br>obra' },
        { k: 'custo',          l: 'R$ Total' }
    ];
    var ths = cols.map(function(c) {
        var ativo = st.col === c.k;
        var seta = ativo
            ? (st.dir === 'asc' ? '<i class="ph ph-arrow-up" style="color:#d97706;font-size:0.85rem;"></i>' : '<i class="ph ph-arrow-down" style="color:#d97706;font-size:0.85rem;"></i>')
            : '<i class="ph ph-arrows-down-up" style="color:#94a3b8;font-size:0.8rem;opacity:0.75;"></i>';
        return '<th onclick="window.mnCorrOrdenar(\'' + c.k + '\')" title="Clique para ordenar" style="position:sticky;top:0;z-index:2;background:#f1f5f9;box-shadow:inset 0 -2px 0 #e2e8f0;padding:10px 10px;text-align:center;vertical-align:middle;color:' + (ativo ? '#b45309' : '#475569') + ';font-weight:700;cursor:pointer;user-select:none;line-height:1.25;transition:background .15s;" onmouseover="this.style.background=\'#e2e8f0\'" onmouseout="this.style.background=\'#f1f5f9\'">'
            + '<div style="display:inline-flex;align-items:center;justify-content:center;gap:4px;text-align:center;"><span>' + c.l + '</span>' + seta + '</div>'
            + '</th>';
    }).join('');
    ths += '<th style="position:sticky;top:0;z-index:2;background:#f1f5f9;box-shadow:inset 0 -2px 0 #e2e8f0;padding:10px 10px;text-align:center;vertical-align:middle;color:#475569;font-weight:700;line-height:1.25;">Ações</th>';
    thead.innerHTML = '<tr style="background:#f1f5f9;border-bottom:2px solid #e2e8f0;">' + ths + '</tr>';
};

window.mnCorrOrdenar = function(col) {
    var st = window._mnCorrSort || { col: '', dir: 'asc' };
    if (st.col === col) {
        st.dir = st.dir === 'asc' ? 'desc' : 'asc';
    } else {
        st.col = col;
        st.dir = 'asc';
    }
    window._mnCorrSort = st;
    window._mnRenderCorrThead();
    window._mnRenderCorretivaDados(window._mnCorrDados || []);
};

window.mnCorrFiltrarCard = function(chave) {
    if (chave === 'todos' || window._mnCorrCardFiltro === chave) {
        window._mnCorrCardFiltro = '';
    } else {
        window._mnCorrCardFiltro = chave;
    }
    var sel = document.getElementById('mn-corr-status');
    if (sel) {
        if (['agendada', 'em_andamento', 'aguardando', 'concluida', 'cancelada'].indexOf(window._mnCorrCardFiltro) !== -1) {
            sel.value = window._mnCorrCardFiltro;
        } else {
            sel.value = '';
        }
    }
    window._mnRenderCorretivaDados(window._mnCorrDados || []);
};

window.mnCarregarCorretivas = async function() {
    const tok = window._manutTok || window.currentToken || localStorage.getItem('token');
    const fV = document.getElementById('mn-corr-veiculo')?.value || '';
    let url = '/api/frota/manutencoes/corretivas';
    const params = [];
    if (fV) params.push('veiculo_id=' + fV);
    if (params.length) url += '?' + params.join('&');
    try {
        const r = await fetch(url, { headers: { Authorization: 'Bearer ' + tok } });
        const lista = await r.json();
        window._mnCorrDados = Array.isArray(lista) ? lista : [];
        if (Array.isArray(window._manutFrota) && window._mnCorrDados.length) {
            window._mnCorrDados.forEach(function(m) {
                if (m.veiculo_em_manutencao !== undefined) {
                    var vf = window._manutFrota.find(function(x) { return String(x.id) === String(m.veiculo_id); });
                    if (vf) vf.em_manutencao = m.veiculo_em_manutencao;
                }
            });
        }
        window._mnRenderCorretivaDados(window._mnCorrDados);
    } catch(e) {
        const tbody = document.getElementById('mn-corr-tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="12" style="padding:1.5rem;text-align:center;color:#dc2626;">Erro ao carregar manutenções corretivas.</td></tr>';
    }
};

// Celula da placa: foto circular do veiculo + placa (vermelha quando o veiculo esta parado/sem rodar em qualquer solicitacao aberta da placa)
window._mnPlacaCell = function(m) {
    const v = (window._manutFrota || []).find(function(x) { return String(x.id) === String(m.veiculo_id); }) || {};
    const foto = v.foto_url || v.foto_base64 || '';
    const ativa = m.status !== 'concluida' && m.status !== 'cancelada';
    const temAbertaParada = (window._mnCorrDados || []).some(function(x) {
        return String(x.veiculo_id) === String(m.veiculo_id)
            && x.status !== 'concluida' && x.status !== 'cancelada'
            && (x.veiculo_rodando_efetivo === 'nao' || x.veiculo_rodando === 'nao');
    });
    const emManutVeic = (m.veiculo_em_manutencao !== undefined)
        ? (m.veiculo_em_manutencao == 1 || m.veiculo_em_manutencao === '1' || m.veiculo_em_manutencao === true)
        : (v.em_manutencao == 1 || v.em_manutencao === '1' || v.em_manutencao === true);
    const parado = emManutVeic || temAbertaParada || (ativa && m.veiculo_rodando_efetivo === 'nao');
    const avatar = foto
        ? '<img src="' + foto + '" alt="" style="width:38px;height:38px;border-radius:50%;object-fit:cover;border:2px solid ' + (parado ? '#fecaca' : '#e2e8f0') + ';flex-shrink:0;background:#f1f5f9;">'
        : '<div style="width:38px;height:38px;border-radius:50%;background:#f1f5f9;border:2px solid ' + (parado ? '#fecaca' : '#e2e8f0') + ';display:flex;align-items:center;justify-content:center;color:#94a3b8;flex-shrink:0;"><i class="ph ph-truck"></i></div>';
    return '<div style="display:flex;align-items:center;gap:10px;">' + avatar
        + '<div style="text-align:left;"><div style="font-weight:700;color:' + (parado ? '#dc2626' : '#1e293b') + ';">' + (m.placa || '\u2014') + '</div>'
        + '<div style="font-size:0.72rem;font-weight:400;color:#64748b;">' + String(m.tipo_veiculo || '').toLowerCase() + '</div></div></div>';
};

window._mnCorrTipoVeicOpts = function() {
    const tipos = {};
    (window._manutFrota || []).forEach(function(v) { const t = String(v.tipo_veiculo || '').trim(); if (t) tipos[t.toLowerCase()] = t; });
    (window._mnCorrDados || []).forEach(function(m) { const t = String(m.tipo_veiculo || '').trim(); if (t && !tipos[t.toLowerCase()]) tipos[t.toLowerCase()] = t; });
    return Object.keys(tipos).sort().map(function(k) { return '<option value="' + k + '">' + tipos[k].charAt(0).toUpperCase() + tipos[k].slice(1) + '</option>'; }).join('');
};

window._mnRenderCorretivaDados = function(listaBase) {
    const todasBase = Array.isArray(listaBase) ? listaBase : [];
    const fTipoVeic = (document.getElementById('mn-corr-tipoveic') || {}).value || '';
    const todas = fTipoVeic ? todasBase.filter(function(m) { return String(m.tipo_veiculo || '').toLowerCase() === fTipoVeic; }) : todasBase;
    const mesAtual = new Date().toISOString().slice(0, 7);
    const getTempos = m => window._mnCalcTempos ? window._mnCalcTempos(m) : { pedido: { diasTxt: '0 dias', dias: 0, seg: 0 }, parado: { diasTxt: '0 dias', dias: 0, seg: 0, ativo: false } };

    const cardsEl = document.getElementById('mn-corr-cards');
    const fCard = window._mnCorrCardFiltro || '';
    if (cardsEl) {
        const emAndamento = todas.filter(m => m.status === 'em_andamento').length;
        const agendadas   = todas.filter(m => m.status === 'agendada').length;
        const aguardando  = todas.filter(m => m.status === 'aguardando').length;
        const concluidasMes = todas.filter(m => m.status === 'concluida' && (m.data_conclusao || '').startsWith(mesAtual)).length;
        const totalTodos  = todas.length;
        const stAtivo = fCard || 'todos';
        cardsEl.innerHTML = [
            { key: 'em_andamento',  cor: '#dc2626', bg: '#fef2f2', icone: 'ph-wrench',        label: 'Em Manutenção',      val: emAndamento },
            { key: 'agendada',      cor: '#d97706', bg: '#fffbeb', icone: 'ph-calendar-plus', label: 'Novos',              val: agendadas },
            { key: 'aguardando',    cor: '#2563eb', bg: '#eff6ff', icone: 'ph-hourglass',     label: 'Aguardando',         val: aguardando },
            { key: 'concluidas_mes',cor: '#10b981', bg: '#ecfdf5', icone: 'ph-check-circle',  label: 'Concluídas este mês',val: concluidasMes },
            { key: 'todos',         cor: '#7c3aed', bg: '#f5f3ff', icone: 'ph-list-bullets',  label: 'Todos',              val: totalTodos },
        ].map(c => {
            const ativo = stAtivo === c.key;
            return '<div onclick="window.mnCorrFiltrarCard(\'' + c.key + '\')" title="Filtrar por: ' + c.label + '"'
                + ' style="background:' + (ativo ? c.bg : '#fff') + ';border:' + (ativo ? '2px solid ' + c.cor : '1px solid #e2e8f0') + ';border-left:4px solid ' + c.cor + ';border-radius:12px;padding:1rem;display:flex;align-items:center;gap:12px;box-shadow:' + (ativo ? '0 4px 12px ' + c.cor + '22' : '0 2px 6px rgba(0,0,0,0.04)') + ';cursor:pointer;transition:all 0.15s;user-select:none;">'
                + '<div style="width:42px;height:42px;border-radius:10px;background:' + c.cor + '18;color:' + c.cor + ';display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;">'
                + '<i class="ph ' + c.icone + '"></i></div>'
                + '<div>'
                + '<div style="font-size:1.5rem;font-weight:800;color:#1e293b;line-height:1;">' + c.val + '</div>'
                + '<div style="font-size:0.75rem;color:' + (ativo ? c.cor : '#64748b') + ';font-weight:' + (ativo ? '700' : '600') + ';margin-top:2px;">' + c.label + '</div>'
                + '</div>'
                + '</div>';
        }).join('');
    }

    // Aplica filtro de card / dropdown
    let lista = todas.slice();
    if (fCard === 'concluidas_mes') {
        lista = lista.filter(m => m.status === 'concluida' && (m.data_conclusao || '').startsWith(mesAtual));
    } else if (fCard && fCard !== 'todos') {
        lista = lista.filter(m => m.status === fCard);
    }

    const statusCor = { agendada:'#d97706', em_andamento:'#dc2626', aguardando:'#2563eb', concluida:'#10b981', cancelada:'#94a3b8' };
    const statusLbl = { agendada:'Novo', em_andamento:'Em Manutenção', aguardando:'Aguardando', concluida:'Concluído', cancelada:'Cancelada' };

    // Aplica ordenacao por coluna se selecionada
    const st = window._mnCorrSort || { col: '', dir: 'asc' };
    if (st.col) {
        const mult = st.dir === 'asc' ? 1 : -1;
        lista.sort((a, b) => {
            if (st.col === 'placa' || st.col === 'descricao' || st.col === 'fornecedor') {
                const va = String(a[st.col] || '').trim().toLowerCase();
                const vb = String(b[st.col] || '').trim().toLowerCase();
                if (!va && vb) return 1;
                if (va && !vb) return -1;
                return va.localeCompare(vb, 'pt-BR') * mult;
            }
            if (st.col === 'status') {
                const va = (statusLbl[a.status] || a.status || '').toLowerCase();
                const vb = (statusLbl[b.status] || b.status || '').toLowerCase();
                return va.localeCompare(vb, 'pt-BR') * mult;
            }
            if (st.col === 'data_inicio' || st.col === 'data_conclusao') {
                const da = a[st.col] ? String(a[st.col]).split('T')[0] : '';
                const db = b[st.col] ? String(b[st.col]).split('T')[0] : '';
                if (!da && db) return 1;
                if (da && !db) return -1;
                return da.localeCompare(db) * mult;
            }
            if (st.col === 'dias_pedido') {
                return ((getTempos(a).pedido.seg || 0) - (getTempos(b).pedido.seg || 0)) * mult;
            }
            if (st.col === 'dias_parado') {
                return ((getTempos(a).parado.seg || 0) - (getTempos(b).parado.seg || 0)) * mult;
            }
            if (st.col === 'custo_pecas' || st.col === 'custo_mao_obra' || st.col === 'custo') {
                const na = Number(a[st.col]) || 0;
                const nb = Number(b[st.col]) || 0;
                return (na - nb) * mult;
            }
            return 0;
        });
    }

    const count = document.getElementById('mn-corr-count');
    if (count) count.textContent = lista.length + ' registro' + (lista.length !== 1 ? 's' : '');

    const fmtD = d => {
        if (!d) return '<span style="color:#94a3b8;">—</span>';
        const p = d.split('T')[0].split('-');
        return `<span style="font-weight:600;">${p[2]}/${p[1]}/${(p[0]||'').slice(2)}</span>`;
    };

    const tbody = document.getElementById('mn-corr-tbody');
    if (!tbody) return;

    if (!lista.length) {
        tbody.innerHTML = '<tr><td colspan="12" style="padding:2.5rem;text-align:center;color:#94a3b8;"><i class="ph ph-wrench" style="font-size:2rem;display:block;margin-bottom:8px;"></i>Nenhuma manutenção corretiva encontrada.</td></tr>';
        return;
    }

    tbody.innerHTML = lista.map((m, i) => {
        const bgRow = i % 2 === 0 ? '#fff' : '#fafafa';
        const sKey = m.status || 'agendada';
        const statusBadge = `<span style="background:${statusCor[sKey]||'#94a3b8'}22;color:${statusCor[sKey]||'#94a3b8'};padding:2px 10px;border-radius:20px;font-size:0.75rem;font-weight:700;white-space:nowrap;">${statusLbl[sKey]||sKey}</span>`
            + (sKey === 'cancelada' ? '' : (function() {
                const rodTab = (m.veiculo_rodando_efetivo || m.veiculo_rodando || (sKey === 'em_andamento' ? 'nao' : 'sim')) === 'nao' ? 'nao' : 'sim';
                return rodTab === 'nao'
                    ? '<div style="margin-top:4px;"><span style="background:#fee2e2;color:#b91c1c;border:1px solid #fecaca;padding:1px 8px;border-radius:999px;font-size:0.64rem;font-weight:800;white-space:nowrap;letter-spacing:0.2px;">VEÍCULO PARADO</span></div>'
                    : '<div style="margin-top:4px;"><span style="background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;padding:1px 8px;border-radius:999px;font-size:0.64rem;font-weight:800;white-space:nowrap;letter-spacing:0.2px;">VEÍCULO RODANDO</span></div>';
            })());
        const tp = getTempos(m);
        const pCor = tp.pedido.dias >= 7 ? '#dc2626' : tp.pedido.dias >= 3 ? '#d97706' : '#0284c7';
        const pedidoBadge = `<span data-cron-pedido="${m.id}" style="background:${pCor}18;color:${pCor};padding:3px 10px;border-radius:20px;font-size:0.78rem;font-weight:700;white-space:nowrap;"><span class="cron-d">${tp.pedido.diasTxt}</span></span>`;

        const srCor = tp.parado.ativo ? '#dc2626' : (tp.parado.dias > 0 ? '#d97706' : '#10b981');
        const paradoBadge = `<span data-cron-parado="${m.id}" style="background:${srCor}18;color:${srCor};padding:3px 10px;border-radius:20px;font-size:0.78rem;font-weight:700;white-space:nowrap;"><span class="cron-d">${tp.parado.diasTxt}</span></span>`;

        let acoes = '';
        acoes += '<button onclick="window.mnCorrEditarInterno(' + m.id + ')" style="background:#2563eb;color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:0.75rem;cursor:pointer;font-weight:600;white-space:nowrap;display:inline-flex;align-items:center;gap:3px;"><i class="ph ph-pencil-simple"></i> Editar</button>';
        acoes += ' <button title="Excluir manutenção" onclick="window.mnCorrExcluirInterno(' + m.id + ')" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:6px;padding:4px 8px;font-size:0.75rem;cursor:pointer;display:inline-flex;align-items:center;"><i class="ph ph-trash"></i></button>';

        return `<tr style="background:${bgRow};border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background='#fefce8'" onmouseout="this.style.background='${bgRow}'">
            <td style="padding:8px 12px;white-space:nowrap;">${window._mnPlacaCell(m)}</td>
            <td style="padding:10px 12px;max-width:220px;"><span title="${(m.descricao||'').replace(/"/g,'&quot;')}" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${m.descricao||'—'}</span></td>
            <td style="padding:10px 12px;text-align:center;">${statusBadge}</td>
            <td style="padding:10px 12px;text-align:center;">${fmtD(m.data_inicio)}</td>
            <td style="padding:10px 12px;text-align:center;">${pedidoBadge}</td>
            <td style="padding:10px 12px;text-align:center;">${paradoBadge}</td>
            <td style="padding:10px 12px;text-align:center;">${fmtD(m.data_conclusao)}</td>
            <td style="padding:10px 12px;text-align:center;color:#64748b;">${m.fornecedor||'—'}</td>
            <td style="padding:10px 12px;text-align:right;color:#2563eb;font-weight:600;white-space:nowrap;">${window._mnFmtR(m.custo_pecas)}</td>
            <td style="padding:10px 12px;text-align:right;color:#d97706;font-weight:600;white-space:nowrap;">${window._mnFmtR(m.custo_mao_obra)}</td>
            <td style="padding:10px 12px;text-align:right;color:#10b981;font-weight:700;white-space:nowrap;">${window._mnFmtR(m.custo)}</td>
            <td style="padding:10px 12px;text-align:center;"><div style="display:flex;gap:4px;align-items:center;justify-content:center;">${acoes}</div></td>
        </tr>`;
    }).join('');
    if (window._mnIniciarCronometros) window._mnIniciarCronometros();
};
function _mnRenderCorretivaDados(lista) { window._mnRenderCorretivaDados(lista); }

window.mnCorrAcaoInterno = function(id, status) {
    var m = (window._mnCorrDados || []).find(function(x) { return String(x.id) === String(id); });
    var stAtual = m ? m.status : 'agendada';
    window._mnEdPedirJustificativaStatus(stAtual, status, async function(justTxt) {
        const tok = window._manutTok || window.currentToken || localStorage.getItem('token');
        try {
            const r = await fetch('/api/frota/manutencoes/' + id + '/status', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
                body: JSON.stringify({ status: status, justificativa_status: justTxt })
            });
            const rj = await r.json().catch(function() { return {}; });
            if (!r.ok) throw new Error(rj.error || 'Erro');
            if (typeof mostrarToastAviso === 'function') mostrarToastAviso('✅ Status atualizado!');
            await window.mnCarregarCorretivas();
            if (typeof window._mnTratarOutrasAbertasPosStatus === 'function') {
                window._mnTratarOutrasAbertasPosStatus(status, rj, m ? m.placa : '');
            }
        } catch(e) { if (typeof mostrarToastAviso === 'function') mostrarToastAviso('❌ ' + e.message); }
    });
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
    var mRef = (window._mnCorrDados || []).find(function(x) { return String(x.id) === String(id); });
    try {
        const r = await fetch(`/api/frota/manutencoes/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
            body: JSON.stringify({ status: 'concluida', km_na_manutencao: km||null, custo: custo||null, fornecedor: fornecedor||null, observacoes: observacoes||null })
        });
        const rj = await r.json().catch(function() { return {}; });
        if (!r.ok) throw new Error(rj.error || 'Erro');
        document.getElementById('mn-corr-concl-modal')?.remove();
        if (typeof mostrarToastAviso === 'function') mostrarToastAviso('✅ Manutenção concluída!');
        await window.mnCarregarCorretivas();
        if (typeof window._mnTratarOutrasAbertasPosStatus === 'function') {
            window._mnTratarOutrasAbertasPosStatus('concluida', rj, mRef ? mRef.placa : '');
        }
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
    { v: 'agendada',     l: 'Novo',          c: '#d97706' },
    { v: 'em_andamento', l: 'Em manutenção', c: '#dc2626' },
    { v: 'aguardando',   l: 'Aguardando',    c: '#2563eb' },
    { v: 'concluida',    l: 'Concluído',     c: '#10b981' }
];

window._mnParseTS = function(v) {
    if (!v) return null;
    var t = String(v).trim();
    if (!t) return null;
    var d;
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
        d = new Date(t + 'T00:00:00');
    } else if (/Z|[+-]\d\d:\d\d$/.test(t)) {
        d = new Date(t);
    } else {
        d = new Date(t.replace(' ', 'T') + 'Z');
    }
    return isNaN(d.getTime()) ? null : d.getTime();
};

window._mnFmtCron = function(seg) {
    var sTot = Math.max(0, Math.floor(Number(seg) || 0));
    var d = Math.floor(sTot / 86400);
    var h = Math.floor((sTot % 86400) / 3600);
    var mi = Math.floor((sTot % 3600) / 60);
    var s = Math.floor(sTot % 60);
    var dTxt = d + (d === 1 ? ' dia' : ' dias');
    var rel = String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    return { seg: sTot, dias: d, diasTxt: dTxt, relogio: rel, completo: dTxt + ' · ' + rel };
};

window._mnPedirSenhaExclusao = function(titulo, cb) {
    var old = document.getElementById('mned-senha-pop'); if (old) old.remove();
    var pop = document.createElement('div');
    pop.id = 'mned-senha-pop';
    pop.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.65);display:flex;align-items:center;justify-content:center;z-index:10050;padding:16px;';
    pop.innerHTML = '<div style="background:#fff;border-radius:16px;width:100%;max-width:400px;box-shadow:0 25px 60px rgba(0,0,0,0.35);overflow:hidden;">'
      + '<div style="background:linear-gradient(135deg,#991b1b,#dc2626);padding:14px 20px;display:flex;align-items:center;gap:10px;">'
      +   '<div style="background:rgba(255,255,255,0.2);border-radius:9px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;"><i class="ph ph-lock-key" style="color:#fff;font-size:1.2rem;"></i></div>'
      +   '<div style="color:#fff;font-weight:700;font-size:0.95rem;">' + window._mnEdEsc(titulo || 'Excluir manutenção') + '</div>'
      +   '<button type="button" id="mned-senha-x" style="margin-left:auto;background:rgba(255,255,255,0.15);border:none;border-radius:50%;width:28px;height:28px;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;"><i class="ph ph-x"></i></button>'
      + '</div>'
      + '<div style="padding:18px 20px;">'
      +   '<p style="margin:0 0 12px;font-size:0.84rem;color:#475569;">Digite a senha de autorização para excluir esta manutenção:</p>'
      +   '<input type="password" id="mned-senha-inp" placeholder="Senha..." autocomplete="off" style="width:100%;padding:10px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:0.92rem;font-family:inherit;box-sizing:border-box;outline:none;">'
      +   '<div id="mned-senha-err" style="display:none;color:#dc2626;font-size:0.78rem;font-weight:700;margin-top:6px;">Senha incorreta!</div>'
      +   '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">'
      +     '<button type="button" id="mned-senha-cancel" style="padding:9px 18px;border:1.5px solid #e2e8f0;border-radius:8px;background:#fff;color:#64748b;cursor:pointer;font-weight:600;">Cancelar</button>'
      +     '<button type="button" id="mned-senha-ok" style="padding:9px 20px;border:none;border-radius:8px;background:#dc2626;color:#fff;cursor:pointer;font-weight:700;display:flex;align-items:center;gap:6px;"><i class="ph ph-trash"></i> Excluir</button>'
      +   '</div>'
      + '</div></div>';
    document.body.appendChild(pop);
    var fechar = function() { var el = document.getElementById('mned-senha-pop'); if (el) el.remove(); };
    document.getElementById('mned-senha-x').onclick = fechar;
    document.getElementById('mned-senha-cancel').onclick = fechar;
    pop.addEventListener('mousedown', function(e) { if (e.target === pop) fechar(); });
    var inp = document.getElementById('mned-senha-inp');
    var err = document.getElementById('mned-senha-err');
    setTimeout(function() { if (inp) inp.focus(); }, 50);
    var confirmar = function() {
        var val = inp ? inp.value.trim() : '';
        if (val !== 'log123') {
            if (err) err.style.display = 'block';
            if (inp) { inp.style.borderColor = '#dc2626'; inp.focus(); inp.select(); }
            return;
        }
        fechar();
        if (cb) cb(val);
    };
    document.getElementById('mned-senha-ok').onclick = confirmar;
    if (inp) inp.addEventListener('keydown', function(e) { if (e.key === 'Enter') confirmar(); });
};

window.mnCorrExcluirInterno = function(id) {
    window._mnPedirSenhaExclusao('Excluir manutenção corretiva', async function(senha) {
        var tok = window._manutTok || window.currentToken || localStorage.getItem('token');
        try {
            var r = await fetch('/api/frota/manutencoes/' + id + '?senha=' + encodeURIComponent(senha), {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
                body: JSON.stringify({ senha: senha })
            });
            var j = await r.json().catch(function() { return {}; });
            if (!r.ok) throw new Error(j.error || 'Erro ao excluir a manutenção');
            if (window._mnEd && String(window._mnEd.id) === String(id)) window._mnEdFechar();
            if (typeof mostrarToastAviso === 'function') mostrarToastAviso('🗑️ Manutenção excluída!');
            window.mnCarregarCorretivas();
            try {
                var frotaAt = await fetch('/api/frota/veiculos?_=' + Date.now(), { headers: { Authorization: 'Bearer ' + tok } }).then(function(x) { return x.json(); });
                if (Array.isArray(frotaAt)) { window._manutFrota = frotaAt; window._frotaDados = frotaAt; }
            } catch (eF) {}
        } catch (e) {
            alert(e.message);
        }
    });
};

window._mnCalcTempos = function(m, statusOverride, rodandoOverride) {
    m = m || {};
    var agora = Date.now();
    var st = statusOverride || m.status || 'agendada';
    var encerrada = (st === 'concluida' || st === 'cancelada');
    var iniPed = window._mnParseTS(m.created_at) || window._mnParseTS(m.data_agendamento) || window._mnParseTS(m.data_inicio) || agora;
    var fimPed = encerrada ? (window._mnParseTS(m.data_conclusao ? (String(m.data_conclusao).length === 10 ? m.data_conclusao + 'T23:59:59' : m.data_conclusao) : m.updated_at) || agora) : agora;
    var segPed = Math.max(0, Math.floor((fimPed - iniPed) / 1000));

    var hojeStr = window._mnHojeISO ? window._mnHojeISO() : new Date().toISOString().split('T')[0];
    var diStr = m.data_inicio ? String(m.data_inicio).split('T')[0] : '';
    var dfStr = m.data_fim ? String(m.data_fim).split('T')[0] : '';
    var dcStr = m.data_conclusao ? String(m.data_conclusao).split('T')[0] : '';
    var rod = rodandoOverride || m.veiculo_rodando || m.veiculo_rodando_efetivo || m.sinistro_rodando || (st === 'em_andamento' ? 'nao' : 'sim');
    if (st === 'em_andamento') rod = 'nao';
    if (!encerrada && st !== 'em_andamento') {
        if (diStr && dfStr) {
            if (hojeStr < diStr) rod = 'sim';
            else if (hojeStr >= diStr && hojeStr <= dfStr) rod = 'nao';
            else if (hojeStr > dfStr) rod = 'sim';
        } else if (rod === 'nao' && diStr && diStr > hojeStr) {
            rod = 'sim';
        }
    }
    var paradoAtivo = !encerrada && rod === 'nao';
    var segPar = Number(m.parado_segundos_acum || 0);
    if (st === 'concluida' && diStr && dcStr && dcStr > diStr) {
        var diasParConcl = Math.max(0, Math.round((new Date(dcStr + 'T00:00:00Z') - new Date(diStr + 'T00:00:00Z')) / 86400000));
        if (diasParConcl > 0) segPar = diasParConcl * 86400;
    } else if (paradoAtivo) {
        var tsDi = (diStr && diStr <= hojeStr) ? window._mnParseTS(diStr) : null;
        var tsPd = window._mnParseTS(m.parado_desde);
        var pDesde = (tsDi && (!tsPd || Number(m.parado_segundos_acum || 0) === 0)) ? tsDi : (tsPd || tsDi || window._mnParseTS(m.created_at) || agora);
        segPar += Math.max(0, Math.floor((agora - pDesde) / 1000));
    } else if (!segPar && m.parado_desde) {
        var pIni = window._mnParseTS(m.parado_desde);
        if (pIni) segPar += Math.max(0, Math.floor(((encerrada ? fimPed : agora) - pIni) / 1000));
    }
    var fPed = window._mnFmtCron(segPed);
    var fPar = window._mnFmtCron(segPar);
    fPar.ativo = paradoAtivo;
    fPar.rodando = rod;
    return { pedido: fPed, parado: fPar };
};

window._mnTickCronometros = function() {
    var lista = window._mnCorrDados || [];
    if (lista.length) {
        lista.forEach(function(m) {
            var elPed = document.querySelector('[data-cron-pedido="' + m.id + '"]');
            var elPar = document.querySelector('[data-cron-parado="' + m.id + '"]');
            if (!elPed && !elPar) return;
            var tp = window._mnCalcTempos(m);
            if (elPed) {
                var d1 = elPed.querySelector('.cron-d'), h1 = elPed.querySelector('.cron-h');
                if (d1) d1.textContent = tp.pedido.diasTxt;
                if (h1) h1.textContent = tp.pedido.relogio;
            }
            if (elPar) {
                var d2 = elPar.querySelector('.cron-d'), h2 = elPar.querySelector('.cron-h');
                if (d2) d2.textContent = tp.parado.diasTxt;
                if (h2) h2.textContent = tp.parado.relogio;
            }
        });
    }
    if (window._mnEd && document.getElementById('mn-corr-edit-modal')) {
        window._mnEdAtualizarCronModal();
    }
};

window._mnIniciarCronometros = function() {
    if (window._mnCronTimer) clearInterval(window._mnCronTimer);
    window._mnTickCronometros();
    window._mnCronTimer = setInterval(window._mnTickCronometros, 1000);
};

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

// =====================================================================================================
// MANUTENCAO CORRETIVA - TELA UNICA (criar e editar sao a mesma tela, em tela cheia)
// =====================================================================================================
window._mnFmtDH = function(v) {
    if (!v) return '';
    var t = String(v);
    var d = /Z|[+-]\d\d:\d\d$/.test(t) ? new Date(t) : new Date(t.replace(' ', 'T') + 'Z');
    if (isNaN(d.getTime())) return t;
    try {
        return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
    } catch (e) { return d.toLocaleString('pt-BR'); }
};
window._mnDataInput = function(v) { return String(v || '').split('T')[0].split(' ')[0]; };
window._mnHojeISO = function() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};
window._mnEdMapRealizado = function(s) {
    return { id: s.id, nome: s.nome, catalogo_id: s.catalogo_id, item_ref: s.item_ref, mao_obra: s.mao_obra || '', mao_obra_informado: (Number(s.mao_obra_informado) === 1 || Number(s.mao_obra) > 0) ? 1 : 0, garantia_valor: (s.garantia_valor === 0 || s.garantia_valor === '0' || s.garantia_valor) ? s.garantia_valor : '', garantia_unidade: s.garantia_unidade || 'dias', observacao: s.observacao || '', mo_alocado: s.mo_alocado || 0 };
};
window._mnEdMapMo = function(l) {
    return { id: l.id, nota_id: l.nota_id || null, descricao: l.descricao || '', valor: l.valor || 0, ratear: l.ratear ? 1 : 0, servicos: Array.isArray(l.servicos) ? l.servicos.slice() : [], fornecedor: l.fornecedor || null, garantia_valor: (l.garantia_valor === 0 || l.garantia_valor === '0' || l.garantia_valor) ? l.garantia_valor : '', garantia_unidade: l.garantia_unidade || 'dias' };
};

window._mnEdCarregarCatalogo = async function() {
    var hdr = { Authorization: 'Bearer ' + window._mnEdTok() };
    try {
        var rc = await fetch('/api/frota/catalogo', { headers: hdr });
        if (rc.ok) window._manutCatalogo = await rc.json();
        var rcat = await fetch('/api/frota/categorias', { headers: hdr });
        if (rcat.ok) window._manutCategorias = await rcat.json();
    } catch (e) { /* mantem o que ja estava carregado */ }
};

// Botao "+ Nova Manutencao Corretiva": abre a MESMA tela da edicao, vazia. O registro so e criado ao salvar
// (ou quando for preciso anexar nota/peca/comentario, que exigem a manutencao ja gravada).
window.mnCorrNovaInterno = async function(opts) {
    opts = opts || {};
    await window._mnEdCarregarCatalogo();
    window._mnEd = {
        id: null, novo: true,
        m: { tipo: 'corretiva', status: 'agendada', veiculo_id: opts.vid || '', descricao: opts.descricao || '', km_na_manutencao: '', km_final_manutencao: '', fornecedor: '', data_inicio: window._mnHojeISO(), data_fim: '', data_conclusao: '', created_at: new Date().toISOString(), veiculo_rodando: opts.veiculo_rodando || '', parado_desde: null, parado_segundos_acum: 0 },
        status: 'agendada', _statusInicial: 'agendada', _jaPerguntouStatus: '', veiculo_rodando: opts.veiculo_rodando || '', justificativa_status: '', solicitados: [], realizados: [], pecas: [], notas: [], mo: [], historico: [], midias: [], pickSel: {}
    };
    window._mnEdMontar();
};

window.mnCorrEditarInterno = async function(id) {
    var hdr = { Authorization: 'Bearer ' + window._mnEdTok() };
    var det;
    try {
        var r = await fetch('/api/frota/manutencoes/' + id + '/detalhe', { headers: hdr });
        if (!r.ok) throw new Error('Erro ao carregar a manutenção');
        det = await r.json();
    } catch (e) { alert(e.message); return; }
    await window._mnEdCarregarCatalogo();
    var m = det.manutencao;
    var rodIni = m.veiculo_rodando || (m.status === 'em_andamento' ? 'nao' : 'sim');
    window._mnEd = {
        id: id, novo: false, m: m,
        status: m.status || 'agendada',
        _statusInicial: m.status || 'agendada',
        _jaPerguntouStatus: '',
        veiculo_rodando: rodIni,
        justificativa_status: '',
        solicitados: (det.solicitados || []).map(function(s) { return s.nome; }),
        realizados: (det.realizados || []).map(window._mnEdMapRealizado),
        pecas: det.pecas || [],
        notas: det.notas || [],
        mo: (det.mo || []).map(window._mnEdMapMo),
        historico: det.historico || [],
        midias: det.midias || [],
        pickSel: {}
    };
    window._mnEdMontar();
};

// Antes de abrir uma nova solicitacao corretiva: se o veiculo ja tem solicitacao aberta, o usuario escolhe entre
// criar nova ou apenas "reforcar a necessidade" da existente (fica registrado no historico dela).
// Retorna { acao: 'nova' | 'reforco' | 'cancelar', id }
window._mnChecarSolicitacaoExistente = async function(veiculoId, descricaoNova) {
    if (!veiculoId) return { acao: 'nova' };
    var tok = window._manutTok || window.currentToken || localStorage.getItem('token') || localStorage.getItem('erp_token');
    var abertas = [];
    try {
        var lista = await fetch('/api/frota/manutencoes?_=' + Date.now(), { headers: { Authorization: 'Bearer ' + tok } }).then(function(x) { return x.json(); });
        abertas = (Array.isArray(lista) ? lista : []).filter(function(m) {
            return String(m.veiculo_id) === String(veiculoId) && m.tipo === 'corretiva' && m.status !== 'concluida' && m.status !== 'cancelada';
        });
    } catch (e) { return { acao: 'nova' }; }
    if (!abertas.length) return { acao: 'nova' };

    return new Promise(function(resolve) {
        var esc = function(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
        var stLbl = { agendada: 'Novo', em_andamento: 'Em Manutenção', aguardando: 'Aguardando' };
        var stCor = { agendada: '#d97706', em_andamento: '#dc2626', aguardando: '#2563eb' };
        var fmt = function(d) { if (!d) return '—'; var p = String(d).split('T')[0].split(' ')[0].split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : d; };
        var old = document.getElementById('mn-pop-existente'); if (old) old.remove();
        var pop = document.createElement('div');
        pop.id = 'mn-pop-existente';
        pop.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.7);display:flex;align-items:center;justify-content:center;z-index:10080;padding:16px;';
        var placa = abertas[0].placa || '';
        var itens = abertas.map(function(m, idx) {
            var sc = stCor[m.status] || '#64748b';
            return '<label style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:10px;background:#f8fafc;margin-bottom:8px;cursor:pointer;">'
                + '<input type="radio" name="mn_exist_sel" value="' + m.id + '"' + (idx === 0 ? ' checked' : '') + ' style="margin-top:4px;accent-color:#d97706;">'
                + '<div style="flex:1;min-width:0;">'
                +   '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px;">'
                +     '<span style="font-size:0.76rem;font-weight:800;color:#334155;">#' + m.id + '</span>'
                +     '<span style="background:' + sc + '22;color:' + sc + ';padding:2px 8px;border-radius:999px;font-size:0.72rem;font-weight:700;">' + esc(stLbl[m.status] || m.status) + '</span>'
                +     '<span style="font-size:0.74rem;color:#64748b;">Solicitada em <b>' + esc(fmt(m.created_at)) + '</b></span>'
                +   '</div>'
                +   '<div style="font-size:0.84rem;color:#1e293b;font-weight:600;word-break:break-word;">' + esc(m.descricao || 'Sem descrição') + '</div>'
                + '</div></label>';
        }).join('');
        pop.innerHTML = '<div style="background:#fff;border-radius:16px;width:100%;max-width:540px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 25px 60px rgba(0,0,0,0.35);overflow:hidden;">'
            + '<div style="background:linear-gradient(135deg,#92400e,#d97706);padding:14px 20px;display:flex;align-items:center;gap:10px;">'
            +   '<div style="background:rgba(255,255,255,0.2);border-radius:9px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;"><i class="ph ph-warning-circle" style="color:#fff;font-size:1.3rem;"></i></div>'
            +   '<div style="color:#fff;font-weight:700;font-size:0.98rem;">Já existe solicitação em aberto — ' + esc(placa) + '</div>'
            + '</div>'
            + '<div style="padding:18px 20px;overflow-y:auto;">'
            +   '<p style="margin:0 0 12px;font-size:0.88rem;color:#334155;line-height:1.45;">Este veículo já possui ' + (abertas.length === 1 ? '<b>uma solicitação de manutenção em aberto</b>' : '<b>' + abertas.length + ' solicitações de manutenção em aberto</b>') + '. Verifique se ela já atende a necessidade informada. Se sim, basta <b>reforçar</b> a solicitação existente (fica registrado no histórico) sem abrir uma nova.</p>'
            +   (descricaoNova ? '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 12px;font-size:0.8rem;color:#92400e;margin-bottom:12px;"><b>Nova necessidade informada:</b> ' + esc(descricaoNova) + '</div>' : '')
            +   '<div>' + itens + '</div>'
            + '</div>'
            + '<div style="padding:14px 20px;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;background:#f8fafc;">'
            +   '<button type="button" id="mn-exist-cancelar" style="padding:9px 16px;border:1.5px solid #cbd5e1;border-radius:8px;background:#fff;color:#475569;cursor:pointer;font-weight:700;">Cancelar</button>'
            +   '<button type="button" id="mn-exist-nova" style="padding:9px 16px;border:1.5px solid #d97706;border-radius:8px;background:#fff;color:#b45309;cursor:pointer;font-weight:700;">Criar nova mesmo assim</button>'
            +   '<button type="button" id="mn-exist-reforco" style="padding:9px 18px;border:none;border-radius:8px;background:#16a34a;color:#fff;cursor:pointer;font-weight:700;display:inline-flex;align-items:center;gap:6px;"><i class="ph ph-arrow-fat-lines-up"></i> Reforçar a selecionada</button>'
            + '</div></div>';
        document.body.appendChild(pop);
        var fechar = function(res) { var el = document.getElementById('mn-pop-existente'); if (el) el.remove(); resolve(res); };
        document.getElementById('mn-exist-cancelar').onclick = function() { fechar({ acao: 'cancelar' }); };
        document.getElementById('mn-exist-nova').onclick = function() { fechar({ acao: 'nova' }); };
        document.getElementById('mn-exist-reforco').onclick = async function() {
            var sel = pop.querySelector('input[name="mn_exist_sel"]:checked');
            var id = sel ? sel.value : (abertas[0] && abertas[0].id);
            var btn = this;
            btn.disabled = true;
            try {
                var r = await fetch('/api/frota/manutencoes/' + id + '/reforco', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
                    body: JSON.stringify({ descricao: descricaoNova || '' })
                });
                var j = await r.json().catch(function() { return {}; });
                if (!r.ok) throw new Error(j.error || 'Erro ao registrar o reforço');
                if (typeof mostrarToastAviso === 'function') mostrarToastAviso('\u2705 Reforço de necessidade registrado na solicitação #' + id + '.');
                fechar({ acao: 'reforco', id: id });
            } catch (e) {
                btn.disabled = false;
                alert('Erro: ' + e.message);
            }
        };
    });
};

// Cria o registro quando ainda e novo (necessario para anexar nota, incluir pecas, comentar...)
window._mnEdGarantirId = async function() {
    var ed = window._mnEd;
    if (ed.id) return ed.id;
    var veic = document.getElementById('mned-veic').value;
    var desc = document.getElementById('mned-desc').value.trim();
    if (!veic) throw new Error('Selecione o veículo antes de continuar.');
    if (!desc) throw new Error('Informe o defeito / problema antes de continuar.');
    if (ed.veiculo_rodando !== 'sim' && ed.veiculo_rodando !== 'nao') {
        throw new Error('Informe se o veículo está rodando ou parado ("O veículo está rodando? *").');
    }
    var diVal = document.getElementById('mned-di') ? document.getElementById('mned-di').value : '';
    var dfVal = document.getElementById('mned-df') ? document.getElementById('mned-df').value : '';
    var itensSolic = (ed.solicitados && ed.solicitados.length)
        ? ed.solicitados.join(', ')
        : ((ed.realizados && ed.realizados.length) ? ed.realizados.map(function(s) { return s.nome; }).join(', ') : desc);
    var stCriacao = (ed.status && ed.status !== 'concluida') ? ed.status : 'agendada';
    var r = await fetch('/api/frota/manutencoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + window._mnEdTok() },
        body: JSON.stringify({ veiculo_id: veic, tipo: 'corretiva', descricao: desc, itens_solicitados: itensSolic, status: stCriacao, veiculo_rodando: ed.veiculo_rodando, data_inicio: diVal || null, data_fim: dfVal || null })
    });
    if (!r.ok) { var e = await r.json().catch(function() { return {}; }); throw new Error(e.error || 'Erro ao criar a manutenção'); }
    var j = await r.json();
    ed.id = j.id;
    ed.novo = false;
    if (typeof window.checkUserNotificacoes === 'function') {
        window.checkUserNotificacoes();
        setTimeout(window.checkUserNotificacoes, 800);
    }
    var t = document.getElementById('mned-titulo');
    if (t) t.textContent = 'Editar Manutenção Corretiva';
    return ed.id;
};

window._mnEdFechar = function() {
    window._mnEdNotaStage = null;
    if (typeof window._mnEdFecharVinculo === 'function') window._mnEdFecharVinculo();
    ['mn-corr-edit-modal', 'mned-lista-pop', 'mnp-pop', 'mno-pop', 'mnv-pop', 'mned-just-pop', 'mned-senha-pop', 'mned-rev-pop', 'mned-vinc-pop'].forEach(function(i) {
        var el = document.getElementById(i); if (el) el.remove();
    });
};

window._mnEdMarcoRevisaoTexto = function(v) {
    if (!v) return null;
    var rawInfo = v.revisao_info || {};
    var info = rawInfo.marco_pendente || rawInfo;
    var st = (rawInfo.marco_pendente && rawInfo.marco_pendente.status) || v.revisao_status;
    if (st !== 'vencida' && st !== 'a_vencer') return null;
    var ehCar = !!(info.eh_carretinha || (typeof window._mnRevEhCarretinha === 'function' && window._mnRevEhCarretinha(v)));
    var usoSev = !ehCar && Number(v.uso_severo || 0) === 1;
    var marcoKm = Number(info.marco_km || (usoSev ? 5000 : 10000));
    var marcoMeses = Number(info.marco_meses || (usoSev ? 6 : 12));
    var limKm = Number(info.limite_km || marcoKm);
    var limData = info.limite_data ? _mnRevFmtDataBR(info.limite_data) : '';
    var marcoTxt = ehCar
        ? (marcoMeses + ' meses' + (limData ? ' (até ' + limData + ')' : ''))
        : (limKm.toLocaleString('pt-BR') + ' km ou ' + marcoMeses + ' meses' + (limData ? ' (até ' + limData + ')' : ''));
    var det = [];
    if (st === 'vencida') {
        if (!ehCar && info.atraso_km) det.push('ultrapassou ' + Number(info.atraso_km).toLocaleString('pt-BR') + ' km');
        if (info.atraso_dias) det.push('venceu há ' + info.atraso_dias + ' dias');
    } else {
        if (!ehCar && info.falta_km !== null && info.falta_km !== undefined) det.push('faltam ' + Number(info.falta_km).toLocaleString('pt-BR') + ' km');
        if (info.falta_dias !== null && info.falta_dias !== undefined) det.push('faltam ' + info.falta_dias + ' dias');
    }
    return { status: st, ehCar: ehCar, marcoKm: marcoKm, marcoMeses: marcoMeses, marcoTxt: marcoTxt, detalheTxt: det.join(' • ') };
};

window._mnEdRenderAlertaRevisao = function() {
    var box = document.getElementById('mned-rev-alerta');
    if (!box) return;
    var vid = (document.getElementById('mned-veic') && document.getElementById('mned-veic').value) || (window._mnEd && window._mnEd.m && window._mnEd.m.veiculo_id) || '';
    if (!vid) { box.innerHTML = ''; return; }
    var v = (window._manutFrota || window._frotaDados || []).find(function(x) { return String(x.id) === String(vid); });
    if (v && (v.revisao_status === undefined || ((v.revisao_status === 'vencida' || v.revisao_status === 'a_vencer') && (!v.revisao_info || (!v.revisao_info.marco_km && !v.revisao_info.marco_pendente)))) && !window._mnEdBuscandoFrotaRev) {
        window._mnEdBuscandoFrotaRev = true;
        if (typeof window._mnPrevAtualizarFrota === 'function') {
            window._mnPrevAtualizarFrota().then(function() {
                window._mnEdBuscandoFrotaRev = false;
                window._mnEdRenderAlertaRevisao();
            }).catch(function() { window._mnEdBuscandoFrotaRev = false; });
        }
    }
    var r = window._mnEdMarcoRevisaoTexto(v);
    if (!r) { box.innerHTML = ''; return; }
    var esc = window._mnEdEsc;
    var ehVenc = r.status === 'vencida';
    var bg = ehVenc ? 'linear-gradient(135deg,#fef2f2,#fee2e2)' : 'linear-gradient(135deg,#fff7ed,#ffedd5)';
    var borda = ehVenc ? '#ef4444' : '#f97316';
    var bordaEsq = ehVenc ? '#dc2626' : '#ea580c';
    var corTit = ehVenc ? '#991b1b' : '#9a3412';
    var corTxt = ehVenc ? '#7f1d1d' : '#7c2d12';
    var ico = ehVenc ? 'ph-warning-octagon' : 'ph-calendar-plus';
    var titulo = ehVenc
        ? 'Revisão Vencida — Realize o Agendamento da Revisão!'
        : 'Agendar Revisão — Revisão Próxima do Vencimento!';
    var sub = ehVenc
        ? ('Este veículo está com revisão vencida no marco de <b>' + esc(r.marcoTxt) + '</b>' + (r.detalheTxt ? ' (' + esc(r.detalheTxt) + ')' : '') + '. Aproveite para agendar ou iniciar a revisão.')
        : ('Este veículo está próximo do marco de revisão de <b>' + esc(r.marcoTxt) + '</b>' + (r.detalheTxt ? ' (' + esc(r.detalheTxt) + ')' : '') + '. Providencie o agendamento da revisão.');
    box.innerHTML =
        '<div style="background:' + bg + ';border:2px solid ' + borda + ';border-left:6px solid ' + bordaEsq + ';border-radius:12px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;box-shadow:0 2px 8px rgba(0,0,0,0.06);">'
      +   '<div style="display:flex;align-items:center;gap:12px;flex:1;min-width:260px;">'
      +     '<div style="background:' + bordaEsq + ';color:#fff;width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1.3rem;"><i class="ph ' + ico + '"></i></div>'
      +     '<div>'
      +       '<div style="font-size:0.9rem;font-weight:900;color:' + corTit + ';text-transform:uppercase;letter-spacing:0.3px;">' + titulo + '</div>'
      +       '<div style="font-size:0.83rem;color:' + corTxt + ';font-weight:600;margin-top:2px;">' + sub + '</div>'
      +     '</div>'
      +   '</div>'
      +   '<button type="button" onclick="window._mnEdIniciarRevisaoDoMarco(' + v.id + ', ' + r.marcoKm + ', ' + r.marcoMeses + ')" style="background:' + bordaEsq + ';color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:0.8rem;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;"><i class="ph ph-calendar-plus"></i> Agendar / Iniciar Revisão</button>'
      + '</div>';
};

window._mnEdIniciarRevisaoDoMarco = async function(vid, marcoKm, marcoMeses, dataIni, fornecedor) {
    var di = dataIni || (document.getElementById('mned-di') && document.getElementById('mned-di').value) || '';
    var forn = fornecedor || (document.getElementById('mned-forn') && document.getElementById('mned-forn').value.trim()) || '';
    window._mnEdFechar();
    window._mnRevVeicId = vid;
    if (typeof window.mnMudarSubAba === 'function') window.mnMudarSubAba('revisao');
    await window.mnRevisaoAbrirVeiculo(vid);
    if (typeof window.mnRevAbrirModalMarco === 'function') {
        window.mnRevAbrirModalMarco(Number(marcoKm), Number(marcoMeses) || 12);
        var inpDt = document.getElementById('mn-rev-f-data');
        if (inpDt && !inpDt.value && di) inpDt.value = di;
        var inpConc = document.getElementById('mn-rev-f-conc');
        if (inpConc && !inpConc.value && forn) inpConc.value = forn;
    }
};

window._mnEdPerguntarIniciarRevisao = function(vObj, r, corpo) {
    if (!vObj || !r) return;
    var old = document.getElementById('mned-rev-pop');
    if (old) old.remove();
    var esc = window._mnEdEsc;
    var ehVenc = r.status === 'vencida';
    var corHdr = ehVenc ? 'linear-gradient(135deg,#991b1b,#dc2626)' : 'linear-gradient(135deg,#b45309,#d97706)';
    var bgBox = ehVenc ? '#fef2f2' : '#fffbeb';
    var bordaBox = ehVenc ? '#fca5a5' : '#fde68a';
    var corBox = ehVenc ? '#7f1d1d' : '#78350f';
    var pop = document.createElement('div');
    pop.id = 'mned-rev-pop';
    pop.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.68);backdrop-filter:blur(3px);z-index:10060;display:flex;align-items:center;justify-content:center;padding:16px;';
    pop.innerHTML =
        '<div style="background:#fff;border-radius:16px;width:100%;max-width:520px;box-shadow:0 25px 60px rgba(0,0,0,0.35);overflow:hidden;">'
      +   '<div style="background:' + corHdr + ';color:#fff;padding:16px 20px;display:flex;align-items:center;gap:12px;">'
      +     '<i class="ph ' + (ehVenc ? 'ph-warning-octagon' : 'ph-warning') + '" style="font-size:1.6rem;"></i>'
      +     '<div>'
      +       '<div style="font-weight:800;font-size:1.02rem;">' + (ehVenc ? 'Revisão Vencida' : 'Revisão Próxima do Vencimento') + ' — ' + esc(vObj.placa || '') + '</div>'
      +       '<div style="font-size:0.8rem;opacity:0.9;">Manutenção corretiva salva com sucesso</div>'
      +     '</div>'
      +   '</div>'
      +   '<div style="padding:18px 20px;">'
      +     '<div style="background:' + bgBox + ';border:1.5px solid ' + bordaBox + ';border-radius:10px;padding:12px 14px;color:' + corBox + ';font-size:0.86rem;line-height:1.45;margin-bottom:14px;">'
      +       'O veículo <b>' + esc(vObj.placa || '') + '</b> está com a revisão <b>' + (ehVenc ? 'vencida' : 'próxima do vencimento') + '</b> no marco de <b>' + esc(r.marcoTxt) + '</b>' + (r.detalheTxt ? ' (' + esc(r.detalheTxt) + ')' : '') + '.'
      +     '</div>'
      +     '<div style="font-size:0.92rem;font-weight:700;color:#1e293b;line-height:1.45;">Gostaria de aproveitar e iniciar a revisão do marco de <span style="color:' + (ehVenc ? '#dc2626' : '#d97706') + ';">' + esc(r.marcoTxt) + '</span>?</div>'
      +   '</div>'
      +   '<div style="padding:14px 20px;border-top:1px solid #e2e8f0;background:#f8fafc;display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;">'
      +     '<button type="button" id="mned-rev-nao" style="padding:9px 18px;border:1.5px solid #cbd5e1;border-radius:8px;background:#fff;color:#475569;font-weight:700;cursor:pointer;">Agora não</button>'
      +     '<button type="button" id="mned-rev-sim" style="padding:9px 20px;border:none;border-radius:8px;background:' + (ehVenc ? '#dc2626' : '#d97706') + ';color:#fff;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:6px;"><i class="ph ph-calendar-check"></i> Sim, iniciar revisão</button>'
      +   '</div>'
      + '</div>';
    document.body.appendChild(pop);
    document.getElementById('mned-rev-nao').onclick = function() { pop.remove(); };
    document.getElementById('mned-rev-sim').onclick = function() {
        var btnSim = this;
        btnSim.disabled = true;
        btnSim.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Abrindo revisão...';
        window._mnEdIniciarRevisaoDoMarco(vObj.id, r.marcoKm, r.marcoMeses, corpo && corpo.data_inicio, corpo && corpo.fornecedor);
    };
};

window._mnEdMontar = function() {
    var ed = window._mnEd, m = ed.m, esc = window._mnEdEsc;
    window._mnEdFechar();
    var lbl = 'font-size:0.78rem;font-weight:700;color:#64748b;display:block;margin-bottom:4px;';
    var inp = 'width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;outline:none;box-sizing:border-box;font-family:inherit;background:#fff;';
    var sec = 'border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:16px;background:#fff;';
    var secT = 'font-size:0.82rem;font-weight:800;color:#1e293b;text-transform:uppercase;letter-spacing:.04em;display:flex;align-items:center;gap:6px;';
    var btnSec = 'padding:6px 12px;border:1.5px solid #cbd5e1;border-radius:8px;background:#fff;color:#475569;cursor:pointer;font-weight:600;font-size:0.78rem;display:inline-flex;align-items:center;gap:5px;';
    var frota = window._manutFrota || [];
    var veicOpts = '<option value="">Selecione o veículo...</option>' + frota.map(function(v) {
        return '<option value="' + v.id + '"' + (String(m.veiculo_id) === String(v.id) ? ' selected' : '') + '>' + esc(v.placa) + ' — ' + esc(String(v.marca_modelo_versao || '').substring(0, 40)) + '</option>';
    }).join('');
    var catOpts = '<option value="__todas__">★ Todas as categorias</option>' + window._mnMontarGruposCategorias(window._manutCategorias).map(function(g) {
        return '<optgroup label="' + esc(g.grupo) + '">'
            + '<option value="grupo:' + esc(g.grupo) + '">▸ Toda a categoria: ' + esc(g.grupo) + '</option>'
            + g.itens.map(function(it) {
                var valOpt = it.id ? it.id : ('sub:' + (it.rotulo || it.nome));
                return '<option value="' + esc(valOpt) + '">' + esc(it.rotulo || it.nome) + '</option>';
            }).join('')
            + '</optgroup>';
    }).join('');
    var ehConcl = ed.status === 'concluida';

    var modal = document.createElement('div');
    modal.id = 'mn-corr-edit-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:#f1f5f9;display:flex;flex-direction:column;z-index:9999;';
    modal.innerHTML =
        '<div style="background:linear-gradient(135deg,#1e293b,#334155);padding:14px 24px;display:flex;align-items:center;gap:12px;flex-shrink:0;">'
      +   '<div style="background:#d97706;border-radius:10px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;"><i class="ph ph-wrench" style="color:#fff;font-size:1.3rem;"></i></div>'
      +   '<div><div id="mned-titulo" style="color:#fff;font-weight:700;font-size:1.1rem;">' + (ed.novo ? 'Nova Manutenção Corretiva' : 'Editar Manutenção Corretiva') + '</div>'
      +   '<div id="mned-subtitulo" style="color:rgba(255,255,255,0.7);font-size:0.82rem;">' + esc(m.placa || (ed.novo ? 'Preencha os dados abaixo' : '')) + '</div></div>'
      +   '<button type="button" id="mned-x" title="Fechar" style="margin-left:auto;background:rgba(255,255,255,0.15);border:none;border-radius:50%;width:36px;height:36px;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.1rem;"><i class="ph ph-x"></i></button>'
      + '</div>'
      + '<div style="flex:1;overflow-y:auto;padding:18px 24px;">'
      +   '<div id="mned-rev-alerta" style="max-width:1900px;margin:0 auto;"></div>'
      +   '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(480px,1fr));gap:18px;align-items:start;max-width:1900px;margin:0 auto;">'
      +     '<div>'
      +       '<div style="' + sec + '">'
      +         '<div style="' + secT + 'margin-bottom:12px;"><i class="ph ph-truck" style="color:#d97706;"></i> Dados da manutenção</div>'
      +         '<div style="display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-bottom:12px;">'
      +           '<div><label style="' + lbl + '">Veículo *</label><select id="mned-veic" style="' + inp + '">' + veicOpts + '</select></div>'
      +           '<div><label style="' + lbl + '">KM antes da manutenção</label><input type="number" id="mned-km" placeholder="Ex: 45000" value="' + esc(m.km_na_manutencao || '') + '" style="' + inp + '"></div>'
      +         '</div>'
      +         '<div style="margin-bottom:12px;"><label style="' + lbl + '">Defeito / Problema *</label><textarea id="mned-desc" rows="2" placeholder="Descreva o defeito ou problema do veículo..." style="' + inp + 'resize:vertical;">' + esc(m.descricao || '') + '</textarea></div>'
      +         '<div style="margin-bottom:12px;"><label style="' + lbl + '">Status *</label><div id="mned-status" style="display:flex;gap:8px;flex-wrap:wrap;"></div></div>'
      +         '<div id="mned-grid-km" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;">'
      +           '<div><label style="' + lbl + '">Data da solicitação</label><input type="date" id="mned-dsol" value="' + esc(window._mnDataInput(m.created_at) || window._mnHojeISO()) + '" title="Data em que a manutenção foi solicitada (pode ser editada)" style="' + inp + '"></div>'
      +           '<div><label style="' + lbl + '">Data de início</label><input type="date" id="mned-di" value="' + esc(window._mnDataInput(m.data_inicio)) + '" style="' + inp + '"><input type="hidden" id="mned-df" value="' + esc(window._mnDataInput(m.data_fim)) + '"></div>'
      +           '<div id="mned-dc-box" style="display:block;"><label style="' + lbl + '">Data de conclusão</label><input type="date" id="mned-dc" value="' + esc(window._mnDataInput(m.data_conclusao)) + '" style="' + inp + '"></div>'
      +           '<div id="mned-km-final-box" style="display:' + (ehConcl ? 'block' : 'none') + ';"><label style="' + lbl + '">KM final da manutenção</label><input type="number" id="mned-km-final" placeholder="Ex: 45100" value="' + esc(m.km_final_manutencao || '') + '" style="' + inp + '"></div>'
      +           '<div style="grid-column:1/-1;"><label style="' + lbl + '">Fornecedor / Oficina</label><input type="text" id="mned-forn" placeholder="Ex: Oficina Central" value="' + esc(m.fornecedor || '') + '" style="' + inp + '"></div>'
      +           '<div style="grid-column:1/-1;margin-top:2px;">'
      +             '<label style="font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:6px;">O veículo está rodando? *</label>'
      +             '<div id="mned-rodando-box" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
      +               '<label id="mned-rod-lbl-sim" style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:1.5px solid #22c55e;border-radius:10px;font-size:0.86rem;cursor:pointer;background:#dcfce7;color:#15803d;font-weight:600;transition:all .15s;">'
      +                 '<input type="radio" name="mned_veiculo_rodando" value="sim" style="width:16px;height:16px;accent-color:#16a34a;">'
      +                 '<span>VEÍCULO RODANDO <small style="opacity:0.85;">(agendar)</small></span>'
      +               '</label>'
      +               '<label id="mned-rod-lbl-nao" style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:1.5px solid #ef4444;border-radius:10px;font-size:0.86rem;cursor:pointer;background:#fee2e2;color:#b91c1c;font-weight:600;transition:all .15s;">'
      +                 '<input type="radio" name="mned_veiculo_rodando" value="nao" style="width:16px;height:16px;accent-color:#dc2626;">'
      +                 '<span>VEÍCULO PARADO <small style="opacity:0.85;">(indisponível)</small></span>'
      +               '</label>'
      +             '</div>'
      +           '</div>'
      +           '<div style="grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px;">'
      +             '<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:10px 12px;display:flex;align-items:center;gap:10px;">'
      +               '<div style="background:#0284c718;color:#0284c7;width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="ph ph-timer" style="font-size:1.25rem;"></i></div>'
      +               '<div><div style="font-size:0.68rem;font-weight:800;color:#0369a1;text-transform:uppercase;letter-spacing:.04em;">Dias do pedido de manutenção</div>'
      +               '<div id="mned-cron-pedido-txt" style="font-size:0.95rem;font-weight:800;color:#0c4a6e;font-family:monospace;margin-top:2px;">0 dias · 00:00:00</div></div>'
      +             '</div>'
      +             '<div id="mned-cron-parado-card" style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:10px 12px;display:flex;align-items:center;gap:10px;">'
      +               '<div id="mned-cron-parado-ico" style="background:#dc262618;color:#dc2626;width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="ph ph-prohibit" style="font-size:1.25rem;"></i></div>'
      +               '<div><div style="font-size:0.68rem;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.04em;">Dias do veículo sem rodar <span id="mned-cron-parado-tag" style="font-weight:700;"></span></div>'
      +               '<div id="mned-cron-parado-txt" style="font-size:0.95rem;font-weight:800;color:#991b1b;font-family:monospace;margin-top:2px;">0 dias · 00:00:00</div></div>'
      +             '</div>'
      +           '</div>'
      +         '</div>'
      +       '</div>'
      +       '<div style="' + sec + '">'
      +         '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;"><div style="' + secT + '"><i class="ph ph-list-checks" style="color:#d97706;"></i> Manutenções solicitadas</div><button type="button" id="mned-alt-lista" style="margin-left:auto;' + btnSec + '"><i class="ph ph-pencil-simple"></i> Alterar lista</button></div>'
      +         '<div id="mned-solic" style="display:flex;flex-wrap:wrap;gap:6px;"></div>'
      +       '</div>'
      +       '<div style="' + sec + '">'
      +         '<div style="' + secT + 'margin-bottom:10px;"><i class="ph ph-chats-circle" style="color:#2563eb;"></i> Observações e histórico</div>'
      +         '<textarea id="mned-coment" rows="2" placeholder="Escreva um comentário (fica registrado com data, hora e usuário)..." style="' + inp + 'resize:vertical;"></textarea>'
      +         '<div style="display:flex;justify-content:flex-end;margin:6px 0 10px;"><button type="button" id="mned-coment-btn" style="padding:7px 14px;border:none;border-radius:8px;background:#2563eb;color:#fff;cursor:pointer;font-weight:700;font-size:0.8rem;display:inline-flex;align-items:center;gap:6px;"><i class="ph ph-paper-plane-tilt"></i> Adicionar comentário</button></div>'
      +         '<div id="mned-hist" style="max-height:420px;overflow-y:auto;"></div>'
      +       '</div>'
      +     '</div>'
      +     '<div>'
      +       '<div style="' + sec + '">'
      +         '<div style="' + secT + 'margin-bottom:10px;"><i class="ph ph-wrench" style="color:#d97706;"></i> Serviços realizados</div>'
      +         '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:12px;">'
      +           '<div style="display:grid;grid-template-columns:minmax(180px,1fr) 2fr;gap:10px;margin-bottom:8px;">'
      +             '<div><label style="' + lbl + '">Categoria</label><select id="mned-pick-cat" style="' + inp + '">' + catOpts + '</select></div>'
      +             '<div><label style="' + lbl + '">Buscar serviço (digite o nome)</label><input type="text" id="mned-pick-busca" autocomplete="off" placeholder="Digite para filtrar a lista..." style="' + inp + '"></div>'
      +           '</div>'
      +           '<div id="mned-pick-lista" style="background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:8px;max-height:300px;overflow-y:auto;"></div>'
      +           '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px;">'
      +             '<label style="display:flex;align-items:center;gap:6px;font-size:0.82rem;font-weight:700;color:#0284c7;cursor:pointer;"><input type="checkbox" id="mned-pick-all" style="width:16px;height:16px;accent-color:#0284c7;"> Selecionar todos (da lista mostrada)</label>'
      +             '<span id="mned-pick-cont" style="font-size:0.78rem;color:#64748b;"></span>'
      +             '<button type="button" id="mned-pick-novo" style="display:none;' + btnSec + 'color:#d97706;border-color:#fcd34d;"><i class="ph ph-plus"></i> <span></span></button>'
      +           '</div>'
      +         '</div>'
      +         '<div id="mned-serv"></div>'
      +       '</div>'
      +       '<div style="border:1.5px dashed #cbd5e1;border-radius:10px;padding:0.9rem;background:#fff;margin-bottom:16px;">'
      +         '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:4px;">'
      +           '<div style="font-size:0.78rem;font-weight:800;color:#1e293b;text-transform:uppercase;"><i class="ph ph-file-pdf" style="color:#dc2626;"></i> Anexar Nota Fiscal de Serviço, Nota de Peças ou Ordem de Serviço (PDF)</div>'
      +           '<button type="button" onclick="window._mnEdIniciarManual()" style="background:#fff;color:#0284c7;border:1px solid #7dd3fc;border-radius:7px;padding:4px 10px;font-size:0.75rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;"><i class="ph ph-plus"></i> Adicionar peça / serviço manual</button>'
      +         '</div>'
      +         '<div style="font-size:0.76rem;color:#64748b;margin-bottom:8px;">Ao selecionar o PDF, o sistema identifica automaticamente se é peça ou mão de obra (ou Ordem de Serviço), lê os itens e valores para você conferir e vincular aos serviços realizados. Se não tiver o PDF agora, use <b>+ Adicionar peça / serviço manual</b>.</div>'
      +         '<div><label style="font-size:0.72rem;font-weight:700;color:#475569;display:inline-flex;align-items:center;gap:6px;background:#0284c7;color:#fff;padding:7px 14px;border-radius:8px;cursor:pointer;"><i class="ph ph-upload-simple"></i> Anexar documento (PDF)<input type="file" id="mned-anx-file" accept="application/pdf" onchange="window._mnEdAoEscolherPdf(this)" style="display:none;"></label><input type="hidden" id="mned-anx-tipo" value="nota_servico"></div>'
      +         '<div id="mned-stage" style="margin-top:0.65rem;"></div>'
      +         '<div id="mned-notas" style="margin-top:0.65rem;display:flex;flex-direction:column;gap:6px;"></div>'
      +         '<div style="display:none;"><button type="button" id="mned-mo-add"></button><div id="mned-mo"></div></div>'
      +       '</div>'
      +       '<div id="mned-total" style="margin-bottom:16px;"></div>'
      +       '<div id="mned-sec-video" style="' + sec + '">'
      +         '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:10px;">'
      +           '<div style="' + secT + '"><i class="ph ph-video-camera" style="color:#7c3aed;"></i> Vídeo geral do veículo <span style="background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;padding:2px 8px;border-radius:999px;font-size:0.68rem;font-weight:800;text-transform:none;">Obrigatório para concluir</span></div>'
      +           '<label id="mned-lbl-video" style="display:inline-flex;align-items:center;gap:6px;background:#7c3aed;color:#fff;padding:7px 14px;border-radius:8px;font-size:0.8rem;font-weight:700;cursor:pointer;">'
      +             '<i class="ph ph-upload-simple"></i> Anexar vídeo geral do veículo'
      +             '<input type="file" id="mned-inp-video" accept="video/*" style="display:none;" onchange="window._mnEdAnexarVideoGeral(this)">'
      +           '</label>'
      +         '</div>'
      +         '<div style="font-size:0.78rem;color:#64748b;margin-bottom:8px;">Anexe um vídeo geral do veículo para poder mudar a situação da manutenção para <b>Concluído</b>.</div>'
      +         '<div id="mned-video-lista"></div>'
      +       '</div>'
      +     '</div>'
      +   '</div>'
      + '</div>'
      + '<div style="padding:12px 24px;border-top:1px solid #e2e8f0;display:flex;align-items:center;gap:10px;justify-content:flex-end;background:#fff;flex-shrink:0;">'
      +   (ed.id ? '<button type="button" onclick="window.mnCorrExcluirInterno(' + ed.id + ')" style="margin-right:auto;padding:10px 16px;border:1.5px solid #fecaca;border-radius:8px;background:#fef2f2;color:#dc2626;cursor:pointer;font-weight:700;display:inline-flex;align-items:center;gap:6px;"><i class="ph ph-trash"></i> Excluir manutenção</button>' : '')
      +   '<span id="mned-save-msg" style="display:none;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;font-size:0.85rem;font-weight:700;"></span>'
      +   '<button type="button" id="mned-cancel" style="padding:10px 20px;border:1.5px solid #e2e8f0;border-radius:8px;background:#fff;color:#64748b;cursor:pointer;font-weight:600;">Cancelar</button>'
      +   '<button type="button" id="mned-save" style="padding:10px 26px;border:none;border-radius:8px;background:#2563eb;color:#fff;cursor:pointer;font-weight:700;display:flex;align-items:center;gap:6px;"><i class="ph ph-floppy-disk"></i> Salvar</button>'
      + '</div>';
    document.body.appendChild(modal);

    document.getElementById('mned-x').onclick = window._mnEdFechar;
    document.getElementById('mned-cancel').onclick = window._mnEdFechar;
    document.getElementById('mned-alt-lista').onclick = window._mnEdAbrirLista;
    document.getElementById('mned-save').onclick = function() { window.mnCorrSalvarEdicaoInterno(); };
    document.getElementById('mned-coment-btn').onclick = window._mnEdComentar;
    document.getElementById('mned-pick-cat').onchange = window._mnEdPickRender;
    document.getElementById('mned-pick-busca').oninput = window._mnEdPickRender;
    document.getElementById('mned-pick-novo').onclick = window._mnEdPickNovo;
    document.getElementById('mned-pick-all').onchange = function() {
        window._mnEdPickToggleVarios((window._mnEd.pickVisiveis || []), this.checked);
    };
    document.getElementById('mned-veic').onchange = function() {
        var kmEl = document.getElementById('mned-km');
        var v = (window._manutFrota || []).find(function(x) { return String(x.id) === String(this.value); }.bind(this));
        if (window._mnEd.novo && v && v.km_atual && kmEl && !kmEl.value) kmEl.value = v.km_atual;
        if (typeof window._mnEdRenderAlertaRevisao === 'function') window._mnEdRenderAlertaRevisao();
    };
    var syncDatasRodando = function() {
        var ed = window._mnEd;
        if (!ed || !ed.m) return;
        var diEl = document.getElementById('mned-di'), dfEl = document.getElementById('mned-df');
        var di = diEl ? diEl.value : '', df = dfEl ? dfEl.value : '';
        ed.m.data_inicio = di;
        ed.m.data_fim = df;
        var hoje = window._mnHojeISO();
        if (ed.status !== 'concluida' && ed.status !== 'cancelada' && ed.status !== 'em_andamento') {
            if (di && df) {
                if (hoje < di) ed.veiculo_rodando = 'sim';
                else if (hoje >= di && hoje <= df) ed.veiculo_rodando = 'nao';
                else if (hoje > df) ed.veiculo_rodando = 'sim';
                window._mnEdRenderRodando();
            }
        }
        window._mnEdAtualizarCronModal();
    };
    document.getElementById('mned-di').onchange = syncDatasRodando;
    document.getElementById('mned-df').onchange = syncDatasRodando;
    document.getElementById('mned-dc').onchange = function() { window._mnEd.m.data_conclusao = this.value; window._mnEdRenderServ(); window._mnEdAtualizarCronModal(); };
    document.getElementById('mned-dsol').onchange = function() {
        if (window._mnEd && window._mnEd.m) {
            var origHora = String(window._mnEd.m.created_at || '').substring(10) || ' 00:00:00';
            window._mnEd.m.created_at = this.value ? (this.value + origHora) : window._mnEd.m.created_at;
        }
        window._mnEdAtualizarCronModal();
    };
    if (ed.novo && m.veiculo_id) document.getElementById('mned-veic').onchange.call(document.getElementById('mned-veic'));

    document.querySelectorAll('input[name="mned_veiculo_rodando"]').forEach(function(r) {
        r.onchange = function() {
            if (window._mnEd.status === 'em_andamento' && this.value === 'sim') {
                alert('Enquanto o status estiver "Em manutenção", o veículo permanece como "VEÍCULO PARADO".');
                window._mnEdRenderRodando();
                return;
            }
            window._mnEd.veiculo_rodando = this.value;
            if (this.value === 'nao' && !window._mnEd.m.parado_desde) {
                window._mnEd.m.parado_desde = new Date().toISOString();
            }
            window._mnEdRenderRodando();
            window._mnEdAtualizarCronModal();
        };
    });

    window._mnEdRenderStatus();
    window._mnEdRenderRodando();
    window._mnEdAtualizarCronModal();
    window._mnEdRenderSolic();
    window._mnEdPickRender();
    window._mnEdRenderServ();
    window._mnEdRenderNotas();
    window._mnEdRenderMo();
    window._mnEdRenderHist();
    if (typeof window._mnEdRenderVideoGeral === 'function') window._mnEdRenderVideoGeral();
    if (typeof window._mnEdRenderAlertaRevisao === 'function') window._mnEdRenderAlertaRevisao();
    if (window._mnIniciarCronometros) window._mnIniciarCronometros();
};

window._mnEdRenderRodando = function() {
    var ed = window._mnEd;
    if (!ed) return;
    if (ed.status === 'em_andamento') ed.veiculo_rodando = 'nao';
    var ehSim = ed.veiculo_rodando === 'sim';
    var ehNao = ed.veiculo_rodando === 'nao';
    var rSim = document.querySelector('input[name="mned_veiculo_rodando"][value="sim"]');
    var rNao = document.querySelector('input[name="mned_veiculo_rodando"][value="nao"]');
    var lSim = document.getElementById('mned-rod-lbl-sim');
    var lNao = document.getElementById('mned-rod-lbl-nao');
    if (rSim) rSim.checked = ehSim;
    if (rNao) rNao.checked = ehNao;
    if (lSim) {
        lSim.style.background = ehSim ? '#bbf7d0' : '#dcfce7';
        lSim.style.borderColor = ehSim ? '#15803d' : '#22c55e';
        lSim.style.borderWidth = ehSim ? '2.5px' : '1.5px';
        lSim.style.color = ehSim ? '#14532d' : '#15803d';
        lSim.style.fontWeight = ehSim ? '800' : '600';
        lSim.style.boxShadow = ehSim ? '0 0 0 3px rgba(22,163,74,0.22)' : 'none';
    }
    if (lNao) {
        lNao.style.background = ehNao ? '#fecaca' : '#fee2e2';
        lNao.style.borderColor = ehNao ? '#b91c1c' : '#ef4444';
        lNao.style.borderWidth = ehNao ? '2.5px' : '1.5px';
        lNao.style.color = ehNao ? '#7f1d1d' : '#b91c1c';
        lNao.style.fontWeight = ehNao ? '800' : '600';
        lNao.style.boxShadow = ehNao ? '0 0 0 3px rgba(220,38,38,0.22)' : 'none';
    }
};

window._mnEdAtualizarCronModal = function() {
    var ed = window._mnEd;
    if (!ed || !ed.m) return;
    var tp = window._mnCalcTempos(ed.m, ed.status, ed.veiculo_rodando || 'sim');
    var elPed = document.getElementById('mned-cron-pedido-txt');
    var elPar = document.getElementById('mned-cron-parado-txt');
    var elTag = document.getElementById('mned-cron-parado-tag');
    var elCard = document.getElementById('mned-cron-parado-card');
    var elIco = document.getElementById('mned-cron-parado-ico');
    if (elPed) elPed.textContent = tp.pedido.completo;
    if (elPar) {
        elPar.textContent = tp.parado.completo;
        elPar.style.color = tp.parado.ativo ? '#991b1b' : '#065f46';
    }
    if (elTag) {
        elTag.textContent = tp.parado.ativo ? '(parado · contando)' : '(rodando)';
        elTag.style.color = tp.parado.ativo ? '#dc2626' : '#059669';
    }
    if (elCard) {
        elCard.style.background = tp.parado.ativo ? '#fef2f2' : '#f0fdf4';
        elCard.style.borderColor = tp.parado.ativo ? '#fecaca' : '#bbf7d0';
    }
    if (elIco) {
        elIco.style.background = tp.parado.ativo ? '#dc262618' : '#16a34a18';
        elIco.style.color = tp.parado.ativo ? '#dc2626' : '#16a34a';
        elIco.innerHTML = tp.parado.ativo ? '<i class="ph ph-prohibit" style="font-size:1.25rem;"></i>' : '<i class="ph ph-check-circle" style="font-size:1.25rem;"></i>';
    }
};

window._mnEdPedirJustificativaStatus = function(statusDe, statusPara, cb) {
    var esc = window._mnEdEsc;
    var rot = function(v) {
        var x = (window._MN_STATUS || []).find(function(s) { return s.v === v; });
        if (x) return x;
        if (v === 'cancelada') return { v: 'cancelada', l: 'Cancelada', c: '#94a3b8' };
        return { v: v, l: v || '—', c: '#64748b' };
    };
    var rDe = rot(statusDe), rPara = rot(statusPara);
    var old = document.getElementById('mned-just-pop'); if (old) old.remove();
    var avisoParado = '';
    var veicIdAt = (window._mnEd && (document.getElementById('mned-veic') ? document.getElementById('mned-veic').value : (window._mnEd.m && window._mnEd.m.veiculo_id))) || '';
    var idAt = (window._mnEd && window._mnEd.id) || 0;
    var outrasMesmaPlaca = (window._mnCorrDados || []).filter(function(x) {
        return veicIdAt && String(x.veiculo_id) === String(veicIdAt) && String(x.id) !== String(idAt) && x.status !== 'concluida' && x.status !== 'cancelada';
    });
    if (statusPara === 'em_andamento' && (!window._mnEd || window._mnEd.veiculo_rodando !== 'nao')) {
        avisoParado = '<div style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:8px;padding:8px 12px;font-size:0.8rem;margin-bottom:12px;display:flex;align-items:center;gap:8px;"><i class="ph ph-warning-circle" style="font-size:1.1rem;flex-shrink:0;"></i><span>Ao mudar para <b>Em manutenção</b>, o veículo (e as demais solicitações em aberto desta placa) ficará como <b>VEÍCULO PARADO</b>.</span></div>';
    } else if (statusPara === 'concluida') {
        if (outrasMesmaPlaca.some(function(x) { return x.veiculo_rodando_efetivo === 'nao' || x.veiculo_rodando === 'nao'; })) {
            avisoParado = '<div style="background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:8px;padding:8px 12px;font-size:0.8rem;margin-bottom:12px;display:flex;align-items:center;gap:8px;"><i class="ph ph-warning" style="font-size:1.1rem;flex-shrink:0;"></i><span>Esta solicitação será concluída, mas o veículo <b>continuará constando como parado</b> enquanto houver outra solicitação em aberto desta placa marcada como "VEÍCULO PARADO".</span></div>';
        } else if (!window._mnEd || window._mnEd.veiculo_rodando === 'nao') {
            avisoParado = '<div style="background:#f0fdf4;border:1px solid #bbf7d0;color:#14532d;border-radius:8px;padding:8px 12px;font-size:0.8rem;margin-bottom:12px;display:flex;align-items:center;gap:8px;"><i class="ph ph-check-circle" style="font-size:1.1rem;flex-shrink:0;"></i><span>Ao mudar para <b>Concluído</b>, esta solicitação passará para <b>VEÍCULO RODANDO</b>.</span></div>';
        }
    }
    var pop = document.createElement('div');
    pop.id = 'mned-just-pop';
    pop.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.65);display:flex;align-items:center;justify-content:center;z-index:10030;padding:16px;';
    pop.innerHTML = '<div style="background:#fff;border-radius:16px;width:100%;max-width:480px;box-shadow:0 25px 60px rgba(0,0,0,0.35);overflow:hidden;">'
      + '<div style="background:linear-gradient(135deg,#1e293b,#334155);padding:14px 20px;display:flex;align-items:center;gap:10px;">'
      +   '<div style="background:#d97706;border-radius:9px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;"><i class="ph ph-chat-centered-text" style="color:#fff;font-size:1.2rem;"></i></div>'
      +   '<div style="color:#fff;font-weight:700;font-size:0.95rem;">Justificativa de mudança de status</div>'
      +   '<button type="button" id="mned-just-x" style="margin-left:auto;background:rgba(255,255,255,0.15);border:none;border-radius:50%;width:28px;height:28px;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;"><i class="ph ph-x"></i></button>'
      + '</div>'
      + '<div style="padding:18px 20px;">'
      +   '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px;font-size:0.84rem;color:#475569;">'
      +     '<span>Alterando de</span>'
      +     '<span style="background:' + rDe.c + '22;color:' + rDe.c + ';padding:2px 10px;border-radius:999px;font-weight:700;">' + esc(rDe.l) + '</span>'
      +     '<i class="ph ph-arrow-right"></i>'
      +     '<span style="background:' + rPara.c + '22;color:' + rPara.c + ';padding:2px 10px;border-radius:999px;font-weight:700;">' + esc(rPara.l) + '</span>'
      +   '</div>'
      +   avisoParado
      +   '<label style="font-size:0.78rem;font-weight:700;color:#334155;display:block;margin-bottom:6px;">Justificativa / Motivo *</label>'
      +   '<textarea id="mned-just-txt" rows="3" placeholder="Informe o motivo da mudança de status (ficará registrado no histórico e comentários)..." style="width:100%;padding:10px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:0.88rem;font-family:inherit;resize:vertical;box-sizing:border-box;outline:none;"></textarea>'
      +   '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">'
      +     '<button type="button" id="mned-just-cancel" style="padding:9px 18px;border:1.5px solid #e2e8f0;border-radius:8px;background:#fff;color:#64748b;cursor:pointer;font-weight:600;">Cancelar</button>'
      +     '<button type="button" id="mned-just-ok" style="padding:9px 20px;border:none;border-radius:8px;background:#2563eb;color:#fff;cursor:pointer;font-weight:700;display:flex;align-items:center;gap:6px;"><i class="ph ph-check"></i> Confirmar</button>'
      +   '</div>'
      + '</div></div>';
    document.body.appendChild(pop);
    var fechar = function() { var el = document.getElementById('mned-just-pop'); if (el) el.remove(); };
    document.getElementById('mned-just-x').onclick = fechar;
    document.getElementById('mned-just-cancel').onclick = fechar;
    pop.addEventListener('mousedown', function(e) { if (e.target === pop) fechar(); });
    var ta = document.getElementById('mned-just-txt');
    setTimeout(function() { if (ta) ta.focus(); }, 50);
    document.getElementById('mned-just-ok').onclick = function() {
        var txt = ta ? ta.value.trim() : '';
        if (!txt) { alert('Informe a justificativa para alterar o status.'); if (ta) ta.focus(); return; }
        fechar();
        if (cb) cb(txt);
    };
};

window._mnTratarOutrasAbertasPosStatus = function(novoStatus, respJson, placaFallback) {
    if (!respJson || !Array.isArray(respJson.outras_abertas) || !respJson.outras_abertas.length) return;
    var outras = respJson.outras_abertas;
    var placa = (outras[0] && outras[0].placa) || placaFallback || '';
    if (novoStatus === 'concluida') {
        window._mnMostrarPopupConcluirOutras(placa, outras);
    } else if (novoStatus === 'em_andamento') {
        window._mnMostrarPopupRevisarOutras(placa, outras);
    }
};

window._mnMostrarPopupConcluirOutras = function(placa, outras) {
    var esc = window._mnEdEsc || function(s) { return String(s == null ? '' : s); };
    var old = document.getElementById('mn-pop-concluir-outras'); if (old) old.remove();
    var statusLbl = { agendada: 'Novo', em_andamento: 'Em Manutenção', aguardando: 'Aguardando', concluida: 'Concluído', cancelada: 'Cancelada' };
    var statusCor = { agendada: '#d97706', em_andamento: '#dc2626', aguardando: '#2563eb', concluida: '#10b981', cancelada: '#94a3b8' };
    var pop = document.createElement('div');
    pop.id = 'mn-pop-concluir-outras';
    pop.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.68);display:flex;align-items:center;justify-content:center;z-index:10050;padding:16px;';
    var listaHtml = outras.map(function(o, idx) {
        var sCor = statusCor[o.status] || '#64748b';
        var sTxt = statusLbl[o.status] || o.status || '—';
        var rodNao = (o.veiculo_rodando === 'nao' || o.status === 'em_andamento');
        var rodBadge = rodNao
            ? '<span style="background:#fee2e2;color:#b91c1c;border:1px solid #fecaca;padding:2px 8px;border-radius:999px;font-size:0.72rem;font-weight:700;">VEÍCULO PARADO</span>'
            : '<span style="background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;padding:2px 8px;border-radius:999px;font-size:0.72rem;font-weight:700;">VEÍCULO RODANDO</span>';
        return '<label style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:10px;background:#f8fafc;margin-bottom:8px;cursor:pointer;">'
            + (outras.length > 1 ? '<input type="radio" name="mn_concl_outra_sel" value="' + o.id + '"' + (idx === 0 ? ' checked' : '') + ' style="margin-top:4px;accent-color:#10b981;">' : '')
            + '<div style="flex:1;min-width:0;">'
            +   '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px;">'
            +     '<span style="font-size:0.76rem;font-weight:800;color:#334155;">#' + o.id + '</span>'
            +     '<span style="background:' + sCor + '22;color:' + sCor + ';padding:2px 8px;border-radius:999px;font-size:0.72rem;font-weight:700;">' + esc(sTxt) + '</span>'
            +     rodBadge
            +   '</div>'
            +   '<div style="font-size:0.84rem;color:#1e293b;font-weight:600;word-break:break-word;">' + esc(o.descricao || 'Sem descrição') + '</div>'
            + '</div>'
            + '</label>';
    }).join('');
    pop.innerHTML = '<div style="background:#fff;border-radius:16px;width:100%;max-width:520px;box-shadow:0 25px 60px rgba(0,0,0,0.35);overflow:hidden;">'
      + '<div style="background:linear-gradient(135deg,#065f46,#10b981);padding:14px 20px;display:flex;align-items:center;gap:10px;">'
      +   '<div style="background:rgba(255,255,255,0.2);border-radius:9px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;"><i class="ph ph-question" style="color:#fff;font-size:1.3rem;"></i></div>'
      +   '<div style="color:#fff;font-weight:700;font-size:0.98rem;">Encerrar outra solicitação da placa ' + esc(placa) + '?</div>'
      +   '<button type="button" id="mn-pop-concl-x" style="margin-left:auto;background:rgba(255,255,255,0.18);border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;"><i class="ph ph-x"></i></button>'
      + '</div>'
      + '<div style="padding:18px 20px;">'
      +   '<p style="margin:0 0 12px;font-size:0.9rem;color:#334155;line-height:1.45;">'
      +     (outras.length === 1
                ? 'Existe <b>outra solicitação de manutenção em aberto</b> para o veículo <b>' + esc(placa) + '</b>. Gostaria de encerrar/atualizar essa outra solicitação de manutenção também?'
                : 'Existem <b>' + outras.length + ' outras solicitações de manutenção em aberto</b> para o veículo <b>' + esc(placa) + '</b>. Gostaria de encerrar/atualizar outra solicitação de manutenção também?')
      +   '</p>'
      +   '<div style="background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:8px;padding:8px 12px;font-size:0.78rem;margin-bottom:12px;display:flex;align-items:center;gap:8px;">'
      +     '<i class="ph ph-info" style="font-size:1.1rem;flex-shrink:0;"></i>'
      +     '<span>O veículo só volta a ser considerado rodando quando todas as solicitações em aberto desta placa forem alteradas manualmente para <b>VEÍCULO RODANDO</b> ou <b>Concluído</b>.</span>'
      +   '</div>'
      +   '<div style="max-height:220px;overflow-y:auto;margin-bottom:14px;">' + listaHtml + '</div>'
      +   '<div style="display:flex;gap:10px;justify-content:flex-end;">'
      +     '<button type="button" id="mn-pop-concl-nao" style="padding:9px 18px;border:1.5px solid #cbd5e1;border-radius:8px;background:#fff;color:#475569;cursor:pointer;font-weight:700;">Não</button>'
      +     '<button type="button" id="mn-pop-concl-sim" style="padding:9px 20px;border:none;border-radius:8px;background:#10b981;color:#fff;cursor:pointer;font-weight:700;display:flex;align-items:center;gap:6px;"><i class="ph ph-arrow-square-out"></i> Sim, abrir solicitação</button>'
      +   '</div>'
      + '</div></div>';
    document.body.appendChild(pop);
    var fechar = function() { var el = document.getElementById('mn-pop-concluir-outras'); if (el) el.remove(); };
    document.getElementById('mn-pop-concl-x').onclick = fechar;
    document.getElementById('mn-pop-concl-nao').onclick = fechar;
    document.getElementById('mn-pop-concl-sim').onclick = function() {
        var selEl = pop.querySelector('input[name="mn_concl_outra_sel"]:checked');
        var idAlvo = selEl ? selEl.value : (outras[0] && outras[0].id);
        fechar();
        if (idAlvo) window.mnCorrEditarInterno(idAlvo);
    };
};

window._mnMostrarPopupRevisarOutras = function(placa, outras) {
    var esc = window._mnEdEsc || function(s) { return String(s == null ? '' : s); };
    var old = document.getElementById('mn-pop-revisar-outras'); if (old) old.remove();
    var pop = document.createElement('div');
    pop.id = 'mn-pop-revisar-outras';
    pop.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.68);display:flex;align-items:center;justify-content:center;z-index:10050;padding:16px;';
    pop.innerHTML = '<div style="background:#fff;border-radius:16px;width:100%;max-width:500px;box-shadow:0 25px 60px rgba(0,0,0,0.35);overflow:hidden;">'
      + '<div style="background:linear-gradient(135deg,#1e293b,#334155);padding:14px 20px;display:flex;align-items:center;gap:10px;">'
      +   '<div style="background:#d97706;border-radius:9px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;"><i class="ph ph-wrench" style="color:#fff;font-size:1.25rem;"></i></div>'
      +   '<div style="color:#fff;font-weight:700;font-size:0.98rem;">Revisar outras solicitações — Placa ' + esc(placa) + '</div>'
      +   '<button type="button" id="mn-pop-rev-x" style="margin-left:auto;background:rgba(255,255,255,0.18);border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;"><i class="ph ph-x"></i></button>'
      + '</div>'
      + '<div style="padding:20px;">'
      +   '<p style="margin:0 0 16px;font-size:0.92rem;color:#334155;line-height:1.5;">'
      +     'Gostaria de <b>revisar as outras solicitações de manutenção (' + outras.length + ')</b> do veículo <b>' + esc(placa) + '</b> para tentar aproveitar que esse veículo está parado para fazer junto?'
      +   '</p>'
      +   '<div style="display:flex;gap:10px;justify-content:flex-end;">'
      +     '<button type="button" id="mn-pop-rev-nao" style="padding:9px 18px;border:1.5px solid #cbd5e1;border-radius:8px;background:#fff;color:#475569;cursor:pointer;font-weight:700;">Não</button>'
      +     '<button type="button" id="mn-pop-rev-sim" style="padding:9px 20px;border:none;border-radius:8px;background:#2563eb;color:#fff;cursor:pointer;font-weight:700;display:flex;align-items:center;gap:6px;"><i class="ph ph-list-magnifying-glass"></i> Sim, ver solicitações</button>'
      +   '</div>'
      + '</div></div>';
    document.body.appendChild(pop);
    var fechar = function() { var el = document.getElementById('mn-pop-revisar-outras'); if (el) el.remove(); };
    document.getElementById('mn-pop-rev-x').onclick = fechar;
    document.getElementById('mn-pop-rev-nao').onclick = fechar;
    document.getElementById('mn-pop-rev-sim').onclick = function() {
        fechar();
        window._mnMostrarModalListaOutrasAbertas(placa, outras);
    };
};

window._mnMostrarModalListaOutrasAbertas = function(placa, outras) {
    var esc = window._mnEdEsc || function(s) { return String(s == null ? '' : s); };
    var old = document.getElementById('mn-modal-lista-outras'); if (old) old.remove();
    var statusLbl = { agendada: 'Novo', em_andamento: 'Em Manutenção', aguardando: 'Aguardando', concluida: 'Concluído', cancelada: 'Cancelada' };
    var statusCor = { agendada: '#d97706', em_andamento: '#dc2626', aguardando: '#2563eb', concluida: '#10b981', cancelada: '#94a3b8' };
    var fmtData = function(d) {
        if (!d) return '—';
        var p = String(d).split('T')[0].split(' ')[0].split('-');
        return p.length === 3 ? (p[2] + '/' + p[1] + '/' + p[0]) : d;
    };
    var cardsHtml = outras.map(function(o) {
        var sCor = statusCor[o.status] || '#64748b';
        var sTxt = statusLbl[o.status] || o.status || '—';
        var rodNao = (o.veiculo_rodando === 'nao' || o.status === 'em_andamento');
        var rodBadge = rodNao
            ? '<span style="background:#fee2e2;color:#b91c1c;border:1px solid #fecaca;padding:3px 10px;border-radius:999px;font-size:0.75rem;font-weight:700;">VEÍCULO PARADO</span>'
            : '<span style="background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;padding:3px 10px;border-radius:999px;font-size:0.75rem;font-weight:700;">VEÍCULO RODANDO</span>';
        var solicArr = (Array.isArray(o.solicitados) && o.solicitados.length)
            ? o.solicitados
            : (o.itens_solicitados ? String(o.itens_solicitados).split(',').map(function(x) { return x.trim(); }).filter(Boolean) : []);
        var solicHtml = solicArr.length
            ? solicArr.map(function(it) { return '<span style="background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:999px;padding:3px 10px;font-size:0.75rem;font-weight:600;">' + esc(it) + '</span>'; }).join(' ')
            : '<span style="color:#94a3b8;font-size:0.8rem;">Nenhum item específico listado</span>';
        var realArr = Array.isArray(o.realizados) ? o.realizados : [];
        var realHtml = realArr.length
            ? realArr.map(function(it) { return '<span style="background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;border-radius:999px;padding:3px 10px;font-size:0.75rem;font-weight:600;">' + esc(it) + '</span>'; }).join(' ')
            : '<span style="color:#94a3b8;font-size:0.8rem;">Nenhum serviço registrado ainda</span>';
        var comArr = Array.isArray(o.comentarios) ? o.comentarios : [];
        var comHtml = '';
        if (o.observacoes) {
            comHtml += '<div style="font-size:0.82rem;color:#334155;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:6px 10px;margin-bottom:6px;"><b>Observações:</b> ' + esc(o.observacoes) + '</div>';
        }
        if (comArr.length) {
            comHtml += comArr.map(function(c) {
                return '<div style="font-size:0.8rem;color:#475569;background:#f8fafc;border-left:3px solid #2563eb;padding:5px 10px;margin-bottom:4px;border-radius:0 6px 6px 0;">'
                    + '<span style="font-weight:700;color:#1e293b;">' + esc(c.usuario_nome || 'Usuário') + ':</span> ' + esc(c.texto || '')
                    + '</div>';
            }).join('');
        }
        if (!comHtml) comHtml = '<span style="color:#94a3b8;font-size:0.8rem;">Sem observações ou comentários</span>';

        return '<div style="border:1.5px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:14px;background:#fff;box-shadow:0 2px 8px rgba(15,23,42,0.04);">'
            + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #f1f5f9;">'
            +   '<span style="font-size:0.88rem;font-weight:800;color:#0f172a;">Solicitação #' + o.id + '</span>'
            +   '<span style="background:' + sCor + '22;color:' + sCor + ';padding:3px 10px;border-radius:999px;font-size:0.75rem;font-weight:700;">' + esc(sTxt) + '</span>'
            +   rodBadge
            +   '<span style="font-size:0.76rem;color:#64748b;margin-left:4px;">Aberta em: <b>' + esc(fmtData(o.created_at)) + '</b></span>'
            +   '<button type="button" data-abrir-outra="' + o.id + '" style="margin-left:auto;padding:6px 12px;border:none;border-radius:8px;background:#2563eb;color:#fff;cursor:pointer;font-weight:700;font-size:0.78rem;display:inline-flex;align-items:center;gap:5px;"><i class="ph ph-pencil-simple"></i> Abrir esta solicitação</button>'
            + '</div>'
            + '<div style="margin-bottom:10px;">'
            +   '<div style="font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:3px;">Defeito / Problema relatado</div>'
            +   '<div style="font-size:0.9rem;font-weight:700;color:#1e293b;background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:8px 12px;">' + esc(o.descricao || '—') + '</div>'
            + '</div>'
            + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:10px;background:#f8fafc;border-radius:8px;padding:8px 12px;">'
            +   '<div><div style="font-size:0.7rem;color:#64748b;font-weight:700;">Data da solicitação</div><div style="font-size:0.82rem;font-weight:700;color:#1e293b;">' + esc(fmtData(o.created_at)) + '</div></div>'
            +   '<div><div style="font-size:0.7rem;color:#64748b;font-weight:700;">Data de início</div><div style="font-size:0.82rem;font-weight:700;color:#1e293b;">' + esc(fmtData(o.data_inicio)) + '</div></div>'
            +   '<div><div style="font-size:0.7rem;color:#64748b;font-weight:700;">Data de conclusão</div><div style="font-size:0.82rem;font-weight:700;color:#1e293b;">' + esc(fmtData(o.data_conclusao)) + '</div></div>'
            +   '<div><div style="font-size:0.7rem;color:#64748b;font-weight:700;">Fornecedor / Oficina</div><div style="font-size:0.82rem;font-weight:700;color:#1e293b;">' + esc(o.fornecedor || '—') + '</div></div>'
            +   '<div><div style="font-size:0.7rem;color:#64748b;font-weight:700;">KM na manutenção</div><div style="font-size:0.82rem;font-weight:700;color:#1e293b;">' + esc(o.km_na_manutencao || '—') + '</div></div>'
            + '</div>'
            + '<div style="margin-bottom:10px;">'
            +   '<div style="font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:4px;">Manutenções solicitadas</div>'
            +   '<div style="display:flex;flex-wrap:wrap;gap:6px;">' + solicHtml + '</div>'
            + '</div>'
            + '<div style="margin-bottom:10px;">'
            +   '<div style="font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:4px;">Serviços realizados</div>'
            +   '<div style="display:flex;flex-wrap:wrap;gap:6px;">' + realHtml + '</div>'
            + '</div>'
            + '<div>'
            +   '<div style="font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:4px;">Observações e comentários</div>'
            +   comHtml
            + '</div>'
            + '</div>';
    }).join('');

    var pop = document.createElement('div');
    pop.id = 'mn-modal-lista-outras';
    pop.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.72);display:flex;align-items:center;justify-content:center;z-index:10055;padding:16px;';
    pop.innerHTML = '<div style="background:#f8fafc;border-radius:16px;width:100%;max-width:780px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 25px 60px rgba(0,0,0,0.4);overflow:hidden;">'
      + '<div style="background:linear-gradient(135deg,#1e293b,#334155);padding:15px 22px;display:flex;align-items:center;gap:10px;flex-shrink:0;">'
      +   '<div style="background:#2563eb;border-radius:9px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;"><i class="ph ph-clipboard-text" style="color:#fff;font-size:1.3rem;"></i></div>'
      +   '<div><div style="color:#fff;font-weight:700;font-size:1rem;">Outras Solicitações de Manutenção — Placa ' + esc(placa) + '</div>'
      +   '<div style="color:rgba(255,255,255,0.75);font-size:0.78rem;">Consulte abaixo os detalhes de todas as solicitações em aberto deste veículo (' + outras.length + ')</div></div>'
      +   '<button type="button" id="mn-modal-lista-outras-x" style="margin-left:auto;background:rgba(255,255,255,0.18);border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;"><i class="ph ph-x"></i></button>'
      + '</div>'
      + '<div style="padding:18px 22px;overflow-y:auto;flex:1;">' + cardsHtml + '</div>'
      + '<div style="padding:12px 22px;background:#fff;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;flex-shrink:0;">'
      +   '<button type="button" id="mn-modal-lista-outras-fechar" style="padding:9px 22px;border:1.5px solid #cbd5e1;border-radius:8px;background:#fff;color:#334155;cursor:pointer;font-weight:700;">Fechar</button>'
      + '</div></div>';
    document.body.appendChild(pop);
    var fechar = function() { var el = document.getElementById('mn-modal-lista-outras'); if (el) el.remove(); };
    document.getElementById('mn-modal-lista-outras-x').onclick = fechar;
    document.getElementById('mn-modal-lista-outras-fechar').onclick = fechar;
    pop.querySelectorAll('[data-abrir-outra]').forEach(function(btn) {
        btn.onclick = function() {
            var oid = btn.getAttribute('data-abrir-outra');
            fechar();
            if (oid) window.mnCorrEditarInterno(oid);
        };
    });
};

window._mnEdRenderStatus = function() {
    var ed = window._mnEd, box = document.getElementById('mned-status');
    if (!box) return;
    var lista = window._MN_STATUS.slice();
    if (ed.m.status === 'cancelada' || ed.status === 'cancelada') lista.push({ v: 'cancelada', l: 'Cancelada', c: '#94a3b8' });
    box.innerHTML = lista.map(function(s) {
        var ativo = ed.status === s.v;
        var css = 'padding:8px 18px;border-radius:999px;font-size:0.84rem;font-weight:700;cursor:pointer;transition:all .15s;border:2px solid ' + s.c + ';'
            + (ativo ? 'background:' + s.c + ';color:#fff;box-shadow:0 2px 8px ' + s.c + '66;' : 'background:' + s.c + '18;color:' + s.c + ';');
        return '<button type="button" data-s="' + s.v + '" style="' + css + '">' + (ativo ? '<i class="ph ph-check"></i> ' : '') + s.l + '</button>';
    }).join('');
    var ehConcl = ed.status === 'concluida';
    var dcBox = document.getElementById('mned-dc-box'), kfBox = document.getElementById('mned-km-final-box');
    if (dcBox) dcBox.style.display = 'block';
    if (kfBox) kfBox.style.display = ehConcl ? 'block' : 'none';
    box.querySelectorAll('[data-s]').forEach(function(b) {
        b.onclick = function() {
            var novo = b.getAttribute('data-s');
            if (novo === window._mnEd.status) return;
            if (novo === 'concluida') {
                var temVideo = ((window._mnEd && window._mnEd.midias) || []).some(function(m) { return m.categoria === 'video_geral'; });
                if (!temVideo) {
                    var secVid = document.getElementById('mned-sec-video');
                    if (secVid) {
                        secVid.style.borderColor = '#dc2626';
                        secVid.style.background = '#fef2f2';
                        if (secVid.scrollIntoView) secVid.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    alert('Para mudar a situação da manutenção corretiva para Concluído, é obrigatório anexar o vídeo geral do veículo.');
                    return;
                }
                if (!window._mnEdValidarServicosConclusao()) return;
            }
            var statusAnterior = window._mnEd.status;
            window._mnEdPedirJustificativaStatus(statusAnterior, novo, async function(justTxt) {
                window._mnEd.status = novo;
                window._mnEd.justificativa_status = justTxt;
                var di = document.getElementById('mned-di'), dc = document.getElementById('mned-dc');
                if (novo === 'em_andamento' && di && !di.value) { di.value = window._mnHojeISO(); window._mnEd.m.data_inicio = di.value; }
                if (novo === 'concluida' && dc && !dc.value) { dc.value = window._mnHojeISO(); }
                if (dc) window._mnEd.m.data_conclusao = dc.value;
                if (novo === 'em_andamento') {
                    window._mnEd.veiculo_rodando = 'nao';
                    window._mnEd.m.veiculo_rodando = 'nao';
                    if (!window._mnEd.m.parado_desde) window._mnEd.m.parado_desde = new Date().toISOString();
                } else if (novo === 'concluida' && window._mnEd.veiculo_rodando === 'nao') {
                    window._mnEd.veiculo_rodando = 'sim';
                    window._mnEd.m.veiculo_rodando = 'sim';
                }
                window._mnEdRenderStatus();
                window._mnEdRenderRodando();
                window._mnEdAtualizarCronModal();
                window._mnEdRenderServ();
                if (window._mnEd.id) {
                    try {
                        if (novo === 'concluida') await window._mnEdSalvarDetalhe();
                        var hdr = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + window._mnEdTok() };
                        var rs = await fetch('/api/frota/manutencoes/' + window._mnEd.id + '/status', {
                            method: 'PUT',
                            headers: hdr,
                            body: JSON.stringify({
                                status: novo,
                                veiculo_rodando: window._mnEd.veiculo_rodando,
                                justificativa_status: justTxt,
                                data_inicio: di ? (di.value || null) : null,
                                data_fim: document.getElementById('mned-df') ? (document.getElementById('mned-df').value || null) : null,
                                data_conclusao: dc ? (dc.value || null) : undefined
                            })
                        });
                        var rsJson = await rs.json().catch(function() { return {}; });
                        if (rs.ok) {
                            window._mnEd.justificativa_status = '';
                            window._mnEd._jaPerguntouStatus = novo;
                            await window._mnEdRecarregarDetalhe();
                            window._mnEdRenderStatus();
                            window._mnEdRenderRodando();
                            window._mnEdRenderHist();
                            window._mnEdAtualizarCronModal();
                            window.mnCarregarCorretivas();
                            try {
                                var frotaAt = await fetch('/api/frota/veiculos?_=' + Date.now(), { headers: { Authorization: 'Bearer ' + window._mnEdTok() } }).then(function(x) { return x.json(); });
                                if (Array.isArray(frotaAt)) { window._manutFrota = frotaAt; window._frotaDados = frotaAt; }
                            } catch (eF) {}
                            window._mnTratarOutrasAbertasPosStatus(novo, rsJson, window._mnEd.m ? window._mnEd.m.placa : '');
                        } else {
                            window._mnEd.status = statusAnterior;
                            window._mnEdRenderStatus();
                            alert(rsJson.error || 'Erro ao alterar status da manutenção.');
                        }
                    } catch (e) { console.warn('[Status] erro ao salvar imediato:', e); }
                }
            });
        };
    });
};

// Garantia obrigatoria (pode ser 0) em toda peca e em toda mao de obra informada; valores de servicos/pecas continuam opcionais
window._mnEdGarantiasFaltando = function() {
    var ed = window._mnEd;
    if (!ed) return [];
    var vazio = function(v) { return v === undefined || v === null || String(v).trim() === ''; };
    var faltas = [];
    if ((ed.mo || []).length > 0) {
        (ed.mo || []).forEach(function(l) {
            if (vazio(l.garantia_valor)) faltas.push('Mão de obra — ' + (l.descricao || 'Serviço'));
        });
    } else {
        (ed.realizados || []).forEach(function(s) {
            var temMo = (s.mao_obra_informado === 1 || s.mao_obra_informado === '1' || s.mao_obra_informado === true) || window._mnNum(s.mao_obra) > 0;
            if (temMo && vazio(s.garantia_valor)) faltas.push('Mão de obra — ' + s.nome);
        });
    }
    (ed.pecas || []).forEach(function(p) {
        if (vazio(p.garantia_valor)) faltas.push('Peça — ' + (p.descricao || ''));
    });
    return faltas;
};

window._mnEdValidarServicosConclusao = function() {
    var faltas = window._mnEdGarantiasFaltando();
    if (faltas.length) {
        alert('Informe a garantia de toda mão de obra e de toda peça (preencha 0 se não houver garantia).\n\nSem garantia preenchida (' + faltas.length + '):\n- ' + faltas.join('\n- '));
        return false;
    }
    return true;
};

window._mnEdRenderSolic = function() {
    var ed = window._mnEd, box = document.getElementById('mned-solic'), esc = window._mnEdEsc;
    if (!box) return;
    if (!ed.solicitados.length) {
        box.innerHTML = '<span style="font-size:0.82rem;color:#94a3b8;">Nenhum item solicitado. Use "Alterar lista".</span>';
        return;
    }
    box.innerHTML = ed.solicitados.map(function(n) {
        var base = String(n || '').indexOf('Outros:') === 0 ? 'Outros' : n;
        var ico = window._mnCatMeta ? window._mnCatMeta(base).icone : 'ph-wrench';
        return '<span style="background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:999px;padding:4px 12px;font-size:0.78rem;font-weight:600;display:inline-flex;align-items:center;gap:5px;"><i class="ph ' + esc(ico) + '" style="color:#d97706;"></i>' + esc(n) + '</span>';
    }).join('');
};

// Hierarquia unica (4 categorias -> 39 subcategorias -> 353 servicos) com os mesmos icones na Frota e no Sinistro
window._MN_GRUPOS_PADRAO = [
    {
        grupo: 'FUNILARIA, LATARIA E ESTÉTICA',
        icone: 'ph-paint-brush',
        itens: [
            { nome: 'Funilaria (amassados)', icone: 'ph-hammer' },
            { nome: 'Adesivo', icone: 'ph-tag' },
            { nome: 'Pintura', icone: 'ph-paint-brush' },
            { nome: 'Para-choque dianteiro', icone: 'ph-shield' },
            { nome: 'Para-choque traseiro', icone: 'ph-shield-check' },
            { nome: 'Capô', icone: 'ph-arrow-up-right' },
            { nome: 'Porta', icone: 'ph-door' },
            { nome: 'Paralama', icone: 'ph-arrows-horizontal' },
            { nome: 'Tampa traseira', icone: 'ph-arrow-down-left' },
            { nome: 'Retrovisor', icone: 'ph-eye' },
            { nome: 'Faróis', icone: 'ph-flashlight' },
            { nome: 'Lanternas', icone: 'ph-lamp' },
            { nome: 'Setas', icone: 'ph-arrows-left-right' },
            { nome: 'Para-brisa', icone: 'ph-square-half' },
            { nome: 'Vidros', icone: 'ph-frame-corners' }
        ]
    },
    {
        grupo: 'MECÂNICA',
        icone: 'ph-wrench',
        itens: [
            { nome: 'Suspensão', icone: 'ph-activity' },
            { nome: 'Direção', icone: 'ph-compass' },
            { nome: 'Alinhamento', icone: 'ph-ruler' },
            { nome: 'Balanceamento', icone: 'ph-scales' },
            { nome: 'Pneus', icone: 'ph-circle-notch' },
            { nome: 'Rodas', icone: 'ph-disc' },
            { nome: 'Freios', icone: 'ph-hand-palm' },
            { nome: 'Radiador', icone: 'ph-thermometer-hot' },
            { nome: 'Arrefecimento', icone: 'ph-snowflake' },
            { nome: 'Motor', icone: 'ph-gear-six' },
            { nome: 'Câmbio', icone: 'ph-sliders' },
            { nome: 'Transmissão', icone: 'ph-shuffle' },
            { nome: 'Sistema elétrico', icone: 'ph-lightning' },
            { nome: 'Bateria', icone: 'ph-battery-charging' }
        ]
    },
    {
        grupo: 'OPERACIONAL',
        icone: 'ph-gear-six',
        itens: [
            { nome: 'Tanque', icone: 'ph-gas-can' },
            { nome: 'Bomba de sucção', icone: 'ph-fan' },
            { nome: 'Motor de sucção', icone: 'ph-power' },
            { nome: 'Mangotes', icone: 'ph-link' },
            { nome: 'Válvulas', icone: 'ph-funnel' },
            { nome: 'Sistema hidráulico', icone: 'ph-drop' },
            { nome: 'Estrutura', icone: 'ph-grid-four' },
            { nome: 'Chassi', icone: 'ph-truck' },
            { nome: 'Câmeras e Rastreadores', icone: 'ph-video-camera' }
        ]
    },
    {
        grupo: 'OUTROS',
        icone: 'ph-dots-three-circle',
        itens: [
            { nome: 'Revisão geral pós-sinistro', icone: 'ph-clipboard-text' },
            { nome: 'Outros', icone: 'ph-dots-three-circle' }
        ]
    }
];

window._mnNorm = function(t) {
    return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
};

window._mnCatMeta = function(catObjOuNome) {
    var mapa = {};
    var ord = 0;
    window._MN_GRUPOS_PADRAO.forEach(function(g) {
        g.itens.forEach(function(it) {
            ord++;
            mapa[window._mnNorm(it.nome)] = { nome: it.nome, icone: it.icone, grupo: g.grupo, grupoIcone: g.icone, ordem: ord };
        });
    });
    var nome = typeof catObjOuNome === 'object' && catObjOuNome ? (catObjOuNome.nome || catObjOuNome.categoria_nome || '') : String(catObjOuNome || '');
    if (nome === 'Outros serviços') nome = 'Outros';
    var pad = mapa[window._mnNorm(nome)] || {};
    var iconeRaw = (typeof catObjOuNome === 'object' && catObjOuNome) ? (catObjOuNome.icone || catObjOuNome.categoria_icone) : null;
    var gRaw = (typeof catObjOuNome === 'object' && catObjOuNome) ? (catObjOuNome.grupo || catObjOuNome.grupo_nome) : null;
    var gIcoRaw = (typeof catObjOuNome === 'object' && catObjOuNome) ? (catObjOuNome.grupo_icone) : null;
    return {
        nome: pad.nome || nome || 'Outros',
        icone: iconeRaw ? ('ph-' + String(iconeRaw).replace(/^ph-/, '')) : (pad.icone || 'ph-wrench'),
        grupo: gRaw || pad.grupo || 'OUTROS',
        grupoIcone: gIcoRaw ? ('ph-' + String(gIcoRaw).replace(/^ph-/, '')) : (pad.grupoIcone || 'ph-dots-three-circle'),
        ordem: pad.ordem || 999
    };
};

window._mnMontarGruposCategorias = function(cats) {
    var lista = Array.isArray(cats) && cats.length ? cats : [];
    if (!lista.length) return window._MN_GRUPOS_PADRAO;
    var grupos = {}, ordem = [], vistos = {};
    lista.forEach(function(c) {
        var meta = window._mnCatMeta(c);
        if (!grupos[meta.grupo]) {
            grupos[meta.grupo] = { grupo: meta.grupo, icone: meta.grupoIcone, itens: [] };
            ordem.push(grupos[meta.grupo]);
        }
        grupos[meta.grupo].itens.push({ id: c.id, nome: meta.nome, rotulo: meta.nome, icone: meta.icone, ordem: c.ordem || meta.ordem });
        vistos[window._mnNorm(meta.nome)] = 1;
    });
    window._MN_GRUPOS_PADRAO.forEach(function(g) {
        g.itens.forEach(function(it) {
            if (!vistos[window._mnNorm(it.nome)]) {
                if (!grupos[g.grupo]) {
                    grupos[g.grupo] = { grupo: g.grupo, icone: g.icone, itens: [] };
                    ordem.push(grupos[g.grupo]);
                }
                var meta = window._mnCatMeta(it.nome);
                grupos[g.grupo].itens.push({ id: null, nome: it.nome, rotulo: it.nome, icone: it.icone, ordem: meta.ordem });
                vistos[window._mnNorm(it.nome)] = 1;
            }
        });
    });
    return ordem.length ? ordem : window._MN_GRUPOS_PADRAO;
};

window._mnCatalogoLista = function() {
    var catPorId = {};
    var catCamId = 'sub:Câmeras e Rastreadores';
    (window._manutCategorias || []).forEach(function(c, i) {
        catPorId[c.id] = { c: c, idx: i };
        if (window._mnNorm(c.nome) === window._mnNorm('Câmeras e Rastreadores')) catCamId = c.id;
    });
    var rawCat = (window._manutCatalogo || []).slice();
    ['Troca de câmera', 'Manutenção de câmera'].forEach(function(nm, idx) {
        var jaTem = rawCat.some(function(s) { return window._mnNorm(s.nome) === window._mnNorm(nm) || window._mnNorm(s.nome) === window._mnNorm(idx === 0 ? 'Câmera - troca' : 'Câmera - manutenção'); });
        if (!jaTem) {
            rawCat.push({ id: 'cam_' + (idx + 1), categoria_id: catCamId, nome: nm, categoria_nome: 'Câmeras e Rastreadores', icone: 'video-camera', grupo: 'OPERACIONAL', grupo_icone: 'gear-six', item_ref: 'Câmeras e Rastreadores', ordem: idx + 1 });
        }
    });
    var vistos = {};
    return rawCat.filter(function(s) {
        var k = s.categoria_id + '|' + window._mnNorm(s.nome);
        if (vistos[k]) return false;
        vistos[k] = 1;
        return true;
    }).map(function(s) {
        var infoCat = catPorId[s.categoria_id] ? catPorId[s.categoria_id].c : s;
        var meta = window._mnCatMeta(infoCat);
        s._subNome = meta.nome;
        s._subIcone = meta.icone;
        s._grupoNome = meta.grupo;
        s._grupoIcone = meta.grupoIcone;
        s._catOrdem = catPorId[s.categoria_id] !== undefined ? catPorId[s.categoria_id].idx : meta.ordem;
        return s;
    }).sort(function(a, b) {
        if (a._catOrdem !== b._catOrdem) return a._catOrdem - b._catOrdem;
        var sa = a.ordem || 999, sb = b.ordem || 999;
        if (sa !== sb) return sa - sb;
        return String(a.nome).localeCompare(String(b.nome), 'pt-BR');
    });
};

// ---- Selecao de servicos (Anexo 4: Categoria + Subcategoria com icones + busca + selecionar todos + marcar varios)
window._mnEdPickRender = function() {
    var ed = window._mnEd, box = document.getElementById('mned-pick-lista');
    if (!box) return;
    var esc = window._mnEdEsc, norm = window._mnNorm;
    var catSel = document.getElementById('mned-pick-cat').value;
    var buscaEl = document.getElementById('mned-pick-busca');
    var palavras = norm(buscaEl.value).split(' ').filter(Boolean);
    var jaAdd = {};
    ed.realizados.forEach(function(r) { if (r.catalogo_id) jaAdd[r.catalogo_id] = true; });
    var lista = window._mnCatalogoLista('corretiva').filter(function(s) {
        if (catSel && catSel !== '__todas__') {
            if (catSel.indexOf('grupo:') === 0) {
                if (s._grupoNome !== catSel.substring(6)) return false;
            } else if (catSel.indexOf('sub:') === 0) {
                if (norm(s._subNome) !== norm(catSel.substring(4))) return false;
            } else if (String(s.categoria_id) !== String(catSel)) {
                return false;
            }
        }
        var n = norm(s.nome + ' ' + (s._subNome || '') + ' ' + (s._grupoNome || ''));
        return palavras.every(function(p) { return n.indexOf(p) !== -1; });
    });
    ed.pickVisiveis = lista.map(function(s) { return s.id; });

    var btnNovo = document.getElementById('mned-pick-novo');
    var texto = buscaEl.value.trim();
    var exato = texto && lista.some(function(s) { return norm(s.nome) === norm(texto); });
    if (btnNovo) {
        btnNovo.style.display = (texto && !exato) ? 'inline-flex' : 'none';
        btnNovo.querySelector('span').textContent = 'Adicionar "' + texto + '" como serviço novo';
    }
    if (!lista.length) {
        box.innerHTML = '<div style="padding:16px;text-align:center;color:#94a3b8;font-size:0.84rem;">Nenhum serviço encontrado' + (texto ? ' para "' + esc(texto) + '"' : '') + '. Você pode adicioná-lo como serviço novo.</div>';
    } else {
        ed._gruposAbertos = ed._gruposAbertos || {};
        var forcarAberto = palavras.length > 0 || (catSel && catSel !== '__todas__');
        var html = '', ordemGrupos = [], porGrupo = {}, porCat = {};
        lista.forEach(function(s) {
            if (!porGrupo[s._grupoNome]) {
                porGrupo[s._grupoNome] = [];
                ordemGrupos.push(s._grupoNome);
            }
            porGrupo[s._grupoNome].push(s);
            (porCat[s.categoria_id] = porCat[s.categoria_id] || []).push(s);
        });
        ordemGrupos.forEach(function(grp) {
            var doGrupo = porGrupo[grp] || [];
            if (!doGrupo.length) return;
            var s0 = doGrupo[0];
            var todosGrp = doGrupo.every(function(x) { return jaAdd[x.id]; });
            var aberto = forcarAberto || !!ed._gruposAbertos[grp];
            html += '<div data-pktoggle-grp="' + esc(grp) + '" style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:0.76rem;font-weight:800;color:#1e293b;text-transform:uppercase;letter-spacing:.05em;margin-top:8px;padding:8px 10px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;user-select:none;">'
                + '<span style="display:inline-flex;align-items:center;gap:8px;">'
                +   '<i class="ph-bold ' + (aberto ? 'ph-caret-down' : 'ph-caret-right') + '" style="font-size:0.88rem;color:#475569;"></i>'
                +   '<i class="ph ' + esc(s0._grupoIcone) + '" style="font-size:1.05rem;color:#d97706;"></i>'
                +   '<span>' + esc(grp) + '</span>'
                + '</span>'
                + '<label onclick="event.stopPropagation()" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-weight:600;text-transform:none;color:#64748b;font-size:0.74rem;">'
                +   '<input type="checkbox" data-pkmacro="' + esc(grp) + '"' + (todosGrp ? ' checked' : '') + ' style="width:15px;height:15px;accent-color:#d97706;cursor:pointer;">'
                +   '<span>(selecionar todos da categoria)</span>'
                + '</label>'
                + '</div>'
                + '<div data-pkgrp-body="' + esc(grp) + '" style="display:' + (aberto ? 'block' : 'none') + ';padding-bottom:4px;">';
            var ultimoCat = null;
            doGrupo.forEach(function(s) {
                if (s.categoria_id !== ultimoCat) {
                    ultimoCat = s.categoria_id;
                    var doCat = (porCat[s.categoria_id] || []);
                    var todosMarc = doCat.length > 0 && doCat.every(function(x) { return jaAdd[x.id]; });
                    html += '<label style="display:flex;align-items:center;gap:8px;font-size:0.73rem;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.04em;margin-top:6px;padding:5px 4px 4px 14px;border-top:1px solid #e2e8f0;cursor:pointer;">'
                        + '<input type="checkbox" data-pkcat="' + s.categoria_id + '"' + (todosMarc ? ' checked' : '') + (doCat.length ? '' : ' disabled') + ' style="width:15px;height:15px;accent-color:#0284c7;">'
                        + '<i class="ph ' + esc(s._subIcone) + '" style="font-size:1rem;color:#d97706;"></i>'
                        + '<span>' + esc(s._subNome || s.categoria_nome || 'Outros') + '</span> <span style="font-weight:600;text-transform:none;color:#94a3b8;">(selecionar todos da subcategoria)</span></label>';
                }
                var add = !!jaAdd[s.id];
                html += '<label style="display:flex;align-items:center;gap:8px;font-size:0.86rem;color:#1e293b;cursor:pointer;padding:3px 4px 3px 32px;' + (add ? 'font-weight:700;' : '') + '">'
                    + '<input type="checkbox" data-pk="' + s.id + '"' + (add ? ' checked' : '') + ' style="width:15px;height:15px;accent-color:#0284c7;">'
                    + esc(s.nome) + '</label>';
            });
            html += '</div>';
        });
        box.innerHTML = html;
        box.querySelectorAll('[data-pktoggle-grp]').forEach(function(hdr) {
            hdr.onclick = function() {
                var grp = hdr.getAttribute('data-pktoggle-grp');
                ed._gruposAbertos = ed._gruposAbertos || {};
                ed._gruposAbertos[grp] = !ed._gruposAbertos[grp];
                window._mnEdPickRender();
            };
        });
        box.querySelectorAll('[data-pk]').forEach(function(c) {
            c.onchange = function() {
                window._mnEdPickToggleVarios([c.getAttribute('data-pk')], c.checked);
            };
        });
        box.querySelectorAll('[data-pkcat]').forEach(function(c) {
            c.onchange = function() {
                var cid = c.getAttribute('data-pkcat');
                window._mnEdPickToggleVarios((porCat[cid] || []).map(function(x) { return x.id; }), c.checked);
            };
        });
        box.querySelectorAll('[data-pkmacro]').forEach(function(c) {
            c.onchange = function() {
                var grp = c.getAttribute('data-pkmacro');
                window._mnEdPickToggleVarios((porGrupo[grp] || []).map(function(x) { return x.id; }), c.checked);
            };
        });
    }
    var cont = document.getElementById('mned-pick-cont');
    if (cont) cont.textContent = ed.realizados.length + ' serviço(s) na lista · ' + lista.length + ' na busca';
    var all = document.getElementById('mned-pick-all');
    if (all) all.checked = ed.pickVisiveis.length > 0 && ed.pickVisiveis.every(function(id) { return jaAdd[id]; });
};

// Marcar o checkbox adiciona o servico na lista automaticamente; desmarcar remove da lista
window._mnEdPickToggleVarios = function(ids, marcar) {
    var ed = window._mnEd;
    var catalogo = window._manutCatalogo || [];
    var lista = window._mnCatalogoLista('corretiva');
    (ids || []).forEach(function(k) {
        var s = lista.find(function(x) { return String(x.id) === String(k); }) || catalogo.find(function(x) { return String(x.id) === String(k); });
        if (!s) return;
        var idx = -1;
        ed.realizados.forEach(function(r, i) { if (idx < 0 && String(r.catalogo_id) === String(s.id)) idx = i; });
        if (marcar && idx < 0) {
            window._mnSvcSeq = (window._mnSvcSeq || 0) + 1;
            ed.realizados.push({ id: null, _tmpId: 'tmp_' + window._mnSvcSeq + '_' + Date.now(), nome: s.nome, catalogo_id: s.id, item_ref: s.item_ref || s.categoria_nome || null, mao_obra: '', garantia_valor: '', garantia_unidade: 'dias', observacao: '', mo_alocado: 0 });
        } else if (!marcar && idx >= 0) {
            var rem = ed.realizados[idx];
            var remKey = rem.id || rem._tmpId;
            if (remKey) ed.pecas.forEach(function(p) { if (String(p.servico_id) === String(remKey)) p.servico_id = null; });
            if (rem.id) (ed.mo || []).forEach(function(l) { l.servicos = (l.servicos || []).filter(function(x) { return String(x) !== String(rem.id); }); });
            ed.realizados.splice(idx, 1);
        }
    });
    if (typeof window._mnEdPodarVinculos === 'function') window._mnEdPodarVinculos();
    window._mnEdRenderServ();
    window._mnEdPickRender();
};

window._mnEdPickAdicionar = function() {
    var ed = window._mnEd;
    var ids = Object.keys(ed.pickSel).filter(function(k) { return ed.pickSel[k]; });
    if (!ids.length) { alert('Marque ao menos um serviço da lista.'); return; }
    var catalogo = window._manutCatalogo || [];
    ids.forEach(function(k) {
        var s = catalogo.find(function(x) { return String(x.id) === String(k); });
        if (!s) return;
        if (ed.realizados.some(function(r) { return String(r.catalogo_id) === String(s.id); })) return;
        window._mnSvcSeq = (window._mnSvcSeq || 0) + 1;
        ed.realizados.push({ id: null, _tmpId: 'tmp_' + window._mnSvcSeq + '_' + Date.now(), nome: s.nome, catalogo_id: s.id, item_ref: s.item_ref || s.categoria_nome || null, mao_obra: '', garantia_valor: '', garantia_unidade: 'dias', observacao: '', mo_alocado: 0 });
    });
    ed.pickSel = {};
    window._mnEdRenderServ();
    window._mnEdPickRender();
};

window._mnEdPickNovo = function() {
    var ed = window._mnEd;
    var buscaEl = document.getElementById('mned-pick-busca');
    var txt = buscaEl.value.trim();
    if (!txt) return;
    if (ed.realizados.some(function(r) { return window._mnNorm(r.nome) === window._mnNorm(txt); })) { alert('Esse serviço já foi adicionado.'); return; }
    window._mnSvcSeq = (window._mnSvcSeq || 0) + 1;
    ed.realizados.push({ id: null, _tmpId: 'tmp_' + window._mnSvcSeq + '_' + Date.now(), nome: txt, catalogo_id: null, item_ref: null, mao_obra: '', garantia_valor: '', garantia_unidade: 'dias', observacao: '', mo_alocado: 0 });
    buscaEl.value = '';
    window._mnEdRenderServ();
    window._mnEdPickRender();
};

// ---- Historico (comentarios + mudancas de situacao + eventos)
window._mnEdRenderHist = function() {
    var ed = window._mnEd, box = document.getElementById('mned-hist'), esc = window._mnEdEsc;
    if (!box) return;
    var rotulo = function(v) {
        var x = window._MN_STATUS.filter(function(s) { return s.v === v; })[0];
        if (x) return { l: x.l, c: x.c };
        if (v === 'cancelada') return { l: 'Cancelada', c: '#94a3b8' };
        return { l: v || '—', c: '#64748b' };
    };
    var badge = function(o) { return '<span style="background:' + o.c + '22;color:' + o.c + ';border-radius:999px;padding:1px 10px;font-weight:700;font-size:0.76rem;">' + esc(o.l) + '</span>'; };
    if (!ed.historico.length) {
        box.innerHTML = '<div style="font-size:0.82rem;color:#94a3b8;padding:6px 2px;">Nenhum comentário ou alteração registrada ainda.</div>';
        return;
    }
    box.innerHTML = ed.historico.map(function(h) {
        var quando = window._mnFmtDH(h.created_at);
        var quem = h.usuario_nome ? esc(h.usuario_nome) : 'Sistema';
        var cab = '<div style="font-size:0.72rem;color:#64748b;margin-bottom:3px;"><i class="ph ph-clock"></i> ' + esc(quando) + ' · <i class="ph ph-user"></i> <b>' + quem + '</b></div>';
        var cor = '#cbd5e1', corpo = '';
        var rotRod = function(v) {
            return v === 'nao'
                ? { l: 'VEÍCULO PARADO', c: '#dc2626' }
                : { l: 'VEÍCULO RODANDO', c: '#16a34a' };
        };
        if (h.tipo === 'status') {
            cor = '#d97706';
            corpo = '<div style="font-size:0.84rem;color:#334155;"><i class="ph ph-arrows-left-right"></i> Situação alterada: ' + badge(rotulo(h.status_de)) + ' → ' + badge(rotulo(h.status_para)) + '</div>'
                + (h.texto ? '<div style="margin-top:5px;padding:6px 10px;background:#fff;border:1px solid #fde68a;border-radius:6px;font-size:0.84rem;color:#1e293b;white-space:pre-wrap;word-break:break-word;"><i class="ph ph-chat-text" style="color:#d97706;"></i> <b>Justificativa:</b> ' + esc(h.texto) + '</div>' : '');
        } else if (h.tipo === 'rodando') {
            cor = '#7c3aed';
            corpo = '<div style="font-size:0.84rem;color:#334155;"><i class="ph ph-truck"></i> O veículo está rodando? alterado: ' + badge(rotRod(h.status_de)) + ' → ' + badge(rotRod(h.status_para)) + '</div>'
                + (h.texto ? '<div style="margin-top:3px;font-size:0.78rem;color:#64748b;">' + esc(h.texto) + '</div>' : '');
        } else if (h.tipo === 'comentario') {
            cor = '#2563eb';
            corpo = '<div style="font-size:0.86rem;color:#1e293b;white-space:pre-wrap;word-break:break-word;">' + esc(h.texto) + '</div>';
        } else {
            corpo = '<div style="font-size:0.82rem;color:#475569;">' + esc(h.texto) + '</div>';
        }
        return '<div style="border-left:3px solid ' + cor + ';padding:7px 12px;background:#f8fafc;border-radius:0 8px 8px 0;margin-bottom:6px;">' + cab + corpo + '</div>';
    }).join('');
};

window._mnEdComentar = async function() {
    var ed = window._mnEd;
    var ta = document.getElementById('mned-coment');
    var btn = document.getElementById('mned-coment-btn');
    var txt = ta.value.trim();
    if (!txt) { alert('Escreva o comentário.'); return; }
    btn.disabled = true;
    try {
        await window._mnEdGarantirId();
        var r = await fetch('/api/frota/manutencoes/' + ed.id + '/comentarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + window._mnEdTok() },
            body: JSON.stringify({ texto: txt })
        });
        if (!r.ok) { var e = await r.json().catch(function() { return {}; }); throw new Error(e.error || 'Erro ao salvar o comentário'); }
        var j = await r.json();
        ed.historico = j.historico || [];
        ta.value = '';
        window._mnEdRenderHist();
    } catch (err) { alert(err.message); }
    btn.disabled = false;
};

window._mnEdSvcOptions = function(sel) {
    var ed = window._mnEd, esc = window._mnEdEsc;
    var h = '<option value="">Sem vínculo (geral)</option>';
    ed.realizados.forEach(function(s, idx) {
        if (!s.id && !s._tmpId) {
            window._mnSvcSeq = (window._mnSvcSeq || 0) + 1;
            s._tmpId = 'tmp_' + window._mnSvcSeq + '_' + idx;
        }
        var val = s.id || s._tmpId;
        h += '<option value="' + esc(val) + '"' + (String(val) === String(sel) ? ' selected' : '') + '>' + esc(s.nome) + '</option>';
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
      +   '<input type="number" min="0" step="1" data-pi="' + i + '" data-pf="garantia_valor" value="' + esc(p.garantia_valor) + '" placeholder="Gar. *" title="Garantia da peça (obrigatório — informe 0 se não houver)" style="' + ipt + 'width:62px;' + ((p.garantia_valor === undefined || p.garantia_valor === null || p.garantia_valor === '') ? 'border-color:#fca5a5;' : '') + '">'
      +   '<select data-pi="' + i + '" data-pf="garantia_unidade" style="' + ipt + 'background:#fff;"><option value="dias"' + (p.garantia_unidade !== 'meses' ? ' selected' : '') + '>dias</option><option value="meses"' + (p.garantia_unidade === 'meses' ? ' selected' : '') + '>meses</option></select>'
      +   '<select data-pi="' + i + '" data-pf="servico_id" title="Serviço ao qual a peça pertence" style="' + ipt + 'background:#fff;max-width:170px;">' + window._mnEdSvcOptions(p.servico_id) + '</select>'
      +   '<button type="button" data-pedit="' + i + '" title="Editar peça / mudar vinculação ou rateio entre serviços" style="padding:4px 8px;border:1px solid #bfdbfe;border-radius:6px;background:#eff6ff;color:#2563eb;cursor:pointer;"><i class="ph ph-pencil-simple"></i></button>'
      +   '<button type="button" data-prm="' + i + '" title="Remover peça" style="padding:4px 8px;border:1px solid #fecaca;border-radius:6px;background:#fef2f2;color:#dc2626;cursor:pointer;"><i class="ph ph-trash"></i></button>'
      + '</div>'
      + (g ? '<div style="margin-top:4px;font-size:0.72rem;font-weight:600;color:' + g.cor + ';"><i class="ph ph-shield-check"></i> Peça: ' + g.txt + '</div>' : '')
      + '</div>';
};

window._mnEdGetSvcKey = function(s, idx) {
    if (!s.id && !s._tmpId) {
        window._mnSvcSeq = (window._mnSvcSeq || 0) + 1;
        s._tmpId = 'tmp_' + window._mnSvcSeq + '_' + (idx || 0);
    }
    return String(s.id || s._tmpId);
};

window._mnEdRenderServ = function() {
    var ed = window._mnEd, box = document.getElementById('mned-serv'), esc = window._mnEdEsc;
    if (!box) return;
    window._mnGarantirDatalist();
    if (!ed.realizados.length) {
        box.innerHTML = '<div style="padding:14px;text-align:center;color:#94a3b8;font-size:0.82rem;">Nenhum serviço realizado ainda. Marque os serviços na lista acima e eles serão adicionados automaticamente.</div>';
        window._mnEdRenderTotais();
        return;
    }
    var ipt = 'padding:6px 8px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;outline:none;box-sizing:border-box;font-family:inherit;';
    var html = ed.realizados.map(function(s, i) {
        window._mnEdGetSvcKey(s, i);
        var catRef = s.item_ref;
        if (!catRef && s.catalogo_id && window._manutCatalogo) {
            var cObj = window._manutCatalogo.find(function(x) { return String(x.id) === String(s.catalogo_id); });
            if (cObj) catRef = cObj.categoria_nome || cObj.item_ref || '';
        }
        var subMeta = catRef && window._mnCatMeta ? window._mnCatMeta(catRef) : null;
        return '<div style="border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;margin-bottom:8px;background:#f8fafc;">'
          + '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">'
          +   '<div style="flex:1;min-width:220px;"><div style="font-weight:700;color:#1e293b;font-size:0.87rem;">' + esc(s.nome) + '</div>'
          +   (subMeta ? '<div style="font-size:0.75rem;color:#64748b;display:flex;align-items:center;gap:5px;margin-top:2px;"><i class="ph ' + esc(subMeta.icone) + '" style="color:#d97706;font-size:0.92rem;"></i><span>' + esc(subMeta.nome) + '</span></div>' : '')
          +   '</div>'
          +   '<div style="display:flex;align-items:center;gap:8px;flex:1;min-width:240px;justify-content:flex-end;">'
          +     '<input type="text" data-i="' + i + '" data-f="observacao" value="' + esc(s.observacao || '') + '" placeholder="Observação do serviço..." style="' + ipt + 'flex:1;max-width:340px;background:#fff;">'
          +     '<button type="button" data-rm="' + i + '" title="Remover serviço" style="padding:7px 10px;border:1px solid #fecaca;border-radius:8px;background:#fef2f2;color:#dc2626;cursor:pointer;"><i class="ph ph-trash"></i></button>'
          +   '</div>'
          + '</div>'
          + '</div>';
    }).join('');
    box.innerHTML = html;

    box.querySelectorAll('[data-f]').forEach(function(el) {
        var i = parseInt(el.getAttribute('data-i')), f = el.getAttribute('data-f');
        el.oninput = function() { window._mnEd.realizados[i][f] = el.value; };
        el.onchange = function() { window._mnEd.realizados[i][f] = el.value; };
    });
    box.querySelectorAll('[data-rm]').forEach(function(b) {
        b.onclick = function() {
            var i = parseInt(b.getAttribute('data-rm'));
            var rem = window._mnEd.realizados[i];
            var remKey = rem ? (rem.id || rem._tmpId) : null;
            if (remKey) window._mnEd.pecas.forEach(function(p) { if (String(p.servico_id) === String(remKey)) p.servico_id = null; });
            if (rem && rem.id) (window._mnEd.mo || []).forEach(function(l) { l.servicos = (l.servicos || []).filter(function(x) { return String(x) !== String(rem.id); }); });
            window._mnEd.realizados.splice(i, 1);
            if (typeof window._mnEdPodarVinculos === 'function') window._mnEdPodarVinculos();
            window._mnEdRenderServ();
            window._mnEdPickRender();
        };
    });
    window._mnEdRenderTotais();
    if (document.getElementById('mned-mo')) window._mnEdRenderMo();
};

window._mnAgruparPecasParaEdicao = function(lista) {
    var resultado = [];
    var gruposRateio = {};
    (lista || []).forEach(function(p) {
        var desc = String(p.descricao || '');
        var m = desc.match(/^(.*)\s+\(rateio\s+(\d+)\/(\d+)\)$/i);
        if (m) {
            var baseDesc = m[1].trim();
            var idx = parseInt(m[2], 10);
            var totalPartes = parseInt(m[3], 10);
            var chave = (p.nota_id || '') + '__' + baseDesc + '__' + totalPartes + '__' + (p.codigo || '') + '__' + (p.unidade || '') + '__' + (p.garantia_valor || '') + '__' + (p.garantia_unidade || '') + '__' + (p.fornecedor || '');
            var grp = gruposRateio[chave];
            if (!grp || grp.partes.length >= totalPartes) {
                grp = {
                    id: p.id,
                    ids: [],
                    nota_id: p.nota_id || null,
                    fornecedor: p.fornecedor || null,
                    codigo: p.codigo || '',
                    descricao: baseDesc,
                    unidade: p.unidade || 'UN',
                    quantidade: 1,
                    valor_unit: 0,
                    valor_total: 0,
                    garantia_valor: p.garantia_valor,
                    garantia_unidade: p.garantia_unidade,
                    servicos: [],
                    partes: []
                };
                gruposRateio[chave] = grp;
                resultado.push(grp);
            }
            var vt = Number(p.valor_total) || 0;
            grp.valor_total = Math.round((grp.valor_total + vt) * 100) / 100;
            grp.valor_unit = grp.valor_total;
            if (p.id && grp.ids.indexOf(p.id) === -1) grp.ids.push(p.id);
            if (p.servico_id && grp.servicos.indexOf(p.servico_id) === -1) grp.servicos.push(p.servico_id);
            grp.partes.push(idx);
        } else {
            resultado.push({
                id: p.id,
                ids: p.id ? [p.id] : [],
                nota_id: p.nota_id || null,
                fornecedor: p.fornecedor || null,
                codigo: p.codigo || '',
                descricao: desc,
                unidade: p.unidade || 'UN',
                quantidade: Number(p.quantidade) || 1,
                valor_unit: Number(p.valor_unit) || 0,
                valor_total: Number(p.valor_total) || 0,
                garantia_valor: p.garantia_valor,
                garantia_unidade: p.garantia_unidade,
                servicos: p.servico_id ? [p.servico_id] : []
            });
        }
    });
    return resultado;
};

window._mnEdExcluirSemNota = async function(tipo) {
    var ehMo = tipo === 'mao_obra';
    if (!confirm('Excluir ' + (ehMo ? 'as linhas de mão de obra lançadas sem anexo' : 'as peças lançadas sem anexo') + '? Esta ação não pode ser desfeita.')) return;
    try {
        await window._mnEdSalvarDetalhe();
        var r = await fetch('/api/frota/manutencoes/' + window._mnEd.id + '/sem-nota/' + tipo, { method: 'DELETE', headers: { Authorization: 'Bearer ' + window._mnEdTok() } });
        if (!r.ok) { var e = await r.json().catch(function() { return {}; }); throw new Error(e.error || 'Erro ao excluir'); }
        await window._mnEdRecarregarDetalhe();
        window._mnEdRenderServ();
        window._mnEdRenderNotas();
        window._mnEdRenderMo();
        window._mnEdRenderHist();
        if (typeof mostrarToastAviso === 'function') mostrarToastAviso('✅ Lançamentos excluídos.');
    } catch (err) { alert(err.message); }
};

window._mnEdRenderNotas = function() {
    var ed = window._mnEd, box = document.getElementById('mned-notas'), E = window._mnEdEsc;
    if (!box) return;
    var pecasAgrup = window._mnAgruparPecasParaEdicao(ed.pecas || []);
    var pecasSemNota = pecasAgrup.filter(function(p) { return !p.nota_id; });
    var moSemNota = (ed.mo || []).filter(function(l) { return !l.nota_id; });
    if (!(ed.notas || []).length && !pecasSemNota.length && !moSemNota.length) {
        box.innerHTML = '<div style="font-size:0.78rem;color:#94a3b8;padding:4px 0;">Nenhuma nota ou OS anexada ainda nesta manutenção.</div>';
        return;
    }
    var nomes = {};
    (ed.realizados || []).forEach(function(s, idx) {
        var k = window._mnEdGetSvcKey(s, idx);
        nomes[String(k)] = s.nome;
        if (s.id) nomes[String(s.id)] = s.nome;
    });
    var fmt = function(n) { return Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
    var garTxt = function(l) {
        var g = l.garantia_valor;
        if (g === undefined || g === null || g === '') return '';
        var n = Number(g);
        if (!(n > 0)) return 'sem garantia';
        return 'garantia ' + n + ' ' + (l.garantia_unidade === 'meses' ? (n === 1 ? 'mês' : 'meses') : (n === 1 ? 'dia' : 'dias'));
    };
    var docs = (ed.notas || []).map(function(a) {
        var pecasDoc = pecasAgrup.filter(function(p) { return String(p.nota_id) === String(a.id); });
        var moDoc = (ed.mo || []).filter(function(l) { return String(l.nota_id) === String(a.id); });
        var temP = pecasDoc.length > 0, temM = moDoc.length > 0;
        var tipoTitulo = (temP && temM) ? 'Ordem de Serviço (OS)' : (a.tipo === 'mao_obra' || (temM && !temP) ? 'NF Serviço (Mão de Obra)' : 'NF Peças (DANFE)');
        var linhasDoc = [];
        pecasDoc.forEach(function(p) {
            var gt = garTxt(p);
            var sv = (p.servicos || []).map(function(id) { return E(nomes[String(id)] || id); }).join(', ') || '<span style="color:#b45309;">sem vínculo</span>';
            linhasDoc.push('<div style="display:flex;justify-content:space-between;gap:8px;font-size:0.74rem;color:#475569;padding:1px 0;"><span><b>Peça:</b> ' + E(p.descricao) + (gt ? ' <span style="color:#0369a1;font-weight:700;">• ' + gt + '</span>' : '') + ' <span style="color:#94a3b8;">→ ' + sv + '</span></span><b>' + fmt(p.valor_total) + '</b></div>');
        });
        moDoc.forEach(function(l) {
            var gt = garTxt(l);
            var svIds = l.ratear ? (ed.realizados || []).map(function(s) { return s.id; }).filter(Boolean) : (l.servicos || []);
            var sv = svIds.map(function(id) { return E(nomes[String(id)] || id); }).join(', ') || '<span style="color:#b45309;">sem vínculo</span>';
            linhasDoc.push('<div style="display:flex;justify-content:space-between;gap:8px;font-size:0.74rem;color:#475569;padding:1px 0;"><span><b>Serviço:</b> ' + E(l.descricao) + (gt ? ' <span style="color:#0369a1;font-weight:700;">• ' + gt + '</span>' : '') + ' <span style="color:#94a3b8;">→ ' + sv + '</span></span><b>' + fmt(l.valor) + '</b></div>');
        });
        var linhasHtml = linhasDoc.length ? '<div style="margin-top:4px;border-top:1px dashed #e2e8f0;padding-top:4px;">' + linhasDoc.join('') + '</div>' : '';
        return '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:6px 10px;font-size:0.78rem;">'
          + '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">'
          +   '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">'
          +     '<i class="ph ph-file-pdf" style="color:#dc2626;font-size:1.1rem;"></i>'
          +     '<span style="font-weight:700;color:#1e293b;">' + tipoTitulo + '</span>'
          +     (a.numero ? '<span style="color:#475569;">Nº <b>' + E(a.numero) + '</b></span>' : '')
          +     (a.fornecedor ? '<span style="color:#0369a1;font-weight:700;">• ' + E(a.fornecedor) + '</span>' : '')
          +     (Number(a.valor_total || 0) > 0 ? '<span style="color:#15803d;font-weight:700;">' + fmt(a.valor_total) + '</span>' : '')
          +     '<span style="color:#94a3b8;">(' + E(a.nome_arquivo || 'PDF') + ')</span>'
          +   '</div>'
          +   '<div style="display:flex;align-items:center;gap:6px;">'
          +     '<button type="button" onclick="window._mnEdVerNota(' + a.id + ')" style="background:#0284c7;color:#fff;border:none;border-radius:6px;padding:3px 9px;font-size:0.74rem;font-weight:700;cursor:pointer;">Abrir PDF</button>'
          +     '<button type="button" onclick="window._mnEdExcluirNota(' + a.id + ')" style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:6px;padding:3px 8px;font-size:0.74rem;font-weight:700;cursor:pointer;">Excluir</button>'
          +   '</div>'
          + '</div>'
          + linhasHtml
          + '</div>';
    }).join('');

    var manItens = [];
    pecasSemNota.forEach(function(p) {
        var sv = (p.servicos || []).map(function(id) { return E(nomes[String(id)] || id); }).join(', ') || '<span style="color:#b45309;">sem vínculo</span>';
        var gt = garTxt(p);
        var idsJson = E(JSON.stringify(p.ids || (p.id ? [p.id] : [])));
        manItens.push('<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:3px 0;border-top:1px dashed #e2e8f0;">'
          + '<span style="color:#475569;"><b>Peça:</b> ' + E(p.descricao) + (p.fornecedor ? ' <span style="color:#0369a1;font-weight:600;">(' + E(p.fornecedor) + ')</span>' : '') + (gt ? ' <span style="color:#0369a1;font-weight:700;">• ' + gt + '</span>' : '') + ' <span style="color:#94a3b8;">→ ' + sv + '</span></span>'
          + '<span style="display:flex;align-items:center;gap:8px;"><b>' + fmt(p.valor_total) + '</b>'
          + '<button type="button" onclick=\'window._mnEdExcluirLancamentoManual("peca",' + idsJson + ')\' style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:6px;padding:2px 8px;font-size:0.72rem;font-weight:700;cursor:pointer;">Excluir</button></span>'
          + '</div>');
    });
    moSemNota.forEach(function(l) {
        var svIds = l.ratear ? (ed.realizados || []).map(function(s) { return s.id; }).filter(Boolean) : (l.servicos || []);
        var sv = svIds.map(function(id) { return E(nomes[String(id)] || id); }).join(', ') || '<span style="color:#b45309;">sem vínculo</span>';
        var gt = garTxt(l);
        manItens.push('<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:3px 0;border-top:1px dashed #e2e8f0;">'
          + '<span style="color:#475569;"><b>Serviço:</b> ' + E(l.descricao) + (l.fornecedor ? ' <span style="color:#0369a1;font-weight:600;">(' + E(l.fornecedor) + ')</span>' : '') + (gt ? ' <span style="color:#0369a1;font-weight:700;">• ' + gt + '</span>' : '') + ' <span style="color:#94a3b8;">→ ' + sv + '</span></span>'
          + '<span style="display:flex;align-items:center;gap:8px;"><b>' + fmt(l.valor) + '</b>'
          + '<button type="button" onclick=\'window._mnEdExcluirLancamentoManual("mao_obra",[' + l.id + '])\' style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:6px;padding:2px 8px;font-size:0.72rem;font-weight:700;cursor:pointer;">Excluir</button></span>'
          + '</div>');
    });
    var man = manItens.length ? '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:6px 10px;font-size:0.78rem;">'
      + '<div style="font-weight:700;color:#1e293b;margin-bottom:4px;"><i class="ph ph-pencil-simple" style="color:#0284c7;"></i> Lançamentos manuais</div>'
      + manItens.join('')
      + '</div>' : '';
    box.innerHTML = docs + man;
};

// ── Anexo unificado (PDF ou manual) + Vinculo com servicos na mesma tela (igual Revisao) ──
window._mnEdServicosMarcados = function() {
    var ed = window._mnEd;
    if (!ed || !Array.isArray(ed.realizados)) return [];
    return ed.realizados.map(function(s, idx) {
        return { key: window._mnEdGetSvcKey(s, idx), nome: s.nome };
    });
};

window._mnEdVincLabel = function(servicos) {
    var arr = servicos || [];
    if (!arr.length) return 'Vincular serviço... \u25BE';
    if (arr.length === 1) {
        var s = window._mnEdServicosMarcados().find(function(x) { return String(x.key) === String(arr[0]); });
        return (s ? s.nome : arr[0]) + ' \u25BE';
    }
    return arr.length + ' serviços \u25BE';
};

window._mnEdFecharVinculo = function() {
    var el = document.getElementById('mned-vinc-pop');
    if (el) el.remove();
    if (window._mnEdVincOutside) {
        document.removeEventListener('mousedown', window._mnEdVincOutside, true);
        window.removeEventListener('scroll', window._mnEdVincScroll, true);
        window.removeEventListener('keydown', window._mnEdVincKey, true);
        window._mnEdVincOutside = null;
    }
};

window._mnEdAbrirVinculo = function(i, btn) {
    var st = window._mnEdNotaStage;
    if (!st || !st.lancs[i] || !btn) return;
    var jaAberto = document.getElementById('mned-vinc-pop');
    var mesmo = jaAberto && jaAberto.getAttribute('data-linha') === String(i);
    window._mnEdFecharVinculo();
    if (mesmo) return;
    var marcados = window._mnEdServicosMarcados();
    window._mnEdVincFiltro = '';
    var pop = document.createElement('div');
    pop.id = 'mned-vinc-pop';
    pop.setAttribute('data-linha', String(i));
    var r = btn.getBoundingClientRect();
    var largura = 330;
    var alturaMax = 340;
    var esq = Math.min(Math.max(8, r.right - largura), window.innerWidth - largura - 8);
    var abreAcima = (window.innerHeight - r.bottom) < alturaMax && r.top > alturaMax;
    pop.style.cssText = 'position:fixed;z-index:10300;width:' + largura + 'px;max-height:' + alturaMax + 'px;overflow-y:auto;background:#fff;border:1px solid #cbd5e1;border-radius:10px;box-shadow:0 12px 30px rgba(0,0,0,0.28);padding:0 12px 8px;left:' + esq + 'px;' + (abreAcima ? 'bottom:' + (window.innerHeight - r.top + 4) + 'px;' : 'top:' + (r.bottom + 4) + 'px;');
    pop.innerHTML = '<div style="position:sticky;top:0;background:#fff;padding:8px 0 6px;border-bottom:1px solid #e2e8f0;z-index:1;">'
        + '<div style="font-size:0.74rem;font-weight:800;color:#075985;margin-bottom:5px;">Serviços realizados marcados</div>'
        + (marcados.length ? '<input type="text" id="mned-vinc-busca" autocomplete="off" placeholder="Pesquisar serviço pelo nome..." oninput="window._mnEdVincFiltro=this.value;window._mnEdVincDesenhar(' + i + ')" style="width:100%;box-sizing:border-box;padding:0.35rem 0.55rem;border:1px solid #cbd5e1;border-radius:7px;font-size:0.78rem;outline:none;">' : '')
        + '</div><div id="mned-vinc-lista"></div>';
    document.body.appendChild(pop);
    window._mnEdVincDesenhar(i);
    var campoBusca = document.getElementById('mned-vinc-busca');
    if (campoBusca) { try { campoBusca.focus(); } catch (e) {} }
    window._mnEdVincOutside = function(ev) { if (!pop.contains(ev.target) && ev.target !== btn) window._mnEdFecharVinculo(); };
    window._mnEdVincScroll = function(ev) { if (!pop.contains(ev.target)) window._mnEdFecharVinculo(); };
    window._mnEdVincKey = function(ev) { if (ev.key === 'Escape') window._mnEdFecharVinculo(); };
    document.addEventListener('mousedown', window._mnEdVincOutside, true);
    window.addEventListener('scroll', window._mnEdVincScroll, true);
    window.addEventListener('keydown', window._mnEdVincKey, true);
};

window._mnEdVincPassa = function(s) {
    var norm = function(t) { return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); };
    var palavras = norm(window._mnEdVincFiltro || '').split(' ').filter(Boolean);
    var alvo = norm(s.nome);
    return palavras.every(function(p) { return alvo.indexOf(p) !== -1; });
};

window._mnEdVincDesenhar = function(i) {
    var box = document.getElementById('mned-vinc-lista');
    var st = window._mnEdNotaStage;
    if (!box || !st || !st.lancs[i]) return;
    var E = window._mnEdEsc;
    var l = st.lancs[i];
    var marcados = window._mnEdServicosMarcados();
    if (!marcados.length) {
        box.innerHTML = '<div style="font-size:0.78rem;color:#b45309;padding:8px 0;">Nenhum serviço realizado marcado. Marque em "Serviços realizados" acima os serviços que foram feitos para poder vincular.</div>';
        return;
    }
    var lista = marcados.filter(window._mnEdVincPassa);
    if (!lista.length) {
        box.innerHTML = '<div style="font-size:0.78rem;color:#94a3b8;padding:8px 0;">Nenhum serviço encontrado para a pesquisa.</div>';
        return;
    }
    var todos = lista.every(function(s) { return l.servicos.indexOf(String(s.key)) >= 0; });
    box.innerHTML = '<label style="display:flex;align-items:center;gap:6px;font-size:0.68rem;font-weight:800;color:#475569;background:#f1f5f9;border-radius:6px;padding:4px 6px;margin:8px 0 2px;cursor:pointer;">'
        + '<input type="checkbox" ' + (todos ? 'checked' : '') + ' onchange="window._mnEdStageToggleTodos(' + i + ',this.checked)" style="accent-color:#7c3aed;"> SERVIÇOS REALIZADOS <span style="font-weight:600;color:#94a3b8;">(selecionar todos)</span></label>'
        + lista.map(function(s) {
            var ck = l.servicos.indexOf(String(s.key)) >= 0;
            return '<label style="display:flex;align-items:center;gap:6px;font-size:0.78rem;color:#1e293b;padding:3px 0 3px 8px;cursor:pointer;"><input type="checkbox" ' + (ck ? 'checked' : '') + ' onchange="window._mnEdStageToggleServ(' + i + ',\'' + E(s.key) + '\',this.checked);window._mnEdVincDesenhar(' + i + ')" style="accent-color:#7c3aed;"> ' + E(s.nome) + '</label>';
        }).join('');
};

window._mnEdStageToggleTodos = function(i, marcado) {
    var st = window._mnEdNotaStage;
    if (!st || !st.lancs[i]) return;
    window._mnEdServicosMarcados().filter(window._mnEdVincPassa).forEach(function(s) {
        window._mnEdStageToggleServ(i, String(s.key), marcado);
    });
    window._mnEdVincDesenhar(i);
};

window._mnEdStageToggleServ = function(i, key, marcado) {
    var st = window._mnEdNotaStage;
    if (!st || !st.lancs[i]) return;
    var arr = st.lancs[i].servicos;
    var k = String(key);
    var pos = arr.indexOf(k);
    if (marcado && pos < 0) arr.push(k);
    if (!marcado && pos >= 0) arr.splice(pos, 1);
    var btn = document.getElementById('mned-stg-btn-' + i);
    if (btn) { btn.textContent = window._mnEdVincLabel(arr); btn.style.color = arr.length ? '#15803d' : '#b45309'; }
    window._mnEdAtualizarCustosPreview();
};

window._mnEdPodarVinculos = function() {
    var st = window._mnEdNotaStage;
    if (!st) return;
    var validos = {};
    window._mnEdServicosMarcados().forEach(function(s) { validos[String(s.key)] = true; });
    var mudou = false;
    st.lancs.forEach(function(l) {
        var antes = (l.servicos || []).length;
        l.servicos = (l.servicos || []).filter(function(k) { return !!validos[String(k)]; });
        if (l.servicos.length !== antes) mudou = true;
    });
    if (mudou) { window._mnEdFecharVinculo(); window._mnEdRenderStage(); }
};

window._mnEdIniciarManual = function() {
    if (!window._mnEdNotaStage || window._mnEdNotaStage.file) {
        var fornPadrao = (document.getElementById('mned-forn') && document.getElementById('mned-forn').value.trim()) || '';
        window._mnEdNotaStage = { file: null, numero: '', fornecedor: fornPadrao, lancs: [], avisos: [] };
    }
    window._mnEdStageAdd();
    var el = document.getElementById('mned-stage');
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
};

window._mnEdAoEscolherPdf = async function(inp) {
    var file = inp && inp.files && inp.files[0];
    var stageEl = document.getElementById('mned-stage');
    if (!file) { window._mnEdNotaStage = null; if (stageEl) stageEl.innerHTML = ''; window._mnEdAtualizarCustosPreview(); return; }
    if (stageEl) stageEl.innerHTML = '<div style="padding:1rem;text-align:center;color:#64748b;font-size:0.82rem;"><i class="ph ph-circle-notch ph-spin" style="color:#0284c7;"></i> Lendo a nota fiscal... (pode levar alguns segundos)</div>';
    var tok = window._mnEdTok();
    var j = {};
    try {
        var fd = new FormData();
        fd.append('arquivo', file);
        var r = await fetch('/api/frota/revisoes/analisar-nota', { method: 'POST', headers: { Authorization: 'Bearer ' + tok }, body: fd });
        j = await r.json().catch(function() { return {}; });
        if (!r.ok) j = {};
    } catch (e) { j = {}; }

    var nfP = j.nf_pecas || {}, nfS = j.nf_servico || {};
    var lancs = [];
    var chave = function(s) { return String(s || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, '').substring(0, 14); };
    (nfP.itens || []).forEach(function(it) {
        if (Number(it.valor_total) > 0) lancs.push({ tipo: 'peca', codigo: it.codigo || '', descricao: it.descricao || '', quantidade: Number(it.quantidade) || 1, valor_total: Number(it.valor_total), servicos: [], incluir: true });
    });
    (nfS.itens || []).forEach(function(it) {
        var val = Number(it.valor) || 0;
        if (!(val > 0)) return;
        var dup = lancs.some(function(l) { return Math.abs(l.valor_total - val) < 0.005 && chave(l.descricao) === chave(it.descricao); });
        if (!dup) lancs.push({ tipo: 'mao_obra', codigo: '', descricao: it.descricao || '', quantidade: 1, valor_total: val, servicos: [], incluir: true });
    });
    var tipoSel = document.getElementById('mned-anx-tipo');
    if (tipoSel) {
        var temP = lancs.some(function(l) { return l.tipo === 'peca'; }), temM = lancs.some(function(l) { return l.tipo === 'mao_obra'; });
        if (temP && temM) tipoSel.value = 'ordem_servico'; else if (temP) tipoSel.value = 'nota_pecas'; else if (temM) tipoSel.value = 'nota_servico'; else tipoSel.value = 'outro';
    }
    var fornLido = nfS.fornecedor || nfP.fornecedor || (document.getElementById('mned-forn') && document.getElementById('mned-forn').value.trim()) || '';
    window._mnEdNotaStage = {
        file: file,
        numero: nfS.numero || nfP.numero || '',
        fornecedor: fornLido,
        lancs: lancs,
        avisos: [].concat(nfP.avisos || [], nfS.avisos || []).filter(function(a, i, arr) { return a && arr.indexOf(a) === i; })
    };
    var fornEl = document.getElementById('mned-forn');
    if (fornEl && window._mnEdNotaStage.fornecedor && !fornEl.value.trim()) fornEl.value = window._mnEdNotaStage.fornecedor;
    window._mnEdRenderStage();
};

window._mnEdRenderStage = function() {
    var el = document.getElementById('mned-stage');
    var st = window._mnEdNotaStage;
    if (!el) return;
    if (!st) { el.innerHTML = ''; return; }
    var E = window._mnEdEsc;
    var linhas = st.lancs.map(function(l, i) {
        var ehPeca = l.tipo === 'peca';
        var ehEstoque = ehPeca && !!l.estoque;
        var colEstoque = ehPeca
            ? '<label style="display:inline-flex;align-items:center;gap:4px;font-size:0.74rem;font-weight:700;color:' + (ehEstoque ? '#7c3aed' : '#475569') + ';cursor:pointer;" title="Peça comprada para estoque (não precisa vincular a serviço, valor subtraído da manutenção e não aparece na lista salva)"><input type="checkbox" ' + (ehEstoque ? 'checked' : '') + ' onchange="window._mnEdStageSet(' + i + ',\'estoque\',this.checked)" style="accent-color:#7c3aed;"> Estoque</label>'
            : '<span style="color:#cbd5e1;font-size:0.72rem;" title="Disponível apenas para peças">—</span>';
        var colVinculo = ehEstoque
            ? '<span style="font-size:0.74rem;font-weight:700;color:#7c3aed;background:#f5f3ff;border:1px solid #ddd6fe;padding:3px 8px;border-radius:6px;display:inline-block;width:100%;box-sizing:border-box;text-align:center;">Estoque (sem vínculo)</span>'
            : '<button type="button" id="mned-stg-btn-' + i + '" onclick="window._mnEdAbrirVinculo(' + i + ', this)" style="width:100%;text-align:left;cursor:pointer;font-size:0.76rem;font-weight:700;color:' + (l.servicos.length ? '#15803d' : '#b45309') + ';border:1px solid #cbd5e1;border-radius:6px;padding:3px 8px;background:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + window._mnEdVincLabel(l.servicos) + '</button>';
        return '<tr style="border-bottom:1px solid #e2e8f0;' + (ehEstoque ? 'background:#faf5ff;' : '') + '">'
            + '<td style="padding:5px 6px;text-align:center;"><input type="checkbox" ' + (l.incluir ? 'checked' : '') + ' onchange="window._mnEdStageSet(' + i + ',\'incluir\',this.checked)" style="accent-color:#0284c7;"></td>'
            + '<td style="padding:5px 6px;"><select onchange="window._mnEdStageSet(' + i + ',\'tipo\',this.value)" style="padding:3px 4px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.76rem;"><option value="peca"' + (l.tipo === 'peca' ? ' selected' : '') + '>Peça</option><option value="mao_obra"' + (l.tipo === 'mao_obra' ? ' selected' : '') + '>Mão de obra</option></select></td>'
            + '<td style="padding:5px 6px;"><input type="text" value="' + E(l.descricao) + '" onchange="window._mnEdStageSet(' + i + ',\'descricao\',this.value)" style="width:100%;padding:3px 6px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.76rem;box-sizing:border-box;"></td>'
            + '<td style="padding:5px 6px;width:110px;"><input type="number" step="0.01" value="' + Number(l.valor_total || 0).toFixed(2) + '" onchange="window._mnEdStageSet(' + i + ',\'valor_total\',this.value)" style="width:100%;padding:3px 6px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.76rem;text-align:right;box-sizing:border-box;"></td>'
            + '<td style="padding:5px 6px;width:160px;">' + (ehEstoque ? '<span style="color:#cbd5e1;font-size:0.72rem;" title="Peças de estoque não precisam de garantia">—</span>' : '<div style="display:flex;gap:4px;align-items:center;"><input type="number" min="0" step="1" value="' + (l.garantia_valor === undefined || l.garantia_valor === null ? '' : E(l.garantia_valor)) + '" placeholder="Garantia *" title="' + (ehPeca ? 'Garantia da peça' : 'Garantia da mão de obra / serviço') + ' (obrigatório — informe 0 se não houver)" onchange="window._mnEdStageSet(' + i + ',\'garantia_valor\',this.value)" style="width:78px;padding:3px 6px;border:1px solid ' + ((l.garantia_valor === undefined || l.garantia_valor === null || l.garantia_valor === '') ? '#fca5a5' : '#cbd5e1') + ';border-radius:6px;font-size:0.76rem;text-align:right;box-sizing:border-box;"><select onchange="window._mnEdStageSet(' + i + ',\'garantia_unidade\',this.value)" style="padding:3px 4px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.74rem;"><option value="dias"' + (l.garantia_unidade !== 'meses' ? ' selected' : '') + '>dias</option><option value="meses"' + (l.garantia_unidade === 'meses' ? ' selected' : '') + '>meses</option></select></div>') + '</td>'
            + '<td style="padding:5px 6px;width:82px;text-align:center;">' + colEstoque + '</td>'
            + '<td style="padding:5px 6px;width:190px;">' + colVinculo + '</td>'
            + '<td style="padding:5px 6px;width:30px;text-align:center;"><button type="button" onclick="window._mnEdStageRemove(' + i + ')" title="Remover linha" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:1rem;">&times;</button></td>'
            + '</tr>';
    }).join('');
    el.innerHTML = '<div style="border:1.5px solid #bae6fd;background:#f0f9ff;border-radius:10px;padding:0.8rem;">'
        + '<div style="font-weight:800;color:#075985;font-size:0.85rem;margin-bottom:6px;"><i class="ph ph-file-pdf"></i> ' + (st.file ? E(st.file.name) + ' — confira o que foi lido e vincule aos serviços' : 'Lançamento manual — informe o fornecedor, as peças/serviços, os valores e vincule aos serviços') + '</div>'
        + (st.avisos || []).map(function(a) { return '<div style="font-size:0.74rem;color:#b45309;margin-bottom:3px;">\u26A0\uFE0F ' + E(a) + '</div>'; }).join('')
        + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;margin:6px 0 10px;">'
        +   (st.file ? '<div><label style="font-size:0.7rem;font-weight:600;color:#64748b;display:block;margin-bottom:2px;">Nº da Nota / OS</label><input type="text" value="' + E(st.numero) + '" oninput="window._mnEdNotaStage.numero=this.value" style="width:100%;padding:0.4rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.8rem;box-sizing:border-box;background:#fff;"></div>' : '')
        +   '<div><label style="font-size:0.7rem;font-weight:600;color:#64748b;display:block;margin-bottom:2px;">Fornecedor' + (st.file ? '' : ' (peças / serviços adicionados manualmente)') + '</label><input type="text" value="' + E(st.fornecedor) + '" placeholder="Informe o fornecedor..." oninput="window._mnEdNotaStage.fornecedor=this.value;window._mnEdAtualizarCustosPreview()" style="width:100%;padding:0.4rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.8rem;box-sizing:border-box;background:#fff;"></div>'
        + '</div>'
        + '<div style="overflow-x:auto;background:#fff;border:1px solid #e2e8f0;border-radius:8px;">'
        +   '<table style="width:100%;border-collapse:collapse;font-size:0.78rem;">'
        +     '<thead><tr style="background:#f1f5f9;color:#475569;text-align:left;"><th style="padding:5px 6px;width:34px;text-align:center;">Usar</th><th style="padding:5px 6px;width:110px;">Tipo</th><th style="padding:5px 6px;">Descrição (peça / serviço)</th><th style="padding:5px 6px;">Valor (R$)</th><th style="padding:5px 6px;width:160px;">Garantia *</th><th style="padding:5px 6px;width:82px;text-align:center;">Estoque</th><th style="padding:5px 6px;">Serviço vinculado *</th><th></th></tr></thead>'
        +     '<tbody>' + (linhas || '<tr><td colspan="8" style="padding:10px;text-align:center;color:#94a3b8;">Nenhuma linha foi lida automaticamente. Adicione as linhas manualmente.</td></tr>') + '</tbody>'
        +   '</table>'
        + '</div>'
        + '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-top:6px;">'
        +   '<button type="button" onclick="window._mnEdStageAdd()" style="background:#fff;color:#0284c7;border:1px solid #7dd3fc;border-radius:6px;padding:3px 10px;font-size:0.76rem;font-weight:700;cursor:pointer;">+ Adicionar linha manual</button>'
        +   '<div id="mned-stage-tot" style="font-size:0.8rem;font-weight:800;color:#0f172a;"></div>'
        + '</div>'
        + '<div id="mned-stage-custos" style="margin-top:8px;"></div>'
        + '<div style="margin-top:10px;text-align:right;">'
        +   '<button type="button" id="mned-anx-btn" onclick="window._mnEdAnexarPdf()" style="background:#16a34a;color:#fff;border:none;border-radius:8px;padding:0.55rem 1.1rem;font-size:0.82rem;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:6px;"><i class="ph ph-upload-simple"></i> ' + (st.file ? 'Anexar PDF e lançar valores' : 'Lançar valores') + '</button>'
        + '</div>'
        + '</div>';
    window._mnEdStageTotais();
};

window._mnEdStageTotais = function() {
    var st = window._mnEdNotaStage;
    var el = document.getElementById('mned-stage-tot');
    if (!st || !el) return;
    var p = 0, m = 0, est = 0;
    st.lancs.forEach(function(l) {
        if (!l.incluir) return;
        if (l.tipo === 'mao_obra') m += Number(l.valor_total) || 0;
        else if (l.estoque) est += Number(l.valor_total) || 0;
        else p += Number(l.valor_total) || 0;
    });
    var f = function(n) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
    el.textContent = 'Peças: ' + f(p) + '  •  Mão de obra: ' + f(m) + (est > 0 ? '  •  Estoque abatido: -' + f(est) : '') + '  •  Total da nota: ' + f(p + m);
    window._mnEdAtualizarCustosPreview();
};

window._mnEdStageSet = function(i, campo, valor) {
    var st = window._mnEdNotaStage;
    if (!st || !st.lancs[i]) return;
    if (campo === 'valor_total') st.lancs[i][campo] = parseFloat(valor) || 0;
    else if (campo === 'garantia_valor') st.lancs[i].garantia_valor = String(valor).trim() === '' ? '' : Math.max(0, parseInt(valor, 10) || 0);
    else if (campo === 'estoque') st.lancs[i].estoque = !!valor;
    else st.lancs[i][campo] = valor;
    if (campo === 'tipo' && valor === 'mao_obra') st.lancs[i].estoque = false;
    if (campo === 'tipo' || campo === 'estoque' || campo === 'garantia_valor') {
        window._mnEdFecharVinculo();
        window._mnEdRenderStage();
        return;
    }
    window._mnEdStageTotais();
};

window._mnEdStageAdd = function() {
    var st = window._mnEdNotaStage;
    if (!st) return;
    var tipoDoc = document.getElementById('mned-anx-tipo') && document.getElementById('mned-anx-tipo').value;
    st.lancs.push({ tipo: (!st.file || tipoDoc === 'nota_pecas') ? 'peca' : 'mao_obra', codigo: '', descricao: '', quantidade: 1, valor_total: 0, servicos: [], incluir: true });
    window._mnEdRenderStage();
};

window._mnEdStageRemove = function(i) {
    var st = window._mnEdNotaStage;
    if (!st) return;
    st.lancs.splice(i, 1);
    window._mnEdRenderStage();
};

window._mnEdAnexarPdf = async function() {
    var st = window._mnEdNotaStage;
    if (!st) return alert('Selecione um arquivo PDF ou adicione uma linha manual.');
    var usadas = st.lancs.filter(function(l) { return l.incluir && !(l.tipo === 'peca' && l.estoque) && (Number(l.valor_total) > 0); });
    var temEstoque = st.lancs.some(function(l) { return l.incluir && l.tipo === 'peca' && l.estoque && (Number(l.valor_total) > 0); });
    if (!usadas.length && !temEstoque) return alert('Informe ao menos uma linha com valor.');
    var semDesc = usadas.filter(function(l) { return !String(l.descricao || '').trim(); });
    if (semDesc.length) return alert('Preencha a descrição de todas as linhas utilizadas.');
    var semVinculo = usadas.filter(function(l) { return !l.servicos.length; });
    if (semVinculo.length) return alert('Vincule cada peça / serviço a pelo menos um serviço marcado em "Serviços realizados".\n\nSem vínculo (' + semVinculo.length + '):\n- ' + semVinculo.map(function(l) { return l.descricao; }).join('\n- '));
    var semGarantia = usadas.filter(function(l) { return l.garantia_valor === undefined || l.garantia_valor === null || l.garantia_valor === ''; });
    if (semGarantia.length) return alert('Informe a garantia de cada peça / mão de obra (preencha 0 se não houver garantia).\n\nSem garantia preenchida (' + semGarantia.length + '):\n- ' + semGarantia.map(function(l) { return l.descricao; }).join('\n- '));

    if (!usadas.length && temEstoque && !st.file) {
        window._mnEdNotaStage = null;
        window._mnEdFecharVinculo();
        window._mnEdRenderStage();
        if (typeof mostrarToastAviso === 'function') mostrarToastAviso('\u2705 Peças de estoque abatidas (não lançadas na manutenção)!');
        return;
    }

    var rotulo = st.file ? 'Anexar PDF e lançar valores' : 'Lançar valores';
    var btn = document.getElementById('mned-anx-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }
    try {
        var fornStage = String(st.fornecedor || '').trim();
        var fornEl = document.getElementById('mned-forn');
        if (fornEl && fornStage && !fornEl.value.trim()) fornEl.value = fornStage;
        await window._mnEdGarantirId();
        var detSalvo = await window._mnEdSalvarDetalhe();
        var tmpMap = (detSalvo && detSalvo.tmp_map) || {};
        var ed = window._mnEd;
        var tok = window._mnEdTok();
        var payload = usadas.map(function(l) {
            var svIds = (l.servicos || []).map(function(k) {
                if (tmpMap[k]) return tmpMap[k];
                var n = parseInt(k, 10);
                return isNaN(n) ? null : n;
            }).filter(Boolean);
            return {
                tipo: l.tipo,
                codigo: l.codigo,
                descricao: l.descricao,
                quantidade: l.quantidade,
                valor_total: l.valor_total,
                servicos: svIds,
                garantia_valor: l.garantia_valor,
                garantia_unidade: l.garantia_unidade === 'meses' ? 'meses' : 'dias',
                fornecedor: fornStage || l.fornecedor || null
            };
        });
        var res;
        if (st.file) {
            var total = usadas.reduce(function(t, l) { return t + (Number(l.valor_total) || 0); }, 0);
            var fd = new FormData();
            fd.append('arquivo', st.file);
            fd.append('tipo_documento', (document.getElementById('mned-anx-tipo') && document.getElementById('mned-anx-tipo').value) || 'nota_servico');
            fd.append('numero_nota', st.numero || '');
            fd.append('valor', String(Math.round(total * 100) / 100));
            fd.append('fornecedor', fornStage);
            fd.append('dados', JSON.stringify({ lancamentos: payload }));
            res = await fetch('/api/frota/manutencoes/' + ed.id + '/anexos', { method: 'POST', headers: { Authorization: 'Bearer ' + tok }, body: fd });
        } else {
            res = await fetch('/api/frota/manutencoes/' + ed.id + '/lancamentos', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify({ fornecedor: fornStage || null, lancamentos: payload }) });
        }
        var j = await res.json().catch(function() { return {}; });
        if (!res.ok) throw new Error(j.error || 'Erro ao salvar');

        await window._mnEdRecarregarDetalhe();
        window._mnEdNotaStage = null;
        window._mnEdFecharVinculo();
        var fileInp = document.getElementById('mned-anx-file');
        if (fileInp) fileInp.value = '';
        window._mnEdRenderStage();
        window._mnEdRenderServ();
        window._mnEdRenderNotas();
        window._mnEdRenderMo();
        window._mnEdRenderHist();
        if (typeof mostrarToastAviso === 'function') mostrarToastAviso(st.file ? '\u2705 Nota / OS anexada e valores lançados!' : '\u2705 Lançamento manual salvo!');
    } catch (e) {
        alert('Erro ao salvar: ' + e.message);
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-upload-simple"></i> ' + rotulo; }
    }
};

window._mnEdExcluirLancamentoManual = async function(tipo, ids) {
    if (!confirm('Deseja excluir este lançamento manual?')) return;
    try {
        await window._mnEdSalvarDetalhe();
        var r = await fetch('/api/frota/manutencoes/' + window._mnEd.id + '/lancamento-manual', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + window._mnEdTok() },
            body: JSON.stringify({ tipo: tipo, ids: ids })
        });
        var j = await r.json().catch(function() { return {}; });
        if (!r.ok) throw new Error(j.error || 'Erro ao excluir lançamento');
        await window._mnEdRecarregarDetalhe();
        window._mnEdRenderServ();
        window._mnEdRenderNotas();
        window._mnEdRenderMo();
        window._mnEdRenderHist();
        if (typeof mostrarToastAviso === 'function') mostrarToastAviso('\u2705 Lançamento manual excluído!');
    } catch (e) { alert(e.message); }
};

window._mnEdCustosPorServicoHtml = function(lancs) {
    if (!lancs || !lancs.length) return '<div style="font-size:0.78rem;color:#94a3b8;">Os custos por serviço aparecem aqui conforme você vincula as linhas da nota aos serviços realizados.</div>';
    var ed = window._mnEd || {};
    var nomes = {};
    (ed.realizados || []).forEach(function(s, idx) {
        var k = window._mnEdGetSvcKey(s, idx);
        nomes[String(k)] = s;
        if (s.id) nomes[String(s.id)] = s;
    });
    var notaForns = {};
    (ed.notas || []).forEach(function(n) { if (n && n.id && n.fornecedor) notaForns[String(n.id)] = n.fornecedor; });
    var acc = {};
    var semVinculo = 0;
    lancs.forEach(function(l) {
        var sv = Array.isArray(l.servicos) ? l.servicos : [];
        var val = Number(l.valor_total || 0);
        if (!sv.length) { semVinculo += val; return; }
        var forn = String(l.fornecedor || (l.nota_id && notaForns[String(l.nota_id)]) || '').trim();
        var parte = val / sv.length;
        sv.forEach(function(id) {
            var k = String(id);
            if (!acc[k]) acc[k] = { pecas: 0, mo: 0, fornecedores: [] };
            if (l.tipo === 'mao_obra') acc[k].mo += parte; else acc[k].pecas += parte;
            if (forn && acc[k].fornecedores.indexOf(forn) === -1) acc[k].fornecedores.push(forn);
        });
    });
    var fmt = function(n) { return Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
    var E = window._mnEdEsc;
    var linhas = Object.keys(acc).map(function(id) {
        var s = nomes[id];
        var a = acc[id];
        var fornTxt = a.fornecedores.length ? a.fornecedores.map(E).join(' / ') : '<span style="color:#94a3b8;">—</span>';
        return '<tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:5px 8px;font-weight:600;color:#1e293b;">' + E(s ? s.nome : id) + '</td><td style="padding:5px 8px;color:#334155;font-weight:600;">' + fornTxt + '</td><td style="padding:5px 8px;text-align:right;">' + fmt(a.pecas) + '</td><td style="padding:5px 8px;text-align:right;">' + fmt(a.mo) + '</td><td style="padding:5px 8px;text-align:right;font-weight:800;">' + fmt(a.pecas + a.mo) + '</td></tr>';
    }).join('');
    return '<div style="font-size:0.78rem;font-weight:700;color:#334155;margin-bottom:4px;">Custo por serviço (rateado entre os serviços vinculados)</div>'
        + '<div style="overflow-x:auto;background:#fff;border:1px solid #e2e8f0;border-radius:8px;"><table style="width:100%;border-collapse:collapse;font-size:0.78rem;">'
        + '<thead><tr style="background:#f1f5f9;color:#475569;text-align:left;"><th style="padding:5px 8px;">Serviço</th><th style="padding:5px 8px;">Fornecedor</th><th style="padding:5px 8px;text-align:right;">Peças</th><th style="padding:5px 8px;text-align:right;">Mão de obra</th><th style="padding:5px 8px;text-align:right;">Total</th></tr></thead>'
        + '<tbody>' + linhas + '</tbody></table></div>'
        + (semVinculo > 0 ? '<div style="font-size:0.74rem;color:#b45309;margin-top:4px;">Valor sem vínculo a serviço: ' + fmt(semVinculo) + '</div>' : '');
};

window._mnEdMontarLancamentosSalvos = function() {
    var ed = window._mnEd || {};
    var lancs = [];
    (ed.pecas || []).forEach(function(p) {
        lancs.push({
            tipo: 'peca',
            valor_total: Number(p.valor_total) || 0,
            servicos: p.servico_id ? [String(p.servico_id)] : [],
            nota_id: p.nota_id || null,
            fornecedor: p.fornecedor || ''
        });
    });
    if ((ed.mo || []).length > 0) {
        (ed.mo || []).forEach(function(l) {
            var svIds = l.ratear ? (ed.realizados || []).map(function(s, idx) { return window._mnEdGetSvcKey(s, idx); }) : (l.servicos || []).map(String);
            lancs.push({
                tipo: 'mao_obra',
                valor_total: Number(l.valor) || 0,
                servicos: svIds,
                nota_id: l.nota_id || null,
                fornecedor: l.fornecedor || ''
            });
        });
    } else {
        (ed.realizados || []).forEach(function(s, idx) {
            var vMo = window._mnNum(s.mao_obra);
            if (vMo > 0) {
                lancs.push({
                    tipo: 'mao_obra',
                    valor_total: vMo,
                    servicos: [window._mnEdGetSvcKey(s, idx)],
                    nota_id: null,
                    fornecedor: (ed.m && ed.m.fornecedor) || ''
                });
            }
        });
    }
    return lancs;
};

window._mnEdAtualizarCustosPreview = function() {
    var el = document.getElementById('mned-custos-serv');
    var lancs = window._mnEdMontarLancamentosSalvos();
    var st = window._mnEdNotaStage;
    if (st) st.lancs.forEach(function(l) {
        if (l.incluir && !(l.tipo === 'peca' && l.estoque) && Number(l.valor_total) > 0) {
            lancs.push({ tipo: l.tipo, valor_total: Number(l.valor_total), servicos: l.servicos || [], fornecedor: st.fornecedor || l.fornecedor || '' });
        }
    });
    if (el) el.innerHTML = window._mnEdCustosPorServicoHtml(lancs);
    var boxStage = document.getElementById('mned-stage-custos');
    if (boxStage) {
        var soStage = [];
        if (st) st.lancs.forEach(function(l) {
            if (l.incluir && !(l.tipo === 'peca' && l.estoque) && Number(l.valor_total) > 0) {
                soStage.push({ tipo: l.tipo, valor_total: Number(l.valor_total), servicos: l.servicos || [], fornecedor: st.fornecedor || l.fornecedor || '' });
            }
        });
        boxStage.innerHTML = st ? window._mnEdCustosPorServicoHtml(soStage) : '';
    }
};

// Linhas de mao de obra (da nota fiscal de servico ou lancadas a mao): valor + vinculo com servicos
window._mnEdResumoVinculo = function(l) {
    var n = (l.servicos || []).length;
    if (n === 1) return { txt: '1 serviço vinculado', cor: '#2563eb' };
    if (n > 1) return { txt: n + ' serviços vinculados (rateio)', cor: '#2563eb' };
    return { txt: 'Vincular a serviços', cor: '#2563eb' };
};
window._mnEdRenderMo = function() {
    var ed = window._mnEd, box = document.getElementById('mned-mo'), esc = window._mnEdEsc, fm = window._mnMoneyFmt;
    if (!box) return;
    if (!ed.mo.length) {
        box.innerHTML = '<div style="font-size:0.8rem;color:#94a3b8;">Nenhuma linha de mão de obra. Use "NF de mão de obra" (PDF) ou "Linha de mão de obra".</div>';
        window._mnEdRenderTotais();
        return;
    }
    var ipt = 'padding:6px 8px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.84rem;outline:none;box-sizing:border-box;font-family:inherit;background:#fff;';
    box.innerHTML = ed.mo.map(function(l, i) {
        var rv = window._mnEdResumoVinculo(l);
        return '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 10px;border:1px solid #fde68a;border-radius:8px;background:#fffbeb;margin-bottom:6px;">'
          + '<i class="ph ph-hammer" style="color:#d97706;"></i>'
          + '<input type="text" data-moi="' + i + '" data-mof="descricao" value="' + esc(l.descricao) + '" placeholder="Descrição do serviço (mão de obra)" style="' + ipt + 'flex:1;min-width:220px;">'
          + '<span style="font-size:0.78rem;color:#64748b;">R$</span>'
          + '<input type="text" data-money="1" data-moi="' + i + '" data-mof="valor" value="' + fm(l.valor) + '" style="' + ipt + 'width:110px;text-align:right;font-weight:700;color:#b45309;">'
          + '<button type="button" data-movinc="' + i + '" style="padding:6px 10px;border:1.5px solid ' + rv.cor + ';border-radius:8px;background:#fff;color:' + rv.cor + ';cursor:pointer;font-weight:700;font-size:0.76rem;display:inline-flex;align-items:center;gap:5px;"><i class="ph ph-link"></i> ' + esc(rv.txt) + '</button>'
          + (l.nota_id ? '<i class="ph ph-receipt" title="Veio de nota fiscal" style="color:#d97706;"></i>' : '')
          + '<button type="button" data-morm="' + i + '" title="Remover linha" style="padding:5px 8px;border:1px solid #fecaca;border-radius:6px;background:#fef2f2;color:#dc2626;cursor:pointer;"><i class="ph ph-trash"></i></button>'
          + '</div>';
    }).join('');
    box.querySelectorAll('[data-moi]').forEach(function(el) {
        var i = parseInt(el.getAttribute('data-moi')), f = el.getAttribute('data-mof');
        if (f === 'valor') {
            window._mnMask(el, function(n) { window._mnEd.mo[i].valor = n; window._mnEdRenderTotais(); });
        } else {
            el.oninput = function() { window._mnEd.mo[i].descricao = el.value; };
        }
    });
    box.querySelectorAll('[data-movinc]').forEach(function(b) {
        b.onclick = async function() {
            var i = parseInt(b.getAttribute('data-movinc'));
            try { await window._mnEdSalvarDetalhe(); } catch (e) { alert(e.message); return; }
            window._mnEdRenderServ();
            var linha = window._mnEd.mo[i];
            if (!linha) return;
            window._mnVincularPopup(linha, function() { window._mnEdRenderMo(); });
        };
    });
    box.querySelectorAll('[data-morm]').forEach(function(b) {
        b.onclick = function() {
            window._mnEd.mo.splice(parseInt(b.getAttribute('data-morm')), 1);
            window._mnEdRenderMo();
        };
    });
    window._mnEdRenderTotais();
};

// Popup "Vincular a servicos": se selecionar 1 servico aloca 100% nele; se selecionar >1 servicos faz o rateio entre os selecionados
window._mnVincularPopup = function(linha, cb) {
    var ed = window._mnEd, esc = window._mnEdEsc;
    var servs = ed.realizados.filter(function(s) { return s.id; });
    if (!servs.length) { alert('Adicione e salve os serviços realizados antes de vincular a mão de obra.'); return; }
    var antigo = document.getElementById('mnv-pop'); if (antigo) antigo.remove();
    var sel = {};
    if (Array.isArray(linha.servicos) && linha.servicos.length) {
        linha.servicos.forEach(function(id) { sel[id] = true; });
    } else if (linha.ratear) {
        servs.forEach(function(s) { sel[s.id] = true; });
    }
    var grupos = {}, ordem = [];
    servs.forEach(function(s) {
        var k = s.item_ref || 'Sem categoria';
        if (!grupos[k]) { grupos[k] = []; ordem.push(k); }
        grupos[k].push(s);
    });
    var valLinha = Number(linha.valor_total !== undefined ? linha.valor_total : linha.valor) || 0;
    var pop = document.createElement('div');
    pop.id = 'mnv-pop';
    pop.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.6);display:flex;align-items:center;justify-content:center;z-index:10010;padding:16px;';
    pop.innerHTML = '<div style="background:#fff;border-radius:16px;width:100%;max-width:640px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 25px 60px rgba(0,0,0,0.3);">'
      + '<div style="background:linear-gradient(135deg,#1e293b,#334155);padding:14px 20px;border-radius:16px 16px 0 0;display:flex;align-items:center;gap:10px;flex-shrink:0;">'
      +   '<i class="ph ph-link" style="color:#fff;font-size:1.3rem;"></i><div style="color:#fff;font-weight:700;">Vincular a serviços</div>'
      +   '<button type="button" id="mnv-x" style="margin-left:auto;background:rgba(255,255,255,0.15);border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;color:#fff;"><i class="ph ph-x"></i></button>'
      + '</div>'
      + '<div style="padding:16px 20px;overflow-y:auto;flex:1;">'
      +   '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;flex-wrap:wrap;">'
      +     '<div style="font-size:0.86rem;font-weight:700;color:#1e293b;">' + esc(linha.descricao || 'Linha de mão de obra') + '</div>'
      +     '<div style="font-size:0.86rem;font-weight:800;color:#b45309;">' + window._mnFmtMoeda(valLinha) + '</div>'
      +   '</div>'
      +   '<label style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:1.5px solid #bfdbfe;border-radius:10px;background:#eff6ff;cursor:pointer;margin-bottom:12px;font-size:0.85rem;font-weight:700;color:#1d4ed8;">'
      +     '<input type="checkbox" id="mnv-all" style="width:17px;height:17px;accent-color:#2563eb;"> Selecionar todos os serviços da manutenção (' + servs.length + ')</label>'
      +   '<input type="text" id="mnv-busca" autocomplete="off" placeholder="Pesquisar serviço pelo nome..." style="width:100%;box-sizing:border-box;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:0.86rem;outline:none;margin-bottom:10px;">'
      +   '<div id="mnv-lista"></div>'
      +   '<div id="mnv-resumo" style="margin-top:10px;padding:10px 12px;border-radius:8px;font-size:0.8rem;font-weight:600;"></div>'
      + '</div>'
      + '<div style="padding:12px 20px;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:flex-end;flex-shrink:0;">'
      +   '<button type="button" id="mnv-cancel" style="padding:9px 18px;border:1.5px solid #e2e8f0;border-radius:8px;background:#fff;color:#64748b;cursor:pointer;font-weight:600;">Cancelar</button>'
      +   '<button type="button" id="mnv-ok" style="padding:9px 20px;border:none;border-radius:8px;background:#2563eb;color:#fff;cursor:pointer;font-weight:700;">Aplicar</button>'
      + '</div></div>';
    document.body.appendChild(pop);
    var fechar = function() { var p = document.getElementById('mnv-pop'); if (p) p.remove(); };
    var chkAll = document.getElementById('mnv-all');
    var lista = document.getElementById('mnv-lista');
    var filtroTxt = '';
    var passa = function(sv) {
        var nz = function(t) { return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); };
        var alvo = nz(sv.nome);
        return nz(filtroTxt).split(' ').filter(Boolean).every(function(w) { return alvo.indexOf(w) !== -1; });
    };
    var buscaEl = document.getElementById('mnv-busca');
    buscaEl.oninput = function() { filtroTxt = buscaEl.value; desenhar(); };
    var resumoEl = document.getElementById('mnv-resumo');
    var desenhar = function() {
        var todosMarcados = servs.length > 0 && servs.every(function(s) { return !!sel[s.id]; });
        chkAll.checked = todosMarcados;
        lista.innerHTML = ordem.map(function(k, gi) {
            var gruposK = grupos[k].filter(passa);
            if (!gruposK.length) return '';
            var todos = gruposK.every(function(s) { return sel[s.id]; });
            var ico = window._mnCatMeta ? window._mnCatMeta(k).icone : 'ph-wrench';
            return '<div style="border:1px solid #e2e8f0;border-radius:10px;margin-bottom:8px;overflow:hidden;">'
              + '<label style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f1f5f9;font-size:0.76rem;font-weight:800;color:#475569;text-transform:uppercase;cursor:pointer;">'
              +   '<input type="checkbox" data-vcat="' + gi + '"' + (todos ? ' checked' : '') + ' style="width:15px;height:15px;accent-color:#2563eb;"> <i class="ph ' + esc(ico) + '" style="color:#d97706;font-size:1rem;"></i> ' + esc(k)
              +   ' <span style="font-weight:600;text-transform:none;color:#94a3b8;">(todos desta subcategoria)</span></label>'
              + gruposK.map(function(s) {
                    return '<label style="display:flex;align-items:center;gap:8px;padding:6px 12px 6px 28px;font-size:0.85rem;color:#1e293b;cursor:pointer;">'
                      + '<input type="checkbox" data-vid="' + s.id + '"' + (sel[s.id] ? ' checked' : '') + ' style="width:15px;height:15px;accent-color:#2563eb;"> ' + esc(s.nome) + '</label>';
                }).join('')
              + '</div>';
        }).join('');
        lista.querySelectorAll('[data-vid]').forEach(function(c) { c.onchange = function() { sel[c.getAttribute('data-vid')] = c.checked; desenhar(); }; });
        lista.querySelectorAll('[data-vcat]').forEach(function(c) {
            c.onchange = function() { grupos[ordem[parseInt(c.getAttribute('data-vcat'))]].filter(passa).forEach(function(s) { sel[s.id] = c.checked; }); desenhar(); };
        });
        var idsSel = Object.keys(sel).filter(function(k) { return sel[k]; });
        if (!idsSel.length) {
            resumoEl.style.background = '#fffbeb';
            resumoEl.style.border = '1px solid #fde68a';
            resumoEl.style.color = '#92400e';
            resumoEl.innerHTML = '<i class="ph ph-info"></i> Selecione <b>1 serviço</b> para atribuir o valor total a ele, ou <b>mais de 1 serviço</b> para fazer o rateio igual entre os selecionados.';
        } else if (idsSel.length === 1) {
            var svUnico = servs.find(function(s) { return String(s.id) === String(idsSel[0]); });
            resumoEl.style.background = '#ecfdf5';
            resumoEl.style.border = '1px solid #a7f3d0';
            resumoEl.style.color = '#065f46';
            resumoEl.innerHTML = '<i class="ph ph-check-circle"></i> <b>1 serviço selecionado</b> (' + esc(svUnico ? svUnico.nome : '') + '): receberá o valor integral de <b>' + window._mnFmtMoeda(valLinha) + '</b>.';
        } else {
            resumoEl.style.background = '#eff6ff';
            resumoEl.style.border = '1px solid #bfdbfe';
            resumoEl.style.color = '#1e40af';
            resumoEl.innerHTML = '<i class="ph ph-arrows-split"></i> <b>' + idsSel.length + ' serviços selecionados</b>: rateio de <b>' + window._mnFmtMoeda(valLinha / idsSel.length) + '</b> para cada serviço selecionado.';
        }
    };
    chkAll.onchange = function() {
        var v = chkAll.checked;
        servs.forEach(function(s) { sel[s.id] = v; });
        desenhar();
    };
    desenhar();
    document.getElementById('mnv-x').onclick = fechar;
    document.getElementById('mnv-cancel').onclick = fechar;
    pop.addEventListener('mousedown', function(e) { if (e.target === pop) fechar(); });
    document.getElementById('mnv-ok').onclick = function() {
        var escolhidos = Object.keys(sel).filter(function(k) { return sel[k]; }).map(function(k) { return parseInt(k); });
        if (!escolhidos.length) { alert('Selecione ao menos um serviço.'); return; }
        linha.ratear = 0;
        linha.servicos = escolhidos;
        fechar();
        if (cb) cb();
    };
};

// Popup "Ratear total da nota": rateia o valor total da nota fiscal de servico entre os servicos selecionados
window._mnoRatearTotalPopup = function() {
    var ed = window._mnEd, esc = window._mnEdEsc, fm = window._mnMoneyFmt;
    var servs = ed.realizados.filter(function(s) { return s.id; });
    if (!servs.length) { alert('Adicione primeiro os serviços realizados na manutenção.'); return; }
    var antigo = document.getElementById('mnrt-pop'); if (antigo) antigo.remove();
    var somaAtual = (window._mnMo.linhas || []).reduce(function(t, l) { return t + (Number(l.valor) || 0); }, 0);
    var sel = {};
    var prevSel = window._mnMo.rateioTotalServicos || [];
    if (prevSel.length) {
        prevSel.forEach(function(id) { sel[id] = true; });
    } else {
        servs.forEach(function(s) { sel[s.id] = true; });
    }
    var grupos = {}, ordem = [];
    servs.forEach(function(s) {
        var k = s.item_ref || 'Sem categoria';
        if (!grupos[k]) { grupos[k] = []; ordem.push(k); }
        grupos[k].push(s);
    });
    var ipt = 'padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:0.9rem;outline:none;box-sizing:border-box;font-family:inherit;background:#fff;';
    var pop = document.createElement('div');
    pop.id = 'mnrt-pop';
    pop.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.65);display:flex;align-items:center;justify-content:center;z-index:10012;padding:16px;';
    pop.innerHTML = '<div style="background:#fff;border-radius:16px;width:100%;max-width:640px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 25px 60px rgba(0,0,0,0.35);">'
      + '<div style="background:linear-gradient(135deg,#1e293b,#334155);padding:14px 20px;border-radius:16px 16px 0 0;display:flex;align-items:center;gap:10px;flex-shrink:0;">'
      +   '<div style="background:#d97706;border-radius:9px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;"><i class="ph ph-arrows-split" style="color:#fff;font-size:1.2rem;"></i></div>'
      +   '<div><div style="color:#fff;font-weight:700;">Ratear total da nota</div><div style="color:rgba(255,255,255,0.75);font-size:0.76rem;">Divide o valor total da nota fiscal de serviço entre os serviços selecionados</div></div>'
      +   '<button type="button" id="mnrt-x" style="margin-left:auto;background:rgba(255,255,255,0.15);border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;color:#fff;"><i class="ph ph-x"></i></button>'
      + '</div>'
      + '<div style="padding:16px 20px;overflow-y:auto;flex:1;">'
      +   '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;background:#fffbeb;border:1.5px solid #fde68a;border-radius:10px;margin-bottom:12px;flex-wrap:wrap;">'
      +     '<div style="font-size:0.84rem;font-weight:700;color:#92400e;">Valor total da nota a ratear (R$):</div>'
      +     '<input type="text" id="mnrt-val" value="' + fm(somaAtual) + '" style="' + ipt + 'width:150px;text-align:right;font-weight:800;color:#b45309;">'
      +   '</div>'
      +   '<label style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:1.5px solid #bfdbfe;border-radius:10px;background:#eff6ff;cursor:pointer;margin-bottom:12px;font-size:0.85rem;font-weight:700;color:#1d4ed8;">'
      +     '<input type="checkbox" id="mnrt-all" style="width:17px;height:17px;accent-color:#2563eb;"> Selecionar todos os serviços da manutenção (' + servs.length + ')</label>'
      +   '<input type="text" id="mnrt-busca" autocomplete="off" placeholder="Pesquisar serviço pelo nome..." style="width:100%;box-sizing:border-box;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:0.86rem;outline:none;margin-bottom:10px;">'
      +   '<div id="mnrt-lista"></div>'
      +   '<div id="mnrt-resumo" style="margin-top:10px;padding:10px 12px;border-radius:8px;font-size:0.82rem;font-weight:600;"></div>'
      + '</div>'
      + '<div style="padding:12px 20px;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:flex-end;flex-shrink:0;">'
      +   '<button type="button" id="mnrt-cancel" style="padding:9px 18px;border:1.5px solid #e2e8f0;border-radius:8px;background:#fff;color:#64748b;cursor:pointer;font-weight:600;">Cancelar</button>'
      +   '<button type="button" id="mnrt-ok" style="padding:9px 20px;border:none;border-radius:8px;background:#d97706;color:#fff;cursor:pointer;font-weight:700;display:flex;align-items:center;gap:6px;"><i class="ph ph-check"></i> Aplicar rateio do total</button>'
      + '</div></div>';
    document.body.appendChild(pop);
    var fechar = function() { var p = document.getElementById('mnrt-pop'); if (p) p.remove(); };
    var valNum = somaAtual;
    var valEl = document.getElementById('mnrt-val');
    var chkAll = document.getElementById('mnrt-all');
    var lista = document.getElementById('mnrt-lista');
    var filtroTxt = '';
    var passa = function(sv) {
        var nz = function(t) { return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); };
        var alvo = nz(sv.nome);
        return nz(filtroTxt).split(' ').filter(Boolean).every(function(w) { return alvo.indexOf(w) !== -1; });
    };
    var buscaEl = document.getElementById('mnrt-busca');
    buscaEl.oninput = function() { filtroTxt = buscaEl.value; desenhar(); };
    var resumoEl = document.getElementById('mnrt-resumo');
    var atualizarResumo = function() {
        var idsSel = Object.keys(sel).filter(function(k) { return sel[k]; });
        if (!idsSel.length) {
            resumoEl.style.background = '#fef2f2';
            resumoEl.style.border = '1px solid #fecaca';
            resumoEl.style.color = '#991b1b';
            resumoEl.innerHTML = '<i class="ph ph-warning"></i> Selecione ao menos um serviço para receber o rateio.';
        } else if (idsSel.length === 1) {
            var sv = servs.find(function(s) { return String(s.id) === String(idsSel[0]); });
            resumoEl.style.background = '#ecfdf5';
            resumoEl.style.border = '1px solid #a7f3d0';
            resumoEl.style.color = '#065f46';
            resumoEl.innerHTML = '<i class="ph ph-check-circle"></i> <b>1 serviço selecionado</b> (' + esc(sv ? sv.nome : '') + '): receberá 100% do total da nota (<b>' + window._mnFmtMoeda(valNum) + '</b>).';
        } else {
            resumoEl.style.background = '#eff6ff';
            resumoEl.style.border = '1px solid #bfdbfe';
            resumoEl.style.color = '#1e40af';
            resumoEl.innerHTML = '<i class="ph ph-arrows-split"></i> <b>' + idsSel.length + ' serviços selecionados</b>: o total de <b>' + window._mnFmtMoeda(valNum) + '</b> será rateado em <b>' + window._mnFmtMoeda(valNum / idsSel.length) + '</b> para cada serviço.';
        }
    };
    var desenhar = function() {
        chkAll.checked = servs.length > 0 && servs.every(function(s) { return !!sel[s.id]; });
        lista.innerHTML = ordem.map(function(k, gi) {
            var gruposK = grupos[k].filter(passa);
            if (!gruposK.length) return '';
            var todos = gruposK.every(function(s) { return sel[s.id]; });
            var ico = window._mnCatMeta ? window._mnCatMeta(k).icone : 'ph-wrench';
            return '<div style="border:1px solid #e2e8f0;border-radius:10px;margin-bottom:8px;overflow:hidden;">'
              + '<label style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f1f5f9;font-size:0.76rem;font-weight:800;color:#475569;text-transform:uppercase;cursor:pointer;">'
              +   '<input type="checkbox" data-rtcat="' + gi + '"' + (todos ? ' checked' : '') + ' style="width:15px;height:15px;accent-color:#2563eb;"> <i class="ph ' + esc(ico) + '" style="color:#d97706;font-size:1rem;"></i> ' + esc(k)
              +   ' <span style="font-weight:600;text-transform:none;color:#94a3b8;">(todos desta subcategoria)</span></label>'
              + gruposK.map(function(s) {
                    return '<label style="display:flex;align-items:center;gap:8px;padding:6px 12px 6px 28px;font-size:0.85rem;color:#1e293b;cursor:pointer;">'
                      + '<input type="checkbox" data-rtid="' + s.id + '"' + (sel[s.id] ? ' checked' : '') + ' style="width:15px;height:15px;accent-color:#2563eb;"> ' + esc(s.nome) + '</label>';
                }).join('')
              + '</div>';
        }).join('');
        lista.querySelectorAll('[data-rtid]').forEach(function(c) { c.onchange = function() { sel[c.getAttribute('data-rtid')] = c.checked; desenhar(); }; });
        lista.querySelectorAll('[data-rtcat]').forEach(function(c) {
            c.onchange = function() { grupos[ordem[parseInt(c.getAttribute('data-rtcat'))]].filter(passa).forEach(function(s) { sel[s.id] = c.checked; }); desenhar(); };
        });
        atualizarResumo();
    };
    window._mnMask(valEl, function(n) { valNum = n; atualizarResumo(); });
    chkAll.onchange = function() {
        var v = chkAll.checked;
        servs.forEach(function(s) { sel[s.id] = v; });
        desenhar();
    };
    desenhar();
    document.getElementById('mnrt-x').onclick = fechar;
    document.getElementById('mnrt-cancel').onclick = fechar;
    pop.addEventListener('mousedown', function(e) { if (e.target === pop) fechar(); });
    document.getElementById('mnrt-ok').onclick = function() {
        var escolhidos = Object.keys(sel).filter(function(k) { return sel[k]; }).map(function(k) { return parseInt(k); });
        if (!escolhidos.length) { alert('Selecione ao menos um serviço.'); return; }
        window._mnMo.rateioTotalServicos = escolhidos;
        var linhasComValor = (window._mnMo.linhas || []).filter(function(l) { return (Number(l.valor) || 0) > 0 || String(l.descricao || '').trim(); });
        var somaLinhas = (window._mnMo.linhas || []).reduce(function(t, l) { return t + (Number(l.valor) || 0); }, 0);
        if (!linhasComValor.length || (valNum > 0 && Math.abs(valNum - somaLinhas) >= 0.01 && window._mnMo.linhas.length <= 1)) {
            var descPadrao = (window._mnMo.linhas[0] && String(window._mnMo.linhas[0].descricao || '').trim()) || 'Mão de obra (total da nota)';
            window._mnMo.linhas = [{ descricao: descPadrao, valor: valNum, ratear: 0, servicos: escolhidos.slice() }];
        } else {
            window._mnMo.linhas.forEach(function(l) {
                l.ratear = 0;
                l.servicos = escolhidos.slice();
            });
        }
        fechar();
        window._mnoRenderLinhas();
    };
};

// Popup da NOTA FISCAL / RECIBO DE MAO DE OBRA: anexa o PDF (com ou sem leitura de NF), edita linhas e vincula aos servicos
window._mnoFechar = function() { var p = document.getElementById('mno-pop'); if (p) p.remove(); };
window._mnEdAbrirMoNf = async function(editNotaId) {
    if (editNotaId && typeof editNotaId === 'object') editNotaId = null;
    try { await window._mnEdGarantirId(); await window._mnEdSalvarDetalhe(); } catch (e) { alert(e.message); return; }
    window._mnEdRenderServ();
    var ed = window._mnEd, esc = window._mnEdEsc;
    if (!ed.realizados.length) { alert('Adicione primeiro os serviços realizados para poder vincular a mão de obra a eles.'); return; }
    window._mnoFechar();
    var notaEdit = (editNotaId && editNotaId !== 'sem_nota') ? (ed.notas || []).find(function(n) { return String(n.id) === String(editNotaId); }) : null;
    var linhasIniciais = [];
    if (editNotaId) {
        var filtradas = (ed.mo || []).filter(function(l) {
            return editNotaId === 'sem_nota' ? !l.nota_id : String(l.nota_id) === String(editNotaId);
        });
        linhasIniciais = filtradas.map(function(l) {
            return {
                descricao: l.descricao || '',
                valor: Number(l.valor) || 0,
                ratear: l.ratear ? 1 : 0,
                servicos: Array.isArray(l.servicos) ? l.servicos.slice() : []
            };
        });
        if (!linhasIniciais.length && notaEdit) {
            linhasIniciais.push({
                descricao: notaEdit.fornecedor ? ('Mão de obra - ' + notaEdit.fornecedor) : 'Mão de obra',
                valor: Number(notaEdit.valor_total) || 0,
                ratear: 0,
                servicos: []
            });
        }
    }
    if (!linhasIniciais.length) {
        linhasIniciais.push({ descricao: '', valor: 0, ratear: 0, servicos: [] });
    }
    window._mnMo = {
        editNotaId: editNotaId || null,
        arquivo: null,
        cnpj: notaEdit ? (notaEdit.cnpj || '') : '',
        linhas: linhasIniciais,
        rateioTotalServicos: null
    };
    var bannerAnexo = '';
    if (notaEdit && (notaEdit.r2_key || notaEdit.nome_arquivo || notaEdit.numero)) {
        var nomeAnexo = notaEdit.nome_arquivo || (notaEdit.numero ? ('NF ' + notaEdit.numero) : 'PDF anexado');
        bannerAnexo = '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;margin-bottom:10px;font-size:0.82rem;color:#1e40af;">'
          + '<span><i class="ph ph-paperclip"></i> Anexo atual: <b>' + esc(nomeAnexo) + '</b> (selecione outro PDF abaixo apenas se quiser substituí-lo)</span>'
          + '<button type="button" id="mno-ver-atual" style="padding:5px 10px;border:1px solid #93c5fd;border-radius:6px;background:#fff;color:#2563eb;cursor:pointer;font-weight:700;font-size:0.76rem;display:inline-flex;align-items:center;gap:4px;"><i class="ph ph-eye"></i> Ver PDF</button>'
          + '</div>';
    }
    var ipt = 'padding:8px 10px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.86rem;outline:none;box-sizing:border-box;font-family:inherit;background:#fff;';
    var pop = document.createElement('div');
    pop.id = 'mno-pop';
    pop.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.6);display:flex;align-items:center;justify-content:center;z-index:10002;padding:16px;';
    pop.innerHTML = '<div style="background:#fff;border-radius:16px;width:100%;max-width:980px;max-height:94vh;display:flex;flex-direction:column;box-shadow:0 25px 60px rgba(0,0,0,0.3);">'
      + '<div style="background:linear-gradient(135deg,#1e293b,#334155);padding:16px 20px;border-radius:16px 16px 0 0;display:flex;align-items:center;gap:12px;flex-shrink:0;">'
      +   '<div style="background:#d97706;border-radius:10px;width:38px;height:38px;display:flex;align-items:center;justify-content:center;"><i class="ph ph-hammer" style="color:#fff;font-size:1.3rem;"></i></div>'
      +   '<div><div style="color:#fff;font-weight:700;">' + (editNotaId ? 'Editar mão de obra e vinculação aos serviços' : 'Nota fiscal / Recibo de mão de obra') + '</div><div style="color:rgba(255,255,255,0.7);font-size:0.8rem;">Confira ou altere as linhas e clique em "Vincular a serviços" ou "Ratear total da nota"</div></div>'
      +   '<button type="button" id="mno-x" style="margin-left:auto;background:rgba(255,255,255,0.15);border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;color:#fff;"><i class="ph ph-x"></i></button>'
      + '</div>'
      + '<div style="padding:16px 20px;overflow-y:auto;flex:1;">'
      +   bannerAnexo
      +   '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">'
      +     '<input type="file" id="mno-file" accept="application/pdf,.pdf" style="flex:1;min-width:240px;padding:8px;border:1.5px dashed #cbd5e1;border-radius:8px;background:#f8fafc;font-size:0.84rem;">'
      +     '<button type="button" id="mno-analisar" style="padding:9px 18px;border:none;border-radius:8px;background:#d97706;color:#fff;cursor:pointer;font-weight:700;display:flex;align-items:center;gap:6px;"><i class="ph ph-scan"></i> Analisar nota fiscal</button>'
      +   '</div>'
      +   '<div style="font-size:0.75rem;color:#64748b;margin-top:4px;">Se o arquivo for um recibo/comprovante sem nota fiscal, basta escolher o PDF acima e preencher os valores abaixo (não precisa clicar em "Analisar nota fiscal").</div>'
      +   '<div id="mno-aviso" style="margin-top:10px;"></div>'
      +   '<div style="display:grid;grid-template-columns:140px 1fr 140px;gap:10px;margin-top:12px;">'
      +     '<div><label style="font-size:0.72rem;font-weight:700;color:#64748b;display:block;margin-bottom:3px;">Nº da nota / recibo</label><input type="text" id="mno-num" value="' + esc(notaEdit ? (notaEdit.numero || '') : '') + '" placeholder="Opcional" style="' + ipt + 'width:100%;"></div>'
      +     '<div><label style="font-size:0.72rem;font-weight:700;color:#64748b;display:block;margin-bottom:3px;">Prestador (fornecedor)</label><input type="text" id="mno-forn" value="' + esc(notaEdit ? (notaEdit.fornecedor || '') : '') + '" style="' + ipt + 'width:100%;"></div>'
      +     '<div><label style="font-size:0.72rem;font-weight:700;color:#64748b;display:block;margin-bottom:3px;">Emissão</label><input type="text" id="mno-emi" value="' + esc(notaEdit ? (notaEdit.data_emissao || '') : '') + '" placeholder="dd/mm/aaaa" style="' + ipt + 'width:100%;"></div>'
      +   '</div>'
      +   '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:16px 0 8px;">'
      +     '<div style="font-size:0.8rem;font-weight:800;color:#1e293b;text-transform:uppercase;">Linhas de serviço da nota</div>'
      +     '<button type="button" id="mno-ratear-total" style="padding:7px 14px;border:1.5px solid #2563eb;border-radius:8px;background:#eff6ff;color:#2563eb;cursor:pointer;font-weight:700;font-size:0.8rem;display:inline-flex;align-items:center;gap:6px;"><i class="ph ph-arrows-split"></i> Ratear total da nota</button>'
      +   '</div>'
      +   '<div id="mno-linhas"></div>'
      +   '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:4px;">'
      +     '<button type="button" id="mno-add" style="padding:7px 14px;border:1.5px solid #cbd5e1;border-radius:8px;background:#fff;color:#475569;cursor:pointer;font-weight:600;font-size:0.8rem;"><i class="ph ph-plus"></i> Adicionar linha</button>'
      +   '</div>'
      + '</div>'
      + '<div style="padding:12px 20px;border-top:1px solid #e2e8f0;display:flex;align-items:center;gap:10px;flex-shrink:0;flex-wrap:wrap;">'
      +   '<div id="mno-total" style="font-size:0.88rem;color:#334155;"></div>'
      +   '<button type="button" id="mno-salvar" style="margin-left:auto;padding:10px 22px;border:none;border-radius:8px;background:#2563eb;color:#fff;cursor:pointer;font-weight:700;display:flex;align-items:center;gap:6px;"><i class="ph ph-floppy-disk"></i> ' + (editNotaId ? 'Salvar alterações' : 'Salvar nota e linhas') + '</button>'
      + '</div></div>';
    document.body.appendChild(pop);
    document.getElementById('mno-x').onclick = window._mnoFechar;
    pop.addEventListener('mousedown', function(e) { if (e.target === pop) window._mnoFechar(); });
    if (document.getElementById('mno-ver-atual') && notaEdit) {
        document.getElementById('mno-ver-atual').onclick = function() { window._mnEdVerNota(notaEdit.id); };
    }
    document.getElementById('mno-file').onchange = function() { window._mnMo.arquivo = this.files[0] || null; };
    document.getElementById('mno-analisar').onclick = window._mnoAnalisar;
    document.getElementById('mno-ratear-total').onclick = window._mnoRatearTotalPopup;
    document.getElementById('mno-add').onclick = function() { window._mnMo.linhas.push({ descricao: '', valor: 0, ratear: 0, servicos: [] }); window._mnoRenderLinhas(); };
    document.getElementById('mno-salvar').onclick = window._mnoSalvar;
    window._mnoRenderLinhas();
};

window._mnoRenderLinhas = function() {
    var box = document.getElementById('mno-linhas'), esc = window._mnEdEsc, fm = window._mnMoneyFmt;
    if (!box) return;
    var L = window._mnMo.linhas;
    var ipt = 'padding:6px 8px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.84rem;outline:none;box-sizing:border-box;font-family:inherit;background:#fff;';
    box.innerHTML = L.map(function(l, i) {
        var rv = window._mnEdResumoVinculo(l);
        return '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 10px;border:1px solid #fde68a;border-radius:8px;background:#fffbeb;margin-bottom:6px;">'
          + '<input type="text" data-li="' + i + '" data-lf="descricao" value="' + esc(l.descricao) + '" placeholder="Serviço executado" style="' + ipt + 'flex:1;min-width:240px;">'
          + '<span style="font-size:0.78rem;color:#64748b;">R$</span>'
          + '<input type="text" data-money="1" data-li="' + i + '" data-lf="valor" value="' + fm(l.valor) + '" style="' + ipt + 'width:110px;text-align:right;font-weight:700;color:#b45309;">'
          + '<button type="button" data-lvinc="' + i + '" style="padding:6px 10px;border:1.5px solid ' + rv.cor + ';border-radius:8px;background:#fff;color:' + rv.cor + ';cursor:pointer;font-weight:700;font-size:0.76rem;display:inline-flex;align-items:center;gap:5px;"><i class="ph ph-link"></i> ' + esc(rv.txt) + '</button>'
          + '<button type="button" data-lrm="' + i + '" title="Remover linha" style="padding:5px 8px;border:1px solid #fecaca;border-radius:6px;background:#fef2f2;color:#dc2626;cursor:pointer;"><i class="ph ph-trash"></i></button>'
          + '</div>';
    }).join('');
    box.querySelectorAll('[data-li]').forEach(function(el) {
        var i = parseInt(el.getAttribute('data-li')), f = el.getAttribute('data-lf');
        if (f === 'valor') window._mnMask(el, function(n) { window._mnMo.linhas[i].valor = n; window._mnoTotal(); });
        else el.oninput = function() { window._mnMo.linhas[i].descricao = el.value; };
    });
    box.querySelectorAll('[data-lvinc]').forEach(function(b) {
        b.onclick = function() { window._mnVincularPopup(window._mnMo.linhas[parseInt(b.getAttribute('data-lvinc'))], window._mnoRenderLinhas); };
    });
    box.querySelectorAll('[data-lrm]').forEach(function(b) {
        b.onclick = function() { window._mnMo.linhas.splice(parseInt(b.getAttribute('data-lrm')), 1); window._mnoRenderLinhas(); };
    });
    window._mnoTotal();
};
window._mnoTotal = function() {
    var el = document.getElementById('mno-total'); if (!el) return;
    var soma = window._mnMo.linhas.reduce(function(t, l) { return t + (Number(l.valor) || 0); }, 0);
    el.innerHTML = 'Total das linhas: <b style="color:#b45309;">' + window._mnFmtMoeda(soma) + '</b>';
};

window._mnoAnalisar = async function() {
    var ed = window._mnEd, esc = window._mnEdEsc;
    var fileEl = document.getElementById('mno-file'), btn = document.getElementById('mno-analisar'), aviso = document.getElementById('mno-aviso');
    var f = fileEl.files[0];
    if (!f) { alert('Escolha o PDF da nota fiscal.'); return; }
    window._mnMo.arquivo = f;
    btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Analisando...';
    try {
        var fd = new FormData(); fd.append('arquivo', f);
        var r = await fetch('/api/frota/manutencoes/' + ed.id + '/notas-mo/analisar', { method: 'POST', headers: { Authorization: 'Bearer ' + window._mnEdTok() }, body: fd });
        var d = await r.json().catch(function() { return {}; });
        if (!r.ok) throw new Error(d.error || 'Erro ao analisar a nota');
        document.getElementById('mno-num').value = d.numero || '';
        document.getElementById('mno-forn').value = d.fornecedor || '';
        document.getElementById('mno-emi').value = d.emissao || '';
        window._mnMo.cnpj = d.cnpj || '';
        window._mnMo.linhas = (d.itens || []).map(function(i) { return { descricao: i.descricao || 'Mão de obra', valor: i.valor, ratear: 0, servicos: [] }; });
        if (!window._mnMo.linhas.length) window._mnMo.linhas.push({ descricao: d.fornecedor ? ('Mão de obra - ' + d.fornecedor) : 'Mão de obra', valor: d.valor_total || 0, ratear: 0, servicos: [] });
        var av = (d.avisos || []).map(function(a) { return esc(a); }).join('<br>');
        aviso.innerHTML = av ? '<div style="background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:8px;padding:8px 12px;font-size:0.82rem;"><i class="ph ph-warning"></i> ' + av + '</div>'
            : '<div style="background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;border-radius:8px;padding:8px 12px;font-size:0.82rem;"><i class="ph ph-check-circle"></i> Nota lida. Confira os valores e use "Vincular a serviços" ou "Ratear total da nota".</div>';
        window._mnoRenderLinhas();
    } catch (err) {
        aviso.innerHTML = '<div style="background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:8px;padding:8px 12px;font-size:0.82rem;"><i class="ph ph-info"></i> Não foi possível ler itens automáticos deste PDF (' + esc(err.message) + '). O PDF continuará anexado como recibo/comprovante — preencha as linhas abaixo manualmente.</div>';
        if (!window._mnMo.linhas.length) window._mnMo.linhas.push({ descricao: '', valor: 0, ratear: 0, servicos: [] });
        window._mnoRenderLinhas();
    }
    btn.disabled = false; btn.innerHTML = '<i class="ph ph-scan"></i> Analisar nota fiscal';
};

window._mnoSalvar = async function() {
    var ed = window._mnEd;
    var fileEl = document.getElementById('mno-file');
    var arq = window._mnMo.arquivo || (fileEl && fileEl.files && fileEl.files[0]) || null;
    window._mnMo.arquivo = arq;
    var servsValidos = (ed.realizados || []).filter(function(s) { return s.id; });
    window._mnMo.linhas.forEach(function(l) {
        if (!String(l.descricao || '').trim() && Number(l.valor) > 0) l.descricao = 'Mão de obra';
        if (!l.ratear && !(l.servicos || []).length && servsValidos.length === 1) {
            l.servicos = [servsValidos[0].id];
        }
    });
    var linhas = window._mnMo.linhas.filter(function(l) { return String(l.descricao || '').trim() || Number(l.valor) > 0; });
    if (!linhas.length) { alert('Informe ao menos uma linha de serviço com valor.'); return; }
    var semVinculo = linhas.some(function(l) { return !l.ratear && !(l.servicos || []).length; });
    if (semVinculo) {
        alert('Vincule as linhas aos serviços realizados clicando em "Vincular a serviços" na linha ou no botão "Ratear total da nota".');
        return;
    }
    var editId = window._mnMo && window._mnMo.editNotaId;
    if (!editId && !arq && !confirm('Nenhum PDF foi anexado. As linhas serão lançadas como mão de obra sem anexo. Continuar?')) return;
    var btn = document.getElementById('mno-salvar');
    btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...';
    try {
        var fd = new FormData();
        if (arq) fd.append('arquivo', arq);
        var soma = linhas.reduce(function(t, l) { return t + (Number(l.valor) || 0); }, 0);
        fd.append('dados', JSON.stringify({
            numero: document.getElementById('mno-num').value.trim(),
            fornecedor: document.getElementById('mno-forn').value.trim(),
            data_emissao: document.getElementById('mno-emi').value.trim(),
            cnpj: window._mnMo.cnpj || '',
            valor_total: soma,
            linhas: linhas.map(function(l) { return { descricao: l.descricao, valor: Number(l.valor) || 0, ratear: l.ratear ? 1 : 0, servicos: l.servicos || [] }; })
        }));
        var urlMo = editId
            ? ('/api/frota/manutencoes/' + ed.id + '/notas-mo/' + editId)
            : ('/api/frota/manutencoes/' + ed.id + '/notas-mo');
        var r = await fetch(urlMo, { method: editId ? 'PUT' : 'POST', headers: { Authorization: 'Bearer ' + window._mnEdTok() }, body: fd });
        if (!r.ok) { var e = await r.json().catch(function() { return {}; }); throw new Error(e.error || 'Erro ao salvar a nota'); }
        await window._mnEdRecarregarDetalhe();
        window._mnoFechar();
        window._mnEdRenderServ();
        window._mnEdRenderNotas();
        window._mnEdRenderMo();
        window._mnEdRenderHist();
        if (typeof mostrarToastAviso === 'function') mostrarToastAviso(editId ? '✅ Mão de obra atualizada!' : '✅ Mão de obra lançada!');
    } catch (err) {
        btn.disabled = false; btn.innerHTML = '<i class="ph ph-floppy-disk"></i> ' + (editId ? 'Salvar alterações' : 'Salvar nota e linhas');
        alert(err.message);
    }
};

window._mnEdRenderTotais = function() {
    var ed = window._mnEd, box = document.getElementById('mned-total');
    if (!box) return;
    var mo = 0, pc = 0;
    if ((ed.mo || []).length > 0) {
        (ed.mo || []).forEach(function(l) { mo += Number(l.valor) || 0; });
    } else {
        (ed.realizados || []).forEach(function(s) { mo += window._mnNum(s.mao_obra); });
    }
    (ed.pecas || []).forEach(function(p) { pc += Number(p.valor_total) || 0; });
    var legado = (!ed.realizados.length && !(ed.pecas || []).length && !(ed.mo || []).length && Number(ed.m.custo) > 0);
    var total = legado ? Number(ed.m.custo) : (mo + pc);
    box.innerHTML = '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:0.9rem;">'
        + '<div style="font-size:0.78rem;font-weight:800;color:#1e293b;text-transform:uppercase;margin-bottom:8px;">Valores da Manutenção (somente visualização — vêm das notas anexadas e das linhas manuais)</div>'
        + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;">'
        +   '<div style="background:#dbeafe;border:1.5px solid #60a5fa;border-radius:10px;padding:10px 12px;"><label style="font-size:0.72rem;font-weight:800;color:#1e40af;display:block;margin-bottom:4px;">Valor de Peças (R$)</label><input type="number" step="0.01" readonly tabindex="-1" value="' + Number(pc || 0).toFixed(2) + '" style="width:100%;padding:0.45rem;border:1px solid #93c5fd;border-radius:8px;font-size:0.95rem;box-sizing:border-box;background:#eff6ff;font-weight:800;color:#1d4ed8;cursor:default;"></div>'
        +   '<div style="background:#e0f2fe;border:1.5px solid #38bdf8;border-radius:10px;padding:10px 12px;"><label style="font-size:0.72rem;font-weight:800;color:#075985;display:block;margin-bottom:4px;">Valor Mão de Obra / Serviço (R$)</label><input type="number" step="0.01" readonly tabindex="-1" value="' + Number(mo || 0).toFixed(2) + '" style="width:100%;padding:0.45rem;border:1px solid #7dd3fc;border-radius:8px;font-size:0.95rem;box-sizing:border-box;background:#f0f9ff;font-weight:800;color:#0369a1;cursor:default;"></div>'
        +   '<div style="background:#dcfce7;border:1.5px solid #4ade80;border-radius:10px;padding:10px 12px;"><label style="font-size:0.72rem;font-weight:800;color:#166534;display:block;margin-bottom:4px;">Valor Total da Manutenção (R$)</label><input type="number" step="0.01" readonly tabindex="-1" value="' + Number(total || 0).toFixed(2) + '" style="width:100%;padding:0.45rem;border:1px solid #86efac;border-radius:8px;font-size:0.95rem;box-sizing:border-box;background:#f0fdf4;font-weight:900;color:#15803d;cursor:default;"></div>'
        + '</div>'
        + (legado ? '<div style="margin-top:8px;font-size:0.74rem;color:#94a3b8;">Total lançado antes do detalhamento por serviço. Ao informar serviços e notas, o total passa a ser calculado automaticamente.</div>' : '')
        + '<div id="mned-custos-serv" style="margin-top:10px;"></div>'
        + '</div>';
    if (typeof window._mnEdAtualizarCustosPreview === 'function') window._mnEdAtualizarCustosPreview();
};

window._mnEdAbrirLista = function() {
    var cats = window._manutCategorias || [];
    var ed = window._mnEd, esc = window._mnEdEsc;
    var grupos = window._mnMontarGruposCategorias(cats);
    var nomesLista = [];
    grupos.forEach(function(g) { g.itens.forEach(function(it) { nomesLista.push(it.nome); }); });
    var marcados = [], extras = [], temOutros = false, textoOutros = '';
    ed.solicitados.forEach(function(n) {
        if (n === 'Outros' || n.indexOf('Outros:') === 0) { temOutros = true; textoOutros = n.replace(/^Outros:?\s*/, ''); }
        else if (nomesLista.indexOf(n) === -1) extras.push(n);
        else marcados.push(n);
    });
    var lista = grupos.map(function(g) {
        var gIco = g.icone || 'ph-wrench';
        return '<p style="margin:14px 0 6px;font-size:0.76rem;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.05em;display:flex;align-items:center;gap:6px;"><i class="ph ' + esc(gIco) + '" style="font-size:1.05rem;color:#d97706;"></i><span>' + esc(g.grupo) + '</span></p>'
          + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">'
          + g.itens.map(function(it) {
                var chk = (it.nome === 'Outros' ? temOutros : marcados.indexOf(it.nome) !== -1) ? ' checked' : '';
                return '<label style="display:flex;align-items:center;gap:8px;padding:7px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.82rem;cursor:pointer;background:#f8fafc;user-select:none;">'
                  + '<input type="checkbox" data-nome="' + esc(it.nome) + '"' + chk + ' style="width:16px;height:16px;accent-color:#d97706;flex-shrink:0;">'
                  + '<i class="ph ' + esc(it.icone) + '" style="font-size:1.05rem;color:#d97706;flex-shrink:0;"></i><span>' + esc(it.rotulo || it.nome) + '</span></label>';
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
    };
};

window._mnEdTok = function() {
    return window._manutTok || window.currentToken || localStorage.getItem('token');
};

// Salva servicos, mao de obra, garantia, pecas e linhas de mao de obra e devolve os ids gravados
window._mnEdSalvarDetalhe = async function() {
    await window._mnEdGarantirId();
    var ed = window._mnEd, N = window._mnNum;
    var r = await fetch('/api/frota/manutencoes/' + ed.id + '/detalhe', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + window._mnEdTok() },
        body: JSON.stringify({
            solicitados: ed.solicitados,
            realizados: ed.realizados.map(function(s) {
                return { id: s.id, tmp_id: s._tmpId || null, nome: s.nome, catalogo_id: s.catalogo_id, item_ref: s.item_ref, mao_obra: N(s.mao_obra), mao_obra_informado: (s.mao_obra_informado || N(s.mao_obra) > 0) ? 1 : 0, garantia_valor: s.garantia_valor, garantia_unidade: s.garantia_unidade, observacao: s.observacao || '' };
            }),
            pecas: ed.pecas.map(function(p) {
                return { id: p.id, codigo: p.codigo, descricao: p.descricao, unidade: p.unidade, quantidade: N(p.quantidade) || 1, valor_unit: N(p.valor_unit), valor_total: N(p.valor_total), garantia_valor: p.garantia_valor, garantia_unidade: p.garantia_unidade, servico_id: p.servico_id };
            })
        })
    });
    if (!r.ok) { var e = await r.json().catch(function() { return {}; }); throw new Error(e.error || 'Erro ao salvar os serviços'); }
    var j = await r.json();
    ed.realizados = (j.realizados || []).map(window._mnEdMapRealizado);
    ed.pecas = j.pecas || [];
    ed.mo = (j.mo || []).map(window._mnEdMapMo);
    return j;
};

// Recarrega tudo do servidor (apos incluir/excluir nota, pecas ou mao de obra)
window._mnEdRecarregarDetalhe = async function() {
    var ed = window._mnEd;
    var r = await fetch('/api/frota/manutencoes/' + ed.id + '/detalhe', { headers: { Authorization: 'Bearer ' + window._mnEdTok() } });
    if (!r.ok) throw new Error('Erro ao recarregar a manutenção');
    var d = await r.json();
    if (d.manutencao) {
        ed.m = d.manutencao;
        if (d.manutencao.veiculo_rodando) ed.veiculo_rodando = d.manutencao.veiculo_rodando;
    }
    ed.pecas = d.pecas || [];
    ed.notas = d.notas || [];
    ed.mo = (d.mo || []).map(window._mnEdMapMo);
    ed.realizados = (d.realizados || []).map(window._mnEdMapRealizado);
    ed.historico = d.historico || [];
    ed.midias = d.midias || [];
    if (typeof window._mnEdRenderVideoGeral === 'function') window._mnEdRenderVideoGeral();
};

// ── Vídeo Geral do Veículo na Manutenção Corretiva (Cloudflare R2) ──────────
window._mnEdRenderVideoGeral = function() {
    var el = document.getElementById('mned-video-lista');
    if (!el) return;
    var ed = window._mnEd || {};
    var esc = window._mnEdEsc;
    var videos = (ed.midias || []).filter(function(m) { return m.categoria === 'video_geral'; });
    if (!videos.length) {
        el.innerHTML = '<div style="font-size:0.78rem;color:#dc2626;font-weight:700;padding:4px 0;"><i class="ph ph-warning-circle"></i> Nenhum vídeo geral anexado ainda (obrigatório para mudar a situação para Concluído).</div>';
        return;
    }
    var secVid = document.getElementById('mned-sec-video');
    if (secVid) { secVid.style.borderColor = '#e2e8f0'; secVid.style.background = '#fff'; }
    el.innerHTML = videos.map(function(v) {
        var url = v.url || ('/api/frota/manutencoes/midias/' + v.id + '/arquivo');
        return '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;background:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;padding:8px 12px;">'
            + '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">'
            +   '<video src="' + esc(url) + '" controls preload="metadata" style="width:240px;max-width:100%;height:135px;border-radius:8px;background:#0f172a;object-fit:cover;"></video>'
            +   '<div>'
            +     '<div style="font-size:0.82rem;font-weight:800;color:#15803d;display:flex;align-items:center;gap:5px;"><i class="ph ph-check-circle"></i> Vídeo geral anexado</div>'
            +     '<div style="font-size:0.75rem;color:#475569;margin-top:2px;">' + esc(v.nome_arquivo || 'video.mp4') + '</div>'
            +     '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">'
            +       '<a href="' + esc(url) + '" target="_blank" rel="noopener" style="background:#0284c7;color:#fff;text-decoration:none;border-radius:6px;padding:4px 10px;font-size:0.74rem;font-weight:700;display:inline-flex;align-items:center;gap:4px;"><i class="ph ph-arrow-square-out"></i> Abrir vídeo</a>'
            +       '<button type="button" onclick="window._mnEdExcluirMidia(' + v.id + ')" style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:6px;padding:4px 10px;font-size:0.74rem;font-weight:700;cursor:pointer;">Excluir vídeo</button>'
            +     '</div>'
            +   '</div>'
            + '</div>'
            + '</div>';
    }).join('');
};

window._mnEdAnexarVideoGeral = async function(inp) {
    var file = inp && inp.files && inp.files[0];
    if (!file) return;
    var lbl = document.getElementById('mned-lbl-video');
    if (lbl) { lbl.style.opacity = '0.6'; lbl.style.pointerEvents = 'none'; }
    var listaEl = document.getElementById('mned-video-lista');
    if (listaEl) listaEl.innerHTML = '<div style="font-size:0.8rem;color:#0284c7;font-weight:700;padding:6px 0;"><i class="ph ph-circle-notch ph-spin"></i> Enviando vídeo geral do veículo para o Cloudflare R2... aguarde.</div>';
    try {
        await window._mnEdGarantirId();
        var ed = window._mnEd;
        var fd = new FormData();
        fd.append('arquivo', file);
        var r = await fetch('/api/frota/manutencoes/' + ed.id + '/midias', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + window._mnEdTok() },
            body: fd
        });
        var j = await r.json().catch(function() { return {}; });
        if (!r.ok) throw new Error(j.error || 'Erro ao enviar vídeo para o R2');
        await window._mnEdRecarregarDetalhe();
        window._mnEdRenderHist();
        if (typeof mostrarToastAviso === 'function') mostrarToastAviso('\u2705 Vídeo geral do veículo anexado com sucesso!');
    } catch (e) {
        alert('Erro ao anexar vídeo: ' + e.message);
        window._mnEdRenderVideoGeral();
    } finally {
        if (inp) inp.value = '';
        if (lbl) { lbl.style.opacity = ''; lbl.style.pointerEvents = ''; }
    }
};

window._mnEdExcluirMidia = async function(midiaId) {
    if (!confirm('Deseja realmente excluir o vídeo geral anexado nesta manutenção?')) return;
    try {
        var r = await fetch('/api/frota/manutencoes/midias/' + midiaId, {
            method: 'DELETE',
            headers: { Authorization: 'Bearer ' + window._mnEdTok() }
        });
        var j = await r.json().catch(function() { return {}; });
        if (!r.ok) throw new Error(j.error || 'Erro ao excluir vídeo');
        await window._mnEdRecarregarDetalhe();
        window._mnEdRenderHist();
        if (typeof mostrarToastAviso === 'function') mostrarToastAviso('\u2705 Vídeo removido!');
    } catch (e) {
        alert('Erro ao excluir: ' + e.message);
    }
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
    if (!confirm('Deseja realmente excluir este PDF anexado e os valores lançados por ele?')) return;
    try {
        await window._mnEdSalvarDetalhe();
        var r = await fetch('/api/frota/manutencoes/notas/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + window._mnEdTok() } });
        if (!r.ok) { var e = await r.json().catch(function() { return {}; }); throw new Error(e.error || 'Erro ao excluir a nota'); }
        await window._mnEdRecarregarDetalhe();
        window._mnEdRenderServ();
        window._mnEdRenderNotas();
        window._mnEdRenderMo();
        window._mnEdRenderHist();
        if (typeof mostrarToastAviso === 'function') mostrarToastAviso('✅ Anexo excluído.');
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
    window._mnEdRenderMo();
    window._mnEdRenderHist();
    if (typeof mostrarToastAviso === 'function') mostrarToastAviso(msg);
};

window._mnpAtualizarTotal = function() {
    var el = document.getElementById('mnp-total');
    if (!el) return;
    var N = window._mnNum;
    var soma = 0, somaEstoque = 0, qtdItens = 0;
    document.querySelectorAll('#mnp-rows .mnp-row').forEach(function(r) {
        var descEl = r.querySelector('[data-k="descricao"]');
        var o = r._obj || {};
        var estEl = r.querySelector('[data-k="estoque"]');
        var ehEstoque = (estEl && estEl.checked) || !!o.estoque;
        var qEl = r.querySelector('[data-k="quantidade"]');
        var qtd = N(qEl ? qEl.value : 1) || 1;
        var vu = N(o.valor_unit);
        var vt = N(o.valor_total) || Math.round(qtd * vu * 100) / 100;
        if (ehEstoque) {
            somaEstoque += vt;
        } else {
            if ((descEl && descEl.value.trim()) || vt > 0) qtdItens++;
            soma += vt;
        }
    });
    el.innerHTML = 'Total das peças' + (qtdItens ? ' (' + qtdItens + ')' : '') + ': <b style="color:#2563eb;">' + window._mnFmtMoeda(soma) + '</b>'
        + (somaEstoque > 0 ? ' <span style="font-size:0.8rem;color:#7c3aed;font-weight:700;margin-left:8px;">(Estoque abatido: -' + window._mnFmtMoeda(somaEstoque) + ')</span>' : '');
};

window._mnpAtualizarBtnVinculo = function(row) {
    if (!row || !row._obj) return;
    var btn = row.querySelector('[data-pvinc]');
    if (!btn) return;
    if (row._obj.estoque) {
        btn.disabled = true;
        btn.style.opacity = '0.75';
        btn.style.cursor = 'default';
        btn.style.borderColor = '#ddd6fe';
        btn.style.background = '#f5f3ff';
        btn.style.color = '#7c3aed';
        btn.innerHTML = '<i class="ph ph-package"></i> Estoque (sem vínculo)';
        return;
    }
    btn.disabled = false;
    btn.style.opacity = '';
    btn.style.cursor = 'pointer';
    btn.style.background = '#fff';
    var rv = window._mnEdResumoVinculo(row._obj);
    btn.style.borderColor = rv.cor;
    btn.style.color = rv.cor;
    btn.innerHTML = '<i class="ph ph-link"></i> ' + window._mnEdEsc(rv.txt);
};

window._mnpAddLinha = function(init) {
    var box = document.getElementById('mnp-rows');
    if (!box) return;
    window._mnGarantirDatalist();
    var fm = window._mnMoneyFmt, esc = window._mnEdEsc, N = window._mnNum;
    var d = init || {};
    var qtdIni = d.quantidade !== undefined && d.quantidade !== null && d.quantidade !== '' ? N(d.quantidade) || 1 : 1;
    var vuIni = N(d.valor_unit);
    var vtIni = N(d.valor_total) || Math.round(qtdIni * vuIni * 100) / 100;
    var unidIni = String(d.unidade || 'UN').toUpperCase();
    var garVal = d.garantia_valor !== undefined && d.garantia_valor !== null ? d.garantia_valor : '';
    var garUni = d.garantia_unidade === 'meses' ? 'meses' : 'dias';
    var servicosIni = [];
    if (Array.isArray(d.servicos) && d.servicos.length) {
        servicosIni = d.servicos.map(function(x) { return parseInt(x); }).filter(Boolean);
    } else if (d.servico_id) {
        servicosIni = [parseInt(d.servico_id)];
    } else if (window._mnp && window._mnp.servicoId) {
        servicosIni = [parseInt(window._mnp.servicoId)];
    }
    var obj = {
        descricao: d.descricao || '',
        quantidade: qtdIni,
        valor_unit: vuIni,
        valor_total: vtIni,
        ratear: 0,
        estoque: !!d.estoque,
        servicos: servicosIni
    };
    var rv = window._mnEdResumoVinculo(obj);
    var ipt = 'padding:7px 9px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.83rem;outline:none;box-sizing:border-box;font-family:inherit;background:#fff;';
    var row = document.createElement('div');
    row.className = 'mnp-row';
    row.style.cssText = 'display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:8px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;margin-bottom:8px;';
    row.innerHTML = '<input type="hidden" data-k="codigo" value="' + esc(d.codigo || '') + '">'
      + '<input type="text" data-k="descricao" value="' + esc(d.descricao || '') + '" placeholder="Descrição da peça *" style="' + ipt + 'flex:2;min-width:190px;">'
      + '<input type="number" data-k="quantidade" min="0" step="1" value="' + esc(qtdIni) + '" title="Quantidade" style="' + ipt + 'width:68px;">'
      + '<input type="text" list="mn-unidades" data-k="unidade" value="' + esc(unidIni) + '" placeholder="Un." title="Unidade de medida" style="' + ipt + 'width:56px;text-transform:uppercase;">'
      + '<span style="font-size:0.78rem;color:#64748b;">× R$</span>'
      + '<input type="text" data-k="valor_unit" value="' + fm(vuIni) + '" title="Valor unitário" style="' + ipt + 'width:98px;text-align:right;">'
      + '<span style="font-size:0.78rem;color:#64748b;">= R$</span>'
      + '<input type="text" data-k="valor_total" value="' + fm(vtIni) + '" title="Total" style="' + ipt + 'width:106px;text-align:right;font-weight:700;color:#2563eb;">'
      + '<input type="number" data-k="garantia_valor" min="0" step="1" value="' + esc(garVal) + '" placeholder="Garantia" title="Garantia da peça" style="' + ipt + 'width:80px;">'
      + '<select data-k="garantia_unidade" style="' + ipt + '"><option value="dias"' + (garUni !== 'meses' ? ' selected' : '') + '>dias</option><option value="meses"' + (garUni === 'meses' ? ' selected' : '') + '>meses</option></select>'
      + '<label data-lbl-estoque="1" style="display:inline-flex;align-items:center;gap:5px;padding:6px 10px;border:1.5px solid ' + (obj.estoque ? '#7c3aed' : '#cbd5e1') + ';border-radius:8px;background:' + (obj.estoque ? '#f5f3ff' : '#fff') + ';color:' + (obj.estoque ? '#7c3aed' : '#475569') + ';cursor:pointer;font-weight:700;font-size:0.76rem;" title="Peça comprada para estoque (não precisa vincular a serviço, valor subtraído da manutenção e não salva na lista)"><input type="checkbox" data-k="estoque"' + (obj.estoque ? ' checked' : '') + ' style="accent-color:#7c3aed;margin:0;"> Estoque</label>'
      + '<button type="button" data-pvinc="1" style="padding:6px 10px;border:1.5px solid ' + rv.cor + ';border-radius:8px;background:#fff;color:' + rv.cor + ';cursor:pointer;font-weight:700;font-size:0.76rem;display:inline-flex;align-items:center;gap:5px;"><i class="ph ph-link"></i> ' + esc(rv.txt) + '</button>'
      + '<button type="button" data-x="1" title="Remover linha" style="padding:6px 9px;border:1px solid #fecaca;border-radius:8px;background:#fef2f2;color:#dc2626;cursor:pointer;"><i class="ph ph-trash"></i></button>';
    box.appendChild(row);
    row._obj = obj;
    var descEl = row.querySelector('[data-k="descricao"]');
    var q = row.querySelector('[data-k="quantidade"]'), un = row.querySelector('[data-k="valor_unit"]'), tt = row.querySelector('[data-k="valor_total"]');
    var estChk = row.querySelector('[data-k="estoque"]'), estLbl = row.querySelector('[data-lbl-estoque]');
    var sync = function(campo) {
        window._mnCalcPeca(obj, campo);
        if (campo !== 'valor_unit') un.value = fm(obj.valor_unit);
        if (campo !== 'valor_total') tt.value = fm(obj.valor_total);
        window._mnpAtualizarTotal();
    };
    if (descEl) descEl.addEventListener('input', function() { obj.descricao = descEl.value; window._mnpAtualizarTotal(); });
    q.addEventListener('input', function() { obj.quantidade = q.value; sync('quantidade'); });
    window._mnMask(un, function(n) { obj.valor_unit = n; sync('valor_unit'); });
    window._mnMask(tt, function(n) { obj.valor_total = n; sync('valor_total'); });
    if (estChk) {
        estChk.addEventListener('change', function() {
            obj.estoque = estChk.checked;
            if (estLbl) {
                estLbl.style.borderColor = obj.estoque ? '#7c3aed' : '#cbd5e1';
                estLbl.style.background = obj.estoque ? '#f5f3ff' : '#fff';
                estLbl.style.color = obj.estoque ? '#7c3aed' : '#475569';
            }
            row.style.background = obj.estoque ? '#faf5ff' : '#f8fafc';
            window._mnpAtualizarBtnVinculo(row);
            window._mnpAtualizarTotal();
        });
    }
    row.querySelector('[data-pvinc]').onclick = function() {
        if (obj.estoque) return;
        obj.descricao = descEl ? (descEl.value.trim() || 'Peça da manutenção') : 'Peça da manutenção';
        window._mnVincularPopup(obj, function() { window._mnpAtualizarBtnVinculo(row); });
    };
    row.querySelector('[data-x]').onclick = function() { row.remove(); window._mnpAtualizarTotal(); };
    window._mnpAtualizarBtnVinculo(row);
    window._mnpAtualizarTotal();
};

// Popup "Ratear total da nota" para PECAS: divide o valor total das pecas (ou da nota) entre os servicos selecionados
window._mnpRatearTotalPopup = function() {
    var ed = window._mnEd, esc = window._mnEdEsc, fm = window._mnMoneyFmt, N = window._mnNum;
    var servs = (ed.realizados || []).filter(function(s) { return s.id; });
    if (!servs.length) { alert('Adicione primeiro os serviços realizados na manutenção para vincular/ratear as peças.'); return; }
    var antigo = document.getElementById('mnprt-pop'); if (antigo) antigo.remove();
    var somaAtual = 0;
    document.querySelectorAll('#mnp-rows .mnp-row').forEach(function(r) {
        var o = r._obj || {};
        var estEl = r.querySelector('[data-k="estoque"]');
        if ((estEl && estEl.checked) || o.estoque) return;
        var qEl = r.querySelector('[data-k="quantidade"]');
        var qtd = N(qEl ? qEl.value : 1) || 1;
        var vu = N(o.valor_unit);
        var vt = N(o.valor_total) || Math.round(qtd * vu * 100) / 100;
        somaAtual += vt;
    });
    var sel = {};
    var prevSel = (window._mnp && window._mnp.rateioTotalServicos) || [];
    if (prevSel.length) {
        prevSel.forEach(function(id) { sel[id] = true; });
    } else {
        servs.forEach(function(s) { sel[s.id] = true; });
    }
    var grupos = {}, ordem = [];
    servs.forEach(function(s) {
        var k = s.item_ref || 'Sem categoria';
        if (!grupos[k]) { grupos[k] = []; ordem.push(k); }
        grupos[k].push(s);
    });
    var ipt = 'padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:0.9rem;outline:none;box-sizing:border-box;font-family:inherit;background:#fff;';
    var pop = document.createElement('div');
    pop.id = 'mnprt-pop';
    pop.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.65);display:flex;align-items:center;justify-content:center;z-index:10012;padding:16px;';
    pop.innerHTML = '<div style="background:#fff;border-radius:16px;width:100%;max-width:640px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 25px 60px rgba(0,0,0,0.35);">'
      + '<div style="background:linear-gradient(135deg,#1e293b,#334155);padding:14px 20px;border-radius:16px 16px 0 0;display:flex;align-items:center;gap:10px;flex-shrink:0;">'
      +   '<div style="background:#2563eb;border-radius:9px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;"><i class="ph ph-arrows-split" style="color:#fff;font-size:1.2rem;"></i></div>'
      +   '<div><div style="color:#fff;font-weight:700;">Ratear total da nota de peças</div><div style="color:rgba(255,255,255,0.75);font-size:0.76rem;">Divide o valor total das peças entre os serviços selecionados</div></div>'
      +   '<button type="button" id="mnprt-x" style="margin-left:auto;background:rgba(255,255,255,0.15);border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;color:#fff;"><i class="ph ph-x"></i></button>'
      + '</div>'
      + '<div style="padding:16px 20px;overflow-y:auto;flex:1;">'
      +   '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:10px;margin-bottom:12px;flex-wrap:wrap;">'
      +     '<div style="font-size:0.84rem;font-weight:700;color:#1e40af;">Valor total das peças a ratear (R$):</div>'
      +     '<input type="text" id="mnprt-val" value="' + fm(somaAtual) + '" style="' + ipt + 'width:150px;text-align:right;font-weight:800;color:#2563eb;">'
      +   '</div>'
      +   '<label style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:1.5px solid #bfdbfe;border-radius:10px;background:#eff6ff;cursor:pointer;margin-bottom:12px;font-size:0.85rem;font-weight:700;color:#1d4ed8;">'
      +     '<input type="checkbox" id="mnprt-all" style="width:17px;height:17px;accent-color:#2563eb;"> Selecionar todos os serviços da manutenção (' + servs.length + ')</label>'
      +   '<input type="text" id="mnprt-busca" autocomplete="off" placeholder="Pesquisar serviço pelo nome..." style="width:100%;box-sizing:border-box;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:0.86rem;outline:none;margin-bottom:10px;">'
      +   '<div id="mnprt-lista"></div>'
      +   '<div id="mnprt-resumo" style="margin-top:10px;padding:10px 12px;border-radius:8px;font-size:0.82rem;font-weight:600;"></div>'
      + '</div>'
      + '<div style="padding:12px 20px;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:flex-end;flex-shrink:0;">'
      +   '<button type="button" id="mnprt-cancel" style="padding:9px 18px;border:1.5px solid #e2e8f0;border-radius:8px;background:#fff;color:#64748b;cursor:pointer;font-weight:600;">Cancelar</button>'
      +   '<button type="button" id="mnprt-ok" style="padding:9px 20px;border:none;border-radius:8px;background:#2563eb;color:#fff;cursor:pointer;font-weight:700;display:flex;align-items:center;gap:6px;"><i class="ph ph-check"></i> Aplicar rateio do total</button>'
      + '</div></div>';
    document.body.appendChild(pop);
    var fechar = function() { var p = document.getElementById('mnprt-pop'); if (p) p.remove(); };
    var valNum = somaAtual;
    var valEl = document.getElementById('mnprt-val');
    var chkAll = document.getElementById('mnprt-all');
    var lista = document.getElementById('mnprt-lista');
    var filtroTxt = '';
    var passa = function(sv) {
        var nz = function(t) { return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); };
        var alvo = nz(sv.nome);
        return nz(filtroTxt).split(' ').filter(Boolean).every(function(w) { return alvo.indexOf(w) !== -1; });
    };
    var buscaEl = document.getElementById('mnprt-busca');
    buscaEl.oninput = function() { filtroTxt = buscaEl.value; desenhar(); };
    var resumoEl = document.getElementById('mnprt-resumo');
    var atualizarResumo = function() {
        var idsSel = Object.keys(sel).filter(function(k) { return sel[k]; });
        if (!idsSel.length) {
            resumoEl.style.background = '#fef2f2';
            resumoEl.style.border = '1px solid #fecaca';
            resumoEl.style.color = '#991b1b';
            resumoEl.innerHTML = '<i class="ph ph-warning"></i> Selecione ao menos um serviço para receber o rateio das peças.';
        } else if (idsSel.length === 1) {
            var sv = servs.find(function(s) { return String(s.id) === String(idsSel[0]); });
            resumoEl.style.background = '#ecfdf5';
            resumoEl.style.border = '1px solid #a7f3d0';
            resumoEl.style.color = '#065f46';
            resumoEl.innerHTML = '<i class="ph ph-check-circle"></i> <b>1 serviço selecionado</b> (' + esc(sv ? sv.nome : '') + '): receberá 100% do total das peças (<b>' + window._mnFmtMoeda(valNum) + '</b>).';
        } else {
            resumoEl.style.background = '#eff6ff';
            resumoEl.style.border = '1px solid #bfdbfe';
            resumoEl.style.color = '#1e40af';
            resumoEl.innerHTML = '<i class="ph ph-arrows-split"></i> <b>' + idsSel.length + ' serviços selecionados</b>: o total de <b>' + window._mnFmtMoeda(valNum) + '</b> será rateado em <b>' + window._mnFmtMoeda(valNum / idsSel.length) + '</b> para cada serviço.';
        }
    };
    var desenhar = function() {
        chkAll.checked = servs.length > 0 && servs.every(function(s) { return !!sel[s.id]; });
        lista.innerHTML = ordem.map(function(k, gi) {
            var gruposK = grupos[k].filter(passa);
            if (!gruposK.length) return '';
            var todos = gruposK.every(function(s) { return sel[s.id]; });
            var ico = window._mnCatMeta ? window._mnCatMeta(k).icone : 'ph-wrench';
            return '<div style="border:1px solid #e2e8f0;border-radius:10px;margin-bottom:8px;overflow:hidden;">'
              + '<label style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f1f5f9;font-size:0.76rem;font-weight:800;color:#475569;text-transform:uppercase;cursor:pointer;">'
              +   '<input type="checkbox" data-prtcat="' + gi + '"' + (todos ? ' checked' : '') + ' style="width:15px;height:15px;accent-color:#2563eb;"> <i class="ph ' + esc(ico) + '" style="color:#d97706;font-size:1rem;"></i> ' + esc(k)
              +   ' <span style="font-weight:600;text-transform:none;color:#94a3b8;">(todos desta subcategoria)</span></label>'
              + gruposK.map(function(s) {
                    return '<label style="display:flex;align-items:center;gap:8px;padding:6px 12px 6px 28px;font-size:0.85rem;color:#1e293b;cursor:pointer;">'
                      + '<input type="checkbox" data-prtid="' + s.id + '"' + (sel[s.id] ? ' checked' : '') + ' style="width:15px;height:15px;accent-color:#2563eb;"> ' + esc(s.nome) + '</label>';
                }).join('')
              + '</div>';
        }).join('');
        lista.querySelectorAll('[data-prtid]').forEach(function(c) { c.onchange = function() { sel[c.getAttribute('data-prtid')] = c.checked; desenhar(); }; });
        lista.querySelectorAll('[data-prtcat]').forEach(function(c) {
            c.onchange = function() { grupos[ordem[parseInt(c.getAttribute('data-prtcat'))]].filter(passa).forEach(function(s) { sel[s.id] = c.checked; }); desenhar(); };
        });
        atualizarResumo();
    };
    window._mnMask(valEl, function(n) { valNum = n; atualizarResumo(); });
    chkAll.onchange = function() {
        var v = chkAll.checked;
        servs.forEach(function(s) { sel[s.id] = v; });
        desenhar();
    };
    desenhar();
    document.getElementById('mnprt-x').onclick = fechar;
    document.getElementById('mnprt-cancel').onclick = fechar;
    pop.addEventListener('mousedown', function(e) { if (e.target === pop) fechar(); });
    document.getElementById('mnprt-ok').onclick = function() {
        var escolhidos = Object.keys(sel).filter(function(k) { return sel[k]; }).map(function(k) { return parseInt(k); });
        if (!escolhidos.length) { alert('Selecione ao menos um serviço.'); return; }
        if (window._mnp) window._mnp.rateioTotalServicos = escolhidos.slice();
        var rows = Array.from(document.querySelectorAll('#mnp-rows .mnp-row'));
        var rowsComDados = rows.filter(function(r) {
            var dEl = r.querySelector('[data-k="descricao"]');
            var o = r._obj || {};
            return (dEl && dEl.value.trim()) || (Number(o.valor_total) || 0) > 0;
        });
        if (!rowsComDados.length || (valNum > 0 && Math.abs(valNum - somaAtual) >= 0.01 && rows.length <= 1)) {
            var descPadrao = (rows[0] && rows[0].querySelector('[data-k="descricao"]') && rows[0].querySelector('[data-k="descricao"]').value.trim()) || 'Peças (total da nota)';
            var box = document.getElementById('mnp-rows');
            if (box) box.innerHTML = '';
            window._mnpAddLinha({
                descricao: descPadrao,
                quantidade: 1,
                unidade: 'UN',
                valor_unit: valNum,
                valor_total: valNum,
                servicos: escolhidos.slice()
            });
        } else {
            rows.forEach(function(r) {
                if (!r._obj) r._obj = {};
                if (r._obj.estoque) return;
                r._obj.ratear = 0;
                r._obj.servicos = escolhidos.slice();
                window._mnpAtualizarBtnVinculo(r);
            });
        }
        fechar();
        window._mnpAtualizarTotal();
    };
};

window._mnpAnalisar = async function() {
    var ed = window._mnEd, esc = window._mnEdEsc;
    var f = document.getElementById('mnp-file').files[0];
    if (!f) { alert('Selecione o PDF da nota fiscal.'); return; }
    window._mnp.arquivo = f;
    var btn = document.getElementById('mnp-analisar'), aviso = document.getElementById('mnp-aviso');
    var original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Analisando...';
    aviso.innerHTML = '';
    var fd = new FormData();
    fd.append('arquivo', f);
    try {
        var r = await fetch('/api/frota/manutencoes/' + ed.id + '/notas/analisar', { method: 'POST', headers: { Authorization: 'Bearer ' + window._mnEdTok() }, body: fd });
        var j = await r.json().catch(function() { return {}; });
        if (!r.ok) throw new Error(j.error || 'Erro ao analisar a nota');
        window._mnp.nfDados = j;
        if (document.getElementById('mnp-num')) document.getElementById('mnp-num').value = j.numero || '';
        if (document.getElementById('mnp-forn')) document.getElementById('mnp-forn').value = j.fornecedor || '';
        if (document.getElementById('mnp-emi')) document.getElementById('mnp-emi').value = j.emissao || '';
        var g = j.garantia_sugerida;
        var itens = j.itens || [];
        var avisosTxt = (j.avisos || []).map(function(a) { return esc(a); }).join('<br>');
        if (itens.length > 0) {
            var box = document.getElementById('mnp-rows');
            if (box) {
                var existentes = Array.from(box.querySelectorAll('.mnp-row'));
                existentes.forEach(function(rEl) {
                    var dEl = rEl.querySelector('[data-k="descricao"]');
                    var o = rEl._obj || {};
                    if ((!dEl || !dEl.value.trim()) && !(Number(o.valor_total) > 0)) rEl.remove();
                });
            }
            itens.forEach(function(it) {
                window._mnpAddLinha({
                    codigo: it.codigo || '',
                    descricao: it.descricao || '',
                    unidade: it.unidade || 'UN',
                    quantidade: it.quantidade || 1,
                    valor_unit: it.valor_unit || 0,
                    valor_total: it.valor_total || 0,
                    garantia_valor: '',
                    garantia_unidade: 'dias',
                    servicos: window._mnp.servicoId ? [parseInt(window._mnp.servicoId)] : []
                });
            });
            aviso.innerHTML = j.soma_confere
                ? '<div style="background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;border-radius:8px;padding:8px 12px;font-size:0.82rem;"><i class="ph ph-check-circle"></i> Nota fiscal lida (' + itens.length + ' peça(s) carregada(s), soma ' + window._mnFmtMoeda(j.soma_itens) + '). Use "Vincular a serviços" em cada peça ou "Ratear total da nota".</div>'
                : '<div style="background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:8px;padding:8px 12px;font-size:0.82rem;"><i class="ph ph-warning"></i> ' + (avisosTxt || 'Nota lida. Confira os valores e vincule as peças aos serviços antes de salvar.') + '</div>';
        } else {
            aviso.innerHTML = '<div style="background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:8px;padding:8px 12px;font-size:0.82rem;"><i class="ph ph-info"></i> ' + (avisosTxt || 'Nenhum item identificado automaticamente no PDF.') + ' O arquivo continuará anexado como recibo/comprovante — digite as peças abaixo manualmente.</div>';
        }
    } catch (err) {
        aviso.innerHTML = '<div style="background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:8px;padding:8px 12px;font-size:0.82rem;"><i class="ph ph-info"></i> Não foi possível extrair itens automáticos deste PDF (' + esc(err.message) + '). O PDF continuará anexado como recibo/comprovante — preencha as peças abaixo manualmente.</div>';
    } finally {
        btn.disabled = false;
        btn.innerHTML = original;
    }
};

window._mnpSalvar = async function() {
    var ed = window._mnEd, N = window._mnNum;
    var fileEl = document.getElementById('mnp-file');
    var arq = (window._mnp && window._mnp.arquivo) || (fileEl && fileEl.files && fileEl.files[0]) || null;
    var servsValidos = (ed.realizados || []).filter(function(s) { return s.id; });
    var pecas = [];
    var qtdEstoque = 0;
    document.querySelectorAll('#mnp-rows .mnp-row').forEach(function(r) {
        var g = function(k) { var el = r.querySelector('[data-k="' + k + '"]'); return el ? el.value : ''; };
        var desc = g('descricao').trim();
        var o = r._obj || {};
        var estEl = r.querySelector('[data-k="estoque"]');
        var ehEstoque = (estEl && estEl.checked) || !!o.estoque;
        var qtd = N(g('quantidade')) || 1;
        var vu = N(o.valor_unit);
        var vt = N(o.valor_total) || Math.round(qtd * vu * 100) / 100;
        if (ehEstoque) {
            if (desc || vt > 0) qtdEstoque++;
            return;
        }
        if (!desc && vt > 0 && arq) desc = 'Peças conforme anexo';
        if (!desc) return;
        var svcs = Array.isArray(o.servicos) ? o.servicos.slice() : [];
        if (!svcs.length && servsValidos.length === 1) {
            svcs = [servsValidos[0].id];
        }
        pecas.push({
            codigo: g('codigo').trim() || null,
            descricao: desc,
            unidade: g('unidade').trim().toUpperCase() || 'UN',
            quantidade: qtd,
            valor_unit: vu,
            valor_total: vt,
            garantia_valor: g('garantia_valor'),
            garantia_unidade: g('garantia_unidade'),
            servico_id: svcs.length === 1 ? svcs[0] : null,
            servicos: svcs
        });
    });
    if (!pecas.length && !qtdEstoque) { alert('Informe ao menos uma peça (descrição).'); return; }
    var semGarantiaP = pecas.filter(function(p) { return p.garantia_valor === undefined || p.garantia_valor === null || String(p.garantia_valor).trim() === ''; });
    if (semGarantiaP.length) {
        alert('Informe a garantia de cada peça (preencha 0 se não houver garantia).\n\nSem garantia preenchida (' + semGarantiaP.length + '):\n- ' + semGarantiaP.map(function(p) { return p.descricao; }).join('\n- '));
        return;
    }
    var semVinculo = pecas.some(function(p) { return !(p.servicos || []).length; });
    if (semVinculo) {
        alert('Vincule as peças aos serviços realizados clicando em "Vincular a serviços" na linha da peça ou no botão "Ratear total da nota".');
        return;
    }
    var editId = window._mnp && window._mnp.editNotaId;
    if (!pecas.length && qtdEstoque > 0 && !arq && !editId) {
        await window._mnpAposSalvar('✅ Peças de estoque abatidas (não lançadas na manutenção)!');
        return;
    }
    var btn = document.getElementById('mnp-salvar');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...'; }
    try {
        var nfDados = (window._mnp && window._mnp.nfDados) || {};
        var numTxt = document.getElementById('mnp-num') ? document.getElementById('mnp-num').value.trim() : (nfDados.numero || '');
        var fornTxt = document.getElementById('mnp-forn') ? document.getElementById('mnp-forn').value.trim() : (nfDados.fornecedor || '');
        var emiTxt = document.getElementById('mnp-emi') ? document.getElementById('mnp-emi').value.trim() : (nfDados.emissao || '');
        var somaPecas = pecas.reduce(function(t, p) { return t + (Number(p.valor_total) || 0); }, 0);
        var fd = new FormData();
        if (arq) fd.append('arquivo', arq);
        fd.append('dados', JSON.stringify({
            numero: numTxt || null,
            serie: nfDados.serie || null,
            fornecedor: fornTxt || null,
            cnpj: nfDados.cnpj || null,
            data_emissao: emiTxt || null,
            valor_total: somaPecas,
            chave_acesso: nfDados.chave_acesso || null,
            tem_estoque: qtdEstoque > 0,
            pecas: pecas
        }));
        var urlPecas = editId
            ? ('/api/frota/manutencoes/' + ed.id + '/notas/' + editId)
            : ('/api/frota/manutencoes/' + ed.id + '/notas');
        var r = await fetch(urlPecas, {
            method: editId ? 'PUT' : 'POST',
            headers: { Authorization: 'Bearer ' + window._mnEdTok() },
            body: fd
        });
        if (!r.ok) { var e = await r.json().catch(function() { return {}; }); throw new Error(e.error || 'Erro ao salvar as peças'); }
        await window._mnpAposSalvar(editId ? '✅ Peças e vinculação atualizadas!' : (arq ? '✅ Anexo salvo e peças incluídas!' : '✅ Peças incluídas!'));
    } catch (err) {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-floppy-disk"></i> ' + ((window._mnp && window._mnp.editNotaId) ? 'Salvar alterações' : 'Salvar peças'); }
        alert(err.message);
    }
};

window._mnEdAbrirPecas = async function(servicoId, editNotaId) {
    try { await window._mnEdGarantirId(); await window._mnEdSalvarDetalhe(); } catch (e) { alert(e.message); return; }
    window._mnEdRenderServ();
    window._mnpFechar();
    var ed = window._mnEd, esc = window._mnEdEsc;
    var notaEdit = (editNotaId && editNotaId !== 'sem_nota') ? (ed.notas || []).find(function(n) { return String(n.id) === String(editNotaId); }) : null;
    window._mnp = { servicoId: servicoId || null, editNotaId: editNotaId || null, arquivo: null, nfDados: notaEdit || null, rateioTotalServicos: null };
    var nomeSvc = '';
    if (servicoId) { var s = ed.realizados.find(function(x) { return String(x.id) === String(servicoId); }); if (s) nomeSvc = s.nome; }
    var bannerAnexo = '';
    if (notaEdit && (notaEdit.r2_key || notaEdit.nome_arquivo || notaEdit.numero)) {
        var nomeAnexo = notaEdit.nome_arquivo || (notaEdit.numero ? ('NF ' + notaEdit.numero) : 'PDF anexado');
        bannerAnexo = '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;margin-bottom:10px;font-size:0.82rem;color:#1e40af;">'
          + '<span><i class="ph ph-paperclip"></i> Anexo atual: <b>' + esc(nomeAnexo) + '</b> (selecione outro PDF abaixo apenas se quiser substituí-lo)</span>'
          + '<button type="button" id="mnp-ver-atual" style="padding:5px 10px;border:1px solid #93c5fd;border-radius:6px;background:#fff;color:#2563eb;cursor:pointer;font-weight:700;font-size:0.76rem;display:inline-flex;align-items:center;gap:4px;"><i class="ph ph-eye"></i> Ver PDF</button>'
          + '</div>';
    }
    var ipt = 'padding:8px 10px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.86rem;outline:none;box-sizing:border-box;font-family:inherit;background:#fff;';
    var pop = document.createElement('div');
    pop.id = 'mnp-pop';
    pop.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.6);display:flex;align-items:center;justify-content:center;z-index:10002;padding:16px;';
    pop.innerHTML = '<div style="background:#fff;border-radius:16px;width:100%;max-width:1040px;max-height:94vh;display:flex;flex-direction:column;box-shadow:0 25px 60px rgba(0,0,0,0.3);">'
      + '<div style="background:linear-gradient(135deg,#1e293b,#334155);padding:16px 20px;border-radius:16px 16px 0 0;display:flex;align-items:center;gap:12px;flex-shrink:0;">'
      +   '<div style="background:#2563eb;border-radius:10px;width:38px;height:38px;display:flex;align-items:center;justify-content:center;"><i class="ph ph-gear-six" style="color:#fff;font-size:1.3rem;"></i></div>'
      +   '<div><div style="color:#fff;font-weight:700;">' + (editNotaId ? 'Editar peças e vinculação aos serviços' : 'Incluir peças') + '</div><div style="color:rgba(255,255,255,0.7);font-size:0.8rem;">' + (nomeSvc ? 'Serviço: ' + esc(nomeSvc) + ' · ' : '') + 'Confira ou edite as peças e use "Vincular a serviços" ou "Ratear total da nota"</div></div>'
      +   '<button type="button" id="mnp-x" title="Fechar" style="margin-left:auto;background:rgba(255,255,255,0.15);border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;"><i class="ph ph-x"></i></button>'
      + '</div>'
      + '<div style="padding:16px 20px;overflow-y:auto;flex:1;">'
      +   bannerAnexo
      +   '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">'
      +     '<input type="file" id="mnp-file" accept="application/pdf,.pdf" style="flex:1;min-width:240px;padding:8px;border:1.5px dashed #cbd5e1;border-radius:8px;background:#f8fafc;font-size:0.84rem;">'
      +     '<button type="button" id="mnp-analisar" style="padding:9px 18px;border:none;border-radius:8px;background:#d97706;color:#fff;cursor:pointer;font-weight:700;display:flex;align-items:center;gap:6px;"><i class="ph ph-scan"></i> Analisar nota fiscal</button>'
      +   '</div>'
      +   '<div style="font-size:0.75rem;color:#64748b;margin-top:4px;">Você pode clicar em "Analisar nota fiscal" para ler os itens automaticamente do PDF, ou apenas anexar um recibo/PDF (sem analisar) e preencher as peças abaixo manualmente.</div>'
      +   '<div id="mnp-aviso" style="margin-top:10px;"></div>'
      +   '<div style="display:grid;grid-template-columns:140px 1fr 140px;gap:10px;margin-top:12px;">'
      +     '<div><label style="font-size:0.72rem;font-weight:700;color:#64748b;display:block;margin-bottom:3px;">Nº da nota / recibo</label><input type="text" id="mnp-num" value="' + esc(notaEdit ? (notaEdit.numero || '') : '') + '" placeholder="Opcional" style="' + ipt + 'width:100%;"></div>'
      +     '<div><label style="font-size:0.72rem;font-weight:700;color:#64748b;display:block;margin-bottom:3px;">Fornecedor</label><input type="text" id="mnp-forn" value="' + esc(notaEdit ? (notaEdit.fornecedor || '') : '') + '" placeholder="Opcional" style="' + ipt + 'width:100%;"></div>'
      +     '<div><label style="font-size:0.72rem;font-weight:700;color:#64748b;display:block;margin-bottom:3px;">Emissão</label><input type="text" id="mnp-emi" value="' + esc(notaEdit ? (notaEdit.data_emissao || '') : '') + '" placeholder="dd/mm/aaaa" style="' + ipt + 'width:100%;"></div>'
      +   '</div>'
      +   '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:16px 0 8px;">'
      +     '<div style="font-size:0.8rem;font-weight:800;color:#1e293b;text-transform:uppercase;">Peças da manutenção</div>'
      +     '<button type="button" id="mnp-ratear-total" style="padding:7px 14px;border:1.5px solid #2563eb;border-radius:8px;background:#eff6ff;color:#2563eb;cursor:pointer;font-weight:700;font-size:0.8rem;display:inline-flex;align-items:center;gap:6px;"><i class="ph ph-arrows-split"></i> Ratear total da nota</button>'
      +   '</div>'
      +   '<div id="mnp-rows"></div>'
      +   '<button type="button" id="mnp-add-linha" style="margin-top:4px;padding:7px 14px;border:1.5px solid #cbd5e1;border-radius:8px;background:#fff;color:#475569;cursor:pointer;font-weight:600;font-size:0.8rem;"><i class="ph ph-plus"></i> Adicionar linha</button>'
      + '</div>'
      + '<div style="padding:12px 20px;border-top:1px solid #e2e8f0;display:flex;align-items:center;gap:10px;flex-shrink:0;flex-wrap:wrap;">'
      +   '<div id="mnp-total" style="font-size:0.88rem;color:#334155;"></div>'
      +   '<button type="button" id="mnp-salvar" style="margin-left:auto;padding:10px 22px;border:none;border-radius:8px;background:#2563eb;color:#fff;cursor:pointer;font-weight:700;display:flex;align-items:center;gap:6px;"><i class="ph ph-floppy-disk"></i> ' + (editNotaId ? 'Salvar alterações' : 'Salvar peças') + '</button>'
      + '</div></div>';
    document.body.appendChild(pop);
    document.getElementById('mnp-x').onclick = window._mnpFechar;
    pop.addEventListener('mousedown', function(e) { if (e.target === pop) window._mnpFechar(); });
    if (document.getElementById('mnp-ver-atual') && notaEdit) {
        document.getElementById('mnp-ver-atual').onclick = function() { window._mnEdVerNota(notaEdit.id); };
    }
    document.getElementById('mnp-file').onchange = function() { window._mnp.arquivo = this.files[0] || null; };
    document.getElementById('mnp-analisar').onclick = window._mnpAnalisar;
    document.getElementById('mnp-ratear-total').onclick = window._mnpRatearTotalPopup;
    document.getElementById('mnp-add-linha').onclick = function() { window._mnpAddLinha(); };
    document.getElementById('mnp-salvar').onclick = window._mnpSalvar;
    if (editNotaId) {
        var pecasDaNota = (ed.pecas || []).filter(function(p) {
            return editNotaId === 'sem_nota' ? !p.nota_id : String(p.nota_id) === String(editNotaId);
        });
        var agrupadas = window._mnAgruparPecasParaEdicao(pecasDaNota);
        if (agrupadas.length) {
            agrupadas.forEach(function(it) { window._mnpAddLinha(it); });
        } else {
            var valSug = notaEdit && Number(notaEdit.valor_total) > 0 ? Number(notaEdit.valor_total) : 0;
            window._mnpAddLinha({ descricao: '', quantidade: 1, unidade: 'UN', valor_unit: valSug, valor_total: valSug, servicos: [] });
        }
    } else {
        window._mnpAddLinha();
    }
};

window.mnCorrSalvarEdicaoInterno = async function() {
    var ed = window._mnEd;
    var btn = document.getElementById('mned-save');
    var msgEl = document.getElementById('mned-save-msg');
    var mostrarMsg = function(txt, ok) {
        if (!msgEl) return;
        msgEl.style.display = 'inline-flex';
        msgEl.style.background = ok ? '#ecfdf5' : '#fef2f2';
        msgEl.style.color = ok ? '#059669' : '#dc2626';
        msgEl.style.border = '1px solid ' + (ok ? '#a7f3d0' : '#fecaca');
        msgEl.innerHTML = '<i class="ph ' + (ok ? 'ph-check-circle' : 'ph-warning-circle') + '" style="font-size:1.05rem;"></i> <span>' + window._mnEdEsc(txt) + '</span>';
        if (window._mnEdMsgTimer) clearTimeout(window._mnEdMsgTimer);
        if (ok) window._mnEdMsgTimer = setTimeout(function() { if (msgEl) msgEl.style.display = 'none'; }, 6000);
    };
    var veic = document.getElementById('mned-veic').value;
    var desc = document.getElementById('mned-desc').value.trim();
    if (!veic) { mostrarMsg('Selecione o veículo.', false); alert('Selecione o veículo.'); return; }
    if (!desc) { mostrarMsg('Informe o defeito / problema.', false); alert('Informe o defeito / problema.'); return; }
    if (ed.status === 'em_andamento') ed.veiculo_rodando = 'nao';
    else if (ed.status === 'concluida' && ed.veiculo_rodando === 'nao') ed.veiculo_rodando = 'sim';
    if (ed.status === 'concluida') {
        var temVideoConcl = (ed.midias || []).some(function(m) { return m.categoria === 'video_geral'; });
        if (!temVideoConcl) {
            var secVid = document.getElementById('mned-sec-video');
            if (secVid) {
                secVid.style.borderColor = '#dc2626';
                secVid.style.background = '#fef2f2';
                if (secVid.scrollIntoView) secVid.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            mostrarMsg('Anexe o vídeo geral do veículo para concluir.', false);
            alert('Para mudar a situação da manutenção corretiva para Concluído, é obrigatório anexar o vídeo geral do veículo.');
            return;
        }
        if (!window._mnEdValidarServicosConclusao()) { mostrarMsg('Informe a garantia de toda mão de obra e peça (pode ser 0).', false); return; }
    }
    if (ed.veiculo_rodando !== 'sim' && ed.veiculo_rodando !== 'nao') {
        mostrarMsg('Informe se o veículo está rodando ou parado.', false);
        alert('Informe se o veículo está rodando ou parado ("O veículo está rodando? *").');
        return;
    }
    if (msgEl) msgEl.style.display = 'none';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...'; }
    try {
        if (!ed.id) {
            // Ja existe solicitacao aberta para este veiculo? Deixa o usuario decidir entre reforcar a existente ou criar nova
            var ckVeic = document.getElementById('mned-veic') ? document.getElementById('mned-veic').value : '';
            var ckDesc = document.getElementById('mned-desc') ? document.getElementById('mned-desc').value.trim() : '';
            var ck = await window._mnChecarSolicitacaoExistente(ckVeic, ckDesc);
            if (ck.acao !== 'nova') {
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar'; }
                if (ck.acao === 'reforco') {
                    window._mnEdFechar();
                    if (typeof window.mnCarregarCorretivas === 'function') window.mnCarregarCorretivas();
                }
                return;
            }
        }
        await window._mnEdGarantirId();
        await window._mnEdSalvarDetalhe();
        var hdr = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + window._mnEdTok() };
        var comentEl = document.getElementById('mned-coment');
        var coment = comentEl ? comentEl.value.trim() : '';
        if (coment) {
            var rc = await fetch('/api/frota/manutencoes/' + ed.id + '/comentarios', { method: 'POST', headers: hdr, body: JSON.stringify({ texto: coment }) });
            if (!rc.ok) { var ec = await rc.json().catch(function() { return {}; }); throw new Error(ec.error || 'Erro ao salvar o comentário'); }
            if (comentEl) comentEl.value = '';
        }
        var ehConcl = ed.status === 'concluida';
        var diEl = document.getElementById('mned-di');
        var dfEl = document.getElementById('mned-df');
        var di = diEl ? diEl.value : '';
        var df = dfEl ? dfEl.value : '';
        if (di && df && df < di) {
            throw new Error('A Data de fim não pode ser anterior à Data de início.');
        }
        if (ed.status === 'em_andamento' && !di) { di = window._mnHojeISO(); if (diEl) diEl.value = di; }
        var dsolEl = document.getElementById('mned-dsol');
        var dsol = dsolEl ? dsolEl.value : '';
        var dcEl = document.getElementById('mned-dc');
        if (ehConcl && dcEl && !dcEl.value) {
            dcEl.value = window._mnHojeISO();
        }
        var corpo = {
            status: ed.status,
            veiculo_id: veic,
            descricao: desc,
            data_solicitacao: dsol || undefined,
            data_inicio: di || null,
            data_fim: df || null,
            data_conclusao: dcEl ? (dcEl.value || null) : null,
            km_na_manutencao: document.getElementById('mned-km').value || null,
            km_final_manutencao: ehConcl ? (document.getElementById('mned-km-final').value || null) : null,
            fornecedor: document.getElementById('mned-forn').value.trim() || null,
            veiculo_rodando: ed.veiculo_rodando,
            justificativa_status: ed.justificativa_status || undefined
        };
        var rs = await fetch('/api/frota/manutencoes/' + ed.id + '/status', { method: 'PUT', headers: hdr, body: JSON.stringify(corpo) });
        var rsJson = await rs.json().catch(function() { return {}; });
        if (!rs.ok) { throw new Error(rsJson.error || 'Erro ao salvar a manutenção'); }
        ed.justificativa_status = '';
        await window._mnEdRecarregarDetalhe();
        var vObj = (window._manutFrota || []).find(function(x) { return String(x.id) === String(veic); });
        ed.m.veiculo_id = veic;
        ed.m.placa = vObj ? vObj.placa : ed.m.placa;
        ed.m.descricao = desc;
        ed.m.status = ed.status;
        ed.m.data_inicio = corpo.data_inicio;
        ed.m.data_conclusao = corpo.data_conclusao;
        ed.m.km_na_manutencao = corpo.km_na_manutencao;
        ed.m.km_final_manutencao = corpo.km_final_manutencao;
        ed.m.fornecedor = corpo.fornecedor;
        var subTit = document.getElementById('mned-subtitulo');
        if (subTit && ed.m.placa) subTit.textContent = ed.m.placa;
        window._mnEdRenderStatus();
        window._mnEdRenderRodando();
        window._mnEdAtualizarCronModal();
        window._mnEdRenderSolic();
        window._mnEdPickRender();
        window._mnEdRenderServ();
        window._mnEdRenderNotas();
        window._mnEdRenderMo();
        window._mnEdRenderHist();
        if (typeof window._mnPrevAtualizarFrota === 'function') await window._mnPrevAtualizarFrota();
        if (typeof window._mnEdRenderAlertaRevisao === 'function') window._mnEdRenderAlertaRevisao();
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar'; }
        mostrarMsg('Manutenção salva!', true);
        if (typeof window.checkUserNotificacoes === 'function') {
            window.checkUserNotificacoes();
            setTimeout(window.checkUserNotificacoes, 800);
        }
        try {
            var lista = await fetch('/api/frota/manutencoes', { headers: { Authorization: 'Bearer ' + window._mnEdTok() } }).then(function(x) { return x.json(); });
            window._manutDados = lista || [];
        } catch (e3) { /* lista sera recarregada abaixo */ }
        window.mnCarregarCorretivas();
        if (ed.status !== ed._statusInicial && ed._jaPerguntouStatus !== ed.status) {
            ed._jaPerguntouStatus = ed.status;
            ed._statusInicial = ed.status;
            window._mnTratarOutrasAbertasPosStatus(ed.status, rsJson, ed.m.placa);
        } else {
            ed._statusInicial = ed.status;
        }
        var vObjAtual = (window._manutFrota || []).find(function(x) { return String(x.id) === String(veic); }) || vObj;
        var rRev = typeof window._mnEdMarcoRevisaoTexto === 'function' ? window._mnEdMarcoRevisaoTexto(vObjAtual) : null;
        if (rRev && (rRev.status === 'vencida' || rRev.status === 'a_vencer')) {
            window._mnEdPerguntarIniciarRevisao(vObjAtual, rRev, corpo);
        }
    } catch (e) {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar'; }
        mostrarMsg('Erro: ' + e.message, false);
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
    // Corretiva (criar ou editar) usa sempre a tela unica
    if (!id && (opts.tipo === 'corretiva' || (!opts.tipo && window._mnSubAba === 'corretiva'))) return window.mnCorrNovaInterno({ vid: opts.vid, descricao: opts.descricao });
    if (id) { const mm = (window._manutDados || []).find(x => x.id === id); if (mm && mm.tipo === 'corretiva') return window.mnCorrEditarInterno(id); }
    
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
    ov.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:9999;display:flex;align-items:stretch;justify-content:stretch;padding:0;';

    ov.innerHTML = `<div style="background:#fff;border-radius:0;width:100%;max-width:none;height:100vh;display:flex;flex-direction:column;overflow:hidden;">
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
    const tipoModal = (document.getElementById('mn-m-tipo') || {}).value || '';
    const catalogo = window._mnCatalogoLista(tipoModal);
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
        // Todas as categorias: serviços agrupados por categoria e subcategoria com ícones
        let uGrp = null, uSub = null;
        catItens.forEach(s => {
            if (s._grupoNome !== uGrp) {
                uGrp = s._grupoNome;
                uSub = null;
                htmlCbs += `<div class="mn-serv-cat" style="font-size:0.75rem;font-weight:800;color:#1e293b;text-transform:uppercase;letter-spacing:.04em;margin-top:10px;padding:6px 8px;background:#f1f5f9;border-radius:6px;display:flex;align-items:center;gap:6px;"><i class="ph ${esc(s._grupoIcone)}" style="color:#d97706;font-size:1rem;"></i>${esc(s._grupoNome)}</div>`;
            }
            if (s._subNome !== uSub) {
                uSub = s._subNome;
                htmlCbs += `<div class="mn-serv-cat" style="font-size:0.72rem;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.04em;margin-top:6px;padding-top:5px;padding-left:10px;border-top:1px solid #e2e8f0;display:flex;align-items:center;gap:6px;"><i class="ph ${esc(s._subIcone)}" style="color:#d97706;font-size:0.95rem;"></i>${esc(s._subNome)}</div>`;
            }
            htmlCbs += linha(s);
        });
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
        window._manutFrota = window._mnOrdenarFrota ? window._mnOrdenarFrota(frota || []) : (frota || []);
        window._frotaDados = frota || [];
        
        if (window._mnSubAba === 'corretiva') {
            const sub = document.getElementById('mn-sub-conteudo');
            if (sub) mnRenderCorretivaTela(sub);
        } else if (window._mnSubAba === 'revisao') {
            const sub = document.getElementById('mn-sub-conteudo');
            if (sub) window.mnRenderRevisaoTela(sub);
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

window.excluirManutencao = function(id) {
    window._mnPedirSenhaExclusao('Excluir manutenção', async function(senha) {
        const tok = window._manutTok || window.currentToken || localStorage.getItem('token');
        const r = await fetch('/api/frota/manutencoes/' + id + '?senha=' + encodeURIComponent(senha), {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
            body: JSON.stringify({ senha: senha })
        });
        if (!r.ok) {
            const j = await r.json().catch(() => ({}));
            alert(j.error || 'Erro ao excluir manutenção');
            return;
        }
        const manut = await fetch('/api/frota/manutencoes', { headers: { Authorization: 'Bearer ' + tok } }).then(x => x.json());
        window._manutDados = manut || [];
        if (typeof mnRenderLista === 'function') mnRenderLista();
        if (typeof window.mnCarregarPreventivoVeiculo === 'function') window.mnCarregarPreventivoVeiculo();
        if (typeof window.mnCarregarCorretivas === 'function') window.mnCarregarCorretivas();
    });
};

window.mnExcluirSelecionados = async function() {
    const cbs = document.querySelectorAll('.mn-prev-cb:checked');
    if (!cbs.length) return;
    const ids = Array.from(cbs).map(cb => cb.dataset.id);
    window._mnPedirSenhaExclusao('Excluir ' + ids.length + ' manutenção(ões)', async function(senha) {
        const tok = window._manutTok || window.currentToken || localStorage.getItem('token');
        await Promise.all(ids.map(id =>
            fetch('/api/frota/manutencoes/' + id + '?senha=' + encodeURIComponent(senha), {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
                body: JSON.stringify({ senha: senha })
            })
        ));
        const manut = await fetch('/api/frota/manutencoes', { headers: { Authorization: 'Bearer ' + tok } }).then(r => r.json());
        window._manutDados = manut || [];
        if (typeof mnRenderLista === 'function') mnRenderLista();
        if (typeof window.mnCarregarPreventivoVeiculo === 'function') window.mnCarregarPreventivoVeiculo();
        if (typeof showToast === 'function') showToast(`${ids.length} manutenção(ões) excluída(s).`, 'success');
    });
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
