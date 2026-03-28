const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const nodemailer = require('nodemailer');

// ============================================
// CONFIGURAÇÃO DO ASSINAFY
// ============================================
const ASSINAFY_CONFIG = {
    apiKey: 'AxaT-FiXBckHqEYV0s_MtUhLF3pReRz3dX4zVpC173vmjDwzLGHYtDJuQje4-4Pd',
    accountId: '10237785fb23cf473d54845a013e',
    baseUrl: 'https://api.assinafy.com.br/v1'
};

const SMTP_CONFIG = {
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: "americasistema48@gmail.com",
        pass: "aigusxmgantdtxpd"
    }
};

const db = require('./database');

// Helper: chamada GET ao Assinafy
async function assinafyGet(url) {
    const res = await axios.get(url, {
        headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey },
        validateStatus: () => true,
        timeout: 15000
    });
    console.log(`[ASSINAFY GET] ${url} → ${res.status}`);
    return res;
}

// Helper: chamada POST JSON ao Assinafy
async function assinafyPost(url, data) {
    const res = await axios.post(url, data, {
        headers: {
            'X-Api-Key': ASSINAFY_CONFIG.apiKey,
            'Content-Type': 'application/json'
        },
        validateStatus: () => true,
        timeout: 15000
    });
    console.log(`[ASSINAFY POST] ${url} → ${res.status} | ${JSON.stringify(res.data).substring(0, 300)}`);
    return res;
}

// Helper: chamada PUT JSON ao Assinafy
async function assinafyPut(url, data) {
    const res = await axios.put(url, data, {
        headers: {
            'X-Api-Key': ASSINAFY_CONFIG.apiKey,
            'Content-Type': 'application/json'
        },
        validateStatus: () => true,
        timeout: 15000
    });
    console.log(`[ASSINAFY PUT] ${url} → ${res.status}`);
    return res;
}

// ============================================
// FUNÇÃO PRINCIPAL DE ENVIO
// ============================================
async function enviarDocumentoParaAssinafy(documentId, colaboradorId) {
    console.log(`\n--- INICIANDO NOVO PROCESSO DE ENVIO ---`);
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

    // 2. Validar e-mail do colaborador
    const emailColaborador = colab.email ? colab.email.trim() : null;
    if (!emailColaborador) {
        throw new Error(`O colaborador "${colab.nome_completo || 'Sem Nome'}" não tem e-mail cadastrado. Preencha o e-mail antes de enviar para o Assinafy.`);
    }

    const cpfLimpo = colab.cpf ? colab.cpf.replace(/\D/g, '') : null;
    if (!cpfLimpo) throw new Error("CPF é obrigatório para o Assinafy.");

    const foneLimpo = colab.telefone ? colab.telefone.replace(/\D/g, '') : '';
    const nomeColab = colab.nome_completo || 'Colaborador';

    console.log(`[1] Preparando envio para: ${nomeColab} <${emailColaborador}>`);

    // 3. ETAPA 1: Upload do arquivo (multipart/form-data)
    const filePath = path.resolve(doc.file_path);
    if (!fs.existsSync(filePath)) throw new Error(`Arquivo não encontrado no servidor: ${filePath}`);

    const fileName = doc.file_name || path.basename(filePath);
    const fd = new FormData();
    fd.append('file', fs.createReadStream(filePath), {
        filename: fileName,
        contentType: 'application/pdf'
    });

    console.log(`[2] Fazendo upload do arquivo "${fileName}" para o Assinafy...`);
    const uploadRes = await axios.post(
        `${ASSINAFY_CONFIG.baseUrl}/accounts/${ASSINAFY_CONFIG.accountId}/documents`,
        fd,
        {
            headers: {
                'X-Api-Key': ASSINAFY_CONFIG.apiKey,
                ...fd.getHeaders()
            },
            validateStatus: () => true,
            timeout: 30000
        }
    );

    console.log(`[2] Upload Status: ${uploadRes.status} | Response: ${JSON.stringify(uploadRes.data).substring(0, 400)}`);

    if (uploadRes.status < 200 || uploadRes.status >= 300) {
        const msg = uploadRes.data?.message || uploadRes.data?.error || JSON.stringify(uploadRes.data);
        throw new Error(`Falha no upload do documento (${uploadRes.status}): ${msg}`);
    }

    const uploadData = uploadRes.data;
    const assinafyDocId = (uploadData.data && uploadData.data.id) ? uploadData.data.id : uploadData.id;

    if (!assinafyDocId) throw new Error(`Upload concluído mas ID não retornado. Resposta: ${JSON.stringify(uploadData).substring(0, 300)}`);
    console.log(`[2] Upload OK. Assinafy Doc ID: ${assinafyDocId}`);

    // Aguardar processamento do documento no servidor Assinafy
    await new Promise(r => setTimeout(r, 3000));

    // 4. ETAPA 2: Buscar ou Criar Signatário
    console.log(`[3] Resolvendo Signatário (CPF: ${cpfLimpo})...`);
    let signerId = null;

    const searchRes = await assinafyGet(
        `${ASSINAFY_CONFIG.baseUrl}/accounts/${ASSINAFY_CONFIG.accountId}/signers?tax_id=${cpfLimpo}`
    );

    const searchData = searchRes.data;
    const list = (searchData && searchData.data) ? searchData.data : (Array.isArray(searchData) ? searchData : []);

    if (Array.isArray(list) && list.length > 0) {
        signerId = list[0].id;
        console.log(`[3] Signatário encontrado. ID: ${signerId} | E-mail atual: ${list[0].email}`);

        // Atualizar e-mail se diferente
        if (list[0].email !== emailColaborador) {
            console.log(`[3] Atualizando e-mail do signatário no Assinafy...`);
            await assinafyPut(
                `${ASSINAFY_CONFIG.baseUrl}/accounts/${ASSINAFY_CONFIG.accountId}/signers/${signerId}`,
                {
                    full_name: nomeColab,
                    email: emailColaborador,
                    tax_id: cpfLimpo,
                    whatsapp_phone_number: foneLimpo || undefined
                }
            );
        }
    } else {
        console.log(`[3] Criando NOVO signatário no Assinafy...`);
        const createRes = await assinafyPost(
            `${ASSINAFY_CONFIG.baseUrl}/accounts/${ASSINAFY_CONFIG.accountId}/signers`,
            {
                full_name: nomeColab,
                email: emailColaborador,
                tax_id: cpfLimpo,
                whatsapp_phone_number: foneLimpo || undefined
            }
        );

        if (createRes.status < 200 || createRes.status >= 300) {
            const msg = createRes.data?.message || createRes.data?.error || JSON.stringify(createRes.data);
            throw new Error(`Erro ao criar signatário no Assinafy (${createRes.status}): ${msg}`);
        }

        const createData = createRes.data;
        signerId = (createData.data && createData.data.id) ? createData.data.id : createData.id;
        console.log(`[3] Signatário criado. ID: ${signerId}`);
    }

    if (!signerId) throw new Error("Não foi possível obter o ID do signatário no Assinafy.");

    // 5. ETAPA 3: Criar a Solicitação de Assinatura (assignment)
    console.log(`[4] Criando solicitação de assinatura (assignment)...`);
    const assignmentRes = await assinafyPost(
        `${ASSINAFY_CONFIG.baseUrl}/accounts/${ASSINAFY_CONFIG.accountId}/documents/${assinafyDocId}/assignments`,
        {
            signers: [{
                id: signerId,
                role: 'signer',
                notification_methods: ["Email", "WhatsApp"]
            }],
            method: 'virtual'
        }
    );

    if (assignmentRes.status < 200 || assignmentRes.status >= 300) {
        const msg = assignmentRes.data?.message || assignmentRes.data?.error || JSON.stringify(assignmentRes.data);
        throw new Error(`Erro ao criar solicitação de assinatura (${assignmentRes.status}): ${msg}`);
    }

    const assignmentData = assignmentRes.data;
    const assignList = (assignmentData.data && Array.isArray(assignmentData.data)) 
        ? assignmentData.data 
        : (Array.isArray(assignmentData) ? assignmentData : []);

    const urlAssinatura = assignList.length > 0 ? (assignList[0].signature_url || assignList[0].url || assignList[0].sign_url) : null;

    console.log(`[4] Assignment criado! Link de assinatura: ${urlAssinatura}`);

    // 6. Salvar ID e link no banco local
    await new Promise((resolve, reject) => {
        db.run(
            `UPDATE documentos SET assinafy_id = ?, assinafy_status = 'Pendente', assinafy_url = ? WHERE id = ?`,
            [assinafyDocId, urlAssinatura, documentId],
            (err) => {
                if (err) { console.error("Erro ao salvar link no banco:", err.message); reject(err); }
                else { console.log("[5] Link salvo no banco com sucesso."); resolve(); }
            }
        );
    });

    // 7. Enviar e-mail com link de assinatura ao colaborador
    if (urlAssinatura) {
        const htmlEmail = `
            <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px;">
                <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">Assinatura de Documento</h2>
                <p>Olá, <strong>${nomeColab}</strong>!</p>
                <p>Você tem um <strong>documento pendente de assinatura eletrônica</strong>:</p>
                <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Documento:</strong> ${doc.document_type}</p>
                </div>
                <p style="text-align: center; margin: 30px 0;">
                    <a href="${urlAssinatura}" style="background: #3498db; color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 1.05rem;">
                        ✍️ Clique aqui para Assinar
                    </a>
                </p>
                <p style="font-size: 0.85em; color: #7f8c8d;">Ou copie este link no navegador:<br><a href="${urlAssinatura}">${urlAssinatura}</a></p>
                <p style="margin-top: 30px; font-size: 0.9em; color: #7f8c8d;">Atenciosamente,<br>Equipe de RH - América Rental</p>
            </div>
        `;
        try {
            const transporter = nodemailer.createTransport(SMTP_CONFIG);
            await transporter.sendMail({
                from: `"RH América Rental" <${SMTP_CONFIG.auth.user}>`,
                to: emailColaborador,
                cc: 'rh@americarental.com.br',
                subject: `Documento para assinar: ${doc.document_type}`,
                html: htmlEmail
            });
            console.log(`[6] E-mail de assinatura enviado para: ${emailColaborador}`);
        } catch (emailErr) {
            // Não falha todo o processo se o e-mail não enviar
            console.error('[6] Falha ao enviar e-mail (não crítico):', emailErr.message);
        }
    }

    return { assinafyDocId, urlAssinatura };
}

// ============================================
// EXPORT
// ============================================
module.exports = { enviarDocumentoParaAssinafy };