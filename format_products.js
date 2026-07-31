const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'data', 'hr_system_v2.sqlite');
const db = new sqlite3.Database(dbPath);

function toTitleCase(str) {
    if (!str) return str;
    return str.toLowerCase().replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
}

db.all("SELECT id, nome FROM estoque", [], (err, rows) => {
    if (err) {
        console.error("Erro ao buscar estoque:", err);
        db.close();
        return;
    }

    let completed = 0;
    
    if (rows.length === 0) {
        console.log("Nenhum item no estoque.");
        db.close();
        return;
    }

    rows.forEach(row => {
        const novoNome = toTitleCase(row.nome);
        if (novoNome !== row.nome) {
            db.run("UPDATE estoque SET nome = ? WHERE id = ?", [novoNome, row.id], (errUpd) => {
                if (errUpd) console.error("Erro ao atualizar", row.id, errUpd);
                checkDone();
            });
        } else {
            checkDone();
        }
    });

    function checkDone() {
        completed++;
        if (completed === rows.length) {
            console.log("Todos os produtos formatados com sucesso!");
            db.close();
        }
    }
});
