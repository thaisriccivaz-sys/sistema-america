/**
 * novo_processo_assinafy.js
 *
 * Endpoint para envio ao Assinafy:
 * Apenas UM signatário obrigatório (Colaborador).
 * A empresa já pré-assina digitalmente em background via certificado A1 (.pfx).
 *
 * Endpoints confirmados:
 *  - Upload:      POST /v1/accounts/{accountId}/documents  (multipart)
 *  - Signatários: GET/POST/PUT /v1/accounts/{accountId}/signers
 *  - Status doc:  GET /v1/documents/{docId}
 *  - Assignment:  POST /v1/documents/{docId}/assignments
 */

'use strict';

const fs       = require('fs');
const path     = require('path');
const https    = require('https');
const FormData = require('form-data');
const db       = require('./database');

// ─── CONFIGURAÇÃO ────────────────────────────────────────────────────────────
const API_KEY    = 'AxaT-FiXBckHqEYV0s_MtUhLF3pReRz3dX4zVpC173vmjDwzLGHYtDJuQje4-4Pd';
const ACCOUNT_ID = '10237785fb23cf473d54845a013e';
const HOSTNAME   = 'api.assinafy.com.br';

// (A empresa não é mais signatária virtual pois usamos o certificado A1 localmente)

// ─── HELPERS HTTP ─────────────────────────────────────────────────────────────

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

function uploadForm(urlPath, form) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: HOSTNAME,
            path: urlPath,
            method: 'POST',
            headers: { 'X-Api-Key': API_KEY, ...form.getHeaders() }
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

// ─── HELPER: Resolve ou cria signatário pela tax_id ──────────────────────────
async function resolverSignatario({ full_name, email, tax_id, whatsapp_phone_number }) {
    const searchRes = await req('GET', `/v1/accounts/${ACCOUNT_ID}/signers?tax_id=${tax_id}`, null);
    const lista = searchRes.json?.data || [];

    if (Array.isArray(lista) && lista.length > 0) {
        const exact = lista.find(s => s.email.toLowerCase() === email.toLowerCase());
        if (exact) {
            console.log(`[SIGNER] Encontrado ID=${exact.id} (${email})`);
            return exact.id;
        }
        const id = lista[0].id;
        console.log(`[SIGNER] Existente ID=${id}. Atualizando e-mail → ${email}...`);
        await req('PUT', `/v1/accounts/${ACCOUNT_ID}/signers/${id}`, {
            full_name, email, tax_id,
            ...(whatsapp_phone_number ? { whatsapp_phone_number } : {})
        });
        return id;
    }

    console.log(`[SIGNER] Criando: ${full_name} (${email})...`);
    const r = await req('POST', `/v1/accounts/${ACCOUNT_ID}/signers`, {
        full_name, email, tax_id,
        ...(whatsapp_phone_number ? { whatsapp_phone_number } : {})
    });
    if (r.status < 200 || r.status >= 300)
        throw new Error(`Erro ao criar signatário (HTTP ${r.status}): ${r.json?.message || r.raw.substring(0, 150)}`);
    const newId = r.json?.data?.id || r.json?.id;
    console.log(`[SIGNER] Criado ID=${newId}`);
    return newId;
}

// ─── FUNÇÃO PRINCIPAL ─────────────────────────────────────────────────────────
async function enviarDocumentoParaAssinafy(documentId, colaboradorId) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`[ASSINAFY] INÍCIO | Doc=${documentId} | Colab=${colaboradorId}`);

    // 1. Dados do banco
    const doc = await new Promise((res, rej) =>
        db.get('SELECT * FROM documentos WHERE id = ?', [documentId], (err, row) => err ? rej(err) : res(row)));
    const colab = await new Promise((res, rej) =>
        db.get('SELECT * FROM colaboradores WHERE id = ?', [colaboradorId], (err, row) => err ? rej(err) : res(row)));

    if (!doc)   throw new Error('Documento não encontrado no banco.');
    if (!colab) throw new Error('Colaborador não encontrado no banco.');

    const email = (colab.email    || '').trim();
    const cpf   = (colab.cpf     || '').replace(/\D/g, '');
    const fone  = (colab.telefone || '').replace(/\D/g, '');
    const nome  = colab.nome_completo || 'Colaborador';

    if (!email) throw new Error(`Colaborador "${nome}" não tem e-mail cadastrado.`);
    if (!cpf)   throw new Error('CPF do colaborador é obrigatório.');

    console.log(`[1] ${nome} | ${email} | CPF: ${cpf}`);

    // 2. Upload do arquivo
    const filePath = path.resolve(doc.file_path);
    let fileBuffer = null;
    let fileName = doc.file_name || path.basename(filePath);

    if (fs.existsSync(filePath)) {
        fileBuffer = fs.readFileSync(filePath);
    } else {
        // Arquivo local não existe (Render efêmero) — tentar baixar do Assinafy se já tiver sido enviado antes
        // ou informar erro claro
        console.warn(`[ASSINAFY] Arquivo não encontrado localmente: ${filePath}`);
        // Não podemos usar assinafy_url para baixar porque ela é uma página HTML de assinatura,
        // gerando erro "Unsupported file content: text/html" na re-submissão.
        // E assinafy_signed_url também pode requerer autenticação. 
        if (doc.assinafy_signed_url) {
            console.log(`[ASSINAFY] CUIDADO: O arquivo não está localmente, mas tem URL assinada.`);
        }
        if (!fileBuffer) {
            throw new Error(`Arquivo não encontrado: ${filePath}. O arquivo pode ter sido removido do servidor. Faça o upload novamente.`);
        }
    }

    const form = new FormData();
    form.append('file', fileBuffer, {
        filename: fileName,
        contentType: 'application/pdf'
    });

    console.log(`[2] Upload: "${fileName}"`);
    const uploadRes = await uploadForm(`/v1/accounts/${ACCOUNT_ID}/documents`, form);

    if (uploadRes.status < 200 || uploadRes.status >= 300)
        throw new Error(`Falha no upload (HTTP ${uploadRes.status}): ${uploadRes.json?.message || uploadRes.raw.substring(0, 150)}`);

    const assinafyDocId = (uploadRes.json?.data || uploadRes.json)?.id;
    if (!assinafyDocId) throw new Error(`Upload OK mas ID não retornado: ${uploadRes.raw.substring(0, 200)}`);
    console.log(`[2] Upload OK → ID: ${assinafyDocId}`);

    // 3. Aguardar processamento (polling)
    console.log(`[3] Aguardando documento ficar pronto...`);
    for (let i = 1; i <= 60; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const statusRes = await req('GET', `/v1/documents/${assinafyDocId}`, null);
        const docStatus = (statusRes.json?.data?.status || statusRes.json?.status || '').toLowerCase();
        console.log(`[POLL ${i}/60] status="${docStatus}"`);
        if (!docStatus.includes('processing')) { console.log(`[3] Pronto!`); break; }
        if (i === 60) throw new Error('Timeout: Assinafy demorou mais de 3 min para processar o PDF.');
    }

    // 4. Resolver signatário (colaborador)
    console.log(`[4] Resolvendo signatário colaborador...`);
    const signerColabId = await resolverSignatario({ full_name: nome, email, tax_id: cpf, whatsapp_phone_number: fone || undefined });
    if (!signerColabId) throw new Error('ID do signatário (colaborador) não obtido.');
    console.log(`[4] Colaborador ID=${signerColabId}`);

    // 5. Assignment apenas com o colaborador.
    // A empresa assinará com Certificado Digital A1 DEPOIS que o colaborador assinar,
    // garantindo que ambas as assinaturas aparecem no validador gov.br.
    console.log(`[5] Criando assignment para o colaborador...`);
    const assignRes = await req('POST', `/v1/documents/${assinafyDocId}/assignments`, {
        signers: [
            {
                id: signerColabId,
                role: 'signer',
                notification_methods: ['Email'],
                require_initials: false   // desativa o campo de rúbrica — apenas 1 assinatura
            }
        ],
        method: 'virtual',
        copy_receivers: [{ email: 'americasistema48@gmail.com', name: 'Sistema America' }]
    });

    if (assignRes.status < 200 || assignRes.status >= 300)
        throw new Error(`Erro ao criar assignment (HTTP ${assignRes.status}): ${assignRes.json?.message || assignRes.raw.substring(0, 150)}`);

    const assignList = Array.isArray(assignRes.json?.data) ? assignRes.json.data : [assignRes.json?.data].filter(Boolean);
    const urlAssinatura = (
        assignList[0]?.url ||
        assignList[0]?.signature_url ||
        assignList[0]?.signing_url   ||
        assignRes.json?.data?.signing_urls?.[0]?.url ||
        `https://app.assinafy.com.br/sign/${assinafyDocId}`
    );
    console.log(`[5] Assignment OK! URL colaborador: ${urlAssinatura}`);


    // 6. Salvar no banco
    await new Promise((res, rej) =>
        db.run(
            `UPDATE documentos SET assinafy_id = ?, assinafy_status = 'Pendente', assinafy_url = ?, assinafy_sent_at = datetime('now') WHERE id = ?`,
            [assinafyDocId, urlAssinatura, documentId],
            (err) => err ? rej(err) : res()
        )
    );
    console.log(`[6] Banco atualizado OK.`);

    return { assinafyDocId, urlAssinatura, emailColaborador: email, nomeColab: nome, docType: doc.document_type };
}

module.exports = { enviarDocumentoParaAssinafy };