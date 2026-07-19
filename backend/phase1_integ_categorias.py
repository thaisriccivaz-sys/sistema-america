
# -*- coding: utf-8 -*-
"""
FASE 1 — BACKEND
- Criar tabelas integ_categorias e integ_acoes
- Seed automático dos 33 passos existentes
- APIs CRUD de categorias e ações
- Modificar endpoint iniciar para usar novas tabelas
"""
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\server.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

# Inserir ANTES de app.listen
marker = "app.listen(PORT, () => {"
assert marker in content, "ERRO: app.listen nao encontrado"

NEW_CODE = r"""
// ══════════════════════════════════════════════════════════════════════════════
// MÓDULO: CATEGORIAS E AÇÕES DE INTEGRAÇÃO (novo sistema)
// ══════════════════════════════════════════════════════════════════════════════

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS integ_categorias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        cor TEXT NOT NULL DEFAULT '#0f4c81',
        ordem INTEGER DEFAULT 0,
        ativo INTEGER NOT NULL DEFAULT 1
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS integ_acoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        categoria_id INTEGER,
        titulo TEXT NOT NULL,
        descricao TEXT,
        departamentos TEXT DEFAULT 'todos',
        responsavel_user_id INTEGER,
        condicao TEXT,
        ordem INTEGER DEFAULT 0,
        ativo INTEGER NOT NULL DEFAULT 1
    )`);

    // Seed automático: migra integracao_passos_config → novas tabelas (uma única vez)
    db.get('SELECT COUNT(*) as cnt FROM integ_categorias', [], (err, row) => {
        if (err || (row && row.cnt > 0)) return;

        const grupos = [
            { grupo: 'todos',         nome: 'Para Todos',     cor: '#0f4c81', ordem: 1 },
            { grupo: 'administrativo',nome: 'Administrativo', cor: '#7c3aed', ordem: 2 },
            { grupo: 'motorista',     nome: 'Motorista',      cor: '#d97706', ordem: 3 },
            { grupo: 'operacional',   nome: 'Operacional',    cor: '#059669', ordem: 4 },
            { grupo: 'acompanhamento',nome: 'Acompanhamento', cor: '#dc2626', ordem: 5 },
        ];

        const catMap = {};
        let done = 0;

        grupos.forEach(g => {
            db.run(
                `INSERT INTO integ_categorias (nome, cor, ordem) VALUES (?, ?, ?)`,
                [g.nome, g.cor, g.ordem],
                function(err) {
                    if (!err) catMap[g.grupo] = this.lastID;
                    done++;
                    if (done === grupos.length) {
                        // Migrar passos existentes
                        db.all(`SELECT * FROM integracao_passos_config WHERE ativo=1 ORDER BY grupo, ordem`, [], (e, passos) => {
                            if (e || !passos) return;
                            passos.forEach((p, i) => {
                                const catId = catMap[p.grupo] || catMap['todos'];
                                db.run(
                                    `INSERT INTO integ_acoes (categoria_id, titulo, descricao, departamentos, responsavel_user_id, condicao, ordem) VALUES (?,?,?,?,?,?,?)`,
                                    [catId, p.titulo, p.descricao || null, 'todos', p.responsavel_user_id || null, p.condicao || null, p.ordem || i+1]
                                );
                            });
                            console.log(`[INTEG] Seed: ${passos.length} passos migrados para integ_acoes`);
                        });
                    }
                }
            );
        });
    });
});

// ── GET /api/integ/categorias ─────────────────────────────────────────────────
app.get('/api/integ/categorias', authenticateToken, (req, res) => {
    db.all(`SELECT c.*, 
            (SELECT COUNT(*) FROM integ_acoes a WHERE a.categoria_id=c.id AND a.ativo=1) as total_acoes
            FROM integ_categorias c WHERE c.ativo=1 ORDER BY c.ordem, c.nome`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// ── POST /api/integ/categorias (criar ou atualizar) ───────────────────────────
app.post('/api/integ/categorias', authenticateToken, (req, res) => {
    const { id, nome, cor, ordem } = req.body;
    if (!nome) return res.status(400).json({ error: 'nome é obrigatório' });
    if (id) {
        db.run(`UPDATE integ_categorias SET nome=?, cor=?, ordem=? WHERE id=?`,
            [nome, cor || '#0f4c81', ordem || 0, id],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ ok: true, id });
            });
    } else {
        db.run(`INSERT INTO integ_categorias (nome, cor, ordem) VALUES (?,?,?)`,
            [nome, cor || '#0f4c81', ordem || 0],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ ok: true, id: this.lastID });
            });
    }
});

// ── DELETE /api/integ/categorias/:id ─────────────────────────────────────────
app.delete('/api/integ/categorias/:id', authenticateToken, (req, res) => {
    db.run(`UPDATE integ_categorias SET ativo=0 WHERE id=?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ok: true });
    });
});

// ── GET /api/integ/acoes ──────────────────────────────────────────────────────
app.get('/api/integ/acoes', authenticateToken, (req, res) => {
    const { categoria_id } = req.query;
    let sql = `SELECT a.*, c.nome as categoria_nome, c.cor as categoria_cor,
                      u.nome as responsavel_nome
               FROM integ_acoes a
               LEFT JOIN integ_categorias c ON c.id = a.categoria_id
               LEFT JOIN usuarios u ON u.id = a.responsavel_user_id
               WHERE a.ativo=1`;
    const params = [];
    if (categoria_id) { sql += ' AND a.categoria_id=?'; params.push(categoria_id); }
    sql += ' ORDER BY c.ordem, c.nome, a.ordem, a.titulo';
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// ── POST /api/integ/acoes (criar ou atualizar) ────────────────────────────────
app.post('/api/integ/acoes', authenticateToken, (req, res) => {
    const { id, categoria_id, titulo, descricao, departamentos, responsavel_user_id, condicao, ordem } = req.body;
    if (!titulo) return res.status(400).json({ error: 'titulo é obrigatório' });
    const deptJson = Array.isArray(departamentos)
        ? (departamentos.includes('todos') ? 'todos' : JSON.stringify(departamentos))
        : (departamentos || 'todos');
    if (id) {
        db.run(`UPDATE integ_acoes SET categoria_id=?, titulo=?, descricao=?, departamentos=?, responsavel_user_id=?, condicao=?, ordem=? WHERE id=?`,
            [categoria_id || null, titulo, descricao || null, deptJson, responsavel_user_id || null, condicao || null, ordem || 0, id],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ ok: true, id });
            });
    } else {
        db.run(`INSERT INTO integ_acoes (categoria_id, titulo, descricao, departamentos, responsavel_user_id, condicao, ordem) VALUES (?,?,?,?,?,?,?)`,
            [categoria_id || null, titulo, descricao || null, deptJson, responsavel_user_id || null, condicao || null, ordem || 0],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ ok: true, id: this.lastID });
            });
    }
});

// ── DELETE /api/integ/acoes/:id ───────────────────────────────────────────────
app.delete('/api/integ/acoes/:id', authenticateToken, (req, res) => {
    db.run(`UPDATE integ_acoes SET ativo=0 WHERE id=?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ok: true });
    });
});

console.log('[INTEG] Módulo Categorias/Ações carregado.');

"""

content = content.replace(marker, NEW_CODE + marker, 1)
print("OK: tabelas, seed e APIs inseridos")

# ─────────────────────────────────────────────────────────────────────────────
# Modificar endpoint iniciar para usar integ_acoes se houver dados
# Adicionar helper de departamento
# ─────────────────────────────────────────────────────────────────────────────
OLD_FILTER = """        const passosAplicaveis = passos.filter(p => _grupoAplicavel(colab, p.grupo) && _condicaoAplicavel(colab, p.condicao));
        for (const p of passosAplicaveis) {
            await new Promise((resolve, reject) =>
                db.run(`INSERT INTO integracao_passos_status (processo_id, passo_config_id, status, responsavel_user_id) VALUES (?, ?, 'pendente', ?)`,
                    [processoId, p.id, p.responsavel_user_id || null],
                    err => err ? reject(err) : resolve())
            );
        }"""

# Find the real OLD_INICIAR block we modified previously
# The new version already checks for templates; now we also need to check integ_acoes
# Find the block that builds passosAplicaveis after getting "template" check
OLD_ELSE_BLOCK = """        } else {
            // ── Sem template: auto-detecção (lógica original) ────────────────
            const todosPassos = await new Promise(resolve =>
                db.all(`SELECT p.*, u.nome as responsavel_nome, u.email as responsavel_email
                        FROM integracao_passos_config p
                        LEFT JOIN usuarios u ON u.id = p.responsavel_user_id
                        WHERE p.ativo = 1 ORDER BY p.grupo, p.ordem`, [], (e, r) => resolve(r || [])));
            passosAplicaveis = todosPassos.filter(p => _grupoAplicavel(colab, p.grupo) && _condicaoAplicavel(colab, p.condicao));
        }"""

NEW_ELSE_BLOCK = """        } else {
            // ── Sem template: verificar novo sistema (integ_acoes) ────────────
            const cntNovas = await new Promise(resolve =>
                db.get(`SELECT COUNT(*) as cnt FROM integ_acoes WHERE ativo=1`, [], (e, r) => resolve(r?.cnt || 0)));

            if (cntNovas > 0) {
                // Novo sistema: filtrar por departamento_id do colaborador
                const todasAcoes = await new Promise(resolve =>
                    db.all(`SELECT a.*, u.nome as responsavel_nome, u.email as responsavel_email
                            FROM integ_acoes a
                            LEFT JOIN usuarios u ON u.id = a.responsavel_user_id
                            WHERE a.ativo=1 ORDER BY a.categoria_id, a.ordem`, [], (e, r) => resolve(r || [])));
                const deptoId = String(colab.departamento_id || '');
                passosAplicaveis = todasAcoes.filter(a => {
                    if (_condicaoAplicavel && !_condicaoAplicavel(colab, a.condicao)) return false;
                    if (!a.departamentos || a.departamentos === 'todos') return true;
                    try {
                        const deptos = JSON.parse(a.departamentos);
                        return deptos.includes(deptoId) || deptos.includes('todos') || deptos.length === 0;
                    } catch { return true; }
                });
                // Inserir como passos custom (passo_config_id = NULL)
                for (const a of passosAplicaveis) {
                    await new Promise((resolve, reject) =>
                        db.run(`INSERT INTO integracao_passos_status (processo_id, passo_config_id, status, responsavel_user_id, titulo, descricao_custom, is_custom) VALUES (?, NULL, 'pendente', ?, ?, ?, 1)`,
                            [processoId, a.responsavel_user_id || null, a.titulo, a.descricao || null],
                            err => err ? reject(err) : resolve()));
                }
                // Pular o bloco de inserção padrão abaixo
                passosAplicaveis = []; // já inseridos acima
            } else {
                // Fallback: sistema legado integracao_passos_config
                const todosPassos = await new Promise(resolve =>
                    db.all(`SELECT p.*, u.nome as responsavel_nome, u.email as responsavel_email
                            FROM integracao_passos_config p
                            LEFT JOIN usuarios u ON u.id = p.responsavel_user_id
                            WHERE p.ativo = 1 ORDER BY p.grupo, p.ordem`, [], (e, r) => resolve(r || [])));
                passosAplicaveis = todosPassos.filter(p => _grupoAplicavel(colab, p.grupo) && _condicaoAplicavel(colab, p.condicao));
            }
        }"""

if OLD_ELSE_BLOCK in content:
    content = content.replace(OLD_ELSE_BLOCK, NEW_ELSE_BLOCK, 1)
    print("OK: endpoint iniciar modificado para usar integ_acoes")
else:
    print("AVISO: bloco else do iniciar não encontrado — pode já ter sido modificado")

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("OK: server.js salvo")
