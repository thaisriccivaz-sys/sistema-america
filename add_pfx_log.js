const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

const target = `} catch(e) {}`;
const repl = `} catch(e) {
    console.error('PFX PROXY ERR:', e.message);
    try {
        db.run('INSERT INTO system_logs (msg) VALUES (?)', ['PFX PROXY ERR: ' + e.message]);
    } catch(dbErr) {}
}`;

js = js.split(target).join(repl);
fs.writeFileSync('backend/server.js', js, 'utf8');
