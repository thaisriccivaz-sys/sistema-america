const fs = require('fs');

let code = fs.readFileSync('backend/server.js', 'utf8');

// ─────────────────────────────────────────────────────────────────────
// 1) ADD COLUMNS LIST TO PUT /api/colaboradores/:id
// ─────────────────────────────────────────────────────────────────────
const colsTarget = `        'brigadista_participa', 'brigadista_validade',
        'motorista_avaliador'
    ];`;

const colsReplace = `        'brigadista_participa', 'brigadista_validade',
        'motorista_avaliador',
        'folha_periculosidade', 'folha_periculosidade_valor',
        'folha_insalubridade', 'folha_insalubridade_valor',
        'folha_mensalidade_sindical', 'folha_mensalidade_sindical_valor',
        'folha_pensao_tipo', 'folha_pensao_pct',
        'folha_plr', 'folha_plr_valor', 'folha_plr_meses',
        'academia_desconto_valor'
    ];`;

if (!code.includes(colsTarget)) {
    console.error('ERRO: colsTarget não encontrado!');
    process.exit(1);
}
code = code.replace(colsTarget, colsReplace);
console.log('✓ PUT colunas adicionadas');

// ─────────────────────────────────────────────────────────────────────
// 2) ADD DB MIGRATIONS before the fix broken document_type comment
// ─────────────────────────────────────────────────────────────────────
const migrationAnchor = '// Auto-migration: fix broken document_type encoding for Pens';

const newMigrations = `// ────────────────────────────────────────────────────────────────────
// Auto-migration: Campos 7. Folha no colaborador
// ────────────────────────────────────────────────────────────────────
[
    'folha_periculosidade', 'folha_periculosidade_valor',
    'folha_insalubridade', 'folha_insalubridade_valor',
    'folha_mensalidade_sindical', 'folha_mensalidade_sindical_valor',
    'folha_pensao_tipo', 'folha_pensao_pct',
    'folha_plr', 'folha_plr_valor', 'folha_plr_meses',
    'academia_desconto_valor'
].forEach((col) => {
    let def = 'TEXT';
    if (['folha_periculosidade','folha_insalubridade','folha_mensalidade_sindical','folha_plr'].includes(col)) def = 'INTEGER DEFAULT 0';
    else if (['folha_periculosidade_valor','folha_mensalidade_sindical_valor','folha_pensao_pct','folha_plr_valor','academia_desconto_valor'].includes(col)) def = 'REAL DEFAULT 0';
    else if (col === 'folha_insalubridade_valor') def = 'REAL DEFAULT 324.20';
    else if (col === 'folha_plr_meses') def = "TEXT DEFAULT '[]'";
    else if (col === 'folha_plr_valor') def = 'REAL DEFAULT 800';
    else if (col === 'academia_desconto_valor') def = 'REAL DEFAULT 60';
    db.run('ALTER TABLE colaboradores ADD COLUMN ' + col + ' ' + def, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('[Migration] Erro ao adicionar ' + col + ':', err.message);
        }
    });
});

// Auto-migration: Tabela fechamento_mensal
db.run(\`CREATE TABLE IF NOT EXISTS fechamento_mensal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mes INTEGER NOT NULL,
    ano INTEGER NOT NULL,
    colaborador_id INTEGER NOT NULL,
    horas_normais TEXT,
    horas_trabalhadas TEXT,
    horas_noturnas TEXT,
    dias_falta INTEGER DEFAULT 0,
    data_faltas TEXT DEFAULT '[]',
    horas_atraso TEXT,
    extra_60 TEXT,
    extra_100 TEXT,
    dsr TEXT DEFAULT 'Não',
    vt INTEGER DEFAULT 0,
    farmacia REAL DEFAULT 0,
    mercado REAL DEFAULT 0,
    outros REAL DEFAULT 0,
    multas REAL DEFAULT 0,
    academia REAL DEFAULT 0,
    consignado REAL DEFAULT 0,
    comissao REAL DEFAULT 0,
    bonus_comissao REAL DEFAULT 0,
    premio REAL DEFAULT 0,
    insalubridade REAL DEFAULT 0,
    periculosidade REAL DEFAULT 0,
    plr REAL DEFAULT 0,
    pensao REAL DEFAULT 0,
    dias_intermitente INTEGER DEFAULT 0,
    status TEXT DEFAULT 'rascunho',
    planilha_enviada_em DATETIME,
    email_contabilidade TEXT DEFAULT 'thais.ricci@americarental.com.br',
    pdf_folha_r2key TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(mes, ano, colaborador_id)
)\`, (err) => { if (err && !err.message.includes('already exists')) console.error('[Migration] fechamento_mensal:', err.message); });

// Auto-migration: Tabela fechamento_comissao
db.run(\`CREATE TABLE IF NOT EXISTS fechamento_comissao (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mes INTEGER NOT NULL,
    ano INTEGER NOT NULL,
    colaborador_id INTEGER NOT NULL,
    valor_comissao REAL DEFAULT 0,
    contratos_fechados INTEGER DEFAULT 0,
    bonus_primeiro_lugar INTEGER DEFAULT 0,
    valor_bonus REAL DEFAULT 0,
    preenchido_em DATETIME,
    link_token TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(mes, ano, colaborador_id)
)\`, (err) => { if (err && !err.message.includes('already exists')) console.error('[Migration] fechamento_comissao:', err.message); });

// Auto-migration: Tabela fechamento_consignado
db.run(\`CREATE TABLE IF NOT EXISTS fechamento_consignado (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mes INTEGER NOT NULL,
    ano INTEGER NOT NULL,
    cpf TEXT NOT NULL,
    nome TEXT,
    valor_total REAL DEFAULT 0,
    detalhe_json TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(mes, ano, cpf)
)\`, (err) => { if (err && !err.message.includes('already exists')) console.error('[Migration] fechamento_consignado:', err.message); });

// Auto-migration: fix broken document_type encoding for Pens`;

if (!code.includes(migrationAnchor)) {
    console.error('ERRO: migrationAnchor não encontrado!');
    process.exit(1);
}
code = code.replace(migrationAnchor, newMigrations);
console.log('✓ Migrations adicionadas');

fs.writeFileSync('backend/server.js', code, 'utf8');
console.log('✓ server.js salvo com sucesso!');
