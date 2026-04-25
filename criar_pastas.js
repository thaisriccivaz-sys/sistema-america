const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');
const basePath = 'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\RH\\1.Colaboradores\\Sistema';

db.all('SELECT nome_completo FROM colaboradores WHERE status="Ativo"', (err, rows) => {
    if (err) return console.error(err);
    let count = 0;
    rows.forEach(r => {
        // Remove acentos, remove caracteres especiais, substitui espaços por _ e coloca MAIÚSCULO
        const safeName = r.nome_completo
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')   // remove acentos
            .replace(/[^a-zA-Z0-9 \-_]/g, '')  // remove caracteres especiais
            .trim()
            .replace(/\s+/g, '_')              // espaços -> _
            .toUpperCase();

        const fp = path.join(basePath, safeName);
        if (!fs.existsSync(fp)) {
            fs.mkdirSync(fp, { recursive: true });
            console.log('Criado: ' + safeName);
            count++;
        }
    });
    console.log('\n✅ Total de pastas criadas: ' + count);
    db.close();
});
