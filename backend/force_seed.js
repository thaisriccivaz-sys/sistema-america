const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/database.sqlite');

const seedData = {
    administrativo: [
        { titulo: 'Cartão de Vale Transporte', descricao: 'Providenciar e entregar cartão VT ao colaborador', condicao: 'vt', ordem: 1 },
        { titulo: 'Cartão de VR (Vale Refeição)', descricao: 'Providenciar e entregar cartão de Vale Refeição', condicao: null, ordem: 2 },
        { titulo: 'Cartão VC (Vale Combustível)', descricao: 'Providenciar e entregar cartão de Vale Combustível', condicao: 'vc', ordem: 3 },
        { titulo: 'Montagem de kit de boas-vindas', descricao: 'Preparar e entregar kit de boas-vindas ao colaborador', condicao: null, ordem: 4 },
        { titulo: 'Configurar ponto eletrônico', descricao: 'Cadastrar colaborador no sistema de ponto eletrônico', condicao: null, ordem: 5 },
        { titulo: 'Acesso aos sistemas (TI)', descricao: 'Configurar e-mail, acessos e sistemas necessários ao cargo', condicao: null, ordem: 6 },
        { titulo: 'Apresentação da empresa', descricao: 'Apresentar história, valores e cultura da América Rental', condicao: null, ordem: 7 },
        { titulo: 'Apresentação do time', descricao: 'Apresentar o colaborador à equipe e ao gestor direto', condicao: null, ordem: 8 },
        { titulo: 'Treinamentos específicos do cargo', descricao: 'Realizar treinamentos obrigatórios e específicos da função', condicao: null, ordem: 9 },
        { titulo: 'Entrega de crachá', descricao: 'Providenciar e entregar crachá de identificação', condicao: null, ordem: 10 },
        { titulo: 'Assinatura de documentos admissionais', descricao: 'Garantir assinatura de todos os documentos necessários', condicao: null, ordem: 11 },
        { titulo: 'Acompanhamento 30 dias', descricao: 'Realizar check-in após 30 dias de trabalho', condicao: null, ordem: 12 },
    ],
    operacional: [
        { titulo: 'Cartão de Vale Transporte', descricao: 'Providenciar e entregar cartão VT ao colaborador', condicao: 'vt', ordem: 1 },
        { titulo: 'Cartão de VR (Vale Refeição)', descricao: 'Providenciar e entregar cartão de Vale Refeição', condicao: null, ordem: 2 },
        { titulo: 'Montagem de kit de boas-vindas', descricao: 'Preparar e entregar kit de boas-vindas ao colaborador', condicao: null, ordem: 3 },
        { titulo: 'Configurar ponto eletrônico', descricao: 'Cadastrar colaborador no sistema de ponto eletrônico', condicao: null, ordem: 4 },
        { titulo: 'Entrega de EPIs', descricao: 'Entregar equipamentos de proteção individual obrigatórios', condicao: null, ordem: 5 },
        { titulo: 'Treinamentos de NR', descricao: 'Realizar treinamentos obrigatórios (NR10, NR35, etc.)', condicao: null, ordem: 6 },
        { titulo: 'Apresentação da empresa', descricao: 'Apresentar história, valores e cultura da América Rental', condicao: null, ordem: 7 },
        { titulo: 'Apresentação do time', descricao: 'Apresentar o colaborador à equipe e ao gestor direto', condicao: null, ordem: 8 },
        { titulo: 'Entrega de crachá', descricao: 'Providenciar e entregar crachá de identificação', condicao: null, ordem: 9 },
        { titulo: 'Assinatura de documentos admissionais', descricao: 'Garantir assinatura de todos os documentos necessários', condicao: null, ordem: 10 },
        { titulo: 'Acompanhamento 30 dias', descricao: 'Realizar check-in após 30 dias de trabalho', condicao: null, ordem: 11 },
    ],
};

const templateNames = {
    administrativo: 'Integração Administrativo',
    operacional:    'Integração Operacional',
};

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS integ_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        tipo_key TEXT NOT NULL DEFAULT 'todos',
        descricao TEXT,
        ativo INTEGER NOT NULL DEFAULT 1,
        criado_em TEXT DEFAULT (datetime('now','localtime'))
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS integ_template_acoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER NOT NULL,
        titulo TEXT NOT NULL,
        descricao TEXT,
        responsavel_user_id INTEGER,
        departamentos TEXT DEFAULT 'todos',
        condicao TEXT,
        ordem INTEGER DEFAULT 0,
        ativo INTEGER NOT NULL DEFAULT 1
    )`);

    db.get('SELECT COUNT(*) as cnt FROM integ_templates', [], (err, row) => {
        if (err || (row && row.cnt > 0)) {
            console.log("Already seeded or error:", err, row);
            if (row && row.cnt === 0) {
               console.log("Empty, proceeding to seed...");
               doSeed();
            } else {
               db.close();
            }
            return;
        }
        doSeed();
    });

    function doSeed() {
        Object.entries(seedData).forEach(([tipo, acoes], idx, arr) => {
            db.run(`INSERT INTO integ_templates (nome, tipo_key) VALUES (?, ?)`,
                [templateNames[tipo], tipo],
                function(err) {
                    if (err) { console.error('[INTEG] Seed error:', err.message); return; }
                    const tid = this.lastID;
                    acoes.forEach(a => {
                        db.run(`INSERT INTO integ_template_acoes (template_id, titulo, descricao, condicao, ordem) VALUES (?, ?, ?, ?, ?)`,
                            [tid, a.titulo, a.descricao, a.condicao, a.ordem]);
                    });
                    console.log(`[INTEG] Seed: template "${templateNames[tipo]}" criado (id ${tid})`);
                    if (idx === arr.length - 1) {
                        setTimeout(() => db.close(), 1000);
                    }
                });
        });
    }
});
