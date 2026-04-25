const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');
const basePath = 'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\RH\\1.Colaboradores\\Sistema';

const SUB_PASTAS = [
    '00_CHECKLIST',
    '01_FICHA_CADASTRAL',
    'ASO',
    'ATESTADOS',
    'AVALIACAO',
    'CERTIFICADOS',
    'CONTRATOS',
    'DEPENDENTES',
    'EPI',
    'FACULDADE',
    'FOTOS',
    'MULTAS',
    'OCORRENCIAS',
    'PAGAMENTOS',
    'SINISTROS',
    'TERAPIA',
    'TREINAMENTO'
];

db.all('SELECT nome_completo FROM colaboradores', (err, rows) => {
    if (err) return console.error(err);
    let colabs = 0;
    rows.forEach(r => {
        const safeName = r.nome_completo
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9 \-_]/g, '')
            .trim().replace(/\s+/g, '_').toUpperCase();

        const colabDir = path.join(basePath, safeName);
        if (!fs.existsSync(colabDir)) fs.mkdirSync(colabDir, { recursive: true });

        SUB_PASTAS.forEach(sub => {
            const subDir = path.join(colabDir, sub);
            if (!fs.existsSync(subDir)) fs.mkdirSync(subDir, { recursive: true });
        });
        colabs++;
        console.log('✅ ' + safeName);
    });
    console.log(`\n🎉 ${colabs} colaboradores | ${colabs * SUB_PASTAS.length} subpastas criadas!`);
    db.close();
});
