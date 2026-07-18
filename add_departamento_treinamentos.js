const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

db.serialize(() => {
    db.run("ALTER TABLE treinamentos ADD COLUMN departamento TEXT DEFAULT 'Todos'", (err) => {
        if (err) {
            console.log("Column might already exist or error: " + err.message);
        } else {
            console.log("Column 'departamento' added successfully.");
        }
    });
});

db.close();
