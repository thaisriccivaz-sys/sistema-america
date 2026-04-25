const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');
const basePath = 'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\RH\\1.Colaboradores\\Sistema';

db.all('SELECT nome_completo FROM colaboradores WHERE status="Ativo"', (err, rows) => {
    let count = 0;
    rows.forEach(r => {
        const safeName = r.nome_completo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9 \-_]/g, '').trim().toUpperCase();
        const fp = path.join(basePath, safeName);
        if(!fs.existsSync(fp)) {
            fs.mkdirSync(fp, {recursive: true});
            count++;
        }
    });
    console.log('Pastas recriadas no local CORRETO: ' + count);
    db.close();
});
