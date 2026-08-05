require('dotenv').config({ path: '.env' });
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
let onedrive = null;
if (process.env.ONEDRIVE_CLIENT_ID) {
    try { onedrive = require('./utils/onedrive'); } catch (e) {}
}

const DB_PATH = process.env.DATABASE_PATH || process.env.DB_PATH || path.join(__dirname, 'data', 'hr_system_v2.sqlite');
const ONEDRIVE_BASE_PATH = process.env.ONEDRIVE_BASE_PATH || 'RH/1.Colaboradores/Sistema';

const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
    if (err) { console.error('Erro:', err.message); process.exit(1); }
});

const MONTH_NAMES_PT = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
function getMesNome(m) { const idx = parseInt(m, 10) - 1; return (idx >= 0 && idx < 12) ? MONTH_NAMES_PT[idx] : String(m); }
function tabToR2Folder(tab) {
    const map = {
        'CONTRATOS': 'Contratos', 'CONTRATOS_AVULSOS': 'Contratos', 'Atestados': 'Atestados', 'ASO': 'ASO', 'PAGAMENTOS': 'Pagamentos',
        'Advertências': 'Advertencias', 'EPI': 'EPI', 'Fotos': 'Fotos', 'AVALIACAO': 'Avaliacao', 'FACULDADE': 'Faculdade',
        '01_FICHA_CADASTRAL': 'Ficha_Cadastral', 'Terapia': 'Terapia', 'Treinamentos': 'Treinamentos', 'Boletim de ocorrência': 'Ocorrencias', 'Multas': 'Multas',
    };
    return map[tab] || (tab || 'Outros').replace(/[^a-zA-Z0-9_]/g, '_');
}
function safeColabName(nome) {
    return (nome || 'DESCONHECIDO').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_').toUpperCase();
}
function buildKeys(doc) {
    const safeColab = safeColabName(doc.nome_completo);
    const tabFolder = tabToR2Folder(doc.tab_name);
    const isContrato = doc.tab_name === 'CONTRATOS' || doc.tab_name === 'CONTRATOS_AVULSOS';
    const isFicha = doc.tab_name === '01_FICHA_CADASTRAL';
    const docYear = doc.year && doc.year !== 'null' && doc.year !== '' ? String(doc.year).replace(/[^0-9]/g, '') : String(new Date().getFullYear());
    let dir = `${safeColab}/${tabFolder}`;
    if (!isContrato && !isFicha) {
        dir += `/${docYear}`;
        if (doc.tab_name === 'PAGAMENTOS' && doc.month && doc.month !== 'null' && doc.month !== '') dir += `/${getMesNome(doc.month)}`;
    }
    return {
        r2Key: `Colaboradores/${dir}/${doc.file_name}`,
        odPath: `${ONEDRIVE_BASE_PATH}/${dir}/${doc.file_name}`
    };
}

async function listMissing() {
    console.log('🔍 Iniciando varredura de arquivos perdidos...\n');
    const docs = await new Promise((resolve, reject) => {
        db.all(`SELECT d.*, c.nome_completo FROM documentos d JOIN colaboradores c ON c.id = d.colaborador_id WHERE d.file_name IS NOT NULL ORDER BY d.id ASC`, [], (err, rows) => err ? reject(err) : resolve(rows));
    });

    let missingFiles = [];
    console.log(`Analisando ${docs.length} documentos... Isso pode demorar alguns minutos.`);

    for (const doc of docs) {
        const keys = buildKeys(doc);
        let found = false;

        if (doc.file_path && fs.existsSync(doc.file_path)) {
            found = true;
        }

        if (!found && onedrive) {
            try {
                const downloadUrl = await onedrive.getDownloadUrl(keys.odPath);
                if (downloadUrl) found = true;
            } catch(e) {}
        }

        if (!found) {
            missingFiles.push(`- ${doc.nome_completo} | Aba: ${doc.tab_name} | Arquivo: ${doc.file_name}`);
        }
    }

    if (missingFiles.length > 0) {
        const filePath = path.join(__dirname, 'arquivos_perdidos.txt');
        fs.writeFileSync(filePath, missingFiles.join('\n'), 'utf8');
        console.log(`\n❌ Encontrados ${missingFiles.length} arquivos perdidos!`);
        console.log(`A lista completa foi salva no arquivo 'arquivos_perdidos.txt'.`);
        console.log(`\nPara ver a lista agora, digite: cat backend/arquivos_perdidos.txt\n`);
    } else {
        console.log(`\n✅ NENHUM ARQUIVO PERDIDO! Todos estão no disco ou OneDrive.`);
    }
    process.exit(0);
}

listMissing();
