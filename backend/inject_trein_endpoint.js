const fs = require('fs');
let code = fs.readFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/backend/server.js', 'utf8');

const target = `app.post('/api/treinamento-presenca/assinar', authenticateToken, (req, res) => {`;
const inject = `app.get('/api/treinamento-presenca/auditoria/:id', authenticateToken, (req, res) => {
    db.get(
        \`SELECT tp.*, c.nome_completo as colaborador_nome, t.nome as treinamento_nome, t.tipo as treinamento_tipo
         FROM treinamento_presenca tp
         LEFT JOIN colaboradores c ON tp.colaborador_id = c.id
         LEFT JOIN treinamentos t ON tp.treinamento_id = t.id
         WHERE tp.id = ?\`,
        [req.params.id],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!row) return res.status(404).json({ error: 'Registro não encontrado' });
            res.json(row);
        }
    );
});

app.post('/api/treinamento-presenca/assinar', authenticateToken, (req, res) => {`;

if(!code.includes('app.get(\'/api/treinamento-presenca/auditoria/:id\',')) {
    code = code.replace(target, inject);
    fs.writeFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/backend/server.js', code, 'utf8');
    console.log('Endpoint added to server.js');
} else {
    console.log('Endpoint already exists');
}
