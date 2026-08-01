const fs = require('fs');
const file = 'frontend/index.html';
let c = fs.readFileSync(file, 'utf8');

// Remove the duplicated novoDateHtml from the wrong place
const badNovoDateHtml = `
                    <div class="mb-3">
                        <label style="font-weight:600;font-size:0.95rem;color:#374151;display:block;margin-bottom:8px;">Data do Treinamento / Palestra (Opcional)</label>
                        <input type="date" id="novo-treinamento-data" class="form-control" style="width:100%;box-sizing:border-box;border-radius:8px;font-size:1rem;padding:10px 14px;border:1.5px solid #cbd5e1;">
                        <p style="font-size:0.78rem;color:#94a3b8;margin:4px 0 0 0;">Se preenchido (ex: palestra), só será obrigatório para colaboradores admitidos antes ou no dia desta data.</p>
                    </div>`;

c = c.replace(badNovoDateHtml, '');

// Place it correctly before novo-treinamento-departamento
const rightPlaceRegex = /<div class="mb-3">\s*<label style="font-weight:600;font-size:0\.95rem;color:#374151;display:block;margin-bottom:8px;">Departamentos<\/label>\s*<div id="novo-treinamento-departamento"/;

c = c.replace(rightPlaceRegex, match => badNovoDateHtml + '\n' + match);

fs.writeFileSync(file, c, 'utf8');
console.log("Fixed duplicated date field");
