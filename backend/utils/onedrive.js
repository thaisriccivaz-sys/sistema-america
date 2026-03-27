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

/**
 * Obtém o token de acesso para o Microsoft Graph
 */
async function getAccessToken() {
    const tokenRequest = {
        scopes: ['https://graph.microsoft.com/.default'],
    };

    try {
        const response = await cca.acquireTokenByClientCredential(tokenRequest);
        return response.accessToken;
    } catch (error) {
        console.error("ERRO AO OBTER TOKEN ONEDRIVE:", error);
        throw error;
    }
}

/**
 * Inicializa o cliente do Microsoft Graph
 */
let cachedClient = null;

async function getGraphClient() {
    if (cachedClient) return cachedClient;
    const accessToken = await getAccessToken();
    cachedClient = Client.init({
        authProvider: (done) => {
            done(null, accessToken);
        },
    });
    return cachedClient;
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
    if (!process.env.ONEDRIVE_CLIENT_ID) return;

    try {
        const client = await getGraphClient();
        const userId = process.env.ONEDRIVE_USER_EMAIL;
        const driveId = process.env.ONEDRIVE_DRIVE_ID;
        
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
 */
async function uploadToOneDrive(remotePath, fileName, fileBuffer) {
    if (!process.env.ONEDRIVE_CLIENT_ID) return;

    try {
        const client = await getGraphClient();
        const userId = process.env.ONEDRIVE_USER_EMAIL;
        const driveId = process.env.ONEDRIVE_DRIVE_ID;

        const drivePrefix = driveId ? `/drives/${driveId}/root` : `/users/${userId}/drive/root`;
        
        const encodedPath = remotePath.split('/').map(p => encodeURIComponent(p)).join('/');
        const encodedFileName = encodeURIComponent(fileName);
        
        console.log(`OneDrive: Uploading ${fileName} para ${remotePath}`);
        
        await client.api(`${drivePrefix}:/${encodedPath}/${encodedFileName}:/content`)
            .put(fileBuffer);
            
        console.log(`OneDrive: Upload concluído -> ${fileName}`);
    } catch (error) {
        console.error(`ERRO UPLOAD ONEDRIVE (${fileName}):`, error.message);
        throw error;
    }
}

module.exports = {
    uploadToOneDrive,
    ensureFolder,
    ensurePath,
    getAccessToken,
    getGraphClient
};
