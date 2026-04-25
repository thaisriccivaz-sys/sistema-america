const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

db.run("UPDATE documentos SET assinafy_signed_at = CURRENT_TIMESTAMP WHERE assinafy_status = 'Assinado' AND assinafy_signed_at IS NULL", function(err) {
    console.log("Documentos corrigidos:", this.changes);
});

db.run("UPDATE admissao_assinaturas SET assinado_em = CURRENT_TIMESTAMP WHERE assinafy_status = 'Assinado' AND assinado_em IS NULL", function(err) {
    console.log("Admissões corrigidas:", this.changes);
});
