const fs = require('fs');
let code = fs.readFileSync('frontend/fechamento.js', 'utf8');

// ===== 1. BOTÃO MERCADO → label de upload múltiplo =====
// Localizar pela posição das linhas (199-202)
const linhas = code.split(/\r?\n/);
let lineMercadoBtn = -1;
for (let i = 0; i < linhas.length; i++) {
    if (linhas[i].includes('abrirModalMercado()') && linhas[i].includes('Mercado')) {
        // Precisa achar o início do bloco (pode ter <!-- Colar Mercado --> antes)
        let start = i;
        while (start > 0 && !linhas[start].includes('<!-- Colar Mercado -->') && !linhas[start-1].includes('eye-consignado')) {
            start--;
        }
        lineMercadoBtn = start;
        break;
    }
}
console.log('Botão mercado em linha aprox:', lineMercadoBtn + 1);

// Substituição direta por localização de string
const oldBtn1 = '    <!-- Colar Mercado -->';
const oldBtn2 = '    <button onclick="window._fechamento.abrirModalMercado()"';
const oldBtn3 = '      <i class="ph ph-shopping-cart"></i> Mercado (Texto)';
const oldBtn4 = '    </button>';

const idx1 = code.indexOf(oldBtn1);
const idx2 = code.indexOf(oldBtn3);
if (idx1 === -1 || idx2 === -1) { console.log('❌ botão mercado não encontrado idx1=', idx1, 'idx2=', idx2); }
else {
    // Encontrar o fim do bloco: próximo </button>
    const afterBtn3 = idx2 + oldBtn3.length;
    const endBtn = code.indexOf('</button>', afterBtn3) + '</button>'.length;
    const newLabel = `    <!-- Upload Mercado PDFs -->\r\n    <label id="fech-label-mercado" style="background:#d97706;color:#fff;padding:.4rem .85rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;display:flex;align-items:center;gap:.35rem;">\r\n      <i class="ph ph-shopping-cart"></i> Mercado (PDFs)\r\n      <input type="file" accept=".pdf" multiple style="display:none;" onchange="window._fechamento.uploadMercadoPdfs(this)">\r\n    </label>`;
    code = code.substring(0, idx1) + newLabel + code.substring(endBtn);
    console.log('✅ Botão Mercado → PDF upload');
}

// ===== 2. _dadosMercado declaration =====
const anchorDados = '_dadosPonto = {}; // { colaborador_id: dadosRHID } - persiste entre filtros';
const idxDados = code.indexOf(anchorDados);
if (idxDados === -1) {
    console.log('❌ _dadosPonto não encontrado');
} else {
    const after = idxDados + anchorDados.length;
    code = code.substring(0, after)
        + '\r\n    var _dadosMercado = []; // [{ id, nome, valor, r2_key }] - PDFs do mercado carregados'
        + code.substring(after);
    console.log('✅ _dadosMercado declaration adicionado');
}

// ===== 3. verMercado → iframes =====
// Localizar a função verMercado atual
const vmStart = code.indexOf('\n    function verMercado()');
if (vmStart === -1) { console.log('❌ verMercado não encontrado'); }
else {
    // Encontrar o fim da função (próximo '\n    }' após o início)
    let depth = 0;
    let vmEnd = -1;
    let inFunc = false;
    for (let i = vmStart; i < code.length; i++) {
        if (code[i] === '{') { depth++; inFunc = true; }
        if (code[i] === '}') { depth--; if (inFunc && depth === 0) { vmEnd = i + 1; break; } }
    }
    if (vmEnd === -1) { console.log('❌ fim de verMercado não encontrado'); }
    else {
        const newVerMercado = `
    function verMercado() {
        if (!_dadosMercado || _dadosMercado.length === 0) {
            Swal.fire({ icon: 'info', title: 'Mercado', text: 'Nenhum PDF carregado nesta sess\u00e3o.' });
            return;
        }
        var iframesHtml = _dadosMercado.map(function(r) {
            var url = '/api/fechamento/mercado-pdf/' + r.id + '?token=' + encodeURIComponent(getToken());
            var nomeLabel = r.nome + (r.valor ? ' \u2014 R$ ' + parseFloat(r.valor).toFixed(2).replace('.', ',') : '');
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
        code = code.substring(0, vmStart) + newVerMercado + code.substring(vmEnd);
        console.log('✅ verMercado → iframes PDFs');
    }
}

fs.writeFileSync('frontend/fechamento.js', code, 'utf8');
console.log('✅ Salvo, tamanho:', code.length);
