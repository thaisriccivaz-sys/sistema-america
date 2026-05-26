const fs = require('fs');

function fixLabels(path) {
    let content = fs.readFileSync(path, 'utf8');
    
    // Replace Solicitação (Comercial): -> Solicitação:
    content = content.replace(/Solicitação \(Comercial\):/g, 'Solicitação:');
    
    // Replace Envio do Credenciamento (Logística): -> Envio do Credenciamento:
    content = content.replace(/Envio do Credenciamento \(Logística\):/g, 'Envio do Credenciamento:');
    
    fs.writeFileSync(path, content, 'utf8');
    console.log("Fixed " + path);
}

fixLabels('frontend/comercial_credenciamento.js');
fixLabels('frontend/credenciamento.js');