// Fix all issues cleanly using Node.js (preserves UTF-8 encoding)
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'app.js');
let content = fs.readFileSync(filePath, 'utf8');

console.log('File loaded, length:', content.length);

// ============================================================
// FIX 1: mascaraRG - allow X at end (e.g. 44.949.651-X)
// ============================================================
content = content.replace(
    /window\.mascaraRG = function\(el\) \{[\s\S]*?\};[\r\n]/,
    `window.mascaraRG = function(el) {
    let v = el.value.toUpperCase().replace(/[^0-9X]/g, '');
    // Keep numbers, allow X only at end
    let numbers = v.replace(/X/g, '');
    if (v.endsWith('X')) {
        v = numbers + 'X';
    } else {
        v = numbers;
    }
    if (v.length > 10) v = v.substring(0, 10);
    // Format: 00.000.000-0 or 00.000.000-X
    if (!v.endsWith('X')) {
        v = v.replace(/(\\d{2})(\\d)/, '$1.$2');
        v = v.replace(/(\\d{3})(\\d)/, '$1.$2');
        v = v.replace(/(\\d{3})(\\d{1,2})$/, '$1-$2');
    } else {
        const nums = v.slice(0, -1);
        let fmted = nums;
        fmted = fmted.replace(/(\\d{2})(\\d)/, '$1.$2');
        fmted = fmted.replace(/(\\d{3})(\\d)/, '$1.$2');
        v = fmted.length >= 7 ? fmted + '-X' : fmted + 'X';
    }
    el.value = v;
};
`
);
console.log('FIX 1 applied: mascaraRG with X support');

// ============================================================
// FIX 2: toggleTipoDocumento - show/hide Orgao and Data fields
// ============================================================
content = content.replace(
    /window\.toggleTipoDocumento = function\(\) \{[\s\S]*?\};[\r\n]/,
    `window.toggleTipoDocumento = function() {
    const sel = document.getElementById('colab-rg-tipo');
    const rgInput = document.getElementById('colab-rg');
    const cpfInput = document.getElementById('colab-cpf');
    const lbl = document.getElementById('lbl-colab-rg');
    const boxOrgao = document.getElementById('box-rg-orgao');
    const boxData = document.getElementById('box-rg-data');

    if (sel && rgInput && cpfInput && lbl) {
        if (sel.value === 'CIN') {
            lbl.textContent = 'Número (CIN)';
            rgInput.value = cpfInput.value;
            rgInput.setAttribute('readonly', 'true');
            rgInput.style.backgroundColor = '#e9ecef';
            if(boxOrgao) boxOrgao.style.display = 'none';
            if(boxData) boxData.style.display = 'none';
        } else {
            lbl.textContent = 'Número (RG)';
            rgInput.removeAttribute('readonly');
            rgInput.style.backgroundColor = '';
            if(boxOrgao) boxOrgao.style.display = 'block';
            if(boxData) boxData.style.display = 'block';
            // Limpa apenas se estiver igual ao CPF (foi preenchido por CIN)
            if (rgInput.value === cpfInput.value) {
                rgInput.value = '';
            }
        }
    }
};
`
);
console.log('FIX 2 applied: toggleTipoDocumento with RG fields visibility');

// ============================================================
// FIX 3: toggleAlergias - fix text color + placeholder text
// ============================================================
content = content.replace(
    /window\.toggleAlergias = function\(val\) \{[\s\S]*?\};[\r\n]/,
    `window.toggleAlergias = function(val) {
    const input = document.getElementById('colab-alergias');
    if (!input) return;
    if (val === 'Sim') {
        input.disabled = false;
        input.style.background = '#fff';
        input.style.cursor = 'text';
        input.style.color = '#0f172a';
        input.placeholder = 'Descreva aqui alergias, restrições ou intolerâncias...';
    } else {
        input.disabled = true;
        input.style.background = '#f8fafc';
        input.style.cursor = 'not-allowed';
        input.style.color = '#94a3b8';
        input.value = '';
    }
};
`
);
console.log('FIX 3 applied: toggleAlergias with correct color and placeholder');

// ============================================================
// FIX 4: toggleMotorista - fix CNH element ID reference
// ============================================================
content = content.replace(
    /window\.toggleMotorista = function\(\) \{[\s\S]*?\};[\r\n]/,
    `window.toggleMotorista = function() {
    const cargoSelect = document.getElementById('colab-cargo');
    const section = document.getElementById('section-cnh');
    const num = document.getElementById('colab-cnh-numero');
    const cat = document.getElementById('colab-cnh-categoria');

    if (cargoSelect && cargoSelect.value.toUpperCase().includes('MOTORISTA')) {
        if(section) section.style.display = 'block';
    } else if(section) {
        section.style.display = 'none';
        // Only clear if no value already saved
        if(num && !num.dataset.savedValue) num.value = '';
        if(cat) cat.value = '';
    }
};
`
);
console.log('FIX 4 applied: toggleMotorista with correct colab-cnh-numero ID');

// ============================================================
// FIX 5: Fix cnh_numero reference throughout (doc-driver-license-id -> colab-cnh-numero)
// ============================================================
const oldCnhId = /doc-driver-license-id/g;
const oldCnhCount = (content.match(oldCnhId) || []).length;
content = content.replace(oldCnhId, 'colab-cnh-numero');
console.log(`FIX 5 applied: replaced ${oldCnhCount} occurrences of doc-driver-license-id`);

// ============================================================
// FIX 6: Load CNH correctly - load AFTER calling toggleMotorista
// so it doesn't get cleared by the toggle
// ============================================================
// Find the area where toggleMotorista is called and CNH is loaded
content = content.replace(
    /\/\/ toggleMotorista ANTES de carregar CNH[\s\S]*?if\(typeof toggleMotorista === 'function'\) toggleMotorista\(\);\r?\n\s*if\(document\.getElementById\('doc-driver-license-id'\)\)[^;]+;\r?\n/,
    `// toggleMotorista ANTES de carregar CNH — se chamado depois limpa os campos
        if(typeof toggleMotorista === 'function') toggleMotorista();
        if(document.getElementById('colab-cnh-numero')) {
            const cnhEl = document.getElementById('colab-cnh-numero');
            cnhEl.value = c.cnh_numero || '';
            cnhEl.dataset.savedValue = c.cnh_numero || '';
        }
`
);
console.log('FIX 6 applied: CNH loading after toggleMotorista');

// ============================================================
// FIX 7: escala padrao_seg_sexta calculation fix
// ============================================================
content = content.replace(
    /\} else if \(tipo === 'escala_duas_folgas'\) \{\r?\n\s+workMins = 8 \* 60 \+ 48;/,
    `} else if (tipo === 'escala_duas_folgas' || tipo === 'padrao_seg_sexta') {\n            workMins = 8 * 60 + 48;`
);
console.log('FIX 7 applied: padrao_seg_sexta scale calculation');

// ============================================================
// FIX 8: Checklist labels encoding fix
// ============================================================
content = content.replace(
    /activeChecklist\.push\(\{ key: 'rg_orgao', label: '[^']*' \}\);/,
    `activeChecklist.push({ key: 'rg_orgao', label: 'Órgão Emissor' });`
);
content = content.replace(
    /activeChecklist\.push\(\{ key: 'rg_data_emissao', label: '[^']*' \}\);/,
    `activeChecklist.push({ key: 'rg_data_emissao', label: 'Expedição Doc' });`
);
content = content.replace(
    /activeChecklist\.push\(\{ key: 'cnh_numero', label: '[^']*' \}\);/,
    `activeChecklist.push({ key: 'cnh_numero', label: 'CNH Núm.' });`
);
console.log('FIX 8 applied: checklist label encoding');

// ============================================================
// WRITE RESULT
// ============================================================
fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✅ All fixes applied successfully!');
console.log('File written:', filePath);
console.log('New length:', fs.readFileSync(filePath, 'utf8').length);
