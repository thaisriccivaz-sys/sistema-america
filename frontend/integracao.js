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
        const [tplRes, uRes, dRes] = await Promise.all([
            fetch('/api/integ/templates', { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/usuarios',        { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/departamentos',   { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (tplRes.ok) ciTemplates = await tplRes.json();
        if (uRes.ok) ciUsuarios = await uRes.json();
        if (dRes.ok) ciDeptos = await dRes.json();

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
                        <span style="background:#e0f2fe;color:#0369a1;font-size:0.8rem;padding:3px 10px;border-radius:999px;font-weight:600;"><i class="ph ph-list-checks"></i> ${t.total_acoes || 0} ações configuradas</span>
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

    // Gerar opções de usuário
    const uOpts = `<option value="">— Nenhum (RH/Geral) —</option>` + 
        ciUsuarios.map(u => `<option value="${u.id}">${u.nome||u.username}</option>`).join('');

    // Gerar checkboxes de departamento (template helper for JS)
    const deptoCbsHtml = ciDeptos.map(d => `<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:0.8rem;white-space:nowrap;"><input type="checkbox" value="${d.id}" class="ci-depto-chk" onchange="window.ciSyncDeptos(this)"> ${d.nome}</label>`).join('');

    container.innerHTML = `
        <div style="padding:1.5rem; max-width: 1000px; margin: 0 auto;">
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

            <!-- LISTA DE AÇÕES -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
                <h3 style="margin:0;font-size:1.1rem;color:#0f172a;"><i class="ph ph-list-checks" style="color:#0f4c81;"></i> Ações do Template</h3>
                <button onclick="window.ciAdicionarAcao()" style="background:#e0f2fe;color:#0369a1;border:none;padding:0.5rem 1rem;border-radius:8px;cursor:pointer;font-weight:600;display:flex;align-items:center;gap:0.5rem;font-size:0.85rem;transition:background 0.2s;" onmouseover="this.style.background='#bae6fd'" onmouseout="this.style.background='#e0f2fe'">
                    <i class="ph ph-plus"></i> Adicionar Ação
                </button>
            </div>

            <div id="ci-acoes-container">
                <!-- Ações serão inseridas aqui via JS -->
            </div>
            ${acoes.length === 0 ? '<div id="ci-empty-acoes" style="text-align:center;padding:2rem;color:#94a3b8;border:2px dashed #e2e8f0;border-radius:12px;">Nenhuma ação adicionada. Clique em "Adicionar Ação".</div>' : '<div id="ci-empty-acoes" style="display:none;"></div>'}

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

    // Armazenar os HTMLs básicos para uso no adicionar ação
    window._ciUOpts = uOpts;
    window._ciDeptoCbs = deptoCbsHtml;

    // Renderizar ações existentes
    const acoesContainer = document.getElementById('ci-acoes-container');
    acoes.forEach(a => {
        acoesContainer.appendChild(ciCriarElementoAcao(a));
    });
}

function ciCriarElementoAcao(a = {}) {
    const div = document.createElement('div');
    div.className = 'ci-acao-item';
    div.style.cssText = 'background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:1rem;margin-bottom:1rem;box-shadow:0 1px 3px rgba(0,0,0,0.05);position:relative;';
    
    let isTodos = (!a.departamentos || a.departamentos === 'todos');
    let deptoArray = [];
    if (!isTodos) {
        try { deptoArray = JSON.parse(a.departamentos); } catch(e) {}
    }

    div.innerHTML = `
        <button onclick="this.closest('.ci-acao-item').remove(); window.ciCheckEmpty();" style="position:absolute;top:1rem;right:1rem;background:#fee2e2;color:#dc2626;border:none;width:30px;height:30px;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.2s;" onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fee2e2'" title="Remover ação"><i class="ph ph-trash"></i></button>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;padding-right:40px;margin-bottom:0.75rem;">
            <div>
                <label style="display:block;font-size:0.75rem;font-weight:600;color:#64748b;margin-bottom:2px;">Título da Ação *</label>
                <input type="text" class="cia-titulo" value="${(a.titulo||'').replace(/"/g,'&quot;')}" placeholder="Ex: Entregar crachá" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;outline:none;">
            </div>
            <div>
                <label style="display:block;font-size:0.75rem;font-weight:600;color:#64748b;margin-bottom:2px;">Descrição</label>
                <input type="text" class="cia-descricao" value="${(a.descricao||'').replace(/"/g,'&quot;')}" placeholder="Instruções adicionais..." style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;outline:none;">
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:1rem;">
            <div>
                <label style="display:block;font-size:0.75rem;font-weight:600;color:#64748b;margin-bottom:4px;">Atribuir a Departamentos</label>
                <div style="border:1px solid #cbd5e1;border-radius:6px;padding:0.5rem;background:#f8fafc;max-height:80px;overflow-y:auto;">
                    <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:0.8rem;font-weight:600;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid #e2e8f0;">
                        <input type="checkbox" class="cia-depto-todos" ${isTodos ? 'checked' : ''} onchange="window.ciToggleTodosDeptos(this)"> Todos os Departamentos
                    </label>
                    <div class="cia-depto-lista" style="${isTodos ? 'opacity:0.4;pointer-events:none;' : ''} display:flex;flex-wrap:wrap;gap:8px;">
                        ${window._ciDeptoCbs}
                    </div>
                </div>
            </div>
            <div>
                <label style="display:block;font-size:0.75rem;font-weight:600;color:#64748b;margin-bottom:2px;">Responsável</label>
                <select class="cia-responsavel" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;outline:none;">
                    ${window._ciUOpts}
                </select>
            </div>
            <div>
                <label style="display:block;font-size:0.75rem;font-weight:600;color:#64748b;margin-bottom:2px;">Condição / Exigência</label>
                <select class="cia-condicao" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;outline:none;">
                    <option value="">Nenhuma (Sempre exigir)</option>
                    <option value="vt" ${a.condicao==='vt'?'selected':''}>Somente se usar VT</option>
                    <option value="vc" ${a.condicao==='vc'?'selected':''}>Somente se usar VC</option>
                </select>
            </div>
        </div>
    `;

    // Sincronizar selects
    if (a.responsavel_user_id) div.querySelector('.cia-responsavel').value = a.responsavel_user_id;
    
    // Sincronizar checkboxes de depto
    if (!isTodos) {
        div.querySelectorAll('.ci-depto-chk').forEach(chk => {
            if (deptoArray.includes(String(chk.value))) chk.checked = true;
        });
    }

    return div;
}

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

window.ciAdicionarAcao = function() {
    const container = document.getElementById('ci-acoes-container');
    container.appendChild(ciCriarElementoAcao());
    window.ciCheckEmpty();
    // Scroll to bottom
    const newEl = container.lastElementChild;
    if (newEl) newEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

window.ciCheckEmpty = function() {
    const container = document.getElementById('ci-acoes-container');
    const emptyMsg = document.getElementById('ci-empty-acoes');
    if (container && emptyMsg) {
        if (container.children.length === 0) emptyMsg.style.display = 'block';
        else emptyMsg.style.display = 'none';
    }
};

// ============================================================
// SALVAR E EXCLUIR TEMPLATE
// ============================================================

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

    document.querySelectorAll('.ci-acao-item').forEach((item, index) => {
        const titulo = item.querySelector('.cia-titulo').value.trim();
        if (!titulo) { hasError = true; return; }
        
        const desc = item.querySelector('.cia-descricao').value.trim();
        const resp = item.querySelector('.cia-responsavel').value;
        const cond = item.querySelector('.cia-condicao').value;
        
        const todosCb = item.querySelector('.cia-depto-todos');
        let deptos = 'todos';
        if (!todosCb.checked) {
            const marcados = Array.from(item.querySelectorAll('.ci-depto-chk:checked')).map(c => c.value);
            if (marcados.length > 0) deptos = marcados;
        }

        acoes.push({
            titulo,
            descricao: desc || null,
            responsavel_user_id: resp || null,
            departamentos: deptos,
            condicao: cond || null,
            ordem: index + 1
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
    }
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
