const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

const target = `app.get('/api/version', (req, res) => res.json({ version: 'V47_DIAGNOSIS' }));`;
const repl = `app.get('/api/version', (req, res) => res.json({ version: 'V47_DIAGNOSIS' }));
app.get('/api/get-system-logs', (req, res) => {
    try {
        db.all('SELECT * FROM system_logs ORDER BY id DESC LIMIT 50', [], (err, rows) => {
             res.json(err ? {error: err.message} : rows);
        });
    } catch(e) { res.status(500).json({error:e.message}) }
});`;

js = js.replace(target, repl);
fs.writeFileSync('backend/server.js', js, 'utf8');
