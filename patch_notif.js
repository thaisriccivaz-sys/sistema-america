const path = require('path');
const fs = require('fs');
const filePath = path.join('backend', 'routes_candidatos_teste.js');
let content = fs.readFileSync(filePath, 'utf8');

const notifFn = \
    function notificarTestesCandidatos(mensagem) {
        const tipoNotif = 'testes_candidatos';
        db.all('SELECT usuario_id FROM config_notificacoes WHERE tipo = ?', [tipoNotif], (err, rows) => {
            if (!err && rows && rows.length > 0) {
                rows.forEach(r => {
                    db.run("INSERT INTO notificacoes_usuarios (usuario_id, tipo, mensagem, dados) VALUES (?, ?, ?, ?)",
                        [r.usuario_id, tipoNotif, mensagem, '{}']);
                });
            }
        });
    }
\;

content = content.replace('function contarComentarios(candidatoId, cb) {', notifFn + '\\n    function contarComentarios(candidatoId, cb) {');

// Now add call inside POST /api/candidatos-teste
content = content.replace(
    /addLog\\(this\\.lastID, "movimentacao", \Candidato criado na coluna Entrevistas por \\$\\{u\\.nome \\|\\| u\\.username \\|\\| "Sistema"\\}\\.\, req\\);/g,
    'addLog(this.lastID, "movimentacao", \Candidato criado na coluna Entrevistas por \.\, req);\\n                notificarTestesCandidatos(\Novo candidato de teste adicionado: \ (\)\);'
);

// Now add call inside PUT /api/candidatos-teste/:id/status
content = content.replace(
    /addLog\\(req\\.params\\.id, "movimentacao", log, req\\);/g,
    'addLog(req.params.id, "movimentacao", log, req);\\n                db.get("SELECT nome FROM candidatos_teste WHERE id = ?", [req.params.id], (e, cand) => { if (cand) notificarTestesCandidatos(\\ foi movido para a etapa: \\); });'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Patch aplicado com sucesso.');
