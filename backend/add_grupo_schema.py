
# -*- coding: utf-8 -*-
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\server.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

patch_code = """
// PATCH: Add 'grupo' column to integ_template_acoes
db.serialize(() => {
    db.run("ALTER TABLE integ_template_acoes ADD COLUMN grupo TEXT", [], err => {
        if (err && !err.message.includes("duplicate column name")) {
            console.error("Erro ao adicionar coluna grupo:", err);
        } else if (!err) {
            console.log("[DB] Coluna 'grupo' adicionada em integ_template_acoes");
        }
    });
});
"""

if "ALTER TABLE integ_template_acoes ADD COLUMN grupo" not in content:
    idx = content.find("db.run(`CREATE TABLE IF NOT EXISTS integ_template_acoes")
    if idx != -1:
        # Find the end of this run
        end_idx = content.find(");", idx) + 2
        content = content[:end_idx] + "\n" + patch_code + content[end_idx:]
    else:
        content += patch_code

# Update POST /api/integ/templates to save 'grupo'
# Old: [tid, a.titulo, a.descricao || null, a.responsavel_user_id || null, deptJson, a.condicao || null, a.ordem || 0]
# Old: INSERT INTO integ_template_acoes (template_id, titulo, descricao, responsavel_user_id, departamentos, condicao, ordem) VALUES (?,?,?,?,?,?,?)

content = content.replace(
    "INSERT INTO integ_template_acoes (template_id, titulo, descricao, responsavel_user_id, departamentos, condicao, ordem) VALUES (?,?,?,?,?,?,?)",
    "INSERT INTO integ_template_acoes (template_id, titulo, descricao, responsavel_user_id, departamentos, condicao, ordem, grupo) VALUES (?,?,?,?,?,?,?,?)"
)

content = content.replace(
    "[tid, a.titulo, a.descricao || null, a.responsavel_user_id || null, deptJson, a.condicao || null, a.ordem || 0],",
    "[tid, a.titulo, a.descricao || null, a.responsavel_user_id || null, deptJson, a.condicao || null, a.ordem || 0, a.grupo || null],"
)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)
print("Backend schema update script written")
