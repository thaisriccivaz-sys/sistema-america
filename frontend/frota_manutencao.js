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
    ['preventiva','corretiva'].forEach(a => {
        const btn = document.getElementById('mn-sub-btn-' + a);
        if (!btn) return;
        btn.style.background = a === aba ? '#d97706' : 'transparent';
        btn.style.color = a === aba ? '#fff' : '#64748b';
    });
    const sub = document.getElementById('mn-sub-conteudo');
    if (!sub) return;
    if (aba === 'preventiva') mnRenderPreventivaTela(sub);
    else mnRenderCorretivaTela(sub);
};

function mnRenderPreventivaTela(sub) {
    const frota = window._manutFrota || [];
    const veicOpts = frota.map(v => `<option value="${v.id}">${v.placa} \u2014 ${(v.marca_modelo_versao||'').substring(0,28)}</option>`).join('');
    sub.innerHTML = `
    <div style="background:#fff;padding:1rem 1.25rem;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:1rem;display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
        <label style="font-weight:700;color:#475569;font-size:0.9rem;">Veículo:</label>
        <select id="mn-prev-veiculo" onchange="window.mnCarregarPreventivoVeiculo()" style="padding:0.6rem 1rem;border:1px solid #cbd5e1;border-radius:8px;font-size:0.9rem;outline:none;min-width:240px;background:#fff;">
            <option value="">Selecione...</option>${veicOpts}
        </select>
        <div id="mn-prev-km-box" style="display:none;align-items:center;gap:8px;flex-wrap:wrap;">
            <i class="ph ph-gauge" style="color:#d97706;font-size:1.1rem;"></i>
            <span style="font-size:0.85rem;color:#64748b;font-weight:600;">KM atual:</span>
            <input type="number" id="mn-prev-km" placeholder="Ex: 125000" style="padding:0.45rem 0.75rem;border:1px solid #cbd5e1;border-radius:8px;font-size:0.9rem;width:130px;outline:none;">
            <button onclick="window.mnSalvarKmPreventivo()" style="background:#0284c7;color:#fff;border:none;border-radius:8px;padding:0.45rem 1rem;font-weight:600;cursor:pointer;font-size:0.85rem;display:flex;align-items:center;gap:6px;">
                <i class="ph ph-floppy-disk"></i> Salvar KM
            </button>
            <span id="mn-prev-km-label" style="font-size:0.82rem;color:#64748b;"></span>
        </div>
        <button onclick="window.abrirModalManutencaoPreventiva()" style="background:#d97706;color:#fff;border:none;border-radius:8px;padding:0.45rem 1rem;font-weight:600;cursor:pointer;font-size:0.85rem;display:flex;align-items:center;gap:6px;margin-left:auto;">
            <i class="ph ph-plus"></i> Registrar Revisão
        </button>
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
    if (!grupos || !Object.keys(grupos).length) return '<div style="padding:2rem;text-align:center;color:#94a3b8;">Nenhum item encontrado.</div>';
    const critCor = { Critica:'#dc2626', Alta:'#d97706', Media:'#0284c7', Baixa:'#2d9e5f' };
    const vid = document.getElementById('mn-prev-veiculo')?.value;

    let html = `<div style="display:flex;flex-direction:column;gap:1rem;">`;
    Object.entries(grupos).forEach(([catNome, cat]) => {
        const rows = cat.itens.map(item => {
            let cor = '#2d9e5f', bg = '#ecfdf5', icone = 'check-circle';
            if (item.status_item==='vencida') { cor='#dc2626'; bg='#fef2f2'; icone='warning'; }
            else if (item.status_item==='proxima') { cor='#d97706'; bg='#fffbeb'; icone='clock'; }
            const kmRestTxt = item.km_restante <= 0
                ? `<span style="color:#dc2626;font-weight:700;">Vencida h\u00e1 ${Math.abs(Math.round(item.km_restante)).toLocaleString('pt-BR')} ${item.unidade}</span>`
                : `<span style="color:${cor};font-weight:700;">Restam ${Math.round(item.km_restante).toLocaleString('pt-BR')} ${item.unidade}</span>`;
            const criticBadge = `<span style="background:${critCor[item.criticidade]||'#94a3b8'}22;color:${critCor[item.criticidade]||'#94a3b8'};padding:1px 7px;border-radius:20px;font-size:0.72rem;font-weight:700;">${item.criticidade||'Media'}</span>`;
            return `<tr style="background:${bg};border-bottom:1px solid #e2e8f0;">
                <td style="padding:0.6rem 0.9rem;">
                    <div style="display:flex;align-items:center;gap:6px;">
                        <i class="ph ph-${icone}" style="color:${cor};"></i>
                        <span style="font-weight:600;color:#1e293b;font-size:0.85rem;">${item.nome}</span>
                        ${item.impede_operacao ? '<span style="background:#dc262622;color:#dc2626;padding:1px 6px;border-radius:20px;font-size:0.7rem;font-weight:700;">Para Op.</span>' : ''}
                    </div>
                </td>
                <td style="padding:0.6rem 0.9rem;text-align:center;">${criticBadge}</td>
                <td style="padding:0.6rem 0.9rem;text-align:center;color:#64748b;font-size:0.82rem;">${item.tipo_controle}</td>
                <td style="padding:0.6rem 0.9rem;text-align:center;color:#475569;font-size:0.82rem;">A cada ${Number(item.periodicidade_padrao).toLocaleString('pt-BR')} ${item.unidade}</td>
                <td style="padding:0.6rem 0.9rem;text-align:center;color:#64748b;font-size:0.82rem;">${item.km_ultima ? Number(item.km_ultima).toLocaleString('pt-BR') + ' ' + item.unidade : '\u2014'}</td>
                <td style="padding:0.6rem 0.9rem;text-align:center;">${kmRestTxt}</td>
                <td style="padding:0.6rem 0.9rem;text-align:center;">
                    <button onclick="window.registrarManutPreventiva(${item.id},'${item.nome.replace(/'/g,'\\'+'')}',' ${item.tipo_controle}')" 
                        style="background:#2d9e5f;color:#fff;border:none;border-radius:6px;padding:0.3rem 0.7rem;font-size:0.75rem;cursor:pointer;font-weight:600;display:flex;align-items:center;gap:4px;">
                        <i class="ph ph-check"></i> Registrar
                    </button>
                </td>
            </tr>`;
        }).join('');
        html += `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
            <div style="background:#1e293b;padding:0.65rem 1rem;display:flex;align-items:center;gap:8px;">
                <i class="ph ph-${cat.icone||'wrench'}" style="color:#f59e0b;font-size:1rem;"></i>
                <span style="font-weight:700;color:#fff;font-size:0.9rem;">${catNome}</span>
                <span style="margin-left:auto;font-size:0.78rem;color:#94a3b8;">${cat.itens.length} itens</span>
            </div>
            <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:0.83rem;">
                <thead><tr style="background:#f1f5f9;">
                    <th style="padding:0.5rem 0.9rem;text-align:left;color:#64748b;font-weight:600;">Servi\u00e7o</th>
                    <th style="padding:0.5rem 0.9rem;text-align:center;color:#64748b;font-weight:600;">Criticidade</th>
                    <th style="padding:0.5rem 0.9rem;text-align:center;color:#64748b;font-weight:600;">Controle</th>
                    <th style="padding:0.5rem 0.9rem;text-align:center;color:#64748b;font-weight:600;">Intervalo</th>
                    <th style="padding:0.5rem 0.9rem;text-align:center;color:#64748b;font-weight:600;">&Uacute;ltimo</th>
                    <th style="padding:0.5rem 0.9rem;text-align:center;color:#64748b;font-weight:600;">Status</th>
                    <th style="padding:0.5rem 0.9rem;"></th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table></div>
        </div>`;
    });
    html += '</div>';
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
            tipo: opts.tipo || 'corretiva',
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
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div>${lbl('Tipo *')}${sel('mn-m-tipo', [{v:'preventiva',l:'Preventiva'},{v:'corretiva',l:'Corretiva'}], m.tipo, opts.tipo!==undefined)}</div>
        <div>${lbl('Status *')}${sel('mn-m-status', [{v:'programada',l:'Programada'},{v:'agendada',l:'Agendada'},{v:'em_andamento',l:'Em Andamento'},{v:'concluida',l:'Concluída'},{v:'cancelada',l:'Cancelada'}], m.status||'programada', false)}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div>${lbl('Fornecedor / Oficina')}${inp('mn-m-forn', m.fornecedor, 'Digite para buscar ou criar...', 'text', 'lista-fornecedores')}</div>
        <div>${lbl('Data Agendamento')}${inp('mn-m-data-ag', m.data_agendamento, '', 'date')}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div>${lbl('KM Atual (Realizada em)')}${inp('mn-m-km', m.km_na_manutencao, 'Ex: 120000', 'number')}</div>
        <div>${lbl('KM de intervalo para a proxima')}${inp('mn-m-intervalo', '', 'Ex: 10000', 'number')}</div>
    </div>
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
            <div>${lbl('Selecione os Serviços')}<div id="mn-m-serv-checkboxes" style="background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:0.6rem;max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;"></div></div>
            <div id="mn-m-serv-novo-box" style="display:none;">${lbl('Nome do Novo Serviço')}${inp('mn-m-serv-novo', '', 'Ex: Troca de válvula específica...')}</div>
            <button id="mn-m-btn-add" onclick="window.mnModalAddServico()" style="background:#0284c7;color:#fff;border:none;border-radius:8px;padding:0.6rem;font-weight:600;cursor:pointer;font-size:0.85rem;">Adicionar Serviços Selecionados à Lista</button>
        </div>
    </div>
    <div id="mn-m-servicos-lista" style="display:flex;flex-direction:column;gap:6px;"></div>
  </div>
</div></div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });

    window._mnModalServicos = [];
    
    if (m.descricao) {
        let interv = '';
        if (m.servico_catalogo_id) {
            const catItem = (window._manutCatalogo||[]).find(c => c.id == m.servico_catalogo_id);
            if (catItem) interv = catItem.periodicidade_padrao;
        } else if (m.km_proxima_manutencao && m.km_na_manutencao) {
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

        window._mnModalServicos.push({
            cat_id: cSel.value,
            servico_id: servId,
            nome: nome,
            km: kmInp.value,
            intervalo: cb.dataset.interval && cb.dataset.interval !== 'undefined' ? cb.dataset.interval : intInp.value
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
                <span style="font-size:0.83rem;color:#1e293b;">${s.nome}<span style="color:#94a3b8;margin-left:8px;font-size:0.75rem;">KM: ${s.km||'—'} | Int: ${s.intervalo||'—'}</span></span>
                <button onclick="window.mnModalRemoveServico(${s._idx})" style="background:none;border:none;color:#dc2626;cursor:pointer;padding:0;"><i class="ph ph-trash"></i></button>
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

    const basePayload = {
        veiculo_id: vid,
        tipo: g('mn-m-tipo'),
        status: g('mn-m-status'),
        data_agendamento: g('mn-m-data-ag') || null,
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

            const kmManut = s.km ? parseInt(s.km) : null;
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
        
        const manut = await fetch('/api/frota/manutencoes', { headers: { Authorization: 'Bearer ' + tok } }).then(r => r.json());
        window._manutDados = manut || [];
        const frota = await fetch('/api/frota/veiculos', { headers: { Authorization: 'Bearer ' + tok } }).then(r => r.json());
        window._frotaDados = frota || [];
        
        if (window._mnSubAba === 'corretiva') {
            const sub = document.getElementById('mn-sub-conteudo');
            if (sub) mnRenderCorretivaTela(sub);
        } else if (window._mnSubAba === 'preventiva') {
            window.mnCarregarPreventivoVeiculo();
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
    const manut = await fetch('/api/frota/manutencoes', { headers: { Authorization: 'Bearer ' + tok } }).then(r => r.json());
    window._manutDados = manut || [];
    mnRenderLista();
};

})();
