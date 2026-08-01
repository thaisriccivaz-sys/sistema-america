
# -*- coding: utf-8 -*-
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\server.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

OLD = """db.all(`SELECT t.*,
            (SELECT COUNT(*) FROM integ_template_acoes a WHERE a.template_id=t.id AND a.ativo=1) as total_acoes
            FROM integ_templates t WHERE t.ativo=1 ORDER BY t.tipo_key, t.nome`, [], (err, rows) => {"""

NEW = """db.all(`SELECT t.*,
            (SELECT COUNT(*) FROM integ_template_acoes a WHERE a.template_id=t.id AND a.ativo=1) as total_acoes,
            (SELECT json_group_array(json_object('titulo', titulo, 'grupo', grupo)) FROM (SELECT titulo, grupo FROM integ_template_acoes WHERE template_id=t.id AND ativo=1 ORDER BY ordem)) as acoes_json
            FROM integ_templates t WHERE t.ativo=1 ORDER BY t.tipo_key, t.nome`, [], (err, rows) => {"""

if "json_group_array" not in OLD and OLD in content:
    content = content.replace(OLD, NEW)
    with open(f, 'w', encoding='utf-8') as fh:
        fh.write(content)
    print("Updated GET /api/integ/templates")
else:
    print("String not found or already updated")
