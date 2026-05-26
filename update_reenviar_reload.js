const fs = require('fs');

function processFile(path, reloadFunction) {
    let content = fs.readFileSync(path, 'utf8');

    // Add reload function call right after showToast
    content = content.replace(/showToast\('E-mail reenviado com sucesso!', 'success'\);/g, `showToast('E-mail reenviado com sucesso!', 'success');\n            if (window.${reloadFunction}) window.${reloadFunction}();`);

    fs.writeFileSync(path, content, 'utf8');
}

processFile('frontend/comercial_credenciamento.js', 'carregarHistoricoComCred');
processFile('frontend/credenciamento.js', 'carregarHistoricoCredenciamento');
console.log("Added reload functions to reenviarEmailCredenciamento");