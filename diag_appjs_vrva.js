const fs = require('fs');
let c = fs.readFileSync('frontend/app.js', 'utf8');

// The submit handler has folha_plr_meses as the LAST field before }; 
// We need to add folha_vr, folha_vr_valor, folha_va, folha_va_valor after it
// There are TWO submit contexts - we need to find the right one
// The right one is inside the form submit handler, right before });

// Pattern: folha_plr_meses line followed by }; (closing the data object)
const targets = [];
let pos = 0;
const needle = 'folha_plr_meses: JSON.stringify(Array.from(document.querySelectorAll(\'.plr-mes-check:checked\')).map(el => el.value))';
while ((pos = c.indexOf(needle, pos)) !== -1) {
    targets.push(pos);
    // Show what comes after
    console.log('Found at:', pos, '-> next 150 chars:', JSON.stringify(c.substring(pos + needle.length, pos + needle.length + 150)));
    pos++;
}
console.log('Total folha_plr_meses occurrences:', targets.length);
