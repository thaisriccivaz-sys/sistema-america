const fs=require('fs');
let s=fs.readFileSync('backend/server.js','utf8');
if (!s.includes("app.get('/api/frota/categorias'")) {
    let eps = `
// GET - listar categorias
app.get('/api/frota/categorias', authenticateToken, (req, res) => {
    db.all('SELECT * FROM frota_categorias_manutencao WHERE ativo=1 ORDER BY ordem', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// GET - listar servicos do catalogo
app.get('/api/frota/catalogo', authenticateToken, (req, res) => {
    const { categoria_id } = req.query;
    let sql = 'SELECT s.*, c.nome as categoria_nome FROM frota_servicos_catalogo s LEFT JOIN frota_categorias_manutencao c ON c.id=s.categoria_id WHERE s.ativo=1';
    const params = [];
    if (categoria_id) { sql += ' AND s.categoria_id=?'; params.push(categoria_id); }
    sql += ' ORDER BY s.categoria_id, s.nome';
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// POST - criar servico customizado
app.post('/api/frota/catalogo', authenticateToken, (req, res) => {
    const { categoria_id, nome, tipo_controle, periodicidade_padrao, unidade, criticidade, tempo_medio_horas, exige_parada, obrigatorio, impede_operacao } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });
    db.run(
        'INSERT INTO frota_servicos_catalogo(categoria_id,nome,tipo_controle,periodicidade_padrao,unidade,criticidade,tempo_medio_horas,exige_parada,obrigatorio,impede_operacao,padrao) VALUES(?,?,?,?,?,?,?,?,?,?,0)',
        [categoria_id||null, nome, tipo_controle||'KM', periodicidade_padrao||10000, unidade||'km', criticidade||'Media', tempo_medio_horas||null, exige_parada?1:0, obrigatorio?1:0, impede_operacao?1:0],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

// GET - preventivo por veiculo usando catálogo (plano ou padrão)
app.get('/api/frota/manutencoes/preventivo/:veiculo_id', authenticateToken, (req, res) => {
    const vid = req.params.veiculo_id;
    db.get('SELECT km_atual, em_manutencao FROM frota_veiculos WHERE id=?', [vid], (err, v) => {
        if (err || !v) return res.status(404).json({ error: 'Não encontrado' });
        const kmAtual = v.km_atual || 0;
        const hoje = new Date();

        // Load all catalog items
        db.all(\`SELECT s.*, c.nome as categoria_nome, c.icone as categoria_icone
                FROM frota_servicos_catalogo s
                LEFT JOIN frota_categorias_manutencao c ON c.id=s.categoria_id
                WHERE s.ativo=1 ORDER BY c.ordem, s.nome\`, [], (err2, servicos) => {
            if (err2) return res.status(500).json({ error: err2.message });

            // For each item, find last completed maintenance
            const checks = (servicos||[]).map(item => new Promise(resolve => {
                db.get(
                    \`SELECT km_na_manutencao, data_conclusao FROM frota_manutencoes
                     WHERE veiculo_id=? AND servico_catalogo_id=? AND status='concluida'
                     ORDER BY COALESCE(km_na_manutencao,0) DESC LIMIT 1\`,
                    [vid, item.id],
                    (e, ultima) => {
                        const kmUlt = ultima?.km_na_manutencao || 0;
                        const dataUlt = ultima?.data_conclusao ? new Date(ultima.data_conclusao) : null;
                        const intervKm = item.periodicidade_padrao || 10000;
                        const alerta = Math.floor(intervKm * 0.1); // 10% do intervalo
                        const kmProx = kmUlt + intervKm;
                        const kmRest = kmProx - kmAtual;

                        let statusItem = 'ok';
                        if (kmRest <= 0) statusItem = 'vencida';
                        else if (kmRest <= alerta) statusItem = 'proxima';

                        resolve({
                            ...item, km_ultima: kmUlt, km_proxima: kmProx,
                            km_restante: kmRest, data_ultima: ultima?.data_conclusao || null,
                            status_item: statusItem
                        });
                    }
                );
            }));

            Promise.all(checks).then(plano => {
                const grupos = {};
                plano.forEach(item => {
                    const cat = item.categoria_nome || 'Geral';
                    if (!grupos[cat]) grupos[cat] = { icone: item.categoria_icone, itens: [] };
                    grupos[cat].itens.push(item);
                });
                res.json({ km_atual: kmAtual, em_manutencao: v.em_manutencao, grupos });
            });
        });
    });
});

`;
    s = s.replace("app.get('/api/frota/manutencoes',", eps + "app.get('/api/frota/manutencoes',");
    fs.writeFileSync('backend/server.js', s);
    console.log('Fixed endpoints!');
} else {
    console.log('Already exists');
}
