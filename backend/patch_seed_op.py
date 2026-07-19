
# -*- coding: utf-8 -*-
import re
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\server.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

migration_code = '''db.run("ALTER TABLE integ_template_acoes ADD COLUMN grupo_responsavel_depto_id INTEGER", [], err => {});
db.run("ALTER TABLE integ_template_acoes ADD COLUMN treinamento_id INTEGER", [], err => {});

// Migration: Add Treinamentos group to Operacional template if missing
db.get(`SELECT id FROM integ_templates WHERE tipo_key = 'operacional'`, [], (err, row) => {
    if (!err && row) {
        db.get(`SELECT id FROM integ_template_acoes WHERE template_id = ? AND (grupo LIKE '%Treinamentos%' OR grupo LIKE '%treinamentos%')`, [row.id], (err2, row2) => {
            if (!err2 && !row2) {
                db.run(`INSERT INTO integ_template_acoes (template_id, titulo, descricao, ordem, grupo, ativo) VALUES (?, 'Ação de Treinamento Padrão (Exemplo)', 'Ação criada automaticamente para manter o grupo.', 99, '4 Treinamentos', 1)`, [row.id], err3 => {
                    if(!err3) console.log("[MIGRATION] Grupo '4 Treinamentos' adicionado ao template Operacional");
                });
            }
        });
    }
});'''

# Wait, `treinamento_id` was added in a previous migration.
# Let's search for `ADD COLUMN grupo_responsavel_depto_id` and just append this block.

regex = r'db\.run\("ALTER TABLE integ_template_acoes ADD COLUMN grupo_responsavel_depto_id INTEGER", \[\], err => \{\}\);\s*(?:db\.run\("ALTER TABLE integ_template_acoes ADD COLUMN treinamento_id INTEGER", \[\], err => \{\}\);)?'

content = re.sub(regex, migration_code, content)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("Added migration to server.js")
