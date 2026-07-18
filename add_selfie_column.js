const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'backend', 'data', 'hr_system_v2.sqlite');

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run("ALTER TABLE epi_entregas ADD COLUMN selfie_base64 TEXT;", (err) => {
        if (err && err.message.includes('duplicate column name')) {
            console.log("Column selfie_base64 already exists in epi_entregas.");
        } else if (err) {
            console.error("Error adding column:", err);
        } else {
            console.log("Successfully added selfie_base64 to epi_entregas.");
        }
    });
});

db.close();
