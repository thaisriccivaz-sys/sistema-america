/**
 * Script de Recuperação: OneDrive → Cloudflare R2
 * 
 * Este script baixa do OneDrive todos os documentos cadastrados no banco
 * e faz o upload novamente para o R2, recriando as pastas que foram apagadas.
 * Ele usa as mesmas regras de nomenclatura do migrate_to_r2.js original.
 */

require('dotenv').config({ path: '.env' });

const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const r2 = require('./utils/r2');
let onedrive = null;

const DB_PATH = process.env.DATABASE_PATH || process.env.DB_PATH || path.join(__dirname, 'data', 'hr_system_v2.sqlite');
const ONEDRIVE_BASE_PATH = process.env.ONEDRIVE_BASE_PATH || 'RH/1.Colaboradores/Sistema';

if (process.env.ONEDRIVE_CLIENT_ID) {
    try {
        onedrive = require('./utils/onedrive');
        console.log('✅ OneDrive configurado');
    } catch (e) {
        console.warn('⚠️ OneDrive não disponível:', e.message);
        process.exit(1);
    }
} else {
    console.error('❌ Variáveis do OneDrive ausentes no .env');
    process.exit(1);
}

const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
    if (err) { console.error('❌ Erro ao abrir banco:', err.message); process.exit(1); }
    console.log('✅ Banco de dados aberto:', DB_PATH);
});

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

function buildKeys(doc) {
    const safeColab = safeColabName(doc.nome_completo);
    const tabFolder = tabToR2Folder(doc.tab_name);
    const isContrato = doc.tab_name === 'CONTRATOS' || doc.tab_name === 'CONTRATOS_AVULSOS';
    const isFicha = doc.tab_name === '01_FICHA_CADASTRAL';
    const docYear = doc.year && doc.year !== 'null' && doc.year !== '' ? String(doc.year).replace(/[^0-9]/g, '') : String(new Date().getFullYear());

    let dirPath = `${safeColab}/${tabFolder}`;
    if (!isContrato && !isFicha) {
        dirPath += `/${docYear}`;
        if (doc.tab_name === 'PAGAMENTOS' && doc.month && doc.month !== 'null' && doc.month !== '') {
            dirPath += `/${getMesNome(doc.month)}`;
        }
    }
    
    return {
        r2Key: `Colaboradores/${dirPath}/${doc.file_name}`,
        r2SignedKey: `Colaboradores/${dirPath}/Assinados/ASSINADO_${(doc.file_name||'').replace(/\.pdf$/i, '')}.pdf`,
        odPath: `${ONEDRIVE_BASE_PATH}/${dirPath}/${doc.file_name}`
    };
}

async function runRecovery() {
    console.log('\n🚀 Iniciando RECUPERAÇÃO de documentos (OneDrive -> R2)...\n');

    if (!r2.isReady()) {
        console.error('❌ R2 não está configurado.');
        process.exit(1);
    }

    // Busca todos os documentos que supostamente estariam no R2
    const docs = await new Promise((resolve, reject) => {
        db.all(`
            SELECT d.*, c.nome_completo 
            FROM documentos d
            JOIN colaboradores c ON c.id = d.colaborador_id
            WHERE d.file_name IS NOT NULL
            ORDER BY d.id ASC
        `, [], (err, rows) => err ? reject(err) : resolve(rows));
    });

    console.log(`📊 Total de documentos cadastrados para verificar: ${docs.length}\n`);

    let success = 0, failed = 0, skipped = 0;

    for (const doc of docs) {
        const keys = buildKeys(doc);
        console.log(`[${doc.id}] ${doc.nome_completo} | ${doc.file_name}`);

        // Baixa o arquivo original do OneDrive
        try {
            const downloadUrl = await onedrive.getDownloadUrl(keys.odPath);
            if (downloadUrl) {
                const res = await fetch(downloadUrl);
                if (!res.ok) throw new Error(`HTTP error ${res.status}`);
                const fileBuffer = Buffer.from(await res.arrayBuffer());
                
                const mimeType = (doc.file_name || '').toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
                await r2.uploadToR2(keys.r2Key, fileBuffer, mimeType);
                console.log(`       ✅ Recuperado: ${keys.r2Key}`);
                
                // Atualiza o banco garantindo que a r2_key está correta
                await new Promise(r => db.run('UPDATE documentos SET r2_key = ? WHERE id = ?', [keys.r2Key, doc.id], r));
                success++;
            } else {
                console.warn(`       ⚠️ Não encontrado no OneDrive: ${keys.odPath}`);
                skipped++;
            }
        } catch (e) {
            console.error(`       ❌ Erro OneDrive/R2: ${e.message}`);
            failed++;
        }
        
        // Se tinha versão assinada, tenta baixar do OneDrive (geralmente ficava na pasta ou localmente)
        // Como não sabemos a estrutura exata do OneDrive para assinados no antigo, vamos pular a tentativa
        // de assinados por enquanto se der erro.

        await new Promise(r => setTimeout(r, 100)); // Rate limit
    }

    console.log('\n═══════════════════════════════════════');
    console.log(`✅ Recuperação concluída!`);
    console.log(`   Recuperados: ${success}`);
    console.log(`   Falhas:      ${failed}`);
    console.log(`   Não achou:   ${skipped}`);
    console.log('═══════════════════════════════════════\n');
    db.close();
}

runRecovery().catch(console.error);
