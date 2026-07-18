const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

// Fix the /api/treinamentos/:id/anexos endpoint - remove the spurious sqlColabs and fix the db.all query
const broken = `app.get('/api/treinamentos/:id/anexos', authenticateToken, (req, res) => {\r\n  const sqlColabs = \`\r\n    SELECT c.id, c.nome_completo, c.departamento, c.cargo, c.status, c.foto_path, c.foto_base64,\r\n           d.tipo AS departamento_tipo\r\n    FROM colaboradores c\r\n    LEFT JOIN departamentos d ON c.departamento = d.nome\r\n    WHERE c.status != 'Desligado'\r\n    ORDER BY c.nome_completo ASC\r\n  \`;\r\n  db.all(\r\n    \`SELECT a.*, d.tipo AS departamento_tipo FROM treinamento_anexos a \r\n     LEFT JOIN colaboradores c ON a.enviado_por_id = c.id\r\n     LEFT JOIN departamentos d ON c.departamento = d.nome\r\n     WHERE a.treinamento_id = ? ORDER BY a.enviado_em DESC\`,\r\n    [req.params.id],\r\n    (err, rows) => {\r\n      if (err) return res.status(500).json({ error: err.message });\r\n      res.json(rows || []);\r\n    }\r\n  );\r\n});`;

const fixed = `app.get('/api/treinamentos/:id/anexos', authenticateToken, (req, res) => {\r\n  db.all(\r\n    \`SELECT * FROM treinamento_anexos WHERE treinamento_id = ? ORDER BY enviado_em DESC\`,\r\n    [req.params.id],\r\n    (err, rows) => {\r\n      if (err) return res.status(500).json({ error: err.message });\r\n      res.json(rows || []);\r\n    }\r\n  );\r\n});`;

const count = code.split(broken).length - 1;
console.log('Occurrences of broken endpoint:', count);

if (count === 1) {
  code = code.replace(broken, fixed);
  fs.writeFileSync('backend/server.js', code);
  console.log('Cleaned up spurious sqlColabs from /api/treinamentos/:id/anexos');
} else {
  console.error('Could not find broken pattern exactly, manual review needed');
}
