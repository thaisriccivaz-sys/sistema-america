const fs = require('fs');

const code = `
// ══════════════════════════════════════════════════════════════════════
// MÓDULO: TREINAMENTOS PRESENCIAIS
// ══════════════════════════════════════════════════════════════════════

app.get('/api/treinamento-presenca/colaboradores', authenticateToken, (req, res) => {
    db.all("SELECT id, nome_completo, cargo, departamento, status FROM colaboradores WHERE status = 'Ativo' ORDER BY nome_completo", [], (err, colaboradores) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.all("SELECT * FROM treinamentos", [], (errT, treinamentosList) => {
            if (errT) return res.status(500).json({ error: errT.message });
            
            db.all("SELECT * FROM treinamento_colaboradores", [], (errTC, treinCols) => {
                if (errTC) return res.status(500).json({ error: errTC.message });
                
                const resultado = colaboradores.map(c => {
                    const cTreinamentos = treinamentosList.map(t => {
                        const tc = treinCols.find(x => x.colaborador_id === c.id && x.treinamento_id === t.id);
                        return {
                            id: t.id,
                            nome: t.nome,
                            tipo: t.tipo,
                            concluido: tc ? tc.concluido === 1 : false,
                            data_conclusao: tc ? tc.data_conclusao : null
                        };
                    });
                    
                    return {
                        id: c.id,
                        nome_completo: c.nome_completo,
                        cargo: c.cargo,
                        departamento: c.departamento,
                        status: c.status,
                        treinamentos: cTreinamentos,
                        total: cTreinamentos.length,
                        concluidos: cTreinamentos.filter(x => x.concluido).length
                    };
                });
                
                res.json(resultado);
            });
        });
    });
});

app.post('/api/treinamento-presenca/assinar', authenticateToken, async (req, res) => {
    const { colaborador_id, treinamento_id, assinatura_base64, selfie_base64, instrutor_nome, gps_lat, gps_lon, dispositivo } = req.body;
    
    if (!colaborador_id || !treinamento_id || !assinatura_base64) {
        return res.status(400).json({ error: 'Dados incompletos' });
    }

    const agora = new Date(new Date().getTime() - 3*60*60*1000).toISOString().replace('T',' ').substring(0,19);

    db.run("INSERT INTO treinamento_colaboradores (colaborador_id, treinamento_id, concluido, data_conclusao, instrutor_nome) VALUES (?, ?, 1, ?, ?) ON CONFLICT(colaborador_id, treinamento_id) DO UPDATE SET concluido = 1, data_conclusao = ?, instrutor_nome = ?", 
        [colaborador_id, treinamento_id, agora, instrutor_nome, agora, instrutor_nome], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            // Gerar PDF fake ou registrar no documentos se necessário
            // Para simplificar, vamos apenas registrar na auditoria e documentos
            const crypto = require('crypto');
            const hash = crypto.createHash('sha256').update(assinatura_base64 + Date.now()).digest('hex');
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            
            // Inserir no log de documentos para ficar no prontuário (aba Treinamento)
            const fileName = \`Treinamento_\${treinamento_id}_\${Date.now()}.pdf\`;
            db.run("INSERT INTO documentos (colaborador_id, tab_name, document_type, file_name, file_path, year) VALUES (?, 'Treinamento', 'Lista de Presença', ?, 'base64_virtual', ?)", 
                [colaborador_id, fileName, new Date().getFullYear().toString()], function(errDoc) {
                    if (!errDoc) {
                        const newDocId = this.lastID;
                        if (gps_lat || gps_lon || dispositivo) {
                            db.run(\`INSERT INTO assinaturas_auditoria (documento_id, document_type, colaborador_id, colaborador_nome, gps_lat, gps_lon, dispositivo, ip_address, hash_assinatura) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)\`,
                            [newDocId, 'Lista de Presença', colaborador_id, '', gps_lat, gps_lon, dispositivo, ip, hash]);
                        }
                    }
                    res.json({ success: true, data_conclusao: agora });
                });
        });
});

app.get('/api/treinamento-presenca/historico/:id', authenticateToken, (req, res) => {
    db.all("SELECT tc.*, t.nome as treinamento_nome, t.tipo as treinamento_tipo FROM treinamento_colaboradores tc JOIN treinamentos t ON tc.treinamento_id = t.id WHERE tc.colaborador_id = ?", [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});
\n`;

fs.appendFileSync('backend/server.js', code);
