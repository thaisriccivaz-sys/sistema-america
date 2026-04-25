// Fix toggleMotorista to NEVER clear the CNH number
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'app.js');
let content = fs.readFileSync(filePath, 'utf8');

// Replace toggleMotorista to NEVER clear the value - only show/hide visually
const oldToggle = /window\.toggleMotorista = function\(\) \{[\s\S]*?\};[\n\r]/;
const newToggle = `window.toggleMotorista = function() {
    const cargoSelect = document.getElementById('colab-cargo');
    const section = document.getElementById('section-cnh');

    if (cargoSelect && cargoSelect.value.toUpperCase().includes('MOTORISTA')) {
        if(section) section.style.display = 'block';
    } else if(section) {
        section.style.display = 'none';
        // NEVER auto-clear CNH fields — user must edit them manually
    }
};
`;

const before = content.length;
content = content.replace(oldToggle, newToggle);
console.log(`Replaced toggleMotorista? ${content.length !== before}`);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done. New length:', fs.readFileSync(filePath, 'utf8').length);
