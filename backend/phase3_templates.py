
# -*- coding: utf-8 -*-
"""
FASE 1 — BACKEND
- Tabelas: integ_templates + integ_template_acoes
- Seed: 2 templates padrão (Administrativo e Operacional)
- APIs CRUD completo
- Atualizar iniciar para usar integ_template_acoes
"""
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\server.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

marker = "// ══════════════════════════════════════════════════════════════════════════════\n// MÓDULO: CATEGORIAS E AÇÕES DE INTEGRAÇÃO (novo sistema)"
assert marker in content, "ERRO: marcador do módulo anterior não encontrado"

NEW_CODE = r"""
// ══════════════════════════════════════════════════════════════════════════════
// MÓDULO: TEMPLATES DE INTEGRAÇÃO (por tipo de colaborador)
// ══════════════════════════════════════════════════════════════════════════════

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS integ_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        tipo_key TEXT NOT NULL DEFAULT 'todos',
        descricao TEXT,
        ativo INTEGER NOT NULL DEFAULT 1,
        criado_em TEXT DEFAULT (datetime('now','localtime'))
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS integ_template_acoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER NOT NULL,
        titulo TEXT NOT NULL,
        descricao TEXT,
        responsavel_user_id INTEGER,
        departamentos TEXT DEFAULT 'todos',
        condicao TEXT,
        ordem INTEGER DEFAULT 0,
        ativo INTEGER NOT NULL DEFAULT 1
    )`);

    // Seed: 2 templates padrão
    db.get('SELECT COUNT(*) as cnt FROM integ_templates', [], (err, row) => {
        if (err || (row && row.cnt > 0)) return;

        const seedData = {
            administrativo: [
                { titulo: 'Cartão de Vale Transporte', descricao: 'Providenciar e entregar cartão VT ao colaborador', condicao: 'vt', ordem: 1 },
                { titulo: 'Cartão de VR (Vale Refeição)', descricao: 'Providenciar e entregar cartão de Vale Refeição', condicao: null, ordem: 2 },
                { titulo: 'Cartão VC (Vale Combustível)', descricao: 'Providenciar e entregar cartão de Vale Combustível', condicao: 'vc', ordem: 3 },
                { titulo: 'Montagem de kit de boas-vindas', descricao: 'Preparar e entregar kit de boas-vindas ao colaborador', condicao: null, ordem: 4 },
                { titulo: 'Configurar ponto eletrônico', descricao: 'Cadastrar colaborador no sistema de ponto eletrônico', condicao: null, ordem: 5 },
                { titulo: 'Acesso aos sistemas (TI)', descricao: 'Configurar e-mail, acessos e sistemas necessários ao cargo', condicao: null, ordem: 6 },
                { titulo: 'Apresentação da empresa', descricao: 'Apresentar história, valores e cultura da América Rental', condicao: null, ordem: 7 },
                { titulo: 'Apresentação do time', descricao: 'Apresentar o colaborador à equipe e ao gestor direto', condicao: null, ordem: 8 },
                { titulo: 'Treinamentos específicos do cargo', descricao: 'Realizar treinamentos obrigatórios e específicos da função', condicao: null, ordem: 9 },
                { titulo: 'Entrega de crachá', descricao: 'Providenciar e entregar crachá de identificação', condicao: null, ordem: 10 },
                { titulo: 'Assinatura de documentos admissionais', descricao: 'Garantir assinatura de todos os documentos necessários', condicao: null, ordem: 11 },
                { titulo: 'Acompanhamento 30 dias', descricao: 'Realizar check-in após 30 dias de trabalho', condicao: null, ordem: 12 },
            ],
            operacional: [
                { titulo: 'Cartão de Vale Transporte', descricao: 'Providenciar e entregar cartão VT ao colaborador', condicao: 'vt', ordem: 1 },
                { titulo: 'Cartão de VR (Vale Refeição)', descricao: 'Providenciar e entregar cartão de Vale Refeição', condicao: null, ordem: 2 },
                { titulo: 'Montagem de kit de boas-vindas', descricao: 'Preparar e entregar kit de boas-vindas ao colaborador', condicao: null, ordem: 3 },
                { titulo: 'Configurar ponto eletrônico', descricao: 'Cadastrar colaborador no sistema de ponto eletrônico', condicao: null, ordem: 4 },
                { titulo: 'Entrega de EPIs', descricao: 'Entregar equipamentos de proteção individual obrigatórios', condicao: null, ordem: 5 },
                { titulo: 'Treinamentos de NR', descricao: 'Realizar treinamentos obrigatórios (NR10, NR35, etc.)', condicao: null, ordem: 6 },
                { titulo: 'Apresentação da empresa', descricao: 'Apresentar história, valores e cultura da América Rental', condicao: null, ordem: 7 },
                { titulo: 'Apresentação do time', descricao: 'Apresentar o colaborador à equipe e ao gestor direto', condicao: null, ordem: 8 },
                { titulo: 'Entrega de crachá', descricao: 'Providenciar e entregar crachá de identificação', condicao: null, ordem: 9 },
                { titulo: 'Assinatura de documentos admissionais', descricao: 'Garantir assinatura de todos os documentos necessários', condicao: null, ordem: 10 },
                { titulo: 'Acompanhamento 30 dias', descricao: 'Realizar check-in após 30 dias de trabalho', condicao: null, ordem: 11 },
            ],
        };

        const templateNames = {
            administrativo: 'Integração Administrativo',
            operacional:    'Integração Operacional',
        };

        Object.entries(seedData).forEach(([tipo, acoes]) => {
            db.run(`INSERT INTO integ_templates (nome, tipo_key) VALUES (?, ?)`,
                [templateNames[tipo], tipo],
                function(err) {
                    if (err) { console.error('[INTEG] Seed error:', err.message); return; }
                    const tid = this.lastID;
                    acoes.forEach(a => {
                        db.run(`INSERT INTO integ_template_acoes (template_id, titulo, descricao, condicao, ordem) VALUES (?, ?, ?, ?, ?)`,
                            [tid, a.titulo, a.descricao, a.condicao, a.ordem]);
                    });
                    console.log(`[INTEG] Seed: template "${templateNames[tipo]}" criado (id ${tid})`);
                });
        });
    });
});

// ── GET /api/integ/templates ──────────────────────────────────────────────────
app.get('/api/integ/templates', authenticateToken, (req, res) => {
    db.all(`SELECT t.*,
            (SELECT COUNT(*) FROM integ_template_acoes a WHERE a.template_id=t.id AND a.ativo=1) as total_acoes
            FROM integ_templates t WHERE t.ativo=1 ORDER BY t.tipo_key, t.nome`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// ── GET /api/integ/templates/:id (com ações) ──────────────────────────────────
app.get('/api/integ/templates/:id', authenticateToken, (req, res) => {
    db.get(`SELECT t.* FROM integ_templates t WHERE t.id=? AND t.ativo=1`, [req.params.id], (err, template) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!template) return res.status(404).json({ error: 'Template não encontrado' });
        db.all(`SELECT a.*, u.nome as responsavel_nome
                FROM integ_template_acoes a
                LEFT JOIN usuarios u ON u.id = a.responsavel_user_id
                WHERE a.template_id=? AND a.ativo=1 ORDER BY a.ordem`, [template.id], (e2, acoes) => {
            if (e2) return res.status(500).json({ error: e2.message });
            res.json({ ...template, acoes: acoes || [] });
        });
    });
});

// ── POST /api/integ/templates (criar ou atualizar com ações) ──────────────────
app.post('/api/integ/templates', authenticateToken, async (req, res) => {
    const { id, nome, tipo_key, descricao, acoes } = req.body;
    if (!nome) return res.status(400).json({ error: 'nome é obrigatório' });
    try {
        let tid = id ? parseInt(id) : null;
        if (tid) {
            await new Promise((resolve, reject) =>
                db.run(`UPDATE integ_templates SET nome=?, tipo_key=?, descricao=? WHERE id=?`,
                    [nome, tipo_key || 'todos', descricao || null, tid],
                    err => err ? reject(err) : resolve()));
            await new Promise((resolve, reject) =>
                db.run(`UPDATE integ_template_acoes SET ativo=0 WHERE template_id=?`, [tid],
                    err => err ? reject(err) : resolve()));
        } else {
            tid = await new Promise((resolve, reject) =>
                db.run(`INSERT INTO integ_templates (nome, tipo_key, descricao) VALUES (?, ?, ?)`,
                    [nome, tipo_key || 'todos', descricao || null],
                    function(err) { err ? reject(err) : resolve(this.lastID); }));
        }
        for (const a of (acoes || [])) {
            if (!a.titulo) continue;
            const deptJson = Array.isArray(a.departamentos)
                ? (a.departamentos.includes('todos') ? 'todos' : JSON.stringify(a.departamentos))
                : (a.departamentos || 'todos');
            await new Promise((resolve, reject) =>
                db.run(`INSERT INTO integ_template_acoes (template_id, titulo, descricao, responsavel_user_id, departamentos, condicao, ordem) VALUES (?,?,?,?,?,?,?)`,
                    [tid, a.titulo, a.descricao || null, a.responsavel_user_id || null, deptJson, a.condicao || null, a.ordem || 0],
                    err => err ? reject(err) : resolve()));
        }
        res.json({ ok: true, id: tid });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /api/integ/templates/:id ──────────────────────────────────────────
app.delete('/api/integ/templates/:id', authenticateToken, (req, res) => {
    db.run(`UPDATE integ_templates SET ativo=0 WHERE id=?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ok: true });
    });
});

console.log('[INTEG] Módulo Templates de Integração carregado.');

"""

content = content.replace(marker, NEW_CODE + marker, 1)
print("OK: novas tabelas e APIs de templates inseridas")

# Atualizar iniciar para usar integ_template_acoes
OLD_ELSE = """            if (cntNovas > 0) {
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
            }"""

NEW_ELSE = """            // Novo sistema: buscar template pelo tipo do departamento do colaborador
            const tipoDepto = (colab.tipo_departamento || '').toLowerCase();
            const templateMatch = await new Promise(resolve =>
                db.get(`SELECT t.* FROM integ_templates t WHERE LOWER(t.tipo_key)=? AND t.ativo=1 LIMIT 1`,
                    [tipoDepto], (e, r) => resolve(r || null)));

            if (templateMatch) {
                console.log(`[INTEG] Usando template "${templateMatch.nome}" para ${colab.nome_completo}`);
                const acoesTpl = await new Promise(resolve =>
                    db.all(`SELECT a.*, u.nome as responsavel_nome, u.email as responsavel_email
                            FROM integ_template_acoes a
                            LEFT JOIN usuarios u ON u.id = a.responsavel_user_id
                            WHERE a.template_id=? AND a.ativo=1 ORDER BY a.ordem`,
                        [templateMatch.id], (e, r) => resolve(r || [])));
                const deptoIdStr = String(colab.departamento_id || '');
                const acoesFiltradas = acoesTpl.filter(a => {
                    if (_condicaoAplicavel && !_condicaoAplicavel(colab, a.condicao)) return false;
                    if (!a.departamentos || a.departamentos === 'todos') return true;
                    try {
                        const deptos = JSON.parse(a.departamentos);
                        return deptos.includes(deptoIdStr) || deptos.includes('todos') || deptos.length === 0;
                    } catch { return true; }
                });
                for (const a of acoesFiltradas) {
                    await new Promise((resolve, reject) =>
                        db.run(`INSERT INTO integracao_passos_status (processo_id, passo_config_id, status, responsavel_user_id, titulo, descricao_custom, is_custom) VALUES (?, NULL, 'pendente', ?, ?, ?, 1)`,
                            [processoId, a.responsavel_user_id || null, a.titulo, a.descricao || null],
                            err => err ? reject(err) : resolve()));
                }
                passosAplicaveis = acoesFiltradas; // para e-mail
            } else {
                // Fallback: sistema legado integracao_passos_config
                const todosPassos = await new Promise(resolve =>
                    db.all(`SELECT p.*, u.nome as responsavel_nome, u.email as responsavel_email
                            FROM integracao_passos_config p
                            LEFT JOIN usuarios u ON u.id = p.responsavel_user_id
                            WHERE p.ativo = 1 ORDER BY p.grupo, p.ordem`, [], (e, r) => resolve(r || [])));
                passosAplicaveis = todosPassos.filter(p => _grupoAplicavel(colab, p.grupo) && _condicaoAplicavel(colab, p.condicao));
            }"""

if OLD_ELSE in content:
    content = content.replace(OLD_ELSE, NEW_ELSE, 1)
    print("OK: endpoint iniciar atualizado para usar integ_template_acoes")
else:
    print("AVISO: bloco else do iniciar não encontrado (pode já estar correto)")

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("OK: server.js salvo")
