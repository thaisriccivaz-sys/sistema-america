const fs = require('fs');
let c = fs.readFileSync('frontend/recibos.js', 'utf8');

let changes = 0;

function rep(oldStr, newStr, label) {
    if (c.includes(oldStr)) {
        const count = c.split(oldStr).length - 1;
        if (count > 1) { console.log(label + ' MULTI-MATCH (' + count + ')'); return false; }
        c = c.replace(oldStr, newStr);
        changes++;
        console.log(label + ' OK');
        return true;
    }
    // try LF
    const altOld = oldStr.replace(/\r\n/g, '\n');
    const altNew = newStr.replace(/\r\n/g, '\n');
    if (c.includes(altOld)) {
        const count = c.split(altOld).length - 1;
        if (count > 1) { console.log(label + ' MULTI-MATCH LF (' + count + ')'); return false; }
        c = c.replace(altOld, altNew);
        changes++;
        console.log(label + ' OK (LF)');
        return true;
    }
    console.log(label + ' MISS');
    return false;
}

// ─── 1. _calcTotaisRecibo: usar c.folha_vr_valor por colaborador ───
rep(
    "function _calcTotaisRecibo(c, s) {\r\n    const valorVR = window._recibosValorVR || 35.00;",
    "function _calcTotaisRecibo(c, s) {\r\n    const valorVR = (c && c.folha_vr && parseFloat(c.folha_vr_valor) > 0) ? parseFloat(c.folha_vr_valor) : (window._recibosValorVR || 35.00);",
    '1. _calcTotaisRecibo VR por colab'
);

// ─── 2. _autoSalvarRecibo: buscar objeto colab para usar folha_vr_valor ───
// Currently: const valorVR = window._recibosValorVR || 35.00;
//            const s = _recibosSelecoes[id];
// Change to: find the colab object and use its VR value
rep(
    "        const valorVR = window._recibosValorVR || 35.00;\r\n        const s = _recibosSelecoes[id];\r\n        if (!s) return;\r\n        \r\n        const itensSalvar = [{\r\n            colaborador_id: id,",
    "        const _colabObj = _recibosAllColabs ? _recibosAllColabs.find(x => x.id === id) : null;\r\n        const valorVR = (_colabObj && _colabObj.folha_vr && parseFloat(_colabObj.folha_vr_valor) > 0) ? parseFloat(_colabObj.folha_vr_valor) : (window._recibosValorVR || 35.00);\r\n        const s = _recibosSelecoes[id];\r\n        if (!s) return;\r\n        \r\n        const itensSalvar = [{\r\n            colaborador_id: id,",
    '2. _autoSalvarRecibo VR por colab'
);

// ─── 3. Salvar em massa após busca de ponto (linha ~114736) ───
// Context: Salvar apuração automaticamente no backend após a busca
// const valorVR = window._recibosValorVR || 35.00;
// const itensSalvar = sels.map(c => ({
rep(
    "        const valorVR = window._recibosValorVR || 35.00;\r\n        const itensSalvar = sels.map(c => ({",
    "        const itensSalvar = sels.map(c => ({\r\n            // valorVR is now per-collaborator below",
    '3. Salvar massa - remove global valorVR'
);

// Now fix the valor_vr line in the mass save map
// It should be: valor_vr: (c.folha_vr && c.folha_vr_valor > 0) ? c.folha_vr_valor : (window._recibosValorVR || 35.00),
// Find the valor_vr line in the mass save
const idx = c.indexOf('// valorVR is now per-collaborator below');
if (idx > 0) {
    const block = c.substring(idx, idx + 800);
    const vrLine = block.indexOf('valor_vr: valorVR,');
    if (vrLine > 0) {
        const absIdx = idx + vrLine;
        const oldVrLine = 'valor_vr: valorVR,';
        const newVrLine = 'valor_vr: (c.folha_vr && parseFloat(c.folha_vr_valor) > 0) ? parseFloat(c.folha_vr_valor) : (window._recibosValorVR || 35.00),';
        c = c.substring(0, absIdx) + newVrLine + c.substring(absIdx + oldVrLine.length);
        changes++;
        console.log('3b. valor_vr in mass save per-colab OK');
    } else {
        console.log('3b. valor_vr line not found after anchor');
    }
} else {
    console.log('3b. anchor for mass save not found - looking for original pattern');
    // Try directly
    rep(
        "            valor_vr: valorVR,\r\n            valor_vt_editado:",
        "            valor_vr: (c.folha_vr && parseFloat(c.folha_vr_valor) > 0) ? parseFloat(c.folha_vr_valor) : (window._recibosValorVR || 35.00),\r\n            valor_vt_editado:",
        '3b. valor_vr in mass save (fallback)'
    );
}

// ─── 4. Geração PDF em massa (linha ~120473): usar VR por colab no loop ───
// This is already patched via _vrColab in loops - but valorVR local declaration is still there
// Change the local declaration to use per-colab in the selsValidos loop context
// The loop already uses _vrColab = (c.folha_vr && c.folha_vr_valor > 0) ? c.folha_vr_valor : valorVR
// So the global valorVR fallback is still needed there - no change needed for PDF loops

// ─── 5. Verificação final do que mudou ───
fs.writeFileSync('frontend/recibos.js', c, 'utf8');
console.log('\nTotal changes applied:', changes);

// Verify
const cf = fs.readFileSync('frontend/recibos.js', 'utf8');
console.log('\nVerification:');
console.log('_calcTotaisRecibo uses folha_vr_valor:', cf.indexOf('c.folha_vr_valor') > 0);
console.log('_autoSalvarRecibo uses _colabObj:', cf.indexOf('_colabObj') > 0);
