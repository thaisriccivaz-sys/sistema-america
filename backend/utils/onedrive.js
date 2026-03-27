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
async function getGraphClient() {
    const accessToken = await getAccessToken();
    return Client.init({
        authProvider: (done) => {
            done(null, accessToken);
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
    if (!process.env.ONEDRIVE_CLIENT_ID) return;

    try {
        const client = await getGraphClient();
        const userId = process.env.ONEDRIVE_USER_EMAIL;
        
        try {
            await client.api(`/users/${userId}/drive/root:/${folderPath}`).get();
        } catch (error) {
            if (error.code === 'itemNotFound') {
                const parts = folderPath.split('/');
                const folderName = parts.pop();
                const parentPath = parts.join('/');
                
                const endpoint = parentPath 
                    ? `/users/${userId}/drive/root:/${parentPath}:/children`
                    : `/users/${userId}/drive/root/children`;

                await client.api(endpoint).post({
                    name: folderName,
                    folder: {},
                    "@microsoft.graph.conflictBehavior": "fail"
                });
                console.log(`Pasta criada: ${folderPath}`);
            } else {
                throw error;
            }
        }
    } catch (error) {
        if (error.code !== 'nameAlreadyExists') {
            console.error(`ERRO ONEDRIVE AO GARANTIR PASTA (${folderPath}):`, error.message);
        }
    }
}

/**
 * Faz o upload de um arquivo para o OneDrive
 */
async function uploadToOneDrive(remotePath, fileName, fileBuffer) {
    if (!process.env.ONEDRIVE_CLIENT_ID) {
        console.log("OneDrive não configurado, pulando upload.");
        return;
    }

    try {
        const client = await getGraphClient();
        const userId = process.env.ONEDRIVE_USER_EMAIL;
        
        console.log(`Fazendo upload para OneDrive: ${remotePath}/${fileName}`);
        
        // Upload simples (limite de 4MB)
        await client.api(`/users/${userId}/drive/root:/${remotePath}/${fileName}:/content`)
            .put(fileBuffer);
            
        console.log("UPLOAD CONCLUÍDO NO ONEDRIVE.");
    } catch (error) {
        console.error("ERRO NO UPLOAD ONEDRIVE:", error.message);
        throw error;
    }
}

module.exports = {
    uploadToOneDrive,
    ensureFolder,
    ensurePath
};
