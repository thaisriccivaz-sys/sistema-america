const fs = require('fs');
let code = fs.readFileSync('frontend/fechamento.js', 'utf8');

function replaceOnce(str, find, replace, label) {
    const idx = str.indexOf(find);
    if (idx === -1) { console.log('  ❌ NÃO encontrou:', label || find.substring(0, 60)); return str; }
    console.log('  ✅', label || find.substring(0, 60));
    return str.substring(0, idx) + replace + str.substring(idx + find.length);
}

// 1. _stateArquivos — procurar onde _dados é declarado
const dadosDecl = 'let _dados = [];';
const idx = code.indexOf(dadosDecl);
if (idx === -1) { console.log('❌ _dados não encontrado'); process.exit(1); }
// Inserir _stateArquivos logo após a linha _dados
const nextNewline = code.indexOf('\n', idx + dadosDecl.length);
code = code.substring(0, nextNewline + 1)
    + '    var _stateArquivos = { farmacia: false, mercado_texto: null, consignado: false };\n'
    + code.substring(nextNewline + 1);
console.log('  ✅ _stateArquivos adicionado');

// 2. Botão olho após label de Farmácia (linha 183: </label> após Farmácia (PDF))
code = replaceOnce(code,
    '    <!-- Upload Consignado -->',
    '    <!-- Olho Farmácia -->\n    <button id="fech-btn-eye-farmacia" onclick="window._fechamento.verFarmacia()" style="background:#0e7490;color:#fff;border:none;padding:.4rem .5rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;display:none;" title="Ver dados farmácia carregados"><i class="ph ph-eye"></i></button>\n\n    <!-- Upload Consignado -->',
    'Eye Farmácia'
);

// 3. Botão olho após label de Consignado
code = replaceOnce(code,
    '    <!-- Colar Mercado -->',
    '    <!-- Olho Consignado -->\n    <button id="fech-btn-eye-consignado" onclick="window._fechamento.verConsignado()" style="background:#6d28d9;color:#fff;border:none;padding:.4rem .5rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;display:none;" title="Ver consignado carregado"><i class="ph ph-eye"></i></button>\n\n    <!-- Colar Mercado -->',
    'Eye Consignado'
);

// 4. Botão olho após Mercado
code = replaceOnce(code,
    '    <!-- Multas prontuário -->',
    '    <!-- Olho Mercado -->\n    <button id="fech-btn-eye-mercado" onclick="window._fechamento.verMercado()" style="background:#b45309;color:#fff;border:none;padding:.4rem .5rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;display:none;" title="Ver texto mercado carregado"><i class="ph ph-eye"></i></button>\n\n    <!-- Multas prontuário -->',
    'Eye Mercado'
);

// 5. parseMercado — guardar texto e mostrar botão
code = replaceOnce(code,
    'async function parseMercado() {',
    `async function parseMercado() {
        var _elTexto = document.getElementById('fech-mercado-texto');
        if (_elTexto && _elTexto.value) {
            _stateArquivos.mercado_texto = _elTexto.value;
            var _btnEM = document.getElementById('fech-btn-eye-mercado');
            if (_btnEM) _btnEM.style.display = 'inline-flex';
        }`,
    'parseMercado state'
);

// 6. uploadConsignado — mostrar botão após sucesso
// Localizar a string exata
const consigSuccess = code.indexOf("title: 'Consignado importado!'");
if (consigSuccess === -1) {
    console.log('  ❌ Consignado importado não encontrado');
} else {
    // Inserir antes
    const insertStr = "_stateArquivos.consignado = true;\n        var _btnEC = document.getElementById('fech-btn-eye-consignado');\n        if (_btnEC) _btnEC.style.display = 'inline-flex';\n        ";
    code = code.substring(0, consigSuccess - 13) + insertStr + code.substring(consigSuccess - 13);
    console.log('  ✅ consignado state');
}

// 7. uploadFarmacia — mostrar botão após sucesso
const farmSuccess = code.indexOf("title: 'Farm");
if (farmSuccess === -1) {
    console.log('  ❌ Farmácia importada não encontrado');
} else {
    const insertStr2 = "_stateArquivos.farmacia = true;\n        var _btnEF = document.getElementById('fech-btn-eye-farmacia');\n        if (_btnEF) _btnEF.style.display = 'inline-flex';\n        ";
    // Procurar a posição correta — antes do Swal de sucesso da farmácia
    const farmSwalPos = code.indexOf("Swal.fire({ icon: 'success', title: 'Farm");
    if (farmSwalPos === -1) {
        console.log('  ❌ Swal farmácia não encontrado');
    } else {
        code = code.substring(0, farmSwalPos) + insertStr2 + code.substring(farmSwalPos);
        console.log('  ✅ farmacia state');
    }
}

// 8. Funções ver* + exportar
const anchorReturn = '    return {\n        init, buscar,';
const funcVer = `    function verFarmacia() {
        if (!_stateArquivos.farmacia) {
            Swal.fire({ icon: 'info', title: 'Farm\\u00e1cia', text: 'Nenhum arquivo carregado nesta sess\\u00e3o.' });
            return;
        }
        Swal.fire({ icon: 'success', title: 'Farm\\u00e1cia', text: 'Arquivo de farm\\u00e1cia foi importado com sucesso nesta sess\\u00e3o.' });
    }
    function verConsignado() {
        if (!_stateArquivos.consignado) {
            Swal.fire({ icon: 'info', title: 'Consignado', text: 'Nenhum arquivo carregado nesta sess\\u00e3o.' });
            return;
        }
        Swal.fire({ icon: 'success', title: 'Consignado', text: 'Planilha de consignado foi importada com sucesso nesta sess\\u00e3o.' });
    }
    function verMercado() {
        var txt = _stateArquivos.mercado_texto;
        if (!txt) {
            Swal.fire({ icon: 'info', title: 'Mercado', text: 'Nenhum texto carregado nesta sess\\u00e3o.' });
            return;
        }
        Swal.fire({ title: 'Dados Mercado', html: '<pre style="text-align:left;font-size:.75rem;max-height:300px;overflow:auto;background:#fffbeb;padding:.5rem;border-radius:.4rem;">' + txt.replace(/</g,'&lt;').replace(/>/g,'&gt;').substring(0, 2000) + '</pre>', width: 500 });
    }

    return {
        init, buscar,`;

code = replaceOnce(code, anchorReturn, funcVer, 'inserir funções ver*');
code = replaceOnce(code,
    '        uploadFarmacia, uploadConsignado, verFarmacia, verConsignado, verMercado,',
    '        uploadFarmacia, uploadConsignado, verFarmacia, verConsignado, verMercado,',
    'export ver* (já existe)'
);

// Se não tiver no export ainda, adicionar
if (!code.includes('verFarmacia, verConsignado, verMercado')) {
    code = replaceOnce(code,
        '        uploadFarmacia, uploadConsignado,',
        '        uploadFarmacia, uploadConsignado, verFarmacia, verConsignado, verMercado,',
        'adicionar ver* ao export'
    );
}

fs.writeFileSync('frontend/fechamento.js', code, 'utf8');
console.log('✅ Salvo, tamanho:', code.length);
