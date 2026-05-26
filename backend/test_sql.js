const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'hr_system_v2.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run(
        `INSERT INTO resumo_rota_auditoria (data_rota, nome_resumo, veiculo, campo, valor_anterior, valor_atual, usuario_nome)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['2026-05-15', 'Resumo Teste', 'ABC-1234', 'Observações de Alterações', '', 'teste', 'diretoria.1'],
        function(err) {
            if (err) console.error("POST Error:", err.message);
            else console.log("POST Success! ID:", this.lastID);
        }
    );

    db.all(`SELECT * FROM resumo_rota_auditoria ORDER BY created_at DESC LIMIT 5`, (err, rows) => {
        if (err) console.error("GET Error:", err.message);
        else console.log("GET Success! Rows:", rows);
    });
});
