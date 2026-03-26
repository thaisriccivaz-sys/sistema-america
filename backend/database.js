const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const fs = require('fs');

// Usar v2 do banco para lidar com o novo schema expandido sem conflito
// Caminho absoluto fixo para Render em backend/data/
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'hr_system_v2.sqlite');

// Verificação de Segurança
if (!fs.existsSync(dbPath)) {
    console.warn('--- AVISO DE SEGURANÇA ---');
    console.warn(`Banco não encontrado em: ${dbPath}`);
    console.warn('Um novo banco vazio será criado se você continuar.');
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro fatal ao conectar ao banco de dados SQLite:', err.message);
        process.exit(1);
    } else {
        console.log('--------------------------------------------------');
        console.log('Banco SQLite carregado: backend/data/hr_system_v2.sqlite');
        console.log(`Caminho Real: ${dbPath}`);
        console.log('--------------------------------------------------');
        
        db.serialize(() => {
            // Tabela de Usuários (Acesso)
            db.run(`
                CREATE TABLE IF NOT EXISTS usuarios (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL UNIQUE,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'Operacional'
                )
            `);

            // Tabela de Configurações (Cargos)
            db.run(`
                CREATE TABLE IF NOT EXISTS cargos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT NOT NULL UNIQUE
                )
            `);

            // Tabela de Configurações (Departamentos)
            db.run(`
                CREATE TABLE IF NOT EXISTS departamentos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT NOT NULL UNIQUE
                )
            `);

            // Tabela de Colaboradores (Expandida com Emergência)
            db.run(`
                CREATE TABLE IF NOT EXISTS colaboradores (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome_completo TEXT NOT NULL,
                    cpf TEXT NOT NULL UNIQUE,
                    rg TEXT,
                    data_nascimento TEXT,
                    estado_civil TEXT,
                    nacionalidade TEXT,
                    nome_mae TEXT,
                    nome_pai TEXT,
                    telefone TEXT,
                    email TEXT,
                    endereco TEXT,
                    cargo TEXT,
                    departamento TEXT,
                    data_admissao TEXT,
                    tipo_contrato TEXT,
                    salario REAL,
                    status TEXT DEFAULT 'Ativo',
                    foto_path TEXT,
                    contato_emergencia_nome TEXT,
                    contato_emergencia_telefone TEXT,
                    cnh_numero TEXT,
                    cnh_vencimento TEXT,
                    cnh_categoria TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Tabela de Dependentes (Expandida)
            db.run(`
                CREATE TABLE IF NOT EXISTS dependentes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    colaborador_id INTEGER NOT NULL,
                    nome TEXT NOT NULL,
                    cpf TEXT,
                    data_nascimento TEXT,
                    grau_parentesco TEXT,
                    FOREIGN KEY (colaborador_id) REFERENCES colaboradores (id) ON DELETE CASCADE
                )
            `);

            // Tabela de Documentos / Prontuário Digital
            db.run(`
                CREATE TABLE IF NOT EXISTS documentos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    colaborador_id INTEGER NOT NULL,
                    tab_name TEXT NOT NULL, -- Ex: '01. Ficha Cadastral', '02. Contratos', etc.
                    document_type TEXT NOT NULL, -- Ex: 'RG/CPF', 'Contrato de Trabalho'
                    file_name TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    year TEXT,
                    month TEXT,
                    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    vencimento TEXT,
                    assinafy_id TEXT, -- ID no sistema Assinafy
                    assinafy_status TEXT DEFAULT 'Nenhum', -- Pendente, Assinado, etc.
                    FOREIGN KEY (colaborador_id) REFERENCES colaboradores (id) ON DELETE CASCADE
                )
            `);

            // Tabela de Histórico de Alterações (Automações / Logs)
            db.run(`
                CREATE TABLE IF NOT EXISTS historico_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    action TEXT NOT NULL,
                    entity_type TEXT NOT NULL, -- Ex: 'colaborador', 'documento'
                    entity_id INTEGER,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES usuarios (id)
                )
            `);
            
            // Auto-Migration Silenciosa para Bancos Existentes
            db.run("ALTER TABLE colaboradores ADD COLUMN contato_emergencia_nome TEXT", (err) => { /* Ignora se já existir */ });
            db.run("ALTER TABLE colaboradores ADD COLUMN contato_emergencia_telefone TEXT", (err) => { /* Ignora se já existir */ });
            db.run("ALTER TABLE colaboradores ADD COLUMN cnh_numero TEXT", (err) => { /* Ignora se já existir */ });
            db.run("ALTER TABLE colaboradores ADD COLUMN cnh_vencimento TEXT", (err) => { /* Ignora se já existir */ });
            db.run("ALTER TABLE colaboradores ADD COLUMN cnh_categoria TEXT", (err) => { /* Ignora se já existir */ });
            
            // Novos campos da ficha de registro adicionais
            const novosCampos = [
                'matricula_esocial', 'local_nascimento', 'rg_orgao', 'rg_data_emissao', 'rg_tipo',
                'titulo_eleitoral', 'titulo_zona', 'titulo_secao',
                'ctps_numero', 'ctps_serie', 'ctps_uf', 'ctps_data_expedicao',
                'pis', 'cor_raca', 'sexo', 'grau_instrucao', 'cbo',
                'certificado_militar', 'militar_categoria', 'deficiencia',
                'fgts_opcao', 'banco_nome', 'banco_agencia', 'banco_conta',
                'escala_tipo', 'escala_folgas',
                'horario_entrada', 'horario_saida', 'intervalo_entrada', 'intervalo_saida',
                'sabado_entrada', 'sabado_saida',
                'meio_transporte', 'valor_transporte',
                'faculdade_participa', 'faculdade_curso_id', 'faculdade_data_inicio', 'faculdade_data_termino',
                'academia_participa', 'academia_data_inicio',
                'terapia_participa', 'terapia_data_inicio',
                'celular_participa', 'celular_data',
                'chaves_participa', 'chaves_data',
                'ferias_programadas_inicio', 'ferias_programadas_fim',
                'alergias'
            ];
            novosCampos.forEach(campo => {
                db.run(`ALTER TABLE colaboradores ADD COLUMN ${campo} TEXT`, (err) => {});
            });

            // Adicionar coluna documentos_obrigatorios à tabela cargos (legado, mantida por compatibilidade)
            db.run(`ALTER TABLE cargos ADD COLUMN documentos_obrigatorios TEXT`, (err) => {});
            db.run(`ALTER TABLE documentos ADD COLUMN vencimento TEXT`, (err) => {});

            // Tabela de documentos por cargo (nova arquitetura - join table)
            db.run(`
                CREATE TABLE IF NOT EXISTS cargo_documentos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cargo_id INTEGER NOT NULL,
                    documento TEXT NOT NULL,
                    UNIQUE(cargo_id, documento),
                    FOREIGN KEY(cargo_id) REFERENCES cargos(id) ON DELETE CASCADE
                )
            `, (err) => {
                if (err) { console.error('Erro ao criar cargo_documentos:', err.message); }
                else { console.log('Tabela cargo_documentos OK.'); }
            });

            // Tabela de Escalas de Trabalho
            db.run(`
                CREATE TABLE IF NOT EXISTS escalas (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT NOT NULL,
                    tipo TEXT NOT NULL,
                    dias_folga TEXT,
                    carga_horaria TEXT DEFAULT '44',
                    observacoes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            db.get("SELECT COUNT(*) as count FROM escalas", [], (err, row) => {
                if (err) return;
                if (row && row.count === 0) {
                    db.run(`INSERT INTO escalas (nome, tipo, dias_folga, observacoes) VALUES
                        ('Seg à Sábado trabalhando horas iguais', 'padrao_seis_dias', '["Dom"]', 'Trabalha 6 dias, horas divididas igualmente. Folga aos Domingos.'),
                        ('Seg à Sexta horas iguais e sábado trabalhando 4 horas', 'padrao_sab_4h', '["Dom"]', 'Seg-Sex normal. Sábado 4 horas. Folga Domingos.'),
                        ('Seg a Sexta horas iguais e sábados alternados (compensados)', 'padrao_sab_alternado', '["Dom"]', 'Trabalha Seg-Sex. Sábados alternados (quando não trabalhado, é compensado na semana). Folga Domingos.'),
                        ('Folga 2 dias na semana (Revezamento)', 'escala_duas_folgas', '["Ter", "Qua"]', 'Ex: folga Ter/Qua. Trabalha de Qui a Seg. Limitado a 2 domingos trabalhados, o 3º folga (anulando a folga de terça naquele cenário, validando apenas a de quarta).')
                    `);
                }
            });

            // Tabela de Cursos de Faculdade
            db.run(`
                CREATE TABLE IF NOT EXISTS cursos_faculdade (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome_curso TEXT NOT NULL,
                    instituicao TEXT NOT NULL,
                    tempo_curso TEXT,
                    valor_mensalidade REAL,
                    data_inicio TEXT,
                    data_termino_prevista TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            db.run(`
                CREATE TABLE IF NOT EXISTS chaves (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome_chave TEXT NOT NULL
                )
            `);

            db.run(`
                CREATE TABLE IF NOT EXISTS colaborador_chaves (
                    colaborador_id INTEGER,
                    chave_id INTEGER,
                    data_entrega TEXT,
                    FOREIGN KEY(colaborador_id) REFERENCES colaboradores(id),
                    FOREIGN KEY(chave_id) REFERENCES chaves(id)
                )
            `);

            // Tabela de Geradores de Documentos (Contratos Padrão)
            db.run(`
                CREATE TABLE IF NOT EXISTS geradores (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT NOT NULL UNIQUE,
                    conteudo TEXT,
                    variaveis TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Inserir Cargo "Motorista" fixo se não existir
            db.run("INSERT INTO cargos (nome) SELECT 'Motorista' WHERE NOT EXISTS (SELECT 1 FROM cargos WHERE nome='Motorista')", (err) => {});
            
            // Migrações para adicionar colunas se não existirem
            db.serialize(() => {
                // Colaborador_chaves
                db.all("PRAGMA table_info(colaborador_chaves)", (err, rows) => {
                    if (err || !rows) return;
                    const cols = rows.map(r => r.name);
                    if (!cols.includes('data_entrega')) db.run("ALTER TABLE colaborador_chaves ADD COLUMN data_entrega TEXT");
                });

                // Colaboradores
                db.all("PRAGMA table_info(colaboradores)", (err, rows) => {
                    if (err || !rows) return;
                    const cols = rows.map(r => r.name);
                    if (!cols.includes('rg_tipo')) db.run("ALTER TABLE colaboradores ADD COLUMN rg_tipo TEXT DEFAULT 'RG'");
                    if (!cols.includes('aso_email_enviado')) db.run("ALTER TABLE colaboradores ADD COLUMN aso_email_enviado TEXT");
                    if (!cols.includes('aso_exame_data')) db.run("ALTER TABLE colaboradores ADD COLUMN aso_exame_data TEXT");
                    if (!cols.includes('aso_assinafy_link')) db.run("ALTER TABLE colaboradores ADD COLUMN aso_assinafy_link TEXT");
                    if (!cols.includes('aso_exames_assinafy_link')) db.run("ALTER TABLE colaboradores ADD COLUMN aso_exames_assinafy_link TEXT");
                });

                // Documentos
                db.all("PRAGMA table_info(documentos)", (err, rows) => {
                    if (err || !rows) return;
                    const cols = rows.map(r => r.name);
                    if (!cols.includes('assinafy_id')) db.run("ALTER TABLE documentos ADD COLUMN assinafy_id TEXT");
                    if (!cols.includes('assinafy_status')) db.run("ALTER TABLE documentos ADD COLUMN assinafy_status TEXT DEFAULT 'Nenhum'");
                    if (!cols.includes('assinafy_url')) db.run("ALTER TABLE documentos ADD COLUMN assinafy_url TEXT");
                });
            });

            console.log('Tabelas do sistema RH verificadas/criadas com sucesso.');
        });
    }
});

// Habilitar chaves estrangeiras no SQLite
db.run("PRAGMA foreign_keys = ON;");

module.exports = db;
