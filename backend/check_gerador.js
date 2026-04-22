const db = require('./database');
db.get("SELECT nome, conteudo FROM geradores WHERE nome LIKE '%ACORDO%' LIMIT 1", [], (e, r) => {
    if (r) {
        console.log('NOME:', r.nome);
        console.log('--- CONTEUDO ---');
        console.log(r.conteudo.substring(0, 800));
    } else {
        console.log('Erro ou não encontrado:', e);
        // Listar todos
        db.all("SELECT id, nome FROM geradores LIMIT 10", [], (e2, rows) => {
            console.log('Geradores disponíveis:', rows);
        });
    }
});
