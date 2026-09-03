const fs = require('fs');
let c = fs.readFileSync('frontend/app.js', 'utf8');

// Exact pattern found: folha_plr_meses line + \r\n        };
const needle = "folha_plr_meses: JSON.stringify(Array.from(document.querySelectorAll('.plr-mes-check:checked')).map(el => el.value))\r\n        };";
const replacement = "folha_plr_meses: JSON.stringify(Array.from(document.querySelectorAll('.plr-mes-check:checked')).map(el => el.value)),\r\n            folha_vr: parseInt(document.querySelector('input[name=\"folha_vr\"]:checked')?.value) || 0,\r\n            folha_vr_valor: parseFloat(document.getElementById('colab-folha-vr-valor')?.value) || 0,\r\n            folha_va: parseInt(document.querySelector('input[name=\"folha_va\"]:checked')?.value) || 0,\r\n            folha_va_valor: parseFloat(document.getElementById('colab-folha-va-valor')?.value) || 0\r\n        };";

if (c.includes(needle)) {
    c = c.replace(needle, replacement);
    fs.writeFileSync('frontend/app.js', c, 'utf8');
    console.log('OK: folha_vr/va added to submit handler');
} else {
    console.log('MISS - dumping exact bytes:');
    const idx = c.indexOf('folha_plr_meses: JSON.stringify');
    console.log('folha_plr_meses at:', idx);
    if (idx > 0) {
        const slice = c.substring(idx, idx + 200);
        console.log(JSON.stringify(slice));
    }
}
