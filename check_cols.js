const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('backend/database.sqlite');
// Just checking what columns the code expects.
console.log('Columns expected: data_teste_1, data_teste_2, data_teste_extra, rota_motorista, criado_por_id');
