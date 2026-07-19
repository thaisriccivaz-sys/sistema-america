// =============================================================================
// MÓDULO DE INTEGRAÇÃO DE COLABORADORES
// =============================================================================

// ── Constantes ────────────────────────────────────────────────────────────────
const INTEG_GRUPOS = {
    todos:         { label: 'Para Todos',    color: '#0f4c81', bg: '#eff6ff',  icon: 'ph-users' },
    administrativo:{ label: 'Administrativo',color: '#7c3aed', bg: '#f5f3ff',  icon: 'ph-desktop' },
    motorista:     { label: 'Motorista',     color: '#d97706', bg: '#fffbeb',  icon: 'ph-truck' },
    operacional:   { label: 'Operacional',   color: '#059669', bg: '#ecfdf5',  icon: 'ph-hard-hat' },
    acompanhamento:{ label: 'Acompanhamento',color: '#dc2626', bg: '#fef2f2',  icon: 'ph-calendar-check' },
};
const INTEG_STATUS = {
    pendente:   { label: 'Pendente',        color: '#f59e0b', bg: '#fffbeb', icon: 'ph-clock' },
    feito:      { label: 'Feito',           color: '#059669', bg: '#ecfdf5', icon: 'ph-check-circle' },
    nao_aplica: { label: 'Não se aplica',   color: '#94a3b8', bg: '#f8fafc', icon: 'ph-x-circle' },
};
const INTEG_CONDICAO_LABELS = { vt: 'Somente VT', vc: 'Somente VC' };

let _integProcessosData  = [];
let _integFiltroStatus   = 'todos';
let _ciCategorias        = [];
let _ciAcoes             = [];
let _ciUsuarios          = [];
let _ciDeptos            = [];
let _ciFiltroDepto       = '';
let _ciFiltroTexto       = '';

// ── Badge ─────────────────────────────────────────────────────────────────────
window.atualizarBadgeIntegracao = async function() {
    try {
        const token = window.currentToken || localStorage.getItem('erp_token');
        const res = await fetch('/api/integracao/notificacoes/count', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        const count = data.count || 0;
        const badge = document.getElementById('integracao-badge');
        if (badge) { if (count > 0) { badge.textContent = count > 99 ? '99+' : count; badge.style.display = 'inline-block'; } else { badge.style.display = 'none'; } }
        const deptItem   = document.getElementById('dept-item-integracao');
        const deptHeader = document.getElementById('dept-integ-header');
        if (deptItem) {
            deptItem.style.setProperty('--dept-color', count > 0 ? '#dc2626' : '#6b7280');
            deptItem.style.setProperty('--dept-bg',    count > 0 ? '#fef2f2' : '#f3f4f6');
            if (deptHeader) deptHeader.style.color = count > 0 ? '#dc2626' : '#6b7280';
        }
    } catch(e) {}
};

(function initBadgePoll() {
    const run = () => { setTimeout(() => window.atualizarBadgeIntegracao(), 2000); setInterval(() => window.atualizarBadgeIntegracao(), 60000); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();

// ── Tela Processo de Integração ───────────────────────────────────────────────
window.loadIntegracaoProcessos = async function() {
    const lista = document.getElementById('integracao-processos-lista');
    if (!lista) return;
    lista.innerHTML = `<div style="text-align:center;padding:3rem;color:#94a3b8;"><i class="ph ph-spinner-gap" style="font-size:2rem;animation:spin 1s linear infinite;"></i><p style="margin-top:.5rem;">Carregando...</p></div>`;
    try {
        const token = window.currentToken || localStorage.getItem('erp_token');
        const res = await fetch('/api/integracao/processos', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Erro ao buscar processos');
        _integProcessosData = await res.json();
        window.renderIntegracaoLista();
        window.atualizarBadgeIntegracao();
    } catch(e) {
        lista.innerHTML = `<div style="text-align:center;padding:3rem;color:#ef4444;"><i class="ph ph-warning-circle" style="font-size:2rem;"></i><p style="margin-top:.5rem;">${e.message}</p></div>`;
    }
};

window.filterIntegracaoStatus = function(status) {
    _integFiltroStatus = status;
    document.querySelectorAll('[id^="btn-filter-integ-"]').forEach(b => { b.style.background = ''; b.style.color = ''; b.style.border = ''; });
    const a = document.getElementById(`btn-filter-integ-${status}`);
    if (a) { a.style.background = '#0f4c81'; a.style.color = '#fff'; a.style.border = 'none'; }
    window.renderIntegracaoLista();
};

window.renderIntegracaoLista = function() {
    const lista = document.getElementById('integracao-processos-lista');
    if (!lista) return;
    const dados = _integFiltroStatus === 'todos' ? _integProcessosData : _integProcessosData.filter(p => p.status === _integFiltroStatus);
    if (!dados || dados.length === 0) {
        lista.innerHTML = `<div style="text-align:center;padding:4rem;color:#94a3b8;background:#f8fafc;border-radius:12px;border:2px dashed #e2e8f0;"><i class="ph ph-handshake" style="font-size:3rem;"></i><p style="margin-top:1rem;font-weight:600;">Nenhum processo${_integFiltroStatus !== 'todos' ? ' neste filtro' : ''}.</p></div>`;
        return;
    }
    lista.innerHTML = dados.map(p => {
        const pct = p.total > 0 ? Math.round(((p.total - p.pendentes) / p.total) * 100) : 0;
        const st = { pendente:{label:'Pendente',color:'#f59e0b'}, em_andamento:{label:'Em Andamento',color:'#0f4c81'}, concluido:{label:'Concluído',color:'#059669'} }[p.status] || {label:'Pendente',color:'#f59e0b'};
        const foto = p.foto_base64 ? `<img src="${p.foto_base64}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid #e2e8f0;">` : `<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#0f4c81,#059669);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:1rem;">${(p.nome_completo||'?')[0]}</div>`;
        return `<div class="card" style="padding:1.25rem;cursor:pointer;transition:box-shadow .2s;border:1px solid #e2e8f0;" onmouseenter="this.style.boxShadow='0 4px 16px rgba(0,0,0,.10)'" onmouseleave="this.style.boxShadow=''" onclick="window.abrirProcessoIntegracao(${p.id})">
            <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
                <div>${foto}</div>
                <div style="flex:1;min-width:200px;">
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;"><strong style="font-size:1rem;color:#0f172a;">${p.nome_completo}</strong><span style="font-size:.75rem;background:${st.color}20;color:${st.color};padding:2px 8px;border-radius:20px;font-weight:600;">${st.label}</span></div>
                    <div style="color:#64748b;font-size:.85rem;">${p.cargo||''} ${p.departamento?`· ${p.departamento}`:''}</div>
                    <div style="margin-top:8px;font-size:.8rem;color:#64748b;">Iniciado em: ${p.criado_em?new Date(p.criado_em).toLocaleDateString('pt-BR'):'—'}</div>
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;min-width:150px;">
                    <div style="font-size:1.1rem;font-weight:700;color:${pct===100?'#059669':'#0f4c81'}">${pct}%</div>
                    <div style="width:120px;height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:${pct===100?'#059669':pct>50?'#0f4c81':'#f59e0b'};border-radius:4px;transition:width .5s;"></div></div>
                    <div style="font-size:.78rem;color:#64748b;">${p.total-p.pendentes}/${p.total} concluídos</div>
                </div>
                <div><button class="btn btn-primary" style="font-size:.82rem;padding:8px 14px;display:flex;align-items:center;gap:5px;background:#0f4c81;" onclick="event.stopPropagation();window.abrirProcessoIntegracao(${p.id})"><i class="ph ph-arrow-right"></i> Ver Passos</button></div>
            </div>
        </div>`;
    }).join('');
};

// ── Modal Processo ────────────────────────────────────────────────────────────
window.abrirProcessoIntegracao = async function(processoId) {
    const modal = document.getElementById('modal-integracao-processo');
    if (!modal) return;
    modal.style.display = 'block';
    document.getElementById('modal-integ-nome').textContent = 'Carregando...';
    document.getElementById('modal-integ-cargo').textContent = '';
    document.getElementById('modal-integ-badges').innerHTML = '';
    document.getElementById('modal-integ-passos-container').innerHTML = `<div style="text-align:center;padding:2rem;color:#94a3b8;"><i class="ph ph-spinner-gap" style="font-size:1.5rem;"></i></div>`;
    try {
        const token = window.currentToken || localStorage.getItem('erp_token');
        const res = await fetch(`/api/integracao/processos/${processoId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Erro ao buscar processo');
        const data = await res.json();
        if (data.status === 'pendente') { await fetch(`/api/integracao/processos/${processoId}/iniciar`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } }); window.atualizarBadgeIntegracao(); }
        document.getElementById('modal-integ-nome').textContent = data.nome_completo || '';
        document.getElementById('modal-integ-cargo').textContent = `${data.cargo||''} · ${data.departamento||''}`;
        const badges = [];
        if (data.tipo_departamento) badges.push(`<span style="background:rgba(255,255,255,.2);padding:3px 10px;border-radius:20px;font-size:.78rem;">${data.tipo_departamento}</span>`);
        document.getElementById('modal-integ-badges').innerHTML = badges.join('');
        const gruposPassos = {};
        (data.passos||[]).forEach(p => { const g = p.grupo||'todos'; if (!gruposPassos[g]) gruposPassos[g]=[]; gruposPassos[g].push(p); });
        const gruposOrdem = ['todos','administrativo','motorista','operacional','acompanhamento'];
        let html = ''; let temPassos = false;
        gruposOrdem.forEach(grupo => {
            const passos = gruposPassos[grupo]; if (!passos||!passos.length) return; temPassos = true;
            const gInfo = INTEG_GRUPOS[grupo]||{label:grupo,color:'#64748b',bg:'#f8fafc',icon:'ph-list'};
            html += `<div style="margin-bottom:1.5rem;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid ${gInfo.color}30;"><i class="ph ${gInfo.icon}" style="color:${gInfo.color};font-size:1rem;"></i><strong style="color:${gInfo.color};font-size:.9rem;">${gInfo.label}</strong><span style="margin-left:auto;font-size:.75rem;color:#94a3b8;">${passos.filter(p=>p.status==='feito').length}/${passos.length} feitos</span></div>`;
            passos.forEach(p => {
                const stInfo = INTEG_STATUS[p.status]||INTEG_STATUS.pendente; const isPendente = p.status==='pendente';
                html += `<div id="passo-row-${p.id}" style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:10px;margin-bottom:6px;background:${stInfo.bg};border:1px solid ${stInfo.color}30;transition:all .2s;">
                    <div style="padding-top:2px;"><i class="ph ${stInfo.icon}" style="color:${stInfo.color};font-size:1.2rem;"></i></div>
                    <div style="flex:1;"><div style="font-size:.9rem;font-weight:${isPendente?'600':'400'};color:${isPendente?'#0f172a':'#94a3b8'};${p.status==='feito'?'text-decoration:line-through;':''}">${p.titulo}</div>${p.descricao?`<div style="font-size:.78rem;color:#94a3b8;margin-top:2px;">${p.descricao}</div>`:''} ${p.responsavel_nome?`<div style="font-size:.75rem;color:#64748b;margin-top:3px;"><i class="ph ph-user"></i> ${p.responsavel_nome}</div>`:''} ${p.feito_em?`<div style="font-size:.73rem;color:#059669;margin-top:2px;"><i class="ph ph-check"></i> Feito em ${new Date(p.feito_em).toLocaleDateString('pt-BR')}</div>`:''}</div>
                    <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;">${isPendente?`<button onclick="window.marcarPassoInteg(${p.id},${processoId},'feito')" style="background:#059669;color:#fff;border:none;padding:5px 10px;border-radius:8px;font-size:.78rem;cursor:pointer;display:flex;align-items:center;gap:4px;white-space:nowrap;"><i class="ph ph-check"></i> Marcar Feito</button><button onclick="window.marcarPassoInteg(${p.id},${processoId},'nao_aplica')" style="background:none;color:#94a3b8;border:1px solid #e2e8f0;padding:4px 10px;border-radius:8px;font-size:.75rem;cursor:pointer;white-space:nowrap;"><i class="ph ph-x"></i> Não se aplica</button>`:p.status!=='pendente'?`<button onclick="window.marcarPassoInteg(${p.id},${processoId},'pendente')" style="background:none;color:#94a3b8;border:1px solid #e2e8f0;padding:4px 10px;border-radius:8px;font-size:.75rem;cursor:pointer;white-space:nowrap;">Desfazer</button>`:''}</div>
                </div>`;
            });
            html += `</div>`;
        });
        if (!temPassos) html = `<div style="text-align:center;padding:2rem;color:#94a3b8;"><i class="ph ph-clipboard-text" style="font-size:2rem;"></i><p style="margin-top:.5rem;">Nenhum passo configurado.</p></div>`;
        document.getElementById('modal-integ-passos-container').innerHTML = html;
    } catch(e) {
        document.getElementById('modal-integ-passos-container').innerHTML = `<div style="color:#ef4444;text-align:center;padding:2rem;">Erro: ${e.message}</div>`;
    }
};

window.marcarPassoInteg = async function(passoStatusId, processoId, status) {
    const token = window.currentToken || localStorage.getItem('erp_token');
    try {
        const res = await fetch(`/api/integracao/passos-status/${passoStatusId}`, { method:'PUT', headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'}, body:JSON.stringify({status}) });
        if (!res.ok) { const d=await res.json(); throw new Error(d.error||'Erro'); }
        await window.abrirProcessoIntegracao(processoId);
        await window.loadIntegracaoProcessos();
        if (typeof showToast==='function') { const msgs={feito:'✅ Atividade marcada como feita!',nao_aplica:'Marcado como não aplicável.',pendente:'Reaberto.'}; showToast(msgs[status]||'Atualizado!',status==='feito'?'success':'info'); }
    } catch(e) { alert('Erro: '+e.message); }
};

// =============================================================================
// CONF. INTEGRAÇÃO — NOVO LAYOUT (igual ao de Avaliações)
// =============================================================================

window.loadConfIntegracao = async function() {
    const container = document.getElementById('conf-integ-main-container');
    if (!container) return;
    container.innerHTML = `<div style="padding:3rem;text-align:center;color:#94a3b8;"><i class="ph ph-spinner-gap" style="font-size:2rem;animation:spin 1s linear infinite;"></i><p style="margin-top:.75rem;">Carregando...</p></div>`;
    try {
        const token = window.currentToken || localStorage.getItem('erp_token');
        const [catRes, acaoRes, userRes, deptoRes] = await Promise.all([
            fetch('/api/integ/categorias',  { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/integ/acoes',        { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/usuarios',           { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/departamentos',      { headers: { 'Authorization': `Bearer ${token}` } }),
        ]);
        _ciCategorias = catRes.ok  ? await catRes.json()  : [];
        _ciAcoes      = acaoRes.ok ? await acaoRes.json() : [];
        _ciUsuarios   = userRes.ok ? await userRes.json() : [];
        _ciDeptos     = deptoRes.ok? await deptoRes.json(): [];
        window.renderConfIntegLayout();
    } catch(e) {
        container.innerHTML = `<div style="padding:2rem;text-align:center;color:#ef4444;"><i class="ph ph-warning-circle" style="font-size:2rem;"></i><p>${e.message}</p><button onclick="window.loadConfIntegracao()" style="margin-top:8px;padding:6px 14px;border:none;background:#0f4c81;color:#fff;border-radius:6px;cursor:pointer;">Tentar novamente</button></div>`;
    }
};

window.renderConfIntegLayout = function() {
    const container = document.getElementById('conf-integ-main-container');
    if (!container) return;

    // Filtrar ações
    const deptoId = _ciFiltroDepto;
    const texto   = (_ciFiltroTexto || '').toLowerCase();
    const acoesFiltradas = _ciAcoes.filter(a => {
        if (texto && !a.titulo.toLowerCase().includes(texto) && !(a.descricao||'').toLowerCase().includes(texto)) return false;
        if (!deptoId) return true;
        if (!a.departamentos || a.departamentos === 'todos') return true;
        try { const d = JSON.parse(a.departamentos); return d.includes(deptoId) || d.includes('todos'); } catch { return true; }
    });

    // Agrupar por categoria
    const catMap = {};
    _ciCategorias.forEach(c => catMap[c.id] = { ...c, acoes: [] });
    acoesFiltradas.forEach(a => { if (catMap[a.categoria_id]) catMap[a.categoria_id].acoes.push(a); });
    const semCategoria = acoesFiltradas.filter(a => !a.categoria_id || !catMap[a.categoria_id]);

    // Opções do select de departamentos
    const deptoOpts = [`<option value="">Todos os departamentos</option>`,
        ..._ciDeptos.map(d => `<option value="${d.id}" ${d.id == deptoId ? 'selected':''}>${d.nome}</option>`)
    ].join('');

    container.innerHTML = `
        <div style="padding:1.5rem;">
            <!-- CABEÇALHO -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
                <div style="display:flex;align-items:center;gap:1rem;">
                    <div style="width:56px;height:56px;border-radius:12px;background:linear-gradient(135deg,#d9480f,#f59e0b);display:flex;align-items:center;justify-content:center;">
                        <i class="ph ph-sliders-horizontal" style="font-size:1.8rem;color:#fff;"></i>
                    </div>
                    <div>
                        <h2 style="margin:0;font-size:1.4rem;color:#0f172a;">Configuração de Integração</h2>
                        <p style="margin:2px 0 0;color:#64748b;font-size:.85rem;">Categorias e ações do plano de integração por departamento</p>
                    </div>
                </div>
                <div style="display:flex;gap:.75rem;align-items:center;">
                    <button onclick="window.abrirModalCategoria()" style="background:#f1f5f9;color:#0f4c81;border:1px solid #bfdbfe;padding:.65rem 1.2rem;border-radius:8px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:.5rem;font-size:.88rem;transition:all .2s;" onmouseenter="this.style.background='#dbeafe'" onmouseleave="this.style.background='#f1f5f9'">
                        <i class="ph ph-folder-plus"></i> Nova Categoria
                    </button>
                    <button onclick="window.abrirModalAcao()" style="background:linear-gradient(135deg,#059669,#0f9b70);color:#fff;border:none;padding:.65rem 1.4rem;border-radius:8px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:.5rem;font-size:.95rem;box-shadow:0 4px 12px rgba(5,150,105,.3);transition:transform .1s;" onmousedown="this.style.transform='scale(.97)'" onmouseup="this.style.transform='scale(1)'">
                        <i class="ph ph-plus-circle"></i> Nova Ação
                    </button>
                </div>
            </div>

            <!-- FILTRO -->
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:1rem 1.25rem;margin-bottom:1.75rem;display:flex;gap:1rem;align-items:center;flex-wrap:wrap;">
                <i class="ph ph-funnel" style="color:#64748b;font-size:1.1rem;"></i>
                <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:200px;">
                    <label style="font-size:.85rem;font-weight:600;color:#374151;white-space:nowrap;">Departamento:</label>
                    <select onchange="window.filtrarConfInteg(this.value, null)" style="padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:.88rem;color:#334155;flex:1;">${deptoOpts}</select>
                </div>
                <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:180px;">
                    <input type="text" placeholder="Buscar ação..." value="${_ciFiltroTexto}" oninput="window.filtrarConfInteg(null, this.value)" style="padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:.88rem;color:#334155;flex:1;">
                </div>
                ${deptoId || _ciFiltroTexto ? `<button onclick="window.filtrarConfInteg('','')" style="background:#fee2e2;color:#dc2626;border:1px solid #fecaca;padding:7px 12px;border-radius:8px;font-size:.82rem;cursor:pointer;white-space:nowrap;"><i class="ph ph-x"></i> Limpar</button>` : ''}
                <span style="font-size:.8rem;color:#94a3b8;white-space:nowrap;">${acoesFiltradas.length} ação${acoesFiltradas.length!==1?'ões':''}</span>
            </div>

            <!-- CATEGORIAS -->
            ${_ciCategorias.map(cat => {
                const acoesCat = catMap[cat.id]?.acoes || [];
                const bg = cat.cor + '18';
                return `
                <div style="margin-bottom:2rem;">
                    <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:1rem;padding-bottom:.5rem;border-bottom:2px solid #e2e8f0;">
                        <div style="width:12px;height:12px;border-radius:50%;background:${cat.cor};flex-shrink:0;"></div>
                        <h3 style="margin:0;font-size:1rem;font-weight:700;color:#0f172a;">${cat.nome}</h3>
                        <span style="background:${cat.cor};color:#fff;font-size:.75rem;font-weight:700;padding:2px 10px;border-radius:999px;">${acoesCat.length} ação${acoesCat.length!==1?'ões':''}</span>
                        <div style="margin-left:auto;display:flex;gap:6px;">
                            <button onclick="window.abrirModalAcao(null,${cat.id})" title="Adicionar ação nesta categoria" style="background:${cat.cor}20;color:${cat.cor};border:1px solid ${cat.cor}40;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:.78rem;display:flex;align-items:center;gap:4px;"><i class="ph ph-plus"></i> Ação</button>
                            <button onclick="window.abrirModalCategoria(${cat.id})" title="Editar categoria" style="background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:.8rem;"><i class="ph ph-pencil-simple"></i></button>
                            <button onclick="window.excluirCategoria(${cat.id},'${(cat.nome||'').replace(/'/g,"\\'")}')" title="Excluir categoria" style="background:#fee2e2;color:#dc2626;border:1px solid #fecaca;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:.8rem;"><i class="ph ph-trash"></i></button>
                        </div>
                    </div>
                    ${acoesCat.length === 0
                        ? `<div style="background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:12px;padding:1.5rem;text-align:center;color:#94a3b8;font-size:.88rem;"><i class="ph ph-clipboard" style="font-size:2rem;display:block;margin-bottom:.4rem;"></i>Nenhuma ação${deptoId?' para este filtro':' ainda'}. <a href="#" onclick="event.preventDefault();window.abrirModalAcao(null,${cat.id})" style="color:${cat.cor};font-weight:600;">Adicionar</a></div>`
                        : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1rem;">${acoesCat.map(a => renderAcaoCard(a, cat)).join('')}</div>`
                    }
                </div>`;
            }).join('')}

            <!-- Ações sem categoria -->
            ${semCategoria.length > 0 ? `
            <div style="margin-bottom:2rem;">
                <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:1rem;padding-bottom:.5rem;border-bottom:2px solid #e2e8f0;">
                    <div style="width:12px;height:12px;border-radius:50%;background:#94a3b8;"></div>
                    <h3 style="margin:0;font-size:1rem;font-weight:700;color:#0f172a;">Sem Categoria</h3>
                    <span style="background:#94a3b8;color:#fff;font-size:.75rem;font-weight:700;padding:2px 10px;border-radius:999px;">${semCategoria.length}</span>
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1rem;">${semCategoria.map(a => renderAcaoCard(a, {cor:'#94a3b8',nome:''})).join('')}</div>
            </div>` : ''}

            ${_ciCategorias.length === 0 && _ciAcoes.length === 0 ? `
            <div style="background:#f8fafc;border:2px dashed #e2e8f0;border-radius:16px;padding:3rem;text-align:center;color:#94a3b8;">
                <i class="ph ph-sliders-horizontal" style="font-size:3rem;display:block;margin-bottom:1rem;"></i>
                <p style="font-weight:600;font-size:1rem;margin:0 0 .5rem;">Nenhuma categoria criada ainda.</p>
                <p style="font-size:.85rem;margin:0 0 1rem;">Crie categorias para organizar as ações de integração.</p>
                <button onclick="window.abrirModalCategoria()" style="background:#0f4c81;color:#fff;border:none;padding:.65rem 1.4rem;border-radius:8px;cursor:pointer;font-weight:600;"><i class="ph ph-folder-plus"></i> Criar primeira categoria</button>
            </div>` : ''}
        </div>`;
};

function renderAcaoCard(a, cat) {
    const cor = cat.cor || '#94a3b8';
    const bg  = cor + '15';
    let deptoLabel = 'Todos';
    if (a.departamentos && a.departamentos !== 'todos') {
        try {
            const ids = JSON.parse(a.departamentos);
            const nomes = ids.map(id => { const d = _ciDeptos.find(x => String(x.id) === String(id)); return d ? d.nome : `#${id}`; });
            deptoLabel = nomes.join(', ') || 'Todos';
        } catch { deptoLabel = a.departamentos; }
    }
    const condBadge = a.condicao ? `<span style="font-size:.7rem;background:#fef9c3;color:#854d0e;padding:1px 6px;border-radius:20px;">${INTEG_CONDICAO_LABELS[a.condicao]||a.condicao}</span>` : '';
    const safeNome = (a.titulo||'').replace(/'/g, "\\'");
    return `<div style="background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,.05);transition:box-shadow .2s;" onmouseover="this.style.boxShadow='0 6px 20px rgba(0,0,0,.1)'" onmouseout="this.style.boxShadow='0 2px 6px rgba(0,0,0,.05)'">
        <div style="background:${bg};border-bottom:1.5px solid #e2e8f0;padding:.9rem 1.1rem;display:flex;justify-content:space-between;align-items:flex-start;">
            <div style="flex:1;min-width:0;">
                <p style="margin:0;font-weight:700;color:#0f172a;font-size:.95rem;margin-bottom:3px;">${a.titulo} ${condBadge}</p>
                ${a.descricao ? `<p style="margin:0;font-size:.78rem;color:#64748b;">${a.descricao}</p>` : ''}
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0;margin-left:8px;">
                <button onclick="window.abrirModalAcao(${a.id})" title="Editar" style="background:${cor};color:#fff;border:none;width:32px;height:32px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:opacity .2s;" onmouseover="this.style.opacity='.8'" onmouseout="this.style.opacity='1'"><i class="ph ph-pencil-simple"></i></button>
                <button onclick="window.excluirAcao(${a.id},'${safeNome}')" title="Excluir" style="background:#ef4444;color:#fff;border:none;width:32px;height:32px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:opacity .2s;" onmouseover="this.style.opacity='.8'" onmouseout="this.style.opacity='1'"><i class="ph ph-trash"></i></button>
            </div>
        </div>
        <div style="padding:.75rem 1.1rem;">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:.8rem;color:#64748b;">
                <i class="ph ph-buildings"></i>
                <span style="background:${cor}20;color:${cor};padding:2px 8px;border-radius:999px;font-weight:600;font-size:.75rem;">${deptoLabel}</span>
                ${a.responsavel_nome ? `<span style="color:#94a3b8;">· <i class="ph ph-user"></i> ${a.responsavel_nome}</span>` : ''}
            </div>
        </div>
    </div>`;
}

window.filtrarConfInteg = function(deptoId, texto) {
    if (deptoId !== null) _ciFiltroDepto = deptoId || '';
    if (texto  !== null) _ciFiltroTexto = texto  || '';
    window.renderConfIntegLayout();
};

// ── Modal Categoria ───────────────────────────────────────────────────────────
window.abrirModalCategoria = function(id) {
    const cat = id ? _ciCategorias.find(c => c.id === id) : null;
    document.getElementById('ic-id').value        = cat ? cat.id : '';
    document.getElementById('ic-nome').value      = cat ? cat.nome : '';
    document.getElementById('ic-ordem').value     = cat ? cat.ordem : '0';
    document.getElementById('modal-ic-title').textContent = cat ? 'Editar Categoria' : 'Nova Categoria';
    // Marcar cor
    const cor = cat ? cat.cor : '#0f4c81';
    document.querySelectorAll('input[name="ic-cor"]').forEach(r => r.checked = r.value === cor);
    const modal = document.getElementById('modal-integ-categoria');
    if (modal) { modal.style.display = 'flex'; modal.style.alignItems = 'center'; modal.style.justifyContent = 'center'; }
};

window.fecharModalCategoria = function() {
    const m = document.getElementById('modal-integ-categoria'); if (m) m.style.display = 'none';
};

window.salvarCategoria = async function(e) {
    e.preventDefault();
    const token = window.currentToken || localStorage.getItem('erp_token');
    const id    = document.getElementById('ic-id').value;
    const cor   = document.querySelector('input[name="ic-cor"]:checked')?.value || '#0f4c81';
    const body  = { id: id ? parseInt(id) : undefined, nome: document.getElementById('ic-nome').value.trim(), cor, ordem: parseInt(document.getElementById('ic-ordem').value) || 0 };
    try {
        const res = await fetch('/api/integ/categorias', { method:'POST', headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'}, body:JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro');
        window.fecharModalCategoria();
        await window.loadConfIntegracao();
        if (typeof showToast === 'function') showToast('Categoria salva!', 'success');
    } catch(err) { alert('Erro: ' + err.message); }
};

window.excluirCategoria = async function(id, nome) {
    if (!confirm(`Excluir a categoria "${nome}"? As ações vinculadas ficarão sem categoria.`)) return;
    const token = window.currentToken || localStorage.getItem('erp_token');
    try {
        const res = await fetch(`/api/integ/categorias/${id}`, { method:'DELETE', headers:{'Authorization':`Bearer ${token}`} });
        if (!res.ok) throw new Error('Erro ao excluir');
        await window.loadConfIntegracao();
        if (typeof showToast === 'function') showToast('Categoria excluída.', 'info');
    } catch(e) { alert('Erro: ' + e.message); }
};

// ── Modal Ação ────────────────────────────────────────────────────────────────
window.abrirModalAcao = function(id, categoriaIdPreset) {
    const acao = id ? _ciAcoes.find(a => a.id === id) : null;

    document.getElementById('ia-id').value        = acao ? acao.id : '';
    document.getElementById('ia-titulo').value    = acao ? acao.titulo : '';
    document.getElementById('ia-descricao').value = acao ? (acao.descricao || '') : '';
    document.getElementById('ia-condicao').value  = acao ? (acao.condicao || '') : '';
    document.getElementById('ia-ordem').value     = acao ? (acao.ordem || 0) : '0';
    document.getElementById('modal-ia-title').textContent = acao ? 'Editar Ação' : 'Nova Ação';

    // Select de categoria
    const selCat = document.getElementById('ia-categoria');
    selCat.innerHTML = '<option value="">— Sem categoria —</option>';
    _ciCategorias.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id; opt.textContent = c.nome;
        if (acao ? c.id == acao.categoria_id : c.id == categoriaIdPreset) opt.selected = true;
        selCat.appendChild(opt);
    });

    // Select de responsável
    const selResp = document.getElementById('ia-responsavel');
    selResp.innerHTML = '<option value="">— Nenhum —</option>';
    _ciUsuarios.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id; opt.textContent = u.nome || u.username;
        if (acao && acao.responsavel_user_id == u.id) opt.selected = true;
        selResp.appendChild(opt);
    });

    // Departamentos
    const listaEl = document.getElementById('ia-deptos-lista');
    listaEl.innerHTML = _ciDeptos.map(d => {
        let checked = false;
        if (acao) {
            if (!acao.departamentos || acao.departamentos === 'todos') checked = false;
            else { try { checked = JSON.parse(acao.departamentos).includes(String(d.id)); } catch { checked = false; } }
        }
        return `<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:.88rem;color:#374151;padding:3px 0;">
            <input type="checkbox" class="ia-depto-cb" value="${d.id}" ${checked ? 'checked' : ''} style="accent-color:#0f4c81;width:14px;height:14px;" onchange="window.syncTodosDepto()">
            ${d.nome}
        </label>`;
    }).join('');

    // Marcar "Todos" se for todos
    const todosEl = document.getElementById('ia-depto-todos');
    todosEl.checked = !acao || !acao.departamentos || acao.departamentos === 'todos';
    if (todosEl.checked) listaEl.style.opacity = '0.4';
    else listaEl.style.opacity = '1';

    const modal = document.getElementById('modal-integ-acao');
    if (modal) { modal.style.display = 'flex'; modal.style.alignItems = 'flex-start'; modal.style.justifyContent = 'center'; }
};

window.fecharModalAcao = function() {
    const m = document.getElementById('modal-integ-acao'); if (m) m.style.display = 'none';
};

window.toggleTodosDeptos = function(cb) {
    const lista = document.getElementById('ia-deptos-lista');
    if (cb.checked) {
        lista.style.opacity = '0.4';
        document.querySelectorAll('.ia-depto-cb').forEach(c => c.checked = false);
    } else {
        lista.style.opacity = '1';
    }
};

window.syncTodosDepto = function() {
    const algumMarcado = [...document.querySelectorAll('.ia-depto-cb')].some(c => c.checked);
    const todosEl = document.getElementById('ia-depto-todos');
    if (algumMarcado) {
        todosEl.checked = false;
        document.getElementById('ia-deptos-lista').style.opacity = '1';
    }
};

window.salvarAcao = async function(e) {
    e.preventDefault();
    const token = window.currentToken || localStorage.getItem('erp_token');
    const id    = document.getElementById('ia-id').value;

    // Coletar departamentos
    const todosEl = document.getElementById('ia-depto-todos');
    let departamentos;
    if (todosEl.checked) {
        departamentos = 'todos';
    } else {
        const marcados = [...document.querySelectorAll('.ia-depto-cb:checked')].map(c => c.value);
        departamentos = marcados.length > 0 ? marcados : 'todos';
    }

    const body = {
        id: id ? parseInt(id) : undefined,
        titulo:              document.getElementById('ia-titulo').value.trim(),
        descricao:           document.getElementById('ia-descricao').value.trim(),
        categoria_id:        document.getElementById('ia-categoria').value || null,
        condicao:            document.getElementById('ia-condicao').value || null,
        responsavel_user_id: document.getElementById('ia-responsavel').value || null,
        ordem:               parseInt(document.getElementById('ia-ordem').value) || 0,
        departamentos,
    };
    if (!body.titulo) return alert('Informe o título da ação.');

    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner-gap" style="animation:spin 1s linear infinite;"></i> Salvando...'; }
    try {
        const res = await fetch('/api/integ/acoes', { method:'POST', headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'}, body:JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro');
        window.fecharModalAcao();
        await window.loadConfIntegracao();
        if (typeof showToast === 'function') showToast('Ação salva!', 'success');
    } catch(err) { alert('Erro: ' + err.message); }
    finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar Ação'; } }
};

window.excluirAcao = async function(id, nome) {
    if (!confirm(`Excluir a ação "${nome}"?`)) return;
    const token = window.currentToken || localStorage.getItem('erp_token');
    try {
        const res = await fetch(`/api/integ/acoes/${id}`, { method:'DELETE', headers:{'Authorization':`Bearer ${token}`} });
        if (!res.ok) throw new Error('Erro ao excluir');
        await window.loadConfIntegracao();
        if (typeof showToast === 'function') showToast('Ação excluída.', 'info');
    } catch(e) { alert('Erro: ' + e.message); }
};

// ── Hook de navegação ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const _orig = window.navigateTo;
    window.navigateTo = function(target, ...args) {
        if (typeof _orig === 'function') _orig(target, ...args);
        if (target === 'integracao')      setTimeout(() => window.loadIntegracaoProcessos(), 150);
        if (target === 'conf-integracao') setTimeout(() => window.loadConfIntegracao(), 150);
    };
    document.querySelectorAll('.nav-item[data-target="integracao"]').forEach(el => el.addEventListener('click', () => setTimeout(() => window.loadIntegracaoProcessos(), 200)));
    document.querySelectorAll('.nav-item[data-target="conf-integracao"]').forEach(el => el.addEventListener('click', () => setTimeout(() => window.loadConfIntegracao(), 200)));
});

// CSS spin
(function() {
    if (document.getElementById('integ-spin-style')) return;
    const s = document.createElement('style');
    s.id = 'integ-spin-style';
    s.textContent = '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}';
    document.head.appendChild(s);
})();

// Compatibilidade retroativa
window.loadIntegracaoColabs = function() { window.loadIntegracaoProcessos?.(); };
window.filtrarConfIntegGrupo = function() {};
window.renderConfIntegTabela = function() {};
window.switchConfIntegTab = function() {};
window.abrirModalNovoPasso = function() { window.abrirModalAcao?.(); };
window.fecharModalPasso = function() { window.fecharModalAcao?.(); };
window.salvarPasso = function(e) { window.salvarAcao?.(e); };
