const fs = require('fs');
const file = 'frontend/index.html';
let c = fs.readFileSync(file, 'utf8');

// 1. Fix Cover Image previews
c = c.replace(/width:100%;max-height:160px;object-fit:cover;border-radius:10px;border:1\.5px solid #cbd5e1;display:block;/g, 'max-width:200px;max-height:160px;object-fit:contain;border-radius:10px;border:1.5px solid #cbd5e1;display:block;');

// 2. Add Date Input in Novo Treinamento
const novoDateHtml = `
                    <div class="mb-3">
                        <label style="font-weight:600;font-size:0.95rem;color:#374151;display:block;margin-bottom:8px;">Data do Treinamento / Palestra (Opcional)</label>
                        <input type="date" id="novo-treinamento-data" class="form-control" style="width:100%;box-sizing:border-box;border-radius:8px;font-size:1rem;padding:10px 14px;border:1.5px solid #cbd5e1;">
                        <p style="font-size:0.78rem;color:#94a3b8;margin:4px 0 0 0;">Se preenchido (ex: palestra), só será obrigatório para colaboradores admitidos antes ou no dia desta data.</p>
                    </div>
`;
if (!c.includes('id="novo-treinamento-data"')) {
    c = c.replace(/<div class="mb-3">\s*<label style="font-weight:600;font-size:0\.95rem;color:#374151;display:block;margin-bottom:8px;">Departamentos<\/label>/, match => novoDateHtml + match);
}

// 3. Add Date Input in Editar Treinamento
const editarDateHtml = `
                    <div class="mb-3">
                        <label style="font-weight:600;font-size:0.95rem;color:#374151;display:block;margin-bottom:8px;">Data do Treinamento / Palestra (Opcional)</label>
                        <input type="date" id="editar-treinamento-data" class="form-control" style="width:100%;box-sizing:border-box;border-radius:8px;font-size:1rem;padding:10px 14px;border:1.5px solid #cbd5e1;">
                        <p style="font-size:0.78rem;color:#94a3b8;margin:4px 0 0 0;">Se preenchido (ex: palestra), só será obrigatório para colaboradores admitidos antes ou no dia desta data.</p>
                    </div>
`;
if (!c.includes('id="editar-treinamento-data"')) {
    c = c.replace(/<div class="mb-3">\s*<label style="font-weight:600;font-size:0\.95rem;color:#374151;display:block;margin-bottom:8px;">Departamentos<\/label>/, match => editarDateHtml + match);
}

fs.writeFileSync(file, c, 'utf8');
console.log("Updated index.html");
