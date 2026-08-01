
# -*- coding: utf-8 -*-
"""
Fase 1: Backend
- Adiciona 3 novas tabelas (integracao_templates, integracao_template_grupos, integracao_template_acoes_custom)
- Adiciona migration para colunas extras em integracao_passos_status
- Adiciona APIs CRUD de templates
- Insere código ANTES de console.log('[INTEGRAÇÃO] Módulo...')
"""
import re

f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\server.js'

with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

# ── 1. Migration: adicionar colunas em integracao_passos_status (se não existirem) ──────────
# Inserir logo após o CREATE TABLE integracao_passos_status
old_table_end = """    FOREIGN KEY (passo_config_id) REFERENCES integracao_passos_config(id)
    )`);"""

new_table_end = """    FOREIGN KEY (passo_config_id) REFERENCES integracao_passos_config(id)
    )`);

    // Migration: colunas para passos custom (templates por departamento)
    db.run(`ALTER TABLE integracao_passos_status ADD COLUMN titulo TEXT`);
    db.run(`ALTER TABLE integracao_passos_status ADD COLUMN descricao_custom TEXT`);
    db.run(`ALTER TABLE integracao_passos_status ADD COLUMN is_custom INTEGER DEFAULT 0`);

    // Novas tabelas: Templates por Departamento
    db.run(`CREATE TABLE IF NOT EXISTS integracao_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        departamento_id INTEGER,
        descricao TEXT,
        ativo INTEGER NOT NULL DEFAULT 1,
        criado_em TEXT DEFAULT (datetime('now','localtime'))
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS integracao_template_grupos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER NOT NULL,
        grupo TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS integracao_template_acoes_custom (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER NOT NULL,
        titulo TEXT NOT NULL,
        descricao TEXT,
        responsavel_user_id INTEGER,
        condicao TEXT,
        ordem INTEGER DEFAULT 0,
        tipo TEXT DEFAULT 'checkbox',
        ativo INTEGER NOT NULL DEFAULT 1
    )`);"""

assert old_table_end in content, 'ERRO: trecho old_table_end não encontrado'
content = content.replace(old_table_end, new_table_end, 1)
print('✅ Migration de tabelas inserida')

# ── 2. Inserir APIs de templates ANTES do console.log final ──────────────────────────────────
marker = "console.log('[INTEGRAÇÃO] Módulo de Integração de Colaboradores carregado.');"
assert marker in content, 'ERRO: marker final não encontrado'

new_apis = r"""
// ── TEMPLATES POR DEPARTAMENTO ──────────────────────────────────────────────

// GET /api/integracao/templates
app.get('/api/integracao/templates', authenticateToken, (req, res) => {
    db.all(`SELECT t.*, d.nome as departamento_nome
            FROM integracao_templates t
            LEFT JOIN departamentos d ON d.id = t.departamento_id
            WHERE t.ativo = 1
            ORDER BY COALESCE(d.nome,'zzz'), t.nome`, [], async (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!rows || rows.length === 0) return res.json([]);
        try {
            for (const row of rows) {
                row.grupos = await new Promise((resolve, reject) =>
                    db.all(`SELECT grupo FROM integracao_template_grupos WHERE template_id=?`, [row.id],
                        (e, g) => e ? reject(e) : resolve((g || []).map(x => x.grupo))));
                row.acoes_count = await new Promise((resolve, reject) =>
                    db.get(`SELECT COUNT(*) as cnt FROM integracao_template_acoes_custom WHERE template_id=? AND ativo=1`, [row.id],
                        (e, c) => e ? reject(e) : resolve(c ? c.cnt : 0)));
            }
            res.json(rows);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
});

// GET /api/integracao/templates/:id
app.get('/api/integracao/templates/:id', authenticateToken, (req, res) => {
    db.get(`SELECT t.*, d.nome as departamento_nome
            FROM integracao_templates t
            LEFT JOIN departamentos d ON d.id = t.departamento_id
            WHERE t.id = ? AND t.ativo = 1`, [req.params.id], async (err, template) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!template) return res.status(404).json({ error: 'Template não encontrado' });
        try {
            template.grupos = await new Promise((resolve, reject) =>
                db.all(`SELECT grupo FROM integracao_template_grupos WHERE template_id=?`, [template.id],
                    (e, g) => e ? reject(e) : resolve((g || []).map(x => x.grupo))));
            template.acoes_custom = await new Promise((resolve, reject) =>
                db.all(`SELECT a.*, u.nome as responsavel_nome
                        FROM integracao_template_acoes_custom a
                        LEFT JOIN usuarios u ON u.id = a.responsavel_user_id
                        WHERE a.template_id = ? AND a.ativo = 1
                        ORDER BY a.ordem`, [template.id],
                    (e, a) => e ? reject(e) : resolve(a || [])));
            res.json(template);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
});

// POST /api/integracao/templates (criar ou atualizar)
app.post('/api/integracao/templates', authenticateToken, async (req, res) => {
    const { id, nome, departamento_id, descricao, grupos, acoes_custom } = req.body;
    if (!nome) return res.status(400).json({ error: 'nome é obrigatório' });
    try {
        let templateId = id ? parseInt(id) : null;
        if (templateId) {
            await new Promise((resolve, reject) =>
                db.run(`UPDATE integracao_templates SET nome=?, departamento_id=?, descricao=? WHERE id=?`,
                    [nome, departamento_id || null, descricao || null, templateId],
                    err => err ? reject(err) : resolve()));
            await new Promise((resolve, reject) =>
                db.run(`DELETE FROM integracao_template_grupos WHERE template_id=?`, [templateId],
                    err => err ? reject(err) : resolve()));
            await new Promise((resolve, reject) =>
                db.run(`UPDATE integracao_template_acoes_custom SET ativo=0 WHERE template_id=?`, [templateId],
                    err => err ? reject(err) : resolve()));
        } else {
            templateId = await new Promise((resolve, reject) =>
                db.run(`INSERT INTO integracao_templates (nome, departamento_id, descricao) VALUES (?,?,?)`,
                    [nome, departamento_id || null, descricao || null],
                    function (err) { err ? reject(err) : resolve(this.lastID); }));
        }
        for (const grupo of (grupos || [])) {
            await new Promise((resolve, reject) =>
                db.run(`INSERT INTO integracao_template_grupos (template_id, grupo) VALUES (?,?)`,
                    [templateId, grupo], err => err ? reject(err) : resolve()));
        }
        let ordem = 1;
        for (const acao of (acoes_custom || [])) {
            if (!acao.titulo) continue;
            await new Promise((resolve, reject) =>
                db.run(`INSERT INTO integracao_template_acoes_custom (template_id, titulo, descricao, responsavel_user_id, condicao, ordem, tipo) VALUES (?,?,?,?,?,?,?)`,
                    [templateId, acao.titulo, acao.descricao || null, acao.responsavel_user_id || null, acao.condicao || null, acao.ordem || ordem, 'checkbox'],
                    err => err ? reject(err) : resolve()));
            ordem++;
        }
        res.json({ ok: true, id: templateId });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/integracao/templates/:id
app.delete('/api/integracao/templates/:id', authenticateToken, (req, res) => {
    db.run(`UPDATE integracao_templates SET ativo=0 WHERE id=?`, [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ok: true });
    });
});

console.log('[INTEGRAÇÃO] Templates por Departamento carregado.');

"""

content = content.replace(marker, new_apis + marker, 1)
print('✅ APIs de templates inseridas')

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print('✅ server.js salvo')

# Contagem de verificação
print(f"   integracao_templates occurrences: {content.count('integracao_templates')}")
print(f"   /api/integracao/templates occurrences: {content.count('/api/integracao/templates')}")
