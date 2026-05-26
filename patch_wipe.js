const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

const wipeEndpoint = `
app.get('/api/wipe-credenciamentos', (req, res) => {
    db.run('DELETE FROM credenciamentos', (err) => {
        res.json({ message: 'Todos os credenciamentos foram limpos.', error: err });
    });
});
`;

if (!js.includes('/api/wipe-credenciamentos')) {
    js = js.replace('// --- GRUPOS DE PERMISSÃO ---', wipeEndpoint + '\n// --- GRUPOS DE PERMISSÃO ---');
    fs.writeFileSync('backend/server.js', js, 'utf8');
    console.log('Endpoint /api/wipe-credenciamentos adicionado.');
} else {
    console.log('Endpoint já existe');
}
