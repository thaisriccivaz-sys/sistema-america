
# -*- coding: utf-8 -*-
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\integracao.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

SALVAR_OLD = """                responsavel_user_id: resp || null,
                departamentos: deptos,
                condicao: cond || null,
                ordem: ordemCounter++,
                grupo_responsavel_user_id: grupoResp || null"""

SALVAR_NEW = """                responsavel_user_id: (resp && resp.startsWith('user_') ? resp.split('_')[1] : null),
                responsavel_depto_id: (resp && resp.startsWith('depto_') ? resp.split('_')[1] : null),
                departamentos: deptos,
                condicao: cond || null,
                ordem: ordemCounter++,
                grupo_responsavel_user_id: (grupoResp && grupoResp.startsWith('user_') ? grupoResp.split('_')[1] : null),
                grupo_responsavel_depto_id: (grupoResp && grupoResp.startsWith('depto_') ? grupoResp.split('_')[1] : null)"""
content = content.replace(SALVAR_OLD, SALVAR_NEW)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("Frontend ciSalvarTemplate patch done!")
