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
// O Drive ID correto da pasta "Documentos - America Rental" no SharePoint
const DRIVE_ID = "b!giGJ-6SQo0q01aZkBQjqEzgftfBe2OJGpvVeTh2YrbQTUqm85gobSoh8CtELSzAF"; 
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
let cachedClient = null;
let clientInitPromise = null;

async function getGraphClient() {
    if (cachedClient) return cachedClient;
    
    // Evita múltiplas inicializações simultâneas (Race Condition)
    if (clientInitPromise) return clientInitPromise;

    clientInitPromise = (async () => {
        try {
            const accessToken = await getAccessToken();
            cachedClient = Client.init({
                authProvider: (done) => {
                    done(null, accessToken);
                },
            });
            return cachedClient;
        } finally {
            clientInitPromise = null;
        }
    })();

    return clientInitPromise;
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
 */
async function uploadToOneDrive(remotePath, fileName, fileBuffer) {
    if (!CLIENT_ID) return;

    try {
        const client = await getGraphClient();
        const userId = USER_ID;
        const driveId = DRIVE_ID;

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

module.exports = {
    uploadToOneDrive,
    ensureFolder,
    ensurePath,
    getAccessToken,
    getGraphClient,
    listChildren
};
