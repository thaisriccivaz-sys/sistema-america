const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const r2 = require('./utils/r2'); // Supondo que você tem o helper r2.js

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILES = [
    'hr_system_v2.sqlite',
    'senhas.sqlite'
];

async function runBackup() {
    console.log('🔄 Iniciando backup automático do Banco de Dados para o R2...');
    
    if (!r2.isReady()) {
        console.error('❌ Erro: Configurações do R2 ausentes.');
        return;
    }

    const dateStr = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];

    for (const dbName of DB_FILES) {
        const dbPath = path.join(DATA_DIR, dbName);
        if (fs.existsSync(dbPath)) {
            try {
                console.log(`Buscando ${dbName}...`);
                const fileBuffer = fs.readFileSync(dbPath);
                
                const r2Key = `Backups/${dateStr}_${dbName}`;
                
                await r2.uploadToR2(r2Key, fileBuffer, 'application/x-sqlite3');
                console.log(`✅ Backup salvo no R2: ${r2Key}`);
            } catch (err) {
                console.error(`❌ Erro ao fazer backup de ${dbName}:`, err.message);
            }
        } else {
            console.warn(`⚠️ Arquivo de banco não encontrado: ${dbPath}`);
        }
    }
    
    console.log('🎉 Processo de backup concluído!');
}

// Se o script for chamado diretamente via terminal (node backup_db.js)
if (require.main === module) {
    runBackup().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = runBackup;
