const fs = require('fs');
const path = require('path');
const file = path.join('frontend', 'testes_candidatos.js');
let content = fs.readFileSync(file, 'utf8');

// 1. Fix _tcDragDrop prompt
content = content.replace(
    /if\s*\(newStatus\s*===\s*"Aguardando Data"\)\s*\{\s*dt\s*=\s*prompt[^\}]+\}\s*else\s*if\s*\(newStatus\s*===\s*"Teste 1º Dia"/g,
    'if (newStatus === "Teste 1º Dia"'
);
content = content.replace(
    /if\s*\(newStatus\s*===\s*"Aguardando Data"\)\s*\{\s*dt\s*=\s*prompt[^\}]+\}\s*else\s*if\s*\(newStatus/g,
    'if(newStatus'
);
// The above might fail depending on exact match. Let's do a more robust regex or string replace.
