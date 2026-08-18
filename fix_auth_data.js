const fs = require('fs');
const file = 'backend/routes_candidatos_teste.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("app.put('/api/candidatos-teste/:id/data', (req, res)", "app.put('/api/candidatos-teste/:id/data', authenticateToken, (req, res)");

fs.writeFileSync(file, content, 'utf8');
