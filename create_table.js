const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

const t2 = `app.get('/api/debug-pfx2', async (req, res) => {`;
const r2 = `app.get('/api/debug-pfx2', async (req, res) => {
    db.run("CREATE TABLE IF NOT EXISTS system_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, msg TEXT, ts DATETIME DEFAULT CURRENT_TIMESTAMP)");
`;

js = js.replace(t2, r2);
fs.writeFileSync('backend/server.js', js, 'utf8');
