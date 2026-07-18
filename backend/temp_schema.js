const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('data/hr_system_v2.sqlite');
db.all(`
        SELECT c.id, c.nome_completo, c.departamento, c.foto_path, c.foto_base64, c.status
        FROM colaboradores c
        LEFT JOIN departamentos d ON LOWER(c.departamento) = LOWER(d.nome)
        WHERE (d.tipo = 'Administrativo' OR LOWER(TRIM(c.departamento)) IN ('administrativo', 'financeiro', 'comercial', 'recursos humanos', 'rh', 'diretoria', 'marketing', 'ti'))
          AND (c.status IS NULL OR LOWER(c.status) NOT LIKE '%desligado%')
        ORDER BY LOWER(c.nome_completo) ASC
`, (err, rows) => {
    if (err) console.error(err);
    else console.log('Admin:', rows.length, rows.slice(0, 3));
});
