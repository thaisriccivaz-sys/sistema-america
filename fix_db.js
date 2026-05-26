const fs = require('fs');
const path = 'backend/database.js';
let content = fs.readFileSync(path, 'utf8');

const target = /token TEXT NOT NULL UNIQUE,\s*colaboradores_ids TEXT,\s*veiculos_ids TEXT,\s*docs_exigidos TEXT,/m;
const replacement = `token TEXT NOT NULL UNIQUE,
                    os TEXT DEFAULT '',
                    observacoes TEXT DEFAULT '',
                    colaboradores_ids TEXT,
                    veiculos_ids TEXT,
                    docs_exigidos TEXT,`;

if (content.match(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Fixed database.js CREATE TABLE");
} else {
    console.log("Regex not matched in database.js!");
}