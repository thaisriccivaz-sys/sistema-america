const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'app.js');
let content = fs.readFileSync(filePath, 'utf8');

// Replace the auto-fill logic to remove readOnly and styles for CTPS
const oldLogic = /if \(ctpsEl\) \{ ctpsEl\.value = cpfDigits\.substring\(0, 7\); ctpsEl\.readOnly = true; ctpsEl\.style\.background = '#f1f5f9'; ctpsEl\.style\.cursor = 'not-allowed'; \}\s*if \(serieEl\) \{ serieEl\.value = cpfDigits\.substring\(7, 11\); serieEl\.readOnly = true; serieEl\.style\.background = '#f1f5f9'; serieEl\.style\.cursor = 'not-allowed'; \}/g;

const newLogic = `if (ctpsEl) { ctpsEl.value = ctpsEl.value || cpfDigits.substring(0, 7); ctpsEl.readOnly = false; ctpsEl.style.background = ''; ctpsEl.style.cursor = ''; }
            if (serieEl) { serieEl.value = serieEl.value || cpfDigits.substring(7, 11); serieEl.readOnly = false; serieEl.style.background = ''; serieEl.style.cursor = ''; }`;

const beforeLength = content.length;
content = content.replace(oldLogic, newLogic);
console.log('CTPS readOnly logic replaced?', content.length !== beforeLength);

// We also should remove any auto-fill event listener on CPF so the user can actually edit the CTPS without it magically changing back to CPF digits if they edit the CPF? No, CPF is usually static anyway. Let's just remove the readOnly for now.

// Wait, if they do have a real CTPS, it's saved in the DB, and we load it. BUT the existing logic overwrites it with cpfDigits:
// \`if (document.getElementById('colab-ctps')) document.getElementById('colab-ctps').value = c.ctps_numero || '';\`
// AND THEN immediately calls:
// \`if (ctpsEl) { ctpsEl.value = cpfDigits.substring(...) }\`
// This overwrites what was loaded from the DB!
// In the newLogic, I put: \`ctpsEl.value = ctpsEl.value || cpfDigits.substring(0, 7);\`
// This way, if they have one loaded from the DB, it keeps it, otherwise uses CPF digits as default.

fs.writeFileSync(filePath, content, 'utf8');
console.log('app.js updated successfully!');
