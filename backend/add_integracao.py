
import sys

f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\server.js'

with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

insert_marker = 'app.listen(PORT, () => {'
assert insert_marker in content, 'Marker not found!'

new_code = r"""
// ═══════════════════════════════════════════════════════════════════════════════════
// MÓDULO: INTEGRAÇÃO DE COLABORADORES
// ═══════════════════════════════════════════════════════════════════════════════════

// --- Migration: Tabelas do módulo de integração ---
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS integracao_passos_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        descricao TEXT,
        grupo TEXT NOT NULL DEFAULT 'todos',
        condicao TEXT,
        responsavel_user_id INTEGER,
        ordem INTEGER DEFAULT 0,
        tipo TEXT NOT NULL DEFAULT 'checkbox',
        ativo INTEGER NOT NULL DEFAULT 1,
        criado_em TEXT DEFAULT (datetime('now','localtime'))
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS integracao_processos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        colaborador_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pendente',
        criado_em TEXT DEFAULT (datetime('now','localtime')),
        iniciado_em TEXT,
        concluido_em TEXT,
        FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS integracao_passos_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        processo_id INTEGER NOT NULL,
        passo_config_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pendente',
        responsavel_user_id INTEGER,
        feito_em TEXT,
        obs TEXT,
        FOREIGN KEY (processo_id) REFERENCES integracao_processos(id),
        FOREIGN KEY (passo_config_id) REFERENCES integracao_passos_config(id)
    )`);

    // Seed: passos padrão (só insere se tabela estiver vazia)
    db.get('SELECT COUNT(*) as cnt FROM integracao_passos_config', [], (err, row) => {
        if (err || (row && row.cnt > 0)) return;
        const passosSeed = [
            { titulo: 'Cartão de Vale Transporte', descricao: 'Providenciar e entregar cartão VT ao colaborador', grupo: 'todos', condicao: 'vt', ordem: 1 },
            { titulo: 'Cartão de VR', descricao: 'Providenciar e entregar cartão de Vale Refeição', grupo: 'todos', condicao: null, ordem: 2 },
            { titulo: 'Cartão VC', descricao: 'Providenciar e entregar cartão de Vale Combustível', grupo: 'todos', condicao: 'vc', ordem: 3 },
            { titulo: 'Montagem de kit de boas-vindas', descricao: 'Preparar e entregar kit de boas-vindas ao colaborador', grupo: 'todos', condicao: null, ordem: 4 },
            { titulo: 'Configurar ponto eletrônico', descricao: 'Cadastrar colaborador no sistema de ponto eletrônico', grupo: 'todos', condicao: null, ordem: 5 },
            { titulo: 'Treinamentos específicos', descricao: 'Realizar treinamentos obrigatórios e específicos do cargo', grupo: 'todos', condicao: null, ordem: 6 },
            { titulo: 'Apresentação da empresa', descricao: 'Apresentar história, valores e cultura da América Rental', grupo: 'todos', condicao: null, ordem: 7 },
            { titulo: 'Apresentação do time', descricao: 'Apresentar o colaborador à equipe e ao gestor direto', grupo: 'todos', condicao: null, ordem: 8 },
            { titulo: 'Providenciar mesa', descricao: 'Preparar e organizar mesa de trabalho', grupo: 'administrativo', condicao: null, ordem: 9 },
            { titulo: 'Providenciar cadeira', descricao: 'Providenciar cadeira ergonômica para o posto de trabalho', grupo: 'administrativo', condicao: null, ordem: 10 },
            { titulo: 'Providenciar computador', descricao: 'Preparar e configurar computador', grupo: 'administrativo', condicao: null, ordem: 11 },
            { titulo: 'Criar e-mail Gmail', descricao: 'Criar conta no Gmail e converter para Microsoft', grupo: 'administrativo', condicao: null, ordem: 12 },
            { titulo: 'Criar e-mail Microsoft 365', descricao: 'Criar conta e licença no Microsoft 365', grupo: 'administrativo', condicao: null, ordem: 13 },
            { titulo: 'Criar assinatura de e-mail', descricao: 'Configurar assinatura padrão de e-mail', grupo: 'administrativo', condicao: null, ordem: 14 },
            { titulo: 'Liberar acessos OneDrive', descricao: 'Conceder acesso às pastas compartilhadas no OneDrive', grupo: 'administrativo', condicao: null, ordem: 15 },
            { titulo: 'Configurar Outlook', descricao: 'Instalar e configurar o Outlook no computador', grupo: 'administrativo', condicao: null, ordem: 16 },
            { titulo: 'Instalar impressoras', descricao: 'Configurar impressoras no computador do colaborador', grupo: 'administrativo', condicao: null, ordem: 17 },
            { titulo: 'Providenciar Celular', descricao: 'Separar e preparar celular corporativo', grupo: 'motorista', condicao: null, ordem: 18 },
            { titulo: 'Configurar e-mail Gmail padrão', descricao: 'Configurar conta Gmail padrão no celular', grupo: 'motorista', condicao: null, ordem: 19 },
            { titulo: 'Instalar SimpliRoute', descricao: 'Instalar aplicativo SimpliRoute no celular', grupo: 'motorista', condicao: null, ordem: 20 },
            { titulo: 'Criar senha do SimpliRoute', descricao: 'Criar acesso e senha no SimpliRoute', grupo: 'motorista', condicao: null, ordem: 21 },
            { titulo: 'Criar senha do Cobli', descricao: 'Criar acesso e senha no sistema Cobli', grupo: 'motorista', condicao: null, ordem: 22 },
            { titulo: 'Instalar WhatsApp Business', descricao: 'Instalar e configurar WhatsApp Business', grupo: 'motorista', condicao: null, ordem: 23 },
            { titulo: 'Instalar Controle de acessos', descricao: 'Instalar aplicativo de controle de acessos', grupo: 'motorista', condicao: null, ordem: 24 },
            { titulo: 'Configurar liberação de acesso à localização', descricao: 'Habilitar GPS e permissões de localização', grupo: 'motorista', condicao: null, ordem: 25 },
            { titulo: 'Instalar capa nova', descricao: 'Colocar capa protetora nova no celular', grupo: 'motorista', condicao: null, ordem: 26 },
            { titulo: 'Instalar película nova', descricao: 'Colocar película protetora nova na tela', grupo: 'motorista', condicao: null, ordem: 27 },
            { titulo: 'Incluir etiqueta de patrimônio no celular', descricao: 'Fixar etiqueta de patrimônio no celular', grupo: 'motorista', condicao: null, ordem: 28 },
            { titulo: 'Identificação de armário', descricao: 'Identificar e entregar armário para o colaborador', grupo: 'operacional', condicao: null, ordem: 29 },
            { titulo: 'Conversa com gestor — final da 1ª semana', descricao: 'Reunião de check-in com gestor ao final da primeira semana', grupo: 'acompanhamento', condicao: null, ordem: 30 },
            { titulo: 'Conversa com gestor — 30 dias', descricao: 'Reunião de acompanhamento com gestor após 30 dias', grupo: 'acompanhamento', condicao: null, ordem: 31 },
            { titulo: 'Conversa com RH — 1º período de experiência (45 dias)', descricao: 'Reunião de avaliação com RH ao final do 1º período de experiência', grupo: 'acompanhamento', condicao: null, ordem: 32 },
            { titulo: 'Conversa com RH e Gestor — 2º período de experiência', descricao: 'Reunião de encerramento do período de experiência com RH e gestor', grupo: 'acompanhamento', condicao: null, ordem: 33 },
        ];
        const stmt = db.prepare(`INSERT INTO integracao_passos_config (titulo, descricao, grupo, condicao, ordem) VALUES (?, ?, ?, ?, ?)`);
        passosSeed.forEach(p => stmt.run(p.titulo, p.descricao, p.grupo, p.condicao, p.ordem));
        stmt.finalize();
        console.log('[INTEGRAÇÃO] Seed de passos inserido com sucesso.');
    });
});

// ── Helpers de integração ──────────────────────────────────────────────────────
function _grupoAplicavel(colab, grupo) {
    const tipo = (colab.tipo_departamento || '').toLowerCase();
    const cargo = (colab.cargo || '').toLowerCase();
    if (grupo === 'todos') return true;
    if (grupo === 'administrativo') return tipo === 'administrativo';
    if (grupo === 'motorista') return cargo.includes('motorista');
    if (grupo === 'operacional') return tipo === 'operacional';
    if (grupo === 'acompanhamento') return true;
    return false;
}
function _condicaoAplicavel(colab, condicao) {
    if (!condicao) return true;
    const transporte = (colab.meio_transporte || '').toLowerCase();
    if (condicao === 'vt') return transporte.includes('vt') || transporte.includes('vale transporte') || transporte.includes('vale-transporte');
    if (condicao === 'vc') return transporte.includes('vc') || transporte.includes('combustivel') || transporte.includes('combustível') || transporte.includes('vale combust');
    return true;
}

function gerarEmailIntegracaoHTML({ respNome, nomeColaborador, cargoColaborador, passos, baseUrl }) {
    const apiBase = baseUrl || (process.env.BASE_URL || 'https://sistema-america.onrender.com');
    const logoUrl = `${apiBase}/assets/logo-header.png`;
    const gruposMap = { todos: 'Geral', administrativo: 'Administrativo', motorista: 'Motorista', operacional: 'Operacional', acompanhamento: 'Acompanhamento' };
    const passosHtml = passos.map(p => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:0.88rem;color:#334155;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#f59e0b;margin-right:8px;vertical-align:middle;"></span>
            ${p.titulo}
            ${p.grupo ? `<span style="margin-left:8px;font-size:0.73rem;background:#f0f9ff;color:#0369a1;padding:1px 6px;border-radius:4px;">${gruposMap[p.grupo] || p.grupo}</span>` : ''}
          </td>
        </tr>`).join('');
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Integração — América Rental</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Inter,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">
      <tr><td style="padding:0;text-align:center;border-bottom:1px solid #eee;">
        <img src="${logoUrl}" alt="América Rental" width="600" style="width:100%;max-width:600px;height:auto;display:block;">
      </td></tr>
      <tr><td style="padding:24px 28px 8px;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="width:24px;height:24px;background:#e8f5e9;border-radius:4px;text-align:center;line-height:24px;font-size:14px;">🤝</td>
          <td style="padding-left:10px;">
            <span style="font-size:1.15rem;font-weight:800;color:#0f4c81;">Integração de</span>
            <span style="font-size:1.15rem;font-weight:800;color:#059669;"> Colaborador</span>
          </td>
        </tr></table>
        <div style="height:3px;background:linear-gradient(90deg,#0f4c81,#059669,#f59e0b);border-radius:2px;margin-top:10px;"></div>
      </td></tr>
      <tr><td style="padding:8px 28px 16px;">
        <p style="color:#334155;font-size:0.95rem;margin:0 0 12px;">Olá, <strong>${respNome || 'Responsável'}</strong>,</p>
        <p style="color:#334155;font-size:0.95rem;margin:0 0 16px;">Um novo colaborador foi liberado para integração e você tem atividades pendentes:</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;margin-bottom:16px;">
          <tr><td style="padding:14px 18px;">
            <p style="margin:0 0 4px;color:#334155;font-size:0.9rem;"><strong>Colaborador:</strong> ${nomeColaborador}</p>
            <p style="margin:0;color:#334155;font-size:0.9rem;"><strong>Cargo:</strong> ${cargoColaborador}</p>
          </td></tr>
        </table>
        <p style="color:#334155;font-size:0.9rem;font-weight:700;margin:0 0 8px;">Suas atividades pendentes:</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;margin-bottom:16px;overflow:hidden;">
          ${passosHtml}
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;margin-bottom:20px;">
          <tr><td style="padding:14px 18px;text-align:center;">
            <p style="margin:0;color:#92400e;font-weight:700;font-size:0.9rem;">Acesse o sistema para confirmar cada atividade realizada.</p>
          </td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom:20px;">
          <a href="${apiBase}" style="display:inline-block;background:#0f4c81;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:0.95rem;">Acessar Sistema</a>
        </td></tr></table>
      </td></tr>
      <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 28px;text-align:center;">
        <p style="margin:0;color:#94a3b8;font-size:0.78rem;">América Rental — Sistema de Gestão de Colaboradores | E-mail automático.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

// ── API: Configuração dos passos ───────────────────────────────────────────────
app.get('/api/integracao/config', authenticateToken, (req, res) => {
    db.all(`SELECT p.*, u.nome_completo as responsavel_nome, u.email as responsavel_email
            FROM integracao_passos_config p
            LEFT JOIN usuarios u ON u.id = p.responsavel_user_id
            WHERE p.ativo = 1
            ORDER BY p.grupo, p.ordem`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.get('/api/integracao/config/all', authenticateToken, (req, res) => {
    db.all(`SELECT p.*, u.nome_completo as responsavel_nome, u.email as responsavel_email
            FROM integracao_passos_config p
            LEFT JOIN usuarios u ON u.id = p.responsavel_user_id
            ORDER BY p.grupo, p.ordem`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/integracao/config', authenticateToken, (req, res) => {
    const { id, titulo, descricao, grupo, condicao, responsavel_user_id, ordem, tipo } = req.body;
    if (!titulo || !grupo) return res.status(400).json({ error: 'titulo e grupo são obrigatórios' });
    if (id) {
        db.run(`UPDATE integracao_passos_config SET titulo=?, descricao=?, grupo=?, condicao=?, responsavel_user_id=?, ordem=?, tipo=? WHERE id=?`,
            [titulo, descricao || null, grupo, condicao || null, responsavel_user_id || null, ordem || 0, tipo || 'checkbox', id],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ ok: true, id });
            });
    } else {
        db.run(`INSERT INTO integracao_passos_config (titulo, descricao, grupo, condicao, responsavel_user_id, ordem, tipo) VALUES (?,?,?,?,?,?,?)`,
            [titulo, descricao || null, grupo, condicao || null, responsavel_user_id || null, ordem || 0, tipo || 'checkbox'],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ ok: true, id: this.lastID });
            });
    }
});

app.delete('/api/integracao/config/:id', authenticateToken, (req, res) => {
    db.run(`UPDATE integracao_passos_config SET ativo=0 WHERE id=?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ok: true });
    });
});

// ── API: Iniciar processo de integração ───────────────────────────────────────
app.post('/api/integracao/iniciar/:colaboradorId', authenticateToken, async (req, res) => {
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
            db.all(`SELECT p.*, u.nome_completo as responsavel_nome, u.email as responsavel_email
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
});

// ── API: Listar processos ─────────────────────────────────────────────────────
app.get('/api/integracao/processos', authenticateToken, (req, res) => {
    const userId = req.user && req.user.id;
    const isAdmin = req.user && (req.user.role === 'admin' || req.user.nivel_acesso === 'admin');
    let sql, params;
    if (isAdmin) {
        sql = `SELECT p.*, c.nome_completo, c.cargo, c.foto_base64, c.departamento, c.meio_transporte,
                      d.tipo as tipo_departamento,
                      (SELECT COUNT(*) FROM integracao_passos_status ps WHERE ps.processo_id = p.id AND ps.status = 'pendente') as pendentes,
                      (SELECT COUNT(*) FROM integracao_passos_status ps WHERE ps.processo_id = p.id) as total
               FROM integracao_processos p
               JOIN colaboradores c ON c.id = p.colaborador_id
               LEFT JOIN departamentos d ON d.id = c.departamento_id
               WHERE p.status != 'concluido'
               ORDER BY p.criado_em DESC`;
        params = [];
    } else {
        sql = `SELECT DISTINCT p.*, c.nome_completo, c.cargo, c.foto_base64, c.departamento, c.meio_transporte,
                      d.tipo as tipo_departamento,
                      (SELECT COUNT(*) FROM integracao_passos_status ps WHERE ps.processo_id = p.id AND ps.responsavel_user_id = ? AND ps.status = 'pendente') as pendentes,
                      (SELECT COUNT(*) FROM integracao_passos_status ps WHERE ps.processo_id = p.id AND ps.responsavel_user_id = ?) as total
               FROM integracao_processos p
               JOIN colaboradores c ON c.id = p.colaborador_id
               LEFT JOIN departamentos d ON d.id = c.departamento_id
               JOIN integracao_passos_status ips ON ips.processo_id = p.id AND ips.responsavel_user_id = ?
               WHERE p.status != 'concluido'
               ORDER BY p.criado_em DESC`;
        params = [userId, userId, userId];
    }
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// ── API: Detalhe de um processo ───────────────────────────────────────────────
app.get('/api/integracao/processos/:id', authenticateToken, (req, res) => {
    const processoId = req.params.id;
    const userId = req.user && req.user.id;
    const isAdmin = req.user && (req.user.role === 'admin' || req.user.nivel_acesso === 'admin');
    db.get(`SELECT p.*, c.nome_completo, c.cargo, c.departamento, c.foto_base64, c.meio_transporte,
                   d.tipo as tipo_departamento
            FROM integracao_processos p
            JOIN colaboradores c ON c.id = p.colaborador_id
            LEFT JOIN departamentos d ON d.id = c.departamento_id
            WHERE p.id = ?`, [processoId], (err, processo) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!processo) return res.status(404).json({ error: 'Processo não encontrado' });
        const stepSql = isAdmin
            ? `SELECT ps.*, pc.titulo, pc.descricao, pc.grupo, pc.condicao, pc.tipo, pc.ordem,
                      u.nome_completo as responsavel_nome
               FROM integracao_passos_status ps
               JOIN integracao_passos_config pc ON pc.id = ps.passo_config_id
               LEFT JOIN usuarios u ON u.id = ps.responsavel_user_id
               WHERE ps.processo_id = ? ORDER BY pc.grupo, pc.ordem`
            : `SELECT ps.*, pc.titulo, pc.descricao, pc.grupo, pc.condicao, pc.tipo, pc.ordem,
                      u.nome_completo as responsavel_nome
               FROM integracao_passos_status ps
               JOIN integracao_passos_config pc ON pc.id = ps.passo_config_id
               LEFT JOIN usuarios u ON u.id = ps.responsavel_user_id
               WHERE ps.processo_id = ? AND ps.responsavel_user_id = ?
               ORDER BY pc.grupo, pc.ordem`;
        const stepParams = isAdmin ? [processoId] : [processoId, userId];
        db.all(stepSql, stepParams, (err2, passos) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ ...processo, passos: passos || [] });
        });
    });
});

// ── API: Atualizar status de um passo ────────────────────────────────────────
app.put('/api/integracao/passos-status/:id', authenticateToken, (req, res) => {
    const { status, obs } = req.body;
    if (!['pendente', 'feito', 'nao_aplica'].includes(status)) {
        return res.status(400).json({ error: 'Status inválido. Use: pendente, feito, nao_aplica' });
    }
    const feito_em = status === 'feito' ? new Date().toISOString() : null;
    db.run(`UPDATE integracao_passos_status SET status=?, feito_em=?, obs=? WHERE id=?`,
        [status, feito_em, obs || null, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            db.get(`SELECT ps.processo_id FROM integracao_passos_status ps WHERE ps.id = ?`, [req.params.id], (e, row) => {
                if (!row) return res.json({ ok: true });
                db.get(`SELECT COUNT(*) as pendentes FROM integracao_passos_status WHERE processo_id = ? AND status = 'pendente'`,
                    [row.processo_id], (e2, cnt) => {
                        if (!e2 && cnt && cnt.pendentes === 0) {
                            db.run(`UPDATE integracao_processos SET status='concluido', concluido_em=datetime('now','localtime') WHERE id=?`,
                                [row.processo_id]);
                        }
                        res.json({ ok: true });
                    });
            });
        });
});

// ── API: Badge — pendências do usuário logado ─────────────────────────────────
app.get('/api/integracao/notificacoes/count', authenticateToken, (req, res) => {
    const userId = req.user && req.user.id;
    const isAdmin = req.user && (req.user.role === 'admin' || req.user.nivel_acesso === 'admin');
    const sql = isAdmin
        ? `SELECT COUNT(*) as cnt FROM integracao_passos_status ps
           JOIN integracao_processos p ON p.id = ps.processo_id
           WHERE ps.status = 'pendente' AND p.status != 'concluido'`
        : `SELECT COUNT(*) as cnt FROM integracao_passos_status ps
           JOIN integracao_processos p ON p.id = ps.processo_id
           WHERE ps.status = 'pendente' AND ps.responsavel_user_id = ? AND p.status != 'concluido'`;
    const params = isAdmin ? [] : [userId];
    db.get(sql, params, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ count: (row && row.cnt) || 0 });
    });
});

// ── API: Marcar processo como iniciado ────────────────────────────────────────
app.put('/api/integracao/processos/:id/iniciar', authenticateToken, (req, res) => {
    db.run(`UPDATE integracao_processos SET status='em_andamento', iniciado_em=datetime('now','localtime') WHERE id=? AND status='pendente'`,
        [req.params.id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ ok: true });
        });
});

console.log('[INTEGRAÇÃO] Módulo de Integração de Colaboradores carregado.');

"""

content = content.replace(insert_marker, new_code + '\n' + insert_marker)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

# Verify
found = 'MÓDULO: INTEGRAÇÃO DE COLABORADORES' in content
print(f'Module marker found: {found}')
print(f'New file size: {len(content)} chars')
