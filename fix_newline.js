const fs = require('fs');
let indexHtml = fs.readFileSync('frontend/index.html', 'utf8');
indexHtml = indexHtml.replace(
    /onclick="navigateTo\(\\'testes-candidatos\\'\); return false;"><i class="ph ph-clipboard-text"><\/i>\\n                        Candidatos<\/a>/g,
    'onclick="navigateTo(\\'testes-candidatos\\'); return false;"><i class="ph ph-clipboard-text"></i>\\n                        Candidatos</a>'
);
fs.writeFileSync('frontend/index.html', indexHtml, 'utf8');
