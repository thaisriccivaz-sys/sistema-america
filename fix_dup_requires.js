const fs = require('fs');
let content = fs.readFileSync('backend/server.js', 'utf8');

// Remove o bloco duplicado de requires que foi inserido incorretamente
// O erro ocorre porque o patch duplicou const express = require, etc. na linha 17
// O arquivo original já tem esses requires no topo (linhas 1-13)

// Encontrar e remover o bloco duplicado que começou com a injeção errada
const badBlock = `const express = require('express');\nconst cors = require('cors');\nconst path = require('path');\nconst fs = require('fs');\nconst multer = require('multer');\nconst bcrypt = require('bcryptjs');\nconst jwt = require('jsonwebtoken');\nconst sharp = require('sharp');\nconst nodemailer = require('nodemailer');\nconst pdfParse = require('pdf-parse');\n\n// --- CONFIGURAÃ‡ÃƒO SMTP (Preencher com dados reais para o e-mail funcionar) ---\nconst SMTP_CONFIG = {\n    host: "smtp.gmail.com", \n    port: 465, \n    secure: true, // Gmail em 465 requer SSL direto\n    auth: {\n        user: "americasistema48@gmail.com", \n        pass: "aigusxmgantdtxpd"\n    }\n};\n\nconst db = require('./database');\n\ndb.run("DELETE FROM geradores WHERE nome = 'AUTORIZAÇÃO DE DESCONTO EM FOLHA DE PAGAMENTO'");\ndb.run("DELETE FROM geradores WHERE nome = 'Termo de Responsabilidade de Chaves'");\n\n// Registrar exclusões permanentes para que o seed não recrie\ndb.run("CREATE TABLE IF NOT EXISTS geradores_excluidos (nome TEXT PRIMARY KEY)", () => {\n    db.run("INSERT OR IGNORE INTO geradores_excluidos (nome) VALUES ('Termo de Responsabilidade de Chaves')");\n    db.run("INSERT OR IGNORE INTO geradores_excluidos (nome) VALUES ('AUTORIZAÇÃO DE DESCONTO EM FOLHA DE PAGAMENTO')");\n});\n`;

if (content.includes(badBlock)) {
    content = content.replace(badBlock, '');
    fs.writeFileSync('backend/server.js', content, 'utf8');
    console.log('OK: bloco duplicado removido');
} else {
    // Tenta versão Windows (\r\n)
    const badBlockWin = badBlock.replace(/\n/g, '\r\n');
    if (content.includes(badBlockWin)) {
        content = content.replace(badBlockWin, '');
        fs.writeFileSync('backend/server.js', content, 'utf8');
        console.log('OK (CRLF): bloco duplicado removido');
    } else {
        console.log('Bloco não encontrado com replace direto, tentando regex...');
        // Abordagem: encontrar pela linha problemática "const express = require"
        // que está duplicada após o const SMTP_CONFIG
        const idx = content.indexOf("\nconst express = require('express');");
        if (idx > 0 && idx < 2000) {
            // Deve existir uma segunda ocorrência depois do SMTP_CONFIG
            const secondIdx = content.indexOf("\nconst express = require('express');", idx + 1);
            if (secondIdx > 0) {
                // Encontrar o fim do bloco duplicado (const db = require + deletes)
                const endOfBlock = content.indexOf("// Recarregar configurações do sistema", secondIdx);
                if (endOfBlock > 0) {
                    content = content.substring(0, secondIdx) + '\n' + content.substring(endOfBlock);
                    fs.writeFileSync('backend/server.js', content, 'utf8');
                    console.log('OK (regex): bloco duplicado removido do índice', secondIdx, 'até', endOfBlock);
                } else {
                    console.error('Não encontrou fim do bloco duplicado');
                }
            } else {
                console.log('Não há segunda ocorrência de require express - arquivo pode estar ok');
            }
        } else {
            console.log('Primeira ocorrência em idx:', idx, '- verificar manualmente');
        }
    }
}
