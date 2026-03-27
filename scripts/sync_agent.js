const fs = require('fs');
const path = require('path');
const https = require('https');

// --- CONFIGURAÇÃO ---
const API_URL = "https://sistema-america.onrender.com/api";
const LOCAL_PATH = "C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\RH\\1.Colaboradores\\Sistema";
const CREDS = { usuario: 'admin', senha: '123' }; // Usuário padrão conforme banco inicial

console.log("--- INICIANDO AGENTE DE SINCRONIZAÇÃO AMÉRICA ---");
console.log("Destino Local:", LOCAL_PATH);

async function request(url, options = {}, body = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
                } else {
                    reject(new Error(`Erro ${res.statusCode}: ${data}`));
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

function downloadFile(url, dest, token) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, { headers: { 'Authorization': `Bearer ${token}` } }, (res) => {
            if (res.statusCode !== 200) {
                file.close();
                fs.unlink(dest, () => {});
                return reject(new Error(`Erro no download: ${res.statusCode}`));
            }
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

async function startSync() {
    try {
        // 1. Pular Login (O sistema atual usa autenticação mockada)
        const token = 'mock_token';
        console.log("Iniciando busca de arquivos...");

        // 2. Listar arquivos
        const data = await request(`${API_URL}/maintenance/sync-files`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!data.files) {
            console.error("Erro: Lista de arquivos vazia ou inválida.");
            return;
        }

        const files = data.files;
        console.log(`Encontrados ${files.length} arquivos.`);

        // 3. Download
        for (const f of files) {
            const localFile = path.join(LOCAL_PATH, f.path);
            const localDir = path.dirname(localFile);

            if (!fs.existsSync(localDir)) {
                fs.mkdirSync(localDir, { recursive: true });
            }

            let shouldDownload = true;
            if (fs.existsSync(localFile)) {
                const stats = fs.statSync(localFile);
                if (stats.size === f.size) {
                    shouldDownload = false;
                }
            }

            if (shouldDownload) {
                console.log(`Baixando: ${f.path}...`);
                await downloadFile(`${API_URL}/maintenance/download-sync?path=${encodeURIComponent(f.path)}&token=${token}`, localFile, token);
            }
        }

        console.log("--- SINCRONIZAÇÃO CONCLUÍDA EM " + new Date().toLocaleTimeString() + " ---");
    } catch (err) {
        console.error("ERRO NA SINCRONIZAÇÃO:", err.message);
    }
}

// Executa a cada 5 minutos
startSync();
setInterval(startSync, 5 * 60 * 1000);
