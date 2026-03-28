const fs = require('fs');
const path = require('path');
const https = require('https');
const FormData = require('form-data'); // em dependencies no package.json

const db = require('./database');

// ============================================
// CONFIGURAÇÃO DO ASSINAFY
// ============================================
const ASSINAFY_CONFIG = {
    apiKey: 'AxaT-FiXBckHqEYV0s_MtUhLF3pReRz3dX4zVpC173vmjDwzLGHYtDJuQje4-4Pd',
    accountId: '10237785fb23cf473d54845a013e',
    hostname: 'api.assinafy.com.br'
};

// ============================================
// HELPERS HTTPS NATIVOS
// ============================================

// POST Multipart (form-data para upload de arquivo)
function httpsPostForm(urlPath, form) {
    return new Promise((resolve, reject) => {
        const formHeaders = form.getHeaders();
        const options = {
            hostname: ASSINAFY_CONFIG.hostname,
            path: urlPath,
            method: 'POST',
            headers: {
                'X-Api-Key': ASSINAFY_CONFIG.apiKey,
                ...formHeaders
            }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                let parsed;
                try { parsed = JSON.parse(data); } catch (e) { parsed = { raw: data }; }
                console.log(`[POST FORM] ${urlPath} → ${res.statusCode} | ${data.substring(0, 300)}`);
                resolve({ status: res.statusCode, data: parsed });
            });
        });
        req.on('error', reject);
        req.setTimeout(30000, () => req.destroy(new Error('Timeout ao fazer upload para Assinafy')));
        form.pipe(req);
    });
}

// POST JSON
function httpsPostJSON(urlPath, payload) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(payload);
        const options = {
            hostname: ASSINAFY_CONFIG.hostname,
            path: urlPath,
            method: 'POST',
            headers: {
                'X-Api-Key': ASSINAFY_CONFIG.apiKey,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                let parsed;
                try { parsed = JSON.parse(data); } catch (e) { parsed = { raw: data }; }
                console.log(`[POST JSON] ${urlPath} → ${res.statusCode} | ${data.substring(0, 300)}`);
                resolve({ status: res.statusCode, data: parsed });
            });
        });
        req.on('error', reject);
        req.setTimeout(15000, () => req.destroy(new Error('Timeout chamada JSON Assinafy')));
        req.write(body);
        req.end();
    });
}

// PUT JSON
function httpsPutJSON(urlPath, payload) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(payload);
        const options = {
            hostname: ASSINAFY_CONFIG.hostname,
            path: urlPath,
            method: 'PUT',
            headers: {
                'X-Api-Key': ASSINAFY_CONFIG.apiKey,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                let parsed;
                try { parsed = JSON.parse(data); } catch (e) { parsed = { raw: data }; }
                console.log(`[PUT JSON] ${urlPath} → ${res.statusCode}`);
                resolve({ status: res.statusCode, data: parsed });
            });
        });
        req.on('error', reject);
        req.setTimeout(15000, () => req.destroy(new Error('Timeout PUT Assinafy')));
        req.write(body);
        req.end();
    });
}

// GET JSON
function httpsGetJSON(urlPath) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: ASSINAFY_CONFIG.hostname,
            path: urlPath,
            method: 'GET',
            headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                let parsed;
                try { parsed = JSON.parse(data); } catch (e) { parsed = { raw: data }; }
                console.log(`[GET] ${urlPath} → ${res.statusCode}`);
                resolve({ status: res.statusCode, data: parsed });
            });
        });
        req.on('error', reject);
        req.setTimeout(15000, () => req.destroy(new Error('Timeout GET Assinafy')));
        req.end();
    });
}

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================
async function enviarDocumentoParaAssinafy(documentId, colaboradorId) {
    console.log(`\n--- PROCESSO ASSINAFY INICIADO ---`);
    console.log(`Doc ID: ${documentId} | Colaborador ID: ${colaboradorId}`);

    // 1. Buscar dados no banco
    const doc = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM documentos WHERE id = ?', [documentId],
            (err, row) => err ? reject(err) : resolve(row));
    });
    const colab = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM colaboradores WHERE id = ?', [colaboradorId],
            (err, row) => err ? reject(err) : resolve(row));
    });

    if (!doc) throw new Error('Documento não encontrado no banco de dados.');
    if (!colab) throw new Error('Colaborador não encontrado no banco de dados.');

    const emailColaborador = colab.email ? colab.email.trim() : null;
    if (!emailColaborador) {
        throw new Error(`O colaborador "${colab.nome_completo}" não tem e-mail cadastrado. Preencha o e-mail antes de enviar.`);
    }

    const cpfLimpo = colab.cpf ? colab.cpf.replace(/\D/g, '') : null;
    if (!cpfLimpo) throw new Error('CPF é obrigatório para o Assinafy.');

    const foneLimpo = colab.telefone ? colab.telefone.replace(/\D/g, '') : '';
    const nomeColab = colab.nome_completo || 'Colaborador';

    console.log(`[1] Para: ${nomeColab} <${emailColaborador}>`);

    // 2. UPLOAD DO ARQUIVO
    const filePath = path.resolve(doc.file_path);
    if (!fs.existsSync(filePath)) throw new Error(`Arquivo não encontrado: ${filePath}`);

    const fileName = doc.file_name || path.basename(filePath);
    const fd = new FormData();
    fd.append('file', fs.createReadStream(filePath), {
        filename: fileName,
        contentType: 'application/pdf'
    });

    console.log(`[2] Upload: "${fileName}"`);
    // ENDPOINT CORRETO: /v1/accounts/{accountId}/documents
    const uploadRes = await httpsPostForm(
        `/v1/accounts/${ASSINAFY_CONFIG.accountId}/documents`,
        fd
    );

    if (uploadRes.status < 200 || uploadRes.status >= 300) {
        const msg = uploadRes.data?.message || uploadRes.data?.error || JSON.stringify(uploadRes.data);
        throw new Error(`Falha no upload (HTTP ${uploadRes.status}): ${msg}`);
    }

    const uploadData = uploadRes.data;
    // O ID pode estar em data.id ou data.data.id
    const assinafyDocId = (uploadData.data && uploadData.data.id)
        ? uploadData.data.id
        : uploadData.id;

    if (!assinafyDocId) {
        throw new Error(`Upload OK mas ID não retornado. Body: ${JSON.stringify(uploadData).substring(0, 300)}`);
    }
    
    // O link de assinatura já vem no upload (signing_url no objeto do documento)
    const signingUrlFromUpload = (uploadData.data && uploadData.data.signing_url)
        ? uploadData.data.signing_url
        : uploadData.signing_url;

    console.log(`[2] Upload OK. Doc ID: ${assinafyDocId} | signing_url: ${signingUrlFromUpload}`);

    // Aguardar processamento do Assinafy
    await new Promise(r => setTimeout(r, 2000));

    // 3. BUSCAR OU CRIAR SIGNATÁRIO
    console.log(`[3] Buscando signatário CPF: ${cpfLimpo}...`);
    let signerId = null;

    // ENDPOINT CORRETO: /v1/accounts/{accountId}/signers
    const searchRes = await httpsGetJSON(
        `/v1/accounts/${ASSINAFY_CONFIG.accountId}/signers?tax_id=${cpfLimpo}`
    );
    const searchList = searchRes.data?.data || [];

    if (Array.isArray(searchList) && searchList.length > 0) {
        signerId = searchList[0].id;
        console.log(`[3] Encontrado. ID: ${signerId} | E-mail atual: ${searchList[0].email}`);

        if (searchList[0].email !== emailColaborador) {
            console.log(`[3] Atualizando e-mail...`);
            await httpsPutJSON(
                `/v1/accounts/${ASSINAFY_CONFIG.accountId}/signers/${signerId}`,
                {
                    full_name: nomeColab,
                    email: emailColaborador,
                    tax_id: cpfLimpo,
                    ...(foneLimpo ? { whatsapp_phone_number: foneLimpo } : {})
                }
            );
        }
    } else {
        console.log(`[3] Criando novo signatário...`);
        const createRes = await httpsPostJSON(
            `/v1/accounts/${ASSINAFY_CONFIG.accountId}/signers`,
            {
                full_name: nomeColab,
                email: emailColaborador,
                tax_id: cpfLimpo,
                ...(foneLimpo ? { whatsapp_phone_number: foneLimpo } : {})
            }
        );

        if (createRes.status < 200 || createRes.status >= 300) {
            const msg = createRes.data?.message || createRes.data?.error || JSON.stringify(createRes.data);
            throw new Error(`Erro ao criar signatário (HTTP ${createRes.status}): ${msg}`);
        }
        signerId = createRes.data?.data?.id || createRes.data?.id;
        console.log(`[3] Criado. ID: ${signerId}`);
    }

    if (!signerId) throw new Error('Não foi possível obter o ID do signatário.');

    // 4. CRIAR ASSIGNMENT
    // ENDPOINT CORRETO: /v1/documents/{docId}/assignments (SEM /accounts/{accountId}/)
    console.log(`[4] Criando assignment para doc ${assinafyDocId}...`);
    const assignmentRes = await httpsPostJSON(
        `/v1/documents/${assinafyDocId}/assignments`,
        {
            signers: [{
                id: signerId,
                role: 'signer',
                notification_methods: ['Email', 'WhatsApp']
            }],
            method: 'virtual'
        }
    );

    if (assignmentRes.status < 200 || assignmentRes.status >= 300) {
        const msg = assignmentRes.data?.message || assignmentRes.data?.error || JSON.stringify(assignmentRes.data);
        throw new Error(`Erro ao criar assignment (HTTP ${assignmentRes.status}): ${msg}`);
    }

    // Extrair URL de assinatura do assignment ou do upload
    const assignList = Array.isArray(assignmentRes.data?.data)
        ? assignmentRes.data.data
        : (Array.isArray(assignmentRes.data) ? assignmentRes.data : []);

    const urlAssinatura = assignList.length > 0
        ? (assignList[0].signature_url || assignList[0].signing_url || assignList[0].url)
        : signingUrlFromUpload; // fallback para o signing_url que veio no upload

    console.log(`[4] Assignment criado! URL: ${urlAssinatura}`);

    // 5. SALVAR NO BANCO LOCAL
    await new Promise((resolve, reject) => {
        db.run(
            `UPDATE documentos SET assinafy_id = ?, assinafy_status = 'Pendente', assinafy_url = ? WHERE id = ?`,
            [assinafyDocId, urlAssinatura, documentId],
            (err) => {
                if (err) { console.error('[5] Erro ao salvar banco:', err.message); reject(err); }
                else { console.log('[5] Banco atualizado.'); resolve(); }
            }
        );
    });

    return {
        assinafyDocId,
        urlAssinatura,
        emailColaborador,
        nomeColab,
        docType: doc.document_type
    };
}

module.exports = { enviarDocumentoParaAssinafy };