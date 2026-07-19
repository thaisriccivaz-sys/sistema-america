
# -*- coding: utf-8 -*-
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\integracao.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

# 1. Update window._ciUOpts_raw and uOpts
UOPTS_OLD = """    const baseUOpts = ciUsuarios.map(u => `<option value="${u.id}">${u.nome||u.username}</option>`).join('');
    const uOpts = `<option value="">— Nenhum (RH/Geral) —</option>` + baseUOpts;
    window._ciUOpts_raw = baseUOpts;"""

UOPTS_NEW = """    // Remover duplicatas de ciUsuarios e criar options com prefixo user_
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
        <optgroup label="Responsáveis de Departamentos">
            ${deptOpts}
        </optgroup>
    `;
    const uOpts = `<option value="">— Nenhum (RH/Geral) —</option>` + baseUOpts;
    window._ciUOpts_raw = baseUOpts;"""
content = content.replace(UOPTS_OLD, UOPTS_NEW)


# 2. Update logic for setting the values in ciAdicionarAcaoNoGrupo (and in renderCiForm for group resp)
# In ciAdicionarAcaoNoGrupo: <select class="cia-responsavel" ...>
# Original: `<option value="">— Nenhum (RH/Geral) —</option>${window._ciUOpts_raw}`
# Value binding: It's done via JS: 
#   if(a.responsavel_user_id) div.querySelector('.cia-responsavel').value = a.responsavel_user_id;
BIND_CIA_OLD = """            if(a.responsavel_user_id) div.querySelector('.cia-responsavel').value = a.responsavel_user_id;"""
BIND_CIA_NEW = """            if(a.responsavel_user_id) div.querySelector('.cia-responsavel').value = 'user_' + a.responsavel_user_id;
            else if(a.responsavel_depto_id) div.querySelector('.cia-responsavel').value = 'depto_' + a.responsavel_depto_id;"""
content = content.replace(BIND_CIA_OLD, BIND_CIA_NEW)

# In ciAdicionarGrupo (for cig-responsavel)
BIND_CIG_OLD = """        if(gObj && gObj.responsavel_user_id) div.querySelector('.cig-responsavel').value = gObj.responsavel_user_id;"""
BIND_CIG_NEW = """        if(gObj && gObj.responsavel_user_id) div.querySelector('.cig-responsavel').value = 'user_' + gObj.responsavel_user_id;
        else if(gObj && gObj.responsavel_depto_id) div.querySelector('.cig-responsavel').value = 'depto_' + gObj.responsavel_depto_id;"""
content = content.replace(BIND_CIG_OLD, BIND_CIG_NEW)

# Also in renderCiForm (in case group doesn't have an object, but is root. Wait, root doesn't have group responsible? Yes it does via ciAdicionarGrupo).
# Wait, let me check how ciSalvarTemplate extracts values!
# function ciSalvarTemplate() -> acoes: []

# In ciSalvarTemplate:
SALVAR_OLD = """                responsavel_user_id: aDiv.querySelector('.cia-responsavel').value || null,"""
SALVAR_NEW = """                responsavel_user_id: (aDiv.querySelector('.cia-responsavel').value.startsWith('user_') ? aDiv.querySelector('.cia-responsavel').value.split('_')[1] : null),
                responsavel_depto_id: (aDiv.querySelector('.cia-responsavel').value.startsWith('depto_') ? aDiv.querySelector('.cia-responsavel').value.split('_')[1] : null),"""
content = content.replace(SALVAR_OLD, SALVAR_NEW)

SALVAR_GRP_OLD = """                responsavel_user_id: gDiv.querySelector('.cig-responsavel').value || null"""
SALVAR_GRP_NEW = """                grupo_responsavel_user_id: (gDiv.querySelector('.cig-responsavel').value.startsWith('user_') ? gDiv.querySelector('.cig-responsavel').value.split('_')[1] : null),
                grupo_responsavel_depto_id: (gDiv.querySelector('.cig-responsavel').value.startsWith('depto_') ? gDiv.querySelector('.cig-responsavel').value.split('_')[1] : null)"""
content = content.replace(SALVAR_GRP_OLD, SALVAR_GRP_NEW)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("Frontend patch for Dept Responsibles done!")
