const fs = require('fs');

function updateFile(path) {
    let content = fs.readFileSync(path, 'utf8');

    const targetRegex = /if \(row\.cells\[1\] && row\.cells\[1\]\.children\.length >= 3\) \{[\s\S]*?\} else \{[\s\S]*?\}/;
    
    const replacement = `if (row.cells[1]) {
            const b = row.cells[1].querySelector('b');
            const spans = row.cells[1].querySelectorAll('span');
            cName = b ? b.textContent.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '') : '';
            cEmail = spans.length > 0 ? spans[0].textContent.toLowerCase().trim() : '';
            cEnd = spans.length > 1 ? spans[1].textContent.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '') : '';
        }`;

    content = content.replace(targetRegex, replacement);
    fs.writeFileSync(path, content, 'utf8');
}

updateFile('frontend/credenciamento.js');
updateFile('frontend/comercial_credenciamento.js');

console.log("Updated both files to use querySelector for cell parsing");