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
    <button id="mn-sub-btn-preventiva" onclick="window.mnMudarSubAba('preventiva')" 
        style="padding:0.5rem 1.2rem;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:0.9rem;display:flex;align-items:center;gap:6px;background:transparent;color:#64748b;">
        <i class="ph ph-calendar-check"></i> Preventiva
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

    window.mnMudarSubAba(window._mnSubAba || 'corretiva');
};



window.mnMudarSubAba = function(aba) {
    if (aba === 'corretivas') aba = 'corretiva';
    window._mnSubAba = aba;
    ['corretiva','preventiva','revisao','historico'].forEach(a => {
        const btn = document.getElementById('mn-sub-btn-' + a);
        if (!btn) return;
        btn.style.background = a === aba ? '#d97706' : 'transparent';
        btn.style.color = a === aba ? '#fff' : '#64748b';
    });
    const sub = document.getElementById('mn-sub-conteudo');
    if (!sub) return;
    if (aba === 'preventiva') mnRenderPreventivaTela(sub);
    else if (aba === 'corretiva') mnRenderCorretivaTela(sub);
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
window._mnPrevCardsHtml = function(modo) {
    const ehRevisao = modo === 'revisao';
    const hojeISO = window._mnHojeISO();
    const todos = window._mnOrdenarFrota(window._manutFrota || []);
    if (!todos.length) return '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#94a3b8;">Nenhum ve\u00edculo cadastrado.</div>';
    const frota = ehRevisao ? todos.filter(v => {
        const garAte = String(v.garantia_fabrica_ate || '').split('T')[0];
        const temGar = (v.garantia_fabrica == 1 || v.garantia_fabrica === '1' || v.garantia_fabrica === true || !!garAte);
        return temGar && (!garAte || garAte >= hojeISO);
    }) : todos;
    if (!frota.length) return '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#94a3b8;">Nenhum ve\u00edculo na garantia no momento.</div>';
    const prevPorVeic = {};
    (window._manutDados || []).forEach(m => { if (m.tipo === 'preventiva') prevPorVeic[String(m.veiculo_id)] = (prevPorVeic[String(m.veiculo_id)] || 0) + 1; });
    return frota.map(v => {
        const foto = v.foto_url || v.foto_base64 || '';
        const parado = (v.em_manutencao == 1 || v.em_manutencao === '1' || v.em_manutencao === true);
        const nPrev = prevPorVeic[String(v.id)] || 0;
        const garAte = String(v.garantia_fabrica_ate || '').split('T')[0];
        const temGar = (v.garantia_fabrica == 1 || v.garantia_fabrica === '1' || v.garantia_fabrica === true || !!garAte);
        const garVencida = temGar && garAte && garAte < hojeISO;
        const fotoHtml = foto
            ? `<div onclick="if(window.abrirFotoVeiculoFrota)window.abrirFotoVeiculoFrota(${v.id})" title="Clique para abrir e salvar a foto" style="height:140px;width:100%;background-image:url('${foto}');background-size:cover;background-position:center;border-bottom:1px solid #e2e8f0;cursor:pointer;"></div>`
            : `<div style="height:140px;width:100%;background:#f1f5f9;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;color:#cbd5e1;font-size:3rem;"><i class="ph ph-truck"></i></div>`;
        const linhaPlano = ehRevisao ? '' : `
                <div style="display:flex;justify-content:space-between;border-bottom:1px solid #f1f5f9;padding-bottom:0.3rem;">
                    <span style="font-weight:600;color:#94a3b8;">Plano preventivo:</span>
                    <span style="font-weight:700;color:${nPrev ? '#0284c7' : '#d97706'};">${nPrev ? nPrev + (nPrev === 1 ? ' item' : ' itens') : 'N\u00e3o cadastrado'}</span>
                </div>`;
        const linhaGarantia = !ehRevisao ? '' : `
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;border-bottom:1px solid #f1f5f9;padding-bottom:0.4rem;">
                    <span style="font-weight:600;color:#94a3b8;">Garantia at\u00e9:</span>
                    <input type="date" id="mn-gar-dt-${v.id}" value="${garAte}" onchange="window.mnGarantiaSalvar(${v.id}, false)" onblur="window.mnGarantiaSalvar(${v.id}, true)" onkeydown="if(event.key==='Enter')this.blur()" style="padding:0.2rem 0.4rem;border:1px solid ${garVencida ? '#fca5a5' : '#e2e8f0'};border-radius:6px;font-size:0.8rem;outline:none;color:${garVencida ? '#dc2626' : '#1e293b'};">
                </div>`;
        const btnAcao = ehRevisao
            ? `<button onclick="window.mnRevisaoAbrirVeiculo(${v.id})" style="background:#7c3aed;color:#fff;border:none;border-radius:8px;padding:0.45rem 0.9rem;font-size:0.8rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;"><i class="ph ph-seal-check"></i> Ver revis\u00e3o</button>`
            : `<button onclick="window.mnPrevAbrirVeiculo(${v.id})" style="background:#0284c7;color:#fff;border:none;border-radius:8px;padding:0.45rem 0.9rem;font-size:0.8rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;"><i class="ph ph-calendar-check"></i> Ver plano</button>`;
        return `
        <div style="background:#fff;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.08);overflow:hidden;border:${parado ? '2px solid #fca5a5' : '1px solid #e2e8f0'};position:relative;display:flex;flex-direction:column;transition:transform .2s, box-shadow .2s;" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 20px rgba(0,0,0,0.12)';" onmouseout="this.style.transform='none';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)';">
            ${fotoHtml}
            <div style="padding:1rem;flex:1;display:flex;flex-direction:column;gap:0.5rem;font-size:0.85rem;color:#475569;">
                <div style="display:flex;flex-direction:column;gap:0.1rem;">
                    <span style="font-weight:600;color:#94a3b8;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.5px;">Placa</span>
                    <span style="font-weight:800;color:${parado ? '#dc2626' : '#1e293b'};font-size:1.2rem;">${v.placa || 'N/D'}</span>
                </div>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:0.6rem;border-radius:8px;">
                    <span style="font-weight:700;color:#1e293b;line-height:1.2;">${v.marca_modelo_versao || 'N/D'}</span>
                </div>${linhaPlano}${linhaGarantia}
            </div>
            ${ehRevisao ? `<div style="background:#f8fafc;padding:0.6rem 1rem;border-top:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;gap:8px;" title="A KM é preenchida diariamente na tela de Gestão de Frota">
                <div style="display:flex;align-items:center;gap:6px;">
                    <i class="ph ph-gauge" style="color:#d97706;font-size:1rem;"></i>
                    <span style="font-size:0.78rem;color:#64748b;font-weight:600;">KM atual:</span>
                </div>
                <span style="font-size:0.88rem;font-weight:800;color:#1e293b;">${v.km_atual ? Number(v.km_atual).toLocaleString('pt-BR') + ' km' : 'Não informado'}</span>
            </div>` : `<div style="background:#f8fafc;padding:0.6rem 1rem;border-top:1px solid #e2e8f0;display:flex;align-items:center;gap:8px;">
                <i class="ph ph-gauge" style="color:#d97706;font-size:1rem;"></i>
                <span style="font-size:0.78rem;color:#64748b;font-weight:600;">KM atual:</span>
                <input type="number" id="mn-prevcard-km-${v.id}" value="${v.km_atual || ''}" placeholder="Digite KM"
                    style="flex:1;min-width:0;padding:0.3rem 0.5rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.8rem;outline:none;"
                    onkeydown="if(event.key==='Enter')window.mnPrevSalvarKmCard(${v.id})">
                <button onclick="window.mnPrevSalvarKmCard(${v.id})" style="background:#d97706;color:#fff;border:none;border-radius:6px;padding:0.3rem 0.6rem;font-size:0.75rem;cursor:pointer;font-weight:600;white-space:nowrap;">Salvar</button>
            </div>`}
            <div style="background:#f8fafc;padding:0.75rem 1rem;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;gap:8px;">
                <div style="font-weight:800;color:#cbd5e1;font-size:0.75rem;letter-spacing:1px;text-transform:uppercase;">${v.tipo_veiculo || 'VE\u00cdCULO'}</div>
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

window._mnRevCatTrocas = [
    { id: 'oleo_motor', nome: 'Óleo do motor', oQueFazer: 'Substituir no intervalo prescrito', classificacao: 'Troca programada obrigatória', risco: 'Sim', marcosTroca: [10000,20000,30000,40000,50000,60000,70000,80000,90000,100000] },
    { id: 'filtro_oleo', nome: 'Filtro de óleo', oQueFazer: 'Substituir junto com o óleo', classificacao: 'Troca programada obrigatória', risco: 'Sim', marcosTroca: [10000,20000,30000,40000,50000,60000,70000,80000,90000,100000] },
    { id: 'filtro_combustivel', nome: 'Filtro de combustível', oQueFazer: 'Substituir nas revisões marcadas no plano do motor 1.3', classificacao: 'Troca programada obrigatória', risco: 'Sim', marcosTroca: [10000,20000,30000,40000,50000,60000,70000,80000,90000,100000] },
    { id: 'filtro_ar_motor', nome: 'Filtro de ar do motor', oQueFazer: 'Verificar e substituir nos marcos prescritos; antecipar quando exigido pelas condições severas', classificacao: 'Inspeção e troca programada', risco: 'Sim, se descumprido o plano', marcosTroca: [10000,20000,30000,40000,50000,60000,70000,80000,90000,100000] },
    { id: 'velas_ignicao', nome: 'Velas de ignição', oQueFazer: 'Substituir aos 40.000 km, independentemente do tempo', classificacao: 'Troca programada obrigatória', risco: 'Sim, se vencida e não realizada', marcosTroca: [40000,80000] },
    { id: 'fluido_freio', nome: 'Fluido de freio', oQueFazer: 'Substituir a cada 24 meses ou 40.000 km, o que ocorrer primeiro', classificacao: 'Troca programada obrigatória', risco: 'Sim', marcosTroca: [20000,40000,60000,80000,100000] },
    { id: 'correias_auxiliares', nome: 'Correias dos órgãos auxiliares', oQueFazer: 'Verificar nas revisões e substituir a cada 48 meses ou 60.000 km, o que ocorrer primeiro, conforme o manual 1.3', classificacao: 'Inspeção e troca programada', risco: 'Sim, se descumprido o plano', marcosTroca: [40000,60000,100000] },
    { id: 'liquido_arrefecimento', nome: 'Líquido de arrefecimento', oQueFazer: 'Verificar nível e contaminação; substituir a cada 120 meses ou 240.000 km, o que ocorrer primeiro', classificacao: 'Inspeção e troca por intervalo', risco: 'Sim, se descumprido o plano', marcosTroca: [] },
    { id: 'oleo_cambio', nome: 'Óleo do câmbio manual', oQueFazer: 'Verificar nível nas revisões indicadas e substituir no marco assinalado pelo manual', classificacao: 'Inspeção e troca programada', risco: 'Sim, se prescrita e não realizada', marcosTroca: [] },
    { id: 'filtro_canister', nome: 'Filtro de ar do canister', oQueFazer: 'Substituir nas revisões indicadas no plano', classificacao: 'Troca programada obrigatória', risco: 'Sim, se descumprido o plano', marcosTroca: [20000,40000,60000,80000,100000] }
];

window._mnRevCatVerificacoes = [
    { id: 'niveis_fluidos', nome: 'Níveis de fluidos', oQueFazer: 'Verificar fluidos de freio, lavador dos vidros e demais sistemas aplicáveis', classificacao: 'Verificação obrigatória', risco: 'Sim, se a operação prescrita for omitida' },
    { id: 'sistema_arrefecimento', nome: 'Sistema de arrefecimento', oQueFazer: 'Verificar nível, contaminação, mangueiras e tubulações', classificacao: 'Verificação obrigatória', risco: 'Sim, se a operação prescrita for omitida' },
    { id: 'freios', nome: 'Freios', oQueFazer: 'Inspecionar pastilhas e discos; verificar lonas e tambores quando aplicável', classificacao: 'Verificação obrigatória; troca condicional', risco: 'Sim, se ignorado desgaste ou defeito relevante' },
    { id: 'pneus', nome: 'Pneus', oQueFazer: 'Inspecionar pressão, desgaste e condições gerais', classificacao: 'Verificação obrigatória', risco: 'Sim, se a manutenção prescrita for negligenciada' },
    { id: 'suspensao_direcao', nome: 'Suspensão e direção', oQueFazer: 'Verificar folgas, coifas, juntas, mangueiras e componentes', classificacao: 'Verificação obrigatória', risco: 'Sim, se a operação prescrita for omitida' },
    { id: 'tubulacoes_escapamento', nome: 'Tubulações e escapamento', oQueFazer: 'Inspecionar sistemas de combustível, freios, arrefecimento e escapamento', classificacao: 'Verificação obrigatória', risco: 'Sim, se a operação prescrita for omitida' },
    { id: 'motor_cambio', nome: 'Motor e câmbio', oQueFazer: 'Verificar estado e estanqueidade, incluindo vazamentos', classificacao: 'Verificação obrigatória', risco: 'Sim, se a operação prescrita for omitida' },
    { id: 'injecao_ignicao', nome: 'Sistema de injeção e ignição', oQueFazer: 'Realizar diagnóstico conforme o plano', classificacao: 'Verificação obrigatória', risco: 'Sim, se a operação prescrita for omitida' },
    { id: 'bateria_12v', nome: 'Bateria de 12 V', oQueFazer: 'Verificar estado com equipamento de diagnóstico homologado', classificacao: 'Verificação obrigatória', risco: 'Não implica troca automática; omitir a verificação prescrita pode gerar questionamento' },
    { id: 'filtro_ar_condicionado', nome: 'Filtro do ar-condicionado', oQueFazer: 'Inspecionar nas revisões previstas', classificacao: 'Verificação obrigatória', risco: 'Não implica troca automática; substituir conforme condição e plano' },
    { id: 'freio_estacionamento', nome: 'Freio de estacionamento', oQueFazer: 'Verificar funcionamento e regular, se necessário', classificacao: 'Verificação obrigatória', risco: 'Sim, se houver falha relevante ignorada' },
    { id: 'palhetas_iluminacao', nome: 'Palhetas, limpadores e iluminação', oQueFazer: 'Verificar funcionamento, desgaste e sinalização', classificacao: 'Verificação obrigatória', risco: 'Não implica troca automática; defeitos devem ser corrigidos' },
    { id: 'carroceria_protecoes', nome: 'Carroceria e proteções inferiores', oQueFazer: 'Verificar danos nas revisões', classificacao: 'Verificação obrigatória', risco: 'Não implica troca automática' },
    { id: 'ventilacao_carter', nome: 'Sistema de ventilação do cárter (blow-by)', oQueFazer: 'Verificar nos marcos indicados para o motor 1.3', classificacao: 'Verificação programada', risco: 'Sim, se descumprido o plano' },
    { id: 'higienizacao_alimentacao', nome: 'Higienização do sistema de alimentação', oQueFazer: 'Executar nas revisões indicadas no plano', classificacao: 'Operação programada', risco: 'Sim, quando prevista para a revisão' }
];

window._mnRevCatOpcionais = [
    { id: 'opt_pastilhas_discos', nome: 'Pastilhas e discos de freio', obrigatorio: 'Não trocar automaticamente', quando: 'Quando atingirem o limite de desgaste ou apresentarem defeito' },
    { id: 'opt_pneus', nome: 'Pneus', obrigatorio: 'Não trocar automaticamente', quando: 'Quando desgastados, danificados ou fora dos limites de segurança' },
    { id: 'opt_bateria', nome: 'Bateria', obrigatorio: 'Não trocar automaticamente', quando: 'Se falhar nos testes ou não atender às especificações' },
    { id: 'opt_palhetas', nome: 'Palhetas', obrigatorio: 'Não trocar automaticamente', quando: 'Quando desgastadas ou sem funcionamento adequado' },
    { id: 'opt_filtro_ac', nome: 'Filtro do ar-condicionado', obrigatorio: 'Não necessariamente trocar em toda revisão', quando: 'Conforme o plano e a condição verificada' },
    { id: 'opt_alinhamento', nome: 'Alinhamento e balanceamento', obrigatorio: 'Não necessariamente', quando: 'Quando houver sintomas, desgaste irregular ou necessidade técnica' },
    { id: 'opt_bicos', nome: 'Limpeza de bicos injetores', obrigatorio: 'Não é troca automática universal', quando: 'Quando houver diagnóstico ou previsão expressa no plano' },
    { id: 'opt_descarbonizacao', nome: 'Descarbonização do motor', obrigatorio: 'Não é troca automática universal', quando: 'Somente se tecnicamente indicada' },
    { id: 'opt_aditivos', nome: 'Aditivos extras no combustível', obrigatorio: 'Não adicionar por rotina sem recomendação', quando: 'Seguir o combustível e os produtos especificados pela Fiat' },
    { id: 'opt_lavagem_motor', nome: 'Lavagem técnica do motor', obrigatorio: 'Não é requisito universal de revisão', quando: 'Apenas se necessária e executada com segurança' },
    { id: 'opt_acessorios', nome: 'Acessórios e personalizações', obrigatorio: 'Não são revisões obrigatórias', quando: 'Devem respeitar as especificações e condições da garantia' }
];

window.mnRenderRevisaoTela = function(sub) {
    sub.innerHTML = `
        <div id="mn-rev-cards" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:1rem;">${window._mnPrevCardsHtml('revisao')}</div>
        <div id="mn-rev-detalhe" style="display:none;"></div>`;
    window._mnPrevAtualizarFrota();
};

window.mnRevisaoVoltarCards = function() {
    const det = document.getElementById('mn-rev-detalhe');
    const grid = document.getElementById('mn-rev-cards');
    if (det) { det.style.display = 'none'; det.innerHTML = ''; }
    if (grid) { grid.style.display = 'grid'; grid.innerHTML = window._mnPrevCardsHtml('revisao'); }
    window._mnRevAtual = null;
};

function _mnRevSomarMesesISO(dtIso, meses) {
    if (!dtIso) return '';
    const p = String(dtIso).split('T')[0].split('-');
    if (p.length !== 3) return '';
    const d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1 + Number(meses || 0), parseInt(p[2], 10));
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
    if (ate) return _mnRevSomarMesesISO(ate, -12);
    return '';
}

window.mnRevisaoAbrirVeiculo = async function(vid) {
    const grid = document.getElementById('mn-rev-cards');
    const det = document.getElementById('mn-rev-detalhe');
    if (!det) return;
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
    const dtIni = document.getElementById('mn-rev-cfg-inicio')?.value || '';
    const usoSev = document.getElementById('mn-rev-cfg-severo')?.value === '1' ? 1 : 0;
    const tok = window._manutTok || window.currentToken || localStorage.getItem('token');
    try {
        const res = await fetch('/api/frota/revisoes/' + vid + '/config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
            body: JSON.stringify({ data_inicio_garantia: dtIni || null, uso_severo: usoSev })
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error || 'Erro ao salvar configuração');
        if (window._mnRevAtual && window._mnRevAtual.veiculo) {
            window._mnRevAtual.veiculo.data_inicio_garantia = dtIni || null;
            window._mnRevAtual.veiculo.uso_severo = usoSev;
        }
        [window._manutFrota, window._frotaDados].forEach(arr => {
            const v = (arr || []).find(x => String(x.id) === String(vid));
            if (v) { v.data_inicio_garantia = dtIni || null; v.uso_severo = usoSev; }
        });
        if (typeof mostrarToastAviso === 'function') mostrarToastAviso('\u2705 Parâmetros de revisão atualizados!');
        window._mnRenderPainelRevisaoVeiculo();
    } catch (e) { alert(e.message); }
};

window._mnRenderPainelRevisaoVeiculo = function() {
    const det = document.getElementById('mn-rev-detalhe');
    const ctx = window._mnRevAtual;
    if (!det || !ctx || !ctx.veiculo) return;
    const v = ctx.veiculo;
    const revsMap = {};
    (ctx.revisoes || []).forEach(r => { revsMap[Number(r.marco_km)] = r; });

    const kmAtual = Number(v.km_atual || 0);
    const hojeIso = window._mnHojeISO();
    const dtIniGar = _mnRevInferirInicioGarantia(v);
    const garAte = String(v.garantia_fabrica_ate || '').split('T')[0];
    const usoSevero = Number(v.uso_severo || 0) === 1;
    const passoKm = usoSevero ? 5000 : 10000;
    const passoMeses = usoSevero ? 6 : 12;

    const marcos = [];
    for (let i = 1; i <= 6; i++) {
        marcos.push({ ordem: i, km: i * passoKm, meses: i * passoMeses });
    }
    // Se já houver revisões salvas em marcos diferentes (ex: alternou normal/severo), inclui também
    (ctx.revisoes || []).forEach(r => {
        const mk = Number(r.marco_km);
        if (mk && !marcos.some(m => m.km === mk)) {
            marcos.push({ ordem: Math.round(mk / passoKm) || 1, km: mk, meses: Number(r.marco_meses) || Math.round(mk / 10000) * 12 });
        }
    });
    marcos.sort((a, b) => a.km - b.km);

    // Avalia cada marco por KM e por Tempo ("o que ocorrer primeiro")
    let alertasCriticos = [];
    let proxMarcoInfo = null;

    const cardsMarcosHtml = marcos.map((m, idx) => {
        const reg = revsMap[m.km] || null;
        const status = reg ? (reg.status || 'pendente') : 'pendente';
        const realizada = status === 'realizada';
        const agendada = status === 'agendada';

        // Cálculo de data-limite: se a revisão anterior foi realizada com data, soma passoMeses a partir dela; senão usa dtIniGar + m.meses
        const revAnt = idx > 0 ? revsMap[marcos[idx - 1].km] : null;
        const dtLimiteIso = (revAnt && revAnt.status === 'realizada' && revAnt.data_revisao)
            ? _mnRevSomarMesesISO(revAnt.data_revisao, passoMeses)
            : (dtIniGar ? _mnRevSomarMesesISO(dtIniGar, m.meses) : '');

        const diffKm = m.km - kmAtual;
        const diffDias = dtLimiteIso ? _mnRevDiffDias(dtLimiteIso, hojeIso) : null;

        let sitCor = '#64748b', sitBg = '#f8fafc', sitBorda = '#e2e8f0', sitLabel = 'No Prazo';
        let kmStatusTxt = '', tempoStatusTxt = '', prevalenciaTxt = '';

        if (realizada) {
            sitCor = '#15803d'; sitBg = '#f0fdf4'; sitBorda = '#86efac';
            sitLabel = 'Realizada';
            kmStatusTxt = reg.km_revisao ? `Feita com ${Number(reg.km_revisao).toLocaleString('pt-BR')} km` : `Marco ${m.km.toLocaleString('pt-BR')} km`;
            tempoStatusTxt = reg.data_revisao ? `Em ${_mnRevFmtDataBR(reg.data_revisao)}` : 'Data não informada';
            prevalenciaTxt = reg.concessionaria ? `Concessionária: ${reg.concessionaria}${reg.numero_os ? ' (OS ' + reg.numero_os + ')' : ''}` : 'Revisão concluída e registrada';
        } else {
            const vencKm = kmAtual > 0 && diffKm <= 0;
            const vencTempo = diffDias !== null && diffDias < 0;
            const proxKm = kmAtual > 0 && diffKm > 0 && diffKm <= 1500;
            const proxTempo = diffDias !== null && diffDias >= 0 && diffDias <= 45;

            if (vencKm || vencTempo) {
                sitCor = '#dc2626'; sitBg = '#fef2f2'; sitBorda = '#fca5a5';
                sitLabel = agendada ? 'Agendada (Marco Atingido)' : 'Pendente / Vencida';
                alertasCriticos.push(`Revisão de <b>${m.km.toLocaleString('pt-BR')} km (${m.meses}m)</b>: ${vencKm ? `ultrapassou <b>${Math.abs(diffKm).toLocaleString('pt-BR')} km</b> do marco` : ''}${vencKm && vencTempo ? ' e ' : ''}${vencTempo ? `venceu por tempo há <b>${Math.abs(diffDias)} dias</b>` : ''}.`);
            } else if (proxKm || proxTempo || agendada) {
                sitCor = '#d97706'; sitBg = '#fffbeb'; sitBorda = '#fcd34d';
                sitLabel = agendada ? 'Agendada' : 'Próxima Revisão';
            } else {
                sitCor = '#0284c7'; sitBg = '#f0f9ff'; sitBorda = '#bae6fd';
                sitLabel = 'Programada';
            }

            kmStatusTxt = kmAtual > 0
                ? (diffKm <= 0
                    ? `<span style="color:#dc2626;font-weight:800;">Passou ${Math.abs(diffKm).toLocaleString('pt-BR')} km</span>`
                    : `<span style="color:${diffKm <= 1500 ? '#d97706' : '#0f172a'};font-weight:700;">Faltam ${diffKm.toLocaleString('pt-BR')} km</span>`)
                : '<span style="color:#94a3b8;">KM atual não informado</span>';

            tempoStatusTxt = dtLimiteIso
                ? (diffDias < 0
                    ? `<span style="color:#dc2626;font-weight:800;">Vencida há ${Math.abs(diffDias)} dias (${_mnRevFmtDataBR(dtLimiteIso)})</span>`
                    : `<span style="color:${diffDias <= 45 ? '#d97706' : '#0f172a'};font-weight:700;">Faltam ${diffDias} dias (${_mnRevFmtDataBR(dtLimiteIso)})</span>`)
                : '<span style="color:#94a3b8;">Informe o início da garantia</span>';

            // Comparativo: qual critério ocorre primeiro?
            if (kmAtual > 0 && dtLimiteIso !== '') {
                const percKm = Math.min(150, Math.round((kmAtual / m.km) * 100));
                const diasTotais = Math.max(1, m.meses * 30.4);
                const diasDecorridos = diasTotais - (diffDias || 0);
                const percTempo = Math.min(150, Math.round((diasDecorridos / diasTotais) * 100));
                if (percKm >= percTempo) {
                    prevalenciaTxt = `\u26A1 Critério mais próximo: <b>Quilometragem (${percKm}% do limite de KM vs ${Math.max(0, percTempo)}% do tempo)</b>`;
                } else {
                    prevalenciaTxt = `\u23F0 Critério mais próximo: <b>Tempo (${Math.max(0, percTempo)}% do prazo vs ${percKm}% do limite de KM)</b>`;
                }
            } else if (kmAtual > 0) {
                prevalenciaTxt = `\u26A1 Acompanhando por KM (${Math.min(150, Math.round((kmAtual / m.km) * 100))}% do marco)`;
            } else {
                prevalenciaTxt = 'Preencha a data de início da garantia para comparar KM × Tempo';
            }

            if (!proxMarcoInfo && diffKm > 0) {
                proxMarcoInfo = { km: m.km, meses: m.meses, diffKm, diffDias, dtLimiteIso };
            }
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
                    <div style="font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">${idx + 1}ª Revisão Programada</div>
                    <div style="font-size:1.15rem;font-weight:800;color:#1e293b;">${m.km.toLocaleString('pt-BR')} km <span style="font-size:0.85rem;font-weight:600;color:#64748b;">ou ${m.meses} meses</span></div>
                </div>
                <span style="background:${sitBg};color:${sitCor};border:1px solid ${sitBorda};padding:4px 10px;border-radius:999px;font-size:0.74rem;font-weight:800;white-space:nowrap;">${sitLabel}</span>
            </div>

            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:0.65rem 0.8rem;display:flex;flex-direction:column;gap:6px;font-size:0.8rem;">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                    <span style="color:#64748b;font-weight:600;"><i class="ph ph-gauge"></i> Por KM:</span>
                    <span>${kmStatusTxt}</span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                    <span style="color:#64748b;font-weight:600;"><i class="ph ph-calendar"></i> Por Tempo:</span>
                    <span>${tempoStatusTxt}</span>
                </div>
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
                ${qtdVerif > 0 ? `<span style="background:#ecfdf5;color:#047857;padding:3px 8px;border-radius:6px;font-weight:600;"><i class="ph ph-check-square-offset"></i> ${qtdVerif} verificados (${qtdTrocaManut} c/ troca/manut.)</span>` : ''}
            </div>

            <div style="display:flex;gap:8px;margin-top:auto;padding-top:4px;">
                <button onclick="window.mnRevAbrirModalMarco(${m.km}, ${m.meses})" style="flex:1;background:#7c3aed;color:#fff;border:none;border-radius:8px;padding:0.55rem 0.8rem;font-size:0.8rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                    <i class="ph ph-clipboard-text"></i> ${realizada ? 'Ver / Editar Revisão' : 'Registrar / Checklist'}
                </button>
            </div>
        </div>`;
    }).join('');

    const bannerDiagnHtml = alertasCriticos.length > 0
        ? `<div style="background:#fef2f2;border:1.5px solid #fca5a5;border-left:5px solid #dc2626;border-radius:12px;padding:1rem 1.25rem;margin-bottom:1.25rem;">
            <div style="font-weight:800;color:#991b1b;font-size:0.95rem;margin-bottom:6px;display:flex;align-items:center;gap:8px;">
                <i class="ph ph-warning-octagon" style="font-size:1.3rem;color:#dc2626;"></i>
                Atenção para Preservação da Garantia (${v.placa} — ${kmAtual.toLocaleString('pt-BR')} km)
            </div>
            <ul style="margin:0;padding-left:1.25rem;color:#7f1d1d;font-size:0.84rem;line-height:1.5;">
                ${alertasCriticos.map(a => `<li>${a}</li>`).join('')}
                <li>Se a revisão já foi executada na concessionária, clique em <b>"Registrar / Checklist"</b> no card correspondente abaixo, marque como <b>Realizada</b>, registre as verificações/trocas e anexe a Nota Fiscal / Ordem de Serviço.</li>
                ${proxMarcoInfo ? `<li>Próximo marco subsequente: <b>${proxMarcoInfo.km.toLocaleString('pt-BR')} km</b> (faltam <b>${proxMarcoInfo.diffKm.toLocaleString('pt-BR')} km</b>${proxMarcoInfo.dtLimiteIso ? ` ou até <b>${_mnRevFmtDataBR(proxMarcoInfo.dtLimiteIso)}</b>` : ''}).</li>` : ''}
            </ul>
        </div>`
        : `<div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-left:5px solid #16a34a;border-radius:12px;padding:0.9rem 1.25rem;margin-bottom:1.25rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
            <div style="color:#166534;font-size:0.86rem;font-weight:600;">
                <i class="ph ph-seal-check" style="color:#16a34a;font-size:1.1rem;"></i>
                Revisões em dia para a quilometragem atual (<b>${kmAtual.toLocaleString('pt-BR')} km</b>).
                ${proxMarcoInfo ? `Próxima revisão programada aos <b>${proxMarcoInfo.km.toLocaleString('pt-BR')} km</b> (faltam <b>${proxMarcoInfo.diffKm.toLocaleString('pt-BR')} km</b>${proxMarcoInfo.dtLimiteIso ? ` ou até <b>${_mnRevFmtDataBR(proxMarcoInfo.dtLimiteIso)}</b>` : ''}).` : ''}
            </div>
        </div>`;

    det.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:1rem;">
        <!-- Barra superior -->
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:1rem 1.25rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                <button onclick="window.mnRevisaoVoltarCards()" style="background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;border-radius:8px;padding:0.45rem 0.9rem;font-size:0.82rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
                    <i class="ph ph-arrow-left"></i> Voltar aos veículos
                </button>
                <div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="font-size:1.25rem;font-weight:800;color:#1e293b;">${v.placa}</span>
                        <span style="background:#f3e8ff;color:#6d28d9;padding:2px 10px;border-radius:999px;font-size:0.75rem;font-weight:700;">Plano de Revisão — Garantia</span>
                    </div>
                    <div style="font-size:0.84rem;color:#64748b;font-weight:600;">${v.marca_modelo_versao || ''}</div>
                </div>
            </div>

            <!-- Parâmetros de KM (Somente Leitura) e Datas/Regime -->
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:0.45rem 0.85rem;" title="Preenchido diariamente pelo assistente na tela de Gestão de Frota">
                    <div style="font-size:0.68rem;font-weight:700;color:#64748b;text-transform:uppercase;">KM Atual (Somente leitura)</div>
                    <div style="font-size:1rem;font-weight:800;color:#0f172a;"><i class="ph ph-gauge" style="color:#d97706;"></i> ${kmAtual ? kmAtual.toLocaleString('pt-BR') + ' km' : 'Não informado'}</div>
                </div>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:0.4rem 0.75rem;">
                    <label style="font-size:0.68rem;font-weight:700;color:#64748b;text-transform:uppercase;display:block;">Compra / Início Garantia</label>
                    <input type="date" id="mn-rev-cfg-inicio" value="${dtIniGar}" onchange="window._mnRevSalvarConfigVeiculo(${v.id})" style="border:1px solid #cbd5e1;border-radius:6px;padding:2px 6px;font-size:0.8rem;font-weight:600;color:#1e293b;">
                </div>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:0.4rem 0.75rem;">
                    <label style="font-size:0.68rem;font-weight:700;color:#64748b;text-transform:uppercase;display:block;">Garantia de Fábrica Até</label>
                    <div style="font-size:0.88rem;font-weight:800;color:#16a34a;padding:2px 0;">${_mnRevFmtDataBR(garAte)}</div>
                </div>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:0.4rem 0.75rem;">
                    <label style="font-size:0.68rem;font-weight:700;color:#64748b;text-transform:uppercase;display:block;">Regime de Uso (Manual)</label>
                    <select id="mn-rev-cfg-severo" onchange="window._mnRevSalvarConfigVeiculo(${v.id})" style="border:1px solid #cbd5e1;border-radius:6px;padding:2px 6px;font-size:0.8rem;font-weight:700;color:${usoSevero ? '#dc2626' : '#1e293b'};">
                        <option value="0"${usoSevero ? '' : ' selected'}>Normal (10.000 km / 12m)</option>
                        <option value="1"${usoSevero ? ' selected' : ''}>Uso Severo (5.000 km / 6m)</option>
                    </select>
                </div>
            </div>
        </div>

        ${bannerDiagnHtml}

        <!-- Grid dos Marcos de Revisão (10k, 20k, 30k, 40k, 50k, 60k) -->
        <div>
            <h3 style="margin:0 0 0.75rem;font-size:1rem;color:#1e293b;display:flex;align-items:center;gap:8px;">
                <i class="ph ph-calendar-check" style="color:#7c3aed;font-size:1.2rem;"></i>
                Marcos de Revisão Programada — Comparativo por KM ou Tempo (o que ocorrer primeiro)
            </h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:1rem;">
                ${cardsMarcosHtml}
            </div>
        </div>

        <!-- Guia de Referência Rápida do Manual (Preservação da Garantia & Opcionais) -->
        <details style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:1rem 1.25rem;">
            <summary style="cursor:pointer;font-weight:800;color:#1e293b;font-size:0.95rem;display:flex;align-items:center;gap:8px;">
                <i class="ph ph-book-open-text" style="color:#7c3aed;font-size:1.2rem;"></i>
                Regras do Manual para Preservar a Garantia, Tabela de Verificações e O que é Opcional (Clique para expandir)
            </summary>
            <div style="margin-top:1rem;display:flex;flex-direction:column;gap:1rem;font-size:0.83rem;color:#334155;">
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:0.75rem;">
                    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:0.8rem;">
                        <div style="font-weight:800;color:#166534;margin-bottom:4px;">\u2705 Obrigatório</div>
                        Realizar as revisões programadas nos intervalos de KM ou tempo (na rede autorizada Fiat), executar as trocas e verificações prescritas e arquivar todas as NFs e Ordens de Serviço.
                    </div>
                    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:0.8rem;">
                        <div style="font-weight:800;color:#92400e;margin-bottom:4px;">\u26A0\uFE0F Obrigatório quando aplicável</div>
                        Substituir peças que atingirem limites de desgaste ou apresentarem defeito (especialmente segurança). Pastilhas, discos, pneus, bateria e palhetas <b>não são troca automática</b>.
                    </div>
                    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:0.8rem;">
                        <div style="font-weight:800;color:#075985;margin-bottom:4px;">\u2139\uFE0F Opcional (Sem perda de garantia)</div>
                        Serviços extras não previstos no plano nem necessários para corrigir defeito (ex.: limpeza de bicos por rotina, descarbonização, aditivos extras, lavagem técnica).
                    </div>
                </div>
            </div>
        </details>
    </div>`;
};

// Abre o modal completo para registrar/editar uma revisao especifica (ex: 10.000 km): 1) execucao, 2) servicos, 3) notas/OS, 4) valores
window._mnRevEsc = function(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

// Lista de servicos da revisao: obrigatorios (trocas previstas no marco + verificacoes obrigatorias) e opcionais (demais)
window._mnRevServicosDoMarco = function(marcoKm) {
    const lista = [];
    const mk = Number(marcoKm);
    window._mnRevCatTrocas.forEach(function(it) {
        const previsto = (it.marcosTroca || []).includes(mk)
            || (it.marcosTroca || []).length === 0
            || (mk % 10000 !== 0 && ['oleo_motor', 'filtro_oleo'].includes(it.id));
        lista.push({
            id: it.id, nome: it.nome, desc: it.oQueFazer, risco: it.risco,
            grupo: previsto ? 'obrigatorio' : 'opcional',
            origem: previsto ? 'Troca/inspeção prevista neste marco' : 'Não prevista neste marco (somente se necessário)',
            tipoPadrao: previsto && (it.marcosTroca || []).includes(mk) ? 'troca_manutencao' : 'vistoriado'
        });
    });
    window._mnRevCatVerificacoes.forEach(function(it) {
        lista.push({ id: it.id, nome: it.nome, desc: it.oQueFazer, risco: it.risco, grupo: 'obrigatorio', origem: 'Verificação obrigatória', tipoPadrao: 'vistoriado' });
    });
    window._mnRevCatOpcionais.forEach(function(it) {
        lista.push({ id: it.id, nome: it.nome, desc: it.obrigatorio + ' — ' + it.quando, risco: '', grupo: 'opcional', origem: 'Opcional / condicional', tipoPadrao: 'troca_manutencao' });
    });
    return lista;
};

window._mnRevLinhaServicoHtml = function(s, st) {
    const E = window._mnRevEsc;
    const marcado = st.realizado === true || st.realizado === 'true';
    const tipo = st.tipo || s.tipoPadrao;
    const obrig = s.grupo === 'obrigatorio';
    return `
    <tr data-rev-row="${s.id}" style="border-bottom:1px solid #e2e8f0;background:${marcado ? '#f0fdf4' : '#fff'};">
        <td style="padding:8px 10px;width:34px;text-align:center;">
            <input type="checkbox" data-rev-item="${s.id}" data-rev-field="realizado" ${marcado ? 'checked' : ''} onchange="window._mnRevServicoMarcou('${s.id}')" style="width:18px;height:18px;cursor:pointer;accent-color:#16a34a;">
        </td>
        <td style="padding:8px 10px;">
            <div style="font-weight:700;color:#1e293b;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">${E(s.nome)}
                ${obrig ? '<span style="background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;padding:1px 7px;border-radius:999px;font-size:0.66rem;font-weight:800;">OBRIGATÓRIO</span>' : '<span style="background:#f1f5f9;color:#64748b;padding:1px 7px;border-radius:999px;font-size:0.66rem;font-weight:700;">OPCIONAL</span>'}
            </div>
            <div style="font-size:0.74rem;color:#64748b;">${E(s.desc)}</div>
            <div style="font-size:0.7rem;color:#94a3b8;">${E(s.origem)}${s.risco ? ' • Risco p/ garantia: ' + E(s.risco) : ''}</div>
        </td>
        <td style="padding:8px 10px;width:260px;">
            <select data-rev-item="${s.id}" data-rev-field="tipo" ${marcado ? '' : 'disabled'} style="width:100%;padding:5px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.78rem;font-weight:600;${marcado ? '' : 'background:#f1f5f9;color:#94a3b8;'}">
                <option value="troca_manutencao"${tipo === 'troca_manutencao' ? ' selected' : ''}>Manutenção / troca realizada</option>
                <option value="vistoriado"${tipo === 'vistoriado' ? ' selected' : ''}>Vistoriado (sem manutenção/troca)</option>
            </select>
        </td>
        <td style="padding:8px 10px;width:200px;">
            <input type="text" data-rev-item="${s.id}" data-rev-field="obs" value="${E(st.obs || '')}" placeholder="Obs / marca / detalhe..." style="width:100%;padding:5px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.78rem;box-sizing:border-box;">
        </td>
    </tr>`;
};

window._mnRevServicoMarcou = function(id) {
    const cb = document.querySelector('#mn-rev-modal-ov input[data-rev-item="' + id + '"][data-rev-field="realizado"]');
    const sel = document.querySelector('#mn-rev-modal-ov select[data-rev-item="' + id + '"][data-rev-field="tipo"]');
    const row = document.querySelector('#mn-rev-modal-ov tr[data-rev-row="' + id + '"]');
    if (!cb) return;
    if (sel) { sel.disabled = !cb.checked; sel.style.background = cb.checked ? '' : '#f1f5f9'; sel.style.color = cb.checked ? '' : '#94a3b8'; }
    if (row) row.style.background = cb.checked ? '#f0fdf4' : '#fff';
    window._mnRevAtualizarContadorObrig();
};

window._mnRevAtualizarContadorObrig = function() {
    const servs = window._mnRevServicosModal || [];
    const obrig = servs.filter(function(s) { return s.grupo === 'obrigatorio'; });
    let ok = 0;
    obrig.forEach(function(s) {
        const cb = document.querySelector('#mn-rev-modal-ov input[data-rev-item="' + s.id + '"][data-rev-field="realizado"]');
        if (cb && cb.checked) ok++;
    });
    const el = document.getElementById('mn-rev-cont-obrig');
    if (el) {
        const completo = ok === obrig.length;
        el.textContent = ok + ' de ' + obrig.length + ' obrigatórios marcados';
        el.style.background = completo ? '#dcfce7' : '#fef2f2';
        el.style.color = completo ? '#15803d' : '#b91c1c';
    }
};

window.mnRevAbrirModalMarco = function(marcoKm, marcoMeses) {
    const ctx = window._mnRevAtual;
    if (!ctx || !ctx.veiculo) return;
    const E = window._mnRevEsc;
    const v = ctx.veiculo;
    const reg = (ctx.revisoes || []).find(function(r) { return Number(r.marco_km) === Number(marcoKm); }) || {
        id: null, veiculo_id: v.id, marco_km: marcoKm, marco_meses: marcoMeses, status: 'pendente', data_revisao: '', km_revisao: '',
        concessionaria: 'Concessionária Autorizada Fiat', numero_os: '', valor_pecas: 0, valor_mao_obra: 0, valor_total: 0,
        itens: {}, observacoes: '', anexos: [], lancamentos: []
    };
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
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.75);backdrop-filter:blur(3px);z-index:10050;display:flex;align-items:center;justify-content:center;padding:1rem;overflow-y:auto;';

    const obrig = servicos.filter(function(s) { return s.grupo === 'obrigatorio'; });
    const opcio = servicos.filter(function(s) { return s.grupo === 'opcional'; });
    const thServ = `<thead><tr style="background:#f1f5f9;text-align:left;color:#475569;">
        <th style="padding:8px 10px;width:34px;text-align:center;">OK</th>
        <th style="padding:8px 10px;">Serviço / O que fazer</th>
        <th style="padding:8px 10px;width:260px;">Foi realizado como?</th>
        <th style="padding:8px 10px;width:200px;">Observações</th></tr></thead>`;

    ov.innerHTML = `
    <div style="background:#fff;border-radius:16px;width:100%;max-width:1100px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 25px 60px rgba(0,0,0,0.35);overflow:hidden;">
        <div style="background:linear-gradient(135deg,#5b21b6,#7c3aed);color:#fff;padding:1.1rem 1.5rem;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
            <div>
                <div style="font-size:0.75rem;opacity:0.9;font-weight:600;text-transform:uppercase;">${E(v.placa)} • ${E(v.marca_modelo_versao || '')} • KM Atual: ${Number(v.km_atual || 0).toLocaleString('pt-BR')} km</div>
                <h3 style="margin:2px 0 0;font-size:1.2rem;font-weight:800;">Revisão de ${Number(marcoKm).toLocaleString('pt-BR')} km (${marcoMeses} meses)</h3>
            </div>
            <button onclick="document.getElementById('mn-rev-modal-ov').remove()" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:34px;height:34px;border-radius:50%;cursor:pointer;font-size:1.2rem;">&times;</button>
        </div>

        <div style="padding:1.25rem 1.5rem;overflow-y:auto;flex:1;display:block;">
            <!-- 1. Registro de execucao -->
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:1rem;margin-bottom:1.25rem;">
                <div style="font-weight:800;color:#1e293b;margin-bottom:0.75rem;font-size:0.9rem;"><i class="ph ph-wrench" style="color:#7c3aed;"></i> 1. Registro de Execução da Revisão</div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:0.75rem;">
                    <div>
                        <label style="font-size:0.75rem;font-weight:700;color:#475569;display:block;margin-bottom:4px;">Situação da Revisão *</label>
                        <select id="mn-rev-f-status" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:8px;font-weight:700;font-size:0.85rem;">
                            <option value="pendente"${reg.status === 'pendente' ? ' selected' : ''}>Pendente</option>
                            <option value="agendada"${reg.status === 'agendada' ? ' selected' : ''}>Agendada</option>
                            <option value="realizada"${reg.status === 'realizada' ? ' selected' : ''}>Realizada (Concluída)</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-size:0.75rem;font-weight:700;color:#475569;display:block;margin-bottom:4px;">Data da Revisão</label>
                        <input type="date" id="mn-rev-f-data" value="${String(reg.data_revisao || '').split('T')[0]}" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:8px;font-size:0.85rem;box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="font-size:0.75rem;font-weight:700;color:#475569;display:block;margin-bottom:4px;">KM em que foi realizada</label>
                        <input type="number" id="mn-rev-f-km" value="${reg.km_revisao || ''}" placeholder="Ex: ${marcoKm}" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:8px;font-size:0.85rem;box-sizing:border-box;">
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

            <!-- 2. Servicos obrigatorios e opcionais -->
            <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:1.25rem;">
                <div style="background:#f8fafc;padding:0.75rem 1rem;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                    <div style="font-weight:800;color:#1e293b;font-size:0.9rem;"><i class="ph ph-list-checks" style="color:#7c3aed;"></i> 2. Serviços da Revisão — marque o que foi realizado</div>
                    <span id="mn-rev-cont-obrig" style="font-size:0.75rem;font-weight:800;padding:3px 10px;border-radius:999px;background:#fef2f2;color:#b91c1c;"></span>
                </div>
                <div style="padding:6px 12px;background:#fef2f2;color:#991b1b;font-size:0.78rem;font-weight:800;border-bottom:1px solid #fecaca;">Serviços OBRIGATÓRIOS (todos devem ser marcados como realizados para salvar a revisão como Realizada)</div>
                <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:0.8rem;">${thServ}<tbody>${obrig.map(function(s) { return window._mnRevLinhaServicoHtml(s, itensSalvos[s.id] || {}); }).join('')}</tbody></table></div>
                <div style="padding:6px 12px;background:#f1f5f9;color:#475569;font-size:0.78rem;font-weight:800;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">Serviços OPCIONAIS / condicionais (marque apenas se foram vistoriados ou realizados)</div>
                <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:0.8rem;">${thServ}<tbody>${opcio.map(function(s) { return window._mnRevLinhaServicoHtml(s, itensSalvos[s.id] || {}); }).join('')}</tbody></table></div>
            </div>

            <!-- 3. Anexar notas / OS -->
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:1rem;margin-bottom:1.25rem;">
                <div style="font-weight:800;color:#1e293b;margin-bottom:0.75rem;font-size:0.9rem;"><i class="ph ph-receipt" style="color:#0284c7;"></i> 3. Anexar Nota Fiscal de Serviço, Nota de Peças ou Ordem de Serviço (PDF)</div>
                <div style="background:#fff;border:1px dashed #94a3b8;border-radius:10px;padding:0.85rem;">
                    <div style="font-size:0.76rem;color:#475569;margin-bottom:8px;">Selecione o PDF: o sistema lê a nota e preenche as peças e a mão de obra (valores podem estar separados ou juntos, em uma ou várias notas). Depois vincule cada item a um serviço da revisão.</div>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;align-items:end;">
                        <div>
                            <label style="font-size:0.7rem;font-weight:600;color:#64748b;display:block;margin-bottom:2px;">Tipo de Documento</label>
                            <select id="mn-rev-anx-tipo" style="width:100%;padding:0.45rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.8rem;">
                                <option value="nota_servico">Nota Fiscal de Serviço (Mão de Obra)</option>
                                <option value="nota_pecas">Nota Fiscal de Peças (DANFE)</option>
                                <option value="ordem_servico">Ordem de Serviço (OS Concessionária)</option>
                                <option value="outro">Outro Comprovante</option>
                            </select>
                        </div>
                        <div>
                            <label style="font-size:0.7rem;font-weight:600;color:#64748b;display:block;margin-bottom:2px;">Arquivo PDF</label>
                            <input type="file" id="mn-rev-anx-file" accept="application/pdf" onchange="window._mnRevAoEscolherPdf(this)" style="width:100%;font-size:0.76rem;">
                        </div>
                    </div>
                    <div id="mn-rev-stage" style="margin-top:0.75rem;"></div>
                    <div style="font-size:0.78rem;font-weight:700;color:#334155;margin:0.9rem 0 6px;">Notas / OS já anexadas nesta revisão:</div>
                    <div id="mn-rev-anx-lista" style="display:flex;flex-direction:column;gap:6px;"></div>
                </div>
            </div>

            <!-- 4. Valores -->
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:1rem;margin-bottom:1.25rem;">
                <div style="font-weight:800;color:#1e293b;margin-bottom:0.75rem;font-size:0.9rem;"><i class="ph ph-currency-circle-dollar" style="color:#16a34a;"></i> 4. Valores da Revisão (preenchidos a partir das notas anexadas)</div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:0.75rem;">
                    <div>
                        <label style="font-size:0.75rem;font-weight:700;color:#475569;display:block;margin-bottom:4px;">Valor de Peças (R$)</label>
                        <input type="number" step="0.01" id="mn-rev-f-vpecas" value="${reg.valor_pecas || 0}" oninput="window._mnRevCalcTotalModal()" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:8px;font-size:0.85rem;box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="font-size:0.75rem;font-weight:700;color:#475569;display:block;margin-bottom:4px;">Valor Mão de Obra / Serviço (R$)</label>
                        <input type="number" step="0.01" id="mn-rev-f-vmo" value="${reg.valor_mao_obra || 0}" oninput="window._mnRevCalcTotalModal()" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:8px;font-size:0.85rem;box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="font-size:0.75rem;font-weight:700;color:#475569;display:block;margin-bottom:4px;">Valor Total da Revisão (R$)</label>
                        <input type="number" step="0.01" id="mn-rev-f-vtotal" value="${reg.valor_total || 0}" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:8px;font-size:0.9rem;font-weight:800;color:#0f172a;background:#fff;box-sizing:border-box;">
                    </div>
                </div>
                <div id="mn-rev-custos-serv" style="margin-top:0.9rem;"></div>
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
};

// Revisao do marco aberto (dados mais recentes vindos do servidor)
window._mnRevRegAtual = function() {
    const m = window._mnRevMarcoAtual;
    const ctx = window._mnRevAtual;
    if (!m || !ctx) return null;
    return (ctx.revisoes || []).find(function(r) { return Number(r.marco_km) === Number(m.km); }) || null;
};

// Atualiza lista de anexos e custo por servico (e, se pedido, os campos de valores) a partir dos dados do servidor
window._mnRevAtualizarModalDados = function(atualizaValores) {
    const reg = window._mnRevRegAtual();
    const listaEl = document.getElementById('mn-rev-anx-lista');
    if (listaEl) listaEl.innerHTML = window._mnRevRenderListaAnexos(reg ? (reg.anexos || []) : [], reg ? (reg.lancamentos || []) : []);
    if (atualizaValores && reg) {
        const set = function(id, val) { const el = document.getElementById(id); if (el) el.value = Number(val || 0).toFixed(2); };
        set('mn-rev-f-vpecas', reg.valor_pecas); set('mn-rev-f-vmo', reg.valor_mao_obra); set('mn-rev-f-vtotal', reg.valor_total);
    }
    const custEl = document.getElementById('mn-rev-custos-serv');
    if (custEl) custEl.innerHTML = window._mnRevCustosPorServicoHtml(reg ? (reg.lancamentos || []) : []);
};

window._mnRevCustosPorServicoHtml = function(lancs) {
    if (!lancs || !lancs.length) return '<div style="font-size:0.78rem;color:#94a3b8;">Os custos por serviço aparecem aqui depois de anexar e vincular as notas.</div>';
    const nomes = {};
    (window._mnRevServicosModal || []).forEach(function(s) { nomes[s.id] = s; });
    const acc = {};
    let semVinculo = 0;
    lancs.forEach(function(l) {
        const sv = Array.isArray(l.servicos) ? l.servicos : [];
        const val = Number(l.valor_total || 0);
        if (!sv.length) { semVinculo += val; return; }
        const parte = val / sv.length;
        sv.forEach(function(id) {
            if (!acc[id]) acc[id] = { pecas: 0, mo: 0 };
            if (l.tipo === 'mao_obra') acc[id].mo += parte; else acc[id].pecas += parte;
        });
    });
    const fmt = function(n) { return Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
    const E = window._mnRevEsc;
    const linhas = Object.keys(acc).map(function(id) {
        const s = nomes[id];
        const a = acc[id];
        return `<tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:5px 8px;font-weight:600;color:#1e293b;">${E(s ? s.nome : id)} <span style="font-size:0.66rem;font-weight:800;color:${s && s.grupo === 'obrigatorio' ? '#dc2626' : '#64748b'};">${s ? (s.grupo === 'obrigatorio' ? 'OBRIGATÓRIO' : 'OPCIONAL') : ''}</span></td><td style="padding:5px 8px;text-align:right;">${fmt(a.pecas)}</td><td style="padding:5px 8px;text-align:right;">${fmt(a.mo)}</td><td style="padding:5px 8px;text-align:right;font-weight:800;">${fmt(a.pecas + a.mo)}</td></tr>`;
    }).join('');
    return `<div style="font-size:0.78rem;font-weight:700;color:#334155;margin-bottom:4px;">Custo por serviço (rateado entre os serviços vinculados)</div>
    <div style="overflow-x:auto;background:#fff;border:1px solid #e2e8f0;border-radius:8px;"><table style="width:100%;border-collapse:collapse;font-size:0.78rem;">
    <thead><tr style="background:#f1f5f9;color:#475569;text-align:left;"><th style="padding:5px 8px;">Serviço</th><th style="padding:5px 8px;text-align:right;">Peças</th><th style="padding:5px 8px;text-align:right;">Mão de obra</th><th style="padding:5px 8px;text-align:right;">Total</th></tr></thead>
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
    if (!anexos || !anexos.length) {
        return '<div style="font-size:0.78rem;color:#94a3b8;padding:4px 0;">Nenhuma nota ou OS anexada ainda nesta revisão.</div>';
    }
    const E = window._mnRevEsc;
    const nomes = {};
    (window._mnRevServicosModal || []).forEach(function(s) { nomes[s.id] = s.nome; });
    const tipoLbl = { nota_servico: 'NF Serviço (Mão de Obra)', nota_pecas: 'NF Peças (DANFE)', ordem_servico: 'Ordem de Serviço (OS)', outro: 'Comprovante' };
    const fmt = function(n) { return Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
    return anexos.map(function(a) {
        const ls = (lancs || []).filter(function(l) { return Number(l.anexo_id) === Number(a.id); });
        const linhasHtml = ls.length ? `<div style="margin-top:6px;border-top:1px dashed #cbd5e1;padding-top:6px;display:flex;flex-direction:column;gap:3px;">${ls.map(function(l) {
            const sv = (l.servicos || []).map(function(id) { return E(nomes[id] || id); }).join(', ') || '<span style="color:#b45309;">sem vínculo</span>';
            return `<div style="display:flex;justify-content:space-between;gap:8px;font-size:0.74rem;color:#475569;"><span><b>${l.tipo === 'mao_obra' ? 'Mão de obra' : 'Peça'}:</b> ${E(l.descricao)} <span style="color:#94a3b8;">→ ${sv}</span></span><span style="font-weight:700;">${fmt(l.valor_total)}</span></div>`;
        }).join('')}</div>` : '';
        return `
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:6px 10px;font-size:0.78rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <i class="ph ph-file-pdf" style="color:#dc2626;font-size:1.1rem;"></i>
                    <span style="font-weight:700;color:#1e293b;">${tipoLbl[a.tipo_documento] || E(a.tipo_documento)}</span>
                    ${a.numero_nota ? `<span style="color:#475569;">Nº <b>${E(a.numero_nota)}</b></span>` : ''}
                    ${Number(a.valor || 0) > 0 ? `<span style="color:#15803d;font-weight:700;">${fmt(a.valor)}</span>` : ''}
                    <span style="color:#94a3b8;">(${E(a.nome_arquivo || 'PDF')})</span>
                </div>
                <div style="display:flex;align-items:center;gap:6px;">
                    <button type="button" onclick="window._mnRevAbrirPdfAnexo(${a.id})" style="background:#0284c7;color:#fff;border:none;border-radius:6px;padding:3px 9px;font-size:0.74rem;font-weight:700;cursor:pointer;">Abrir PDF</button>
                    <button type="button" onclick="window._mnRevExcluirAnexo(${a.id})" style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:6px;padding:3px 8px;font-size:0.74rem;font-weight:700;cursor:pointer;">Excluir</button>
                </div>
            </div>${linhasHtml}
        </div>`;
    }).join('');
};

// ── Leitura do PDF e vinculo das linhas aos servicos ─────────────────────────
window._mnRevAoEscolherPdf = async function(inp) {
    const file = inp && inp.files && inp.files[0];
    const stageEl = document.getElementById('mn-rev-stage');
    if (!file) { window._mnRevNotaStage = null; if (stageEl) stageEl.innerHTML = ''; return; }
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
        if (temP && !temM) tipoSel.value = 'nota_pecas'; else if (temM) tipoSel.value = 'nota_servico';
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
        const resumo = l.servicos.length ? (l.servicos.length + ' serviço(s)') : 'Vincular serviço...';
        return `<tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:5px 6px;text-align:center;"><input type="checkbox" ${l.incluir ? 'checked' : ''} onchange="window._mnRevStageSet(${i},'incluir',this.checked)" style="accent-color:#0284c7;"></td>
            <td style="padding:5px 6px;"><select onchange="window._mnRevStageSet(${i},'tipo',this.value)" style="padding:3px 4px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.76rem;"><option value="peca"${l.tipo === 'peca' ? ' selected' : ''}>Peça</option><option value="mao_obra"${l.tipo === 'mao_obra' ? ' selected' : ''}>Mão de obra</option></select></td>
            <td style="padding:5px 6px;"><input type="text" value="${E(l.descricao)}" onchange="window._mnRevStageSet(${i},'descricao',this.value)" style="width:100%;padding:3px 6px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.76rem;box-sizing:border-box;"></td>
            <td style="padding:5px 6px;width:110px;"><input type="number" step="0.01" value="${Number(l.valor_total || 0).toFixed(2)}" onchange="window._mnRevStageSet(${i},'valor_total',this.value)" style="width:100%;padding:3px 6px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.76rem;text-align:right;box-sizing:border-box;"></td>
            <td style="padding:5px 6px;width:190px;">
                <details style="position:relative;">
                    <summary id="mn-stg-sum-${i}" style="cursor:pointer;font-size:0.76rem;font-weight:700;color:${l.servicos.length ? '#15803d' : '#b45309'};border:1px solid #cbd5e1;border-radius:6px;padding:3px 8px;background:#fff;list-style:none;">${resumo}</summary>
                    <div style="position:absolute;right:0;z-index:5;background:#fff;border:1px solid #cbd5e1;border-radius:8px;box-shadow:0 8px 20px rgba(0,0,0,0.15);padding:6px 10px;max-height:240px;overflow-y:auto;min-width:260px;">
                        ${window._mnRevServicosOpcoesHtml(l.servicos, 'l' + i, "window._mnRevStageToggleServ(" + i + ",'__ID__',this.checked)")}
                    </div>
                </details>
            </td>
            <td style="padding:5px 6px;width:30px;text-align:center;"><button type="button" onclick="window._mnRevStageRemove(${i})" title="Remover linha" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:1rem;">&times;</button></td>
        </tr>`;
    }).join('');
    el.innerHTML = `
    <div style="border:1.5px solid #bae6fd;background:#f0f9ff;border-radius:10px;padding:0.8rem;">
        <div style="font-weight:800;color:#075985;font-size:0.85rem;margin-bottom:6px;"><i class="ph ph-file-pdf"></i> ${E(st.file.name)} — confira o que foi lido e vincule aos serviços</div>
        ${(st.avisos || []).map(function(a) { return `<div style="font-size:0.74rem;color:#b45309;margin-bottom:3px;">\u26A0\uFE0F ${E(a)}</div>`; }).join('')}
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;margin:6px 0 10px;">
            <div><label style="font-size:0.7rem;font-weight:600;color:#64748b;display:block;margin-bottom:2px;">Nº da Nota / OS</label><input type="text" value="${E(st.numero)}" onchange="window._mnRevNotaStage.numero=this.value" style="width:100%;padding:0.4rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.8rem;box-sizing:border-box;"></div>
            <div><label style="font-size:0.7rem;font-weight:600;color:#64748b;display:block;margin-bottom:2px;">Fornecedor</label><input type="text" value="${E(st.fornecedor)}" onchange="window._mnRevNotaStage.fornecedor=this.value" style="width:100%;padding:0.4rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.8rem;box-sizing:border-box;"></div>
        </div>
        <div style="overflow-x:auto;background:#fff;border:1px solid #e2e8f0;border-radius:8px;">
            <table style="width:100%;border-collapse:collapse;font-size:0.78rem;">
                <thead><tr style="background:#f1f5f9;color:#475569;text-align:left;"><th style="padding:5px 6px;width:34px;text-align:center;">Usar</th><th style="padding:5px 6px;width:110px;">Tipo</th><th style="padding:5px 6px;">Descrição (peça / serviço)</th><th style="padding:5px 6px;">Valor (R$)</th><th style="padding:5px 6px;">Serviço vinculado *</th><th></th></tr></thead>
                <tbody>${linhas || '<tr><td colspan="6" style="padding:10px;text-align:center;color:#94a3b8;">Nenhuma linha foi lida automaticamente. Adicione as linhas manualmente.</td></tr>'}</tbody>
            </table>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-top:6px;">
            <button type="button" onclick="window._mnRevStageAdd()" style="background:#fff;color:#0284c7;border:1px solid #7dd3fc;border-radius:6px;padding:3px 10px;font-size:0.76rem;font-weight:700;cursor:pointer;">+ Adicionar linha manual</button>
            <div id="mn-rev-stage-tot" style="font-size:0.8rem;font-weight:800;color:#0f172a;"></div>
        </div>
        <div style="margin-top:10px;border-top:1px dashed #7dd3fc;padding-top:8px;">
            <div style="font-size:0.78rem;font-weight:800;color:#075985;margin-bottom:4px;">Ratear entre serviços selecionados</div>
            <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start;">
                <div style="background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:4px 10px;max-height:150px;overflow-y:auto;min-width:240px;">
                    ${window._mnRevServicosOpcoesHtml(sel, 'r', "window._mnRevRateioToggleServ('__ID__',this.checked)")}
                </div>
                <div style="display:flex;flex-direction:column;gap:6px;">
                    <select id="mn-rev-rateio-escopo" style="padding:5px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.78rem;font-weight:600;">
                        <option value="produto">Ratear por produto (todas as peças)</option>
                        <option value="mao_obra">Ratear por mão de obra (todas as linhas de serviço)</option>
                        <option value="total">Ratear pelo valor total da nota (peças + mão de obra)</option>
                    </select>
                    <button type="button" onclick="window._mnRevAplicarRateio()" style="background:#0284c7;color:#fff;border:none;border-radius:6px;padding:5px 10px;font-size:0.78rem;font-weight:700;cursor:pointer;">Aplicar rateio nos serviços selecionados</button>
                    <div style="font-size:0.7rem;color:#64748b;max-width:300px;">O valor de cada linha é dividido igualmente entre os serviços marcados. Você também pode vincular linha a linha na coluna "Serviço vinculado".</div>
                </div>
            </div>
        </div>
        <div style="margin-top:10px;text-align:right;">
            <button type="button" id="mn-rev-anx-btn" onclick="window._mnRevAnexarPdf()" style="background:#16a34a;color:#fff;border:none;border-radius:8px;padding:0.55rem 1.1rem;font-size:0.82rem;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:6px;"><i class="ph ph-upload-simple"></i> Anexar PDF e lançar valores</button>
        </div>
    </div>`;
    window._mnRevStageTotais();
};

window._mnRevStageTotais = function() {
    const st = window._mnRevNotaStage;
    const el = document.getElementById('mn-rev-stage-tot');
    if (!st || !el) return;
    let p = 0, m = 0;
    st.lancs.forEach(function(l) { if (!l.incluir) return; if (l.tipo === 'mao_obra') m += Number(l.valor_total) || 0; else p += Number(l.valor_total) || 0; });
    const f = function(n) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
    el.textContent = 'Peças: ' + f(p) + '  •  Mão de obra: ' + f(m) + '  •  Total da nota: ' + f(p + m);
};

window._mnRevStageSet = function(i, campo, valor) {
    const st = window._mnRevNotaStage;
    if (!st || !st.lancs[i]) return;
    if (campo === 'valor_total') st.lancs[i][campo] = parseFloat(valor) || 0;
    else st.lancs[i][campo] = valor;
    window._mnRevStageTotais();
};

window._mnRevStageToggleServ = function(i, id, marcado) {
    const st = window._mnRevNotaStage;
    if (!st || !st.lancs[i]) return;
    const arr = st.lancs[i].servicos;
    const pos = arr.indexOf(id);
    if (marcado && pos < 0) arr.push(id);
    if (!marcado && pos >= 0) arr.splice(pos, 1);
    const sum = document.getElementById('mn-stg-sum-' + i);
    if (sum) { sum.textContent = arr.length ? (arr.length + ' serviço(s)') : 'Vincular serviço...'; sum.style.color = arr.length ? '#15803d' : '#b45309'; }
};

window._mnRevStageAdd = function() {
    const st = window._mnRevNotaStage;
    if (!st) return;
    const tipoDoc = document.getElementById('mn-rev-anx-tipo')?.value;
    st.lancs.push({ tipo: tipoDoc === 'nota_pecas' ? 'peca' : 'mao_obra', codigo: '', descricao: '', quantidade: 1, valor_total: 0, servicos: [], incluir: true });
    window._mnRevRenderStage();
};

window._mnRevStageRemove = function(i) {
    const st = window._mnRevNotaStage;
    if (!st) return;
    st.lancs.splice(i, 1);
    window._mnRevRenderStage();
};

window._mnRevRateioToggleServ = function(id, marcado) {
    const arr = window._mnRevRateioSel = window._mnRevRateioSel || [];
    const pos = arr.indexOf(id);
    if (marcado && pos < 0) arr.push(id);
    if (!marcado && pos >= 0) arr.splice(pos, 1);
};

window._mnRevAplicarRateio = function() {
    const st = window._mnRevNotaStage;
    const sel = window._mnRevRateioSel || [];
    if (!st) return;
    if (!sel.length) return alert('Marque ao menos um serviço para ratear.');
    const escopo = document.getElementById('mn-rev-rateio-escopo')?.value || 'total';
    st.lancs.forEach(function(l) {
        if (!l.incluir) return;
        const alvo = escopo === 'total' || (escopo === 'produto' && l.tipo === 'peca') || (escopo === 'mao_obra' && l.tipo === 'mao_obra');
        if (alvo) { l.servicos = sel.slice(); l.modo_rateio = escopo; }
    });
    window._mnRevRenderStage();
    if (typeof mostrarToastAviso === 'function') mostrarToastAviso('\u2705 Rateio aplicado às linhas.');
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

    // Para concluir a revisao, todos os servicos obrigatorios precisam estar marcados como realizados
    if (!silencioso && status === 'realizada') {
        const faltando = (window._mnRevServicosModal || []).filter(function(s) { return s.grupo === 'obrigatorio' && !(itens[s.id] && itens[s.id].realizado); });
        if (faltando.length) {
            faltando.forEach(function(s) { const row = document.querySelector('#mn-rev-modal-ov tr[data-rev-row="' + s.id + '"]'); if (row) row.style.background = '#fee2e2'; });
            const row0 = document.querySelector('#mn-rev-modal-ov tr[data-rev-row="' + faltando[0].id + '"]');
            if (row0) row0.scrollIntoView({ behavior: 'smooth', block: 'center' });
            alert('Para salvar a revisão como Realizada, marque como realizados todos os serviços obrigatórios.\n\nFaltam (' + faltando.length + '):\n- ' + faltando.map(function(s) { return s.nome; }).join('\n- '));
            return null;
        }
    }

    const btn = document.getElementById('mn-rev-btn-salvar');
    if (btn && !silencioso) { btn.disabled = true; btn.textContent = 'Salvando...'; }

    const body = {
        marco_km: marcoKm,
        marco_meses: marcoMeses,
        status: status,
        data_revisao: document.getElementById('mn-rev-f-data')?.value || null,
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
            await window.mnRevisaoAbrirVeiculo(vid);
        }
        return j.revisao;
    } catch (e) {
        if (!silencioso) alert('Erro: ' + e.message);
        if (btn && !silencioso) { btn.disabled = false; btn.textContent = 'Salvar Revisão'; }
        return null;
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
    if (!st || !m) return alert('Selecione um arquivo PDF para anexar.');
    const usadas = st.lancs.filter(function(l) { return l.incluir && (Number(l.valor_total) > 0); });
    const semDesc = usadas.filter(function(l) { return !String(l.descricao || '').trim(); });
    if (semDesc.length) return alert('Preencha a descrição de todas as linhas utilizadas.');
    const semVinculo = usadas.filter(function(l) { return !l.servicos.length; });
    if (semVinculo.length) return alert('Vincule cada peça / serviço da nota a pelo menos um serviço da revisão (obrigatório ou opcional).\n\nSem vínculo (' + semVinculo.length + '):\n- ' + semVinculo.map(function(l) { return l.descricao; }).join('\n- '));

    const btn = document.getElementById('mn-rev-anx-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }
    try {
        const savedRev = await window.mnRevSalvarMarco(m.km, m.meses, true);
        if (!savedRev || !savedRev.id) throw new Error('Não foi possível criar o registro da revisão.');
        const total = usadas.reduce(function(t, l) { return t + (Number(l.valor_total) || 0); }, 0);
        const fd = new FormData();
        fd.append('arquivo', st.file);
        fd.append('tipo_documento', document.getElementById('mn-rev-anx-tipo')?.value || 'nota_servico');
        fd.append('numero_nota', st.numero || '');
        fd.append('valor', String(Math.round(total * 100) / 100));
        fd.append('fornecedor', st.fornecedor || '');
        fd.append('dados', JSON.stringify({ lancamentos: usadas.map(function(l) { return { tipo: l.tipo, codigo: l.codigo, descricao: l.descricao, quantidade: l.quantidade, valor_total: l.valor_total, servicos: l.servicos, modo_rateio: l.modo_rateio || null }; }) }));
        const tok = window._manutTok || window.currentToken || localStorage.getItem('token');
        const res = await fetch('/api/frota/revisoes/' + savedRev.id + '/anexos', { method: 'POST', headers: { Authorization: 'Bearer ' + tok }, body: fd });
        const j = await res.json().catch(function() { return {}; });
        if (!res.ok) throw new Error(j.error || 'Erro ao enviar PDF');

        await window._mnRevRecarregarDados();
        window._mnRevNotaStage = null;
        const fileInp = document.getElementById('mn-rev-anx-file');
        if (fileInp) fileInp.value = '';
        window._mnRevRenderStage();
        window._mnRevAtualizarModalDados(true);
        window._mnRenderPainelRevisaoVeiculo();
        if (typeof mostrarToastAviso === 'function') mostrarToastAviso('\u2705 Nota / OS anexada e valores lançados!');
    } catch (e) {
        alert('Erro ao anexar PDF: ' + e.message);
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-upload-simple"></i> Anexar PDF e lançar valores'; }
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

window._mnPrevAtualizarFrota = async function() {
    try {
        const tok = window._manutTok || window.currentToken || localStorage.getItem('token');
        const r = await fetch('/api/frota/veiculos?_=' + Date.now(), { headers: { Authorization: 'Bearer ' + tok }, cache: 'no-store' });
        const lista = await r.json();
        if (!Array.isArray(lista)) return;
        window._manutFrota = lista;
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
        cardsEl.innerHTML = [
            { key: 'em_andamento',  cor: '#dc2626', bg: '#fef2f2', icone: 'ph-wrench',        label: 'Em Manutenção',      val: emAndamento },
            { key: 'agendada',      cor: '#d97706', bg: '#fffbeb', icone: 'ph-calendar-plus', label: 'Novos',              val: agendadas },
            { key: 'aguardando',    cor: '#2563eb', bg: '#eff6ff', icone: 'ph-hourglass',     label: 'Aguardando',         val: aguardando },
            { key: 'concluidas_mes',cor: '#10b981', bg: '#ecfdf5', icone: 'ph-check-circle',  label: 'Concluídas este mês',val: concluidasMes },
            { key: 'todos',         cor: '#7c3aed', bg: '#f5f3ff', icone: 'ph-list-bullets',  label: 'Todos',              val: totalTodos },
        ].map(c => {
            const ativo = c.key !== 'todos' && fCard === c.key;
            return `
            <div onclick="window.mnCorrFiltrarCard('${c.key}')" title="Clique para filtrar por ${c.label}" style="background:${c.bg};border:${ativo ? '2px solid ' + c.cor : '1px solid ' + c.cor + '30'};box-shadow:${ativo ? '0 4px 12px ' + c.cor + '33' : 'none'};border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:all .15s;user-select:none;position:relative;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
                <div style="background:${c.cor}18;border-radius:10px;width:42px;height:42px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="ph ${c.icone}" style="color:${c.cor};font-size:1.3rem;"></i>
                </div>
                <div>
                    <div style="font-size:1.4rem;font-weight:800;color:${c.cor};">${c.val}</div>
                    <div style="font-size:0.75rem;color:#64748b;font-weight:600;">${c.label}</div>
                </div>
                ${ativo ? `<span style="position:absolute;top:6px;right:8px;background:${c.cor};color:#fff;font-size:0.62rem;font-weight:700;padding:1px 6px;border-radius:99px;">Filtro ativo ✕</span>` : ''}
            </div>`;
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
        const statusBadge = `<span style="background:${statusCor[sKey]||'#94a3b8'}22;color:${statusCor[sKey]||'#94a3b8'};padding:2px 10px;border-radius:20px;font-size:0.75rem;font-weight:700;white-space:nowrap;">${statusLbl[sKey]||sKey}</span>`;
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
    if (paradoAtivo) {
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
    return { id: s.id, nome: s.nome, catalogo_id: s.catalogo_id, item_ref: s.item_ref, mao_obra: s.mao_obra || '', garantia_valor: s.garantia_valor || '', garantia_unidade: s.garantia_unidade || 'dias', observacao: s.observacao || '', mo_alocado: s.mo_alocado || 0 };
};
window._mnEdMapMo = function(l) {
    return { id: l.id, nota_id: l.nota_id || null, descricao: l.descricao || '', valor: l.valor || 0, ratear: l.ratear ? 1 : 0, servicos: Array.isArray(l.servicos) ? l.servicos.slice() : [] };
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
        status: 'agendada', _statusInicial: 'agendada', _jaPerguntouStatus: '', veiculo_rodando: opts.veiculo_rodando || '', justificativa_status: '', solicitados: [], realizados: [], pecas: [], notas: [], mo: [], historico: [], pickSel: {}
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
        pickSel: {}
    };
    window._mnEdMontar();
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
    var r = await fetch('/api/frota/manutencoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + window._mnEdTok() },
        body: JSON.stringify({ veiculo_id: veic, tipo: 'corretiva', descricao: desc, itens_solicitados: itensSolic, status: ed.status || 'agendada', veiculo_rodando: ed.veiculo_rodando, data_inicio: diVal || null, data_fim: dfVal || null })
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
    ['mn-corr-edit-modal', 'mned-lista-pop', 'mnp-pop', 'mno-pop', 'mnv-pop', 'mned-just-pop', 'mned-senha-pop'].forEach(function(i) {
        var el = document.getElementById(i); if (el) el.remove();
    });
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
      +   '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(480px,1fr));gap:18px;align-items:start;max-width:1900px;margin:0 auto;">'
      +     '<div>'
      +       '<div style="' + sec + '">'
      +         '<div style="' + secT + 'margin-bottom:12px;"><i class="ph ph-truck" style="color:#d97706;"></i> Dados da manutenção</div>'
      +         '<div style="margin-bottom:12px;"><label style="' + lbl + '">Veículo *</label><select id="mned-veic" style="' + inp + '">' + veicOpts + '</select></div>'
      +         '<div style="margin-bottom:12px;"><label style="' + lbl + '">Defeito / Problema *</label><textarea id="mned-desc" rows="2" placeholder="Descreva o defeito ou problema do veículo..." style="' + inp + 'resize:vertical;">' + esc(m.descricao || '') + '</textarea></div>'
      +         '<div style="margin-bottom:12px;"><label style="' + lbl + '">Status *</label><div id="mned-status" style="display:flex;gap:8px;flex-wrap:wrap;"></div></div>'
      +         '<div id="mned-grid-km" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;">'
      +           '<div><label style="' + lbl + '">Data de início</label><input type="date" id="mned-di" value="' + esc(window._mnDataInput(m.data_inicio)) + '" style="' + inp + '"></div>'
      +           '<div><label style="' + lbl + '">Data de fim <span style="font-weight:400;color:#94a3b8;font-size:0.7rem;">(liberação p/ rodar)</span></label><input type="date" id="mned-df" value="' + esc(window._mnDataInput(m.data_fim)) + '" style="' + inp + '"></div>'
      +           '<div id="mned-dc-box" style="display:' + (ehConcl ? 'block' : 'none') + ';"><label style="' + lbl + '">Data de conclusão</label><input type="date" id="mned-dc" value="' + esc(window._mnDataInput(m.data_conclusao)) + '" style="' + inp + '"></div>'
      +           '<div><label style="' + lbl + '">KM antes da manutenção</label><input type="number" id="mned-km" placeholder="Ex: 45000" value="' + esc(m.km_na_manutencao || '') + '" style="' + inp + '"></div>'
      +           '<div id="mned-km-final-box" style="display:' + (ehConcl ? 'block' : 'none') + ';"><label style="' + lbl + '">KM final da manutenção</label><input type="number" id="mned-km-final" placeholder="Ex: 45100" value="' + esc(m.km_final_manutencao || '') + '" style="' + inp + '"></div>'
      +           '<div style="grid-column:1/-1;"><label style="' + lbl + '">Fornecedor / Oficina</label><input type="text" id="mned-forn" placeholder="Ex: Oficina Central" value="' + esc(m.fornecedor || '') + '" style="' + inp + '"></div>'
      +           '<div style="grid-column:1/-1;margin-top:2px;">'
      +             '<label style="font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:6px;">O veículo está rodando? *</label>'
      +             '<div id="mned-rodando-box" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
      +               '<label id="mned-rod-lbl-sim" style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:1.5px solid #22c55e;border-radius:10px;font-size:0.86rem;cursor:pointer;background:#dcfce7;color:#15803d;font-weight:600;transition:all .15s;">'
      +                 '<input type="radio" name="mned_veiculo_rodando" value="sim" style="width:16px;height:16px;accent-color:#16a34a;">'
      +                 '<span>Sim, está rodando <small style="opacity:0.85;">(agendar)</small></span>'
      +               '</label>'
      +               '<label id="mned-rod-lbl-nao" style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:1.5px solid #ef4444;border-radius:10px;font-size:0.86rem;cursor:pointer;background:#fee2e2;color:#b91c1c;font-weight:600;transition:all .15s;">'
      +                 '<input type="radio" name="mned_veiculo_rodando" value="nao" style="width:16px;height:16px;accent-color:#dc2626;">'
      +                 '<span>Não, está parado <small style="opacity:0.85;">(indisponível)</small></span>'
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
      +             '<button type="button" id="mned-pick-add" style="margin-left:auto;padding:9px 16px;border:none;border-radius:8px;background:#0284c7;color:#fff;cursor:pointer;font-weight:700;font-size:0.82rem;">Adicionar serviços selecionados à lista</button>'
      +           '</div>'
      +         '</div>'
      +         '<div id="mned-serv"></div>'
      +       '</div>'
      +       '<div style="' + sec + '">'
      +         '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;"><div style="' + secT + '"><i class="ph ph-receipt" style="color:#2563eb;"></i> Peças e notas fiscais</div>'
      +           '<div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap;">'
      +             '<button type="button" id="mned-pecas-geral" style="' + btnSec + '"><i class="ph ph-plus"></i> Incluir peças</button>'
      +             '<button type="button" id="mned-mo-nf" style="' + btnSec + 'border-color:#fcd34d;color:#b45309;"><i class="ph ph-paperclip"></i> NF de mão de obra</button>'
      +           '</div></div>'
      +         '<div id="mned-notas"></div>'
      +         '<div style="display:none;"><div style="' + secT + '"><i class="ph ph-hammer" style="color:#d97706;"></i> Mão de obra (notas e lançamentos)</div><button type="button" id="mned-mo-add" style="margin-left:auto;' + btnSec + '"><i class="ph ph-plus"></i> Linha de mão de obra</button><div id="mned-mo"></div></div>'
      +       '</div>'
      +       '<div id="mned-total" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:16px;"></div>'
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
    document.getElementById('mned-pecas-geral').onclick = function() { window._mnEdAbrirPecas(null, null); };
    document.getElementById('mned-mo-nf').onclick = function() { window._mnEdAbrirMoNf(null); };
    document.getElementById('mned-mo-add').onclick = function() {
        window._mnEd.mo.push({ id: null, nota_id: null, descricao: '', valor: 0, ratear: 0, servicos: [] });
        window._mnEdRenderMo();
        var ins = document.querySelectorAll('#mned-mo [data-mof="descricao"]');
        if (ins.length) ins[ins.length - 1].focus();
    };
    document.getElementById('mned-coment-btn').onclick = window._mnEdComentar;
    document.getElementById('mned-pick-cat').onchange = window._mnEdPickRender;
    document.getElementById('mned-pick-busca').oninput = window._mnEdPickRender;
    document.getElementById('mned-pick-add').onclick = window._mnEdPickAdicionar;
    document.getElementById('mned-pick-novo').onclick = window._mnEdPickNovo;
    document.getElementById('mned-pick-all').onchange = function() {
        var marcar = this.checked;
        (window._mnEd.pickVisiveis || []).forEach(function(id) { window._mnEd.pickSel[id] = marcar; });
        window._mnEdPickRender();
    };
    document.getElementById('mned-veic').onchange = function() {
        var kmEl = document.getElementById('mned-km');
        var v = (window._manutFrota || []).find(function(x) { return String(x.id) === String(this.value); }.bind(this));
        if (window._mnEd.novo && v && v.km_atual && kmEl && !kmEl.value) kmEl.value = v.km_atual;
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
    document.getElementById('mned-dc').onchange = function() { window._mnEd.m.data_conclusao = this.value; window._mnEdRenderServ(); };
    if (ed.novo && m.veiculo_id) document.getElementById('mned-veic').onchange.call(document.getElementById('mned-veic'));

    document.querySelectorAll('input[name="mned_veiculo_rodando"]').forEach(function(r) {
        r.onchange = function() {
            if (window._mnEd.status === 'em_andamento' && this.value === 'sim') {
                alert('Enquanto o status estiver "Em manutenção", o veículo permanece como "Não, está parado (indisponível)".');
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
        avisoParado = '<div style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:8px;padding:8px 12px;font-size:0.8rem;margin-bottom:12px;display:flex;align-items:center;gap:8px;"><i class="ph ph-warning-circle" style="font-size:1.1rem;flex-shrink:0;"></i><span>Ao mudar para <b>Em manutenção</b>, o veículo (e as demais solicitações em aberto desta placa) ficará como <b>Não, está parado (indisponível)</b>.</span></div>';
    } else if (statusPara === 'concluida') {
        if (outrasMesmaPlaca.some(function(x) { return x.veiculo_rodando_efetivo === 'nao' || x.veiculo_rodando === 'nao'; })) {
            avisoParado = '<div style="background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:8px;padding:8px 12px;font-size:0.8rem;margin-bottom:12px;display:flex;align-items:center;gap:8px;"><i class="ph ph-warning" style="font-size:1.1rem;flex-shrink:0;"></i><span>Esta solicitação será concluída, mas o veículo <b>continuará constando como parado</b> enquanto houver outra solicitação em aberto desta placa marcada como "Não, está parado".</span></div>';
        } else if (!window._mnEd || window._mnEd.veiculo_rodando === 'nao') {
            avisoParado = '<div style="background:#f0fdf4;border:1px solid #bbf7d0;color:#14532d;border-radius:8px;padding:8px 12px;font-size:0.8rem;margin-bottom:12px;display:flex;align-items:center;gap:8px;"><i class="ph ph-check-circle" style="font-size:1.1rem;flex-shrink:0;"></i><span>Ao mudar para <b>Concluído</b>, esta solicitação passará para <b>Sim, está rodando</b>.</span></div>';
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
            ? '<span style="background:#fee2e2;color:#b91c1c;border:1px solid #fecaca;padding:2px 8px;border-radius:999px;font-size:0.72rem;font-weight:700;">Não, está parado</span>'
            : '<span style="background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;padding:2px 8px;border-radius:999px;font-size:0.72rem;font-weight:700;">Sim, está rodando</span>';
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
      +     '<span>O veículo só volta a ser considerado rodando quando todas as solicitações em aberto desta placa forem alteradas manualmente para <b>Sim, está rodando</b> ou <b>Concluído</b>.</span>'
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
            ? '<span style="background:#fee2e2;color:#b91c1c;border:1px solid #fecaca;padding:3px 10px;border-radius:999px;font-size:0.75rem;font-weight:700;">Não, está parado</span>'
            : '<span style="background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;padding:3px 10px;border-radius:999px;font-size:0.75rem;font-weight:700;">Sim, está rodando</span>';
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
            +   '<div><div style="font-size:0.7rem;color:#64748b;font-weight:700;">Data de início</div><div style="font-size:0.82rem;font-weight:700;color:#1e293b;">' + esc(fmtData(o.data_inicio)) + '</div></div>'
            +   '<div><div style="font-size:0.7rem;color:#64748b;font-weight:700;">Data de fim</div><div style="font-size:0.82rem;font-weight:700;color:#1e293b;">' + esc(fmtData(o.data_fim)) + '</div></div>'
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
    if (dcBox) dcBox.style.display = ehConcl ? 'block' : 'none';
    if (kfBox) kfBox.style.display = ehConcl ? 'block' : 'none';
    box.querySelectorAll('[data-s]').forEach(function(b) {
        b.onclick = function() {
            var novo = b.getAttribute('data-s');
            if (novo === window._mnEd.status) return;
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
                                data_conclusao: (novo === 'concluida' && dc) ? (dc.value || null) : undefined
                            })
                        });
                        if (rs.ok) {
                            var rsJson = await rs.json().catch(function() { return {}; });
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
                        }
                    } catch (e) { console.warn('[Status] erro ao salvar imediato:', e); }
                }
            });
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
    ['Câmera - troca', 'Câmera - manutenção'].forEach(function(nm, idx) {
        var jaTem = rawCat.some(function(s) { return window._mnNorm(s.nome) === window._mnNorm(nm); });
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
    ed.pickVisiveis = lista.filter(function(s) { return !jaAdd[s.id]; }).map(function(s) { return s.id; });

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
        var html = '', ultimoGrupo = null, ultimoCat = null;
        var porGrupo = {}, porCat = {};
        lista.forEach(function(s) {
            (porGrupo[s._grupoNome] = porGrupo[s._grupoNome] || []).push(s);
            (porCat[s.categoria_id] = porCat[s.categoria_id] || []).push(s);
        });
        lista.forEach(function(s) {
            if (s._grupoNome !== ultimoGrupo) {
                ultimoGrupo = s._grupoNome;
                ultimoCat = null;
                var doGrupo = (porGrupo[s._grupoNome] || []).filter(function(x) { return !jaAdd[x.id]; });
                var todosGrp = doGrupo.length > 0 && doGrupo.every(function(x) { return ed.pickSel[x.id]; });
                html += '<label style="display:flex;align-items:center;gap:8px;font-size:0.76rem;font-weight:800;color:#1e293b;text-transform:uppercase;letter-spacing:.05em;margin-top:10px;padding:7px 8px;background:#f1f5f9;border-radius:6px;cursor:pointer;">'
                    + '<input type="checkbox" data-pkmacro="' + esc(s._grupoNome) + '"' + (todosGrp ? ' checked' : '') + (doGrupo.length ? '' : ' disabled') + ' style="width:15px;height:15px;accent-color:#d97706;">'
                    + '<i class="ph ' + esc(s._grupoIcone) + '" style="font-size:1.05rem;color:#d97706;"></i>'
                    + '<span>' + esc(s._grupoNome) + '</span> <span style="font-weight:600;text-transform:none;color:#64748b;">(selecionar todos da categoria)</span></label>';
            }
            if (s.categoria_id !== ultimoCat) {
                ultimoCat = s.categoria_id;
                var doCat = (porCat[s.categoria_id] || []).filter(function(x) { return !jaAdd[x.id]; });
                var todosMarc = doCat.length > 0 && doCat.every(function(x) { return ed.pickSel[x.id]; });
                html += '<label style="display:flex;align-items:center;gap:8px;font-size:0.73rem;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.04em;margin-top:6px;padding:5px 4px 4px 14px;border-top:1px solid #e2e8f0;cursor:pointer;">'
                    + '<input type="checkbox" data-pkcat="' + s.categoria_id + '"' + (todosMarc ? ' checked' : '') + (doCat.length ? '' : ' disabled') + ' style="width:15px;height:15px;accent-color:#0284c7;">'
                    + '<i class="ph ' + esc(s._subIcone) + '" style="font-size:1rem;color:#d97706;"></i>'
                    + '<span>' + esc(s._subNome || s.categoria_nome || 'Outros') + '</span> <span style="font-weight:600;text-transform:none;color:#94a3b8;">(selecionar todos da subcategoria)</span></label>';
            }
            var add = !!jaAdd[s.id];
            html += '<label style="display:flex;align-items:center;gap:8px;font-size:0.86rem;color:' + (add ? '#94a3b8' : '#1e293b') + ';cursor:' + (add ? 'default' : 'pointer') + ';padding:3px 4px 3px 32px;">'
                + '<input type="checkbox" data-pk="' + s.id + '"' + (ed.pickSel[s.id] ? ' checked' : '') + (add ? ' disabled' : '') + ' style="width:15px;height:15px;accent-color:#0284c7;">'
                + esc(s.nome) + (add ? ' <span style="font-size:0.7rem;background:#f1f5f9;border-radius:999px;padding:1px 8px;">já adicionado</span>' : '') + '</label>';
        });
        box.innerHTML = html;
        box.querySelectorAll('[data-pk]').forEach(function(c) {
            c.onchange = function() {
                window._mnEd.pickSel[c.getAttribute('data-pk')] = c.checked;
                window._mnEdPickRender();
            };
        });
        box.querySelectorAll('[data-pkcat]').forEach(function(c) {
            c.onchange = function() {
                var cid = c.getAttribute('data-pkcat');
                (porCat[cid] || []).forEach(function(x) { if (!jaAdd[x.id]) window._mnEd.pickSel[x.id] = c.checked; });
                window._mnEdPickRender();
            };
        });
        box.querySelectorAll('[data-pkmacro]').forEach(function(c) {
            c.onchange = function() {
                var grp = c.getAttribute('data-pkmacro');
                (porGrupo[grp] || []).forEach(function(x) { if (!jaAdd[x.id]) window._mnEd.pickSel[x.id] = c.checked; });
                window._mnEdPickRender();
            };
        });
    }
    var selecionados = Object.keys(ed.pickSel).filter(function(k) { return ed.pickSel[k]; }).length;
    var cont = document.getElementById('mned-pick-cont');
    if (cont) cont.textContent = selecionados + ' selecionado(s) · ' + lista.length + ' na lista';
    var all = document.getElementById('mned-pick-all');
    if (all) all.checked = ed.pickVisiveis.length > 0 && ed.pickVisiveis.every(function(id) { return ed.pickSel[id]; });
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
                ? { l: 'Não, está parado (indisponível)', c: '#dc2626' }
                : { l: 'Sim, está rodando (agendar)', c: '#16a34a' };
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
      +   '<input type="number" min="0" step="1" data-pi="' + i + '" data-pf="garantia_valor" value="' + esc(p.garantia_valor) + '" placeholder="Gar." title="Garantia da peça" style="' + ipt + 'width:56px;">'
      +   '<select data-pi="' + i + '" data-pf="garantia_unidade" style="' + ipt + 'background:#fff;"><option value="dias"' + (p.garantia_unidade !== 'meses' ? ' selected' : '') + '>dias</option><option value="meses"' + (p.garantia_unidade === 'meses' ? ' selected' : '') + '>meses</option></select>'
      +   '<select data-pi="' + i + '" data-pf="servico_id" title="Serviço ao qual a peça pertence" style="' + ipt + 'background:#fff;max-width:170px;">' + window._mnEdSvcOptions(p.servico_id) + '</select>'
      +   '<button type="button" data-pedit="' + i + '" title="Editar peça / mudar vinculação ou rateio entre serviços" style="padding:4px 8px;border:1px solid #bfdbfe;border-radius:6px;background:#eff6ff;color:#2563eb;cursor:pointer;"><i class="ph ph-pencil-simple"></i></button>'
      +   '<button type="button" data-prm="' + i + '" title="Remover peça" style="padding:4px 8px;border:1px solid #fecaca;border-radius:6px;background:#fef2f2;color:#dc2626;cursor:pointer;"><i class="ph ph-trash"></i></button>'
      + '</div>'
      + (g ? '<div style="margin-top:4px;font-size:0.72rem;font-weight:600;color:' + g.cor + ';"><i class="ph ph-shield-check"></i> Peça: ' + g.txt + '</div>' : '')
      + '</div>';
};

window._mnEdRenderServ = function() {
    var ed = window._mnEd, box = document.getElementById('mned-serv'), esc = window._mnEdEsc, fm = window._mnMoneyFmt;
    if (!box) return;
    window._mnGarantirDatalist();
    var getSvcKey = function(s, idx) {
        if (!s.id && !s._tmpId) {
            window._mnSvcSeq = (window._mnSvcSeq || 0) + 1;
            s._tmpId = 'tmp_' + window._mnSvcSeq + '_' + (idx || 0);
        }
        return s.id || s._tmpId;
    };
    var temServico = function(sid) { return sid && ed.realizados.some(function(s, idx) { return String(getSvcKey(s, idx)) === String(sid); }); };
    var orfas = [];
    ed.pecas.forEach(function(p, i) { if (!p.servico_id || !temServico(p.servico_id)) orfas.push(i); });
    if (!ed.realizados.length && !orfas.length) {
        box.innerHTML = '<div style="padding:14px;text-align:center;color:#94a3b8;font-size:0.82rem;">Nenhum serviço realizado ainda. Marque os serviços na lista acima e clique em "Adicionar serviços selecionados à lista".</div>';
        window._mnEdRenderTotais();
        return;
    }
    var lbl = 'font-size:0.7rem;font-weight:700;color:#64748b;display:block;margin-bottom:2px;';
    var ipt = 'padding:6px 8px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;outline:none;box-sizing:border-box;font-family:inherit;';
    var btnPeca = 'padding:5px 12px;border:1.5px solid #2563eb;border-radius:8px;background:#eff6ff;color:#2563eb;cursor:pointer;font-weight:700;font-size:0.76rem;display:inline-flex;align-items:center;gap:5px;';
    var html = ed.realizados.map(function(s, i) {
        var g = window._mnGarantiaAte(ed.m.data_conclusao, s.garantia_valor, s.garantia_unidade, ed.status);
        var sKey = getSvcKey(s, i);
        var pecasHtml = '';
        if (sKey) {
            ed.pecas.forEach(function(p, pi) { if (String(p.servico_id) === String(sKey)) pecasHtml += window._mnEdPecaHtml(p, pi); });
        }
        var catRef = s.item_ref;
        if (!catRef && s.catalogo_id && window._manutCatalogo) {
            var cObj = window._manutCatalogo.find(function(x) { return String(x.id) === String(s.catalogo_id); });
            if (cObj) catRef = cObj.categoria_nome || cObj.item_ref || '';
        }
        var subMeta = catRef && window._mnCatMeta ? window._mnCatMeta(catRef) : null;
        return '<div style="border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;margin-bottom:8px;background:#f8fafc;">'
          + '<div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;">'
          +   '<div style="flex:1;min-width:220px;"><div style="font-weight:700;color:#1e293b;font-size:0.87rem;">' + esc(s.nome) + '</div>'
          +   (subMeta ? '<div style="font-size:0.75rem;color:#64748b;display:flex;align-items:center;gap:5px;margin-top:2px;"><i class="ph ' + esc(subMeta.icone) + '" style="color:#d97706;font-size:0.92rem;"></i><span>' + esc(subMeta.nome) + '</span></div>' : '')
          +   '<div style="margin-top:8px;">' + (s.id
                ? '<button type="button" data-ip="' + s.id + '" style="' + btnPeca + '"><i class="ph ph-plus"></i> Incluir peças</button>'
                : '<button type="button" data-ipn="' + i + '" style="' + btnPeca + '"><i class="ph ph-plus"></i> Incluir peças</button>') + '</div>'
          +   '</div>'
          +   '<div style="display:flex;flex-direction:column;gap:6px;">'
          +     '<div style="display:flex;align-items:flex-end;gap:10px;">'
          +       '<div><label style="' + lbl + '">Mão de obra (R$)</label><input type="text" data-money="1" data-i="' + i + '" data-f="mao_obra" value="' + fm(window._mnNum(s.mao_obra)) + '" placeholder="0,00" style="' + ipt + 'width:130px;text-align:right;background:#fff;"></div>'
          +       '<div><label style="' + lbl + '">Garantia do serviço</label><div style="display:flex;gap:4px;"><input type="number" min="0" step="1" data-i="' + i + '" data-f="garantia_valor" value="' + esc(s.garantia_valor) + '" placeholder="0" style="' + ipt + 'width:70px;background:#fff;"><select data-i="' + i + '" data-f="garantia_unidade" style="' + ipt + 'background:#fff;"><option value="dias"' + (s.garantia_unidade !== 'meses' ? ' selected' : '') + '>dias</option><option value="meses"' + (s.garantia_unidade === 'meses' ? ' selected' : '') + '>meses</option></select></div></div>'
          +       '<button type="button" data-rm="' + i + '" title="Remover serviço" style="padding:7px 10px;border:1px solid #fecaca;border-radius:8px;background:#fef2f2;color:#dc2626;cursor:pointer;"><i class="ph ph-trash"></i></button>'
          +     '</div>'
          +     '<input type="text" data-i="' + i + '" data-f="observacao" value="' + esc(s.observacao || '') + '" placeholder="Observação do serviço..." style="' + ipt + 'width:100%;background:#fff;">'
          +   '</div>'
          + '</div>'
          + (g ? '<div style="margin-top:6px;font-size:0.74rem;font-weight:600;color:' + g.cor + ';"><i class="ph ph-shield-check"></i> ' + g.txt + '</div>' : '')
          + pecasHtml
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
            if (f !== 'observacao') window._mnEdRenderServ();
        };
    });
    box.querySelectorAll('[data-rm]').forEach(function(b) {
        b.onclick = function() {
            var i = parseInt(b.getAttribute('data-rm'));
            var rem = window._mnEd.realizados[i];
            var remKey = rem ? (rem.id || rem._tmpId) : null;
            if (remKey) window._mnEd.pecas.forEach(function(p) { if (String(p.servico_id) === String(remKey)) p.servico_id = null; });
            if (rem && rem.id) (window._mnEd.mo || []).forEach(function(l) { l.servicos = (l.servicos || []).filter(function(x) { return String(x) !== String(rem.id); }); });
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
            if (f === 'servico_id') p[f] = el.value ? (/^\d+$/.test(el.value) ? parseInt(el.value) : el.value) : null;
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
    box.querySelectorAll('[data-pedit]').forEach(function(b) {
        b.onclick = function() {
            var p = window._mnEd.pecas[parseInt(b.getAttribute('data-pedit'))];
            if (!p) return;
            window._mnEdAbrirPecas(null, p.nota_id ? p.nota_id : 'sem_nota');
        };
    });
    box.querySelectorAll('[data-prm]').forEach(function(b) {
        b.onclick = function() {
            window._mnEd.pecas.splice(parseInt(b.getAttribute('data-prm')), 1);
            window._mnEdRenderServ();
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
            var chave = baseDesc + '__' + totalPartes + '__' + (p.codigo || '') + '__' + (p.unidade || '') + '__' + (p.garantia_valor || '') + '__' + (p.garantia_unidade || '');
            var grp = gruposRateio[chave];
            if (!grp || grp.partes.length >= totalPartes) {
                grp = {
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
            if (p.servico_id && grp.servicos.indexOf(p.servico_id) === -1) grp.servicos.push(p.servico_id);
            grp.partes.push(idx);
        } else {
            resultado.push({
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
    var ed = window._mnEd, box = document.getElementById('mned-notas'), esc = window._mnEdEsc;
    if (!box) return;
    var pecasSemNota = (ed.pecas || []).filter(function(p) { return !p.nota_id; });
    var moSemNota = (ed.mo || []).filter(function(l) { return !l.nota_id; });
    if (!ed.notas.length && !pecasSemNota.length && !moSemNota.length) {
        box.innerHTML = '<div style="font-size:0.8rem;color:#94a3b8;">Nenhuma peça ou nota fiscal lançada. Use "Incluir peças" ou "NF de mão de obra".</div>';
        return;
    }
    var nomeServico = function(sid) {
        var s = (ed.realizados || []).find(function(x) { return String(x.id) === String(sid); });
        return s ? s.nome : null;
    };
    var resumoServicosIds = function(sids) {
        var nomes = [];
        (sids || []).forEach(function(id) {
            var nm = nomeServico(id);
            if (nm && nomes.indexOf(nm) === -1) nomes.push(nm);
        });
        if (!nomes.length) return '<div style="font-size:0.73rem;color:#d97706;font-weight:600;margin-top:2px;"><i class="ph ph-warning"></i> Sem serviço vinculado — clique em <b>Editar</b> para vincular</div>';
        return '<div style="font-size:0.73rem;color:#2563eb;font-weight:600;margin-top:2px;"><i class="ph ph-link"></i> Vinculado a: <b>' + esc(nomes.join(', ')) + '</b></div>';
    };
    var btn = 'padding:6px 10px;border-radius:8px;cursor:pointer;';
    var btnEdit = btn + 'border:1px solid #cbd5e1;background:#fff;color:#2563eb;';
    var cardsHtml = ed.notas.map(function(n) {
        var mo = n.tipo === 'mao_obra';
        var emi = n.data_emissao ? ' · emissão ' + esc(n.data_emissao) : '';
        var tag = mo
            ? '<span style="background:#fffbeb;color:#b45309;border:1px solid #fde68a;border-radius:999px;padding:1px 9px;font-size:0.7rem;font-weight:700;">Mão de obra</span>'
            : '<span style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:999px;padding:1px 9px;font-size:0.7rem;font-weight:700;">Peças</span>';
        var tituloDoc = n.numero ? ('NF ' + esc(n.numero)) : ('Recibo / PDF' + (n.nome_arquivo ? ' (' + esc(n.nome_arquivo) + ')' : ''));
        var fornTxt = n.fornecedor ? (' · ' + esc(n.fornecedor)) : (n.numero ? ' · Fornecedor não identificado' : '');
        var sidsVinc = [];
        if (mo) {
            (ed.mo || []).filter(function(l) { return String(l.nota_id) === String(n.id); }).forEach(function(l) {
                if (l.ratear) (ed.realizados || []).forEach(function(s) { if (s.id) sidsVinc.push(s.id); });
                else (l.servicos || []).forEach(function(sid) { sidsVinc.push(sid); });
            });
        } else {
            (ed.pecas || []).filter(function(p) { return String(p.nota_id) === String(n.id); }).forEach(function(p) {
                if (p.servico_id) sidsVinc.push(p.servico_id);
            });
        }
        var vincHtml = resumoServicosIds(sidsVinc);
        var anexo = '<div style="font-size:0.72rem;color:#64748b;margin-top:2px;"><i class="ph ph-paperclip"></i> Anexado em ' + esc(window._mnFmtDH(n.created_at)) + (n.usuario_nome ? ' por <b>' + esc(n.usuario_nome) + '</b>' : '') + '</div>';
        return '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;margin-bottom:6px;flex-wrap:wrap;">'
          + '<i class="ph ph-receipt" style="color:' + (mo ? '#d97706' : '#2563eb') + ';font-size:1.2rem;"></i>'
          + '<div style="flex:1;min-width:200px;font-size:0.82rem;color:#1e293b;"><b>' + tituloDoc + '</b> ' + tag + fornTxt + emi
          +   (n.valor_total ? ' · <b style="color:#059669;">' + window._mnFmtMoeda(n.valor_total) + '</b>' : '') + vincHtml + anexo + '</div>'
          + '<button type="button" data-nv="' + n.id + '" title="Ver PDF (nota fiscal ou recibo)" style="' + btn + 'border:1px solid #bfdbfe;background:#eff6ff;color:#2563eb;"><i class="ph ph-eye"></i></button>'
          + '<button type="button" data-ne="' + n.id + '" data-netipo="' + (mo ? 'mao_obra' : 'pecas') + '" title="Editar itens e mudar vinculação aos serviços" style="' + btnEdit + '"><i class="ph ph-pencil-simple"></i></button>'
          + '<button type="button" data-nd="' + n.id + '" title="Excluir anexo e itens vinculados" style="' + btn + 'border:1px solid #fecaca;background:#fef2f2;color:#dc2626;"><i class="ph ph-trash"></i></button>'
          + '</div>';
    });

    if (pecasSemNota.length) {
        var pecasAgrup = window._mnAgruparPecasParaEdicao(pecasSemNota);
        var somaPcSem = pecasSemNota.reduce(function(t, p) { return t + (Number(p.valor_total) || 0); }, 0);
        var sidsPc = pecasSemNota.map(function(p) { return p.servico_id; }).filter(Boolean);
        cardsHtml.push('<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;margin-bottom:6px;flex-wrap:wrap;">'
          + '<i class="ph ph-gear-six" style="color:#2563eb;font-size:1.2rem;"></i>'
          + '<div style="flex:1;min-width:200px;font-size:0.82rem;color:#1e293b;"><b>Peças lançadas manualmente</b> <span style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:999px;padding:1px 9px;font-size:0.7rem;font-weight:700;">Peças</span> · ' + pecasAgrup.length + ' item(ns) · <b style="color:#059669;">' + window._mnFmtMoeda(somaPcSem) + '</b>'
          + resumoServicosIds(sidsPc) + '</div>'
          + '<button type="button" data-ne-sem="pecas" title="Editar peças e mudar vinculação aos serviços" style="' + btnEdit + '"><i class="ph ph-pencil-simple"></i></button>'
          + '<button type="button" data-nd-sem="pecas" title="Excluir peças sem anexo" style="' + btn + 'border:1px solid #fecaca;background:#fef2f2;color:#dc2626;"><i class="ph ph-trash"></i></button>'
          + '</div>');
    }

    if (moSemNota.length) {
        var somaMoSem = moSemNota.reduce(function(t, l) { return t + (Number(l.valor) || 0); }, 0);
        var sidsMo = [];
        moSemNota.forEach(function(l) {
            if (l.ratear) (ed.realizados || []).forEach(function(s) { if (s.id) sidsMo.push(s.id); });
            else (l.servicos || []).forEach(function(sid) { sidsMo.push(sid); });
        });
        cardsHtml.push('<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;margin-bottom:6px;flex-wrap:wrap;">'
          + '<i class="ph ph-hammer" style="color:#d97706;font-size:1.2rem;"></i>'
          + '<div style="flex:1;min-width:200px;font-size:0.82rem;color:#1e293b;"><b>Mão de obra lançada manualmente</b> <span style="background:#fffbeb;color:#b45309;border:1px solid #fde68a;border-radius:999px;padding:1px 9px;font-size:0.7rem;font-weight:700;">Mão de obra</span> · ' + moSemNota.length + ' linha(s) · <b style="color:#059669;">' + window._mnFmtMoeda(somaMoSem) + '</b>'
          + resumoServicosIds(sidsMo) + '</div>'
          + '<button type="button" data-ne-sem="mao_obra" title="Editar mão de obra e mudar vinculação aos serviços" style="' + btnEdit + '"><i class="ph ph-pencil-simple"></i></button>'
          + '<button type="button" data-nd-sem="mao_obra" title="Excluir mão de obra sem anexo" style="' + btn + 'border:1px solid #fecaca;background:#fef2f2;color:#dc2626;"><i class="ph ph-trash"></i></button>'
          + '</div>');
    }

    box.innerHTML = cardsHtml.join('');
    box.querySelectorAll('[data-nv]').forEach(function(b) { b.onclick = function() { window._mnEdVerNota(parseInt(b.getAttribute('data-nv'))); }; });
    box.querySelectorAll('[data-ne]').forEach(function(b) {
        b.onclick = function() {
            var nid = parseInt(b.getAttribute('data-ne'));
            var tipo = b.getAttribute('data-netipo');
            if (tipo === 'mao_obra') window._mnEdAbrirMoNf(nid);
            else window._mnEdAbrirPecas(null, nid);
        };
    });
    box.querySelectorAll('[data-ne-sem]').forEach(function(b) {
        b.onclick = function() {
            var tipo = b.getAttribute('data-ne-sem');
            if (tipo === 'mao_obra') window._mnEdAbrirMoNf('sem_nota');
            else window._mnEdAbrirPecas(null, 'sem_nota');
        };
    });
    box.querySelectorAll('[data-nd]').forEach(function(b) { b.onclick = function() { window._mnEdExcluirNota(parseInt(b.getAttribute('data-nd'))); }; });
    box.querySelectorAll('[data-nd-sem]').forEach(function(b) { b.onclick = function() { window._mnEdExcluirSemNota(b.getAttribute('data-nd-sem')); }; });
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
    var resumoEl = document.getElementById('mnv-resumo');
    var desenhar = function() {
        var todosMarcados = servs.length > 0 && servs.every(function(s) { return !!sel[s.id]; });
        chkAll.checked = todosMarcados;
        lista.innerHTML = ordem.map(function(k, gi) {
            var todos = grupos[k].every(function(s) { return sel[s.id]; });
            var ico = window._mnCatMeta ? window._mnCatMeta(k).icone : 'ph-wrench';
            return '<div style="border:1px solid #e2e8f0;border-radius:10px;margin-bottom:8px;overflow:hidden;">'
              + '<label style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f1f5f9;font-size:0.76rem;font-weight:800;color:#475569;text-transform:uppercase;cursor:pointer;">'
              +   '<input type="checkbox" data-vcat="' + gi + '"' + (todos ? ' checked' : '') + ' style="width:15px;height:15px;accent-color:#2563eb;"> <i class="ph ' + esc(ico) + '" style="color:#d97706;font-size:1rem;"></i> ' + esc(k)
              +   ' <span style="font-weight:600;text-transform:none;color:#94a3b8;">(todos desta subcategoria)</span></label>'
              + grupos[k].map(function(s) {
                    return '<label style="display:flex;align-items:center;gap:8px;padding:6px 12px 6px 28px;font-size:0.85rem;color:#1e293b;cursor:pointer;">'
                      + '<input type="checkbox" data-vid="' + s.id + '"' + (sel[s.id] ? ' checked' : '') + ' style="width:15px;height:15px;accent-color:#2563eb;"> ' + esc(s.nome) + '</label>';
                }).join('')
              + '</div>';
        }).join('');
        lista.querySelectorAll('[data-vid]').forEach(function(c) { c.onchange = function() { sel[c.getAttribute('data-vid')] = c.checked; desenhar(); }; });
        lista.querySelectorAll('[data-vcat]').forEach(function(c) {
            c.onchange = function() { grupos[ordem[parseInt(c.getAttribute('data-vcat'))]].forEach(function(s) { sel[s.id] = c.checked; }); desenhar(); };
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
            var todos = grupos[k].every(function(s) { return sel[s.id]; });
            var ico = window._mnCatMeta ? window._mnCatMeta(k).icone : 'ph-wrench';
            return '<div style="border:1px solid #e2e8f0;border-radius:10px;margin-bottom:8px;overflow:hidden;">'
              + '<label style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f1f5f9;font-size:0.76rem;font-weight:800;color:#475569;text-transform:uppercase;cursor:pointer;">'
              +   '<input type="checkbox" data-rtcat="' + gi + '"' + (todos ? ' checked' : '') + ' style="width:15px;height:15px;accent-color:#2563eb;"> <i class="ph ' + esc(ico) + '" style="color:#d97706;font-size:1rem;"></i> ' + esc(k)
              +   ' <span style="font-weight:600;text-transform:none;color:#94a3b8;">(todos desta subcategoria)</span></label>'
              + grupos[k].map(function(s) {
                    return '<label style="display:flex;align-items:center;gap:8px;padding:6px 12px 6px 28px;font-size:0.85rem;color:#1e293b;cursor:pointer;">'
                      + '<input type="checkbox" data-rtid="' + s.id + '"' + (sel[s.id] ? ' checked' : '') + ' style="width:15px;height:15px;accent-color:#2563eb;"> ' + esc(s.nome) + '</label>';
                }).join('')
              + '</div>';
        }).join('');
        lista.querySelectorAll('[data-rtid]').forEach(function(c) { c.onchange = function() { sel[c.getAttribute('data-rtid')] = c.checked; desenhar(); }; });
        lista.querySelectorAll('[data-rtcat]').forEach(function(c) {
            c.onchange = function() { grupos[ordem[parseInt(c.getAttribute('data-rtcat'))]].forEach(function(s) { sel[s.id] = c.checked; }); desenhar(); };
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
    ed.realizados.forEach(function(s) { mo += window._mnNum(s.mao_obra); });
    if (!ed.realizados.length) {
        (ed.mo || []).forEach(function(l) { mo += Number(l.valor) || 0; });
    }
    (ed.pecas || []).forEach(function(p) { pc += Number(p.valor_total) || 0; });
    var legado = (!ed.realizados.length && !(ed.pecas || []).length && !(ed.mo || []).length && Number(ed.m.custo) > 0);
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
                return { id: s.id, tmp_id: s._tmpId || null, nome: s.nome, catalogo_id: s.catalogo_id, item_ref: s.item_ref, mao_obra: N(s.mao_obra), garantia_valor: s.garantia_valor, garantia_unidade: s.garantia_unidade, observacao: s.observacao || '' };
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
    var nota = (window._mnEd.notas || []).find(function(n) { return n.id === id; });
    var mo = nota && nota.tipo === 'mao_obra';
    if (!confirm('Excluir este anexo/nota fiscal?\n\n' + (mo ? 'As linhas de mão de obra lançadas por ele também serão excluídas.' : 'As peças lançadas por ele também serão excluídas.') + ' Esta ação não pode ser desfeita.')) return;
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
    var soma = 0, qtdItens = 0;
    document.querySelectorAll('#mnp-rows .mnp-row').forEach(function(r) {
        var descEl = r.querySelector('[data-k="descricao"]');
        var o = r._obj || {};
        var qEl = r.querySelector('[data-k="quantidade"]');
        var qtd = N(qEl ? qEl.value : 1) || 1;
        var vu = N(o.valor_unit);
        var vt = N(o.valor_total) || Math.round(qtd * vu * 100) / 100;
        if ((descEl && descEl.value.trim()) || vt > 0) qtdItens++;
        soma += vt;
    });
    el.innerHTML = 'Total das peças' + (qtdItens ? ' (' + qtdItens + ')' : '') + ': <b style="color:#2563eb;">' + window._mnFmtMoeda(soma) + '</b>';
};

window._mnpAtualizarBtnVinculo = function(row) {
    if (!row || !row._obj) return;
    var btn = row.querySelector('[data-pvinc]');
    if (!btn) return;
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
      + '<button type="button" data-pvinc="1" style="padding:6px 10px;border:1.5px solid ' + rv.cor + ';border-radius:8px;background:#fff;color:' + rv.cor + ';cursor:pointer;font-weight:700;font-size:0.76rem;display:inline-flex;align-items:center;gap:5px;"><i class="ph ph-link"></i> ' + esc(rv.txt) + '</button>'
      + '<button type="button" data-x="1" title="Remover linha" style="padding:6px 9px;border:1px solid #fecaca;border-radius:8px;background:#fef2f2;color:#dc2626;cursor:pointer;"><i class="ph ph-trash"></i></button>';
    box.appendChild(row);
    row._obj = obj;
    var descEl = row.querySelector('[data-k="descricao"]');
    var q = row.querySelector('[data-k="quantidade"]'), un = row.querySelector('[data-k="valor_unit"]'), tt = row.querySelector('[data-k="valor_total"]');
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
    row.querySelector('[data-pvinc]').onclick = function() {
        obj.descricao = descEl ? (descEl.value.trim() || 'Peça da manutenção') : 'Peça da manutenção';
        window._mnVincularPopup(obj, function() { window._mnpAtualizarBtnVinculo(row); });
    };
    row.querySelector('[data-x]').onclick = function() { row.remove(); window._mnpAtualizarTotal(); };
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
            var todos = grupos[k].every(function(s) { return sel[s.id]; });
            var ico = window._mnCatMeta ? window._mnCatMeta(k).icone : 'ph-wrench';
            return '<div style="border:1px solid #e2e8f0;border-radius:10px;margin-bottom:8px;overflow:hidden;">'
              + '<label style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f1f5f9;font-size:0.76rem;font-weight:800;color:#475569;text-transform:uppercase;cursor:pointer;">'
              +   '<input type="checkbox" data-prtcat="' + gi + '"' + (todos ? ' checked' : '') + ' style="width:15px;height:15px;accent-color:#2563eb;"> <i class="ph ' + esc(ico) + '" style="color:#d97706;font-size:1rem;"></i> ' + esc(k)
              +   ' <span style="font-weight:600;text-transform:none;color:#94a3b8;">(todos desta subcategoria)</span></label>'
              + grupos[k].map(function(s) {
                    return '<label style="display:flex;align-items:center;gap:8px;padding:6px 12px 6px 28px;font-size:0.85rem;color:#1e293b;cursor:pointer;">'
                      + '<input type="checkbox" data-prtid="' + s.id + '"' + (sel[s.id] ? ' checked' : '') + ' style="width:15px;height:15px;accent-color:#2563eb;"> ' + esc(s.nome) + '</label>';
                }).join('')
              + '</div>';
        }).join('');
        lista.querySelectorAll('[data-prtid]').forEach(function(c) { c.onchange = function() { sel[c.getAttribute('data-prtid')] = c.checked; desenhar(); }; });
        lista.querySelectorAll('[data-prtcat]').forEach(function(c) {
            c.onchange = function() { grupos[ordem[parseInt(c.getAttribute('data-prtcat'))]].forEach(function(s) { sel[s.id] = c.checked; }); desenhar(); };
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
                    garantia_valor: g ? g.valor : '',
                    garantia_unidade: g ? g.unidade : 'dias',
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
    document.querySelectorAll('#mnp-rows .mnp-row').forEach(function(r) {
        var g = function(k) { var el = r.querySelector('[data-k="' + k + '"]'); return el ? el.value : ''; };
        var desc = g('descricao').trim();
        var o = r._obj || {};
        var qtd = N(g('quantidade')) || 1;
        var vu = N(o.valor_unit);
        var vt = N(o.valor_total) || Math.round(qtd * vu * 100) / 100;
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
    if (!pecas.length) { alert('Informe ao menos uma peça (descrição).'); return; }
    var semVinculo = pecas.some(function(p) { return !(p.servicos || []).length; });
    if (semVinculo) {
        alert('Vincule as peças aos serviços realizados clicando em "Vincular a serviços" na linha da peça ou no botão "Ratear total da nota".');
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
            pecas: pecas
        }));
        var editId = window._mnp && window._mnp.editNotaId;
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
    if (ed.veiculo_rodando !== 'sim' && ed.veiculo_rodando !== 'nao') {
        mostrarMsg('Informe se o veículo está rodando ou parado.', false);
        alert('Informe se o veículo está rodando ou parado ("O veículo está rodando? *").');
        return;
    }
    if (msgEl) msgEl.style.display = 'none';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...'; }
    try {
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
        var corpo = {
            status: ed.status,
            veiculo_id: veic,
            descricao: desc,
            data_inicio: di || null,
            data_fim: df || null,
            km_na_manutencao: document.getElementById('mned-km').value || null,
            km_final_manutencao: ehConcl ? (document.getElementById('mned-km-final').value || null) : null,
            fornecedor: document.getElementById('mned-forn').value.trim() || null,
            veiculo_rodando: ed.veiculo_rodando,
            justificativa_status: ed.justificativa_status || undefined
        };
        if (ehConcl) corpo.data_conclusao = document.getElementById('mned-dc').value || null;
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
        ed.m.data_conclusao = ehConcl ? corpo.data_conclusao : ed.m.data_conclusao;
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
