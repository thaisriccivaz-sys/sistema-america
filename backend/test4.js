const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');
db.all("SELECT nome, conteudo FROM geradores WHERE nome LIKE '%Sinistro%'", (err, rows) => {
    if (err) return console.error(err);
    rows.forEach(r => {
        console.log('Nome:', r.nome);
        console.log('Conteudo snippet:', r.conteudo.substring(0, 500));
        if (r.conteudo.includes('desconto') || r.conteudo.includes('DESCONTO')) {
            console.log('Contem desconto:', true);
        }
    });
});
