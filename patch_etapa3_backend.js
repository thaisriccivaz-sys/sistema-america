const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

// ─── ÂNCORA: logo após o bloco enviar-email ───
const anchor = '// POST: Salvar/atualizar dados do fechamento (upsert por colaborador)\napp.post(\'/api/recibos/salvar\'';

if (!code.includes(anchor)) {
    console.error('ERRO: âncora não encontrada!');
    process.exit(1);
}

// ─── CÓDIGO DA ETAPA 3 ───
const etapa3 = `
// ═══════════════════════════════════════════════════════════════════
// FECHAMENTO — ETAPA 3: Comissão + Parser PDF Folha Contabilidade
// ═══════════════════════════════════════════════════════════════════

// ── Migração: tabela email_contabilidade_config ─────────────────
db.run(\`CREATE TABLE IF NOT EXISTS fechamento_email_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chave TEXT UNIQUE,
    valor TEXT
)\`, () => {});

// ── POST: Gerar links de comissão para o mês ────────────────────
// Busca colaboradores do depto Comercial, cria registro em fechamento_comissao
// e gera link único. Retorna os links para exibição/envio.
app.post('/api/fechamento/gerar-links-comissao', authenticateToken, async (req, res) => {
    const { mes, ano } = req.body;
    if (!mes || !ano) return res.status(400).json({ error: 'mes e ano obrigatórios' });
    try {
        // Buscar colaboradores do departamento Comercial (ativos)
        const colabs = await new Promise((resolve, reject) => {
            db.all(\`SELECT c.id, c.nome_completo, c.email_corporativo, c.email
                    FROM colaboradores c
                    JOIN departamentos d ON c.departamento = d.nome
                    WHERE (LOWER(d.nome) LIKE '%comercial%' OR LOWER(c.departamento) LIKE '%comercial%')
                    AND c.status = 'Ativo'\`,
                [], (err, rows) => err ? reject(err) : resolve(rows || [])
            );
        });
        const links = [];
        for (const c of colabs) {
            const token = require('crypto').randomBytes(16).toString('hex');
            const emailColab = c.email_corporativo || c.email || null;
            await new Promise((resolve) => {
                db.run(\`INSERT INTO fechamento_comissao (mes, ano, colaborador_id, link_token)
                        VALUES (?, ?, ?, ?)
                        ON CONFLICT(mes, ano, colaborador_id) DO UPDATE SET
                            link_token = COALESCE(link_token, excluded.link_token)\`,
                    [mes, ano, c.id, token], resolve
                );
            });
            // Buscar o token atual (pode já existir)
            const row = await new Promise((resolve) => {
                db.get('SELECT link_token FROM fechamento_comissao WHERE mes=? AND ano=? AND colaborador_id=?',
                    [mes, ano, c.id], (e, r) => resolve(r));
            });
            const linkToken = row ? row.link_token : token;
            links.push({
                colaborador_id: c.id,
                nome: c.nome_completo,
                email: emailColab,
                link: \`\${process.env.APP_URL || ''}/comissao/\${linkToken}\`,
                token: linkToken
            });
        }
        res.json({ ok: true, links });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// ── GET: Status das comissões de um mês ────────────────────────
app.get('/api/fechamento/comissao-status/:ano/:mes', authenticateToken, (req, res) => {
    db.all(\`SELECT fc.*, c.nome_completo, c.email_corporativo, c.email
            FROM fechamento_comissao fc
            JOIN colaboradores c ON fc.colaborador_id = c.id
            WHERE fc.mes = ? AND fc.ano = ?\`,
        [req.params.mes, req.params.ano],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows || []);
        }
    );
});

// ── POST: Enviar emails de comissão manualmente ─────────────────
app.post('/api/fechamento/enviar-emails-comissao', authenticateToken, async (req, res) => {
    const { mes, ano, link_tokens } = req.body; // link_tokens: array opcional para reenvio específico
    if (!mes || !ano) return res.status(400).json({ error: 'mes e ano obrigatórios' });
    try {
        let query = \`SELECT fc.*, c.nome_completo, c.email_corporativo, c.email
                     FROM fechamento_comissao fc
                     JOIN colaboradores c ON fc.colaborador_id = c.id
                     WHERE fc.mes = ? AND fc.ano = ? AND fc.link_token IS NOT NULL\`;
        const params = [mes, ano];
        if (link_tokens && link_tokens.length) {
            query += ' AND fc.link_token IN (' + link_tokens.map(() => '?').join(',') + ')';
            params.push(...link_tokens);
        } else {
            query += ' AND fc.preenchido_em IS NULL'; // só os não preenchidos
        }
        const rows = await new Promise((resolve, reject) => {
            db.all(query, params, (err, r) => err ? reject(err) : resolve(r || []));
        });
        if (!rows.length) return res.json({ ok: true, enviados: 0, mensagem: 'Nenhum pendente para enviar.' });

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT) || 587,
            secure: false, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });
        const mesesNomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        const mesNome = mesesNomes[parseInt(mes) - 1] || mes;
        let enviados = 0;
        const erros = [];

        for (const row of rows) {
            const emailDest = row.email_corporativo || row.email;
            if (!emailDest) { erros.push(\`\${row.nome_completo}: sem email\`); continue; }
            const appUrl = process.env.APP_URL || '';
            const link = \`\${appUrl}/comissao/\${row.link_token}\`;
            try {
                await transporter.sendMail({
                    from: process.env.SMTP_FROM || process.env.SMTP_USER,
                    to: emailDest,
                    subject: \`[América Rental] Informe sua comissão — \${mesNome}/\${ano}\`,
                    html: \`<div style="font-family:sans-serif;max-width:500px;">
                        <h2 style="color:#1e40af;">Comissão — \${mesNome}/\${ano}</h2>
                        <p>Olá, <strong>\${row.nome_completo.split(' ')[0]}</strong>!</p>
                        <p>Por favor, informe os dados de comissão referentes ao mês de <strong>\${mesNome}/\${ano}</strong> clicando no botão abaixo:</p>
                        <p style="text-align:center;margin:2rem 0;">
                            <a href="\${link}" style="background:#1e40af;color:#fff;padding:.8rem 2rem;border-radius:.5rem;text-decoration:none;font-weight:bold;font-size:1rem;">
                                📝 Preencher Comissão
                            </a>
                        </p>
                        <p style="color:#6b7280;font-size:.85rem;">Ou acesse diretamente: <a href="\${link}">\${link}</a></p>
                        <p style="color:#6b7280;font-size:.85rem;">Att, América Rental — RH</p>
                    </div>\`
                });
                enviados++;
            } catch(emailErr) {
                erros.push(\`\${row.nome_completo}: \${emailErr.message}\`);
            }
        }
        res.json({ ok: true, enviados, erros, total: rows.length });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// ── POST: Upload e parse do PDF da folha da contabilidade ───────
app.post('/api/fechamento/upload-folha-contabilidade', authenticateToken, uploadFoto.single('pdf'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(req.file.buffer);
        const text = data.text || '';
        // Parser: extrair por colaborador
        // Formato típico da folha: cada colaborador começa com matrícula ou nome em maiúsculas
        // Linhas com rubricas têm código + descrição + valor
        const linhas = text.split('\\n').map(l => l.trim()).filter(Boolean);
        const resultado = [];
        let colaboradorAtual = null;
        let rubricas = [];

        // Padrão: linha de colaborador começa com NOME EM MAIÚSCULAS (nome completo)
        // Rubricas: linhas com padrão "CÓDIGO DESCRIÇÃO QUANTIDADE/HORAS VALOR"
        const reColabNome = /^([A-ZÁÉÍÓÚÂÊÔÃÕÀÜÇÑ][A-ZÁÉÍÓÚÂÊÔÃÕÀÜÇ ]{5,})$/;
        const reRubrica = /^(\\d{2,5})\\s+(.+?)\\s+([0-9.,]+)\\s+([0-9.,]+)\\s*$/;
        const reSalario = /DIAS\\s+NORMAIS|8781|SALDO\\s+SAL/i;

        for (const linha of linhas) {
            const mColab = linha.match(reColabNome);
            if (mColab && linha.length < 60 && !linha.match(/\\d/)) {
                if (colaboradorAtual && rubricas.length) {
                    resultado.push({ nome: colaboradorAtual, rubricas: [...rubricas] });
                }
                colaboradorAtual = linha.trim();
                rubricas = [];
                continue;
            }
            const mRub = linha.match(reRubrica);
            if (mRub && colaboradorAtual) {
                rubricas.push({
                    codigo: mRub[1],
                    descricao: mRub[2].trim(),
                    quantidade: mRub[3],
                    valor: parseFloat(mRub[4].replace(',', '.')) || 0
                });
            }
        }
        if (colaboradorAtual && rubricas.length) {
            resultado.push({ nome: colaboradorAtual, rubricas });
        }

        // Retornar resultado bruto E análise de divergências (se colaboradores do banco enviados)
        res.json({ ok: true, total_colaboradores: resultado.length, colaboradores: resultado });
    } catch(e) {
        console.error('[upload-folha-contabilidade]', e);
        res.status(500).json({ error: e.message });
    }
});

// ── POST: Conferência — comparar folha com fechamento salvo ─────
app.post('/api/fechamento/conferir', authenticateToken, async (req, res) => {
    try {
        const { mes, ano, colaboradores_folha } = req.body;
        // colaboradores_folha: array de { nome, rubricas }
        if (!mes || !ano || !Array.isArray(colaboradores_folha)) {
            return res.status(400).json({ error: 'Parâmetros inválidos' });
        }
        // Buscar dados do fechamento salvo
        const fech = await new Promise((resolve, reject) => {
            db.all(\`SELECT c.nome_completo, c.salario, c.cpf,
                           fm.extra_60, fm.extra_100, fm.farmacia, fm.academia,
                           fm.consignado, fm.vt, fm.multas, fm.mercado, fm.outros,
                           fm.dias_falta, fm.horas_atraso, fm.plr, fm.comissao
                    FROM colaboradores c
                    LEFT JOIN fechamento_mensal fm ON fm.colaborador_id = c.id AND fm.mes=? AND fm.ano=?
                    WHERE c.status != 'Desligado'\`,
                [mes, ano], (err, rows) => err ? reject(err) : resolve(rows || [])
            );
        });

        const CODIGOS_CONFERENCIA = {
            '8781': 'salario_base',
            '264': 'extra_60',
            '200': 'extra_100',
            '238': 'farmacia',
            '278': 'academia',
            '9750': 'consignado',
            '48': 'vt_desc',
            '8069': 'atraso_desc',
            '8060': 'atraso_desc',
        };

        const divergencias = [];
        for (const cf of colaboradores_folha) {
            // Encontrar no fechamento por nome (fuzzy)
            const nomeNorm = cf.nome.toLowerCase().trim();
            const fRow = fech.find(f => {
                const fn = (f.nome_completo || '').toLowerCase();
                return fn.includes(nomeNorm.split(' ')[0]) || nomeNorm.includes(fn.split(' ')[0]);
            });
            if (!fRow) continue;

            const divColab = [];
            for (const rub of (cf.rubricas || [])) {
                const campo = CODIGOS_CONFERENCIA[rub.codigo];
                if (!campo) continue;
                let valorFechamento = null;
                if (campo === 'salario_base') valorFechamento = parseFloat(fRow.salario) || 0;
                else if (campo === 'extra_60') {
                    const h = (fRow.extra_60 || '').split(':').map(Number);
                    const hFloat = (h[0] || 0) + (h[1] || 0) / 60;
                    valorFechamento = Math.round(hFloat * ((parseFloat(fRow.salario) || 0) / 220) * 1.6 * 100) / 100;
                } else if (campo === 'extra_100') {
                    const h = (fRow.extra_100 || '').split(':').map(Number);
                    const hFloat = (h[0] || 0) + (h[1] || 0) / 60;
                    valorFechamento = Math.round(hFloat * ((parseFloat(fRow.salario) || 0) / 220) * 2.0 * 100) / 100;
                } else {
                    valorFechamento = parseFloat(fRow[campo]) || 0;
                }
                const diff = Math.abs((rub.valor || 0) - valorFechamento);
                if (diff > 0.10) { // tolerância de R$0,10 (arredondamentos)
                    divColab.push({
                        codigo: rub.codigo,
                        descricao: rub.descricao,
                        valor_folha: rub.valor,
                        valor_fechamento: valorFechamento,
                        diferenca: Math.round(diff * 100) / 100
                    });
                }
            }
            if (divColab.length) {
                divergencias.push({ nome: cf.nome, divergencias: divColab });
            }
        }
        res.json({ ok: true, total_divergencias: divergencias.length, divergencias });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// ── GET/POST: Config email contabilidade ────────────────────────
app.get('/api/fechamento/config', authenticateToken, (req, res) => {
    db.all('SELECT chave, valor FROM fechamento_email_config', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const cfg = {};
        (rows || []).forEach(r => { cfg[r.chave] = r.valor; });
        res.json(cfg);
    });
});
app.post('/api/fechamento/config', authenticateToken, (req, res) => {
    const entries = Object.entries(req.body);
    if (!entries.length) return res.status(400).json({ error: 'Nenhum dado' });
    db.serialize(() => {
        const stmt = db.prepare(\`INSERT INTO fechamento_email_config (chave, valor) VALUES (?,?)
            ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor\`);
        for (const [k, v] of entries) stmt.run([k, v]);
        stmt.finalize();
        res.json({ ok: true });
    });
});

// POST: Salvar/atualizar dados do fechamento (upsert por colaborador)
app.post('/api/recibos/salvar'`;

code = code.replace(anchor, etapa3);
console.log('Etapa 3 inserida:', code.includes('/api/fechamento/gerar-links-comissao'));
console.log('Parser folha inserido:', code.includes('upload-folha-contabilidade'));
console.log('Conferir inserido:', code.includes('/api/fechamento/conferir'));
console.log('Comissao status inserido:', code.includes('comissao-status'));
console.log('Enviar emails comissao inserido:', code.includes('enviar-emails-comissao'));

fs.writeFileSync('backend/server.js', code, 'utf8');
console.log('server.js salvo! Tamanho:', code.length);
