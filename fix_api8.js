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
    code = code.replace(target, '');
    
    // Put it correctly at the top level
    const cronFunc = 'function verificarLicencasVencimentoCron() {';
    if (code.includes(cronFunc)) {
        code = code.replace(cronFunc, target + '\n' + cronFunc);
        fs.writeFileSync('backend/server.js', code);
        console.log('Fixed correctly by moving to cron function');
    }
}
