
# -*- coding: utf-8 -*-
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\server.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

OLD = """(SELECT json_group_array(json_object('titulo', titulo, 'grupo', grupo, 'grupo_responsavel_user_id', grupo_responsavel_user_id)) FROM (SELECT titulo, grupo FROM integ_template_acoes WHERE template_id=t.id AND ativo=1 ORDER BY ordem)) as acoes_json"""
NEW = """(SELECT json_group_array(json_object('titulo', titulo, 'grupo', grupo, 'grupo_responsavel_user_id', grupo_responsavel_user_id)) FROM (SELECT titulo, grupo, grupo_responsavel_user_id FROM integ_template_acoes WHERE template_id=t.id AND ativo=1 ORDER BY ordem)) as acoes_json"""
content = content.replace(OLD, NEW)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("Patch inner query aplicado com sucesso!")
