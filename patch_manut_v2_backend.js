const fs = require('fs');

// ============================================================
// 1. BACKEND: server.js — adicionar intervalo_dias no plano preventivo
//    e novo endpoint para checar alertas de manutenção dos cards
// ============================================================
let srv = fs.readFileSync('backend/server.js', 'utf8');

// Migration para adicionar intervalo_dias ao plano preventivo
const migKm = `// Migration: campos adicionais de manutenção para dashboard`;
const migExtra = `// Migration: adicionar intervalo_dias ao plano preventivo
            db.all("PRAGMA table_info(frota_plano_preventivo)", (err, rows) => {
                if (err || !rows) return;
                const cols = rows.map(r => r.name);
                if (!cols.includes('intervalo_dias')) {
                    db.run("ALTER TABLE frota_plano_preventivo ADD COLUMN intervalo_dias INTEGER");
                    // Seed padrão de dias para itens já existentes
                    db.run("UPDATE frota_plano_preventivo SET intervalo_dias=365 WHERE nome LIKE '%correia%' OR nome LIKE '%Correia%'");
                    db.run("UPDATE frota_plano_preventivo SET intervalo_dias=365 WHERE nome LIKE '%arrefecimento%'");
                    db.run("UPDATE frota_plano_preventivo SET intervalo_dias=180 WHERE nome LIKE '%freio%' OR nome LIKE '%Freio%'");
                    db.run("UPDATE frota_plano_preventivo SET intervalo_dias=90 WHERE nome LIKE '%óleo%' OR nome LIKE '%filtro%' OR nome LIKE '%Filtro%'");
                    db.run("UPDATE frota_plano_preventivo SET intervalo_dias=30 WHERE nome LIKE '%calibr%'");
                }
                if (!cols.includes('alerta_antecedencia_km')) db.run("ALTER TABLE frota_plano_preventivo ADD COLUMN alerta_antecedencia_km INTEGER DEFAULT 1000");
                if (!cols.includes('alerta_antecedencia_dias')) db.run("ALTER TABLE frota_plano_preventivo ADD COLUMN alerta_antecedencia_dias INTEGER DEFAULT 15");
            });

            // Migration: tabela de alertas de manutenção por veículo
            db.run(\`CREATE TABLE IF NOT EXISTS frota_alerta_manutencao (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                veiculo_id INTEGER NOT NULL,
                plano_id INTEGER NOT NULL,
                status TEXT DEFAULT 'pendente',
                km_alerta INTEGER,
                data_alerta TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(veiculo_id, plano_id),
                FOREIGN KEY(veiculo_id) REFERENCES frota_veiculos(id) ON DELETE CASCADE,
                FOREIGN KEY(plano_id) REFERENCES frota_plano_preventivo(id) ON DELETE CASCADE
            )\`);

`;

if (!srv.includes('intervalo_dias ao plano preventivo')) {
    srv = srv.replace(migKm, migExtra + migKm);
}

// Novo endpoint: GET /api/frota/veiculos/:id/alertas — verifica KM e datas
const alertaEndpoint = `
// GET - verificar alertas de manutenção de um veículo (por km e data)
app.get('/api/frota/veiculos/:id/alertas', authenticateToken, (req, res) => {
    const vid = req.params.id;
    db.get('SELECT km_atual, em_manutencao FROM frota_veiculos WHERE id=?', [vid], (err, veiculo) => {
        if (err || !veiculo) return res.status(404).json({ error: 'Veículo não encontrado' });
        const kmAtual = veiculo.km_atual || 0;
        const hoje = new Date();

        db.all('SELECT * FROM frota_plano_preventivo WHERE ativo=1', [], (err2, plano) => {
            if (err2) return res.status(500).json({ error: err2.message });

            const checks = (plano || []).map(item => new Promise(resolve => {
                db.get(
                    \`SELECT km_na_manutencao, data_conclusao FROM frota_manutencoes
                     WHERE veiculo_id=? AND descricao LIKE ? AND status='concluida'
                     ORDER BY km_na_manutencao DESC LIMIT 1\`,
                    [vid, '%' + item.nome + '%'],
                    (e, ultima) => {
                        const kmUltima = ultima?.km_na_manutencao || 0;
                        const dataUltima = ultima?.data_conclusao ? new Date(ultima.data_conclusao) : null;

                        // Verificar por KM
                        const kmProxima = kmUltima + (item.intervalo_km || 99999);
                        const kmRestante = kmProxima - kmAtual;
                        const alertaKm = item.alerta_antecedencia_km || 1000;
                        const vencidaKm = kmRestante <= 0;
                        const proximaKm = kmRestante > 0 && kmRestante <= alertaKm;

                        // Verificar por Data
                        let vencidaData = false, proximaData = false, dataProxima = null;
                        if (item.intervalo_dias && dataUltima) {
                            dataProxima = new Date(dataUltima);
                            dataProxima.setDate(dataProxima.getDate() + item.intervalo_dias);
                            const diasRestantes = Math.ceil((dataProxima - hoje) / (1000 * 60 * 60 * 24));
                            const alertaDias = item.alerta_antecedencia_dias || 15;
                            vencidaData = diasRestantes <= 0;
                            proximaData = diasRestantes > 0 && diasRestantes <= alertaDias;
                        } else if (item.intervalo_dias && !dataUltima) {
                            // Nunca feito - considerar vencido
                            vencidaData = true;
                        }

                        // Status geral: vencida se qualquer critério > proxima se qualquer critério > ok
                        let statusItem = 'ok';
                        if (vencidaKm || vencidaData) statusItem = 'vencida';
                        else if (proximaKm || proximaData) statusItem = 'proxima';

                        resolve({
                            ...item,
                            km_ultima: kmUltima,
                            km_proxima: kmProxima,
                            km_restante: kmRestante,
                            data_proxima: dataProxima ? dataProxima.toISOString().slice(0,10) : null,
                            status_item: statusItem
                        });
                    }
                );
            }));

            Promise.all(checks).then(result => {
                const temAlerta = result.some(r => r.status_item === 'vencida' || r.status_item === 'proxima');
                res.json({ km_atual: kmAtual, em_manutencao: veiculo.em_manutencao, tem_alerta: temAlerta, plano: result });
            });
        });
    });
});

// GET - status de alerta de todos os veículos (para os cards)
app.get('/api/frota/alertas-todos', authenticateToken, (req, res) => {
    db.all('SELECT id, km_atual, em_manutencao FROM frota_veiculos', [], (err, veiculos) => {
        if (err) return res.status(500).json({ error: err.message });
        const hoje = new Date();

        db.all('SELECT * FROM frota_plano_preventivo WHERE ativo=1', [], (err2, plano) => {
            if (err2) return res.status(500).json({ error: err2.message });

            const checks = (veiculos || []).map(v => new Promise(resolve => {
                const kmAtual = v.km_atual || 0;
                const itemChecks = (plano || []).map(item => new Promise(resolve2 => {
                    db.get(
                        \`SELECT km_na_manutencao, data_conclusao FROM frota_manutencoes
                         WHERE veiculo_id=? AND descricao LIKE ? AND status='concluida'
                         ORDER BY km_na_manutencao DESC LIMIT 1\`,
                        [v.id, '%' + item.nome + '%'],
                        (e, ultima) => {
                            const kmUltima = ultima?.km_na_manutencao || 0;
                            const kmRestante = (kmUltima + item.intervalo_km) - kmAtual;
                            const alerta = item.alerta_antecedencia_km || 1000;
                            let status = 'ok';
                            if (kmRestante <= 0) status = 'vencida';
                            else if (kmRestante <= alerta) status = 'proxima';

                            if (item.intervalo_dias) {
                                const dataUltima = ultima?.data_conclusao ? new Date(ultima.data_conclusao) : null;
                                if (!dataUltima) { status = status === 'vencida' ? 'vencida' : 'proxima'; }
                                else {
                                    const dp = new Date(dataUltima); dp.setDate(dp.getDate() + item.intervalo_dias);
                                    const d = Math.ceil((dp - hoje) / (1000*60*60*24));
                                    const aDias = item.alerta_antecedencia_dias || 15;
                                    if (d <= 0 && status !== 'vencida') status = 'vencida';
                                    else if (d <= aDias && status === 'ok') status = 'proxima';
                                }
                            }
                            resolve2(status);
                        }
                    );
                }));
                Promise.all(itemChecks).then(statuses => {
                    const temVencida = statuses.includes('vencida');
                    const temProxima = statuses.includes('proxima');
                    resolve({
                        id: v.id,
                        km_atual: kmAtual,
                        em_manutencao: v.em_manutencao,
                        alerta_manutencao: temVencida ? 'vencida' : temProxima ? 'proxima' : 'ok'
                    });
                });
            }));

            Promise.all(checks).then(result => res.json(result));
        });
    });
});

`;

if (!srv.includes("app.get('/api/frota/veiculos/:id/alertas'")) {
    srv = srv.replace("// GET - verificar alertas de manutenção de um veículo", "// (placeholder)");
    // Insert after the km endpoint
    srv = srv.replace("// PUT - atualizar km do veículo", alertaEndpoint + "// PUT - atualizar km do veículo");
}

fs.writeFileSync('backend/server.js', srv);
console.log('Done: server.js updated');
