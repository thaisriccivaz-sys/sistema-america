const fs = require('fs');
let html = fs.readFileSync('frontend/index.html', 'utf8');
html = html.replace(/<h3.*>Atestados Recebidos.*?<\/h3>/g, '<h3 style="font-size: 1.1rem; color: #475569; margin-bottom: 1rem;">Frequência: Faltas e Atestados (Últimos 6 Meses)</h3>');
fs.writeFileSync('frontend/index.html', html, 'utf8');
