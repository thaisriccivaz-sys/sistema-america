/**
 * patch_fechamento_final.js
 * Aplica todas as mudanças no fechamento.js de uma vez:
 * 1. Header da tabela com rubricas + remover Total Bruto / Líquido
 * 2. Tipo das colunas monetárias: type=text com R$ e 2 casas decimais
 * 3. Ocultar zeros
 * 4. Botões de olho (eye) na toolbar
 * 5. Funções verFarmacia / verConsignado / verMercado
 */
const fs = require('fs');
let code = fs.readFileSync('frontend/fechamento.js', 'utf8');
const sizeOriginal = code.length;

// ===========================================================================
// HELPERS
// ===========================================================================
function replaceOnce(str, find, replace) {
    const idx = str.indexOf(find);
    if (idx === -1) { console.log('  ❌ NÃO encontrou:', find.substring(0, 80)); return str; }
    console.log('  ✅ Substituiu:', find.substring(0, 60));
    return str.substring(0, idx) + replace + str.substring(idx + find.length);
}

// ===========================================================================
// 1. THEAD — rubricas + remover Total Bruto/Líquido
// ===========================================================================
// Encontrar o thead pelo marcador conhecido
const theadStart = code.indexOf('<thead style="position:sticky; top:0; z-index:10;">');
const theadEnd   = code.indexOf('</thead>') + '</thead>'.length;
if (theadStart === -1) { console.log('❌ thead não encontrado'); process.exit(1); }

const newThead = `<thead style="position:sticky; top:0; z-index:10;">
          <tr style="background:#1e40af;color:#fff;">
            <th style="padding:.4rem .6rem;text-align:left;white-space:nowrap;position:sticky;left:0;top:0;background:#1e40af;z-index:20;box-shadow:inset -1px -1px 0 #cbd5e1, inset 0 -1px 0 #cbd5e1;">Colaborador</th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:left;">Cargo</th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;">Sal&aacute;rio</th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.2;">H.Normais<br><span style="font-size:.65rem;font-weight:400;opacity:.75;">9435</span></th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;">H.Trab.</th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.2;">Ext.60%<br><span style="font-size:.65rem;font-weight:400;opacity:.75;">264</span></th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.2;">Ext.100%<br><span style="font-size:.65rem;font-weight:400;opacity:.75;">200</span></th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;">DSR</th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.2;">Faltas<br><span style="font-size:.65rem;font-weight:400;opacity:.75;">8792</span></th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.2;">Atrasos<br><span style="font-size:.65rem;font-weight:400;opacity:.75;">8060</span></th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.2;">VT<br><span style="font-size:.65rem;font-weight:400;opacity:.75;">48</span></th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#0c4a6e;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.2;">Farm&aacute;cia<br><span style="font-size:.65rem;font-weight:400;opacity:.75;">238</span></th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#78350f;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.2;">Mercado<br><span style="font-size:.65rem;font-weight:400;opacity:.75;">279</span></th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#7f1d1d;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.2;">Multas<br><span style="font-size:.65rem;font-weight:400;opacity:.75;">302</span></th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.2;">Academia<br><span style="font-size:.65rem;font-weight:400;opacity:.75;">278</span></th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#4c1d95;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.2;">Consig.<br><span style="font-size:.65rem;font-weight:400;opacity:.75;">9750</span></th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.2;">Comiss&atilde;o<br><span style="font-size:.65rem;font-weight:400;opacity:.75;">37</span></th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;">B&ocirc;nus</th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#14532d;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.2;">PLR<br><span style="font-size:.65rem;font-weight:400;opacity:.75;">873</span></th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;">Pr&ecirc;mio</th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.2;">Outros<br><span style="font-size:.65rem;font-weight:400;opacity:.75;">290</span></th>
          </tr>
        </thead>`;

code = code.substring(0, theadStart) + newThead + code.substring(theadEnd);
console.log('✅ Thead substituído');

// ===========================================================================
// 2. REMOVER Total Bruto e Líquido do tbody via regex
// ===========================================================================
// Remover td de bruto
code = code.replace(/<td style="padding:\.35rem \.4rem;text-align:right;font-weight:600;color:#0e4680;background:#eff6ff;" id="fech-bruto-\$\{idx\}">\$\{fmt\(calc\.totalBruto\)\}<\/td>/g, '');
// Remover td de liq (pode ter aspas diferentes)
code = code.replace(/<td style="[^"]*" id="fech-liq-\$\{idx\}">[^<]*<\/td>/g, '');
// Remover atualizadores de bruto/liq na função atualizar
code = code.replace(/const brutoEl = document\.getElementById\(`fech-bruto-\$\{idx\}`\);\s*const liqEl = document\.getElementById\(`fech-liq-\$\{idx\}`\);\s*if \(brutoEl\) brutoEl\.textContent = fmt\(calc\.totalBruto\);\s*if \(liqEl\) liqEl\.textContent = fmt\(calc\.liquido\);/g, '');
console.log('✅ Total Bruto / Líquido removidos');

// ===========================================================================
// 3. SUBSTITUIR inpHora e inpNum — usando string concatenation (sem template literals aninhados)
// ===========================================================================
const inpHoraStart = code.indexOf('function inpHora(idx, campo, val)');
const inpHoraEnd   = code.indexOf('function inpNum(', inpHoraStart);
const inpNumStart  = inpHoraEnd;
const inpNumEnd    = code.indexOf('function inpDsr(', inpNumStart);

if (inpHoraStart < 0 || inpHoraEnd < 0 || inpNumEnd < 0) {
    console.log('❌ não encontrou inpHora/inpNum/inpDsr');
    process.exit(1);
}

// Nota: usando aspas simples para atributos HTML para evitar conflito
const newInpHora = `function inpHora(idx, campo, val) {
        var v = (val && val !== '00:00' && val !== '0:00' && val !== '0') ? val : '';
        var oi = "window._fechamento.atualizar(" + idx + ",'" + campo + "',this.value)";
        var ob = "if(this.value==='00:00'||this.value==='0:00'||this.value==='0')this.value=''";
        return '<input type=\\'text\\' placeholder=\\'\\'  value=\\'' + (v||'') + '\\''
            + ' style=\\'width:55px;padding:.2rem;border:1px solid #e5e7eb;border-radius:.3rem;text-align:center;font-size:.8rem;\\''
            + ' oninput=\\'' + oi + '\\''
            + ' onblur=\\'' + ob + '\\'>';
    }
    `;

// Reescrever inpNum sem template literal — string concatenation pura
const newInpNum = `function inpNum(idx, campo, val, placeholder, step) {
        var v = parseFloat(val);
        if (isNaN(v) || v === 0) v = '';
        var displayVal = '';
        var isMoney = step === '0.01';
        if (v !== '') {
            displayVal = isMoney ? parseFloat(v).toFixed(2) : String(v);
        }
        var stComum = 'padding:.2rem;border:1px solid #e5e7eb;border-radius:.3rem;text-align:right;font-size:.8rem;';
        var w = isMoney ? '58px' : '68px';
        var blurFn = isMoney
            ? "if(this.value && parseFloat(this.value)!==0){this.value=parseFloat(this.value).toFixed(2);}else{this.value='';}"
            : "if(this.value && parseFloat(this.value)===0){this.value='';}";
        var oiFn = "window._fechamento.atualizar(" + idx + ",'" + campo + "',parseFloat(this.value)||0)";
        var inp = '<input type=\\'text\\' inputmode=\\'decimal\\''
            + ' value=\\'' + displayVal + '\\''
            + ' placeholder=\\'\\'  '
            + ' style=\\'width:' + w + ';' + stComum + '\\''
            + ' oninput=\\'' + oiFn + '\\''
            + ' onblur=\\'' + blurFn + '\\'>';
        if (isMoney) {
            return '<div style=\\'display:flex;align-items:center;gap:1px;\\'>'
                + '<span style=\\'color:#6b7280;font-size:.75rem;margin-right:1px;\\'>R$</span>'
                + inp + '</div>';
        }
        return inp;
    }
    `;

code = code.substring(0, inpHoraStart) + newInpHora + newInpNum + code.substring(inpNumEnd);
console.log('✅ inpHora e inpNum reescritos');

// ===========================================================================
// 4. CORRIGIR importarComissaoParaFechamento: usa input[type=text] agora
// ===========================================================================
code = code.replace(
    "const inputs = tr.querySelectorAll('input[type=number]');",
    "const inputs = tr.querySelectorAll('input[type=text],input[type=number]');"
);
console.log('✅ importarComissao corrigido para type=text');

// ===========================================================================
// 5. _stateArquivos + botões de olho na toolbar
// ===========================================================================
code = replaceOnce(code,
    '    let _dados = [];\n    let _mes = null, _ano = null;',
    '    let _dados = [];\n    let _mes = null, _ano = null;\n    var _stateArquivos = { farmacia_texto: null, mercado_texto: null, consignado_nome: null };'
);

// Botão olho antes de Farmácia
code = replaceOnce(code,
    'onclick="window._fechamento.uploadFarmacia()" style="background:#0891b2;',
    'id="fech-btn-eye-farmacia" onclick="window._fechamento.verFarmacia()" style="background:#0e7490;color:#fff;border:none;padding:.4rem .5rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;display:none;" title="Ver dados carregados"><i class="ph ph-eye"></i></button>\n    <button onclick="window._fechamento.uploadFarmacia()" style="background:#0891b2;'
);

// Botão olho antes de Consignado
code = replaceOnce(code,
    'onclick="window._fechamento.uploadConsignado()" style="background:#7c3aed;',
    'id="fech-btn-eye-consignado" onclick="window._fechamento.verConsignado()" style="background:#6d28d9;color:#fff;border:none;padding:.4rem .5rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;display:none;" title="Ver dados carregados"><i class="ph ph-eye"></i></button>\n    <button onclick="window._fechamento.uploadConsignado()" style="background:#7c3aed;'
);

// Botão olho antes de Mercado
code = replaceOnce(code,
    'onclick="window._fechamento.abrirModalMercado()" style="background:#ea580c;',
    'id="fech-btn-eye-mercado" onclick="window._fechamento.verMercado()" style="background:#c2410c;color:#fff;border:none;padding:.4rem .5rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;display:none;" title="Ver texto carregado"><i class="ph ph-eye"></i></button>\n    <button onclick="window._fechamento.abrirModalMercado()" style="background:#ea580c;'
);

// ===========================================================================
// 6. Guardar estado nos uploads existentes
// ===========================================================================
// parseMercado — guardar texto
code = replaceOnce(code,
    'async function parseMercado() {',
    `async function parseMercado() {
        var _mtexto = (document.getElementById('fech-mercado-texto') || {}).value || '';
        _stateArquivos.mercado_texto = _mtexto;
        var _btnEM = document.getElementById('fech-btn-eye-mercado');
        if (_btnEM && _mtexto) _btnEM.style.display = 'inline-flex';`
);

// uploadConsignado — guardar nome do arquivo
code = replaceOnce(code,
    "Swal.fire({ icon: 'success', title: 'Consignado importado!',",
    `_stateArquivos.consignado_nome = 'arquivo importado';
        var _btnEC = document.getElementById('fech-btn-eye-consignado');
        if (_btnEC) _btnEC.style.display = 'inline-flex';
        Swal.fire({ icon: 'success', title: 'Consignado importado!',`
);

// uploadFarmacia — guardar indicador
code = replaceOnce(code,
    "Swal.fire({ icon: 'success', title: 'Farm\u00e1cia importada!',",
    `_stateArquivos.farmacia_texto = 'importado';
        var _btnEF = document.getElementById('fech-btn-eye-farmacia');
        if (_btnEF) _btnEF.style.display = 'inline-flex';
        Swal.fire({ icon: 'success', title: 'Farm\u00e1cia importada!',`
);

// ===========================================================================
// 7. Funções ver* + exportar
// ===========================================================================
const anchorReturn = '    return {\n        init, buscar,';
const funcVer = `    function verFarmacia() {
        if (!_stateArquivos.farmacia_texto) {
            Swal.fire({ icon: 'info', title: 'Farm\u00e1cia', text: 'Nenhum arquivo carregado nesta sess\u00e3o.' });
            return;
        }
        Swal.fire({ title: 'Farm\u00e1cia importada', text: 'Arquivo foi importado com sucesso nesta sess\u00e3o.' });
    }
    function verConsignado() {
        var nome = _stateArquivos.consignado_nome;
        Swal.fire({ icon: 'info', title: 'Consignado', text: nome ? ('Arquivo carregado: ' + nome) : 'Nenhum arquivo carregado nesta sess\u00e3o.' });
    }
    function verMercado() {
        var txt = _stateArquivos.mercado_texto;
        if (!txt) {
            Swal.fire({ icon: 'info', title: 'Mercado', text: 'Nenhum texto carregado nesta sess\u00e3o.' });
            return;
        }
        Swal.fire({ title: 'Dados Mercado', html: '<pre style="text-align:left;font-size:.75rem;max-height:300px;overflow:auto;background:#fffbeb;padding:.5rem;border-radius:.4rem;">' + txt.replace(/</g,'&lt;') + '</pre>', width: 500 });
    }

    return {
        init, buscar,`;

code = replaceOnce(code, anchorReturn, funcVer);
code = replaceOnce(code,
    '        uploadFarmacia, uploadConsignado,',
    '        uploadFarmacia, uploadConsignado, verFarmacia, verConsignado, verMercado,'
);

// ===========================================================================
// SALVAR E VERIFICAR
// ===========================================================================
fs.writeFileSync('frontend/fechamento.js', code, 'utf8');
console.log('✅ Arquivo salvo, tamanho:', code.length, '(era:', sizeOriginal, ')');
