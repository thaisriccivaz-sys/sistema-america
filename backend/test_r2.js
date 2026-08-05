require('dotenv').config({ path: '.env' });
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
});

async function testR2() {
    console.log('🔍 Verificando o que REALMENTE tem dentro do seu R2 agora...\n');
    try {
        const command = new ListObjectsV2Command({
            Bucket: process.env.R2_BUCKET_NAME || 'america-rental-midias',
            Delimiter: '/'
        });
        const res = await client.send(command);
        console.log('📂 PASTAS RAIZ ENCONTRADAS NO CLOUDFLARE R2:');
        if (res.CommonPrefixes && res.CommonPrefixes.length > 0) {
            res.CommonPrefixes.forEach(p => console.log(' 📁 ' + p.Prefix));
        } else {
            console.log(' Nenhuma pasta encontrada.');
        }
        console.log('\n✅ Fim da listagem.');
    } catch (e) {
        console.error('❌ Erro:', e.message);
    }
}

testR2();
