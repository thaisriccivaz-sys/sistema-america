const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');
const nodemailer = require('nodemailer');
const pdfParse = require('pdf-parse');

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

db.run("DELETE FROM geradores WHERE nome = 'AUTORIZAÇÃO DE DESCONTO EM FOLHA DE PAGAMENTO'");


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

// -- DIAGNÓSTICO DE PERSISTÊNCIA ----------------------------------------
const dbPathAtual = process.env.DATABASE_PATH || require('path').join(__dirname, 'data', 'hr_system_v2.sqlite');
if (!process.env.DATABASE_PATH) {
    console.warn('??  AVISO: DATABASE_PATH não definido! O banco está em disco efêmero.');
    console.warn('??  Todos os dados serão PERDIDOS a cada restart do servidor (Render free tier).');
    console.warn(`??  Caminho atual: ${dbPathAtual}`);
    console.warn('??  Configure DATABASE_PATH como variável de ambiente apontando para um Render Disk.');
} else {
    console.log(`?  DATABASE_PATH configurado: ${dbPathAtual}`);
}
// ----------------------------------------------------------------------

// MIGRATION: Atualizar antigos registros "Audiometria" para "Exames Complementares"
db.run("UPDATE documentos SET document_type = 'Exames Complementares' WHERE document_type = 'Audiometria'", (err) => {
    if (err) console.error("Erro na migration Exames Complementares:", err);
    else console.log("Migration 'Audiometria -> Exames Complementares' executada (se houver registros).");
});

// MIGRATION: Novas colunas financeiras
db.run("ALTER TABLE colaboradores ADD COLUMN adiantamento_salarial TEXT", (err) => {
    if (!err) console.log("Coluna adiantamento_salarial adicionada com sucesso.");
});
db.run("ALTER TABLE colaboradores ADD COLUMN adiantamento_valor TEXT", (err) => {
    if (!err) console.log("Coluna adiantamento_valor adicionada com sucesso.");
});
db.run("ALTER TABLE colaboradores ADD COLUMN insalubridade TEXT", (err) => {
    if (!err) console.log("Coluna insalubridade adicionada com sucesso.");
});
db.run("ALTER TABLE colaboradores ADD COLUMN insalubridade_valor TEXT", (err) => {
    if (!err) console.log("Coluna insalubridade_valor adicionada com sucesso.");
});
db.run("ALTER TABLE colaboradores ADD COLUMN conjuge_nome TEXT", (err) => {
    if (!err) console.log("Coluna conjuge_nome adicionada com sucesso.");
});
db.run("ALTER TABLE colaboradores ADD COLUMN conjuge_cpf TEXT", (err) => {
    if (!err) console.log("Coluna conjuge_cpf adicionada com sucesso.");
});
db.run("ALTER TABLE colaboradores ADD COLUMN tem_pensao_alimenticia TEXT DEFAULT 'Não'", (err) => {
    if (!err) console.log("Coluna tem_pensao_alimenticia adicionada com sucesso.");
});
db.run("ALTER TABLE colaboradores ADD COLUMN admissao_status TEXT", (err) => {
    if (!err) console.log("Coluna admissao_status adicionada com sucesso.");
});

// MIGRATION: Multas de Trânsito
db.run(`CREATE TABLE IF NOT EXISTS multas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    colaborador_id INTEGER NOT NULL,
    codigo_infracao TEXT,
    descricao_infracao TEXT,
    placa TEXT,
    veiculo TEXT,
    data_infracao TEXT,
    hora_infracao TEXT,
    local_infracao TEXT,
    numero_ait TEXT,
    pontuacao INTEGER,
    valor_multa TEXT,
    tipo_resolucao TEXT,
    parcelas INTEGER DEFAULT 1,
    notificacao_path TEXT,
    documento_path TEXT,
    status TEXT DEFAULT 'pendente',
    monaco_confirmado TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`, (err) => { if (err) console.error('Erro ao criar tabela multas:', err); else console.log('Tabela multas OK.'); });

// MIGRATION: Adicionar campos de assinatura na tabela multas (se não existirem)
const _multasMigCols = [
    'ALTER TABLE multas ADD COLUMN processo_iniciado INTEGER DEFAULT 0',
    'ALTER TABLE multas ADD COLUMN assinatura_testemunha1_nome TEXT',
    'ALTER TABLE multas ADD COLUMN assinatura_testemunha1_base64 TEXT',
    'ALTER TABLE multas ADD COLUMN assinatura_testemunha2_nome TEXT',
    'ALTER TABLE multas ADD COLUMN assinatura_testemunha2_base64 TEXT',
    'ALTER TABLE multas ADD COLUMN assinatura_condutor_base64 TEXT',
    'ALTER TABLE multas ADD COLUMN assinaturas_finalizadas INTEGER DEFAULT 0',
    'ALTER TABLE multas ADD COLUMN documento_html TEXT',
];
_multasMigCols.forEach(sql => {
    db.run(sql, err => {
        if (err && !err.message.includes('duplicate column')) {
            // silent — column already exists
        }
    });
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

// MIGRATION: Limpar duplicatas de geradores — executado em sequência garantida
db.serialize(() => {
    // 1. Renomear ORDEM DE SERVIÇO NR01 (maiúsculo) para caixa mista
    db.run("UPDATE geradores SET nome = 'Ordem de Servi\u00e7o NR01' WHERE nome LIKE 'ORDEM%NR01' OR nome LIKE 'ORDEM%NR 01'", (err) => {
        if (err) console.error('Erro ao renomear NR01 maiúsculo:', err);
        else console.log('MIGRATION: ORDEM NR01 maiúsculo renomeado (se existia).');
    });
    // 2. Remover duplicatas de NR01 mantendo o mais antigo
    db.run("DELETE FROM geradores WHERE (nome LIKE '%NR01%' OR nome LIKE '%NR 01%') AND id NOT IN (SELECT MIN(id) FROM geradores WHERE nome LIKE '%NR01%' OR nome LIKE '%NR 01%')", (err) => {
        if (err) console.error('Erro ao deduplicar NR01:', err);
        else console.log('MIGRATION: Duplicatas NR01 removidas (se existiam).');
    });
    // 3. Remover AUTORIZAÇÃO DE DESCONTO EM FOLHA DE PAGAMENTO (maiúsculo extra)
    //    Mantém apenas o de ID menor (Autorização de Desconto em Folha, criado antes)
    db.run("DELETE FROM geradores WHERE nome LIKE 'AUTORI%DESCONTO%PAGAMENTO'", (err) => {
        if (err) console.error('Erro ao remover AUTORIZACAO DESCONTO PAGAMENTO maiúsculo:', err);
        else console.log('MIGRATION: AUTORIZACAO DESCONTO PAGAMENTO maiúsculo removido (se existia).');
    });
    // 4. Remover qualquer outro gerador em CAIXA ALTA cujo nome = UPPER(nome) — exceto os já tratados
    //    Detecta nomes 100% maiúsculos contendo mais de 3 palavras
    db.run("DELETE FROM geradores WHERE nome = UPPER(nome) AND LENGTH(nome) > 10 AND nome NOT LIKE 'Ordem%'", (err) => {
        if (err) console.error('Err ao remover geradores all-caps extra:', err);
        else console.log('MIGRATION: Geradores all-caps extras removidos.');
    });
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

// MIGRATION: Adicionar tamanhos de uniformes
db.run("ALTER TABLE documentos ADD COLUMN assinafy_sent_at DATETIME", (err) => {
    if (err && !err.message.includes('duplicate column')) console.error('Migration assinafy_sent_at:', err.message);
});

db.run("ALTER TABLE colaboradores ADD COLUMN tamanho_camiseta TEXT", (err) => {
    if (err && !err.message.includes('duplicate column')) console.error(err);
});
db.run("ALTER TABLE colaboradores ADD COLUMN tamanho_calca TEXT", (err) => {
    if (err && !err.message.includes('duplicate column')) console.error(err);
});
db.run("ALTER TABLE colaboradores ADD COLUMN tamanho_calcado TEXT", (err) => {
    if (err && !err.message.includes('duplicate column')) console.error(err);
});


// MIGRATION: Garantir que os geradores baseados em perfil do colaborador existam no banco
const GERADORES_PERFIL = [
    'Termo de NÃO Interesse Terapia',
    'Termo de Interesse Terapia',
    'Responsabilidade Bilhete Único',
    'Responsabilidade Celular',
    'Contrato Faculdade',
    'Contrato Academia',
    'Termo de Responsabilidade de Chaves',
];
GERADORES_PERFIL.forEach(nome => {
    db.run(
        "INSERT OR IGNORE INTO geradores (nome, conteudo) VALUES (?, ?)",
        [nome, `<p>Documento: <b>${nome}</b></p><p>Colaborador: {{NOME_COMPLETO}}</p><p>Data: {{DATA_ATUAL}}</p>`],
        (err) => { if (err && !err.message.includes('UNIQUE')) console.error(`Erro ao criar gerador "${nome}":`, err); }
    );
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
        // CONTRATOS_AVULSOS: sincroniza ao OneDrive se assinado OU se nao exige assinatura (NAO_EXIGE)
        if (false && doc.tab_name === 'CONTRATOS_AVULSOS' && doc.assinafy_status !== 'Assinado') { // removed restriction - always sync to OneDrive
            console.log(`[OD-AUTO] Bloqueando sync OneDrive para doc ${docId} (CONTRATOS_AVULSOS pendente: ${doc.assinafy_status})`);
            return;
        }

        const localPath = doc.signed_file_path && require('fs').existsSync(doc.signed_file_path)
            ? doc.signed_file_path
            : (doc.file_path && require('fs').existsSync(doc.file_path) ? doc.file_path : null);

        if (!localPath) { console.error(`[OD-AUTO] Arquivo não encontrado para doc ${docId}`); return; }

        const onedriveBasePath = process.env.ONEDRIVE_BASE_PATH || 'RH/1.Colaboradores/Sistema';
        const safeColab = formatarNome(doc.nome_completo || 'DESCONHECIDO');
        const safeTab   = formatarPasta(doc.tab_name || 'DOCUMENTOS').toUpperCase();
        const docYear   = doc.year && doc.year !== 'null' ? String(doc.year).replace(/[^0-9]/g, '') : String(new Date().getFullYear());

        // Contratos avulsos (Outros contratos): salvar em CONTRATOS/outros/ independente do ano
        let targetDir;
        if (doc.tab_name === 'CONTRATOS_AVULSOS') {
            targetDir = `${onedriveBasePath}/${safeColab}/CONTRATOS`;
        } else {
            targetDir = `${onedriveBasePath}/${safeColab}/${safeTab}`;
            if (safeTab !== '01_FICHA_CADASTRAL') {
                targetDir += `/${docYear}`;
                // Para Pagamentos: sub-pasta com nome do mês em português (ex: Marco, Abril)
                if (safeTab === 'PAGAMENTOS' && doc.month && doc.month !== 'null' && doc.month !== '') {
                    targetDir += `/${getMesNome(doc.month)}`;
                }
                // Para Faculdade/Boletim: sub-pasta Boletim dentro do ano
                if (safeTab === 'FACULDADE' && (doc.document_type || '').toUpperCase() === 'BOLETIM') {
                    targetDir += '/Boletim';
                }
            }
        }

        // Para Atestados, strip o timestamp do file_name: CID_DD-MM-AA_Nome_YYYYMMDD_HHMMSS.pdf ? CID_DD-MM-AA_Nome.pdf
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
        } else if (safeTab === '01_FICHA_CADASTRAL') {
            cloudName = `${(doc.document_type || doc.tab_name).replace(/\s+/g, '_')}_${safeColab}.pdf`;
        } else if (doc.tab_name === 'CONTRATOS_AVULSOS') {
            // Outros Contratos: salvar como Outros_NomeContrato_NomeColab.pdf
            cloudName = doc.file_name;
        } else if (safeTab === 'FACULDADE') {
            // Faculdade: inclui o mês no nome (Boletim_Jan_2026_NOME.pdf / Boleto_Jan_2026_NOME.pdf)
            const mesNomeFac = doc.month && doc.month !== 'null' && doc.month !== '' ? getMesNome(doc.month) + '_' : '';
            cloudName = `${formatarPasta(doc.document_type || doc.tab_name).replace(/\s+/g, '_')}_${mesNomeFac}${docYear}_${safeColab}.pdf`;
        } else {
            cloudName = `${formatarPasta(doc.document_type || doc.tab_name).replace(/\s+/g, '_')}_${docYear}_${safeColab}.pdf`;
        }

        console.log(`[OD-AUTO] doc=${docId} tab=${doc.tab_name} ? ${targetDir}/${cloudName}`);

        // Garantir toda a hierarquia de pastas
        if (doc.tab_name === 'CONTRATOS_AVULSOS') {
            const contratosDir = `${onedriveBasePath}/${safeColab}/CONTRATOS`;
            await onedrive.ensurePath(contratosDir);
            await onedrive.ensurePath(targetDir); // CONTRATOS/outros
        } else {
            const parentDir = `${onedriveBasePath}/${safeColab}/${safeTab}`;
            if (targetDir !== parentDir) {
                await onedrive.ensurePath(parentDir);
            }
            await onedrive.ensurePath(targetDir);
        }

        const fileBuffer = require('fs').readFileSync(localPath);
        await onedrive.uploadToOneDrive(targetDir, cloudName, fileBuffer);
        console.log(`[OD-AUTO] ? Upload OK: ${cloudName}`);
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
        .replace(/[^a-zA-Z0-9 _]/g, "")  // Preserva underscores (ex: 01_FICHA_CADASTRAL)
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

// Nomes dos meses em português sem acentos (para caminhos de pasta no OneDrive)
const MONTH_NAMES_PT = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
function getMesNome(monthStr) {
    const idx = parseInt(monthStr, 10) - 1;
    return (idx >= 0 && idx < 12) ? MONTH_NAMES_PT[idx] : String(monthStr);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const colab = req.body.colaborador_nome || 'DESCONHECIDO';
        const tab = req.body.tab_name || 'OUTROS';
        const year = req.body.year;
        const month = req.body.month;

        const safeNomeColab = formatarNome(colab);
        const safeTab = formatarPasta(tab).toUpperCase();
        
        // CONTRATOS_AVULSOS (Outros Contratos): salvar em CONTRATOS/ com nome Outros_
        let finalDir;
        if (safeTab === 'CONTRATOS_AVULSOS') {
            finalDir = path.join(BASE_PATH, safeNomeColab, 'CONTRATOS');
        } else {
            finalDir = path.join(BASE_PATH, safeNomeColab, safeTab);
        }

        if (safeTab !== 'CONTRATOS_AVULSOS' && year && year !== 'null' && year !== 'undefined' && year !== '') {
            const safeYear = String(year).replace(/[^0-9]/g, '');
            if (safeYear) {
                finalDir = path.join(finalDir, safeYear);
                // Para Pagamentos: sub-pasta com o nome do mes em portugues (ex: Marco, Abril)
                if (safeTab === 'PAGAMENTOS' && month && month !== 'null' && month !== 'undefined' && month !== '') {
                    finalDir = path.join(finalDir, getMesNome(month));
                }
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
        const tab = req.body.tab_name || '';
        const ext = path.extname(file.originalname);

        let base = "";
        if (customName) {
            base = customName;
        } else if (tab === 'CONTRATOS_AVULSOS') {
            // Outros Contratos: nome Outros_NomeContrato_NomeColab
            const safeType = formatarPasta(docType);
            const safeColab = formatarNome(colab);
            base = doc.file_name ? doc.file_name.replace(/\.pdf$/i, "") : `Outros_${safeType}_${safeColab}`;
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
app.get('/api/version', (req, res) => res.json({ version: 'V48_OUTROS_CONTRATOS_FIX' }));

app.get('/api/debug-pfx3', async (req, res) => {
    try {
        const doc = await new Promise(r => db.get("SELECT assinafy_id FROM documentos WHERE assinafy_status = 'Assinado' ORDER BY id DESC LIMIT 1", [], (err, row) => r(row)));
        if(!doc) return res.send("No doc");
        const fetch = require('node-fetch') || global.fetch;
        const rInfo = await fetch(`https://api.assinafy.com.br/v1/documents/${doc.assinafy_id}`, { headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey } });
        const dt = (await rInfo.json()).data;
        res.json({ dt });
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

// --- MÓDULO DE ASSINATURA DIGITAL COM CERTIFICADO .PFX -----------------------
const signPdfPfx = require('./sign_pdf_pfx');
// -----------------------------------------------------------------------------

// --- POLLING AUTOMÁTICO: Atualizar status de documentos de admissão -----------
// Roda a cada 2 min e verifica se documentos pendentes foram assinados no Assinafy
async function pollAdmissaoAssinaturas() {
    try {
        const pendentesAdmissao = await new Promise((res, rej) =>
            db.all(`SELECT id, colaborador_id, assinafy_id, nome_documento, 'admissao' as source 
                    FROM admissao_assinaturas WHERE (assinafy_status = 'Pendente' OR (assinafy_status = 'Assinado' AND signed_file_path IS NULL)) AND assinafy_id IS NOT NULL`, [], (err, rows) => err ? rej(err) : res(rows))
        );

        const pendentesDocs = await new Promise((res, rej) =>
            db.all(`SELECT id, colaborador_id, assinafy_id, document_type as nome_documento, tab_name, file_name, year, month, 'documento' as source 
                    FROM documentos WHERE (assinafy_status = 'Pendente' OR (assinafy_status = 'Assinado' AND signed_file_path IS NULL)) AND assinafy_id IS NOT NULL`, [], (err, rows) => err ? rej(err) : res(rows))
        );

        const rawPendentes = [...(pendentesAdmissao || []), ...(pendentesDocs || [])];
        if (!rawPendentes || rawPendentes.length === 0) return;

        // Deduplicar pendentes por assinafy_id para não sobrecarregar API e evitar duplo insert/update
        const seenPollIds = new Set();
        const pendentes = [];
        for (const p of rawPendentes) {
            if (!p.assinafy_id || !seenPollIds.has(p.assinafy_id)) {
                pendentes.push(p);
                if (p.assinafy_id) seenPollIds.add(p.assinafy_id);
            }
        }

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
                    let u = dt.certificated_file_url || dt.report_url || dt.bundle_url || dt.signature_report_url || dt.artifacts?.certificated || dt.artifacts?.bundle || dt.artifacts?.signed_file || dt.signed_file_url;
                    if (u) return u;
                    const jsonStr = JSON.stringify(dt);
                    const matches = jsonStr.match(/https:\/\/[^"]+\.pdf[^"]*/gi);
                    if (matches && matches.length) return matches.find(l => /cert|bundle|report|sign|assinad/i.test(l)) || matches[matches.length - 1];
                    return dt.download_link || dt.download_url || dt.file_url || dt.document_pdf || null;
                };

                // Status do Assinafy que indicam assinatura completa (incluindo 'certificated' v1 e '4')
                const isSigned = ['completed', 'signed', 'concluded', 'finalizado', 'assinado', 'certificat', '4'].some(s => statusRaw.includes(s) || statusRaw === '4');
                if (!isSigned) {
                    console.log(`[POLL-ADMISSAO] Doc ${doc.assinafy_id} ? status="${statusRaw}" (ainda pendente)`);
                    continue;
                }

                console.log(`[POLL-ADMISSAO] ? Doc ${doc.assinafy_id} ASSINADO!`);

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
                            console.log(`[POLL-ADMISSAO] ? Certificado digital aplicado: ${certSignedBuffer.length} bytes`);
                        } catch(pfxErr) {
                            console.warn(`[POLL-ADMISSAO] Certificado não aplicado: ${pfxErr.message}`);
                        }
                    }
                }

                // O buffer final que será salvo (com cert se disponível, ou apenas assinado pelo colab)
                const finalBuffer = certSignedBuffer || pdfBuffer;

                // Tentar sincronizar com OneDrive diretamente da memória (sem salvar em disco)
                let onedriveOk = false;
                // Regra de OneDrive por subtipo de Advertência:
                //  Ocorrência / Verbal -> não sincroniza no poll (já sincronizou após testemunhas ou nunca)
                //  Escrita / Suspensão -> sobrescreve após assinatura do colaborador
                const _tipoSimplesP = (doc.document_type || '').split('###')[1] || '';
                const _skipOneDriveP = /ocorr|verbal/i.test(_tipoSimplesP);
                if (onedrive && finalBuffer && !_skipOneDriveP) {
                    try {
                        const colabRow = await new Promise((res2, rej2) =>
                            db.get('SELECT nome_completo FROM colaboradores WHERE id = ?', [doc.colaborador_id], (e,r) => e ? rej2(e) : res2(r))
                        );
                        const onedriveBasePath = process.env.ONEDRIVE_BASE_PATH || 'RH/1.Colaboradores/Sistema';
                        const safeColab = formatarNome(colabRow?.nome_completo || 'DESCONHECIDO');
                        const isAtestado = (doc.tab_name === 'Atestados');
                        const docYear = doc.year && doc.year !== 'null' && doc.year !== '' ? String(doc.year).replace(/[^0-9]/g, '') : String(new Date().getFullYear());
                        let cloudName;
                        if (doc.source === 'documento') {
                            const safeTab = doc.tab_name ? formatarPasta(doc.tab_name).toUpperCase() : 'DOCUMENTOS';
                            const isContratosAvulso = doc.tab_name === 'CONTRATOS_AVULSOS';
                            cloudName = isAtestado
                                ? (doc.file_name || 'Atestado.pdf').replace(/_\d{8}_\d{6}(\.\w+)$/, '$1')
                                : (() => {
                                    const ts = new Date().toISOString().slice(0,19).replace(/[-T:]/g,'');
                                    return isContratosAvulso
                                        ? `${formatarPasta(doc.nome_documento || doc.tab_name || 'Documento').replace(/\s+/g, '_')}_${docYear}_${ts}_${safeColab}.pdf`
                                        : `${formatarPasta(doc.nome_documento || doc.tab_name || 'Documento').replace(/\s+/g, '_')}_${docYear}_${safeColab}.pdf`;
                                  })();
                            if (isContratosAvulso) {
                                // Contratos avulsos vão em CONTRATOS/outros/
                                const contratosDir = `${onedriveBasePath}/${safeColab}/CONTRATOS`;
                                targetDir = `${onedriveBasePath}/${safeColab}/CONTRATOS`;
                                await onedrive.ensurePath(contratosDir);
                                await onedrive.ensurePath(targetDir);
                            } else {
                                // Montar o targetDir com mês para Pagamentos
                                targetDir = `${onedriveBasePath}/${safeColab}/${safeTab}/${docYear}`;
                                if (safeTab === 'PAGAMENTOS' && doc.month && doc.month !== 'null' && doc.month !== '') {
                                    targetDir += `/${getMesNome(doc.month)}`;
                                }
                                await onedrive.ensurePath(targetDir);
                            }
                        } else {
                            const safeDocName = formatarPasta(doc.nome_documento || 'Documento').replace(/\s+/g, '_');
                            cloudName = `${safeDocName}_${safeColab}_${docYear}.pdf`;
                            targetDir = `${onedriveBasePath}/${safeColab}/CONTRATOS`;
                        }
                        await onedrive.ensurePath(targetDir);
                        await onedrive.uploadToOneDrive(targetDir, cloudName, finalBuffer);
                        console.log(`[POLL-ASSINATURAS] ? OneDrive sync: ${cloudName} -> ${targetDir}`);
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
                // Atualizar banco em AMBAS as tabelas, pois o mesmo documento pode existir nas duas
                db.run(
                    `UPDATE admissao_assinaturas SET assinafy_status = 'Assinado', assinado_em = CURRENT_TIMESTAMP, signed_file_path = ? WHERE assinafy_id = ?`,
                    [signedPath, doc.assinafy_id]
                );
                db.run(
                    `UPDATE documentos SET assinafy_status = 'Assinado', signed_file_path = ?, assinafy_signed_at = CURRENT_TIMESTAMP WHERE assinafy_id = ?`,
                    [signedPath, doc.assinafy_id]
                );
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
// -----------------------------------------------------------------------------

// Endpoint de alertas realtime: retorna documentos de admissão e prontuário assinados nas últimas 24h
app.get('/api/admissao-assinaturas/alertas-recentes', authenticateToken, (req, res) => {
    db.all(`
        SELECT * FROM (
            SELECT max(unq_id) as unq_id, max(id) as id, nome_documento, max(assinado_em) as assinado_em, colaborador_id,
                   colaborador_nome, source, assinafy_id
            FROM (
                SELECT ('admissao_' || aa.id) AS unq_id, aa.id, aa.nome_documento, aa.assinado_em, aa.colaborador_id,
                       c.nome_completo AS colaborador_nome, 'admissao' as source, aa.assinafy_id
                FROM admissao_assinaturas aa
                LEFT JOIN colaboradores c ON c.id = aa.colaborador_id
                WHERE aa.assinafy_status = 'Assinado'
                  AND aa.assinado_em IS NOT NULL
                  AND datetime(aa.assinado_em) >= datetime('now', '-24 hours')

                UNION ALL

                SELECT ('doc_' || d.id) AS unq_id, d.id, d.document_type AS nome_documento, d.assinafy_signed_at AS assinado_em, d.colaborador_id,
                       c.nome_completo AS colaborador_nome, 'documentos' as source, d.assinafy_id
                FROM documentos d
                LEFT JOIN colaboradores c ON c.id = d.colaborador_id
                WHERE d.assinafy_status = 'Assinado'
                  AND d.assinafy_signed_at IS NOT NULL
                  AND datetime(d.assinafy_signed_at) >= datetime('now', '-24 hours')
            )
            GROUP BY COALESCE(assinafy_id, unq_id)
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
        const rawAll = [...admissaoRows, ...docRowsWithDates].sort((a, b) => {
            const dateA = new Date(a.assinado_em || a.enviado_em || 0).getTime();
            const dateB = new Date(b.assinado_em || b.enviado_em || 0).getTime();
            return dateB - dateA;
        });

        // Deduplicar por assinafy_id para evitar duplicação ("admissao_assinaturas" vs "documentos")
        const seenIds = new Set();
        const all = [];
        for (const item of rawAll) {
            if (!item.assinafy_id || !seenIds.has(item.assinafy_id)) {
                all.push(item);
                if (item.assinafy_id) seenIds.add(item.assinafy_id);
            }
        }

        res.json(all.slice(0, 500));
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

                console.log(`[VERIF] Doc ${doc.assinafy_id} ? "${statusRaw}" ? signed=${isSigned}`);

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
                subject: `?? Assinatura solicitada: ${resultado?.docType?.split('###')[0] || 'Documento'} - ${resultado?.nomeColab}`,
                html: `
                    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e0e0e0;border-radius:8px;">
                        <h2 style="color:#1a1a2e;border-bottom:2px solid #e07b39;padding-bottom:10px;">?? Documento Enviado para Assinatura</h2>
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
    const stats = { total: 0, ativos: 0, ferias: 0, afastados: 0, desligados: 0, aguardando: 0, iniciado: 0 };
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
            else if (effectiveStatus === 'Aguardando início') stats.aguardando += 1;
            else if (effectiveStatus === 'Processo iniciado') stats.iniciado += 1;
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

// Auto-migration: add santander_ficha_data column if it doesn't exist
db.run("ALTER TABLE colaboradores ADD COLUMN santander_ficha_data TEXT", (err) => {
    if (err && !err.message.includes('duplicate column')) {
        console.error('[Migration] Erro ao adicionar santander_ficha_data:', err.message);
    } else if (!err) {
        console.log('[Migration] Coluna santander_ficha_data adicionada com sucesso');
    }
});

// --- ROTAS DE COLABORADORES ---
app.get('/api/colaboradores', authenticateToken, (req, res) => {
    const query = `
        SELECT c.*,
            (SELECT COUNT(*) FROM faltas f 
             WHERE f.colaborador_id = c.id 
               AND strftime('%Y', f.data_falta) = strftime('%Y', 'now') 
               AND NOT EXISTS (
                   SELECT 1 FROM documentos d 
                   WHERE d.colaborador_id = c.id 
                     AND (d.tab_name LIKE '%ATESTADO%' OR d.document_type LIKE '%Atestado%')
                     AND f.data_falta >= d.atestado_inicio 
                     AND f.data_falta <= d.atestado_fim
               )
            ) as faltas_ano,
            (SELECT COUNT(*) FROM documentos d 
             WHERE d.colaborador_id = c.id 
               AND (d.document_type LIKE '%Advertência%' OR d.document_type LIKE '%Suspensão%' OR d.tab_name LIKE '%Advertência%' OR d.tab_name LIKE '%Suspensão%')
            ) as punicoes
        FROM colaboradores c
    `;
    db.all(query, [], (err, rows) => {
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
        'ferias_programadas_inicio', 'ferias_programadas_fim', 'alergias', 'aso_email_enviado', 'aso_exame_data', 'aso_assinafy_link', 'aso_exames_assinafy_link',
        'adiantamento_salarial', 'adiantamento_valor', 'insalubridade', 'insalubridade_valor',
        'conjuge_nome', 'conjuge_cpf',
        'santander_ficha_data',
        'tamanho_camiseta', 'tamanho_calca', 'tamanho_calcado'
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
                            ? '? Banco em disco persistente (Render Disk configurado)'
                            : '??  BANCO EFÊMERO! Dados serão perdidos ao reiniciar o servidor. Configure DATABASE_PATH apontando para um Render Disk.',
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
        'ferias_programadas_inicio', 'ferias_programadas_fim', 'alergias', 'aso_email_enviado', 'aso_exame_data', 'aso_assinafy_link', 'aso_exames_assinafy_link',
        'adiantamento_salarial', 'adiantamento_valor', 'insalubridade', 'insalubridade_valor',
        'conjuge_nome', 'conjuge_cpf',
        'santander_ficha_data',
        'tamanho_camiseta', 'tamanho_calca', 'tamanho_calcado'
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

    db.get('SELECT * FROM colaboradores WHERE id = ?', [id], (err, oldColab) => {
        if (err || !oldColab) return res.status(404).json({ error: err ? err.message : 'Não encontrado' });
        
        // Registrar mudanças na auditoria
        const loggedUser = req.user ? (req.user.username || req.user.nome || 'UNKNOWN') : 'SYSTEM';
        const auditProms = [];
        for (const k of updates) {
            const oldVal = String(oldColab[k] || '');
            const newVal = String(data[k] || '');
            if (oldVal !== newVal) {
                auditProms.push(new Promise(res => {
                    db.run(`INSERT INTO auditoria (usuario, programa, campo, conteudo_anterior, conteudo_atual, registro_id) VALUES (?, ?, ?, ?, ?, ?)`,
                        [loggedUser, 'Colaboradores', k, oldVal, newVal, id], res);
                }));
            }
        }
        Promise.all(auditProms).catch(() => {});

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

            // Atualizar dependentes (apenas filhos, sem cônjuge)
            db.run("DELETE FROM dependentes WHERE colaborador_id = ? AND (grau_parentesco IS NULL OR grau_parentesco != 'Cônjuge')", [id], (errDep) => {
                if (!errDep && data.dependentes && Array.isArray(data.dependentes)) {
                    data.dependentes.filter(d => d.grau_parentesco !== 'Cônjuge').forEach(dep => {
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
// --- ENDPOINT: Busca assinaturas de um colaborador (rota alternativa) ---
// GET /api/colaboradores/:id/admissao-assinaturas
app.get('/api/colaboradores/:id/admissao-assinaturas', authenticateToken, (req, res) => {
    db.all(`
        SELECT aa.*,
               d.assinafy_status     AS doc_assinafy_status,
               d.signed_file_path    AS doc_signed_file_path,
               d.assinafy_signed_at  AS doc_assinafy_signed_at,
               d.id                  AS documento_id
        FROM admissao_assinaturas aa
        LEFT JOIN documentos d ON d.assinafy_id = aa.assinafy_id AND d.colaborador_id = aa.colaborador_id
        WHERE aa.colaborador_id = ?
    `, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const toUpdate = (rows || []).filter(r => r.doc_assinafy_status === 'Assinado' && r.assinafy_status !== 'Assinado');
        toUpdate.forEach(r => {
            db.run(`UPDATE admissao_assinaturas SET assinafy_status='Assinado', assinado_em=COALESCE(assinado_em, CURRENT_TIMESTAMP), signed_file_path=COALESCE(signed_file_path,?) WHERE id=?`, [r.doc_signed_file_path, r.id]);
        });
        const result = (rows || []).map(r => ({
            ...r,
            assinafy_status: (r.doc_assinafy_status === 'Assinado' ? 'Assinado' : r.assinafy_status) || r.assinafy_status,
            signed_file_path: r.signed_file_path || r.doc_signed_file_path,
            assinado_em: r.assinado_em || r.doc_assinafy_signed_at
        }));
        res.json(result);
    });
});

app.get('/api/colaboradores/:id/documentos', authenticateToken, (req, res) => {
    db.all('SELECT * FROM documentos WHERE colaborador_id = ? ORDER BY tab_name, year, month', [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});


// --- ENDPOINT DEDICADO: Salvar status Santander ------------------------------
// PUT /api/colaboradores/:id/santander-status
app.put('/api/colaboradores/:id/santander-status', authenticateToken, (req, res) => {
    const { santander_ficha_data } = req.body;
    const { id } = req.params;
    if (!santander_ficha_data) return res.status(400).json({ error: 'santander_ficha_data obrigatório' });
    
    db.run(
        'UPDATE colaboradores SET santander_ficha_data = ? WHERE id = ?',
        [santander_ficha_data, id],
        function(err) {
            if (err) {
                console.error('[Santander Status] Erro:', err.message);
                return res.status(500).json({ error: err.message });
            }
            console.log('[Santander Status] Salvo para colaborador', id, ':', santander_ficha_data);
            res.json({ sucesso: true, santander_ficha_data });
        }
    );
});
// -----------------------------------------------------------------------------

// --- ROTAS DE MULTAS DE TRÂNSITO ----------------------------------------------
// GET /api/colaboradores/:id/multas — lista todas as multas de um colaborador
app.get('/api/colaboradores/:id/multas', authenticateToken, (req, res) => {
    db.all('SELECT * FROM multas WHERE colaborador_id = ? ORDER BY created_at DESC', [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});


// PUT /api/multas/:id — atualiza status ou confirmação de uma multa
app.put('/api/multas/:id', authenticateToken, (req, res) => {
    const { status, monaco_confirmado } = req.body;
    db.run(
        `UPDATE multas SET status = COALESCE(?, status), monaco_confirmado = COALESCE(?, monaco_confirmado) WHERE id = ?`,
        [status, monaco_confirmado, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Multa não encontrada' });
            res.json({ ok: true });
        }
    );
});
// -----------------------------------------------------------------------------

app.post('/api/documentos', authenticateToken, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    
    const { document_id, colaborador_id, tab_name, document_type, year, month, vencimento, atestado_tipo, atestado_inicio, atestado_fim, assinafy_status } = req.body;
    const file_path = req.file.path;
    let file_name = req.file.originalname;
    try { file_name = Buffer.from(file_name, 'latin1').toString('utf8'); } catch (e) {}

    if (tab_name === 'CONTRATOS_AVULSOS') {
        const uniqueCode = Date.now().toString().slice(-6);
        let safeTab = formatarPasta(document_type || 'Contrato');
        let safeColab = formatarNome(req.body.colaborador_nome || 'Colaborador');
        file_name = `Outros_${safeTab}_${safeColab}_${uniqueCode}.pdf`;
    }


    const abasMultiplas = ['Advertências', 'Multas', 'Atestados', 'Boletim de ocorrência', 'Terapia', 'CONTRATOS_AVULSOS'];
    const isMultiplo = !document_id && abasMultiplas.includes(tab_name);

    if (isMultiplo) {
        // Função para garantir nome único apenas na mesma pasta (mesmo colaborador e mesma aba)
        // Somente faz isso se isMultiplo for TRuE, senão ele atualiza (comportamento original)
        let baseName = file_name.replace(/\.pdf$/i, '');
        let extension = '.pdf';
        
        let dupCount = 0;
        let finalFileName = file_name;
        
        while (true) {
            const hasDup = await new Promise((resolve) => {
                db.get("SELECT id FROM documentos WHERE colaborador_id = ? AND tab_name = ? AND file_name = ?", 
                    [colaborador_id, tab_name, finalFileName], (err, r) => resolve(!!r));
            });
            if (!hasDup) break;
            dupCount++;
            finalFileName = `${baseName} (${dupCount})${extension}`;
        }
        file_name = finalFileName;
    }

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
        
        if (row && !isMultiplo) {
            // SET CLAUSE...
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
                    
                    const path = require('path');
                    if (tab_name === 'Fotos' && ['.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(file_path).toLowerCase())) {
                        db.run("UPDATE colaboradores SET foto_path = ? WHERE id = ?", [file_path, colaborador_id]);
                    }

                    const _tipoSimples2 = (document_type || '').split('###')[1] || '';
                    const _isOcorr2  = /ocorr/i.test(_tipoSimples2);
                    const _isVerbal2 = /verbal/i.test(_tipoSimples2);
                    const _podeOneDrive2 = tab_name === 'Advertências'
                        ? (!_isOcorr2 && ((assinafy_status === 'Testemunhas') || (!_isVerbal2 && assinafy_status === 'Assinado')))
                        : (tab_name !== 'CONTRATOS_AVULSOS' || assinafy_status === 'NAO_EXIGE');
                        
                    if (onedrive && _podeOneDrive2) {
                        (async () => {
                            try {
                                const onedriveBasePath = process.env.ONEDRIVE_BASE_PATH || "RH/1.Colaboradores/Sistema";
                                const safeColab = formatarNome(req.body.colaborador_nome || "DESCONHECIDO");
                                const safeTab = tab_name === 'CONTRATOS_AVULSOS' ? 'CONTRATOS' : formatarPasta(tab_name).toUpperCase();
                                const parentDir = `${onedriveBasePath}/${safeColab}/${safeTab}`;
                                let targetDir = parentDir;
                                if (year && year !== 'null' && year !== 'undefined' && year !== '' && safeTab !== '01_FICHA_CADASTRAL') {
                                    targetDir += `/${year.replace(/[^0-9]/g, '')}`;
                                    if (safeTab === 'PAGAMENTOS' && month && month !== 'null' && month !== 'undefined' && month !== '') {
                                        targetDir += `/${getMesNome(month)}`;
                                    }
                                    if (safeTab === 'FACULDADE' && (document_type || '').toUpperCase() === 'BOLETIM') {
                                        targetDir += '/Boletim';
                                    }
                                }
                                
                                if (targetDir !== parentDir) { await onedrive.ensurePath(parentDir); }
                                await onedrive.ensurePath(targetDir);

                                const fileBuffer = require('fs').readFileSync(file_path);
                                let cloudFileName = file_name;
                                if (tab_name === 'Atestados' && req.body.custom_name) {
                                    cloudFileName = `${req.body.custom_name}.pdf`;
                                } else if (tab_name === 'CONTRATOS_AVULSOS') {
                                    cloudFileName = file_name; // Respeita exatamente o nome que já pode ter recebido (1)
                                } else if (tab_name !== 'AVALIACAO') {
                                    const safeColabInline = formatarNome(req.body.colaborador_nome || "DESCONHECIDO");
                                    if (safeTab === '01_FICHA_CADASTRAL') {
                                        cloudFileName = `${(document_type || tab_name).replace(/\s+/g, '_')}_${safeColabInline}.pdf`;
                                    } else if (safeTab === 'FACULDADE') {
                                        const docYear = year && year !== 'null' ? String(year).replace(/[^0-9]/g, '') : String(new Date().getFullYear());
                                        const mesNomeFac = month && month !== 'null' && month !== '' ? getMesNome(month) + '_' : '';
                                        cloudFileName = `${formatarPasta(document_type || tab_name).replace(/\s+/g, '_')}_${mesNomeFac}${docYear}_${safeColabInline}.pdf`;
                                    } else {
                                        const docYear = year && year !== 'null' ? String(year).replace(/[^0-9]/g, '') : String(new Date().getFullYear());
                                        cloudFileName = `${formatarPasta(document_type || tab_name).replace(/\s+/g, '_')}_${docYear}_${safeColabInline}.pdf`;
                                    }
                                }
                                await onedrive.uploadToOneDrive(targetDir, cloudFileName, fileBuffer);
                                console.log(`[OneDrive] Upload OK: ${cloudFileName}`);
                            } catch (e) { console.error("Erro async OneDrive (update):", e.message); }
                        })();
                    }

                    res.json({ message: 'Documento atualizado', id: row.id, file_path });
                });
        } else {
            // INSERE NOVO REGISTRO
            const fileNameToStore = (tab_name === 'Atestados' && req.body.cloud_name) ? req.body.cloud_name : file_name;
            db.run(`INSERT INTO documentos (colaborador_id, tab_name, document_type, file_name, file_path, year, month, vencimento, atestado_tipo, atestado_inicio, atestado_fim, assinafy_status) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [colaborador_id, tab_name, document_type, fileNameToStore, file_path, year || null, month || null, vencimento || null, atestado_tipo || null, atestado_inicio || null, atestado_fim || null, assinafy_status || 'Nenhum'],
                function(insertErr) {
                    if (insertErr) return res.status(500).json({ error: insertErr.message });

                    const path = require('path');
                    if (tab_name === 'Fotos' && ['.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(file_path).toLowerCase())) {
                        db.run("UPDATE colaboradores SET foto_path = ? WHERE id = ?", [file_path, colaborador_id]);
                    }

                    const newDocId = this.lastID;
                    if (tab_name === 'CONTRATOS_AVULSOS' && onedrive) {
                        ;(async () => {
                            try {
                                const onedriveBasePath = process.env.ONEDRIVE_BASE_PATH || 'RH/1.Colaboradores/Sistema';
                                const colabNome = req.body.colaborador_nome || '';
                                const safeColab = formatarNome(colabNome) || 'DESCONHECIDO';
                                const safeType = formatarPasta(document_type || 'Contrato');
                                
                                // USA O NOME EXATO DO ARQUIVO SELECIONADO/DEDUPLICADO, não "Outros_..."
                                const cloudFileName = fileNameToStore;
                                const targetDir = `${onedriveBasePath}/${safeColab}/CONTRATOS`;
                                
                                console.log(`[OD-INLINE] CONTRATOS_AVULSOS NAO_EXIGE => ${targetDir}/${cloudFileName}`);
                                await onedrive.ensurePath(`${onedriveBasePath}/${safeColab}`);
                                await onedrive.ensurePath(targetDir);
                                const fileBuffer = require('fs').readFileSync(file_path);
                                await onedrive.uploadToOneDrive(targetDir, cloudFileName, fileBuffer);
                                console.log(`[OD-INLINE] Upload OK: ${cloudFileName}`);
                            } catch(odErr) {
                                console.error('[OD-INLINE] Falha OneDrive:', odErr.message);
                            }
                        })();
                    } else {
                        const _tipoSimples = (document_type || '').split('###')[1] || '';
                        const _isOcorr  = /ocorr/i.test(_tipoSimples);
                        const _isVerbal = /verbal/i.test(_tipoSimples);
                        const _advStatus = req.body.assinafy_status || '';
                        const _podeOneDrive = tab_name === 'Advertências'
                            ? (!_isOcorr && ((_advStatus === 'Testemunhas') || (!_isVerbal && _advStatus === 'Assinado')))
                            : (tab_name !== 'CONTRATOS_AVULSOS' || !assinafy_status || assinafy_status === 'Nenhum' || assinafy_status === 'NAO_EXIGE');
                        if (_podeOneDrive) {
                            setImmediate(() => uploadDocToOneDrive(newDocId));
                        }
                    }

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
db.run(`CREATE TABLE IF NOT EXISTS auditoria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    usuario TEXT,
    programa TEXT,
    campo TEXT,
    conteudo_anterior TEXT,
    conteudo_atual TEXT,
    registro_id INTEGER
)`);

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


// --- Helper: Gera HTML completo com layout do gerador ------------------------
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
    const { colaborador_id, geradores_ids: rawIds } = req.body;
    if (!colaborador_id || !Array.isArray(rawIds) || rawIds.length === 0) {
        return res.status(400).json({ error: 'colaborador_id e geradores_ids são obrigatórios' });
    }
    // Dedup absoluto: garantir IDs únicos independente do que o cliente mande
    const geradores_ids = [...new Set(rawIds.map(Number).filter(n => !isNaN(n) && n > 0))];

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


        // --- DEDUP CRITICAL: Verificar se já foi enviado (Pendente ou Assinado) ---
        const existente = await new Promise((resolve, reject) =>
            db.get('SELECT * FROM admissao_assinaturas WHERE colaborador_id = ? AND (gerador_id = ? OR nome_documento = ?)',
                [colaborador_id, geradorId, gerador.nome], (err, row) => err ? reject(err) : resolve(row))
        );

        // Se já existe com assinafy_id (já enviado para Assinafy), NÃO re-enviar
        if (existente && existente.assinafy_id && ['Pendente', 'Aguardando', 'Assinado'].includes(existente.assinafy_status)) {
            console.log(`[ADMISSAO-DEDUP] Documento "${gerador.nome}" já foi enviado (status: ${existente.assinafy_status}). Pulando.`);
            return { id: geradorId, nome: gerador.nome, ok: true, jaEnviado: true, url: existente.assinafy_url };
        }

        const existenteDoc = await new Promise((resolve, reject) =>
            db.get(`SELECT id, assinafy_status, assinafy_id FROM documentos WHERE colaborador_id = ? AND document_type = ? AND tab_name = 'CONTRATOS' ORDER BY id DESC LIMIT 1`,
                [colaborador_id, gerador.nome], (err, row) => err ? reject(err) : resolve(row))
        );

        // Se doc já tem assinafy_id ativo, não duplicar
        if (existenteDoc && existenteDoc.assinafy_id && ['Pendente', 'Aguardando', 'Assinado'].includes(existenteDoc.assinafy_status)) {
            console.log(`[ADMISSAO-DEDUP] Doc "${gerador.nome}" já tem assinafy_id no banco. Pulando.`);
            return { id: geradorId, nome: gerador.nome, ok: true, jaEnviado: true };
        }

        let docId;
        if (existenteDoc && existenteDoc.assinafy_status !== 'Assinado') {
            docId = existenteDoc.id;
            await new Promise((resolve, reject) =>
                db.run(`UPDATE documentos SET file_path = ?, file_name = ?, assinafy_status = 'Pendente' WHERE id = ?`,
                    [filePath, path.basename(filePath), docId],
                    function(err) { err ? reject(err) : resolve(); })
            );
        } else {
            docId = await new Promise((resolve, reject) =>
                db.run(
                    `INSERT INTO documentos (colaborador_id, tab_name, document_type, file_path, file_name, assinafy_status) VALUES (?, 'CONTRATOS', ?, ?, ?, 'Pendente')`,
                    [colaborador_id, gerador.nome, filePath, path.basename(filePath)],
                    function(err) { err ? reject(err) : resolve(this.lastID); }
                )
            );
        }

        const resultado = await novoProcesso.enviarDocumentoParaAssinafy(docId, colaborador_id);

        if (existente) {
            db.run(`UPDATE admissao_assinaturas SET assinafy_id=?, assinafy_status='Pendente', assinafy_url=?, enviado_em=CURRENT_TIMESTAMP WHERE id=?`,
                [resultado.assinafyDocId, resultado.urlAssinatura, existente.id]);
        } else {
            db.run(`INSERT OR IGNORE INTO admissao_assinaturas (colaborador_id, gerador_id, nome_documento, assinafy_id, assinafy_status, assinafy_url, enviado_em) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP)`,
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
        console.log(`[CERT-POST] ? PDF com certificado salvo: ${certPath} (${pdfAssinado.length} bytes)`);

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

// MIGRATION / STRUCT: Garantir que a tabela geradores exista
db.run(`CREATE TABLE IF NOT EXISTS geradores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    conteudo TEXT,
    variaveis TEXT,
    tipo TEXT DEFAULT 'html',
    arquivo_pdf TEXT DEFAULT NULL
)`, () => {
    // Adicionar colunas se por acaso a tabela for antiga (SQLite ignora se já existem)
    db.run("ALTER TABLE geradores ADD COLUMN tipo TEXT DEFAULT 'html'", () => {});
    db.run("ALTER TABLE geradores ADD COLUMN arquivo_pdf TEXT DEFAULT NULL", () => {});
});
// MIGRATION: coluna para rastrear quando o certificado digital A1 foi aplicado
db.run("ALTER TABLE admissao_assinaturas ADD COLUMN certificado_assinado_em TEXT DEFAULT NULL", () => {});
// MIGRATION: campo 'avisado previamente' para faltas
db.run("ALTER TABLE faltas ADD COLUMN avisado_previamente TEXT DEFAULT 'Não'", () => {});

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
    const loggedUser = req.user ? (req.user.username || req.user.nome || 'UNKNOWN') : 'SYSTEM';
    db.run("INSERT INTO geradores (nome, conteudo, variaveis, tipo) VALUES (?, ?, ?, 'html')",
        [nome, conteudo, variaveis], function(err) {
            if (err) return res.status(400).json({ error: err.message });
            const newId = this.lastID;
            
            db.run(`INSERT INTO auditoria (usuario, programa, campo, conteudo_anterior, conteudo_atual, registro_id) VALUES (?, ?, ?, ?, ?, ?)`,
                [loggedUser, 'Geradores', 'Inclusão', '', nome, newId]);
                
            res.status(201).json({ id: newId, ...req.body });
        });
});

app.put('/api/geradores/:id', authenticateToken, (req, res) => {
    const { nome, conteudo, variaveis } = req.body;
    const loggedUser = req.user ? (req.user.username || req.user.nome || 'UNKNOWN') : 'SYSTEM';

    db.get('SELECT * FROM geradores WHERE id = ?', [req.params.id], (err, oldRow) => {
        if (err || !oldRow) return res.status(500).json({ error: err ? err.message : 'Not found' });

        db.run("UPDATE geradores SET nome = ?, conteudo = ?, variaveis = ? WHERE id = ?",
            [nome, conteudo, variaveis, req.params.id], function(err2) {
                if (err2) return res.status(500).json({ error: err2.message });

                const changes = [];
                if (oldRow.nome !== nome) changes.push({ campo: 'Nome', old: oldRow.nome, new: nome });
                if (oldRow.conteudo !== conteudo) changes.push({ campo: 'Conteudo HTML', old: '[Anterior Modificado]', new: '[Novo HTML]' });
                if (oldRow.variaveis !== variaveis) changes.push({ campo: 'Variáveis', old: oldRow.variaveis, new: variaveis });

                changes.forEach(c => {
                    db.run(`INSERT INTO auditoria (usuario, programa, campo, conteudo_anterior, conteudo_atual, registro_id) VALUES (?, ?, ?, ?, ?, ?)`,
                        [loggedUser, 'Geradores', c.campo, c.old || '', c.new || '', req.params.id]);
                });

                res.json({ message: 'Gerador atualizado' });
            });
    });
});

app.delete('/api/geradores/:id', authenticateToken, (req, res) => {
    db.get("SELECT nome, arquivo_pdf FROM geradores WHERE id = ?", [req.params.id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Gerador não encontrado' });

        const PROTECTED_NAMES = [
            'autorização de desconto em folha',
            'ordem de serviço nr01',
            'termo de não interesse terapia',
            'termo de interesse terapia',
            'responsabilidade chaves',
            'termo de responsabilidade de chaves',
            'responsabilidade celular',
            'responsabilidade bilhete único',
            'contrato faculdade',
            'contrato academia',
            'acordo de auxílio-combustível',
            'contrato intermitente',
            'responsabilidade equipamento',
            'responsabilidade veículo'
        ];
        
        const originalName = (row.nome || '').trim();
        const u = originalName.toLowerCase();
        
        const BAD_EXACT_NAMES = [
            'AUTORIZAÇÃO DE DESCONTO EM FOLHA DE PAGAMENTO',
            'ORDEM DE SERVIÇO NR01'
        ];

        if (!BAD_EXACT_NAMES.includes(originalName) && PROTECTED_NAMES.some(pn => u.includes(pn))) {
            return res.status(403).json({ error: 'Este documento é padrão do sistema e não pode ser excluído.' });
        }

        if (row && row.arquivo_pdf && fs.existsSync(row.arquivo_pdf)) {
            try { fs.unlinkSync(row.arquivo_pdf); } catch(e) {}
        }
        db.run("DELETE FROM geradores WHERE id = ?", [req.params.id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Gerador removido' });
        });
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
app.post(['/api/geradores/:id/gerar', '/api/geradores/:id/gerar/:colaborador_id'], authenticateToken, (req, res) => {
    const id = req.params.id;
    const colaborador_id = req.params.colaborador_id || req.body.colaborador_id || req.body.colabId;
    
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
                    'ID': colaborador.id,
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
                
                // Valores Dinâmicos Form (se presentes no body)
                if (req.body) {
                    mapping['MODAL_DESCRICAO'] = req.body.desconto_descricao || '';
                    mapping['MODAL_VALOR'] = req.body.desconto_valor || '0,00';
                    mapping['MODAL_PARCELAMENTO'] = req.body.desconto_parcelas || '1';
                    mapping['MODAL_VALOR_PARCELA'] = req.body.desconto_valor_parcela || '0,00';
                    
                    const p = parseInt(req.body.desconto_parcelas) || 1;
                    mapping['PARCELA_1'] = p === 1 ? 'X' : '&nbsp;&nbsp;';
                    mapping['PARCELA_2'] = p === 2 ? 'X' : '&nbsp;&nbsp;';
                    mapping['PARCELA_3'] = p === 3 ? 'X' : '&nbsp;&nbsp;';
                }

                // Substituição bruta (suporta tanto ${CHAVE} quanto {CHAVE})
                Object.keys(mapping).forEach(key => {
                    // Try ${CHAVE} format
                    let regex = new RegExp(`\\$\\{${key}\\}`, 'g');
                    conteudoFinal = conteudoFinal.replace(regex, mapping[key]);
                    // Try {CHAVE} format
                    regex = new RegExp(`\\{${key}\\}`, 'g');
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
    const { colaborador_id, data_falta, turno, observacao, avisado_previamente } = req.body;
    if (!colaborador_id || !data_falta) return res.status(400).json({ error: 'colaborador_id e data_falta são obrigatórios.' });
    db.run('INSERT INTO faltas (colaborador_id, data_falta, turno, observacao, avisado_previamente) VALUES (?, ?, ?, ?, ?)',
        [colaborador_id, data_falta, turno || 'Dia todo', observacao || '', avisado_previamente || 'Não'],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, colaborador_id, data_falta, turno: turno || 'Dia todo', observacao: observacao || '', avisado_previamente: avisado_previamente || 'Não' });
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
                        ?? IMPORTANTE:<br>Após o exame ficar pronto, favor enviar o documento por e-mail diretamente para:<br>
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
            ? '?? Atestado Médico — Inclusão eSocial'
            : '?? Atestado Médico — Controle Interno';
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

        // Garantir que o documento está assinado (pelo menos pelas testemunhas)
        // Suspensões podem ser enviadas à contabilidade apenas com a assinatura das testemunhas
        if (doc.assinafy_status !== 'Assinado' && doc.assinafy_status !== 'Testemunhas') {
            return res.status(400).json({ sucesso: false, error: 'O documento ainda não foi assinado. Aguarde a assinatura do colaborador ou das testemunhas antes de enviar.' });
        }

        // Arquivo em anexo (tenta pegar a versão final, se não, pega a versão com as testemunhas)
        const attachments = [];
        const activeFilePath = doc.signed_file_path ? path.resolve(doc.signed_file_path) : path.resolve(doc.file_path);
        if (fs.existsSync(activeFilePath)) {
            const nomeNorm = (colab.nome_completo || 'Colaborador')
                .toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]+/g, '_');
            const hoje = new Date();
            const dd = String(hoje.getDate()).padStart(2, '0');
            const mm = String(hoje.getMonth() + 1).padStart(2, '0');
            const yyyy = hoje.getFullYear();
            attachments.push({ filename: `Suspensao_Assinada_${dd}-${mm}-${yyyy}_${nomeNorm}.pdf`, path: activeFilePath, contentType: 'application/pdf' });
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
                <h2 style="color: #c0392b; border-bottom: 2px solid #c0392b; padding-bottom: 10px;">?? Suspensão Disciplinar</h2>
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
                        ?? Atenção: Esta suspensão deve ser descontada na folha de pagamento do colaborador.<br>
                        Favor considerar para o fechamento do mês.
                    </p>
                </div>

                ${attachments.length > 1 ? '<p>O documento de suspensão está em anexo neste e-mail.</p>' : ''}
                <p style="margin-top:30px; font-size:0.9em; color:#7f8c8d;">Atenciosamente,<br>Equipe de RH — América Rental</p>
            </div>
        `;

        const transporter = nodemailer.createTransport(SMTP_CONFIG);
        await transporter.sendMail({
            from: `"RH América Rental" <${SMTP_CONFIG.auth.user}>`,
            to: email_to,
            subject: `?? Suspensão para Folha — ${colab.nome_completo} (${tipoSuspensao})`,
            html: htmlContent,
            attachments
        });

        console.log(`[SUSPENSAO CONTAB] Enviado para ${email_to} | Doc: ${document_id} | Colab: ${colab.nome_completo}`);
        
        // Salvar timestamp do envio no documento (usando o mesmo campo da contabilidade)
        const agora = new Date().toISOString();
        await new Promise((resolve, reject) =>
            db.run('UPDATE documentos SET atestado_contab_enviado_em = ? WHERE id = ?',
                [agora, document_id], (err) => err ? reject(err) : resolve()));

        res.json({ sucesso: true, message: 'E-mail de suspensão enviado com sucesso para a contabilidade!', enviado_em: agora });
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
                    
                    const storagePath = process.env.STORAGE_PATH || path.join(__dirname, 'data', 'uploads');
                    const assDir = path.join(storagePath, 'assinados');
                    if (!require('fs').existsSync(assDir)) require('fs').mkdirSync(assDir, { recursive: true });
                    const newPath = path.join(assDir, `ASSINADO_${row.file_name.replace('.pdf', '')}_${Date.now()}.pdf`);
                    
                    // Helper para baixar na memoria
                    const downloadToBuffer = (url) => new Promise((resolve, reject) => {
                        getProtocol.get(url, reqOptions, (response) => {
                            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                                getProtocol.get(response.headers.location, (redRes) => {
                                    const chunks = [];
                                    redRes.on('data', c => chunks.push(c));
                                    redRes.on('end', () => resolve(Buffer.concat(chunks)));
                                }).on('error', reject);
                                return;
                            }
                            const chunks = [];
                            response.on('data', c => chunks.push(c));
                            response.on('end', () => resolve(Buffer.concat(chunks)));
                        }).on('error', reject);
                    });

                    downloadToBuffer(targetUrl).then(async (pdfBuffer) => {
                        // Aplicar selo PFX
                        const signPdfPfx = require('./sign_pdf_pfx');
                        const dispCert = signPdfPfx.verificarDisponibilidade();
                        if (dispCert.disponivel) {
                            try {
                                pdfBuffer = await signPdfPfx.assinarPDF(pdfBuffer, {
                                    motivo: 'Assinado eletronicamente pela empresa',
                                    nome: 'America Rental Equipamentos Ltda'
                                });
                            } catch (e) {
                                console.warn('[DOWNLOAD-ASSINADO] Erro ao aplicar PFX:', e.message);
                            }
                        }
                        
                        require('fs').writeFileSync(newPath, pdfBuffer);
                        
                        db.run('UPDATE documentos SET signed_file_path = ?, assinafy_signed_at = COALESCE(assinafy_signed_at, CURRENT_TIMESTAMP) WHERE id = ?', [newPath, req.params.id]);
                        
                        res.setHeader('Content-Type', 'application/pdf');
                        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
                        res.send(pdfBuffer);
                    }).catch(err => {
                        console.error('[DOWNLOAD-ASSINADO] Erro ao baixar/assinar:', err);
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
            db.get(`SELECT d.id, d.file_name, d.assinafy_id, d.assinafy_status, d.tab_name, d.document_type, d.year, d.month, d.colaborador_id, c.nome_completo
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

            // -- Aplicar selo do certificado digital da empresa no arquivo LOCAL --
            // Isso garante que o botão de olho também mostre o selo, não apenas o OneDrive
            let localPfxBuffer = fs.readFileSync(finalPath);
            const dispCertLocal = signPdfPfx.verificarDisponibilidade();
            if (dispCertLocal.disponivel) {
                try {
                    localPfxBuffer = await signPdfPfx.assinarPDF(localPfxBuffer, {
                        motivo: 'Assinado eletronicamente pela empresa',
                        nome: 'America Rental Equipamentos Ltda'
                    });
                    fs.writeFileSync(finalPath, localPfxBuffer); // sobrescreve com versão PFX
                    console.log('[SIGN] ? Selo PFX aplicado no arquivo local.');
                } catch (pfxErr) {
                    localPfxBuffer = fs.readFileSync(finalPath); // fallback: sem PFX
                    console.warn('[SIGN] Falha ao aplicar PFX local:', pfxErr.message);
                }
            }

            await new Promise((resolve, reject) => {
                db.run(`UPDATE documentos SET assinafy_status = ?, signed_file_path = ?, assinafy_signed_at = COALESCE(assinafy_signed_at, CURRENT_TIMESTAMP) WHERE id = ?`, 
                    [newStatus, finalPath, docId], err => err ? reject(err) : resolve());
            });

            // AUTOMATIC ONEDRIVE SYNC FOR ASSINADO
            if (onedrive && fs.existsSync(finalPath)) {
                try {
                    const onedriveBasePath = process.env.ONEDRIVE_BASE_PATH || "RH/1.Colaboradores/Sistema";
                    const safeColab = formatarNome(doc.nome_completo || "DESCONHECIDO");
                    const safeTab = formatarPasta(doc.tab_name || 'DOCUMENTOS').toUpperCase();
                    const docYear = doc.year && doc.year !== 'null' && doc.year !== '' ? String(doc.year).replace(/[^0-9]/g, '') : String(new Date().getFullYear());
                    let targetDir = `${onedriveBasePath}/${safeColab}/${safeTab}/${docYear}`;
                    // Para Pagamentos/Terapia: adiciona sub-pasta do mês (ex: Abril)
                    if (doc.month && doc.month !== 'null' && doc.month !== '') {
                        targetDir += `/${getMesNome(doc.month)}`;
                    }
                    
                    console.log(`[OneDrive Sync] Sincronizando para: ${targetDir}`);
                    await onedrive.ensurePath(targetDir);

                    // Reutiliza buffer já com PFX (aplicado acima), sem re-processar
                    const safeType = formatarPasta(doc.document_type || doc.tab_name || 'Documento').replace(/\s+/g, '_');
                    const cloudName = `${safeType}_${docYear}_${safeColab}.pdf`;
                    
                    await onedrive.uploadToOneDrive(targetDir, cloudName, localPfxBuffer);
                    console.log(`[OneDrive] ? Documento assinado sincronizado (com certificado): ${cloudName}`);
                } catch (e) { 
                    console.error("[OneDrive] Erro de sync assinado:", e.message); 
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
        // Força download direto do Assinafy para evitar reaproveitar cache antigo sem selo
        addLog('Buscando URL atualizada no Assinafy...');

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
        let localPath = path.join(assDir, `ASSINADO_${path.basename(doc.file_name, '.pdf')}_${Date.now()}.pdf`);

            const downloadToBuffer = (url) => new Promise((resolve, reject) => {
                const https = require('https');
                const proto = url.startsWith('https') ? https : require('http');
                proto.get(url, { headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey } }, (response) => {
                    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                        proto.get(response.headers.location, (r2) => {
                            const chunks = [];
                            r2.on('data', c => chunks.push(c));
                            r2.on('end', () => resolve(Buffer.concat(chunks)));
                        }).on('error', reject);
                        return;
                    }
                    const chunks = [];
                    response.on('data', c => chunks.push(c));
                    response.on('end', () => resolve(Buffer.concat(chunks)));
                }).on('error', reject);
            });

            try {
                let pdfBuffer = await downloadToBuffer(signedUrl);
                
                // Aplicar selo PFX
                const signPdfPfx = require('./sign_pdf_pfx');
                const dispCert = signPdfPfx.verificarDisponibilidade();
                if (dispCert.disponivel) {
                    try {
                        pdfBuffer = await signPdfPfx.assinarPDF(pdfBuffer, {
                            motivo: 'Assinado eletronicamente pela empresa',
                            nome: 'America Rental Equipamentos Ltda'
                        });
                        addLog('Selo PFX aplicado com sucesso.');
                    } catch (e) {
                        addLog('Falha ao aplicar selo PFX: ' + e.message);
                    }
                }
                
                fs.writeFileSync(localPath, pdfBuffer);
            } catch (err) {
                addLog('Erro no download/assinatura: ' + err.message);
                return res.json({ log, error: 'Falha no processamento do arquivo.' });
            }

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
        let targetDir = `${onedriveBasePath}/${safeColab}/${safeTab}`;
        if (safeTab !== '01_FICHA_CADASTRAL') {
            targetDir += `/${docYear}`;
            // Para Pagamentos: sub-pasta com nome do mês em português
            if (safeTab === 'PAGAMENTOS' && doc.month && doc.month !== 'null' && doc.month !== '') {
                targetDir += `/${getMesNome(doc.month)}`;
            }
        }
        // Para Atestados, usa o file_name que já foi gerado com o padrão Z01_DD-MM-AA
        // Para docs assinados, usa o padrão TipoDoc_Ano_NomeColab.pdf
        const isAtestado = (doc.tab_name === 'Atestados');
        // Para atestados, strip o sufixo de timestamp do file_name: CID_DD-MM-AA_Nome_YYYYMMDD_HHMMSS.pdf ? CID_DD-MM-AA_Nome.pdf
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
        addLog(`? Upload concluído com sucesso!`);

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




// FORCE SYNC: Reenviar TODOS os CONTRATOS_AVULSOS sem assinatura para o OneDrive
app.post('/api/force-sync-contratos-avulsos', authenticateToken, async (req, res) => {
    if (!onedrive) return res.status(503).json({ error: 'OneDrive nao configurado' });
    
    db.all("SELECT d.*, c.nome_completo FROM documentos d LEFT JOIN colaboradores c ON d.colaborador_id = c.id WHERE d.tab_name = 'CONTRATOS_AVULSOS' AND (d.assinafy_status IS NULL OR d.assinafy_status = 'Nenhum' OR d.assinafy_status = 'NAO_EXIGE') ORDER BY d.id DESC", [], async (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        let ok = 0, fail = 0;
        const onedriveBasePath = process.env.ONEDRIVE_BASE_PATH || 'RH/1.Colaboradores/Sistema';
        
        for (const doc of (rows || [])) {
            try {
                const locPath = doc.signed_file_path && require('fs').existsSync(doc.signed_file_path)
                    ? doc.signed_file_path
                    : (doc.file_path && require('fs').existsSync(doc.file_path) ? doc.file_path : null);
                if (!locPath) { console.log(`[SYNC-CA] Doc ${doc.id}: arquivo nao encontrado no disco`); fail++; continue; }
                
                const colabNome = doc.nome_completo || 'DESCONHECIDO';
                const safeColab = formatarNome(colabNome);
                const safeType = formatarPasta(doc.document_type || doc.tab_name);
                const cloudFileName = doc.file_name;
                const targetDir = `${onedriveBasePath}/${safeColab}/CONTRATOS`;
                
                await onedrive.ensurePath(`${onedriveBasePath}/${safeColab}`);
                await onedrive.ensurePath(targetDir);
                const buf = require('fs').readFileSync(locPath);
                await onedrive.uploadToOneDrive(targetDir, cloudFileName, buf);
                console.log(`[SYNC-CA] OK: ${cloudFileName}`);
                ok++;
            } catch(e) {
                console.error(`[SYNC-CA] Falha doc ${doc.id}:`, e.message);
                fail++;
            }
        }
        res.json({ ok, fail, total: (rows || []).length });
    });
});
// DIAGNÓSTICO: Verificar estado de um documento e seus campos
app.get('/api/debug-outros-contratos/:docId', authenticateToken, async (req, res) => {
    const { docId } = req.params;
    db.get('SELECT id, colaborador_id, tab_name, document_type, file_path, assinafy_status, assinafy_sent_at, assinafy_signed_at, assinafy_id FROM documentos WHERE id = ?', [docId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ doc: row, base_path: process.env.STORAGE_PATH || 'LOCAL', version: 'V48' });
    });
});

// DIAGNÓSTICO: Listar últimos 5 CONTRATOS_AVULSOS
app.get('/api/debug-contratos-avulsos', authenticateToken, async (req, res) => {
    db.all('SELECT id, colaborador_id, tab_name, document_type, file_path, assinafy_status, assinafy_sent_at, assinafy_signed_at, created_at FROM documentos WHERE tab_name = ? ORDER BY id DESC LIMIT 10', ['CONTRATOS_AVULSOS'], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        // Verificar se os arquivos existem
        const result = (rows || []).map(r => ({
            ...r,
            file_exists: r.file_path ? require('fs').existsSync(r.file_path) : false
        }));
        res.json({ docs: result, version: 'V48', base_path: process.env.STORAGE_PATH });
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

app.get('/api/auditoria/:id?', authenticateToken, (req, res) => {
    const contexto = req.query.contexto;
    const programa = req.query.programa;
    const qId = req.query.id || req.params.id;

    let sql = `SELECT * FROM auditoria`;
    let params = [];
    
    if (programa) {
        // Filtro por programa específico (Cargos, Faculdade, EPI, Avaliações)
        sql += ` WHERE programa LIKE ?`;
        params.push(`%${programa}%`);
    } else if (contexto === 'gerador') {
        sql += ` WHERE programa = 'Geradores'`;
    } else if (contexto === 'colaborador' && qId) {
        sql += ` WHERE programa = 'Colaboradores' AND registro_id = ?`;
        params.push(qId);
    } else if (contexto === 'colaboradores_geral') {
        sql += ` WHERE programa = 'Colaboradores'`;
    } else {
        if (qId) {
            sql += ` WHERE programa = 'Colaboradores' AND registro_id = ?`;
            params.push(qId);
        }
        // else: sem WHERE ? geral
    }
    
    sql += ` ORDER BY data_hora DESC LIMIT 200`;

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// Middleware de Erro Global

app.use((err, req, res, next) => {
    console.error("--- ERRO DETECTADO NO SERVIDOR ---");
    console.error(err);
    res.status(500).json({ error: "Erro interno no servidor." });
});

// === GERADOR DEPARTAMENTO TEMPLATES (quais departamentos recebem cada gerador na Admissão) ===
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

// === GERADOR OUTROS CONTRATOS TEMPLATES (quais departamentos recebem cada gerador em Outros Contratos) ===
db.run(`CREATE TABLE IF NOT EXISTS gerador_outros_contratos_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gerador_id INTEGER NOT NULL,
    departamento_id INTEGER NOT NULL,
    UNIQUE(gerador_id, departamento_id)
)`);

app.get('/api/gerador-outros-contratos-templates', authenticateToken, (req, res) => {
    db.all('SELECT * FROM gerador_outros_contratos_templates', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/gerador-outros-contratos-templates/batch', authenticateToken, (req, res) => {
    const { templates } = req.body;
    if (!Array.isArray(templates)) return res.status(400).json({ error: 'formato inválido' });

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.run('DELETE FROM gerador_outros_contratos_templates', [], (err) => {
            if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: err.message }); }
            if (templates.length === 0) { db.run('COMMIT'); return res.json({ ok: true }); }
            
            const stmt = db.prepare('INSERT INTO gerador_outros_contratos_templates (gerador_id, departamento_id) VALUES (?, ?)');
            let errors = 0;
            templates.forEach(t => { stmt.run([t.gerador_id, t.departamento_id], err => { if (err) errors++; }); });
            stmt.finalize(() => {
                if (errors > 0) { db.run('ROLLBACK'); res.status(500).json({ error: 'Erro ao salvar.' }); }
                else { db.run('COMMIT'); res.json({ ok: true }); }
            });
        });
    });
});

// ---------------------------------------------------------------------------
// ROTAS DE GERENCIAMENTO DO CERTIFICADO DIGITAL (.PFX)
// ---------------------------------------------------------------------------

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
        res.json({ ok: true, tamanho_bytes: pdfAssinado.length, message: '? Assinatura digital funcionando corretamente!' });
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
            console.log(`[CERT] ? Certificado digital pronto para uso: ${process.env.PFX_PATH}`);
        } else {
            console.log(`[CERT] ??  Nenhum certificado configurado. Configure em Diretoria ? Certificado Digital.`);
        }
    });
}, 3000);


// --- NOVAS ROTAS DA FICHA DE ADMISSÃO ---
const { getFichaAdmissaoHtml } = require('./fichaAdmissao');

app.get('/api/colaboradores/:id/ficha-admissao/html', authenticateToken, async (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM colaboradores WHERE id = ?', [id], async (err, row) => {
        if (err || !row) return res.status(404).send('Colaborador não encontrado');
        try {
            // Buscar dependentes (filhos) para incluir na ficha
            const deps = await new Promise((resolve) =>
                db.all('SELECT * FROM dependentes WHERE colaborador_id = ?', [id], (e, r) => resolve(r || []))
            );
            row.dependentes = deps;

            const htmlPdf = require('html-pdf-node');
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const html = getFichaAdmissaoHtml(row, baseUrl);
            const pdfBuffer = await htmlPdf.generatePdf(
                { content: html },
                { format: 'A4', margin: { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' },
                  printBackground: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
            );
            const nomeArq = encodeURIComponent(`Ficha_Admissao_${row.nome_completo || 'Colaborador'}.pdf`);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${nomeArq}"`);
            res.send(pdfBuffer);
        } catch(e) {
            console.error('[FICHA-ADMISSAO]', e.message);
            res.status(500).json({ error: e.message });
        }
    });
});

app.post('/api/colaboradores/:id/enviar-ficha-contabilidade', authenticateToken, async (req, res) => {
    const id = req.params.id;
    const { email, data_inicio } = req.body;
    if (!email) return res.status(400).json({ error: 'Email destino é obrigatório' });
    if (!data_inicio) return res.status(400).json({ error: 'Data de início é obrigatória' });
    
    db.get('SELECT * FROM colaboradores WHERE id = ?', [id], async (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Colaborador não encontrado' });
        
        try {
            const deps = await new Promise((resolve) =>
                db.all('SELECT * FROM dependentes WHERE colaborador_id = ?', [id], (e, r) => resolve(r || []))
            );
            row.dependentes = deps;

            const dtObj = new Date(data_inicio + 'T12:00:00');
            const dtFormated = dtObj.toLocaleDateString('pt-BR');

            // Find existing docs in DB
            const docsDb = await new Promise(resolve => {
                db.all("SELECT * FROM documentos WHERE colaborador_id = ? AND tab_name IN ('01_FICHA_CADASTRAL', 'ASO')", [id], (err, rows) => resolve(rows || []));
            });

            // Check if there is already a Ficha in the database attachments
            const hasFichaInDb = docsDb.some(d => {
                const dt = (d.document_type || '').toLowerCase();
                return dt.includes('ficha') || dt.includes('admissão') || dt.includes('admissao');
            });

            const anexosParaEnviar = [];

            // Add generated Ficha ONLY if none exists in DB
            if (!hasFichaInDb) {
                const htmlPdf = require('html-pdf-node');
                const html = getFichaAdmissaoHtml(row);
                const pdfBuffer = await htmlPdf.generatePdf(
                    { content: html },
                    { format: 'A4', margin: { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' }, printBackground: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
                );
                anexosParaEnviar.push({
                    filename: `Ficha Admissional - ${row.nome_completo || row.nome || 'Colaborador'}.pdf`,
                    content: pdfBuffer
                });
            }

            // Iterate docs to rename them uniformly, always favor signed version
            for (const doc of docsDb) {
                const fs = require('fs');
                const path = require('path');
                
                // For ASO docs: signed = assinado por ambos (empresa + colaborador)
                // Priority: signed_file_path > file_path
                let localPath = null;
                let isSigned = false;
                
                if (doc.signed_file_path && fs.existsSync(doc.signed_file_path)) {
                    localPath = doc.signed_file_path;
                    isSigned = true;
                } else if (doc.file_path && fs.existsSync(doc.file_path)) {
                    localPath = doc.file_path;
                    isSigned = false;
                }
                
                if (localPath) {
                    const ext = path.extname(localPath) || '.pdf';
                    let baseType = (doc.document_type || 'Documento').replace(/[^a-zA-Z0-9 áéíóúãõçÁÉÍÓÚÃÕÇ-]/g, '').trim();
                    // For ASO, annotate if it's the signed version
                    let signedTag = (doc.tab_name === 'ASO' && isSigned) ? ' (Assinado)' : '';
                    let safeName = `${baseType}${signedTag} - ${row.nome_completo || row.nome}${ext}`;
                    
                    if (doc.tab_name === 'ASO' && !isSigned) {
                        console.warn(`[CONTABILIDADE] ASO sem assinatura sendo usado para ${row.nome_completo}. Signed path: ${doc.signed_file_path || 'N/A'}`);
                    }
                    
                    anexosParaEnviar.push({
                        filename: safeName,
                        path: localPath
                    });
                }
            }

            const apiBase = (process.env.BASE_URL || 'https://sistema-america.onrender.com');
            const logoUrl = `${apiBase}/assets/logo-header.png`;
            const htmlMessage = `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
                <div style="background:#0f172a;text-align:center;padding:20px;">
                    <img src="${logoUrl}" alt="América Rental" style="max-height:60px;">
                </div>
                <div style="padding:30px;">
                    <p style="font-size:1.1rem;margin-top:0;"><strong>Olá, Contabilidade!</strong></p>
                    <p>Segue em anexo a Ficha de Admissão e todos os documentos necessários recolhidos para o cadastro contábil admissional do colaborador abaixo.</p>
                    <div style="background:#f8fafc;border-left:4px solid #f503c5;padding:15px;margin:20px 0;border-radius:0 8px 8px 0;">
                        <p style="margin:0 0 5px 0;"><strong>Colaborador(a):</strong> ${row.nome_completo || row.nome}</p>
                        <p style="margin:0 0 5px 0;"><strong>Função / Cargo:</strong> ${row.cargo || 'Não informado'}</p>
                        <p style="margin:0;"><strong>Data de Início Solicitada:</strong> ${dtFormated}</p>
                    </div>
                    <p>Por favor, providenciar os registros cabíveis e retorno dos documentos em caso de pendências.</p>
                    <hr style="border:none;border-top:1px solid #e2e8f0;margin:30px 0;">
                    <p style="margin:0;font-size:0.9rem;color:#64748b;">Atenciosamente,<br><strong>RH - América Rental</strong></p>
                </div>
            </div>`;

            const transporter = nodemailer.createTransport(SMTP_CONFIG);
            await transporter.sendMail({
                from: `"RH América Rental" <${SMTP_CONFIG.auth.user}>`,
                to: email,
                subject: `Processo Admissional - ${row.nome_completo || row.nome}`,
                html: htmlMessage,
                attachments: anexosParaEnviar
            });

            // Save status in database
            const nomesAnexos = anexosParaEnviar.map(a => a.filename).join(', ');
            const enviada_em = new Date().toISOString();
            db.run(
                "UPDATE colaboradores SET admissao_contabil_enviada_em = CURRENT_TIMESTAMP, admissao_contabil_anexos = ? WHERE id = ?",
                [nomesAnexos, id],
                (err3) => {
                    if (err3) console.error("Erro ao salvar log de contabilidade:", err3);
                    res.json({
                        sucesso: true,
                        enviada_em: enviada_em,
                        anexos: nomesAnexos,
                        lista_anexos: anexosParaEnviar.map(a => a.filename)
                    });
                }
            );

        } catch (e) {
            console.error('Erro ao enviar ficha:', e);
            res.status(500).json({ error: e.message });
        }
    });
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

// ============================================================
// MULTAS DE TRÂNSITO
// ============================================================

// Tabela CTB: código ? { pontuacao, valor }
const CTB_TABLE = {
    '5185': { pontuacao: 7, valor: 'R$ 293,47', descricao: 'Ultrapassar sinal vermelho do semáforo' },
    '5169': { pontuacao: 7, valor: 'R$ 293,47', descricao: 'Usar aparelho de comunicação ao volante' },
    '5460': { pontuacao: 7, valor: 'R$ 293,47', descricao: 'Conduzir sem cinto de segurança' },
    '5550': { pontuacao: 5, valor: 'R$ 130,16', descricao: 'Velocidade superior ao limite em até 20%' },
    '5556': { pontuacao: 7, valor: 'R$ 880,41', descricao: 'Velocidade superior ao limite em mais de 50%' },
    '5553': { pontuacao: 5, valor: 'R$ 195,23', descricao: 'Velocidade superior ao limite entre 20% e 50%' },
    '7455': { pontuacao: 5, valor: 'R$ 130,16', descricao: 'Transitar em velocidade superior à máxima permitida em até 20%' },
    '7456': { pontuacao: 5, valor: 'R$ 195,23', descricao: 'Transitar em velocidade superior à máxima entre 20% e 50%' },
    '7457': { pontuacao: 7, valor: 'R$ 880,41', descricao: 'Transitar em velocidade superior à máxima em mais de 50%' },
    '6050': { pontuacao: 3, valor: 'R$ 195,23', descricao: 'Estacionar em local proibido' },
    '6010': { pontuacao: 3, valor: 'R$ 130,16', descricao: 'Parar em local proibido' },
    '5681': { pontuacao: 5, valor: 'R$ 195,23', descricao: 'Avançar sobre calçada' },
    '6730': { pontuacao: 3, valor: 'R$ 130,16', descricao: 'Circular com o veículo sujo' },
    '5736': { pontuacao: 7, valor: 'R$ 293,47', descricao: 'Dirigir sob influência de álcool' },
    '5854': { pontuacao: 7, valor: 'R$ 293,47', descricao: 'Deixar de dar passagem a veículo de emergência' },
    '5762': { pontuacao: 5, valor: 'R$ 195,23', descricao: 'Trafegar em acostamento' },
    '5974': { pontuacao: 5, valor: 'R$ 195,23', descricao: 'Não sinalizar redução de velocidade' },
    '5312': { pontuacao: 5, valor: 'R$ 195,23', descricao: 'Executar conversão proibida' },
    '6289': { pontuacao: 3, valor: 'R$ 130,16', descricao: 'Usar buzina em local proibido' },
};

// Upload multerista exclusiva para notificações de multa (salva em /tmp para extração)
const multaUpload = multer({ storage: multer.memoryStorage() });

// GET /api/colaboradores/:id/multas
app.get('/api/colaboradores/:id/multas', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.all('SELECT * FROM multas WHERE colaborador_id = ? ORDER BY created_at DESC', [id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// GET /api/ctb/:codigo — lookup de código de infração
app.get('/api/ctb/:codigo', authenticateToken, (req, res) => {
    const { codigo } = req.params;
    const entry = CTB_TABLE[codigo];
    if (entry) return res.json({ codigo, ...entry });
    res.json({ codigo, pontuacao: null, valor: null, descricao: null, found: false });
});

// POST /api/colaboradores/:id/multas/upload-notificacao — extrai dados do PDF
app.post('/api/colaboradores/:id/multas/upload-notificacao', authenticateToken, multaUpload.single('arquivo'), async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

        // Extrai texto do PDF
        const pdfData = await pdfParse(req.file.buffer);
        const texto = pdfData.text || '';

        const extract = (regex, group = 1) => {
            const m = texto.match(regex);
            return m ? m[group].trim() : '';
        };

        // Regex adaptados para o layout SENATRAN
        const placa           = extract(/PLACA\s*\n([A-Z0-9]{7})/i) || extract(/PLACA\s+([A-Z]{3}[0-9][A-Z0-9][0-9]{2})/i);
        const veiculo         = extract(/MARCA\/MODELO\/VERS[ÃA]O\s*\n(.+)/i);
        const codigoInfracao  = extract(/C[ÓO]DIGO DA INFRA[ÇC][ÃA]O\s*\n(\d{4,6})/i);
        const descricao       = extract(/DESCRI[ÇC][ÃA]O DA INFRA[ÇC][ÃA]O\s*\n(.+)/i);
        const dataInfracao    = extract(/\bDATA\b\s*\n(\d{2}\/\d{2}\/\d{4})/i);
        const horaInfracao    = extract(/\bHORA\b\s*\n(\d{2}:\d{2})/i);
        const localInfracao   = extract(/LOCAL DA INFRA[ÇC][ÃA]O\s*\n(.+)/i);
        const valorMulta      = extract(/VALOR DA MULTA\s*\nRS?\s*([\d.,]+)/i);
        const numeroAit       = extract(/N[ÚU]MERO DO AUTO DE INFRA[ÇC][ÃA]O\s*\n([A-Z0-9]+)/i) ||
                                 extract(/IDENTIFICA[ÇC][ÃA]O DO AUTO DE INFRA[ÇC][ÃA]O[^\n]*\n([A-Z0-9]+)/i);

        // Lookup CTB para pontuação/valor oficial
        const ctb = CTB_TABLE[codigoInfracao] || {};

        res.json({
            placa,
            veiculo,
            codigo_infracao: codigoInfracao,
            descricao_infracao: descricao || ctb.descricao || '',
            data_infracao: dataInfracao,
            hora_infracao: horaInfracao,
            local_infracao: localInfracao,
            valor_multa: ctb.valor || (valorMulta ? `R$ ${valorMulta}` : ''),
            pontuacao: ctb.pontuacao || null,
            numero_ait: numeroAit,
            texto_completo: texto.substring(0, 500) // debug
        });
    } catch (e) {
        console.error('Erro ao extrair PDF multa:', e);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/colaboradores/:id/multas — salva multa no banco e arquivo no OneDrive
app.post('/api/colaboradores/:id/multas', authenticateToken, multaUpload.single('arquivo'), async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;

        // Buscar colaborador
        const colab = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM colaboradores WHERE id = ?', [id], (err, row) => err ? reject(err) : resolve(row));
        });
        if (!colab) return res.status(404).json({ error: 'Colaborador não encontrado.' });

        // Montar nome da pasta (ex: THAIS_RICCI)
        const nomeFormatado = (colab.nome_completo || colab.nome || 'COLAB')
            .toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');

        const codigo = (body.codigo_infracao || 'MULTA').replace(/[^A-Z0-9]/gi, '');
        const data = new Date();
        const dataStr = `${String(data.getDate()).padStart(2,'0')}${String(data.getMonth()+1).padStart(2,'0')}${data.getFullYear()}`;

        // Caminho da pasta
        const multaDir = path.join(
            'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\RH\\1.Colaboradores\\Sistema',
            nomeFormatado, 'MULTAS', codigo
        );
        if (!fs.existsSync(multaDir)) fs.mkdirSync(multaDir, { recursive: true });

        // Nome do arquivo
        let notificacaoPath = null;
        if (req.file) {
            const nomeArquivo = `${codigo}_${dataStr}_${nomeFormatado}.pdf`;
            const fullPath = path.join(multaDir, nomeArquivo);
            fs.writeFileSync(fullPath, req.file.buffer);
            notificacaoPath = fullPath;
        }

        // Salvar no banco
        const stmt = `INSERT INTO multas (colaborador_id, codigo_infracao, descricao_infracao, placa, veiculo,
            data_infracao, hora_infracao, local_infracao, numero_ait, pontuacao, valor_multa,
            notificacao_path, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'pendente')`;
        db.run(stmt, [id, body.codigo_infracao, body.descricao_infracao, body.placa, body.veiculo,
            body.data_infracao, body.hora_infracao, body.local_infracao, body.numero_ait,
            body.pontuacao, body.valor_multa, notificacaoPath],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ sucesso: true, id: this.lastID, pasta: multaDir });
            }
        );
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// PUT /api/colaboradores/:id/multas/:multaId — atualiza multa (tipo, parcelas, status, etc.)
app.put('/api/colaboradores/:id/multas/:multaId', authenticateToken, (req, res) => {
    const { multaId } = req.params;
    const fields = req.body;
    const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
    const vals = [...Object.values(fields), multaId];
    db.run(`UPDATE multas SET ${sets} WHERE id = ?`, vals, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ sucesso: true });
    });
});

// DELETE /api/colaboradores/:id/multas/:multaId — remove multa não assinada
app.delete('/api/colaboradores/:id/multas/:multaId', authenticateToken, (req, res) => {
    const { multaId } = req.params;
    db.get('SELECT * FROM multas WHERE id = ?', [multaId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Multa não encontrada.' });
        if (row.status === 'assinado' || row.status === 'confirmado') {
            return res.status(403).json({ error: 'Não é possível excluir uma multa já assinada ou confirmada.' });
        }
        db.run('DELETE FROM multas WHERE id = ?', [multaId], function(e) {
            if (e) return res.status(500).json({ error: e.message });
            res.json({ sucesso: true });
        });
    });
});

// POST /api/colaboradores/:id/multas/:multaId/gerar-documento — gera HTML do termo
app.post('/api/colaboradores/:id/multas/:multaId/gerar-documento', authenticateToken, async (req, res) => {
    try {
        const { id, multaId } = req.params;
        const { tipo } = req.body; // 'indicacao' | 'nic'

        const colab = await new Promise((resolve, reject) =>
            db.get('SELECT * FROM colaboradores WHERE id = ?', [id], (e, r) => e ? reject(e) : resolve(r)));
        const multa = await new Promise((resolve, reject) =>
            db.get('SELECT * FROM multas WHERE id = ?', [multaId], (e, r) => e ? reject(e) : resolve(r)));
        if (!colab || !multa) return res.status(404).json({ error: 'Não encontrado.' });

        const parcelas = multa.parcelas || 1;
        const check1x = parcelas === 1 ? '?' : '&nbsp;';
        const check2x = parcelas === 2 ? '?' : '&nbsp;';
        const check3x = parcelas === 3 ? '?' : '&nbsp;';
        // Calcular valor das parcelas
        const _vBruto = multa.valor_multa ? parseFloat(String(multa.valor_multa).replace(/[^0-9,.]/g,'').replace(',','.')) : 0;
        const _fmt = (v) => v > 0 ? 'R\$ ' + v.toFixed(2).replace('.',',') : '';
        const _v1 = _fmt(_vBruto);
        const _v2 = _fmt(_vBruto / 2);
        const _v3 = _fmt(_vBruto / 3);

        const nome = colab.nome_completo || colab.nome || '';
        const cpf = colab.cpf || '';
        const admissao = colab.data_admissao ? new Date(colab.data_admissao).toLocaleDateString('pt-BR') : '---';
        const endereco = [colab.endereco, colab.bairro, colab.cidade, colab.estado].filter(Boolean).join(', ') || '---';
        const cargo = colab.cargo || '';
        const salario = colab.salario ? `R$ ${parseFloat(colab.salario).toFixed(2).replace('.',',')}` : '---';
        const celular = colab.celular || colab.telefone || '---';
        const email = colab.email || '---';

        const tituloDoc = tipo === 'indicacao'
            ? 'TERMO DE AUTORIZAÇÃO DE DESCONTO E INDICAÇÃO DE CONDUTOR MULTA DE TRÂNSITO'
            : 'TERMO DE RESPONSABILIDADE POR INFRAÇÃO DE TRÂNSITO E AUTORIZAÇÃO DE DESCONTO EM FOLHA';

        const textoDoc = tipo === 'indicacao' ? `
            <p>Declaro estar ciente de que a infração ocorreu durante a condução do referido veículo sob
            minha responsabilidade e, portanto, assumo a responsabilidade pela infração cometida.</p>
            <p>Autorizo a empresa América Rental Equipamentos Ltda a realizar minha indicação como
            condutor responsável pela infração junto ao órgão de trânsito competente, para fins de
            registro da pontuação correspondente em minha Carteira Nacional de Habilitação (CNH).</p>
            <p>Declaro também estar ciente do valor da multa, e autorizo expressamente a empresa a
            efetuar o desconto do valor correspondente em minha remuneração, caso o pagamento seja
            realizado pela empresa, respeitando os limites previstos no artigo 462 da Consolidação das
            Leis do Trabalho (CLT).</p>
        ` : `
            <p>Declaro estar ciente de que a referida infração ocorreu durante a condução do veículo sob
            minha responsabilidade.</p>
            <p>Por minha livre e espontânea vontade, opto por não realizar a indicação de condutor junto ao
            órgão de trânsito, estando ciente de que essa decisão poderá gerar a aplicação de multa por
            Não Identificação do Condutor (NIC) ao proprietário do veículo.</p>
            <p>Dessa forma, assumo integral responsabilidade pelo pagamento da multa original e também
            pela eventual multa NIC, autorizando expressamente a empresa América Rental Equipamentos Ltda
            a realizar o desconto dos valores correspondentes em minha remuneração, caso os pagamentos sejam
            realizados pela empresa, respeitando os limites previstos no artigo 462 da Consolidação das
            Leis do Trabalho (CLT).</p>
            <p>Declaro estar ciente de que os valores poderão ser descontados integralmente ou parcelados,
            conforme acordo com a empresa, até a quitação total do débito.</p>
        `;

        const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; font-size: 12px; margin: 40px; color: #000; }
            .logo-header { text-align: center; margin-bottom: 20px; padding-bottom: 12px; }
            .logo-header img { max-width: 100%; max-height: 90px; display: block; margin: 0 auto; }
            .titulo { text-align: center; font-weight: bold; font-size: 14px; margin: 20px 0; }
            .colab-label { font-size: 13px; margin-bottom: 10px; }
            .box { border: 1px solid #000; padding: 10px; margin-bottom: 15px; font-size: 11px; }
            .box p { margin: 3px 0; }
            table.info { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            table.info td { border: 1px solid #000; padding: 6px 8px; font-size: 11px; }
            table.info td b { font-weight: bold; }
            p { margin-bottom: 10px; line-height: 1.5; font-size: 11.5px; }
            .parcelas { margin: 15px 0; font-size: 12px; }
            .data-local { font-weight: bold; }
            .assinaturas { margin-top: 40px; }
            .assin-row { display: flex; gap: 30px; margin-bottom: 30px; }
            .assin-box { flex:1; border-top: 1px solid #000; padding-top: 5px; text-align: center; font-size: 10px; min-height: 80px; }
        </style></head><body>
        <div class="logo-header"><img src="data:image/png;base64,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" alt="América Rental"></div>
        <div class="titulo">${tituloDoc}</div>
        <div class="colab-label"><strong>COLABORADOR:</strong> ${nome}</div>
        <div class="box">
            <p><strong>DADOS COLABORADOR:</strong></p>
            <p>CPF: <strong>${cpf}</strong>&nbsp;&nbsp;&nbsp;ADMISSÃO: ${admissao}</p>
            <p>ENDEREÇO: ${endereco}</p>
            <p>CARGO: ${cargo}&nbsp;&nbsp;&nbsp;SALÁRIO: ${salario}</p>
            <p>CELULAR: ${celular}&nbsp;&nbsp;&nbsp;E-MAIL: ${email}</p>
        </div>
        <table class="info">
            <tr>
                <td><b>PLACA:</b> ${multa.placa || ''}</td>
                <td><b>VEÍCULO:</b> ${multa.veiculo || ''}</td>
            </tr>
            <tr>
                <td><b>CÓDIGO INFRAÇÃO:</b> ${multa.codigo_infracao || ''}</td>
                <td><b>INFRAÇÃO:</b> ${multa.descricao_infracao || ''}</td>
            </tr>
            <tr>
                <td colspan="2"><b>DATA E HORA:</b> ${multa.data_infracao || ''} ${multa.hora_infracao || ''}</td>
            </tr>
            <tr>
                <td colspan="2"><b>LOCAL DA INFRAÇÃO:</b> ${multa.local_infracao || ''}</td>
            </tr>
            <tr>
                <td><b>PONTUAÇÃO:</b> ${multa.pontuacao || ''}</td>
                <td><b>VALOR DA MULTA:</b> ${multa.valor_multa || ''}</td>
            </tr>
        </table>
        ${textoDoc}
        <p class="parcelas"><strong>Solicito que o desconto seja feito em:</strong><br>
            (${check1x}) <strong>1x</strong>${_v1 ? ' — ' + _v1 : ''} &nbsp;&nbsp;&nbsp;
            (${check2x}) <strong>2x</strong>${_v2 ? ' — ' + _v2 + '/mês' : ''} &nbsp;&nbsp;&nbsp;
            (${check3x}) <strong>3x</strong>${_v3 ? ' — ' + _v3 + '/mês' : ''}
        </p>
        ${(function() {
            var meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
            var d = multa.data_infracao ? new Date(multa.data_infracao + 'T12:00:00') : new Date();
            var hoje = new Date();
            var dia = hoje.getDate();
            var mes = meses[hoje.getMonth()];
            var ano = hoje.getFullYear();
            return '<p class="data-local"><strong>Guarulhos, ' + dia + ' de ' + mes + ' de ' + ano + '.</strong></p>';
        })()}
        <div class="assinaturas">
            <div class="assin-row">
                <div class="assin-box" style="min-height:100px;">Assinatura do Colaborador<br><br><br>${nome}</div>
                <div class="assin-box" style="min-height:100px;">Testemunha 1<br><br><br>&nbsp;</div>
                <div class="assin-box" style="min-height:100px;">Testemunha 2<br><br><br>&nbsp;</div>
            </div>
        </div>
        </body></html>`;

        res.json({ sucesso: true, html });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/colaboradores/:id/multas/:multaId/iniciar-processo — salva tipo/parcelas e marca processo iniciado
app.post('/api/colaboradores/:id/multas/:multaId/iniciar-processo', authenticateToken, (req, res) => {
    const { multaId } = req.params;
    const { tipo_resolucao, parcelas, documento_html } = req.body;
    db.run(
        `UPDATE multas SET tipo_resolucao = ?, parcelas = ?, processo_iniciado = 1, status = 'doc_gerado', documento_html = ? WHERE id = ?`,
        [tipo_resolucao, parcelas || 1, documento_html || null, multaId],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ sucesso: true });
        }
    );
});

// POST /api/colaboradores/:id/multas/:multaId/assinar-testemunhas — salva assinaturas das testemunhas
app.post('/api/colaboradores/:id/multas/:multaId/assinar-testemunhas', authenticateToken, (req, res) => {
    const { multaId } = req.params;
    const { testemunha1_nome, testemunha1_assinatura, testemunha2_nome, testemunha2_assinatura, documento_html } = req.body;
    if (!testemunha1_assinatura) {
        return res.status(400).json({ error: 'Assinatura da primeira testemunha é obrigatória.' });
    }
    db.run(
        `UPDATE multas SET
            assinatura_testemunha1_nome = ?,
            assinatura_testemunha1_base64 = ?,
            assinatura_testemunha2_nome = ?,
            assinatura_testemunha2_base64 = ?,
            documento_html = COALESCE(?, documento_html),
            status = 'testemunhas_assinadas'
        WHERE id = ?`,
        [testemunha1_nome, testemunha1_assinatura, testemunha2_nome || null, testemunha2_assinatura || null, documento_html || null, multaId],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ sucesso: true });
        }
    );
});

// POST /api/colaboradores/:id/multas/:multaId/assinar-condutor — salva assinatura do condutor
app.post('/api/colaboradores/:id/multas/:multaId/assinar-condutor', authenticateToken, (req, res) => {
    const { multaId } = req.params;
    const { assinatura_base64 } = req.body;
    if (!assinatura_base64) return res.status(400).json({ error: 'Assinatura obrigatória.' });
    db.run(
        `UPDATE multas SET assinatura_condutor_base64 = ?, assinaturas_finalizadas = 1, status = 'assinado' WHERE id = ?`,
        [assinatura_base64, multaId],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ sucesso: true });
        }
    );
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log('Versão do Servidor: V28_FINAL_FIX');
    console.log(`Caminho de Armazenamento Local: ${BASE_UPLOAD_PATH}`);
});
