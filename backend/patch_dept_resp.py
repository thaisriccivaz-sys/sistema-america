
# -*- coding: utf-8 -*-
import re
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\server.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

# 1.1 Schema migrations
SCHEMA = """// PATCH: Add 'grupo_responsavel_user_id'
    db.run("ALTER TABLE integ_template_acoes ADD COLUMN grupo_responsavel_user_id INTEGER", [], err => {
        if (err && !err.message.includes("duplicate column name")) {
            console.error("[DB] Erro ao adicionar coluna grupo_responsavel_user_id:", err.message);
        } else if (!err) {
            console.log("[DB] Coluna 'grupo_responsavel_user_id' adicionada em integ_template_acoes");
        }
    });
    
    // PATCH: Responsável por Departamento
    db.run("ALTER TABLE integ_template_acoes ADD COLUMN responsavel_depto_id INTEGER", [], err => {});
    db.run("ALTER TABLE integ_template_acoes ADD COLUMN grupo_responsavel_depto_id INTEGER", [], err => {});"""
content = re.sub(
    r"// PATCH: Add 'grupo_responsavel_user_id'.*?console\.log\(\"\[DB\] Coluna 'grupo_responsavel_user_id' adicionada em integ_template_acoes\"\);\n        }\n    }\);", 
    SCHEMA, 
    content, 
    flags=re.DOTALL
)

# 1.2 POST /api/integ/templates - update insert
POST_OLD = """db.run(`INSERT INTO integ_template_acoes (template_id, titulo, descricao, responsavel_user_id, departamentos, condicao, ordem, grupo, grupo_responsavel_user_id) VALUES (?,?,?,?,?,?,?,?,?)`,
                    [tid, a.titulo, a.descricao || null, a.responsavel_user_id || null, deptJson, a.condicao || null, a.ordem || 0, a.grupo || null, a.grupo_responsavel_user_id || null],"""
POST_NEW = """db.run(`INSERT INTO integ_template_acoes (template_id, titulo, descricao, responsavel_user_id, departamentos, condicao, ordem, grupo, grupo_responsavel_user_id, responsavel_depto_id, grupo_responsavel_depto_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
                    [tid, a.titulo, a.descricao || null, a.responsavel_user_id || null, deptJson, a.condicao || null, a.ordem || 0, a.grupo || null, a.grupo_responsavel_user_id || null, a.responsavel_depto_id || null, a.grupo_responsavel_depto_id || null],"""
content = content.replace(POST_OLD, POST_NEW)

# 1.2 GET /api/integ/templates - update JSON gen
GET_OLD = """'grupo_responsavel_user_id', grupo_responsavel_user_id)) FROM (SELECT titulo, grupo, grupo_responsavel_user_id FROM"""
GET_NEW = """'grupo_responsavel_user_id', grupo_responsavel_user_id, 'responsavel_depto_id', responsavel_depto_id, 'grupo_responsavel_depto_id', grupo_responsavel_depto_id)) FROM (SELECT titulo, grupo, grupo_responsavel_user_id, responsavel_depto_id, grupo_responsavel_depto_id FROM"""
content = content.replace(GET_OLD, GET_NEW)


# 1.5 Lógica no onboarding (_condicaoAplicavel) -> Actually this happens AFTER _condicaoAplicavel!
# It happens at: for (const a of acoesFiltradas)
ONBOARD_OLD = """                for (const a of acoesFiltradas) {
                    await new Promise((resolve, reject) =>
                        db.run(`INSERT INTO integracao_passos_status (processo_id, passo_config_id, status, responsavel_user_id, titulo, descricao_custom, is_custom) VALUES (?, NULL, 'pendente', ?, ?, ?, 1)`,
                            [processoId, a.responsavel_user_id || a.grupo_responsavel_user_id || null, a.titulo, a.descricao || null],
                            err => err ? reject(err) : resolve()));
                }"""

ONBOARD_NEW = """                for (const a of acoesFiltradas) {
                    let respFinalId = a.responsavel_user_id;
                    if (!respFinalId && a.responsavel_depto_id) {
                        respFinalId = await new Promise(r => db.get(`SELECT responsavel_id FROM departamentos WHERE id=?`, [a.responsavel_depto_id], (e, row) => r(row ? row.responsavel_id : null)));
                    }
                    if (!respFinalId && a.grupo_responsavel_user_id) respFinalId = a.grupo_responsavel_user_id;
                    if (!respFinalId && a.grupo_responsavel_depto_id) {
                        respFinalId = await new Promise(r => db.get(`SELECT responsavel_id FROM departamentos WHERE id=?`, [a.grupo_responsavel_depto_id], (e, row) => r(row ? row.responsavel_id : null)));
                    }
                    
                    await new Promise((resolve, reject) =>
                        db.run(`INSERT INTO integracao_passos_status (processo_id, passo_config_id, status, responsavel_user_id, titulo, descricao_custom, is_custom) VALUES (?, NULL, 'pendente', ?, ?, ?, 1)`,
                            [processoId, respFinalId || null, a.titulo, a.descricao || null],
                            err => err ? reject(err) : resolve()));
                }"""
content = content.replace(ONBOARD_OLD, ONBOARD_NEW)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("Server patch for Dept Responsibles done!")
