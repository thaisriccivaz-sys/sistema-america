const fs = require('fs');
let srv = fs.readFileSync('backend/database.js', 'utf8');

const newMig = `
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
            db.run(\`CREATE TABLE IF NOT EXISTS frota_plano_preventivo
`;

if (!srv.includes('frota_categorias_manutencao')) {
    srv = srv.replace('db.run(`CREATE TABLE IF NOT EXISTS frota_plano_preventivo', newMig);
    fs.writeFileSync('backend/database.js', srv);
    console.log('Database definitions patched!');
} else {
    console.log('Database definitions already there');
}

// Ensure the local database executes this right away just in case
const db = require('./backend/database.js');
setTimeout(() => {
    console.log('Done executing via local db require');
    process.exit(0);
}, 2000);
