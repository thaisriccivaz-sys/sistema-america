
# -*- coding: utf-8 -*-
import re
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\server.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

# 1. Add schema patch
SCHEMA_PATCH = """// PATCH: Add 'grupo' column to integ_template_acoes
db.serialize(() => {
    db.run("ALTER TABLE integ_template_acoes ADD COLUMN grupo TEXT", [], err => {
        if (err && !err.message.includes("duplicate column name")) {
            console.error("[DB] Erro ao adicionar coluna grupo:", err.message);
        } else if (!err) {
            console.log("[DB] Coluna 'grupo' adicionada em integ_template_acoes");
        }
    });
    
    // PATCH: Add 'grupo_responsavel_user_id'
    db.run("ALTER TABLE integ_template_acoes ADD COLUMN grupo_responsavel_user_id INTEGER", [], err => {
        if (err && !err.message.includes("duplicate column name")) {
            console.error("[DB] Erro ao adicionar coluna grupo_responsavel_user_id:", err.message);
        } else if (!err) {
            console.log("[DB] Coluna 'grupo_responsavel_user_id' adicionada em integ_template_acoes");
        }
    });
});"""
content = re.sub(
    r"// PATCH: Add 'grupo' column to integ_template_acoes.*?console\.log\(\"\[DB\] Coluna 'grupo' adicionada em integ_template_acoes\"\);\n        }\n    }\);\n\}\);", 
    SCHEMA_PATCH, 
    content, 
    flags=re.DOTALL
)

# 2. Add to POST /api/integ/templates
POST_OLD = """db.run(`INSERT INTO integ_template_acoes (template_id, titulo, descricao, responsavel_user_id, departamentos, condicao, ordem, grupo) VALUES (?,?,?,?,?,?,?,?)`,
                    [tid, a.titulo, a.descricao || null, a.responsavel_user_id || null, deptJson, a.condicao || null, a.ordem || 0, a.grupo || null],"""
POST_NEW = """db.run(`INSERT INTO integ_template_acoes (template_id, titulo, descricao, responsavel_user_id, departamentos, condicao, ordem, grupo, grupo_responsavel_user_id) VALUES (?,?,?,?,?,?,?,?,?)`,
                    [tid, a.titulo, a.descricao || null, a.responsavel_user_id || null, deptJson, a.condicao || null, a.ordem || 0, a.grupo || null, a.grupo_responsavel_user_id || null],"""
content = content.replace(POST_OLD, POST_NEW)

# 3. Add to GET /api/integ/templates JSON generation
# Line 22977: (SELECT json_group_array(json_object('titulo', titulo, 'grupo', grupo)) ...
JSON_OLD = """json_group_array(json_object('titulo', titulo, 'grupo', grupo))"""
JSON_NEW = """json_group_array(json_object('titulo', titulo, 'grupo', grupo, 'grupo_responsavel_user_id', grupo_responsavel_user_id))"""
content = content.replace(JSON_OLD, JSON_NEW)

# 4. Add to onboarding creation
ONBOARD_OLD = """[processoId, a.responsavel_user_id || null, a.titulo, a.descricao || null]"""
ONBOARD_NEW = """[processoId, a.responsavel_user_id || a.grupo_responsavel_user_id || null, a.titulo, a.descricao || null]"""
content = content.replace(ONBOARD_OLD, ONBOARD_NEW)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("Patch server aplicado com sucesso!")
