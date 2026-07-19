// =============================================================================
// MÓDULO DE INTEGRAÇÃO DE COLABORADORES
// =============================================================================

const INTEG_STATUS = {
    pendente:   { label: 'Pendente',        color: '#f59e0b', bg: '#fffbeb', icon: 'ph-clock' },
    feito:      { label: 'Feito',           color: '#059669', bg: '#ecfdf5', icon: 'ph-check-circle' },
    nao_aplica: { label: 'Não se aplica',   color: '#94a3b8', bg: '#f8fafc', icon: 'ph-x-circle' },
};

let _integProcessosData = [];
let _integFiltroStatus = 'todos';

// Dados de Configuração (Templates)
let ciTemplates = [];
let ciEditingId = null;
let ciUsuarios = [];
let ciDeptos = [];
let ciTreinamentos = [];

// ── Badge ─────────────────────────────────────────────────────────────────────
window.atualizarBadgeIntegracao = async function() {
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        if (!token) return;
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
    lista.innerHTML = `<div style="text-align:center;padding:3rem;color:#94a3b8;"><i class="ph ph-spinner-gap ph-spin" style="font-size:2rem;"></i><p style="margin-top:.5rem;">Carregando...</p></div>`;
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
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

window.abrirProcessoIntegracao = async function(processoId) {
    const modal = document.getElementById('modal-integracao-processo');
    if (!modal) return;
    modal.style.display = 'block';
    document.getElementById('modal-integ-nome').textContent = 'Carregando...';
    document.getElementById('modal-integ-cargo').textContent = '';
    document.getElementById('modal-integ-badges').innerHTML = '';
    document.getElementById('modal-integ-passos-container').innerHTML = `<div style="text-align:center;padding:2rem;color:#94a3b8;"><i class="ph ph-spinner-gap ph-spin" style="font-size:1.5rem;"></i></div>`;
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch(`/api/integracao/processos/${processoId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Erro ao buscar processo');
        const data = await res.json();
        if (data.status === 'pendente') { await fetch(`/api/integracao/processos/${processoId}/iniciar`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } }); window.atualizarBadgeIntegracao(); }
        document.getElementById('modal-integ-nome').textContent = data.nome_completo || '';
        document.getElementById('modal-integ-cargo').textContent = `${data.cargo||''} · ${data.departamento||''}`;
        const badges = [];
        if (data.tipo_departamento) badges.push(`<span style="background:rgba(255,255,255,.2);padding:3px 10px;border-radius:20px;font-size:.78rem;">${data.tipo_departamento}</span>`);
        document.getElementById('modal-integ-badges').innerHTML = badges.join('');
        
        const passos = data.passos || [];
        let html = '';
        if (passos.length === 0) {
            html = `<div style="text-align:center;padding:2rem;color:#94a3b8;"><i class="ph ph-clipboard-text" style="font-size:2rem;"></i><p style="margin-top:.5rem;">Nenhum passo configurado.</p></div>`;
        } else {
            passos.forEach(p => {
                const stInfo = INTEG_STATUS[p.status]||INTEG_STATUS.pendente; const isPendente = p.status==='pendente';
                html += `<div id="passo-row-${p.id}" style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:10px;margin-bottom:6px;background:${stInfo.bg};border:1px solid ${stInfo.color}30;transition:all .2s;">
                    <div style="padding-top:2px;"><i class="ph ${stInfo.icon}" style="color:${stInfo.color};font-size:1.2rem;"></i></div>
                    <div style="flex:1;"><div style="font-size:.9rem;font-weight:${isPendente?'600':'400'};color:${isPendente?'#0f172a':'#94a3b8'};${p.status==='feito'?'text-decoration:line-through;':''}">${p.titulo}</div>${p.descricao?`<div style="font-size:.78rem;color:#94a3b8;margin-top:2px;">${p.descricao}</div>`:''} ${p.responsavel_nome?`<div style="font-size:.75rem;color:#64748b;margin-top:3px;"><i class="ph ph-user"></i> ${p.responsavel_nome}</div>`:''} ${p.feito_em?`<div style="font-size:.73rem;color:#059669;margin-top:2px;"><i class="ph ph-check"></i> Feito em ${new Date(p.feito_em).toLocaleDateString('pt-BR')}</div>`:''}</div>
                    <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;">${isPendente?`<button onclick="window.marcarPassoInteg(${p.id},${processoId},'feito')" style="background:#059669;color:#fff;border:none;padding:5px 10px;border-radius:8px;font-size:.78rem;cursor:pointer;display:flex;align-items:center;gap:4px;white-space:nowrap;"><i class="ph ph-check"></i> Marcar Feito</button><button onclick="window.marcarPassoInteg(${p.id},${processoId},'nao_aplica')" style="background:none;color:#94a3b8;border:1px solid #e2e8f0;padding:4px 10px;border-radius:8px;font-size:.75rem;cursor:pointer;white-space:nowrap;"><i class="ph ph-x"></i> Não se aplica</button>`:p.status!=='pendente'?`<button onclick="window.marcarPassoInteg(${p.id},${processoId},'pendente')" style="background:none;color:#94a3b8;border:1px solid #e2e8f0;padding:4px 10px;border-radius:8px;font-size:.75rem;cursor:pointer;white-space:nowrap;">Desfazer</button>`:''}</div>
                </div>`;
            });
        }
        document.getElementById('modal-integ-passos-container').innerHTML = html;
    } catch(e) {
        document.getElementById('modal-integ-passos-container').innerHTML = `<div style="color:#ef4444;text-align:center;padding:2rem;">Erro: ${e.message}</div>`;
    }
};

window.marcarPassoInteg = async function(passoStatusId, processoId, status) {
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    try {
        const res = await fetch(`/api/integracao/passos-status/${passoStatusId}`, { method:'PUT', headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'}, body:JSON.stringify({status}) });
        if (!res.ok) { const d=await res.json(); throw new Error(d.error||'Erro'); }
        await window.abrirProcessoIntegracao(processoId);
        await window.loadIntegracaoProcessos();
        if (typeof showToast==='function') { const msgs={feito:'✅ Atividade marcada como feita!',nao_aplica:'Marcado como não aplicável.',pendente:'Reaberto.'}; showToast(msgs[status]||'Atualizado!',status==='feito'?'success':'info'); }
    } catch(e) { alert('Erro: '+e.message); }
};

// =============================================================================
// CONF. INTEGRAÇÃO — TEMPLATES POR TIPO DE COLABORADOR
// =============================================================================

window.loadConfIntegracao = async function() {
    const container = document.getElementById('conf-integ-container');
    if (!container) return;
    container.innerHTML = `<div style="padding:3rem;text-align:center;color:#94a3b8;"><i class="ph ph-spinner-gap ph-spin" style="font-size:2rem;"></i><p style="margin-top:.75rem;">Carregando templates...</p></div>`;
    
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const [tplRes, uRes, dRes, trRes] = await Promise.all([
            fetch('/api/integ/templates', { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/usuarios',        { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/departamentos',   { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/treinamentos',    { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (tplRes.ok) ciTemplates = await tplRes.json();
        if (uRes.ok) ciUsuarios = await uRes.json();
        if (dRes.ok) ciDeptos = await dRes.json();
        if (trRes.ok) ciTreinamentos = await trRes.json();

        window.renderConfIntegLista();
    } catch (e) {
        container.innerHTML = `<div style="padding:2rem;text-align:center;color:#ef4444;"><i class="ph ph-warning-circle" style="font-size:2rem;"></i><p>${e.message}</p></div>`;
    }
};

window.renderConfIntegLista = function() {
    const container = document.getElementById('conf-integ-container');
    if (!container) return;

    let cardsHtml = '';
    if (ciTemplates.length === 0) {
        cardsHtml = `<div style="grid-column: 1/-1; background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:12px;padding:3rem;text-align:center;color:#94a3b8;">
            <i class="ph ph-cards" style="font-size:3rem;display:block;margin-bottom:1rem;"></i>
            <h3 style="margin:0 0 0.5rem;color:#475569;">Nenhum Template Criado</h3>
            <p style="margin:0 0 1.5rem;font-size:0.9rem;">Crie templates de integração para definir as ações padrão por tipo de colaborador.</p>
            <button onclick="window.ciAbrirFormNovo()" style="background:#0f4c81;color:#fff;border:none;padding:0.6rem 1.4rem;border-radius:8px;font-weight:600;cursor:pointer;"><i class="ph ph-plus"></i> Criar Primeiro Template</button>
        </div>`;
    } else {
        cardsHtml = ciTemplates.map(t => {
            return `
            <div style="background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,0.05);transition:box-shadow 0.2s;" onmouseover="this.style.boxShadow='0 6px 20px rgba(0,0,0,0.1)'" onmouseout="this.style.boxShadow='0 2px 6px rgba(0,0,0,0.05)'">
                <div style="background:#eff6ff;border-bottom:1.5px solid #e2e8f0;padding:1.2rem;display:flex;justify-content:space-between;align-items:flex-start;">
                    <div>
                        <h3 style="margin:0 0 4px;font-weight:700;color:#0f172a;font-size:1.1rem;">${t.nome}</h3>
                        <span style="font-size:0.75rem;color:#64748b;">Chave (Tipo): <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;">${t.tipo_key}</code></span>
                    </div>
                    <div style="display:flex;gap:0.5rem;">
                        <button onclick="window.ciAbrirFormEditar(${t.id})" title="Editar" style="background:#0f4c81;color:#fff;border:none;width:36px;height:36px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1rem;transition:opacity 0.2s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'"><i class="ph ph-pencil-simple"></i></button>
                        <button onclick="window.ciExcluirTemplate(${t.id},'${t.nome.replace(/'/g, "\\'")}')" title="Excluir" style="background:#ef4444;color:#fff;border:none;width:36px;height:36px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1rem;transition:opacity 0.2s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'"><i class="ph ph-trash"></i></button>
                    </div>
                </div>
                <div style="padding:1rem 1.2rem;">
                    <p style="margin:0 0 0.5rem;font-size:0.85rem;color:#475569;">${t.descricao || '<em>Sem descrição</em>'}</p>
                    <div style="display:flex;align-items:center;gap:0.5rem;margin-top:1rem;padding-top:0.5rem;border-top:1px solid #f1f5f9;">
                        
<div style="width:100%;">
    <span style="background:#e0f2fe;color:#0369a1;font-size:0.8rem;padding:3px 10px;border-radius:999px;font-weight:600;display:inline-block;margin-bottom:0.8rem;"><i class="ph ph-list-checks"></i> ${t.total_acoes || 0} ações configuradas</span>
    ${(() => {
        try {
            const acoes = JSON.parse(t.acoes_json || '[]');
            if (acoes.length === 0) return '';
            let html = '<ul style="list-style-type:none;padding:0;margin:0;font-size:0.75rem;color:#475569;display:grid;gap:4px;">';
            acoes.slice(0, 5).forEach(a => {
                const groupBadge = a.grupo ? `<span style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:4px;padding:1px 4px;font-size:0.65rem;margin-right:4px;">${a.grupo}</span>` : '';
                html += `<li style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"><i class="ph ph-check" style="color:#10b981;"></i> ${groupBadge}${a.titulo}</li>`;
            });
            if (acoes.length > 5) html += `<li style="color:#94a3b8;font-style:italic;">+ ${acoes.length - 5} outras ações...</li>`;
            html += '</ul>';
            return html;
        } catch(e) { return ''; }
    })()}
</div>

                    </div>
                </div>
            </div>`;
        }).join('');
    }

    container.innerHTML = `
        <div style="padding:1.5rem;">
            <!-- CABEÇALHO DA TELA -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
                <div style="display:flex;align-items:center;gap:1rem;">
                    <div style="width:56px;height:56px;border-radius:12px;background:linear-gradient(135deg,#0f4c81,#1d6fb8);display:flex;align-items:center;justify-content:center;">
                        <i class="ph ph-cards" style="font-size:1.8rem;color:#fff;"></i>
                    </div>
                    <div>
                        <h2 style="margin:0;font-size:1.4rem;color:#0f172a;">Templates de Integração</h2>
                        <p style="margin:2px 0 0;color:#64748b;font-size:0.85rem;">Defina os planos de integração por tipo de colaborador</p>
                    </div>
                </div>
                <div style="display:flex; gap:0.75rem; align-items:center;">
                    <button onclick="window.ciAbrirFormNovo()" style="background:linear-gradient(135deg,#0f4c81,#1d6fb8);color:#fff;border:none;padding:0.65rem 1.4rem;border-radius:8px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:0.5rem;font-size:0.95rem;box-shadow:0 4px 12px rgba(15,76,129,0.35);transition:transform 0.1s;" onmousedown="this.style.transform='scale(0.97)'" onmouseup="this.style.transform='scale(1)'">
                        <i class="ph ph-plus-circle"></i> Novo Template
                    </button>
                </div>
            </div>

            <!-- AVISO INFORMATIVO -->
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:0.9rem 1.2rem;margin-bottom:1.5rem;display:flex;align-items:flex-start;gap:0.75rem;">
                <i class="ph ph-info" style="color:#3b82f6;font-size:1.3rem;flex-shrink:0;margin-top:1px;"></i>
                <div style="font-size:0.87rem;color:#1e3a5f;line-height:1.5;">
                    <strong>Como funciona:</strong> Crie templates para os tipos de departamento (ex: Administrativo, Operacional). 
                    A chave <code>tipo_key</code> faz a ligação automática quando um novo colaborador é admitido. 
                    Você pode configurar quem é responsável por cada ação e para quais departamentos específicos ela se aplica.
                </div>
            </div>

            <!-- GRID DE TEMPLATES -->
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:1.5rem;">
                ${cardsHtml}
            </div>
        </div>
    `;
};

// ============================================================
// FORMULÁRIO DE CRIAÇÃO/EDIÇÃO
// ============================================================

window.ciAbrirFormNovo = function () {
    ciEditingId = null;
    renderCiForm({ nome: '', tipo_key: '', descricao: '', acoes: [] });
};

window.ciAbrirFormEditar = async function (id) {
    const container = document.getElementById('conf-integ-container');
    container.innerHTML = `<div style="padding:3rem;text-align:center;color:#94a3b8;"><i class="ph ph-spinner-gap ph-spin" style="font-size:2rem;"></i><p>Carregando template...</p></div>`;
    
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch(`/api/integ/templates/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Erro ao carregar template');
        const t = await res.json();
        ciEditingId = id;
        renderCiForm(t);
    } catch(e) {
        alert('Erro: ' + e.message);
        window.renderConfIntegLista();
    }
};

function renderCiForm(template) {
    const container = document.getElementById('conf-integ-container');
    const acoes = template.acoes || [];
    const tipoTemplate = (template.tipo_key || 'todos').toLowerCase();

    // 1. Filtrar Departamentos pelo tipo do template
    let deptosFiltrados = ciDeptos;
    if (tipoTemplate !== 'todos') {
        deptosFiltrados = ciDeptos.filter(d => (d.tipo || '').toLowerCase() === tipoTemplate);
    }

    // Remover duplicatas de ciUsuarios e criar options com prefixo user_
    const unicos = [];
    const nomesVistos = new Set();
    for (const u of ciUsuarios) {
        const n = (u.nome || u.username).trim();
        if (!nomesVistos.has(n)) {
            nomesVistos.add(n);
            unicos.push(u);
        }
    }
    const userOpts = unicos.map(u => `<option value="user_${u.id}">${u.nome||u.username}</option>`).join('');
    
    // Criar options para departamentos com prefixo depto_
    const deptOpts = ciDeptos.map(d => `<option value="depto_${d.id}">${d.nome}</option>`).join('');
    
    const baseUOpts = `
        <optgroup label="Colaboradores Específicos">
            ${userOpts}
        </optgroup>
        <optgroup label="Dinâmicos">
<option value="depto_-1">Gestor do Departamento do Colaborador</option>
</optgroup>
<optgroup label="Responsáveis de Departamentos">
            ${deptOpts}
        </optgroup>
    `;
    const uOpts = `<option value="">— Nenhum (RH/Geral) —</option>` + baseUOpts;
    window._ciUOpts_raw = baseUOpts;
    
    const treinInteg = ciTreinamentos.filter(t => t.is_integracao);
    window._ciTreinOpts = `<option value="">Nenhum</option>` + treinInteg.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');

    const deptoCbsHtml = deptosFiltrados.map(d => `<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:0.8rem;white-space:nowrap;"><input type="checkbox" value="${d.id}" class="ci-depto-chk" onchange="window.ciSyncDeptos(this)"> ${d.nome}</label>`).join('');

    container.innerHTML = `
        <div style="padding:1.5rem; max-width: 100%; margin: 0 auto;">
            <!-- CABEÇALHO DO FORM -->
            <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;">
                <button onclick="window.renderConfIntegLista()" style="background:#f1f5f9;border:none;color:#475569;padding:0.5rem 1rem;border-radius:8px;cursor:pointer;font-weight:600;display:flex;align-items:center;gap:0.5rem;">
                    <i class="ph ph-arrow-left"></i> Voltar
                </button>
                <h2 style="margin:0;font-size:1.3rem;color:#0f172a;">${ciEditingId ? 'Editar Template de Integração' : 'Novo Template de Integração'}</h2>
            </div>

            <!-- DADOS DO TEMPLATE -->
            <div style="background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;padding:1.5rem;margin-bottom:1.5rem;box-shadow:0 2px 4px rgba(0,0,0,0.02);">
                <div style="display:grid;grid-template-columns:2fr 1fr;gap:1rem;margin-bottom:1rem;">
                    <div>
                        <label style="display:block;font-weight:600;font-size:0.85rem;color:#374151;margin-bottom:4px;">Nome do Template *</label>
                        <input id="ci-nome" type="text" value="${(template.nome || '').replace(/"/g, '&quot;')}" placeholder="Ex: Integração Administrativo" style="width:100%;padding:0.6rem 0.8rem;border:1.5px solid #d1d5db;border-radius:8px;font-size:0.9rem;outline:none;" onfocus="this.style.borderColor='#0f4c81'" onblur="this.style.borderColor='#d1d5db'">
                    </div>
                    <div>
                        <label style="display:block;font-weight:600;font-size:0.85rem;color:#374151;margin-bottom:4px;">Tipo (Chave) *</label>
                        <input id="ci-tipo_key" type="text" value="${(template.tipo_key || '').replace(/"/g, '&quot;')}" placeholder="Ex: administrativo" style="width:100%;padding:0.6rem 0.8rem;border:1.5px solid #d1d5db;border-radius:8px;font-size:0.9rem;outline:none;" onfocus="this.style.borderColor='#0f4c81'" onblur="this.style.borderColor='#d1d5db'">
                    </div>
                </div>
                <div>
                    <label style="display:block;font-weight:600;font-size:0.85rem;color:#374151;margin-bottom:4px;">Descrição</label>
                    <input id="ci-descricao" type="text" value="${(template.descricao || '').replace(/"/g, '&quot;')}" placeholder="Descrição breve deste template" style="width:100%;padding:0.6rem 0.8rem;border:1.5px solid #d1d5db;border-radius:8px;font-size:0.9rem;outline:none;" onfocus="this.style.borderColor='#0f4c81'" onblur="this.style.borderColor='#d1d5db'">
                </div>
            </div>

            <!-- HEADER DE AÇÕES -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:1rem;">
                <h3 style="margin:0;font-size:1.1rem;color:#0f172a;"><i class="ph ph-list-checks" style="color:#0f4c81;"></i> Ações do Template</h3>
                <div style="display:flex;align-items:center;gap:0.75rem;">
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:0.3rem 0.5rem;display:flex;align-items:center;gap:0.5rem;">
                        <i class="ph ph-funnel" style="color:#64748b;"></i>
                        <select id="ci-filtro-depto" onchange="window.ciFiltrarAcoesPorDepto()" style="border:none;background:transparent;font-size:0.85rem;color:#475569;outline:none;width:200px;">
                            <option value="todos">— Filtrar Departamentos —</option>
                            ${deptosFiltrados.map(d => `<option value="${d.id}">${d.nome}</option>`).join('')}
                        </select>
                    </div>
                    <button type="button" onclick="window.ciAdicionarGrupo(null)" style="background:#e0f2fe;color:#0369a1;border:none;padding:0.5rem 1rem;border-radius:8px;cursor:pointer;font-weight:600;display:flex;align-items:center;gap:0.5rem;font-size:0.85rem;transition:background 0.2s;" onmouseover="this.style.background='#bae6fd'" onmouseout="this.style.background='#e0f2fe'">
                        <i class="ph ph-folder-plus"></i> Adicionar Grupo
                    </button>
                </div>
            </div>

            <div id="ci-grupos-container">
                <!-- Grupos serão inseridos aqui -->
            </div>
            <div id="ci-empty-acoes" style="text-align:center;padding:2rem;color:#94a3b8;border:2px dashed #e2e8f0;border-radius:12px; display:none;">Nenhum grupo adicionado. Clique em "Adicionar Grupo".</div>

            <!-- BOTÕES DE SALVAR -->
            <div style="display:flex;justify-content:flex-end;gap:1rem;margin-top:2rem;padding-top:1.5rem;border-top:1.5px solid #e2e8f0;">
                <button onclick="window.renderConfIntegLista()" style="background:#f1f5f9;border:none;color:#475569;padding:0.65rem 1.5rem;border-radius:8px;cursor:pointer;font-weight:600;">
                    Cancelar
                </button>
                <button onclick="window.ciSalvarTemplate()" style="background:linear-gradient(135deg,#0f4c81,#1d6fb8);color:#fff;border:none;padding:0.65rem 1.8rem;border-radius:8px;cursor:pointer;font-weight:700;display:flex;align-items:center;gap:0.6rem;font-size:0.95rem;box-shadow:0 4px 12px rgba(15,76,129,0.3);">
                    <i class="ph ph-floppy-disk"></i> Salvar Template
                </button>
            </div>
        </div>
    `;

    window._ciUOpts = uOpts;
    window._ciDeptoCbs = deptoCbsHtml;

    // Agrupar ações existentes
    const mapGrupos = new Map();
    acoes.forEach(a => {
        const gName = a.grupo || 'Geral';
        if (!mapGrupos.has(gName)) mapGrupos.set(gName, []);
        mapGrupos.get(gName).push(a);
    });

    const gruposContainer = document.getElementById('ci-grupos-container');
    if (mapGrupos.size === 0) {
        window.ciCheckEmpty();
    } else {
        mapGrupos.forEach((acts, gName) => {
            const firstWithGrpResp = acts.find(a => a.grupo_responsavel_user_id || a.grupo_responsavel_depto_id);
            const gResp = firstWithGrpResp ? (firstWithGrpResp.grupo_responsavel_user_id ? 'user_' + firstWithGrpResp.grupo_responsavel_user_id : 'depto_' + firstWithGrpResp.grupo_responsavel_depto_id) : null;
            const grpEl = window.ciAdicionarGrupo(gName, false, gResp);
            acts.forEach(a => {
                window.ciAdicionarAcaoNoGrupo(grpEl, a);
            });
        });
    }
    
    window.ciAtualizarNumeracao();
}

window.ciAdicionarGrupo = function(nome, updateNum = true, respId = null) {
    if (!nome || typeof nome !== 'string') nome = '';
    const container = document.getElementById('ci-grupos-container');
    const div = document.createElement('div');
    div.className = 'ci-grupo-block';
    div.style.cssText = 'background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:1.2rem; margin-bottom:1.5rem; box-shadow:0 1px 3px rgba(0,0,0,0.05);';
    
    div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; padding-bottom:0.8rem; border-bottom:1px solid #e2e8f0;">
            <div style="display:flex; align-items:center; gap:0.5rem; flex:1;">
                <input type="text" class="cig-num" onchange="window.ciReordenarGrupoPorInput(this)" style="background:#0f4c81; color:#fff; font-weight:700; font-size:1rem; padding:4px 10px; border-radius:6px; width:45px; text-align:center; border:none; outline:none;">
                <input type="text" class="cig-nome" value="${nome.replace(/"/g, '&quot;')}" placeholder="Nome do Grupo (Ex: Treinamentos)" ${nome.toLowerCase().includes('treinamentos') ? 'readonly' : ''} style="flex:1; max-width:400px; padding:0.5rem; border:1px solid #cbd5e1; border-radius:6px; font-size:1rem; font-weight:600; outline:none; ${nome.toLowerCase().includes('treinamentos') ? 'background:#e2e8f0; color:#475569; border-color:#cbd5e1;' : ''}" onfocus="if(!this.readOnly) this.style.borderColor='#0f4c81'" onblur="if(!this.readOnly) this.style.borderColor='#d1d5db'">
            </div>
            <div style="display:flex; align-items:center; gap:0.5rem;">
                <select class="cig-responsavel" title="Responsável por todo o grupo (aplicado a ações sem responsável)" style="padding:0.4rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.8rem; outline:none; background:#fff; max-width:150px;">
                    <option value="">— Sem Resp. Grupo —</option>
                    ${window._ciUOpts_raw}
                </select>
                <div style="width:1px; height:20px; background:#cbd5e1; margin:0 2px;"></div>
                <button type="button" onclick="window.ciMoverElemento(this.closest('.ci-grupo-block'), -1)" title="Mover para cima" style="background:#e2e8f0; border:none; width:30px; height:30px; border-radius:6px; cursor:pointer;"><i class="ph ph-caret-up"></i></button>
                <button type="button" onclick="window.ciMoverElemento(this.closest('.ci-grupo-block'), 1)" title="Mover para baixo" style="background:#e2e8f0; border:none; width:30px; height:30px; border-radius:6px; cursor:pointer;"><i class="ph ph-caret-down"></i></button>
                <div style="width:1px; height:20px; background:#cbd5e1; margin:0 4px;"></div>
                <button type="button" onclick="window.ciAdicionarAcaoNoGrupo(this.closest('.ci-grupo-block'), null)" style="background:#dbeafe; color:#1e40af; border:none; padding:0.4rem 0.8rem; border-radius:6px; font-size:0.8rem; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:4px;"><i class="ph ph-plus"></i> Ação</button>
                <button type="button" onclick="if(confirm('Excluir este grupo e todas as ações?')) { this.closest('.ci-grupo-block').remove(); window.ciAtualizarNumeracao(); window.ciCheckEmpty(); }" style="background:#fee2e2; color:#dc2626; border:none; width:30px; height:30px; border-radius:6px; cursor:pointer;"><i class="ph ph-trash"></i></button>
            </div>
        </div>
        <div class="cig-acoes-lista" style="display:flex; flex-direction:column; gap:0.75rem;">
            <!-- Ações aqui -->
        </div>
        <div style="margin-top:1rem; text-align:center;">
            <button type="button" onclick="window.ciAdicionarAcaoNoGrupo(this.closest('.ci-grupo-block'), null)" style="background:#f8fafc; color:#64748b; border:1.5px dashed #cbd5e1; padding:0.5rem 1.5rem; border-radius:8px; font-size:0.85rem; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:all 0.2s;" onmouseover="this.style.background='#f1f5f9';this.style.borderColor='#94a3b8';this.style.color='#475569'" onmouseout="this.style.background='#f8fafc';this.style.borderColor='#cbd5e1';this.style.color='#64748b'">
                <i class="ph ph-plus"></i> Adicionar nova Ação aqui
            </button>
        </div>
    `;
    if (respId) div.querySelector('.cig-responsavel').value = respId;
    container.appendChild(div);
    window.ciCheckEmpty();
    if (updateNum) window.ciAtualizarNumeracao();
    return div;
};

window.ciAdicionarAcaoNoGrupo = function(grupoEl, a) {
    if (!a || a instanceof Event) a = {};
    const grupoNomeAcao = (grupoEl && grupoEl.querySelector('.cig-nome')) ? grupoEl.querySelector('.cig-nome').value.toLowerCase() : '';
    const isTreinamentosAcao = grupoNomeAcao.includes('treinamentos');
    const displayTrein = isTreinamentosAcao ? 'block' : 'none';
    if (!grupoEl) { console.error('grupoEl é nulo'); alert('Erro interno: Bloco do grupo não encontrado.'); return; }
    try {
    const lista = grupoEl.querySelector('.cig-acoes-lista');
    const div = document.createElement('div');
    div.className = 'ci-acao-item';
    div.style.cssText = 'background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:1rem; position:relative;';
    
    let isTodos = (!a.departamentos || a.departamentos === 'todos');
    let deptoArray = [];
    if (!isTodos) {
        try { deptoArray = JSON.parse(a.departamentos); } catch(e) {}
    }

    div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; margin-bottom:0.75rem;">
            <div style="display:flex; align-items:center; gap:0.5rem; flex:1;">
                <input type="text" class="cia-num" onchange="window.ciReordenarPorInput(this)" style="color:#0f4c81; font-weight:700; font-size:0.9rem; width:40px; border:1px solid transparent; background:transparent; text-align:center; outline:none; border-radius:4px; padding:2px;" onfocus="this.style.border='1px solid #cbd5e1';this.style.background='#fff'" onblur="this.style.border='1px solid transparent';this.style.background='transparent'">
                <div style="flex:1; display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                    <div>
                        <input type="text" class="cia-titulo" value="${(a.titulo||'').replace(/"/g,'&quot;')}" placeholder="Título da Ação *" style="width:100%; padding:0.4rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; outline:none;">
                    </div>
                    <div>
                        <input type="text" class="cia-descricao" value="${(a.descricao||'').replace(/"/g,'&quot;')}" placeholder="Descrição..." style="width:100%; padding:0.4rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; outline:none;">
                    </div>
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:0.5rem;">
                <button type="button" onclick="window.ciMoverElemento(this.closest('.ci-acao-item'), -1)" title="Subir Ação" style="background:#f1f5f9; border:none; width:26px; height:26px; border-radius:4px; cursor:pointer;"><i class="ph ph-caret-up"></i></button>
                <button type="button" onclick="window.ciMoverElemento(this.closest('.ci-acao-item'), 1)" title="Descer Ação" style="background:#f1f5f9; border:none; width:26px; height:26px; border-radius:4px; cursor:pointer;"><i class="ph ph-caret-down"></i></button>
                <button type="button" onclick="this.closest('.ci-acao-item').remove(); window.ciAtualizarNumeracao();" title="Remover" style="background:#fee2e2; color:#dc2626; border:none; width:26px; height:26px; border-radius:4px; cursor:pointer; margin-left:4px;"><i class="ph ph-trash"></i></button>
            </div>
        </div>
        
        <div style="display:grid; grid-template-columns:1fr 200px 200px; gap:1.5rem; padding-left:45px; align-items:start;">
            <div>
                <label style="display:block; font-size:0.7rem; font-weight:600; color:#64748b; margin-bottom:4px;">Atribuir a Departamentos</label>
                <div style="border:1px solid #cbd5e1; border-radius:6px; padding:0.4rem; background:#f8fafc; max-height:180px; overflow-y:auto;">
                    <label style="display:flex; align-items:center; gap:4px; cursor:pointer; font-size:0.75rem; font-weight:600; margin-bottom:4px; padding-bottom:4px; border-bottom:1px solid #e2e8f0;">
                        <input type="checkbox" class="cia-depto-todos" ${isTodos ? 'checked' : ''} onchange="window.ciToggleTodosDeptos(this)"> Todos os Departamentos
                    </label>
                    <div class="cia-depto-lista" style="${isTodos ? 'opacity:0.4;pointer-events:none;' : ''} display:flex; flex-wrap:wrap; gap:8px;">
                        ${window._ciDeptoCbs}
                    </div>
                </div>
            </div>
            <div>
                <label style="display:block; font-size:0.7rem; font-weight:600; color:#64748b; margin-bottom:2px;">Responsável</label>
                <select class="cia-responsavel" style="width:100%; padding:0.4rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.8rem; outline:none;">
                    ${window._ciUOpts}
                </select>
            </div>
            <div>
                <label style="display:block; font-size:0.7rem; font-weight:600; color:#64748b; margin-bottom:2px;">Condição / Exigência</label>
                <select class="cia-condicao" style="width:100%; padding:0.4rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.8rem; outline:none;">
                    <option value="">Nenhuma (Sempre exigir)</option>
                    <option value="vt" ${a.condicao==='vt'?'selected':''}>Somente se usar VT</option>
                    <option value="vc" ${a.condicao==='vc'?'selected':''}>Somente se usar VC</option>
                    <option value="terapia" ${a.condicao==='terapia'?'selected':''}>Somente se usar Terapia</option>
                </select>
            </div>
                <div style="flex:1; display:${displayTrein};">
                    <label style="display:block;font-size:0.75rem;font-weight:600;color:#64748b;margin-bottom:0.25rem;">Treinamento Vinculado</label>
                    <select class="cia-treinamento" style="width:100%;padding:0.4rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.8rem;outline:none;background:#fff;">
                        ${window._ciTreinOpts}
                    </select>
                </div>
        </div>
    `;

    if (a.responsavel_user_id) div.querySelector('.cia-responsavel').value = 'user_' + a.responsavel_user_id;
    else if (a.responsavel_depto_id) div.querySelector('.cia-responsavel').value = 'depto_' + a.responsavel_depto_id;
    if (!isTodos) {
        div.querySelectorAll('.ci-depto-chk').forEach(chk => {
            if (deptoArray.includes(String(chk.value))) chk.checked = true;
        });
    }

    lista.appendChild(div);
    window.ciAtualizarNumeracao();
    } catch (e) {
        console.error('Erro ao adicionar acao:', e);
        alert('Erro ao adicionar ação: ' + e.message);
    }
};

window.ciMoverElemento = function(el, direcao) {
    const parent = el.parentNode;
    if (direcao === -1 && el.previousElementSibling) {
        parent.insertBefore(el, el.previousElementSibling);
    } else if (direcao === 1 && el.nextElementSibling) {
        parent.insertBefore(el, el.nextElementSibling.nextElementSibling);
    }
    window.ciAtualizarNumeracao();
};

window.ciAtualizarNumeracao = function() {
    const grupos = document.querySelectorAll('.ci-grupo-block');
    grupos.forEach((g, gIdx) => {
        const numGrp = gIdx + 1;
        const inputGrp = g.querySelector('.cig-num');
        if (inputGrp) inputGrp.value = numGrp;
        
        const acoes = g.querySelectorAll('.ci-acao-item');
        acoes.forEach((a, aIdx) => {
            const inputAcao = a.querySelector('.cia-num');
            if (inputAcao) inputAcao.value = `${numGrp}.${aIdx + 1}`;
        });
    });
};

window.ciReordenarPorInput = function(input) {
    const newVal = input.value.trim();
    const parts = newVal.split('.');
    if (parts.length !== 2) { window.ciAtualizarNumeracao(); return; }
    
    const targetGroupNum = parseInt(parts[0]) - 1;
    const targetIdx = parseInt(parts[1]) - 1;
    
    const item = input.closest('.ci-acao-item');
    const grupos = Array.from(document.querySelectorAll('.ci-grupo-block'));
    
    if (targetGroupNum >= 0 && targetGroupNum < grupos.length) {
        const targetGroup = grupos[targetGroupNum];
        const targetList = targetGroup.querySelector('.cig-acoes-lista');
        const items = Array.from(targetList.children);
        
        if (targetList === item.parentNode) {
            const currentIdx = items.indexOf(item);
            if (!isNaN(targetIdx) && targetIdx >= 0 && targetIdx < items.length) {
                if (targetIdx > currentIdx) {
                    targetList.insertBefore(item, items[targetIdx].nextElementSibling);
                } else {
                    targetList.insertBefore(item, items[targetIdx]);
                }
            } else {
                targetList.appendChild(item);
            }
        } else {
            if (!isNaN(targetIdx) && targetIdx >= 0 && targetIdx < items.length) {
                targetList.insertBefore(item, items[targetIdx]);
            } else {
                targetList.appendChild(item);
            }
        }
    }
    
    window.ciAtualizarNumeracao();
};

window.ciReordenarGrupoPorInput = function(input) {
    const targetIdx = parseInt(input.value.trim()) - 1;
    const item = input.closest('.ci-grupo-block');
    const parentList = item.parentNode;
    const items = Array.from(parentList.querySelectorAll('.ci-grupo-block'));
    const currentIdx = items.indexOf(item);
    
    if (!isNaN(targetIdx) && targetIdx >= 0 && targetIdx < items.length) {
        if (targetIdx > currentIdx) {
            parentList.insertBefore(item, items[targetIdx].nextElementSibling);
        } else {
            parentList.insertBefore(item, items[targetIdx]);
        }
    } else if (!isNaN(targetIdx) && targetIdx >= items.length) {
        parentList.appendChild(item);
    }
    window.ciAtualizarNumeracao();
};

window.ciToggleTodosDeptos = function(cb) {
    const lista = cb.closest('div').querySelector('.cia-depto-lista');
    if (cb.checked) {
        lista.style.opacity = '0.4';
        lista.style.pointerEvents = 'none';
        lista.querySelectorAll('input').forEach(chk => chk.checked = false);
    } else {
        lista.style.opacity = '1';
        lista.style.pointerEvents = 'auto';
    }
};

window.ciSyncDeptos = function(cb) {
    const wrapper = cb.closest('div').parentElement;
    const todosCb = wrapper.querySelector('.cia-depto-todos');
    const marcados = wrapper.querySelectorAll('.ci-depto-chk:checked').length;
    if (marcados > 0 && todosCb.checked) {
        todosCb.checked = false;
        wrapper.querySelector('.cia-depto-lista').style.opacity = '1';
        wrapper.querySelector('.cia-depto-lista').style.pointerEvents = 'auto';
    }
};

window.ciCheckEmpty = function() {
    const container = document.getElementById('ci-grupos-container');
    const emptyMsg = document.getElementById('ci-empty-acoes');
    if (container && emptyMsg) {
        if (container.children.length === 0) emptyMsg.style.display = 'block';
        else emptyMsg.style.display = 'none';
    }
};

window.ciSalvarTemplate = async function() {
    const nome = document.getElementById('ci-nome')?.value.trim();
    const tipo_key = document.getElementById('ci-tipo_key')?.value.trim().toLowerCase();
    const descricao = document.getElementById('ci-descricao')?.value.trim();

    if (!nome || !tipo_key) {
        alert('Nome e Tipo são obrigatórios.');
        return;
    }

    const acoes = [];
    let hasError = false;
    let ordemCounter = 1;

    document.querySelectorAll('.ci-grupo-block').forEach((grp) => {
        const grupoNome = grp.querySelector('.cig-nome').value.trim() || 'Geral';
        const grupoResp = grp.querySelector('.cig-responsavel')?.value;
        
        const acoesNode = grp.querySelectorAll('.ci-acao-item');
        if (acoesNode.length === 0) {
            alert(`O grupo "${grupoNome}" está vazio! Adicione pelo menos uma ação dentro dele ou exclua-o (lixeira vermelha) para poder salvar.`);
            hasError = true;
            return;
        }
        
        acoesNode.forEach((item) => {
            const titulo = item.querySelector('.cia-titulo').value.trim();
            if (!titulo) { hasError = true; return; }
            
            const desc = item.querySelector('.cia-descricao').value.trim();
            const resp = item.querySelector('.cia-responsavel').value;
            const cond = item.querySelector('.cia-condicao').value;
            const treinId = item.querySelector('.cia-treinamento').value;
            
            const todosCb = item.querySelector('.cia-depto-todos');
            let deptos = 'todos';
            if (!todosCb.checked) {
                const marcados = Array.from(item.querySelectorAll('.ci-depto-chk:checked')).map(c => c.value);
                if (marcados.length > 0) deptos = marcados;
            }

            acoes.push({
                titulo,
                grupo: grupoNome,
                descricao: desc || null,
                responsavel_user_id: (resp && resp.startsWith('user_') ? resp.split('_')[1] : null),
                responsavel_depto_id: (resp && resp.startsWith('depto_') ? resp.split('_')[1] : null),
                departamentos: deptos,
                condicao: cond || null,
                treinamento_id: treinId ? parseInt(treinId) : null,
                ordem: ordemCounter++,
                grupo_responsavel_user_id: (grupoResp && grupoResp.startsWith('user_') ? grupoResp.split('_')[1] : null),
                grupo_responsavel_depto_id: (grupoResp && grupoResp.startsWith('depto_') ? grupoResp.split('_')[1] : null)
            });
        });
    });

    if (hasError) {
        alert('Preencha o título de todas as ações.');
        return;
    }

    const payload = {
        id: ciEditingId,
        nome,
        tipo_key,
        descricao: descricao || null,
        acoes
    };

    try {
        const btn = document.querySelector('button[onclick="window.ciSalvarTemplate()"]');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...'; }

        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch('/api/integ/templates', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Erro ao salvar');

        if (typeof showToast === 'function') showToast('Template salvo com sucesso!', 'success');
        window.loadConfIntegracao();
    } catch(e) {
        alert('Erro: ' + e.message);
        const btn = document.querySelector('button[onclick="window.ciSalvarTemplate()"]');
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar Template'; }
    }
};

window.ciFiltrarAcoesPorDepto = function() {
    const filterId = document.getElementById('ci-filtro-depto').value;
    document.querySelectorAll('.ci-acao-item').forEach(item => {
        if (filterId === 'todos') {
            item.style.display = 'block';
            return;
        }
        const isTodos = item.querySelector('.cia-depto-todos').checked;
        if (isTodos) {
            item.style.display = 'block';
            return;
        }
        const hasDepto = Array.from(item.querySelectorAll('.ci-depto-chk:checked')).some(c => c.value === filterId);
        item.style.display = hasDepto ? 'block' : 'none';
    });
};
window.ciExcluirTemplate = async function(id, nome) {
    if (!confirm(`Excluir o template "${nome}"? Isso não afeta os processos de integração já iniciados.`)) return;
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch(`/api/integ/templates/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Erro ao excluir');
        
        if (typeof showToast === 'function') showToast('Template excluído.', 'info');
        window.loadConfIntegracao();
    } catch(e) {
        alert('Erro: ' + e.message);
    }
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
    s.textContent = '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} .ph-spin{animation:spin 1s linear infinite;}';
    document.head.appendChild(s);
})();

window.ciFiltrarAcoesPorDepto = function() {
    const filterId = document.getElementById('ci-filtro-depto').value;
    document.querySelectorAll('.ci-acao-item').forEach(item => {
        if (filterId === 'todos') {
            item.style.display = 'block';
            return;
        }
        const isTodos = item.querySelector('.cia-depto-todos').checked;
        if (isTodos) {
            item.style.display = 'block';
            return;
        }
        const hasDepto = Array.from(item.querySelectorAll('.ci-depto-chk:checked')).some(c => c.value === filterId);
        item.style.display = hasDepto ? 'block' : 'none';
    });
};
