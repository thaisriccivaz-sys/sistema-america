const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

js = js.replace(`FROM admissao_assinaturas WHERE assinafy_status = 'Pendente' AND assinafy_id IS NOT NULL`, `FROM admissao_assinaturas WHERE (assinafy_status = 'Pendente' OR (assinafy_status = 'Assinado' AND signed_file_path IS NULL)) AND assinafy_id IS NOT NULL`);

js = js.replace(`FROM documentos WHERE assinafy_status = 'Pendente' AND assinafy_id IS NOT NULL`, `FROM documentos WHERE (assinafy_status = 'Pendente' OR (assinafy_status = 'Assinado' AND signed_file_path IS NULL)) AND assinafy_id IS NOT NULL`);

fs.writeFileSync('backend/server.js', js, 'utf8');
