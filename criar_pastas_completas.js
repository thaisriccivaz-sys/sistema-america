const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');
const basePath = 'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\RH\\1.Colaboradores\\Sistema';

// Subpastas padrão que o sistema usa para cada colaborador
const SUB_PASTAS = [
    '01_FICHA_CADASTRAL',
    'CONTRATOS',
    'PAGAMENTOS',
    'SINISTROS',
    'MULTAS',
    'OCORRENCIAS',
    'FACULDADE',
];

db.all('SELECT nome_completo FROM colaboradores WHERE status="Ativo"', (err, rows) => {
    if (err) return console.error(err);
    let colabs = 0;
    let pastas = 0;

    rows.forEach(r => {
        const safeName = r.nome_completo
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')   // remove acentos
            .replace(/[^a-zA-Z0-9 \-_]/g, '')  // remove caracteres especiais
            .trim()
            .replace(/\s+/g, '_')               // espaços -> _
            .toUpperCase();

        // Cria pasta principal do colaborador
        const colabDir = path.join(basePath, safeName);
        if (!fs.existsSync(colabDir)) {
            fs.mkdirSync(colabDir, { recursive: true });
        }

        // Cria cada subpasta dentro da pasta do colaborador
        SUB_PASTAS.forEach(sub => {
            const subDir = path.join(colabDir, sub);
            if (!fs.existsSync(subDir)) {
                fs.mkdirSync(subDir, { recursive: true });
                pastas++;
            }
        });

        console.log(`✅ ${safeName}`);
        colabs++;
    });

    console.log(`\n🎉 ${colabs} colaboradores | ${pastas} subpastas criadas!`);
    db.close();
});
