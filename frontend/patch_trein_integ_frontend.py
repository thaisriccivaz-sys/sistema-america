
# -*- coding: utf-8 -*-
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\integracao.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

# 1. Add variable and fetch
VAR_OLD = """let ciUsuarios = [];
let ciDeptos = [];"""
VAR_NEW = """let ciUsuarios = [];
let ciDeptos = [];
let ciTreinamentos = [];"""
content = content.replace(VAR_OLD, VAR_NEW)

FETCH_OLD = """        const [tplRes, uRes, dRes] = await Promise.all([
            fetch('/api/integ/templates', { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/usuarios',        { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/departamentos',   { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (tplRes.ok) ciTemplates = await tplRes.json();
        if (uRes.ok) ciUsuarios = await uRes.json();
        if (dRes.ok) ciDeptos = await dRes.json();"""

FETCH_NEW = """        const [tplRes, uRes, dRes, trRes] = await Promise.all([
            fetch('/api/integ/templates', { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/usuarios',        { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/departamentos',   { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/treinamentos',    { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (tplRes.ok) ciTemplates = await tplRes.json();
        if (uRes.ok) ciUsuarios = await uRes.json();
        if (dRes.ok) ciDeptos = await dRes.json();
        if (trRes.ok) ciTreinamentos = await trRes.json();"""
content = content.replace(FETCH_OLD, FETCH_NEW)

# 2. Add window._ciTreinOpts to renderCiForm
RENDER_OLD = """    const uOpts = `<option value="">— Nenhum (RH/Geral) —</option>` + baseUOpts;
    window._ciUOpts_raw = baseUOpts;"""

RENDER_NEW = """    const uOpts = `<option value="">— Nenhum (RH/Geral) —</option>` + baseUOpts;
    window._ciUOpts_raw = baseUOpts;
    
    const treinInteg = ciTreinamentos.filter(t => t.is_integracao);
    window._ciTreinOpts = `<option value="">Nenhum</option>` + treinInteg.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');"""
content = content.replace(RENDER_OLD, RENDER_NEW)

# 3. Add Treinamento Vinculado dropdown in ciAdicionarAcaoNoGrupo (and in renderCiForm initial mapping)
# Wait! In ciAdicionarAcaoNoGrupo:
CIA_OLD = """                <div style="flex:1;">
                    <label style="display:block;font-size:0.75rem;font-weight:600;color:#64748b;margin-bottom:0.25rem;">Condição / Exigência</label>
                    <select class="cia-condicao" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;outline:none;background:#fff;">
                        <option value="">Nenhuma (Sempre exigir)</option>
                        <option value="vc">Somente se usar VC</option>
                        <option value="terapia">Somente se usar Terapia</option>
                    </select>
                </div>"""

CIA_NEW = """                <div style="flex:1;">
                    <label style="display:block;font-size:0.75rem;font-weight:600;color:#64748b;margin-bottom:0.25rem;">Condição / Exigência</label>
                    <select class="cia-condicao" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;outline:none;background:#fff;">
                        <option value="">Nenhuma (Sempre exigir)</option>
                        <option value="vc">Somente se usar VC</option>
                        <option value="terapia">Somente se usar Terapia</option>
                    </select>
                </div>
                <div style="flex:1;">
                    <label style="display:block;font-size:0.75rem;font-weight:600;color:#64748b;margin-bottom:0.25rem;">Treinamento Vinculado</label>
                    <select class="cia-treinamento" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;outline:none;background:#fff;">
                        ${window._ciTreinOpts}
                    </select>
                </div>"""
content = content.replace(CIA_OLD, CIA_NEW)

# 4. Set the value in ciAdicionarAcaoNoGrupo
BIND_CIA_OLD = """            if(a.responsavel_user_id) div.querySelector('.cia-responsavel').value = 'user_' + a.responsavel_user_id;
            else if(a.responsavel_depto_id) div.querySelector('.cia-responsavel').value = 'depto_' + a.responsavel_depto_id;"""
BIND_CIA_NEW = """            if(a.responsavel_user_id) div.querySelector('.cia-responsavel').value = 'user_' + a.responsavel_user_id;
            else if(a.responsavel_depto_id) div.querySelector('.cia-responsavel').value = 'depto_' + a.responsavel_depto_id;
            if(a.treinamento_id) div.querySelector('.cia-treinamento').value = a.treinamento_id;"""
content = content.replace(BIND_CIA_OLD, BIND_CIA_NEW)

# 5. Extract value in ciSalvarTemplate
SALVAR_OLD = """            const cond = item.querySelector('.cia-condicao').value;"""
SALVAR_NEW = """            const cond = item.querySelector('.cia-condicao').value;
            const treinId = item.querySelector('.cia-treinamento').value;"""
content = content.replace(SALVAR_OLD, SALVAR_NEW)

SALVAR2_OLD = """                condicao: cond || null,"""
SALVAR2_NEW = """                condicao: cond || null,
                treinamento_id: treinId ? parseInt(treinId) : null,"""
content = content.replace(SALVAR2_OLD, SALVAR2_NEW)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("Frontend patch for Treinamentos Integration done!")
