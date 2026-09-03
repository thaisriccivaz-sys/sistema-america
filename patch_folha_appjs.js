const fs = require('fs');
let code = fs.readFileSync('frontend/app.js', 'utf8');

// 1) ADD FOLHA FIELDS TO THE SAVE OBJECT
const saveTarget = "tamanho_calcado: document.getElementById('tamanho_calcado') ? document.getElementById('tamanho_calcado').value : null\r\n        };";
const saveInsert = "tamanho_calcado: document.getElementById('tamanho_calcado') ? document.getElementById('tamanho_calcado').value : null,\r\n            // 7. Folha\r\n            academia_desconto_valor: parseFloat(document.getElementById('colab-academia-desconto-valor')?.value) || 0,\r\n            folha_insalubridade: parseInt(document.querySelector('input[name=\"folha_insalubridade\"]:checked')?.value) || 0,\r\n            folha_insalubridade_valor: parseFloat(document.getElementById('colab-folha-insalubridade-valor')?.value) || 0,\r\n            folha_periculosidade: parseInt(document.querySelector('input[name=\"folha_periculosidade\"]:checked')?.value) || 0,\r\n            folha_periculosidade_valor: parseFloat(document.getElementById('colab-folha-periculosidade-valor')?.value) || 0,\r\n            folha_mensalidade_sindical: parseInt(document.querySelector('input[name=\"folha_mensalidade_sindical\"]:checked')?.value) || 0,\r\n            folha_mensalidade_sindical_valor: parseFloat(document.getElementById('colab-folha-mensalidade-sindical-valor')?.value) || 0,\r\n            folha_pensao_tipo: document.getElementById('colab-folha-pensao-tipo')?.value || null,\r\n            folha_pensao_pct: parseFloat(document.getElementById('colab-folha-pensao-pct')?.value) || 0,\r\n            folha_plr: parseInt(document.querySelector('input[name=\"folha_plr\"]:checked')?.value) || 0,\r\n            folha_plr_valor: parseFloat(document.getElementById('colab-folha-plr-valor')?.value) || 0,\r\n            folha_plr_meses: JSON.stringify(Array.from(document.querySelectorAll('.plr-mes-check:checked')).map(el => el.value))\r\n        };";

if (code.includes('folha_insalubridade:')) {
    console.log('✓ save folha fields already present — skipping');
} else if (!code.includes(saveTarget)) {
    console.error('ERRO: saveTarget não encontrado!');
    process.exit(1);
} else {
    code = code.replace(saveTarget, saveInsert);
    console.log('✓ save folha fields added');
}

// 2) ADD FOLHA FIELDS TO LOAD
const loadTarget = "if (document.getElementById('colab-brigadista-validade')) document.getElementById('colab-brigadista-validade').value = c.brigadista_validade || '';\r\n\r\n        // Add selected keys row by row";
const loadFolha = `if (document.getElementById('colab-brigadista-validade')) document.getElementById('colab-brigadista-validade').value = c.brigadista_validade || '';\r\n\r\n        // 7. Folha\r\n        if (document.getElementById('colab-academia-desconto-valor')) document.getElementById('colab-academia-desconto-valor').value = parseFloat(c.academia_desconto_valor) || 60;\r\n        const _rInsalVal = parseInt(c.folha_insalubridade) === 1 ? '1' : '0';\r\n        const _rInsal = document.querySelector('input[name="folha_insalubridade"][value="' + _rInsalVal + '"]');\r\n        if (_rInsal) _rInsal.checked = true; toggleFolhaField('insalubridade', _rInsalVal);\r\n        if (document.getElementById('colab-folha-insalubridade-valor')) document.getElementById('colab-folha-insalubridade-valor').value = parseFloat(c.folha_insalubridade_valor) || 324.20;\r\n        const _rPericVal = parseInt(c.folha_periculosidade) === 1 ? '1' : '0';\r\n        const _rPeric = document.querySelector('input[name="folha_periculosidade"][value="' + _rPericVal + '"]');\r\n        if (_rPeric) _rPeric.checked = true; toggleFolhaField('periculosidade', _rPericVal);\r\n        if (document.getElementById('colab-folha-periculosidade-valor')) document.getElementById('colab-folha-periculosidade-valor').value = parseFloat(c.folha_periculosidade_valor) || 0;\r\n        const _rSindVal = parseInt(c.folha_mensalidade_sindical) === 1 ? '1' : '0';\r\n        const _rSind = document.querySelector('input[name="folha_mensalidade_sindical"][value="' + _rSindVal + '"]');\r\n        if (_rSind) _rSind.checked = true; toggleFolhaField('sindical', _rSindVal);\r\n        if (document.getElementById('colab-folha-mensalidade-sindical-valor')) document.getElementById('colab-folha-mensalidade-sindical-valor').value = parseFloat(c.folha_mensalidade_sindical_valor) || 0;\r\n        const _rPensaoVal = (c.folha_pensao_tipo && parseFloat(c.folha_pensao_pct) > 0) ? 'Sim' : 'N\\u00e3o';\r\n        const _rPensao = document.querySelector('input[name="folha_pensao_alimenticia_rh"][value="' + _rPensaoVal + '"]');\r\n        if (_rPensao) _rPensao.checked = true; toggleFolhaField('pensao', _rPensaoVal);\r\n        if (document.getElementById('colab-folha-pensao-pct')) document.getElementById('colab-folha-pensao-pct').value = parseFloat(c.folha_pensao_pct) || 0;\r\n        if (document.getElementById('colab-folha-pensao-tipo') && c.folha_pensao_tipo) document.getElementById('colab-folha-pensao-tipo').value = c.folha_pensao_tipo;\r\n        const _rPlrVal = parseInt(c.folha_plr) === 1 ? '1' : '0';\r\n        const _rPlr = document.querySelector('input[name="folha_plr"][value="' + _rPlrVal + '"]');\r\n        if (_rPlr) _rPlr.checked = true; toggleFolhaField('plr', _rPlrVal);\r\n        if (document.getElementById('colab-folha-plr-valor')) document.getElementById('colab-folha-plr-valor').value = parseFloat(c.folha_plr_valor) || 800;\r\n        try { const _plrMeses = JSON.parse(c.folha_plr_meses || '[]'); document.querySelectorAll('.plr-mes-check').forEach(cb => { cb.checked = _plrMeses.includes(cb.value); }); } catch(e) {}\r\n\r\n        // Add selected keys row by row`;

if (code.includes('colab-academia-desconto-valor')) {
    console.log('✓ load folha fields already present — skipping');
} else if (!code.includes(loadTarget)) {
    console.error('ERRO: loadTarget não encontrado!');
    process.exit(1);
} else {
    code = code.replace(loadTarget, loadFolha);
    console.log('✓ load folha fields added');
}

fs.writeFileSync('frontend/app.js', code, 'utf8');
console.log('✓ app.js saved! Size:', code.length);
