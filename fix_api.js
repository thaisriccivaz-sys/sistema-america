const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

const badApiBlock = `
// Rota para a página de Entregas
app.get('/api/logistica/entregas', authenticateToken, (req, res) => {
    db.all(\`SELECT id, numero_os, cliente, endereco, data_os, tipo_servico, link_video 
            FROM os_logistica 
            WHERE tipo_servico LIKE '%ENTREGA%' AND status != 'Finalizado' AND status != 'Cancelado'
            ORDER BY data_os DESC\`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
`;

// Remove the bad block
if (code.includes(badApiBlock)) {
    code = code.replace(badApiBlock, '');
    console.log('Removed from bad location');
    
    // Add it BEFORE function verificarLicencasVencimentoCron() {
    const target = 'function verificarLicencasVencimentoCron() {';
    if (code.includes(target)) {
        code = code.replace(target, badApiBlock + '\n\n' + target);
        fs.writeFileSync('backend/server.js', code);
        console.log('Inserted in correct location');
    }
}
