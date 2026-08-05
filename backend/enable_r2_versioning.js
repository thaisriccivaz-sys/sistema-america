require('dotenv').config({ path: '.env' });
const { S3Client, PutBucketVersioningCommand } = require('@aws-sdk/client-s3');

const client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
});

async function enableVersioning() {
    console.log('🔄 Tentando ativar a Lixeira (Object Versioning) no bucket...');
    try {
        const command = new PutBucketVersioningCommand({
            Bucket: process.env.R2_BUCKET_NAME || 'america-rental-midias',
            VersioningConfiguration: {
                Status: 'Enabled'
            }
        });
        await client.send(command);
        console.log('✅ Lixeira (Object Versioning) ATIVADA com sucesso!');
        console.log('A partir de agora, se qualquer arquivo for deletado pelo CS Browser ou pelo sistema, o R2 guardará a versão antiga para podermos restaurar.');
    } catch (e) {
        console.error('❌ Erro ao ativar versionamento:', e.message);
    }
}

enableVersioning();
