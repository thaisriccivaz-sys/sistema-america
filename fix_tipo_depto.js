const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

// Use the exact content from the file (CRLF line endings)
const oldQuery = "  const sqlColabs = `\r\n    SELECT id, nome_completo, departamento, cargo, status, foto_path, foto_base64\r\n    FROM colaboradores\r\n    WHERE status != 'Desligado'\r\n    ORDER BY nome_completo ASC\r\n  `;";

const newQuery = "  const sqlColabs = `\r\n    SELECT c.id, c.nome_completo, c.departamento, c.cargo, c.status, c.foto_path, c.foto_base64,\r\n           d.tipo AS departamento_tipo\r\n    FROM colaboradores c\r\n    LEFT JOIN departamentos d ON c.departamento = d.nome\r\n    WHERE c.status != 'Desligado'\r\n    ORDER BY c.nome_completo ASC\r\n  `;";

const count = code.split(oldQuery).length - 1;
console.log('Occurrences found:', count);

if (count !== 1) {
  console.error('Expected exactly 1 occurrence, found', count);
  process.exit(1);
}

code = code.replace(oldQuery, newQuery);
fs.writeFileSync('backend/server.js', code);
console.log('Fixed sqlColabs - departamento_tipo now returned from JOIN with departamentos');
