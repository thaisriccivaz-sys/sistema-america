const fs = require('fs');
const path = require('path');

// ============================================================
// 1. MIGRATION: database.js - adicionar tabelas de manutenção
// ============================================================
const dbFile = path.join(__dirname, 'backend', 'database.js');
let db = fs.readFileSync(dbFile, 'utf8');

const migracaoManutencao = `
            // ============================================================
            // MANUTENÇÕES DE FROTA
            // ============================================================

            // Tabela de registros de quilometragem dos veículos
            db.run(\`
                CREATE TABLE IF NOT EXISTS frota_quilometragem (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    veiculo_id INTEGER NOT NULL,
                    km_atual INTEGER NOT NULL,
                    data_registro TEXT NOT NULL DEFAULT (date('now')),
                    observacao TEXT,
                    usuario_nome TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (veiculo_id) REFERENCES frota_veiculos(id) ON DELETE CASCADE
                )
            \`);

            // Tabela de manutenções registradas
            db.run(\`
                CREATE TABLE IF NOT EXISTS frota_manutencoes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    veiculo_id INTEGER NOT NULL,
                    tipo TEXT NOT NULL DEFAULT 'preventiva',
                    descricao TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'agendada',
                    km_na_manutencao INTEGER,
                    km_proxima_manutencao INTEGER,
                    data_agendamento TEXT,
                    data_conclusao TEXT,
                    custo REAL,
                    fornecedor TEXT,
                    observacoes TEXT,
                    usuario_nome TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (veiculo_id) REFERENCES frota_veiculos(id) ON DELETE CASCADE
                )
            \`);

            // Tabela de plano de manutenção preventiva por km
            db.run(\`
                CREATE TABLE IF NOT EXISTS frota_plano_preventivo (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT NOT NULL,
                    descricao TEXT,
                    intervalo_km INTEGER NOT NULL,
                    ativo INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            \`, (err) => {
                if (err) return;
                // Seed dos itens preventivos padrão
                const itens = [
                    ['Troca de óleo do motor', 'Trocar óleo e filtro de óleo', 10000],
                    ['Filtro de ar', 'Substituição do filtro de ar do motor', 20000],
                    ['Filtro de combustível', 'Substituição do filtro de combustível', 20000],
                    ['Filtro de cabine (ar condicionado)', 'Substituição do filtro de cabine', 20000],
                    ['Fluido de freio', 'Verificação e troca do fluido de freio', 40000],
                    ['Correia dentada / Correia acessórios', 'Inspeção e troca conforme necessário', 60000],
                    ['Velas de ignição', 'Troca das velas de ignição (motor a gasolina)', 30000],
                    ['Alinhamento e balanceamento', 'Verificação de alinhamento e balanceamento dos pneus', 10000],
                    ['Revisão dos freios (pastilhas/lonas)', 'Inspeção e substituição de pastilhas ou lonas', 40000],
                    ['Verificação do sistema de arrefecimento', 'Inspecionar e trocar fluido do radiador', 40000],
                    ['Fluido de direção hidráulica', 'Verificação e troca do fluido', 40000],
                    ['Revisão elétrica geral', 'Revisão de bateria, alternador e sistema elétrico', 60000],
                    ['Lubrificação de engaxetamentos', 'Lubrificação de juntas, rolamentos e componentes', 20000],
                    ['Calibragem de pneus', 'Verificação da calibragem e estado dos pneus', 5000],
                    ['Limpeza do sistema de injeção', 'Limpeza dos bicos injetores', 40000],
                ];
                itens.forEach(([nome, descricao, km]) => {
                    db.run('INSERT OR IGNORE INTO frota_plano_preventivo (nome, descricao, intervalo_km) VALUES (?,?,?)', [nome, descricao, km]);
                });
            });

            // Migration: adicionar coluna km_atual e em_manutencao nos veículos
            db.all("PRAGMA table_info(frota_veiculos)", (err, rows) => {
                if (err || !rows) return;
                const cols = rows.map(r => r.name);
                if (!cols.includes('km_atual')) db.run("ALTER TABLE frota_veiculos ADD COLUMN km_atual INTEGER DEFAULT 0");
                if (!cols.includes('em_manutencao')) db.run("ALTER TABLE frota_veiculos ADD COLUMN em_manutencao INTEGER DEFAULT 0");
            });

`;

// Insert before the CREDENCIAMENTO block
const credTag = `            // =====================================================================\r\n            // CREDENCIAMENTO`;
if (!db.includes('frota_quilometragem') && db.includes(credTag)) {
    db = db.replace(credTag, migracaoManutencao + credTag);
    fs.writeFileSync(dbFile, db);
    console.log('[DB] Migração de manutenção inserida no database.js');
} else if (db.includes('frota_quilometragem')) {
    console.log('[DB] Migração de manutenção já existe, pulando.');
} else {
    console.log('[DB] Tag de inserção não encontrada, tentando outro ponto...');
    // Fallback: add before module.exports
    const exp = 'module.exports = db;';
    if (db.includes(exp)) {
        db = db.replace(exp, migracaoManutencao.replace(/\r\n/g, '\n') + exp);
        fs.writeFileSync(dbFile, db);
        console.log('[DB] Migração adicionada via fallback.');
    }
}

// ============================================================
// 2. APIS: server.js - endpoints de manutenção
// ============================================================
const serverFile = path.join(__dirname, 'backend', 'server.js');
let srv = fs.readFileSync(serverFile, 'utf8');

const apiManutencao = `
// =====================================================================
// MANUTENÇÕES DE FROTA
// =====================================================================

// GET - listar manutenções (todas ou por veículo)
app.get('/api/frota/manutencoes', authenticateToken, (req, res) => {
    const { veiculo_id } = req.query;
    let sql = \`SELECT m.*, v.placa, v.marca_modelo_versao FROM frota_manutencoes m
                JOIN frota_veiculos v ON v.id = m.veiculo_id\`;
    const params = [];
    if (veiculo_id) {
        sql += ' WHERE m.veiculo_id = ?';
        params.push(veiculo_id);
    }
    sql += ' ORDER BY m.created_at DESC';
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// POST - registrar manutenção
app.post('/api/frota/manutencoes', authenticateToken, (req, res) => {
    const { veiculo_id, tipo, descricao, status, km_na_manutencao, km_proxima_manutencao, data_agendamento, data_conclusao, custo, fornecedor, observacoes } = req.body;
    if (!veiculo_id || !descricao) return res.status(400).json({ error: 'veiculo_id e descricao são obrigatórios' });
    const usuario_nome = req.user?.username || 'sistema';

    db.run(
        \`INSERT INTO frota_manutencoes (veiculo_id, tipo, descricao, status, km_na_manutencao, km_proxima_manutencao, data_agendamento, data_conclusao, custo, fornecedor, observacoes, usuario_nome)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)\`,
        [veiculo_id, tipo||'preventiva', descricao, status||'agendada', km_na_manutencao||null, km_proxima_manutencao||null, data_agendamento||null, data_conclusao||null, custo||null, fornecedor||null, observacoes||null, usuario_nome],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            // Se status é 'em_andamento', marcar veículo como em manutenção
            if (status === 'em_andamento') {
                db.run('UPDATE frota_veiculos SET em_manutencao=1, updated_at=CURRENT_TIMESTAMP WHERE id=?', [veiculo_id]);
            }
            res.json({ id: this.lastID, message: 'Manutenção registrada' });
        }
    );
});

// PUT - atualizar manutenção
app.put('/api/frota/manutencoes/:id', authenticateToken, (req, res) => {
    const { status, descricao, km_na_manutencao, km_proxima_manutencao, data_agendamento, data_conclusao, custo, fornecedor, observacoes, tipo } = req.body;
    const mId = req.params.id;

    db.get('SELECT * FROM frota_manutencoes WHERE id=?', [mId], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Manutenção não encontrada' });

        db.run(
            \`UPDATE frota_manutencoes SET tipo=?, descricao=?, status=?, km_na_manutencao=?, km_proxima_manutencao=?,
             data_agendamento=?, data_conclusao=?, custo=?, fornecedor=?, observacoes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?\`,
            [tipo||row.tipo, descricao||row.descricao, status||row.status, km_na_manutencao, km_proxima_manutencao,
             data_agendamento, data_conclusao, custo, fornecedor, observacoes, mId],
            (err2) => {
                if (err2) return res.status(500).json({ error: err2.message });

                // Sincronizar status do veículo
                if (status === 'em_andamento') {
                    db.run('UPDATE frota_veiculos SET em_manutencao=1, updated_at=CURRENT_TIMESTAMP WHERE id=?', [row.veiculo_id]);
                } else if (status === 'concluida' || status === 'cancelada') {
                    // Verificar se ainda existe outra manutenção em andamento para este veículo
                    db.get("SELECT COUNT(*) as cnt FROM frota_manutencoes WHERE veiculo_id=? AND status='em_andamento' AND id!=?",
                        [row.veiculo_id, mId], (e3, r3) => {
                        if (!r3 || r3.cnt === 0) {
                            db.run('UPDATE frota_veiculos SET em_manutencao=0, updated_at=CURRENT_TIMESTAMP WHERE id=?', [row.veiculo_id]);
                        }
                    });
                    // Se conclusão, atualizar km do veículo
                    if (status === 'concluida' && km_na_manutencao) {
                        db.run('UPDATE frota_veiculos SET km_atual=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [km_na_manutencao, row.veiculo_id]);
                    }
                }
                res.json({ message: 'Manutenção atualizada' });
            }
        );
    });
});

// DELETE - excluir manutenção
app.delete('/api/frota/manutencoes/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM frota_manutencoes WHERE id=?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Manutenção excluída' });
    });
});

// GET - plano preventivo (itens de manutenção preventiva com status por veículo)
app.get('/api/frota/preventivo/:veiculo_id', authenticateToken, (req, res) => {
    const vId = req.params.veiculo_id;
    db.get('SELECT km_atual FROM frota_veiculos WHERE id=?', [vId], (err, veiculo) => {
        if (err || !veiculo) return res.status(404).json({ error: 'Veículo não encontrado' });
        const kmAtual = veiculo.km_atual || 0;

        db.all('SELECT * FROM frota_plano_preventivo WHERE ativo=1', [], (err2, plano) => {
            if (err2) return res.status(500).json({ error: err2.message });

            // Para cada item preventivo, buscar a última manutenção concluída desse tipo
            const promises = (plano || []).map(item => new Promise(resolve => {
                db.get(
                    \`SELECT km_na_manutencao FROM frota_manutencoes
                     WHERE veiculo_id=? AND descricao LIKE ? AND status='concluida'
                     ORDER BY km_na_manutencao DESC LIMIT 1\`,
                    [vId, '%' + item.nome + '%'],
                    (e, ultima) => {
                        const kmUltima = ultima?.km_na_manutencao || 0;
                        const kmProxima = kmUltima + item.intervalo_km;
                        const kmRestante = kmProxima - kmAtual;
                        let statusItem = 'ok'; // verde
                        if (kmRestante <= 0) statusItem = 'vencida';
                        else if (kmRestante <= 1000) statusItem = 'proxima'; // dentro de 1000km
                        resolve({ ...item, km_ultima: kmUltima, km_proxima: kmProxima, km_restante: kmRestante, status_item: statusItem });
                    }
                );
            }));

            Promise.all(promises).then(result => res.json({ km_atual: kmAtual, plano: result }));
        });
    });
});

// PUT - atualizar km do veículo
app.put('/api/frota/veiculos/:id/km', authenticateToken, (req, res) => {
    const { km_atual } = req.body;
    if (!km_atual) return res.status(400).json({ error: 'km_atual é obrigatório' });
    db.run('UPDATE frota_veiculos SET km_atual=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [km_atual, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Quilometragem atualizada' });
    });
});

// GET - status de manutenção de todos os veículos (para os cards)
app.get('/api/frota/status-manutencao', authenticateToken, (req, res) => {
    db.all(\`
        SELECT v.id, v.placa, v.km_atual, v.em_manutencao,
        (SELECT COUNT(*) FROM frota_manutencoes m WHERE m.veiculo_id=v.id AND m.status='em_andamento') as manutencoes_ativas,
        (SELECT COUNT(*) FROM frota_manutencoes m WHERE m.veiculo_id=v.id AND m.status='agendada') as manutencoes_agendadas
        FROM frota_veiculos v
    \`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

`;

// Insert before CREDENCIAMENTO section in server.js
const credSection = '// =====================================================================\r\n// CREDENCIAMENTO DE LOGÍSTICA';
if (!srv.includes("app.get('/api/frota/manutencoes'")) {
    if (srv.includes(credSection)) {
        srv = srv.replace(credSection, apiManutencao + credSection);
    } else {
        // fallback: append before the last app.listen
        const listenTag = '\napp.listen(';
        srv = srv.replace(listenTag, '\n' + apiManutencao + listenTag);
    }
    fs.writeFileSync(serverFile, srv);
    console.log('[SERVER] APIs de manutenção inseridas em server.js');
} else {
    console.log('[SERVER] APIs já existem, pulando.');
}

console.log('\n✅ Passo 1 e 2 concluídos. Agora gere o frota_manutencao.js frontend.');
