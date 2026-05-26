const fs = require('fs');

// PATCH HTML (AUTOFILL + CLASSE RESIDUO)
let html = fs.readFileSync('frontend/index.html', 'utf8');

// 1. Rename filter IDs to prevent autofill
html = html.replace('id="filtro-mtr-gerador"', 'id="f_mtr_ger_x1"');
html = html.replace('id="filtro-mtr-destinador"', 'id="f_mtr_dst_x2"');

// 2. Add Classe input next to Residuo
const residuoHtml = `<div class="mb-3">
                            <label class="form-label" style="font-weight: 600; color: #475569; font-size: 0.9rem;">Resíduo *</label>
                            <select name="residuo" class="form-control" required style="border-radius: 8px; border: 1px solid #e2e8f0; padding: 0.6rem;"></select>
                        </div>`;

const newResiduoHtml = `<div class="row">
                            <div class="col-md-6 mb-3">
                                <label class="form-label" style="font-weight: 600; color: #475569; font-size: 0.9rem;">Resíduo *</label>
                                <select name="residuo" class="form-control" required style="border-radius: 8px; border: 1px solid #e2e8f0; padding: 0.6rem;"></select>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label" style="font-weight: 600; color: #475569; font-size: 0.9rem;">Classe *</label>
                                <input type="text" name="classeNome" class="form-control" value="CLASSE II A" readonly required style="border-radius: 8px; border: 1px solid #e2e8f0; padding: 0.6rem; background: #f8fafc;">
                                <input type="hidden" name="claCodigo" value="18">
                            </div>
                        </div>`;

if(html.includes(residuoHtml)) {
    html = html.replace(residuoHtml, newResiduoHtml);
    console.log('RESIDUO HTML INJECTED');
} else {
    // try fallback regex
    const regRes = /<div class="mb-3">\s*<label class="form-label"[^>]*>Resíduo \*<\/label>\s*<select name="residuo"[^>]*><\/select>\s*<\/div>/;
    if(regRes.test(html)) {
        html = html.replace(regRes, newResiduoHtml);
        console.log('RESIDUO HTML INJECTED VIA REGEX');
    } else {
        console.log('COULD NOT FIND RESIDUO HTML TO REPLACE');
    }
}

fs.writeFileSync('frontend/index.html', html);


// PATCH JS (AUTOFILL IDs)
let mtrJs = fs.readFileSync('frontend/mtr.js', 'utf8');
mtrJs = mtrJs.replace("document.getElementById('filtro-mtr-gerador')", "document.getElementById('f_mtr_ger_x1')");
mtrJs = mtrJs.replace("document.getElementById('filtro-mtr-destinador')", "document.getElementById('f_mtr_dst_x2')");
fs.writeFileSync('frontend/mtr.js', mtrJs);


// PATCH SERVER JS (SYNC CASE SENSITIVE AND CLA_CODIGO)
let serverJs = fs.readFileSync('backend/server.js', 'utf8');

const oldSync = `let sit = data.objetoResposta.situacaoManifesto.simDescricao;
                    if(sit === 'Salvo') sit = 'Ativo';`;
const newSync = `let sit = data.objetoResposta.situacaoManifesto.simDescricao;
                    if (sit) {
                        sit = sit.charAt(0).toUpperCase() + sit.slice(1).toLowerCase();
                        if (sit === 'Salvo') sit = 'Ativo';
                    }`;

if(serverJs.includes(oldSync)) {
    serverJs = serverJs.replace(oldSync, newSync);
    serverJs = serverJs.replace(oldSync, newSync); // twice for cron and route
    console.log('SERVER SYNC PATCHED');
}

fs.writeFileSync('backend/server.js', serverJs);

console.log('ALL PATCHES OK');
