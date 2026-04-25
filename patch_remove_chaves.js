const fs = require('fs');
let content = fs.readFileSync('backend/server.js', 'utf8');

// ============================================================
// MUDANÇA 1: Remove 'Termo de Responsabilidade de Chaves' do GERADORES_PERFIL
// ============================================================
const old1 = "    'Contrato Academia',\r\n    'Termo de Responsabilidade de Chaves',\r\n";
const new1 = "    'Contrato Academia',\r\n    // 'Termo de Responsabilidade de Chaves' -- removido permanentemente\r\n";

if (content.includes(old1)) {
    content = content.replace(old1, new1);
    console.log('OK: Removido do GERADORES_PERFIL');
} else {
    // Try LF
    const old1b = "    'Contrato Academia',\n    'Termo de Responsabilidade de Chaves',\n";
    const new1b = "    'Contrato Academia',\n    // 'Termo de Responsabilidade de Chaves' -- removido permanentemente\n";
    if (content.includes(old1b)) {
        content = content.replace(old1b, new1b);
        console.log('OK (LF): Removido do GERADORES_PERFIL');
    } else {
        console.error('FAIL 1: padrao nao encontrado');
    }
}

// ============================================================
// MUDANÇA 2: Adiciona registro na geradores_excluidos logo após os DELETEs iniciais
// ============================================================
const old2 = "db.run(\"DELETE FROM geradores WHERE nome = 'Termo de Responsabilidade de Chaves'\");\r\n\r\n\r\n";
const new2 = "db.run(\"DELETE FROM geradores WHERE nome = 'Termo de Responsabilidade de Chaves'\");\r\n// Registrar exclusoes permanentes para que o seed nao recrie\r\ndb.run(\"CREATE TABLE IF NOT EXISTS geradores_excluidos (nome TEXT PRIMARY KEY)\", () => {\r\n    db.run(\"INSERT OR IGNORE INTO geradores_excluidos (nome) VALUES ('Termo de Responsabilidade de Chaves')\");\r\n    db.run(\"INSERT OR IGNORE INTO geradores_excluidos (nome) VALUES ('AUTORIZACAO DE DESCONTO EM FOLHA DE PAGAMENTO')\");\r\n});\r\n\r\n\r\n";

if (content.includes(old2)) {
    content = content.replace(old2, new2);
    console.log('OK: Adicionado registro de exclusao permanente');
} else {
    // Try LF
    const old2b = "db.run(\"DELETE FROM geradores WHERE nome = 'Termo de Responsabilidade de Chaves'\");\n\n\n";
    const new2b = "db.run(\"DELETE FROM geradores WHERE nome = 'Termo de Responsabilidade de Chaves'\");\n// Registrar exclusoes permanentes para que o seed nao recrie\ndb.run(\"CREATE TABLE IF NOT EXISTS geradores_excluidos (nome TEXT PRIMARY KEY)\", () => {\n    db.run(\"INSERT OR IGNORE INTO geradores_excluidos (nome) VALUES ('Termo de Responsabilidade de Chaves')\");\n    db.run(\"INSERT OR IGNORE INTO geradores_excluidos (nome) VALUES ('AUTORIZACAO DE DESCONTO EM FOLHA DE PAGAMENTO')\");\n});\n\n\n";
    if (content.includes(old2b)) {
        content = content.replace(old2b, new2b);
        console.log('OK (LF): Adicionado registro de exclusao permanente');
    } else {
        // Try finding without triple newline
        const searchStr = "db.run(\"DELETE FROM geradores WHERE nome = 'Termo de Responsabilidade de Chaves'\");";
        const idx = content.indexOf(searchStr);
        if (idx >= 0) {
            const insertAt = idx + searchStr.length;
            const insertion = "\n// Registrar exclusoes permanentes para que o seed nao recrie\ndb.run(\"CREATE TABLE IF NOT EXISTS geradores_excluidos (nome TEXT PRIMARY KEY)\", () => {\n    db.run(\"INSERT OR IGNORE INTO geradores_excluidos (nome) VALUES ('Termo de Responsabilidade de Chaves')\");\n    db.run(\"INSERT OR IGNORE INTO geradores_excluidos (nome) VALUES ('AUTORIZACAO DE DESCONTO EM FOLHA DE PAGAMENTO')\");\n});\n";
            content = content.substring(0, insertAt) + insertion + content.substring(insertAt);
            console.log('OK (insert): Adicionado registro de exclusao permanente');
        } else {
            console.error('FAIL 2: padrao nao encontrado');
        }
    }
}

// ============================================================
// MUDANÇA 3: Atualiza o GERADORES_PERFIL seed para verificar geradores_excluidos
// ============================================================
const old3 = "GERADORES_PERFIL.forEach(nome => {\r\n    db.run(\r\n        \"INSERT OR IGNORE INTO geradores (nome, conteudo) VALUES (?, ?)\",";
const new3 = "GERADORES_PERFIL.forEach(nome => {\r\n    // Verifica se o gerador foi excluido manualmente pelo usuario\r\n    db.get(\"SELECT nome FROM geradores_excluidos WHERE nome = ?\", [nome], (e, excluido) => {\r\n      if (excluido) return; // Nao recriar se foi excluido manualmente\r\n      db.run(\r\n        \"INSERT OR IGNORE INTO geradores (nome, conteudo) VALUES (?, ?)\",";
if (content.includes(old3)) {
    // also need to close the extra brace at the end of the forEach
    const old3b = "        (err) => { if (err && !err.message.includes('UNIQUE')) console.error(`Erro ao criar gerador \"${nome}\":`, err); }\r\n    );\r\n});\r\n";
    const new3b = "        (err) => { if (err && !err.message.includes('UNIQUE')) console.error(`Erro ao criar gerador \"${nome}\":`, err); }\r\n      );\r\n    });\r\n});\r\n";
    content = content.replace(old3, new3).replace(old3b, new3b);
    console.log('OK: forEach atualizado para verificar geradores_excluidos');
}

fs.writeFileSync('backend/server.js', content, 'utf8');
console.log('server.js salvo');
