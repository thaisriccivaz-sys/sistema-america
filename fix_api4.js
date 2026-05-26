const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

const target = `
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

if (code.includes(target)) {
    code = code.replace(target, ''); // Remove it from where it is
    
    // Now we must find where to put it. 
    // It should go right before "function verificarLicencasVencimentoCron() {"
    const dest = 'function verificarLicencasVencimentoCron() {';
    if (code.includes(dest)) {
        code = code.replace(dest, target + '\n' + dest);
        fs.writeFileSync('backend/server.js', code);
        console.log('Fixed properly.');
    } else {
        console.log('Destination not found');
    }
} else {
    console.log('Target block not found precisely.');
}
