const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

db.run("UPDATE colaboradores SET meio_transporte = 'Vale Combustível (VC)' WHERE id = 17", (err) => {
    if (err) return console.error(err);
    console.log("Updated Eduarda successfully!");
});
