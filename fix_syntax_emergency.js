const fs = require('fs');
const path = require('path');
const f = path.join(__dirname, 'frontend', 'app.js');
let app = fs.readFileSync(f, 'utf8');

// Corrigir a linha quebrada - remover o comentário mal posicionado dentro do template literal
app = app.replace(
    "        const res = await fetch(`${API_URL}/documentos` // rota correta, {\r\n            method: 'POST', headers: {'Authorization': `Bearer ${currentToken}`}, body: formData\r\n        });",
    "        const res = await fetch(`${API_URL}/documentos`, {\r\n            method: 'POST', headers: {'Authorization': `Bearer ${currentToken}`}, body: formData\r\n        }); // rota correta"
);

app = app.replace(
    "        const res = await fetch(`${API_URL}/documentos` // rota correta, {\n            method: 'POST', headers: {'Authorization': `Bearer ${currentToken}`}, body: formData\n        });",
    "        const res = await fetch(`${API_URL}/documentos`, {\n            method: 'POST', headers: {'Authorization': `Bearer ${currentToken}`}, body: formData\n        }); // rota correta"
);

fs.writeFileSync(f, app, 'utf8');
console.log('✅ Sintaxe corrigida');
