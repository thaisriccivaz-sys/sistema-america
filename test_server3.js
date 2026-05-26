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

let extracted = '';
const idx = code.indexOf('// Rota para a página de Entregas');
if(idx > -1) {
    const endIdx = code.indexOf('});', code.indexOf('res.json(rows);', idx)) + 3;
    extracted = code.substring(idx, endIdx);
    
    // Remove it
    code = code.replace(extracted, '');
    
    // Find where to put it
    const beforeCron = code.indexOf('function verificarLicencasVencimentoCron() {');
    code = code.slice(0, beforeCron) + extracted + '\n\n' + code.slice(beforeCron);
    
    fs.writeFileSync('backend/server.js', code);
    console.log('Fixed API route successfully');
} else {
    console.log('Not found');
}
