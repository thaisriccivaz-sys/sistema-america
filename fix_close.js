const fs = require('fs');
const file = 'frontend/testes_candidatos.js';
let content = fs.readFileSync(file, 'utf8');

// For _tcEnvCom
content = content.replace('window._tcFecharModal(); await _load(); _render(); window._tcDetalhes(id);', 'await _load(); _render(); window._tcDetalhes(id);');

// For _tcUpDoc
content = content.replace('window._tcFecharModal(); await _load(); _render();\\n        Swal.fire({icon:\\"success\\",title:\\"Documento enviado!\\"', 'await _load(); _render(); window._tcDetalhes(id);\\n        Swal.fire({icon:\\"success\\",title:\\"Documento enviado!\\"');
// Wait, my regex string replacement might not have matched the literal newline. Let's just use string replace carefully:
