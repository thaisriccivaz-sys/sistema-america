const fs = require('fs');

const path = 'backend/server.js';
let content = fs.readFileSync(path, 'utf8');

// Fix the destructuring syntax errors
content = content.replace(
    /const \{ cliente_nome, os \|\| '', cliente_email/g,
    "const { cliente_nome, os, cliente_email"
);

// Fix the SQL syntax errors
content = content.replace(
    /INSERT INTO credenciamentos \(cliente_nome, os \|\| '', cliente_email/g,
    "INSERT INTO credenciamentos (cliente_nome, os, cliente_email"
);

// Fix the other possible occurrences like UPDATE credenciamentos SET cliente_nome = ?, os || '' = ?, cliente_email = ?
// Wait, the UPDATE query was manually replaced, let's see what it is:
// db.run(`UPDATE credenciamentos SET cliente_nome = ?, os = ?, cliente_email = ?
// That one is probably fine.

fs.writeFileSync(path, content);
console.log('Fixed server.js');
