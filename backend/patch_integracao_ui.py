
# -*- coding: utf-8 -*-
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\integracao.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

# 1. Update list view to show actions
OLD_LIST_ACTIONS = """<span style="background:#e0f2fe;color:#0369a1;font-size:0.8rem;padding:3px 10px;border-radius:999px;font-weight:600;"><i class="ph ph-list-checks"></i> ${t.total_acoes || 0} ações configuradas</span>"""
NEW_LIST_ACTIONS = """
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
"""
content = content.replace(OLD_LIST_ACTIONS, NEW_LIST_ACTIONS)

# 2. Add Filter in Edit Form
OLD_FORM_HEADER = """<!-- LISTA DE AÇÕES -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
                <h3 style="margin:0;font-size:1.1rem;color:#0f172a;"><i class="ph ph-list-checks" style="color:#0f4c81;"></i> Ações do Template</h3>
                <button onclick="window.ciAdicionarAcao()" style="background:#e0f2fe;color:#0369a1;border:none;padding:0.5rem 1rem;border-radius:8px;cursor:pointer;font-weight:600;display:flex;align-items:center;gap:0.5rem;font-size:0.85rem;transition:background 0.2s;" onmouseover="this.style.background='#bae6fd'" onmouseout="this.style.background='#e0f2fe'">
                    <i class="ph ph-plus"></i> Adicionar Ação
                </button>
            </div>"""

NEW_FORM_HEADER = """<!-- LISTA DE AÇÕES -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:1rem;">
                <h3 style="margin:0;font-size:1.1rem;color:#0f172a;"><i class="ph ph-list-checks" style="color:#0f4c81;"></i> Ações do Template</h3>
                <div style="display:flex;align-items:center;gap:0.75rem;">
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:0.3rem 0.5rem;display:flex;align-items:center;gap:0.5rem;">
                        <i class="ph ph-funnel" style="color:#64748b;"></i>
                        <select id="ci-filtro-depto" onchange="window.ciFiltrarAcoesPorDepto()" style="border:none;background:transparent;font-size:0.85rem;color:#475569;outline:none;width:200px;">
                            <option value="todos">— Todos os departamentos —</option>
                            ${ciDeptos.map(d => `<option value="${d.id}">${d.nome}</option>`).join('')}
                        </select>
                    </div>
                    <button onclick="window.ciAdicionarAcao()" style="background:#e0f2fe;color:#0369a1;border:none;padding:0.5rem 1rem;border-radius:8px;cursor:pointer;font-weight:600;display:flex;align-items:center;gap:0.5rem;font-size:0.85rem;transition:background 0.2s;" onmouseover="this.style.background='#bae6fd'" onmouseout="this.style.background='#e0f2fe'">
                        <i class="ph ph-plus"></i> Adicionar Ação
                    </button>
                </div>
            </div>"""
content = content.replace(OLD_FORM_HEADER, NEW_FORM_HEADER)

# 3. Add 'grupo' field to action items
OLD_ACTION_FIELDS = """<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;padding-right:40px;margin-bottom:0.75rem;">
            <div>
                <label style="display:block;font-size:0.75rem;font-weight:600;color:#64748b;margin-bottom:2px;">Título da Ação *</label>
                <input type="text" class="cia-titulo" value="${(a.titulo||'').replace(/"/g,'&quot;')}" placeholder="Ex: Entregar crachá" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;outline:none;">
            </div>
            <div>
                <label style="display:block;font-size:0.75rem;font-weight:600;color:#64748b;margin-bottom:2px;">Descrição</label>
                <input type="text" class="cia-descricao" value="${(a.descricao||'').replace(/"/g,'&quot;')}" placeholder="Instruções adicionais..." style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;outline:none;">
            </div>
        </div>"""

NEW_ACTION_FIELDS = """<div style="display:grid;grid-template-columns:1fr 1.5fr 1fr;gap:1rem;padding-right:40px;margin-bottom:0.75rem;">
            <div>
                <label style="display:block;font-size:0.75rem;font-weight:600;color:#64748b;margin-bottom:2px;">Grupo (Opcional)</label>
                <input type="text" class="cia-grupo" value="${(a.grupo||'').replace(/"/g,'&quot;')}" placeholder="Ex: Equipamentos, Software" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;outline:none;">
            </div>
            <div>
                <label style="display:block;font-size:0.75rem;font-weight:600;color:#64748b;margin-bottom:2px;">Título da Ação *</label>
                <input type="text" class="cia-titulo" value="${(a.titulo||'').replace(/"/g,'&quot;')}" placeholder="Ex: Entregar crachá" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;outline:none;">
            </div>
            <div>
                <label style="display:block;font-size:0.75rem;font-weight:600;color:#64748b;margin-bottom:2px;">Descrição</label>
                <input type="text" class="cia-descricao" value="${(a.descricao||'').replace(/"/g,'&quot;')}" placeholder="Instruções..." style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;outline:none;">
            </div>
        </div>"""
content = content.replace(OLD_ACTION_FIELDS, NEW_ACTION_FIELDS)

# 4. Save 'grupo' field
OLD_SAVE_ACTION = """const desc = item.querySelector('.cia-descricao').value.trim();"""
NEW_SAVE_ACTION = """const desc = item.querySelector('.cia-descricao').value.trim();
        const grupo = item.querySelector('.cia-grupo').value.trim();"""
content = content.replace(OLD_SAVE_ACTION, NEW_SAVE_ACTION)

OLD_PUSH_ACTION = """acoes.push({
            titulo,
            descricao: desc || null,"""
NEW_PUSH_ACTION = """acoes.push({
            titulo,
            grupo: grupo || null,
            descricao: desc || null,"""
content = content.replace(OLD_PUSH_ACTION, NEW_PUSH_ACTION)

# 5. Add filter function
FILTER_JS = """
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
content += FILTER_JS

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)
print("Frontend update script written")
