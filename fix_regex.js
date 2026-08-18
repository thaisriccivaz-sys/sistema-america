const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

const target = `sacMigrations.forEach(sql => {
  db.run(sql, err => {
    if (err && !err.message.includes('duplicate column')) {
      // Coluna j existe - ignorar
    }
  });
});`;

const replacement = `db.serialize(() => {
  sacMigrations.forEach(sql => {
    db.run(sql, err => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('[SAC Migration Error]', err.message);
      }
    });
  });
});`;

// Because of possible character encoding, let's just use regex
const regex = /sacMigrations\.forEach\s*\(\s*sql\s*=>\s*\{\s*db\.run\s*\(\s*sql\s*,\s*err\s*=>\s*\{\s*if\s*\(\s*err\s*&&\s*!err\.message\.includes\(\s*'duplicate column'\s*\)\s*\)\s*\{\s*\/\/[^\n]*\s*\}\s*\}\s*\);\s*\}\s*\);/g;

code = code.replace(regex, replacement);
fs.writeFileSync('backend/server.js', code);
console.log('Regex replace done');
