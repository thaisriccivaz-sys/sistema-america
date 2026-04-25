const fs = require('fs');
let c = fs.readFileSync('frontend/index.html', 'utf8');

// Ocultar Orgao Emissor
c = c.replace('id="box-rg-orgao">', 'id="box-rg-orgao" style="display:none">');
// Ocultar Data Expedicao
c = c.replace('id="box-rg-data">', 'id="box-rg-data" style="display:none">');

// Ocultar wrapper Tipo de Documento (pegar a div que tem label Tipo de Documento)
c = c.replace(
    '<div class="input-group">\r\n                                                    <label>Tipo de Documento</label>',
    '<div class="input-group" style="display:none">\r\n                                                    <label>Tipo de Documento</label>'
);

// Ocultar wrapper Numero RG (pegar a div que tem lbl-colab-rg)
c = c.replace(
    '<div class="input-group">\r\n                                                    <label id="lbl-colab-rg">',
    '<div class="input-group" style="display:none">\r\n                                                    <label id="lbl-colab-rg">'
);

fs.writeFileSync('frontend/index.html', c, 'utf8');
console.log('RG fields hidden OK');
