const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const fs = require('fs');

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // ex: https://pub-xxx.r2.dev

let s3Client = null;

if (R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_ENDPOINT) {
    s3Client = new S3Client({
        region: "auto",
        endpoint: R2_ENDPOINT,
        credentials: {
            accessKeyId: R2_ACCESS_KEY_ID,
            secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
    });
    console.log("[R2 Storage] Cliente S3 inicializado.");
} else {
    console.log("[R2 Storage] Variáveis de ambiente incompletas. R2 desativado.");
}

/**
 * Uploads a file (Buffer or Path) to R2
 * @param {string} destinationKey (e.g. "sinistros/123/video.mp4")
 * @param {Buffer|string} fileData (Buffer or absolute file path)
 * @param {string} contentType (e.g. "video/mp4", "image/jpeg")
 * @returns {string} The public URL of the uploaded file
 */
async function uploadToR2(destinationKey, fileData, contentType) {
    if (!s3Client) throw new Error("Cliente R2 não configurado.");
    
    let bodyData;
    if (typeof fileData === 'string') {
        bodyData = fs.createReadStream(fileData);
    } else {
        bodyData = fileData;
    }

    const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: destinationKey,
        Body: bodyData,
        ContentType: contentType,
    });

    try {
        await s3Client.send(command);
        console.log(`[R2 Storage] Upload concluído: ${destinationKey}`);
        
        if (R2_PUBLIC_URL) {
            return `${R2_PUBLIC_URL}/${destinationKey}`;
        }
        return `s3://${R2_BUCKET_NAME}/${destinationKey}`;
    } catch (e) {
        console.error(`[R2 Storage] Erro no upload de ${destinationKey}:`, e);
        throw e;
    }
}

module.exports = {
    uploadToR2,
    isReady: () => s3Client !== null
};
