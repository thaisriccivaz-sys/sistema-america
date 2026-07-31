const fs = require('fs');
const file = 'backend/database.js';
let c = fs.readFileSync(file, 'utf8');

const regex = /CREATE TABLE IF NOT EXISTS config_notificacoes[\s\S]*?\);[\s\S]*?`\);/;

c = c.replace(regex, match => match + `\n            // Tabela de Tokens para Upload Externo de CND
            db.run(\`
                CREATE TABLE IF NOT EXISTS cnd_upload_tokens (
                    token TEXT PRIMARY KEY,
                    cnd_nome TEXT NOT NULL,
                    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            \`);`);

fs.writeFileSync(file, c);
console.log('Done');
