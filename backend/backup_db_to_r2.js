require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Configurações
const DB_PATH = process.env.DATABASE_PATH || process.env.DB_PATH || path.join(__dirname, 'data', 'hr_system_v2.sqlite');
const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'america-rental-midias';

const s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
});

async function backupDatabase() {
    console.log('🔄 Iniciando backup automático do Banco de Dados para o Cloudflare R2...');

    if (!fs.existsSync(DB_PATH)) {
        console.error(`❌ ERRO: Banco de dados não encontrado em ${DB_PATH}`);
        process.exit(1);
    }

    try {
        const dbBuffer = fs.readFileSync(DB_PATH);
        
        // Gera um nome com a data atual. Ex: backup_2026-08-05_15-30-00.sqlite
        const date = new Date();
        const dateString = date.toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
        const r2Key = `Backups/Database/hr_system_v2_${dateString}.sqlite`;

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: r2Key,
            Body: dbBuffer,
            ContentType: 'application/vnd.sqlite3'
        });

        await s3Client.send(command);

        console.log(`✅ SUCESSO: Backup concluído! Salvo no R2 como: ${r2Key}`);
        console.log(`Tamanho do arquivo: ${(dbBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    } catch (error) {
        console.error('❌ ERRO crítico ao fazer upload do backup para o R2:', error.message);
        process.exit(1);
    }
}

backupDatabase();
