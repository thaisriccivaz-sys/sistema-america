const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

db.serialize(() => {
    db.run("DELETE FROM geradores WHERE nome = 'AUTORIZAÇÃO DE DESCONTO EM FOLHA DE PAGAMENTO'", (err) => {
        if (err) console.error(err);
        else console.log('Successfully deleted AUTORIZAÇÃO DE DESCONTO EM FOLHA DE PAGAMENTO');
    });
    db.run("DELETE FROM geradores WHERE nome = 'Termo de Responsabilidade de Chaves'", (err) => {
        if (err) console.error(err);
        else console.log('Successfully deleted Termo de Responsabilidade de Chaves');
    });
});

db.close();
