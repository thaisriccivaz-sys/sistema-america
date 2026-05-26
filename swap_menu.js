const fs = require('fs');
let html = fs.readFileSync('frontend/index.html', 'utf8');

const entregas = '<a href="#" class="nav-item" data-target="logistica-entregas" onclick="navigateTo(\'logistica-entregas\'); return false;"><i class="ph ph-package"></i> Entregas</a>';

// First, remove it from where it currently is
html = html.replace('                    ' + entregas + '\n', '');
html = html.replace(entregas + '\n', '');
html = html.replace(entregas, '');

// Now, insert it after logistica-senhas
const senhas = '<a href="#" class="nav-item" data-target="logistica-senhas" onclick="navigateTo(\'logistica-senhas\'); return false;"><i class="ph ph-lock-key"></i> Cofre de Senhas</a>';

if (html.includes(senhas)) {
    html = html.replace(senhas, senhas + '\n                    ' + entregas);
    fs.writeFileSync('frontend/index.html', html);
    console.log('Moved menu item successfully');
} else {
    console.log('Could not find Cofre de Senhas');
}
