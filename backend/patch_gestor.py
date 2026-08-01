
# -*- coding: utf-8 -*-
import re
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\integracao.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

# 1. Inject the Dinâmicos option group into baseUOpts
regex_opt = r'(<optgroup label="Responsáveis de Departamentos">)'
replacement_opt = r'''<optgroup label="Dinâmicos">
<option value="depto_-1">Gestor do Departamento do Colaborador</option>
</optgroup>
\1'''
content = re.sub(regex_opt, replacement_opt, content)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("Patched frontend/integracao.js")

f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\server.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

# 2. Patch server.js integration generation logic
# Original:
#                     if (!respFinalId && a.responsavel_depto_id) {
#                         respFinalId = await new Promise(r => db.get(`SELECT responsavel_id FROM departamentos WHERE id=?`, [a.responsavel_depto_id], (e, row) => r(row ? row.responsavel_id : null)));
#                     }
regex_server = r'(if \(!respFinalId && a\.responsavel_depto_id\) \{)\s*(respFinalId = await new Promise\(r => db\.get\(`SELECT responsavel_id FROM departamentos WHERE id=\?`, \[a\.responsavel_depto_id\], \(e, row\) => r\(row \? row\.responsavel_id : null\)\)\);)\s*(\})'
replacement_server = r'''\1
                        if (parseInt(a.responsavel_depto_id) === -1) {
                            respFinalId = await new Promise(r => db.get(`SELECT responsavel_id FROM departamentos WHERE id=?`, [colab.departamento_id], (e, row) => r(row ? row.responsavel_id : null)));
                        } else {
                            \2
                        }
                    \3'''
content = re.sub(regex_server, replacement_server, content)

# And similarly for a.grupo_responsavel_depto_id
regex_server2 = r'(if \(!respFinalId && a\.grupo_responsavel_depto_id\) \{)\s*(respFinalId = await new Promise\(r => db\.get\(`SELECT responsavel_id FROM departamentos WHERE id=\?`, \[a\.grupo_responsavel_depto_id\], \(e, row\) => r\(row \? row\.responsavel_id : null\)\)\);)\s*(\})'
replacement_server2 = r'''\1
                        if (parseInt(a.grupo_responsavel_depto_id) === -1) {
                            respFinalId = await new Promise(r => db.get(`SELECT responsavel_id FROM departamentos WHERE id=?`, [colab.departamento_id], (e, row) => r(row ? row.responsavel_id : null)));
                        } else {
                            \2
                        }
                    \3'''
content = re.sub(regex_server2, replacement_server2, content)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("Patched backend/server.js")
