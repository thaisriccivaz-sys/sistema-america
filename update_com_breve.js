const fs = require('fs');

let path = 'frontend/usuarios.js';
let content = fs.readFileSync(path, 'utf8');

// Remove from TELAS_SISTEMA
content = content.replace(/\s*\{ modulo: 'Comercial', pagina_id: 'comercial-em-breve', pagina_nome: 'Comercial \(Em breve\)', icone: 'ph-handshake' \},/, '');

// Remove from MENU_HIERARQUIA
content = content.replace(/telas: \['comercial-credenciamento', 'comercial-em-breve'\]/g, "telas: ['comercial-credenciamento']");

fs.writeFileSync(path, content, 'utf8');
console.log("Hidden Comercial Em breve");