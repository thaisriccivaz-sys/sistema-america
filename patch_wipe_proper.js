const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

const oldWipe = `
app.get('/api/wipe-credenciamentos', (req, res) => {
    db.run('DELETE FROM credenciamentos', (err) => {
        res.json({ message: 'Todos os credenciamentos foram limpos.', error: err });
    });
});
`;

const newWipe = `
// DELETE Autenticado: Limpar toda a tabela de credenciamentos (Botão Limpar Lista)
app.delete('/api/logistica/credenciamentos/limpar-lista', authenticateToken, (req, res) => {
    db.run('DELETE FROM credenciamentos', (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Todos os credenciamentos foram limpos.' });
    });
});
`;

if (js.includes(oldWipe)) {
    js = js.replace(oldWipe, newWipe);
} else {
    // If not found exactly, just insert the new wipe near the users endpoint
    const attachPoint = js.indexOf("app.delete('/api/usuarios/:id'");
    if (attachPoint !== -1) {
        js = js.substring(0, attachPoint) + newWipe + '\n' + js.substring(attachPoint);
    }
}

fs.writeFileSync('backend/server.js', js, 'utf8');
console.log('server.js patched properly');
