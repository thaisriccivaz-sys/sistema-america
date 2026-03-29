/**
 * novo_processo_assinafy.js - V FINAL
 *
 * Esta versão estava funcionando corretamente em produção.
 * O e-mail é enviado pelo próprio Assinafy quando o assignment é criado
 * com notification_methods: ["Email", "WhatsApp"]
 *
 * Endpoints confirmados por testes diretos na API:
 *  - Upload:      POST /v1/accounts/{accountId}/documents          (multipart)
 *  - Signatários: GET/POST/PUT /v1/accounts/{accountId}/signers
 *  - Status doc:  GET /v1/documents/{docId}
 *  - Assignment:  POST /v1/documents/{docId}/assignments           (SEM /accounts/)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const FormData = require('form-data');

const db = require('./database');

// ============================================================
// CONFIGURAÇÃO
// ============================================================
const API_KEY    = 'AxaT-FiXBckHqEYV0s_MtUhLF3pReRz3dX4zVpC173vmjDwzLGHYtDJuQje4-4Pd';
const ACCOUNT_ID = '10237785fb23cf473d54845a013e';
const HOSTNAME   = 'api.assinafy.com.br';

// ============================================================
// HELPERS HTTP
// ============================================================

/** Requisição JSON (GET, POST, PUT) */
function req(method, urlPath, bodyObj) {
    return new Promise((resolve, reject) => {
        const body = bodyObj ? JSON.stringify(bodyObj) : null;
        const options = {
            hostname: HOSTNAME,
            path: urlPath,
            method,
            headers: {
                'X-Api-Key': API_KEY,
                'Accept': 'application/json',
                ...(body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {})
            }
        };
        const request = https.request(options, (res) => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                const raw = Buffer.concat(chunks).toString('utf8');
                let json = null;
                try { json = JSON.parse(raw); } catch(e) {}
                console.log(`[ASSINAFY ${method}] ${urlPath} → ${res.statusCode} | ${raw.substring(0, 200)}`);
                resolve({ status: res.statusCode, json, raw });
            });
        });
        request.on('error', reject);
        request.setTimeout(30000, () => request.destroy(new Error(`Timeout ${method} ${urlPath}`)));
        if (body) request.write(body);
        request.end();
    });
}

/** Upload multipart/form-data */
function uploadForm(urlPath, form) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: HOSTNAME,
            path: urlPath,
            method: 'POST',
            headers: {
                'X-Api-Key': API_KEY,
                ...form.getHeaders()
            }
        };
        const request = https.request(options, (res) => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                const raw = Buffer.concat(chunks).toString('utf8');
                let json = null;
                try { json = JSON.parse(raw); } catch(e) {}
                console.log(`[ASSINAFY UPLOAD] ${urlPath} → ${res.statusCode} | ${raw.substring(0, 300)}`);
                resolve({ status: res.statusCode, json, raw });
            });
        });
        request.on('error', reject);
        request.setTimeout(60000, () => request.destroy(new Error('Timeout no upload para Assinafy')));
        form.pipe(request);
    });
}

// ============================================================
// FUNÇÃO PRINCIPAL
// ============================================================
async function enviarDocumentoParaAssinafy(documentId, colaboradorId) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`[ASSINAFY] INÍCIO | Doc=${documentId} | Colab=${colaboradorId}`);

    // 1. Dados do banco
    const doc = await new Promise((res, rej) =>
        db.get('SELECT * FROM documentos WHERE id = ?', [documentId],
            (err, row) => err ? rej(err) : res(row)));

    const colab = await new Promise((res, rej) =>
        db.get('SELECT * FROM colaboradores WHERE id = ?', [colaboradorId],
            (err, row) => err ? rej(err) : res(row)));

    if (!doc)   throw new Error('Documento não encontrado no banco.');
    if (!colab) throw new Error('Colaborador não encontrado no banco.');

    const email  = (colab.email || '').trim();
    const cpf    = (colab.cpf   || '').replace(/\D/g, '');
    const fone   = (colab.telefone || '').replace(/\D/g, '');
    const nome   = colab.nome_completo || 'Colaborador';

    if (!email) throw new Error(`Colaborador "${nome}" não tem e-mail cadastrado. Preencha antes de enviar.`);
    if (!cpf)   throw new Error('CPF do colaborador é obrigatório.');

    console.log(`[1] ${nome} | ${email} | CPF: ${cpf}`);

    // 2. Upload do arquivo
    const filePath = path.resolve(doc.file_path);
    if (!fs.existsSync(filePath)) throw new Error(`Arquivo não encontrado: ${filePath}`);

    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), {
        filename: doc.file_name || path.basename(filePath),
        contentType: 'application/pdf'
    });

    console.log(`[2] Upload: "${doc.file_name || path.basename(filePath)}"`);
    const uploadRes = await uploadForm(`/v1/accounts/${ACCOUNT_ID}/documents`, form);

    if (uploadRes.status < 200 || uploadRes.status >= 300) {
        throw new Error(`Falha no upload (HTTP ${uploadRes.status}): ${uploadRes.json?.message || uploadRes.raw.substring(0, 150)}`);
    }

    const docData      = uploadRes.json?.data || uploadRes.json;
    const assinafyDocId = docData?.id;
    if (!assinafyDocId) throw new Error(`Upload OK mas ID não retornado: ${uploadRes.raw.substring(0, 200)}`);

    console.log(`[2] Upload OK → ID: ${assinafyDocId}`);

    // 3. Aguardar processamento pelo Assinafy (polling até sair de metadata_processing)
    console.log(`[3] Aguardando documento ficar pronto...`);
    for (let i = 1; i <= 60; i++) {
        await new Promise(r => setTimeout(r, 3000)); // espera 3s entre cada verificação

        const statusRes = await req('GET', `/v1/documents/${assinafyDocId}`, null);
        const docStatus = (statusRes.json?.data?.status || statusRes.json?.status || '').toLowerCase();

        console.log(`[POLL ${i}/60] status="${docStatus}"`);

        // Sai do loop se não estiver mais em processamento (ex: 'metadata_ready' ou 'ready' ou '200')
        if (!docStatus.includes('processing')) {
            console.log(`[3] Documento pronto!`);
            break;
        }

        if (i === 60) throw new Error('Timeout: O Assinafy demorou mais de 3 minutos para processar o PDF. Excedeu tempo limite.');
    }

    // 4. Buscar ou criar signatário
    console.log(`[4] Resolvendo signatário CPF=${cpf}...`);
    let signerId = null;

    const searchRes = await req('GET', `/v1/accounts/${ACCOUNT_ID}/signers?tax_id=${cpf}`, null);
    const lista = searchRes.json?.data || [];

    if (Array.isArray(lista) && lista.length > 0) {
        // Encontrar aquele que tem o e-mail EXATO, caso exista mais de um para o mesmo CPF
        const exactSigner = lista.find(s => s.email.toLowerCase() === email.toLowerCase());
        
        if (exactSigner) {
            signerId = exactSigner.id;
            console.log(`[4] Signatário exato encontrado! ID=${signerId} email=${exactSigner.email}`);
        } else {
            // Se nenhum tiver o e-mail desejado, pega o primeiro e tenta atualizar
            signerId = lista[0].id;
            console.log(`[4] Signatário existente ID=${signerId} email=${lista[0].email}`);
            console.log(`[4] Tentando atualizar e-mail para ${email}...`);
            const putRes = await req('PUT', `/v1/accounts/${ACCOUNT_ID}/signers/${signerId}`, {
                full_name: nome, email, tax_id: cpf,
                ...(fone ? { whatsapp_phone_number: fone } : {})
            });
            if (putRes.status >= 300) {
                console.error(`[PUT FAILED] Erro ao atualizar e-mail no Assinafy (status ${putRes.status}):`, putRes.raw);
                // Se falhar a atualização, ele prosseguirá com o email antigo/outro email do signatário, 
                // devido à rigidez da API. Mas pelo menos registramos no LOG.
            }
        }
    } else {
        console.log(`[4] Criando signatário ${nome}...`);
        const createRes = await req('POST', `/v1/accounts/${ACCOUNT_ID}/signers`, {
            full_name: nome, email, tax_id: cpf,
            ...(fone ? { whatsapp_phone_number: fone } : {})
        });

        if (createRes.status < 200 || createRes.status >= 300) {
            throw new Error(`Erro ao criar signatário (HTTP ${createRes.status}): ${createRes.json?.message || createRes.raw.substring(0, 150)}`);
        }

        signerId = createRes.json?.data?.id || createRes.json?.id;
        console.log(`[4] Signatário criado ID=${signerId}`);
    }

    if (!signerId) throw new Error('ID do signatário não obtido.');

    // 5. Criar o Assignment (Assinador do Documento com E-mail Automático)
    console.log(`[5] Criando assignment para o documento...`);
    const assignRes = await req('POST', `/v1/documents/${assinafyDocId}/assignments`, {
        signers: [
            { id: signerId, role: 'signer', notification_methods: ['Email'] }
        ],
        method: 'virtual',
        copy_receivers: [{ email: 'americasistema48@gmail.com', name: 'Sistema America' }]
    });

    if (assignRes.status < 200 || assignRes.status >= 300) {
        throw new Error(`Erro ao criar assignment (HTTP ${assignRes.status}): ${assignRes.json?.message || assignRes.raw.substring(0, 150)}`);
    }

    // Buscar o signing_url correto via GET no documento
    // (o campo 'url' do assignment retorna /release/... que apenas reenvía o e-mail)
    console.log(`[5b] Buscando signing_url do documento...`);
    const docInfoRes = await req('GET', `/v1/documents/${assinafyDocId}`, null);
    const docInfo = docInfoRes.json?.data || docInfoRes.json;

    // signing_urls[].url → link direto com ?email= embutido (melhor opção)
    // signing_url       → link direto sem o e-mail embutido
    // fallback          → construído manualmente
    const urlAssinatura = (
        docInfo?.signing_urls?.[0]?.url ||
        docInfo?.signing_url           ||
        `https://app.assinafy.com.br/sign/${assinafyDocId}`
    );

    console.log(`[5b] signing_url correto: ${urlAssinatura}`);


    // 6. Salvar no banco
    await new Promise((res, rej) =>
        db.run(
            `UPDATE documentos SET assinafy_id = ?, assinafy_status = 'Pendente', assinafy_url = ? WHERE id = ?`,
            [assinafyDocId, urlAssinatura, documentId],
            (err) => err ? rej(err) : res()
        )
    );
    console.log(`[6] Banco atualizado OK.`);

    return { assinafyDocId, urlAssinatura, emailColaborador: email, nomeColab: nome, docType: doc.document_type };
}

module.exports = { enviarDocumentoParaAssinafy };