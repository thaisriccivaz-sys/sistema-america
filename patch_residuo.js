const fs = require('fs');
let html = fs.readFileSync('frontend/index.html', 'utf8');

const regex = /<div style="grid-column:1\/-1;">\s*<label style="font-size:0\.82rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Resíduo \*<\/label>\s*<select id="mtr-residuo" required style="width:100%;padding:0\.6rem 0\.75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0\.9rem;background:#fff;box-sizing:border-box;">\s*<option value="">Carregando resíduos\.\.\.<\/option>\s*<\/select>\s*<\/div>/;

if(regex.test(html)) {
    const newHtml = `<div style="grid-column:1/-1; display: grid; grid-template-columns: 2fr 1fr; gap: 1rem;">
                                        <div>
                                            <label style="font-size:0.82rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Resíduo *</label>
                                            <select id="mtr-residuo" required style="width:100%;padding:0.6rem 0.75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;background:#fff;box-sizing:border-box;">
                                                <option value="">Carregando resíduos...</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style="font-size:0.82rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Classe *</label>
                                            <input type="text" value="CLASSE II A" readonly style="width:100%;padding:0.6rem 0.75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;background:#f8fafc;box-sizing:border-box;">
                                            <input type="hidden" id="mtr-classe-codigo" value="2">
                                        </div>
                                    </div>`;
    html = html.replace(regex, newHtml);
    fs.writeFileSync('frontend/index.html', html);
    console.log('PATCH INDEX RESIDUO OK');
} else {
    console.log('REGEX DID NOT MATCH INDEX');
}

// mtr.js 
let mtrJs = fs.readFileSync('frontend/mtr.js', 'utf8');
const oldPayload = `residuoCodigo: document.getElementById('mtr-residuo').value,`;
const newPayload = `residuoCodigo: document.getElementById('mtr-residuo').value,
      claCodigo: document.getElementById('mtr-classe-codigo') ? document.getElementById('mtr-classe-codigo').value : '2',`;
if(mtrJs.includes(oldPayload)) {
    mtrJs = mtrJs.replace(oldPayload, newPayload);
    fs.writeFileSync('frontend/mtr.js', mtrJs);
    console.log('PATCH MTR.JS PAYLOAD OK');
} else {
    console.log('MTR JS NOT FOUND');
}
