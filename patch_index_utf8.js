const fs = require('fs');
const path = require('path');
const file = path.join('frontend', 'index.html');
let content = fs.readFileSync(file, 'utf8');

const ts = Date.now();
content = content.replace(/usuarios\.js\?v=\w+/g, 'usuarios.js?v=' + ts);
content = content.replace(/app\.js\?v=\w+/g, 'app.js?v=' + ts);
content = content.replace(/notificacoes\.js\?v=\w+/g, 'notificacoes.js?v=' + ts);

// Move Testes de Candidatos
const itemToMove = \                            <a href="#" class="nav-item nav-item-sub" data-target="testes-candidatos"
                               onclick="navigateTo('testes-candidatos'); return false;">
                               <i class="ph ph-clipboard-text"></i> Testes de Candidatos</a>
\;

content = content.replace(itemToMove, '');

const targetPlacement = \                    <a href="#" class="nav-item" data-target="admissao"><i class="ph ph-list-checks"></i>
                        Admiss&atilde;o</a>\;

const newItem = \                    <a href="#" class="nav-item" data-target="testes-candidatos" onclick="navigateTo('testes-candidatos'); return false;"><i class="ph ph-clipboard-text"></i>
                        Testes de Candidatos</a>
\;

content = content.replace(targetPlacement, newItem + targetPlacement);

fs.writeFileSync(file, content, 'utf8');
console.log('Index.html atualizado e menu movido via Node.js');
