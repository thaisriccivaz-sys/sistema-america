
# -*- coding: utf-8 -*-
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\integracao.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

start_marker = "window.ciAbrirFormEditar = async function (id) {"
end_marker = "window.ciExcluirTemplate = async function(id, nome) {"

idx_start = content.find(start_marker)
idx_end = content.find(end_marker)

NEW_JS = """window.ciAbrirFormEditar = async function (id) {
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

    const uOpts = `<option value="">— Nenhum (RH/Geral) —</option>` + 
        ciUsuarios.map(u => `<option value="${u.id}">${u.nome||u.username}</option>`).join('');

    const deptoCbsHtml = deptosFiltrados.map(d => `<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:0.8rem;white-space:nowrap;"><input type="checkbox" value="${d.id}" class="ci-depto-chk" onchange="window.ciSyncDeptos(this)"> ${d.nome}</label>`).join('');

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
                    <button onclick="window.ciAdicionarGrupo()" style="background:#e0f2fe;color:#0369a1;border:none;padding:0.5rem 1rem;border-radius:8px;cursor:pointer;font-weight:600;display:flex;align-items:center;gap:0.5rem;font-size:0.85rem;transition:background 0.2s;" onmouseover="this.style.background='#bae6fd'" onmouseout="this.style.background='#e0f2fe'">
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
            const grpEl = window.ciAdicionarGrupo(gName, false);
            acts.forEach(a => {
                window.ciAdicionarAcaoNoGrupo(grpEl, a);
            });
        });
    }
    
    window.ciAtualizarNumeracao();
}

window.ciAdicionarGrupo = function(nome = '', updateNum = true) {
    const container = document.getElementById('ci-grupos-container');
    const div = document.createElement('div');
    div.className = 'ci-grupo-block';
    div.style.cssText = 'background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:1.2rem; margin-bottom:1.5rem; box-shadow:0 1px 3px rgba(0,0,0,0.05);';
    
    div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; padding-bottom:0.8rem; border-bottom:1px solid #e2e8f0;">
            <div style="display:flex; align-items:center; gap:0.5rem; flex:1;">
                <span class="cig-num" style="background:#0f4c81; color:#fff; font-weight:700; font-size:1rem; padding:4px 10px; border-radius:6px;"></span>
                <input type="text" class="cig-nome" value="${nome.replace(/"/g, '&quot;')}" placeholder="Nome do Grupo (Ex: Treinamentos)" style="flex:1; max-width:400px; padding:0.5rem; border:1px solid #cbd5e1; border-radius:6px; font-size:1rem; font-weight:600; outline:none;" onfocus="this.style.borderColor='#0f4c81'" onblur="this.style.borderColor='#d1d5db'">
            </div>
            <div style="display:flex; align-items:center; gap:0.5rem;">
                <button onclick="window.ciMoverElemento(this.closest('.ci-grupo-block'), -1)" title="Mover para cima" style="background:#e2e8f0; border:none; width:30px; height:30px; border-radius:6px; cursor:pointer;"><i class="ph ph-caret-up"></i></button>
                <button onclick="window.ciMoverElemento(this.closest('.ci-grupo-block'), 1)" title="Mover para baixo" style="background:#e2e8f0; border:none; width:30px; height:30px; border-radius:6px; cursor:pointer;"><i class="ph ph-caret-down"></i></button>
                <div style="width:1px; height:20px; background:#cbd5e1; margin:0 4px;"></div>
                <button onclick="window.ciAdicionarAcaoNoGrupo(this.closest('.ci-grupo-block'))" style="background:#dbeafe; color:#1e40af; border:none; padding:0.4rem 0.8rem; border-radius:6px; font-size:0.8rem; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:4px;"><i class="ph ph-plus"></i> Ação</button>
                <button onclick="if(confirm('Excluir este grupo e todas as ações?')) { this.closest('.ci-grupo-block').remove(); window.ciAtualizarNumeracao(); window.ciCheckEmpty(); }" style="background:#fee2e2; color:#dc2626; border:none; width:30px; height:30px; border-radius:6px; cursor:pointer;"><i class="ph ph-trash"></i></button>
            </div>
        </div>
        <div class="cig-acoes-lista" style="display:flex; flex-direction:column; gap:0.75rem;">
            <!-- Ações aqui -->
        </div>
    `;
    container.appendChild(div);
    window.ciCheckEmpty();
    if (updateNum) window.ciAtualizarNumeracao();
    return div;
};

window.ciAdicionarAcaoNoGrupo = function(grupoEl, a = {}) {
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
                <span class="cia-num" style="color:#0f4c81; font-weight:700; font-size:0.9rem; min-width:35px;"></span>
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
                <button onclick="window.ciMoverElemento(this.closest('.ci-acao-item'), -1)" title="Subir Ação" style="background:#f1f5f9; border:none; width:26px; height:26px; border-radius:4px; cursor:pointer;"><i class="ph ph-caret-up"></i></button>
                <button onclick="window.ciMoverElemento(this.closest('.ci-acao-item'), 1)" title="Descer Ação" style="background:#f1f5f9; border:none; width:26px; height:26px; border-radius:4px; cursor:pointer;"><i class="ph ph-caret-down"></i></button>
                <button onclick="this.closest('.ci-acao-item').remove(); window.ciAtualizarNumeracao();" title="Remover" style="background:#fee2e2; color:#dc2626; border:none; width:26px; height:26px; border-radius:4px; cursor:pointer; margin-left:4px;"><i class="ph ph-trash"></i></button>
            </div>
        </div>
        
        <div style="display:grid; grid-template-columns:1.5fr 1fr 1fr; gap:1rem; padding-left:45px;">
            <div>
                <label style="display:block; font-size:0.7rem; font-weight:600; color:#64748b; margin-bottom:4px;">Atribuir a Departamentos</label>
                <div style="border:1px solid #cbd5e1; border-radius:6px; padding:0.4rem; background:#f8fafc; max-height:70px; overflow-y:auto;">
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
                </select>
            </div>
        </div>
    `;

    if (a.responsavel_user_id) div.querySelector('.cia-responsavel').value = a.responsavel_user_id;
    if (!isTodos) {
        div.querySelectorAll('.ci-depto-chk').forEach(chk => {
            if (deptoArray.includes(String(chk.value))) chk.checked = true;
        });
    }

    lista.appendChild(div);
    window.ciAtualizarNumeracao();
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
        const spanGrp = g.querySelector('.cig-num');
        if (spanGrp) spanGrp.textContent = numGrp;
        
        const acoes = g.querySelectorAll('.ci-acao-item');
        acoes.forEach((a, aIdx) => {
            const spanAcao = a.querySelector('.cia-num');
            if (spanAcao) spanAcao.textContent = `${numGrp}.${aIdx + 1}`;
        });
    });
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
        
        grp.querySelectorAll('.ci-acao-item').forEach((item) => {
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
                grupo: grupoNome,
                descricao: desc || null,
                responsavel_user_id: resp || null,
                departamentos: deptos,
                condicao: cond || null,
                ordem: ordemCounter++
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
"""

content = content[:idx_start] + NEW_JS + content[idx_end:]

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("Patch aplicado com sucesso!")
