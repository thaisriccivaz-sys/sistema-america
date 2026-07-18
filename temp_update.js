const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('backend/database.sqlite');
db.run("UPDATE usuarios SET colaborador_id = (SELECT id FROM colaboradores WHERE nome_completo LIKE '%Thais Ricci Vaz%') WHERE username = 'Thais.Ricci'", function(err) {
    if (err) console.error(err);
    else console.log('Linhas alteradas: ' + this.changes);
});
