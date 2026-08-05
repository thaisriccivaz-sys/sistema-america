require('dotenv').config({ path: '.env' });
const { S3Client, ListObjectsV2Command, GetObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");

// Configuração Cloudflare R2
const r2Client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

// Configuração Backblaze B2
const b2Client = new S3Client({
    region: "us-east-1", // AWS SDK exige uma region genérica, o endpoint resolve o roteamento real
    endpoint: process.env.B2_ENDPOINT ? (process.env.B2_ENDPOINT.startsWith('http') ? process.env.B2_ENDPOINT : `https://${process.env.B2_ENDPOINT}`) : undefined,
    credentials: {
        accessKeyId: process.env.B2_KEY_ID,
        secretAccessKey: process.env.B2_APPLICATION_KEY,
    },
});

async function checkExistsInB2(key, size) {
    try {
        const command = new HeadObjectCommand({
            Bucket: process.env.B2_BUCKET_NAME,
            Key: key
        });
        const response = await b2Client.send(command);
        if (response.ContentLength === size) {
            return true;
        }
        return false;
    } catch (error) {
        if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
            return false;
        }
        throw error;
    }
}

async function syncR2toB2() {
    if (!process.env.B2_KEY_ID || !process.env.B2_APPLICATION_KEY || !process.env.B2_ENDPOINT || !process.env.B2_BUCKET_NAME) {
        console.log('[B2 Sync] Variáveis do B2 ausentes (adicione no Environment do Render). Sincronização cancelada.');
        return;
    }

    console.log('[B2 Sync] Iniciando sincronização R2 -> B2...');
    
    let continuationToken = undefined;
    let totalSynced = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    try {
        do {
            const listCommand = new ListObjectsV2Command({
                Bucket: process.env.R2_BUCKET_NAME,
                ContinuationToken: continuationToken,
            });
            const r2Objects = await r2Client.send(listCommand);

            if (r2Objects.Contents) {
                for (const obj of r2Objects.Contents) {
                    const key = obj.Key;
                    const size = obj.Size;

                    try {
                        const exists = await checkExistsInB2(key, size);
                        if (exists) {
                            totalSkipped++;
                            continue;
                        }

                        console.log(`[B2 Sync] Copiando: ${key} (${size} bytes)`);

                        const getCommand = new GetObjectCommand({
                            Bucket: process.env.R2_BUCKET_NAME,
                            Key: key
                        });
                        const r2Response = await r2Client.send(getCommand);

                        const upload = new Upload({
                            client: b2Client,
                            params: {
                                Bucket: process.env.B2_BUCKET_NAME,
                                Key: key,
                                Body: r2Response.Body,
                                ContentType: r2Response.ContentType,
                                ContentLength: r2Response.ContentLength
                            }
                        });

                        await upload.done();
                        totalSynced++;

                    } catch (err) {
                        console.error(`[B2 Sync] Erro ao sincronizar o arquivo ${key}:`, err.message);
                        totalErrors++;
                    }
                }
            }
            
            continuationToken = r2Objects.NextContinuationToken;
        } while (continuationToken);

        console.log(`\n[B2 Sync] Sincronização concluída!`);
        console.log(`- Copiados: ${totalSynced}`);
        console.log(`- Ignorados (já existiam): ${totalSkipped}`);
        console.log(`- Erros: ${totalErrors}\n`);

    } catch (err) {
        console.error('[B2 Sync] Erro fatal durante a sincronização:', err);
    }
}

if (require.main === module) {
    syncR2toB2().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}

module.exports = syncR2toB2;
