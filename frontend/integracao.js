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

// ── Badge de notificações ─────────────────────────────────────────────────────
window.atualizarBadgeIntegracao = async function() {
    try {
        const token = window.currentToken || localStorage.getItem('erp_token');
        const res = await fetch('/api/integracao/notificacoes/count', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        const badge = document.getElementById('integracao-badge');
        if (!badge) return;
        if (data.count > 0) {
            badge.textContent = data.count > 99 ? '99+' : data.count;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
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
        // Recarregar o modal
        await window.abrirProcessoIntegracao(processoId);
        // Atualizar lista e badge
        await window.loadIntegracaoProcessos();
        if (typeof showToast === 'function') {
            const msgs = { feito: '✅ Atividade marcada como feita!', nao_aplica: 'Atividade marcada como não aplicável.', pendente: 'Atividade reaberta.' };
            showToast(msgs[status] || 'Atualizado!', status === 'feito' ? 'success' : 'info');
        }
    } catch(e) {
        alert('Erro ao atualizar: ' + e.message);
    }
};

// ── Configuração: Conf. Integra. ──────────────────────────────────────────────
window.loadConfIntegracao = async function() {
    await Promise.all([
        window.loadConfIntegPassos(),
        window.loadConfIntegUsuarios(),
    ]);
};

window.loadConfIntegPassos = async function() {
    const tbody = document.getElementById('conf-integ-tbody');
    if (!tbody) return;
    try {
        const token = window.currentToken || localStorage.getItem('erp_token');
        const res = await fetch('/api/integracao/config/all', { headers: { 'Authorization': `Bearer ${token}` } });
        _confIntegPassos = await res.json();
        window.renderConfIntegTabela(_confIntegPassos);
    } catch(e) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="color:#ef4444;text-align:center;padding:1rem;">Erro: ${e.message}</td></tr>`;
    }
};

window.loadConfIntegUsuarios = async function() {
    try {
        const token = window.currentToken || localStorage.getItem('erp_token');
        const res = await fetch('/api/usuarios', { headers: { 'Authorization': `Bearer ${token}` } });
        _confIntegUsuarios = (await res.json()) || [];
    } catch(e) {}
};

window.filtrarConfIntegGrupo = function(grupo) {
    const filtrado = grupo ? _confIntegPassos.filter(p => p.grupo === grupo) : _confIntegPassos;
    window.renderConfIntegTabela(filtrado);
};

const INTEG_CONDICAO_LABELS = { vt: 'Somente VT', vc: 'Somente VC' };

window.renderConfIntegTabela = function(passos) {
    const tbody = document.getElementById('conf-integ-tbody');
    if (!tbody) return;
    if (!passos || passos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:#94a3b8;">Nenhum passo encontrado.</td></tr>`;
        return;
    }
    const gruposMap = INTEG_GRUPOS;
    tbody.innerHTML = passos.map(p => {
        const g = gruposMap[p.grupo] || { label: p.grupo, color: '#64748b', bg: '#f8fafc' };
        const aStatus = p.ativo ? '' : 'opacity:0.5;';
        return `<tr style="${aStatus}border-bottom:1px solid #f1f5f9;">
            <td style="padding:10px 12px;text-align:center;color:#64748b;font-size:0.85rem;">${p.ordem}</td>
            <td style="padding:10px 12px;">
                <div style="font-weight:600;font-size:0.9rem;color:#0f172a;">${p.titulo}</div>
                ${p.descricao ? `<div style="font-size:0.78rem;color:#94a3b8;margin-top:2px;">${p.descricao}</div>` : ''}
                ${!p.ativo ? '<span style="font-size:0.73rem;color:#94a3b8;">(inativo)</span>' : ''}
            </td>
            <td style="padding:10px 12px;">
                <span style="font-size:0.78rem;background:${g.bg};color:${g.color};padding:3px 8px;border-radius:20px;font-weight:600;">${g.label}</span>
            </td>
            <td style="padding:10px 12px;font-size:0.83rem;color:#64748b;">${p.condicao ? (INTEG_CONDICAO_LABELS[p.condicao] || p.condicao) : '—'}</td>
            <td style="padding:10px 12px;font-size:0.83rem;color:#334155;">${p.responsavel_nome || '<span style="color:#94a3b8">—</span>'}</td>
            <td style="padding:10px 12px;">
                <div style="display:flex;gap:6px;">
                    <button onclick="window.editarPasso(${p.id})" style="background:#f1f5f9;border:1px solid #e2e8f0;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:0.78rem;color:#334155;display:flex;align-items:center;gap:4px;">
                        <i class="ph ph-pencil-simple"></i> Editar
                    </button>
                    ${p.ativo ? `<button onclick="window.desativarPasso(${p.id})" style="background:#fee2e2;border:1px solid #fecaca;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:0.78rem;color:#dc2626;display:flex;align-items:center;gap:4px;">
                        <i class="ph ph-trash"></i>
                    </button>` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');
};

window.abrirModalNovoPasso = function() {
    document.getElementById('conf-passo-id').value = '';
    document.getElementById('conf-passo-titulo').value = '';
    document.getElementById('conf-passo-descricao').value = '';
    document.getElementById('conf-passo-grupo').value = 'todos';
    document.getElementById('conf-passo-condicao').value = '';
    document.getElementById('conf-passo-ordem').value = '0';
    document.getElementById('modal-conf-integ-title').textContent = 'Novo Passo';

    // Preencher select de usuários
    const selUsuario = document.getElementById('conf-passo-responsavel');
    selUsuario.innerHTML = '<option value="">— Nenhum (sem responsável) —</option>';
    _confIntegUsuarios.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = u.nome_completo || u.username;
        selUsuario.appendChild(opt);
    });
    selUsuario.value = '';

    const modal = document.getElementById('modal-conf-integ-passo');
    if (modal) { modal.style.display = 'flex'; }
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
    document.getElementById('modal-conf-integ-title').textContent = 'Editar Passo';

    const selUsuario = document.getElementById('conf-passo-responsavel');
    selUsuario.innerHTML = '<option value="">— Nenhum (sem responsável) —</option>';
    _confIntegUsuarios.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = u.nome_completo || u.username;
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

// ── Integrar com o hook de navegação ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Monkeypatch navigateTo to hook integration pages
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

    // Também interceptar clicks de nav-item
    document.querySelectorAll('.nav-item[data-target="integracao"]').forEach(el => {
        el.addEventListener('click', () => setTimeout(() => window.loadIntegracaoProcessos(), 200));
    });
    document.querySelectorAll('.nav-item[data-target="conf-integracao"]').forEach(el => {
        el.addEventListener('click', () => setTimeout(() => window.loadConfIntegracao(), 200));
    });
});

// Adicionar CSS para spin animation se não existir
(function addSpinCSS() {
    if (document.getElementById('integ-spin-style')) return;
    const style = document.createElement('style');
    style.id = 'integ-spin-style';
    style.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
    document.head.appendChild(style);
})();
