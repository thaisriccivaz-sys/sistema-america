const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

const wipeEndpoint = `
// DELETE Autenticado: Limpar toda a tabela de credenciamentos (Botão Limpar Lista)
app.delete('/api/logistica/credenciamentos/limpar-lista', authenticateToken, (req, res) => {
    db.run('DELETE FROM credenciamentos', (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Todos os credenciamentos foram limpos.' });
    });
});
`;

js = js.replace(/app\.get\('\/api\/wipe-credenciamentos'[\s\S]*?\}\);/g, ''); // remove the temporary one
if (!js.includes('/api/logistica/credenciamentos/limpar-lista')) {
    const attachPoint = js.indexOf("app.delete('/api/logistica/credenciamentos/:id'");
    if (attachPoint !== -1) {
        js = js.substring(0, attachPoint) + wipeEndpoint + '\n' + js.substring(attachPoint);
        fs.writeFileSync('backend/server.js', js, 'utf8');
        console.log('Endpoint authenticated wipe added');
    } else {
        console.log('Attach point not found in server.js');
    }
}
