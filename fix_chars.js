const fs = require('fs');
let html = fs.readFileSync('frontend/index.html', 'utf8');

// The replacement character \uFFFD is what was written
html = html.replace('Controle de Presen\uFFFDas', 'Controle de Presenças');
html = html.replace('conclus\uFFFDo de treinamentos', 'conclusão de treinamentos');
html = html.replace('Legenda r\uFFFDpida', 'Legenda rápida');
html = html.replace('Conclu\uFFFDdo', 'Concluído');
html = html.replace('Pendente \uFFFD clique', 'Pendente — clique');
html = html.replace('id="pres-counter" style="font-size:0.82rem;color:#64748b;background:#f1f5f9;border-radius:20px;padding:6px 14px;font-weight:600;">\uFFFD</span>', 'id="pres-counter" style="font-size:0.82rem;color:#64748b;background:#f1f5f9;border-radius:20px;padding:6px 14px;font-weight:600;">—</span>');
html = html.replace('Cabe\uFFFDalho', 'Cabeçalho');

fs.writeFileSync('frontend/index.html', html, 'utf8');
