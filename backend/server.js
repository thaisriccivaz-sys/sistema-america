const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');
const nodemailer = require('nodemailer');

// --- CONFIGURAÇÃO SMTP (Preencher com dados reais para o e-mail funcionar) ---
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
const onedrive = require('./utils/onedrive');

// --- CONFIGURAÇÃO DE PASTAS PADRÃO ---
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
    if (!process.env.ONEDRIVE_CLIENT_ID) {
        console.warn("[OneDrive] Pulando sincronização: ONEDRIVE_CLIENT_ID não configurado.");
        return { sucesso: false, error: "OneDrive não configurado" };
    }
    
    // Calcula o caminho ANTES para retornar na resposta
    const nomePasta = formatarNome(nomeCompleto);
    // V20: O raciocínio mudou. Foco total em 'My Files' para aparecer na pasta sincronizada do Windows.
    const onedriveBasePath = "Documentos - America Rental/RH/1.Colaboradores/Sistema";
    const onedrivePath = `${onedriveBasePath}/${nomePasta}`;
    
    // DISPARAR TUDO EM MODO SEGUNDO PLANO (Zero Wait)
    console.log(`[OneDrive V20] Modo MyFiles ativo para ${nomeCompleto}. Alvo: ${onedriveBasePath}`);

    (async () => {
        try {
            console.log(`[OneDrive Background V9] Sincronizando ${nomeCompleto}...`);
            await onedrive.ensurePath(onedrivePath);
            await Promise.all(FOLDERS.map(f => onedrive.ensureFolder(`${onedrivePath}/${f}`)));
            console.log(`[OneDrive Background V9] SUCESSO COMPLETO para ${nomeCompleto}`);
        } catch (e) {
            console.error(`[OneDrive Background V9 Error] ${nomeCompleto}:`, e.message);
        }
    })();

    return { 
        sucesso: true, 
        message: "Comando enviado à Microsoft! As pastas serão criadas em segundo plano. Verifique o seu OneDrive em alguns instantes.",
        caminho: onedrivePath,
        versao: "V20_MYFILES_MODE" 
    };
}

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || 'america_rental_secret_key_123';

// Configuração de Armazenamento (Dinâmico para Render/Linux ou Disco Persistente)
const BASE_PATH = process.env.STORAGE_PATH || path.join(__dirname, 'data', 'Colaboradores');
const BASE_UPLOAD_PATH = BASE_PATH; // Mantendo compatibilidade

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


try {
    if (!fs.existsSync(BASE_UPLOAD_PATH)) {
        fs.mkdirSync(BASE_UPLOAD_PATH, { recursive: true });
        console.log("DIRETÓRIO BASE DE UPLOAD CRIADO:", BASE_UPLOAD_PATH);
    }
} catch (e) {
    console.error("AVISO CRÍTICO: Não foi possível criar a pasta base de upload:", e.message);
    console.error("Caminho tentado:", BASE_UPLOAD_PATH);
    // Não encerramos o processo para permitir que o servidor suba em modo leitura ou com falhas parciais
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Garantindo que nomes de pastas sejam SEM ACENTOS e em MAIÚSCULO para compatibilidade total
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
                console.log("DIRETÓRIO CRIADO:", finalDir);
            }
            cb(null, finalDir);
        } catch (err) {
            console.error("ERRO AO CRIAR DIRETÓRIO DE UPLOAD:", err);
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

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/files', express.static(path.join(__dirname, '..', '..'))); // Exposes 'Teste Sistema'

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

// --- ROTAS DE AUTENTICAÇÃO ---
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
    
    // Criar pastas independemente do status para garantir que a estrutura exista
    try {
        if (!fs.existsSync(pastaColaborador)) {
            fs.mkdirSync(pastaColaborador, { recursive: true });
            FOLDERS.forEach(p => {
                const subPath = path.join(pastaColaborador, p);
                if (!fs.existsSync(subPath)) fs.mkdirSync(subPath, { recursive: true });
            });
        }
        
        // Ativar sincronização OneDrive em segundo plano
        syncColaboradorOneDrive(nomeOriginal).catch(e => console.error("Erro async OneDrive:", e.message));

    } catch (erro) {
        console.error("ERRO AO CRIAR PASTAS LOCAIS:", erro);
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

    const values = colunas.map(col => {
        const val = data[col];
        if (col === 'status') return val || 'Ativo';
        return val === undefined ? null : val;
    });

    const query = `INSERT INTO colaboradores (${colunas.join(', ')}) VALUES (${Array(colunas.length).fill('?').join(', ')})`;

    db.run(query, values, function(err) {
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

        res.status(201).json({ id: newColabId, sucesso: true });
    });
});

/**
 * ROTA DE DIAGNÓSTICO: Testar Conexão OneDrive
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
                basePathItems = [`⚠️ Erro no caminho: ${pErr.message}`];
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

        db.run(query, values, function(updateErr) {
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
                
                // Sincronizar com OneDrive em segundo plano
                syncColaboradorOneDrive(newName).catch(e => console.error("Erro sync update OneDrive:", e.message));
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
                    versao: "V16_HARDFIX",
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
        const pasta = path.join(BASE_PATH, safeNome, "Fotos");
        if (!fs.existsSync(pasta)) fs.mkdirSync(pasta, { recursive: true });

        // Lógica de numeração sequencial (01, 02, 03...)
        let index = 1;
        let filename;
        let filepath;
        do {
            const suffix = index.toString().padStart(2, '0');
            filename = `FOTO_${safeNome}_${suffix}.jpg`;
            filepath = path.join(pasta, filename);
            index++;
        } while (fs.existsSync(filepath));

        const caminhoRelativo = path.posix.join('files', 'Colaboradores', safeNome, 'Fotos', filename);

        // Processamento Automático (Sharp) - Apenas redimensionamento e recorte inteligente
        await sharp(req.file.buffer)
            .resize(800, 1000, {
                fit: sharp.fit.cover,
                position: sharp.strategy.attention // Corta inteligentemente focando no rosto/atenção
            })
            .jpeg({ quality: 95, mozjpeg: true })
            .toFile(filepath);

        console.log("Foto salva com padronização de tamanho em:", filepath);

        db.run(
            "UPDATE colaboradores SET foto_path = ? WHERE id = ?",
            [caminhoRelativo, id]
        );

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
            log(`Arquivo NÃO encontrado: ${file_path}`);
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
    
    const { colaborador_id, tab_name, document_type, year, month, vencimento } = req.body;
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
            // Se já existe e NÃO é aba de histórico, atualiza (sobrescreve banco e apaga disco)
            if (fs.existsSync(row.file_path)) {
                try { fs.unlinkSync(row.file_path); } catch(e) {}
            }
            db.run('UPDATE documentos SET file_name = ?, file_path = ?, upload_date = CURRENT_TIMESTAMP, vencimento = ? WHERE id = ?',
                [file_name, file_path, vencimento || null, row.id], function(updateErr) {
                    if (updateErr) return res.status(500).json({ error: updateErr.message });
                    
                    // Sincronizar com foto de perfil se for na aba "Fotos"
                    if (tab_name === 'Fotos' && ['.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(file_path).toLowerCase())) {
                        db.run("UPDATE colaboradores SET foto_path = ? WHERE id = ?", [file_path, colaborador_id]);
                    }

                    // --- ESPELHAMENTO ONEDRIVE (API) ---
                    try {
                        const onedriveBasePath = process.env.ONEDRIVE_BASE_PATH || "RH/1.Colaboradores/Sistema";
                        const safeColab = formatarNome(req.body.colaborador_nome || "DESCONHECIDO");
                        const safeTab = formatarPasta(tab_name).toUpperCase();
                        let targetDir = `${onedriveBasePath}/${safeColab}/${safeTab}`;
                        if (year && year !== 'null' && year !== 'undefined' && year !== '') targetDir += `/${year.replace(/[^0-9]/g, '')}`;
                        
                        const fileBuffer = fs.readFileSync(file_path);
                        onedrive.uploadToOneDrive(targetDir, file_name, fileBuffer).catch(e => console.error("Erro async OneDrive:", e.message));
                    } catch (e) { console.error("Erro ao preparar upload OneDrive:", e.message); }

                    res.json({ message: 'Documento atualizado', id: row.id, file_path });
                });
        } else {
            // Se é aba de histórico OU não existia, insere novo registro
            db.run(`INSERT INTO documentos (colaborador_id, tab_name, document_type, file_name, file_path, year, month, vencimento) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [colaborador_id, tab_name, document_type, file_name, file_path, year || null, month || null, vencimento || null],
                function(insertErr) {
                    if (insertErr) return res.status(500).json({ error: insertErr.message });

                    // Sincronizar com foto de perfil se for na aba "Fotos"
                    if (tab_name === 'Fotos' && ['.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(file_path).toLowerCase())) {
                        db.run("UPDATE colaboradores SET foto_path = ? WHERE id = ?", [file_path, colaborador_id]);
                    }

                    // --- ESPELHAMENTO ONEDRIVE (API) ---
                    try {
                        const onedriveBasePath = process.env.ONEDRIVE_BASE_PATH || "RH/1.Colaboradores/Sistema";
                        const safeColab = formatarNome(req.body.colaborador_nome || "DESCONHECIDO");
                        const safeTab = formatarPasta(tab_name).toUpperCase();
                        let targetDir = `${onedriveBasePath}/${safeColab}/${safeTab}`;
                        if (year && year !== 'null' && year !== 'undefined' && year !== '') targetDir += `/${year.replace(/[^0-9]/g, '')}`;
                        
                        const fileBuffer = fs.readFileSync(file_path);
                        onedrive.uploadToOneDrive(targetDir, file_name, fileBuffer).catch(e => console.error("Erro async OneDrive:", e.message));
                    } catch (e) { console.error("Erro ao preparar upload OneDrive:", e.message); }

                    res.status(201).json({ message: 'Documento salvo', id: this.lastID, file_path });
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

app.use((err, req, res, next) => {
    console.error('ERRO NO SERVIDOR:', err.stack);
    res.status(500).json({ error: 'Erro interno no servidor', message: err.message });
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
                return res.status(500).json({ sucesso: false, error: 'Erro ao enviar e-mail. Verifique a configuração SMTP no backend.' });
            }
            
            // Salvar a data de envio e a data agendada no banco de dados
            const hoje = new Date();
            const dataEnvioStr = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
            
            const [y, m, d] = data_exame.split('-');
            const dataAgendadaStr = `${d}/${m}/${y}`;

            db.run('UPDATE colaboradores SET aso_email_enviado = ?, aso_exame_data = ? WHERE id = ?', [dataEnvioStr, dataAgendadaStr, colaborador_id], (err) => {
                if (err) console.error('Erro ao salvar aso_email_enviado/aso_exame_data:', err);
                res.json({ sucesso: true, message: 'E-mail enviado com sucesso', data_envio: dataEnvioStr, data_agendada: dataAgendadaStr });
            });
        });
    });
});
// --- INTEGRAÇÃO ASSINAFY ---
// Configuração Assinafy (Preencha aqui com sua chave de API e Account ID)
const ASSINAFY_CONFIG = {
    apiKey: 'AxaT-FiXBckHqEYV0s_MtUhLF3pReRz3dX4zVpC173vmjDwzLGHYtDJuQje4-4Pd',
    accountId: '10237785fb23cf473d54845a013e',
    baseUrl: 'https://api.assinafy.com.br/v1'
};

/**
 * Endpoint para fazer upload direto para o Assinafy e iniciar processo de assinatura
 */
app.post('/api/assinafy/upload', async (req, res) => {
    const { document_id, colaborador_id } = req.body;
    
    if (!document_id || !colaborador_id) {
        return res.status(400).json({ error: 'ID do documento e colaborador são obrigatórios.' });
    }

    if (ASSINAFY_CONFIG.apiKey === 'SUA_CHAVE_API_AQUI') {
        return res.status(401).json({ error: 'Credenciais do Assinafy não configuradas no backend (server.js).' });
    }

    try {
        // 1. Buscar dados do documento e colaborador no nosso banco
        const doc = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM documentos WHERE id = ?', [document_id], (err, row) => {
                if (err) reject(err); else resolve(row);
            });
        });

        const colab = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM colaboradores WHERE id = ?', [colaborador_id], (err, row) => {
                if (err) reject(err); else resolve(row);
            });
        });

        if (!doc || !colab) throw new Error('Documento ou Colaborador não encontrado.');
        
        const filePath = path.resolve(doc.file_path);
        if (!fs.existsSync(filePath)) throw new Error('Arquivo não encontrado no servidor.');

        // 2. Upload do arquivo para o Assinafy
        const fileContent = fs.readFileSync(filePath);
        const fileName = doc.file_name;

        const formData = new FormData();
        const blob = new Blob([fileContent], { type: 'application/pdf' });
        formData.append('file', blob, fileName);

        const uploadRes = await fetch(`${ASSINAFY_CONFIG.baseUrl}/accounts/${ASSINAFY_CONFIG.accountId}/documents`, {
            method: 'POST',
            headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey },
            body: formData
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.message || 'Erro no upload para Assinafy');
        
        const assinafyDocId = uploadData.data ? uploadData.data.id : uploadData.id;

        // Pequena pausa (5s) para garantir que o Assinafy processe o documento
        // Evita o erro 'metadata_processing'
        await new Promise(resolve => setTimeout(resolve, 5000));

        // 3. Criar/Encontrar e Atualizar Signatário (Colaborador)
        const CENTRAL_EMAIL = 'americasistema48@gmail.com'; // E-mail fornecido pelo usuário
        const emailObri = CENTRAL_EMAIL; // O usuário pediu para deixar APENAS este e-mail
        
        const cpfLimpo = colab.cpf ? colab.cpf.replace(/\D/g, '') : null;
        const foneLimpo = colab.telefone ? colab.telefone.replace(/\D/g, '') : null;

        if (!cpfLimpo) {
            throw new Error(`O CPF é obrigatório para o Assinafy.`);
        }

        console.log(`[ASSINAFY] Iniciando sincronização do colaborador: ${colab.nome_completo} (CPF: ${cpfLimpo})`);

        // Tentar buscar ID pelo CPF primeiro (mais robusto que tentar criar e pegar conflito)
        let assinafySignerId = null;
        try {
            const searchRes = await fetch(`${ASSINAFY_CONFIG.baseUrl}/accounts/${ASSINAFY_CONFIG.accountId}/signers?tax_id=${cpfLimpo}`, {
                headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey }
            });
            const searchData = await searchRes.json();
            const list = searchData.data || searchData;
            if (Array.isArray(list) && list.length > 0) {
                assinafySignerId = list[0].id;
                console.log(`[ASSINAFY] Signatário já existe com ID: ${assinafySignerId}`);
            }
        } catch (e) { console.warn('[ASSINAFY] Erro na busca por CPF:', e.message); }

        if (!assinafySignerId) {
            // CRIAR NOVO se não encontrou
            console.log("[ASSINAFY] Criando novo signatário...");
            const createRes = await fetch(`${ASSINAFY_CONFIG.baseUrl}/accounts/${ASSINAFY_CONFIG.accountId}/signers`, {
                method: 'POST',
                headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name: colab.nome_completo,
                    email: emailObri,
                    tax_id: cpfLimpo,
                    whatsapp_phone_number: foneLimpo
                })
            });
            const createData = await createRes.json();
            if (createRes.ok) {
                assinafySignerId = createData.data ? createData.data.id : createData.id;
            } else {
                console.warn('[ASSINAFY] Erro na criação direta:', createData.message);
                // Tentar uma última vez buscar por email se o CPF falhou (raro)
                const searchEmailRes = await fetch(`${ASSINAFY_CONFIG.baseUrl}/accounts/${ASSINAFY_CONFIG.accountId}/signers?email=${emailObri}`, {
                    headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey }
                });
                const searchEmailData = await searchEmailRes.json();
                const listE = searchEmailData.data || searchEmailData;
                if (Array.isArray(listE) && listE.length > 0) {
                    assinafySignerId = listE[0].id;
                }
            }
        }

        if (!assinafySignerId) throw new Error('Não foi possível obter o ID do signatário no Assinafy. Verifique se o CPF e E-mail estão corretos.');

        // 3.5. Nota: O Assinafy não permite atualizar (PUT) dados de signatários que 
        // já possuem documentos pendentes vinculados (erro "Método inválido").
        // Como o e-mail agora é repassado diretamente no passo 'Assignment' abaixo,
        // não precisamos mais forçar o PUT no perfil global do signatário.
        console.log(`[ASSINAFY] Prosseguindo para vinculação com E-mail: ${emailObri}`);

        // 4. Criar a Solicitação de Assinatura (Assignment)
        // Tentamos primeiro o método 'virtual'. Nota: A URL deve incluir /accounts/{accountId}
        let assignmentRes = await fetch(`${ASSINAFY_CONFIG.baseUrl}/accounts/${ASSINAFY_CONFIG.accountId}/documents/${assinafyDocId}/assignments`, {
            method: 'POST',
            headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                signers: [{ signer_id: assinafySignerId, email: emailObri, role: 'signer' }],
                method: 'virtual'
            })
        });

        let assignmentData = await assignmentRes.json();
        
        if (!assignmentRes.ok) {
            console.warn('[ASSINAFY] Falha no método virtual, tentando método email:', assignmentData.message);
            // Tentar novamente com método 'email'
            assignmentRes = await fetch(`${ASSINAFY_CONFIG.baseUrl}/accounts/${ASSINAFY_CONFIG.accountId}/documents/${assinafyDocId}/assignments`, {
                method: 'POST',
                headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    signers: [{ signer_id: assinafySignerId, email: emailObri, role: 'signer' }],
                    method: 'email'
                })
            });
            assignmentData = await assignmentRes.json();
            if (!assignmentRes.ok) throw new Error(assignmentData.message || 'Erro ao criar solicitação de assinatura');
        }

        // 5. Atualizar o banco de dados com ID (para permitir o vínculo via Webhook futuramente)
        await new Promise((resolve, reject) => {
            db.run('UPDATE documentos SET assinafy_id = ?, assinafy_status = ? WHERE id = ?', 
                [assinafyDocId, 'Aguardando Webhook', document_id], (err) => {
                if (err) reject(err); else resolve();
            });
        });

        res.json({ 
            sucesso: true, 
            assinafy_id: assinafyDocId,
            status: 'Aguardando Webhook'
        });

    } catch (err) {
        console.error('ERRO ASSINAFY INTEGRAÇÃO:', err);
        // Retornar JSON sempre para o frontend não quebrar ao tentar dar .json() no erro
        res.status(500).json({ error: err.message });
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

        // 1. Tratar status de conclusão (Assinado/Pronto)
        const event = (payload.event || '').toLowerCase();
        if (event.includes('ready') || event.includes('signed') || event.includes('completed')) {
            console.log(`[WEBHOOK] Documento ${assinafyId} marcado como ASSINADO.`);
            db.run('UPDATE documentos SET assinafy_status = ? WHERE assinafy_id = ?', ['Assinado', assinafyId]);
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
        res.status(200).send("OK"); // Respondemos 200 para evitar que o Assinafy fique repetindo erro
    }
});

/**
 * ROTA TEMPORÁRIA: Reset de Sistema
 * Limpa todos os colaboradores para testes
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

// Middleware de Erro Global (incluindo Multer e erros de filesystem)
app.use((err, req, res, next) => {
    console.error("--- ERRO DETECTADO NO SERVIDOR ---");
    console.error(err);
    
    if (err instanceof multer.MulterError || err.message.includes("Não foi possível criar")) {
        return res.status(500).json({ error: `Falha no Armazenamento: ${err.message}` });
    }
    
    res.status(500).json({ error: "Erro interno no servidor." });
});

// Tratamento de Exceções Globais para evitar 502 no Render
process.on('uncaughtException', (err) => {
    console.error('--- ERRO FATAL (Uncaught Exception) ---');
    console.error(err);
    // No Render, é melhor deixar o processo cair para ele reiniciar limpo se for erro grave,
    // mas logamos tudo primeiro.
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('--- PROMESSA NÃO TRATADA (Unhandled Rejection) ---');
    console.error(reason);
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Versão do Servidor: V5_AUTOMATIC_ONEDRIVE`);
    console.log(`Caminho de Armazenamento Local: ${BASE_UPLOAD_PATH}`);
    console.log(`OneDrive Base Path: ${process.env.ONEDRIVE_BASE_PATH || "RH/1.Colaboradores/Sistema"}`);
    console.log(`OneDrive User: ${process.env.ONEDRIVE_USER_EMAIL || "NÃO CONFIGURADO"}`);
    if (!process.env.ONEDRIVE_CLIENT_ID) console.warn("AVISO: ONEDRIVE_CLIENT_ID não configurado no Render!");
});
