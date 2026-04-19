const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const fs = require('fs');

// Usar v2 do banco para lidar com o novo schema expandido sem conflito
// Caminho absoluto configurável via variável de ambiente (Render Disk)
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'data', 'hr_system_v2.sqlite');

// Garantir que a pasta do banco existe
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

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
                    contato_emergencia2_nome TEXT,
                    contato_emergencia2_telefone TEXT,
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
            db.run("ALTER TABLE colaboradores ADD COLUMN contato_emergencia2_nome TEXT", (err) => { /* Ignora se já existir */ });
            db.run("ALTER TABLE colaboradores ADD COLUMN contato_emergencia2_telefone TEXT", (err) => { /* Ignora se já existir */ });
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
            db.run(`ALTER TABLE cargos ADD COLUMN departamento TEXT`, (err) => {});
            db.run(`ALTER TABLE documentos ADD COLUMN vencimento TEXT`, (err) => {});
            // Adicionar coluna 'tipo' à tabela departamentos (Administrativo | Operacional)
            db.run(`ALTER TABLE departamentos ADD COLUMN tipo TEXT DEFAULT 'Operacional'`, (err) => {});

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

            // Adicionar escala Seg à Sexta caso não exista (Migration)
            db.get("SELECT COUNT(*) as count FROM escalas WHERE tipo = 'padrao_seg_sexta'", [], (err, row) => {
                if (err) return;
                if (row && row.count === 0) {
                    db.run(`INSERT INTO escalas (nome, tipo, dias_folga, observacoes) VALUES
                        ('Seg à Sexta', 'padrao_seg_sexta', '["Sáb","Dom"]', 'Trabalha 5 dias na semana. Folga aos Sábados e Domingos.')
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
            `, (err) => {
                if(err) return;
                const autorizacaoHTML = `
<p style="text-align: justify; font-size: 14px; line-height: 1.5;">Pelo presente instrumento, autorizo a empresa AMERICA RENTAL EQUIPAMENTOS LTDA, situada na Rua Saldo da Divisa, nº 97, CEP 07242-300, Parque Alvorada - Guarulhos SP, Inscrita no CNPJ sob o nº 03.434.448/0001-01, autorizo o desconto descrito abaixo:</p>
<br/>
<p style="font-size: 14px; line-height: 1.6;"><strong>Descrição:</strong> {MODAL_DESCRICAO}</p>
<p style="font-size: 14px; line-height: 1.6;"><strong>Valor:</strong> R$ {MODAL_VALOR}</p>
<p style="font-size: 14px; line-height: 1.6;"><strong>Parcelamento:</strong> ( {PARCELA_1} ) 1x &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ( {PARCELA_2} ) 2x &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ( {PARCELA_3} ) 3x &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <b>- Valor Parcela: R$ {MODAL_VALOR_PARCELA}</b></p>
<br/><br/><br/><br/>
<div style="text-align: center; margin-top: 50px;">
    ___________________________________________________<br/>
    <b>{NOME_COMPLETO}</b><br/>
    CPF: {CPF}
</div>
`;
                const osHTML = `
<h2 style="text-align: center; margin-bottom: 15px; font-size: 16px;">CONTRATO DE AUXÍLIO FACULDADE</h2>
<div style="background-color: #d1d5db; padding: 10px 20px; font-weight: bold; margin-bottom: 25px; display: flex; justify-content: space-between; font-size: 14px;">
  <span>AMÉRICA RENTAL EQUIPAMENTOS LTDA</span>
  <span>ORDEM DE SERVIÇO</span>
  <span>NR01</span>
</div>

<p style="margin-bottom: 5px; font-size: 14px;"><strong>COLABORADOR:</strong> <span style="font-size: 16px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 2px;">{NOME_COMPLETO}</span></p>
<p style="margin-bottom: 25px; margin-left: 50px; font-size: 14px;">Cargo: <strong>{CARGO}</strong></p>

<!-- BLOCO 1 -->
<div style="border: 2px solid #000; margin-bottom: 20px;">
   <div style="background-color: #e5e7eb; padding: 8px 10px; font-weight: bold; font-size: 12px; border-bottom: 2px solid #000;">DESCRIÇÃO DA ATIVIDADE:</div>
   <div style="padding: 15px 10px; text-align: justify; font-size: 12px; line-height: 1.5; color: #1f2937;">
      Fazer sucção com equipamento apropriado dos dejetos dos banheiros; repor os desodorantes; efetuar lavagem e secagem dos mesmos e efetuar a carga e descarga dos banheiros químicos nos caminhões e nos locais definidos em eventos e espaços, executar atividades conforme orientações e prioridades dos serviços definidos pelo seu superior imediato, normas e procedimentos internos, desenvolver demais atividades relacionadas ao setor, prezar pela organização do setor de trabalho. Atividades desenvolvidas em ambiente externo.
   </div>
</div>

<!-- BLOCO 2 -->
<div style="border: 2px solid #000; margin-bottom: 20px;">
   <div style="background-color: #e5e7eb; padding: 8px 10px; font-weight: bold; font-size: 12px; border-bottom: 2px solid #000;">DESCRIÇÃO DOS RISCOS AMBIENTAIS:</div>
   <div style="padding: 15px 10px; font-size: 12px; line-height: 1.8; color: #1f2937;">
      <b>Físico:</b> Ruído | Umidade<br/>
      <b>Químico:</b> Produtos Domissaneantes<br/>
      <b>Biológicos:</b> Microorganismos Infecciosos<br/>
      <b>Ergonômicos:</b> Posturas Inadequadas / Posições Incômodas | Esforço Físico<br/>
      <b>Acidentes:</b> Queda de objetos sobre a cabeça | Acidente de trânsito | Quedas de nível diferente (menor que 2m) | Escorregar em pisos umedecidos ou molhados | Respingos de resíduos e produtos saneantes
   </div>
</div>

<!-- BLOCO 3 -->
<div style="border: 2px solid #000; margin-bottom: 30px;">
   <div style="background-color: #e5e7eb; padding: 8px 10px; font-weight: bold; font-size: 12px; border-bottom: 2px solid #000;">MEDIDAS PREVENTIVAS EPIS:</div>
   <div style="padding: 15px 10px; font-size: 12px; line-height: 1.5; color: #1f2937;">
      Máscara descartável | Luvas de látex ou nitrílicas | Óculos de proteção contra respingos | Calçados de segurança | Camiseta | Calça | Capacete | Protetor auditivo | Protetor solar | Luva de helanca
   </div>
</div>
`;
                // Antes de inserir os geradores padrão, garante que a tabela de geradores excluídos existe
                db.run(`CREATE TABLE IF NOT EXISTS geradores_excluidos (nome TEXT PRIMARY KEY)`, () => {
                    db.get("SELECT id FROM geradores WHERE nome = 'AUTORIZAÇÃO DE DESCONTO EM FOLHA DE PAGAMENTO'", [], (e, row) => {
                        if (!row) {
                            db.get("SELECT nome FROM geradores_excluidos WHERE nome = 'AUTORIZAÇÃO DE DESCONTO EM FOLHA DE PAGAMENTO'", [], (e2, deleted) => {
                                if (!deleted) db.run("INSERT INTO geradores (nome, conteudo, variaveis) VALUES ('AUTORIZAÇÃO DE DESCONTO EM FOLHA DE PAGAMENTO', ?, '[]')", autorizacaoHTML);
                            });
                        }
                    });
                    db.get("SELECT id FROM geradores WHERE nome = 'ORDEM DE SERVIÇO NR01'", [], (e, row) => {
                        if (!row) {
                            db.get("SELECT nome FROM geradores_excluidos WHERE nome = 'ORDEM DE SERVIÇO NR01'", [], (e2, deleted) => {
                                if (!deleted) db.run("INSERT INTO geradores (nome, conteudo, variaveis) VALUES ('ORDEM DE SERVIÇO NR01', ?, '[]')", osHTML);
                            });
                        }
                    });
                });
            });

            // Tabela de Faltas (ausências sem justificativa)
            db.run(`
                CREATE TABLE IF NOT EXISTS faltas (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    colaborador_id INTEGER NOT NULL,
                    data_falta TEXT NOT NULL,
                    turno TEXT NOT NULL DEFAULT 'Dia todo',
                    observacao TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (colaborador_id) REFERENCES colaboradores (id) ON DELETE CASCADE
                )
            `);

            // Tabela de Avaliações
            db.run(`
                CREATE TABLE IF NOT EXISTS avaliacoes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    colaborador_id INTEGER NOT NULL,
                    tipo TEXT NOT NULL DEFAULT 'desempenho',
                    ano INTEGER NOT NULL,
                    trimestre INTEGER NOT NULL,
                    respostas_json TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(colaborador_id, ano, trimestre, tipo),
                    FOREIGN KEY (colaborador_id) REFERENCES colaboradores (id) ON DELETE CASCADE
                )
            `);

            // Inserir Cargo "Motorista" fixo se não existir
            db.run("INSERT INTO cargos (nome) SELECT 'Motorista' WHERE NOT EXISTS (SELECT 1 FROM cargos WHERE nome='Motorista')", (err) => {});
            
            // Inserir departamentos padrões ('Ajudante' removido definitivamente)
            const depts = ['Motorista', 'Ajudante Pátio', 'Manutenção', 'Financeiro', 'Comercial', 'Administrativo', 'Logística', 'Recursos Humanos', 'Liderança', 'Limpeza'];
            depts.forEach(d => {
                db.run("INSERT INTO departamentos (nome) SELECT ? WHERE NOT EXISTS (SELECT 1 FROM departamentos WHERE nome=?)", [d, d]);
            });
            // Migration: remover definitivamente o departamento 'Ajudante' se ainda existir
            db.run("DELETE FROM departamentos WHERE nome = 'Ajudante'");
            db.run("CREATE TABLE IF NOT EXISTS departamentos_excluidos (nome TEXT PRIMARY KEY)");
            db.run("INSERT OR IGNORE INTO departamentos_excluidos (nome) VALUES ('Ajudante')");
            // Migration: limpar dados de teste
            db.run("DELETE FROM cargos WHERE LOWER(TRIM(nome)) = 'teste 3'");
            db.run("DELETE FROM departamentos WHERE LOWER(TRIM(nome)) = 'teste'");

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
                    if (!cols.includes('foto_base64')) db.run("ALTER TABLE colaboradores ADD COLUMN foto_base64 TEXT");
                    if (!cols.includes('admissao_contabil_enviada_em')) db.run("ALTER TABLE colaboradores ADD COLUMN admissao_contabil_enviada_em DATETIME");
                    if (!cols.includes('admissao_contabil_anexos')) db.run("ALTER TABLE colaboradores ADD COLUMN admissao_contabil_anexos TEXT");
                    if (!cols.includes('brigadista_participa')) db.run("ALTER TABLE colaboradores ADD COLUMN brigadista_participa TEXT DEFAULT 'Não'");
                    if (!cols.includes('brigadista_validade')) db.run("ALTER TABLE colaboradores ADD COLUMN brigadista_validade TEXT");
                });

                // Avaliacoes (Migracao estrutural para Drop and Recreate caso a tabela antiga nao tenha 'tipo')
                db.all("PRAGMA table_info(avaliacoes)", (err, rows) => {
                    if (err || !rows) return;
                    const cols = rows.map(r => r.name);
                    if (rows.length > 0 && !cols.includes('tipo')) {
                        db.run("DROP TABLE IF EXISTS avaliacoes", () => {
                            db.run(`
                                CREATE TABLE IF NOT EXISTS avaliacoes (
                                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                                    colaborador_id INTEGER NOT NULL,
                                    tipo TEXT NOT NULL DEFAULT 'desempenho',
                                    ano INTEGER NOT NULL,
                                    trimestre INTEGER NOT NULL,
                                    respostas_json TEXT NOT NULL,
                                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                    UNIQUE(colaborador_id, ano, trimestre, tipo),
                                    FOREIGN KEY (colaborador_id) REFERENCES colaboradores (id) ON DELETE CASCADE
                                )
                            `);
                        });
                    }
                });

                // Templates de Avaliação (dinâmicos por departamento)
                db.run(`
                    CREATE TABLE IF NOT EXISTS avaliacao_templates (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        nome TEXT NOT NULL,
                        tipo TEXT NOT NULL DEFAULT 'desempenho',
                        grupo_key TEXT NOT NULL UNIQUE,
                        categorias_json TEXT NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);

                // Documentos
                db.all("PRAGMA table_info(documentos)", (err, rows) => {
                    if (err || !rows) return;
                    const cols = rows.map(r => r.name);
                    if (!cols.includes('assinafy_id')) db.run("ALTER TABLE documentos ADD COLUMN assinafy_id TEXT");
                    if (!cols.includes('assinafy_status')) db.run("ALTER TABLE documentos ADD COLUMN assinafy_status TEXT DEFAULT 'Nenhum'");
                    if (!cols.includes('assinafy_url')) db.run("ALTER TABLE documentos ADD COLUMN assinafy_url TEXT");
                    if (!cols.includes('assinafy_sent_at')) db.run("ALTER TABLE documentos ADD COLUMN assinafy_sent_at DATETIME");
                    if (!cols.includes('signed_file_path')) db.run("ALTER TABLE documentos ADD COLUMN signed_file_path TEXT");
                    if (!cols.includes('assinafy_signed_at')) db.run("ALTER TABLE documentos ADD COLUMN assinafy_signed_at DATETIME");
                    // Campos de período do atestado
                    if (!cols.includes('atestado_tipo'))  db.run("ALTER TABLE documentos ADD COLUMN atestado_tipo TEXT");  // 'dias' | 'horas'
                    if (!cols.includes('atestado_inicio')) db.run("ALTER TABLE documentos ADD COLUMN atestado_inicio TEXT"); // data ISO ou HH:MM
                    if (!cols.includes('atestado_fim'))    db.run("ALTER TABLE documentos ADD COLUMN atestado_fim TEXT");   // data ISO ou HH:MM
                });
                
                // Geradores
                db.all("PRAGMA table_info(geradores)", (err, rows) => {
                    if (err || !rows) return;
                    const cols = rows.map(r => r.name);
                    if (!cols.includes('tipo')) db.run("ALTER TABLE geradores ADD COLUMN tipo TEXT DEFAULT 'html'");
                    if (!cols.includes('is_sinistro_only')) db.run("ALTER TABLE geradores ADD COLUMN is_sinistro_only INTEGER DEFAULT 0");
                    if (!cols.includes('visibilidade_regra')) db.run("ALTER TABLE geradores ADD COLUMN visibilidade_regra TEXT");
                });
            });

            // Migration: adicionar coluna 'categoria' à tabela epi_templates
            db.run(`ALTER TABLE epi_templates ADD COLUMN categoria TEXT DEFAULT 'Outros'`, (err) => {});
            // Migration: atualizar categoria dos templates existentes pelo nome
            db.run(`UPDATE epi_templates SET categoria='Operacional' WHERE grupo IN ('Manutenção','Limpeza','Motorista','Ajudante','Ajudante Pátio','Ajudante Pátio e Liderança','Ajudante Pátio, Liderança')`);
            db.run(`UPDATE epi_templates SET categoria='Administrativo' WHERE grupo IN ('Escritório')`);
            // Migration: remover ficha duplicada 'Ajudante Pátio, Liderança' (manter só 'Ajudante Pátio e Liderança')
            db.run(`DELETE FROM epi_templates WHERE grupo = 'Ajudante Pátio, Liderança'`, (err) => {
                if (!err) console.log('[EPI migration] Removida ficha duplicada Ajudante Pátio, Liderança (se existia).');
            });
            // Migration: adicionar item faltante à ficha de Manutenção (será aplicado dentro do callback do seed)

            // Tabela de Templates de EPI por departamento
            db.run(`
                CREATE TABLE IF NOT EXISTS epi_templates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    grupo TEXT NOT NULL UNIQUE,
                    departamentos_json TEXT NOT NULL,
                    epis_json TEXT NOT NULL,
                    termo_texto TEXT,
                    rodape_texto TEXT,
                    categoria TEXT DEFAULT 'Outros',
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) return;
                // Remove ficha duplicada se existir
                db.run(`DELETE FROM epi_templates WHERE grupo = 'Ajudante Pátio, Liderança'`);

                const TERMO_PADRAO = '•Confirmo perante minha assinatura que recebi o Equipamento de Proteção Individual - EPI, da Empresa: AMERICA RENTAL EQUIPAMENTOS LTDA. Vinculada ao CNPJ: 03.434.448/0001-01 de Inscrição estadual IE: 336.715.410.116 conforme descrito abaixo, para uso exclusivo no local de trabalho, conforme regulamentação da Norma Regulamentadora Nº 6, do Ministério do Trabalho e Emprego.\\n•Declaro que estou ciente da obrigatoriedade do uso do EPI e da responsabilidade de usá-lo e conservá-lo. Minha recusa injustificada na utilização deste equipamento ou seu mau uso, constitui ato faltoso, conforme disposto no artigo 158 da CLT.\\n•Declaro estar ciente da obrigatoriedade da devolução do Equipamento atual, quando da troca ou substituição dos mesmos.';
                const RODAPE_PADRAO = 'LIBERAÇÃO DO EQUIPAMENTO DE SEGURANÇA SOMENTE APÓS ASSINATURA DESTE TERMO.';
                const EPI_A1 = JSON.stringify(['BOTA DE PVC CA 42.291','BOTA BICO DE AÇO CA 43.339','CAPACETE CA 31.469','CAPA DE CHUVA CA 31.413','ÓCULOS DE PROTEÇÃO CA 19.176','LUVA DE PVC VERDE CA34570','LUVA DE NEOLATEX CURTA EXG CA 5.774','RESPIRADOR PURIFICADOR DE AR CA 14.781','RESPIRADOR PURIFICADOR DE AR AZUL CA 39.238','REFIL DO RESPIRADOR','PROTETOR SOLAR FPS30','PROTETOR AUDITIVO CA 36.817','COLETE REFLETIVO','CALÇA','CAMISETA MANGA CURTA','CAMISETA MANGA LONGA','LUVA DE HELANCA CA 37.931','LUVA NITRILICA CA 38.975']);
                const EPI_A2 = JSON.stringify(['BOTA BICO DE AÇO CA 43.339','CAPACETE CA 31.469','CAPA DE CHUVA CA 31.413','ÓCULOS DE PROTEÇÃO CA 19.176','LUVA DE PVC VERDE CA34570','LUVA DE NEOLATEX CURTA EXG CA 5.774','RESPIRADOR PURIFICADOR DE AR CA 14.781','RESPIRADOR PURIFICADOR DE AR AZUL CA 39.238','REFIL DO RESPIRADOR','PROTETOR SOLAR FPS30','PROTETOR AUDITIVO CA 36.817','COLETE REFLETIVO','CALÇA','CAMISETA MANGA CURTA','CAMISETA MANGA LONGA','LUVA DE HELANCA CA 37.931','LUVA NITRILICA CA 38.975']);
                const EPI_A3 = JSON.stringify(['AVENTAL DE RASPA','BOTA BICO DE AÇO CA 43.339','BONÉ','LUVA DE RASPA CA 34.106','PROTETOR AUDITIVO CA 36.817','CALÇA','CAMISETA MANGA CURTA','CAMISETA MANGA LONGA','PROTETOR SOLAR FPS30','RESPIRADOR PURIFICADOR DE AR AZUL CA 39.238','ÓCULOS CA 19.176','MÁSCARA DE SOLDA CA 45.596','LUVA NITRILICA CA 38.975','MASCARA RESPIRADOR FACIAL COM FILTRO CA 14.781']);
                const EPI_A4 = JSON.stringify(['AVENTAL DE PLÁSTICO','LUVA DE NEOLATEX M','CALÇA','AVENTAL','SAPATO ANTIDERRAPANTE']);
                const newSeeds = [
                    { grupo: 'Escritório', categoria: 'Administrativo', departamentos_json: JSON.stringify(['Recursos Humanos','Financeiro','Logística','Administrativo','Comercial']), epis_json: JSON.stringify(['BONÉ','CAMISETA POLO PRETA','CAMISETA POLO PRETA MANGA LONGA','CAMISETA POLO ROXA','PORTA CANETAS','PORTA ARQUIVOS DE MESA','MOUSE PAD ERGONÔMICO','APOIO ERGONÔMICO DE TECLADO','SUPORTE ERGONÔMICO DE PÉS','APOIO NOTEBOOK']), termo_texto: TERMO_PADRAO, rodape_texto: RODAPE_PADRAO },
                    { grupo: 'Ajudante Pátio e Liderança', categoria: 'Operacional', departamentos_json: JSON.stringify(['Ajudante Pátio','Liderança']), epis_json: EPI_A1, termo_texto: TERMO_PADRAO, rodape_texto: RODAPE_PADRAO },
                    { grupo: 'Motorista', categoria: 'Operacional', departamentos_json: JSON.stringify(['Motorista','Ajudante Geral']), epis_json: EPI_A2, termo_texto: TERMO_PADRAO, rodape_texto: RODAPE_PADRAO },
                    { grupo: 'Manutenção', categoria: 'Operacional', departamentos_json: JSON.stringify(['Manutenção']), epis_json: EPI_A3, termo_texto: TERMO_PADRAO, rodape_texto: RODAPE_PADRAO },
                    { grupo: 'Limpeza', categoria: 'Operacional', departamentos_json: JSON.stringify(['Limpeza']), epis_json: EPI_A4, termo_texto: TERMO_PADRAO, rodape_texto: RODAPE_PADRAO }
                ];
                // INSERT OR IGNORE: só insere templates que não existem ainda (nunca destrói existentes)
                newSeeds.forEach(s => {
                    db.run('INSERT OR IGNORE INTO epi_templates (grupo, categoria, departamentos_json, epis_json, termo_texto, rodape_texto) VALUES (?,?,?,?,?,?)',
                        [s.grupo, s.categoria, s.departamentos_json, s.epis_json, s.termo_texto, s.rodape_texto],
                        (e) => { if (e) console.error('[EPI seed] Erro:', s.grupo, e.message); });
                });

                // Após o seed, garantir que Manutenção tem o 14º item e tem a categoria correta
                db.get(`SELECT id, epis_json, categoria FROM epi_templates WHERE grupo = 'Manutenção'`, [], (e2, row) => {
                    if (e2 || !row) return;
                    try {
                        const epis = JSON.parse(row.epis_json || '[]');
                        const novoItem = 'MASCARA RESPIRADOR FACIAL COM FILTRO CA 14.781';
                        const updates = [];
                        const params = [];
                        if (!epis.includes(novoItem)) {
                            epis.push(novoItem);
                            updates.push('epis_json = ?');
                            params.push(JSON.stringify(epis));
                        }
                        if (row.categoria !== 'Operacional') {
                            updates.push("categoria = 'Operacional'");
                        }
                        if (updates.length) {
                            params.push(row.id);
                            db.run(`UPDATE epi_templates SET ${updates.join(', ')} WHERE id = ?`, params, (e3) => {
                                if (!e3) console.log('[EPI migration] Manutenção atualizada: ' + updates.join(', '));
                            });
                        }
                    } catch(e3) { console.error('[EPI migration] Erro Manutenção:', e3.message); }
                });
                // Garantir categoria do Motorista
                db.run(`UPDATE epi_templates SET categoria = 'Operacional' WHERE grupo = 'Motorista' AND (categoria IS NULL OR categoria = 'Outros')`);
            });

            // Tabela de fichas de EPI por colaborador (histórico/versionamento)
            db.run(`
                CREATE TABLE IF NOT EXISTS colaborador_epi_fichas (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    colaborador_id INTEGER NOT NULL,
                    template_id INTEGER NOT NULL,
                    grupo TEXT NOT NULL,
                    snapshot_epis TEXT NOT NULL,
                    snapshot_termo TEXT,
                    snapshot_rodape TEXT,
                    linhas_usadas INTEGER DEFAULT 0,
                    status TEXT DEFAULT 'ativa',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    fechada_em DATETIME,
                    motivo_fechamento TEXT,
                    FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE
                )
            `, (err) => { if (err) console.error('Erro ao criar colaborador_epi_fichas:', err); });

            // Tabela de entregas assinadas de EPI por ficha
            db.run(`
                CREATE TABLE IF NOT EXISTS epi_entregas (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ficha_id INTEGER NOT NULL,
                    colaborador_id INTEGER NOT NULL,
                    epis_entregues TEXT NOT NULL,
                    assinatura_base64 TEXT NOT NULL,
                    data_entrega DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (ficha_id) REFERENCES colaborador_epi_fichas(id) ON DELETE CASCADE
                )
            `, (err) => { if (err) console.error('Erro ao criar epi_entregas:', err); });


            // ============================================================
            // SISTEMA DE USUÁRIOS E PERMISSÕES
            // ============================================================

            // Migrar tabela usuarios com novos campos
            db.all("PRAGMA table_info(usuarios)", (err, rows) => {
                if (err || !rows) return;
                const cols = rows.map(r => r.name);
                if (!cols.includes('nome'))               db.run("ALTER TABLE usuarios ADD COLUMN nome TEXT");
                if (!cols.includes('email'))              db.run("ALTER TABLE usuarios ADD COLUMN email TEXT");
                if (!cols.includes('departamento'))       db.run("ALTER TABLE usuarios ADD COLUMN departamento TEXT DEFAULT 'RH'");
                if (!cols.includes('grupo_permissao_id')) db.run("ALTER TABLE usuarios ADD COLUMN grupo_permissao_id INTEGER");
                if (!cols.includes('ativo'))              db.run("ALTER TABLE usuarios ADD COLUMN ativo INTEGER DEFAULT 1");
            });

            // Tabela de Grupos de Permissão
            db.run(`
                CREATE TABLE IF NOT EXISTS grupos_permissao (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT NOT NULL UNIQUE,
                    descricao TEXT,
                    departamento TEXT DEFAULT 'Todas',
                    tipo TEXT DEFAULT 'personalizado',
                    base_usuario_id INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) return;

                // Tabela de Permissões por Grupo
                db.run(`
                    CREATE TABLE IF NOT EXISTS permissoes_grupo (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        grupo_id INTEGER NOT NULL,
                        modulo TEXT NOT NULL,
                        pagina_id TEXT NOT NULL,
                        pagina_nome TEXT NOT NULL,
                        visualizar INTEGER DEFAULT 0,
                        alterar INTEGER DEFAULT 0,
                        incluir INTEGER DEFAULT 0,
                        excluir INTEGER DEFAULT 0,
                        UNIQUE(grupo_id, pagina_id),
                        FOREIGN KEY(grupo_id) REFERENCES grupos_permissao(id) ON DELETE CASCADE
                    )
                `, (err2) => {
                    if (err2) return;

                    // Seed grupos padrão
                    const gruposPadrao = [
                        { nome: 'RH - Completo', descricao: 'Acesso completo ao módulo RH', departamento: 'RH', tipo: 'departamento' },
                        { nome: 'RH - Somente Leitura', descricao: 'Apenas visualização das telas de RH', departamento: 'RH', tipo: 'departamento' },
                        
                        { nome: 'Logística - Total', descricao: 'Acesso total', departamento: 'Logística', tipo: 'departamento' },
                        { nome: 'Logística - Somente Leitura', descricao: 'Apenas leitura', departamento: 'Logística', tipo: 'departamento' },
                        
                        { nome: 'Financeiro - Total', descricao: 'Acesso total', departamento: 'Financeiro', tipo: 'departamento' },
                        { nome: 'Financeiro - Somente Leitura', descricao: 'Apenas leitura', departamento: 'Financeiro', tipo: 'departamento' },
                        
                        { nome: 'Comercial - Total', descricao: 'Acesso total', departamento: 'Comercial', tipo: 'departamento' },
                        { nome: 'Comercial - Somente Leitura', descricao: 'Apenas leitura', departamento: 'Comercial', tipo: 'departamento' },
                        
                        { nome: 'Administrativo - Total', descricao: 'Acesso total', departamento: 'Administrativo', tipo: 'departamento' },
                        { nome: 'Administrativo - Somente Leitura', descricao: 'Apenas leitura', departamento: 'Administrativo', tipo: 'departamento' },
                        
                        { nome: 'Diretoria', descricao: 'Acesso completo incluindo configurações', departamento: 'Diretoria', tipo: 'departamento' },
                    ];

                    const TELAS_SISTEMA = [
                        { modulo: 'RH', pagina_id: 'dashboard',             pagina_nome: 'Dashboard' },
                        { modulo: 'RH', pagina_id: 'colaboradores',          pagina_nome: 'Colaboradores' },
                        { modulo: 'RH', pagina_id: 'admissao',               pagina_nome: 'Admissão' },
                        { modulo: 'RH', pagina_id: 'cargos',                 pagina_nome: 'Cargos' },
                        { modulo: 'RH', pagina_id: 'departamentos',           pagina_nome: 'Departamentos' },
                        { modulo: 'RH', pagina_id: 'faculdade',              pagina_nome: 'Faculdade' },
                        { modulo: 'RH', pagina_id: 'chaves',                 pagina_nome: 'Chaves' },
                        { modulo: 'RH', pagina_id: 'geradores',              pagina_nome: 'Geradores de Documentos' },
                        { modulo: 'RH', pagina_id: 'ficha-epi',              pagina_nome: 'Ficha EPI' },
                        { modulo: 'RH', pagina_id: 'gerenciar-avaliacoes',   pagina_nome: 'Avaliações' },
                        { modulo: 'Sistema', pagina_id: 'usuarios-permissoes', pagina_nome: 'Usuários e Permissões' },
                    ];

                    gruposPadrao.forEach(g => {
                        db.get('SELECT id FROM grupos_permissao WHERE nome = ?', [g.nome], (e, row) => {
                            if (row) return; // já existe
                            db.run(
                                'INSERT INTO grupos_permissao (nome, descricao, departamento, tipo) VALUES (?,?,?,?)',
                                [g.nome, g.descricao, g.departamento, g.tipo],
                                function(err3) {
                                    if (err3 || !this.lastID) return;
                                    const gid = this.lastID;
                                    const isAdmin = g.nome === 'Administrador' || g.nome === 'Diretoria';
                                    const hasTotal = g.nome.includes('Completo') || g.nome.includes('Total') || g.nome === 'Administrador' || g.nome === 'Diretoria';
                                    
                                    TELAS_SISTEMA.forEach(t => {
                                        const v = 1;
                                        const a = hasTotal ? 1 : 0;
                                        const i = hasTotal ? 1 : 0;
                                        const ex = hasTotal ? 1 : 0;
                                        db.run(
                                            'INSERT OR IGNORE INTO permissoes_grupo (grupo_id,modulo,pagina_id,pagina_nome,visualizar,alterar,incluir,excluir) VALUES (?,?,?,?,?,?,?,?)',
                                            [gid, t.modulo, t.pagina_id, t.pagina_nome, v, a, i, ex]
                                        );
                                    });
                                }
                            );
                        });
                    });
                });
            });

            // Remover grupo Administrador legados
            db.run("DELETE FROM grupos_permissao WHERE nome='Administrador'", (err) => {});

            // ── MIGRAÇÃO: Garantir acesso total ao usuário teste.2 ───────
            setTimeout(() => {
                const TODAS_TELAS = [
                    { modulo: 'RH',       pagina_id: 'dashboard',             pagina_nome: 'Dashboard' },
                    { modulo: 'RH',       pagina_id: 'colaboradores',          pagina_nome: 'Colaboradores' },
                    { modulo: 'RH',       pagina_id: 'admissao',               pagina_nome: 'Admissão' },
                    { modulo: 'RH',       pagina_id: 'cargos',                 pagina_nome: 'Cargos' },
                    { modulo: 'RH',       pagina_id: 'departamentos',          pagina_nome: 'Departamentos' },
                    { modulo: 'RH',       pagina_id: 'faculdade',              pagina_nome: 'Faculdade' },
                    { modulo: 'RH',       pagina_id: 'chaves',                 pagina_nome: 'Chaves' },
                    { modulo: 'RH',       pagina_id: 'geradores',              pagina_nome: 'Geradores de Documentos' },
                    { modulo: 'RH',       pagina_id: 'ficha-epi',              pagina_nome: 'Ficha EPI' },
                    { modulo: 'RH',       pagina_id: 'gerenciar-avaliacoes',   pagina_nome: 'Avaliações' },
                    { modulo: 'RH',       pagina_id: 'prontuario-checklist',   pagina_nome: 'Prontuário - CheckList' },
                    { modulo: 'RH',       pagina_id: 'prontuario-ficha',       pagina_nome: 'Prontuário - Ficha Cadastral' },
                    { modulo: 'RH',       pagina_id: 'prontuario-pagamentos',  pagina_nome: 'Prontuário - Pagamentos' },
                    { modulo: 'RH',       pagina_id: 'prontuario-aso',         pagina_nome: 'Prontuário - ASO' },
                    { modulo: 'RH',       pagina_id: 'avaliacoes',             pagina_nome: 'Responder Avaliação (Colab)' },
                    { modulo: 'Logística',     pagina_id: 'logistica-em-breve',   pagina_nome: 'Módulo Logística' },
                    { modulo: 'Financeiro',    pagina_id: 'financeiro-em-breve',  pagina_nome: 'Módulo Financeiro' },
                    { modulo: 'Comercial',     pagina_id: 'comercial-em-breve',   pagina_nome: 'Módulo Comercial' },
                    { modulo: 'Administrativo',pagina_id: 'admin-em-breve',       pagina_nome: 'Módulo Administrativo' },
                    { modulo: 'Sistema',       pagina_id: 'usuarios-permissoes',  pagina_nome: 'Usuários e Permissões' },
                ];

                db.get("SELECT id, grupo_permissao_id FROM usuarios WHERE username = 'diretoria.1'", [], (err, userRow) => {
                    if (err || !userRow) return; // usuário não existe, nada a fazer

                    const aplicarPermissoes = (grupoId) => {
                        TODAS_TELAS.forEach(t => {
                            db.run(
                                `INSERT OR REPLACE INTO permissoes_grupo (grupo_id, modulo, pagina_id, pagina_nome, visualizar, alterar, incluir, excluir)
                                 VALUES (?, ?, ?, ?, 1, 1, 1, 1)`,
                                [grupoId, t.modulo, t.pagina_id, t.pagina_nome]
                            );
                        });
                        console.log(`[MIGRAÇÃO] Permissões completas aplicadas ao grupo ${grupoId} (usuário teste.2)`);
                    };

                    if (userRow.grupo_permissao_id) {
                        // Já tem grupo — apenas garante que todas as permissões estão ativas
                        aplicarPermissoes(userRow.grupo_permissao_id);
                    } else {
                        // Sem grupo — cria um grupo "Diretoria (teste.2)" e vincula
                        db.run(
                            `INSERT OR IGNORE INTO grupos_permissao (nome, descricao, departamento, tipo) VALUES (?, ?, ?, ?)`,
                            ['Diretoria (teste.2)', 'Acesso total gerado automaticamente', 'Diretoria', 'departamento'],
                            function(err2) {
                                if (err2) return;
                                const novoGrupoId = this.lastID;
                                if (!novoGrupoId) {
                                    // já existia com esse nome — buscar o id
                                    db.get("SELECT id FROM grupos_permissao WHERE nome = 'Diretoria (teste.2)'", [], (e, g) => {
                                        if (g) {
                                            db.run("UPDATE usuarios SET grupo_permissao_id = ? WHERE username = 'diretoria.1'", [g.id]);
                                            aplicarPermissoes(g.id);
                                        }
                                    });
                                } else {
                                    db.run("UPDATE usuarios SET grupo_permissao_id = ? WHERE username = 'diretoria.1'", [novoGrupoId]);
                                    aplicarPermissoes(novoGrupoId);
                                }
                            }
                        );
                    }
                });
            }, 2000); // aguarda 2s para o banco estar pronto
            
            // NOTA: A migration que zeraba permissoes por departamento foi REMOVIDA.
            // Ela rodava em todo restart do servidor (Render dorme e reinicia), apagando permissoes salvas.
            // As permissões são definidas pelo admin via interface e persistidas no banco.
            
            console.log('Tabelas do sistema RH verificadas/criadas com sucesso.');

        });
    }
});

// Habilitar chaves estrangeiras no SQLite
db.run("PRAGMA foreign_keys = ON;");

module.exports = db;
