const db = require('./database');

setTimeout(() => {
    db.serialize(() => {
        // 1. Alterar emails_corporativos
        console.log("Alterando emails_corporativos...");
        db.run(`ALTER TABLE emails_corporativos ADD COLUMN caixa_compartilhada INTEGER DEFAULT 0`, (err) => {
            if(err && !err.message.includes('duplicate column')) console.log("Aviso caixa_compartilhada:", err.message);
        });
        db.run(`ALTER TABLE emails_corporativos ADD COLUMN recebe_copia INTEGER DEFAULT 0`, (err) => {
            if(err && !err.message.includes('duplicate column')) console.log("Aviso recebe_copia:", err.message);
        });

        // 2. Criar emails_atribuicoes
        console.log("Criando emails_atribuicoes...");
        db.run(`CREATE TABLE IF NOT EXISTS emails_atribuicoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email_id INTEGER NOT NULL,
            colaborador_id INTEGER,
            responsavel_nome TEXT,
            recebe_copia INTEGER DEFAULT 0,
            data_atribuicao TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(email_id) REFERENCES emails_corporativos(id),
            FOREIGN KEY(colaborador_id) REFERENCES colaboradores(id)
        )`);

        // 3. Migrar dados existentes de emails_corporativos para emails_atribuicoes
        db.all(`SELECT id, colaborador_id, responsavel_nome, data_atribuicao FROM emails_corporativos WHERE colaborador_id IS NOT NULL OR responsavel_nome IS NOT NULL`, (err, rows) => {
            if (err) console.error("Erro ao buscar emails para migracao:", err.message);
            else if (rows.length > 0) {
                let stmt = db.prepare(`INSERT INTO emails_atribuicoes (email_id, colaborador_id, responsavel_nome, data_atribuicao) VALUES (?, ?, ?, ?)`);
                rows.forEach(r => {
                    stmt.run(r.id, r.colaborador_id, r.responsavel_nome, r.data_atribuicao);
                });
                stmt.finalize(() => {
                    console.log("Migração de", rows.length, "emails concluida.");
                    // Opcionalmente podemos limpar os dados da tabela principal, mas manteremos por segurança (ou ignoraremos no código novo).
                    // db.run(`UPDATE emails_corporativos SET colaborador_id = NULL, responsavel_nome = NULL, data_atribuicao = NULL`);
                });
            }
        });

        // 4. Criar computadores_historico
        console.log("Criando computadores_historico...");
        db.run(`CREATE TABLE IF NOT EXISTS computadores_historico (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            computador_id INTEGER NOT NULL,
            colaborador_id INTEGER,
            responsavel_nome TEXT,
            acao TEXT NOT NULL,
            observacao TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(computador_id) REFERENCES computadores(id),
            FOREIGN KEY(colaborador_id) REFERENCES colaboradores(id)
        )`);

        // 5. Seed initial history for computadores
        db.all(`SELECT id, colaborador_id, colaborador_livre, status, data_atribuicao, observacoes, created_at FROM computadores`, (err, rows) => {
            if (err) console.error("Erro ao buscar computadores:", err.message);
            else if (rows.length > 0) {
                // Verificar se já existe histórico para não duplicar no seed
                db.get("SELECT count(*) as count FROM computadores_historico", (err, row) => {
                    if (row && row.count === 0) {
                        let stmt = db.prepare(`INSERT INTO computadores_historico (computador_id, colaborador_id, responsavel_nome, acao, observacao, created_at) VALUES (?, ?, ?, ?, ?, ?)`);
                        rows.forEach(r => {
                            let acao = "Cadastro Inicial";
                            if (r.colaborador_id || r.colaborador_livre) {
                                acao = "Atribuído";
                            }
                            stmt.run(r.id, r.colaborador_id, r.colaborador_livre, acao, r.observacoes || r.status, r.created_at || new Date().toISOString());
                        });
                        stmt.finalize(() => {
                            console.log("Seed de histórico de computadores concluido para", rows.length, "registros.");
                        });
                    }
                });
            }
        });
    });
}, 2000); // Wait for db init

setTimeout(() => { process.exit(0); }, 5000);
