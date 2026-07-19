// =============================================================================
// MÓDULO DE INTEGRAÇÃO DE COLABORADORES
// =============================================================================

// ── Constantes e helpers ──────────────────────────────────────────────────────
const INTEG_GRUPOS = {
    todos: { label: 'Para Todos', color: '#0f4c81', bg: '#eff6ff', icon: 'ph-users' },
    administrativo: { label: 'Administrativo', color: '#7c3aed', bg: '#f5f3ff', icon: 'ph-desktop' },
    motorista: { label: 'Motorista', color: '#d97706', bg: '#fffbeb', icon: 'ph-truck' },
    operacional: { label: 'Operacional', color: '#059669', bg: '#ecfdf5', icon: 'ph-hard-hat' },
    acompanhamento: { label: 'Acompanhamento', color: '#dc2626', bg: '#fef2f2', icon: 'ph-calendar-check' },
};
const INTEG_STATUS = {
    pendente: { label: 'Pendente', color: '#f59e0b', bg: '#fffbeb', icon: 'ph-clock' },
    feito: { label: 'Feito', color: '#059669', bg: '#ecfdf5', icon: 'ph-check-circle' },
    nao_aplica: { label: 'Não se aplica', color: '#94a3b8', bg: '#f8fafc', icon: 'ph-x-circle' },
};

let _integProcessosData = [];
let _integFiltroStatus = 'todos';
let _confIntegPassos = [];
let _confIntegUsuarios = [];
let _confTemplatesDepto = [];
let _confDeptos = [];
let _confIntegTabAtual = 'padrao';
let _acaoCustomContador = 0;

// ── Badge de notificações ─────────────────────────────────────────────────────
window.atualizarBadgeIntegracao = async function() {
    try {
        const token = window.currentToken || localStorage.getItem('erp_token');
        const res = await fetch('/api/integracao/notificacoes/count', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        const count = data.count || 0;

        // Atualizar badge
        const badge = document.getElementById('integracao-badge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }

        // Atualizar cor do item lateral (cinza = sem pendências, vermelho = com pendências)
        const deptItem = document.getElementById('dept-item-integracao');
        const deptHeader = document.getElementById('dept-integ-header');
        if (deptItem) {
            if (count > 0) {
                deptItem.style.setProperty('--dept-color', '#dc2626');
                deptItem.style.setProperty('--dept-bg', '#fef2f2');
                if (deptHeader) { deptHeader.style.color = '#dc2626'; }
            } else {
                deptItem.style.setProperty('--dept-color', '#6b7280');
                deptItem.style.setProperty('--dept-bg', '#f3f4f6');
                if (deptHeader) { deptHeader.style.color = '#6b7280'; }
            }
        }
    } catch(e) {}
};

// Iniciar polling do badge a cada 60s
(function initBadgePoll() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => window.atualizarBadgeIntegracao(), 2000);
            setInterval(() => window.atualizarBadgeIntegracao(), 60000);
        });
    } else {
        setTimeout(() => window.atualizarBadgeIntegracao(), 2000);
        setInterval(() => window.atualizarBadgeIntegracao(), 60000);
    }
})();

// ── Tela de Integração: listar processos ──────────────────────────────────────
window.loadIntegracaoProcessos = async function() {
    const lista = document.getElementById('integracao-processos-lista');
    if (!lista) return;
    lista.innerHTML = `<div style="text-align:center;padding:3rem;color:#94a3b8;"><i class="ph ph-spinner-gap" style="font-size:2rem;animation:spin 1s linear infinite;"></i><p style="margin-top:0.5rem;">Carregando processos...</p></div>`;
    try {
        const token = window.currentToken || localStorage.getItem('erp_token');
        const res = await fetch('/api/integracao/processos', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Erro ao buscar processos');
        _integProcessosData = await res.json();
        window.renderIntegracaoLista();
        window.atualizarBadgeIntegracao();
    } catch(e) {
        lista.innerHTML = `<div style="text-align:center;padding:3rem;color:#ef4444;"><i class="ph ph-warning-circle" style="font-size:2rem;"></i><p style="margin-top:0.5rem;">Erro ao carregar: ${e.message}</p></div>`;
    }
};

window.filterIntegracaoStatus = function(status) {
    _integFiltroStatus = status;
    document.querySelectorAll('[id^="btn-filter-integ-"]').forEach(btn => {
        btn.style.background = '';
        btn.style.color = '';
        btn.style.border = '';
    });
    const activeBtn = document.getElementById(`btn-filter-integ-${status}`);
    if (activeBtn) { activeBtn.style.background = '#0f4c81'; activeBtn.style.color = '#fff'; activeBtn.style.border = 'none'; }
    window.renderIntegracaoLista();
};

window.renderIntegracaoLista = function() {
    const lista = document.getElementById('integracao-processos-lista');
    if (!lista) return;
    const dados = _integFiltroStatus === 'todos'
        ? _integProcessosData
        : _integProcessosData.filter(p => p.status === _integFiltroStatus);

    if (!dados || dados.length === 0) {
        lista.innerHTML = `<div style="text-align:center;padding:4rem;color:#94a3b8;background:#f8fafc;border-radius:12px;border:2px dashed #e2e8f0;">
            <i class="ph ph-handshake" style="font-size:3rem;"></i>
            <p style="margin-top:1rem;font-size:1rem;font-weight:600;">Nenhum processo de integração${_integFiltroStatus !== 'todos' ? ' neste filtro' : ' pendente'}.</p>
            <p style="font-size:0.85rem;">Quando um colaborador for liberado para integração, ele aparecerá aqui.</p>
        </div>`;
        return;
    }

    lista.innerHTML = dados.map(p => {
        const pct = p.total > 0 ? Math.round(((p.total - p.pendentes) / p.total) * 100) : 0;
        const statusInfo = { pendente: { label: 'Pendente', color: '#f59e0b' }, em_andamento: { label: 'Em Andamento', color: '#0f4c81' }, concluido: { label: 'Concluído', color: '#059669' } };
        const st = statusInfo[p.status] || statusInfo.pendente;
        const foto = p.foto_base64
            ? `<img src="${p.foto_base64}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid #e2e8f0;">`
            : `<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#0f4c81,#059669);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:1rem;">${(p.nome_completo||'?')[0]}</div>`;
        return `
        <div class="card" style="padding:1.25rem;cursor:pointer;transition:box-shadow 0.2s;border:1px solid #e2e8f0;"
             onmouseenter="this.style.boxShadow='0 4px 16px rgba(0,0,0,0.10)'"
             onmouseleave="this.style.boxShadow=''"
             onclick="window.abrirProcessoIntegracao(${p.id})">
            <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
                <div>${foto}</div>
                <div style="flex:1;min-width:200px;">
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
                        <strong style="font-size:1rem;color:#0f172a;">${p.nome_completo}</strong>
                        <span style="font-size:0.75rem;background:${st.color}20;color:${st.color};padding:2px 8px;border-radius:20px;font-weight:600;">${st.label}</span>
                    </div>
                    <div style="color:#64748b;font-size:0.85rem;">${p.cargo || ''} ${p.departamento ? `· ${p.departamento}` : ''}</div>
                    <div style="margin-top:8px;font-size:0.8rem;color:#64748b;">
                        Iniciado em: ${p.criado_em ? new Date(p.criado_em).toLocaleDateString('pt-BR') : '—'}
                    </div>
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;min-width:150px;">
                    <div style="font-size:1.1rem;font-weight:700;color:${pct === 100 ? '#059669' : '#0f4c81'}">${pct}%</div>
                    <div style="width:120px;height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;">
                        <div style="height:100%;width:${pct}%;background:${pct === 100 ? '#059669' : pct > 50 ? '#0f4c81' : '#f59e0b'};border-radius:4px;transition:width 0.5s;"></div>
                    </div>
                    <div style="font-size:0.78rem;color:#64748b;">${p.total - p.pendentes}/${p.total} concluídos</div>
                </div>
                <div>
                    <button class="btn btn-primary" style="font-size:0.82rem;padding:8px 14px;display:flex;align-items:center;gap:5px;background:#0f4c81;"
                        onclick="event.stopPropagation();window.abrirProcessoIntegracao(${p.id})">
                        <i class="ph ph-arrow-right"></i> Ver Passos
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
};

// ── Modal de passos do processo ───────────────────────────────────────────────
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

        // Marcar como iniciado se ainda for pendente
        if (data.status === 'pendente') {
            await fetch(`/api/integracao/processos/${processoId}/iniciar`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            window.atualizarBadgeIntegracao();
        }

        document.getElementById('modal-integ-nome').textContent = data.nome_completo || '';
        document.getElementById('modal-integ-cargo').textContent = `${data.cargo || ''} · ${data.departamento || ''}`;

        // Badges de info
        const badges = [];
        if (data.tipo_departamento) badges.push(`<span style="background:rgba(255,255,255,0.2);padding:3px 10px;border-radius:20px;font-size:0.78rem;">${data.tipo_departamento}</span>`);
        if (data.meio_transporte) badges.push(`<span style="background:rgba(255,255,255,0.2);padding:3px 10px;border-radius:20px;font-size:0.78rem;">${data.meio_transporte}</span>`);
        document.getElementById('modal-integ-badges').innerHTML = badges.join('');

        // Agrupar passos por grupo
        const gruposPassos = {};
        (data.passos || []).forEach(p => {
            const g = p.grupo || 'todos';
            if (!gruposPassos[g]) gruposPassos[g] = [];
            gruposPassos[g].push(p);
        });

        const gruposOrdem = ['todos', 'administrativo', 'motorista', 'operacional', 'acompanhamento'];
        let html = '';
        let temPassos = false;
        gruposOrdem.forEach(grupo => {
            const passos = gruposPassos[grupo];
            if (!passos || passos.length === 0) return;
            temPassos = true;
            const gInfo = INTEG_GRUPOS[grupo] || { label: grupo, color: '#64748b', bg: '#f8fafc', icon: 'ph-list' };
            html += `<div style="margin-bottom:1.5rem;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid ${gInfo.color}30;">
                    <i class="ph ${gInfo.icon}" style="color:${gInfo.color};font-size:1rem;"></i>
                    <strong style="color:${gInfo.color};font-size:0.9rem;">${gInfo.label}</strong>
                    <span style="margin-left:auto;font-size:0.75rem;color:#94a3b8;">${passos.filter(p => p.status === 'feito').length}/${passos.length} feitos</span>
                </div>`;
            passos.forEach(p => {
                const stInfo = INTEG_STATUS[p.status] || INTEG_STATUS.pendente;
                const isPendente = p.status === 'pendente';
                html += `<div id="passo-row-${p.id}" style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:10px;margin-bottom:6px;background:${stInfo.bg};border:1px solid ${stInfo.color}30;transition:all 0.2s;">
                    <div style="padding-top:2px;">
                        <i class="ph ${stInfo.icon}" style="color:${stInfo.color};font-size:1.2rem;"></i>
                    </div>
                    <div style="flex:1;">
                        <div style="font-size:0.9rem;font-weight:${isPendente ? '600' : '400'};color:${isPendente ? '#0f172a' : '#94a3b8'};${p.status === 'feito' ? 'text-decoration:line-through;' : ''}">${p.titulo}</div>
                        ${p.descricao ? `<div style="font-size:0.78rem;color:#94a3b8;margin-top:2px;">${p.descricao}</div>` : ''}
                        ${p.responsavel_nome ? `<div style="font-size:0.75rem;color:#64748b;margin-top:3px;"><i class="ph ph-user"></i> ${p.responsavel_nome}</div>` : ''}
                        ${p.feito_em ? `<div style="font-size:0.73rem;color:#059669;margin-top:2px;"><i class="ph ph-check"></i> Feito em ${new Date(p.feito_em).toLocaleDateString('pt-BR')}</div>` : ''}
                    </div>
                    <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;">
                        ${isPendente ? `
                        <button onclick="window.marcarPassoInteg(${p.id}, ${processoId}, 'feito')"
                            style="background:#059669;color:#fff;border:none;padding:5px 10px;border-radius:8px;font-size:0.78rem;cursor:pointer;display:flex;align-items:center;gap:4px;white-space:nowrap;">
                            <i class="ph ph-check"></i> Marcar Feito
                        </button>
                        <button onclick="window.marcarPassoInteg(${p.id}, ${processoId}, 'nao_aplica')"
                            style="background:none;color:#94a3b8;border:1px solid #e2e8f0;padding:4px 10px;border-radius:8px;font-size:0.75rem;cursor:pointer;display:flex;align-items:center;gap:4px;white-space:nowrap;">
                            <i class="ph ph-x"></i> Não se aplica
                        </button>
                        ` : p.status !== 'pendente' ? `
                        <button onclick="window.marcarPassoInteg(${p.id}, ${processoId}, 'pendente')"
                            style="background:none;color:#94a3b8;border:1px solid #e2e8f0;padding:4px 10px;border-radius:8px;font-size:0.75rem;cursor:pointer;white-space:nowrap;">
                            Desfazer
                        </button>
                        ` : ''}
                    </div>
                </div>`;
            });
            html += `</div>`;
        });

        if (!temPassos) {
            html = `<div style="text-align:center;padding:2rem;color:#94a3b8;">
                <i class="ph ph-clipboard-text" style="font-size:2rem;"></i>
                <p style="margin-top:0.5rem;">Nenhum passo de integração configurado para você.</p>
            </div>`;
        }

        document.getElementById('modal-integ-passos-container').innerHTML = html;
    } catch(e) {
        document.getElementById('modal-integ-passos-container').innerHTML = `<div style="color:#ef4444;text-align:center;padding:2rem;">Erro: ${e.message}</div>`;
    }
};

window.marcarPassoInteg = async function(passoStatusId, processoId, status) {
    const token = window.currentToken || localStorage.getItem('erp_token');
    try {
        const res = await fetch(`/api/integracao/passos-status/${passoStatusId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Erro'); }
        await window.abrirProcessoIntegracao(processoId);
        await window.loadIntegracaoProcessos();
        if (typeof showToast === 'function') {
            const msgs = { feito: '✅ Atividade marcada como feita!', nao_aplica: 'Atividade marcada como não aplicável.', pendente: 'Atividade reaberta.' };
            showToast(msgs[status] || 'Atualizado!', status === 'feito' ? 'success' : 'info');
        }
    } catch(e) {
        alert('Erro ao atualizar: ' + e.message);
    }
};

// =============================================================================
// CONF. INTEGRAÇÃO — ABAS: TEMPLATES PADRÃO / TEMPLATES POR DEPARTAMENTO
// =============================================================================

window.loadConfIntegracao = async function() {
    await Promise.all([
        window.loadConfIntegUsuarios(),
        window.loadConfDeptos(),
    ]);
    // Exibir aba atual
    if (_confIntegTabAtual === 'padrao') {
        await window.loadConfIntegPassos();
    } else {
        await window.loadTemplatesDepto();
    }
    window._updateConfIntegHeaderBtn();
};

// ── Troca de abas ────────────────────────────────────────────────────────────
window.switchConfIntegTab = function(tab) {
    _confIntegTabAtual = tab;
    const panelPadrao = document.getElementById('panel-ci-padrao');
    const panelDepto  = document.getElementById('panel-ci-depto');
    const btnPadrao   = document.getElementById('tab-btn-ci-padrao');
    const btnDepto    = document.getElementById('tab-btn-ci-depto');
    if (!panelPadrao || !panelDepto) return;

    if (tab === 'padrao') {
        panelPadrao.style.display = '';
        panelDepto.style.display = 'none';
        btnPadrao.style.color = 'var(--primary-color)';
        btnPadrao.style.borderBottomColor = 'var(--primary-color)';
        btnPadrao.style.fontWeight = '600';
        btnDepto.style.color = '#64748b';
        btnDepto.style.borderBottomColor = 'transparent';
        btnDepto.style.fontWeight = '500';
        window.loadConfIntegPassos();
    } else {
        panelPadrao.style.display = 'none';
        panelDepto.style.display = '';
        btnDepto.style.color = 'var(--primary-color)';
        btnDepto.style.borderBottomColor = 'var(--primary-color)';
        btnDepto.style.fontWeight = '600';
        btnPadrao.style.color = '#64748b';
        btnPadrao.style.borderBottomColor = 'transparent';
        btnPadrao.style.fontWeight = '500';
        window.loadTemplatesDepto();
    }
    window._updateConfIntegHeaderBtn();
};

window._updateConfIntegHeaderBtn = function() {
    const area = document.getElementById('conf-integ-header-actions');
    if (!area) return;
    if (_confIntegTabAtual === 'padrao') {
        area.innerHTML = `<button onclick="window.abrirModalNovoPasso()" class="btn btn-primary" style="display:flex;align-items:center;gap:6px;background:#059669;border-color:#059669;">
            <i class="ph ph-plus"></i> Novo Passo Padrão
        </button>`;
    } else {
        area.innerHTML = `<button onclick="window.abrirModalTemplateDepto()" class="btn btn-primary" style="display:flex;align-items:center;gap:6px;background:#7c3aed;border-color:#7c3aed;">
            <i class="ph ph-plus"></i> Novo Template
        </button>`;
    }
};

// ── TAB 1: Templates Padrão ───────────────────────────────────────────────────
window.loadConfIntegPassos = async function() {
    const container = document.getElementById('conf-integ-secoes');
    if (!container) return;
    container.innerHTML = `<div style="text-align:center;padding:3rem;color:#94a3b8;"><i class="ph ph-spinner-gap" style="font-size:2rem;animation:spin 1s linear infinite;"></i></div>`;
    try {
        const token = window.currentToken || localStorage.getItem('erp_token');
        const res = await fetch('/api/integracao/config/all', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Servidor retornou ${res.status}`);
        }
        const data = await res.json();
        _confIntegPassos = Array.isArray(data) ? data : [];
        window.renderConfIntegSecoes(_confIntegPassos);
    } catch(e) {
        container.innerHTML = `<div style="text-align:center;padding:2rem;color:#ef4444;"><i class="ph ph-warning-circle" style="font-size:2rem;"></i><p>Erro ao carregar: ${e.message}</p><button onclick="window.loadConfIntegPassos()" style="margin-top:8px;padding:6px 14px;border:none;background:#0f4c81;color:#fff;border-radius:6px;cursor:pointer;">Tentar novamente</button></div>`;
    }
};

window.loadConfIntegUsuarios = async function() {
    try {
        const token = window.currentToken || localStorage.getItem('erp_token');
        const res = await fetch('/api/usuarios', { headers: { 'Authorization': `Bearer ${token}` } });
        _confIntegUsuarios = (await res.json()) || [];
    } catch(e) {}
};

window.loadConfDeptos = async function() {
    try {
        const token = window.currentToken || localStorage.getItem('erp_token');
        const res = await fetch('/api/departamentos', { headers: { 'Authorization': `Bearer ${token}` } });
        _confDeptos = (await res.json()) || [];
    } catch(e) {}
};

const INTEG_CONDICAO_LABELS = { vt: 'Somente VT', vc: 'Somente VC' };
const GRUPOS_ORDEM_PADRAO = ['todos', 'administrativo', 'motorista', 'operacional', 'acompanhamento'];

window.renderConfIntegSecoes = function(passos) {
    const container = document.getElementById('conf-integ-secoes');
    if (!container) return;

    if (!passos || !Array.isArray(passos) || passos.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:3rem;color:#94a3b8;background:#f8fafc;border-radius:12px;border:2px dashed #e2e8f0;">
            <i class="ph ph-list-checks" style="font-size:2.5rem;"></i>
            <p style="margin-top:1rem;font-weight:600;">Nenhum passo padrão configurado.</p>
            <p style="font-size:0.85rem;">Clique em "Novo Passo Padrão" para começar.</p>
        </div>`;
        return;
    }

    // Agrupar por grupo
    const porGrupo = {};
    GRUPOS_ORDEM_PADRAO.forEach(g => porGrupo[g] = []);
    passos.forEach(p => {
        const g = p.grupo || 'todos';
        if (!porGrupo[g]) porGrupo[g] = [];
        porGrupo[g].push(p);
    });

    let html = '';
    GRUPOS_ORDEM_PADRAO.forEach(grupo => {
        const lista = porGrupo[grupo];
        const gInfo = INTEG_GRUPOS[grupo] || { label: grupo, color: '#64748b', bg: '#f8fafc', icon: 'ph-list' };
        html += `<div style="margin-bottom:2rem;">
            <!-- Cabeçalho da seção -->
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;padding:10px 14px;border-radius:10px;background:${gInfo.bg};border-left:4px solid ${gInfo.color};">
                <div style="display:flex;align-items:center;gap:8px;">
                    <i class="ph ${gInfo.icon}" style="color:${gInfo.color};font-size:1.15rem;"></i>
                    <strong style="font-size:0.95rem;color:${gInfo.color};">${gInfo.label}</strong>
                    <span style="font-size:0.78rem;background:${gInfo.color}20;color:${gInfo.color};padding:2px 8px;border-radius:20px;">${lista.length} passo${lista.length !== 1 ? 's' : ''}</span>
                </div>
                <button onclick="window.abrirModalNovoPasso('${grupo}')"
                    style="background:${gInfo.color};color:#fff;border:none;border-radius:8px;padding:5px 12px;font-size:0.78rem;cursor:pointer;display:flex;align-items:center;gap:4px;opacity:0.85;transition:opacity .15s;"
                    onmouseenter="this.style.opacity='1'" onmouseleave="this.style.opacity='0.85'">
                    <i class="ph ph-plus"></i> Adicionar
                </button>
            </div>`;

        if (lista.length === 0) {
            html += `<div style="text-align:center;padding:1.25rem;color:#94a3b8;border:1px dashed #e2e8f0;border-radius:8px;font-size:0.85rem;">
                Nenhum passo neste grupo ainda.
            </div>`;
        } else {
            html += `<div style="display:flex;flex-direction:column;gap:6px;">`;
            lista.forEach(p => {
                const aStatus = p.ativo ? '' : 'opacity:0.45;';
                const condHtml = p.condicao ? `<span style="font-size:0.73rem;background:#fef9c3;color:#854d0e;padding:2px 7px;border-radius:20px;margin-left:4px;">${INTEG_CONDICAO_LABELS[p.condicao] || p.condicao}</span>` : '';
                html += `<div style="${aStatus}display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:10px 14px;border-radius:8px;background:#fff;border:1px solid #e2e8f0;transition:box-shadow .15s;"
                    onmouseenter="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.07)'" onmouseleave="this.style.boxShadow=''">
                    <div style="display:flex;align-items:flex-start;gap:10px;flex:1;">
                        <span style="background:${gInfo.bg};color:${gInfo.color};min-width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;margin-top:1px;">${p.ordem}</span>
                        <div style="flex:1;">
                            <div style="font-size:0.9rem;font-weight:600;color:#0f172a;">${p.titulo}${condHtml}</div>
                            ${p.descricao ? `<div style="font-size:0.78rem;color:#94a3b8;margin-top:2px;">${p.descricao}</div>` : ''}
                            ${p.responsavel_nome ? `<div style="font-size:0.75rem;color:#64748b;margin-top:3px;"><i class="ph ph-user"></i> ${p.responsavel_nome}</div>` : ''}
                            ${!p.ativo ? '<span style="font-size:0.72rem;color:#94a3b8;">(inativo)</span>' : ''}
                        </div>
                    </div>
                    <div style="display:flex;gap:5px;flex-shrink:0;">
                        <button onclick="window.editarPasso(${p.id})" style="background:#f1f5f9;border:1px solid #e2e8f0;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:0.78rem;color:#334155;display:flex;align-items:center;gap:4px;">
                            <i class="ph ph-pencil-simple"></i> Editar
                        </button>
                        ${p.ativo ? `<button onclick="window.desativarPasso(${p.id})" style="background:#fee2e2;border:1px solid #fecaca;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:0.78rem;color:#dc2626;display:flex;align-items:center;gap:4px;">
                            <i class="ph ph-trash"></i>
                        </button>` : ''}
                    </div>
                </div>`;
            });
            html += `</div>`;
        }
        html += `</div>`;
    });

    container.innerHTML = html;
};

// Mantida para compatibilidade retroativa
window.renderConfIntegTabela = function(passos) {
    window.renderConfIntegSecoes(passos);
};

window.abrirModalNovoPasso = function(grupoInicial) {
    document.getElementById('conf-passo-id').value = '';
    document.getElementById('conf-passo-titulo').value = '';
    document.getElementById('conf-passo-descricao').value = '';
    document.getElementById('conf-passo-grupo').value = grupoInicial || 'todos';
    document.getElementById('conf-passo-condicao').value = '';
    document.getElementById('conf-passo-ordem').value = '0';
    document.getElementById('modal-conf-integ-title').textContent = 'Novo Passo Padrão';

    const selUsuario = document.getElementById('conf-passo-responsavel');
    selUsuario.innerHTML = '<option value="">— Nenhum —</option>';
    _confIntegUsuarios.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = u.nome || u.nome_completo || u.username;
        selUsuario.appendChild(opt);
    });
    selUsuario.value = '';

    const modal = document.getElementById('modal-conf-integ-passo');
    if (modal) { modal.style.display = 'flex'; modal.style.alignItems = 'center'; modal.style.justifyContent = 'center'; }
};

window.fecharModalPasso = function() {
    const modal = document.getElementById('modal-conf-integ-passo');
    if (modal) modal.style.display = 'none';
};

window.editarPasso = function(id) {
    const passo = _confIntegPassos.find(p => p.id === id);
    if (!passo) return;
    document.getElementById('conf-passo-id').value = passo.id;
    document.getElementById('conf-passo-titulo').value = passo.titulo || '';
    document.getElementById('conf-passo-descricao').value = passo.descricao || '';
    document.getElementById('conf-passo-grupo').value = passo.grupo || 'todos';
    document.getElementById('conf-passo-condicao').value = passo.condicao || '';
    document.getElementById('conf-passo-ordem').value = passo.ordem || 0;
    document.getElementById('modal-conf-integ-title').textContent = 'Editar Passo Padrão';

    const selUsuario = document.getElementById('conf-passo-responsavel');
    selUsuario.innerHTML = '<option value="">— Nenhum —</option>';
    _confIntegUsuarios.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = u.nome || u.nome_completo || u.username;
        selUsuario.appendChild(opt);
    });
    selUsuario.value = passo.responsavel_user_id || '';

    const modal = document.getElementById('modal-conf-integ-passo');
    if (modal) modal.style.display = 'flex';
};

window.salvarPasso = async function(e) {
    e.preventDefault();
    const token = window.currentToken || localStorage.getItem('erp_token');
    const id = document.getElementById('conf-passo-id').value;
    const body = {
        id: id ? parseInt(id) : undefined,
        titulo: document.getElementById('conf-passo-titulo').value.trim(),
        descricao: document.getElementById('conf-passo-descricao').value.trim(),
        grupo: document.getElementById('conf-passo-grupo').value,
        condicao: document.getElementById('conf-passo-condicao').value || null,
        responsavel_user_id: document.getElementById('conf-passo-responsavel').value || null,
        ordem: parseInt(document.getElementById('conf-passo-ordem').value) || 0,
        tipo: 'checkbox',
    };
    try {
        const res = await fetch('/api/integracao/config', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao salvar');
        window.fecharModalPasso();
        await window.loadConfIntegPassos();
        if (typeof showToast === 'function') showToast('Passo salvo com sucesso!', 'success');
    } catch(err) {
        alert('Erro ao salvar: ' + err.message);
    }
};

window.desativarPasso = async function(id) {
    if (!confirm('Desativar este passo? Ele não será mais incluído em novos processos de integração.')) return;
    const token = window.currentToken || localStorage.getItem('erp_token');
    try {
        const res = await fetch(`/api/integracao/config/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Erro ao desativar');
        await window.loadConfIntegPassos();
        if (typeof showToast === 'function') showToast('Passo desativado.', 'info');
    } catch(e) {
        alert('Erro: ' + e.message);
    }
};

// ── TAB 2: Templates por Departamento ────────────────────────────────────────
window.loadTemplatesDepto = async function() {
    const lista = document.getElementById('conf-depto-lista');
    if (!lista) return;
    lista.innerHTML = `<div style="text-align:center;padding:3rem;color:#94a3b8;"><i class="ph ph-spinner-gap" style="font-size:2rem;animation:spin 1s linear infinite;"></i></div>`;
    try {
        const token = window.currentToken || localStorage.getItem('erp_token');
        const res = await fetch('/api/integracao/templates', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Erro ao buscar templates');
        _confTemplatesDepto = await res.json();
        window.renderTemplatesDepto(_confTemplatesDepto);
    } catch(e) {
        lista.innerHTML = `<div style="text-align:center;padding:2rem;color:#ef4444;"><i class="ph ph-warning-circle" style="font-size:2rem;"></i><p>${e.message}</p><button onclick="window.loadTemplatesDepto()" style="margin-top:8px;padding:6px 14px;border:none;background:#7c3aed;color:#fff;border-radius:6px;cursor:pointer;">Tentar novamente</button></div>`;
    }
};

window.renderTemplatesDepto = function(templates) {
    const lista = document.getElementById('conf-depto-lista');
    if (!lista) return;

    if (!templates || templates.length === 0) {
        lista.innerHTML = `<div style="text-align:center;padding:4rem;color:#94a3b8;background:#f8fafc;border-radius:12px;border:2px dashed #e2e8f0;">
            <i class="ph ph-buildings" style="font-size:3rem;color:#7c3aed;opacity:0.4;"></i>
            <p style="margin-top:1rem;font-weight:600;font-size:1rem;">Nenhum template por departamento criado.</p>
            <p style="font-size:0.85rem;">Clique em "Novo Template" para criar um template personalizado para um departamento.</p>
        </div>`;
        return;
    }

    lista.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:1rem;">
        ${templates.map(t => {
            const gruposPills = (t.grupos || []).map(g => {
                const gi = INTEG_GRUPOS[g] || { label: g, color: '#64748b', bg: '#f8fafc' };
                return `<span style="font-size:0.72rem;background:${gi.bg};color:${gi.color};padding:2px 8px;border-radius:20px;font-weight:600;">${gi.label}</span>`;
            }).join('');
            return `<div class="card" style="padding:1.25rem;border:1px solid #e2e8f0;border-left:4px solid #7c3aed;transition:box-shadow .2s;"
                onmouseenter="this.style.boxShadow='0 4px 16px rgba(124,58,237,0.1)'" onmouseleave="this.style.boxShadow=''">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:10px;">
                    <div>
                        <div style="font-size:1rem;font-weight:700;color:#0f172a;margin-bottom:4px;">${t.nome}</div>
                        <div style="font-size:0.82rem;color:#64748b;display:flex;align-items:center;gap:5px;">
                            <i class="ph ph-buildings"></i>
                            ${t.departamento_nome ? `<strong>${t.departamento_nome}</strong>` : '<em>Todos os departamentos</em>'}
                        </div>
                        ${t.descricao ? `<div style="font-size:0.8rem;color:#94a3b8;margin-top:5px;">${t.descricao}</div>` : ''}
                    </div>
                    <div style="display:flex;gap:5px;flex-shrink:0;">
                        <button onclick="window.editarTemplateDepto(${t.id})" style="background:#f1f5f9;border:1px solid #e2e8f0;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:0.78rem;color:#334155;display:flex;align-items:center;gap:4px;">
                            <i class="ph ph-pencil-simple"></i> Editar
                        </button>
                        <button onclick="window.excluirTemplateDepto(${t.id}, '${t.nome.replace(/'/g,"\\\'")}')" style="background:#fee2e2;border:1px solid #fecaca;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:0.78rem;color:#dc2626;display:flex;align-items:center;gap:4px;">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px;">
                    ${gruposPills || '<span style="font-size:0.75rem;color:#94a3b8;">Nenhum grupo padrão selecionado</span>'}
                </div>
                <div style="font-size:0.78rem;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:8px;margin-top:4px;">
                    <i class="ph ph-star" style="color:#d97706;"></i> ${t.acoes_count || 0} ação${t.acoes_count !== 1 ? 'ões' : ''} exclusiva${t.acoes_count !== 1 ? 's' : ''}
                </div>
            </div>`;
        }).join('')}
    </div>`;
};

// ── Modal Template por Departamento ──────────────────────────────────────────
window.abrirModalTemplateDepto = function() {
    document.getElementById('td-id').value = '';
    document.getElementById('td-nome').value = '';
    document.getElementById('td-descricao').value = '';
    document.getElementById('modal-td-title').textContent = 'Novo Template de Departamento';

    // Desmarcar todos os checkboxes de grupo
    document.querySelectorAll('input[name="td-grupo"]').forEach(cb => cb.checked = false);

    // Preencher select de departamentos
    const selDepto = document.getElementById('td-departamento');
    selDepto.innerHTML = '<option value="">— Todos os departamentos —</option>';
    _confDeptos.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = d.nome;
        selDepto.appendChild(opt);
    });

    // Limpar ações customizadas
    document.getElementById('td-acoes-lista').innerHTML = '';
    document.getElementById('td-acoes-empty').style.display = 'block';
    _acaoCustomContador = 0;

    const modal = document.getElementById('modal-template-depto');
    if (modal) { modal.style.display = 'flex'; modal.style.alignItems = 'flex-start'; modal.style.justifyContent = 'center'; }
};

window.fecharModalTemplateDepto = function() {
    const modal = document.getElementById('modal-template-depto');
    if (modal) modal.style.display = 'none';
};

window.editarTemplateDepto = async function(id) {
    window.abrirModalTemplateDepto();
    document.getElementById('modal-td-title').textContent = 'Editar Template';
    try {
        const token = window.currentToken || localStorage.getItem('erp_token');
        const res = await fetch(`/api/integracao/templates/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Erro ao carregar template');
        const t = await res.json();

        document.getElementById('td-id').value = t.id;
        document.getElementById('td-nome').value = t.nome || '';
        document.getElementById('td-descricao').value = t.descricao || '';
        document.getElementById('td-departamento').value = t.departamento_id || '';

        // Marcar grupos
        document.querySelectorAll('input[name="td-grupo"]').forEach(cb => {
            cb.checked = (t.grupos || []).includes(cb.value);
        });

        // Carregar ações custom
        document.getElementById('td-acoes-lista').innerHTML = '';
        _acaoCustomContador = 0;
        (t.acoes_custom || []).forEach(a => window.addAcaoCustom(a));

    } catch(e) {
        alert('Erro: ' + e.message);
    }
};

window.excluirTemplateDepto = async function(id, nome) {
    if (!confirm(`Excluir o template "${nome}"? Esta ação não pode ser desfeita.`)) return;
    const token = window.currentToken || localStorage.getItem('erp_token');
    try {
        const res = await fetch(`/api/integracao/templates/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Erro ao excluir');
        await window.loadTemplatesDepto();
        if (typeof showToast === 'function') showToast('Template excluído.', 'info');
    } catch(e) {
        alert('Erro: ' + e.message);
    }
};

window.addAcaoCustom = function(acao) {
    const idx = ++_acaoCustomContador;
    const lista = document.getElementById('td-acoes-lista');
    const empty = document.getElementById('td-acoes-empty');
    if (empty) empty.style.display = 'none';

    const div = document.createElement('div');
    div.id = `acao-custom-${idx}`;
    div.style.cssText = 'background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:8px;';
    div.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <span style="font-size:0.78rem;font-weight:600;color:#7c3aed;"><i class="ph ph-star"></i> Ação #${idx}</span>
            <button type="button" onclick="window.removerAcaoCustom(${idx})" style="background:#fee2e2;border:none;color:#dc2626;border-radius:6px;width:26px;height:26px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:0.85rem;">
                <i class="ph ph-x"></i>
            </button>
        </div>
        <input type="text" id="acao-titulo-${idx}" placeholder="Título da ação *" value="${acao ? (acao.titulo || '') : ''}"
            style="width:100%;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.88rem;box-sizing:border-box;">
        <textarea id="acao-descricao-${idx}" rows="2" placeholder="Descrição (opcional)"
            style="width:100%;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.85rem;resize:vertical;box-sizing:border-box;">${acao ? (acao.descricao || '') : ''}</textarea>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <select id="acao-responsavel-${idx}" style="padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.85rem;">
                <option value="">— Responsável —</option>
                ${_confIntegUsuarios.map(u => `<option value="${u.id}" ${acao && acao.responsavel_user_id == u.id ? 'selected' : ''}>${u.nome || u.username}</option>`).join('')}
            </select>
            <select id="acao-condicao-${idx}" style="padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.85rem;">
                <option value="" ${acao && !acao.condicao ? 'selected' : ''}>Sem condição</option>
                <option value="vt" ${acao && acao.condicao === 'vt' ? 'selected' : ''}>Somente VT</option>
                <option value="vc" ${acao && acao.condicao === 'vc' ? 'selected' : ''}>Somente VC</option>
            </select>
        </div>
        <input type="hidden" id="acao-ordem-${idx}" value="${acao ? (acao.ordem || idx) : idx}">
    `;
    lista.appendChild(div);
};

window.removerAcaoCustom = function(idx) {
    const el = document.getElementById(`acao-custom-${idx}`);
    if (el) el.remove();
    // Mostrar empty se não houver mais ações
    if (document.getElementById('td-acoes-lista').children.length === 0) {
        document.getElementById('td-acoes-empty').style.display = 'block';
    }
};

window.salvarTemplateDepto = async function(e) {
    e.preventDefault();
    const token = window.currentToken || localStorage.getItem('erp_token');

    // Coletar grupos
    const grupos = [];
    document.querySelectorAll('input[name="td-grupo"]:checked').forEach(cb => grupos.push(cb.value));

    // Coletar ações customizadas
    const acoes_custom = [];
    let ordem = 1;
    for (let i = 1; i <= _acaoCustomContador; i++) {
        const tituloEl = document.getElementById(`acao-titulo-${i}`);
        if (!tituloEl) continue;
        const titulo = tituloEl.value.trim();
        if (!titulo) continue;
        acoes_custom.push({
            titulo,
            descricao: (document.getElementById(`acao-descricao-${i}`)?.value || '').trim(),
            responsavel_user_id: document.getElementById(`acao-responsavel-${i}`)?.value || null,
            condicao: document.getElementById(`acao-condicao-${i}`)?.value || null,
            ordem: ordem++,
        });
    }

    const body = {
        id: document.getElementById('td-id').value || undefined,
        nome: document.getElementById('td-nome').value.trim(),
        departamento_id: document.getElementById('td-departamento').value || null,
        descricao: document.getElementById('td-descricao').value.trim(),
        grupos,
        acoes_custom,
    };

    if (!body.nome) return alert('Informe o nome do template.');

    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner-gap" style="animation:spin 1s linear infinite;"></i> Salvando...'; }

    try {
        const res = await fetch('/api/integracao/templates', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao salvar');
        window.fecharModalTemplateDepto();
        await window.loadTemplatesDepto();
        if (typeof showToast === 'function') showToast('Template salvo com sucesso!', 'success');
    } catch(err) {
        alert('Erro ao salvar: ' + err.message);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar Template'; }
    }
};

// ── Integrar com o hook de navegação ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const _origNavigateTo = window.navigateTo;
    window.navigateTo = function(target, ...args) {
        if (typeof _origNavigateTo === 'function') _origNavigateTo(target, ...args);
        if (target === 'integracao') {
            setTimeout(() => window.loadIntegracaoProcessos(), 150);
        }
        if (target === 'conf-integracao') {
            setTimeout(() => window.loadConfIntegracao(), 150);
        }
    };

    document.querySelectorAll('.nav-item[data-target="integracao"]').forEach(el => {
        el.addEventListener('click', () => setTimeout(() => window.loadIntegracaoProcessos(), 200));
    });
    document.querySelectorAll('.nav-item[data-target="conf-integracao"]').forEach(el => {
        el.addEventListener('click', () => setTimeout(() => window.loadConfIntegracao(), 200));
    });
});

// CSS de animação
(function addSpinCSS() {
    if (document.getElementById('integ-spin-style')) return;
    const style = document.createElement('style');
    style.id = 'integ-spin-style';
    style.textContent = `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        #td-grupos-checkboxes label:hover { background: #f5f3ff; border-color: #c4b5fd; }
        #td-grupos-checkboxes label:has(input:checked) { background: #f5f3ff; border-color: #7c3aed; }
    `;
    document.head.appendChild(style);
})();

// Compatibilidade retroativa
window.loadIntegracaoColabs = async function () {
    if (typeof window.loadIntegracaoProcessos === 'function') window.loadIntegracaoProcessos();
};
window.filtrarConfIntegGrupo = function(grupo) {
    const filtrado = grupo ? _confIntegPassos.filter(p => p.grupo === grupo) : _confIntegPassos;
    window.renderConfIntegSecoes(filtrado);
};
