const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

db.serialize(() => {
    // Check if the generator exists
    db.get("SELECT id, nome FROM geradores WHERE nome LIKE '%AUTORIZAÇÃO DE DESCONTO EM FOLHA DE PAGAMENTO%'", (err, row) => {
        if(err) {
            console.error(err);
        } else if (row) {
            console.log("Gerador encontrado:", row);
            
            // Update the generator
            db.run("UPDATE geradores SET nome = 'Autorização de Desconto em Folha' WHERE id = ?", [row.id], function(err) {
                if (err) {
                    console.error("Erro ao atualizar:", err);
                } else {
                    console.log(`Gerador ${row.id} atualizado. Linhas afetadas: ${this.changes}`);
                }
            });
        } else {
            console.log("Gerador não encontrado na busca exata. Buscando opções similares...");
            db.all("SELECT id, nome FROM geradores WHERE nome LIKE '%AUTORIZAÇÃO%'", (err, rows) => {
                if(err) console.error(err);
                else {
                    console.log("Opções encontradas:");
                    rows.forEach(r => console.log(`  ID=${r.id} | ${r.nome}`));
                }
            });
        }
    });
});