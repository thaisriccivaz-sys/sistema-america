/**
 * Script de Migração: OneDrive → Cloudflare R2
 * 
 * Este script busca todos os documentos do banco que ainda não têm r2_key,
 * baixa o arquivo do OneDrive (ou disco local se disponível) e faz upload para o R2
 * mantendo a estrutura de pastas:
 *   Colaboradores/{Nome}/{Tab}/{Ano?}/{Mes?}/{arquivo}
 * 
 * USO: node migrate_to_r2.js
 * 
 * Variáveis de ambiente necessárias (mesmas do servidor):
 *   R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET_NAME
 *   ONEDRIVE_CLIENT_ID, ONEDRIVE_CLIENT_SECRET, ONEDRIVE_TENANT_ID, ONEDRIVE_USER_EMAIL, ONEDRIVE_BASE_PATH
 */

require('dotenv').config({ path: '.env' });

const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const r2 = require('./backend/utils/r2');

// ─── Configuração ───────────────────────────────────────────────────────────
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'backend', 'data', 'hr_system_v2.sqlite');
const ONEDRIVE_BASE_PATH = process.env.ONEDRIVE_BASE_PATH || 'RH/1.Colaboradores/Sistema';

let onedrive = null;
if (process.env.ONEDRIVE_CLIENT_ID) {
    try {
        onedrive = require('./backend/onedrive');
        console.log('✅ OneDrive configurado');
    } catch (e) {
        console.warn('⚠️  OneDrive não disponível:', e.message);
    }
}

const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
    if (err) { console.error('❌ Erro ao abrir banco:', err.message); process.exit(1); }
    console.log('✅ Banco de dados aberto:', DB_PATH);
});

// ─── Funções auxiliares ──────────────────────────────────────────────────────

const MONTH_NAMES_PT = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function getMesNome(monthStr) {
    const idx = parseInt(monthStr, 10) - 1;
    return (idx >= 0 && idx < 12) ? MONTH_NAMES_PT[idx] : String(monthStr);
}

function tabToR2Folder(tab) {
    const map = {
        'CONTRATOS': 'Contratos', 'CONTRATOS_AVULSOS': 'Contratos',
        'Atestados': 'Atestados', 'ASO': 'ASO', 'PAGAMENTOS': 'Pagamentos',
        'Advertências': 'Advertencias', 'EPI': 'EPI', 'Fotos': 'Fotos',
        'AVALIACAO': 'Avaliacao', 'FACULDADE': 'Faculdade',
        '01_FICHA_CADASTRAL': 'Ficha_Cadastral', 'Terapia': 'Terapia',
        'Treinamentos': 'Treinamentos', 'Boletim de ocorrência': 'Ocorrencias', 'Multas': 'Multas',
    };
    return map[tab] || (tab || 'Outros').replace(/[^a-zA-Z0-9_]/g, '_');
}

function safeColabName(nome) {
    return (nome || 'DESCONHECIDO')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9 ]/g, '').trim()
        .replace(/\s+/g, '_').toUpperCase();
}

function buildR2Key(doc) {
    const safeColab = safeColabName(doc.nome_completo);
    const tabFolder = tabToR2Folder(doc.tab_name);
    const isContrato = doc.tab_name === 'CONTRATOS' || doc.tab_name === 'CONTRATOS_AVULSOS';
    const isFicha = doc.tab_name === '01_FICHA_CADASTRAL';
    const docYear = doc.year && doc.year !== 'null' && doc.year !== '' ? String(doc.year).replace(/[^0-9]/g, '') : String(new Date().getFullYear());

    let r2Dir = `Colaboradores/${safeColab}/${tabFolder}`;
    if (!isContrato && !isFicha) {
        r2Dir += `/${docYear}`;
        if (doc.tab_name === 'PAGAMENTOS' && doc.month && doc.month !== 'null' && doc.month !== '') {
            r2Dir += `/${getMesNome(doc.month)}`;
        }
    }
    return `${r2Dir}/${doc.file_name}`;
}

function buildOneDrivePath(doc) {
    const safeColab = safeColabName(doc.nome_completo);
    const tabFolder = tabToR2Folder(doc.tab_name);
    const isContrato = doc.tab_name === 'CONTRATOS' || doc.tab_name === 'CONTRATOS_AVULSOS';
    const isFicha = doc.tab_name === '01_FICHA_CADASTRAL';
    const docYear = doc.year && doc.year !== 'null' && doc.year !== '' ? String(doc.year).replace(/[^0-9]/g, '') : String(new Date().getFullYear());

    let dir = `${ONEDRIVE_BASE_PATH}/${safeColab}/${tabFolder}`;
    if (!isContrato && !isFicha) {
        dir += `/${docYear}`;
        if (doc.tab_name === 'PAGAMENTOS' && doc.month && doc.month !== 'null' && doc.month !== '') {
            dir += `/${getMesNome(doc.month)}`;
        }
    }
    return `${dir}/${doc.file_name}`;
}

// ─── Migração principal ──────────────────────────────────────────────────────

async function migrateDocuments() {
    console.log('\n🚀 Iniciando migração de documentos para R2...\n');

    if (!r2.isReady()) {
        console.error('❌ R2 não está configurado. Verifique as variáveis de ambiente R2_*');
        process.exit(1);
    }

    // Buscar todos os documentos sem r2_key
    const docs = await new Promise((resolve, reject) => {
        db.all(`
            SELECT d.*, c.nome_completo 
            FROM documentos d
            JOIN colaboradores c ON c.id = d.colaborador_id
            WHERE d.r2_key IS NULL AND d.file_name IS NOT NULL
            ORDER BY d.id ASC
        `, [], (err, rows) => err ? reject(err) : resolve(rows));
    });

    console.log(`📊 Total de documentos para migrar: ${docs.length}\n`);

    let success = 0, failed = 0, skipped = 0;

    for (const doc of docs) {
        const r2Key = buildR2Key(doc);
        console.log(`[${doc.id}] ${doc.nome_completo} | ${doc.tab_name} | ${doc.file_name}`);
        console.log(`       → ${r2Key}`);

        let fileBuffer = null;

        // 1. Tentar do disco local
        if (doc.file_path && fs.existsSync(doc.file_path)) {
            try {
                fileBuffer = fs.readFileSync(doc.file_path);
                console.log(`       ← Disco local`);
            } catch (e) {
                console.warn(`       ⚠️  Erro ao ler disco: ${e.message}`);
            }
        }

        // 2. Tentar do OneDrive se não tem no disco
        if (!fileBuffer && onedrive) {
            const odPath = buildOneDrivePath(doc);
            try {
                fileBuffer = await onedrive.downloadFromOneDrive(odPath);
                if (fileBuffer) console.log(`       ← OneDrive: ${odPath}`);
            } catch (e) {
                console.warn(`       ⚠️  OneDrive falhou: ${e.message}`);
            }
        }

        if (!fileBuffer) {
            console.warn(`       ⏭️  PULADO — arquivo não encontrado nem em disco nem no OneDrive\n`);
            skipped++;
            continue;
        }

        // Upload para R2
        try {
            const fileName = doc.file_name || 'documento.pdf';
            const mimeType = fileName.toLowerCase().endsWith('.docx')
                ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                : (fileName.toLowerCase().endsWith('.doc') ? 'application/msword' : 'application/pdf');

            await r2.uploadToR2(r2Key, fileBuffer, mimeType);

            // Atualizar r2_key no banco
            await new Promise((resolve) => db.run('UPDATE documentos SET r2_key = ? WHERE id = ?', [r2Key, doc.id], resolve));

            console.log(`       ✅ Upload R2 OK\n`);
            success++;
        } catch (e) {
            console.error(`       ❌ Erro no upload R2: ${e.message}\n`);
            failed++;
        }

        // Pequena pausa para não sobrecarregar
        await new Promise(r => setTimeout(r, 100));
    }

    console.log('\n═══════════════════════════════════════');
    console.log(`✅ Migração concluída!`);
    console.log(`   Sucesso:  ${success}`);
    console.log(`   Falhas:   ${failed}`);
    console.log(`   Pulados:  ${skipped} (arquivo não localizado)`);
    console.log('═══════════════════════════════════════\n');

    db.close();
}

migrateDocuments().catch(e => {
    console.error('Erro fatal na migração:', e);
    db.close();
    process.exit(1);
});
