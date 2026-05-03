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
const cron = require('node-cron');
const cloudinary = require('cloudinary').v2;

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

// ── Transporter global + helper anti-spam ──────────────────────────────────────────
// Injeta headers que reduzem chance de cair em spam em todos os envios.
const _globalTransporter = nodemailer.createTransport(SMTP_CONFIG);
async function sendMailHelper(opts) {
    return _globalTransporter.sendMail({
        ...opts,
        from: opts.from || '"America Rental" <americasistema48@gmail.com>',
        replyTo: opts.replyTo || 'americasistema48@gmail.com',
        headers: {
            'X-Mailer': 'America-Rental-ERP/1.0',
            'X-Priority': '3',
            'Precedence': 'bulk',
            'List-Unsubscribe': '<mailto:americasistema48@gmail.com?subject=Cancelar>',
            ...(opts.headers || {})
        }
    });
}

const db = require('./database');

// Excluir Contrato Academia de teste do Abner Abrahão
db.run("DELETE FROM documentos WHERE document_type = 'Contrato Academia' AND colaborador_id IN (SELECT id FROM colaboradores WHERE nome_completo LIKE '%Abner Abrahão%')");
// Excluir Contrato Faculdade de teste da Debora
db.run("DELETE FROM documentos WHERE document_type = 'Contrato Faculdade' AND colaborador_id IN (SELECT id FROM colaboradores WHERE nome_completo LIKE '%Débora%')");
// Excluir Contrato Faculdade de teste da Eduarda
db.run("DELETE FROM documentos WHERE document_type = 'Contrato Faculdade' AND colaborador_id IN (SELECT id FROM colaboradores WHERE nome_completo LIKE '%Eduarda%')");

db.run("DELETE FROM geradores WHERE nome = 'AUTORIZAÇÃO DE DESCONTO EM FOLHA DE PAGAMENTO'");
db.run("DELETE FROM geradores WHERE nome = 'Termo de Responsabilidade de Chaves'");
// Renomear Autorização de Desconto em Folha
db.run("UPDATE geradores SET nome = 'Autorização de Desconto em Folha' WHERE nome LIKE '%AUTORIZA%DESCONTO%FOLHA%'");
// Excluir permanentemente ORDEM DE SERVIÇO NR01
db.run("DELETE FROM geradores WHERE nome = 'ORDEM DE SERVIÇO NR01'");

// Registrar exclusoes permanentes para que o seed nao recrie
db.run("CREATE TABLE IF NOT EXISTS geradores_excluidos (nome TEXT PRIMARY KEY)", () => {
    db.run("INSERT OR IGNORE INTO geradores_excluidos (nome) VALUES ('Termo de Responsabilidade de Chaves')");
    db.run("INSERT OR IGNORE INTO geradores_excluidos (nome) VALUES ('AUTORIZACAO DE DESCONTO EM FOLHA DE PAGAMENTO')");
    db.run("INSERT OR IGNORE INTO geradores_excluidos (nome) VALUES ('Autorizar Desconto')");
    db.run("INSERT OR IGNORE INTO geradores_excluidos (nome) VALUES ('ORDEM DE SERVIÇO NR01')");
});

// Migração: Cofre de Senhas da Logística
db.run(`
    CREATE TABLE IF NOT EXISTS logistica_senhas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        servico TEXT,
        link TEXT,
        usuario TEXT,
        senha_encriptada TEXT,
        owner_id INTEGER,
        tipo TEXT DEFAULT 'compartilhada',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`, () => {
    db.run("ALTER TABLE logistica_senhas ADD COLUMN owner_id INTEGER;", (err) => {});
    db.run("ALTER TABLE logistica_senhas ADD COLUMN tipo TEXT DEFAULT 'compartilhada';", (err) => {});
    db.run("ALTER TABLE logistica_senhas ADD COLUMN nome TEXT;", (err) => {});
});

// Migração: Histórico de Alterações do Cofre de Senhas
db.run(`
    CREATE TABLE IF NOT EXISTS logistica_senhas_historico (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        senha_id INTEGER,
        acao TEXT NOT NULL,
        campo_alterado TEXT,
        valor_anterior TEXT,
        valor_novo TEXT,
        usuario_id INTEGER,
        usuario_nome TEXT,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// Blacklist de cargos e departamentos excluidos manualmente (impede que o seed os recrie)
db.run("CREATE TABLE IF NOT EXISTS cargos_excluidos (nome TEXT PRIMARY KEY)");
db.run("CREATE TABLE IF NOT EXISTS departamentos_excluidos (nome TEXT PRIMARY KEY)", () => {
    // Excluir permanentemente o departamento duplicado 'Recursos Humanos' (ID 1136)
    db.run("INSERT OR IGNORE INTO departamentos_excluidos (nome) VALUES ('Recursos Humanos')");
    db.run("DELETE FROM departamentos WHERE nome = 'Recursos Humanos' AND id = 1136");
});

// MIGRATION: Colunas de visibilidade dos geradores (Movido para database.js)

// MIGRATION: Marcar geradores de sinistro
const sinistroNomes = [
    'Sinistro - Danos em Terceiros e Nosso',
    'Sinistro - Danos em Terceiros',
    'Sinistro - Danos no Nosso Veículo',
    'Sinistro - Outros Danos'
];
sinistroNomes.forEach(nome => {
    db.run("UPDATE geradores SET is_sinistro_only = 1 WHERE nome = ?", [nome]);
});

// MIGRATION: Seed de regras de visibilidade em Outros Contratos
// Formato da regra JSON:
// { dropdown_todos: bool, visivel_automatico: bool, condicao: 'campo=valor'|null, departamentos: ['Nome1']|null }
const REGRAS_VISIBILIDADE = [
    { nome: 'Autorização de Desconto em Folha', regra: { dropdown_todos: true, visivel_automatico: false, condicao: null, departamentos: null } },
    { nome: 'Contrato Academia', regra: { dropdown_todos: true, visivel_automatico: true, condicao: 'academia_participa=Sim', departamentos: null } },
    { nome: 'Contrato Faculdade', regra: { dropdown_todos: true, visivel_automatico: true, condicao: 'faculdade_participa=Sim', departamentos: null } },
    { nome: 'Contrato Intermitente', regra: { dropdown_todos: false, visivel_automatico: true, condicao: 'tipo_contrato=Intermitente', departamentos: null } },
    { nome: 'Ordem de Serviço NR01', regra: { dropdown_todos: true, visivel_automatico: true, condicao: null, departamentos: ['Ajudante Geral', 'Ajudante de Pátio', 'Liderança', 'Limpeza', 'Manutenção', 'Motoristas'] } },
    { nome: 'Responsabilidade Bilhete Único', regra: { dropdown_todos: true, visivel_automatico: true, condicao: 'meio_transporte~vt', departamentos: null } },
    { nome: 'Responsabilidade Celular', regra: { dropdown_todos: true, visivel_automatico: true, condicao: 'celular_participa=Sim', departamentos: null } },
    { nome: 'Responsabilidade Chaves', regra: { dropdown_todos: true, visivel_automatico: true, condicao: 'chaves_participa=Sim', departamentos: null } },
    { nome: 'Termo de Interesse Terapia', regra: { dropdown_todos: true, visivel_automatico: true, condicao: 'terapia_participa=Sim', departamentos: null } },
    { nome: 'Termo de NÃO Interesse Terapia', regra: { dropdown_todos: true, visivel_automatico: true, condicao: 'terapia_participa=Nao', departamentos: null } },
    { nome: 'Acordo Individual Benefícios', regra: { dropdown_todos: true, visivel_automatico: true, condicao: null, departamentos: null } },
    { nome: 'Autorização de Uso de Imagem', regra: { dropdown_todos: true, visivel_automatico: true, condicao: null, departamentos: null } },
    { nome: 'Bloqueio de Farmácia e Mercado', regra: { dropdown_todos: true, visivel_automatico: false, condicao: null, departamentos: null } },
    { nome: 'Compartilhamento de Dados', regra: { dropdown_todos: true, visivel_automatico: true, condicao: null, departamentos: null } },
    { nome: 'Recebimento de Regimento Interno', regra: { dropdown_todos: true, visivel_automatico: true, condicao: null, departamentos: null } },
    { nome: 'Regras Sorteio Final de Ano', regra: { dropdown_todos: true, visivel_automatico: true, condicao: null, departamentos: null } },
    { nome: 'Responsabilidade Equipamento', regra: { dropdown_todos: true, visivel_automatico: true, condicao: null, departamentos: ['Administrativo'] } },
    { nome: 'Responsabilidade Veículo', regra: { dropdown_todos: true, visivel_automatico: true, condicao: null, departamentos: ['Motoristas', 'Liderança'] } },
    { nome: 'Termo de Confidencialidade', regra: { dropdown_todos: true, visivel_automatico: true, condicao: null, departamentos: null } },
    { nome: 'Aceite de Recebimento por E-mail', regra: { dropdown_todos: true, visivel_automatico: true, condicao: null, departamentos: null } },
    { nome: 'NR1', regra: { dropdown_todos: true, visivel_automatico: true, condicao: null, departamentos: null } },
];
REGRAS_VISIBILIDADE.forEach(({ nome, regra }) => {
    db.run("UPDATE geradores SET visibilidade_regra = ? WHERE LOWER(TRIM(nome)) = LOWER(TRIM(?))",
        [JSON.stringify(regra), nome]);
});


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

// MIGRATION: Sinistros
db.run(`CREATE TABLE IF NOT EXISTS sinistros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    colaborador_id INTEGER NOT NULL,
    numero_boletim TEXT,
    data_hora TEXT,
    natureza TEXT,
    placa TEXT,
    veiculo TEXT,
    desconto TEXT,
    parcelas INTEGER DEFAULT 1,
    valor_parcela TEXT,
    tipo_sinistro TEXT,
    boletim_path TEXT,
    documento_path TEXT,
    orcamentos_paths TEXT,
    status TEXT DEFAULT 'pendente',
    processo_iniciado INTEGER DEFAULT 0,
    assinaturas_finalizadas INTEGER DEFAULT 0,
    documento_html TEXT,
    assinatura_testemunha1_nome TEXT,
    assinatura_testemunha1_base64 TEXT,
    assinatura_testemunha2_nome TEXT,
    assinatura_testemunha2_base64 TEXT,
    assinatura_condutor_base64 TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`, (err) => { if (err) console.error('Erro tabela sinistros:', err); });

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

// MIGRATION: Coluna data_limite na tabela multas_logistica
db.run("ALTER TABLE multas_logistica ADD COLUMN data_limite TEXT", err => {
    if (err && !err.message.includes('duplicate column')) console.error('Migration data_limite multas_logistica:', err.message);
    else if (!err) console.log('[MIGRATION] Coluna data_limite adicionada em multas_logistica.');
});

// MIGRATION REMOVIDA: O DELETE abaixo apagava todos os usuarios a cada restart do servidor.
// Foi usado uma unica vez para limpar dados de teste. NAO REATIVAR.
// db.run("DELETE FROM usuarios WHERE LOWER(REPLACE(username, '.', '')) != 'diretoria1'", ...);

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

// MIGRATION: Inserir Gerador NR1 automaticamente se não existir
const htmlNR1 = `
<p style="text-align: center; font-weight: bold; font-size: 1.2rem; margin-bottom: 2rem;">ORDEM DE SERVIÇO - NR1</p>

<p style="font-weight: bold; text-decoration: underline;">DESCRIÇÃO DA ATIVIDADE</p>
<p style="text-transform: uppercase;">FAZER SUCÇÃO COM EQUIPAMENTOS APROPRIADOS DOS DEJETOS DOS BANHEIROS, REPOR OS DESODORANTES, EFETUAR LAVAGEM E SECAGEM DOS MESMOS E EFETUAR A CARGA E DESCARGA DOS BANHEIROS QUÍMICOS NOS CAMINHÕES E NOS LOCAIS DEFINIDOS PELO SEU SUPERIOR IMEDIATO, NORMAS E PROCEDIMENTOS INTERNOS.</p>

<p style="font-weight: bold; text-decoration: underline; margin-top: 1.5rem;">IDENTIFICAÇÃO DOS RISCOS AMBIENTAIS</p>
<p style="font-weight: bold;">RISCOS / FONTES GERADORAS</p>
<ul style="list-style-type: none; padding-left: 0; margin-top: 0.5rem; line-height: 1.6;">
    <li><b>Físicos:</b> Ruído peculiar a ambientes externos e umidade da lavagem dos sanitários.</li>
    <li><b>Químicos:</b> Produtos saneantes: desinfetantes, bactericida e desodorização sanitária.</li>
    <li><b>Biológicos:</b> Sucção de dejetos e limpeza de sanitários químicos.</li>
    <li><b>Ergonômicos:</b> intensidade pequena (possível postura inadequada, possível stress).</li>
    <li><b>Acidentes:</b> intensidade pequena (possíveis acidentes de quedas, cortes e perfurações e outros).</li>
</ul>

<p style="font-weight: bold; text-decoration: underline; margin-top: 1.5rem;">MEDIDAS PREVENTIVAS</p>
<table style="width: 100%; border-collapse: collapse; margin-top: 0.5rem;" border="1">
    <thead>
        <tr style="background-color: #f1f5f9;">
            <th style="padding: 8px; text-align: left;">EPI’s (Equipamentos de Proteção Individual)</th>
            <th style="padding: 8px; text-align: left;">OBSERVAÇÕES</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td style="padding: 8px;">ÓCULOS DE PROTEÇÃO, LUVA DE NEOLATEX, CAPACETE COM JUGULAR, BOTA TIPO B COM BICO DE AÇO, UNIFORME COMPLETO, PROTETOR SOLAR, PROTETOR AUDITIVO, CAPA DE CHUVA.</td>
            <td style="padding: 8px;">SEM MAIS</td>
        </tr>
    </tbody>
</table>

<p style="font-weight: bold; text-decoration: underline; margin-top: 1.5rem;">MEDIDAS ADMINISTRATIVAS</p>
<ul style="margin-top: 0.5rem; line-height: 1.6;">
    <li>TREINAMENTO E MONITORAMENTO DAS ATIVIDADES.</li>
    <li>ORIENTAÇÕES DE SEGURANÇA DOS LOCAIS DE PRESTAÇÃO DE SERVIÇOS.</li>
</ul>

<p style="margin-top: 2rem;">Declaro ter recebido as instruções de Segurança e Saúde no Trabalho de acordo com a NR-1, bem como os EPIs necessários e comprometo-me a cumprir todas as normas estabelecidas.</p>
`;

db.get("SELECT * FROM geradores WHERE nome = 'NR1'", (err, row) => {
    if (!row) {
        db.run("INSERT INTO geradores (nome, conteudo) VALUES (?, ?)", ['NR1', htmlNR1], (err) => {
            if (err) console.log("Erro ao inserir NR1:", err.message);
            else console.log("MIGRATION: NR1 inserido com sucesso.");
        });
    }
});

// MIGRATION: Adicionar coluna docs_exigidos na tabela credenciamentos (se nao existir)
db.run("ALTER TABLE credenciamentos ADD COLUMN docs_exigidos TEXT DEFAULT '[]'", (err) => {
    if (!err) console.log('[MIGRATION] Coluna docs_exigidos adicionada na tabela credenciamentos.');
    // Ignora erro de coluna ja existente (expected)
});

// MIGRATION: Adicionar coluna 'os' na tabela credenciamentos (se nao existir)
db.run("ALTER TABLE credenciamentos ADD COLUMN os TEXT DEFAULT ''", (err) => {
    if (!err) console.log('[MIGRATION] Coluna os adicionada na tabela credenciamentos.');
    // Ignora erro de coluna ja existente (expected)
});

// MIGRATION: Adicionar coluna observacoes na tabela credenciamentos
db.run("ALTER TABLE credenciamentos ADD COLUMN observacoes TEXT DEFAULT ''", (err) => {
    if (!err) console.log('[MIGRATION] Coluna observacoes adicionada na tabela credenciamentos.');
});

// MIGRATION: Adicionar colunas qtd_max_colaboradores, qtd_max_veiculos, data_limite_envio, status na tabela credenciamentos
['qtd_max_colaboradores INTEGER DEFAULT 0', 'qtd_max_veiculos INTEGER DEFAULT 0', 'data_limite_envio TEXT', 'status TEXT DEFAULT \'solicitado\'', 'licencas_ids TEXT DEFAULT \'[]\''].forEach(col => {
    const colName = col.split(' ')[0];
    db.run(`ALTER TABLE credenciamentos ADD COLUMN ${col}`, (err) => {
        if (!err) console.log(`[MIGRATION] Coluna ${colName} adicionada na tabela credenciamentos.`);
    });
});

// MIGRATION: Criar tabela de licencas empresariais
db.run(`CREATE TABLE IF NOT EXISTS licencas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa TEXT NOT NULL,
    nome TEXT NOT NULL,
    validade TEXT,
    file_path TEXT,
    file_name TEXT,
    last_alert_date TEXT,
    alerta_3_meses_enviado INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now'))
)`, (err) => {
    if (err) console.error('[MIGRATION] Erro ao criar tabela licencas:', err.message);
    else {
        console.log('[MIGRATION] Tabela licencas verificada/criada.');
        db.run("UPDATE licencas SET nome = 'CLI - Alvará' WHERE nome IN ('CLI', 'ALVARÁ', 'Alvará')", () => { });
        db.run("UPDATE licencas SET nome = 'LO - CETESB' WHERE nome IN ('Licença de Operação', 'CETESB', 'LO - Licença de Operação', 'LO')", () => { });
        // Adicionar colunas caso a tabela já exista
        db.run("ALTER TABLE licencas ADD COLUMN last_alert_date TEXT", (err1) => { });
        db.run("ALTER TABLE licencas ADD COLUMN alerta_3_meses_enviado INTEGER DEFAULT 0", (err2) => { });
    }
});

// MIGRATION: Excluir gerador Ordem de Servico (29/04/2026, substituido pela NR1)
db.run(`DELETE FROM geradores WHERE UPPER(TRIM(nome)) LIKE '%ORDEM DE SERVI%'`, (err) => {
    if (err) console.error('[MIGRATION] Erro ao excluir gerador Ordem de Servico:', err.message);
    else console.log('[MIGRATION] Gerador Ordem de Servico excluido.');
});
db.run(`DELETE FROM documentos WHERE UPPER(TRIM(document_type)) LIKE '%ORDEM DE SERVI%' AND tab_name = 'CONTRATOS_AVULSOS'`, (err) => {
    if (err) console.error('[MIGRATION] Erro ao excluir docs Ordem de Servico:', err.message);
    else console.log('[MIGRATION] Docs Ordem de Servico removidos dos prontuarios.');
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
    // 'Termo de Responsabilidade de Chaves' -- removido permanentemente
];
GERADORES_PERFIL.forEach(nome => {
    // Verifica se o gerador foi excluido manualmente pelo usuario
    db.get("SELECT nome FROM geradores_excluidos WHERE nome = ?", [nome], (e, excluido) => {
        if (excluido) return; // Nao recriar se foi excluido manualmente
        db.run(
            "INSERT OR IGNORE INTO geradores (nome, conteudo) VALUES (?, ?)",
            [nome, `<p>Documento: <b>${nome}</b></p><p>Colaborador: {{NOME_COMPLETO}}</p><p>Data: {{DATA_ATUAL}}</p>`],
            (err) => { if (err && !err.message.includes('UNIQUE')) console.error(`Erro ao criar gerador "${nome}":`, err); }
        );
    });
});

// MIGRATION: Seed do gerador "Aceite de Recebimento por E-mail"
(function seedAceiteEmail() {
    const nomeGerador = 'Aceite de Recebimento por E-mail';
    const conteudoHTML = `<p><b>ACEITE DE RECEBIMENTO POR E-MAIL</b></p><br><p>Eu, <b>\${NOME_COMPLETO}</b>, portador(a) do CPF n° <b>\${CPF}</b>, ocupando o cargo de <b>\${CARGO}</b> no departamento de <b>\${DEPARTAMENTO}</b>, admitido(a) em <b>\${DATA_ADMISSAO}</b>, venho por meio deste documento <b>declarar meu aceite e ciência</b> de que:</p><p>1. Estou ciente de que a empresa <b>América Rental Equipamentos Ltda.</b> poderá me enviar comunicados, documentos, contratos, holerites, avisos e demais informações corporativas por <b>e-mail</b>, inclusive com validade legal.</p><p>2. O endereço de e-mail cadastrado para recebimento dessas comunicações é: <b>\${EMAIL}</b>.</p><p>3. Reconheço que sou o(a) <b>responsável pela guarda, confidencialidade e acesso</b> à referida caixa de e-mail e que o recebimento das mensagens na referida conta equivale ao recebimento pessoal.</p><p>4. Comprometo-me a comunicar imediatamente ao setor de Recursos Humanos caso ocorra qualquer alteração no endereço de e-mail acima informado ou caso eu perca o acesso a ele.</p><p>5. Estou ciente de que a América Rental Equipamentos Ltda. não se responsabiliza pelo uso indevido da minha conta de e-mail por terceiros, nem por acessos não autorizados decorrentes de negligência de minha parte na guarda da minha senha.</p>`;

    // Forçar atualização do conteúdo para quem já tem a tabela
    db.run("UPDATE geradores SET conteudo = ? WHERE LOWER(TRIM(nome)) = LOWER(TRIM(?))", [conteudoHTML, nomeGerador]);

    db.get("SELECT nome FROM geradores_excluidos WHERE nome = ?", [nomeGerador], (e, excluido) => {
        if (excluido) return;
        db.get("SELECT id FROM geradores WHERE LOWER(TRIM(nome)) = LOWER(TRIM(?))", [nomeGerador], (err, existing) => {
            if (!existing) {
                db.run("INSERT INTO geradores (nome, conteudo, tipo) VALUES (?, ?, 'html')", [nomeGerador, conteudoHTML],
                    (err) => { if (err && !err.message.includes('UNIQUE')) console.error(`Erro ao criar gerador "${nomeGerador}":`, err); else console.log(`[SEED] Gerador "${nomeGerador}" criado com sucesso.`); }
                );
            }
        });
    });

    // Regra de visibilidade: aparece no dropdown para todos, e é visível automaticamente na aba contratos
    db.run("UPDATE geradores SET visibilidade_regra = ? WHERE LOWER(TRIM(nome)) = LOWER(TRIM(?))",
        [JSON.stringify({ dropdown_todos: true, visivel_automatico: true, condicao: null, departamentos: null }), nomeGerador]
    );
})();

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
    // Pula se foi excluido manualmente pelo usuario
    db.get("SELECT nome FROM cargos_excluidos WHERE nome = ?", [cNome], (err, excluido) => {
        if (excluido) return;
        // Garante que o departamento existe (se nao foi excluido)
        db.get("SELECT nome FROM departamentos_excluidos WHERE nome = ?", [cDepto], (e2, dexcluido) => {
            if (!dexcluido) db.run("INSERT OR IGNORE INTO departamentos (nome) VALUES (?)", [cDepto]);
        });
        // Atualiza ou insere o cargo
        db.get("SELECT id FROM cargos WHERE nome = ?", [cNome], (err2, row) => {
            if (row) {
                db.run("UPDATE cargos SET departamento = ? WHERE id = ?", [cDepto, row.id]);
            } else {
                db.run("INSERT INTO cargos (nome, departamento, documentos_obrigatorios) VALUES (?, ?, '')", [cNome, cDepto]);
            }
        });
    });
});

// Reativado a Sincronização do OneDrive (via SharePoint)
const onedrive = require('./utils/onedrive');

// --- CONFIGURAÃ‡ÃƒO DE PASTAS PADRÃƒO ---
const FOLDERS = [
    '00_CHECKLIST',
    '01_FICHA_CADASTRAL',
    'OCORRENCIAS',
    'ASO',
    'ATESTADOS',
    'AVALIACAO',
    'SINISTROS',
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
        const safeTab = tabToOneDrivePath(doc.tab_name || 'DOCUMENTOS');
        const docYear = doc.year && doc.year !== 'null' ? String(doc.year).replace(/[^0-9]/g, '') : String(new Date().getFullYear());

        // Contratos avulsos (Outros contratos): salvar em CONTRATOS/outros/ independente do ano
        let targetDir;
        if (doc.tab_name === 'CONTRATOS' || doc.tab_name === 'CONTRATOS_AVULSOS') {
            // Todos os contratos: CONTRATOS/ (sem subpasta de admissao ou outros, e sem ano)
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
        } else if (doc.tab_name === 'CONTRATOS') {
            // Contratos de Admissão: NomeDoc_NomeColab.pdf (sem timestamp, documento único)
            cloudName = `${formatarPasta(doc.document_type || doc.tab_name).replace(/\s+/g, '_')}_${safeColab}.pdf`;
        } else if (doc.tab_name === 'CONTRATOS_AVULSOS') {
            // Outros Contratos: usa o file_name que já tem código único do timestamp
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
        if (doc.tab_name === 'CONTRATOS' || doc.tab_name === 'CONTRATOS_AVULSOS') {
            const contratosDir = `${onedriveBasePath}/${safeColab}/CONTRATOS`;
            await onedrive.ensurePath(contratosDir);
            await onedrive.ensurePath(targetDir);
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

// Mapeia tab_name (banco) -> nome da pasta no OneDrive.
// Usado para tabs que tiveram renomeacao visual sem mudar o valor salvo no banco.
function tabToOneDrivePath(tabName) {
    if (!tabName) return 'OUTROS';
    const TAB_FOLDER_MAP = {
        'Advert\u00eancias': 'OCORRENCIAS',
    };
    if (TAB_FOLDER_MAP[tabName]) return TAB_FOLDER_MAP[tabName];
    return formatarPasta(tabName).toUpperCase();
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
const MONTH_NAMES_PT = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
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

        let finalDir;
        if (safeTab === 'CONTRATOS' || safeTab === 'CONTRATOS_AVULSOS') {
            // Todos os Contratos na raiz
            finalDir = path.join(BASE_PATH, safeNomeColab, 'CONTRATOS');
        } else {
            finalDir = path.join(BASE_PATH, safeNomeColab, safeTab);
        }

        if (safeTab !== 'CONTRATOS' && safeTab !== 'CONTRATOS_AVULSOS' && year && year !== 'null' && year !== 'undefined' && year !== '') {
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
        } else if (tab === 'CONTRATOS' || tab === 'CONTRATOS_AVULSOS') {
            // Contratos: NomeDoc_NomeColab_CODIGO (timestamp para código único)
            const safeType = formatarPasta(docType);
            const safeColab = formatarNome(colab);
            base = `${safeType}_${safeColab}`;
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
        if (!doc) return res.send("No doc");
        const fetch = require('node-fetch') || global.fetch;
        const rInfo = await fetch(`https://api.assinafy.com.br/v1/documents/${doc.assinafy_id}`, { headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey } });
        const dt = (await rInfo.json()).data;
        res.json({ dt });
    } catch (e) { res.send(e.message); }
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
    } catch (e) {
        res.json({ error: e.message, stack: e.stack });
    }
});
app.get('/api/get-system-logs', (req, res) => {
    try {
        db.all('SELECT * FROM system_logs ORDER BY id DESC LIMIT 50', [], (err, rows) => {
            res.json(err ? { error: err.message } : rows);
        });
    } catch (e) { res.status(500).json({ error: e.message }) }
});


app.get('/api/check-pfx', (req, res) => {
    try {
        const signPdfPfx = require('./sign_pdf_pfx');
        const disp = signPdfPfx.verificarDisponibilidade();
        const info = disp.disponivel ? signPdfPfx.infosCertificado(signPdfPfx.getPfxPath(), signPdfPfx.getPfxPassword()) : null;
        res.json({ disp, info, envs: { PFX_PATH: process.env.PFX_PATH || 'NOT SET', PFX_PASS: (process.env.PFX_PASSWORD ? 'SET' : 'NOT SET') } });
    } catch (e) {
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
                            catch (e) { resolve(null); }
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
                    } catch (e) {
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
                        } catch (pfxErr) {
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
                            db.get('SELECT nome_completo FROM colaboradores WHERE id = ?', [doc.colaborador_id], (e, r) => e ? rej2(e) : res2(r))
                        );
                        const onedriveBasePath = process.env.ONEDRIVE_BASE_PATH || 'RH/1.Colaboradores/Sistema';
                        const safeColab = formatarNome(colabRow?.nome_completo || 'DESCONHECIDO');
                        const isAtestado = (doc.tab_name === 'Atestados');
                        const docYear = doc.year && doc.year !== 'null' && doc.year !== '' ? String(doc.year).replace(/[^0-9]/g, '') : String(new Date().getFullYear());
                        let cloudName;
                        if (doc.source === 'documento') {
                            const safeTab = doc.tab_name ? tabToOneDrivePath(doc.tab_name) : 'DOCUMENTOS';
                            const isContratosAvulso = doc.tab_name === 'CONTRATOS_AVULSOS';

                            if (doc.tab_name === 'CONTRATOS' || doc.tab_name === 'CONTRATOS_AVULSOS') {
                                cloudName = doc.file_name;
                            } else {
                                cloudName = isAtestado
                                    ? (doc.file_name || 'Atestado.pdf').replace(/_\d{8}_\d{6}(\.\w+)$/, '$1')
                                    : `${formatarPasta(doc.nome_documento || doc.tab_name || 'Documento').replace(/\s+/g, '_')}_${docYear}_${safeColab}.pdf`;
                            }
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
                    } catch (odErr) {
                        console.warn('[POLL-ADMISSAO] OneDrive sync falhou:', odErr.message);
                        try {
                            db.run("CREATE TABLE IF NOT EXISTS system_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, msg TEXT, ts DATETIME DEFAULT CURRENT_TIMESTAMP)", () => {
                                db.run("INSERT INTO system_logs (msg) VALUES (?)", ['OneDrive Sync Error: ' + odErr.message + ' | Path: ' + targetDir]);
                            });
                        } catch (e) { }

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
                    } catch (e) {
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
            } catch (e) {
                console.warn(`[POLL-ADMISSAO] Erro ao verificar doc ${doc.assinafy_id}: ${e.message}`);
            }
        }
    } catch (e) {
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
            db.get(`SELECT assinafy_id, assinafy_url, colaborador_id, ${docColName} FROM ${table} WHERE id=?`, [id], (err, r) => err ? reject(err) : resolve(r))
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
                    resp.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch (e) { resolve(null); } });
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
            db.run(`UPDATE ${table} SET assinafy_url = ?, enviado_em = CURRENT_TIMESTAMP WHERE id = ?`, [signLink, id], () => { });

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

                    await sendMailHelper({
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
    } catch (e) {
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
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Endpoint: TODOS os documentos de assinatura (admissao_assinaturas + documentos com assinafy_id)

// Rota para marcar documento como Outro Meio
app.post('/api/admissao-assinaturas/outro-meio', authenticateToken, (req, res) => {
    const { id, source } = req.body;
    if (!id || !source) return res.status(400).json({ error: 'id e source são obrigatórios' });

    let table = source === 'admissao' ? 'admissao_assinaturas' : 'documentos';
    db.run(`UPDATE ${table} SET assinafy_status = 'Outro Meio' WHERE id = ?`, [id], function (err) {
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
        } catch (e) {
            console.warn('[/todos] Colunas de data assinafy não encontradas:', e.message);
        }

        // Merge das datas nos documentos
        const docRowsWithDates = docRows.map(d => ({
            ...d,
            enviado_em: docDates[d.id]?.enviado_em || null,
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
    } catch (e) {
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
                        resp.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch (e) { resolve(null); } });
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
            } catch (e) {
                console.warn(`[VERIF] Erro doc ${doc.assinafy_id}: ${e.message}`);
            }
        }

        res.json({ ok: true, atualizados, verificados: pendentes.length });
    } catch (e) {
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
                const r = https.request({ hostname: 'api.assinafy.com.br', path: `/v1/documents/${doc.assinafy_id}`, method: 'GET', headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey, 'Accept': 'application/json' } }, resp => {
                    const chunks = [];
                    resp.on('data', c => chunks.push(c));
                    resp.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch (e) { resolve({ erro: e.message }); } });
                });
                r.on('error', e => resolve({ erro: e.message }));
                r.setTimeout(8000, () => { r.destroy(); resolve({ erro: 'timeout' }); });
                r.end();
            });
            const docData = info?.data || info;
            assinafyStatus.push({ assinafy_id: doc.assinafy_id, nome: doc.nome_documento, status_banco: doc.assinafy_status, status_assinafy_api: docData?.status, raw_keys: Object.keys(docData || {}) });
        }

        res.json({ admissao_assinaturas: aa, documentos_com_assinafy_id: docs, assinafy_api_status: assinafyStatus });
    } catch (e) {
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
            await sendMailHelper({
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
            assinafy_id: resultado?.assinafyDocId || null,
            assinafy_sent_at: new Date().toISOString(),
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
try { cid10Data = JSON.parse(fs.readFileSync(CID10_PATH, 'utf8')); } catch (e) { console.error('Erro ao carregar CID-10:', e.message); }

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
try { cboData = JSON.parse(fs.readFileSync(CBO_PATH, 'utf8')); } catch (e) { console.error('Erro ao carregar CBO:', e.message); }

app.get('/api/cbo', (req, res) => {
    const q = (req.query.q || '').toLowerCase().trim();
    if (!q || q.length < 2) return res.json([]);
    const results = cboData.filter(c =>
        c.code.toLowerCase().replace(/[-\s]/g, '').startsWith(q.replace(/[-\s]/g, '')) ||
        c.desc.toLowerCase().includes(q)
    ).slice(0, 12);
    res.json(results);
});

app.post('/api/auth/setup', (req, res) => {
    const { username, password } = req.body;
    const hash = bcrypt.hashSync(password, 10);
    db.run('INSERT INTO usuarios (username, password_hash, role) VALUES (?, ?, ?)', [username, hash, 'RH'], function (err) {
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
                SELECT c.id, c.nome_completo as nome, d.vencimento, c.aso_email_enviado, c.aso_exame_data 
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

                const mapResult = filtered.map(r => {
                    let hasSentEmailThisMonth = false;
                    if (r.aso_email_enviado && r.vencimento) {
                        const emailDateStr = r.aso_email_enviado;
                        const vPts = r.vencimento.includes('/') ? r.vencimento.split('/') : r.vencimento.split('-');
                        const emailDate = emailDateStr.includes('-') ? emailDateStr : null; // Basic checks
                        // simplified check: if aso_email_enviado has a date or is just 'Sim' / filled, we show the exame_data. 
                        // To be exactly within the month... The user says "quando o e-mail tiver sido enviado...".
                    }
                    return { ...r };
                });
                mapResult.sort((a, b) => {
                    let vA = a.vencimento.includes('/') ? a.vencimento.split('/').reverse().join('-') : a.vencimento;
                    let vB = b.vencimento.includes('/') ? b.vencimento.split('/').reverse().join('-') : b.vencimento;
                    return vA.localeCompare(vB);
                });
                resolve(mapResult);
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
                        resolve(ranking.filter(r => r.total > 0).sort((a, b) => b.total - a.total).slice(0, 10));
                    });
                });
            });
        });

        const feriasVencendo = await new Promise((resolve, reject) => {
            db.all("SELECT id, nome_completo as nome, data_admissao, ferias_programadas_inicio, ferias_programadas_fim FROM colaboradores WHERE status != 'Desligado' AND data_admissao IS NOT NULL AND data_admissao != ''", [], (err, rows) => {
                if (err) return reject(err);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const resFerias = rows.map(r => {
                    let adm = r.data_admissao;
                    let admDias;
                    if (adm.includes('/')) {
                        const pts = adm.split('/');
                        if (pts.length === 3) admDias = new Date(`${pts[2]}-${pts[1]}-${pts[0]}T12:00:00`);
                    } else {
                        admDias = new Date(adm + 'T12:00:00');
                    }
                    if (!admDias || isNaN(admDias.getTime())) return null;

                    // Mesmo algoritmo do ferias.js: anos completos por dias trabalhados
                    const diasTrabalhados = Math.floor((today - admDias) / 86400000);
                    const anosCompletos = Math.floor(diasTrabalhados / 365);

                    // Ainda em período aquisitivo (menos de 1 ano) → não exibir no dashboard
                    if (anosCompletos < 1) return null;

                    // aquisitivoFim = quando o direito nasceu = adm + anosCompletos anos
                    const aquisitivoFim = new Date(admDias);
                    aquisitivoFim.setFullYear(admDias.getFullYear() + anosCompletos);

                    // concessivoEnd = prazo limite para gozar = adm + (anosCompletos+1) anos
                    const concessivoEnd = new Date(admDias);
                    concessivoEnd.setFullYear(admDias.getFullYear() + anosCompletos + 1);

                    // Considera como agendada apenas se a data de início for posterior ao fim do período aquisitivo atual
                    let feriasValidasAtual = false;
                    if (r.ferias_programadas_inicio) {
                        let dStr = r.ferias_programadas_inicio;
                        let dataAgendada;
                        if (dStr.includes('/')) {
                            const p = dStr.split('/');
                            if (p.length === 3) dataAgendada = new Date(`${p[2]}-${p[1]}-${p[0]}T12:00:00`);
                        } else {
                            dataAgendada = new Date(dStr + 'T12:00:00');
                        }
                        if (dataAgendada && !isNaN(dataAgendada) && dataAgendada >= aquisitivoFim) {
                            feriasValidasAtual = true;
                        }
                    }

                    const diffDays = Math.ceil((concessivoEnd - today) / (1000 * 60 * 60 * 24));

                    // Formatar data de início das férias agendadas para exibição
                    let feriasInicioFmt = null;
                    if (feriasValidasAtual && r.ferias_programadas_inicio) {
                        const dStr = r.ferias_programadas_inicio;
                        if (dStr.includes('/')) {
                            feriasInicioFmt = dStr; // já está em DD/MM/AAAA
                        } else {
                            const pts = dStr.split('-');
                            if (pts.length === 3) feriasInicioFmt = `${pts[2]}/${pts[1]}/${pts[0]}`;
                        }
                    }

                    return {
                        id: r.id,
                        nome: r.nome,
                        admissao: adm,
                        aquisitivo_fim: aquisitivoFim.toISOString().split('T')[0],
                        concessivo_fim: concessivoEnd.toISOString().split('T')[0],
                        dias_restantes: diffDays,
                        ferias_agendadas: feriasValidasAtual,
                        ferias_inicio_fmt: feriasInicioFmt
                    };
                    // Mostrar: agendados (sempre visíveis) + sem agenda dentro de 90 dias + vencidos
                }).filter(r => r !== null && (r.ferias_agendadas || r.dias_restantes <= 90))
                    .sort((a, b) => {
                        // Agendados vêm depois dos urgentes
                        if (a.ferias_agendadas && !b.ferias_agendadas) return 1;
                        if (!a.ferias_agendadas && b.ferias_agendadas) return -1;
                        return a.dias_restantes - b.dias_restantes;
                    });

                resolve(resFerias);
            });
        });

        const faltasBd = await new Promise((res, rej) => db.all("SELECT strftime('%Y-%m', data_falta) as mes, COUNT(*) as count FROM faltas GROUP BY mes", [], (e, r) => e ? rej(e) : res(r)));
        const atestadosBd = await new Promise((res, rej) => db.all("SELECT strftime('%Y-%m', upload_date) as mes, COUNT(*) as count FROM documentos WHERE (tab_name LIKE '%ATESTADO%' OR document_type LIKE '%Atestado%') GROUP BY mes", [], (e, r) => e ? rej(e) : res(r)));

        const mapMeses = {};
        for (let i = 0; i < 6; i++) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const m = d.toISOString().split('T')[0].substring(0, 7);
            mapMeses[m] = { mes: m, faltas: 0, atestados: 0 };
        }

        faltasBd.forEach(row => { if (mapMeses[row.mes]) mapMeses[row.mes].faltas += row.count; });
        atestadosBd.forEach(row => { if (mapMeses[row.mes]) mapMeses[row.mes].atestados += row.count; });

        const faltasAgrupadasMes = Object.values(mapMeses).sort((a, b) => a.mes.localeCompare(b.mes));

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


// Auto-migration: add admissao_responsavel_nome column if it doesn't exist
db.run("ALTER TABLE colaboradores ADD COLUMN admissao_responsavel_nome TEXT", (err) => {
    if (err && !err.message.includes('duplicate column')) {
        console.error('[Migration] Erro ao adicionar admissao_responsavel_nome:', err.message);
    }
});

// Auto-migration: fix broken document_type encoding for Pensão Alimentícia
const brokenVariants = [
    'Pens\u00c3\u00a3o Aliment\u00c3\u00adcia',
    'Pens\u00c3o Aliment\u00c3\u00adcia',
    'PensÃ£o AlimentÃ­cia',
    'Pens\xc3\xa3o Aliment\xc3\xadcia'
];
brokenVariants.forEach(broken => {
    db.run(
        "UPDATE documentos SET document_type = 'Pensão Alimentícia' WHERE document_type = ?",
        [broken],
        (err) => { if (err) console.error('[Migration] Erro ao corrigir Pensão Alimentícia:', err.message); }
    );
    db.run(
        "UPDATE documentos SET tab_name = 'Pensão Alimentícia' WHERE tab_name = ?",
        [broken],
        () => { }
    );
});
console.log('[Migration] Pensão Alimentícia encoding fix applied');


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
            ) as punicoes,
            d.tipo as departamento_tipo
        FROM colaboradores c
        LEFT JOIN departamentos d ON c.departamento = d.nome
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
        'nome_mae', 'nome_pai', 'telefone', 'email', 'email_corporativo', 'endereco',
        'cargo', 'departamento', 'data_admissao', 'tipo_contrato', 'salario', 'status',
        'contato_emergencia_nome', 'contato_emergencia_telefone',
        'contato_emergencia2_nome', 'contato_emergencia2_telefone',
        'cnh_numero', 'cnh_vencimento', 'cnh_categoria',
        'matricula_esocial', 'numero_registro', 'local_nascimento', 'rg_orgao', 'rg_data_emissao', 'rg_tipo',
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
        'tamanho_camiseta', 'tamanho_calca', 'tamanho_calcado',
        'brigadista_participa', 'brigadista_validade'
    ];

    const values = colunas.map(col => {
        const val = data[col];
        if (col === 'status') return val || 'Ativo';
        return val === undefined ? null : val;
    });

    const query = `INSERT INTO colaboradores (${colunas.join(', ')}) VALUES (${Array(colunas.length).fill('?').join(', ')})`;

    db.run(query, values, async function (err) {
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

        // Criar estrutura de pastas locais no OneDrive para o novo colaborador
        try {
            const _fsLocal = require('fs');
            const _pathLocal = require('path');
            const LOCAL_ONEDRIVE_BASE = process.env.LOCAL_ONEDRIVE_PATH ||
                'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\RH\\1.Colaboradores\\Sistema';
            const PASTAS_PADRAO = [
                '00_CHECKLIST', '01_FICHA_CADASTRAL', 'ASO', 'ATESTADOS',
                'AVALIACAO', 'CERTIFICADOS', 'CONTRATOS', 'DEPENDENTES',
                'EPI', 'FACULDADE', 'FOTOS', 'MULTAS', 'OCORRENCIAS',
                'PAGAMENTOS', 'SINISTROS', 'TERAPIA', 'TREINAMENTO'
            ];
            const safeNome = (nomeOriginal || '')
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-zA-Z0-9 \-_]/g, '')
                .trim().replace(/\s+/g, '_').toUpperCase();
            const colabDir = _pathLocal.join(LOCAL_ONEDRIVE_BASE, safeNome);
            if (!_fsLocal.existsSync(colabDir)) _fsLocal.mkdirSync(colabDir, { recursive: true });
            PASTAS_PADRAO.forEach(sub => {
                const subDir = _pathLocal.join(colabDir, sub);
                if (!_fsLocal.existsSync(subDir)) _fsLocal.mkdirSync(subDir, { recursive: true });
            });
            console.log(`[PASTAS] Estrutura criada para: ${safeNome}`);
        } catch (eFolder) {
            console.error('[PASTAS] Erro ao criar pastas locais:', eFolder.message);
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
    } catch (e) {
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
    try { tamanho = fs.statSync(dbPath).size; } catch (e) { }

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
// ─────────────────────────────────────────────────────────────────────────────
// CHECK: Colaborador desligado que era responsável por departamento
// Envia e-mail automático para a Diretoria solicitar substituição
// ─────────────────────────────────────────────────────────────────────────────
async function checkColaboradorDesligado(colaboradorId) {
    try {
        // 1. Buscar dados do colaborador desligado
        const colab = await new Promise((resolve, reject) => {
            db.get('SELECT id, nome_completo, cargo, departamento FROM colaboradores WHERE id = ?', [colaboradorId], (err, row) => {
                if (err) reject(err); else resolve(row);
            });
        });
        if (!colab) return;

        // 2. Verificar se é responsável por algum departamento
        const deptos = await new Promise((resolve, reject) => {
            db.all('SELECT id, nome, tipo FROM departamentos WHERE responsavel_id = ?', [colaboradorId], (err, rows) => {
                if (err) reject(err); else resolve(rows || []);
            });
        });
        if (!deptos.length) return; // Não era responsável por nenhum departamento

        // 3.         // 3. Estrategia A: usuarios role Diretoria/Admin
        const diretoriaUsers = await new Promise((resolve, reject) => {
            db.all("SELECT u.email FROM usuarios u WHERE (u.departamento='Diretoria' OR u.role='Diretoria' OR u.role='Administrador') AND u.email IS NOT NULL AND u.email!=''", [], (err, rows) => { if (err) reject(err); else resolve(rows || []); });
        });

        // 4. Estrategia B: colaboradores depto=Diretoria com email corporativo
        const diretoriaColabs = await new Promise((resolve, reject) => {
            db.all("SELECT email_corporativo as email FROM colaboradores WHERE departamento='Diretoria' AND status!='Desligado' AND email_corporativo IS NOT NULL AND email_corporativo!=''", [], (err, rows) => { if (err) reject(err); else resolve(rows || []); });
        });

        // 5. ESTRATEGIA PRINCIPAL: responsavel cadastrado no depto Diretoria (mais confiavel)
        const diretoriaDeptResps = await new Promise((resolve, reject) => {
            db.all("SELECT COALESCE(c.email_corporativo, c.email) as email FROM departamentos d JOIN colaboradores c ON c.id = d.responsavel_id WHERE d.nome='Diretoria' AND c.status!='Desligado' AND (c.email_corporativo IS NOT NULL OR c.email IS NOT NULL)", [], (err, rows) => { if (err) reject(err); else resolve(rows || []); });
        });

        const emails = [
            ...diretoriaDeptResps.map(r2 => r2.email),
            ...diretoriaUsers.map(u => u.email),
            ...diretoriaColabs.map(c => c.email)
        ].filter(Boolean);

        const emailsUnicos = [...new Set(emails)];
        if (!emailsUnicos.length) {
            console.warn('[checkColaboradorDesligado] Nenhum e-mail da Diretoria. Usando fallback do sistema.');
            emailsUnicos.push('americasistema48@gmail.com');
        }

        // 5. Montar e-mail no padrao visual do sistema
        const logoPath = path.join(__dirname, '..', 'frontend', 'assets', 'logo-header.png');
        const dataHoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const deptosRows = deptos.map(d =>
            '<tr><td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-weight:600;color:#334155;">' + d.nome + '</td><td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#64748b;">' + (d.tipo || 'Operacional') + '</td></tr>'
        ).join('');
        const htmlContent = '<div style="font-family:Arial,sans-serif;color:#333;line-height:1.6;max-width:600px;margin:0 auto;border:1px solid #eee;padding:20px;border-radius:8px;">'
            + '<div style="text-align:center;margin-bottom:20px;"><img src="cid:empresa-logo" style="max-height:80px;max-width:100%;"></div>'
            + '<h2 style="color:#c92a2a;border-bottom:2px solid #c92a2a;padding-bottom:10px;">Acao Necessaria - Responsavel de Departamento Desligado</h2>'
            + '<p>Em <strong>' + dataHoje + '</strong>, o colaborador abaixo foi <strong style="color:#c92a2a;">desligado</strong> do sistema e era responsavel por departamento(s) que precisam de novo responsavel.</p>'
            + '<div style="background:#f1f5f9;padding:15px;border-radius:8px;margin:20px 0;">'
            + '<p style="margin:4px 0;"><strong>Colaborador:</strong> ' + colab.nome_completo + '</p>'
            + '<p style="margin:4px 0;"><strong>Cargo:</strong> ' + (colab.cargo || 'Nao definido') + '</p>'
            + '<p style="margin:4px 0;"><strong>Departamento:</strong> ' + (colab.departamento || 'Nao definido') + '</p>'
            + '</div>'
            + '<h3 style="color:#475569;font-size:0.95rem;margin-bottom:8px;">Departamentos afetados:</h3>'
            + '<table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e2e8f0;">'
            + '<thead><tr style="background:#c92a2a;">'
            + '<th style="padding:10px 12px;text-align:left;color:#fff;font-size:0.85rem;">Departamento</th>'
            + '<th style="padding:10px 12px;text-align:left;color:#fff;font-size:0.85rem;">Tipo</th>'
            + '</tr></thead><tbody>' + deptosRows + '</tbody></table>'
            + '<p style="margin-top:20px;color:#334155;">Acesse o sistema e defina um novo responsavel para cada departamento acima, garantindo a continuidade do fluxo de comunicacao.</p>'
            + '<div style="text-align:center;margin:24px 0;">'
            + '<a href="https://sistema-america.onrender.com/?target=departamentos" style="display:inline-block;padding:12px 28px;background:#c92a2a;color:#fff;text-decoration:none;border-radius:6px;font-weight:700;font-size:0.95rem;">Acessar Gestao de Departamentos</a>'
            + '</div>'
            + '<p style="margin-top:30px;font-size:0.9em;color:#7f8c8d;">Atenciosamente,<br>Equipe de RH - America Rental</p>'
            + '<p style="margin-top:10px;font-size:0.8em;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px;">Este e um e-mail automatico do sistema America Rental. Nao responda diretamente.</p>'
            + '</div>';

        const attachments = [];
        if (fs.existsSync(logoPath)) {
            attachments.push({ filename: 'logo.png', path: logoPath, cid: 'empresa-logo' });
        }

        await sendMailHelper({
            from: '"RH America Rental" <' + SMTP_CONFIG.auth.user + '>',
            to: emailsUnicos.join(', '),
            subject: 'Acao necessaria: ' + colab.nome_completo + ' foi desligado(a) e era responsavel por departamento(s)',
            html: htmlContent,
            attachments
        });
                console.log(`[checkColaboradorDesligado] E-mail enviado para ${emailsUnicos.join(', ')} — ${deptos.length} departamento(s) afetado(s)`);
    } catch (err) {
        console.error('[checkColaboradorDesligado] ERRO FATAL:', err.message, err.stack || '');
    }
}

// ENDPOINT DE DIAGNOSTICO: GET /api/test-desligado/:id
app.get('/api/test-desligado/:id', authenticateToken, async (req, res) => {
    const id = req.params.id;
    const log = [];
    try {
        const colab = await new Promise((resolve, reject) =>
            db.get('SELECT id, nome_completo, cargo, departamento FROM colaboradores WHERE id = ?', [id], (e, r) => e ? reject(e) : resolve(r)));
        log.push({ step: '1_colab', data: colab });
        if (!colab) return res.json({ ok: false, log, error: 'Colaborador nao encontrado' });
        const deptos = await new Promise((resolve, reject) =>
            db.all('SELECT id, nome, tipo, responsavel_id FROM departamentos WHERE responsavel_id = ?', [id], (e, r) => e ? reject(e) : resolve(r || [])));
        log.push({ step: '2_deptos_como_responsavel', count: deptos.length, data: deptos });
        const allDeptos = await new Promise((resolve, reject) =>
            db.all('SELECT id, nome, responsavel_id FROM departamentos WHERE responsavel_id IS NOT NULL LIMIT 10', [], (e, r) => e ? reject(e) : resolve(r || [])));
        log.push({ step: '2b_all_deptos_com_responsavel', data: allDeptos });
        const diretoriaUsers = await new Promise((resolve, reject) =>
            db.all("SELECT id, username, email, role, departamento FROM usuarios WHERE (departamento='Diretoria' OR role='Diretoria' OR role='Administrador') AND email IS NOT NULL AND email!=''", [], (e, r) => e ? reject(e) : resolve(r || [])));
        log.push({ step: '3_diretoria_users', count: diretoriaUsers.length, data: diretoriaUsers });
        const diretoriaColabs = await new Promise((resolve, reject) =>
            db.all("SELECT id, nome_completo, email_corporativo FROM colaboradores WHERE departamento='Diretoria' AND status!='Desligado' AND email_corporativo IS NOT NULL AND email_corporativo!=''", [], (e, r) => e ? reject(e) : resolve(r || [])));
        log.push({ step: '4_diretoria_colabs', count: diretoriaColabs.length, data: diretoriaColabs });
        const emails = [...diretoriaUsers.map(u => u.email), ...diretoriaColabs.map(c => c.email_corporativo)].filter(Boolean);
        const emailsUnicos = [...new Set(emails)];
        log.push({ step: '5_emails_finais', emails: emailsUnicos });
        const destinos = emailsUnicos.length ? emailsUnicos : ['americasistema48@gmail.com'];
        try {
            await sendMailHelper({
                from: '"RH America Rental (TESTE)" <' + SMTP_CONFIG.auth.user + '>',
                to: destinos.join(', '),
                subject: '[TESTE] Desligado-Depto: ' + colab.nome_completo,
                html: '<p><b>TESTE</b> - Colaborador: ' + colab.nome_completo + ' | Deptos: ' + deptos.length + '</p>'
            });
            log.push({ step: '6_email', status: 'ENVIADO', to: destinos });
        } catch (mailErr) {
            log.push({ step: '6_email', status: 'ERRO', error: mailErr.message });
        }
        res.json({ ok: true, log });
    } catch (err) {
        res.json({ ok: false, log, error: err.message });
    }
});

// ENDPOINT: lista todos os responsaveis por departamentos (util para diagnostico)
app.get('/api/test-responsaveis-deptos', authenticateToken, async (req, res) => {
    try {
        const deptos = await new Promise((resolve, reject) =>
            db.all('SELECT d.id, d.nome, d.tipo, d.responsavel_id, c.nome_completo as responsavel_nome, c.id as colab_id FROM departamentos d LEFT JOIN colaboradores c ON c.id = d.responsavel_id WHERE d.responsavel_id IS NOT NULL', [], (e, r) => e ? reject(e) : resolve(r || [])));
        const diretoria = await new Promise((resolve, reject) =>
            db.all("SELECT id, username, email, role, departamento FROM usuarios WHERE (departamento='Diretoria' OR role='Diretoria' OR role='Administrador') LIMIT 10", [], (e, r) => e ? reject(e) : resolve(r || [])));
        const diretoriaColabs = await new Promise((resolve, reject) =>
            db.all("SELECT id, nome_completo, email_corporativo, departamento FROM colaboradores WHERE departamento='Diretoria' AND status!='Desligado' AND email_corporativo IS NOT NULL LIMIT 10", [], (e, r) => e ? reject(e) : resolve(r || [])));
        res.json({ deptos_com_responsavel: deptos, diretoria_usuarios: diretoria, diretoria_colabs: diretoriaColabs });
    } catch (err) {
        res.json({ error: err.message });
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
        'nome_mae', 'nome_pai', 'telefone', 'email', 'email_corporativo', 'endereco',
        'cargo', 'departamento', 'data_admissao', 'tipo_contrato', 'salario', 'status',
        'contato_emergencia_nome', 'contato_emergencia_telefone',
        'contato_emergencia2_nome', 'contato_emergencia2_telefone',
        'cnh_numero', 'cnh_vencimento', 'cnh_categoria',
        'matricula_esocial', 'numero_registro', 'local_nascimento', 'rg_orgao', 'rg_data_emissao', 'rg_tipo',
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
        'tamanho_camiseta', 'tamanho_calca', 'tamanho_calcado',
        'brigadista_participa', 'brigadista_validade'
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
        Promise.all(auditProms).catch(() => { });

        const oldName = oldColab.nome_completo;
        const newName = data.nome_completo || oldName;
        const oldSafeName = formatarNome(oldName);
        const newSafeName = formatarNome(newName);

        db.run(query, values, async function (updateErr) {
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
                    } catch (e) { console.error('Erro ao renomear pasta: ', e); }
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

            // Se o status mudou para Desligado, verificar se era responsável por departamento e inativar usuário do sistema
            if (data.status === 'Desligado' && oldColab.status !== 'Desligado') {
                checkColaboradorDesligado(id);
                db.run("UPDATE usuarios SET ativo = 0 WHERE nome = ?", [data.nome_completo || oldColab.nome_completo], (err) => {
                    if (err) console.error("Erro ao inativar usuário vinculado:", err);
                });
            }

            const novoDept = data.departamento;
            const antigoDept = oldColab.departamento;
            if (novoDept && novoDept !== antigoDept) {
                // Buscar template do novo departamento
                db.all('SELECT id, grupo, epis_json, departamentos_json, termo_texto, rodape_texto FROM epi_templates', [], (eErr, templates) => {
                    if (eErr || !templates) return;
                    const findTemplate = (dept) => templates.find(t => {
                        try { return (JSON.parse(t.departamentos_json || '[]')).includes(dept); } catch { return false; }
                    });
                    const tmplNovo = findTemplate(novoDept);
                    const tmplAntigo = findTemplate(antigoDept);
                    if (!tmplNovo) return; // Novo dept sem template EPI — sem ação
                    if (tmplAntigo && tmplNovo.id === tmplAntigo.id) return; // Mesmo template — sem ação

                    // Templates diferentes: fechar ficha atual e abrir nova
                    db.run(
                        `UPDATE colaborador_epi_fichas SET status='fechada', fechada_em=CURRENT_TIMESTAMP, motivo_fechamento='Troca de departamento: ${antigoDept} → ${novoDept}' WHERE colaborador_id=? AND status='ativa'`,
                        [id],
                        () => {
                            db.run(
                                `INSERT INTO colaborador_epi_fichas (colaborador_id, template_id, grupo, snapshot_epis, snapshot_termo, snapshot_rodape, linhas_usadas, status) VALUES (?,?,?,?,?,?,0,'ativa')`,
                                [id, tmplNovo.id, tmplNovo.grupo, tmplNovo.epis_json, tmplNovo.termo_texto, tmplNovo.rodape_texto],
                                (insErr) => { if (insErr) console.error('[EPI troca] Erro ao criar nova ficha:', insErr.message); }
                            );
                        }
                    );
                });
            }
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
    const force = req.query.force === 'true';

    db.get("SELECT status, nome_completo FROM colaboradores WHERE id = ?", [id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Não encontrado' });

        const excluirDefinitivamente = () => {
            // Limpar todos os dados relacionados
            const tabelas = [
                "DELETE FROM dependentes WHERE colaborador_id = ?",
                "DELETE FROM documentos WHERE colaborador_id = ?",
                "DELETE FROM sinistros WHERE colaborador_id = ?",
                "DELETE FROM admissao_assinaturas WHERE colaborador_id = ?",
                "DELETE FROM colaborador_chaves WHERE colaborador_id = ?",
                "DELETE FROM colaborador_epi_fichas WHERE colaborador_id = ?",
                "DELETE FROM auditoria WHERE registro_id = ?",
            ];
            tabelas.forEach(sql => { try { db.run(sql, [id]); } catch (e) { } });

            db.run("DELETE FROM colaboradores WHERE id = ?", [id], function (delErr) {
                if (delErr) return res.status(500).json({ error: delErr.message });
                try {
                    const pasta = path.join(BASE_PATH, formatarNome(row.nome_completo));
                    if (fs.existsSync(pasta)) fs.rmSync(pasta, { recursive: true, force: true });
                } catch (e) { }
                console.log(`[DELETE FORCE] Colaborador ID=${id} "${row.nome_completo}" excluído permanentemente.`);
                res.json({ message: `Colaborador "${row.nome_completo}" excluído permanentemente do sistema.`, id });
            });
        };

        if (force || row.status === 'Incompleto') {
            excluirDefinitivamente();
        } else {
            db.run("UPDATE colaboradores SET status = 'Desligado' WHERE id = ?", [id], function (updateErr) {
                if (!updateErr) checkColaboradorDesligado(id);
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
                    console.error('[OneDrive] Erro ao sincronizar foto:', syncErr.message);
                }
            })();
        }

        res.json({ sucesso: true, caminho: caminhoRelativo });
    } catch (erro) {
        console.error('Erro no processamento da foto:', erro);
        res.status(500).json({ error: erro.message });
    }
});

app.get('/api/colaboradores/foto/:id', (req, res) => {
    db.get('SELECT foto_base64, foto_path FROM colaboradores WHERE id = ?', [req.params.id], (err, row) => {
        if (err || !row) {
            return res.status(404).json({ error: 'Colaborador não encontrado' });
        }

        // Prioridade 1: base64 salvo no banco
        if (row.foto_base64 && row.foto_base64.startsWith('data:image')) {
            const matches = row.foto_base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                const mimeType = matches[1];
                const buffer = Buffer.from(matches[2], 'base64');
                res.set('Content-Type', mimeType);
                res.set('Cache-Control', 'public, max-age=86400');
                return res.send(buffer);
            }
        }

        // Prioridade 2: arquivo físico via foto_path
        if (!row.foto_path) {
            return res.status(404).json({ error: 'Foto não encontrada' });
        }

        let file_path = row.foto_path;
        if (file_path.startsWith('files/') || file_path.startsWith('files\\')) {
            file_path = path.join(BASE_PATH, '..', file_path.replace(/^files[\/]/, ''));
        } else if (file_path.startsWith('Colaboradores/') || file_path.startsWith('Colaboradores\\')) {
            file_path = path.join(BASE_PATH, '..', file_path);
        }
        file_path = path.normalize(file_path);
        if (!path.isAbsolute(file_path)) file_path = path.resolve(file_path);

        if (!fs.existsSync(file_path)) {
            return res.status(404).json({ error: 'Arquivo físico não encontrado' });
        }

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
        [colaborador_id, nome, cpf, data_nascimento, grau_parentesco || 'Dependente'], function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.status(201).json({ id: this.lastID });
        });
});
app.put('/api/dependentes/:id', authenticateToken, (req, res) => {
    const { nome, cpf, data_nascimento, grau_parentesco } = req.body;
    const query = `UPDATE dependentes SET nome = COALESCE(?, nome), cpf = COALESCE(?, cpf), 
                   data_nascimento = COALESCE(?, data_nascimento), grau_parentesco = COALESCE(?, grau_parentesco) 
                   WHERE id = ?`;
    db.run(query, [nome, cpf, data_nascimento, grau_parentesco, req.params.id], function (err) {
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
        
        db.all('SELECT * FROM colaborador_epi_fichas WHERE colaborador_id = ? AND status = "ativa" ORDER BY id DESC LIMIT 1', [req.params.id], (err2, epis) => {
            if (!err2 && epis && epis.length > 0) {
                rows.push({
                    id: 'epi_' + epis[0].id,
                    colaborador_id: req.params.id,
                    document_type: 'Ficha de EPI',
                    tab_name: 'Ficha de EPI'
                });
            }
            res.json(rows);
        });
    });
});


// --- ENDPOINT DEDICADO: Salvar status Santander ------------------------------
// PUT /api/colaboradores/:id/admissao-responsavel
app.put('/api/colaboradores/:id/admissao-responsavel', authenticateToken, (req, res) => {
    const { admissao_responsavel_nome } = req.body;
    db.run(
        'UPDATE colaboradores SET admissao_responsavel_nome = ? WHERE id = ?',
        [admissao_responsavel_nome, req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: 'Responsável atribuído com sucesso.' });
        }
    );
});

// PUT /api/colaboradores/:id/santander-status
app.put('/api/colaboradores/:id/santander-status', authenticateToken, (req, res) => {
    const { santander_ficha_data } = req.body;
    const { id } = req.params;
    if (!santander_ficha_data) return res.status(400).json({ error: 'santander_ficha_data obrigatório' });

    db.run(
        'UPDATE colaboradores SET santander_ficha_data = ? WHERE id = ?',
        [santander_ficha_data, id],
        function (err) {
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
        [colaborador_id, nome, cpf, data_nascimento, grau_parentesco || 'Dependente'], function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.status(201).json({ id: this.lastID });
        });
});
app.put('/api/dependentes/:id', authenticateToken, (req, res) => {
    const { nome, cpf, data_nascimento, grau_parentesco } = req.body;
    const query = `UPDATE dependentes SET nome = COALESCE(?, nome), cpf = COALESCE(?, cpf), 
                   data_nascimento = COALESCE(?, data_nascimento), grau_parentesco = COALESCE(?, grau_parentesco) 
                   WHERE id = ?`;
    db.run(query, [nome, cpf, data_nascimento, grau_parentesco, req.params.id], function (err) {
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
        
        db.all('SELECT * FROM colaborador_epi_fichas WHERE colaborador_id = ? AND status = "ativa" ORDER BY id DESC LIMIT 1', [req.params.id], (err2, epis) => {
            if (!err2 && epis && epis.length > 0) {
                rows.push({
                    id: 'epi_' + epis[0].id,
                    colaborador_id: req.params.id,
                    document_type: 'Ficha de EPI',
                    tab_name: 'Ficha de EPI'
                });
            }
            res.json(rows);
        });
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
        function (err) {
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


// =============================================================================
// ROTAS DE SINISTROS
// =============================================================================

app.get('/api/colaboradores/:id/sinistros', authenticateToken, (req, res) => {
    db.all('SELECT * FROM sinistros WHERE colaborador_id = ? ORDER BY created_at DESC', [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

const multerUploadMemoria = require('multer')({ storage: require('multer').memoryStorage(), limits: { fieldSize: 100 * 1024 * 1024 } });

app.post('/api/extrair-bo', authenticateToken, multerUploadMemoria.single('arquivo'), async (req, res) => {
    try {
        if (!req.file) throw new Error('BO nao enviado.');
        const pdfP = require('pdf-parse');
        const pdfData = await pdfP(req.file.buffer);
        const text = pdfData.text || '';
        // Eliminar espacos duplicados para ajudar a regex
        const cleanText = text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');

        // Boletim No: "FR6269-1/2026" ou "FR 6269-1/2026"
        let boletim = '';
        const matBO = cleanText.match(/([A-Z]{2}\s*\d+[-]\d+\/\d{4})/i)
            || cleanText.match(/Boletim[^\d]*(\d+[-]\d+\/\d{4})/i);
        if (matBO) boletim = matBO[1].replace(/\s/g, '').toUpperCase();

        // Ocorrencia: "13/04/2026 as 13:30"
        let dataHoraStr = '';
        const matOc = cleanText.match(/Ocorr[eê]ncia[:\s]+(\d{2}\/\d{2}\/\d{4})\s+[aà]s?\s+(\d{2}:\d{2})/i)
            || cleanText.match(/Data.*?Ocorr.*?:?\s*(\d{2}\/\d{2}\/\d{4}).*?(\d{2}:\d{2})/i)
            || cleanText.match(/(\d{2}\/\d{2}\/\d{4})\s*.*?(\d{2}:\d{2})/i); // aggressive fallback
        if (matOc) dataHoraStr = matOc[1] + ' às ' + matOc[2];

        // Natureza
        let natureza = '';
        // Captura o que vem logo após Naturezas da Ocorrência... até encontrar Dados da Ocorrência ou Crime Consumado
        const matN = cleanText.match(/Naturezas? da Ocorr[eê]ncia\s*(.*?)(?:Dados da|Crime|\d+\s*-)/i);
        if (matN && matN[1].trim().length > 3) {
            natureza = matN[1].trim();
        } else {
            const matN2 = cleanText.match(/(Crime Consumado.*?)(?:Dados da Ocorr[eê]ncia)/i);
            if (matN2) natureza = matN2[1].trim();
        }

        // Marca/Modelo: "Marca/Modelo: IVECO/DAILY 35CS"
        let marcaModelo = '';
        const matMM = cleanText.match(/Marca\/Modelo[^\w]*([A-Z0-9\/\-\s]{3,30}?)(?:Ano\s|Cor\s|Chassi|Placa)/i);
        if (matMM) marcaModelo = matMM[1].trim();

        // Placa: "TLR0H81" (ou "TLR0H811" com typo do PDF real)
        let placa = '';
        const matPl = cleanText.match(/Placa[^\w]*([A-Z]{3}[-\s]*\d[A-Z0-9]\d{2,3})/i)
            || cleanText.match(/Placa[^\w]*([A-Z]{3}[-\s]*\d{4,5})/i)
            || cleanText.match(/(?:^|\s)([A-Z]{3}[-\s]*[0-9][A-Z0-9]{3,4})(?:[-\s]|$)/i); // aggressive fallback
        if (matPl) {
            placa = matPl[1].replace(/[-\s]/g, '').toUpperCase();
            if (placa.length > 7) placa = placa.substring(0, 7); // Força 7 caracteres para remover lixo do pdf-parse
        }

        console.log('[BO] boletim=' + boletim + ' | data=' + dataHoraStr + ' | natureza=' + natureza + ' | placa=' + placa + ' | modelo=' + marcaModelo);
        console.log('[BO-TEXT primeiros 300 chars]', cleanText.substring(0, 300));
        // _debug_text ainda é retornado para log no console do frontend (não mais em alert)
        res.json({ sucesso: true, boletim, data_hora: dataHoraStr, natureza, placa, marca_modelo: marcaModelo, _debug_text: text.substring(0, 2000) });
    } catch (e) {
        console.error('[EXTRAIR-BO] Erro:', e.message);
        res.status(500).json({ error: e.message });
    }
});



app.delete('/api/colaboradores/:id/sinistros/:sinistroId', authenticateToken, (req, res) => {
    const { id, sinistroId } = req.params;

    // Nao deixamos excluir se ja estiver assinado, por seguranca da assinatura digital.
    db.get('SELECT status FROM sinistros WHERE id = ? AND colaborador_id = ?', [sinistroId, id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Sinistro nao encontrado' });
        if (row.status === 'assinado') return res.status(403).json({ error: 'Nao eh possivel excluir um sinistro ja assinado.' });

        db.run('DELETE FROM sinistros WHERE id = ? AND colaborador_id = ?', [sinistroId, id], function (err2) {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ sucesso: true });
        });
    });
});

app.post('/api/colaboradores/:id/sinistros', authenticateToken, multerUploadMemoria.single('arquivo'), async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;

        const colab = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM colaboradores WHERE id = ?', [id], (err, row) => err ? reject(err) : resolve(row));
        });
        if (!colab) return res.status(404).json({ error: 'Colaborador nao encontrado.' });

        const nomeFormatado = (colab.nome_completo || colab.nome || 'COLAB')
            .toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');

        let dataFormatada = (body.data_hora || '').split(' ')[0].replace(/\D/g, '');
        if (!dataFormatada) dataFormatada = String(new Date().getDate()).padStart(2, '0') + String(new Date().getMonth() + 1).padStart(2, '0') + new Date().getFullYear();

        // Pasta padrao C:\...\THAIS_RICCI\SINISTROS\Datadoocorrido\
        const pastaDataStr = (body.data_hora || '').split(' ')[0].replace(/\//g, '-');
        const pastaRoot = process.env.ONEDRIVE_BASE_PATH || 'RH/1.Colaboradores/Sistema';
        let targetDir = pastaRoot + '/' + nomeFormatado + '/SINISTROS/' + (pastaDataStr || dataFormatada);

        // Garantir unique numero se ja existir a mesma data - fazemos isso procurando o count
        const qtdNoDia = await new Promise(r => db.get("SELECT count(*) as c FROM sinistros WHERE colaborador_id=? AND data_hora LIKE ?", [id, (body.data_hora || '').split(' ')[0] + '%'], (e, row) => r(row ? row.c : 0)));
        if (qtdNoDia > 0) {
            targetDir += '_' + (qtdNoDia + 1);
        }

        const stmt = `INSERT INTO sinistros (colaborador_id, numero_boletim, data_hora, natureza, placa, veiculo,
            desconto, parcelas, valor_parcela, tipo_sinistro, boletim_path, processo_iniciado) 
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`;

        // Nome padrão do doc: Sinistro_Datadoocorrido_Nome_do_Colaborador.pdf
        const pnome = 'BO_Sinistro_' + (pastaDataStr || dataFormatada).replace(/-/g, '') + '_' + nomeFormatado + '.pdf';
        const docOnedrivePath = targetDir + '/' + pnome;

        db.run(stmt, [id, body.numero_boletim, body.data_hora, body.natureza, body.placa, body.veiculo,
            body.desconto, body.parcelas || 1, body.valor_parcela, body.tipo_sinistro, docOnedrivePath, body.desconto === 'Sim' ? 1 : 0],
            async function (err) {
                if (err) return res.status(500).json({ error: err.message });
                const sinId = this.lastID;

                // Sync OneDrive 
                if (req.file && typeof onedrive !== 'undefined') {
                    try {
                        await onedrive.ensurePath(pastaRoot + '/' + nomeFormatado);
                        await onedrive.ensurePath(pastaRoot + '/' + nomeFormatado + '/SINISTROS');
                        const finalDir = targetDir.substring(targetDir.lastIndexOf('/SINISTROS/') + 11);
                        await onedrive.ensurePath(pastaRoot + '/' + nomeFormatado + '/SINISTROS/' + finalDir);

                        await onedrive.uploadToOneDrive(targetDir, pnome, req.file.buffer);

                        // Upload de orçamentos se houver
                        if (body.orcamentos_base64) {
                            const orcs = JSON.parse(body.orcamentos_base64);
                            let paths = [];
                            for (let i = 0; i < orcs.length; i++) {
                                const orcBuf = Buffer.from(orcs[i].split(',')[1], 'base64');
                                const orcNome = 'Orcamento_' + (i + 1) + '.pdf';
                                await onedrive.uploadToOneDrive(targetDir, orcNome, orcBuf);
                                paths.push(targetDir + '/' + orcNome);
                            }
                            db.run('UPDATE sinistros SET orcamentos_paths = ? WHERE id = ?', [JSON.stringify(paths), sinId]);
                        }
                    } catch (e) { console.error('Erro OneDrive:', e); }
                }

                res.json({ sucesso: true, id: sinId, targetDir });
            });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/colaboradores/:id/sinistros/:sinistroId/gerar-documento', authenticateToken, async (req, res) => {
    try {
        const { id, sinistroId } = req.params;
        const colab = await new Promise((resolve) => db.get('SELECT * FROM colaboradores WHERE id = ?', [id], (e, r) => resolve(r)));
        const sin = await new Promise((resolve) => db.get('SELECT * FROM sinistros WHERE id = ?', [sinistroId], (e, r) => resolve(r)));
        if (!sin || !colab) throw new Error('Não encontrado.');

        // Busca todos os geradores de Sinistro e acha o mais proximo ao tipo_sinistro
        const normalize = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '').trim();
        const tipoNorm = normalize(sin.tipo_sinistro);
        const todosGeradores = await new Promise((resolve) => db.all("SELECT * FROM geradores WHERE nome LIKE '%Sinistro%'", [], (e, r) => resolve(r || [])));
        console.log('[Sinistro] tipo_sinistro:', JSON.stringify(sin.tipo_sinistro), '| geradores disponiveis:', todosGeradores.map(g => g.nome));
        let gerador = todosGeradores.find(g => normalize(g.nome).includes(tipoNorm))
            || todosGeradores.find(g => tipoNorm.split(' ').filter(w => w.length > 3).every(w => normalize(g.nome).includes(w)))
            || null;
        console.log('[Sinistro] gerador escolhido:', gerador ? gerador.nome : 'NENHUM');

        let template = '';
        if (!gerador) {
            template = "<h2 style='text-align:center;'>TERMO DE RESPONSABILIDADE - SINISTRO</h2>"
                + "<p><strong>Colaborador:</strong> {NOME_COMPLETO}</p>"
                + "<p><strong>Tipo de Sinistro:</strong> " + sin.tipo_sinistro + "</p>"
                + "<p><strong>BO:</strong> " + sin.numero_boletim + " - " + sin.data_hora + "</p>"
                + "<p><strong>Placa/Veículo:</strong> " + sin.placa + " / " + sin.veiculo + "</p>"
                + "<p><strong>Condições de Desconto:</strong> " + sin.parcelas + "x de " + (sin.valor_parcela || '0,00') + "</p>"
                + "<br/><br/><br/>";
        } else {
            template = gerador.conteudo;
        }

        // ===== SUBSTITUICOES AVANCADAS SINISTRO =====
        let htmlFinal = template;
        const colabNome = (colab.nome_completo || colab.nome || '').toUpperCase();

        const admissao = colab.data_admissao ? new Date(colab.data_admissao + 'T12:00:00').toLocaleDateString('pt-BR') : '';
        const salario = colab.salario ? `R$ ${parseFloat(colab.salario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '---';
        const tituloBox = gerador ? gerador.nome.toUpperCase() : 'TERMO DE RESPONSABILIDADE - SINISTRO';

        let needsLogo = !htmlFinal.includes('logo-header.png');
        let needsBox = !htmlFinal.includes('DADOS COLABORADOR:');

        if (needsLogo || needsBox) {
            let injectedHTML = '';

            // 1. Logo sem margin/padding lateral para colar nas bordas do papel
            if (needsLogo) {
                const logoUrl = req.protocol + '://' + req.get('host') + '/assets/logo-header.png';
                injectedHTML += `<div style="margin:0;padding:0;line-height:0;"><img src="${logoUrl}" style="width:100%;display:block;margin:0;padding:0;"></div>`;
            }

            // Início do container com padding para o resto do documento
            injectedHTML += `<div style="padding: 20px 60px 40px 60px;">`;

            // 2. Quadro de DADOS COLABORADOR
            if (needsBox) {
                injectedHTML += `
                <div style="border: 1px solid #000; padding: 0.4rem 0.75rem; margin-top: 0.5rem; line-height: 1.3; font-size: 0.75rem;">
                    <p style="margin-bottom: 0.2rem; font-size: 0.8rem;"><b>DADOS COLABORADOR:</b></p>
                    <div style="display: flex; gap: 2rem;">
                        <span>NOME: <b>${colabNome}</b></span>
                        <span>CPF: <b>${colab.cpf || ''}</b></span>
                    </div>
                    <p>ENDEREÇO: ${colab.endereco || '---'}</p>
                    <p>CARGO: ${colab.cargo || '---'}</p>
                    <div style="display: flex; gap: 2rem;">
                        <span>CELULAR: ${colab.telefone || '---'}</span>
                        <span>E-MAIL: ${colab.email || '---'}</span>
                    </div>
                </div>
                `;
            }

            // 3. O template original (com conteúdo do gerador) formatado
            injectedHTML += `
                <div style="margin-top: 0.6rem; text-align: justify; font-size: 0.82rem; line-height: 1.45;">
                    <style>
                        p { margin: 0.1rem 0; page-break-inside: avoid; }
                        li { margin: 0.08rem 0; page-break-inside: avoid; }
                        br { line-height: 0.3; }
                    </style>
                    ${htmlFinal}
                </div>
            `;

            // Fim do container com padding
            injectedHTML += `</div>`;

            htmlFinal = injectedHTML;
        }

        // Substituições via placeholders {{}} ou {} (gerador padrão)
        htmlFinal = htmlFinal.replace(/\{NOME_COMPLETO\}|\{NOME_COLABORADOR\}|\{COLABORADOR\}/gi, colabNome);
        htmlFinal = htmlFinal.replace(/\{CPF\}/gi, colab.cpf || '');
        htmlFinal = htmlFinal.replace(/\{RG\}/gi, colab.rg || '');
        htmlFinal = htmlFinal.replace(/\{CARGO\}|\{FUNCAO\}/gi, colab.cargo || colab.funcao || '');
        htmlFinal = htmlFinal.replace(/\{SINISTRO_BO\}|\{BO_NUMERO\}|\{NUMERO_BO\}/gi, sin.numero_boletim || '');
        htmlFinal = htmlFinal.replace(/\{SINISTRO_DATA\}|\{DATA_BO\}|\{DATA_OCORRENCIA\}/gi, sin.data_hora || '');
        htmlFinal = htmlFinal.replace(/\{SINISTRO_NATUREZA\}|\{NATUREZA\}/gi, sin.natureza || '');
        htmlFinal = htmlFinal.replace(/\{SINISTRO_PLACA\}|\{PLACA\}/gi, sin.placa || '');
        htmlFinal = htmlFinal.replace(/\{SINISTRO_VEICULO\}|\{VEICULO\}|\{MARCA_MODELO\}/gi, sin.veiculo || '');
        htmlFinal = htmlFinal.replace(/\{SINISTRO_PARCELAS\}|\{QTDE_PARCELAS\}/gi, String(sin.parcelas || 1));
        htmlFinal = htmlFinal.replace(/\{SINISTRO_VALOR_PARCELA\}|\{VALOR_PARCELA\}/gi, sin.valor_parcela || '');
        htmlFinal = htmlFinal.replace(/\{VALOR_TOTAL\}|\{VALOR_DANO\}/gi, sin.desconto_valor || sin.valor_parcela || '');
        htmlFinal = htmlFinal.replace(/\{SINISTRO_TIPO\}|\{TIPO_SINISTRO\}/gi, sin.tipo_sinistro || '');
        htmlFinal = htmlFinal.replace(/\{SINISTRO_CONDICOES\}|\{DESCRICAO_DESCONTO\}/gi, `${sin.parcelas || 1}x de ${sin.valor_parcela || ''}`);

        // ===== SUBSTITUIÇÃO INTELIGENTE DE CAMPOS BLANK NO HTML =====
        // Separa data e hora da string "DD/MM/YYYY às HH:MM"
        const dataHoraStr = sin.data_hora || '';
        const parteData = dataHoraStr.split(' ')[0] || '';   // DD/MM/YYYY
        const parteHora = dataHoraStr.includes('às') ? dataHoraStr.split('às')[1]?.trim() : (dataHoraStr.split(' ')[1] || '');

        // Remove "(se houver)" se existir
        htmlFinal = htmlFinal.replace(/\s*\(se\s+houver\)/gi, '');

        // 1. Data e hora da ocorrência
        // Remove "//"
        htmlFinal = htmlFinal.replace(/(Data[^:]*ocorr[^:]*:[\s\S]{0,80}?)\/\//gi, '$1');
        // Primeiro blank -> Data
        let dataSubstCount = 0;
        htmlFinal = htmlFinal.replace(
            /(Data[^:]*ocorr[^:]*:[\s\S]{0,80}?)_{2,}/i,
            (match, p1) => {
                dataSubstCount++;
                return `${p1}<strong>${parteData}</strong>`;
            }
        );
        // Segundo blank -> Hora
        if (dataSubstCount > 0) {
            htmlFinal = htmlFinal.replace(
                /(Data[^:]*ocorr[^:]*:[\s\S]{0,80}?<strong>[\s\S]{0,40}?<\/strong>[\s\S]{0,80}?)_{2,}/i,
                `$1<strong>${parteHora}</strong>`
            );
        }

        // 2. Natureza da ocorrência (filtrando "Crime Consumado")
        let orgNatureza = sin.natureza || '';
        let naturezaFormatada = orgNatureza.replace(/Crime Consumado\s*-?\s*/gi, '').trim();
        htmlFinal = htmlFinal.replace(
            /(Natureza[^:]*:[\s\S]{0,80}?)_{3,}/gi,
            `$1<strong>${naturezaFormatada}</strong>`
        );

        // 3. Boletim de Ocorrência
        htmlFinal = htmlFinal.replace(
            /(Boletim[^:]*:[\s\S]{0,80}?)_{3,}/gi,
            `$1<strong>${sin.numero_boletim || ''}</strong>`
        );

        // 4. Marca / Modelo
        htmlFinal = htmlFinal.replace(
            /(Marca[^:]*:[\s\S]{0,80}?)_{3,}/gi,
            `$1<strong>${sin.veiculo || ''}</strong>`
        );

        // 5. Placa
        htmlFinal = htmlFinal.replace(
            /(Placa[^:]*:[\s\S]{0,80}?)_{3,}/gi,
            `$1<strong>${sin.placa || ''}</strong>`
        );

        // 6. Valor
        const valorTotal = sin.desconto_valor
            || (sin.valor_parcela && sin.parcelas ? (parseFloat((sin.valor_parcela || '0').replace(',', '.')) * (sin.parcelas || 1)).toFixed(2).replace('.', ',') : sin.valor_parcela)
            || '';

        htmlFinal = htmlFinal.replace(
            /(Valor\s+total[^:]*:[\s\S]{0,80}?R\$[\s\S]{0,50}?)_{3,}/gi,
            `$1 <strong>${valorTotal}</strong>`
        );
        htmlFinal = htmlFinal.replace( // Variante se faltar R$ na linha
            /(Valor\s+total[^:]*:[\s\S]{0,80}?)_{3,}/gi,
            `$1 R$ <strong>${valorTotal}</strong>`
        );

        // Substitui parcelamento (   ) 1x ... usando X
        const nParc = parseInt(sin.parcelas) || 1;
        htmlFinal = htmlFinal.replace(
            /(\([\s\xA0&nbsp;]*\)(?:[\s\xA0&nbsp;]|<[^>]+>)*1x)/gi,
            (nParc === 1 ? '(<strong>X</strong>) 1x' : '(   ) 1x')
        );
        htmlFinal = htmlFinal.replace(
            /(\([\s\xA0&nbsp;]*\)(?:[\s\xA0&nbsp;]|<[^>]+>)*2x)/gi,
            (nParc === 2 ? '(<strong>X</strong>) 2x' : '(   ) 2x')
        );
        htmlFinal = htmlFinal.replace(
            /(\([\s\xA0&nbsp;]*\)(?:[\s\xA0&nbsp;]|<[^>]+>)*3x)/gi,
            (nParc === 3 ? '(<strong>X</strong>) 3x' : '(   ) 3x')
        );

        // ===== LOGO =====
        // Injeta logo da América Rental no topo — usa Base64 para garantir que apareça no PDF gerado server-side
        const _logoB64ForBanner = getLogoBase64DataUri();
        const _logoSrc = _logoB64ForBanner || `${process.env.PUBLIC_URL || ''}/assets/logo-header.png`;
        const bannerHtml = `<div style="margin:0;padding:0;line-height:0;"><img src="${_logoSrc}" style="width:100%;display:block;margin:0;padding:0;"></div>`;
        const contentPaddingWrapper = `<div style="padding: 30px;">`;
        if (!htmlFinal.includes('america-rental-logo') && !htmlFinal.includes('<img') && !htmlFinal.includes('logo-header')) {
            // Apply banner above the padding wrapper
            htmlFinal = bannerHtml + contentPaddingWrapper + htmlFinal + `</div>`;
        } else {
            // Document already handles logo or we don't want to enforce it loosely
            htmlFinal = contentPaddingWrapper + htmlFinal + `</div>`;
        }

        // O body deve ir formatado com HTML completo se não tiver <html>
        if (!htmlFinal.toLowerCase().includes('<html')) {
            htmlFinal = `<html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;margin:0;padding:0;font-size:13px;line-height:1.6;}strong{font-weight:700;}</style></head><body>` + htmlFinal + `</body></html>`;
        }


        // Salvar HTML
        db.run('UPDATE sinistros SET documento_html = ? WHERE id = ?', [htmlFinal, sin.id]);
        res.json({ sucesso: true, html: htmlFinal });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Helper: gera PDF a partir de HTML e salva no OneDrive do colaborador
// Helper: lê o logo do disco e retorna data URI base64 para embutir em PDF
function getLogoBase64DataUri() {
    try {
        const logoPath = path.join(__dirname, '..', 'frontend', 'assets', 'logo-header.png');
        if (fs.existsSync(logoPath)) {
            const logoBuffer = fs.readFileSync(logoPath);
            return `data:image/png;base64,${logoBuffer.toString('base64')}`;
        }
    } catch (e) {
        console.warn('[PDF] Não foi possível carregar logo-header.png:', e.message);
    }
    return null;
}

async function salvarPDFSinistroNoOneDrive(colaboradorId, sinistroId, htmlDoc, nomeArquivo) {
    try {
        const htmlPdf = require('html-pdf-node');
        const colab = await new Promise((resolve, reject) =>
            db.get('SELECT * FROM colaboradores WHERE id = ?', [colaboradorId], (err, row) => err ? reject(err) : resolve(row))
        );
        if (!colab) throw new Error('Colaborador não encontrado');

        const sin = await new Promise((resolve, reject) =>
            db.get('SELECT * FROM sinistros WHERE id = ?', [sinistroId], (err, row) => err ? reject(err) : resolve(row))
        );
        if (!sin) throw new Error('Sinistro não encontrado');

        const nomeFormatado = (colab.nome_completo || colab.nome || 'COLAB')
            .toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');

        const pastaDataStr = (sin.data_hora || '').split(' ')[0].replace(/\//g, '-');
        const pastaRoot = process.env.ONEDRIVE_BASE_PATH || 'RH/1.Colaboradores/Sistema';
        const targetDir = pastaRoot + '/' + nomeFormatado + '/SINISTROS/' + (pastaDataStr || 'SEM_DATA');

        // === Substituir URL do logo por Base64 para garantir que apareça no PDF ===
        let htmlParaPdf = htmlDoc;
        const logoB64 = getLogoBase64DataUri();
        if (logoB64) {
            // Substitui qualquer src que contenha logo-header.png pelo base64
            htmlParaPdf = htmlParaPdf
                .replace(/src="[^"]*logo-header\.png[^"]*"/gi, `src="${logoB64}"`)
                .replace(/src='[^']*logo-header\.png[^']*'/gi, `src='${logoB64}'`);
        }

        const pdfBuffer = await htmlPdf.generatePdf(
            { content: htmlParaPdf },
            {
                format: 'A4', margin: { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' },
                printBackground: true, args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        );


        if (typeof onedrive !== 'undefined') {
            await onedrive.ensurePath(pastaRoot + '/' + nomeFormatado);
            await onedrive.ensurePath(pastaRoot + '/' + nomeFormatado + '/SINISTROS');
            await onedrive.ensurePath(targetDir);
            await onedrive.uploadToOneDrive(targetDir, nomeArquivo, pdfBuffer);
        }

        // Atualiza path no banco
        const pdfPath = targetDir + '/' + nomeArquivo;
        db.run('UPDATE sinistros SET boletim_path = ? WHERE id = ?', [pdfPath, sinistroId]);

        console.log('[Sinistro] PDF salvo em:', pdfPath);
        return pdfPath;
    } catch (e) {
        console.error('[Sinistro] Erro ao salvar PDF no OneDrive:', e.message);
        throw e;
    }
}

app.post('/api/colaboradores/:id/sinistros/:sinistroId/assinar-testemunhas', authenticateToken, async (req, res) => {
    try {
        const { id, sinistroId } = req.params;
        const { t1_nome, t1_base64, t2_nome, t2_base64, html_atualizado } = req.body;

        await new Promise((resolve, reject) =>
            db.run(`UPDATE sinistros SET assinatura_testemunha1_nome=?, assinatura_testemunha1_base64=?, 
                    assinatura_testemunha2_nome=?, assinatura_testemunha2_base64=?, documento_html=? WHERE id=?`,
                [t1_nome, t1_base64, t2_nome, t2_base64, html_atualizado, sinistroId],
                err => err ? reject(err) : resolve())
        );

        // Gerar e salvar PDF com assinaturas das testemunhas
        if (html_atualizado) {
            const sin = await new Promise((resolve, reject) =>
                db.get('SELECT * FROM sinistros WHERE id = ?', [sinistroId], (err, row) => err ? reject(err) : resolve(row))
            );
            const colab = await new Promise((resolve, reject) =>
                db.get('SELECT * FROM colaboradores WHERE id = ?', [id], (err, row) => err ? reject(err) : resolve(row))
            );
            const nomeFormatado = (colab?.nome_completo || colab?.nome || 'COLAB')
                .toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
            const dataStr = (sin?.data_hora || '').split(' ')[0].replace(/\//g, '-').replace(/-/g, '') || String(Date.now());
            const nomeArquivo = `Sinistro_${dataStr}_${nomeFormatado}.pdf`;

            await salvarPDFSinistroNoOneDrive(id, sinistroId, html_atualizado, nomeArquivo);
        }

        res.json({ sucesso: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/colaboradores/:id/sinistros/:sinistroId/assinar-condutor', authenticateToken, async (req, res) => {
    try {
        const { id, sinistroId } = req.params;
        const { assinatura_base64, documento_html } = req.body;

        await new Promise((resolve, reject) =>
            db.run(`UPDATE sinistros SET assinatura_condutor_base64=?, documento_html=?, assinaturas_finalizadas=1, status='assinado' WHERE id=?`,
                [assinatura_base64, documento_html, sinistroId],
                err => err ? reject(err) : resolve())
        );

        // Gerar e salvar PDF final (condutor + testemunhas) sobrepondo o arquivo anterior
        if (documento_html) {
            const sin = await new Promise((resolve, reject) =>
                db.get('SELECT * FROM sinistros WHERE id = ?', [sinistroId], (err, row) => err ? reject(err) : resolve(row))
            );
            const colab = await new Promise((resolve, reject) =>
                db.get('SELECT * FROM colaboradores WHERE id = ?', [id], (err, row) => err ? reject(err) : resolve(row))
            );
            const nomeFormatado = (colab?.nome_completo || colab?.nome || 'COLAB')
                .toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
            const dataStr = (sin?.data_hora || '').split(' ')[0].replace(/\//g, '-').replace(/-/g, '') || String(Date.now());
            const nomeArquivo = `Sinistro_${dataStr}_${nomeFormatado}.pdf`; // mesmo nome = sobrepõe

            await salvarPDFSinistroNoOneDrive(id, sinistroId, documento_html, nomeArquivo);
        }

        res.json({ sucesso: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// =============================================================================

// --- ROTAS MULTAS LOGÍSTICA ---------------------------------------------------
// ==========================================
// MÓDULO LOGÍSTICA: COFRE DE SENHAS
// ==========================================
const crypto = require('crypto');
const SENHAS_ENCRYPTION_KEY = crypto.scryptSync(process.env.JWT_SECRET || 'america-rental-secreto-super-seguro-2026', 'salt', 32);
const SENHAS_ENCRYPTION_ALGORITHM = 'aes-256-cbc';
const SENHAS_IV_LENGTH = 16;

function encryptPassword(text) {
    let iv = crypto.randomBytes(SENHAS_IV_LENGTH);
    let cipher = crypto.createCipheriv(SENHAS_ENCRYPTION_ALGORITHM, SENHAS_ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptPassword(text) {
    let textParts = text.split(':');
    if (textParts.length !== 2) return text; // Fallback se não estiver no formato esperado
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv(SENHAS_ENCRYPTION_ALGORITHM, SENHAS_ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

app.get('/api/logistica/senhas', authenticateToken, (req, res) => {
    const isDiretoria = req.user && (String(req.user.departamento).toLowerCase().includes('diretoria') || String(req.user.role).toLowerCase() === 'diretoria' || String(req.user.username).toLowerCase() === 'diretoria.1');
    let query = `
        SELECT ls.*, u.nome as owner_nome, u.username as owner_username, c.status as colab_status
        FROM logistica_senhas ls
        LEFT JOIN usuarios u ON ls.owner_id = u.id
        LEFT JOIN colaboradores c ON ls.nome = c.nome_completo
        WHERE ls.tipo = 'compartilhada' OR ls.owner_id = ?
    `;
    let params = [req.user.id];

    if (isDiretoria) {
        query = `
            SELECT ls.*, u.nome as owner_nome, u.username as owner_username, c.status as colab_status
            FROM logistica_senhas ls
            LEFT JOIN usuarios u ON ls.owner_id = u.id
            LEFT JOIN colaboradores c ON ls.nome = c.nome_completo
        `;
        params = [];
    }
    query += " ORDER BY ls.servico ASC";

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const senhas = rows.map(r => {
            r.senha = r.senha_encriptada ? decryptPassword(r.senha_encriptada) : '';
            delete r.senha_encriptada;
            return r;
        });
        res.json(senhas);
    });
});

app.post('/api/logistica/senhas', authenticateToken, (req, res) => {
    const { nome, servico, link, usuario, senha, tipo } = req.body;
    
    const tipoVal = tipo === 'pessoal' ? 'pessoal' : 'compartilhada';
    const senhaEncriptada = senha ? encryptPassword(senha) : '';
    db.run("INSERT INTO logistica_senhas (nome, servico, link, usuario, senha_encriptada, owner_id, tipo) VALUES (?, ?, ?, ?, ?, ?, ?)", [nome || '', servico || '', link || '', usuario || '', senhaEncriptada, req.user.id, tipoVal], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        const newId = this.lastID;
        // Registra no histórico
        db.run("INSERT INTO logistica_senhas_historico (senha_id, acao, campo_alterado, valor_anterior, valor_novo, usuario_id, usuario_nome) VALUES (?, 'criacao', 'servico', null, ?, ?, ?)",
            [newId, servico || '', req.user.id, req.user.nome || req.user.username]);
        res.json({ id: newId, message: 'Senha cadastrada com sucesso' });
    });
});

app.put('/api/logistica/senhas/:id', authenticateToken, (req, res) => {
    const { nome, servico, link, usuario, senha, tipo } = req.body;
    const updates = [];
    const params = [];
    const senhaId = req.params.id;
    
    if (nome !== undefined) { updates.push("nome = ?"); params.push(nome); }
    if (servico !== undefined) { updates.push("servico = ?"); params.push(servico); }
    if (link !== undefined) { updates.push("link = ?"); params.push(link); }
    if (usuario !== undefined) { updates.push("usuario = ?"); params.push(usuario); }
    if (tipo !== undefined) { updates.push("tipo = ?"); params.push(tipo === 'pessoal' ? 'pessoal' : 'compartilhada'); }
    if (senha !== undefined) { 
        updates.push("senha_encriptada = ?"); 
        params.push(senha ? encryptPassword(senha) : ''); 
    }
    
    if (updates.length === 0) return res.status(400).json({ error: 'Nenhum dado para atualizar.' });
    updates.push("updated_at = CURRENT_TIMESTAMP");
    params.push(senhaId);
    
    // Buscar dados antes de alterar para logar
    db.get("SELECT * FROM logistica_senhas WHERE id = ?", [senhaId], (err, oldRow) => {
        db.run(`UPDATE logistica_senhas SET ${updates.join(', ')} WHERE id = ?`, params, function(err) {
            if (err) return res.status(500).json({ error: err.message });
            // Registra campos alterados no histórico
            const camposAlterados = [];
            if (servico !== undefined && oldRow && oldRow.servico !== servico) camposAlterados.push({ campo: 'servico', de: oldRow.servico, para: servico });
            if (usuario !== undefined && oldRow && oldRow.usuario !== usuario) camposAlterados.push({ campo: 'usuario', de: oldRow.usuario, para: usuario });
            if (nome !== undefined && oldRow && oldRow.nome !== nome) camposAlterados.push({ campo: 'nome', de: oldRow.nome, para: nome });
            if (link !== undefined && oldRow && oldRow.link !== link) camposAlterados.push({ campo: 'link', de: oldRow.link, para: link });
            if (senha !== undefined) camposAlterados.push({ campo: 'senha', de: '***', para: '***' });
            if (camposAlterados.length === 0) camposAlterados.push({ campo: 'registro', de: null, para: null });
            camposAlterados.forEach(c => {
                db.run("INSERT INTO logistica_senhas_historico (senha_id, acao, campo_alterado, valor_anterior, valor_novo, usuario_id, usuario_nome) VALUES (?, 'edicao', ?, ?, ?, ?, ?)",
                    [senhaId, c.campo, c.de, c.para, req.user.id, req.user.nome || req.user.username]);
            });
            res.json({ message: 'Senha atualizada com sucesso' });
        });
    });
});

app.delete('/api/logistica/senhas/:id', authenticateToken, (req, res) => {
    db.get("SELECT * FROM logistica_senhas WHERE id = ?", [req.params.id], (err, row) => {
        db.run("DELETE FROM logistica_senhas WHERE id = ?", [req.params.id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            // Registra exclusão no histórico (mantém registro orphan)
            db.run("INSERT INTO logistica_senhas_historico (senha_id, acao, campo_alterado, valor_anterior, valor_novo, usuario_id, usuario_nome) VALUES (?, 'exclusao', 'servico', ?, null, ?, ?)",
                [req.params.id, row ? row.servico : '?', req.user.id, req.user.nome || req.user.username]);
            res.json({ message: 'Senha deletada com sucesso' });
        });
    });
});

// GET histórico de alterações do cofre de senhas
app.get('/api/logistica/senhas/historico', authenticateToken, (req, res) => {
    db.all(`
        SELECT h.*, ls.servico as senha_servico, ls.nome as senha_nome
        FROM logistica_senhas_historico h
        LEFT JOIN logistica_senhas ls ON h.senha_id = ls.id
        ORDER BY h.criado_em DESC
        LIMIT 200
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// GET /api/logistica/multas — lista todas as multas
app.get('/api/logistica/multas', authenticateToken, (req, res) => {
    db.all(`SELECT ml.*, c.nome_completo as motorista_nome_colab, c.cpf as motorista_cpf, c.cnh_numero as motorista_habilitacao
            FROM multas_logistica ml
            LEFT JOIN colaboradores c ON ml.motorista_id = c.id
            ORDER BY ml.criado_em DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// MIGRATION: coluna para armazenar PDF como base64 no banco (evita perda no filesystem efêmero do Render)
db.run("ALTER TABLE multas_logistica ADD COLUMN documento_base64 TEXT", (err) => {
    if (err && !err.message.includes('duplicate column')) console.error('[MIGRATION multas_logistica documento_base64]', err.message);
});

// POST /api/logistica/multas — cria nova multa
const multaUploadMiddleware = require('multer')({ storage: require('multer').memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
app.post('/api/logistica/multas', authenticateToken, multaUploadMiddleware.single('documento'), (req, res) => {
    const { data_infracao, hora_infracao, numero_ait, motivo, valor_multa, pontuacao, placa, local_infracao, data_limite } = req.body;

    let documento_base64 = null;
    let documento_nome = null;

    if (req.file) {
        try {
            documento_base64 = req.file.buffer.toString('base64');
            documento_nome = req.file.originalname;
        } catch (fileErr) {
            console.error('[MULTA-UPLOAD] Erro ao converter PDF:', fileErr.message);
        }
    }

    db.run(
        `INSERT INTO multas_logistica (data_infracao, hora_infracao, numero_ait, motivo, valor_multa, pontuacao, placa, local_infracao, data_limite, status, documento_nome, documento_base64)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Conferência', ?, ?)`,
        [data_infracao || null, hora_infracao || null, numero_ait || null, motivo || null, valor_multa || null, pontuacao || 0, placa || null, local_infracao || null, data_limite || null, documento_nome, documento_base64],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, ok: true });
        }
    );
});

async function notificarRHAuto(motoristaId, status, parcelas, valorMultaStr, dataInfracao, numAit) {
    return new Promise((resolve, reject) => {
        if (!motoristaId) return reject(new Error('Motorista não informado. Não é possível notificar o RH.'));
        db.get('SELECT * FROM colaboradores WHERE id = ?', [motoristaId], async (err, colab) => {
            if (err || !colab) return reject(new Error('Motorista não encontrado no banco de dados.'));
            const nodemailer = require('nodemailer');
            const transporter = nodemailer.createTransport(SMTP_CONFIG);
            const numericStr = (valorMultaStr || "0").toString().replace(/[^\d,-]/g, '').replace(',', '.');
            let valorOriginal = parseFloat(numericStr) || 0;
            let multiplicador = (status === 'Multa NIC') ? 3 : 1;
            let valorTotalNum = valorOriginal * multiplicador;
            let p = parseInt(parcelas) || 1;
            let valorParcelaNum = valorTotalNum / p;
            const fmt = v => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const logoPath = require('path').join(__dirname, '..', 'frontend', 'assets', 'logo-header.png');
            const [y, m, d] = (dataInfracao || '').split('-');
            const dataInfracaoFmt = d ? `${d}/${m}/${y}` : 'Não informada';
            const htmlContent = `
                <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="cid:empresa-logo" style="max-height: 80px;">
                    </div>
                    <h2 style="color: #2c3e50; border-bottom: 2px solid #ea580c; padding-bottom: 10px;">Desconto Financeiro - Multa de Trânsito</h2>
                    <p>Olá RH, favor realizar o desconto financeiro referente à multa de trânsito abaixo:</p>
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Colaborador:</strong> ${colab.nome_completo || colab.nome}</p>
                        <p><strong>CPF:</strong> ${colab.cpf}</p>
                        <p><strong>Data da Infração:</strong> ${dataInfracaoFmt}</p>
                        <p><strong>Nº do AIT (Multa):</strong> ${numAit || 'S/N'}</p>
                        <p><strong>Tipo/Status:</strong> ${status} ${status === 'Multa NIC' ? '(Base x 3)' : ''}</p>
                    </div>
                    <div style="margin-top: 20px; padding: 15px; border: 2px solid #ea580c; border-radius: 8px; background: #fff7ed;">
                        <h3 style="margin-top: 0; color: #c2410c;">Resumo do Desconto</h3>
                        <p style="font-size: 1.1rem;"><strong>Valor Total a Descontar:</strong> ${fmt(valorTotalNum)}</p>
                        <p style="font-size: 1.1rem;"><strong>Forma de Pagamento:</strong> ${p}x de ${fmt(valorParcelaNum)}</p>
                    </div>
                    <p style="margin-top: 30px; font-size: 0.9rem; color: #7f8c8d; text-align: center;">E-mail gerado automaticamente pelo Sistema RH & Logística</p>
                </div>
            `;
            try {
                await sendMailHelper({
                    from: `"América Rental" <${SMTP_CONFIG.auth.user}>`,
                    to: 'rh@americarental.com.br',
                    subject: `Desconto de Multa - ${colab.nome_completo || colab.nome}`,
                    html: htmlContent,
                    attachments: [{ filename: 'logo-header.png', path: logoPath, cid: 'empresa-logo' }]
                });
                resolve();
            } catch (errSend) {
                reject(errSend);
            }
        });
    });
}

// PUT /api/logistica/multas/:id — atualiza campos da multa (motorista, status, obs, link)
app.put('/api/logistica/multas/:id', authenticateToken, (req, res) => {
    const { motorista_id, motorista_nome, status, observacao, link_formulario, data_infracao, hora_infracao, numero_ait, motivo, valor_multa, pontuacao, parcelas, placa, local_infracao, data_limite } = req.body;

    db.get('SELECT status, valor_multa, data_infracao, numero_ait, motorista_id, parcelas FROM multas_logistica WHERE id = ?', [req.params.id], (err, oldData) => {
        if (err || !oldData) return res.status(404).json({ error: 'Multa não encontrada' });

        if (oldData.status === 'Indicado' || oldData.status === 'Multa NIC') {
            return res.status(403).json({ error: 'Esta multa já foi enviada ao RH e não pode ser editada.' });
        }

        db.run(
            `UPDATE multas_logistica SET
                motorista_id = COALESCE(?, motorista_id),
                motorista_nome = COALESCE(?, motorista_nome),
                status = COALESCE(?, status),
                observacao = COALESCE(?, observacao),
                link_formulario = COALESCE(?, link_formulario),
                data_infracao = COALESCE(?, data_infracao),
                hora_infracao = COALESCE(?, hora_infracao),
                numero_ait = COALESCE(?, numero_ait),
                motivo = COALESCE(?, motivo),
                valor_multa = COALESCE(?, valor_multa),
                pontuacao = COALESCE(?, pontuacao),
                parcelas = COALESCE(?, parcelas),
                placa = COALESCE(?, placa),
                local_infracao = COALESCE(?, local_infracao),
                data_limite = ?,
                atualizado_em = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [motorista_id || null, motorista_nome || null, status || null, observacao || null, link_formulario || null,
            data_infracao || null, hora_infracao || null, numero_ait || null, motivo || null, valor_multa || null, pontuacao || null, parcelas || null, placa || null, local_infracao || null, data_limite || null,
            req.params.id],
            function (errUpdate) {
                if (errUpdate) return res.status(500).json({ error: errUpdate.message });
                if (this.changes === 0) return res.status(404).json({ error: 'Multa não atualizada' });

                // Automatic Email Trigger
                if (status && (status === 'Indicado' || status === 'Multa NIC')) {
                    const finalMotorista = motorista_id || oldData.motorista_id;
                    const finalValor = valor_multa || oldData.valor_multa;
                    const finalData = data_infracao || oldData.data_infracao;
                    const finalAit = numero_ait || oldData.numero_ait;
                    const finalParcelas = parcelas || oldData.parcelas || 1;

                    notificarRHAuto(finalMotorista, status, finalParcelas, finalValor, finalData, finalAit)
                        .then(() => {
                            res.json({ ok: true, emailEnviado: true });
                        })
                        .catch(errEmail => {
                            res.status(500).json({ error: 'Salvo, mas o e-mail não foi enviado: ' + errEmail.message });
                        });
                } else {
                    res.json({ ok: true });
                }
            }
        );
    });
});

// DELETE /api/logistica/multas/:id
app.delete('/api/logistica/multas/:id', authenticateToken, (req, res) => {
    db.get('SELECT status FROM multas_logistica WHERE id = ?', [req.params.id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Multa não encontrada' });

        if (row.status === 'Indicado' || row.status === 'Multa NIC') {
            return res.status(403).json({ error: 'Esta multa já foi enviada ao RH e não pode ser excluída.' });
        }

        db.run('DELETE FROM multas_logistica WHERE id = ?', [req.params.id], function (errDel) {
            if (errDel) return res.status(500).json({ error: errDel.message });
            res.json({ ok: true });
        });
    });
});

// GET /api/logistica/multas/:id/documento — serve o PDF da multa (armazenado como base64 no banco)
app.get('/api/logistica/multas/:id/documento', (req, res) => {
    const token = req.query.token || (req.headers['authorization'] || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Não autorizado' });
    try {
        const jwt = require('jsonwebtoken');
        jwt.verify(token, SECRET_KEY);
    } catch (e) {
        return res.status(401).json({ error: 'Token inválido' });
    }

    db.get('SELECT documento_base64, documento_nome, documento_path FROM multas_logistica WHERE id = ?', [req.params.id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Multa não encontrada' });

        const nome = row.documento_nome || 'documento_multa.pdf';
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(nome)}"`);
        res.setHeader('Content-Type', 'application/pdf');

        // Tenta servir do base64 salvo no banco
        if (row.documento_base64) {
            const buf = Buffer.from(row.documento_base64, 'base64');
            return res.end(buf);
        }

        // Fallback: tenta servir do disco (registros antigos)
        if (row.documento_path && fs.existsSync(row.documento_path)) {
            return res.sendFile(path.resolve(row.documento_path));
        }

        return res.status(404).json({ error: 'Arquivo não disponível. Faça o upload novamente.' });
    });
});

// MIGRATION: coluna documentos_extras (JSON array de base64)
db.run("ALTER TABLE multas_logistica ADD COLUMN documentos_extras TEXT DEFAULT '[]'", (err) => {
    if (err && !err.message.includes('duplicate column')) console.error('[MIGRATION multas_logistica documentos_extras]', err.message);
});
db.run("ALTER TABLE multas_logistica ADD COLUMN parcelas INTEGER DEFAULT 1", (err) => {
    if (err && !err.message.includes('duplicate column')) console.error('[MIGRATION multas_logistica parcelas]', err.message);
});

// POST /api/logistica/multas/:id/documento-extra — adiciona um documento extra à multa
const multaExtraUpload = require('multer')({ storage: require('multer').memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
app.post('/api/logistica/multas/:id/documento-extra', authenticateToken, multaExtraUpload.single('documento'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    db.get('SELECT documentos_extras FROM multas_logistica WHERE id = ?', [req.params.id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Multa não encontrada' });

        let extras = [];
        try { extras = JSON.parse(row.documentos_extras || '[]'); } catch (_) { }

        const novoDoc = {
            nome: req.file.originalname,
            tipo: req.file.mimetype,
            base64: req.file.buffer.toString('base64'),
            adicionado_em: new Date().toISOString()
        };
        extras.push(novoDoc);

        const extrasJson = JSON.stringify(extras);
        db.run('UPDATE multas_logistica SET documentos_extras = ? WHERE id = ?', [extrasJson, req.params.id], function (err2) {
            if (err2) return res.status(500).json({ error: err2.message });
            // Retorna lista sem o base64 (para não sobrecarregar a resposta)
            res.json({
                ok: true,
                documentos_extras: extras.map((d, i) => ({ nome: d.nome, tipo: d.tipo, idx: i, adicionado_em: d.adicionado_em }))
            });
        });
    });
});

// DELETE /api/logistica/multas/:id/documento-extra/:idx — deleta um documento extra pelo índice
app.delete('/api/logistica/multas/:id/documento-extra/:idx', authenticateToken, (req, res) => {
    db.get('SELECT documentos_extras FROM multas_logistica WHERE id = ?', [req.params.id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Multa não encontrada' });

        let extras = [];
        try { extras = JSON.parse(row.documentos_extras || '[]'); } catch (_) { }

        const idx = parseInt(req.params.idx);
        if (isNaN(idx) || idx < 0 || idx >= extras.length) {
            return res.status(404).json({ error: 'Documento não encontrado' });
        }

        extras.splice(idx, 1);
        const extrasJson = JSON.stringify(extras);

        db.run('UPDATE multas_logistica SET documentos_extras = ? WHERE id = ?', [extrasJson, req.params.id], function (err2) {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({
                ok: true,
                documentos_extras: extras.map((d, i) => ({ nome: d.nome, tipo: d.tipo, idx: i, adicionado_em: d.adicionado_em }))
            });
        });
    });
});

// GET /api/logistica/multas/:id/documento-extra/:idx — serve um documento extra pelo índice
app.get('/api/logistica/multas/:id/documento-extra/:idx', (req, res) => {
    const token = req.query.token || (req.headers['authorization'] || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Não autorizado' });
    try { require('jsonwebtoken').verify(token, SECRET_KEY); } catch (e) { return res.status(401).json({ error: 'Token inválido' }); }

    db.get('SELECT documentos_extras FROM multas_logistica WHERE id = ?', [req.params.id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Multa não encontrada' });
        let extras = [];
        try { extras = JSON.parse(row.documentos_extras || '[]'); } catch (_) { }
        const idx = parseInt(req.params.idx);
        const doc = extras[idx];
        if (!doc || !doc.base64) return res.status(404).json({ error: 'Documento não encontrado' });

        const tipoMime = doc.tipo || 'application/octet-stream';
        res.setHeader('Content-Type', tipoMime);
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.nome || 'documento')}"`);
        res.end(Buffer.from(doc.base64, 'base64'));
    });
});

// GET /api/colaboradores/:id/arquivo/cnh — serve o arquivo de CNH do colaborador
app.get('/api/colaboradores/:id/arquivo/cnh', (req, res) => {
    const token = req.query.token || (req.headers['authorization'] || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Não autorizado' });
    try { require('jsonwebtoken').verify(token, SECRET_KEY); } catch (e) { return res.status(401).json({ error: 'Token inválido' }); }

    // Primeiro busca dados básicos (sempre existem)
    db.get('SELECT id, nome_completo, cnh_numero FROM colaboradores WHERE id = ?', [req.params.id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Colaborador não encontrado.' });

        // Tenta buscar o arquivo de CNH (coluna pode não existir em instâncias antigas)
        db.get('SELECT cnh_arquivo FROM colaboradores WHERE id = ?', [req.params.id], (err2, rowCnh) => {
            const cnh = rowCnh && rowCnh.cnh_arquivo;
            if (!cnh) {
                // Tenta buscar na tabela de documentos (upload via Ficha Cadastral)
                db.get("SELECT file_path, file_name FROM documentos WHERE colaborador_id = ? AND (document_type = 'CNH' OR file_name LIKE '%CNH%') ORDER BY id DESC LIMIT 1", [req.params.id], (err3, rowDoc) => {
                    if (!err3 && rowDoc && rowDoc.file_path && fs.existsSync(rowDoc.file_path)) {
                        return res.download(rowDoc.file_path, rowDoc.file_name || `CNH_${encodeURIComponent(row.nome_completo)}.pdf`);
                    } else {
                        return res.status(404).json({
                            error: `Nenhum arquivo de CNH cadastrado para ${row.nome_completo || 'este colaborador'}. Acesse o Prontuário Digital → Ficha Cadastral para fazer o upload da CNH.`
                        });
                    }
                });
                return;
            }
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="CNH_${encodeURIComponent(row.nome_completo || row.cnh_numero || 'colaborador')}.pdf"`);
            return res.end(Buffer.from(cnh, 'base64'));
        });
    });
});
// ------------------------------------------------------------------------------

// =============================================================================

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
        function (err) {
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
    try { file_name = Buffer.from(file_name, 'latin1').toString('utf8'); } catch (e) { }

    if (tab_name === 'CONTRATOS_AVULSOS' || tab_name === 'CONTRATOS') {
        const uniqueCode = Date.now().toString().slice(-6);
        let safeTab = formatarPasta(document_type || 'Contrato');
        let safeColab = formatarNome(req.body.colaborador_nome || 'Colaborador');
        file_name = `${safeTab}_${safeColab}_${uniqueCode}.pdf`;
    }


    const abasMultiplas = ['Advertências', 'Multas', 'Atestados', 'Boletim de ocorrência', 'Terapia', 'CONTRATOS_AVULSOS', 'CONTRATOS'];
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
                try { fs.unlinkSync(row.file_path); } catch (e) { }
            }

            let setClause = 'file_name = ?, file_path = ?, upload_date = CURRENT_TIMESTAMP, vencimento = ?, atestado_tipo = ?, atestado_inicio = ?, atestado_fim = ?';
            const baseParams = [file_name, file_path, vencimento || null, atestado_tipo || null, atestado_inicio || null, atestado_fim || null];

            if (assinafy_status) {
                setClause += ', assinafy_status = ?';
                baseParams.push(assinafy_status);
            }

            db.run(`UPDATE documentos SET ${setClause} WHERE id = ?`,
                [...baseParams, row.id], function (updateErr) {
                    if (updateErr) return res.status(500).json({ error: updateErr.message });

                    const path = require('path');
                    if (tab_name === 'Fotos' && ['.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(file_path).toLowerCase())) {
                        db.run("UPDATE colaboradores SET foto_path = ? WHERE id = ?", [file_path, colaborador_id]);
                    }

                    const _tipoSimples2 = (document_type || '').split('###')[1] || '';
                    const _isOcorr2 = /ocorr/i.test(_tipoSimples2);
                    const _isVerbal2 = /verbal/i.test(_tipoSimples2);
                    const _podeOneDrive2 = tab_name === 'Advertências'
                        ? (!_isOcorr2 && ((assinafy_status === 'Testemunhas') || (!_isVerbal2 && assinafy_status === 'Assinado')))
                        : (tab_name !== 'CONTRATOS_AVULSOS' || assinafy_status === 'NAO_EXIGE');

                    if (onedrive && _podeOneDrive2) {
                        (async () => {
                            try {
                                const onedriveBasePath = process.env.ONEDRIVE_BASE_PATH || "RH/1.Colaboradores/Sistema";
                                const safeColab = formatarNome(req.body.colaborador_nome || "DESCONHECIDO");
                                const safeTab = tab_name === 'CONTRATOS_AVULSOS' ? 'CONTRATOS' : tabToOneDrivePath(tab_name);
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
                function (insertErr) {
                    if (insertErr) return res.status(500).json({ error: insertErr.message });

                    const path = require('path');
                    if (tab_name === 'Fotos' && ['.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(file_path).toLowerCase())) {
                        db.run("UPDATE colaboradores SET foto_path = ? WHERE id = ?", [file_path, colaborador_id]);
                    }

                    const newDocId = this.lastID;
                    if ((tab_name === 'CONTRATOS_AVULSOS' || tab_name === 'CONTRATOS') && onedrive) {
                        ; (async () => {
                            try {
                                const onedriveBasePath = process.env.ONEDRIVE_BASE_PATH || 'RH/1.Colaboradores/Sistema';
                                const colabNome = req.body.colaborador_nome || '';
                                const safeColab = formatarNome(colabNome) || 'DESCONHECIDO';

                                let targetDir, cloudFileName;
                                if (tab_name === 'CONTRATOS' || tab_name === 'CONTRATOS_AVULSOS') {
                                    // Todos os Contratos na raiz de CONTRATOS, sem subpastas
                                    targetDir = `${onedriveBasePath}/${safeColab}/CONTRATOS`;
                                    cloudFileName = fileNameToStore; // O multer ou fallback já aplica timestamp / cód único
                                }

                                console.log(`[OD-INLINE] ${tab_name} => ${targetDir}/${cloudFileName}`);
                                await onedrive.ensurePath(`${onedriveBasePath}/${safeColab}`);
                                await onedrive.ensurePath(`${onedriveBasePath}/${safeColab}/CONTRATOS`);
                                await onedrive.ensurePath(targetDir);
                                const fileBuffer = require('fs').readFileSync(file_path);
                                await onedrive.uploadToOneDrive(targetDir, cloudFileName, fileBuffer);
                                console.log(`[OD-INLINE] Upload OK: ${cloudFileName}`);
                            } catch (odErr) {
                                console.error('[OD-INLINE] Falha OneDrive:', odErr.message);
                            }
                        })();
                    } else {
                        const _tipoSimples = (document_type || '').split('###')[1] || '';
                        const _isOcorr = /ocorr/i.test(_tipoSimples);
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

    db.run('UPDATE documentos SET vencimento = ? WHERE id = ?', [vencimento, id], function (err) {
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
            try { fs.unlinkSync(row.file_path); } catch (e) { }
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
                                        try { finalBuf = await signPdfPfx.assinarPDF(finalBuf, { motivo: 'Assinado eletronicamente pela empresa', nome: 'America Rental Equipamentos Ltda' }); } catch (e) { console.error('PFX PROXY ERR:', e.message); try { db.run("INSERT INTO system_logs (msg) VALUES (?)", ['PFX PROXY ERR ' + String(e.message)]); } catch (z) { } }
                                    }
                                    res.setHeader('Content-Type', 'application/pdf');
                                    return res.send(finalBuf);
                                }
                            }
                        } catch (err) { }
                    }
                }
            } catch (e) { console.warn('Proxy Assinafy erro:', e.message); }
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
                                    } catch (e) { console.error('PFX PROXY ERR:', e.message); try { db.run("INSERT INTO system_logs (msg) VALUES (?)", ['PFX PROXY ERR ' + String(e.message)]); } catch (z) { } }
                                    res.setHeader('Content-Type', 'application/pdf');
                                    return res.send(finalBuf);
                                }
                            }
                        } catch (err) { }
                    }
                }
            } catch (e) { console.warn('Proxy Assinafy erro:', e.message); }
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
    const loggedUser = req.user ? (req.user.username || req.user.nome || 'UNKNOWN') : 'SYSTEM';
    db.run("INSERT INTO cargos (nome, documentos_obrigatorios, departamento) VALUES (?, ?, ?)",
        [nome, documentos_obrigatorios || "", departamento || ""], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: `Já existe um cargo com o nome "${nome}".` });
                }
                return res.status(400).json({ error: err.message });
            }
            const newId = this.lastID;
            db.run(`INSERT INTO auditoria (usuario, programa, campo, conteudo_anterior, conteudo_atual, registro_id) VALUES (?, ?, ?, ?, ?, ?)`,
                [loggedUser, 'Cargos', 'Inclusão', '', nome, newId]);
            res.status(201).json({ id: newId, nome });
        });
});

app.put('/api/cargos/:id', authenticateToken, (req, res) => {
    const { nome, documentos_obrigatorios, departamento } = req.body;
    const loggedUser = req.user ? (req.user.username || req.user.nome || 'UNKNOWN') : 'SYSTEM';
    console.log(`Recebida alteração para cargo ${req.params.id}:`, { nome, documentos_obrigatorios, departamento });

    db.get("SELECT * FROM cargos WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        let query = "UPDATE cargos SET documentos_obrigatorios = ?, departamento = ?";
        let params = [documentos_obrigatorios || "", departamento || ""];

        const nomeMotorista = row && row.nome.trim().toUpperCase() === 'MOTORISTA';
        if (!nomeMotorista) {
            query += ", nome = ?";
            params.push(nome.trim());
        }

        query += " WHERE id = ?";
        params.push(req.params.id);

        console.log("Executando query cargo:", query, params);

        db.run(query, params, function (updateErr) {
            if (updateErr) {
                console.error("Erro no UPDATE cargo:", updateErr);
                return res.status(500).json({ error: updateErr.message });
            }
            console.log("Cargo atualizado no banco. Rows affected:", this.changes);

            // Auditoria: registrar campos alterados
            const changes = [];
            if (row && !nomeMotorista && row.nome !== nome.trim()) {
                changes.push({ campo: 'Nome do Cargo', old: row.nome, new: nome.trim() });
            }
            if (row && row.departamento !== (departamento || '')) {
                changes.push({ campo: 'Departamento', old: row.departamento || '', new: departamento || '' });
            }
            if (row && row.documentos_obrigatorios !== (documentos_obrigatorios || '')) {
                changes.push({ campo: 'Documentos Obrigatórios', old: row.documentos_obrigatorios || '', new: documentos_obrigatorios || '' });
            }
            if (changes.length === 0) {
                changes.push({ campo: 'Atualização', old: '', new: nome || (row && row.nome) || '' });
            }
            changes.forEach(c => {
                db.run(`INSERT INTO auditoria (usuario, programa, campo, conteudo_anterior, conteudo_atual, registro_id) VALUES (?, ?, ?, ?, ?, ?)`,
                    [loggedUser, 'Cargos', c.campo, c.old, c.new, req.params.id]);
            });

            res.json({ message: 'Cargo atualizado com sucesso' });
        });
    });
});

app.delete('/api/cargos/:id', authenticateToken, (req, res) => {
    const loggedUser = req.user ? (req.user.username || req.user.nome || 'UNKNOWN') : 'SYSTEM';
    db.get("SELECT nome FROM cargos WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Cargo não encontrado.' });
        if (row.nome.trim().toUpperCase() === 'MOTORISTA') {
            return res.status(403).json({ error: 'O cargo Motorista é fixo e não pode ser apagado do sistema.' });
        }
        // Verificar se algum colaborador usa este cargo
        db.get("SELECT COUNT(*) as total FROM colaboradores WHERE LOWER(TRIM(cargo)) = LOWER(TRIM(?))", [row.nome], (err2, count) => {
            if (err2) return res.status(500).json({ error: err2.message });
            if (count && count.total > 0) {
                return res.status(409).json({ error: `Não é possível excluir o cargo "${row.nome}" pois há ${count.total} colaborador(es) cadastrado(s) com ele.` });
            }
            db.serialize(() => {
                db.run("INSERT OR IGNORE INTO cargos_excluidos (nome) VALUES (?)", [row.nome]);
                db.run("DELETE FROM cargo_documentos WHERE cargo_id = ?", [req.params.id]);
                db.run("DELETE FROM cargos WHERE id = ?", [req.params.id], function (delErr) {
                    if (delErr) return res.status(500).json({ error: delErr.message });
                    db.run(`INSERT INTO auditoria (usuario, programa, campo, conteudo_anterior, conteudo_atual, registro_id) VALUES (?, ?, ?, ?, ?, ?)`,
                        [loggedUser, 'Cargos', 'Exclusão', row.nome, '', req.params.id]);
                    res.json({ message: 'Cargo removido permanentemente.' });
                });
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
    const loggedUser = req.user ? (req.user.username || req.user.nome || 'UNKNOWN') : 'SYSTEM';
    if (!documento) return res.status(400).json({ error: 'documento obrigatório' });
    db.run("INSERT OR IGNORE INTO cargo_documentos (cargo_id, documento) VALUES (?, ?)",
        [req.params.id, documento], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes > 0) {
                db.run(`INSERT INTO auditoria (usuario, programa, campo, conteudo_anterior, conteudo_atual, registro_id) VALUES (?, ?, ?, ?, ?, ?)`,
                    [loggedUser, 'Cargos', 'Documento Adicionado', '', documento, req.params.id]);
            }
            res.json({ ok: true, added: this.changes > 0 });
        });
});

// Remover um documento de um cargo
app.delete('/api/cargos/:id/documentos', authenticateToken, (req, res) => {
    const { documento } = req.body;
    const loggedUser = req.user ? (req.user.username || req.user.nome || 'UNKNOWN') : 'SYSTEM';
    if (!documento) return res.status(400).json({ error: 'documento obrigatório' });
    db.run("DELETE FROM cargo_documentos WHERE cargo_id = ? AND documento = ?",
        [req.params.id, documento], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes > 0) {
                db.run(`INSERT INTO auditoria (usuario, programa, campo, conteudo_anterior, conteudo_atual, registro_id) VALUES (?, ?, ?, ?, ?, ?)`,
                    [loggedUser, 'Cargos', 'Documento Removido', documento, '', req.params.id]);
            }
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
    const { nome, tipo, responsavel_id, responsavel_nome } = req.body;
    db.run("INSERT INTO departamentos (nome, tipo, responsavel_id, responsavel_nome) VALUES (?, ?, ?, ?)", [nome, tipo || 'Operacional', responsavel_id || null, responsavel_nome || null], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: `Já existe um departamento com o nome "${nome}".` });
            }
            return res.status(400).json({ error: err.message });
        }
        res.status(201).json({ id: this.lastID, nome, tipo: tipo || 'Operacional', responsavel_id: responsavel_id || null, responsavel_nome: responsavel_nome || null });
    });
});

app.put('/api/departamentos/:id', authenticateToken, (req, res) => {
    const { nome, tipo, responsavel_id, responsavel_nome } = req.body;
    db.run("UPDATE departamentos SET nome = ?, tipo = ?, responsavel_id = ?, responsavel_nome = ? WHERE id = ?", [nome.trim(), tipo || 'Operacional', responsavel_id || null, responsavel_nome || null, req.params.id], function (updateErr) {
        if (updateErr) return res.status(500).json({ error: updateErr.message });
        res.json({ message: 'Departamento atualizado com sucesso' });
    });
});

app.delete('/api/departamentos/:id', authenticateToken, (req, res) => {
    db.get("SELECT nome FROM departamentos WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Departamento não encontrado.' });
        // Verificar se algum colaborador está neste departamento
        db.get("SELECT COUNT(*) as total FROM colaboradores WHERE LOWER(TRIM(departamento)) = LOWER(TRIM(?))", [row.nome], (err2, count) => {
            if (err2) return res.status(500).json({ error: err2.message });
            if (count && count.total > 0) {
                return res.status(409).json({ error: `Não é possível excluir o departamento "${row.nome}" pois há ${count.total} colaborador(es) cadastrado(s) nele.` });
            }
            // Registra na blacklist para que o seed nao recrie
            db.run("INSERT OR IGNORE INTO departamentos_excluidos (nome) VALUES (?)", [row.nome]);
            db.run("DELETE FROM departamentos WHERE id = ?", [req.params.id], function (delErr) {
                if (delErr) return res.status(500).json({ error: delErr.message });
                res.json({ message: 'Departamento removido permanentemente.' });
            });
        });
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
    const loggedUser = req.user ? (req.user.username || req.user.nome || 'UNKNOWN') : 'SYSTEM';
    db.run(`INSERT INTO cursos_faculdade (nome_curso, instituicao, tempo_curso, valor_mensalidade, data_inicio, data_termino_prevista) 
            VALUES (?, ?, ?, ?, ?, ?)`,
        [nome_curso, instituicao, tempo_curso, valor_mensalidade || 0, data_inicio, data_termino_prevista],
        function (err) {
            if (err) return res.status(400).json({ error: err.message });
            const newId = this.lastID;
            db.run(`INSERT INTO auditoria (usuario, programa, campo, conteudo_anterior, conteudo_atual, registro_id) VALUES (?, ?, ?, ?, ?, ?)`,
                [loggedUser, 'Faculdade', 'Inclusão', '', nome_curso, newId]);
            res.status(201).json({ id: newId, ...req.body });
        }
    );
});

app.put('/api/cursos-faculdade/:id', authenticateToken, (req, res) => {
    const { nome_curso, instituicao, tempo_curso, valor_mensalidade, data_inicio, data_termino_prevista } = req.body;
    const loggedUser = req.user ? (req.user.username || req.user.nome || 'UNKNOWN') : 'SYSTEM';
    const id = req.params.id;

    db.get('SELECT * FROM cursos_faculdade WHERE id = ?', [id], (err, oldRow) => {
        if (err || !oldRow) return res.status(500).json({ error: err ? err.message : 'Not found' });

        db.run(`UPDATE cursos_faculdade SET nome_curso = ?, instituicao = ?, tempo_curso = ?, valor_mensalidade = ?, data_inicio = ?, data_termino_prevista = ? 
                WHERE id = ?`,
            [nome_curso, instituicao, tempo_curso, valor_mensalidade || 0, data_inicio, data_termino_prevista, id],
            function (err2) {
                if (err2) return res.status(500).json({ error: err2.message });

                const changes = [];
                if (oldRow.nome_curso !== nome_curso) changes.push({ campo: 'Nome do Curso', old: oldRow.nome_curso, new: nome_curso });
                if (oldRow.instituicao !== instituicao) changes.push({ campo: 'Instituição', old: oldRow.instituicao, new: instituicao });
                if (String(oldRow.tempo_curso) !== String(tempo_curso)) changes.push({ campo: 'Tempo de Curso (meses)', old: String(oldRow.tempo_curso), new: String(tempo_curso) });
                if (String(oldRow.valor_mensalidade) !== String(valor_mensalidade || 0)) changes.push({ campo: 'Valor Mensalidade', old: String(oldRow.valor_mensalidade), new: String(valor_mensalidade || 0) });
                if (oldRow.data_inicio !== data_inicio) changes.push({ campo: 'Data Início', old: oldRow.data_inicio || '', new: data_inicio || '' });
                if (oldRow.data_termino_prevista !== data_termino_prevista) changes.push({ campo: 'Data Término Prevista', old: oldRow.data_termino_prevista || '', new: data_termino_prevista || '' });

                if (changes.length === 0) changes.push({ campo: 'Atualização', old: '', new: nome_curso });

                changes.forEach(c => {
                    db.run(`INSERT INTO auditoria (usuario, programa, campo, conteudo_anterior, conteudo_atual, registro_id) VALUES (?, ?, ?, ?, ?, ?)`,
                        [loggedUser, 'Faculdade', c.campo, c.old || '', c.new || '', id]);
                });

                res.json({ message: 'Curso atualizado com sucesso' });
            }
        );
    });
});

app.delete('/api/cursos-faculdade/:id', authenticateToken, (req, res) => {
    const loggedUser = req.user ? (req.user.username || req.user.nome || 'UNKNOWN') : 'SYSTEM';
    db.get('SELECT nome_curso FROM cursos_faculdade WHERE id = ?', [req.params.id], (err, row) => {
        db.run("DELETE FROM cursos_faculdade WHERE id = ?", [req.params.id], function (err2) {
            if (err2) return res.status(500).json({ error: err2.message });
            if (row) {
                db.run(`INSERT INTO auditoria (usuario, programa, campo, conteudo_anterior, conteudo_atual, registro_id) VALUES (?, ?, ?, ?, ?, ?)`,
                    [loggedUser, 'Faculdade', 'Exclusão', row.nome_curso, '', req.params.id]);
            }
            res.json({ message: 'Curso removido' });
        });
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
    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const mesesCap = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

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
        SALARIO: colaborador.salario ? `R$ ${parseFloat(colaborador.salario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '---',
        CHAVES: '',
        INSTITUICAO: '---', CURSO: '---', DURACAO: '---', MENSALIDADE: '---'
    };

    let conteudo = gerador.conteudo || '';
    Object.keys(mapping).forEach(key => {
        conteudo = conteudo.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), mapping[key]);
    });

    // Substituir campo texto de data Guarulhos por data real
    const dataFormatada = `Guarulhos, ${String(dataAtual.getDate()).padStart(2, '0')} de ${meses[dataAtual.getMonth()]} de ${dataAtual.getFullYear()}.`;
    conteudo = conteudo
        .replace(/Guarulhos,\s*_{3,}.*?de\s*_{3,}.*?de\s*202_{3,}\.?/g, dataFormatada)
        .replace(/AMERICA RENTAL EQUIPAMENTOS LTDA/g, '<b>AMERICA RENTAL EQUIPAMENTOS LTDA</b>');

    // Usar logo em Base64 para garantir que apareça no PDF gerado no servidor (igual ao sinistro)
    const logoB64 = getLogoBase64DataUri();
    const logoSrc = logoB64 || `${baseUrl}/assets/logo-header.png`;

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #1e293b; }
  @page { size: A4; margin: 0; }
  .logo-banner { width: 100%; display: block; margin: 0; padding: 0; line-height: 0; }
  .logo-banner img { width: 100%; display: block; margin: 0; padding: 0; }
  .content-wrapper { padding: 20px 60px 30px 60px; }
  h1.doc-title { text-align: center; font-size: 13pt; text-transform: uppercase; margin: 10px 0 6px; }
  .colab-header { margin-top: 8px; font-size: 10pt; }
  .colab-box { border: 1px solid #000; padding: 8px; margin-top: 6px; font-size: 9pt; line-height: 1.5; }
  .colab-row { display: flex; gap: 2rem; flex-wrap: wrap; }
  .doc-body { margin-top: 12px; text-align: justify; font-size: 10pt; line-height: 1.5; }
  .doc-body p { margin: 2px 0; }
  .doc-body li { margin: 1px 0; }
  .footer { margin-top: 18px; }
  .footer-date { font-weight: 700; font-size: 10pt; margin-bottom: 20px; }
  .sigs { display: flex; justify-content: space-between; margin-top: 30px; flex-wrap: wrap; }
  .sig-block { text-align: center; width: 45%; }
  .sig-line { border-top: 1.5px solid #000; padding-top: 4px; font-weight: 700; font-size: 9pt; }
  .sig-sub { font-size: 8pt; color: #555; }
</style>
</head>
<body>
  <div class="logo-banner"><img src="${logoSrc}" alt="Logo America Rental"></div>

  <div class="content-wrapper">

    <div class="colab-box">
      <div style="font-weight:700; font-size:8pt; margin-bottom:4px;">DADOS COLABORADOR:</div>
      <div class="colab-row">
        <span>NOME: <b>${colaborador.nome_completo}</b></span>
        <span>CPF: <b>${colaborador.cpf || '---'}</b></span>
      </div>
      <div>ENDEREÇO: ${colaborador.endereco || '---'}</div>
      <div>CARGO: ${colaborador.cargo || '---'}</div>
      <div class="colab-row">
        <span>CELULAR: ${colaborador.telefone || '---'}</span>
        <span>E-MAIL: ${colaborador.email || '---'}</span>
      </div>
    </div>

    <div class="doc-body">${conteudo}</div>

    <div class="footer">
      <div class="footer-date">${dataFormatada}</div>
    </div>
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
            {
                format: 'A4', margin: { top: '0', bottom: '0', left: '0', right: '0' },
                printBackground: true, args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        );

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(gerador.nome)}.pdf"`);
        res.send(pdfBuffer);
    } catch (e) {
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
                {
                    format: 'A4',
                    margin: { top: '0', bottom: '0', left: '0', right: '0' },
                    printBackground: true,
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                }
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
                    function (err) { err ? reject(err) : resolve(); })
            );
        } else {
            docId = await new Promise((resolve, reject) =>
                db.run(
                    `INSERT INTO documentos (colaborador_id, tab_name, document_type, file_path, file_name, assinafy_status) VALUES (?, 'CONTRATOS', ?, ?, ?, 'Pendente')`,
                    [colaborador_id, gerador.nome, filePath, path.basename(filePath)],
                    function (err) { err ? reject(err) : resolve(this.lastID); }
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
                        } catch (err) { return res.redirect(signedUrl); }
                    }
                }
            } catch (e) {
                console.warn('[DOWNLOAD-ADMISSAO] Falha proxy Assinafy:', e.message);
            }
        }

        return res.status(404).json({ error: 'Arquivo assinado não encontrado no servidor.' });
    } catch (e) {
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
                const opts = {
                    hostname: 'api.assinafy.com.br', path: `/v1/documents/${doc.assinafy_id}`, method: 'GET',
                    headers: { 'X-Api-Key': 'AxaT-FiXBckHqEYV0s_MtUhLF3pReRz3dX4zVpC173vmjDwzLGHYtDJuQje4-4Pd', 'Accept': 'application/json' }
                };
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
            local: 'Brasil',
            nome: 'America Rental Equipamentos Ltda'
        });

        // Salvar PDF final com ambas as assinaturas
        const certPath = (localPath || path.join(BASE_PATH, `_admissao_${id}`)).replace(/(_assinado)?\.pdf$/, '_cert_empresa.pdf');
        fs.writeFileSync(certPath, pdfAssinado);
        console.log(`[CERT-POST] ? PDF com certificado salvo: ${certPath} (${pdfAssinado.length} bytes)`);

        // Atualizar banco
        db.run(`UPDATE admissao_assinaturas SET signed_file_path = ?, certificado_assinado_em = CURRENT_TIMESTAMP WHERE id = ?`,
            [certPath, id]);

        res.json({ ok: true, mensagem: 'Certificado digital aplicado com sucesso! Ambas as assinaturas agora aparecem no gov.br.', tamanho: pdfAssinado.length });
    } catch (e) {
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
        [status, status, assinafy_id], function (err) {
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
    db.run("ALTER TABLE geradores ADD COLUMN tipo TEXT DEFAULT 'html'", () => { });
    db.run("ALTER TABLE geradores ADD COLUMN arquivo_pdf TEXT DEFAULT NULL", () => { });
});
// MIGRATION: coluna para rastrear quando o certificado digital A1 foi aplicado
db.run("ALTER TABLE admissao_assinaturas ADD COLUMN certificado_assinado_em TEXT DEFAULT NULL", () => { });
// MIGRATION: campo 'avisado previamente' para faltas
db.run("ALTER TABLE faltas ADD COLUMN avisado_previamente TEXT DEFAULT 'Não'", () => { });

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
        [nome, conteudo, variaveis], function (err) {
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
            [nome, conteudo, variaveis, req.params.id], function (err2) {
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
            try { fs.unlinkSync(row.arquivo_pdf); } catch (e) { }
        }
        db.run("DELETE FROM geradores WHERE id = ?", [req.params.id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            // Registra na lista de excluidos para que o seed nao recrie ao reiniciar
            db.run("CREATE TABLE IF NOT EXISTS geradores_excluidos (nome TEXT PRIMARY KEY)", () => {
                db.run("INSERT OR IGNORE INTO geradores_excluidos (nome) VALUES (?)", [originalName]);
            });
            res.json({ message: 'Gerador removido' });
        });
    });
});

// Upload de PDF externo como gerador
const geradorPdfStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(BASE_PATH, '_geradores_pdf');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: function (req, file, cb) {
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
        [nome, arquivo_pdf], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, nome, tipo: 'pdf', arquivo_pdf });
        });
});

app.put('/api/geradores/:id/replace-pdf', authenticateToken, uploadGeradorPdf.single('pdf'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    // Remove o arquivo antigo
    db.get("SELECT arquivo_pdf FROM geradores WHERE id = ?", [req.params.id], (err, row) => {
        if (row && row.arquivo_pdf && fs.existsSync(row.arquivo_pdf)) {
            try { fs.unlinkSync(row.arquivo_pdf); } catch (e) { }
        }
        db.run("UPDATE geradores SET arquivo_pdf = ?, nome = ? WHERE id = ?",
            [req.file.path, req.body.nome || row?.nome || 'PDF', req.params.id], function (err2) {
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
                    'SALARIO': colaborador.salario ? `R$ ${parseFloat(colaborador.salario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '---',
                    'CHAVES': listaChaves || 'Nenhuma chave cadastrada',
                    // Variáveis de Faculdade
                    'INSTITUICAO': colaborador.f_inst || '---',
                    'CURSO': colaborador.f_nome || '---',
                    'DURACAO': colaborador.f_tempo || '---',
                    'MENSALIDADE': colaborador.f_valor ? `R$ ${parseFloat(colaborador.f_valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '---'
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
    db.run("INSERT INTO chaves (nome_chave) VALUES (?)", [nome_chave], function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.status(201).json({ id: this.lastID, nome_chave });
    });
});

app.put('/api/chaves/:id', authenticateToken, (req, res) => {
    const { nome_chave } = req.body;
    db.run("UPDATE chaves SET nome_chave = ? WHERE id = ?", [nome_chave, req.params.id], function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'Chave atualizada' });
    });
});

app.delete('/api/chaves/:id', authenticateToken, (req, res) => {
    db.get('SELECT 1 FROM colaboradores WHERE id IN (SELECT colaborador_id FROM colaborador_chaves WHERE chave_id = ?)', [req.params.id], (err, row) => {
        // Por enquanto não temos a tabela de relacionamento, então vamos deletar direto.
        // Se no futuro houver chaves vinculadas, podemos avisar.
        db.run("DELETE FROM chaves WHERE id = ?", [req.params.id], function (err) {
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
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, colaborador_id, data_falta, turno: turno || 'Dia todo', observacao: observacao || '', avisado_previamente: avisado_previamente || 'Não' });
        }
    );
});

app.delete('/api/faltas/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM faltas WHERE id = ?', [req.params.id], function (err) {
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
    `, [colaborador_id, tipo, ano, trimestre, (respostas_json || '{}')], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, changes: this.changes });
    });
});

app.delete('/api/avaliacoes/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM avaliacoes WHERE id = ?', [req.params.id], function (err) {
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
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: 'Template criado com sucesso.' });
        }
    );
});

app.put('/api/avaliacao-templates/:id', authenticateToken, (req, res) => {
    const { nome, tipo, grupo_key, categorias_json } = req.body;
    db.run('UPDATE avaliacao_templates SET nome=?, tipo=?, grupo_key=?, categorias_json=? WHERE id=?',
        [nome, tipo, grupo_key, typeof categorias_json === 'string' ? categorias_json : JSON.stringify(categorias_json), req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ changes: this.changes });
        }
    );
});

app.delete('/api/avaliacao-templates/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM avaliacao_templates WHERE id=?', [req.params.id], function (err) {
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

        sendMailHelper(mailOptions, (error, info) => {
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
        await sendMailHelper({
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
 * Envio de Boleto de Faculdade para o Financeiro
 */
app.post('/api/send-boleto-financeiro', authenticateToken, async (req, res) => {
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

        // Data do documento
        const dataDoc = doc.upload_date
            ? new Date(doc.upload_date).toLocaleDateString('pt-BR')
            : new Date().toLocaleDateString('pt-BR');

        const md = String(doc.month || '0').padStart(2, '0');
        const yyyy = doc.year || new Date().getFullYear();

        // Arquivo em anexo
        const attachments = [];
        const activeFilePath = path.resolve(doc.file_path);
        if (fs.existsSync(activeFilePath)) {
            const nomeNorm = (colab.nome_completo || 'Colaborador')
                .toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]+/g, '_');
            attachments.push({ filename: `Boleto_Faculdade_${md}-${yyyy}_${nomeNorm}.pdf`, path: activeFilePath, contentType: 'application/pdf' });
        } else {
            return res.status(404).json({ sucesso: false, error: 'Arquivo PDF do boleto não encontrado no servidor.' });
        }

        const logoPath = path.join(__dirname, '..', 'frontend', 'assets', 'logo-header.png');
        attachments.unshift({ filename: 'logo.png', path: logoPath, cid: 'empresa-logo' });

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius:8px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="cid:empresa-logo" style="max-height: 80px; max-width:100%;">
                </div>
                <h2 style="color: #16a34a; border-bottom: 2px solid #16a34a; padding-bottom: 10px;">📉 Boleto Faculdade</h2>
                <p>Informamos que o colaborador anexou o boleto da <strong>Faculdade</strong> referente à competência ${md}/${yyyy}.</p>

                <div style="background:#f0fdf4; padding:15px; border-radius:8px; margin:20px 0; border: 1px solid #bbf7d0;">
                    <p style="margin:4px 0;"><strong>Colaborador:</strong> ${colab.nome_completo}</p>
                    <p style="margin:4px 0;"><strong>CPF:</strong> ${colab.cpf || '-'}</p>
                    <p style="margin:4px 0;"><strong>Competência:</strong> ${md}/${yyyy}</p>
                    <p style="margin:4px 0;"><strong>Data do upload:</strong> ${dataDoc}</p>
                </div>

                <div style="background:#fff3cd; border:1px solid #ffc107; padding:15px; border-radius:8px; margin:20px 0; text-align:center;">
                    <p style="margin:0; color:#856404; font-weight:700; font-size:1rem;">
                        Favor verificar as informações em anexo e prosseguir com a programação de pagamento deste título.
                    </p>
                </div>

                ${attachments.length > 1 ? '<p>O documento em PDF está em anexo neste e-mail.</p>' : ''}
                <p style="margin-top:30px; font-size:0.9em; color:#7f8c8d;">Atenciosamente,<br>Equipe de RH — América Rental</p>
            </div>
        `;

        const transporter = nodemailer.createTransport(SMTP_CONFIG);

        await sendMailHelper({
            from: `"América Rental RH" <${SMTP_CONFIG.auth.user}>`,
            to: email_to,
            subject: `📉 Boleto Faculdade - ${colab.nome_completo}`,
            html: htmlContent,
            attachments: attachments
        });

        res.json({ sucesso: true, message: 'Boleto enviado ao financeiro com sucesso.' });
    } catch (err) {
        console.error('[ERRO BOLETO FINANCEIRO]', err);
        res.status(500).json({ sucesso: false, error: 'Erro ao enviar boleto: ' + err.message });
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
        await sendMailHelper({
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
        db.run(`UPDATE admissao_assinaturas SET assinafy_url = ? WHERE assinafy_id = ?`, [link, assinafyId], function (err) {
            if (this.changes > 0) return resolve(true);
            // Se nao mudou, tenta em documentos
            db.run(`UPDATE documentos SET assinafy_url = ? WHERE assinafy_id = ?`, [link, assinafyId], function () {
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
                        }).on('error', (err) => { fs.unlink(finalPath, () => { }); reject(err); });
                    } else if (response.statusCode >= 400) {
                        fs.unlink(finalPath, () => { });
                        resolve(); // ignora o erro para não travar o sync
                    } else {
                        response.pipe(file);
                        file.on('finish', () => { file.close(); resolve(); });
                    }
                }).on('error', (err) => { fs.unlink(finalPath, () => { }); reject(err); });
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
                    const safeTab = tabToOneDrivePath(doc.tab_name || 'DOCUMENTOS');
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
                    resp.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch (e) { reject(e); } });
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
        const safeTab = tabToOneDrivePath(doc.tab_name || 'DOCUMENTOS');
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

const os = require('os');
const uploadDB = multer({ dest: os.tmpdir() });
const _dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'data', 'hr_system_v2.sqlite');

app.get('/api/maintenance/download-db', authenticateToken, (req, res) => {
    const isDiretoria = req.user?.role === 'Diretoria' || req.user?.role === 'Administrador' || req.user?.departamento === 'Diretoria' || (req.user?.grupo_nome && req.user.grupo_nome.toLowerCase() === 'diretoria') || req.user?.username === 'diretoria.1';
    if (!isDiretoria) return res.status(403).json({ error: 'Acesso negado' });

    if (fs.existsSync(_dbPath)) {
        res.download(_dbPath, 'hr_system_v2.sqlite');
    } else {
        res.status(404).json({ error: 'DB não encontrado em: ' + _dbPath });
    }
});

app.post('/api/maintenance/upload-db', authenticateToken, uploadDB.single('database'), (req, res) => {
    const isDiretoria = req.user?.role === 'Diretoria' || req.user?.role === 'Administrador' || req.user?.departamento === 'Diretoria' || (req.user?.grupo_nome && req.user.grupo_nome.toLowerCase() === 'diretoria') || req.user?.username === 'diretoria.1';
    if (!isDiretoria) return res.status(403).json({ error: 'Acesso negado' });
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

    try {
        fs.copyFileSync(req.file.path, _dbPath);
        fs.unlinkSync(req.file.path);
        res.json({ message: 'DB importado com sucesso. Reiniciando...' });

        setTimeout(() => {
            console.log('Forçando reinicialização devido a upload de DB...');
            process.exit(1);
        }, 1000);
    } catch (e) {
        res.status(500).json({ error: 'Erro ao substituir DB: ' + e.message });
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
            } catch (e) {
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

// Rota explicita para pagina publica de avaliacao (sem autenticacao)
app.get('/avaliacao-publica.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/avaliacao-publica.html'));
});

// --- SERVIR ARQUIVOS ESTÁTICOS ---
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
    const loggedUser = req.user ? (req.user.username || req.user.nome || 'UNKNOWN') : 'SYSTEM';

    db.get('SELECT * FROM epi_templates WHERE id=?', [templateId], (err, old) => {
        if (err) return res.status(500).json({ error: err.message });

        // Preservar a categoria original — nunca mudar via edição de nome/lista
        const categoriaOriginal = old ? (old.categoria || 'Outros') : 'Outros';

        db.run(
            `UPDATE epi_templates SET grupo=?, departamentos_json=?, epis_json=?, termo_texto=?, rodape_texto=?, categoria=COALESCE(categoria, ?), updated_at=CURRENT_TIMESTAMP WHERE id=?`,
            [grupo, JSON.stringify(departamentos || []), JSON.stringify(epis || []), termo_texto, rodape_texto, categoriaOriginal, templateId],
            function (err2) {
                if (err2) return res.status(500).json({ error: err2.message });

                const oldEpis = old ? old.epis_json : '[]';
                const newEpis = JSON.stringify(epis || []);
                const changed =
                    (old && old.grupo !== grupo) ||
                    oldEpis !== newEpis ||
                    (old && old.termo_texto !== termo_texto) ||
                    (old && old.rodape_texto !== rodape_texto);

                // === AUDITORIA ===
                const auditChanges = [];
                if (old && old.grupo !== grupo) auditChanges.push({ campo: 'Nome do Grupo', old: old.grupo || '', new: grupo || '' });
                if (oldEpis !== newEpis) auditChanges.push({ campo: 'Lista de EPIs', old: '[Lista anterior]', new: '[Lista atualizada]' });
                if (old && old.termo_texto !== termo_texto) auditChanges.push({ campo: 'Termo de Responsabilidade', old: '[Anterior]', new: '[Atualizado]' });
                if (old && old.rodape_texto !== rodape_texto) auditChanges.push({ campo: 'Rodapé', old: old.rodape_texto || '', new: rodape_texto || '' });
                if (auditChanges.length === 0 && changed) auditChanges.push({ campo: 'Atualização', old: '', new: grupo || '' });
                auditChanges.forEach(c => {
                    db.run(`INSERT INTO auditoria (usuario, programa, campo, conteudo_anterior, conteudo_atual, registro_id) VALUES (?, ?, ?, ?, ?, ?)`,
                        [loggedUser, 'EPI', c.campo, c.old, c.new, templateId]);
                });

                if (changed) {
                    const motivo = auditChanges.map(c => c.campo);

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
        function (err) {
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
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// DELETE: excluir ficha (se necessário)
app.delete('/api/epi-fichas/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM colaborador_epi_fichas WHERE id=?', [req.params.id], function (err) {
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
        function (err) {
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
    } catch (err) {
        console.error('[EPI save-onedrive]', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/epi-templates', authenticateToken, (req, res) => {
    const { grupo, departamentos, epis, termo_texto, rodape_texto, categoria } = req.body;
    const cat = categoria || 'Outros';
    const loggedUser = req.user ? (req.user.username || req.user.nome || 'UNKNOWN') : 'SYSTEM';
    db.run(
        `INSERT INTO epi_templates (grupo, categoria, departamentos_json, epis_json, termo_texto, rodape_texto) VALUES (?,?,?,?,?,?)`,
        [grupo, cat, JSON.stringify(departamentos || []), JSON.stringify(epis || []), termo_texto, rodape_texto],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            const newId = this.lastID;
            db.run(`INSERT INTO auditoria (usuario, programa, campo, conteudo_anterior, conteudo_atual, registro_id) VALUES (?, ?, ?, ?, ?, ?)`,
                [loggedUser, 'EPI', 'Inclusão de Grupo', '', grupo, newId]);
            res.json({ id: newId });
        }
    );
});

app.delete('/api/epi-templates/:id', authenticateToken, (req, res) => {
    const loggedUser = req.user ? (req.user.username || req.user.nome || 'UNKNOWN') : 'SYSTEM';
    db.get('SELECT grupo FROM epi_templates WHERE id=?', [req.params.id], (err, row) => {
        db.run('DELETE FROM epi_templates WHERE id=?', [req.params.id], function (err2) {
            if (err2) return res.status(500).json({ error: err2.message });
            if (row) {
                db.run(`INSERT INTO auditoria (usuario, programa, campo, conteudo_anterior, conteudo_atual, registro_id) VALUES (?, ?, ?, ?, ?, ?)`,
                    [loggedUser, 'EPI', 'Exclusão de Grupo', row.grupo || '', '', req.params.id]);
            }
            res.json({ success: true });
        });
    });
});


// ============================================================
// ROTAS: USUÁRIOS E GRUPOS DE PERMISSÃO
// ============================================================

// --- USUÁRIOS ---
app.get('/api/usuarios', authenticateToken, (req, res) => {
    db.all(`SELECT u.id, u.username, u.nome, u.email, u.role, u.departamento, u.grupo_permissao_id, u.ativo,
                   g.nome as grupo_nome,
                   c.foto_base64 as foto_colaborador
            FROM usuarios u
            LEFT JOIN grupos_permissao g ON g.id = u.grupo_permissao_id
            LEFT JOIN colaboradores c ON c.nome_completo = u.nome
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
        function (err) {
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
    if (nome !== undefined) { updates.push('nome = ?'); values.push(nome); }
    if (email !== undefined) { updates.push('email = ?'); values.push(email); }
    if (departamento !== undefined) { updates.push('departamento = ?'); values.push(departamento); }
    if (grupo_permissao_id !== undefined) { updates.push('grupo_permissao_id = ?'); values.push(grupo_permissao_id); }
    if (role !== undefined) { updates.push('role = ?'); values.push(role); }
    if (ativo !== undefined) { updates.push('ativo = ?'); values.push(ativo); }
    if (password) { updates.push('password_hash = ?'); values.push(bcrypt.hashSync(password, 10)); }
    if (updates.length === 0) return res.json({ message: 'Nenhuma alteração' });
    values.push(req.params.id);
    db.run(`UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`, values, function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'Usuário atualizado com sucesso' });
    });
});


// DELETE Autenticado: Limpar toda a tabela de credenciamentos (Botão Limpar Lista)
app.delete('/api/logistica/credenciamentos/limpar-lista', authenticateToken, (req, res) => {
    db.run('DELETE FROM credenciamentos', (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Todos os credenciamentos foram limpos.' });
    });
});

app.delete('/api/usuarios/:id', authenticateToken, (req, res) => {
    db.run('UPDATE usuarios SET ativo = 0 WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Usuário inativado' });
    });
});


app.get('/api/wipe-credenciamentos', (req, res) => {
    db.run('DELETE FROM credenciamentos', (err) => {
        res.json({ message: 'Todos os credenciamentos foram limpos.', error: err });
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
        function (err) {
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
        function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ message: 'Grupo atualizado' });
        }
    );
});

app.delete('/api/grupos-permissao/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM grupos_permissao WHERE id = ?', [req.params.id], function (err) {
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

    let sql, params = [];

    if (contexto === 'gerador') {
        sql = `SELECT a.*, g.nome as documento_nome
               FROM auditoria a
               LEFT JOIN geradores g ON a.registro_id = g.id
               WHERE a.programa = 'Geradores'
               ORDER BY a.data_hora DESC LIMIT 200`;
    } else if (contexto === 'colaborador' && qId) {
        sql = `SELECT a.*, c.nome_completo as documento_nome
               FROM auditoria a
               LEFT JOIN colaboradores c ON a.registro_id = c.id
               WHERE a.programa = 'Colaboradores' AND a.registro_id = ?
               ORDER BY a.data_hora DESC LIMIT 200`;
        params.push(qId);
    } else if (contexto === 'colaboradores_geral') {
        sql = `SELECT a.*, c.nome_completo as documento_nome
               FROM auditoria a
               LEFT JOIN colaboradores c ON a.registro_id = c.id
               WHERE a.programa = 'Colaboradores'
               ORDER BY a.data_hora DESC LIMIT 200`;
    } else if (programa && programa.toLowerCase().includes('faculdade')) {
        sql = `SELECT a.*, f.nome_curso as documento_nome
               FROM auditoria a
               LEFT JOIN cursos_faculdade f ON a.registro_id = f.id
               WHERE a.programa LIKE ?
               ORDER BY a.data_hora DESC LIMIT 200`;
        params.push(`%${programa}%`);
    } else if (programa && programa.toLowerCase().includes('os log')) {
        // OS Logística: retorna numero_os como documento_nome
        const numeroOsFiltro = req.query.numero_os;
        if (numeroOsFiltro) {
            sql = `SELECT a.*, os.numero_os as documento_nome
                   FROM auditoria a
                   LEFT JOIN os_logistica os ON a.registro_id = os.id
                   WHERE a.programa LIKE ? AND os.numero_os = ?
                   ORDER BY a.data_hora DESC LIMIT 500`;
            params.push(`%${programa}%`, numeroOsFiltro);
        } else {
            sql = `SELECT a.*, os.numero_os as documento_nome
                   FROM auditoria a
                   LEFT JOIN os_logistica os ON a.registro_id = os.id
                   WHERE a.programa LIKE ?
                   ORDER BY a.data_hora DESC LIMIT 500`;
            params.push(`%${programa}%`);
        }
    } else if (programa) {
        sql = `SELECT a.* FROM auditoria a WHERE a.programa LIKE ? ORDER BY a.data_hora DESC LIMIT 200`;
        params.push(`%${programa}%`);
    } else {
        if (qId) {
            sql = `SELECT a.*, c.nome_completo as documento_nome
                   FROM auditoria a
                   LEFT JOIN colaboradores c ON a.registro_id = c.id
                   WHERE a.programa = 'Colaboradores' AND a.registro_id = ?
                   ORDER BY a.data_hora DESC LIMIT 200`;
            params.push(qId);
        } else {
            sql = `SELECT a.* FROM auditoria a ORDER BY a.data_hora DESC LIMIT 200`;
        }
    }

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
        [gerador_id, departamento_id], function (err) {
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
        [req.params.gerador_id, req.params.departamento_id], function (err) {
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
if (!fs.existsSync(CERT_DIR)) { try { fs.mkdirSync(CERT_DIR, { recursive: true }); } catch (e) { } }
console.log(`[CERT] Diretório do certificado: ${CERT_DIR}`);

const uploadCertificado = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, CERT_DIR),
        filename: (req, file, cb) => cb(null, 'certificado.pfx')
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
        const pg = tmpDoc.addPage([595, 842]);
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
    } catch (e) {
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
        try { fs.unlinkSync(pfxPath); } catch (e) { }
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
    if (fs.existsSync(certFile)) { try { fs.unlinkSync(certFile); } catch (e) { } }
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
        const pg = pdf.addPage();
        pg.drawText('Teste de Assinatura Digital - America Rental', { x: 50, y: 700, size: 16 });
        pg.drawText(`Data: ${new Date().toLocaleString('pt-BR')}`, { x: 50, y: 670, size: 12 });
        const pdfBytes = await pdf.save({ useObjectStreams: false });

        const pdfAssinado = await signPdfPfx.assinarPDF(Buffer.from(pdfBytes));
        console.log(`[CERT-TEST] Tamanho do PDF assinado: ${pdfAssinado.length} bytes`);
        res.json({ ok: true, tamanho_bytes: pdfAssinado.length, message: '? Assinatura digital funcionando corretamente!' });
    } catch (e) {
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

// Helper para Layout de e-mail padronizado
function gerarEmailExperienciaHTML({ respNome, nomeCompleto, cargo, prazos, diasRestantes, formLink, tipo }) {
    const apiBase = (process.env.BASE_URL || 'https://sistema-america.onrender.com');
    const logoUrl = `${apiBase}/assets/logo-header.png`;
    const prazoFimFormatado = prazos ? prazos.prazo2_fim.split('-').reverse().join('/') : '';
    const mensagem = tipo === 'automatico'
        ? `O período de experiência do colaborador <strong>${nomeCompleto}</strong> (${cargo}) está se encerrando em <strong>${diasRestantes} dias</strong> (término em ${prazoFimFormatado}).`
        : `Por favor, preencha o formulário de avaliação de experiência do colaborador <strong>${nomeCompleto}</strong> (${cargo}).`;

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Avaliação de Experiência — América Rental</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Inter,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

      <!-- HEADER COLORIDO -->
      <tr>
        <td style="background:linear-gradient(135deg,#0f4c81 0%,#1d7bbf 40%,#2db0d8 70%,#5bc8de 100%);padding:0;height:90px;position:relative;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="60%" style="padding:20px 28px;">
                <img src="${logoUrl}" alt="América Rental" style="max-height:52px;max-width:200px;">
              </td>
              <td width="40%" align="right" style="padding:12px 24px 0 0;vertical-align:top;">
                <table cellpadding="0" cellspacing="3" align="right">
                  <tr>
                    <td style="width:28px;height:28px;background:rgba(255,255,255,0.25);border-radius:6px;"></td>
                    <td style="width:28px;height:28px;background:rgba(255,255,255,0.18);border-radius:6px;"></td>
                    <td style="width:28px;height:28px;background:rgba(255,255,255,0.10);border-radius:6px;"></td>
                  </tr>
                  <tr>
                    <td style="width:28px;height:28px;background:rgba(255,255,255,0.10);border-radius:6px;"></td>
                    <td style="width:28px;height:28px;background:rgba(255,255,255,0.25);border-radius:6px;"></td>
                    <td style="width:28px;height:28px;background:rgba(255,255,255,0.18);border-radius:6px;"></td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- TÍTULO -->
      <tr>
        <td style="padding:24px 28px 8px;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:24px;height:24px;background:#e8f5e9;border-radius:4px;text-align:center;line-height:24px;font-size:14px;">📋</td>
              <td style="padding-left:10px;">
                <span style="font-size:1.15rem;font-weight:800;color:#0f4c81;">Avaliação de</span>
                <span style="font-size:1.15rem;font-weight:800;color:#2db0d8;"> Experiência</span>
              </td>
            </tr>
          </table>
          <div style="height:3px;background:linear-gradient(90deg,#0f4c81,#2db0d8,#4caf50);border-radius:2px;margin-top:10px;"></div>
        </td>
      </tr>

      <!-- CORPO -->
      <tr>
        <td style="padding:8px 28px 16px;">
          <p style="color:#334155;font-size:0.95rem;margin:0 0 12px;">Olá, <strong>${respNome || 'Responsável'}</strong>,</p>
          <p style="color:#334155;font-size:0.95rem;margin:0 0 16px;">${mensagem}</p>

          <!-- INFO BOX -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;margin-bottom:16px;">
            <tr><td style="padding:14px 18px;">
              <p style="margin:0 0 6px;color:#334155;font-size:0.9rem;"><strong>Colaborador:</strong> ${nomeCompleto}</p>
              <p style="margin:0 0 6px;color:#334155;font-size:0.9rem;"><strong>Cargo:</strong> ${cargo}</p>
              ${prazos ? `<p style="margin:0;color:#334155;font-size:0.9rem;"><strong>Término do período:</strong> ${prazoFimFormatado}</p>` : ''}
            </td></tr>
          </table>

          <!-- AVISO AMARELO -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;margin-bottom:20px;">
            <tr><td style="padding:14px 18px;text-align:center;">
              <p style="margin:0;color:#92400e;font-weight:700;font-size:0.9rem;">
                Favor preencher o formulário de avaliação clicando no botão abaixo.
              </p>
            </td></tr>
          </table>

          <!-- BOTÃO -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding-bottom:20px;">
              <a href="${formLink}" style="display:inline-block;background:#0f4c81;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:0.95rem;letter-spacing:0.3px;">
                Acessar Formulário de Avaliação
              </a>
            </td></tr>
          </table>
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 28px;text-align:center;">
          <p style="margin:0;color:#94a3b8;font-size:0.78rem;">América Rental — Sistema de Gestão de Colaboradores | E-mail automático.</p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}

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
                {
                    format: 'A4', margin: { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' },
                    printBackground: true, args: ['--no-sandbox', '--disable-setuid-sandbox']
                }
            );
            const nomeArq = encodeURIComponent(`Ficha_Admissao_${row.nome_completo || 'Colaborador'}.pdf`);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${nomeArq}"`);
            res.send(pdfBuffer);
        } catch (e) {
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
            await sendMailHelper({
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
        const placa = extract(/PLACA\s*\n([A-Z0-9]{7})/i) || extract(/PLACA\s+([A-Z]{3}[0-9][A-Z0-9][0-9]{2})/i);
        const veiculo = extract(/MARCA\/MODELO\/VERS[ÃA]O\s*\n(.+)/i);
        const codigoInfracao = extract(/C[ÓO]DIGO DA INFRA[ÇC][ÃA]O\s*\n(\d{4,6})/i);
        const descricao = extract(/DESCRI[ÇC][ÃA]O DA INFRA[ÇC][ÃA]O\s*\n(.+)/i);
        const dataInfracao = extract(/\bDATA\b\s*\n(\d{2}\/\d{2}\/\d{4})/i);
        const horaInfracao = extract(/\bHORA\b\s*\n(\d{2}:\d{2})/i);
        const localInfracao = extract(/LOCAL DA INFRA[ÇC][ÃA]O\s*\n(.+)/i);
        const valorMulta = extract(/VALOR DA MULTA\s*\nRS?\s*([\d.,]+)/i);
        const numeroAit = extract(/N[ÚU]MERO DO AUTO DE INFRA[ÇC][ÃA]O\s*\n([A-Z0-9]+)/i) ||
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

// POST /api/colaboradores/:id/multas
app.post('/api/colaboradores/:id/multas', authenticateToken, multaUpload.single('arquivo'), async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;

        const colab = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM colaboradores WHERE id = ?', [id], (err, row) => err ? reject(err) : resolve(row));
        });
        if (!colab) return res.status(404).json({ error: 'Colaborador nao encontrado.' });

        const nomeFormatado = (colab.nome_completo || colab.nome || 'COLAB')
            .toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');

        const codigo = (body.codigo_infracao || 'MULTA').replace(/[^A-Z0-9]/gi, '');

        // Inserir no banco primeiro para obter o ID
        const stmt = `INSERT INTO multas (colaborador_id, codigo_infracao, descricao_infracao, placa, veiculo,
            data_infracao, hora_infracao, local_infracao, numero_ait, pontuacao, valor_multa,
            notificacao_path, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'pendente')`;
        db.run(stmt, [id, body.codigo_infracao, body.descricao_infracao, body.placa, body.veiculo,
            body.data_infracao, body.hora_infracao, body.local_infracao, body.numero_ait,
            body.pontuacao, body.valor_multa, null],
            function (insertErr) {
                if (insertErr) return res.status(500).json({ error: insertErr.message });
                const multaId = this.lastID;

                // Pasta unica: CODIGO_DDMMYYYY_ID
                const dataInf = body.data_infracao
                    ? (body.data_infracao.includes('-')
                        ? body.data_infracao.split('-').reverse().join('')
                        : body.data_infracao.replace(/\D/g, ''))
                    : String(new Date().getDate()).padStart(2, '0') + String(new Date().getMonth() + 1).padStart(2, '0') + new Date().getFullYear();
                const pastaNome = codigo + '_' + dataInf + '_' + multaId;

                res.json({ sucesso: true, id: multaId, pasta: pastaNome });

                // Upload da notificacao no OneDrive via Graph API (assíncrono)
                if (req.file && onedrive) {
                    ; (async () => {
                        try {
                            const onedriveBasePath = process.env.ONEDRIVE_BASE_PATH || 'RH/1.Colaboradores/Sistema';
                            const targetDir = onedriveBasePath + '/' + nomeFormatado + '/MULTAS/' + pastaNome;
                            await onedrive.ensurePath(onedriveBasePath + '/' + nomeFormatado);
                            await onedrive.ensurePath(onedriveBasePath + '/' + nomeFormatado + '/MULTAS');
                            await onedrive.ensurePath(targetDir);
                            // Nome fixo da notificacao (nao e sobreposto)
                            const nomeNotif = 'Notificacao_' + codigo + '_' + nomeFormatado + '.pdf';
                            await onedrive.uploadToOneDrive(targetDir, nomeNotif, req.file.buffer);
                            db.run('UPDATE multas SET notificacao_path = ? WHERE id = ?', [targetDir + '/' + nomeNotif, multaId]);
                            console.log('[MULTA-NOTIF] Notificacao salva: ' + targetDir + '/' + nomeNotif);
                        } catch (e) { console.error('[MULTA-NOTIF] Erro OneDrive:', e.message); }
                    })();
                }
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
        db.run('DELETE FROM multas WHERE id = ?', [multaId], function (e) {
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
        const check1x = parcelas === 1 ? 'X' : '&nbsp;';
        const check2x = parcelas === 2 ? 'X' : '&nbsp;';
        const check3x = parcelas === 3 ? 'X' : '&nbsp;';
        // Calcular valor das parcelas
        const _vBruto = multa.valor_multa ? parseFloat(String(multa.valor_multa).replace(/[^0-9,.]/g, '').replace(',', '.')) : 0;
        const _fmt = (v) => v > 0 ? 'R\$ ' + v.toFixed(2).replace('.', ',') : '';
        const _v1 = _fmt(_vBruto);
        const _v2 = _fmt(_vBruto / 2);
        const _v3 = _fmt(_vBruto / 3);

        const nome = colab.nome_completo || colab.nome || '';
        const cpf = colab.cpf || '';
        const admissao = colab.data_admissao ? new Date(colab.data_admissao).toLocaleDateString('pt-BR') : '---';
        const endereco = [colab.endereco, colab.bairro, colab.cidade, colab.estado].filter(Boolean).join(', ') || '---';
        const cargo = colab.cargo || '';
        const salario = colab.salario ? `R$ ${parseFloat(colab.salario).toFixed(2).replace('.', ',')}` : '---';
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
        <div class="logo-header"><img src="data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAC+BAADASIAAhEBAxEB/8QAHQABAAEEAwEAAAAAAAAAAAAAAAgFBgcJAgMEAf/EAGUQAAEDAwICBQUFEgoGBwQLAAEAAgMEBQYHERIhCBMxQVEUImFxgQkyUnKRFRYXIzM0N0JTV2KSlaGxwdHSNlRzdHWCk7KztCQ4VXaUohk1Q1ajpMKFw9PUGCUnREZHWGNmlvD/xAAcAQEAAQUBAQAAAAAAAAAAAAAABQECAwQGBwj/xABBEQACAQIDAwgHBgUEAgMAAAAAAQIDBAURMQYSIRNBUWFxkaGxFiIygcHR8BQVNFJT4SMzNUJyQ6Li8SRjYmSy/9oADAMBAAIRAxEAPwDamrNzzU2y4TEYHjyu4vbvHTMPZ4F5+1H51y1MzuHCLJ1sJa+4VZMdLGfzvPoHL2kKMNVVVFbUSVdXM+WaVxe973ElxJ5kkraoUOU9aWhp3Nzyfqx1LqyLVXM8ie9st0fSU7+XUUpMbdvAkcz8qs2se+SGaSR7nuc1xLnHck7dq5rrqfraX4jv0KQhFR4JEZOUp5uTLQREW8QYVz6YfZFxv+lKf++FbCufTD7IuN/0pT/3wrKnsS7DLQ/mx7UTfWGOkjr9RaN4+2itboqjJbmwijgdzEDOwzPHgO4d59RWXbpcqOzWyru9wmbDS0UD6iaR3Y1jGlzj8gK1W6oZ7cdTM4umYXF7962Y9RG4/UoRyjYPU3b27rSwawV7Vcqnsx8eo3dqsalhVsoUX/EnwXUud/L9ijX/ACC9ZTd6i+5Dcp6+vq3ccs8z+Jzj+oDuA5BU5EXdJKKyR4/KTm3KTzbOxn1OT1D9K612M+pyeofpXWiKM+tc5jg9ji1zTuCDsQVM7op9JytvVXT6Z6hVvXVUgDLVcZXedKR/2MhPafgu7T2HuUMF2U9RPSVEdVSzPhmheJI5GOLXMcDuCCOwgrUvbOne0nTn7n0ElhWK18JuFWpPhzrma+tOg3BIsd6B6kO1S0ytWS1L2mvazyWu25fT2cnO27uLk72rIi88q05UZunPVcD3K3rwuqUa1N+rJJr3hERYzMEREAREQBRA6YnSxqsLlm0u02rjHeXM2ulyidzowRyijP3QjmT9qNtuZ5SA111Nh0j0uvmbEMfVU0PVUMTuySqk82MHxAJ4j6Glairncq+83Gpu10qpKmsrJXTzzSHdz3uO5J9pXRYDh0bmbr1VnGOi6X+xyW1GLzs4K1oPKUtX0L9zolllnlfPPK+SSRxc973Euc49pJPaVwRF2x5ucj70esriuR96PWVxQHusl8u+N3WmvlhuNRQV9HIJYKiB5Y+Nw7wQtlXRO6TlNrVZX43kzo6fLrXGHTAABlbD2dcwdzgeTm93IjkeWsdXLpxnd400zW05tY5CKm2VDZSzfYSx/bxu9Dm7j2qNxPD4X9JrL1lo/h2Exg2LVMLrqWfqP2l8e1G5lQo6WfSornXCr0w01ujoYKfeC63Knfs6R/Y6GNw7AOxzh37gdizRrrrnQY5oCzPsZq/p+UU0UNpdv5zXTsLi70FjA4nwIWtR73yPdJI4uc4lznE7kk96gcAwyNWTuKy4J5Jdf7HRbW45KhFWdtLJyWba6Hol2+XafCSTuTuSiIuzPNS1sn/6wb/Jj9JVIVXyf/rBv8mP0lUhYnqTtD+VHsCIioZTbR0JP9WPDPiVv+cmWc1gzoSf6seGfErf85Ms5rzS+/FVP8n5nq+Hfg6X+MfJBERapuBERAEREBDbXRnBqjejt758Z/8ADarCWSde4D9EK51AHIStYfxGkfrWNl0dB50o9hxt5Hdrz7WERFlNYIiIAvo7V8X0dqIF3wfUWfFC5rhB9RZ8ULmtJk0tAiIhUIiIAro0xoDcM7s8PDuI6gTHcb7Bg4v0gK11lno+WR1Teq6+yM+l0cQhYT8N/b8gH5wsdWW7Bsy0Y79RIz0iIogmwiIgCIiAIiIChZpmFpwew1F9uz/MiG0cTSOKV/c1vpKh1nOe3/Pbq643ipd1bSeopmn6XC09wHj4nvV39ILOXZPl77NSSk0FmJgbseT5vt3ezs9hWLFN2duqcd96s5jErx1punF+qvEKk5b/AAauX83cqsqTlv8ABq5fzdykaP8AMj2ohLr+RPsfkYVREXTnmwWXOij9nnGP5Sb/AAnrEay30U3NZrvjT3uDWtfMST2AdS9at7+Gqf4vyJHCfx9D/OPmianSK16smhOGOus/V1V7r+KG1UBdzlk25vd3hjdwSfUO9auM6z3KtSMiqcpzC7zXCvqD76R3mxt7mMb2NaO4BXn0k9WKjV/Va65BHUuktdJI6itbd/NFOwkBwH4R3d7Vixa+EYdGypKUl6716uo6TH8XniNdwg/4cXwXT1/LqC5x9j/i/rC4LnH2P+L+sKWZAI4IiKoJg9EDpaXGw3Kh0t1JuLqi0VJEFsuEz930cnY2J5PbGewH7U7d3ZPwEEbhaQwS0hzSQRzBC2c9FHXFmaaFyXbKq7jrsOhfTXGZ586SGKPiZI495LBsT3lpPeuQx/DY08rmitXk119J3+y2MSq52dd55LOLfQtV7uY9HSx6TVFoJjDLfZhDVZbeI3eQQP5tp4+wzyDvAPJo7z6AVq0ybJ7/AJlfKvJMnutRcblWyGSeoneXOcf1AdgA5BV/WHUm76tajXrO7vO97rhUHyeMnlBTt82KNo7gGges7ntJVmKZwvD4WNJZr13q/gRGLYnPEKzyfqLRfHtYXnuH1o747f1r0Lz3D60d8dv61JPQjaftopSIiobgU3Pctv4f5r/Q8H+OFCNTc9y2/h/mv9Dwf44Ubi/4Kp2fFEng/wCNp/XMzY4iIvPj0AIiIAiIgCIiAIiIAiIgCIiALXp7o4z/AO1bHH//AMeYP/MzrYWtfnui8Zk1NsJA5sx+N3/mZ1N7P/jV2M5rax5Ya+2PmREREXenl4REQBERAFXKD6yh9R/vFUNVyg+sofUf7xRamGt7J3oiK81QiIgCIiA5wxPnmjgjG7pHBgHpJ2W33B7R8wMNsdlLeE0Vvp4HDwc2MA/n3Wsbo74NJqFrHjVhMXHTR1ba6sO24EEH0xwPxuEN9bgtqi4/aesnKnRXNm+/TyZ6NsLbNU6tw9G0l7uL80Re1ayF+QZpW8MvFT0LvJYQOwBvvv8Am3VmrnNJLUTSTykufK4vcSe0k7krjsVGxjupJHQzk5ycmfF11P1tL8R36F27Fdc7HOgka0bksdsPYrlqWPQs9F3+RVn8Wk/FTyKs/i0n4q3M0Q+7LoOhXPph9kXG/wClKf8AvhW/5FWfxaT8VXXpTbamXUjHQ+GRrW18chPD8E8X6lZUa3JdhloRlyseHOjOfS1v01h0JyA07yyS4CGg3HwZHgPHtYHD2rW0thPTdY92hFZIyThMVxpHevziNvzrXL5RN90Kk9nKado2vzPyRzm27lLEYp6KK82VFFTvKJvuhTyib7oVP8mzjd1lVZ9Tk9Q/Suteajmle57XPJHD+telWNZMNZBERC0mV7n/AH6aSiy7GZHExwSU1bEO4F4ex39xql4oY+5+0cxuuZV/B9JbT0cJd+EXSHb5ApnLgcaSV9PLq8ke0bJylLCKW91//phERRR0YREQBERAQ690eyGamxDFcZik2ZXV0tVI0HtEbAB+d6gMpme6bzTRV+CCN5aDFW77eO8ag55XU/dnL0DA0o2MMufPzPLtpISq4lN56ZeSKuipHldT92cnldT92cpfMgvs8ukrJ96PWVxXmoJZJY3GR5ds7luvSqriYZR3XkEREKGV8i1Gqcm0qwXC31D3NxttcHMPZvJKOD17NHLw3KsteoY/cLbjdovdTHw013E7qc+PVycLvz7LyqyjCEI5Q0zffm8/EwXlSpUq51Ncl3JJLwCIizGsWtk3/WDf5MfpKpCvuqt9FUGOWemY9xbtufWV0fMi2fxKP5CrN3PiSNO8hCCi0+BZaK9PmRbP4lH8hT5kWz+JR/IU3WX/AG+HQzZp0JP9WPDPiVv+cmWc1g7oi282zo74fTGHqg6Coma38F9RK9p9ocD7VmFeY334qp/k/M9kw171lRf/AMY+SCIi1TdCIiAIiICKms9OKnOb5D3uezb18DdliVwLSWuGxB2IWYdWvshXj+VZ/casZ3yhLH+Vxt813v8A0HxU7bSyil1HL39Pek5rmbKSiItsjAiIgC+jtXxfR2ogXfB9RZ8ULmuEH1FnxQua0mTS0CIiFQiIgPrWue4NaCSTsAO8qVGmmMfOpidJQSMDamUdfUcufG7uPqGw9ixHorghvt2GR3GAmgoHbxBzeUsw7PWG9vr2UhloXVTN7iJGzpZLlGERFpm+EREAREQBeS7VYoLXV1xOwp4Hy7+ppK9apuS076vHbnTR++lpJmD1lhVY8Wsyks0nkQSral9bWT1kp3fPI6Rx8STuuhfXNLHFjhsWnYr4unOGfEKk5b/Bm5fzdyqy66ingq4H01TEJIpBwvYewjwV0JbslJ8xirQdSnKC500YDRZp+dDGf9jU/wAh/anzoYz/ALGp/kP7VL/eVPoZyno7X/OvH5GFlVsbyiTDquqvcDnNmbb6unhc07Fj5YXxtcPUX7+xZT+dDGf9jU/yH9qoGoOF2wYFf7hurZBFLQUgqDIN92tEjGnb8ZV+30qvqNPjw7y+GBXFCSqqazjx5+bj0EfUVI8rqfuzk8rqfuzlK5mD7PLpKuucfY/4v6wqL5XU/dnL0UNTO+fhfISC07hUzDoOKzzPeiIrjAFkfTvUufC9NNT8bjq3ROyOz09PA0Htf5VGx+3p6qST5FjhVe3YtX33GMovNKPpOP0MFXPy7Wvq4YgP/E3/AKpWGvCE4ZT0zXmsvE2rKc6dZSp65PyefgWWiIrzYC89w+tHfGb+tehcurZLC9sjQ4At7faqMug92WZQEVY8kpvuLU8kpvuLVTJmxy66CjqbnuW38P8ANf6Hg/xwod+SU33FqnF7mDag2957dY4GNZHS0NPx9+7nyu29XmfoUZjHCxqZ9XmiUwWop31NJdPkyfyIi8/PRQiIgCIiAIiIAiIgCIiAIiIAoC+6DtDtU7AHDcOx5g/8zOp9KA/ugpH0VMfHf877P8zOpvZ78cuxnL7Yf0uXbHzIuqlV9F1ZM0TfNPaB3KqoRvyK788khNweaLcRVGrtp3MlOPW39ip5BB2I2IVpuRkprNHxERC4KuUH1lD6j/eKoarlB9ZQ+o/3ii1MNb2TvREV5qhEV/aTaJZ5rHdfIcVtjhRxPDaq4TAtp6cel3e7b7UblY6lWFGLnUeSRloUKlzUVKjFyk9Ei2sQw/Ic7yGkxfF7dJW3CteGRxtHJo73OPY1o7SStmugmiNm0SxBtnpnR1V2rOGW51obt10gHJrd+YY3nsPWe9fdEtBcO0UsYpLPA2ru1Q0eXXOVg62Y/Bb8Bg7mj27lZMXDYxjDvnyVLhBeP7HqmzmziwtfaLjjVf8At6u3pfuXWREUCdYUnJ8coMqs09muLN45Ru1225jeOxw9IUXssw+84dcnUF1gPCSepnaPMlb4g/qUt14L1Y7VkNA+23iijqad/MteOw9xB7QfSFno13S4cxr17dVlmtSHa+s98FmfIej3IXOmxi7s2PMQVe429AeAfzhWXPo9qJTTGMY+ZQOx8c8ZaflcFvxrU5c5Gyt6kXxRZY7EV827RbUCul6ua1R0bR2yTzs2+RpJ/MshYxoFabfKyqyOuNwe0g9RGCyLf095HyKkq9OPOVhb1J8xj7TXTSvzGuZW1sT4LTC4OklI263b7Rvj6T3KSlNTQUdPHSUsTY4YWBjGNGwa0DYBfaengpIWU1LCyKKNoaxjGgNaB3ABdij6tV1XmyTo0VRWS1MC9Nr7Aly/n1J/fWt4di3GXqxWTI6F1ryC0Udyo3uDnU9XA2WMkdhLXAjcK3voO6S/exxX8kU/7qnMLxqGH0OSlBvjn5HK49szVxe6VxCoorJLin1mpRFtr+g7pL97HFfyRT/up9B3SX72OK/kin/dUl6UUv033ohPQW4/WXczU7Q/VHfF/Wqxa7Pdr3VNobNbKquqHnZsVPC6Rx9jQtpsOkeldOSYNNsYYT2ltpgH/pVftljstli6iz2iioY/gU1OyJvyNAWGptLF8YU+9l8Ng6jl/ErLLqX7kGNI+hfmmVVUNz1C48ftAIc6DkaucfBDexgPiefoU3MSxHHsGsNNjeMW2KioKUbMjYO097nHtLj3kqsooC9xGvfP+I+HQtDsMKwO0wiOVBZyesnq/kupBERaJMBERAEREAECvdO/r7A/5Ku/TEoMrd9kuCYTmToH5diNmvTqUOEBuFDHUGMHbfh4wdt9h2eCon0DdF/vTYh+Raf8AcXSWGOU7O3jRcG8vmcriOz1S9uZV4zSTy5upI0uIt0f0DdF/vTYh+Raf8AxcYx1l/V7N/gM3cR+gO5O5OwA7yT3Lq8PweXEq0qVKdOEFmnOWUV+7XpPbsnxOGCUKs61edOPLhHq6X9X1G13S66Nln00w4ZPl9dNSzV85p8Yw63S+TVN3mH0mN7R5jT3uJ5nsHbzI4vR641+XamYnS1V0rbjUUVdJcK663B5erqJ4w2Z5c48+Hn5re4dy1k4jnuA6N4xU4rQyVOMV0g2qK+qZ5zXyH4D3H4Tj/S4nuA8J1q03z7JtV81tN+x+5S2mC21dVT2i8sHn0lO/iA5c2h22xI+A4g7blbL8H43h+HV7S9uqd1Xv40KcvuUaUaWcZ1KjjGbjGScE5yS5qK6S+Vp/H3tZ/D72F9YxuaNGpTpVqlT+pOnD6U+bV8uK07N2Krz6+nS4Oq5eN8aDq7wG7V3/a1f8AtXoP7ovg/rK8v659+p7/Wp7u7T3r59c991qV9c490uL1b9/wCrT/8AVtX0j3SXvL6P+X/y66+98v8AvWv/ALuNf/T1W7/T4Z+G/8Az/wD/AEbN5Tf732H/ALJ//wBEc7H6v/XhZ/v5F/mWraNn/AEY9fM1t1LeMpwuyYtaZ2iWjhyi7tgrZ2nuJY1oP/KSPQu3pU3nS3O/I7Ril5seS01dRU11t0vA+pqoIomM2b5peOEDi3Hkrd4p4FhGHYrQxO3xS5r0KtJOpSjKclGcXq49b0w6z5/s3i2K4rjsq9K4uLKpTpyt4U4TnTlRk6eWcZN5N+rPXoN0L9JvN3/sN1fP/AGrF+1P9qf7mBqD+K+Kfl27/AFrQ1Fz/AM8Fq3p/Y/8A32kL+X1X96f90/8A7uNf/T1Qn+yWv/v/wD+P+Bf/sziP95/wD/2/8A6O5/1R9f/uF/i/sX1/Vn1/+4X+L+1aKovP/ACz/ALn/AP8Ap/8A/a5f/s3iP95//wD//2Q==" alt="América Rental"></div>
        <div class="box">
            <p><strong>DADOS COLABORADOR:</strong></p>
            <p>NOME: <strong>${nome}</strong>&nbsp;&nbsp;&nbsp;CPF: <strong>${cpf}</strong></p>
            <p>ENDEREÇO: ${endereco}</p>
            <p>CARGO: ${cargo}</p>
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
        ${(function () {
                var meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
                var d = multa.data_infracao ? new Date(multa.data_infracao + 'T12:00:00') : new Date();
                var hoje = new Date();
                var dia = hoje.getDate();
                var mes = meses[hoje.getMonth()];
                var ano = hoje.getFullYear();
                return '<p class="data-local"><strong>Guarulhos, ' + dia + ' de ' + mes + ' de ' + ano + '.</strong></p>';
            })()}
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

// POST /api/colaboradores/:id/multas/:multaId/assinar-testemunhas
app.post('/api/colaboradores/:id/multas/:multaId/assinar-testemunhas', authenticateToken, (req, res) => {
    const { multaId } = req.params;
    const { testemunha1_nome, testemunha1_assinatura, testemunha2_nome, testemunha2_assinatura, documento_html } = req.body;
    if (!testemunha1_assinatura) {
        return res.status(400).json({ error: 'Assinatura da primeira testemunha e obrigatorio.' });
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
            if (onedrive && documento_html) {
                ; (async () => {
                    try {
                        const colab = await new Promise((resolve, reject) => db.get(
                            'SELECT c.nome_completo, m.codigo_infracao, m.data_infracao, m.id FROM multas m JOIN colaboradores c ON c.id = m.colaborador_id WHERE m.id = ?',
                            [multaId], (e, r) => e ? reject(e) : resolve(r)
                        ));
                        if (!colab) return;
                        const safeColab = formatarNome(colab.nome_completo || 'DESCONHECIDO');
                        const codigo = (colab.codigo_infracao || 'MULTA').replace(/[^A-Z0-9]/gi, '');
                        // Montar data no formato DDMMYYYY
                        let dataStr = '';
                        if (colab.data_infracao) {
                            const d = colab.data_infracao.includes('-')
                                ? colab.data_infracao.split('-').reverse().join('')
                                : colab.data_infracao.replace(/\D/g, '');
                            dataStr = '_' + d;
                        }
                        const pastaNome = codigo + dataStr + '_' + colab.id;
                        const onedriveBasePath = process.env.ONEDRIVE_BASE_PATH || 'RH/1.Colaboradores/Sistema';
                        const targetDir = onedriveBasePath + '/' + safeColab + '/MULTAS/' + pastaNome;
                        await onedrive.ensurePath(onedriveBasePath + '/' + safeColab);
                        await onedrive.ensurePath(onedriveBasePath + '/' + safeColab + '/MULTAS');
                        await onedrive.ensurePath(targetDir);
                        const pdf = require('html-pdf-node');
                        const pdfBuffer = await pdf.generatePdf({ content: documento_html }, { format: 'A4', margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } });
                        // Nome fixo: Termo_CODIGO_DDMMYYYY.pdf — mesmo nome que sera sobreposto pelo condutor
                        const nomeArquivo = 'Termo_' + codigo + (dataStr ? '_' + dataStr.replace(/^_/, '') : '') + '.pdf';
                        await onedrive.uploadToOneDrive(targetDir, nomeArquivo, pdfBuffer);
                        console.log('[MULTA-TESTEMUNHAS] PDF salvo: ' + targetDir + '/' + nomeArquivo);
                    } catch (e) { console.error('[MULTA-TESTEMUNHAS] Erro OneDrive:', e.message); }
                })();
            }
            res.json({ sucesso: true });
        }
    );
});

// POST /api/colaboradores/:id/multas/:multaId/assinar-condutor
app.post('/api/colaboradores/:id/multas/:multaId/assinar-condutor', authenticateToken, async (req, res) => {
    const { multaId } = req.params;
    const { assinatura_base64, documento_html } = req.body;
    if (!assinatura_base64) return res.status(400).json({ error: 'Assinatura obrigatoria.' });
    try {
        const sqlUpdate = documento_html
            ? 'UPDATE multas SET assinatura_condutor_base64 = ?, assinaturas_finalizadas = 1, status = \'assinado\', documento_html = ? WHERE id = ?'
            : 'UPDATE multas SET assinatura_condutor_base64 = ?, assinaturas_finalizadas = 1, status = \'assinado\' WHERE id = ?';
        const sqlParams = documento_html ? [assinatura_base64, documento_html, multaId] : [assinatura_base64, multaId];
        await new Promise((resolve, reject) => db.run(sqlUpdate, sqlParams, (e) => e ? reject(e) : resolve()));
        // Salvar PDF final no OneDrive (pasta unica por multa)
        if (onedrive && documento_html) {
            ; (async () => {
                try {
                    const colab = await new Promise((resolve, reject) => db.get(
                        'SELECT c.nome_completo, m.codigo_infracao, m.data_infracao, m.id FROM multas m JOIN colaboradores c ON c.id = m.colaborador_id WHERE m.id = ?',
                        [multaId], (e, r) => e ? reject(e) : resolve(r)
                    ));
                    if (!colab) return;
                    const safeColab = formatarNome(colab.nome_completo || 'DESCONHECIDO');
                    const codigo = (colab.codigo_infracao || 'MULTA').replace(/[^A-Z0-9]/gi, '');
                    let dataStr = '';
                    if (colab.data_infracao) {
                        const d = colab.data_infracao.includes('-')
                            ? colab.data_infracao.split('-').reverse().join('')
                            : colab.data_infracao.replace(/\D/g, '');
                        dataStr = '_' + d;
                    }
                    const pastaNome = codigo + dataStr + '_' + colab.id;
                    const onedriveBasePath = process.env.ONEDRIVE_BASE_PATH || 'RH/1.Colaboradores/Sistema';
                    const targetDir = onedriveBasePath + '/' + safeColab + '/MULTAS/' + pastaNome;
                    await onedrive.ensurePath(onedriveBasePath + '/' + safeColab);
                    await onedrive.ensurePath(onedriveBasePath + '/' + safeColab + '/MULTAS');
                    await onedrive.ensurePath(targetDir);
                    const pdf = require('html-pdf-node');
                    const pdfBuffer = await pdf.generatePdf({ content: documento_html }, { format: 'A4', margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } });
                    // MESMO nome das testemunhas — sobrepoe automaticamente
                    const nomeArquivo = 'Termo_' + codigo + (dataStr ? '_' + dataStr.replace(/^_/, '') : '') + '.pdf';
                    await onedrive.uploadToOneDrive(targetDir, nomeArquivo, pdfBuffer);
                    console.log('[MULTA-CONDUTOR] PDF final salvo: ' + targetDir + '/' + nomeArquivo);
                } catch (e) { console.error('[MULTA-CONDUTOR] Erro OneDrive:', e.message); }
            })();
        }
        res.json({ sucesso: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// =============================================
// DISSÍDIO - Reajuste de Salário em Massa
// =============================================

// Migration: Excluir cargo genérico 'Manutenção' e adicionar cargos específicos de manutenção
db.serialize(() => {
    db.run("DELETE FROM cargos WHERE LOWER(TRIM(nome)) = 'manutencao' OR LOWER(TRIM(nome)) = 'manutenção'");
    
    // Inserir Manutenção apenas se não foi excluído
    db.run("INSERT INTO departamentos (nome) SELECT 'Manutenção' WHERE NOT EXISTS (SELECT 1 FROM departamentos WHERE nome='Manutenção') AND NOT EXISTS (SELECT 1 FROM departamentos_excluidos WHERE nome='Manutenção')");
    
    const cargosManut = [
        'Aux. de Manutenção',
        'Ass. de Manutenção 1',
        'Ass. de Manutenção 2',
        'Téc. de Manutenção',
        'Sup. de Manutenção'
    ];
    cargosManut.forEach(nome => {
        db.run("INSERT INTO cargos (nome, departamento) SELECT ?, 'Manutenção' WHERE NOT EXISTS (SELECT 1 FROM cargos WHERE nome=?) AND NOT EXISTS (SELECT 1 FROM cargos_excluidos WHERE nome=?)", [nome, nome, nome]);
    });
});

// Migration: criar tabela de histórico de dissídios
db.run(`CREATE TABLE IF NOT EXISTS dissidios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cargo TEXT NOT NULL,
    percentual REAL NOT NULL,
    salario_antes_media REAL,
    salario_depois_media REAL,
    total_colaboradores INTEGER DEFAULT 0,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
)`, (err) => {
    if (err) console.error('[Migration] Dissídios:', err.message);
    else console.log('[Migration] Tabela dissidios OK');
});

// POST /api/dissidio/aplicar — aplica reajuste em massa por cargo
app.post('/api/dissidio/aplicar', authenticateToken, async (req, res) => {
    const { cargo, novo_salario } = req.body;
    const loggedUser = req.user ? (req.user.username || req.user.nome || 'UNKNOWN') : 'SYSTEM';
    if (!cargo || !novo_salario || isNaN(parseFloat(novo_salario))) {
        return res.status(400).json({ error: 'cargo e novo_salario são obrigatórios.' });
    }
    const targetSalary = parseFloat(novo_salario);
    if (targetSalary <= 0) {
        return res.status(400).json({ error: 'Salário deve ser maior que zero.' });
    }
    try {
        const colabs = await new Promise((resolve, reject) =>
            db.all(`SELECT id, salario FROM colaboradores WHERE trim(cargo) = trim(?)`, [cargo], (err, rows) =>
                err ? reject(err) : resolve(rows || []))
        );
        if (colabs.length === 0) {
            return res.status(404).json({ error: 'Nenhum colaborador encontrado para este cargo.' });
        }
        const parseSalary = (val) => {
            if (!val) return 0;
            if (typeof val === 'number') return val;
            let s = String(val).replace(/R\$\s*/g, '').trim();
            if (s.includes(',') && s.includes('.')) {
                const lastComma = s.lastIndexOf(',');
                const lastDot = s.lastIndexOf('.');
                if (lastComma > lastDot) {
                    return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
                } else {
                    return parseFloat(s.replace(/,/g, '')) || 0;
                }
            }
            if (s.includes(',')) return parseFloat(s.replace(',', '.')) || 0;
            return parseFloat(s) || 0;
        };
        const formatBRL = (val) => {
            const num = Math.round(parseFloat(val) * 100);
            const cents = (num % 100).toString().padStart(2, '0');
            const reais = Math.floor(num / 100).toString();
            const reaisFormatted = reais.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            return `R$ ${reaisFormatted},${cents}`;
        };

        let totalAntes = 0;
        let atualizados = 0;
        const salNewStr = formatBRL(targetSalary);

        for (const colab of colabs) {
            const salOld = parseSalary(colab.salario);
            totalAntes += salOld;
            await new Promise((resolve, reject) =>
                db.run(`UPDATE colaboradores SET salario = ? WHERE id = ?`, [salNewStr, colab.id], (err) => err ? reject(err) : resolve())
            );
            atualizados++;
        }

        const mediaAntes = totalAntes / atualizados;
        const mediaDepois = targetSalary;
        let pct = 0;
        if (mediaAntes > 0) {
            pct = ((mediaDepois - mediaAntes) / mediaAntes) * 100;
        }

        await new Promise((resolve, reject) =>
            db.run(`INSERT INTO dissidios (cargo, percentual, salario_antes_media, salario_depois_media, total_colaboradores) VALUES (?, ?, ?, ?, ?)`,
                [cargo, pct, mediaAntes, mediaDepois, atualizados], (err) => err ? reject(err) : resolve())
        );

        // Auditoria
        db.run(`INSERT INTO auditoria (usuario, programa, campo, conteudo_anterior, conteudo_atual, registro_id) VALUES (?, ?, ?, ?, ?, ?)`,
            [loggedUser, 'Dissídio', `Reajuste: ${cargo}`,
             `Média antes: ${formatBRL(mediaAntes)} (${atualizados} colab.)`,
             `Novo salário: ${salNewStr} | Reajuste: ${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`,
             0]);

        res.json({ ok: true, atualizados, cargo, novo_salario: targetSalary, percentual: pct });
    } catch (e) {
        console.error('[Dissídio] Erro ao aplicar:', e.message);
        res.status(500).json({ error: e.message });
    }
});


// GET /api/dissidio/historico — retorna histórico de dissídios
app.get('/api/dissidio/historico', authenticateToken, (req, res) => {
    db.all(`SELECT * FROM dissidios ORDER BY criado_em DESC LIMIT 200`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});


// =====================================================================
// MÓDULO: CONTROLE DE EXPERIÊNCIA (Período de Experiência)
// =====================================================================

// Migration: create experiencia tables
db.run(`CREATE TABLE IF NOT EXISTS experiencia_formularios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    colaborador_id INTEGER NOT NULL,
    responsavel_nome TEXT,
    respostas TEXT,
    pontuacao REAL DEFAULT 0,
    situacao_avaliacao TEXT,
    comentarios TEXT,
    situacao TEXT DEFAULT 'pendente',
    notificacao_15d_enviada INTEGER DEFAULT 0,
    criado_em TEXT DEFAULT (datetime('now')),
    atualizado_em TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id)
)`, () => {
    db.run("ALTER TABLE experiencia_formularios ADD COLUMN data_envio_email TEXT", () => { });
});

db.run(`CREATE TABLE IF NOT EXISTS experiencia_notificacoes_pendentes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT,
    dados TEXT,
    criado_em TEXT DEFAULT (datetime('now')),
    lido INTEGER DEFAULT 0
)`);

db.run(`CREATE TABLE IF NOT EXISTS comercial_notificacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER,
            mensagem TEXT,
            tipo TEXT,
            dados TEXT,
            lida INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`, () => {
            db.run("ALTER TABLE comercial_notificacoes ADD COLUMN dados TEXT", () => {});
        });

    db.run(`CREATE TABLE IF NOT EXISTS logistica_notificacoes_pendentes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT,
    dados TEXT,
    criado_em TEXT DEFAULT (datetime('now')),
    lido INTEGER DEFAULT 0
)`);

// Função para calcular 2º prazo de experiência (45+45 = 90 dias corridos)
function calcPrazoExp(dataAdmissao) {
    if (!dataAdmissao) return null;
    let adm;
    if (dataAdmissao.includes('/')) {
        const [d, m, y] = dataAdmissao.split('/');
        adm = new Date(`${y}-${m}-${d}T12:00:00`);
    } else {
        adm = new Date(dataAdmissao + 'T12:00:00');
    }
    if (!adm || isNaN(adm.getTime())) return null;
    const prazo1_fim = new Date(adm); prazo1_fim.setDate(prazo1_fim.getDate() + 45);
    const prazo2_fim = new Date(adm); prazo2_fim.setDate(prazo2_fim.getDate() + 90);
    return {
        prazo1_fim: prazo1_fim.toISOString().split('T')[0],
        prazo2_fim: prazo2_fim.toISOString().split('T')[0]
    };
}

// --- PUBLIC ENDPOINTS ---
app.get('/api/experiencia/publico/info', (req, res) => {
    try {
        const payload = jwt.verify(req.query.token, SECRET_KEY);
        // exp is handled automatically by jwt, but we included a custom one or just use standard

        db.get(`SELECT c.*, (SELECT nome_completo FROM colaboradores WHERE id = d.responsavel_id) as responsavel_nome FROM colaboradores c LEFT JOIN departamentos d ON LOWER(TRIM(d.nome)) = LOWER(TRIM(c.departamento)) WHERE c.id = ?`, [payload.colab_id], (err, colab) => {
            if (err || !colab) return res.status(404).json({ error: 'Colaborador não encontrado.' });

            db.get(`SELECT * FROM experiencia_formularios WHERE colaborador_id = ? ORDER BY criado_em DESC LIMIT 1`, [colab.id], (err2, form) => {
                let parsedForm = null;
                if (form) {
                    parsedForm = { ...form };
                    try { parsedForm.respostas = JSON.parse(form.respostas || '{}'); } catch (e) { parsedForm.respostas = {}; }
                }
                const prazos = calcPrazoExp(colab.data_admissao);
                res.json({ colaborador: { ...colab, ...prazos }, formulario: parsedForm });
            });
        });
    } catch (e) {
        res.status(400).json({ error: 'Token inválido ou expirado.' });
    }
});

async function gerarESalvarPDFExperiencia(colab, respostas, pontuacao, situacao_avaliacao, comentarios) {
    try {
        const htmlPdf = require('html-pdf-node');
        const fs = require('fs');
        const path = require('path');

        let htmlRespostas = '';
        if (respostas) {
            for (const [pergunta, resp] of Object.entries(respostas)) {
                htmlRespostas += `<p><strong>${pergunta}:</strong> ${resp}</p>`;
            }
        }

        const html = `<!DOCTYPE html>
        <html><head><meta charset="UTF-8"><style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
        h1 { color: #0f4c81; border-bottom: 2px solid #2db0d8; padding-bottom: 10px; }
        h2 { color: #333; margin-top: 20px; font-size: 1.2rem; }
        .info { background: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 0.95rem; }
        .info p { margin: 5px 0; }
        .respostas { margin-top: 20px; font-size: 0.9rem; }
        </style></head>
        <body>
            <h1>Avaliação de Experiência</h1>
            <div class="info">
                <p><strong>Colaborador:</strong> ${colab.nome_completo || ''}</p>
                <p><strong>Cargo:</strong> ${colab.cargo || ''}</p>
                <p><strong>Departamento:</strong> ${colab.departamento || ''}</p>
                <p><strong>Data de Admissão:</strong> ${colab.data_admissao || ''}</p>
                <p><strong>Responsável pela Avaliação:</strong> ${colab.responsavel_nome || ''}</p>
            </div>
            <h2>Resultado da Avaliação</h2>
            <div class="info">
                <p><strong>Situação:</strong> ${situacao_avaliacao || 'Pendente'}</p>
                <p><strong>Pontuação Total:</strong> ${pontuacao || 0}</p>
            </div>
            <h2>Comentários Adicionais</h2>
            <p>${comentarios || 'Nenhum comentário adicionado.'}</p>
            <h2>Respostas do Formulário</h2>
            <div class="respostas">
                ${htmlRespostas}
            </div>
        </body></html>`;

        const options = { format: 'A4', margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' } };
        const fileBuffer = await htmlPdf.generatePdf({ content: html }, options);

        const safeFolder = formatarNome(colab.nome_completo);
        const baseDrivePath = "C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\RH\\1.Colaboradores\\Sistema";
        const targetDir = path.join(baseDrivePath, safeFolder, "AVALIACAO");

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const fileName = `Experiencia_${safeFolder}.pdf`;
        const filePath = path.join(targetDir, fileName);

        fs.writeFileSync(filePath, fileBuffer);
        console.log(`[PDF Experiencia] PDF salvo com sucesso em: ${filePath}`);
    } catch (e) {
        console.error('[PDF Experiencia] Erro ao gerar/salvar PDF:', e);
    }
}

app.post('/api/experiencia/publico/submit', (req, res) => {
    try {
        const payload = jwt.verify(req.query.token, SECRET_KEY);

        const { respostas, pontuacao, situacao_avaliacao, comentarios } = req.body;

        db.get(`SELECT c.*, (SELECT nome_completo FROM colaboradores WHERE id = d.responsavel_id) as responsavel_nome FROM colaboradores c LEFT JOIN departamentos d ON LOWER(TRIM(d.nome)) = LOWER(TRIM(c.departamento)) WHERE c.id = ?`, [payload.colab_id], (err, colab) => {
            if (err || !colab) return res.status(404).json({ error: 'Colaborador não encontrado.' });

            db.get(`SELECT id FROM experiencia_formularios WHERE colaborador_id = ? ORDER BY criado_em DESC LIMIT 1`, [colab.id], (err2, exist) => {
                if (exist) {
                    db.run(`UPDATE experiencia_formularios SET respostas = ?, pontuacao = ?, situacao_avaliacao = ?, comentarios = ?, responsavel_nome = ?, situacao = 'finalizado', atualizado_em = datetime('now') WHERE id = ?`,
                        [JSON.stringify(respostas), pontuacao, situacao_avaliacao, comentarios, colab.responsavel_nome, exist.id], (err3) => {
                            if (err3) return res.status(500).json({ error: err3.message });
                            db.run(`INSERT INTO experiencia_notificacoes_pendentes (tipo, dados) VALUES (?, ?)`, ['formulario_finalizado', JSON.stringify({ colaborador_nome: colab.nome_completo, departamento: colab.departamento, resultado: situacao_avaliacao, pontuacao })]);
                            gerarESalvarPDFExperiencia(colab, respostas, pontuacao, situacao_avaliacao, comentarios);
                            res.json({ ok: true, responsavel_nome: colab.responsavel_nome, colaborador_nome: colab.nome_completo });
                        });
                } else {
                    db.run(`INSERT INTO experiencia_formularios (colaborador_id, responsavel_nome, respostas, pontuacao, situacao_avaliacao, comentarios, situacao) VALUES (?, ?, ?, ?, ?, ?, 'finalizado')`,
                        [colab.id, colab.responsavel_nome, JSON.stringify(respostas), pontuacao, situacao_avaliacao, comentarios], function (err3) {
                            if (err3) return res.status(500).json({ error: err3.message });
                            db.run(`INSERT INTO experiencia_notificacoes_pendentes (tipo, dados) VALUES (?, ?)`, ['formulario_finalizado', JSON.stringify({ colaborador_nome: colab.nome_completo, departamento: colab.departamento, resultado: situacao_avaliacao, pontuacao })]);
                            gerarESalvarPDFExperiencia(colab, respostas, pontuacao, situacao_avaliacao, comentarios);
                            res.json({ ok: true, form_id: this.lastID, responsavel_nome: colab.responsavel_nome, colaborador_nome: colab.nome_completo });
                        });
                }
            });
        });
    } catch (e) {
        res.status(400).json({ error: 'Token inválido ou expirado.' });
    }
});

// GET /api/experiencia — Lista colaboradores em ou que passaram pelo período de experiência
app.get('/api/experiencia', authenticateToken, (req, res) => {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    // Show all active collaborators with up to 90 days + those who already have a form
    db.all(`
        SELECT c.id, c.nome_completo, c.cargo, c.departamento, c.data_admissao,
               c.foto_base64,
               ef.id as form_id, ef.situacao, ef.situacao_avaliacao as formulario_resultado,
               ef.pontuacao, ef.notificacao_15d_enviada, ef.data_envio_email, ef.atualizado_em,
               (SELECT nome_completo FROM colaboradores WHERE id = d.responsavel_id) as responsavel_nome
        FROM colaboradores c
        LEFT JOIN experiencia_formularios ef ON ef.colaborador_id = c.id
        LEFT JOIN departamentos d ON LOWER(TRIM(d.nome)) = LOWER(TRIM(c.departamento))
        WHERE c.status != 'Desligado'
          AND c.data_admissao IS NOT NULL
          AND c.data_admissao != ''
        ORDER BY c.data_admissao DESC
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const result = rows.map(r => {
            const prazos = calcPrazoExp(r.data_admissao);
            if (!prazos) return null;

            const prazo2End = new Date(prazos.prazo2_fim + 'T23:59:59');
            const admDate = new Date(r.data_admissao.includes('/')
                ? r.data_admissao.split('/').reverse().join('-') + 'T12:00:00'
                : r.data_admissao + 'T12:00:00');
            const daysSinceAdm = Math.floor((hoje - admDate) / 86400000);

            // Include if: within 90-day period OR has a form
            if (daysSinceAdm > 120 && !r.form_id) return null;

            const diasRestantes = Math.ceil((prazo2End - hoje) / 86400000);
            return {
                ...r,
                prazo1_fim: prazos.prazo1_fim,
                prazo2_fim: prazos.prazo2_fim,
                dias_restantes: diasRestantes,
                formulario_situacao: r.situacao || 'pendente',
                formulario_resultado: r.formulario_resultado || null
            };
        }).filter(Boolean);

        res.json(result);
    });
});

// GET /api/experiencia/:colaborador_id — Detalhes + formulário
app.get('/api/experiencia/:colaborador_id', authenticateToken, (req, res) => {
    const { colaborador_id } = req.params;
    db.get(`SELECT c.*, 
            (SELECT nome_completo FROM colaboradores WHERE id = d.responsavel_id) as responsavel_nome
            FROM colaboradores c
            LEFT JOIN departamentos d ON LOWER(TRIM(d.nome)) = LOWER(TRIM(c.departamento))
            WHERE c.id = ?`, [colaborador_id], (err, colab) => {
        if (err || !colab) return res.status(404).json({ error: 'Colaborador não encontrado.' });

        db.get(`SELECT * FROM experiencia_formularios WHERE colaborador_id = ? ORDER BY criado_em DESC LIMIT 1`, [colaborador_id], (err2, form) => {
            let parsedForm = null;
            if (form) {
                parsedForm = { ...form };
                try { parsedForm.respostas = JSON.parse(form.respostas || '{}'); } catch (e) { parsedForm.respostas = {}; }
            }

            const prazos = calcPrazoExp(colab.data_admissao);
            res.json({ colaborador: { ...colab, ...prazos }, formulario: parsedForm });
        });
    });
});

// POST /api/experiencia/formulario — Cria formulário
app.post('/api/experiencia/formulario', authenticateToken, (req, res) => {
    const { colaborador_id, respostas, pontuacao, situacao_avaliacao, comentarios, situacao } = req.body;
    if (!colaborador_id) return res.status(400).json({ error: 'colaborador_id obrigatório.' });

    const respostasJson = JSON.stringify(respostas || {});
    const now = new Date().toISOString();

    db.run(`INSERT INTO experiencia_formularios 
            (colaborador_id, responsavel_nome, respostas, pontuacao, situacao_avaliacao, comentarios, situacao, criado_em, atualizado_em)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [colaborador_id, req.user?.nome || '', respostasJson, pontuacao || 0, situacao_avaliacao || '', comentarios || '', situacao || 'rascunho', now, now],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });

            if (situacao === 'finalizado') {
                // Notify RH users via pending notifications
                db.get('SELECT c.*, (SELECT nome_completo FROM colaboradores WHERE id = d.responsavel_id) as responsavel_nome FROM colaboradores c LEFT JOIN departamentos d ON LOWER(TRIM(d.nome)) = LOWER(TRIM(c.departamento)) WHERE c.id = ?', [colaborador_id], (e, c) => {
                    if (!e && c) {
                        db.run(`INSERT INTO experiencia_notificacoes_pendentes (tipo, dados) VALUES (?, ?)`,
                            ['formulario_finalizado', JSON.stringify({ colaborador_nome: c.nome_completo, departamento: c.departamento, resultado: situacao_avaliacao, pontuacao })]);
                        gerarESalvarPDFExperiencia(c, respostas, pontuacao, situacao_avaliacao, comentarios);
                    }
                });
            } else {
                db.get('SELECT c.*, (SELECT nome_completo FROM colaboradores WHERE id = d.responsavel_id) as responsavel_nome FROM colaboradores c LEFT JOIN departamentos d ON LOWER(TRIM(d.nome)) = LOWER(TRIM(c.departamento)) WHERE c.id = ?', [colaborador_id], (e, c) => {
                    if (!e && c) {
                        gerarESalvarPDFExperiencia(c, respostas, pontuacao, situacao_avaliacao, comentarios);
                    }
                });
            }

            res.status(201).json({ id: this.lastID, ok: true });
        }
    );
});

// PUT /api/experiencia/formulario/:id — Atualiza formulário
app.put('/api/experiencia/formulario/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { respostas, pontuacao, situacao_avaliacao, comentarios, situacao } = req.body;
    const respostasJson = JSON.stringify(respostas || {});
    const now = new Date().toISOString();

    db.run(`UPDATE experiencia_formularios SET respostas=?, pontuacao=?, situacao_avaliacao=?, comentarios=?, situacao=?, atualizado_em=?
            WHERE id=?`,
        [respostasJson, pontuacao || 0, situacao_avaliacao || '', comentarios || '', situacao || 'rascunho', now, id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });

            if (situacao === 'finalizado') {
                db.get('SELECT c.*, (SELECT nome_completo FROM colaboradores WHERE id = d.responsavel_id) as responsavel_nome FROM experiencia_formularios ef JOIN colaboradores c ON c.id = ef.colaborador_id LEFT JOIN departamentos d ON LOWER(TRIM(d.nome)) = LOWER(TRIM(c.departamento)) WHERE ef.id = ?', [id], (e, c) => {
                    if (!e && c) {
                        db.run(`INSERT INTO experiencia_notificacoes_pendentes (tipo, dados) VALUES (?, ?)`,
                            ['formulario_finalizado', JSON.stringify({ colaborador_nome: c.nome_completo, departamento: c.departamento, resultado: situacao_avaliacao, pontuacao })]);
                        gerarESalvarPDFExperiencia(c, respostas, pontuacao, situacao_avaliacao, comentarios);
                    }
                });
            } else {
                db.get('SELECT c.*, (SELECT nome_completo FROM colaboradores WHERE id = d.responsavel_id) as responsavel_nome FROM experiencia_formularios ef JOIN colaboradores c ON c.id = ef.colaborador_id LEFT JOIN departamentos d ON LOWER(TRIM(d.nome)) = LOWER(TRIM(c.departamento)) WHERE ef.id = ?', [id], (e, c) => {
                    if (!e && c) {
                        gerarESalvarPDFExperiencia(c, respostas, pontuacao, situacao_avaliacao, comentarios);
                    }
                });
            }

            res.json({ ok: true });
        }
    );
});

// GET /api/experiencia/notificacoes/pendentes — Polling para popup de RH
app.get('/api/experiencia/notificacoes/pendentes', authenticateToken, (req, res) => {
    db.all(`SELECT * FROM experiencia_notificacoes_pendentes WHERE lido = 0 ORDER BY criado_em DESC LIMIT 20`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// PUT /api/experiencia/notificacoes/:id/lida — Marca como lida
app.put('/api/experiencia/notificacoes/:id/lida', authenticateToken, (req, res) => {
    db.run(`UPDATE experiencia_notificacoes_pendentes SET lido = 1 WHERE id = ?`, [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ok: true });
    });
});


// GET /api/diretoria/notificacoes/pendentes
app.get('/api/diretoria/notificacoes/pendentes', authenticateToken, (req, res) => {
    db.all("SELECT * FROM diretoria_notificacoes_pendentes WHERE lido = 0 ORDER BY criado_em DESC LIMIT 20", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// PUT /api/diretoria/notificacoes/:id/lida
app.put('/api/diretoria/notificacoes/:id/lida', authenticateToken, (req, res) => {
    db.run("UPDATE diretoria_notificacoes_pendentes SET lido = 1 WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Lida' });
    });
});

// GET /api/logistica/notificacoes/pendentes — Polling para popup de Logística
app.get('/api/logistica/notificacoes/pendentes', authenticateToken, (req, res) => {
    db.all(`SELECT * FROM logistica_notificacoes_pendentes WHERE lido = 0 ORDER BY criado_em DESC LIMIT 20`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// PUT /api/logistica/notificacoes/:id/lida — Marca como lida
app.put('/api/logistica/notificacoes/:id/lida', authenticateToken, (req, res) => {
    db.run(`UPDATE logistica_notificacoes_pendentes SET lido = 1 WHERE id = ?`, [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ok: true });
    });
});

// POST /api/experiencia/enviar-email/:id — Envia e-mail manualmente para o gestor
app.post('/api/experiencia/enviar-email/:id', authenticateToken, (req, res) => {
    db.get(`SELECT c.id, c.nome_completo, c.cargo, c.departamento, c.data_admissao, c.email_corporativo,
                   d.responsavel_id,
                   (SELECT email_corporativo FROM colaboradores WHERE id = d.responsavel_id) as resp_email,
                   (SELECT nome_completo FROM colaboradores WHERE id = d.responsavel_id) as resp_nome,
                   ef.id as form_id, ef.situacao
            FROM colaboradores c
            LEFT JOIN departamentos d ON LOWER(TRIM(d.nome)) = LOWER(TRIM(c.departamento))
            LEFT JOIN experiencia_formularios ef ON ef.colaborador_id = c.id
            WHERE c.id = ?`, [req.params.id], async (err, r) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!r) return res.status(404).json({ error: 'Colaborador não encontrado' });

        const emailDestino = r.resp_email;
        const prazos = calcPrazoExp(r.data_admissao);
        const diasRestantes = prazos ? Math.ceil((new Date(prazos.prazo2_fim + 'T23:59:59') - new Date()) / 86400000) : '-';
        if (!emailDestino) return res.status(400).json({ error: 'Responsável do departamento não possui e-mail cadastrado.' });
        if (r.situacao === 'finalizado') return res.status(400).json({ error: 'O formulário já foi respondido e finalizado.' });
        if (diasRestantes !== '-' && diasRestantes < 0) return res.status(400).json({ error: 'O prazo de experiência deste colaborador já expirou.' });

        try {
            const transporter = nodemailer.createTransport(SMTP_CONFIG);

            let expiresInSeconds = 15 * 86400; // default 15 days
            if (prazos && prazos.prazo2_fim) {
                const expDate = new Date(prazos.prazo2_fim + 'T23:59:59');
                expDate.setDate(expDate.getDate() + 1); // dia seguinte
                const diff = Math.floor((expDate.getTime() - Date.now()) / 1000);
                if (diff > 0) expiresInSeconds = diff;
            }

            const tokenPayload = jwt.sign({
                colab_id: r.id,
                form_id: r.form_id || null
            }, SECRET_KEY, { expiresIn: expiresInSeconds });

            const formLink = `${req.protocol}://${req.get('host')}/avaliacao-publica.html?token=${tokenPayload}`;

            await sendMailHelper({
                from: `"América Rental RH" <${process.env.EMAIL_FROM || SMTP_CONFIG.auth.user}>`,
                to: emailDestino,
                subject: `Avaliação de Experiência — ${r.nome_completo}`,
                html: gerarEmailExperienciaHTML({
                    respNome: r.resp_nome,
                    nomeCompleto: r.nome_completo,
                    cargo: r.cargo,
                    prazos,
                    diasRestantes,
                    formLink,
                    tipo: 'manual'
                })
            });

            const dataEnvioDataTime = new Date().toISOString();
            if (r.form_id) {
                db.run(`UPDATE experiencia_formularios SET situacao = 'enviado', notificacao_15d_enviada = 1, data_envio_email = ? WHERE id = ?`, [dataEnvioDataTime, r.form_id]);
            } else {
                db.run(`INSERT INTO experiencia_formularios (colaborador_id, situacao, notificacao_15d_enviada, data_envio_email) VALUES (?, 'enviado', 1, ?)`, [r.id, dataEnvioDataTime]);
            }
            res.json({ ok: true, message: 'E-mail enviado com sucesso para ' + emailDestino });
        } catch (emailErr) {
            console.error('[Experiência Manual]', emailErr);
            res.status(500).json({ error: `Falha ao enviar e-mail: ${emailErr.message}` });
        }
    });
});

// CRON JOB — Verificar vencimentos de 15 dias e enviar e-mails
function verificarExperienciasVencendo() {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const em15Dias = new Date(hoje); em15Dias.setDate(em15Dias.getDate() + 15);
    const em15Str = em15Dias.toISOString().split('T')[0];

    db.all(`SELECT c.id, c.nome_completo, c.cargo, c.departamento, c.data_admissao, c.email_corporativo,
                   d.responsavel_id,
                   (SELECT email_corporativo FROM colaboradores WHERE id = d.responsavel_id) as resp_email,
                   (SELECT nome_completo FROM colaboradores WHERE id = d.responsavel_id) as resp_nome,
                   ef.id as form_id, ef.notificacao_15d_enviada, ef.situacao
            FROM colaboradores c
            LEFT JOIN departamentos d ON LOWER(TRIM(d.nome)) = LOWER(TRIM(c.departamento))
            LEFT JOIN experiencia_formularios ef ON ef.colaborador_id = c.id
            WHERE c.status = 'Ativo'
              AND c.data_admissao IS NOT NULL
              AND c.data_admissao != ''`, [], async (err, rows) => {
        if (err) { console.error('[Experiência CRON]', err.message); return; }

        for (const r of rows) {
            const prazos = calcPrazoExp(r.data_admissao);
            if (!prazos) continue;

            // Already sent or already has finalized form
            // Removed notificacao_15d_enviada block to ensure it sends daily until answered
            if (r.situacao === 'finalizado') continue;
            if (r.situacao === 'finalizado') continue;

            const diasRestantes = Math.ceil((new Date(prazos.prazo2_fim + 'T23:59:59') - hoje) / 86400000);

            if (diasRestantes > 0 && diasRestantes <= 15) {
                const emailDestino = r.resp_email;
                if (!emailDestino) {
                    console.log(`[Experiência CRON] Sem e-mail do responsável para ${r.nome_completo} (${r.departamento}).`);
                    continue;
                }

                // Send email
                try {
                    const transporter = nodemailer.createTransport(SMTP_CONFIG);

                    let expiresInSeconds = 15 * 86400; // default 15 days
                    if (prazos && prazos.prazo2_fim) {
                        const expDate = new Date(prazos.prazo2_fim + 'T23:59:59');
                        expDate.setDate(expDate.getDate() + 1); // dia seguinte
                        const diff = Math.floor((expDate.getTime() - Date.now()) / 1000);
                        if (diff > 0) expiresInSeconds = diff;
                    }

                    const tokenPayload = jwt.sign({
                        colab_id: r.id,
                        form_id: r.form_id || null
                    }, SECRET_KEY, { expiresIn: expiresInSeconds });

                    const baseUrl = process.env.BASE_URL || 'https://sistema-america.onrender.com';
                    const formLink = `${baseUrl}/avaliacao-publica.html?token=${tokenPayload}`;

                    await sendMailHelper({
                        from: `"América Rental RH" <${process.env.EMAIL_FROM || SMTP_CONFIG.auth.user}>`,
                        to: emailDestino,
                        subject: `Avaliação de Experiência — ${r.nome_completo} (${diasRestantes} dias restantes)`,
                        html: gerarEmailExperienciaHTML({
                            respNome: r.resp_nome,
                            nomeCompleto: r.nome_completo,
                            cargo: r.cargo,
                            prazos,
                            diasRestantes,
                            formLink,
                            tipo: 'automatico'
                        })
                    });

                    const dataEnvioDataTime = new Date().toISOString();
                    // Mark notification as sent
                    if (r.form_id) {
                        db.run(`UPDATE experiencia_formularios SET notificacao_15d_enviada = 1, data_envio_email = ? WHERE id = ?`, [dataEnvioDataTime, r.form_id]);
                    } else {
                        // Create a form record to track notification sent
                        db.run(`INSERT INTO experiencia_formularios (colaborador_id, situacao, notificacao_15d_enviada, data_envio_email) VALUES (?, 'enviado', 1, ?)`, [r.id, dataEnvioDataTime]);
                    }

                    console.log(`[Experiência CRON] E-mail enviado para ${emailDestino} sobre ${r.nome_completo}.`);
                } catch (emailErr) {
                    console.error(`[Experiência CRON] Erro no e-mail para ${r.nome_completo}:`, emailErr.message);
                }
            }
        }
    });
}

// CRON JOB — Verificar atestados vencidos e retornar para Ativo
function verificarAtestadosVencidos() {
    const todayStr = new Date().toISOString().split('T')[0];
    console.log(`[Atestados CRON] Verificando colaboradores Afastados em ${todayStr}...`);
    db.all(`SELECT id, nome_completo FROM colaboradores WHERE status = 'Afastado'`, [], (err, rows) => {
        if (err) { console.error('[Atestados CRON]', err.message); return; }
        if (!rows || rows.length === 0) { console.log('[Atestados CRON] Nenhum colaborador Afastado encontrado.'); return; }
        rows.forEach(colab => {
            db.get(`SELECT MAX(atestado_fim) as max_fim FROM documentos WHERE colaborador_id = ? AND tab_name = 'Atestados' AND atestado_tipo = 'dias' AND atestado_fim IS NOT NULL`, [colab.id], (err2, row2) => {
                if (!err2 && row2 && row2.max_fim) {
                    // Retorna para Ativo quando o ultimo dia do atestado JA PASSOU (data fim <= ontem)
                    // Ou seja: o colaborador retorna no dia SEGUINTE ao termino do atestado
                    if (row2.max_fim < todayStr) {
                        console.log(`[Atestados CRON] Retornando ${colab.nome_completo} para Ativo. Atestado terminou em ${row2.max_fim}`);
                        db.run("UPDATE colaboradores SET status = 'Ativo' WHERE id = ?", [colab.id], (e3) => {
                            if (e3) console.error(`[Atestados CRON] Erro ao atualizar status de ${colab.nome_completo}:`, e3.message);
                        });
                    } else {
                        console.log(`[Atestados CRON] ${colab.nome_completo} ainda afastado até ${row2.max_fim}.`);
                    }
                } else {
                    // Nao tem atestado com data fim registrado: retorna para Ativo por seguranca
                    console.log(`[Atestados CRON] ${colab.nome_completo} sem atestado com data fim. Retornando para Ativo.`);
                    db.run("UPDATE colaboradores SET status = 'Ativo' WHERE id = ?", [colab.id]);
                }
            });
        });
    });
}
// CRON JOB — Verificar CRLV Vencido (Logística)
function verificarCRLVVencidoCron() {
    console.log('[CRON] Verificando vencimento de CRLV...');
    db.all(`SELECT id, placa, marca_modelo_versao, exercicio, crlv_alerta_enviado FROM frota_veiculos WHERE exercicio IS NOT NULL AND exercicio != ''`, [], (err, veiculos) => {
        if (err) { console.error('[CRON CRLV]', err.message); return; }

        const now = new Date();
        const anoAtual = now.getFullYear();
        const mesAtual = now.getMonth(); // 0 a 11

        veiculos.forEach(v => {
            if (v.crlv_alerta_enviado) return; // Ja enviou alerta

            let p = v.placa.replace(/[^a-zA-Z0-9]/g, '');
            if (p.length < 7) return;
            const last = p[p.length - 1];
            let mesV = null;
            if (last === '1') mesV = 3;
            else if (last === '2') mesV = 4;
            else if (last === '3') mesV = 5;
            else if (last === '4') mesV = 6;
            else if (last === '5' || last === '6') mesV = 7;
            else if (last === '7') mesV = 8;
            else if (last === '8') mesV = 9;
            else if (last === '9') mesV = 10;
            else if (last === '0') mesV = 11;

            if (mesV === null) return;

            const anoVencimento = parseInt(v.exercicio) + 1;

            // Fica vencido (vermelho) no mês seguinte ao mesV do ano de vencimento
            let estaVencido = false;
            if (anoAtual > anoVencimento) estaVencido = true;
            else if (anoAtual === anoVencimento && mesAtual > mesV) estaVencido = true;

            if (estaVencido) {
                enviarEmailAlertaCRLV(v);
            }
        });
    });
}

function enviarEmailAlertaCRLV(v) {
    db.get(`SELECT (SELECT email_corporativo FROM colaboradores WHERE id = d.responsavel_id) as email 
            FROM departamentos d WHERE d.nome LIKE '%Log_stica%' LIMIT 1`, [], async (err, row) => {
        if (err || !row || !row.email) {
            console.log('[CRON CRLV] E-mail do responsável de Logística não encontrado para o veículo:', v.placa);
            return;
        }

        const emailDestino = row.email;
        const logoPath = path.join(__dirname, '..', 'frontend', 'assets', 'logo-header.png');

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="cid:empresa-logo" style="max-height: 80px;">
                </div>
                <h2 style="color: #c0392b; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">Aviso de Vencimento CRLV</h2>
                <p>O documento CRLV do veículo abaixo consta como <strong>vencido</strong> no sistema. Por favor, providencie a atualização do documento.</p>
                
                <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Placa:</strong> ${v.placa}</p>
                    <p><strong>Veículo:</strong> ${v.marca_modelo_versao || '-'}</p>
                    <p><strong>Exercício Atual:</strong> ${v.exercicio}</p>
                </div>

                <div style="margin-top: 30px; padding: 15px; border: 2px solid #3498db; border-radius: 8px; background: #ebf5fb; text-align: center;">
                    <p style="color: #2980b9; font-weight: bold; margin: 0;">
                        Por favor, acesse o módulo de Frota e atualize o ano de Exercício, anexando o novo CRLV.
                    </p>
                </div>

                <p style="margin-top: 30px; font-size: 0.9em; color: #7f8c8d;">Atenciosamente,<br>Sistema América Rental</p>
            </div>
        `;

        try {
            const transporter = nodemailer.createTransport(SMTP_CONFIG);
            await sendMailHelper({
                from: `"América Rental Sistema" <${SMTP_CONFIG.auth.user}>`,
                to: emailDestino,
                subject: `Aviso de CRLV Vencido - Veículo ${v.placa}`,
                html: htmlContent,
                attachments: [
                    {
                        filename: 'logo.png',
                        path: logoPath,
                        cid: 'empresa-logo'
                    }
                ]
            });

            db.run("UPDATE frota_veiculos SET crlv_alerta_enviado = 1 WHERE id = ?", [v.id]);
            console.log(`[CRON CRLV] E-mail de alerta enviado para ${emailDestino} (Placa: ${v.placa})`);
        } catch (e) {
            console.error('[CRON CRLV] Erro ao enviar e-mail:', e.message);
        }
    });
}

// =====================================================================
// CRON JOBS — Agendamento robusto com node-cron
// =====================================================================

// Variavel para rastrear a ultima execucao do cron
let _cronUltimaExecucao = null;

// Roda todos os dias às 08:00 (horário do servidor)
cron.schedule('0 8 * * *', () => {
    console.log('[CRON] Iniciando verificações diárias de 08:00...');
    _cronUltimaExecucao = new Date().toISOString();
    verificarExperienciasVencendo();
    verificarAtestadosVencidos();
    verificarCRLVVencidoCron();
    verificarLicencasVencimentoCron();
}, { timezone: 'America/Sao_Paulo' });

// Roda à meia-noite (00:01) para retornar colaboradores de atestado vencido
// Garante que o colaborador volta a Ativo logo na virada do dia
cron.schedule('1 0 * * *', () => {
    console.log('[CRON 00:01] Verificando atestados vencidos na virada do dia...');
    verificarAtestadosVencidos();
}, { timezone: 'America/Sao_Paulo' });

// Endpoint para forçar envio em lote (botão "Disparar E-mails")
app.post('/api/experiencia/cron/forcar', authenticateToken, async (req, res) => {
    console.log('[Disparar] Envio em lote iniciado por:', req.user?.username || 'sistema');
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    db.all(`SELECT c.id, c.nome_completo, c.cargo, c.departamento, c.data_admissao,
                   d.responsavel_id,
                   (SELECT email_corporativo FROM colaboradores WHERE id = d.responsavel_id) as resp_email,
                   (SELECT nome_completo FROM colaboradores WHERE id = d.responsavel_id) as resp_nome,
                   ef.id as form_id, ef.situacao
            FROM colaboradores c
            LEFT JOIN departamentos d ON LOWER(TRIM(d.nome)) = LOWER(TRIM(c.departamento))
            LEFT JOIN experiencia_formularios ef ON ef.colaborador_id = c.id
            WHERE c.status = 'Ativo'
              AND c.data_admissao IS NOT NULL
              AND c.data_admissao != ''`, [], async (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        let enviados = 0, pulados = 0, erros = 0;

        for (const r of rows) {
            const prazos = calcPrazoExp(r.data_admissao);
            if (!prazos) { pulados++; continue; }

            const diasRestantes = Math.ceil((new Date(prazos.prazo2_fim + 'T23:59:59') - hoje) / 86400000);

            // Só envia para colaboradores dentro da janela de 1 a 15 dias
            if (diasRestantes < 0 || diasRestantes > 15) { pulados++; continue; }
            if (r.situacao === 'finalizado') { pulados++; continue; }

            const emailDestino = r.resp_email;
            if (!emailDestino) {
                console.log(`[Disparar] Sem e-mail do responsável para ${r.nome_completo}`);
                pulados++;
                continue;
            }

            try {
                const transporter = nodemailer.createTransport(SMTP_CONFIG);

                let expiresInSeconds = 15 * 86400;
                if (prazos.prazo2_fim) {
                    const expDate = new Date(prazos.prazo2_fim + 'T23:59:59');
                    expDate.setDate(expDate.getDate() + 1);
                    const diff = Math.floor((expDate.getTime() - Date.now()) / 1000);
                    if (diff > 0) expiresInSeconds = diff;
                }

                const tokenPayload = jwt.sign({
                    colab_id: r.id,
                    form_id: r.form_id || null
                }, SECRET_KEY, { expiresIn: expiresInSeconds });

                const formLink = `${baseUrl}/avaliacao-publica.html?token=${tokenPayload}`;

                await sendMailHelper({
                    from: `"América Rental RH" <${process.env.EMAIL_FROM || SMTP_CONFIG.auth.user}>`,
                    to: emailDestino,
                    subject: `Avaliação de Experiência — ${r.nome_completo} (${diasRestantes} dias restantes)`,
                    html: gerarEmailExperienciaHTML({
                        respNome: r.resp_nome,
                        nomeCompleto: r.nome_completo,
                        cargo: r.cargo,
                        prazos,
                        diasRestantes,
                        formLink,
                        tipo: 'automatico'
                    })
                });

                const dataEnvio = new Date().toISOString();
                if (r.form_id) {
                    db.run(`UPDATE experiencia_formularios SET situacao = 'enviado', notificacao_15d_enviada = 1, data_envio_email = ? WHERE id = ?`, [dataEnvio, r.form_id]);
                } else {
                    db.run(`INSERT INTO experiencia_formularios (colaborador_id, situacao, notificacao_15d_enviada, data_envio_email) VALUES (?, 'enviado', 1, ?)`, [r.id, dataEnvio]);
                }

                console.log(`[Disparar] E-mail enviado para ${emailDestino} sobre ${r.nome_completo}`);
                enviados++;
            } catch (emailErr) {
                console.error(`[Disparar] Erro ao enviar para ${r.nome_completo}:`, emailErr.message);
                erros++;
            }
        }

        res.json({ ok: true, enviados, pulados, erros, message: `${enviados} e-mail(s) enviado(s), ${pulados} pulado(s), ${erros} erro(s).` });
    });
});

// Endpoint para checar status do CRON (usado pelo frontend)
app.get('/api/experiencia/cron/status', authenticateToken, (req, res) => {
    res.json({ ultimaExecucao: _cronUltimaExecucao });
});

// Executa uma vez ao iniciar o servidor (com delay de 15s para o DB estar pronto)
setTimeout(() => {
    console.log('[CRON] Verificação inicial ao iniciar servidor...');
    _cronUltimaExecucao = new Date().toISOString();
    verificarExperienciasVencendo();
    verificarAtestadosVencidos();
}, 15000);

// =====================================================================
// MÓDULO: LOGÍSTICA — Ordens de Serviço (Rota Redonda)
// =====================================================================

// Cria tabela de OS de logística com suporte a coordenadas GPS
db.run(`CREATE TABLE IF NOT EXISTS os_logistica (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_os TEXT,
    tipo_os TEXT,
    cliente TEXT,
    endereco TEXT,
    complemento TEXT,
    cep TEXT,
    lat REAL,
    lng REAL,
    contrato TEXT,
    data_os TEXT,
    responsavel TEXT,
    telefone TEXT,
    email TEXT,
    tipo_servico TEXT,
    hora_inicio TEXT,
    hora_fim TEXT,
    turno TEXT,
    dias_semana TEXT,
    produtos TEXT,
    observacoes TEXT,
    observacoes_internas TEXT,
    habilidades TEXT,
    variaveis TEXT,
    link_video TEXT,
    patrimonio TEXT,
    status TEXT DEFAULT 'ativo',
    criado_em TEXT DEFAULT (datetime('now')),
    atualizado_em TEXT DEFAULT (datetime('now'))
)`, (err) => {
    if (err) console.error('[OS Logística] Erro na criação da tabela:', err.message);
    else {
        console.log('[OS Logística] Tabela os_logistica OK');
        db.run("ALTER TABLE os_logistica ADD COLUMN observacoes_internas TEXT", () => { });
        db.run("ALTER TABLE os_logistica ADD COLUMN habilidades TEXT", () => { });
        db.run("ALTER TABLE os_logistica ADD COLUMN variaveis TEXT", () => { });
        db.run("ALTER TABLE os_logistica ADD COLUMN patrimonio TEXT", () => { });
    }
});

// Tabela de vídeos das OS (token público UUID, imutável)
db.run(`CREATE TABLE IF NOT EXISTS os_videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE NOT NULL,
    short_code TEXT UNIQUE,
    os_id INTEGER,
    numero_os TEXT,
    nome_original TEXT,
    mime_type TEXT,
    tamanho INTEGER,
    caminho_arquivo TEXT NOT NULL,
    criado_em TEXT DEFAULT (datetime('now'))
)`, (err) => {
    if (err) console.error('[OS Vídeos] Erro na criação da tabela:', err.message);
    else {
        console.log('[OS Vídeos] Tabela os_videos OK');
        db.run("ALTER TABLE os_videos ADD COLUMN short_code TEXT", () => { });
    }
});

// Diretório de vídeos das OS
const OS_VIDEO_DIR = path.join(__dirname, 'uploads', 'os_videos');
if (!fs.existsSync(OS_VIDEO_DIR)) fs.mkdirSync(OS_VIDEO_DIR, { recursive: true });

// Multer para vídeos (sem limite de tamanho fixo — ajustar conforme necessário)
const multerVideo = require('multer')({
    storage: require('multer').diskStorage({
        destination: (req, file, cb) => cb(null, OS_VIDEO_DIR),
        filename: (req, file, cb) => {
            const token = require('crypto').randomUUID();
            req._videoToken = token;
            const ext = path.extname(file.originalname) || '.mp4';
            cb(null, token + ext);
        }
    }),
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('video/')) cb(null, true);
        else cb(new Error('Apenas arquivos de vídeo são aceitos.'));
    }
});

// Gera short_code único de 6 chars (alfanumérico case-insensitive)
function gerarShortCode() {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789'; // sem 0,1,i,l,o para evitar confusão
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

// ── UPLOAD DE VÍDEO (autenticado) ────────────────────────────────────────────
app.post('/api/logistica/os/upload-video', authenticateToken, multerVideo.single('video'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    const token = req._videoToken || path.basename(req.file.filename, path.extname(req.file.filename));
    const { os_id, numero_os } = req.body;
    const shortCode = gerarShortCode();

    try {
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
            resource_type: "video",
            folder: "os_videos"
        });

        // Delete the temporary file from local disk
        fs.unlinkSync(req.file.path);

        const cloudinaryUrl = result.secure_url;
        const handleResponse = () => res.json({ ok: true, token, short_code: shortCode, link: cloudinaryUrl, short_link: cloudinaryUrl, nome: req.file.originalname });

        // Save reference in os_videos (optional, but good for tracking)
        db.run(
            `INSERT INTO os_videos (token, short_code, os_id, numero_os, nome_original, mime_type, tamanho, caminho_arquivo)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [token, shortCode, os_id || null, numero_os || null, req.file.originalname, req.file.mimetype, req.file.size, cloudinaryUrl],
            function (err) {
                if (err) console.error('[OS Videos] Erro ao registrar vídeo no banco:', err.message);
                
                if (numero_os) {
                    db.get('SELECT link_video FROM os_logistica WHERE numero_os = ?', [numero_os], (errSelect, row) => {
                        let newLinks = [cloudinaryUrl];
                        if (row && row.link_video) {
                            try {
                                const parsed = JSON.parse(row.link_video);
                                if (Array.isArray(parsed)) newLinks = [...parsed, cloudinaryUrl];
                                else newLinks = [row.link_video, cloudinaryUrl];
                            } catch(e) {
                                if (row.link_video.trim() !== '') {
                                    newLinks = row.link_video.split(',').map(s=>s.trim()).filter(Boolean);
                                    newLinks.push(cloudinaryUrl);
                                }
                            }
                        }
                        db.run('UPDATE os_logistica SET link_video = ? WHERE numero_os = ?', [JSON.stringify(newLinks), numero_os], handleResponse);
                    });
                } else if (os_id) {
                    db.get('SELECT link_video FROM os_logistica WHERE id = ?', [os_id], (errSelect, row) => {
                        let newLinks = [cloudinaryUrl];
                        if (row && row.link_video) {
                            try {
                                const parsed = JSON.parse(row.link_video);
                                if (Array.isArray(parsed)) newLinks = [...parsed, cloudinaryUrl];
                                else newLinks = [row.link_video, cloudinaryUrl];
                            } catch(e) {
                                if (row.link_video.trim() !== '') {
                                    newLinks = row.link_video.split(',').map(s=>s.trim()).filter(Boolean);
                                    newLinks.push(cloudinaryUrl);
                                }
                            }
                        }
                        db.run('UPDATE os_logistica SET link_video = ? WHERE id = ?', [JSON.stringify(newLinks), os_id], handleResponse);
                    });
                } else {
                    handleResponse();
                }
            }
        );
    } catch (error) {
        console.error('[Cloudinary Upload Error]', error);
        // Ensure local file is deleted even if upload fails
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(500).json({ error: 'Falha ao fazer upload para nuvem. ' + (error.message || '') });
    }
});

// ── ROTA CURTA PÚBLICA: /v/:code → redireciona para streaming ─────────────────
// Link amigável para compartilhar (ex: /v/abc123)
app.get('/v/:code', (req, res) => {
    const code = (req.params.code || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
    if (!code) return res.status(400).send('Código inválido.');
    db.get(`SELECT token FROM os_videos WHERE short_code = ?`, [code], (err, row) => {
        if (err || !row) return res.status(404).send('Vídeo não encontrado.');
        res.redirect(302, `/api/video/${row.token}`);
    });
});

// ── STREAMING PÚBLICO DE VÍDEO (SEM autenticação, SEM dados do sistema) ──────
// Acesso apenas via token UUID — não expõe nenhuma informação interna
app.get('/api/video/:token', (req, res) => {
    const token = (req.params.token || '').replace(/[^a-zA-Z0-9\-]/g, '');
    if (!token) return res.status(400).send('Token inválido.');

    db.get(`SELECT caminho_arquivo, mime_type, nome_original, tamanho FROM os_videos WHERE token = ?`, [token], (err, row) => {
        if (err || !row) return res.status(404).send('Vídeo não encontrado.');
        if (!fs.existsSync(row.caminho_arquivo)) return res.status(404).send('Arquivo não localizado.');

        const stat = fs.statSync(row.caminho_arquivo);
        const fileSize = stat.size;
        const mimeType = row.mime_type || 'video/mp4';
        const range = req.headers.range;

        if (range) {
            // Suporte a streaming por range (para reprodução no browser)
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunkSize = end - start + 1;
            const file = fs.createReadStream(row.caminho_arquivo, { start, end });
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': mimeType,
                'Content-Disposition': `inline; filename="${encodeURIComponent(row.nome_original || 'video.mp4')}"`,
                'Cache-Control': 'no-store'
            });
            file.pipe(res);
        } else {
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': mimeType,
                'Content-Disposition': `inline; filename="${encodeURIComponent(row.nome_original || 'video.mp4')}"`,
                'Cache-Control': 'no-store'
            });
            fs.createReadStream(row.caminho_arquivo).pipe(res);
        }
    });
});

// Função Haversine — calcula distância em km entre duas coordenadas GPS
function haversineKm(lat1, lng1, lat2, lng2) {
    const parseCoord = (c) => typeof c === 'string' ? parseFloat(c.replace(',', '.')) : parseFloat(c);
    const l1 = parseCoord(lat1);
    const ln1 = parseCoord(lng1);
    const l2 = parseCoord(lat2);
    const ln2 = parseCoord(lng2);

    if (isNaN(l1) || isNaN(ln1) || isNaN(l2) || isNaN(ln2)) return Infinity;

    const R = 6371;
    const dLat = (l2 - l1) * Math.PI / 180;
    const dLng = (ln2 - ln1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(l1 * Math.PI / 180) * Math.cos(l2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

app.get('/api/limpar-os-teste', (req, res) => {
    db.run("DELETE FROM os_logistica");
    db.run("DELETE FROM os_videos");
    res.json({ ok: true, message: "Base de OS Logística resetada para testes." });
});

// GET /api/logistica/os/agenda-endereco
// Busca OS de manutenção pelo endereço (exata e parcial).
// Retorna os dias da semana programados para o mesmo endereço.
app.get('/api/logistica/os/agenda-endereco', authenticateToken, (req, res) => {
    const { endereco, lat, lng } = req.query;
    if (!endereco && (!lat || !lng)) {
        return res.status(400).json({ error: 'Forneça "endereco" ou "lat" e "lng".' });
    }

    // 1. Busca exata e parcial pelo texto do endereço
    const endTrimmed = (endereco || '').trim();
    // Separa por espaços/vírgulas e pega até os 6 primeiros termos (inclui número da casa)
    const endTokens = endTrimmed.split(/[\s,]+/).filter(t => t.length >= 1).slice(0, 6);

    // Gera condições LIKE dinâmicas para todos os tokens extraídos
    const likeConditions = endTokens.map(() => `endereco LIKE ?`).join(' AND ');
    const likeParams = endTokens.map(t => `%${t}%`);

    const sqlExato = likeConditions
        ? `SELECT id, numero_os, cliente, endereco, tipo_servico, dias_semana, lat, lng, hora_inicio, hora_fim, turno
           FROM os_logistica WHERE status = 'ativo' AND (${likeConditions})
           ORDER BY criado_em DESC LIMIT 50`
        : `SELECT id, numero_os, cliente, endereco, tipo_servico, dias_semana, lat, lng, hora_inicio, hora_fim, turno
           FROM os_logistica WHERE status = 'ativo' AND endereco LIKE ? ORDER BY criado_em DESC LIMIT 50`;

    const finalParams = likeConditions ? likeParams : [`%${endTrimmed}%`];

    db.all(sqlExato, finalParams, (err, rowsExatos) => {
        if (err) return res.status(500).json({ error: err.message });

        // 2. Se tiver coordenadas, busca e classifica APENAS por distância (haversine)
        if (lat && lng) {
            const userLat = typeof lat === 'string' ? parseFloat(lat.replace(',', '.')) : parseFloat(lat);
            const userLng = typeof lng === 'string' ? parseFloat(lng.replace(',', '.')) : parseFloat(lng);

            db.all(`SELECT id, numero_os, cliente, endereco, tipo_servico, dias_semana, lat, lng, hora_inicio, hora_fim, turno
                    FROM os_logistica WHERE status = 'ativo' AND lat IS NOT NULL AND lng IS NOT NULL`, [], (err2, todasOs) => {
                if (err2) return res.status(500).json({ error: err2.message });

                // Classifica TODAS as OS por distância real (ignora texto) e filtra apenas RECORRENTES
                const todasComDistancia = (todasOs || [])
                    .filter(os => isRecorrente(os.tipo_servico))
                    .map(os => {
                        const distancia = haversineKm(userLat, userLng, os.lat, os.lng);
                        return { ...os, distancia_km: Math.round(distancia * 100) / 100 };
                    })
                    .filter(os => os.distancia_km <= 3) // só retorna até 3km
                    .sort((a, b) => a.distancia_km - b.distancia_km);

                // Faixas de distância: ≤1km (muito próximo), 1-3km (próximo)
                const os1km = todasComDistancia.filter(os => os.distancia_km <= 1);
                const os3km = todasComDistancia.filter(os => os.distancia_km > 1 && os.distancia_km <= 3);

                // "Exatos por coordenada": OS a menos de 0.1km (100m) — realmente no mesmo local
                const exatosCoord = todasComDistancia
                    .filter(os => os.distancia_km <= 0.1)
                    .slice(0, 15);

                // "Próximos" = tudo de 0.1km até 3km
                const proximosCoord = todasComDistancia
                    .filter(os => os.distancia_km > 0.1)
                    .slice(0, 15)
                    .map(os => ({ ...os, dias_semana_arr: parseDias(os.dias_semana) }));

                const diasSugeridos1km = agregaDias(os1km);
                const diasSugeridos3km = agregaDias(os3km);

                res.json({
                    exatos: exatosCoord,                    // OS a ≤100m (coordenada)
                    dias_sugeridos_2km: diasSugeridos1km,  // mantém nome do campo para compat. frontend
                    dias_sugeridos_5km: diasSugeridos3km,  // mantém nome do campo para compat. frontend
                    proximos: proximosCoord,               // 0.1 a 3km
                    total_exatos: exatosCoord.length,
                    total_proximos: proximosCoord.length,
                    modo: 'coordenadas',                   // indica ao frontend que está usando coordenadas
                    faixas: { verde: 1, amarelo: 3 }
                });
            });
        } else {
            // Sem coordenadas: usa só busca por texto
            const exatosFiltrados = (rowsExatos || []).filter(os => isRecorrente(os.tipo_servico));
            const diasAgregados = agregaDias(exatosFiltrados);
            res.json({
                exatos: exatosFiltrados,
                dias_sugeridos_2km: diasAgregados,
                dias_sugeridos_5km: [],
                proximos: [],
                total_exatos: exatosFiltrados.length,
                total_proximos: 0,
                modo: 'texto'
            });
        }
    });
});

function parseDias(diasJson) {
    if (!diasJson) return [];
    try { return JSON.parse(diasJson); } catch { return []; }
}

// Agrega e conta dias da semana mais frequentes nas OS retornadas
function agregaDias(rows) {
    const contagem = {};
    const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    for (const os of rows) {
        const dias = parseDias(os.dias_semana);
        for (const d of dias) {
            contagem[d] = (contagem[d] || 0) + 1;
        }
    }
    return DIAS.filter(d => contagem[d] > 0).map(d => ({ dia: d, ocorrencias: contagem[d] }))
        .sort((a, b) => b.ocorrencias - a.ocorrencias);
}

// GET /api/logistica/os/buscar — Busca OS por número
// Retorna array de todos os serviços registrados para esse número de OS
app.get('/api/logistica/os/buscar', authenticateToken, (req, res) => {
    const { numero_os, cliente, contrato, endereco, patrimonio } = req.query;
    if (!numero_os && !cliente && !contrato && !endereco && !patrimonio) {
        db.all(
            `SELECT * FROM os_logistica WHERE status = 'ativo' ORDER BY criado_em DESC LIMIT 200`,
            [],
            (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(rows || []);
            }
        );
        return;
    }

    if (numero_os) {
        db.all(
            `SELECT * FROM os_logistica WHERE numero_os = ? AND status = 'ativo' ORDER BY criado_em DESC`,
            [numero_os.trim()],
            (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                if (!rows || rows.length === 0) return res.status(404).json({ error: 'OS não encontrada.' });
                res.json(rows);
            }
        );
    } else if (cliente) {
        db.all(
            `SELECT * FROM os_logistica WHERE status = 'ativo' ORDER BY criado_em DESC`,
            [],
            (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });

                // Filtro em memória para ignorar acentos corretamente
                const term = cliente.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

                const filtered = (rows || []).filter(r => {
                    if (!r.cliente) return false;
                    // Remove emojis e espaços extras apenas para a comparação
                    let c = r.cliente.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\uFE0F\s🏗🎉⭕🔶💧💦⚙️📋🛒♦️♻️🔗❗⏰📞🌀🚨🦺👷🔛🌘]+/u, '').trim();
                    c = c.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                    return c.includes(term);
                });

                res.json(filtered);
            }
        );
    } else if (contrato) {
        db.all(
            `SELECT * FROM os_logistica WHERE contrato LIKE ? AND status = 'ativo' ORDER BY criado_em DESC`,
            [`%${contrato.trim()}%`],
            (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                if (!rows || rows.length === 0) return res.status(200).json([]);
                res.json(rows);
            }
        );
    } else if (endereco) {
        db.all(
            `SELECT * FROM os_logistica WHERE status = 'ativo' ORDER BY criado_em DESC`,
            [],
            (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });

                // Filtro em memória para ignorar acentos corretamente
                const term = endereco.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

                const filtered = (rows || []).filter(r => {
                    if (!r.endereco) return false;
                    let end = r.endereco.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                    return end.includes(term);
                });

                res.json(filtered);
            }
        );
    } else if (patrimonio) {
        db.all(
            `SELECT * FROM os_logistica WHERE patrimonio = ? AND status = 'ativo' ORDER BY criado_em DESC`,
            [patrimonio.trim()],
            (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                if (!rows || rows.length === 0) return res.status(200).json([]);
                res.json(rows);
            }
        );
    }
});

// POST /api/logistica/os — Salvar nova OS (com validação de conflito de cliente)
app.post('/api/logistica/os', authenticateToken, (req, res) => {
    const {
        numero_os, tipo_os, cliente, endereco, complemento, cep, lat, lng,
        contrato, data_os, responsavel, telefone, email, tipo_servico,
        hora_inicio, hora_fim, turno, dias_semana, produtos, observacoes,
        observacoes_internas, habilidades, variaveis, link_video, patrimonio
    } = req.body;
    const loggedUser = req.user ? (req.user.username || req.user.nome || 'UNKNOWN') : 'SYSTEM';

    if (!numero_os || !cliente) {
        return res.status(400).json({ error: 'Número da OS e nome do cliente são obrigatórios.' });
    }

    const sanitizeCliente = (str) => (str || '').replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\uFE0F\s🏗🎉⭕🔶💧💦⚙️📋🛒♦️♻️🔗❗⏰📞🌀🚨🦵👷🔛🌘🟢🔴🔄💙💜🟦🟣🔵♿🚿🚽🧴⬜⚪🛤🧊]+/u, '').trim().toLowerCase();

    // Verifica se já existe uma OS com esse número mas cliente DIFERENTE
    db.get(
        `SELECT cliente FROM os_logistica WHERE numero_os = ? AND status = 'ativo' LIMIT 1`,
        [numero_os.trim()],
        (errCheck, existente) => {
            if (errCheck) return res.status(500).json({ error: errCheck.message });

            if (existente) {
                const clienteExistente = sanitizeCliente(existente.cliente);
                const clienteNovo = sanitizeCliente(cliente);
                if (clienteExistente !== clienteNovo) {
                    return res.status(409).json({
                        error: `O número de OS "${numero_os}" já está cadastrado para o cliente: "${existente.cliente}". Não é possível usar este número para outro cliente.`,
                        cliente_existente: existente.cliente
                    });
                }
            }

            // Cliente OK (mesmo ou nova OS) — insere
            db.run(`INSERT INTO os_logistica (numero_os, tipo_os, cliente, endereco, complemento, cep, lat, lng,
                contrato, data_os, responsavel, telefone, email, tipo_servico, hora_inicio, hora_fim,
                turno, dias_semana, produtos, observacoes, observacoes_internas, habilidades, variaveis, link_video, patrimonio)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [numero_os, tipo_os, cliente, endereco, complemento, cep,
                    lat ? parseFloat(lat) : null, lng ? parseFloat(lng) : null,
                    contrato, data_os, responsavel, telefone, email, tipo_servico,
                    hora_inicio, hora_fim, turno,
                    typeof dias_semana === 'object' ? JSON.stringify(dias_semana) : dias_semana,
                    typeof produtos === 'object' ? JSON.stringify(produtos) : produtos,
                    observacoes, observacoes_internas,
                    typeof habilidades === 'object' ? JSON.stringify(habilidades) : habilidades,
                    typeof variaveis === 'object' ? JSON.stringify(variaveis) : variaveis,
                    link_video, patrimonio],
                function (err) {
                    if (err) return res.status(500).json({ error: err.message });
                    const newId = this.lastID;
                    db.run(`INSERT INTO auditoria (usuario, programa, campo, conteudo_anterior, conteudo_atual, registro_id) VALUES (?, ?, ?, ?, ?, ?)`,
                        [loggedUser, 'OS Logística', 'Criação de OS', '', `OS ${numero_os} | ${cliente} | ${tipo_servico || ''}`, newId]);
                    res.status(201).json({ ok: true, id: newId });
                }
            );
        }
    );
});




app.put('/api/logistica/os/:id', authenticateToken, (req, res) => {
    const {
        numero_os, tipo_os, cliente, endereco, complemento, cep, lat, lng,
        contrato, data_os, responsavel, telefone, email, tipo_servico,
        hora_inicio, hora_fim, turno, dias_semana, produtos, observacoes,
        observacoes_internas, habilidades, variaveis, link_video, patrimonio
    } = req.body;
    const loggedUser = req.user ? (req.user.username || req.user.nome || 'UNKNOWN') : 'SYSTEM';
    const osId = req.params.id;

    const sanitizeCliente = (str) => (str || '').replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\uFE0F\s🏗🎉⭕🔶💧💦⚙️📋🛒♦️♻️🔗❗⏰📞🌀🚨🦵👷🔛🌘🟢🔴🔄💙💜🟦🟣🔵♿🚿🚽🧴⬜⚪🛤🧊]+/u, '').trim().toLowerCase();

    db.get(`SELECT * FROM os_logistica WHERE id = ?`, [osId], (errOld, oldRow) => {
        db.get(`SELECT cliente FROM os_logistica WHERE numero_os = ? AND id != ? AND status = 'ativo' LIMIT 1`, [numero_os?.trim(), osId], (errCheck, existente) => {
            if (errCheck) return res.status(500).json({ error: errCheck.message });

            if (existente) {
                const clienteExistente = sanitizeCliente(existente.cliente);
                const clienteNovo = sanitizeCliente(cliente);
                if (clienteExistente !== clienteNovo) {
                    return res.status(409).json({
                        error: `O número de OS "${numero_os}" já está cadastrado para o cliente: "${existente.cliente}". Não é possível usar este número para outro cliente.`,
                        cliente_existente: existente.cliente
                    });
                }
            }

            db.run(`UPDATE os_logistica SET 
                numero_os=?, tipo_os=?, cliente=?, endereco=?, complemento=?, cep=?, lat=?, lng=?,
                contrato=?, data_os=?, responsavel=?, telefone=?, email=?, tipo_servico=?, hora_inicio=?, hora_fim=?,
                turno=?, dias_semana=?, produtos=?, observacoes=?, observacoes_internas=?, habilidades=?, variaveis=?, link_video=?, patrimonio=?,
                atualizado_em=datetime('now') WHERE id=?`,
                [numero_os, tipo_os, cliente, endereco, complemento, cep,
                    lat ? parseFloat(lat) : null, lng ? parseFloat(lng) : null,
                    contrato, data_os, responsavel, telefone, email, tipo_servico,
                    hora_inicio, hora_fim, turno,
                    typeof dias_semana === 'object' ? JSON.stringify(dias_semana) : dias_semana,
                    typeof produtos === 'object' ? JSON.stringify(produtos) : produtos,
                    observacoes, observacoes_internas,
                    typeof habilidades === 'object' ? JSON.stringify(habilidades) : habilidades,
                    typeof variaveis === 'object' ? JSON.stringify(variaveis) : variaveis,
                    link_video, patrimonio, osId],
                function (err) {
                    if (err) return res.status(500).json({ error: err.message });

                    // Auditoria: detectar campos alterados
                    if (oldRow) {
                        const changes = [];
                        if (oldRow.cliente !== cliente) changes.push({ campo: 'Cliente', old: oldRow.cliente || '', new: cliente || '' });
                        if (oldRow.endereco !== endereco) changes.push({ campo: 'Endereço', old: oldRow.endereco || '', new: endereco || '' });
                        if (oldRow.tipo_servico !== tipo_servico) changes.push({ campo: 'Tipo de Serviço', old: oldRow.tipo_servico || '', new: tipo_servico || '' });
                        if (oldRow.data_os !== data_os) changes.push({ campo: 'Data', old: oldRow.data_os || '', new: data_os || '' });
                        if (oldRow.responsavel !== responsavel) changes.push({ campo: 'Responsável', old: oldRow.responsavel || '', new: responsavel || '' });
                        if (oldRow.telefone !== telefone) changes.push({ campo: 'Telefone', old: oldRow.telefone || '', new: telefone || '' });
                        if (oldRow.observacoes !== observacoes) changes.push({ campo: 'Observações', old: oldRow.observacoes || '', new: observacoes || '' });
                        if (oldRow.turno !== turno) changes.push({ campo: 'Turno', old: oldRow.turno || '', new: turno || '' });
                        if (oldRow.hora_inicio !== hora_inicio || oldRow.hora_fim !== hora_fim) changes.push({ campo: 'Horário', old: `${oldRow.hora_inicio||''}-${oldRow.hora_fim||''}`, new: `${hora_inicio||''}-${hora_fim||''}` });
                        if (changes.length === 0) changes.push({ campo: 'Atualização', old: '', new: `OS ${numero_os} | ${cliente}` });
                        changes.forEach(c => {
                            db.run(`INSERT INTO auditoria (usuario, programa, campo, conteudo_anterior, conteudo_atual, registro_id) VALUES (?, ?, ?, ?, ?, ?)`,
                                [loggedUser, 'OS Logística', c.campo, c.old, c.new, osId]);
                        });
                    }

                    res.json({ ok: true });
                }
            );
        });
    });
});


// DELETE /api/logistica/os/:id — Excluir OS
app.delete('/api/logistica/os/:id', authenticateToken, (req, res) => {
    const loggedUser = req.user ? (req.user.username || req.user.nome || 'UNKNOWN') : 'SYSTEM';
    db.get('SELECT numero_os, cliente FROM os_logistica WHERE id = ?', [req.params.id], (err, row) => {
        db.run("DELETE FROM os_logistica WHERE id = ?", [req.params.id], function (err2) {
            if (err2) return res.status(500).json({ error: err2.message });
            if (row) {
                db.run(`INSERT INTO auditoria (usuario, programa, campo, conteudo_anterior, conteudo_atual, registro_id) VALUES (?, ?, ?, ?, ?, ?)`,
                    [loggedUser, 'OS Logística', 'Exclusão de OS', `OS ${row.numero_os} | ${row.cliente}`, '', req.params.id]);
            }
            res.json({ ok: true });
        });
    });
});

// GET /api/logistica/os/:id/historico — Histórico de alterações de uma OS específica
app.get('/api/logistica/os/:id/historico', authenticateToken, (req, res) => {
    db.all(`SELECT a.* FROM auditoria a WHERE a.programa = 'OS Logística' AND a.registro_id = ?
            ORDER BY a.data_hora DESC LIMIT 100`,
        [req.params.id], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows || []);
        });
});

// POST /api/logistica/import-bulk — Importação em massa
app.post('/api/logistica/import-bulk', (req, res) => {
    const records = req.body;
    if (!Array.isArray(records)) return res.status(400).json({ error: 'Expected array' });

    let inserted = 0;
    const stmt = db.prepare(`INSERT INTO os_logistica (numero_os, tipo_os, cliente, endereco, cep, lat, lng, 
        data_os, responsavel, telefone, email, tipo_servico, hora_inicio, hora_fim, turno, dias_semana, 
        produtos, observacoes, observacoes_internas, habilidades) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        records.forEach(r => {
            stmt.run([r.numero_os, r.tipo_os, r.cliente, r.endereco, r.cep, r.lat, r.lng,
            r.data_os, r.responsavel, r.telefone, r.email, r.tipo_servico, r.hora_inicio, r.hora_fim,
            r.turno, JSON.stringify(r.dias_semana || []), JSON.stringify(r.produtos || []),
            r.observacoes, r.observacoes_internas, r.habilidades]);
            inserted++;
        });
        stmt.finalize();
        db.run("COMMIT", (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ ok: true, count: inserted });
        });
    });
});

// =====================================================================



// GET /api/logistica/frota - Agrupa OS por data para resumo de frota
app.get('/api/logistica/frota', authenticateToken, (req, res) => {
    const { data } = req.query;
    if (!data) return res.status(400).json({ error: 'Parâmetro data é obrigatório.' });
    db.all(
        `SELECT * FROM os_logistica WHERE data_os = ? AND status = 'ativo' ORDER BY cliente ASC`,
        [data],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            const result = {};
            (rows || []).forEach(r => {
                let prods = [];
                try { prods = JSON.parse(r.produtos || '[]'); } catch (e) { prods = []; }
                let vars = [];
                try { vars = JSON.parse(r.variaveis || '[]'); } catch (e) { vars = []; }
                let habs = [];
                try { habs = JSON.parse(r.habilidades || '[]'); } catch (e) { habs = []; }
                let diasSemana = [];
                try { diasSemana = JSON.parse(r.dias_semana || '[]'); } catch (e) { diasSemana = []; }
                const veiculo = r.patrimonio && r.patrimonio.trim() ? r.patrimonio.trim().toUpperCase() : 'SEM VEÍCULO';
                if (!result[veiculo]) result[veiculo] = { rotas: [], totalQtd: 0, servicosContagem: {}, produtosContagem: {} };
                result[veiculo].rotas.push({ ...r, produtos: prods, variaveis: vars, habilidades: habs, dias_semana: diasSemana });
                prods.forEach(p => {
                    const k = (p.desc || '').toUpperCase();
                    const q = parseInt(p.qtd) || 1;
                    result[veiculo].produtosContagem[k] = (result[veiculo].produtosContagem[k] || 0) + q;
                    result[veiculo].totalQtd += q;
                });
                const serv = (r.tipo_servico || 'NÃO INFORMADO').toUpperCase();
                result[veiculo].servicosContagem[serv] = (result[veiculo].servicosContagem[serv] || 0) + 1;
            });
            res.json(result);
        }
    );
});


// GET /api/logistica/os/:id — Busca OS específica pelo ID
app.get('/api/logistica/os/:id', authenticateToken, (req, res) => {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido.' });
    db.get(`SELECT * FROM os_logistica WHERE id = ? AND status = 'ativo'`, [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'OS não encontrada.' });
        const parseField = (val) => { try { return JSON.parse(val || '[]'); } catch (e) { return []; } };
        res.json({ ...row, produtos: parseField(row.produtos), variaveis: parseField(row.variaveis), habilidades: parseField(row.habilidades), dias_semana: parseField(row.dias_semana) });
    });
});

// Verifica se o tipo de serviço é recorrente (Manutenção regular ou VAC)
// Manutenções AVULSAS são pontuais (filtradas por data_os) — não são recorrentes
function isRecorrente(tipoServico) {
    const t = (tipoServico || '').toLowerCase();
    if (t.includes('avulsa')) return false; // Avulsa = pontual, ignora dias da semana
    const isManutencao = t.includes('manuten');
    const isVac = t.includes('vac');
    return isManutencao || isVac;
}

// DELETE /api/logistica/pipeline/limpar - Remove todas as OS
app.delete('/api/logistica/pipeline/limpar', authenticateToken, (req, res) => {
    // ATENÇÃO: Isso vai remover permanentemente TODAS as OS da base
    db.run(`DELETE FROM os_logistica`, [], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        const changes = this.changes;
        db.run(`DELETE FROM os_videos`, [], function(err2) {
            res.json({ message: `Todas as ${changes} OS foram removidas permanentemente.`, changes });
        });
    });
});

// GET /api/logistica/pipeline - OS agrupadas por tipo para o Pipeline Kanban
app.get('/api/logistica/pipeline', authenticateToken, (req, res) => {
    const os = req.query.os || '';
    const contrato = req.query.contrato || '';
    const cliente = req.query.cliente || '';
    const endereco = req.query.endereco || '';
    const diaFiltro = req.query.dia || '';
    const diaFiltroStr = diaFiltro ? diaFiltro.toLowerCase().substring(0, 3) : '';
    const dataDe = req.query.data_de || req.query.data || '';
    const dataAte = req.query.data_ate || '';

    // Abreviações e nomes completos para suportar OS antigas e novas
    const DIAS_ABBR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const DIAS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    // Retorna Set com abreviações e nomes completos dos dias presentes no intervalo [de, ate]
    function diasNoIntervalo(de, ate) {
        const set = new Set();
        // Se falta o 'De' ou o 'Até', o intervalo é aberto/infinito, então não há restrição de dias da semana
        if (!de || !ate) return set;

        const fim = new Date(ate + 'T12:00:00');
        const cur = new Date(de + 'T12:00:00');
        let limit = 0;
        while (cur <= fim && limit < 8) { // no máximo 8 dias, depois disso todos os dias já estão no Set
            set.add(DIAS_ABBR[cur.getDay()]);
            set.add(DIAS_FULL[cur.getDay()]);
            cur.setDate(cur.getDate() + 1);
            limit++;
        }
        return set;
    }

    let sql = `SELECT * FROM os_logistica WHERE status = 'ativo'`;
    const params = [];

    // Todos os filtros são combinados (AND): OS + contrato + data + cliente + endereço
    if (os) { sql += ` AND numero_os = ?`; params.push(os.trim()); }
    if (contrato) { sql += ` AND contrato LIKE ?`; params.push(`%${contrato.trim()}%`); }
    if (cliente) { sql += ` AND cliente LIKE ?`; params.push(`%${cliente}%`); }
    if (endereco) { sql += ` AND endereco LIKE ?`; params.push(`%${endereco}%`); }
    // Filtro de data aplicado em JS para suportar lógica pontual vs recorrente
    sql += ` ORDER BY cliente ASC, CAST(numero_os AS REAL) ASC`;

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const parseField = (val) => { try { return JSON.parse(val || '[]'); } catch (e) { return []; } };

        const diasRange = diasNoIntervalo(dataDe, dataAte);
        const temFiltroData = !!dataDe;

        const filtradas = (rows || []).filter(r => {
            if (!temFiltroData && !diaFiltro) return true; // sem filtro de data nem dia: retorna tudo que passou no SQL

            if (isRecorrente(r.tipo_servico)) {
                // Recorrente: data_os é a data de início da recorrência
                const dataInicio = r.data_os || '';
                // Só aparece se já iniciou (data_os <= data_ate ou data_os <= data_de se sem ate)
                // Usar a data atual como fallback se for apenas busca por dia de semana
                const limiteMax = dataAte || dataDe || new Date().toISOString().split('T')[0];
                if (dataInicio && dataInicio > limiteMax) return false;

                // Verifica se algum dia da semana da OS bate com o intervalo ou filtro explícito
                let dias = [];
                try { dias = JSON.parse(r.dias_semana || '[]'); } catch (e) { }

                if (diaFiltroStr) {
                    return dias.some(d => d.toLowerCase().startsWith(diaFiltroStr));
                }

                if (diasRange.size === 0) return true;
                return dias.some(d => diasRange.has(d));
            } else {
                // Pontual: filtra por data_os
                if (diaFiltroStr) return false; // Serviços pontuais não tem dia de semana

                const dataOs = r.data_os || '';
                if (!dataOs) return false;
                if (dataDe && dataAte) return dataOs >= dataDe && dataOs <= dataAte;
                if (dataDe && !dataAte) return dataOs >= dataDe;
                if (!dataDe && dataAte) return dataOs <= dataAte;
                return true;
            }
        });

        const result = { manutencao: [], entrega: [], retirada: [], avulso: [] };
        filtradas.forEach(r => {
            const row = {
                ...r,
                produtos: parseField(r.produtos),
                variaveis: parseField(r.variaveis),
                habilidades: parseField(r.habilidades),
                dias_semana: parseField(r.dias_semana)
            };
            const t = (r.tipo_servico || '').toLowerCase();
            if (t.includes('entrega')) {
                result.entrega.push(row);
            } else if (t.includes('retirada')) {
                result.retirada.push(row);
            } else if (t.includes('manutencao') || t.includes('manutenção') || t.includes('vac')) {
                if (t.includes('avulsa')) {
                    result.avulso.push(row);
                } else {
                    result.manutencao.push(row);
                }
            } else {
                result.avulso.push(row);
            }
        });
        res.json(result);
    });
});
// =====================================================================
// =====================================================================
// ROTINA DE REIMPORTAÇÃO REMOVIDA (ESTAVA SOBRESCREVENDO OS DADOS EM TODO DEPLOY)
// =====================================================================
// =====================================================================
// ROTINA DE CORREÇÃO DE DADOS (SE -> Sexta, GUARITA INDIVIDUAL O -> OBRA)
db.serialize(() => {
    db.all(`SELECT id, dias_semana, produtos FROM os_logistica WHERE dias_semana LIKE '%"SE"%' OR produtos LIKE '% O"%'`, (err, rows) => {
        if (err) return;
        if (rows && rows.length > 0) {
            console.log(`[FIX] Encontradas ${rows.length} OS com "SE" ou "GUARITA O". Corrigindo...`);
            const stmt = db.prepare('UPDATE os_logistica SET dias_semana = ?, produtos = ? WHERE id = ?');
            rows.forEach(r => {
                let dias = [];
                try { dias = JSON.parse(r.dias_semana || '[]'); } catch (e) { }
                dias = dias.map(d => d === 'SE' ? 'Sexta' : d);

                let prods = [];
                try { prods = JSON.parse(r.produtos || '[]'); } catch (e) { }
                prods = prods.map(p => {
                    if (p.desc === 'GUARITA INDIVIDUAL O') p.desc = 'GUARITA INDIVIDUAL OBRA';
                    if (p.desc === 'GUARITA DUPLA O') p.desc = 'GUARITA DUPLA OBRA';
                    if (p.desc === 'STD O') p.desc = 'STD OBRA';
                    if (p.desc === 'LX O') p.desc = 'LX OBRA';
                    if (p.desc === 'PCD O') p.desc = 'PCD OBRA';
                    if (p.desc === 'SLX O') p.desc = 'SLX OBRA';
                    if (p.desc === 'ELX O') p.desc = 'ELX OBRA';
                    if (p.desc === 'PBII O') p.desc = 'PBII OBRA';
                    return p;
                });

                stmt.run([JSON.stringify(dias), JSON.stringify(prods), r.id]);
            });
            stmt.finalize();
        }
    });
});
// =====================================================================

// =====================================================================
// FROTA DE VEÍCULOS
// =====================================================================

// GET - listar todos os veículos da frota
app.get('/api/frota/veiculos', authenticateToken, (req, res) => {
    db.all('SELECT id, placa, marca_modelo_versao, cor_predominante, ano_fabricacao, ano_modelo, exercicio, renavam, motor, chassi, tipo_veiculo, capacidade_tanque, capacidade_carga, altura_com_banheiro, altura_sem_banheiro, largura_com_banheiro, largura_sem_banheiro, profundidade_com_banheiro, profundidade_sem_banheiro, crlv_filename, created_at, updated_at FROM frota_veiculos ORDER BY placa ASC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// GET - buscar veículo por id
app.get('/api/frota/veiculos/:id', authenticateToken, (req, res) => {
    db.get('SELECT * FROM frota_veiculos WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Veículo não encontrado' });
        res.json(row);
    });
});

// GET - visualizar CRLV (PDF em base64)
app.get('/api/frota/veiculos/:id/crlv', authenticateToken, (req, res) => {
    db.get('SELECT crlv_base64, crlv_filename FROM frota_veiculos WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row || !row.crlv_base64) return res.status(404).json({ error: 'CRLV não encontrado' });
        res.json({ crlv_base64: row.crlv_base64, crlv_filename: row.crlv_filename });
    });
});

// POST - cadastrar novo veículo
app.post('/api/frota/veiculos', authenticateToken, (req, res) => {
    const { placa, marca_modelo_versao, cor_predominante, ano_fabricacao, ano_modelo, exercicio, renavam, motor, chassi, tipo_veiculo, capacidade_tanque, capacidade_carga, altura_com_banheiro, altura_sem_banheiro, largura_com_banheiro, largura_sem_banheiro, profundidade_com_banheiro, profundidade_sem_banheiro, crlv_base64, crlv_filename } = req.body;
    if (!placa) return res.status(400).json({ error: 'Placa é obrigatória' });
    db.run(
        `INSERT INTO frota_veiculos (placa, marca_modelo_versao, cor_predominante, ano_fabricacao, ano_modelo, exercicio, renavam, motor, chassi, tipo_veiculo, capacidade_tanque, capacidade_carga, altura_com_banheiro, altura_sem_banheiro, largura_com_banheiro, largura_sem_banheiro, profundidade_com_banheiro, profundidade_sem_banheiro, crlv_base64, crlv_filename, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`,
        [placa?.toUpperCase(), marca_modelo_versao, cor_predominante, ano_fabricacao, ano_modelo, exercicio, renavam, motor, chassi, tipo_veiculo || 'caminhão', capacidade_tanque, capacidade_carga, altura_com_banheiro, altura_sem_banheiro, largura_com_banheiro, largura_sem_banheiro, profundidade_com_banheiro, profundidade_sem_banheiro, crlv_base64 || null, crlv_filename || null],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: 'Veículo cadastrado com sucesso' });
        }
    );
});

// PUT - atualizar veículo (incluindo novo CRLV)
app.put('/api/frota/veiculos/:id', authenticateToken, (req, res) => {
    const { placa, marca_modelo_versao, cor_predominante, ano_fabricacao, ano_modelo, exercicio, renavam, motor, chassi, tipo_veiculo, capacidade_tanque, capacidade_carga, altura_com_banheiro, altura_sem_banheiro, largura_com_banheiro, largura_sem_banheiro, profundidade_com_banheiro, profundidade_sem_banheiro, crlv_base64, crlv_filename } = req.body;

    const fields = [
        placa?.toUpperCase(), marca_modelo_versao, cor_predominante, ano_fabricacao, ano_modelo,
        exercicio, renavam, motor, chassi, tipo_veiculo,
        capacidade_tanque, capacidade_carga, altura_com_banheiro, altura_sem_banheiro,
        largura_com_banheiro, largura_sem_banheiro, profundidade_com_banheiro, profundidade_sem_banheiro
    ];

    // Se novo CRLV foi enviado, inclui no update e zera o alerta
    if (crlv_base64) {
        fields.push(crlv_base64, crlv_filename || null, 0);
        db.run(
            `UPDATE frota_veiculos SET placa=?, marca_modelo_versao=?, cor_predominante=?, ano_fabricacao=?, ano_modelo=?, exercicio=?, renavam=?, motor=?, chassi=?, tipo_veiculo=?, capacidade_tanque=?, capacidade_carga=?, altura_com_banheiro=?, altura_sem_banheiro=?, largura_com_banheiro=?, largura_sem_banheiro=?, profundidade_com_banheiro=?, profundidade_sem_banheiro=?, crlv_base64=?, crlv_filename=?, crlv_alerta_enviado=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
            [...fields, req.params.id],
            function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Veículo atualizado com sucesso' });
            }
        );
    } else {
        db.run(
            `UPDATE frota_veiculos SET placa=?, marca_modelo_versao=?, cor_predominante=?, ano_fabricacao=?, ano_modelo=?, exercicio=?, renavam=?, motor=?, chassi=?, tipo_veiculo=?, capacidade_tanque=?, capacidade_carga=?, altura_com_banheiro=?, altura_sem_banheiro=?, largura_com_banheiro=?, largura_sem_banheiro=?, profundidade_com_banheiro=?, profundidade_sem_banheiro=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
            [...fields, req.params.id],
            function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Veículo atualizado com sucesso' });
            }
        );
    }
});

// DELETE - excluir veículo
app.delete('/api/frota/veiculos/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM frota_veiculos WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Veículo excluído com sucesso' });
    });
});

// GET - veículos com CRLV vencendo em 30 dias (para popup de alerta)
app.get('/api/frota/veiculos/alertas/vencimento', authenticateToken, (req, res) => {
    db.all('SELECT id, placa, exercicio FROM frota_veiculos WHERE exercicio IS NOT NULL AND exercicio != \'\'', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const hoje = new Date();
        const alertas = (rows || []).filter(v => {
            if (!v.exercicio) return false;
            // exercicio vem como ano (ex: "2025"). Vencimento é 31/dez desse ano
            const ano = parseInt(v.exercicio);
            if (isNaN(ano)) return false;
            const vencimento = new Date(ano, 11, 31); // 31 de dezembro
            const diff = (vencimento - hoje) / (1000 * 60 * 60 * 24);
            return diff >= 0 && diff <= 30;
        }).map(v => {
            const ano = parseInt(v.exercicio);
            return { ...v, vencimento: `31/12/${ano}`, dias_restantes: Math.ceil((new Date(ano, 11, 31) - hoje) / (1000 * 60 * 60 * 24)) };
        });
        res.json(alertas);
    });
});

// =====================================================================
// CREDENCIAMENTO DE LOGÍSTICA
// =====================================================================


// =====================================================================
// CREDENCIAMENTO COMERCIAL (SOLICITAÇÕES)
// =====================================================================

app.post('/api/comercial/credenciamento', authenticateToken, (req, res) => {
    const { cliente_nome, os, cliente_email, endereco_instalacao, qtd_max_colaboradores, qtd_max_veiculos, data_limite_envio, docs_exigidos, licencas, observacoes } = req.body;
    if (!cliente_nome || !cliente_email) return res.status(400).json({ error: 'Nome e email são obrigatórios.' });

    // Token placeholder único para satisfazer a constraint NOT NULL + UNIQUE
    // O token real só é gerado quando a Logística processar via /enviar
    const crypto = require('crypto');
    const tokenPlaceholder = 'SOLIC-' + crypto.randomBytes(12).toString('hex');

    db.run(`INSERT INTO credenciamentos (cliente_nome, os, cliente_email, endereco_instalacao, qtd_max_colaboradores, qtd_max_veiculos, data_limite_envio, docs_exigidos, licencas_ids, observacoes, status, token, solicitado_por_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'solicitado', ?, ?)`,
        [
            cliente_nome,
            os || '',
            cliente_email,
            endereco_instalacao || '',
            qtd_max_colaboradores || 0,
            qtd_max_veiculos || 0,
            data_limite_envio || null,
            JSON.stringify(docs_exigidos || []),
            JSON.stringify(licencas || []),
            observacoes || '',
            tokenPlaceholder,
            req.user.id
        ],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });

            const novoId = this.lastID;
            
            // Inserir notificação para a Logística
            db.run(`INSERT INTO logistica_notificacoes_pendentes (tipo, dados) VALUES (?, ?)`, 
                ['nova_solicitacao', JSON.stringify({ 
                    cliente_nome, 
                    os, 
                    solicitante: req.user ? req.user.username : 'Comercial' 
                })]
            );

            res.json({ message: 'Solicitação criada com sucesso.', id: novoId });

            // --- Enviar e-mail de notificação para equipe de Logística ---
            // Busca tanto em colaboradores quanto em usuários que tenham a tag logistica
            db.all(`
                SELECT c.email_corporativo, c.email as c_email, u.email as u_email
                FROM usuarios u
                LEFT JOIN grupos_permissao gp ON u.grupo_permissao_id = gp.id
                LEFT JOIN colaboradores c ON u.nome = c.nome_completo
                WHERE u.ativo = 1 
                  AND (gp.departamento LIKE '%ogíst%' OR gp.departamento LIKE '%ogist%' 
                       OR u.departamento LIKE '%ogíst%' OR u.departamento LIKE '%ogist%'
                       OR u.role LIKE '%ogist%')
                UNION
                SELECT email_corporativo, email as c_email, null as u_email
                FROM colaboradores 
                WHERE status = 'Ativo' AND (departamento LIKE '%ogist%' OR departamento LIKE '%ogíst%' OR cargo LIKE '%ogist%')
            `, [], async (errColabs, rows) => {
                const emails = new Set();
                (rows || []).forEach(r => {
                    if (r.email_corporativo && r.email_corporativo.includes('@')) emails.add(r.email_corporativo);
                    else if (r.c_email && r.c_email.includes('@')) emails.add(r.c_email);
                    else if (r.u_email && r.u_email.includes('@')) emails.add(r.u_email);
                });

                if (emails.size > 0) enviarEmailLogistica([...emails]);

                    function enviarEmailLogistica(destinatarios) {
                        const baseUrl = process.env.PUBLIC_URL || 'https://sistema-america-homologacao.onrender.com';
                        const dtLimite = data_limite_envio ? new Date(data_limite_envio).toLocaleDateString('pt-BR') : 'Não informada';
                        
                        // Agrupar licenças por empresa
                        const licGroups = {};
                        (licencas || []).forEach(l => {
                            const comp = l.empresa || 'Outras';
                            if (!licGroups[comp]) licGroups[comp] = [];
                            licGroups[comp].push(l.nome);
                        });
                        const licNames = Object.keys(licGroups).length > 0 
                            ? Object.entries(licGroups).map(([comp, nomes]) => `• ${comp}: ${nomes.join(' - ')}`).join('<br>')
                            : 'Nenhuma';
                            
                        const docNamesMap = {
                            'cnh': 'CNH', 'cpf': 'CPF', 'aso': 'ASO', 'ficha_registro': 'Ficha de Registro',
                            'treinamento': 'Carteira de Vacinação', 'epi': 'Ficha de EPI',
                            'contrato_esocial': 'Contrato e-social', 'nr1': 'NR1 / Ordem de Serviço'
                        };
                        const docsArr = (docs_exigidos || []).map(d => docNamesMap[d] || d);
                        const docsList = docsArr.join(' - ') || 'Nenhum';
                        const logoPath = require('path').join(__dirname, '..', 'frontend', 'assets', 'logo-header.png');
                        const htmlMail = `
                        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 0; border-radius: 8px; overflow: hidden;">
                            <div style="text-align: center; background: #fff; border-bottom: 1px solid #eee;">
                                <img src="cid:empresa-logo" alt="América Rental" style="width: 100%; max-width: 600px; height: auto; display: block;">
                            </div>
                            <div style="padding: 20px;">
                                <h2 style="color: #7048e8; text-align: center; margin-top: 0;">📋 Nova Solicitação de Credenciamento</h2>
                                <p>Uma nova solicitação de credenciamento foi registrada por <strong>${req.user ? req.user.username : 'Comercial'}</strong> e aguarda ação da Logística.</p>
                                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7048e8;">
                                    <table style="width:100%; border-collapse:collapse;">
                                        <tr><td style="padding:4px 8px; font-weight:bold; color:#475569; width: 40%;">Cliente / Obra:</td><td style="padding:4px 8px;">${cliente_nome}</td></tr>
                                        ${os ? `<tr><td style="padding:4px 8px; font-weight:bold; color:#475569;">OS:</td><td style="padding:4px 8px;">${os}</td></tr>` : ''}
                                        <tr><td style="padding:4px 8px; font-weight:bold; color:#475569;">E-mail do Cliente:</td><td style="padding:4px 8px;">${cliente_email}</td></tr>
                                        ${endereco_instalacao ? `<tr><td style="padding:4px 8px; font-weight:bold; color:#475569;">Endereço:</td><td style="padding:4px 8px;">${endereco_instalacao}</td></tr>` : ''}
                                        <tr><td style="padding:4px 8px; font-weight:bold; color:#475569;">Máx. Colaboradores:</td><td style="padding:4px 8px;">${qtd_max_colaboradores || 0}</td></tr>
                                        <tr><td style="padding:4px 8px; font-weight:bold; color:#475569;">Máx. Veículos:</td><td style="padding:4px 8px;">${qtd_max_veiculos || 0}</td></tr>
                                        <tr><td style="padding:4px 8px; font-weight:bold; color:#475569;">Data Limite:</td><td style="padding:4px 8px;">${dtLimite}</td></tr>
                                        <tr><td style="padding:4px 8px; font-weight:bold; color:#475569; vertical-align: top;">Licenças Exigidas:</td><td style="padding:4px 8px;">${licNames}</td></tr>
                                        <tr><td style="padding:4px 8px; font-weight:bold; color:#475569;">Documentos Exigidos:</td><td style="padding:4px 8px;">${docsList}</td></tr>
                                        <tr><td style="padding:4px 8px; font-weight:bold; color:#475569;">Observações:</td><td style="padding:4px 8px;">${observacoes || 'Nenhuma'}</td></tr>
                                    </table>
                                </div>
                                <div style="text-align: center; margin: 25px 0;">
                                    <a href="${baseUrl}/" style="background:#7048e8; color:#fff; padding:12px 28px; text-decoration:none; border-radius:6px; font-weight:bold; display:inline-block;">
                                        Acessar Sistema e Processar Credenciamento
                                    </a>
                                </div>
                                <p style="font-size:12px; color:#999; text-align:center;"><i>Esta notificação foi enviada automaticamente pelo Sistema América Rental.</i></p>
                            </div>
                        </div>`;

                        sendMailHelper({
                            to: destinatarios.join(', '),
                            subject: `📋 Nova Solicitação de Credenciamento - ${cliente_nome}`,
                            html: htmlMail,
                            attachments: [{ filename: 'logo-header.png', path: logoPath, cid: 'empresa-logo' }]
                        }).then(() => {
                            console.log('[Credenciamento Comercial] E-mail de notificação enviado para Logística:', destinatarios.join(', '));
                        }).catch(emailErr => {
                            console.error('[Credenciamento Comercial] Erro ao enviar e-mail para Logística:', emailErr.message);
                        });
                    }
                }
            );

            // --- Enviar e-mail de confirmação para o CLIENTE ---
            if (cliente_email && cliente_email.includes('@')) {
                const docNamesMap = {
                    'cnh': 'CNH', 'cpf': 'CPF', 'aso': 'ASO', 'ficha_registro': 'Ficha de Registro',
                    'treinamento': 'Carteira de Vacinação', 'epi': 'Ficha de EPI',
                    'contrato_esocial': 'Contrato e-social', 'nr1': 'NR1 / Ordem de Serviço'
                };
                const docsArr = (docs_exigidos || []).map(d => docNamesMap[d] || d);
                // Agrupar licenças por empresa
                const licGroups = {};
                (licencas || []).forEach(l => {
                    const comp = l.empresa || 'Outras';
                    if (!licGroups[comp]) licGroups[comp] = [];
                    licGroups[comp].push(l.nome);
                });
                
                const dtLimCliente = data_limite_envio ? new Date(data_limite_envio).toLocaleDateString('pt-BR') : null;

                const docsHtml = docsArr.length > 0
                    ? `<ul style="margin:8px 0; padding-left:20px;">${docsArr.map(d => `<li>${d}</li>`).join('')}</ul>`
                    : '<p style="color:#94a3b8; font-style:italic; margin:4px 0;">Nenhum documento específico solicitado.</p>';

                const licsHtml = Object.keys(licGroups).length > 0
                    ? `<h3 style="margin:12px 0 6px; color:#0f172a; font-size:0.95rem;">🏷️ Licenças Solicitadas</h3><ul style="margin:4px 0; padding-left:20px;">${Object.entries(licGroups).map(([comp, nomes]) => `<li><strong>${comp}:</strong> ${nomes.join(' - ')}</li>`).join('')}</ul>`
                    : '';

                const logoPath = require('path').join(__dirname, '..', 'frontend', 'assets', 'logo-header.png');

                const htmlCliente = `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow:hidden;">
                    <div style="text-align: center; background: #fff; border-bottom: 1px solid #eee;">
                        <img src="cid:empresa-logo" alt="América Rental" style="width: 100%; max-width: 600px; height: auto; display: block;">
                    </div>
                    <div style="background: #7048e8; padding: 24px 20px; text-align:center;">
                        <h2 style="color:#fff; margin:0; font-size:1.3rem;">📋 Solicitação de Credenciamento Recebida</h2>
                    </div>
                    <div style="padding:24px 20px;">
                        <p>Olá, <strong>${cliente_nome}</strong>!</p>
                        <p>Sua solicitação de credenciamento foi recebida e encaminhada ao nosso setor de <strong>Logística</strong>. Em breve enviaremos os documentos da equipe alocada para o seu projeto.</p>

                        <div style="background:#f8fafc; border-left:4px solid #7048e8; border-radius:6px; padding:16px; margin:20px 0;">
                            <h3 style="margin:0 0 10px; color:#0f172a; font-size:0.95rem;">📄 Documentos Solicitados</h3>
                            ${docsHtml}
                            ${licsHtml}
                        </div>

                        ${dtLimCliente ? `<p style="font-size:13px; color:#64748b;">⏰ <strong>Prazo estimado de envio:</strong> ${dtLimCliente}</p>` : ''}
                        ${observacoes ? `<div style="background:#fffbeb; border:1px solid #fcd34d; border-radius:6px; padding:12px; margin-top:16px;"><strong>📝 Observações:</strong><br><span style="color:#92400e;">${observacoes}</span></div>` : ''}

                        <p style="margin-top:24px;">Em caso de dúvidas, entre em contato com nossa equipe.</p>
                        <p style="color:#64748b; font-size:13px;">Atenciosamente,<br><strong>América Rental — Logística</strong></p>
                    </div>
                    <div style="background:#f1f5f9; padding:12px; text-align:center; font-size:11px; color:#94a3b8;">
                        Esta mensagem foi enviada automaticamente pelo Sistema América Rental.
                    </div>
                </div>`;

                sendMailHelper({
                    to: cliente_email,
                    subject: `✅ Solicitação de Credenciamento Recebida — América Rental`,
                    html: htmlCliente,
                    attachments: [{ filename: 'logo-header.png', path: logoPath, cid: 'empresa-logo' }]
                }).then(() => {
                    console.log('[Credenciamento Comercial] E-mail de confirmação enviado ao cliente:', cliente_email);
                }).catch(emailErr => {
                    console.error('[Credenciamento Comercial] Erro ao enviar e-mail ao cliente:', emailErr.message);
                });
            }
        }
    );
});



app.put('/api/comercial/credenciamento/:id', authenticateToken, (req, res) => {
    const { cliente_nome, os, cliente_email, endereco_instalacao, qtd_max_colaboradores, qtd_max_veiculos, data_limite_envio, docs_exigidos, licencas, observacoes } = req.body;

    db.run(`UPDATE credenciamentos SET cliente_nome = ?, os = ?, cliente_email = ?, endereco_instalacao = ?, qtd_max_colaboradores = ?, qtd_max_veiculos = ?, data_limite_envio = ?, docs_exigidos = ?, licencas_ids = ?, observacoes = ? WHERE id = ? AND status = 'solicitado'`,
        [
            cliente_nome,
            os || '',
            cliente_email,
            endereco_instalacao || '',
            qtd_max_colaboradores || 0,
            qtd_max_veiculos || 0,
            data_limite_envio || null,
            JSON.stringify(docs_exigidos || []),
            JSON.stringify(licencas || []),
            observacoes || '',
            req.params.id
        ],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Solicitação atualizada com sucesso.' });
        }
    );
});

app.post('/api/logistica/credenciamento/:id/enviar', authenticateToken, (req, res) => {
    const { colaboradores, veiculos } = req.body;
    const colabIds = (colaboradores || []).map(c => c.id).filter(id => !isNaN(id) && id > 0);
    const veicIds = (veiculos || []).map(v => v.id).filter(id => !isNaN(id) && id > 0);

    const crypto = require('crypto');
    const token = crypto.randomBytes(16).toString('hex');
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 7);

    // Fetch original request to get email etc
    db.get('SELECT * FROM credenciamentos WHERE id = ?', [req.params.id], (err, cred) => {
        if (err || !cred) return res.status(500).json({ error: 'Credenciamento não encontrado' });

        db.run(`UPDATE credenciamentos SET colaboradores_ids = ?, veiculos_ids = ?, token = ?, valid_until = ?, status = 'enviado', enviado_em = CURRENT_TIMESTAMP, enviado_por_id = ? WHERE id = ?`,
            [JSON.stringify(colaboradores || []), JSON.stringify(veiculos || []), token, validUntil.toISOString(), req.user.id, req.params.id],
            async function (err2) {
                if (err2) return res.status(500).json({ error: err2.message });

                const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
                const link = `${baseUrl}/credenciamento-publico.html?token=${token}`;
                const logoUrl = `${baseUrl}/assets/logo-header.png`;

                // Build HTML...
                let htmlCols = (colaboradores || []).map(c => {
                    const cpfInfo = c.cpf ? ` - CPF: ${c.cpf}` : '';
                    return `<li><b>${c.nome || c.nome_completo}</b>${cpfInfo}</li>`;
                }).join('');
                let htmlVeics = (veiculos || []).map(v => {
                    return `<li><b>${v.placa}</b> - ${v.marca_modelo_versao}</li>`;
                }).join('');

                const mailOptions = {
                    from: '"América Rental (Logística)" <multas@americarental.com.br>',
                    to: cred.cliente_email,
                    subject: `Credenciamento de Equipe - América Rental`,
                    html: `
                    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <img src="${logoUrl}" alt="América Rental" style="max-height: 60px;">
                        </div>
                        <h2 style="color: #2d9e5f; text-align: center;">Credenciamento de Equipe Liberado</h2>
                        <p>Olá <b>${cred.cliente_nome}</b>,</p>
                        <p>Os documentos e certificados da equipe alocada para sua obra/evento foram liberados e estão disponíveis para download.</p>
                        
                        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <h4 style="margin-top: 0; color: #0f172a;">Equipe:</h4>
                            <ul style="margin: 0; padding-left: 20px;">${htmlCols}</ul>
                            ${htmlVeics ? `<h4 style="margin-top: 15px; color: #0f172a;">Veículos:</h4><ul style="margin: 0; padding-left: 20px;">${htmlVeics}</ul>` : ''}
                        </div>

                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${link}" style="background: #2d9e5f; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                                Acessar Prontuários e Documentos
                            </a>
                        </div>
                        <p style="text-align: center; font-size: 12px; color: #999;">
                            <i>Este link expira automaticamente em 7 dias (até ${validUntil.toLocaleDateString('pt-BR')}).</i>
                        </p>
                    </div>`
                };

                sendMailHelper(mailOptions).then(() => {
                    console.log('E-mail de credenciamento enviado com sucesso.');
                }).catch(error => {
                    console.error('Erro ao enviar e-mail de credenciamento:', error.message);
                });

                db.run("INSERT INTO comercial_notificacoes (usuario_id, mensagem, tipo, dados) VALUES (?, ?, 'credenciamento_enviado', ?)", [cred.solicitado_por_id, `A Logística enviou o credenciamento da OS ${cred.os} para o cliente ${cred.cliente_nome}.`, JSON.stringify({ cliente_nome: cred.cliente_nome, remetente: req.user ? req.user.nome_completo : 'Logística' })]);
         res.json({ message: 'E-mail de credenciamento enviado com sucesso.', link });
            }
        );
    });
});

app.post('/api/logistica/credenciamento', authenticateToken, (req, res) => {
    const { cliente_nome, cliente_email, endereco_instalacao, os, colaboradores, veiculos, docs_exigidos, licencas } = req.body;
    if (!cliente_nome || !cliente_email) return res.status(400).json({ error: 'Nome e email são obrigatórios.' });

    const colabIds = (colaboradores || []).map(c => c.id).filter(id => !isNaN(id) && id > 0);

    // Função para verificar
    const checkAndSend = (colabData, docsData) => {
        // Mapear os documentos requeridos para os nomes reais no sistema
        const docMap = {
            'cnh': ['CNH'],
            'cpf': ['RG-CPF', 'CIN-CPF', 'CPF', 'rg cpf', 'cin cpf'],
            'aso': ['ASO', 'ASO Padrao', 'ASO Padrão', 'Atestado de Saúde Ocupacional'],
            'ficha_registro': ['Ficha de Registro', 'Ficha Cadastral', 'Ficha de registro'],
            'treinamento': ['Carteira de vacinacao', 'Carteira de vacinação', 'Carteira de Vacina', 'vacina'],
            'epi': ['Ficha de EPI Assinada', 'Ficha de EPI', 'ficha epi', 'epi'],
            'contrato_esocial': ['Contrato e-social', 'contrato esocial', 'e-social', 'esocial'],
            'nr1': ['NR1', 'NR 1', 'Ordem de Servico', 'Ordem de Serviço', 'OS', 'ordem servico']
        };

        const docNamesReadable = {
            'cnh': 'CNH', 'cpf': 'CPF', 'aso': 'ASO', 'ficha_registro': 'Ficha de Registro',
            'treinamento': 'Carteira de Vacinação', 'epi': 'Ficha de EPI',
            'contrato_esocial': 'Contrato e-social', 'nr1': 'NR1 / Ordem de Serviço'
        };

        // Se há exigências de documentos, validar para cada colaborador
        if (colabIds.length > 0 && docs_exigidos && docs_exigidos.length > 0) {
            for (let cid of colabIds) {
                const cDocs = docsData
                    .filter(d => d.colaborador_id === cid && d.document_type)
                    .map(d => (d.document_type || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim());

                const colabObj = colabData.find(c => c.id === cid);
                const cNome = colabObj?.nome_completo || 'Colaborador desconhecido';
                const isMotorista = colabObj && (colabObj.cargo || '').toUpperCase().includes('MOTORISTA');

                console.log(`[CRED] Validando ${cNome} | docs no sistema: [${cDocs.join(', ')}]`);

                for (let reqDoc of docs_exigidos) {
                    if (reqDoc === 'cnh' && !isMotorista) continue; // Não exige CNH se não for motorista
                    if (reqDoc === 'cpf' && isMotorista) continue;  // Não exige CPF separado se for motorista

                    const acceptableNames = (docMap[reqDoc] || [reqDoc]).map(x =>
                        x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
                    );

                    const hasDoc = cDocs.some(cd =>
                        acceptableNames.some(acc => cd.includes(acc) || acc.includes(cd))
                    );

                    console.log(`[CRED] Req: ${reqDoc} | aceita: [${acceptableNames.join(', ')}] | encontrado: ${hasDoc}`);

                    if (!hasDoc) {
                        return res.status(400).json({ error: `O e-mail não foi enviado pois o colaborador(a) ${cNome} não tem o documento "${docNamesReadable[reqDoc] || reqDoc}" cadastrado no sistema. Contactar o setor de RH.` });
                    }
                }
            }
        }

        const crypto = require('crypto');
        const token = crypto.randomBytes(16).toString('hex');
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 7);

        db.run(`INSERT INTO credenciamentos (cliente_nome, cliente_email, endereco_instalacao, os, token, colaboradores_ids, veiculos_ids, docs_exigidos, licencas_ids, valid_until, enviado_em, enviado_por_id, status, solicitado_por_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, 'enviado', ?)`,
            [cliente_nome, cliente_email, endereco_instalacao || '', os || null, token, JSON.stringify(colaboradores || []), JSON.stringify(veiculos || []), JSON.stringify(docs_exigidos || []), JSON.stringify(licencas || []), validUntil.toISOString(), req.user.id, req.user.id],
            async function (err) {
                if (err) return res.status(500).json({ error: err.message });

                const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
                const link = `${baseUrl}/credenciamento-publico.html?token=${token}`;
                const logoUrl = `${baseUrl}/assets/logo-header.png`;

                let htmlCols = (colaboradores || []).map(c => {
                    const cData = colabData.find(col => col.id === c.id);
                    const docCpf = c.cpf || (cData && cData.cpf) || '';
                    const cpfInfo = docCpf ? ` - CPF: ${docCpf}` : '';
                    return `<li><b>${c.nome || c.nome_completo}</b>${cpfInfo}</li>`;
                }).join('');
                let htmlVeic = (veiculos || []).map(v => `<li>Placa: ${v.placa} - ${v.modelo}</li>`).join('');

                // Montar bloco de licenças para o e-mail
                let htmlLicencas = '';
                if (licencas && licencas.length > 0) {
                    const licRows = licencas.map(l => {
                        const valStr = l.validade ? l.validade.split('-').reverse().join('/') : 'Sem vencimento';
                        return `<li><b>${l.nome}</b> (${l.empresa}) — Válida até: ${valStr}</li>`;
                    }).join('');
                    htmlLicencas = `<h3>Licenças da Empresa</h3><ul>${licRows}</ul>`;
                }


                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: cliente_email,
                    subject: 'Credenciamento de Equipe e Veículos - América Rental',
                    html: `
                        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                            <div style="background-color: #fff; padding: 0;">
                                <img src="${logoUrl}" alt="América Rental" style="width: 100%; display: block; max-height: 120px; object-fit: cover;" onerror="this.style.display='none'">
                            </div>
                            <div style="background-color: #16a34a; padding: 15px; text-align: center; color: white;">
                                <h2 style="margin: 0; font-size: 20px;">Credenciamento de Equipe e Veículos</h2>
                            </div>
                            <div style="padding: 20px;">
                                <p>Olá <b>${cliente_nome}</b>,</p>
                                <p>Abaixo estão os dados dos colaboradores e veículos credenciados para a sua obra/evento:</p>
                                
                                ${htmlCols ? `<h3>Colaboradores</h3><ul>${htmlCols}</ul>` : ''}
                                ${htmlVeic ? `<h3>Veículos</h3><ul>${htmlVeic}</ul>` : ''}
                                ${htmlLicencas}
                                
                                <p>Para baixar os documentos correspondentes (RG, CNH, ASO, CRLV, etc.), acesse o link seguro abaixo. <b>O link é válido por 7 dias.</b></p>
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="${link}" style="background:#16a34a;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">Acessar e Baixar Documentos</a>
                                </div>
                                <p style="color: #666; font-size: 12px; text-align: center;">Ou acesse diretamente: <br><a href="${link}" style="color:#16a34a">${link}</a></p>
                                <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
                                <p style="color: #999; font-size: 11px; text-align: center;">Este é um e-mail automático do Sistema América Rental, por favor não responda.</p>
                            </div>
                        </div>
                    `
                };

                try {
                    const transporter = require('nodemailer').createTransport(SMTP_CONFIG);
                    await sendMailHelper(mailOptions);
                    res.json({ ok: true, message: 'E-mail de credenciamento enviado com sucesso!' });
                } catch (mailErr) {
                    res.status(500).json({ error: 'Erro ao enviar e-mail: ' + mailErr.message });
                }
            }
        );
    };

    if (colabIds.length > 0) {
        db.all(`SELECT id, nome_completo, cpf, cargo FROM colaboradores WHERE id IN (${colabIds.join(',')})`, (err, colabRows) => {
            if (err) return res.status(500).json({ error: err.message });
            db.all(`SELECT colaborador_id, document_type, tab_name FROM documentos WHERE colaborador_id IN (${colabIds.join(',')})`, (err2, docRows) => {
                if (err2) return res.status(500).json({ error: err2.message });
                // Verificar fichas de EPI ativas na tabela propria
                db.all(`SELECT colaborador_id FROM colaborador_epi_fichas WHERE colaborador_id IN (${colabIds.join(',')}) AND status='ativa'`, (err3, epiRows) => {
                    if (err3) return res.status(500).json({ error: err3.message });
                    // Injetar fichas de EPI ativas como se fossem documentos normais para a validacao
                    const epiDocs = (epiRows || []).map(r => ({
                        colaborador_id: r.colaborador_id,
                        document_type: 'Ficha de EPI Assinada',
                        tab_name: 'Ficha de EPI'
                    }));
                    checkAndSend(colabRows || [], [...(docRows || []), ...epiDocs]);
                });
            });
        });
    } else {
        checkAndSend([], []);
    }
});

// GET Autenticado: Listar todos os credenciamentos
app.get('/api/logistica/credenciamentos', authenticateToken, (req, res) => {
    db.all(`SELECT c.id, c.cliente_nome, c.os, c.cliente_email, c.endereco_instalacao, c.token, c.colaboradores_ids, c.veiculos_ids, c.licencas_ids, c.docs_exigidos, c.valid_until, c.acessado_em, c.status, c.data_limite_envio, c.qtd_max_colaboradores, c.qtd_max_veiculos, c.created_at, c.enviado_em, c.observacoes, u1.nome as sol_nome_usuario, u1.username as sol_username, col1.foto_path as sol_foto, col1.foto_base64 as sol_foto_b64, u2.nome as env_nome_usuario, u2.username as env_username, col2.foto_path as env_foto, col2.foto_base64 as env_foto_b64
            FROM credenciamentos c LEFT JOIN usuarios u1 ON c.solicitado_por_id = u1.id LEFT JOIN colaboradores col1 ON col1.nome_completo = u1.nome LEFT JOIN usuarios u2 ON c.enviado_por_id = u2.id LEFT JOIN colaboradores col2 ON col2.nome_completo = u2.nome ORDER BY c.created_at DESC`, [], (err, rows) => {
        if (err) {
            // Fallback: try without 'os' and optional new columns in case migration hasn't run
            db.all(`SELECT id, cliente_nome, os, cliente_email, endereco_instalacao, token, colaboradores_ids, veiculos_ids, licencas_ids, docs_exigidos, valid_until, acessado_em, created_at, qtd_max_colaboradores, qtd_max_veiculos, data_limite_envio, status
                    FROM credenciamentos ORDER BY created_at DESC`, [], (err2, rows2) => {
                if (err2) return res.status(500).json({ error: err2.message });
                const mapped = (rows2 || []).map(r => ({ ...r, status: r.status || 'enviado' }));
                res.json(mapped);
            });
            return;
        }
        res.json(rows || []);
    });
});


// --- NOTIFICACOES COMERCIAL ---
app.get('/api/comercial/notificacoes/pendentes', authenticateToken, (req, res) => {
    db.all('SELECT * FROM comercial_notificacoes WHERE lida = 0 AND usuario_id = ? ORDER BY created_at ASC', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});
app.put('/api/comercial/notificacoes/:id/lida', authenticateToken, (req, res) => {
    db.run('UPDATE comercial_notificacoes SET lida = 1 WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.post('/api/credenciamentos/:id/reenviar', authenticateToken, (req, res) => {
    db.get('SELECT * FROM credenciamentos WHERE id = ?', [req.params.id], (err, cred) => {
        if (err || !cred) return res.status(500).json({ error: 'Credenciamento não encontrado' });
        if (!cred.token) return res.status(400).json({ error: 'Este credenciamento ainda não possui um link gerado pela logística.' });
        
        const { novoEmail } = req.body || {};
        const emailToUse = novoEmail ? novoEmail.trim() : cred.cliente_email;

        if (novoEmail && novoEmail.trim() !== cred.cliente_email) {
            db.run('UPDATE credenciamentos SET cliente_email = ? WHERE id = ?', [emailToUse, cred.id], () => {});
            cred.cliente_email = emailToUse;
        }

        const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
        const link = `${baseUrl}/credenciamento-publico.html?token=${cred.token}`;
        const logoUrl = `${baseUrl}/assets/logo-header.png`;
        
        const validUntil = new Date(cred.valid_until);
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: emailToUse,
            subject: 'Credenciamento de Equipe - América Rental (Reenvio)',
            html: `<div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <img src="${logoUrl}" alt="América Rental" style="max-height: 60px;">
                        </div>
                        <h2 style="color: #2d9e5f; text-align: center;">Credenciamento de Equipe Liberado</h2>
                        <p>Olá <b>${cred.cliente_nome}</b>,</p>
                        <p>Abaixo está o link para acesso aos documentos da equipe alocada para sua obra/evento.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${link}" style="background: #2d9e5f; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                                Acessar Prontuários e Documentos
                            </a>
                        </div>
                        <p style="text-align: center; font-size: 12px; color: #999;">
                            <i>Este link expira automaticamente em ${validUntil.toLocaleDateString('pt-BR')}.</i>
                        </p>
                    </div>`
        };
        
        db.run('UPDATE credenciamentos SET enviado_em = CURRENT_TIMESTAMP, enviado_por_id = ? WHERE id = ?', [req.user.id, req.params.id], function(errUpdate) {
            if (errUpdate) console.error("Erro ao atualizar dados de reenvio:", errUpdate);
            
            sendMailHelper(mailOptions).then(() => {
                res.json({ message: 'E-mail reenviado com sucesso e dados de envio atualizados.' });
            }).catch(e => res.status(500).json({ error: e.message }));
        });
    });
});

// DELETE Autenticado: Excluir credenciamento
app.delete('/api/logistica/credenciamentos/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM credenciamentos WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ok: true });
    });
});

// GET Público: Busca dados do credenciamento e resolve os documentos
app.get('/api/publico/credenciamento/:token', (req, res) => {
    const token = req.params.token;
    db.get('SELECT * FROM credenciamentos WHERE token = ?', [token], (err, cred) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!cred) return res.status(404).json({ error: 'Link inválido ou não encontrado.' });

        const validUntil = new Date(cred.valid_until);
        if (new Date() > validUntil) {
            return res.status(403).json({ error: 'Este link de credenciamento já expirou (validade de 7 dias).' });
        }

        // Registrar primeiro acesso do cliente
        if (!cred.acessado_em) {
            db.run('UPDATE credenciamentos SET acessado_em = ? WHERE id = ?', [new Date().toISOString(), cred.id], () => {
                if (cred.solicitado_por_id) {
                    db.run("INSERT INTO comercial_notificacoes (usuario_id, mensagem, tipo, dados) VALUES (?, ?, 'credenciamento_acessado', ?)", [cred.solicitado_por_id, `O cliente ${cred.cliente_nome} acessou o link do credenciamento da OS ${cred.os || '-'}.`, JSON.stringify({ cliente_nome: cred.cliente_nome, remetente: 'Cliente' })]);
                }
            });
        }

        let colabs = [];
        try { colabs = JSON.parse(cred.colaboradores_ids || '[]'); } catch (e) { }
        let veics = [];
        try { veics = JSON.parse(cred.veiculos_ids || '[]'); } catch (e) { }

        // Buscar documentos dos colaboradores
        const colabIds = colabs.map(c => c.id).filter(id => id);
        const colabDocsPromise = new Promise((resolve) => {
            if (colabIds.length === 0) return resolve([]);
            const placeholders = colabIds.map(() => '?').join(',');
            db.all(`SELECT id, colaborador_id, document_type, file_name, file_path, signed_file_path FROM documentos WHERE colaborador_id IN (${placeholders})`, colabIds, (err, docs) => {
                resolve(docs || []);
            });
        });

        // Buscar fichas de EPI ativas (tabela separada)
        const epiPromise = new Promise((resolve) => {
            if (colabIds.length === 0) return resolve([]);
            const placeholders = colabIds.map(() => '?').join(',');
            db.all(`SELECT id, colaborador_id FROM colaborador_epi_fichas WHERE colaborador_id IN (${placeholders}) AND status='ativa' ORDER BY id DESC`, colabIds, (err, rows) => {
                resolve((rows || []).map(r => ({
                    id: r.id,
                    colaborador_id: r.colaborador_id,
                    document_type: 'Ficha de EPI',
                    file_name: `Ficha_EPI_colab${r.colaborador_id}.pdf`,
                    file_path: null,
                    signed_file_path: null,
                    _is_epi_ficha: true
                })));
            });
        });

        // Buscar CRLV dos veículos
        const veicIds = veics.map(v => v.id).filter(id => id);
        const veicDocsPromise = new Promise((resolve) => {
            if (veicIds.length === 0) return resolve([]);
            const placeholders = veicIds.map(() => '?').join(',');
            db.all(`SELECT id, placa, crlv_filename, crlv_base64 FROM frota_veiculos WHERE id IN (${placeholders})`, veicIds, (err, frotas) => {
                resolve(frotas || []);
            });
        });

        // Also fetch licencas file info from DB
        let licencasRaw = [];
        try { licencasRaw = JSON.parse(cred.licencas_ids || '[]'); } catch (e) { }
        const licencaIds = licencasRaw.map(l => l.id).filter(Boolean);
        const licencasDbPromise = new Promise((resolve) => {
            if (licencaIds.length === 0) return resolve([]);
            const ph = licencaIds.map(() => '?').join(',');
            db.all(`SELECT id, file_name FROM licencas WHERE id IN (${ph})`, licencaIds, (err, rows) => resolve(rows || []));
        });

        Promise.all([colabDocsPromise, veicDocsPromise, licencasDbPromise, epiPromise]).then(([docs, frotas, licencasDb, epiDocs]) => {
            // Merge EPI docs with regular docs (deduplicate by colaborador_id - keep only one EPI per collab)
            const docsComEPI = [...docs];
            epiDocs.forEach(ed => {
                // Only add if not already present in documentos table
                if (!docsComEPI.some(d => d.colaborador_id === ed.colaborador_id && (d.document_type || '').toLowerCase().includes('epi'))) {
                    docsComEPI.push(ed);
                }
            });

            // Mapear docs_exigidos (chaves) para nomes reais de documentos
            let docsExigidos = [];
            try { docsExigidos = JSON.parse(cred.docs_exigidos || '[]'); } catch (e) { }

            const docMapPublico = {
                'cnh': ['CNH'],
                'cpf': ['RG-CPF', 'CIN-CPF', 'CPF', 'rg cpf', 'cin cpf'],
                'aso': ['ASO', 'ASO Padrao', 'ASO Padrão', 'Atestado de Saúde Ocupacional'],
                'ficha_registro': ['Ficha de Registro', 'Ficha Cadastral', 'Ficha de registro'],
                'treinamento': ['Carteira de vacinacao', 'Carteira de vacinação', 'Carteira de Vacina', 'vacina'],
                'epi': ['Ficha de EPI Assinada', 'Ficha de EPI', 'ficha epi', 'epi'],
                'contrato_esocial': ['Contrato e-social', 'contrato esocial', 'e-social', 'esocial'],
                'nr1': ['NR1', 'NR 1', 'Ordem de Servico', 'Ordem de Serviço', 'OS', 'ordem servico']
            };

            // Montar conjunto de nomes aceitos (normalizados sem acento)
            const norm = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
            const tiposPermitidos = new Set();
            docsExigidos.forEach(chave => {
                (docMapPublico[chave] || []).forEach(nome => tiposPermitidos.add(norm(nome)));
            });

            // Função para saber se um documento é permitido
            const isPermitido = (d) => {
                if (tiposPermitidos.size === 0) return true; // se não há filtro, libera tudo
                const dn = norm(d.document_type);
                return Array.from(tiposPermitidos).some(acc => dn.includes(acc) || acc.includes(dn));
            };

            // Para cada chave do mapa, retorna qual chave bate num document_type
            const getChaveDoc = (d) => {
                const dn = norm(d.document_type);
                for (const [chave, nomes] of Object.entries(docMapPublico)) {
                    const normNomes = nomes.map(n => norm(n));
                    if (normNomes.some(acc => dn.includes(acc) || acc.includes(dn))) return chave;
                }
                return null;
            };

            res.json({
                cliente_nome: cred.cliente_nome,
                validade: cred.valid_until,
                colaboradores: colabs.map(c => ({
                    ...c,
                    documentos: (() => {
                        const filtrados = docsComEPI
                            .filter(d => d.colaborador_id === c.id && isPermitido(d))
                            .map(d => ({
                                id: d.id,
                                tipo: d.document_type,
                                nome_arquivo: d.file_name,
                                tem_assinado: !!d.signed_file_path,
                                _chave: getChaveDoc(d),
                                is_epi: !!d._is_epi_ficha
                            }));
                        // Deduplicar: se dois documentos mapeiam para a mesma chave (ex: NR1 e Ordem de Serviço),
                        // manter apenas o primeiro (mais recente pelo id desc já que o DB retorna em ordem)
                        const vistos = new Set();
                        return filtrados.filter(d => {
                            const key = d._chave || d.tipo; // fallback: usar tipo literal
                            if (vistos.has(key)) return false;
                            vistos.add(key);
                            return true;
                        }).map(({ _chave, ...rest }) => rest); // remover campo interno _chave
                    })()
                })),
                veiculos: veics.map(v => {
                    const f = frotas.find(fr => fr.id === v.id);
                    return {
                        ...v,
                        crlv_filename: f ? f.crlv_filename : null,
                        has_crlv: f && !!f.crlv_base64
                    };
                }),
                licencas: licencasRaw.map(l => {
                    const dbRow = licencasDb.find(r => String(r.id) === String(l.id));
                    return { ...l, file_name: dbRow ? dbRow.file_name : null };
                })
            });
        });
    });
});

// GET Público: Baixar documento de colaborador do credenciamento
app.get('/api/publico/credenciamento/:token/doc/:docId', (req, res) => {
    db.get('SELECT * FROM credenciamentos WHERE token = ?', [req.params.token], (err, cred) => {
        if (!cred || new Date() > new Date(cred.valid_until)) return res.status(403).send('Link inválido/expirado');

        db.get('SELECT * FROM documentos WHERE id = ?', [req.params.docId], (err, doc) => {
            if (!doc) return res.status(404).send('Documento não encontrado');

            // Validar se o doc pertence a um colaborador credenciado
            let colabs = [];
            try { colabs = JSON.parse(cred.colaboradores_ids || '[]'); } catch (e) { }
            if (!colabs.find(c => c.id === doc.colaborador_id)) return res.status(403).send('Acesso negado a este documento');

            const filePath = doc.signed_file_path || doc.file_path;
            const path_module = require('path');
            const fs_module = require('fs');
            const absolutePath = path_module.resolve(__dirname, '..', '..', filePath);

            if (fs_module.existsSync(absolutePath)) {
                res.download(absolutePath, doc.file_name);
            } else {
                res.status(404).send('Arquivo físico não encontrado no servidor');
            }
        });
    });
});

// GET Público: Baixar CRLV de veículo do credenciamento
app.get('/api/publico/credenciamento/:token/crlv/:veicId', (req, res) => {
    db.get('SELECT * FROM credenciamentos WHERE token = ?', [req.params.token], (err, cred) => {
        if (!cred || new Date() > new Date(cred.valid_until)) return res.status(403).send('Link inválido/expirado');

        db.get('SELECT crlv_base64, crlv_filename FROM frota_veiculos WHERE id = ?', [req.params.veicId], (err, row) => {
            if (!row || !row.crlv_base64) return res.status(404).send('CRLV não encontrado');

            let veics = [];
            try { veics = JSON.parse(cred.veiculos_ids || '[]'); } catch (e) { }
            // Nota: JSON parsing converte números para int/string. Vamos comparar como string.
            if (!veics.find(v => String(v.id) === String(req.params.veicId))) return res.status(403).send('Acesso negado a este veículo');

            const base64Data = row.crlv_base64.replace(/^data:application\/pdf;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            res.setHeader('Content-Length', buffer.length);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${row.crlv_filename || 'CRLV.pdf'}"`);
            res.send(buffer);
        });
    });
});


// GET Público: Baixar arquivo de licença do credenciamento
app.get('/api/publico/credenciamento/:token/licenca/:licId', (req, res) => {
    db.get('SELECT * FROM credenciamentos WHERE token = ?', [req.params.token], (err, cred) => {
        if (!cred || new Date() > new Date(cred.valid_until)) return res.status(403).send('Link inválido/expirado');

        // Verificar que a licença pertence ao credenciamento
        let licencasIds = [];
        try { licencasIds = JSON.parse(cred.licencas_ids || '[]'); } catch (e) { }
        if (!licencasIds.find(l => String(l.id) === String(req.params.licId))) {
            return res.status(403).send('Acesso negado a esta licença');
        }

        db.get('SELECT * FROM licencas WHERE id = ?', [req.params.licId], (err2, row) => {
            if (err2 || !row) return res.status(404).send('Licença não encontrada');
            if (!row.file_path && !row.file_name) return res.status(404).send('Nenhum arquivo anexado a esta licença');

            let absPath = '';
            if (row.file_path) absPath = path.resolve(__dirname, '..', '..', row.file_path);
            if (!absPath || !fs.existsSync(absPath)) {
                const empresaDir = path.join(LICENCAS_UPLOAD_PATH, (row.empresa || 'GERAL').toUpperCase().replace(/[^A-Z0-9]/g, '_'));
                const finalPath = path.join(empresaDir, row.file_name);
                if (fs.existsSync(finalPath)) absPath = finalPath;
            }
            if (!absPath || !fs.existsSync(absPath)) return res.status(404).send('Arquivo físico não encontrado');

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="' + row.file_name + '"');
            res.sendFile(absPath);
        });
    });
});


// GET Público: Dados da Ficha de EPI (o browser gera o PDF com jsPDF)
app.get('/api/publico/credenciamento/:token/epi/:epiId', (req, res) => {
    db.get('SELECT * FROM credenciamentos WHERE token = ?', [req.params.token], (err, cred) => {
        if (!cred || new Date() > new Date(cred.valid_until)) return res.status(403).json({ error: 'Link inválido/expirado' });

        let colabs = [];
        try { colabs = JSON.parse(cred.colaboradores_ids || '[]'); } catch (e) { }

        db.get('SELECT * FROM colaborador_epi_fichas WHERE id = ?', [req.params.epiId], (err2, ficha) => {
            if (err2 || !ficha) return res.status(404).json({ error: 'Ficha de EPI não encontrada' });

            const colabInfo = colabs.find(c => String(c.id) === String(ficha.colaborador_id));
            if (!colabInfo) return res.status(403).json({ error: 'Acesso negado' });

            // Buscar dados completos do colaborador
            db.get('SELECT nome_completo, rg, cpf, cargo, departamento, data_admissao FROM colaboradores WHERE id = ?', [ficha.colaborador_id], (err3, colabRow) => {
                // Buscar template de EPI
                db.get('SELECT * FROM epi_templates WHERE id = ?', [ficha.template_id], (err4, template) => {
                    // Buscar entregas assinadas
                    db.all('SELECT * FROM epi_entregas WHERE ficha_id = ? ORDER BY data_entrega ASC', [ficha.id], (err5, entregas) => {
                        const epis = (() => { try { return JSON.parse(ficha.snapshot_epis || '[]'); } catch (e) { return []; } })();
                        const templateEpis = template ? (() => { try { return JSON.parse(template.epis_json || '[]'); } catch (e) { return []; } })() : epis;

                        res.json({
                            ficha: {
                                id: ficha.id,
                                grupo: ficha.grupo,
                                snapshot_termo: ficha.snapshot_termo,
                                snapshot_rodape: ficha.snapshot_rodape,
                                epis: epis.length ? epis : templateEpis
                            },
                            colaborador: colabRow ? {
                                nome: colabRow.nome_completo,
                                rg: colabRow.rg,
                                cpf: colabRow.cpf,
                                cargo: colabRow.cargo,
                                dept: colabRow.departamento,
                                admissao: colabRow.data_admissao
                            } : { nome: colabInfo.nome || 'Colaborador' },
                            entregas: (entregas || []).map(e => ({
                                data: e.data_entrega,
                                descricao: (() => { try { return JSON.parse(e.epis_entregues || '[]').join(', '); } catch (er) { return ''; } })(),
                                assinatura_base64: e.assinatura_base64
                            }))
                        });
                    });
                });
            });
        });
    });
});

app.listen(PORT, () => {

    console.log(`Servidor rodando na porta ${PORT}`);
    console.log('Versão do Servidor: V31_OS_LOGISTICA_MODULE');
    console.log(`Caminho de Armazenamento Local: ${BASE_UPLOAD_PATH}`);
});


// ═══════════════════════════════════════════════════════════
//  ROTAS DE LICENCAS EMPRESARIAIS
// ═══════════════════════════════════════════════════════════

const LICENCAS_UPLOAD_PATH = path.join(BASE_UPLOAD_PATH, 'LICENCAS');
if (!fs.existsSync(LICENCAS_UPLOAD_PATH)) fs.mkdirSync(LICENCAS_UPLOAD_PATH, { recursive: true });

app.post('/api/licencas/extrair-validade', authenticateToken, uploadFoto.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    if (req.file.mimetype !== 'application/pdf') return res.json({ validade: null });
    try {
        const data = await pdfParse(req.file.buffer);
        const text = data.text;
        let foundDate = null;

        const docNome = req.body.nome ? req.body.nome.toUpperCase() : '';

        // 0. Caso especial: CTF IBAMA — priorizar "CR válido até:" e pegar a data mais futura nessa seção
        if (docNome.includes('CTF') || docNome.includes('IBAMA')) {
            const crSection = text.match(/CR\s+v[aá]lido\s+at[eé][\s\S]{0,300}/i);
            if (crSection) {
                const datesInSection = [...crSection[0].matchAll(/(\d{2}[\/\.-]\d{2}[\/\.-]\d{4})/g)];
                let maxDateObj = null;
                let maxDateStr = null;
                for (const d of datesInSection) {
                    const parts = d[1].split(/[\/\.-]/);
                    if (parts.length === 3) {
                        const dia = parseInt(parts[0], 10), mes = parseInt(parts[1], 10), ano = parseInt(parts[2], 10);
                        if (ano >= 2020 && ano <= 2050 && mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) {
                            const dObj = new Date(ano, mes - 1, dia);
                            if (!maxDateObj || dObj > maxDateObj) { maxDateObj = dObj; maxDateStr = d[1]; }
                        }
                    }
                }
                if (maxDateStr) {
                    const parts = maxDateStr.split(/[\/\.-]/);
                    return res.json({ validade: `${parts[2]}-${parts[1]}-${parts[0]}` });
                }
            }
        }

        // 0b. Caso especial: CLI / Alvará — priorizar "DATA DE VALIDADE" (ignora "DATA DA SOLICITAÇÃO")
        if (docNome.includes('CLI') || docNome.includes('ALVAR')) {
            const matchValidade = text.match(/DATA\s+DE\s+VALIDADE[\s\S]{0,50}?(\d{2}[\/\.-]\d{2}[\/\.-]\d{4})/i);
            if (matchValidade && matchValidade[1]) {
                const parts = matchValidade[1].split(/[\/\.-]/);
                if (parts.length === 3) {
                    return res.json({ validade: `${parts[2]}-${parts[1]}-${parts[0]}` });
                }
            }
        }

        // 1. Tenta achar data próxima a palavras chaves (busca até 100 caracteres à frente suportando quebras de linha)
        const matchKeyword = text.match(/(?:v[aá]lido\s+at[eé]|validade|vencimento|expira|vence|venc)[\s\S]{0,100}?(\d{2}[\/\.-]\d{2}[\/\.-]\d{4})/i);
        if (matchKeyword && matchKeyword[1]) {
            foundDate = matchKeyword[1];
        } else {
            // 2. Se não achar palavra-chave, pega a data mais futura no texto
            const allDates = [...text.matchAll(/\b(\d{2})[\/\.-](\d{2})[\/\.-](\d{4})\b/g)];
            if (allDates.length > 0) {
                let maxDateObj = null;
                let maxDateStr = null;
                for (const match of allDates) {
                    const dia = parseInt(match[1], 10);
                    const mes = parseInt(match[2], 10);
                    let ano = parseInt(match[3], 10);
                    if (ano >= 2020 && ano <= 2050 && mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) {
                        const dObj = new Date(ano, mes - 1, dia);
                        if (!maxDateObj || dObj > maxDateObj) {
                            maxDateObj = dObj;
                            let dFinal = new Date(dObj);
                            if (docNome.includes('PCMSO')) dFinal.setFullYear(dFinal.getFullYear() + 1);
                            if (docNome.includes('CND') && docNome.includes('MUNICIPAL')) dFinal.setDate(dFinal.getDate() + 30);
                            maxDateStr = `${dFinal.getFullYear()}-${String(dFinal.getMonth() + 1).padStart(2, '0')}-${String(dFinal.getDate()).padStart(2, '0')}`;
                        }
                    }
                }
                if (maxDateStr) {
                    return res.json({ validade: maxDateStr });
                }
            }
        }

        if (foundDate) {
            const parts = foundDate.split(/[\/\.-]/);
            if (parts.length === 3) {
                const dFinal = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                if (docNome.includes('PCMSO')) dFinal.setFullYear(dFinal.getFullYear() + 1);
                if (docNome.includes('CND') && docNome.includes('MUNICIPAL')) dFinal.setDate(dFinal.getDate() + 30);
                const Y = dFinal.getFullYear(), M = String(dFinal.getMonth() + 1).padStart(2, '0'), D = String(dFinal.getDate()).padStart(2, '0');
                return res.json({ validade: `${Y}-${M}-${D}` });
            }
        }
        res.json({ validade: null });
    } catch (e) {
        console.error('Erro no parse do PDF:', e.message);
        res.json({ validade: null });
    }
});

app.get('/api/licencas', authenticateToken, (req, res) => {
    db.all('SELECT * FROM licencas ORDER BY empresa, nome', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/licencas', authenticateToken, upload.single('file'), (req, res) => {
    const { empresa, nome, validade } = req.body;
    if (!empresa || !nome) return res.status(400).json({ error: 'Empresa e nome sao obrigatorios.' });
    if (!req.file) return res.status(400).json({ error: 'Arquivo PDF obrigatorio.' });
    const empresaDir = path.join(LICENCAS_UPLOAD_PATH, empresa.toUpperCase().replace(/[^A-Z0-9]/g, '_'));
    if (!fs.existsSync(empresaDir)) fs.mkdirSync(empresaDir, { recursive: true });
    const ext = path.extname(req.file.originalname) || '.pdf';
    const safeName = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    const fileName = safeName + ext;
    const filePath = path.join(empresaDir, fileName);
    fs.copyFileSync(req.file.path, filePath);
    fs.unlinkSync(req.file.path);
    const relPath = path.relative(path.join(BASE_UPLOAD_PATH, '..', '..'), filePath).replace(/\\/g, '/');
    db.run('INSERT INTO licencas (empresa, nome, validade, file_path, file_name, updated_at, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"), datetime("now"))',
        [empresa, nome, validade || null, relPath, fileName],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: 'Licenca salva.' });
        }
    );
});

app.put('/api/licencas/:id', authenticateToken, upload.single('file'), (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM licencas WHERE id = ?', [id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Licenca nao encontrada.' });
        const validade = req.body.validade !== undefined ? req.body.validade : row.validade;
        let filePath = row.file_path; let fileName = row.file_name;
        if (req.file) {
            const empresaDir = path.join(LICENCAS_UPLOAD_PATH, row.empresa.toUpperCase().replace(/[^A-Z0-9]/g, '_'));
            if (!fs.existsSync(empresaDir)) fs.mkdirSync(empresaDir, { recursive: true });
            const ext = path.extname(req.file.originalname) || '.pdf';
            const safeName = row.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
            fileName = safeName + ext;
            const absolutePath = path.join(empresaDir, fileName);
            fs.copyFileSync(req.file.path, absolutePath);
            fs.unlinkSync(req.file.path);
            filePath = path.relative(path.join(BASE_UPLOAD_PATH, '..', '..'), absolutePath).replace(/\\/g, '/');
        }
        db.run('UPDATE licencas SET validade = ?, file_path = ?, file_name = ?, updated_at = datetime("now") WHERE id = ?',
            [validade || null, filePath, fileName, id],
            (err2) => {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json({ message: 'Licenca atualizada.' });
            }
        );
    });
});

app.delete('/api/licencas/:id', authenticateToken, (req, res) => {
    db.get('SELECT * FROM licencas WHERE id = ?', [req.params.id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Licenca nao encontrada.' });
        if (row.file_path) {
            const absPath = path.resolve(__dirname, '..', '..', row.file_path);
            if (fs.existsSync(absPath)) { try { fs.unlinkSync(absPath); } catch (e) { } }
        }
        db.run('DELETE FROM licencas WHERE id = ?', [req.params.id], (err2) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ message: 'Licenca excluida.' });
        });
    });
});

app.get('/api/licencas/:id/view', authenticateToken, (req, res) => {
    db.get('SELECT * FROM licencas WHERE id = ?', [req.params.id], (err, row) => {
        if (err || !row) return res.status(404).send('Licenca nao encontrada.');
        if (!row.file_path && !row.file_name) return res.status(404).send('Arquivo nao anexado.');

        let absPath = '';
        if (row.file_path) absPath = path.resolve(__dirname, '..', '..', row.file_path);

        if (!absPath || !fs.existsSync(absPath)) {
            // fallback se o caminho relativo foi gerado de forma diferente
            if (row.file_path) {
                const altPath = path.join(BASE_UPLOAD_PATH, row.file_path);
                if (fs.existsSync(altPath)) absPath = altPath;
            }
        }

        if (!absPath || !fs.existsSync(absPath)) {
            // fallback definitivo construindo o caminho do zero usando empresa e nome do arquivo
            const empresaDir = path.join(LICENCAS_UPLOAD_PATH, row.empresa.toUpperCase().replace(/[^A-Z0-9]/g, '_'));
            const finalPath = path.join(empresaDir, row.file_name);
            if (fs.existsSync(finalPath)) absPath = finalPath;
        }

        if (!absPath || !fs.existsSync(absPath)) return res.status(404).send('Arquivo fisico nao encontrado.');

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="' + row.file_name + '"');
        res.sendFile(absPath);
    });



});


// Excluir link_video de uma OS (por numero_os)
app.delete('/api/logistica/os/:numero_os/link-video', authenticateToken, (req, res) => {
    const { numero_os } = req.params;
    db.run('UPDATE os_logistica SET link_video = NULL WHERE numero_os = ?', [numero_os], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'OS não encontrada.' });
        res.json({ ok: true });
    });
});

// Rota para a página de Entregas
app.get('/api/logistica/entregas', authenticateToken, (req, res) => {
    db.all(`SELECT id, numero_os, cliente, endereco, data_os, tipo_servico, link_video 
            FROM os_logistica 
            WHERE tipo_servico LIKE '%ENTREGA%' AND status != 'Finalizado' AND status != 'Cancelado'
            ORDER BY data_os DESC`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

function verificarLicencasVencimentoCron() {
    console.log('[CRON] Verificando vencimento de Licencas Empresariais...');
    db.all(`SELECT * FROM licencas WHERE validade IS NOT NULL AND validade != ''`, [], (err, licencas) => {
        if (err) { console.error('[CRON Licencas]', err.message); return; }

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        db.get(`SELECT (SELECT email_corporativo FROM colaboradores WHERE id = d.responsavel_id) as email 
                FROM departamentos d WHERE LOWER(TRIM(d.nome)) = 'administrativo' LIMIT 1`, [], async (errD, rowD) => {

            const emailDestino = (rowD && rowD.email) ? rowD.email : 'roberta@americarental.com.br'; // Fallback
            if (!emailDestino) {
                console.log('[CRON Licencas] Email do Administrativo nao encontrado.');
                return;
            }

            for (const lic of licencas) {
                const dataValidade = new Date(lic.validade + 'T12:00:00');
                const diffDias = Math.ceil((dataValidade - hoje) / 86400000);

                // Regras de envio
                const envio3Meses = ['PCMSO', 'ALVARÁ', 'AVCB', 'CADRI', 'CLI', 'Licença de Operação', 'CETESB', 'LTCAT', 'LI - Licença de Instalação', 'LO - Licença de Operação', 'Declaração de Contrato', 'Declaração de Vigência', 'Contrato', 'Alvará', 'LO'];
                const envioDia = ['CND Estadual', 'CND Federal', 'CND Municipal', 'CND Trabalhista', 'CTF IBAMA'];

                const nomeNorm = lic.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
                const tipo3Meses = envio3Meses.some(n => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() === nomeNorm);
                const tipoDia = envioDia.some(n => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() === nomeNorm);

                let deveEnviar = false;

                if (tipo3Meses) {
                    if (diffDias <= 90) {
                        // Verifica se ja enviou nos ultimos 15 dias
                        if (!lic.last_alert_date) {
                            deveEnviar = true;
                        } else {
                            const lastAlert = new Date(lic.last_alert_date);
                            const diffLastAlert = Math.ceil((hoje - lastAlert) / 86400000);
                            if (diffLastAlert >= 15) deveEnviar = true;
                        }
                    }
                } else if (tipoDia) {
                    if (diffDias === 0 && !lic.last_alert_date) {
                        deveEnviar = true;
                    }
                }

                if (deveEnviar) {
                    await dispararEmailLicenca(lic, diffDias, emailDestino);
                    db.run('UPDATE licencas SET last_alert_date = ? WHERE id = ?', [new Date().toISOString(), lic.id]);
                }
            }
        });
    });
}

async function dispararEmailLicenca(lic, diffDias, emailDestino) {
    const transporter = nodemailer.createTransport(SMTP_CONFIG);
    const logoPath = path.join(__dirname, '..', 'frontend', 'assets', 'logo-header.png');

    let statusText = '';
    let colorTheme = '';

    if (diffDias < 0) {
        statusText = 'VENCIDO HÁ ' + Math.abs(diffDias) + ' DIAS';
        colorTheme = '#c0392b';
    } else if (diffDias === 0) {
        statusText = 'VENCE HOJE';
        colorTheme = '#d35400';
    } else {
        statusText = 'VENCE EM ' + diffDias + ' DIAS';
        colorTheme = '#f39c12';
    }

    const validadeFormatada = lic.validade.split('-').reverse().join('/');

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <img src="cid:empresa-logo" style="max-height: 80px;">
            </div>
            <h2 style="color: ${colorTheme}; border-bottom: 2px solid ${colorTheme}; padding-bottom: 10px;">Aviso de Vencimento de Licença</h2>
            <p>O documento <strong>${lic.nome}</strong> da empresa <strong>${lic.empresa}</strong> exige sua atenção.</p>
            
            <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid ${colorTheme};">
                <p style="margin: 5px 0;"><strong>Empresa:</strong> ${lic.empresa}</p>
                <p style="margin: 5px 0;"><strong>Documento:</strong> ${lic.nome}</p>
                <p style="margin: 5px 0;"><strong>Data de Validade:</strong> ${validadeFormatada}</p>
                <p style="margin: 5px 0; color: ${colorTheme}; font-weight: bold; font-size: 1.1em;">Status: ${statusText}</p>
            </div>

            <div style="margin-top: 30px; padding: 15px; border: 2px solid #3498db; border-radius: 8px; background: #ebf5fb; text-align: center;">
                <p style="color: #2980b9; font-weight: bold; margin: 0;">
                    Por favor, acesse o módulo Administrativo > Licenças e faça o upload do documento atualizado no sistema.
                </p>
            </div>

            <p style="margin-top: 30px; font-size: 0.9em; color: #7f8c8d;">Atenciosamente,<br>Sistema América Rental</p>
        </div>
    `;

    try {
        await sendMailHelper({
            from: '"América Rental Administrativo" <' + SMTP_CONFIG.auth.user + '>',
            to: emailDestino,
            subject: `[Aviso] Vencimento: ${lic.nome} - ${lic.empresa}`,
            html: htmlContent,
            attachments: [{ filename: 'logo.png', path: logoPath, cid: 'empresa-logo' }]
        });
        console.log(`[CRON Licencas] Alerta enviado para ${emailDestino} sobre ${lic.nome}`);
    } catch (e) {
        console.error('[CRON Licencas] Erro ao enviar e-mail:', e.message);
    }
}


// =====================================================================
// AUTO-MIGRATION PARA CREDENCIAMENTOS COMERCIAL
// =====================================================================
setTimeout(() => {
db.serialize(() => {
    const columns = [
        "ALTER TABLE credenciamentos ADD COLUMN os TEXT DEFAULT '';",
        "ALTER TABLE credenciamentos ADD COLUMN observacoes TEXT DEFAULT '';",
        "ALTER TABLE credenciamentos ADD COLUMN licencas_ids TEXT;",
        "ALTER TABLE credenciamentos ADD COLUMN endereco_instalacao TEXT;",
        "ALTER TABLE credenciamentos ADD COLUMN acessado_em DATETIME;",
        "ALTER TABLE credenciamentos ADD COLUMN status TEXT DEFAULT 'enviado';",
        "ALTER TABLE credenciamentos ADD COLUMN qtd_max_colaboradores INTEGER DEFAULT 0;",
        "ALTER TABLE credenciamentos ADD COLUMN qtd_max_veiculos INTEGER DEFAULT 0;",
        "ALTER TABLE credenciamentos ADD COLUMN data_limite_envio DATETIME;"
    ];

    columns.forEach(query => {
        db.run(query, (err) => {
            if (err) {
                // Ignore duplicate column errors
            } else {
                console.log("Coluna adicionada em prod:", query);
            }
        });
    });

    db.run("UPDATE credenciamentos SET status = 'enviado' WHERE status IS NULL", (err) => { });
});

}, 3000);
