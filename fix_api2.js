const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

const regex = /\/\/ Rota para a página de Entregas[\s\S]*?app\.get\('\/api\/logistica\/entregas'[\s\S]*?\}\);\n\n\}\);/;
const match = code.match(regex);
if (match) {
    const extracted = match[0].replace('\n});', ''); // Removes the trailing });
    const replacement = '});\n\n' + extracted;
    code = code.replace(match[0], replacement);
    fs.writeFileSync('backend/server.js', code);
    console.log('Fixed API route');
} else {
    console.log('Not found');
}
