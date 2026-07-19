
# -*- coding: utf-8 -*-
"""
Implementar:
1. Modificar POST /api/integracao/iniciar/:colaboradorId para usar templates por departamento
2. Corrigir GET /api/integracao/processos/:id para suportar passos custom (is_custom=1)
"""
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\server.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

# ─────────────────────────────────────────────────────────────────────────────
# 1. Substituir o endpoint POST /api/integracao/iniciar/:colaboradorId
# ─────────────────────────────────────────────────────────────────────────────
OLD_INICIAR = """app.post('/api/integracao/iniciar/:colaboradorId', authenticateToken, async (req, res) => {
    const colaboradorId = parseInt(req.params.colaboradorId);
    if (!colaboradorId) return res.status(400).json({ error: 'colaborador_id inválido' });
    try {
        const colab = await new Promise((resolve, reject) =>
            db.get(`SELECT c.*, d.tipo as tipo_departamento FROM colaboradores c
                    LEFT JOIN departamentos d ON d.id = c.departamento_id
                    WHERE c.id = ?`, [colaboradorId], (e, r) => e ? reject(e) : resolve(r))
        );
        if (!colab) return res.status(404).json({ error: 'Colaborador não encontrado' });

        const existente = await new Promise((resolve, reject) =>
            db.get(`SELECT id FROM integracao_processos WHERE colaborador_id = ? AND status != 'concluido'`, [colaboradorId], (e, r) => e ? reject(e) : resolve(r))
        );
        if (existente) return res.json({ ok: true, processo_id: existente.id, ja_existia: true });

        const processoId = await new Promise((resolve, reject) =>
            db.run(`INSERT INTO integracao_processos (colaborador_id, status) VALUES (?, 'pendente')`, [colaboradorId],
                function(err) { err ? reject(err) : resolve(this.lastID); })
        );

        const passos = await new Promise((resolve, reject) =>
            db.all(`SELECT p.*, u.nome as responsavel_nome, u.email as responsavel_email
                    FROM integracao_passos_config p
                    LEFT JOIN usuarios u ON u.id = p.responsavel_user_id
                    WHERE p.ativo = 1 ORDER BY p.grupo, p.ordem`, [], (e, r) => e ? reject(e) : resolve(r || []))
        );

        const passosAplicaveis = passos.filter(p => _grupoAplicavel(colab, p.grupo) && _condicaoAplicavel(colab, p.condicao));
        for (const p of passosAplicaveis) {
            await new Promise((resolve, reject) =>
                db.run(`INSERT INTO integracao_passos_status (processo_id, passo_config_id, status, responsavel_user_id) VALUES (?, ?, 'pendente', ?)`,
                    [processoId, p.id, p.responsavel_user_id || null],
                    err => err ? reject(err) : resolve())
            );
        }

        await new Promise((resolve, reject) =>
            db.run(`UPDATE colaboradores SET status = 'Em Integração' WHERE id = ?`, [colaboradorId],
                err => err ? reject(err) : resolve())
        );

        // Enviar e-mails por responsável
        const responsaveisMapa = {};
        for (const p of passosAplicaveis) {
            if (p.responsavel_user_id && p.responsavel_email) {
                if (!responsaveisMapa[p.responsavel_user_id]) {
                    responsaveisMapa[p.responsavel_user_id] = { nome: p.responsavel_nome, email: p.responsavel_email, passos: [] };
                }
                responsaveisMapa[p.responsavel_user_id].passos.push(p);
            }
        }
        const baseUrl = process.env.BASE_URL || 'https://sistema-america.onrender.com';
        for (const resp of Object.values(responsaveisMapa)) {
            try {
                await sendMailHelper({
                    to: resp.email,
                    subject: `🤝 Integração: ${colab.nome_completo} — Atividades Pendentes`,
                    html: gerarEmailIntegracaoHTML({ respNome: resp.nome, nomeColaborador: colab.nome_completo, cargoColaborador: colab.cargo || '', passos: resp.passos, baseUrl })
                });
            } catch(mailErr) {
                console.error('[INTEGRAÇÃO] Erro ao enviar e-mail para', resp.email, mailErr.message);
            }
        }
        console.log(`[INTEGRAÇÃO] Processo ${processoId} criado para colaborador ${colaboradorId} (${passosAplicaveis.length} passos)`);
        res.json({ ok: true, processo_id: processoId, passos_criados: passosAplicaveis.length });
    } catch(e) {
        console.error('[INTEGRAÇÃO] Erro ao iniciar processo:', e.message);
        res.status(500).json({ error: e.message });
    }
});"""

NEW_INICIAR = """app.post('/api/integracao/iniciar/:colaboradorId', authenticateToken, async (req, res) => {
    const colaboradorId = parseInt(req.params.colaboradorId);
    if (!colaboradorId) return res.status(400).json({ error: 'colaborador_id inválido' });
    try {
        const colab = await new Promise((resolve, reject) =>
            db.get(`SELECT c.*, d.tipo as tipo_departamento FROM colaboradores c
                    LEFT JOIN departamentos d ON d.id = c.departamento_id
                    WHERE c.id = ?`, [colaboradorId], (e, r) => e ? reject(e) : resolve(r))
        );
        if (!colab) return res.status(404).json({ error: 'Colaborador não encontrado' });

        const existente = await new Promise((resolve, reject) =>
            db.get(`SELECT id FROM integracao_processos WHERE colaborador_id = ? AND status != 'concluido'`, [colaboradorId], (e, r) => e ? reject(e) : resolve(r))
        );
        if (existente) return res.json({ ok: true, processo_id: existente.id, ja_existia: true });

        const processoId = await new Promise((resolve, reject) =>
            db.run(`INSERT INTO integracao_processos (colaborador_id, status) VALUES (?, 'pendente')`, [colaboradorId],
                function(err) { err ? reject(err) : resolve(this.lastID); })
        );

        // ── Verificar se há template para o departamento do colaborador ──────
        const template = colab.departamento_id
            ? await new Promise(resolve =>
                db.get(`SELECT t.* FROM integracao_templates t
                        WHERE t.departamento_id = ? AND t.ativo = 1
                        LIMIT 1`, [colab.departamento_id], (e, r) => resolve(r || null)))
            : null;

        let passosAplicaveis = [];
        let acoesCustom = [];

        if (template) {
            // ── Com template: usar grupos selecionados + ações exclusivas ────
            console.log(`[INTEGRAÇÃO] Usando template "${template.nome}" (id ${template.id}) para ${colab.nome_completo}`);

            const grupos = await new Promise(resolve =>
                db.all(`SELECT grupo FROM integracao_template_grupos WHERE template_id=?`, [template.id],
                    (e, g) => resolve((g || []).map(x => x.grupo))));

            for (const grupo of grupos) {
                const passosGrupo = await new Promise(resolve =>
                    db.all(`SELECT p.*, u.nome as responsavel_nome, u.email as responsavel_email
                            FROM integracao_passos_config p
                            LEFT JOIN usuarios u ON u.id = p.responsavel_user_id
                            WHERE p.ativo = 1 AND p.grupo = ? ORDER BY p.ordem`, [grupo],
                        (e, r) => resolve(r || [])));
                passosAplicaveis.push(...passosGrupo.filter(p => _condicaoAplicavel(colab, p.condicao)));
            }

            acoesCustom = await new Promise(resolve =>
                db.all(`SELECT a.*, u.nome as responsavel_nome, u.email as responsavel_email
                        FROM integracao_template_acoes_custom a
                        LEFT JOIN usuarios u ON u.id = a.responsavel_user_id
                        WHERE a.template_id = ? AND a.ativo = 1 ORDER BY a.ordem`, [template.id],
                    (e, r) => resolve(r || [])));
            acoesCustom = acoesCustom.filter(a => _condicaoAplicavel(colab, a.condicao));

        } else {
            // ── Sem template: auto-detecção (lógica original) ────────────────
            const todosPassos = await new Promise(resolve =>
                db.all(`SELECT p.*, u.nome as responsavel_nome, u.email as responsavel_email
                        FROM integracao_passos_config p
                        LEFT JOIN usuarios u ON u.id = p.responsavel_user_id
                        WHERE p.ativo = 1 ORDER BY p.grupo, p.ordem`, [], (e, r) => resolve(r || [])));
            passosAplicaveis = todosPassos.filter(p => _grupoAplicavel(colab, p.grupo) && _condicaoAplicavel(colab, p.condicao));
        }

        // ── Inserir passos padrão ────────────────────────────────────────────
        for (const p of passosAplicaveis) {
            await new Promise((resolve, reject) =>
                db.run(`INSERT INTO integracao_passos_status (processo_id, passo_config_id, status, responsavel_user_id) VALUES (?, ?, 'pendente', ?)`,
                    [processoId, p.id, p.responsavel_user_id || null],
                    err => err ? reject(err) : resolve())
            );
        }

        // ── Inserir ações customizadas do template ───────────────────────────
        for (const a of acoesCustom) {
            await new Promise((resolve, reject) =>
                db.run(`INSERT INTO integracao_passos_status (processo_id, passo_config_id, status, responsavel_user_id, titulo, descricao_custom, is_custom) VALUES (?, NULL, 'pendente', ?, ?, ?, 1)`,
                    [processoId, a.responsavel_user_id || null, a.titulo, a.descricao || null],
                    err => err ? reject(err) : resolve())
            );
        }

        await new Promise((resolve, reject) =>
            db.run(`UPDATE colaboradores SET status = 'Em Integração' WHERE id = ?`, [colaboradorId],
                err => err ? reject(err) : resolve())
        );

        // ── Enviar e-mails por responsável ───────────────────────────────────
        const todosPassosEmail = [...passosAplicaveis, ...acoesCustom];
        const responsaveisMapa = {};
        for (const p of todosPassosEmail) {
            if (p.responsavel_user_id && p.responsavel_email) {
                if (!responsaveisMapa[p.responsavel_user_id]) {
                    responsaveisMapa[p.responsavel_user_id] = { nome: p.responsavel_nome, email: p.responsavel_email, passos: [] };
                }
                responsaveisMapa[p.responsavel_user_id].passos.push(p);
            }
        }
        const baseUrl = process.env.BASE_URL || 'https://sistema-america.onrender.com';
        for (const resp of Object.values(responsaveisMapa)) {
            try {
                await sendMailHelper({
                    to: resp.email,
                    subject: `🤝 Integração: ${colab.nome_completo} — Atividades Pendentes`,
                    html: gerarEmailIntegracaoHTML({ respNome: resp.nome, nomeColaborador: colab.nome_completo, cargoColaborador: colab.cargo || '', passos: resp.passos, baseUrl })
                });
            } catch(mailErr) {
                console.error('[INTEGRAÇÃO] Erro ao enviar e-mail para', resp.email, mailErr.message);
            }
        }
        const totalPassos = passosAplicaveis.length + acoesCustom.length;
        console.log(`[INTEGRAÇÃO] Processo ${processoId} criado para ${colab.nome_completo} — ${passosAplicaveis.length} passos padrão + ${acoesCustom.length} ações custom${template ? ` (template: ${template.nome})` : ' (auto)'}`);
        res.json({ ok: true, processo_id: processoId, passos_criados: totalPassos, template_usado: template ? template.nome : null });
    } catch(e) {
        console.error('[INTEGRAÇÃO] Erro ao iniciar processo:', e.message);
        res.status(500).json({ error: e.message });
    }
});"""

assert OLD_INICIAR in content, 'ERRO: bloco OLD_INICIAR não encontrado'
content = content.replace(OLD_INICIAR, NEW_INICIAR, 1)
print('OK: endpoint iniciar atualizado para usar templates')

# ─────────────────────────────────────────────────────────────────────────────
# 2. Corrigir GET /api/integracao/processos/:id para suportar passos custom
#    A query atual faz JOIN obrigatório em integracao_passos_config, o que falha
#    quando passo_config_id = NULL (ações custom). Usamos LEFT JOIN + COALESCE.
# ─────────────────────────────────────────────────────────────────────────────
OLD_DETALHE = """        const stepSql = isAdmin
            ? `SELECT ps.*, pc.titulo, pc.descricao, pc.grupo, pc.condicao, pc.tipo, pc.ordem,
                      u.nome as responsavel_nome
               FROM integracao_passos_status ps
               JOIN integracao_passos_config pc ON pc.id = ps.passo_config_id
               LEFT JOIN usuarios u ON u.id = ps.responsavel_user_id
               WHERE ps.processo_id = ? ORDER BY pc.grupo, pc.ordem`
            : `SELECT ps.*, pc.titulo, pc.descricao, pc.grupo, pc.condicao, pc.tipo, pc.ordem,
                      u.nome as responsavel_nome
               FROM integracao_passos_status ps
               JOIN integracao_passos_config pc ON pc.id = ps.passo_config_id
               LEFT JOIN usuarios u ON u.id = ps.responsavel_user_id
               WHERE ps.processo_id = ? AND ps.responsavel_user_id = ?
               ORDER BY pc.grupo, pc.ordem`;"""

NEW_DETALHE = """        const stepSql = isAdmin
            ? `SELECT ps.*,
                      COALESCE(ps.titulo, pc.titulo)    AS titulo,
                      COALESCE(ps.descricao_custom, pc.descricao) AS descricao,
                      COALESCE(pc.grupo, 'todos')       AS grupo,
                      COALESCE(pc.condicao, '')         AS condicao,
                      COALESCE(pc.tipo, 'checkbox')     AS tipo,
                      COALESCE(pc.ordem, 9999)          AS ordem,
                      u.nome as responsavel_nome
               FROM integracao_passos_status ps
               LEFT JOIN integracao_passos_config pc ON pc.id = ps.passo_config_id
               LEFT JOIN usuarios u ON u.id = ps.responsavel_user_id
               WHERE ps.processo_id = ?
               ORDER BY COALESCE(pc.grupo,'todos'), COALESCE(pc.ordem,9999)`
            : `SELECT ps.*,
                      COALESCE(ps.titulo, pc.titulo)    AS titulo,
                      COALESCE(ps.descricao_custom, pc.descricao) AS descricao,
                      COALESCE(pc.grupo, 'todos')       AS grupo,
                      COALESCE(pc.condicao, '')         AS condicao,
                      COALESCE(pc.tipo, 'checkbox')     AS tipo,
                      COALESCE(pc.ordem, 9999)          AS ordem,
                      u.nome as responsavel_nome
               FROM integracao_passos_status ps
               LEFT JOIN integracao_passos_config pc ON pc.id = ps.passo_config_id
               LEFT JOIN usuarios u ON u.id = ps.responsavel_user_id
               WHERE ps.processo_id = ? AND ps.responsavel_user_id = ?
               ORDER BY COALESCE(pc.grupo,'todos'), COALESCE(pc.ordem,9999)`;"""

assert OLD_DETALHE in content, 'ERRO: bloco OLD_DETALHE não encontrado'
content = content.replace(OLD_DETALHE, NEW_DETALHE, 1)
print('OK: query de detalhe corrigida para suportar passos custom (LEFT JOIN + COALESCE)')

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print('OK: server.js salvo')
