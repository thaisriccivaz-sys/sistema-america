
# -*- coding: utf-8 -*-
import re
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\integracao.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

# Fix 1: renderCiForm - group responsavel
regex_grp = r'(const firstWithGrpResp = acts\.find\(a => a\.grupo_responsavel_user_id\);)\s*(const gResp = firstWithGrpResp \? firstWithGrpResp\.grupo_responsavel_user_id : null;)'
replacement_grp = r'''const firstWithGrpResp = acts.find(a => a.grupo_responsavel_user_id || a.grupo_responsavel_depto_id);
            const gResp = firstWithGrpResp ? (firstWithGrpResp.grupo_responsavel_user_id ? 'user_' + firstWithGrpResp.grupo_responsavel_user_id : 'depto_' + firstWithGrpResp.grupo_responsavel_depto_id) : null;'''
content = re.sub(regex_grp, replacement_grp, content)

# Fix 2: ciAdicionarAcaoNoGrupo - action responsavel
regex_act = r'(if \(a\.responsavel_user_id\) div\.querySelector\(\'\.cia-responsavel\'\)\.value = a\.responsavel_user_id;)'
replacement_act = r'''if (a.responsavel_user_id) div.querySelector('.cia-responsavel').value = 'user_' + a.responsavel_user_id;
    else if (a.responsavel_depto_id) div.querySelector('.cia-responsavel').value = 'depto_' + a.responsavel_depto_id;'''
content = re.sub(regex_act, replacement_act, content)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("Fixed integracao.js responsavel loading")
