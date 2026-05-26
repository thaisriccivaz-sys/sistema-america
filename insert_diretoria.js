const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');
db.run("INSERT INTO departamentos (nome, tipo) VALUES ('Diretoria', 'Administrativo')", err => {
    if(err) console.log(err.message);
    else console.log('Created');
});
