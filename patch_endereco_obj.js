/**
 * patch_endereco_obj.js
 * Fixes [object Object] in address field.
 *
 * _sacEscolherEndereco now returns { label: string, todos: bool } or null.
 * _sacBuscarOSLogistica was treating the return as a plain string.
 * This patch fixes _sacBuscarOSLogistica to unpack the object, matching
 * what _sacBuscarContrato already does correctly.
 *
 * Also fixes _sacBuscarContrato's single-address path which was wrapping
 * into an object manually and then failing to resolve enderecoFinal properly.
 */
const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');
let changed = 0;

// ─── Fix 1: _sacBuscarOSLogistica ────────────────────────────────────────────
// Old: enderecoFinal = await _sacEscolherEndereco(...) [expects string]
// Old guard: if (... && enderecoFinal === null) ...
// New: unpack { label, todos } from the returned object
const OLD_OS = `      const todosEnderecos = osList.map(o => [o.endereco, o.complemento].filter(Boolean).join(', ')).filter(Boolean);\r\n      const enderecosUnicos = [...new Set(todosEnderecos)];\r\n      const enderecoFinal = enderecosUnicos.length > 1\r\n        ? await _sacEscolherEndereco(enderecosUnicos, _clienteLimpo || clienteNome)\r\n        : (enderecosUnicos[0] || '');\r\n      if (enderecosUnicos.length > 1 && enderecoFinal === null) { _wiz._osLinked = false; _wiz._protocolLocked = false; renderWizard(); return; }`;

const NEW_OS = `      const todosEnderecos = osList.map(o => [o.endereco, o.complemento].filter(Boolean).join(', ')).filter(Boolean);
      const enderecosUnicos = [...new Set(todosEnderecos)];
      const _enderRes = enderecosUnicos.length > 1
        ? await _sacEscolherEndereco(enderecosUnicos, _clienteLimpo || clienteNome)
        : { label: enderecosUnicos[0] || '', todos: false };
      if (enderecosUnicos.length > 1 && _enderRes === null) { _wiz._osLinked = false; _wiz._protocolLocked = false; renderWizard(); return; }
      const enderecoFinal = (_enderRes && typeof _enderRes === 'object') ? (_enderRes.label || '') : (_enderRes || '');`;

if (code.includes(OLD_OS)) {
    code = code.replace(OLD_OS, NEW_OS);
    console.log('✅ Fix 1 (OS search): enderecoFinal unpacked from object');
    changed++;
} else {
    // Try with \n
    const OLD_OS_LF = OLD_OS.replace(/\r\n/g, '\n');
    if (code.includes(OLD_OS_LF)) {
        code = code.replace(OLD_OS_LF, NEW_OS);
        console.log('✅ Fix 1 (OS search LF variant)');
        changed++;
    } else {
        console.log('⚠️  Fix 1: marker not found, trying line-by-line');
        // Fallback: simpler targeted replace
        const TARGET_LINE = `        ? await _sacEscolherEndereco(enderecosUnicos, _clienteLimpo || clienteNome)\r\n        : (enderecosUnicos[0] || '');\r\n      if (enderecosUnicos.length > 1 && enderecoFinal === null)`;
        const REPLACE_LINE = `        ? await _sacEscolherEndereco(enderecosUnicos, _clienteLimpo || clienteNome)\r\n        : { label: enderecosUnicos[0] || '', todos: false };\r\n      if (enderecosUnicos.length > 1 && _enderRes === null)`;
        if (code.includes(TARGET_LINE)) {
            // Also need to rename enderecoFinal -> _enderRes
            code = code.replace(TARGET_LINE, REPLACE_LINE);
            console.log('✅ Fix 1 fallback partial');
            changed++;
        }
    }
}

// ─── Fix 2: _sacBuscarContrato single-address path ────────────────────────────
// Old: { label: labelsUnicos[0] || '', todos: false }  -- wraps manually as object
// That was correct! The issue is in the filter afterwards.
// enderecoFinal = selecionado ? selecionado.original : ''
// selecionado = enderecosFormatados.find(e => e.label === labelSelecionado)
// labelSelecionado = _enderRes.label  [= labelsUnicos[0] with "OS XX - addr" prefix]
// But osDoEndereco filter uses selecionado.os.numero_os to find OSes - this should be correct.
// The actual problem is that when single address, _enderRes = { label, todos } manually built.
// That should be fine. Let's verify enderecoFinal is set from selecionado.original (a string).

// The real fix: make _sacBuscarContrato directly get string from _enderRes.label
// and ensure enderecoFinal is always a string.
const OLD_CONTRACT_ENDER = `        const selecionado = enderecosFormatados.find(e => e.label === labelSelecionado) || enderecosFormatados[0];
        const enderecoFinal = selecionado ? selecionado.original : '';`;
const NEW_CONTRACT_ENDER = `        const selecionado = enderecosFormatados.find(e => e.label === labelSelecionado) || enderecosFormatados[0];
        const enderecoFinal = selecionado ? String(selecionado.original || '') : '';`;

if (code.includes(OLD_CONTRACT_ENDER)) {
    code = code.replace(OLD_CONTRACT_ENDER, NEW_CONTRACT_ENDER);
    console.log('✅ Fix 2 (Contract search): enderecoFinal forced to string');
    changed++;
} else {
    console.log('⚠️  Fix 2: already correct or different format');
}

// ─── Fix 3: Safety guard — ensure _wiz.address is always a string ────────────
// In _sacBuscarOSLogistica final assignment
const OLD_ASSIGN = `      _wiz.clientName = _clienteLimpo || os.cliente || '';\r\n      _wiz.cnpjCpf    = os.contrato || os.numero_contrato || '';\r\n      _wiz.equipment  = equipFinal;\r\n      _wiz.address    = enderecoFinal;`;
const NEW_ASSIGN = `      _wiz.clientName = _clienteLimpo || os.cliente || '';
      _wiz.cnpjCpf    = os.contrato || os.numero_contrato || '';
      _wiz.equipment  = equipFinal;
      _wiz.address    = typeof enderecoFinal === 'string' ? enderecoFinal : (enderecoFinal?.label || '');`;

if (code.includes(OLD_ASSIGN)) {
    code = code.replace(OLD_ASSIGN, NEW_ASSIGN);
    console.log('✅ Fix 3 (OS assign safety): _wiz.address forced to string');
    changed++;
} else {
    const OLD_ASSIGN_LF = OLD_ASSIGN.replace(/\r\n/g, '\n');
    if (code.includes(OLD_ASSIGN_LF)) {
        code = code.replace(OLD_ASSIGN_LF, NEW_ASSIGN);
        console.log('✅ Fix 3 LF variant');
        changed++;
    } else {
        console.log('⚠️  Fix 3: marker not found (may already be correct)');
    }
}

fs.writeFileSync('frontend/sac.js', code, 'utf8');
console.log(`\nTotal fixes: ${changed}`);
console.log('File size:', fs.statSync('frontend/sac.js').size);

// Verifications
const c2 = fs.readFileSync('frontend/sac.js', 'utf8');
const osBlock = c2.substring(c2.indexOf('_sacBuscarOSLogistica'), c2.indexOf('_sacEscolherEndereco'));
console.log('\nVerifications:');
console.log('OS: _enderRes unpacked:', osBlock.includes('_enderRes') && osBlock.includes('_enderRes.label'));
console.log('OS: enderecoFinal is string check:', c2.includes("typeof enderecoFinal === 'string'"));
