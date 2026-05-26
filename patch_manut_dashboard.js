const fs = require('fs');

// 1. Adicionar migration no server.js para novos campos
const srv = fs.readFileSync('backend/server.js', 'utf8');
const migTag = "// Migration: adicionar coluna km_atual e em_manutencao nos veículos";

const novaMig = `// Migration: campos adicionais de manutenção para dashboard
            db.all("PRAGMA table_info(frota_manutencoes)", (err, rows) => {
                if (err || !rows) return;
                const cols = rows.map(r => r.name);
                if (!cols.includes('numero_os')) db.run("ALTER TABLE frota_manutencoes ADD COLUMN numero_os TEXT");
                if (!cols.includes('categoria_custo')) db.run("ALTER TABLE frota_manutencoes ADD COLUMN categoria_custo TEXT DEFAULT 'Manutenção de Veículos'");
                if (!cols.includes('data_inicio')) db.run("ALTER TABLE frota_manutencoes ADD COLUMN data_inicio TEXT");
                if (!cols.includes('hora_inicio')) db.run("ALTER TABLE frota_manutencoes ADD COLUMN hora_inicio TEXT");
                if (!cols.includes('hora_fim')) db.run("ALTER TABLE frota_manutencoes ADD COLUMN hora_fim TEXT");
                if (!cols.includes('tempo_execucao_horas')) db.run("ALTER TABLE frota_manutencoes ADD COLUMN tempo_execucao_horas REAL");
                if (!cols.includes('numero_nota_fiscal')) db.run("ALTER TABLE frota_manutencoes ADD COLUMN numero_nota_fiscal TEXT");
                if (!cols.includes('responsavel')) db.run("ALTER TABLE frota_manutencoes ADD COLUMN responsavel TEXT");
            });

`;

let newSrv = srv;
if (!srv.includes('numero_os')) {
    newSrv = srv.replace(migTag, novaMig + migTag);
}

// 2. Adicionar endpoint de dashboard
const dashEndpoint = `
// GET - dashboard de manutenções
app.get('/api/frota/manutencoes/dashboard', authenticateToken, (req, res) => {
    const { mes, ano } = req.query;
    let where = "WHERE 1=1";
    const params = [];
    if (mes && ano) {
        where += " AND strftime('%Y-%m', COALESCE(m.data_conclusao, m.data_agendamento, m.created_at)) = ?";
        params.push(ano + '-' + String(mes).padStart(2,'0'));
    } else if (ano) {
        where += " AND strftime('%Y', COALESCE(m.data_conclusao, m.data_agendamento, m.created_at)) = ?";
        params.push(ano);
    }

    const queries = {
        totais: \`SELECT
            COUNT(*) as total_os,
            SUM(CASE WHEN m.status='concluida' THEN 1 ELSE 0 END) as concluidas,
            SUM(CASE WHEN m.status='em_andamento' THEN 1 ELSE 0 END) as em_andamento,
            SUM(CASE WHEN m.status='agendada' THEN 1 ELSE 0 END) as agendadas,
            COALESCE(SUM(m.custo),0) as custo_total,
            AVG(m.custo) as ticket_medio,
            AVG(m.tempo_execucao_horas) as tempo_medio_horas
            FROM frota_manutencoes m \${where}\`,
        por_tipo: \`SELECT m.tipo, COUNT(*) as qtd, COALESCE(SUM(m.custo),0) as custo
            FROM frota_manutencoes m \${where} GROUP BY m.tipo\`,
        por_categoria: \`SELECT m.categoria_custo, COALESCE(SUM(m.custo),0) as custo
            FROM frota_manutencoes m \${where} GROUP BY m.categoria_custo ORDER BY custo DESC\`,
        por_fornecedor: \`SELECT m.fornecedor, COUNT(*) as qtd, COALESCE(SUM(m.custo),0) as custo
            FROM frota_manutencoes m \${where} AND m.fornecedor IS NOT NULL AND m.fornecedor != ''
            GROUP BY m.fornecedor ORDER BY custo DESC LIMIT 10\`,
        por_veiculo: \`SELECT v.placa, v.marca_modelo_versao, COUNT(*) as qtd,
            COALESCE(SUM(m.custo),0) as custo, AVG(m.tempo_execucao_horas) as tempo_medio
            FROM frota_manutencoes m JOIN frota_veiculos v ON v.id=m.veiculo_id
            \${where} GROUP BY m.veiculo_id ORDER BY custo DESC LIMIT 15\`,
        por_mes: \`SELECT strftime('%m', COALESCE(m.data_conclusao,m.data_agendamento,m.created_at)) as mes,
            COUNT(*) as qtd, COALESCE(SUM(m.custo),0) as custo
            FROM frota_manutencoes m \${where} GROUP BY mes ORDER BY mes\`,
        por_status: \`SELECT m.status, COUNT(*) as qtd, COALESCE(SUM(m.custo),0) as custo
            FROM frota_manutencoes m \${where} GROUP BY m.status\`,
        tempo_por_veiculo: \`SELECT v.placa, AVG(m.tempo_execucao_horas) as tempo_medio, COUNT(*) as qtd
            FROM frota_manutencoes m JOIN frota_veiculos v ON v.id=m.veiculo_id
            WHERE m.tempo_execucao_horas IS NOT NULL AND m.tempo_execucao_horas > 0 \${where.replace('WHERE 1=1','AND 1=1')}
            GROUP BY m.veiculo_id ORDER BY tempo_medio DESC\`
    };

    const result = {};
    let done = 0;
    const total = Object.keys(queries).length;
    Object.entries(queries).forEach(([key, sql]) => {
        db.all(sql, params, (err, rows) => {
            result[key] = err ? [] : rows;
            if (++done === total) {
                if (result.totais && result.totais[0]) result.totais = result.totais[0];
                res.json(result);
            }
        });
    });
});

`;

// Insert before existing frota/manutencoes GET
if (!newSrv.includes("app.get('/api/frota/manutencoes/dashboard'")) {
    newSrv = newSrv.replace("// GET - listar manutenções (todas ou por veículo)", dashEndpoint + "// GET - listar manutenções (todas ou por veículo)");
}

fs.writeFileSync('backend/server.js', newSrv);
console.log('Done: server.js updated with dashboard endpoint and migrations');
