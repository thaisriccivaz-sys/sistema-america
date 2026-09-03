const fs = require('fs');
let code = fs.readFileSync('frontend/fechamento.js', 'utf8');

// O arquivo usa CRLF
const anchor = '    return {\r\n        init, buscar,';
const idx = code.indexOf(anchor);
if (idx === -1) { console.log('NOT FOUND'); process.exit(1); }

const funcoes = '    function verFarmacia() {\r\n'
    + '        if (!_stateArquivos.farmacia) {\r\n'
    + "            Swal.fire({ icon: 'info', title: 'Farm\u00e1cia', text: 'Nenhum arquivo carregado nesta sess\u00e3o.' });\r\n"
    + '            return;\r\n'
    + '        }\r\n'
    + "        Swal.fire({ icon: 'success', title: 'Farm\u00e1cia', text: 'Arquivo importado com sucesso nesta sess\u00e3o.' });\r\n"
    + '    }\r\n'
    + '    function verConsignado() {\r\n'
    + '        if (!_stateArquivos.consignado) {\r\n'
    + "            Swal.fire({ icon: 'info', title: 'Consignado', text: 'Nenhum arquivo carregado nesta sess\u00e3o.' });\r\n"
    + '            return;\r\n'
    + '        }\r\n'
    + "        Swal.fire({ icon: 'success', title: 'Consignado', text: 'Planilha importada com sucesso nesta sess\u00e3o.' });\r\n"
    + '    }\r\n'
    + '    function verMercado() {\r\n'
    + '        var txt = _stateArquivos.mercado_texto;\r\n'
    + '        if (!txt) {\r\n'
    + "            Swal.fire({ icon: 'info', title: 'Mercado', text: 'Nenhum texto carregado nesta sess\u00e3o.' });\r\n"
    + '            return;\r\n'
    + '        }\r\n'
    + "        var safe = txt.replace(/</g, '&lt;').replace(/>/g, '&gt;').substring(0, 2000);\r\n"
    + "        Swal.fire({ title: 'Dados Mercado', html: '<pre style=\"text-align:left;font-size:.75rem;max-height:300px;overflow:auto;background:#fffbeb;padding:.5rem;border-radius:.4rem;\">' + safe + '</pre>', width: 500 });\r\n"
    + '    }\r\n'
    + '\r\n'
    + anchor;

code = code.substring(0, idx) + funcoes + code.substring(idx + anchor.length);
fs.writeFileSync('frontend/fechamento.js', code, 'utf8');
console.log('OK', code.length);
