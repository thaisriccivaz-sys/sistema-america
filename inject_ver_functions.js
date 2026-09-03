const fs = require('fs');
let code = fs.readFileSync('frontend/fechamento.js', 'utf8');

const anchor = '\n\n    return {\n        init, buscar,';
const idx = code.indexOf(anchor);
if (idx === -1) { console.log('NOT FOUND'); process.exit(1); }

const funcoes = `

    function verFarmacia() {
        if (!_stateArquivos.farmacia) {
            Swal.fire({ icon: 'info', title: 'Farm\u00e1cia', text: 'Nenhum arquivo carregado nesta sess\u00e3o.' });
            return;
        }
        Swal.fire({ icon: 'success', title: 'Farm\u00e1cia', text: 'Arquivo importado com sucesso nesta sess\u00e3o.' });
    }
    function verConsignado() {
        if (!_stateArquivos.consignado) {
            Swal.fire({ icon: 'info', title: 'Consignado', text: 'Nenhum arquivo carregado nesta sess\u00e3o.' });
            return;
        }
        Swal.fire({ icon: 'success', title: 'Consignado', text: 'Planilha importada com sucesso nesta sess\u00e3o.' });
    }
    function verMercado() {
        var txt = _stateArquivos.mercado_texto;
        if (!txt) {
            Swal.fire({ icon: 'info', title: 'Mercado', text: 'Nenhum texto carregado nesta sess\u00e3o.' });
            return;
        }
        var safe = txt.replace(/</g, '&lt;').replace(/>/g, '&gt;').substring(0, 2000);
        Swal.fire({ title: 'Dados Mercado', html: '<pre style="text-align:left;font-size:.75rem;max-height:300px;overflow:auto;background:#fffbeb;padding:.5rem;border-radius:.4rem;">' + safe + '</pre>', width: 500 });
    }

    return {
        init, buscar,`;

code = code.substring(0, idx) + funcoes + code.substring(idx + anchor.length);
fs.writeFileSync('frontend/fechamento.js', code, 'utf8');
console.log('OK', code.length);
