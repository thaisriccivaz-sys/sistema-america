const fs = require('fs');
const path = require('path');
const file = path.join('backend', 'routes_candidatos_teste.js');
let content = fs.readFileSync(file, 'utf8');

// 1. Remove notificarTestesCandidatos from POST /api/candidatos-teste
content = content.replace(
    /notificarTestesCandidatos\(\Novo candidato de teste adicionado:(.*?)\\);/g,
    ''
);

// 2. Remove notificarTestesCandidatos from PUT /api/candidatos-teste/:id/status
content = content.replace(
    /db\.get\("SELECT nome FROM candidatos_teste WHERE id = \?", \[req\.params\.id\], \(e, cand\) => \{\s*if \(cand\) notificarTestesCandidatos\(\Candidato \$\{cand\.nome\} foi movido para a etapa: \$\{status\}\\);\s*\}\);/g,
    ''
);

// 3. Add an endpoint to save the date and trigger notification
const dateEndpoint = \
    app.put('/api/candidatos-teste/:id/data', (req, res) => {
        const u = getUser(req);
        const { data_teste } = req.body;
        db.get("SELECT nome, status FROM candidatos_teste WHERE id = ?", [req.params.id], (err, row) => {
            if (err || !row) return res.status(404).json({ error: "Nao encontrado" });
            db.run("UPDATE candidatos_teste SET data_teste = ? WHERE id = ?", [data_teste, req.params.id], (err2) => {
                if (err2) return res.status(500).json({ error: err2.message });
                addLog(req.params.id, "movimentacao", \Data de teste definida para \$\{data_teste\} por \$\{u.nome || u.username || "Sistema"\}\ , req);
                notificarTestesCandidatos(\Candidato \$\{row.nome\} agendado para o dia \$\{data_teste\} na etapa \$\{row.status\}\);
                res.json({ message: "Data atualizada" });
            });
        });
    });
\;

if (!content.includes('/api/candidatos-teste/:id/data')) {
    content = content.replace("app.put('/api/candidatos-teste/:id/status'", dateEndpoint + "\n    app.put('/api/candidatos-teste/:id/status'");
}

fs.writeFileSync(file, content, 'utf8');
console.log('Rotas backend atualizadas');
