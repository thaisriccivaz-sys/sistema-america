const fs = require('fs');
const path = require('path');
const https = require('https');
const FormData = require('form-data'); // já está em dependencies no package.json

const db = require('./database');

// ============================================
// CONFIGURAÇÃO DO ASSINAFY
// ============================================
const ASSINAFY_CONFIG = {
    apiKey: 'AxaT-FiXBckHqEYV0s_MtUhLF3pReRz3dX4zVpC173vmjDwzLGHYtDJuQje4-4Pd',
    accountId: '10237785fb23cf473d54845a013e',
    baseUrl: 'https://api.assinafy.com.br'
};

// ============================================
// HELPER: Requisição HTTPS com suporte a form-data e JSON
// ============================================
function httpsRequest(options, bodyOrForm) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                let parsed;
                try { parsed = JSON.parse(data); } catch(e) { parsed = data; }
                resolve({ status: res.statusCode, data: parsed, raw: data });
            });
        });
        req.on('error', reject);
        req.setTimeout(30000, () => { req.destroy(new Error('Timeout de 30s ao chamar Assinafy')); });

        if (bodyOrForm instanceof FormData) {
            bodyOrForm.pipe(req);
        } else if (bodyOrForm) {
            req.write(bodyOrForm);
            req.end();
        } else {
            req.end();
        }
    });
}

// POST JSON
function assinafyPostJSON(endpoint, payload) {
    const body = JSON.stringify(payload);
    const options = {
        hostname: 'api.assinafy.com.br',
        path: endpoint,
        method: 'POST',
        headers: {
            'X-Api-Key': ASSINAFY_CONFIG.apiKey,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
        }
    };
    console.log(`[ASSINAFY POST JSON] ${endpoint}`);
    return httpsRequest(options, body);
}

// PUT JSON
function assinafyPutJSON(endpoint, payload) {
    const body = JSON.stringify(payload);
    const options = {
        hostname: 'api.assinafy.com.br',
        path: endpoint,
        method: 'PUT',
        headers: {
            'X-Api-Key': ASSINAFY_CONFIG.apiKey,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
        }
    };
    console.log(`[ASSINAFY PUT JSON] ${endpoint}`);
    return httpsRequest(options, body);
}

// GET
function assinafyGet(endpoint) {
    const options = {
        hostname: 'api.assinafy.com.br',
        path: endpoint,
        method: 'GET',
        headers: {
            'X-Api-Key': ASSINAFY_CONFIG.apiKey
        }
    };
    console.log(`[ASSINAFY GET] ${endpoint}`);
    return httpsRequest(options, null);
}

// POST Multipart (form-data)
function assinafyPostForm(endpoint, form) {
    return new Promise((resolve, reject) => {
        const formHeaders = form.getHeaders();
        const options = {
            hostname: 'api.assinafy.com.br',
            path: endpoint,
            method: 'POST',
            headers: {
                'X-Api-Key': ASSINAFY_CONFIG.apiKey,
                ...formHeaders
            }
        };
        console.log(`[ASSINAFY POST FORM] ${endpoint}`);
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                let parsed;
                try { parsed = JSON.parse(data); } catch(e) { parsed = data; }
                console.log(`[ASSINAFY FORM] Status: ${res.statusCode} | ${data.substring(0, 400)}`);
                resolve({ status: res.statusCode, data: parsed, raw: data });
            });
        });
        req.on('error', reject);
        req.setTimeout(30000, () => { req.destroy(new Error('Timeout de 30s no upload para Assinafy')); });
        form.pipe(req);
    });
}

// ============================================
// FUNÇÃO PRINCIPAL DE ENVIO
// ============================================
async function enviarDocumentoParaAssinafy(documentId, colaboradorId) {
    console.log(`\n--- INICIANDO PROCESSO ASSINAFY ---`);
    console.log(`Doc ID: ${documentId} | Colaborador ID: ${colaboradorId}`);

    // 1. Buscar dados no banco
    const doc = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM documentos WHERE id = ?', [documentId], (err, row) => err ? reject(err) : resolve(row));
    });
    const colab = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM colaboradores WHERE id = ?', [colaboradorId], (err, row) => err ? reject(err) : resolve(row));
    });

    if (!doc) throw new Error("Documento não encontrado no banco de dados.");
    if (!colab) throw new Error("Colaborador não encontrado no banco de dados.");

    // 2. Validar e-mail
    const emailColaborador = colab.email ? colab.email.trim() : null;
    if (!emailColaborador) {
        throw new Error(`O colaborador "${colab.nome_completo || 'Sem Nome'}" não tem e-mail cadastrado. Preencha o e-mail antes de enviar para o Assinafy.`);
    }

    const cpfLimpo = colab.cpf ? colab.cpf.replace(/\D/g, '') : null;
    if (!cpfLimpo) throw new Error("CPF é obrigatório para o Assinafy.");

    const foneLimpo = colab.telefone ? colab.telefone.replace(/\D/g, '') : '';
    const nomeColab = colab.nome_completo || 'Colaborador';

    console.log(`[1] Para: ${nomeColab} <${emailColaborador}>`);

    // 3. UPLOAD DO ARQUIVO
    const filePath = path.resolve(doc.file_path);
    if (!fs.existsSync(filePath)) throw new Error(`Arquivo não encontrado: ${filePath}`);

    const fileName = doc.file_name || path.basename(filePath);
    const fd = new FormData();
    fd.append('file', fs.createReadStream(filePath), { filename: fileName, contentType: 'application/pdf' });

    console.log(`[2] Fazendo upload: "${fileName}"`);
    const uploadRes = await assinafyPostForm(
        `/v1/accounts/${ASSINAFY_CONFIG.accountId}/documents`,
        fd
    );

    if (uploadRes.status < 200 || uploadRes.status >= 300) {
        const msg = (uploadRes.data && (uploadRes.data.message || uploadRes.data.error)) || uploadRes.raw;
        throw new Error(`Falha no upload do documento (HTTP ${uploadRes.status}): ${msg}`);
    }

    const uploadData = uploadRes.data;
    const assinafyDocId = (uploadData.data && uploadData.data.id) ? uploadData.data.id : uploadData.id;
    if (!assinafyDocId) throw new Error(`Upload OK mas ID não retornado. Resposta: ${JSON.stringify(uploadData).substring(0, 300)}`);
    console.log(`[2] Upload OK. Doc ID Assinafy: ${assinafyDocId}`);

    // Aguardar processamento
    await new Promise(r => setTimeout(r, 3000));

    // 4. BUSCAR OU CRIAR SIGNATÁRIO
    console.log(`[3] Resolvendo signatário (CPF: ${cpfLimpo})...`);
    let signerId = null;

    const searchRes = await assinafyGet(
        `/v1/accounts/${ASSINAFY_CONFIG.accountId}/signers?tax_id=${cpfLimpo}`
    );
    const searchData = searchRes.data;
    const list = (searchData && searchData.data) ? searchData.data : (Array.isArray(searchData) ? searchData : []);

    if (Array.isArray(list) && list.length > 0) {
        signerId = list[0].id;
        console.log(`[3] Signatário encontrado. ID: ${signerId}`);

        if (list[0].email !== emailColaborador) {
            console.log(`[3] Atualizando e-mail...`);
            await assinafyPutJSON(
                `/v1/accounts/${ASSINAFY_CONFIG.accountId}/signers/${signerId}`,
                { full_name: nomeColab, email: emailColaborador, tax_id: cpfLimpo, whatsapp_phone_number: foneLimpo || undefined }
            );
        }
    } else {
        console.log(`[3] Criando novo signatário...`);
        const createRes = await assinafyPostJSON(
            `/v1/accounts/${ASSINAFY_CONFIG.accountId}/signers`,
            { full_name: nomeColab, email: emailColaborador, tax_id: cpfLimpo, whatsapp_phone_number: foneLimpo || undefined }
        );

        if (createRes.status < 200 || createRes.status >= 300) {
            const msg = (createRes.data && (createRes.data.message || createRes.data.error)) || createRes.raw;
            throw new Error(`Erro ao criar signatário (HTTP ${createRes.status}): ${msg}`);
        }
        const createData = createRes.data;
        signerId = (createData.data && createData.data.id) ? createData.data.id : createData.id;
        console.log(`[3] Signatário criado. ID: ${signerId}`);
    }

    if (!signerId) throw new Error("Não foi possível obter o ID do signatário.");

    // 5. CRIAR SOLICITAÇÃO DE ASSINATURA
    console.log(`[4] Criando assignment...`);
    const assignmentRes = await assinafyPostJSON(
        `/v1/accounts/${ASSINAFY_CONFIG.accountId}/documents/${assinafyDocId}/assignments`,
        {
            signers: [{ id: signerId, role: 'signer', notification_methods: ["Email", "WhatsApp"] }],
            method: 'virtual'
        }
    );

    if (assignmentRes.status < 200 || assignmentRes.status >= 300) {
        const msg = (assignmentRes.data && (assignmentRes.data.message || assignmentRes.data.error)) || assignmentRes.raw;
        throw new Error(`Erro ao criar solicitação de assinatura (HTTP ${assignmentRes.status}): ${msg}`);
    }

    const assignmentData = assignmentRes.data;
    const assignList = (assignmentData.data && Array.isArray(assignmentData.data))
        ? assignmentData.data
        : (Array.isArray(assignmentData) ? assignmentData : []);

    const urlAssinatura = assignList.length > 0
        ? (assignList[0].signature_url || assignList[0].url || assignList[0].sign_url)
        : null;

    console.log(`[4] OK! Link: ${urlAssinatura}`);

    // 6. SALVAR NO BANCO
    await new Promise((resolve, reject) => {
        db.run(
            `UPDATE documentos SET assinafy_id = ?, assinafy_status = 'Pendente', assinafy_url = ? WHERE id = ?`,
            [assinafyDocId, urlAssinatura, documentId],
            (err) => { if (err) { console.error("Erro ao salvar no banco:", err.message); reject(err); } else resolve(); }
        );
    });
    console.log(`[5] Salvo no banco.`);

    return { assinafyDocId, urlAssinatura, emailColaborador, nomeColab, docType: doc.document_type };
}

module.exports = { enviarDocumentoParaAssinafy };