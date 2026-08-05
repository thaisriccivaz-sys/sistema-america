require('dotenv').config({ path: '.env' });
const { S3Client, GetBucketVersioningCommand } = require('@aws-sdk/client-s3');

const client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
});

async function checkVersioning() {
    console.log('🔍 Verificando o status da Lixeira (Versioning) no seu bucket...');
    try {
        const command = new GetBucketVersioningCommand({
            Bucket: process.env.R2_BUCKET_NAME || 'america-rental-midias'
        });
        const res = await client.send(command);
        
        if (res.Status === 'Enabled') {
            console.log('✅ Tudo certo! A Lixeira (Object Versioning) está ATIVADA no Cloudflare.');
            console.log('Seus arquivos estão protegidos contra exclusões acidentais.');
        } else {
            console.log('⚠️ A Lixeira NÃO está ativada. Status atual:', res.Status || 'Desativado/Suspenso');
        }
    } catch (e) {
        console.error('❌ Erro ao verificar:', e.message);
    }
}

checkVersioning();
