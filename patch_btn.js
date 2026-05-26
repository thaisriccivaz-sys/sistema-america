const fs = require('fs');
let html = fs.readFileSync('frontend/index.html', 'utf8');

const regex = /<button type="button" class="btn btn-primary" onclick="window\.abrirModalGerarMTR\(\)"/;

if(regex.test(html)) {
    const syncBtn = `<button type="button" onclick="window.sincronizarMTR()" class="btn btn-primary" style="background-color:#3b82f6;border:none;border-radius:8px;font-weight:600;margin-right:10px;"><i class="ph ph-arrows-clockwise"></i> Sincronizar</button>\n                            `;
    html = html.replace(regex, syncBtn + '<button type="button" class="btn btn-primary" onclick="window.abrirModalGerarMTR()"');
    fs.writeFileSync('frontend/index.html', html);
    console.log('INDEX PATCHED');
} else {
    console.log('NOT FOUND');
}
