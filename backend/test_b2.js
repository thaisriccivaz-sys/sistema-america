require('dotenv').config({ path: '.env' });
const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");

const b2Client = new S3Client({
    region: "us-east-1",
    endpoint: process.env.B2_ENDPOINT ? (process.env.B2_ENDPOINT.startsWith('http') ? process.env.B2_ENDPOINT : `https://${process.env.B2_ENDPOINT}`) : undefined,
    credentials: {
        accessKeyId: process.env.B2_KEY_ID,
        secretAccessKey: process.env.B2_APPLICATION_KEY,
    },
});

async function testB2() {
    console.log("Testando conexão B2...");
    console.log("Bucket Name:", process.env.B2_BUCKET_NAME);
    console.log("Endpoint:", process.env.B2_ENDPOINT);
    console.log("Key ID (início):", process.env.B2_KEY_ID ? process.env.B2_KEY_ID.substring(0, 4) + '...' : 'undefined');
    
    try {
        const command = new ListObjectsV2Command({
            Bucket: process.env.B2_BUCKET_NAME,
            MaxKeys: 1
        });
        const res = await b2Client.send(command);
        console.log("SUCESSO! B2 está respondendo.");
    } catch (err) {
        console.error("\n=== ERRO DETALHADO ===");
        console.error(err);
        console.error("Nome:", err.name);
        console.error("Mensagem:", err.message);
        console.error("Código HTTP:", err.$metadata?.httpStatusCode);
    }
}

testB2();
