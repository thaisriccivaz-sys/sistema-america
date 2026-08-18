const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

const target = `sacMigrations.forEach(sql => {
  db.run(sql, err => {
    if (err && !err.message.includes('duplicate column')) {
      // Coluna já existe - ignorar
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

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('backend/server.js', code);
    console.log('Fixed migrations to be sequential (CRLF)');
} else {
    const targetLF = target.replace(/\r\n/g, '\n');
    const replacementLF = replacement.replace(/\r\n/g, '\n');
    if (code.includes(targetLF)) {
        code = code.replace(targetLF, replacementLF);
        fs.writeFileSync('backend/server.js', code);
        console.log('Fixed migrations to be sequential (LF)');
    } else {
        console.log('Target not found in server.js');
    }
}
