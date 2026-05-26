const fs = require('fs');

let htmlPath = 'frontend/index.html';
let html = fs.readFileSync(htmlPath, 'utf8');

// 1. Add spans for the limits in the Logistics Modal
html = html.replace(
    '<h3><i class="ph ph-users"></i> Colaboradores</h3>',
    '<h3><i class="ph ph-users"></i> Colaboradores <span id="cred-limit-colabs-span" style="font-size:12px; color:#64748b; font-weight:normal; margin-left:8px;"></span></h3>'
);

html = html.replace(
    '<h3><i class="ph ph-truck"></i> Veículos</h3>',
    '<h3><i class="ph ph-truck"></i> Veículos <span id="cred-limit-veics-span" style="font-size:12px; color:#64748b; font-weight:normal; margin-left:8px;"></span></h3>'
);

// 2. Add spans in the selection modals headers
html = html.replace(
    '<h3>Selecionar Colaboradores</h3>',
    '<h3>Selecionar Colaboradores <span id="cred-modal-limit-colabs-span" style="font-size:12px; color:#64748b; font-weight:normal; margin-left:8px;"></span></h3>'
);

html = html.replace(
    '<h3>Selecionar Veículos</h3>',
    '<h3>Selecionar Veículos <span id="cred-modal-limit-veics-span" style="font-size:12px; color:#64748b; font-weight:normal; margin-left:8px;"></span></h3>'
);

// 3. Add columns to Logistics table
html = html.replace(
    '<th>Colaboradores</th>',
    '<th>Máx. Colab.</th>\n                                        <th>Colaboradores</th>'
);
html = html.replace(
    '<th>Veículos</th>',
    '<th>Máx. Veíc.</th>\n                                        <th>Veículos</th>'
);
// Also fix the colspan in the empty message
html = html.replace(
    '<td colspan="6" style="text-align:center; color:#94a3b8; padding:2rem;">Carregando histórico...</td>',
    '<td colspan="8" style="text-align:center; color:#94a3b8; padding:2rem;">Carregando histórico...</td>'
);

fs.writeFileSync(htmlPath, html, 'utf8');
console.log("Updated index.html");