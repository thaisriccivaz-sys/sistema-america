const { Client } = require('@microsoft/microsoft-graph-client');
require('isomorphic-fetch');
const msal = require('@azure/msal-node');

// Configurações via Variáveis de Ambiente
const config = {
    auth: {
        clientId: process.env.ONEDRIVE_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.ONEDRIVE_TENANT_ID}`,
        clientSecret: process.env.ONEDRIVE_CLIENT_SECRET,
    }
};

const cca = new msal.ConfidentialClientApplication(config);
const CLIENT_ID = process.env.ONEDRIVE_CLIENT_ID;
const USER_ID = process.env.ONEDRIVE_USER_EMAIL;
// O Drive ID correto da pasta "Documentos - America Rental" no SharePoint (Site AmericaRental)
const DRIVE_ID = "b!Be9k6f_8_kmsGL8Mnu39wfJym1DJsPBBlDmJk3t4OhKZcofnrz5mTrfXg4xZqnTF"; 
const ONEDRIVE_FIXED_BASE = "RH/1.Colaboradores/Sistema";

/**
 * Obtém o token de acesso para o Microsoft Graph
 */
async function getAccessToken() {
    const tokenRequest = {
        scopes: ['https://graph.microsoft.com/.default'],
    };

    console.log(`[OneDrive-Auth] Requisitando token com timeout de 15s...`);
    
    // Promise com Timeout de 15s para não travar o processo
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Timeout ao obter token Microsoft (15s)")), 15000);
    });

    try {
        const response = await Promise.race([
            cca.acquireTokenByClientCredential(tokenRequest),
            timeoutPromise
        ]);
        console.log(`[OneDrive-Auth] Token obtido com sucesso.`);
        return response.accessToken;
    } catch (error) {
        console.error("ERRO AO OBTER TOKEN ONEDRIVE:", error.message);
        throw error;
    }
}

/**
 * Inicializa o cliente do Microsoft Graph
 */
// Cache do token com expiração (tokens do Graph expiram em ~1h)
let cachedToken = null;
let tokenExpiresAt = 0;

async function getGraphClient() {
    const now = Date.now();
    // Renova o token se faltar menos de 5 minutos para expirar (ou já expirou)
    if (!cachedToken || now >= tokenExpiresAt - 5 * 60 * 1000) {
        console.log('[OneDrive-Auth] Renovando token do Graph...');
        cachedToken = await getAccessToken();
        // Tokens do Graph Client Credentials expiram em 3600s; usamos 55min como margem
        tokenExpiresAt = now + 55 * 60 * 1000;
        console.log('[OneDrive-Auth] Token renovado, válido por 55 minutos.');
    }

    return Client.init({
        authProvider: (done) => {
            done(null, cachedToken);
        },
    });
}

/**
 * Garante que um caminho completo de pastas exista no OneDrive (Recursivo)
 */
async function ensurePath(fullPath) {
    if (!fullPath) return;
    const parts = fullPath.split('/').filter(p => p !== "");
    let currentPath = "";
    
    for (const part of parts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        await ensureFolder(currentPath);
    }
}

/**
 * Cria uma única pasta no OneDrive se não existir
 */
async function ensureFolder(folderPath) {
    if (!CLIENT_ID) return;

    try {
        const client = await getGraphClient();
        const userId = USER_ID;
        const driveId = DRIVE_ID;
        
        // Determina o prefixo da API (Drive específico ou Root do Usuário)
        const drivePrefix = driveId ? `/drives/${driveId}/root` : `/users/${userId}/drive/root`;
        
        // Codifica cada parte do caminho para evitar erros com caracteres especiais
        const encodedPath = folderPath.split('/').map(p => encodeURIComponent(p)).join('/');
        
        console.log(`[OneDrive Debug] Verificando/Criando: ${folderPath} (URL Encoded: ${encodedPath})`);

        try {
            await client.api(`${drivePrefix}:/${encodedPath}`).get();
        } catch (error) {
            if (error.code === 'itemNotFound') {
                const parts = folderPath.split('/');
                const folderName = parts.pop();
                const parentPath = parts.join('/');
                const encodedParent = parentPath.split('/').map(p => encodeURIComponent(p)).join('/');
                
                const endpoint = parentPath 
                    ? `${drivePrefix}:/${encodedParent}:/children`
                    : `${drivePrefix}/children`;

                await client.api(endpoint).post({
                    name: folderName,
                    folder: {},
                    "@microsoft.graph.conflictBehavior": "fail"
                });
                console.log(`[OneDrive Success] Pasta criada ok: ${folderPath}`);
            } else {
                console.error(`[OneDrive Error] Falha ao verificar ${folderPath}:`, error.message);
                throw error;
            }
        }
    } catch (error) {
        if (error.code !== 'nameAlreadyExists') {
            console.error(`[OneDrive Critical] Erro fatal em ensureFolder (${folderPath}):`, error.message);
            throw error; // Propaga para o diagnóstico capturar o erro real
        }
    }
}

/**
 * Faz o upload de um arquivo para o OneDrive
 * Converte Buffer Node.js para ArrayBuffer (necessario para Graph SDK v3)
 */
async function uploadToOneDrive(remotePath, fileName, fileBuffer) {
    if (!CLIENT_ID) return;

    try {
        const client = await getGraphClient();
        const driveId = DRIVE_ID;
        const drivePrefix = driveId ? `/drives/${driveId}/root` : `/users/${USER_ID}/drive/root`;
        
        const encodedPath = remotePath.split('/').map(p => encodeURIComponent(p)).join('/');
        const encodedFileName = encodeURIComponent(fileName);
        
        console.log(`[OneDrive] Uploading "${fileName}" para "${remotePath}" (${fileBuffer.length} bytes)`);
        
        // Converter Buffer Node.js para ArrayBuffer (Graph SDK exige)
        let uploadData = fileBuffer;
        if (Buffer.isBuffer(fileBuffer)) {
            uploadData = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength);
        }

        const endpoint = `${drivePrefix}:/${encodedPath}/${encodedFileName}:/content`;
        await client.api(endpoint).header('Content-Type', 'application/octet-stream').put(uploadData);
            
        console.log(`[OneDrive] Upload OK -> ${remotePath}/${fileName}`);
    } catch (error) {
        console.error(`[OneDrive] ERRO UPLOAD "${fileName}": ${error.statusCode || ''} - ${error.message}`);
        if (error.body) {
            const bodyStr = typeof error.body === 'string' ? error.body : JSON.stringify(error.body);
            console.error('[OneDrive] Body:', bodyStr.substring(0, 500));
        }
        throw error;
    }
}

/**
 * DIAGNÓSTICO: Listar itens da pasta raiz ou base
 */
async function listChildren(folderPath) {
    try {
        const client = await getGraphClient();
        const userId = USER_ID;
        const driveId = DRIVE_ID;
        const drivePrefix = driveId ? `/drives/${driveId}/root` : `/users/${userId}/drive/root`;
        
        const pathSuffix = folderPath ? `:/${folderPath.split('/').map(p => encodeURIComponent(p)).join('/')}:/children` : '/children';
        const endpoint = `${drivePrefix}${pathSuffix}`;
        
        const result = await client.api(endpoint).get();
        return result.value || [];
    } catch (e) {
        console.error(`[OneDrive Debug] Falha ao listar ${folderPath}:`, e.message);
        throw e;
    }
}

/**
 * Obtém URL de download temporária de um arquivo
 */
async function getDownloadUrl(filePath) {
    if (!CLIENT_ID) return null;
    try {
        const client = await getGraphClient();
        const driveId = DRIVE_ID;
        const drivePrefix = driveId ? `/drives/${driveId}/root` : `/users/${USER_ID}/drive/root`;
        
        const encodedPath = filePath.split('/').map(p => encodeURIComponent(p)).join('/');
        const endpoint = `${drivePrefix}:/${encodedPath}`;
        
        const result = await client.api(endpoint).get();
        return result['@microsoft.graph.downloadUrl'];
    } catch (e) {
        console.error(`[OneDrive Debug] Falha ao obter URL de download de ${filePath}:`, e.message);
        throw e;
    }
}

/**
 * Converte um arquivo do OneDrive para JPEG via Graph API (suporta PDF, DOCX, etc.)
 * Retorna uma string data:image/jpeg;base64,...
 */
async function getFileAsJpeg(filePath) {
    if (!CLIENT_ID) return null;
    const token = await getAccessToken();
    const encodedPath = filePath.split('/').map(p => encodeURIComponent(p)).join('/');
    const url = `https://graph.microsoft.com/v1.0/drives/${DRIVE_ID}/root:/${encodedPath}:/content?format=jpg`;
    const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
        redirect: 'follow'
    });
    if (!res.ok) throw new Error(`Graph PDF→JPG falhou: ${res.status} ${res.statusText}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    return `data:image/jpeg;base64,${buffer.toString('base64')}`;
}

module.exports = {
    uploadToOneDrive,
    ensureFolder,
    ensurePath,
    getAccessToken,
    getGraphClient,
    listChildren,
    getDownloadUrl,
    getFileAsJpeg
};
