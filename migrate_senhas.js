const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

db.serialize(() => {
    try {
        db.run("ALTER TABLE logistica_senhas ADD COLUMN tipo_acesso TEXT DEFAULT 'compartilhado'", (err) => {
            if (err) console.log("tipo_acesso column might already exist", err.message);
            else console.log("Added tipo_acesso column");
        });
        db.run("ALTER TABLE logistica_senhas ADD COLUMN dono_id INTEGER", (err) => {
            if (err) console.log("dono_id column might already exist", err.message);
            else console.log("Added dono_id column");
        });
    } catch (e) {
        console.error(e);
    }
});
db.close();