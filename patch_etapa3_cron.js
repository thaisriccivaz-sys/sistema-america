const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

const anchor = `// Roda às 3:00 da manhã para verificar o período de férias
cron.schedule('0 3 * * *', () => {
    console.log('[CRON 03:00] Verificando ferias equipes...');
    verificarFeriasEquipes();
}, { timezone: 'America/Sao_Paulo' });

// Executa na inicialização`;

const replacement = `// Roda às 3:00 da manhã para verificar o período de férias
cron.schedule('0 3 * * *', () => {
    console.log('[CRON 03:00] Verificando ferias equipes...');
    verificarFeriasEquipes();
}, { timezone: 'America/Sao_Paulo' });

// ── CRON COMISSÃO: Dia 26 às 08h → gera links e envia emails ────────────
cron.schedule('0 8 26 * *', async () => {
    console.log('[CRON-COMISSAO] Dia 26 — gerando links e enviando emails de comissão...');
    const hoje = new Date();
    const mes = hoje.getMonth() + 1;
    const ano = hoje.getFullYear();
    try {
        // Buscar colaboradores do Comercial
        const colabs = await new Promise((resolve, reject) => {
            db.all(\`SELECT c.id, c.nome_completo, c.email_corporativo, c.email
                    FROM colaboradores c
                    WHERE (LOWER(c.departamento) LIKE '%comercial%')
                    AND c.status = 'Ativo'\`,
                [], (err, rows) => err ? reject(err) : resolve(rows || [])
            );
        });
        const mesesNomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        const mesNome = mesesNomes[mes - 1];
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT) || 587,
            secure: false, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });
        let enviados = 0;
        for (const c of colabs) {
            // Criar/garantir registro e link
            const token = require('crypto').randomBytes(16).toString('hex');
            await new Promise(resolve => {
                db.run(\`INSERT INTO fechamento_comissao (mes, ano, colaborador_id, link_token)
                        VALUES (?,?,?,?)
                        ON CONFLICT(mes, ano, colaborador_id) DO UPDATE SET
                            link_token = COALESCE(link_token, excluded.link_token)\`,
                    [mes, ano, c.id, token], resolve);
            });
            const row = await new Promise(resolve => {
                db.get('SELECT link_token, preenchido_em FROM fechamento_comissao WHERE mes=? AND ano=? AND colaborador_id=?',
                    [mes, ano, c.id], (e, r) => resolve(r));
            });
            if (row && row.preenchido_em) continue; // já preenchido, não reenviar
            const emailDest = c.email_corporativo || c.email;
            if (!emailDest) continue;
            const appUrl = process.env.APP_URL || '';
            const link = \`\${appUrl}/comissao/\${row ? row.link_token : token}\`;
            try {
                await transporter.sendMail({
                    from: process.env.SMTP_FROM || process.env.SMTP_USER,
                    to: emailDest,
                    subject: \`[América Rental] Informe sua comissão — \${mesNome}/\${ano}\`,
                    html: \`<div style="font-family:sans-serif;max-width:500px;">
                        <h2 style="color:#1e40af;">Comissão — \${mesNome}/\${ano}</h2>
                        <p>Olá, <strong>\${c.nome_completo.split(' ')[0]}</strong>!</p>
                        <p>Por favor, informe os dados de comissão de <strong>\${mesNome}/\${ano}</strong>:</p>
                        <p style="text-align:center;margin:2rem 0;">
                            <a href="\${link}" style="background:#1e40af;color:#fff;padding:.8rem 2rem;border-radius:.5rem;text-decoration:none;font-weight:bold;">
                                📝 Preencher Comissão
                            </a>
                        </p>
                        <p style="color:#6b7280;font-size:.85rem;">Link: <a href="\${link}">\${link}</a></p>
                        <p style="color:#6b7280;font-size:.85rem;">Att, América Rental — RH</p>
                    </div>\`
                });
                enviados++;
            } catch(emailErr) {
                console.error(\`[CRON-COMISSAO] Erro ao enviar para \${c.nome_completo}: \${emailErr.message}\`);
            }
        }
        console.log(\`[CRON-COMISSAO] Dia 26: \${enviados} emails enviados.\`);
    } catch(e) {
        console.error('[CRON-COMISSAO Dia26] Erro:', e.message);
    }
}, { timezone: 'America/Sao_Paulo' });

// ── CRON COMISSÃO: Diário às 08h → reenviar pendentes (após dia 26) ─────
cron.schedule('30 8 * * *', async () => {
    const hoje = new Date();
    if (hoje.getDate() <= 26) return; // só reenviar após o dia 26
    console.log('[CRON-COMISSAO-REENVIO] Verificando comissões não preenchidas...');
    const mes = hoje.getMonth() + 1;
    const ano = hoje.getFullYear();
    try {
        const pendentes = await new Promise((resolve, reject) => {
            db.all(\`SELECT fc.link_token, c.nome_completo, c.email_corporativo, c.email
                    FROM fechamento_comissao fc
                    JOIN colaboradores c ON fc.colaborador_id = c.id
                    WHERE fc.mes=? AND fc.ano=? AND fc.preenchido_em IS NULL AND fc.link_token IS NOT NULL\`,
                [mes, ano], (err, rows) => err ? reject(err) : resolve(rows || [])
            );
        });
        if (!pendentes.length) return;
        const mesesNomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        const mesNome = mesesNomes[mes - 1];
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT) || 587,
            secure: false, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });
        const appUrl = process.env.APP_URL || '';
        for (const p of pendentes) {
            const emailDest = p.email_corporativo || p.email;
            if (!emailDest) continue;
            const link = \`\${appUrl}/comissao/\${p.link_token}\`;
            try {
                await transporter.sendMail({
                    from: process.env.SMTP_FROM || process.env.SMTP_USER,
                    to: emailDest,
                    subject: \`[América Rental] ⚠️ Comissão pendente — \${mesNome}/\${ano}\`,
                    html: \`<div style="font-family:sans-serif;max-width:500px;">
                        <h2 style="color:#dc2626;">⚠️ Comissão ainda não preenchida</h2>
                        <p>Olá, <strong>\${p.nome_completo.split(' ')[0]}</strong>.</p>
                        <p>Sua comissão de <strong>\${mesNome}/\${ano}</strong> ainda não foi informada. Por favor, preencha o quanto antes:</p>
                        <p style="text-align:center;margin:2rem 0;">
                            <a href="\${link}" style="background:#dc2626;color:#fff;padding:.8rem 2rem;border-radius:.5rem;text-decoration:none;font-weight:bold;">
                                📝 Preencher Agora
                            </a>
                        </p>
                        <p style="color:#6b7280;font-size:.85rem;">Att, América Rental — RH</p>
                    </div>\`
                });
                console.log(\`[CRON-COMISSAO-REENVIO] Reenviado para \${p.nome_completo}\`);
            } catch(e) {
                console.error(\`[CRON-COMISSAO-REENVIO] Erro: \${e.message}\`);
            }
        }
    } catch(e) {
        console.error('[CRON-COMISSAO-REENVIO] Erro:', e.message);
    }
}, { timezone: 'America/Sao_Paulo' });

// Executa na inicialização`;

if (!code.includes(anchor.slice(0, 80))) {
    console.error('ERRO: âncora não encontrada!');
    process.exit(1);
}
code = code.replace(anchor, replacement);
console.log('Crons inseridos:', code.includes('CRON-COMISSAO-REENVIO'));
fs.writeFileSync('backend/server.js', code, 'utf8');
console.log('Salvo! Tamanho:', code.length);
