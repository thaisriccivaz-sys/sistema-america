const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const { censorBOPdf } = require('./censorPDF.js');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'hr_system_v2.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Iniciando censura retroativa de Boletins de Ocorrência...');

db.all("SELECT id, file_path, document_type, tab_name FROM documentos WHERE (document_type LIKE '%BO_%' AND tab_name LIKE '%SINISTRO%') OR tab_name LIKE '%BOLETIM%'", async (err, rows) => {
    if (err) {
        console.error('Erro ao buscar documentos:', err);
        return;
    }

    console.log(`Foram encontrados ${rows.length} documentos do tipo BO.`);

    let sucessos = 0;
    let falhas = 0;

    for (const doc of rows) {
        try {
            const absolutePath = path.resolve(__dirname, doc.file_path.replace(/^backend[\/\\]/, ''));
            if (fs.existsSync(absolutePath)) {
                console.log(`Processando [ID ${doc.id}] ${doc.file_path}...`);
                const ok = await censorBOPdf(absolutePath, absolutePath);
                if (ok) sucessos++; else falhas++;
            } else {
                console.log(`[AVISO] Arquivo não encontrado: ${absolutePath}`);
                falhas++;
            }
        } catch (e) {
            console.error(`Erro ao processar ID ${doc.id}:`, e.message);
            falhas++;
        }
    }

    console.log(`\n=== RESULTADO ===`);
    console.log(`Sucessos: ${sucessos}`);
    console.log(`Falhas: ${falhas}`);
    console.log(`Concluído.`);
});
