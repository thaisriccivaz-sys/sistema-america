const fs = require('fs');
let content = fs.readFileSync('frontend/app.js', 'utf8');
content = content.replace(
    '// Verificar opção de assinatura manual',
    `const previewBtnSalvar = document.querySelector('#modal-preview-doc button.btn-primary');
    if (previewBtnSalvar) {
        previewBtnSalvar.innerHTML = '<i class="ph ph-download-simple"></i> Salvar como PDF';
        previewBtnSalvar.onclick = window.salvarDocumentoPDF;
    }
    // Verificar opção de assinatura manual`
);
fs.writeFileSync('frontend/app.js', content);
