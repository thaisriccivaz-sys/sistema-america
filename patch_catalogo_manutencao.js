const fs = require('fs');
let srv = fs.readFileSync('backend/server.js', 'utf8');

// ─── 1. MIGRATIONS ─────────────────────────────────────────────
const migTag = '// Migration: adicionar intervalo_dias ao plano preventivo';
const newMig = `// Migration: catalogo completo de manutencoes
            db.run(\`CREATE TABLE IF NOT EXISTS frota_categorias_manutencao (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL UNIQUE,
                icone TEXT DEFAULT 'wrench',
                ordem INTEGER DEFAULT 99,
                ativo INTEGER DEFAULT 1
            )\`);

            db.run(\`CREATE TABLE IF NOT EXISTS frota_servicos_catalogo (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                categoria_id INTEGER,
                nome TEXT NOT NULL,
                tipo_controle TEXT DEFAULT 'KM',
                periodicidade_padrao INTEGER DEFAULT 10000,
                unidade TEXT DEFAULT 'km',
                criticidade TEXT DEFAULT 'Media',
                tempo_medio_horas REAL,
                exige_parada INTEGER DEFAULT 1,
                obrigatorio INTEGER DEFAULT 0,
                impede_operacao INTEGER DEFAULT 0,
                padrao INTEGER DEFAULT 1,
                ativo INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(categoria_id) REFERENCES frota_categorias_manutencao(id)
            )\`);

            db.run(\`CREATE TABLE IF NOT EXISTS frota_planos_manutencao (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                descricao TEXT,
                tipo_veiculo TEXT,
                ativo INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )\`);

            db.run(\`CREATE TABLE IF NOT EXISTS frota_plano_itens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                plano_id INTEGER NOT NULL,
                servico_id INTEGER,
                nome_custom TEXT,
                tipo_controle TEXT DEFAULT 'KM',
                periodicidade INTEGER NOT NULL,
                unidade TEXT DEFAULT 'km',
                alerta_antecedencia INTEGER DEFAULT 1000,
                FOREIGN KEY(plano_id) REFERENCES frota_planos_manutencao(id) ON DELETE CASCADE,
                FOREIGN KEY(servico_id) REFERENCES frota_servicos_catalogo(id)
            )\`);

            db.run(\`CREATE TABLE IF NOT EXISTS frota_veiculo_plano (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                veiculo_id INTEGER NOT NULL,
                plano_id INTEGER NOT NULL,
                data_associacao TEXT DEFAULT CURRENT_DATE,
                UNIQUE(veiculo_id, plano_id),
                FOREIGN KEY(veiculo_id) REFERENCES frota_veiculos(id) ON DELETE CASCADE,
                FOREIGN KEY(plano_id) REFERENCES frota_planos_manutencao(id) ON DELETE CASCADE
            )\`);

            // Seed categorias e catalogo (apenas se tabela vazia)
            db.get('SELECT COUNT(*) as n FROM frota_categorias_manutencao', [], (err, row) => {
                if (err || (row && row.n > 0)) return;
                const cats = [
                    [1,'Motor','engine',1],[2,'Freios','disc',2],[3,'Pneus e Rodagem','tire',3],
                    [4,'Suspensão e Direção','car',4],[5,'Transmissão','gear-six',5],
                    [6,'Sistema Elétrico','lightning',6],[7,'Ar Condicionado','thermometer',7],
                    [8,'Hidráulica / Operacional','drop',8],[9,'Sistema de Sucção','funnel',9],
                    [10,'Estrutura / Carroceria','truck',10],[11,'Segurança e Legalização','shield-check',11]
                ];
                cats.forEach(c => db.run('INSERT OR IGNORE INTO frota_categorias_manutencao(id,nome,icone,ordem) VALUES(?,?,?,?)', c));

                const servicos = [
                    // Motor
                    [1,'Troca de óleo do motor','KM/Tempo',10000,'km','Alta',1,1,1,0,1],
                    [1,'Troca do filtro de óleo','KM',10000,'km','Alta',0.5,1,1,0,1],
                    [1,'Troca do filtro de ar','KM',20000,'km','Media',0.5,0,0,0,1],
                    [1,'Troca do filtro de combustível','KM',20000,'km','Media',0.5,0,0,0,1],
                    [1,'Troca do filtro cabine/ar-cond.','KM/Tempo',15000,'km','Baixa',0.5,0,0,0,1],
                    [1,'Troca de correia dentada','KM/Tempo',60000,'km','Critica',3,1,1,1,1],
                    [1,'Troca da correia auxiliar','KM',40000,'km','Alta',1,1,1,0,1],
                    [1,'Verificação de vazamentos','Inspecao',5000,'km','Alta',0.5,0,0,0,1],
                    [1,'Limpeza de bicos injetores','KM',40000,'km','Media',2,1,0,0,1],
                    [1,'Regulagem de válvulas','KM',40000,'km','Alta',3,1,1,0,1],
                    [1,'Troca do líquido de arrefecimento','Tempo',24,'meses','Alta',1,1,1,0,1],
                    // Freios
                    [2,'Troca de pastilhas de freio','KM',20000,'km','Alta',1.5,1,1,1,1],
                    [2,'Troca de lonas','KM',30000,'km','Alta',2,1,1,1,1],
                    [2,'Troca de disco de freio','KM',40000,'km','Alta',2,1,1,1,1],
                    [2,'Sangria do sistema de freio','Tempo',12,'meses','Alta',1,1,1,0,1],
                    [2,'Troca de fluido de freio','Tempo',12,'meses','Alta',1,1,1,0,1],
                    [2,'Regulagem de freio','Inspecao',10000,'km','Alta',0.5,0,0,0,1],
                    [2,'Verificação de mangueiras','Inspecao',5000,'km','Alta',0.5,0,0,0,1],
                    // Pneus
                    [3,'Rodízio de pneus','KM',10000,'km','Media',1,0,0,0,1],
                    [3,'Alinhamento','KM',10000,'km','Media',1,0,0,0,1],
                    [3,'Balanceamento','KM',10000,'km','Media',1,0,0,0,1],
                    [3,'Calibragem','Inspecao',1000,'km','Baixa',0.25,0,0,0,1],
                    [3,'Troca de pneus','KM',60000,'km','Alta',2,1,1,1,1],
                    // Suspensão
                    [4,'Troca de amortecedores','KM',80000,'km','Alta',3,1,1,0,1],
                    [4,'Troca de pivôs','KM',60000,'km','Alta',2,1,1,0,1],
                    [4,'Troca de buchas','KM',40000,'km','Media',2,1,0,0,1],
                    [4,'Lubrificação de suspensão','Tempo',6,'meses','Baixa',0.5,0,0,0,1],
                    // Transmissão
                    [5,'Troca de óleo do câmbio','KM',40000,'km','Alta',1.5,1,1,0,1],
                    [5,'Troca de filtro do câmbio','KM',40000,'km','Alta',1.5,1,1,0,1],
                    [5,'Troca de kit embreagem','KM',80000,'km','Alta',4,1,1,1,1],
                    [5,'Troca de óleo diferencial','KM',40000,'km','Alta',1.5,1,1,0,1],
                    // Elétrico
                    [6,'Teste de bateria','Tempo',6,'meses','Media',0.5,0,0,0,1],
                    [6,'Troca de bateria','Tempo',24,'meses','Alta',0.5,0,0,0,1],
                    [6,'Verificação elétrica geral','Inspecao',10000,'km','Media',1,0,0,0,1],
                    // Ar Condicionado
                    [7,'Higienização do ar-cond.','Tempo',6,'meses','Baixa',1,0,0,0,1],
                    [7,'Recarga de gás','Tempo',12,'meses','Media',1,0,0,0,1],
                    [7,'Troca de filtro cabine','KM/Tempo',15000,'km','Baixa',0.5,0,0,0,1],
                    // Hidráulica
                    [8,'Troca de óleo hidráulico','Horimetro',250,'horas','Alta',2,1,1,1,1],
                    [8,'Troca de filtro hidráulico','Horimetro',250,'horas','Alta',1,1,1,0,1],
                    [8,'Lubrificação de bomba','Horimetro',100,'horas','Alta',0.5,0,0,0,1],
                    [8,'Revisão de bomba de sucção','Horimetro',500,'horas','Critica',4,1,1,1,1],
                    [8,'Verificação de mangotes','Inspecao',100,'horas','Alta',0.5,0,0,0,1],
                    [8,'Limpeza de tanque','Tempo',3,'meses','Alta',3,1,1,0,1],
                    // Sucção
                    [9,'Revisão do motor de sucção','Horimetro',500,'horas','Critica',4,1,1,1,1],
                    [9,'Troca de óleo do motor de sucção','Horimetro',250,'horas','Alta',1,1,1,0,1],
                    [9,'Troca de filtro do motor de sucção','Horimetro',100,'horas','Alta',0.5,1,1,0,1],
                    [9,'Revisão da bomba de vácuo','Horimetro',500,'horas','Critica',4,1,1,1,1],
                    [9,'Higienização do tanque','Tempo',1,'meses','Alta',3,1,1,0,1],
                    [9,'Inspeção estrutural do tanque','Tempo',3,'meses','Alta',1,0,0,0,1],
                    [9,'Verificação de válvulas','Inspecao',100,'horas','Alta',0.5,0,0,0,1],
                    [9,'Verificação do sistema hidráulico do tanque','Inspecao',100,'horas','Alta',1,0,0,0,1],
                    // Estrutura
                    [10,'Inspeção estrutural','Tempo',6,'meses','Alta',2,0,0,0,1],
                    [10,'Pintura preventiva','Tempo',24,'meses','Baixa',8,0,0,0,1],
                    [10,'Verificação de ferrugem','Inspecao',3,'meses','Media',0.5,0,0,0,1],
                    // Segurança
                    [11,'Extintor','Validade',12,'meses','Critica',0.25,0,1,1,1],
                    [11,'Tacógrafo','Tempo',12,'meses','Critica',1,0,1,0,1],
                    [11,'Licenciamento','Anual',12,'meses','Critica',0.5,0,1,0,1],
                    [11,'Inspeção ambiental','Tempo',12,'meses','Alta',1,0,1,0,1],
                ];
                servicos.forEach(s => db.run(
                    \`INSERT OR IGNORE INTO frota_servicos_catalogo(categoria_id,nome,tipo_controle,periodicidade_padrao,unidade,criticidade,tempo_medio_horas,exige_parada,obrigatorio,impede_operacao,padrao) VALUES(?,?,?,?,?,?,?,?,?,?,?)\`,
                    s
                ));
            });

`;

if (!srv.includes('frota_categorias_manutencao')) {
    srv = srv.replace(migTag, newMig + migTag);
}

// ─── 2. ENDPOINTS ───────────────────────────────────────────────
const endpointTag = '// GET - dashboard de manutenções';
const newEndpoints = `
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
    let sql = \`SELECT s.*, c.nome as categoria_nome FROM frota_servicos_catalogo s
               LEFT JOIN frota_categorias_manutencao c ON c.id=s.categoria_id WHERE s.ativo=1\`;
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
        \`INSERT INTO frota_servicos_catalogo(categoria_id,nome,tipo_controle,periodicidade_padrao,unidade,criticidade,tempo_medio_horas,exige_parada,obrigatorio,impede_operacao,padrao)
         VALUES(?,?,?,?,?,?,?,?,?,?,0)\`,
        [categoria_id||null, nome, tipo_controle||'KM', periodicidade_padrao||10000, unidade||'km', criticidade||'Media', tempo_medio_horas||null, exige_parada?1:0, obrigatorio?1:0, impede_operacao?1:0],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

// GET - listar planos de manutenção
app.get('/api/frota/planos', authenticateToken, (req, res) => {
    db.all(\`SELECT p.*, COUNT(pi.id) as total_itens FROM frota_planos_manutencao p
            LEFT JOIN frota_plano_itens pi ON pi.plano_id=p.id
            WHERE p.ativo=1 GROUP BY p.id ORDER BY p.nome\`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// POST - criar plano
app.post('/api/frota/planos', authenticateToken, (req, res) => {
    const { nome, descricao, tipo_veiculo } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });
    db.run('INSERT INTO frota_planos_manutencao(nome,descricao,tipo_veiculo) VALUES(?,?,?)',
        [nome, descricao||null, tipo_veiculo||null],
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
                // Group by category
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

if (!srv.includes("app.get('/api/frota/categorias'")) {
    srv = srv.replace(endpointTag, newEndpoints + endpointTag);
}

// Also add servico_catalogo_id column to frota_manutencoes
const migKmTag = '// Migration: campos adicionais de manutenção para dashboard';
const colMig = `// Migration: servico_catalogo_id na tabela de manutenções
            db.all("PRAGMA table_info(frota_manutencoes)", (err, rows) => {
                if (err || !rows) return;
                const cols = rows.map(r => r.name);
                if (!cols.includes('servico_catalogo_id')) db.run("ALTER TABLE frota_manutencoes ADD COLUMN servico_catalogo_id INTEGER");
                if (!cols.includes('categoria')) db.run("ALTER TABLE frota_manutencoes ADD COLUMN categoria TEXT");
                if (!cols.includes('horimetro_na_manutencao')) db.run("ALTER TABLE frota_manutencoes ADD COLUMN horimetro_na_manutencao INTEGER");
                if (!cols.includes('impede_operacao')) db.run("ALTER TABLE frota_manutencoes ADD COLUMN impede_operacao INTEGER DEFAULT 0");
                if (!cols.includes('criticidade')) db.run("ALTER TABLE frota_manutencoes ADD COLUMN criticidade TEXT DEFAULT 'Media'");
                if (!cols.includes('sistema_afetado')) db.run("ALTER TABLE frota_manutencoes ADD COLUMN sistema_afetado TEXT");
            });

`;
if (!srv.includes('servico_catalogo_id')) {
    srv = srv.replace(migKmTag, colMig + migKmTag);
}

fs.writeFileSync('backend/server.js', srv);
console.log('Done: server.js updated with full catalog, categories and plans');
