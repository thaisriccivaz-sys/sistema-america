const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

const t2 = `app.get('/api/debug-pfx3', async (req, res) => {`;
const r2 = `app.get('/api/debug-pfx3', async (req, res) => {
    try {
        db.run("UPDATE documentos SET signed_file_path = NULL WHERE id IN (SELECT id FROM documentos ORDER BY id DESC LIMIT 5)");
        res.json({ok:true});
    }catch(e){}
});

app.get('/api/debug-pfx4', async (req, res) => {`;

js = js.replace(t2, r2);
fs.writeFileSync('backend/server.js', js, 'utf8');
