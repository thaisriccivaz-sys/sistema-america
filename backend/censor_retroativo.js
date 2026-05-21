const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const { censorBOPdf, censorBOPdfBuffer } = require('./censorPDF.js');
const onedrive = require('./utils/onedrive.js');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'hr_system_v2.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Iniciando censura retroativa de Boletins de Ocorrência...');

async function run() {
    // 1. Arquivos locais na tabela documentos
    const docs = await new Promise((res) => db.all("SELECT id, file_path, document_type, tab_name FROM documentos WHERE (document_type LIKE '%BO_%' AND tab_name LIKE '%SINISTRO%') OR tab_name LIKE '%BOLETIM%'", (err, rows) => res(rows || [])));
    let sucessosLocais = 0, falhasLocais = 0;
    
    for (const doc of docs) {
        try {
            const absolutePath = path.resolve(__dirname, doc.file_path.replace(/^backend[\/\\]/, ''));
            if (fs.existsSync(absolutePath)) {
                console.log(`Processando LOCAL [ID ${doc.id}] ${doc.file_path}...`);
                const ok = await censorBOPdf(absolutePath, absolutePath);
                if (ok) sucessosLocais++; else falhasLocais++;
            } else {
                falhasLocais++;
            }
        } catch (e) {
            console.error(`Erro LOCAL ID ${doc.id}:`, e.message);
            falhasLocais++;
        }
    }

    // 2. Arquivos no OneDrive na tabela sinistros
    const sinistros = await new Promise((res) => db.all("SELECT id, boletim_path FROM sinistros WHERE boletim_path IS NOT NULL", (err, rows) => res(rows || [])));
    let sucessosOneDrive = 0, falhasOneDrive = 0;

    for (const sin of sinistros) {
        try {
            console.log(`Processando ONEDRIVE Sinistro [ID ${sin.id}] ${sin.boletim_path}...`);
            const dlUrl = await onedrive.getDownloadUrl(sin.boletim_path);
            if (!dlUrl) {
                console.log(`[AVISO] URL de download não encontrada para ${sin.boletim_path}`);
                falhasOneDrive++;
                continue;
            }
            
            const resDl = await fetch(dlUrl);
            if (!resDl.ok) {
                falhasOneDrive++;
                continue;
            }
            
            const bufferOriginal = Buffer.from(await resDl.arrayBuffer());
            const bufferCensurado = await censorBOPdfBuffer(bufferOriginal);
            
            if (bufferCensurado) {
                const pasta = sin.boletim_path.substring(0, sin.boletim_path.lastIndexOf('/'));
                const arquivo = sin.boletim_path.substring(sin.boletim_path.lastIndexOf('/') + 1);
                
                // Sobrescreve no OneDrive
                await onedrive.uploadToOneDrive(pasta, arquivo, Buffer.from(bufferCensurado));
                console.log(`[SUCESSO] Censurado no OneDrive: ${sin.boletim_path}`);
                sucessosOneDrive++;
            } else {
                falhasOneDrive++;
            }
        } catch (e) {
            console.error(`Erro ONEDRIVE Sinistro ID ${sin.id}:`, e.message);
            falhasOneDrive++;
        }
    }

    console.log(`\n=== RESULTADO ===`);
    console.log(`Locais: Sucessos=${sucessosLocais}, Falhas=${falhasLocais}`);
    console.log(`OneDrive: Sucessos=${sucessosOneDrive}, Falhas=${falhasOneDrive}`);
    console.log(`Concluído.`);
}

run();
