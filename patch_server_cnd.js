const fs = require('fs');
const file = 'backend/server.js';
let c = fs.readFileSync(file, 'utf8');

// 1. Injetar Rotas Publicas
const rotasPublicas = `
// ============================================================================
// API PUBLICA - CNDs
// ============================================================================
app.get('/api/public/cnd/:token', (req, res) => {
    const token = req.params.token;
    db.get('SELECT * FROM cnd_upload_tokens WHERE token = ?', [token], (err, row) => {
        if (err) return res.status(500).json({ error: 'Erro no servidor' });
        if (!row) return res.status(404).json({ error: 'Link inválido, já utilizado ou expirado.' });

        db.get('SELECT empresa, nome, validade FROM licencas WHERE nome = ?', [row.cnd_nome], (errLic, rowLic) => {
            if (errLic) return res.status(500).json({ error: 'Erro interno.' });
            res.json({
                cnd_nome: row.cnd_nome,
                empresa: rowLic ? rowLic.empresa : 'Não definida',
                validade_atual: rowLic ? rowLic.validade : null
            });
        });
    });
});

app.post('/api/public/cnd/:token', upload.single('file'), (req, res) => {
    const token = req.params.token;
    const novaValidade = req.body.validade;
    
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    if (!novaValidade) return res.status(400).json({ error: 'Data de validade não informada.' });

    db.get('SELECT cnd_nome FROM cnd_upload_tokens WHERE token = ?', [token], async (err, row) => {
        if (err) return res.status(500).json({ error: 'Erro no servidor' });
        if (!row) return res.status(404).json({ error: 'Link inválido ou expirado.' });

        try {
            // Fazer upload para o R2 / Cloudflare
            const url_cloudinary = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype);
            const dataIso = novaValidade; // assumindo formato YYYY-MM-DD
            
            // Verifica se a licenca existe
            db.get('SELECT id FROM licencas WHERE nome = ?', [row.cnd_nome], (errLic, licRow) => {
                if (errLic) throw errLic;
                
                if (licRow) {
                    // Update
                    const sql = "UPDATE licencas SET file_name = ?, file_type = ?, file_data = NULL, url_cloudinary = ?, validade = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
                    db.run(sql, [req.file.originalname, req.file.mimetype, url_cloudinary, dataIso, licRow.id], function(errUpd) {
                        if (errUpd) return res.status(500).json({ error: errUpd.message });
                        db.run('DELETE FROM cnd_upload_tokens WHERE token = ?', [token]); // apaga token
                        res.json({ success: true, message: 'Documento atualizado com sucesso.' });
                    });
                } else {
                    return res.status(400).json({ error: 'Licença base não encontrada no sistema para ser atualizada.' });
                }
            });
        } catch (uploadErr) {
            console.error('[Public CND] Erro upload R2:', uploadErr);
            res.status(500).json({ error: 'Erro ao fazer upload do arquivo' });
        }
    });
});
`;

// Insert the public routes near other public routes. We can just append it before `module.exports = app;`
c = c.replace(/module\.exports = app;/, match => rotasPublicas + '\n' + match);

// 2. Injetar a Lógica do Cron 
const cronLogic = `
        // -- VERIFICAÇÃO DE CNDs ----------------------------------------------------
        // CNDs vencidas ou no dia de vencer (validade <= hoje) e notificar 'atualizacao_cnds'
        try {
            console.log('[CRON] Verificando CNDs vencidas para notificação por e-mail...');
            const cndNomes = ['CND Estadual', 'CND Federal', 'CND Municipal', 'CND Trabalhista'];
            const placeholders = cndNomes.map(()=>'?').join(',');
            
            // Buscar CNDs que estão vencidas (validade <= hoje)
            const sqlCnd = \`SELECT * FROM licencas WHERE nome IN (\${placeholders}) AND validade <= date('now')\`;
            
            db.all(sqlCnd, cndNomes, async (errCnd, cndsVencidas) => {
                if (errCnd) {
                    console.error('[CRON CND] Erro ao buscar CNDs vencidas:', errCnd);
                    return;
                }
                
                if (cndsVencidas.length > 0) {
                    // Tem CND vencida. Precisa gerar links de upload e mandar e-mail.
                    // 1. Quem deve receber?
                    db.all(\"SELECT usuario_id FROM config_notificacoes WHERE tipo = 'atualizacao_cnds'\", [], async (errN, rowsN) => {
                        if (errN || !rowsN || rowsN.length === 0) return;
                        
                        const requireCrypto = require('crypto');
                        const urlFrontend = process.env.URL_FRONTEND || 'https://sistema.americarental.com.br'; // Ajustar de acordo com producao

                        for (const cnd of cndsVencidas) {
                            const token = requireCrypto.randomBytes(24).toString('hex');
                            // Registra token no DB (se ja existir outro pra msm CND hj, ignorar ou substituir)
                            // Para simplificar, vou dar DELETE nos antigos pra essa CND e INSERT do novo
                            await new Promise(r => db.run('DELETE FROM cnd_upload_tokens WHERE cnd_nome = ?', [cnd.nome], r));
                            await new Promise(r => db.run('INSERT INTO cnd_upload_tokens (token, cnd_nome) VALUES (?, ?)', [token, cnd.nome], r));

                            const link = \`\${urlFrontend}/renovar-cnd.html?token=\${token}\`;
                            
                            const htmlMail = \`
                                <p>A licença <strong>\${cnd.nome}</strong> (\${cnd.empresa}) encontra-se vencida (desde \${cnd.validade}).</p>
                                <p>Por favor, faça a emissão do documento atualizado e anexe-o diretamente através do botão abaixo para regularizar a situação no sistema.</p>
                                <div style="text-align:center; margin: 30px 0;">
                                    <a href="\${link}" style="background-color: #d9480f; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Anexar \${cnd.nome}</a>
                                </div>
                                <p style="font-size:12px; color:#94a3b8;">*Este link expira assim que o envio for concluído com sucesso.</p>
                            \`;

                            sendEmailParaNotificados('atualizacao_cnds', {
                                subject: \`[URGENTE] Renovação Necessária: \${cnd.nome}\`,
                                html: htmlMail
                            });
                        }
                    });
                }
            });
        } catch(cronCndErr) {
            console.error('[CRON CND] Erro geral:', cronCndErr);
        }
`;

const regexCron = /cron\.schedule\('0 8 \* \* \*', \(\) => {[\s\S]*?_cronUltimaExecucao = new Date\(\)\.toISOString\(\);/;

c = c.replace(regexCron, match => match + '\n' + cronLogic);

fs.writeFileSync(file, c);
console.log('Rotas inseridas com sucesso!');
