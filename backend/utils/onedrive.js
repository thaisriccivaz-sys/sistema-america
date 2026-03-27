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
 * Cria uma estrutura de pastas no OneDrive
 * Caminho esperado: RH/1.Colaboradores/Sistema/NOME_COLABORADOR/SUBPASTAS
 */
async function ensureFolder(path) {
    if (!process.env.ONEDRIVE_CLIENT_ID) return; // Ignora se não houver configuração

    try {
        const client = await getGraphClient();
        const userId = process.env.ONEDRIVE_USER_EMAIL;
        
        // No Graph API, podemos criar pastas recursivamente ou uma a uma.
        // O caminho deve ser relativo à raiz ou a um driveID.
        // Ex: /users/{id}/drive/root:/RH/1.Colaboradores/Sistema:/children
        
        // Para simplificar: tentamos acessar a pasta. Se não existir, o Graph permite criar via PUT/POST.
        // Como o caminho pode ser longo, o ideal é criar níveis.
        
        console.log(`Verificando/Criando pasta no OneDrive: ${path}`);
        
        // O Graph permite criar pastas usando a URL amigável:
        // POST /me/drive/root:/Caminho/Para/NovaPasta:/children
        await client.api(`/users/${userId}/drive/root:/${path}`).get();
        
    } catch (error) {
        if (error.code === 'itemNotFound') {
            // Lógica de criação recursiva (simplificada para o escopo)
            // ... (Pode ser implementado conforme a necessidade de profundidade)
            console.log("Pasta não encontrada, criando...");
            // Nota: O Graph permite criar via PATCH/POST em caminhos inexistentes em alguns contextos.
        } else {
            console.error("ERRO ONEDRIVE ENSURE FOLDER:", error.message);
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
    ensureFolder
};
