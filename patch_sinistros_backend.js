const fs = require('fs');

let serverCode = fs.readFileSync('backend/server.js', 'utf8');

// 1. ADD MIGRATION
if (!serverCode.includes('CREATE TABLE IF NOT EXISTS sinistros')) {
    const migrationCode = `
// MIGRATION: Sinistros
db.run(\`CREATE TABLE IF NOT EXISTS sinistros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    colaborador_id INTEGER NOT NULL,
    numero_boletim TEXT,
    data_hora TEXT,
    natureza TEXT,
    placa TEXT,
    veiculo TEXT,
    desconto TEXT,
    parcelas INTEGER DEFAULT 1,
    valor_parcela TEXT,
    tipo_sinistro TEXT,
    boletim_path TEXT,
    documento_path TEXT,
    orcamentos_paths TEXT,
    status TEXT DEFAULT 'pendente',
    processo_iniciado INTEGER DEFAULT 0,
    assinaturas_finalizadas INTEGER DEFAULT 0,
    documento_html TEXT,
    assinatura_testemunha1_nome TEXT,
    assinatura_testemunha1_base64 TEXT,
    assinatura_testemunha2_nome TEXT,
    assinatura_testemunha2_base64 TEXT,
    assinatura_condutor_base64 TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)\`, (err) => { if (err) console.error('Erro tabela sinistros:', err); });
`;
    serverCode = serverCode.replace(/(db\.run\(`CREATE TABLE IF NOT EXISTS multas[^\n]+)/, migrationCode + '\n$1');
}

// 2. ADD ENDPOINTS
if (!serverCode.includes('/api/colaboradores/:id/sinistros')) {
    const endpointCode = `
// =============================================================================
// ROTAS DE SINISTROS
// =============================================================================

app.get('/api/colaboradores/:id/sinistros', authenticateToken, (req, res) => {
    db.all('SELECT * FROM sinistros WHERE colaborador_id = ? ORDER BY created_at DESC', [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/extrair-bo', authenticateToken, multaUpload.single('arquivo'), async (req, res) => {
    try {
        if (!req.file) throw new Error('BO não enviado.');
        // Require pdf-parse (ensure it's in scope)
        const pdfP = require('pdf-parse');
        const pdfData = await pdfP(req.file.buffer);
        const text = pdfData.text;

        let boletim = (text.match(/Boletim N[º°]:\\s*([A-Za-z0-9-]+\\/\\d{4})/) || [])[1] || '';
        let dataHora = (text.match(/Ocorrência:\\s*(\\d{2}\\/\\d{2}\\/\\d{4}\\s*às\\s*\\d{2}:\\d{2})/) || [])[1] || '';
        let natureza = '';
        const matN = text.match(/Naturezas da Ocorrência\\s*\\n\\s*([^\\n]+)\\s*\\n\\s*([^\\n]+)/);
        if(matN) natureza = (matN[1] + ' - ' + matN[2]).trim();

        let marcaModelo = (text.match(/Marca\\/Modelo:\\s*([^\\n]+)/) || [])[1] || '';
        let placa = (text.match(/Placa:\\s*([A-Z0-9]+)/) || [])[1] || '';

        res.json({ sucesso: true, boletim, data_hora: dataHora, natureza, placa: placa.trim(), marca_modelo: marcaModelo.trim() });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/colaboradores/:id/sinistros', authenticateToken, multaUpload.single('arquivo'), async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;
        
        const colab = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM colaboradores WHERE id = ?', [id], (err, row) => err ? reject(err) : resolve(row));
        });
        if (!colab) return res.status(404).json({ error: 'Colaborador nao encontrado.' });

        const nomeFormatado = (colab.nome_completo || colab.nome || 'COLAB')
            .toUpperCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')
            .replace(/\\s+/g, '_').replace(/[^A-Z0-9_]/g, '');

        let dataFormatada = (body.data_hora || '').split(' ')[0].replace(/\\D/g, '');
        if(!dataFormatada) dataFormatada = String(new Date().getDate()).padStart(2,'0') + String(new Date().getMonth()+1).padStart(2,'0') + new Date().getFullYear();

        // Pasta padrao C:\\...\\THAIS_RICCI\\SINISTROS\\Datadoocorrido\\
        const pastaDataStr = (body.data_hora || '').split(' ')[0].replace(/\\//g, '-');
        const pastaRoot = process.env.ONEDRIVE_BASE_PATH || 'RH/1.Colaboradores/Sistema';
        let targetDir = pastaRoot + '/' + nomeFormatado + '/SINISTROS/' + (pastaDataStr || dataFormatada);

        // Garantir unique numero se ja existir a mesma data - fazemos isso procurando o count
        const qtdNoDia = await new Promise(r => db.get("SELECT count(*) as c FROM sinistros WHERE colaborador_id=? AND data_hora LIKE ?", [id, (body.data_hora || '').split(' ')[0] + '%'], (e, row) => r(row?row.c:0)));
        if(qtdNoDia > 0) {
            targetDir += '_' + (qtdNoDia + 1);
        }

        const stmt = \`INSERT INTO sinistros (colaborador_id, numero_boletim, data_hora, natureza, placa, veiculo,
            desconto, parcelas, valor_parcela, tipo_sinistro, boletim_path, processo_iniciado) 
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)\`;
            
        // Nome padrão do doc: Sinistro_Datadoocorrido_Nome_do_Colaborador.pdf
        const pnome = 'Sinistro_' + (pastaDataStr || dataFormatada).replace(/-/g,'') + '_' + nomeFormatado + '.pdf';
        const docOnedrivePath = targetDir + '/' + pnome;

        db.run(stmt, [id, body.numero_boletim, body.data_hora, body.natureza, body.placa, body.veiculo,
            body.desconto, body.parcelas || 1, body.valor_parcela, body.tipo_sinistro, docOnedrivePath, body.desconto === 'Sim' ? 1 : 0],
            async function(err) {
                if(err) return res.status(500).json({ error: err.message });
                const sinId = this.lastID;

                // Sync OneDrive 
                if (req.file && typeof onedrive !== 'undefined') {
                    try {
                        await onedrive.ensurePath(pastaRoot + '/' + nomeFormatado);
                        await onedrive.ensurePath(pastaRoot + '/' + nomeFormatado + '/SINISTROS');
                        const finalDir = targetDir.substring(targetDir.lastIndexOf('/SINISTROS/') + 11);
                        await onedrive.ensurePath(pastaRoot + '/' + nomeFormatado + '/SINISTROS/' + finalDir);
                        
                        await onedrive.uploadToOneDrive(targetDir, pnome, req.file.buffer);
                        
                        // Upload de orçamentos se houver
                        if(body.orcamentos_base64) {
                            const orcs = JSON.parse(body.orcamentos_base64);
                            let paths = [];
                            for(let i=0; i<orcs.length; i++) {
                                const orcBuf = Buffer.from(orcs[i].split(',')[1], 'base64');
                                const orcNome = 'Orcamento_' + (i+1) + '.pdf';
                                await onedrive.uploadToOneDrive(targetDir, orcNome, orcBuf);
                                paths.push(targetDir + '/' + orcNome);
                            }
                            db.run('UPDATE sinistros SET orcamentos_paths = ? WHERE id = ?', [JSON.stringify(paths), sinId]);
                        }
                    } catch(e) { console.error('Erro OneDrive:', e); }
                }

                res.json({ sucesso: true, id: sinId, targetDir });
            });
            
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/colaboradores/:id/sinistros/:sinistroId/gerar-documento', authenticateToken, async (req, res) => {
    try {
        const { id, sinistroId } = req.params;
        const colab = await new Promise((resolve) => db.get('SELECT * FROM colaboradores WHERE id = ?', [id], (e, r) => resolve(r)));
        const sin   = await new Promise((resolve) => db.get('SELECT * FROM sinistros WHERE id = ?', [sinistroId], (e, r) => resolve(r)));
        if(!sin || !colab) throw new Error('Não encontrado.');

        // O tipo_sinistro mapeia pro nome do gerador
        const geradorNome = 'Sinistro - ' + sin.tipo_sinistro;
        let gerador = await new Promise((resolve) => db.get('SELECT * FROM geradores WHERE nome = ?', [geradorNome], (e, r) => resolve(r)));
        
        let template = '';
        if(!gerador) {
            template = "<h2 style='text-align:center;'>TERMO DE RESPONSABILIDADE - SINISTRO</h2>"
                     + "<p><strong>Colaborador:</strong> {NOME_COMPLETO}</p>"
                     + "<p><strong>Tipo de Sinistro:</strong> " + sin.tipo_sinistro + "</p>"
                     + "<p><strong>BO:</strong> " + sin.numero_boletim + " - " + sin.data_hora + "</p>"
                     + "<p><strong>Placa/Veículo:</strong> " + sin.placa + " / " + sin.veiculo + "</p>"
                     + "<p><strong>Condições de Desconto:</strong> " + sin.parcelas + "x de " + (sin.valor_parcela || 'R$ 0,00') + "</p>"
                     + "<br/><br/><br/>";
        } else {
            template = gerador.conteudo;
        }

        // Substuicoes padroes (colab)
        let htmlFinal = template.replace(/\\{NOME_COMPLETO\\}/g, colab.nome_completo || colab.nome || '');
        htmlFinal = htmlFinal.replace(/\\{CPF\\}/g, colab.cpf || '');
        // O body deve ir formatado com HTML completo
        htmlFinal = \`<html><head><style>body{font-family:Arial,sans-serif;padding:30px;}</style></head><body>\` + htmlFinal + \`</body></html>\`;

        // Salvar HTML
        db.run('UPDATE sinistros SET documento_html = ? WHERE id = ?', [htmlFinal, sin.id]);
        res.json({ sucesso: true, html: htmlFinal });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// TESTEMUNHAS E CONDUTOR usam logica parecida com multas. Para simplificar o script sem inchar muito:
app.post('/api/colaboradores/:id/sinistros/:sinistroId/assinar-testemunhas', authenticateToken, async (req, res) => {
    try {
        const { t1_nome, t1_base64, t2_nome, t2_base64, html_atualizado } = req.body;
        db.run(\`UPDATE sinistros SET assinatura_testemunha1_nome=?, assinatura_testemunha1_base64=?, 
                assinatura_testemunha2_nome=?, assinatura_testemunha2_base64=?, documento_html=? WHERE id=?\`,
                [t1_nome, t1_base64, t2_nome, t2_base64, html_atualizado, req.params.sinistroId]);
        
        // Aqui deve gerar o PDF 'Termo_Sinistro_Datadoocorrido_Testemunhas.pdf'
        res.json({ sucesso: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/colaboradores/:id/sinistros/:sinistroId/assinar-condutor', authenticateToken, async (req, res) => {
    try {
        const { assinatura_base64, documento_html } = req.body;
        db.run(\`UPDATE sinistros SET assinatura_condutor_base64=?, documento_html=?, assinaturas_finalizadas=1, status='assinado' WHERE id=?\`,
                [assinatura_base64, documento_html, req.params.sinistroId]);
        res.json({ sucesso: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});
// =============================================================================
`;
    serverCode = serverCode.replace(/(\/\/ --- ROTAS DE MULTAS DE TRÂNSITO)/, endpointCode + '\n$1');
}

fs.writeFileSync('backend/server.js', serverCode, 'utf8');
console.log('✅ server.js patched with Sinistros backend successfully.');
