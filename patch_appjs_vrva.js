const fs = require('fs');
let c = fs.readFileSync('frontend/app.js', 'utf8');

// 1. Update toggleFolhaField to add vr and va
const oldToggle = "const mapa = { insalubridade: 'section-folha-insalubridade', periculosidade: 'section-folha-periculosidade', sindical: 'section-folha-sindical', pensao: 'section-folha-pensao', plr: 'section-folha-plr' };";
const newToggle = "const mapa = { insalubridade: 'section-folha-insalubridade', periculosidade: 'section-folha-periculosidade', sindical: 'section-folha-sindical', pensao: 'section-folha-pensao', plr: 'section-folha-plr', vr: 'section-folha-vr', va: 'section-folha-va' };";
c = c.replace(oldToggle, newToggle);

// 2. Add VR/VA fields to form data reading (after folha_plr_meses line)
const oldRead = "            folha_plr_meses: JSON.stringify(Array.from(document.querySelectorAll('.plr-mes-check:checked')).map(el => el.value))\n        };";
const newRead = `            folha_plr_meses: JSON.stringify(Array.from(document.querySelectorAll('.plr-mes-check:checked')).map(el => el.value)),
            folha_vr: parseInt(document.querySelector('input[name="folha_vr"]:checked')?.value) || 0,
            folha_vr_valor: parseFloat(document.getElementById('colab-folha-vr-valor')?.value) || 0,
            folha_va: parseInt(document.querySelector('input[name="folha_va"]:checked')?.value) || 0,
            folha_va_valor: parseFloat(document.getElementById('colab-folha-va-valor')?.value) || 0
        };`;
c = c.replace(oldRead, newRead);

fs.writeFileSync('frontend/app.js', c, 'utf8');
console.log('app.js toggleFolhaField and form read updated');
