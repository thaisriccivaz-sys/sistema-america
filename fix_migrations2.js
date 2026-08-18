const fs = require('fs');
const file = 'backend/routes_candidatos_teste.js';
let content = fs.readFileSync(file, 'utf8');

const migrationScript = 
    const newCols = [
        'data_teste_1 TEXT',
        'data_teste_2 TEXT',
        'data_teste_extra TEXT',
        'rota_motorista TEXT'
    ];
    newCols.forEach(colDef => {
        const colName = colDef.split(' ')[0];
        db.run(\ALTER TABLE candidatos_teste ADD COLUMN \\, (err) => {
            if (err && !err.message.includes("duplicate column")) {
                // Ignore duplicate column errors, meaning it already exists
            }
        });
    });
;

const target = "    // "?"? HELPERS";
content = content.replace(target, migrationScript + "\n" + target);

fs.writeFileSync(file, content, 'utf8');
console.log('Added ALTER TABLE migrations');
