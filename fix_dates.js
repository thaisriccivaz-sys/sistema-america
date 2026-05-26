const sqlite3 = require('sqlite3').verbose(); 
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite'); 
db.run("UPDATE colaboradores SET data_nascimento = '2003-01-31' WHERE id = 34"); 
db.run("UPDATE colaboradores SET data_nascimento = '2002-05-31' WHERE id = 56", () => { 
    console.log('Fixed DB dates'); 
    db.close(); 
});
