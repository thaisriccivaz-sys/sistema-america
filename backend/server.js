const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');
const nodemailer = require('nodemailer');
// fetch nativo (Node 18+)

// --- CONFIGURAÃ‡ÃƒO SMTP (Preencher com dados reais para o e-mail funcionar) ---
const SMTP_CONFIG = {
    host: "smtp.gmail.com", 
    port: 465, 
    secure: true, // Gmail em 465 requer SSL direto
    auth: {
        user: "americasistema48@gmail.com", 
        pass: "aigusxmgantdtxpd"
    }
};

const db = require('./database');

// Recarregar configurações do sistema (ex: certificado)
db.all("SELECT chave, valor FROM configuracoes_sistema", [], (err, rows) => {
    if (!err && rows) {
        rows.forEach(r => {
            if (r.chave === 'pfx_path') process.env.PFX_PATH = r.valor;
            if (r.chave === 'pfx_password_b64') process.env.PFX_PASSWORD = Buffer.from(r.valor, 'base64').toString('utf8');
        });
        console.log('[SISTEMA] Configurações de certificado carregadas com sucesso.');
    }
});

// ── DIAGNÓSTICO DE PERSISTÊNCIA ────────────────────────────────────────
const dbPathAtual = process.env.DATABASE_PATH || require('path').join(__dirname, 'data', 'hr_system_v2.sqlite');
if (!process.env.DATABASE_PATH) {
    console.warn('⚠️  AVISO: DATABASE_PATH não definido! O banco está em disco efêmero.');
    console.warn('⚠️  Todos os dados serão PERDIDOS a cada restart do servidor (Render free tier).');
    console.warn(`⚠️  Caminho atual: ${dbPathAtual}`);
    console.warn('⚠️  Configure DATABASE_PATH como variável de ambiente apontando para um Render Disk.');
} else {
    console.log(`✅  DATABASE_PATH configurado: ${dbPathAtual}`);
}
// ──────────────────────────────────────────────────────────────────────

// MIGRATION: Atualizar antigos registros "Audiometria" para "Exames Complementares"
db.run("UPDATE documentos SET document_type = 'Exames Complementares' WHERE document_type = 'Audiometria'", (err) => {
    if (err) console.error("Erro na migration Exames Complementares:", err);
    else console.log("Migration 'Audiometria -> Exames Complementares' executada (se houver registros).");
});

// MIGRATION: Limpar todos os usuários exceto Diretoria1
db.run("DELETE FROM usuarios WHERE LOWER(REPLACE(username, '.', '')) != 'diretoria1'", (err) => {
    if (err) console.error("Erro ao limpar usuários:", err);
    else console.log("Usuários removidos com sucesso, mantendo apenas Diretoria1.");
});

// MIGRATION: Remover cargo 'teste'
db.run("DELETE FROM cargos WHERE nome = 'teste' OR nome = 'Teste'", (err) => {
    if (err) console.error("Erro ao remover cargo teste:", err);
});

// MIGRATION: Remover " - Total" dos grupos de permissão
db.run("UPDATE grupos_permissao SET nome = REPLACE(nome, ' - Total', '') WHERE nome LIKE '% - Total'", (err) => {
    if (err) console.error("Erro ao atualizar grupos:", err);
    else {
        // Remover duplicatas criadas pela remoção de " - Total" (ex: manter apenas 1 linha por nome)
        db.run("DELETE FROM grupos_permissao WHERE id NOT IN (SELECT MIN(id) FROM grupos_permissao GROUP BY TRIM(nome))", (errD) => {
            if (errD) console.error("Erro ao limpar grupos duplicados:", errD);
        });
    }
});

// MIGRATION: Inserir ou atualizar relação exata de Cargos x Departamentos solicitada
const cargosDeptosSync = [
    ['Aux. Administrativo', 'Administrativo'], ['Ass. Administrativo 1', 'Administrativo'], 
    ['Ass. Administrativo', 'Administrativo'], ['Aux. Comercial', 'Comercial'], 
    ['Vendedor', 'Comercial'], ['Sup. Comercial', 'Comercial'], 
    ['Aux. Logística', 'Logística'], ['Ass. Logística 1', 'Logística'], 
    ['Ass. Logística 2', 'Logística'], ['Sup. Logística', 'Logística'], 
    ['Sup. Pátio', 'Logística'], ['Ger. Logística', 'Logística'], 
    ['Lid. Logística', 'Logística'], ['Aux. Financeiro', 'Financeiro'], 
    ['Ass. Financeiro 1', 'Financeiro'], ['Ass. Financeiro 2', 'Financeiro'], 
    ['Sup. Financeiro', 'Financeiro'], ['Aux. RH', 'RH'], ['Ass. RH 1', 'RH'], 
    ['Ass. RH 2', 'RH'], ['Ana. RH Jr.', 'RH'], ['Ana. RH Pl.', 'RH'], 
    ['Ana. RH Sr.', 'RH'], ['Cor. de Processos', 'Administrativo'], 
    ['Motorista', 'Motorista'], ['Ajudante Pátio', 'Ajudante Pátio'], 
    ['Ajudante Geral', 'Ajudante Geral'], ['Manutenção', 'Manutenção'], 
    ['Ajudante Limpeza', 'Limpeza']
];

cargosDeptosSync.forEach(([cNome, cDepto]) => {
    // Garante que o departamento existe
    db.run("INSERT OR IGNORE INTO departamentos (nome) VALUES (?)", [cDepto]);
    
    // Atualiza ou insere o cargo
    db.get("SELECT id FROM cargos WHERE nome = ?", [cNome], (err, row) => {
        if (row) {
            db.run("UPDATE cargos SET departamento = ? WHERE id = ?", [cDepto, row.id]);
        } else {
            db.run("INSERT INTO cargos (nome, departamento, documentos_obrigatorios) VALUES (?, ?, '')", [cNome, cDepto]);
        }
    });
});

// Reativado a Sincronização do OneDrive (via SharePoint)
const onedrive = require('./utils/onedrive');

// --- CONFIGURAÃ‡ÃƒO DE PASTAS PADRÃƒO ---
const FOLDERS = [
    '00_CHECKLIST',
    '01_FICHA_CADASTRAL',
    'ADVERTENCIAS',
    'ASO',
    'ATESTADOS',
    'AVALIACAO',
    'BOLETIM_DE_OCORRENCIA',
    'CERTIFICADOS',
    'CONJUGE',
    'CONTRATOS',
    'DEPENDENTES',
    'DOCUMENTOS PESSOAIS',
    'EPI',
    'EXAMES',
    'FACULDADE',
    'FICHA_DE_EPI',
    'FOTOS',
    'MULTAS',
    'OUTROS',
    'PAGAMENTOS',
    'SUSPENSAO',
    'TERAPIA',
    'TERMOS',
    'TREINAMENTO',
    'VALE_TRANSPORTE'
];

/**
 * Helper para sincronizar pastas no OneDrive automaticamente
 * @param {string} nomeCompleto 
 */
async function syncColaboradorOneDrive(nomeCompleto) {
    if (!onedrive || !process.env.ONEDRIVE_CLIENT_ID) {
        console.warn("[OneDrive] Pulando sincronização: OneDrive desabilitado ou não configurado.");
        return { sucesso: false, error: "OneDrive não configurado" };
    }
    
    // Calcula o caminho ANTES para retornar na resposta
    const nomePasta = formatarNome(nomeCompleto);
    // V21: Usando ID do SharePoint diretamente. O Drive ID já é a pasta 'Documentos - America Rental'.
    const onedriveBasePath = "RH/1.Colaboradores/Sistema";
    const onedrivePath = `${onedriveBasePath}/${nomePasta}`;
    // DISPARAR MODO SINCRONO (O Render irá aguardar para não congelar o processo)
    console.log(`[OneDrive V24] Modo SharePoint ativo para ${nomeCompleto}. Alvo: ${onedriveBasePath}`);

    let msgRetorno = "Pastas do SharePoint criadas com sucesso!";
    try {
        console.log(`[OneDrive API] Sincronizando ${nomeCompleto}...`);
        await onedrive.ensurePath(onedrivePath);
        await Promise.all(FOLDERS.map(f => onedrive.ensureFolder(`${onedrivePath}/${f}`)));
        
        // Força o OneDrive a sincronizar a pasta em todos os computadores rapidamente
        console.log(`[OneDrive API] Criando arquivo de inicialização para forçar sincronia...`);
        await onedrive.uploadToOneDrive(onedrivePath, '_Sincronizado.txt', Buffer.from(`Pasta criada e sincronizada via Sistema América.\nColaborador: ${nomeCompleto}\nData: ${new Date().toLocaleString()}`, 'utf-8'));
        
        console.log(`[OneDrive API] SUCESSO COMPLETO para ${nomeCompleto}`);
    } catch (e) {
        console.error(`[OneDrive API Error] ${nomeCompleto}:`, e.message);
        msgRetorno = "Atenção: A sincronização no OneDrive falhou, mas os dados foram salvos.";
    }

    return { 
        sucesso: true, 
        message: msgRetorno,
        caminho: onedrivePath,
        versao: "V24_AUTO_SYNC" 
    };
}

/**
 * Faz upload de um documento (por ID) para o OneDrive.
 * Reutiliza exatamente a mesma lógica do force-onedrive-sync que está comprovada.
 */
async function uploadDocToOneDrive(docId) {
    if (!onedrive || !process.env.ONEDRIVE_CLIENT_ID) return;

    try {
        const doc = await new Promise((resolve, reject) => {
            db.get(`SELECT d.*, c.nome_completo FROM documentos d
                    JOIN colaboradores c ON c.id = d.colaborador_id
                    WHERE d.id = ?`, [docId], (err, row) => {
                if (err) reject(err); else resolve(row);
            });
        });

        if (!doc) { console.error(`[OD-AUTO] Doc ${docId} não encontrado no DB`); return; }
        if (doc.tab_name === 'ASO') return; // ASO tem fluxo próprio

        const localPath = doc.signed_file_path && require('fs').existsSync(doc.signed_file_path)
            ? doc.signed_file_path
            : (doc.file_path && require('fs').existsSync(doc.file_path) ? doc.file_path : null);

        if (!localPath) { console.error(`[OD-AUTO] Arquivo não encontrado para doc ${docId}`); return; }

        const onedriveBasePath = process.env.ONEDRIVE_BASE_PATH || 'RH/1.Colaboradores/Sistema';
        const safeColab = formatarNome(doc.nome_completo || 'DESCONHECIDO');
        const safeTab   = formatarPasta(doc.tab_name || 'DOCUMENTOS').toUpperCase();
        const docYear   = doc.year && doc.year !== 'null' ? String(doc.year).replace(/[^0-9]/g, '') : String(new Date().getFullYear());
        const targetDir = `${onedriveBasePath}/${safeColab}/${safeTab}/${docYear}`;

        // Para Atestados, strip o timestamp do file_name: CID_DD-MM-AA_Nome_YYYYMMDD_HHMMSS.pdf → CID_DD-MM-AA_Nome.pdf
        const isAtestado = doc.tab_name === 'Atestados';
        let cloudName = '';
        if (doc.tab_name === 'AVALIACAO') {
            cloudName = doc.file_name;
        } else if (isAtestado) {
            // Se o file_name já é o nome limpo (cloud_name salvo diretamente), usar as-is
            // Caso contrário tentar remover sufixo _YYYYMMDD_HHMMSS
            const hasTimestamp = /_\d{8}_\d{6}(\.[^.]+)?$/.test(doc.file_name);
            cloudName = hasTimestamp
                ? doc.file_name.replace(/_\d{8}_\d{6}(\.[^.]+)$/, '$1')
                : doc.file_name;
            // Garantir extensão .pdf
            if (!cloudName.toLowerCase().endsWith('.pdf')) cloudName += '.pdf';
        } else {
            cloudName = `${formatarPasta(doc.document_type || doc.tab_name).replace(/\s+/g, '_')}_${docYear}_${safeColab}.pdf`;
        }

        console.log(`[OD-AUTO] doc=${docId} tab=${doc.tab_name} → ${targetDir}/${cloudName}`);
        
        const parentDir = `${onedriveBasePath}/${safeColab}/${safeTab}`;
        if (targetDir !== parentDir) {
            await onedrive.ensurePath(parentDir); // Garante /AVALIACAO
        }
        await onedrive.ensurePath(targetDir); // Garante /AVALIACAO/2026

        const fileBuffer = require('fs').readFileSync(localPath);
        await onedrive.uploadToOneDrive(targetDir, cloudName, fileBuffer);
        console.log(`[OD-AUTO] ✓ Upload OK: ${cloudName}`);
    } catch (e) {
        console.error(`[OD-AUTO ERROR] doc=${docId}:`, e.message);
    }
}

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || 'america_rental_secret_key_123';

// Configuração de Armazenamento (Dinâmico para Render/Linux ou Disco Persistente)
const BASE_PATH = process.env.STORAGE_PATH || path.join(__dirname, 'data', 'Colaboradores');
const BASE_UPLOAD_PATH = BASE_PATH; // Mantendo compatibilidade

// Configuração Assinafy (Preencha aqui com sua chave de API e Account ID)
const ASSINAFY_CONFIG = {
    apiKey: 'AxaT-FiXBckHqEYV0s_MtUhLF3pReRz3dX4zVpC173vmjDwzLGHYtDJuQje4-4Pd',
    accountId: '10237785fb23cf473d54845a013e',
    baseUrl: 'https://api.assinafy.com.br/v1'
};

function formatarNome(nome) {
    if (!nome) return "SEM_NOME";
    return nome
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[^A-Z0-9 ]/g, "")
        .trim()
        .replace(/\s+/g, "_");
}

function formatarPasta(str) {
    if (!str) return "OUTROS";
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9 ]/g, "")
        .trim()
        .replace(/\s+/g, "_");
}

function extractSignedUrl(docData) {
    if (!docData) return null;
    let u = docData.certificated_file_url || docData.report_url || docData.bundle_url || docData.signature_report_url || docData.artifacts?.certificated || docData.artifacts?.bundle || docData.artifacts?.signed_file || docData.signed_file_url;
    if (u) return u;
    
    const jsonStr = JSON.stringify(docData);
    const matches = jsonStr.match(/https:\/\/[^"]+\.pdf[^"]*/gi);
    if (matches && matches.length) {
        return matches.find(l => /cert|bundle|report|sign|assinad/i.test(l)) || matches[matches.length - 1];
    }
    return docData.download_link || docData.download_url || null;
}


try {
    if (!fs.existsSync(BASE_UPLOAD_PATH)) {
        fs.mkdirSync(BASE_UPLOAD_PATH, { recursive: true });
        console.log("DIRETÃ“RIO BASE DE UPLOAD CRIADO:", BASE_UPLOAD_PATH);
    }
} catch (e) {
    console.error("AVISO CRÍTICO: Não foi possível criar a pasta base de upload:", e.message);
    console.error("Caminho tentado:", BASE_UPLOAD_PATH);
    // Não encerramos o processo para permitir que o servidor suba em modo leitura ou com falhas parciais
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Garantindo que nomes de pastas sejam SEM ACENTOS e em MAIÃšSCULO para compatibilidade total
        const colab = req.body.colaborador_nome || 'DESCONHECIDO';
        const tab = req.body.tab_name || 'OUTROS';
        const year = req.body.year;

        const safeNomeColab = formatarNome(colab);
        const safeTab = formatarPasta(tab).toUpperCase();
        
        let finalDir = path.join(BASE_PATH, safeNomeColab, safeTab);

        if (year && year !== 'null' && year !== 'undefined' && year !== '') {
            const safeYear = String(year).replace(/[^0-9]/g, '');
            if (safeYear) {
                finalDir = path.join(finalDir, safeYear);
            }
        }

        console.log("-----------------------------------------");
        console.log("UPLOAD DESTINATION:", finalDir);
        
        try {
            if (!fs.existsSync(finalDir)) {
                fs.mkdirSync(finalDir, { recursive: true });
                console.log("DIRETÃ“RIO CRIADO:", finalDir);
            }
            cb(null, finalDir);
        } catch (err) {
            console.error("ERRO AO CRIAR DIRETÃ“RIO DE UPLOAD:", err);
            cb(new Error("Não foi possível criar a pasta de destino para o upload. Verifique as permissões de gravação."));
        }
    },
    filename: function (req, file, cb) {
        const docType = req.body.document_type || 'DOCUMENTO';
        const colab = req.body.colaborador_nome || 'COLAB';
        const customName = req.body.custom_name;
        const ext = path.extname(file.originalname);

        let base = "";
        if (customName) {
            base = customName;
        } else {
            const safeType = formatarPasta(docType).toUpperCase();
            const safeColab = formatarNome(colab);
            base = `${safeType}_${safeColab}`;
        }

        // Timestamp formatado YYYYMMDD_HHMM para ser mais legível que milissegundos
        const d = new Date();
        const ts = d.getFullYear() + 
                   String(d.getMonth() + 1).padStart(2, '0') + 
                   String(d.getDate()).padStart(2, '0') + "_" + 
                   String(d.getHours()).padStart(2, '0') + 
                   String(d.getMinutes()).padStart(2, '0') + 
                   String(d.getSeconds()).padStart(2, '0');

        const finalFilename = `${base}_${ts}${ext}`;
        console.log("UPLOAD FILENAME:", finalFilename);
        cb(null, finalFilename);
    }
});
const upload = multer({ storage: storage });

const storageFoto = multer.memoryStorage();
const uploadFoto = multer({ storage: storageFoto });


// --- CONFIGURAÃ‡ÃƒO DE MIDDLEWARES ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ROTA DE VERSÃO (Para verificar implantação)
app.get('/api/version', (req, res) => res.json({ version: 'V47_DIAGNOSIS' }));

app.get('/api/debug-pfx3', async (req, res) => {
    try {
        const doc = await new Promise(r => db.get("SELECT assinafy_id FROM documentos WHERE assinafy_status = 'Assinado' ORDER BY id DESC LIMIT 1", [], (err, row) => r(row)));
        if(!doc) return res.send("No doc");
        const fetch = require('node-fetch') || global.fetch;
        const rInfo = await fetch(`https://api.assinafy.com.br/v1/documents/${doc.assinafy_id}`, { headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey } });
        const dt = (await rInfo.json()).data;
        const signedUrl = dt.signed_file_url || (dt.signers && dt.signers[0] && dt.signers[0].signed_file_url) || dt.file_url || dt.document_pdf;
        const dl = await fetch(signedUrl, { headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey } });
        let buf = Buffer.from(await dl.arrayBuffer());
        const signPdfPfx = require('./sign_pdf_pfx');
        try { buf = await signPdfPfx.assinarPDF(buf, {}); res.json({ ok: true, msg: "Signed successfully!" }); } catch(e) { res.json({ error: e.message, stack: e.stack }); }
    } catch(e) { res.send(e.message); }
});

app.get('/api/debug-pfx2', async (req, res) => {
    db.all("SELECT id, document_type, assinafy_status, file_name, signed_file_path FROM documentos ORDER BY id DESC LIMIT 10", [], (err, rows) => {
        res.json(rows);
    });

    try {
        const { PDFDocument } = require('pdf-lib');
        const signPdfPfx = require('./sign_pdf_pfx');
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage();
        page.drawText('Teste');
        const pdfBytes = await pdfDoc.save();
        let buf = Buffer.from(pdfBytes);
        buf = await signPdfPfx.assinarPDF(buf, {});
        res.send("OK! length: " + buf.length);
    } catch(e) {
        res.json({ error: e.message, stack: e.stack });
    }
});
app.get('/api/get-system-logs', (req, res) => {
    try {
        db.all('SELECT * FROM system_logs ORDER BY id DESC LIMIT 50', [], (err, rows) => {
             res.json(err ? {error: err.message} : rows);
        });
    } catch(e) { res.status(500).json({error:e.message}) }
});


app.get('/api/check-pfx', (req, res) => {
    try {
        const signPdfPfx = require('./sign_pdf_pfx');
        const disp = signPdfPfx.verificarDisponibilidade();
        const info = disp.disponivel ? signPdfPfx.infosCertificado(signPdfPfx.getPfxPath(), signPdfPfx.getPfxPassword()) : null;
        res.json({ disp, info, envs: { PFX_PATH: process.env.PFX_PATH || 'NOT SET', PFX_PASS: (process.env.PFX_PASSWORD ? 'SET' : 'NOT SET') }});
    } catch(e) {
        res.status(500).json({ error: e.message, stack: e.stack });
    }
});

// ─── MÓDULO DE ASSINATURA DIGITAL COM CERTIFICADO .PFX ───────────────────────
const signPdfPfx = require('./sign_pdf_pfx');
// ─────────────────────────────────────────────────────────────────────────────

// ─── POLLING AUTOMÁTICO: Atualizar status de documentos de admissão ───────────
// Roda a cada 2 min e verifica se documentos pendentes foram assinados no Assinafy
async function pollAdmissaoAssinaturas() {
    try {
        const pendentesAdmissao = await new Promise((res, rej) =>
            db.all(`SELECT id, colaborador_id, assinafy_id, nome_documento, 'admissao' as source 
                    FROM admissao_assinaturas WHERE (assinafy_status = 'Pendente' OR (assinafy_status = 'Assinado' AND signed_file_path IS NULL)) AND assinafy_id IS NOT NULL`, [], (err, rows) => err ? rej(err) : res(rows))
        );

        const pendentesDocs = await new Promise((res, rej) =>
            db.all(`SELECT id, colaborador_id, assinafy_id, document_type as nome_documento, tab_name, file_name, 'documento' as source 
                    FROM documentos WHERE (assinafy_status = 'Pendente' OR (assinafy_status = 'Assinado' AND signed_file_path IS NULL)) AND assinafy_id IS NOT NULL`, [], (err, rows) => err ? rej(err) : res(rows))
        );

        const pendentes = [...(pendentesAdmissao || []), ...(pendentesDocs || [])];
        if (!pendentes || pendentes.length === 0) return;

        console.log(`[POLL-ADMISSAO] Verificando ${pendentes.length} documento(s) pendente(s)...`);
        const https = require('https');

        for (const doc of pendentes) {
            try {
                const docInfo = await new Promise((resolve, reject) => {
                    const opts = {
                        hostname: 'api.assinafy.com.br',
                        path: `/v1/documents/${doc.assinafy_id}`,
                        method: 'GET',
                        headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey, 'Accept': 'application/json' }
                    };
                    const r = https.request(opts, resp => {
                        const chunks = [];
                        resp.on('data', c => chunks.push(c));
                        resp.on('end', () => {
                            try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
                            catch(e) { resolve(null); }
                        });
                    });
                    r.on('error', reject);
                    r.setTimeout(10000, () => r.destroy());
                    r.end();
                });

                if (!docInfo) continue;
                const docData = docInfo.data || docInfo;
                const statusRaw = String(docData?.status || docData?.status_id || '').toLowerCase();

                // Tentar extrair o PDF assinado
                const extractSignedUrl = (dt) => {
                    if (dt.signed_file_url) return dt.signed_file_url;
                    if (dt.signers && dt.signers[0] && dt.signers[0].signed_file_url) return dt.signers[0].signed_file_url;
                    
                    return dt.file_url || dt.document_pdf || null;
                };

                // Status do Assinafy que indicam assinatura completa (incluindo 'certificated' v1 e '4')
                const isSigned = ['completed', 'signed', 'concluded', 'finalizado', 'assinado', 'certificat', '4'].some(s => statusRaw.includes(s) || statusRaw === '4');
                if (!isSigned) {
                    console.log(`[POLL-ADMISSAO] Doc ${doc.assinafy_id} → status="${statusRaw}" (ainda pendente)`);
                    continue;
                }

                console.log(`[POLL-ADMISSAO] ✅ Doc ${doc.assinafy_id} ASSINADO!`);

                // Baixar PDF do Assinafy em memória (evita dependência de disco efêmero)
                let pdfBuffer = null;
                const signedUrl = extractSignedUrl(docData);
                if (signedUrl) {
                    try {
                        const pdfResp = await fetch(signedUrl, { headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey } });
                        if (pdfResp.ok) {
                            pdfBuffer = Buffer.from(await pdfResp.arrayBuffer());
                            console.log(`[POLL-ADMISSAO] PDF baixado do Assinafy: ${pdfBuffer.length} bytes`);
                        } else {
                            console.warn(`[POLL-ADMISSAO] Falha ao baixar PDF: ${pdfResp.statusText}`);
                        }
                    } catch(e) {
                        console.warn(`[POLL-ADMISSAO] Erro ao baixar PDF: ${e.message}`);
                    }
                }

                // Tentar assinar com certificado digital da empresa (se PFX configurado)
                let certSignedBuffer = null;
                if (pdfBuffer) {
                    const dispCert = signPdfPfx.verificarDisponibilidade();
                    if (dispCert.disponivel) {
                        try {
                            certSignedBuffer = await signPdfPfx.assinarPDF(pdfBuffer, {
                                motivo: 'Assinado eletronicamente pela empresa',
                                nome: 'America Rental Equipamentos Ltda'
                            });
                            console.log(`[POLL-ADMISSAO] ✅ Certificado digital aplicado: ${certSignedBuffer.length} bytes`);
                        } catch(pfxErr) {
                            console.warn(`[POLL-ADMISSAO] Certificado não aplicado: ${pfxErr.message}`);
                        }
                    }
                }

                // O buffer final que será salvo (com cert se disponível, ou apenas assinado pelo colab)
                const finalBuffer = certSignedBuffer || pdfBuffer;

                // Tentar sincronizar com OneDrive diretamente da memória (sem salvar em disco)
                let onedriveOk = false;
                if (onedrive && finalBuffer) {
                    try {
                        const colabRow = await new Promise((res2, rej2) =>
                            db.get('SELECT nome_completo FROM colaboradores WHERE id = ?', [doc.colaborador_id], (e,r) => e ? rej2(e) : res2(r))
                        );
                        const onedriveBasePath = process.env.ONEDRIVE_BASE_PATH || 'RH/1.Colaboradores/Sistema';
                        const safeColab = formatarNome(colabRow?.nome_completo || 'DESCONHECIDO');
                        const safeDocName = formatarPasta(doc.nome_documento || 'Documento').replace(/\s+/g, '_');
                        const docYear = String(new Date().getFullYear());
                        const cloudName = doc.file_name || `${safeDocName}_${safeColab}_${docYear}.pdf`;
                        let targetDir;
                        if (doc.source === 'documento') {
                            const safeTab = doc.tab_name ? formatarPasta(doc.tab_name).toUpperCase() : 'DOCUMENTOS';
                            targetDir = `${onedriveBasePath}/${safeColab}/${safeTab}/${docYear}`;
                        } else {
                            targetDir = `${onedriveBasePath}/${safeColab}/CONTRATOS`;
                        }
                        await onedrive.ensurePath(targetDir);
                        await onedrive.uploadToOneDrive(targetDir, cloudName, finalBuffer);
                        console.log(`[POLL-ASSINATURAS] ✓ OneDrive sync: ${cloudName} -> ${targetDir}`);
                        onedriveOk = true;
                    } catch(odErr) {
                        console.warn('[POLL-ADMISSAO] OneDrive sync falhou:', odErr.message);
try {
    db.run("CREATE TABLE IF NOT EXISTS system_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, msg TEXT, ts DATETIME DEFAULT CURRENT_TIMESTAMP)", () => {
        db.run("INSERT INTO system_logs (msg) VALUES (?)", ['OneDrive Sync Error: ' + odErr.message + ' | Path: ' + targetDir]);
    });
} catch(e) {}

db.run("INSERT OR REPLACE INTO logs (msg) VALUES (?)", ['OneDrive Sync Error: ' + odErr.message + ' Path: ' + targetDir]);
                    }
                }
                // Salvar em disco local como fallback (caso OneDrive falhe)
                let signedPath = null;
                if (finalBuffer) {
                    try {
                        const destPath = path.join(BASE_PATH, `doc_${doc.id}.pdf`);
                        fs.writeFileSync(destPath, finalBuffer);
                        signedPath = destPath;
                    } catch(e) {
                        console.warn(`[POLL-ADMISSAO] Disco local indisponível (normal no Render): ${e.message}`);
                    }
                }

                // Atualizar banco de acordo com a origem do documento
                if (doc.source === 'admissao') {
                    db.run(
                        `UPDATE admissao_assinaturas SET assinafy_status = 'Assinado', assinado_em = CURRENT_TIMESTAMP, signed_file_path = ? WHERE id = ?`,
                        [signedPath, doc.id]
                    );
                } else {
                    db.run(
                        `UPDATE documentos SET assinafy_status = 'Assinado', signed_file_path = ?, assinafy_signed_at = CURRENT_TIMESTAMP WHERE id = ?`,
                        [signedPath, doc.id]
                    );
                }
            } catch(e) {
                console.warn(`[POLL-ADMISSAO] Erro ao verificar doc ${doc.assinafy_id}: ${e.message}`);
            }
        }
    } catch(e) {
        console.warn('[POLL-ADMISSAO] Erro no job de polling:', e.message);
    }
}

// Iniciar polling após o servidor subir (aguarda 30s e depois a cada 30 segundos)
setTimeout(() => {
    pollAdmissaoAssinaturas();
    setInterval(pollAdmissaoAssinaturas, 30 * 1000);
}, 30000);
console.log('[POLL-ADMISSAO] Job de polling configurado (a cada 30 segundos).');
// ─────────────────────────────────────────────────────────────────────────────

// Endpoint de alertas realtime: retorna documentos de admissão e prontuário assinados nas últimas 24h
app.get('/api/admissao-assinaturas/alertas-recentes', authenticateToken, (req, res) => {
    db.all(`
        SELECT * FROM (
            SELECT ('admissao_' || aa.id) AS unq_id, aa.id, aa.nome_documento, aa.assinado_em, aa.colaborador_id,
                   c.nome_completo AS colaborador_nome, 'admissao' as source
            FROM admissao_assinaturas aa
            LEFT JOIN colaboradores c ON c.id = aa.colaborador_id
            WHERE aa.assinafy_status = 'Assinado'
              AND aa.assinado_em IS NOT NULL
              AND datetime(aa.assinado_em) >= datetime('now', '-24 hours')
            
            UNION ALL
            
            SELECT ('doc_' || d.id) AS unq_id, d.id, d.document_type AS nome_documento, d.assinafy_signed_at AS assinado_em, d.colaborador_id,
                   c.nome_completo AS colaborador_nome, 'documentos' as source
            FROM documentos d
            LEFT JOIN colaboradores c ON c.id = d.colaborador_id
            WHERE d.assinafy_status = 'Assinado'
              AND d.assinafy_signed_at IS NOT NULL
              AND datetime(d.assinafy_signed_at) >= datetime('now', '-24 hours')
        )
        ORDER BY assinado_em DESC
        LIMIT 30
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// Endpoint: Reenviar/Recuperar Link de Assinatura
app.post('/api/assinaturas/reenviar', authenticateToken, async (req, res) => {
    const { id, source } = req.body;
    try {
        const table = source === 'documento' ? 'documentos' : 'admissao_assinaturas';
        const docColName = source === 'documento' ? 'document_type as nome_documento' : 'nome_documento';
        
        const doc = await new Promise((resolve, reject) => 
            db.get(`SELECT assinafy_id, assinafy_url, colaborador_id, ${docColName} FROM ${table} WHERE id=?`, [id], (err, r) => err?reject(err):resolve(r))
        );
        if (!doc || !doc.assinafy_id) return res.status(404).json({ error: 'Assinatura vinculada não encontrada.' });
        
        let signLink = doc.assinafy_url;
        
        if (!signLink) {
            const https = require('https');
            const docInfo = await new Promise((resolve, reject) => {
                const r = https.request({
                    hostname: 'api.assinafy.com.br', path: `/v1/documents/${doc.assinafy_id}`, method: 'GET',
                    headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey, 'Accept': 'application/json' }
                }, resp => {
                    const chunks = [];
                    resp.on('data', c => chunks.push(c));
                    resp.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch(e){resolve(null);} });
                });
                r.on('error', reject); r.end();
            });
            if (docInfo && docInfo.data) {
                const d = docInfo.data;
                signLink = d.sign_url || d.signUrl || (d.signers && d.signers[0] && (d.signers[0].sign_url || d.signers[0].url));
            }
        }
        
        if (signLink) {
            // Atualizar link + timestamp de envio no banco
            db.run(`UPDATE ${table} SET assinafy_url = ?, enviado_em = CURRENT_TIMESTAMP WHERE id = ?`, [signLink, id], () => {});
            
            // Enviar email via nodemailer
            const colab = await new Promise((res2, rej2) => db.get('SELECT nome_completo, email FROM colaboradores WHERE id = ?', [doc.colaborador_id], (e, r) => e ? rej2(e) : res2(r)));
            
            if (colab) {
                const destEmail = colab.email;
                if (destEmail) {
                    const nodemailer = require('nodemailer');
                    const transporter = nodemailer.createTransport(SMTP_CONFIG);
                    
                    const apiBase = (process.env.BASE_URL || 'https://sistema-america.onrender.com');
                    const logoUrl = `${apiBase}/assets/logo-header.png`;
                    const html = `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
                            <div style="background: #fff; padding: 0;">
                                <img src="${logoUrl}" alt="América Rental" style="width: 100%; display: block; max-height: 120px; object-fit: cover;" onerror="this.style.display='none'">
                            </div>
                            <div style="padding: 1.5rem 2rem;">
                                <h2 style="color: #0f4c81; margin-top: 0;">Lembrete de Assinatura</h2>
                                <p>Olá <strong>${colab.nome_completo || 'Colaborador'}</strong>,</p>
                                <p>Você tem um documento pendente de assinatura no sistema da América Rental: <strong>${doc.nome_documento || 'Documento'}</strong>.</p>
                                <p>Por favor, clique no botão abaixo para revisar e assinar digitalmente:</p>
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="${signLink}" style="background-color: #0f4c81; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Assinar Documento</a>
                                </div>
                                <p style="color: #666; font-size: 12px;">Se o botão não funcionar, cole este link no seu navegador:<br>${signLink}</p>
                                <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
                                <p style="color: #999; font-size: 11px;">Este é um e-mail automático, por favor não responda.</p>
                            </div>
                        </div>
                    `;
                    
                    await transporter.sendMail({
                        from: `"RH - América Rental" <${SMTP_CONFIG.auth.user}>`,
                        to: destEmail,
                        subject: `Lembrete de Assinatura - ${doc.nome_documento || 'Documento'}`,
                        html: html
                    });
                    
                    return res.json({ success: true, messsage: 'E-mail enviado com sucesso.', link: signLink });
                }
            }
            // Se nao enviou e-mail (por falta de email cadastrado), devolve apenas o success (frontend fará fallback ou dirá q o e-mail não foi encontrado)
            res.json({ success: true, warn: 'Colaborador sem e-mail cadastrado. URL recuperada, mas não enviada via sistema.', link: signLink });
        } else {
            res.status(400).json({ error: 'Não foi possível detectar o link do documento na nuvem.' });
        }
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// Endpoint: Limpar todos os registros de teste de assinaturas
app.delete('/api/assinaturas/limpar-testes', authenticateToken, async (req, res) => {
    try {
        await new Promise((resolve, reject) =>
            db.run(`UPDATE documentos SET assinafy_status = NULL, assinafy_sent_at = NULL, assinafy_signed_at = NULL, assinafy_id = NULL, assinafy_url = NULL, signed_file_path = NULL WHERE assinafy_sent_at IS NOT NULL OR assinafy_id IS NOT NULL`, [], (err) => err ? reject(err) : resolve())
        );
        await new Promise((resolve, reject) =>
            db.run(`DELETE FROM admissao_assinaturas`, [], (err) => err ? reject(err) : resolve())
        );
        res.json({ success: true, message: 'Registros de teste removidos com sucesso.' });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// Endpoint: TODOS os documentos de assinatura (admissao_assinaturas + documentos com assinafy_id)

// Rota para marcar documento como Outro Meio
app.post('/api/admissao-assinaturas/outro-meio', authenticateToken, (req, res) => {
    const { id, source } = req.body;
    if (!id || !source) return res.status(400).json({ error: 'id e source são obrigatórios' });

    let table = source === 'admissao' ? 'admissao_assinaturas' : 'documentos';
    db.run(`UPDATE ${table} SET assinafy_status = 'Outro Meio' WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Documento não encontrado' });
        res.json({ ok: true, message: 'Documento marcado como resolvido (Outro Meio).' });
    });
});
app.get('/api/admissao-assinaturas/todos', authenticateToken, async (req, res) => {
    try {
        const dbAll = (sql, params) => new Promise((resolve, reject) =>
            db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []))
        );

        // Query 1: Contratos de admissão
        const admissaoRows = await dbAll(`
            SELECT aa.id, aa.nome_documento, aa.assinafy_status, aa.assinafy_id,
                   aa.enviado_em, aa.assinado_em, aa.colaborador_id,
                   c.nome_completo AS colaborador_nome,
                   c.departamento  AS colaborador_departamento,
                   c.cargo         AS colaborador_cargo,
                   'admissao'      AS source
            FROM admissao_assinaturas aa
            LEFT JOIN colaboradores c ON c.id = aa.colaborador_id
            WHERE aa.assinafy_id IS NOT NULL
        `, []);

        // Query 2: Documentos do prontuário (ASO, EPI, etc.) — sem coluna assinafy_sent_at/signed_at para compatibilidade
        const docRows = await dbAll(`
            SELECT d.id, d.document_type AS nome_documento, d.assinafy_status, d.assinafy_id,
                   d.colaborador_id,
                   c.nome_completo AS colaborador_nome,
                   c.departamento  AS colaborador_departamento,
                   c.cargo         AS colaborador_cargo,
                   'documento'     AS source
            FROM documentos d
            LEFT JOIN colaboradores c ON c.id = d.colaborador_id
            WHERE d.assinafy_id IS NOT NULL
              AND d.assinafy_status IS NOT NULL
        `, []);

        // Buscar datas de envio/assinatura para documentos (colunas que podem não existir dependendo da migração)
        let docDates = {};
        try {
            const datesRows = await dbAll(`
                SELECT id, assinafy_sent_at AS enviado_em, assinafy_signed_at AS assinado_em
                FROM documentos WHERE assinafy_id IS NOT NULL
            `, []);
            datesRows.forEach(r => { docDates[r.id] = { enviado_em: r.enviado_em, assinado_em: r.assinado_em }; });
        } catch(e) {
            console.warn('[/todos] Colunas de data assinafy não encontradas:', e.message);
        }

        // Merge das datas nos documentos
        const docRowsWithDates = docRows.map(d => ({
            ...d,
            enviado_em:  docDates[d.id]?.enviado_em  || null,
            assinado_em: docDates[d.id]?.assinado_em || null,
        }));

        // Combinar e ordenar por data mais recente
        const all = [...admissaoRows, ...docRowsWithDates].sort((a, b) => {
            const dateA = new Date(a.assinado_em || a.enviado_em || 0).getTime();
            const dateB = new Date(b.assinado_em || b.enviado_em || 0).getTime();
            return dateB - dateA;
        }).slice(0, 500);

        res.json(all);
    } catch(e) {
        console.error('[/admissao-assinaturas/todos] Erro:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// Endpoint para forçar verificação imediata de status do colaborador
app.post('/api/admissao-assinaturas/verificar-status', authenticateToken, async (req, res) => {
    const { colaborador_id } = req.body;
    if (!colaborador_id) return res.status(400).json({ error: 'colaborador_id obrigatório' });

    try {
        const pendentes = await new Promise((resolve, reject) =>
            db.all(`SELECT * FROM admissao_assinaturas WHERE colaborador_id = ? AND assinafy_status = 'Pendente' AND assinafy_id IS NOT NULL`,
                [colaborador_id], (err, rows) => err ? reject(err) : resolve(rows))
        );

        if (!pendentes || pendentes.length === 0) {
            return res.json({ ok: true, atualizados: 0, mensagem: 'Nenhum documento pendente.' });
        }

        const https = require('https');
        let atualizados = 0;

        for (const doc of pendentes) {
            try {
                const docInfo = await new Promise((resolve, reject) => {
                    const r = https.request({
                        hostname: 'api.assinafy.com.br',
                        path: `/v1/documents/${doc.assinafy_id}`,
                        method: 'GET',
                        headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey, 'Accept': 'application/json' }
                    }, resp => {
                        const chunks = [];
                        resp.on('data', c => chunks.push(c));
                        resp.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch(e) { resolve(null); } });
                    });
                    r.on('error', reject);
                    r.setTimeout(10000, () => r.destroy());
                    r.end();
                });

                if (!docInfo) continue;
                const docData = docInfo.data || docInfo;
                const statusRaw = String(docData?.status || docData?.status_id || '').toLowerCase();
                const isSigned = ['completed', 'signed', 'concluded', 'finalizado', 'assinado', 'certificated', '4'].some(s => statusRaw.includes(s) || statusRaw === '4');

                console.log(`[VERIF] Doc ${doc.assinafy_id} → "${statusRaw}" → signed=${isSigned}`);

                if (isSigned) {
                    db.run(`UPDATE admissao_assinaturas SET assinafy_status='Assinado', assinado_em=CURRENT_TIMESTAMP WHERE id=?`, [doc.id]);
                    atualizados++;
                }
            } catch(e) {
                console.warn(`[VERIF] Erro doc ${doc.assinafy_id}: ${e.message}`);
            }
        }

        res.json({ ok: true, atualizados, verificados: pendentes.length });
    } catch(e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// DIAGNÓSTICO: compara tabelas e status real no Assinafy
app.get('/api/admissao-assinaturas/diagnostico/:colaborador_id', authenticateToken, async (req, res) => {
    const { colaborador_id } = req.params;
    try {
        const aa = await new Promise((resolve, reject) =>
            db.all('SELECT * FROM admissao_assinaturas WHERE colaborador_id = ?', [colaborador_id], (err, rows) => err ? reject(err) : resolve(rows))
        );
        const docs = await new Promise((resolve, reject) =>
            db.all('SELECT id, assinafy_id, assinafy_status, signed_file_path FROM documentos WHERE colaborador_id = ? AND assinafy_id IS NOT NULL', [colaborador_id], (err, rows) => err ? reject(err) : resolve(rows))
        );
        
        // Consultar Assinafy para cada admissao_assinatura com assinafy_id
        const https = require('https');
        const assinafyStatus = [];
        for (const doc of aa.filter(d => d.assinafy_id)) {
            const info = await new Promise((resolve) => {
                const r = https.request({ hostname: 'api.assinafy.com.br', path: `/v1/documents/${doc.assinafy_id}`, method: 'GET', headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey, 'Accept': 'application/json' }}, resp => {
                    const chunks = [];
                    resp.on('data', c => chunks.push(c));
                    resp.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch(e) { resolve({ erro: e.message }); } });
                });
                r.on('error', e => resolve({ erro: e.message }));
                r.setTimeout(8000, () => { r.destroy(); resolve({ erro: 'timeout' }); });
                r.end();
            });
            const docData = info?.data || info;
            assinafyStatus.push({ assinafy_id: doc.assinafy_id, nome: doc.nome_documento, status_banco: doc.assinafy_status, status_assinafy_api: docData?.status, raw_keys: Object.keys(docData || {}) });
        }

        res.json({ admissao_assinaturas: aa, documentos_com_assinafy_id: docs, assinafy_api_status: assinafyStatus });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * ASSINAFY: Background mode com Polling estendido
 * O Assinafy processa documentos lentamente em alguns casos.
 * Retornamos ok pro frontend logo e o processo duro ocorre no background.
 * V39_ASSINAFY_BG_FIX_CONCLUIDO
 */
app.post('/api/assinafy/upload', async (req, res) => {
    const { document_id, colaborador_id } = req.body;
    console.log(`[ASSINAFY] Iniciado. Doc: ${document_id}, Colab: ${colaborador_id}`);

    if (!document_id || !colaborador_id) {
        return res.status(400).json({ sucesso: false, error: 'document_id e colaborador_id sao obrigatorios.' });
    }

    try {
        // Marca como pendente provisoriamente
        db.run("UPDATE documentos SET assinafy_status = 'Pendente', assinafy_sent_at = CURRENT_TIMESTAMP WHERE id = ?", [document_id]);
        
        const novoProcesso = require('./novo_processo_assinafy');
        const resultado = await novoProcesso.enviarDocumentoParaAssinafy(document_id, colaborador_id);
        
        console.log(`[ASSINAFY SYNC] Enviado! ID=${resultado?.assinafyDocId} URL=${resultado?.urlAssinatura}`);

        // Enviar cópia de notificação para o sistema via SMTP
        try {
            const transporter = nodemailer.createTransport(SMTP_CONFIG);
            await transporter.sendMail({
                from: `"RH América Rental" <${SMTP_CONFIG.auth.user}>`,
                to: 'americasistema48@gmail.com',
                subject: `📋 Assinatura solicitada: ${resultado?.docType?.split('###')[0] || 'Documento'} - ${resultado?.nomeColab}`,
                html: `
                    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e0e0e0;border-radius:8px;">
                        <h2 style="color:#1a1a2e;border-bottom:2px solid #e07b39;padding-bottom:10px;">📋 Documento Enviado para Assinatura</h2>
                        <table style="width:100%;border-collapse:collapse;">
                            <tr><td style="padding:8px;color:#666;width:35%"><strong>Colaborador:</strong></td><td style="padding:8px;">${resultado?.nomeColab}</td></tr>
                            <tr style="background:#f9f9f9"><td style="padding:8px;color:#666"><strong>E-mail:</strong></td><td style="padding:8px;">${resultado?.emailColaborador}</td></tr>
                            <tr><td style="padding:8px;color:#666"><strong>Documento:</strong></td><td style="padding:8px;">${resultado?.docType?.split('###')[0] || '-'}</td></tr>
                            <tr style="background:#f9f9f9"><td style="padding:8px;color:#666"><strong>Link de acesso:</strong></td><td style="padding:8px;"><a href="${resultado?.urlAssinatura}" style="color:#e07b39;">${resultado?.urlAssinatura}</a></td></tr>
                            <tr><td style="padding:8px;color:#666"><strong>Enviado em:</strong></td><td style="padding:8px;">${new Date().toLocaleString('pt-BR')}</td></tr>
                        </table>
                        <p style="margin-top:20px;font-size:12px;color:#999;">Este é um e-mail automático do Sistema América Rental.</p>
                    </div>
                `
            });
            console.log('[ASSINAFY] Cópia de notificação enviada para americasistema48@gmail.com');
        } catch (mailErr) {
            console.error('[ASSINAFY] Falha ao enviar cópia de notificação:', mailErr.message);
            // Não bloqueia o fluxo principal
        }
        
        res.json({
            sucesso: true,
            processando_em_background: false,
            urlAssinatura: resultado?.urlAssinatura || null,
            message: "O documento foi enviado com sucesso para assinatura no Assinafy!"
        });
    } catch (error) {
        console.error('[ASSINAFY SYNC] ERRO:', error.message);
        
        // Retorna para o status de erro
        db.run("UPDATE documentos SET assinafy_status = 'Erro' WHERE id = ?", [document_id]);
        
        res.status(400).json({
            sucesso: false,
            error: error.message
        });
    }
});

// Middleware de Autenticação (Bypass temporário para facilitar dev do frontend)
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;
    
    // Fallback: se estiver em localhost sem auth ou para bypass se desejado, remova este bloco.
    if (!token) return res.status(401).json({ error: 'Acesso negado' });
    
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido' });
        req.user = user;
        next();
    });
}

// --- ROTAS DE AUTENTICAÃ‡ÃƒO ---
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT u.*, g.nome as grupo_nome FROM usuarios u LEFT JOIN grupos_permissao g ON g.id = u.grupo_permissao_id WHERE u.username = ?`, [username], (err, user) => {
        if (err || !user) return res.status(401).json({ error: 'Usuário ou senha incorretos' });
        if (user.ativo === 0) return res.status(403).json({ error: 'Conta inativa. Acesso bloqueado.' });
        const valid = bcrypt.compareSync(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Usuário ou senha incorretos' });
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role, grupo_permissao_id: user.grupo_permissao_id, departamento: user.departamento, grupo_nome: user.grupo_nome }, SECRET_KEY, { expiresIn: '8h' });
        res.json({ token, user: { id: user.id, username: user.username, role: user.role, grupo_permissao_id: user.grupo_permissao_id, departamento: user.departamento, grupo_nome: user.grupo_nome } });
    });
});

// --- CID-10 SEARCH ---
const CID10_PATH = path.join(__dirname, 'cid10.min.json');
let cid10Data = [];
try { cid10Data = JSON.parse(fs.readFileSync(CID10_PATH, 'utf8')); } catch(e) { console.error('Erro ao carregar CID-10:', e.message); }

app.get('/api/cid10', (req, res) => {
    const q = (req.query.q || '').toLowerCase().trim();
    if (!q || q.length < 2) return res.json([]);
    const results = cid10Data.filter(c =>
        c.code.toLowerCase().startsWith(q) || c.desc.toLowerCase().includes(q)
    ).slice(0, 12);
    res.json(results);
});

// --- CBO SEARCH ---
const CBO_PATH = path.join(__dirname, 'cbo.min.json');
let cboData = [];
try { cboData = JSON.parse(fs.readFileSync(CBO_PATH, 'utf8')); } catch(e) { console.error('Erro ao carregar CBO:', e.message); }

app.get('/api/cbo', (req, res) => {
    const q = (req.query.q || '').toLowerCase().trim();
    if (!q || q.length < 2) return res.json([]);
    const results = cboData.filter(c =>
        c.code.toLowerCase().replace(/[-\s]/g,'').startsWith(q.replace(/[-\s]/g,'')) ||
        c.desc.toLowerCase().includes(q)
    ).slice(0, 12);
    res.json(results);
});

app.post('/api/auth/setup', (req, res) => {
    const { username, password } = req.body;
    const hash = bcrypt.hashSync(password, 10);
    db.run('INSERT INTO usuarios (username, password_hash, role) VALUES (?, ?, ?)', [username, hash, 'RH'], function(err) {
        if (err) return res.status(400).json({ error: 'Erro ao criar admin' });
        res.json({ message: 'Admin criado com sucesso' });
    });
});

// --- ROTAS DE DASHBOARD ---
app.get('/api/dashboard', authenticateToken, (req, res) => {
    const stats = { total: 0, ativos: 0, ferias: 0, afastados: 0, desligados: 0 };
    const today = new Date().toISOString().split('T')[0];
    
    db.all('SELECT status, ferias_programadas_inicio, ferias_programadas_fim FROM colaboradores', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        rows.forEach(row => {
            stats.total += 1;
            let effectiveStatus = row.status || 'Ativo';
            
            // Lógica de férias automática: Se status é Ativo/Férias e hoje está no período, muda para Férias
            if (effectiveStatus === 'Ativo' || effectiveStatus === 'Férias') {
                if (row.ferias_programadas_inicio && row.ferias_programadas_fim) {
                    if (today >= row.ferias_programadas_inicio && today <= row.ferias_programadas_fim) {
                        effectiveStatus = 'Férias';
                    } else if (effectiveStatus === 'Férias') {
                        effectiveStatus = 'Ativo';
                    }
                }
            }

            if (effectiveStatus === 'Ativo' || effectiveStatus === 'Em Integração') stats.ativos += 1;
            else if (effectiveStatus === 'Férias') stats.ferias += 1;
            else if (effectiveStatus === 'Afastado') stats.afastados += 1;
            else if (effectiveStatus === 'Desligado') stats.desligados += 1;
        });
        res.json(stats);
    });
});

app.get('/api/dashboard/charts', authenticateToken, async (req, res) => {
    try {
        const atestadosMes = await new Promise((resolve, reject) => {
            const query = `
                SELECT strftime('%Y-%m', upload_date) as mes, COUNT(*) as count 
                FROM documentos 
                WHERE (tab_name LIKE '%ATESTADO%' OR document_type LIKE '%Atestado%')
                GROUP BY mes 
                ORDER BY mes DESC 
                LIMIT 6
            `;
            db.all(query, [], (err, rows) => err ? reject(err) : resolve(rows));
        });

        const asoVencendo = await new Promise((resolve, reject) => {
            const today = new Date();
            const future = new Date();
            future.setDate(today.getDate() + 30);
            
            const query = `
                SELECT c.nome_completo as nome, d.vencimento 
                FROM documentos d 
                JOIN colaboradores c ON c.id = d.colaborador_id 
                WHERE (d.tab_name LIKE '%ASO%' OR d.document_type LIKE '%ASO%')
                  AND d.vencimento IS NOT NULL
                  AND d.vencimento != ''
                  AND c.status = 'Ativo'
            `;
            db.all(query, [], (err, rows) => {
                if (err) return reject(err);
                
                const todayStr = today.toISOString().split('T')[0];
                const futureStr = future.toISOString().split('T')[0];
                
                const filtered = rows.filter(r => {
                    if (!r.vencimento) return false;
                    let v = r.vencimento;
                    if (v.includes('/')) {
                        const parts = v.split('/');
                        if (parts.length === 3) v = `${parts[2]}-${parts[1]}-${parts[0]}`;
                    }
                    return v >= todayStr && v <= futureStr;
                });
                
                filtered.sort((a,b) => {
                    let vA = a.vencimento.includes('/') ? a.vencimento.split('/').reverse().join('-') : a.vencimento;
                    let vB = b.vencimento.includes('/') ? b.vencimento.split('/').reverse().join('-') : b.vencimento;
                    return vA.localeCompare(vB);
                });
                resolve(filtered);
            });
        });

        const faltasRanking = await new Promise((resolve, reject) => {
            const faltasQuery = `
                SELECT colaborador_id, COUNT(*) as faltas_sem_atestado 
                FROM faltas 
                GROUP BY colaborador_id
            `;
            const atestadosQuery = `
                SELECT colaborador_id, atestado_inicio, atestado_fim 
                FROM documentos 
                WHERE tab_name LIKE '%ATESTADO%' OR document_type LIKE '%Atestado%'
            `;
            const cQuery = "SELECT id, nome_completo as nome FROM colaboradores WHERE status = 'Ativo'";
            
            db.all(faltasQuery, [], (e1, fRows) => {
                if (e1) return reject(e1);
                db.all(atestadosQuery, [], (e2, aRows) => {
                    if (e2) return reject(e2);
                    db.all(cQuery, [], (e3, cRows) => {
                        if (e3) return reject(e3);
                        
                        const ranking = cRows.map(c => {
                            const faltas = fRows.find(f => f.colaborador_id === c.id)?.faltas_sem_atestado || 0;
                            const docs = aRows.filter(a => a.colaborador_id === c.id);
                            let diasAtestado = 0;
                            docs.forEach(doc => {
                                if (doc.atestado_inicio && doc.atestado_fim) {
                                    const diff = (new Date(doc.atestado_fim) - new Date(doc.atestado_inicio)) / (1000 * 60 * 60 * 24) + 1;
                                    diasAtestado += isNaN(diff) ? 1 : diff;
                                } else {
                                    diasAtestado += 1; 
                                }
                            });
                            return { id: c.id, nome: c.nome, faltas_sem_atestado: faltas, dias_atestado: diasAtestado, total: faltas + diasAtestado };
                        });
                        resolve(ranking.filter(r => r.total > 0).sort((a,b) => b.total - a.total).slice(0, 10));
                    });
                });
            });
        });

        const feriasVencendo = await new Promise((resolve, reject) => {
             db.all("SELECT id, nome_completo as nome, data_admissao FROM colaboradores WHERE status = 'Ativo' AND data_admissao IS NOT NULL AND data_admissao != ''", [], (err, rows) => {
                 if (err) return reject(err);
                 const today = new Date();
                 const future = new Date();
                 future.setDate(today.getDate() + 60);

                 const resFerias = rows.map(r => {
                     let adm = r.data_admissao;
                     if (adm.includes('/')) {
                         const pts = adm.split('/');
                         if (pts.length===3) adm = `${pts[2]}-${pts[1]}-${pts[0]}`;
                     }
                     const concessivoEnd = new Date(adm + 'T12:00:00');
                     concessivoEnd.setFullYear(concessivoEnd.getFullYear() + 2);
                     
                     const diffDays = Math.ceil((concessivoEnd - today) / (1000 * 60 * 60 * 24));
                     return {
                         id: r.id, 
                         nome: r.nome,
                         admissao: adm,
                         concessivo_fim: concessivoEnd.toISOString().split('T')[0],
                         dias_restantes: diffDays
                     };
                 }).filter(r => r.dias_restantes >= 0 && r.dias_restantes <= 60)
                 .sort((a,b) => a.dias_restantes - b.dias_restantes);

                 resolve(resFerias);
             });
        });

        const faltasBd = await new Promise((res, rej) => db.all("SELECT strftime('%Y-%m', data_falta) as mes, COUNT(*) as count FROM faltas GROUP BY mes", [], (e, r) => e ? rej(e) : res(r)));
        const atestadosBd = await new Promise((res, rej) => db.all("SELECT strftime('%Y-%m', upload_date) as mes, COUNT(*) as count FROM documentos WHERE (tab_name LIKE '%ATESTADO%' OR document_type LIKE '%Atestado%') GROUP BY mes", [], (e, r) => e ? rej(e) : res(r)));
        
        const mapMeses = {};
        for(let i=0; i<6; i++){
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const m = d.toISOString().split('T')[0].substring(0,7);
            mapMeses[m] = { mes: m, faltas: 0, atestados: 0 };
        }
        
        faltasBd.forEach(row => { if(mapMeses[row.mes]) mapMeses[row.mes].faltas += row.count; });
        atestadosBd.forEach(row => { if(mapMeses[row.mes]) mapMeses[row.mes].atestados += row.count; });
        
        const faltasAgrupadasMes = Object.values(mapMeses).sort((a,b) => a.mes.localeCompare(b.mes));

        res.json({
            atestadosMes: atestadosMes.reverse(),
            asoVencendo,
            faltasRanking,
            feriasVencendo,
            faltasAgrupadasMes
        });

    } catch (error) {
        console.error("Erro nas charts do dashboard:", error);
        res.status(500).json({ error: error.message });
    }
});

// --- ROTAS DE COLABORADORES ---
app.get('/api/colaboradores', authenticateToken, (req, res) => {
    db.all('SELECT * FROM colaboradores', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/colaboradores/:id', authenticateToken, (req, res) => {
    db.get('SELECT * FROM colaboradores WHERE id = ?', [req.params.id], (err, row) => {
        if (err || !row) return res.status(err ? 500 : 404).json({ error: err ? err.message : 'Não encontrado' });
        
        db.all('SELECT chave_id, data_entrega FROM colaborador_chaves WHERE colaborador_id = ?', [req.params.id], (err2, chaves) => {
            if (err2) return res.status(500).json({ error: err2.message });
            row.chaves_lista = chaves;
            
            // Buscar dependentes
            db.all('SELECT * FROM dependentes WHERE colaborador_id = ?', [req.params.id], (err3, deps) => {
                if (err3) return res.status(500).json({ error: err3.message });
                row.dependentes = deps;
                res.json(row);
            });
        });
    });
});

app.post('/api/colaboradores', authenticateToken, (req, res) => {
    const data = req.body;
    const nomeOriginal = data.nome_completo || data.nome;

    if (!nomeOriginal || !data.cpf || !data.email || !data.telefone) {
        return res.status(400).json({ error: "Nome, CPF, Email e Telefone são campos obrigatórios" });
    }

    const nomePasta = formatarNome(nomeOriginal);
    const pastaColaborador = path.join(BASE_PATH, nomePasta);
    
    try {
        if (!fs.existsSync(pastaColaborador)) {
            fs.mkdirSync(pastaColaborador, { recursive: true });
            FOLDERS.forEach(p => {
                const subPath = path.join(pastaColaborador, p);
                if (!fs.existsSync(subPath)) fs.mkdirSync(subPath, { recursive: true });
            });
        }
    } catch (erro) {
        console.error("ERRO AO CRIAR PASTAS LOCAIS:", erro);
    }
    
    // (A Sincronização foi movida para o final do processo, após salvar no banco)

    const colunas = [
        'nome_completo', 'cpf', 'rg', 'data_nascimento', 'estado_civil', 'nacionalidade',
        'nome_mae', 'nome_pai', 'telefone', 'email', 'endereco',
        'cargo', 'departamento', 'data_admissao', 'tipo_contrato', 'salario', 'status',
        'contato_emergencia_nome', 'contato_emergencia_telefone',
        'cnh_numero', 'cnh_vencimento', 'cnh_categoria',
        'matricula_esocial', 'local_nascimento', 'rg_orgao', 'rg_data_emissao', 'rg_tipo',
        'titulo_eleitoral', 'titulo_zona', 'titulo_secao',
        'ctps_numero', 'ctps_serie', 'ctps_uf', 'ctps_data_expedicao',
        'pis', 'cor_raca', 'sexo', 'grau_instrucao', 'cbo',
        'certificado_militar', 'militar_categoria', 'deficiencia',
        'horario_entrada', 'horario_saida', 'intervalo_entrada', 'intervalo_saida',
        'sabado_entrada', 'sabado_saida',
        'fgts_opcao', 'banco_nome', 'banco_agencia', 'banco_conta', 
        'escala_tipo', 'escala_folgas',
        'meio_transporte', 'valor_transporte',
        'faculdade_participa', 'faculdade_curso_id', 'faculdade_data_inicio', 'faculdade_data_termino',
        'academia_participa', 'academia_data_inicio',
        'terapia_participa', 'terapia_data_inicio',
        'celular_participa', 'celular_data',
        'chaves_participa', 'chaves_data',
        'ferias_programadas_inicio', 'ferias_programadas_fim', 'alergias', 'aso_email_enviado', 'aso_exame_data', 'aso_assinafy_link', 'aso_exames_assinafy_link'
    ];

    const values = colunas.map(col => {
        const val = data[col];
        if (col === 'status') return val || 'Ativo';
        return val === undefined ? null : val;
    });

    const query = `INSERT INTO colaboradores (${colunas.join(', ')}) VALUES (${Array(colunas.length).fill('?').join(', ')})`;

    db.run(query, values, async function(err) {
        if (err) {
            console.error("ERRO AO SALVAR:", err);
            const msg = err.message.includes("UNIQUE constraint failed") ? "Este CPF já está cadastrado." : err.message;
            return res.status(400).json({ error: msg });
        }
        const newColabId = this.lastID;
        
        // Inserir chaves se houver
        if (data.chaves_lista && Array.isArray(data.chaves_lista)) {
            data.chaves_lista.forEach(item => {
                db.run("INSERT INTO colaborador_chaves (colaborador_id, chave_id, data_entrega) VALUES (?, ?, ?)", 
                    [newColabId, item.chave_id, item.data_entrega]);
            });
        }

        // Inserir dependentes se houver
        if (data.dependentes && Array.isArray(data.dependentes)) {
            data.dependentes.forEach(dep => {
                db.run("INSERT INTO dependentes (colaborador_id, nome, cpf, data_nascimento, grau_parentesco) VALUES (?, ?, ?, ?, ?)", 
                    [newColabId, dep.nome, dep.cpf, dep.data_nascimento, dep.grau_parentesco]);
            });
        }
        
        let syncStatus = "Sincronização local";
        if (onedrive) {
            // Disparar sync no OneDrive sem bloquear a resposta HTTP
            syncColaboradorOneDrive(nomeOriginal).catch(e => console.error("[OneDrive] Erro de Sync POST Async:", e));
            syncStatus = "Sincronização SharePoint iniciada";
        }

        res.status(201).json({ id: newColabId, sucesso: true, syncMsg: syncStatus });
    });
});

app.get('/api/test/america', authenticateToken, async (req, res) => {
    try {
        const client = await onedrive.getGraphClient();
        const targetSite = await client.api(`/sites/americarentalltda.sharepoint.com:/sites/AmericaRental`).get();
        const sDrives = await client.api(`/sites/${targetSite.id}/drives`).get();
        res.json({ site: targetSite, drives: sDrives.value });
    } catch(e) {
        res.status(500).json({ error: e.message, code: e.code, body: e.body });
    }
});

/**
 * ROTA DE DIAGNÓSTICO: Verificar Persistência do Banco
 */
app.get('/api/maintenance/db-info', authenticateToken, (req, res) => {
    const dbPath = process.env.DATABASE_PATH || require('path').join(__dirname, 'data', 'hr_system_v2.sqlite');
    const isPersistent = !!process.env.DATABASE_PATH;
    const fs = require('fs');
    let tamanho = 0;
    try { tamanho = fs.statSync(dbPath).size; } catch(e) {}
    
    // Contar registros nas tabelas chave
    db.get('SELECT COUNT(*) as total FROM usuarios', [], (e1, r1) => {
        db.get('SELECT COUNT(*) as total FROM grupos_permissao', [], (e2, r2) => {
            db.get('SELECT COUNT(*) as total FROM permissoes_grupo', [], (e3, r3) => {
                db.get('SELECT COUNT(*) as total FROM colaboradores', [], (e4, r4) => {
                    res.json({
                        database_path: dbPath,
                        is_persistent: isPersistent,
                        aviso: isPersistent
                            ? '✅ Banco em disco persistente (Render Disk configurado)'
                            : '⚠️  BANCO EFÊMERO! Dados serão perdidos ao reiniciar o servidor. Configure DATABASE_PATH apontando para um Render Disk.',
                        tamanho_bytes: tamanho,
                        contagens: {
                            usuarios: r1 ? r1.total : '?',
                            grupos_permissao: r2 ? r2.total : '?',
                            permissoes_grupo: r3 ? r3.total : '?',
                            colaboradores: r4 ? r4.total : '?',
                        }
                    });
                });
            });
        });
    });
});

/**
 * ROTA DE DIAGNÃ“STICO: Testar Conexão OneDrive
 */
app.get('/api/maintenance/onedrive-test', authenticateToken, async (req, res) => {
    try {
        const config = {
            clientId: !!process.env.ONEDRIVE_CLIENT_ID,
            tenantId: !!process.env.ONEDRIVE_TENANT_ID,
            clientSecret: !!process.env.ONEDRIVE_CLIENT_SECRET,
            email: process.env.ONEDRIVE_USER_EMAIL,
            basePath: process.env.ONEDRIVE_BASE_PATH || "RH/1.Colaboradores/Sistema"
        };

        if (!config.clientId || !config.tenantId || !config.clientSecret) {
            return res.status(400).json({ 
                sucesso: false, 
                error: "Configurações incompletas no Render. Verifique CLIENT_ID, TENANT_ID e SECRET.",
                details: config
            });
        }

        const accessToken = await onedrive.getAccessToken();
        const client = await onedrive.getGraphClient();
        // PRIORIDADE: ID Real da América Rental encontrado pelo Mega Finder
        const driveId = "b!giGJ-6SQo0q01aZkBQjqEzgftfBe2OJGpvVeTh2YrbQTUqm85gobSoh8CtELSzAF";
        const drivePrefix = driveId ? `/drives/${driveId}/root` : `/users/${config.email}/drive/root`;
        
        // Tentar ler a RAIZ para ver o ponto de entrada real
        let infoRaiz = null;
        let rootItems = [];
        try {
            infoRaiz = await client.api(driveId ? `/drives/${driveId}/root` : `/users/${config.email}/drive/root`).get();
            const resRaiz = await client.api(`${drivePrefix}/children`).get();
            rootItems = (resRaiz.value || []).map(item => item.name);
        } catch (rErr) { console.warn("Erro ao ler raiz:", rErr.message); }

        // 2. BUSCA GLOBAL (GPS) - Procurar pasta 'RH' em toda a organização
        let rhLocation = null;
        try {
            const searchRH = await client.api(`/sites/root/drive/root/search(q='RH')`).get();
            // Se não achar no root, tentar busca global de itens
            const searchGlobal = await client.api(`/search/query`).post({
                requests: [{
                    entityTypes: ['driveItem'],
                    query: { queryString: 'name:RH' }
                }]
            });
            rhLocation = searchGlobal.value?.[0]?.hitsContainers?.[0]?.hits?.[0]?.resource || null;
        } catch (gpsErr) { console.warn("Erro GPS:", gpsErr.message); }

        // Variáveis de diagnóstico
        let driveName = infoRaiz ? (infoRaiz.name || (driveId ? "SharePoint" : "OneDrive")) : "OneDrive";
        let infoPasta = null;
        let basePathItems = [];
        try {
            const drivePrefix = driveId ? `/drives/${driveId}/root` : `/users/${config.email}/drive/root`;
            driveInfo = await client.api(driveId ? `/drives/${driveId}` : `/users/${config.email}/drive`).get();
            
            // Tentar listar itens no caminho base configurado
            const encodedBasePath = config.basePath.split('/').map(p => encodeURIComponent(p)).join('/');
            
            try {
                // Tenta pegar metadados da pasta base
                infoPasta = await client.api(`${drivePrefix}:/${encodedBasePath}`).get();
                
                const items = await client.api(`${drivePrefix}:/${encodedBasePath}:/children`).get();
                basePathItems = items.value.map(i => i.name);
            } catch (pErr) {
                basePathItems = [`âš ï¸ Erro no caminho: ${pErr.message}`];
            }
        } catch (dErr) {
            driveInfo = { name: "ERRO", error: dErr.message };
        }
        // 3. BUSCA PROFUNDA (MEGA FINDER) para encontrar o ID correto
        let siteDrives = [];
        try {
            const sites = await client.api(`/sites?search=America`).get();
            for (const s of (sites.value || [])) {
                try {
                    const sDrives = await client.api(`/sites/${s.id}/drives`).get();
                    siteDrives.push({
                        siteName: s.displayName,
                        drives: sDrives.value.map(d => ({ name: d.name, id: d.id }))
                    });
                } catch (dErr) { console.warn(`Erro no site ${s.displayName}:`, dErr.message); }
            }
        } catch (sErr) { console.error("Erro na busca de sites:", sErr.message); }

        res.json({
            sucesso: true,
            driveName: infoRaiz ? (infoRaiz.name || driveName) : driveName,
            basePathItems: basePathItems,
            rootItems: rootItems,
            rhLocation: rhLocation,
            siteDiscovery: siteDrives,
            config: {
                basePath: config.basePath,
                webUrlBase: infoPasta ? infoPasta.webUrl : "Pasta não localizada",
                webUrlRaiz: infoRaiz ? infoRaiz.webUrl : "N/A",
                idReal: driveId || "Personal"
            }
        });
    } catch (e) {
        console.error("OneDrive Test Failure:", e);
        res.status(500).json({ 
            sucesso: false, 
            error: "Falha na conexão: " + e.message,
            code: e.code,
            details: e.body ? JSON.parse(e.body) : null
        });
    }
});

app.put('/api/colaboradores/:id', authenticateToken, (req, res) => {
    const data = req.body;
    const id = req.params.id;

    if (('email' in data && !data.email) || ('telefone' in data && !data.telefone)) {
        return res.status(400).json({ error: "Email e Telefone são campos obrigatórios e não podem ser vazios" });
    }

    const colunas = [
        'nome_completo', 'cpf', 'rg', 'data_nascimento', 'estado_civil', 'nacionalidade',
        'nome_mae', 'nome_pai', 'telefone', 'email', 'endereco',
        'cargo', 'departamento', 'data_admissao', 'tipo_contrato', 'salario', 'status',
        'contato_emergencia_nome', 'contato_emergencia_telefone',
        'cnh_numero', 'cnh_vencimento', 'cnh_categoria',
        'matricula_esocial', 'local_nascimento', 'rg_orgao', 'rg_data_emissao', 'rg_tipo',
        'titulo_eleitoral', 'titulo_zona', 'titulo_secao',
        'ctps_numero', 'ctps_serie', 'ctps_uf', 'ctps_data_expedicao',
        'pis', 'cor_raca', 'sexo', 'grau_instrucao', 'cbo',
        'certificado_militar', 'militar_categoria', 'deficiencia',
        'horario_entrada', 'horario_saida', 'intervalo_entrada', 'intervalo_saida',
        'sabado_entrada', 'sabado_saida',
        'fgts_opcao', 'banco_nome', 'banco_agencia', 'banco_conta', 
        'escala_tipo', 'escala_folgas',
        'meio_transporte', 'valor_transporte',
        'faculdade_participa', 'faculdade_curso_id', 'faculdade_data_inicio', 'faculdade_data_termino',
        'academia_participa', 'academia_data_inicio',
        'terapia_participa', 'terapia_data_inicio',
        'celular_participa', 'celular_data',
        'chaves_participa', 'chaves_data',
        'ferias_programadas_inicio', 'ferias_programadas_fim', 'alergias', 'aso_email_enviado', 'aso_exame_data', 'aso_assinafy_link', 'aso_exames_assinafy_link'
    ];

    const allowedColunas = colunas;
    const bodyKeys = Object.keys(data);
    const updates = bodyKeys.filter(k => allowedColunas.includes(k));
    
    if (updates.length === 0) {
        return res.json({ message: 'Nenhuma alteração enviada' });
    }

    const setClauses = updates.map(k => `${k} = ?`).join(', ');
    const values = updates.map(k => data[k]);
    
    const query = `UPDATE colaboradores SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    values.push(id);
    
    console.log("EXEC QUERY:", query);
    console.log("EXEC VALUES:", values);

    db.get('SELECT nome_completo FROM colaboradores WHERE id = ?', [id], (err, oldColab) => {
        if (err || !oldColab) return res.status(404).json({ error: err ? err.message : 'Não encontrado' });
        
        const oldName = oldColab.nome_completo;
        const newName = data.nome_completo || oldName;
        const oldSafeName = formatarNome(oldName);
        const newSafeName = formatarNome(newName);

        db.run(query, values, async function(updateErr) {
            if (updateErr) return res.status(400).json({ error: updateErr.message });
            
            const newDir = path.join(BASE_PATH, newSafeName);

            if (oldSafeName !== newSafeName) {
                const oldDir = path.join(BASE_PATH, oldSafeName);
                if (fs.existsSync(oldDir) && !fs.existsSync(newDir)) {
                    try {
                        fs.renameSync(oldDir, newDir);
                        db.run(`UPDATE colaboradores SET foto_path = REPLACE(foto_path, ?, ?) WHERE id = ?`, 
                               [`Colaboradores/${oldSafeName}/`, `Colaboradores/${newSafeName}/`, id]);
                        db.run(`UPDATE documentos SET file_path = REPLACE(file_path, ?, ?) WHERE colaborador_id = ?`, 
                               [`Colaboradores\\${oldSafeName}\\`, `Colaboradores\\${newSafeName}\\`, id]); 
                    } catch(e) { console.error('Erro ao renomear pasta: ', e); }
                }
            }
            
            if (data.status !== 'Incompleto') {
                try {
                    if (!fs.existsSync(newDir)) fs.mkdirSync(newDir, { recursive: true });
                    FOLDERS.forEach(p => {
                        const caminho = path.join(newDir, p);
                        if (!fs.existsSync(caminho)) fs.mkdirSync(caminho, { recursive: true });
                    });
                } catch (erro) { console.error("ERRO AO GARANTIR PASTAS NO PUT:", erro); }
                
                // (Movidopara o final do fluxo PUT)
            }

            // Atualizar chaves
            db.run("DELETE FROM colaborador_chaves WHERE colaborador_id = ?", [id], (errD) => {
                if (!errD && data.chaves_lista && Array.isArray(data.chaves_lista)) {
                    data.chaves_lista.forEach(item => {
                        db.run("INSERT INTO colaborador_chaves (colaborador_id, chave_id, data_entrega) VALUES (?, ?, ?)", 
                            [id, item.chave_id, item.data_entrega]);
                    });
                }
            });

            // Atualizar dependentes
            db.run("DELETE FROM dependentes WHERE colaborador_id = ?", [id], (errDep) => {
                if (!errDep && data.dependentes && Array.isArray(data.dependentes)) {
                    data.dependentes.forEach(dep => {
                        db.run("INSERT INTO dependentes (colaborador_id, nome, cpf, data_nascimento, grau_parentesco) VALUES (?, ?, ?, ?, ?)", 
                            [id, dep.nome, dep.cpf, dep.data_nascimento, dep.grau_parentesco]);
                    });
                }
            });

            res.json({ message: 'Colaborador atualizado com sucesso' });
        });
    });
});


/**
 * Sincronização manual com OneDrive para um colaborador
 */
app.post('/api/colaboradores/:id/sync-onedrive', authenticateToken, async (req, res) => {
    const id = req.params.id;
    try {
        db.get('SELECT nome_completo FROM colaboradores WHERE id = ?', [id], async (err, row) => {
            if (err || !row) return res.status(404).json({ error: 'Colaborador não encontrado' });
            
            try {
                const result = await syncColaboradorOneDrive(row.nome_completo);
                res.json({ 
                    sucesso: true, 
                    message: "Pastas básicas criadas! (Subpastas seguem em background)", 
                    path: result.caminho, 
                    versao: "V24_AUTO_SYNC",
                    basePath: result.basePath
                });
            } catch (e) {
                console.error("Erro Sync Manual:", e);
                res.status(500).json({ 
                    error: "Falha na sincronização Microsoft Graph", 
                    message: e.message,
                    details: e.body ? JSON.parse(e.body) : null
                });
            }
        });
    } catch (e) {
        console.error("[OneDrive Endpoint Error]:", e);
        res.status(500).json({ 
            error: "Erro na requisição de sincronização",
            message: e.message,
            details: e.body ? (typeof e.body === 'string' ? JSON.parse(e.body) : e.body) : null
        });
    }
});

app.delete('/api/colaboradores/:id', authenticateToken, (req, res) => {
    const id = req.params.id;
    
    db.get("SELECT status, nome_completo FROM colaboradores WHERE id = ?", [id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Não encontrado' });
        
        if (row.status === 'Incompleto') {
            db.run("DELETE FROM dependentes WHERE colaborador_id = ?", [id]);
            db.run("DELETE FROM documentos WHERE colaborador_id = ?", [id]);
            db.run("DELETE FROM colaboradores WHERE id = ?", [id], function(delErr) {
                if (delErr) return res.status(500).json({ error: delErr.message });
                try {
                    const pasta = path.join(BASE_PATH, formatarNome(row.nome_completo));
                    if (fs.existsSync(pasta)) fs.rmSync(pasta, { recursive: true, force: true });
                } catch(e) {}
                res.json({ message: 'Colaborador incompleto foi excluído definitivamente.' });
            });
        } else {
            db.run("UPDATE colaboradores SET status = 'Desligado' WHERE id = ?", [id], function(updateErr) {
                if (updateErr) return res.status(500).json({ error: updateErr.message });
                res.json({ message: 'Colaborador inativado com sucesso (status: Desligado)' });
            });
        }
    });
});

// Photo Upload Endpoint com Filtro de IA de Estúdio
app.post('/api/upload-foto/:id', authenticateToken, uploadFoto.single('foto'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado." });
        
        const id = req.params.id;
        let nome = req.body.nome;
        
        // Se o nome não vier no body (upload direto), buscar no banco
        if (!nome) {
            const colab = await new Promise((resolve, reject) => {
                db.get("SELECT nome_completo FROM colaboradores WHERE id = ?", [id], (err, row) => {
                    if (err) reject(err); else resolve(row);
                });
            });
            if (colab) nome = colab.nome_completo;
        }

        if (!nome) return res.status(400).json({ error: "Nome do colaborador não identificado." });

        const safeNome = formatarNome(nome);
        const pasta = path.join(BASE_PATH, safeNome, "FOTOS");
        if (!fs.existsSync(pasta)) fs.mkdirSync(pasta, { recursive: true });

        // Timestamp garante unicidade mesmo em servidores efêmeros (Render)
        const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14); // ex: 20260327230900
        const filename = `Foto_${safeNome}_${timestamp}.jpg`;
        const filepath = path.join(pasta, filename);

        const caminhoRelativo = path.posix.join('files', 'Colaboradores', safeNome, 'FOTOS', filename);


        // Processamento Automático (Sharp) - buffer reutilizado para ambos os destinos
        const processedBuffer = await sharp(req.file.buffer)
            .resize(800, 1000, {
                fit: sharp.fit.cover,
                position: sharp.strategy.attention
            })
            .jpeg({ quality: 95, mozjpeg: true })
            .toBuffer();

        // 1. Histórico local em FOTOS/ (numerado)
        fs.writeFileSync(filepath, processedBuffer);
        console.log("Foto histórico salva localmente:", filepath);

        // 2. Foto principal (substituir) em 01_FICHA_CADASTRAL/
        const pastaFicha = path.join(BASE_PATH, safeNome, "01_FICHA_CADASTRAL");
        if (!fs.existsSync(pastaFicha)) fs.mkdirSync(pastaFicha, { recursive: true });
        const fichaFilepath = path.join(pastaFicha, `Foto_${safeNome}.jpg`);
        fs.writeFileSync(fichaFilepath, processedBuffer);
        console.log("Foto principal salva/substituída:", fichaFilepath);

        // 3. Salva base64 e caminho no banco de dados (base64 persiste entre deploys)
        const base64Data = `data:image/jpeg;base64,${processedBuffer.toString('base64')}`;
        db.run("UPDATE colaboradores SET foto_path = ?, foto_base64 = ? WHERE id = ?", [caminhoRelativo, base64Data, id]);

        // 4. Upload assíncrono para OneDrive
        if (process.env.ONEDRIVE_CLIENT_ID) {
            (async () => {
                try {
                    const onedriveBase = `RH/1.Colaboradores/Sistema/${safeNome}`;
                    await onedrive.ensureFolder(`${onedriveBase}/01_FICHA_CADASTRAL`);
                    await onedrive.uploadToOneDrive(`${onedriveBase}/01_FICHA_CADASTRAL`, `Foto_${safeNome}.jpg`, processedBuffer);
                    await onedrive.ensureFolder(`${onedriveBase}/FOTOS`);
                    await onedrive.uploadToOneDrive(`${onedriveBase}/FOTOS`, filename, processedBuffer);
                    console.log(`[OneDrive] Foto sincronizada: ${filename} e Foto_${safeNome}.jpg`);
                } catch (syncErr) {
                    console.error("[OneDrive] Erro ao sincronizar foto:", syncErr.message);
                }
            })();
        }

        res.json({ sucesso: true, caminho: caminhoRelativo });
    } catch (erro) {
        console.error("Erro no processamento da foto:", erro);
        res.status(500).json({ error: erro.message });
    }
});

app.get('/api/colaboradores/foto/:id', (req, res) => {
    const logFile = path.resolve('tmp_photo_debug.log');
    const log = (msg) => {
        const time = new Date().toISOString();
        fs.appendFileSync(logFile, `${time} - ${msg}\n`);
        console.log(msg);
    };

    db.get('SELECT foto_path FROM colaboradores WHERE id = ?', [req.params.id], (err, row) => {
        if (err || !row || !row.foto_path) {
            log(`Foto não encontrada no banco para ID ${req.params.id}`);
            return res.status(404).json({ error: 'Foto não encontrada' });
        }
        
        let file_path = row.foto_path;
        log(`Buscando foto: ID ${req.params.id} -> Path: ${file_path}`);

        // Converter se for relativo
        if (file_path.startsWith('files/') || file_path.startsWith('files\\')) {
            file_path = path.join(BASE_PATH, '..', file_path.replace(/^files[\\\/]/, ''));
        } else if (file_path.startsWith('Colaboradores/') || file_path.startsWith('Colaboradores\\')) {
            file_path = path.join(BASE_PATH, '..', file_path);
        }
        
        file_path = path.normalize(file_path);
        if (!path.isAbsolute(file_path)) {
            file_path = path.resolve(file_path);
        }
        
        if (!fs.existsSync(file_path)) {
            log(`Arquivo NÃƒO encontrado: ${file_path}`);
            return res.status(404).json({ error: 'Arquivo físico não encontrado' });
        }
        
        log(`Sucesso: Enviando arquivo ${file_path}`);
        res.sendFile(file_path);
    });
});

// --- ROTAS DE DEPENDENTES ---
app.get('/api/colaboradores/:id/dependentes', authenticateToken, (req, res) => {
    db.all('SELECT * FROM dependentes WHERE colaborador_id = ?', [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
app.post('/api/dependentes', authenticateToken, (req, res) => {
    const { colaborador_id, nome, cpf, data_nascimento, grau_parentesco } = req.body;
    db.run('INSERT INTO dependentes (colaborador_id, nome, cpf, data_nascimento, grau_parentesco) VALUES (?, ?, ?, ?, ?)',
        [colaborador_id, nome, cpf, data_nascimento, grau_parentesco || 'Dependente'], function(err) {
            if (err) return res.status(400).json({ error: err.message });
            res.status(201).json({ id: this.lastID });
        });
});
app.put('/api/dependentes/:id', authenticateToken, (req, res) => {
    const { nome, cpf, data_nascimento, grau_parentesco } = req.body;
    const query = `UPDATE dependentes SET nome = COALESCE(?, nome), cpf = COALESCE(?, cpf), 
                   data_nascimento = COALESCE(?, data_nascimento), grau_parentesco = COALESCE(?, grau_parentesco) 
                   WHERE id = ?`;
    db.run(query, [nome, cpf, data_nascimento, grau_parentesco, req.params.id], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'Ataulizado com sucesso' });
    });
});
app.delete('/api/dependentes/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM dependentes WHERE id = ?', [req.params.id], err => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Excluído com sucesso' });
    });
});

// --- ROTAS DE DOCUMENTOS ---
app.get('/api/colaboradores/:id/documentos', authenticateToken, (req, res) => {
    db.all('SELECT * FROM documentos WHERE colaborador_id = ? ORDER BY tab_name, year, month', [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/documentos', authenticateToken, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    
    const { document_id, colaborador_id, tab_name, document_type, year, month, vencimento, atestado_tipo, atestado_inicio, atestado_fim, assinafy_status } = req.body;
    const file_path = req.file.path;
    let file_name = req.file.originalname;
    try { file_name = Buffer.from(file_name, 'latin1').toString('utf8'); } catch (e) {}

    let checkSql = '';
    let params = [];
    if (document_id) {
        checkSql = 'SELECT id, file_path FROM documentos WHERE id = ?';
        params = [document_id];
    } else {
        checkSql = 'SELECT id, file_path FROM documentos WHERE colaborador_id = ? AND tab_name = ? AND document_type = ?' 
            + (year ? ' AND year = ?' : ' AND year IS NULL') 
            + (month ? ' AND month = ?' : ' AND month IS NULL');
        params = [colaborador_id, tab_name, document_type];
        if (year) params.push(year);
        if (month) params.push(month);
    }

    db.get(checkSql, params, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Abas que permitem múltiplos arquivos (histórico cumulativo)
        const abasMultiplas = ['Advertências', 'Multas', 'Atestados', 'Boletim de ocorrência', 'Pagamentos', 'Terapia'];
        // Se force document_id explicit, treat as overwrite
        const isMultiplo = !document_id && abasMultiplas.includes(tab_name);

        if (row && !isMultiplo) {
            // Se já existe e NÃO é aba de histórico (ou se é explicit update), atualiza
            if (fs.existsSync(row.file_path) && row.file_path !== file_path) {
                try { fs.unlinkSync(row.file_path); } catch(e) {}
            }
            
            let setClause = 'file_name = ?, file_path = ?, upload_date = CURRENT_TIMESTAMP, vencimento = ?, atestado_tipo = ?, atestado_inicio = ?, atestado_fim = ?';
            const baseParams = [file_name, file_path, vencimento || null, atestado_tipo || null, atestado_inicio || null, atestado_fim || null];
            
            if (assinafy_status) {
                setClause += ', assinafy_status = ?';
                baseParams.push(assinafy_status);
            }
            
            db.run(`UPDATE documentos SET ${setClause} WHERE id = ?`,
                [...baseParams, row.id], function(updateErr) {
                    if (updateErr) return res.status(500).json({ error: updateErr.message });
                    
                    // Sincronizar com foto de perfil se for na aba "Fotos"
                    if (tab_name === 'Fotos' && ['.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(file_path).toLowerCase())) {
                        db.run("UPDATE colaboradores SET foto_path = ? WHERE id = ?", [file_path, colaborador_id]);
                    }

                    // --- ESPELHAMENTO ONEDRIVE (API) ---
                    if (onedrive && tab_name !== 'ASO' && !(tab_name === 'Advertências' && assinafy_status !== 'Assinado')) {
                        (async () => {
                            try {
                                const onedriveBasePath = process.env.ONEDRIVE_BASE_PATH || "RH/1.Colaboradores/Sistema";
                                const safeColab = formatarNome(req.body.colaborador_nome || "DESCONHECIDO");
                                const safeTab = formatarPasta(tab_name).toUpperCase();
                                const parentDir = `${onedriveBasePath}/${safeColab}/${safeTab}`;
                                let targetDir = parentDir;
                                if (year && year !== 'null' && year !== 'undefined' && year !== '') targetDir += `/${year.replace(/[^0-9]/g, '')}`;
                                
                                if (targetDir !== parentDir) {
                                    await onedrive.ensurePath(parentDir); // garante /AVALIACAO
                                }
                                await onedrive.ensurePath(targetDir); // garante /AVALIACAO/2026

                                const fileBuffer = fs.readFileSync(file_path);
                                // Para Atestados usa o custom_name exato; outros usam file_name do multer
                                let cloudFileName = file_name;
                                if (tab_name === 'Atestados' && req.body.custom_name) {
                                    cloudFileName = `${req.body.custom_name}.pdf`;
                                } else if (tab_name !== 'AVALIACAO') {
                                    const safeColabInline = formatarNome(req.body.colaborador_nome || "DESCONHECIDO");
                                    const docYear = year && year !== 'null' ? String(year).replace(/[^0-9]/g, '') : String(new Date().getFullYear());
                                    cloudFileName = `${formatarPasta(document_type || tab_name).replace(/\s+/g, '_')}_${docYear}_${safeColabInline}.pdf`;
                                }
                                await onedrive.uploadToOneDrive(targetDir, cloudFileName, fileBuffer);
                                console.log(`[OneDrive] Upload OK: ${cloudFileName}`);
                            } catch (e) { console.error("Erro async OneDrive (update):", e.message); }
                        })();
                    }

                    res.json({ message: 'Documento atualizado', id: row.id, file_path });
                });
        } else {
            // Se é aba de histórico OU não existia, insere novo registro
            // Para atestados com cloud_name: salvar o nome final limpo diretamente
            const fileNameToStore = (tab_name === 'Atestados' && req.body.cloud_name)
                ? req.body.cloud_name
                : file_name;
            db.run(`INSERT INTO documentos (colaborador_id, tab_name, document_type, file_name, file_path, year, month, vencimento, atestado_tipo, atestado_inicio, atestado_fim) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [colaborador_id, tab_name, document_type, fileNameToStore, file_path, year || null, month || null, vencimento || null, atestado_tipo || null, atestado_inicio || null, atestado_fim || null],
                function(insertErr) {
                    if (insertErr) return res.status(500).json({ error: insertErr.message });

                    // Sincronizar com foto de perfil se for na aba "Fotos"
                    if (tab_name === 'Fotos' && ['.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(file_path).toLowerCase())) {
                        db.run("UPDATE colaboradores SET foto_path = ? WHERE id = ?", [file_path, colaborador_id]);
                    }

                    // --- ESPELHAMENTO ONEDRIVE ---
                    // Usa a mesma lógica do force-onedrive-sync (comprovada) com o ID real do doc
                    const newDocId = this.lastID;
                    if (tab_name !== 'ASO' && !(tab_name === 'Advertências' && req.body.assinafy_status !== 'Assinado')) {
                        setImmediate(() => uploadDocToOneDrive(newDocId));
                    }

                    // --- ATUALIZA STATUS PARA AFASTADO SE ATESTADO VIGENTE ---
                    if (tab_name === 'Atestados' && atestado_tipo === 'dias' && atestado_inicio && atestado_fim) {
                        const today = new Date().toISOString().split('T')[0];
                        if (today >= atestado_inicio && today <= atestado_fim) {
                            db.run("UPDATE colaboradores SET status = 'Afastado' WHERE id = ?", [colaborador_id]);
                        }
                    }

                    res.status(201).json({ message: 'Documento salvo', id: newDocId, file_path });
                });
        }
    });
});

app.put('/api/documentos/:id/vencimento', authenticateToken, (req, res) => {
    const { vencimento } = req.body;
    const id = req.params.id;
    console.log(`Atualizando vencimento do documento ${id} para: ${vencimento}`);
    
    db.run('UPDATE documentos SET vencimento = ? WHERE id = ?', [vencimento, id], function(err) {
        if (err) {
            console.error("Erro ao atualizar vencimento:", err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Vencimento atualizado com sucesso' });
    });
});

app.delete('/api/documentos/:id', authenticateToken, (req, res) => {
    db.get('SELECT file_path FROM documentos WHERE id = ?', [req.params.id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Documento não encontrado' });
        
        if (fs.existsSync(row.file_path)) {
            try { fs.unlinkSync(row.file_path); } catch(e) {}
        }
        
        db.run('DELETE FROM documentos WHERE id = ?', [req.params.id], deleteErr => {
            if (deleteErr) return res.status(500).json({ error: deleteErr.message });
            res.json({ message: 'Documento excluído' });
        });
    });
});

app.get('/api/documentos/download/:id', authenticateToken, (req, res) => {
    db.get('SELECT * FROM documentos WHERE id = ?', [req.params.id], async (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Documento não encontrado' });

        let pathLocal = row.signed_file_path; // Tentar assinado local primeiro
        
        // Se existe fisicamente (.pfx concluído)
        if (pathLocal && fs.existsSync(pathLocal)) {
            return res.download(pathLocal, row.file_name || 'documento.pdf');
        }

        // Se NAO tem assinado local (.pfx vazio ou excluído), mas tem Assinafy (colaborador assinou), tentar buscar da Assinafy
        if (row.assinafy_id) {
            try {
                const r = await fetch(`https://api.assinafy.com.br/v1/documents/${row.assinafy_id}`, { headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey, 'Accept': 'application/json' } });
                if (r.ok) {
                    const data = await r.json();
                    const signedUrl = extractSignedUrl(data?.data || data);
                    if (signedUrl) {
                        try {
                            if (!signedUrl.includes('assinafy.com.br')) {
                                return res.redirect(signedUrl);
                            } else {
                                const dl = await fetch(signedUrl, { headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey } });
                                if (dl.ok) {
                                    const arrayBuffer = await dl.arrayBuffer();
                                    let finalBuf = Buffer.from(arrayBuffer);
                                    const signPdfPfx = require('./sign_pdf_pfx');
                                    if (signPdfPfx.verificarDisponibilidade().disponivel) {
                                        try { finalBuf = await signPdfPfx.assinarPDF(finalBuf, { motivo: 'Assinado eletronicamente pela empresa', nome: 'America Rental Equipamentos Ltda' }); } catch(e) { console.error('PFX PROXY ERR:', e.message); try{ db.run("INSERT INTO system_logs (msg) VALUES (?)", ['PFX PROXY ERR ' + String(e.message)]); }catch(z){} }
                                    }
                                    res.setHeader('Content-Type', 'application/pdf');
                                    return res.send(finalBuf);
                                }
                            }
                        } catch(err) { }
                    }
                }
            } catch(e) { console.warn('Proxy Assinafy erro:', e.message); }
        }

        // Fallback final: Devolve o arquivo original NÃO ASSINADO
        pathLocal = row.file_path;
        if (pathLocal && fs.existsSync(pathLocal)) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(row.file_name || 'documento.pdf')}"`);
            return fs.createReadStream(pathLocal).pipe(res);
        }

        return res.status(404).json({ error: 'Arquivo físico não encontrado no servidor.' });
    });
});



// Rota para obter INFO de um documento (sem arquivo)
app.get('/api/documentos/info/:id', authenticateToken, (req, res) => {
    db.get('SELECT id, file_name, document_type, assinafy_status, assinafy_id, signed_file_path, tab_name FROM documentos WHERE id = ?',
        [req.params.id], (err, row) => {
            if (err || !row) return res.status(404).json({ error: 'Documento não encontrado' });
            res.json(row);
        });
});

// Rota para VISUALIZAR inline no browser (sem forçar download)
app.get('/api/documentos/view/:id', authenticateToken, (req, res) => {
    db.get('SELECT * FROM documentos WHERE id = ?', [req.params.id], async (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Documento não encontrado' });

        let pathLocal = row.signed_file_path; // Tentar assinado local primeiro
        
        // Se existe fisicamente (.pfx concluído)
        if (pathLocal && fs.existsSync(pathLocal)) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(row.file_name || 'documento.pdf')}"`);
            return fs.createReadStream(pathLocal).pipe(res);
        }

        // Se NAO tem assinado local (.pfx vazio ou excluído), mas tem Assinafy (colaborador assinou), tentar buscar da Assinafy
        if (row.assinafy_id) {
            try {
                const r = await fetch(`https://api.assinafy.com.br/v1/documents/${row.assinafy_id}`, { headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey, 'Accept': 'application/json' } });
                if (r.ok) {
                    const data = await r.json();
                    const signedUrl = extractSignedUrl(data?.data || data);
                    if (signedUrl) {
                        try {
                            if (!signedUrl.includes('assinafy.com.br')) {
                                return res.redirect(signedUrl);
                            } else {
                                const dl = await fetch(signedUrl, { headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey } });
                                if (dl.ok) {
                                    const arrayBuffer = await dl.arrayBuffer();
                                    let finalBuf = Buffer.from(arrayBuffer);
                                    try {
                                        const signPdfPfx = require('./sign_pdf_pfx');
                                        if (signPdfPfx.verificarDisponibilidade().disponivel) {
                                            finalBuf = await signPdfPfx.assinarPDF(finalBuf, { motivo: 'Assinado eletronicamente pela empresa', nome: 'America Rental Equipamentos Ltda' });
                                        }
                                    } catch(e) { console.error('PFX PROXY ERR:', e.message); try{ db.run("INSERT INTO system_logs (msg) VALUES (?)", ['PFX PROXY ERR ' + String(e.message)]); }catch(z){} }
                                    res.setHeader('Content-Type', 'application/pdf');
                                    return res.send(finalBuf);
                                }
                            }
                        } catch(err) { }
                    }
                }
            } catch(e) { console.warn('Proxy Assinafy erro:', e.message); }
        }

        // Fallback final: Devolve o arquivo original NÃO ASSINADO
        pathLocal = row.file_path;
        if (pathLocal && fs.existsSync(pathLocal)) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(row.file_name || 'documento.pdf')}"`);
            return fs.createReadStream(pathLocal).pipe(res);
        }

        return res.status(404).json({ error: 'Arquivo físico não encontrado no servidor.' });
    });
});



// ============================================
// ROTAS DE APOIO (CARGOS E DEPARTAMENTOS)
// ============================================

// Cargos
app.get('/api/cargos', authenticateToken, (req, res) => {
    db.all("SELECT * FROM cargos ORDER BY nome ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/cargos', authenticateToken, (req, res) => {
    const { nome, documentos_obrigatorios, departamento } = req.body;
    db.run("INSERT INTO cargos (nome, documentos_obrigatorios, departamento) VALUES (?, ?, ?)", 
        [nome, documentos_obrigatorios || "", departamento || ""], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.status(201).json({ id: this.lastID, nome });
    });
});

app.put('/api/cargos/:id', authenticateToken, (req, res) => {
    const { nome, documentos_obrigatorios, departamento } = req.body;
    console.log(`Recebida alteração para cargo ${req.params.id}:`, { nome, documentos_obrigatorios, departamento });

    db.get("SELECT nome FROM cargos WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        
        let query = "UPDATE cargos SET documentos_obrigatorios = ?, departamento = ?";
        let params = [documentos_obrigatorios || "", departamento || ""];
        
        if (row && row.nome.trim().toUpperCase() !== 'MOTORISTA') {
            query += ", nome = ?";
            params.push(nome.trim());
        }
        
        query += " WHERE id = ?";
        params.push(req.params.id);
        
        console.log("Executando query cargo:", query, params);
        
        db.run(query, params, function(updateErr) {
            if (updateErr) {
                console.error("Erro no UPDATE cargo:", updateErr);
                return res.status(500).json({ error: updateErr.message });
            }
            console.log("Cargo atualizado no banco. Rows affected:", this.changes);
            res.json({ message: 'Cargo atualizado com sucesso' });
        });
    });
});

app.delete('/api/cargos/:id', authenticateToken, (req, res) => {
    db.get("SELECT nome FROM cargos WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row && row.nome.trim().toUpperCase() === 'MOTORISTA') {
            return res.status(403).json({ error: 'O cargo Motorista é fixo e não pode ser apagado do sistema.' });
        }
        db.serialize(() => {
            db.run("DELETE FROM cargo_documentos WHERE cargo_id = ?", [req.params.id]);
            db.run("DELETE FROM cargos WHERE id = ?", [req.params.id], function(delErr) {
                if (delErr) return res.status(500).json({ error: delErr.message });
                res.json({ message: 'Cargo removido' });
            });
        });
    });
});

// --- CARGO DOCUMENTOS (join table) ---

// Listar documentos de um cargo
app.get('/api/cargos/:id/documentos', authenticateToken, (req, res) => {
    db.all("SELECT documento FROM cargo_documentos WHERE cargo_id = ? ORDER BY documento ASC",
        [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => r.documento));
    });
});

// Adicionar um documento a um cargo (idempotente - INSERT OR IGNORE)
app.post('/api/cargos/:id/documentos', authenticateToken, (req, res) => {
    const { documento } = req.body;
    if (!documento) return res.status(400).json({ error: 'documento obrigatório' });
    db.run("INSERT OR IGNORE INTO cargo_documentos (cargo_id, documento) VALUES (?, ?)",
        [req.params.id, documento], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ok: true, added: this.changes > 0 });
    });
});

// Remover um documento de um cargo
app.delete('/api/cargos/:id/documentos', authenticateToken, (req, res) => {
    const { documento } = req.body;
    if (!documento) return res.status(400).json({ error: 'documento obrigatório' });
    db.run("DELETE FROM cargo_documentos WHERE cargo_id = ? AND documento = ?",
        [req.params.id, documento], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ok: true, removed: this.changes > 0 });
    });
});

// Departamentos
app.get('/api/departamentos', authenticateToken, (req, res) => {
    db.all("SELECT * FROM departamentos ORDER BY nome ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/departamentos', authenticateToken, (req, res) => {
    db.run("INSERT INTO departamentos (nome) VALUES (?)", [req.body.nome], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.status(201).json({ id: this.lastID, nome: req.body.nome });
    });
});

app.put('/api/departamentos/:id', authenticateToken, (req, res) => {
    db.run("UPDATE departamentos SET nome = ? WHERE id = ?", [req.body.nome.trim(), req.params.id], function(updateErr) {
        if (updateErr) return res.status(500).json({ error: updateErr.message });
        res.json({ message: 'Departamento atualizado com sucesso' });
    });
});

app.delete('/api/departamentos/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM departamentos WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Departamento removido' });
    });
});

// --- CURSOS DE FACULDADE ---
app.get('/api/cursos-faculdade', authenticateToken, (req, res) => {
    db.all("SELECT * FROM cursos_faculdade ORDER BY nome_curso ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/cursos-faculdade', authenticateToken, (req, res) => {
    const { nome_curso, instituicao, tempo_curso, valor_mensalidade, data_inicio, data_termino_prevista } = req.body;
    db.run(`INSERT INTO cursos_faculdade (nome_curso, instituicao, tempo_curso, valor_mensalidade, data_inicio, data_termino_prevista) 
            VALUES (?, ?, ?, ?, ?, ?)`, 
        [nome_curso, instituicao, tempo_curso, valor_mensalidade || 0, data_inicio, data_termino_prevista], 
        function(err) {
            if (err) return res.status(400).json({ error: err.message });
            res.status(201).json({ id: this.lastID, ...req.body });
        }
    );
});

app.put('/api/cursos-faculdade/:id', authenticateToken, (req, res) => {
    const { nome_curso, instituicao, tempo_curso, valor_mensalidade, data_inicio, data_termino_prevista } = req.body;
    db.run(`UPDATE cursos_faculdade SET nome_curso = ?, instituicao = ?, tempo_curso = ?, valor_mensalidade = ?, data_inicio = ?, data_termino_prevista = ? 
            WHERE id = ?`, 
        [nome_curso, instituicao, tempo_curso, valor_mensalidade || 0, data_inicio, data_termino_prevista, req.params.id], 
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Curso atualizado com sucesso' });
        }
    );
});

app.delete('/api/cursos-faculdade/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM cursos_faculdade WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Curso removido' });
    });
});

// === ADMISSAO ASSINATURAS: Rastreamento por colaborador/gerador ===
db.run(`CREATE TABLE IF NOT EXISTS admissao_assinaturas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    colaborador_id INTEGER NOT NULL,
    gerador_id INTEGER,
    nome_documento TEXT NOT NULL,
    assinafy_id TEXT,
    assinafy_status TEXT DEFAULT 'Pendente',
    assinafy_url TEXT,
    signed_file_path TEXT,
    enviado_em TEXT,
    assinado_em TEXT,
    UNIQUE(colaborador_id, nome_documento)
)`);

// GET: buscar assinaturas de um colaborador
app.get('/api/admissao-assinaturas/:colaborador_id', authenticateToken, (req, res) => {
    db.all(`
        SELECT aa.*,
               d.assinafy_status  AS doc_assinafy_status,
               d.signed_file_path AS doc_signed_file_path,
               d.id               AS documento_id
        FROM admissao_assinaturas aa
        LEFT JOIN documentos d ON d.assinafy_id = aa.assinafy_id AND d.colaborador_id = aa.colaborador_id
        WHERE aa.colaborador_id = ?
    `, [req.params.colaborador_id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // Sincroniza status em tempo real: se documentos já está Assinado mas admissao ainda Pendente
        const toUpdate = (rows || []).filter(r =>
            r.doc_assinafy_status === 'Assinado' && r.assinafy_status !== 'Assinado'
        );
        toUpdate.forEach(r => {
            db.run(
                `UPDATE admissao_assinaturas SET assinafy_status='Assinado', assinado_em=CURRENT_TIMESTAMP, signed_file_path=COALESCE(signed_file_path,?) WHERE id=?`,
                [r.doc_signed_file_path, r.id]
            );
        });

        // Retorna com status corrigido
        const result = (rows || []).map(r => ({
            ...r,
            assinafy_status: (r.doc_assinafy_status === 'Assinado' ? 'Assinado' : r.assinafy_status) || r.assinafy_status,
            signed_file_path: r.signed_file_path || r.doc_signed_file_path
        }));

        res.json(result);
    });
});

// ─── Helper: Gera HTML completo com layout do gerador ────────────────────────
function buildGeradoresHtml(gerador, colaborador, baseUrl) {
    const dataAtual = new Date();
    const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    const mesesCap = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

    const mapping = {
        BASE_URL: baseUrl,
        NOME_COMPLETO: colaborador.nome_completo || '',
        CPF: colaborador.cpf || '',
        RG: (colaborador.rg || '') + (colaborador.rg_orgao ? ` ${colaborador.rg_orgao}` : ''),
        RG_NUM: colaborador.rg || '',
        NACIONALIDADE: colaborador.nacionalidade || 'Brasileiro(a)',
        ESTADO_CIVIL: colaborador.estado_civil || '',
        CARGO: colaborador.cargo || '',
        DEPARTAMENTO: colaborador.departamento || '',
        ENDERECO: colaborador.endereco || '',
        DATA_ADMISSAO: colaborador.data_admissao ? new Date(colaborador.data_admissao + 'T12:00:00').toLocaleDateString('pt-BR') : '',
        PIS: colaborador.pis || '',
        CTPS: colaborador.ctps_numero || '',
        DATA_HOJE: `${dataAtual.getDate()} de ${mesesCap[dataAtual.getMonth()]} de ${dataAtual.getFullYear()}`,
        DIA: dataAtual.getDate(),
        MES: mesesCap[dataAtual.getMonth()],
        ANO: dataAtual.getFullYear(),
        CIDADE: 'Guarulhos',
        TELEFONE: colaborador.telefone || '',
        EMAIL: colaborador.email || '',
        SALARIO: colaborador.salario ? `R$ ${parseFloat(colaborador.salario).toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : '---',
        CHAVES: '',
        INSTITUICAO: '---', CURSO: '---', DURACAO: '---', MENSALIDADE: '---'
    };

    let conteudo = gerador.conteudo || '';
    Object.keys(mapping).forEach(key => {
        conteudo = conteudo.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), mapping[key]);
    });

    // Substituir campo texto de data Guarulhos por data real
    const dataFormatada = `Guarulhos, ${String(dataAtual.getDate()).padStart(2,'0')} de ${meses[dataAtual.getMonth()]} de ${dataAtual.getFullYear()}.`;
    conteudo = conteudo
        .replace(/Guarulhos,\s*_{3,}.*?de\s*_{3,}.*?de\s*202_{3,}\.?/g, dataFormatada)
        .replace(/AMERICA RENTAL EQUIPAMENTOS LTDA/g, '<b>AMERICA RENTAL EQUIPAMENTOS LTDA</b>');

    const logoUrl = `${baseUrl}/assets/logo-header.png`;

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #1e293b; }
  @page { size: A4; margin: 1.8cm; }
  .logo-banner img { width: 100%; display: block; margin-bottom: 12px; }
  h1.doc-title { text-align: center; font-size: 13pt; text-transform: uppercase; margin: 6px 0; }
  .colab-header { margin-top: 8px; font-size: 10pt; }
  .colab-box { border: 1px solid #000; padding: 8px; margin-top: 6px; font-size: 9pt; line-height: 1.5; }
  .colab-row { display: flex; gap: 2rem; }
  .doc-body { margin-top: 12px; text-align: justify; font-size: 10pt; line-height: 1.5; }
  .doc-body p { margin: 2px 0; }
  .doc-body li { margin: 1px 0; }
  .footer { margin-top: 18px; }
  .footer-date { font-weight: 700; font-size: 10pt; margin-bottom: 20px; }
  .sigs { display: flex; justify-content: space-between; margin-top: 30px; }
  .sig-block { text-align: center; width: 45%; }
  .sig-line { border-top: 1.5px solid #000; padding-top: 4px; font-weight: 700; font-size: 9pt; }
  .sig-sub { font-size: 8pt; color: #555; }
  .company-logo img { height: 22px; margin: 0 auto 3px; display: block; }
  .company-info { font-size: 6pt; font-weight: 700; line-height: 1.2; }
</style>
</head>
<body>
  <div class="logo-banner"><img src="${logoUrl}" alt="Logo America Rental"></div>

  <h1 class="doc-title">${gerador.nome}</h1>

  <div class="colab-header"><b>COLABORADOR:</b> ${colaborador.nome_completo}</div>

  <div class="colab-box">
    <div style="font-weight:700; font-size:8pt; margin-bottom:4px;">DADOS COLABORADOR:</div>
    <div class="colab-row">
      <span>CPF: <b>${colaborador.cpf || '---'}</b></span>
      <span>ADMISSÃO: <b>${mapping.DATA_ADMISSAO || '---'}</b></span>
    </div>
    <div>ENDEREÇO: ${colaborador.endereco || '---'}</div>
    <div class="colab-row">
      <span>CARGO: ${colaborador.cargo || '---'}</span>
      <span>SALÁRIO: ${mapping.SALARIO}</span>
    </div>
    <div class="colab-row">
      <span>CELULAR: ${colaborador.telefone || '---'}</span>
      <span>E-MAIL: ${colaborador.email || '---'}</span>
    </div>
  </div>

  <div class="doc-body">${conteudo}</div>

  <div class="footer">
    <div class="footer-date">${dataFormatada}</div>
  </div>
</body></html>`;
}

// GET: Preview do documento gerado como PDF (com layout completo)
app.get('/api/geradores/:id/preview-pdf/:colaborador_id', authenticateToken, async (req, res) => {
    const { id, colaborador_id } = req.params;
    try {
        const htmlPdf = require('html-pdf-node');
        const gerador = await new Promise((resolve, reject) =>
            db.get('SELECT * FROM geradores WHERE id = ?', [id], (err, row) => err ? reject(err) : resolve(row))
        );
        if (!gerador) return res.status(404).json({ error: 'Gerador não encontrado' });

        const colaborador = await new Promise((resolve, reject) =>
            db.get('SELECT * FROM colaboradores WHERE id = ?', [colaborador_id], (err, row) => err ? reject(err) : resolve(row))
        );
        if (!colaborador) return res.status(404).json({ error: 'Colaborador não encontrado' });

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const html = buildGeradoresHtml(gerador, colaborador, baseUrl);

        const pdfBuffer = await htmlPdf.generatePdf(
            { content: html },
            { format: 'A4', margin: { top: '1.8cm', bottom: '1.8cm', left: '1.8cm', right: '1.8cm' },
              printBackground: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
        );

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(gerador.nome)}.pdf"`);
        res.send(pdfBuffer);
    } catch(e) {
        console.error('[PREVIEW-PDF]', e.message);
        res.status(500).json({ error: e.message });
    }
});

// POST batch: gerar PDFs dos geradores selecionados e enviar para assinatura via Assinafy
app.post('/api/admissao-assinaturas/enviar-lote', authenticateToken, async (req, res) => {
    const { colaborador_id, geradores_ids } = req.body;
    if (!colaborador_id || !Array.isArray(geradores_ids) || geradores_ids.length === 0) {
        return res.status(400).json({ error: 'colaborador_id e geradores_ids são obrigatórios' });
    }

    const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
    const novoProcesso = require('./novo_processo_assinafy');

    const colab = await new Promise((resolve, reject) =>
        db.get('SELECT * FROM colaboradores WHERE id = ?', [colaborador_id], (err, row) => err ? reject(err) : resolve(row))
    );
    if (!colab) return res.status(404).json({ error: 'Colaborador não encontrado' });
    if (!colab.email) return res.status(400).json({ error: 'E-mail do colaborador não está cadastrado.' });

    // --- Função para processar UM gerador ---
    const processarGerador = async (geradorId) => {
        const gerador = await new Promise((resolve, reject) =>
            db.get('SELECT * FROM geradores WHERE id = ?', [geradorId], (err, row) => err ? reject(err) : resolve(row))
        );
        if (!gerador) return { id: geradorId, erro: 'Gerador não encontrado' };

        let filePath;
        if (gerador.tipo === 'pdf' && gerador.arquivo_pdf && fs.existsSync(gerador.arquivo_pdf)) {
            filePath = gerador.arquivo_pdf;
        } else {
            // Gerar PDF com layout completo usando html-pdf-node
            const htmlPdf = require('html-pdf-node');
            const baseUrl = `${process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000'}`;
            const html = buildGeradoresHtml(gerador, colab, baseUrl);
            const pdfBuffer = await htmlPdf.generatePdf(
                { content: html },
                { format: 'A4',
                  margin: { top: '1.8cm', bottom: '1.8cm', left: '1.8cm', right: '1.8cm' },
                  printBackground: true,
                  args: ['--no-sandbox', '--disable-setuid-sandbox'] }
            );

            const tmpDir = path.join(BASE_PATH, '_tmp_gerados');
            if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
            filePath = path.join(tmpDir, `${Date.now()}_${Math.random().toString(36).slice(2)}_${geradorId}_${colab.id}.pdf`);
            fs.writeFileSync(filePath, pdfBuffer);
        }

        // A assinatura da empresa via certificado digital (PFX) é feita APÓS
        // o colaborador assinar no Assinafy, para que ambas as assinaturas
        // apareçam válidas no validador gov.br.


        const existente = await new Promise((resolve, reject) =>
            db.get('SELECT * FROM admissao_assinaturas WHERE colaborador_id = ? AND nome_documento = ?',
                [colaborador_id, gerador.nome], (err, row) => err ? reject(err) : resolve(row))
        );

        const docId = await new Promise((resolve, reject) =>
            db.run(
                `INSERT INTO documentos (colaborador_id, tab_name, document_type, file_path, file_name, assinafy_status) VALUES (?, 'CONTRATOS', ?, ?, ?, 'Pendente')`,
                [colaborador_id, gerador.nome, filePath, path.basename(filePath)],
                function(err) { err ? reject(err) : resolve(this.lastID); }
            )
        );

        const resultado = await novoProcesso.enviarDocumentoParaAssinafy(docId, colaborador_id);

        if (existente) {
            db.run(`UPDATE admissao_assinaturas SET assinafy_id=?, assinafy_status='Pendente', assinafy_url=?, enviado_em=CURRENT_TIMESTAMP WHERE id=?`,
                [resultado.assinafyDocId, resultado.urlAssinatura, existente.id]);
        } else {
            db.run(`INSERT INTO admissao_assinaturas (colaborador_id, gerador_id, nome_documento, assinafy_id, assinafy_status, assinafy_url, enviado_em) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP)`,
                [colaborador_id, geradorId, gerador.nome, resultado.assinafyDocId, 'Pendente', resultado.urlAssinatura]);
        }

        return { id: geradorId, nome: gerador.nome, ok: true, url: resultado.urlAssinatura };
    };

    // --- Envio em PARALELO: todos os documentos ao mesmo tempo ---
    const resultados = await Promise.all(
        geradores_ids.map(id =>
            processarGerador(id).catch(e => {
                console.error(`[ADMISSAO-ASSINATURA] Erro no gerador ${id}:`, e.message);
                return { id, erro: e.message };
            })
        )
    );

    res.json({ ok: true, resultados });
});


// GET: baixar PDF assinado de admissão
app.get('/api/admissao-assinaturas/:id/download', authenticateToken, async (req, res) => {
    try {
        const row = await new Promise((resolve, reject) =>
            db.get('SELECT * FROM admissao_assinaturas WHERE id = ?', [req.params.id], (err, r) => err ? reject(err) : resolve(r))
        );
        if (!row) return res.status(404).json({ error: 'Registro não encontrado' });

        // 1. Arquivo local como fonte primária
        let pathToFile = row.signed_file_path;

        if (pathToFile && fs.existsSync(pathToFile)) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(row.nome_documento || 'documento')}_Assinado.pdf"`);
            return fs.createReadStream(pathToFile).pipe(res);
        }

        // 2. Se local não existe, tenta Assinafy (redirecionando diretamente)
        if (row.assinafy_id) {
            try {
                const r = await fetch(`https://api.assinafy.com.br/v1/documents/${row.assinafy_id}`,
                    { headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey, 'Accept': 'application/json' } });
                if (r.ok) {
                    const data = await r.json();
                    const signedUrl = extractSignedUrl(data?.data || data);
                    if (signedUrl) {
                        try {
                            if (!signedUrl.includes('assinafy.com.br')) {
                                return res.redirect(signedUrl);
                            } else {
                                const dl = await fetch(signedUrl, { headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey } });
                                if (dl.ok) {
                                    const arrayBuffer = await dl.arrayBuffer();
                                    res.setHeader('Content-Type', 'application/pdf');
                                    return res.send(Buffer.from(arrayBuffer));
                                } else {
                                    return res.redirect(signedUrl);
                                }
                            }
                        } catch(err) { return res.redirect(signedUrl); }
                    }
                }
            } catch(e) {
                console.warn('[DOWNLOAD-ADMISSAO] Falha proxy Assinafy:', e.message);
            }
        }

        return res.status(404).json({ error: 'Arquivo assinado não encontrado no servidor.' });
    } catch(e) {
        if (!res.headersSent) res.status(500).json({ error: e.message });
    }
});

/**
 * POST /api/admissao-assinaturas/:id/assinar-certificado
 * Aplica o Certificado Digital A1 da empresa no PDF já assinado pelo colaborador.
 * Deve ser chamado APÓS o colaborador assinar no Assinafy (status = 'Assinado').
 */
app.post('/api/admissao-assinaturas/:id/assinar-certificado', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const doc = await new Promise((resolve, reject) =>
            db.get('SELECT * FROM admissao_assinaturas WHERE id = ?', [id], (err, row) => err ? reject(err) : resolve(row))
        );
        if (!doc) return res.status(404).json({ ok: false, error: 'Documento não encontrado.' });
        if (doc.assinafy_status !== 'Assinado') return res.status(400).json({ ok: false, error: `Documento ainda não foi assinado pelo colaborador (status: ${doc.assinafy_status}).` });
        if (doc.certificado_assinado_em) return res.json({ ok: true, ja_assinado: true, mensagem: 'Certificado digital já foi aplicado anteriormente.' });

        // Verificar disponibilidade do certificado
        const pfxDisp = signPdfPfx.verificarDisponibilidade();
        if (!pfxDisp.disponivel) return res.status(400).json({ ok: false, error: `Certificado digital não configurado: ${pfxDisp.motivo}` });

        // Buscar o PDF assinado — primeiro local, depois Assinafy
        let pdfBuffer = null;
        const localPath = doc.signed_file_path || doc.file_path;
        if (localPath && fs.existsSync(localPath)) {
            pdfBuffer = fs.readFileSync(localPath);
            console.log(`[CERT-POST] Usando arquivo local: ${localPath}`);
        } else if (doc.assinafy_id) {
            // Baixar do Assinafy
            console.log(`[CERT-POST] Baixando PDF do Assinafy (doc_id=${doc.assinafy_id})...`);
            const https = require('https');
            const docInfo = await new Promise((resolve, reject) => {
                const opts = { hostname: 'api.assinafy.com.br', path: `/v1/documents/${doc.assinafy_id}`, method: 'GET',
                    headers: { 'X-Api-Key': 'AxaT-FiXBckHqEYV0s_MtUhLF3pReRz3dX4zVpC173vmjDwzLGHYtDJuQje4-4Pd', 'Accept': 'application/json' } };
                const r = https.request(opts, resp => { const c = []; resp.on('data', d => c.push(d)); resp.on('end', () => resolve(JSON.parse(Buffer.concat(c).toString()))); });
                r.on('error', reject); r.end();
            });
            const docData = docInfo.data || docInfo;
            const signedUrl = docData?.artifacts?.find(a => a.type === 'signed_document')?.url ||
                              docData?.signed_url || docData?.download_url;
            if (!signedUrl) return res.status(400).json({ ok: false, error: 'PDF assinado ainda não disponível no Assinafy.' });

            pdfBuffer = await new Promise((resolve, reject) => {
                https.get(signedUrl, { headers: { 'X-Api-Key': 'AxaT-FiXBckHqEYV0s_MtUhLF3pReRz3dX4zVpC173vmjDwzLGHYtDJuQje4-4Pd' } }, resp => {
                    const chunks = [];
                    resp.on('data', c => chunks.push(c));
                    resp.on('end', () => resolve(Buffer.concat(chunks)));
                }).on('error', reject);
            });
        }
        if (!pdfBuffer) return res.status(400).json({ ok: false, error: 'Não foi possível obter o PDF assinado para aplicar o certificado.' });

        // Aplicar certificado A1 da empresa
        console.log(`[CERT-POST] Aplicando certificado A1 no PDF (${pdfBuffer.length} bytes)...`);
        const pdfAssinado = await signPdfPfx.assinarPDF(pdfBuffer, {
            motivo: `Assinado digitalmente pela empresa America Rental Equipamentos Ltda — Certificado A1`,
            local:  'Brasil',
            nome:   'America Rental Equipamentos Ltda'
        });

        // Salvar PDF final com ambas as assinaturas
        const certPath = (localPath || path.join(BASE_PATH, `_admissao_${id}`)).replace(/(_assinado)?\.pdf$/, '_cert_empresa.pdf');
        fs.writeFileSync(certPath, pdfAssinado);
        console.log(`[CERT-POST] ✅ PDF com certificado salvo: ${certPath} (${pdfAssinado.length} bytes)`);

        // Atualizar banco
        db.run(`UPDATE admissao_assinaturas SET signed_file_path = ?, certificado_assinado_em = CURRENT_TIMESTAMP WHERE id = ?`,
            [certPath, id]);

        res.json({ ok: true, mensagem: 'Certificado digital aplicado com sucesso! Ambas as assinaturas agora aparecem no gov.br.', tamanho: pdfAssinado.length });
    } catch(e) {
        console.error('[CERT-POST] ERRO:', e.message);
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Webhook: atualizar status de assinatura para admissao_assinaturas quando Assinafy notificar
// (já tratado pelo webhook existente que atualiza a tabela documentos - sincronizamos aqui também)
// Adicionando sincronização na tabela admissao_assinaturas via documento atualizado
app.post('/api/admissao-assinaturas/sync-status', authenticateToken, (req, res) => {
    const { assinafy_id, status } = req.body;
    if (!assinafy_id) return res.status(400).json({ error: 'assinafy_id obrigatório' });
    db.run(`UPDATE admissao_assinaturas SET assinafy_status = ?, assinado_em = CASE WHEN ? = 'Assinado' THEN CURRENT_TIMESTAMP ELSE assinado_em END WHERE assinafy_id = ?`,
        [status, status, assinafy_id], function(err) {
            res.json({ ok: true, changes: this.changes });
        });
});

// MIGRATION: adicionar colunas tipo e arquivo_pdf à tabela geradores (se não existirem)
db.run("ALTER TABLE geradores ADD COLUMN tipo TEXT DEFAULT 'html'", () => {});
db.run("ALTER TABLE geradores ADD COLUMN arquivo_pdf TEXT DEFAULT NULL", () => {});
// MIGRATION: coluna para rastrear quando o certificado digital A1 foi aplicado
db.run("ALTER TABLE admissao_assinaturas ADD COLUMN certificado_assinado_em TEXT DEFAULT NULL", () => {});

// --- GERADORES DE DOCUMENTOS ---
app.get('/api/geradores', authenticateToken, (req, res) => {
    db.all("SELECT * FROM geradores ORDER BY nome ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/geradores/:id', authenticateToken, (req, res) => {
    db.get("SELECT * FROM geradores WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Gerador não encontrado' });
        res.json(row);
    });
});

app.post('/api/geradores', authenticateToken, (req, res) => {
    const { nome, conteudo, variaveis } = req.body;
    db.run("INSERT INTO geradores (nome, conteudo, variaveis, tipo) VALUES (?, ?, ?, 'html')", 
        [nome, conteudo, variaveis], function(err) {
            if (err) return res.status(400).json({ error: err.message });
            res.status(201).json({ id: this.lastID, ...req.body });
        });
});

app.put('/api/geradores/:id', authenticateToken, (req, res) => {
    const { nome, conteudo, variaveis } = req.body;
    db.run("UPDATE geradores SET nome = ?, conteudo = ?, variaveis = ? WHERE id = ?", 
        [nome, conteudo, variaveis, req.params.id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Gerador atualizado' });
        });
});

app.delete('/api/geradores/:id', authenticateToken, (req, res) => {
    // Remove arquivo PDF associado se existir
    db.get("SELECT arquivo_pdf FROM geradores WHERE id = ?", [req.params.id], (err, row) => {
        if (row && row.arquivo_pdf && fs.existsSync(row.arquivo_pdf)) {
            try { fs.unlinkSync(row.arquivo_pdf); } catch(e) {}
        }
    });
    db.run("DELETE FROM geradores WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Gerador removido' });
    });
});

// Upload de PDF externo como gerador
const geradorPdfStorage = multer.diskStorage({
    destination: function(req, file, cb) {
        const dir = path.join(BASE_PATH, '_geradores_pdf');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: function(req, file, cb) {
        const ts = Date.now();
        const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `${ts}_${safe}`);
    }
});
const uploadGeradorPdf = multer({ 
    storage: geradorPdfStorage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Apenas arquivos PDF são permitidos'));
    },
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

app.post('/api/geradores/upload-pdf', authenticateToken, uploadGeradorPdf.single('pdf'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    const nome = req.body.nome || path.basename(req.file.originalname, '.pdf');
    const arquivo_pdf = req.file.path;
    db.run("INSERT INTO geradores (nome, conteudo, variaveis, tipo, arquivo_pdf) VALUES (?, '', '', 'pdf', ?)",
        [nome, arquivo_pdf], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, nome, tipo: 'pdf', arquivo_pdf });
        });
});

app.put('/api/geradores/:id/replace-pdf', authenticateToken, uploadGeradorPdf.single('pdf'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    // Remove o arquivo antigo
    db.get("SELECT arquivo_pdf FROM geradores WHERE id = ?", [req.params.id], (err, row) => {
        if (row && row.arquivo_pdf && fs.existsSync(row.arquivo_pdf)) {
            try { fs.unlinkSync(row.arquivo_pdf); } catch(e) {}
        }
        db.run("UPDATE geradores SET arquivo_pdf = ?, nome = ? WHERE id = ?",
            [req.file.path, req.body.nome || row?.nome || 'PDF', req.params.id], function(err2) {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json({ ok: true });
            });
    });
});

// Servir PDF estático dos geradores externos
app.get('/api/geradores/:id/pdf', authenticateToken, (req, res) => {
    db.get("SELECT arquivo_pdf, nome FROM geradores WHERE id = ? AND tipo = 'pdf'", [req.params.id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'PDF não encontrado' });
        if (!fs.existsSync(row.arquivo_pdf)) return res.status(404).json({ error: 'Arquivo PDF não encontrado no disco' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(row.nome)}.pdf"`);
        fs.createReadStream(row.arquivo_pdf).pipe(res);
    });
});


// Endpoint de geração (Substituição de Variáveis)
app.post('/api/geradores/:id/gerar/:colaborador_id', authenticateToken, (req, res) => {
    const { id, colaborador_id } = req.params;
    
    db.get("SELECT * FROM geradores WHERE id = ?", [id], (err, gerador) => {
        if (err || !gerador) return res.status(404).json({ error: 'Gerador não encontrado' });
        
        // Busca o colaborador e tenta cruzar com cursos_faculdade
        const sql = `
            SELECT c.*, f.nome_curso as f_nome, f.instituicao as f_inst, f.tempo_curso as f_tempo, f.valor_mensalidade as f_valor
            FROM colaboradores c
            LEFT JOIN cursos_faculdade f ON c.faculdade_curso_id = f.id
            WHERE c.id = ?
        `;
        
        db.get(sql, [colaborador_id], (err, colaborador) => {
            if (err || !colaborador) return res.status(404).json({ error: 'Colaborador não encontrado' });
            
            // Busca chaves do colaborador
            db.all(`
                SELECT c.nome_chave 
                FROM chaves c 
                JOIN colaborador_chaves cc ON c.id = cc.chave_id 
                WHERE cc.colaborador_id = ?
            `, [colaborador_id], (err, chaves) => {
                const listaChaves = (chaves || []).map(c => c.nome_chave).join('<br>');
                
                let conteudoFinal = gerador.conteudo;
                const dataAtual = new Date();
                const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
                
                const mapping = {
                    'BASE_URL': `${req.protocol}://${req.get('host')}`,
                    'NOME_COMPLETO': colaborador.nome_completo || '',
                    'CPF': colaborador.cpf || '',
                    'RG': (colaborador.rg || '') + (colaborador.rg_orgao ? ` ${colaborador.rg_orgao}` : ''),
                    'RG_NUM': colaborador.rg || '',
                    'NACIONALIDADE': colaborador.nacionalidade || 'Brasileiro(a)',
                    'ESTADO_CIVIL': colaborador.estado_civil || '',
                    'CARGO': colaborador.cargo || '',
                    'DEPARTAMENTO': colaborador.departamento || '',
                    'ENDERECO': colaborador.endereco || '',
                    'DATA_ADMISSAO': colaborador.data_admissao ? new Date(colaborador.data_admissao + 'T12:00:00').toLocaleDateString('pt-BR') : '',
                    'PIS': colaborador.pis || '',
                    'CTPS': colaborador.ctps_numero || '',
                    'DATA_HOJE': `${dataAtual.getDate()} de ${meses[dataAtual.getMonth()]} de ${dataAtual.getFullYear()}`,
                    'DIA': dataAtual.getDate(),
                    'MES': meses[dataAtual.getMonth()],
                    'ANO': dataAtual.getFullYear(),
                    'CIDADE': 'Guarulhos',
                    'TELEFONE': colaborador.telefone || '',
                    'EMAIL': colaborador.email || '',
                    'SALARIO': colaborador.salario ? `R$ ${parseFloat(colaborador.salario).toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : '---',
                    'CHAVES': listaChaves || 'Nenhuma chave cadastrada',
                    // Variáveis de Faculdade
                    'INSTITUICAO': colaborador.f_inst || '---',
                    'CURSO': colaborador.f_nome || '---',
                    'DURACAO': colaborador.f_tempo || '---',
                    'MENSALIDADE': colaborador.f_valor ? `R$ ${parseFloat(colaborador.f_valor).toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : '---'
                };
                
                // Substituição bruta
                Object.keys(mapping).forEach(key => {
                    const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
                    conteudoFinal = conteudoFinal.replace(regex, mapping[key]);
                });
                
                res.json({ 
                    html: conteudoFinal,
                    colaborador: mapping,
                    gerador_nome: gerador.nome
                });
            });
        });
    });
});

// Chaves
app.get('/api/chaves', authenticateToken, (req, res) => {
    db.all("SELECT * FROM chaves ORDER BY nome_chave ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/chaves', authenticateToken, (req, res) => {
    const { nome_chave } = req.body;
    db.run("INSERT INTO chaves (nome_chave) VALUES (?)", [nome_chave], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.status(201).json({ id: this.lastID, nome_chave });
    });
});

app.put('/api/chaves/:id', authenticateToken, (req, res) => {
    const { nome_chave } = req.body;
    db.run("UPDATE chaves SET nome_chave = ? WHERE id = ?", [nome_chave, req.params.id], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'Chave atualizada' });
    });
});

app.delete('/api/chaves/:id', authenticateToken, (req, res) => {
    db.get('SELECT 1 FROM colaboradores WHERE id IN (SELECT colaborador_id FROM colaborador_chaves WHERE chave_id = ?)', [req.params.id], (err, row) => {
        // Por enquanto não temos a tabela de relacionamento, então vamos deletar direto.
        // Se no futuro houver chaves vinculadas, podemos avisar.
        db.run("DELETE FROM chaves WHERE id = ?", [req.params.id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Chave excluída' });
        });
    });
});

// --- ROTAS DE FALTAS ---
app.get('/api/colaboradores/:id/faltas', authenticateToken, (req, res) => {
    db.all('SELECT * FROM faltas WHERE colaborador_id = ? ORDER BY data_falta DESC', [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/faltas', authenticateToken, (req, res) => {
    const { colaborador_id, data_falta, turno, observacao } = req.body;
    if (!colaborador_id || !data_falta) return res.status(400).json({ error: 'colaborador_id e data_falta são obrigatórios.' });
    db.run('INSERT INTO faltas (colaborador_id, data_falta, turno, observacao) VALUES (?, ?, ?, ?)',
        [colaborador_id, data_falta, turno || 'Dia todo', observacao || ''],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, colaborador_id, data_falta, turno: turno || 'Dia todo', observacao: observacao || '' });
        }
    );
});

app.delete('/api/faltas/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM faltas WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

// --- ROTAS DE AVALIAÇÃO ---
app.get('/api/colaboradores/:id/avaliacoes', authenticateToken, (req, res) => {
    db.all('SELECT * FROM avaliacoes WHERE colaborador_id = ? ORDER BY ano DESC, trimestre ASC', [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/avaliacoes', authenticateToken, (req, res) => {
    const { colaborador_id, tipo, ano, trimestre, respostas_json } = req.body;
    if (!colaborador_id || !tipo || !ano || !trimestre) return res.status(400).json({ error: 'colaborador_id, tipo, ano e trimestre são obrigatórios.' });
    
    // Upsert (atualiza se já existir para o mesmo colaborador/ano/trimestre/tipo)
    db.run(`
        INSERT INTO avaliacoes (colaborador_id, tipo, ano, trimestre, respostas_json)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(colaborador_id, ano, trimestre, tipo) 
        DO UPDATE SET respostas_json=excluded.respostas_json, created_at=CURRENT_TIMESTAMP
    `, [colaborador_id, tipo, ano, trimestre, (respostas_json || '{}')], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, changes: this.changes });
    });
});

app.delete('/api/avaliacoes/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM avaliacoes WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Avaliação não encontrada.' });
        res.json({ deleted: this.changes, message: 'Avaliação excluída com sucesso' });
    });
});

// --- ROTAS DE TEMPLATES DE AVALIAÇÃO ---
app.get('/api/avaliacao-templates', authenticateToken, (req, res) => {
    db.all('SELECT * FROM avaliacao_templates ORDER BY tipo, nome', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/avaliacao-templates', authenticateToken, (req, res) => {
    const { nome, tipo, grupo_key, categorias_json } = req.body;
    if (!nome || !tipo || !grupo_key || !categorias_json) return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
    db.run('INSERT INTO avaliacao_templates (nome, tipo, grupo_key, categorias_json) VALUES (?,?,?,?)',
        [nome, tipo, grupo_key, typeof categorias_json === 'string' ? categorias_json : JSON.stringify(categorias_json)],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: 'Template criado com sucesso.' });
        }
    );
});

app.put('/api/avaliacao-templates/:id', authenticateToken, (req, res) => {
    const { nome, tipo, grupo_key, categorias_json } = req.body;
    db.run('UPDATE avaliacao_templates SET nome=?, tipo=?, grupo_key=?, categorias_json=? WHERE id=?',
        [nome, tipo, grupo_key, typeof categorias_json === 'string' ? categorias_json : JSON.stringify(categorias_json), req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ changes: this.changes });
        }
    );
});

app.delete('/api/avaliacao-templates/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM avaliacao_templates WHERE id=?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

// --- ROTA DE ENVIO DE E-MAIL ASO ---
app.post('/api/send-aso-email', authenticateToken, (req, res) => {
    const { colaborador_id, email_to, data_exame, cc } = req.body;
    
    db.get('SELECT * FROM colaboradores WHERE id = ?', [colaborador_id], (err, colab) => {
        if (err || !colab) return res.status(404).json({ error: 'Colaborador não encontrado' });
        
        const logoPath = path.join(__dirname, '..', 'frontend', 'assets', 'logo-header.png');
        const exames = (colab.cargo || '').toLowerCase().includes('motorista') 
            ? 'Audiometria, acuidade visual, E.E.G, E.C.G e Glicemia.' 
            : 'Exame Padrão';

        // Formatar data: YYYY-MM-DD to DD/MM/YYYY
        const [y, m, d] = data_exame.split('-');
        const dataFormatada = `${d}/${m}/${y}`;

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="cid:empresa-logo" style="max-height: 80px;">
                </div>
                <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">Exame Admissional</h2>
                <p>Segue abaixo as informações para a realização do exame Admissional do colaborador que deve comparecer.</p>
                
                <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Data:</strong> ${dataFormatada}</p>
                    <p><strong>Nome:</strong> ${colab.nome_completo}</p>
                    <p><strong>CPF:</strong> ${colab.cpf}</p>
                    <p><strong>Função:</strong> ${colab.cargo || '-'}</p>
                    <p><strong>Departamento:</strong> ${colab.departamento || '-'}</p>
                </div>

                <p><strong>Exames a serem realizados:</strong><br>
                <span style="color: #e67e22; font-weight: bold;">${exames}</span></p>

                <div style="margin-top: 30px; padding: 15px; border: 2px solid #e74c3c; border-radius: 8px; background: #fff5f5; text-align: center;">
                    <p style="color: #c0392b; font-weight: bold; font-size: 1.1rem; margin: 0;">
                        ⚠️ IMPORTANTE:<br>Após o exame ficar pronto, favor enviar o documento por e-mail diretamente para:<br>
                        <span style="font-size: 1.2rem; color: #2c3e50;">rh@americarental.com.br</span>
                    </p>
                </div>

                <p style="margin-top: 30px; font-size: 0.9em; color: #7f8c8d;">Atenciosamente,<br>Equipe de RH - América Rental</p>
            </div>
        `;

        const transporter = nodemailer.createTransport(SMTP_CONFIG);
        const mailOptions = {
            from: `"RH América Rental" <${SMTP_CONFIG.auth.user}>`,
            to: email_to,
            cc: cc || [],
            subject: 'Solicitação de Exame Admissional',
            html: htmlContent,
            attachments: [
                {
                    filename: 'logo.png',
                    path: logoPath,
                    cid: 'empresa-logo'
                }
            ]
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('ERRO NODEMAILER:', error);
                return res.status(500).json({ sucesso: false, error: `Erro SMTP: ${error.message}` });
            }
            
            // Salvar a data de envio e a data agendada no banco de dados
            const hoje = new Date();
            const horas = String(hoje.getHours()).padStart(2, '0');
            const minutos = String(hoje.getMinutes()).padStart(2, '0');
            const dataEnvioStr = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()} - ${horas}h${minutos}m`;
            
            const [y, m, d] = data_exame.split('-');
            const dataAgendadaStr = `${d}/${m}/${y}`;

            db.run('UPDATE colaboradores SET aso_email_enviado = ?, aso_exame_data = ? WHERE id = ?', [dataEnvioStr, dataAgendadaStr, colaborador_id], (err) => {
                if (err) console.error('Erro ao salvar aso_email_enviado/aso_exame_data:', err);
                res.json({ sucesso: true, message: 'E-mail enviado com sucesso', data_envio: dataEnvioStr, data_agendada: dataAgendadaStr });
            });
        });
    });
});

/**
 * Envio de Atestado para a Contabilidade (eSocial)
 */
app.post('/api/send-atestado-contabilidade', authenticateToken, async (req, res) => {
    const { document_id, email_to } = req.body;
    if (!document_id || !email_to) {
        return res.status(400).json({ sucesso: false, error: 'document_id e email_to são obrigatórios.' });
    }

    try {
        const doc = await new Promise((resolve, reject) =>
            db.get('SELECT * FROM documentos WHERE id = ?', [document_id], (err, row) => err ? reject(err) : resolve(row)));
        if (!doc) return res.status(404).json({ sucesso: false, error: 'Documento não encontrado.' });

        const colab = await new Promise((resolve, reject) =>
            db.get('SELECT * FROM colaboradores WHERE id = ?', [doc.colaborador_id], (err, row) => err ? reject(err) : resolve(row)));
        if (!colab) return res.status(404).json({ sucesso: false, error: 'Colaborador não encontrado.' });

        // Verificar se o arquivo existe
        const filePath = path.resolve(doc.file_path);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ sucesso: false, error: 'Arquivo do atestado não encontrado no servidor.' });
        }

        // Extrair CID e descrição de document_type (formato: "Z57 - Problemas laborais")
        const docTypeParts = (doc.document_type || '').split(' - ');
        const cidCode = docTypeParts[0] || '-';
        const cidDesc = docTypeParts.slice(1).join(' - ') || '-';

        // Formatar datas
        const formatDate = (isoStr) => {
            if (!isoStr) return '-';
            if (isoStr.includes('-') && isoStr.length === 10) {
                const [y, m, d] = isoStr.split('-');
                return `${d}/${m}/${y}`;
            }
            return isoStr;
        };
        const dataInicio = formatDate(doc.atestado_inicio);
        const dataFim = formatDate(doc.atestado_fim);
        const tipo = doc.atestado_tipo === 'horas' ? 'horas' : 'dias';

        // Calcular duração em dias
        let duracaoDias = 0;
        if (doc.atestado_inicio && doc.atestado_fim && doc.atestado_tipo !== 'horas') {
            const dtInicio = new Date(doc.atestado_inicio);
            const dtFim = new Date(doc.atestado_fim);
            duracaoDias = Math.round((dtFim - dtInicio) / (1000 * 60 * 60 * 24)) + 1; // inclusivo
        }
        const ehEsocial = duracaoDias >= 16;

        // Textos dinâmicos conforme período
        const emailTitulo = ehEsocial
            ? '📋 Atestado Médico — Inclusão eSocial'
            : '📋 Atestado Médico — Controle Interno';
        const emailSubject = ehEsocial
            ? `Atestado Médico eSocial — ${colab.nome_completo} (${cidCode})`
            : `Atestado Médico (Controle) — ${colab.nome_completo} (${cidCode})`;
        const emailIntro = ehEsocial
            ? `Encaminhamos o atestado médico do colaborador abaixo para <strong>inclusão no cadastro do eSocial</strong>, pois o período de afastamento é de <strong style="color:#0f4c81;">${duracaoDias} dia(s)</strong>, atingindo o limite de 16 dias exigido pelo eSocial.`
            : `Encaminhamos o atestado médico do colaborador abaixo <strong>apenas para controle interno</strong>. O período de afastamento de <strong>${duracaoDias > 0 ? duracaoDias + ' dia(s)' : tipo}</strong> não atinge o mínimo de 16 dias exigido pelo eSocial e <strong>não requer lançamento</strong>.`;
        const tituloColor = ehEsocial ? '#0f4c81' : '#64748b';

        // Nome do arquivo anexo: CID_DD-MM-YYYY_NomeColaborador.pdf
        const hoje = new Date();
        const dd = String(hoje.getDate()).padStart(2, '0');
        const mm = String(hoje.getMonth() + 1).padStart(2, '0');
        const yyyy = hoje.getFullYear();
        const nomeNorm = (colab.nome_completo || 'Colaborador')
            .toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]+/g, '_');
        const attachmentName = `${cidCode}_${dd}-${mm}-${yyyy}_${nomeNorm}.pdf`;

        const logoPath = path.join(__dirname, '..', 'frontend', 'assets', 'logo-header.png');

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius:8px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="cid:empresa-logo" style="max-height: 80px; max-width:100%;">
                </div>
                <h2 style="color: ${tituloColor}; border-bottom: 2px solid ${tituloColor}; padding-bottom: 10px;">${emailTitulo}</h2>
                <p>${emailIntro}</p>

                <div style="background:#f1f5f9; padding:15px; border-radius:8px; margin:20px 0;">
                    <p style="margin:4px 0;"><strong>Colaborador:</strong> ${colab.nome_completo}</p>
                    <p style="margin:4px 0;"><strong>CPF:</strong> ${colab.cpf || '-'}</p>
                    <p style="margin:4px 0;"><strong>Cargo:</strong> ${colab.cargo || '-'}</p>
                    <p style="margin:4px 0;"><strong>Departamento:</strong> ${colab.departamento || '-'}</p>
                </div>

                <div style="background:#fff; border:1px solid #cbd5e1; padding:15px; border-radius:8px; margin:20px 0;">
                    <p style="margin:4px 0;"><strong>CID:</strong> <span style="color:${tituloColor}; font-weight:700;">${cidCode}</span> — ${cidDesc}</p>
                    <p style="margin:4px 0;"><strong>Início do afastamento:</strong> ${dataInicio}</p>
                    <p style="margin:4px 0;"><strong>Fim do afastamento:</strong> ${dataFim}</p>
                    <p style="margin:4px 0;"><strong>Tipo:</strong> Atestado em ${tipo}${duracaoDias > 0 ? ` (${duracaoDias} dia(s))` : ''}</p>
                </div>

                <p>O documento em PDF está em anexo neste e-mail.</p>
                <p style="margin-top:30px; font-size:0.9em; color:#7f8c8d;">Atenciosamente,<br>Equipe de RH — América Rental</p>
            </div>
        `;

        const transporter = nodemailer.createTransport(SMTP_CONFIG);
        await transporter.sendMail({
            from: `"RH América Rental" <${SMTP_CONFIG.auth.user}>`,
            to: email_to,
            subject: emailSubject,
            html: htmlContent,
            attachments: [
                { filename: 'logo.png', path: logoPath, cid: 'empresa-logo' },
                { filename: attachmentName, path: filePath, contentType: 'application/pdf' }
            ]
        });

        console.log(`[ATESTADO CONTAB] Enviado para ${email_to} | Doc: ${document_id} | Colab: ${colab.nome_completo}`);

        // Salvar timestamp do envio no documento
        const agora = new Date().toISOString();
        await new Promise((resolve, reject) =>
            db.run('UPDATE documentos SET atestado_contab_enviado_em = ? WHERE id = ?',
                [agora, document_id], (err) => err ? reject(err) : resolve()));

        res.json({ sucesso: true, message: 'E-mail enviado com sucesso para a contabilidade!', enviado_em: agora });

    } catch (error) {
        console.error('[ATESTADO CONTAB] ERRO:', error.message);
        res.status(500).json({ sucesso: false, error: error.message });
    }
});

/**
 * Envio de Suspensão para a Contabilidade (Fechamento de Folha)
 */
app.post('/api/send-suspensao-contabilidade', authenticateToken, async (req, res) => {
    const { document_id, email_to } = req.body;
    if (!document_id || !email_to) {
        return res.status(400).json({ sucesso: false, error: 'document_id e email_to são obrigatórios.' });
    }

    try {
        const doc = await new Promise((resolve, reject) =>
            db.get('SELECT * FROM documentos WHERE id = ?', [document_id], (err, row) => err ? reject(err) : resolve(row)));
        if (!doc) return res.status(404).json({ sucesso: false, error: 'Documento não encontrado.' });

        const colab = await new Promise((resolve, reject) =>
            db.get('SELECT * FROM colaboradores WHERE id = ?', [doc.colaborador_id], (err, row) => err ? reject(err) : resolve(row)));
        if (!colab) return res.status(404).json({ sucesso: false, error: 'Colaborador não encontrado.' });

        // Extrair tipo da suspensão do document_type (formato: "Título###Suspensão X dias")
        const parts = (doc.document_type || '').split('###');
        const tipoSuspensao = parts[1] || parts[0] || 'Suspensão';

        // Data do documento
        const dataDoc = doc.upload_date
            ? new Date(doc.upload_date).toLocaleDateString('pt-BR')
            : new Date().toLocaleDateString('pt-BR');

        // Garantir que o documento está assinado
        if (doc.assinafy_status !== 'Assinado' || !doc.signed_file_path) {
            return res.status(400).json({ sucesso: false, error: 'O documento ainda não foi assinado. Aguarde a assinatura antes de enviar para a contabilidade.' });
        }

        // Arquivo assinado em anexo
        const attachments = [];
        const signedFilePath = path.resolve(doc.signed_file_path);
        if (fs.existsSync(signedFilePath)) {
            const nomeNorm = (colab.nome_completo || 'Colaborador')
                .toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]+/g, '_');
            const hoje = new Date();
            const dd = String(hoje.getDate()).padStart(2, '0');
            const mm = String(hoje.getMonth() + 1).padStart(2, '0');
            const yyyy = hoje.getFullYear();
            attachments.push({ filename: `Suspensao_Assinada_${dd}-${mm}-${yyyy}_${nomeNorm}.pdf`, path: signedFilePath, contentType: 'application/pdf' });
        } else {
            return res.status(404).json({ sucesso: false, error: 'Arquivo PDF assinado não encontrado no servidor.' });
        }

        const logoPath = path.join(__dirname, '..', 'frontend', 'assets', 'logo-header.png');
        attachments.unshift({ filename: 'logo.png', path: logoPath, cid: 'empresa-logo' });

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius:8px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="cid:empresa-logo" style="max-height: 80px; max-width:100%;">
                </div>
                <h2 style="color: #c0392b; border-bottom: 2px solid #c0392b; padding-bottom: 10px;">⚠️ Advertência — Suspensão Disciplinar</h2>
                <p>Informamos que o colaborador abaixo recebeu uma <strong>suspensão disciplinar</strong> que deve ser <strong>considerada no fechamento da folha de pagamento</strong>.</p>

                <div style="background:#f1f5f9; padding:15px; border-radius:8px; margin:20px 0;">
                    <p style="margin:4px 0;"><strong>Colaborador:</strong> ${colab.nome_completo}</p>
                    <p style="margin:4px 0;"><strong>CPF:</strong> ${colab.cpf || '-'}</p>
                    <p style="margin:4px 0;"><strong>Cargo:</strong> ${colab.cargo || '-'}</p>
                    <p style="margin:4px 0;"><strong>Departamento:</strong> ${colab.departamento || '-'}</p>
                </div>

                <div style="background:#fff5f5; border:2px solid #e74c3c; padding:15px; border-radius:8px; margin:20px 0;">
                    <p style="margin:4px 0;"><strong>Tipo:</strong> <span style="color:#c0392b; font-weight:700;">${tipoSuspensao}</span></p>
                    <p style="margin:4px 0;"><strong>Data do registro:</strong> ${dataDoc}</p>
                </div>

                <div style="background:#fff3cd; border:1px solid #ffc107; padding:15px; border-radius:8px; margin:20px 0; text-align:center;">
                    <p style="margin:0; color:#856404; font-weight:700; font-size:1rem;">
                        📌 Atenção: Esta suspensão deve ser descontada na folha de pagamento do colaborador.<br>
                        Favor considerar para o fechamento do mês.
                    </p>
                </div>

                ${attachments.length > 1 ? '<p>O documento de advertência está em anexo neste e-mail.</p>' : ''}
                <p style="margin-top:30px; font-size:0.9em; color:#7f8c8d;">Atenciosamente,<br>Equipe de RH — América Rental</p>
            </div>
        `;

        const transporter = nodemailer.createTransport(SMTP_CONFIG);
        await transporter.sendMail({
            from: `"RH América Rental" <${SMTP_CONFIG.auth.user}>`,
            to: email_to,
            subject: `⚠️ Suspensão para Folha — ${colab.nome_completo} (${tipoSuspensao})`,
            html: htmlContent,
            attachments
        });

        console.log(`[SUSPENSAO CONTAB] Enviado para ${email_to} | Doc: ${document_id} | Colab: ${colab.nome_completo}`);
        res.json({ sucesso: true, message: 'E-mail de suspensão enviado com sucesso para a contabilidade!' });

    } catch (error) {
        console.error('[SUSPENSAO CONTAB] ERRO:', error.message);
        res.status(500).json({ sucesso: false, error: error.message });
    }
});


/**
 * WEBHOOK UNIFICADO: Escuta criação de links e conclusão de assinaturas
 */
const salvarLinkAssinatura = async (assinafyId, link) => {
    return new Promise((resolve) => {
        // Tenta atualizar em admissao
        db.run(`UPDATE admissao_assinaturas SET assinafy_url = ? WHERE assinafy_id = ?`, [link, assinafyId], function(err) {
            if (this.changes > 0) return resolve(true);
            // Se nao mudou, tenta em documentos
            db.run(`UPDATE documentos SET assinafy_url = ? WHERE assinafy_id = ?`, [link, assinafyId], function() {
                resolve(true);
            });
        });
    });
};

app.post("/webhook/assinafy", async (req, res) => {
    try {
        const payload = req.body;
        console.log('--- WEBHOOK ASSINAFY RECEBIDO ---', JSON.stringify(payload));
        
        // Retornar IMEDIATAMENTE para o Assinafy (evita timeout no webhook)
        res.status(200).send("OK");
        
        // 1. Tentar encontrar o ID do documento
        const assinafyId = payload.document_id || payload.documentId || payload.id ||
                          (payload.data && (payload.data.document_id || payload.data.id)) ||
                          (payload.object && payload.object.id);

        // 2. Tratar captura de link (Criação/Envio)
        let signLink = payload.sign_url || payload.signUrl;
        if (!signLink && payload.signers && payload.signers[0]) {
            signLink = payload.signers[0].sign_url || payload.signers[0].url;
        }
        if (!signLink && payload.data) {
            const d = payload.data;
            signLink = d.sign_url || d.signUrl || (d.signers && d.signers[0] && (d.signers[0].sign_url || d.signers[0].url));
        }

        if (assinafyId && signLink) {
            console.log(`[WEBHOOK] Capturando link para Documento ${assinafyId}: ${signLink}`);
            await salvarLinkAssinatura(assinafyId, signLink);
        }
        
        // 3. Processamento Unificado de Assinatura Completa via Polling
        // Em vez de duplicar a lógica complexa de downlaod, Assinatura Digital (PFX) por cima, 
        // Sync Onedrive e Updates de DB, nós simplesmente acionamos nosso POLLING.
        const event = (payload.event || '').toLowerCase();
        if (event.includes('ready') || event.includes('signed') || event.includes('completed') || event.includes('certificated')) {
            setTimeout(() => {
                console.log('[WEBHOOK] Engatilhando processamento unificado via polling...');
                pollAdmissaoAssinaturas().catch(e => console.error('[WEBHOOK-POLL-TRIGGER] Erro:', e));
            }, 1500);
        }

    } catch (e) {
        console.error('[WEBHOOK] Erro gravíssimo:', e);
    }
});

// Rota para baixar o PDF ASSINADO
app.get('/api/documentos/download-assinado/:id', authenticateToken, (req, res) => {
    db.get('SELECT file_name, signed_file_path, assinafy_id FROM documentos WHERE id = ?', [req.params.id], async (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Documento não encontrado' });
        
        // Se já temos baixado, entrega o arquivo diretamente
        if (row.signed_file_path && require('fs').existsSync(row.signed_file_path)) {
            const signedName = `ASSINADO_${row.file_name}`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(signedName)}"`);
            return require('fs').createReadStream(row.signed_file_path).pipe(res);
        }

        // Se não baixou ainda mas já está assinado, busca o link urgente no Assinafy
        if (row.assinafy_id) {
            try {
                const https = require('https');
                const reqUrl = `https://api.assinafy.com.br/v1/documents/${row.assinafy_id}`;
                const getDocData = () => new Promise((resolve, reject) => {
                    https.get(reqUrl, {
                        headers: {
                            'X-Api-Key': 'AxaT-FiXBckHqEYV0s_MtUhLF3pReRz3dX4zVpC173vmjDwzLGHYtDJuQje4-4Pd',
                            'Accept': 'application/json'
                        }
                    }, response => {
                        let data = '';
                        response.on('data', c => data += c);
                        response.on('end', () => resolve(JSON.parse(data)));
                    }).on('error', reject);
                });

                const assinafyRes = await getDocData();
                const docData = assinafyRes.data || assinafyRes;
                
                // Forçar o recálculo da melhor URL pra evitar cache do antigo (sem certificado)
                let targetUrl = extractSignedUrl(docData);

                if (targetUrl) {
                    const fileName = encodeURIComponent(`ASSINADO_${row.file_name}`);
                    const getProtocol = targetUrl.startsWith('https') ? require('https') : require('http');
                    const reqOptions = {
                        headers: {
                            'X-Api-Key': 'AxaT-FiXBckHqEYV0s_MtUhLF3pReRz3dX4zVpC173vmjDwzLGHYtDJuQje4-4Pd'
                        }
                    };
                    
                    // Como queremos forçar que o arquivo atualize, salvamos local
                    const storagePath = process.env.STORAGE_PATH || path.join(__dirname, 'data', 'uploads');
                    const assDir = path.join(storagePath, 'assinados');
                    if (!require('fs').existsSync(assDir)) require('fs').mkdirSync(assDir, { recursive: true });
                    const newPath = path.join(assDir, `ASSINADO_${row.file_name.replace('.pdf', '')}_${Date.now()}.pdf`);
                    
                    const file = require('fs').createWriteStream(newPath);
                    getProtocol.get(targetUrl, reqOptions, (response) => {
                        // Tratar redirecionamento automático (Amazon S3)
                        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                            getProtocol.get(response.headers.location, (redRes) => {
                                redRes.pipe(file);
                                file.on('finish', () => {
                                    file.close();
                                    db.run('UPDATE documentos SET signed_file_path = ?, assinafy_signed_at = COALESCE(assinafy_signed_at, CURRENT_TIMESTAMP) WHERE id = ?', [newPath, req.params.id]);
                                    res.setHeader('Content-Type', 'application/pdf');
                                    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
                                    require('fs').createReadStream(newPath).pipe(res);
                                });
                            }).on('error', (err) => {
                                require('fs').unlink(newPath, () => {}); res.status(500).json({ error: 'Erro no redirecionamento S3.' });
                            });
                            return;
                        }

                        response.pipe(file);
                        file.on('finish', () => {
                            file.close();
                            // Atualiza o banco e serve
                            db.run('UPDATE documentos SET signed_file_path = ?, assinafy_signed_at = COALESCE(assinafy_signed_at, CURRENT_TIMESTAMP) WHERE id = ?', [newPath, req.params.id]);
                            res.setHeader('Content-Type', 'application/pdf');
                            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
                            require('fs').createReadStream(newPath).pipe(res);
                        });
                    }).on('error', (err) => {
                        require('fs').unlink(newPath, () => {});
                        res.status(500).json({ error: 'Falha ao baixar do Assinafy' });
                    });
                    
                    return; // Retorna para não executar o bloco else
                } else {
                    return res.status(404).json({ error: 'URL do PDF assinado não encontrada no Assinafy' });
                }

            } catch (e) {
                return res.status(500).json({ error: 'Falha ao buscar fallback no Assinafy: ' + e.message });
            }
        }

        return res.status(404).json({ error: 'PDF assinado ainda não disponível. Aguarde alguns instantes.' });
    });
});
/**
 * Verifica o status diretamente na API do Assinafy e atualiza localmente (Manual Sync)
 */
app.post('/api/documentos/:id/sync-assinafy', authenticateToken, async (req, res) => {
    const docId = req.params.id;
    try {
        const doc = await new Promise((resolve, reject) => {
            db.get(`SELECT d.id, d.file_name, d.assinafy_id, d.assinafy_status, d.tab_name, d.document_type, d.year, d.colaborador_id, c.nome_completo
                    FROM documentos d
                    JOIN colaboradores c ON c.id = d.colaborador_id
                    WHERE d.id = ?`, [docId], (err, row) => {
                if (err) reject(err); else resolve(row);
            });
        });

        if (!doc) return res.status(404).json({ error: 'Documento não encontrado.' });
        if (!doc.assinafy_id) return res.status(400).json({ error: 'Documento não foi enviado ao Assinafy.' });

        const https = require('https');
        const fetchStatus = () => new Promise((resolve, reject) => {
            const reqUrl = `https://api.assinafy.com.br/v1/documents/${doc.assinafy_id}`;
            const options = {
                method: 'GET',
                headers: {
                    'X-Api-Key': 'AxaT-FiXBckHqEYV0s_MtUhLF3pReRz3dX4zVpC173vmjDwzLGHYtDJuQje4-4Pd',
                    'Accept': 'application/json'
                }
            };

            const request = https.request(reqUrl, options, (response) => {
                let data = '';
                response.on('data', chunk => data += chunk);
                response.on('end', () => resolve(JSON.parse(data)));
            });

            request.on('error', reject);
            request.end();
        });

        const assinafyRes = await fetchStatus();
        console.log(`[SYNC ASSINAFY] Retorno GET document ${doc.assinafy_id}:`, JSON.stringify(assinafyRes).substring(0, 200));

        // Assinafy v1 retorna os dados normalmente no body (ex: assinafyRes.data ou direto)
        const documentData = assinafyRes.data || assinafyRes;
        
        let newStatus = doc.assinafy_status;
        let pStatus = (documentData.status || documentData.status_id || '').toString().toLowerCase();

        // status possíveis no assinafy: certificated, completed, pending, waiting_signatures, error
        if (pStatus.includes('certificat') || pStatus.includes('complet') || pStatus === '4' || pStatus === 'assinado' || pStatus === 'concluído') {
            newStatus = 'Assinado';
        } else if (pStatus.includes('pend') || pStatus.includes('wait') || pStatus === '2' || pStatus === '3') {
            newStatus = 'Pendente';
        } else if (pStatus.includes('error') || pStatus.includes('fail')) {
            newStatus = 'Erro';
        }

        // Se assinado, pega o link e baixa se não tiver path ainda
        let signedUrl = extractSignedUrl(documentData);
        
        if (newStatus === 'Assinado' && signedUrl) {
            // Reaproveita logica de webhook de download e salvar status
            const path = require('path');
            const fs = require('fs');
            const storagePath = process.env.STORAGE_PATH || path.join(__dirname, 'data', 'uploads');
            const assDir = path.join(storagePath, 'assinados');
            if (!fs.existsSync(assDir)) fs.mkdirSync(assDir, { recursive: true });
            
            const originalName = path.basename(doc.file_name || 'doc.pdf', '.pdf');
            const finalPath = path.join(assDir, `ASSINADO_${originalName}_${Date.now()}.pdf`);
            
            await new Promise((resolve, reject) => {
                const file = fs.createWriteStream(finalPath);
                const reqOptions = { headers: { 'X-Api-Key': 'AxaT-FiXBckHqEYV0s_MtUhLF3pReRz3dX4zVpC173vmjDwzLGHYtDJuQje4-4Pd' } };
                
                https.get(signedUrl, reqOptions, (response) => {
                    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                        https.get(response.headers.location, (redirRes) => {
                            redirRes.pipe(file);
                            file.on('finish', () => { file.close(); resolve(); });
                        }).on('error', (err) => { fs.unlink(finalPath, () => {}); reject(err); });
                    } else if (response.statusCode >= 400) {
                        fs.unlink(finalPath, () => {});
                        resolve(); // ignora o erro para não travar o sync
                    } else {
                        response.pipe(file);
                        file.on('finish', () => { file.close(); resolve(); });
                    }
                }).on('error', (err) => { fs.unlink(finalPath, () => {}); reject(err); });
            });

            await new Promise((resolve, reject) => {
                db.run(`UPDATE documentos SET assinafy_status = ?, signed_file_path = ?, assinafy_signed_at = COALESCE(assinafy_signed_at, CURRENT_TIMESTAMP) WHERE id = ?`, 
                    [newStatus, finalPath, docId], err => err ? reject(err) : resolve());
            });

            // AUTOMATIC ONEDRIVE SYNC FOR ASSINADO
            if (onedrive && fs.existsSync(finalPath)) {
                try {
                    const onedriveBasePath = process.env.ONEDRIVE_BASE_PATH || "RH/1.Colaboradores/Sistema";
                    const safeColab = formatarNome(doc.nome_completo || "DESCONHECIDO");
                    // Pasta = tab_name normalizado (ex: ASO, EXAMES_COMPLEMENTARES)
                    const safeTab = formatarPasta(doc.tab_name || 'DOCUMENTOS').toUpperCase();
                    const docYear = doc.year && doc.year !== 'null' && doc.year !== '' ? String(doc.year).replace(/[^0-9]/g, '') : String(new Date().getFullYear());
                    // Caminho: Base/NOME_COLAB/TAB/ANO
                    const targetDir = `${onedriveBasePath}/${safeColab}/${safeTab}/${docYear}`;
                    
                    console.log(`[OneDrive Sync] Sincronizando para: ${targetDir}`);

                    // Garantir que a pasta existe (cria se necessário)
                    await onedrive.ensurePath(targetDir);

                    const fBuffer = fs.readFileSync(finalPath);
                    // Nome padrão: TipoDoc_Ano_NomeColab.pdf
                    const safeType = formatarPasta(doc.document_type || doc.tab_name || 'Documento').replace(/\s+/g, '_');
                    const cloudName = `${safeType}_${docYear}_${safeColab}.pdf`;
                    
                    await onedrive.uploadToOneDrive(targetDir, cloudName, fBuffer);
                    console.log(`[OneDrive] ✓ Assinado sincronizado (API Sync): ${cloudName}`);
                } catch (e) { 
                    console.error("[OneDrive] Erro de sync assinado (API Sync):", e.message); 
                }
            }
        } else {
            // Apenas atualiza o status se mudou
            if (newStatus !== doc.assinafy_status) {
                await new Promise((resolve, reject) => {
                    db.run(`UPDATE documentos SET assinafy_status = ? WHERE id = ?`, [newStatus, docId], 
                        err => err ? reject(err) : resolve());
                });
            }
        }

        res.json({ sucesso: true, assinafy_id: doc.assinafy_id, status_antigo: doc.assinafy_status, status_novo: newStatus, status_assinafy: pStatus, raw: documentData });
    } catch (error) {
        console.error('Erro na sincronizacao manual Assinafy:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DIAGNÓSTICO: Força re-envio de documento assinado ao OneDrive e retorna log detalhado
 */
app.post('/api/documentos/:id/force-onedrive-sync', authenticateToken, async (req, res) => {
    const docId = req.params.id;
    const log = [];
    const addLog = (msg) => { log.push(msg); console.log('[FORCE-OD]', msg); };

    try {
        const doc = await new Promise((resolve, reject) => {
            db.get(`SELECT d.*, c.nome_completo
                    FROM documentos d JOIN colaboradores c ON c.id = d.colaborador_id
                    WHERE d.id = ?`, [docId], (err, row) => {
                if (err) reject(err); else resolve(row);
            });
        });

        if (!doc) return res.status(404).json({ log, error: 'Documento não encontrado.' });
        addLog(`Doc id=${doc.id} | tab=${doc.tab_name} | type=${doc.document_type} | year=${doc.year} | colab=${doc.nome_completo} | status=${doc.assinafy_status}`);
        addLog(`file_path: ${doc.file_path || 'VAZIO'}`);
        addLog(`signed_file_path: ${doc.signed_file_path || 'VAZIO'}`);
        addLog(`ONEDRIVE_BASE_PATH env: ${process.env.ONEDRIVE_BASE_PATH || '(não definido, usando RH/1.Colaboradores/Sistema)'}`);

        // Para docs não assinados (ex: Atestados), usa file_path diretamente
        let localPath = doc.signed_file_path || null;
        if (!localPath || !fs.existsSync(localPath)) {
            if (doc.file_path && fs.existsSync(doc.file_path)) {
                localPath = doc.file_path;
                addLog(`Usando file_path regular: ${localPath}`);
            }
        }

        // Baixar do Assinafy se não tiver localmente
        if (!localPath || !fs.existsSync(localPath)) {
            addLog('Arquivo local ausente. Buscando URL no Assinafy...');
            if (!doc.assinafy_id) return res.json({ log, error: 'Nenhum arquivo local encontrado e sem assinafy_id para baixar.' });

            const assinafyRes = await new Promise((resolve, reject) => {
                const https = require('https');
                const opts = {
                    hostname: 'api.assinafy.com.br', path: `/v1/documents/${doc.assinafy_id}`, method: 'GET',
                    headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey, 'Accept': 'application/json' }
                };
                const r = https.request(opts, (resp) => {
                    const chunks = [];
                    resp.on('data', c => chunks.push(c));
                    resp.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch(e) { reject(e); } });
                });
                r.on('error', reject); r.end();
            });

            const docData = assinafyRes.data || assinafyRes;
            addLog(`Status Assinafy: ${docData.status} | Keys: ${Object.keys(docData).join(',')}`);
            addLog(`Artifacts: ${JSON.stringify(docData.artifacts || 'nenhum')}`);

            const signedUrl = extractSignedUrl(docData);
            addLog(`URL extraída: ${signedUrl || 'NENHUMA URL ENCONTRADA'}`);
            if (!signedUrl) return res.json({ log, error: 'URL do PDF assinado não encontrada.', raw: docData });

            const storagePath = process.env.STORAGE_PATH || path.join(__dirname, 'data', 'uploads');
            const assDir = path.join(storagePath, 'assinados');
            if (!fs.existsSync(assDir)) fs.mkdirSync(assDir, { recursive: true });
            localPath = path.join(assDir, `ASSINADO_${path.basename(doc.file_name, '.pdf')}_${Date.now()}.pdf`);

            await new Promise((resolve, reject) => {
                const https = require('https');
                const proto = signedUrl.startsWith('https') ? https : require('http');
                const file = fs.createWriteStream(localPath);
                proto.get(signedUrl, { headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey } }, (response) => {
                    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                        proto.get(response.headers.location, (r2) => { r2.pipe(file); file.on('finish', () => { file.close(); resolve(); }); }).on('error', reject);
                        return;
                    }
                    response.pipe(file);
                    file.on('finish', () => { file.close(); resolve(); });
                }).on('error', reject);
            });
            db.run('UPDATE documentos SET signed_file_path = ?, assinafy_signed_at = COALESCE(assinafy_signed_at, CURRENT_TIMESTAMP) WHERE id = ?', [localPath, docId]);
            addLog(`PDF baixado: ${localPath}`);
        } else {
            addLog(`Arquivo local OK (${fs.statSync(localPath).size} bytes)`);
        }

        if (!onedrive) return res.json({ log, error: 'Módulo OneDrive não carregado no servidor.' });

        const onedriveBasePath = process.env.ONEDRIVE_BASE_PATH || 'RH/1.Colaboradores/Sistema';
        const safeColab = formatarNome(doc.nome_completo || 'DESCONHECIDO');
        const safeTab = formatarPasta(doc.tab_name || 'DOCUMENTOS').toUpperCase();
        const docYear = doc.year && doc.year !== 'null' && doc.year !== '' ? String(doc.year).replace(/[^0-9]/g, '') : String(new Date().getFullYear());
        const targetDir = `${onedriveBasePath}/${safeColab}/${safeTab}/${docYear}`;
        // Para Atestados, usa o file_name que já foi gerado com o padrão Z01_DD-MM-AA
        // Para docs assinados, usa o padrão TipoDoc_Ano_NomeColab.pdf
        const isAtestado = (doc.tab_name === 'Atestados');
        // Para atestados, strip o sufixo de timestamp do file_name: CID_DD-MM-AA_Nome_YYYYMMDD_HHMMSS.pdf → CID_DD-MM-AA_Nome.pdf
        const cloudName = isAtestado
            ? doc.file_name.replace(/_\d{8}_\d{6}(\.\w+)$/, '$1')
            : `${formatarPasta(doc.document_type || doc.tab_name || 'Documento').replace(/\s+/g, '_')}_${docYear}_${safeColab}.pdf`;

        addLog(`Caminho OneDrive: ${targetDir}/${cloudName}`);
        addLog('Chamando ensurePath...');
        await onedrive.ensurePath(targetDir);
        addLog('ensurePath OK. Iniciando upload...');

        const fBuffer = fs.readFileSync(localPath);
        addLog(`Buffer: ${fBuffer.length} bytes`);
        await onedrive.uploadToOneDrive(targetDir, cloudName, fBuffer);
        addLog(`✓ Upload concluído com sucesso!`);

        res.json({ sucesso: true, log, targetDir, cloudName });

    } catch (e) {
        addLog(`ERRO FATAL: ${e.message}`);
        console.error('[FORCE-OD] Stack:', e.stack);
        res.json({ sucesso: false, log, error: e.message });
    }
});

/**
 * ROTA TEMPORÁRIA: Reset de Sistema
 */
app.post('/api/maintenance/reset', authenticateToken, (req, res) => {
    db.serialize(() => {
        db.run("DELETE FROM colaborador_chaves");
        db.run("DELETE FROM dependentes");
        db.run("DELETE FROM documentos");
        db.run("DELETE FROM colaboradores", (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ sucesso: true, message: "Sistema resetado com sucesso." });
        });
    });
});


// --- SERVIR ARQUIVOS ESTÃTICOS ---
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/files', express.static(path.join(__dirname, '..', '..'))); 

// ====================================================================
// EPI TEMPLATES - CRUD
// ====================================================================
app.get('/api/epi-templates', authenticateToken, (req, res) => {
    db.all('SELECT * FROM epi_templates ORDER BY grupo', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => ({
            ...r,
            departamentos: JSON.parse(r.departamentos_json || '[]'),
            epis: JSON.parse(r.epis_json || '[]')
        })));
    });
});

app.put('/api/epi-templates/:id', authenticateToken, (req, res) => {
    const { grupo, departamentos, epis, termo_texto, rodape_texto } = req.body;
    const templateId = req.params.id;

    db.get('SELECT * FROM epi_templates WHERE id=?', [templateId], (err, old) => {
        if (err) return res.status(500).json({ error: err.message });

        db.run(
            `UPDATE epi_templates SET grupo=?, departamentos_json=?, epis_json=?, termo_texto=?, rodape_texto=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
            [grupo, JSON.stringify(departamentos || []), JSON.stringify(epis || []), termo_texto, rodape_texto, templateId],
            function(err2) {
                if (err2) return res.status(500).json({ error: err2.message });

                const oldEpis = old ? old.epis_json : '[]';
                const newEpis = JSON.stringify(epis || []);
                const changed =
                    (old && old.grupo !== grupo) ||
                    oldEpis !== newEpis ||
                    (old && old.termo_texto !== termo_texto) ||
                    (old && old.rodape_texto !== rodape_texto);

                if (changed) {
                    const motivo = [];
                    if (old && old.grupo !== grupo) motivo.push('Nome do grupo alterado');
                    if (oldEpis !== newEpis) motivo.push('Lista de EPIs alterada');
                    if (old && old.termo_texto !== termo_texto) motivo.push('Termo de responsabilidade alterado');
                    if (old && old.rodape_texto !== rodape_texto) motivo.push('Rodapé alterado');

                    // Fechar fichas ativas deste template e criar novas para cada colaborador
                    db.all(
                        `SELECT colaborador_id FROM colaborador_epi_fichas WHERE template_id=? AND status='ativa'`,
                        [templateId],
                        (errQ, afetados) => {
                            db.run(
                                `UPDATE colaborador_epi_fichas SET status='fechada', fechada_em=CURRENT_TIMESTAMP, motivo_fechamento=? WHERE template_id=? AND status='ativa'`,
                                [motivo.join('; '), templateId],
                                () => {
                                    // Criar nova ficha ativa para cada colaborador afetado
                                    const ids = (afetados || []).map(r => r.colaborador_id);
                                    let pending = ids.length;
                                    if (pending === 0) return res.json({ success: true, fichas_fechadas: true, novas_fichas: 0, motivo: motivo.join('; ') });
                                    ids.forEach(colabId => {
                                        db.run(
                                            `INSERT INTO colaborador_epi_fichas (colaborador_id, template_id, grupo, snapshot_epis, snapshot_termo, snapshot_rodape, linhas_usadas, status)
                                             VALUES (?,?,?,?,?,?,0,'ativa')`,
                                            [colabId, templateId, grupo, newEpis, termo_texto, rodape_texto],
                                            () => { pending--; if (pending === 0) res.json({ success: true, fichas_fechadas: true, novas_fichas: ids.length, motivo: motivo.join('; ') }); }
                                        );
                                    });
                                }
                            );
                        }
                    );
                } else {
                    res.json({ success: true, fichas_fechadas: false });
                }
            }
        );
    });
});

// ====================================================================
// EPI FICHAS POR COLABORADOR - CRUD
// ====================================================================

// GET: listar fichas de EPI de um colaborador
app.get('/api/colaboradores/:id/epi-fichas', authenticateToken, (req, res) => {
    db.all(
        `SELECT * FROM colaborador_epi_fichas WHERE colaborador_id=? ORDER BY created_at DESC`,
        [req.params.id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows.map(r => ({
                ...r,
                snapshot_epis: JSON.parse(r.snapshot_epis || '[]')
            })));
        }
    );
});

// POST: criar nova ficha de EPI para colaborador
app.post('/api/colaboradores/:id/epi-fichas', authenticateToken, (req, res) => {
    const { template_id, grupo, snapshot_epis, snapshot_termo, snapshot_rodape } = req.body;
    const colaboradorId = req.params.id;

    db.run(
        `INSERT INTO colaborador_epi_fichas (colaborador_id, template_id, grupo, snapshot_epis, snapshot_termo, snapshot_rodape, linhas_usadas, status)
         VALUES (?,?,?,?,?,?,0,'ativa')`,
        [colaboradorId, template_id, grupo, JSON.stringify(snapshot_epis || []), snapshot_termo, snapshot_rodape],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

// PATCH: atualizar linhas_usadas de uma ficha (quando gera novo PDF / entrega mais EPIs)
app.patch('/api/epi-fichas/:id/linhas', authenticateToken, (req, res) => {
    const { linhas_usadas } = req.body;
    db.run(
        `UPDATE colaborador_epi_fichas SET linhas_usadas=? WHERE id=?`,
        [linhas_usadas, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// DELETE: excluir ficha (se necessário)
app.delete('/api/epi-fichas/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM colaborador_epi_fichas WHERE id=?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// GET: listar entregas de uma ficha de EPI
app.get('/api/epi-fichas/:id/entregas', authenticateToken, (req, res) => {
    db.all(
        `SELECT * FROM epi_entregas WHERE ficha_id=? ORDER BY data_entrega ASC`,
        [req.params.id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows.map(r => ({ ...r, epis_entregues: JSON.parse(r.epis_entregues || '[]') })));
        }
    );
});

// POST: registrar entrega assinada de EPIs
app.post('/api/epi-fichas/:id/entregas', authenticateToken, (req, res) => {
    const fichaId = req.params.id;
    const { colaborador_id, epis_entregues, assinatura_base64, data_entrega } = req.body;
    if (!epis_entregues || !assinatura_base64) return res.status(400).json({ error: 'Dados incompletos.' });

    db.run(
        `INSERT INTO epi_entregas (ficha_id, colaborador_id, epis_entregues, assinatura_base64, data_entrega) VALUES (?,?,?,?,?)`,
        [fichaId, colaborador_id, JSON.stringify(epis_entregues), assinatura_base64, data_entrega || new Date().toLocaleDateString('pt-BR')],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

// POST: salvar PDF da ficha EPI no OneDrive
app.post('/api/epi-fichas/:id/save-onedrive', authenticateToken, async (req, res) => {
    const fichaId = req.params.id;
    const { pdf_base64, colaborador_id } = req.body;
    if (!pdf_base64 || !colaborador_id) return res.status(400).json({ error: 'Dados incompletos.' });
    if (!process.env.ONEDRIVE_CLIENT_ID) return res.json({ success: false, msg: 'OneDrive nao configurado.' });
    try {
        const colab = await new Promise((resolve, reject) =>
            db.get('SELECT * FROM colaboradores WHERE id=?', [colaborador_id], (e, r) => e ? reject(e) : resolve(r))
        );
        if (!colab) return res.status(404).json({ error: 'Colaborador nao encontrado.' });
        const safeNome = (colab.nome_completo || 'Colaborador')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9_]/g, '_').replace(/__+/g, '_').trim();
        const base64Data = pdf_base64.includes('base64,') ? pdf_base64.split('base64,')[1] : pdf_base64;
        const pdfBuffer = Buffer.from(base64Data, 'base64');
        const onedriveBase = `${process.env.ONEDRIVE_BASE_PATH || 'RH/1.Colaboradores/Sistema'}/${safeNome}`;
        // Pasta EPI: FichaEPI_N_Nome.pdf (sem sobrepor, número sequencial)
        const epiFolder = `${onedriveBase}/EPI`;
        await onedrive.ensurePath(epiFolder);
        // EPI: um único arquivo por ficha (sobrescreve a cada entrega)
        const epiFileName = `FichaEPI_${fichaId}_${safeNome}.pdf`;
        await onedrive.uploadToOneDrive(epiFolder, epiFileName, pdfBuffer);
        res.json({ success: true, arquivo_epi: epiFileName });
    } catch(err) {
        console.error('[EPI save-onedrive]', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/epi-templates', authenticateToken, (req, res) => {
    const { grupo, departamentos, epis, termo_texto, rodape_texto } = req.body;
    db.run(
        `INSERT INTO epi_templates (grupo, departamentos_json, epis_json, termo_texto, rodape_texto) VALUES (?,?,?,?,?)`,
        [grupo, JSON.stringify(departamentos || []), JSON.stringify(epis || []), termo_texto, rodape_texto],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.delete('/api/epi-templates/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM epi_templates WHERE id=?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});


// ============================================================
// ROTAS: USUÁRIOS E GRUPOS DE PERMISSÃO
// ============================================================

// --- USUÁRIOS ---
app.get('/api/usuarios', authenticateToken, (req, res) => {
    db.all(`SELECT u.id, u.username, u.nome, u.email, u.role, u.departamento, u.grupo_permissao_id, u.ativo,
                   g.nome as grupo_nome
            FROM usuarios u
            LEFT JOIN grupos_permissao g ON g.id = u.grupo_permissao_id
            ORDER BY u.nome`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/usuarios', authenticateToken, (req, res) => {
    const { username, password, nome, email, departamento, grupo_permissao_id, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username e senha são obrigatórios' });
    const hash = bcrypt.hashSync(password, 10);
    db.run(
        'INSERT INTO usuarios (username, password_hash, nome, email, departamento, grupo_permissao_id, role, ativo) VALUES (?,?,?,?,?,?,?,1)',
        [username, hash, nome || username, email || null, departamento || 'RH', grupo_permissao_id || null, role || 'Operacional'],
        function(err) {
            if (err) {
                const msg = err.message.includes('UNIQUE') ? 'Este username já está cadastrado.' : err.message;
                return res.status(400).json({ error: msg });
            }
            res.status(201).json({ id: this.lastID, message: 'Usuário criado com sucesso' });
        }
    );
});

app.put('/api/usuarios/:id', authenticateToken, (req, res) => {
    const { nome, email, departamento, grupo_permissao_id, role, ativo, password } = req.body;
    const updates = [];
    const values = [];
    if (nome !== undefined)               { updates.push('nome = ?');               values.push(nome); }
    if (email !== undefined)              { updates.push('email = ?');              values.push(email); }
    if (departamento !== undefined)       { updates.push('departamento = ?');       values.push(departamento); }
    if (grupo_permissao_id !== undefined) { updates.push('grupo_permissao_id = ?'); values.push(grupo_permissao_id); }
    if (role !== undefined)               { updates.push('role = ?');               values.push(role); }
    if (ativo !== undefined)              { updates.push('ativo = ?');              values.push(ativo); }
    if (password)                         { updates.push('password_hash = ?');      values.push(bcrypt.hashSync(password, 10)); }
    if (updates.length === 0) return res.json({ message: 'Nenhuma alteração' });
    values.push(req.params.id);
    db.run(`UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`, values, function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'Usuário atualizado com sucesso' });
    });
});

app.delete('/api/usuarios/:id', authenticateToken, (req, res) => {
    db.run('UPDATE usuarios SET ativo = 0 WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Usuário inativado' });
    });
});

// --- GRUPOS DE PERMISSÃO ---
app.get('/api/grupos-permissao', authenticateToken, (req, res) => {
    db.all('SELECT * FROM grupos_permissao ORDER BY nome', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/grupos-permissao', authenticateToken, (req, res) => {
    const { nome, descricao, departamento, tipo, base_usuario_id } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });
    db.run(
        'INSERT INTO grupos_permissao (nome, descricao, departamento, tipo, base_usuario_id) VALUES (?,?,?,?,?)',
        [nome, descricao || '', departamento || 'Todas', tipo || 'personalizado', base_usuario_id || null],
        function(err) {
            if (err) {
                const msg = err.message.includes('UNIQUE') ? 'Já existe um grupo com este nome.' : err.message;
                return res.status(400).json({ error: msg });
            }
            res.status(201).json({ id: this.lastID, message: 'Grupo criado' });
        }
    );
});

app.put('/api/grupos-permissao/:id', authenticateToken, (req, res) => {
    const { nome, descricao, departamento, tipo } = req.body;
    db.run(
        'UPDATE grupos_permissao SET nome=?, descricao=?, departamento=?, tipo=? WHERE id=?',
        [nome, descricao, departamento, tipo, req.params.id],
        function(err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ message: 'Grupo atualizado' });
        }
    );
});

app.delete('/api/grupos-permissao/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM grupos_permissao WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Grupo removido' });
    });
});

// --- PERMISSÕES POR GRUPO ---
app.get('/api/grupos-permissao/:id/permissoes', authenticateToken, (req, res) => {
    db.all('SELECT * FROM permissoes_grupo WHERE grupo_id = ? ORDER BY modulo, pagina_nome', [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.put('/api/grupos-permissao/:id/permissoes', authenticateToken, (req, res) => {
    const { permissoes } = req.body;
    if (!Array.isArray(permissoes)) return res.status(400).json({ error: 'permissoes deve ser um array' });
    const gid = req.params.id;

    // Usar transação: DELETE todas do grupo + INSERT novas
    // Garante funcionamento mesmo sem UNIQUE constraint no banco existente
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        db.run('DELETE FROM permissoes_grupo WHERE grupo_id = ?', [gid], (errDel) => {
            if (errDel) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Erro ao limpar permissões antigas: ' + errDel.message });
            }

            const stmt = db.prepare(
                `INSERT INTO permissoes_grupo (grupo_id, modulo, pagina_id, pagina_nome, visualizar, alterar, incluir, excluir)
                 VALUES (?,?,?,?,?,?,?,?)`
            );

            let hasError = false;
            permissoes.forEach(p => {
                stmt.run(
                    [gid, p.modulo, p.pagina_id, p.pagina_nome,
                     p.visualizar ? 1 : 0, p.alterar ? 1 : 0, p.incluir ? 1 : 0, p.excluir ? 1 : 0],
                    (err) => { if (err) hasError = true; }
                );
            });

            stmt.finalize((errFin) => {
                if (errFin || hasError) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Erro ao salvar permissões: ' + (errFin ? errFin.message : 'erro no insert') });
                }
                db.run('COMMIT', (errCommit) => {
                    if (errCommit) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: 'Erro ao confirmar transação: ' + errCommit.message });
                    }
                    console.log(`[PERMISSÕES] Grupo ${gid}: ${permissoes.length} permissões salvas com sucesso.`);
                    res.json({ message: 'Permissões salvas com sucesso', count: permissoes.length });
                });
            });
        });
    });
});

// Copiar permissões de um usuário para um grupo
app.post('/api/grupos-permissao/:id/copiar-usuario/:uid', authenticateToken, (req, res) => {
    const gid = req.params.id;
    const uid = req.params.uid;
    // Buscar o grupo do usuário de origem
    db.get('SELECT grupo_permissao_id FROM usuarios WHERE id = ?', [uid], (err, userRow) => {
        if (err || !userRow || !userRow.grupo_permissao_id) {
            return res.status(404).json({ error: 'Usuário ou grupo de origem não encontrado' });
        }
        const sourceGid = userRow.grupo_permissao_id;
        db.all('SELECT * FROM permissoes_grupo WHERE grupo_id = ?', [sourceGid], (err2, perms) => {
            if (err2) return res.status(500).json({ error: err2.message });
            // Deletar as atuais do grupo destino e inserir as copiadas
            db.run('DELETE FROM permissoes_grupo WHERE grupo_id = ?', [gid], (err3) => {
                if (err3) return res.status(500).json({ error: err3.message });
                const stmt = db.prepare(
                    `INSERT OR REPLACE INTO permissoes_grupo (grupo_id, modulo, pagina_id, pagina_nome, visualizar, alterar, incluir, excluir)
                     VALUES (?,?,?,?,?,?,?,?)`
                );
                perms.forEach(p => {
                    stmt.run([gid, p.modulo, p.pagina_id, p.pagina_nome, p.visualizar, p.alterar, p.incluir, p.excluir]);
                });
                stmt.finalize(err4 => {
                    if (err4) return res.status(500).json({ error: err4.message });
                    // Atualizar base_usuario_id no grupo
                    db.run('UPDATE grupos_permissao SET base_usuario_id = ? WHERE id = ?', [uid, gid]);
                    res.json({ message: 'Permissões copiadas com sucesso', count: perms.length });
                });
            });
        });
    });
});

// Middleware de Erro Global

app.use((err, req, res, next) => {
    console.error("--- ERRO DETECTADO NO SERVIDOR ---");
    console.error(err);
    res.status(500).json({ error: "Erro interno no servidor." });
});

// === GERADOR DEPARTAMENTO TEMPLATES (quais departamentos recebem cada gerador) ===
db.run(`CREATE TABLE IF NOT EXISTS gerador_departamento_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gerador_id INTEGER NOT NULL,
    departamento_id INTEGER NOT NULL,
    UNIQUE(gerador_id, departamento_id)
)`);

app.get('/api/gerador-departamento-templates', authenticateToken, (req, res) => {
    db.all('SELECT * FROM gerador_departamento_templates', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.get('/api/gerador-departamento-templates/:gerador_id', authenticateToken, (req, res) => {
    db.all('SELECT * FROM gerador_departamento_templates WHERE gerador_id = ?', [req.params.gerador_id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/gerador-departamento-templates', authenticateToken, (req, res) => {
    const { gerador_id, departamento_id } = req.body;
    if (!gerador_id || !departamento_id) return res.status(400).json({ error: 'gerador_id e departamento_id são obrigatórios' });
    db.run('INSERT OR IGNORE INTO gerador_departamento_templates (gerador_id, departamento_id) VALUES (?, ?)',
        [gerador_id, departamento_id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ ok: true, id: this.lastID });
        });
});

app.post('/api/gerador-departamento-templates/batch', authenticateToken, (req, res) => {
    const { templates } = req.body; // Array of {gerador_id, departamento_id}
    if (!Array.isArray(templates)) return res.status(400).json({ error: 'formato inválido' });

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.run('DELETE FROM gerador_departamento_templates', [], (err) => {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
            }
            if (templates.length === 0) {
                db.run('COMMIT');
                return res.json({ ok: true });
            }
            
            const stmt = db.prepare('INSERT INTO gerador_departamento_templates (gerador_id, departamento_id) VALUES (?, ?)');
            let errors = 0;
            templates.forEach(t => {
                stmt.run([t.gerador_id, t.departamento_id], err => {
                    if (err) errors++;
                });
            });
            stmt.finalize(() => {
                if (errors > 0) {
                    db.run('ROLLBACK');
                    res.status(500).json({ error: 'Erro ao salvar templates em lote.' });
                } else {
                    db.run('COMMIT');
                    res.json({ ok: true });
                }
            });
        });
    });
});

app.delete('/api/gerador-departamento-templates/:gerador_id/:departamento_id', authenticateToken, (req, res) => {
    db.run('DELETE FROM gerador_departamento_templates WHERE gerador_id = ? AND departamento_id = ?',
        [req.params.gerador_id, req.params.departamento_id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ ok: true, removed: this.changes });
        });
});

// ═══════════════════════════════════════════════════════════════════════════
// ROTAS DE GERENCIAMENTO DO CERTIFICADO DIGITAL (.PFX)
// ═══════════════════════════════════════════════════════════════════════════

// Diretório persistente para o certificado: mesmo disco do banco de dados
const CERT_DIR = (() => {
    if (process.env.DATABASE_PATH) {
        // Salva no mesmo diretório do banco (disco persistente do Render)
        return path.join(path.dirname(process.env.DATABASE_PATH), '_certificados');
    }
    return path.join(__dirname, 'data', '_certificados');
})();
if (!fs.existsSync(CERT_DIR)) { try { fs.mkdirSync(CERT_DIR, { recursive: true }); } catch(e) {} }
console.log(`[CERT] Diretório do certificado: ${CERT_DIR}`);

const uploadCertificado = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, CERT_DIR),
        filename:    (req, file, cb) => cb(null, 'certificado.pfx')
    }),
    fileFilter: (req, file, cb) => {
        if (file.originalname.toLowerCase().endsWith('.pfx') || file.mimetype === 'application/x-pkcs12') {
            cb(null, true);
        } else {
            cb(new Error('Somente arquivos .pfx são aceitos'));
        }
    }
});

/**
 * GET /api/certificado-digital/status
 * Retorna status e informações do certificado configurado
 */
app.get('/api/certificado-digital/status', authenticateToken, (req, res) => {
    const disp = signPdfPfx.verificarDisponibilidade();
    if (!disp.disponivel) {
        return res.json({ configurado: false, motivo: disp.motivo });
    }
    const info = signPdfPfx.infosCertificado(process.env.PFX_PATH, process.env.PFX_PASSWORD || '');
    res.json({ configurado: true, ...info });
});

/**
 * POST /api/certificado-digital/testar-assinatura
 * Testa a assinatura real com o certificado configurado e retorna sucesso ou erro detalhado
 */
app.post('/api/certificado-digital/testar-assinatura', authenticateToken, async (req, res) => {
    const isDiretoria = req.user?.role === 'Diretoria'
        || req.user?.role === 'Administrador'
        || req.user?.departamento === 'Diretoria'
        || (req.user?.grupo_nome && req.user.grupo_nome.toLowerCase() === 'diretoria');
    if (!isDiretoria) return res.status(403).json({ ok: false, erro: 'Acesso negado' });

    const disp = signPdfPfx.verificarDisponibilidade();
    if (!disp.disponivel) return res.json({ ok: false, etapa: 'verificacao', erro: disp.motivo });

    try {
        const { PDFDocument } = require('pdf-lib');
        const tmpDoc = await PDFDocument.create();
        const pg     = tmpDoc.addPage([595, 842]);
        pg.drawText('Teste de assinatura digital - America Rental', { x: 50, y: 700, size: 14 });
        pg.drawText(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { x: 50, y: 680, size: 10 });
        const tmpBuffer = Buffer.from(await tmpDoc.save());

        console.log('[CERT-TEST] Iniciando teste real de assinatura...');
        const pdfAssinado = await signPdfPfx.assinarPDF(tmpBuffer, {
            motivo: 'Teste de assinatura digital - Sistema América Rental',
            local: 'Brasil',
            nome: 'America Rental Equipamentos Ltda'
        });

        res.json({
            ok: true,
            tamanhoOriginal: tmpBuffer.length,
            tamanhoAssinado: pdfAssinado.length,
            mensagem: 'Assinatura digital funcionando corretamente!'
        });
    } catch(e) {
        console.error('[CERT-TEST] ERRO na assinatura:', e.message);
        res.status(500).json({ ok: false, etapa: 'assinatura', erro: e.message });
    }
});

/**
 * POST /api/certificado-digital/upload
 * Faz upload do arquivo .pfx e define a senha
 * Body: multipart com campo 'certificado' (.pfx) e 'senha' (texto)
 */
app.post('/api/certificado-digital/upload', authenticateToken, uploadCertificado.single('certificado'), async (req, res) => {
    // Apenas usuários da Diretoria podem gerenciar o certificado
    const isDiretoria = req.user?.role === 'Diretoria' 
        || req.user?.role === 'Administrador' 
        || req.user?.departamento === 'Diretoria'
        || (req.user?.grupo_nome && req.user.grupo_nome.toLowerCase() === 'diretoria');
    if (!isDiretoria) {
        return res.status(403).json({ error: 'Apenas usuários da Diretoria podem configurar o certificado digital.' });
    }
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo .pfx enviado.' });

    const senha = req.body.senha || '';
    const pfxPath = req.file.path;

    // Testar o certificado imediatamente
    const info = signPdfPfx.infosCertificado(pfxPath, senha);
    if (!info.ok) {
        // Remover arquivo inválido
        try { fs.unlinkSync(pfxPath); } catch(e) {}
        return res.status(400).json({ error: `Certificado inválido ou senha incorreta: ${info.erro}` });
    }

    // Salvar configuração no banco (path e senha criptografada)
    const senha64 = Buffer.from(senha).toString('base64'); // ofuscação simples
    db.run(`CREATE TABLE IF NOT EXISTS configuracoes_sistema (chave TEXT PRIMARY KEY, valor TEXT)`);
    db.run(`INSERT OR REPLACE INTO configuracoes_sistema (chave, valor) VALUES ('pfx_path', ?)`, [pfxPath]);
    db.run(`INSERT OR REPLACE INTO configuracoes_sistema (chave, valor) VALUES ('pfx_password_b64', ?)`, [senha64]);

    // Atualiza variáveis em memória para acesso imediato sem precisar reiniciar o app
    process.env.PFX_PATH = pfxPath;
    process.env.PFX_PASSWORD = senha;

    console.log(`[CERT] Certificado digital atualizado: ${pfxPath} | CN=${info.cn}`);
    res.json({ ok: true, cn: info.cn, org: info.org, validade: info.validade, serial: info.serial });
});

/**
 * DELETE /api/certificado-digital
 * Remove o certificado configurado
 */
app.delete('/api/certificado-digital', authenticateToken, (req, res) => {
    const isDiretoria = req.user?.role === 'Diretoria' 
        || req.user?.role === 'Administrador' 
        || req.user?.departamento === 'Diretoria'
        || (req.user?.grupo_nome && req.user.grupo_nome.toLowerCase() === 'diretoria');
    if (!isDiretoria) {
        return res.status(403).json({ error: 'Apenas usuários da Diretoria podem remover o certificado.' });
    }
    // Remover do banco
    db.run(`DELETE FROM configuracoes_sistema WHERE chave IN ('pfx_path','pfx_password_b64')`);
    // Remover arquivo físico do CERT_DIR
    const certFile = path.join(CERT_DIR, 'certificado.pfx');
    if (fs.existsSync(certFile)) { try { fs.unlinkSync(certFile); } catch(e) {} }
    // Limpar env vars em memória
    delete process.env.PFX_PATH;
    delete process.env.PFX_PASSWORD;
    res.json({ ok: true, message: 'Certificado removido.' });
});

/**
 * POST /api/certificado-digital/testar
 * Testa assinatura com um PDF de exemplo para validar o certificado
 */
app.post('/api/certificado-digital/testar', authenticateToken, async (req, res) => {
    const disp = signPdfPfx.verificarDisponibilidade();
    if (!disp.disponivel) {
        return res.status(400).json({ ok: false, erro: disp.motivo });
    }
    try {
        // Criar um PDF mínimo de teste via pdf-lib
        const { PDFDocument } = require('pdf-lib');
        const pdf = await PDFDocument.create();
        const pg  = pdf.addPage();
        pg.drawText('Teste de Assinatura Digital - America Rental', { x: 50, y: 700, size: 16 });
        pg.drawText(`Data: ${new Date().toLocaleString('pt-BR')}`, { x: 50, y: 670, size: 12 });
        const pdfBytes = await pdf.save({ useObjectStreams: false });

        const pdfAssinado = await signPdfPfx.assinarPDF(Buffer.from(pdfBytes));
        console.log(`[CERT-TEST] Tamanho do PDF assinado: ${pdfAssinado.length} bytes`);
        res.json({ ok: true, tamanho_bytes: pdfAssinado.length, message: '✅ Assinatura digital funcionando corretamente!' });
    } catch(e) {
        res.status(500).json({ ok: false, erro: e.message });
    }
});

// Ao inicializar o servidor: carregar PFX_PATH e PFX_PASSWORD do banco se não estiverem no env
setTimeout(() => {
    // 1º: Verificar se o arquivo existe direto no CERT_DIR (persistência automática)
    const certFilePadrao = path.join(CERT_DIR, 'certificado.pfx');
    if (!process.env.PFX_PATH && fs.existsSync(certFilePadrao)) {
        process.env.PFX_PATH = certFilePadrao;
        console.log(`[CERT] Certificado encontrado automaticamente no disco: ${certFilePadrao}`);
    }

    // 2º: Carregar do banco de dados (fallback)
    db.run(`CREATE TABLE IF NOT EXISTS configuracoes_sistema (chave TEXT PRIMARY KEY, valor TEXT)`, () => {
        if (!process.env.PFX_PATH) {
            db.get(`SELECT valor FROM configuracoes_sistema WHERE chave = 'pfx_path'`, [], (err, row) => {
                if (row?.valor && fs.existsSync(row.valor)) {
                    process.env.PFX_PATH = row.valor;
                    console.log(`[CERT] PFX_PATH carregado do banco: ${row.valor}`);
                }
            });
        }
        if (!process.env.PFX_PASSWORD) {
            db.get(`SELECT valor FROM configuracoes_sistema WHERE chave = 'pfx_password_b64'`, [], (err, row) => {
                if (row?.valor) {
                    process.env.PFX_PASSWORD = Buffer.from(row.valor, 'base64').toString();
                    console.log(`[CERT] PFX_PASSWORD carregado do banco.`);
                }
            });
        }
        if (process.env.PFX_PATH) {
            console.log(`[CERT] ✅ Certificado digital pronto para uso: ${process.env.PFX_PATH}`);
        } else {
            console.log(`[CERT] ⚠️  Nenhum certificado configurado. Configure em Diretoria → Certificado Digital.`);
        }
    });
}, 3000);


// Tratamento de Exceções Globais
process.on('uncaughtException', (err) => {
    console.error('--- ERRO FATAL (Uncaught Exception) ---');
    console.error(err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('--- PROMESSA NÃƒO TRATADA (Unhandled Rejection) ---');
    console.error(reason);
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log('Versão do Servidor: V28_FINAL_FIX');
    console.log(`Caminho de Armazenamento Local: ${BASE_UPLOAD_PATH}`);
});
