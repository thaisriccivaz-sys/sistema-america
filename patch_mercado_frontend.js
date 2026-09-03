/**
 * patch_mercado_frontend.js
 * 1. Fix eye trigger consignado
 * 2. Mercado: mudar de texto para upload de PDFs múltiplos
 * 3. verMercado: mostrar PDFs via iframe
 */
const fs = require('fs');
let code = fs.readFileSync('frontend/fechamento.js', 'utf8');
const orig = code.length;

function replaceOnce(str, find, replace, label) {
    const idx = str.indexOf(find);
    if (idx === -1) { console.log('  \u274c N\u00c3O encontrou:', label || find.substring(0, 70)); return str; }
    console.log('  \u2705', label || find.substring(0, 70));
    return str.substring(0, idx) + replace + str.substring(idx + find.length);
}

// ===========================================================================
// 1. FIX EYE TRIGGER CONSIGNADO
// ===========================================================================
const consigSuccess = "Swal.fire({ icon: 'success', title: 'Consignado processado!',";
code = replaceOnce(code,
    consigSuccess,
    "_stateArquivos.consignado = true;\r\n            var _btnEC = document.getElementById('fech-btn-eye-consignado');\r\n            if (_btnEC) _btnEC.style.display = 'inline-flex';\r\n            " + consigSuccess,
    'Eye trigger consignado'
);

// ===========================================================================
// 2. TROCAR BOTÃO MERCADO (Texto → PDFs) na toolbar
// ===========================================================================
// Substituir o bloco do modal mercado pelo novo label de upload múltiplo
const oldMercadoBtn = `    <!-- Colar Mercado -->
    <button onclick="window._fechamento.abrirModalMercado()" style="background:#d97706;color:#fff;border:none;padding:.4rem .85rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;">
      <i class="ph ph-shopping-cart"></i> Mercado (Texto)
    </button>`;

const newMercadoBtn = `    <!-- Upload Mercado PDFs -->
    <label id="fech-label-mercado" style="background:#d97706;color:#fff;padding:.4rem .85rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;display:flex;align-items:center;gap:.35rem;">
      <i class="ph ph-shopping-cart"></i> Mercado (PDFs)
      <input type="file" accept=".pdf" multiple style="display:none;" onchange="window._fechamento.uploadMercadoPdfs(this)">
    </label>`;

code = replaceOnce(code, oldMercadoBtn, newMercadoBtn, 'Botão Mercado → PDF upload múltiplo');

// ===========================================================================
// 3. ADICIONAR variável _dadosMercado ao estado
// ===========================================================================
code = replaceOnce(code,
    'var _dadosPonto = {}; // { colaborador_id: dadosRHID } - persiste entre filtros',
    'var _dadosPonto = {}; // { colaborador_id: dadosRHID } - persiste entre filtros\r\n    var _dadosMercado = []; // [{ id, nome, valor, r2_key }] - PDFs do mercado carregados',
    '_dadosMercado declaration'
);

// ===========================================================================
// 4. NOVA FUNÇÃO uploadMercadoPdfs
// ===========================================================================
// Encontrar onde inserir: antes de parseMercado
const anchorParseMercado = '\r\n    function parseMercado()';
const idxParseMercado = code.indexOf(anchorParseMercado);
if (idxParseMercado === -1) {
    console.log('  \u274c parseMercado n\u00e3o encontrado');
} else {
    const funcUploadMercado = '\r\n    // \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\r\n    // UPLOAD MERCADO (M\u00daltiplos PDFs)\r\n    // \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\r\n    async function uploadMercadoPdfs(input) {\r\n        if (!input.files || input.files.length === 0) return;\r\n        var files = Array.from(input.files);\r\n        var formData = new FormData();\r\n        files.forEach(function(f) { formData.append(\'pdfs\', f); });\r\n        formData.append(\'mes\', _mes);\r\n        formData.append(\'ano\', _ano);\r\n        try {\r\n            Swal.fire({ title: \'Processando \' + files.length + \' PDF(s) de Mercado...\', allowOutsideClick: false, didOpen: function() { Swal.showLoading(); } });\r\n            var resp = await fetch(\'/api/fechamento/upload-mercado-pdfs\', {\r\n                method: \'POST\',\r\n                headers: { \'Authorization\': \'Bearer \' + getToken() },\r\n                body: formData\r\n            });\r\n            var json = await resp.json();\r\n            if (!json.ok) throw new Error(json.error);\r\n            _dadosMercado = json.resultados || [];\r\n            // Normalizar nomes do PDF\r\n            var normRes = {};\r\n            _dadosMercado.forEach(function(r) {\r\n                var nNorm = (r.nome || \'\').toUpperCase().normalize(\'NFD\').replace(/[\\u0300-\\u036f]/g, \'\').trim();\r\n                normRes[nNorm] = r;\r\n            });\r\n            // Preencher coluna mercado por nome do colaborador\r\n            var atualizados = 0;\r\n            _dados.forEach(function(row, idx) {\r\n                var nColab = (row.nome_completo || \'\').toUpperCase().normalize(\'NFD\').replace(/[\\u0300-\\u036f]/g, \'\').trim();\r\n                var match = normRes[nColab];\r\n                if (!match) {\r\n                    // Tentar match parcial com palavras\r\n                    Object.keys(normRes).forEach(function(k) {\r\n                        if (!match) {\r\n                            var pw = k.split(\' \').filter(Boolean);\r\n                            var pc = nColab.split(\' \').filter(Boolean);\r\n                            var hits = pw.filter(function(p) { return pc.includes(p); });\r\n                            if (hits.length >= Math.min(2, pw.length)) match = normRes[k];\r\n                        }\r\n                    });\r\n                }\r\n                if (match) {\r\n                    var val = match.valor;\r\n                    _dados[idx].mercado = val;\r\n                    var cell = document.getElementById(\'fech-cell-mercado-\' + idx);\r\n                    if (cell) { var inp = cell.querySelector(\'input\'); if (inp) inp.value = parseFloat(val).toFixed(2); }\r\n                    atualizar(idx, \'mercado\', val);\r\n                    atualizados++;\r\n                }\r\n            });\r\n            // Mostrar botão de olho\r\n            _stateArquivos.mercado_pdfs = true;\r\n            var _btnEM = document.getElementById(\'fech-btn-eye-mercado\');\r\n            if (_btnEM) _btnEM.style.display = \'inline-flex\';\r\n            // Resultado\r\n            var totalPdfs = _dadosMercado.length;\r\n            Swal.fire({ icon: \'success\', title: \'Mercado processado!\', text: totalPdfs + \' PDF(s) importados. \' + atualizados + \' colaboradores com valor preenchido.\', timer: 4000, showConfirmButton: false });\r\n        } catch(e) {\r\n            Swal.fire({ icon: \'error\', title: \'Erro no Mercado\', text: e.message });\r\n        }\r\n        input.value = \'\';\r\n    }\r\n';
    code = code.substring(0, idxParseMercado) + funcUploadMercado + code.substring(idxParseMercado);
    console.log('  \u2705 uploadMercadoPdfs inserida');
}

// ===========================================================================
// 5. ATUALIZAR verMercado para mostrar iframes dos PDFs
// ===========================================================================
const oldVerMercado = `    function verMercado() {
        var txt = _stateArquivos.mercado_texto;
        if (!txt) {
            Swal.fire({ icon: 'info', title: 'Mercado', text: 'Nenhum texto carregado nesta sess\u00e3o.' });
            return;
        }
        var safe = txt.replace(/</g, '&lt;').replace(/>/g, '&gt;').substring(0, 2000);
        Swal.fire({ title: 'Dados Mercado', html: '<pre style="text-align:left;font-size:.75rem;max-height:300px;overflow:auto;background:#fffbeb;padding:.5rem;border-radius:.4rem;">' + safe + '</pre>', width: 500 });
    }`;

const newVerMercado = `    function verMercado() {
        if (!_dadosMercado || _dadosMercado.length === 0) {
            Swal.fire({ icon: 'info', title: 'Mercado', text: 'Nenhum PDF carregado nesta sess\u00e3o.' });
            return;
        }
        // Montar iframes empilhados para cada PDF
        var iframesHtml = _dadosMercado.map(function(r) {
            var url = '/api/fechamento/mercado-pdf/' + r.id + '?token=' + encodeURIComponent(getToken());
            var nomeLabel = r.nome + (r.valor ? ' — R$ ' + parseFloat(r.valor).toFixed(2).replace('.', ',') : '');
            return '<div style="margin-bottom:1rem;">'
                + '<div style="font-size:.75rem;font-weight:600;color:#374151;padding:.25rem .5rem;background:#f3f4f6;border-radius:.25rem .25rem 0 0;border:1px solid #d1d5db;">' + nomeLabel + '</div>'
                + '<iframe src="' + url + '" style="width:100%;height:500px;border:1px solid #d1d5db;border-top:none;border-radius:0 0 .25rem .25rem;" title="' + r.nome + '"></iframe>'
                + '</div>';
        }).join('');
        Swal.fire({
            title: 'PDFs do Mercado (' + _dadosMercado.length + ')',
            html: '<div style="max-height:70vh;overflow-y:auto;padding:.5rem;">' + iframesHtml + '</div>',
            width: '90vw',
            showCloseButton: true,
            showConfirmButton: false
        });
    }`;

code = replaceOnce(code, oldVerMercado, newVerMercado, 'verMercado → iframes PDFs');

// ===========================================================================
// 6. EXPORTAR uploadMercadoPdfs
// ===========================================================================
code = replaceOnce(code,
    'uploadFarmacia, uploadConsignado, verFarmacia, verConsignado, verMercado, buscarPontoTodos,',
    'uploadFarmacia, uploadConsignado, uploadMercadoPdfs, verFarmacia, verConsignado, verMercado, buscarPontoTodos,',
    'Exportar uploadMercadoPdfs'
);

// ===========================================================================
// SALVAR
// ===========================================================================
fs.writeFileSync('frontend/fechamento.js', code, 'utf8');
console.log('\u2705 Salvo, tamanho:', code.length, '(era:', orig, ')');
