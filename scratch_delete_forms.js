const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'backend', 'data', 'hr_system_v2.sqlite');
const db = new sqlite3.Database(dbPath);

const names = [
    'Wellington Moisés Oliveira de Moraes',
    'Wendell Henrique Costa Santos',
    'Gustavo Rodrigues Correia'
];

db.serialize(() => {
    names.forEach(name => {
        db.get('SELECT id FROM colaboradores WHERE nome_completo = ?', [name], (err, row) => {
            if (err) {
                console.error('Error finding user:', name, err);
                return;
            }
            if (row) {
                console.log(`Found ${name} with ID ${row.id}`);
                db.run('DELETE FROM experiencia_formularios WHERE colaborador_id = ?', [row.id], function(err) {
                    if (err) {
                        console.error('Error deleting form for ID:', row.id, err);
                    } else {
                        console.log(`Deleted ${this.changes} form(s) for ${name}`);
                    }
                });
            } else {
                console.log(`User not found: ${name}`);
            }
        });
    });
});

setTimeout(() => db.close(), 2000);
