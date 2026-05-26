const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

db.serialize(() => {
    const columns = [
        "ALTER TABLE credenciamentos ADD COLUMN licencas_ids TEXT;",
        "ALTER TABLE credenciamentos ADD COLUMN endereco_instalacao TEXT;",
        "ALTER TABLE credenciamentos ADD COLUMN acessado_em DATETIME;",
        "ALTER TABLE credenciamentos ADD COLUMN status TEXT DEFAULT 'enviado';",
        "ALTER TABLE credenciamentos ADD COLUMN qtd_max_colaboradores INTEGER DEFAULT 0;",
        "ALTER TABLE credenciamentos ADD COLUMN qtd_max_veiculos INTEGER DEFAULT 0;",
        "ALTER TABLE credenciamentos ADD COLUMN data_limite_envio DATETIME;"
    ];

    columns.forEach(query => {
        db.run(query, (err) => {
            if (err) {
                if (!err.message.includes('duplicate column name')) {
                    console.error("Erro ao adicionar coluna:", err.message);
                } else {
                    console.log("Coluna já existe:", query);
                }
            } else {
                console.log("Coluna adicionada:", query);
            }
        });
    });

    // Atualiza status dos antigos (aqueles que tem token e valid_until já foram enviados)
    db.run("UPDATE credenciamentos SET status = 'enviado' WHERE status IS NULL OR status = 'enviado'", (err) => {
        if (err) console.error("Erro no update:", err);
        else console.log("Status antigos atualizados.");
    });
});
