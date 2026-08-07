const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const r2 = require('./utils/r2');

// ✅ CORREÇÃO: Usa o caminho real do banco de produção (Render Disk)
// Se DATABASE_PATH estiver definido (produção no Render), usa ele.
// Caso contrário, usa o caminho local (desenvolvimento).
const PROD_DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'data', 'hr_system_v2.sqlite');

async function backupDatabase(dbPath, dbName) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(dbPath)) {
            console.warn(`⚠️ Banco não encontrado: ${dbPath}`);
            return resolve();
        }

        console.log(`🔄 Preparando backup de ${dbName} (${dbPath})...`);
        const fileSize = fs.statSync(dbPath).size;
        console.log(`   Tamanho: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

        // Abre o banco em modo leitura para fazer checkpoint do WAL antes de copiar
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
            if (err) {
                console.warn(`⚠️ Não foi possível abrir banco para checkpoint: ${err.message}. Copiando direto.`);
                return copyAndUpload(dbPath, dbName, resolve, reject);
            }

            // Força o WAL a ser consolidado no arquivo principal antes do backup
            db.run('PRAGMA wal_checkpoint(FULL);', (err) => {
                db.close(() => {
                    copyAndUpload(dbPath, dbName, resolve, reject);
                });
            });
        });
    });
}

async function copyAndUpload(dbPath, dbName, resolve, reject) {
    try {
        const dateStr = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
        const r2Key = `Backups/${dateStr}_${dbName}`;

        const fileBuffer = fs.readFileSync(dbPath);
        await r2.uploadToR2(r2Key, fileBuffer, 'application/x-sqlite3');
        console.log(`✅ Backup salvo no R2: ${r2Key} (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
        resolve();
    } catch (err) {
        console.error(`❌ Erro ao fazer backup de ${dbName}:`, err.message);
        resolve(); // Não rejeita para não travar o processo por um arquivo
    }
}

async function runBackup() {
    console.log('🔄 Iniciando backup automático do Banco de Dados para o R2...');

    if (!r2.isReady()) {
        console.error('❌ Erro: Configurações do R2 ausentes. Verifique as variáveis de ambiente.');
        return;
    }

    // Banco principal de produção
    await backupDatabase(PROD_DB_PATH, 'hr_system_v2.sqlite');

    // Banco de senhas (se existir no mesmo diretório do banco principal)
    const senhasPath = path.join(path.dirname(PROD_DB_PATH), 'senhas.sqlite');
    await backupDatabase(senhasPath, 'senhas.sqlite');

    console.log('🎉 Processo de backup concluído!');
}

// Se o script for chamado diretamente via terminal (node backup_db.js)
if (require.main === module) {
    runBackup().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = runBackup;
