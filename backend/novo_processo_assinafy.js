/**
 * novo_processo_assinafy.js
 * Integração definitiva com API Assinafy.
 * Usa apenas módulos nativos do Node.js + form-data.
 *
 * ENDPOINTS CONFIRMADOS via testes diretos:
 *  - Upload:     POST /v1/accounts/{accountId}/documents
 *  - Signatário: GET/POST/PUT /v1/accounts/{accountId}/signers
 *  - Status doc: GET /v1/documents/{docId}
 *  - Assignment: POST /v1/documents/{docId}/assignments
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const FormData = require('form-data'); // em "dependencies" no package.json

const db = require('./database');

// ============================================================
// CONFIGURAÇÃO
// ============================================================
const API_KEY = 'AxaT-FiXBckHqEYV0s_MtUhLF3pReRz3dX4zVpC173vmjDwzLGHYtDJuQje4-4Pd';
const ACCOUNT_ID = '10237785fb23cf473d54845a013e';
const HOSTNAME = 'api.assinafy.com.br';

// Quantas vezes verificar o status antes de desistir (2s cada = máx 60s)
const POLL_MAX_ATTEMPTS = 30;
const POLL_INTERVAL_MS = 2000;

// ============================================================
// HELPERS HTTP NATIVOS
// ============================================================

function httpsRequest(method, urlPath, headers, bodyStringOrNull) {
    return new Promise((resolve, reject) => {
        const opts = {
            hostname: HOSTNAME,
            path: urlPath,
            method,
            headers: { 'X-Api-Key': API_KEY, ...headers }
        };
        const req = https.request(opts, (res) => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                const raw = Buffer.concat(chunks).toString('utf8');
                let json;
                try { json = JSON.parse(raw); } catch { json = null; }
                console.log(`[ASSINAFY ${method}] ${urlPath} → HTTP ${res.statusCode} | ${raw.substring(0, 250)}`);
                resolve({ status: res.statusCode, json, raw });
            });
        });
        req.on('error', reject);
        req.setTimeout(25000, () => req.destroy(new Error(`Timeout na chamada ${method} ${urlPath}`)));
        if (bodyStringOrNull) req.write(bodyStringOrNull);
        req.end();
    });
}

function getJSON(urlPath) {
    return httpsRequest('GET', urlPath, { 'Accept': 'application/json' }, null);
}

function postJSON(urlPath, payload) {
    const body = JSON.stringify(payload);
    return httpsRequest('POST', urlPath, {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
    }, body);
}

function putJSON(urlPath, payload) {
    const body = JSON.stringify(payload);
    return httpsRequest('PUT', urlPath, {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
    }, body);
}

// Upload multipart — retorna Promise
function postForm(urlPath, form) {
    return new Promise((resolve, reject) => {
        const fh = form.getHeaders();
        const opts = {
            hostname: HOSTNAME,
            path: urlPath,
            method: 'POST',
            headers: { 'X-Api-Key': API_KEY, ...fh }
        };
        const req = https.request(opts, (res) => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                const raw = Buffer.concat(chunks).toString('utf8');
                let json;
                try { json = JSON.parse(raw); } catch { json = null; }
                console.log(`[ASSINAFY UPLOAD] ${urlPath} → HTTP ${res.statusCode} | ${raw.substring(0, 250)}`);
                resolve({ status: res.statusCode, json, raw });
            });
        });
        req.on('error', reject);
        req.setTimeout(60000, () => req.destroy(new Error('Timeout no upload para Assinafy')));
        form.pipe(req);
    });
}

// ============================================================
// POLLING: aguarda o documento sair do estado metadata_processing
// ============================================================
async function aguardarDocumentoPronto(docId) {
    console.log(`[POLL] Aguardando documento ${docId} ficar pronto...`);

    for (let i = 1; i <= POLL_MAX_ATTEMPTS; i++) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

        const res = await getJSON(`/v1/documents/${docId}`);

        if (res.status !== 200 || !res.json) {
            throw new Error(`Erro ao verificar status do documento (HTTP ${res.status}): ${res.raw.substring(0, 200)}`);
        }

        const doc = res.json.data || res.json;
        const status = (doc.status || '').toLowerCase();
        const processing = status.includes('processing') || status.includes('metadata');

        console.log(`[POLL] Tentativa ${i}/${POLL_MAX_ATTEMPTS} | status: "${status || 'sem campo status'}"`);

        // Se não há campo status OU status não é processing, está pronto
        if (!processing) {
            console.log(`[POLL] Documento pronto! status="${status}"`);
            return doc;
        }
    }

    throw new Error(`Documento ainda em processamento após ${POLL_MAX_ATTEMPTS * POLL_INTERVAL_MS / 1000}s. Tente novamente em alguns instantes.`);
}

// ============================================================
// RESOLVER SIGNATÁRIO (busca por CPF ou cria novo)
// ============================================================
async function resolverSignatario(nomeColab, emailColaborador, cpfLimpo, foneLimpo) {
    const searchRes = await getJSON(`/v1/accounts/${ACCOUNT_ID}/signers?tax_id=${cpfLimpo}`);
    const lista = searchRes.json?.data || [];

    if (Array.isArray(lista) && lista.length > 0) {
        const existing = lista[0];
        console.log(`[3] Signatário existente: ID=${existing.id} | email=${existing.email}`);

        // Atualizar e-mail se diferente
        if (existing.email !== emailColaborador) {
            console.log(`[3] Atualizando e-mail de "${existing.email}" para "${emailColaborador}"...`);
            await putJSON(`/v1/accounts/${ACCOUNT_ID}/signers/${existing.id}`, {
                full_name: nomeColab,
                email: emailColaborador,
                tax_id: cpfLimpo,
                ...(foneLimpo ? { whatsapp_phone_number: foneLimpo } : {})
            });
        }
        return existing.id;
    }

    // Criar novo signatário
    console.log(`[3] Criando novo signatário: ${nomeColab} <${emailColaborador}>`);
    const createRes = await postJSON(`/v1/accounts/${ACCOUNT_ID}/signers`, {
        full_name: nomeColab,
        email: emailColaborador,
        tax_id: cpfLimpo,
        ...(foneLimpo ? { whatsapp_phone_number: foneLimpo } : {})
    });

    if (createRes.status < 200 || createRes.status >= 300) {
        const msg = createRes.json?.message || createRes.raw.substring(0, 200);
        throw new Error(`Erro ao criar signatário (HTTP ${createRes.status}): ${msg}`);
    }

    const signerId = createRes.json?.data?.id || createRes.json?.id;
    if (!signerId) throw new Error(`Signatário criado mas ID não retornado: ${createRes.raw.substring(0, 200)}`);
    console.log(`[3] Signatário criado. ID=${signerId}`);
    return signerId;
}

// ============================================================
// FUNÇÃO PRINCIPAL
// ============================================================
async function enviarDocumentoParaAssinafy(documentId, colaboradorId) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`ASSINAFY: Iniciando envio | Doc=${documentId} | Colab=${colaboradorId}`);
    console.log('='.repeat(60));

    // 1. Buscar dados no banco
    const doc = await new Promise((resolve, reject) =>
        db.get('SELECT * FROM documentos WHERE id = ?', [documentId],
            (err, row) => err ? reject(err) : resolve(row)));

    const colab = await new Promise((resolve, reject) =>
        db.get('SELECT * FROM colaboradores WHERE id = ?', [colaboradorId],
            (err, row) => err ? reject(err) : resolve(row)));

    if (!doc) throw new Error('Documento não encontrado no banco.');
    if (!colab) throw new Error('Colaborador não encontrado no banco.');

    const emailColaborador = (colab.email || '').trim();
    if (!emailColaborador) {
        throw new Error(`Colaborador "${colab.nome_completo}" não tem e-mail cadastrado. Preencha o e-mail antes de enviar.`);
    }

    const cpfLimpo = (colab.cpf || '').replace(/\D/g, '');
    if (!cpfLimpo) throw new Error('CPF do colaborador é obrigatório para o Assinafy.');

    const foneLimpo = (colab.telefone || '').replace(/\D/g, '');
    const nomeColab = colab.nome_completo || 'Colaborador';

    console.log(`[1] Colaborador: ${nomeColab} | Email: ${emailColaborador} | CPF: ${cpfLimpo}`);

    // 2. UPLOAD DO ARQUIVO
    const filePath = path.resolve(doc.file_path);
    if (!fs.existsSync(filePath)) {
        throw new Error(`Arquivo físico não encontrado no servidor: ${filePath}`);
    }

    const fileName = doc.file_name || path.basename(filePath);
    console.log(`[2] Fazendo upload: "${fileName}" (${Math.round(fs.statSync(filePath).size / 1024)} KB)`);

    const fd = new FormData();
    fd.append('file', fs.createReadStream(filePath), {
        filename: fileName,
        contentType: 'application/pdf'
    });

    const uploadRes = await postForm(`/v1/accounts/${ACCOUNT_ID}/documents`, fd);

    if (uploadRes.status < 200 || uploadRes.status >= 300) {
        const msg = uploadRes.json?.message || uploadRes.raw.substring(0, 200);
        throw new Error(`Falha no upload para Assinafy (HTTP ${uploadRes.status}): ${msg}`);
    }

    const uploadDocData = uploadRes.json?.data || uploadRes.json;
    const assinafyDocId = uploadDocData?.id;

    if (!assinafyDocId) {
        throw new Error(`Upload OK mas ID do documento não retornado. Resposta: ${uploadRes.raw.substring(0, 300)}`);
    }

    console.log(`[2] Upload OK! Assinafy Doc ID: ${assinafyDocId}`);

    // 3. AGUARDAR DOCUMENTO SAIR DO ESTADO metadata_processing
    const docPronto = await aguardarDocumentoPronto(assinafyDocId);
    const signingUrlFromDoc = docPronto?.signing_url;

    // 4. RESOLVER SIGNATÁRIO
    const signerId = await resolverSignatario(nomeColab, emailColaborador, cpfLimpo, foneLimpo);

    // 5. CRIAR ASSIGNMENT
    // ENDPOINT CONFIRMADO: POST /v1/documents/{docId}/assignments (without /accounts/)
    console.log(`[4] Criando assignment: doc=${assinafyDocId} | signer=${signerId}`);
    const assignRes = await postJSON(`/v1/documents/${assinafyDocId}/assignments`, {
        signers: [{
            id: signerId,
            role: 'signer',
            notification_methods: ['Email', 'WhatsApp']
        }],
        method: 'virtual'
    });

    if (assignRes.status < 200 || assignRes.status >= 300) {
        const msg = assignRes.json?.message || assignRes.raw.substring(0, 200);
        throw new Error(`Erro ao criar assignment (HTTP ${assignRes.status}): ${msg}`);
    }

    // Extrair URL de assinatura do assignment
    const assignData = assignRes.json?.data;
    const assignList = Array.isArray(assignData) ? assignData : (assignData ? [assignData] : []);
    const urlAssinatura = (
        (assignList[0] && (assignList[0].signature_url || assignList[0].signing_url || assignList[0].url)) ||
        signingUrlFromDoc ||
        `https://app.assinafy.com.br/sign/${assinafyDocId}`
    );

    console.log(`[4] Assignment criado! URL: ${urlAssinatura}`);

    // 6. SALVAR NO BANCO LOCAL
    await new Promise((resolve, reject) =>
        db.run(
            `UPDATE documentos SET assinafy_id = ?, assinafy_status = 'Pendente', assinafy_url = ? WHERE id = ?`,
            [assinafyDocId, urlAssinatura, documentId],
            (err) => err ? reject(err) : resolve()
        )
    );
    console.log(`[5] Banco atualizado: assinafy_id=${assinafyDocId}`);

    return { assinafyDocId, urlAssinatura, emailColaborador, nomeColab, docType: doc.document_type };
}

module.exports = { enviarDocumentoParaAssinafy };