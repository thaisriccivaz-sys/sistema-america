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

// MIGRATION: Atualizar antigos registros "Audiometria" para "Exames Complementares"
db.run("UPDATE documentos SET document_type = 'Exames Complementares' WHERE document_type = 'Audiometria'", (err) => {
    if (err) console.error("Erro na migration Exames Complementares:", err);
    else console.log("Migration 'Audiometria -> Exames Complementares' executada (se houver registros).");
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
        const cloudName = isAtestado
            ? doc.file_name.replace(/_\d{8}_\d{6}(\.\w+)$/, '$1')
            : `${formatarPasta(doc.document_type || doc.tab_name).replace(/\s+/g, '_')}_${docYear}_${safeColab}.pdf`;

        console.log(`[OD-AUTO] doc=${docId} tab=${doc.tab_name} → ${targetDir}/${cloudName}`);
        await onedrive.ensurePath(targetDir);
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
app.get('/api/version', (req, res) => res.json({ version: 'V39_ASSINAFY_BG_FIX_CONCLUIDO' }));

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
const authenticateToken = (req, res, next) => {
    // const authHeader = req.headers['authorization'];
    // const token = authHeader && authHeader.split(' ')[1];
    // if (!token) return res.status(401).json({ error: 'Acesso negado' });
    // jwt.verify(token, SECRET_KEY, (err, user) => {
    //     if (err) return res.status(403).json({ error: 'Token inválido' });
    //     req.user = user;
    //     next();
    // });
    next(); 
};

// --- ROTAS DE AUTENTICAÃ‡ÃƒO ---
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM usuarios WHERE username = ?', [username], (err, user) => {
        if (err || !user) return res.status(401).json({ error: 'Usuário ou senha incorretos' });
        const valid = bcrypt.compareSync(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Usuário ou senha incorretos' });
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY, { expiresIn: '8h' });
        res.json({ token, user: { username: user.username, role: user.role } });
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

            if (effectiveStatus === 'Ativo') stats.ativos += 1;
            else if (effectiveStatus === 'Férias') stats.ferias += 1;
            else if (effectiveStatus === 'Afastado') stats.afastados += 1;
            else if (effectiveStatus === 'Desligado') stats.desligados += 1;
        });
        res.json(stats);
    });
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

    if (!nomeOriginal || !data.cpf) {
        return res.status(400).json({ error: "Nome e CPF são campos obrigatórios" });
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
    
    const { colaborador_id, tab_name, document_type, year, month, vencimento, atestado_tipo, atestado_inicio, atestado_fim } = req.body;
    const file_path = req.file.path;
    const file_name = req.file.originalname;

    const checkSql = 'SELECT id, file_path FROM documentos WHERE colaborador_id = ? AND tab_name = ? AND document_type = ?' 
        + (year ? ' AND year = ?' : ' AND year IS NULL') 
        + (month ? ' AND month = ?' : ' AND month IS NULL');
    
    let params = [colaborador_id, tab_name, document_type];
    if (year) params.push(year);
    if (month) params.push(month);

    db.get(checkSql, params, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Abas que permitem múltiplos arquivos (histórico cumulativo)
        const abasMultiplas = ['Advertências', 'Multas', 'Atestados', 'Boletim de ocorrência', 'Pagamentos', 'Terapia'];
        const isMultiplo = abasMultiplas.includes(tab_name);

        if (row && !isMultiplo) {
            // Se já existe e NÃƒO é aba de histórico, atualiza (sobrescreve banco e apaga disco)
            if (fs.existsSync(row.file_path)) {
                try { fs.unlinkSync(row.file_path); } catch(e) {}
            }
            db.run('UPDATE documentos SET file_name = ?, file_path = ?, upload_date = CURRENT_TIMESTAMP, vencimento = ?, atestado_tipo = ?, atestado_inicio = ?, atestado_fim = ? WHERE id = ?',
                [file_name, file_path, vencimento || null, atestado_tipo || null, atestado_inicio || null, atestado_fim || null, row.id], function(updateErr) {
                    if (updateErr) return res.status(500).json({ error: updateErr.message });
                    
                    // Sincronizar com foto de perfil se for na aba "Fotos"
                    if (tab_name === 'Fotos' && ['.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(file_path).toLowerCase())) {
                        db.run("UPDATE colaboradores SET foto_path = ? WHERE id = ?", [file_path, colaborador_id]);
                    }

                    // --- ESPELHAMENTO ONEDRIVE (API) ---
                    if (onedrive && tab_name !== 'ASO') {
                        (async () => {
                            try {
                                const onedriveBasePath = process.env.ONEDRIVE_BASE_PATH || "RH/1.Colaboradores/Sistema";
                                const safeColab = formatarNome(req.body.colaborador_nome || "DESCONHECIDO");
                                const safeTab = formatarPasta(tab_name).toUpperCase();
                                let targetDir = `${onedriveBasePath}/${safeColab}/${safeTab}`;
                                if (year && year !== 'null' && year !== 'undefined' && year !== '') targetDir += `/${year.replace(/[^0-9]/g, '')}`;
                                await onedrive.ensurePath(targetDir);
                                const fileBuffer = fs.readFileSync(file_path);
                                // Para Atestados usa o custom_name exato; outros usam file_name do multer
                                const cloudFileName = (tab_name === 'Atestados' && req.body.custom_name)
                                    ? `${req.body.custom_name}.pdf`
                                    : path.basename(file_path);
                                await onedrive.uploadToOneDrive(targetDir, cloudFileName, fileBuffer);
                                console.log(`[OneDrive] Upload OK: ${cloudFileName}`);
                            } catch (e) { console.error("Erro async OneDrive (update):", e.message); }
                        })();
                    }

                    res.json({ message: 'Documento atualizado', id: row.id, file_path });
                });
        } else {
            // Se é aba de histórico OU não existia, insere novo registro
            db.run(`INSERT INTO documentos (colaborador_id, tab_name, document_type, file_name, file_path, year, month, vencimento, atestado_tipo, atestado_inicio, atestado_fim) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [colaborador_id, tab_name, document_type, file_name, file_path, year || null, month || null, vencimento || null, atestado_tipo || null, atestado_inicio || null, atestado_fim || null],
                function(insertErr) {
                    if (insertErr) return res.status(500).json({ error: insertErr.message });

                    // Sincronizar com foto de perfil se for na aba "Fotos"
                    if (tab_name === 'Fotos' && ['.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(file_path).toLowerCase())) {
                        db.run("UPDATE colaboradores SET foto_path = ? WHERE id = ?", [file_path, colaborador_id]);
                    }

                    // --- ESPELHAMENTO ONEDRIVE ---
                    // Usa a mesma lógica do force-onedrive-sync (comprovada) com o ID real do doc
                    const newDocId = this.lastID;
                    if (tab_name !== 'ASO') {
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
    db.get('SELECT file_path, file_name FROM documentos WHERE id = ?', [req.params.id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Documento não encontrado' });
        if (!fs.existsSync(row.file_path)) return res.status(404).json({ error: 'Arquivo físico não encontrado' });
        
        res.download(row.file_path, row.file_name);
    });
});

// Rota para VISUALIZAR inline no browser (sem forçar download)
app.get('/api/documentos/view/:id', authenticateToken, (req, res) => {
    db.get('SELECT file_path, file_name FROM documentos WHERE id = ?', [req.params.id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Documento não encontrado' });
        if (!fs.existsSync(row.file_path)) return res.status(404).json({ error: 'Arquivo físico não encontrado' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(row.file_name)}"`);
        fs.createReadStream(row.file_path).pipe(res);
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
    const { nome, documentos_obrigatorios } = req.body;
    db.run("INSERT INTO cargos (nome, documentos_obrigatorios) VALUES (?, ?)", 
        [nome, documentos_obrigatorios || ""], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.status(201).json({ id: this.lastID, nome });
    });
});

app.put('/api/cargos/:id', authenticateToken, (req, res) => {
    const { nome, documentos_obrigatorios } = req.body;
    console.log(`Recebida alteração para cargo ${req.params.id}:`, { nome, documentos_obrigatorios });

    db.get("SELECT nome FROM cargos WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        
        let query = "UPDATE cargos SET documentos_obrigatorios = ?";
        let params = [documentos_obrigatorios || ""];
        
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
    db.run("INSERT INTO geradores (nome, conteudo, variaveis) VALUES (?, ?, ?)", 
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
    db.run("DELETE FROM geradores WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Gerador removido' });
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
                <h2 style="color: #0f4c81; border-bottom: 2px solid #0f4c81; padding-bottom: 10px;">📋 Atestado Médico — Inclusão eSocial</h2>
                <p>Encaminhamos o atestado médico do colaborador abaixo para <strong>inclusão no cadastro do eSocial</strong>.</p>

                <div style="background:#f1f5f9; padding:15px; border-radius:8px; margin:20px 0;">
                    <p style="margin:4px 0;"><strong>Colaborador:</strong> ${colab.nome_completo}</p>
                    <p style="margin:4px 0;"><strong>CPF:</strong> ${colab.cpf || '-'}</p>
                    <p style="margin:4px 0;"><strong>Cargo:</strong> ${colab.cargo || '-'}</p>
                    <p style="margin:4px 0;"><strong>Departamento:</strong> ${colab.departamento || '-'}</p>
                </div>

                <div style="background:#fff; border:1px solid #cbd5e1; padding:15px; border-radius:8px; margin:20px 0;">
                    <p style="margin:4px 0;"><strong>CID:</strong> <span style="color:#0f4c81; font-weight:700;">${cidCode}</span> — ${cidDesc}</p>
                    <p style="margin:4px 0;"><strong>Início do afastamento:</strong> ${dataInicio}</p>
                    <p style="margin:4px 0;"><strong>Fim do afastamento:</strong> ${dataFim}</p>
                    <p style="margin:4px 0;"><strong>Tipo:</strong> Atestado em ${tipo}</p>
                </div>

                <p>O documento em PDF está em anexo neste e-mail.</p>
                <p style="margin-top:30px; font-size:0.9em; color:#7f8c8d;">Atenciosamente,<br>Equipe de RH — América Rental</p>
            </div>
        `;

        const transporter = nodemailer.createTransport(SMTP_CONFIG);
        await transporter.sendMail({
            from: `"RH América Rental" <${SMTP_CONFIG.auth.user}>`,
            to: email_to,
            subject: `Atestado Médico eSocial — ${colab.nome_completo} (${cidCode})`,
            html: htmlContent,
            attachments: [
                { filename: 'logo.png', path: logoPath, cid: 'empresa-logo' },
                { filename: attachmentName, path: filePath, contentType: 'application/pdf' }
            ]
        });

        console.log(`[ATESTADO CONTAB] Enviado para ${email_to} | Doc: ${document_id} | Colab: ${colab.nome_completo}`);
        res.json({ sucesso: true, message: 'E-mail enviado com sucesso para a contabilidade!' });

    } catch (error) {
        console.error('[ATESTADO CONTAB] ERRO:', error.message);
        res.status(500).json({ sucesso: false, error: error.message });
    }
});


/**
 * WEBHOOK UNIFICADO: Escuta criação de links e conclusão de assinaturas
 */
app.post("/webhook/assinafy", async (req, res) => {
    try {
        const payload = req.body;
        console.log('--- WEBHOOK ASSINAFY RECEBIDO ---', JSON.stringify(payload));

        // Tentar encontrar o ID do documento em várias estruturas possíveis
        const assinafyId = payload.document_id || payload.documentId || payload.id ||
                          (payload.data && (payload.data.document_id || payload.data.id)) ||
                          (payload.object && payload.object.id);

        if (!assinafyId) {
            console.warn("[WEBHOOK] Recebido sem assinafyId identificável.");
            return res.status(200).send("OK");
        }

        // 1. Tratar status de conclusão (Assinado/Pronto) e baixar PDF assinado
        const event = (payload.event || '').toLowerCase();
        if (event.includes('ready') || event.includes('signed') || event.includes('completed')) {
            console.log(`[WEBHOOK] Documento ${assinafyId} ASSINADO - baixando PDF assinado...`);

            // Marcar como assinado no banco
            db.run('UPDATE documentos SET assinafy_status = ? WHERE assinafy_id = ?', ['Assinado', assinafyId]);

            // Baixar PDF assinado do Assinafy em background
            setImmediate(async () => {
                try {
                    const https = require('https');
                    const API_KEY = 'AxaT-FiXBckHqEYV0s_MtUhLF3pReRz3dX4zVpC173vmjDwzLGHYtDJuQje4-4Pd';

                    // Buscar URL de download no Assinafy
                    const downloadUrlRes = await new Promise((resolve, reject) => {
                        const options = {
                            hostname: 'api.assinafy.com.br',
                            path: `/v1/documents/${assinafyId}`,
                            method: 'GET',
                            headers: { 'X-Api-Key': API_KEY, 'Accept': 'application/json' }
                        };
                        const req2 = https.request(options, (r) => {
                            const chunks = [];
                            r.on('data', c => chunks.push(c));
                            r.on('end', () => {
                                try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
                                catch(e) { reject(e); }
                            });
                        });
                        req2.on('error', reject);
                        req2.end();
                    });

                    const signedUrl = extractSignedUrl(downloadUrlRes?.data || downloadUrlRes);

                    if (!signedUrl) {
                        console.warn('[WEBHOOK] PDF assinado: URL de download não encontrada na resposta:', JSON.stringify(downloadUrlRes).substring(0, 300));
                        return;
                    }

                    // Buscar o registro do documento no banco para saber onde salvar
                    const docRow = await new Promise((resolve, reject) => {
                        db.get('SELECT d.*, c.nome_completo FROM documentos d JOIN colaboradores c ON c.id = d.colaborador_id WHERE d.assinafy_id = ?', [assinafyId], (err, row) => {
                            if (err) reject(err); else resolve(row);
                        });
                    });

                    if (!docRow) { console.warn('[WEBHOOK] Documento não encontrado no banco.'); return; }

                    // Definir caminho para salvar o PDF assinado
                    const storagePath = process.env.STORAGE_PATH || path.join(__dirname, 'data', 'uploads');
                    const signedDir = path.join(storagePath, 'assinados');
                    if (!fs.existsSync(signedDir)) fs.mkdirSync(signedDir, { recursive: true });

                    const signedFileName = `ASSINADO_${path.basename(docRow.file_name, '.pdf')}_${Date.now()}.pdf`;
                    const signedFilePath = path.join(signedDir, signedFileName);

                    // Baixar e salvar o arquivo
                    await new Promise((resolve, reject) => {
                        const urlObj = new URL(signedUrl);
                        const proto = urlObj.protocol === 'https:' ? require('https') : require('http');
                        const file = fs.createWriteStream(signedFilePath);
                        proto.get(signedUrl, (response) => {
                            response.pipe(file);
                            file.on('finish', () => { file.close(); resolve(); });
                        }).on('error', (err) => { fs.unlink(signedFilePath, () => {}); reject(err); });
                    });

                    // Salvar caminho do arquivo assinado no banco + data
                    db.run('UPDATE documentos SET signed_file_path = ?, assinafy_signed_at = COALESCE(assinafy_signed_at, CURRENT_TIMESTAMP) WHERE assinafy_id = ?', [signedFilePath, assinafyId]);
                    console.log(`[WEBHOOK] PDF assinado salvo em: ${signedFilePath}`);

                    // AUTOMATIC ONEDRIVE SYNC FOR ASSINADO (Webhook)
                    if (onedrive) {
                        try {
                            const onedriveBasePath = process.env.ONEDRIVE_BASE_PATH || "RH/1.Colaboradores/Sistema";
                            const safeColab = formatarNome(docRow.nome_completo || "DESCONHECIDO");
                            // Pasta = tab_name normalizado (ex: ASO, EXAMES_COMPLEMENTARES)
                            const safeTab = formatarPasta(docRow.tab_name || 'DOCUMENTOS').toUpperCase();
                            const docYear = docRow.year && docRow.year !== 'null' && docRow.year !== '' ? String(docRow.year).replace(/[^0-9]/g, '') : String(new Date().getFullYear());
                            // Caminho: Base/NOME_COLAB/TAB/ANO
                            const targetDir = `${onedriveBasePath}/${safeColab}/${safeTab}/${docYear}`;
                            
                            console.log(`[OneDrive WH] Sincronizando para: ${targetDir}`);

                            // Garantir que a pasta existe antes de salvar
                            await onedrive.ensurePath(targetDir);
                            
                            const fBuffer = fs.readFileSync(signedFilePath);
                            // Nome padrão: TipoDoc_Ano_NomeColab.pdf
                            const safeType = formatarPasta(docRow.document_type || docRow.tab_name || 'Documento').replace(/\s+/g, '_');
                            const cloudName = `${safeType}_${docYear}_${safeColab}.pdf`;
                            
                            await onedrive.uploadToOneDrive(targetDir, cloudName, fBuffer);
                            console.log(`[OneDrive] ✓ Assinado sincronizado WH: ${cloudName}`);
                        } catch (e) { 
                            console.error("[OneDrive] Erro de sync assinado WH:", e.message); 
                        }
                    }

                } catch(err) {
                    console.error('[WEBHOOK] Erro ao baixar PDF assinado:', err.message);
                }
            });
        }

        // 2. Tratar captura de link (Criação/Envio)
        let signLink = payload.sign_url || payload.signUrl;
        if (!signLink && payload.signers && payload.signers[0]) {
            signLink = payload.signers[0].sign_url || payload.signers[0].url;
        }
        if (!signLink && payload.data) {
            const d = payload.data;
            signLink = d.sign_url || d.signUrl || (d.signers && d.signers[0] && (d.signers[0].sign_url || d.signers[0].url));
        }

        if (signLink) {
            console.log(`[WEBHOOK] Capturando link para Documento ${assinafyId}: ${signLink}`);
            await salvarLinkAssinatura(assinafyId, signLink);
        }

        res.status(200).send("OK");

    } catch (error) {
        console.error("Erro processando webhook:", error);
        res.status(200).send("OK");
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

/**
 * Função para atualizar DB com link e status
 */
async function salvarLinkAssinatura(assinafyDocId, link) {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE documentos SET assinafy_url = ?, assinafy_status = ? WHERE assinafy_id = ?',
            [link, 'Pendente', assinafyDocId],
            (err) => { if (err) reject(err); else resolve(); }
        );
    });
}

// --- SERVIR ARQUIVOS ESTÃTICOS ---
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/files', express.static(path.join(__dirname, '..', '..'))); 

// Middleware de Erro Global
app.use((err, req, res, next) => {
    console.error("--- ERRO DETECTADO NO SERVIDOR ---");
    console.error(err);
    res.status(500).json({ error: "Erro interno no servidor." });
});

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
