/**
 * patch_eye_header.js
 * 1. Fix eye button: state setters missing (farmácia, consignado, mercado)
 * 2. Fix header: bold + dash for no-rubric columns
 * 3. Cache-bust: add ?v= to index.html JS references
 */
const fs = require('fs');
let code = fs.readFileSync('frontend/fechamento.js', 'utf8');
const orig = code.length;

function replaceOnce(str, find, replace, label) {
    const idx = str.indexOf(find);
    if (idx === -1) { console.log('  ❌ NÃO encontrou:', label || find.substring(0, 70)); return str; }
    console.log('  ✅', label || find.substring(0, 70));
    return str.substring(0, idx) + replace + str.substring(idx + find.length);
}

// ===========================================================================
// 1. EYE BUTTON TRIGGERS — inserir após o Swal de sucesso de cada upload
// ===========================================================================

// A) Farmácia — o Swal de sucesso da farmácia
const farmSwalSuccess = "Swal.fire({ icon: 'success', title: 'Farm\u00e1cia processada!',";
const farmSwalReplace = "_stateArquivos.farmacia = true;\r\n            var _btnEF = document.getElementById('fech-btn-eye-farmacia');\r\n            if (_btnEF) _btnEF.style.display = 'inline-flex';\r\n            " + farmSwalSuccess;
code = replaceOnce(code, farmSwalSuccess, farmSwalReplace, 'Eye trigger Farmácia');

// B) Consignado — procurar o Swal de sucesso
const consigSwalSuccess = "Swal.fire({ icon: 'success', title: 'Consignado importado!',";
const consigSwalReplace = "_stateArquivos.consignado = true;\r\n            var _btnEC = document.getElementById('fech-btn-eye-consignado');\r\n            if (_btnEC) _btnEC.style.display = 'inline-flex';\r\n            " + consigSwalSuccess;
code = replaceOnce(code, consigSwalSuccess, consigSwalReplace, 'Eye trigger Consignado');

// ===========================================================================
// 2. HEADER — Bold + dash for no-rubric columns
// ===========================================================================
// Localizar o thead e substituir inteiramente
const theadStart = code.indexOf('<thead style="position:sticky; top:0; z-index:10;">');
const theadEnd   = code.indexOf('</thead>') + '</thead>'.length;
if (theadStart === -1) { console.log('❌ thead não encontrado'); }
else {
    // Helper para gerar <th>
    // label: string do título, rubric: string do código ou '' para dash
    // bg: cor de fundo CSS, extra: estilo extra
    function th(label, rubric, bg, extra) {
        const bgStyle = bg ? 'background:' + bg + ';' : 'background:#1e40af;';
        const rubHtml = '<br><span style="font-size:.65rem;font-weight:400;opacity:.8;">' + (rubric || '—') + '</span>';
        return '<th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;' + bgStyle + 'z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.3;' + (extra||'') + '"><strong>' + label + '</strong>' + rubHtml + '</th>';
    }
    const newThead = `<thead style="position:sticky; top:0; z-index:10;">
          <tr style="background:#1e40af;color:#fff;">
            <th style="padding:.4rem .6rem;text-align:left;white-space:nowrap;position:sticky;left:0;top:0;background:#1e40af;z-index:20;box-shadow:inset -1px -1px 0 #cbd5e1, inset 0 -1px 0 #cbd5e1;"><strong>Colaborador</strong></th>
            ${th('Cargo', '', '', 'text-align:left;')}
            ${th('Sal&aacute;rio', '', '')}
            ${th('H.Normais', '9435', '')}
            ${th('H.Trab.', '', '')}
            ${th('Ext.60%', '264', '')}
            ${th('Ext.100%', '200', '')}
            ${th('DSR', '', '')}
            ${th('Faltas', '8792', '')}
            ${th('Atrasos', '8060', '')}
            ${th('VT', '48', '')}
            ${th('Farm&aacute;cia', '238', '#0c4a6e')}
            ${th('Mercado', '279', '#78350f')}
            ${th('Multas', '302', '#7f1d1d')}
            ${th('Academia', '278', '')}
            ${th('Consig.', '9750', '#4c1d95')}
            ${th('Comiss&atilde;o', '37', '')}
            ${th('B&ocirc;nus', '', '')}
            ${th('PLR', '873', '#14532d')}
            ${th('Pr&ecirc;mio', '', '')}
            ${th('Outros', '290', '')}
          </tr>
        </thead>`;
    code = code.substring(0, theadStart) + newThead + code.substring(theadEnd);
    console.log('  ✅ Thead com bold + dash para sem rubrica');
}

// ===========================================================================
// SALVAR
// ===========================================================================
fs.writeFileSync('frontend/fechamento.js', code, 'utf8');
console.log('✅ Salvo, tamanho:', code.length, '(era:', orig, ')');
